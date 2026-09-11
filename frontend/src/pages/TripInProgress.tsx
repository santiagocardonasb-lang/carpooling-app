import { useState, useEffect, useCallback, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  ChatCircle, Phone, Flag, Play, Clock, CheckCircle, ArrowLeft,
} from '@phosphor-icons/react';
import api from '../api';
import { useConfirm } from '../context/ConfirmContext';
import { parseDate } from '../utils/date';
import { useToast } from '../context/ToastContext';
import { useAuth } from '../context/AuthContext';
import TripMap from '../components/TripMap';
import Sheet from '../components/Sheet';
import RouteLine from '../components/RouteLine';
import DriverRow from '../components/DriverRow';
import LiveDot from '../components/LiveDot';

interface TripData {
  booking: {
    id: number; status: string; seats: number; started_at?: string;
    driver_lat: number | null; driver_lng: number | null;
  };
  ride: { origin: string; destination: string; date?: string; time: string; price: number; description?: string; };
  driver: { id: number; name: string; phone?: string; avatar?: string; car_brand?: string; car_color?: string; car_plate?: string; rating: number; rating_count: number; };
  passenger: { id: number; name: string; phone?: string; avatar?: string; rating: number; rating_count: number; };
  my_role: 'driver' | 'passenger';
  already_rated: boolean;
}

export default function TripInProgress() {
  const { bookingId } = useParams();
  const navigate = useNavigate();
  const { showToast } = useToast();
  const { user } = useAuth();
  const confirmDialog = useConfirm();

  const [data, setData] = useState<TripData | null>(null);
  const [loading, setLoading] = useState(true);
  const [acting, setActing] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);
  const firstLoadRef = useRef(true);

  // Detectar mensajes no leídos
  const checkUnread = useCallback(async () => {
    if (!bookingId) return;
    try {
      const { data: msgData } = await api.get(`/messages/booking/${bookingId}`);
      const lastSeen = parseInt(sessionStorage.getItem(`chat_last_seen_${bookingId}`) || '0', 10);
      const unread = msgData.messages.filter(
        (m: { sender_id: number; created_at: string }) =>
          m.sender_id !== user?.id &&
          parseDate(m.created_at).getTime() > lastSeen
      );
      setUnreadCount(unread.length);
    } catch {}
  }, [bookingId, user?.id]);

  const load = useCallback(async () => {
    try {
      // Las fotos solo vienen en la primera carga. Los refrescos cada 5 s las
      // omiten para no gastar datos móviles, así que hay que conservarlas.
      const isFirst = firstLoadRef.current;
      const { data } = await api.get(
        `/bookings/${bookingId}/trip-view${isFirst ? '?full=1' : ''}`
      );
      firstLoadRef.current = false;
      setData(prev => (prev ? {
        ...data,
        driver:    { ...data.driver,    avatar: data.driver.avatar    ?? prev.driver.avatar },
        passenger: { ...data.passenger, avatar: data.passenger.avatar ?? prev.passenger.avatar },
      } : data));
      if (data.booking.status === 'completed') {
        navigate(`/rate/${bookingId}`, { replace: true });
        return;
      }
      if (['cancelled', 'rejected'].includes(data.booking.status)) {
        showToast('Esta reserva ya no está activa', 'error');
        navigate('/my-rides', { replace: true });
        return;
      }
    } catch (e: unknown) {
      showToast((e as { response?: { data?: { error?: string } } })?.response?.data?.error || 'Error al cargar viaje', 'error');
      navigate('/my-rides', { replace: true });
    } finally {
      setLoading(false);
    }
  }, [bookingId, navigate, showToast]);

  useEffect(() => {
    load();
    checkUnread();
    const i = setInterval(load, 5000);
    const j = setInterval(checkUnread, 5000);
    return () => { clearInterval(i); clearInterval(j); };
  }, [load, checkUnread]);

  // ── GPS tracking (solo conductor, solo cuando el viaje está en_progress) ──
  useEffect(() => {
    if (!data || data.my_role !== 'driver' || data.booking.status !== 'in_progress') return;
    if (!navigator.geolocation) return;

    let lastSent = 0;
    const watchId = navigator.geolocation.watchPosition(
      (pos) => {
        const now = Date.now();
        if (now - lastSent < 4500) return; // throttle: enviar cada ~5s máximo
        lastSent = now;
        api.patch(`/bookings/${bookingId}/location`, {
          lat: pos.coords.latitude,
          lng: pos.coords.longitude,
        }).catch(() => {});
      },
      (err) => console.warn('[GPS]', err.message),
      { enableHighAccuracy: true, timeout: 15000, maximumAge: 3000 }
    );

    return () => navigator.geolocation.clearWatch(watchId);
  }, [data?.booking.status, data?.my_role, bookingId]);

  const openChat = () => {
    // Marcar como vistos al abrir el chat
    sessionStorage.setItem(`chat_last_seen_${bookingId}`, Date.now().toString());
    setUnreadCount(0);
    navigate(`/chat/${bookingId}`);
  };

  const startTrip = async () => {
    const ok = await confirmDialog({
      title: '¿Iniciar el viaje?',
      message: 'Se le notificará al pasajero que ya arrancaste.',
      confirmText: 'Iniciar',
    });
    if (!ok) return;
    setActing(true);
    try {
      await api.patch(`/bookings/${bookingId}/start`);
      load();
    } catch (e: unknown) {
      showToast((e as { response?: { data?: { error?: string } } })?.response?.data?.error || 'Error', 'error');
    } finally {
      setActing(false);
    }
  };

  const finishTrip = async () => {
    const ok = await confirmDialog({
      title: '¿Finalizar el viaje?',
      message: 'Después podrás calificar a tu acompañante.',
      confirmText: 'Finalizar',
    });
    if (!ok) return;
    setActing(true);
    try {
      await api.patch(`/bookings/${bookingId}/complete`);
      navigate(`/rate/${bookingId}`, { replace: true });
    } catch (e: unknown) {
      showToast((e as { response?: { data?: { error?: string } } })?.response?.data?.error || 'Error', 'error');
    } finally {
      setActing(false);
    }
  };

  if (loading || !data) {
    return (
      <div className="min-h-screen bg-canvas p-5 pt-20 space-y-4 max-w-md mx-auto">
        <div className="skeleton h-52 rounded-2xl" />
        <div className="skeleton h-40 rounded-2xl" />
      </div>
    );
  }

  const isDriver = data.my_role === 'driver';
  const otherParty = isDriver ? data.passenger : data.driver;
  const carInfo = [data.driver.car_brand, data.driver.car_color, data.driver.car_plate]
    .filter(Boolean).join(' · ');
  const inProgress = data.booking.status === 'in_progress';
  const confirmed = data.booking.status === 'confirmed';

  /** El contenido es el mismo con mapa y sin él; cambia solo el envoltorio. */
  const body = (
    <div className="space-y-4 pb-4">
      <div className="flex items-center justify-between gap-3">
        <DriverRow
          name={otherParty.name}
          avatar={otherParty.avatar}
          rating={otherParty.rating}
          ratingCount={otherParty.rating_count}
          vehicle={isDriver ? undefined : carInfo}
          role={isDriver ? 'Pasajero' : 'Conductor'}
          size="lg"
        />
        {otherParty.phone && (
          <a
            href={`tel:${otherParty.phone}`}
            aria-label={`Llamar a ${otherParty.name}`}
            className="w-11 h-11 rounded-full bg-subtle hover:bg-line-strong
              flex items-center justify-center flex-shrink-0"
          >
            <Phone size={18} weight="fill" className="text-fg" />
          </a>
        )}
      </div>

      <div className="bg-subtle rounded-xl p-3">
        <RouteLine
          origin={data.ride.origin}
          destination={data.ride.destination}
          originTime={data.ride.time}
        />
      </div>

      {data.booking.started_at && (
        <p className="text-fg-faint text-[11px] flex items-center gap-1.5">
          <Clock size={12} weight="fill" />
          Salieron a las{' '}
          {parseDate(data.booking.started_at).toLocaleTimeString('es-ES', {
            hour: '2-digit', minute: '2-digit',
          })}
        </p>
      )}

      <button
        onClick={openChat}
        className="w-full flex items-center justify-center gap-2 py-3 rounded-xl
          bg-subtle hover:bg-line-strong text-fg text-[13px] font-bold transition-colors"
      >
        <span className="relative">
          <ChatCircle size={17} weight="fill" />
          {unreadCount > 0 && (
            <span className="absolute -top-1.5 -right-2 bg-notify text-white text-[9px]
              font-bold rounded-full min-w-[15px] h-[15px] flex items-center justify-center px-0.5">
              {unreadCount > 9 ? '9+' : unreadCount}
            </span>
          )}
        </span>
        Mensaje a {otherParty.name.split(' ')[0]}
      </button>

      <div className="flex items-end justify-between pt-3 border-t border-line">
        <div>
          <p className="text-label text-fg-faint uppercase">Aporte total</p>
          <p className="text-hero text-fg tabular-nums">
            ${(Number(data.ride.price) * data.booking.seats).toLocaleString('es-CO')}
          </p>
        </div>
        <p className="text-xs text-fg-faint">
          {data.booking.seats} {data.booking.seats === 1 ? 'asiento' : 'asientos'}
        </p>
      </div>

      {isDriver && confirmed && (
        <button
          onClick={startTrip}
          disabled={acting}
          className="w-full h-14 flex items-center justify-center gap-2 bg-primary text-on-primary
            font-bold rounded-xl hover:bg-primary/90 disabled:opacity-50 transition-colors"
        >
          <Play size={18} weight="fill" /> {acting ? 'Iniciando…' : 'Iniciar viaje'}
        </button>
      )}
      {isDriver && inProgress && (
        <button
          onClick={finishTrip}
          disabled={acting}
          className="w-full h-14 flex items-center justify-center gap-2 bg-primary text-on-primary
            font-bold rounded-xl hover:bg-primary/90 disabled:opacity-50 transition-colors"
        >
          <Flag size={18} weight="fill" /> {acting ? 'Finalizando…' : 'Finalizar viaje'}
        </button>
      )}
      {!isDriver && inProgress && (
        <p className="text-center text-fg-faint text-xs py-1">
          El conductor te avisará cuando lleguen.
        </p>
      )}
    </div>
  );

  return (
    <div className="min-h-screen bg-canvas flex flex-col">
      {inProgress ? (
        <>
          {/* El mapa manda arriba y la hoja se monta encima. Es la única
              pantalla donde el recorrido se ve pasar, así que se lleva el
              espacio que necesita. */}
          <div className="relative h-[42vh] min-h-[260px] max-h-[380px] flex-shrink-0">
            <TripMap
              driverLat={data.booking.driver_lat}
              driverLng={data.booking.driver_lng}
              destination={data.ride.destination}
              isDriver={isDriver}
              fill
            />

            <div className="absolute inset-x-0 top-0 pt-safe px-4 z-20 flex items-center justify-between gap-2">
              <button
                onClick={() => navigate('/my-rides')}
                aria-label="Volver a mis viajes"
                className="w-10 h-10 rounded-full glass-bar border border-line shadow-float
                  flex items-center justify-center text-fg flex-shrink-0"
              >
                <ArrowLeft size={19} weight="bold" />
              </button>
              <LiveDot label="Viaje en curso" onDark />
            </div>
          </div>

          <Sheet className="flex-1">{body}</Sheet>
        </>
      ) : (
        /* Antes de arrancar no hay recorrido que mostrar, así que es una
           página normal con el estado arriba. */
        <div className="flex-1 px-5 pt-20 pb-nav max-w-md mx-auto w-full">
          <button
            onClick={() => navigate('/my-rides')}
            className="flex items-center gap-2 text-fg-muted hover:text-fg transition-colors text-sm mb-5"
          >
            <ArrowLeft size={16} weight="bold" /> Mis viajes
          </button>

          <div className="bg-live-soft border border-live/30 rounded-2xl p-4 text-center mb-4">
            <p className="text-live text-sm font-bold flex items-center justify-center gap-1.5">
              <CheckCircle size={16} weight="fill" />
              Confirmado · listo para salir
            </p>
            <p className="text-fg-muted text-xs mt-1 leading-relaxed">
              {isDriver
                ? 'Cuando arranques, tu pasajero verá el recorrido en vivo.'
                : 'Vas a poder seguir el recorrido cuando el conductor inicie.'}
            </p>
          </div>

          <div className="bg-surface rounded-2xl border border-line shadow-card p-4">
            {body}
          </div>
        </div>
      )}
    </div>
  );
}
