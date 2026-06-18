import React, { useState } from 'react';
import {
  UserPlus,
  Mail,
  Shield,
  Eye,
  Trash2,
  Clock,
  CheckCircle2,
  AlertCircle,
  Activity,
  MoreVertical,
  Send,
  Users,
  Crown,
  X,
  ChevronDown,
  FileText,
  LogIn,
  Edit3,
  PlusCircle,
  DollarSign,
} from 'lucide-react';

// ── Types ──────────────────────────────────────────────────────────
type MemberRole = 'admin' | 'visor';
type MemberStatus = 'activo' | 'pendiente';

interface TeamMember {
  id: string;
  email: string;
  name?: string;
  role: MemberRole;
  status: MemberStatus;
  invitedAt: string;
  lastActivity?: string;
  lastAction?: string;
  avatarColor: string;
}

interface ActivityLog {
  id: string;
  userEmail: string;
  userName?: string;
  action: string;
  detail: string;
  timestamp: string;
  icon: React.ElementType;
  iconColor: string;
}

// ── Mock data ──────────────────────────────────────────────────────
const INITIAL_MEMBERS: TeamMember[] = [
  {
    id: '1',
    email: 'carlos.perez@empresa.com',
    name: 'Carlos Pérez',
    role: 'admin',
    status: 'activo',
    invitedAt: '2026-06-01',
    lastActivity: 'hace 2 horas',
    lastAction: 'Registró abono de $120,000 a Juan Rodríguez',
    avatarColor: '#6366f1',
  },
  {
    id: '2',
    email: 'maria.garcia@empresa.com',
    name: 'María García',
    role: 'visor',
    status: 'activo',
    invitedAt: '2026-06-05',
    lastActivity: 'hace 1 día',
    lastAction: 'Consultó reporte de cuentas por cobrar',
    avatarColor: '#06b6d4',
  },
  {
    id: '3',
    email: 'roberto.m@empresa.com',
    name: 'Roberto Martínez',
    role: 'admin',
    status: 'pendiente',
    invitedAt: '2026-06-17',
    lastActivity: undefined,
    lastAction: undefined,
    avatarColor: '#f59e0b',
  },
  {
    id: '4',
    email: 'ana.lopez@empresa.com',
    role: 'visor',
    status: 'pendiente',
    invitedAt: '2026-06-18',
    lastActivity: undefined,
    lastAction: undefined,
    avatarColor: '#10b981',
  },
];

const MOCK_ACTIVITY: ActivityLog[] = [
  {
    id: 'a1',
    userEmail: 'carlos.perez@empresa.com',
    userName: 'Carlos Pérez',
    action: 'Registró abono',
    detail: 'Abono de $120,000 COP a la cuenta de Juan Rodríguez',
    timestamp: 'Hoy, 15:42',
    icon: DollarSign,
    iconColor: '#10b981',
  },
  {
    id: 'a2',
    userEmail: 'carlos.perez@empresa.com',
    userName: 'Carlos Pérez',
    action: 'Nueva deuda creada',
    detail: 'Deuda de $350,000 COP registrada para Pedro Sánchez',
    timestamp: 'Hoy, 11:15',
    icon: PlusCircle,
    iconColor: '#6366f1',
  },
  {
    id: 'a3',
    userEmail: 'maria.garcia@empresa.com',
    userName: 'María García',
    action: 'Exportó reporte',
    detail: 'Exportó reporte mensual de cuentas por cobrar (Junio 2026)',
    timestamp: 'Ayer, 17:30',
    icon: FileText,
    iconColor: '#06b6d4',
  },
  {
    id: 'a4',
    userEmail: 'carlos.perez@empresa.com',
    userName: 'Carlos Pérez',
    action: 'Cambió estado',
    detail: 'Marcó cuenta de Luisa Torres como "Pagado"',
    timestamp: 'Ayer, 14:05',
    icon: CheckCircle2,
    iconColor: '#10b981',
  },
  {
    id: 'a5',
    userEmail: 'maria.garcia@empresa.com',
    userName: 'María García',
    action: 'Inició sesión',
    detail: 'Acceso desde IP 190.168.1.42 — Chrome / Windows',
    timestamp: 'Ayer, 08:52',
    icon: LogIn,
    iconColor: '#f59e0b',
  },
  {
    id: 'a6',
    userEmail: 'carlos.perez@empresa.com',
    userName: 'Carlos Pérez',
    action: 'Editó deuda',
    detail: 'Actualizó monto de deuda de Ana Mendoza a $200,000 COP',
    timestamp: '17 Jun, 09:30',
    icon: Edit3,
    iconColor: '#8b5cf6',
  },
];

const ROLE_CONFIG: Record<MemberRole, { label: string; icon: React.ElementType; badgeStyle: React.CSSProperties; description: string }> = {
  admin: {
    label: 'Administrador',
    icon: Shield,
    badgeStyle: {
      background: 'rgba(99,102,241,0.12)',
      color: '#4f46e5',
      borderColor: 'rgba(99,102,241,0.25)',
    },
    description: 'Puede registrar, editar y gestionar cobros y clientes.',
  },
  visor: {
    label: 'Visor',
    icon: Eye,
    badgeStyle: {
      background: 'rgba(6,182,212,0.10)',
      color: '#0891b2',
      borderColor: 'rgba(6,182,212,0.25)',
    },
    description: 'Solo puede ver registros y reportes, sin modificar datos.',
  },
};

// ── Helpers ─────────────────────────────────────────────────────────
function getInitials(email: string, name?: string): string {
  if (name) {
    return name
      .split(' ')
      .map((n) => n[0])
      .slice(0, 2)
      .join('')
      .toUpperCase();
  }
  return email.substring(0, 2).toUpperCase();
}

// ══════════════════════════════════════════════════════════════════
// MAIN COMPONENT
// ══════════════════════════════════════════════════════════════════
export const TeamPanel: React.FC = () => {
  const [members, setMembers] = useState<TeamMember[]>(INITIAL_MEMBERS);
  const [activity] = useState<ActivityLog[]>(MOCK_ACTIVITY);

  // Invite form state
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteRole, setInviteRole] = useState<MemberRole>('admin');
  const [inviteError, setInviteError] = useState('');
  const [inviteSent, setInviteSent] = useState(false);

  // Dropdown open state (member actions)
  const [openMenuId, setOpenMenuId] = useState<string | null>(null);

  // Active tab
  const [activeTab, setActiveTab] = useState<'members' | 'activity'>('members');

  const activeMembers = members.filter((m) => m.status === 'activo');
  const pendingMembers = members.filter((m) => m.status === 'pendiente');

  const handleInvite = (e: React.FormEvent) => {
    e.preventDefault();
    setInviteError('');

    if (!inviteEmail.trim()) {
      setInviteError('El correo electrónico es obligatorio.');
      return;
    }
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(inviteEmail.trim())) {
      setInviteError('Ingresa un correo electrónico válido.');
      return;
    }
    if (members.some((m) => m.email.toLowerCase() === inviteEmail.trim().toLowerCase())) {
      setInviteError('Este correo ya fue invitado a la plataforma.');
      return;
    }

    const colors = ['#6366f1', '#06b6d4', '#10b981', '#f59e0b', '#8b5cf6', '#ef4444'];
    const newMember: TeamMember = {
      id: Date.now().toString(),
      email: inviteEmail.trim(),
      role: inviteRole,
      status: 'pendiente',
      invitedAt: new Date().toISOString().substring(0, 10),
      avatarColor: colors[Math.floor(Math.random() * colors.length)],
    };

    setMembers((prev) => [...prev, newMember]);
    setInviteEmail('');
    setInviteSent(true);
    setTimeout(() => setInviteSent(false), 3000);
  };

  const handleRemoveMember = (id: string) => {
    setMembers((prev) => prev.filter((m) => m.id !== id));
    setOpenMenuId(null);
  };

  const handleChangeRole = (id: string, role: MemberRole) => {
    setMembers((prev) => prev.map((m) => (m.id === id ? { ...m, role } : m)));
    setOpenMenuId(null);
  };

  return (
    <div className="p-6 space-y-6 max-w-5xl">

      {/* ── Page header ── */}
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
            Invita colaboradores a gestionar o visualizar la cobranza de tu negocio.
          </p>
        </div>

        {/* Stats pills */}
        <div className="flex items-center gap-2 flex-wrap">
          <div
            className="badge badge-success gap-1.5 py-1.5 px-3"
          >
            <CheckCircle2 className="w-3 h-3" />
            {activeMembers.length} activo{activeMembers.length !== 1 ? 's' : ''}
          </div>
          {pendingMembers.length > 0 && (
            <div className="badge badge-warning gap-1.5 py-1.5 px-3">
              <Clock className="w-3 h-3" />
              {pendingMembers.length} pendiente{pendingMembers.length !== 1 ? 's' : ''}
            </div>
          )}
        </div>
      </div>

      {/* ── Invite Form Card ── */}
      <div
        className="card"
        style={{
          background: 'linear-gradient(135deg, rgba(99,102,241,0.04) 0%, rgba(6,182,212,0.03) 100%)',
          borderColor: 'rgba(99,102,241,0.18)',
        }}
      >
        <div className="flex items-center gap-2 mb-4">
          <UserPlus className="w-4 h-4" style={{ color: 'var(--color-brand)' }} />
          <h3 className="text-sm font-bold" style={{ color: 'var(--text-primary)' }}>
            Invitar nuevo gestor
          </h3>
        </div>

        <form onSubmit={handleInvite} className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-12 gap-3 items-start">
            {/* Email */}
            <div className="sm:col-span-6 space-y-1">
              <label className="font-semibold" style={{ color: 'var(--text-secondary)' }}>
                Correo electrónico
              </label>
              <div className="relative">
                <Mail
                  className="absolute left-3 top-2.5 w-4 h-4"
                  style={{ color: 'var(--text-muted)' }}
                />
                <input
                  type="email"
                  placeholder="gestor@empresa.com"
                  value={inviteEmail}
                  onChange={(e) => { setInviteEmail(e.target.value); setInviteError(''); }}
                  className="pl-9"
                />
              </div>
            </div>

            {/* Role */}
            <div className="sm:col-span-4 space-y-1">
              <label className="font-semibold" style={{ color: 'var(--text-secondary)' }}>
                Rol asignado
              </label>
              <div className="relative">
                <ChevronDown
                  className="absolute right-3 top-2.5 w-4 h-4 pointer-events-none"
                  style={{ color: 'var(--text-muted)' }}
                />
                <select
                  value={inviteRole}
                  onChange={(e) => setInviteRole(e.target.value as MemberRole)}
                >
                  <option value="admin">Administrador — gestiona cobros</option>
                  <option value="visor">Visor — solo lectura</option>
                </select>
              </div>
            </div>

            {/* Submit */}
            <div className="sm:col-span-2 flex items-end">
              <button
                type="submit"
                className="btn btn-primary w-full"
                style={{ height: '36px' }}
              >
                <Send className="w-3.5 h-3.5" />
                <span>Invitar</span>
              </button>
            </div>
          </div>

          {/* Role description */}
          <div
            className="flex items-start gap-2 text-xs py-2 px-3 rounded-lg"
            style={{
              background: 'var(--color-brand-muted)',
              borderRadius: 'var(--radius-md)',
              color: 'var(--text-secondary)',
            }}
          >
            {inviteRole === 'admin' ? (
              <Shield className="w-3.5 h-3.5 mt-0.5 flex-shrink-0" style={{ color: 'var(--color-brand)' }} />
            ) : (
              <Eye className="w-3.5 h-3.5 mt-0.5 flex-shrink-0" style={{ color: '#0891b2' }} />
            )}
            <span>{ROLE_CONFIG[inviteRole].description}</span>
          </div>

          {/* Error */}
          {inviteError && (
            <div className="alert alert-danger animate-fade-in">
              <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
              <span>{inviteError}</span>
            </div>
          )}

          {/* Success */}
          {inviteSent && (
            <div className="alert alert-success animate-fade-in">
              <CheckCircle2 className="w-4 h-4 flex-shrink-0 mt-0.5" />
              <span>
                Invitación enviada. El usuario recibirá un correo para unirse a la plataforma.
              </span>
            </div>
          )}
        </form>
      </div>

      {/* ── Tabs: Miembros / Actividad ── */}
      <div>
        <div
          className="flex border-b mb-5"
          style={{ borderColor: 'var(--border-default)' }}
        >
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
                {tab.id === 'members' && (
                  <span
                    className="badge ml-1"
                    style={{
                      background: isActive ? 'rgba(99,102,241,0.12)' : 'var(--surface-base)',
                      color: isActive ? 'var(--color-brand)' : 'var(--text-muted)',
                      borderColor: isActive ? 'rgba(99,102,241,0.2)' : 'var(--border-default)',
                      fontSize: '10px',
                      padding: '1px 6px',
                    }}
                  >
                    {members.length}
                  </span>
                )}
              </button>
            );
          })}
        </div>

        {/* ── TAB: MEMBERS ── */}
        {activeTab === 'members' && (
          <div className="space-y-3">
            {members.length === 0 && (
              <div
                className="card text-center py-12"
                style={{ borderStyle: 'dashed' }}
              >
                <Users className="w-10 h-10 mx-auto mb-3" style={{ color: 'var(--text-muted)' }} />
                <p className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>
                  Sin miembros en el equipo
                </p>
                <p className="text-xs mt-1" style={{ color: 'var(--text-muted)' }}>
                  Usa el formulario de arriba para invitar a tu primer gestor.
                </p>
              </div>
            )}

            {members.map((member) => {
              const roleConf = ROLE_CONFIG[member.role];
              const RoleIcon = roleConf.icon;
              const initials = getInitials(member.email, member.name);
              const isMenuOpen = openMenuId === member.id;

              return (
                <div
                  key={member.id}
                  className="card"
                  style={{
                    padding: '1rem 1.25rem',
                    opacity: member.status === 'pendiente' ? 0.85 : 1,
                  }}
                >
                  <div className="flex items-center gap-4 flex-wrap">
                    {/* Avatar */}
                    <div
                      className="w-10 h-10 rounded-xl flex items-center justify-center text-white text-sm font-bold flex-shrink-0"
                      style={{ background: member.avatarColor, boxShadow: `0 2px 8px ${member.avatarColor}40` }}
                    >
                      {initials}
                    </div>

                    {/* Info */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <p className="text-sm font-bold truncate" style={{ color: 'var(--text-primary)' }}>
                          {member.name || member.email}
                        </p>
                        {member.name && (
                          <p className="text-xs truncate" style={{ color: 'var(--text-muted)' }}>
                            {member.email}
                          </p>
                        )}
                      </div>
                      {member.lastAction && (
                        <p className="text-[11px] mt-0.5 truncate" style={{ color: 'var(--text-muted)' }}>
                          Última acción: {member.lastAction}
                        </p>
                      )}
                      {member.status === 'pendiente' && (
                        <p className="text-[11px] mt-0.5 italic" style={{ color: 'var(--color-warning-text)' }}>
                          Invitación enviada el {member.invitedAt} — esperando aceptación
                        </p>
                      )}
                    </div>

                    {/* Role badge */}
                    <div className="flex items-center gap-2 flex-shrink-0 flex-wrap">
                      <span
                        className="badge gap-1.5"
                        style={roleConf.badgeStyle}
                      >
                        <RoleIcon className="w-3 h-3" />
                        {roleConf.label}
                      </span>

                      {/* Status badge */}
                      {member.status === 'activo' ? (
                        <span className="badge badge-success gap-1">
                          <span
                            className="w-1.5 h-1.5 rounded-full inline-block bg-emerald-500"
                            style={{ animation: 'badge-pulse 2s ease-in-out infinite' }}
                          />
                          Activo
                        </span>
                      ) : (
                        <span className="badge badge-warning gap-1">
                          <Clock className="w-3 h-3" />
                          Pendiente
                        </span>
                      )}

                      {/* Last activity */}
                      {member.lastActivity && (
                        <span
                          className="text-[11px] font-medium hidden sm:flex items-center gap-1"
                          style={{ color: 'var(--text-muted)' }}
                        >
                          <Clock className="w-3 h-3" />
                          {member.lastActivity}
                        </span>
                      )}
                    </div>

                    {/* Actions menu */}
                    <div className="relative flex-shrink-0">
                      <button
                        onClick={() => setOpenMenuId(isMenuOpen ? null : member.id)}
                        className="btn btn-secondary btn-icon"
                        title="Opciones"
                      >
                        <MoreVertical className="w-4 h-4" />
                      </button>

                      {isMenuOpen && (
                        <>
                          {/* Backdrop */}
                          <div
                            className="fixed inset-0 z-10"
                            onClick={() => setOpenMenuId(null)}
                          />
                          <div
                            className="absolute right-0 top-full mt-1 z-20 rounded-xl shadow-lg border py-1 min-w-48 animate-fade-in"
                            style={{
                              background: 'var(--surface-card)',
                              borderColor: 'var(--border-default)',
                              boxShadow: 'var(--shadow-lg)',
                            }}
                          >
                            <div
                              className="px-3 py-2 text-[10px] font-bold uppercase tracking-widest border-b mb-1"
                              style={{ color: 'var(--text-muted)', borderColor: 'var(--border-default)' }}
                            >
                              Cambiar rol
                            </div>
                            <button
                              onClick={() => handleChangeRole(member.id, 'admin')}
                              className="w-full flex items-center gap-2.5 px-3 py-2 text-xs font-semibold transition-colors hover:bg-indigo-50 dark:hover:bg-indigo-950/20 cursor-pointer"
                              style={{ color: member.role === 'admin' ? 'var(--color-brand)' : 'var(--text-secondary)' }}
                            >
                              <Shield className="w-3.5 h-3.5 flex-shrink-0" />
                              Administrador
                              {member.role === 'admin' && <CheckCircle2 className="w-3.5 h-3.5 ml-auto text-[#6366f1]" />}
                            </button>
                            <button
                              onClick={() => handleChangeRole(member.id, 'visor')}
                              className="w-full flex items-center gap-2.5 px-3 py-2 text-xs font-semibold transition-colors hover:bg-cyan-50 dark:hover:bg-cyan-950/20 cursor-pointer"
                              style={{ color: member.role === 'visor' ? '#0891b2' : 'var(--text-secondary)' }}
                            >
                              <Eye className="w-3.5 h-3.5 flex-shrink-0" />
                              Visor
                              {member.role === 'visor' && <CheckCircle2 className="w-3.5 h-3.5 ml-auto text-cyan-600" />}
                            </button>

                            <div
                              className="border-t my-1"
                              style={{ borderColor: 'var(--border-default)' }}
                            />
                            <button
                              onClick={() => handleRemoveMember(member.id)}
                              className="w-full flex items-center gap-2.5 px-3 py-2 text-xs font-semibold transition-colors hover:bg-red-50 dark:hover:bg-red-950/20 text-red-500 hover:text-red-600 cursor-pointer"
                            >
                              <Trash2 className="w-3.5 h-3.5 flex-shrink-0" />
                              {member.status === 'pendiente' ? 'Cancelar invitación' : 'Eliminar del equipo'}
                            </button>
                          </div>
                        </>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}

            {/* Legend */}
            <div
              className="flex flex-wrap gap-6 pt-2 text-xs"
              style={{ color: 'var(--text-muted)' }}
            >
              <div className="flex items-center gap-1.5">
                <Crown className="w-3.5 h-3.5 text-amber-400" />
                <span>Tú eres el propietario del negocio</span>
              </div>
              <div className="flex items-center gap-1.5">
                <Shield className="w-3.5 h-3.5" style={{ color: 'var(--color-brand)' }} />
                <span>Administrador — puede registrar, editar y abonar</span>
              </div>
              <div className="flex items-center gap-1.5">
                <Eye className="w-3.5 h-3.5 text-cyan-500" />
                <span>Visor — solo lectura y exportación</span>
              </div>
            </div>
          </div>
        )}

        {/* ── TAB: ACTIVITY ── */}
        {activeTab === 'activity' && (
          <div className="space-y-2">
            {/* Filter row */}
            <div
              className="flex items-center justify-between gap-3 mb-4 p-3 rounded-xl flex-wrap"
              style={{ background: 'var(--surface-base)', borderRadius: 'var(--radius-lg)' }}
            >
              <p className="text-xs font-bold" style={{ color: 'var(--text-secondary)' }}>
                Últimas {activity.length} acciones registradas
              </p>
              <div className="flex items-center gap-2">
                <span className="text-xs font-medium" style={{ color: 'var(--text-muted)' }}>
                  Filtrar por:
                </span>
                <select
                  className="text-xs"
                  style={{ width: 'auto', padding: '0.3rem 2rem 0.3rem 0.5rem', minWidth: '0' }}
                >
                  <option>Todos los usuarios</option>
                  {members.filter(m => m.status === 'activo').map(m => (
                    <option key={m.id}>{m.name || m.email}</option>
                  ))}
                </select>
              </div>
            </div>

            {/* Timeline */}
            <div className="relative">
              {/* Vertical line */}
              <div
                className="absolute left-5 top-0 bottom-0 w-px"
                style={{ background: 'var(--border-default)' }}
              />

              <div className="space-y-1">
                {activity.map((log, idx) => {
                  const Icon = log.icon;
                  const member = members.find(m => m.email === log.userEmail);
                  const initials = getInitials(log.userEmail, log.userName);
                  return (
                    <div
                      key={log.id}
                      className="relative flex items-start gap-4 pl-12 py-3 group"
                    >
                      {/* Timeline dot */}
                      <div
                        className="absolute left-3.5 top-4 w-3 h-3 rounded-full border-2 z-10 transition-all"
                        style={{
                          background: 'var(--surface-card)',
                          borderColor: log.iconColor,
                          transform: 'translateX(-50%)',
                        }}
                      />

                      {/* Icon bubble */}
                      <div
                        className="flex-shrink-0 w-8 h-8 rounded-xl flex items-center justify-center -ml-4"
                        style={{
                          background: `${log.iconColor}18`,
                          border: `1.5px solid ${log.iconColor}30`,
                        }}
                      >
                        <Icon className="w-3.5 h-3.5" style={{ color: log.iconColor }} />
                      </div>

                      {/* Content */}
                      <div
                        className="flex-1 card transition-all duration-150 group-hover:shadow-md"
                        style={{ padding: '0.75rem 1rem' }}
                      >
                        <div className="flex items-start justify-between gap-3 flex-wrap">
                          <div className="flex items-center gap-2 flex-wrap">
                            {/* Avatar */}
                            <div
                              className="w-6 h-6 rounded-lg flex items-center justify-center text-white text-[9px] font-bold flex-shrink-0"
                              style={{ background: member?.avatarColor || '#6366f1' }}
                            >
                              {initials}
                            </div>
                            <span className="text-xs font-bold" style={{ color: 'var(--text-primary)' }}>
                              {log.userName || log.userEmail}
                            </span>
                            <span
                              className="text-xs px-2 py-0.5 rounded-full font-semibold"
                              style={{
                                background: `${log.iconColor}15`,
                                color: log.iconColor,
                              }}
                            >
                              {log.action}
                            </span>
                          </div>
                          <span
                            className="text-[11px] font-mono flex-shrink-0"
                            style={{ color: 'var(--text-muted)' }}
                          >
                            {log.timestamp}
                          </span>
                        </div>
                        <p className="text-xs mt-1.5" style={{ color: 'var(--text-secondary)' }}>
                          {log.detail}
                        </p>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Load more placeholder */}
            <div className="text-center pt-4">
              <button
                className="btn btn-secondary text-xs"
                onClick={() => {}}
              >
                <Activity className="w-3.5 h-3.5" />
                Cargar más actividad
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
