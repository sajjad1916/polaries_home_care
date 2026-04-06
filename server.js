require('dotenv').config();

const express = require('express');
const path = require('path');
const helmet = require('helmet');
const morgan = require('morgan');
const cookieParser = require('cookie-parser');
const settings = require('./config/settings');
const { migrate } = require('./db/migrate');

// Run migrations on startup
migrate();

const app = express();

// Security headers
app.use(helmet({
  contentSecurityPolicy: false, // Relaxed for inline scripts in single-file frontend
  crossOriginEmbedderPolicy: false,
}));

// Logging
app.use(morgan('short'));

// Body parsing
app.use(express.json({ limit: '1mb' }));
app.use(express.urlencoded({ extended: true, limit: '1mb' }));
app.use(cookieParser());

// Static files
app.use(express.static(path.join(__dirname, 'public')));

// API Routes
app.use('/api/auth', require('./src/routes/auth'));
app.use('/api/onboarding', require('./src/routes/onboarding'));
app.use('/api/upload', require('./src/routes/upload'));
app.use('/api/caregivers', require('./src/routes/caregivers'));

// Serve frontend pages
app.get('/onboarding', (req, res) => res.sendFile(path.join(__dirname, 'public', 'onboarding.html')));
app.get('/upload/:caregiverId', (req, res) => res.sendFile(path.join(__dirname, 'public', 'upload.html')));
app.get('/admin', (req, res) => res.sendFile(path.join(__dirname, 'public', 'admin.html')));
app.get('/admin/*', (req, res) => res.sendFile(path.join(__dirname, 'public', 'admin.html')));
app.get('/login', (req, res) => res.sendFile(path.join(__dirname, 'public', 'admin.html')));

// Health check
app.get('/api/health', (req, res) => res.json({ status: 'ok', timestamp: new Date().toISOString() }));

// 404 handler
app.use((req, res) => {
  if (req.path.startsWith('/api/')) {
    return res.status(404).json({ error: 'Not found' });
  }
  res.sendFile(path.join(__dirname, 'public', 'admin.html'));
});

// Error handler
app.use((err, req, res, next) => {
  console.error('[server] Error:', err);
  res.status(500).json({ error: 'Internal server error' });
});

app.listen(settings.port, () => {
  console.log(`\n  Polaris Home Care - Compliance Portal`);
  console.log(`  =====================================`);
  console.log(`  Server running on http://localhost:${settings.port}`);
  console.log(`  Admin dashboard: http://localhost:${settings.port}/admin`);
  console.log(`  Onboarding form: http://localhost:${settings.port}/onboarding`);
  console.log(`  Environment: ${settings.env}`);
  console.log(`  AI scanning: ${settings.ai.enabled ? 'Enabled' : 'Disabled (manual entry only)'}`);
  console.log();
});

module.exports = app;
