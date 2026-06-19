<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;

class StoreBusinessRequest extends FormRequest
{
    /**
     * Determine if the user is authorized to make this request.
     */
    public function authorize(): bool
    {
        // En un caso real se verifica que el usuario autenticado sea superadmin.
        // Asumimos que la ruta ya está protegida por un middleware de Spatie.
        return true;
    }

    /**
     * Get the validation rules that apply to the request.
     *
     * @return array<string, \Illuminate\Contracts\Validation\ValidationRule|array<mixed>|string>
     */
    public function rules(): array
    {
        return [
            'name' => 'required|string|min:3|max:255',
            'owner_name' => 'required|string|min:3|max:255',
            'admin_email' => 'required|email|unique:users,email',
            'admin_password' => 'required|string|min:8',
        ];
    }
    
    public function messages(): array
    {
        return [
            'admin_email.unique' => 'Ya existe un usuario con este correo electrónico.',
            'admin_password.min' => 'La contraseña debe tener al menos 8 caracteres.',
        ];
    }
}
