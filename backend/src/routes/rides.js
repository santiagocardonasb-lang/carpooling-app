const express = require('express');
const { query } = require('../db');
const auth = require('../middleware/auth');

const router = express.Router();

// Búsqueda pública de viajes
router.get('/', async (req, res) => {
  const { origin, destination, date, vehicle_type } = req.query;

  let sql = `
    SELECT r.*,
           u.name as driver_name, u.phone as driver_phone,
           u.car_brand, u.car_color, u.car_plate,
           COALESCE(
             (SELECT ROUND(AVG(rt.rating)::numeric, 1)
              FROM ratings rt WHERE rt.ratee_id = u.id), 0
           ) as driver_rating,
           (SELECT COUNT(*) FROM ratings rt WHERE rt.ratee_id = u.id) as driver_rating_count
    FROM rides r
    JOIN users u ON r.driver_id = u.id
    WHERE r.status = 'active' AND r.seats_available > 0
  `;
  const params = [];
  let idx = 1;

  if (origin)       { sql += ` AND LOWER(r.origin) LIKE $${idx++}`;      params.push(`%${origin.toLowerCase()}%`); }
  if (destination)  { sql += ` AND LOWER(r.destination) LIKE $${idx++}`; params.push(`%${destination.toLowerCase()}%`); }
  if (vehicle_type) { sql += ` AND r.vehicle_type = $${idx++}`;           params.push(vehicle_type); }

  try {
    if (date) {
      const d = new Date(date + 'T12:00:00Z');
      const dayOfWeek = d.getUTCDay();
      sql += ` AND ((r.is_recurring = 0 AND r.date = $${idx++}) OR r.is_recurring = 1)`;
      params.push(date);
      const result = await query(sql + ' ORDER BY r.time ASC', params);
      const filtered = result.rows.filter(r => {
        if (!r.is_recurring) return true;
        if (!r.days_of_week) return false;
        return r.days_of_week.split(',').map(Number).includes(dayOfWeek);
      });
      return res.json(filtered);
    }

    sql += ' ORDER BY r.date ASC, r.time ASC';
    const result = await query(sql, params);
    res.json(result.rows);
  } catch (err) {
    console.error('rides GET:', err);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
});

// Viajes del conductor autenticado
router.get('/my', auth, async (req, res) => {
  try {
    const result = await query(`
      SELECT r.*,
        (SELECT COUNT(*) FROM bookings b WHERE b.ride_id = r.id AND b.status = 'pending')   as pending_requests,
        (SELECT COUNT(*) FROM bookings b WHERE b.ride_id = r.id AND b.status = 'confirmed') as confirmed_passengers
      FROM rides r
      WHERE r.driver_id = $1
      ORDER BY r.created_at DESC
    `, [req.user.id]);
    res.json(result.rows);
  } catch (err) {
    console.error('rides my:', err);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
});

// Todas las solicitudes de reserva de los viajes activos del conductor
router.get('/my/requests', auth, async (req, res) => {
  try {
    const result = await query(`
      SELECT b.*, u.name as passenger_name, u.phone as passenger_phone, u.email as passenger_email,
             r.origin, r.destination, r.time, r.date, r.is_recurring, r.days_of_week
      FROM bookings b
      JOIN rides r ON b.ride_id = r.id
      JOIN users u ON b.passenger_id = u.id
      WHERE r.driver_id = $1 AND r.status = 'active' AND b.status IN ('pending','confirmed','in_progress')
      ORDER BY
        CASE b.status
          WHEN 'pending'     THEN 0
          WHEN 'in_progress' THEN 1
          WHEN 'confirmed'   THEN 2
          ELSE 3
        END,
        b.created_at DESC
    `, [req.user.id]);
    res.json(result.rows);
  } catch (err) {
    console.error('rides my/requests:', err);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
});

// Solicitudes de un viaje específico
router.get('/:id/requests', auth, async (req, res) => {
  try {
    const rideRes = await query('SELECT * FROM rides WHERE id=$1', [req.params.id]);
    const ride = rideRes.rows[0];
    if (!ride) return res.status(404).json({ error: 'Viaje no encontrado' });
    if (ride.driver_id !== req.user.id) return res.status(403).json({ error: 'No autorizado' });

    const result = await query(`
      SELECT b.*, u.name as passenger_name, u.phone as passenger_phone, u.email as passenger_email
      FROM bookings b
      JOIN users u ON b.passenger_id = u.id
      WHERE b.ride_id = $1
      ORDER BY b.created_at ASC
    `, [req.params.id]);
    res.json(result.rows);
  } catch (err) {
    console.error('rides/:id/requests:', err);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
});

// Crear viaje
router.post('/', auth, async (req, res) => {
  const { origin, destination, date, time, seats, price, description, vehicle_type, is_recurring, days_of_week } = req.body;

  const missingFields = {};
  if (!origin?.trim())        missingFields.origin = true;
  if (!destination?.trim())   missingFields.destination = true;
  if (!time)                  missingFields.time = true;
  if (!seats || isNaN(Number(seats)) || Number(seats) < 1) missingFields.seats = true;
  if (price === undefined || price === null || price === '' || isNaN(Number(price))) missingFields.price = true;
  if (!is_recurring && !date) missingFields.date = true;
  if (is_recurring && (!days_of_week || days_of_week.length === 0)) missingFields.days_of_week = true;
  if (Object.keys(missingFields).length > 0)
    return res.status(400).json({ error: 'Completa los campos requeridos', fields: missingFields });

  try {
    const result = await query(`
      INSERT INTO rides (driver_id, origin, destination, date, time, seats, seats_available,
                         price, description, vehicle_type, is_recurring, days_of_week)
      VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12)
      RETURNING *
    `, [
      req.user.id, origin.trim(), destination.trim(),
      is_recurring ? null : (date || null),
      time, Number(seats), Number(seats), Number(price),
      description?.trim() || null,
      vehicle_type || 'car',
      is_recurring ? 1 : 0,
      days_of_week || null,
    ]);
    res.json(result.rows[0]);
  } catch (err) {
    console.error('rides POST:', err);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
});

// Editar viaje
router.put('/:id', auth, async (req, res) => {
  try {
    const rideRes = await query('SELECT * FROM rides WHERE id=$1', [req.params.id]);
    const ride = rideRes.rows[0];
    if (!ride) return res.status(404).json({ error: 'Viaje no encontrado' });
    if (ride.driver_id !== req.user.id) return res.status(403).json({ error: 'No autorizado' });
    if (ride.status !== 'active') return res.status(400).json({ error: 'No se puede editar un viaje cancelado' });

    const { origin, destination, date, time, seats, price, description, vehicle_type, is_recurring, days_of_week } = req.body;

    const missingFields = {};
    if (!origin?.trim())        missingFields.origin = true;
    if (!destination?.trim())   missingFields.destination = true;
    if (!time)                  missingFields.time = true;
    if (!seats || isNaN(Number(seats)) || Number(seats) < 1) missingFields.seats = true;
    if (price === undefined || price === null || price === '' || isNaN(Number(price))) missingFields.price = true;
    if (!is_recurring && !date) missingFields.date = true;
    if (Object.keys(missingFields).length > 0)
      return res.status(400).json({ error: 'Completa los campos requeridos', fields: missingFields });

    const confirmedRes = await query(
      "SELECT COALESCE(SUM(seats),0) as total FROM bookings WHERE ride_id=$1 AND status IN ('pending','confirmed')",
      [req.params.id]
    );
    const confirmedSeats = parseInt(confirmedRes.rows[0].total, 10);
    const newSeats = Number(seats);
    if (newSeats < confirmedSeats)
      return res.status(400).json({ error: `No puedes reducir los asientos por debajo de las reservas actuales (${confirmedSeats})` });

    const result = await query(`
      UPDATE rides
      SET origin=$1, destination=$2, date=$3, time=$4, seats=$5, seats_available=$6,
          price=$7, description=$8, vehicle_type=$9, is_recurring=$10, days_of_week=$11
      WHERE id=$12
      RETURNING *
    `, [
      origin.trim(), destination.trim(),
      is_recurring ? null : (date || null),
      time, newSeats, newSeats - confirmedSeats,
      Number(price), description?.trim() || null,
      vehicle_type || 'car', is_recurring ? 1 : 0, days_of_week || null,
      req.params.id,
    ]);
    res.json(result.rows[0]);
  } catch (err) {
    console.error('rides PUT:', err);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
});

// Cancelar viaje
router.delete('/:id', auth, async (req, res) => {
  try {
    const rideRes = await query('SELECT * FROM rides WHERE id=$1', [req.params.id]);
    const ride = rideRes.rows[0];
    if (!ride) return res.status(404).json({ error: 'Viaje no encontrado' });
    if (ride.driver_id !== req.user.id) return res.status(403).json({ error: 'No autorizado' });

    // Pasajeros con reservas activas para notificar
    const activeRes = await query(
      "SELECT id, passenger_id FROM bookings WHERE ride_id=$1 AND status IN ('pending','confirmed')",
      [req.params.id]
    );

    await query("UPDATE rides SET status='cancelled' WHERE id=$1", [req.params.id]);
    await query(
      "UPDATE bookings SET status='cancelled' WHERE ride_id=$1 AND status IN ('pending','confirmed')",
      [req.params.id]
    );

    for (const b of activeRes.rows) {
      await query(
        'INSERT INTO notifications (user_id, type, title, message, related_id) VALUES ($1,$2,$3,$4,$5)',
        [
          b.passenger_id, 'ride_cancelled',
          'Viaje cancelado',
          `El conductor canceló el viaje ${ride.origin} → ${ride.destination}. Tu reserva fue cancelada automáticamente.`,
          b.id,
        ]
      );
    }

    res.json({ message: 'Viaje cancelado' });
  } catch (err) {
    console.error('rides DELETE:', err);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
});

module.exports = router;
