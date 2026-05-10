import { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { Clock, CaretUp, CaretDown, X } from '@phosphor-icons/react';

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

  // Sincroniza con el valor cuando se abre
  useEffect(() => {
    if (open && value) {
      setHour(+value.slice(0,2));
      setMinute(+value.slice(3,5));
    }
  }, [open, value]);

  // Bloquear scroll del body cuando el modal está abierto
  useEffect(() => {
    if (!open) return;
    const original = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => { document.body.style.overflow = original; };
  }, [open]);

  // Cerrar con ESC
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') setOpen(false); };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [open]);

  const fmt2 = (n: number) => String(n).padStart(2, '0');

  const changeHour   = (d: number) => setHour(h => ((h + d) + 24) % 24);
  const changeMinute = (d: number) => setMinute(m => ((m + d) + 60) % 60);

  const confirm = () => {
    onChange(`${fmt2(hour)}:${fmt2(minute)}`);
    setOpen(false);
  };

  const QUICK_HOURS   = [6,7,8,9,10,11,12,13,14,15,16,17,18,19,20,21,22];
  const QUICK_MINUTES = [0,5,10,15,20,25,30,35,40,45,50,55];

  const modal = open && createPortal(
    <div
      className="fixed inset-0 z-[9999] flex items-end sm:items-center justify-center bg-black/70 backdrop-blur-sm"
      onClick={() => setOpen(false)}
      style={{ paddingBottom: 'env(safe-area-inset-bottom, 0px)' }}
    >
      <div
        className="bg-zinc-950 border border-zinc-800 w-full sm:max-w-sm sm:rounded-2xl rounded-t-3xl shadow-2xl overflow-hidden max-h-[90vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-zinc-800 sticky top-0 bg-zinc-950">
          <div className="flex items-center gap-2">
            <Clock size={16} weight="duotone" className="text-zinc-500" />
            <h3 className="text-white text-sm font-bold">Selecciona la hora</h3>
          </div>
          <button
            type="button"
            onClick={() => setOpen(false)}
            className="text-zinc-500 hover:text-white p-1 -m-1 transition-colors"
          >
            <X size={18} weight="bold" />
          </button>
        </div>

        {/* Drum roll display */}
        <div className="flex items-center justify-center gap-3 px-6 pt-5 pb-4 border-b border-zinc-800">
          {/* Hours column */}
          <div className="flex flex-col items-center gap-1">
            <button
              type="button"
              onClick={() => changeHour(1)}
              className="p-2 text-zinc-500 hover:text-white transition-colors active:bg-zinc-800 rounded-lg"
            >
              <CaretUp size={20} weight="bold" />
            </button>
            <div className="w-20 h-16 bg-zinc-800 rounded-2xl flex items-center justify-center ring-1 ring-zinc-700">
              <span className="text-white text-4xl font-black tabular-nums">{fmt2(hour)}</span>
            </div>
            <button
              type="button"
              onClick={() => changeHour(-1)}
              className="p-2 text-zinc-500 hover:text-white transition-colors active:bg-zinc-800 rounded-lg"
            >
              <CaretDown size={20} weight="bold" />
            </button>
            <span className="text-zinc-600 text-[10px] uppercase tracking-wider mt-0.5">horas</span>
          </div>

          <span className="text-zinc-400 text-4xl font-black pb-6">:</span>

          {/* Minutes column */}
          <div className="flex flex-col items-center gap-1">
            <button
              type="button"
              onClick={() => changeMinute(5)}
              className="p-2 text-zinc-500 hover:text-white transition-colors active:bg-zinc-800 rounded-lg"
            >
              <CaretUp size={20} weight="bold" />
            </button>
            <div className="w-20 h-16 bg-zinc-800 rounded-2xl flex items-center justify-center ring-1 ring-zinc-700">
              <span className="text-white text-4xl font-black tabular-nums">{fmt2(minute)}</span>
            </div>
            <button
              type="button"
              onClick={() => changeMinute(-5)}
              className="p-2 text-zinc-500 hover:text-white transition-colors active:bg-zinc-800 rounded-lg"
            >
              <CaretDown size={20} weight="bold" />
            </button>
            <span className="text-zinc-600 text-[10px] uppercase tracking-wider mt-0.5">minutos</span>
          </div>
        </div>

        {/* Quick-pick hours */}
        <div className="px-5 pt-4">
          <p className="text-zinc-600 text-[10px] uppercase tracking-wider mb-2">Hora rápida</p>
          <div className="flex flex-wrap gap-1.5">
            {QUICK_HOURS.map(h => (
              <button
                key={h}
                type="button"
                onClick={() => setHour(h)}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                  hour === h ? 'bg-white text-black' : 'bg-zinc-800 text-zinc-400 hover:bg-zinc-700 hover:text-white'
                }`}
              >
                {fmt2(h)}
              </button>
            ))}
          </div>
        </div>

        {/* Quick-pick minutes */}
        <div className="px-5 pt-4 pb-4">
          <p className="text-zinc-600 text-[10px] uppercase tracking-wider mb-2">Minutos</p>
          <div className="flex flex-wrap gap-1.5">
            {QUICK_MINUTES.map(m => (
              <button
                key={m}
                type="button"
                onClick={() => setMinute(m)}
                className={`w-11 py-1.5 rounded-lg text-xs font-medium transition-all ${
                  minute === m ? 'bg-white text-black' : 'bg-zinc-800 text-zinc-400 hover:bg-zinc-700 hover:text-white'
                }`}
              >
                :{fmt2(m)}
              </button>
            ))}
          </div>
        </div>

        {/* Confirm button — fixed at bottom of modal */}
        <div className="px-5 pb-5 pt-2 border-t border-zinc-800 sticky bottom-0 bg-zinc-950">
          <button
            type="button"
            onClick={confirm}
            className="w-full bg-white text-black py-3 rounded-xl text-sm font-bold hover:bg-zinc-100 transition-colors active:scale-[0.98]"
          >
            Confirmar {fmt2(hour)}:{fmt2(minute)}
          </button>
        </div>
      </div>
    </div>,
    document.body
  );

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className={`w-full flex items-center gap-3 bg-zinc-900 px-4 py-3.5 rounded-xl text-sm transition outline-none ${
          error ? 'ring-2 ring-red-500' : open ? 'ring-2 ring-white' : ''
        }`}
      >
        <Clock size={15} weight="duotone" className="text-zinc-500 flex-shrink-0" />
        <span className={value ? 'text-white' : 'text-zinc-600'}>
          {value || placeholder}
        </span>
      </button>

      {modal}
    </>
  );
}
