const express = require('express');
const db = require('../db');
const auth = require('../middleware/auth');

const router = express.Router();

// Avg rating + count para un usuario (público pero no incluye comentarios)
router.get('/user/:userId', (req, res) => {
  const userId = parseInt(req.params.userId, 10);
  if (!Number.isInteger(userId)) return res.status(400).json({ error: 'ID inválido' });
  const row = db.prepare(
    'SELECT COALESCE(AVG(rating),0) as avg, COUNT(*) as count FROM ratings WHERE ratee_id = ?'
  ).get(userId);
  res.json({ avg: Math.round(row.avg * 10) / 10, count: row.count });
});

// Lista de calificaciones recibidas (con comentarios) — pública
router.get('/user/:userId/list', (req, res) => {
  const userId = parseInt(req.params.userId, 10);
  if (!Number.isInteger(userId)) return res.status(400).json({ error: 'ID inválido' });
  const rows = db.prepare(`
    SELECT r.rating, r.comment, r.created_at, u.name as rater_name, r.type
    FROM ratings r JOIN users u ON r.rater_id = u.id
    WHERE r.ratee_id = ?
    ORDER BY r.created_at DESC LIMIT 30
  `).all(userId);
  res.json(rows);
});

// Crear calificación
router.post('/', auth, (req, res) => {
  const { booking_id, rating, comment } = req.body;
  const bookingId = parseInt(booking_id, 10);
  const stars = parseInt(rating, 10);
  if (!Number.isInteger(bookingId)) return res.status(400).json({ error: 'booking_id inválido' });
  if (!Number.isInteger(stars) || stars < 1 || stars > 5) {
    return res.status(400).json({ error: 'Calificación debe ser entre 1 y 5' });
  }
  if (comment && (typeof comment !== 'string' || comment.length > 500)) {
    return res.status(400).json({ error: 'Comentario demasiado largo' });
  }

  const booking = db.prepare(`
    SELECT b.*, r.driver_id FROM bookings b
    JOIN rides r ON b.ride_id = r.id WHERE b.id = ?
  `).get(bookingId);
  if (!booking) return res.status(404).json({ error: 'Reserva no encontrada' });
  if (booking.status !== 'completed') {
    return res.status(400).json({ error: 'Solo puedes calificar viajes completados' });
  }

  // Determinar quién califica a quién
  let rateeId, type;
  if (req.user.id === booking.driver_id) {
    rateeId = booking.passenger_id;
    type = 'driver_to_passenger';
  } else if (req.user.id === booking.passenger_id) {
    rateeId = booking.driver_id;
    type = 'passenger_to_driver';
  } else {
    return res.status(403).json({ error: 'No autorizado' });
  }

  try {
    db.prepare(
      'INSERT INTO ratings (booking_id, rater_id, ratee_id, rating, comment, type) VALUES (?, ?, ?, ?, ?, ?)'
    ).run(bookingId, req.user.id, rateeId, stars, comment || null, type);
    res.json({ ok: true });
  } catch (e) {
    if (e.message.includes('UNIQUE')) {
      return res.status(400).json({ error: 'Ya calificaste este viaje' });
    }
    console.error(e);
    res.status(500).json({ error: 'Error al guardar calificación' });
  }
});

// Verificar si yo ya califiqué este booking
router.get('/booking/:id/mine', auth, (req, res) => {
  const bookingId = parseInt(req.params.id, 10);
  const row = db.prepare(
    'SELECT id, rating, comment FROM ratings WHERE booking_id = ? AND rater_id = ?'
  ).get(bookingId, req.user.id);
  res.json({ rated: !!row, rating: row || null });
});

module.exports = router;
