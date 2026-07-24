<?php

namespace App\Http\Controllers\ExternalApi;

use App\Http\Controllers\Controller;
use App\Models\Transaction;
use App\Models\Payment;
use App\Services\ActivityLogger;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Cache;
use Illuminate\Validation\Rule;

class CollectionController extends Controller
{
    public function index(Request $request)
    {
        $business = $this->getBusinessFromUuid($request);

        $request->validate([
            'status' => 'nullable|string|in:PENDING,PAID,CANCELLED,OVERDUE',
            'start_date' => 'nullable|date',
            'end_date' => 'nullable|date|after_or_equal:start_date',
            'page' => 'nullable|integer|min:1',
        ]);

        $query = Transaction::where('business_id', $business->id);

        if ($request->filled('status') && in_array($request->status, ['PENDING', 'PAID', 'CANCELLED', 'OVERDUE'])) {
            $query->where('status', $request->status);
        } else {
            $query->whereNotIn('status', ['CANCELLED']);
        }

        if ($request->filled('start_date')) {
            $query->where('created_at', '>=', $request->start_date);
        }

        if ($request->filled('end_date')) {
            $query->where('created_at', '<=', $request->end_date);
        }

        $perPage = 30;
        $page = $request->integer('page', 1);

        $total = $query->count();
        $lastPage = max(1, (int) ceil($total / $perPage));
        $page = min($page, $lastPage);

        $transactions = $query->orderBy('created_at', 'desc')
            ->skip(($page - 1) * $perPage)
            ->take($perPage)
            ->get()
            ->map(fn($t) => [
                'id' => $t->id,
                'client_name' => $t->client_name,
                'client_phone' => $t->client_phone,
                'client_document' => $t->client_document,
                'total_amount' => (float) $t->total_amount,
                'paid_amount' => (float) $t->paid_amount,
                'status' => $t->status,
                'due_date' => $t->due_date?->toIso8601String(),
                'created_at' => $t->created_at->toIso8601String(),
            ]);

        return $this->successResponse([
            'data' => $transactions,
            'meta' => [
                'total' => $total,
                'current_page' => $page,
                'last_page' => $lastPage,
            ],
        ]);
    }

    public function store(Request $request)
    {
        $business = $this->getBusinessFromUuid($request);

        $validated = $request->validate([
            'client_name' => 'required|string|max:255',
            'client_phone' => 'nullable|string|max:20',
            'client_document' => 'nullable|string|max:20',
            'total_amount' => 'required|numeric|min:0',
            'due_date' => 'required|date',
        ]);

        $exchangeRate = \App\Models\ExchangeRate::where('business_id', $business->id)->orderBy('created_at', 'desc')->first();
        $rate = $exchangeRate ? $exchangeRate->rate : null;
        $amount_bs = $rate ? $validated['total_amount'] * $rate : null;

        $transaction = Transaction::create([
            'business_id' => $business->id,
            'client_name' => $validated['client_name'],
            'client_phone' => $validated['client_phone'] ?? null,
            'client_document' => $validated['client_document'] ?? null,
            'total_amount' => $validated['total_amount'],
            'paid_amount' => 0,
            'status' => 'PENDING',
            'exchange_rate' => $rate,
            'amount_bs' => $amount_bs,
            'due_date' => $validated['due_date'] ?? null,
        ]);

        Cache::forget("business_{$business->id}_dashboard");

        ActivityLogger::log('created', "[API] Creó cuenta de {$validated['client_name']} por $" . number_format($validated['total_amount'], 2), 'transaction', (string)$transaction->id, null, $validated, $business->id);

        return $this->successResponse(
            ['id' => $transaction->id],
            'Cuenta creada',
            201
        );
    }

    public function show(Request $request, string $id)
    {
        $business = $this->getBusinessFromUuid($request);

        $transaction = Transaction::where('id', $id)
            ->where('business_id', $business->id)
            ->firstOrFail();

        return $this->successResponse([
            'id' => $transaction->id,
            'client_name' => $transaction->client_name,
            'client_phone' => $transaction->client_phone,
            'client_document' => $transaction->client_document,
            'total_amount' => (float) $transaction->total_amount,
            'paid_amount' => (float) $transaction->paid_amount,
            'status' => $transaction->status,
            'due_date' => $transaction->due_date?->toIso8601String(),
            'created_at' => $transaction->created_at->toIso8601String(),
            'payments' => $transaction->payments()->orderBy('created_at', 'desc')->get()->map(fn($p) => [
                'id' => $p->id,
                'amount' => (float) $p->amount,
                'payment_date' => $p->payment_date?->toIso8601String(),
            ]),
        ]);
    }

    public function addPayment(Request $request, string $id)
    {
        $business = $this->getBusinessFromUuid($request);

        $validated = $request->validate([
            'amount' => 'required|numeric|min:0.01',
            'payment_date' => 'nullable|date',
        ]);

        $transaction = Transaction::where('id', $id)
            ->where('business_id', $business->id)
            ->firstOrFail();

        if ($transaction->status === 'PAID') {
            return $this->errorResponse('La cuenta ya está pagada', 'ALREADY_PAID', null, 400);
        }

        if ($transaction->status === 'CANCELLED') {
            return $this->errorResponse('La cuenta está cancelada. No se pueden registrar abonos.', 'CANCELLED', null, 400);
        }

        $exchangeRate = \App\Models\ExchangeRate::where('business_id', $business->id)->orderBy('created_at', 'desc')->first();
        $rate = $exchangeRate ? $exchangeRate->rate : null;
        $amount_bs = $rate ? $validated['amount'] * $rate : null;

        DB::transaction(function () use ($transaction, $validated, $rate, $amount_bs) {
            Payment::create([
                'transaction_id' => $transaction->id,
                'amount' => $validated['amount'],
                'exchange_rate' => $rate,
                'amount_bs' => $amount_bs,
                'payment_date' => $validated['payment_date'] ?? now(),
            ]);

            $transaction->increment('paid_amount', $validated['amount']);

            if ((float) $transaction->paid_amount >= (float) $transaction->total_amount) {
                $transaction->update(['status' => 'PAID']);
            }
        });

        $transaction->refresh();
        
        Cache::forget("business_{$business->id}_dashboard");

        ActivityLogger::log('payment', "[API] Registró abono de $" . number_format($validated['amount'], 2) . " a cuenta de {$transaction->client_name}", 'transaction', (string)$transaction->id, null, [
            'payment_amount' => $validated['amount'],
            'new_paid_amount' => (float) $transaction->paid_amount,
            'new_status' => $transaction->status,
        ], $business->id);

        return $this->successResponse([
            'new_paid_amount' => (float) $transaction->paid_amount,
            'new_status' => $transaction->status,
        ], 'Pago registrado');
    }

    public function updateStatus(Request $request, string $id)
    {
        $business = $this->getBusinessFromUuid($request);

        $validated = $request->validate([
            'status' => ['required', 'string', Rule::in(['PENDING', 'PAID', 'OVERDUE', 'CANCELLED'])],
        ]);

        $transaction = Transaction::where('id', $id)
            ->where('business_id', $business->id)
            ->firstOrFail();

        $oldStatus = $transaction->status;
        $transaction->update(['status' => $validated['status']]);
        
        Cache::forget("business_{$business->id}_dashboard");

        ActivityLogger::log('status_change', "[API] Cambió estado de cuenta {$transaction->client_name} de {$oldStatus} a {$validated['status']}", 'transaction', (string)$transaction->id, [
            'status' => $oldStatus,
        ], [
            'status' => $validated['status'],
        ], $business->id);

        return $this->successResponse(null, 'Estado actualizado');
    }

    public function update(Request $request, string $id)
    {
        $business = $this->getBusinessFromUuid($request);

        $transaction = Transaction::where('id', $id)
            ->where('business_id', $business->id)
            ->firstOrFail();

        $validated = $request->validate([
            'client_name' => 'sometimes|string|max:255',
            'client_phone' => 'sometimes|nullable|string|max:20',
            'client_document' => 'sometimes|nullable|string|max:20',
            'total_amount' => 'sometimes|numeric|min:0',
            'due_date' => 'sometimes|nullable|date',
            'status' => 'sometimes|string|in:PENDING,PAID,OVERDUE,CANCELLED',
        ]);

        if (isset($validated['total_amount']) && $transaction->exchange_rate) {
            $validated['amount_bs'] = $validated['total_amount'] * $transaction->exchange_rate;
        }

        $transaction->update($validated);
        Cache::forget("business_{$business->id}_dashboard");

        ActivityLogger::log('updated', "[API] Actualizó cuenta de {$transaction->client_name}", 'transaction', (string)$transaction->id, null, $validated, $business->id);

        return $this->successResponse(null, 'Cuenta actualizada');
    }

    public function applyDiscount(Request $request)
    {
        $business = $this->getBusinessFromUuid($request);

        $validated = $request->validate([
            'transaction_ids' => 'required|array',
            'transaction_ids.*' => 'integer',
            'percentage' => 'required|numeric|min:0.01|max:100',
        ]);

        $txIds = $validated['transaction_ids'];
        $pct = (float) $validated['percentage'];

        try {
            DB::beginTransaction();

            $transactions = Transaction::whereIn('id', $txIds)
                ->where('business_id', $business->id)
                ->get();

            if ($transactions->isEmpty()) {
                return $this->errorResponse('No se encontraron cuentas válidas.', 'NO_TRANSACTIONS', null, 404);
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

                $tx->update([
                    'total_amount' => $newTotalAmount,
                    'status' => $newStatus,
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

            Cache::forget("business_{$business->id}_dashboard");

            ActivityLogger::log('discount', "[API] Aplicó descuento masivo del {$pct}% a " . count($transactions) . " cuentas", 'transaction', null, null, [
                'percentage' => $pct,
                'transaction_ids' => $txIds,
            ], $business->id);
        } catch (\Exception $e) {
            DB::rollBack();
            return $this->errorResponse("Error al aplicar descuento: " . $e->getMessage(), "DISCOUNT_ERROR", null, 500);
        }
    }
}
