const express = require('express');
const cookieParser = require('cookie-parser');
const cors = require('cors');
const path = require('path');

const authRoutes = require('./routes/authRoutes');
const qaqcRoutes = require('./routes/qaqcRoutes');
const sidebarRoutes = require('./routes/sidebarRoutes');
const { users, roles, permissions } = require('./routes/adminRoutes');

const app = express();
app.set('trust proxy', 1);

const allowedOrigins = (process.env.FRONTEND_URL || '')
  .split(',')
  .map((s) => s.trim().replace(/\/$/, ''))
  .filter(Boolean);

app.use(
  cors({
    origin: (origin, callback) => {
      if (!origin) return callback(null, true);
      const normalized = origin.replace(/\/$/, '');
      if (!allowedOrigins.length || allowedOrigins.includes(normalized)) return callback(null, origin);
      if (/^https?:\/\/localhost(:\d+)?$/.test(normalized)) return callback(null, origin);
      return callback(null, false);
    },
    credentials: true,
  }),
);
app.use(express.json({ limit: '10mb' }));
app.use(cookieParser());

app.get('/api/health', (_req, res) => {
  res.json({ ok: true, product: 'Petrolenz QA/QC' });
});
app.use('/api/auth', authRoutes);
app.use('/api/qaqc', qaqcRoutes);
app.use('/api/qc', qaqcRoutes);
app.use('/api/sidebar', sidebarRoutes);
app.use('/api/users', users);
app.use('/api/roles', roles);
app.use('/api/permissions', permissions);

app.use('/reports', express.static(path.join(__dirname, 'reports')));

app.use((err, req, res, next) => {
  if (err instanceof SyntaxError && err.status === 400 && 'body' in err) {
    return res.status(400).json({ error: 'Invalid JSON in request body' });
  }
  return next(err);
});

module.exports = app;
