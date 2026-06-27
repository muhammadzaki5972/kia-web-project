const jwt = require('jsonwebtoken');

function authMiddleware(req, res, next) {
  const token = req.cookies?.token || req.headers.authorization?.split(' ')[1];
  
  if (!token) {
    return res.status(401).json({ error: 'Akses ditolak: Token tidak ditemukan' });
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'fallback-secret-key-for-dev');
    req.user = decoded;
    next();
  } catch (err) {
    return res.status(401).json({ error: 'Akses ditolak: Token tidak valid atau kedaluwarsa' });
  }
}

module.exports = authMiddleware;
