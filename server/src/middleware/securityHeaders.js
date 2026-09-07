const helmet = require('helmet');
const { isProduction } = require('../security/httpErrors');

function securityHeaders() {
  return helmet({
    contentSecurityPolicy: false,
    crossOriginEmbedderPolicy: false,
    crossOriginResourcePolicy: { policy: 'cross-origin' },
    referrerPolicy: { policy: 'no-referrer' },
    frameguard: { action: 'deny' },
    hsts: isProduction() ? { maxAge: 15552000, includeSubDomains: true, preload: false } : false,
    hidePoweredBy: true,
    noSniff: true,
  });
}

module.exports = securityHeaders;
