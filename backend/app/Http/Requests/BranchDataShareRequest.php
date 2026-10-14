<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;

class BranchDataShareRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    /**
     * @return array<string, mixed>
     */
    public function rules(): array
    {
        return [
            'source_branch_id' => 'required|integer|exists:branches,id|different:target_branch_id',
            'target_branch_id' => 'required|integer|exists:branches,id',
            'date_from' => 'nullable|date',
            'date_to' => 'nullable|date|after_or_equal:date_from',
            'include_documents' => 'boolean',
            'is_active' => 'boolean',
            'notes' => 'nullable|string|max:255',
        ];
    }

    /**
     * @return array<string, string>
     */
    public function messages(): array
    {
        return [
            'source_branch_id.required' => 'Please choose the branch whose customers will be shared.',
            'source_branch_id.different' => 'The sharing branch and the receiving branch must be different.',
            'target_branch_id.required' => 'Please choose the branch that will receive the customers.',
            'date_to.after_or_equal' => 'The last date opened must be on or after the first date opened.',
        ];
    }
}
