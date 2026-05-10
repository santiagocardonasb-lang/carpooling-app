import { useState, useRef, useEffect, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { Clock, CaretUp, CaretDown } from '@phosphor-icons/react';

interface Props {
  value: string;          // 'HH:MM' or ''
  onChange: (v: string) => void;
  error?: boolean;
  placeholder?: string;
}

const DROPDOWN_H   = 390; // altura aproximada del panel
const BOTTOM_SAFE  = 72;  // BottomNav (~64px) + margen

export default function TimePicker({ value, onChange, error, placeholder = 'Seleccionar hora' }: Props) {
  const [open, setOpen]     = useState(false);
  const [hour, setHour]     = useState(value ? +value.slice(0,2) : 7);
  const [minute, setMinute] = useState(value ? +value.slice(3,5) : 0);
  const [pos, setPos]       = useState({ top: 0, left: 0, width: 0 });

  const triggerRef  = useRef<HTMLButtonElement>(null);
  const wrapperRef  = useRef<HTMLDivElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Calcular posición y decidir si abre hacia arriba o abajo
  const updatePos = useCallback(() => {
    if (!triggerRef.current) return;
    const r = triggerRef.current.getBoundingClientRect();
    const spaceBelow = window.innerHeight - r.bottom - BOTTOM_SAFE;
    const openUp     = spaceBelow < DROPDOWN_H && r.top > DROPDOWN_H;
    setPos({
      top:   openUp ? r.top - DROPDOWN_H - 8 : r.bottom + 8,
      left:  r.left,
      width: r.width,
    });
  }, []);

  const handleOpen = () => {
    if (value) {
      setHour(+value.slice(0,2));
      setMinute(+value.slice(3,5));
    }
    updatePos();
    setOpen(o => !o);
  };

  // Cerrar al hacer click fuera
  useEffect(() => {
    const h = (e: MouseEvent) => {
      const t = e.target as Node;
      if (!wrapperRef.current?.contains(t) && !dropdownRef.current?.contains(t)) setOpen(false);
    };
    const onScroll = () => setOpen(false);
    document.addEventListener('mousedown', h);
    window.addEventListener('scroll', onScroll, true);
    return () => {
      document.removeEventListener('mousedown', h);
      window.removeEventListener('scroll', onScroll, true);
    };
  }, []);

  const fmt2 = (n: number) => String(n).padStart(2, '0');

  const changeHour   = (d: number) => setHour(h   => ((h + d) + 24) % 24);
  const changeMinute = (d: number) => setMinute(m  => ((m + d) + 60) % 60);

  const confirm = () => {
    onChange(`${fmt2(hour)}:${fmt2(minute)}`);
    setOpen(false);
  };

  const QUICK_HOURS   = [6,7,8,9,10,11,12,13,14,15,16,17,18,19,20,21,22];
  const QUICK_MINUTES = [0,5,10,15,20,25,30,35,40,45,50,55];

  const dropdown = open && createPortal(
    <div
      ref={dropdownRef}
      className="bg-zinc-950 border border-zinc-800 rounded-2xl shadow-2xl overflow-hidden"
      style={{ position: 'fixed', top: pos.top, left: pos.left, width: pos.width, zIndex: 9999 }}
    >
      {/* drum roll display */}
      <div className="flex items-center justify-center gap-3 px-6 pt-5 pb-4 border-b border-zinc-800">
        {/* hours column */}
        <div className="flex flex-col items-center gap-1">
          <button type="button" onClick={() => changeHour(1)}
            className="p-1 text-zinc-500 hover:text-white transition-colors">
            <CaretUp size={18} weight="bold" />
          </button>
          <div className="w-16 h-14 bg-zinc-800 rounded-xl flex items-center justify-center ring-1 ring-zinc-700">
            <span className="text-white text-3xl font-black tabular-nums">{fmt2(hour)}</span>
          </div>
          <button type="button" onClick={() => changeHour(-1)}
            className="p-1 text-zinc-500 hover:text-white transition-colors">
            <CaretDown size={18} weight="bold" />
          </button>
          <span className="text-zinc-600 text-[10px] uppercase tracking-wider mt-0.5">horas</span>
        </div>

        <span className="text-zinc-400 text-3xl font-black pb-4">:</span>

        {/* minutes column */}
        <div className="flex flex-col items-center gap-1">
          <button type="button" onClick={() => changeMinute(5)}
            className="p-1 text-zinc-500 hover:text-white transition-colors">
            <CaretUp size={18} weight="bold" />
          </button>
          <div className="w-16 h-14 bg-zinc-800 rounded-xl flex items-center justify-center ring-1 ring-zinc-700">
            <span className="text-white text-3xl font-black tabular-nums">{fmt2(minute)}</span>
          </div>
          <button type="button" onClick={() => changeMinute(-5)}
            className="p-1 text-zinc-500 hover:text-white transition-colors">
            <CaretDown size={18} weight="bold" />
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
          Confirmar {fmt2(hour)}:{fmt2(minute)}
        </button>
      </div>
    </div>,
    document.body
  );

  return (
    <div ref={wrapperRef} className="relative">
      <button
        ref={triggerRef}
        type="button"
        onClick={handleOpen}
        className={`w-full flex items-center gap-3 bg-zinc-900 px-4 py-3.5 rounded-xl text-sm transition outline-none ${
          error ? 'ring-2 ring-red-500' : open ? 'ring-2 ring-white' : ''
        }`}
      >
        <Clock size={15} weight="duotone" className="text-zinc-500 flex-shrink-0" />
        <span className={value ? 'text-white' : 'text-zinc-600'}>
          {value || placeholder}
        </span>
      </button>

      {dropdown}
    </div>
  );
}
