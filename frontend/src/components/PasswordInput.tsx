import { useState } from 'react';
import { Eye, EyeSlash } from '@phosphor-icons/react';

interface Props {
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  required?: boolean;
  autoComplete?: string;
  error?: boolean;
  className?: string;
}

export default function PasswordInput({
  value,
  onChange,
  placeholder = 'Contraseña',
  required,
  autoComplete = 'current-password',
  error,
  className = '',
}: Props) {
  const [visible, setVisible] = useState(false);

  return (
    <div className={`relative ${className}`}>
      <input
        type={visible ? 'text' : 'password'}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        required={required}
        placeholder={placeholder}
        autoComplete={autoComplete}
        autoCapitalize="none"
        autoCorrect="off"
        spellCheck={false}
        className={`w-full bg-zinc-900 text-white placeholder-zinc-500 pl-4 pr-12 py-4 rounded-xl text-sm transition outline-none ${
          error ? 'ring-2 ring-red-500' : 'focus:ring-2 focus:ring-white'
        }`}
      />
      <button
        type="button"
        onClick={() => setVisible((v) => !v)}
        tabIndex={-1}
        aria-label={visible ? 'Ocultar contraseña' : 'Mostrar contraseña'}
        className="absolute right-0 top-0 h-full px-4 flex items-center text-zinc-500 hover:text-white transition-colors"
      >
        {visible ? <EyeSlash size={18} weight="duotone" /> : <Eye size={18} weight="duotone" />}
      </button>
    </div>
  );
}
