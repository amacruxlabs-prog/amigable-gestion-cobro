import React from 'react';
import { Transaction, FilterState } from '../types';
import { formatCurrency, formatDate, getVenezuelaTodayStr } from '../utils/format';
import { Search, ChevronLeft, ChevronRight, Filter, Calendar, DollarSign, PlusCircle, Trash2, CheckCircle2, AlertCircle, XCircle, Phone, Plus, Check, X, History, MapPin, User, UserPlus, Users, Loader2 } from 'lucide-react';
import { useTransactionTable } from '../hooks/useTransactionTable';
import { AddTransactionModal } from './AddTransactionModal';
import { useUI } from '../contexts/UIContext';

interface TransactionTableProps {
  transactions: Transaction[];
  loading?: boolean;
  onToggleStatus: (id: string) => void;
  onRegisterPayment: (id: string, amount: number, date: string) => void;
  onUpdatePayment: (txId: string, paymentId: number, amount: number) => void;
  onDeletePayment: (txId: string, paymentId: number) => void;
  onUpdateTransaction: (id: string, data: any) => void;
  onDeleteTransaction: (id: string) => void;
  onAddTransaction: (newTx: Omit<Transaction, 'id'>) => void;
  onUpdateClient?: (oldName: string, data: { client_name: string; client_document?: string; client_phone?: string }) => void;
  filter: FilterState;
  onFilterChange: (newFilter: FilterState) => void;
  isSuperadmin?: boolean;
  onShowDiscountModal?: () => void;
  currentPage?: number;
  totalPages?: number;
  onPageChange?: (page: number) => void;
}

const parsePhoneNumber = (phoneStr?: string) => {
  if (!phoneStr) return { code: '+58', number: '' };
  const clean = phoneStr.trim();
  const codes = ['+58', '+57', '+52', '+54', '+56', '+51', '+593', '+55', '+506', '+507', '+503', '+502', '+1', '+34'];
  for (const code of codes) {
    if (clean.startsWith(code)) {
      return { code, number: clean.substring(code.length) };
    }
  }
  if (clean.startsWith('+')) {
    const match = clean.match(/^(\+\d{1,4})(.*)$/);
    if (match) {
      return { code: match[1], number: match[2].trim() };
    }
  }
  return { code: '+58', number: clean };
};

export const TransactionTable: React.FC<TransactionTableProps> = ({
  transactions,
  loading,
  onToggleStatus,
  onRegisterPayment,
  onUpdatePayment,
  onDeletePayment,
  onUpdateTransaction,
  onDeleteTransaction,
  onAddTransaction,
  onUpdateClient,
  filter,
  onFilterChange,
  isSuperadmin,
  onShowDiscountModal,
  currentPage,
  totalPages,
  onPageChange,
}) => {
  const {
    startIndex,
    itemsPerPage,
    paginatedTransactions,
    filteredTransactions,
    handlePageChange,
    handleFilterUpdate,

    // Form state
    showAddForm,
    setShowAddForm,
    newClient,
    setNewClient,
    newCedula,
    setNewCedula,
    newAmount,
    setNewAmount,
    newPaidAmount,
    setNewPaidAmount,
    newStatus,
    setNewStatus,
    newDate,
    setNewDate,
    newPhone,
    setNewPhone,
    phoneCountryCode,
    setPhoneCountryCode,
    newLocation,
    setNewLocation,
    formError,
    setFormError,
    handleFormSubmit,

    // Inline Abono
    activeAbonoTxId,
    setActiveAbonoTxId,
    inlineAbonoVal,
    setInlineAbonoVal,
    inlineAbonoErr,
    setInlineAbonoErr,
    showHistoryTxId,
    setShowHistoryTxId,
  } = useTransactionTable({
    transactions,
    onAddTransaction,
    filter,
    onFilterChange,
    currentPage,
    totalPages,
    onPageChange
  });

  const { confirm } = useUI();

  const [selectedClientDetails, setSelectedClientDetails] = React.useState<any | null>(null);
  const [modalViewMode, setModalViewMode] = React.useState<'single' | 'all'>('all');
  const [editingPayment, setEditingPayment] = React.useState<{ txId: string; paymentId: number; amount: number } | null>(null);
  const [editingTxInModal, setEditingTxInModal] = React.useState<any | null>(null);
  const [editingClient, setEditingClient] = React.useState(false);
  const [savingClient, setSavingClient] = React.useState(false);
  const [savingPayment, setSavingPayment] = React.useState(false);
  const [savingTx, setSavingTx] = React.useState(false);
  const [refreshingModal, setRefreshingModal] = React.useState(false);
  const selectedClientNameRef = React.useRef<string | null>(null);

  const groupedClients = React.useMemo(() => {
    const map = new Map<string, {
      name: string; cedula: string; phone: string; location: string;
      totalAmount: number; totalPaid: number;
      transactions: typeof paginatedTransactions;
      status: string; paymentsCount: number;
      payments: { id: number; amount: number; date: string }[];
      discounts: { percentage: number; amount: number; date: string }[];
    }>();
    paginatedTransactions.forEach(t => {
      const key = (t.clientName || '').trim().toLowerCase();
      if (!key) return;
      if (!map.has(key)) {
        map.set(key, {
          name: t.clientName,
          cedula: t.cedula || '',
          phone: t.phone || '',
          location: t.location || '',
          totalAmount: 0,
          totalPaid: 0,
          transactions: [],
          status: 'Por cobrar',
          paymentsCount: 0,
          payments: [],
          discounts: [],
        });
      }
      const g = map.get(key)!;
      g.transactions.push(t);
      g.totalAmount += t.amount;
      g.totalPaid += t.status === 'Pagado' ? t.amount : (t.paidAmount || 0);
      if (t.cedula && !g.cedula) g.cedula = t.cedula;
      if (t.phone && !g.phone) g.phone = t.phone;
      if (t.location && !g.location) g.location = t.location;
      if (t.payments) {
        g.payments.push(...t.payments);
        g.paymentsCount += t.payments.length;
      }
      if (t.discounts) g.discounts.push(...t.discounts);
    });
    map.forEach(g => {
      const allPaid = g.transactions.every(tx => tx.status === 'Pagado');
      const allCancelled = g.transactions.every(tx => tx.status === 'Cancelado');
      g.status = allCancelled ? 'Cancelado' : allPaid ? 'Pagado' : 'Por cobrar';
    });
    return Array.from(map.values()).sort((a, b) => a.name.localeCompare(b.name));
  }, [paginatedTransactions]);

  React.useEffect(() => {
    if (!selectedClientNameRef.current) return;
    const clientName = selectedClientNameRef.current;
    const clientTxs = transactions.filter(t => t.clientName && t.clientName.trim().toLowerCase() === clientName.trim().toLowerCase());
    if (clientTxs.length === 0) {
      setSelectedClientDetails(null);
      selectedClientNameRef.current = null;
      return;
    }
    const representative = clientTxs.find(t => t.phone || t.cedula || t.location) || clientTxs[0];
    let totalDebt = 0;
    let totalPaid = 0;
    clientTxs.forEach(t => {
      totalDebt += t.amount;
      totalPaid += t.status === 'Pagado' ? t.amount : (t.paidAmount || 0);
    });
    const totalOutstanding = Math.max(0, totalDebt - totalPaid);
    const paymentRate = totalDebt > 0 ? (totalPaid / totalDebt) * 100 : 0;
    setRefreshingModal(false);
    setSelectedClientDetails(prev => prev ? {
      ...prev,
      phone: representative.phone,
      cedula: representative.cedula,
      location: representative.location,
      transactions: clientTxs,
      stats: { totalDebt, totalPaid, totalOutstanding, paymentRate }
    } : null);
  }, [transactions]);

  const handleClientClick = (clientName: string, clickedTxId?: string | number, preFilteredTxs?: any[]) => {
    const clientTxs = preFilteredTxs || transactions.filter(t => t.clientName && t.clientName.trim().toLowerCase() === clientName.trim().toLowerCase());
    if (clientTxs.length === 0) return;
    const representative = clientTxs.find(t => t.phone || t.cedula || t.location) || clientTxs[0];

    let totalDebt = 0;
    let totalPaid = 0;
    clientTxs.forEach(t => {
      totalDebt += t.amount;
      totalPaid += t.status === 'Pagado' ? t.amount : (t.paidAmount || 0);
    });
    const totalOutstanding = Math.max(0, totalDebt - totalPaid);
    const paymentRate = totalDebt > 0 ? (totalPaid / totalDebt) * 100 : 0;

    selectedClientNameRef.current = representative.clientName;
    setSelectedClientDetails({
      name: representative.clientName,
      phone: representative.phone,
      cedula: representative.cedula,
      location: representative.location,
      transactions: clientTxs,
      clickedTxId: clickedTxId || clientTxs[0].id,
      stats: {
        totalDebt,
        totalPaid,
        totalOutstanding,
        paymentRate
      }
    });
  };

  const [clientSelectionMode, setClientSelectionMode] = React.useState<'existing' | 'new'>('existing');
  const [clientSearch, setClientSearch] = React.useState('');
  const [selectedClient, setSelectedClient] = React.useState<{ name: string; phone?: string; cedula?: string; location?: string } | null>(null);

  const uniqueClients = React.useMemo(() => {
    const map = new Map<string, { name: string; phone?: string; cedula?: string; location?: string }>();
    transactions.forEach(t => {
      if (!t.clientName) return;
      const key = t.clientName.trim().toLowerCase();
      if (!map.has(key)) {
        map.set(key, {
          name: t.clientName.trim(),
          phone: t.phone,
          cedula: t.cedula,
          location: t.location
        });
      } else {
        const existing = map.get(key)!;
        if (!existing.phone && t.phone) existing.phone = t.phone;
        if (!existing.cedula && t.cedula) existing.cedula = t.cedula;
        if (!existing.location && t.location) existing.location = t.location;
      }
    });
    return Array.from(map.values()).sort((a, b) => a.name.localeCompare(b.name));
  }, [transactions]);

  const filteredClients = React.useMemo(() => {
    if (!clientSearch.trim()) return uniqueClients;
    const s = clientSearch.toLowerCase();
    return uniqueClients.filter(c => 
      c.name.toLowerCase().includes(s) || 
      (c.cedula && c.cedula.toLowerCase().includes(s)) ||
      (c.phone && c.phone.includes(s))
    );
  }, [uniqueClients, clientSearch]);

  React.useEffect(() => {
    if (showAddForm) {
      setClientSelectionMode(uniqueClients.length > 0 ? 'existing' : 'new');
      setClientSearch('');
      setSelectedClient(null);
      
      // Reset form fields in hook
      setNewClient('');
      setNewCedula('');
      setNewAmount('');
      setNewPaidAmount('');
      setNewPhone('');
      setPhoneCountryCode('+58');
      setNewLocation('');
      setNewStatus('Cobrar');
      setNewDate(getVenezuelaTodayStr());
      setFormError('');
    }
  }, [showAddForm, uniqueClients.length]);

  const formatMoney = (val: number) => {
    return formatCurrency(val);
  };

  const getPastDateString = (daysAgo: number): string => {
    const todayStr = getVenezuelaTodayStr();
    const [year, month, day] = todayStr.split('-').map(Number);
    const d = new Date(year, month - 1, day);
    d.setDate(d.getDate() - daysAgo);
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const dayVal = String(d.getDate()).padStart(2, '0');
    return `${y}-${m}-${dayVal}`;
  };

  const handleSetPresetRange = (days: number | null) => {
    if (days === null) {
      handleFilterUpdate({ startDate: '', endDate: '' });
    } else {
      const todayStr = getPastDateString(0);
      const pastStr = getPastDateString(days);
      handleFilterUpdate({ startDate: pastStr, endDate: todayStr });
    }
  };

  const todayStr = getPastDateString(0);
  const isWeeklyActive = filter.startDate === getPastDateString(7) && filter.endDate === todayStr;
  const isMonthlyActive = filter.startDate === getPastDateString(30) && filter.endDate === todayStr;
  const isQuarterlyActive = filter.startDate === getPastDateString(90) && filter.endDate === todayStr;
  const isAllActive = !filter.startDate && !filter.endDate;

  return (
    <div className="card shadow-sm overflow-hidden flex flex-col justify-between p-0 dark:border-slate-800">
      
      {/* Table header & filters */}
      <div className="p-6 border-b border-slate-150 flex flex-col md:flex-row md:items-center justify-between gap-4 dark:border-slate-800">
        <div>
          <h4 className="text-base font-bold text-slate-950 dark:text-slate-100">Registro General de Cuentas</h4>
          <p className="text-xs text-slate-500 mt-1 dark:text-slate-400">Filtra transacciones por rango de fechas, estado, o busca clientes directamente.</p>
        </div>

        {/* Buttons */}
        <div className="flex gap-2">
          {isSuperadmin && (
            <button
              onClick={() => onShowDiscountModal && onShowDiscountModal()}
              className="btn btn-success"
            >
              <DollarSign className="w-4 h-4" />
              Dar Descuento
            </button>
          )}
          <button
            onClick={() => setShowAddForm(!showAddForm)}
            className="btn btn-primary"
          >
            <PlusCircle className="w-4 h-4" />
            Nuevo Registro
          </button>
        </div>
      </div>

      {/* Manual Sales Creator Form (shown as a SaaS Modal) */}
      {showAddForm && (
        <AddTransactionModal
          transactions={transactions}
          onAddTransaction={async (tx) => {
            await onAddTransaction(tx);
            setShowAddForm(false);
          }}
          onClose={() => setShowAddForm(false)}
        />
      )}

      {/* Filter Inputs Bar */}
      <div className="px-6 py-4 bg-slate-50 border-b border-slate-200/80 flex flex-col gap-3.5 dark:bg-slate-900/50 dark:border-slate-800">
        
        {/* Quick Presets row */}
        <div className="flex flex-wrap items-center justify-between gap-3 bg-white p-2.5 rounded-xl border border-slate-200/60 shadow-2xs dark:bg-slate-800 dark:border-slate-700">
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-xs font-bold text-slate-650 uppercase tracking-wider text-[10px] dark:text-slate-400">Filtros por Período:</span>
            <div className="flex flex-wrap gap-1 animate-fade-in text-[11px]">
              <button
                type="button"
                onClick={() => handleSetPresetRange(null)}
                className={`py-1 px-3.5 rounded-lg font-bold transition-all duration-150 cursor-pointer ${
                  isAllActive
                    ? 'bg-[#6366F1] text-white shadow-xs dark:bg-[#6366F1]'
                    : 'bg-slate-50 text-slate-600 border border-slate-200/60 hover:bg-slate-100 hover:text-slate-800 dark:bg-slate-800/80 dark:text-slate-355 dark:border-slate-700 dark:hover:bg-slate-700 dark:hover:text-slate-100'
                }`}
              >
                Todos
              </button>
              <button
                type="button"
                onClick={() => handleSetPresetRange(7)}
                className={`py-1 px-3.5 rounded-lg font-bold transition-all duration-150 cursor-pointer ${
                  isWeeklyActive
                    ? 'bg-[#6366F1] text-white shadow-xs dark:bg-[#6366F1]'
                    : 'bg-slate-50 text-slate-655 border border-slate-200/60 hover:bg-slate-100 hover:text-slate-800 dark:bg-slate-800/80 dark:text-slate-355 dark:border-slate-700 dark:hover:bg-slate-700 dark:hover:text-slate-100'
                }`}
              >
                Semanal
              </button>
              <button
                type="button"
                onClick={() => handleSetPresetRange(30)}
                className={`py-1 px-3.5 rounded-lg font-bold transition-all duration-150 cursor-pointer ${
                  isMonthlyActive
                    ? 'bg-[#6366F1] text-white shadow-xs dark:bg-[#6366F1]'
                    : 'bg-slate-50 text-slate-655 border border-slate-200/60 hover:bg-slate-100 hover:text-slate-800 dark:bg-slate-800/80 dark:text-slate-355 dark:border-slate-700 dark:hover:bg-slate-700 dark:hover:text-slate-100'
                }`}
              >
                Mensual
              </button>
              <button
                type="button"
                onClick={() => handleSetPresetRange(90)}
                className={`py-1 px-3.5 rounded-lg font-bold transition-all duration-150 cursor-pointer ${
                  isQuarterlyActive
                    ? 'bg-[#6366F1] text-white shadow-xs dark:bg-[#6366F1]'
                    : 'bg-slate-50 text-slate-655 border border-slate-200/60 hover:bg-slate-100 hover:text-slate-800 dark:bg-slate-800/80 dark:text-slate-355 dark:border-slate-700 dark:hover:bg-slate-700 dark:hover:text-slate-100'
                }`}
              >
                Trimestral
              </button>
            </div>
          </div>
          
          <div className="text-[10px] text-slate-400 font-mono font-medium">
            {filter.startDate && filter.endDate ? (
              <span>Rango Seleccionado: {filter.startDate} al {filter.endDate}</span>
            ) : (
              <span>Mostrando todos los registros históricos</span>
            )}
          </div>
        </div>

        {/* Search, Custom Dates and Status */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-3 items-center">
          
          {/* Search */}
          <div className="lg:col-span-4 relative">
            <Search className="absolute left-3 top-2.5 text-slate-400 w-4 h-4 dark:text-slate-500" />
            <input
              type="text"
              placeholder="Buscar por cliente o cédula..."
              value={filter.searchTerm}
              onChange={(e) => handleFilterUpdate({ searchTerm: e.target.value })}
              className="pl-9 pr-8 py-2"
            />
            {filter.searchTerm && (
              <button
                type="button"
                onClick={() => handleFilterUpdate({ searchTerm: '' })}
                className="absolute right-2.5 top-2.5 text-slate-400 hover:text-red-500 transition-colors cursor-pointer dark:hover:text-red-400"
                title="Limpiar búsqueda"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          {/* Date From */}
          <div className="lg:col-span-3 flex items-center gap-1.5">
            <Calendar className="text-slate-400 w-4 h-4 shrink-0 dark:text-slate-500" />
            <span className="text-xs font-semibold text-slate-400 min-w-8 dark:text-slate-505">Desde:</span>
            <input
              type="date"
              value={filter.startDate}
              onChange={(e) => handleFilterUpdate({ startDate: e.target.value })}
              className="flex-1 py-1.5 text-[11px]"
            />
          </div>

          {/* Date To */}
          <div className="lg:col-span-3 flex items-center gap-1.5">
            <Calendar className="text-slate-400 w-4 h-4 shrink-0 dark:text-slate-500" />
            <span className="text-xs font-semibold text-slate-400 min-w-8 dark:text-slate-505">Hasta:</span>
            <input
              type="date"
              value={filter.endDate}
              onChange={(e) => handleFilterUpdate({ endDate: e.target.value })}
              className="flex-1 py-1.5 text-[11px]"
            />
          </div>

          {/* Status selector */}
          <div className="lg:col-span-2">
            <select
              value={filter.status}
              onChange={(e) => handleFilterUpdate({ status: e.target.value })}
              className="w-full py-2 px-3 text-xs rounded-lg border border-slate-200 bg-white text-slate-700 font-semibold focus:ring-2 focus:ring-[#6366F1] focus:border-[#6366F1] outline-none cursor-pointer dark:bg-slate-800 dark:border-slate-700 dark:text-slate-300"
            >
              <option value="todos">Todos</option>
              <option value="Pagado">Pagados</option>
              <option value="Cobrar">Por Cobrar</option>
              <option value="Cancelado">Cancelados</option>
              <option value="Vencido">Vencidos</option>
            </select>
          </div>
        </div>

      </div>

      {/* Transaction List - Grouped by Client */}
      <div className="overflow-auto max-h-[60vh] border-y border-slate-200 dark:border-slate-800">
        <table>
          <thead className="sticky top-0 z-10 bg-slate-50 ring-1 ring-slate-200 dark:bg-slate-800 dark:ring-slate-700">
            <tr className="bg-slate-50 text-slate-500 font-bold uppercase tracking-wider dark:bg-slate-800 dark:text-slate-450">
              <th className="py-3 px-6 text-[10px]">Cliente</th>
              <th className="py-3 px-6 text-[10px]">Cédula</th>
              <th className="py-3 px-6 text-[10px]">Monto Total</th>
              <th className="py-3 px-6 text-[10px] min-w-[200px]">Abonado / Saldo</th>
              <th className="py-3 px-6 text-center text-[10px]">Estado</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 font-semibold dark:divide-slate-800">
            {loading ? (
              <tr>
                <td colSpan={5} className="py-16 text-center text-slate-400">
                  <div className="flex flex-col items-center justify-center gap-3">
                    <Loader2 className="w-8 h-8 animate-spin text-indigo-600" />
                    <span className="text-sm font-semibold">Cargando cuentas...</span>
                  </div>
                </td>
              </tr>
            ) : groupedClients.length === 0 ? (
              <tr>
                <td colSpan={5} className="py-12 text-center text-slate-400">
                  <div className="flex flex-col items-center justify-center space-y-1">
                    <Filter className="w-6 h-6 text-slate-300 stroke-1" />
                    <span>No se encontraron resultados con los filtros seleccionados</span>
                    <button 
                      onClick={() => onFilterChange({ startDate: '', endDate: '', status: 'todos', searchTerm: '' })}
                      className="text-xs text-[#06B6D4] hover:text-[#0891b2] hover:underline font-bold cursor-pointer"
                    >
                      Limpiar Filtros
                    </button>
                  </div>
                </td>
              </tr>
            ) : (
              groupedClients.map((g) => {
                const allPaid = g.status === 'Pagado';
                const pending = Math.max(0, g.totalAmount - g.totalPaid);
                const ratio = Math.min(100, Math.round((g.totalPaid / (g.totalAmount || 1)) * 100));

                return (
                  <tr key={g.name} className="hover:bg-slate-50/60 transition-colors group dark:hover:bg-slate-800/60">
                    <td className="py-3.5 px-6 text-slate-900 font-bold dark:text-slate-100">
                      <div className="flex flex-col">
                        <button
                          type="button"
                          onClick={() => handleClientClick(g.name, g.transactions[0]?.id, g.transactions)}
                          className="text-left font-bold text-indigo-650 hover:text-indigo-800 dark:text-indigo-400 dark:hover:text-indigo-300 hover:underline cursor-pointer flex items-center gap-1.5"
                          title="Ver estadísticas e historial del cliente"
                        >
                          <User className="w-3.5 h-3.5 text-indigo-500/70 inline" />
                          <span>{g.name}</span>
                        </button>
                        {g.phone && (
                          <span className="text-[10px] text-slate-400 flex items-center gap-1 font-mono mt-0.5 font-medium">
                            <Phone className="w-2.5 h-2.5" />
                            {g.phone}
                          </span>
                        )}
                        {g.location && (
                          <span className="text-[10px] text-[#06B6D4] flex items-center gap-1 font-mono mt-0.5 font-semibold" title="Ubicación del cliente">
                            <MapPin className="w-2.5 h-2.5 text-[#06B6D4]" />
                            {g.location}
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="py-3.5 px-6 text-slate-500">{g.cedula || <span className="text-slate-300 italic">No esp.</span>}</td>
                    <td className="py-3.5 px-6 text-slate-900 font-bold font-mono text-sm text-[13px] dark:text-slate-100">
                      <div className="flex flex-col">
                        <span>{formatMoney(g.totalAmount)}</span>
                        <span className="text-[10px] text-slate-400 font-mono font-medium">
                          {g.transactions.length} cuenta{g.transactions.length !== 1 ? 's' : ''}
                        </span>
                        {g.discounts.length > 0 && (
                          <span className="text-[10px] text-purple-650 dark:text-purple-400 font-mono font-medium mt-0.5" title="Descuentos aplicados">
                            Desc: {g.discounts.map(d => `${d.percentage}% (-${formatMoney(d.amount)})`).join(', ')}
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="py-3.5 px-6">
                      <div className="flex flex-col gap-1 py-0.5 max-w-[220px]">
                        <div className="flex justify-between items-center text-[11px]">
                          <span className="text-emerald-700 font-bold font-mono" title="Monto abonado hasta ahora">
                            {formatMoney(g.totalPaid)}
                          </span>
                          {pending > 0 ? (
                            <span className="text-rose-600 dark:text-rose-400 font-bold font-mono" title="Monto restante">
                              - {formatMoney(pending)}
                            </span>
                          ) : (
                            <span className="text-emerald-600 text-[9px] uppercase font-extrabold tracking-wider bg-emerald-50 px-1.5 py-0.5 rounded border border-emerald-100 dark:bg-emerald-950/20 dark:text-emerald-400 dark:border-emerald-900/50">
                              Completo
                            </span>
                          )}
                        </div>
                        <div className="w-full bg-slate-100 dark:bg-slate-800 h-1.5 rounded-full overflow-hidden relative shadow-inner">
                          <div
                            className={`h-full transition-all duration-300 rounded-full ${
                              allPaid ? 'bg-emerald-500' : ratio > 60 ? 'bg-[#6366F1]' : ratio > 20 ? 'bg-[#06B6D4]' : 'bg-rose-500'
                            }`}
                            style={{ width: `${ratio}%` }}
                          />
                        </div>
                        <div className="flex items-center justify-between mt-0.5 text-[10px]">
                          <span className="text-slate-450 dark:text-slate-500 font-mono font-medium">{ratio}% abonado</span>
                          {g.paymentsCount > 0 && (
                            <span className="text-slate-400 font-mono">{g.paymentsCount} abono{g.paymentsCount !== 1 ? 's' : ''}</span>
                          )}
                        </div>
                      </div>
                    </td>
                    <td className="py-3.5 px-6 text-center text-[11px]">
                      <span className={`badge ${
                        g.status === 'Pagado' ? 'badge-success' : g.status === 'Cancelado' ? 'badge-slate' : g.status === 'Vencido' ? 'badge-danger' : 'badge-warning'
                      }`}>
                        {g.status === 'Pagado' ? <><CheckCircle2 className="w-3 h-3" /> Pagado</> : g.status === 'Cancelado' ? <><XCircle className="w-3 h-3" /> Cancelada</> : g.status === 'Vencido' ? <><AlertCircle className="w-3 h-3" /> Vencida</> : <><AlertCircle className="w-3 h-3" /> Cobrar</>}
                      </span>
                      <div className="text-[9px] text-slate-400 mt-1 font-mono">
                        {g.transactions.length} cuenta{g.transactions.length !== 1 ? 's' : ''}
                      </div>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination Controls */}
      {totalPages > 1 && (
        <div className="p-4 bg-slate-50 border-t border-slate-200/80 flex items-center justify-between text-xs text-slate-500 font-semibold dark:bg-slate-900/50 dark:border-slate-800 dark:text-slate-400">
          <div>
            Mostrando <span className="font-bold text-slate-800 dark:text-slate-200">{startIndex + 1}</span> a{' '}
            <span className="font-bold text-slate-800 dark:text-slate-200">
              {Math.min(startIndex + itemsPerPage, filteredTransactions.length)}
            </span>{' '}
            de <span className="font-bold text-slate-850 dark:text-slate-200">{filteredTransactions.length}</span> transacciones agrupadas
          </div>
          <div className="flex items-center gap-1.5 font-bold">
            <button
              onClick={() => handlePageChange(currentPage - 1)}
              disabled={currentPage === 1}
              className="p-1 px-2.5 rounded-lg border border-slate-200 hover:bg-white disabled:pointer-events-none disabled:opacity-45 bg-white cursor-pointer flex items-center dark:bg-slate-800 dark:border-slate-700 dark:hover:bg-slate-700"
            >
              <ChevronLeft className="w-4 h-4 text-slate-655 dark:text-slate-300" />
            </button>
            <span className="bg-white px-3 py-1 rounded-lg border border-slate-200 font-mono text-slate-700 dark:bg-slate-800 dark:border-slate-700 dark:text-slate-350">
              {currentPage} de {totalPages}
            </span>
            <button
              onClick={() => handlePageChange(currentPage + 1)}
              disabled={currentPage === totalPages}
              className="p-1 px-2.5 rounded-lg border border-slate-200 hover:bg-white disabled:pointer-events-none disabled:opacity-45 bg-white cursor-pointer flex items-center dark:bg-slate-800 dark:border-slate-700 dark:hover:bg-slate-700"
            >
              <ChevronRight className="w-4 h-4 text-slate-655 dark:text-slate-300" />
            </button>
          </div>
        </div>
      )}

      {/* Client Detail & History Modal */}
      {selectedClientDetails && (() => {
        const c = selectedClientDetails;

        const allPayments: { txId: string; paymentId: number; amount: number; date: string }[] = [];
        c.transactions.forEach((t: any) => {
          if (t.payments && t.payments.length > 0) {
            t.payments.forEach((p: any) => {
              allPayments.push({
                txId: t.id,
                paymentId: p.id,
                amount: p.amount,
                date: p.date
              });
            });
          } else if (t.paidAmount > 0) {
            allPayments.push({
              txId: t.id,
              paymentId: 0,
              amount: t.paidAmount,
              date: t.date
            });
          }
        });
        allPayments.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

        const allDiscounts: { txId: string; percentage: number; amount: number; date: string }[] = [];
        c.transactions.forEach((t: any) => {
          if (t.discounts && t.discounts.length > 0) {
            t.discounts.forEach((d: any) => {
              allDiscounts.push({
                txId: t.id,
                percentage: d.percentage,
                amount: d.amount,
                date: d.date
              });
            });
          }
        });
        allDiscounts.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

        return (
          <div className="fixed inset-0 z-[110] flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4 overflow-y-auto">
            <div className="relative bg-white dark:bg-slate-900 rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-800 w-full max-w-5xl overflow-hidden flex flex-col max-h-[90vh] animate-scale-up">
              {refreshingModal && (
                <div className="absolute inset-0 z-[120] bg-white/70 dark:bg-slate-900/70 flex items-center justify-center rounded-2xl">
                  <div className="flex flex-col items-center gap-2">
                    <Loader2 className="w-8 h-8 animate-spin text-indigo-600" />
                    <span className="text-xs font-semibold text-slate-500">Actualizando datos...</span>
                  </div>
                </div>
              )}
              
              {/* Modal Header */}
              <div className="bg-slate-50 dark:bg-slate-900/50 p-5 border-b border-slate-150 dark:border-slate-800 flex justify-between items-center shrink-0">
                <div className="flex items-center gap-3 min-w-0 flex-1">
                  <div className="w-10 h-10 rounded-full bg-indigo-50 dark:bg-indigo-950/40 text-indigo-600 dark:text-indigo-400 flex items-center justify-center shrink-0">
                    <User className="w-5 h-5" />
                  </div>
                  {editingClient ? (
                    <form
                      onSubmit={async (e) => {
                        e.preventDefault();
                        const fd = new FormData(e.target as HTMLFormElement);
                        const data = {
                          client_name: (fd.get('client_name') as string)?.trim() || c.name,
                          client_document: (fd.get('client_document') as string)?.trim() || '',
                          client_phone: (fd.get('client_phone') as string)?.trim() || '',
                        };
                        if (!data.client_name) return;
                        setSavingClient(true);
                        await onUpdateClient?.(c.name, data);
                        setSelectedClientDetails((prev: any) => {
                          if (!prev) return prev;
                          const updatedTxs = prev.transactions.map((tx: any) => ({
                            ...tx,
                            clientName: data.client_name,
                            cedula: data.client_document || tx.cedula,
                            phone: data.client_phone || tx.phone,
                          }));
                          return {
                            ...prev,
                            name: data.client_name,
                            phone: data.client_phone || prev.phone,
                            cedula: data.client_document || prev.cedula,
                            transactions: updatedTxs,
                          };
                        });
                        if (data.client_name !== c.name) {
                          selectedClientNameRef.current = data.client_name;
                        }
                        setSavingClient(false);
                        setEditingClient(false);
          </div>
          <div className="flex items-center gap-1.5 font-bold">
            <button
              onClick={() => handlePageChange(currentPage - 1)}
              disabled={currentPage === 1}
              className="p-1 px-2.5 rounded-lg border border-slate-200 hover:bg-white disabled:pointer-events-none disabled:opacity-45 bg-white cursor-pointer flex items-center dark:bg-slate-800 dark:border-slate-700 dark:hover:bg-slate-700"
            >
              <ChevronLeft className="w-4 h-4 text-slate-655 dark:text-slate-300" />
            </button>
            <span className="bg-white px-3 py-1 rounded-lg border border-slate-200 font-mono text-slate-700 dark:bg-slate-800 dark:border-slate-700 dark:text-slate-350">
              {currentPage} de {totalPages}
            </span>
            <button
              onClick={() => handlePageChange(currentPage + 1)}
              disabled={currentPage === totalPages}
              className="p-1 px-2.5 rounded-lg border border-slate-200 hover:bg-white disabled:pointer-events-none disabled:opacity-45 bg-white cursor-pointer flex items-center dark:bg-slate-800 dark:border-slate-700 dark:hover:bg-slate-700"
            >
              <ChevronRight className="w-4 h-4 text-slate-655 dark:text-slate-300" />
            </button>
          </div>
        </div>
      )}

      {/* Client Detail & History Modal */}
      {selectedClientDetails && (() => {
        const c = selectedClientDetails;

        const allPayments: { txId: string; paymentId: number; amount: number; date: string }[] = [];
        c.transactions.forEach((t: any) => {
          if (t.payments && t.payments.length > 0) {
            t.payments.forEach((p: any) => {
              allPayments.push({
                txId: t.id,
                paymentId: p.id,
                amount: p.amount,
                date: p.date
              });
            });
          } else if (t.paidAmount > 0) {
            allPayments.push({
              txId: t.id,
              paymentId: 0,
              amount: t.paidAmount,
              date: t.date
            });
          }
        });
        allPayments.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

        const allDiscounts: { txId: string; percentage: number; amount: number; date: string }[] = [];
        c.transactions.forEach((t: any) => {
          if (t.discounts && t.discounts.length > 0) {
            t.discounts.forEach((d: any) => {
              allDiscounts.push({
                txId: t.id,
                percentage: d.percentage,
                amount: d.amount,
                date: d.date
              });
            });
          }
        });
        allDiscounts.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

        return (
          <div className="fixed inset-0 z-[110] flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4 overflow-y-auto">
            <div className="relative bg-white dark:bg-slate-900 rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-800 w-full max-w-5xl overflow-hidden flex flex-col max-h-[90vh] animate-scale-up">
              {refreshingModal && (
                <div className="absolute inset-0 z-[120] bg-white/70 dark:bg-slate-900/70 flex items-center justify-center rounded-2xl">
                  <div className="flex flex-col items-center gap-2">
                    <Loader2 className="w-8 h-8 animate-spin text-indigo-600" />
                    <span className="text-xs font-semibold text-slate-500">Actualizando datos...</span>
                  </div>
                </div>
              )}
              
              {/* Modal Header */}
              <div className="bg-slate-50 dark:bg-slate-900/50 p-5 border-b border-slate-150 dark:border-slate-800 flex justify-between items-center shrink-0">
                <div className="flex items-center gap-3 min-w-0 flex-1">
                  <div className="w-10 h-10 rounded-full bg-indigo-50 dark:bg-indigo-950/40 text-indigo-600 dark:text-indigo-400 flex items-center justify-center shrink-0">
                    <User className="w-5 h-5" />
                  </div>
                  {editingClient ? (
                    <form
                      onSubmit={async (e) => {
                        e.preventDefault();
                        const fd = new FormData(e.target as HTMLFormElement);
                        const data = {
                          client_name: (fd.get('client_name') as string)?.trim() || c.name,
                          client_document: (fd.get('client_document') as string)?.trim() || '',
                          client_phone: (fd.get('client_phone') as string)?.trim() || '',
                        };
                        if (!data.client_name) return;
                        setSavingClient(true);
                        await onUpdateClient?.(c.name, data);
                        setSelectedClientDetails((prev: any) => {
                          if (!prev) return prev;
                          const updatedTxs = prev.transactions.map((tx: any) => ({
                            ...tx,
                            clientName: data.client_name,
                            cedula: data.client_document || tx.cedula,
                            phone: data.client_phone || tx.phone,
                          }));
                          return {
                            ...prev,
                            name: data.client_name,
                            phone: data.client_phone || prev.phone,
                            cedula: data.client_document || prev.cedula,
                            transactions: updatedTxs,
                          };
                        });
                        if (data.client_name !== c.name) {
                          selectedClientNameRef.current = data.client_name;
                        }
                        setSavingClient(false);
                        setEditingClient(false);
                      }}
                      className="flex flex-wrap items-center gap-2 flex-1"
                    >
                      <div className="flex flex-col gap-1.5 flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-bold text-slate-400 shrink-0">Nombre:</span>
                          <input
                            name="client_name"
                            defaultValue={c.name}
                            disabled={savingClient}
                            className="border border-slate-300 dark:border-slate-700 rounded px-2 py-1 text-xs flex-1 bg-white dark:bg-slate-800 outline-none focus:ring-2 focus:ring-indigo-500 font-bold disabled:opacity-50 disabled:bg-slate-100 dark:disabled:bg-slate-900 cursor-not-allowed"
                            required
                          />
                        </div>
                        <div className="flex flex-wrap gap-2">
                          <div className="flex items-center gap-1">
                            <span className="text-[10px] font-bold text-slate-400">Cédula:</span>
                            <input
                              name="client_document"
                              defaultValue={c.cedula || ''}
                              disabled={savingClient}
                              className="border border-slate-300 dark:border-slate-700 rounded px-2 py-1 text-[11px] w-28 bg-white dark:bg-slate-800 outline-none focus:ring-2 focus:ring-indigo-500 font-mono disabled:opacity-50 disabled:bg-slate-100 dark:disabled:bg-slate-900 cursor-not-allowed"
                            />
                          </div>
                          <div className="flex items-center gap-1">
                            <span className="text-[10px] font-bold text-slate-400">Teléfono:</span>
                            <input
                              name="client_phone"
                              defaultValue={c.phone || ''}
                              disabled={savingClient}
                              className="border border-slate-300 dark:border-slate-700 rounded px-2 py-1 text-[11px] w-28 bg-white dark:bg-slate-800 outline-none focus:ring-2 focus:ring-indigo-500 font-mono disabled:opacity-50 disabled:bg-slate-100 dark:disabled:bg-slate-900 cursor-not-allowed"
                            />
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center gap-1 shrink-0">
                        <button type="submit" disabled={savingClient} className="p-1.5 text-emerald-600 hover:bg-emerald-50 dark:hover:bg-emerald-950/30 rounded cursor-pointer disabled:opacity-40 disabled:pointer-events-none" title="Guardar">
                          {savingClient ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
                        </button>
                        <button type="button" disabled={savingClient} onClick={() => !savingClient && setEditingClient(false)} className="p-1.5 text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 rounded cursor-pointer disabled:opacity-40 disabled:pointer-events-none" title="Cancelar">
                          <X className="w-4 h-4" />
                        </button>
                      </div>
                    </form>
                  ) : (
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <h3 className="text-base font-bold text-slate-950 dark:text-slate-100 truncate">
                          Ficha del Cliente: {c.name}
                        </h3>
                        <button
                          type="button"
                          onClick={() => setEditingClient(true)}
                          className="p-1 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 dark:hover:bg-indigo-950/30 rounded cursor-pointer shrink-0"
                          title="Editar datos del cliente"
                        >
                          <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" /></svg>
                        </button>
                      </div>
                      <div className="flex gap-3 text-xs text-slate-400 dark:text-slate-500 mt-1 font-medium flex-wrap">
                        {c.cedula && (
                          <span className="flex items-center gap-1">
                            <strong>Cédula:</strong> {c.cedula}
                          </span>
                        )}
                        {c.phone && (
                          <span className="flex items-center gap-1">
                            <strong>Teléfono:</strong> {c.phone}
                          </span>
                        )}
                        {c.location && (
                          <span className="flex items-center gap-1 text-[#06B6D4]">
                            <strong>Dirección:</strong> {c.location}
                          </span>
                        )}
                      </div>
                    </div>
                  )}
                </div>
                <button
                  type="button"
                  onClick={() => { setSelectedClientDetails(null); selectedClientNameRef.current = null; setEditingPayment(null); setEditingTxInModal(null); setEditingClient(false); }}
                  className="text-slate-450 hover:text-slate-655 p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Modal Body */}
              <div className="p-6 overflow-y-auto flex-1 bg-slate-50/50 dark:bg-slate-950/20 space-y-6">
                


                {/* Stats Grid */}
                <div className="grid grid-cols-1 sm:grid-cols-4 gap-4 text-xs">
                  <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-850 p-4 rounded-xl shadow-xs">
                    <span className="text-[10px] uppercase font-bold text-slate-400 block mb-1">Monto Total Facturado</span>
                    <span className="font-mono text-base font-bold text-slate-900 dark:text-slate-150">{formatMoney(c.stats.totalDebt)}</span>
                  </div>
                  <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-850 p-4 rounded-xl shadow-xs">
                    <span className="text-[10px] uppercase font-bold text-slate-400 block mb-1">Total Abonado</span>
                    <span className="font-mono text-base font-bold text-emerald-600 dark:text-emerald-400">+{formatMoney(c.stats.totalPaid)}</span>
                  </div>
                  <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-850 p-4 rounded-xl shadow-xs">
                    <span className="text-[10px] uppercase font-bold text-slate-400 block mb-1">Saldo Restante</span>
                    <span className={`font-mono text-base font-bold ${c.stats.totalOutstanding > 0 ? 'text-rose-600 dark:text-rose-400' : 'text-emerald-600 dark:text-emerald-400'}`}>
                      {formatMoney(c.stats.totalOutstanding)}
                    </span>
                  </div>
                  <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-850 p-4 rounded-xl shadow-xs">
                    <span className="text-[10px] uppercase font-bold text-slate-400 block mb-1">Efectividad de Pago</span>
                    <div className="flex items-center gap-2 mt-1">
                      <div className="w-full bg-slate-100 dark:bg-slate-800 rounded-full h-2 overflow-hidden flex-1">
                        <div 
                          className="bg-indigo-650 h-full rounded-full" 
                          style={{ width: `${c.stats.paymentRate}%` }}
                        />
                      </div>
                      <span className="text-xs font-mono font-bold text-slate-800 dark:text-slate-200">
                        {c.stats.paymentRate.toFixed(0)}%
                      </span>
                    </div>
                  </div>
                </div>

                {/* Subsections Grid */}
                <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
                  
                  {/* Left panel: List of Debts */}
                  <div className="lg:col-span-7 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl overflow-hidden shadow-xs">
                    <div className="bg-slate-50 dark:bg-slate-800/40 p-3 border-b border-slate-150 dark:border-slate-800 flex items-center justify-between">
                      <span className="text-xs font-bold text-slate-800 dark:text-slate-200">Historial de Cuentas / Deudas</span>
                      <span className="text-[10px] bg-slate-200 dark:bg-slate-800 text-slate-655 dark:text-slate-400 px-2 py-0.5 rounded font-mono font-semibold">
                        {c.transactions.length} registros
                      </span>
                    </div>
                    <div className="overflow-x-auto max-h-[300px]">
                      <table className="w-full text-left text-xs whitespace-nowrap">
                        <thead className="bg-slate-50 dark:bg-slate-800/50 text-slate-450 font-bold uppercase tracking-wider border-b border-slate-100 dark:border-slate-800">
                          <tr>
                            <th className="px-4 py-2.5">#</th>
                            <th className="px-4 py-2.5">Creada</th>
                            <th className="px-4 py-2.5">Vence</th>
                            <th className="px-4 py-2.5">Monto</th>
                            <th className="px-4 py-2.5">Abonado</th>
                            <th className="px-4 py-2.5">Estado</th>
                            <th className="px-4 py-2.5"></th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                          {c.transactions.map((t: any, idx: number) => {
                            const tPaid = t.status === 'Pagado' ? t.amount : (t.paidAmount || 0);
                            const isEditingTx = editingTxInModal?.id === t.id;
                            return (
                              <tr key={idx} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/40">
                                  {isEditingTx ? (
                                    <td colSpan={7} className="px-4 py-3">
                                      </button>
                                    </form>
                                  </td>
                                ) : (
                                  <>
                                    <td className="px-4 py-2.5 font-mono text-slate-400">{idx + 1}</td>
                                    <td className="px-4 py-2.5 text-slate-600 dark:text-slate-400 font-mono">{formatDate(t.date)}</td>
                                    <td className="px-4 py-2.5 text-slate-500 dark:text-slate-500 font-mono">{t.dueDate ? formatDate(t.dueDate) : <span className="text-slate-300 italic text-[10px]">-</span>}</td>
                                    <td className="px-4 py-2.5 font-bold font-mono text-slate-700 dark:text-slate-350">
                                      <div className="flex flex-col">
                                        <span>{formatMoney(t.amount)}</span>
                                        {t.discounts && t.discounts.length > 0 && (
                                          <span className="text-[9px] text-purple-650 dark:text-purple-400 font-mono font-medium" title="Descuentos aplicados">
                                            Desc: {t.discounts.map((d: any) => `${d.percentage}% (-${formatMoney(d.amount)})`).join(', ')}
                                          </span>
                                        )}
                                      </div>
                                    </td>
                                    <td className="px-4 py-2.5 font-mono text-emerald-600 dark:text-emerald-400">+{formatMoney(tPaid)}</td>
                                    <td className="px-4 py-2.5">
                                      <span className={`px-2 py-0.5 rounded text-[9px] font-bold uppercase ${
                                        t.status === 'Pagado' ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/20 dark:text-emerald-450' : t.status === 'Cancelado' ? 'bg-slate-200 text-slate-600 dark:bg-slate-800 dark:text-slate-400' : t.status === 'Vencido' ? 'bg-red-100 text-red-700 dark:bg-red-950/20 dark:text-red-450' : 'bg-amber-100 text-amber-800 dark:bg-amber-955/20 dark:text-amber-450'
                                      }`}>
                                        {t.status === 'Pagado' ? 'Pagado' : t.status === 'Cancelado' ? 'Cancelado' : t.status === 'Vencido' ? 'Vencido' : 'Pendiente'}
                                      </span>
                                    </td>
                                    <td className="px-4 py-2.5">
                                      <button
                                        onClick={() => setEditingTxInModal(t)}
                                        className="p-1 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 dark:hover:bg-indigo-950/30 rounded cursor-pointer"
                                        title="Editar cuenta"
                                      >
                                        <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" /></svg>
                                      </button>
                                      <button
                                        onClick={() => {
                                          confirm({
                                            title: 'Eliminar cuenta',
                                            message: `¿Estás seguro de eliminar la cuenta #${t.id} de ${t.clientName} por ${formatMoney(t.amount)}? Esta acción no se puede deshacer.`,
                                            confirmText: 'Eliminar',
                                            cancelText: 'Cancelar',
                                            type: 'danger',
                                            onConfirm: () => {
                                              setRefreshingModal(true);
                                              onDeleteTransaction(t.id);
                                            }
                                          });
                                        }}
                                        className="p-1 text-slate-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-950/30 rounded cursor-pointer"
                                        title="Eliminar cuenta"
                                      >
                                        <Trash2 className="w-3.5 h-3.5" />
                                      </button>
                                    </td>
                                  </>
                                )}
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                  </div>

                  {/* Right panel: List of Payments & Discounts */}
                  <div className="lg:col-span-5 space-y-4">
                    {/* Payments */}
                    <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl overflow-hidden shadow-xs">
                      <div className="bg-slate-50 dark:bg-slate-800/40 p-3 border-b border-slate-150 dark:border-slate-800 flex items-center justify-between">
                        <span className="text-xs font-bold text-slate-850 dark:text-slate-200">Abonos Realizados</span>
                        <span className="text-[10px] bg-slate-200 dark:bg-slate-800 text-slate-655 dark:text-slate-400 px-2 py-0.5 rounded font-mono font-semibold">
                          {allPayments.length} abonos
                        </span>
                      </div>
                      
                      <div className="max-h-[180px] overflow-y-auto divide-y divide-slate-100 dark:divide-slate-800 p-4 space-y-2">
                        {allPayments.length === 0 ? (
                          <p className="text-center text-slate-455 text-xs py-4">No se han registrado abonos para este cliente.</p>
                        ) : (
                          allPayments.map((p, idx) => {
                            const isEditing = editingPayment?.txId === p.txId && editingPayment?.paymentId === p.paymentId;
                            return (
                              <div key={idx} className="flex justify-between items-center text-xs py-1 gap-2">
                                {isEditing ? (
                                  <form
                                    onSubmit={async (e) => {
                                      e.preventDefault();
                                      const input = (e.target as HTMLFormElement).querySelector('input')!;
                                      const val = parseFloat(input.value);
                                      if (!val || val <= 0) return;
                                      setSavingPayment(true);
                                      setRefreshingModal(true);
                                      await onUpdatePayment(p.txId, p.paymentId, val);
                                      setSelectedClientDetails((prev: any) => {
                                        if (!prev) return prev;
                                        const updatedTxs = prev.transactions.map((t: any) => {
                                          if (t.id !== p.txId) return t;
                                          const oldPaid = t.paidAmount || 0;
                                          const diff = val - p.amount;
                                          const newPaid = Math.max(0, oldPaid + diff);
                                          const newStatus = newPaid >= t.amount ? 'Pagado' : t.status === 'Cancelado' ? 'Cancelado' : 'Por cobrar';
                                          return { ...t, paidAmount: newPaid, status: newStatus };
                                        });
                                        return { ...prev, transactions: updatedTxs };
                                      });
                                      setSavingPayment(false);
                                      setEditingPayment(null);
                                    }}
                                    className="flex items-center gap-2 w-full"
                                  >
                                    <input
                                      type="number"
                                      step="0.01"
                                      defaultValue={p.amount}
                                      className="w-24 border border-slate-300 dark:border-slate-700 rounded px-2 py-1 text-xs font-mono bg-white dark:bg-slate-800 outline-none focus:ring-2 focus:ring-indigo-500"
                                      autoFocus
                                    />
                                    <button type="submit" disabled={savingPayment} className="p-1 text-emerald-600 hover:bg-emerald-50 dark:hover:bg-emerald-950/30 rounded cursor-pointer disabled:opacity-40 disabled:pointer-events-none" title="Guardar">
                                      {savingPayment ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Check className="w-3.5 h-3.5" />}
                                    </button>
                                    <button type="button" disabled={savingPayment} onClick={() => !savingPayment && setEditingPayment(null)} className="p-1 text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 rounded cursor-pointer disabled:opacity-40 disabled:pointer-events-none" title="Cancelar">
                                      <X className="w-3.5 h-3.5" />
                                    </button>
                                  </form>
                                ) : (
                                  <>
                                    <div className="flex flex-col flex-1 min-w-0">
                                      <span className="font-semibold text-slate-850 dark:text-slate-300 font-mono">{formatDate(p.date)}</span>
                                      <span className="text-[10px] text-slate-400">En cuenta ID: #{p.txId}</span>
                                    </div>
                                    <div className="flex items-center gap-1 flex-shrink-0">
                                      <span className="font-bold text-emerald-600 dark:text-emerald-400 font-mono text-sm">
                                        +{formatMoney(p.amount)}
                                      </span>
                                      <button
                                        onClick={() => setEditingPayment({ txId: p.txId, paymentId: p.paymentId, amount: p.amount })}
                                        className="p-1 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 dark:hover:bg-indigo-950/30 rounded cursor-pointer"
                                        title="Editar abono"
                                      >
                                        <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" /></svg>
                                      </button>
                                      <button
                                        onClick={() => { setRefreshingModal(true); onDeletePayment(p.txId, p.paymentId); }}
                                        className="p-1 text-slate-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-950/30 rounded cursor-pointer"
                                        title="Eliminar abono"
                                      >
                                        <Trash2 className="w-3 h-3" />
                                      </button>
                                    </div>
                                  </>
                                )}
                              </div>
                            );
                          })
                        )}
                      </div>
                    </div>

                    {/* Discounts */}
                    <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl overflow-hidden shadow-xs">
                      <div className="bg-slate-50 dark:bg-slate-800/40 p-3 border-b border-slate-150 dark:border-slate-800 flex items-center justify-between">
                        <span className="text-xs font-bold text-slate-850 dark:text-slate-200">Descuentos Aplicados</span>
                        <span className="text-[10px] bg-purple-100 dark:bg-purple-950 text-purple-700 dark:text-purple-400 px-2 py-0.5 rounded font-mono font-semibold">
                          {allDiscounts.length} desc.
                        </span>
                      </div>
                      
                      <div className="max-h-[180px] overflow-y-auto divide-y divide-slate-100 dark:divide-slate-800 p-4 space-y-2">
                        {allDiscounts.length === 0 ? (
                          <p className="text-center text-slate-455 text-xs py-4">No se han registrado descuentos.</p>
                        ) : (
                          allDiscounts.map((d, idx) => (
                            <div key={idx} className="flex justify-between items-center text-xs py-1">
                              <div className="flex flex-col">
                                <span className="font-semibold text-slate-850 dark:text-slate-300 font-mono">{formatDate(d.date)}</span>
                                <span className="text-[10px] text-slate-400">En cuenta ID: #{d.txId} (Descuento {d.percentage}%)</span>
                              </div>
                              <span className="font-bold text-purple-600 dark:text-purple-400 font-mono text-sm">
                                -{formatMoney(d.amount)}
                              </span>
                            </div>
                          ))
                        )}
                      </div>
                    </div>
                  </div>

                </div>

              </div>

              {/* Modal Footer */}
              <div className="bg-slate-50 dark:bg-slate-900/50 p-4 border-t border-slate-150 dark:border-slate-800 flex justify-end shrink-0">
                <button
                  type="button"
                  onClick={() => { setSelectedClientDetails(null); selectedClientNameRef.current = null; setEditingPayment(null); setEditingTxInModal(null); }}
                  className="btn btn-secondary"
                >
                  Cerrar
                </button>
              </div>

            </div>
          </div>
        );
      })()}

    </div>
  );
};
