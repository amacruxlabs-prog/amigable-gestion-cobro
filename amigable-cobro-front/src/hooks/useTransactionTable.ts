import React, { useState } from 'react';
import { Transaction, FilterState } from '../types';

interface UseTransactionTableProps {
  transactions: Transaction[];
  onAddTransaction: (newTx: Omit<Transaction, 'id'>) => void;
  filter: FilterState;
  onFilterChange: (newFilter: FilterState) => void;
  currentPage?: number;
  totalPages?: number;
  onPageChange?: (page: number) => void;
}

export function useTransactionTable({
  transactions,
  onAddTransaction,
  filter,
  onFilterChange,
  currentPage = 1,
  totalPages = 1,
  onPageChange
}: UseTransactionTableProps) {
  const itemsPerPage = 10;

  // Manual transaction form state
  const [showAddForm, setShowAddForm] = useState(false);
  const [newClient, setNewClient] = useState('');
  const [newCedula, setNewCedula] = useState('');
  const [newAmount, setNewAmount] = useState('');
  const [newPaidAmount, setNewPaidAmount] = useState('');
  const [newStatus, setNewStatus] = useState<'Pagado' | 'Cobrar'>('Cobrar');
  const [newDate, setNewDate] = useState(() => new Date().toISOString().substring(0, 10));
  const [newPhone, setNewPhone] = useState('');
  const [phoneCountryCode, setPhoneCountryCode] = useState('+58');
  const [newLocation, setNewLocation] = useState('');
  const [formError, setFormError] = useState('');

  // Inline Abono workflow state variables
  const [activeAbonoTxId, setActiveAbonoTxId] = useState<string | null>(null);
  const [inlineAbonoVal, setInlineAbonoVal] = useState<string>('');
  const [inlineAbonoErr, setInlineAbonoErr] = useState<string>('');
  const [showHistoryTxId, setShowHistoryTxId] = useState<string | null>(null);

  // Backend already filters and paginates
  const filteredTransactions = transactions;
  const paginatedTransactions = transactions;
  const startIndex = (currentPage - 1) * itemsPerPage;

  const handlePageChange = (newPage: number) => {
    if (onPageChange) {
      onPageChange(newPage);
    }
  };

  const handleFilterUpdate = (updates: Partial<FilterState>) => {
    onFilterChange({
      ...filter,
      ...updates,
    });
    if (onPageChange) onPageChange(1);
  };

  const handleFormSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setFormError('');

    if (!newClient.trim()) {
      setFormError('El nombre del cliente es obligatorio.');
      return;
    }

    const amt = parseFloat(newAmount);
    if (isNaN(amt) || amt <= 0) {
      setFormError('Por favor ingresa un monto mayor a cero.');
      return;
    }

    const initialPaid = parseFloat(newPaidAmount) || 0;
    if (initialPaid < 0) {
      setFormError('El abono inicial no puede ser negativo.');
      return;
    }
    if (initialPaid > amt) {
      setFormError('El abono inicial no puede ser mayor al monto total.');
      return;
    }

    if (!newDate) {
      setFormError('La fecha de transacción es obligatoria.');
      return;
    }

    const trimmedPhone = newPhone.trim();
    let finalPhone: string | undefined = undefined;
    if (trimmedPhone) {
      if (trimmedPhone.startsWith('+')) {
        finalPhone = trimmedPhone;
      } else {
        finalPhone = `${phoneCountryCode}${trimmedPhone}`;
      }
    }

    onAddTransaction({
      clientName: newClient.trim(),
      amount: amt,
      status: newStatus === 'Pagado' ? 'Pagado' : initialPaid === amt ? 'Pagado' : 'Cobrar',
      date: newDate,
      phone: finalPhone,
      cedula: newCedula.trim() || undefined,
      location: newLocation.trim() || undefined,
      paidAmount: initialPaid,
    });

    // Clear form
    setNewClient('');
    setNewCedula('');
    setNewAmount('');
    setNewPaidAmount('');
    setNewPhone('');
    setPhoneCountryCode('+58');
    setNewLocation('');
    setNewStatus('Cobrar');
    setNewDate(new Date().toISOString().substring(0, 10));
    setShowAddForm(false);
  };

  return {
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
  };
}
