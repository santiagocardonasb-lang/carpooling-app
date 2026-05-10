import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Car, Palette, CreditCard, Check, WarningCircle } from '@phosphor-icons/react';
import api from '../api';
import AutocompleteInput from '../components/AutocompleteInput';

const PLATE_REGEX = /^[A-Z]{3}[0-9]{3}$|^[A-Z]{3}[0-9]{2}[A-Z]$/;

const CAR_BRANDS = [
  'Chevrolet', 'Renault', 'Kia', 'Mazda', 'Toyota', 'Hyundai', 'Nissan',
  'Ford', 'Volkswagen', 'Suzuki', 'Honda', 'Mitsubishi', 'BMW', 'Mercedes-Benz',
  'Audi', 'Subaru', 'Jeep', 'Dodge', 'Fiat', 'Peugeot', 'Citroën', 'Volvo',
  'Seat', 'Skoda', 'BYD', 'Chery', 'Geely', 'JAC', 'ZX Auto', 'Brilliance',
  'Haval', 'MG', 'Lifan', 'Zotye', 'Ssangyong', 'Daewoo', 'Isuzu',
];

const CAR_COLORS = [
  'Blanco', 'Negro', 'Gris', 'Plateado', 'Rojo', 'Azul', 'Azul oscuro',
  'Verde', 'Amarillo', 'Naranja', 'Café', 'Beige', 'Vino', 'Morado',
  'Rosa', 'Champagne', 'Dorado', 'Turquesa', 'Crema', 'Granate',
];

export default function VehicleProfile() {
  const navigate = useNavigate();
  const [carBrand, setCarBrand] = useState('');
  const [carColor, setCarColor] = useState('');
  const [carPlate, setCarPlate] = useState('');
  const [plateError, setPlateError] = useState('');
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState<{ type: 'ok' | 'err'; text: string } | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get('/profile')
      .then(({ data }) => {
        setCarBrand(data.car_brand || '');
        setCarColor(data.car_color || '');
        setCarPlate(data.car_plate || '');
      })
      .finally(() => setLoading(false));
  }, []);

  const handlePlateChange = (val: string) => {
    const clean = val.toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 6);
    setCarPlate(clean);
    setPlateError('');
  };

  const save = async () => {
    if (carPlate && !PLATE_REGEX.test(carPlate)) {
      setPlateError('Formato inválido. Usa LLL NNN o LLL NNL (ej: ABC123 o ABC12D)');
      return;
    }
    setSaving(true);
    setMsg(null);
    try {
      await api.put('/profile/vehicle', {
        car_brand: carBrand,
        car_color: carColor,
        car_plate: carPlate,
      });
      setMsg({ type: 'ok', text: 'Información del vehículo actualizada' });
    } catch (err: unknown) {
      setMsg({ type: 'err', text: (err as { response?: { data?: { error?: string } } })?.response?.data?.error || 'Error al guardar' });
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center pt-16">
        <div className="w-6 h-6 border-2 border-zinc-700 border-t-white rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-black pt-20 px-6 pb-12">
      <div className="max-w-sm mx-auto mt-4">
        <button onClick={() => navigate(-1)} className="flex items-center gap-2 text-zinc-500 hover:text-white transition-colors text-sm mb-6">
          <ArrowLeft size={16} weight="bold" /> Volver
        </button>

        <h1 className="text-2xl font-black text-white mb-2">Mi vehículo</h1>
        <p className="text-zinc-500 text-sm mb-8">Esta información es visible para los pasajeros que reserven tu viaje.</p>

        {/* Fields — no overflow-hidden so autocomplete dropdowns can escape */}
        <div className="bg-zinc-900 rounded-2xl mb-4">
          <div className="px-4 py-3.5 border-b border-zinc-800">
            <AutocompleteInput
              value={carBrand}
              onChange={setCarBrand}
              options={CAR_BRANDS}
              placeholder="Marca y modelo (ej. Chevrolet Spark)"
              icon={<Car size={15} weight="duotone" className="text-zinc-500 flex-shrink-0" />}
            />
          </div>
          <div className="px-4 py-3.5 border-b border-zinc-800">
            <AutocompleteInput
              value={carColor}
              onChange={setCarColor}
              options={CAR_COLORS}
              placeholder="Color (ej. Blanco)"
              icon={<Palette size={15} weight="duotone" className="text-zinc-500 flex-shrink-0" />}
            />
          </div>
          <div className="flex items-center gap-3 px-4 py-3.5">
            <CreditCard size={15} weight="duotone" className="text-zinc-500 flex-shrink-0" />
            <input
              type="text"
              value={carPlate}
              onChange={(e) => handlePlateChange(e.target.value)}
              className="flex-1 bg-transparent text-white text-sm focus:outline-none placeholder-zinc-600 tracking-widest font-mono"
              placeholder="Placa (ej. ABC123)"
              maxLength={6}
            />
          </div>
        </div>

        {plateError && (
          <div className="flex items-center gap-2 mb-3 px-3 py-2 rounded-xl text-xs bg-red-900/30 text-red-400">
            <WarningCircle size={13} weight="duotone" />
            {plateError}
          </div>
        )}

        {msg && (
          <div className={`flex items-center gap-2 mb-3 px-3 py-2 rounded-xl text-xs ${
            msg.type === 'ok' ? 'bg-green-900/30 text-green-400' : 'bg-red-900/30 text-red-400'
          }`}>
            {msg.type === 'ok' ? <Check size={13} weight="bold" /> : <WarningCircle size={13} weight="duotone" />}
            {msg.text}
          </div>
        )}

        <div className="bg-zinc-900 rounded-xl px-4 py-3 mb-6">
          <p className="text-zinc-500 text-xs font-semibold mb-1.5">Formato de placa permitido</p>
          <p className="text-zinc-600 text-xs">LLL NNN — 3 letras + 3 números &nbsp;(ej: ABC123)</p>
          <p className="text-zinc-600 text-xs mt-0.5">LLL NNL — 3 letras + 2 números + 1 letra &nbsp;(ej: ABC12D)</p>
        </div>

        <button
          onClick={save}
          disabled={saving}
          className="w-full bg-white text-black font-semibold py-3 rounded-xl hover:bg-zinc-200 disabled:opacity-50 transition-colors text-sm"
        >
          {saving ? 'Guardando...' : 'Guardar vehículo'}
        </button>
      </div>
    </div>
  );
}
