const { test, describe } = require('node:test');
const assert = require('node:assert/strict');

const { noticeHours, isLate, LATE_THRESHOLD_HOURS } = require('../src/utils/cancellation');

describe('noticeHours', () => {
  // Salida: 11 de mayo de 2026, 08:00 en Colombia (= 13:00 UTC)
  const salida = { date: '2026-05-11', time: '08:00' };

  test('cuenta las horas que faltan para la salida', () => {
    const ahora = new Date('2026-05-11T08:00:00Z'); // 03:00 en Colombia
    assert.equal(noticeHours(salida.date, salida.time, ahora), 5);
  });

  test('interpreta la hora en Colombia y no en la del servidor', () => {
    // Render corre en UTC. Si esto se calculara con la zona del servidor,
    // daría cinco horas de diferencia — el mismo error que expiraba los
    // viajes antes de tiempo.
    const ahora = new Date('2026-05-11T12:00:00Z'); // 07:00 en Colombia
    assert.equal(noticeHours(salida.date, salida.time, ahora), 1);
  });

  test('da negativo si el viaje ya salió', () => {
    const ahora = new Date('2026-05-11T15:00:00Z'); // 10:00 en Colombia
    assert.equal(noticeHours(salida.date, salida.time, ahora), -2);
  });

  test('acepta un objeto Date como fecha', () => {
    const ahora = new Date('2026-05-11T08:00:00Z');
    assert.equal(noticeHours(new Date('2026-05-11T00:00:00Z'), '08:00', ahora), 5);
  });

  test('devuelve null cuando no hay fecha u hora', () => {
    // Un viaje recurrente sin fecha concreta no se puede juzgar.
    assert.equal(noticeHours(null, '08:00'), null);
    assert.equal(noticeHours('2026-05-11', null), null);
    assert.equal(noticeHours('2026-05-11', 'sin-hora'), null);
  });
});

describe('isLate', () => {
  test(`marca como tardío por debajo de ${LATE_THRESHOLD_HOURS} horas`, () => {
    assert.ok(isLate(0.5));
    assert.ok(isLate(1.9));
  });

  test('no marca una cancelación con antelación', () => {
    assert.ok(!isLate(2));
    assert.ok(!isLate(24));
  });

  test('un viaje ya pasado cuenta como tardío', () => {
    assert.ok(isLate(-3));
  });

  test('sin dato no juzga', () => {
    assert.ok(!isLate(null));
  });
});
