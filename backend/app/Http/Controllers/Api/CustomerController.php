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
use App\Services\ThumbmarkSearchService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Str;
use Intervention\Image\Drivers\Gd\Driver;
use Intervention\Image\ImageManager;

class CustomerController extends Controller
{
    public function __construct(private readonly ThumbmarkSearchService $thumbmarkService) {}

    public function index(Request $request): JsonResponse
    {
        $this->authorize('view-customers');

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

        $customers = $query->latest('updated_at')->paginate($request->get('per_page', 15));

        return response()->json($customers);
    }

    public function store(StoreCustomerRequest $request): JsonResponse
    {
        $this->authorize('create-customers');

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
                'corporate_sub_type' => $request->corporate_sub_type,
                'risk_level' => $request->risk_level,
                'status' => $request->status ?? 'active',
                'status_date' => $request->status_date ?: null,
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
                    'status_date' => $account['status_date'] ?? null,
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

            // Initial creation: null account_status so documents are grouped under "Initial Upload"
            // and stored directly in the customer folder (no status subfolder).
            $this->storePairs($customer, $request, 'sigcardPairs', 'sigcard_front', 'sigcard_back', null);
            $this->storePairs($customer, $request, 'naisPairs', 'nais_front', 'nais_back', null);
            $this->storePairs($customer, $request, 'privacyPairs', 'privacy_front', 'privacy_back', null);

            // Other docs sent per account/person: otherDocs[1][], otherDocs[2][], …
            foreach ($request->file('otherDocs', []) as $personIndex => $files) {
                $files = is_array($files) ? $files : [$files];
                foreach ($files as $file) {
                    $this->uploadDocument($customer, $file, 'other', (int) $personIndex, null);
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

            Log::error('Customer creation failed', [
                'message' => $e->getMessage(),
                'file' => $e->getFile(),
                'line' => $e->getLine(),
                'trace' => $e->getTraceAsString(),
            ]);

            return response()->json([
                'message' => 'Unable to save the customer record. Please check your entries and try again. If the problem continues, contact your system administrator.',
            ], 500);
        }
    }

    public function show(Customer $customer): JsonResponse
    {
        $this->authorize('view-customers');

        activity()
            ->causedBy(Auth::user())
            ->performedOn($customer)
            ->withProperties([
                'action' => 'customer_viewed',
                'full_name' => $customer->full_name,
                'account_type' => $customer->account_type,
                'branch_id' => $customer->branch_id,
            ])
            ->log('Customer sigcard record viewed');

        return response()->json($customer->load(['documents', 'branch', 'uploader', 'holders', 'accounts', 'statusLogs.changedBy', 'statusLogs.documents']));
    }

    public function update(UpdateCustomerRequest $request, Customer $customer): JsonResponse
    {
        $this->authorize('edit-customers');

        try {
            DB::beginTransaction();

            // Snapshot the tracked fields BEFORE any change
            $before = $customer->only([
                'account_no',
                'date_opened',
                'firstname',
                'middlename',
                'lastname',
                'suffix',
                'account_type',
                'risk_level',
                'status',
                'branch_id',
            ]);

            $updatable = [
                'account_no',
                'date_opened',
                'date_updated',
                'branch_id',
                'firstname',
                'middlename',
                'lastname',
                'suffix',
                'company_name',
                'account_type',
                'risk_level',
                'status',
                'status_date',
            ];

            $data = [];
            foreach ($updatable as $field) {
                if ($request->has($field)) {
                    $data[$field] = $request->input($field);
                }
            }

            if (array_key_exists('status', $data) && $customer->status === 'escheat') {
                return response()->json(['message' => 'Escheat accounts cannot have their status changed.'], 422);
            }

            $statusChanged = array_key_exists('status', $data) && $data['status'] !== $customer->status;
            $previousStatus = $customer->status;

            if ($statusChanged) {
                $data['status_updated_at'] = now();
            }

            if (! empty($data)) {
                $customer->update($data);
            }

            $statusLog = null;
            if ($statusChanged) {
                $statusLog = \App\Models\CustomerStatusLog::create([
                    'customer_id' => $customer->id,
                    'status' => $data['status'],
                    'previous_status' => $previousStatus,
                    'changed_by' => Auth::id(),
                ]);
            }

            if ($request->hasFile('photo')) {
                $photoPath = $this->uploadPhoto($customer, $request->file('photo'));
                $customer->update(['photo' => $photoPath]);
            } elseif ($request->boolean('remove_photo') && $customer->photo) {
                Storage::disk('public')->delete($customer->photo);
                $customer->update(['photo' => null]);
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
                        'status_date' => $account['status_date'] ?? null,
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

            $accountStatus = $request->input('account_status');
            $statusLogId = $request->input('status_log_id') ? (int) $request->input('status_log_id') : null;

            foreach (
                [
                    'sigcardPairs' => ['sigcard_front', 'sigcard_back'],
                    'naisPairs' => ['nais_front',    'nais_back'],
                    'privacyPairs' => ['privacy_front', 'privacy_back'],
                ] as $pairsKey => [$frontType, $backType]
            ) {
                if ($request->has($pairsKey)) {
                    $this->archiveAndReplaceDocGroup($customer, $request, $pairsKey, $frontType, $backType, $accountStatus);
                }
            }

            // Other docs sent per account/person: otherDocs[1][], otherDocs[2][], …
            foreach ($request->file('otherDocs', []) as $personIndex => $files) {
                $files = is_array($files) ? $files : [$files];
                foreach ($files as $file) {
                    $this->uploadDocument($customer, $file, 'other', (int) $personIndex, $accountStatus, $statusLogId);
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
                'status_log_id' => $statusLog?->id,
                'customer' => $customer->load(['documents', 'branch', 'holders', 'accounts', 'statusLogs.changedBy', 'statusLogs.documents']),
            ]);
        } catch (\Exception $e) {
            DB::rollBack();

            return response()->json([
                'message' => 'Unable to update the customer record. Please try again. If the problem continues, contact your system administrator.',
            ], 500);
        }
    }

    public function destroy(Customer $customer): JsonResponse
    {
        $this->authorize('edit-customers');

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
                'message' => 'Unable to delete the customer record. Please try again. If the problem continues, contact your system administrator.',
            ], 500);
        }
    }

    public function getDocuments(Customer $customer): JsonResponse
    {
        $this->authorize('view-customer-documents');

        activity()
            ->causedBy(Auth::user())
            ->performedOn($customer)
            ->withProperties([
                'action' => 'customer_documents_viewed',
                'full_name' => $customer->full_name,
            ])
            ->log('Customer documents viewed');

        return response()->json($customer->documents()->orderBy('person_index')->get());
    }

    public function history(Customer $customer): JsonResponse
    {
        $this->authorize('view-customers');

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

        // Fetch activity logs for this customer (both Customer and CustomerDocument subjects)
        $documentIds = $customer->documents()->pluck('id')->all();

        $logs = \Spatie\Activitylog\Models\Activity::with('causer')
            ->where(function ($q) use ($customer, $documentIds) {
                $q->where(function ($q2) use ($customer) {
                    $q2->where('subject_type', Customer::class)
                        ->where('subject_id', $customer->id);
                })->orWhere(function ($q2) use ($customer) {
                    // Manual document logs are performed on the Customer subject
                    $q2->where('subject_type', Customer::class)
                        ->where('subject_id', $customer->id);
                });

                // Also include auto-logged CustomerDocument events
                if (! empty($documentIds)) {
                    $q->orWhere(function ($q2) use ($documentIds) {
                        $q2->where('subject_type', CustomerDocument::class)
                            ->whereIn('subject_id', $documentIds);
                    });
                }
            })
            ->latest()
            ->get()
            ->unique('id') // Deduplicate since the OR conditions may overlap
            ->map(function ($entry) use ($currentDocs, $allCurrentDocs) {
                $props = $entry->properties->toArray();
                $meta = collect($props)->except(['diff', 'old', 'attributes'])->all();

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

                // Build diff from multiple formats
                $diff = $props['diff'] ?? null;
                if (! $diff && isset($props['old'], $props['attributes'])) {
                    $diff = [];
                    foreach ($props['attributes'] as $key => $newVal) {
                        $oldVal = $props['old'][$key] ?? null;
                        if ((string) ($oldVal ?? '') !== (string) ($newVal ?? '')) {
                            $diff[$key] = ['before' => $oldVal, 'after' => $newVal];
                        }
                    }
                }

                return [
                    'id' => $entry->id,
                    'event' => $entry->event,
                    'description' => $entry->description,
                    'causer' => $entry->causer
                        ? ['name' => optional($entry->causer)->full_name, 'email' => optional($entry->causer)->email]
                        : null,
                    'diff' => $diff,
                    'meta' => $meta,
                    'created_at' => $entry->created_at->toIso8601String(),
                ];
            })
            ->values();

        // ── Status timeline: extract status-change events in chronological order ──
        $statusTimeline = collect();
        $statusTimeline->push([
            'status' => $customer->getOriginal('status') ?? 'active',
            'changed_at' => $customer->created_at->toIso8601String(),
            'changed_by' => null,
            'label' => 'Account Opened',
        ]);

        $logs->sortBy('created_at')->each(function ($entry) use (&$statusTimeline) {
            $diff = $entry['diff'] ?? [];
            if (isset($diff['status'])) {
                $statusTimeline->push([
                    'status' => $diff['status']['after'] ?? $diff['status']['after'] ?? null,
                    'changed_at' => $entry['created_at'],
                    'changed_by' => $entry['causer']['name'] ?? null,
                    'label' => 'Status Changed',
                ]);
            }
        });

        // Current status as final node
        $lastStatus = $statusTimeline->last()['status'] ?? null;
        if ($lastStatus !== $customer->status) {
            $statusTimeline->push([
                'status' => $customer->status,
                'changed_at' => now()->toIso8601String(),
                'changed_by' => null,
                'label' => 'Current Status',
            ]);
        }

        // ── Document version history: list archived versions per document type ──
        $documentVersions = [];
        $logs->each(function ($entry) use (&$documentVersions) {
            $meta = $entry['meta'] ?? [];
            $desc = strtolower($entry['description'] ?? '');

            if (str_contains($desc, 'replaced') && isset($meta['document_type'])) {
                $docKey = $meta['document_type'].($meta['person_index'] > 1 ? '_p'.$meta['person_index'] : '');

                if (! isset($documentVersions[$docKey])) {
                    $documentVersions[$docKey] = [
                        'document_type' => $meta['document_type'],
                        'person_index' => $meta['person_index'] ?? 1,
                        'versions' => [],
                    ];
                }

                $documentVersions[$docKey]['versions'][] = [
                    'archived_file_path' => $meta['archived_file_path'] ?? null,
                    'replaced_file' => $meta['replaced_file'] ?? null,
                    'replaced_at' => $entry['created_at'],
                    'replaced_by' => $entry['causer']['name'] ?? null,
                    'new_file_name' => $meta['new_file_name'] ?? null,
                    'current_file_path' => $meta['current_file_path'] ?? null,
                ];
            }
        });

        return response()->json([
            'history' => $logs,
            'status_timeline' => $statusTimeline->values(),
            'document_versions' => array_values($documentVersions),
            'current_status' => $customer->status,
            'current_risk_level' => $customer->risk_level,
            'current_documents' => $allCurrentDocs,
        ]);
    }

    public function deleteDocument(Customer $customer, CustomerDocument $document): JsonResponse
    {
        $this->authorize('edit-customers');

        if ($document->customer_id !== $customer->id) {
            return response()->json(['message' => 'This document is not associated with the selected customer. Please refresh the page and try again.'], 403);
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
        $this->authorize('edit-customers');

        $request->validate([
            'document_type' => 'required|string|in:sigcard_front,sigcard_back,nais_front,nais_back,privacy_front,privacy_back,other',
            'person_index' => 'required|integer|min:1',
            'file' => 'required|image|max:10240',
            'document_id' => 'nullable|integer|exists:customer_documents,id',
            'account_status' => 'nullable|string|in:active,reactivated,dormant,escheat,closed',
            'status_log_id' => 'nullable|integer|exists:customer_status_logs,id',
        ]);

        // Validate the image can be decoded before processing.
        // getimagesize() detects the true format from the binary content,
        // catching renamed HEIC/WebP/corrupt files that pass the MIME validator.
        $imageInfo = @getimagesize($request->file('file')->getRealPath());
        if (! $imageInfo || ! in_array($imageInfo[2], [IMAGETYPE_JPEG, IMAGETYPE_PNG], true)) {
            return response()->json([
                'message' => 'The uploaded file could not be processed. Please ensure it is a valid JPG or PNG image and try again.',
            ], 422);
        }

        try {
            $existing = $request->document_id
                ? $customer->documents()->find($request->document_id)
                : $customer->documents()
                    ->where('document_type', $request->document_type)
                    ->where('person_index', $request->person_index)
                    ->where('is_current', true)
                    ->latest()
                    ->first();

            $versionedPath = null;
            $oldFileName = null;

            if ($existing) {
                $oldFileName = $existing->file_name;
                $pathInfo = pathinfo($existing->file_path);
                $dir = $pathInfo['dirname'] !== '.' ? $pathInfo['dirname'] : '';
                $versionedName = $pathInfo['filename'].'_v'.now()->format('Ymd_His').'.jpg';
                $versionedPath = ($dir ? $dir.'/' : '').$versionedName;

                if (Storage::disk('public')->exists($existing->file_path)) {
                    Storage::disk('public')->move($existing->file_path, $versionedPath);
                }

                $existing->update([
                    'is_current' => false,
                    'file_path' => $versionedPath,
                    'file_name' => $versionedName,
                ]);

                // Demote any other stale is_current duplicates for the same
                // type + person_index (guards against prior data inconsistency).
                $customer->documents()
                    ->where('document_type', $request->document_type)
                    ->where('person_index', $request->person_index)
                    ->where('is_current', true)
                    ->where('id', '!=', $existing->id)
                    ->update(['is_current' => false]);
            }

            // Preserve grouping metadata by default so a replacement remains part of
            // the same "latest" document set shown in CustomerView/EditCustomerDocs.
            $effectiveAccountStatus = $request->input('account_status');
            $effectiveStatusLogId = $request->input('status_log_id');
            if ($existing) {
                $effectiveAccountStatus ??= $existing->account_status;
                $effectiveStatusLogId ??= $existing->status_log_id;
            }

            $newDocument = $this->uploadDocument(
                $customer,
                $request->file('file'),
                $request->document_type,
                (int) $request->person_index,
                $effectiveAccountStatus,
                $effectiveStatusLogId ? (int) $effectiveStatusLogId : null
            );

            activity()
                ->causedBy(Auth::user())
                ->performedOn($customer)
                ->withProperties([
                    'action' => 'document_replaced',
                    'full_name' => $customer->full_name,
                    'document_type' => $request->document_type,
                    'person_index' => (int) $request->person_index,
                    'replaced_file' => $oldFileName,
                    'versioned_file_path' => $versionedPath,
                    'new_file_name' => $newDocument->file_name,
                ])
                ->log('Customer document replaced');

            return response()->json([
                'message' => 'Document replaced successfully.',
                'customer' => $customer->load([
                    'documents',
                    'branch',
                    'statusLogs' => fn ($q) => $q->with('documents'),
                ]),
            ]);
        } catch (\Exception $e) {
            Log::error('replaceDocument failed', [
                'customer_id' => $customer->id,
                'error' => $e->getMessage(),
                'trace' => $e->getTraceAsString(),
            ]);

            $isDecodeError = str_contains($e->getMessage(), 'Unable to decode')
                || str_contains($e->getMessage(), 'decode input');

            return response()->json([
                'message' => $isDecodeError
                    ? 'The uploaded file could not be processed. Please ensure it is a valid JPG or PNG image and try again.'
                    : 'Unable to replace the document. Please check the file and try again. If the problem continues, contact your system administrator.',
            ], 500);
        }
    }

    public function addAccount(AddCustomerAccountRequest $request, Customer $customer): JsonResponse
    {
        $this->authorize('create-customers');

        try {
            DB::beginTransaction();

            $isJoint = $customer->account_type === 'Joint';

            if ($isJoint) {
                // Add a new holder; person_index starts at 2 (primary is 1)
                $personIndex = $customer->holders()->count() + 2;

                CustomerHolder::create([
                    'customer_id' => $customer->id,
                    'person_index' => $personIndex,
                    'firstname' => $request->firstname,
                    'middlename' => $request->middlename,
                    'lastname' => $request->lastname,
                    'suffix' => $request->suffix,
                    'risk_level' => $request->risk_level,
                ]);

                CustomerAccount::create([
                    'customer_id' => $customer->id,
                    'account_no' => $request->account_no ?: null,
                    'risk_level' => $request->risk_level,
                    'date_opened' => $request->date_opened ?: null,
                    'date_updated' => $request->date_updated ?: null,
                    'status' => $request->status ?? 'active',
                ]);
            } else {
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
            }

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

            $logMessage = $isJoint ? 'Additional holder added to joint account' : 'Additional account added to customer';

            activity()
                ->causedBy(Auth::user())
                ->performedOn($customer)
                ->withProperties(array_filter([
                    'action' => $isJoint ? 'holder_added' : 'account_added',
                    'full_name' => $customer->full_name,
                    'holder_name' => $isJoint ? trim("{$request->firstname} {$request->lastname}") : null,
                    'account_no' => $request->account_no,
                    'person_index' => $personIndex,
                ]))
                ->log($logMessage);

            return response()->json([
                'message' => $isJoint ? 'Holder added successfully.' : 'Account added successfully.',
                'customer' => $customer->load(['documents', 'branch', 'holders', 'accounts']),
            ], 201);
        } catch (\Exception $e) {
            DB::rollBack();

            return response()->json([
                'message' => 'Unable to add the account. Please check your entries and try again. If the problem continues, contact your system administrator.',
            ], 500);
        }
    }

    public function updateAccount(Request $request, Customer $customer, CustomerAccount $account): JsonResponse
    {
        $this->authorize('edit-customers');

        abort_if($account->customer_id !== $customer->id, 404);

        $validated = $request->validate([
            'status' => 'nullable|in:active,dormant,reactivated,escheat,closed',
            'risk_level' => 'nullable|in:Low Risk,Medium Risk,High Risk',
            'account_no' => 'nullable|string|max:100',
            'date_opened' => 'nullable|date',
            'date_updated' => 'nullable|date',
        ]);

        if (isset($validated['status']) && $account->status === 'escheat') {
            return response()->json(['message' => 'Escheat accounts cannot have their status changed.'], 422);
        }

        $before = $account->only(['status', 'risk_level', 'account_no', 'date_opened', 'date_updated']);
        $previousStatus = $account->status;
        $statusChanging = isset($validated['status']) && $validated['status'] !== $previousStatus;

        $account->update(array_filter($validated, fn ($v) => ! is_null($v)));

        $statusLog = null;
        if ($statusChanging) {
            $statusLog = \App\Models\CustomerStatusLog::create([
                'customer_id' => $customer->id,
                'account_id' => $account->id,
                'status' => $validated['status'],
                'previous_status' => $previousStatus,
                'changed_by' => Auth::id(),
            ]);
        }

        $after = $account->fresh()->only(array_keys($before));
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
                'action' => 'account_updated',
                'account_id' => $account->id,
                'account_no' => $account->account_no,
                'diff' => $diff,
            ])
            ->log('Customer account updated');

        return response()->json([
            'message' => 'Account updated.',
            'status_log_id' => $statusLog?->id,
            'customer' => $customer->load(['documents', 'branch', 'holders', 'accounts', 'statusLogs.changedBy', 'statusLogs.documents']),
        ]);
    }

    /**
     * Add status-change documents alongside existing ones (no archiving).
     * Used when a user uploads documents after a status change (e.g. reactivated, dormant).
     */
    /**
     * Add status-change documents alongside existing ones (no archiving).
     * Linked to a specific CustomerStatusLog entry via status_log_id.
     */
    public function uploadStatusDocument(Request $request, Customer $customer): JsonResponse
    {
        $this->authorize('edit-customers');

        $request->validate([
            'account_status' => 'nullable|string|in:active,dormant,reactivated,escheat,closed',
            'status_log_id' => 'nullable|integer|exists:customer_status_logs,id',
            'pending_status' => 'nullable|string|in:active,dormant,reactivated,escheat,closed',
            'pending_status_date' => 'nullable|date',
            'pending_acct_id' => 'nullable|integer|exists:customer_accounts,id',
        ]);

        $pendingStatus = $request->input('pending_status');
        $pendingStatusDate = $request->input('pending_status_date');
        $pendingAcctId = $request->input('pending_acct_id') ? (int) $request->input('pending_acct_id') : null;

        // Resolve account_status: explicit value takes precedence, fall back to pending_status
        $accountStatus = $request->input('account_status') ?? $pendingStatus;
        $statusLogId = $request->input('status_log_id') ? (int) $request->input('status_log_id') : null;

        if (! $accountStatus) {
            return response()->json(['message' => 'account_status or pending_status is required.'], 422);
        }

        // Auto-resolve the log for legacy callers that pass account_status without a log id
        if (! $statusLogId && ! $pendingStatus) {
            $statusLogId = \App\Models\CustomerStatusLog::where('customer_id', $customer->id)
                ->where('status', $accountStatus)
                ->latest()
                ->value('id');
        }

        try {
            DB::beginTransaction();

            // Atomically apply the pending status change before uploading documents
            if ($pendingStatus && ! $statusLogId) {
                if ($pendingAcctId) {
                    $account = $customer->accounts()->findOrFail($pendingAcctId);

                    if ($account->status === 'escheat') {
                        DB::rollBack();

                        return response()->json(['message' => 'Escheat accounts cannot have their status changed.'], 422);
                    }

                    $previousStatus = $account->status;
                    $account->update([
                        'status' => $pendingStatus,
                        'status_date' => $pendingStatusDate ?: null,
                    ]);
                } else {
                    if ($customer->status === 'escheat') {
                        DB::rollBack();

                        return response()->json(['message' => 'Escheat accounts cannot have their status changed.'], 422);
                    }

                    $previousStatus = $customer->status;
                    $customer->update([
                        'status' => $pendingStatus,
                        'status_date' => $pendingStatusDate ?: null,
                        'status_updated_at' => now(),
                    ]);
                }

                $statusLog = \App\Models\CustomerStatusLog::create([
                    'customer_id' => $customer->id,
                    'status' => $pendingStatus,
                    'previous_status' => $previousStatus,
                    'changed_by' => Auth::id(),
                ]);
                $statusLogId = $statusLog->id;
            }

            $this->storePairs($customer, $request, 'sigcardPairs', 'sigcard_front', 'sigcard_back', $accountStatus, $statusLogId);
            $this->storePairs($customer, $request, 'naisPairs', 'nais_front', 'nais_back', $accountStatus, $statusLogId);
            $this->storePairs($customer, $request, 'privacyPairs', 'privacy_front', 'privacy_back', $accountStatus, $statusLogId);

            foreach ($request->file('otherDocs', []) as $personIndex => $files) {
                $files = is_array($files) ? $files : [$files];
                foreach ($files as $file) {
                    $this->uploadDocument($customer, $file, 'other', (int) $personIndex, $accountStatus, $statusLogId);
                }
            }

            DB::commit();

            activity()
                ->causedBy(Auth::user())
                ->performedOn($customer)
                ->withProperties([
                    'action' => 'status_document_uploaded',
                    'full_name' => $customer->full_name,
                    'account_status' => $accountStatus,
                    'status_log_id' => $statusLogId,
                ])
                ->log('Status-change documents uploaded for customer');

            return response()->json([
                'message' => 'Status documents uploaded successfully.',
                'customer' => $customer->load(['documents', 'branch', 'uploader', 'holders', 'accounts', 'statusLogs.changedBy', 'statusLogs.documents']),
            ]);
        } catch (\Exception $e) {
            DB::rollBack();

            return response()->json([
                'message' => 'Unable to upload status documents. Please try again.',
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
        string $backType,
        ?string $accountStatus = null,
        ?int $statusLogId = null
    ): void {
        $pairs = $request->file($pairsKey, []);
        $pairsMeta = $request->input($pairsKey, []);

        foreach ($pairs as $index => $pair) {
            // ITF pairs include an explicit person_index from the frontend
            $personIndex = isset($pairsMeta[$index]['person_index'])
                ? (int) $pairsMeta[$index]['person_index']
                : $index + 1;

            if (! empty($pair['front'])) {
                $this->uploadDocument($customer, $pair['front'], $frontType, $personIndex, $accountStatus, $statusLogId);
            }

            if (! empty($pair['back'])) {
                $this->uploadDocument($customer, $pair['back'], $backType, $personIndex, $accountStatus, $statusLogId);
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
        int $personIndex,
        ?string $accountStatus = null,
        ?int $statusLogId = null
    ): CustomerDocument {
        // ── Optimise image ───────────────────────────────────────────────────
        $image = $this->imageManager()->read($file->getRealPath());

        // Scale down only — aspect ratio always preserved (object-fit: contain).
        $image->scaleDown(width: 800, height: 900);

        $encoded = $image->toJpeg(quality: 80);

        // ── Build organised path ─────────────────────────────────────────────
        $customer->loadMissing('branch');

        $directory = $this->buildDirectory($customer);
        if ($accountStatus) {
            $directory .= '/'.$this->sanitizeName(strtoupper($accountStatus));
        }
        $filename = $this->buildFilename($documentType, $personIndex, $file);
        $path = "{$directory}/{$filename}";

        Storage::disk('public')->put($path, (string) $encoded);

        $document = CustomerDocument::create([
            'customer_id' => $customer->id,
            'document_type' => $documentType,
            'person_index' => $personIndex,
            'account_status' => $accountStatus,
            'status_log_id' => $statusLogId,
            'is_current' => true,
            'file_path' => $path,
            'file_name' => $filename,
            'file_size' => strlen((string) $encoded),
            'mime_type' => 'image/jpeg',
        ]);

        // Auto-enroll sigcard_front images for thumbmark search.
        // Runs outside the DB transaction (called after commit in store/update).
        // Wrapped in try/catch so a Python failure never breaks document upload.
        if ($documentType === 'sigcard_front') {
            try {
                $this->thumbmarkService->enrollDocument($document);
            } catch (\Exception $e) {
                Log::warning('Auto-enroll thumbmark failed for doc #'.$document->id.': '.$e->getMessage());
            }
        }

        return $document;
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
        string $backType,
        ?string $accountStatus = null
    ): void {
        $existing = $customer->documents()
            ->whereIn('document_type', [$frontType, $backType])
            ->where('is_current', true)
            ->get();

        foreach ($existing as $doc) {
            $oldFileName = $doc->file_name;
            $pathInfo = pathinfo($doc->file_path);
            $dir = $pathInfo['dirname'] !== '.' ? $pathInfo['dirname'] : '';
            $versionedName = $pathInfo['filename'].'_v'.now()->format('Ymd_His').'.jpg';
            $versionedPath = ($dir ? $dir.'/' : '').$versionedName;

            if (Storage::disk('public')->exists($doc->file_path)) {
                Storage::disk('public')->move($doc->file_path, $versionedPath);
            }

            $doc->update([
                'is_current' => false,
                'file_path' => $versionedPath,
                'file_name' => $versionedName,
            ]);

            activity()
                ->causedBy(Auth::user())
                ->performedOn($customer)
                ->withProperties([
                    'action' => 'document_replaced',
                    'full_name' => $customer->full_name,
                    'document_type' => $doc->document_type,
                    'person_index' => $doc->person_index,
                    'replaced_file' => $oldFileName,
                    'versioned_file_path' => $versionedPath,
                ])
                ->log('Customer document replaced');
        }

        $this->storePairs($customer, $request, $pairsKey, $frontType, $backType, $accountStatus);
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
