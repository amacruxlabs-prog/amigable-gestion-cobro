<?php

use Illuminate\Support\Facades\Route;
use App\Http\Controllers\Auth\AuthController;

Route::group(['prefix' => 'auth'], function () {
    Route::post('login', [AuthController::class, 'login']);
    Route::post('refresh', [AuthController::class, 'refresh']);

    Route::group(['middleware' => 'auth:api'], function () {
        Route::post('logout', [AuthController::class, 'logout']);
        Route::get('me', [AuthController::class, 'me']);
    });
});

use App\Http\Controllers\SuperAdmin\BusinessController;
use App\Http\Controllers\SuperAdmin\SaasAnalyticsController;
use App\Http\Controllers\SuperAdmin\GlobalSettingsController;

Route::group(['prefix' => 'superadmin', 'middleware' => 'auth:api'], function () {
    Route::get('kpis', [SaasAnalyticsController::class, 'kpis']);
    Route::get('businesses', [BusinessController::class, 'index']);
    Route::get('businesses/{id}', [BusinessController::class, 'show']);
    Route::post('businesses', [BusinessController::class, 'store']);
    Route::put('businesses/{id}', [BusinessController::class, 'update']);
    Route::put('businesses/{id}/toggle-status', [BusinessController::class, 'toggleStatus']);
    Route::post('impersonate', [BusinessController::class, 'impersonate']);
    
    Route::get('settings', [GlobalSettingsController::class, 'index']);
    Route::put('settings', [GlobalSettingsController::class, 'update']);

    // API Entities (Integraciones / Agentes)
    Route::get('api-entities', [\App\Http\Controllers\SuperAdmin\ApiEntityController::class, 'index']);
    Route::post('api-entities', [\App\Http\Controllers\SuperAdmin\ApiEntityController::class, 'store']);
    Route::put('api-entities/{id}', [\App\Http\Controllers\SuperAdmin\ApiEntityController::class, 'update']);
    Route::delete('api-entities/{id}', [\App\Http\Controllers\SuperAdmin\ApiEntityController::class, 'destroy']);
    Route::post('api-entities/{id}/tokens', [\App\Http\Controllers\SuperAdmin\ApiEntityController::class, 'storeToken']);
    Route::delete('api-entities/{id}/tokens/{tokenId}', [\App\Http\Controllers\SuperAdmin\ApiEntityController::class, 'revokeToken']);
});

use App\Http\Controllers\Tenant\TransactionController;
use App\Http\Controllers\Tenant\AnalyticsController;
use App\Http\Controllers\Tenant\WhatsAppController;
use App\Http\Controllers\Tenant\SyncController;
use App\Http\Controllers\Tenant\SettingsController;
use App\Http\Controllers\Tenant\UserController;

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
    Route::get('users', [UserController::class, 'index']);
    Route::post('users', [UserController::class, 'store']);
    Route::put('users/{id}', [UserController::class, 'update']);
    Route::put('users/{id}/status', [UserController::class, 'toggleStatus']);
    Route::put('users/{id}/password', [UserController::class, 'updatePassword']);
    Route::delete('users/{id}', [UserController::class, 'destroy']);
    
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
    Route::post('transactions/apply-discount', [TransactionController::class, 'applyDiscount']);
});

// ==== API Externa de Integración ====
Route::prefix('v1')->group(function () {
    
    // Directorio público de negocios (Id, Nombre, WhatsApp)
    Route::get('/public/businesses', function () {
        return response()->json([
            'success' => true,
            'data' => \Illuminate\Support\Facades\DB::table('businesses')
                ->where('status', 'ACTIVE')
                ->select('uuid', 'name', 'whatsapp_phone')
                ->get()
        ]);
    });

    // Rutas protegidas por el Token del Agente (Entidad API)
    Route::middleware('auth.api_entity')->group(function () {
    // Estas rutas son consumidas por agentes externos vía ApiEntityAuthMiddleware
    
    // Gestión de Cuentas y Cobros
    Route::get('collections', [\App\Http\Controllers\ExternalApi\CollectionController::class, 'index']);
    Route::post('collections', [\App\Http\Controllers\ExternalApi\CollectionController::class, 'store']);
    Route::get('collections/{id}', [\App\Http\Controllers\ExternalApi\CollectionController::class, 'show']);
    Route::post('collections/{id}/payments', [\App\Http\Controllers\ExternalApi\CollectionController::class, 'addPayment']);
    Route::put('collections/{id}/status', [\App\Http\Controllers\ExternalApi\CollectionController::class, 'updateStatus']);
    
    // Estadísticas
    Route::get('analytics/kpis', [\App\Http\Controllers\ExternalApi\AnalyticsController::class, 'kpis']);
    
    // Calendario
    Route::get('calendar/events', [\App\Http\Controllers\ExternalApi\CalendarController::class, 'events']);
    });
});
