<?php

namespace App\Http\Controllers\ExternalApi;

use App\Http\Controllers\Controller;
use App\Models\Transaction;
use Illuminate\Http\Request;

class AnalyticsController extends Controller
{
    public function kpis(Request $request)
    {
        $business = $this->getBusinessFromUuid($request);

        $request->validate([
            'period' => 'nullable|string|in:today,this_week,this_month,this_year,all_time',
        ]);

        $query = Transaction::where('business_id', $business->id);

        switch ($request->period) {
            case 'today':
                $query->whereDate('created_at', today());
                break;
            case 'this_week':
                $query->whereBetween('created_at', [now()->startOfWeek(), now()->endOfWeek()]);
                break;
            case 'this_month':
                $query->whereMonth('created_at', now()->month)
                      ->whereYear('created_at', now()->year);
                break;
            case 'this_year':
                $query->whereYear('created_at', now()->year);
                break;
            case 'all_time':
            default:
                break;
        }

        $totalEmitted = (float) $query->sum('total_amount');
        $totalCollected = (float) $query->sum('paid_amount');
        $totalPending = $totalEmitted - $totalCollected;
        $collectionRate = $totalEmitted > 0 ? round(($totalCollected / $totalEmitted) * 100, 1) : 0;

        $activeAccounts = Transaction::where('business_id', $business->id)
            ->where('status', 'PENDING')->count();

        $paidAccounts = Transaction::where('business_id', $business->id)
            ->where('status', 'PAID')->count();

        return $this->successResponse([
            'total_emitted' => $totalEmitted,
            'total_collected' => $totalCollected,
            'total_pending' => $totalPending,
            'collection_rate' => $collectionRate,
            'active_accounts' => $activeAccounts,
            'paid_accounts' => $paidAccounts,
        ]);
    }
}
