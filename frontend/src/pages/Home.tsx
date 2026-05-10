import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import LocationInput from '../components/LocationInput';
import { Plus, MagnifyingGlass } from '@phosphor-icons/react';

export default function Home() {
  const [origin, setOrigin] = useState('');
  const [destination, setDestination] = useState('');
  const { isAuthenticated, user } = useAuth();
  const navigate = useNavigate();

  const isDriver = user?.role !== 'passenger';

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    const params = new URLSearchParams();
    if (origin) params.set('origin', origin);
    if (destination) params.set('destination', destination);
    navigate(`/search?${params}`);
  };

  // ── Driver home ──────────────────────────────────────────────────────────
  if (isAuthenticated && isDriver) {
    return (
      <div className="min-h-screen bg-black flex flex-col">
        <div className="flex-1 flex flex-col px-6 pt-24 pb-12 max-w-2xl mx-auto w-full">
          <h1 className="text-5xl md:text-6xl font-black text-white leading-tight mb-3">
            Hola, {user?.name?.split(' ')[0]}.
          </h1>
          <p className="text-zinc-500 text-lg mb-10">
            Publica tu ruta y gana dinero en cada viaje.
          </p>

          <button
            onClick={() => navigate('/create-ride')}
            className="w-full bg-white text-black font-semibold py-4 rounded-2xl hover:bg-zinc-200 transition-colors text-sm flex items-center justify-center gap-2 mb-3"
          >
            <Plus size={16} weight="bold" />
            Publicar un viaje
          </button>

          <button
            onClick={() => navigate('/my-rides')}
            className="w-full border border-zinc-800 text-zinc-400 font-medium py-4 rounded-2xl hover:border-zinc-600 hover:text-white transition-colors text-sm"
          >
            Ver mis viajes publicados
          </button>
        </div>

        <div className="border-t border-zinc-900 py-8">
          <div className="max-w-2xl mx-auto px-6 grid grid-cols-3 gap-4 text-center">
            {[
              { value: '50%', label: 'menos en gastos' },
              { value: 'CO₂', label: 'menos emisiones' },
              { value: '100%', label: 'gratuito' },
            ].map(({ value, label }) => (
              <div key={label}>
                <p className="text-white font-bold text-xl">{value}</p>
                <p className="text-zinc-600 text-xs mt-1">{label}</p>
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  // ── Passenger home ──────────────────────────────────────────────────────
  if (isAuthenticated && !isDriver) {
    return (
      <div className="min-h-screen bg-black flex flex-col">
        <div className="flex-1 flex flex-col px-6 pt-24 pb-12 max-w-2xl mx-auto w-full">
          <h1 className="text-5xl md:text-6xl font-black text-white leading-tight mb-3">
            Hola, {user?.name?.split(' ')[0]}.
          </h1>
          <p className="text-zinc-500 text-lg mb-10">
            Encuentra tu próximo viaje compartido.
          </p>

          <button
            onClick={() => navigate('/search')}
            className="w-full bg-white text-black font-semibold py-4 rounded-2xl hover:bg-zinc-200 transition-colors text-sm flex items-center justify-center gap-2 mb-3"
          >
            <MagnifyingGlass size={16} weight="duotone" />
            Buscar viaje
          </button>

          <button
            onClick={() => navigate('/my-rides')}
            className="w-full border border-zinc-800 text-zinc-400 font-medium py-4 rounded-2xl hover:border-zinc-600 hover:text-white transition-colors text-sm"
          >
            Ver mis reservas
          </button>
        </div>

        <div className="border-t border-zinc-900 py-8">
          <div className="max-w-2xl mx-auto px-6 grid grid-cols-3 gap-4 text-center">
            {[
              { value: '50%', label: 'menos en gastos' },
              { value: 'CO₂', label: 'menos emisiones' },
              { value: '100%', label: 'gratuito' },
            ].map(({ value, label }) => (
              <div key={label}>
                <p className="text-white font-bold text-xl">{value}</p>
                <p className="text-zinc-600 text-xs mt-1">{label}</p>
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  // ── Unauthenticated fallback (shouldn't normally reach here) ─────────────
  return (
    <div className="min-h-screen bg-black flex flex-col">
      <div className="flex-1 flex flex-col px-6 pt-24 pb-12 max-w-2xl mx-auto w-full">
        <h1 className="text-5xl md:text-6xl font-black text-white leading-tight mb-3">
          Ve a donde<br />quieras ir.
        </h1>
        <p className="text-zinc-500 text-lg mb-10">
          Comparte el viaje, divide el costo.
        </p>

        <form onSubmit={handleSearch} className="bg-zinc-900 rounded-2xl overflow-visible">
          <div className="flex items-center px-5 py-4 border-b border-zinc-800">
            <LocationInput value={origin} onChange={setOrigin} placeholder="Origen" dot="origin" />
          </div>
          <div className="flex items-center px-5 py-4">
            <LocationInput value={destination} onChange={setDestination} placeholder="¿A dónde vas?" dot="destination" />
          </div>
          <div className="px-4 pb-4">
            <button type="submit" className="w-full bg-white text-black font-semibold py-3.5 rounded-xl hover:bg-zinc-200 transition-colors text-sm">
              Buscar viajes
            </button>
          </div>
        </form>

        <p className="text-zinc-600 text-sm mt-6 text-center">
          ¿Tienes auto?{' '}
          <button onClick={() => navigate('/register')} className="text-white underline underline-offset-2">
            Publica tu viaje y gana dinero
          </button>
        </p>
      </div>

      <div className="border-t border-zinc-900 py-8">
        <div className="max-w-2xl mx-auto px-6 grid grid-cols-3 gap-4 text-center">
          {[
            { value: '50%', label: 'menos en gastos' },
            { value: 'CO₂', label: 'menos emisiones' },
            { value: '100%', label: 'gratuito' },
          ].map(({ value, label }) => (
            <div key={label}>
              <p className="text-white font-bold text-xl">{value}</p>
              <p className="text-zinc-600 text-xs mt-1">{label}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
