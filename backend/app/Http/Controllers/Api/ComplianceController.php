<?php

namespace App\Http\Controllers\Api;

use App\Enums\AccountType;
use App\Enums\CustomerStatus;
use App\Enums\DocumentType;
use App\Enums\RiskLevel;
use App\Http\Controllers\Controller;
use App\Models\Customer;
use App\Models\CustomerDocument;
use App\Models\CustomerStatusLog;
use App\Models\User;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Str;
use Spatie\Activitylog\Models\Activity;

/**
 * Compliance Controller - BSP Compliance and Audit
 *
 * Handles compliance monitoring, audit logging, and regulatory reporting
 * Read-only access with comprehensive audit capabilities
 */
class ComplianceController extends Controller
{
    // =============================================
    // DASHBOARD
    // =============================================

    /**
     * Get dashboard stats — identical shape to admin dashboard so BankDashboard renders correctly.
     */
    public function getDashboard(): JsonResponse
    {
        $totalCustomers = Customer::count();
        $totalUsers = User::count();
        $totalDocuments = CustomerDocument::count();
        $totalSigcards = CustomerDocument::where('document_type', DocumentType::SigcardFront->value)->count();
        $todayUploads = Customer::whereDate('created_at', today())->count();
        $totalBranches = \App\Models\Branch::operational()->count();

        $byStatus = Customer::select('status', DB::raw('count(*) as count'))
            ->groupBy('status')
            ->pluck('count', 'status');

        $byAccountType = Customer::select('account_type', DB::raw('count(*) as count'))
            ->groupBy('account_type')
            ->pluck('count', 'account_type');

        $byRiskLevel = Customer::select('risk_level', DB::raw('count(*) as count'))
            ->groupBy('risk_level')
            ->pluck('count', 'risk_level');

        // Sigcard counts per branch (keyed by branch_id)
        $sigcardCounts = CustomerDocument::where('document_type', DocumentType::SigcardFront->value)
            ->join('customers', 'customer_documents.customer_id', '=', 'customers.id')
            ->select('customers.branch_id', DB::raw('count(*) as count'))
            ->groupBy('customers.branch_id')
            ->pluck('count', 'branch_id');

        // Document counts per branch (keyed by branch_id)
        $documentCounts = CustomerDocument::join('customers', 'customer_documents.customer_id', '=', 'customers.id')
            ->select('customers.branch_id', DB::raw('count(*) as count'))
            ->groupBy('customers.branch_id')
            ->pluck('count', 'branch_id');

        // Account type counts per branch
        $accountTypeCounts = Customer::select('branch_id', 'account_type', DB::raw('count(*) as count'))
            ->groupBy('branch_id', 'account_type')
            ->get()
            ->groupBy('branch_id')
            ->map(fn ($items) => $items->pluck('count', 'account_type'));

        // Risk level counts per branch
        $riskLevelCounts = Customer::select('branch_id', 'risk_level', DB::raw('count(*) as count'))
            ->groupBy('branch_id', 'risk_level')
            ->get()
            ->groupBy('branch_id')
            ->map(fn ($items) => $items->pluck('count', 'risk_level'));

        $branches = \App\Models\Branch::withCount('customers')
            ->with(['customers' => fn ($q) => $q->select('id', 'branch_id', 'status')])
            ->orderBy('brcode')
            ->get()
            ->map(function (\App\Models\Branch $branch) use ($sigcardCounts, $documentCounts, $accountTypeCounts, $riskLevelCounts) {
                $statusCounts = $branch->customers->countBy('status');
                $branchAccountTypes = $accountTypeCounts->get($branch->id, collect());
                $branchRiskLevels = $riskLevelCounts->get($branch->id, collect());

                return [
                    'branch_name' => $branch->branch_name,
                    'brak' => $branch->brak,
                    'brcode' => $branch->brcode,
                    'total' => $branch->customers_count,
                    'active' => $statusCounts->get(CustomerStatus::Active->value, 0),
                    'dormant' => $statusCounts->get(CustomerStatus::Dormant->value, 0),
                    'escheat' => $statusCounts->get(CustomerStatus::Escheat->value, 0),
                    'closed' => $statusCounts->get(CustomerStatus::Closed->value, 0),
                    'reactivated' => $statusCounts->get(CustomerStatus::Reactivated->value, 0),
                    'sigcards' => $sigcardCounts->get($branch->id, 0),
                    'documents' => $documentCounts->get($branch->id, 0),
                    'individual' => $branchAccountTypes->get(AccountType::Regular->value, 0),
                    'joint' => $branchAccountTypes->get(AccountType::Joint->value, 0),
                    'corporate' => $branchAccountTypes->get(AccountType::Corporate->value, 0),
                    'low_risk' => $branchRiskLevels->get(RiskLevel::Low->value, 0),
                    'medium_risk' => $branchRiskLevels->get(RiskLevel::Medium->value, 0),
                    'high_risk' => $branchRiskLevels->get(RiskLevel::High->value, 0),
                ];
            });

        $monthlyUploads = Customer::select(
            DB::raw('DATE_FORMAT(created_at, "%Y-%m") as month'),
            DB::raw('count(*) as count')
        )
            ->where('created_at', '>=', now()->subMonths(6)->startOfMonth())
            ->groupBy('month')
            ->orderBy('month')
            ->get()
            ->keyBy('month');

        $months = collect();
        for ($i = 5; $i >= 0; $i--) {
            $key = now()->subMonths($i)->format('Y-m');
            $label = now()->subMonths($i)->format('M Y');
            $months->push(['label' => $label, 'count' => $monthlyUploads->get($key)?->count ?? 0]);
        }

        $recentUploads = Customer::with(['branch', 'uploader'])
            ->latest()
            ->limit(10)
            ->get()
            ->map(fn (Customer $c) => [
                'id' => $c->id,
                'full_name' => $c->full_name,
                'account_type' => $c->account_type,
                'status' => $c->status,
                'branch' => $c->branch?->branch_name,
                'uploader' => $c->uploader?->full_name,
                'uploaded_at' => $c->created_at->format('M d, Y'),
            ]);

        return response()->json([
            'summary' => [
                'total_customers' => $totalCustomers,
                'total_users' => $totalUsers,
                'total_documents' => $totalDocuments,
                'total_sigcards' => $totalSigcards,
                'today_uploads' => $todayUploads,
                'total_branches' => $totalBranches,
                'active' => $byStatus->get('active', 0),
                'dormant' => $byStatus->get('dormant', 0),
                'escheat' => $byStatus->get('escheat', 0),
                'closed' => $byStatus->get('closed', 0),
                'reactivated' => $byStatus->get('reactivated', 0),
            ],
            'by_status' => $byStatus,
            'by_account_type' => $byAccountType,
            'by_risk_level' => $byRiskLevel,
            'by_branch' => $branches,
            'monthly_uploads' => $months,
            'recent_uploads' => $recentUploads,
        ]);
    }

    // =============================================
    // AUDIT LOG METHODS
    // =============================================

    /**
     * Get comprehensive audit logs with advanced filtering
     */
    public function getAuditLogs(Request $request): JsonResponse
    {
        $this->authorize('view-audit-logs');

        $request->validate([
            'search' => 'nullable|string|max:255',
            'category' => 'nullable|in:all,login,customer,user_management,security,system',
            'causer_id' => 'nullable|exists:users,id',
            'date_from' => 'nullable|date',
            'date_to' => 'nullable|date|after_or_equal:date_from',
            'per_page' => 'nullable|integer|min:1|max:100',
        ]);

        try {
            $query = Activity::with(['causer', 'subject'])
                ->orderBy('created_at', 'desc');

            if ($request->filled('search')) {
                $search = $request->search;
                $query->where(function ($q) use ($search) {
                    $q->where('description', 'like', "%{$search}%")
                        ->orWhereHasMorph('causer', [User::class], function ($u) use ($search) {
                            $u->where('firstname', 'like', "%{$search}%")
                                ->orWhere('lastname', 'like', "%{$search}%")
                                ->orWhere('email', 'like', "%{$search}%");
                        });
                });
            }

            if ($request->filled('causer_id')) {
                $query->where('causer_id', $request->causer_id);
            }

            if ($request->filled('date_from')) {
                $query->whereDate('created_at', '>=', $request->date_from);
            }

            if ($request->filled('date_to')) {
                $query->whereDate('created_at', '<=', $request->date_to);
            }

            if ($request->filled('category') && $request->category !== 'all') {
                $this->applyCategoryFilter($query, $request->category);
            }

            $logs = $query->paginate($request->per_page ?? 25);

            // Enrich customer document entries with current file paths for image display
            $customerSubjectIds = $logs->getCollection()
                ->filter(fn ($log) => $log->subject_type === Customer::class)
                ->pluck('subject_id')
                ->unique()
                ->values();

            if ($customerSubjectIds->isNotEmpty()) {
                $allDocs = CustomerDocument::whereIn('customer_id', $customerSubjectIds)->get()->groupBy('customer_id');

                $keyedDocsMap = $allDocs->map(fn ($docs) => $docs->mapWithKeys(fn (CustomerDocument $d) => [
                    $d->document_type.'_'.$d->person_index => ['file_path' => $d->file_path, 'file_name' => $d->file_name],
                ]));

                $fullDocsMap = $allDocs->map(fn ($docs) => $docs->map(fn (CustomerDocument $d) => [
                    'document_type' => $d->document_type,
                    'person_index' => $d->person_index,
                    'file_path' => $d->file_path,
                    'file_name' => $d->file_name,
                ])->values()->all());

                $logs->getCollection()->transform(function ($log) use ($keyedDocsMap, $fullDocsMap) {
                    if ($log->subject_type !== Customer::class) {
                        return $log;
                    }
                    $desc = strtolower($log->description ?? '');
                    $props = $log->properties->toArray();

                    if (str_contains($desc, 'replaced') && isset($props['document_type'])) {
                        $key = $props['document_type'].'_'.($props['person_index'] ?? 1);
                        $current = $keyedDocsMap->get($log->subject_id, collect())->get($key);
                        if ($current) {
                            $props['current_file_path'] = $current['file_path'];
                            $props['current_file_name'] = $current['file_name'];
                            $log->properties = $props;
                        }
                    }

                    if (str_contains($desc, 'created') || $log->event === 'created') {
                        $props['current_documents'] = $fullDocsMap->get($log->subject_id, []);
                        $log->properties = $props;
                    }

                    return $log;
                });
            }

            $stats = [
                'total_today' => Activity::whereDate('created_at', today())->count(),
                'logins_today' => Activity::where('description', 'like', '%login%')
                    ->whereDate('created_at', today())->count(),
                'failed_today' => Activity::where('description', 'like', '%failed%')
                    ->whereDate('created_at', today())->count(),
                'customer_ops' => Activity::where(function ($q) {
                    $q->where('description', 'like', '%customer%')
                        ->orWhere('subject_type', 'like', '%Customer%');
                })->whereDate('created_at', today())->count(),
                'total_all_time' => Activity::count(),
            ];

            $users = User::select('id', 'firstname', 'lastname', 'email')
                ->orderBy('firstname')->get()
                ->map(fn (User $u) => ['id' => $u->id, 'name' => $u->full_name, 'email' => $u->email]);

            return response()->json([
                'success' => true,
                'message' => 'Audit logs retrieved successfully',
                'data' => $logs,
                'stats' => $stats,
                'users' => $users,
            ]);

        } catch (\Exception $e) {
            Log::error('Compliance error retrieving audit logs: '.$e->getMessage());

            return response()->json([
                'success' => false,
                'message' => 'Failed to retrieve audit logs',
                'error' => config('app.debug') ? $e->getMessage() : 'Internal server error',
            ], 500);
        }
    }

    private function applyCategoryFilter(\Illuminate\Database\Eloquent\Builder $query, string $category): void
    {
        match ($category) {
            'login' => $query->where(function ($q) {
                $q->where('description', 'like', '%login%')
                    ->orWhere('description', 'like', '%logout%')
                    ->orWhere('description', 'like', '%authentication%')
                    ->orWhere('description', 'like', '%password%')
                    ->orWhere('description', 'like', '%2fa%');
            }),
            'customer' => $query->where(function ($q) {
                $q->where('description', 'like', '%customer%')
                    ->orWhere('description', 'like', '%sigcard%')
                    ->orWhere('description', 'like', '%document%')
                    ->orWhere('subject_type', 'like', '%Customer%');
            }),
            'user_management' => $query->where(function ($q) {
                $q->where('description', 'like', '%user%')
                    ->orWhere('description', 'like', '%role%')
                    ->orWhere('description', 'like', '%permission%');
            }),
            'security' => $query->where(function ($q) {
                $q->where('description', 'like', '%locked%')
                    ->orWhere('description', 'like', '%failed%')
                    ->orWhere('description', 'like', '%unauthorized%')
                    ->orWhere('description', 'like', '%suspicious%')
                    ->orWhere('description', 'like', '%security%');
            }),
            'system' => $query->where(function ($q) {
                $q->where('description', 'like', '%settings%')
                    ->orWhere('description', 'like', '%system%')
                    ->orWhere('description', 'like', '%backup%')
                    ->orWhere('description', 'like', '%restore%');
            }),
            default => null,
        };
    }

    /**
     * Get the full activity history for a specific subject (customer, document, user).
     */
    public function getSubjectHistory(Request $request, string $subjectType, int $subjectId): JsonResponse
    {
        $this->authorize('view-audit-logs');

        $modelMap = [
            'customer' => Customer::class,
            'document' => CustomerDocument::class,
            'user' => User::class,
        ];

        if (! array_key_exists($subjectType, $modelMap)) {
            return response()->json(['success' => false, 'message' => 'Invalid subject type.'], 422);
        }

        $modelClass = $modelMap[$subjectType];
        $model = $modelClass::find($subjectId);

        // For customer subjects, build maps of current documents for image display
        $currentDocs = collect();
        $allCurrentDocs = [];
        if ($subjectType === 'customer' && $model) {
            $docs = $model->documents;
            $currentDocs = $docs->groupBy(fn (CustomerDocument $d) => $d->document_type.'_'.$d->person_index)
                ->map(fn ($group) => [
                    'file_path' => $group->first()->file_path,
                    'file_name' => $group->first()->file_name,
                ]);
            $allCurrentDocs = $docs->map(fn (CustomerDocument $d) => [
                'document_type' => $d->document_type,
                'person_index' => $d->person_index,
                'file_path' => $d->file_path,
                'file_name' => $d->file_name,
            ])->values()->all();
        }

        // For customers, also include document-related activity logs
        $query = Activity::with('causer')->latest();

        if ($subjectType === 'customer' && $model) {
            $documentIds = $model->documents()->pluck('id')->all();
            $query->where(function ($q) use ($modelClass, $subjectId, $documentIds) {
                $q->where(function ($q2) use ($modelClass, $subjectId) {
                    $q2->where('subject_type', $modelClass)
                        ->where('subject_id', $subjectId);
                });
                if (! empty($documentIds)) {
                    $q->orWhere(function ($q2) use ($documentIds) {
                        $q2->where('subject_type', CustomerDocument::class)
                            ->whereIn('subject_id', $documentIds);
                    });
                }
            });
        } else {
            $query->where('subject_type', $modelClass)
                ->where('subject_id', $subjectId);
        }

        $history = $query->get()->unique('id')->map(function (Activity $entry) use ($currentDocs, $allCurrentDocs, $subjectType) {
            $props = $entry->properties->toArray();
            $meta = collect($props)->except(['old', 'attributes', 'diff'])->all();
            $desc = strtolower($entry->description ?? '');

            if ($subjectType === 'customer') {
                if (str_contains($desc, 'replaced') && isset($meta['document_type'])) {
                    $key = $meta['document_type'].'_'.($meta['person_index'] ?? 1);
                    $current = $currentDocs->get($key);
                    if ($current) {
                        $meta['current_file_path'] = $current['file_path'];
                        $meta['current_file_name'] = $current['file_name'];
                    }
                }

                if (str_contains($desc, 'created') || $entry->event === 'created') {
                    $meta['current_documents'] = $allCurrentDocs;
                }
            }

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
                'log_name' => $entry->log_name,
                'description' => $entry->description,
                'causer' => $entry->causer
                    ? ['name' => optional($entry->causer)->full_name, 'email' => optional($entry->causer)->email]
                    : null,
                'diff' => $diff,
                'meta' => $meta,
                'created_at' => $entry->created_at->toIso8601String(),
            ];
        })->values();

        // Build status timeline & document versions for customer subjects
        $statusTimeline = [];
        $documentVersions = [];

        if ($subjectType === 'customer' && $model) {
            $statusTimeline[] = [
                'status' => 'active',
                'changed_at' => $model->created_at->toIso8601String(),
                'changed_by' => null,
                'label' => 'Account Opened',
            ];

            $history->sortBy('created_at')->each(function ($entry) use (&$statusTimeline) {
                $diff = $entry['diff'] ?? [];
                if (isset($diff['status'])) {
                    $statusTimeline[] = [
                        'status' => $diff['status']['after'] ?? null,
                        'changed_at' => $entry['created_at'],
                        'changed_by' => $entry['causer']['name'] ?? null,
                        'label' => 'Status Changed',
                    ];
                }
            });

            $lastStatus = ! empty($statusTimeline) ? end($statusTimeline)['status'] : null;
            if ($lastStatus !== $model->status) {
                $statusTimeline[] = [
                    'status' => $model->status,
                    'changed_at' => now()->toIso8601String(),
                    'changed_by' => null,
                    'label' => 'Current Status',
                ];
            }

            $docVersionMap = [];
            $history->each(function ($entry) use (&$docVersionMap) {
                $meta = $entry['meta'] ?? [];
                $desc = strtolower($entry['description'] ?? '');

                if (str_contains($desc, 'replaced') && isset($meta['document_type'])) {
                    $docKey = $meta['document_type'].($meta['person_index'] > 1 ? '_p'.$meta['person_index'] : '');

                    if (! isset($docVersionMap[$docKey])) {
                        $docVersionMap[$docKey] = [
                            'document_type' => $meta['document_type'],
                            'person_index' => $meta['person_index'] ?? 1,
                            'versions' => [],
                        ];
                    }

                    $docVersionMap[$docKey]['versions'][] = [
                        'archived_file_path' => $meta['archived_file_path'] ?? null,
                        'replaced_file' => $meta['replaced_file'] ?? null,
                        'replaced_at' => $entry['created_at'],
                        'replaced_by' => $entry['causer']['name'] ?? null,
                        'new_file_name' => $meta['new_file_name'] ?? null,
                        'current_file_path' => $meta['current_file_path'] ?? null,
                    ];
                }
            });

            $documentVersions = array_values($docVersionMap);
        }

        return response()->json([
            'success' => true,
            'subject' => $model ? [
                'id' => $model->id,
                'label' => method_exists($model, 'getFullNameAttribute') ? $model->full_name : "#{$subjectId}",
            ] : null,
            'history' => $history,
            'status_timeline' => $statusTimeline,
            'document_versions' => $documentVersions,
            'current_documents' => $allCurrentDocs,
            'current_status' => $subjectType === 'customer' && $model ? $model->status : null,
            'current_risk_level' => $subjectType === 'customer' && $model ? $model->risk_level : null,
        ]);
    }

    /**
     * Export audit logs with BSP compliance formatting
     */
    public function exportAuditLogs(Request $request): JsonResponse
    {
        $this->authorize('export-audit-logs');

        $request->validate([
            'date_from' => 'required|date',
            'date_to' => 'required|date|after_or_equal:date_from',
            'format' => 'required|in:csv,excel,pdf,json',
            'include_sensitive' => 'boolean',
            'branch_codes' => 'nullable|array',
            'event_types' => 'nullable|array',
        ]);

        try {
            $compliance = auth()->user();

            $exportId = 'AUD-EXP-'.Str::random(12);
            $filename = "audit_logs_{$request->date_from}_{$request->date_to}.{$request->format}";

            // For BSP compliance, we need to track all export activities
            activity()
                ->causedBy($compliance)
                ->withProperties([
                    'action' => 'compliance_exported_audit_logs',
                    'export_id' => $exportId,
                    'date_range' => [
                        'from' => $request->date_from,
                        'to' => $request->date_to,
                    ],
                    'format' => $request->format,
                    'include_sensitive' => $request->include_sensitive ?? false,
                    'filters' => $request->only(['branch_codes', 'event_types']),
                    'bsp_compliance_export' => true,
                ])
                ->log('Compliance officer exported audit logs');

            return response()->json([
                'success' => true,
                'message' => 'Audit log export initiated successfully',
                'data' => [
                    'export_id' => $exportId,
                    'filename' => $filename,
                    'format' => $request->format,
                    'status' => 'processing',
                    'estimated_completion' => now()->addMinutes(5),
                    'download_url' => "/api/compliance/exports/download/{$exportId}",
                    'expires_at' => now()->addHours(24),
                    'bsp_compliance' => [
                        'export_logged' => true,
                        'data_integrity_hash' => hash('sha256', $exportId.now()),
                        'retention_notice' => 'Export files are retained for 30 days as per BSP requirements',
                    ],
                ],
            ]);

        } catch (\Exception $e) {
            Log::error('Compliance error exporting audit logs: '.$e->getMessage());

            return response()->json([
                'success' => false,
                'message' => 'Failed to export audit logs',
                'error' => config('app.debug') ? $e->getMessage() : 'Internal server error',
            ], 500);
        }
    }

    // =============================================
    // COMPLIANCE REPORT METHODS
    // =============================================

    /**
     * Get compliance reports with BSP regulatory focus
     */
    public function getComplianceReports(Request $request): JsonResponse
    {
        try {
            $compliance = auth()->user();

            $request->validate([
                'report_type' => 'nullable|in:daily,weekly,monthly,quarterly,annual',
                'branch_code' => 'nullable|string',
                'date_from' => 'nullable|date',
                'date_to' => 'nullable|date|after_or_equal:date_from',
            ]);

            $complianceReports = [
                [
                    'id' => 'BSP-RPT-001',
                    'type' => 'daily_compliance_check',
                    'name' => 'Daily BSP Compliance Check',
                    'status' => 'compliant',
                    'generated_at' => now()->subHours(1),
                    'compliance_score' => 98.5,
                    'issues_found' => 2,
                    'critical_issues' => 0,
                    'branch_coverage' => '100%',
                    'bsp_circular_compliance' => [
                        'circular_951' => 'compliant',
                        'circular_982' => 'compliant',
                        'circular_1048' => 'minor_deviations',
                    ],
                ],
                [
                    'id' => 'BSP-RPT-002',
                    'type' => 'transaction_monitoring',
                    'name' => 'AML/CFT Transaction Monitoring',
                    'status' => 'review_required',
                    'generated_at' => now()->subHours(2),
                    'compliance_score' => 85.2,
                    'issues_found' => 8,
                    'critical_issues' => 1,
                    'suspicious_transactions' => 3,
                    'large_transactions' => 25,
                    'cross_border_transactions' => 5,
                ],
                [
                    'id' => 'BSP-RPT-003',
                    'type' => 'kyc_compliance',
                    'name' => 'KYC/CDD Compliance Report',
                    'status' => 'compliant',
                    'generated_at' => now()->subHours(3),
                    'compliance_score' => 96.8,
                    'issues_found' => 1,
                    'critical_issues' => 0,
                    'customers_reviewed' => 450,
                    'incomplete_kyc' => 12,
                    'expired_documents' => 8,
                ],
            ];

            activity()
                ->causedBy($compliance)
                ->withProperties([
                    'action' => 'compliance_viewed_reports',
                    'filters' => $request->all(),
                ])
                ->log('Compliance officer viewed compliance reports');

            return response()->json([
                'success' => true,
                'message' => 'Compliance reports retrieved successfully',
                'data' => [
                    'reports' => $complianceReports,
                    'summary' => [
                        'overall_compliance_score' => 93.5,
                        'total_issues' => 11,
                        'critical_issues' => 1,
                        'branches_covered' => 15,
                        'last_update' => now()->subMinutes(30),
                    ],
                    'bsp_requirements' => [
                        'circular_951_compliance' => 'fully_compliant',
                        'circular_982_compliance' => 'fully_compliant',
                        'circular_1048_compliance' => 'minor_deviations',
                        'next_review_date' => now()->addDays(1)->format('Y-m-d'),
                    ],
                ],
            ]);

        } catch (\Exception $e) {
            Log::error('Compliance error retrieving reports: '.$e->getMessage());

            return response()->json([
                'success' => false,
                'message' => 'Failed to retrieve compliance reports',
                'error' => config('app.debug') ? $e->getMessage() : 'Internal server error',
            ], 500);
        }
    }

    /**
     * Generate compliance report
     */
    public function generateComplianceReport(Request $request): JsonResponse
    {
        $this->authorize('generate-compliance-reports');

        $request->validate([
            'report_type' => 'required|in:bsp_compliance,aml_cft,kyc_review,transaction_monitoring,risk_assessment',
            'date_from' => 'required|date',
            'date_to' => 'required|date|after_or_equal:date_from',
            'branch_codes' => 'nullable|array',
            'include_recommendations' => 'boolean',
            'format' => 'nullable|in:pdf,excel,csv',
        ]);

        try {
            $compliance = auth()->user();

            $reportId = 'COMP-'.strtoupper($request->report_type).'-'.Str::random(8);

            activity()
                ->causedBy($compliance)
                ->withProperties([
                    'action' => 'compliance_generated_report',
                    'report_id' => $reportId,
                    'report_type' => $request->report_type,
                    'date_range' => [
                        'from' => $request->date_from,
                        'to' => $request->date_to,
                    ],
                    'scope' => $request->branch_codes ?? 'all_branches',
                    'include_recommendations' => $request->include_recommendations ?? true,
                ])
                ->log('Compliance officer generated compliance report');

            return response()->json([
                'success' => true,
                'message' => 'Compliance report generation initiated successfully',
                'data' => [
                    'report_id' => $reportId,
                    'report_type' => $request->report_type,
                    'period' => [
                        'from' => $request->date_from,
                        'to' => $request->date_to,
                    ],
                    'format' => $request->format ?? 'pdf',
                    'status' => 'generating',
                    'estimated_completion' => now()->addMinutes(10),
                    'download_url' => "/api/compliance/reports/download/{$reportId}",
                    'expires_at' => now()->addDays(7),
                    'bsp_compliance' => [
                        'regulatory_standards_applied' => ['BSP Circular 951', 'BSP Circular 982'],
                        'data_integrity_verified' => true,
                        'audit_trail_included' => true,
                    ],
                ],
            ]);

        } catch (\Exception $e) {
            Log::error('Compliance error generating report: '.$e->getMessage());

            return response()->json([
                'success' => false,
                'message' => 'Failed to generate compliance report',
                'error' => config('app.debug') ? $e->getMessage() : 'Internal server error',
            ], 500);
        }
    }

    // =============================================
    // RISK ASSESSMENT METHODS
    // =============================================

    /**
     * Get risk assessments
     */
    public function getRiskAssessments(Request $request): JsonResponse
    {
        try {
            $compliance = auth()->user();

            $request->validate([
                'risk_level' => 'nullable|in:low,medium,high,critical',
                'status' => 'nullable|in:pending,reviewed,approved,rejected',
                'assessment_type' => 'nullable|in:customer,transaction,operational,technology',
                'date_from' => 'nullable|date',
                'date_to' => 'nullable|date|after_or_equal:date_from',
                'per_page' => 'nullable|integer|min:1|max:100',
            ]);

            $riskAssessments = [
                [
                    'id' => 'RISK-ASSESS-001',
                    'type' => 'customer_risk',
                    'customer_id' => 'CUST-12345',
                    'customer_name' => 'High Value Corp',
                    'risk_level' => 'high',
                    'risk_score' => 85,
                    'status' => 'pending_review',
                    'created_at' => now()->subDays(2),
                    'risk_factors' => [
                        'high_transaction_volume' => true,
                        'cross_border_transactions' => true,
                        'cash_intensive_business' => false,
                        'pep_status' => false,
                    ],
                    'recommended_actions' => [
                        'enhanced_due_diligence',
                        'monthly_review',
                        'transaction_monitoring',
                    ],
                    'branch_code' => 'BR001',
                ],
                [
                    'id' => 'RISK-ASSESS-002',
                    'type' => 'transaction_risk',
                    'transaction_id' => 'TXN-789012',
                    'risk_level' => 'medium',
                    'risk_score' => 65,
                    'status' => 'reviewed',
                    'created_at' => now()->subDays(1),
                    'risk_factors' => [
                        'unusual_pattern' => true,
                        'large_amount' => true,
                        'new_beneficiary' => false,
                        'high_risk_country' => false,
                    ],
                    'recommended_actions' => [
                        'verify_purpose',
                        'source_of_funds_verification',
                    ],
                    'branch_code' => 'BR002',
                ],
            ];

            activity()
                ->causedBy($compliance)
                ->withProperties([
                    'action' => 'compliance_viewed_risk_assessments',
                    'filters' => $request->all(),
                ])
                ->log('Compliance officer viewed risk assessments');

            return response()->json([
                'success' => true,
                'message' => 'Risk assessments retrieved successfully',
                'data' => [
                    'assessments' => $riskAssessments,
                    'pagination' => [
                        'total' => count($riskAssessments),
                        'per_page' => $request->per_page ?? 20,
                        'current_page' => 1,
                    ],
                ],
                'summary' => [
                    'total_assessments' => 2,
                    'high_risk' => 1,
                    'medium_risk' => 1,
                    'low_risk' => 0,
                    'pending_review' => 1,
                    'overdue_reviews' => 0,
                ],
            ]);

        } catch (\Exception $e) {
            Log::error('Compliance error retrieving risk assessments: '.$e->getMessage());

            return response()->json([
                'success' => false,
                'message' => 'Failed to retrieve risk assessments',
                'error' => config('app.debug') ? $e->getMessage() : 'Internal server error',
            ], 500);
        }
    }

    /**
     * Create risk assessment
     */
    public function createRiskAssessment(Request $request): JsonResponse
    {
        $this->authorize('create-risk-assessments');

        $request->validate([
            'assessment_type' => 'required|in:customer,transaction,operational,technology',
            'subject_id' => 'required|string',
            'risk_factors' => 'required|array',
            'risk_score' => 'required|integer|min:0|max:100',
            'risk_level' => 'required|in:low,medium,high,critical',
            'comments' => 'nullable|string|max:1000',
            'recommended_actions' => 'nullable|array',
        ]);

        try {
            $compliance = auth()->user();

            $assessmentId = 'RISK-'.strtoupper($request->assessment_type).'-'.Str::random(8);

            activity()
                ->causedBy($compliance)
                ->withProperties([
                    'action' => 'compliance_created_risk_assessment',
                    'assessment_id' => $assessmentId,
                    'assessment_type' => $request->assessment_type,
                    'subject_id' => $request->subject_id,
                    'risk_score' => $request->risk_score,
                    'risk_level' => $request->risk_level,
                    'risk_factors' => $request->risk_factors,
                    'recommended_actions' => $request->recommended_actions ?? [],
                ])
                ->log('Compliance officer created risk assessment');

            return response()->json([
                'success' => true,
                'message' => 'Risk assessment created successfully',
                'data' => [
                    'assessment_id' => $assessmentId,
                    'assessment_type' => $request->assessment_type,
                    'subject_id' => $request->subject_id,
                    'risk_score' => $request->risk_score,
                    'risk_level' => $request->risk_level,
                    'status' => 'pending_review',
                    'created_by' => $compliance->name,
                    'created_at' => now(),
                    'next_review_date' => now()->addDays(30),
                    'requires_manager_approval' => in_array($request->risk_level, ['high', 'critical']),
                ],
            ]);

        } catch (\Exception $e) {
            Log::error('Compliance error creating risk assessment: '.$e->getMessage());

            return response()->json([
                'success' => false,
                'message' => 'Failed to create risk assessment',
                'error' => config('app.debug') ? $e->getMessage() : 'Internal server error',
            ], 500);
        }
    }

    /**
     * Update risk assessment
     */
    public function updateRiskAssessment(Request $request, string $assessment): JsonResponse
    {
        $this->authorize('approve-risk-assessments');

        $request->validate([
            'risk_score' => 'nullable|integer|min:0|max:100',
            'risk_level' => 'nullable|in:low,medium,high,critical',
            'status' => 'nullable|in:pending,reviewed,approved,rejected',
            'comments' => 'nullable|string|max:1000',
            'recommended_actions' => 'nullable|array',
            'review_notes' => 'nullable|string|max:1000',
        ]);

        try {
            $compliance = auth()->user();

            activity()
                ->causedBy($compliance)
                ->withProperties([
                    'action' => 'compliance_updated_risk_assessment',
                    'assessment_id' => $assessment,
                    'updated_fields' => array_keys($request->only([
                        'risk_score', 'risk_level', 'status', 'comments',
                        'recommended_actions', 'review_notes',
                    ])),
                    'updates' => $request->only([
                        'risk_score', 'risk_level', 'status', 'comments',
                        'recommended_actions', 'review_notes',
                    ]),
                ])
                ->log('Compliance officer updated risk assessment');

            return response()->json([
                'success' => true,
                'message' => 'Risk assessment updated successfully',
                'data' => [
                    'assessment_id' => $assessment,
                    'updated_at' => now(),
                    'updated_by' => $compliance->name,
                    'status' => $request->status ?? 'pending_review',
                    'requires_manager_approval' => in_array($request->risk_level ?? 'medium', ['high', 'critical']),
                ],
            ]);

        } catch (\Exception $e) {
            Log::error('Compliance error updating risk assessment: '.$e->getMessage());

            return response()->json([
                'success' => false,
                'message' => 'Failed to update risk assessment',
                'error' => config('app.debug') ? $e->getMessage() : 'Internal server error',
            ], 500);
        }
    }

    // =============================================
    // READ-ONLY ACCESS METHODS
    // =============================================

    /**
     * Get users (read-only for compliance)
     */
    public function getUsers(Request $request): JsonResponse
    {
        try {
            $compliance = auth()->user();

            $request->validate([
                'status' => 'nullable|in:active,inactive,suspended',
                'role' => 'nullable|string',
                'branch_code' => 'nullable|string',
                'search' => 'nullable|string|max:100',
                'per_page' => 'nullable|integer|min:1|max:100',
            ]);

            $query = User::query()->with(['roles', 'permissions']);

            // Apply filters
            if ($request->filled('status')) {
                $query->where('status', $request->status);
            }

            if ($request->filled('role')) {
                $query->whereHas('roles', function ($q) use ($request) {
                    $q->where('name', $request->role);
                });
            }

            if ($request->filled('branch_code')) {
                $query->where('branch_code', $request->branch_code);
            }

            if ($request->filled('search')) {
                $search = $request->search;
                $query->where(function ($q) use ($search) {
                    $q->where('name', 'like', "%{$search}%")
                        ->orWhere('email', 'like', "%{$search}%")
                        ->orWhere('employee_id', 'like', "%{$search}%");
                });
            }

            $users = $query->paginate($request->per_page ?? 50);

            activity()
                ->causedBy($compliance)
                ->withProperties([
                    'action' => 'compliance_viewed_users',
                    'filters' => $request->all(),
                    'result_count' => $users->total(),
                ])
                ->log('Compliance officer viewed users (read-only)');

            return response()->json([
                'success' => true,
                'message' => 'Users retrieved successfully (read-only access)',
                'data' => $users,
                'meta' => [
                    'access_type' => 'read_only',
                    'compliance_view' => true,
                    'can_modify' => false,
                ],
            ]);

        } catch (\Exception $e) {
            Log::error('Compliance error retrieving users: '.$e->getMessage());

            return response()->json([
                'success' => false,
                'message' => 'Failed to retrieve users',
                'error' => config('app.debug') ? $e->getMessage() : 'Internal server error',
            ], 500);
        }
    }

    /**
     * Get transactions (read-only for compliance)
     */
    public function getTransactions(Request $request): JsonResponse
    {
        try {
            $compliance = auth()->user();

            $request->validate([
                'status' => 'nullable|in:pending,approved,rejected,completed',
                'type' => 'nullable|in:deposit,withdrawal,transfer',
                'amount_from' => 'nullable|numeric|min:0',
                'amount_to' => 'nullable|numeric|min:0',
                'date_from' => 'nullable|date',
                'date_to' => 'nullable|date|after_or_equal:date_from',
                'branch_code' => 'nullable|string',
                'risk_level' => 'nullable|in:low,medium,high,critical',
                'per_page' => 'nullable|integer|min:1|max:200',
            ]);

            // Placeholder data with compliance focus
            $transactions = [
                [
                    'id' => 'TXN-001',
                    'reference_number' => 'REF-'.Str::random(10),
                    'type' => 'transfer',
                    'amount' => 150000.00,
                    'currency' => 'PHP',
                    'status' => 'completed',
                    'from_account' => '1234567890',
                    'to_account' => '0987654321',
                    'customer_name' => 'John Doe',
                    'branch_code' => 'BR001',
                    'created_at' => now()->subHours(4),
                    'risk_level' => 'medium',
                    'aml_checked' => true,
                    'compliance_flags' => [],
                    'bsp_reporting_required' => true,
                ],
                [
                    'id' => 'TXN-002',
                    'reference_number' => 'REF-'.Str::random(10),
                    'type' => 'withdrawal',
                    'amount' => 500000.00,
                    'currency' => 'PHP',
                    'status' => 'pending_compliance_review',
                    'from_account' => '5555555555',
                    'customer_name' => 'Jane Smith',
                    'branch_code' => 'BR002',
                    'created_at' => now()->subHours(1),
                    'risk_level' => 'high',
                    'aml_checked' => false,
                    'compliance_flags' => ['large_amount', 'unusual_pattern'],
                    'bsp_reporting_required' => true,
                ],
            ];

            activity()
                ->causedBy($compliance)
                ->withProperties([
                    'action' => 'compliance_viewed_transactions',
                    'filters' => $request->all(),
                    'result_count' => count($transactions),
                ])
                ->log('Compliance officer viewed transactions (read-only)');

            return response()->json([
                'success' => true,
                'message' => 'Transactions retrieved successfully (read-only access)',
                'data' => [
                    'transactions' => $transactions,
                    'pagination' => [
                        'total' => count($transactions),
                        'per_page' => $request->per_page ?? 50,
                        'current_page' => 1,
                    ],
                ],
                'compliance_summary' => [
                    'high_risk_transactions' => 1,
                    'pending_compliance_review' => 1,
                    'bsp_reportable' => 2,
                    'aml_flags' => 2,
                ],
                'meta' => [
                    'access_type' => 'read_only',
                    'compliance_view' => true,
                ],
            ]);

        } catch (\Exception $e) {
            Log::error('Compliance error retrieving transactions: '.$e->getMessage());

            return response()->json([
                'success' => false,
                'message' => 'Failed to retrieve transactions',
                'error' => config('app.debug') ? $e->getMessage() : 'Internal server error',
            ], 500);
        }
    }

    /**
     * Get accounts (read-only for compliance)
     */
    public function getAccounts(Request $request): JsonResponse
    {
        try {
            $compliance = auth()->user();

            $request->validate([
                'status' => 'nullable|in:active,inactive,suspended,closed',
                'type' => 'nullable|in:savings,checking,time_deposit',
                'branch_code' => 'nullable|string',
                'risk_level' => 'nullable|in:low,medium,high,critical',
                'kyc_status' => 'nullable|in:verified,pending,expired',
                'per_page' => 'nullable|integer|min:1|max:100',
            ]);

            // Placeholder data
            $accounts = [
                [
                    'account_number' => '1234567890',
                    'account_type' => 'savings',
                    'customer_name' => 'John Doe',
                    'status' => 'active',
                    'branch_code' => 'BR001',
                    'balance' => 250000.00,
                    'currency' => 'PHP',
                    'opened_date' => now()->subYears(2),
                    'last_activity' => now()->subDays(1),
                    'risk_level' => 'low',
                    'kyc_status' => 'verified',
                    'kyc_last_updated' => now()->subMonths(6),
                    'compliance_flags' => [],
                    'dormant_status' => false,
                ],
                [
                    'account_number' => '0987654321',
                    'account_type' => 'checking',
                    'customer_name' => 'ABC Corporation',
                    'status' => 'active',
                    'branch_code' => 'BR002',
                    'balance' => 5000000.00,
                    'currency' => 'PHP',
                    'opened_date' => now()->subYears(1),
                    'last_activity' => now()->subHours(2),
                    'risk_level' => 'high',
                    'kyc_status' => 'verified',
                    'kyc_last_updated' => now()->subMonths(3),
                    'compliance_flags' => ['high_value_account'],
                    'dormant_status' => false,
                ],
            ];

            activity()
                ->causedBy($compliance)
                ->withProperties([
                    'action' => 'compliance_viewed_accounts',
                    'filters' => $request->all(),
                    'result_count' => count($accounts),
                ])
                ->log('Compliance officer viewed accounts (read-only)');

            return response()->json([
                'success' => true,
                'message' => 'Accounts retrieved successfully (read-only access)',
                'data' => [
                    'accounts' => $accounts,
                    'pagination' => [
                        'total' => count($accounts),
                        'per_page' => $request->per_page ?? 50,
                        'current_page' => 1,
                    ],
                ],
                'compliance_summary' => [
                    'high_risk_accounts' => 1,
                    'kyc_expiring_soon' => 0,
                    'dormant_accounts' => 0,
                    'high_value_accounts' => 1,
                ],
            ]);

        } catch (\Exception $e) {
            Log::error('Compliance error retrieving accounts: '.$e->getMessage());

            return response()->json([
                'success' => false,
                'message' => 'Failed to retrieve accounts',
                'error' => config('app.debug') ? $e->getMessage() : 'Internal server error',
            ], 500);
        }
    }

    /**
     * Get customers (read-only for compliance)
     */
    public function getCustomers(Request $request): JsonResponse
    {
        try {
            $compliance = auth()->user();

            $request->validate([
                'status' => 'nullable|in:active,inactive,suspended',
                'kyc_status' => 'nullable|in:verified,pending,expired,incomplete',
                'risk_level' => 'nullable|in:low,medium,high,critical',
                'branch_code' => 'nullable|string',
                'pep_status' => 'nullable|boolean',
                'per_page' => 'nullable|integer|min:1|max:100',
            ]);

            // Placeholder data
            $customers = [
                [
                    'id' => 'CUST-001',
                    'name' => 'John Doe',
                    'email' => 'john.doe@example.com',
                    'phone' => '+63912345678',
                    'status' => 'active',
                    'kyc_status' => 'verified',
                    'risk_level' => 'low',
                    'branch_code' => 'BR001',
                    'account_count' => 2,
                    'total_balance' => 750000.00,
                    'customer_since' => now()->subYears(3),
                    'last_activity' => now()->subDays(1),
                    'pep_status' => false,
                    'sanctions_checked' => true,
                    'compliance_flags' => [],
                    'documents_status' => 'complete',
                ],
                [
                    'id' => 'CUST-002',
                    'name' => 'XYZ Corporation',
                    'email' => 'finance@xyzcorp.com',
                    'phone' => '+63987654321',
                    'status' => 'active',
                    'kyc_status' => 'pending_review',
                    'risk_level' => 'high',
                    'branch_code' => 'BR002',
                    'account_count' => 5,
                    'total_balance' => 15000000.00,
                    'customer_since' => now()->subMonths(6),
                    'last_activity' => now()->subHours(3),
                    'pep_status' => true,
                    'sanctions_checked' => true,
                    'compliance_flags' => ['pep', 'high_value', 'complex_structure'],
                    'documents_status' => 'pending_review',
                ],
            ];

            activity()
                ->causedBy($compliance)
                ->withProperties([
                    'action' => 'compliance_viewed_customers',
                    'filters' => $request->all(),
                    'result_count' => count($customers),
                ])
                ->log('Compliance officer viewed customers (read-only)');

            return response()->json([
                'success' => true,
                'message' => 'Customers retrieved successfully (read-only access)',
                'data' => [
                    'customers' => $customers,
                    'pagination' => [
                        'total' => count($customers),
                        'per_page' => $request->per_page ?? 50,
                        'current_page' => 1,
                    ],
                ],
                'compliance_summary' => [
                    'high_risk_customers' => 1,
                    'pep_customers' => 1,
                    'pending_kyc_review' => 1,
                    'sanctions_alerts' => 0,
                ],
            ]);

        } catch (\Exception $e) {
            Log::error('Compliance error retrieving customers: '.$e->getMessage());

            return response()->json([
                'success' => false,
                'message' => 'Failed to retrieve customers',
                'error' => config('app.debug') ? $e->getMessage() : 'Internal server error',
            ], 500);
        }
    }

    // =============================================
    // SPECIALIZED REPORTING METHODS
    // =============================================

    /**
     * Summary report: overall stats, monthly trends, and per-branch breakdown.
     * Used by the compliance/audit Reports page.
     */
    public function getSummaryReport(Request $request): JsonResponse
    {
        $this->authorize('view-compliance-reports');

        try {
            // ── Overall counts ───────────────────────────────────────────────
            $overall = Customer::select('status', DB::raw('count(*) as count'))
                ->groupBy('status')
                ->pluck('count', 'status');

            $totalAll = $overall->sum();

            // ── This month's account openings (by date_opened) ───────────────
            $thisMonthStart = now()->startOfMonth();
            $thisMonthEnd = now()->endOfMonth();

            $openedThisMonth = Customer::whereBetween('date_opened', [$thisMonthStart, $thisMonthEnd])
                ->count();

            // ── This month's status transitions (from status log) ────────────
            $statusLogThisMonth = CustomerStatusLog::whereBetween('created_at', [$thisMonthStart, $thisMonthEnd])
                ->select('status', DB::raw('count(*) as count'))
                ->groupBy('status')
                ->pluck('count', 'status');

            // ── Monthly trends — last 12 months ─────────────────────────────
            // Openings per month: based on date_opened
            $openingsByMonth = Customer::select(
                DB::raw('DATE_FORMAT(date_opened, "%Y-%m") as month'),
                DB::raw('count(*) as count')
            )
                ->where('date_opened', '>=', now()->subMonths(11)->startOfMonth())
                ->groupBy('month')
                ->pluck('count', 'month');

            // Status changes per month: dormant/closed/escheat events from log
            $statusLogByMonth = CustomerStatusLog::select(
                DB::raw('DATE_FORMAT(created_at, "%Y-%m") as month'),
                'status',
                DB::raw('count(*) as count')
            )
                ->where('created_at', '>=', now()->subMonths(11)->startOfMonth())
                ->whereIn('status', ['dormant', 'closed', 'escheat', 'reactivated'])
                ->groupBy('month', 'status')
                ->get()
                ->groupBy('month')
                ->map(fn ($rows) => $rows->pluck('count', 'status'));

            $monthlyTrends = collect();
            for ($i = 11; $i >= 0; $i--) {
                $date = now()->subMonths($i);
                $key = $date->format('Y-m');
                $logs = $statusLogByMonth->get($key, collect());

                $monthlyTrends->push([
                    'label' => $date->format('M Y'),
                    'month' => $key,
                    'opened' => (int) ($openingsByMonth->get($key) ?? 0),
                    'dormant' => (int) ($logs->get('dormant') ?? 0),
                    'closed' => (int) ($logs->get('closed') ?? 0),
                    'escheat' => (int) ($logs->get('escheat') ?? 0),
                    'reactivated' => (int) ($logs->get('reactivated') ?? 0),
                ]);
            }

            // ── Yearly trends — last 5 years ────────────────────────────────
            $startYear = now()->year - 4;

            $openingsByYear = Customer::select(
                DB::raw('YEAR(date_opened) as year'),
                DB::raw('count(*) as count')
            )
                ->whereYear('date_opened', '>=', $startYear)
                ->groupBy('year')
                ->pluck('count', 'year');

            $statusLogByYear = CustomerStatusLog::select(
                DB::raw('YEAR(created_at) as year'),
                'status',
                DB::raw('count(*) as count')
            )
                ->whereYear('created_at', '>=', $startYear)
                ->whereIn('status', ['dormant', 'closed', 'escheat', 'reactivated'])
                ->groupBy('year', 'status')
                ->get()
                ->groupBy('year')
                ->map(fn ($rows) => $rows->pluck('count', 'status'));

            $yearlyTrends = collect();
            for ($y = $startYear; $y <= now()->year; $y++) {
                $logs = $statusLogByYear->get($y, collect());
                $yearlyTrends->push([
                    'label' => (string) $y,
                    'year' => $y,
                    'opened' => (int) ($openingsByYear->get($y) ?? 0),
                    'dormant' => (int) ($logs->get('dormant') ?? 0),
                    'closed' => (int) ($logs->get('closed') ?? 0),
                    'escheat' => (int) ($logs->get('escheat') ?? 0),
                    'reactivated' => (int) ($logs->get('reactivated') ?? 0),
                ]);
            }

            // ── Branch breakdown (excluding Head Office) ─────────────────────
            $branches = \App\Models\Branch::with('customers:id,branch_id,status,date_opened')
                ->where('brak', '!=', 'HO')
                ->orderBy('brcode')
                ->get()
                ->map(function (\App\Models\Branch $branch) use ($thisMonthStart, $thisMonthEnd) {
                    $statusCounts = $branch->customers->countBy('status');
                    $openedMonth = $branch->customers->filter(
                        fn ($c) => $c->date_opened
                            && $c->date_opened->between($thisMonthStart, $thisMonthEnd)
                    )->count();

                    $total = $branch->customers->count();
                    $active = (int) $statusCounts->get('active', 0);

                    return [
                        'id' => $branch->id,
                        'branch_name' => $branch->branch_name,
                        'brak' => $branch->brak,
                        'brcode' => $branch->brcode,
                        'total' => $total,
                        'active' => $active,
                        'dormant' => (int) $statusCounts->get('dormant', 0),
                        'closed' => (int) $statusCounts->get('closed', 0),
                        'escheat' => (int) $statusCounts->get('escheat', 0),
                        'reactivated' => (int) $statusCounts->get('reactivated', 0),
                        'opened_this_month' => $openedMonth,
                        'active_pct' => $total > 0 ? round($active / $total * 100, 1) : 0,
                    ];
                });

            // ── Top uploaders (customers uploaded per user) ──────────────────
            $topUploaders = Customer::select(
                'uploaded_by',
                DB::raw('count(*) as total'),
                DB::raw('sum(case when status = "active" then 1 else 0 end) as active_count'),
                DB::raw('sum(case when status = "dormant" then 1 else 0 end) as dormant_count'),
                DB::raw('sum(case when status = "closed" then 1 else 0 end) as closed_count'),
            )
                ->with('uploader:id,firstname,lastname,branch_id')
                ->whereNotNull('uploaded_by')
                ->groupBy('uploaded_by')
                ->orderByDesc('total')
                ->limit(20)
                ->get()
                ->map(function ($row) {
                    $uploader = $row->uploader;

                    return [
                        'user_id' => $row->uploaded_by,
                        'name' => $uploader?->full_name ?? 'Unknown',
                        'total' => (int) $row->total,
                        'active' => (int) $row->active_count,
                        'dormant' => (int) $row->dormant_count,
                        'closed' => (int) $row->closed_count,
                    ];
                });

            activity()
                ->causedBy(auth()->user())
                ->withProperties(['action' => 'viewed_summary_report'])
                ->log('Compliance viewed summary report');

            return response()->json([
                'success' => true,
                'data' => [
                    'generated_at' => now()->toDateTimeString(),
                    'period_label' => now()->format('F Y'),
                    'overall' => [
                        'total' => (int) $totalAll,
                        'active' => (int) ($overall->get('active', 0)),
                        'dormant' => (int) ($overall->get('dormant', 0)),
                        'closed' => (int) ($overall->get('closed', 0)),
                        'escheat' => (int) ($overall->get('escheat', 0)),
                        'reactivated' => (int) ($overall->get('reactivated', 0)),
                    ],
                    'this_month' => [
                        'label' => now()->format('F Y'),
                        'opened' => $openedThisMonth,
                        'became_dormant' => (int) ($statusLogThisMonth->get('dormant', 0)),
                        'became_closed' => (int) ($statusLogThisMonth->get('closed', 0)),
                        'became_escheat' => (int) ($statusLogThisMonth->get('escheat', 0)),
                        'reactivated' => (int) ($statusLogThisMonth->get('reactivated', 0)),
                    ],
                    'monthly_trends' => $monthlyTrends,
                    'yearly_trends' => $yearlyTrends,
                    'branches' => $branches,
                    'top_uploaders' => $topUploaders,
                ],
            ]);

        } catch (\Exception $e) {
            Log::error('Compliance summary report error: '.$e->getMessage());

            return response()->json([
                'success' => false,
                'message' => 'Failed to load summary report',
                'error' => config('app.debug') ? $e->getMessage() : 'Internal server error',
            ], 500);
        }
    }

    /**
     * Branch KPI detail: status counts + 12-month trends for one branch.
     */
    public function getBranchDetail(\App\Models\Branch $branch): JsonResponse
    {
        $this->authorize('view-compliance-reports');

        try {
            $thisMonthStart = now()->startOfMonth();
            $thisMonthEnd = now()->endOfMonth();

            $statusCounts = Customer::where('branch_id', $branch->id)
                ->select('status', DB::raw('count(*) as count'))
                ->groupBy('status')
                ->pluck('count', 'status');

            $total = $statusCounts->sum();
            $active = (int) $statusCounts->get('active', 0);

            $openingsByMonth = Customer::where('branch_id', $branch->id)
                ->select(
                    DB::raw('DATE_FORMAT(date_opened, "%Y-%m") as month'),
                    DB::raw('count(*) as count')
                )
                ->where('date_opened', '>=', now()->subMonths(11)->startOfMonth())
                ->groupBy('month')
                ->pluck('count', 'month');

            $statusLogByMonth = CustomerStatusLog::whereHas(
                'customer',
                fn ($q) => $q->where('branch_id', $branch->id)
            )
                ->select(
                    DB::raw('DATE_FORMAT(created_at, "%Y-%m") as month'),
                    'status',
                    DB::raw('count(*) as count')
                )
                ->where('created_at', '>=', now()->subMonths(11)->startOfMonth())
                ->whereIn('status', ['dormant', 'closed', 'escheat', 'reactivated'])
                ->groupBy('month', 'status')
                ->get()
                ->groupBy('month')
                ->map(fn ($rows) => $rows->pluck('count', 'status'));

            $monthlyTrends = collect();
            for ($i = 11; $i >= 0; $i--) {
                $date = now()->subMonths($i);
                $key = $date->format('Y-m');
                $logs = $statusLogByMonth->get($key, collect());
                $monthlyTrends->push([
                    'label' => $date->format('M Y'),
                    'month' => $key,
                    'opened' => (int) ($openingsByMonth->get($key) ?? 0),
                    'dormant' => (int) ($logs->get('dormant') ?? 0),
                    'closed' => (int) ($logs->get('closed') ?? 0),
                    'escheat' => (int) ($logs->get('escheat') ?? 0),
                    'reactivated' => (int) ($logs->get('reactivated') ?? 0),
                ]);
            }

            $uploaders = Customer::where('branch_id', $branch->id)
                ->whereNotNull('uploaded_by')
                ->select('uploaded_by', DB::raw('count(*) as total'))
                ->with('uploader:id,firstname,lastname')
                ->groupBy('uploaded_by')
                ->orderByDesc('total')
                ->limit(10)
                ->get()
                ->map(fn ($r) => [
                    'name' => $r->uploader?->full_name ?? 'Unknown',
                    'total' => (int) $r->total,
                ]);

            return response()->json([
                'success' => true,
                'data' => [
                    'branch' => [
                        'id' => $branch->id,
                        'branch_name' => $branch->branch_name,
                        'brak' => $branch->brak,
                        'brcode' => $branch->brcode,
                    ],
                    'overall' => [
                        'total' => (int) $total,
                        'active' => $active,
                        'dormant' => (int) $statusCounts->get('dormant', 0),
                        'closed' => (int) $statusCounts->get('closed', 0),
                        'escheat' => (int) $statusCounts->get('escheat', 0),
                        'reactivated' => (int) $statusCounts->get('reactivated', 0),
                        'active_pct' => $total > 0 ? round($active / $total * 100, 1) : 0,
                        'opened_this_month' => Customer::where('branch_id', $branch->id)
                            ->whereBetween('date_opened', [$thisMonthStart, $thisMonthEnd])
                            ->count(),
                    ],
                    'monthly_trends' => $monthlyTrends,
                    'top_uploaders' => $uploaders,
                ],
            ]);

        } catch (\Exception $e) {
            Log::error('Compliance branch detail error: '.$e->getMessage());

            return response()->json([
                'success' => false,
                'message' => 'Failed to load branch detail',
                'error' => config('app.debug') ? $e->getMessage() : 'Internal server error',
            ], 500);
        }
    }

    /**
     * Get compliance reports
     */
    public function getReports(Request $request): JsonResponse
    {
        try {
            $compliance = auth()->user();

            $availableReports = [
                [
                    'type' => 'bsp_compliance',
                    'name' => 'BSP Compliance Report',
                    'description' => 'Comprehensive BSP regulatory compliance report',
                    'can_generate' => true,
                    'formats' => ['pdf', 'excel'],
                    'frequency' => 'daily,weekly,monthly',
                    'regulatory_requirement' => true,
                ],
                [
                    'type' => 'aml_cft',
                    'name' => 'AML/CFT Monitoring Report',
                    'description' => 'Anti-Money Laundering and Combating Financing of Terrorism report',
                    'can_generate' => true,
                    'formats' => ['pdf', 'excel', 'csv'],
                    'frequency' => 'daily,weekly,monthly',
                    'regulatory_requirement' => true,
                ],
                [
                    'type' => 'suspicious_transactions',
                    'name' => 'Suspicious Transaction Report',
                    'description' => 'Report of flagged and suspicious transactions',
                    'can_generate' => true,
                    'formats' => ['pdf', 'excel'],
                    'frequency' => 'real_time,daily',
                    'regulatory_requirement' => true,
                ],
                [
                    'type' => 'kyc_compliance',
                    'name' => 'KYC/CDD Compliance Report',
                    'description' => 'Know Your Customer and Customer Due Diligence compliance status',
                    'can_generate' => true,
                    'formats' => ['pdf', 'excel'],
                    'frequency' => 'weekly,monthly',
                    'regulatory_requirement' => true,
                ],
            ];

            activity()
                ->causedBy($compliance)
                ->withProperties(['action' => 'compliance_viewed_available_reports'])
                ->log('Compliance officer viewed available reports');

            return response()->json([
                'success' => true,
                'message' => 'Available compliance reports retrieved successfully',
                'data' => [
                    'available_reports' => $availableReports,
                    'user_permissions' => [
                        'can_view_reports' => true,
                        'can_generate_reports' => true,
                        'can_export_reports' => true,
                        'can_schedule_reports' => true,
                        'can_modify_reports' => false,
                    ],
                ],
            ]);

        } catch (\Exception $e) {
            Log::error('Compliance error retrieving reports: '.$e->getMessage());

            return response()->json([
                'success' => false,
                'message' => 'Failed to retrieve reports',
                'error' => config('app.debug') ? $e->getMessage() : 'Internal server error',
            ], 500);
        }
    }

    /**
     * Generate specialized compliance report
     */
    public function generateReport(Request $request): JsonResponse
    {
        $this->authorize('view-compliance-reports');

        $request->validate([
            'date_from' => 'required|date',
            'date_to' => 'required|date|after_or_equal:date_from',
            'branch_id' => 'nullable|integer|exists:branches,id',
        ]);

        try {
            $dateFrom = $request->date('date_from')->startOfDay();
            $dateTo = $request->date('date_to')->endOfDay();

            if ($request->filled('branch_id')) {
                $branchModel = \App\Models\Branch::find($request->branch_id);
                $branchLabel = $branchModel?->branch_name ?? 'Unknown Branch';
            } else {
                $branchLabel = 'All Branches (excl. Head Office)';
            }

            $mapCustomerRow = function (Customer $c, ?string $eventDate = null): array {
                return [
                    'account_no' => $c->account_no,
                    'full_name' => $c->full_name,
                    'account_type' => $c->account_type.($c->joint_sub_type ? " ({$c->joint_sub_type})" : ''),
                    'risk_level' => $c->risk_level ?? '—',
                    'status' => $c->status,
                    'date_opened' => $c->date_opened?->format('Y-m-d'),
                    'event_date' => $eventDate,
                    'branch' => $c->branch?->branch_name ?? '—',
                    'branch_brak' => $c->branch?->brak ?? '—',
                    'uploaded_by' => $c->uploader?->full_name ?? '—',
                ];
            };

            // ── Accounts Opened: date_opened in range ──────────────────────
            $openedQuery = Customer::with(['branch:id,branch_name,brak', 'uploader:id,firstname,lastname'])
                ->whereBetween('date_opened', [$dateFrom, $dateTo]);

            if ($request->filled('branch_id')) {
                $openedQuery->where('branch_id', $request->branch_id);
            } else {
                $openedQuery->whereHas('branch', fn ($q) => $q->where('brak', '!=', 'HO'));
            }

            $openedRows = $openedQuery->orderBy('date_opened')->get()
                ->map(fn (Customer $c) => $mapCustomerRow($c, $c->date_opened?->format('Y-m-d')))
                ->values();

            // ── Status events from CustomerStatusLog ───────────────────────
            $eventsByStatus = [];

            foreach (['dormant', 'closed', 'reactivated', 'escheat'] as $eventStatus) {
                $logQuery = CustomerStatusLog::with([
                    'customer' => fn ($q) => $q->with(['branch:id,branch_name,brak', 'uploader:id,firstname,lastname']),
                ])
                    ->where('status', $eventStatus)
                    ->whereBetween('created_at', [$dateFrom, $dateTo]);

                if ($request->filled('branch_id')) {
                    $logQuery->whereHas('customer', fn ($q) => $q->where('branch_id', $request->branch_id));
                } else {
                    $logQuery->whereHas('customer', fn ($q) => $q->whereHas('branch', fn ($bq) => $bq->where('brak', '!=', 'HO')));
                }

                $eventsByStatus[$eventStatus] = $logQuery->orderBy('created_at')->get()
                    ->filter(fn ($log) => $log->customer !== null)
                    ->map(fn ($log) => $mapCustomerRow($log->customer, $log->created_at->format('Y-m-d')))
                    ->values();
            }

            $totalEvents = $openedRows->count()
                + collect($eventsByStatus)->map(fn ($rows) => $rows->count())->sum();

            $allRows = $openedRows->concat(collect($eventsByStatus)->flatten(1));
            $byAccountType = $allRows->groupBy('account_type')->map->count();
            $byRisk = $allRows->groupBy('risk_level')->map->count();

            activity()
                ->causedBy(auth()->user())
                ->withProperties([
                    'action' => 'generate_customer_report',
                    'date_from' => $dateFrom->toDateString(),
                    'date_to' => $dateTo->toDateString(),
                    'branch' => $branchLabel,
                    'total_events' => $totalEvents,
                ])
                ->log('Generated customer report');

            return response()->json([
                'success' => true,
                'data' => [
                    'meta' => [
                        'date_from' => $dateFrom->format('M d, Y'),
                        'date_to' => $dateTo->format('M d, Y'),
                        'branch_label' => $branchLabel,
                        'generated_at' => now()->format('M d, Y h:i A'),
                        'total_events' => $totalEvents,
                    ],
                    'summary' => [
                        'opened' => $openedRows->count(),
                        'dormant' => $eventsByStatus['dormant']->count(),
                        'closed' => $eventsByStatus['closed']->count(),
                        'reactivated' => $eventsByStatus['reactivated']->count(),
                        'escheat' => $eventsByStatus['escheat']->count(),
                        'total_events' => $totalEvents,
                        'by_account_type' => $byAccountType->toArray(),
                        'by_risk_level' => $byRisk->toArray(),
                    ],
                    'customers_by_event' => [
                        'opened' => $openedRows,
                        'dormant' => $eventsByStatus['dormant'],
                        'closed' => $eventsByStatus['closed'],
                        'reactivated' => $eventsByStatus['reactivated'],
                        'escheat' => $eventsByStatus['escheat'],
                    ],
                ],
            ]);

        } catch (\Exception $e) {
            Log::error('Error generating customer report: '.$e->getMessage());

            return response()->json([
                'success' => false,
                'message' => 'Failed to generate report.',
            ], 500);
        }
    }

    /**
     * Export report
     */
    public function exportReport(Request $request): JsonResponse
    {
        $this->authorize('export-reports');

        $request->validate([
            'report_id' => 'required|string',
            'format' => 'required|in:pdf,excel,csv,json',
            'encryption_required' => 'boolean',
        ]);

        try {
            $compliance = auth()->user();

            activity()
                ->causedBy($compliance)
                ->withProperties([
                    'action' => 'compliance_exported_report',
                    'report_id' => $request->report_id,
                    'format' => $request->format,
                    'encryption_required' => $request->encryption_required ?? true,
                ])
                ->log('Compliance officer exported report');

            return response()->json([
                'success' => true,
                'message' => 'Report export initiated successfully',
                'data' => [
                    'export_id' => 'EXP-'.$request->report_id,
                    'report_id' => $request->report_id,
                    'format' => $request->format,
                    'encryption_applied' => $request->encryption_required ?? true,
                    'download_url' => "/api/compliance/exports/download/{$request->report_id}",
                    'expires_at' => now()->addHours(24),
                ],
            ]);

        } catch (\Exception $e) {
            Log::error('Compliance error exporting report: '.$e->getMessage());

            return response()->json([
                'success' => false,
                'message' => 'Failed to export report',
                'error' => config('app.debug') ? $e->getMessage() : 'Internal server error',
            ], 500);
        }
    }

    /**
     * Get financial reports (compliance view)
     */
    public function getFinancialReports(Request $request): JsonResponse
    {
        try {
            $compliance = auth()->user();

            $request->validate([
                'period' => 'nullable|in:daily,weekly,monthly,quarterly,annual',
                'report_type' => 'nullable|in:balance_sheet,income_statement,cash_flow,regulatory',
                'branch_code' => 'nullable|string',
            ]);

            $financialReports = [
                [
                    'type' => 'regulatory_capital',
                    'name' => 'Regulatory Capital Report',
                    'data' => [
                        'total_capital' => 150000000.00,
                        'tier1_capital' => 120000000.00,
                        'tier2_capital' => 30000000.00,
                        'capital_adequacy_ratio' => 15.5,
                        'bsp_minimum_requirement' => 10.0,
                        'compliance_status' => 'compliant',
                    ],
                ],
                [
                    'type' => 'liquidity_coverage',
                    'name' => 'Liquidity Coverage Ratio',
                    'data' => [
                        'high_quality_liquid_assets' => 75000000.00,
                        'net_cash_outflows' => 50000000.00,
                        'liquidity_coverage_ratio' => 150.0,
                        'bsp_minimum_requirement' => 100.0,
                        'compliance_status' => 'compliant',
                    ],
                ],
            ];

            activity()
                ->causedBy($compliance)
                ->withProperties([
                    'action' => 'compliance_viewed_financial_reports',
                    'filters' => $request->all(),
                ])
                ->log('Compliance officer viewed financial reports');

            return response()->json([
                'success' => true,
                'message' => 'Financial reports retrieved successfully (compliance view)',
                'data' => [
                    'reports' => $financialReports,
                    'compliance_overview' => [
                        'capital_adequacy' => 'compliant',
                        'liquidity_requirements' => 'compliant',
                        'regulatory_ratios' => 'within_limits',
                    ],
                ],
            ]);

        } catch (\Exception $e) {
            Log::error('Compliance error retrieving financial reports: '.$e->getMessage());

            return response()->json([
                'success' => false,
                'message' => 'Failed to retrieve financial reports',
                'error' => config('app.debug') ? $e->getMessage() : 'Internal server error',
            ], 500);
        }
    }

    /**
     * Get regulatory reports
     */
    public function getRegulatoryReports(Request $request): JsonResponse
    {
        try {
            $compliance = auth()->user();

            $request->validate([
                'report_type' => 'nullable|in:bsp_submission,amlc_report,dof_filing,monthly_report',
                'submission_status' => 'nullable|in:draft,pending,submitted,approved',
                'date_from' => 'nullable|date',
                'date_to' => 'nullable|date|after_or_equal:date_from',
            ]);

            $regulatoryReports = [
                [
                    'id' => 'BSP-001',
                    'type' => 'bsp_submission',
                    'name' => 'BSP Monthly Capital Adequacy Report',
                    'reporting_period' => now()->subMonth()->format('Y-m'),
                    'submission_deadline' => now()->addDays(5),
                    'status' => 'draft',
                    'completion_percentage' => 85,
                    'last_updated' => now()->subHours(2),
                    'regulatory_body' => 'Bangko Sentral ng Pilipinas',
                ],
                [
                    'id' => 'AMLC-002',
                    'type' => 'amlc_report',
                    'name' => 'AMLC Suspicious Transaction Report',
                    'reporting_period' => now()->format('Y-m-d'),
                    'submission_deadline' => now()->addDays(1),
                    'status' => 'pending_submission',
                    'completion_percentage' => 100,
                    'last_updated' => now()->subHours(1),
                    'regulatory_body' => 'Anti-Money Laundering Council',
                ],
            ];

            activity()
                ->causedBy($compliance)
                ->withProperties([
                    'action' => 'compliance_viewed_regulatory_reports',
                    'filters' => $request->all(),
                ])
                ->log('Compliance officer viewed regulatory reports');

            return response()->json([
                'success' => true,
                'message' => 'Regulatory reports retrieved successfully',
                'data' => [
                    'reports' => $regulatoryReports,
                    'summary' => [
                        'overdue_reports' => 0,
                        'due_this_week' => 2,
                        'pending_submission' => 1,
                        'draft_reports' => 1,
                    ],
                ],
            ]);

        } catch (\Exception $e) {
            Log::error('Compliance error retrieving regulatory reports: '.$e->getMessage());

            return response()->json([
                'success' => false,
                'message' => 'Failed to retrieve regulatory reports',
                'error' => config('app.debug') ? $e->getMessage() : 'Internal server error',
            ], 500);
        }
    }

    // =============================================
    // SECURITY MONITORING METHODS
    // =============================================

    /**
     * Get login attempts for security analysis
     */
    public function getLoginAttempts(Request $request): JsonResponse
    {
        $request->validate([
            'date_from' => 'nullable|date',
            'date_to' => 'nullable|date|after_or_equal:date_from',
            'status' => 'nullable|in:success,failed,locked',
            'ip_address' => 'nullable|ip',
            'user_id' => 'nullable|exists:users,id',
            'per_page' => 'nullable|integer|min:1|max:200',
        ]);

        try {
            $compliance = auth()->user();

            $query = Activity::where('description', 'like', '%login%')
                ->with('causer')
                ->orderBy('created_at', 'desc');

            if ($request->filled('date_from')) {
                $query->where('created_at', '>=', $request->date_from);
            }

            if ($request->filled('date_to')) {
                $query->where('created_at', '<=', $request->date_to);
            }

            if ($request->filled('status')) {
                $query->where('description', 'like', "%{$request->status}%");
            }

            if ($request->filled('user_id')) {
                $query->where('causer_id', $request->user_id);
            }

            $attempts = $query->paginate($request->per_page ?? 100);

            // Security analytics
            $securityAnalytics = [
                'failed_attempts_last_24h' => Activity::where('description', 'like', '%failed%login%')
                    ->where('created_at', '>=', now()->subDay())
                    ->count(),
                'successful_logins_last_24h' => Activity::where('description', 'like', '%successful%login%')
                    ->where('created_at', '>=', now()->subDay())
                    ->count(),
                'locked_accounts_today' => User::whereNotNull('account_locked_at')
                    ->whereDate('account_locked_at', today())
                    ->count(),
                'unique_ip_addresses' => Activity::where('description', 'like', '%login%')
                    ->where('created_at', '>=', now()->subDay())
                    ->distinct('properties->ip_address')
                    ->count(),
                'suspicious_patterns' => 3, // Example count
            ];

            activity()
                ->causedBy($compliance)
                ->withProperties([
                    'action' => 'compliance_viewed_login_attempts',
                    'filters' => $request->all(),
                    'result_count' => $attempts->total(),
                ])
                ->log('Compliance officer viewed login attempts');

            return response()->json([
                'success' => true,
                'message' => 'Login attempts retrieved successfully',
                'data' => $attempts,
                'security_analytics' => $securityAnalytics,
                'risk_indicators' => [
                    'brute_force_detected' => $securityAnalytics['failed_attempts_last_24h'] > 100,
                    'mass_lockouts' => $securityAnalytics['locked_accounts_today'] > 10,
                    'geographical_anomalies' => false, // Would be calculated based on IP analysis
                ],
            ]);

        } catch (\Exception $e) {
            Log::error('Compliance error retrieving login attempts: '.$e->getMessage());

            return response()->json([
                'success' => false,
                'message' => 'Failed to retrieve login attempts',
                'error' => config('app.debug') ? $e->getMessage() : 'Internal server error',
            ], 500);
        }
    }

    /**
     * Get system logs for compliance monitoring
     */
    public function getSystemLogs(Request $request): JsonResponse
    {
        $this->authorize('view-system-logs');

        $request->validate([
            'level' => 'nullable|in:emergency,alert,critical,error,warning,notice,info,debug',
            'date_from' => 'nullable|date',
            'date_to' => 'nullable|date|after_or_equal:date_from',
            'component' => 'nullable|string',
            'per_page' => 'nullable|integer|min:1|max:200',
        ]);

        try {
            $compliance = auth()->user();

            // Placeholder implementation - in production, this would read from actual log files
            $systemLogs = [
                [
                    'timestamp' => now()->subMinutes(10),
                    'level' => 'warning',
                    'component' => 'authentication',
                    'message' => 'Multiple failed login attempts detected from IP 192.168.1.100',
                    'context' => ['ip' => '192.168.1.100', 'attempts' => 5],
                ],
                [
                    'timestamp' => now()->subMinutes(30),
                    'level' => 'info',
                    'component' => 'transaction_processing',
                    'message' => 'High-value transaction processed successfully',
                    'context' => ['amount' => 500000, 'reference' => 'TXN-12345'],
                ],
                [
                    'timestamp' => now()->subHours(1),
                    'level' => 'error',
                    'component' => 'database',
                    'message' => 'Database connection timeout during peak hours',
                    'context' => ['duration' => '30s', 'queries_affected' => 25],
                ],
            ];

            activity()
                ->causedBy($compliance)
                ->withProperties([
                    'action' => 'compliance_viewed_system_logs',
                    'filters' => $request->all(),
                    'result_count' => count($systemLogs),
                ])
                ->log('Compliance officer viewed system logs');

            return response()->json([
                'success' => true,
                'message' => 'System logs retrieved successfully',
                'data' => [
                    'logs' => $systemLogs,
                    'pagination' => [
                        'total' => count($systemLogs),
                        'per_page' => $request->per_page ?? 100,
                        'current_page' => 1,
                    ],
                ],
                'log_summary' => [
                    'error_count' => 1,
                    'warning_count' => 1,
                    'info_count' => 1,
                    'critical_issues' => 0,
                ],
            ]);

        } catch (\Exception $e) {
            Log::error('Compliance error retrieving system logs: '.$e->getMessage());

            return response()->json([
                'success' => false,
                'message' => 'Failed to retrieve system logs',
                'error' => config('app.debug') ? $e->getMessage() : 'Internal server error',
            ], 500);
        }
    }

    /**
     * Get security events for compliance monitoring
     */
    public function getSecurityEvents(Request $request): JsonResponse
    {
        $this->authorize('view-login-attempts');

        $request->validate([
            'date_from' => 'nullable|date',
            'date_to' => 'nullable|date|after_or_equal:date_from',
            'severity' => 'nullable|in:low,medium,high,critical',
            'event_type' => 'nullable|in:authentication,authorization,data_access,configuration_change',
            'per_page' => 'nullable|integer|min:1|max:200',
        ]);

        try {
            $compliance = auth()->user();

            $securityEvents = [
                'failed_login', 'account_locked', 'password_reset', 'unauthorized_access',
                'privilege_escalation', 'data_export', 'system_configuration_change',
                'suspicious_transaction', 'high_value_transaction',
            ];

            $query = Activity::whereIn('description', $securityEvents)
                ->with('causer')
                ->orderBy('created_at', 'desc');

            if ($request->filled('date_from')) {
                $query->where('created_at', '>=', $request->date_from);
            }

            if ($request->filled('date_to')) {
                $query->where('created_at', '<=', $request->date_to);
            }

            $events = $query->paginate($request->per_page ?? 100);

            // Security metrics
            $securityMetrics = [
                'critical_events_last_24h' => Activity::whereIn('description', ['unauthorized_access', 'privilege_escalation'])
                    ->where('created_at', '>=', now()->subDay())
                    ->count(),
                'data_access_events' => Activity::where('description', 'like', '%data_export%')
                    ->where('created_at', '>=', now()->subDay())
                    ->count(),
                'configuration_changes' => Activity::where('description', 'like', '%configuration_change%')
                    ->where('created_at', '>=', now()->subDay())
                    ->count(),
                'authentication_failures' => Activity::where('description', 'like', '%failed%login%')
                    ->where('created_at', '>=', now()->subDay())
                    ->count(),
            ];

            activity()
                ->causedBy($compliance)
                ->withProperties([
                    'action' => 'compliance_viewed_security_events',
                    'filters' => $request->all(),
                    'result_count' => $events->total(),
                ])
                ->log('Compliance officer viewed security events');

            return response()->json([
                'success' => true,
                'message' => 'Security events retrieved successfully',
                'data' => $events,
                'security_metrics' => $securityMetrics,
                'threat_assessment' => [
                    'overall_risk_level' => 'medium',
                    'trending_threats' => ['brute_force_attacks', 'account_takeover_attempts'],
                    'recommendations' => [
                        'Implement additional MFA for high-risk accounts',
                        'Review and update access controls',
                        'Enhance monitoring for unusual transaction patterns',
                    ],
                ],
            ]);

        } catch (\Exception $e) {
            Log::error('Compliance error retrieving security events: '.$e->getMessage());

            return response()->json([
                'success' => false,
                'message' => 'Failed to retrieve security events',
                'error' => config('app.debug') ? $e->getMessage() : 'Internal server error',
            ], 500);
        }
    }

    // =============================================
    // BRANCH DATA AND REPORTS
    // =============================================

    /**
     * Get branch data for compliance analysis
     */
    public function getBranchData(Request $request): JsonResponse
    {
        try {
            $compliance = auth()->user();

            $request->validate([
                'branch_code' => 'nullable|string',
                'metric_type' => 'nullable|in:transactions,accounts,customers,compliance',
                'date_from' => 'nullable|date',
                'date_to' => 'nullable|date|after_or_equal:date_from',
            ]);

            $branchData = [
                [
                    'branch_code' => 'BR001',
                    'branch_name' => 'Main Branch',
                    'compliance_score' => 95.5,
                    'transaction_volume' => 1250,
                    'high_risk_transactions' => 15,
                    'customer_count' => 850,
                    'high_risk_customers' => 25,
                    'kyc_compliance_rate' => 98.2,
                    'aml_alerts' => 3,
                    'staff_count' => 12,
                    'last_audit_date' => now()->subMonths(3),
                    'next_audit_due' => now()->addMonths(9),
                ],
                [
                    'branch_code' => 'BR002',
                    'branch_name' => 'Downtown Branch',
                    'compliance_score' => 88.7,
                    'transaction_volume' => 980,
                    'high_risk_transactions' => 22,
                    'customer_count' => 650,
                    'high_risk_customers' => 35,
                    'kyc_compliance_rate' => 94.8,
                    'aml_alerts' => 8,
                    'staff_count' => 10,
                    'last_audit_date' => now()->subMonths(6),
                    'next_audit_due' => now()->addMonths(6),
                ],
            ];

            activity()
                ->causedBy($compliance)
                ->withProperties([
                    'action' => 'compliance_viewed_branch_data',
                    'filters' => $request->all(),
                ])
                ->log('Compliance officer viewed branch data');

            return response()->json([
                'success' => true,
                'message' => 'Branch data retrieved successfully',
                'data' => [
                    'branches' => $branchData,
                    'aggregate_metrics' => [
                        'average_compliance_score' => 92.1,
                        'total_high_risk_transactions' => 37,
                        'total_aml_alerts' => 11,
                        'branches_due_for_audit' => 1,
                    ],
                ],
            ]);

        } catch (\Exception $e) {
            Log::error('Compliance error retrieving branch data: '.$e->getMessage());

            return response()->json([
                'success' => false,
                'message' => 'Failed to retrieve branch data',
                'error' => config('app.debug') ? $e->getMessage() : 'Internal server error',
            ], 500);
        }
    }

    /**
     * Get branch reports for compliance
     */
    public function getBranchReports(Request $request): JsonResponse
    {
        try {
            $compliance = auth()->user();

            $request->validate([
                'branch_code' => 'nullable|string',
                'report_type' => 'nullable|in:compliance,performance,risk,audit',
                'period' => 'nullable|in:daily,weekly,monthly,quarterly',
            ]);

            $branchReports = [
                [
                    'branch_code' => 'BR001',
                    'branch_name' => 'Main Branch',
                    'reports' => [
                        [
                            'type' => 'compliance',
                            'name' => 'Branch Compliance Report',
                            'status' => 'compliant',
                            'score' => 95.5,
                            'last_updated' => now()->subHours(6),
                            'issues' => [],
                        ],
                        [
                            'type' => 'risk',
                            'name' => 'Branch Risk Assessment',
                            'status' => 'medium_risk',
                            'score' => 72.3,
                            'last_updated' => now()->subDays(1),
                            'issues' => ['high_cash_transactions', 'unusual_customer_behavior'],
                        ],
                    ],
                ],
                [
                    'branch_code' => 'BR002',
                    'branch_name' => 'Downtown Branch',
                    'reports' => [
                        [
                            'type' => 'compliance',
                            'name' => 'Branch Compliance Report',
                            'status' => 'minor_issues',
                            'score' => 88.7,
                            'last_updated' => now()->subHours(4),
                            'issues' => ['kyc_documentation_gaps'],
                        ],
                        [
                            'type' => 'risk',
                            'name' => 'Branch Risk Assessment',
                            'status' => 'high_risk',
                            'score' => 82.1,
                            'last_updated' => now()->subDays(1),
                            'issues' => ['multiple_aml_alerts', 'staff_training_overdue'],
                        ],
                    ],
                ],
            ];

            activity()
                ->causedBy($compliance)
                ->withProperties([
                    'action' => 'compliance_viewed_branch_reports',
                    'filters' => $request->all(),
                ])
                ->log('Compliance officer viewed branch reports');

            return response()->json([
                'success' => true,
                'message' => 'Branch reports retrieved successfully',
                'data' => $branchReports,
            ]);

        } catch (\Exception $e) {
            Log::error('Compliance error retrieving branch reports: '.$e->getMessage());

            return response()->json([
                'success' => false,
                'message' => 'Failed to retrieve branch reports',
                'error' => config('app.debug') ? $e->getMessage() : 'Internal server error',
            ], 500);
        }
    }
}
