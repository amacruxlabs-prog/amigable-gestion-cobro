<?php

namespace App\Http\Requests\Tenant;

use Illuminate\Foundation\Http\FormRequest;

class UpdateTransactionRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        return [
            'client_name' => 'sometimes|string|max:255',
            'client_document' => 'sometimes|nullable|string|max:255',
            'client_phone' => 'sometimes|nullable|string|max:255',
            'total_amount' => 'sometimes|numeric|min:0',
            'paid_amount' => 'sometimes|numeric|min:0',
            'status' => 'sometimes|in:PENDING,PAID',
            'due_date' => 'sometimes|nullable|date',
        ];
    }
}
