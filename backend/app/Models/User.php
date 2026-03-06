<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Foundation\Auth\User as Authenticatable;
use Illuminate\Notifications\Notifiable;
use Laravel\Sanctum\HasApiTokens;
use Spatie\Permission\Traits\HasRoles;
use Spatie\Activitylog\Traits\LogsActivity;
use Spatie\Activitylog\LogOptions;

class User extends Authenticatable
{
    use HasApiTokens, HasFactory, Notifiable, HasRoles, LogsActivity;

    protected $fillable = [
        'firstname',
        'lastname',
        'username',
        'email',
        'password',
        'photo',
        'branch_id',
        'status',
        'last_login_at',
        'last_login_ip',
        'last_login_user_agent',
        'password_expires_at',
        'password_changed_at',
        'failed_login_attempts',
        'account_locked_at',
        'two_factor_enabled',
        'two_factor_secret',
        'two_factor_recovery_codes',
        'force_password_change',
        'account_expires_at',
        'session_id',
        'session_expires_at',
    ];

    protected $hidden = [
        'password',
        'remember_token',
    ];

    protected $appends = ['full_name'];

    protected function casts(): array
    {
        return [
            'email_verified_at' => 'datetime',
            'password' => 'hashed',
            'last_login_at' => 'datetime',
            'password_expires_at' => 'datetime',
            'password_changed_at' => 'datetime',
            'account_locked_at' => 'datetime',
            'account_expires_at' => 'datetime',
            'session_expires_at' => 'datetime',
            'two_factor_enabled' => 'boolean',
            'force_password_change' => 'boolean',
            'failed_login_attempts' => 'integer',
        ];
    }

    public function getActivitylogOptions(): LogOptions
    {
        return LogOptions::defaults()
            ->logOnly([
                'firstname', 'lastname', 'username', 'email',
                'branch_id', 'status',
            ])
            ->logOnlyDirty()
            ->dontSubmitEmptyLogs();
    }

    public function branch(): BelongsTo
    {
        return $this->belongsTo(Branch::class, 'branch_id');
    }

    public function getFullNameAttribute(): string
    {
        return "{$this->firstname} {$this->lastname}";
    }

    public function isAccountLocked(): bool
    {
        return $this->account_locked_at !== null &&
               $this->account_locked_at->isFuture();
    }

    public function isPasswordExpired(): bool
    {
        return $this->password_expires_at &&
               $this->password_expires_at->isPast();
    }

    public function lockAccount(int $minutes = 30): void
    {
        $this->update([
            'account_locked_at' => now()->addMinutes($minutes),
            'failed_login_attempts' => 0,
        ]);
    }

    public function incrementFailedLoginAttempts(): void
    {
        $this->increment('failed_login_attempts');

        if ($this->failed_login_attempts >= 5) {
            $this->lockAccount();
        }
    }

    public function resetFailedLoginAttempts(): void
    {
        $this->update([
            'failed_login_attempts' => 0,
            'account_locked_at' => null,
            'last_login_at' => now(),
        ]);
    }
}
