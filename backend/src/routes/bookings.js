const express = require('express');
const db = require('../db');
const auth = require('../middleware/auth');

const router = express.Router();

router.get('/my', auth, (req, res) => {
  const bookings = db.prepare(`
    SELECT b.*, r.origin, r.destination, r.date, r.time, r.price, r.is_recurring, r.days_of_week,
           u.name as driver_name, u.phone as driver_phone,
           u.car_brand, u.car_color, u.car_plate
    FROM bookings b
    JOIN rides r ON b.ride_id = r.id
    JOIN users u ON r.driver_id = u.id
    WHERE b.passenger_id = ?
    ORDER BY b.created_at DESC
  `).all(req.user.id);
  res.json(bookings);
});

// Create booking request — atomico para evitar race conditions
router.post('/', auth, (req, res) => {
  const { ride_id, seats, proposed_time, booking_date, booking_days } = req.body;
  const rideId = Number(ride_id);
  if (!Number.isInteger(rideId) || rideId <= 0) {
    return res.status(400).json({ error: 'ride_id inválido' });
  }
  const seatsRequested = Math.min(Math.max(parseInt(seats, 10) || 1, 1), 8);

  try {
    let booking, ride;
    db.exec('BEGIN IMMEDIATE');
    try {
      ride = db.prepare('SELECT * FROM rides WHERE id = ?').get(rideId);
      if (!ride) throw { status: 404, message: 'Viaje no encontrado' };
      if (ride.status !== 'active') throw { status: 400, message: 'Viaje no disponible' };
      if (ride.driver_id === req.user.id) throw { status: 400, message: 'No puedes solicitar tu propio viaje' };
      if (ride.seats_available < seatsRequested) throw { status: 400, message: 'No hay suficientes asientos disponibles' };

      if (ride.is_recurring) {
        if (!booking_date) throw { status: 400, message: 'Debes seleccionar una fecha de inicio' };
        if (!booking_days) throw { status: 400, message: 'Debes seleccionar al menos un día' };
      }

      const existing = db.prepare(
        "SELECT id FROM bookings WHERE ride_id = ? AND passenger_id = ? AND status IN ('pending','confirmed')"
      ).get(rideId, req.user.id);
      if (existing) throw { status: 400, message: 'Ya tienes una solicitud activa en este viaje' };

      db.prepare('UPDATE rides SET seats_available = seats_available - ? WHERE id = ?').run(seatsRequested, rideId);

      const result = db.prepare(
        'INSERT INTO bookings (ride_id, passenger_id, seats, proposed_time, booking_date, booking_days, status) VALUES (?, ?, ?, ?, ?, ?, ?)'
      ).run(rideId, req.user.id, seatsRequested, proposed_time || null, booking_date || null, booking_days || null, 'pending');

      booking = db.prepare('SELECT * FROM bookings WHERE id = ?').get(result.lastInsertRowid);
      db.exec('COMMIT');
    } catch (e) {
      db.exec('ROLLBACK');
      throw e;
    }

    // Notificación fuera de la transacción
    const passenger = db.prepare('SELECT name FROM users WHERE id = ?').get(req.user.id);
    db.prepare('INSERT INTO notifications (user_id, type, title, message) VALUES (?, ?, ?, ?)').run(
      ride.driver_id, 'booking_request',
      'Nueva solicitud de viaje',
      `${passenger.name} quiere reservar tu viaje ${ride.origin} → ${ride.destination}.`
    );

    res.json(booking);
  } catch (e) {
    if (e.status) return res.status(e.status).json({ error: e.message });
    console.error('booking error:', e);
    res.status(500).json({ error: 'Error al crear la reserva' });
  }
});

// Driver accepts a booking
router.patch('/:id/accept', auth, (req, res) => {
  const booking = db.prepare('SELECT * FROM bookings WHERE id = ?').get(req.params.id);
  if (!booking) return res.status(404).json({ error: 'Solicitud no encontrada' });

  const ride = db.prepare('SELECT * FROM rides WHERE id = ?').get(booking.ride_id);
  if (!ride || ride.driver_id !== req.user.id) return res.status(403).json({ error: 'No autorizado' });
  if (booking.status !== 'pending') return res.status(400).json({ error: 'Solo se pueden aceptar solicitudes pendientes' });

  db.prepare("UPDATE bookings SET status = 'confirmed' WHERE id = ?").run(req.params.id);
  db.prepare('INSERT INTO notifications (user_id, type, title, message) VALUES (?, ?, ?, ?)').run(
    booking.passenger_id, 'booking_accepted',
    '¡Reserva confirmada!',
    `Tu reserva en ${ride.origin} → ${ride.destination} fue confirmada por el conductor.`
  );
  res.json({ message: 'Solicitud aceptada' });
});

// Driver rejects a booking — devolver asientos atómicamente
router.patch('/:id/reject', auth, (req, res) => {
  const booking = db.prepare('SELECT * FROM bookings WHERE id = ?').get(req.params.id);
  if (!booking) return res.status(404).json({ error: 'Solicitud no encontrada' });

  const ride = db.prepare('SELECT * FROM rides WHERE id = ?').get(booking.ride_id);
  if (!ride || ride.driver_id !== req.user.id) return res.status(403).json({ error: 'No autorizado' });
  if (booking.status !== 'pending') return res.status(400).json({ error: 'Solo se pueden rechazar solicitudes pendientes' });

  db.exec('BEGIN');
  try {
    db.prepare("UPDATE bookings SET status = 'rejected' WHERE id = ?").run(req.params.id);
    db.prepare('UPDATE rides SET seats_available = seats_available + ? WHERE id = ?').run(booking.seats, booking.ride_id);
    db.exec('COMMIT');
  } catch (e) { db.exec('ROLLBACK'); throw e; }

  db.prepare('INSERT INTO notifications (user_id, type, title, message) VALUES (?, ?, ?, ?)').run(
    booking.passenger_id, 'booking_rejected',
    'Reserva no confirmada',
    `El conductor no pudo aceptar tu reserva en ${ride.origin} → ${ride.destination}.`
  );
  res.json({ message: 'Solicitud rechazada' });
});

// Driver marks a confirmed booking as completed → desbloquea rating
router.patch('/:id/complete', auth, (req, res) => {
  const booking = db.prepare('SELECT * FROM bookings WHERE id = ?').get(req.params.id);
  if (!booking) return res.status(404).json({ error: 'Reserva no encontrada' });
  const ride = db.prepare('SELECT * FROM rides WHERE id = ?').get(booking.ride_id);
  if (!ride || ride.driver_id !== req.user.id) return res.status(403).json({ error: 'No autorizado' });
  if (booking.status !== 'confirmed') return res.status(400).json({ error: 'Solo se completan reservas confirmadas' });

  db.prepare("UPDATE bookings SET status = 'completed', completed_at = CURRENT_TIMESTAMP WHERE id = ?").run(req.params.id);
  // Liberar asientos del viaje (ya terminó esa reserva)
  db.prepare('UPDATE rides SET seats_available = seats_available + ? WHERE id = ?').run(booking.seats, booking.ride_id);

  db.prepare('INSERT INTO notifications (user_id, type, title, message) VALUES (?, ?, ?, ?)').run(
    booking.passenger_id, 'booking_completed',
    'Viaje completado',
    `Tu viaje ${ride.origin} → ${ride.destination} fue completado. ¡Califica al conductor!`
  );
  res.json({ message: 'Viaje completado' });
});

// Passenger cancels a specific date in a recurring booking
router.patch('/:id/cancel-date', auth, (req, res) => {
  const { date } = req.body;
  if (!date || !/^\d{4}-\d{2}-\d{2}$/.test(date)) return res.status(400).json({ error: 'Fecha inválida' });

  const booking = db.prepare('SELECT * FROM bookings WHERE id = ?').get(req.params.id);
  if (!booking) return res.status(404).json({ error: 'Reserva no encontrada' });
  if (booking.passenger_id !== req.user.id) return res.status(403).json({ error: 'No autorizado' });
  if (!['pending', 'confirmed'].includes(booking.status)) return res.status(400).json({ error: 'No aplica' });

  let cancelled = [];
  try { cancelled = booking.cancelled_dates ? JSON.parse(booking.cancelled_dates) : []; } catch {}
  if (!cancelled.includes(date)) cancelled.push(date);

  db.prepare('UPDATE bookings SET cancelled_dates = ? WHERE id = ?').run(JSON.stringify(cancelled), req.params.id);
  res.json({ ok: true, cancelled_dates: cancelled });
});

// Passenger cancels their booking
router.delete('/:id', auth, (req, res) => {
  const booking = db.prepare('SELECT * FROM bookings WHERE id = ?').get(req.params.id);
  if (!booking) return res.status(404).json({ error: 'Reserva no encontrada' });
  if (booking.passenger_id !== req.user.id) return res.status(403).json({ error: 'No autorizado' });
  if (!['pending', 'confirmed'].includes(booking.status)) {
    return res.status(400).json({ error: 'No se puede cancelar esta reserva' });
  }

  db.exec('BEGIN');
  try {
    db.prepare("UPDATE bookings SET status = 'cancelled' WHERE id = ?").run(req.params.id);
    db.prepare('UPDATE rides SET seats_available = seats_available + ? WHERE id = ?').run(booking.seats, booking.ride_id);
    db.exec('COMMIT');
  } catch (e) { db.exec('ROLLBACK'); throw e; }

  res.json({ message: 'Reserva cancelada' });
});

module.exports = router;
