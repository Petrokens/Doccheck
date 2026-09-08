const express = require('express');
const router = express.Router();
const auth = require('../controllers/authController');
const verifyToken = require('../middleware/verifyToken');
const requireRole = require('../middleware/requireRole');
const requireTrustedOrigin = require('../middleware/requireTrustedOrigin');
const { loginLimiter, passwordLimiter, refreshLimiter, otpLimiter } = require('../middleware/rateLimits');

router.use(requireTrustedOrigin);

if (process.env.AUTH_ALLOW_PUBLIC_REGISTER === 'true') {
  router.post('/register', auth.register);
} else {
  router.post('/register', verifyToken, requireRole([1]), auth.register);
}

router.post('/login', loginLimiter, auth.login);
router.post('/login/verify-otp', otpLimiter, auth.verifyLoginOtp);
router.post('/login/resend-otp', otpLimiter, auth.resendLoginOtp);
router.post('/logout', auth.logout);
router.post('/refresh', refreshLimiter, auth.refresh);
router.post('/forgot-password', passwordLimiter, auth.forgotPassword);
router.post('/reset-password', passwordLimiter, auth.resetPassword);
router.get('/me', verifyToken, auth.me);

module.exports = router;
