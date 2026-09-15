import { createContext, useContext, useState, useCallback, useRef, useEffect } from 'react';
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

/** Cuánto se queda el aviso en pantalla. La barra se vacía en el mismo tiempo. */
const DURATION = 3200;
/** Espera antes de desmontar: tiene que cubrir la animación de salida más larga. */
const EXIT = 300;

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toast, setToast] = useState<Toast | null>(null);
  const [visible, setVisible] = useState(false);
  const counter = useRef(0);
  const hideTimer = useRef<ReturnType<typeof setTimeout>>();
  const unmountTimer = useRef<ReturnType<typeof setTimeout>>();

  const dismiss = useCallback(() => {
    clearTimeout(hideTimer.current);
    clearTimeout(unmountTimer.current);
    setVisible(false);
    unmountTimer.current = setTimeout(() => setToast(null), EXIT);
  }, []);

  const showToast = useCallback((
    message: string,
    type: 'success' | 'error' = 'success',
    detail?: string,
  ) => {
    // También se cancela el desmontaje pendiente: si llegaba un aviso mientras
    // el anterior salía, ese temporizador lo borraba apenas aparecía.
    clearTimeout(hideTimer.current);
    clearTimeout(unmountTimer.current);

    setToast({ id: ++counter.current, type, message, detail });
    setVisible(true);
    hideTimer.current = setTimeout(dismiss, DURATION);
  }, [dismiss]);

  useEffect(() => () => {
    clearTimeout(hideTimer.current);
    clearTimeout(unmountTimer.current);
  }, []);

  const ok = toast?.type === 'success';

  return (
    <ToastContext.Provider value={{ showToast }}>
      {children}

      {/* Entra y sale igual que la confirmación: el fondo se oscurece y se
          desenfoca, y la tarjeta aparece con un pequeño rebote. Antes el fondo
          solo se oscurecía, y la tarjeta montaba ya visible, así que la entrada
          no tenía animación; solo la salida. */}
      {toast && (
        <div
          className={`fixed inset-0 z-[9999] flex items-center justify-center px-6 scrim
            ${visible ? 'animate-fade' : 'animate-fade-out pointer-events-none'}`}
          onClick={dismiss}
        >
          {/* La clave por id hace que un aviso que reemplaza a otro vuelva a
              entrar y que su barra arranque llena. */}
          <div
            key={toast.id}
            className={`relative bg-surface border border-line rounded-3xl px-8 py-8 w-full max-w-xs
              flex flex-col items-center gap-4 shadow-pop
              ${visible ? 'animate-pop' : 'animate-pop-out'}`}
            onClick={(e) => e.stopPropagation()}
          >
            <button
              onClick={dismiss}
              aria-label="Cerrar"
              className="absolute top-4 right-4 text-fg-faint hover:text-fg transition-colors"
            >
              <X size={18} weight="bold" />
            </button>

            <div className={`w-20 h-20 rounded-full flex items-center justify-center
              ${ok ? 'bg-live-soft' : 'bg-danger-soft'}`}>
              {ok
                ? <CheckCircle size={44} weight="duotone" className="text-live" />
                : <XCircle     size={44} weight="duotone" className="text-danger" />}
            </div>

            <div className="text-center">
              <p className="text-fg font-bold text-lg leading-tight">{toast.message}</p>
              {toast.detail && (
                <p className="text-fg-muted text-sm mt-1">{toast.detail}</p>
              )}
            </div>

            {/* Se anima con transform y no con width: así no recalcula el
                layout en cada cuadro. */}
            <div className="w-full h-1 bg-subtle rounded-full overflow-hidden">
              <div
                className={`h-full w-full rounded-full origin-left ${ok ? 'bg-live' : 'bg-danger'}`}
                style={{ animation: `drain ${DURATION}ms linear forwards` }}
              />
            </div>
          </div>
        </div>
      )}
    </ToastContext.Provider>
  );
}

export function useToast() {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error('useToast must be used within ToastProvider');
  return ctx;
}
