import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, CheckCircle, XCircle, AlertCircle, Bell, Trash2, Users, ChevronRight, Star } from 'lucide-react';
import api from '../api';
import { useAuth } from '../context/AuthContext';

type NotifType =
  | 'ride_cancelled'
  | 'booking_accepted'
  | 'booking_rejected'
  | 'booking_request'
  | 'booking_completed';

interface Notif {
  id: number;
  type: NotifType;
  title: string;
  message: string;
  read: number;
  created_at: string;
}

export default function NotificationsPage() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const isDriver = user?.role !== 'passenger';
  const [notifs, setNotifs] = useState<Notif[]>([]);
  const [loading, setLoading] = useState(true);

  const load = async () => {
    const { data } = await api.get('/notifications');
    setNotifs(data);
    setLoading(false);
    await api.patch('/notifications/read-all');
  };

  useEffect(() => { load(); }, []);

  const deleteOne = async (e: React.MouseEvent, id: number) => {
    e.stopPropagation();
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

  // Mapa de tipo → ruta destino. Depende del rol porque el conductor y pasajero
  // van a vistas distintas dentro de /my-rides.
  const getDestination = (type: NotifType): string | null => {
    switch (type) {
      case 'booking_request':
        // Sólo el conductor recibe esto → tab "Solicitudes"
        return '/my-rides?tab=requests';
      case 'booking_accepted':
      case 'booking_rejected':
      case 'ride_cancelled':
        // El pasajero recibe estas → su lista de reservas
        return '/my-rides';
      case 'booking_completed':
        // Pasajero: puede calificar al conductor desde ahí
        return '/my-rides';
      default:
        return null;
    }
  };

  const handleClick = (n: Notif) => {
    const dest = getDestination(n.type);
    if (!dest) return;
    // Si por alguna razón llegan tipos cruzados con el rol, llevamos a my-rides genérico
    if (n.type === 'booking_request' && !isDriver) {
      navigate('/my-rides');
    } else {
      navigate(dest);
    }
  };

  const icon = (type: NotifType) => {
    if (type === 'booking_accepted')  return <CheckCircle size={22} className="text-green-400"  strokeWidth={1.5} />;
    if (type === 'booking_rejected')  return <XCircle     size={22} className="text-red-400"    strokeWidth={1.5} />;
    if (type === 'booking_request')   return <Users       size={22} className="text-blue-400"   strokeWidth={1.5} />;
    if (type === 'booking_completed') return <Star        size={22} className="text-yellow-400" strokeWidth={1.5} />;
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
            {notifs.map(n => {
              const clickable = !!getDestination(n.type);
              return (
                <div
                  key={n.id}
                  onClick={clickable ? () => handleClick(n) : undefined}
                  role={clickable ? 'button' : undefined}
                  tabIndex={clickable ? 0 : undefined}
                  onKeyDown={(e) => { if (clickable && (e.key === 'Enter' || e.key === ' ')) handleClick(n); }}
                  className={`flex gap-3 bg-zinc-900 rounded-2xl p-4 border transition-all ${
                    !n.read ? 'border-zinc-700' : 'border-zinc-800'
                  } ${clickable ? 'cursor-pointer hover:bg-zinc-800/60 hover:border-zinc-600 active:scale-[0.99]' : ''}`}
                >
                  <div className="flex-shrink-0 mt-0.5">{icon(n.type)}</div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-2">
                      <p className={`text-sm font-semibold ${!n.read ? 'text-white' : 'text-zinc-300'}`}>{n.title}</p>
                      {!n.read && <span className="w-2 h-2 rounded-full bg-red-500 flex-shrink-0" />}
                    </div>
                    <p className="text-zinc-500 text-xs mt-0.5 leading-relaxed">{n.message}</p>
                    <p className="text-zinc-700 text-xs mt-1.5">{timeAgo(n.created_at)}</p>
                  </div>
                  <div className="flex flex-col items-end gap-2 flex-shrink-0">
                    <button
                      onClick={(e) => deleteOne(e, n.id)}
                      className="p-1 text-zinc-700 hover:text-red-400 transition-colors rounded"
                      title="Eliminar"
                    >
                      <Trash2 size={14} />
                    </button>
                    {clickable && (
                      <ChevronRight size={14} className="text-zinc-700" />
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
