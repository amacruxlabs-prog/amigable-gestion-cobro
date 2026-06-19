import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { 
  Shield, 
  BarChart3, 
  Building2, 
  History, 
  Settings, 
  X, 
  Users, 
  DollarSign,
  Activity,
  Plus,
  PlaySquare,
  PauseCircle,
  LogIn,
  LogOut
} from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { useFormik } from 'formik';
import * as Yup from 'yup';
import { useUI } from '../../contexts/UIContext';
import { api } from '../../lib/axios';
import { SettingsPanel } from '../settings/SettingsPanel';

type TabType = 'dashboard' | 'businesses' | 'logs' | 'settings';

export const SuperadminPanel = ({ onClose }: { onClose: () => void }) => {
  const { user, signOut: logout } = useAuth();
  const { toast } = useUI();
  
  const navigate = useNavigate();
  const location = useLocation();

  const pathSegment = location.pathname.split('/')[2];
  const isValidTab = (v: any): v is TabType => ['dashboard', 'businesses', 'logs', 'settings'].includes(v);
  const activeTab: TabType = isValidTab(pathSegment) ? pathSegment : 'dashboard';

  React.useEffect(() => {
    if (!isValidTab(pathSegment)) {
      navigate('/admin/dashboard', { replace: true });
    }
  }, [pathSegment, navigate]);

  const handleTabChange = (tab: TabType) => {
    navigate(`/admin/${tab}`);
  };

  return (
    <div className="fixed inset-0 z-[100] flex bg-slate-100 animate-fade-in">
      {/* Sidebar */}
      <aside className="w-64 bg-slate-900 text-slate-300 flex flex-col shadow-2xl">
        <div className="p-6 border-b border-slate-800 flex items-center gap-3">
          <div className="p-2 bg-indigo-500/20 text-indigo-400 rounded-lg">
            <Shield className="w-6 h-6" />
          </div>
          <div>
            <h2 className="text-lg font-bold text-white tracking-tight leading-tight">Super Admin</h2>
            <p className="text-[10px] text-slate-500 font-mono mt-0.5 truncate">{user?.email}</p>
          </div>
        </div>

        <nav className="flex-1 p-4 space-y-1">
          <SidebarItem 
            icon={BarChart3} 
            label="Dashboard General" 
            isActive={activeTab === 'dashboard'} 
            onClick={() => handleTabChange('dashboard')} 
          />
          <SidebarItem 
            icon={Building2} 
            label="Gestión de Negocios" 
            isActive={activeTab === 'businesses'} 
            onClick={() => handleTabChange('businesses')} 
          />
          <SidebarItem 
            icon={History} 
            label="Auditoría Global" 
            isActive={activeTab === 'logs'} 
            onClick={() => handleTabChange('logs')} 
          />
          <SidebarItem 
            icon={Settings} 
            label="Ajustes de Plataforma" 
            isActive={activeTab === 'settings'} 
            onClick={() => handleTabChange('settings')} 
          />
        </nav>

        <div className="p-4 border-t border-slate-800 space-y-2">
          {user?.business_id && (
            <button 
              onClick={onClose}
              className="w-full flex items-center justify-center gap-2 py-2 px-4 rounded-lg bg-slate-800 hover:bg-slate-700 text-white font-medium transition-colors"
            >
              <X className="w-4 h-4" />
              Cerrar Panel
            </button>
          )}
          <button 
            onClick={() => logout()}
            className="w-full flex items-center justify-center gap-2 py-2 px-4 rounded-lg bg-red-500/10 hover:bg-red-500/20 text-red-500 font-medium transition-colors"
          >
            <LogOut className="w-4 h-4" />
            Cerrar Sesión
          </button>
        </div>
      </aside>

      {/* Main Content Area */}
      <main className="flex-1 flex flex-col h-full overflow-hidden bg-slate-50">
        <header className="h-16 border-b border-slate-200 bg-white flex items-center px-8 shadow-sm">
          <h1 className="text-xl font-bold text-slate-800 capitalize">
            {activeTab === 'dashboard' && 'Métricas Globales (SaaS)'}
            {activeTab === 'businesses' && 'Negocios y Tenants'}
            {activeTab === 'logs' && 'Registro de Actividad'}
            {activeTab === 'settings' && 'Configuración Maestra'}
          </h1>
        </header>

        <div className="flex-1 overflow-y-auto p-8">
          {activeTab === 'dashboard' && <DashboardView />}
          {activeTab === 'businesses' && <BusinessesView />}
          {activeTab === 'logs' && <LogsView />}
          {activeTab === 'settings' && <SettingsView />}
        </div>
      </main>
    </div>
  );
};

const SidebarItem = ({ icon: Icon, label, isActive, onClick }: any) => (
  <button
    onClick={onClick}
    className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium transition-all duration-200 ${
      isActive 
        ? 'bg-indigo-600 text-white shadow-md shadow-indigo-900/20' 
        : 'hover:bg-slate-800 hover:text-white'
    }`}
  >
    <Icon className={`w-5 h-5 ${isActive ? 'text-white' : 'text-slate-400'}`} />
    {label}
  </button>
);

// --- Sub-Views (Maquetas) ---

const DashboardView = () => {
  const [kpis, setKpis] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchKpis = async () => {
      try {
        const response = await api.get('/superadmin/kpis');
        setKpis(response.data.data);
      } catch (error) {
        console.error("Error fetching KPIs:", error);
      } finally {
        setLoading(false);
      }
    };
    fetchKpis();
  }, []);

  if (loading || !kpis) {
    return <div className="text-slate-500 font-medium">Cargando métricas...</div>;
  }

  // Pre-calcular puntos para el gráfico de líneas básico
  const chartData = kpis.growth_chart || [];
  const maxCount = Math.max(...chartData.map((d: any) => d.count), 1);
  
  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <MetricCard 
          title="Negocios Activos" 
          value={kpis.active_businesses} 
          subtitle={`${kpis.suspended_businesses} suspendidos (Total: ${kpis.total_businesses})`} 
          icon={Building2} 
          color="text-indigo-600" 
          bg="bg-indigo-100" 
        />
        <MetricCard 
          title="Ingreso Mensual Recurrente" 
          value={`$${Number(kpis.mrr).toLocaleString('en-US', { minimumFractionDigits: 2 })} USD`} 
          subtitle="Estimación base SaaS" 
          icon={DollarSign} 
          color="text-emerald-600" 
          bg="bg-emerald-100" 
        />
        <MetricCard 
          title="Volumen Global Movilizado" 
          value={`$${Number(kpis.global_volume).toLocaleString('en-US')}`} 
          subtitle="Suma de total_amount en todos los tenants" 
          icon={Activity} 
          color="text-blue-600" 
          bg="bg-blue-100" 
        />
      </div>

      <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm h-80 flex flex-col">
        <h3 className="text-sm font-bold text-slate-800 mb-4">Nuevos Negocios por Mes</h3>
        <div className="flex-1 bg-slate-50 rounded-lg border border-slate-100 flex items-end p-4 gap-2 relative">
          {chartData.length === 0 ? (
            <div className="w-full h-full flex items-center justify-center text-slate-400 text-sm">No hay datos históricos</div>
          ) : (
            <>
              {/* Line graph SVG */}
              <svg viewBox="0 0 100 100" className="absolute inset-0 w-full h-full p-4 overflow-visible" preserveAspectRatio="none">
                <polyline
                  fill="none"
                  stroke="#6366f1"
                  strokeWidth="3"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  points={chartData.map((d: any, i: number) => {
                    const x = (i / Math.max(chartData.length - 1, 1)) * 100;
                    const y = 100 - (d.count / maxCount) * 100;
                    return `${x},${y}`;
                  }).join(' ')}
                />
              </svg>
              
              {/* Points & Labels */}
              {chartData.map((d: any, i: number) => {
                const heightPercent = (d.count / maxCount) * 100;
                return (
                  <div key={i} className="flex-1 flex flex-col items-center justify-end relative h-full group">
                    <div 
                      className="absolute bottom-0 w-full hover:bg-indigo-100/50 rounded-t-sm transition-colors" 
                      style={{ height: `${heightPercent}%` }}
                    >
                      <div className="absolute -top-3 left-1/2 -translate-x-1/2 w-3 h-3 bg-indigo-500 rounded-full border-2 border-white shadow-sm scale-0 group-hover:scale-100 transition-transform"></div>
                      <div className="absolute -top-10 left-1/2 -translate-x-1/2 bg-slate-800 text-white text-[10px] px-2 py-1 rounded shadow-lg opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap z-10 pointer-events-none">
                        {d.count} negocios
                      </div>
                    </div>
                    <span className="text-[10px] text-slate-400 mt-2 absolute -bottom-5 truncate w-full text-center">{d.month}</span>
                  </div>
                );
              })}
            </>
          )}
        </div>
      </div>
    </div>
  );
};

const MetricCard = ({ title, value, subtitle, icon: Icon, color, bg }: any) => (
  <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm flex items-start gap-4">
    <div className={`p-3 rounded-xl ${bg} ${color}`}>
      <Icon className="w-6 h-6" />
    </div>
    <div>
      <p className="text-sm font-semibold text-slate-500 mb-1">{title}</p>
      <h4 className="text-2xl font-bold text-slate-800 mb-1">{value}</h4>
      <p className="text-xs text-slate-400 font-medium">{subtitle}</p>
    </div>
  </div>
);

const BusinessesView = () => {
  const [showModal, setShowModal] = useState(false);
  const [businesses, setBusinesses] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const { toast } = useUI();
  const { updateToken, user } = useAuth();

  const fetchBusinesses = async () => {
    try {
      setLoading(true);
      const response = await api.get('/superadmin/businesses');
      setBusinesses(response.data.data || []);
    } catch (error) {
      toast('Error al cargar negocios', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchBusinesses();
  }, []);

  const handleToggleStatus = async (id: number) => {
    try {
      await api.put(`/superadmin/businesses/${id}/toggle-status`);
      toast('Estado actualizado', 'success');
      fetchBusinesses();
    } catch (error) {
      toast('Error al actualizar estado', 'error');
    }
  };

  const handleImpersonate = async (id: number | null) => {
    try {
      const response = await api.post('/superadmin/impersonate', { business_id: id });
      if (response.data?.data?.token) {
        await updateToken(response.data.data.token);
        toast(id ? 'Has ingresado al negocio' : 'Has vuelto al panel global', 'success');
        if (id) {
          // Redirigimos automáticamente al panel del inquilino
          window.location.href = '/panel/dashboard';
        }
      }
    } catch (error) {
      toast('Error al cambiar de contexto', 'error');
    }
  };

  const formik = useFormik({
    initialValues: {
      name: '',
      owner_name: '',
      assign_to_me: false,
      admin_email: '',
      admin_password: '',
    },
    validationSchema: Yup.object({
      name: Yup.string().min(3, 'Mínimo 3 caracteres').required('Requerido'),
      owner_name: Yup.string().min(3, 'Mínimo 3 caracteres').required('Requerido'),
      assign_to_me: Yup.boolean(),
      admin_email: Yup.string().when('assign_to_me', {
        is: false,
        then: () => Yup.string().email('Correo inválido').required('Requerido'),
        otherwise: () => Yup.string().notRequired(),
      }),
      admin_password: Yup.string().when('assign_to_me', {
        is: false,
        then: () => Yup.string().min(8, 'Mínimo 8 caracteres').required('Requerido'),
        otherwise: () => Yup.string().notRequired(),
      }),
    }),
    onSubmit: async (values, { setSubmitting, resetForm }) => {
      try {
        await api.post('/superadmin/businesses', values);
        toast('Negocio creado exitosamente', 'success');
        setShowModal(false);
        resetForm();
        fetchBusinesses();
      } catch (error: any) {
        if (error.response?.status === 422) {
          const backendErrors = error.response.data.errors;
          if (backendErrors?.admin_email) {
            formik.setFieldError('admin_email', backendErrors.admin_email[0]);
          }
        } else {
          toast(error.response?.data?.message || 'Error al crear negocio', 'error');
        }
      } finally {
        setSubmitting(false);
      }
    },
  });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-bold text-slate-800">Listado de Inquilinos (Tenants)</h3>
        <button 
          onClick={() => setShowModal(true)}
          className="btn btn-primary flex items-center gap-2"
          style={{ background: 'var(--color-brand)', color: 'white', padding: '0.5rem 1rem', borderRadius: '0.5rem', fontWeight: 'bold' }}
        >
          <Plus className="w-4 h-4" />
          Crear Nuevo Negocio
        </button>
      </div>

      <div className="card overflow-hidden">
        <table className="w-full text-left text-sm">
          <thead className="bg-slate-50 text-slate-500 uppercase tracking-wider text-[10px] font-bold border-b border-slate-200">
            <tr>
              <th className="px-6 py-4">Negocio</th>
              <th className="px-6 py-4">Propietario / Email</th>
              <th className="px-6 py-4">Estado</th>
              <th className="px-6 py-4">Usuarios</th>
              <th className="px-6 py-4 text-right">Acciones</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {businesses.length === 0 ? (
              <tr>
                <td colSpan={5} className="px-6 py-4 text-center text-slate-500">No hay negocios registrados.</td>
              </tr>
            ) : null}
            {businesses.map(b => (
              <tr key={b.id} className="hover:bg-slate-50 transition-colors">
                <td className="px-6 py-4 font-bold text-slate-800">{b.name}</td>
                <td className="px-6 py-4">
                  <p className="font-medium text-slate-700">{b.owner_name}</p>
                  <p className="text-xs text-slate-500">ID: {b.id}</p>
                </td>
                <td className="px-6 py-4">
                  <span className={`px-2.5 py-1 rounded-full text-xs font-bold ${
                    b.status === 'ACTIVE' ? 'bg-emerald-100 text-emerald-700' : 'bg-red-100 text-red-700'
                  }`}>
                    {b.status === 'ACTIVE' ? 'Activo' : 'Suspendido'}
                  </span>
                </td>
                <td className="px-6 py-4 text-slate-600 font-mono text-xs">
                  <Users className="w-3.5 h-3.5 inline mr-1" /> N/A
                </td>
                <td className="px-6 py-4 text-right space-x-2">
                  <button 
                    onClick={() => handleImpersonate(b.id)}
                    className="p-1.5 text-slate-400 hover:text-indigo-600 bg-slate-100 hover:bg-indigo-50 rounded transition-colors" 
                    title="Entrar como este negocio"
                  >
                    <LogIn className="w-4 h-4" />
                  </button>
                  <button 
                    onClick={() => handleToggleStatus(b.id)}
                    className="p-1.5 text-slate-400 hover:text-orange-600 bg-slate-100 hover:bg-orange-50 rounded transition-colors" 
                    title={b.status === 'ACTIVE' ? 'Suspender' : 'Activar'}
                  >
                    {b.status === 'ACTIVE' ? <PauseCircle className="w-4 h-4" /> : <PlaySquare className="w-4 h-4" />}
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 backdrop-blur-sm">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-md p-6">
            <h3 className="text-lg font-bold text-slate-800 mb-4">Registrar Nuevo Negocio</h3>
            <form className="space-y-4" onSubmit={formik.handleSubmit}>
              <div>
                <label className="block text-sm font-semibold mb-1">Nombre del Negocio</label>
                <input 
                  type="text" 
                  name="name" 
                  className="w-full border p-2 rounded focus:ring-2 focus:ring-indigo-500" 
                  onChange={formik.handleChange} 
                  value={formik.values.name} 
                />
                {formik.touched.name && formik.errors.name ? <div className="text-red-500 text-xs mt-1">{formik.errors.name}</div> : null}
              </div>
              <div>
                <label className="block text-sm font-semibold mb-1">Propietario</label>
                <input 
                  type="text" 
                  name="owner_name" 
                  className="w-full border p-2 rounded focus:ring-2 focus:ring-indigo-500" 
                  onChange={formik.handleChange} 
                  value={formik.values.owner_name} 
                />
                {formik.touched.owner_name && formik.errors.owner_name ? <div className="text-red-500 text-xs mt-1">{formik.errors.owner_name}</div> : null}
              </div>
              <div>
                <label className="flex items-center gap-2 mb-4">
                  <input 
                    type="checkbox" 
                    name="assign_to_me"
                    onChange={formik.handleChange}
                    checked={formik.values.assign_to_me}
                    className="rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
                  />
                  <span className="text-sm font-semibold text-slate-700">Asignarme a mí mismo como Dueño (No crear otro usuario)</span>
                </label>
              </div>
              
              {!formik.values.assign_to_me && (
                <>
                  <div>
                    <label className="block text-sm font-semibold mb-1">Email (Usuario Admin)</label>
                    <input 
                      type="email" 
                      name="admin_email" 
                      className="w-full border p-2 rounded focus:ring-2 focus:ring-indigo-500" 
                      onChange={formik.handleChange} 
                      value={formik.values.admin_email} 
                    />
                    {formik.touched.admin_email && formik.errors.admin_email ? <div className="text-red-500 text-xs mt-1">{formik.errors.admin_email}</div> : null}
                  </div>
                  <div>
                    <label className="block text-sm font-semibold mb-1">Contraseña Inicial</label>
                    <input 
                      type="password" 
                      name="admin_password" 
                      className="w-full border p-2 rounded focus:ring-2 focus:ring-indigo-500" 
                      onChange={formik.handleChange} 
                      value={formik.values.admin_password} 
                    />
                    {formik.touched.admin_password && formik.errors.admin_password ? <div className="text-red-500 text-xs mt-1">{formik.errors.admin_password}</div> : null}
                  </div>
                </>
              )}
              <div className="flex justify-end gap-2 mt-6">
                <button type="button" onClick={() => setShowModal(false)} className="px-4 py-2 font-bold text-slate-500 bg-slate-100 rounded hover:bg-slate-200">Cancelar</button>
                <button type="submit" disabled={formik.isSubmitting || !formik.isValid} className="px-4 py-2 font-bold text-white rounded disabled:opacity-50" style={{ background: 'var(--color-brand)' }}>
                  {formik.isSubmitting ? 'Guardando...' : 'Guardar Negocio'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

const LogsView = () => (
  <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-8 text-center text-slate-500">
    <History className="w-12 h-12 mx-auto mb-3 text-slate-300" />
    <h3 className="text-lg font-bold text-slate-700">Auditoría Global (Maqueta)</h3>
    <p className="text-sm mt-1">Aquí se mostrará el registro de actividad de toda la plataforma.</p>
  </div>
);

const SettingsView = () => {
  const { toast } = useUI();
  const [loading, setLoading] = useState(true);

  const formik = useFormik({
    initialValues: {
      openai_global_key: '',
      base_subscription_cost: 29.99,
    },
    onSubmit: async (values, { setSubmitting }) => {
      try {
        await api.put('/superadmin/settings', values);
        toast('Ajustes globales guardados exitosamente', 'success');
      } catch (error) {
        toast('Error al guardar ajustes', 'error');
      } finally {
        setSubmitting(false);
      }
    },
  });

  useEffect(() => {
    const fetchSettings = async () => {
      try {
        const response = await api.get('/superadmin/settings');
        if (response.data?.data) {
          formik.setValues({
            openai_global_key: response.data.data.openai_global_key || '',
            base_subscription_cost: response.data.data.base_subscription_cost || 29.99,
          });
        }
      } catch (error) {
        toast('Error al cargar ajustes globales', 'error');
      } finally {
        setLoading(false);
      }
    };
    fetchSettings();
  }, []);

  if (loading) return <div className="text-slate-500 font-medium">Cargando ajustes...</div>;

  return (
    <div className="-mx-8 -my-8 h-[calc(100%+4rem)] bg-slate-50">
      <SettingsPanel 
        apiPath="/superadmin/settings" 
        billingContent={
          <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-6 space-y-6">
            <h3 className="text-lg font-bold text-slate-800 border-b pb-2">Facturación Global (SaaS)</h3>
            
            <form onSubmit={formik.handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-1">Costo Base de Suscripción (USD)</label>
                <input 
                  type="number" 
                  step="0.01"
                  name="base_subscription_cost"
                  value={formik.values.base_subscription_cost}
                  onChange={formik.handleChange}
                  placeholder="29.99" 
                  className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 focus:ring-2 focus:ring-indigo-500 outline-none" 
                />
                <p className="text-xs text-slate-500 mt-1">Este es el costo base que pagarán los inquilinos (Tenants) mensualmente.</p>
              </div>

              <div className="pt-4 border-t border-slate-100 flex justify-end">
                <button 
                  type="submit"
                  disabled={formik.isSubmitting}
                  className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold px-6 py-2 rounded-lg text-sm transition-colors disabled:opacity-50"
                >
                  {formik.isSubmitting ? 'Guardando...' : 'Guardar Ajustes Básicos'}
                </button>
              </div>
            </form>
          </div>
        }
      />
    </div>
  );
};
