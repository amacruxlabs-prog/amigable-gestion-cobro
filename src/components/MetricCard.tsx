import React from 'react';
import { TrendingUp, DollarSign, CheckCircle2, AlertCircle, Percent, ArrowUpRight } from 'lucide-react';

interface MetricCardProps {
  id: string;
  title: string;
  value: number;
  type: 'total' | 'paid' | 'receivable' | 'percentage';
  subtext?: string;
  count?: number;
}

const CONFIG = {
  total: {
    icon: DollarSign,
    gradient: 'from-indigo-500 to-violet-600',
    glow: 'shadow-indigo-500/20',
    accent: 'text-indigo-600 dark:text-indigo-400',
    accentBg: 'bg-indigo-50 dark:bg-indigo-500/10',
    border: 'border-indigo-100/60 dark:border-indigo-500/15',
    bar: 'bg-indigo-500',
    barBg: 'bg-indigo-100 dark:bg-indigo-500/15',
    badge: 'badge-info',
    label: 'Emitido',
  },
  paid: {
    icon: CheckCircle2,
    gradient: 'from-emerald-500 to-teal-600',
    glow: 'shadow-emerald-500/20',
    accent: 'text-emerald-600 dark:text-emerald-400',
    accentBg: 'bg-emerald-50 dark:bg-emerald-500/10',
    border: 'border-emerald-100/60 dark:border-emerald-500/15',
    bar: 'bg-emerald-500',
    barBg: 'bg-emerald-100 dark:bg-emerald-500/15',
    badge: 'badge-success',
    label: 'Recaudado',
  },
  receivable: {
    icon: AlertCircle,
    gradient: 'from-amber-500 to-orange-500',
    glow: 'shadow-amber-500/20',
    accent: 'text-amber-600 dark:text-amber-400',
    accentBg: 'bg-amber-50 dark:bg-amber-500/10',
    border: 'border-amber-100/60 dark:border-amber-500/15',
    bar: 'bg-amber-500',
    barBg: 'bg-amber-100 dark:bg-amber-500/15',
    badge: 'badge-warning',
    label: 'Pendiente',
  },
  percentage: {
    icon: Percent,
    gradient: 'from-sky-500 to-blue-600',
    glow: 'shadow-sky-500/20',
    accent: 'text-sky-600 dark:text-sky-400',
    accentBg: 'bg-sky-50 dark:bg-sky-500/10',
    border: 'border-sky-100/60 dark:border-sky-500/15',
    bar: 'bg-sky-500',
    barBg: 'bg-sky-100 dark:bg-sky-500/15',
    badge: 'badge-info',
    label: 'Efectividad',
  },
} as const;

export const MetricCard: React.FC<MetricCardProps> = ({ id, title, value, type, subtext, count }) => {
  const cfg = CONFIG[type];
  const Icon = cfg.icon;

  const formattedValue = type === 'percentage'
    ? `${value.toFixed(1)}%`
    : new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', maximumFractionDigits: 0 }).format(value);

  const progress = type === 'percentage'
    ? Math.min(100, Math.max(0, value))
    : undefined;

  return (
    <div
      id={id}
      className="card card-hover relative overflow-hidden group cursor-default"
    >
      {/* Subtle gradient orb in background */}
      <div
        className={`absolute -top-6 -right-6 w-24 h-24 opacity-[0.07] blur-2xl bg-gradient-to-br ${cfg.gradient} pointer-events-none transition-all duration-500 group-hover:opacity-[0.13] group-hover:scale-110`}
        style={{ borderRadius: '50%' }}
      />

      {/* Header row */}
      <div className="flex items-start justify-between mb-3">
        <div
          className={`p-2.5 ${cfg.accentBg} border ${cfg.border} transition-all duration-300 group-hover:shadow-sm`}
          style={{ borderRadius: 'var(--radius-md)' }}
        >
          <Icon className={`w-4.5 h-4.5 ${cfg.accent}`} />
        </div>
        <span className={`badge ${cfg.badge} gap-1`}>
          <span className={`w-1.5 h-1.5 rounded-full inline-block ${cfg.bar}`} />
          {cfg.label}
        </span>
      </div>

      {/* Title */}
      <p className="text-label mb-1.5">{title}</p>

      {/* Main value */}
      <div className="flex items-end justify-between gap-2 mb-0.5">
        <h3 className={`text-2xl md:text-[1.7rem] font-bold tracking-tight leading-none ${cfg.accent}`}>
          {formattedValue}
        </h3>
        <div className="flex items-center gap-0.5 mb-0.5">
          <ArrowUpRight className={`w-3.5 h-3.5 ${cfg.accent} opacity-60`} />
        </div>
      </div>

      {/* Count pill */}
      {count !== undefined && (
        <p className="text-mono-xs mt-0.5">
          {count} {count === 1 ? 'transacción' : 'transacciones'}
        </p>
      )}

      {/* Subtext */}
      {subtext && (
        <p className="text-xs font-medium mt-1" style={{ color: 'var(--text-muted)' }}>
          {subtext}
        </p>
      )}

      {/* Progress bar for percentage/paid types */}
      {progress !== undefined && (
        <div className="mt-4">
          <div className={`progress-bar ${cfg.barBg}`}>
            <div
              className={`progress-fill ${cfg.bar}`}
              style={{ width: `${progress}%` }}
            />
          </div>
        </div>
      )}
    </div>
  );
};
