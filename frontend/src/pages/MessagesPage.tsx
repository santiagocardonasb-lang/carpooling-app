import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { ChatCircle, ArrowLeft, CaretRight } from '@phosphor-icons/react';
import api from '../api';
import { parseDate } from '../utils/date';

interface Conversation {
  booking_id: number;
  status: string;
  ride: { origin: string; destination: string; date?: string; time: string; is_recurring: number };
  other: { id: number; name: string; avatar?: string };
  last_message: { text: string; created_at: string; mine: boolean } | null;
  unread: number;
}

export default function MessagesPage() {
  const navigate = useNavigate();
  const [convs, setConvs] = useState<Conversation[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let mounted = true;
    const fetchConvs = async () => {
      try {
        const { data } = await api.get('/messages/conversations');
        if (mounted) setConvs(data);
      } catch {
        // silencioso — el polling siguiente reintenta
      } finally {
        if (mounted) setLoading(false);
      }
    };
    fetchConvs();
    const i = setInterval(fetchConvs, 5000);
    return () => { mounted = false; clearInterval(i); };
  }, []);

  const formatTime = (s: string) => {
    const d = parseDate(s);
    const now = new Date();
    const diff = now.getTime() - d.getTime();
    if (diff < 60_000) return 'Ahora';
    if (diff < 3_600_000) return `${Math.floor(diff / 60_000)}m`;
    if (diff < 86_400_000) return d.toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' });
    return d.toLocaleDateString('es-ES', { day: 'numeric', month: 'short' });
  };

  return (
    <div className="min-h-screen bg-black pt-20 px-6 pb-10">
      <div className="max-w-sm mx-auto mt-4">
        <button
          onClick={() => navigate(-1)}
          className="flex items-center gap-2 text-zinc-500 hover:text-white text-sm mb-4 transition-colors"
        >
          <ArrowLeft size={16} weight="bold" /> Volver
        </button>
        <h1 className="text-2xl font-black text-white mb-2">Mensajes</h1>
        <p className="text-zinc-500 text-sm mb-6">Tus conversaciones de viajes activos</p>

        {loading ? (
          <div className="text-center py-16 text-zinc-700 text-sm">Cargando...</div>
        ) : convs.length === 0 ? (
          <div className="text-center py-16">
            <ChatCircle size={36} weight="duotone" className="text-zinc-800 mx-auto mb-3" />
            <p className="text-zinc-600 font-semibold">Sin conversaciones</p>
            <p className="text-zinc-700 text-sm mt-1">
              Aquí verás los chats con conductores o pasajeros de viajes confirmados
            </p>
          </div>
        ) : (
          <div className="space-y-2">
            {convs.map(c => (
              <button
                key={c.booking_id}
                onClick={() => navigate(`/chat/${c.booking_id}`)}
                className={`w-full flex items-center gap-3 rounded-2xl p-4 text-left transition-all border ${
                  c.unread > 0
                    ? 'bg-zinc-900 border-zinc-700 hover:border-zinc-600'
                    : 'bg-zinc-900 border-zinc-800 hover:border-zinc-700 hover:bg-zinc-800/60'
                }`}
              >
                {/* Avatar con badge de no leídos */}
                <div className="relative w-12 h-12 rounded-full bg-zinc-800 overflow-hidden flex-shrink-0 flex items-center justify-center">
                  {c.other.avatar
                    ? <img src={c.other.avatar} alt="" className="w-full h-full object-cover" />
                    : <span className="text-white font-bold">{c.other.name[0]?.toUpperCase()}</span>
                  }
                  {c.unread > 0 && (
                    <span className="absolute -top-0.5 -right-0.5 min-w-[18px] h-[18px] bg-red-500 rounded-full flex items-center justify-center text-white text-[9px] font-bold px-1 ring-2 ring-zinc-900">
                      {c.unread > 9 ? '9+' : c.unread}
                    </span>
                  )}
                </div>

                {/* Info */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between gap-2 mb-0.5">
                    <p className={`text-sm truncate ${c.unread > 0 ? 'text-white font-bold' : 'text-white font-semibold'}`}>
                      {c.other.name}
                    </p>
                    {c.last_message && (
                      <span className="text-zinc-600 text-[10px] flex-shrink-0">
                        {formatTime(c.last_message.created_at)}
                      </span>
                    )}
                  </div>
                  <p className="text-zinc-500 text-[11px] truncate flex items-center gap-1">
                    {c.status === 'in_progress' && <span className="inline-block w-1.5 h-1.5 bg-yellow-400 rounded-full animate-pulse" />}
                    {c.ride.origin} → {c.ride.destination}
                  </p>
                  {c.last_message ? (
                    <p className={`text-xs mt-1 truncate ${c.unread > 0 ? 'text-zinc-200 font-medium' : 'text-zinc-500'}`}>
                      {c.last_message.mine && <span className="text-zinc-600">Tú: </span>}
                      {c.last_message.text}
                    </p>
                  ) : (
                    <p className="text-zinc-700 text-xs mt-1 italic">Sin mensajes aún · Empieza la conversación</p>
                  )}
                </div>

                <CaretRight size={14} weight="bold" className="text-zinc-700 flex-shrink-0" />
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
