import { ReactNode } from 'react';

interface Props {
  children: ReactNode;
  /** Muestra el asa de arrastre. Se omite cuando la hoja es fija. */
  handle?: boolean;
  className?: string;
}

/**
 * Hoja inferior: el panel de contenido que sube desde abajo y se monta sobre
 * lo que haya detrás, típicamente un mapa.
 *
 * El asa no arrastra nada todavía; está porque es la señal que le dice al
 * usuario dónde termina el mapa y empieza el contenido. Poner una que
 * pareciera arrastrable sin serlo sería peor, así que se puede omitir.
 */
export default function Sheet({ children, handle = true, className = '' }: Props) {
  return (
    <div
      className={`relative z-30 -mt-6 bg-surface rounded-t-[28px] shadow-sheet
        flex flex-col px-5 pt-3 pb-safe animate-sheet ${className}`}
    >
      {handle && (
        <span
          className="w-10 h-1 bg-line-strong rounded-full mx-auto mb-3.5 flex-shrink-0"
          aria-hidden
        />
      )}
      {children}
    </div>
  );
}
