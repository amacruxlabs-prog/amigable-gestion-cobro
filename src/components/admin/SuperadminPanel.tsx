import React, { useEffect, useState } from 'react';
import { useAuth, Role } from '../../contexts/AuthContext';
import { db, handleFirestoreError, OperationType, collection, query, orderBy, onSnapshot, setDoc, doc, deleteDoc } from '../../lib/firebase';
import { Shield, Save, Loader2, UserX, Clock, Activity, History, Search, X } from 'lucide-react';

interface RoleUser {
  email: string;
  role: Role;
  updatedAt: string;
  assignedBy: string;
}

interface AuditLog {
  id: string;
  action: string; // 'abono', 'nueva_cuenta', 'cambio_telefono', etc.
  entityId: string;
  adminEmail: string;
  changes: string;
  timestamp: string;
}

export const SuperadminPanel = ({ onClose }: { onClose: () => void }) => {
  const { isSuperadmin, user } = useAuth();
  const [activeTab, setActiveTab] = useState<'roles' | 'logs'>('roles');
  
  if (!isSuperadmin) return null;

  return (
    <div className="fixed inset-0 z-[100] flex">
      <div className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm" onClick={onClose} />
      <div className="w-full max-w-3xl ml-auto bg-white h-full shadow-2xl relative flex flex-col animate-slide-in-right">
        
        <header className="p-6 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-indigo-100 text-indigo-600 rounded-lg">
              <Shield className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-xl font-bold tracking-tight text-slate-800">Panel de Superadministrador</h2>
              <p className="text-xs text-slate-500 font-mono mt-0.5">{user?.email}</p>
            </div>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-slate-100 rounded-full transition-colors font-bold text-slate-400 hover:text-slate-600">
            ✕
          </button>
        </header>

        <div className="flex px-6 space-x-4 border-b border-slate-100 pt-4 bg-white">
          <button
            onClick={() => setActiveTab('roles')}
            className={`pb-3 px-2 text-sm font-semibold border-b-2 transition-colors ${activeTab === 'roles' ? 'border-indigo-600 text-indigo-700' : 'border-transparent text-slate-500 hover:text-slate-700'}`}
          >
            Gestión de Roles
          </button>
          <button
            onClick={() => setActiveTab('logs')}
            className={`pb-3 px-2 text-sm font-semibold border-b-2 transition-colors flex items-center gap-2 ${activeTab === 'logs' ? 'border-indigo-600 text-indigo-700' : 'border-transparent text-slate-500 hover:text-slate-700'}`}
          >
            Registro de Actividad <History className="w-3.5 h-3.5" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-6 bg-slate-50 pb-20">
          {activeTab === 'roles' ? <RoleManager /> : <AuditLogViewer />}
        </div>
      </div>
    </div>
  );
};

const RoleManager = () => {
  const [users, setUsers] = useState<RoleUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [newEmail, setNewEmail] = useState('');
  const [newRole, setNewRole] = useState<Role>('visor');
  const { user } = useAuth();
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    const q = query(collection(db, 'roles'));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const data: RoleUser[] = [];
      snapshot.forEach(d => {
        data.push({ email: d.id, ...d.data() } as RoleUser);
      });
      setUsers(data);
      setLoading(false);
    }, (error) => {
      handleFirestoreError(error, OperationType.GET, 'roles');
      setLoading(false);
    });
    return () => unsubscribe();
  }, []);

  const handleAssignRole = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newEmail || !newRole || !user?.email) return;
    setSaving(true);
    try {
      await setDoc(doc(db, 'roles', newEmail.toLowerCase().trim()), {
        role: newRole,
        assignedBy: user.email,
        updatedAt: new Date().toISOString()
      });
      setNewEmail('');
    } catch (error) {
      handleFirestoreError(error, OperationType.CREATE, `roles/${newEmail}`);
    }
    setSaving(false);
  };

  const handleUpdateRole = async (email: string, role: Role) => {
    if (!user?.email) return;
    try {
      await setDoc(doc(db, 'roles', email), {
        role: role,
        assignedBy: user.email,
        updatedAt: new Date().toISOString()
      });
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, `roles/${email}`);
    }
  };

  const handleRemoveRole = async (email: string) => {
    if (!window.confirm(`¿Seguro de revocar todos los accesos a ${email}?`)) return;
    try {
      await deleteDoc(doc(db, 'roles', email));
    } catch (error) {
        handleFirestoreError(error, OperationType.DELETE, `roles/${email}`);
    }
  };

  if (loading) return <div className="p-8 text-center"><Loader2 className="w-6 h-6 animate-spin mx-auto text-indigo-500" /></div>;

  return (
    <div className="space-y-6">
      <div className="bg-white p-5 rounded-2xl shadow-sm border border-slate-200">
        <h3 className="text-sm font-bold text-slate-800 mb-4">Otorgar Nuevo Rol</h3>
        <form onSubmit={handleAssignRole} className="flex gap-3 items-end">
          <div className="flex-1">
            <label className="block text-xs font-semibold text-slate-500 mb-1">Correo Electrónico</label>
            <input 
              type="email" 
              required
              value={newEmail} 
              onChange={e => setNewEmail(e.target.value)}
              className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-indigo-500 outline-none"
              placeholder="ejemplo@correo.com"
            />
          </div>
          <div>
            <label className="block text-xs font-semibold text-slate-500 mb-1">Rol</label>
            <select
              value={newRole || ''}
              onChange={e => setNewRole(e.target.value as Role)}
              className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-indigo-500 outline-none"
            >
              <option value="visor">Visor (Solo Lectura)</option>
              <option value="admin">Administrador (Puede editar info)</option>
              <option value="superadmin">Superadmin (Gestión de Roles)</option>
            </select>
          </div>
          <button type="submit" disabled={saving} className="bg-indigo-600 hover:bg-indigo-700 text-white font-semibold px-4 py-2 rounded-lg text-sm transition-colors flex items-center gap-2">
            {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
            Asignar
          </button>
        </form>
      </div>

      <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
        <table className="w-full text-left text-sm whitespace-nowrap">
          <thead className="bg-slate-50 text-slate-500 uppercase tracking-wider text-[10px] font-bold">
            <tr>
              <th className="px-5 py-3">Correo</th>
              <th className="px-5 py-3">Rol Asignado</th>
              <th className="px-5 py-3">Modificado</th>
              <th className="px-5 py-3 w-10"></th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {users.map(u => (
              <tr key={u.email} className="hover:bg-slate-50 transition-colors">
                <td className="px-5 py-3 font-medium text-slate-800">{u.email}</td>
                <td className="px-5 py-3">
                  <select
                    value={u.role || ''}
                    onChange={e => handleUpdateRole(u.email, e.target.value as Role)}
                    className="bg-transparent border border-slate-200 rounded px-2 py-1 text-xs outline-none focus:border-indigo-500"
                  >
                    <option value="visor">Visor</option>
                    <option value="admin">Administrador</option>
                    <option value="superadmin">Superadmin</option>
                  </select>
                </td>
                <td className="px-5 py-3 text-xs text-slate-500">
                  {new Date(u.updatedAt).toLocaleDateString()}
                  <p className="text-[10px]">por {u.assignedBy}</p>
                </td>
                <td className="px-5 py-3 text-right">
                  <button onClick={() => handleRemoveRole(u.email)} className="text-red-400 hover:text-red-600 transition-colors" title="Revocar Accesos">
                    <UserX className="w-4 h-4" />
                  </button>
                </td>
              </tr>
            ))}
            {users.length === 0 && (
              <tr>
                <td colSpan={4} className="px-5 py-8 text-center text-slate-500">No hay roles extras asignados.</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};

const AuditLogViewer = () => {
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [loading, setLoading] = useState(true);
  
  // Filters
  const [searchQuery, setSearchQuery] = useState('');
  const [dateFilter, setDateFilter] = useState('');

  useEffect(() => {
    const q = query(collection(db, 'audit_logs'), orderBy('timestamp', 'desc'));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const data: AuditLog[] = [];
      snapshot.forEach(d => {
        data.push({ id: d.id, ...d.data() } as AuditLog);
      });
      setLogs(data);
      setLoading(false);
    }, (error) => {
      handleFirestoreError(error, OperationType.GET, 'audit_logs');
      setLoading(false);
    });
    return () => unsubscribe();
  }, []);

  if (loading) return <div className="p-8 text-center"><Loader2 className="w-6 h-6 animate-spin mx-auto text-indigo-500" /></div>;

  const filteredLogs = logs.filter(log => {
      let matchesSearch = true;
      let matchesDate = true;

      if (searchQuery) {
          const lowerQ = searchQuery.toLowerCase();
          matchesSearch = log.adminEmail.toLowerCase().includes(lowerQ) || 
                          log.action.toLowerCase().includes(lowerQ) ||
                          log.changes.toLowerCase().includes(lowerQ) ||
                          log.entityId.toLowerCase().includes(lowerQ);
      }

      if (dateFilter) {
          // Extraemos YYYY-MM-DD para comparar de la forma local
          const logDate = new Date(log.timestamp).toISOString().split('T')[0];
          matchesDate = logDate === dateFilter;
      }

      return matchesSearch && matchesDate;
  });

  return (
    <div className="space-y-4">
      {/* Filters Panel */}
      <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex flex-col sm:flex-row gap-3 items-center">
         <div className="flex-1 relative w-full">
            <Search className="w-4 h-4 absolute left-3 top-2.5 text-slate-400" />
            <input 
               type="text"
               placeholder="Buscar por usuario (ej. correo@...), acción o ref..."
               value={searchQuery}
               onChange={e => setSearchQuery(e.target.value)}
               className="w-full bg-slate-50 border border-slate-200 rounded-lg pl-9 pr-3 py-2 text-sm focus:ring-2 focus:ring-indigo-500 outline-none transition-colors"
            />
         </div>
         <div className="flex gap-2 w-full sm:w-auto">
           <input 
              type="date"
              value={dateFilter}
              onChange={e => setDateFilter(e.target.value)}
              className="bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-indigo-500 outline-none text-slate-600 transition-colors flex-1 sm:flex-none"
              title="Filtrar por fecha"
           />
           {(searchQuery || dateFilter) && (
              <button 
                onClick={() => { setSearchQuery(''); setDateFilter(''); }}
                className="px-3 py-2 text-sm text-slate-500 hover:text-slate-800 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors font-medium border border-transparent flex items-center justify-center shrink-0"
                title="Limpiar filtros"
              >
                <X className="w-4 h-4" />
              </button>
           )}
         </div>
      </div>

      <div className="space-y-3">
        {filteredLogs.map((log) => {
          let ActionIcon = Activity;
          let color = 'bg-slate-100 text-slate-600';
          if (log.action === 'nueva_cuenta') {
            color = 'bg-emerald-100 text-emerald-600';
          } else if (log.action === 'abono' || log.action === 'descuento') {
            color = 'bg-blue-100 text-blue-600';
          } else if (log.action === 'cambio_telefono') {
            color = 'bg-orange-100 text-orange-600';
          } else if (log.action === 'cambio_estado') {
            color = 'bg-indigo-100 text-indigo-600';
          } else if (log.action === 'eliminar_cuenta') {
            color = 'bg-red-100 text-red-600';
          }

          return (
            <div key={log.id} className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex items-start gap-4 hover:border-slate-300 transition-colors">
              <div className={`p-2 rounded-lg shrink-0 mt-1 ${color}`}>
                <ActionIcon className="w-4 h-4" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 sm:gap-4">
                  <p className="text-sm font-bold text-slate-800 capitalize truncate">{log.action.replace(/_/g, ' ')}</p>
                  <div className="flex items-center gap-1.5 text-xs text-slate-500 whitespace-nowrap shrink-0 bg-slate-50 px-2 py-1 rounded-md border border-slate-100">
                    <Clock className="w-3.5 h-3.5" />
                    {new Date(log.timestamp).toLocaleString()}
                  </div>
                </div>
                <div className="flex items-center gap-2 mt-1 mb-2">
                  <span className="bg-slate-100 text-slate-600 text-[10px] font-mono px-2 py-0.5 rounded flex items-center gap-1">
                    <UserX className="w-3 h-3" /> {log.adminEmail}
                  </span>
                  <span className="bg-slate-100 text-slate-600 text-[10px] font-mono px-2 py-0.5 rounded truncate max-w-[150px]">
                    Ref: {log.entityId}
                  </span>
                </div>
                <div className="text-sm text-slate-600 leading-relaxed bg-slate-50 p-3 rounded-lg border border-slate-100 whitespace-pre-wrap font-mono text-xs">
                  {log.changes}
                </div>
              </div>
            </div>
          );
        })}
        {filteredLogs.length === 0 && (
          <div className="text-center p-12 bg-white rounded-2xl border border-dashed border-slate-300">
            <History className="w-8 h-8 mx-auto text-slate-300 mb-2" />
            <p className="text-slate-500 text-sm font-medium mb-1">No hay registros encontrados</p>
            {(searchQuery || dateFilter) ? (
               <p className="text-slate-400 text-xs">Prueba cambiando o limpiando los filtros actuales.</p>
            ) : (
               <p className="text-slate-400 text-xs">Aún no hay actividad auditable registrada en la base de datos.</p>
            )}
          </div>
        )}
      </div>
    </div>
  );
};
