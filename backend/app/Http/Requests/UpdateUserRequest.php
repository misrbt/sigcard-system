<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rules\Password;

class UpdateUserRequest extends FormRequest
{
    public function authorize(): bool
    {
        return $this->user()->can('edit-users');
    }

    /**
     * @return array<string, \Illuminate\Contracts\Validation\ValidationRule|array<mixed>|string>
     */
    public function rules(): array
    {
        $userId = $this->route('user')?->id;

        return [
            'firstname' => ['sometimes', 'string', 'max:255'],
            'lastname' => ['sometimes', 'string', 'max:255'],
            'username' => ['sometimes', 'string', 'max:255', "unique:users,username,{$userId}"],
            'email' => ['sometimes', 'string', 'email', 'max:255', "unique:users,email,{$userId}"],
            'branch_id' => ['sometimes', 'exists:branches,id'],
            'photo' => ['nullable', 'image', 'max:2048'],
            'password' => [
                'sometimes',
                'string',
                Password::min(12)
                    ->letters()
                    ->mixedCase()
                    ->numbers()
                    ->symbols()
                    ->uncompromised(),
            ],
            'status' => ['sometimes', 'in:active,inactive,suspended'],
            'roles' => ['sometimes', 'array'],
            'roles.*' => ['exists:roles,name'],
            'two_factor_enabled' => ['sometimes', 'boolean'],
            'account_expires_at' => ['nullable', 'date', 'after:today'],
            'force_password_change' => ['sometimes', 'boolean'],
        ];
    }

    /**
     * @return array<string, string>
     */
    public function messages(): array
    {
        return [
            'email.unique' => 'This email address is already registered.',
            'username.unique' => 'This username is already taken.',
            'password.min' => 'Password must be at least 12 characters long (BSP requirement).',
            'password.uncompromised' => 'This password has been compromised in a data breach.',
        ];
    }
}
