const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const db = require('../db');

const router = express.Router();
const ALLOWED_DOMAIN = '@ucundinamarca.edu.co';

router.post('/register', (req, res) => {
  const { name, email, password, phone, role } = req.body;

  if (!name || !email || !password) {
    return res.status(400).json({ error: 'Nombre, email y contraseña son requeridos' });
  }
  if (typeof name !== 'string' || name.trim().length < 2 || name.length > 100) {
    return res.status(400).json({ error: 'Nombre debe tener entre 2 y 100 caracteres' });
  }
  if (typeof email !== 'string' || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return res.status(400).json({ error: 'Email inválido' });
  }
  if (typeof password !== 'string' || password.length < 6 || password.length > 200) {
    return res.status(400).json({ error: 'La contraseña debe tener entre 6 y 200 caracteres' });
  }
  if (phone && (typeof phone !== 'string' || !/^[+\d\s-]{7,20}$/.test(phone))) {
    return res.status(400).json({ error: 'Teléfono inválido' });
  }
  if (!email.toLowerCase().endsWith(ALLOWED_DOMAIN)) {
    return res.status(400).json({
      error: `Solo se permiten correos institucionales con dominio ${ALLOWED_DOMAIN}`,
    });
  }

  const hashed = bcrypt.hashSync(password, 10);
  try {
    const userRole = role === 'driver' ? 'driver' : 'passenger';
    const result = db.prepare(
      'INSERT INTO users (name, email, password, phone, role) VALUES (?, ?, ?, ?, ?)'
    ).run(name, email.toLowerCase(), hashed, phone || null, userRole);

    const token = jwt.sign(
      { id: result.lastInsertRowid, name, email: email.toLowerCase() },
      require('../middleware/auth').SECRET,
      { expiresIn: '7d' }
    );
    res.json({ token, user: { id: result.lastInsertRowid, name, email: email.toLowerCase(), phone, role: userRole } });
  } catch (err) {
    if (err.message.includes('UNIQUE')) {
      return res.status(400).json({ error: 'El email ya está registrado' });
    }
    res.status(500).json({ error: 'Error al registrar usuario' });
  }
});

router.post('/login', (req, res) => {
  const { email, password } = req.body;
  if (!email || !password) {
    return res.status(400).json({ error: 'Email y contraseña son requeridos' });
  }

  const user = db.prepare('SELECT * FROM users WHERE email = ?').get(email.toLowerCase());
  if (!user || !bcrypt.compareSync(password, user.password)) {
    return res.status(401).json({ error: 'Credenciales incorrectas' });
  }

  const token = jwt.sign(
    { id: user.id, name: user.name, email: user.email },
    require('../middleware/auth').SECRET,
    { expiresIn: '7d' }
  );
  res.json({
    token,
    user: { id: user.id, name: user.name, email: user.email, phone: user.phone, avatar: user.avatar, role: user.role },
  });
});

module.exports = router;
