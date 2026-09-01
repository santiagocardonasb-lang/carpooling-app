// Cancelaciones: cuánta antelación hubo y cuándo eso cuenta como tardío.
//
// Cancelar un viaje no es malo; cancelarlo veinte minutos antes de la salida,
// cuando el pasajero ya está caminando al punto de encuentro, sí lo es. Estas
// funciones separan un caso del otro.

/** Debajo de esto, la cancelación se considera tardía. */
const LATE_THRESHOLD_HOURS = 2;

/**
 * Horas entre el momento de cancelar y la salida prevista.
 * Negativo si el viaje ya había salido. Null si no hay fecha (viaje recurrente
 * sin fecha concreta), en cuyo caso no se juzga.
 *
 * La fecha y la hora se guardan en horario de Colombia, así que se interpretan
 * en esa zona y no en la del servidor, que en Render corre en UTC.
 */
function noticeHours(rideDate, rideTime, now = new Date()) {
  if (!rideDate || !rideTime) return null;

  const dateStr = rideDate instanceof Date
    ? rideDate.toISOString().slice(0, 10)
    : String(rideDate).slice(0, 10);

  const m = /^(\d{2}):(\d{2})/.exec(String(rideTime));
  if (!m) return null;

  // -05:00 es la hora de Colombia, que no tiene horario de verano.
  const departure = new Date(`${dateStr}T${m[1]}:${m[2]}:00-05:00`);
  if (Number.isNaN(departure.getTime())) return null;

  return (departure.getTime() - now.getTime()) / 3_600_000;
}

/** True si cancelar ahora deja al otro sin margen razonable. */
function isLate(hours) {
  return hours !== null && hours < LATE_THRESHOLD_HOURS;
}

module.exports = { LATE_THRESHOLD_HOURS, noticeHours, isLate };
