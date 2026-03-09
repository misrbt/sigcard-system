<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;

class StoreCustomerRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    /**
     * @return array<string, \Illuminate\Contracts\Validation\ValidationRule|array<mixed>|string>
     */
    public function rules(): array
    {
        return [
            // Primary holder (Person 1)
            'firstname'    => 'required|string|max:255',
            'middlename'   => 'nullable|string|max:255',
            'lastname'     => 'required|string|max:255',
            'suffix'       => 'nullable|string|max:50',
            'account_type' => 'required|in:Regular,Joint,Corporate',
            'risk_level'   => 'required|in:Low Risk,Medium Risk,High Risk',
            'branch_id'    => 'nullable|exists:branches,id',

            // Additional holders (Person 2+) — required for Joint accounts
            'additionalPersons'               => 'nullable|array',
            'additionalPersons.*.firstname'   => 'required_with:additionalPersons|string|max:255',
            'additionalPersons.*.middlename'  => 'nullable|string|max:255',
            'additionalPersons.*.lastname'    => 'required_with:additionalPersons|string|max:255',
            'additionalPersons.*.suffix'      => 'nullable|string|max:50',
            'additionalPersons.*.risk_level'  => 'required_with:additionalPersons|in:Low Risk,Medium Risk,High Risk',

            // Document pairs — each pair has a front and back image.
            // Joint accounts require at least 2 pairs; others require exactly 1.
            'sigcardPairs'         => 'required|array|min:1',
            'sigcardPairs.*.front' => 'required|image|mimes:jpeg,jpg,png|max:10240',
            'sigcardPairs.*.back'  => 'required|image|mimes:jpeg,jpg,png|max:10240',

            'naisPairs'         => 'nullable|array|min:1',
            'naisPairs.*.front' => 'required|image|mimes:jpeg,jpg,png|max:10240',
            'naisPairs.*.back'  => 'nullable|image|mimes:jpeg,jpg,png|max:10240',

            'privacyPairs'         => 'required|array|min:1',
            'privacyPairs.*.front' => 'required|image|mimes:jpeg,jpg,png|max:10240',
            'privacyPairs.*.back'  => 'required|image|mimes:jpeg,jpg,png|max:10240',

            // Optional additional documents
            'otherDocs'   => 'nullable|array',
            'otherDocs.*' => 'image|mimes:jpeg,jpg,png|max:10240',
        ];
    }

    public function withValidator($validator): void
    {
        $validator->after(function ($validator) {
            if ($this->input('account_type') !== 'Joint') {
                return;
            }

            foreach (['sigcardPairs', 'privacyPairs'] as $key) {
                if (count($this->file($key, [])) < 2) {
                    $validator->errors()->add(
                        $key,
                        "Joint accounts require at least 2 persons for {$key}."
                    );
                }
            }

            if (count($this->input('additionalPersons', [])) < 1) {
                $validator->errors()->add(
                    'additionalPersons',
                    'Joint accounts require at least 2 account holders.'
                );
            }
        });
    }

    public function messages(): array
    {
        return [
            'firstname.required'    => 'First name is required.',
            'lastname.required'     => 'Last name is required.',
            'account_type.required' => 'Account type is required.',
            'account_type.in'       => 'Account type must be Regular, Joint, or Corporate.',
            'risk_level.required'   => 'Risk level is required.',
            'risk_level.in'         => 'Risk level must be Low Risk, Medium Risk, or High Risk.',
            'branch_id.exists'      => 'The selected branch does not exist.',

            'sigcardPairs.required'         => 'Sigcard images are required.',
            'sigcardPairs.*.front.required' => 'Sigcard front image is required for each person.',
            'sigcardPairs.*.back.required'  => 'Sigcard back image is required for each person.',

            'naisPairs.*.front.required' => 'NAIS front image is required for each person.',

            'privacyPairs.required'         => 'Data privacy images are required.',
            'privacyPairs.*.front.required' => 'Data privacy front image is required for each person.',
            'privacyPairs.*.back.required'  => 'Data privacy back image is required for each person.',

            'additionalPersons.*.firstname.required_with'  => 'First name is required for each additional holder.',
            'additionalPersons.*.lastname.required_with'   => 'Last name is required for each additional holder.',
            'additionalPersons.*.risk_level.required_with' => 'Risk level is required for each additional holder.',
            'additionalPersons.*.risk_level.in'            => 'Risk level must be Low Risk, Medium Risk, or High Risk.',

            '*.image' => 'File must be an image.',
            '*.mimes' => 'Image must be JPEG, JPG, or PNG format.',
            '*.max'   => 'Image size must not exceed 10MB.',
        ];
    }
}
