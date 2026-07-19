import { useState, useEffect } from 'react';
import { formatCurrency, formatDate } from './utils/format';
import { MetricCard } from './components/MetricCard';
import { Charts } from './components/Charts';
import { SheetConnector } from './components/SheetConnector';
import { TransactionTable } from './components/TransactionTable';
import { PaymentCalendar } from './components/PaymentCalendar';
import { AiConfigDrawer } from './components/AiConfigDrawer';
import { WhatsappBroadcastModal } from './components/WhatsappBroadcastModal';
import { DiscountModal } from './components/admin/DiscountModal';
import { SuperadminPanel } from './components/admin/SuperadminPanel';
import { LoginScreen } from './components/auth/LoginScreen';
import { AppLayout, NoPemissionsScreen } from './components/layout/AppLayout';
import { TeamPanel } from './components/team/TeamPanel';
import { SettingsPanel } from './components/settings/SettingsPanel';
import { ApiDocs } from './components/docs/ApiDocs';
import { useAuth } from './contexts/AuthContext';
import { useTransactions } from './hooks/useTransactions';
import {
  Activity,
  RotateCcw,
  DollarSign,
  Settings,
  Link2,
  Loader2,
} from 'lucide-react';

import { Routes, Route, Navigate } from 'react-router-dom';
import { api } from './lib/axios';

export default function App() {
  const { user, loading: authLoading, isSuperadmin, isAdmin, isVisor, updateToken } = useAuth();
  const {
    transactions,
    dbLoading,
    availableHeaders,
    currentMapping,
    sourceName,
    filters,
    setFilters,
    filteredTxsForKPIs,
    stats,
    handleDataLoadedBySync,
    handleUpdatePhone,
    handleToggleStatus,
    handleRegisterPayment,
    handleUpdatePayment,
    handleDeletePayment,
    handleEditTransaction,
    handleDeleteTransaction,
    handleAddTransaction,
    handleUpdateClient,
    handleApplyDiscount,
    currentPage,
    setCurrentPage,
    totalPages,
  } = useTransactions();

  const [currentTime, setCurrentTime] = useState('');
  const [isAiOpen, setIsAiOpen] = useState(false);
  const [isWhatsappOpen, setIsWhatsappOpen] = useState(false);
  const [isDiscountModalOpen, setIsDiscountModalOpen] = useState(false);
  const [activeDetailsType, setActiveDetailsType] = useState<'emission' | 'ranking' | null>(null);
  
  // (La redirección automática para el superadmin sin negocio ahora se maneja en las rutas más abajo)

  useEffect(() => {
    const timer = setInterval(() => {
      const d = new Date();
      setCurrentTime(
        d.toLocaleTimeString('es-ES', {
          hour: '2-digit',
          minute: '2-digit',
          second: '2-digit',
        })
      );
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    const businessName = user?.business?.name;
    document.title = businessName ? `Amigable - ${businessName}` : 'Amigable Cobro';
  }, [user?.business?.name]);

  // ── Auth guards ──
  if (authLoading)
    return (
      <div
        className="min-h-screen flex items-center justify-center"
        style={{ background: 'var(--surface-base)', color: 'var(--text-muted)' }}
      >
        <div className="flex flex-col items-center gap-3">
          <Loader2 className="w-8 h-8 animate-spin text-indigo-600" />
          <span className="text-sm font-semibold text-slate-500">Cargando identidad segura...</span>
        </div>
      </div>
    );
    
  if (!user) {
    return (
      <Routes>
        <Route path="/docs" element={<ApiDocs />} />
        <Route path="/login" element={<LoginScreen />} />
        <Route path="*" element={<Navigate to="/login" replace />} />
      </Routes>
    );
  }

  // Si el usuario no tiene permisos válidos
  if (!isVisor && !isAdmin && !isSuperadmin) return <NoPemissionsScreen />;

  // CASO DE USO 1.1: Superadmin sin negocio asignado
  const isOrphanSuperadmin = isSuperadmin && !user.business_id;

  if (isOrphanSuperadmin) {
    return (
      <Routes>
        <Route path="/docs" element={<ApiDocs />} />
        <Route path="/login" element={<Navigate to="/admin/dashboard" replace />} />
        <Route path="/" element={<Navigate to="/admin/dashboard" replace />} />
        <Route path="/superadmin/*" element={<Navigate to="/admin/dashboard" replace />} />
        <Route path="/admin/*" element={<SuperadminPanel onClose={() => {}} />} />
        <Route path="*" element={<Navigate to="/admin/dashboard" replace />} />
      </Routes>
    );
  }

  // Flujo normal para usuarios con negocio
  const isImpersonating = isSuperadmin && user?.business_id !== null;

  const handleExitImpersonation = async () => {
    try {
      const response = await api.post('/superadmin/impersonate', { business_id: null });
      if (response.data?.data?.token) {
        await updateToken(response.data.data.token);
        window.location.href = '/admin/dashboard';
      }
    } catch (error) {
      console.error("Error exiting impersonation", error);
    }
  };

  return (
    <Routes>
      <Route path="/login" element={<Navigate to="/panel/dashboard" replace />} />
      <Route path="/" element={<Navigate to="/panel/dashboard" replace />} />
      
      {/* Docs */}
      <Route path="/docs" element={<ApiDocs />} />
      
      {/* Rutas de Superadmin */}
      <Route path="/admin/*" element={
        isSuperadmin ? <SuperadminPanel onClose={() => window.location.href = '/panel/dashboard'} /> : <Navigate to="/panel/dashboard" replace />
      } />

      {/* Legacy /superadmin redirect */}
      <Route path="/superadmin/*" element={<Navigate to="/admin/dashboard" replace />} />

      {/* Rutas principales del tenant */}
      <Route path="/panel/*" element={
        <>
          <AppLayout
            currentTime={currentTime}
            onOpenAi={() => setIsAiOpen(true)}
            onOpenWhatsapp={() => setIsWhatsappOpen(true)}
            onOpenSuperadmin={() => window.location.href = '/admin/dashboard'}
          >
        {(activeView) => (
          <div className="h-full relative">
            {/* --- IMPERSONATION BANNER --- */}
            {isImpersonating && (
              <div className="w-full bg-gradient-to-r from-orange-600 via-amber-500 to-orange-600 text-white px-4 py-3 flex items-center justify-center gap-4 shadow-lg z-40 relative border-b-2 border-orange-400">
                <div className="flex items-center gap-3">
                  <span className="flex items-center justify-center w-8 h-8 rounded-full bg-white/20 text-base font-bold shadow-inner" title="Impersonación activa">⚠</span>
                  <div className="flex flex-col">
                    <span className="text-[10px] font-semibold uppercase tracking-widest text-orange-100">Impersonación activa</span>
                    <span className="font-bold text-sm">
                      <span className="text-orange-50 font-normal">Negocio: </span>
                      <span className="bg-white/15 px-2 py-0.5 rounded font-black tracking-wide underline decoration-wavy underline-offset-2">
                        {user?.business?.name || `ID #${user?.business_id}`}
                      </span>
                    </span>
                  </div>
                </div>
                <button 
                  onClick={handleExitImpersonation}
                  className="bg-white/20 hover:bg-white/30 active:bg-white/40 px-4 py-1.5 rounded-lg text-xs font-bold transition-all border border-white/40 hover:border-white/60 shadow-sm hover:shadow-md cursor-pointer"
                >
                  Salir del negocio
                </button>
              </div>
            )}
            
            {/* ══════════════════════════════════════
                VISTA: DASHBOARD
                KPIs + Gráficos
            ══════════════════════════════════════ */}
            {activeView === 'dashboard' && (
              <div className="p-6 space-y-6">
                {/* Hero Banner */}
                <div
                  className="card relative overflow-hidden"
                  style={{
                    background:
                      'linear-gradient(135deg, var(--color-brand) 0%, #4338ca 100%)',
                    color: '#ffffff',
                    border: 'none',
                    boxShadow:
                      '0 10px 25px -5px rgba(99,102,241,0.4), 0 8px 10px -6px rgba(99,102,241,0.1)',
                  }}
                >
                  <div className="absolute -top-20 -right-20 w-80 h-80 bg-white/10 rounded-full blur-3xl pointer-events-none" />
                  <div className="absolute bottom-0 left-1/4 w-60 h-60 bg-[#06B6D4]/20 rounded-full blur-2xl pointer-events-none" />

                  <div className="relative z-10 flex flex-col lg:flex-row items-start lg:items-center justify-between gap-6">
                    <div className="space-y-3">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span
                          className="badge"
                          style={{
                            background: 'rgba(255,255,255,0.2)',
                            color: 'white',
                            borderColor: 'rgba(255,255,255,0.3)',
                          }}
                        >
                          Panel Inteligente
                        </span>
                        <span
                          className="badge badge-dot"
                          style={{
                            background: 'rgba(6,182,212,0.2)',
                            color: '#cffafe',
                            borderColor: 'rgba(6,182,212,0.4)',
                          }}
                        >
                          {stats.collectionRate.toFixed(1)}% Efectividad
                        </span>
                      </div>
                      <h2 className="text-2xl font-bold tracking-tight text-white">
                        Panel de Control de Clientes
                      </h2>
                      <p className="text-sm leading-relaxed text-indigo-100" style={{ maxWidth: '42rem' }}>
                        Administras{' '}
                        <strong className="text-white font-mono">
                          {transactions.length} registros
                        </strong>{' '}
                        de cuotas y servicios activos.
                      </p>
                    </div>

                    <div className="flex flex-wrap gap-3 lg:flex-col lg:items-end">
                      <div className="text-right">
                        <p className="text-mono-xs text-indigo-200">Total Recaudado</p>
                        <p
                          className="text-lg font-bold text-white"
                          style={{ fontFamily: 'var(--font-mono)' }}
                        >
                          {formatCurrency(stats.paidTotal)}
                        </p>
                      </div>
                    </div>
                  </div>
                </div>

                {/* KPI Metrics */}
                <section className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-5">
                  <MetricCard
                    id="kpi-total-sales"
                    title="Total Emitido"
                    value={stats.salesTotal}
                    type="total"
                    count={stats.salesCount}
                    subtext="Monto total en cuotas"
                    onShowDetails={() => setActiveDetailsType('emission')}
                  />
                  <MetricCard
                    id="kpi-paid-accounts"
                    title="Cuentas Pagadas"
                    value={stats.paidTotal}
                    type="paid"
                    count={stats.paidCount}
                    subtext={`${((stats.paidTotal / (stats.salesTotal || 1)) * 100).toFixed(0)}% del ingreso total`}
                  />
                  <MetricCard
                    id="kpi-debt-accounts"
                    title="Cuentas por Cobrar"
                    value={stats.receivableTotal}
                    type="receivable"
                    count={stats.receivableCount}
                    subtext={`${((stats.receivableTotal / (stats.salesTotal || 1)) * 100).toFixed(0)}% del ingreso total`}
                  />
                  <MetricCard
                    id="kpi-efficiency-rate"
                    title="Efectividad de Cobro"
                    value={stats.collectionRate}
                    type="percentage"
                    subtext="Porcentaje recaudado vs. facturado"
                  />
                </section>

                {/* Charts */}
                <section>
                  <Charts 
                    transactions={filteredTxsForKPIs} 
                    activeDetailsType={activeDetailsType}
                    setActiveDetailsType={setActiveDetailsType}
                  />
                </section>
              </div>
            )}

            {/* ══════════════════════════════════════
                VISTA: CALENDARIO
            ══════════════════════════════════════ */}
            {activeView === 'calendar' && (
              <div className="p-6">
                {/* Section header */}
                <div className="mb-6">
                  <h2
                    className="text-xl font-bold"
                    style={{ color: 'var(--text-primary)' }}
                  >
                    Calendario de Pagos
                  </h2>
                  <p className="text-sm mt-1" style={{ color: 'var(--text-muted)' }}>
                    Visualización de proyecciones y vencimientos en el tiempo.
                  </p>
                </div>
                <PaymentCalendar 
                  transactions={filteredTxsForKPIs} 
                  onRegisterPayment={handleRegisterPayment}
                  onToggleStatus={handleToggleStatus}
                />
              </div>
            )}

            {/* ══════════════════════════════════════
                VISTA: CUENTAS Y COBROS
            ══════════════════════════════════════ */}
            {activeView === 'accounts' && (
              <div className="p-6 space-y-4">
                {/* Active filters alert */}
                {(filters.startDate ||
                  filters.endDate ||
                  filters.searchTerm ||
                  filters.status !== 'todos') && (
                  <div className="alert alert-info animate-fade-in">
                    <Activity className="w-4 h-4 flex-shrink-0 mt-0.5" />
                    <div className="flex-1">
                      <span className="font-semibold">Filtros activos: </span>
                      {filters.searchTerm && (
                        <span>Búsqueda «{filters.searchTerm}»</span>
                      )}
                      {filters.status !== 'todos' && (
                        <span> · Estado: {filters.status}</span>
                      )}
                      {filters.startDate && (
                        <span> · Desde: {formatDate(filters.startDate)}</span>
                      )}
                      {filters.endDate && (
                        <span> · Hasta: {formatDate(filters.endDate)}</span>
                      )}
                    </div>
                    <button
                      onClick={() =>
                        setFilters({
                          startDate: '',
                          endDate: '',
                          status: 'todos',
                          searchTerm: '',
                        })
                      }
                      className="btn btn-sm"
                      style={{
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

                <TransactionTable
                  transactions={transactions}
                  loading={dbLoading}
                  onToggleStatus={handleToggleStatus}
                  onRegisterPayment={handleRegisterPayment}
                  onUpdatePayment={handleUpdatePayment}
                  onDeletePayment={handleDeletePayment}
                  onUpdateTransaction={handleEditTransaction}
                  onDeleteTransaction={handleDeleteTransaction}
                  onAddTransaction={handleAddTransaction}
                  onUpdateClient={handleUpdateClient}
                  filter={filters}
                  onFilterChange={setFilters}
                  isSuperadmin={isSuperadmin}
                  onShowDiscountModal={() => setIsDiscountModalOpen(true)}
                  currentPage={currentPage}
                  totalPages={totalPages}
                  onPageChange={setCurrentPage}
                />
              </div>
            )}

            {/* ══════════════════════════════════════
                VISTA: EQUIPO Y GESTORES
            ══════════════════════════════════════ */}
            {activeView === 'team' && (
              <TeamPanel />
            )}

            {/* ══════════════════════════════════════
                VISTA: SINCRONIZACIÓN
            ══════════════════════════════════════ */}
            {activeView === 'sync' && (
              <div className="p-6 space-y-6">
                {/* Section header */}
                <div>
                  <div className="flex items-center gap-3 mb-1">
                    <div
                      className="w-8 h-8 flex items-center justify-center rounded-lg"
                      style={{ background: 'var(--color-brand-light)' }}
                    >
                      <Link2
                        className="w-4 h-4"
                        style={{ color: 'var(--color-brand)' }}
                      />
                    </div>
                    <h2
                      className="text-xl font-bold"
                      style={{ color: 'var(--text-primary)' }}
                    >
                      Sincronización de Datos
                    </h2>
                  </div>
                  <p className="text-sm mt-1" style={{ color: 'var(--text-muted)' }}>
                    Conecta tus hojas de Google Sheets o carga archivos CSV para importar registros.
                  </p>
                </div>

                <div className="max-w-2xl space-y-5">
                  <SheetConnector
                    onDataLoaded={handleDataLoadedBySync}
                    currentMapping={currentMapping}
                    availableHeaders={availableHeaders}
                    activeSourceName={sourceName}
                  />


                </div>
              </div>
            )}

            {/* ══════════════════════════════════════
                VISTA: CONFIGURACIÓN
            ══════════════════════════════════════ */}
            {activeView === 'settings' && (
              <SettingsPanel />
            )}
          </div>
        )}
      </AppLayout>

      {/* ── Global Modals (always mounted, portal-style) ── */}
      <AiConfigDrawer
        isOpen={isAiOpen}
        onClose={() => setIsAiOpen(false)}
        transactions={transactions}
      />
      <WhatsappBroadcastModal
        isOpen={isWhatsappOpen}
        onClose={() => setIsWhatsappOpen(false)}
        transactions={transactions}
        onUpdatePhone={handleUpdatePhone}
      />
      <DiscountModal
        isOpen={isDiscountModalOpen}
        onClose={() => setIsDiscountModalOpen(false)}
        transactions={transactions}
        onApplyDiscount={handleApplyDiscount}
      />
        </>
      } />

      <Route path="*" element={<Navigate to="/panel/dashboard" replace />} />
    </Routes>
  );
}
