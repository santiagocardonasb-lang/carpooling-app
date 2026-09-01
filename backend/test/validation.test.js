const { test, describe } = require('node:test');
const assert = require('node:assert/strict');

const {
  validatePassword, normalizePlate, isValidPlate, stripAccents, PASSWORD_MIN,
} = require('../src/utils/validation');
const { paging } = require('../src/utils/paging');

describe('validatePassword', () => {
  test('acepta una contraseña con letras y número', () => {
    assert.equal(validatePassword('abcdef1'), null);
  });

  test('rechaza si no tiene ningún número', () => {
    assert.match(validatePassword('abcdefgh'), /número/);
  });

  test(`rechaza si tiene menos de ${PASSWORD_MIN} caracteres`, () => {
    assert.match(validatePassword('abc1'), /caracteres/);
  });

  test('rechaza si excede el máximo', () => {
    assert.match(validatePassword('a1'.repeat(200)), /caracteres/);
  });

  test('rechaza lo que no sea texto', () => {
    for (const v of [null, undefined, 12345678, {}, []]) {
      assert.notEqual(validatePassword(v), null, `debería rechazar ${JSON.stringify(v)}`);
    }
  });
});

describe('placas', () => {
  test('normaliza mayúsculas y separadores', () => {
    assert.equal(normalizePlate('abc 123'), 'ABC123');
    assert.equal(normalizePlate('abc-123'), 'ABC123');
    assert.equal(normalizePlate('  ABC123  '), 'ABC123');
  });

  test('corta a 6 caracteres', () => {
    assert.equal(normalizePlate('ABCD1234'), 'ABCD12');
  });

  test('no revienta con entradas que no son texto', () => {
    assert.equal(normalizePlate(null), '');
    assert.equal(normalizePlate(undefined), '');
    assert.equal(normalizePlate(123456), '');
  });

  test('acepta el formato de carro (LLLNNN) y el de moto (LLLNNL)', () => {
    assert.ok(isValidPlate('ABC123'));
    assert.ok(isValidPlate('ABC12D'));
  });

  test('rechaza formatos que no existen en Colombia', () => {
    for (const p of ['AB123', 'ABCD12', '123ABC', 'ABC1234', '', 'ABCDEF']) {
      assert.ok(!isValidPlate(p), `debería rechazar ${p}`);
    }
  });

  test('dos formas de escribir la misma placa producen el mismo valor', () => {
    // Esto es lo que impide colar una placa duplicada cambiando el formato.
    assert.equal(normalizePlate('abc 123'), normalizePlate('ABC-123'));
  });
});

describe('stripAccents', () => {
  test('quita tildes y pasa a minúscula', () => {
    assert.equal(stripAccents('Chía'), 'chia');
    assert.equal(stripAccents('BOGOTÁ'), 'bogota');
    assert.equal(stripAccents('Sopó'), 'sopo');
  });

  test('deja igual lo que no tiene tildes', () => {
    assert.equal(stripAccents('Cota'), 'cota');
  });

  test('un municipio con tilde y otro sin ella coinciden', () => {
    // El caso que impedía a un pasajero encontrar viajes a "Chía".
    assert.equal(stripAccents('Chía'), stripAccents('chia'));
  });
});

describe('paging', () => {
  const req = (query) => ({ query });

  test('usa los valores por defecto cuando no se pide nada', () => {
    assert.deepEqual(paging(req({}), { def: 50, max: 100 }), { limit: 50, offset: 0 });
  });

  test('respeta un límite válido', () => {
    assert.equal(paging(req({ limit: '20' }), { def: 50, max: 100 }).limit, 20);
  });

  test('no deja pasar del máximo', () => {
    assert.equal(paging(req({ limit: '9999' }), { def: 50, max: 100 }).limit, 100);
  });

  test('ignora basura y valores negativos', () => {
    for (const bad of ['abc', '-5', '0', '', undefined]) {
      const { limit, offset } = paging(req({ limit: bad, offset: bad }), { def: 50, max: 100 });
      assert.equal(limit, 50, `limit con ${JSON.stringify(bad)}`);
      assert.equal(offset, 0, `offset con ${JSON.stringify(bad)}`);
    }
  });
});
