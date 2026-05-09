import { useState, useMemo } from 'react';
import { Car, Bike, Clock, Calendar, Users, Phone, RefreshCw, Pencil, Star } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import api from '../api';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import DatePicker from './DatePicker';
import TimePicker from './TimePicker';

interface Ride {
  id: number;
  origin: string;
  destination: string;
  date?: string;
  time: string;
  seats: number;
  seats_available: number;
  price: number;
  driver_name?: string;
  driver_phone?: string;
  description?: string;
  driver_id?: number;
  status?: string;
  vehicle_type?: string;
  is_recurring?: number;
  days_of_week?: string;
  days_label?: string;
  pending_requests?: number;
  confirmed_passengers?: number;
  car_brand?: string;
  car_color?: string;
  car_plate?: string;
  driver_rating?: number;
  driver_rating_count?: number;
}

interface Props {
  ride: Ride;
  onBook?: () => void;
  showActions?: boolean;
  onCancel?: () => void;
}

const DAY_NAMES = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'];

export default function RideCard({ ride, onBook, showActions = false, onCancel }: Props) {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { showToast } = useToast();
  const [requesting, setRequesting] = useState(false);
  const [proposedTime, setProposedTime] = useState('');
  const [bookingDate, setBookingDate] = useState('');
  const [bookingDays, setBookingDays] = useState<number[]>([]);
  const [loading, setLoading] = useState(false);

  const isOwnRide = user?.id === ride.driver_id;
  const isCancelled = ride.status === 'cancelled';
  const seatsUsed = ride.seats - ride.seats_available;
  const seatsPercent = ride.seats > 0 ? (seatsUsed / ride.seats) * 100 : 0;
  const today = new Date().toISOString().split('T')[0];

  const formatDate = (d?: string) => {
    if (!d) return null;
    return new Date(d + 'T00:00:00').toLocaleDateString('es-ES', { weekday: 'short', day: 'numeric', month: 'short' });
  };

  // Compute available day options based on selected start date + driver's recurring days
  const dayOptions = useMemo(() => {
    if (!bookingDate || !ride.days_of_week) return [];
    const dateObj = new Date(bookingDate + 'T12:00:00');
    const selectedDow = dateObj.getDay(); // 0=Sun … 6=Sat
    const driverDays = ride.days_of_week.split(',').map(Number);

    return driverDays
      .filter(d => d >= selectedDow)
      .sort((a, b) => a - b)
      .map(d => {
        const diff = d - selectedDow;
        const date = new Date(dateObj);
        date.setDate(date.getDate() + diff);
        return {
          dayOfWeek: d,
          date: date.toISOString().split('T')[0],
          label: `${DAY_NAMES[d]} ${date.getDate()}/${date.getMonth() + 1}`,
        };
      });
  }, [bookingDate, ride.days_of_week]);

  const toggleDay = (d: number) =>
    setBookingDays(prev => prev.includes(d) ? prev.filter(x => x !== d) : [...prev, d]);

  const resetForm = () => {
    setRequesting(false);
    setProposedTime('');
    setBookingDate('');
    setBookingDays([]);
  };

  const handleRequest = async () => {
    setLoading(true);
    try {
      if (ride.is_recurring) {
        await api.post('/bookings', {
          ride_id: ride.id,
          booking_date: bookingDate,
          booking_days: bookingDays.join(','),
        });
      } else {
        await api.post('/bookings', {
          ride_id: ride.id,
          proposed_time: proposedTime || undefined,
        });
      }
      resetForm();
      showToast('¡Solicitud enviada! El conductor la revisará pronto.');
      onBook?.();
    } catch (err: unknown) {
      showToast((err as { response?: { data?: { error?: string } } })?.response?.data?.error || 'Error al solicitar', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleCancel = async () => {
    if (!confirm('¿Cancelar este viaje?')) return;
    try {
      await api.delete(`/rides/${ride.id}`);
      showToast('Viaje cancelado');
      onCancel?.();
    } catch {
      showToast('Error al cancelar', 'error');
    }
  };

  return (
    <div className={`bg-zinc-900 rounded-2xl p-5 border transition-colors ${isCancelled ? 'border-zinc-800 opacity-40' : 'border-zinc-800 hover:border-zinc-700'}`}>
      {/* Header */}
      <div className="flex items-start justify-between mb-4">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 bg-zinc-800 rounded-xl flex items-center justify-center flex-shrink-0">
            {ride.vehicle_type === 'moto'
              ? <Bike size={18} className="text-zinc-300" />
              : <Car size={18} className="text-zinc-300" />
            }
          </div>
          <div>
            <div className="flex items-center gap-2 text-sm font-semibold text-white">
              <span>{ride.origin}</span>
              <span className="text-zinc-700">→</span>
              <span>{ride.destination}</span>
            </div>
            {ride.driver_name && (
              <p className="text-zinc-500 text-xs mt-0.5 flex items-center gap-1.5">
                <span>{ride.driver_name}</span>
                {(ride.driver_rating_count ?? 0) > 0 && (
                  <span className="flex items-center gap-0.5 text-yellow-400">
                    <Star size={10} className="fill-yellow-400" strokeWidth={0} />
                    <span>{ride.driver_rating?.toFixed(1)}</span>
                    <span className="text-zinc-700">({ride.driver_rating_count})</span>
                  </span>
                )}
              </p>
            )}
            {(ride.car_brand || ride.car_color || ride.car_plate) && (
              <p className="text-zinc-600 text-xs mt-0.5">
                {[ride.car_brand, ride.car_color, ride.car_plate].filter(Boolean).join(' · ')}
              </p>
            )}
          </div>
        </div>
        <div className="text-right flex-shrink-0 ml-3">
          <p className="text-white font-bold text-lg">${ride.price.toLocaleString()}</p>
          <p className="text-zinc-600 text-xs">por persona</p>
        </div>
      </div>

      {/* Meta */}
      <div className="flex flex-wrap items-center gap-3 text-xs text-zinc-500 mb-3">
        {ride.is_recurring ? (
          <span className="flex items-center gap-1.5 bg-zinc-800 text-zinc-300 px-2.5 py-1 rounded-full">
            <RefreshCw size={11} /> {ride.days_label}
          </span>
        ) : ride.date && (
          <span className="flex items-center gap-1.5"><Calendar size={12} /> {formatDate(ride.date)}</span>
        )}
        <span className="flex items-center gap-1.5"><Clock size={12} /> {ride.time}</span>
        {ride.driver_phone && (
          <span className="flex items-center gap-1.5"><Phone size={12} /> {ride.driver_phone}</span>
        )}
      </div>

      {/* Seats bar */}
      <div className="mb-4">
        <div className="flex justify-between items-center text-xs mb-1.5">
          <span className="flex items-center gap-1.5 text-zinc-500">
            <Users size={12} />
            {ride.seats_available} de {ride.seats} asiento{ride.seats !== 1 ? 's' : ''} libre{ride.seats_available !== 1 ? 's' : ''}
          </span>
          {isOwnRide && (ride.pending_requests ?? 0) > 0 && (
            <span className="text-yellow-500">{ride.pending_requests} pendiente{ride.pending_requests !== 1 ? 's' : ''}</span>
          )}
        </div>
        <div className="h-1 bg-zinc-800 rounded-full overflow-hidden">
          <div
            className={`h-full rounded-full transition-all ${seatsPercent >= 80 ? 'bg-red-500' : seatsPercent >= 50 ? 'bg-yellow-500' : 'bg-green-500'}`}
            style={{ width: `${Math.min(seatsPercent, 100)}%` }}
          />
        </div>
      </div>

      {ride.description && (
        <p className="text-zinc-600 text-xs mb-4 italic">"{ride.description}"</p>
      )}

      {/* Actions */}
      {showActions && !isCancelled && (
        <>
          {/* ── Recurring ride booking form ── */}
          {!isOwnRide && ride.is_recurring && ride.seats_available > 0 && (
            <>
              {!requesting ? (
                <button
                  onClick={() => setRequesting(true)}
                  className="w-full bg-white text-black font-semibold py-3 rounded-xl hover:bg-zinc-200 transition-colors text-sm"
                >
                  Reservar días
                </button>
              ) : (
                <div className="space-y-3">
                  {/* Step 1: date */}
                  <div>
                    <p className="text-zinc-400 text-xs mb-1.5">¿A partir de qué fecha?</p>
                    <DatePicker
                      value={bookingDate}
                      onChange={(v) => { setBookingDate(v); setBookingDays([]); }}
                      min={today}
                      placeholder="Seleccionar fecha de inicio"
                    />
                  </div>

                  {/* Step 2: days of that week */}
                  {bookingDate && (
                    <div>
                      <p className="text-zinc-400 text-xs mb-2">
                        Días disponibles esa semana — toca los que quieres reservar:
                      </p>
                      {dayOptions.length === 0 ? (
                        <p className="text-zinc-600 text-xs bg-zinc-800 rounded-xl px-3 py-2">
                          No hay días de este viaje en el resto de esa semana. Elige una fecha anterior de la misma semana.
                        </p>
                      ) : (
                        <div className="flex flex-wrap gap-2">
                          {dayOptions.map(opt => (
                            <button
                              key={opt.dayOfWeek}
                              type="button"
                              onClick={() => toggleDay(opt.dayOfWeek)}
                              className={`px-3 py-2 rounded-xl text-xs font-semibold transition-all border ${
                                bookingDays.includes(opt.dayOfWeek)
                                  ? 'bg-white text-black border-white'
                                  : 'bg-zinc-800 text-zinc-400 border-zinc-700 hover:border-zinc-500'
                              }`}
                            >
                              {opt.label}
                            </button>
                          ))}
                        </div>
                      )}
                    </div>
                  )}

                  {/* Summary */}
                  {bookingDays.length > 0 && (
                    <p className="text-zinc-400 text-xs bg-zinc-800 rounded-xl px-3 py-2">
                      Reservando {bookingDays.length} día{bookingDays.length !== 1 ? 's' : ''} · ${(ride.price * bookingDays.length).toLocaleString()} total estimado
                    </p>
                  )}

                  <div className="flex gap-2">
                    <button
                      onClick={resetForm}
                      className="flex-1 border border-zinc-700 text-zinc-400 py-2.5 rounded-xl text-sm hover:border-zinc-500 transition-colors"
                    >
                      Cancelar
                    </button>
                    <button
                      onClick={handleRequest}
                      disabled={loading || !bookingDate || bookingDays.length === 0}
                      className="flex-1 bg-white text-black font-semibold py-2.5 rounded-xl text-sm hover:bg-zinc-200 disabled:opacity-40 transition-colors"
                    >
                      {loading ? 'Enviando...' : 'Confirmar'}
                    </button>
                  </div>
                </div>
              )}
            </>
          )}

          {/* ── One-time ride booking form ── */}
          {!isOwnRide && !ride.is_recurring && ride.seats_available > 0 && (
            <>
              {!requesting ? (
                <button
                  onClick={() => setRequesting(true)}
                  className="w-full bg-white text-black font-semibold py-3 rounded-xl hover:bg-zinc-200 transition-colors text-sm"
                >
                  Solicitar viaje
                </button>
              ) : (
                <div className="space-y-2">
                  <p className="text-zinc-400 text-xs">¿A qué hora puedes estar listo? (opcional)</p>
                  <TimePicker
                    value={proposedTime}
                    onChange={setProposedTime}
                    placeholder="Seleccionar hora (opcional)"
                  />
                  <div className="flex gap-2">
                    <button
                      onClick={resetForm}
                      className="flex-1 border border-zinc-700 text-zinc-400 py-2.5 rounded-xl text-sm hover:border-zinc-500 transition-colors"
                    >
                      Cancelar
                    </button>
                    <button
                      onClick={handleRequest}
                      disabled={loading}
                      className="flex-1 bg-white text-black font-semibold py-2.5 rounded-xl text-sm hover:bg-zinc-200 disabled:opacity-50 transition-colors"
                    >
                      {loading ? 'Enviando...' : 'Confirmar'}
                    </button>
                  </div>
                </div>
              )}
            </>
          )}

          {!isOwnRide && ride.seats_available === 0 && (
            <p className="text-center text-zinc-600 text-xs py-2">Sin asientos disponibles</p>
          )}

          {isOwnRide && (
            <div className="flex gap-2">
              <button
                onClick={() => navigate(`/edit-ride/${ride.id}`)}
                className="flex-1 flex items-center justify-center gap-1.5 border border-zinc-700 text-zinc-300 py-3 rounded-xl text-sm hover:border-white hover:text-white transition-colors"
              >
                <Pencil size={13} /> Editar
              </button>
              <button
                onClick={handleCancel}
                className="flex-1 border border-zinc-800 text-red-500 py-3 rounded-xl text-sm hover:bg-zinc-800 transition-colors"
              >
                Cancelar
              </button>
            </div>
          )}
        </>
      )}
      {isCancelled && <p className="text-xs text-zinc-700 font-medium">Viaje cancelado</p>}
    </div>
  );
}
