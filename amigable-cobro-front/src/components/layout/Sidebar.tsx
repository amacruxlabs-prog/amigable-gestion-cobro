import React from 'react';
import {
  LayoutDashboard,
  CalendarDays,
  FileText,
  Link2,
  Settings,
  Sparkles,
  ChevronLeft,
  ChevronRight,
  Users,
} from 'lucide-react';

export type ViewType = 'dashboard' | 'calendar' | 'accounts' | 'sync' | 'settings' | 'team';

interface NavItem {
  id: ViewType;
  label: string;
  icon: React.ElementType;
  description: string;
}

const NAV_ITEMS: NavItem[] = [
  {
    id: 'dashboard',
    label: 'Dashboard',
    icon: LayoutDashboard,
    description: 'KPIs y analíticas',
  },
  {
    id: 'calendar',
    label: 'Calendario',
    icon: CalendarDays,
    description: 'Agenda de pagos',
  },
  {
    id: 'accounts',
    label: 'Cuentas y Cobros',
    icon: FileText,
    description: 'Registro y gestión',
  },
  {
    id: 'team',
    label: 'Equipo',
    icon: Users,
    description: 'Gestores e invitados',
  },
  {
    id: 'sync',
    label: 'Sincronización',
    icon: Link2,
    description: 'Google Sheets y datos',
  },
  {
    id: 'settings',
    label: 'Configuración',
    icon: Settings,
    description: 'Ajustes del negocio',
  },
];

interface SidebarProps {
  activeView: ViewType;
  onViewChange: (view: ViewType) => void;
  isCollapsed: boolean;
  onToggleCollapse: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({
  activeView,
  onViewChange,
  isCollapsed,
  onToggleCollapse,
}) => {
  return (
    <aside
      className={`
        relative flex flex-col h-full
        transition-all duration-300 ease-in-out
        ${isCollapsed ? 'w-16' : 'w-60'}
      `}
      style={{
        background: 'var(--surface-card)',
        borderRight: '1px solid var(--border-default)',
        boxShadow: 'var(--shadow-sm)',
        flexShrink: 0,
      }}
    >
      {/* Brand Header */}
      <div
        className={`flex items-center gap-3 px-4 py-5 border-b transition-all duration-300`}
        style={{ borderColor: 'var(--border-default)' }}
      >
        <div
          className="w-8 h-8 flex items-center justify-center text-white flex-shrink-0"
          style={{
            background: 'linear-gradient(135deg, #6366f1, #7c3aed)',
            borderRadius: 'var(--radius-lg)',
            boxShadow: '0 2px 8px rgba(99,102,241,0.35)',
          }}
        >
          <Sparkles className="w-4 h-4" />
        </div>
        {!isCollapsed && (
          <div className="overflow-hidden">
            <h1
              className="text-sm font-bold tracking-tight truncate"
              style={{ color: 'var(--text-primary)' }}
            >
              Amigable Cobro
            </h1>
            <p className="text-[10px] font-medium" style={{ color: 'var(--text-muted)' }}>
              Gestión de Cobranza
            </p>
          </div>
        )}
      </div>

      {/* Navigation */}
      <nav className="flex-1 px-2 py-4 space-y-1 overflow-y-auto">
        {!isCollapsed && (
          <p
            className="px-3 mb-3 text-[9px] font-bold uppercase tracking-widest"
            style={{ color: 'var(--text-muted)' }}
          >
            Menú Principal
          </p>
        )}
        {NAV_ITEMS.map((item) => {
          const Icon = item.icon;
          const isActive = activeView === item.id;
          return (
            <button
              key={item.id}
              onClick={() => onViewChange(item.id)}
              title={isCollapsed ? item.label : undefined}
              className={`
                w-full flex items-center gap-3 px-3 py-2.5 rounded-lg
                text-sm font-semibold transition-all duration-150 cursor-pointer
                group relative
                ${isCollapsed ? 'justify-center' : ''}
              `}
              style={
                isActive
                  ? {
                      background: 'linear-gradient(135deg, #6366f1 0%, #4f46e5 100%)',
                      color: '#fff',
                      boxShadow: '0 2px 8px rgba(99,102,241,0.35)',
                    }
                  : {
                      color: 'var(--text-secondary)',
                      background: 'transparent',
                    }
              }
              onMouseEnter={(e) => {
                if (!isActive) {
                  (e.currentTarget as HTMLElement).style.background = 'var(--surface-base)';
                  (e.currentTarget as HTMLElement).style.color = 'var(--text-primary)';
                }
              }}
              onMouseLeave={(e) => {
                if (!isActive) {
                  (e.currentTarget as HTMLElement).style.background = 'transparent';
                  (e.currentTarget as HTMLElement).style.color = 'var(--text-secondary)';
                }
              }}
            >
              <Icon
                className={`flex-shrink-0 transition-all duration-150 ${
                  isCollapsed ? 'w-5 h-5' : 'w-4 h-4'
                }`}
              />
              {!isCollapsed && (
                <div className="flex-1 text-left overflow-hidden">
                  <span className="block truncate text-[13px]">{item.label}</span>
                  {isActive && (
                    <span
                      className="block text-[10px] font-normal opacity-80 truncate"
                    >
                      {item.description}
                    </span>
                  )}
                </div>
              )}
              {/* Tooltip when collapsed */}
              {isCollapsed && (
                <div
                  className="absolute left-full ml-2 z-50 px-2.5 py-1.5 rounded-md text-xs font-semibold whitespace-nowrap pointer-events-none
                    opacity-0 group-hover:opacity-100 transition-opacity duration-150"
                  style={{
                    background: 'var(--text-primary)',
                    color: 'var(--surface-card)',
                    boxShadow: 'var(--shadow-md)',
                  }}
                >
                  {item.label}
                </div>
              )}
            </button>
          );
        })}
      </nav>

      {/* Collapse toggle button */}
      <div
        className="px-2 py-4 border-t"
        style={{ borderColor: 'var(--border-default)' }}
      >
        <button
          onClick={onToggleCollapse}
          title={isCollapsed ? 'Expandir menú' : 'Colapsar menú'}
          className={`
            w-full flex items-center gap-2 px-3 py-2 rounded-lg
            text-xs font-semibold transition-all duration-150 cursor-pointer
            ${isCollapsed ? 'justify-center' : ''}
          `}
          style={{ color: 'var(--text-muted)', background: 'transparent' }}
          onMouseEnter={(e) => {
            (e.currentTarget as HTMLElement).style.background = 'var(--surface-base)';
            (e.currentTarget as HTMLElement).style.color = 'var(--text-primary)';
          }}
          onMouseLeave={(e) => {
            (e.currentTarget as HTMLElement).style.background = 'transparent';
            (e.currentTarget as HTMLElement).style.color = 'var(--text-muted)';
          }}
        >
          {isCollapsed ? (
            <ChevronRight className="w-4 h-4" />
          ) : (
            <>
              <ChevronLeft className="w-4 h-4" />
              <span>Colapsar menú</span>
            </>
          )}
        </button>
      </div>
    </aside>
  );
};
