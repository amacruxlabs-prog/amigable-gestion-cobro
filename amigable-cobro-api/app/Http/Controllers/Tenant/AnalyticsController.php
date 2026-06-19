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
}
