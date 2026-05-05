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

// Create booking request (pending until driver accepts)
router.post('/', auth, (req, res) => {
  const { ride_id, seats, proposed_time, booking_date, booking_days } = req.body;
  if (!ride_id) return res.status(400).json({ error: 'ride_id es requerido' });

  const seatsRequested = seats || 1;
  const ride = db.prepare('SELECT * FROM rides WHERE id = ?').get(ride_id);
  if (!ride) return res.status(404).json({ error: 'Viaje no encontrado' });
  if (ride.status !== 'active') return res.status(400).json({ error: 'Viaje no disponible' });
  if (ride.driver_id === req.user.id) return res.status(400).json({ error: 'No puedes solicitar tu propio viaje' });
  if (ride.seats_available < seatsRequested) return res.status(400).json({ error: 'No hay suficientes asientos disponibles' });

  // For recurring rides, require date + days selection
  if (ride.is_recurring) {
    if (!booking_date) return res.status(400).json({ error: 'Debes seleccionar una fecha de inicio' });
    if (!booking_days) return res.status(400).json({ error: 'Debes seleccionar al menos un día' });
  }

  const existing = db.prepare(
    "SELECT * FROM bookings WHERE ride_id = ? AND passenger_id = ? AND status IN ('pending','confirmed')"
  ).get(ride_id, req.user.id);
  if (existing) return res.status(400).json({ error: 'Ya tienes una solicitud activa en este viaje' });

  // Reserve seats (pending state)
  db.prepare('UPDATE rides SET seats_available = seats_available - ? WHERE id = ?').run(seatsRequested, ride_id);

  const stmt = db.prepare(
    'INSERT INTO bookings (ride_id, passenger_id, seats, proposed_time, booking_date, booking_days, status) VALUES (?, ?, ?, ?, ?, ?, ?)'
  );
  const result = stmt.run(
    ride_id, req.user.id, seatsRequested,
    proposed_time || null,
    booking_date || null,
    booking_days || null,
    'pending'
  );

  const booking = db.prepare('SELECT * FROM bookings WHERE id = ?').get(result.lastInsertRowid);

  // Notify driver of new request
  const passenger = db.prepare('SELECT name FROM users WHERE id = ?').get(req.user.id);
  db.prepare('INSERT INTO notifications (user_id, type, title, message) VALUES (?, ?, ?, ?)').run(
    ride.driver_id, 'booking_request',
    'Nueva solicitud de viaje',
    `${passenger.name} quiere reservar tu viaje ${ride.origin} → ${ride.destination}.`
  );

  res.json(booking);
});

// Driver accepts a booking
router.patch('/:id/accept', auth, (req, res) => {
  const booking = db.prepare('SELECT * FROM bookings WHERE id = ?').get(req.params.id);
  if (!booking) return res.status(404).json({ error: 'Solicitud no encontrada' });

  const ride = db.prepare('SELECT * FROM rides WHERE id = ?').get(booking.ride_id);
  if (ride.driver_id !== req.user.id) return res.status(403).json({ error: 'No autorizado' });
  if (booking.status !== 'pending') return res.status(400).json({ error: 'Solo se pueden aceptar solicitudes pendientes' });

  db.prepare("UPDATE bookings SET status = 'confirmed' WHERE id = ?").run(req.params.id);
  db.prepare('INSERT INTO notifications (user_id, type, title, message) VALUES (?, ?, ?, ?)').run(
    booking.passenger_id, 'booking_accepted',
    '¡Reserva confirmada!',
    `Tu reserva en ${ride.origin} → ${ride.destination} fue confirmada por el conductor.`
  );
  res.json({ message: 'Solicitud aceptada' });
});

// Driver rejects a booking
router.patch('/:id/reject', auth, (req, res) => {
  const booking = db.prepare('SELECT * FROM bookings WHERE id = ?').get(req.params.id);
  if (!booking) return res.status(404).json({ error: 'Solicitud no encontrada' });

  const ride = db.prepare('SELECT * FROM rides WHERE id = ?').get(booking.ride_id);
  if (ride.driver_id !== req.user.id) return res.status(403).json({ error: 'No autorizado' });
  if (booking.status !== 'pending') return res.status(400).json({ error: 'Solo se pueden rechazar solicitudes pendientes' });

  db.prepare("UPDATE bookings SET status = 'rejected' WHERE id = ?").run(req.params.id);
  db.prepare('UPDATE rides SET seats_available = seats_available + ? WHERE id = ?').run(booking.seats, booking.ride_id);
  db.prepare('INSERT INTO notifications (user_id, type, title, message) VALUES (?, ?, ?, ?)').run(
    booking.passenger_id, 'booking_rejected',
    'Reserva no confirmada',
    `El conductor no pudo aceptar tu reserva en ${ride.origin} → ${ride.destination}.`
  );
  res.json({ message: 'Solicitud rechazada' });
});

// Passenger cancels their booking
router.delete('/:id', auth, (req, res) => {
  const booking = db.prepare('SELECT * FROM bookings WHERE id = ?').get(req.params.id);
  if (!booking) return res.status(404).json({ error: 'Reserva no encontrada' });
  if (booking.passenger_id !== req.user.id) return res.status(403).json({ error: 'No autorizado' });
  if (!['pending', 'confirmed'].includes(booking.status)) {
    return res.status(400).json({ error: 'No se puede cancelar esta reserva' });
  }

  db.prepare("UPDATE bookings SET status = 'cancelled' WHERE id = ?").run(req.params.id);
  db.prepare('UPDATE rides SET seats_available = seats_available + ? WHERE id = ?').run(booking.seats, booking.ride_id);
  res.json({ message: 'Reserva cancelada' });
});

module.exports = router;
