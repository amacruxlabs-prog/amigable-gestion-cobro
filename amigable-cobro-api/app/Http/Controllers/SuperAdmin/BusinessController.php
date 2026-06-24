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
            'whatsapp_phone' => 'required|string',
            'assign_to_me' => 'boolean',
            'admin_email' => 'exclude_if:assign_to_me,true|required|email|unique:users,email',
            'admin_password' => 'exclude_if:assign_to_me,true|required|string|min:8',
        ]);

        try {
            DB::beginTransaction();

            $businessId = DB::table('businesses')->insertGetId([
                'name' => $request->name,
                'owner_name' => $request->owner_name,
                'whatsapp_phone' => $request->whatsapp_phone,
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
                if ($user && \Spatie\Permission\Models\Role::where('name', 'Admin Negocio')->exists()) {
                    $user->assignRole('Admin Negocio');
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
    
    public function index(Request $request)
    {
        $businesses = DB::table('businesses')
            ->leftJoin('users', function($join) {
                $join->on('users.business_id', '=', 'businesses.id')
                     ->whereRaw('users.id = (select min(id) from users where users.business_id = businesses.id)');
            })
            ->select('businesses.*', 'users.email as admin_email')
            ->orderBy('businesses.created_at', 'desc')
            ->get();
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

    /**
     * Get details and summary of a business
     */
    public function show($id)
    {
        $business = DB::table('businesses')->where('id', $id)->first();
        if (!$business) {
            return $this->errorResponse('Negocio no encontrado', 'NOT_FOUND', null, 404);
        }

        // Obtener estadísticas resumen del negocio
        $transactionsCount = DB::table('transactions')->where('business_id', $id)->count();
        $totalAmount = DB::table('transactions')->where('business_id', $id)->sum('total_amount') ?: 0;
        $totalPaid = DB::table('transactions')->where('business_id', $id)->sum('paid_amount') ?: 0;
        $totalOutstanding = max(0, $totalAmount - $totalPaid);
        // Excluir a los super admins del conteo de usuarios y de la lista
        $usersCount = DB::table('users')
            ->where('business_id', $id)
            ->whereNotIn('id', function($q) {
                $q->select('model_id')->from('model_has_roles')
                  ->join('roles', 'role_id', '=', 'roles.id')
                  ->where('roles.name', 'Administrador');
            })
            ->count();

        // Cuántos deudores (clientes únicos con saldo pendiente)
        $debtorsCount = DB::table('transactions')
            ->where('business_id', $id)
            ->where('status', 'PENDING')
            ->distinct()
            ->count('client_name');

        // Obtener los usuarios del negocio (nombre, email) excluyendo Súper Admins
        $users = DB::table('users')
            ->where('business_id', $id)
            ->whereNotIn('id', function($q) {
                $q->select('model_id')->from('model_has_roles')
                  ->join('roles', 'role_id', '=', 'roles.id')
                  ->where('roles.name', 'Administrador');
            })
            ->select('id', 'name', 'email', 'created_at')
            ->get();

        // Obtener el usuario admin principal (el primero creado para este negocio)
        $adminUser = DB::table('users')
            ->where('business_id', $id)
            ->orderBy('id', 'asc')
            ->select('id', 'name', 'email')
            ->first();

        // Obtener actividad reciente: últimas deudas
        $recentTransactions = DB::table('transactions')
            ->where('business_id', $id)
            ->orderBy('created_at', 'desc')
            ->limit(5)
            ->get();

        // Obtener actividad reciente: últimos abonos
        $recentPayments = DB::table('payments')
            ->join('transactions', 'payments.transaction_id', '=', 'transactions.id')
            ->where('transactions.business_id', $id)
            ->select('payments.id', 'payments.amount', 'payments.created_at', 'transactions.client_name', 'payments.transaction_id')
            ->orderBy('payments.created_at', 'desc')
            ->limit(5)
            ->get();

        $summary = [
            'business' => $business,
            'admin_user' => $adminUser,
            'stats' => [
                'transactions_count' => $transactionsCount,
                'total_amount' => (float)$totalAmount,
                'total_paid' => (float)$totalPaid,
                'total_outstanding' => (float)$totalOutstanding,
                'users_count' => $usersCount,
                'debtors_count' => $debtorsCount,
            ],
            'users' => $users,
            'recent_transactions' => $recentTransactions,
            'recent_payments' => $recentPayments,
        ];

        return $this->successResponse($summary, 'Detalle del negocio');
    }

    /**
     * Update a business details integrally
     */
    public function update(Request $request, $id)
    {
        $request->validate([
            'name' => 'required|string|min:3',
            'owner_name' => 'required|string',
            'whatsapp_phone' => 'required|string',
            'status' => 'required|string|in:ACTIVE,suspended',
            'admin_email' => 'nullable|email',
            'admin_password' => 'nullable|string|min:8',
        ]);

        $business = DB::table('businesses')->where('id', $id)->first();
        if (!$business) {
            return $this->errorResponse('Negocio no encontrado', 'NOT_FOUND', null, 404);
        }

        try {
            DB::beginTransaction();

            // Actualizar datos del negocio
            DB::table('businesses')->where('id', $id)->update([
                'name' => $request->name,
                'owner_name' => $request->owner_name,
                'whatsapp_phone' => $request->whatsapp_phone,
                'status' => $request->status,
                'updated_at' => now()
            ]);

            // Obtener el admin principal (el primero del negocio)
            $adminUser = DB::table('users')
                ->where('business_id', $id)
                ->orderBy('id', 'asc')
                ->first();

            if ($adminUser) {
                $userData = [
                    'name' => $request->owner_name,
                    'updated_at' => now()
                ];

                if ($request->filled('admin_email')) {
                    // Validar unicidad del email excluyendo al propio usuario
                    $emailExists = DB::table('users')
                        ->where('email', $request->admin_email)
                        ->where('id', '!=', $adminUser->id)
                        ->exists();
                    
                    if ($emailExists) {
                        return $this->errorResponse('El email del administrador ya está en uso por otro usuario.', 'EMAIL_TAKEN', null, 422);
                    }
                    $userData['email'] = $request->admin_email;
                }

                if ($request->filled('admin_password')) {
                    $userData['password'] = Hash::make($request->admin_password);
                }

                DB::table('users')->where('id', $adminUser->id)->update($userData);
            }

            DB::commit();

            return $this->successResponse(null, 'Negocio y accesos actualizados exitosamente.');

        } catch (\Exception $e) {
            DB::rollBack();
            return $this->errorResponse('Error al actualizar negocio: ' . $e->getMessage(), 'UPDATE_BUSINESS_ERROR', null, 500);
        }
    }
}
