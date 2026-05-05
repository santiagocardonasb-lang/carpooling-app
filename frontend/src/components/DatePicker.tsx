import { useState, useRef, useEffect, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { ChevronLeft, ChevronRight, Calendar } from 'lucide-react';

interface Props {
  value: string;          // 'YYYY-MM-DD' or ''
  onChange: (v: string) => void;
  min?: string;
  error?: boolean;
  placeholder?: string;
}

const MONTHS = ['Enero','Febrero','Marzo','Abril','Mayo','Junio',
                 'Julio','Agosto','Septiembre','Octubre','Noviembre','Diciembre'];
const DAYS_HDR = ['Do','Lu','Ma','Mi','Ju','Vi','Sa'];

export default function DatePicker({ value, onChange, min, error, placeholder = 'Seleccionar fecha' }: Props) {
  const today = new Date();
  const initYear  = value ? +value.slice(0,4) : today.getFullYear();
  const initMonth = value ? +value.slice(5,7) - 1 : today.getMonth();

  const [open, setOpen]           = useState(false);
  const [viewYear, setViewYear]   = useState(initYear);
  const [viewMonth, setViewMonth] = useState(initMonth);
  const [dropdownPos, setDropdownPos] = useState({ top: 0, left: 0, width: 0 });

  const triggerRef  = useRef<HTMLButtonElement>(null);
  const wrapperRef  = useRef<HTMLDivElement>(null);
  const calendarRef = useRef<HTMLDivElement>(null);   // ← calendar div inside portal

  const updatePos = useCallback(() => {
    if (!triggerRef.current) return;
    const r = triggerRef.current.getBoundingClientRect();
    setDropdownPos({ top: r.bottom + 8, left: r.left, width: r.width });
  }, []);

  const openCalendar = () => {
    updatePos();
    setOpen(o => !o);
  };

  // Close when clicking outside BOTH the trigger wrapper AND the portal calendar
  useEffect(() => {
    const h = (e: MouseEvent) => {
      const t = e.target as Node;
      const inWrapper  = wrapperRef.current?.contains(t);
      const inCalendar = calendarRef.current?.contains(t);
      if (!inWrapper && !inCalendar) setOpen(false);
    };
    const onScroll = () => setOpen(false);
    document.addEventListener('mousedown', h);
    window.addEventListener('scroll', onScroll, true);
    return () => {
      document.removeEventListener('mousedown', h);
      window.removeEventListener('scroll', onScroll, true);
    };
  }, []);

  const prevMonth = () => {
    if (viewMonth === 0) { setViewMonth(11); setViewYear(y => y - 1); }
    else setViewMonth(m => m - 1);
  };
  const nextMonth = () => {
    if (viewMonth === 11) { setViewMonth(0); setViewYear(y => y + 1); }
    else setViewMonth(m => m + 1);
  };

  const firstDayOfWeek = new Date(viewYear, viewMonth, 1).getDay();
  const daysInMonth    = new Date(viewYear, viewMonth + 1, 0).getDate();
  const cells: (number | null)[] = [
    ...Array(firstDayOfWeek).fill(null),
    ...Array.from({ length: daysInMonth }, (_, i) => i + 1),
  ];
  while (cells.length % 7 !== 0) cells.push(null);

  const minDate = min ? new Date(min + 'T00:00:00') : null;
  const isDisabled = (d: number) => {
    if (!minDate) return false;
    return new Date(viewYear, viewMonth, d) < minDate;
  };
  const isTodayCell = (d: number) =>
    today.getFullYear() === viewYear && today.getMonth() === viewMonth && today.getDate() === d;
  const isSelected = (d: number) => {
    if (!value) return false;
    return +value.slice(0,4) === viewYear && +value.slice(5,7) - 1 === viewMonth && +value.slice(8,10) === d;
  };

  const select = (d: number) => {
    const mm = String(viewMonth + 1).padStart(2, '0');
    const dd = String(d).padStart(2, '0');
    onChange(`${viewYear}-${mm}-${dd}`);
    setOpen(false);
  };

  const displayLabel = value
    ? new Date(value + 'T00:00:00').toLocaleDateString('es-ES', {
        weekday: 'short', day: 'numeric', month: 'long', year: 'numeric',
      })
    : '';

  const calendar = open && (
    <div
      ref={calendarRef}
      className="bg-zinc-950 border border-zinc-800 rounded-2xl shadow-2xl overflow-hidden"
      style={{ position: 'fixed', top: dropdownPos.top, left: dropdownPos.left, width: dropdownPos.width, zIndex: 9999 }}
    >
      {/* header */}
      <div className="flex items-center justify-between px-4 py-3.5 border-b border-zinc-800">
        <button type="button" onClick={prevMonth}
          className="w-7 h-7 flex items-center justify-center text-zinc-500 hover:text-white rounded-lg hover:bg-zinc-800 transition-colors">
          <ChevronLeft size={15} />
        </button>
        <span className="text-white text-sm font-bold tracking-wide">
          {MONTHS[viewMonth]} {viewYear}
        </span>
        <button type="button" onClick={nextMonth}
          className="w-7 h-7 flex items-center justify-center text-zinc-500 hover:text-white rounded-lg hover:bg-zinc-800 transition-colors">
          <ChevronRight size={15} />
        </button>
      </div>

      {/* weekday headers */}
      <div className="grid grid-cols-7 px-3 pt-3">
        {DAYS_HDR.map(d => (
          <div key={d} className="text-center text-[10px] text-zinc-600 font-semibold py-1 uppercase tracking-wider">
            {d}
          </div>
        ))}
      </div>

      {/* day cells */}
      <div className="grid grid-cols-7 px-3 pb-4 gap-y-1">
        {cells.map((day, i) => (
          <div key={i} className="flex items-center justify-center h-8">
            {day ? (
              <button
                type="button"
                disabled={isDisabled(day)}
                onClick={() => select(day)}
                className={`relative w-8 h-8 rounded-full text-xs font-medium transition-all ${
                  isSelected(day)
                    ? 'bg-white text-black font-bold'
                    : isDisabled(day)
                      ? 'text-zinc-700 cursor-not-allowed'
                      : isTodayCell(day)
                        ? 'text-white ring-1 ring-zinc-600 hover:bg-zinc-800'
                        : 'text-zinc-300 hover:bg-zinc-800 hover:text-white'
                }`}
              >
                {day}
                {isTodayCell(day) && !isSelected(day) && (
                  <span className="absolute bottom-0.5 left-1/2 -translate-x-1/2 w-1 h-1 rounded-full bg-white opacity-70" />
                )}
              </button>
            ) : <div className="w-8 h-8" />}
          </div>
        ))}
      </div>
    </div>
  );

  return (
    <div ref={wrapperRef} className="relative">
      <button
        ref={triggerRef}
        type="button"
        onClick={openCalendar}
        className={`w-full flex items-center gap-3 bg-zinc-900 px-4 py-3.5 rounded-xl text-sm transition outline-none ${
          error ? 'ring-2 ring-red-500' : open ? 'ring-2 ring-white' : ''
        }`}
      >
        <Calendar size={15} className="text-zinc-500 flex-shrink-0" />
        <span className={`truncate ${displayLabel ? 'text-white' : 'text-zinc-600'}`}>
          {displayLabel || placeholder}
        </span>
      </button>

      {createPortal(calendar, document.body)}
    </div>
  );
}
