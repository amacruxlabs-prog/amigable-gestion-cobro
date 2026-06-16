import React from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { Sparkles, ShieldCheck, ChevronRight, Zap, Eye, Crown } from 'lucide-react';

const ROLES = [
  {
    email: 'amacruxlabs@gmail.com',
    label: 'Superadministrador',
    sublabel: 'Acceso total al sistema',
    badge: 'badge-purple',
    badgeLabel: 'Super',
    icon: Crown,
    iconColor: 'text-violet-600 dark:text-violet-400',
    iconBg: 'bg-violet-50 dark:bg-violet-500/10',
    border: 'border-violet-200/70 dark:border-violet-500/20',
    hover: 'hover:border-violet-300 dark:hover:border-violet-500/40 hover:bg-violet-50/40 dark:hover:bg-violet-500/5',
  },
  {
    email: 'admin@amigable.com',
    label: 'Administrador',
    sublabel: 'Gestión de registros y datos',
    badge: 'badge-info',
    badgeLabel: 'Admin',
    icon: Zap,
    iconColor: 'text-indigo-600 dark:text-indigo-400',
    iconBg: 'bg-indigo-50 dark:bg-indigo-500/10',
    border: 'border-indigo-200/70 dark:border-indigo-500/20',
    hover: 'hover:border-indigo-300 dark:hover:border-indigo-500/40 hover:bg-indigo-50/40 dark:hover:bg-indigo-500/5',
  },
  {
    email: 'visor@amigable.com',
    label: 'Visor / Lector',
    sublabel: 'Lectura y visualización',
    badge: 'badge-success',
    badgeLabel: 'Visor',
    icon: Eye,
    iconColor: 'text-emerald-600 dark:text-emerald-400',
    iconBg: 'bg-emerald-50 dark:bg-emerald-500/10',
    border: 'border-emerald-200/70 dark:border-emerald-500/20',
    hover: 'hover:border-emerald-300 dark:hover:border-emerald-500/40 hover:bg-emerald-50/40 dark:hover:bg-emerald-500/5',
  },
];

export const LoginScreen = () => {
  const { signIn, loading } = useAuth();

  return (
    <div
      className="min-h-screen flex items-center justify-center p-4 relative overflow-hidden"
      style={{ background: 'var(--surface-base)' }}
    >
      {/* Background gradient orbs */}
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 w-[600px] h-[600px] bg-indigo-500/5 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-0 left-1/4 w-80 h-80 bg-violet-500/5 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute top-10 right-10 w-56 h-56 bg-emerald-500/4 rounded-full blur-2xl pointer-events-none" />

      {/* Card */}
      <div
        className="relative w-full max-w-md animate-scale-in"
        style={{
          background: 'var(--surface-card)',
          border: '1px solid var(--border-default)',
          borderRadius: 'var(--radius-xl)',
          boxShadow: 'var(--shadow-lg)',
          overflow: 'hidden',
        }}
      >
        {/* Top stripe gradient */}
        <div className="h-1 w-full bg-gradient-to-r from-indigo-500 via-violet-500 to-sky-500" />

        <div className="p-8">
          {/* Brand */}
          <div className="text-center mb-8">
            <div
              className="w-14 h-14 mx-auto flex items-center justify-center text-white mb-5 shadow-lg shadow-indigo-500/30"
              style={{
                background: 'linear-gradient(135deg, #6366f1, #7c3aed)',
                borderRadius: 'var(--radius-lg)',
              }}
            >
              <Sparkles className="w-7 h-7" />
            </div>
            <h1 className="text-2xl font-bold tracking-tight mb-1.5" style={{ color: 'var(--text-primary)' }}>
              Mouna
            </h1>
            <p className="text-sm" style={{ color: 'var(--text-muted)' }}>
              Plataforma de Gestión de Cuotas y Membresías
            </p>
          </div>

          {/* Divider with label */}
          <div className="flex items-center gap-3 mb-5">
            <div className="flex-1 border-t" style={{ borderColor: 'var(--border-default)' }} />
            <span className="text-label">Selecciona un acceso</span>
            <div className="flex-1 border-t" style={{ borderColor: 'var(--border-default)' }} />
          </div>

          {/* Role buttons */}
          <div className="space-y-2.5">
            {ROLES.map((role) => {
              const RoleIcon = role.icon;
              return (
                <button
                  key={role.email}
                  onClick={() => signIn(role.email)}
                  disabled={loading}
                  className={`w-full flex items-center gap-3.5 p-3.5 text-left transition-all duration-200 cursor-pointer disabled:opacity-50 group active:scale-[0.98] border ${role.border} ${role.hover}`}
                  style={{ background: 'var(--surface-card)', borderRadius: 'var(--radius-lg)' }}
                >
                  <div
                    className={`w-9 h-9 ${role.iconBg} flex items-center justify-center flex-shrink-0 transition-transform duration-200 group-hover:scale-110`}
                    style={{ borderRadius: 'var(--radius-md)' }}
                  >
                    <RoleIcon className={`w-4.5 h-4.5 ${role.iconColor}`} />
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-0.5">
                      <span className="text-sm font-bold" style={{ color: 'var(--text-primary)' }}>
                        {role.label}
                      </span>
                      <span className={`badge ${role.badge}`}>{role.badgeLabel}</span>
                    </div>
                    <span className="text-xs font-mono truncate block" style={{ color: 'var(--text-muted)' }}>
                      {role.sublabel}
                    </span>
                  </div>

                  <ChevronRight
                    className="w-4 h-4 flex-shrink-0 opacity-30 group-hover:opacity-70 group-hover:translate-x-0.5 transition-all"
                    style={{ color: 'var(--text-secondary)' }}
                  />
                </button>
              );
            })}
          </div>

          {loading && (
            <div className="mt-4 alert alert-info animate-fade-in">
              <div className="w-4 h-4 border-2 border-indigo-400/30 border-t-indigo-500 rounded-full animate-spin flex-shrink-0 mt-0.5" />
              <span className="font-semibold">Verificando identidad...</span>
            </div>
          )}
        </div>

        {/* Footer */}
        <div
          className="px-8 py-4 flex items-center justify-center gap-2 border-t text-xs"
          style={{
            borderColor: 'var(--border-subtle)',
            background: 'var(--surface-base)',
            color: 'var(--text-muted)',
          }}
        >
          <ShieldCheck className="w-3.5 h-3.5 opacity-60" />
          <span>Acceso seguro gestionado por roles</span>
        </div>
      </div>
    </div>
  );
};
