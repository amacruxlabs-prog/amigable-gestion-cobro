import React, { useState } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { Sparkles, Mail, Lock, ArrowRight, ShieldCheck } from 'lucide-react';

export const LoginScreen = () => {
  const { signIn, loading } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!email) return;
    // In our mock, password is not strictly validated, but email decides the role
    signIn(email);
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4 relative overflow-hidden"
         style={{ background: 'linear-gradient(135deg, #6366F1 0%, #06B6D4 100%)' }}>
      
      {/* Background Orbs */}
      <div className="absolute top-0 left-0 w-full h-full overflow-hidden pointer-events-none">
        <div className="absolute -top-[20%] -left-[10%] w-[70%] h-[70%] bg-white/10 rounded-full blur-3xl mix-blend-overlay"></div>
        <div className="absolute -bottom-[20%] -right-[10%] w-[60%] h-[60%] bg-[#06B6D4]/30 rounded-full blur-3xl mix-blend-overlay"></div>
      </div>

      <div 
        className="relative w-full max-w-[420px] animate-scale-in"
        style={{
          background: '#FFFFFF',
          borderRadius: '1rem',
          boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
          overflow: 'hidden'
        }}
      >
        <div className="p-8 sm:p-10">
          
          <div className="text-center mb-8">
            <div 
              className="w-16 h-16 mx-auto flex items-center justify-center text-white mb-6 shadow-lg"
              style={{
                background: 'linear-gradient(135deg, #6366F1, #06B6D4)',
                borderRadius: '1rem',
              }}
            >
              <Sparkles className="w-8 h-8" />
            </div>
            <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-slate-900 mb-2">
              AMIGABLE COBRO
            </h1>
            <p className="text-sm text-slate-500 font-medium">
              SaaS Multi-Negocio de Cobranza Inteligente
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-5">
            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-1.5" htmlFor="email">
                Correo Electrónico
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                  <Mail className="w-5 h-5" />
                </div>
                <input
                  id="email"
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full pl-10 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-lg text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-[#6366F1]/50 focus:border-[#6366F1] transition-all"
                  placeholder="ej. admin@amigable.com"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-1.5" htmlFor="password">
                Contraseña
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                  <Lock className="w-5 h-5" />
                </div>
                <input
                  id="password"
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full pl-10 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-lg text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-[#6366F1]/50 focus:border-[#6366F1] transition-all"
                  placeholder="••••••••"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={loading || !email}
              className="w-full flex items-center justify-center gap-2 py-3.5 px-4 text-white font-bold rounded-lg shadow-md hover:shadow-lg transition-all duration-200 disabled:opacity-70 disabled:cursor-not-allowed group active:scale-[0.98]"
              style={{ background: 'linear-gradient(135deg, #6366F1, #4F46E5)' }}
            >
              {loading ? (
                <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              ) : (
                <>
                  <span>Ingresar a mi Panel</span>
                  <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
                </>
              )}
            </button>
          </form>
          
          <div className="mt-8 pt-6 border-t border-slate-100">
            <p className="text-xs text-center text-slate-500 mb-3 font-semibold">Cuentas Demo Rápidas:</p>
            <div className="grid grid-cols-2 gap-2">
              <button 
                onClick={() => signIn('amacruxlabs@gmail.com')}
                type="button"
                className="py-2 px-3 text-xs font-semibold text-[#6366F1] bg-[#6366F1]/10 rounded hover:bg-[#6366F1]/20 transition-colors"
              >
                Super Admin
              </button>
              <button 
                onClick={() => signIn('admin@amigable.com')}
                type="button"
                className="py-2 px-3 text-xs font-semibold text-[#06B6D4] bg-[#06B6D4]/10 rounded hover:bg-[#06B6D4]/20 transition-colors"
              >
                Tenant (Negocio)
              </button>
            </div>
          </div>

        </div>
        
        <div className="bg-slate-50 px-8 py-4 flex items-center justify-center gap-2 text-xs text-slate-500 font-medium border-t border-slate-100">
          <ShieldCheck className="w-4 h-4 text-emerald-500" />
          <span>Acceso cifrado y seguro</span>
        </div>
      </div>
    </div>
  );
};
