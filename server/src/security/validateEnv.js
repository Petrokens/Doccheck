const { isProduction } = require('./httpErrors');

const WEAK_SECRETS = new Set([
  '',
  'change-this-access-secret',
  'change-this-refresh-secret',
  'secret',
  'changeme',
]);

function isWeakSecret(value, min = 32) {
  const v = String(value || '');
  return WEAK_SECRETS.has(v.toLowerCase()) || v.length < min;
}

function validateRuntimeEnv() {
  if (!process.env.DATABASE_URL) {
    throw new Error('DATABASE_URL is required.');
  }
  if (!process.env.ACCESS_TOKEN_SECRET || !process.env.REFRESH_TOKEN_SECRET) {
    throw new Error('ACCESS_TOKEN_SECRET and REFRESH_TOKEN_SECRET are required.');
  }
  if (process.env.ACCESS_TOKEN_SECRET === process.env.REFRESH_TOKEN_SECRET) {
    throw new Error('ACCESS_TOKEN_SECRET and REFRESH_TOKEN_SECRET must be different.');
  }

  const origins = String(process.env.FRONTEND_URL || '')
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean);
  if (!origins.length) {
    throw new Error('FRONTEND_URL is required (comma-separated allowed origins).');
  }

  const weakAccess = isWeakSecret(process.env.ACCESS_TOKEN_SECRET);
  const weakRefresh = isWeakSecret(process.env.REFRESH_TOKEN_SECRET);
  if (isProduction()) {
    if (weakAccess) throw new Error('ACCESS_TOKEN_SECRET must be a random string of at least 32 characters.');
    if (weakRefresh) throw new Error('REFRESH_TOKEN_SECRET must be a random string of at least 32 characters.');
    const masterPassword = String(process.env.MASTER_PASSWORD || '');
    if (!process.env.MASTER_EMAIL || !masterPassword) {
      throw new Error('MASTER_EMAIL and MASTER_PASSWORD are required in production.');
    }
    if (masterPassword === 'ChangeMe123!') {
      throw new Error('Replace the default MASTER_PASSWORD before production use.');
    }
    if (process.env.AUTH_ALLOW_PUBLIC_REGISTER === 'true') {
      throw new Error('AUTH_ALLOW_PUBLIC_REGISTER must not be enabled in production.');
    }
  } else if (weakAccess || weakRefresh) {
    console.warn('[security] JWT secrets are weak. Generate 32+ character random values before any external test.');
  }
}

function allowedOrigins() {
  return String(process.env.FRONTEND_URL || '')
    .split(',')
    .map((s) => s.trim().replace(/\/$/, ''))
    .filter(Boolean);
}

function isAllowedOrigin(origin) {
  if (!origin) return false;
  const normalized = String(origin).replace(/\/$/, '');
  const allow = allowedOrigins();
  if (allow.includes(normalized)) return true;
  // Electron packaged UI + local Vite (any localhost port)
  if (/^https?:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/i.test(normalized)) return true;
  return false;
}

module.exports = { validateRuntimeEnv, allowedOrigins, isAllowedOrigin };
