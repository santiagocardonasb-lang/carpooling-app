import { useState, FormEvent } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import api from '../api';
import { useAuth } from '../context/AuthContext';

export default function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [remember, setRemember] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const { login } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const { data } = await api.post('/auth/login', { email, password });
      login(data.token, data.user, remember);
      navigate('/');
    } catch (err: unknown) {
      setError((err as { response?: { data?: { error?: string } } })?.response?.data?.error || 'Credenciales incorrectas');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-black flex items-center justify-center px-6 pt-16">
      <div className="w-full max-w-sm">
        <h1 className="text-3xl font-black text-white mb-1">Bienvenido</h1>
        <p className="text-zinc-500 text-sm mb-8">Ingresa a tu cuenta para continuar</p>

        <form onSubmit={handleSubmit} className="space-y-3">
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            placeholder="Email"
            className="w-full bg-zinc-900 text-white placeholder-zinc-500 px-4 py-4 rounded-xl text-sm focus:ring-2 focus:ring-white focus:ring-offset-0 transition"
          />
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            placeholder="Contraseña"
            className="w-full bg-zinc-900 text-white placeholder-zinc-500 px-4 py-4 rounded-xl text-sm focus:ring-2 focus:ring-white transition"
          />

          <label className="flex items-center gap-2 px-1 cursor-pointer select-none">
            <input
              type="checkbox"
              checked={remember}
              onChange={(e) => setRemember(e.target.checked)}
              className="w-4 h-4 rounded accent-white"
            />
            <span className="text-zinc-500 text-xs">Mantener sesión iniciada en este dispositivo</span>
          </label>

          {error && (
            <p className="text-red-400 text-xs text-center bg-red-900/20 py-2 rounded-lg">{error}</p>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-white text-black font-semibold py-4 rounded-xl hover:bg-zinc-200 disabled:opacity-50 transition-colors text-sm mt-2"
          >
            {loading ? 'Entrando...' : 'Iniciar sesión'}
          </button>
        </form>

        <p className="text-center text-zinc-600 text-sm mt-6">
          ¿Sin cuenta?{' '}
          <Link to="/register" className="text-white font-medium">
            Regístrate
          </Link>
        </p>
      </div>
    </div>
  );
}
