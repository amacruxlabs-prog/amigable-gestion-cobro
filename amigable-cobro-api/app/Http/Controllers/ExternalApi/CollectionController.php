<?php

namespace App\Http\Controllers\ExternalApi;

use App\Http\Controllers\Controller;
use App\Models\Transaction;
use App\Models\Payment;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\Rule;

class CollectionController extends Controller
{
    public function index(Request $request)
    {
        $business = $this->getBusinessFromUuid($request);

        $request->validate([
            'status' => 'nullable|string|in:PENDING,PAID',
            'start_date' => 'nullable|date',
            'end_date' => 'nullable|date|after_or_equal:start_date',
            'page' => 'nullable|integer|min:1',
        ]);

        $query = Transaction::where('business_id', $business->id);

        if ($request->filled('status')) {
            $query->where('status', $request->status);
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
                'due_date' => $t->created_at->toIso8601String(),
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

        $transaction = Transaction::create([
            'business_id' => $business->id,
            'client_name' => $validated['client_name'],
            'client_phone' => $validated['client_phone'] ?? null,
            'client_document' => $validated['client_document'] ?? null,
            'total_amount' => $validated['total_amount'],
            'paid_amount' => 0,
            'status' => 'PENDING',
        ]);

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
            'due_date' => $transaction->created_at->toIso8601String(),
            'created_at' => $transaction->created_at->toIso8601String(),
            'payments' => $transaction->payments()->orderBy('created_at', 'desc')->get()->map(fn($p) => [
                'id' => $p->id,
                'amount' => (float) $p->amount,
                'payment_date' => $p->created_at->toIso8601String(),
            ]),
        ]);
    }

    public function addPayment(Request $request, string $id)
    {
        $business = $this->getBusinessFromUuid($request);

        $validated = $request->validate([
            'amount' => 'required|numeric|min:0.01',
            'payment_method' => ['required', 'string', Rule::in(['CASH', 'TRANSFER', 'CARD', 'OTHER'])],
            'payment_date' => 'nullable|date',
        ]);

        $transaction = Transaction::where('id', $id)
            ->where('business_id', $business->id)
            ->firstOrFail();

        if ($transaction->status === 'PAID') {
            return $this->errorResponse('La cuenta ya está pagada', 'ALREADY_PAID', null, 400);
        }

        DB::transaction(function () use ($transaction, $validated) {
            Payment::create([
                'transaction_id' => $transaction->id,
                'amount' => $validated['amount'],
                'payment_method' => $validated['payment_method'],
                'payment_date' => $validated['payment_date'] ?? now(),
            ]);

            $transaction->increment('paid_amount', $validated['amount']);

            if ((float) $transaction->paid_amount >= (float) $transaction->total_amount) {
                $transaction->update(['status' => 'PAID']);
            }
        });

        $transaction->refresh();

        return $this->successResponse([
            'new_paid_amount' => (float) $transaction->paid_amount,
            'new_status' => $transaction->status,
        ], 'Pago registrado');
    }

    public function updateStatus(Request $request, string $id)
    {
        $business = $this->getBusinessFromUuid($request);

        $validated = $request->validate([
            'status' => ['required', 'string', Rule::in(['PENDING', 'PAID', 'CANCELLED', 'UNCOLLECTIBLE'])],
        ]);

        $transaction = Transaction::where('id', $id)
            ->where('business_id', $business->id)
            ->firstOrFail();

        $transaction->update(['status' => $validated['status']]);

        return $this->successResponse(null, 'Estado actualizado');
    }
}
