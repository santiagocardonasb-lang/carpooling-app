import { useState, useRef, useEffect } from 'react';
import { EnvelopeSimple, CheckCircle, X } from '@phosphor-icons/react';
import api from '../api';
import { apiError } from '../utils/apiError';
import { useToast } from '../context/ToastContext';

const CODE_LEN = 4;

/**
 * Aviso para confirmar el correo institucional.
 *
 * Es un requisito blando: la app funciona igual sin verificar. El aviso
 * aparece en el perfil y se puede cerrar; bloquear a alguien por un correo
 * que quizá nunca llegó sería peor que el problema que resuelve.
 */
export default function VerifyEmailBanner({ email, onVerified }: {
  email: string;
  onVerified: () => void;
}) {
  const { showToast } = useToast();
  const [open, setOpen]       = useState(false);
  const [digits, setDigits]   = useState<string[]>(Array(CODE_LEN).fill(''));
  const [sending, setSending] = useState(false);
  const [checking, setChecking] = useState(false);
  const [error, setError]     = useState('');
  const [dismissed, setDismissed] = useState(false);
  const boxRefs = useRef<(HTMLInputElement | null)[]>([]);

  useEffect(() => { if (open) boxRefs.current[0]?.focus(); }, [open]);

  const sendCode = async () => {
    setSending(true);
    setError('');
    try {
      await api.post('/auth/send-verification');
      setOpen(true);
      setDigits(Array(CODE_LEN).fill(''));
      showToast('Te enviamos un código a tu correo');
    } catch (e) {
      setError(apiError(e, 'No pudimos enviar el código'));
    } finally {
      setSending(false);
    }
  };

  const submit = async (code: string) => {
    setChecking(true);
    setError('');
    try {
      await api.post('/auth/verify-email', { code });
      showToast('Correo verificado');
      onVerified();
    } catch (e) {
      setError(apiError(e, 'Código incorrecto'));
      setDigits(Array(CODE_LEN).fill(''));
      boxRefs.current[0]?.focus();
    } finally {
      setChecking(false);
    }
  };

  const setDigit = (i: number, value: string) => {
    const clean = value.replace(/\D/g, '');
    if (!clean) {
      setDigits(d => { const n = [...d]; n[i] = ''; return n; });
      return;
    }
    const next = [...digits];
    for (let k = 0; k < clean.length && i + k < CODE_LEN; k++) next[i + k] = clean[k];
    setDigits(next);
    boxRefs.current[Math.min(i + clean.length, CODE_LEN - 1)]?.focus();
    const joined = next.join('');
    if (joined.length === CODE_LEN && !next.includes('')) submit(joined);
  };

  if (dismissed) return null;

  return (
    <div className="bg-yellow-900/20 border border-yellow-800 rounded-2xl p-4 mb-6 animate-rise">
      <div className="flex items-start gap-3">
        <EnvelopeSimple size={18} weight="duotone" className="text-yellow-400 flex-shrink-0 mt-0.5" />
        <div className="flex-1 min-w-0">
          <p className="text-yellow-400 text-sm font-semibold">Verifica tu correo</p>
          <p className="text-yellow-400/70 text-xs mt-1 leading-relaxed">
            Confirma que <span className="font-medium">{email}</span> es tuyo. Le da
            confianza a quienes viajen contigo.
          </p>

          {!open ? (
            <button
              onClick={sendCode}
              disabled={sending}
              className="mt-3 bg-yellow-400 text-black text-xs font-bold px-4 py-2 rounded-xl hover:bg-yellow-300 disabled:opacity-50 transition-colors"
            >
              {sending ? 'Enviando...' : 'Enviarme el código'}
            </button>
          ) : (
            <div className="mt-3">
              <div className="flex gap-2">
                {digits.map((d, i) => (
                  <input
                    key={i}
                    ref={(el) => { boxRefs.current[i] = el; }}
                    value={d}
                    onChange={(e) => setDigit(i, e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Backspace' && !digits[i] && i > 0) boxRefs.current[i - 1]?.focus();
                    }}
                    inputMode="numeric"
                    autoComplete="one-time-code"
                    maxLength={CODE_LEN}
                    disabled={checking}
                    className="w-10 h-12 text-center text-lg font-black tabular-nums rounded-xl bg-zinc-900 text-white outline-none ring-1 ring-zinc-800 focus:ring-2 focus:ring-yellow-400 disabled:opacity-50"
                  />
                ))}
              </div>
              <button
                onClick={sendCode}
                disabled={sending}
                className="mt-2 text-yellow-400/70 hover:text-yellow-400 text-[11px] transition-colors"
              >
                Reenviar código
              </button>
            </div>
          )}

          {error && <p className="text-red-400 text-xs mt-2">{error}</p>}
        </div>

        <button
          onClick={() => setDismissed(true)}
          aria-label="Ocultar aviso"
          className="text-yellow-400/50 hover:text-yellow-400 transition-colors flex-shrink-0"
        >
          <X size={14} weight="bold" />
        </button>
      </div>
    </div>
  );
}

export function VerifiedBadge() {
  return (
    <span className="inline-flex items-center gap-1 text-green-400 text-xs">
      <CheckCircle size={12} weight="duotone" /> Correo verificado
    </span>
  );
}
