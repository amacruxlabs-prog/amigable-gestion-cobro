import { useState, useEffect } from 'react';
import { MetricCard } from './components/MetricCard';
import { Charts } from './components/Charts';
import { SheetConnector } from './components/SheetConnector';
import { TransactionTable } from './components/TransactionTable';
import { PaymentCalendar } from './components/PaymentCalendar';
import { Activity, RotateCcw, ShieldAlert, Clock, Sparkles, MessageSquare, LogOut, Shield, Moon, Sun } from 'lucide-react';
import { AiConfigDrawer } from './components/AiConfigDrawer';
import { WhatsappBroadcastModal } from './components/WhatsappBroadcastModal';
import { DiscountModal } from './components/admin/DiscountModal';
import { useAuth } from './contexts/AuthContext';
import { LoginScreen } from './components/auth/LoginScreen';
import { SuperadminPanel } from './components/admin/SuperadminPanel';
import { useTheme } from './hooks/useTheme';
import { useTransactions } from './hooks/useTransactions';

export default function App() {
  const { user, loading: authLoading, signOut, isSuperadmin, isAdmin, isVisor } = useAuth();
  const { isDarkMode, toggleTheme } = useTheme();
  const {
    transactions,
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
  } = useTransactions();

  const [currentTime, setCurrentTime] = useState('');
  const [isAiOpen, setIsAiOpen] = useState(false);
  const [isWhatsappOpen, setIsWhatsappOpen] = useState(false);
  const [isSuperadminOpen, setIsSuperadminOpen] = useState(false);
  const [isDiscountModalOpen, setIsDiscountModalOpen] = useState(false);

  useEffect(() => {
    const timer = setInterval(() => {
      const d = new Date();
      setCurrentTime(d.toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit', second: '2-digit' }));
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  if (authLoading) return <div className="min-h-screen flex items-center justify-center bg-slate-50 dark:bg-slate-950 dark:text-slate-400">Cargando identidad segura...</div>;
  if (!user) return <LoginScreen />;
  if (user && !isVisor && !isAdmin && !isSuperadmin) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-slate-50 dark:bg-slate-950 gap-4 text-center p-4">
        <ShieldAlert className="w-12 h-12 text-red-500" />
        <h2 className="text-xl font-bold dark:text-slate-200">Sin Permisos</h2>
        <p className="text-slate-500 dark:text-slate-400">Tu cuenta ({user.email}) ha iniciado sesión pero aún no tienes un rol asignado en la plataforma.</p>
        <button onClick={signOut} className="mt-4 px-4 py-2 bg-slate-200 hover:bg-slate-300 dark:bg-slate-800 dark:hover:bg-slate-700 dark:text-slate-200 rounded font-bold text-sm">Cerrar Sesión</button>
      </div>
    );
  }

  return (
    <div className="min-h-screen pb-16" style={{ background: 'var(--surface-base)', color: 'var(--text-primary)' }}>
      
      {/* ── Navigation Bar ── */}
      <header style={{
        background: 'var(--surface-card)',
        borderBottom: '1px solid var(--border-default)',
        boxShadow: 'var(--shadow-xs)',
      }} className="sticky top-0 z-50">
        {/* Top brand stripe */}
        <div className="h-0.5 w-full bg-gradient-to-r from-indigo-500 via-violet-500 to-sky-500" />
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-3 flex flex-col xl:flex-row xl:items-center xl:justify-between gap-3">

          {/* Brand */}
          <div className="flex items-center gap-3">
            <div
              className="w-9 h-9 flex items-center justify-center text-white flex-shrink-0"
              style={{
                background: 'linear-gradient(135deg, #6366f1, #7c3aed)',
                borderRadius: 'var(--radius-lg)',
                boxShadow: '0 2px 8px rgba(99,102,241,0.3)',
              }}
            >
              <Sparkles className="w-4.5 h-4.5" />
            </div>
            <div>
              <h1 className="text-sm font-bold tracking-tight" style={{ color: 'var(--text-primary)' }}>
                Mouna
              </h1>
              <div className="flex items-center gap-1.5">
                <span
                  className={`badge ${
                    isSuperadmin ? 'badge-purple' : isAdmin ? 'badge-info' : 'badge-slate'
                  }`}
                >
                  {isSuperadmin ? 'Superadmin' : isAdmin ? 'Admin' : 'Visor'}
                </span>
                <span className="text-mono-xs hidden sm:block">· {user.email}</span>
              </div>
            </div>
          </div>

          {/* Actions */}
          <div className="flex items-center flex-wrap gap-2">
            {currentTime && (
              <div className="btn btn-secondary gap-1.5 font-mono" style={{ letterSpacing: '0.02em' }}>
                <Clock className="w-3.5 h-3.5" style={{ color: 'var(--text-muted)' }} />
                <span style={{ color: 'var(--text-secondary)' }}>{currentTime}</span>
              </div>
            )}

            {isSuperadmin && (
              <button onClick={() => setIsSuperadminOpen(true)} className="btn" style={{
                background: 'linear-gradient(135deg, #f3e8ff, #ede9fe)',
                color: '#6b21a8',
                borderColor: 'rgba(139,92,246,0.25)',
              }}>
                <Shield className="w-3.5 h-3.5" />
                <span>Superadmin</span>
              </button>
            )}

            <button onClick={() => setIsAiOpen(true)} className="btn btn-primary">
              <Sparkles className="w-3.5 h-3.5 animate-pulse" />
              <span>Asistente IA</span>
            </button>

            {isAdmin && (
              <button onClick={() => setIsWhatsappOpen(true)} className="btn btn-success">
                <MessageSquare className="w-3.5 h-3.5" />
                <span>WhatsApp</span>
              </button>
            )}

            <button onClick={toggleTheme} className="btn btn-secondary btn-icon" title="Cambiar tema">
              {isDarkMode ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
            </button>

            <button onClick={signOut} className="btn btn-secondary">
              <LogOut className="w-3.5 h-3.5" />
              <span>Salir</span>
            </button>
          </div>
        </div>
      </header>

      {/* Main Body */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 mt-6 space-y-6">
        
        {/* ── Hero Banner ── */}
        <div className="card relative overflow-hidden">
          {/* Ambient orbs */}
          <div className="absolute -top-10 -right-10 w-64 h-64 bg-indigo-500/6 rounded-full blur-3xl pointer-events-none" />
          <div className="absolute bottom-0 left-1/3 w-40 h-40 bg-emerald-500/6 rounded-full blur-2xl pointer-events-none" />

          <div className="relative z-10 flex flex-col lg:flex-row items-start lg:items-center justify-between gap-6">
            <div className="space-y-3">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="badge badge-info badge-dot">Panel Inteligente</span>
                <span className="badge badge-success badge-dot">{stats.collectionRate.toFixed(1)}% Efectividad</span>
              </div>
              <h2 className="text-2xl font-bold tracking-tight" style={{ color: 'var(--text-primary)' }}>
                Panel de Control de Clientes
              </h2>
              <p className="text-sm leading-relaxed" style={{ color: 'var(--text-secondary)', maxWidth: '42rem' }}>
                Administras <strong style={{ color: 'var(--text-primary)', fontFamily: 'var(--font-mono)' }}>{transactions.length} registros</strong> de cuotas y servicios activos.
              </p>
            </div>

            {/* Quick stats inline */}
            <div className="flex flex-wrap gap-3 lg:flex-col lg:items-end">
              <div className="text-right">
                <p className="text-mono-xs">Total Recaudado</p>
                <p className="text-lg font-bold" style={{ color: 'var(--color-success)', fontFamily: 'var(--font-mono)' }}>
                  {new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', maximumFractionDigits: 0 }).format(stats.paidTotal)}
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* ── Active Filters Alert ── */}
        {(filters.startDate || filters.endDate || filters.searchTerm || filters.status !== 'todos') && (
          <div className="alert alert-info animate-fade-in">
            <Activity className="w-4 h-4 flex-shrink-0 mt-0.5" />
            <div className="flex-1">
              <span className="font-semibold">Filtros activos: </span>
              {filters.searchTerm && <span>Búsqueda «{filters.searchTerm}»</span>}
              {filters.status !== 'todos' && <span> · Estado: {filters.status}</span>}
              {filters.startDate && <span> · Desde: {filters.startDate}</span>}
              {filters.endDate && <span> · Hasta: {filters.endDate}</span>}
            </div>
            <button
              onClick={() => setFilters({ startDate: '', endDate: '', status: 'todos', searchTerm: '' })}
              className="btn btn-sm" style={{
                background: 'rgba(99,102,241,0.12)',
                color: 'var(--color-info-text)',
                borderColor: 'rgba(99,102,241,0.2)',
                flexShrink: 0,
              }}
            >
              Limpiar filtros
            </button>
          </div>
        )}

        <section className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
          <MetricCard id="kpi-total-sales" title="Total Emitido" value={stats.salesTotal} type="total" count={stats.salesCount} subtext="Monto total en cuotas" />
          <MetricCard id="kpi-paid-accounts" title="Cuentas Pagadas" value={stats.paidTotal} type="paid" count={stats.paidCount} subtext={`${((stats.paidTotal / (stats.salesTotal || 1)) * 100).toFixed(0)}% del ingreso total`} />
          <MetricCard id="kpi-debt-accounts" title="Cuentas por Cobrar" value={stats.receivableTotal} type="receivable" count={stats.receivableCount} subtext={`${((stats.receivableTotal / (stats.salesTotal || 1)) * 100).toFixed(0)}% del ingreso total`} />
          <MetricCard id="kpi-efficiency-rate" title="Efectividad de Cobro" value={stats.collectionRate} type="percentage" subtext="Porcentaje recaudado vs. facturado" />
        </section>

        <section className="grid grid-cols-1 xl:grid-cols-12 gap-6 items-start">
          <div className="xl:col-span-8 space-y-6">
            <Charts transactions={filteredTxsForKPIs} />
          </div>
          <div className="xl:col-span-4 space-y-4">
            <SheetConnector
              onDataLoaded={handleDataLoadedBySync}
              currentMapping={currentMapping}
              availableHeaders={availableHeaders}
              activeSourceName={sourceName}
            />
            {isAdmin && (
              <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm text-center space-y-3 dark:bg-slate-900 dark:border-slate-800">
                <p className="text-xs text-slate-500 dark:text-slate-400 font-semibold mb-2">Restauración y Demo</p>
                <button
                  onClick={handleResetToDemo}
                  className="w-full py-2 bg-red-50 hover:bg-red-100 border border-red-100 text-red-600 text-xs font-semibold rounded-lg cursor-pointer transition-colors flex items-center justify-center gap-1.5 dark:bg-red-950/20 dark:border-red-900/50 dark:text-red-400 dark:hover:bg-red-950/40"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                  <span>Restaurar Datos Fake (Demo) al Servidor</span>
                </button>
              </div>
            )}
          </div>
        </section>

        <section className="w-full">
          <PaymentCalendar transactions={filteredTxsForKPIs} />
        </section>

        <section className="w-full">
          <TransactionTable
            transactions={transactions}
            onToggleStatus={handleToggleStatus}
            onRegisterPayment={handleRegisterPayment}
            onDeleteTransaction={handleDeleteTransaction}
            onAddTransaction={handleAddTransaction}
            filter={filters}
            onFilterChange={setFilters}
            isSuperadmin={isSuperadmin}
            onShowDiscountModal={() => setIsDiscountModalOpen(true)}
          />
        </section>

      </main>

      <footer className="mt-20 border-t border-slate-200 dark:border-slate-800 py-8 text-center text-xs text-slate-400 max-w-7xl mx-auto px-4">
        <p className="font-semibold text-slate-500 dark:text-slate-400">Mouna • Plataforma de Gestión Segura de Cuotas</p>
        <p className="mt-1 font-mono text-[10px] text-slate-400 dark:text-slate-550">
          © {new Date().getFullYear()} • Modificaciones auditadas en tiempo real.
        </p>
      </footer>

      <AiConfigDrawer isOpen={isAiOpen} onClose={() => setIsAiOpen(false)} transactions={transactions} />
      <WhatsappBroadcastModal isOpen={isWhatsappOpen} onClose={() => setIsWhatsappOpen(false)} transactions={transactions} onUpdatePhone={handleUpdatePhone} />
      <DiscountModal isOpen={isDiscountModalOpen} onClose={() => setIsDiscountModalOpen(false)} transactions={transactions} onApplyDiscount={handleApplyDiscount} />
      {isSuperadmin && isSuperadminOpen && (
        <SuperadminPanel onClose={() => setIsSuperadminOpen(false)} />
      )}
    </div>
  );
}
