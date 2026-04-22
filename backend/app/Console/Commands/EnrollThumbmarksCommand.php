<?php

namespace App\Console\Commands;

use App\Models\CustomerDocument;
use App\Services\ThumbmarkSearchService;
use Illuminate\Console\Command;

class EnrollThumbmarksCommand extends Command
{
    protected $signature = 'thumbmark:enroll
                            {--force : Re-enroll documents that already have a template}
                            {--chunk=50 : Number of documents to process per batch}';

    protected $description = 'Extract and store fingerprint templates from all sigcard_front documents';

    public function handle(ThumbmarkSearchService $service): int
    {
        $query = CustomerDocument::query()
            ->where('document_type', 'sigcard_front');

        if (! $this->option('force')) {
            $query->whereNull('fingerprint_template');
        }

        $total = $query->count();

        if ($total === 0) {
            $this->info('No sigcard_front documents to enroll. All up to date.');

            return self::SUCCESS;
        }

        $this->info("Enrolling {$total} sigcard_front document(s)...");
        $this->newLine();

        $bar = $this->output->createProgressBar($total);
        $success = 0;
        $failed = 0;
        $chunk = max(1, (int) $this->option('chunk'));

        $query->chunkById($chunk, function ($docs) use ($service, $bar, &$success, &$failed) {
            foreach ($docs as $doc) {
                try {
                    $service->enrollDocument($doc);
                    $doc->refresh();

                    if ($doc->fingerprint_template) {
                        $success++;
                    } else {
                        $failed++;
                    }
                } catch (\Exception $e) {
                    $failed++;
                    $this->newLine();
                    $this->error("  ✗ Doc #{$doc->id}: {$e->getMessage()}");
                }

                $bar->advance();
            }
        });

        $bar->finish();
        $this->newLine(2);

        $this->table(
            ['Result', 'Count'],
            [
                ['Enrolled',        $success],
                ['Failed/Skipped',  $failed],
                ['Total processed', $total],
            ]
        );

        if ($failed > 0) {
            $this->warn('Some documents failed to enroll. Check logs for details.');
        }

        return self::SUCCESS;
    }
}
