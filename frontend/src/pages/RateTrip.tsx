import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Star, ArrowRight } from '@phosphor-icons/react';
import api from '../api';
import { useToast } from '../context/ToastContext';

interface TripData {
  booking: { id: number; status: string };
  ride: { origin: string; destination: string };
  driver: { id: number; name: string; avatar?: string; rating: number; rating_count: number };
  passenger: { id: number; name: string; avatar?: string; rating: number; rating_count: number };
  my_role: 'driver' | 'passenger';
  already_rated: boolean;
}

export default function RateTrip() {
  const { bookingId } = useParams();
  const navigate = useNavigate();
  const { showToast } = useToast();

  const [data, setData] = useState<TripData | null>(null);
  const [loading, setLoading] = useState(true);
  const [rating, setRating] = useState(0);
  const [hover, setHover] = useState(0);
  const [comment, setComment] = useState('');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    api.get(`/bookings/${bookingId}/trip-view`)
      .then(({ data }) => {
        setData(data);
        if (data.booking.status !== 'completed') {
          showToast('Solo puedes calificar viajes completados');
          navigate('/my-rides', { replace: true });
        } else if (data.already_rated) {
          showToast('Ya calificaste este viaje');
          navigate('/my-rides', { replace: true });
        }
      })
      .catch(() => navigate('/my-rides', { replace: true }))
      .finally(() => setLoading(false));
  }, [bookingId, navigate, showToast]);

  const submit = async () => {
    if (rating < 1 || submitting) return;
    setSubmitting(true);
    try {
      await api.post('/ratings', { booking_id: bookingId, rating, comment });
      showToast('¡Gracias por tu calificación!');
      navigate('/my-rides', { replace: true });
    } catch (e: unknown) {
      showToast((e as { response?: { data?: { error?: string } } })?.response?.data?.error || 'Error', 'error');
    } finally {
      setSubmitting(false);
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
  const initials = otherParty.name.split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 2);

  return (
    <div className="min-h-screen bg-black px-6 py-12 flex flex-col">
      <div className="max-w-sm mx-auto w-full flex-1 flex flex-col">

        {/* Resumen del viaje completado */}
        <div className="text-center mb-8">
          <div className="inline-block bg-blue-900/30 border border-blue-800 rounded-full px-4 py-1 mb-4">
            <p className="text-blue-400 text-xs font-bold uppercase tracking-wider">✓ Viaje completado</p>
          </div>
          <p className="text-zinc-500 text-sm">
            {data.ride.origin} → {data.ride.destination}
          </p>
        </div>

        {/* Avatar y nombre del calificado */}
        <div className="flex flex-col items-center mb-2">
          <div className="w-24 h-24 rounded-full bg-zinc-800 overflow-hidden flex items-center justify-center mb-3">
            {otherParty.avatar ? (
              <img src={otherParty.avatar} alt="" className="w-full h-full object-cover" />
            ) : (
              <span className="text-white text-2xl font-bold">{initials}</span>
            )}
          </div>
          <h1 className="text-white text-xl font-bold">{otherParty.name}</h1>
          {otherParty.rating_count > 0 ? (
            <div className="flex items-center gap-1 mt-1">
              <Star size={14} weight="fill" className="text-yellow-400" />
              <span className="text-yellow-400 text-sm font-semibold">{otherParty.rating.toFixed(1)}</span>
              <span className="text-zinc-600 text-sm">({otherParty.rating_count})</span>
            </div>
          ) : (
            <p className="text-zinc-700 text-xs mt-1">Sin calificaciones aún · serás el primero</p>
          )}
        </div>

        <p className="text-center text-zinc-400 text-sm mt-6 mb-4">
          ¿Cómo estuvo {isDriver ? 'el pasajero' : 'el conductor'}?
        </p>

        {/* Estrellas grandes */}
        <div className="flex justify-center gap-3 mb-6">
          {[1, 2, 3, 4, 5].map(n => (
            <button
              key={n}
              type="button"
              onMouseEnter={() => setHover(n)}
              onMouseLeave={() => setHover(0)}
              onClick={() => setRating(n)}
              className="transition-transform hover:scale-110 active:scale-95"
            >
              <Star
                size={42}
                weight={n <= (hover || rating) ? 'fill' : 'regular'}
                className={n <= (hover || rating) ? 'text-yellow-400' : 'text-zinc-700'}
              />
            </button>
          ))}
        </div>

        {rating > 0 && (
          <p className="text-center text-zinc-500 text-xs mb-4">
            {['', 'Muy mal', 'Regular', 'Bien', 'Muy bien', 'Excelente'][rating]}
          </p>
        )}

        <textarea
          value={comment}
          onChange={(e) => setComment(e.target.value)}
          placeholder="Cuéntanos cómo fue (opcional)"
          rows={3}
          maxLength={500}
          className="w-full bg-zinc-900 text-white placeholder-zinc-600 px-4 py-3 rounded-xl text-sm resize-none focus:ring-2 focus:ring-white outline-none mb-4"
        />

        <button
          onClick={submit}
          disabled={rating < 1 || submitting}
          className="w-full bg-white text-black font-bold py-4 rounded-xl hover:bg-zinc-200 disabled:opacity-40 transition-colors"
        >
          {submitting ? 'Enviando...' : 'Enviar calificación'}
        </button>

        <button
          onClick={() => navigate('/my-rides', { replace: true })}
          className="w-full text-zinc-600 hover:text-zinc-400 text-sm py-3 mt-2 flex items-center justify-center gap-1 transition-colors"
        >
          Después <ArrowRight size={13} weight="bold" />
        </button>
      </div>
    </div>
  );
}
