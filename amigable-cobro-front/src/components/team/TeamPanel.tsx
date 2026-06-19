import React, { useState, useEffect } from 'react';
import {
  UserPlus, Mail, Shield, Eye, Trash2, Clock, CheckCircle2, AlertCircle,
  Activity, MoreVertical, Send, Users, Crown, ChevronDown, FileText,
  LogIn, Edit3, PlusCircle, DollarSign, Key, Power
} from 'lucide-react';
import { useUsers } from '../../hooks/useUsers';

type MemberRole = 'Admin Negocio' | 'Admin Local' | 'Lectura';

const MOCK_ACTIVITY = [
  {
    id: 'a1', userEmail: 'carlos.perez@empresa.com', userName: 'Carlos Pérez',
    action: 'Registró abono', detail: 'Abono de $120,000 COP a la cuenta de Juan Rodríguez',
    timestamp: 'Hoy, 15:42', icon: DollarSign, iconColor: '#10b981',
  },
  // We keep the mock activity for the analysis visualization.
];

const ROLE_CONFIG: Record<string, { label: string; icon: React.ElementType; badgeStyle: React.CSSProperties; description: string }> = {
  'Admin Negocio': {
    label: 'Propietario',
    icon: Crown,
    badgeStyle: {
      background: 'rgba(245,158,11,0.12)',
      color: '#d97706',
      borderColor: 'rgba(245,158,11,0.25)',
    },
    description: 'Control total de la plataforma.',
  },
  'Admin Local': {
    label: 'Administrador Local',
    icon: Shield,
    badgeStyle: {
      background: 'rgba(99,102,241,0.12)',
      color: '#4f46e5',
      borderColor: 'rgba(99,102,241,0.25)',
    },
    description: 'Puede registrar, editar y gestionar cobros y clientes.',
  },
  'Lectura': {
    label: 'Invitado (Visor)',
    icon: Eye,
    badgeStyle: {
      background: 'rgba(6,182,212,0.10)',
      color: '#0891b2',
      borderColor: 'rgba(6,182,212,0.25)',
    },
    description: 'Solo lectura, visualización de métricas y reportes.',
  },
};

function getInitials(email: string, name?: string): string {
  if (name) {
    return name.split(' ').map((n) => n[0]).slice(0, 2).join('').toUpperCase();
  }
  return email.substring(0, 2).toUpperCase();
}

export const TeamPanel: React.FC = () => {
  const { users, fetchUsers, createUser, toggleStatus, deleteUser, updatePassword, updateUser } = useUsers();
  
  useEffect(() => {
    fetchUsers();
  }, [fetchUsers]);

  const [activeTab, setActiveTab] = useState<'members' | 'activity'>('members');

  // Form state
  const [inviteName, setInviteName] = useState('');
  const [inviteEmail, setInviteEmail] = useState('');
  const [invitePassword, setInvitePassword] = useState('');
  const [inviteRole, setInviteRole] = useState<'Admin Local' | 'Lectura'>('Admin Local');
  const [inviteError, setInviteError] = useState('');
  const [inviteSent, setInviteSent] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const [openMenuId, setOpenMenuId] = useState<string | null>(null);

  // Modal Password
  const [passwordModalOpen, setPasswordModalOpen] = useState(false);
  const [passwordTargetId, setPasswordTargetId] = useState<string | null>(null);
  const [newPassword, setNewPassword] = useState('');

  const activeMembers = users.filter((m) => m.status === 'activo');
  const inactiveMembers = users.filter((m) => m.status === 'inactivo');

  const handleCreateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    setInviteError('');

    if (!inviteName.trim() || !inviteEmail.trim() || !invitePassword.trim()) {
      setInviteError('Todos los campos son obligatorios.');
      return;
    }
    
    if (invitePassword.length < 8) {
      setInviteError('La contraseña debe tener al menos 8 caracteres.');
      return;
    }

    setIsSubmitting(true);
    try {
      await createUser({
        name: inviteName,
        email: inviteEmail,
        password: invitePassword,
        role: inviteRole
      });
      setInviteName('');
      setInviteEmail('');
      setInvitePassword('');
      setInviteSent(true);
      setTimeout(() => setInviteSent(false), 3000);
    } catch (err: any) {
      setInviteError(err?.response?.data?.message || 'Ocurrió un error al crear el usuario.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleChangeRole = async (id: string, role: string) => {
    try {
      await updateUser(id, { role });
    } catch (err) {
      console.error(err);
    }
    setOpenMenuId(null);
  };

  const handleToggleStatus = async (id: string) => {
    try {
      await toggleStatus(id);
    } catch (err) {
      console.error(err);
    }
    setOpenMenuId(null);
  };

  const handleDeleteUser = async (id: string) => {
    if (!window.confirm("¿Estás seguro de eliminar permanentemente a este usuario?")) return;
    try {
      await deleteUser(id);
    } catch (err) {
      console.error(err);
    }
    setOpenMenuId(null);
  };

  const submitPasswordChange = async (e: React.FormEvent) => {
    e.preventDefault();
    if (newPassword.length < 8 || !passwordTargetId) return;
    try {
      await updatePassword(passwordTargetId, newPassword);
      setPasswordModalOpen(false);
      setNewPassword('');
      alert("Contraseña actualizada exitosamente.");
    } catch (err) {
      console.error(err);
      alert("Error al actualizar contraseña");
    }
  };

  return (
    <div className="p-6 space-y-6 max-w-5xl">
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <div className="flex items-center gap-3 mb-1">
            <div
              className="w-9 h-9 flex items-center justify-center rounded-xl flex-shrink-0"
              style={{ background: 'linear-gradient(135deg, #6366f1, #4f46e5)', boxShadow: '0 2px 10px rgba(99,102,241,0.35)' }}
            >
              <Users className="w-4.5 h-4.5 text-white" />
            </div>
            <h2 className="text-xl font-bold" style={{ color: 'var(--text-primary)' }}>
              Equipo y Gestores
            </h2>
          </div>
          <p className="text-sm ml-12" style={{ color: 'var(--text-muted)' }}>
            Crea y gestiona los accesos de tus colaboradores en la plataforma.
          </p>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <div className="badge badge-success gap-1.5 py-1.5 px-3">
            <CheckCircle2 className="w-3 h-3" />
            {activeMembers.length} activo{activeMembers.length !== 1 ? 's' : ''}
          </div>
          {inactiveMembers.length > 0 && (
            <div className="badge badge-warning gap-1.5 py-1.5 px-3">
              <Power className="w-3 h-3 text-amber-600" />
              {inactiveMembers.length} inactivo{inactiveMembers.length !== 1 ? 's' : ''}
            </div>
          )}
        </div>
      </div>

      <div className="card">
        <div className="flex items-center gap-2 mb-4">
          <UserPlus className="w-4 h-4" style={{ color: 'var(--color-brand)' }} />
          <h3 className="text-sm font-bold" style={{ color: 'var(--text-primary)' }}>
            Crear nuevo usuario
          </h3>
        </div>

        <form onSubmit={handleCreateUser} className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-12 gap-3 items-start">
            <div className="sm:col-span-3 space-y-1">
              <label className="font-semibold text-xs" style={{ color: 'var(--text-secondary)' }}>
                Nombre
              </label>
              <input
                type="text"
                placeholder="Juan Pérez"
                value={inviteName}
                onChange={(e) => { setInviteName(e.target.value); setInviteError(''); }}
              />
            </div>
            <div className="sm:col-span-3 space-y-1">
              <label className="font-semibold text-xs" style={{ color: 'var(--text-secondary)' }}>
                Correo electrónico
              </label>
              <div className="relative">
                <Mail className="absolute left-3 top-2.5 w-4 h-4" style={{ color: 'var(--text-muted)' }} />
                <input
                  type="email"
                  placeholder="gestor@empresa.com"
                  value={inviteEmail}
                  onChange={(e) => { setInviteEmail(e.target.value); setInviteError(''); }}
                  className="pl-9"
                />
              </div>
            </div>
            <div className="sm:col-span-3 space-y-1">
              <label className="font-semibold text-xs" style={{ color: 'var(--text-secondary)' }}>
                Contraseña Inicial
              </label>
              <div className="relative">
                <Key className="absolute left-3 top-2.5 w-4 h-4" style={{ color: 'var(--text-muted)' }} />
                <input
                  type="password"
                  placeholder="********"
                  value={invitePassword}
                  onChange={(e) => { setInvitePassword(e.target.value); setInviteError(''); }}
                  className="pl-9"
                />
              </div>
            </div>

            <div className="sm:col-span-3 space-y-1">
              <label className="font-semibold text-xs" style={{ color: 'var(--text-secondary)' }}>
                Rol asignado
              </label>
              <div className="relative">
                <ChevronDown className="absolute right-3 top-2.5 w-4 h-4 pointer-events-none" style={{ color: 'var(--text-muted)' }} />
                <select value={inviteRole} onChange={(e) => setInviteRole(e.target.value as any)}>
                  <option value="Admin Local">Admin Local (Operador)</option>
                  <option value="Lectura">Invitado (Solo lectura)</option>
                </select>
              </div>
            </div>

            <div className="sm:col-span-12 flex justify-end">
              <button type="submit" disabled={isSubmitting} className="btn btn-primary" style={{ height: '36px' }}>
                <Send className="w-3.5 h-3.5" />
                <span>Crear Usuario</span>
              </button>
            </div>
          </div>

          {inviteError && (
            <div className="alert alert-danger animate-fade-in py-2">
              <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
              <span>{inviteError}</span>
            </div>
          )}

          {inviteSent && (
            <div className="alert alert-success animate-fade-in py-2">
              <CheckCircle2 className="w-4 h-4 flex-shrink-0 mt-0.5" />
              <span>Usuario creado correctamente. Ya puede iniciar sesión.</span>
            </div>
          )}
        </form>
      </div>

      <div>
        <div className="flex border-b mb-5" style={{ borderColor: 'var(--border-default)' }}>
          {([
            { id: 'members', label: 'Miembros del equipo', icon: Users },
            { id: 'activity', label: 'Registro de actividad', icon: Activity },
          ] as const).map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className="flex items-center gap-2 px-4 py-2.5 text-sm font-semibold transition-all duration-150 cursor-pointer relative"
                style={{
                  color: isActive ? 'var(--color-brand)' : 'var(--text-muted)',
                  borderBottom: isActive ? '2px solid var(--color-brand)' : '2px solid transparent',
                  marginBottom: '-1px',
                }}
              >
                <Icon className="w-4 h-4" />
                {tab.label}
              </button>
            );
          })}
        </div>

        {activeTab === 'members' && (
          <div className="space-y-3">
            {users.length === 0 && (
              <div className="card text-center py-12" style={{ borderStyle: 'dashed' }}>
                <Users className="w-10 h-10 mx-auto mb-3" style={{ color: 'var(--text-muted)' }} />
                <p className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>
                  Cargando equipo o sin miembros
                </p>
              </div>
            )}

            {users.map((member) => {
              const roleName = member.roles?.[0]?.name || 'Admin Local';
              const roleConf = ROLE_CONFIG[roleName] || ROLE_CONFIG['Admin Local'];
              const RoleIcon = roleConf.icon;
              const initials = getInitials(member.email, member.name);
              const isMenuOpen = openMenuId === member.id;

              return (
                <div key={member.id} className="card" style={{ padding: '1rem 1.25rem', opacity: member.status === 'inactivo' ? 0.7 : 1 }}>
                  <div className="flex items-center gap-4 flex-wrap">
                    <div
                      className="w-10 h-10 rounded-xl flex items-center justify-center text-white text-sm font-bold flex-shrink-0"
                      style={{ background: member.avatarColor, boxShadow: `0 2px 8px ${member.avatarColor}40` }}
                    >
                      {initials}
                    </div>

                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <p className="text-sm font-bold truncate" style={{ color: 'var(--text-primary)' }}>
                          {member.name || member.email}
                        </p>
                        <p className="text-xs truncate" style={{ color: 'var(--text-muted)' }}>
                          {member.email}
                        </p>
                      </div>
                      <p className="text-[11px] mt-0.5" style={{ color: 'var(--text-muted)' }}>
                        Creado el: {new Date(member.created_at).toLocaleDateString()}
                      </p>
                    </div>

                    <div className="flex items-center gap-2 flex-shrink-0 flex-wrap">
                      <span className="badge gap-1.5" style={roleConf.badgeStyle}>
                        <RoleIcon className="w-3 h-3" />
                        {roleConf.label}
                      </span>

                      {member.status === 'activo' ? (
                        <span className="badge badge-success gap-1">
                          <span className="w-1.5 h-1.5 rounded-full inline-block bg-emerald-500" style={{ animation: 'badge-pulse 2s ease-in-out infinite' }} />
                          Activo
                        </span>
                      ) : (
                        <span className="badge badge-danger gap-1 bg-red-50 text-red-600 border-red-200">
                          <Power className="w-3 h-3" />
                          Inactivo
                        </span>
                      )}
                    </div>

                    {roleName !== 'Admin Negocio' && (
                      <div className="relative flex-shrink-0">
                        <button onClick={() => setOpenMenuId(isMenuOpen ? null : member.id)} className="btn btn-secondary btn-icon" title="Opciones">
                          <MoreVertical className="w-4 h-4" />
                        </button>

                        {isMenuOpen && (
                          <>
                            <div className="fixed inset-0 z-10" onClick={() => setOpenMenuId(null)} />
                            <div className="absolute right-0 top-full mt-1 z-20 rounded-xl shadow-lg border py-1 min-w-[200px] animate-fade-in" style={{ background: 'var(--surface-card)', borderColor: 'var(--border-default)' }}>
                              
                              <button onClick={() => { setPasswordTargetId(member.id); setPasswordModalOpen(true); setOpenMenuId(null); }} className="w-full flex items-center gap-2.5 px-3 py-2 text-xs font-semibold hover:bg-slate-50 cursor-pointer" style={{ color: 'var(--text-secondary)' }}>
                                <Key className="w-3.5 h-3.5 flex-shrink-0" />
                                Cambiar contraseña
                              </button>
                              
                              <div className="px-3 py-2 text-[10px] font-bold uppercase tracking-widest border-t border-b mt-1 mb-1" style={{ color: 'var(--text-muted)', borderColor: 'var(--border-default)' }}>
                                Cambiar rol
                              </div>
                              <button onClick={() => handleChangeRole(member.id, 'Admin Local')} className="w-full flex items-center gap-2.5 px-3 py-2 text-xs font-semibold transition-colors hover:bg-indigo-50 cursor-pointer" style={{ color: roleName === 'Admin Local' ? 'var(--color-brand)' : 'var(--text-secondary)' }}>
                                <Shield className="w-3.5 h-3.5 flex-shrink-0" /> Administrador Local
                                {roleName === 'Admin Local' && <CheckCircle2 className="w-3.5 h-3.5 ml-auto text-[#6366f1]" />}
                              </button>
                              <button onClick={() => handleChangeRole(member.id, 'Lectura')} className="w-full flex items-center gap-2.5 px-3 py-2 text-xs font-semibold transition-colors hover:bg-cyan-50 cursor-pointer" style={{ color: roleName === 'Lectura' ? '#0891b2' : 'var(--text-secondary)' }}>
                                <Eye className="w-3.5 h-3.5 flex-shrink-0" /> Invitado (Lectura)
                                {roleName === 'Lectura' && <CheckCircle2 className="w-3.5 h-3.5 ml-auto text-cyan-600" />}
                              </button>

                              <div className="border-t my-1" style={{ borderColor: 'var(--border-default)' }} />
                              
                              <button onClick={() => handleToggleStatus(member.id)} className="w-full flex items-center gap-2.5 px-3 py-2 text-xs font-semibold transition-colors hover:bg-amber-50 text-amber-600 cursor-pointer">
                                <Power className="w-3.5 h-3.5 flex-shrink-0" />
                                {member.status === 'activo' ? 'Desactivar acceso' : 'Activar acceso'}
                              </button>
                              
                              <button onClick={() => handleDeleteUser(member.id)} className="w-full flex items-center gap-2.5 px-3 py-2 text-xs font-semibold transition-colors hover:bg-red-50 text-red-500 cursor-pointer">
                                <Trash2 className="w-3.5 h-3.5 flex-shrink-0" />
                                Eliminar usuario permanentemente
                              </button>
                            </div>
                          </>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {activeTab === 'activity' && (
          <div className="space-y-2">
             <div className="card text-center py-8 opacity-70">
                <Activity className="w-8 h-8 mx-auto mb-2" style={{ color: 'var(--text-muted)' }} />
                <p className="text-sm">El registro de actividad estará disponible en futuras actualizaciones.</p>
             </div>
          </div>
        )}
      </div>

      {passwordModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="card w-full max-w-sm" style={{ background: 'var(--surface-card)' }}>
            <h3 className="text-lg font-bold mb-4">Cambiar Contraseña</h3>
            <form onSubmit={submitPasswordChange} className="space-y-4">
              <div className="space-y-1">
                <label className="text-sm font-semibold">Nueva contraseña</label>
                <input 
                  type="password" 
                  autoFocus 
                  value={newPassword} 
                  onChange={e => setNewPassword(e.target.value)} 
                  placeholder="Mínimo 8 caracteres"
                />
              </div>
              <div className="flex gap-2 justify-end mt-6">
                <button type="button" onClick={() => setPasswordModalOpen(false)} className="btn btn-secondary">Cancelar</button>
                <button type="submit" className="btn btn-primary">Guardar</button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
};
