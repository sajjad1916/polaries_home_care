const { getDb } = require('../../db/database');

function requireAuth(req, res, next) {
  const sessionId = req.cookies?.session_id;
  if (!sessionId) {
    return res.status(401).json({ error: 'Authentication required' });
  }

  const db = getDb();
  const session = db.prepare(`
    SELECT s.*, a.id as user_id, a.username, a.name, a.role
    FROM sessions s
    JOIN admin_users a ON a.id = s.admin_user_id
    WHERE s.id = ? AND s.expires_at > datetime('now')
  `).get(sessionId);

  if (!session) {
    res.clearCookie('session_id');
    return res.status(401).json({ error: 'Session expired' });
  }

  req.admin = {
    id: session.user_id,
    username: session.username,
    name: session.name,
    role: session.role,
  };

  next();
}

function requireAdmin(req, res, next) {
  requireAuth(req, res, () => {
    if (req.admin.role !== 'admin') {
      return res.status(403).json({ error: 'Admin access required' });
    }
    next();
  });
}

module.exports = { requireAuth, requireAdmin };
