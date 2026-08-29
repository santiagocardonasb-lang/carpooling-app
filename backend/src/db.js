const { Pool, types } = require('pg');

// pg devuelve NUMERIC y BIGINT como strings para no perder precisión.
// En esta app los valores son montos y conteos pequeños, así que los
// convertimos a number: evita "$30000" en vez de "$30.000" y errores
// tipo "x.toFixed is not a function" en el frontend.
types.setTypeParser(1700, (v) => (v === null ? null : parseFloat(v))); // NUMERIC / DECIMAL
types.setTypeParser(20,   (v) => (v === null ? null : parseInt(v, 10))); // INT8 / BIGINT (COUNT)

if (!process.env.DATABASE_URL) {
  throw new Error('DATABASE_URL no está definida. Agrégala al archivo .env');
}

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  // SSL requerido en Supabase producción; omitir localmente si no está configurado
  ssl: process.env.DATABASE_URL.includes('supabase.co')
    ? { rejectUnauthorized: false }
    : false,
  max: 10,
  idleTimeoutMillis: 30_000,
  connectionTimeoutMillis: 5_000,
});

pool.on('error', (err) => {
  console.error('[db] Error inesperado en cliente inactivo:', err.message);
});

// Helper simple: ejecuta una query y devuelve el resultado de pg
const query = (text, params) => pool.query(text, params);

// Helper para transacciones: ejecuta fn(client) dentro de BEGIN/COMMIT/ROLLBACK
const withTransaction = async (fn) => {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const result = await fn(client);
    await client.query('COMMIT');
    return result;
  } catch (e) {
    await client.query('ROLLBACK').catch(() => {});
    throw e;
  } finally {
    client.release();
  }
};

module.exports = { query, withTransaction, pool };
