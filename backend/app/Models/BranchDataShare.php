<?php

namespace App\Models;

use Carbon\Carbon;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Collection as EloquentCollection;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Support\Facades\Schema;

/**
 * A rule that lets users of one branch (target) see the customers of another
 * branch (source) whose date opened falls inside the rule's date window.
 * Because the window is on the customer's date opened, customers uploaded later
 * are shared automatically while their date opened is in range, and stop being
 * shared for any date after date_to.
 */
class BranchDataShare extends Model
{
    protected $fillable = [
        'source_branch_id',
        'target_branch_id',
        'date_from',
        'date_to',
        'include_documents',
        'is_active',
        'notes',
        'created_by',
    ];

    protected $casts = [
        'date_from' => 'date:Y-m-d',
        'date_to' => 'date:Y-m-d',
        'include_documents' => 'boolean',
        'is_active' => 'boolean',
    ];

    public function sourceBranch(): BelongsTo
    {
        return $this->belongsTo(Branch::class, 'source_branch_id');
    }

    public function targetBranch(): BelongsTo
    {
        return $this->belongsTo(Branch::class, 'target_branch_id');
    }

    /** Active rules that give any of these branches access to other branches' customers. */
    public static function activeForTargets(iterable $branchIds)
    {
        if (! Schema::hasTable('branch_data_shares')) {
            return new EloquentCollection;
        }

        return static::query()
            ->with('sourceBranch')
            ->where('is_active', true)
            ->whereIn('target_branch_id', collect($branchIds)->all())
            ->get();
    }

    /** Own-branch customers OR customers shared with the given branches. */
    public static function applyVisibility(Builder $query, iterable $ownBranchIds): void
    {
        $ownIds = collect($ownBranchIds)->unique()->values()->all();
        $shares = static::activeForTargets($ownIds);

        $query->where(function (Builder $w) use ($ownIds, $shares) {
            $w->whereIn('branch_id', $ownIds);

            foreach ($shares as $share) {
                $w->orWhere(fn (Builder $s) => $share->constrainCustomers($s));
            }
        });
    }

    /** Restrict a customer query to the records this rule shares. */
    public function constrainCustomers(Builder $query): Builder
    {
        $query->where('branch_id', $this->source_branch_id);

        if ($this->date_from) {
            $query->whereDate('date_opened', '>=', $this->date_from->toDateString());
        }
        if ($this->date_to) {
            $query->whereDate('date_opened', '<=', $this->date_to->toDateString());
        }

        return $query;
    }

    public function covers(Customer $customer): bool
    {
        if (! $this->is_active
            || (int) $customer->branch_id !== (int) $this->source_branch_id
            || ! $customer->date_opened) {
            return false;
        }

        $opened = Carbon::parse($customer->date_opened)->toDateString();

        return (! $this->date_from || $opened >= $this->date_from->toDateString())
            && (! $this->date_to || $opened <= $this->date_to->toDateString());
    }
}
