import { useState, useRef, useEffect } from 'react';
import { MapPin, X } from 'lucide-react';
import { MUNICIPALITIES } from '../data/municipalities';

interface Props {
  value: string;
  onChange: (val: string) => void;
  placeholder?: string;
  dot?: 'origin' | 'destination';
  error?: boolean;
}

export default function LocationInput({ value, onChange, placeholder, dot = 'origin', error }: Props) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState(value);
  const ref = useRef<HTMLDivElement>(null);

  const suggestions = query.length >= 1
    ? MUNICIPALITIES.filter(m => m.toLowerCase().includes(query.toLowerCase())).slice(0, 6)
    : MUNICIPALITIES.slice(0, 6);

  useEffect(() => { setQuery(value); }, [value]);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const select = (municipality: string) => {
    setQuery(municipality);
    onChange(municipality);
    setOpen(false);
  };

  return (
    <div ref={ref} className="relative flex-1">
      <div className="flex items-center gap-3">
        <div className={`w-2 h-2 flex-shrink-0 ${
          dot === 'origin' ? 'rounded-full bg-zinc-500' : 'rounded-sm bg-white'
        } ${error ? 'bg-red-500' : ''}`} />
        <input
          type="text"
          value={query}
          onChange={(e) => { setQuery(e.target.value); onChange(e.target.value); setOpen(true); }}
          onFocus={() => setOpen(true)}
          placeholder={placeholder}
          className={`flex-1 bg-transparent placeholder-zinc-500 text-sm focus:outline-none ${error ? 'text-red-300 placeholder-red-800' : 'text-white'}`}
          autoComplete="off"
        />
        {query && (
          <button type="button" onClick={() => { setQuery(''); onChange(''); }} className="text-zinc-600 hover:text-zinc-400">
            <X size={13} />
          </button>
        )}
      </div>

      {open && (
        <div className="absolute top-full left-0 right-0 mt-2 bg-zinc-800 border border-zinc-700 rounded-xl overflow-hidden z-[100] shadow-2xl">
          {suggestions.length === 0 ? (
            <div className="px-4 py-3 flex items-center gap-2 text-zinc-500 text-sm">
              <MapPin size={14} />
              Sin resultados
            </div>
          ) : (
            suggestions.map((m) => (
              <button
                key={m}
                type="button"
                onMouseDown={() => select(m)}
                className="w-full text-left px-4 py-3 text-sm text-white hover:bg-zinc-700 transition-colors border-b border-zinc-700/50 last:border-0"
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
