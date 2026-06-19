<?php

use Illuminate\Support\Facades\Route;
use App\Http\Controllers\Auth\AuthController;

Route::group(['prefix' => 'auth'], function () {
    Route::post('login', [AuthController::class, 'login']);

    Route::group(['middleware' => 'auth:api'], function () {
        Route::post('logout', [AuthController::class, 'logout']);
        Route::post('refresh', [AuthController::class, 'refresh']);
        Route::get('me', [AuthController::class, 'me']);
    });
});

use App\Http\Controllers\SuperAdmin\BusinessController;
use App\Http\Controllers\SuperAdmin\SaasAnalyticsController;
use App\Http\Controllers\SuperAdmin\GlobalSettingsController;

Route::group(['prefix' => 'superadmin', 'middleware' => 'auth:api'], function () {
    Route::get('kpis', [SaasAnalyticsController::class, 'kpis']);
    Route::get('businesses', [BusinessController::class, 'index']);
    Route::post('businesses', [BusinessController::class, 'store']);
    Route::put('businesses/{id}/toggle-status', [BusinessController::class, 'toggleStatus']);
    Route::post('impersonate', [BusinessController::class, 'impersonate']);
    
    Route::get('settings', [GlobalSettingsController::class, 'index']);
    Route::put('settings', [GlobalSettingsController::class, 'update']);
});

use App\Http\Controllers\Tenant\TransactionController;
use App\Http\Controllers\Tenant\AnalyticsController;
use App\Http\Controllers\Tenant\WhatsAppController;
use App\Http\Controllers\Tenant\SyncController;
use App\Http\Controllers\Tenant\SettingsController;

Route::group([
    'prefix' => 'tenant', 
    'middleware' => [
        'auth:api', 
        function ($request, $next) {
            $user = auth()->user();
            if ($user && $user->business_id) {
                $status = \Illuminate\Support\Facades\DB::table('businesses')->where('id', $user->business_id)->value('status');
                if ($status === 'suspended') {
                    return response()->json(['success' => false, 'message' => 'Este negocio ha sido suspendido por el administrador.'], 403);
                }
            }
            return $next($request);
        }
    ]
], function () {
    Route::post('whatsapp/broadcast', [WhatsAppController::class, 'broadcast']);
    Route::post('sync/import', [SyncController::class, 'import']);
    Route::get('settings', [SettingsController::class, 'index']);
    Route::get('ai-credentials', [SettingsController::class, 'getAiCredentials']);
    Route::put('settings', [SettingsController::class, 'update']);
    Route::get('analytics/dashboard', [AnalyticsController::class, 'dashboard']);
    Route::get('transactions/calendar', [TransactionController::class, 'calendar']);
    Route::get('transactions', [TransactionController::class, 'index']);
    Route::post('transactions', [TransactionController::class, 'store']);
    Route::put('transactions/{id}', [TransactionController::class, 'update']);
    Route::delete('transactions/{id}', [TransactionController::class, 'destroy']);
    Route::post('transactions/{id}/payment', [TransactionController::class, 'addPayment']);
});
