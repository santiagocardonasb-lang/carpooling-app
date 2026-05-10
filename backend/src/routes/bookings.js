const express = require('express');
const { query, withTransaction } = require('../db');
const auth = require('../middleware/auth');

const router = express.Router();

// Reservas del pasajero autenticado
router.get('/my', auth, async (req, res) => {
  try {
    const result = await query(`
      SELECT b.*, r.origin, r.destination, r.date, r.time, r.price, r.is_recurring, r.days_of_week,
             u.name as driver_name, u.phone as driver_phone,
             u.car_brand, u.car_color, u.car_plate
      FROM bookings b
      JOIN rides r ON b.ride_id = r.id
      JOIN users u ON r.driver_id = u.id
      WHERE b.passenger_id = $1
      ORDER BY b.created_at DESC
    `, [req.user.id]);
    res.json(result.rows);
  } catch (err) {
    console.error('bookings my:', err);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
});

// Crear reserva — usa FOR UPDATE para evitar race conditions
router.post('/', auth, async (req, res) => {
  const { ride_id, seats, proposed_time, booking_date, booking_days } = req.body;
  const rideId = Number(ride_id);
  if (!Number.isInteger(rideId) || rideId <= 0)
    return res.status(400).json({ error: 'ride_id inválido' });
  const seatsRequested = Math.min(Math.max(parseInt(seats, 10) || 1, 1), 8);

  try {
    const booking = await withTransaction(async (client) => {
      const rideRes = await client.query('SELECT * FROM rides WHERE id=$1 FOR UPDATE', [rideId]);
      const ride = rideRes.rows[0];
      if (!ride)                                       throw { status: 404, message: 'Viaje no encontrado' };
      if (ride.status !== 'active')                    throw { status: 400, message: 'Viaje no disponible' };
      if (ride.driver_id === req.user.id)              throw { status: 400, message: 'No puedes solicitar tu propio viaje' };
      if (ride.seats_available < seatsRequested)       throw { status: 400, message: 'No hay suficientes asientos disponibles' };
      if (ride.is_recurring) {
        if (!booking_date) throw { status: 400, message: 'Debes seleccionar una fecha de inicio' };
        if (!booking_days) throw { status: 400, message: 'Debes seleccionar al menos un día' };
      }

      const existRes = await client.query(
        "SELECT id FROM bookings WHERE ride_id=$1 AND passenger_id=$2 AND status IN ('pending','confirmed')",
        [rideId, req.user.id]
      );
      if (existRes.rows[0]) throw { status: 400, message: 'Ya tienes una solicitud activa en este viaje' };

      await client.query('UPDATE rides SET seats_available=seats_available-$1 WHERE id=$2', [seatsRequested, rideId]);

      const bRes = await client.query(`
        INSERT INTO bookings (ride_id, passenger_id, seats, proposed_time, booking_date, booking_days, status)
        VALUES ($1,$2,$3,$4,$5,$6,'pending')
        RETURNING *
      `, [rideId, req.user.id, seatsRequested, proposed_time || null, booking_date || null, booking_days || null]);

      // Guardamos ride para notificación fuera de la transacción
      client._rideForNotif = ride;
      return bRes.rows[0];
    });

    // Notificación al conductor (fuera de la transacción)
    const passengerRes = await query('SELECT name FROM users WHERE id=$1', [req.user.id]);
    const ride = await query('SELECT * FROM rides WHERE id=$1', [rideId]).then(r => r.rows[0]);
    await query(
      'INSERT INTO notifications (user_id, type, title, message, related_id) VALUES ($1,$2,$3,$4,$5)',
      [ride.driver_id, 'booking_request', 'Nueva solicitud de viaje',
       `${passengerRes.rows[0].name} quiere reservar tu viaje ${ride.origin} → ${ride.destination}.`, booking.id]
    );

    res.json(booking);
  } catch (e) {
    if (e.status) return res.status(e.status).json({ error: e.message });
    console.error('booking POST:', e);
    res.status(500).json({ error: 'Error al crear la reserva' });
  }
});

// Conductor acepta reserva
router.patch('/:id/accept', auth, async (req, res) => {
  try {
    const bRes = await query('SELECT * FROM bookings WHERE id=$1', [req.params.id]);
    const booking = bRes.rows[0];
    if (!booking) return res.status(404).json({ error: 'Solicitud no encontrada' });

    const rideRes = await query('SELECT * FROM rides WHERE id=$1', [booking.ride_id]);
    const ride = rideRes.rows[0];
    if (!ride || ride.driver_id !== req.user.id) return res.status(403).json({ error: 'No autorizado' });
    if (booking.status !== 'pending') return res.status(400).json({ error: 'Solo se pueden aceptar solicitudes pendientes' });

    await query("UPDATE bookings SET status='confirmed' WHERE id=$1", [req.params.id]);
    await query(
      'INSERT INTO notifications (user_id, type, title, message, related_id) VALUES ($1,$2,$3,$4,$5)',
      [booking.passenger_id, 'booking_accepted', '¡Reserva confirmada!',
       `Tu reserva en ${ride.origin} → ${ride.destination} fue confirmada por el conductor.`, booking.id]
    );
    res.json({ message: 'Solicitud aceptada' });
  } catch (err) {
    console.error('accept:', err);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
});

// Conductor rechaza reserva — devuelve asientos
router.patch('/:id/reject', auth, async (req, res) => {
  try {
    const bRes = await query('SELECT * FROM bookings WHERE id=$1', [req.params.id]);
    const booking = bRes.rows[0];
    if (!booking) return res.status(404).json({ error: 'Solicitud no encontrada' });

    const rideRes = await query('SELECT * FROM rides WHERE id=$1', [booking.ride_id]);
    const ride = rideRes.rows[0];
    if (!ride || ride.driver_id !== req.user.id) return res.status(403).json({ error: 'No autorizado' });
    if (booking.status !== 'pending') return res.status(400).json({ error: 'Solo se pueden rechazar solicitudes pendientes' });

    await withTransaction(async (client) => {
      await client.query("UPDATE bookings SET status='rejected' WHERE id=$1", [req.params.id]);
      await client.query('UPDATE rides SET seats_available=seats_available+$1 WHERE id=$2', [booking.seats, booking.ride_id]);
    });

    await query(
      'INSERT INTO notifications (user_id, type, title, message, related_id) VALUES ($1,$2,$3,$4,$5)',
      [booking.passenger_id, 'booking_rejected', 'Reserva no confirmada',
       `El conductor no pudo aceptar tu reserva en ${ride.origin} → ${ride.destination}.`, booking.id]
    );
    res.json({ message: 'Solicitud rechazada' });
  } catch (err) {
    console.error('reject:', err);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
});

// Conductor inicia el viaje
router.patch('/:id/start', auth, async (req, res) => {
  try {
    const bRes = await query('SELECT * FROM bookings WHERE id=$1', [req.params.id]);
    const booking = bRes.rows[0];
    if (!booking) return res.status(404).json({ error: 'Reserva no encontrada' });

    const rideRes = await query('SELECT * FROM rides WHERE id=$1', [booking.ride_id]);
    const ride = rideRes.rows[0];
    if (!ride || ride.driver_id !== req.user.id) return res.status(403).json({ error: 'No autorizado' });
    if (booking.status !== 'confirmed') return res.status(400).json({ error: 'Solo se inician viajes confirmados' });

    await query("UPDATE bookings SET status='in_progress', started_at=NOW() WHERE id=$1", [req.params.id]);
    await query(
      'INSERT INTO notifications (user_id, type, title, message, related_id) VALUES ($1,$2,$3,$4,$5)',
      [booking.passenger_id, 'booking_started', '🚗 Viaje iniciado',
       `El conductor inició el viaje ${ride.origin} → ${ride.destination}. ¡Buen viaje!`, booking.id]
    );
    res.json({ message: 'Viaje iniciado' });
  } catch (err) {
    console.error('start:', err);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
});

// Conductor finaliza el viaje
router.patch('/:id/complete', auth, async (req, res) => {
  try {
    const bRes = await query('SELECT * FROM bookings WHERE id=$1', [req.params.id]);
    const booking = bRes.rows[0];
    if (!booking) return res.status(404).json({ error: 'Reserva no encontrada' });

    const rideRes = await query('SELECT * FROM rides WHERE id=$1', [booking.ride_id]);
    const ride = rideRes.rows[0];
    if (!ride || ride.driver_id !== req.user.id) return res.status(403).json({ error: 'No autorizado' });
    if (!['in_progress', 'confirmed'].includes(booking.status))
      return res.status(400).json({ error: 'Solo se completan viajes en curso o confirmados' });

    await withTransaction(async (client) => {
      await client.query("UPDATE bookings SET status='completed', completed_at=NOW() WHERE id=$1", [req.params.id]);
      await client.query('UPDATE rides SET seats_available=seats_available+$1 WHERE id=$2', [booking.seats, booking.ride_id]);
    });

    await query(
      'INSERT INTO notifications (user_id, type, title, message, related_id) VALUES ($1,$2,$3,$4,$5)',
      [booking.passenger_id, 'booking_completed', 'Viaje completado',
       `Tu viaje ${ride.origin} → ${ride.destination} fue completado. ¡Califica al conductor!`, booking.id]
    );
    res.json({ message: 'Viaje completado' });
  } catch (err) {
    console.error('complete:', err);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
});

// Pasajero cancela una fecha de viaje recurrente
router.patch('/:id/cancel-date', auth, async (req, res) => {
  const { date } = req.body;
  if (!date || !/^\d{4}-\d{2}-\d{2}$/.test(date))
    return res.status(400).json({ error: 'Fecha inválida' });

  try {
    const bRes = await query('SELECT * FROM bookings WHERE id=$1', [req.params.id]);
    const booking = bRes.rows[0];
    if (!booking) return res.status(404).json({ error: 'Reserva no encontrada' });
    if (booking.passenger_id !== req.user.id) return res.status(403).json({ error: 'No autorizado' });
    if (!['pending', 'confirmed'].includes(booking.status)) return res.status(400).json({ error: 'No aplica' });

    let cancelled = [];
    try { cancelled = booking.cancelled_dates ? JSON.parse(booking.cancelled_dates) : []; } catch {}
    if (!cancelled.includes(date)) cancelled.push(date);

    await query('UPDATE bookings SET cancelled_dates=$1 WHERE id=$2', [JSON.stringify(cancelled), req.params.id]);
    res.json({ ok: true, cancelled_dates: cancelled });
  } catch (err) {
    console.error('cancel-date:', err);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
});

// Pasajero pide X minutos de espera
router.patch('/:id/passenger-delay', auth, async (req, res) => {
  const minutes = parseInt(req.body?.minutes, 10);
  if (![5, 10].includes(minutes))
    return res.status(400).json({ error: 'Tiempo inválido (5 o 10 minutos)' });

  try {
    const bRes = await query('SELECT * FROM bookings WHERE id=$1', [req.params.id]);
    const booking = bRes.rows[0];
    if (!booking) return res.status(404).json({ error: 'Reserva no encontrada' });
    if (booking.passenger_id !== req.user.id) return res.status(403).json({ error: 'No autorizado' });
    if (!['confirmed', 'in_progress'].includes(booking.status)) return res.status(400).json({ error: 'No aplica' });

    const [rideRes, passengerRes] = await Promise.all([
      query('SELECT * FROM rides WHERE id=$1', [booking.ride_id]),
      query('SELECT name FROM users WHERE id=$1', [req.user.id]),
    ]);
    const ride = rideRes.rows[0];
    const passenger = passengerRes.rows[0];

    await query(
      'INSERT INTO notifications (user_id, type, title, message, related_id) VALUES ($1,$2,$3,$4,$5)',
      [ride.driver_id, 'passenger_delay', `⏰ ${passenger.name} pide ${minutes} min`,
       `${passenger.name} pide ${minutes} minutos de espera para llegar al punto de recogida en ${ride.origin}.`, booking.id]
    );
    res.json({ ok: true });
  } catch (err) {
    console.error('passenger-delay:', err);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
});

// Pasajero rechaza inicio del viaje (cancela reserva incluso si in_progress)
router.patch('/:id/passenger-decline', auth, async (req, res) => {
  try {
    const bRes = await query('SELECT * FROM bookings WHERE id=$1', [req.params.id]);
    const booking = bRes.rows[0];
    if (!booking) return res.status(404).json({ error: 'Reserva no encontrada' });
    if (booking.passenger_id !== req.user.id) return res.status(403).json({ error: 'No autorizado' });
    if (!['confirmed', 'in_progress'].includes(booking.status)) return res.status(400).json({ error: 'No aplica' });

    const [rideRes, passengerRes] = await Promise.all([
      query('SELECT * FROM rides WHERE id=$1', [booking.ride_id]),
      query('SELECT name FROM users WHERE id=$1', [req.user.id]),
    ]);
    const ride = rideRes.rows[0];
    const passenger = passengerRes.rows[0];

    await withTransaction(async (client) => {
      await client.query("UPDATE bookings SET status='cancelled' WHERE id=$1", [booking.id]);
      await client.query('UPDATE rides SET seats_available=seats_available+$1 WHERE id=$2', [booking.seats, booking.ride_id]);
    });

    await query(
      'INSERT INTO notifications (user_id, type, title, message, related_id) VALUES ($1,$2,$3,$4,$5)',
      [ride.driver_id, 'passenger_declined', '❌ Pasajero canceló',
       `${passenger.name} canceló su reserva en ${ride.origin} → ${ride.destination}.`, booking.id]
    );
    res.json({ ok: true });
  } catch (err) {
    console.error('passenger-decline:', err);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
});

// Pasajero señala que está listo (solo una vez por reserva)
router.patch('/:id/passenger-ready', auth, async (req, res) => {
  try {
    const bRes = await query('SELECT * FROM bookings WHERE id=$1', [req.params.id]);
    const booking = bRes.rows[0];
    if (!booking) return res.status(404).json({ error: 'Reserva no encontrada' });
    if (booking.passenger_id !== req.user.id) return res.status(403).json({ error: 'No autorizado' });
    if (booking.status !== 'confirmed') return res.status(400).json({ error: 'El viaje debe estar confirmado' });
    if (booking.passenger_ready) return res.status(400).json({ error: 'Ya notificaste al conductor que estás listo' });

    const [rideRes, passengerRes] = await Promise.all([
      query('SELECT * FROM rides WHERE id=$1', [booking.ride_id]),
      query('SELECT name FROM users WHERE id=$1', [req.user.id]),
    ]);
    const ride = rideRes.rows[0];
    const passenger = passengerRes.rows[0];

    await query('UPDATE bookings SET passenger_ready=1 WHERE id=$1', [booking.id]);
    await query(
      'INSERT INTO notifications (user_id, type, title, message, related_id) VALUES ($1,$2,$3,$4,$5)',
      [ride.driver_id, 'passenger_ready', '✅ Pasajero listo',
       `${passenger.name} ya está listo y puede adelantar la salida.`, booking.id]
    );
    res.json({ ok: true });
  } catch (err) {
    console.error('passenger-ready:', err);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
});

// Pasajero cancela su reserva
router.delete('/:id', auth, async (req, res) => {
  try {
    const bRes = await query('SELECT * FROM bookings WHERE id=$1', [req.params.id]);
    const booking = bRes.rows[0];
    if (!booking) return res.status(404).json({ error: 'Reserva no encontrada' });
    if (booking.passenger_id !== req.user.id) return res.status(403).json({ error: 'No autorizado' });
    if (!['pending', 'confirmed'].includes(booking.status))
      return res.status(400).json({ error: 'No se puede cancelar esta reserva' });

    await withTransaction(async (client) => {
      await client.query("UPDATE bookings SET status='cancelled' WHERE id=$1", [req.params.id]);
      await client.query('UPDATE rides SET seats_available=seats_available+$1 WHERE id=$2', [booking.seats, booking.ride_id]);
    });

    res.json({ message: 'Reserva cancelada' });
  } catch (err) {
    console.error('booking DELETE:', err);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
});

// Conductor actualiza su ubicación GPS en tiempo real
router.patch('/:id/location', auth, async (req, res) => {
  const { lat, lng } = req.body;
  if (typeof lat !== 'number' || typeof lng !== 'number')
    return res.status(400).json({ error: 'Coordenadas inválidas' });
  if (lat < -90 || lat > 90 || lng < -180 || lng > 180)
    return res.status(400).json({ error: 'Coordenadas fuera de rango' });

  try {
    const bRes = await query(`
      SELECT b.*, r.driver_id FROM bookings b
      JOIN rides r ON b.ride_id = r.id WHERE b.id = $1
    `, [req.params.id]);
    const booking = bRes.rows[0];
    if (!booking) return res.status(404).json({ error: 'Reserva no encontrada' });
    if (booking.driver_id !== req.user.id) return res.status(403).json({ error: 'No autorizado' });
    if (booking.status !== 'in_progress') return res.status(400).json({ error: 'El viaje no está en curso' });

    await query(
      'UPDATE bookings SET driver_lat=$1, driver_lng=$2 WHERE id=$3',
      [lat, lng, req.params.id]
    );
    res.json({ ok: true });
  } catch (err) {
    console.error('location patch:', err);
    res.status(500).json({ error: 'Error interno' });
  }
});

// Vista consolidada para pantalla de viaje en curso / calificación
router.get('/:id/trip-view', auth, async (req, res) => {
  const id = parseInt(req.params.id, 10);
  if (!Number.isInteger(id)) return res.status(400).json({ error: 'ID inválido' });

  try {
    const dataRes = await query(`
      SELECT b.id, b.status, b.seats, b.proposed_time, b.booking_date, b.booking_days,
             b.started_at, b.completed_at, b.passenger_id,
             b.driver_lat, b.driver_lng,
             r.id as ride_id, r.origin, r.destination, r.date, r.time, r.price,
             r.is_recurring, r.days_of_week, r.driver_id, r.vehicle_type, r.description,
             ud.name as driver_name, ud.phone as driver_phone, ud.avatar as driver_avatar,
             ud.car_brand, ud.car_color, ud.car_plate,
             up.name as passenger_name, up.phone as passenger_phone, up.avatar as passenger_avatar
      FROM bookings b
      JOIN rides r ON b.ride_id = r.id
      JOIN users ud ON r.driver_id = ud.id
      JOIN users up ON b.passenger_id = up.id
      WHERE b.id = $1
    `, [id]);
    const data = dataRes.rows[0];

    if (!data) return res.status(404).json({ error: 'Reserva no encontrada' });
    if (data.passenger_id !== req.user.id && data.driver_id !== req.user.id)
      return res.status(403).json({ error: 'No autorizado' });

    const [drRatRes, paRatRes, myRatRes] = await Promise.all([
      query('SELECT COALESCE(AVG(rating),0) as avg, COUNT(*) as count FROM ratings WHERE ratee_id=$1', [data.driver_id]),
      query('SELECT COALESCE(AVG(rating),0) as avg, COUNT(*) as count FROM ratings WHERE ratee_id=$1', [data.passenger_id]),
      query('SELECT id, rating, comment FROM ratings WHERE booking_id=$1 AND rater_id=$2', [id, req.user.id]),
    ]);
    const dr = drRatRes.rows[0];
    const pa = paRatRes.rows[0];
    const myRating = myRatRes.rows[0];

    res.json({
      booking: {
        id: data.id, status: data.status, seats: data.seats,
        proposed_time: data.proposed_time, booking_date: data.booking_date,
        booking_days: data.booking_days, started_at: data.started_at,
        completed_at: data.completed_at,
        driver_lat: data.driver_lat ?? null,
        driver_lng: data.driver_lng ?? null,
      },
      ride: {
        id: data.ride_id, origin: data.origin, destination: data.destination,
        date: data.date, time: data.time, price: data.price,
        is_recurring: data.is_recurring, days_of_week: data.days_of_week,
        vehicle_type: data.vehicle_type, description: data.description,
      },
      driver: {
        id: data.driver_id, name: data.driver_name, phone: data.driver_phone,
        avatar: data.driver_avatar, car_brand: data.car_brand,
        car_color: data.car_color, car_plate: data.car_plate,
        rating: Math.round(parseFloat(dr.avg) * 10) / 10,
        rating_count: parseInt(dr.count, 10),
      },
      passenger: {
        id: data.passenger_id, name: data.passenger_name,
        phone: data.passenger_phone, avatar: data.passenger_avatar,
        rating: Math.round(parseFloat(pa.avg) * 10) / 10,
        rating_count: parseInt(pa.count, 10),
      },
      my_role: data.driver_id === req.user.id ? 'driver' : 'passenger',
      already_rated: !!myRating,
    });
  } catch (err) {
    console.error('trip-view:', err);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
});

module.exports = router;
