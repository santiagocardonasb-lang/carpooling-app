// Lightweight security middleware (sin dependencias externas)

// 1) Cabeceras HTTP de seguridad (equivalente reducido a helmet)
function securityHeaders(req, res, next) {
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'DENY');
  res.setHeader('X-XSS-Protection', '1; mode=block');
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
  res.setHeader('Permissions-Policy', 'geolocation=(), microphone=(), camera=()');
  res.setHeader('Strict-Transport-Security', 'max-age=15552000; includeSubDomains');
  next();
}

// 2) Rate limiter en memoria. windowMs ms / max requests por IP+ruta.
function rateLimit({ windowMs = 60_000, max = 60, message = 'Demasiadas solicitudes, intenta más tarde' } = {}) {
  const buckets = new Map();
  // Limpieza periódica
  setInterval(() => {
    const now = Date.now();
    for (const [k, b] of buckets) if (b.reset < now) buckets.delete(k);
  }, windowMs).unref?.();

  return (req, res, next) => {
    const key = (req.ip || req.connection?.remoteAddress || 'unknown') + ':' + req.path;
    const now = Date.now();
    let bucket = buckets.get(key);
    if (!bucket || bucket.reset < now) bucket = { count: 0, reset: now + windowMs };
    bucket.count++;
    buckets.set(key, bucket);
    if (bucket.count > max) {
      res.setHeader('Retry-After', Math.ceil((bucket.reset - now) / 1000));
      return res.status(429).json({ error: message });
    }
    next();
  };
}

// 3) Sanitización: rechaza payloads con caracteres de control y tipos inesperados.
//    SQL injection ya está mitigado por prepared statements; esto añade defensa en profundidad.
function sanitizeBody(req, res, next) {
  const limits = {
    // Topes razonables por campo para prevenir DoS por strings gigantes
    string: 500,
    longString: 5_000,    // descripciones
    avatar: 2_800_000,    // base64 ~2MB
  };
  const longFields = new Set(['description', 'message']);
  const skipFields = new Set(['avatar']);

  function clean(value, field) {
    if (typeof value !== 'string') return value;
    if (skipFields.has(field)) {
      if (value.length > limits.avatar) throw new Error(`Campo ${field} demasiado grande`);
      return value;
    }
    // Quitar caracteres de control salvo \n y \t
    value = value.replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, '');
    const max = longFields.has(field) ? limits.longString : limits.string;
    if (value.length > max) throw new Error(`Campo ${field} excede ${max} caracteres`);
    return value;
  }

  try {
    if (req.body && typeof req.body === 'object') {
      for (const k of Object.keys(req.body)) {
        req.body[k] = clean(req.body[k], k);
      }
    }
    next();
  } catch (e) {
    res.status(400).json({ error: e.message });
  }
}

module.exports = { securityHeaders, rateLimit, sanitizeBody };
