/**
 * Normaliza strings de fecha/hora para compatibilidad con PostgreSQL y SQLite.
 * - PostgreSQL devuelve ISO con zona: "2024-01-01T10:00:00.000Z"  → new Date() funciona directo
 * - SQLite devolvía sin zona:          "2024-01-01 10:00:00"       → necesitaba + 'Z'
 */
export function parseDate(s: string): Date {
  if (!s) return new Date(NaN);
  // Si ya tiene zona horaria (termina en Z, o tiene +HH:MM) usarlo directo
  if (/Z$|[+-]\d{2}:?\d{2}$/.test(s)) return new Date(s);
  // Formato SQLite sin zona: reemplazar espacio por T y agregar Z (UTC)
  return new Date(s.replace(' ', 'T') + 'Z');
}
