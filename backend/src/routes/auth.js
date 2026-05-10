const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { query } = require('../db');

const router = express.Router();
const ALLOWED_DOMAIN = '@ucundinamarca.edu.co';

router.post('/register', async (req, res) => {
  const { name, email, password, phone, role } = req.body;

  if (!name || !email || !password)
    return res.status(400).json({ error: 'Nombre, email y contraseña son requeridos' });
  if (typeof name !== 'string' || name.trim().length < 2 || name.length > 100)
    return res.status(400).json({ error: 'Nombre debe tener entre 2 y 100 caracteres' });
  if (typeof email !== 'string' || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email))
    return res.status(400).json({ error: 'Email inválido' });
  if (typeof password !== 'string' || password.length < 6 || password.length > 200)
    return res.status(400).json({ error: 'La contraseña debe tener entre 6 y 200 caracteres' });
  if (phone && (typeof phone !== 'string' || !/^[+\d\s-]{7,20}$/.test(phone)))
    return res.status(400).json({ error: 'Teléfono inválido' });
  if (!email.toLowerCase().endsWith(ALLOWED_DOMAIN))
    return res.status(400).json({ error: `Solo se permiten correos institucionales con dominio ${ALLOWED_DOMAIN}` });

  try {
    const hashed = bcrypt.hashSync(password, 10);
    const userRole = role === 'driver' ? 'driver' : 'passenger';
    const result = await query(
      'INSERT INTO users (name, email, password, phone, role) VALUES ($1, $2, $3, $4, $5) RETURNING id',
      [name.trim(), email.toLowerCase(), hashed, phone || null, userRole]
    );
    const userId = result.rows[0].id;

    const token = jwt.sign(
      { id: userId, name: name.trim(), email: email.toLowerCase() },
      require('../middleware/auth').SECRET,
      { expiresIn: '7d' }
    );
    res.json({ token, user: { id: userId, name: name.trim(), email: email.toLowerCase(), phone, role: userRole } });
  } catch (err) {
    if (err.code === '23505')
      return res.status(400).json({ error: 'El email ya está registrado' });
    console.error('register error:', err);
    res.status(500).json({ error: 'Error al registrar usuario' });
  }
});

router.post('/login', async (req, res) => {
  const { email, password } = req.body;
  if (!email || !password)
    return res.status(400).json({ error: 'Email y contraseña son requeridos' });

  try {
    const result = await query('SELECT * FROM users WHERE email = $1', [email.toLowerCase()]);
    const user = result.rows[0];
    if (!user || !bcrypt.compareSync(password, user.password))
      return res.status(401).json({ error: 'Credenciales incorrectas' });

    const token = jwt.sign(
      { id: user.id, name: user.name, email: user.email },
      require('../middleware/auth').SECRET,
      { expiresIn: '7d' }
    );
    res.json({
      token,
      user: { id: user.id, name: user.name, email: user.email, phone: user.phone, avatar: user.avatar, role: user.role },
    });
  } catch (err) {
    console.error('login error:', err);
    res.status(500).json({ error: 'Error al iniciar sesión' });
  }
});

module.exports = router;
