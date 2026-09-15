import { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import {
  ArrowLeft, Car, Users, Star, CheckCircle, XCircle, ClockCounterClockwise,
} from '@phosphor-icons/react';
import api from '../api';
import { parseDate } from '../utils/date';
import { apiError } from '../utils/apiError';
import { HistorySkeleton } from '../components/Skeleton';

interface HistoryItem {
  id: number;
  seats: number;
  status: 'completed' | 'cancelled' | 'rejected' | 'expired';
  completed_at: string | null;
  created_at: string;
  origin: string;
  destination: string;
  date: string | null;
  time: string;
  price: number;
  vehicle_type: string;
  role: 'driver' | 'passenger';
  other_name: string;
  amount: number;
  rated: boolean;
}

interface Totals {
  trips_as_driver: number;
  trips_as_passenger: number;
  earned: number;
  spent: number;
  cancelled: number;
}

type Filter = 'all' | 'driver' | 'passenger';

const money = (n: number) => `$${Number(n ?? 0).toLocaleString('es-CO')}`;

const STATUS = {
  completed: { label: 'Completado', cls: 'text-live', Icon: CheckCircle },
  cancelled: { label: 'Cancelado',  cls: 'text-danger',   Icon: XCircle },
  rejected:  { label: 'Rechazado',  cls: 'text-danger',   Icon: XCircle },
  expired:   { label: 'Expirado',   cls: 'text-fg-faint',  Icon: XCircle },
} as const;

export default function History() {
  const navigate = useNavigate();
  const [items, setItems]   = useState<HistoryItem[]>([]);
  const [totals, setTotals] = useState<Totals | null>(null);
  const [filter, setFilter] = useState<Filter>('all');
  const [loading, setLoading] = useState(true);
  const [error, setError]   = useState('');

  useEffect(() => {
    api.get('/bookings/history')
      .then(({ data }) => { setItems(data.items); setTotals(data.totals); })
      .catch((e) => setError(apiError(e, 'No pudimos cargar tu historial')))
      .finally(() => setLoading(false));
  }, []);

  const shown = filter === 'all' ? items : items.filter(i => i.role === filter);

  const formatWhen = (i: HistoryItem) => {
    const d = i.completed_at ? parseDate(i.completed_at) : (i.date ? new Date(i.date + 'T00:00:00') : null);
    if (!d || Number.isNaN(d.getTime())) return i.time;
    return d.toLocaleDateString('es-ES', { day: 'numeric', month: 'short', year: 'numeric' });
  };

  return (
    <div className="min-h-screen bg-canvas pt-20 px-6 pb-12">
      <div className="max-w-sm mx-auto mt-4">
        <button
          onClick={() => navigate(-1)}
          className="flex items-center gap-2 text-fg-faint hover:text-fg transition-colors text-sm mb-6"
        >
          <ArrowLeft size={16} weight="bold" /> Volver
        </button>

        <h1 className="text-2xl font-black text-fg mb-1">Historial</h1>
        <p className="text-fg-faint text-sm mb-6">Todos tus viajes cerrados.</p>

        {loading ? (
          <HistorySkeleton />
        ) : error ? (
          <div className="bg-surface rounded-2xl p-5 text-center">
            <p className="text-fg-muted text-sm">{error}</p>
          </div>
        ) : (
          <>
            {/* Resumen */}
            {totals && (
              <div className="grid grid-cols-2 gap-2 mb-4">
                <div className="bg-surface rounded-2xl p-4">
                  <div className="flex items-center gap-1.5 mb-1">
                    <Car size={13} weight="duotone" className="text-fg-faint" />
                    <p className="text-fg-faint text-[11px] uppercase tracking-wider">Conduciendo</p>
                  </div>
                  <p className="text-fg text-xl font-black tabular-nums">{money(totals.earned)}</p>
                  <p className="text-fg-faint text-xs mt-0.5">
                    {totals.trips_as_driver} viaje{totals.trips_as_driver !== 1 ? 's' : ''}
                  </p>
                </div>
                <div className="bg-surface rounded-2xl p-4">
                  <div className="flex items-center gap-1.5 mb-1">
                    <Users size={13} weight="duotone" className="text-fg-faint" />
                    <p className="text-fg-faint text-[11px] uppercase tracking-wider">Como pasajero</p>
                  </div>
                  <p className="text-fg text-xl font-black tabular-nums">{money(totals.spent)}</p>
                  <p className="text-fg-faint text-xs mt-0.5">
                    {totals.trips_as_passenger} viaje{totals.trips_as_passenger !== 1 ? 's' : ''}
                  </p>
                </div>
              </div>
            )}

            {/* Filtro por rol */}
            {items.some(i => i.role === 'driver') && items.some(i => i.role === 'passenger') && (
              <div className="flex gap-2 mb-4">
                {([
                  { key: 'all',       label: 'Todos' },
                  { key: 'driver',    label: 'Conduje' },
                  { key: 'passenger', label: 'Viajé' },
                ] as const).map(({ key, label }) => (
                  <button
                    key={key}
                    onClick={() => setFilter(key)}
                    className={`px-4 py-1.5 rounded-full text-xs font-medium transition-all border ${
                      filter === key
                        ? 'bg-primary text-on-primary border-primary'
                        : 'bg-transparent text-fg-faint border-line hover:border-line-strong'
                    }`}
                  >
                    {label}
                  </button>
                ))}
              </div>
            )}

            {shown.length === 0 ? (
              <div className="text-center py-14">
                <div className="w-14 h-14 bg-surface rounded-2xl flex items-center justify-center mx-auto mb-4">
                  <ClockCounterClockwise size={24} weight="duotone" className="text-fg-faint" />
                </div>
                <p className="text-fg font-semibold">Todavía no hay viajes</p>
                <p className="text-fg-faint text-sm mt-1 leading-relaxed">
                  Cuando completes uno, aparecerá acá.
                </p>
              </div>
            ) : (
              <div className="space-y-2 stagger">
                {shown.map(item => {
                  const st = STATUS[item.status] ?? STATUS.expired;
                  return (
                    <div key={item.id} className="bg-surface rounded-2xl p-4">
                      <div className="flex items-start justify-between gap-3 mb-2">
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-2 text-sm font-semibold text-fg">
                            <span className="truncate">{item.origin}</span>
                            <span className="text-fg-faint flex-shrink-0">→</span>
                            <span className="truncate">{item.destination}</span>
                          </div>
                          <p className="text-fg-faint text-xs mt-0.5">
                            {formatWhen(item)} · {item.role === 'driver' ? 'Conduje' : 'Viajé'} con {item.other_name.split(' ')[0]}
                          </p>
                        </div>
                        <p className="text-fg font-bold text-sm tabular-nums flex-shrink-0">
                          {money(item.amount)}
                        </p>
                      </div>

                      <div className="flex items-center justify-between gap-2">
                        <span className={`flex items-center gap-1.5 text-xs ${st.cls}`}>
                          <st.Icon size={12} weight="duotone" />
                          {st.label}
                        </span>

                        {item.status === 'completed' && !item.rated && (
                          <Link
                            to={`/rate/${item.id}`}
                            className="flex items-center gap-1 text-xs text-star hover:text-star transition-colors"
                          >
                            <Star size={12} weight="duotone" /> Calificar
                          </Link>
                        )}
                        {item.status === 'completed' && item.rated && (
                          <span className="flex items-center gap-1 text-xs text-fg-faint">
                            <Star size={12} weight="fill" /> Calificado
                          </span>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
