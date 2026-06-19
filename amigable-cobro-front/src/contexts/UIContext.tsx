import React, { createContext, useContext, useState, useCallback, ReactNode, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { AlertTriangle, CheckCircle, Info, X, Check } from 'lucide-react';

type ToastType = 'success' | 'error' | 'info' | 'warning';

interface Toast {
  id: string;
  message: string;
  type: ToastType;
}

interface ConfirmOptions {
  title?: string;
  message: string;
  confirmText?: string;
  cancelText?: string;
  type?: 'danger' | 'warning' | 'info';
  onConfirm: () => void;
}

interface AlertOptions {
  title?: string;
  message: string;
  buttonText?: string;
  type?: 'danger' | 'warning' | 'info' | 'success';
  onClose?: () => void;
}

interface UIContextType {
  toast: (message: string, type?: ToastType) => void;
  confirm: (options: ConfirmOptions) => void;
  alert: (options: AlertOptions | string) => void;
}

const UIContext = createContext<UIContextType | undefined>(undefined);

export const useUI = () => {
  const context = useContext(UIContext);
  if (!context) {
    throw new Error('useUI must be used within a UIProvider');
  }
  return context;
};

export const UIProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [toasts, setToasts] = useState<Toast[]>([]);
  const [confirmDialog, setConfirmDialog] = useState<ConfirmOptions | null>(null);
  const [alertDialog, setAlertDialog] = useState<AlertOptions | null>(null);

  const addToast = useCallback((message: string, type: ToastType = 'info') => {
    const id = Math.random().toString(36).substring(2, 9);
    setToasts((prev) => [...prev, { id, message, type }]);
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 4000);
  }, []);

  const showConfirm = useCallback((options: ConfirmOptions) => {
    setConfirmDialog(options);
  }, []);

  const showAlert = useCallback((options: AlertOptions | string) => {
    if (typeof options === 'string') {
      setAlertDialog({ message: options });
    } else {
      setAlertDialog(options);
    }
  }, []);

  // Escuchar eventos globales para disparar toasts desde fuera de React (ej. axios interceptors)
  useEffect(() => {
    const handleGlobalToast = (e: CustomEvent<{ message: string; type: ToastType }>) => {
      addToast(e.detail.message, e.detail.type);
    };
    const handleGlobalAlert = (e: CustomEvent<AlertOptions>) => {
      showAlert(e.detail);
    };

    window.addEventListener('global-toast', handleGlobalToast as EventListener);
    window.addEventListener('global-alert', handleGlobalAlert as EventListener);

    return () => {
      window.removeEventListener('global-toast', handleGlobalToast as EventListener);
      window.removeEventListener('global-alert', handleGlobalAlert as EventListener);
    };
  }, [addToast, showAlert]);

  return (
    <UIContext.Provider value={{ toast: addToast, confirm: showConfirm, alert: showAlert }}>
      {children}

      {/* TOASTS CONTAINER - PREMIUM GLASSMORPHISM */}
      <div className="fixed bottom-6 right-6 z-[9999] flex flex-col gap-3 pointer-events-none">
        <AnimatePresence>
          {toasts.map((t) => (
            <motion.div
              key={t.id}
              initial={{ opacity: 0, x: 50, scale: 0.95 }}
              animate={{ opacity: 1, x: 0, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95, transition: { duration: 0.2 } }}
              className="pointer-events-auto flex items-center gap-3.5 p-4 rounded-2xl shadow-[0_8px_30px_rgb(0,0,0,0.12)] backdrop-blur-md min-w-[320px] max-w-sm relative overflow-hidden group"
              style={{
                background: 'rgba(255, 255, 255, 0.85)',
                border: '1px solid rgba(255, 255, 255, 0.3)'
              }}
            >
              {/* Dark mode styles are handled via className since inline styles override them, so let's use tailwind classes for the background */}
              <div className="absolute inset-0 bg-white/80 dark:bg-[#0B1120]/80 backdrop-blur-xl border border-white/40 dark:border-white/10 rounded-2xl -z-10" />
              
              {t.type === 'success' && <div className="w-10 h-10 rounded-full bg-gradient-to-br from-emerald-400 to-emerald-600 flex items-center justify-center shrink-0 shadow-lg shadow-emerald-500/30 text-white"><CheckCircle className="w-5 h-5" /></div>}
              {t.type === 'error' && <div className="w-10 h-10 rounded-full bg-gradient-to-br from-rose-500 to-red-600 flex items-center justify-center shrink-0 shadow-lg shadow-red-500/30 text-white"><X className="w-5 h-5" /></div>}
              {t.type === 'warning' && <div className="w-10 h-10 rounded-full bg-gradient-to-br from-amber-400 to-orange-500 flex items-center justify-center shrink-0 shadow-lg shadow-orange-500/30 text-white"><AlertTriangle className="w-5 h-5" /></div>}
              {t.type === 'info' && <div className="w-10 h-10 rounded-full bg-gradient-to-br from-[#6366F1] to-[#4F46E5] flex items-center justify-center shrink-0 shadow-lg shadow-[#6366F1]/30 text-white"><Info className="w-5 h-5" /></div>}
              
              <div className="flex-1 text-slate-800 dark:text-slate-100">
                <span className="block text-[13px] font-bold mb-0.5 opacity-90 tracking-wide uppercase">
                  {t.type === 'success' ? 'Éxito' : t.type === 'error' ? 'Error' : t.type === 'warning' ? 'Advertencia' : 'Información'}
                </span>
                <span className="block leading-snug text-[13px] opacity-80">{t.message}</span>
              </div>
              
              <button
                type="button"
                onClick={() => setToasts((prev) => prev.filter((toast) => toast.id !== t.id))}
                className="transition-opacity p-1.5 hover:bg-slate-200/50 dark:hover:bg-slate-800/50 rounded-full cursor-pointer text-slate-500 dark:text-slate-400"
              >
                <X className="w-4 h-4" />
              </button>
            </motion.div>
          ))}
        </AnimatePresence>
      </div>

      {/* CONFIRM DIALOG */}
      <AnimatePresence>
        {confirmDialog && (
          <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm"
              onClick={() => setConfirmDialog(null)}
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 10 }}
              className="bg-white dark:bg-slate-900 rounded-xl shadow-2xl border border-slate-200 dark:border-slate-800 w-full max-w-md overflow-hidden z-10 relative"
            >
              <div className="p-6">
                <div className="flex items-start gap-4">
                  <div className={`w-10 h-10 rounded-full flex items-center justify-center shrink-0 ${
                    confirmDialog.type === 'danger' ? 'bg-red-100 text-red-600 dark:bg-red-900/30 dark:text-red-400' :
                    confirmDialog.type === 'warning' ? 'bg-amber-100 text-amber-600 dark:bg-amber-900/30 dark:text-amber-400' :
                    'bg-indigo-100 text-indigo-600 dark:bg-indigo-900/30 dark:text-indigo-400'
                  }`}>
                    {confirmDialog.type === 'danger' ? <AlertTriangle className="w-5 h-5" /> :
                     confirmDialog.type === 'warning' ? <AlertTriangle className="w-5 h-5" /> :
                     <Info className="w-5 h-5" />}
                  </div>
                  <div>
                    <h3 className="text-lg font-bold text-slate-900 dark:text-slate-100">
                      {confirmDialog.title || 'Confirmación Requerida'}
                    </h3>
                    <p className="mt-2 text-sm text-slate-500 dark:text-slate-400 leading-relaxed">
                      {confirmDialog.message}
                    </p>
                  </div>
                </div>
              </div>
              <div className="px-6 py-4 bg-slate-50 dark:bg-slate-800/50 flex justify-end gap-3 border-t border-slate-100 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setConfirmDialog(null)}
                  className="btn btn-secondary"
                >
                  {confirmDialog.cancelText || 'Cancelar'}
                </button>
                <button
                  type="button"
                  onClick={() => {
                    confirmDialog.onConfirm();
                    setConfirmDialog(null);
                  }}
                  className={`btn ${
                    confirmDialog.type === 'danger' ? 'btn-danger' :
                    confirmDialog.type === 'warning' ? 'btn-warning' :
                    'btn-primary'
                  }`}
                >
                  <Check className="w-4 h-4" />
                  {confirmDialog.confirmText || 'Confirmar'}
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* ALERT DIALOG - PREMIUM GLASSMORPHISM */}
      <AnimatePresence>
        {alertDialog && (
          <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 sm:p-6">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 bg-slate-900/60 backdrop-blur-md"
              onClick={() => {
                alertDialog.onClose?.();
                setAlertDialog(null);
              }}
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: -20, transition: { duration: 0.15 } }}
              className="w-full max-w-sm z-10 relative overflow-hidden"
            >
              <div className="absolute inset-0 bg-white/90 dark:bg-[#0f172a]/90 backdrop-blur-2xl border border-white/50 dark:border-white/10 rounded-3xl shadow-[0_20px_50px_rgb(0,0,0,0.3)] -z-10" />
              
              {/* Highlight top border based on type */}
              <div className={`h-2 w-full ${
                alertDialog.type === 'danger' ? 'bg-gradient-to-r from-red-500 to-rose-600' :
                alertDialog.type === 'warning' ? 'bg-gradient-to-r from-amber-400 to-orange-500' :
                alertDialog.type === 'success' ? 'bg-gradient-to-r from-emerald-400 to-teal-500' :
                'bg-gradient-to-r from-[#6366F1] to-purple-600'
              }`} />

              <div className="px-8 pt-8 pb-6 text-center">
                <div className="relative mx-auto w-20 h-20 mb-5">
                  <div className={`absolute inset-0 rounded-full opacity-20 animate-ping ${
                    alertDialog.type === 'danger' ? 'bg-red-500' :
                    alertDialog.type === 'warning' ? 'bg-amber-500' :
                    alertDialog.type === 'success' ? 'bg-emerald-500' :
                    'bg-[#6366F1]'
                  }`} />
                  <div className={`relative flex items-center justify-center w-20 h-20 rounded-full shadow-inner border-4 border-white dark:border-[#1e293b] ${
                    alertDialog.type === 'danger' ? 'bg-gradient-to-br from-red-500 to-rose-600 text-white' :
                    alertDialog.type === 'warning' ? 'bg-gradient-to-br from-amber-400 to-orange-500 text-white' :
                    alertDialog.type === 'success' ? 'bg-gradient-to-br from-emerald-400 to-teal-500 text-white' :
                    'bg-gradient-to-br from-[#6366F1] to-[#4F46E5] text-white'
                  }`}>
                    {alertDialog.type === 'danger' ? <X className="w-10 h-10 drop-shadow-md" /> :
                     alertDialog.type === 'warning' ? <AlertTriangle className="w-10 h-10 drop-shadow-md" /> :
                     alertDialog.type === 'success' ? <CheckCircle className="w-10 h-10 drop-shadow-md" /> :
                     <Info className="w-10 h-10 drop-shadow-md" />}
                  </div>
                </div>
                
                <h3 className="text-xl font-black text-slate-900 dark:text-white tracking-tight mb-2">
                  {alertDialog.title || 'Atención'}
                </h3>
                <p className="text-[15px] text-slate-600 dark:text-slate-300 leading-relaxed font-medium">
                  {alertDialog.message}
                </p>
              </div>
              
              <div className="px-8 pb-8 flex justify-center">
                <button
                  type="button"
                  onClick={() => {
                    alertDialog.onClose?.();
                    setAlertDialog(null);
                  }}
                  className={`w-full py-3.5 px-6 rounded-xl font-bold text-[15px] shadow-lg hover:shadow-xl transition-all duration-200 transform hover:-translate-y-0.5 active:translate-y-0 text-white cursor-pointer ${
                    alertDialog.type === 'danger' ? 'bg-gradient-to-r from-red-500 to-rose-600 shadow-red-500/25' :
                    alertDialog.type === 'warning' ? 'bg-gradient-to-r from-amber-500 to-orange-600 shadow-orange-500/25' :
                    alertDialog.type === 'success' ? 'bg-gradient-to-r from-emerald-500 to-teal-600 shadow-teal-500/25' :
                    'bg-gradient-to-r from-[#6366F1] to-[#4F46E5] shadow-[#6366F1]/25'
                  }`}
                >
                  {alertDialog.buttonText || 'Entendido'}
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </UIContext.Provider>
  );
};
