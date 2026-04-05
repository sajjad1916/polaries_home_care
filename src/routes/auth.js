const express = require('express');
const bcrypt = require('bcrypt');
const { v4: uuidv4 } = require('uuid');
const { getDb } = require('../../db/database');
const settings = require('../../config/settings');
const { requireAuth, requireAdmin } = require('../middleware/auth');

const router = express.Router();

router.post('/login', async (req, res) => {
  try {
    const { username, password } = req.body;
    if (!username || !password) {
      return res.status(400).json({ error: 'Username and password required' });
    }

    const db = getDb();
    const user = db.prepare('SELECT * FROM admin_users WHERE username = ?').get(username);
    if (!user) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    const valid = await bcrypt.compare(password, user.password_hash);
    if (!valid) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    // Create session
    const sessionId = uuidv4();
    const expiresAt = new Date(Date.now() + settings.session.maxAge).toISOString();
    db.prepare('INSERT INTO sessions (id, admin_user_id, expires_at) VALUES (?, ?, ?)').run(sessionId, user.id, expiresAt);

    // Clean up old sessions
    db.prepare("DELETE FROM sessions WHERE expires_at < datetime('now')").run();

    res.cookie('session_id', sessionId, {
      httpOnly: true,
      secure: settings.env === 'production',
      sameSite: 'lax',
      maxAge: settings.session.maxAge,
    });

    res.json({ user: { id: user.id, username: user.username, name: user.name, role: user.role } });
  } catch (err) {
    console.error('[auth] Login error:', err);
    res.status(500).json({ error: 'Login failed' });
  }
});

router.post('/logout', (req, res) => {
  const sessionId = req.cookies?.session_id;
  if (sessionId) {
    const db = getDb();
    db.prepare('DELETE FROM sessions WHERE id = ?').run(sessionId);
  }
  res.clearCookie('session_id');
  res.json({ ok: true });
});

router.get('/me', requireAuth, (req, res) => {
  res.json({ user: req.admin });
});

// List all admin users (admin only)
router.get('/users', requireAdmin, (req, res) => {
  try {
    const db = getDb();
    const users = db.prepare('SELECT id, username, name, role, created_at FROM admin_users ORDER BY created_at ASC').all();
    res.json(users);
  } catch (err) {
    console.error('[auth] List users error:', err);
    res.status(500).json({ error: 'Failed to fetch users' });
  }
});

// Create admin user (admin only)
router.post('/users', requireAdmin, async (req, res) => {
  try {
    const { username, password, name, role } = req.body;
    if (!username || !password || !name) {
      return res.status(400).json({ error: 'Username, password, and name are required' });
    }
    if (role && !['admin', 'staff'].includes(role)) {
      return res.status(400).json({ error: 'Role must be admin or staff' });
    }

    const db = getDb();
    const existing = db.prepare('SELECT id FROM admin_users WHERE username = ?').get(username);
    if (existing) {
      return res.status(400).json({ error: 'Username already exists' });
    }

    const hash = await bcrypt.hash(password, 10);
    const result = db.prepare('INSERT INTO admin_users (username, password_hash, name, role) VALUES (?, ?, ?, ?)').run(username, hash, name, role || 'staff');

    db.prepare('INSERT INTO audit_log (action, entity_type, entity_id, admin_user_id, details) VALUES (?, ?, ?, ?, ?)')
      .run('create_admin_user', 'admin_user', String(result.lastInsertRowid), req.admin.id, JSON.stringify({ username, name, role: role || 'staff' }));

    res.json({ id: result.lastInsertRowid, username, name, role: role || 'staff' });
  } catch (err) {
    console.error('[auth] Create user error:', err);
    res.status(500).json({ error: 'Failed to create user' });
  }
});

module.exports = router;
