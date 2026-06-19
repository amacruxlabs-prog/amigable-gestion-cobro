import { useState, useMemo, useEffect } from 'react';
import { Transaction } from '../types';
import { 
  ChevronLeft, 
  ChevronRight, 
  Calendar as CalendarIcon, 
  CheckCircle2, 
  Clock, 
  Phone, 
  MessageSquare, 
  Handshake, 
  Trash2, 
  Plus, 
  X, 
  AlertCircle, 
  User, 
  DollarSign, 
  Send,
  CalendarDays,
  FileText,
  Search,
  Filter,
  Check,
  TrendingUp,
  Percent,
  PhoneCall,
  ListTodo
} from 'lucide-react';
import { useUI } from '../contexts/UIContext';
import { useAuth } from '../contexts/AuthContext';
import { formatCurrency, getVenezuelaTodayStr } from '../utils/format';

interface PaymentCalendarProps {
  transactions: Transaction[];
  onRegisterPayment?: (id: string, amount: number, date: string) => Promise<void>;
  onToggleStatus?: (id: string) => Promise<void>;
}

export interface CalendarEvent {
  id: string;
  type: 'vencimiento' | 'promesa' | 'llamada' | 'whatsapp';
  date: string; // YYYY-MM-DD
  clientName: string;
  phone?: string;
  transactionId?: string;
  amount?: number;
  status: 'pending' | 'completed' | 'failed'; // 'pending' | 'completed' | 'failed' (broken promise)
  notes?: string;
  time?: string; // e.g., "14:00"
}

type ViewMode = 'mes' | 'semana' | 'agenda';

export function PaymentCalendar({ transactions, onRegisterPayment, onToggleStatus }: PaymentCalendarProps) {
  const { toast, confirm } = useUI();
  const { businessId, isAdmin } = useAuth();

  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedDateStr, setSelectedDateStr] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<ViewMode>('mes');

  // Filter States
  const [searchQuery, setSearchQuery] = useState('');
  const [showVencimientos, setShowVencimientos] = useState(true);
  const [showPromesas, setShowPromesas] = useState(true);
  const [showLlamadas, setShowLlamadas] = useState(true);
  const [showWhatsapps, setShowWhatsapps] = useState(true);
  const [showCompleted, setShowCompleted] = useState(true);

  // Custom events stored in state and localStorage
  const [events, setEvents] = useState<CalendarEvent[]>([]);

  // Modals state
  const [isAddEventOpen, setIsAddEventOpen] = useState(false);
  const [isRescheduleOpen, setIsRescheduleOpen] = useState(false);
  const [isRegisterPaymentOpen, setIsRegisterPaymentOpen] = useState(false);
  const [activeEvent, setActiveEvent] = useState<CalendarEvent | null>(null);

  // Form states
  const [newEvent, setNewEvent] = useState<{
    type: 'promesa' | 'llamada' | 'whatsapp';
    clientName: string;
    date: string;
    time: string;
    amount: string;
    notes: string;
  }>({
    type: 'promesa',
    clientName: '',
    date: '',
    time: '09:00',
    amount: '',
    notes: ''
  });

  const [rescheduleDate, setRescheduleDate] = useState('');
  const [rescheduleNotes, setRescheduleNotes] = useState('');
  const [paymentAmount, setPaymentAmount] = useState('');

  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();

  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const firstDayOfMonth = new Date(year, month, 1).getDay();

  const days = [];
  for (let i = 0; i < firstDayOfMonth; i++) {
    days.push(null);
  }
  for (let i = 1; i <= daysInMonth; i++) {
    days.push(i);
  }

  const formatPrice = (v: number) => formatCurrency(v);

  const prevPeriod = () => {
    if (viewMode === 'mes') {
      setCurrentDate(new Date(year, month - 1, 1));
    } else if (viewMode === 'semana') {
      const d = new Date(currentDate);
      d.setDate(d.getDate() - 7);
      setCurrentDate(d);
    } else {
      setCurrentDate(new Date(year, month - 1, 1));
    }
    setSelectedDateStr(null);
  };
  
  const nextPeriod = () => {
    if (viewMode === 'mes') {
      setCurrentDate(new Date(year, month + 1, 1));
    } else if (viewMode === 'semana') {
      const d = new Date(currentDate);
      d.setDate(d.getDate() + 7);
      setCurrentDate(d);
    } else {
      setCurrentDate(new Date(year, month + 1, 1));
    }
    setSelectedDateStr(null);
  };

  const periodLabel = useMemo(() => {
    if (viewMode === 'mes' || viewMode === 'agenda') {
      return new Date(year, month, 1).toLocaleString('es-ES', { month: 'long', year: 'numeric', timeZone: 'America/Caracas' });
    } else {
      // Find Monday and Sunday of current week
      const day = currentDate.getDay();
      const diff = currentDate.getDate() - day + (day === 0 ? -6 : 1);
      const monday = new Date(currentDate.getFullYear(), currentDate.getMonth(), diff);
      const sunday = new Date(monday);
      sunday.setDate(monday.getDate() + 6);
      
      const monStr = monday.toLocaleDateString('es-ES', { day: 'numeric', month: 'short', timeZone: 'America/Caracas' });
      const sunStr = sunday.toLocaleDateString('es-ES', { day: 'numeric', month: 'short', year: 'numeric', timeZone: 'America/Caracas' });
      return `Semana: ${monStr} - ${sunStr}`;
    }
  }, [currentDate, viewMode, year, month]);

  // List of unique clients from current transactions
  const uniqueClients = useMemo(() => {
    const clientsMap = new Map<string, string>(); // Name -> Phone
    transactions.forEach(t => {
      if (t.clientName) {
        clientsMap.set(t.clientName, t.phone || '');
      }
    });
    return Array.from(clientsMap.entries()).map(([name, phone]) => ({ name, phone }));
  }, [transactions]);

  // Seed generator
  const generateSeedEvents = (txs: Transaction[]): CalendarEvent[] => {
    const seeded: CalendarEvent[] = [];
    txs.forEach(tx => {
      const isTxPaid = tx.status === 'Pagado';
      const outstanding = tx.amount - (Number(tx.paidAmount) || 0);
      
      // 1. Vencimiento Event (Cuotas/Cobros Programados)
      seeded.push({
        id: `venc-${tx.id}`,
        type: 'vencimiento',
        date: tx.date,
        clientName: tx.clientName,
        phone: tx.phone,
        transactionId: tx.id,
        amount: tx.amount,
        status: isTxPaid ? 'completed' : 'pending',
        notes: `Vencimiento de cobro por valor de $${tx.amount.toLocaleString('es-CO')}`,
        time: '08:00'
      });

      if (!isTxPaid) {
        const baseDate = new Date(tx.date + 'T12:00:00Z');
        
        // 2. WhatsApp Event (1 day before due date)
        const waDate = new Date(baseDate);
        waDate.setDate(waDate.getDate() - 1);
        seeded.push({
          id: `wa-${tx.id}`,
          type: 'whatsapp',
          date: waDate.toISOString().substring(0, 10),
          clientName: tx.clientName,
          phone: tx.phone,
          transactionId: tx.id,
          amount: outstanding,
          status: 'pending',
          notes: 'Recordatorio automático de WhatsApp previo al vencimiento',
          time: '09:00'
        });

        // 3. Seguimiento/Llamada Event (2 days before due date)
        const callDate = new Date(baseDate);
        callDate.setDate(callDate.getDate() - 2);
        seeded.push({
          id: `call-${tx.id}`,
          type: 'llamada',
          date: callDate.toISOString().substring(0, 10),
          clientName: tx.clientName,
          phone: tx.phone,
          transactionId: tx.id,
          status: 'pending',
          notes: 'Llamar al cliente para verificar estado de pago e intenciones',
          time: '10:00'
        });

        // 4. Promesa de Pago Event (3 days after due date)
        const promiseDate = new Date(baseDate);
        promiseDate.setDate(promiseDate.getDate() + 3);
        const todayStr = getVenezuelaTodayStr();
        const promiseDateStr = promiseDate.toISOString().substring(0, 10);
        seeded.push({
          id: `promise-${tx.id}`,
          type: 'promesa',
          date: promiseDateStr,
          clientName: tx.clientName,
          phone: tx.phone,
          transactionId: tx.id,
          amount: outstanding,
          status: promiseDateStr < todayStr ? 'failed' : 'pending',
          notes: 'Compromiso de pago acordado con el gestor',
          time: '14:30'
        });
      }
    });
    return seeded;
  };

  // Load and sync events with transactions and localStorage
  useEffect(() => {
    const storageKey = `amigable_cobro_events_${businessId || 'default'}`;
    const stored = localStorage.getItem(storageKey);
    let currentEvents: CalendarEvent[] = [];

    if (stored) {
      try {
        currentEvents = JSON.parse(stored);
      } catch (e) {
        currentEvents = [];
      }
    } else {
      currentEvents = generateSeedEvents(transactions);
      localStorage.setItem(storageKey, JSON.stringify(currentEvents));
    }

    let changed = false;

    // Sync status of vencimiento and promesa events if transaction status has changed in DB
    const syncedEvents = currentEvents.map(evt => {
      if (!evt.transactionId) return evt;
      const tx = transactions.find(t => t.id === evt.transactionId);
      if (!tx) return evt;

      const isTxPaid = tx.status === 'Pagado';
      if (isTxPaid && evt.status !== 'completed' && (evt.type === 'vencimiento' || evt.type === 'promesa')) {
        changed = true;
        return { ...evt, status: 'completed' as const };
      }
      
      const outstanding = tx.amount - (Number(tx.paidAmount) || 0);
      if (!isTxPaid && evt.amount !== undefined && evt.amount !== outstanding) {
        changed = true;
        return { ...evt, amount: outstanding };
      }

      return evt;
    });

    // Seed events for newly added transactions that aren't represented yet
    const existingTxVencIds = new Set(syncedEvents.filter(e => e.type === 'vencimiento').map(e => e.transactionId));
    const newTxs = transactions.filter(t => !existingTxVencIds.has(t.id));
    if (newTxs.length > 0) {
      const newSeeded = generateSeedEvents(newTxs);
      syncedEvents.push(...newSeeded);
      changed = true;
    }

    if (changed || !stored) {
      localStorage.setItem(storageKey, JSON.stringify(syncedEvents));
    }

    setEvents(syncedEvents);
  }, [transactions, businessId]);

  const saveEvents = (updated: CalendarEvent[]) => {
    const storageKey = `amigable_cobro_events_${businessId || 'default'}`;
    localStorage.setItem(storageKey, JSON.stringify(updated));
    setEvents(updated);
  };

  // Advanced Filtered Events
  const filteredEvents = useMemo(() => {
    return events.filter(e => {
      // 1. Text Search Filter
      if (searchQuery && !e.clientName.toLowerCase().includes(searchQuery.toLowerCase())) {
        return false;
      }
      // 2. Event Type Filter
      if (e.type === 'vencimiento' && !showVencimientos) return false;
      if (e.type === 'promesa' && !showPromesas) return false;
      if (e.type === 'llamada' && !showLlamadas) return false;
      if (e.type === 'whatsapp' && !showWhatsapps) return false;
      
      // 3. Completed Status Filter
      if (!showCompleted && e.status === 'completed') return false;

      return true;
    });
  }, [events, searchQuery, showVencimientos, showPromesas, showLlamadas, showWhatsapps, showCompleted]);

  // Compute monthly statistics based on all events in active month
  const monthlyStats = useMemo(() => {
    const monthEvents = events.filter(e => {
      const itemDate = new Date(e.date + 'T12:00:00Z');
      return itemDate.getFullYear() === year && itemDate.getMonth() === month;
    });

    const vencimientos = monthEvents.filter(e => e.type === 'vencimiento');
    const promesas = monthEvents.filter(e => e.type === 'promesa');
    const llamadas = monthEvents.filter(e => e.type === 'llamada');

    const totalVenc = vencimientos.length;
    const paidVenc = vencimientos.filter(e => e.status === 'completed').length;
    const collectionEfficiency = totalVenc > 0 ? Math.round((paidVenc / totalVenc) * 100) : 0;

    const totalPromesas = promesas.length;
    const metPromesas = promesas.filter(e => e.status === 'completed').length;

    const totalLlamadas = llamadas.length;
    const doneLlamadas = llamadas.filter(e => e.status === 'completed').length;

    const totalProjectedAmount = monthEvents
      .filter(e => (e.type === 'vencimiento' || e.type === 'promesa') && e.status !== 'completed')
      .reduce((sum, curr) => sum + (curr.amount || 0), 0);

    return {
      collectionEfficiency,
      promesasMet: metPromesas,
      promesasTotal: totalPromesas,
      llamadasDone: doneLlamadas,
      llamadasTotal: totalLlamadas,
      totalProjectedAmount
    };
  }, [events, year, month]);

  // Memoize filtered events mapped by date YYYY-MM-DD
  const eventsByDate = useMemo(() => {
    const map = new Map<string, CalendarEvent[]>();
    filteredEvents.forEach(evt => {
      const d = evt.date;
      if (!map.has(d)) map.set(d, []);
      map.get(d)!.push(evt);
    });
    return map;
  }, [filteredEvents]);

  // Weekly view dates (Mon - Sun)
  const weekDates = useMemo(() => {
    const dates = [];
    const baseDate = new Date(currentDate);
    const day = baseDate.getDay();
    // Get Monday of current week
    const diff = baseDate.getDate() - day + (day === 0 ? -6 : 1);
    const monday = new Date(baseDate.getFullYear(), baseDate.getMonth(), diff);
    for (let i = 0; i < 7; i++) {
      const d = new Date(monday);
      d.setDate(monday.getDate() + i);
      dates.push(d);
    }
    return dates;
  }, [currentDate]);

  // Agenda list grouped by date (limited to current month)
  const agendaGroups = useMemo(() => {
    const sorted = [...filteredEvents].sort((a, b) => a.date.localeCompare(b.date));
    const groups: { dateStr: string; dateLabel: string; items: CalendarEvent[] }[] = [];
    sorted.forEach(item => {
      const itemDate = new Date(item.date + 'T12:00:00Z');
      if (itemDate.getFullYear() !== year || itemDate.getMonth() !== month) {
        return;
      }
      let existing = groups.find(g => g.dateStr === item.date);
      if (!existing) {
        const dateLabel = new Date(item.date + 'T12:00:00Z').toLocaleDateString('es-ES', { weekday: 'long', day: 'numeric', month: 'long', timeZone: 'America/Caracas' });
        existing = { dateStr: item.date, dateLabel, items: [] };
        groups.push(existing);
      }
      existing.items.push(item);
    });
    return groups;
  }, [filteredEvents, year, month]);

  const selectedDateEvents = selectedDateStr ? (eventsByDate.get(selectedDateStr) || []) : [];

  // Group events for drawer
  const groupedEvents = useMemo(() => {
    return {
      vencimientos: selectedDateEvents.filter(e => e.type === 'vencimiento'),
      promesas: selectedDateEvents.filter(e => e.type === 'promesa'),
      llamadas: selectedDateEvents.filter(e => e.type === 'llamada'),
      whatsapps: selectedDateEvents.filter(e => e.type === 'whatsapp'),
    };
  }, [selectedDateEvents]);

  // Styling maps for event types (bars)
  const getEventBadgeStyles = (evt: CalendarEvent) => {
    const base = "text-[9px] md:text-[10px] leading-tight px-2 py-1 rounded-lg font-semibold truncate border flex items-center gap-1.5 transition-all select-none ";
    
    if (evt.type === 'vencimiento') {
      return base + (evt.status === 'completed'
        ? "bg-emerald-50 text-emerald-700 border-emerald-100 dark:bg-emerald-950/20 dark:text-emerald-400 dark:border-emerald-900/40"
        : "bg-amber-50 text-amber-700 border-amber-100 dark:bg-amber-950/20 dark:text-amber-400 dark:border-amber-900/40");
    }
    if (evt.type === 'promesa') {
      if (evt.status === 'completed') {
        return base + "bg-emerald-50 text-emerald-700 border-emerald-100 dark:bg-emerald-950/20 dark:text-emerald-400 dark:border-emerald-900/40";
      }
      if (evt.status === 'failed') {
        return base + "bg-rose-50 text-rose-700 border-rose-100 dark:bg-rose-950/20 dark:text-rose-400 dark:border-rose-900/40 animate-pulse";
      }
      return base + "bg-purple-50 text-purple-700 border-purple-100 dark:bg-purple-950/20 dark:text-purple-400 dark:border-purple-900/40";
    }
    if (evt.type === 'llamada') {
      return base + (evt.status === 'completed'
        ? "bg-slate-50 text-slate-500 border-slate-100 dark:bg-slate-800 dark:text-slate-400 dark:border-slate-700/40 line-through"
        : "bg-blue-50 text-blue-700 border-blue-100 dark:bg-blue-950/20 dark:text-blue-400 dark:border-blue-900/40");
    }
    // whatsapp
    return base + (evt.status === 'completed'
      ? "bg-slate-50 text-slate-500 border-slate-100 dark:bg-slate-800 dark:text-slate-400 dark:border-slate-700/40"
      : "bg-teal-50 text-teal-700 border-teal-100 dark:bg-teal-950/20 dark:text-teal-400 dark:border-teal-900/40");
  };

  const getEventIcon = (type: string) => {
    switch (type) {
      case 'vencimiento': return <DollarSign className="w-3 h-3 shrink-0" />;
      case 'promesa': return <Handshake className="w-3 h-3 shrink-0" />;
      case 'llamada': return <Phone className="w-3 h-3 shrink-0" />;
      case 'whatsapp': return <MessageSquare className="w-3 h-3 shrink-0" />;
      default: return <Clock className="w-3 h-3 shrink-0" />;
    }
  };

  // WhatsApp manual sender helper
  const triggerWhatsAppSend = (evt: CalendarEvent) => {
    if (!evt.phone) {
      toast('Este cliente no tiene teléfono registrado', 'error');
      return;
    }
    const cleanPhone = evt.phone.replace(/\D/g, '');
    let msg = '';
    
    if (evt.type === 'promesa') {
      msg = `Hola ${evt.clientName}, te escribimos de la administración. Confirmamos que tenemos programada una promesa de pago para el día de hoy por un valor de ${formatPrice(evt.amount || 0)}. Agradecemos tu valioso compromiso.`;
    } else if (evt.type === 'whatsapp') {
      msg = `Hola ${evt.clientName}, te recordamos amigablemente que tu cuota de cobro está próxima a vencer. El saldo pendiente es de ${formatPrice(evt.amount || 0)}. Puedes realizar transferencias o reportar tus comprobantes aquí.`;
    } else {
      msg = `Hola ${evt.clientName}, nos gustaría comunicarnos contigo para dar seguimiento a tus saldos pendientes. Quedamos atentos.`;
    }

    window.open(`https://wa.me/${cleanPhone}?text=${encodeURIComponent(msg)}`, '_blank');
    
    if (evt.type === 'whatsapp') {
      const updated = events.map(e => e.id === evt.id ? { ...e, status: 'completed' as const } : e);
      saveEvents(updated);
      toast('WhatsApp enviado / abierto exitosamente', 'success');
    }
  };

  // Handle Event Actions
  const handleToggleEventStatus = (eventId: string, newStatus: 'pending' | 'completed' | 'failed') => {
    const updated = events.map(e => e.id === eventId ? { ...e, status: newStatus } : e);
    saveEvents(updated);
    toast('Estado de evento actualizado', 'success');
  };

  const handleOpenRegisterPayment = (evt: CalendarEvent) => {
    if (!onRegisterPayment) {
      toast('No se puede registrar pagos en este rol', 'error');
      return;
    }
    setActiveEvent(evt);
    setPaymentAmount(evt.amount ? String(evt.amount) : '');
    setIsRegisterPaymentOpen(true);
  };

  const submitRegisterPayment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeEvent || !onRegisterPayment) return;
    
    const amountNum = parseFloat(paymentAmount);
    if (isNaN(amountNum) || amountNum <= 0) {
      toast('Monto inválido', 'error');
      return;
    }

    try {
      const txId = activeEvent.transactionId;
      if (!txId) {
        toast('El evento no está vinculado a una transacción activa', 'error');
        return;
      }
      
      await onRegisterPayment(txId, amountNum, activeEvent.date);
      
      const updated = events.map(evt => {
        if (evt.id === activeEvent.id || (evt.transactionId === txId && (evt.type === 'vencimiento' || evt.type === 'promesa'))) {
          return { ...evt, status: 'completed' as const };
        }
        return evt;
      });
      saveEvents(updated);
      
      setIsRegisterPaymentOpen(false);
      setActiveEvent(null);
    } catch (err) {
      toast('Error al registrar abono', 'error');
    }
  };

  const handleOpenReschedule = (evt: CalendarEvent) => {
    setActiveEvent(evt);
    setRescheduleDate(evt.date);
    setRescheduleNotes(evt.notes || '');
    setIsRescheduleOpen(true);
  };

  const submitReschedule = (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeEvent) return;

    if (!rescheduleDate) {
      toast('Por favor selecciona una fecha', 'error');
      return;
    }

    const todayStr = getVenezuelaTodayStr();
    if (rescheduleDate < todayStr) {
      toast('No puedes reprogramar actividades a fechas pasadas.', 'error');
      return;
    }

    const updated = events.map(evt => {
      if (evt.id === activeEvent.id) {
        return { 
          ...evt, 
          date: rescheduleDate, 
          notes: rescheduleNotes,
          status: evt.status === 'failed' ? 'pending' as const : evt.status
        };
      }
      return evt;
    });

    saveEvents(updated);
    setIsRescheduleOpen(false);
    setActiveEvent(null);
    toast('Evento reprogramado exitosamente', 'success');
  };

  const handleDeleteEvent = (eventId: string) => {
    confirm({
      title: 'Eliminar Evento',
      message: '¿Estás seguro de que deseas eliminar este evento del calendario?',
      type: 'danger',
      onConfirm: () => {
        const filtered = events.filter(e => e.id !== eventId);
        saveEvents(filtered);
        toast('Evento eliminado', 'success');
      }
    });
  };

  const handleAddEvent = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newEvent.clientName) {
      toast('Debes seleccionar un cliente', 'error');
      return;
    }
    if (!newEvent.date) {
      toast('Debes ingresar una fecha', 'error');
      return;
    }

    const todayStr = getVenezuelaTodayStr();
    if (newEvent.date < todayStr) {
      toast('No puedes programar actividades en fechas pasadas.', 'error');
      return;
    }

    const selectedClientObj = uniqueClients.find(c => c.name === newEvent.clientName);
    const clientTx = transactions.find(t => t.clientName === newEvent.clientName && t.status !== 'Pagado');

    const created: CalendarEvent = {
      id: `custom-${Date.now()}`,
      type: newEvent.type,
      date: newEvent.date,
      clientName: newEvent.clientName,
      phone: selectedClientObj?.phone || clientTx?.phone,
      transactionId: clientTx?.id,
      amount: newEvent.amount ? parseFloat(newEvent.amount) : (clientTx ? (clientTx.amount - (Number(clientTx.paidAmount) || 0)) : undefined),
      status: 'pending',
      notes: newEvent.notes,
      time: newEvent.time || '09:00'
    };

    saveEvents([...events, created]);
    setIsAddEventOpen(false);
    setNewEvent({
      type: 'promesa',
      clientName: '',
      date: selectedDateStr || '',
      time: '09:00',
      amount: '',
      notes: ''
    });
    toast('Evento programado exitosamente', 'success');
  };

  return (
    <div className="space-y-6">
      
      {/* KPI METRICS BANNER (Advanced Control Center Feature) */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm flex items-center gap-3">
          <div className="p-3 bg-indigo-50 dark:bg-indigo-950/40 text-indigo-650 dark:text-indigo-400 rounded-xl">
            <Percent className="w-5 h-5" />
          </div>
          <div>
            <span className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase block">Eficiencia de Cobro</span>
            <span className="text-lg font-bold text-slate-850 dark:text-slate-200">{monthlyStats.collectionEfficiency}%</span>
            <span className="text-[9px] text-slate-400 block mt-0.5 font-medium">Vencimientos cobrados</span>
          </div>
        </div>

        <div className="bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm flex items-center gap-3">
          <div className="p-3 bg-purple-50 dark:bg-purple-950/40 text-purple-650 dark:text-purple-400 rounded-xl">
            <Handshake className="w-5 h-5" />
          </div>
          <div>
            <span className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase block">Promesas de Pago</span>
            <span className="text-lg font-bold text-slate-850 dark:text-slate-200">{monthlyStats.promesasMet} / {monthlyStats.promesasTotal}</span>
            <span className="text-[9px] text-slate-400 block mt-0.5 font-medium">Compromisos cumplidos</span>
          </div>
        </div>

        <div className="bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm flex items-center gap-3">
          <div className="p-3 bg-blue-50 dark:bg-blue-950/40 text-blue-655 dark:text-blue-400 rounded-xl">
            <PhoneCall className="w-5 h-5" />
          </div>
          <div>
            <span className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase block">Llamadas Realizadas</span>
            <span className="text-lg font-bold text-slate-850 dark:text-slate-200">{monthlyStats.llamadasDone} / {monthlyStats.llamadasTotal}</span>
            <span className="text-[9px] text-slate-400 block mt-0.5 font-medium">Seguimientos completados</span>
          </div>
        </div>

        <div className="bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm flex items-center gap-3">
          <div className="p-3 bg-emerald-50 dark:bg-emerald-950/40 text-emerald-650 dark:text-emerald-400 rounded-xl">
            <TrendingUp className="w-5 h-5" />
          </div>
          <div>
            <span className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase block">Monto Proyectado</span>
            <span className="text-base font-bold text-slate-850 dark:text-slate-200 font-mono">{formatPrice(monthlyStats.totalProjectedAmount)}</span>
            <span className="text-[9px] text-slate-400 block mt-0.5 font-medium">Pendiente por cobrar mes</span>
          </div>
        </div>
      </div>

      {/* ADVANCED CONTROL CONTROLS & FILTERS HEADER */}
      <div className="bg-slate-50 dark:bg-slate-900/50 border border-slate-200 dark:border-slate-800 rounded-2xl p-4 flex flex-col md:flex-row gap-4 justify-between items-center shadow-xs">
        
        {/* Search & Event toggles */}
        <div className="flex flex-wrap items-center gap-3 w-full md:w-auto">
          {/* Input text search */}
          <div className="relative w-full sm:w-60">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
            <input
              type="text"
              placeholder="Buscar por cliente..."
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              className="pl-9 pr-3 py-2 w-full bg-white dark:bg-slate-850 border border-slate-200 dark:border-slate-750 rounded-xl text-xs outline-none focus:ring-2 focus:ring-indigo-500 dark:text-slate-200 transition-all shadow-2xs"
            />
            {searchQuery && (
              <button onClick={() => setSearchQuery('')} className="absolute right-3 top-2.5 text-slate-400 hover:text-slate-600 text-xs font-bold cursor-pointer">✕</button>
            )}
          </div>

          {/* Toggle pill buttons for Event types */}
          <div className="flex flex-wrap gap-1.5 text-[10px]">
            <button
              onClick={() => setShowVencimientos(!showVencimientos)}
              className={`px-3 py-1.5 rounded-lg border font-bold flex items-center gap-1 cursor-pointer transition-colors ${
                showVencimientos
                  ? 'bg-amber-100 text-amber-800 border-amber-250 dark:bg-amber-950/30 dark:text-amber-400 dark:border-amber-900/60'
                  : 'bg-white dark:bg-slate-850 text-slate-400 border-slate-200 dark:border-slate-800'
              }`}
            >
              💰 Cobros
            </button>
            <button
              onClick={() => setShowPromesas(!showPromesas)}
              className={`px-3 py-1.5 rounded-lg border font-bold flex items-center gap-1 cursor-pointer transition-colors ${
                showPromesas
                  ? 'bg-purple-100 text-purple-800 border-purple-250 dark:bg-purple-950/30 dark:text-purple-400 dark:border-purple-900/60'
                  : 'bg-white dark:bg-slate-850 text-slate-400 border-slate-200 dark:border-slate-800'
              }`}
            >
              🤝 Promesas
            </button>
            <button
              onClick={() => setShowLlamadas(!showLlamadas)}
              className={`px-3 py-1.5 rounded-lg border font-bold flex items-center gap-1 cursor-pointer transition-colors ${
                showLlamadas
                  ? 'bg-blue-100 text-blue-800 border-blue-250 dark:bg-blue-950/30 dark:text-blue-400 dark:border-blue-900/60'
                  : 'bg-white dark:bg-slate-850 text-slate-400 border-slate-200 dark:border-slate-800'
              }`}
            >
              📞 Llamadas
            </button>
            <button
              onClick={() => setShowWhatsapps(!showWhatsapps)}
              className={`px-3 py-1.5 rounded-lg border font-bold flex items-center gap-1 cursor-pointer transition-colors ${
                showWhatsapps
                  ? 'bg-teal-100 text-teal-800 border-teal-250 dark:bg-teal-950/30 dark:text-teal-400 dark:border-teal-900/60'
                  : 'bg-white dark:bg-slate-850 text-slate-400 border-slate-200 dark:border-slate-800'
              }`}
            >
              💬 WhatsApp
            </button>
          </div>

          {/* Show completed checkbox */}
          <label className="flex items-center gap-1.5 ml-2 text-xs font-bold text-slate-500 dark:text-slate-400 cursor-pointer select-none">
            <input
              type="checkbox"
              checked={showCompleted}
              onChange={() => setShowCompleted(!showCompleted)}
              className="w-3.5 h-3.5 rounded border-slate-300 text-indigo-650 focus:ring-indigo-500 accent-indigo-600"
            />
            Mostrar Completados
          </label>
        </div>

        {/* View selector: Month, Week, List/Agenda */}
        <div className="bg-slate-200/60 dark:bg-slate-800 p-1 rounded-xl flex gap-1 self-stretch md:self-auto text-xs font-bold">
          <button
            onClick={() => setViewMode('mes')}
            className={`px-3.5 py-1.5 rounded-lg transition-all cursor-pointer ${
              viewMode === 'mes'
                ? 'bg-white dark:bg-slate-700 text-indigo-650 dark:text-indigo-400 shadow-xs'
                : 'text-slate-500 dark:text-slate-400 hover:text-slate-700'
            }`}
          >
            Mes
          </button>
          <button
            onClick={() => setViewMode('semana')}
            className={`px-3.5 py-1.5 rounded-lg transition-all cursor-pointer ${
              viewMode === 'semana'
                ? 'bg-white dark:bg-slate-700 text-indigo-650 dark:text-indigo-400 shadow-xs'
                : 'text-slate-500 dark:text-slate-400 hover:text-slate-700'
            }`}
          >
            Semana
          </button>
          <button
            onClick={() => setViewMode('agenda')}
            className={`px-3.5 py-1.5 rounded-lg transition-all cursor-pointer ${
              viewMode === 'agenda'
                ? 'bg-white dark:bg-slate-700 text-indigo-650 dark:text-indigo-400 shadow-xs'
                : 'text-slate-500 dark:text-slate-400 hover:text-slate-700'
            }`}
          >
            Agenda
          </button>
        </div>

      </div>

      {/* MAIN LAYOUT WRAPPER */}
      <div className="bg-white border border-slate-200 rounded-2xl shadow-sm dark:bg-slate-900 dark:border-slate-800 overflow-hidden flex flex-col xl:flex-row">
        
        {/* VIEW CONTAINER (MES, SEMANA, AGENDA) */}
        <div className="flex-1 p-4 md:p-6 border-b xl:border-b-0 xl:border-r border-slate-200 dark:border-slate-800">
          
          {/* Header Switcher */}
          <div className="flex items-center justify-between mb-6">
            <h3 className="font-bold text-base md:text-lg text-slate-800 dark:text-slate-100 capitalize flex items-center gap-2">
              <CalendarIcon className="w-5 h-5 text-slate-400" />
              {periodLabel}
            </h3>
            <div className="flex items-center gap-2">
              <button onClick={prevPeriod} className="p-1.5 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg text-slate-500 transition-colors cursor-pointer">
                <ChevronLeft className="w-5 h-5" />
              </button>
              <button onClick={nextPeriod} className="p-1.5 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg text-slate-500 transition-colors cursor-pointer">
                <ChevronRight className="w-5 h-5" />
              </button>
            </div>
          </div>

          {/* RENDERING VIEW: MONTHLY GRID */}
          {viewMode === 'mes' && (
            <>
              <div className="grid grid-cols-7 gap-1 mb-2">
                {['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'].map(day => (
                  <div key={day} className="text-center text-xs font-bold text-slate-450 dark:text-slate-500 py-2">
                    {day}
                  </div>
                ))}
              </div>

              <div className="grid grid-cols-7 gap-2">
                {days.map((dayNum, i) => {
                  if (dayNum === null) {
                    return <div key={`empty-${i}`} className="min-h-[110px] md:min-h-[130px] border border-transparent" />;
                  }
                  
                  const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(dayNum).padStart(2, '0')}`;
                  const dayEvents = eventsByDate.get(dateStr) || [];
                  
                  const isSelected = selectedDateStr === dateStr;
                  const todayStr = getVenezuelaTodayStr();
                  const isToday = dateStr === todayStr;

                  return (
                    <div
                      key={`day-${dayNum}`}
                      onClick={() => setSelectedDateStr(dateStr)}
                      className={`min-h-[110px] md:min-h-[135px] flex flex-col items-stretch justify-start p-1 border rounded-xl relative transition-all overflow-hidden cursor-pointer ${
                        isSelected 
                          ? 'border-indigo-650 bg-indigo-50/20 ring-1 ring-indigo-600 dark:bg-indigo-950/10' 
                          : isToday 
                          ? 'border-indigo-200 bg-slate-50/20 hover:border-indigo-300 dark:border-indigo-850 dark:bg-slate-800/20'
                          : 'border-slate-100 dark:border-slate-800/60 hover:border-slate-300 bg-white hover:bg-slate-50 dark:bg-slate-900 dark:hover:bg-slate-800/40'
                      }`}
                    >
                      {/* Day Number Header */}
                      <div className="flex justify-between items-center mb-1">
                        <span className={`text-[10px] md:text-xs font-bold ${
                          isToday 
                            ? 'bg-indigo-600 text-white w-5 h-5 rounded-full flex items-center justify-center font-bold' 
                            : 'text-slate-600 dark:text-slate-400 px-1'
                        }`}>
                          {dayNum}
                        </span>
                        {dayEvents.length > 0 && (
                          <span className="text-[8px] font-bold text-slate-400 bg-slate-100 dark:bg-slate-800 dark:text-slate-500 px-1 py-0.2 rounded">
                            {dayEvents.length}
                          </span>
                        )}
                      </div>

                      {/* Stack of Event Bars (Visible on Desktop) */}
                      <div className="hidden md:flex flex-col gap-1 overflow-y-auto max-h-[85px] no-scrollbar">
                        {dayEvents.slice(0, 3).map(evt => (
                          <div 
                            key={evt.id} 
                            className={getEventBadgeStyles(evt)}
                            title={`${evt.time} - ${evt.clientName} (${evt.notes})`}
                          >
                            {getEventIcon(evt.type)}
                            <span className="truncate">{evt.time} {evt.clientName}</span>
                          </div>
                        ))}
                        {dayEvents.length > 3 && (
                          <div className="text-[9px] font-bold text-slate-400 text-center mt-0.5 font-mono">
                            + {dayEvents.length - 3} más
                          </div>
                        )}
                      </div>

                      {/* Thin responsive bars on Mobile */}
                      <div className="flex md:hidden flex-wrap gap-0.5 justify-center mt-auto pb-1">
                        {dayEvents.map(evt => {
                          let color = "bg-slate-400";
                          if (evt.type === 'vencimiento') color = evt.status === 'completed' ? "bg-emerald-500" : "bg-amber-500";
                          else if (evt.type === 'promesa') color = evt.status === 'completed' ? "bg-emerald-500" : evt.status === 'failed' ? "bg-rose-500" : "bg-purple-500";
                          else if (evt.type === 'llamada') color = evt.status === 'completed' ? "bg-slate-450" : "bg-blue-500";
                          else if (evt.type === 'whatsapp') color = evt.status === 'completed' ? "bg-slate-450" : "bg-teal-500";

                          return <div key={evt.id} className={`h-1 w-2.5 rounded-full ${color}`} />;
                        })}
                      </div>
                    </div>
                  );
                })}
              </div>
            </>
          )}

          {/* RENDERING VIEW: WEEKLY GRID */}
          {viewMode === 'semana' && (
            <div className="grid grid-cols-1 md:grid-cols-7 gap-3">
              {weekDates.map(date => {
                const dateStr = date.toISOString().substring(0, 10);
                const dayEvents = eventsByDate.get(dateStr) || [];
                const isToday = dateStr === getVenezuelaTodayStr();
                const isSelected = selectedDateStr === dateStr;

                return (
                  <div
                    key={dateStr}
                    onClick={() => setSelectedDateStr(dateStr)}
                    className={`border p-3 rounded-2xl flex flex-col min-h-[300px] cursor-pointer transition-all ${
                      isSelected 
                        ? 'border-indigo-650 bg-indigo-50/10 dark:bg-indigo-950/10'
                        : isToday 
                        ? 'border-indigo-200 bg-slate-50/20 dark:border-indigo-850 dark:bg-slate-800/20'
                        : 'border-slate-100 dark:border-slate-800 bg-white hover:bg-slate-50 dark:bg-slate-900 dark:hover:bg-slate-800/30'
                    }`}
                  >
                    {/* Day Column Header */}
                    <div className="border-b pb-2 mb-3 dark:border-slate-800">
                      <div className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase">
                        {date.toLocaleDateString('es-ES', { weekday: 'short', timeZone: 'America/Caracas' })}
                      </div>
                      <div className={`text-base font-extrabold mt-0.5 ${isToday ? 'text-indigo-600 dark:text-indigo-400' : 'text-slate-700 dark:text-slate-350'}`}>
                        {date.getDate()}
                      </div>
                    </div>

                    {/* Column Items */}
                    <div className="space-y-2 flex-1 overflow-y-auto no-scrollbar">
                      {dayEvents.length === 0 ? (
                        <span className="text-[10px] text-slate-350 dark:text-slate-650 italic block text-center py-6">Sin compromisos</span>
                      ) : (
                        dayEvents.map(evt => (
                          <div 
                            key={evt.id} 
                            className={getEventBadgeStyles(evt) + " flex-col items-start px-2.5 py-2 whitespace-normal"}
                          >
                            <div className="flex items-center gap-1.5 w-full">
                              {getEventIcon(evt.type)}
                              <span className="font-mono text-[9px]">{evt.time}</span>
                            </div>
                            <div className="font-bold text-[10px] mt-1 break-words leading-tight">{evt.clientName}</div>
                            {evt.amount !== undefined && (
                              <div className="text-[9px] font-bold font-mono mt-0.5 opacity-80">{formatCurrency(evt.amount)}</div>
                            )}
                          </div>
                        ))
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {/* RENDERING VIEW: TIMELINE/AGENDA LIST */}
          {viewMode === 'agenda' && (
            <div className="space-y-6 max-h-[550px] overflow-y-auto pr-2">
              {agendaGroups.length === 0 ? (
                <div className="text-center py-16 text-slate-400 dark:text-slate-650 flex flex-col items-center justify-center">
                  <ListTodo className="w-12 h-12 mb-3 text-slate-200 dark:text-slate-850" />
                  <p className="text-sm font-bold">No hay eventos filtrados registrados para el mes seleccionado.</p>
                </div>
              ) : (
                agendaGroups.map(group => (
                  <div key={group.dateStr} className="relative pl-6 border-l-2 border-indigo-100 dark:border-slate-800">
                    {/* Timeline dot */}
                    <div className={`w-3.5 h-3.5 rounded-full absolute -left-[7px] top-1.5 border-2 border-white dark:border-slate-900 ${
                      group.dateStr === getVenezuelaTodayStr() ? 'bg-indigo-650 ring-2 ring-indigo-150' : 'bg-slate-300 dark:bg-slate-700'
                    }`} />
                    
                    <h4 className="text-xs font-bold text-slate-800 dark:text-slate-200 capitalize mb-3">
                      {group.dateLabel}
                    </h4>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                      {group.items.map(evt => (
                        <div 
                          key={evt.id} 
                          onClick={() => setSelectedDateStr(evt.date)}
                          className="bg-slate-50 hover:bg-slate-100/70 dark:bg-slate-850/50 dark:hover:bg-slate-800 border border-slate-150 dark:border-slate-800 p-3.5 rounded-2xl flex flex-col justify-between shadow-3xs hover:shadow-xs transition-all cursor-pointer"
                        >
                          <div className="flex justify-between items-start gap-2">
                            <div>
                              <div className="flex items-center gap-1.5">
                                <span className={`w-2 h-2 rounded-full ${
                                  evt.type === 'vencimiento' ? 'bg-amber-500' :
                                  evt.type === 'promesa' ? 'bg-purple-500' :
                                  evt.type === 'llamada' ? 'bg-blue-500' : 'bg-teal-500'
                                }`} />
                                <span className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wide">
                                  {evt.type === 'vencimiento' ? 'Cobro' :
                                   evt.type === 'promesa' ? 'Promesa' :
                                   evt.type === 'llamada' ? 'Llamada' : 'WhatsApp'}
                                </span>
                                <span className="font-mono text-[9px] text-slate-400">· {evt.time}</span>
                              </div>
                              <h5 className="text-xs font-extrabold text-slate-800 dark:text-slate-200 mt-1">{evt.clientName}</h5>
                            </div>

                            <span className={`text-[9px] px-1.5 py-0.5 rounded font-bold uppercase ${
                              evt.status === 'completed'
                                ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/20 dark:text-emerald-400'
                                : evt.status === 'failed'
                                ? 'bg-rose-100 text-rose-800 dark:bg-rose-950/20 dark:text-rose-400'
                                : 'bg-amber-100 text-amber-800 dark:bg-amber-950/20 dark:text-amber-450'
                            }`}>
                              {evt.status === 'completed' ? 'Realizado' : evt.status === 'failed' ? 'Incumplido' : 'Pendiente'}
                            </span>
                          </div>

                          {evt.notes && (
                            <p className="text-[10px] text-slate-550 dark:text-slate-400 mt-2 bg-white dark:bg-slate-900 p-2 rounded-lg border border-slate-100 dark:border-slate-800/80 leading-normal italic">
                              "{evt.notes}"
                            </p>
                          )}

                          <div className="flex justify-between items-center mt-3 pt-2.5 border-t border-slate-200/50 dark:border-slate-850">
                            <span className="text-xs font-mono font-bold text-slate-700 dark:text-slate-350">
                              {evt.amount !== undefined ? formatPrice(evt.amount) : 'Sin monto'}
                            </span>

                            <div className="flex items-center gap-2">
                              {evt.status === 'pending' && isAdmin && (
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handleOpenRegisterPayment(evt);
                                  }}
                                  className="text-[10px] font-bold text-indigo-650 hover:underline cursor-pointer"
                                >
                                  Resolver
                                </button>
                              )}
                              {evt.phone && (
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    triggerWhatsAppSend(evt);
                                  }}
                                  className="p-1 text-slate-400 hover:text-teal-600 transition-colors cursor-pointer"
                                  title="WhatsApp Link"
                                >
                                  <MessageSquare className="w-3.5 h-3.5" />
                                </button>
                              )}
                              {isAdmin && (
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handleDeleteEvent(evt.id);
                                  }}
                                  className="p-1 text-slate-400 hover:text-rose-600 transition-colors cursor-pointer"
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                </button>
                              )}
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                ))
              )}
            </div>
          )}

        </div>

        {/* DETAILS SIDEBAR DRAWER PANEL (Right Side) */}
        <div className="w-full xl:w-96 bg-slate-50 dark:bg-slate-900/60 p-5 flex flex-col shrink-0 text-left border-t xl:border-t-0 border-slate-200 dark:border-slate-800">
          {selectedDateStr ? (
            <div className="flex flex-col h-full flex-1">
              <div className="flex justify-between items-start mb-4">
                <div>
                  <h4 className="text-xs uppercase font-bold text-slate-400 dark:text-slate-500">Gestión del Día</h4>
                  <h3 className="text-sm font-bold text-slate-800 dark:text-slate-200 mt-0.5">
                    {new Date(selectedDateStr + 'T12:00:00Z').toLocaleDateString('es-ES', { weekday: 'long', day: 'numeric', month: 'long', timeZone: 'America/Caracas' })}
                  </h3>
                </div>
                <button 
                  onClick={() => setSelectedDateStr(null)}
                  className="p-1 hover:bg-slate-250 dark:hover:bg-slate-800 rounded text-slate-450 hover:text-slate-650 transition-colors cursor-pointer"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              {/* Event Summary Cards inside drawer */}
              {selectedDateEvents.length > 0 && (
                <div className="grid grid-cols-2 gap-2 mb-4 text-[10px]">
                  <div className="bg-white dark:bg-slate-800 p-2.5 rounded-xl border border-slate-150 dark:border-slate-800/80 shadow-xs">
                    <span className="text-slate-450 uppercase font-bold block">Cobro Pendiente</span>
                    <span className="text-xs font-mono font-bold text-slate-800 dark:text-slate-200 block mt-0.5">
                      {formatPrice(
                        selectedDateEvents
                          .filter(e => (e.type === 'vencimiento' || e.type === 'promesa') && e.status !== 'completed')
                          .reduce((acc, curr) => acc + (curr.amount || 0), 0)
                      )}
                    </span>
                  </div>
                  <div className="bg-white dark:bg-slate-800 p-2.5 rounded-xl border border-slate-150 dark:border-slate-800/80 shadow-xs">
                    <span className="text-slate-450 uppercase font-bold block">Cobro Efectivo</span>
                    <span className="text-xs font-mono font-bold text-emerald-600 dark:text-emerald-500 block mt-0.5">
                      {formatPrice(
                        selectedDateEvents
                          .filter(e => (e.type === 'vencimiento' || e.type === 'promesa') && e.status === 'completed')
                          .reduce((acc, curr) => acc + (curr.amount || 0), 0)
                      )}
                    </span>
                  </div>
                </div>
              )}

              {/* Day Scroll list */}
              <div className="flex-1 overflow-y-auto space-y-4 pr-1 max-h-[350px] xl:max-h-none xl:h-0 flex-grow scrollbar-thin">
                {selectedDateEvents.length === 0 ? (
                  <div className="text-center p-8 text-slate-400 dark:text-slate-650 text-xs flex flex-col items-center justify-center h-full">
                    <CalendarDays className="w-8 h-8 mb-2 opacity-40 text-slate-400 animate-bounce" />
                    No hay eventos programados en esta fecha que coincidan con los filtros activos.
                  </div>
                ) : (
                  <>
                    {/* VENCIMIENTOS SECTION */}
                    {groupedEvents.vencimientos.length > 0 && (
                      <div className="space-y-2">
                        <span className="text-[10px] font-extrabold text-slate-400 dark:text-slate-500 uppercase tracking-wider block">
                          💰 Cuotas y Cobros ({groupedEvents.vencimientos.length})
                        </span>
                        {groupedEvents.vencimientos.map(evt => (
                          <div key={evt.id} className="bg-white dark:bg-slate-800 p-3.5 rounded-xl border border-slate-150 dark:border-slate-800 shadow-3xs">
                            <div className="flex items-start justify-between">
                              <div>
                                <div className="text-xs font-bold text-slate-800 dark:text-slate-200">{evt.clientName}</div>
                                <div className="text-[10px] text-slate-400 mt-0.5">Vencimiento · {evt.time}</div>
                              </div>
                              <span className={`text-[9px] px-1.5 py-0.5 rounded font-bold uppercase ${
                                evt.status === 'completed' 
                                  ? 'bg-emerald-100 text-emerald-850 dark:bg-emerald-950/20 dark:text-emerald-400' 
                                  : 'bg-amber-100 text-amber-850 dark:bg-amber-950/20 dark:text-amber-400'
                              }`}>
                                {evt.status === 'completed' ? 'Cobrado' : 'Pendiente'}
                              </span>
                            </div>
                            
                            <div className="flex justify-between items-center mt-3 pt-2.5 border-t border-slate-100 dark:border-slate-700/50">
                              <span className="text-xs font-mono font-bold text-slate-700 dark:text-slate-350">
                                {formatPrice(evt.amount || 0)}
                              </span>
                              {evt.status === 'pending' && isAdmin && (
                                <button
                                  onClick={() => handleOpenRegisterPayment(evt)}
                                  className="text-[10px] font-bold text-indigo-650 dark:text-indigo-400 hover:underline cursor-pointer"
                                >
                                  Registrar Abono
                                </button>
                              )}
                            </div>
                          </div>
                        ))}
                      </div>
                    )}

                    {/* PROMESAS SECTION */}
                    {groupedEvents.promesas.length > 0 && (
                      <div className="space-y-2">
                        <span className="text-[10px] font-extrabold text-slate-400 dark:text-slate-500 uppercase tracking-wider block">
                          🤝 Compromisos de Pago ({groupedEvents.promesas.length})
                        </span>
                        {groupedEvents.promesas.map(evt => (
                          <div key={evt.id} className="bg-white dark:bg-slate-800 p-3.5 rounded-xl border border-slate-150 dark:border-slate-800 shadow-3xs space-y-2">
                            <div className="flex items-start justify-between">
                              <div>
                                <div className="text-xs font-bold text-slate-800 dark:text-slate-200">{evt.clientName}</div>
                                <div className="text-[10px] text-slate-450 mt-0.5">Compromiso · {evt.time}</div>
                              </div>
                              <span className={`text-[9px] px-1.5 py-0.5 rounded font-bold uppercase ${
                                evt.status === 'completed'
                                  ? 'bg-emerald-100 text-emerald-850 dark:bg-emerald-950/20 dark:text-emerald-400'
                                  : evt.status === 'failed'
                                  ? 'bg-rose-100 text-rose-850 dark:bg-rose-950/20 dark:text-rose-400'
                                  : 'bg-purple-100 text-purple-850 dark:bg-purple-950/20 dark:text-purple-400'
                              }`}>
                                {evt.status === 'completed' ? 'Cumplido' : evt.status === 'failed' ? 'Incumplido' : 'Pendiente'}
                              </span>
                            </div>
                            
                            {evt.notes && (
                              <p className="text-[10px] bg-slate-50 dark:bg-slate-900/50 p-2 rounded text-slate-500 dark:text-slate-400 leading-normal">
                                "{evt.notes}"
                              </p>
                            )}

                            <div className="flex justify-between items-center pt-2 border-t border-slate-100 dark:border-slate-700/50">
                              <span className="text-xs font-mono font-bold text-slate-750 dark:text-slate-350">
                                {formatPrice(evt.amount || 0)}
                              </span>
                              
                              <div className="flex gap-2 text-[10px]">
                                {evt.status === 'pending' && isAdmin && (
                                  <>
                                    <button
                                      onClick={() => handleToggleEventStatus(evt.id, 'failed')}
                                      className="font-bold text-rose-600 hover:underline cursor-pointer"
                                    >
                                      Incumplir
                                    </button>
                                    <button
                                      onClick={() => handleOpenRegisterPayment(evt)}
                                      className="font-bold text-emerald-600 hover:underline cursor-pointer"
                                    >
                                      Cobrar
                                    </button>
                                  </>
                                )}
                                {evt.status !== 'completed' && isAdmin && (
                                  <button
                                    onClick={() => handleOpenReschedule(evt)}
                                    className="font-bold text-indigo-650 dark:text-indigo-400 hover:underline cursor-pointer"
                                  >
                                    Reagendar
                                  </button>
                                )}
                                {isAdmin && (
                                  <button 
                                    onClick={() => handleDeleteEvent(evt.id)}
                                    className="text-slate-400 hover:text-rose-600 transition-colors cursor-pointer"
                                  >
                                    <Trash2 className="w-3.5 h-3.5" />
                                  </button>
                                )}
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}

                    {/* LLAMADAS SECTION */}
                    {groupedEvents.llamadas.length > 0 && (
                      <div className="space-y-2">
                        <span className="text-[10px] font-extrabold text-slate-400 dark:text-slate-500 uppercase tracking-wider block">
                          📞 Seguimientos Telefónicos ({groupedEvents.llamadas.length})
                        </span>
                        {groupedEvents.llamadas.map(evt => (
                          <div key={evt.id} className="bg-white dark:bg-slate-800 p-3.5 rounded-xl border border-slate-150 dark:border-slate-800 shadow-3xs space-y-2">
                            <div className="flex items-start justify-between">
                              <div>
                                <div className="text-xs font-bold text-slate-800 dark:text-slate-200">{evt.clientName}</div>
                                <div className="text-[10px] text-slate-400 mt-0.5 flex items-center gap-1 font-mono">
                                  <Phone className="w-2.5 h-2.5 text-slate-400" /> {evt.phone || 'Sin número'} · {evt.time}
                                </div>
                              </div>
                              <span className={`text-[9px] px-1.5 py-0.5 rounded font-bold uppercase ${
                                evt.status === 'completed'
                                  ? 'bg-slate-100 text-slate-500 dark:bg-slate-800 dark:text-slate-500'
                                  : 'bg-blue-100 text-blue-800 dark:bg-blue-950/20 dark:text-blue-400'
                              }`}>
                                {evt.status === 'completed' ? 'Completado' : 'Pendiente'}
                              </span>
                            </div>
                            
                            {evt.notes && (
                              <p className="text-[10px] bg-slate-50 dark:bg-slate-900/50 p-2 rounded text-slate-500 dark:text-slate-400 leading-normal">
                                "{evt.notes}"
                              </p>
                            )}

                            <div className="flex justify-between items-center pt-2 border-t border-slate-100 dark:border-slate-700/50">
                              {evt.phone ? (
                                <button
                                  onClick={() => triggerWhatsAppSend(evt)}
                                  className="flex items-center gap-1 text-[10px] text-teal-600 hover:text-teal-700 font-bold cursor-pointer"
                                >
                                  <MessageSquare className="w-3.5 h-3.5" /> Enviar WhatsApp
                                </button>
                              ) : (
                                <span />
                              )}
                              
                              <div className="flex gap-2.5 text-[10px]">
                                {evt.status === 'pending' && isAdmin && (
                                  <button
                                    onClick={() => handleToggleEventStatus(evt.id, 'completed')}
                                    className="font-bold text-emerald-600 hover:underline cursor-pointer"
                                  >
                                    Llamado
                                  </button>
                                )}
                                {evt.status !== 'completed' && isAdmin && (
                                  <button
                                    onClick={() => handleOpenReschedule(evt)}
                                    className="font-bold text-indigo-650 dark:text-indigo-400 hover:underline cursor-pointer"
                                  >
                                    Reagendar
                                  </button>
                                )}
                                {isAdmin && (
                                  <button 
                                    onClick={() => handleDeleteEvent(evt.id)}
                                    className="text-slate-400 hover:text-rose-600 transition-colors cursor-pointer"
                                  >
                                    <Trash2 className="w-3.5 h-3.5" />
                                  </button>
                                )}
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}

                    {/* WHATSAPPS SECTION */}
                    {groupedEvents.whatsapps.length > 0 && (
                      <div className="space-y-2">
                        <span className="text-[10px] font-extrabold text-slate-400 dark:text-slate-500 uppercase tracking-wider block">
                          💬 Notificaciones de WhatsApp ({groupedEvents.whatsapps.length})
                        </span>
                        {groupedEvents.whatsapps.map(evt => (
                          <div key={evt.id} className="bg-white dark:bg-slate-800 p-3.5 rounded-xl border border-slate-150 dark:border-slate-800 shadow-3xs space-y-2">
                            <div className="flex items-start justify-between">
                              <div>
                                <div className="text-xs font-bold text-slate-800 dark:text-slate-200">{evt.clientName}</div>
                                <div className="text-[10px] text-slate-400 mt-0.5">{evt.notes || 'Recordatorio programado'} · {evt.time}</div>
                              </div>
                              <span className={`text-[9px] px-1.5 py-0.5 rounded font-bold uppercase ${
                                evt.status === 'completed'
                                  ? 'bg-slate-100 text-slate-500 dark:bg-slate-800 dark:text-slate-500'
                                  : 'bg-teal-100 text-teal-800 dark:bg-teal-950/20 dark:text-teal-400'
                              }`}>
                                {evt.status === 'completed' ? 'Enviado' : 'Programado'}
                              </span>
                            </div>

                            <div className="flex justify-between items-center pt-2 border-t border-slate-100 dark:border-slate-700/50">
                              <span className="text-xs font-mono font-bold text-slate-750 dark:text-slate-350">
                                {evt.amount !== undefined ? formatPrice(evt.amount) : 'Sin monto'}
                              </span>
                              
                              <div className="flex gap-2.5 text-[10px] items-center">
                                {evt.status === 'pending' && (
                                  <button
                                    onClick={() => triggerWhatsAppSend(evt)}
                                    className="flex items-center gap-1 font-bold text-teal-650 hover:text-teal-700 cursor-pointer"
                                  >
                                    <Send className="w-3 h-3" /> Enviar Ahora
                                  </button>
                                )}
                                {isAdmin && (
                                  <button 
                                    onClick={() => handleDeleteEvent(evt.id)}
                                    className="text-slate-400 hover:text-rose-600 transition-colors cursor-pointer"
                                  >
                                    <Trash2 className="w-3.5 h-3.5" />
                                  </button>
                                )}
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </>
                )}
              </div>

              {/* Drawer Program Event Footer button */}
              {isAdmin && (
                <button
                  disabled={selectedDateStr ? selectedDateStr < getVenezuelaTodayStr() : false}
                  onClick={() => {
                    const todayStr = getVenezuelaTodayStr();
                    if (selectedDateStr && selectedDateStr < todayStr) {
                      toast('No puedes programar actividades en fechas pasadas.', 'error');
                      return;
                    }
                    setNewEvent(prev => ({ ...prev, date: selectedDateStr }));
                    setIsAddEventOpen(true);
                  }}
                  className={`mt-4 w-full font-bold py-2.5 px-4 rounded-xl text-xs flex items-center justify-center gap-1.5 transition-colors shadow-sm ${
                    selectedDateStr && selectedDateStr < getVenezuelaTodayStr()
                      ? 'bg-slate-105 text-slate-400 dark:bg-slate-800 dark:text-slate-500 cursor-not-allowed border border-slate-200 dark:border-slate-700 shadow-none'
                      : 'bg-indigo-650 hover:bg-indigo-700 text-white cursor-pointer'
                  }`}
                  title={selectedDateStr && selectedDateStr < getVenezuelaTodayStr() ? "No se pueden programar actividades en fechas pasadas" : "Programar actividad para este día"}
                >
                  <Plus className="w-4 h-4" /> Programar Actividad
                </button>
              )}
            </div>
          ) : (
            <div className="flex-1 flex flex-col items-center justify-center text-slate-400 dark:text-slate-650 text-center p-6">
              <CalendarIcon className="w-12 h-12 mb-3 text-slate-200 dark:text-slate-800" />
              <p className="text-sm font-semibold">Selecciona un día para ver su agenda detallada.</p>
            </div>
          )}
        </div>

      </div>

      {/* MODALS IMPLEMENTATIONS */}

      {/* A. NEW EVENT MODAL */}
      {isAddEventOpen && (
        <div className="fixed inset-0 z-[70] flex items-center justify-center bg-slate-900/40 backdrop-blur-xs p-4 overflow-y-auto">
          <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-2xl w-full max-w-md p-6 border dark:border-slate-800">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-base font-bold text-slate-800 dark:text-slate-100 flex items-center gap-2">
                <Plus className="w-5 h-5 text-indigo-650" /> Programar Actividad de Cobranza
              </h3>
              <button 
                onClick={() => setIsAddEventOpen(false)}
                className="p-1 hover:bg-slate-100 dark:hover:bg-slate-850 rounded text-slate-400 cursor-pointer animate-fade-in"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleAddEvent} className="space-y-4 text-xs text-left">
              <div>
                <label className="block font-bold mb-1 text-slate-700 dark:text-slate-300">Tipo de Actividad</label>
                <select
                  className="w-full border dark:border-slate-750 p-2.5 rounded-xl bg-white dark:bg-slate-850 dark:text-slate-200 outline-none focus:ring-2 focus:ring-indigo-500"
                  value={newEvent.type}
                  onChange={e => setNewEvent({ ...newEvent, type: e.target.value as any })}
                >
                  <option value="promesa">🤝 Promesa de Pago</option>
                  <option value="llamada">📞 Recordatorio de Llamada</option>
                  <option value="whatsapp">💬 WhatsApp Programado</option>
                </select>
              </div>

              <div>
                <label className="block font-bold mb-1 text-slate-700 dark:text-slate-300">Cliente Asignado</label>
                <select
                  required
                  className="w-full border dark:border-slate-750 p-2.5 rounded-xl bg-white dark:bg-slate-850 dark:text-slate-200 outline-none focus:ring-2 focus:ring-indigo-500"
                  value={newEvent.clientName}
                  onChange={e => setNewEvent({ ...newEvent, clientName: e.target.value })}
                >
                  <option value="">-- Seleccionar Cliente --</option>
                  {uniqueClients.map(c => (
                    <option key={c.name} value={c.name}>{c.name}</option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold mb-1 text-slate-700 dark:text-slate-300">Fecha</label>
                  <input
                    type="date"
                    required
                    min={getVenezuelaTodayStr()}
                    className="w-full border dark:border-slate-750 p-2.5 rounded-xl bg-white dark:bg-slate-850 dark:text-slate-200 outline-none focus:ring-2 focus:ring-indigo-500"
                    value={newEvent.date}
                    onChange={e => setNewEvent({ ...newEvent, date: e.target.value })}
                  />
                </div>
                <div>
                  <label className="block font-bold mb-1 text-slate-700 dark:text-slate-300">Hora</label>
                  <input
                    type="time"
                    className="w-full border dark:border-slate-750 p-2.5 rounded-xl bg-white dark:bg-slate-850 dark:text-slate-200 outline-none focus:ring-2 focus:ring-indigo-500"
                    value={newEvent.time}
                    onChange={e => setNewEvent({ ...newEvent, time: e.target.value })}
                  />
                </div>
              </div>

              {newEvent.type === 'promesa' && (
                <div>
                  <label className="block font-bold mb-1 text-slate-700 dark:text-slate-300">Monto del Compromiso (Opcional)</label>
                  <input
                    type="number"
                    placeholder="Monto a pagar (COP)"
                    className="w-full border dark:border-slate-750 p-2.5 rounded-xl bg-white dark:bg-slate-850 dark:text-slate-200 outline-none font-mono focus:ring-2 focus:ring-indigo-500"
                    value={newEvent.amount}
                    onChange={e => setNewEvent({ ...newEvent, amount: e.target.value })}
                  />
                </div>
              )}

              <div>
                <label className="block font-bold mb-1 text-slate-700 dark:text-slate-300">Notas / Instrucciones</label>
                <textarea
                  placeholder="Detalles específicos del compromiso o llamada..."
                  rows={3}
                  className="w-full border dark:border-slate-750 p-2.5 rounded-xl bg-white dark:bg-slate-850 dark:text-slate-200 outline-none focus:ring-2 focus:ring-indigo-500"
                  value={newEvent.notes}
                  onChange={e => setNewEvent({ ...newEvent, notes: e.target.value })}
                />
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setIsAddEventOpen(false)}
                  className="px-4 py-2 bg-slate-105 dark:bg-slate-800 hover:bg-slate-200 text-slate-600 dark:text-slate-300 font-bold rounded-xl cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-indigo-650 hover:bg-indigo-700 text-white font-bold rounded-xl cursor-pointer shadow-xs"
                >
                  Programar
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* B. RE-SCHEDULE EVENT MODAL */}
      {isRescheduleOpen && activeEvent && (
        <div className="fixed inset-0 z-[70] flex items-center justify-center bg-slate-900/40 backdrop-blur-xs p-4">
          <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-2xl w-full max-w-sm p-6 border dark:border-slate-800">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-sm font-bold text-slate-800 dark:text-slate-100">
                Reprogramar: {activeEvent.clientName}
              </h3>
              <button 
                onClick={() => setIsRescheduleOpen(false)}
                className="p-1 hover:bg-slate-100 dark:hover:bg-slate-855 rounded text-slate-400 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={submitReschedule} className="space-y-4 text-xs text-left">
              <div>
                <label className="block font-bold mb-1 text-slate-700 dark:text-slate-350">Nueva Fecha</label>
                <input
                  type="date"
                  required
                  min={getVenezuelaTodayStr()}
                  className="w-full border dark:border-slate-750 p-2.5 rounded-xl bg-white dark:bg-slate-850 dark:text-slate-200 outline-none focus:ring-2 focus:ring-indigo-500"
                  value={rescheduleDate}
                  onChange={e => setRescheduleDate(e.target.value)}
                />
              </div>

              <div>
                <label className="block font-bold mb-1 text-slate-700 dark:text-slate-350">Motivo / Notas</label>
                <textarea
                  placeholder="Detalles de por qué se reagendó..."
                  rows={3}
                  className="w-full border dark:border-slate-750 p-2.5 rounded-xl bg-white dark:bg-slate-850 dark:text-slate-200 outline-none focus:ring-2 focus:ring-indigo-500"
                  value={rescheduleNotes}
                  onChange={e => setRescheduleNotes(e.target.value)}
                />
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setIsRescheduleOpen(false)}
                  className="px-4 py-2 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 text-slate-600 dark:text-slate-300 font-bold rounded-xl cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-indigo-650 hover:bg-indigo-700 text-white font-bold rounded-xl cursor-pointer shadow-xs"
                >
                  Confirmar
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* C. REGISTER ABONO (PAYMENT) MODAL */}
      {isRegisterPaymentOpen && activeEvent && (
        <div className="fixed inset-0 z-[70] flex items-center justify-center bg-slate-900/40 backdrop-blur-xs p-4">
          <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-2xl w-full max-w-sm p-6 border dark:border-slate-800">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-sm font-bold text-slate-800 dark:text-slate-100 flex items-center gap-1.5">
                <DollarSign className="w-4.5 h-4.5 text-emerald-600" /> Registrar Cobro / Abono
              </h3>
              <button 
                onClick={() => setIsRegisterPaymentOpen(false)}
                className="p-1 hover:bg-slate-100 dark:hover:bg-slate-855 rounded text-slate-400 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={submitRegisterPayment} className="space-y-4 text-xs text-left">
              <div>
                <label className="block font-bold mb-1 text-slate-750 dark:text-slate-300">Cliente</label>
                <div className="font-semibold text-slate-800 dark:text-slate-200 bg-slate-50 dark:bg-slate-850 p-2.5 rounded-lg border dark:border-slate-800">
                  {activeEvent.clientName}
                </div>
              </div>

              <div>
                <label className="block font-bold mb-1 text-slate-750 dark:text-slate-300">Monto del Abono (COP)</label>
                <input
                  type="number"
                  required
                  min="0.01"
                  step="any"
                  placeholder="Monto..."
                  className="w-full border dark:border-slate-750 p-2.5 rounded-xl bg-white dark:bg-slate-850 dark:text-slate-200 outline-none font-mono focus:ring-2 focus:ring-indigo-500"
                  value={paymentAmount}
                  onChange={e => setPaymentAmount(e.target.value)}
                />
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setIsRegisterPaymentOpen(false)}
                  className="px-4 py-2 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 text-slate-600 dark:text-slate-300 font-bold rounded-xl cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl cursor-pointer shadow-xs"
                >
                  Abonar Pago
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
}
