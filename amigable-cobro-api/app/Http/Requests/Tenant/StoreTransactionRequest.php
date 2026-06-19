<?php

namespace App\Http\Requests\Tenant;

use Illuminate\Foundation\Http\FormRequest;

class StoreTransactionRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        return [
            'client_name' => 'required|string|max:255',
            'client_document' => 'nullable|string|max:255',
            'client_phone' => 'nullable|string|max:255',
            'total_amount' => 'required|numeric|min:0',
            'status' => 'required|in:PENDING,PAID',
        ];
    }
}
