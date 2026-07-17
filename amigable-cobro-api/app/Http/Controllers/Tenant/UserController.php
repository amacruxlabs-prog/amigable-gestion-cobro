<?php

namespace App\Http\Controllers\Tenant;

use App\Http\Controllers\Controller;
use App\Models\User;
use App\Services\ActivityLogger;
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
            'phone' => 'nullable|string|max:20',
            'password' => 'required|string|min:8',
            'role' => 'required|string|in:Admin Local,Lectura',
        ]);

        $businessId = auth()->user()->business_id;

        $user = User::create([
            'name' => $request->name,
            'email' => $request->email,
            'phone' => $request->phone,
            'password' => Hash::make($request->password),
            'business_id' => $businessId,
            'status' => 'activo'
        ]);

        if (Role::where('name', $request->role)->exists()) {
            $user->assignRole($request->role);
        }

        ActivityLogger::log('created', "Creó el usuario {$request->name} ({$request->email}) con rol {$request->role}", 'user', (string)$user->id, null, [
            'name' => $request->name,
            'email' => $request->email,
            'role' => $request->role,
        ]);

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

        ActivityLogger::log('updated', "Actualizó el usuario {$user->name}", 'user', (string)$id, [
            'name' => $user->getOriginal('name'),
        ], [
            'name' => $user->name,
            'role' => $request->role ?? null,
        ]);

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

        $oldStatus = $user->status;
        $user->status = $user->status === 'activo' ? 'inactivo' : 'activo';
        $user->save();

        ActivityLogger::log('status_change', "Cambió el estado del usuario {$user->name} de {$oldStatus} a {$user->status}", 'user', (string)$id, [
            'status' => $oldStatus,
        ], [
            'status' => $user->status,
        ]);

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

        ActivityLogger::log('password_change', "Cambió la contraseña del usuario {$user->name}", 'user', (string)$id);

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

        $userName = $user->name;
        $userEmail = $user->email;
        $user->delete();

        ActivityLogger::log('deleted', "Eliminó al usuario {$userName} ({$userEmail})", 'user', (string)$id, [
            'name' => $userName,
            'email' => $userEmail,
        ]);

        return $this->successResponse(null, 'Usuario eliminado');
    }
}
