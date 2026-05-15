<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class CustomerStatusLog extends Model
{
    protected $fillable = [
        'customer_id',
        'account_id',
        'status',
        'previous_status',
        'changed_by',
    ];

    public function customer(): BelongsTo
    {
        return $this->belongsTo(Customer::class);
    }

    public function account(): BelongsTo
    {
        return $this->belongsTo(CustomerAccount::class, 'account_id');
    }

    public function changedBy(): BelongsTo
    {
        return $this->belongsTo(User::class, 'changed_by');
    }

    public function documents(): HasMany
    {
        return $this->hasMany(CustomerDocument::class, 'status_log_id');
    }
}
