<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;

class UpdateCustomerRequest extends FormRequest
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
            'account_no'   => 'sometimes|nullable|string|max:100',
            'date_opened'  => 'sometimes|nullable|date',
            'firstname'    => 'sometimes|nullable|string|max:255',
            'middlename'   => 'nullable|string|max:255',
            'lastname'     => 'sometimes|nullable|string|max:255',
            'suffix'       => 'nullable|string|max:50',
            'company_name' => 'sometimes|nullable|string|max:255',
            'account_type' => 'sometimes|required|in:Regular,Joint,Corporate',
            'risk_level'   => 'sometimes|required|in:Low Risk,Medium Risk,High Risk',
            'status'       => 'sometimes|in:active,reactivated,dormant,escheat,closed',
            'branch_id'    => 'nullable|exists:branches,id',

            // Additional accounts for the same person (Regular only)
            'additionalAccounts'                  => 'sometimes|nullable|array',
            'additionalAccounts.*.account_no'     => 'nullable|string|max:100',
            'additionalAccounts.*.risk_level'     => 'required_with:additionalAccounts|in:Low Risk,Medium Risk,High Risk',
            'additionalAccounts.*.date_opened'    => 'nullable|date',

            // Additional holders (Person 2+) for Joint accounts
            'additionalPersons'               => 'sometimes|nullable|array',
            'additionalPersons.*.firstname'   => 'required_with:additionalPersons|string|max:255',
            'additionalPersons.*.middlename'  => 'nullable|string|max:255',
            'additionalPersons.*.lastname'    => 'required_with:additionalPersons|string|max:255',
            'additionalPersons.*.suffix'      => 'nullable|string|max:50',
            'additionalPersons.*.risk_level'  => 'required_with:additionalPersons|in:Low Risk,Medium Risk,High Risk',

            'sigcardPairs'         => 'sometimes|array|min:1',
            'sigcardPairs.*.front' => 'sometimes|image|max:10240',
            'sigcardPairs.*.back'  => 'sometimes|image|max:10240',

            'naisPairs'         => 'sometimes|array|min:1',
            'naisPairs.*.front' => 'sometimes|image|max:10240',
            'naisPairs.*.back'  => 'sometimes|image|max:10240',

            'privacyPairs'         => 'sometimes|array|min:1',
            'privacyPairs.*.front' => 'sometimes|image|max:10240',
            'privacyPairs.*.back'  => 'sometimes|image|max:10240',

            // Optional additional documents — keyed by person/account index (1-based)
            'otherDocs'     => 'nullable|array',
            'otherDocs.*'   => 'nullable',
            'otherDocs.*.*' => 'nullable|image|max:10240',
        ];
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
            'status.in'             => 'Status must be active, reactivated, dormant, escheat, or closed.',
            'branch_id.exists'      => 'The selected branch does not exist.',

            'additionalPersons.*.firstname.required_with'  => 'First name is required for each additional holder.',
            'additionalPersons.*.lastname.required_with'   => 'Last name is required for each additional holder.',
            'additionalPersons.*.risk_level.required_with' => 'Risk level is required for each additional holder.',
            'additionalPersons.*.risk_level.in'            => 'Risk level must be Low Risk, Medium Risk, or High Risk.',

            '*.image' => 'File must be an image.',
            '*.max'   => 'Image size must not exceed 10MB.',
        ];
    }
}
