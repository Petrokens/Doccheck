const express = require('express');
const router = express.Router();
const auth = require('../controllers/authController');
const verifyToken = require('../middleware/verifyToken');
const requireRole = require('../middleware/requireRole');
const requireTrustedOrigin = require('../middleware/requireTrustedOrigin');
const { loginLimiter, refreshLimiter } = require('../middleware/rateLimits');

router.use(requireTrustedOrigin);

if (process.env.AUTH_ALLOW_PUBLIC_REGISTER === 'true') {
  router.post('/register', auth.register);
} else {
  router.post('/register', verifyToken, requireRole([1]), auth.register);
}

router.post('/login', loginLimiter, auth.login);
router.post('/verify-otp', loginLimiter, auth.verifyOtp);
router.post('/resend-otp', loginLimiter, auth.resendOtp);
router.post('/logout', auth.logout);
router.post('/refresh', refreshLimiter, auth.refresh);
router.get('/me', verifyToken, auth.me);

module.exports = router;
