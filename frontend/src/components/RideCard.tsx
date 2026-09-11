import { useState, useMemo } from 'react';
import { Car, Motorcycle, CalendarBlank, ArrowsClockwise, PencilSimple } from '@phosphor-icons/react';
import { useNavigate } from 'react-router-dom';
import api from '../api';
import { useConfirm } from '../context/ConfirmContext';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import DatePicker from './DatePicker';
import TimePicker from './TimePicker';
import RouteLine from './RouteLine';
import DriverRow from './DriverRow';
import SeatDots from './SeatDots';
import { formatClock } from '../utils/time';

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
  const confirmDialog = useConfirm();
  const [requesting, setRequesting] = useState(false);
  const [proposedTime, setProposedTime] = useState('');
  const [bookingDate, setBookingDate] = useState('');
  const [bookingDays, setBookingDays] = useState<number[]>([]);
  const [loading, setLoading] = useState(false);

  const isOwnRide = user?.id === ride.driver_id;
  const isCancelled = ride.status === 'cancelled';
  // Fecha local (toISOString usa UTC y puede dar "mañana" en zonas -UTC)
  const _d = new Date();
  const today = `${_d.getFullYear()}-${String(_d.getMonth()+1).padStart(2,'0')}-${String(_d.getDate()).padStart(2,'0')}`;

  const clock = formatClock(ride.time);

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
    const ok = await confirmDialog({
      title: '¿Cancelar este viaje?',
      message: 'Se avisará a los pasajeros que ya reservaron.',
      confirmText: 'Sí, cancelar',
      danger: true,
    });
    if (!ok) return;
    try {
      await api.delete(`/rides/${ride.id}`);
      showToast('Viaje cancelado');
      onCancel?.();
    } catch {
      showToast('Error al cancelar', 'error');
    }
  };

  return (
    <div className={`bg-surface rounded-2xl p-4 border border-line shadow-card
      transition-shadow hover:shadow-float ${isCancelled ? 'opacity-50' : ''}`}>

      {/* Hora y precio como protagonistas: es lo que se compara al elegir viaje */}
      <div className="flex items-start justify-between gap-3 mb-3.5">
        <div className="min-w-0">
          <div className="flex items-baseline gap-1.5">
            <span className="text-hero text-fg tabular-nums">{clock.time}</span>
            <span className="text-xs font-extrabold text-fg-faint">{clock.suffix}</span>
          </div>
          <div className="flex items-center gap-1.5 mt-1 flex-wrap">
            <span className="inline-flex items-center gap-1 bg-subtle text-fg
              text-label px-2 py-0.5 rounded-md uppercase">
              {ride.vehicle_type === 'moto'
                ? <Motorcycle size={12} weight="fill" />
                : <Car size={12} weight="fill" />}
              {ride.vehicle_type === 'moto' ? 'Moto' : 'Carro'}
            </span>
            {ride.is_recurring ? (
              <span className="inline-flex items-center gap-1 text-[11px] text-fg-muted">
                <ArrowsClockwise size={11} weight="bold" /> {ride.days_label}
              </span>
            ) : ride.date && (
              <span className="inline-flex items-center gap-1 text-[11px] text-fg-muted">
                <CalendarBlank size={11} weight="bold" /> {formatDate(ride.date)}
              </span>
            )}
          </div>
        </div>

        <div className="text-right flex-shrink-0">
          <p className="text-hero text-fg tabular-nums">
            ${Number(ride.price).toLocaleString('es-CO')}
          </p>
          <p className="text-[11px] font-semibold text-fg-faint">por persona</p>
        </div>
      </div>

      {/* El trayecto, dibujado */}
      <div className="bg-subtle rounded-xl p-3 mb-3.5">
        <RouteLine origin={ride.origin} destination={ride.destination} originTime={ride.time} />
      </div>

      {ride.driver_name && (
        <div className="mb-3.5">
          <DriverRow
            name={ride.driver_name}
            rating={ride.driver_rating}
            ratingCount={ride.driver_rating_count}
            vehicle={[ride.car_brand, ride.car_color, ride.car_plate].filter(Boolean).join(' · ')}
            size="sm"
          />
        </div>
      )}

      {ride.description && (
        <p className="text-fg-muted text-xs mb-3.5 leading-relaxed">"{ride.description}"</p>
      )}

      <div className="flex items-end justify-between gap-3 pt-3 border-t border-line">
        <SeatDots total={ride.seats} available={ride.seats_available} />
        {isOwnRide && (ride.pending_requests ?? 0) > 0 && (
          <span className="text-[11px] font-bold text-warn flex-shrink-0">
            {ride.pending_requests} pendiente{ride.pending_requests !== 1 ? 's' : ''}
          </span>
        )}
      </div>
      <div className="mt-3.5">
        {/* Las acciones conservan toda su lógica; solo cambia su envoltorio */}

      {/* Actions */}
      {showActions && !isCancelled && (
        <>
          {/* ── Recurring ride booking form ── */}
          {!isOwnRide && !!ride.is_recurring && ride.seats_available > 0 && (
            <>
              {!requesting ? (
                <button
                  onClick={() => setRequesting(true)}
                  className="w-full bg-primary text-on-primary font-semibold py-3 rounded-xl hover:bg-subtle transition-colors text-sm"
                >
                  Reservar días
                </button>
              ) : (
                <div className="space-y-3">
                  {/* Step 1: date */}
                  <div>
                    <p className="text-fg-muted text-xs mb-1.5">¿A partir de qué fecha?</p>
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
                      <p className="text-fg-muted text-xs mb-2">
                        Días disponibles esa semana — toca los que quieres reservar:
                      </p>
                      {dayOptions.length === 0 ? (
                        <p className="text-fg-faint text-xs bg-subtle rounded-xl px-3 py-2">
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
                                  ? 'bg-primary text-on-primary border-primary'
                                  : 'bg-subtle text-fg-muted border-line-strong hover:border-line-strong'
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
                    <p className="text-fg-muted text-xs bg-subtle rounded-xl px-3 py-2">
                      Reservando {bookingDays.length} día{bookingDays.length !== 1 ? 's' : ''} · ${(Number(ride.price) * bookingDays.length).toLocaleString()} total estimado
                    </p>
                  )}

                  <div className="flex gap-2">
                    <button
                      onClick={resetForm}
                      className="flex-1 border border-line-strong text-fg-muted py-2.5 rounded-xl text-sm hover:border-line-strong transition-colors"
                    >
                      Cancelar
                    </button>
                    <button
                      onClick={handleRequest}
                      disabled={loading || !bookingDate || bookingDays.length === 0}
                      className="flex-1 bg-primary text-on-primary font-semibold py-2.5 rounded-xl text-sm hover:bg-subtle disabled:opacity-40 transition-colors"
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
                  className="w-full bg-primary text-on-primary font-semibold py-3 rounded-xl hover:bg-subtle transition-colors text-sm"
                >
                  Solicitar viaje
                </button>
              ) : (
                <div className="space-y-2">
                  <p className="text-fg-muted text-xs">¿A qué hora puedes estar listo? (opcional)</p>
                  <TimePicker
                    value={proposedTime}
                    onChange={setProposedTime}
                    placeholder="Seleccionar hora (opcional)"
                  />
                  <div className="flex gap-2">
                    <button
                      onClick={resetForm}
                      className="flex-1 border border-line-strong text-fg-muted py-2.5 rounded-xl text-sm hover:border-line-strong transition-colors"
                    >
                      Cancelar
                    </button>
                    <button
                      onClick={handleRequest}
                      disabled={loading}
                      className="flex-1 bg-primary text-on-primary font-semibold py-2.5 rounded-xl text-sm hover:bg-subtle disabled:opacity-50 transition-colors"
                    >
                      {loading ? 'Enviando...' : 'Confirmar'}
                    </button>
                  </div>
                </div>
              )}
            </>
          )}

          {!isOwnRide && ride.seats_available === 0 && (
            <p className="text-center text-fg-faint text-xs py-2">Sin asientos disponibles</p>
          )}

          {isOwnRide && (
            <div className="flex gap-2">
              <button
                onClick={() => navigate(`/edit-ride/${ride.id}`)}
                className="flex-1 flex items-center justify-center gap-1.5 border border-line-strong text-fg-muted py-3 rounded-xl text-sm hover:border-primary hover:text-fg transition-colors"
              >
                <PencilSimple size={13} weight="duotone" /> Editar
              </button>
              <button
                onClick={handleCancel}
                className="flex-1 border border-line text-danger py-3 rounded-xl text-sm hover:bg-subtle transition-colors"
              >
                Cancelar
              </button>
            </div>
          )}
        </>
      )}
      </div>
      {isCancelled && (
        <p className="text-xs text-fg-faint font-medium mt-3">Este viaje fue cancelado</p>
      )}
    </div>
  );
}
