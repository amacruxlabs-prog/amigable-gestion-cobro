<?php

namespace App\Http\Controllers\Tenant;

use App\Http\Controllers\Controller;
use App\Models\User;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Hash;
use Spatie\Permission\Models\Role;

class UserController extends Controller
{
    public function index(Request $request)
    {
        $businessId = auth()->user()->business_id;
        $currentUserId = auth()->id();

        $users = User::with('roles')
            ->where('business_id', $businessId)
            ->where('id', '!=', $currentUserId)
            ->whereDoesntHave('roles', function($q) {
                $q->whereIn('name', ['Administrador', 'Admin Negocio']);
            })
            ->get();

        return $this->successResponse($users, 'Lista de usuarios');
    }

    public function store(Request $request)
    {
        $request->validate([
            'name' => 'required|string|max:255',
            'email' => 'required|string|email|max:255|unique:users',
            'password' => 'required|string|min:8',
            'role' => 'required|string|in:Admin Local,Lectura',
        ]);

        $businessId = auth()->user()->business_id;

        $user = User::create([
            'name' => $request->name,
            'email' => $request->email,
            'password' => Hash::make($request->password),
            'business_id' => $businessId,
            'status' => 'activo'
        ]);

        if (Role::where('name', $request->role)->exists()) {
            $user->assignRole($request->role);
        }

        return $this->successResponse($user->load('roles'), 'Usuario creado exitosamente.', 201);
    }

    public function update(Request $request, $id)
    {
        $request->validate([
            'name' => 'sometimes|string|max:255',
            'role' => 'sometimes|string|in:Admin Local,Lectura',
        ]);

        $businessId = auth()->user()->business_id;
        $user = User::where('id', $id)->where('business_id', $businessId)->first();

        if (!$user) {
            return $this->errorResponse('Usuario no encontrado', 'NOT_FOUND', null, 404);
        }

        if ($request->has('name')) {
            $user->name = $request->name;
        }

        if ($request->has('role')) {
            $user->syncRoles([$request->role]);
        }

        $user->save();

        return $this->successResponse($user->load('roles'), 'Usuario actualizado');
    }

    public function toggleStatus($id)
    {
        $businessId = auth()->user()->business_id;
        $user = User::where('id', $id)->where('business_id', $businessId)->first();

        if (!$user) {
            return $this->errorResponse('Usuario no encontrado', 'NOT_FOUND', null, 404);
        }

        if ($user->id === auth()->id()) {
            return $this->errorResponse('No puedes desactivar tu propia cuenta', 'FORBIDDEN', null, 403);
        }

        $user->status = $user->status === 'activo' ? 'inactivo' : 'activo';
        $user->save();

        return $this->successResponse(['status' => $user->status], 'Estado actualizado');
    }

    public function updatePassword(Request $request, $id)
    {
        $request->validate([
            'password' => 'required|string|min:8',
        ]);

        $businessId = auth()->user()->business_id;
        $user = User::where('id', $id)->where('business_id', $businessId)->first();

        if (!$user) {
            return $this->errorResponse('Usuario no encontrado', 'NOT_FOUND', null, 404);
        }

        $user->password = Hash::make($request->password);
        $user->save();

        return $this->successResponse(null, 'Contraseña actualizada');
    }

    public function destroy($id)
    {
        $businessId = auth()->user()->business_id;
        $user = User::where('id', $id)->where('business_id', $businessId)->first();

        if (!$user) {
            return $this->errorResponse('Usuario no encontrado', 'NOT_FOUND', null, 404);
        }

        if ($user->id === auth()->id()) {
            return $this->errorResponse('No puedes eliminar tu propia cuenta', 'FORBIDDEN', null, 403);
        }

        $user->delete();

        return $this->successResponse(null, 'Usuario eliminado');
    }
}
