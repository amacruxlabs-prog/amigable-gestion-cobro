<?php

namespace App\Http\Controllers\Tenant;

use App\Http\Controllers\Controller;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Cache;

class AnalyticsController extends Controller
{
    private function getBusinessId()
    {
        return auth()->user()->business_id;
    }

    public function dashboard(Request $request)
    {
        $businessId = $this->getBusinessId();
        if (!$businessId) {
            return $this->errorResponse('Usuario no tiene un negocio asignado.', 'NO_BUSINESS', null, 403);
        }

        $cacheKey = "business_{$businessId}_dashboard";

        // Implementamos el patrón Decorator (Cache) para los KPIs del dashboard
        $kpis = Cache::remember($cacheKey, now()->addHours(1), function () use ($businessId) {
            $allTxs = DB::table('transactions')
                ->where('business_id', $businessId)
                ->get();
            
            $salesTotal = $allTxs->sum('total_amount');
            $paidTotal = $allTxs->sum('paid_amount');
            $receivableTotal = $allTxs->sum(function($tx) {
                return max(0, $tx->total_amount - $tx->paid_amount);
            });

            return [
                'salesTotal' => $salesTotal,
                'paidTotal' => $paidTotal,
                'receivableTotal' => $receivableTotal,
                'salesCount' => $allTxs->count(),
                'paidCount' => $allTxs->where('status', 'PAID')->count(),
                'receivableCount' => $allTxs->where('status', 'PENDING')->count(),
                'collectionRate' => $salesTotal > 0 ? ($paidTotal / $salesTotal) * 100 : 0
            ];
        });

        return $this->successResponse([
            'kpis' => $kpis
        ], 'Métricas del dashboard (Cache)');
    }
    public function init(Request $request)
    {
        $businessId = $this->getBusinessId();
        if (!$businessId) {
            return $this->errorResponse('Usuario no tiene un negocio asignado.', 'NO_BUSINESS', null, 403);
        }

        // 1. Transactions (Paginated)
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
            $query->whereDate(DB::raw('COALESCE(due_date, created_at)'), '>=', $request->start_date);
        }
        
        if ($request->has('end_date') && !empty($request->end_date)) {
            $query->whereDate(DB::raw('COALESCE(due_date, created_at)'), '<=', $request->end_date);
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
                    'date' => $p->created_at,
                    'exchange_rate' => $p->exchange_rate,
                    'amount_bs' => $p->amount_bs
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

        // 2. Calendar Data
        $calendarQuery = DB::table('transactions')->where('business_id', $businessId);
        if ($request->has('start_date') && !empty($request->start_date)) {
            $calendarQuery->whereDate('created_at', '>=', $request->start_date);
        }
        if ($request->has('end_date') && !empty($request->end_date)) {
            $calendarQuery->whereDate('created_at', '<=', $request->end_date);
        }
        $calendarTxs = $calendarQuery->orderBy('created_at', 'asc')->get();

        // 3. Current Exchange Rate
        $currentRate = DB::table('exchange_rates')
            ->where('business_id', $businessId)
            ->orderBy('created_at', 'desc')
            ->value('rate');

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
            ],
            'calendar' => $calendarTxs,
            'current_exchange_rate' => $currentRate
        ], 'Dashboard init data');
    }
}
