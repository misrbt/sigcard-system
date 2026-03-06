<?php

namespace App\Traits;

use App\Models\Branch;
use App\Models\Customer;
use App\Models\CustomerDocument;
use App\Models\User;
use Carbon\Carbon;
use Illuminate\Support\Facades\DB;

/**
 * Shared branch-scoped dashboard data for Manager and Cashier roles.
 *
 * Both roles see the same set of stats for their own branch.
 * Inject by using this trait in the controller — call getBranchDashboardData($branchId).
 */
trait BranchDashboardTrait
{
    /**
     * Build the full branch dashboard payload.
     *
     * @param  int|int[]|null  $branchIds  Single ID, array of IDs, or null for all branches.
     */
    protected function getBranchDashboardData(int|array|null $branchIds): array
    {
        $ids = is_array($branchIds) ? $branchIds : ($branchIds ? [$branchIds] : null);

        $today     = Carbon::today();
        $baseQuery = Customer::query()->when($ids, fn ($q) => $q->whereIn('branch_id', $ids));

        $total         = (clone $baseQuery)->count();
        $active        = (clone $baseQuery)->where('status', 'active')->count();
        $dormant       = (clone $baseQuery)->where('status', 'dormant')->count();
        $escheat       = (clone $baseQuery)->where('status', 'escheat')->count();
        $closed        = (clone $baseQuery)->where('status', 'closed')->count();
        $today_uploads = (clone $baseQuery)->whereDate('created_at', $today)->count();

        $by_account_type = (clone $baseQuery)
            ->select('account_type', DB::raw('count(*) as count'))
            ->groupBy('account_type')
            ->pluck('count', 'account_type');

        $by_risk_level = (clone $baseQuery)
            ->select('risk_level', DB::raw('count(*) as count'))
            ->groupBy('risk_level')
            ->pluck('count', 'risk_level');

        $recent_uploads = (clone $baseQuery)
            ->with('branch:id,branch_name', 'uploader:id,firstname,lastname')
            ->latest()
            ->limit(8)
            ->get()
            ->map(fn ($c) => [
                'id'           => $c->id,
                'full_name'    => $c->full_name,
                'account_type' => $c->account_type,
                'status'       => $c->status,
                'branch_name'  => $c->branch?->branch_name,
                'uploaded_at'  => $c->created_at?->format('M d, Y'),
            ]);

        $monthly_uploads = collect(range(5, 0))->map(function ($i) use ($baseQuery) {
            $month = Carbon::now()->subMonths($i);

            return [
                'label' => $month->format('M Y'),
                'count' => (clone $baseQuery)
                    ->whereYear('created_at', $month->year)
                    ->whereMonth('created_at', $month->month)
                    ->count(),
            ];
        });

        $branch_users = User::query()
            ->when($ids, fn ($q) => $q->whereIn('branch_id', $ids))
            ->count();

        $total_documents = CustomerDocument::whereHas(
            'customer',
            fn ($q) => $q->when($ids, fn ($q2) => $q2->whereIn('branch_id', $ids))
        )->count();

        // Per-branch breakdown (only when multiple branches are in scope)
        $branch_breakdown = [];

        if ($ids && count($ids) > 1) {
            $branchMap = Branch::whereIn('id', $ids)->get()->keyBy('id');

            foreach ($ids as $bid) {
                $bq = Customer::query()->where('branch_id', $bid);

                $bTotal = (clone $bq)->count();

                $branch_breakdown[] = [
                    'branch_id'     => $bid,
                    'branch_name'   => $branchMap[$bid]->branch_name ?? '—',
                    'brak'          => $branchMap[$bid]->brak ?? '—',
                    'total'         => $bTotal,
                    'active'        => (clone $bq)->where('status', 'active')->count(),
                    'dormant'       => (clone $bq)->where('status', 'dormant')->count(),
                    'escheat'       => (clone $bq)->where('status', 'escheat')->count(),
                    'closed'        => (clone $bq)->where('status', 'closed')->count(),
                    'today_uploads' => (clone $bq)->whereDate('created_at', $today)->count(),
                ];
            }
        }

        return [
            'branch'           => auth()->user()->branch,
            'branch_breakdown' => $branch_breakdown,
            'summary'          => [
                'total_customers' => $total,
                'total_documents' => $total_documents,
                'active'          => $active,
                'dormant'         => $dormant,
                'escheat'         => $escheat,
                'closed'          => $closed,
                'today_uploads'   => $today_uploads,
                'branch_users'    => $branch_users,
            ],
            'by_account_type' => $by_account_type,
            'by_risk_level'   => $by_risk_level,
            'recent_uploads'  => $recent_uploads,
            'monthly_uploads' => $monthly_uploads,
        ];
    }
}
