<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;

class ThumbmarkSearchRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true; // gate is handled by the route middleware (auth:sanctum)
    }

    public function rules(): array
    {
        return [
            'thumbmark' => ['required', 'file', 'image', 'max:10240'],
        ];
    }

    public function messages(): array
    {
        return [
            'thumbmark.required' => 'A thumbmark image is required.',
            'thumbmark.file' => 'The thumbmark must be a valid file.',
            'thumbmark.image' => 'The thumbmark must be an image (JPG, PNG, BMP, etc.).',
            'thumbmark.max' => 'The thumbmark image may not exceed 10 MB.',
        ];
    }
}
