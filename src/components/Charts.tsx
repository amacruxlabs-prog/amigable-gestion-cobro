import React, { useState, useMemo } from 'react';
import { Transaction } from '../types';
import { Award, CalendarRange, PiggyBank, Calendar } from 'lucide-react';

interface ChartsProps {
  transactions: Transaction[];
}

export const Charts: React.FC<ChartsProps> = ({ transactions }) => {
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
    return new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', maximumFractionDigits: 0 }).format(val);
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
            <span className="text-[10px] uppercase font-bold py-1 px-2.5 bg-indigo-50 text-indigo-700 rounded-lg dark:bg-indigo-950/40 dark:text-indigo-300">
              Últimos {timelineData.length} Días de Actividad
            </span>
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
                        className="w-full bg-amber-400/95 group-hover:bg-amber-400 transition-colors"
                      />
                      {/* Paid Bar segment */}
                      <div
                        style={{ height: `${paidHeight}%` }}
                        className="w-full bg-indigo-500/90 group-hover:bg-indigo-650 transition-colors"
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
                              <span className="w-2 h-2 rounded-full bg-indigo-500 inline-block" />
                              Pagado:
                            </span>
                            <span className="font-semibold text-emerald-400">{formatMoney(d.paid)}</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="flex items-center gap-1.5 text-slate-400">
                              <span className="w-2 h-2 rounded-full bg-amber-400 inline-block" />
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
              <span className="w-3 h-3 rounded-md bg-indigo-500 inline-block" />
              Cuentas Pagadas (Efectivo)
            </span>
            <span className="flex items-center gap-1.5 text-slate-655 font-semibold dark:text-slate-400">
              <span className="w-3 h-3 rounded-md bg-amber-400 inline-block" />
              Por cobrar (Pendiente)
            </span>
          </div>
        )}
      </div>

      {/* Payment Distribution Chart (Bento Card: spans 4 structural columns) */}
      <div className="lg:col-span-4 card flex flex-col justify-between dark:bg-slate-900 dark:border-slate-800">
        <div>
          <h4 className="text-base font-bold text-slate-900 flex items-center gap-2 mb-1 dark:text-slate-100">
            <PiggyBank className="text-indigo-650 w-5 h-5 dark:text-indigo-400" />
            Estado Balance
          </h4>
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
                  className="stroke-amber-400 fill-none"
                  strokeWidth={strokeWidth}
                />
                {/* Foreground Ring (Paid) */}
                <circle
                  cx="60"
                  cy="60"
                  r={radius}
                  className="stroke-indigo-500 fill-none transition-all duration-1000 ease-out"
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
                  <span className="w-2.5 h-2.5 rounded-full bg-indigo-500 inline-block" />
                  Pagadas:
                </span>
                <span className="font-mono text-slate-950 dark:text-slate-100 font-bold">
                  {formatMoney(statusStats.paidTotal)} ({statusStats.paidPercent.toFixed(0)}%)
                </span>
              </div>
              <div className="flex items-center justify-between p-2 rounded-xl bg-amber-50/40 border border-amber-150/10 hover:bg-amber-50/70 dark:bg-amber-950/20 dark:border-amber-900/30 dark:hover:bg-amber-950/40 transition-colors">
                <span className="flex items-center gap-2 text-amber-950 dark:text-amber-300">
                  <span className="w-2.5 h-2.5 rounded-full bg-amber-400 inline-block" />
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
        <h4 className="text-base font-bold text-slate-900 flex items-center gap-2 mb-4 dark:text-slate-100">
          <Award className="text-amber-500 w-5 h-5" />
          Ranking de Clientes Clave (Mayor Frecuencia & Aporte)
        </h4>

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
                        className="bg-indigo-500 h-full rounded-l-full"
                        title={`Pagado: ${formatMoney(client.paid)}`}
                      />
                      {/* Receivable segment */}
                      <div 
                        style={{ width: `${(client.total / maxClientVal) * (100 - paidDistributionPercent)}%` }}
                        className="bg-amber-400 h-full rounded-r-full"
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
                      <span className="text-amber-600 dark:text-amber-450 block font-semibold hover:underline cursor-help" title="Por cobrar">
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

    </div>
  );
};
