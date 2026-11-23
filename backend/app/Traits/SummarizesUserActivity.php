<?php

namespace App\Traits;

use App\Models\User;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Http\Request;
use Spatie\Activitylog\Models\Activity;

/**
 * Shared by AdminController and ComplianceController audit-log endpoints.
 *
 * - auditUserDirectory(): the staff list used by the "search a staff member" box
 *   (name, email, username, role, branch) so the page can match on any of them.
 * - buildUserActivitySummary(): profile + activity counts for one staff member,
 *   shown above the feed when the audit log is narrowed to that person.
 *
 * The using class must define applyCategoryFilter(Builder $query, string $category).
 */
trait SummarizesUserActivity
{
    /**
     * Plain-language action groups, in precedence order: an activity belongs to the
     * FIRST group whose words appear in its description, so the groups never overlap.
     * "other" catches everything left (e.g. background "API access granted" entries).
     *
     * @return array<string, list<string>>
     */
    public static function auditActionGroups(): array
    {
        return [
            'alert' => ['failed', 'unauthorized', 'attempted access', 'security event', 'rate limit'],
            'login' => ['logged in', 'logged out', 'login', 'password', 'two-factor', 'recovery code'],
            'deleted' => ['deleted', 'removed', 'revoked'],
            'viewed' => ['viewed', 'accessed', 'search'],
            'uploaded' => ['created', 'uploaded', 'added'],
            'edited' => ['updated', 'replaced', 'changed', 'moved', 'assigned', 'synced', 'edited'],
            'status' => ['approved', 'rejected', 'verified', 'activated', 'unlocked', 'exempted', 'restored'],
            'report' => ['generated', 'exported', 'report'],
        ];
    }

    /**
     * Narrow an activity query to one plain-language action group (see auditActionGroups()).
     */
    protected function applyActionFilter(Builder $query, string $action): void
    {
        $groups = self::auditActionGroups();
        $matchesAny = function ($q, array $words): void {
            $q->where(function ($inner) use ($words) {
                foreach ($words as $word) {
                    $inner->orWhere('description', 'like', "%{$word}%");
                }
            });
        };

        $earlier = [];
        foreach ($groups as $key => $words) {
            if ($key === $action) {
                $matchesAny($query, $words);
                break;
            }
            $earlier = array_merge($earlier, $words);
        }

        if ($action === 'other') {
            $earlier = array_merge(...array_values($groups));
        }

        if ($earlier !== []) {
            $query->whereNot(fn ($q) => $matchesAny($q, $earlier));
        }
    }

    protected function auditUserDirectory(): array
    {
        return User::with(['roles:id,name', 'branch:id,branch_name'])
            ->select('id', 'firstname', 'lastname', 'username', 'email', 'branch_id', 'status')
            ->orderBy('firstname')
            ->get()
            ->map(fn (User $u) => [
                'id' => $u->id,
                'name' => $u->full_name,
                'email' => $u->email,
                'username' => $u->username,
                'role' => $u->roles->pluck('name')->first(),
                'branch' => $u->branch?->branch_name,
                'status' => $u->status,
            ])
            ->all();
    }

    /**
     * Drop automatic background entries (the "other" group, e.g. "API access granted")
     * so staff only see real actions.
     */
    protected function excludeBackgroundActivity(Builder $query): void
    {
        $words = array_merge(...array_values(self::auditActionGroups()));
        $query->where(function ($q) use ($words) {
            foreach ($words as $word) {
                $q->orWhere('description', 'like', "%{$word}%");
            }
        });
    }

    protected function buildUserActivitySummary(int $userId, Request $request): ?array
    {
        $user = User::with(['roles:id,name', 'branch:id,branch_name'])->find($userId);
        if (! $user) {
            return null;
        }

        $hideBackground = $request->boolean('hide_background');
        $base = function () use ($userId, $hideBackground) {
            $q = Activity::query()
                ->where('causer_type', User::class)
                ->where('causer_id', $userId);
            if ($hideBackground) {
                $this->excludeBackgroundActivity($q);
            }

            return $q;
        };

        $period = function () use ($base, $request) {
            $q = $base();
            if ($request->filled('date_from')) {
                $q->whereDate('created_at', '>=', $request->date_from);
            }
            if ($request->filled('date_to')) {
                $q->whereDate('created_at', '<=', $request->date_to);
            }

            return $q;
        };

        $byCategory = [];
        foreach (['login', 'customer', 'user_management', 'security', 'system'] as $cat) {
            $q = $period();
            $this->applyCategoryFilter($q, $cat);
            $byCategory[$cat] = $q->count();
        }

        $byAction = [];
        foreach ([...array_keys(self::auditActionGroups()), 'other'] as $action) {
            $q = $period();
            $this->applyActionFilter($q, $action);
            $byAction[$action] = $q->count();
        }

        $first = $base()->oldest('created_at')->value('created_at');
        $last = $base()->latest('created_at')->value('created_at');

        return [
            'user' => [
                'id' => $user->id,
                'name' => $user->full_name,
                'email' => $user->email,
                'username' => $user->username,
                'role' => $user->roles->pluck('name')->first(),
                'branch' => $user->branch?->branch_name,
                'status' => $user->status,
                'last_login_at' => $user->last_login_at,
                'last_login_ip' => $user->last_login_ip,
            ],
            'total_all_time' => $base()->count(),
            'total_in_period' => $period()->count(),
            'today' => $base()->whereDate('created_at', today())->count(),
            'last_7_days' => $base()->where('created_at', '>=', now()->subDays(7))->count(),
            'first_activity_at' => $first,
            'last_activity_at' => $last,
            'by_category' => $byCategory,
            'by_action' => $byAction,
        ];
    }
}
