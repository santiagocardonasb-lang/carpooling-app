interface Props {
  /** Tamaño del conjunto. `sm` para barras, `lg` para el pie de la portada. */
  size?: 'sm' | 'md' | 'lg';
  /** Oculta la insignia UdeC cuando el espacio es poco. */
  badge?: boolean;
  /** Oculta el carro. Lo usa la pantalla de entrada, que ya lo muestra grande. */
  mark?: boolean;
  className?: string;
}

const MARK = { sm: 22, md: 28, lg: 36 };
const TEXT = { sm: 'text-lg',  md: 'text-xl',  lg: 'text-2xl' };
const CHIP = { sm: 'text-[8px] px-1 py-0.5', md: 'text-[9px] px-1.5 py-0.5', lg: 'text-[10px] px-1.5 py-0.5' };

/**
 * La marca: insignia con el carro, el nombre y el distintivo UdeC.
 *
 * La geometría del carro es la del logo entregado. Los rellenos salen de los
 * tokens en vez de negro y blanco fijos, así que la marca se invierte con el
 * tema en lugar de desaparecer contra su propio fondo.
 *
 * El nombre va como texto y no como trazado del SVG para que use la tipografía
 * de la app, se pueda seleccionar y lo lea un lector de pantalla.
 */
export default function Wordmark({ size = 'md', badge = true, mark = true, className = '' }: Props) {
  const s = MARK[size];

  return (
    <span className={`inline-flex items-center gap-2 select-none ${className}`}>
      {mark && (
      <svg
        viewBox="0 0 36 36" width={s} height={s} fill="none"
        aria-hidden="true" className="flex-shrink-0"
      >
        <rect x="0" y="4" width="36" height="28" rx="8" className="fill-fg" />
        <path d="M7 16L12 10H24L29 16V22H7V16Z" className="fill-canvas" />
        <circle cx="10" cy="24" r="3" className="fill-canvas" />
        <circle cx="26" cy="24" r="3" className="fill-canvas" />
        <rect x="11" y="12" width="6" height="4" rx="1" className="fill-fg" />
        <rect x="19" y="12" width="6" height="4" rx="1" className="fill-fg" />
      </svg>
      )}

      <span className={`font-extrabold tracking-tight text-fg leading-none ${TEXT[size]}`}>
        carpool
      </span>

      {badge && (
        <span className={`font-bold uppercase tracking-wider rounded
          bg-fg text-canvas leading-none ${CHIP[size]}`}>
          UdeC
        </span>
      )}
    </span>
  );
}
