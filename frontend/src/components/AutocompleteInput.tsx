import { useState, useRef, useEffect } from 'react';

interface Props {
  value: string;
  onChange: (v: string) => void;
  options: string[];
  placeholder: string;
  icon: React.ReactNode;
}

const DROPDOWN_H  = 280; // altura estimada (8 items × ~35px)
const BOTTOM_SAFE = 72;  // BottomNav + margen

export default function AutocompleteInput({ value, onChange, options, placeholder, icon }: Props) {
  const [open, setOpen]   = useState(false);
  const [openUp, setOpenUp] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef     = useRef<HTMLInputElement>(null);

  const filtered = options
    .filter(o => o.toLowerCase().includes(value.toLowerCase()))
    .slice(0, 8);

  const showDropdown = open && value.trim().length > 0 && filtered.length > 0 &&
    !(filtered.length === 1 && filtered[0].toLowerCase() === value.toLowerCase());

  useEffect(() => {
    const h = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener('mousedown', h);
    return () => document.removeEventListener('mousedown', h);
  }, []);

  const checkDirection = () => {
    if (!inputRef.current) return;
    const r = inputRef.current.getBoundingClientRect();
    const spaceBelow = window.innerHeight - r.bottom - BOTTOM_SAFE;
    setOpenUp(spaceBelow < DROPDOWN_H && r.top > DROPDOWN_H);
  };

  const select = (opt: string) => {
    onChange(opt);
    setOpen(false);
  };

  return (
    <div ref={containerRef} className="relative w-full">
      <div className="flex items-center gap-3">
        {icon}
        <input
          ref={inputRef}
          type="text"
          value={value}
          onChange={(e) => { onChange(e.target.value); setOpen(true); }}
          onFocus={() => { checkDirection(); setOpen(true); }}
          placeholder={placeholder}
          autoComplete="off"
          className="flex-1 bg-transparent text-white text-sm focus:outline-none placeholder-zinc-600"
        />
      </div>

      {showDropdown && (
        <div className={`absolute ${openUp ? 'bottom-full mb-1' : 'top-full mt-1'} left-0 right-0 bg-zinc-950 border border-zinc-800 rounded-xl shadow-2xl overflow-hidden z-[200]`}>
          {filtered.map(opt => (
            <button
              key={opt}
              type="button"
              onMouseDown={(e) => { e.preventDefault(); select(opt); }}
              className="w-full text-left px-4 py-2.5 text-sm text-zinc-300 hover:bg-zinc-800 hover:text-white transition-colors border-b border-zinc-800/60 last:border-0"
            >
              {opt}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
