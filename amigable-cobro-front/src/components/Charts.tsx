import React, { useState, useMemo, useEffect } from 'react';
import { Transaction } from '../types';
import { formatCurrency } from '../utils/format';
import { Award, CalendarRange, PiggyBank, Calendar } from 'lucide-react';

interface ChartsProps {
  transactions: Transaction[];
  activeDetailsType?: 'emission' | 'ranking' | null;
  setActiveDetailsType?: (type: 'emission' | 'ranking' | null) => void;
}

export const Charts: React.FC<ChartsProps> = ({ 
  transactions, 
  activeDetailsType, 
  setActiveDetailsType
}) => {
  const [localActiveDetails, setLocalActiveDetails] = useState<'emission' | 'ranking' | null>(null);

  useEffect(() => {
    if (activeDetailsType !== undefined) {
      setLocalActiveDetails(activeDetailsType);
    }
  }, [activeDetailsType]);

  const activeType = localActiveDetails;
  const setActiveType = (type: 'emission' | 'ranking' | null) => {
    if (setActiveDetailsType) {
      setActiveDetailsType(type);
    } else {
      setLocalActiveDetails(type);
    }
  };

  // calculations for emission details
  const fullTimelineData = useMemo(() => {
    const dailyTotals: Record<string, { total: number; paid: number; receivable: number; count: number }> = {};
    
    transactions.forEach(t => {
      const dateStr = t.date;
      if (!dailyTotals[dateStr]) {
        dailyTotals[dateStr] = { total: 0, paid: 0, receivable: 0, count: 0 };
      }
      
      let currentPaid = t.status === 'Pagado' ? t.amount : (t.paidAmount || 0);

      dailyTotals[dateStr].total += t.amount;
      dailyTotals[dateStr].paid += currentPaid;
      dailyTotals[dateStr].receivable += Math.max(0, t.amount - currentPaid);
      dailyTotals[dateStr].count += 1;
    });

    const sortedDates = Object.keys(dailyTotals).sort((a, b) => {
      return new Date(b).getTime() - new Date(a).getTime();
    });

    return sortedDates.map(date => ({
      rawDate: date,
      total: dailyTotals[date].total,
      paid: dailyTotals[date].paid,
      receivable: dailyTotals[date].receivable,
      count: dailyTotals[date].count,
    }));
  }, [transactions]);



  // calculations for client ranking details
  const fullTopClients = useMemo(() => {
    const clients: Record<string, { total: number; paid: number; receivable: number; count: number }> = {};

    transactions.forEach(t => {
      if (!clients[t.clientName]) {
        clients[t.clientName] = { total: 0, paid: 0, receivable: 0, count: 0 };
      }
      
      let currentPaid = t.status === 'Pagado' ? t.amount : (t.paidAmount || 0);

      clients[t.clientName].total += t.amount;
      clients[t.clientName].count += 1;
      clients[t.clientName].paid += currentPaid;
      clients[t.clientName].receivable += Math.max(0, t.amount - currentPaid);
    });

    return Object.keys(clients)
      .map(name => ({
        name,
        total: clients[name].total,
        count: clients[name].count,
        paid: clients[name].paid,
        receivable: clients[name].receivable,
      }))
      .sort((a, b) => b.total - a.total);
  }, [transactions]);

  const [hoveredBarIndex, setHoveredBarIndex] = useState<number | null>(null);

  // 1. Calculate Payment Status Distribution for Doughnut
  const statusStats = useMemo(() => {
    let paidTotal = 0;
    let receivableTotal = 0;
    
    transactions.forEach(t => {
      let currentPaid = t.status === 'Pagado' ? t.amount : (t.paidAmount || 0);
      paidTotal += currentPaid;
      receivableTotal += Math.max(0, t.amount - currentPaid);
    });

    const grandTotal = paidTotal + receivableTotal;
    const paidPercent = grandTotal > 0 ? (paidTotal / grandTotal) * 100 : 0;
    const receivablePercent = grandTotal > 0 ? (receivableTotal / grandTotal) * 100 : 0;

    return {
      paidTotal,
      receivableTotal,
      grandTotal,
      paidPercent,
      receivablePercent
    };
  }, [transactions]);

  // 2. Timeline chart calculations (Aggregate sales by unique date)
  const timelineData = useMemo(() => {
    const dailyTotals: Record<string, { total: number; paid: number; receivable: number }> = {};
    
    transactions.forEach(t => {
      const dateStr = t.date;
      if (!dailyTotals[dateStr]) {
        dailyTotals[dateStr] = { total: 0, paid: 0, receivable: 0 };
      }
      
      let currentPaid = t.status === 'Pagado' ? t.amount : (t.paidAmount || 0);

      dailyTotals[dateStr].total += t.amount;
      dailyTotals[dateStr].paid += currentPaid;
      dailyTotals[dateStr].receivable += Math.max(0, t.amount - currentPaid);
    });

    // Sort dates chronologically
    const sortedDates = Object.keys(dailyTotals).sort((a, b) => {
      return new Date(a).getTime() - new Date(b).getTime();
    });

    // Keep the last 10 unique transaction dates for high readability, or all if small
    const datesToRender = sortedDates.slice(-10);

    return datesToRender.map(date => {
      const formattedDate = () => {
        try {
          const d = new Date(date + 'T00:00:00');
          return d.toLocaleDateString('es-ES', { day: '2-digit', month: 'short' });
        } catch (_) {
          return date;
        }
      };

      return {
        rawDate: date,
        formattedDate: formattedDate(),
        total: dailyTotals[date].total,
        paid: dailyTotals[date].paid,
        receivable: dailyTotals[date].receivable,
      };
    });
  }, [transactions]);

  // Calculations for scale of the bar chart
  const maxTimelineVal = useMemo(() => {
    const maxVal = Math.max(...timelineData.map(d => d.total), 0);
    return maxVal === 0 ? 1000 : maxVal * 1.1; // 10% vertical padding
  }, [timelineData]);

  // 3. Leaderboard: Top clients by purchase volume
  const topClients = useMemo(() => {
    const clients: Record<string, { total: number; paid: number; receivable: number; count: number }> = {};

    transactions.forEach(t => {
      if (!clients[t.clientName]) {
        clients[t.clientName] = { total: 0, paid: 0, receivable: 0, count: 0 };
      }
      
      let currentPaid = t.status === 'Pagado' ? t.amount : (t.paidAmount || 0);

      clients[t.clientName].total += t.amount;
      clients[t.clientName].count += 1;
      clients[t.clientName].paid += currentPaid;
      clients[t.clientName].receivable += Math.max(0, t.amount - currentPaid);
    });

    return Object.keys(clients)
      .map(name => ({
        name,
        total: clients[name].total,
        count: clients[name].count,
        paid: clients[name].paid,
        receivable: clients[name].receivable,
      }))
      .sort((a, b) => b.total - a.total)
      .slice(0, 5); // top 5 clients
  }, [transactions]);

  const maxClientVal = useMemo(() => {
    return topClients.length > 0 ? topClients[0].total : 1000;
  }, [topClients]);

  const formatMoney = (val: number) => {
    return formatCurrency(val);
  };

  // SVG parameters for doughnut
  const radius = 50;
  const strokeWidth = 14;
  const circumference = 2 * Math.PI * radius;
  const paidOffset = circumference - (statusStats.paidPercent / 100) * circumference;

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
      
      {/* Sales Trend Chart (Bento Card: spans 8 structural columns) */}
      <div className="lg:col-span-8 card flex flex-col justify-between dark:bg-slate-900 dark:border-slate-800">
        <div>
          <div className="flex justify-between items-center mb-4">
            <h4 className="text-base font-bold text-slate-900 flex items-center gap-2 dark:text-slate-100">
              <CalendarRange className="text-indigo-650 w-5 h-5 dark:text-indigo-400" />
              Historial de Emisión (por Día de Operaciones)
            </h4>
            <div className="flex items-center gap-2">
              <button 
                type="button"
                onClick={() => setActiveType('emission')}
                className="text-xs font-bold text-indigo-650 hover:text-indigo-800 dark:text-indigo-400 dark:hover:text-indigo-300 hover:underline cursor-pointer mr-1"
              >
                Ver Detalles
              </button>
              <span className="text-[10px] uppercase font-bold py-1 px-2.5 bg-indigo-50 text-indigo-700 rounded-lg dark:bg-indigo-950/40 dark:text-indigo-300">
                Últimos {timelineData.length} Días
              </span>
            </div>
          </div>
          <p className="text-xs text-slate-400 mb-6 font-sans dark:text-slate-500">
            Desglose acumulado de ingresos. Pasa el cursor sobre las barras para ver detalles de cuentas pagadas y pendientes.
          </p>
        </div>

        {timelineData.length === 0 ? (
          <div className="h-64 flex flex-col items-center justify-center border-2 border-dashed border-slate-150 dark:border-slate-800 rounded-xl bg-slate-50/50 dark:bg-slate-800/30 text-slate-450">
            <Calendar className="w-8 h-8 mb-2 stroke-1 text-slate-300 dark:text-slate-600" />
            <p className="text-sm font-medium">No hay transacciones registradas</p>
          </div>
        ) : (
          <div className="relative w-full h-64 select-none">
            {/* Grid Lines & Labels */}
            <div className="absolute inset-x-0 top-0 bottom-8 flex flex-col justify-between pointer-events-none">
              {[1, 0.75, 0.5, 0.25, 0].map((ratio, idx) => (
                <div key={idx} className="relative w-full border-t border-slate-100/80 dark:border-slate-800/60">
                  <span className="absolute -top-2.5 right-0 text-[10px] font-mono text-slate-400 bg-white px-1 shadow-xs rounded-xs dark:bg-slate-900 dark:text-slate-500 dark:shadow-none">
                    {formatMoney(maxTimelineVal * ratio)}
                  </span>
                </div>
              ))}
            </div>

            {/* Bars container */}
            <div className="absolute inset-x-0 top-0 bottom-8 flex justify-around items-end px-4">
              {timelineData.map((d, idx) => {
                const totalHeight = (d.total / maxTimelineVal) * 100;
                const paidHeight = (d.paid / d.total) * totalHeight;
                const recHeight = totalHeight - paidHeight;

                return (
                  <div
                    key={idx}
                    className="group relative flex flex-col items-center w-full max-w-[42px] cursor-pointer"
                    onMouseEnter={() => setHoveredBarIndex(idx)}
                    onMouseLeave={() => setHoveredBarIndex(null)}
                  >
                    {/* Visual Bar Stacks */}
                    <div className="w-full relative h-[210px] flex flex-col justify-end rounded-t-lg overflow-hidden transition-all duration-300 group-hover:shadow-[0_0_12px_rgba(99,102,241,0.25)]">
                      {/* Receivable Bar segment */}
                      <div
                        style={{ height: `${recHeight}%` }}
                        className="w-full bg-[#06B6D4]/90 group-hover:bg-[#06B6D4] transition-colors"
                      />
                      {/* Paid Bar segment */}
                      <div
                        style={{ height: `${paidHeight}%` }}
                        className="w-full bg-[#6366F1]/90 group-hover:bg-[#4f46e5] transition-colors"
                      />
                      {/* Empty filler if heights are zero */}
                      {d.total === 0 && (
                        <div className="w-full h-[2%] bg-slate-200 dark:bg-slate-700" />
                      )}
                    </div>

                    {/* Date label */}
                    <span className="mt-2 text-[10px] font-semibold text-slate-500 text-center uppercase tracking-tighter">
                      {d.formattedDate}
                    </span>

                    {/* Dynamic Tooltip on hover */}
                    {hoveredBarIndex === idx && (
                      <div className="absolute -top-28 z-40 bg-slate-900 text-white rounded-xl p-3 shadow-xl text-xs w-48 pointer-events-none transform -translate-y-1 transition-all duration-200">
                        <div className="font-semibold text-slate-200 border-b border-slate-700 pb-1 mb-1.5 flex justify-between">
                          <span>{d.rawDate}</span>
                          <span className="text-indigo-400 font-bold">Total</span>
                        </div>
                        <div className="space-y-1 font-mono">
                          <div className="flex justify-between">
                            <span className="flex items-center gap-1.5 text-slate-400">
                              <span className="w-2 h-2 rounded-full bg-[#6366F1] inline-block" />
                              Pagado:
                            </span>
                            <span className="font-semibold text-emerald-400">{formatMoney(d.paid)}</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="flex items-center gap-1.5 text-slate-400">
                              <span className="w-2 h-2 rounded-full bg-[#06B6D4] inline-block" />
                              Por cobrar:
                            </span>
                            <span className="font-semibold text-amber-400">{formatMoney(d.receivable)}</span>
                          </div>
                          <div className="flex justify-between pt-1 border-t border-slate-800 text-sm font-bold text-white">
                            <span>Suma:</span>
                            <span>{formatMoney(d.total)}</span>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Chart Legend */}
        {timelineData.length > 0 && (
          <div className="flex items-center gap-4 justify-center border-t border-slate-50 dark:border-slate-800 pt-3 text-xs">
            <span className="flex items-center gap-1.5 text-slate-655 font-semibold dark:text-slate-400">
              <span className="w-3 h-3 rounded-md bg-[#6366F1] inline-block" />
              Cuentas Pagadas (Efectivo)
            </span>
            <span className="flex items-center gap-1.5 text-slate-655 font-semibold dark:text-slate-400">
              <span className="w-3 h-3 rounded-md bg-[#06B6D4] inline-block" />
              Por cobrar (Pendiente)
            </span>
          </div>
        )}
      </div>

      {/* Payment Distribution Chart (Bento Card: spans 4 structural columns) */}
      <div className="lg:col-span-4 card flex flex-col justify-between dark:bg-slate-900 dark:border-slate-800">
        <div>
          <div className="flex justify-between items-center mb-1">
            <h4 className="text-base font-bold text-slate-900 flex items-center gap-2 dark:text-slate-100">
              <PiggyBank className="text-indigo-650 w-5 h-5 dark:text-indigo-400" />
              Estado Balance
            </h4>
          </div>
          <p className="text-xs text-slate-400 mb-6 dark:text-slate-500">
            Proporción en monto total de cuotas pagadas frente a cuotas aún pendientes por recibir.
          </p>
        </div>

        {statusStats.grandTotal === 0 ? (
          <div className="h-44 flex items-center justify-center border border-dashed border-slate-100 rounded-xl bg-slate-50/50 text-slate-400">
            <p className="text-sm">Sin datos de transacciones</p>
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center py-4">
            <div className="relative w-40 h-40 flex items-center justify-center">
              {/* SVG Ring */}
              <svg className="w-full h-full -rotate-90" viewBox="0 0 120 120">
                {/* Background Ring (Receivable) */}
                <circle
                  cx="60"
                  cy="60"
                  r={radius}
                  className="stroke-[#06B6D4] fill-none"
                  strokeWidth={strokeWidth}
                />
                {/* Foreground Ring (Paid) */}
                <circle
                  cx="60"
                  cy="60"
                  r={radius}
                  className="stroke-[#6366F1] fill-none transition-all duration-1000 ease-out"
                  strokeWidth={strokeWidth}
                  strokeDasharray={circumference}
                  strokeDashoffset={paidOffset}
                  strokeLinecap="round"
                />
              </svg>
              {/* Inner Stats Box */}
              <div className="absolute inset-0 flex flex-col items-center justify-center text-center">
                <span className="text-3xl font-extrabold text-slate-900 font-sans tracking-tight dark:text-slate-100">
                  {statusStats.paidPercent.toFixed(0)}%
                </span>
                <span className="text-[10px] font-bold tracking-wider text-slate-400 uppercase">
                  Recaudado
                </span>
              </div>
            </div>

            {/* Doughnut Legend & Detail rows */}
            <div className="w-full space-y-2 mt-6 text-xs font-semibold">
              <div className="flex items-center justify-between p-2 rounded-xl bg-indigo-50/40 border border-indigo-150/10 hover:bg-indigo-50/70 dark:bg-indigo-950/20 dark:border-indigo-900/30 dark:hover:bg-indigo-950/40 transition-colors">
                <span className="flex items-center gap-2 text-indigo-900 dark:text-indigo-300">
                  <span className="w-2.5 h-2.5 rounded-full bg-[#6366F1] inline-block" />
                  Pagadas:
                </span>
                <span className="font-mono text-slate-950 dark:text-slate-100 font-bold">
                  {formatMoney(statusStats.paidTotal)} ({statusStats.paidPercent.toFixed(0)}%)
                </span>
              </div>
              <div className="flex items-center justify-between p-2 rounded-xl bg-cyan-50/40 border border-cyan-150/10 hover:bg-cyan-50/70 dark:bg-cyan-950/20 dark:border-cyan-900/30 dark:hover:bg-cyan-950/40 transition-colors">
                <span className="flex items-center gap-2 text-cyan-950 dark:text-cyan-300">
                  <span className="w-2.5 h-2.5 rounded-full bg-[#06B6D4] inline-block" />
                  Por cobrar:
                </span>
                <span className="font-mono text-slate-950 dark:text-slate-100 font-bold">
                  {formatMoney(statusStats.receivableTotal)} ({statusStats.receivablePercent.toFixed(0)}%)
                </span>
              </div>
              <div className="border-t border-slate-200/60 dark:border-slate-800 pt-2.5 mt-2 flex items-center justify-between text-sm font-bold text-slate-800 dark:text-slate-250">
                <span>Emisión Total:</span>
                <span className="font-mono text-indigo-600 dark:text-indigo-400">{formatMoney(statusStats.grandTotal)}</span>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Leaderboard Section (Bento Card: Full 12 structural columns) */}
      <div className="lg:col-span-12 card dark:bg-slate-900 dark:border-slate-800">
        <div className="flex justify-between items-center mb-4">
          <h4 className="text-base font-bold text-slate-900 flex items-center gap-2 dark:text-slate-100">
            <Award className="text-amber-500 w-5 h-5" />
            Ranking de Clientes Clave (Mayor Frecuencia & Aporte)
          </h4>
          <button 
            type="button"
            onClick={() => setActiveType('ranking')}
            className="text-xs font-bold text-indigo-650 hover:text-indigo-800 dark:text-indigo-400 dark:hover:text-indigo-300 hover:underline cursor-pointer"
          >
            Ver Ranking Completo
          </button>
        </div>

        {topClients.length === 0 ? (
          <p className="text-xs text-slate-400 py-4 text-center">No hay clientes suficientes.</p>
        ) : (
          <div className="space-y-4">
            {topClients.map((client, idx) => {
              const clientPercent = maxClientVal > 0 ? (client.total / maxClientVal) * 100 : 0;
              const paidDistributionPercent = client.total > 0 ? (client.paid / client.total) * 100 : 0;

              return (
                <div key={idx} className="flex flex-col md:flex-row md:items-center justify-between gap-4 p-4 rounded-xl hover:bg-slate-50/70 dark:hover:bg-slate-800/30 border border-slate-100 dark:border-slate-800/80 transition-all duration-200">
                  {/* Rank & Client Name */}
                  <div className="flex items-center gap-3 md:w-1/3">
                    <span className={`w-6 h-6 flex items-center justify-center font-mono font-bold rounded-lg text-sm ${
                      idx === 0 ? 'bg-amber-100/85 text-amber-800 dark:bg-amber-955/20 dark:text-amber-300' :
                      idx === 1 ? 'bg-slate-150 text-slate-700 dark:bg-slate-800 dark:text-slate-300' :
                      idx === 2 ? 'bg-orange-100/85 text-orange-800 dark:bg-orange-955/20 dark:text-orange-300' : 'bg-slate-50 dark:bg-slate-800 text-slate-400'
                    }`}>
                      {idx + 1}
                    </span>
                    <div className="truncate">
                      <p className="text-sm font-semibold text-slate-900 dark:text-slate-100 truncate">{client.name}</p>
                      <p className="text-xs text-slate-400 dark:text-slate-500 font-medium leading-none mt-1">
                        {client.count} {client.count === 1 ? 'servicio' : 'servicios registrados'}
                      </p>
                    </div>
                  </div>

                  {/* Relative Sales bar block */}
                  <div className="flex-1 space-y-1">
                    <div className="flex justify-between text-xs font-mono font-medium text-slate-405 dark:text-slate-500">
                       <span>Proporción de aporte</span>
                      <span className="text-slate-900 dark:text-slate-300 font-bold">{clientPercent.toFixed(0)}% del máximo</span>
                    </div>

                    {/* Progress multi-bar */}
                    <div className="w-full bg-slate-150 dark:bg-slate-800 rounded-full h-2.5 overflow-hidden flex">
                      {/* Paid segment */}
                      <div 
                        style={{ width: `${(client.total / maxClientVal) * paidDistributionPercent}%` }}
                        className="bg-[#6366F1] h-full rounded-l-full"
                        title={`Pagado: ${formatMoney(client.paid)}`}
                      />
                      {/* Receivable segment */}
                      <div 
                        style={{ width: `${(client.total / maxClientVal) * (100 - paidDistributionPercent)}%` }}
                        className="bg-[#06B6D4] h-full rounded-r-full"
                        title={`Pendiente: ${formatMoney(client.receivable)}`}
                      />
                    </div>
                  </div>

                  {/* Statistics figures */}
                  <div className="flex items-center gap-4 text-right md:-mt-2">
                    <div className="font-mono text-xs text-slate-500">
                      <span className="text-emerald-600 dark:text-emerald-400 block font-semibold hover:underline cursor-help" title="Monto liquidado">
                        PAG: {formatMoney(client.paid)}
                      </span>
                      <span className="text-[#06B6D4] dark:text-[#06B6D4] block font-semibold hover:underline cursor-help" title="Por cobrar">
                        PEND: {formatMoney(client.receivable)}
                      </span>
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-bold text-slate-900 dark:text-slate-205 font-mono">
                        {formatMoney(client.total)}
                      </p>
                      <span className="text-[10px] text-slate-400 dark:text-slate-500 font-semibold uppercase">TOTAL BRUTO</span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* DETAILS MODAL OVERLAY */}
      {activeType && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs z-[120] flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 border dark:border-slate-800 rounded-2xl shadow-2xl w-full max-w-4xl overflow-hidden flex flex-col max-h-[90vh] animate-scale-up text-left">
            
            {/* Modal Header */}
            <div className="bg-slate-50 dark:bg-slate-800/40 p-4 border-b border-slate-100 dark:border-slate-850 flex justify-between items-center shrink-0">
              <h3 className="font-bold text-sm text-slate-900 dark:text-slate-100 flex items-center gap-2">
                {activeType === 'emission' && <>📊 Desglose de Historial de Emisión por Día</>}
                {activeType === 'ranking' && <>🏆 Ranking Completo de Aportes de Clientes</>}
              </h3>
              <button 
                type="button"
                onClick={() => setActiveType(null)}
                className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-350 hover:bg-slate-105 dark:hover:bg-slate-800 cursor-pointer transition-colors"
              >
                <span className="text-sm font-bold">✕</span>
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-6 overflow-y-auto flex-1 space-y-4">
              
              {/* EMISSION TYPE */}
              {activeType === 'emission' && (
                <div className="space-y-4">
                  <p className="text-xs text-slate-550 dark:text-slate-400 font-medium">
                    Listado cronológico completo de las fechas en las que se registraron transacciones y sus respectivos balances.
                  </p>
                  <div className="overflow-x-auto border dark:border-slate-800 rounded-xl">
                    <table className="w-full text-xs text-left whitespace-nowrap">
                      <thead className="bg-slate-50 dark:bg-slate-800/50 text-slate-500 font-bold uppercase tracking-wider border-b dark:border-slate-800">
                        <tr>
                          <th className="px-4 py-3">Fecha</th>
                          <th className="px-4 py-3 text-right">Monto Total</th>
                          <th className="px-4 py-3 text-right">Monto Cobrado</th>
                          <th className="px-4 py-3 text-right">Saldo Pendiente</th>
                          <th className="px-4 py-3 text-center">Registros</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100 dark:divide-slate-800 font-medium">
                        {fullTimelineData.map((d, i) => (
                          <tr key={i} className="hover:bg-slate-550/50 dark:hover:bg-slate-800/20">
                            <td className="px-4 py-3 font-semibold text-slate-700 dark:text-slate-300">
                              {new Date(d.rawDate + 'T00:00:00').toLocaleDateString('es-ES', { weekday: 'long', day: '2-digit', month: 'long', year: 'numeric', timeZone: 'America/Caracas' })}
                            </td>
                            <td className="px-4 py-3 text-right font-mono text-slate-900 dark:text-slate-100 font-bold">
                              {formatMoney(d.total)}
                            </td>
                            <td className="px-4 py-3 text-right font-mono text-emerald-600 dark:text-emerald-400 font-bold">
                              +{formatMoney(d.paid)}
                            </td>
                            <td className="px-4 py-3 text-right font-mono text-rose-650 dark:text-rose-400 font-bold">
                              {formatMoney(d.receivable)}
                            </td>
                            <td className="px-4 py-3 text-center text-slate-450 font-mono">
                              {d.count}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}



              {/* RANKING TYPE */}
              {activeType === 'ranking' && (
                <div className="space-y-4">
                  <p className="text-xs text-slate-550 dark:text-slate-400 font-medium">
                    Clasificación completa de todos los clientes de acuerdo con el volumen total de su facturación, abonos y deudas.
                  </p>
                  <div className="overflow-x-auto border dark:border-slate-800 rounded-xl">
                    <table className="w-full text-xs text-left whitespace-nowrap">
                      <thead className="bg-slate-50 dark:bg-slate-800/50 text-slate-500 font-bold uppercase tracking-wider border-b dark:border-slate-800">
                        <tr>
                          <th className="px-4 py-3 text-center">Puesto</th>
                          <th className="px-4 py-3">Cliente</th>
                          <th className="px-4 py-3 text-center">Cuentas</th>
                          <th className="px-4 py-3 text-right">Volumen Facturado</th>
                          <th className="px-4 py-3 text-right">Volumen Cobrado</th>
                          <th className="px-4 py-3 text-right">Saldo Pendiente</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100 dark:divide-slate-800 font-medium">
                        {fullTopClients.map((client, idx) => (
                          <tr key={idx} className="hover:bg-slate-550/50 dark:hover:bg-slate-800/20">
                            <td className="px-4 py-3 text-center">
                              <span className={`w-6 h-6 inline-flex items-center justify-center font-mono font-bold rounded-lg text-xs ${
                                idx === 0 ? 'bg-amber-100 text-amber-800 dark:bg-amber-955/20 dark:text-amber-300' :
                                idx === 1 ? 'bg-slate-150 text-slate-700 dark:bg-slate-800 dark:text-slate-300' :
                                idx === 2 ? 'bg-orange-100 text-orange-800 dark:bg-orange-955/20 dark:text-orange-300' : 'bg-slate-50 dark:bg-slate-800 text-slate-400'
                              }`}>
                                {idx + 1}
                              </span>
                            </td>
                            <td className="px-4 py-3 font-semibold text-slate-900 dark:text-slate-100">
                              {client.name}
                            </td>
                            <td className="px-4 py-3 text-center font-mono text-slate-500">
                              {client.count}
                            </td>
                            <td className="px-4 py-3 text-right font-mono text-slate-900 dark:text-slate-100 font-bold">
                              {formatMoney(client.total)}
                            </td>
                            <td className="px-4 py-3 text-right font-mono text-emerald-650 dark:text-emerald-400 font-bold">
                              +{formatMoney(client.paid)}
                            </td>
                            <td className="px-4 py-3 text-right font-mono text-rose-650 dark:text-rose-450 font-bold">
                              {formatMoney(client.receivable)}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

            </div>

            {/* Modal Footer */}
            <div className="bg-slate-50 dark:bg-slate-800/40 p-4 border-t border-slate-100 dark:border-slate-855 flex justify-end shrink-0">
              <button
                type="button"
                onClick={() => setActiveType(null)}
                className="px-4 py-2 bg-indigo-650 hover:bg-indigo-700 text-white text-xs font-bold rounded-xl cursor-pointer shadow-sm transition-colors"
              >
                Cerrar Detalles
              </button>
            </div>

          </div>
        </div>
      )}

    </div>
  );
};
