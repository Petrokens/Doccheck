const crypto = require('crypto');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const { sendEmail, frontendOrigin } = require('../utils/sendEmail');
const { credentialsEmail, loginOtpEmail, passwordResetEmail } = require('../utils/emailTemplates');
const { generateAccessToken, generateRefreshToken } = require('../utils/generateTokens');
const userRepo = require('../db/repositories/userRepository');
const otpRepo = require('../db/repositories/otpRepository');
const { refreshCookieOptions, REFRESH_MAX_AGE_MS } = require('../utils/refreshCookie');
const { hashToken, randomToken, safeEqual } = require('../security/tokens');
const { audit } = require('../security/audit');
const { publicError, internalError } = require('../security/httpErrors');

const BCRYPT_ROUNDS = 12;
const LOCK_AFTER = 5;
const LOCK_MS = 15 * 60 * 1000;
const DUMMY_PASSWORD_HASH =
  '$2a$10$N9qo8uLOickgx2ZMRZoMyeIjZAgcfl7p92ldGxad68LJZdL17lhWy';
const INVALID_LOGIN_MESSAGE = 'Invalid email or password.';
const passwordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[\W_]).{12,}$/;
const MASTER_ROLE = 1;
const ENGINEER_ROLE = 2;
const OTP_TTL_MS = 10 * 60 * 1000;
const OTP_MAX_ATTEMPTS = 5;

function maskEmail(email) {
  const [local, domain] = String(email || '').split('@');
  if (!domain) return 'your email';
  const keep = local.slice(0, 1) || '*';
  return `${keep}***@${domain}`;
}

function generateOtp() {
  return String(crypto.randomInt(100000, 1000000));
}

async function createAndSendLoginOtp(user) {
  await otpRepo.invalidateOpenForUser(user.user_id);
  const otp = generateOtp();
  const challengeId = crypto.randomUUID();
  await otpRepo.createChallenge({
    id: challengeId,
    userId: user.user_id,
    otpHash: hashToken(`${challengeId}:${otp}`),
    expiresAt: new Date(Date.now() + OTP_TTL_MS),
  });
  const mail = loginOtpEmail({ username: user.username, otp });
  try {
    const sent = await sendEmail({ to: user.email, ...mail });
    if (sent.skipped) {
      await otpRepo.consume(challengeId);
      const error = new Error('Email service is not configured. Set SMTP_HOST, SMTP_USER, and SMTP_PASS.');
      error.statusCode = 503;
      throw error;
    }
  } catch (error) {
    await otpRepo.consume(challengeId);
    if (error.statusCode) throw error;
    const wrapped = new Error(error.message || 'Failed to send login OTP email.');
    wrapped.statusCode = 503;
    throw wrapped;
  }
  return { challengeId, emailMasked: maskEmail(user.email) };
}

function clientIp(req) {
  return String(req.ip || req.headers['x-forwarded-for'] || '').split(',')[0].trim();
}

function isLocked(user) {
  return Boolean(user?.locked_until && new Date(user.locked_until).getTime() > Date.now());
}

async function issueSession(res, user) {
  const accessToken = generateAccessToken(user);
  const refreshToken = generateRefreshToken(user);
  const expiresAt = new Date(Date.now() + REFRESH_MAX_AGE_MS);
  await userRepo.updateByUserId(user.user_id, {
    refresh_token: hashToken(refreshToken),
    refresh_token_expires: expiresAt,
    last_login_at: new Date(),
    failed_login_count: 0,
    locked_until: null,
  });
  res.cookie('refreshToken', refreshToken, refreshCookieOptions({ maxAge: REFRESH_MAX_AGE_MS }));
  res.set('Cache-Control', 'no-store');
  return accessToken;
}

exports.register = async (req, res) => {
  const { username, email, password, role_id } = req.body || {};
  if (!username || !email || !password) {
    return publicError(res, 400, 'username, email, and password are required.');
  }
  if (!passwordRegex.test(password)) {
    return publicError(res, 400, 'Password must be at least 12 characters with upper, lower, number, and symbol.');
  }
  const requestedRole = Number(role_id);
  let nextRole = ENGINEER_ROLE;
  if (Number(req.user?.role_id) === MASTER_ROLE) {
    nextRole = requestedRole === MASTER_ROLE ? MASTER_ROLE : ENGINEER_ROLE;
  } else if (requestedRole && requestedRole !== ENGINEER_ROLE) {
    return publicError(res, 403, 'Insufficient permissions');
  }
  try {
    const hashedPassword = await bcrypt.hash(password, BCRYPT_ROUNDS);
    const user = await userRepo.create({
      username: String(username).trim().slice(0, 255),
      email: String(email).trim().toLowerCase().slice(0, 255),
      password: hashedPassword,
      role_id: nextRole,
    });
    audit('user.register', { actor: req.user?.user_id || 'public', created: user.user_id, role_id: nextRole });
    let emailSent = false;
    try {
      const mail = credentialsEmail({
        username: user.username,
        email: user.email,
        password: String(password),
        loginUrl: `${frontendOrigin()}/login`,
      });
      const sent = await sendEmail({ to: user.email, ...mail });
      emailSent = !sent.skipped;
      if (sent.skipped) {
        console.warn(`Credentials email skipped for ${user.email}`);
      }
    } catch (mailError) {
      console.warn('Credentials email failed:', mailError?.message || mailError);
    }
    return res.status(201).json({
      message: emailSent
        ? 'User registered successfully. Login credentials were emailed.'
        : 'User registered successfully. Login email could not be sent.',
      email_sent: emailSent,
      user: {
        id: user.id,
        user_id: user.user_id,
        username: user.username,
        email: user.email,
        role_id: user.role_id,
      },
    });
  } catch (error) {
    if (error.code === '23505') return publicError(res, 409, 'Email already registered.');
    return internalError(res, error, 'Registration failed');
  }
};

exports.login = async (req, res) => {
  const { email, password } = req.body || {};
  if (!email || !password) {
    return publicError(res, 400, 'Email and password are required.');
  }
  try {
    const user = await userRepo.findByEmail(String(email).trim().toLowerCase());
    if (user && isLocked(user)) {
      audit('auth.lockout', { email: user.email, ip: clientIp(req) });
      return publicError(res, 423, 'Account temporarily locked. Try again later.');
    }
    const isMatch = await bcrypt.compare(password, user ? user.password : DUMMY_PASSWORD_HASH);
    if (!user || !isMatch) {
      if (user) {
        const fails = Number(user.failed_login_count || 0) + 1;
        const patch = { failed_login_count: fails };
        if (fails >= LOCK_AFTER) patch.locked_until = new Date(Date.now() + LOCK_MS);
        await userRepo.updateByUserId(user.user_id, patch);
        audit('auth.login_failed', { user_id: user.user_id, ip: clientIp(req), fails });
      } else {
        audit('auth.login_failed', { email: String(email).trim().toLowerCase(), ip: clientIp(req) });
      }
      return publicError(res, 401, INVALID_LOGIN_MESSAGE);
    }
    const challenge = await createAndSendLoginOtp(user);
    audit('auth.otp_sent', { user_id: user.user_id, ip: clientIp(req) });
    return res.json({
      requiresOtp: true,
      challengeId: challenge.challengeId,
      emailMasked: challenge.emailMasked,
      message: 'Enter the verification code sent to your email.',
    });
  } catch (error) {
    if (error.statusCode === 503) return publicError(res, 503, error.message);
    return internalError(res, error, 'Login failed');
  }
};

exports.verifyLoginOtp = async (req, res) => {
  const challengeId = String(req.body?.challengeId || '').trim();
  const otp = String(req.body?.otp || '').replace(/\s/g, '');
  if (!challengeId || !otp) {
    return publicError(res, 400, 'Verification code is required.');
  }
  try {
    const challenge = await otpRepo.findById(challengeId);
    if (!challenge || challenge.consumed_at) {
      return publicError(res, 400, 'Invalid or expired verification code. Sign in again.');
    }
    if (new Date(challenge.expires_at).getTime() <= Date.now()) {
      await otpRepo.consume(challengeId);
      return publicError(res, 400, 'Verification code expired. Sign in again.');
    }
    if (Number(challenge.attempts) >= OTP_MAX_ATTEMPTS) {
      await otpRepo.consume(challengeId);
      return publicError(res, 400, 'Too many incorrect codes. Sign in again.');
    }
    const expected = hashToken(`${challengeId}:${otp}`);
    if (!safeEqual(expected, challenge.otp_hash)) {
      const attempts = await otpRepo.incrementAttempts(challengeId);
      if (attempts >= OTP_MAX_ATTEMPTS) await otpRepo.consume(challengeId);
      audit('auth.otp_failed', { user_id: challenge.user_id, ip: clientIp(req), attempts });
      return publicError(res, 401, 'Invalid verification code.');
    }
    const user = await userRepo.findByUserId(challenge.user_id);
    if (!user) return publicError(res, 400, 'Invalid or expired verification code. Sign in again.');
    if (isLocked(user)) return publicError(res, 423, 'Account temporarily locked. Try again later.');
    await otpRepo.consume(challengeId);
    const accessToken = await issueSession(res, user);
    audit('auth.login', { user_id: user.user_id, ip: clientIp(req) });
    return res.json({ message: 'Login successful', accessToken });
  } catch (error) {
    return internalError(res, error, 'Verification failed');
  }
};

exports.resendLoginOtp = async (req, res) => {
  const challengeId = String(req.body?.challengeId || '').trim();
  if (!challengeId) return publicError(res, 400, 'Verification session is required.');
  try {
    const previous = await otpRepo.findById(challengeId);
    if (!previous || previous.consumed_at) {
      return publicError(res, 400, 'Verification session expired. Sign in again.');
    }
    const user = await userRepo.findByUserId(previous.user_id);
    if (!user) return publicError(res, 400, 'Verification session expired. Sign in again.');
    if (isLocked(user)) return publicError(res, 423, 'Account temporarily locked. Try again later.');
    const challenge = await createAndSendLoginOtp(user);
    audit('auth.otp_resent', { user_id: user.user_id, ip: clientIp(req) });
    return res.json({
      requiresOtp: true,
      challengeId: challenge.challengeId,
      emailMasked: challenge.emailMasked,
      message: 'A new verification code was sent to your email.',
    });
  } catch (error) {
    if (error.statusCode === 503) return publicError(res, 503, error.message);
    return internalError(res, error, 'Could not resend code');
  }
};

exports.logout = async (req, res) => {
  try {
    const token = req.cookies.refreshToken;
    if (token) await userRepo.clearRefreshToken(hashToken(token));
    res.clearCookie('refreshToken', refreshCookieOptions());
    audit('auth.logout', { ip: clientIp(req) });
    return res.json({ message: 'Logout successful' });
  } catch (error) {
    return internalError(res, error, 'Logout failed');
  }
};

exports.refresh = async (req, res) => {
  try {
    const token = req.cookies.refreshToken;
    if (!token) return publicError(res, 401, 'Refresh token missing');
    const user = await userRepo.findByRefreshToken(hashToken(token));
    if (!user) return publicError(res, 403, 'Invalid or expired refresh token');
    jwt.verify(token, process.env.REFRESH_TOKEN_SECRET);
    const accessToken = await issueSession(res, user);
    return res.json({ accessToken });
  } catch {
    return publicError(res, 403, 'Invalid or expired refresh token');
  }
};

exports.me = async (req, res) => {
  try {
    const user = await userRepo.findByUserId(req.user.user_id);
    if (!user) return publicError(res, 404, 'User not found');
    return res.json({
      user: {
        id: user.id,
        user_id: user.user_id,
        username: user.username,
        email: user.email,
        role_id: user.role_id,
        last_login_at: user.last_login_at,
      },
    });
  } catch (error) {
    return internalError(res, error, 'Failed to load profile');
  }
};

exports.forgotPassword = async (req, res) => {
  const email = String(req.body?.email || '').trim().toLowerCase();
  if (!email) return publicError(res, 400, 'Email is required.');
  try {
    const user = await userRepo.findByEmail(email);
    if (user) {
      const resetToken = randomToken(32);
      await userRepo.updateByUserId(user.user_id, {
        reset_token: hashToken(resetToken),
        reset_token_expires: new Date(Date.now() + 30 * 60 * 1000),
      });
      const origin = frontendOrigin();
      const mail = passwordResetEmail({ resetUrl: `${origin}/reset-password?token=${resetToken}` });
      await sendEmail({ to: email, ...mail });
      audit('auth.reset_requested', { user_id: user.user_id });
    }
    return res.json({ message: 'If that email is registered, a reset link was sent.' });
  } catch (error) {
    return internalError(res, error, 'Failed to process request');
  }
};

exports.resetPassword = async (req, res) => {
  const { token, password } = req.body || {};
  if (!token || !password) return publicError(res, 400, 'token and password are required.');
  if (!passwordRegex.test(password)) {
    return publicError(res, 400, 'Password must be at least 12 characters with upper, lower, number, and symbol.');
  }
  try {
    const user = await userRepo.findByResetToken(hashToken(token));
    if (!user) return publicError(res, 400, 'Invalid or expired reset token.');
    const hashed = await bcrypt.hash(password, BCRYPT_ROUNDS);
    await userRepo.updateByUserId(user.user_id, {
      password: hashed,
      reset_token: null,
      reset_token_expires: null,
      refresh_token: null,
      refresh_token_expires: null,
      failed_login_count: 0,
      locked_until: null,
    });
    audit('auth.password_reset', { user_id: user.user_id });
    return res.json({ message: 'Password updated.' });
  } catch (error) {
    return internalError(res, error, 'Reset failed');
  }
};
