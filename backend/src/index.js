require('dotenv').config();
const express = require('express');
const cors = require('cors');
const { securityHeaders, rateLimit, sanitizeBody } = require('./middleware/security');

const app = express();
const PORT = process.env.PORT || 3001;

// CORS — sólo orígenes locales por defecto (producción debe usar CORS_ORIGIN)
const allowedOrigins = (process.env.CORS_ORIGIN || 'http://localhost:3000,http://localhost:5173')
  .split(',').map(s => s.trim());
app.use(cors({
  origin: (origin, cb) => {
    if (!origin || allowedOrigins.includes(origin)) return cb(null, true);
    cb(new Error('Origen no permitido'));
  },
  credentials: true,
}));

app.use(securityHeaders);
app.use(express.json({ limit: '5mb' })); // base64 avatar uploads
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

app.get('/api/health', (_, res) => res.json({ status: 'ok' }));

// Manejador global de errores (evita que crashes leaken stack traces)
app.use((err, _req, res, _next) => {
  console.error('Error:', err.message);
  res.status(err.status || 500).json({ error: 'Error interno del servidor' });
});

app.listen(PORT, () => {
  console.log(`Servidor corriendo en http://localhost:${PORT}`);
});
