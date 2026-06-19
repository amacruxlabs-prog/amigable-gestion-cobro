<?php

namespace App\Http\Controllers\SuperAdmin;

use App\Http\Controllers\Controller;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Storage;

class GlobalSettingsController extends Controller
{
    private $settingsFile = 'global_settings.json';

    public function index()
    {
        $settings = $this->getSettings();
        
        // Decrypt keys for index
        if (isset($settings['ai_models']) && is_array($settings['ai_models'])) {
            foreach ($settings['ai_models'] as &$model) {
                if (!empty($model['api_key'])) {
                    try {
                        $decrypted = \Illuminate\Support\Facades\Crypt::decryptString($model['api_key']);
                        $model['api_key'] = substr($decrypted, 0, 4) . '...' . substr($decrypted, -4);
                    } catch (\Exception $e) {
                        $model['api_key'] = '';
                    }
                }
            }
        } else {
            $settings['ai_models'] = [
                ['id' => 'deepseek', 'name' => 'DeepSeek', 'enabled' => false, 'api_key' => '', 'priority' => 1],
                ['id' => 'gemini', 'name' => 'Google Gemini', 'enabled' => false, 'api_key' => '', 'priority' => 2],
                ['id' => 'groq', 'name' => 'Groq (Llama 3)', 'enabled' => false, 'api_key' => '', 'priority' => 3],
            ];
        }

        return $this->successResponse($settings, 'Ajustes globales obtenidos');
    }

    public function update(Request $request)
    {
        $request->validate([
            'openai_global_key' => 'nullable|string',
            'base_subscription_cost' => 'nullable|numeric',
            'ai_models' => 'nullable|array'
        ]);

        $settings = $this->getSettings();
        $settings['openai_global_key'] = $request->input('openai_global_key', $settings['openai_global_key'] ?? '');
        $settings['base_subscription_cost'] = $request->input('base_subscription_cost', $settings['base_subscription_cost'] ?? 29.99);

        if ($request->has('ai_models')) {
            $newAiModels = $request->input('ai_models');
            $oldAiModels = [];
            if (isset($settings['ai_models']) && is_array($settings['ai_models'])) {
                foreach ($settings['ai_models'] as $m) {
                    $oldAiModels[$m['id']] = $m['api_key'] ?? '';
                }
            }

            foreach ($newAiModels as &$model) {
                if (!empty($model['api_key'])) {
                    if (strpos($model['api_key'], '...') !== false) {
                        $model['api_key'] = $oldAiModels[$model['id']] ?? '';
                    } else {
                        $model['api_key'] = \Illuminate\Support\Facades\Crypt::encryptString($model['api_key']);
                    }
                } else {
                    $model['api_key'] = '';
                }
            }
            $settings['ai_models'] = $newAiModels;
        }

        Storage::disk('local')->put($this->settingsFile, json_encode($settings));

        return $this->successResponse($settings, 'Ajustes globales actualizados');
    }

    private function getSettings()
    {
        if (Storage::disk('local')->exists($this->settingsFile)) {
            return json_decode(Storage::disk('local')->get($this->settingsFile), true) ?: [];
        }
        return [
            'openai_global_key' => '',
            'base_subscription_cost' => 29.99
        ];
    }
}
