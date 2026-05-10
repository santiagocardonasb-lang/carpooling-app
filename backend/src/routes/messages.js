const express = require('express');
const { query } = require('../db');
const auth = require('../middleware/auth');

const router = express.Router();

// Helper: info del booking + validación de acceso
async function getBookingInfo(id) {
  const result = await query(`
    SELECT b.id, b.passenger_id, b.status, b.ride_id,
           r.driver_id, r.origin, r.destination,
           ud.name as driver_name, up.name as passenger_name
    FROM bookings b
    JOIN rides r ON b.ride_id = r.id
    JOIN users ud ON r.driver_id = ud.id
    JOIN users up ON b.passenger_id = up.id
    WHERE b.id = $1
  `, [id]);
  return result.rows[0] || null;
}

// GET historial completo de mensajes de una reserva
router.get('/booking/:id', auth, async (req, res) => {
  try {
    const booking = await getBookingInfo(req.params.id);
    if (!booking) return res.status(404).json({ error: 'Reserva no encontrada' });
    if (booking.passenger_id !== req.user.id && booking.driver_id !== req.user.id)
      return res.status(403).json({ error: 'No autorizado' });

    const result = await query(`
      SELECT m.id, m.sender_id, m.text, m.created_at, u.name as sender_name
      FROM messages m JOIN users u ON m.sender_id = u.id
      WHERE m.booking_id = $1
      ORDER BY m.created_at ASC
    `, [req.params.id]);

    res.json({
      messages: result.rows,
      other_name: booking.driver_id === req.user.id ? booking.passenger_name : booking.driver_name,
      booking_status: booking.status,
    });
  } catch (err) {
    console.error('messages GET booking:', err);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
});

// POST enviar mensaje
router.post('/booking/:id', auth, async (req, res) => {
  const { text } = req.body;
  if (!text || typeof text !== 'string' || !text.trim() || text.length > 500)
    return res.status(400).json({ error: 'Mensaje inválido (máx 500 caracteres)' });

  try {
    const booking = await getBookingInfo(req.params.id);
    if (!booking) return res.status(404).json({ error: 'Reserva no encontrada' });
    if (booking.passenger_id !== req.user.id && booking.driver_id !== req.user.id)
      return res.status(403).json({ error: 'No autorizado' });
    if (!['confirmed', 'in_progress'].includes(booking.status))
      return res.status(400).json({ error: 'El chat solo está disponible para reservas confirmadas o en curso' });

    const insertRes = await query(
      'INSERT INTO messages (booking_id, sender_id, text) VALUES ($1,$2,$3) RETURNING id',
      [req.params.id, req.user.id, text.trim()]
    );

    const msgRes = await query(`
      SELECT m.id, m.sender_id, m.text, m.created_at, u.name as sender_name
      FROM messages m JOIN users u ON m.sender_id = u.id WHERE m.id = $1
    `, [insertRes.rows[0].id]);

    res.json(msgRes.rows[0]);
  } catch (err) {
    console.error('messages POST:', err);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
});

// GET lista de conversaciones activas (para la pantalla de Mensajes)
router.get('/conversations', auth, async (req, res) => {
  const userId = req.user.id;
  try {
    const rowsRes = await query(`
      SELECT b.id as booking_id, b.status, b.passenger_id,
             b.passenger_last_read_at, b.driver_last_read_at,
             r.id as ride_id, r.origin, r.destination, r.driver_id, r.date, r.time, r.is_recurring,
             ud.name as driver_name, ud.avatar as driver_avatar,
             up.name as passenger_name, up.avatar as passenger_avatar
      FROM bookings b
      JOIN rides r ON b.ride_id = r.id
      JOIN users ud ON r.driver_id = ud.id
      JOIN users up ON b.passenger_id = up.id
      WHERE (b.passenger_id = $1 OR r.driver_id = $1)
        AND b.status IN ('confirmed', 'in_progress')
      ORDER BY b.created_at DESC
    `, [userId]);

    const conversations = await Promise.all(rowsRes.rows.map(async (r) => {
      const isDriver = r.driver_id === userId;
      const lastReadAt = isDriver ? r.driver_last_read_at : r.passenger_last_read_at;

      const [lastMsgRes, unreadRes] = await Promise.all([
        query(`SELECT text, created_at, sender_id FROM messages WHERE booking_id=$1 ORDER BY created_at DESC LIMIT 1`, [r.booking_id]),
        query(
          `SELECT COUNT(*) as count FROM messages WHERE booking_id=$1 AND sender_id!=$2 AND ($3::timestamptz IS NULL OR created_at > $3)`,
          [r.booking_id, userId, lastReadAt || null]
        ),
      ]);

      const lastMsg = lastMsgRes.rows[0] || null;
      const unread  = parseInt(unreadRes.rows[0].count, 10);

      return {
        booking_id: r.booking_id,
        status: r.status,
        ride: { origin: r.origin, destination: r.destination, date: r.date, time: r.time, is_recurring: r.is_recurring },
        other: isDriver
          ? { id: r.passenger_id, name: r.passenger_name, avatar: r.passenger_avatar }
          : { id: r.driver_id,    name: r.driver_name,    avatar: r.driver_avatar    },
        last_message: lastMsg
          ? { text: lastMsg.text, created_at: lastMsg.created_at, mine: lastMsg.sender_id === userId }
          : null,
        unread,
      };
    }));

    // Ordenar por actividad: con último mensaje primero
    conversations.sort((a, b) => {
      const aT = a.last_message?.created_at?.toString() || '';
      const bT = b.last_message?.created_at?.toString() || '';
      if (aT && !bT) return -1;
      if (!aT && bT) return 1;
      return bT.localeCompare(aT);
    });

    res.json(conversations);
  } catch (err) {
    console.error('conversations:', err);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
});

// GET total de mensajes no leídos (badge del navbar)
router.get('/unread-count', auth, async (req, res) => {
  const userId = req.user.id;
  try {
    const result = await query(`
      SELECT COUNT(*) as count
      FROM messages m
      JOIN bookings b ON m.booking_id = b.id
      JOIN rides r ON b.ride_id = r.id
      WHERE m.sender_id != $1
        AND (b.passenger_id = $1 OR r.driver_id = $1)
        AND b.status IN ('confirmed', 'in_progress')
        AND (
          (b.passenger_id = $1 AND (b.passenger_last_read_at IS NULL OR m.created_at > b.passenger_last_read_at))
          OR (r.driver_id = $1 AND (b.driver_last_read_at IS NULL OR m.created_at > b.driver_last_read_at))
        )
    `, [userId]);
    res.json({ count: parseInt(result.rows[0].count, 10) });
  } catch (err) {
    console.error('messages unread-count:', err);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
});

// PATCH marcar mensajes de una reserva como leídos
router.patch('/booking/:id/read', auth, async (req, res) => {
  try {
    const booking = await getBookingInfo(req.params.id);
    if (!booking) return res.status(404).json({ error: 'Reserva no encontrada' });
    if (booking.passenger_id !== req.user.id && booking.driver_id !== req.user.id)
      return res.status(403).json({ error: 'No autorizado' });

    const col = booking.driver_id === req.user.id ? 'driver_last_read_at' : 'passenger_last_read_at';
    await query(`UPDATE bookings SET ${col}=NOW() WHERE id=$1`, [req.params.id]);
    res.json({ ok: true });
  } catch (err) {
    console.error('messages read:', err);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
});

module.exports = router;
