<?php

namespace App\Http\Controllers\Tenant;

use App\Http\Controllers\Controller;
use App\Services\ActivityLogger;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Cache;

class SyncController extends Controller
{
    public function import(Request $request)
    {
        $request->validate([
            'transactions' => 'required|array',
            'transactions.*.client_name' => 'required|string',
            'transactions.*.total_amount' => 'required|numeric',
        ]);

        $businessId = auth()->user()->business_id;

        $exchangeRate = \App\Models\ExchangeRate::where('business_id', $businessId)->orderBy('created_at', 'desc')->first();
        $rate = $exchangeRate ? $exchangeRate->rate : null;

        $imported = 0;
        $errors = 0;

        foreach ($request->transactions as $tx) {
            try {
                $amount_bs = $rate ? $tx['total_amount'] * $rate : null;

                DB::table('transactions')->insert([
                    'business_id' => $businessId,
                    'client_name' => $tx['client_name'],
                    'client_document' => $tx['client_document'] ?? null,
                    'client_phone' => $tx['client_phone'] ?? null,
                    'total_amount' => $tx['total_amount'],
                    'paid_amount' => $tx['paid_amount'] ?? 0,
                    'status' => $tx['status'] === 'PAID' ? 'PAID' : 'PENDING',
                    'exchange_rate' => $rate,
                    'amount_bs' => $amount_bs,
                    'created_at' => $tx['date'] ?? now(),
                    'due_date' => $tx['due_date'] ?? $tx['date'] ?? now(),
                    'updated_at' => now(),
                ]);
                $imported++;
            } catch (\Exception $e) {
                $errors++;
            }
        }

        if ($imported > 0) {
            Cache::forget("business_{$businessId}_dashboard");
        }

        ActivityLogger::log('import', "Importó {$imported} cuentas ({$errors} errores)", 'sync', null, null, [
            'imported' => $imported,
            'errors' => $errors,
        ]);

        return $this->successResponse([
            'imported' => $imported,
            'errors' => $errors
        ], "Importación finalizada. {$imported} exitosos, {$errors} errores.");
    }
}
