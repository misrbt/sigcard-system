<?php

namespace App\Services;

use App\Models\Customer;
use App\Models\CustomerDocument;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Process;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Str;

class ThumbmarkSearchService
{
    private string $pythonBin;

    private string $scriptPath;

    private int $timeout;

    public function __construct()
    {
        $this->pythonBin = config('thumbmark.python_bin', 'python');
        $this->scriptPath = base_path('python/thumbmark_search.py');
        $this->timeout = (int) config('thumbmark.timeout', 120);
    }

    /**
     * Extract a fingerprint template from a sigcard_front document and persist it.
     * Safe to call from within a DB transaction — failures are logged, not thrown.
     */
    public function enrollDocument(CustomerDocument $doc): void
    {
        if ($doc->document_type !== 'sigcard_front') {
            return;
        }

        $imagePath = Storage::disk('public')->path($doc->file_path);

        if (! file_exists($imagePath)) {
            Log::warning('ThumbmarkSearch: image not found', [
                'doc_id' => $doc->id,
                'image_path' => $imagePath,
            ]);

            return;
        }

        $result = $this->runPython(['enroll', $imagePath]);

        if ($result && ($result['ok'] ?? false) && ! empty($result['template'])) {
            $doc->updateQuietly(['fingerprint_template' => $result['template']]);
        } else {
            Log::warning('ThumbmarkSearch: enroll failed', [
                'doc_id' => $doc->id,
                'result' => $result,
            ]);
        }
    }

    /**
     * Search all enrolled sigcard_front templates against an uploaded probe image.
     *
     * @return array<int, array{customer_id: int, full_name: string, account_type: string,
     *                          status: string, risk_level: string, branch_name: string|null,
     *                          score: float, confidence: float}>
     */
    public function search(UploadedFile $probeFile): array
    {
        $tempProbe = 'thumbmark_probe_'.Str::uuid().'.jpg';
        $tempGallery = 'thumbmark_gallery_'.Str::uuid().'.json';
        $probePath = storage_path('app/'.$tempProbe);
        $galleryPath = storage_path('app/'.$tempGallery);

        try {
            // Persist probe to a temp file the Python script can read
            $probeFile->move(storage_path('app'), $tempProbe);

            // Fetch all enrolled sigcard_front templates
            $enrolled = CustomerDocument::query()
                ->where('document_type', 'sigcard_front')
                ->whereNotNull('fingerprint_template')
                ->select(['id', 'customer_id', 'fingerprint_template'])
                ->get();

            if ($enrolled->isEmpty()) {
                return [];
            }

            // Write gallery JSON temp file
            $gallery = $enrolled
                ->map(fn (CustomerDocument $d) => [
                    'id' => $d->id,
                    'template' => $d->fingerprint_template,
                ])
                ->values()
                ->all();

            file_put_contents($galleryPath, json_encode($gallery, JSON_THROW_ON_ERROR));

            // Run the SourceAFIS search
            $scores = $this->runPython(['search', $probePath, $galleryPath]);

            if (! is_array($scores) || isset($scores['error'])) {
                Log::error('ThumbmarkSearch: search failed', $scores ?? []);

                return [];
            }

            if (empty($scores)) {
                return [];
            }

            // Map document IDs → customers, eager-load branch
            $enrolledById = $enrolled->keyBy('id');

            $customerIds = collect($scores)
                ->map(fn (array $s) => $enrolledById->get($s['id'])?->customer_id)
                ->filter()
                ->unique()
                ->values()
                ->all();

            $customers = Customer::with('branch')
                ->whereIn('id', $customerIds)
                ->get()
                ->keyBy('id');

            $results = [];

            foreach ($scores as $item) {
                $doc = $enrolledById->get($item['id']);
                $customer = $doc ? $customers->get($doc->customer_id) : null;

                if (! $customer) {
                    continue;
                }

                $results[] = [
                    'customer_id' => $customer->id,
                    'full_name' => $customer->full_name,
                    'account_type' => $customer->account_type,
                    'status' => $customer->status,
                    'risk_level' => $customer->risk_level,
                    'branch_name' => $customer->branch?->branch_name,
                    'score' => $item['score'],
                    // Normalise to 0–1 for the frontend confidence bar
                    // Score = matched minutiae pairs; 40 matched pairs is a strong match
                    'confidence' => min(round($item['score'] / 40, 4), 1.0),
                ];
            }

            return $results;

        } finally {
            @unlink($probePath);
            @unlink($galleryPath);
        }
    }

    /**
     * Invoke the Python script with the given arguments.
     * Returns decoded JSON output or null on failure.
     *
     * @param  string[]  $args
     */
    private function runPython(array $args): ?array
    {
        $command = array_merge([$this->pythonBin, $this->scriptPath], $args);

        try {
            $result = Process::timeout($this->timeout)->run($command);

            if (! $result->successful()) {
                Log::error('ThumbmarkSearch: Python process failed', [
                    'command' => implode(' ', $command),
                    'stderr' => $result->errorOutput(),
                    'exit_code' => $result->exitCode(),
                ]);

                return null;
            }

            $output = trim($result->output());

            return json_decode($output, associative: true, flags: JSON_THROW_ON_ERROR);

        } catch (\Exception $e) {
            Log::error('ThumbmarkSearch: process exception', ['error' => $e->getMessage()]);

            return null;
        }
    }
}
