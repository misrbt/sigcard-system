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
        // Accounts opened before 2017 are exempt from the Data Privacy requirement
        // (the Data Privacy Act amendment only took effect in 2017), and escheat
        // accounts dated 2021 or earlier are exempt as well (the policy was only
        // implemented in 2022).
        $dateOpenedYear = $this->input('date_opened')
            ? (int) date('Y', strtotime($this->input('date_opened')))
            : null;

        $privacyExempt = ($dateOpenedYear !== null && $dateOpenedYear < 2017)
            || ($this->input('status') === 'escheat'
                && $this->input('status_date')
                && (int) date('Y', strtotime($this->input('status_date'))) <= 2021);

        return [
            'account_no' => 'nullable|string|max:100',
            'date_opened' => 'nullable|date',
            'date_updated' => 'nullable|date',
            'status' => 'nullable|in:active,dormant,reactivated,escheat,closed',
            'status_date' => 'nullable|date',
            'photo' => 'nullable|image|max:10240',

            // Primary holder (Person 1)
            'firstname' => 'required|string|max:255',
            'middlename' => 'nullable|string|max:255',
            'lastname' => 'required|string|max:255',
            'suffix' => 'nullable|string|max:50',
            'account_type' => 'required|in:Regular,Joint,Corporate',
            'joint_sub_type' => 'required_if:account_type,Joint|nullable|in:ITF,Non-ITF',
            'corporate_sub_type' => 'required_if:account_type,Corporate|nullable|in:Corporate,Sole Proprietorship',
            'risk_level' => 'required|in:Low Risk,Medium Risk,High Risk',
            'branch_id' => 'nullable|exists:branches,id',

            // Corporate accounts use company_name instead of personal name fields
            'company_name' => 'required_if:account_type,Corporate|nullable|string|max:255',

            // Additional accounts for the same person (Regular only)
            'additionalAccounts' => 'nullable|array',
            'additionalAccounts.*.account_no' => 'nullable|string|max:100',
            'additionalAccounts.*.risk_level' => 'required_with:additionalAccounts|in:Low Risk,Medium Risk,High Risk',
            'additionalAccounts.*.date_opened' => 'nullable|date',
            'additionalAccounts.*.date_updated' => 'nullable|date',
            'additionalAccounts.*.status' => 'nullable|in:active,dormant,reactivated,escheat,closed',
            'additionalAccounts.*.status_date' => 'nullable|date',

            // Additional holders (Person 2+) — required for Joint accounts
            'additionalPersons' => 'nullable|array',
            'additionalPersons.*.firstname' => 'required_with:additionalPersons|string|max:255',
            'additionalPersons.*.middlename' => 'nullable|string|max:255',
            'additionalPersons.*.lastname' => 'required_with:additionalPersons|string|max:255',
            'additionalPersons.*.suffix' => 'nullable|string|max:50',
            'additionalPersons.*.risk_level' => 'nullable|in:Low Risk,Medium Risk,High Risk',

            // Document pairs — each pair has a front and back image.
            // Joint accounts require at least 2 pairs; others require exactly 1.
            'sigcardPairs' => 'required|array|min:1',
            'sigcardPairs.*.front' => 'nullable|image|max:10240',
            'sigcardPairs.*.back' => 'nullable|image|max:10240',

            'naisPairs' => 'nullable|array|min:1',
            'naisPairs.*.front' => 'required|image|max:10240',
            'naisPairs.*.back' => 'nullable|image|max:10240',

            'privacyPairs' => $privacyExempt ? 'nullable|array' : 'required|array|min:1',
            'privacyPairs.*.front' => $privacyExempt ? 'nullable|image|max:10240' : 'required|image|max:10240',
            'privacyPairs.*.back' => $privacyExempt ? 'nullable|image|max:10240' : 'required|image|max:10240',

            // Optional additional documents — keyed by person/account index (1-based)
            'otherDocs' => 'nullable|array',
            'otherDocs.*' => 'nullable',
            'otherDocs.*.*' => 'nullable|image|max:10240',
        ];
    }

    public function withValidator($validator): void
    {
        $validator->after(function ($validator) {
            $accountType = $this->input('account_type');

            if ($accountType === 'Joint') {
                $subType = $this->input('joint_sub_type');

                // ITF: exactly 2 holders (primary + 1 additional)
                if ($subType === 'ITF') {
                    if (count($this->input('additionalPersons', [])) !== 1) {
                        $validator->errors()->add(
                            'additionalPersons',
                            'ITF joint accounts require exactly 2 account holders.'
                        );
                    }
                }
                // Non-ITF: one customer with one or more accounts — no additional persons required
            }

            if ($accountType === 'Corporate' && $this->input('corporate_sub_type') !== 'Sole Proprietorship') {
                if (count($this->input('additionalPersons', [])) < 1) {
                    $validator->errors()->add(
                        'additionalPersons',
                        'Corporate accounts require at least 2 signatories.'
                    );
                }
            }
        });
    }

    public function messages(): array
    {
        return [
            'firstname.required' => 'First name is required.',
            'lastname.required' => 'Last name is required.',
            'company_name.required_if' => 'Company name is required for Corporate accounts.',
            'account_type.required' => 'Account type is required.',
            'account_type.in' => 'Account type must be Regular, Joint, or Corporate.',
            'joint_sub_type.required_if' => 'Joint sub-type is required for Joint accounts.',
            'joint_sub_type.in' => 'Joint sub-type must be ITF or Non-ITF.',
            'corporate_sub_type.required_if' => 'Corporate sub-type is required for Corporate accounts.',
            'corporate_sub_type.in' => 'Corporate sub-type must be Corporate or Sole Proprietorship.',
            'risk_level.required' => 'Risk level is required.',
            'risk_level.in' => 'Risk level must be Low Risk, Medium Risk, or High Risk.',
            'branch_id.exists' => 'The selected branch does not exist.',

            'sigcardPairs.required' => 'Sigcard images are required.',
            'sigcardPairs.*.back.required' => 'Sigcard back image is required for each person.',

            'naisPairs.*.front.required' => 'NAIS front image is required for each person.',

            'privacyPairs.required' => 'Data privacy images are required.',
            'privacyPairs.*.front.required' => 'Data privacy front image is required for each person.',
            'privacyPairs.*.back.required' => 'Data privacy back image is required for each person.',

            'additionalPersons.*.firstname.required_with' => 'First name is required for each additional holder.',
            'additionalPersons.*.lastname.required_with' => 'Last name is required for each additional holder.',
            'additionalPersons.*.risk_level.in' => 'Risk level must be Low Risk, Medium Risk, or High Risk.',

            '*.image' => 'File must be an image.',
            '*.max' => 'Image size must not exceed 10MB.',
        ];
    }
}
