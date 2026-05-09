import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Sun, Moon, Check } from 'lucide-react';
import { useTheme } from '../context/ThemeContext';

export default function Settings() {
  const navigate = useNavigate();
  const { theme, setTheme } = useTheme();

  const options: { value: 'dark' | 'light'; label: string; desc: string; Icon: typeof Sun }[] = [
    { value: 'dark',  label: 'Modo oscuro', desc: 'Fondo negro, ideal para uso nocturno', Icon: Moon },
    { value: 'light', label: 'Modo claro',  desc: 'Fondo blanco, mejor con luz directa',  Icon: Sun },
  ];

  return (
    <div className="min-h-screen bg-black pt-20 px-6 pb-12">
      <div className="max-w-sm mx-auto mt-4">
        <button onClick={() => navigate(-1)} className="flex items-center gap-2 text-zinc-500 hover:text-white transition-colors text-sm mb-6">
          <ArrowLeft size={16} /> Volver
        </button>

        <h1 className="text-2xl font-black text-white mb-2">Configuración</h1>
        <p className="text-zinc-500 text-sm mb-8">Personaliza la apariencia de la app.</p>

        <section className="mb-8">
          <h3 className="text-zinc-400 text-xs font-semibold uppercase tracking-wider mb-3">Apariencia</h3>
          <div className="space-y-2">
            {options.map(({ value, label, desc, Icon }) => {
              const selected = theme === value;
              return (
                <button
                  key={value}
                  onClick={() => setTheme(value)}
                  className={`w-full flex items-center gap-4 p-4 rounded-2xl border transition-all text-left ${
                    selected ? 'bg-white border-white' : 'bg-zinc-900 border-zinc-800 hover:border-zinc-600'
                  }`}
                >
                  <div className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 ${selected ? 'bg-black' : 'bg-zinc-800'}`}>
                    <Icon size={18} className={selected ? 'text-white' : 'text-zinc-400'} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className={`font-semibold text-sm ${selected ? 'text-black' : 'text-white'}`}>{label}</p>
                    <p className={`text-xs mt-0.5 ${selected ? 'text-zinc-600' : 'text-zinc-500'}`}>{desc}</p>
                  </div>
                  {selected && <Check size={16} className="text-black flex-shrink-0" />}
                </button>
              );
            })}
          </div>
        </section>

        <section>
          <h3 className="text-zinc-400 text-xs font-semibold uppercase tracking-wider mb-3">Acerca de</h3>
          <div className="bg-zinc-900 rounded-2xl p-4 space-y-2">
            <div className="flex items-center justify-between text-sm">
              <span className="text-zinc-500">Versión</span>
              <span className="text-white font-semibold">1.0.0</span>
            </div>
            <div className="flex items-center justify-between text-sm">
              <span className="text-zinc-500">Plataforma</span>
              <span className="text-white">Web</span>
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}
