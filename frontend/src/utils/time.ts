export interface Clock {
  /** Hora en formato de 12 horas, sin cero a la izquierda. */
  time: string;
  /** AM o PM. */
  suffix: string;
}

/**
 * Parte una hora "HH:MM" en número y sufijo, para poder mostrarlos con pesos
 * distintos: el número grande y el AM/PM chico al lado.
 *
 * Los dos casos que siempre se rompen son las 00:xx y las 12:xx, porque en el
 * reloj de 12 horas la medianoche es "12 AM" y el mediodía "12 PM": ninguno de
 * los dos sale de aplicarle el módulo directamente.
 */
export function formatClock(raw: string | null | undefined): Clock {
  const m = /^(\d{1,2}):(\d{2})/.exec(String(raw ?? ''));
  if (!m) return { time: String(raw ?? '—'), suffix: '' };

  const h24 = Number(m[1]);
  if (!Number.isInteger(h24) || h24 < 0 || h24 > 23) {
    return { time: String(raw), suffix: '' };
  }

  const suffix = h24 < 12 ? 'AM' : 'PM';
  const h12 = h24 % 12 === 0 ? 12 : h24 % 12;

  return { time: `${h12}:${m[2]}`, suffix };
}
