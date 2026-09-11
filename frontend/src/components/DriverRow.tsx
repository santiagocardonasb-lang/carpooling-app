import { Star, SealCheck } from '@phosphor-icons/react';

interface Props {
  name: string;
  avatar?: string | null;
  rating?: number;
  ratingCount?: number;
  /** Marca, color y placa ya unidos. */
  vehicle?: string;
  /** Muestra el sello sobre el avatar. */
  verified?: boolean;
  /** Línea extra bajo el nombre: "Pasajero", "Conductor", etc. */
  role?: string;
  size?: 'sm' | 'md' | 'lg';
}

const AVATAR = { sm: 'w-8 h-8 text-xs', md: 'w-10 h-10 text-sm', lg: 'w-14 h-14 text-lg' };

/**
 * La ficha de una persona: foto, nombre, calificación y vehículo.
 *
 * Estaba reimplementada en cuatro pantallas con detalles distintos en cada
 * una. Las fotos son opcionales y la mayoría no sube ninguna, así que las
 * iniciales son un caso de primera clase y no un respaldo feo.
 */
export default function DriverRow({
  name, avatar, rating, ratingCount, vehicle, verified, role, size = 'md',
}: Props) {
  const initials = name
    .split(' ').filter(Boolean).slice(0, 2)
    .map(w => w[0]).join('').toUpperCase();

  const hasRating = Number(ratingCount ?? 0) > 0;

  return (
    <div className="flex items-center gap-3 min-w-0">
      <div className="relative flex-shrink-0">
        <div className={`${AVATAR[size]} rounded-full bg-subtle overflow-hidden
          flex items-center justify-center font-bold text-fg-muted`}>
          {avatar
            ? <img src={avatar} alt="" className="w-full h-full object-cover" />
            : initials}
        </div>
        {verified && (
          <span
            className="absolute -bottom-0.5 -right-0.5 rounded-full bg-surface"
            title="Correo institucional verificado"
          >
            <SealCheck size={size === 'lg' ? 18 : 14} weight="fill" className="text-fg" />
          </span>
        )}
      </div>

      <div className="min-w-0 flex-1">
        <p className={`font-bold text-fg truncate ${size === 'lg' ? 'text-base' : 'text-sm'}`}>
          {name}
        </p>

        <div className="flex items-center gap-1.5 text-xs text-fg-faint min-w-0">
          {hasRating ? (
            <span className="flex items-center gap-0.5 text-fg font-bold flex-shrink-0">
              <Star size={12} weight="fill" className="text-star" />
              {Number(rating ?? 0).toFixed(1)}
            </span>
          ) : (
            <span className="flex-shrink-0">Sin calificaciones</span>
          )}

          {role && <><span aria-hidden>·</span><span className="flex-shrink-0">{role}</span></>}
          {vehicle && <><span aria-hidden>·</span><span className="truncate">{vehicle}</span></>}
        </div>
      </div>
    </div>
  );
}
