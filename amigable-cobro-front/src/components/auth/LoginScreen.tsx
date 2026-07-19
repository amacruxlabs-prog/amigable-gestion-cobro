import React from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { Sparkles, Mail, Lock, ArrowRight, ShieldCheck } from 'lucide-react';
import { useFormik } from 'formik';
import * as Yup from 'yup';


export const LoginScreen = () => {
  const { signIn } = useAuth();

  const formik = useFormik({
    initialValues: {
      email: '',
      password: '',
    },
    validationSchema: Yup.object({
      email: Yup.string().email('Correo no válido').required('Requerido'),
      password: Yup.string().min(6, 'Mínimo 6 caracteres').required('Requerido'),
    }),
    onSubmit: async (values, { setSubmitting }) => {
      try {
        await signIn(values.email, values.password);
      } catch (error) {
        // En caso de que el backend falle (ej. credenciales inválidas), 
        // Axios interceptor ya suelta el Toast, pero podemos quitar isSubmitting
      } finally {
        setSubmitting(false);
      }
    },
  });

  return (
    <div className="min-h-screen flex items-center justify-center p-4 relative overflow-hidden"
         style={{ background: 'linear-gradient(135deg, var(--color-brand) 0%, #06B6D4 100%)' }}>
      
      {/* Background Orbs */}
      <div className="absolute top-0 left-0 w-full h-full overflow-hidden pointer-events-none">
        <div className="absolute -top-[20%] -left-[10%] w-[70%] h-[70%] bg-white/10 rounded-full blur-3xl mix-blend-overlay"></div>
        <div className="absolute -bottom-[20%] -right-[10%] w-[60%] h-[60%] bg-[#06B6D4]/30 rounded-full blur-3xl mix-blend-overlay"></div>
      </div>

      <div 
        className="relative w-full max-w-[420px] animate-scale-in"
        style={{
          background: 'var(--surface-base)',
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
                background: 'linear-gradient(135deg, var(--color-brand), #06B6D4)',
                borderRadius: '1rem',
              }}
            >
              <Sparkles className="w-8 h-8" />
            </div>
            <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight mb-2" style={{ color: 'var(--text-primary)' }}>
              AMIGABLE COBRO
            </h1>
            <p className="text-sm font-medium" style={{ color: 'var(--text-muted)' }}>
              SaaS Multi-Negocio de Cobranza Inteligente
            </p>
          </div>

          <form onSubmit={(e) => { e.preventDefault(); formik.handleSubmit(e); }} className="space-y-5">
            <div>
              <label className="block text-sm font-semibold mb-1.5" style={{ color: 'var(--text-primary)' }} htmlFor="email">
                Correo Electrónico
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none" style={{ color: 'var(--text-muted)' }}>
                  <Mail className="w-5 h-5" />
                </div>
                <input
                  id="email"
                  name="email"
                  type="email"
                  value={formik.values.email}
                  onChange={formik.handleChange}
                  onBlur={formik.handleBlur}
                  className="w-full pl-10 pr-4 py-3 border rounded-lg focus:outline-none focus:ring-2 transition-all"
                  style={{
                    background: 'var(--surface-card)',
                    color: 'var(--text-primary)',
                    borderColor: formik.touched.email && formik.errors.email ? 'red' : 'var(--border-color)',
                  }}
                  placeholder="ej. admin@amigable.com"
                />
              </div>
              {formik.touched.email && formik.errors.email ? (
                <div className="text-red-500 text-xs mt-1 font-medium">{formik.errors.email}</div>
              ) : null}
            </div>

            <div>
              <label className="block text-sm font-semibold mb-1.5" style={{ color: 'var(--text-primary)' }} htmlFor="password">
                Contraseña
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none" style={{ color: 'var(--text-muted)' }}>
                  <Lock className="w-5 h-5" />
                </div>
                <input
                  id="password"
                  name="password"
                  type="password"
                  value={formik.values.password}
                  onChange={formik.handleChange}
                  onBlur={formik.handleBlur}
                  className="w-full pl-10 pr-4 py-3 border rounded-lg focus:outline-none focus:ring-2 transition-all"
                  style={{
                    background: 'var(--surface-card)',
                    color: 'var(--text-primary)',
                    borderColor: formik.touched.password && formik.errors.password ? 'red' : 'var(--border-color)',
                  }}
                  placeholder="••••••••"
                />
              </div>
              {formik.touched.password && formik.errors.password ? (
                <div className="text-red-500 text-xs mt-1 font-medium">{formik.errors.password}</div>
              ) : null}
            </div>

            <button
              type="submit"
              disabled={formik.isSubmitting}
              className="w-full flex items-center justify-center gap-2 py-3.5 px-4 text-white font-bold rounded-lg shadow-md hover:shadow-lg transition-all duration-200 disabled:opacity-70 disabled:cursor-not-allowed group active:scale-[0.98]"
              style={{ background: 'linear-gradient(135deg, var(--color-brand), #4F46E5)' }}
            >
              {formik.isSubmitting ? (
                <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              ) : (
                <>
                  <span>Ingresar a mi Panel</span>
                  <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
                </>
              )}
            </button>
          </form>
          


        </div>
        
        <div className="px-8 py-4 flex items-center justify-center gap-2 text-xs font-medium border-t" 
             style={{ background: 'var(--surface-base)', borderColor: 'var(--border-color)', color: 'var(--text-muted)' }}>
          <ShieldCheck className="w-4 h-4 text-emerald-500" />
          <span>Acceso cifrado y seguro</span>
        </div>
      </div>
    </div>
  );
};
