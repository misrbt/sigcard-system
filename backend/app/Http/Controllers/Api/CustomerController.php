<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Requests\AddCustomerAccountRequest;
use App\Http\Requests\StoreCustomerRequest;
use App\Http\Requests\UpdateCustomerRequest;
use App\Models\Customer;
use App\Models\CustomerAccount;
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
        $query = Customer::with(['documents', 'branch', 'uploader', 'holders', 'accounts']);
        $authUser = Auth::user();

        // Users see only their own branch.
        // Cashiers and managers see their own branch plus any branch lite children.
        // Admins see all branches unless they explicitly filter.
        if ($authUser->hasRole('user')) {
            $query->where('branch_id', $authUser->branch_id);
        } elseif ($authUser->hasAnyRole(['cashier', 'manager'])) {
            $branch = $authUser->branch()->with('children')->first();
            $branchIds = collect([$authUser->branch_id]);

            if ($branch) {
                $branchIds = $branchIds->merge($branch->children->pluck('id'));
            }

            $allBranchIds = $branchIds->unique()->values();

            // Allow filtering to a specific branch within the cashier/manager's scope
            if ($request->has('branch_id') && $allBranchIds->contains((int) $request->branch_id)) {
                $query->where('branch_id', $request->branch_id);
            } else {
                $query->whereIn('branch_id', $allBranchIds);
            }
        } elseif ($request->has('branch_id')) {
            $query->where('branch_id', $request->branch_id);
        }

        if ($request->has('status')) {
            $query->where('status', $request->status);
        }

        if ($request->has('account_type')) {
            $query->where('account_type', $request->account_type);
        }

        if ($request->has('risk_level')) {
            $query->where('risk_level', $request->risk_level);
        }

        if ($request->has('search')) {
            $search = $request->search;
            $query->where(function ($q) use ($search) {
                $q->where('firstname', 'like', "%{$search}%")
                    ->orWhere('lastname', 'like', "%{$search}%")
                    ->orWhere('middlename', 'like', "%{$search}%")
                    ->orWhere('company_name', 'like', "%{$search}%")
                    ->orWhere('account_no', 'like', "%{$search}%");
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
                'account_no' => $request->account_no ?: null,
                'date_opened' => $request->date_opened ?: null,
                'date_updated' => $request->date_updated ?: null,
                'branch_id' => $authUser->hasRole('user') ? $authUser->branch_id : $request->branch_id,
                'uploaded_by' => Auth::id(),
                'firstname' => $request->firstname,
                'middlename' => $request->middlename,
                'lastname' => $request->lastname,
                'suffix' => $request->suffix,
                'company_name' => $request->company_name,
                'account_type' => $request->account_type,
                'joint_sub_type' => $request->joint_sub_type,
                'risk_level' => $request->risk_level,
                'status' => $request->status ?? 'active',
            ]);

            // Handle optional customer photo
            if ($request->hasFile('photo')) {
                $photoPath = $this->uploadPhoto($customer, $request->file('photo'));
                $customer->update(['photo' => $photoPath]);
            }

            // Save additional accounts for the same person (Regular accounts)
            foreach ($request->input('additionalAccounts', []) as $account) {
                CustomerAccount::create([
                    'customer_id' => $customer->id,
                    'account_no' => $account['account_no'] ?? null,
                    'risk_level' => $account['risk_level'],
                    'date_opened' => $account['date_opened'] ?? null,
                    'date_updated' => $account['date_updated'] ?? null,
                    'status' => $account['status'] ?? 'active',
                ]);
            }

            // Save additional holders (person 2+) for Joint accounts
            foreach ($request->input('additionalPersons', []) as $index => $person) {
                CustomerHolder::create([
                    'customer_id' => $customer->id,
                    'person_index' => $index + 2, // Person 1 is in customers table
                    'firstname' => $person['firstname'],
                    'middlename' => $person['middlename'] ?? null,
                    'lastname' => $person['lastname'],
                    'suffix' => $person['suffix'] ?? null,
                    'risk_level' => $person['risk_level'] ?? null,
                ]);
            }

            $this->storePairs($customer, $request, 'sigcardPairs', 'sigcard_front', 'sigcard_back');
            $this->storePairs($customer, $request, 'naisPairs', 'nais_front', 'nais_back');
            $this->storePairs($customer, $request, 'privacyPairs', 'privacy_front', 'privacy_back');

            // Other docs sent per account/person: otherDocs[1][], otherDocs[2][], …
            foreach ($request->file('otherDocs', []) as $personIndex => $files) {
                $files = is_array($files) ? $files : [$files];
                foreach ($files as $file) {
                    $this->uploadDocument($customer, $file, 'other', (int) $personIndex);
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
                    'action' => 'customer_created',
                    'full_name' => $customer->full_name,
                    'account_type' => $customer->account_type,
                    'risk_level' => $customer->risk_level,
                    'status' => $customer->status,
                    'branch_id' => $customer->branch_id,
                    'documents_uploaded' => $docCounts,
                ])
                ->log('Customer sigcard record created');

            return response()->json([
                'message' => 'Customer created successfully.',
                'customer' => $customer->load(['documents', 'branch', 'holders', 'accounts']),
            ], 201);

        } catch (\Exception $e) {
            DB::rollBack();

            \Log::error('Customer creation failed', [
                'message' => $e->getMessage(),
                'file' => $e->getFile(),
                'line' => $e->getLine(),
                'trace' => $e->getTraceAsString(),
            ]);

            return response()->json([
                'message' => 'Error creating customer.',
                'error' => $e->getMessage(),
            ], 500);
        }
    }

    public function show(Customer $customer): JsonResponse
    {
        return response()->json($customer->load(['documents', 'branch', 'uploader', 'holders', 'accounts']));
    }

    public function update(UpdateCustomerRequest $request, Customer $customer): JsonResponse
    {
        try {
            DB::beginTransaction();

            // Snapshot the tracked fields BEFORE any change
            $before = $customer->only([
                'account_no', 'date_opened', 'firstname', 'middlename', 'lastname', 'suffix',
                'account_type', 'risk_level', 'status', 'branch_id',
            ]);

            $customer->update(array_filter([
                'account_no' => $request->account_no ?: null,
                'date_opened' => $request->date_opened ?: null,
                'date_updated' => $request->date_updated ?: null,
                'branch_id' => $request->branch_id,
                'firstname' => $request->firstname,
                'middlename' => $request->middlename,
                'lastname' => $request->lastname,
                'suffix' => $request->suffix,
                'company_name' => $request->company_name,
                'account_type' => $request->account_type,
                'risk_level' => $request->risk_level,
                'status' => $request->status,
            ], fn ($v) => ! is_null($v)));

            if ($request->hasFile('photo')) {
                $photoPath = $this->uploadPhoto($customer, $request->file('photo'));
                $customer->update(['photo' => $photoPath]);
            }

            // Sync additional accounts when provided
            if ($request->has('additionalAccounts')) {
                $customer->accounts()->delete();

                foreach ($request->input('additionalAccounts', []) as $account) {
                    CustomerAccount::create([
                        'customer_id' => $customer->id,
                        'account_no' => $account['account_no'] ?? null,
                        'risk_level' => $account['risk_level'],
                        'date_opened' => $account['date_opened'] ?? null,
                        'status' => $account['status'] ?? 'active',
                    ]);
                }
            }

            // Sync additional holders when provided
            if ($request->has('additionalPersons')) {
                $customer->holders()->delete();

                foreach ($request->input('additionalPersons', []) as $index => $person) {
                    CustomerHolder::create([
                        'customer_id' => $customer->id,
                        'person_index' => $index + 2,
                        'firstname' => $person['firstname'],
                        'middlename' => $person['middlename'] ?? null,
                        'lastname' => $person['lastname'],
                        'suffix' => $person['suffix'] ?? null,
                        'risk_level' => $person['risk_level'] ?? null,
                    ]);
                }
            }

            foreach (['sigcardPairs' => ['sigcard_front', 'sigcard_back'],
                'naisPairs' => ['nais_front',    'nais_back'],
                'privacyPairs' => ['privacy_front', 'privacy_back']] as $pairsKey => [$frontType, $backType]) {
                if ($request->has($pairsKey)) {
                    $this->archiveAndReplaceDocGroup($customer, $request, $pairsKey, $frontType, $backType);
                }
            }

            // Other docs sent per account/person: otherDocs[1][], otherDocs[2][], …
            foreach ($request->file('otherDocs', []) as $personIndex => $files) {
                $files = is_array($files) ? $files : [$files];
                foreach ($files as $file) {
                    $this->uploadDocument($customer, $file, 'other', (int) $personIndex);
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
                    'action' => 'customer_updated',
                    'full_name' => $customer->full_name,
                    'diff' => $diff,
                ])
                ->log('Customer sigcard record updated');

            return response()->json([
                'message' => 'Customer updated successfully.',
                'customer' => $customer->load(['documents', 'branch', 'holders', 'accounts']),
            ]);

        } catch (\Exception $e) {
            DB::rollBack();

            return response()->json([
                'message' => 'Error updating customer.',
                'error' => $e->getMessage(),
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
                'full_name' => $customer->full_name,
                'account_type' => $customer->account_type,
                'risk_level' => $customer->risk_level,
                'status' => $customer->status,
                'branch_id' => $customer->branch_id,
                'doc_count' => $customer->documents()->count(),
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
                'error' => $e->getMessage(),
            ], 500);
        }
    }

    public function getDocuments(Customer $customer): JsonResponse
    {
        return response()->json($customer->documents()->orderBy('person_index')->get());
    }

    public function history(Customer $customer): JsonResponse
    {
        // Build a map of current documents keyed by "type_personIndex"
        $currentDocs = $customer->documents->groupBy(function (CustomerDocument $doc) {
            return $doc->document_type.'_'.$doc->person_index;
        })->map(fn ($docs) => [
            'file_path' => $docs->first()->file_path,
            'file_name' => $docs->first()->file_name,
        ]);

        // Build a grouped list of all current documents for creation events
        $allCurrentDocs = $customer->documents->map(fn (CustomerDocument $doc) => [
            'document_type' => $doc->document_type,
            'person_index' => $doc->person_index,
            'file_path' => $doc->file_path,
            'file_name' => $doc->file_name,
        ])->values()->all();

        $logs = \Spatie\Activitylog\Models\Activity::with('causer')
            ->where('subject_type', Customer::class)
            ->where('subject_id', $customer->id)
            ->latest()
            ->get()
            ->map(function ($entry) use ($currentDocs, $allCurrentDocs) {
                $props = $entry->properties->toArray();
                $meta = collect($props)->except(['diff'])->all();

                $desc = strtolower($entry->description ?? '');

                // For document replacement events, attach the current document path
                if (str_contains($desc, 'replaced') && isset($meta['document_type'])) {
                    $key = $meta['document_type'].'_'.($meta['person_index'] ?? 1);
                    $current = $currentDocs->get($key);
                    if ($current) {
                        $meta['current_file_path'] = $current['file_path'];
                        $meta['current_file_name'] = $current['file_name'];
                    }
                }

                // For creation events, attach all current document images
                if (str_contains($desc, 'created') || $entry->event === 'created') {
                    $meta['current_documents'] = $allCurrentDocs;
                }

                return [
                    'id' => $entry->id,
                    'event' => $entry->event,
                    'description' => $entry->description,
                    'causer' => $entry->causer
                        ? ['name' => optional($entry->causer)->full_name, 'email' => optional($entry->causer)->email]
                        : null,
                    'diff' => $props['diff'] ?? null,
                    'meta' => $meta,
                    'created_at' => $entry->created_at->toIso8601String(),
                ];
            });

        return response()->json([
            'history' => $logs,
            'current_status' => $customer->status,
            'current_risk_level' => $customer->risk_level,
        ]);
    }

    public function deleteDocument(Customer $customer, CustomerDocument $document): JsonResponse
    {
        if ($document->customer_id !== $customer->id) {
            return response()->json(['message' => 'Document does not belong to this customer.'], 403);
        }

        $documentType = $document->document_type;
        $personIndex = $document->person_index;
        $fileName = $document->file_name;
        $filePath = $document->file_path;

        Storage::disk('public')->delete($document->file_path);
        $document->delete();

        activity()
            ->causedBy(Auth::user())
            ->performedOn($customer)
            ->withProperties([
                'action' => 'document_deleted',
                'full_name' => $customer->full_name,
                'document_type' => $documentType,
                'person_index' => $personIndex,
                'file_name' => $fileName,
                'file_path' => $filePath,
            ])
            ->log('Customer document deleted');

        return response()->json(['message' => 'Document deleted successfully.']);
    }

    public function replaceDocument(Request $request, Customer $customer): JsonResponse
    {
        $request->validate([
            'document_type' => 'required|string|in:sigcard_front,sigcard_back,nais_front,nais_back,privacy_front,privacy_back,other',
            'person_index' => 'required|integer|min:1',
            'file' => 'required|image|max:10240',
            'document_id' => 'nullable|integer|exists:customer_documents,id',
        ]);

        try {
            $existing = $request->document_id
                ? $customer->documents()->find($request->document_id)
                : $customer->documents()
                    ->where('document_type', $request->document_type)
                    ->where('person_index', $request->person_index)
                    ->first();

            $archivedPath = null;

            if ($existing) {
                // Archive the old file instead of deleting so it can be viewed in audit history
                $pathInfo = pathinfo($existing->file_path);
                $archiveName = $pathInfo['filename'].'_archived_'.now()->format('Ymd_His').'.jpg';
                $archiveDir = 'archive/'.$pathInfo['dirname'];
                $archivedPath = $archiveDir.'/'.$archiveName;

                if (Storage::disk('public')->exists($existing->file_path)) {
                    Storage::disk('public')->move($existing->file_path, $archivedPath);
                }

                $existing->delete();
            }

            $newDocument = $this->uploadDocument(
                $customer,
                $request->file('file'),
                $request->document_type,
                (int) $request->person_index
            );

            activity()
                ->causedBy(Auth::user())
                ->performedOn($customer)
                ->withProperties([
                    'action' => 'document_replaced',
                    'full_name' => $customer->full_name,
                    'document_type' => $request->document_type,
                    'person_index' => (int) $request->person_index,
                    'replaced_file' => $existing?->file_name,
                    'archived_file_path' => $archivedPath,
                    'new_file_name' => $newDocument->file_name,
                ])
                ->log('Customer document replaced');

            return response()->json([
                'message' => 'Document replaced successfully.',
                'customer' => $customer->load(['documents', 'branch']),
            ]);

        } catch (\Exception $e) {
            return response()->json([
                'message' => 'Error replacing document.',
                'error' => $e->getMessage(),
            ], 500);
        }
    }

    public function addAccount(AddCustomerAccountRequest $request, Customer $customer): JsonResponse
    {
        try {
            DB::beginTransaction();

            // Next person_index: primary=1, additionalAccounts[0]=2, so next = count+2
            $personIndex = $customer->accounts()->count() + 2;

            CustomerAccount::create([
                'customer_id' => $customer->id,
                'account_no' => $request->account_no ?: null,
                'risk_level' => $request->risk_level,
                'date_opened' => $request->date_opened ?: null,
                'date_updated' => $request->date_updated ?: null,
                'status' => $request->status ?? 'active',
            ]);

            // Store sigcard pair
            foreach ($request->file('sigcardPairs', []) as $pair) {
                if (! empty($pair['front'])) {
                    $this->uploadDocument($customer, $pair['front'], 'sigcard_front', $personIndex);
                }
                if (! empty($pair['back'])) {
                    $this->uploadDocument($customer, $pair['back'], 'sigcard_back', $personIndex);
                }
            }

            // Store nais pair (optional)
            foreach ($request->file('naisPairs', []) as $pair) {
                if (! empty($pair['front'])) {
                    $this->uploadDocument($customer, $pair['front'], 'nais_front', $personIndex);
                }
                if (! empty($pair['back'])) {
                    $this->uploadDocument($customer, $pair['back'], 'nais_back', $personIndex);
                }
            }

            // Store privacy pair
            foreach ($request->file('privacyPairs', []) as $pair) {
                if (! empty($pair['front'])) {
                    $this->uploadDocument($customer, $pair['front'], 'privacy_front', $personIndex);
                }
                if (! empty($pair['back'])) {
                    $this->uploadDocument($customer, $pair['back'], 'privacy_back', $personIndex);
                }
            }

            // Store other docs
            foreach ($request->file('otherDocs', []) as $file) {
                $this->uploadDocument($customer, $file, 'other', $personIndex);
            }

            DB::commit();

            activity()
                ->causedBy(Auth::user())
                ->performedOn($customer)
                ->withProperties([
                    'action' => 'account_added',
                    'full_name' => $customer->full_name,
                    'account_no' => $request->account_no,
                    'person_index' => $personIndex,
                ])
                ->log('Additional account added to customer');

            return response()->json([
                'message' => 'Account added successfully.',
                'customer' => $customer->load(['documents', 'branch', 'holders', 'accounts']),
            ], 201);

        } catch (\Exception $e) {
            DB::rollBack();

            return response()->json([
                'message' => 'Error adding account.',
                'error' => $e->getMessage(),
            ], 500);
        }
    }

    public function updateAccount(Request $request, Customer $customer, CustomerAccount $account): JsonResponse
    {
        abort_if($account->customer_id !== $customer->id, 404);

        $validated = $request->validate([
            'status' => 'nullable|in:active,dormant,reactivated,escheat,closed',
            'risk_level' => 'nullable|in:Low Risk,Medium Risk,High Risk',
            'account_no' => 'nullable|string|max:100',
            'date_opened' => 'nullable|date',
            'date_updated' => 'nullable|date',
        ]);

        $before = $account->only(['status', 'risk_level', 'account_no', 'date_opened', 'date_updated']);

        $account->update(array_filter($validated, fn ($v) => ! is_null($v)));

        activity()
            ->causedBy(Auth::user())
            ->performedOn($customer)
            ->withProperties([
                'action' => 'account_updated',
                'account_id' => $account->id,
                'account_no' => $account->account_no,
                'before' => $before,
                'after' => $account->fresh()->only(array_keys($before)),
            ])
            ->log('Customer account updated');

        return response()->json([
            'message' => 'Account updated.',
            'customer' => $customer->load(['documents', 'branch', 'holders', 'accounts']),
        ]);
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
        $pairsMeta = $request->input($pairsKey, []);

        foreach ($pairs as $index => $pair) {
            // ITF pairs include an explicit person_index from the frontend
            $personIndex = isset($pairsMeta[$index]['person_index'])
                ? (int) $pairsMeta[$index]['person_index']
                : $index + 1;

            if (! empty($pair['front'])) {
                $this->uploadDocument($customer, $pair['front'], $frontType, $personIndex);
            }

            if (! empty($pair['back'])) {
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
    private ?ImageManager $imageManager = null;

    private function imageManager(): ImageManager
    {
        return $this->imageManager ??= new ImageManager(new Driver);
    }

    private function uploadDocument(
        Customer $customer,
        UploadedFile $file,
        string $documentType,
        int $personIndex
    ): CustomerDocument {
        // ── Optimise image ───────────────────────────────────────────────────
        $image = $this->imageManager()->read($file->getRealPath());

        // Scale down only — aspect ratio always preserved (object-fit: contain).
        $image->scaleDown(width: 800, height: 900);

        $encoded = $image->toJpeg(quality: 80);

        // ── Build organised path ─────────────────────────────────────────────
        $customer->loadMissing('branch');

        $directory = $this->buildDirectory($customer);
        $filename = $this->buildFilename($documentType, $personIndex, $file);
        $path = "{$directory}/{$filename}";

        Storage::disk('public')->put($path, (string) $encoded);

        return CustomerDocument::create([
            'customer_id' => $customer->id,
            'document_type' => $documentType,
            'person_index' => $personIndex,
            'file_path' => $path,
            'file_name' => $filename,
            'file_size' => strlen((string) $encoded),
            'mime_type' => 'image/jpeg',
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
        if ($customer->account_type === 'Corporate') {
            return $this->sanitizeName(strtoupper(trim($customer->company_name ?? 'CORPORATE')));
        }

        if ($customer->account_type !== 'Joint') {
            $name = strtoupper(trim($customer->lastname)).', '.strtoupper(trim($customer->firstname));

            if (! empty($customer->middlename)) {
                $name .= ' '.strtoupper(trim($customer->middlename));
            }

            return $this->sanitizeName($name);
        }

        // Joint: combine primary holder + additional holders
        $customer->loadMissing('holders');

        $segments = [];

        // Person 1 (primary — stored in customers table)
        $segments[] = strtoupper(trim($customer->lastname)).','.strtoupper(trim($customer->firstname));

        // Person 2+ (stored in customer_holders table)
        foreach ($customer->holders as $holder) {
            $segments[] = strtoupper(trim($holder->lastname)).','.strtoupper(trim($holder->firstname));
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
            'sigcard_back' => 'SIGCARD - BACK',
            'nais_front' => 'NAIS - FRONT',
            'nais_back' => 'NAIS - BACK',
            'privacy_front' => 'DATA PRIVACY - FRONT',
            'privacy_back' => 'DATA PRIVACY - BACK',
        ];

        if (isset($nameMap[$documentType])) {
            $base = $nameMap[$documentType];
            $suffix = $personIndex > 1 ? " - PERSON {$personIndex}" : '';

            return $base.$suffix.'.jpg';
        }

        // Other documents — keep original name, add UUID to avoid collisions.
        $originalName = pathinfo($file->getClientOriginalName(), PATHINFO_FILENAME);

        return $this->sanitizeName(strtoupper($originalName)).' - '.Str::uuid().'.jpg';
    }

    /**
     * Resize and store a customer photo, returning the stored path.
     */
    private function uploadPhoto(Customer $customer, UploadedFile $file): string
    {
        $image = $this->imageManager()->read($file->getRealPath());
        $image->scaleDown(width: 400, height: 400);
        $encoded = $image->toJpeg(quality: 85);

        $customer->loadMissing('branch');
        $directory = $this->buildDirectory($customer);
        $filename = 'PHOTO.jpg';
        $path = "{$directory}/{$filename}";

        Storage::disk('public')->put($path, (string) $encoded);

        return $path;
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
     * Archive existing documents for the given type group, log each replacement,
     * then upload the new pairs. Used by update() for bulk doc replacement.
     */
    private function archiveAndReplaceDocGroup(
        Customer $customer,
        Request $request,
        string $pairsKey,
        string $frontType,
        string $backType
    ): void {
        $existing = $customer->documents()->whereIn('document_type', [$frontType, $backType])->get();

        foreach ($existing as $doc) {
            $pathInfo = pathinfo($doc->file_path);
            $archiveName = $pathInfo['filename'].'_archived_'.now()->format('Ymd_His').'.jpg';
            $archiveDir = 'archive/'.($pathInfo['dirname'] !== '.' ? $pathInfo['dirname'] : '');
            $archivedPath = rtrim($archiveDir, '/').'/'.$archiveName;

            if (Storage::disk('public')->exists($doc->file_path)) {
                Storage::disk('public')->move($doc->file_path, $archivedPath);
            }

            activity()
                ->causedBy(Auth::user())
                ->performedOn($customer)
                ->withProperties([
                    'action' => 'document_replaced',
                    'full_name' => $customer->full_name,
                    'document_type' => $doc->document_type,
                    'person_index' => $doc->person_index,
                    'replaced_file' => $doc->file_name,
                    'archived_file_path' => $archivedPath,
                ])
                ->log('Customer document replaced');

            $doc->delete();
        }

        $this->storePairs($customer, $request, $pairsKey, $frontType, $backType);
    }

    /**
     * Delete all documents of the given types for a customer and remove their stored files.
     *
     * @param  string[]  $types
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
