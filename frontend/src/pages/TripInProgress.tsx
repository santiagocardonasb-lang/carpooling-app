import { useState, useEffect, useCallback, useRef } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import {
  ChatCircle, Phone, Star, Flag, Play, Car,
  Clock, User, Bell, GearSix, SignOut, CreditCard, CheckCircle,
} from '@phosphor-icons/react';
import api from '../api';
import { parseDate } from '../utils/date';
import { useToast } from '../context/ToastContext';
import { useAuth } from '../context/AuthContext';
import TripMap from '../components/TripMap';

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
  const { user, logout } = useAuth();

  const [data, setData] = useState<TripData | null>(null);
  const [loading, setLoading] = useState(true);
  const [acting, setActing] = useState(false);
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Cerrar dropdown al hacer click fuera
  useEffect(() => {
    if (!dropdownOpen) return;
    const h = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) setDropdownOpen(false);
    };
    document.addEventListener('mousedown', h);
    return () => document.removeEventListener('mousedown', h);
  }, [dropdownOpen]);

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
      const { data } = await api.get(`/bookings/${bookingId}/trip-view`);
      setData(data);
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
    if (!confirm('¿Iniciar el viaje? Se notificará al pasajero.')) return;
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
    if (!confirm('¿Finalizar el viaje?')) return;
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
      <div className="min-h-screen bg-black flex items-center justify-center">
        <div className="w-6 h-6 border-2 border-zinc-700 border-t-white rounded-full animate-spin" />
      </div>
    );
  }

  const isDriver = data.my_role === 'driver';
  const otherParty = isDriver ? data.passenger : data.driver;
  const carInfo = [data.driver.car_brand, data.driver.car_color, data.driver.car_plate].filter(Boolean).join(' · ');
  const inProgress = data.booking.status === 'in_progress';
  const confirmed = data.booking.status === 'confirmed';

  const RatingDisplay = ({ rating, count }: { rating: number; count: number }) => (
    count > 0 ? (
      <div className="flex items-center gap-1">
        <Star size={12} weight="fill" className="text-yellow-400" />
        <span className="text-yellow-400 text-xs font-semibold">{rating.toFixed(1)}</span>
        <span className="text-zinc-600 text-xs">({count})</span>
      </div>
    ) : (
      <span className="text-zinc-700 text-xs">Sin calificaciones aún</span>
    )
  );

  return (
    <div className="min-h-screen bg-black px-6 pt-8 pb-10">
      <div className="max-w-sm mx-auto space-y-4">

        {/* Header: label + avatar dropdown */}
        <div className="flex items-center justify-between mb-1">
          <span className="text-zinc-600 text-xs font-medium uppercase tracking-wider">Viaje activo</span>
          <div className="relative" ref={dropdownRef}>
            <button
              onClick={() => setDropdownOpen(v => !v)}
              className="relative w-8 h-8 rounded-full bg-zinc-800 hover:ring-2 hover:ring-white transition-all flex items-center justify-center"
            >
              <div className="w-full h-full rounded-full overflow-hidden flex items-center justify-center">
                {user?.avatar
                  ? <img src={user.avatar} alt="avatar" className="w-full h-full object-cover" />
                  : <span className="text-white text-sm font-semibold">{user?.name?.[0]?.toUpperCase()}</span>
                }
              </div>
            </button>
            {dropdownOpen && (
              <div className="absolute right-0 top-10 w-52 bg-zinc-900 border border-zinc-800 rounded-2xl shadow-2xl overflow-hidden py-1 z-50">
                <Link to="/profile" onClick={() => setDropdownOpen(false)}
                  className="flex items-center gap-3 px-4 py-3 text-sm text-white hover:bg-zinc-800 transition-colors">
                  <User size={15} weight="duotone" className="text-zinc-400" /> Ajustar perfil
                </Link>
                <Link to="/notifications" onClick={() => setDropdownOpen(false)}
                  className="flex items-center gap-3 px-4 py-3 text-sm text-white hover:bg-zinc-800 transition-colors">
                  <Bell size={15} weight="duotone" className="text-zinc-400" /> Notificaciones
                </Link>
                {user?.role !== 'passenger' && (
                  <Link to="/vehicle" onClick={() => setDropdownOpen(false)}
                    className="flex items-center gap-3 px-4 py-3 text-sm text-white hover:bg-zinc-800 transition-colors">
                    <CreditCard size={15} weight="duotone" className="text-zinc-400" /> Mi vehículo
                  </Link>
                )}
                <Link to="/settings" onClick={() => setDropdownOpen(false)}
                  className="flex items-center gap-3 px-4 py-3 text-sm text-white hover:bg-zinc-800 transition-colors">
                  <GearSix size={15} weight="duotone" className="text-zinc-400" /> Configuración
                </Link>
                <div className="border-t border-zinc-800 my-1" />
                <button onClick={() => { logout(); navigate('/login'); }}
                  className="w-full flex items-center gap-3 px-4 py-3 text-sm text-red-400 hover:bg-zinc-800 transition-colors">
                  <SignOut size={15} weight="duotone" /> Cerrar sesión
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Estado del viaje */}
        <div className={`rounded-2xl p-4 text-center border ${
          inProgress ? 'bg-yellow-900/20 border-yellow-800' : 'bg-green-900/20 border-green-800'
        }`}>
          <p className={`text-xs font-bold uppercase tracking-wider flex items-center justify-center gap-1.5 ${inProgress ? 'text-yellow-400' : 'text-green-400'}`}>
            {inProgress ? (
              <>
                <Car size={13} weight="duotone" />
                Viaje en curso
              </>
            ) : (
              <>
                <CheckCircle size={13} weight="duotone" />
                Confirmado · Listo para iniciar
              </>
            )}
          </p>
          {data.booking.started_at && (
            <p className="text-zinc-500 text-[11px] mt-1 flex items-center justify-center gap-1">
              <Clock size={10} weight="duotone" />
              Iniciado a las {parseDate(data.booking.started_at).toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' })}
            </p>
          )}
        </div>

        {/* Mapa en tiempo real — solo cuando el viaje está en curso */}
        {inProgress && (
          <TripMap
            driverLat={data.booking.driver_lat}
            driverLng={data.booking.driver_lng}
            destination={data.ride.destination}
            isDriver={isDriver}
          />
        )}

        {/* Ruta */}
        <div className="bg-zinc-900 rounded-2xl p-5">
          <p className="text-zinc-500 text-xs mb-3">Ruta del viaje</p>
          <div className="flex items-start gap-3">
            <div className="flex flex-col items-center pt-1 flex-shrink-0">
              <div className="w-2.5 h-2.5 rounded-full bg-zinc-500" />
              <div className="w-px h-8 bg-zinc-700" />
              <div className="w-2.5 h-2.5 bg-white rounded-sm" />
            </div>
            <div className="flex-1 min-w-0 space-y-3">
              <div>
                <p className="text-zinc-600 text-[10px] uppercase tracking-wider">Origen</p>
                <p className="text-white font-semibold">{data.ride.origin}</p>
              </div>
              <div>
                <p className="text-zinc-600 text-[10px] uppercase tracking-wider">Destino</p>
                <p className="text-white font-semibold">{data.ride.destination}</p>
              </div>
            </div>
          </div>
        </div>

        {/* Otra parte */}
        <div className="bg-zinc-900 rounded-2xl p-5">
          <p className="text-zinc-500 text-xs mb-3">{isDriver ? 'Tu pasajero' : 'Tu conductor'}</p>
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-full bg-zinc-800 overflow-hidden flex-shrink-0 flex items-center justify-center">
              {otherParty.avatar
                ? <img src={otherParty.avatar} alt="" className="w-full h-full object-cover" />
                : <span className="text-white font-bold">{otherParty.name[0]?.toUpperCase()}</span>
              }
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-white font-semibold truncate">{otherParty.name}</p>
              <RatingDisplay rating={otherParty.rating} count={otherParty.rating_count} />
            </div>
            {otherParty.phone && (
              <a
                href={`tel:${otherParty.phone}`}
                className="bg-zinc-800 hover:bg-zinc-700 p-2.5 rounded-xl transition-colors flex-shrink-0"
                title={`Llamar ${otherParty.phone}`}
              >
                <Phone size={14} weight="duotone" className="text-white" />
              </a>
            )}
          </div>
        </div>

        {/* Vehículo (solo pasajero) */}
        {!isDriver && carInfo && (
          <div className="bg-zinc-900 rounded-2xl p-4">
            <p className="text-zinc-500 text-xs mb-2">Vehículo</p>
            <div className="flex items-center gap-2">
              <Car size={14} weight="duotone" className="text-zinc-500" />
              <p className="text-white text-sm">{carInfo}</p>
            </div>
          </div>
        )}

        {/* Detalles */}
        <div className="bg-zinc-900 rounded-2xl p-4 space-y-2.5">
          <div className="flex justify-between text-sm">
            <span className="text-zinc-500">Hora de salida</span>
            <span className="text-white font-medium">{data.ride.time}</span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-zinc-500">Asientos</span>
            <span className="text-white font-medium">{data.booking.seats}</span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-zinc-500">Precio total</span>
            <span className="text-white font-bold">${(data.ride.price * data.booking.seats).toLocaleString()}</span>
          </div>
        </div>

        {/* Botón de chat con badge de mensajes no leídos */}
        <button
          onClick={openChat}
          className="w-full flex items-center justify-center gap-2 bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 text-white text-sm py-3 rounded-xl transition-colors relative"
        >
          <span className="relative">
            <ChatCircle size={15} weight="duotone" />
            {unreadCount > 0 && (
              <span className="absolute -top-1.5 -right-1.5 bg-red-500 text-white text-[9px] font-bold rounded-full min-w-[14px] h-[14px] flex items-center justify-center px-0.5">
                {unreadCount > 9 ? '9+' : unreadCount}
              </span>
            )}
          </span>
          Chatear con {otherParty.name.split(' ')[0]}
          {unreadCount > 0 && (
            <span className="bg-red-500 text-white text-[10px] font-bold px-1.5 py-0.5 rounded-full">
              {unreadCount} nuevo{unreadCount !== 1 ? 's' : ''}
            </span>
          )}
        </button>

        {/* CTAs del conductor */}
        {isDriver && confirmed && (
          <button
            onClick={startTrip}
            disabled={acting}
            className="w-full flex items-center justify-center gap-2 bg-white text-black font-bold py-4 rounded-xl hover:bg-zinc-200 disabled:opacity-50 transition-colors"
          >
            <Play size={16} weight="duotone" /> {acting ? 'Iniciando...' : 'Iniciar viaje'}
          </button>
        )}
        {isDriver && inProgress && (
          <button
            onClick={finishTrip}
            disabled={acting}
            className="w-full flex items-center justify-center gap-2 bg-white text-black font-bold py-4 rounded-xl hover:bg-zinc-200 disabled:opacity-50 transition-colors"
          >
            <Flag size={16} weight="duotone" /> {acting ? 'Finalizando...' : 'Finalizar viaje'}
          </button>
        )}
        {!isDriver && inProgress && (
          <p className="text-center text-zinc-600 text-xs py-2">
            El conductor te avisará cuando finalice el viaje.
          </p>
        )}
      </div>
    </div>
  );
}
