function isProduction() {
  return process.env.NODE_ENV === 'production';
}

function resolveSameSite() {
  const override = String(process.env.REFRESH_COOKIE_SAME_SITE || '').trim().toLowerCase();
  if (['strict', 'lax', 'none'].includes(override)) return override;
  return 'lax';
}

function refreshCookieOptions({ maxAge } = {}) {
  const sameSite = resolveSameSite();
  const secure = sameSite === 'none' ? true : isProduction();
  return {
    httpOnly: true,
    secure,
    sameSite,
    path: '/api/auth',
    ...(maxAge != null ? { maxAge } : {}),
  };
}

const REFRESH_MAX_AGE_MS = 7 * 24 * 60 * 60 * 1000;

module.exports = { refreshCookieOptions, REFRESH_MAX_AGE_MS };
