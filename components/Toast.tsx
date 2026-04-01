
import React, { createContext, useContext, useState, useCallback, ReactNode } from 'react';
import { CheckCircle, XCircle, Info, X, Loader2 } from 'lucide-react';

type ToastType = 'success' | 'error' | 'info' | 'loading';

interface Toast {
  id: string;
  message: string;
  type: ToastType;
}

interface ToastContextType {
  showToast: (message: string, type?: ToastType) => void;
  removeToast: (id: string) => void;
}

const ToastContext = createContext<ToastContextType | undefined>(undefined);

export const ToastProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const removeToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((toast) => toast.id !== id));
  }, []);

  const showToast = useCallback((message: string, type: ToastType = 'info') => {
    const id = Math.random().toString(36).substring(2, 9);
    setToasts((prev) => [...prev, { id, message, type }]);

    if (type !== 'loading') {
      setTimeout(() => {
        removeToast(id);
      }, 4000);
    }
  }, [removeToast]);

  return (
    <ToastContext.Provider value={{ showToast, removeToast }}>
      {children}
      <div className="fixed top-6 right-6 z-[9999] flex flex-col gap-3 pointer-events-none">
        {toasts.map((toast) => (
          <ToastItem key={toast.id} toast={toast} onRemove={removeToast} />
        ))}
      </div>
    </ToastContext.Provider>
  );
};

const ToastItem: React.FC<{ toast: Toast; onRemove: (id: string) => void }> = ({ toast, onRemove }) => {
  const icons = {
    success: <CheckCircle className="text-green-500" size={18} />,
    error: <XCircle className="text-rose-500" size={18} />,
    info: <Info className="text-blue-500" size={18} />,
    loading: <Loader2 className="text-blue-500 animate-spin" size={18} />,
  };

  const borders = {
    success: 'border-green-500/20 bg-green-500/5',
    error: 'border-rose-500/20 bg-rose-500/5',
    info: 'border-blue-500/20 bg-blue-500/5',
    loading: 'border-blue-500/20 bg-blue-500/5',
  };

  return (
    <div className={`
      pointer-events-auto
      flex items-center gap-4 px-5 py-4 min-w-[320px] max-w-[450px]
      rounded-[1.25rem] border backdrop-blur-xl shadow-2xl
      animate-in slide-in-from-right-full duration-300
      ${borders[toast.type]}
    `}>
      <div className="shrink-0">{icons[toast.type]}</div>
      <p className="flex-1 text-[11px] font-black uppercase tracking-widest text-white/90 leading-tight">
        {toast.message}
      </p>
      <button 
        onClick={() => onRemove(toast.id)}
        className="shrink-0 text-slate-600 hover:text-white transition-colors"
      >
        <X size={14} />
      </button>
    </div>
  );
};

export const useToast = () => {
  const context = useContext(ToastContext);
  if (!context) {
    throw new Error('useToast must be used within a ToastProvider');
  }
  return context;
};
