<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;

class SystemSettingsRequest extends FormRequest
{
    /**
     * Determine if the user is authorized to make this request.
     */
    public function authorize(): bool
    {
        return $this->user()->hasRole('admin');
    }

    /**
     * Get the validation rules that apply to the request.
     *
     * @return array<string, \Illuminate\Contracts\Validation\ValidationRule|array<mixed>|string>
     */
    public function rules(): array
    {
        return [
            'session_timeout' => ['sometimes', 'integer', 'min:5', 'max:480'],
            'token_expiration' => ['sometimes', 'integer', 'min:5', 'max:1440'],
            'concurrent_sessions_limit' => ['sometimes', 'integer', 'min:0', 'max:20'],
            'password_expiry_enabled' => ['sometimes', 'boolean'],
            'password_expiry_days' => ['sometimes', 'integer', 'min:30', 'max:365'],
            'max_login_attempts' => ['sometimes', 'integer', 'min:0', 'max:10'],
            'account_lockout_duration' => ['sometimes', 'integer', 'min:15', 'max:1440'],
            'require_two_factor' => ['sometimes', 'boolean'],
            'maintenance_mode' => ['sometimes', 'boolean'],
            'audit_log_retention_days' => ['sometimes', 'integer', 'min:90', 'max:2555'],
            'notification_email' => ['sometimes', 'email', 'max:255'],
            'system_timezone' => ['sometimes', 'string', 'max:100'],
            'currency_code' => ['sometimes', 'string', 'size:3'],
        ];
    }

    /**
     * Get custom error messages for validation rules.
     *
     * @return array<string, string>
     */
    public function messages(): array
    {
        return [
            'session_timeout.min' => 'Session timeout must be at least 5 minutes (BSP requirement).',
            'session_timeout.max' => 'Session timeout cannot exceed 8 hours (BSP requirement).',
            'token_expiration.min' => 'Token expiration must be at least 5 minutes.',
            'token_expiration.max' => 'Token expiration cannot exceed 24 hours.',
            'password_expiry_days.min' => 'Password expiry must be at least 30 days (BSP requirement).',
            'password_expiry_days.max' => 'Password expiry cannot exceed 365 days (BSP requirement).',
            'max_login_attempts.min' => 'Max login attempts must be 0 (disabled) or between 3 and 10.',
            'max_login_attempts.max' => 'Maximum 10 login attempts allowed (BSP requirement).',
            'audit_log_retention_days.min' => 'Audit logs must be retained for at least 90 days (BSP requirement).',
            'currency_code.size' => 'Currency code must be exactly 3 characters (ISO 4217).',
        ];
    }
}
