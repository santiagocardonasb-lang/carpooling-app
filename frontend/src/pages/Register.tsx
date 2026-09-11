import { useState, FormEvent } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { WarningCircle, Car, Users, Check, X } from '@phosphor-icons/react';
import api from '../api';
import { useAuth } from '../context/AuthContext';
import PasswordInput from '../components/PasswordInput';
import { checkPassword, passwordError, PASSWORD_MIN } from '../utils/password';
import { apiError } from '../utils/apiError';

const DOMAIN = 'ucundinamarca.edu.co';

function Requirement({ ok, label }: { ok: boolean; label: string }) {
  return (
    <span className={`text-xs flex items-center gap-1.5 ${ok ? 'text-live' : 'text-fg-faint'}`}>
      {ok ? <Check size={11} weight="bold" /> : <X size={11} weight="bold" />}
      {label}
    </span>
  );
}

export default function Register() {
  const [step, setStep] = useState<'role' | 'info'>('role');
  const [role, setRole] = useState<'driver' | 'passenger' | null>(null);
  const [form, setForm] = useState({ name: '', emailUser: '', password: '', confirm: '', phone: '' });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const { login } = useAuth();
  const navigate = useNavigate();

  // El correo completo se arma uniendo la parte local + dominio
  const fullEmail = form.emailUser.trim() ? `${form.emailUser.trim()}@${DOMAIN}` : '';

  const pwCheck         = checkPassword(form.password);
  const pwTouched       = form.password.length > 0;
  const confirmMismatch = form.confirm.length > 0 && form.password !== form.confirm;
  const canSubmit       = !!form.emailUser.trim() && !!form.name.trim()
                          && pwCheck.valid && form.password === form.confirm;

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!form.emailUser.trim()) {
      setError('Ingresa tu correo institucional');
      return;
    }
    const pwErr = passwordError(form.password, form.confirm);
    if (pwErr) { setError(pwErr); return; }

    setError('');
    setLoading(true);
    try {
      const { data } = await api.post('/auth/register', {
        name: form.name,
        email: fullEmail,
        password: form.password,
        phone: form.phone,
        role,
      });
      login(data.token, data.user);
      // Driver → home (publish CTA); Passenger → search
      navigate('/');
    } catch (err: unknown) {
      setError(apiError(err, 'Error al registrarse'));
    } finally {
      setLoading(false);
    }
  };

  if (step === 'role') {
    return (
      <div className="min-h-screen bg-canvas flex justify-center px-6 pt-24 pb-10">
        <div className="w-full max-w-sm">
          <h1 className="text-3xl font-black text-fg mb-2">¿Cómo usarás la app?</h1>
          <p className="text-fg-faint text-sm mb-8">Elige tu rol principal. Podrás cambiarlo después.</p>

          <div className="space-y-3 mb-6">
            <button
              onClick={() => setRole('driver')}
              className={`w-full text-left p-5 rounded-2xl border transition-all ${
                role === 'driver'
                  ? 'bg-primary border-primary'
                  : 'bg-surface border-line hover:border-line-strong'
              }`}
            >
              <div className="flex items-center gap-4">
                <div className={`w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0 ${role === 'driver' ? 'bg-canvas' : 'bg-subtle'}`}>
                  <Car size={22} weight="duotone" className={role === 'driver' ? 'text-fg' : 'text-fg-muted'} />
                </div>
                <div>
                  <p className={`font-semibold text-base ${role === 'driver' ? 'text-on-primary' : 'text-fg'}`}>Soy conductor</p>
                  <p className={`text-sm mt-0.5 ${role === 'driver' ? 'text-fg-faint' : 'text-fg-faint'}`}>
                    Tengo vehículo y quiero ofrecer viajes
                  </p>
                </div>
              </div>
            </button>

            <button
              onClick={() => setRole('passenger')}
              className={`w-full text-left p-5 rounded-2xl border transition-all ${
                role === 'passenger'
                  ? 'bg-primary border-primary'
                  : 'bg-surface border-line hover:border-line-strong'
              }`}
            >
              <div className="flex items-center gap-4">
                <div className={`w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0 ${role === 'passenger' ? 'bg-canvas' : 'bg-subtle'}`}>
                  <Users size={22} weight="duotone" className={role === 'passenger' ? 'text-fg' : 'text-fg-muted'} />
                </div>
                <div>
                  <p className={`font-semibold text-base ${role === 'passenger' ? 'text-on-primary' : 'text-fg'}`}>Soy pasajero</p>
                  <p className={`text-sm mt-0.5 ${role === 'passenger' ? 'text-fg-faint' : 'text-fg-faint'}`}>
                    Busco viajes para compartir trayecto
                  </p>
                </div>
              </div>
            </button>
          </div>

          <button
            disabled={!role}
            onClick={() => setStep('info')}
            className="w-full bg-primary text-on-primary font-semibold py-4 rounded-xl hover:bg-subtle disabled:opacity-30 transition-colors text-sm"
          >
            Continuar →
          </button>

          <p className="text-center text-fg-faint text-sm mt-5">
            ¿Ya tienes cuenta?{' '}
            <Link to="/login" className="text-fg font-medium">Inicia sesión</Link>
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-canvas flex justify-center px-6 pt-24 pb-10">
      <div className="w-full max-w-sm">
        <button onClick={() => setStep('role')} className="text-fg-faint text-sm mb-4 hover:text-fg transition-colors flex items-center gap-1">
          ← Volver
        </button>
        <h1 className="text-3xl font-black text-fg mb-1">Crear cuenta</h1>
        <p className="text-fg-faint text-sm mb-2">
          {role === 'driver' ? 'Conductor · ' : 'Pasajero · '}
          <span className="text-fg-muted">Solo correo institucional</span>
        </p>
        <form onSubmit={handleSubmit} className="space-y-3">
          <input
            type="text"
            value={form.name}
            onChange={(e) => setForm({ ...form, name: e.target.value })}
            required
            placeholder="Nombre completo"
            autoComplete="name"
            className="w-full bg-surface text-fg placeholder-fg-faint px-4 py-4 rounded-xl text-sm focus:ring-2 focus:ring-fg transition"
          />

          {/* Email dividido: usuario | @dominio fijo */}
          <div className="flex items-stretch bg-surface rounded-xl overflow-hidden focus-within:ring-2 focus-within:ring-fg transition">
            <input
              type="text"
              value={form.emailUser}
              onChange={(e) => {
                // No dejar que escriban @ ni espacios
                const val = e.target.value.replace(/[@\s]/g, '');
                setForm({ ...form, emailUser: val });
              }}
              required
              placeholder="usuario"
              autoComplete="username"
              autoCapitalize="none"
              autoCorrect="off"
              spellCheck={false}
              inputMode="email"
              className="flex-1 bg-transparent text-fg placeholder-fg-faint px-4 py-4 text-sm outline-none min-w-0"
            />
            <div className="flex items-center pr-4 text-fg-faint text-sm select-none whitespace-nowrap">
              @{DOMAIN}
            </div>
          </div>

          <PasswordInput
            value={form.password}
            onChange={(v) => setForm({ ...form, password: v })}
            required
            placeholder="Contraseña"
            autoComplete="new-password"
            error={pwTouched && !pwCheck.valid}
          />

          {/* Requisitos en vivo */}
          {pwTouched && (
            <div className="flex flex-wrap gap-x-4 gap-y-1 px-1">
              <Requirement ok={pwCheck.minLength} label={`Mínimo ${PASSWORD_MIN} caracteres`} />
              <Requirement ok={pwCheck.hasNumber} label="Al menos un número" />
            </div>
          )}

          <PasswordInput
            value={form.confirm}
            onChange={(v) => setForm({ ...form, confirm: v })}
            required
            placeholder="Repetir contraseña"
            autoComplete="new-password"
            error={confirmMismatch}
          />
          {confirmMismatch && (
            <p className="text-danger text-xs px-1 flex items-center gap-1.5">
              <X size={11} weight="bold" /> Las contraseñas no coinciden
            </p>
          )}

          <input
            type="tel"
            value={form.phone}
            onChange={(e) => setForm({ ...form, phone: e.target.value })}
            placeholder="Teléfono (opcional)"
            className="w-full bg-surface text-fg placeholder-fg-faint px-4 py-4 rounded-xl text-sm focus:ring-2 focus:ring-fg transition"
          />

          {error && (
            <p className="text-danger text-xs text-center bg-danger-soft py-2 rounded-lg flex items-center justify-center gap-1.5">
              <WarningCircle size={12} weight="duotone" /> {error}
            </p>
          )}

          <button
            type="submit"
            disabled={loading || !canSubmit}
            className="w-full bg-primary text-on-primary font-semibold py-4 rounded-xl hover:bg-subtle disabled:opacity-50 transition-colors text-sm mt-2"
          >
            {loading ? 'Creando cuenta...' : 'Crear cuenta'}
          </button>
        </form>

        <p className="text-center text-fg-faint text-sm mt-5">
          ¿Ya tienes cuenta?{' '}
          <Link to="/login" className="text-fg font-medium">Inicia sesión</Link>
        </p>
      </div>
    </div>
  );
}
