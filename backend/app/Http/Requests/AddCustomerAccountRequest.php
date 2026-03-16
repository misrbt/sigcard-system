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
        return [
            'account_no' => 'nullable|string|max:100',
            'date_opened' => 'nullable|date',
            'date_updated' => 'nullable|date',
            'risk_level' => 'required|in:Low Risk,Medium Risk,High Risk',
            'status' => 'nullable|in:active,dormant,reactivated,escheat,closed',

            'sigcardPairs' => 'required|array|min:1|max:1',
            'sigcardPairs.*.front' => 'required|image|max:10240',
            'sigcardPairs.*.back' => 'required|image|max:10240',

            'naisPairs' => 'nullable|array|min:1|max:1',
            'naisPairs.*.front' => 'nullable|image|max:10240',
            'naisPairs.*.back' => 'nullable|image|max:10240',

            'privacyPairs' => 'required|array|min:1|max:1',
            'privacyPairs.*.front' => 'required|image|max:10240',
            'privacyPairs.*.back' => 'required|image|max:10240',

            'otherDocs' => 'nullable|array',
            'otherDocs.*' => 'image|max:10240',
        ];
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
        ];
    }
}
