import React, { useState } from 'react';
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
  LogIn
} from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';

type TabType = 'dashboard' | 'businesses' | 'logs' | 'settings';

export const SuperadminPanel = ({ onClose }: { onClose: () => void }) => {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState<TabType>('dashboard');

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
            onClick={() => setActiveTab('dashboard')} 
          />
          <SidebarItem 
            icon={Building2} 
            label="Gestión de Negocios" 
            isActive={activeTab === 'businesses'} 
            onClick={() => setActiveTab('businesses')} 
          />
          <SidebarItem 
            icon={History} 
            label="Auditoría Global" 
            isActive={activeTab === 'logs'} 
            onClick={() => setActiveTab('logs')} 
          />
          <SidebarItem 
            icon={Settings} 
            label="Ajustes de Plataforma" 
            isActive={activeTab === 'settings'} 
            onClick={() => setActiveTab('settings')} 
          />
        </nav>

        <div className="p-4 border-t border-slate-800">
          <button 
            onClick={onClose}
            className="w-full flex items-center justify-center gap-2 py-2 px-4 rounded-lg bg-slate-800 hover:bg-slate-700 text-white font-medium transition-colors"
          >
            <X className="w-4 h-4" />
            Cerrar Panel
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

const DashboardView = () => (
  <div className="space-y-6">
    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
      <MetricCard title="Negocios Activos" value="124" subtitle="+12 este mes" icon={Building2} color="text-indigo-600" bg="bg-indigo-100" />
      <MetricCard title="Ingreso Mensual Recurrente" value="$4,500 USD" subtitle="Suscripciones SaaS" icon={DollarSign} color="text-emerald-600" bg="bg-emerald-100" />
      <MetricCard title="Volumen de Transacciones" value="15.2M" subtitle="Procesadas globales" icon={Activity} color="text-blue-600" bg="bg-blue-100" />
    </div>

    <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm h-80 flex flex-col">
      <h3 className="text-sm font-bold text-slate-800 mb-4">Crecimiento de Suscriptores (Mock)</h3>
      <div className="flex-1 bg-slate-50 rounded-lg border border-slate-100 flex items-center justify-center">
        <p className="text-slate-400 text-sm font-medium">[ Espacio para Gráfico de Líneas ]</p>
      </div>
    </div>
  </div>
);

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
  const mockBusinesses = [
    { id: '1', name: 'Gimnasio Fit Life', owner: 'Carlos P.', email: 'admin@fitlife.com', status: 'ACTIVE', users: 3 },
    { id: '2', name: 'Condominio Las Rosas', owner: 'Maria G.', email: 'maria@condominio.com', status: 'ACTIVE', users: 2 },
    { id: '3', name: 'Colegio San Juan', owner: 'Roberto M.', email: 'director@sanjuan.edu', status: 'SUSPENDED', users: 5 },
  ];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-bold text-slate-800">Listado de Inquilinos (Tenants)</h3>
        <button 
          onClick={() => setShowModal(true)}
          className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold px-4 py-2 rounded-lg text-sm transition-colors flex items-center gap-2"
        >
          <Plus className="w-4 h-4" />
          Crear Nuevo Negocio
        </button>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
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
            {mockBusinesses.map(b => (
              <tr key={b.id} className="hover:bg-slate-50 transition-colors">
                <td className="px-6 py-4 font-bold text-slate-800">{b.name}</td>
                <td className="px-6 py-4">
                  <p className="font-medium text-slate-700">{b.owner}</p>
                  <p className="text-xs text-slate-500">{b.email}</p>
                </td>
                <td className="px-6 py-4">
                  <span className={`px-2.5 py-1 rounded-full text-xs font-bold ${
                    b.status === 'ACTIVE' ? 'bg-emerald-100 text-emerald-700' : 'bg-red-100 text-red-700'
                  }`}>
                    {b.status === 'ACTIVE' ? 'Activo' : 'Suspendido'}
                  </span>
                </td>
                <td className="px-6 py-4 text-slate-600 font-mono text-xs">
                  <Users className="w-3.5 h-3.5 inline mr-1" /> {b.users}
                </td>
                <td className="px-6 py-4 text-right space-x-2">
                  <button className="p-1.5 text-slate-400 hover:text-indigo-600 bg-slate-100 hover:bg-indigo-50 rounded transition-colors" title="Entrar como este negocio">
                    <LogIn className="w-4 h-4" />
                  </button>
                  <button className="p-1.5 text-slate-400 hover:text-orange-600 bg-slate-100 hover:bg-orange-50 rounded transition-colors" title={b.status === 'ACTIVE' ? 'Suspender' : 'Activar'}>
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
            <form className="space-y-4" onSubmit={e => { e.preventDefault(); setShowModal(false); }}>
              <div><label className="block text-sm font-semibold mb-1">Nombre del Negocio</label><input type="text" className="w-full border p-2 rounded" /></div>
              <div><label className="block text-sm font-semibold mb-1">Propietario</label><input type="text" className="w-full border p-2 rounded" /></div>
              <div><label className="block text-sm font-semibold mb-1">Email / Usuario</label><input type="email" className="w-full border p-2 rounded" /></div>
              <div className="flex justify-end gap-2 mt-6">
                <button type="button" onClick={() => setShowModal(false)} className="px-4 py-2 font-bold text-slate-500 bg-slate-100 rounded hover:bg-slate-200">Cancelar</button>
                <button type="submit" className="px-4 py-2 font-bold text-white bg-indigo-600 rounded hover:bg-indigo-700">Guardar</button>
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

const SettingsView = () => (
  <div className="max-w-2xl bg-white rounded-xl border border-slate-200 shadow-sm p-6 space-y-6">
    <h3 className="text-lg font-bold text-slate-800 border-b pb-2">Configuración Maestra de la Plataforma</h3>
    
    <div className="space-y-4">
      <div>
        <label className="block text-sm font-semibold text-slate-700 mb-1">OpenAI API Key Global</label>
        <input type="password" placeholder="sk-..." className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 focus:ring-2 focus:ring-indigo-500 outline-none" />
        <p className="text-xs text-slate-500 mt-1">Se utilizará para todos los tenants que no tengan una key propia.</p>
      </div>

      <div>
        <label className="block text-sm font-semibold text-slate-700 mb-1">Costo Base de Suscripción (USD)</label>
        <input type="number" placeholder="29.99" className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 focus:ring-2 focus:ring-indigo-500 outline-none" />
      </div>
    </div>

    <div className="pt-4 border-t border-slate-100 flex justify-end">
      <button className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold px-6 py-2 rounded-lg text-sm transition-colors">
        Guardar Ajustes
      </button>
    </div>
  </div>
);
