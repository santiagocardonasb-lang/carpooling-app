// Topes para las listas. Sin un LIMIT, cada consulta crece con la base:
// funciona con 10 viajes y se cae con 5.000. El cliente puede pedir menos,
// nunca más que el máximo.

function paging(req, { def = 50, max = 100 } = {}) {
  const rawLimit  = parseInt(req.query.limit, 10);
  const rawOffset = parseInt(req.query.offset, 10);

  const limit = Number.isInteger(rawLimit) && rawLimit > 0
    ? Math.min(rawLimit, max)
    : def;
  const offset = Number.isInteger(rawOffset) && rawOffset > 0 ? rawOffset : 0;

  return { limit, offset };
}

module.exports = { paging };
