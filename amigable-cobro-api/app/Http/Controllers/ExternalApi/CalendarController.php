<?php

namespace App\Http\Controllers\ExternalApi;

use App\Http\Controllers\Controller;
use App\Models\Transaction;
use Illuminate\Http\Request;

class CalendarController extends Controller
{
    public function events(Request $request)
    {
        $business = $this->getBusinessFromUuid($request);

        $request->validate([
            'month' => 'required|integer|min:1|max:12',
            'year' => 'required|integer|min:2020|max:2100',
        ]);

        $transactions = Transaction::where('business_id', $business->id)
            ->whereYear('created_at', $request->year)
            ->whereMonth('created_at', $request->month)
            ->orderBy('created_at')
            ->get();

        $grouped = $transactions->groupBy(fn($t) => $t->created_at->toDateString());

        $events = $grouped->map(function ($items, $date) {
            $totalExpected = $items->sum('total_amount');
            $totalCollected = $items->sum('paid_amount');

            return [
                'date' => $date,
                'total_expected' => (float) $totalExpected,
                'total_collected' => (float) $totalCollected,
                'events' => $items->map(fn($t) => [
                    'transaction_id' => $t->id,
                    'client_name' => $t->client_name,
                    'amount' => (float) $t->total_amount,
                    'status' => $t->status,
                ]),
            ];
        })->values();

        return $this->successResponse($events);
    }
}
