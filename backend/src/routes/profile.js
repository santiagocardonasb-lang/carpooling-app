const express = require('express');
const bcrypt = require('bcryptjs');
const { query } = require('../db');
const auth = require('../middleware/auth');

const router = express.Router();

router.get('/', auth, async (req, res) => {
  try {
    const result = await query(
      'SELECT id, name, email, phone, avatar, role, car_brand, car_color, car_plate, created_at FROM users WHERE id = $1',
      [req.user.id]
    );
    const user = result.rows[0];
    if (!user) return res.status(404).json({ error: 'Usuario no encontrado' });

    const [drRes, paRes] = await Promise.all([
      query(
        "SELECT COUNT(*) as n FROM bookings WHERE ride_id IN (SELECT id FROM rides WHERE driver_id=$1) AND status='completed'",
        [req.user.id]
      ),
      query(
        "SELECT COUNT(*) as n FROM bookings WHERE passenger_id=$1 AND status='completed'",
        [req.user.id]
      ),
    ]);

    res.json({
      ...user,
      role: user.role || 'passenger',
      trips_as_driver:    parseInt(drRes.rows[0].n, 10),
      trips_as_passenger: parseInt(paRes.rows[0].n, 10),
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
  try {
    const result = await query(
      'UPDATE users SET car_brand=$1, car_color=$2, car_plate=$3 WHERE id=$4 RETURNING id, name, email, phone, avatar, car_brand, car_color, car_plate',
      [car_brand || null, car_color || null, car_plate || null, req.user.id]
    );
    res.json(result.rows[0]);
  } catch (err) {
    console.error('vehicle PUT:', err);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
});

router.put('/password', auth, async (req, res) => {
  const { current_password, new_password } = req.body;
  if (!current_password || !new_password)
    return res.status(400).json({ error: 'Contraseña actual y nueva son requeridas' });
  if (new_password.length < 6)
    return res.status(400).json({ error: 'La nueva contraseña debe tener al menos 6 caracteres' });

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
