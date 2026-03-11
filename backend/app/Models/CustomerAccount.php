<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class CustomerAccount extends Model
{
    protected $fillable = [
        'customer_id',
        'account_no',
        'risk_level',
        'date_opened',
        'status',
    ];

    protected function casts(): array
    {
        return [
            'date_opened' => 'date:Y-m-d',
            'created_at'  => 'datetime',
            'updated_at'  => 'datetime',
        ];
    }

    public function customer(): BelongsTo
    {
        return $this->belongsTo(Customer::class);
    }
}
