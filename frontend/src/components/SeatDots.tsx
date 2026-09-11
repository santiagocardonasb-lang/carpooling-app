interface Props {
  total: number;
  available: number;
  /** Oculta la línea de texto y deja solo las barritas. */
  bare?: boolean;
}

/**
 * Cupos como barritas contables, una por asiento.
 *
 * Reemplaza la barra de progreso que había antes. Una barra continua dice
 * "va por la mitad"; lo que necesita saber quien busca viaje es "quedan dos",
 * y eso se cuenta de un vistazo cuando cada asiento es una pieza aparte.
 *
 * Con un solo cupo libre todo se pone en rojo, porque ahí la urgencia es real
 * y es la diferencia entre reservar ahora o quedarse sin puesto.
 */
export default function SeatDots({ total, available, bare }: Props) {
  const safeTotal = Math.max(0, Math.min(total, 8)); // 8 es el tope al publicar
  const last = available === 1;
  const full = available === 0;

  return (
    <div className="flex flex-col gap-1.5">
      {!bare && (
        <span className={`text-[11px] font-semibold ${
          full ? 'text-fg-faint' : last ? 'text-danger' : 'text-fg-muted'
        }`}>
          {full
            ? 'Sin cupos disponibles'
            : last
              ? `Último cupo de ${safeTotal}`
              : `${available} de ${safeTotal} cupos disponibles`}
        </span>
      )}

      <div
        className="flex items-center gap-1"
        role="img"
        aria-label={full
          ? 'Sin cupos disponibles'
          : `${available} de ${safeTotal} cupos disponibles`}
      >
        {Array.from({ length: safeTotal }, (_, i) => (
          <span
            key={i}
            className={`h-1.5 w-4 rounded-full transition-colors ${
              i < available
                ? (last ? 'bg-danger' : 'bg-fg')
                : 'bg-line'
            }`}
          />
        ))}
      </div>
    </div>
  );
}
