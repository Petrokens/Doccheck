const crypto = require('crypto');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const { generateAccessToken, generateRefreshToken } = require('../utils/generateTokens');
const userRepo = require('../db/repositories/userRepository');
const otpRepo = require('../db/repositories/otpRepository');
const { refreshCookieOptions, REFRESH_MAX_AGE_MS } = require('../utils/refreshCookie');
const { hashToken, safeEqual } = require('../security/tokens');
const { audit } = require('../security/audit');
const { publicError, internalError } = require('../security/httpErrors');
const { sendEmail, isSmtpConfigured } = require('../utils/sendEmail');
const { loginOtpEmail } = require('../utils/emailTemplates');

const BCRYPT_ROUNDS = 12;
const LOCK_AFTER = 5;
const LOCK_MS = 15 * 60 * 1000;
const OTP_TTL_MS = 10 * 60 * 1000;
const OTP_MAX_ATTEMPTS = 5;
const DUMMY_PASSWORD_HASH =
  '$2a$10$N9qo8uLOickgx2ZMRZoMyeIjZAgcfl7p92ldGxad68LJZdL17lhWy';
const INVALID_LOGIN_MESSAGE = 'Invalid email or password.';
const INVALID_OTP_MESSAGE = 'Invalid or expired verification code.';
const passwordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[\W_]).{12,}$/;
const MASTER_ROLE = 1;
const ENGINEER_ROLE = 2;

/** challengeId -> plaintext OTP (in-memory; DB stores hash only) */
const otpPlainByChallenge = new Map();
/** userId -> Promise lock to prevent parallel OTP sends racing */
const otpLocks = new Map();

function clientIp(req) {
  return String(req.ip || req.headers['x-forwarded-for'] || '').split(',')[0].trim();
}

function isLocked(user) {
  return Boolean(user?.locked_until && new Date(user.locked_until).getTime() > Date.now());
}

function makeOtp() {
  return String(crypto.randomInt(0, 1_000_000)).padStart(6, '0');
}

function normalizeOtp(value) {
  return String(value || '').replace(/[^\d]/g, '').slice(0, 6);
}

function rememberPlainOtp(challengeId, otp) {
  otpPlainByChallenge.set(challengeId, otp);
  setTimeout(() => {
    if (otpPlainByChallenge.get(challengeId) === otp) otpPlainByChallenge.delete(challengeId);
  }, OTP_TTL_MS + 10_000);
}

function otpMatches(challengeId, otp, storedHash) {
  const normalized = normalizeOtp(otp);
  if (!/^\d{6}$/.test(normalized)) return false;
  const memorized = otpPlainByChallenge.get(challengeId);
  if (memorized && memorized === normalized) return true;
  const stored = String(storedHash || '').trim().toLowerCase();
  return safeEqual(hashToken(normalized), stored);
}

async function withUserOtpLock(userId, fn) {
  const key = String(userId);
  const prev = otpLocks.get(key) || Promise.resolve();
  let release;
  const gate = new Promise((resolve) => {
    release = resolve;
  });
  const next = prev.then(() => gate, () => gate);
  otpLocks.set(key, next);
  await prev.catch(() => {});
  try {
    return await fn();
  } finally {
    release();
    if (otpLocks.get(key) === next) otpLocks.delete(key);
  }
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

async function issueNewLoginOtp(user) {
  const otp = makeOtp();
  const challengeId = crypto.randomUUID();
  const expiresAt = new Date(Date.now() + OTP_TTL_MS);
  const otpHash = hashToken(otp);

  await otpRepo.createChallenge({
    id: challengeId,
    userId: user.user_id,
    otpHash,
    expiresAt,
  });
  await otpRepo.invalidateOpenForUser(user.user_id, challengeId);
  rememberPlainOtp(challengeId, otp);

  const mail = loginOtpEmail({ username: user.username, otp });
  try {
    await sendEmail({
      to: user.email,
      subject: mail.subject,
      html: mail.html,
      text: mail.text,
    });
  } catch (error) {
    await otpRepo.consume(challengeId);
    otpPlainByChallenge.delete(challengeId);
    throw error;
  }

  if (process.env.NODE_ENV !== 'production' || process.env.AUTH_OTP_DEV_LOG === 'true') {
    console.log(`[auth-otp] ${user.email} => ${otp} (challenge ${challengeId})`);
  }

  return { challengeId, expiresAt };
}

async function createAndSendLoginOtp(user) {
  if (!isSmtpConfigured()) {
    const err = new Error('Email is not configured on the server.');
    err.code = 'SMTP_NOT_CONFIGURED';
    throw err;
  }
  return withUserOtpLock(user.user_id, () => issueNewLoginOtp(user));
}

async function rotateAndSendLoginOtp(user, existingChallengeId) {
  if (!isSmtpConfigured()) {
    const err = new Error('Email is not configured on the server.');
    err.code = 'SMTP_NOT_CONFIGURED';
    throw err;
  }

  return withUserOtpLock(user.user_id, async () => {
    const otp = makeOtp();
    const expiresAt = new Date(Date.now() + OTP_TTL_MS);
    const updated = await otpRepo.rotateChallenge({
      id: existingChallengeId,
      otpHash: hashToken(otp),
      expiresAt,
    });
    if (!updated) {
      return issueNewLoginOtp(user);
    }

    rememberPlainOtp(existingChallengeId, otp);
    const mail = loginOtpEmail({ username: user.username, otp });
    await sendEmail({
      to: user.email,
      subject: mail.subject,
      html: mail.html,
      text: mail.text,
    });

    if (process.env.NODE_ENV !== 'production' || process.env.AUTH_OTP_DEV_LOG === 'true') {
      console.log(`[auth-otp:resend] ${user.email} => ${otp} (challenge ${existingChallengeId})`);
    }

    return { challengeId: existingChallengeId, expiresAt };
  });
}

function otpEnabled() {
  // OTP login policy: ON by default. Only AUTH_SKIP_OTP=true disables it.
  const skip = String(process.env.AUTH_SKIP_OTP || '').trim().toLowerCase();
  return !(skip === 'true' || skip === '1' || skip === 'yes');
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
    return res.status(201).json({
      message: 'User registered successfully.',
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

    if (!otpEnabled()) {
      const accessToken = await issueSession(res, user);
      audit('auth.login', { user_id: user.user_id, ip: clientIp(req), via: 'password' });
      return res.json({ message: 'Login successful', accessToken });
    }

    const { challengeId, expiresAt } = await createAndSendLoginOtp(user);
    audit('auth.otp_sent', { user_id: user.user_id, ip: clientIp(req), challengeId });
    return res.json({
      message: 'Verification code sent to your email.',
      requiresOtp: true,
      challengeId,
      expiresAt,
    });
  } catch (error) {
    if (error.code === 'SMTP_NOT_CONFIGURED') {
      return publicError(res, 503, 'Login email is not configured. Set SMTP_HOST, SMTP_USER, and SMTP_PASS on the server.');
    }
    console.error('Login OTP send failed:', error?.message || error);
    return publicError(res, 502, 'Could not send verification email. Check SMTP settings and try again.');
  }
};

exports.verifyOtp = async (req, res) => {
  const challengeId = String(req.body?.challengeId || req.body?.challenge_id || '').trim();
  const otp = normalizeOtp(req.body?.otp);
  if (!challengeId || !/^\d{6}$/.test(otp)) {
    return publicError(res, 400, 'challengeId and a 6-digit otp are required.');
  }
  try {
    let challenge = await otpRepo.findById(challengeId);
    // If the UI still holds an old challenge id after a parallel login, accept the
    // latest open challenge for that same user when the code matches.
    if (!challenge || challenge.consumed_at) {
      return publicError(res, 401, INVALID_OTP_MESSAGE);
    }
    if (new Date(challenge.expires_at).getTime() <= Date.now()) {
      return publicError(res, 401, INVALID_OTP_MESSAGE);
    }
    if (Number(challenge.attempts || 0) >= OTP_MAX_ATTEMPTS) {
      await otpRepo.consume(challenge.id);
      return publicError(res, 401, 'Too many invalid codes. Sign in again.');
    }

    let matchedId = challenge.id;
    if (!otpMatches(challenge.id, otp, challenge.otp_hash)) {
      const latest = await otpRepo.findLatestOpenForUser(challenge.user_id);
      if (
        latest
        && latest.id !== challenge.id
        && Number(latest.attempts || 0) < OTP_MAX_ATTEMPTS
        && otpMatches(latest.id, otp, latest.otp_hash)
      ) {
        challenge = latest;
        matchedId = latest.id;
      } else {
        await otpRepo.incrementAttempts(challengeId);
        audit('auth.otp_failed', { challengeId, ip: clientIp(req) });
        return publicError(res, 401, INVALID_OTP_MESSAGE);
      }
    }

    const consumed = await otpRepo.consume(matchedId);
    if (!consumed) return publicError(res, 401, INVALID_OTP_MESSAGE);
    otpPlainByChallenge.delete(matchedId);

    const user = await userRepo.findByUserId(challenge.user_id);
    if (!user) return publicError(res, 401, INVALID_OTP_MESSAGE);
    if (isLocked(user)) {
      return publicError(res, 423, 'Account temporarily locked. Try again later.');
    }

    const accessToken = await issueSession(res, user);
    audit('auth.login', { user_id: user.user_id, ip: clientIp(req), via: 'otp' });
    return res.json({ message: 'Login successful', accessToken });
  } catch (error) {
    return internalError(res, error, 'OTP verification failed');
  }
};

exports.resendOtp = async (req, res) => {
  const challengeId = String(req.body?.challengeId || req.body?.challenge_id || '').trim();
  if (!challengeId) return publicError(res, 400, 'challengeId is required.');
  try {
    const challenge = await otpRepo.findById(challengeId);
    if (!challenge || challenge.consumed_at) {
      return publicError(res, 401, 'Sign in again to request a new code.');
    }
    const user = await userRepo.findByUserId(challenge.user_id);
    if (!user) return publicError(res, 401, 'Sign in again to request a new code.');
    if (isLocked(user)) {
      return publicError(res, 423, 'Account temporarily locked. Try again later.');
    }

    const next = await rotateAndSendLoginOtp(user, challengeId);
    audit('auth.otp_resent', { user_id: user.user_id, ip: clientIp(req), challengeId: next.challengeId });
    return res.json({
      message: 'A new verification code was sent to your email. Use the latest code only.',
      requiresOtp: true,
      challengeId: next.challengeId,
      expiresAt: next.expiresAt,
    });
  } catch (error) {
    if (error.code === 'SMTP_NOT_CONFIGURED') {
      return publicError(res, 503, 'Login email is not configured. Set SMTP_HOST, SMTP_USER, and SMTP_PASS on the server.');
    }
    console.error('Resend OTP failed:', error?.message || error);
    return publicError(res, 502, 'Could not send verification email. Check SMTP settings and try again.');
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
