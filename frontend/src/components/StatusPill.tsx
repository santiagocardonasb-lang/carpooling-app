import {
  CheckCircle, XCircle, Clock, Car, Star, Prohibit,
} from '@phosphor-icons/react';

export type BookingStatus =
  | 'pending' | 'confirmed' | 'in_progress'
  | 'completed' | 'cancelled' | 'rejected' | 'expired';

/**
 * Los siete estados por los que pasa una reserva, con un solo diseño.
 *
 * Estaban escritos a mano en cada pantalla con textos y colores distintos
 * para lo mismo: "🚗 En curso" en una lista, "Viaje en curso" en otra. Cada
 * estado lleva icono además de color, porque un color solo no comunica a
 * quien no distingue tonos.
 */
const STATUS = {
  pending:     { label: 'Pendiente',  Icon: Clock,       fg: 'text-warn',   bg: 'bg-warn-soft' },
  confirmed:   { label: 'Confirmado', Icon: CheckCircle, fg: 'text-live',   bg: 'bg-live-soft' },
  in_progress: { label: 'En curso',   Icon: Car,         fg: 'text-live',   bg: 'bg-live-soft' },
  completed:   { label: 'Completado', Icon: Star,        fg: 'text-info',   bg: 'bg-info-soft' },
  cancelled:   { label: 'Cancelado',  Icon: XCircle,     fg: 'text-danger', bg: 'bg-danger-soft' },
  rejected:    { label: 'Rechazado',  Icon: XCircle,     fg: 'text-danger', bg: 'bg-danger-soft' },
  expired:     { label: 'Expirado',   Icon: Prohibit,    fg: 'text-fg-faint', bg: 'bg-subtle' },
} as const;

interface Props {
  status: string;
  /** Sin fondo, solo icono y texto. Para dentro de tarjetas ya coloreadas. */
  bare?: boolean;
}

export default function StatusPill({ status, bare }: Props) {
  const s = STATUS[status as BookingStatus] ?? STATUS.expired;

  if (bare) {
    return (
      <span className={`inline-flex items-center gap-1.5 text-xs font-bold ${s.fg}`}>
        <s.Icon size={13} weight="fill" />
        {s.label}
      </span>
    );
  }

  return (
    <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full
      text-[11px] font-bold ${s.fg} ${s.bg}`}>
      <s.Icon size={12} weight="fill" />
      {s.label}
    </span>
  );
}
