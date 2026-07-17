import { useEffect, useState } from 'react';
import { useActivityLogs } from '../hooks/useActivityLogs';
import { Search, ChevronLeft, ChevronRight, Filter, History, Clock, User, Globe, Database, Shield, Mail, Phone, DollarSign, Percent, Trash2, PlusCircle, Edit3, LogIn, LogOut, RefreshCw, Upload, MessageSquare, Key } from 'lucide-react';

const ACTION_LABELS: Record<string, { label: string; icon: any; color: string }> = {
  created: { label: 'Creación', icon: PlusCircle, color: 'text-emerald-600 bg-emerald-100 dark:bg-emerald-900/30 dark:text-emerald-400' },
  updated: { label: 'Modificación', icon: Edit3, color: 'text-blue-600 bg-blue-100 dark:bg-blue-900/30 dark:text-blue-400' },
  deleted: { label: 'Eliminación', icon: Trash2, color: 'text-red-600 bg-red-100 dark:bg-red-900/30 dark:text-red-400' },
  payment: { label: 'Abono', icon: DollarSign, color: 'text-emerald-600 bg-emerald-100 dark:bg-emerald-900/30 dark:text-emerald-400' },
  discount: { label: 'Descuento', icon: Percent, color: 'text-purple-600 bg-purple-100 dark:bg-purple-900/30 dark:text-purple-400' },
  status_change: { label: 'Cambio Estado', icon: Shield, color: 'text-amber-600 bg-amber-100 dark:bg-amber-900/30 dark:text-amber-400' },
  login: { label: 'Inicio Sesión', icon: LogIn, color: 'text-sky-600 bg-sky-100 dark:bg-sky-900/30 dark:text-sky-400' },
  logout: { label: 'Cierre Sesión', icon: LogOut, color: 'text-slate-600 bg-slate-100 dark:bg-slate-900/30 dark:text-slate-400' },
  impersonate: { label: 'Impersonación', icon: User, color: 'text-rose-600 bg-rose-100 dark:bg-rose-900/30 dark:text-rose-400' },
  import: { label: 'Importación', icon: Upload, color: 'text-indigo-600 bg-indigo-100 dark:bg-indigo-900/30 dark:text-indigo-400' },
  broadcast: { label: 'Difusión WhatsApp', icon: MessageSquare, color: 'text-green-600 bg-green-100 dark:bg-green-900/30 dark:text-green-400' },
  password_change: { label: 'Cambio Contraseña', icon: Key, color: 'text-orange-600 bg-orange-100 dark:bg-orange-900/30 dark:text-orange-400' },
  refresh: { label: 'Refresh Token', icon: RefreshCw, color: 'text-slate-600 bg-slate-100 dark:bg-slate-900/30 dark:text-slate-400' },
};

interface ActivityLogTableProps {
  endpoint?: '/tenant/activity-logs' | '/superadmin/activity-logs';
}

export const ActivityLogTable = ({ endpoint = '/tenant/activity-logs' }: ActivityLogTableProps) => {
  const { logs, loading, currentPage, totalPages, total, filters, setFilters, fetchLogs, setCurrentPage } = useActivityLogs(endpoint);

  useEffect(() => {
    fetchLogs(1);
  }, []);

  useEffect(() => {
    fetchLogs(1);
  }, [filters]);

  const formatDate = (dateStr: string) => {
    const d = new Date(dateStr);
    return d.toLocaleDateString('es-ES', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' });
  };

  return (
    <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden">
      {/* Header */}
      <div className="p-4 border-b border-slate-150 dark:border-slate-800 space-y-3">
        <div className="flex items-center justify-between">
          <div>
            <h4 className="text-base font-bold text-slate-950 dark:text-slate-100 flex items-center gap-2">
              <History className="w-4 h-4 text-indigo-500" />
              Registro de Actividad
            </h4>
            <p className="text-xs text-slate-500 mt-0.5 dark:text-slate-400">{total} eventos registrados</p>
          </div>
        </div>

        {/* Filters */}
        <div className="flex items-center gap-2 flex-wrap">
          <select
            value={filters.action_type || ''}
            onChange={(e) => setFilters({ ...filters, action_type: e.target.value || undefined })}
            className="text-xs border border-slate-200 dark:border-slate-700 rounded-lg px-2 py-1.5 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 outline-none focus:ring-2 focus:ring-indigo-500"
          >
            <option value="">Todas las acciones</option>
            {Object.entries(ACTION_LABELS).map(([key, val]) => (
              <option key={key} value={key}>{val.label}</option>
            ))}
          </select>

          <input
            type="date"
            value={filters.date_from || ''}
            onChange={(e) => setFilters({ ...filters, date_from: e.target.value || undefined })}
            className="text-xs border border-slate-200 dark:border-slate-700 rounded-lg px-2 py-1.5 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 outline-none focus:ring-2 focus:ring-indigo-500"
            placeholder="Desde"
          />

          <input
            type="date"
            value={filters.date_to || ''}
            onChange={(e) => setFilters({ ...filters, date_to: e.target.value || undefined })}
            className="text-xs border border-slate-200 dark:border-slate-700 rounded-lg px-2 py-1.5 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 outline-none focus:ring-2 focus:ring-indigo-500"
            placeholder="Hasta"
          />
        </div>
      </div>

      {/* Loading */}
      {loading && (
        <div className="p-8 text-center text-sm text-slate-500 dark:text-slate-400">
          <div className="animate-spin w-6 h-6 border-2 border-indigo-500 border-t-transparent rounded-full mx-auto mb-2" />
          Cargando actividad...
        </div>
      )}

      {/* Empty */}
      {!loading && logs.length === 0 && (
        <div className="p-8 text-center text-sm text-slate-500 dark:text-slate-400">
          <History className="w-10 h-10 mx-auto mb-2 text-slate-300 dark:text-slate-600" />
          No hay registros de actividad.
        </div>
      )}

      {/* Table */}
      {!loading && logs.length > 0 && (
        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead>
              <tr className="bg-slate-50 dark:bg-slate-800/50 text-slate-500 dark:text-slate-400 border-b border-slate-150 dark:border-slate-800">
                <th className="text-left px-4 py-2.5 font-semibold">Fecha</th>
                <th className="text-left px-4 py-2.5 font-semibold">Usuario</th>
                <th className="text-left px-4 py-2.5 font-semibold">Acción</th>
                <th className="text-left px-4 py-2.5 font-semibold">Descripción</th>
                <th className="text-left px-4 py-2.5 font-semibold">Entidad</th>
                <th className="text-left px-4 py-2.5 font-semibold">IP</th>
              </tr>
            </thead>
            <tbody>
              {logs.map((log) => {
                const actionDef = ACTION_LABELS[log.action_type] || { label: log.action_type, icon: Filter, color: 'text-slate-600 bg-slate-100 dark:bg-slate-900/30 dark:text-slate-400' };
                const ActionIcon = actionDef.icon;

                return (
                  <tr key={log.id} className="border-b border-slate-100 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800/30 transition-colors">
                    <td className="px-4 py-2.5 whitespace-nowrap text-slate-600 dark:text-slate-400 font-mono">
                      <div className="flex items-center gap-1.5">
                        <Clock className="w-3 h-3" />
                        {formatDate(log.created_at)}
                      </div>
                    </td>
                    <td className="px-4 py-2.5 whitespace-nowrap">
                      <div className="flex items-center gap-1.5 text-slate-700 dark:text-slate-300">
                        <User className="w-3 h-3 text-slate-400" />
                        {log.user_email || 'Sistema'}
                      </div>
                    </td>
                    <td className="px-4 py-2.5 whitespace-nowrap">
                      <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold ${actionDef.color}`}>
                        <ActionIcon className="w-3 h-3" />
                        {actionDef.label}
                      </span>
                    </td>
                    <td className="px-4 py-2.5 text-slate-600 dark:text-slate-300 max-w-[300px] truncate">
                      {log.description || '-'}
                    </td>
                    <td className="px-4 py-2.5 whitespace-nowrap text-slate-500 dark:text-slate-400 font-mono text-[10px]">
                      {log.auditable_type ? (
                        <span className="flex items-center gap-1">
                          <Database className="w-3 h-3" />
                          {log.auditable_type.replace('App\\Models\\', '')}#{log.auditable_id}
                        </span>
                      ) : '-'}
                    </td>
                    <td className="px-4 py-2.5 whitespace-nowrap text-slate-400 dark:text-slate-500 font-mono text-[10px]">
                      {log.ip_address || '-'}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="p-4 border-t border-slate-150 dark:border-slate-800 flex items-center justify-between">
          <span className="text-xs text-slate-500 dark:text-slate-400">
            Página {currentPage} de {totalPages} ({total} registros)
          </span>
          <div className="flex gap-1">
            <button
              onClick={() => setCurrentPage(currentPage - 1)}
              disabled={currentPage <= 1}
              className="btn-secondary px-2 py-1 disabled:opacity-30"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <button
              onClick={() => setCurrentPage(currentPage + 1)}
              disabled={currentPage >= totalPages}
              className="btn-secondary px-2 py-1 disabled:opacity-30"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
