import { useState, useRef, useEffect } from 'react';
import { Clock, ChevronUp, ChevronDown } from 'lucide-react';

interface Props {
  value: string;          // 'HH:MM' or ''
  onChange: (v: string) => void;
  error?: boolean;
  placeholder?: string;
}

export default function TimePicker({ value, onChange, error, placeholder = 'Seleccionar hora' }: Props) {
  const [open, setOpen]     = useState(false);
  const [hour, setHour]     = useState(value ? +value.slice(0,2) : 7);
  const [minute, setMinute] = useState(value ? +value.slice(3,5) : 0);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const h = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', h);
    return () => document.removeEventListener('mousedown', h);
  }, []);

  // when user opens, sync sliders to current value
  const handleOpen = () => {
    if (value) {
      setHour(+value.slice(0,2));
      setMinute(+value.slice(3,5));
    }
    setOpen(o => !o);
  };

  const fmt2 = (n: number) => String(n).padStart(2, '0');

  const changeHour   = (d: number) => setHour(h   => ((h + d) + 24) % 24);
  const changeMinute = (d: number) => setMinute(m  => ((m + d) + 60) % 60);

  const confirm = () => {
    onChange(`${fmt2(hour)}:${fmt2(minute)}`);
    setOpen(false);
  };

  // quick-pick rows
  const QUICK_HOURS   = [6,7,8,9,10,11,12,13,14,15,16,17,18,19,20,21,22];
  const QUICK_MINUTES = [0,5,10,15,20,25,30,35,40,45,50,55];

  return (
    <div ref={ref} className="relative">
      {/* trigger */}
      <button
        type="button"
        onClick={handleOpen}
        className={`w-full flex items-center gap-3 bg-zinc-900 px-4 py-3.5 rounded-xl text-sm transition outline-none ${
          error ? 'ring-2 ring-red-500' : open ? 'ring-2 ring-white' : ''
        }`}
      >
        <Clock size={15} className="text-zinc-500 flex-shrink-0" />
        <span className={value ? 'text-white' : 'text-zinc-600'}>
          {value || placeholder}
        </span>
      </button>

      {open && (
        <div className="absolute top-full mt-2 left-0 right-0 bg-zinc-950 border border-zinc-800 rounded-2xl shadow-2xl z-50 overflow-hidden">
          {/* drum roll display */}
          <div className="flex items-center justify-center gap-3 px-6 pt-5 pb-4 border-b border-zinc-800">
            {/* hours column */}
            <div className="flex flex-col items-center gap-1">
              <button type="button" onClick={() => changeHour(1)}
                className="p-1 text-zinc-500 hover:text-white transition-colors">
                <ChevronUp size={18} />
              </button>
              <div className="w-16 h-14 bg-zinc-800 rounded-xl flex items-center justify-center ring-1 ring-zinc-700">
                <span className="text-white text-3xl font-black tabular-nums">{fmt2(hour)}</span>
              </div>
              <button type="button" onClick={() => changeHour(-1)}
                className="p-1 text-zinc-500 hover:text-white transition-colors">
                <ChevronDown size={18} />
              </button>
              <span className="text-zinc-600 text-[10px] uppercase tracking-wider mt-0.5">horas</span>
            </div>

            <span className="text-zinc-400 text-3xl font-black pb-4">:</span>

            {/* minutes column */}
            <div className="flex flex-col items-center gap-1">
              <button type="button" onClick={() => changeMinute(5)}
                className="p-1 text-zinc-500 hover:text-white transition-colors">
                <ChevronUp size={18} />
              </button>
              <div className="w-16 h-14 bg-zinc-800 rounded-xl flex items-center justify-center ring-1 ring-zinc-700">
                <span className="text-white text-3xl font-black tabular-nums">{fmt2(minute)}</span>
              </div>
              <button type="button" onClick={() => changeMinute(-5)}
                className="p-1 text-zinc-500 hover:text-white transition-colors">
                <ChevronDown size={18} />
              </button>
              <span className="text-zinc-600 text-[10px] uppercase tracking-wider mt-0.5">minutos</span>
            </div>
          </div>

          {/* quick-pick hours */}
          <div className="px-4 pt-3">
            <p className="text-zinc-600 text-[10px] uppercase tracking-wider mb-2">Hora rápida</p>
            <div className="flex flex-wrap gap-1">
              {QUICK_HOURS.map(h => (
                <button
                  key={h}
                  type="button"
                  onClick={() => setHour(h)}
                  className={`px-2.5 py-1 rounded-lg text-xs font-medium transition-all ${
                    hour === h ? 'bg-white text-black' : 'bg-zinc-800 text-zinc-400 hover:bg-zinc-700 hover:text-white'
                  }`}
                >
                  {fmt2(h)}
                </button>
              ))}
            </div>
          </div>

          {/* quick-pick minutes */}
          <div className="px-4 pt-3 pb-4">
            <p className="text-zinc-600 text-[10px] uppercase tracking-wider mb-2">Minutos</p>
            <div className="flex flex-wrap gap-1">
              {QUICK_MINUTES.map(m => (
                <button
                  key={m}
                  type="button"
                  onClick={() => setMinute(m)}
                  className={`w-9 py-1 rounded-lg text-xs font-medium transition-all ${
                    minute === m ? 'bg-white text-black' : 'bg-zinc-800 text-zinc-400 hover:bg-zinc-700 hover:text-white'
                  }`}
                >
                  :{fmt2(m)}
                </button>
              ))}
            </div>
          </div>

          {/* confirm button */}
          <div className="px-4 pb-4">
            <button
              type="button"
              onClick={confirm}
              className="w-full bg-white text-black py-2.5 rounded-xl text-sm font-bold hover:bg-zinc-100 transition-colors"
            >
              Confirmar  {fmt2(hour)}:{fmt2(minute)}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
