<?php

namespace App\Http\Controllers\SuperAdmin;

use App\Http\Controllers\Controller;
use App\Models\Transaction;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

class SaasAnalyticsController extends Controller
{
    public function kpis()
    {
        // 1. Total de negocios registrados
        $totalBusinesses = DB::table('businesses')->count();
        $activeBusinesses = DB::table('businesses')->where('status', 'ACTIVE')->count();
        $suspendedBusinesses = DB::table('businesses')->where('status', 'suspended')->count();

        // 2. MRR (Ingreso Recurrente Mensual)
        // Por ahora emulado basándonos en un costo fijo, por ej: $29.99 por negocio activo
        $mrr = $activeBusinesses * 29.99;

        // 3. Volumen de transacciones globales (la suma de total_amount en toda la DB)
        // Nota: asumiendo que Transaction model tiene total_amount.
        $globalVolume = Transaction::sum('total_amount');

        // 4. Nuevos Negocios por Mes (para el gráfico de líneas)
        // Agrupamos por mes
        $businessesByMonth = DB::table('businesses')
            ->select(
                DB::raw('strftime("%Y-%m", created_at) as month'),
                DB::raw('count(*) as count')
            )
            ->groupBy('month')
            ->orderBy('month', 'asc')
            ->get();

        return $this->successResponse([
            'total_businesses' => $totalBusinesses,
            'active_businesses' => $activeBusinesses,
            'suspended_businesses' => $suspendedBusinesses,
            'mrr' => $mrr,
            'global_volume' => $globalVolume,
            'growth_chart' => $businessesByMonth
        ], 'SaaS KPIs obtenidos exitosamente');
    }
}
