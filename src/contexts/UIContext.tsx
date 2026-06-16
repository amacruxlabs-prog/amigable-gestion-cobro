import React, { createContext, useContext, useState, useCallback, ReactNode } from 'react';
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

  return (
    <UIContext.Provider value={{ toast: addToast, confirm: showConfirm, alert: showAlert }}>
      {children}

      {/* TOASTS CONTAINER */}
      <div className="fixed bottom-4 right-4 z-[9999] flex flex-col gap-2 pointer-events-none">
        <AnimatePresence>
          {toasts.map((t) => (
            <motion.div
              key={t.id}
              initial={{ opacity: 0, y: 20, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95, transition: { duration: 0.2 } }}
              className={`pointer-events-auto flex items-center gap-3 px-4 py-3 rounded-lg shadow-lg border text-sm font-semibold min-w-[280px] max-w-sm ${
                t.type === 'success'
                  ? 'bg-emerald-50 border-emerald-200 text-emerald-800 dark:bg-emerald-950/40 dark:border-emerald-800/60 dark:text-emerald-300'
                  : t.type === 'error'
                  ? 'bg-rose-50 border-rose-200 text-rose-800 dark:bg-rose-950/40 dark:border-rose-800/60 dark:text-rose-300'
                  : t.type === 'warning'
                  ? 'bg-amber-50 border-amber-200 text-amber-800 dark:bg-amber-950/40 dark:border-amber-800/60 dark:text-amber-300'
                  : 'bg-indigo-50 border-indigo-200 text-indigo-800 dark:bg-indigo-950/40 dark:border-indigo-800/60 dark:text-indigo-300'
              }`}
            >
              {t.type === 'success' && <CheckCircle className="w-5 h-5 text-emerald-500 shrink-0" />}
              {t.type === 'error' && <X className="w-5 h-5 text-rose-500 shrink-0" />}
              {t.type === 'warning' && <AlertTriangle className="w-5 h-5 text-amber-500 shrink-0" />}
              {t.type === 'info' && <Info className="w-5 h-5 text-indigo-500 shrink-0" />}
              <span className="flex-1 leading-snug">{t.message}</span>
              <button
                onClick={() => setToasts((prev) => prev.filter((toast) => toast.id !== t.id))}
                className="opacity-50 hover:opacity-100 transition-opacity"
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
                  onClick={() => setConfirmDialog(null)}
                  className="px-4 py-2 rounded-lg text-sm font-semibold text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700 transition"
                >
                  {confirmDialog.cancelText || 'Cancelar'}
                </button>
                <button
                  onClick={() => {
                    confirmDialog.onConfirm();
                    setConfirmDialog(null);
                  }}
                  className={`px-4 py-2 rounded-lg text-sm font-bold text-white shadow-sm transition flex items-center gap-1.5 ${
                    confirmDialog.type === 'danger' ? 'bg-red-600 hover:bg-red-700' :
                    confirmDialog.type === 'warning' ? 'bg-amber-600 hover:bg-amber-700' :
                    'bg-[#6366F1] hover:bg-[#4f46e5]'
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

      {/* ALERT DIALOG */}
      <AnimatePresence>
        {alertDialog && (
          <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm"
              onClick={() => {
                alertDialog.onClose?.();
                setAlertDialog(null);
              }}
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 10 }}
              className="bg-white dark:bg-slate-900 rounded-xl shadow-2xl border border-slate-200 dark:border-slate-800 w-full max-w-sm overflow-hidden z-10 relative"
            >
              <div className="p-6 text-center">
                <div className={`w-12 h-12 rounded-full mx-auto flex items-center justify-center mb-4 ${
                  alertDialog.type === 'danger' ? 'bg-red-100 text-red-600 dark:bg-red-900/30 dark:text-red-400' :
                  alertDialog.type === 'warning' ? 'bg-amber-100 text-amber-600 dark:bg-amber-900/30 dark:text-amber-400' :
                  alertDialog.type === 'success' ? 'bg-emerald-100 text-emerald-600 dark:bg-emerald-900/30 dark:text-emerald-400' :
                  'bg-indigo-100 text-indigo-600 dark:bg-indigo-900/30 dark:text-indigo-400'
                }`}>
                  {alertDialog.type === 'danger' ? <X className="w-6 h-6" /> :
                   alertDialog.type === 'warning' ? <AlertTriangle className="w-6 h-6" /> :
                   alertDialog.type === 'success' ? <CheckCircle className="w-6 h-6" /> :
                   <Info className="w-6 h-6" />}
                </div>
                <h3 className="text-lg font-bold text-slate-900 dark:text-slate-100">
                  {alertDialog.title || 'Atención'}
                </h3>
                <p className="mt-2 text-sm text-slate-500 dark:text-slate-400 leading-relaxed">
                  {alertDialog.message}
                </p>
              </div>
              <div className="px-6 py-4 bg-slate-50 dark:bg-slate-800/50 flex justify-center border-t border-slate-100 dark:border-slate-800">
                <button
                  onClick={() => {
                    alertDialog.onClose?.();
                    setAlertDialog(null);
                  }}
                  className="w-full px-4 py-2 rounded-lg text-sm font-bold text-white bg-[#6366F1] hover:bg-[#4f46e5] shadow-sm transition"
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
