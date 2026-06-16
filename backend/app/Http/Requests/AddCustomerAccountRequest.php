<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;

class AddCustomerAccountRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        $customer = $this->route('customer');
        $isJoint = $customer && $customer->account_type === 'Joint';

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

        $base = [
            'risk_level' => 'required|in:Low Risk,Medium Risk,High Risk',

            'sigcardPairs' => 'required|array|min:1|max:1',
            'sigcardPairs.*.front' => 'required|image|max:10240',
            'sigcardPairs.*.back' => 'required|image|max:10240',

            'naisPairs' => 'nullable|array|min:1|max:1',
            'naisPairs.*.front' => 'nullable|image|max:10240',
            'naisPairs.*.back' => 'nullable|image|max:10240',

            'privacyPairs' => $privacyExempt ? 'nullable|array' : 'required|array|min:1|max:1',
            'privacyPairs.*.front' => $privacyExempt ? 'nullable|image|max:10240' : 'required|image|max:10240',
            'privacyPairs.*.back' => $privacyExempt ? 'nullable|image|max:10240' : 'required|image|max:10240',

            'otherDocs' => 'nullable|array',
            'otherDocs.*' => 'image|max:10240',
        ];

        if ($isJoint) {
            return array_merge($base, [
                'firstname' => 'required|string|max:100',
                'middlename' => 'nullable|string|max:100',
                'lastname' => 'required|string|max:100',
                'suffix' => 'nullable|string|max:20',
                'account_no' => 'nullable|string|max:100',
                'date_opened' => 'nullable|date',
                'date_updated' => 'nullable|date',
                'status' => 'nullable|in:active,dormant,reactivated,escheat,closed',
            ]);
        }

        return array_merge($base, [
            'account_no' => 'nullable|string|max:100',
            'date_opened' => 'nullable|date',
            'date_updated' => 'nullable|date',
            'status' => 'nullable|in:active,dormant,reactivated,escheat,closed',
        ]);
    }

    public function messages(): array
    {
        return [
            'risk_level.required' => 'Risk level is required.',
            'risk_level.in' => 'Risk level must be Low Risk, Medium Risk, or High Risk.',
            'sigcardPairs.required' => 'Sigcard images are required.',
            'sigcardPairs.*.front.required' => 'Sigcard front image is required.',
            'sigcardPairs.*.back.required' => 'Sigcard back image is required.',
            'privacyPairs.required' => 'Data privacy images are required.',
            'privacyPairs.*.front.required' => 'Data privacy front image is required.',
            'privacyPairs.*.back.required' => 'Data privacy back image is required.',
            'firstname.required' => 'First name is required.',
            'lastname.required' => 'Last name is required.',
        ];
    }
}
