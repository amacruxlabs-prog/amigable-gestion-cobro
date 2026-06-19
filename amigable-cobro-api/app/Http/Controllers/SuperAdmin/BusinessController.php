<?php

namespace App\Http\Controllers\SuperAdmin;

use App\Http\Controllers\Controller;
use App\Http\Requests\StoreBusinessRequest;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Hash;
use Illuminate\Http\Request;

class BusinessController extends Controller
{
    /**
     * Store a newly created business and its admin user.
     */
    public function store(Request $request)
    {
        $request->validate([
            'name' => 'required|string|min:3',
            'owner_name' => 'required|string',
            'assign_to_me' => 'boolean',
            'admin_email' => 'exclude_if:assign_to_me,true|required|email|unique:users,email',
            'admin_password' => 'exclude_if:assign_to_me,true|required|string|min:8',
        ]);

        try {
            DB::beginTransaction();

            $businessId = DB::table('businesses')->insertGetId([
                'name' => $request->name,
                'owner_name' => $request->owner_name,
                'status' => 'ACTIVE',
                'created_at' => now(),
                'updated_at' => now(),
            ]);

            if ($request->assign_to_me) {
                // Asignar al superadmin logueado
                $user = auth()->user();
                // Si el superadmin no tiene negocio, lo asignamos.
                if (!$user->business_id) {
                    $user->business_id = $businessId;
                    $user->save();
                }
                $userId = $user->id;
            } else {
                // Crear nuevo admin
                $userId = DB::table('users')->insertGetId([
                    'name' => $request->owner_name,
                    'email' => $request->admin_email,
                    'password' => Hash::make($request->admin_password),
                    'business_id' => $businessId,
                    'created_at' => now(),
                    'updated_at' => now(),
                ]);

                $user = \App\Models\User::find($userId);
                if ($user && \Spatie\Permission\Models\Role::where('name', 'tenant-admin')->exists()) {
                    $user->assignRole('tenant-admin');
                }
            }

            DB::commit();

            return $this->successResponse([
                'business_id' => $businessId,
                'user_id' => $userId
            ], 'Negocio creado exitosamente.', 201);

        } catch (\Exception $e) {
            DB::rollBack();
            return $this->errorResponse('Ocurrió un error al crear el negocio: ' . $e->getMessage(), 'CREATE_BUSINESS_ERROR', null, 500);
        }
    }
    
    /**
     * Get a list of all businesses
     */
    public function index(Request $request)
    {
        $businesses = DB::table('businesses')->orderBy('created_at', 'desc')->get();
        return $this->successResponse($businesses, 'Lista de negocios');
    }

    /**
     * Toggle the status of a business (Suspend / Activate)
     */
    public function toggleStatus($id)
    {
        $business = DB::table('businesses')->where('id', $id)->first();
        if (!$business) {
            return $this->errorResponse('Negocio no encontrado', 'NOT_FOUND', null, 404);
        }

        $newStatus = $business->status === 'ACTIVE' ? 'suspended' : 'ACTIVE';
        DB::table('businesses')->where('id', $id)->update(['status' => $newStatus, 'updated_at' => now()]);

        return $this->successResponse(['status' => $newStatus], "Estado actualizado a $newStatus");
    }

    /**
     * Impersonate a business or return to superadmin mode
     */
    public function impersonate(Request $request)
    {
        $request->validate([
            'business_id' => 'nullable|integer'
        ]);

        $user = auth()->user();
        
        // Asignamos o limpiamos el business_id
        $user->business_id = $request->business_id;
        $user->save();

        // Generamos un nuevo token que ahora contendrá los claims actualizados
        $token = auth()->login($user);

        return $this->successResponse([
            'token' => $token,
            'user' => $user
        ], 'Contexto de negocio actualizado');
    }
}
