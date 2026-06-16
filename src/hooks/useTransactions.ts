import { useState, useEffect, useMemo } from 'react';
import { Transaction, ColumnMapping, FilterState } from '../types';
import { DEMO_TRANSACTIONS } from '../data/demoData';
import { useAuth } from '../contexts/AuthContext';
import { db, handleFirestoreError, OperationType, collection, query, onSnapshot, setDoc, doc, deleteDoc } from '../lib/firebase';
import { createAuditLog } from '../lib/audit';

export function useTransactions() {
  const { user, isSuperadmin, isAdmin, isVisor } = useAuth();
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [dbLoading, setDbLoading] = useState(true);

  // Available headers detected from current sync spreadsheet
  const [availableHeaders, setAvailableHeaders] = useState<string[]>(['Nombre de Cliente', 'Monto Total', 'Estado de Pago', 'Fecha']);

  // Current column mapping in use split
  const [currentMapping, setCurrentMapping] = useState<ColumnMapping>({
    clientNameKey: 'Nombre de Cliente', amountKey: 'Monto Total', statusKey: 'Estado de Pago',
    dateKey: 'Fecha', phoneKey: 'Teléfono', cedulaKey: 'Cédula', locationKey: 'Dirección'
  });

  const [sourceName, setSourceName] = useState<string>('Set de Demostración');

  const [filters, setFilters] = useState<FilterState>({
    startDate: '', endDate: '', status: 'todos', searchTerm: ''
  });

  // Load Transactions from Firestore
  useEffect(() => {
    if (!user || (!isVisor && !isAdmin && !isSuperadmin)) {
      setTransactions([]);
      setDbLoading(false);
      return;
    }
    const q = query(collection(db, 'transactions'));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const data: Transaction[] = [];
      snapshot.forEach(d => {
        data.push({ id: d.id, ...d.data() } as Transaction);
      });
      setTransactions(data);
      setDbLoading(false);
    }, (error) => {
      handleFirestoreError(error, OperationType.GET, 'transactions');
      setDbLoading(false);
    });
    return () => unsubscribe();
  }, [user, isVisor, isAdmin, isSuperadmin]);

  // Load Global Settings from Firestore
  useEffect(() => {
    if (!user || (!isVisor && !isAdmin && !isSuperadmin)) {
      return;
    }
    const unsub = onSnapshot(doc(db, 'settings', 'global'), (docSnap) => {
      if (docSnap.exists()) {
        const data = docSnap.data();
        if (data.availableHeaders) setAvailableHeaders(data.availableHeaders);
        if (data.currentMapping) setCurrentMapping(data.currentMapping);
        if (data.sourceName) setSourceName(data.sourceName);
      }
    }, (err) => {
      console.warn("Global settings snapshot error", err);
    });
    return () => unsub();
  }, [user, isVisor, isAdmin, isSuperadmin]);

  const handleDataLoadedBySync = async (syncResult: {
    transactions: any[];
    headers: string[];
    mapping: ColumnMapping;
    sourceName: string;
  }) => {
    if (!isAdmin) {
      alert("No tienes permisos para sincronizar hojas de cálculo.");
      return;
    }
    setAvailableHeaders(syncResult.headers);
    setCurrentMapping(syncResult.mapping);
    setSourceName(syncResult.sourceName);

    if (syncResult.transactions.length > 0) {
      // Sync global settings to firestore
      await setDoc(doc(db, 'settings', 'global'), {
        availableHeaders: syncResult.headers,
        currentMapping: syncResult.mapping,
        sourceName: syncResult.sourceName
      }, { merge: true });

      // Sync all fresh items into Firestore
      for (const t of syncResult.transactions) {
        try {
          await setDoc(doc(db, 'transactions', t.id), {
             ...t, updatedByEmail: user?.email, updatedAt: new Date().toISOString()
          });
        } catch (error) {
          console.error("Error syncing tx", error);
        }
      }
      createAuditLog('nueva_cuenta', 'SYNC', `Se sincronizaron ${syncResult.transactions.length} registros desde GSheets.`);
    }
  };

  const handleResetToDemo = async () => {
    if (!isAdmin) return;
    if (window.confirm('¿Seguro de reinstaurar el set de datos inicial?')) {
      for (const t of DEMO_TRANSACTIONS) {
        await setDoc(doc(db, 'transactions', t.id), {
          ...t, updatedByEmail: user?.email, updatedAt: new Date().toISOString()
        });
      }
      await setDoc(doc(db, 'settings', 'global'), {
        availableHeaders: ['Nombre de Cliente', 'Monto Total', 'Estado de Pago', 'Fecha', 'Teléfono', 'Cédula', 'Dirección'],
        currentMapping: {
          clientNameKey: 'Nombre de Cliente', amountKey: 'Monto Total', statusKey: 'Estado de Pago',
          dateKey: 'Fecha', phoneKey: 'Teléfono', cedulaKey: 'Cédula', locationKey: 'Dirección'
        },
        sourceName: 'Set de Demostración'
      }, { merge: true });

      createAuditLog('nueva_cuenta', 'DEMO', `Se restableció el set de demostración inicial.`);
    }
  };

  const handleUpdatePhone = async (id: string, newPhone: string) => {
    if (!isAdmin) return;
    const target = transactions.find(t => t.id === id);
    if (!target) return;
    try {
      await setDoc(doc(db, 'transactions', id), {
        ...target,
        phone: newPhone,
        updatedByEmail: user?.email, updatedAt: new Date().toISOString()
      });
      createAuditLog('cambio_telefono', id, `Teléfono actualizado a: ${newPhone}`);
    } catch(err) {
      alert("Error actualizando teléfono.");
    }
  };

  const handleToggleStatus = async (id: string) => {
    if (!isAdmin) return;
    const t = transactions.find(tx => tx.id === id);
    if (!t) return;
    const nextStatus = t.status === 'Pagado' ? 'Cobrar' : 'Pagado';
    const updatedOriginal = t.originalData ? {
      ...t.originalData, [currentMapping.statusKey]: nextStatus === 'Pagado' ? 'Pagado' : 'Por cobrar'
    } : undefined;
    const finalPaid = nextStatus === 'Pagado' ? t.amount : 0;
    const finalPayments = nextStatus === 'Pagado' 
      ? [{ amount: t.amount, date: new Date().toISOString().substring(0, 10) }] : [];

    const updatedData: any = {
      ...t,
      status: nextStatus,
      paidAmount: finalPaid,
      payments: finalPayments,
      updatedByEmail: user?.email, updatedAt: new Date().toISOString()
    };
    if (updatedOriginal) updatedData.originalData = updatedOriginal;
    else delete updatedData.originalData;

    await setDoc(doc(db, 'transactions', id), updatedData);
    createAuditLog('cambio_estado', id, `Estado cambiado a ${nextStatus}`);
  };

  const handleRegisterPayment = async (id: string, paymentAmount: number, paymentDate: string) => {
    if (!isAdmin) return;
    const t = transactions.find(tx => tx.id === id);
    if (!t) return;
    const currentPaid = t.paidAmount || 0;
    const newPaid = Math.min(t.amount, currentPaid + paymentAmount);
    const newHistory = [...(t.payments || [])];
    newHistory.push({ amount: paymentAmount, date: paymentDate });
    const nextStatus = newPaid >= t.amount ? 'Pagado' : t.status;
    const updatedOriginal = t.originalData ? {
      ...t.originalData, [currentMapping.statusKey]: nextStatus === 'Pagado' ? 'Pagado' : 'Por cobrar'
    } : undefined;

    const updatedData: any = {
      ...t,
      paidAmount: newPaid,
      payments: newHistory,
      status: nextStatus,
      updatedByEmail: user?.email, updatedAt: new Date().toISOString()
    };
    if (updatedOriginal) updatedData.originalData = updatedOriginal;
    else delete updatedData.originalData;

    await setDoc(doc(db, 'transactions', id), updatedData);
    createAuditLog('abono', id, `Abono de ${paymentAmount} registrado. Total pagado es ahora ${newPaid}`);
  };

  const handleDeleteTransaction = async (id: string) => {
    if (!isSuperadmin) {
      alert("Solo el Superadmin puede eliminar registros por completo.");
      return;
    }
    if (window.confirm(`¿Seguro que deseas eliminar la transacción ${id}?`)) {
      await deleteDoc(doc(db, 'transactions', id));
      createAuditLog('eliminar_cuenta', id, `Cuenta eliminada por completo.`);
    }
  };

  const handleAddTransaction = async (newTx: Omit<Transaction, 'id'>) => {
    if (!isAdmin) return;
    const newId = `TX-${Date.now()}`;
    const initialPaid = newTx.status === 'Pagado' ? newTx.amount : (newTx.paidAmount || 0);
    const initialPayments = initialPaid > 0 ? [{ amount: initialPaid, date: newTx.date }] : [];

    await setDoc(doc(db, 'transactions', newId), {
      id: newId,
      ...newTx,
      paidAmount: initialPaid,
      payments: initialPayments,
      originalData: {
        [currentMapping.clientNameKey]: newTx.clientName,
        [currentMapping.amountKey]: String(newTx.amount),
        [currentMapping.statusKey]: newTx.status,
        [currentMapping.dateKey]: newTx.date,
        [currentMapping.phoneKey]: newTx.phone || '',
        [currentMapping.cedulaKey || 'Cédula']: newTx.cedula || '',
        [currentMapping.locationKey || 'Dirección']: newTx.location || ''
      },
      updatedByEmail: user?.email, updatedAt: new Date().toISOString()
    });
    createAuditLog('nueva_cuenta', newId, `Nueva cuenta creada. Total original = ${newTx.amount}`);
  };

  const handleApplyDiscount = async (txIds: string[], percentage: number) => {
    if (!isSuperadmin) return;
    for (const id of txIds) {
      const t = transactions.find(tx => tx.id === id);
      if (!t) continue;
      
      const discountRatio = percentage / 100;
      const amountToDiscount = t.amount * discountRatio;
      const newAmount = Math.max(0, t.amount - amountToDiscount);
      
      const currentPaid = t.paidAmount || 0;
      const nextStatus = currentPaid >= newAmount ? 'Pagado' : t.status;
      const newPaid = Math.min(newAmount, currentPaid);
      
      const updatedOriginal = t.originalData ? {
        ...t.originalData,
        [currentMapping.statusKey]: nextStatus === 'Pagado' ? 'Pagado' : 'Por cobrar',
        [currentMapping.amountKey]: String(newAmount)
      } : undefined;

      const updatedData: any = {
        ...t,
        amount: newAmount,
        paidAmount: newPaid,
        status: nextStatus,
        updatedByEmail: user?.email,
        updatedAt: new Date().toISOString()
      };
      
      if (updatedOriginal) updatedData.originalData = updatedOriginal;
      else delete updatedData.originalData;

      try {
        await setDoc(doc(db, 'transactions', id), updatedData);
        createAuditLog('descuento_accionista', id, `Se aplicó descuento de ${percentage}%. Monto anterior: ${t.amount}, Nuevo monto: ${newAmount}`);
      } catch (e) {
        console.error("Error applying discount to", id, e);
      }
    }
  };

  const filteredTxsForKPIs = useMemo(() => {
    return transactions.filter(t => {
      const search = filters.searchTerm.toLowerCase();
      const matchesSearch = t.clientName?.toLowerCase().includes(search) || t.cedula?.toLowerCase().includes(search);
      const matchesStatus = filters.status === 'todos' || t.status === filters.status;
      let matchesStartDate = true;
      let matchesEndDate = true;
      if (filters.startDate) matchesStartDate = t.date >= filters.startDate;
      if (filters.endDate) matchesEndDate = t.date <= filters.endDate;
      return matchesSearch && matchesStatus && matchesStartDate && matchesEndDate;
    });
  }, [transactions, filters]);

  const stats = useMemo(() => {
    let salesTotal = 0; let paidTotal = 0; let receivableTotal = 0;
    let salesCount = 0; let paidCount = 0; let receivableCount = 0;
    filteredTxsForKPIs.forEach(t => {
      salesTotal += t.amount; salesCount++;
      if (t.status === 'Pagado') {
        paidTotal += t.amount; paidCount++;
      } else {
        const registeredPaid = t.paidAmount || 0;
        paidTotal += registeredPaid;
        receivableTotal += Math.max(0, t.amount - registeredPaid);
        receivableCount++;
      }
    });
    const collectionRate = salesTotal > 0 ? (paidTotal / salesTotal) * 100 : 0;
    return { salesTotal, paidTotal, receivableTotal, salesCount, paidCount, receivableCount, collectionRate };
  }, [filteredTxsForKPIs]);

  return {
    transactions,
    dbLoading,
    availableHeaders,
    currentMapping,
    sourceName,
    filters,
    setFilters,
    filteredTxsForKPIs,
    stats,
    handleDataLoadedBySync,
    handleResetToDemo,
    handleUpdatePhone,
    handleToggleStatus,
    handleRegisterPayment,
    handleDeleteTransaction,
    handleAddTransaction,
    handleApplyDiscount,
  };
}
