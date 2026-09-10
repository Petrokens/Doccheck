const express = require('express');
const cookieParser = require('cookie-parser');
const cors = require('cors');

const authRoutes = require('./routes/authRoutes');
const qaqcRoutes = require('./routes/qaqcRoutes');
const sidebarRoutes = require('./routes/sidebarRoutes');
const { users, roles, permissions, systemLogs } = require('./routes/adminRoutes');
const announcementRoutes = require('./routes/announcementRoutes');
const securityHeaders = require('./middleware/securityHeaders');
const { globalLimiter } = require('./middleware/rateLimits');
const { isAllowedOrigin } = require('./security/validateEnv');
const { publicError } = require('./security/httpErrors');
const { mountSwagger } = require('./docs/swagger');
const { getAppUpdateInfo } = require('./lib/appVersion');

const app = express();
app.set('trust proxy', 1);
app.disable('x-powered-by');

// CORS must run before rate limits so failed/limited responses still include ACAO headers.
app.use(
  cors({
    origin: (origin, callback) => {
      if (!origin) return callback(null, true);
      if (isAllowedOrigin(origin)) return callback(null, origin);
      return callback(null, false);
    },
    credentials: true,
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
    methods: ['GET', 'POST', 'PATCH', 'PUT', 'DELETE', 'OPTIONS'],
    optionsSuccessStatus: 204,
    maxAge: 600,
  }),
);
app.use(securityHeaders());
app.use(globalLimiter);
app.use(express.json({ limit: '2mb' }));
app.use(express.urlencoded({ extended: false, limit: '200kb' }));
app.use(cookieParser());

app.get('/api/health', (_req, res) => {
  res.json(getAppUpdateInfo());
});
app.use('/api/auth', authRoutes);
app.use('/api/qaqc', qaqcRoutes);
app.use('/api/qc', qaqcRoutes);
app.use('/api/sidebar', sidebarRoutes);
app.use('/api/announcements', announcementRoutes);
app.use('/api/users', users);
app.use('/api/roles', roles);
app.use('/api/permissions', permissions);
app.use('/api/system-logs', systemLogs);
mountSwagger(app);

app.use((req, res) => publicError(res, 404, 'Not found'));

app.use((err, req, res, next) => {
  if (err instanceof SyntaxError && err.status === 400 && 'body' in err) {
    return publicError(res, 400, 'Invalid JSON in request body');
  }
  console.error('Unhandled error:', err?.message || err);
  if (res.headersSent) return next(err);
  return publicError(res, 500, 'Internal server error');
});

module.exports = app;
