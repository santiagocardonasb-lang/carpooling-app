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
      <div className="min-h-screen bg-canvas flex flex-col">
        <div className="flex-1 flex flex-col px-6 pt-24 pb-12 max-w-2xl mx-auto w-full">
          <p className="display-serif text-3xl text-fg-faint mb-1 animate-fade">Hola,</p>
          <h1 className="text-5xl md:text-6xl font-extrabold text-fg leading-[0.95] mb-3 animate-rise">
            {user?.name?.split(' ')[0]}.
          </h1>
          <p className="text-fg-faint text-lg mb-10">
            Publica tu ruta y gana dinero en cada viaje.
          </p>

          <button
            onClick={() => navigate('/create-ride')}
            className="w-full bg-primary text-on-primary font-semibold py-4 rounded-2xl hover:bg-subtle transition-colors text-sm flex items-center justify-center gap-2 mb-3"
          >
            <Plus size={16} weight="bold" />
            Publicar un viaje
          </button>

          <button
            onClick={() => navigate('/my-rides')}
            className="w-full border border-line text-fg-muted font-medium py-4 rounded-2xl hover:border-line-strong hover:text-fg transition-colors text-sm"
          >
            Ver mis viajes publicados
          </button>
        </div>

        <div className="border-t border-line py-8">
          <div className="max-w-2xl mx-auto px-6 grid grid-cols-3 gap-4 text-center">
            {[
              { value: '50%', label: 'menos en gastos' },
              { value: 'CO₂', label: 'menos emisiones' },
              { value: '100%', label: 'gratuito' },
            ].map(({ value, label }) => (
              <div key={label}>
                <p className="text-fg font-bold text-xl">{value}</p>
                <p className="text-fg-faint text-xs mt-1">{label}</p>
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
      <div className="min-h-screen bg-canvas flex flex-col">
        <div className="flex-1 flex flex-col px-6 pt-24 pb-12 max-w-2xl mx-auto w-full">
          <p className="display-serif text-3xl text-fg-faint mb-1 animate-fade">Hola,</p>
          <h1 className="text-5xl md:text-6xl font-extrabold text-fg leading-[0.95] mb-3 animate-rise">
            {user?.name?.split(' ')[0]}.
          </h1>
          <p className="text-fg-faint text-lg mb-10">
            Encuentra tu próximo viaje compartido.
          </p>

          <button
            onClick={() => navigate('/search')}
            className="w-full bg-primary text-on-primary font-semibold py-4 rounded-2xl hover:bg-subtle transition-colors text-sm flex items-center justify-center gap-2 mb-3"
          >
            <MagnifyingGlass size={16} weight="duotone" />
            Buscar viaje
          </button>

          <button
            onClick={() => navigate('/my-rides')}
            className="w-full border border-line text-fg-muted font-medium py-4 rounded-2xl hover:border-line-strong hover:text-fg transition-colors text-sm"
          >
            Ver mis reservas
          </button>
        </div>

        <div className="border-t border-line py-8">
          <div className="max-w-2xl mx-auto px-6 grid grid-cols-3 gap-4 text-center">
            {[
              { value: '50%', label: 'menos en gastos' },
              { value: 'CO₂', label: 'menos emisiones' },
              { value: '100%', label: 'gratuito' },
            ].map(({ value, label }) => (
              <div key={label}>
                <p className="text-fg font-bold text-xl">{value}</p>
                <p className="text-fg-faint text-xs mt-1">{label}</p>
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  // ── Unauthenticated fallback (shouldn't normally reach here) ─────────────
  return (
    <div className="min-h-screen bg-canvas flex flex-col">
      <div className="flex-1 flex flex-col px-6 pt-24 pb-12 max-w-2xl mx-auto w-full">
        <h1 className="text-5xl md:text-6xl font-extrabold text-fg leading-[0.95] mb-3 animate-rise">
          Ve a donde<br /><span className="display-serif font-normal">quieras ir.</span>
        </h1>
        <p className="text-fg-faint text-lg mb-10 animate-fade">
          Comparte el viaje, divide el costo.
        </p>

        <form onSubmit={handleSearch} className="bg-surface rounded-2xl overflow-visible">
          <div className="flex items-center px-5 py-4 border-b border-line">
            <LocationInput value={origin} onChange={setOrigin} placeholder="Origen" dot="origin" />
          </div>
          <div className="flex items-center px-5 py-4">
            <LocationInput value={destination} onChange={setDestination} placeholder="¿A dónde vas?" dot="destination" />
          </div>
          <div className="px-4 pb-4">
            <button type="submit" className="w-full bg-primary text-on-primary font-semibold py-3.5 rounded-xl hover:bg-subtle transition-colors text-sm">
              Buscar viajes
            </button>
          </div>
        </form>

        <p className="text-fg-faint text-sm mt-6 text-center">
          ¿Tienes auto?{' '}
          <button onClick={() => navigate('/register')} className="text-fg underline underline-offset-2">
            Publica tu viaje y gana dinero
          </button>
        </p>
      </div>

      <div className="border-t border-line py-8">
        <div className="max-w-2xl mx-auto px-6 grid grid-cols-3 gap-4 text-center">
          {[
            { value: '50%', label: 'menos en gastos' },
            { value: 'CO₂', label: 'menos emisiones' },
            { value: '100%', label: 'gratuito' },
          ].map(({ value, label }) => (
            <div key={label}>
              <p className="text-fg font-bold text-xl">{value}</p>
              <p className="text-fg-faint text-xs mt-1">{label}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
