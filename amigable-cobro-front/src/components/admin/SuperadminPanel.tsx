import React, { useState, useEffect } from 'react';
import { formatCurrency, formatDate, formatDateTime } from '../../utils/format';
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
  LogOut,
  Edit
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
          value={`${formatCurrency(kpis.mrr, true)} USD`} 
          subtitle="Estimación base SaaS" 
          icon={DollarSign} 
          color="text-emerald-600" 
          bg="bg-emerald-100" 
        />
        <MetricCard 
          title="Volumen Global Movilizado" 
          value={formatCurrency(kpis.global_volume)} 
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

  const [selectedBusinessDetails, setSelectedBusinessDetails] = useState<any | null>(null);
  const [editingBusiness, setEditingBusiness] = useState<any | null>(null);

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
          window.location.href = '/panel/dashboard';
        }
      }
    } catch (error) {
      toast('Error al cambiar de contexto', 'error');
    }
  };

  const handleViewBusiness = async (id: number) => {
    try {
      const response = await api.get(`/superadmin/businesses/${id}`);
      setSelectedBusinessDetails(response.data.data);
    } catch (error) {
      toast('Error al obtener detalles del negocio', 'error');
    }
  };

  const handleOpenEdit = (business: any) => {
    let bizWithEmail = { ...business };
    if (selectedBusinessDetails && selectedBusinessDetails.business.id === business.id && selectedBusinessDetails.admin_user) {
      bizWithEmail.admin_email = selectedBusinessDetails.admin_user.email;
    }
    setEditingBusiness(bizWithEmail);
  };

  const editFormik = useFormik({
    initialValues: {
      name: '',
      owner_name: '',
      status: 'ACTIVE',
      admin_email: '',
      admin_password: '',
    },
    enableReinitialize: true,
    validationSchema: Yup.object({
      name: Yup.string().min(3, 'Mínimo 3 caracteres').required('Requerido'),
      owner_name: Yup.string().min(3, 'Mínimo 3 caracteres').required('Requerido'),
      status: Yup.string().oneOf(['ACTIVE', 'suspended']).required('Requerido'),
      admin_email: Yup.string().email('Correo inválido').required('Requerido'),
      admin_password: Yup.string().min(8, 'Mínimo 8 caracteres').nullable(),
    }),
    onSubmit: async (values, { setSubmitting }) => {
      try {
        await api.put(`/superadmin/businesses/${editingBusiness.id}`, values);
        toast('Negocio y accesos actualizados exitosamente', 'success');
        setEditingBusiness(null);
        if (selectedBusinessDetails && selectedBusinessDetails.business.id === editingBusiness.id) {
          handleViewBusiness(editingBusiness.id);
        }
        fetchBusinesses();
      } catch (error: any) {
        toast(error.response?.data?.message || 'Error al actualizar negocio', 'error');
      } finally {
        setSubmitting(false);
      }
    },
  });

  useEffect(() => {
    if (editingBusiness) {
      editFormik.setValues({
        name: editingBusiness.name,
        owner_name: editingBusiness.owner_name,
        status: editingBusiness.status || 'ACTIVE',
        admin_email: editingBusiness.admin_email || '',
        admin_password: '',
      });
    }
  }, [editingBusiness]);

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
                <td 
                  onClick={() => handleViewBusiness(b.id)}
                  className="px-6 py-4 font-bold text-indigo-650 hover:text-indigo-800 hover:underline cursor-pointer"
                  title="Haz clic para ver el resumen y estadísticas de este negocio"
                >
                  {b.name}
                </td>
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
                    className="p-1.5 text-slate-400 hover:text-indigo-655 bg-slate-100 hover:bg-indigo-50/80 rounded transition-colors cursor-pointer" 
                    title="Entrar como este negocio"
                  >
                    <LogIn className="w-4 h-4" />
                  </button>
                  <button 
                    onClick={() => handleOpenEdit(b)}
                    className="p-1.5 text-slate-400 hover:text-blue-655 bg-slate-100 hover:bg-blue-50/80 rounded transition-colors cursor-pointer" 
                    title="Editar negocio de manera integral"
                  >
                    <Edit className="w-4 h-4" />
                  </button>
                  <button 
                    onClick={() => handleToggleStatus(b.id)}
                    className="p-1.5 text-slate-400 hover:text-orange-600 bg-slate-100 hover:bg-orange-50/80 rounded transition-colors cursor-pointer" 
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

      {/* Selected Business Summary & Details Modal */}
      {selectedBusinessDetails && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 backdrop-blur-xs p-4 overflow-y-auto">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-2xl overflow-hidden flex flex-col max-h-[90vh] animate-scale-up">
            
            {/* Modal Header */}
            <div className="bg-slate-50 p-5 border-b border-slate-200 flex justify-between items-center shrink-0">
              <div className="flex items-center gap-3">
                <div className="p-2.5 bg-indigo-50 text-indigo-650 rounded-lg">
                  <Building2 className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-800">
                    Ficha y Resumen del Negocio: {selectedBusinessDetails.business.name}
                  </h3>
                  <p className="text-xs text-slate-500 mt-0.5">ID del Tenant: {selectedBusinessDetails.business.id}</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setSelectedBusinessDetails(null)}
                className="text-slate-400 hover:text-slate-655 p-1.5 rounded-lg hover:bg-slate-100 transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-6 overflow-y-auto flex-1 space-y-6">
              
              {/* Basic Info Grid */}
              <div className="grid grid-cols-2 gap-4 text-xs">
                <div className="bg-slate-50 p-4 rounded-xl border border-slate-150">
                  <span className="text-[10px] uppercase font-bold text-slate-400 block mb-1">Nombre Comercial</span>
                  <span className="font-bold text-slate-800 text-sm">{selectedBusinessDetails.business.name}</span>
                </div>
                <div className="bg-slate-50 p-4 rounded-xl border border-slate-150">
                  <span className="text-[10px] uppercase font-bold text-slate-400 block mb-1">Administrador / Propietario</span>
                  <span className="font-bold text-slate-800 text-sm">{selectedBusinessDetails.business.owner_name}</span>
                </div>
                <div className="bg-slate-50 p-4 rounded-xl border border-slate-150">
                  <span className="text-[10px] uppercase font-bold text-slate-400 block mb-1">Estado de Operación</span>
                  <span className={`inline-block px-2.5 py-0.5 mt-1 rounded-full text-xs font-bold ${
                    selectedBusinessDetails.business.status === 'ACTIVE' ? 'bg-emerald-100 text-emerald-700' : 'bg-red-100 text-red-700'
                  }`}>
                    {selectedBusinessDetails.business.status === 'ACTIVE' ? 'Activo' : 'Suspendido'}
                  </span>
                </div>
                <div className="bg-slate-50 p-4 rounded-xl border border-slate-150">
                  <span className="text-[10px] uppercase font-bold text-slate-400 block mb-1">Fecha de Alta</span>
                  <span className="font-mono text-xs text-slate-600 block mt-1">
                    {formatDateTime(selectedBusinessDetails.business.created_at)}
                  </span>
                </div>
              </div>

              {/* Stats Metrics */}
              <div>
                <h4 className="text-xs font-bold text-slate-450 uppercase tracking-wider mb-3">Estadísticas Financieras y Clientes</h4>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-xs">
                  <div className="border border-slate-150 p-4 rounded-xl bg-white shadow-xs">
                    <span className="text-[10px] uppercase font-bold text-slate-400 block mb-1">Total Emitido</span>
                    <span className="font-mono text-base font-bold text-slate-850">
                      {formatCurrency(selectedBusinessDetails.stats.total_amount)}
                    </span>
                    <p className="text-[10px] text-slate-400 mt-1">{selectedBusinessDetails.stats.transactions_count} registros</p>
                  </div>
                  <div className="border border-slate-150 p-4 rounded-xl bg-white shadow-xs">
                    <span className="text-[10px] uppercase font-bold text-slate-400 block mb-1">Total Cobrado</span>
                    <span className="font-mono text-base font-bold text-emerald-600">
                      +{formatCurrency(selectedBusinessDetails.stats.total_paid)}
                    </span>
                    <p className="text-[10px] text-emerald-500 mt-1 font-semibold">
                      {selectedBusinessDetails.stats.total_amount > 0 
                        ? ((selectedBusinessDetails.stats.total_paid / selectedBusinessDetails.stats.total_amount) * 100).toFixed(0) 
                        : 0}% cobrado
                    </p>
                  </div>
                  <div className="border border-slate-150 p-4 rounded-xl bg-white shadow-xs">
                    <span className="text-[10px] uppercase font-bold text-slate-400 block mb-1">Saldo por Cobrar</span>
                    <span className={`font-mono text-base font-bold ${selectedBusinessDetails.stats.total_outstanding > 0 ? 'text-rose-600' : 'text-emerald-600'}`}>
                      {formatCurrency(selectedBusinessDetails.stats.total_outstanding)}
                    </span>
                    <p className="text-[10px] text-slate-400 mt-1">Deuda pendiente</p>
                  </div>
                  <div className="border border-slate-150 p-4 rounded-xl bg-white shadow-xs">
                    <span className="text-[10px] uppercase font-bold text-slate-400 block mb-1">Clientes Deudores</span>
                    <span className="font-mono text-base font-bold text-indigo-650">
                      {selectedBusinessDetails.stats.debtors_count} clientes
                    </span>
                    <p className="text-[10px] text-indigo-500 mt-1">Con saldo activo</p>
                  </div>
                </div>
              </div>

              {/* Actividad Reciente */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Deudas Recientes */}
                <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-xs">
                  <h4 className="text-xs font-bold text-slate-450 uppercase tracking-wider mb-3 flex justify-between items-center border-b pb-2">
                    <span>Deudas Recientes</span>
                    <span className="text-[9px] bg-slate-100 px-2 py-0.5 rounded text-slate-500 font-semibold font-mono">Últimas 5</span>
                  </h4>
                  {selectedBusinessDetails.recent_transactions.length === 0 ? (
                    <p className="text-xs text-slate-450 py-4 text-center">No hay deudas registradas.</p>
                  ) : (
                    <div className="space-y-2.5 max-h-[200px] overflow-y-auto pr-1 divide-y divide-slate-50">
                      {selectedBusinessDetails.recent_transactions.map((tx: any) => (
                        <div key={tx.id} className="flex justify-between items-center text-xs pt-2 first:pt-0">
                          <div className="flex flex-col">
                            <span className="font-bold text-slate-800">{tx.client_name}</span>
                            <span className="text-[9px] text-slate-400 font-mono">ID: #{tx.id} · {formatDate(tx.created_at)}</span>
                          </div>
                          <div className="text-right">
                            <span className="font-bold font-mono block text-slate-700">
                              {formatCurrency(tx.total_amount)}
                            </span>
                            <span className={`px-1.5 py-0.5 rounded text-[8px] font-bold uppercase ${
                              tx.status === 'PAID' ? 'bg-emerald-100 text-emerald-800' : 'bg-amber-100 text-amber-800'
                            }`}>
                              {tx.status === 'PAID' ? 'Pagado' : 'Pendiente'}
                            </span>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* Abonos Recientes */}
                <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-xs">
                  <h4 className="text-xs font-bold text-slate-455 uppercase tracking-wider mb-3 flex justify-between items-center border-b pb-2">
                    <span>Abonos Recientes</span>
                    <span className="text-[9px] bg-slate-100 px-2 py-0.5 rounded text-slate-500 font-semibold font-mono">Últimos 5</span>
                  </h4>
                  {selectedBusinessDetails.recent_payments.length === 0 ? (
                    <p className="text-xs text-slate-455 py-4 text-center">No hay abonos registrados.</p>
                  ) : (
                    <div className="space-y-2.5 max-h-[200px] overflow-y-auto pr-1 divide-y divide-slate-50">
                      {selectedBusinessDetails.recent_payments.map((p: any) => (
                        <div key={p.id} className="flex justify-between items-center text-xs pt-2 first:pt-0">
                          <div className="flex flex-col">
                            <span className="font-bold text-slate-800">{p.client_name}</span>
                            <span className="text-[9px] text-slate-400 font-mono">ID Pago: #{p.id} · ID Cuenta: #{p.transaction_id} · {formatDate(p.created_at)}</span>
                          </div>
                          <span className="font-bold font-mono text-emerald-600 text-sm">
                            +{formatCurrency(p.amount)}
                          </span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              {/* Users list */}
              <div>
                <h4 className="text-xs font-bold text-slate-450 uppercase tracking-wider mb-3">
                  Usuarios del Negocio ({selectedBusinessDetails.stats.users_count})
                </h4>
                {selectedBusinessDetails.users.length === 0 ? (
                  <p className="text-xs text-slate-400">No hay usuarios registrados para este negocio.</p>
                ) : (
                  <div className="border border-slate-200 rounded-xl overflow-hidden shadow-xs">
                    <table className="w-full text-left text-xs">
                      <thead className="bg-slate-50 text-slate-500 font-bold uppercase tracking-wider text-[10px] border-b border-slate-200">
                        <tr>
                          <th className="px-4 py-2.5">Nombre</th>
                          <th className="px-4 py-2.5">Email</th>
                          <th className="px-4 py-2.5">Miembro Desde</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {selectedBusinessDetails.users.map((u: any) => (
                          <tr key={u.id} className="hover:bg-slate-50">
                            <td className="px-4 py-2.5 font-bold text-slate-800">{u.name}</td>
                            <td className="px-4 py-2.5 text-slate-650 font-mono">{u.email}</td>
                            <td className="px-4 py-2.5 text-slate-500 font-mono">
                              {new Date(u.created_at).toLocaleDateString('es-ES')}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            </div>

            {/* Modal Footer */}
            <div className="bg-slate-50 p-4 border-t border-slate-200 flex justify-between shrink-0">
              <button
                type="button"
                onClick={() => handleOpenEdit(selectedBusinessDetails.business)}
                className="btn bg-indigo-50 hover:bg-indigo-100 text-indigo-650 font-bold text-xs px-4 py-2 rounded-lg cursor-pointer transition-colors"
              >
                Editar Datos
              </button>
              <button
                type="button"
                onClick={() => setSelectedBusinessDetails(null)}
                className="btn bg-white hover:bg-slate-50 text-slate-700 border border-slate-200 font-bold text-xs px-4 py-2 rounded-lg cursor-pointer transition-colors"
              >
                Cerrar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Edit Business Modal */}
      {editingBusiness && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-slate-900/40 backdrop-blur-xs p-4 overflow-y-auto">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-md p-6">
            <h3 className="text-lg font-bold text-slate-800 mb-4">Editar Negocio: {editingBusiness.name}</h3>
            
            <form className="space-y-4" onSubmit={editFormik.handleSubmit}>
              <div>
                <label className="block text-sm font-semibold mb-1">Nombre Comercial del Negocio</label>
                <input 
                  type="text" 
                  name="name" 
                  className="w-full border p-2 rounded focus:ring-2 focus:ring-indigo-500 outline-none" 
                  onChange={editFormik.handleChange} 
                  value={editFormik.values.name} 
                />
                {editFormik.touched.name && editFormik.errors.name ? <div className="text-red-500 text-xs mt-1">{editFormik.errors.name}</div> : null}
              </div>
              
              <div>
                <label className="block text-sm font-semibold mb-1">Propietario / Dueño principal</label>
                <input 
                  type="text" 
                  name="owner_name" 
                  className="w-full border p-2 rounded focus:ring-2 focus:ring-indigo-500 outline-none" 
                  onChange={editFormik.handleChange} 
                  value={editFormik.values.owner_name} 
                />
                {editFormik.touched.owner_name && editFormik.errors.owner_name ? <div className="text-red-500 text-xs mt-1">{editFormik.errors.owner_name}</div> : null}
              </div>

              <div>
                <label className="block text-sm font-semibold mb-1">Email del Administrador (Acceso)</label>
                <input 
                  type="email" 
                  name="admin_email" 
                  className="w-full border p-2 rounded focus:ring-2 focus:ring-indigo-500 outline-none" 
                  onChange={editFormik.handleChange} 
                  value={editFormik.values.admin_email} 
                />
                {editFormik.touched.admin_email && editFormik.errors.admin_email ? <div className="text-red-500 text-xs mt-1">{editFormik.errors.admin_email}</div> : null}
              </div>

              <div>
                <label className="block text-sm font-semibold mb-1">Nueva Contraseña del Admin (Dejar vacío para mantener actual)</label>
                <input 
                  type="password" 
                  name="admin_password" 
                  className="w-full border p-2 rounded focus:ring-2 focus:ring-indigo-500 outline-none" 
                  onChange={editFormik.handleChange} 
                  value={editFormik.values.admin_password} 
                  placeholder="••••••••"
                />
                {editFormik.touched.admin_password && editFormik.errors.admin_password ? <div className="text-red-500 text-xs mt-1">{editFormik.errors.admin_password}</div> : null}
              </div>

              <div>
                <label className="block text-sm font-semibold mb-1">Estado del Negocio</label>
                <select
                  name="status"
                  className="w-full border p-2 rounded focus:ring-2 focus:ring-indigo-500 outline-none bg-white"
                  onChange={editFormik.handleChange}
                  value={editFormik.values.status}
                >
                  <option value="ACTIVE">Activo</option>
                  <option value="suspended">Suspendido</option>
                </select>
                {editFormik.touched.status && editFormik.errors.status ? <div className="text-red-500 text-xs mt-1">{editFormik.errors.status}</div> : null}
              </div>

              <div className="flex justify-end gap-2 mt-6">
                <button 
                  type="button" 
                  onClick={() => setEditingBusiness(null)} 
                  className="px-4 py-2 font-bold text-slate-500 bg-slate-100 rounded hover:bg-slate-200 cursor-pointer"
                >
                  Cancelar
                </button>
                <button 
                  type="submit" 
                  disabled={editFormik.isSubmitting || !editFormik.isValid} 
                  className="px-4 py-2 font-bold text-white rounded disabled:opacity-50 cursor-pointer" 
                  style={{ background: 'var(--color-brand)' }}
                >
                  {editFormik.isSubmitting ? 'Guardando...' : 'Guardar Cambios'}
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
