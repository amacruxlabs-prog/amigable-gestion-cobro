import React, { useState, useMemo } from 'react';
import { formatCurrency } from '../../utils/format';
import { Transaction } from '../../types';
import { X, Search } from 'lucide-react';
import { useUI } from '../../contexts/UIContext';

interface DiscountModalProps {
  isOpen: boolean;
  onClose: () => void;
  transactions: Transaction[];
  onApplyDiscount: (txIds: string[], percentage: number) => Promise<void>;
}

export const DiscountModal: React.FC<DiscountModalProps> = ({ isOpen, onClose, transactions, onApplyDiscount }) => {
  const { toast } = useUI();
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [percentage, setPercentage] = useState<string>('');
  const [loading, setLoading] = useState(false);

  // Filter only unresolved transactions or all? Usually discounts apply to pending
  const filteredTxs = useMemo(() => {
    return transactions.filter(t => 
      t.status !== 'Pagado' && t.clientName.toLowerCase().includes(searchTerm.toLowerCase())
    );
  }, [transactions, searchTerm]);

  const toggleSelection = (id: string) => {
    const newSet = new Set(selectedIds);
    if (newSet.has(id)) newSet.delete(id);
    else newSet.add(id);
    setSelectedIds(newSet);
  };

  const handleSelectAll = () => {
    if (selectedIds.size === filteredTxs.length && filteredTxs.length > 0) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(filteredTxs.map(t => t.id)));
    }
  };

  const formatMoney = (val: number) => {
    return formatCurrency(val);
  };

  const handleSubmit = async () => {
    const pct = parseFloat(percentage);
    if (isNaN(pct) || pct <= 0 || pct > 100) {
      toast("Por favor ingresa un porcentaje de descuento válido (entre 1 y 100).", "warning");
      return;
    }
    if (selectedIds.size === 0) {
      toast("Debes seleccionar al menos un accionista de la lista.", "warning");
      return;
    }
    setLoading(true);
    await onApplyDiscount(Array.from(selectedIds), pct);
    setLoading(false);
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-[100] flex items-center justify-center p-4">
      <div className="bg-white dark:bg-slate-900 border dark:border-slate-800 rounded-2xl shadow-xl w-full max-w-2xl overflow-hidden flex flex-col max-h-[90vh]">
        <div className="p-4 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between bg-slate-50 dark:bg-slate-900">
          <h3 className="font-bold text-slate-800 dark:text-slate-100 font-sans text-sm">Dar Descuento a Accionistas</h3>
          <button onClick={onClose} className="p-1 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-200 dark:hover:bg-slate-800 cursor-pointer">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-4 border-b border-slate-100 dark:border-slate-800 flex flex-col gap-3 shrink-0">
          <div className="space-y-1">
            <label className="text-xs font-bold text-slate-600 dark:text-slate-400">Porcentaje de Descuento (%)</label>
            <input
              type="number"
              value={percentage}
              onChange={(e) => setPercentage(e.target.value)}
              placeholder="Ej. 10 para 10%"
              min="1"
              max="100"
              className="w-full sm:w-1/3 font-bold"
            />
          </div>
          
          <div className="relative">
            <Search className="absolute left-3 top-2.5 w-4 h-4 text-slate-400 dark:text-slate-500" />
            <input
              type="text"
              placeholder="Buscar accionistas..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-9 pr-4 py-2"
            />
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-4 space-y-2 relative bg-slate-50/50 dark:bg-slate-950/30">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-bold text-slate-500 dark:text-slate-400">{filteredTxs.length} cuentas pendientes encontradas</span>
            <button onClick={handleSelectAll} className="text-xs font-bold text-indigo-600 hover:text-indigo-800 dark:text-indigo-400 dark:hover:text-indigo-300 cursor-pointer">
              {selectedIds.size === filteredTxs.length && filteredTxs.length > 0 ? "Deseleccionar Todos" : "Seleccionar Todos"}
            </button>
          </div>
          
          <div className="space-y-2">
            {filteredTxs.map(t => {
              const pending = Math.max(0, t.amount - (t.paidAmount || 0));
              const selected = selectedIds.has(t.id);
              return (
                <div 
                  key={t.id} 
                  className={`flex items-center gap-3 p-3 rounded-lg border cursor-pointer transition-colors shadow-sm
                    ${selected 
                      ? 'border-indigo-400 bg-indigo-50/70 dark:bg-indigo-950/40 dark:border-indigo-800' 
                      : 'border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 hover:border-indigo-300 dark:hover:border-indigo-700'}`}
                  onClick={() => toggleSelection(t.id)}
                >
                  <input 
                    type="checkbox" 
                    checked={selected} 
                    readOnly 
                    className="pointer-events-none" 
                  />
                  <div className="flex-1">
                    <p className={`text-sm font-bold ${selected ? 'text-indigo-900 dark:text-indigo-350' : 'text-slate-800 dark:text-slate-200'}`}>{t.clientName}</p>
                    <div className="flex items-center gap-2 mt-0.5 text-xs text-slate-500">
                      <span>Monto Total: <span className="font-mono dark:text-slate-400">{formatMoney(t.amount)}</span></span>
                      <span className="text-slate-300 dark:text-slate-700">•</span>
                      <span className="text-amber-600 dark:text-amber-450 font-bold font-mono">Pdte: {formatMoney(pending)}</span>
                    </div>
                  </div>
                </div>
              );
            })}
            {filteredTxs.length === 0 && (
               <div className="text-center py-8">
                 <p className="text-sm font-medium text-slate-500 dark:text-slate-400">No hay accionistas pendientes o no coinciden con la búsqueda.</p>
               </div>
            )}
          </div>
        </div>

        <div className="p-4 bg-white dark:bg-slate-900 border-t border-slate-100 dark:border-slate-800 flex items-center justify-end gap-3 shrink-0">
          <button onClick={onClose} className="px-4 py-2 rounded-lg text-sm font-bold text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer transition-colors">
            Cancelar
          </button>
          <button onClick={handleSubmit} disabled={loading || selectedIds.size === 0 || !percentage}
            className="btn-primary py-2 px-6 hover:opacity-95 shadow-sm">
            {loading ? "Aplicando..." : `Aplicar Descuento a ${selectedIds.size}`}
          </button>
        </div>
      </div>
    </div>
  );
};
