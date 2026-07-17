<?php

namespace App\Http\Controllers\Tenant;

use App\Http\Controllers\Controller;
use App\Services\ActivityLogger;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

class SettingsController extends Controller
{
    public function index()
    {
        $businessId = auth()->user()->business_id;
        $tenantSettings = DB::table('businesses')->where('id', $businessId)->value('settings');
        $tenantSettings = $tenantSettings ? json_decode($tenantSettings, true) : [];

        // Decrypt AI API keys securely to mask them
        $aiModels = $tenantSettings['ai_models'] ?? [
            ['id' => 'deepseek', 'name' => 'DeepSeek', 'enabled' => false, 'api_key' => '', 'priority' => 1],
            ['id' => 'gemini', 'name' => 'Google Gemini', 'enabled' => false, 'api_key' => '', 'priority' => 2],
            ['id' => 'groq', 'name' => 'Groq (Llama 3)', 'enabled' => false, 'api_key' => '', 'priority' => 3],
        ];

        foreach ($aiModels as &$model) {
            if (!empty($model['api_key'])) {
                try {
                    $decrypted = \Illuminate\Support\Facades\Crypt::decryptString($model['api_key']);
                    // Create masked version: first 4 chars + ... + last 4 chars
                    $masked = substr($decrypted, 0, 4) . '...' . substr($decrypted, -4);
                    $model['api_key'] = $masked;
                } catch (\Exception $e) {
                    $model['api_key'] = '';
                }
            }
        }

        // Sort by priority just in case
        usort($aiModels, function($a, $b) {
            return $a['priority'] <=> $b['priority'];
        });

        // Leer global
        $globalKey = '';
        if (\Illuminate\Support\Facades\Storage::disk('local')->exists('global_settings.json')) {
            $globalSettings = json_decode(\Illuminate\Support\Facades\Storage::disk('local')->get('global_settings.json'), true);
            $globalKey = $globalSettings['openai_global_key'] ?? '';
        }

        return $this->successResponse([
            'aiTone' => $tenantSettings['aiTone'] ?? 'Analítico y Profesional',
            'aiAutoAlert' => $tenantSettings['aiAutoAlert'] ?? true,
            'aiSuggestDiscount' => $tenantSettings['aiSuggestDiscount'] ?? true,
            'ai_models' => $aiModels,
        ], 'Configuración cargada');
    }

    public function update(Request $request)
    {
        $businessId = auth()->user()->business_id;
        
        $request->validate([
            'settings' => 'required|array'
        ]);

        $settings = $request->settings;
        $businessId = auth()->user()->business_id;

        // Fetch old settings to retain existing keys if the user sent a masked string
        $oldSettingsRaw = DB::table('businesses')->where('id', $businessId)->value('settings');
        $oldSettings = $oldSettingsRaw ? json_decode($oldSettingsRaw, true) : [];
        $oldAiModels = [];
        if (isset($oldSettings['ai_models']) && is_array($oldSettings['ai_models'])) {
            foreach ($oldSettings['ai_models'] as $m) {
                $oldAiModels[$m['id']] = $m['api_key'] ?? '';
            }
        }

        // Encrypt AI API keys securely
        if (isset($settings['ai_models']) && is_array($settings['ai_models'])) {
            foreach ($settings['ai_models'] as &$model) {
                if (!empty($model['api_key'])) {
                    if (strpos($model['api_key'], '...') !== false) {
                        // User didn't change the key, restore from old settings
                        $model['api_key'] = $oldAiModels[$model['id']] ?? '';
                    } else {
                        // New key entered, encrypt it
                        $model['api_key'] = \Illuminate\Support\Facades\Crypt::encryptString($model['api_key']);
                    }
                } else {
                    $model['api_key'] = '';
                }
            }
        }

        // Guardamos en la base de datos la configuración del tenant.
        DB::table('businesses')->where('id', $businessId)->update(['settings' => json_encode($settings)]);

        ActivityLogger::log('updated', 'Actualizó la configuración del negocio', 'settings', (string)$businessId, null, [
            'settings_keys' => array_keys($settings),
        ]);

        return $this->successResponse(null, 'Configuración guardada correctamente en el backend');
    }

    public function getAiCredentials()
    {
        $businessId = auth()->user()->business_id;
        $tenantSettings = DB::table('businesses')->where('id', $businessId)->value('settings');
        $tenantSettings = $tenantSettings ? json_decode($tenantSettings, true) : [];

        $aiModels = $tenantSettings['ai_models'] ?? [];
        
        // 1. Try to find a valid tenant model
        usort($aiModels, function($a, $b) {
            return ($a['priority'] ?? 99) <=> ($b['priority'] ?? 99);
        });

        foreach ($aiModels as $model) {
            if (!empty($model['enabled']) && $model['enabled'] == true && !empty($model['api_key'])) {
                try {
                    $decrypted = \Illuminate\Support\Facades\Crypt::decryptString($model['api_key']);
                    return response()->json([
                        'valid' => true,
                        'provider' => $model['id'],
                        'api_key' => $decrypted,
                        'source' => 'tenant'
                    ]);
                } catch (\Exception $e) {
                    continue;
                }
            }
        }

        // 2. Fallback to system settings if nothing found
        if (\Illuminate\Support\Facades\Storage::disk('local')->exists('global_settings.json')) {
            $globalSettings = json_decode(\Illuminate\Support\Facades\Storage::disk('local')->get('global_settings.json'), true);
            $globalAiModels = $globalSettings['ai_models'] ?? [];
            
            usort($globalAiModels, function($a, $b) {
                return ($a['priority'] ?? 99) <=> ($b['priority'] ?? 99);
            });

            foreach ($globalAiModels as $model) {
                if (!empty($model['enabled']) && $model['enabled'] == true && !empty($model['api_key'])) {
                    try {
                        $decrypted = \Illuminate\Support\Facades\Crypt::decryptString($model['api_key']);
                        return response()->json([
                            'valid' => true,
                            'provider' => $model['id'],
                            'api_key' => $decrypted,
                            'source' => 'system'
                        ]);
                    } catch (\Exception $e) {
                        continue;
                    }
                }
            }
        }

        return response()->json([
            'valid' => false,
            'error' => 'No se encontraron credenciales de IA activas.'
        ], 401);
    }
}
