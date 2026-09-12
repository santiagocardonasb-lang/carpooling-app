import { useState, useEffect, useCallback } from 'react';
import { Link, useSearchParams, useNavigate } from 'react-router-dom';
import { ShareNetwork, ChatCircle, CaretRight, Star, CheckCircle, HandWaving, Car, Play } from '@phosphor-icons/react';
import api from '../api';
import { useConfirm } from '../context/ConfirmContext';
import RideCard from '../components/RideCard';
import StatusPill from '../components/StatusPill';
import SegmentedControl from '../components/SegmentedControl';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { shareTrip } from '../utils/share';

const DAY_NAMES = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'];

interface Ride {
  id: number; origin: string; destination: string; date?: string; time: string;
  seats: number; seats_available: number; price: number; driver_name: string;
  description?: string; driver_id: number; status: string; vehicle_type: string;
  is_recurring: number; days_of_week?: string; pending_requests: number; confirmed_passengers: number;
}

interface Booking {
  id: number; origin: string; destination: string; date?: string; time: string;
  price: number; driver_name: string; driver_phone: string; status: string; seats: number;
  proposed_time?: string; is_recurring: number; days_of_week?: string;
  booking_date?: string; booking_days?: string; car_brand?: string; car_color?: string;
  car_plate?: string; cancelled_dates?: string; completed_at?: string;
  driver_id?: number; passenger_id?: number; passenger_ready?: number;
}

interface Request {
  id: number; ride_id: number; passenger_name: string; passenger_phone: string;
  passenger_email: string; seats: number; proposed_time?: string;
  booking_date?: string; booking_days?: string; status: string; created_at: string;
  origin?: string; destination?: string; time?: string; date?: string;
  is_recurring?: number; days_of_week?: string;
}

export default function MyRides() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const isDriver = user?.role !== 'passenger';
  const { showToast } = useToast();
  const confirmDialog = useConfirm();

  const [searchParams, setSearchParams] = useSearchParams();
  const tab: 'rides' | 'requests' = searchParams.get('tab') === 'requests' ? 'requests' : 'rides';
  const setTab = (t: 'rides' | 'requests') => {
    if (t === 'requests') setSearchParams({ tab: 'requests' }, { replace: true });
    else setSearchParams({}, { replace: true });
  };

  const [myRides, setMyRides] = useState<Ride[]>([]);
  const [allRequests, setAllRequests] = useState<Request[]>([]);
  const [myBookings, setMyBookings] = useState<Booking[]>([]);
  const [loading, setLoading] = useState(true);
  const [ratedSet, setRatedSet] = useState<Set<number>>(new Set());

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
    const ok = await confirmDialog({
      title: '¿Rechazar esta solicitud?',
      message: 'El pasajero será notificado y su cupo quedará libre.',
      confirmText: 'Rechazar',
      danger: true,
    });
    if (!ok) return;
    try {
      await api.patch(`/bookings/${bookingId}/reject`);
      showToast('Solicitud rechazada');
      fetchData();
    } catch {
      showToast('Error al rechazar', 'error');
    }
  };

  const cancelBooking = async (id: number) => {
    const ok = await confirmDialog({
      title: '¿Cancelar esta reserva?',
      message: 'Perderás tu cupo en este viaje.',
      confirmText: 'Sí, cancelar',
      danger: true,
    });
    if (!ok) return;
    try {
      await api.delete(`/bookings/${id}`);
      showToast('Reserva cancelada');
      fetchData();
    } catch {
      showToast('Error al cancelar', 'error');
    }
  };

  const notifyReady = async (bookingId: number) => {
    try {
      await api.patch(`/bookings/${bookingId}/passenger-ready`);
      showToast('Conductor notificado');
      fetchData();
    } catch (err: unknown) {
      showToast((err as { response?: { data?: { error?: string } } })?.response?.data?.error || 'No se pudo enviar la notificación', 'error');
    }
  };

  const cancelRecurringDate = async (bookingId: number, date: string) => {
    const ok = await confirmDialog({
      title: '¿Cancelar este día?',
      message: `Solo se cancela el viaje del ${date}. El resto de días sigue igual.`,
      confirmText: 'Cancelar ese día',
      danger: true,
    });
    if (!ok) return;
    try {
      await api.patch(`/bookings/${bookingId}/cancel-date`, { date });
      showToast('Día cancelado');
      fetchData();
    } catch {
      showToast('Error al cancelar día', 'error');
    }
  };

  useEffect(() => {
    const completed = isDriver
      ? allRequests.filter(r => r.status === 'completed').map(r => r.id)
      : myBookings.filter(b => b.status === 'completed').map(b => b.id);
    if (completed.length === 0) { setRatedSet(new Set()); return; }
    Promise.all(completed.map(id =>
      api.get(`/ratings/booking/${id}/mine`).then(r => r.data.rated ? id : null).catch(() => null)
    )).then(rated => setRatedSet(new Set(rated.filter((x): x is number => x !== null))));
  }, [myBookings, allRequests, isDriver]);

  const formatDate = (d?: string) => {
    if (!d) return null;
    return new Date(d + 'T00:00:00').toLocaleDateString('es-ES', { weekday: 'short', day: 'numeric', month: 'short' });
  };

  const formatDays = (daysStr?: string) => {
    if (!daysStr) return '';
    return daysStr.split(',').map(d => DAY_NAMES[Number(d)]).join(' · ');
  };

  const activeRides    = myRides.filter(r => r.status === 'active');
  const activeBookings = myBookings.filter(b => {
    if (b.status === 'cancelled' || b.status === 'rejected' || b.status === 'expired') return false;
    if (b.status === 'completed' && !b.is_recurring && ratedSet.has(b.id)) return false;
    return true;
  });
  const pendingCount = allRequests.filter(r => r.status === 'pending').length;

  const parseCancelled = (s?: string): string[] => {
    if (!s) return [];
    try { return JSON.parse(s); } catch { return []; }
  };

  // ── Passenger view ──────────────────────────────────────────────────────────
  if (!isDriver) {
    return (
      <div className="min-h-screen bg-canvas pt-20 px-6 pb-10">
        <div className="max-w-xl mx-auto mt-4">
          <h1 className="text-2xl font-black text-fg mb-6">Mis reservas</h1>
          {loading ? (
            <div className="space-y-3">{[0,1,2].map(i => <div key={i} className="skeleton h-32 rounded-2xl" />)}</div>
          ) : activeBookings.length === 0 ? (
            <div className="text-center py-16">
              <p className="text-fg-faint font-semibold">No tienes reservas</p>
              <Link to="/search" className="text-fg text-sm underline underline-offset-2 mt-2 block">
                Buscar un viaje →
              </Link>
            </div>
          ) : (
            <div className="space-y-3">
              {activeBookings.map((b) => (
                <div key={b.id} className="bg-surface rounded-2xl p-5 border border-line">
                  <div className="flex items-start justify-between mb-2 gap-2">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 text-sm font-semibold text-fg">
                        <span className="truncate">{b.origin}</span>
                        <span className="text-fg-faint flex-shrink-0">→</span>
                        <span className="truncate">{b.destination}</span>
                      </div>
                      <p className="text-fg-faint text-xs mt-1">
                        {b.is_recurring
                          ? b.booking_date ? `Desde ${formatDate(b.booking_date)}` : `Recurrente · ${formatDays(b.days_of_week)}`
                          : formatDate(b.date)}
                        {' · '}{b.time} · {b.driver_name}
                        {b.driver_phone && ` · ${b.driver_phone}`}
                      </p>
                      {(b.car_brand || b.car_color || b.car_plate) && (
                        <p className="text-fg-faint text-xs mt-0.5">
                          {[b.car_brand, b.car_color, b.car_plate].filter(Boolean).join(' · ')}
                        </p>
                      )}
                      {b.booking_days && (
                        <p className="text-fg-muted text-xs mt-0.5">
                          Días: {b.booking_days.split(',').map(d => DAY_NAMES[Number(d)]).join(', ')}
                        </p>
                      )}
                      {b.proposed_time && (
                        <p className="text-fg-muted text-xs mt-0.5">Tu hora propuesta: {b.proposed_time}</p>
                      )}
                    </div>
                    <span className="flex-shrink-0"><StatusPill status={b.status} /></span>
                  </div>

                  {/* Acciones */}
                  <div className="flex items-center justify-between mt-3 flex-wrap gap-2">
                    <p className="text-fg font-bold text-sm">
                      ${Number(b.price).toLocaleString()} · {b.seats} asiento{b.seats !== 1 ? 's' : ''}
                    </p>
                    <div className="flex items-center gap-3 flex-wrap">
                      {['confirmed', 'in_progress'].includes(b.status) && (
                        <button
                          onClick={() => navigate(`/chat/${b.id}`)}
                          className="flex items-center gap-1 text-xs text-fg-muted hover:text-fg transition-colors"
                        >
                          <ChatCircle size={13} weight="duotone" /> Chat
                        </button>
                      )}
                      {b.status === 'confirmed' && (
                        <button
                          onClick={() => shareTrip(b)}
                          className="flex items-center gap-1 text-xs text-fg-muted hover:text-fg transition-colors"
                        >
                          <ShareNetwork size={13} weight="duotone" /> Compartir
                        </button>
                      )}
                      {b.status === 'completed' && !ratedSet.has(b.id) && (
                        <button
                          onClick={() => navigate(`/rate/${b.id}`)}
                          className="flex items-center gap-1 text-xs text-star hover:text-star font-semibold transition-colors"
                        >
                          <Star size={13} weight="fill" /> Calificar
                        </button>
                      )}
                      {['pending', 'confirmed'].includes(b.status) && (
                        <button onClick={() => cancelBooking(b.id)} className="text-xs text-danger hover:text-danger transition-colors">
                          Cancelar
                        </button>
                      )}
                    </div>
                  </div>

                  {/* Botón "Listo para salir" */}
                  {b.status === 'confirmed' && (
                    b.passenger_ready ? (
                      <p className="mt-3 text-center text-xs text-live py-2">
                        <><CheckCircle size={14} weight="fill" /> Ya notificaste al conductor que estás listo</>
                      </p>
                    ) : (
                      <button
                        onClick={() => notifyReady(b.id)}
                        className="mt-3 w-full flex items-center justify-center gap-2 bg-subtle hover:bg-line-strong border border-line-strong px-4 py-2.5 rounded-xl transition-colors"
                      >
                        <span className="text-fg text-sm flex items-center gap-1.5"><HandWaving size={15} weight="fill" /> Listo para salir</span>
                      </button>
                    )
                  )}

                  {/* Banner viaje en curso */}
                  {b.status === 'in_progress' && (
                    <button
                      onClick={() => navigate(`/trip/${b.id}`)}
                      className="mt-3 w-full flex items-center justify-between gap-2 bg-warn-soft hover:bg-warn-soft border border-warn/30 px-4 py-3 rounded-xl transition-colors"
                    >
                      <span className="text-live text-sm font-bold flex items-center gap-1.5"><Car size={15} weight="fill" /> Ver viaje en curso</span>
                      <CaretRight size={16} weight="bold" className="text-star" />
                    </button>
                  )}

                  {/* Días recurrentes */}
                  {!!b.is_recurring && b.booking_days && b.status === 'confirmed' && (() => {
                    const cancelled = parseCancelled(b.cancelled_dates);
                    return (
                      <div className="mt-3 pt-3 border-t border-line">
                        <p className="text-fg-faint text-xs mb-2">Cancelar un día específico:</p>
                        <div className="flex flex-wrap gap-1.5">
                          {b.booking_days.split(',').map(d => {
                            const base = b.booking_date ? new Date(b.booking_date + 'T12:00:00') : new Date();
                            const target = new Date(base);
                            const diff = (Number(d) - base.getDay() + 7) % 7;
                            target.setDate(target.getDate() + diff);
                            const iso = target.toISOString().split('T')[0];
                            const isCancelled = cancelled.includes(iso);
                            return (
                              <button
                                key={d}
                                disabled={isCancelled}
                                onClick={() => cancelRecurringDate(b.id, iso)}
                                className={`px-2 py-1 rounded-lg text-[10px] transition-colors ${
                                  isCancelled
                                    ? 'bg-subtle text-fg-faint line-through'
                                    : 'bg-subtle text-fg-muted hover:bg-danger-soft hover:text-danger'
                                }`}
                              >
                                {DAY_NAMES[Number(d)]} {target.getDate()}/{target.getMonth() + 1}
                              </button>
                            );
                          })}
                        </div>
                      </div>
                    );
                  })()}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    );
  }

  // ── Driver view ─────────────────────────────────────────────────────────────
  return (
    <div className="min-h-screen bg-canvas pt-20 px-6 pb-10">
      <div className="max-w-xl mx-auto mt-4">

        <div className="flex items-center justify-between mb-5">
          <h1 className="text-2xl font-black text-fg">Mis viajes</h1>
          <Link to="/create-ride" className="bg-primary text-on-primary text-xs font-semibold px-4 py-2 rounded-full hover:bg-primary/90 transition-colors">
            + Publicar
          </Link>
        </div>

        <div className="mb-5">
          <SegmentedControl
            ariaLabel="Vista de conductor"
            variant="group"
            value={tab}
            onChange={setTab}
            options={[
              { value: 'rides',    label: 'Mis viajes' },
              { value: 'requests', label: 'Solicitudes', badge: pendingCount },
            ]}
          />
        </div>

        {loading ? (
          <div className="space-y-3">{[0,1,2].map(i => <div key={i} className="skeleton h-32 rounded-2xl" />)}</div>
        ) : tab === 'rides' ? (
          activeRides.length === 0 ? (
            <div className="text-center py-16">
              <p className="text-fg-faint font-semibold">No has publicado viajes</p>
              <Link to="/create-ride" className="text-fg text-sm underline underline-offset-2 mt-2 block">
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
          allRequests.length === 0 ? (
            <div className="text-center py-16">
              <p className="text-fg-faint font-semibold">No hay solicitudes</p>
              <p className="text-fg-faint text-sm mt-1">Aquí aparecerán las reservas de los pasajeros</p>
            </div>
          ) : (
            <div className="space-y-3">
              {allRequests.map((req) => (
                <div key={req.id} className="bg-surface rounded-2xl border border-line overflow-hidden">
                  <div className="px-4 py-3 border-b border-line bg-subtle">
                    <div className="flex items-center gap-2 text-sm font-semibold text-fg">
                      <span>{req.origin}</span>
                      <span className="text-fg-faint">→</span>
                      <span>{req.destination}</span>
                    </div>
                    <p className="text-fg-faint text-xs mt-0.5">
                      {req.is_recurring ? `Recurrente · ${formatDays(req.days_of_week)}` : formatDate(req.date)}
                      {req.time && ` · ${req.time}`}
                    </p>
                  </div>

                  <div className="px-4 py-4">
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex-1 min-w-0">
                        <p className="text-fg text-sm font-semibold">{req.passenger_name}</p>
                        <div className="flex flex-wrap gap-x-3 gap-y-0.5 mt-1 text-xs text-fg-faint">
                          <span>{req.seats} asiento{req.seats !== 1 ? 's' : ''}</span>
                          {req.booking_date && <span className="text-fg-muted">Desde {formatDate(req.booking_date)}</span>}
                          {req.booking_days && (
                            <span className="text-fg-muted">
                              Días: {req.booking_days.split(',').map(d => DAY_NAMES[Number(d)]).join(', ')}
                            </span>
                          )}
                          {req.proposed_time && <span>Hora propuesta: {req.proposed_time}</span>}
                          {req.passenger_phone && <span>{req.passenger_phone}</span>}
                          {req.passenger_email && <span className="text-fg-faint">{req.passenger_email}</span>}
                        </div>
                        {/* Chat + mapa para el conductor */}
                        {['confirmed', 'in_progress'].includes(req.status) && (
                          <div className="flex items-center gap-3 mt-2">
                            <button
                              onClick={() => navigate(`/chat/${req.id}`)}
                              className="flex items-center gap-1 text-[11px] text-fg-muted hover:text-fg transition-colors"
                            >
                              <ChatCircle size={12} weight="duotone" /> Chat
                            </button>
                          </div>
                        )}
                      </div>

                      {req.status === 'pending' ? (
                        <div className="flex gap-2 flex-shrink-0">
                          <button
                            onClick={() => handleReject(req.id)}
                            className="px-3 py-1.5 rounded-lg border border-line-strong text-fg-muted text-xs hover:border-danger/30 hover:text-danger transition-colors"
                          >
                            Rechazar
                          </button>
                          <button
                            onClick={() => handleAccept(req.id)}
                            className="px-3 py-1.5 rounded-lg bg-primary text-on-primary text-xs font-semibold hover:bg-primary/90 transition-colors"
                          >
                            Confirmar
                          </button>
                        </div>
                      ) : req.status === 'confirmed' ? (
                        <span className="text-xs font-medium px-2.5 py-1 rounded-full bg-live-soft text-live flex-shrink-0">
                          Confirmado
                        </span>
                      ) : req.status === 'in_progress' ? (
                        <span className="text-xs font-medium px-2.5 py-1 rounded-full bg-warn-soft text-star flex-shrink-0 animate-pulse">
                          En curso
                        </span>
                      ) : req.status === 'completed' && !ratedSet.has(req.id) ? (
                        <button
                          onClick={() => navigate(`/rate/${req.id}`)}
                          className="flex items-center gap-1 text-xs text-star hover:text-star font-semibold flex-shrink-0"
                        >
                          <Star size={13} weight="fill" /> Calificar
                        </button>
                      ) : null}
                    </div>
                  </div>

                  {['confirmed', 'in_progress'].includes(req.status) && (
                    <button
                      onClick={() => navigate(`/trip/${req.id}`)}
                      className={`w-full flex items-center justify-between gap-2 px-4 py-3 border-t transition-colors ${
                        req.status === 'in_progress'
                          ? 'bg-warn-soft hover:bg-warn-soft border-warn/30'
                          : 'bg-subtle hover:bg-subtle border-line-strong'
                      }`}
                    >
                      <span className={`text-sm font-semibold ${req.status === 'in_progress' ? 'text-star' : 'text-fg'}`}>
                        <span className="flex items-center gap-1.5">{req.status === 'in_progress' ? <><Car size={15} weight="fill" /> Continuar viaje</> : <><Play size={15} weight="fill" /> Iniciar viaje</>}</span>
                      </span>
                      <CaretRight size={16} weight="bold" className={req.status === 'in_progress' ? 'text-star' : 'text-fg-muted'} />
                    </button>
                  )}
                </div>
              ))}
            </div>
          )
        )}
      </div>
    </div>
  );
}
