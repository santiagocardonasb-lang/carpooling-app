import { createContext, useContext, useState, useCallback, useRef } from 'react';
import { CheckCircle, XCircle, X } from '@phosphor-icons/react';

interface Toast {
  id: number;
  type: 'success' | 'error';
  message: string;
  detail?: string;
}

interface ToastContextValue {
  showToast: (message: string, type?: 'success' | 'error', detail?: string) => void;
}

const ToastContext = createContext<ToastContextValue | null>(null);

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toast, setToast] = useState<Toast | null>(null);
  const [visible, setVisible] = useState(false);
  const counter = useRef(0);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const showToast = useCallback((
    message: string,
    type: 'success' | 'error' = 'success',
    detail?: string,
  ) => {
    // clear any pending auto-dismiss
    if (timerRef.current) clearTimeout(timerRef.current);

    const id = ++counter.current;
    setToast({ id, type, message, detail });
    setVisible(true);

    timerRef.current = setTimeout(() => {
      setVisible(false);
      setTimeout(() => setToast(null), 300);
    }, 3200);
  }, []);

  const dismiss = () => {
    if (timerRef.current) clearTimeout(timerRef.current);
    setVisible(false);
    setTimeout(() => setToast(null), 300);
  };

  return (
    <ToastContext.Provider value={{ showToast }}>
      {children}

      {/* ── full-screen dimmed backdrop ── */}
      {toast && (
        <div
          className={`fixed inset-0 z-[9999] flex items-center justify-center px-6
            transition-all duration-300
            ${visible ? 'opacity-100' : 'opacity-0 pointer-events-none'}`}
          style={{ background: 'rgba(0,0,0,0.65)' }}
          onClick={dismiss}
        >
          {/* ── popup card ── */}
          <div
            className={`relative bg-white rounded-3xl px-8 py-8 w-full max-w-xs flex flex-col items-center gap-4
              shadow-2xl transition-all duration-300
              ${visible ? 'scale-100 translate-y-0' : 'scale-90 translate-y-4'}`}
            onClick={(e) => e.stopPropagation()}
          >
            {/* close button */}
            <button
              onClick={dismiss}
              className="absolute top-4 right-4 text-zinc-300 hover:text-zinc-500 transition-colors"
            >
              <X size={18} weight="bold" />
            </button>

            {/* icon */}
            <div className={`w-20 h-20 rounded-full flex items-center justify-center
              ${toast.type === 'success' ? 'bg-green-50' : 'bg-red-50'}`}>
              {toast.type === 'success'
                ? <CheckCircle size={44} weight="duotone" className="text-green-500" />
                : <XCircle    size={44} weight="duotone" className="text-red-500"   />
              }
            </div>

            {/* text */}
            <div className="text-center">
              <p className="text-black font-bold text-lg leading-tight">{toast.message}</p>
              {toast.detail && (
                <p className="text-zinc-500 text-sm mt-1">{toast.detail}</p>
              )}
            </div>

            {/* progress bar */}
            <div className="w-full h-1 bg-zinc-100 rounded-full overflow-hidden">
              <div
                className={`h-full rounded-full ${toast.type === 'success' ? 'bg-green-400' : 'bg-red-400'}`}
                style={{
                  animation: visible ? 'toast-progress 3.2s linear forwards' : 'none',
                }}
              />
            </div>
          </div>
        </div>
      )}

      <style>{`
        @keyframes toast-progress {
          from { width: 100%; }
          to   { width: 0%; }
        }
      `}</style>
    </ToastContext.Provider>
  );
}

export function useToast() {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error('useToast must be used within ToastProvider');
  return ctx;
}
