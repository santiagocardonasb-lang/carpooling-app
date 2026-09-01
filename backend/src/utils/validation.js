// Reglas de validación compartidas. Viven aquí y no dentro de cada ruta para
// que se puedan probar sin levantar el servidor ni la base de datos, y para
// que registro y recuperación no se desincronicen.

const PASSWORD_MIN = 6;
const PASSWORD_MAX = 200;

/** Devuelve el mensaje de error, o null si la contraseña sirve. */
function validatePassword(pw) {
  if (typeof pw !== 'string' || pw.length < PASSWORD_MIN || pw.length > PASSWORD_MAX)
    return `La contraseña debe tener entre ${PASSWORD_MIN} y ${PASSWORD_MAX} caracteres`;
  if (!/\d/.test(pw))
    return 'La contraseña debe incluir al menos un número';
  return null;
}

// Placa colombiana: LLLNNN (carro) o LLLNNL (moto)
const PLATE_RE = /^[A-Z]{3}[0-9]{3}$|^[A-Z]{3}[0-9]{2}[A-Z]$/;

/** Mayúsculas y sin separadores, para que "abc 123" y "ABC123" sean la misma. */
function normalizePlate(raw) {
  if (typeof raw !== 'string') return '';
  return raw.toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 6);
}

function isValidPlate(normalized) {
  return PLATE_RE.test(normalized);
}

/** Quita tildes para que "Chia" encuentre "Chía". */
function stripAccents(s) {
  return String(s).normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();
}

module.exports = {
  PASSWORD_MIN, PASSWORD_MAX,
  validatePassword,
  normalizePlate, isValidPlate,
  stripAccents,
};
