import { useState, useEffect } from 'react';
import { Save, RefreshCw, DollarSign, Activity, Settings2, History } from 'lucide-react';
import { api } from '../../lib/axios';
import { useUI } from '../../contexts/UIContext';

interface RateHistory {
  id: number;
  rate: number;
  source: 'manual' | 'auto';
  created_at: string;
}

export const RatesSettingsPanel = () => {
  const { toast } = useUI();
  const [loading, setLoading] = useState(true);
  const [savingType, setSavingType] = useState(false);
  const [savingManual, setSavingManual] = useState(false);
  const [type, setType] = useState<'manual' | 'auto'>('manual');
  const [currentRate, setCurrentRate] = useState<number | null>(null);
  const [manualRateInput, setManualRateInput] = useState('');
  const [history, setHistory] = useState<RateHistory[]>([]);

  useEffect(() => {
    fetchRatesData();
  }, []);

  const fetchRatesData = async () => {
    try {
      setLoading(true);
      const response = await api.get('/tenant/exchange-rates');
      const data = response.data.data;
      setType(data.type);
      setCurrentRate(data.current_rate);
      setHistory(data.history);
      if (data.type === 'manual' && data.current_rate) {
        setManualRateInput(data.current_rate.toString());
      }
    } catch (error: any) {
      toast(error.response?.data?.message || 'Error al cargar tasas de cambio', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateType = async (newType: 'manual' | 'auto') => {
    try {
      setSavingType(true);
      await api.put('/tenant/exchange-rates/type', { type: newType });
      setType(newType);
      toast('Tipo de actualización cambiado', 'success');
      // Refetch to get new auto rate if applicable
      await fetchRatesData();
    } catch (error: any) {
      toast(error.response?.data?.message || 'Error al cambiar tipo', 'error');
    } finally {
      setSavingType(false);
    }
  };

  const handleSaveManualRate = async () => {
    if (!manualRateInput || isNaN(Number(manualRateInput)) || Number(manualRateInput) <= 0) {
      toast('Ingrese una tasa válida mayor a 0', 'error');
      return;
    }
    
    try {
      setSavingManual(true);
      await api.post('/tenant/exchange-rates/manual', { rate: Number(manualRateInput) });
      toast('Tasa manual actualizada', 'success');
      await fetchRatesData();
    } catch (error: any) {
      toast(error.response?.data?.message || 'Error al guardar tasa manual', 'error');
    } finally {
      setSavingManual(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center p-12">
        <RefreshCw className="w-6 h-6 animate-spin text-slate-400" />
      </div>
    );
  }

  return (
    <div className="max-w-3xl card p-0 overflow-hidden border border-slate-200 shadow-sm rounded-xl animate-fade-in">
      <div className="bg-slate-50 border-b border-slate-200 px-6 py-4 flex items-center gap-3">
        <DollarSign className="w-5 h-5 text-emerald-600" />
        <div>
          <h3 className="font-bold text-slate-800">Tasa de Cambio (USD / VES)</h3>
          <p className="text-xs text-slate-500">
            Configura cómo se actualiza la tasa del BCV en el sistema.
          </p>
        </div>
      </div>
      
      <div className="p-6 space-y-8">
        {/* Modos */}
        <div>
          <h4 className="text-sm font-semibold text-slate-700 flex items-center gap-2 mb-3">
            <Settings2 className="w-4 h-4 text-slate-400" />
            Modo de Actualización
          </h4>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div 
              onClick={() => !savingType && type !== 'auto' && handleUpdateType('auto')}
              className={`p-4 rounded-xl border-2 transition-all flex flex-col gap-2 relative ${type === 'auto' ? 'border-emerald-500 bg-emerald-50/50' : 'border-slate-200 bg-white'} ${!savingType && type !== 'auto' ? 'cursor-pointer hover:border-slate-300' : ''} ${savingType ? 'opacity-70 cursor-not-allowed' : ''}`}
            >
              <div className="flex items-center justify-between">
                <span className={`font-bold flex items-center gap-2 ${type === 'auto' ? 'text-emerald-700' : 'text-slate-700'}`}>
                  Automático
                  {savingType && type !== 'auto' && <RefreshCw className="w-4 h-4 animate-spin text-emerald-600" />}
                </span>
                {type === 'auto' && !savingType && <span className="flex h-3 w-3 rounded-full bg-emerald-500"></span>}
                {savingType && type === 'auto' && <RefreshCw className="w-4 h-4 animate-spin text-emerald-600" />}
              </div>
              <p className="text-xs text-slate-500">
                Consulta automáticamente el BCV usando CriptoYa al abrir esta pestaña. Recomendado.
              </p>
            </div>
            
            <div 
              onClick={() => !savingType && type !== 'manual' && handleUpdateType('manual')}
              className={`p-4 rounded-xl border-2 transition-all flex flex-col gap-2 relative ${type === 'manual' ? 'border-indigo-500 bg-indigo-50/50' : 'border-slate-200 bg-white'} ${!savingType && type !== 'manual' ? 'cursor-pointer hover:border-slate-300' : ''} ${savingType ? 'opacity-70 cursor-not-allowed' : ''}`}
            >
              <div className="flex items-center justify-between">
                <span className={`font-bold flex items-center gap-2 ${type === 'manual' ? 'text-indigo-700' : 'text-slate-700'}`}>
                  Manual
                  {savingType && type !== 'manual' && <RefreshCw className="w-4 h-4 animate-spin text-indigo-600" />}
                </span>
                {type === 'manual' && !savingType && <span className="flex h-3 w-3 rounded-full bg-indigo-500"></span>}
                {savingType && type === 'manual' && <RefreshCw className="w-4 h-4 animate-spin text-indigo-600" />}
              </div>
              <p className="text-xs text-slate-500">
                Tú defines la tasa exacta. Útil si deseas usar una tasa diferente a la oficial.
              </p>
            </div>
          </div>
        </div>

        {/* Tasa Actual */}
        <div className="bg-slate-50 rounded-xl p-5 border border-slate-200 flex flex-col sm:flex-row gap-5 items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 bg-white rounded-full shadow-sm flex items-center justify-center text-slate-700 font-bold border border-slate-200">
              Bs.
            </div>
            <div>
              <p className="text-xs font-semibold text-slate-500 mb-1">TASA ACTUAL APLICADA</p>
              <div className="flex items-baseline gap-2">
                <span className="text-2xl font-black text-slate-800">
                  {currentRate ? Number(currentRate).toFixed(2) : '0.00'}
                </span>
                <span className="text-sm font-medium text-slate-500">Bs. / $</span>
              </div>
            </div>
          </div>

          {type === 'manual' && (
            <div className="flex items-center gap-2 w-full sm:w-auto">
              <input
                type="number"
                step="0.01"
                min="0.01"
                value={manualRateInput}
                onChange={(e) => setManualRateInput(e.target.value)}
                placeholder="Ej. 36.50"
                className="w-32 px-3 py-2 border border-slate-300 rounded-lg text-sm font-medium focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none"
              />
              <button
                onClick={handleSaveManualRate}
                disabled={savingManual}
                className="bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-lg text-sm font-bold flex items-center gap-2 transition-colors disabled:opacity-50"
              >
                {savingManual ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                Actualizar
              </button>
            </div>
          )}
          {type === 'auto' && (
            <div className="text-right">
              <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-100 text-emerald-700 text-xs font-bold border border-emerald-200">
                <Activity className="w-3.5 h-3.5" />
                Actualización Activa
              </span>
            </div>
          )}
        </div>

        {/* Historial */}
        <div>
          <h4 className="text-sm font-semibold text-slate-700 flex items-center gap-2 mb-3">
            <History className="w-4 h-4 text-slate-400" />
            Historial de Tasas
          </h4>
          
          <div className="border border-slate-200 rounded-xl overflow-hidden bg-white">
            <table className="w-full text-left text-sm">
              <thead className="bg-slate-50 text-slate-500 text-xs uppercase font-semibold">
                <tr>
                  <th className="px-4 py-3">Fecha</th>
                  <th className="px-4 py-3">Tasa (Bs./$)</th>
                  <th className="px-4 py-3">Origen</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-slate-700 font-medium">
                {history.length === 0 ? (
                  <tr>
                    <td colSpan={3} className="px-4 py-8 text-center text-slate-400">
                      No hay registros en el historial
                    </td>
                  </tr>
                ) : (
                  history.map((record) => {
                    const dateObj = new Date(record.created_at);
                    const formattedDate = dateObj.toLocaleDateString('es-ES', { day: 'numeric', month: 'long', year: 'numeric' }) + ' - ' + dateObj.toLocaleTimeString('es-ES', { hour: 'numeric', minute: '2-digit', hour12: true });
                    return (
                    <tr key={record.id} className="hover:bg-slate-50/50">
                      <td className="px-4 py-3 text-slate-500">
                        {formattedDate}
                      </td>
                      <td className="px-4 py-3 font-bold text-slate-800">
                        {Number(record.rate).toFixed(2)}
                      </td>
                      <td className="px-4 py-3">
                        {record.source === 'auto' ? (
                          <span className="inline-flex items-center gap-1 text-xs text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-md border border-emerald-100">
                            Automático (BCV)
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 text-xs text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded-md border border-indigo-100">
                            Manual
                          </span>
                        )}
                      </td>
                    </tr>
                  );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
};
