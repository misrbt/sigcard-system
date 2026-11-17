<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

/**
 * A dormancy reminder that staff have seen, so it is not shown again for the same 2-year period.
 */
class DormancyReminderAcknowledgment extends Model
{
    protected $fillable = [
        'customer_id',
        'customer_account_id',
        'basis_date',
        'acknowledged_by',
    ];

    protected function casts(): array
    {
        return [
            'basis_date' => 'date:Y-m-d',
        ];
    }

    public function customer(): BelongsTo
    {
        return $this->belongsTo(Customer::class);
    }

    public function account(): BelongsTo
    {
        return $this->belongsTo(CustomerAccount::class, 'customer_account_id');
    }

    public function acknowledgedBy(): BelongsTo
    {
        return $this->belongsTo(User::class, 'acknowledged_by');
    }
}
