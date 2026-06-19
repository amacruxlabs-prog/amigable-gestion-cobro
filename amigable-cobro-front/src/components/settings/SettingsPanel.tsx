import { useState, useEffect } from 'react';
import { Settings, Save, ArrowUp, ArrowDown, ShieldCheck, Power, Bot, CreditCard, Bell } from 'lucide-react';
import { api } from '../../lib/axios';
import { useUI } from '../../contexts/UIContext';

interface AiModel {
  id: string;
  name: string;
  enabled: boolean;
  api_key: string;
  priority: number;
}

export const SettingsPanel = ({ 
  apiPath = '/tenant/settings',
  billingContent,
}: { 
  apiPath?: string;
  billingContent?: React.ReactNode;
}) => {
  const { toast } = useUI();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [models, setModels] = useState<AiModel[]>([]);
  const [activeTab, setActiveTab] = useState<'ai' | 'billing' | 'notifications'>('ai');

  useEffect(() => {
    fetchSettings();
  }, [apiPath]);

  const fetchSettings = async () => {
    try {
      setLoading(true);
      const response = await api.get(apiPath);
      if (response.data?.data?.ai_models) {
        setModels(response.data.data.ai_models);
      } else {
        // Fallback default
        setModels([
          { id: 'deepseek', name: 'DeepSeek', enabled: false, api_key: '', priority: 1 },
          { id: 'gemini', name: 'Google Gemini', enabled: false, api_key: '', priority: 2 },
          { id: 'groq', name: 'Groq (Llama 3)', enabled: false, api_key: '', priority: 3 },
        ]);
      }
    } catch (error: any) {
      toast(error.response?.data?.message || 'Error al cargar configuración', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    try {
      setSaving(true);
      const payload = apiPath === '/superadmin/settings' 
        ? { ai_models: models }
        : { settings: { ai_models: models } };

      await api.put(apiPath, payload);
      toast('Configuración de IA guardada exitosamente', 'success');
      // Refetch to get masked keys back
      await fetchSettings();
    } catch (error: any) {
      toast(error.response?.data?.message || 'Error al guardar configuración', 'error');
    } finally {
      setSaving(false);
    }
  };

  const handleMove = (index: number, direction: 'up' | 'down') => {
    const newModels = [...models];
    if (direction === 'up' && index > 0) {
      const temp = newModels[index];
      newModels[index] = newModels[index - 1];
      newModels[index - 1] = temp;
    } else if (direction === 'down' && index < newModels.length - 1) {
      const temp = newModels[index];
      newModels[index] = newModels[index + 1];
      newModels[index + 1] = temp;
    }
    // Update priorities
    newModels.forEach((m, i) => m.priority = i + 1);
    setModels(newModels);
  };

  const handleToggle = (index: number) => {
    const newModels = [...models];
    newModels[index].enabled = !newModels[index].enabled;
    setModels(newModels);
  };

  const handleKeyChange = (index: number, val: string) => {
    const newModels = [...models];
    newModels[index].api_key = val;
    setModels(newModels);
  };

  const getLogo = (id: string) => {
    switch(id) {
      case 'deepseek': 
        return (
          <svg viewBox="0 0 24 24" className="w-6 h-6 text-blue-600" fill="currentColor">
            <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-1 14.5v-9l6 4.5-6 4.5z"/>
          </svg>
        );
      case 'gemini': 
        return (
          <svg viewBox="0 0 24 24" className="w-6 h-6 text-blue-500" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M9.937 15.5A2 2 0 0 0 8.5 14.063l-6.135-1.582a.5.5 0 0 1 0-.962L8.5 9.936A2 2 0 0 0 9.937 8.5l1.582-6.135a.5.5 0 0 1 .963 0L14.063 8.5A2 2 0 0 0 15.5 9.937l6.135 1.581a.5.5 0 0 1 0 .964L15.5 14.063a2 2 0 0 0-1.437 1.437l-1.582 6.135a.5.5 0 0 1-.963 0z"/>
          </svg>
        );
      case 'groq': 
        return (
          <svg viewBox="0 0 24 24" className="w-6 h-6 text-orange-500" fill="currentColor">
            <path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5"/>
          </svg>
        );
      default: 
        return <Bot className="w-6 h-6 text-slate-400" />;
    }
  };

  if (loading) {
    return <div className="p-6 text-slate-500 font-medium">Cargando configuración...</div>;
  }

  const isSuperadmin = apiPath.includes('superadmin');

  return (
    <div className="p-6 h-full flex flex-col">
      <div className="mb-6">
        <h2 className="text-2xl font-bold text-slate-800">
          {isSuperadmin ? 'Configuración Global (Superadmin)' : 'Ajustes del Negocio'}
        </h2>
        <p className="text-sm text-slate-500 mt-1">Gestiona las preferencias y motores subyacentes.</p>
      </div>

      <div className="flex items-center gap-1 border-b border-slate-200 mb-6">
        <button 
          onClick={() => setActiveTab('ai')}
          className={`flex items-center gap-2 px-4 py-2.5 border-b-2 font-semibold text-sm transition-colors ${activeTab === 'ai' ? 'border-indigo-600 text-indigo-600' : 'border-transparent text-slate-500 hover:text-slate-700 hover:border-slate-300'}`}
        >
          <Bot className="w-4 h-4" /> Motores IA
        </button>
        <button 
          onClick={() => setActiveTab('billing')}
          className={`flex items-center gap-2 px-4 py-2.5 border-b-2 font-semibold text-sm transition-colors ${activeTab === 'billing' ? 'border-indigo-600 text-indigo-600' : 'border-transparent text-slate-500 hover:text-slate-700 hover:border-slate-300'}`}
        >
          <CreditCard className="w-4 h-4" /> Facturación
        </button>
        <button 
          onClick={() => setActiveTab('notifications')}
          className={`flex items-center gap-2 px-4 py-2.5 border-b-2 font-semibold text-sm transition-colors ${activeTab === 'notifications' ? 'border-indigo-600 text-indigo-600' : 'border-transparent text-slate-500 hover:text-slate-700 hover:border-slate-300'}`}
        >
          <Bell className="w-4 h-4" /> Notificaciones
        </button>
      </div>

      <div className="flex-1 overflow-y-auto pb-10">
        {activeTab === 'ai' && (
          <div className="max-w-3xl card p-0 overflow-hidden border border-slate-200 shadow-sm rounded-xl">
            <div className="bg-slate-50 border-b border-slate-200 px-6 py-4 flex items-center justify-between">
              <div>
                <div className="flex items-center gap-2 text-indigo-600 mb-1">
                  <ShieldCheck className="w-5 h-5" />
                  <h3 className="font-bold text-sm">Motores LLM (Encriptación de Extremo a Extremo)</h3>
                </div>
                <p className="text-xs text-slate-500">
                  {isSuperadmin 
                    ? 'Estos motores serán utilizados como respaldo por los negocios que no configuren los suyos propios.'
                    : 'Activa y prioriza los motores de IA que deseas utilizar. Si falla el primero, usaremos el siguiente.'}
                </p>
              </div>
              <span className="text-xs font-semibold text-slate-500 bg-slate-200 px-2.5 py-1 rounded-full hidden sm:inline-block">Orden Cascada</span>
            </div>
            
            <div className="divide-y divide-slate-100">
              {models.map((model, index) => (
                <div key={model.id} className={`p-5 transition-colors ${model.enabled ? 'bg-white' : 'bg-slate-50/50'}`}>
                  <div className="flex items-start gap-4">
                    <div className="flex flex-col items-center gap-1 pt-1 w-8">
                      <button 
                        onClick={() => handleMove(index, 'up')}
                        disabled={index === 0}
                        className="p-1 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded disabled:opacity-30 disabled:hover:bg-transparent"
                      >
                        <ArrowUp className="w-4 h-4" />
                      </button>
                      <span className="text-center text-[10px] font-bold text-slate-400">{index + 1}</span>
                      <button 
                        onClick={() => handleMove(index, 'down')}
                        disabled={index === models.length - 1}
                        className="p-1 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded disabled:opacity-30 disabled:hover:bg-transparent"
                      >
                        <ArrowDown className="w-4 h-4" />
                      </button>
                    </div>

                    <div className="flex-1 space-y-3">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 flex items-center justify-center bg-white border border-slate-200 shadow-sm rounded-lg">
                            {getLogo(model.id)}
                          </div>
                          <div>
                            <h4 className={`font-bold ${model.enabled ? 'text-slate-800' : 'text-slate-500'}`}>{model.name}</h4>
                            <p className="text-[11px] text-slate-500">Motor de procesamiento NLP</p>
                          </div>
                        </div>
                        
                        <button 
                          onClick={() => handleToggle(index)}
                          className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 ${model.enabled ? 'bg-emerald-500' : 'bg-slate-300'}`}
                        >
                          <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${model.enabled ? 'translate-x-6' : 'translate-x-1'}`} />
                        </button>
                      </div>

                      {model.enabled && (
                        <div className="animate-fade-in pl-14">
                          <label className="block text-xs font-semibold text-slate-600 mb-1">API Key (Se guardará encriptada)</label>
                          <input 
                            type="text" 
                            value={model.api_key}
                            onChange={(e) => handleKeyChange(index, e.target.value)}
                            placeholder={`sk-...${model.id}...`}
                            className="w-full bg-slate-50 border border-slate-200 text-slate-800 text-sm rounded-lg px-3 py-2 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition-shadow font-mono"
                          />
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>

            <div className="bg-slate-50 border-t border-slate-200 px-6 py-4 flex items-center justify-between">
              <p className="text-xs text-slate-500 flex items-center gap-1">
                <ShieldCheck className="w-3.5 h-3.5" /> Encriptación AES-256 en BD.
              </p>
              <button 
                onClick={handleSave}
                disabled={saving}
                className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white px-5 py-2 rounded-lg font-bold text-sm transition-colors disabled:opacity-50"
              >
                {saving ? <Power className="w-4 h-4 animate-pulse" /> : <Save className="w-4 h-4" />}
                {saving ? 'Guardando...' : 'Guardar Llaves'}
              </button>
            </div>
          </div>
        )}

        {activeTab === 'billing' && (
          <div className="max-w-3xl card border border-slate-200 shadow-sm rounded-xl p-8 text-center text-slate-500">
            <CreditCard className="w-12 h-12 mx-auto mb-3 text-slate-300" />
            <h3 className="text-lg font-bold text-slate-700">Facturación y Suscripción</h3>
            <p className="text-sm mt-1 font-medium text-slate-400 dark:text-slate-500">Próximamente...</p>
          </div>
        )}

        {activeTab === 'notifications' && (
          <div className="max-w-3xl card border border-slate-200 shadow-sm rounded-xl p-8 text-center text-slate-500">
            <Bell className="w-12 h-12 mx-auto mb-3 text-slate-300" />
            <h3 className="text-lg font-bold text-slate-700">Alertas del Sistema</h3>
            <p className="text-sm mt-1 font-medium text-slate-400 dark:text-slate-500">Próximamente...</p>
          </div>
        )}
      </div>
    </div>
  );
};
