<?php

namespace App\Http\Controllers\Tenant;

use App\Http\Controllers\Controller;
use App\Http\Requests\Tenant\StoreTransactionRequest;
use App\Http\Requests\Tenant\UpdateTransactionRequest;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Cache;

class TransactionController extends Controller
{
    /**
     * Obtains the current business ID from the authenticated user.
     */
    private function getBusinessId()
    {
        return auth()->user()->business_id;
    }

    public function index(Request $request)
    {
        $businessId = $this->getBusinessId();
        if (!$businessId) {
            return $this->errorResponse('Usuario no tiene un negocio asignado.', 'NO_BUSINESS', null, 403);
        }

        $query = DB::table('transactions')->where('business_id', $businessId);

        if ($request->has('search') && !empty($request->search)) {
            $search = $request->search;
            $query->where(function($q) use ($search) {
                $q->where('client_name', 'LIKE', "%{$search}%")
                  ->orWhere('client_document', 'LIKE', "%{$search}%");
            });
        }
        
        if ($request->has('status') && in_array($request->status, ['PENDING', 'PAID'])) {
            $query->where('status', $request->status);
        }

        if ($request->has('start_date') && !empty($request->start_date)) {
            $query->whereDate('created_at', '>=', $request->start_date);
        }
        
        if ($request->has('end_date') && !empty($request->end_date)) {
            $query->whereDate('created_at', '<=', $request->end_date);
        }

        // KPIs for all filtered data (before pagination)
        $kpiQuery = clone $query;
        $allTxs = $kpiQuery->get();
        
        $salesTotal = $allTxs->sum('total_amount');
        $paidTotal = $allTxs->sum('paid_amount');
        $receivableTotal = $allTxs->sum(function($tx) {
            return max(0, $tx->total_amount - $tx->paid_amount);
        });

        $transactions = $query->orderBy('created_at', 'desc')->paginate(10);
        
        return $this->successResponse([
            'transactions' => $transactions,
            'kpis' => [
                'salesTotal' => $salesTotal,
                'paidTotal' => $paidTotal,
                'receivableTotal' => $receivableTotal,
                'salesCount' => $allTxs->count(),
                'paidCount' => $allTxs->where('status', 'PAID')->count(),
                'receivableCount' => $allTxs->where('status', 'PENDING')->count(),
                'collectionRate' => $salesTotal > 0 ? ($paidTotal / $salesTotal) * 100 : 0
            ]
        ], 'Lista de transacciones');
    }

    public function store(StoreTransactionRequest $request)
    {
        $businessId = $this->getBusinessId();
        
        $transactionId = DB::table('transactions')->insertGetId([
            'business_id' => $businessId,
            'client_name' => $request->client_name,
            'client_document' => $request->client_document,
            'client_phone' => $request->client_phone,
            'total_amount' => $request->total_amount,
            'paid_amount' => $request->status === 'PAID' ? $request->total_amount : 0,
            'status' => $request->status,
            'created_at' => now(),
            'updated_at' => now(),
        ]);

        Cache::forget("business_{$businessId}_dashboard");

        return $this->successResponse(['id' => $transactionId], 'Transacción creada', 201);
    }

    public function update(UpdateTransactionRequest $request, $id)
    {
        $businessId = $this->getBusinessId();
        $transaction = DB::table('transactions')->where('id', $id)->where('business_id', $businessId)->first();
        
        if (!$transaction) {
            return $this->errorResponse('Transacción no encontrada.', 'NOT_FOUND', null, 404);
        }

        $updateData = $request->validated();
        $updateData['updated_at'] = now();

        DB::table('transactions')->where('id', $id)->update($updateData);

        Cache::forget("business_{$businessId}_dashboard");

        return $this->successResponse(null, 'Transacción actualizada');
    }

    public function destroy($id)
    {
        $businessId = $this->getBusinessId();
        $deleted = DB::table('transactions')->where('id', $id)->where('business_id', $businessId)->delete();
        
        if (!$deleted) {
            return $this->errorResponse('Transacción no encontrada.', 'NOT_FOUND', null, 404);
        }

        Cache::forget("business_{$businessId}_dashboard");

        return $this->successResponse(null, 'Transacción eliminada');
    }

    public function addPayment(Request $request, $id)
    {
        $request->validate([
            'amount' => 'required|numeric|min:0.01'
        ]);

        $businessId = $this->getBusinessId();
        $transaction = DB::table('transactions')->where('id', $id)->where('business_id', $businessId)->first();
        
        if (!$transaction) {
            return $this->errorResponse('Transacción no encontrada.', 'NOT_FOUND', null, 404);
        }

        $newPaidAmount = $transaction->paid_amount + $request->amount;
        $status = $newPaidAmount >= $transaction->total_amount ? 'PAID' : $transaction->status;

        DB::table('transactions')->where('id', $id)->update([
            'paid_amount' => $newPaidAmount,
            'status' => $status,
            'updated_at' => now()
        ]);

        // Guardar historial de pagos podría ir aquí en una tabla extra, pero por ahora lo mantenemos simple.
        Cache::forget("business_{$businessId}_dashboard");

        return $this->successResponse(['paid_amount' => $newPaidAmount, 'status' => $status], 'Abono registrado');
    }

    public function calendar(Request $request)
    {
        $businessId = $this->getBusinessId();
        if (!$businessId) {
            return $this->errorResponse('Usuario no tiene un negocio asignado.', 'NO_BUSINESS', null, 403);
        }

        $query = DB::table('transactions')
            ->where('business_id', $businessId);

        // Opcional: filtrar por fechas (start_date, end_date) si se pasa por GET.
        if ($request->has('start_date') && !empty($request->start_date)) {
            $query->whereDate('created_at', '>=', $request->start_date);
        }
        if ($request->has('end_date') && !empty($request->end_date)) {
            $query->whereDate('created_at', '<=', $request->end_date);
        }

        $transactions = $query->orderBy('created_at', 'asc')->get();

        return $this->successResponse([
            'transactions' => $transactions
        ], 'Datos del calendario');
    }
}
