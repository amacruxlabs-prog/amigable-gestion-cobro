import { useState, useMemo } from 'react';
import { Transaction } from '../types';
import { ChevronLeft, ChevronRight, Calendar as CalendarIcon, CheckCircle2, Clock } from 'lucide-react';

interface PaymentCalendarProps {
  transactions: Transaction[];
}

export function PaymentCalendar({ transactions }: PaymentCalendarProps) {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedDateStr, setSelectedDateStr] = useState<string | null>(null);

  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();

  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const firstDayOfMonth = new Date(year, month, 1).getDay();

  const prevMonth = () => {
    setCurrentDate(new Date(year, month - 1, 1));
    setSelectedDateStr(null);
  };
  
  const nextMonth = () => {
    setCurrentDate(new Date(year, month + 1, 1));
    setSelectedDateStr(null);
  };

  const currentMonthName = new Date(year, month, 1).toLocaleString('es-ES', { month: 'long', year: 'numeric' });

  // Map transactions by YYYY-MM-DD
  const txByDate = useMemo(() => {
    const map = new Map<string, Transaction[]>();
    transactions.forEach(tx => {
      const d = tx.date; 
      if (!map.has(d)) map.set(d, []);
      map.get(d)!.push(tx);
    });
    return map;
  }, [transactions]);

  const days = [];
  for (let i = 0; i < firstDayOfMonth; i++) {
    days.push(null);
  }
  for (let i = 1; i <= daysInMonth; i++) {
    days.push(i);
  }

  const formatPrice = (v: number) => new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', maximumFractionDigits: 0 }).format(v);

  const selectedTransactions = selectedDateStr ? (txByDate.get(selectedDateStr) || []) : [];

  return (
    <div className="bg-white border text-center border-slate-200 rounded-2xl shadow-sm dark:bg-slate-900 dark:border-slate-800 overflow-hidden flex flex-col xl:flex-row">
      <div className="flex-1 p-4 md:p-6 border-b xl:border-b-0 xl:border-r border-slate-200 dark:border-slate-800">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-2">
            <div className="p-2 bg-indigo-50 rounded-lg text-indigo-600 dark:bg-indigo-900/30 dark:text-indigo-400">
              <CalendarIcon className="w-5 h-5" />
            </div>
            <h3 className="font-bold text-lg text-slate-800 dark:text-slate-100 capitalize">{currentMonthName}</h3>
          </div>
          <div className="flex items-center gap-2">
            <button onClick={prevMonth} className="p-1.5 hover:bg-slate-100 rounded-lg text-slate-500 transition-colors dark:hover:bg-slate-800 dark:text-slate-400">
              <ChevronLeft className="w-5 h-5" />
            </button>
            <button onClick={nextMonth} className="p-1.5 hover:bg-slate-100 rounded-lg text-slate-500 transition-colors dark:hover:bg-slate-800 dark:text-slate-400">
              <ChevronRight className="w-5 h-5" />
            </button>
          </div>
        </div>

        <div className="grid grid-cols-7 gap-1 mb-2">
          {['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'].map(day => (
            <div key={day} className="text-center text-xs font-bold text-slate-400 dark:text-slate-500 py-2">
              {day}
            </div>
          ))}
        </div>

        <div className="grid grid-cols-7 gap-1.5 md:gap-2">
          {days.map((dayNum, i) => {
            if (dayNum === null) {
              return <div key={`empty-${i}`} className="aspect-square" />;
            }
            
            const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(dayNum).padStart(2, '0')}`;
            const dayTxs = txByDate.get(dateStr) || [];
            
            const isSelected = selectedDateStr === dateStr;
            const hasPending = dayTxs.some(t => t.status === 'Cobrar');
            const hasPaid = dayTxs.some(t => t.status === 'Pagado');
            
            const todayStr = new Date().toISOString().substring(0, 10);
            const isToday = dateStr === todayStr;

            return (
              <button
                key={`day-${dayNum}`}
                onClick={() => setSelectedDateStr(dateStr)}
                className={`aspect-square flex flex-col items-center justify-start py-1.5 md:py-2 border rounded-xl relative transition-all overflow-hidden ${
                  isSelected 
                    ? 'border-indigo-500 bg-indigo-50 ring-1 ring-indigo-500 dark:bg-indigo-900/30' 
                    : isToday 
                    ? 'border-indigo-200 bg-slate-50/50 hover:border-indigo-300 dark:border-indigo-500/40 dark:bg-slate-800/50 dark:hover:border-indigo-400/60'
                    : 'border-slate-100 hover:border-slate-300 bg-white hover:bg-slate-50 dark:border-slate-800 dark:bg-slate-900 dark:hover:bg-slate-800'
                }`}
              >
                <div className={`text-sm md:text-base font-semibold ${isToday ? 'text-indigo-600 dark:text-indigo-400' : 'text-slate-700 dark:text-slate-300'}`}>
                  {dayNum}
                </div>
                
                {/* Dots indicator */}
                {dayTxs.length > 0 && (
                  <div className="flex gap-1 mt-1">
                    {hasPaid && <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 shadow-xs" />}
                    {hasPending && <div className="w-1.5 h-1.5 rounded-full bg-amber-500 shadow-xs" />}
                  </div>
                )}

                {/* Number indicator */}
                {dayTxs.length > 0 && (
                   <div className="mt-auto hidden md:block text-[9px] font-mono font-medium text-slate-400 bg-slate-100 dark:bg-slate-800 dark:text-slate-500 px-1 py-0.5 rounded">
                     {dayTxs.length}
                   </div>
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* Selected Date Drawer/Sidebar */}
      <div className="w-full xl:w-80 bg-slate-50 dark:bg-slate-900/50 p-4 md:p-6 flex flex-col shrink-0 text-left">
        {selectedDateStr ? (
           <>
              <h4 className="text-sm font-bold text-slate-800 dark:text-slate-200 mb-4 flex items-center gap-2">
                <CalendarIcon className="w-4 h-4 text-slate-400" />
                {new Date(selectedDateStr + 'T12:00:00Z').toLocaleDateString('es-ES', { weekday: 'long', day: 'numeric', month: 'long' })}
              </h4>
              
              <div className="flex-1 overflow-y-auto min-h-[300px] xl:min-h-0 space-y-3 pr-1 mini-scrollbar">
                {selectedTransactions.length === 0 ? (
                  <div className="text-center p-8 text-slate-400 text-sm">
                    No hay vencimientos o transacciones programadas para esta fecha.
                  </div>
                ) : (
                  selectedTransactions.map((tx) => {
                     const isPaid = tx.status === 'Pagado';
                     return (
                        <div key={tx.id} className="bg-white dark:bg-slate-800 p-3 rounded-xl border border-slate-200 dark:border-slate-700 shadow-xs hover:shadow-md transition-shadow">
                          <div className="flex items-start justify-between gap-2 mb-2">
                            <span className="text-xs font-bold text-slate-700 dark:text-slate-200 truncate pr-2">
                              {tx.clientName}
                            </span>
                            <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded uppercase flex items-center shrink-0 ${isPaid ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400' : 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400'}`}>
                              {isPaid ? <CheckCircle2 className="w-3 h-3 mr-0.5" /> : <Clock className="w-3 h-3 mr-0.5" />}
                              {tx.status}
                            </span>
                          </div>
                          
                          <div className="flex items-end justify-between items-center text-xs">
                             <div className="text-slate-500 dark:text-slate-400 font-mono text-[10px]">
                               {tx.id}
                             </div>
                             <div className="font-semibold text-slate-800 dark:text-slate-200">
                               {isPaid ? (
                                 formatPrice(tx.amount)
                               ) : (
                                 <div className="text-right flex flex-col items-end">
                                   <span className="text-amber-600 dark:text-amber-400 tracking-tight">
                                     {formatPrice(tx.amount - (tx.paidAmount || 0))}
                                   </span>
                                   {(tx.paidAmount || 0) > 0 && (
                                     <span className="text-[9px] text-slate-400 font-normal line-through">
                                       {formatPrice(tx.amount)}
                                     </span>
                                   )}
                                 </div>
                               )}
                             </div>
                          </div>
                        </div>
                     );
                  })
                )}
              </div>
           </>
        ) : (
          <div className="flex-1 flex flex-col items-center justify-center text-slate-400 text-center p-6">
             <CalendarIcon className="w-12 h-12 mb-3 text-slate-200 dark:text-slate-700" />
             <p className="text-sm font-medium">Selecciona un día en el calendario para ver los detalles.</p>
          </div>
        )}
      </div>
    </div>
  );
}
