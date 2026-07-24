<?php

namespace App\Http\Controllers\Tenant;

use App\Http\Controllers\Controller;
use App\Models\ExchangeRate;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Http;

class ExchangeRateController extends Controller
{
    public function index()
    {
        $businessId = auth()->user()->business_id;
        
        $settingsRaw = DB::table('businesses')->where('id', $businessId)->value('settings');
        $settings = $settingsRaw ? json_decode($settingsRaw, true) : [];
        $exchangeRateType = $settings['exchange_rate_type'] ?? 'manual';

        if ($exchangeRateType === 'auto') {
            $this->syncAutoRate($businessId);
        }

        $history = ExchangeRate::where('business_id', $businessId)
            ->orderBy('created_at', 'desc')
            ->limit(20)
            ->get();

        return $this->successResponse([
            'type' => $exchangeRateType,
            'current_rate' => $history->first() ? $history->first()->rate : null,
            'history' => $history
        ], 'Tasas cargadas');
    }

    public function updateType(Request $request)
    {
        $request->validate([
            'type' => 'required|in:manual,auto'
        ]);

        $businessId = auth()->user()->business_id;
        $settingsRaw = DB::table('businesses')->where('id', $businessId)->value('settings');
        $settings = $settingsRaw ? json_decode($settingsRaw, true) : [];
        $settings['exchange_rate_type'] = $request->type;
        
        DB::table('businesses')->where('id', $businessId)->update([
            'settings' => json_encode($settings)
        ]);

        if ($request->type === 'auto') {
            $this->syncAutoRate($businessId);
        }

        return $this->successResponse(null, 'Configuración actualizada');
    }

    public function storeManualRate(Request $request)
    {
        $request->validate([
            'rate' => 'required|numeric|min:0.0001'
        ]);

        $businessId = auth()->user()->business_id;
        
        // Ensure type is manual
        $settingsRaw = DB::table('businesses')->where('id', $businessId)->value('settings');
        $settings = $settingsRaw ? json_decode($settingsRaw, true) : [];
        $exchangeRateType = $settings['exchange_rate_type'] ?? 'manual';
        
        if ($exchangeRateType !== 'manual') {
            return response()->json(['success' => false, 'message' => 'El tipo de tasa está en automático.'], 400);
        }

        $rate = ExchangeRate::create([
            'business_id' => $businessId,
            'rate' => $request->rate,
            'source' => 'manual',
        ]);

        return $this->successResponse($rate, 'Tasa actualizada manualmente');
    }

    private function syncAutoRate($businessId)
    {
        $latest = ExchangeRate::where('business_id', $businessId)
            ->where('source', 'auto')
            ->orderBy('created_at', 'desc')
            ->first();

        // If updated in the last 2 hours, don't fetch again
        if ($latest && $latest->created_at->diffInHours(now()) < 2) {
            return;
        }

        try {
            $rateValue = null;

            // Intento 1: ve.dolarapi.com
            $response = Http::get('https://ve.dolarapi.com/v1/dolares/oficial');
            if ($response->successful()) {
                $data = $response->json();
                if (isset($data['promedio'])) {
                    $rateValue = $data['promedio'];
                }
            }

            // Intento 2: criptoya.com como fallback
            if (!$rateValue) {
                $response = Http::get('https://criptoya.com/api/bcv');
                if ($response->successful()) {
                    $data = $response->json();
                    if (isset($data['ask'])) {
                        $rateValue = $data['ask'];
                    } elseif (isset($data['rate'])) {
                        $rateValue = $data['rate'];
                    } elseif (isset($data['bcv'])) {
                        $rateValue = is_array($data['bcv']) ? ($data['bcv']['ask'] ?? $data['bcv']['rate'] ?? null) : $data['bcv'];
                    } elseif (is_numeric($data)) {
                        $rateValue = $data;
                    }
                }
            }

            if ($rateValue && is_numeric($rateValue)) {
                if (!$latest || (float)$latest->rate !== (float)$rateValue) {
                    ExchangeRate::create([
                        'business_id' => $businessId,
                        'rate' => $rateValue,
                        'source' => 'auto',
                    ]);
                }
            }
        } catch (\Exception $e) {
            // Silently ignore failures to sync auto rate
        }
    }
}
