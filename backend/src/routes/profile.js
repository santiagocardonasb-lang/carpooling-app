const express = require('express');
const bcrypt = require('bcryptjs');
const db = require('../db');
const auth = require('../middleware/auth');

const router = express.Router();

router.get('/', auth, (req, res) => {
  const user = db.prepare('SELECT id, name, email, phone, avatar, role, car_brand, car_color, car_plate, created_at FROM users WHERE id = ?').get(req.user.id);
  if (!user) return res.status(404).json({ error: 'Usuario no encontrado' });
  res.json({ ...user, role: user.role || 'passenger' });
});

router.put('/', auth, (req, res) => {
  const { name, phone } = req.body;
  if (!name) return res.status(400).json({ error: 'El nombre es requerido' });

  db.prepare('UPDATE users SET name = ?, phone = ? WHERE id = ?')
    .run(name, phone || null, req.user.id);
  const user = db.prepare('SELECT id, name, email, phone, avatar, car_brand, car_color, car_plate FROM users WHERE id = ?').get(req.user.id);
  res.json(user);
});

router.put('/vehicle', auth, (req, res) => {
  const { car_brand, car_color, car_plate } = req.body;
  db.prepare('UPDATE users SET car_brand = ?, car_color = ?, car_plate = ? WHERE id = ?')
    .run(car_brand || null, car_color || null, car_plate || null, req.user.id);
  const user = db.prepare('SELECT id, name, email, phone, avatar, car_brand, car_color, car_plate FROM users WHERE id = ?').get(req.user.id);
  res.json(user);
});

router.put('/password', auth, (req, res) => {
  const { current_password, new_password } = req.body;
  if (!current_password || !new_password) {
    return res.status(400).json({ error: 'Contraseña actual y nueva son requeridas' });
  }
  if (new_password.length < 6) {
    return res.status(400).json({ error: 'La nueva contraseña debe tener al menos 6 caracteres' });
  }

  const user = db.prepare('SELECT * FROM users WHERE id = ?').get(req.user.id);
  if (!bcrypt.compareSync(current_password, user.password)) {
    return res.status(400).json({ error: 'La contraseña actual es incorrecta' });
  }

  const hashed = bcrypt.hashSync(new_password, 10);
  db.prepare('UPDATE users SET password = ? WHERE id = ?').run(hashed, req.user.id);
  res.json({ message: 'Contraseña actualizada' });
});

router.put('/role', auth, (req, res) => {
  const { role } = req.body;
  if (!['driver', 'passenger'].includes(role)) {
    return res.status(400).json({ error: 'Rol inválido' });
  }
  db.prepare('UPDATE users SET role = ? WHERE id = ?').run(role, req.user.id);
  res.json({ role });
});

router.put('/avatar', auth, (req, res) => {
  const { avatar } = req.body;
  if (!avatar) return res.status(400).json({ error: 'Avatar requerido' });

  // Validate base64 image (max ~2MB)
  if (avatar.length > 2_800_000) {
    return res.status(400).json({ error: 'La imagen es demasiado grande (máx. 2MB)' });
  }
  if (!avatar.startsWith('data:image/')) {
    return res.status(400).json({ error: 'Formato de imagen inválido' });
  }

  db.prepare('UPDATE users SET avatar = ? WHERE id = ?').run(avatar, req.user.id);
  res.json({ avatar });
});

module.exports = router;
