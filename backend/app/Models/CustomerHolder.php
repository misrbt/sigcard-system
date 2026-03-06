<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Spatie\Activitylog\LogOptions;
use Spatie\Activitylog\Traits\LogsActivity;

class CustomerHolder extends Model
{
    use LogsActivity;
    public function getActivitylogOptions(): LogOptions
    {
        return LogOptions::defaults()
            ->useLogName('customer_holder')
            ->logOnly([
                'customer_id', 'person_index', 'firstname', 'middlename',
                'lastname', 'suffix', 'risk_level',
            ])
            ->logOnlyDirty()
            ->dontSubmitEmptyLogs();
    }

    protected $fillable = [
        'customer_id',
        'person_index',
        'firstname',
        'middlename',
        'lastname',
        'suffix',
        'risk_level',
    ];

    public function customer(): BelongsTo
    {
        return $this->belongsTo(Customer::class);
    }

    public function getFullNameAttribute(): string
    {
        $name = $this->firstname;

        if ($this->middlename) {
            $name .= ' ' . $this->middlename;
        }

        $name .= ' ' . $this->lastname;

        if ($this->suffix) {
            $name .= ' ' . $this->suffix;
        }

        return $name;
    }
}
