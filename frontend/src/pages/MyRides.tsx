import { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import api from '../api';
import RideCard from '../components/RideCard';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';

const DAY_NAMES = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'];

interface Ride {
  id: number;
  origin: string;
  destination: string;
  date?: string;
  time: string;
  seats: number;
  seats_available: number;
  price: number;
  driver_name: string;
  description?: string;
  driver_id: number;
  status: string;
  vehicle_type: string;
  is_recurring: number;
  days_of_week?: string;
  pending_requests: number;
  confirmed_passengers: number;
}

interface Booking {
  id: number;
  origin: string;
  destination: string;
  date?: string;
  time: string;
  price: number;
  driver_name: string;
  driver_phone: string;
  status: string;
  seats: number;
  proposed_time?: string;
  is_recurring: number;
  days_of_week?: string;
  booking_date?: string;
  booking_days?: string;
  car_brand?: string;
  car_color?: string;
  car_plate?: string;
}

interface Request {
  id: number;
  ride_id: number;
  passenger_name: string;
  passenger_phone: string;
  passenger_email: string;
  seats: number;
  proposed_time?: string;
  booking_date?: string;
  booking_days?: string;
  status: string;
  created_at: string;
  // ride info (from my/requests endpoint)
  origin?: string;
  destination?: string;
  time?: string;
  date?: string;
  is_recurring?: number;
  days_of_week?: string;
}

export default function MyRides() {
  const { user } = useAuth();
  const isDriver = user?.role !== 'passenger';
  const { showToast } = useToast();

  const [tab, setTab] = useState<'rides' | 'requests'>('rides');
  const [myRides, setMyRides] = useState<Ride[]>([]);
  const [allRequests, setAllRequests] = useState<Request[]>([]);
  const [myBookings, setMyBookings] = useState<Booking[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      if (isDriver) {
        const [ridesRes, reqRes] = await Promise.all([
          api.get('/rides/my'),
          api.get('/rides/my/requests'),
        ]);
        setMyRides(ridesRes.data);
        setAllRequests(reqRes.data);
      } else {
        const { data } = await api.get('/bookings/my');
        setMyBookings(data);
      }
    } finally {
      setLoading(false);
    }
  }, [isDriver]);

  useEffect(() => { fetchData(); }, [fetchData]);

  const handleAccept = async (bookingId: number) => {
    try {
      await api.patch(`/bookings/${bookingId}/accept`);
      showToast('Solicitud aceptada');
      fetchData();
    } catch (err: unknown) {
      showToast((err as { response?: { data?: { error?: string } } })?.response?.data?.error || 'Error al aceptar', 'error');
    }
  };

  const handleReject = async (bookingId: number) => {
    if (!confirm('¿Rechazar esta solicitud?')) return;
    try {
      await api.patch(`/bookings/${bookingId}/reject`);
      showToast('Solicitud rechazada');
      fetchData();
    } catch {
      showToast('Error al rechazar', 'error');
    }
  };

  const cancelBooking = async (id: number) => {
    if (!confirm('¿Cancelar esta reserva?')) return;
    try {
      await api.delete(`/bookings/${id}`);
      showToast('Reserva cancelada');
      fetchData();
    } catch {
      showToast('Error al cancelar', 'error');
    }
  };

  const formatDate = (d?: string) => {
    if (!d) return null;
    return new Date(d + 'T00:00:00').toLocaleDateString('es-ES', { weekday: 'short', day: 'numeric', month: 'short' });
  };

  const formatDays = (daysStr?: string) => {
    if (!daysStr) return '';
    return daysStr.split(',').map(d => DAY_NAMES[Number(d)]).join(' · ');
  };

  const activeRides    = myRides.filter(r => r.status === 'active');
  const activeBookings = myBookings.filter(b => b.status !== 'cancelled');
  const pendingCount   = allRequests.filter(r => r.status === 'pending').length;

  // ── Passenger view ────────────────────────────────────────────────────────
  if (!isDriver) {
    return (
      <div className="min-h-screen bg-black pt-20 px-6 pb-10">
        <div className="max-w-xl mx-auto mt-4">
          <h1 className="text-2xl font-black text-white mb-6">Mis reservas</h1>
          {loading ? (
            <div className="text-center py-16 text-zinc-700 text-sm">Cargando...</div>
          ) : activeBookings.length === 0 ? (
            <div className="text-center py-16">
              <p className="text-zinc-600 font-semibold">No tienes reservas</p>
              <Link to="/search" className="text-white text-sm underline underline-offset-2 mt-2 block">
                Buscar un viaje →
              </Link>
            </div>
          ) : (
            <div className="space-y-3">
              {activeBookings.map((b) => (
                <div key={b.id} className="bg-zinc-900 rounded-2xl p-5 border border-zinc-800">
                  <div className="flex items-start justify-between mb-2 gap-2">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 text-sm font-semibold text-white">
                        <span className="truncate">{b.origin}</span>
                        <span className="text-zinc-600 flex-shrink-0">→</span>
                        <span className="truncate">{b.destination}</span>
                      </div>
                      <p className="text-zinc-500 text-xs mt-1">
                        {b.is_recurring
                          ? b.booking_date ? `Desde ${formatDate(b.booking_date)}` : `Recurrente · ${formatDays(b.days_of_week)}`
                          : formatDate(b.date)}
                        {' · '}{b.time} · {b.driver_name}
                        {b.driver_phone && ` · ${b.driver_phone}`}
                      </p>
                      {(b.car_brand || b.car_color || b.car_plate) && (
                        <p className="text-zinc-600 text-xs mt-0.5">
                          {[b.car_brand, b.car_color, b.car_plate].filter(Boolean).join(' · ')}
                        </p>
                      )}
                      {b.booking_days && (
                        <p className="text-zinc-400 text-xs mt-0.5">
                          Días: {b.booking_days.split(',').map(d => DAY_NAMES[Number(d)]).join(', ')}
                        </p>
                      )}
                      {b.proposed_time && (
                        <p className="text-zinc-400 text-xs mt-0.5">Tu hora propuesta: {b.proposed_time}</p>
                      )}
                    </div>
                    <span className={`text-xs font-medium px-2.5 py-1 rounded-full flex-shrink-0 ${
                      b.status === 'confirmed' ? 'bg-green-900/40 text-green-400' :
                      b.status === 'pending'   ? 'bg-yellow-900/30 text-yellow-400' :
                      'bg-zinc-800 text-zinc-500'
                    }`}>
                      {b.status === 'confirmed' ? 'Confirmado' : b.status === 'pending' ? 'Pendiente' : b.status === 'rejected' ? 'Rechazado' : 'Cancelado'}
                    </span>
                  </div>
                  <div className="flex items-center justify-between mt-3">
                    <p className="text-white font-bold text-sm">
                      ${b.price.toLocaleString()} · {b.seats} asiento{b.seats !== 1 ? 's' : ''}
                    </p>
                    {['pending', 'confirmed'].includes(b.status) && (
                      <button onClick={() => cancelBooking(b.id)} className="text-xs text-red-500 hover:text-red-400 transition-colors">
                        Cancelar reserva
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    );
  }

  // ── Driver view ───────────────────────────────────────────────────────────
  return (
    <div className="min-h-screen bg-black pt-20 px-6 pb-10">
      <div className="max-w-xl mx-auto mt-4">

        {/* Header */}
        <div className="flex items-center justify-between mb-5">
          <h1 className="text-2xl font-black text-white">Mis viajes</h1>
          <Link to="/create-ride" className="bg-white text-black text-xs font-semibold px-4 py-2 rounded-full hover:bg-zinc-200 transition-colors">
            + Publicar
          </Link>
        </div>

        {/* Tabs */}
        <div className="flex gap-1 bg-zinc-900 p-1 rounded-xl mb-5">
          <button
            onClick={() => setTab('rides')}
            className={`flex-1 py-2 rounded-lg text-sm font-medium transition-all ${
              tab === 'rides' ? 'bg-white text-black' : 'text-zinc-500 hover:text-white'
            }`}
          >
            Mis viajes
          </button>
          <button
            onClick={() => setTab('requests')}
            className={`flex-1 py-2 rounded-lg text-sm font-medium transition-all flex items-center justify-center gap-2 ${
              tab === 'requests' ? 'bg-white text-black' : 'text-zinc-500 hover:text-white'
            }`}
          >
            Solicitudes
            {pendingCount > 0 && (
              <span className={`text-xs font-bold px-1.5 py-0.5 rounded-full min-w-[20px] text-center ${
                tab === 'requests' ? 'bg-black text-white' : 'bg-yellow-400 text-black'
              }`}>
                {pendingCount}
              </span>
            )}
          </button>
        </div>

        {loading ? (
          <div className="text-center py-16 text-zinc-700 text-sm">Cargando...</div>
        ) : tab === 'rides' ? (
          /* ── Tab: Mis viajes ── */
          activeRides.length === 0 ? (
            <div className="text-center py-16">
              <p className="text-zinc-600 font-semibold">No has publicado viajes</p>
              <Link to="/create-ride" className="text-white text-sm underline underline-offset-2 mt-2 block">
                Publicar ahora →
              </Link>
            </div>
          ) : (
            <div className="space-y-3">
              {activeRides.map((ride) => (
                <RideCard
                  key={ride.id}
                  ride={{
                    ...ride,
                    days_label: ride.is_recurring && ride.days_of_week ? formatDays(ride.days_of_week) : undefined,
                  }}
                  showActions
                  onCancel={fetchData}
                />
              ))}
            </div>
          )
        ) : (
          /* ── Tab: Solicitudes ── */
          allRequests.length === 0 ? (
            <div className="text-center py-16">
              <p className="text-zinc-600 font-semibold">No hay solicitudes</p>
              <p className="text-zinc-700 text-sm mt-1">Aquí aparecerán las reservas de los pasajeros</p>
            </div>
          ) : (
            <div className="space-y-3">
              {allRequests.map((req) => (
                <div key={req.id} className="bg-zinc-900 rounded-2xl border border-zinc-800 overflow-hidden">
                  {/* Ride info header */}
                  <div className="px-4 py-3 border-b border-zinc-800 bg-zinc-800/50">
                    <div className="flex items-center gap-2 text-sm font-semibold text-white">
                      <span>{req.origin}</span>
                      <span className="text-zinc-600">→</span>
                      <span>{req.destination}</span>
                    </div>
                    <p className="text-zinc-500 text-xs mt-0.5">
                      {req.is_recurring ? `Recurrente · ${formatDays(req.days_of_week)}` : formatDate(req.date)}
                      {req.time && ` · ${req.time}`}
                    </p>
                  </div>

                  {/* Passenger info */}
                  <div className="px-4 py-4">
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex-1 min-w-0">
                        <p className="text-white text-sm font-semibold">{req.passenger_name}</p>
                        <div className="flex flex-wrap gap-x-3 gap-y-0.5 mt-1 text-xs text-zinc-500">
                          <span>{req.seats} asiento{req.seats !== 1 ? 's' : ''}</span>
                          {req.booking_date && (
                            <span className="text-zinc-300">
                              Desde {formatDate(req.booking_date)}
                            </span>
                          )}
                          {req.booking_days && (
                            <span className="text-zinc-300">
                              Días: {req.booking_days.split(',').map(d => DAY_NAMES[Number(d)]).join(', ')}
                            </span>
                          )}
                          {req.proposed_time && <span>Hora propuesta: {req.proposed_time}</span>}
                          {req.passenger_phone && <span>{req.passenger_phone}</span>}
                          {req.passenger_email && <span className="text-zinc-600">{req.passenger_email}</span>}
                        </div>
                      </div>

                      {req.status === 'pending' ? (
                        <div className="flex gap-2 flex-shrink-0">
                          <button
                            onClick={() => handleReject(req.id)}
                            className="px-3 py-1.5 rounded-lg border border-zinc-700 text-zinc-400 text-xs hover:border-red-800 hover:text-red-400 transition-colors"
                          >
                            Rechazar
                          </button>
                          <button
                            onClick={() => handleAccept(req.id)}
                            className="px-3 py-1.5 rounded-lg bg-white text-black text-xs font-semibold hover:bg-zinc-200 transition-colors"
                          >
                            Confirmar
                          </button>
                        </div>
                      ) : (
                        <span className="text-xs font-medium px-2.5 py-1 rounded-full bg-green-900/40 text-green-400 flex-shrink-0">
                          Confirmado
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )
        )}
      </div>
    </div>
  );
}
