import { useState, useEffect } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { Car, Bike, Search, LayoutGrid } from 'lucide-react';
import api from '../api';
import RideCard from '../components/RideCard';
import LocationInput from '../components/LocationInput';
import DatePicker from '../components/DatePicker';
import { useAuth } from '../context/AuthContext';

interface Ride {
  id: number;
  origin: string;
  destination: string;
  date: string;
  time: string;
  seats: number;
  seats_available: number;
  price: number;
  driver_name: string;
  driver_phone: string;
  description?: string;
  driver_id: number;
  status: string;
  vehicle_type: string;
  is_recurring: number;
  days_of_week?: string;
  car_brand?: string;
  car_color?: string;
  car_plate?: string;
}

const DAY_NAMES = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'];

export default function SearchRides() {
  const [searchParams] = useSearchParams();
  const [filters, setFilters] = useState({
    origin: searchParams.get('origin') || '',
    destination: searchParams.get('destination') || '',
    date: '',
  });
  const [vehicleType, setVehicleType] = useState<'all' | 'car' | 'moto'>('all');
  const [rides, setRides] = useState<Ride[]>([]);
  const [loading, setLoading] = useState(false);
  const [searched, setSearched] = useState(false);
  const { isAuthenticated } = useAuth();
  const navigate = useNavigate();

  const fetchRides = async () => {
    setLoading(true);
    setSearched(true);
    try {
      const params = new URLSearchParams();
      if (filters.origin) params.append('origin', filters.origin);
      if (filters.destination) params.append('destination', filters.destination);
      if (filters.date) params.append('date', filters.date);
      if (vehicleType !== 'all') params.append('vehicle_type', vehicleType);
      const { data } = await api.get(`/rides?${params}`);
      setRides(data);
    } catch { alert('Error al buscar viajes'); }
    finally { setLoading(false); }
  };

  useEffect(() => {
    if (filters.origin || filters.destination) fetchRides();
  }, []);

  const formatDays = (daysStr?: string) => {
    if (!daysStr) return '';
    return daysStr.split(',').map(d => DAY_NAMES[Number(d)]).join(' · ');
  };

  return (
    <div className="min-h-screen bg-black pt-20 px-6 pb-10">
      <div className="max-w-xl mx-auto">
        <div className="mt-4 mb-6 space-y-3">

          {/* Search box */}
          <div className="bg-zinc-900 rounded-2xl">
            <div className="flex items-center px-4 py-3.5 border-b border-zinc-800">
              <LocationInput value={filters.origin} onChange={(v) => setFilters({ ...filters, origin: v })} placeholder="Origen" dot="origin" />
            </div>
            <div className="flex items-center px-4 py-3.5 border-b border-zinc-800">
              <LocationInput value={filters.destination} onChange={(v) => setFilters({ ...filters, destination: v })} placeholder="Destino" dot="destination" />
            </div>
            <div className="px-4 py-2">
              <DatePicker
                value={filters.date}
                onChange={(v) => setFilters({ ...filters, date: v })}
                placeholder="Cualquier fecha (opcional)"
              />
            </div>
            <div className="px-4 pb-4">
              <button
                onClick={fetchRides}
                disabled={loading}
                className="w-full bg-white text-black font-semibold py-3 rounded-xl hover:bg-zinc-200 disabled:opacity-50 transition-colors text-sm flex items-center justify-center gap-2"
              >
                <Search size={15} />
                {loading ? 'Buscando...' : 'Buscar'}
              </button>
            </div>
          </div>

          {/* Vehicle filter */}
          <div className="flex gap-2">
            {([
              { key: 'all', label: 'Todos', icon: <LayoutGrid size={13} /> },
              { key: 'car', label: 'Carro', icon: <Car size={13} /> },
              { key: 'moto', label: 'Moto', icon: <Bike size={13} /> },
            ] as const).map(({ key, label, icon }) => (
              <button
                key={key}
                onClick={() => setVehicleType(key)}
                className={`flex items-center gap-1.5 px-4 py-2 rounded-full text-xs font-medium transition-all border ${
                  vehicleType === key ? 'bg-white text-black border-white' : 'bg-transparent text-zinc-500 border-zinc-800 hover:border-zinc-600'
                }`}
              >
                {icon} {label}
              </button>
            ))}
          </div>
        </div>

        {/* Results */}
        {searched && (
          rides.length === 0 ? (
            <div className="text-center py-14 px-4">
              <div className="w-14 h-14 bg-zinc-900 rounded-2xl flex items-center justify-center mx-auto mb-4">
                <Search size={24} className="text-zinc-600" />
              </div>
              <p className="text-white text-lg font-semibold mb-2">Sin viajes disponibles</p>
              <p className="text-zinc-600 text-sm mb-6 leading-relaxed">
                No hay conductores en esa ruta por ahora.
                {filters.date ? ' Prueba otra fecha o amplía el origen.' : ' Prueba sin filtro de fecha.'}
              </p>
              <div className="space-y-2">
                <button
                  onClick={() => { setFilters(f => ({ ...f, date: '' })); setTimeout(fetchRides, 0); }}
                  className="block w-full border border-zinc-800 text-zinc-400 py-3 rounded-xl text-sm hover:border-zinc-600 hover:text-white transition-colors"
                >
                  Ver todos los viajes
                </button>
                <button
                  onClick={() => navigate('/create-ride')}
                  className="block w-full bg-white text-black py-3 rounded-xl text-sm font-medium hover:bg-zinc-200 transition-colors"
                >
                  ¿Tienes auto? Publica tu viaje →
                </button>
              </div>
            </div>
          ) : (
            <div className="space-y-3">
              <p className="text-zinc-600 text-xs">{rides.length} viaje{rides.length !== 1 ? 's' : ''} disponible{rides.length !== 1 ? 's' : ''}</p>
              {rides.map((ride) => (
                <RideCard
                  key={ride.id}
                  ride={{ ...ride, days_label: ride.is_recurring && ride.days_of_week ? formatDays(ride.days_of_week) : undefined }}
                  showActions={isAuthenticated}
                  onBook={fetchRides}
                />
              ))}
              {!isAuthenticated && (
                <button onClick={() => navigate('/login')} className="w-full border border-zinc-800 text-zinc-400 py-3.5 rounded-2xl text-sm hover:border-zinc-600 hover:text-white transition-colors mt-2">
                  Inicia sesión para solicitar un viaje →
                </button>
              )}
            </div>
          )
        )}
      </div>
    </div>
  );
}
