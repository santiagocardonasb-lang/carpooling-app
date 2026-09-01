require('dotenv').config();
const express = require('express');
const cors = require('cors');
const { securityHeaders, rateLimit, sanitizeBody } = require('./middleware/security');

const app = express();
const PORT = process.env.PORT || 3001;

// CORS — permite localhost y cualquier IP de red local (192.168.x.x, 10.x.x.x, 172.16-31.x.x)
// En producción sobreescribir con la variable CORS_ORIGIN
const allowedOrigins = (process.env.CORS_ORIGIN || '')
  .split(',').map(s => s.trim()).filter(Boolean);

const LOCAL_IP_RE = /^https?:\/\/(localhost|127\.0\.0\.1|192\.168\.\d{1,3}\.\d{1,3}|10\.\d{1,3}\.\d{1,3}\.\d{1,3}|172\.(1[6-9]|2\d|3[01])\.\d{1,3}\.\d{1,3})(:\d+)?$/;

// Vercel da una URL distinta a cada despliegue además de la de producción:
//   carpooling-app-blond.vercel.app                                  (producción)
//   carpooling-app-git-<rama>-<cuenta>-projects.vercel.app           (preview de rama)
//   carpooling-app-<hash>-<cuenta>-projects.vercel.app               (preview de commit)
// Sin esto, probar desde una URL de preview falla con un error de CORS que en
// el frontend se ve como un "Error al registrarse" genérico.
const VERCEL_PREVIEW_RE = /^https:\/\/carpooling-app(-[a-z0-9-]+)?\.vercel\.app$/;

app.use(cors({
  origin: (origin, cb) => {
    // Sin origen (apps móviles nativas, curl, Postman) → permitir
    if (!origin) return cb(null, true);
    // Lista explícita (producción)
    if (allowedOrigins.includes(origin)) return cb(null, true);
    // Cualquier despliegue de este proyecto en Vercel
    if (VERCEL_PREVIEW_RE.test(origin)) return cb(null, true);
    // Red local (desarrollo desde celular / otra PC de la misma red)
    if (LOCAL_IP_RE.test(origin)) return cb(null, true);
    // Denegar sin lanzar: lanzar aquí devuelve un 500 que confunde el
    // diagnóstico. Sin cabecera CORS, el navegador bloquea igual.
    cb(null, false);
  },
  credentials: true,
}));

app.use(securityHeaders);
app.use(express.json({ limit: '8mb' })); // base64 avatar uploads (comprimidas en cliente)
app.use(sanitizeBody);

// Rate limiters específicos
const authLimiter = rateLimit({ windowMs: 15 * 60_000, max: 30, message: 'Demasiados intentos de autenticación' });
const generalLimiter = rateLimit({ windowMs: 60_000, max: 120 });

app.use('/api/auth', authLimiter, require('./routes/auth'));
app.use('/api', generalLimiter); // rate limit base para el resto
app.use('/api/rides', require('./routes/rides'));
app.use('/api/bookings', require('./routes/bookings'));
app.use('/api/profile', require('./routes/profile'));
app.use('/api/notifications', require('./routes/notifications'));
app.use('/api/ratings', require('./routes/ratings'));
app.use('/api/messages', require('./routes/messages'));

app.get('/api/health', (_, res) => res.json({ status: 'ok' }));

// Manejador global de errores (evita que crashes leaken stack traces)
app.use((err, _req, res, _next) => {
  console.error('Error:', err.message);
  res.status(err.status || 500).json({ error: 'Error interno del servidor' });
});

app.listen(PORT, '0.0.0.0', () => {
  console.log(`Servidor corriendo en http://0.0.0.0:${PORT}`);
  // Saber qué migraciones opcionales ya corrieron antes de atender tráfico.
  require('./utils/schema').detect().finally(() => require('./scheduler').start());
});
