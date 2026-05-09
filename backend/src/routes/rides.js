const express = require('express');
const db = require('../db');
const auth = require('../middleware/auth');

const router = express.Router();

router.get('/', (req, res) => {
  const { origin, destination, date, vehicle_type } = req.query;

  let query = `
    SELECT r.*, u.name as driver_name, u.phone as driver_phone,
           u.car_brand, u.car_color, u.car_plate,
           COALESCE((SELECT ROUND(AVG(rating),1) FROM ratings WHERE ratee_id = u.id), 0) as driver_rating,
           (SELECT COUNT(*) FROM ratings WHERE ratee_id = u.id) as driver_rating_count
    FROM rides r
    JOIN users u ON r.driver_id = u.id
    WHERE r.status = 'active' AND r.seats_available > 0
  `;
  const params = [];

  if (origin) { query += ' AND LOWER(r.origin) LIKE ?'; params.push(`%${origin.toLowerCase()}%`); }
  if (destination) { query += ' AND LOWER(r.destination) LIKE ?'; params.push(`%${destination.toLowerCase()}%`); }
  if (vehicle_type) { query += ' AND r.vehicle_type = ?'; params.push(vehicle_type); }

  if (date) {
    const d = new Date(date + 'T12:00:00Z');
    const dayOfWeek = d.getUTCDay();
    query += ` AND ((r.is_recurring = 0 AND r.date = ?) OR (r.is_recurring = 1))`;
    params.push(date);
    const all = db.prepare(query + ' ORDER BY r.time ASC').all(...params);
    const result = all.filter(r => {
      if (!r.is_recurring) return true;
      if (!r.days_of_week) return false;
      return r.days_of_week.split(',').map(Number).includes(dayOfWeek);
    });
    return res.json(result);
  }

  query += ' ORDER BY r.date ASC, r.time ASC';
  res.json(db.prepare(query).all(...params));
});

router.get('/my', auth, (req, res) => {
  const rides = db.prepare(`
    SELECT r.*,
      (SELECT COUNT(*) FROM bookings b WHERE b.ride_id = r.id AND b.status = 'pending') as pending_requests,
      (SELECT COUNT(*) FROM bookings b WHERE b.ride_id = r.id AND b.status = 'confirmed') as confirmed_passengers
    FROM rides r
    WHERE r.driver_id = ?
    ORDER BY r.created_at DESC
  `).all(req.user.id);
  res.json(rides);
});

// All booking requests across all of the driver's active rides
router.get('/my/requests', auth, (req, res) => {
  const requests = db.prepare(`
    SELECT b.*, u.name as passenger_name, u.phone as passenger_phone, u.email as passenger_email,
           r.origin, r.destination, r.time, r.date, r.is_recurring, r.days_of_week
    FROM bookings b
    JOIN rides r ON b.ride_id = r.id
    JOIN users u ON b.passenger_id = u.id
    WHERE r.driver_id = ? AND r.status = 'active' AND b.status IN ('pending','confirmed','completed')
    ORDER BY
      CASE b.status WHEN 'pending' THEN 0 WHEN 'confirmed' THEN 1 ELSE 2 END,
      b.created_at DESC
  `).all(req.user.id);
  res.json(requests);
});

router.get('/:id/requests', auth, (req, res) => {
  const ride = db.prepare('SELECT * FROM rides WHERE id = ?').get(req.params.id);
  if (!ride) return res.status(404).json({ error: 'Viaje no encontrado' });
  if (ride.driver_id !== req.user.id) return res.status(403).json({ error: 'No autorizado' });

  const requests = db.prepare(`
    SELECT b.*, u.name as passenger_name, u.phone as passenger_phone, u.email as passenger_email
    FROM bookings b
    JOIN users u ON b.passenger_id = u.id
    WHERE b.ride_id = ?
    ORDER BY b.created_at ASC
  `).all(req.params.id);
  res.json(requests);
});

router.post('/', auth, (req, res) => {
  const { origin, destination, date, time, seats, price, description, vehicle_type, is_recurring, days_of_week } = req.body;

  const missingFields = {};
  if (!origin?.trim()) missingFields.origin = true;
  if (!destination?.trim()) missingFields.destination = true;
  if (!time) missingFields.time = true;
  if (!seats || isNaN(Number(seats)) || Number(seats) < 1) missingFields.seats = true;
  if (price === undefined || price === null || price === '' || isNaN(Number(price))) missingFields.price = true;
  if (!is_recurring && !date) missingFields.date = true;
  if (is_recurring && (!days_of_week || days_of_week.length === 0)) missingFields.days_of_week = true;

  if (Object.keys(missingFields).length > 0) {
    return res.status(400).json({ error: 'Completa los campos requeridos', fields: missingFields });
  }

  const result = db.prepare(`
    INSERT INTO rides (driver_id, origin, destination, date, time, seats, seats_available, price, description, vehicle_type, is_recurring, days_of_week)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(
    req.user.id, origin.trim(), destination.trim(),
    is_recurring ? null : (date || null),
    time, Number(seats), Number(seats), Number(price),
    description?.trim() || null,
    vehicle_type || 'car',
    is_recurring ? 1 : 0,
    days_of_week || null
  );

  const ride = db.prepare('SELECT * FROM rides WHERE id = ?').get(result.lastInsertRowid);
  res.json(ride);
});

router.put('/:id', auth, (req, res) => {
  const ride = db.prepare('SELECT * FROM rides WHERE id = ?').get(req.params.id);
  if (!ride) return res.status(404).json({ error: 'Viaje no encontrado' });
  if (ride.driver_id !== req.user.id) return res.status(403).json({ error: 'No autorizado' });
  if (ride.status !== 'active') return res.status(400).json({ error: 'No se puede editar un viaje cancelado' });

  const { origin, destination, date, time, seats, price, description, vehicle_type, is_recurring, days_of_week } = req.body;

  const missingFields = {};
  if (!origin?.trim()) missingFields.origin = true;
  if (!destination?.trim()) missingFields.destination = true;
  if (!time) missingFields.time = true;
  if (!seats || isNaN(Number(seats)) || Number(seats) < 1) missingFields.seats = true;
  if (price === undefined || price === null || price === '' || isNaN(Number(price))) missingFields.price = true;
  if (!is_recurring && !date) missingFields.date = true;
  if (Object.keys(missingFields).length > 0) {
    return res.status(400).json({ error: 'Completa los campos requeridos', fields: missingFields });
  }

  // Keep confirmed bookings, adjust seats_available accordingly
  const confirmedSeats = db.prepare(
    "SELECT COALESCE(SUM(seats),0) as total FROM bookings WHERE ride_id = ? AND status IN ('pending','confirmed')"
  ).get(req.params.id).total;
  const newSeats = Number(seats);
  if (newSeats < confirmedSeats) {
    return res.status(400).json({ error: `No puedes reducir los asientos por debajo de las reservas actuales (${confirmedSeats})` });
  }

  db.prepare(`
    UPDATE rides SET origin=?, destination=?, date=?, time=?, seats=?, seats_available=?,
    price=?, description=?, vehicle_type=?, is_recurring=?, days_of_week=? WHERE id=?
  `).run(
    origin.trim(), destination.trim(),
    is_recurring ? null : (date || null),
    time, newSeats, newSeats - confirmedSeats,
    Number(price), description?.trim() || null,
    vehicle_type || 'car', is_recurring ? 1 : 0, days_of_week || null,
    req.params.id
  );

  const updated = db.prepare('SELECT * FROM rides WHERE id = ?').get(req.params.id);
  res.json(updated);
});

router.delete('/:id', auth, (req, res) => {
  const ride = db.prepare('SELECT * FROM rides WHERE id = ?').get(req.params.id);
  if (!ride) return res.status(404).json({ error: 'Viaje no encontrado' });
  if (ride.driver_id !== req.user.id) return res.status(403).json({ error: 'No autorizado' });
  db.prepare("UPDATE rides SET status = 'cancelled' WHERE id = ?").run(req.params.id);
  db.prepare("UPDATE bookings SET status = 'cancelled' WHERE ride_id = ?").run(req.params.id);

  // Notify affected passengers
  const passengers = db.prepare(
    "SELECT passenger_id FROM bookings WHERE ride_id = ? AND status = 'cancelled'"
  ).all(req.params.id);
  const msg = db.prepare(
    'INSERT INTO notifications (user_id, type, title, message) VALUES (?, ?, ?, ?)'
  );
  for (const { passenger_id } of passengers) {
    msg.run(passenger_id, 'ride_cancelled',
      'Viaje cancelado',
      `El conductor canceló el viaje ${ride.origin} → ${ride.destination}. Tu reserva fue cancelada automáticamente.`
    );
  }

  res.json({ message: 'Viaje cancelado' });
});

module.exports = router;
