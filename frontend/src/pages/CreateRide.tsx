import { useState, useEffect, FormEvent } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { Car, Motorcycle, ArrowsClockwise, WarningCircle } from '@phosphor-icons/react';
import api from '../api';
import LocationInput from '../components/LocationInput';
import Toggle from '../components/Toggle';
import DatePicker from '../components/DatePicker';
import TimePicker from '../components/TimePicker';
import { useToast } from '../context/ToastContext';

const DAYS = [
  { id: 1, short: 'L', label: 'Lunes' },
  { id: 2, short: 'M', label: 'Martes' },
  { id: 3, short: 'X', label: 'Miércoles' },
  { id: 4, short: 'J', label: 'Jueves' },
  { id: 5, short: 'V', label: 'Viernes' },
  { id: 6, short: 'S', label: 'Sábado' },
  { id: 0, short: 'D', label: 'Domingo' },
];

type FieldErrors = Partial<Record<'origin' | 'destination' | 'time' | 'seats' | 'price' | 'date' | 'days_of_week', boolean>>;

export default function CreateRide() {
  const [form, setForm] = useState({ origin: '', destination: '', date: '', time: '', seats: '', price: '', description: '' });
  const [vehicleType, setVehicleType] = useState<'car' | 'moto'>('car');
  const [isRecurring, setIsRecurring] = useState(false);
  const [selectedDays, setSelectedDays] = useState<number[]>([1, 2, 3, 4, 5]);
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});
  const [sameRouteError, setSameRouteError] = useState(false);
  const [loading, setLoading] = useState(false);
  const [vehicleOk, setVehicleOk] = useState<boolean | null>(null);
  const navigate = useNavigate();
  const { showToast } = useToast();

  // Verificar que el conductor tenga datos de vehículo antes de publicar
  useEffect(() => {
    api.get('/profile')
      .then(({ data }) => setVehicleOk(!!(data.car_brand && data.car_plate)))
      .catch(() => setVehicleOk(false));
  }, []);

  const toggleDay = (id: number) =>
    setSelectedDays(prev => prev.includes(id) ? prev.filter(d => d !== id) : [...prev, id]);

  const validate = (): FieldErrors => {
    const errs: FieldErrors = {};
    if (!form.origin.trim()) errs.origin = true;
    if (!form.destination.trim()) errs.destination = true;
    // Origen y destino no pueden ser iguales
    if (form.origin.trim() && form.destination.trim() &&
        form.origin.trim().toLowerCase() === form.destination.trim().toLowerCase()) {
      errs.origin = true;
      errs.destination = true;
      setSameRouteError(true);
    } else {
      setSameRouteError(false);
    }
    if (!form.time) errs.time = true;
    if (!form.seats || Number(form.seats) < 1) errs.seats = true;
    if (form.price === '' || isNaN(Number(form.price))) errs.price = true;
    if (!isRecurring && !form.date) errs.date = true;
    if (isRecurring && selectedDays.length === 0) errs.days_of_week = true;
    return errs;
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    const errs = validate();
    if (Object.keys(errs).length > 0) { setFieldErrors(errs); return; }
    setFieldErrors({});
    setLoading(true);
    try {
      await api.post('/rides', {
        ...form,
        seats: Number(form.seats),
        price: Number(form.price),
        vehicle_type: vehicleType,
        is_recurring: isRecurring,
        days_of_week: isRecurring ? selectedDays.join(',') : null,
        date: isRecurring ? null : form.date,
      });
      showToast('¡Viaje publicado exitosamente!');
      navigate('/my-rides');
    } catch (err: unknown) {
      const res = (err as { response?: { data?: { error?: string; fields?: FieldErrors } } })?.response?.data;
      if (res?.fields) setFieldErrors(res.fields);
      else showToast(res?.error || 'Error al publicar el viaje. Intenta de nuevo.', 'error');
    } finally {
      setLoading(false);
    }
  };

  // Fecha local (toISOString usa UTC → puede dar "mañana" en UTC-5 de noche)
  const _now = new Date();
  const today = `${_now.getFullYear()}-${String(_now.getMonth()+1).padStart(2,'0')}-${String(_now.getDate()).padStart(2,'0')}`;
  const hasErrors = Object.values(fieldErrors).some(Boolean);

  const inputCls = (field: keyof FieldErrors) =>
    `w-full bg-zinc-900 text-white placeholder-zinc-600 px-4 py-3.5 rounded-xl text-sm transition [color-scheme:dark] ${
      fieldErrors[field] ? 'ring-2 ring-red-500 placeholder-red-900' : 'focus:ring-2 focus:ring-white'
    }`;

  // Pantalla de bloqueo si no hay datos de vehículo
  if (vehicleOk === false) {
    return (
      <div className="min-h-screen bg-black pt-20 px-6 pb-10 flex items-center justify-center">
        <div className="max-w-sm w-full text-center">
          <div className="w-16 h-16 bg-zinc-900 rounded-2xl flex items-center justify-center mx-auto mb-4">
            <Car size={28} weight="duotone" className="text-zinc-500" />
          </div>
          <h2 className="text-white text-xl font-bold mb-2">Completa tu vehículo</h2>
          <p className="text-zinc-500 text-sm mb-6 leading-relaxed">
            Antes de publicar un viaje, los pasajeros necesitan conocer tu vehículo.
            Agrega la marca y placa para continuar.
          </p>
          <Link
            to="/vehicle"
            className="inline-block bg-white text-black font-semibold px-6 py-3 rounded-xl hover:bg-zinc-200 transition-colors text-sm"
          >
            Agregar información del vehículo →
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-black pt-20 px-6 pb-10">
      <div className="max-w-sm mx-auto mt-4">
        <h1 className="text-2xl font-black text-white mb-1">Publicar viaje</h1>
        <p className="text-zinc-600 text-sm mb-6">Comparte tu ruta y gana dinero</p>

        <form onSubmit={handleSubmit} className="space-y-4">

          {/* Vehicle type */}
          <div>
            <label className="block text-zinc-500 text-xs mb-2">Vehículo</label>
            <div className="flex gap-2">
              {(['car', 'moto'] as const).map((type) => (
                <button
                  key={type}
                  type="button"
                  onClick={() => setVehicleType(type)}
                  className={`flex-1 flex items-center justify-center gap-2 py-3 rounded-xl text-sm font-medium transition-all border ${
                    vehicleType === type ? 'bg-white text-black border-white' : 'bg-transparent text-zinc-500 border-zinc-800 hover:border-zinc-600'
                  }`}
                >
                  {type === 'car' ? <Car size={16} weight="duotone" /> : <Motorcycle size={16} weight="duotone" />}
                  {type === 'car' ? 'Carro' : 'Moto'}
                </button>
              ))}
            </div>
          </div>

          {/* Origin / Destination — overflow-visible to allow dropdown */}
          <div>
            <label className="block text-zinc-500 text-xs mb-2">
              Ruta
              {(fieldErrors.origin || fieldErrors.destination) && (
                <span className="ml-2 text-red-400">← requerido</span>
              )}
            </label>
            <div className="bg-zinc-900 rounded-2xl">
              <div className={`flex items-center px-4 py-3.5 border-b ${fieldErrors.origin ? 'border-red-800' : 'border-zinc-800'}`}>
                <LocationInput value={form.origin} onChange={(v) => { setForm({ ...form, origin: v }); setFieldErrors(p => ({ ...p, origin: false })); }} placeholder="Origen" dot="origin" error={fieldErrors.origin} />
              </div>
              <div className={`flex items-center px-4 py-3.5 ${fieldErrors.destination ? 'border border-red-800 rounded-b-2xl' : ''}`}>
                <LocationInput value={form.destination} onChange={(v) => { setForm({ ...form, destination: v }); setFieldErrors(p => ({ ...p, destination: false })); }} placeholder="Destino" dot="destination" error={fieldErrors.destination} />
              </div>
            </div>
          </div>

          {/* Recurring toggle */}
          <div className="bg-zinc-900 rounded-xl px-4 py-3.5">
            <div className="flex items-center gap-3">
              <div className="flex items-center gap-2 min-w-0 flex-1">
                <ArrowsClockwise size={15} weight="duotone" className="text-zinc-500 flex-shrink-0" />
                <div className="min-w-0">
                  <p className="text-white text-sm font-medium">Viaje recurrente</p>
                  <p className="text-zinc-600 text-xs">Sale varios días a la semana</p>
                </div>
              </div>
              <Toggle checked={isRecurring} onChange={() => setIsRecurring(!isRecurring)} />
            </div>

            {/* Days inside the same card to avoid overflow */}
            {isRecurring && (
              <div className="mt-4 pt-4 border-t border-zinc-800">
                <div className="flex items-center justify-between mb-3">
                  <p className="text-zinc-400 text-xs">Días de la semana {fieldErrors.days_of_week && <span className="text-red-400">← selecciona al menos uno</span>}</p>
                  <div className="flex gap-3">
                    <button type="button" onClick={() => setSelectedDays([1,2,3,4,5])} className="text-zinc-500 text-xs hover:text-white transition-colors">L–V</button>
                    <button type="button" onClick={() => setSelectedDays([0,1,2,3,4,5,6])} className="text-zinc-500 text-xs hover:text-white transition-colors">Todos</button>
                  </div>
                </div>
                <div className="grid grid-cols-7 gap-1">
                  {DAYS.map(({ id, short, label }) => (
                    <button
                      key={id}
                      type="button"
                      title={label}
                      onClick={() => { toggleDay(id); setFieldErrors(p => ({ ...p, days_of_week: false })); }}
                      className={`py-2 rounded-lg text-xs font-semibold transition-all ${
                        selectedDays.includes(id) ? 'bg-white text-black' : fieldErrors.days_of_week ? 'bg-red-900/30 text-red-500 border border-red-800' : 'bg-zinc-800 text-zinc-500 hover:bg-zinc-700'
                      }`}
                    >
                      {short}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Date (one-time only) */}
          {!isRecurring && (
            <div>
              <label className="block text-zinc-500 text-xs mb-1.5">
                Fecha {fieldErrors.date && <span className="text-red-400">← requerido</span>}
              </label>
              <DatePicker
                value={form.date}
                onChange={(v) => { setForm({ ...form, date: v }); setFieldErrors(p => ({ ...p, date: false })); }}
                min={today}
                error={fieldErrors.date}
                placeholder="Seleccionar fecha"
              />
            </div>
          )}

          {/* Time */}
          <div>
            <label className="block text-zinc-500 text-xs mb-1.5">
              Hora de salida {fieldErrors.time && <span className="text-red-400">← requerido</span>}
            </label>
            <TimePicker
              value={form.time}
              onChange={(v) => { setForm({ ...form, time: v }); setFieldErrors(p => ({ ...p, time: false })); }}
              error={fieldErrors.time}
              placeholder="Seleccionar hora"
            />
          </div>

          {/* Seats + Price */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-zinc-500 text-xs mb-1.5">
                Asientos {fieldErrors.seats && <span className="text-red-400">!</span>}
              </label>
              <input
                type="number"
                value={form.seats}
                onChange={(e) => { setForm({ ...form, seats: e.target.value }); setFieldErrors(p => ({ ...p, seats: false })); }}
                min={1}
                max={vehicleType === 'moto' ? 1 : 8}
                placeholder={vehicleType === 'moto' ? '1' : '3'}
                className={inputCls('seats')}
              />
            </div>
            <div>
              <label className="block text-zinc-500 text-xs mb-1.5">
                Precio ($) {fieldErrors.price && <span className="text-red-400">!</span>}
              </label>
              <input
                type="number"
                value={form.price}
                onChange={(e) => { setForm({ ...form, price: e.target.value }); setFieldErrors(p => ({ ...p, price: false })); }}
                min={0}
                step="100"
                placeholder="25000"
                className={inputCls('price')}
              />
            </div>
          </div>

          {/* Note */}
          <div>
            <label className="block text-zinc-500 text-xs mb-1.5">Nota (opcional)</label>
            <textarea
              value={form.description}
              onChange={(e) => setForm({ ...form, description: e.target.value })}
              rows={2}
              placeholder="Ej. Salgo puntual, música suave..."
              className="w-full bg-zinc-900 text-white placeholder-zinc-600 px-4 py-3.5 rounded-xl text-sm resize-none focus:ring-2 focus:ring-white transition"
            />
          </div>

          {sameRouteError && (
            <div className="flex items-center gap-2 bg-red-900/20 border border-red-900/50 px-3 py-2.5 rounded-xl">
              <WarningCircle size={14} weight="duotone" className="text-red-400 flex-shrink-0" />
              <p className="text-red-400 text-xs">El origen y el destino no pueden ser el mismo lugar.</p>
            </div>
          )}
          {hasErrors && !sameRouteError && (
            <div className="flex items-center gap-2 bg-red-900/20 border border-red-900/50 px-3 py-2.5 rounded-xl">
              <WarningCircle size={14} weight="duotone" className="text-red-400 flex-shrink-0" />
              <p className="text-red-400 text-xs">Completa los campos marcados en rojo antes de continuar.</p>
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-white text-black font-semibold py-4 rounded-xl hover:bg-zinc-200 disabled:opacity-50 transition-colors text-sm"
          >
            {loading ? 'Publicando...' : 'Publicar viaje'}
          </button>
        </form>
      </div>
    </div>
  );
}
