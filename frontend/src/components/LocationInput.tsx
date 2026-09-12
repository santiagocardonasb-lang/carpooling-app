import { useState, useRef, useEffect } from 'react';
import { MapPin, X } from '@phosphor-icons/react';
import { MUNICIPALITIES } from '../data/municipalities';

interface Props {
  value: string;
  onChange: (val: string) => void;
  placeholder?: string;
  dot?: 'origin' | 'destination';
  error?: boolean;
}

const DROPDOWN_H  = 220; // altura estimada del dropdown (6 items × ~36px)
const BOTTOM_SAFE = 72;  // BottomNav + margen

export default function LocationInput({ value, onChange, placeholder, dot = 'origin', error }: Props) {
  const [open, setOpen]   = useState(false);
  const [query, setQuery] = useState(value);
  const [openUp, setOpenUp] = useState(false);
  const ref        = useRef<HTMLDivElement>(null);
  const inputRef   = useRef<HTMLInputElement>(null);

  const suggestions = query.trim().length >= 1
    ? MUNICIPALITIES.filter(m => m.toLowerCase().includes(query.toLowerCase())).slice(0, 6)
    : [];

  useEffect(() => { setQuery(value); }, [value]);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const checkDirection = () => {
    if (!inputRef.current) return;
    const r = inputRef.current.getBoundingClientRect();
    const spaceBelow = window.innerHeight - r.bottom - BOTTOM_SAFE;
    setOpenUp(spaceBelow < DROPDOWN_H && r.top > DROPDOWN_H);
  };

  const select = (municipality: string) => {
    setQuery(municipality);
    onChange(municipality);
    setOpen(false);
  };

  return (
    <div ref={ref} className="relative flex-1">
      <div className="flex items-center gap-3">
        <div className={`w-2 h-2 flex-shrink-0 ${
          dot === 'origin' ? 'rounded-full bg-fg-faint' : 'rounded-sm bg-primary'
        } ${error ? 'bg-notify' : ''}`} />
        <input
          ref={inputRef}
          type="text"
          value={query}
          onChange={(e) => { setQuery(e.target.value); onChange(e.target.value); setOpen(true); }}
          onFocus={() => { checkDirection(); if (query.trim().length > 0) setOpen(true); }}
          placeholder={placeholder}
          className={`flex-1 bg-transparent placeholder-fg-faint text-sm focus:outline-none ${error ? 'text-danger placeholder-danger/60' : 'text-fg'}`}
          autoComplete="off"
        />
        {query && (
          <button type="button" onClick={() => { setQuery(''); onChange(''); }} className="text-fg-faint hover:text-fg-muted">
            <X size={13} weight="bold" />
          </button>
        )}
      </div>

      {open && (
        <div className={`absolute ${openUp ? 'bottom-full mb-2' : 'top-full mt-2'} left-0 right-0 bg-subtle border border-line-strong rounded-xl overflow-hidden z-[100] shadow-pop`}>
          {suggestions.length === 0 ? (
            <div className="px-4 py-3 flex items-center gap-2 text-fg-faint text-sm">
              <MapPin size={14} weight="duotone" />
              Sin resultados
            </div>
          ) : (
            suggestions.map((m) => (
              <button
                key={m}
                type="button"
                onMouseDown={() => select(m)}
                className="w-full text-left px-4 py-3 text-sm text-fg hover:bg-line-strong transition-colors border-b border-line-strong last:border-0"
              >
                {m}
              </button>
            ))
          )}
        </div>
      )}
    </div>
  );
}
