import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, CheckCircle, XCircle, AlertCircle, Bell, Trash2, Users } from 'lucide-react';
import api from '../api';

interface Notif {
  id: number;
  type: 'ride_cancelled' | 'booking_accepted' | 'booking_rejected' | 'booking_request';
  title: string;
  message: string;
  read: number;
  created_at: string;
}

export default function NotificationsPage() {
  const navigate = useNavigate();
  const [notifs, setNotifs] = useState<Notif[]>([]);
  const [loading, setLoading] = useState(true);

  const load = async () => {
    const { data } = await api.get('/notifications');
    setNotifs(data);
    setLoading(false);
    await api.patch('/notifications/read-all');
  };

  useEffect(() => { load(); }, []);

  const deleteOne = async (id: number) => {
    try {
      await api.delete(`/notifications/${id}`);
      setNotifs(prev => prev.filter(n => n.id !== id));
    } catch {}
  };

  const deleteAll = async () => {
    if (!confirm('¿Borrar todas las notificaciones?')) return;
    try {
      await api.delete('/notifications');
      setNotifs([]);
    } catch {}
  };

  const icon = (type: Notif['type']) => {
    if (type === 'booking_accepted') return <CheckCircle size={22} className="text-green-400" strokeWidth={1.5} />;
    if (type === 'booking_rejected') return <XCircle size={22} className="text-red-400" strokeWidth={1.5} />;
    if (type === 'booking_request')  return <Users size={22} className="text-blue-400" strokeWidth={1.5} />;
    return <AlertCircle size={22} className="text-yellow-400" strokeWidth={1.5} />;
  };

  const timeAgo = (dateStr: string) => {
    const diff = (Date.now() - new Date(dateStr).getTime()) / 1000;
    if (diff < 60) return 'Ahora';
    if (diff < 3600) return `Hace ${Math.floor(diff / 60)} min`;
    if (diff < 86400) return `Hace ${Math.floor(diff / 3600)} h`;
    return `Hace ${Math.floor(diff / 86400)} d`;
  };

  return (
    <div className="min-h-screen bg-black pt-20 px-6 pb-10">
      <div className="max-w-sm mx-auto mt-4">
        <div className="flex items-center justify-between mb-4">
          <button onClick={() => navigate(-1)} className="flex items-center gap-2 text-zinc-500 hover:text-white transition-colors text-sm">
            <ArrowLeft size={16} /> Volver
          </button>
          {notifs.length > 0 && (
            <button onClick={deleteAll} className="text-zinc-600 hover:text-red-400 text-xs transition-colors">
              Borrar todas
            </button>
          )}
        </div>

        <h1 className="text-2xl font-black text-white mb-6">Notificaciones</h1>

        {loading ? (
          <div className="text-center py-16 text-zinc-700 text-sm">Cargando...</div>
        ) : notifs.length === 0 ? (
          <div className="text-center py-16">
            <Bell size={36} className="text-zinc-800 mx-auto mb-3" strokeWidth={1.5} />
            <p className="text-zinc-600 font-semibold">Sin notificaciones</p>
            <p className="text-zinc-700 text-sm mt-1">Aquí verás actualizaciones de tus viajes</p>
          </div>
        ) : (
          <div className="space-y-2">
            {notifs.map(n => (
              <div key={n.id} className={`flex gap-3 bg-zinc-900 rounded-2xl p-4 border transition-colors ${
                !n.read ? 'border-zinc-700' : 'border-zinc-800'
              }`}>
                <div className="flex-shrink-0 mt-0.5">{icon(n.type)}</div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between gap-2">
                    <p className={`text-sm font-semibold ${!n.read ? 'text-white' : 'text-zinc-300'}`}>{n.title}</p>
                    {!n.read && <span className="w-2 h-2 rounded-full bg-red-500 flex-shrink-0" />}
                  </div>
                  <p className="text-zinc-500 text-xs mt-0.5 leading-relaxed">{n.message}</p>
                  <p className="text-zinc-700 text-xs mt-1.5">{timeAgo(n.created_at)}</p>
                </div>
                <button
                  onClick={() => deleteOne(n.id)}
                  className="flex-shrink-0 self-start mt-0.5 p-1 text-zinc-700 hover:text-red-400 transition-colors rounded"
                  title="Eliminar"
                >
                  <Trash2 size={14} />
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
