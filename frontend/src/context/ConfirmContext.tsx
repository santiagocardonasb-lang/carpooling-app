import { createContext, useContext, useState, useCallback, useRef, ReactNode, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { WarningCircle } from '@phosphor-icons/react';

interface ConfirmOptions {
  title: string;
  message?: string;
  confirmText?: string;
  cancelText?: string;
  /** Pinta el botón principal en rojo, para acciones que destruyen algo. */
  danger?: boolean;
}

type Resolver = (ok: boolean) => void;

const ConfirmCtx = createContext<(o: ConfirmOptions) => Promise<boolean>>(
  async () => false
);

export function ConfirmProvider({ children }: { children: ReactNode }) {
  const [opts, setOpts] = useState<ConfirmOptions | null>(null);
  const resolverRef = useRef<Resolver | null>(null);

  const confirm = useCallback((o: ConfirmOptions) => {
    setOpts(o);
    return new Promise<boolean>((resolve) => { resolverRef.current = resolve; });
  }, []);

  const close = useCallback((ok: boolean) => {
    resolverRef.current?.(ok);
    resolverRef.current = null;
    setOpts(null);
  }, []);

  // Escape cancela; bloquear el scroll de fondo mientras está abierto
  useEffect(() => {
    if (!opts) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') close(false);
      if (e.key === 'Enter')  close(true);
    };
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    document.addEventListener('keydown', onKey);
    return () => {
      document.body.style.overflow = prev;
      document.removeEventListener('keydown', onKey);
    };
  }, [opts, close]);

  return (
    <ConfirmCtx.Provider value={confirm}>
      {children}
      {opts && createPortal(
        <div
          className="fixed inset-0 z-[500] flex items-end sm:items-center justify-center bg-black/70 backdrop-blur-md p-4 animate-fade"
          onClick={() => close(false)}
          style={{ paddingBottom: 'max(1rem, env(safe-area-inset-bottom, 0px))' }}
        >
          <div
            role="alertdialog"
            aria-modal="true"
            onClick={(e) => e.stopPropagation()}
            className="glass w-full sm:max-w-sm rounded-3xl overflow-hidden animate-pop"
          >
            <div className="px-6 pt-6 pb-5 text-center">
              <div className={`w-12 h-12 rounded-2xl mx-auto mb-4 flex items-center justify-center ${
                opts.danger ? 'bg-danger-soft' : 'bg-subtle'
              }`}>
                <WarningCircle
                  size={24}
                  weight="duotone"
                  className={opts.danger ? 'text-danger' : 'text-fg-muted'}
                />
              </div>
              <h2 className="text-fg font-bold text-lg leading-snug">{opts.title}</h2>
              {opts.message && (
                <p className="text-fg-muted text-sm mt-2 leading-relaxed">{opts.message}</p>
              )}
            </div>

            <div className="px-4 pb-4 grid grid-cols-2 gap-2">
              <button
                onClick={() => close(false)}
                className="py-3.5 rounded-2xl text-sm font-semibold bg-subtle text-fg hover:bg-line-strong"
              >
                {opts.cancelText || 'Cancelar'}
              </button>
              <button
                autoFocus
                onClick={() => close(true)}
                className={`py-3.5 rounded-2xl text-sm font-bold ${
                  opts.danger
                    ? 'bg-notify text-fg hover:bg-notify'
                    : 'bg-primary text-on-primary hover:bg-primary/90'
                }`}
              >
                {opts.confirmText || 'Confirmar'}
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}
    </ConfirmCtx.Provider>
  );
}

export const useConfirm = () => useContext(ConfirmCtx);
