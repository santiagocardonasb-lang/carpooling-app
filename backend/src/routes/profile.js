const express = require('express');
const bcrypt = require('bcryptjs');
const { query } = require('../db');
const auth = require('../middleware/auth');
const { validatePassword, normalizePlate, isValidPlate } = require('../utils/validation');

const router = express.Router();

router.get('/', auth, async (req, res) => {
  try {
    const result = await query(
      'SELECT id, name, email, phone, avatar, role, car_brand, car_color, car_plate, created_at FROM users WHERE id = $1',
      [req.user.id]
    );
    const user = result.rows[0];
    if (!user) return res.status(404).json({ error: 'Usuario no encontrado' });

    const [drRes, paRes, cancelRes] = await Promise.all([
      query(
        "SELECT COUNT(*) as n FROM bookings WHERE ride_id IN (SELECT id FROM rides WHERE driver_id=$1) AND status='completed'",
        [req.user.id]
      ),
      query(
        "SELECT COUNT(*) as n FROM bookings WHERE passenger_id=$1 AND status='completed'",
        [req.user.id]
      ),
      // Cancelaciones propias, separando las de última hora. Se le muestran
      // solo al dueño de la cuenta: sirven para corregirse, no para señalar.
      query(`
        SELECT
          COUNT(*)::int AS total,
          COUNT(*) FILTER (WHERE cancel_notice_hours IS NOT NULL AND cancel_notice_hours < 2)::int AS late
        FROM bookings b
        LEFT JOIN rides r ON b.ride_id = r.id
        WHERE b.cancelled_by IS NOT NULL AND b.cancelled_by <> 'system'
          AND ((b.cancelled_by = 'driver'    AND r.driver_id = $1)
            OR (b.cancelled_by = 'passenger' AND b.passenger_id = $1))
      `, [req.user.id]),
    ]);

    res.json({
      ...user,
      role: user.role || 'passenger',
      trips_as_driver:    parseInt(drRes.rows[0].n, 10),
      trips_as_passenger: parseInt(paRes.rows[0].n, 10),
      cancellations:      cancelRes.rows[0].total,
      late_cancellations: cancelRes.rows[0].late,
    });
  } catch (err) {
    console.error('profile GET:', err);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
});

router.put('/', auth, async (req, res) => {
  const { name, phone } = req.body;
  if (!name) return res.status(400).json({ error: 'El nombre es requerido' });
  try {
    const result = await query(
      'UPDATE users SET name=$1, phone=$2 WHERE id=$3 RETURNING id, name, email, phone, avatar, car_brand, car_color, car_plate',
      [name, phone || null, req.user.id]
    );
    res.json(result.rows[0]);
  } catch (err) {
    console.error('profile PUT:', err);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
});

router.put('/vehicle', auth, async (req, res) => {
  const { car_brand, car_color, car_plate } = req.body;

  // Normalizar igual que el frontend, para que "abc 123" y "ABC123" sean
  // la misma placa y la comparación de duplicados no se escape por formato.
  const plate = normalizePlate(car_plate);

  if (plate && !isValidPlate(plate))
    return res.status(400).json({ error: 'Formato de placa inválido. Usa LLLNNN (ej. ABC123) o LLLNNL (ej. ABC12D)' });

  try {
    // Una placa pertenece a un solo conductor.
    if (plate) {
      const dup = await query(
        'SELECT id FROM users WHERE car_plate = $1 AND id <> $2',
        [plate, req.user.id]
      );
      if (dup.rows[0])
        return res.status(409).json({ error: 'Esa placa ya está registrada por otro conductor' });
    }

    const result = await query(
      'UPDATE users SET car_brand=$1, car_color=$2, car_plate=$3 WHERE id=$4 RETURNING id, name, email, phone, avatar, car_brand, car_color, car_plate',
      [car_brand || null, car_color || null, plate || null, req.user.id]
    );
    res.json(result.rows[0]);
  } catch (err) {
    // Respaldo del índice único, por si dos conductores guardan a la vez.
    if (err.code === '23505')
      return res.status(409).json({ error: 'Esa placa ya está registrada por otro conductor' });
    console.error('vehicle PUT:', err);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
});

router.put('/password', auth, async (req, res) => {
  const { current_password, new_password } = req.body;
  if (!current_password || !new_password)
    return res.status(400).json({ error: 'Contraseña actual y nueva son requeridas' });
  const pwError = validatePassword(new_password);
  if (pwError) return res.status(400).json({ error: pwError });

  try {
    const result = await query('SELECT * FROM users WHERE id=$1', [req.user.id]);
    const user = result.rows[0];
    if (!bcrypt.compareSync(current_password, user.password))
      return res.status(400).json({ error: 'La contraseña actual es incorrecta' });

    const hashed = bcrypt.hashSync(new_password, 10);
    await query('UPDATE users SET password=$1 WHERE id=$2', [hashed, req.user.id]);
    res.json({ message: 'Contraseña actualizada' });
  } catch (err) {
    console.error('password PUT:', err);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
});

router.put('/role', auth, async (req, res) => {
  const { role } = req.body;
  if (!['driver', 'passenger'].includes(role))
    return res.status(400).json({ error: 'Rol inválido' });
  try {
    await query('UPDATE users SET role=$1 WHERE id=$2', [role, req.user.id]);
    res.json({ role });
  } catch (err) {
    console.error('role PUT:', err);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
});

router.put('/avatar', auth, async (req, res) => {
  const { avatar } = req.body;
  if (!avatar) return res.status(400).json({ error: 'Avatar requerido' });
  if (avatar.length > 2_800_000)
    return res.status(400).json({ error: 'La imagen es demasiado grande (máx. 2MB)' });
  if (!avatar.startsWith('data:image/'))
    return res.status(400).json({ error: 'Formato de imagen inválido' });

  try {
    await query('UPDATE users SET avatar=$1 WHERE id=$2', [avatar, req.user.id]);
    res.json({ avatar });
  } catch (err) {
    console.error('avatar PUT:', err);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
});

module.exports = router;
