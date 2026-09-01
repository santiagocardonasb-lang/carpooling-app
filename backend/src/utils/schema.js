// Qué columnas opcionales existen realmente en la base.
//
// El código se despliega antes de que alguien ejecute las migraciones en
// Supabase, así que durante esa ventana hay columnas que todavía no existen.
// Escribir en ellas sin comprobar rompe funciones que antes andaban bien
// (cancelar un viaje, por ejemplo). Esto se consulta una vez al arrancar y
// deja que cada ruta arme el SQL que la base soporta hoy.

const { query } = require('../db');

const caps = {
  // supabase/cancelled_by.sql
  cancelMetadata: false,
  // supabase/email_verification.sql
  emailVerified: false,
};

async function detect() {
  try {
    const res = await query(`
      SELECT table_name, column_name
      FROM information_schema.columns
      WHERE (table_name = 'bookings' AND column_name = 'cancelled_by')
         OR (table_name = 'users'    AND column_name = 'email_verified')
    `);
    const found = new Set(res.rows.map(r => `${r.table_name}.${r.column_name}`));
    caps.cancelMetadata = found.has('bookings.cancelled_by');
    caps.emailVerified  = found.has('users.email_verified');

    const pending = [];
    if (!caps.cancelMetadata) pending.push('supabase/cancelled_by.sql');
    if (!caps.emailVerified)  pending.push('supabase/email_verification.sql');
    if (pending.length)
      console.warn('[schema] Migraciones sin ejecutar:', pending.join(', '));
    else
      console.log('[schema] Todas las migraciones opcionales están aplicadas');
  } catch (e) {
    // Sin la comprobación se asume lo mínimo: nunca escribir de más.
    console.error('[schema] No se pudo inspeccionar el esquema:', e.message);
  }
}

module.exports = { caps, detect };
