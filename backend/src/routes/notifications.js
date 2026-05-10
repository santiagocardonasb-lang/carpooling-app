const express = require('express');
const { query } = require('../db');
const auth = require('../middleware/auth');

const router = express.Router();

router.get('/unread-count', auth, async (req, res) => {
  try {
    const result = await query(
      'SELECT COUNT(*) as count FROM notifications WHERE user_id=$1 AND read=0',
      [req.user.id]
    );
    res.json({ count: parseInt(result.rows[0].count, 10) });
  } catch (err) {
    console.error('notifs unread-count:', err);
    res.status(500).json({ error: 'Error interno' });
  }
});

router.get('/', auth, async (req, res) => {
  try {
    // Auto-borrado de notificaciones >7 días al leer la lista
    await query(
      "DELETE FROM notifications WHERE user_id=$1 AND created_at < NOW() - INTERVAL '7 days'",
      [req.user.id]
    );
    const result = await query(
      'SELECT * FROM notifications WHERE user_id=$1 ORDER BY created_at DESC LIMIT 50',
      [req.user.id]
    );
    res.json(result.rows);
  } catch (err) {
    console.error('notifs GET:', err);
    res.status(500).json({ error: 'Error interno' });
  }
});

router.patch('/read-all', auth, async (req, res) => {
  try {
    await query('UPDATE notifications SET read=1 WHERE user_id=$1', [req.user.id]);
    res.json({ ok: true });
  } catch (err) {
    console.error('notifs read-all:', err);
    res.status(500).json({ error: 'Error interno' });
  }
});

router.patch('/:id/read', auth, async (req, res) => {
  try {
    await query('UPDATE notifications SET read=1 WHERE id=$1 AND user_id=$2', [req.params.id, req.user.id]);
    res.json({ ok: true });
  } catch (err) {
    console.error('notifs read:', err);
    res.status(500).json({ error: 'Error interno' });
  }
});

// IMPORTANTE: /all DEBE ir antes de /:id para que Express no lo interprete como un id literal
router.delete('/all', auth, async (req, res) => {
  try {
    const result = await query('DELETE FROM notifications WHERE user_id=$1', [req.user.id]);
    res.json({ ok: true, deleted: result.rowCount });
  } catch (err) {
    console.error('notifs delete-all:', err);
    res.status(500).json({ error: 'Error interno' });
  }
});

router.delete('/', auth, async (req, res) => {
  try {
    const result = await query('DELETE FROM notifications WHERE user_id=$1', [req.user.id]);
    res.json({ ok: true, deleted: result.rowCount });
  } catch (err) {
    console.error('notifs delete-root:', err);
    res.status(500).json({ error: 'Error interno' });
  }
});

router.delete('/:id', auth, async (req, res) => {
  const id = parseInt(req.params.id, 10);
  if (!Number.isInteger(id)) return res.status(400).json({ error: 'ID inválido' });
  try {
    await query('DELETE FROM notifications WHERE id=$1 AND user_id=$2', [id, req.user.id]);
    res.json({ ok: true });
  } catch (err) {
    console.error('notifs delete-one:', err);
    res.status(500).json({ error: 'Error interno' });
  }
});

module.exports = router;
