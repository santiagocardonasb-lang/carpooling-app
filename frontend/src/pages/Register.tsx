import { useState, FormEvent } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { AlertCircle, Car, Users } from 'lucide-react';
import api from '../api';
import { useAuth } from '../context/AuthContext';

const DOMAIN = '@ucundinamarca.edu.co';

export default function Register() {
  const [step, setStep] = useState<'role' | 'info'>('role');
  const [role, setRole] = useState<'driver' | 'passenger' | null>(null);
  const [form, setForm] = useState({ name: '', email: '', password: '', phone: '' });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const { login } = useAuth();
  const navigate = useNavigate();

  const emailOk = !form.email || form.email.toLowerCase().endsWith(DOMAIN);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!form.email.toLowerCase().endsWith(DOMAIN)) {
      setError(`Solo puedes registrarte con un correo ${DOMAIN}`);
      return;
    }
    setError('');
    setLoading(true);
    try {
      const { data } = await api.post('/auth/register', { ...form, role });
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
                  <Car size={22} className={role === 'driver' ? 'text-white' : 'text-zinc-400'} />
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
                  <Users size={22} className={role === 'passenger' ? 'text-white' : 'text-zinc-400'} />
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
        <div className="flex items-center gap-2 bg-zinc-900 border border-zinc-800 rounded-xl px-3 py-2 mb-5">
          <AlertCircle size={13} className="text-zinc-500 flex-shrink-0" />
          <p className="text-zinc-500 text-xs">Requiere <span className="text-zinc-300 font-medium">{DOMAIN}</span></p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-3">
          <input
            type="text"
            value={form.name}
            onChange={(e) => setForm({ ...form, name: e.target.value })}
            required
            placeholder="Nombre completo"
            className="w-full bg-zinc-900 text-white placeholder-zinc-500 px-4 py-4 rounded-xl text-sm focus:ring-2 focus:ring-white transition"
          />
          <div>
            <input
              type="email"
              value={form.email}
              onChange={(e) => setForm({ ...form, email: e.target.value })}
              required
              placeholder={`correo${DOMAIN}`}
              className={`w-full bg-zinc-900 text-white placeholder-zinc-500 px-4 py-4 rounded-xl text-sm transition ${!emailOk ? 'ring-2 ring-red-500' : 'focus:ring-2 focus:ring-white'}`}
            />
            {!emailOk && (
              <p className="text-red-400 text-xs mt-1.5 flex items-center gap-1.5 px-1">
                <AlertCircle size={11} /> Debe terminar en {DOMAIN}
              </p>
            )}
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
              <AlertCircle size={12} /> {error}
            </p>
          )}

          <button
            type="submit"
            disabled={loading || !emailOk}
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
