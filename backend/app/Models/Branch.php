<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Spatie\Activitylog\LogOptions;
use Spatie\Activitylog\Traits\LogsActivity;

class Branch extends Model
{
    use LogsActivity;
    public function getActivitylogOptions(): LogOptions
    {
        return LogOptions::defaults()
            ->useLogName('branch')
            ->logOnly([
                'branch_name', 'brak', 'brcode', 'parent_id',
            ])
            ->logOnlyDirty()
            ->dontSubmitEmptyLogs();
    }

    protected $fillable = [
        'branch_name',
        'brak',
        'brcode',
        'parent_id',
    ];

    public function users(): HasMany
    {
        return $this->hasMany(User::class, 'branch_id');
    }

    public function customers(): HasMany
    {
        return $this->hasMany(Customer::class, 'branch_id');
    }

    /** The mother branch this branch belongs to (null if this IS a mother branch). */
    public function parent(): BelongsTo
    {
        return $this->belongsTo(Branch::class, 'parent_id');
    }

    /** Branch lite children under this mother branch. */
    public function children(): HasMany
    {
        return $this->hasMany(Branch::class, 'parent_id');
    }

    public function isMotherBranch(): bool
    {
        return is_null($this->parent_id);
    }
}
