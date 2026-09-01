import { describe, test, expect } from 'vitest';
import { checkPassword, passwordError, PASSWORD_MIN } from './password';
import { apiError } from './apiError';
import { parseDate } from './date';

describe('checkPassword', () => {
  test('aprueba una contraseña con letras y número', () => {
    expect(checkPassword('abcdef1')).toEqual({ minLength: true, hasNumber: true, valid: true });
  });

  test('detecta la falta de número por separado de la longitud', () => {
    // Los dos indicadores se muestran por separado en pantalla, así que
    // importa que no se contaminen entre sí.
    expect(checkPassword('abcdefgh')).toEqual({ minLength: true, hasNumber: false, valid: false });
    expect(checkPassword('a1')).toEqual({ minLength: false, hasNumber: true, valid: false });
  });

  test(`exige ${PASSWORD_MIN} caracteres`, () => {
    expect(checkPassword('abcd1').minLength).toBe(false);
    expect(checkPassword('abcde1').minLength).toBe(true);
  });
});

describe('passwordError', () => {
  test('no devuelve error cuando la contraseña sirve', () => {
    expect(passwordError('abcdef1')).toBeNull();
  });

  test('avisa primero de la longitud y después del número', () => {
    expect(passwordError('abc')).toMatch(/caracteres/);
    expect(passwordError('abcdefgh')).toMatch(/número/);
  });

  test('compara con la confirmación solo si se la pasan', () => {
    expect(passwordError('abcdef1', 'abcdef1')).toBeNull();
    expect(passwordError('abcdef1', 'otra123')).toMatch(/no coinciden/);
    expect(passwordError('abcdef1')).toBeNull();
  });

  test('coincide con la regla del backend', () => {
    // Si estas dos se separan, el usuario ve el formulario en verde y el
    // servidor le responde que no. Ya pasó una vez.
    const casos = ['abcdefgh', 'abc1', '123456', 'abcdef1'];
    for (const pw of casos) {
      const frontRechaza = passwordError(pw) !== null;
      const backRechaza = !(pw.length >= 6 && pw.length <= 200 && /\d/.test(pw));
      expect(frontRechaza).toBe(backRechaza);
    }
  });
});

describe('apiError', () => {
  test('prefiere el mensaje que manda el servidor', () => {
    const err = { response: { status: 400, data: { error: 'El email ya está registrado' } } };
    expect(apiError(err, 'respaldo')).toBe('El email ya está registrado');
  });

  test('sin respuesta HTTP habla de conexión, no de la acción', () => {
    // Este es el caso que escondía el bloqueo de CORS detrás de un
    // "Error al registrarse" que no decía nada.
    expect(apiError({}, 'Error al registrarse')).toMatch(/conectar con el servidor/);
    expect(apiError(undefined, 'Error al registrarse')).toMatch(/conectar con el servidor/);
  });

  test('distingue el tiempo agotado', () => {
    expect(apiError({ code: 'ECONNABORTED' }, 'x')).toMatch(/tardó demasiado/);
  });

  test('traduce 429 y 5xx', () => {
    expect(apiError({ response: { status: 429, data: {} } }, 'x')).toMatch(/Demasiados intentos/);
    expect(apiError({ response: { status: 503, data: {} } }, 'x')).toMatch(/problema/);
  });

  test('cae al respaldo cuando el servidor responde sin explicación', () => {
    expect(apiError({ response: { status: 400, data: {} } }, 'respaldo')).toBe('respaldo');
  });
});

describe('parseDate', () => {
  test('respeta una marca de tiempo con zona (PostgreSQL)', () => {
    const d = parseDate('2026-05-11T18:43:38.132Z');
    expect(d.toISOString()).toBe('2026-05-11T18:43:38.132Z');
  });

  test('trata como UTC una fecha sin zona (el formato viejo de SQLite)', () => {
    // Sin esto, los mensajes del chat aparecían con horas corridas.
    const d = parseDate('2024-01-01 10:00:00');
    expect(d.toISOString()).toBe('2024-01-01T10:00:00.000Z');
  });

  test('acepta desplazamiento explícito', () => {
    expect(parseDate('2024-01-01T10:00:00-05:00').toISOString())
      .toBe('2024-01-01T15:00:00.000Z');
  });

  test('devuelve una fecha inválida en vez de reventar', () => {
    expect(Number.isNaN(parseDate('').getTime())).toBe(true);
  });
});
