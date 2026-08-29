import { useState, useRef, useEffect, FormEvent } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { ArrowLeft, WarningCircle, EnvelopeSimple, CheckCircle, Check, X } from '@phosphor-icons/react';
import api from '../api';
import PasswordInput from '../components/PasswordInput';
import { checkPassword, passwordError, PASSWORD_MIN } from '../utils/password';
import { apiError } from '../utils/apiError';

const DOMAIN = 'ucundinamarca.edu.co';
const CODE_LEN = 4;
const RESEND_SECONDS = 45;

type Step = 'email' | 'code' | 'password' | 'done';

export default function ForgotPassword() {
  const navigate = useNavigate();

  const [step, setStep]         = useState<Step>('email');
  const [emailUser, setEmailUser] = useState('');
  const [digits, setDigits]     = useState<string[]>(Array(CODE_LEN).fill(''));
  const [token, setToken]       = useState('');
  const [password, setPassword] = useState('');
  const [confirm, setConfirm]   = useState('');
  const [error, setError]       = useState('');
  const [loading, setLoading]   = useState(false);
  const [cooldown, setCooldown] = useState(0);

  const boxRefs = useRef<(HTMLInputElement | null)[]>([]);
  const fullEmail = emailUser.trim() ? `${emailUser.trim()}@${DOMAIN}` : '';

  // Cuenta regresiva para poder reenviar el código
  useEffect(() => {
    if (cooldown <= 0) return;
    const t = setTimeout(() => setCooldown(c => c - 1), 1000);
    return () => clearTimeout(t);
  }, [cooldown]);

  useEffect(() => {
    if (step === 'code') boxRefs.current[0]?.focus();
  }, [step]);

  // ── Paso 1: pedir el código ──────────────────────────────────────────────
  const requestCode = async (e?: FormEvent) => {
    e?.preventDefault();
    if (!emailUser.trim()) { setError('Escribe tu usuario institucional'); return; }
    setError('');
    setLoading(true);
    try {
      await api.post('/auth/forgot-password', { email: fullEmail });
      setDigits(Array(CODE_LEN).fill(''));
      setStep('code');
      setCooldown(RESEND_SECONDS);
    } catch (err) {
      setError(apiError(err, 'No pudimos enviar el código. Intenta de nuevo.'));
    } finally {
      setLoading(false);
    }
  };

  // ── Paso 2: verificar el código ──────────────────────────────────────────
  const verifyCode = async (code: string) => {
    setError('');
    setLoading(true);
    try {
      const { data } = await api.post('/auth/verify-reset-code', { email: fullEmail, code });
      setToken(data.token);
      setStep('password');
    } catch (err) {
      setError(apiError(err, 'Código incorrecto'));
      setDigits(Array(CODE_LEN).fill(''));
      boxRefs.current[0]?.focus();
    } finally {
      setLoading(false);
    }
  };

  const setDigit = (i: number, value: string) => {
    const clean = value.replace(/\D/g, '');
    if (!clean) {
      setDigits(d => { const n = [...d]; n[i] = ''; return n; });
      return;
    }
    // Si pegaron varios dígitos, repartirlos desde esta casilla
    const next = [...digits];
    for (let k = 0; k < clean.length && i + k < CODE_LEN; k++) next[i + k] = clean[k];
    setDigits(next);

    const landed = Math.min(i + clean.length, CODE_LEN - 1);
    boxRefs.current[landed]?.focus();

    const joined = next.join('');
    if (joined.length === CODE_LEN && !next.includes('')) verifyCode(joined);
  };

  const onDigitKeyDown = (i: number, e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Backspace' && !digits[i] && i > 0) boxRefs.current[i - 1]?.focus();
    if (e.key === 'ArrowLeft'  && i > 0)             boxRefs.current[i - 1]?.focus();
    if (e.key === 'ArrowRight' && i < CODE_LEN - 1)  boxRefs.current[i + 1]?.focus();
  };

  // ── Paso 3: nueva contraseña ─────────────────────────────────────────────
  const pwCheck  = checkPassword(password);
  const mismatch = confirm.length > 0 && password !== confirm;

  const submitPassword = async (e: FormEvent) => {
    e.preventDefault();
    const pwErr = passwordError(password, confirm);
    if (pwErr) { setError(pwErr); return; }
    setError('');
    setLoading(true);
    try {
      await api.post('/auth/reset-password', { token, new_password: password });
      setStep('done');
    } catch (err) {
      setError(apiError(err, 'No pudimos cambiar la contraseña'));
    } finally {
      setLoading(false);
    }
  };

  const ErrorBox = () => error ? (
    <p className="text-red-400 text-xs text-center bg-red-900/20 py-2 rounded-lg flex items-center justify-center gap-1.5">
      <WarningCircle size={12} weight="duotone" /> {error}
    </p>
  ) : null;

  return (
    <div className="min-h-screen bg-black flex justify-center px-6 pt-24 pb-10">
      <div className="w-full max-w-sm">

        {/* ── Paso 1: correo ── */}
        {step === 'email' && (
          <>
            <Link to="/login" className="text-zinc-500 text-sm mb-4 hover:text-white transition-colors flex items-center gap-1.5">
              <ArrowLeft size={14} weight="bold" /> Volver
            </Link>
            <h1 className="text-3xl font-black text-white mb-1">Recuperar contraseña</h1>
            <p className="text-zinc-500 text-sm mb-6">
              Te enviamos un código de {CODE_LEN} dígitos a tu correo institucional.
            </p>

            <form onSubmit={requestCode} className="space-y-3">
              <div className="flex items-stretch bg-zinc-900 rounded-xl overflow-hidden focus-within:ring-2 focus-within:ring-white transition">
                <input
                  type="text"
                  value={emailUser}
                  onChange={(e) => setEmailUser(e.target.value.replace(/[@\s]/g, ''))}
                  required
                  placeholder="usuario"
                  autoComplete="username"
                  autoCapitalize="none"
                  autoCorrect="off"
                  spellCheck={false}
                  inputMode="email"
                  className="flex-1 bg-transparent text-white placeholder-zinc-500 px-4 py-4 text-sm outline-none min-w-0"
                />
                <div className="flex items-center pr-4 text-zinc-500 text-sm select-none whitespace-nowrap">
                  @{DOMAIN}
                </div>
              </div>

              <ErrorBox />

              <button
                type="submit"
                disabled={loading || !emailUser.trim()}
                className="w-full bg-white text-black font-semibold py-4 rounded-xl hover:bg-zinc-200 disabled:opacity-50 transition-colors text-sm"
              >
                {loading ? 'Enviando...' : 'Enviarme el código'}
              </button>
            </form>
          </>
        )}

        {/* ── Paso 2: código ── */}
        {step === 'code' && (
          <>
            <button
              onClick={() => { setStep('email'); setError(''); }}
              className="text-zinc-500 text-sm mb-4 hover:text-white transition-colors flex items-center gap-1.5"
            >
              <ArrowLeft size={14} weight="bold" /> Cambiar correo
            </button>

            <div className="w-12 h-12 rounded-2xl bg-zinc-900 flex items-center justify-center mb-4">
              <EnvelopeSimple size={22} weight="duotone" className="text-zinc-400" />
            </div>
            <h1 className="text-3xl font-black text-white mb-1">Revisa tu correo</h1>
            <p className="text-zinc-500 text-sm mb-6 leading-relaxed">
              Enviamos un código a <span className="text-white">{fullEmail}</span>.
              Vence en 10 minutos.
            </p>

            <div className="flex justify-center gap-3 mb-5">
              {digits.map((d, i) => (
                <input
                  key={i}
                  ref={(el) => { boxRefs.current[i] = el; }}
                  value={d}
                  onChange={(e) => setDigit(i, e.target.value)}
                  onKeyDown={(e) => onDigitKeyDown(i, e)}
                  inputMode="numeric"
                  autoComplete="one-time-code"
                  maxLength={CODE_LEN}
                  disabled={loading}
                  className={`w-14 h-16 text-center text-2xl font-black tabular-nums rounded-xl bg-zinc-900 text-white outline-none transition disabled:opacity-50 ${
                    error ? 'ring-2 ring-red-500' : d ? 'ring-2 ring-white' : 'ring-1 ring-zinc-800 focus:ring-2 focus:ring-white'
                  }`}
                />
              ))}
            </div>

            <ErrorBox />

            {loading && (
              <p className="text-zinc-500 text-xs text-center mt-3">Verificando...</p>
            )}

            <button
              onClick={() => requestCode()}
              disabled={cooldown > 0 || loading}
              className="w-full text-zinc-500 hover:text-white disabled:hover:text-zinc-500 text-xs py-3 mt-2 transition-colors disabled:opacity-60"
            >
              {cooldown > 0
                ? `Reenviar código en ${cooldown}s`
                : 'No me llegó, reenviar código'}
            </button>

            <p className="text-zinc-700 text-xs text-center leading-relaxed">
              Si no lo ves, revisa la carpeta de spam.
            </p>
          </>
        )}

        {/* ── Paso 3: nueva contraseña ── */}
        {step === 'password' && (
          <>
            <h1 className="text-3xl font-black text-white mb-1">Nueva contraseña</h1>
            <p className="text-zinc-500 text-sm mb-6">Elige una contraseña que no uses en otro sitio.</p>

            <form onSubmit={submitPassword} className="space-y-3">
              <PasswordInput
                value={password}
                onChange={setPassword}
                required
                placeholder="Nueva contraseña"
                autoComplete="new-password"
                error={password.length > 0 && !pwCheck.valid}
              />

              {password.length > 0 && (
                <div className="flex flex-wrap gap-x-4 gap-y-1 px-1">
                  <span className={`text-xs flex items-center gap-1.5 ${pwCheck.minLength ? 'text-green-400' : 'text-zinc-600'}`}>
                    {pwCheck.minLength ? <Check size={11} weight="bold" /> : <X size={11} weight="bold" />}
                    Mínimo {PASSWORD_MIN} caracteres
                  </span>
                  <span className={`text-xs flex items-center gap-1.5 ${pwCheck.hasNumber ? 'text-green-400' : 'text-zinc-600'}`}>
                    {pwCheck.hasNumber ? <Check size={11} weight="bold" /> : <X size={11} weight="bold" />}
                    Al menos un número
                  </span>
                </div>
              )}

              <PasswordInput
                value={confirm}
                onChange={setConfirm}
                required
                placeholder="Repetir contraseña"
                autoComplete="new-password"
                error={mismatch}
              />
              {mismatch && (
                <p className="text-red-400 text-xs px-1 flex items-center gap-1.5">
                  <X size={11} weight="bold" /> Las contraseñas no coinciden
                </p>
              )}

              <ErrorBox />

              <button
                type="submit"
                disabled={loading || !pwCheck.valid || password !== confirm}
                className="w-full bg-white text-black font-semibold py-4 rounded-xl hover:bg-zinc-200 disabled:opacity-50 transition-colors text-sm mt-2"
              >
                {loading ? 'Guardando...' : 'Cambiar contraseña'}
              </button>
            </form>
          </>
        )}

        {/* ── Listo ── */}
        {step === 'done' && (
          <div className="text-center">
            <div className="w-16 h-16 rounded-2xl bg-green-900/20 border border-green-800 flex items-center justify-center mx-auto mb-4">
              <CheckCircle size={30} weight="duotone" className="text-green-400" />
            </div>
            <h1 className="text-2xl font-black text-white mb-2">Contraseña actualizada</h1>
            <p className="text-zinc-500 text-sm mb-8 leading-relaxed">
              Ya puedes iniciar sesión con tu contraseña nueva.
            </p>
            <button
              onClick={() => navigate('/login')}
              className="w-full bg-white text-black font-semibold py-4 rounded-xl hover:bg-zinc-200 transition-colors text-sm"
            >
              Iniciar sesión
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
