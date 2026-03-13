<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Spatie\Activitylog\LogOptions;
use Spatie\Activitylog\Traits\LogsActivity;

/**
 * @property-read \Illuminate\Database\Eloquent\Collection<int, \App\Models\CustomerHolder> $holders
 */
class Customer extends Model
{
    use LogsActivity;

    protected $appends = ['full_name'];

    protected $fillable = [
        'account_no',
        'date_opened',
        'branch_id',
        'uploaded_by',
        'firstname',
        'middlename',
        'lastname',
        'suffix',
        'company_name',
        'account_type',
        'joint_sub_type',
        'risk_level',
        'status',
    ];

    protected function casts(): array
    {
        return [
            'date_opened' => 'date:Y-m-d',
            'created_at' => 'datetime',
            'updated_at' => 'datetime',
        ];
    }

    /**
     * Spatie activity log: track every meaningful field change with before/after.
     */
    public function getActivitylogOptions(): LogOptions
    {
        return LogOptions::defaults()
            ->useLogName('customer')
            ->logOnly([
                'account_no', 'date_opened', 'firstname', 'middlename', 'lastname', 'suffix', 'company_name',
                'account_type', 'joint_sub_type', 'risk_level', 'status', 'branch_id',
            ])
            ->logOnlyDirty()
            ->dontSubmitEmptyLogs();
    }

    // ── Relationships ────────────────────────────────────────────────────────

    public function branch(): BelongsTo
    {
        return $this->belongsTo(Branch::class);
    }

    public function uploader(): BelongsTo
    {
        return $this->belongsTo(User::class, 'uploaded_by');
    }

    public function documents(): HasMany
    {
        return $this->hasMany(CustomerDocument::class);
    }

    /**
     * Additional account holders (person index ≥ 2), ordered by person_index.
     * The primary holder (person 1) is stored directly on the customers table.
     */
    public function holders(): HasMany
    {
        return $this->hasMany(CustomerHolder::class)->orderBy('person_index');
    }

    /**
     * Additional accounts for the same person (different account numbers).
     * The primary account info is stored directly on the customers table.
     */
    public function accounts(): HasMany
    {
        return $this->hasMany(CustomerAccount::class)->orderBy('created_at');
    }

    // ── Helpers ──────────────────────────────────────────────────────────────

    public function isJoint(): bool
    {
        return $this->account_type === 'Joint';
    }

    /**
     * Get a specific document by type and person index.
     */
    public function getDocument(string $type, int $personIndex = 1): ?CustomerDocument
    {
        return $this->documents()
            ->where('document_type', $type)
            ->where('person_index', $personIndex)
            ->first();
    }

    /**
     * Get all documents of a given type (useful for joint accounts).
     *
     * @return \Illuminate\Database\Eloquent\Collection<int, CustomerDocument>
     */
    public function getDocuments(string $type)
    {
        return $this->documents()
            ->where('document_type', $type)
            ->orderBy('person_index')
            ->get();
    }

    public function getFullNameAttribute(): string
    {
        if ($this->account_type === 'Corporate') {
            return $this->company_name ?? '';
        }

        $name = $this->firstname ?? '';

        if ($this->middlename) {
            $name .= ' '.$this->middlename;
        }

        $name .= ' '.($this->lastname ?? '');

        if ($this->suffix) {
            $name .= ' '.$this->suffix;
        }

        return trim($name);
    }

    // ── Scopes ───────────────────────────────────────────────────────────────

    public function scopeActive($query)
    {
        return $query->where('status', 'active');
    }

    public function scopeByBranch($query, int $branchId)
    {
        return $query->where('branch_id', $branchId);
    }
}
