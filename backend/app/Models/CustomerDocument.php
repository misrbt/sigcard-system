<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Spatie\Activitylog\LogOptions;
use Spatie\Activitylog\Traits\LogsActivity;

class CustomerDocument extends Model
{
    use LogsActivity;

    protected $fillable = [
        'customer_id',
        'document_type',
        'person_index',
        'file_path',
        'file_name',
        'file_size',
        'mime_type',
        'fingerprint_template',
    ];

    // Never expose the raw template in API responses — it's large and internal.
    protected $hidden = ['fingerprint_template'];

    // Append has_thumbmark so the frontend knows whether a sigcard_front has an enrolled thumbmark.
    protected $appends = ['has_thumbmark'];

    protected function casts(): array
    {
        return [
            'person_index' => 'integer',
            'file_size' => 'integer',
            'created_at' => 'datetime',
            'updated_at' => 'datetime',
        ];
    }

    /**
     * Spatie activity log: capture every document upload, replacement and deletion.
     */
    public function getActivitylogOptions(): LogOptions
    {
        return LogOptions::defaults()
            ->useLogName('document')
            ->logOnly(['customer_id', 'document_type', 'person_index', 'file_name', 'file_size'])
            ->logOnlyDirty()
            ->dontSubmitEmptyLogs();
    }

    // ── Relationships ────────────────────────────────────────────────────────

    public function customer(): BelongsTo
    {
        return $this->belongsTo(Customer::class);
    }

    // ── Accessors ────────────────────────────────────────────────────────────

    public function getFileUrlAttribute(): string
    {
        return url('storage/'.$this->file_path);
    }

    /**
     * Returns true if a thumbmark template has been enrolled for this sigcard_front,
     * false if the sigcard only has a signature (no thumbmark), null for non-sigcard_front docs.
     */
    public function getHasThumbmarkAttribute(): ?bool
    {
        if ($this->document_type !== 'sigcard_front') {
            return null;
        }

        return $this->fingerprint_template !== null;
    }

    // ── Scopes ───────────────────────────────────────────────────────────────

    public function scopeOfType($query, string $type)
    {
        return $query->where('document_type', $type);
    }

    public function scopeForPerson($query, int $personIndex)
    {
        return $query->where('person_index', $personIndex);
    }

    public function scopeSigcards($query)
    {
        return $query->whereIn('document_type', ['sigcard_front', 'sigcard_back']);
    }

    public function scopeNais($query)
    {
        return $query->whereIn('document_type', ['nais_front', 'nais_back']);
    }

    public function scopePrivacy($query)
    {
        return $query->whereIn('document_type', ['privacy_front', 'privacy_back']);
    }

    public function scopeOther($query)
    {
        return $query->where('document_type', 'other');
    }
}
