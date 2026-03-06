<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Requests\StoreCustomerRequest;
use App\Http\Requests\UpdateCustomerRequest;
use App\Models\Customer;
use App\Models\CustomerDocument;
use App\Models\CustomerHolder;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Str;
use Intervention\Image\Drivers\Gd\Driver;
use Intervention\Image\ImageManager;

class CustomerController extends Controller
{
    public function index(Request $request): JsonResponse
    {
        $query    = Customer::with(['documents', 'branch', 'uploader', 'holders']);
        $authUser = Auth::user();

        // Users and cashiers see only their own branch.
        // Managers see their own branch plus any branch lite children.
        // Admins see all branches unless they explicitly filter.
        if ($authUser->hasAnyRole(['user', 'cashier'])) {
            $query->where('branch_id', $authUser->branch_id);
        } elseif ($authUser->hasRole('manager')) {
            $branch = $authUser->branch()->with('children')->first();
            $branchIds = collect([$authUser->branch_id]);

            if ($branch) {
                $branchIds = $branchIds->merge($branch->children->pluck('id'));
            }

            $query->whereIn('branch_id', $branchIds->unique()->values());
        } elseif ($request->has('branch_id')) {
            $query->where('branch_id', $request->branch_id);
        }

        if ($request->has('status')) {
            $query->where('status', $request->status);
        }

        if ($request->has('search')) {
            $search = $request->search;
            $query->where(function ($q) use ($search) {
                $q->where('firstname', 'like', "%{$search}%")
                    ->orWhere('lastname', 'like', "%{$search}%")
                    ->orWhere('middlename', 'like', "%{$search}%");
            });
        }

        $customers = $query->latest()->paginate($request->get('per_page', 15));

        return response()->json($customers);
    }

    public function store(StoreCustomerRequest $request): JsonResponse
    {
        try {
            DB::beginTransaction();

            $authUser = Auth::user();

            $customer = Customer::create([
                'branch_id'    => $authUser->hasRole('user') ? $authUser->branch_id : $request->branch_id,
                'uploaded_by'  => Auth::id(),
                'firstname'    => $request->firstname,
                'middlename'   => $request->middlename,
                'lastname'     => $request->lastname,
                'suffix'       => $request->suffix,
                'account_type' => $request->account_type,
                'risk_level'   => $request->risk_level,
                'status'       => 'active',
            ]);

            // Save additional holders (person 2+) for Joint accounts
            foreach ($request->input('additionalPersons', []) as $index => $person) {
                CustomerHolder::create([
                    'customer_id'  => $customer->id,
                    'person_index' => $index + 2, // Person 1 is in customers table
                    'firstname'    => $person['firstname'],
                    'middlename'   => $person['middlename'] ?? null,
                    'lastname'     => $person['lastname'],
                    'suffix'       => $person['suffix'] ?? null,
                    'risk_level'   => $person['risk_level'],
                ]);
            }

            $this->storePairs($customer, $request, 'sigcardPairs', 'sigcard_front', 'sigcard_back');
            $this->storePairs($customer, $request, 'naisPairs',    'nais_front',    'nais_back');
            $this->storePairs($customer, $request, 'privacyPairs', 'privacy_front', 'privacy_back');

            if ($request->hasFile('otherDocs')) {
                foreach ($request->file('otherDocs') as $file) {
                    $this->uploadDocument($customer, $file, 'other', 1);
                }
            }

            DB::commit();

            $docCounts = $customer->documents()
                ->selectRaw('document_type, count(*) as total')
                ->groupBy('document_type')
                ->pluck('total', 'document_type');

            activity()
                ->causedBy(Auth::user())
                ->performedOn($customer)
                ->withProperties([
                    'action'            => 'customer_created',
                    'full_name'         => $customer->full_name,
                    'account_type'      => $customer->account_type,
                    'risk_level'        => $customer->risk_level,
                    'status'            => $customer->status,
                    'branch_id'         => $customer->branch_id,
                    'documents_uploaded' => $docCounts,
                ])
                ->log('Customer sigcard record created');

            return response()->json([
                'message'  => 'Customer created successfully.',
                'customer' => $customer->load(['documents', 'branch', 'holders']),
            ], 201);

        } catch (\Exception $e) {
            DB::rollBack();

            return response()->json([
                'message' => 'Error creating customer.',
                'error'   => $e->getMessage(),
            ], 500);
        }
    }

    public function show(Customer $customer): JsonResponse
    {
        return response()->json($customer->load(['documents', 'branch', 'uploader', 'holders']));
    }

    public function update(UpdateCustomerRequest $request, Customer $customer): JsonResponse
    {
        try {
            DB::beginTransaction();

            // Snapshot the tracked fields BEFORE any change
            $before = $customer->only([
                'firstname', 'middlename', 'lastname', 'suffix',
                'account_type', 'risk_level', 'status', 'branch_id',
            ]);

            $customer->update(array_filter([
                'branch_id'    => $request->branch_id,
                'firstname'    => $request->firstname,
                'middlename'   => $request->middlename,
                'lastname'     => $request->lastname,
                'suffix'       => $request->suffix,
                'account_type' => $request->account_type,
                'risk_level'   => $request->risk_level,
                'status'       => $request->status,
            ], fn($v) => !is_null($v)));

            // Sync additional holders when provided
            if ($request->has('additionalPersons')) {
                $customer->holders()->delete();

                foreach ($request->input('additionalPersons', []) as $index => $person) {
                    CustomerHolder::create([
                        'customer_id'  => $customer->id,
                        'person_index' => $index + 2,
                        'firstname'    => $person['firstname'],
                        'middlename'   => $person['middlename'] ?? null,
                        'lastname'     => $person['lastname'],
                        'suffix'       => $person['suffix'] ?? null,
                        'risk_level'   => $person['risk_level'],
                    ]);
                }
            }

            foreach (['sigcardPairs' => ['sigcard_front', 'sigcard_back'],
                      'naisPairs'    => ['nais_front',    'nais_back'],
                      'privacyPairs' => ['privacy_front', 'privacy_back']] as $pairsKey => [$frontType, $backType]) {
                if ($request->has($pairsKey)) {
                    // Remove existing documents for this group and re-upload
                    $this->deleteDocumentsByTypes($customer, [$frontType, $backType]);
                    $this->storePairs($customer, $request, $pairsKey, $frontType, $backType);
                }
            }

            if ($request->hasFile('otherDocs')) {
                foreach ($request->file('otherDocs') as $file) {
                    $this->uploadDocument($customer, $file, 'other', 1);
                }
            }

            DB::commit();

            $after = $customer->fresh()->only(array_keys($before));

            // Build a clean before/after diff (only changed keys)
            $diff = [];
            foreach ($after as $key => $newVal) {
                if ((string) ($before[$key] ?? '') !== (string) $newVal) {
                    $diff[$key] = ['before' => $before[$key], 'after' => $newVal];
                }
            }

            activity()
                ->causedBy(Auth::user())
                ->performedOn($customer)
                ->withProperties([
                    'action'    => 'customer_updated',
                    'full_name' => $customer->full_name,
                    'diff'      => $diff,
                ])
                ->log('Customer sigcard record updated');

            return response()->json([
                'message'  => 'Customer updated successfully.',
                'customer' => $customer->load(['documents', 'branch', 'holders']),
            ]);

        } catch (\Exception $e) {
            DB::rollBack();

            return response()->json([
                'message' => 'Error updating customer.',
                'error'   => $e->getMessage(),
            ], 500);
        }
    }

    public function destroy(Customer $customer): JsonResponse
    {
        try {
            DB::beginTransaction();

            foreach ($customer->documents as $document) {
                Storage::disk('public')->delete($document->file_path);
            }

            $snapshot = [
                'full_name'    => $customer->full_name,
                'account_type' => $customer->account_type,
                'risk_level'   => $customer->risk_level,
                'status'       => $customer->status,
                'branch_id'    => $customer->branch_id,
                'doc_count'    => $customer->documents()->count(),
            ];

            $customer->delete();

            DB::commit();

            activity()
                ->causedBy(Auth::user())
                ->withProperties(array_merge(['action' => 'customer_deleted'], $snapshot))
                ->log('Customer sigcard record deleted');

            return response()->json(['message' => 'Customer deleted successfully.']);

        } catch (\Exception $e) {
            DB::rollBack();

            return response()->json([
                'message' => 'Error deleting customer.',
                'error'   => $e->getMessage(),
            ], 500);
        }
    }

    public function getDocuments(Customer $customer): JsonResponse
    {
        return response()->json($customer->documents()->orderBy('person_index')->get());
    }

    public function deleteDocument(Customer $customer, CustomerDocument $document): JsonResponse
    {
        if ($document->customer_id !== $customer->id) {
            return response()->json(['message' => 'Document does not belong to this customer.'], 403);
        }

        $documentType = $document->document_type;
        $personIndex = $document->person_index;
        $fileName = $document->file_name;

        Storage::disk('public')->delete($document->file_path);
        $document->delete();

        activity()
            ->causedBy(Auth::user())
            ->performedOn($customer)
            ->withProperties([
                'action'        => 'document_deleted',
                'full_name'     => $customer->full_name,
                'document_type' => $documentType,
                'person_index'  => $personIndex,
                'file_name'     => $fileName,
            ])
            ->log('Customer document deleted');

        return response()->json(['message' => 'Document deleted successfully.']);
    }

    public function replaceDocument(Request $request, Customer $customer): JsonResponse
    {
        $request->validate([
            'document_type' => 'required|string|in:sigcard_front,sigcard_back,nais_front,nais_back,privacy_front,privacy_back,other',
            'person_index'  => 'required|integer|min:1',
            'file'          => 'required|image|mimes:jpeg,jpg,png|max:10240',
        ]);

        try {
            $existing = $customer->documents()
                ->where('document_type', $request->document_type)
                ->where('person_index', $request->person_index)
                ->first();

            if ($existing) {
                Storage::disk('public')->delete($existing->file_path);
                $existing->delete();
            }

            $this->uploadDocument(
                $customer,
                $request->file('file'),
                $request->document_type,
                (int) $request->person_index
            );

            activity()
                ->causedBy(Auth::user())
                ->performedOn($customer)
                ->withProperties([
                    'action'        => 'document_replaced',
                    'full_name'     => $customer->full_name,
                    'document_type' => $request->document_type,
                    'person_index'  => (int) $request->person_index,
                    'replaced_file' => $existing?->file_name,
                ])
                ->log('Customer document replaced');

            return response()->json([
                'message'  => 'Document replaced successfully.',
                'customer' => $customer->load(['documents', 'branch']),
            ]);

        } catch (\Exception $e) {
            return response()->json([
                'message' => 'Error replacing document.',
                'error'   => $e->getMessage(),
            ], 500);
        }
    }

    // ── Private helpers ──────────────────────────────────────────────────────

    /**
     * Iterate over an array of {front, back} pairs from the request and store each image.
     * The pair index (0-based) + 1 becomes the person_index stored in the database.
     */
    private function storePairs(
        Customer $customer,
        Request $request,
        string $pairsKey,
        string $frontType,
        string $backType
    ): void {
        $pairs = $request->file($pairsKey, []);

        foreach ($pairs as $index => $pair) {
            $personIndex = $index + 1;

            if (!empty($pair['front'])) {
                $this->uploadDocument($customer, $pair['front'], $frontType, $personIndex);
            }

            if (!empty($pair['back'])) {
                $this->uploadDocument($customer, $pair['back'], $backType, $personIndex);
            }
        }
    }

    /**
     * Optimize, resize (aspect ratio preserved), and store an image under the
     * organised folder structure, then persist the document record.
     *
     * Folder structure:
     *   {BRANCH_NAME}/{LASTNAME, FIRSTNAME [MIDDLENAME]}/{IMAGE_NAME}.jpg
     *
     * Head Office customers are stored without a branch sub-folder.
     */
    private function uploadDocument(
        Customer $customer,
        UploadedFile $file,
        string $documentType,
        int $personIndex
    ): CustomerDocument {
        // ── Optimise image ───────────────────────────────────────────────────
        $manager = new ImageManager(new Driver());
        $image   = $manager->read($file->getRealPath());

        // Scale down only — aspect ratio always preserved (object-fit: contain).
        $image->scaleDown(width: 800, height: 900);

        $encoded = $image->toJpeg(quality: 80);

        // ── Build organised path ─────────────────────────────────────────────
        $customer->loadMissing('branch');

        $directory = $this->buildDirectory($customer);
        $filename  = $this->buildFilename($documentType, $personIndex, $file);
        $path      = "{$directory}/{$filename}";

        Storage::disk('public')->put($path, (string) $encoded);

        return CustomerDocument::create([
            'customer_id'   => $customer->id,
            'document_type' => $documentType,
            'person_index'  => $personIndex,
            'file_path'     => $path,
            'file_name'     => $filename,
            'file_size'     => strlen((string) $encoded),
            'mime_type'     => 'image/jpeg',
        ]);
    }

    /**
     * Build the storage directory for a customer.
     *
     * Head Office → {CUSTOMER_FOLDER}
     * Other branch → {BRANCH_FOLDER}/{CUSTOMER_FOLDER}
     */
    private function buildDirectory(Customer $customer): string
    {
        $branchName = $customer->branch?->branch_name ?? '';
        $isHeadOffice = strtolower(trim($branchName)) === 'head office' || empty($branchName);

        $customerFolder = $this->buildCustomerFolderName($customer);

        if ($isHeadOffice) {
            return $customerFolder;
        }

        $branchFolder = $this->sanitizeName(strtoupper(trim($branchName)));

        return "{$branchFolder}/{$customerFolder}";
    }

    /**
     * Build the customer folder name.
     *
     * Regular/Corporate → LASTNAME, FIRSTNAME [MIDDLENAME]
     * Joint             → LASTNAME,FIRSTNAME , LASTNAME,FIRSTNAME (one segment per holder)
     *
     * Example Joint: "DOE,JANE , DOE,JOSH"
     */
    private function buildCustomerFolderName(Customer $customer): string
    {
        if ($customer->account_type !== 'Joint') {
            $name = strtoupper(trim($customer->lastname)) . ', ' . strtoupper(trim($customer->firstname));

            if (!empty($customer->middlename)) {
                $name .= ' ' . strtoupper(trim($customer->middlename));
            }

            return $this->sanitizeName($name);
        }

        // Joint: combine primary holder + additional holders
        $customer->loadMissing('holders');

        $segments = [];

        // Person 1 (primary — stored in customers table)
        $segments[] = strtoupper(trim($customer->lastname)) . ',' . strtoupper(trim($customer->firstname));

        // Person 2+ (stored in customer_holders table)
        foreach ($customer->holders as $holder) {
            $segments[] = strtoupper(trim($holder->lastname)) . ',' . strtoupper(trim($holder->firstname));
        }

        return $this->sanitizeName(implode(' , ', $segments));
    }

    /**
     * Map document types to their standard image filenames.
     * For joint/multi-person accounts, person index > 1 is appended.
     * Other documents keep their original sanitised name with a UUID suffix.
     */
    private function buildFilename(string $documentType, int $personIndex, UploadedFile $file): string
    {
        $nameMap = [
            'sigcard_front' => 'SIGCARD - FRONT',
            'sigcard_back'  => 'SIGCARD - BACK',
            'nais_front'    => 'NAIS - FRONT',
            'nais_back'     => 'NAIS - BACK',
            'privacy_front' => 'DATA PRIVACY - FRONT',
            'privacy_back'  => 'DATA PRIVACY - BACK',
        ];

        if (isset($nameMap[$documentType])) {
            $base   = $nameMap[$documentType];
            $suffix = $personIndex > 1 ? " - PERSON {$personIndex}" : '';

            return $base . $suffix . '.jpg';
        }

        // Other documents — keep original name, add UUID to avoid collisions.
        $originalName = pathinfo($file->getClientOriginalName(), PATHINFO_FILENAME);

        return $this->sanitizeName(strtoupper($originalName)) . ' - ' . Str::uuid() . '.jpg';
    }

    /**
     * Strip characters that are unsafe for folder/file names.
     * Keeps: letters, digits, spaces, commas, hyphens, periods, underscores.
     */
    private function sanitizeName(string $name): string
    {
        return trim(preg_replace('/[^\w\s,.\-]/', '_', $name));
    }

    /**
     * Delete all documents of the given types for a customer and remove their stored files.
     *
     * @param string[] $types
     */
    private function deleteDocumentsByTypes(Customer $customer, array $types): void
    {
        $documents = $customer->documents()->whereIn('document_type', $types)->get();

        foreach ($documents as $document) {
            Storage::disk('public')->delete($document->file_path);
            $document->delete();
        }
    }
}
