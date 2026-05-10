import { useState, FormEvent } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { WarningCircle, Car, Users } from '@phosphor-icons/react';
import api from '../api';
import { useAuth } from '../context/AuthContext';

const DOMAIN = 'ucundinamarca.edu.co';

export default function Register() {
  const [step, setStep] = useState<'role' | 'info'>('role');
  const [role, setRole] = useState<'driver' | 'passenger' | null>(null);
  const [form, setForm] = useState({ name: '', emailUser: '', password: '', phone: '' });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const { login } = useAuth();
  const navigate = useNavigate();

  // El correo completo se arma uniendo la parte local + dominio
  const fullEmail = form.emailUser.trim() ? `${form.emailUser.trim()}@${DOMAIN}` : '';

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!form.emailUser.trim()) {
      setError('Ingresa tu correo institucional');
      return;
    }
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
      setError((err as { response?: { data?: { error?: string } } })?.response?.data?.error || 'Error al registrarse');
    } finally {
      setLoading(false);
    }
  };

  if (step === 'role') {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center px-6 pt-16">
        <div className="w-full max-w-sm">
          <h1 className="text-3xl font-black text-white mb-2">¿Cómo usarás la app?</h1>
          <p className="text-zinc-500 text-sm mb-8">Elige tu rol principal. Podrás cambiarlo después.</p>

          <div className="space-y-3 mb-6">
            <button
              onClick={() => setRole('driver')}
              className={`w-full text-left p-5 rounded-2xl border transition-all ${
                role === 'driver'
                  ? 'bg-white border-white'
                  : 'bg-zinc-900 border-zinc-800 hover:border-zinc-600'
              }`}
            >
              <div className="flex items-center gap-4">
                <div className={`w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0 ${role === 'driver' ? 'bg-black' : 'bg-zinc-800'}`}>
                  <Car size={22} weight="duotone" className={role === 'driver' ? 'text-white' : 'text-zinc-400'} />
                </div>
                <div>
                  <p className={`font-semibold text-base ${role === 'driver' ? 'text-black' : 'text-white'}`}>Soy conductor</p>
                  <p className={`text-sm mt-0.5 ${role === 'driver' ? 'text-zinc-600' : 'text-zinc-500'}`}>
                    Tengo vehículo y quiero ofrecer viajes
                  </p>
                </div>
              </div>
            </button>

            <button
              onClick={() => setRole('passenger')}
              className={`w-full text-left p-5 rounded-2xl border transition-all ${
                role === 'passenger'
                  ? 'bg-white border-white'
                  : 'bg-zinc-900 border-zinc-800 hover:border-zinc-600'
              }`}
            >
              <div className="flex items-center gap-4">
                <div className={`w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0 ${role === 'passenger' ? 'bg-black' : 'bg-zinc-800'}`}>
                  <Users size={22} weight="duotone" className={role === 'passenger' ? 'text-white' : 'text-zinc-400'} />
                </div>
                <div>
                  <p className={`font-semibold text-base ${role === 'passenger' ? 'text-black' : 'text-white'}`}>Soy pasajero</p>
                  <p className={`text-sm mt-0.5 ${role === 'passenger' ? 'text-zinc-600' : 'text-zinc-500'}`}>
                    Busco viajes para compartir trayecto
                  </p>
                </div>
              </div>
            </button>
          </div>

          <button
            disabled={!role}
            onClick={() => setStep('info')}
            className="w-full bg-white text-black font-semibold py-4 rounded-xl hover:bg-zinc-200 disabled:opacity-30 transition-colors text-sm"
          >
            Continuar →
          </button>

          <p className="text-center text-zinc-600 text-sm mt-5">
            ¿Ya tienes cuenta?{' '}
            <Link to="/login" className="text-white font-medium">Inicia sesión</Link>
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-black flex items-center justify-center px-6 pt-16">
      <div className="w-full max-w-sm">
        <button onClick={() => setStep('role')} className="text-zinc-500 text-sm mb-4 hover:text-white transition-colors flex items-center gap-1">
          ← Volver
        </button>
        <h1 className="text-3xl font-black text-white mb-1">Crear cuenta</h1>
        <p className="text-zinc-500 text-sm mb-2">
          {role === 'driver' ? 'Conductor · ' : 'Pasajero · '}
          <span className="text-zinc-400">Solo correo institucional</span>
        </p>
        <form onSubmit={handleSubmit} className="space-y-3">
          <input
            type="text"
            value={form.name}
            onChange={(e) => setForm({ ...form, name: e.target.value })}
            required
            placeholder="Nombre completo"
            autoComplete="name"
            className="w-full bg-zinc-900 text-white placeholder-zinc-500 px-4 py-4 rounded-xl text-sm focus:ring-2 focus:ring-white transition"
          />

          {/* Email dividido: usuario | @dominio fijo */}
          <div className="flex items-stretch bg-zinc-900 rounded-xl overflow-hidden focus-within:ring-2 focus-within:ring-white transition">
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
              className="flex-1 bg-transparent text-white placeholder-zinc-500 px-4 py-4 text-sm outline-none min-w-0"
            />
            <div className="flex items-center pr-4 text-zinc-500 text-sm select-none whitespace-nowrap">
              @{DOMAIN}
            </div>
          </div>
          <input
            type="password"
            value={form.password}
            onChange={(e) => setForm({ ...form, password: e.target.value })}
            required
            placeholder="Contraseña"
            className="w-full bg-zinc-900 text-white placeholder-zinc-500 px-4 py-4 rounded-xl text-sm focus:ring-2 focus:ring-white transition"
          />
          <input
            type="tel"
            value={form.phone}
            onChange={(e) => setForm({ ...form, phone: e.target.value })}
            placeholder="Teléfono (opcional)"
            className="w-full bg-zinc-900 text-white placeholder-zinc-500 px-4 py-4 rounded-xl text-sm focus:ring-2 focus:ring-white transition"
          />

          {error && (
            <p className="text-red-400 text-xs text-center bg-red-900/20 py-2 rounded-lg flex items-center justify-center gap-1.5">
              <WarningCircle size={12} weight="duotone" /> {error}
            </p>
          )}

          <button
            type="submit"
            disabled={loading || !form.emailUser.trim()}
            className="w-full bg-white text-black font-semibold py-4 rounded-xl hover:bg-zinc-200 disabled:opacity-50 transition-colors text-sm mt-2"
          >
            {loading ? 'Creando cuenta...' : 'Crear cuenta'}
          </button>
        </form>

        <p className="text-center text-zinc-600 text-sm mt-5">
          ¿Ya tienes cuenta?{' '}
          <Link to="/login" className="text-white font-medium">Inicia sesión</Link>
        </p>
      </div>
    </div>
  );
}
