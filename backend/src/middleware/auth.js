const jwt = require('jsonwebtoken');

if (!process.env.JWT_SECRET) {
  console.warn('⚠️  JWT_SECRET no definido. Usando secreto por defecto (NO seguro en producción).');
}
const SECRET = process.env.JWT_SECRET || 'dev-only-change-in-production';

module.exports = (req, res, next) => {
  const header = req.headers.authorization || '';
  const token = header.startsWith('Bearer ') ? header.slice(7) : null;
  if (!token) return res.status(401).json({ error: 'Token requerido' });

  try {
    const decoded = jwt.verify(token, SECRET);
    if (!decoded.id) return res.status(401).json({ error: 'Token inválido' });
    req.user = decoded;
    next();
  } catch (e) {
    if (e.name === 'TokenExpiredError') return res.status(401).json({ error: 'Sesión expirada' });
    res.status(401).json({ error: 'Token inválido' });
  }
};

module.exports.SECRET = SECRET;
