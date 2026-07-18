import React, { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import {
  Clock,
  LogOut,
  Moon,
  Sun,
  Sparkles,
  MessageSquare,
  Shield,
  ShieldAlert,
} from 'lucide-react';
import { Sidebar, ViewType } from './Sidebar';
import { useAuth } from '../../contexts/AuthContext';
import { useTheme } from '../../hooks/useTheme';

interface AppLayoutProps {
  children: (activeView: ViewType) => React.ReactNode;
  onOpenAi: () => void;
  onOpenWhatsapp: () => void;
  onOpenSuperadmin: () => void;
  currentTime: string;
}

export const AppLayout: React.FC<AppLayoutProps> = ({
  children,
  onOpenAi,
  onOpenWhatsapp,
  onOpenSuperadmin,
  currentTime,
}) => {
  const { user, businessId, signOut, isSuperadmin, isAdmin } = useAuth();
  const { isDarkMode, toggleTheme } = useTheme();
  
  const navigate = useNavigate();
  const location = useLocation();

  const pathSegment = location.pathname.split('/')[2]; 
  const isValidView = (v: any): v is ViewType => ['dashboard', 'calendar', 'accounts', 'sync', 'settings', 'team'].includes(v);
  const activeView: ViewType = isValidView(pathSegment) ? pathSegment : 'dashboard';

  React.useEffect(() => {
    if (!isValidView(pathSegment)) {
      navigate('/panel/dashboard', { replace: true });
    }
  }, [pathSegment, navigate]);

  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const handleViewChange = (v: ViewType) => {
    navigate(`/panel/${v}`);
    setMobileMenuOpen(false);
  };

  // View labels for the topbar breadcrumb
  const VIEW_LABELS: Record<ViewType, string> = {
    dashboard: 'Dashboard',
    calendar: 'Calendario de Pagos',
    accounts: 'Cuentas y Cobros',
    sync: 'Sincronización de Datos',
    settings: 'Configuración',
    team: 'Equipo y Gestores',
  };

  return (
    <div
      className="flex h-screen overflow-hidden"
      style={{ background: 'var(--surface-base)', color: 'var(--text-primary)' }}
    >
      {/* ── Sidebar (desktop) ── */}
      <div className="hidden md:flex">
        <Sidebar
          activeView={activeView}
          onViewChange={handleViewChange}
          isCollapsed={sidebarCollapsed}
          onToggleCollapse={() => setSidebarCollapsed((c) => !c)}
        />
      </div>

      {/* ── Mobile Sidebar Overlay ── */}
      {mobileMenuOpen && (
        <div
          className="fixed inset-0 z-40 md:hidden"
          onClick={() => setMobileMenuOpen(false)}
        >
          <div className="absolute inset-0 bg-slate-900/50 backdrop-blur-sm" />
          <div
            className="absolute left-0 top-0 h-full"
            onClick={(e) => e.stopPropagation()}
          >
            <Sidebar
              activeView={activeView}
              onViewChange={handleViewChange}
              isCollapsed={false}
              onToggleCollapse={() => setMobileMenuOpen(false)}
            />
          </div>
        </div>
      )}

      {/* ── Main column ── */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">

        {/* ── Topbar ── */}
        <header
          className="sticky top-0 z-30 flex-shrink-0"
          style={{
            background: 'var(--surface-card)',
            borderBottom: '1px solid var(--border-default)',
            boxShadow: 'var(--shadow-xs)',
          }}
        >
          {/* Top brand stripe */}
          <div className="h-0.5 w-full bg-gradient-to-r from-indigo-500 via-violet-500 to-sky-500" />

          <div className="flex items-center justify-between gap-3 px-4 sm:px-6 py-3">
            {/* Left: hamburger (mobile) + breadcrumb */}
            <div className="flex items-center gap-3 min-w-0">
              {/* Hamburger mobile */}
              <button
                className="md:hidden btn btn-secondary btn-icon flex-shrink-0"
                onClick={() => setMobileMenuOpen(true)}
                title="Abrir menú"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                </svg>
              </button>

              {/* Breadcrumb */}
              <div className="min-w-0">
                <p
                  className="text-[10px] font-semibold uppercase tracking-widest truncate"
                  style={{ color: 'var(--text-muted)' }}
                >
                  {user?.email}
                </p>
                <h2
                  className="text-sm font-bold truncate"
                  style={{ color: 'var(--text-primary)' }}
                >
                  {VIEW_LABELS[activeView]}
                </h2>
              </div>
            </div>

            {/* Right: action buttons */}
            <div className="flex items-center flex-wrap gap-2 flex-shrink-0">
              {/* Clock */}
              {currentTime && (
                <div
                  className="btn btn-secondary gap-1.5 font-mono hidden sm:inline-flex"
                  style={{ letterSpacing: '0.02em' }}
                >
                  <Clock className="w-3.5 h-3.5" style={{ color: 'var(--text-muted)' }} />
                  <span style={{ color: 'var(--text-secondary)', fontSize: '0.75rem' }}>
                    {currentTime}
                  </span>
                </div>
              )}

              {/* Superadmin */}
              {isSuperadmin && !businessId && (
                <button
                  onClick={onOpenSuperadmin}
                  className="btn"
                  title="Panel Superadmin"
                  style={{
                    background: 'linear-gradient(135deg, #f3e8ff, #ede9fe)',
                    color: '#6b21a8',
                    borderColor: 'rgba(139,92,246,0.25)',
                  }}
                >
                  <Shield className="w-3.5 h-3.5" />
                  <span className="hidden sm:inline">Superadmin</span>
                </button>
              )}

              {/* Asistente IA */}
              <button onClick={onOpenAi} className="btn btn-primary" title="Asistente IA">
                <Sparkles className="w-3.5 h-3.5 animate-pulse" />
                <span className="hidden sm:inline">Asistente IA</span>
              </button>

              {/* WhatsApp eliminado temporalmente */}

              {/* Theme toggle */}
              <button
                onClick={toggleTheme}
                className="btn btn-secondary btn-icon"
                title="Cambiar tema"
              >
                {isDarkMode ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
              </button>

              {/* Sign out */}
              <button onClick={signOut} className="btn btn-secondary" title="Cerrar sesión">
                <LogOut className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Salir</span>
              </button>
            </div>
          </div>
        </header>

        {/* ── Scrollable content area ── */}
        <main className="flex-1 overflow-y-auto">
          {children(activeView)}
        </main>

      </div>
    </div>
  );
};

// ── Pending-role screen (extracted for reuse) ──
export const NoPemissionsScreen = () => {
  const { user, signOut } = useAuth();
  return (
    <div className="min-h-screen flex flex-col items-center justify-center gap-4 text-center p-4"
      style={{ background: 'var(--surface-base)' }}>
      <ShieldAlert className="w-12 h-12 text-red-500" />
      <h2 className="text-xl font-bold" style={{ color: 'var(--text-primary)' }}>Sin Permisos</h2>
      <p style={{ color: 'var(--text-secondary)' }}>
        Tu cuenta ({user?.email}) ha iniciado sesión pero aún no tienes un rol asignado en la plataforma.
      </p>
      <button
        onClick={signOut}
        className="mt-4 btn btn-secondary"
      >
        Cerrar Sesión
      </button>
    </div>
  );
};
