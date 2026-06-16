import React from 'react';
import { Transaction, FilterState } from '../types';
import { Search, ChevronLeft, ChevronRight, Filter, Calendar, DollarSign, PlusCircle, Trash2, CheckCircle2, AlertCircle, Phone, Plus, Check, X, History, MapPin, User, UserPlus, Users } from 'lucide-react';
import { useTransactionTable } from '../hooks/useTransactionTable';

interface TransactionTableProps {
  transactions: Transaction[];
  onToggleStatus: (id: string) => void;
  onRegisterPayment: (id: string, amount: number, date: string) => void;
  onDeleteTransaction: (id: string) => void;
  onAddTransaction: (newTx: Omit<Transaction, 'id'>) => void;
  filter: FilterState;
  onFilterChange: (newFilter: FilterState) => void;
  isSuperadmin?: boolean;
  onShowDiscountModal?: () => void;
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
  onToggleStatus,
  onRegisterPayment,
  onDeleteTransaction,
  onAddTransaction,
  filter,
  onFilterChange,
  isSuperadmin,
  onShowDiscountModal,
}) => {
  const {
    currentPage,
    totalPages,
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
  });

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
      setNewDate(new Date().toISOString().substring(0, 10));
      setFormError('');
    }
  }, [showAddForm, uniqueClients.length]);

  const formatMoney = (val: number) => {
    return new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', maximumFractionDigits: 0 }).format(val);
  };

  const getPastDateString = (daysAgo: number): string => {
    const d = new Date();
    d.setDate(d.getDate() - daysAgo);
    return d.toISOString().substring(0, 10);
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
              className="btn bg-emerald-600 hover:bg-emerald-700 text-white font-semibold py-1.5 px-3.5 rounded-lg text-xs transition-colors flex items-center gap-1.5 cursor-pointer shadow-xs dark:bg-emerald-600 dark:hover:bg-emerald-750"
            >
              <DollarSign className="w-4 h-4" />
              Dar Descuento
            </button>
          )}
          <button
            onClick={() => setShowAddForm(!showAddForm)}
            className="btn bg-[#6366F1] hover:bg-[#4f46e5] text-white font-semibold py-1.5 px-3.5 rounded-lg text-xs transition-colors flex items-center gap-1.5 cursor-pointer shadow-xs dark:bg-[#6366F1] dark:hover:bg-[#4f46e5]"
          >
            <PlusCircle className="w-4 h-4" />
            Nuevo Registro
          </button>
        </div>
      </div>

      {/* Manual Sales Creator Form (shown as a SaaS Modal) */}
      {showAddForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4 overflow-y-auto">
          <div className="bg-white dark:bg-slate-900 rounded-xl shadow-xl border border-slate-200 dark:border-slate-800 w-full max-w-3xl overflow-hidden animate-fade-in">
            {/* Header */}
            <div className="p-5 border-b border-slate-150 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/50 flex items-center justify-between">
              <div>
                <h3 className="text-sm font-bold text-slate-950 dark:text-slate-100 flex items-center gap-2">
                  <PlusCircle className="w-5 h-5 text-[#6366F1]" />
                  Registrar Nueva Deuda / Cuenta
                </h3>
                <p className="text-[11px] text-slate-500 mt-1 dark:text-slate-400">
                  Registra un saldo pendiente o deuda. Asócialo a un cliente existente o crea uno nuevo.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setShowAddForm(false)}
                className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-250 p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleFormSubmit}>
              {/* Modal Body */}
              <div className="p-6 grid grid-cols-1 md:grid-cols-2 gap-6 max-h-[65vh] overflow-y-auto text-xs">
                
                {/* COLUMN 1: CLIENT IDENTIFICATION */}
                <div className="space-y-4 border-b md:border-b-0 md:border-r border-slate-150 dark:border-slate-800 pb-6 md:pb-0 md:pr-6">
                  <div className="flex items-center justify-between mb-1">
                    <span className="font-bold text-[#6366F1] dark:text-[#6366F1] text-xs uppercase tracking-wide">
                      1. Identificación del Cliente
                    </span>
                  </div>

                  {/* Selector tabs */}
                  <div className="flex bg-slate-100 dark:bg-slate-800 p-1 rounded-lg border border-slate-200/50 dark:border-slate-700">
                    <button
                      type="button"
                      disabled={uniqueClients.length === 0}
                      onClick={() => {
                        setClientSelectionMode('existing');
                        setSelectedClient(null);
                        setNewClient('');
                        setNewPhone('');
                        setPhoneCountryCode('+58');
                        setNewCedula('');
                        setNewLocation('');
                      }}
                      className={`flex-1 py-1.5 px-3 rounded-md font-bold transition-all text-center flex items-center justify-center gap-1.5 text-[11px] ${
                        uniqueClients.length === 0 ? 'opacity-40 cursor-not-allowed' : 'cursor-pointer'
                      } ${
                        clientSelectionMode === 'existing'
                          ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 shadow-xs'
                          : 'text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200'
                      }`}
                    >
                      <Users className="w-3.5 h-3.5" />
                      Cliente Existente
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setClientSelectionMode('new');
                        setSelectedClient(null);
                        setNewClient('');
                        setNewPhone('');
                        setPhoneCountryCode('+58');
                        setNewCedula('');
                        setNewLocation('');
                      }}
                      className={`flex-1 py-1.5 px-3 rounded-md font-bold transition-all text-center flex items-center justify-center gap-1.5 text-[11px] cursor-pointer ${
                        clientSelectionMode === 'new'
                          ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 shadow-xs'
                          : 'text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200'
                      }`}
                    >
                      <UserPlus className="w-3.5 h-3.5" />
                      Nuevo Cliente
                    </button>
                  </div>

                  {/* Mode: Existing Client */}
                  {clientSelectionMode === 'existing' && (
                    <div className="space-y-3">
                      {!selectedClient ? (
                        <div className="space-y-3">
                          <label className="font-semibold text-slate-700 dark:text-slate-350">
                            Buscar Cliente
                          </label>
                          <div className="relative">
                            <Search className="absolute left-3 top-2.5 text-slate-400 w-4 h-4 dark:text-slate-500" />
                            <input
                              type="text"
                              placeholder="Escribe nombre, teléfono o cédula..."
                              value={clientSearch}
                              onChange={(e) => setClientSearch(e.target.value)}
                              className="pl-9"
                              autoFocus
                            />
                            {clientSearch && (
                              <button
                                type="button"
                                onClick={() => setClientSearch('')}
                                className="absolute right-2.5 top-2.5 text-slate-400 hover:text-red-500 cursor-pointer"
                              >
                                <X className="w-3.5 h-3.5" />
                              </button>
                            )}
                          </div>

                          {/* Client List */}
                          <div className="border border-slate-200 dark:border-slate-800 rounded-lg max-h-52 overflow-y-auto divide-y divide-slate-100 dark:divide-slate-800 bg-white dark:bg-slate-900/50 shadow-inner">
                            {filteredClients.length === 0 ? (
                              <div className="p-4 text-center text-slate-400 italic">
                                No se encontraron clientes
                              </div>
                            ) : (
                              filteredClients.map((client, idx) => {
                                const initials = client.name
                                  .split(' ')
                                  .map((n) => n[0])
                                  .slice(0, 2)
                                  .join('')
                                  .toUpperCase();
                                return (
                                  <button
                                    key={idx}
                                    type="button"
                                    onClick={() => {
                                      setSelectedClient(client);
                                      setNewClient(client.name);
                                      setNewCedula(client.cedula || '');
                                      setNewLocation(client.location || '');
                                      if (client.phone) {
                                        const parsed = parsePhoneNumber(client.phone);
                                        setPhoneCountryCode(parsed.code);
                                        setNewPhone(parsed.number);
                                      } else {
                                        setNewPhone('');
                                        setPhoneCountryCode('+58');
                                      }
                                    }}
                                    className="w-full text-left p-2.5 hover:bg-slate-50 dark:hover:bg-slate-805/50 transition-colors flex items-center gap-3 cursor-pointer"
                                  >
                                    <div className="w-8 h-8 rounded-lg bg-indigo-50 dark:bg-indigo-950/40 text-indigo-650 dark:text-indigo-400 font-bold flex items-center justify-center text-xs border border-indigo-100/30">
                                      {initials}
                                    </div>
                                    <div className="flex-1 min-w-0">
                                      <p className="font-bold text-slate-850 dark:text-slate-200 truncate">
                                        {client.name}
                                      </p>
                                      <div className="flex items-center gap-2 mt-0.5 text-[10px] text-slate-450 dark:text-slate-500 font-medium">
                                        {client.cedula && <span>Cédula: {client.cedula}</span>}
                                        {client.cedula && client.phone && <span>•</span>}
                                        {client.phone && <span>Tel: {client.phone}</span>}
                                      </div>
                                    </div>
                                  </button>
                                );
                              })
                            )}
                          </div>
                        </div>
                      ) : (
                        // Selected client display card
                        <div className="space-y-4">
                          <div className="bg-indigo-50/40 dark:bg-indigo-950/10 border border-indigo-100/50 dark:border-indigo-950/30 rounded-xl p-4 relative flex items-start gap-3 animate-fade-in shadow-xs">
                            <div className="w-10 h-10 rounded-xl bg-indigo-100 dark:bg-[#6366F1]/20 text-indigo-700 dark:text-indigo-300 font-extrabold flex items-center justify-center text-sm border border-indigo-200/20 shadow-xs shrink-0">
                              {selectedClient.name
                                .split(' ')
                                .map((n) => n[0])
                                .slice(0, 2)
                                .join('')
                                .toUpperCase()}
                            </div>
                            <div className="flex-1 min-w-0">
                              <span className="text-[9px] uppercase font-bold tracking-wider text-indigo-600 dark:text-indigo-400">
                                Cliente Seleccionado
                              </span>
                              <h4 className="font-bold text-slate-900 dark:text-slate-100 text-xs truncate mt-0.5">
                                {selectedClient.name}
                              </h4>
                              
                              <div className="mt-2 space-y-1 font-medium text-slate-600 dark:text-slate-400 text-[10px]">
                                {newCedula && (
                                  <div className="flex items-center gap-1.5">
                                    <span className="text-slate-400 dark:text-slate-500 min-w-[50px]">Cédula:</span>
                                    <span className="font-bold text-slate-800 dark:text-slate-200">{newCedula}</span>
                                  </div>
                                )}
                                {newPhone && (
                                  <div className="flex items-center gap-1.5">
                                    <span className="text-slate-400 dark:text-slate-500 min-w-[50px]">Teléfono:</span>
                                    <span className="font-mono font-bold text-slate-800 dark:text-slate-200">{phoneCountryCode} {newPhone}</span>
                                  </div>
                                )}
                                {newLocation && (
                                  <div className="flex items-center gap-1.5">
                                    <span className="text-slate-400 dark:text-slate-500 min-w-[50px]">Ubicación:</span>
                                    <span className="font-bold text-slate-800 dark:text-slate-200">{newLocation}</span>
                                  </div>
                                )}
                              </div>
                            </div>
                            
                            <button
                              type="button"
                              onClick={() => {
                                setSelectedClient(null);
                                setNewClient('');
                                setNewPhone('');
                                setPhoneCountryCode('+58');
                                setNewCedula('');
                                setNewLocation('');
                              }}
                              className="absolute top-2.5 right-2.5 text-slate-400 hover:text-red-500 p-1 hover:bg-white dark:hover:bg-slate-800 rounded-lg border border-transparent hover:border-slate-200/50 dark:hover:border-slate-700 transition-all cursor-pointer"
                              title="Deseleccionar cliente"
                            >
                              <X className="w-3.5 h-3.5" />
                            </button>
                          </div>

                          {/* Inline Edit Form */}
                          <div className="bg-slate-50 dark:bg-slate-800/30 rounded-xl p-3.5 border border-slate-200/60 dark:border-slate-800 space-y-3">
                            <span className="font-bold text-slate-700 dark:text-slate-350 block border-b border-slate-200/60 dark:border-slate-800 pb-1.5 text-[10px] uppercase tracking-wide">
                              Confirmar o Editar Datos de Contacto:
                            </span>

                            <div className="grid grid-cols-2 gap-3">
                              {/* Phone */}
                              <div className="col-span-2 space-y-1">
                                <label className="font-semibold text-slate-750 dark:text-slate-400">Teléfono (WhatsApp)</label>
                                <div className="flex gap-1.5">
                                  <select
                                    value={phoneCountryCode}
                                    onChange={(e) => setPhoneCountryCode(e.target.value)}
                                    className="w-20 shrink-0 font-semibold"
                                  >
                                    <option value="+58">🇻🇪 +58</option>
                                    <option value="+57">🇨🇴 +57</option>
                                    <option value="+52">🇲🇽 +52</option>
                                    <option value="+54">🇦🇷 +54</option>
                                    <option value="+56">🇨🇱 +56</option>
                                    <option value="+51">🇵🇪 +51</option>
                                    <option value="+593">🇪🇨 +593</option>
                                    <option value="+55">🇧🇷 +55</option>
                                    <option value="+506">🇨🇷 +506</option>
                                    <option value="+507">🇵🇦 +507</option>
                                    <option value="+503">🇸🇻 +503</option>
                                    <option value="+502">🇬🇹 +502</option>
                                    <option value="+1">🇺🇸 +1</option>
                                    <option value="+34">🇪🇸 +34</option>
                                  </select>
                                  <input
                                    type="tel"
                                    placeholder="412 123 4567"
                                    value={newPhone}
                                    onChange={(e) => setNewPhone(e.target.value)}
                                  />
                                </div>
                              </div>

                              {/* Cedula */}
                              <div className="space-y-1">
                                <label className="font-semibold text-slate-750 dark:text-slate-400">Cédula</label>
                                <input
                                  type="text"
                                  placeholder="Ej: V-12345678"
                                  value={newCedula}
                                  onChange={(e) => setNewCedula(e.target.value)}
                                />
                              </div>

                              {/* Location */}
                              <div className="space-y-1">
                                <label className="font-semibold text-slate-750 dark:text-slate-400">Ubicación</label>
                                <input
                                  type="text"
                                  placeholder="Ej: Mesa 4"
                                  value={newLocation}
                                  onChange={(e) => setNewLocation(e.target.value)}
                                />
                              </div>
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                  )}

                  {/* Mode: New Client Form */}
                  {clientSelectionMode === 'new' && (
                    <div className="space-y-3.5">
                      {/* Client Name */}
                      <div className="space-y-1">
                        <label className="font-semibold text-slate-700 dark:text-slate-350">
                          Nombre del Cliente <span className="text-red-500">*</span>
                        </label>
                        <input
                          type="text"
                          placeholder="Ej: Juan Pérez"
                          value={newClient}
                          onChange={(e) => setNewClient(e.target.value)}
                          required
                          autoFocus
                        />
                      </div>

                      {/* Phone */}
                      <div className="space-y-1">
                        <label className="font-semibold text-slate-700 dark:text-slate-355">Teléfono (WhatsApp)</label>
                        <div className="flex gap-1.5">
                          <select
                            value={phoneCountryCode}
                            onChange={(e) => setPhoneCountryCode(e.target.value)}
                            className="w-20 shrink-0 font-semibold"
                          >
                            <option value="+58">🇻🇪 +58</option>
                            <option value="+57">🇨🇴 +57</option>
                            <option value="+52">🇲🇽 +52</option>
                            <option value="+54">🇦🇷 +54</option>
                            <option value="+56">🇨🇱 +56</option>
                            <option value="+51">🇵🇪 +51</option>
                            <option value="+593">🇪🇨 +593</option>
                            <option value="+55">🇧🇷 +55</option>
                            <option value="+506">🇨🇷 +506</option>
                            <option value="+507">🇵🇦 +507</option>
                            <option value="+503">🇸🇻 +503</option>
                            <option value="+502">🇬🇹 +502</option>
                            <option value="+1">🇺🇸 +1</option>
                            <option value="+34">🇪🇸 +34</option>
                          </select>
                          <input
                            type="tel"
                            placeholder="412 123 4567"
                            value={newPhone}
                            onChange={(e) => setNewPhone(e.target.value)}
                          />
                        </div>
                      </div>

                      <div className="grid grid-cols-2 gap-3">
                        {/* Cedula */}
                        <div className="space-y-1">
                          <label className="font-semibold text-slate-700 dark:text-slate-355">Cédula</label>
                          <input
                            type="text"
                            placeholder="Ej: V-12345678"
                            value={newCedula}
                            onChange={(e) => setNewCedula(e.target.value)}
                          />
                        </div>

                        {/* Location */}
                        <div className="space-y-1">
                          <label className="font-semibold text-slate-700 dark:text-slate-355">Ubicación</label>
                          <input
                            type="text"
                            placeholder="Ej: Mesa 4, Madrid"
                            value={newLocation}
                            onChange={(e) => setNewLocation(e.target.value)}
                          />
                        </div>
                      </div>
                    </div>
                  )}
                </div>

                {/* COLUMN 2: ACCOUNT/TRANSACTION DETAILS */}
                <div className="space-y-4">
                  <span className="font-bold text-[#6366F1] dark:text-[#6366F1] text-xs uppercase tracking-wide block mb-1">
                    2. Detalles de la Deuda / Cobro
                  </span>

                  {/* Warning/Alert notice about debt */}
                  <div className="bg-amber-50/70 dark:bg-amber-950/10 border border-amber-200/50 dark:border-amber-900/30 rounded-xl p-3 text-[11px] text-amber-800 dark:text-amber-300 font-medium space-y-1">
                    <span className="font-bold block text-amber-850 dark:text-amber-400">⚠️ Registro de Saldo Pendiente</span>
                    <p className="leading-normal">
                      Esta operación creará una cuenta por cobrar. Si el abono inicial es inferior al monto total, el sistema considerará la diferencia como la <strong>deuda activa</strong> del cliente.
                    </p>
                  </div>

                  {/* Total Amount */}
                  <div className="space-y-1">
                    <label className="font-semibold text-slate-700 dark:text-slate-350">
                      Monto Total de la Deuda ($) <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="number"
                      step="0.01"
                      placeholder="Ej: 35000"
                      value={newAmount}
                      onChange={(e) => setNewAmount(e.target.value)}
                      required
                    />
                  </div>

                  {/* Status selector */}
                  <div className="space-y-1">
                    <label className="font-semibold text-slate-700 dark:text-slate-350">Estado de Pago</label>
                    <select
                      value={newStatus}
                      onChange={(e) => setNewStatus(e.target.value as 'Pagado' | 'Cobrar')}
                    >
                      <option value="Cobrar">Por cobrar (Generará saldo pendiente/deuda)</option>
                      <option value="Pagado">Pagado (Totalmente cancelado, sin deuda)</option>
                    </select>
                  </div>

                  {/* Initial payment input */}
                  <div className="space-y-1">
                    <label className="font-semibold text-slate-700 flex justify-between items-center dark:text-slate-350">
                      <span>Abono Inicial ($) (Resta de la deuda)</span>
                      <span className="text-[10px] text-slate-400 dark:text-slate-500 font-normal">Opcional</span>
                    </label>
                    <input
                      type="number"
                      step="0.01"
                      placeholder="Ej: 15000"
                      value={newStatus === 'Pagado' ? newAmount : newPaidAmount}
                      disabled={newStatus === 'Pagado'}
                      onChange={(e) => setNewPaidAmount(e.target.value)}
                    />
                  </div>

                  {/* Date Picker */}
                  <div className="space-y-1">
                    <label className="font-semibold text-slate-700 dark:text-slate-355">Fecha de Registro</label>
                    <input
                      type="date"
                      value={newDate}
                      onChange={(e) => setNewDate(e.target.value)}
                    />
                  </div>
                </div>

                {/* Form Error alert */}
                {formError && (
                  <div className="md:col-span-2 text-xs font-semibold text-red-650 bg-red-50 p-3 rounded-lg border border-red-100 dark:bg-red-950/20 dark:border-red-900/50 dark:text-red-400 flex items-center gap-2">
                    <AlertCircle className="w-4 h-4 text-red-500 shrink-0" />
                    <span>{formError}</span>
                  </div>
                )}
              </div>

              {/* Modal Footer */}
              <div className="p-5 border-t border-slate-150 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/50 flex justify-end gap-3.5">
                <button
                  type="button"
                  onClick={() => setShowAddForm(false)}
                  className="px-4 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-750 font-semibold text-slate-700 dark:text-slate-300 transition-colors cursor-pointer text-xs"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-lg bg-[#6366F1] hover:bg-[#4f46e5] text-white font-semibold shadow-xs hover:shadow-sm transition-colors cursor-pointer text-xs"
                >
                  Registrar Transacción
                </button>
              </div>
            </form>
          </div>
        </div>
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

          {/* Status selection buttons */}
          <div className="lg:col-span-2 flex border border-slate-200 rounded-lg overflow-hidden text-xs bg-white p-0.5 dark:bg-slate-800 dark:border-slate-700">
            {(['todos', 'Pagado', 'Cobrar'] as const).map((st) => (
              <button
                key={st}
                onClick={() => handleFilterUpdate({ status: st })}
                className={`flex-1 py-1 px-1.5 rounded-md text-[10px] font-semibold transition-colors cursor-pointer capitalize ${
                  filter.status === st 
                    ? 'bg-[#6366F1] text-white shadow-xs dark:bg-[#6366F1]' 
                    : 'text-slate-500 hover:bg-slate-50 hover:text-slate-800 dark:text-slate-400 dark:hover:bg-slate-700/50 dark:hover:text-slate-200'
                }`}
              >
                {st === 'todos' ? 'Todos' : st === 'Pagado' ? 'Pagados' : 'Por Cobrar'}
              </button>
            ))}
          </div>
        </div>

      </div>

      {/* Transaction List */}
      <div className="overflow-auto max-h-[60vh] border-y border-slate-200 dark:border-slate-800">
        <table>
          <thead className="sticky top-0 z-10 bg-slate-50 ring-1 ring-slate-200 dark:bg-slate-800 dark:ring-slate-700">
            <tr className="bg-slate-50 text-slate-500 font-bold uppercase tracking-wider dark:bg-slate-800 dark:text-slate-450">
              <th className="py-3 px-6 text-[10px]">ID</th>
              <th className="py-3 px-6 text-[10px]">Cliente</th>
              <th className="py-3 px-6 text-[10px]">Cédula</th>
              <th className="py-3 px-6 text-[10px]">Fecha</th>
              <th className="py-3 px-6 text-[10px]">Monto Total</th>
              <th className="py-3 px-6 text-[10px] min-w-[200px]">Abonos y Saldo</th>
              <th className="py-3 px-6 text-center text-[10px]">Estado de Pago</th>
              <th className="py-3 px-6 text-right text-[10px]">Acción</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 font-semibold dark:divide-slate-800">
            {paginatedTransactions.length === 0 ? (
              <tr>
                <td colSpan={8} className="py-12 text-center text-slate-400">
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
              paginatedTransactions.map((t) => {
                const paid = t.status === 'Pagado' ? t.amount : (t.paidAmount || 0);
                const pending = Math.max(0, t.amount - paid);
                const ratio = Math.min(100, Math.round((paid / (t.amount || 1)) * 100));

                return (
                  <tr key={t.id} className="hover:bg-slate-50/60 transition-colors group dark:hover:bg-slate-800/60">
                    <td className="py-3.5 px-6 font-mono text-slate-400 text-[11px]">{t.id}</td>
                    <td className="py-3.5 px-6 text-slate-900 font-bold dark:text-slate-100">
                      <div className="flex flex-col">
                        <span>{t.clientName}</span>
                        {t.phone && (
                          <span className="text-[10px] text-slate-400 flex items-center gap-1 font-mono mt-0.5 font-medium">
                            <Phone className="w-2.5 h-2.5" />
                            {t.phone}
                          </span>
                        )}
                        {t.location && (
                          <span className="text-[10px] text-[#06B6D4] flex items-center gap-1 font-mono mt-0.5 font-semibold" title="Ubicación del cliente">
                            <MapPin className="w-2.5 h-2.5 text-[#06B6D4]" />
                            {t.location}
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="py-3.5 px-6 text-slate-500">{t.cedula || <span className="text-slate-300 italic">No esp.</span>}</td>
                    <td className="py-3.5 px-6 text-slate-500">{t.date}</td>
                    <td className="py-3.5 px-6 text-slate-900 font-bold font-mono text-sm text-[13px] dark:text-slate-100">
                      {formatMoney(t.amount)}
                    </td>
                    
                    {/* Abonos y Saldo dynamic column */}
                    <td className="py-3.5 px-6">
                      <div className="flex flex-col gap-1 py-0.5 max-w-[220px]">
                        <div className="flex justify-between items-center text-[11px]">
                          <span className="text-emerald-700 font-bold font-mono" title="Monto abonado hasta ahora">
                            {formatMoney(paid)}
                          </span>
                          {pending > 0 ? (
                            <span className="text-rose-650 dark:text-rose-400 font-bold font-mono" title="Monto restante">
                              - {formatMoney(pending)}
                            </span>
                          ) : (
                            <span className="text-emerald-600 text-[9px] uppercase font-extrabold tracking-wider bg-emerald-50 px-1.5 py-0.5 rounded border border-emerald-100 dark:bg-emerald-950/20 dark:text-emerald-400 dark:border-emerald-900/50">
                              Completo
                            </span>
                          )}
                        </div>
                        
                        {/* Visual Progress Bar */}
                        <div className="w-full bg-slate-100 dark:bg-slate-800 h-1.5 rounded-full overflow-hidden relative shadow-inner">
                          <div 
                            className={`h-full transition-all duration-300 rounded-full ${
                              t.status === 'Pagado' ? 'bg-emerald-500' : ratio > 60 ? 'bg-[#6366F1]' : ratio > 20 ? 'bg-[#06B6D4]' : 'bg-rose-500'
                            }`}
                            style={{ width: `${ratio}%` }}
                          />
                        </div>

                        <div className="flex items-center justify-between mt-0.5 text-[10px]">
                          <span className="text-slate-450 dark:text-slate-500 font-mono font-medium">{ratio}% abonado</span>
                          
                          {/* Buttons and triggers */}
                          <div className="flex items-center gap-1.5">
                            {t.payments && t.payments.length > 0 && (
                              <button
                                type="button"
                                onClick={() => setShowHistoryTxId(showHistoryTxId === t.id ? null : t.id)}
                                className={`text-slate-400 hover:text-[#6366F1] transition-colors p-0.5 rounded cursor-pointer ${
                                  showHistoryTxId === t.id ? 'bg-[#6366F1]/10 text-[#6366F1] dark:bg-[#6366F1]/20 dark:text-indigo-400' : 'hover:bg-slate-100 dark:hover:bg-slate-700'
                                }`}
                                title="Ver historial de abonos"
                              >
                                <History className="w-3.5 h-3.5" />
                              </button>
                            )}

                            {t.status !== 'Pagado' && (
                              <button
                                type="button"
                                onClick={() => {
                                  if (activeAbonoTxId === t.id) {
                                    setActiveAbonoTxId(null);
                                  } else {
                                    setActiveAbonoTxId(t.id);
                                    setInlineAbonoVal('');
                                    setInlineAbonoErr('');
                                  }
                                }}
                                className={`transition-all font-bold px-1.5 py-0.5 rounded text-[10px] flex items-center gap-0.5 cursor-pointer border ${
                                  activeAbonoTxId === t.id 
                                    ? 'bg-amber-600 border-amber-600 text-white dark:bg-amber-500 dark:border-amber-500' 
                                    : 'bg-[#6366F1]/10 hover:bg-[#6366F1]/20 border-[#6366F1]/20 text-[#6366F1] dark:bg-[#6366F1]/20 dark:border-[#6366F1]/30 dark:text-indigo-400 dark:hover:bg-[#6366F1]/30 dark:hover:text-indigo-300'
                                }`}
                                title="Registrar nuevo abono"
                              >
                                <Plus className="w-3 h-3" />
                                <span>Abonar</span>
                              </button>
                            )}
                          </div>
                        </div>

                        {/* Inline Abono Field */}
                        {activeAbonoTxId === t.id && (
                          <div className="mt-1.5 bg-white border border-[#6366F1]/20 rounded-lg p-2 flex flex-col gap-1 shadow-sm animate-fade-in text-[10px] dark:bg-slate-900 dark:border-slate-700">
                            <span className="font-semibold text-slate-700 dark:text-slate-300">Registrar nuevo abono:</span>
                            <div className="flex items-center gap-1">
                              <input
                                type="number"
                                step="0.01"
                                placeholder={`Máx $${pending}`}
                                value={inlineAbonoVal}
                                onChange={(e) => {
                                  setInlineAbonoVal(e.target.value);
                                  setInlineAbonoErr('');
                                }}
                                className="w-full p-1"
                              />
                              <button
                                type="button"
                                onClick={() => {
                                  const val = parseFloat(inlineAbonoVal);
                                  if (isNaN(val) || val <= 0) {
                                    setInlineAbonoErr('Monto inválido');
                                    return;
                                  }
                                  if (val > pending) {
                                    setInlineAbonoErr('Excede saldo');
                                    return;
                                  }
                                  onRegisterPayment(t.id, val, new Date().toISOString().substring(0, 10));
                                  setActiveAbonoTxId(null);
                                  setInlineAbonoVal('');
                                }}
                                className="bg-emerald-650 hover:bg-emerald-700 text-white p-1 rounded cursor-pointer dark:bg-emerald-600 dark:hover:bg-emerald-650"
                                title="Confirmar abono"
                              >
                                <Check className="w-3.5 h-3.5" />
                              </button>
                              <button
                                type="button"
                                onClick={() => setActiveAbonoTxId(null)}
                                className="bg-slate-200 hover:bg-slate-250 text-slate-600 p-1 rounded cursor-pointer dark:bg-slate-800 dark:hover:bg-slate-750 dark:text-slate-300"
                                title="Cancelar"
                              >
                                <X className="w-3.5 h-3.5" />
                              </button>
                            </div>
                            {inlineAbonoErr && (
                              <span className="text-[9px] text-rose-650 font-semibold dark:text-rose-400">{inlineAbonoErr}</span>
                            )}
                          </div>
                        )}

                        {/* Historical Payments Display */}
                        {showHistoryTxId === t.id && t.payments && (
                          <div className="mt-1.5 bg-slate-50 border border-slate-200 rounded-lg p-2 flex flex-col gap-1 text-[10px] shadow-sm font-medium max-h-[100px] overflow-y-auto dark:bg-slate-900/50 dark:border-slate-700">
                            <span className="font-bold text-slate-500 text-[9px] uppercase border-b border-slate-200 pb-0.5 dark:text-slate-400 dark:border-slate-700">Historial de abonos:</span>
                            {t.payments.map((h, i) => (
                              <div key={i} className="flex justify-between items-center text-[10px] font-mono border-b border-slate-100 last:border-none py-0.5 text-slate-600 dark:border-slate-800 dark:text-slate-300">
                                <span>{h.date}</span>
                                <span className="font-bold text-emerald-700 dark:text-emerald-400">+{formatMoney(h.amount)}</span>
                              </div>
                            ))}
                            <button 
                              type="button" 
                              onClick={() => setShowHistoryTxId(null)} 
                              className="text-[9px] text-[#06B6D4] hover:text-[#0891b2] hover:underline text-center font-bold mt-1 cursor-pointer dark:text-[#06B6D4]"
                            >
                              Ocultar historial
                            </button>
                          </div>
                        )}
                      </div>
                    </td>

                    <td className="py-3.5 px-6 text-center text-[11px]">
                      <button
                        onClick={() => onToggleStatus(t.id)}
                        className={
                          `badge cursor-pointer transition-all duration-150 ` + (
                          t.status === 'Pagado'
                            ? 'badge-success hover:brightness-95'
                            : 'badge-warning hover:brightness-95'
                          )
                        }
                        title="Haz clic para alternar estado"
                      >
                        {t.status === 'Pagado' ? (
                          <>
                            <CheckCircle2 className="w-3 h-3" />
                            Pagado
                          </>
                        ) : (
                          <>
                            <AlertCircle className="w-3 h-3" />
                            Cobrar
                          </>
                        )}
                      </button>
                    </td>
                    <td className="py-3.5 px-6 text-right">
                      <button
                        onClick={() => onDeleteTransaction(t.id)}
                        className="text-slate-300 hover:text-rose-600 p-1 rounded-lg hover:bg-rose-50 transition-colors opacity-0 group-hover:opacity-100 focus:opacity-100 cursor-pointer dark:hover:bg-rose-500/10 dark:hover:text-rose-400"
                        title="Eliminar transacción"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
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
            de <span className="font-bold text-slate-850 dark:text-slate-200">{filteredTransactions.length}</span> transacciones
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

    </div>
  );
};
