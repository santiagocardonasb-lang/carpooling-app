interface Props {
  origin: string;
  destination: string;
  /** Hora de salida. Si no viene, no se reserva espacio para ella. */
  originTime?: string;
  destinationTime?: string;
  /** En una sola línea, para cuando el espacio es poco. */
  compact?: boolean;
}

/**
 * El recorrido dibujado: punto de partida, línea, destino.
 *
 * Es la pieza que convierte un viaje en algo espacial. Antes cada pantalla
 * repetía su propia versión de esto con divs sueltos, y en la mayoría el
 * trayecto era solo texto con una flecha en medio.
 *
 * Origen es un círculo y destino un cuadrado: la forma distingue los extremos
 * sin depender del color, que es lo que hay que hacer para que se entienda
 * también sin distinguir tonos.
 */
export default function RouteLine({
  origin, destination, originTime, destinationTime, compact,
}: Props) {
  if (compact) {
    return (
      <div className="flex items-center gap-2 min-w-0">
        <span className="w-2 h-2 rounded-full bg-fg flex-shrink-0" />
        <span className="text-sm font-bold text-fg truncate">{origin}</span>
        <span className="flex-1 h-px bg-line-strong min-w-[12px]" />
        <span className="w-2 h-2 bg-fg flex-shrink-0" />
        <span className="text-sm font-bold text-fg truncate">{destination}</span>
      </div>
    );
  }

  return (
    <div className="flex items-stretch gap-3">
      {/* Rieles: círculo, línea, cuadrado */}
      <div className="flex flex-col items-center pt-1.5 pb-1.5">
        <span className="w-2.5 h-2.5 rounded-full bg-fg flex-shrink-0" />
        <span className="w-px flex-1 my-1 bg-line-strong min-h-[20px]" />
        <span className="w-2.5 h-2.5 bg-fg flex-shrink-0" />
      </div>

      <div className="flex-1 min-w-0 flex flex-col justify-between gap-3">
        <div className="flex items-baseline justify-between gap-2">
          <span className="text-sm font-bold text-fg truncate">{origin}</span>
          {originTime && (
            <span className="text-xs font-semibold text-fg-muted tabular-nums flex-shrink-0">
              {originTime}
            </span>
          )}
        </div>
        <div className="flex items-baseline justify-between gap-2">
          <span className="text-sm font-semibold text-fg-muted truncate">{destination}</span>
          {destinationTime && (
            <span className="text-xs font-medium text-fg-faint tabular-nums flex-shrink-0">
              {destinationTime}
            </span>
          )}
        </div>
      </div>
    </div>
  );
}
