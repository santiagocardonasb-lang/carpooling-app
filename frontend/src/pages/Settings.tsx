import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Sun, Moon, Check } from '@phosphor-icons/react';
import { useTheme } from '../context/ThemeContext';

export default function Settings() {
  const navigate = useNavigate();
  const { theme, setTheme } = useTheme();

  const options: { value: 'dark' | 'light'; label: string; desc: string; Icon: typeof Sun }[] = [
    { value: 'dark',  label: 'Modo oscuro', desc: 'Fondo negro, ideal para uso nocturno', Icon: Moon },
    { value: 'light', label: 'Modo claro',  desc: 'Fondo blanco, mejor con luz directa',  Icon: Sun },
  ];

  return (
    <div className="min-h-screen bg-canvas pt-20 px-6 pb-12">
      <div className="max-w-sm mx-auto mt-4">
        <button onClick={() => navigate(-1)} className="flex items-center gap-2 text-fg-faint hover:text-fg transition-colors text-sm mb-6">
          <ArrowLeft size={16} weight="bold" /> Volver
        </button>

        <h1 className="text-2xl font-black text-fg mb-2">Configuración</h1>
        <p className="text-fg-faint text-sm mb-8">Personaliza la apariencia de la app.</p>

        <section className="mb-8">
          <h3 className="text-fg-muted text-xs font-semibold uppercase tracking-wider mb-3">Apariencia</h3>
          <div className="space-y-2">
            {options.map(({ value, label, desc, Icon }) => {
              const selected = theme === value;
              return (
                <button
                  key={value}
                  onClick={() => setTheme(value)}
                  className={`w-full flex items-center gap-4 p-4 rounded-2xl border transition-all text-left ${
                    selected ? 'bg-primary border-primary' : 'bg-surface border-line hover:border-line-strong'
                  }`}
                >
                  <div className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 ${selected ? 'bg-canvas' : 'bg-subtle'}`}>
                    <Icon size={18} weight="duotone" className={selected ? 'text-fg' : 'text-fg-muted'} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className={`font-semibold text-sm ${selected ? 'text-on-primary' : 'text-fg'}`}>{label}</p>
                    <p className={`text-xs mt-0.5 ${selected ? 'text-fg-faint' : 'text-fg-faint'}`}>{desc}</p>
                  </div>
                  {selected && <Check size={16} weight="bold" className="text-on-primary flex-shrink-0" />}
                </button>
              );
            })}
          </div>
        </section>

        <section>
          <h3 className="text-fg-muted text-xs font-semibold uppercase tracking-wider mb-3">Acerca de</h3>
          <div className="bg-surface rounded-2xl p-4 space-y-2">
            <div className="flex items-center justify-between text-sm">
              <span className="text-fg-faint">Versión</span>
              <span className="text-fg font-semibold">1.0.0</span>
            </div>
            <div className="flex items-center justify-between text-sm">
              <span className="text-fg-faint">Plataforma</span>
              <span className="text-fg">Web</span>
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}
