const express = require('express');
const { query } = require('../db');
const auth = require('../middleware/auth');

const router = express.Router();

// Promedio + conteo para un usuario (público)
router.get('/user/:userId', async (req, res) => {
  const userId = parseInt(req.params.userId, 10);
  if (!Number.isInteger(userId)) return res.status(400).json({ error: 'ID inválido' });
  try {
    const result = await query(
      'SELECT COALESCE(AVG(rating), 0) as avg, COUNT(*) as count FROM ratings WHERE ratee_id=$1',
      [userId]
    );
    const row = result.rows[0];
    res.json({
      avg:   Math.round(parseFloat(row.avg) * 10) / 10,
      count: parseInt(row.count, 10),
    });
  } catch (err) {
    console.error('ratings user:', err);
    res.status(500).json({ error: 'Error interno' });
  }
});

// Lista de calificaciones recibidas con comentarios (pública)
router.get('/user/:userId/list', async (req, res) => {
  const userId = parseInt(req.params.userId, 10);
  if (!Number.isInteger(userId)) return res.status(400).json({ error: 'ID inválido' });
  try {
    const result = await query(`
      SELECT r.rating, r.comment, r.created_at, u.name as rater_name, r.type
      FROM ratings r JOIN users u ON r.rater_id = u.id
      WHERE r.ratee_id = $1
      ORDER BY r.created_at DESC LIMIT 30
    `, [userId]);
    res.json(result.rows);
  } catch (err) {
    console.error('ratings list:', err);
    res.status(500).json({ error: 'Error interno' });
  }
});

// Crear calificación
router.post('/', auth, async (req, res) => {
  const { booking_id, rating, comment } = req.body;
  const bookingId = parseInt(booking_id, 10);
  const stars     = parseInt(rating, 10);

  if (!Number.isInteger(bookingId)) return res.status(400).json({ error: 'booking_id inválido' });
  if (!Number.isInteger(stars) || stars < 1 || stars > 5)
    return res.status(400).json({ error: 'Calificación debe ser entre 1 y 5' });
  if (comment && (typeof comment !== 'string' || comment.length > 500))
    return res.status(400).json({ error: 'Comentario demasiado largo' });

  try {
    const bookingRes = await query(`
      SELECT b.*, r.driver_id FROM bookings b
      JOIN rides r ON b.ride_id = r.id WHERE b.id = $1
    `, [bookingId]);
    const booking = bookingRes.rows[0];
    if (!booking) return res.status(404).json({ error: 'Reserva no encontrada' });
    if (booking.status !== 'completed')
      return res.status(400).json({ error: 'Solo puedes calificar viajes completados' });

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

    await query(
      'INSERT INTO ratings (booking_id, rater_id, ratee_id, rating, comment, type) VALUES ($1,$2,$3,$4,$5,$6)',
      [bookingId, req.user.id, rateeId, stars, comment || null, type]
    );

    // Notificar al calificado
    const raterRes = await query('SELECT name FROM users WHERE id=$1', [req.user.id]);
    const rater = raterRes.rows[0];
    const starsLabel = '⭐'.repeat(stars);
    const roleLabel  = type === 'passenger_to_driver' ? 'pasajero' : 'conductor';
    const msgTail    = comment
      ? `: "${comment.slice(0, 80)}${comment.length > 80 ? '…' : ''}"`
      : '.';

    await query(
      'INSERT INTO notifications (user_id, type, title, message, related_id) VALUES ($1,$2,$3,$4,$5)',
      [
        rateeId, 'new_rating',
        `${starsLabel} Te calificaron`,
        `${rater.name} (${roleLabel}) te dio ${stars} estrella${stars !== 1 ? 's' : ''}${msgTail}`,
        bookingId,
      ]
    );

    res.json({ ok: true });
  } catch (err) {
    if (err.code === '23505')
      return res.status(400).json({ error: 'Ya calificaste este viaje' });
    console.error('ratings POST:', err);
    res.status(500).json({ error: 'Error al guardar calificación' });
  }
});

// Verificar si el usuario ya calificó este booking
router.get('/booking/:id/mine', auth, async (req, res) => {
  const bookingId = parseInt(req.params.id, 10);
  try {
    const result = await query(
      'SELECT id, rating, comment FROM ratings WHERE booking_id=$1 AND rater_id=$2',
      [bookingId, req.user.id]
    );
    const row = result.rows[0];
    res.json({ rated: !!row, rating: row || null });
  } catch (err) {
    console.error('ratings mine:', err);
    res.status(500).json({ error: 'Error interno' });
  }
});

module.exports = router;
