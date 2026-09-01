const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const { query } = require('../db');
const { sendResetCode } = require('../services/email');

const router = express.Router();
const ALLOWED_DOMAIN = '@ucundinamarca.edu.co';

// ── Reglas de contraseña (deben coincidir con frontend/src/utils/password.ts) ──
function validatePassword(pw) {
  if (typeof pw !== 'string' || pw.length < 6 || pw.length > 200)
    return 'La contraseña debe tener entre 6 y 200 caracteres';
  if (!/\d/.test(pw))
    return 'La contraseña debe incluir al menos un número';
  return null;
}

// ── Parámetros de la recuperación por código ──
const CODE_TTL_MIN     = 10; // minutos que vive el código
const MAX_ATTEMPTS     = 5;  // intentos por código antes de invalidarlo
const MAX_CODES_PER_HR = 3;  // códigos que un usuario puede pedir por hora

router.post('/register', async (req, res) => {
  const { name, email, password, phone, role } = req.body;

  if (!name || !email || !password)
    return res.status(400).json({ error: 'Nombre, email y contraseña son requeridos' });
  if (typeof name !== 'string' || name.trim().length < 2 || name.length > 100)
    return res.status(400).json({ error: 'Nombre debe tener entre 2 y 100 caracteres' });
  if (typeof email !== 'string' || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email))
    return res.status(400).json({ error: 'Email inválido' });
  const pwError = validatePassword(password);
  if (pwError) return res.status(400).json({ error: pwError });
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

// ─────────────────────────────────────────────────────────────────────────────
// Recuperación de contraseña: pedir código → verificarlo → cambiar contraseña
// ─────────────────────────────────────────────────────────────────────────────

// Paso 1: pedir el código.
// Siempre responde ok, exista o no el correo, para que nadie pueda usar este
// endpoint como directorio de quién está registrado.
router.post('/forgot-password', async (req, res) => {
  const { email } = req.body;
  const ok = { ok: true, message: 'Te enviamos un código a tu correo.' };

  if (typeof email !== 'string' || !email.trim())
    return res.status(400).json({ error: 'Escribe tu correo institucional' });
  const mail = email.trim().toLowerCase();

  try {
    const userRes = await query('SELECT id, name FROM users WHERE email = $1', [mail]);
    const user = userRes.rows[0];
    // Decidimos avisar cuando el correo no existe. Lo estándar es callarlo para
    // que nadie averigüe quién está registrado, pero aquí los correos son
    // institucionales y predecibles, así que esconderlo no protege gran cosa y
    // en cambio deja al usuario esperando un código que nunca va a llegar.
    if (!user)
      return res.status(404).json({ error: 'Ese correo no está registrado. Revisa que esté bien escrito.' });

    // Tope de códigos por hora, para que nadie use esto como bomba de correos.
    const recentRes = await query(
      "SELECT COUNT(*)::int AS n FROM password_resets WHERE user_id = $1 AND created_at > NOW() - INTERVAL '1 hour'",
      [user.id]
    );
    if (recentRes.rows[0].n >= MAX_CODES_PER_HR) {
      return res.status(429).json({ error: 'Pediste demasiados códigos. Espera una hora e intenta de nuevo.' });
    }

    // Invalidar los códigos anteriores: solo el más reciente sirve.
    await query('UPDATE password_resets SET used = TRUE WHERE user_id = $1 AND used = FALSE', [user.id]);

    // randomInt es criptográficamente seguro (Math.random no lo es).
    const code = String(crypto.randomInt(0, 10000)).padStart(4, '0');
    const codeHash = bcrypt.hashSync(code, 10);

    await query(
      `INSERT INTO password_resets (user_id, code_hash, expires_at)
       VALUES ($1, $2, NOW() + ($3 || ' minutes')::interval)`,
      [user.id, codeHash, String(CODE_TTL_MIN)]
    );

    const sent = await sendResetCode(mail, user.name, code);
    if (!sent) {
      return res.status(502).json({ error: 'No pudimos enviar el correo. Intenta más tarde.' });
    }
    res.json(ok);
  } catch (err) {
    // 42P01 = falta la tabla password_resets (no se corrió la migración).
    // Sin esto el error salía como un 500 genérico imposible de diagnosticar.
    if (err.code === '42P01') {
      console.error('forgot-password: falta la tabla password_resets. Corre supabase/password_resets.sql');
      return res.status(503).json({ error: 'La recuperación de contraseña aún no está habilitada. Avisa al administrador.' });
    }
    console.error('forgot-password:', err);
    res.status(500).json({ error: 'Error al procesar la solicitud' });
  }
});

// Paso 2: verificar el código. Devuelve un token de un solo uso.
router.post('/verify-reset-code', async (req, res) => {
  const { email, code } = req.body;
  const invalid = { error: 'Código incorrecto o vencido' };

  if (typeof email !== 'string' || typeof code !== 'string')
    return res.status(400).json(invalid);

  try {
    const userRes = await query('SELECT id FROM users WHERE email = $1', [email.trim().toLowerCase()]);
    const user = userRes.rows[0];
    if (!user) return res.status(400).json(invalid);

    const prRes = await query(
      `SELECT * FROM password_resets
       WHERE user_id = $1 AND used = FALSE AND expires_at > NOW()
       ORDER BY created_at DESC LIMIT 1`,
      [user.id]
    );
    const pr = prRes.rows[0];
    if (!pr) return res.status(400).json(invalid);

    if (pr.attempts >= MAX_ATTEMPTS) {
      await query('UPDATE password_resets SET used = TRUE WHERE id = $1', [pr.id]);
      return res.status(400).json({ error: 'Demasiados intentos. Pide un código nuevo.' });
    }

    if (!bcrypt.compareSync(code.trim(), pr.code_hash)) {
      const attRes = await query(
        'UPDATE password_resets SET attempts = attempts + 1 WHERE id = $1 RETURNING attempts',
        [pr.id]
      );
      const left = MAX_ATTEMPTS - attRes.rows[0].attempts;
      return res.status(400).json({
        error: left > 0
          ? `Código incorrecto. Te ${left === 1 ? 'queda 1 intento' : `quedan ${left} intentos`}.`
          : 'Demasiados intentos. Pide un código nuevo.',
      });
    }

    // Código correcto: entregamos un token de un solo uso para el paso 3.
    const token = crypto.randomBytes(32).toString('hex');
    await query('UPDATE password_resets SET token = $1 WHERE id = $2', [token, pr.id]);
    res.json({ token });
  } catch (err) {
    console.error('verify-reset-code:', err);
    res.status(500).json({ error: 'Error al verificar el código' });
  }
});

// Paso 3: cambiar la contraseña usando el token del paso 2.
router.post('/reset-password', async (req, res) => {
  const { token, new_password } = req.body;

  if (typeof token !== 'string' || !token)
    return res.status(400).json({ error: 'Token inválido' });

  const pwError = validatePassword(new_password);
  if (pwError) return res.status(400).json({ error: pwError });

  try {
    const prRes = await query(
      'SELECT * FROM password_resets WHERE token = $1 AND used = FALSE AND expires_at > NOW()',
      [token]
    );
    const pr = prRes.rows[0];
    if (!pr) return res.status(400).json({ error: 'La sesión de recuperación venció. Empieza de nuevo.' });

    const hashed = bcrypt.hashSync(new_password, 10);
    await query('UPDATE users SET password = $1 WHERE id = $2', [hashed, pr.user_id]);
    // Quemar el token y cualquier otro código pendiente del usuario.
    await query('UPDATE password_resets SET used = TRUE WHERE user_id = $1', [pr.user_id]);

    res.json({ ok: true, message: 'Contraseña actualizada. Ya puedes iniciar sesión.' });
  } catch (err) {
    console.error('reset-password:', err);
    res.status(500).json({ error: 'Error al cambiar la contraseña' });
  }
});

module.exports = router;
