const { isAllowedOrigin } = require('../security/validateEnv');

function requireTrustedOrigin(req, res, next) {
  if (!['POST', 'PUT', 'PATCH', 'DELETE'].includes(req.method)) return next();
  const origin = String(req.headers.origin || '').trim();
  if (origin) {
    if (!isAllowedOrigin(origin)) {
      return res.status(403).json({ error: 'Origin is not allowed.' });
    }
    return next();
  }
  const requestedWith = String(req.get('X-Requested-With') || '');
  if (requestedWith === 'DocCheck') return next();
  return res.status(403).json({ error: 'Trusted origin or client header required.' });
}

module.exports = requireTrustedOrigin;
