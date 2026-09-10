const rateLimit = require('express-rate-limit');

const skipOptions = (req) => req.method === 'OPTIONS';

const globalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 400,
  standardHeaders: true,
  legacyHeaders: false,
  skip: skipOptions,
  message: { error: 'Too many requests. Try again later.' },
});

const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 8,
  standardHeaders: true,
  legacyHeaders: false,
  skip: skipOptions,
  message: { error: 'Too many login attempts. Try again after 15 minutes.' },
});

const refreshLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 40,
  standardHeaders: true,
  legacyHeaders: false,
  skip: skipOptions,
  message: { error: 'Too many session refresh attempts.' },
});

const generateLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  max: 12,
  standardHeaders: true,
  legacyHeaders: false,
  skip: skipOptions,
  message: { error: 'QA/QC generation rate limit reached. Try again later.' },
});

module.exports = { globalLimiter, loginLimiter, refreshLimiter, generateLimiter };
