import React, { useState, useMemo } from 'react';
import { useFormik } from 'formik';
import * as Yup from 'yup';
import { PlusCircle, X, Users, UserPlus, Search, Loader2 } from 'lucide-react';
import { Transaction } from '../types';

interface AddTransactionModalProps {
  transactions: Transaction[];
  onAddTransaction: (newTx: Omit<Transaction, 'id'>) => Promise<void> | void;
  onClose: () => void;
  initialClient?: { name: string; cedula: string; phone: string; location: string };
  currentRate?: number | null;
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

const parseCedula = (cedulaStr: string) => {
  if (!cedulaStr) return { type: 'V', number: '' };
  const clean = cedulaStr.trim();
  const parts = clean.split('-');
  if (parts.length === 2) {
    const type = parts[0].toUpperCase();
    if (['V', 'E', 'J', 'G', 'P'].includes(type)) {
      return { type, number: parts[1] };
    }
  }
  const match = clean.match(/^([VEJGP])[-]?(\d+)$/i);
  if (match) {
    return { type: match[1].toUpperCase(), number: match[2] };
  }
  return { type: 'V', number: clean };
};

export const AddTransactionModal: React.FC<AddTransactionModalProps> = ({
  transactions,
  onAddTransaction,
  onClose,
  initialClient,
  currentRate,
}) => {
  const [clientSelectionMode, setClientSelectionMode] = useState<'existing' | 'new'>(initialClient ? 'existing' : 'existing');
  const [clientSearch, setClientSearch] = useState('');

  const uniqueClients = useMemo(() => {
    const clientsMap = new Map<string, any>();
    transactions.forEach((t) => {
      if (t.clientName && !clientsMap.has(t.clientName.toLowerCase())) {
        clientsMap.set(t.clientName.toLowerCase(), {
          name: t.clientName,
          phone: t.phone,
          cedula: t.cedula,
          location: t.location,
        });
      }
    });
    return Array.from(clientsMap.values());
  }, [transactions]);

  const filteredClients = useMemo(() => {
    const term = clientSearch.toLowerCase();
    return uniqueClients.filter(
      (c) =>
        c.name.toLowerCase().includes(term) ||
        (c.phone && c.phone.includes(term)) ||
        (c.cedula && c.cedula.includes(term))
    );
  }, [uniqueClients, clientSearch]);

  const formik = useFormik({
    initialValues: {
      clientName: initialClient?.name || '',
      cedulaType: initialClient ? parseCedula(initialClient.cedula).type : 'V',
      cedulaNumber: initialClient ? parseCedula(initialClient.cedula).number : '',
      amount: '',
      paidAmount: '',
      status: 'Cobrar',
      date: new Date().toISOString().substring(0, 10),
      dueDate: new Date().toISOString().substring(0, 10),
      phone: initialClient ? parsePhoneNumber(initialClient.phone).number : '',
      phoneCountryCode: initialClient ? parsePhoneNumber(initialClient.phone).code : '+58',
      location: initialClient?.location || '',
      selectedClient: !!initialClient,
    },
    validationSchema: Yup.object({
      clientName: Yup.string().required('El nombre del cliente es obligatorio'),
      amount: Yup.number()
        .typeError('El monto debe ser un número')
        .positive('El monto debe ser mayor a cero')
        .required('El monto es obligatorio'),
      paidAmount: Yup.number()
        .typeError('El abono debe ser un número')
        .min(0, 'El abono inicial no puede ser negativo')
        .test('max-paid', 'El abono no puede ser mayor al monto', function (value) {
          return value === undefined || value <= this.parent.amount;
        }),
      date: Yup.string().required('La fecha de transacción es obligatoria'),
    }),
    onSubmit: async (values, { setSubmitting }) => {
      try {
        setSubmitting(true);
        const amt = parseFloat(values.amount);
        const initialPaid = parseFloat(values.paidAmount) || 0;
        
        let finalPhone: string | undefined = undefined;
        const trimmedPhone = values.phone.trim();
        if (trimmedPhone) {
          if (trimmedPhone.startsWith('+')) {
            finalPhone = trimmedPhone;
          } else {
            finalPhone = `${values.phoneCountryCode}${trimmedPhone}`;
          }
        }

        const finalCed = values.cedulaNumber.trim() ? `${values.cedulaType}-${values.cedulaNumber.trim()}` : undefined;
        
        await onAddTransaction({
          clientName: values.clientName.trim(),
          amount: amt,
          status: values.status === 'Pagado' ? 'Pagado' : initialPaid === amt ? 'Pagado' : 'Cobrar',
          date: values.date,
          dueDate: values.dueDate,
          phone: finalPhone,
          cedula: finalCed,
          location: values.location.trim() || undefined,
          paidAmount: initialPaid,
        });

        onClose();
      } catch (error) {
        console.error("Error al guardar transacción", error);
      } finally {
        setSubmitting(false);
      }
    },
  });

  const selectExistingClient = (client: any) => {
    formik.setFieldValue('clientName', client.name);
    const parsedCed = parseCedula(client.cedula || '');
    formik.setFieldValue('cedulaType', parsedCed.type);
    formik.setFieldValue('cedulaNumber', parsedCed.number);
    formik.setFieldValue('location', client.location || '');
    if (client.phone) {
      const parsed = parsePhoneNumber(client.phone);
      formik.setFieldValue('phoneCountryCode', parsed.code);
      formik.setFieldValue('phone', parsed.number);
    } else {
      formik.setFieldValue('phoneCountryCode', '+58');
      formik.setFieldValue('phone', '');
    }
    formik.setFieldValue('selectedClient', true);
  };

  const setMode = (mode: 'existing' | 'new') => {
    setClientSelectionMode(mode);
    formik.setFieldValue('selectedClient', false);
    formik.setFieldValue('clientName', '');
    formik.setFieldValue('cedulaType', 'V');
    formik.setFieldValue('cedulaNumber', '');
    formik.setFieldValue('phone', '');
    formik.setFieldValue('phoneCountryCode', '+58');
    formik.setFieldValue('location', '');
  };

  const setRelativeDueDate = (days: number) => {
    const d = new Date();
    d.setDate(d.getDate() + days);
    formik.setFieldValue('dueDate', d.toISOString().substring(0, 10));
  };

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4 overflow-y-auto">
      <div className="bg-white dark:bg-slate-900 rounded-xl shadow-xl border border-slate-200 dark:border-slate-800 w-full max-w-3xl overflow-hidden animate-fade-in relative">
        <div className="p-5 border-b border-slate-150 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/50 flex items-center justify-between">
          <div>
            <h3 className="text-sm font-bold text-slate-950 dark:text-slate-100 flex items-center gap-2">
              <PlusCircle className="w-5 h-5 text-[#6366F1]" />
              Registrar Nueva Deuda / Cuenta
            </h3>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="text-slate-400 hover:text-slate-600 p-1.5 rounded-lg hover:bg-slate-100 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={formik.handleSubmit}>
          <div className="p-6 grid grid-cols-1 md:grid-cols-2 gap-6 max-h-[65vh] overflow-y-auto text-xs">
            {/* Column 1: Client */}
            <div className="space-y-4 border-b md:border-b-0 md:border-r border-slate-150 pb-6 md:pb-0 md:pr-6">
              <div className="flex bg-slate-100 p-1 rounded-lg">
                <button
                  type="button"
                  disabled={uniqueClients.length === 0}
                  onClick={() => setMode('existing')}
                  className={`flex-1 py-1.5 px-3 rounded-md font-bold flex items-center justify-center gap-1.5 ${
                    clientSelectionMode === 'existing' ? 'bg-white shadow-xs text-slate-900' : 'text-slate-500'
                  }`}
                >
                  <Users className="w-3.5 h-3.5" /> Existente
                </button>
                <button
                  type="button"
                  onClick={() => setMode('new')}
                  className={`flex-1 py-1.5 px-3 rounded-md font-bold flex items-center justify-center gap-1.5 ${
                    clientSelectionMode === 'new' ? 'bg-white shadow-xs text-slate-900' : 'text-slate-500'
                  }`}
                >
                  <UserPlus className="w-3.5 h-3.5" /> Nuevo
                </button>
              </div>

              {clientSelectionMode === 'existing' && !formik.values.selectedClient ? (
                <div className="space-y-3">
                  <div className="relative">
                    <Search className="absolute left-3 top-2.5 text-slate-400 w-4 h-4" />
                    <input
                      type="text"
                      placeholder="Escribe nombre o cédula..."
                      value={clientSearch}
                      onChange={(e) => setClientSearch(e.target.value)}
                      className="w-full border p-2 pl-9 rounded"
                    />
                  </div>
                  <div className="border border-slate-200 rounded-lg max-h-52 overflow-y-auto divide-y divide-slate-100 bg-white">
                    {filteredClients.map((client, idx) => (
                      <button
                        key={idx}
                        type="button"
                        onClick={() => selectExistingClient(client)}
                        className="w-full text-left p-2.5 hover:bg-slate-50 flex items-center gap-3"
                      >
                        <div className="flex-1 min-w-0">
                          <p className="font-bold text-slate-850 truncate">{client.name}</p>
                        </div>
                      </button>
                    ))}
                  </div>
                </div>
              ) : (
                <div className="space-y-3">
                  <div>
                    <label className="font-semibold block mb-1">Nombre Completo *</label>
                    <input
                      type="text"
                      name="clientName"
                      value={formik.values.clientName}
                      onChange={formik.handleChange}
                      disabled={clientSelectionMode === 'existing'}
                      className="w-full border p-2 rounded"
                    />
                    {formik.touched.clientName && formik.errors.clientName && (
                      <div className="text-red-500 text-xs mt-1">{formik.errors.clientName}</div>
                    )}
                  </div>
                  <div>
                    <label className="font-semibold block mb-1">Documento de Identidad (Cédula / RIF)</label>
                    <div className="flex">
                      <select
                        name="cedulaType"
                        value={formik.values.cedulaType}
                        onChange={formik.handleChange}
                        disabled={clientSelectionMode === 'existing'}
                        className="border border-r-0 rounded-l p-2 bg-slate-50 font-bold cursor-pointer"
                      >
                        <option value="V">V</option>
                        <option value="E">E</option>
                        <option value="J">J</option>
                        <option value="G">G</option>
                        <option value="P">P</option>
                      </select>
                      <input
                        type="text"
                        name="cedulaNumber"
                        value={formik.values.cedulaNumber}
                        onChange={formik.handleChange}
                        disabled={clientSelectionMode === 'existing'}
                        className="w-full border rounded-r p-2"
                        placeholder="Ej. 12345678"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="font-semibold block mb-1">Teléfono (WhatsApp)</label>
                    <div className="flex">
                      <select
                        name="phoneCountryCode"
                        value={formik.values.phoneCountryCode}
                        onChange={formik.handleChange}
                        disabled={clientSelectionMode === 'existing'}
                        className="border border-r-0 rounded-l p-2 bg-slate-50 font-bold cursor-pointer"
                      >
                        <option value="+58">+58 (VE)</option>
                        <option value="+57">+57 (CO)</option>
                        <option value="+1">+1 (US/CA)</option>
                        <option value="+34">+34 (ES)</option>
                      </select>
                      <input
                        type="text"
                        name="phone"
                        value={formik.values.phone}
                        onChange={formik.handleChange}
                        disabled={clientSelectionMode === 'existing'}
                        className="w-full border rounded-r p-2"
                        placeholder="Ej. 4141234567"
                      />
                    </div>
                  </div>
                  {clientSelectionMode === 'existing' && (
                    <button
                      type="button"
                      onClick={() => setMode('existing')}
                      className="text-xs text-indigo-600 font-bold hover:underline"
                    >
                      Elegir otro cliente
                    </button>
                  )}
                </div>
              )}
            </div>

            {/* Column 2: Transaction */}
            <div className="space-y-4">
              <div>
                <label className="font-semibold block mb-1">Monto Total *</label>
                <input
                  type="number"
                  name="amount"
                  value={formik.values.amount}
                  onChange={formik.handleChange}
                  step="0.01"
                  className="w-full border p-2 rounded text-lg font-bold"
                />
                {formik.touched.amount && formik.errors.amount && (
                  <div className="text-red-500 text-xs mt-1">{formik.errors.amount}</div>
                )}
                {currentRate && formik.values.amount && !isNaN(Number(formik.values.amount)) && (
                  <div className="text-[10px] text-slate-500 mt-1 font-medium">
                    Eq. {(Number(formik.values.amount) * currentRate).toLocaleString('es-VE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} Bs. (Tasa: {currentRate})
                  </div>
                )}
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="font-semibold block mb-1">Abono Inicial</label>
                  <input
                    type="number"
                    name="paidAmount"
                    value={formik.values.paidAmount}
                    onChange={formik.handleChange}
                    step="0.01"
                    className="w-full border p-2 rounded"
                    placeholder="0.00"
                  />
                  {formik.touched.paidAmount && formik.errors.paidAmount && (
                    <div className="text-red-500 text-xs mt-1">{formik.errors.paidAmount}</div>
                  )}
                  {currentRate && formik.values.paidAmount && !isNaN(Number(formik.values.paidAmount)) && (
                    <div className="text-[10px] text-slate-500 mt-1 font-medium">
                      Eq. {(Number(formik.values.paidAmount) * currentRate).toLocaleString('es-VE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} Bs.
                    </div>
                  )}
                </div>
                <div>
                  <label className="font-semibold block mb-1">Fecha de Vencimiento *</label>
                  <input
                    type="date"
                    name="dueDate"
                    value={formik.values.dueDate}
                    onChange={formik.handleChange}
                    className="w-full border p-2 rounded"
                  />
                  <div className="flex gap-1 mt-1.5 flex-wrap">
                    <button
                      type="button"
                      onClick={() => setRelativeDueDate(0)}
                      className="px-2 py-0.5 text-[9px] bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-350 font-bold rounded cursor-pointer"
                    >
                      Hoy
                    </button>
                    <button
                      type="button"
                      onClick={() => setRelativeDueDate(7)}
                      className="px-2 py-0.5 text-[9px] bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-350 font-bold rounded cursor-pointer"
                    >
                      +1 sem
                    </button>
                    <button
                      type="button"
                      onClick={() => setRelativeDueDate(15)}
                      className="px-2 py-0.5 text-[9px] bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-350 font-bold rounded cursor-pointer"
                    >
                      +15 días
                    </button>
                    <button
                      type="button"
                      onClick={() => setRelativeDueDate(30)}
                      className="px-2 py-0.5 text-[9px] bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-350 font-bold rounded cursor-pointer"
                    >
                      +1 mes
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div className="p-4 border-t border-slate-150 bg-slate-50 flex justify-end gap-3">
            <button
              type="button"
              onClick={onClose}
              className="btn btn-secondary"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={formik.isSubmitting}
              className="btn btn-primary flex items-center gap-2"
            >
              {formik.isSubmitting ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Guardando...</span>
                </>
              ) : (
                <span>Guardar Cuenta</span>
              )}
            </button>
          </div>
        </form>

        {formik.isSubmitting && (
          <div className="absolute inset-0 z-50 flex flex-col items-center justify-center bg-white/85 dark:bg-slate-900/85 backdrop-blur-xs rounded-xl transition-all">
            <div className="flex flex-col items-center p-6 bg-white dark:bg-slate-800 rounded-xl shadow-xl border border-indigo-100 dark:border-indigo-900">
              <Loader2 className="w-9 h-9 text-indigo-600 dark:text-indigo-400 animate-spin mb-3" />
              <h4 className="text-sm font-bold text-slate-800 dark:text-slate-100">Guardando Cuenta por Cobrar...</h4>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">Registrando la transacción en la base de datos</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
