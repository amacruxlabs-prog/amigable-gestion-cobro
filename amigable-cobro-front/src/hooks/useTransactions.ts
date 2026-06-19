import { useState, useEffect, useCallback } from 'react';
import { Transaction, ColumnMapping, FilterState } from '../types';
import { useAuth } from '../contexts/AuthContext';
import { useUI } from '../contexts/UIContext';
import { api } from '../lib/axios';

export function useTransactions() {
  const { user, isSuperadmin, isAdmin, isVisor } = useAuth();
  const { toast, confirm } = useUI();
  
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [calendarTxs, setCalendarTxs] = useState<Transaction[]>([]);
  const [dbLoading, setDbLoading] = useState(true);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);

  const [availableHeaders, setAvailableHeaders] = useState<string[]>(['Nombre de Cliente', 'Monto Total', 'Estado de Pago', 'Fecha']);
  const [currentMapping, setCurrentMapping] = useState<ColumnMapping>({
    clientNameKey: 'Nombre de Cliente', amountKey: 'Monto Total', statusKey: 'Estado de Pago',
    dateKey: 'Fecha', phoneKey: 'Teléfono', cedulaKey: 'Cédula', locationKey: 'Dirección'
  });
  const [sourceName, setSourceName] = useState<string>('Base de Datos');

  const [filters, setFilters] = useState<FilterState>({
    startDate: '', endDate: '', status: 'todos', searchTerm: ''
  });

  const [stats, setStats] = useState({
    salesTotal: 0, paidTotal: 0, receivableTotal: 0,
    salesCount: 0, paidCount: 0, receivableCount: 0, collectionRate: 0
  });

  const fetchTransactions = useCallback(async (page = 1) => {
    if (!user || (!isVisor && !isAdmin && !isSuperadmin) || (isSuperadmin && !user.business_id)) {
      setTransactions([]);
      setDbLoading(false);
      return;
    }

    try {
      setDbLoading(true);
      
      const [resTransactions, resAnalytics, resCalendar] = await Promise.all([
        api.get('/tenant/transactions', {
          params: {
            page,
            search: filters.searchTerm,
            status: filters.status !== 'todos' ? (filters.status === 'Pagado' ? 'PAID' : 'PENDING') : undefined,
            start_date: filters.startDate || undefined,
            end_date: filters.endDate || undefined,
          }
        }),
        api.get('/tenant/analytics/dashboard'),
        api.get('/tenant/transactions/calendar', {
          params: {
            start_date: filters.startDate || undefined,
            end_date: filters.endDate || undefined,
          }
        })
      ]);
      
      const paginatedData = resTransactions.data.data.transactions;
      const kpis = resAnalytics.data.data.kpis;
      const calendarData = resCalendar.data.data.transactions;
      
      const mappedTxs = paginatedData.data.map((t: any) => ({
        id: String(t.id),
        businessId: String(t.business_id),
        clientName: t.client_name,
        cedula: t.client_document || '',
        phone: t.client_phone || '',
        amount: Number(t.total_amount),
        paidAmount: Number(t.paid_amount),
        status: t.status === 'PAID' ? 'Pagado' : 'Por cobrar',
        date: t.created_at.substring(0, 10),
      }));

      const mappedCalendarTxs = calendarData.map((t: any) => ({
        id: String(t.id),
        businessId: String(t.business_id),
        clientName: t.client_name,
        amount: Number(t.total_amount),
        paidAmount: Number(t.paid_amount),
        status: t.status === 'PAID' ? 'Pagado' : 'Por cobrar',
        date: t.created_at.substring(0, 10),
      }));

      setTransactions(mappedTxs);
      setCalendarTxs(mappedCalendarTxs);
      setCurrentPage(paginatedData.current_page);
      setTotalPages(paginatedData.last_page);
      setStats(kpis);
      
    } catch (error) {
      toast('Error cargando transacciones o analíticas', 'error');
    } finally {
      setDbLoading(false);
    }
  }, [user, isVisor, isAdmin, isSuperadmin, filters]);

  useEffect(() => {
    fetchTransactions(currentPage);
  }, [fetchTransactions, currentPage]);

  const handleDataLoadedBySync = async (syncResult: any) => {
    fetchTransactions(1);
    toast('Datos importados y actualizados exitosamente.', 'success');
  };

  const handleResetToDemo = async () => {
    toast('Restaurar demo no soportado en producción.', 'error');
  };

  const handleUpdatePhone = async (id: string, newPhone: string) => {
    if (!isAdmin) return;
    try {
      await api.put(`/tenant/transactions/${id}`, { client_phone: newPhone });
      toast('Teléfono actualizado', 'success');
      fetchTransactions(currentPage);
    } catch(err) {
      toast("Error actualizando teléfono", 'error');
    }
  };

  const handleToggleStatus = async (id: string) => {
    if (!isAdmin) return;
    const t = transactions.find(tx => tx.id === id);
    if (!t) return;
    
    const nextStatus = t.status === 'Pagado' ? 'PENDING' : 'PAID';
    try {
      await api.put(`/tenant/transactions/${id}`, { 
        status: nextStatus,
        paid_amount: nextStatus === 'PAID' ? t.amount : 0
      });
      toast('Estado actualizado', 'success');
      fetchTransactions(currentPage);
    } catch(err) {
      toast("Error actualizando estado", 'error');
    }
  };

  const handleRegisterPayment = async (id: string, paymentAmount: number, paymentDate: string) => {
    if (!isAdmin) return;
    try {
      await api.post(`/tenant/transactions/${id}/payment`, { amount: paymentAmount });
      toast('Abono registrado exitosamente', 'success');
      fetchTransactions(currentPage);
    } catch(err) {
      toast("Error registrando abono", 'error');
    }
  };

  const handleDeleteTransaction = async (id: string) => {
    if (!isAdmin && !isSuperadmin) {
      toast("No tienes permiso.", 'error');
      return;
    }
    confirm({
      title: 'Eliminar Transacción',
      message: `¿Seguro que deseas eliminar esta cuenta? Esta acción no se puede deshacer.`,
      type: 'danger',
      onConfirm: async () => {
        try {
          await api.delete(`/tenant/transactions/${id}`);
          toast('Transacción eliminada', 'success');
          fetchTransactions(currentPage);
        } catch (error) {
          toast('Error al eliminar', 'error');
        }
      }
    });
  };

  const handleAddTransaction = async (newTx: Omit<Transaction, 'id'>) => {
    if (!isAdmin) return;
    try {
      await api.post('/tenant/transactions', {
        client_name: newTx.clientName,
        client_document: newTx.cedula || '',
        client_phone: newTx.phone || '',
        total_amount: newTx.amount,
        status: newTx.status === 'Pagado' ? 'PAID' : 'PENDING'
      });
      toast('Nueva cuenta creada', 'success');
      fetchTransactions(1);
    } catch (error) {
      toast('Error al crear transacción', 'error');
    }
  };

  const handleApplyDiscount = async (txIds: string[], percentage: number) => {
    if (!isAdmin && !isSuperadmin) return;
    toast("Función de descuento masivo en desarrollo.", 'error');
  };

  return {
    transactions,
    dbLoading,
    availableHeaders,
    currentMapping,
    sourceName,
    filters,
    setFilters,
    filteredTxsForKPIs: calendarTxs, // Now contains all non-paginated data for charts/calendar
    stats,
    handleDataLoadedBySync,
    handleResetToDemo,
    handleUpdatePhone,
    handleToggleStatus,
    handleRegisterPayment,
    handleDeleteTransaction,
    handleAddTransaction,
    handleApplyDiscount,
    currentPage,
    setCurrentPage,
    totalPages,
  };
}
