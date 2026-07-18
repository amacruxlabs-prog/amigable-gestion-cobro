<?php

namespace App\Http\Controllers\Tenant;

use App\Http\Controllers\Controller;
use App\Http\Requests\Tenant\StoreTransactionRequest;
use App\Http\Requests\Tenant\UpdateTransactionRequest;
use App\Services\ActivityLogger;
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
        
        if ($request->has('status') && in_array($request->status, ['PENDING', 'PAID', 'CANCELLED', 'OVERDUE'])) {
            $query->where('status', $request->status);
        } else {
            $query->whereNotIn('status', ['CANCELLED']);
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
        
        // Obtener historial de abonos para estas transacciones
        $txIds = collect($transactions->items())->pluck('id')->toArray();
        $payments = DB::table('payments')->whereIn('transaction_id', $txIds)->get();
        $paymentsGrouped = $payments->groupBy('transaction_id');

        // Obtener historial de descuentos para estas transacciones
        $discounts = DB::table('discounts')->whereIn('transaction_id', $txIds)->get();
        $discountsGrouped = $discounts->groupBy('transaction_id');

        foreach ($transactions->items() as $tx) {
            $tx->payments = $paymentsGrouped->get($tx->id, collect())->map(function($p) {
                return [
                    'id' => (int)$p->id,
                    'amount' => (float)$p->amount,
                    'date' => substr($p->created_at, 0, 10)
                ];
            })->toArray();

            $tx->discounts = $discountsGrouped->get($tx->id, collect())->map(function($d) {
                return [
                    'percentage' => (float)$d->percentage,
                    'amount' => (float)$d->amount,
                    'date' => substr($d->created_at, 0, 10)
                ];
            })->toArray();
        }
        
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
        
        $paidAmount = $request->paid_amount ?? 0;
        $status = $paidAmount >= $request->total_amount ? 'PAID' : ($request->status === 'PAID' ? 'PAID' : 'PENDING');

        $transactionId = DB::table('transactions')->insertGetId([
            'business_id' => $businessId,
            'client_name' => $request->client_name,
            'client_document' => $request->client_document,
            'client_phone' => $request->client_phone,
            'total_amount' => $request->total_amount,
            'paid_amount' => $paidAmount,
            'status' => $status,
            'created_at' => $request->created_at ? $request->created_at : now(),
            'due_date' => $request->due_date ?? $request->created_at ?? now(),
            'updated_at' => now(),
        ]);

        if ($paidAmount > 0) {
            DB::table('payments')->insert([
                'transaction_id' => $transactionId,
                'amount' => $paidAmount,
                'created_at' => now(),
                'updated_at' => now(),
            ]);
        }

        Cache::forget("business_{$businessId}_dashboard");

        ActivityLogger::log('created', "Creó la cuenta de {$request->client_name} por $" . number_format($request->total_amount, 2) . ($paidAmount > 0 ? " con abono inicial de $" . number_format($paidAmount, 2) : ""), 'transaction', (string)$transactionId, null, [
            'client_name' => $request->client_name,
            'client_document' => $request->client_document,
            'total_amount' => $request->total_amount,
            'paid_amount' => $paidAmount,
            'status' => $status,
        ]);

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

        ActivityLogger::log('updated', 'Actualizó la cuenta de ' . $transaction->client_name, 'transaction', (string)$id, [
            'client_name' => $transaction->client_name,
            'client_document' => $transaction->client_document,
            'client_phone' => $transaction->client_phone,
            'total_amount' => $transaction->total_amount,
            'status' => $transaction->status,
        ], $updateData);

        return $this->successResponse(null, 'Transacción actualizada');
    }

    public function destroy($id)
    {
        $businessId = $this->getBusinessId();
        $transaction = DB::table('transactions')->where('id', $id)->where('business_id', $businessId)->first();
        $deleted = DB::table('transactions')->where('id', $id)->where('business_id', $businessId)->delete();
        
        if (!$deleted) {
            return $this->errorResponse('Transacción no encontrada.', 'NOT_FOUND', null, 404);
        }

        Cache::forget("business_{$businessId}_dashboard");

        ActivityLogger::log('deleted', 'Eliminó la cuenta de ' . ($transaction->client_name ?? "ID {$id}"), 'transaction', (string)$id, [
            'client_name' => $transaction->client_name ?? null,
            'total_amount' => $transaction->total_amount ?? null,
            'status' => $transaction->status ?? null,
        ]);

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

        if ($transaction->status === 'CANCELLED') {
            return $this->errorResponse('La cuenta está cancelada. No se pueden registrar abonos.', 'CANCELLED', null, 400);
        }

        $newPaidAmount = $transaction->paid_amount + $request->amount;
        $status = $newPaidAmount >= $transaction->total_amount ? 'PAID' : $transaction->status;

        DB::table('transactions')->where('id', $id)->update([
            'paid_amount' => $newPaidAmount,
            'status' => $status,
            'updated_at' => now()
        ]);

        // Registrar abono individual en el historial de pagos
        DB::table('payments')->insert([
            'transaction_id' => $id,
            'amount' => $request->amount,
            'created_at' => now(),
            'updated_at' => now()
        ]);

        Cache::forget("business_{$businessId}_dashboard");

        ActivityLogger::log('payment', "Registró abono de $" . number_format($request->amount, 2) . " a cuenta de {$transaction->client_name}", 'transaction', (string)$id, [
            'paid_amount' => (float)$transaction->paid_amount,
            'status' => $transaction->status,
        ], [
            'paid_amount' => (float)$newPaidAmount,
            'status' => $status,
            'payment_amount' => (float)$request->amount,
        ]);

        return $this->successResponse(['paid_amount' => $newPaidAmount, 'status' => $status], 'Abono registrado');
    }

    public function updatePayment(Request $request, $txId, $paymentId)
    {
        $request->validate([
            'amount' => 'required|numeric|min:0.01',
        ]);

        $businessId = $this->getBusinessId();
        $transaction = DB::table('transactions')->where('id', $txId)->where('business_id', $businessId)->first();
        if (!$transaction) {
            return $this->errorResponse('Transacción no encontrada.', 'NOT_FOUND', null, 404);
        }

        $payment = DB::table('payments')->where('id', $paymentId)->where('transaction_id', $txId)->first();
        if (!$payment) {
            return $this->errorResponse('Abono no encontrado.', 'NOT_FOUND', null, 404);
        }

        $oldAmount = $payment->amount;

        DB::table('payments')->where('id', $paymentId)->update([
            'amount' => $request->amount,
            'updated_at' => now(),
        ]);

        $newPaidAmount = ($transaction->paid_amount - $oldAmount) + $request->amount;
        $newPaidAmount = max(0, $newPaidAmount);
        $status = $newPaidAmount >= $transaction->total_amount ? 'PAID' : ($newPaidAmount > 0 ? 'PENDING' : $transaction->status);

        DB::table('transactions')->where('id', $txId)->update([
            'paid_amount' => $newPaidAmount,
            'status' => $status,
            'updated_at' => now(),
        ]);

        Cache::forget("business_{$businessId}_dashboard");

        ActivityLogger::log('updated', "Editó abono de $" . number_format($request->amount, 2) . " en cuenta de {$transaction->client_name} (anterior: $" . number_format($oldAmount, 2) . ")", 'payment', (string)$paymentId, [
            'amount' => (float)$oldAmount,
        ], [
            'amount' => (float)$request->amount,
        ]);

        return $this->successResponse([
            'paid_amount' => (float)$newPaidAmount,
            'status' => $status,
        ], 'Abono actualizado');
    }

    public function destroyPayment($txId, $paymentId)
    {
        $businessId = $this->getBusinessId();
        $transaction = DB::table('transactions')->where('id', $txId)->where('business_id', $businessId)->first();
        if (!$transaction) {
            return $this->errorResponse('Transacción no encontrada.', 'NOT_FOUND', null, 404);
        }

        $payment = DB::table('payments')->where('id', $paymentId)->where('transaction_id', $txId)->first();
        if (!$payment) {
            return $this->errorResponse('Abono no encontrado.', 'NOT_FOUND', null, 404);
        }

        $newPaidAmount = max(0, $transaction->paid_amount - $payment->amount);
        $allPayments = DB::table('payments')->where('transaction_id', $txId)->sum('amount');
        $remainingPayments = $allPayments - $payment->amount;
        $newPaidAmount = max(0, $remainingPayments);
        $status = $newPaidAmount >= $transaction->total_amount ? 'PAID' : ($newPaidAmount > 0 ? 'PENDING' : 'PENDING');

        DB::table('payments')->where('id', $paymentId)->delete();

        DB::table('transactions')->where('id', $txId)->update([
            'paid_amount' => $newPaidAmount,
            'status' => $status,
            'updated_at' => now(),
        ]);

        Cache::forget("business_{$businessId}_dashboard");

        ActivityLogger::log('deleted', "Eliminó abono de $" . number_format($payment->amount, 2) . " de la cuenta de {$transaction->client_name}", 'payment', (string)$paymentId, [
            'amount' => (float)$payment->amount,
        ]);

        return $this->successResponse([
            'paid_amount' => (float)$newPaidAmount,
            'status' => $status,
        ], 'Abono eliminado');
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

    public function updateClient(Request $request)
    {
        $request->validate([
            'old_name' => 'required|string|max:255',
            'client_name' => 'required|string|max:255',
            'client_document' => 'nullable|string|max:255',
            'client_phone' => 'nullable|string|max:255',
        ]);

        $businessId = $this->getBusinessId();
        if (!$businessId) {
            return $this->errorResponse('Usuario no tiene un negocio asignado.', 'NO_BUSINESS', null, 403);
        }

        $oldName = $request->old_name;

        $updateData = [
            'client_name' => $request->client_name,
            'updated_at' => now(),
        ];

        if ($request->has('client_document')) {
            $updateData['client_document'] = $request->client_document;
        }

        if ($request->has('client_phone')) {
            $updateData['client_phone'] = $request->client_phone;
        }

        $updated = DB::table('transactions')
            ->where('business_id', $businessId)
            ->where('client_name', $oldName)
            ->update($updateData);

        Cache::forget("business_{$businessId}_dashboard");

        ActivityLogger::log('updated', "Actualizó datos del cliente {$oldName} → {$request->client_name} ({$updated} cuenta(s) afectada(s))", 'transaction', null, [
            'old_name' => $oldName,
            'client_document_old' => null,
            'client_phone_old' => null,
        ], [
            'client_name' => $request->client_name,
            'client_document' => $request->client_document,
            'client_phone' => $request->client_phone,
            'updated_count' => $updated,
        ]);

        return $this->successResponse([
            'updated_count' => $updated,
        ], "Cliente actualizado. {$updated} cuenta(s) afectada(s).");
    }

    public function applyDiscount(Request $request)
    {
        $request->validate([
            'transaction_ids' => 'required|array',
            'transaction_ids.*' => 'integer',
            'percentage' => 'required|numeric|min:0.01|max:100',
        ]);

        $businessId = $this->getBusinessId();
        if (!$businessId) {
            return $this->errorResponse('Usuario no tiene un negocio asignado.', 'NO_BUSINESS', null, 403);
        }

        $txIds = $request->transaction_ids;
        $pct = (float)$request->percentage;

        try {
            DB::beginTransaction();

            $transactions = DB::table('transactions')
                ->whereIn('id', $txIds)
                ->where('business_id', $businessId)
                ->get();

            if ($transactions->isEmpty()) {
                return $this->errorResponse('No se encontraron cuentas válidas para aplicar el descuento.', 'NO_TRANSACTIONS', null, 404);
            }

            foreach ($transactions as $tx) {
                if ($tx->status === 'PAID') {
                    continue;
                }

                $outstanding = max(0, $tx->total_amount - $tx->paid_amount);
                $discountAmount = $outstanding * ($pct / 100);

                if ($discountAmount <= 0) {
                    continue;
                }

                $newTotalAmount = $tx->total_amount - $discountAmount;
                $newStatus = $tx->paid_amount >= $newTotalAmount ? 'PAID' : 'PENDING';

                DB::table('transactions')->where('id', $tx->id)->update([
                    'total_amount' => $newTotalAmount,
                    'status' => $newStatus,
                    'updated_at' => now(),
                ]);

                DB::table('discounts')->insert([
                    'transaction_id' => $tx->id,
                    'percentage' => $pct,
                    'amount' => $discountAmount,
                    'created_at' => now(),
                    'updated_at' => now(),
                ]);
            }

            DB::commit();

            Cache::forget("business_{$businessId}_dashboard");

            ActivityLogger::log('discount', "Aplicó descuento masivo del {$pct}% a " . count($transactions) . " cuentas", 'transaction', null, null, [
                'percentage' => $pct,
                'transaction_ids' => $txIds,
                'affected_count' => count($transactions),
            ]);

            return $this->successResponse(null, 'Descuentos masivos aplicados e históricos registrados exitosamente.');

        } catch (\Exception $e) {
            DB::rollBack();
            return $this->errorResponse('Error al aplicar descuentos masivos: ' . $e->getMessage(), 'DISCOUNT_ERROR', null, 500);
        }
    }
}
