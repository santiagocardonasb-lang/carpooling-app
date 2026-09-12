import { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import {
  Plus, MagnifyingGlass, BookOpen, ClockCounterClockwise, SealCheck,
  Car, Users, CaretRight,
} from '@phosphor-icons/react';
import api from '../api';
import { useAuth } from '../context/AuthContext';
import LocationInput from '../components/LocationInput';
import RouteLine from '../components/RouteLine';
import StatusPill from '../components/StatusPill';
import Wordmark from '../components/Wordmark';
import { formatClock } from '../utils/time';

/** Lo mínimo que la portada necesita de un viaje próximo. */
interface NextTrip {
  id: number;
  origin: string;
  destination: string;
  time: string;
  status: string;
  driver_name?: string;
}

export default function Home() {
  const [origin, setOrigin] = useState('');
  const [destination, setDestination] = useState('');
  const [next, setNext] = useState<NextTrip | null>(null);
  const [loadingNext, setLoadingNext] = useState(true);
  const { isAuthenticated, user } = useAuth();
  const navigate = useNavigate();

  const isDriver = user?.role !== 'passenger';

  // El viaje que viene. Son datos que ya existían pero que solo se veían
  // entrando a "Mis viajes"; acá es lo primero que necesita ver alguien que
  // abre la app treinta segundos antes de salir.
  useEffect(() => {
    if (!isAuthenticated) { setLoadingNext(false); return; }
    let alive = true;
    const url = isDriver ? '/rides/my?limit=20' : '/bookings/my?limit=20';
    api.get(url)
      .then(({ data }) => {
        if (!alive) return;
        const activo = (data as NextTrip[]).find(t =>
          ['confirmed', 'in_progress'].includes(t.status)
        ) ?? (data as NextTrip[]).find(t => t.status === 'active') ?? null;
        setNext(activo);
      })
      .catch(() => { /* la portada funciona igual sin esta tarjeta */ })
      .finally(() => { if (alive) setLoadingNext(false); });
    return () => { alive = false; };
  }, [isAuthenticated, isDriver]);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    const params = new URLSearchParams();
    if (origin) params.set('origin', origin);
    if (destination) params.set('destination', destination);
    navigate(`/search?${params}`);
  };

  // ── Sin sesión ────────────────────────────────────────────────────────────
  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-canvas flex flex-col">
        <div className="flex-1 px-5 pt-24 pb-12 max-w-md mx-auto w-full">
          <h1 className="text-4xl font-extrabold text-fg leading-[1.05] tracking-tight mb-2 animate-rise">
            Ve a donde<br />quieras ir.
          </h1>
          <p className="text-fg-muted text-base mb-8 animate-fade">
            Comparte el viaje, divide el costo.
          </p>

          <form onSubmit={handleSearch}
            className="bg-surface rounded-2xl border border-line shadow-float p-2 mb-4">
            <div className="flex items-center px-3 py-3 border-b border-line">
              <LocationInput value={origin} onChange={setOrigin} placeholder="Origen" dot="origin" />
            </div>
            <div className="flex items-center px-3 py-3">
              <LocationInput value={destination} onChange={setDestination} placeholder="¿A dónde vas?" dot="destination" />
            </div>
            <button type="submit"
              className="w-full bg-primary text-on-primary font-bold py-3.5 rounded-xl
                hover:bg-primary/90 transition-colors text-sm">
              Buscar viajes
            </button>
          </form>

          <p className="text-fg-faint text-sm text-center">
            ¿Tienes auto?{' '}
            <Link to="/register" className="text-fg font-bold underline underline-offset-2">
              Publica tu viaje
            </Link>
          </p>
        </div>

        <div className="border-t border-line pt-8 pb-nav px-5">
          <div className="max-w-md mx-auto flex justify-center">
            <Wordmark size="lg" />
          </div>
        </div>
      </div>
    );
  }

  // ── Con sesión ────────────────────────────────────────────────────────────
  const primary = isDriver
    ? { to: '/create-ride', label: 'Publicar un viaje', Icon: Plus }
    : { to: '/search',      label: '¿A dónde vas?',     Icon: MagnifyingGlass };

  return (
    <div className="min-h-screen bg-canvas flex flex-col">
      <div className="flex-1 px-5 pt-20 pb-10 max-w-md mx-auto w-full space-y-5">

        {/* Saludo */}
        <header className="pt-3 animate-rise">
          <h1 className="text-display text-fg">
            Hola, {user?.name?.split(' ')[0]}
          </h1>
          <div className="flex items-center gap-1.5 mt-1">
            {isDriver
              ? <Car size={15} weight="fill" className="text-fg-muted" />
              : <Users size={15} weight="fill" className="text-fg-muted" />}
            <span className="text-xs font-semibold text-fg-muted">
              {isDriver ? 'Conductor' : 'Pasajero'}
            </span>
            {user?.email_verified === true && (
              <>
                <span className="text-fg-faint" aria-hidden>·</span>
                <span className="flex items-center gap-1 text-xs font-semibold text-fg-muted">
                  <SealCheck size={14} weight="fill" /> Verificado
                </span>
              </>
            )}
          </div>
        </header>

        {/* Acción principal, con el peso visual de una barra de búsqueda */}
        <button
          onClick={() => navigate(primary.to)}
          className="w-full flex items-center justify-between gap-3 p-3 pl-4 rounded-full
            bg-subtle border border-line hover:border-fg-faint transition-colors text-left animate-rise"
        >
          <span className="flex items-center gap-3 min-w-0">
            <span className="w-9 h-9 rounded-full bg-primary text-on-primary
              flex items-center justify-center flex-shrink-0">
              <primary.Icon size={18} weight="bold" />
            </span>
            <span className="text-base font-extrabold text-fg tracking-tight truncate">
              {primary.label}
            </span>
          </span>
          <CaretRight size={18} weight="bold" className="text-fg-faint flex-shrink-0" />
        </button>

        {/* Accesos secundarios */}
        <div className="grid grid-cols-2 gap-2.5">
          {[
            { to: '/my-rides', Icon: BookOpen,
              label: isDriver ? 'Mis viajes' : 'Mis reservas',
              sub: isDriver ? 'Publicados' : 'Confirmadas' },
            { to: '/history', Icon: ClockCounterClockwise,
              label: 'Historial', sub: 'Viajes cerrados' },
          ].map(({ to, Icon, label, sub }) => (
            <Link key={to} to={to}
              className="flex items-center gap-2.5 p-3 rounded-xl bg-surface border border-line
                shadow-card hover:shadow-float transition-shadow">
              <span className="w-8 h-8 rounded-lg bg-subtle text-fg
                flex items-center justify-center flex-shrink-0">
                <Icon size={17} weight="bold" />
              </span>
              <span className="flex flex-col min-w-0">
                <span className="text-[13px] font-bold text-fg leading-tight truncate">{label}</span>
                <span className="text-[11px] text-fg-faint truncate">{sub}</span>
              </span>
            </Link>
          ))}
        </div>

        {/* Lo que viene */}
        <section className="space-y-2.5">
          <div className="flex items-center justify-between px-0.5">
            <h2 className="text-[15px] font-bold text-fg tracking-tight">
              {isDriver ? 'Tu próximo viaje publicado' : 'Tu próximo viaje'}
            </h2>
            {next && <StatusPill status={next.status === 'active' ? 'confirmed' : next.status} />}
          </div>

          {loadingNext ? (
            <div className="skeleton h-28 rounded-2xl" />
          ) : next ? (
            <div className="bg-surface rounded-2xl border border-line shadow-card p-4 space-y-3.5">
              <div className="flex items-baseline gap-1.5">
                <span className="text-hero text-fg tabular-nums">{formatClock(next.time).time}</span>
                <span className="text-xs font-extrabold text-fg-faint">{formatClock(next.time).suffix}</span>
                {next.driver_name && (
                  <span className="text-xs text-fg-faint ml-auto truncate">
                    con {next.driver_name.split(' ')[0]}
                  </span>
                )}
              </div>

              <div className="bg-subtle rounded-xl p-3">
                <RouteLine origin={next.origin} destination={next.destination} originTime={next.time} />
              </div>

              <Link
                to={next.status === 'in_progress' ? `/trip/${next.id}` : '/my-rides'}
                className="w-full flex items-center justify-center gap-2 py-3 rounded-xl
                  bg-primary text-on-primary font-bold text-[13px] hover:bg-primary/90 transition-colors"
              >
                {next.status === 'in_progress' ? 'Ver viaje en curso' : 'Ver detalles'}
                <CaretRight size={15} weight="bold" />
              </Link>
            </div>
          ) : (
            <div className="bg-surface rounded-2xl border border-line p-6 text-center">
              <p className="text-fg font-bold text-sm">
                {isDriver ? 'No tienes viajes publicados' : 'No tienes viajes reservados'}
              </p>
              <p className="text-fg-faint text-xs mt-1 leading-relaxed">
                {isDriver
                  ? 'Publica tu ruta y comparte los gastos del trayecto.'
                  : 'Busca tu ruta y reserva un cupo con alguien de la universidad.'}
              </p>
            </div>
          )}
        </section>
      </div>

      <div className="border-t border-line pt-7 pb-nav px-5">
        <div className="max-w-md mx-auto flex justify-center">
          <Wordmark size="lg" />
        </div>
      </div>
    </div>
  );
}
