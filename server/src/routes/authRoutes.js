const express = require('express');
const router = express.Router();
const rateLimit = require('express-rate-limit');
const auth = require('../controllers/authController');
const verifyToken = require('../middleware/verifyToken');
const requireRole = require('../middleware/requireRole');

const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 20,
  standardHeaders: true,
  legacyHeaders: false,
  message: 'Too many login attempts. Please try again after 15 minutes.',
});

if (process.env.AUTH_ALLOW_PUBLIC_REGISTER === 'true') {
  router.post('/register', auth.register);
} else {
  router.post('/register', verifyToken, requireRole([1]), auth.register);
}

router.post('/login', loginLimiter, auth.login);
router.post('/logout', auth.logout);
router.post('/refresh', auth.refresh);
router.post('/forgot-password', auth.forgotPassword);
router.post('/reset-password', auth.resetPassword);
router.get('/me', verifyToken, auth.me);

module.exports = router;
