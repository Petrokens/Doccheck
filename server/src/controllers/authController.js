const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const { sendEmail } = require('../utils/sendEmail');
const { generateAccessToken, generateRefreshToken } = require('../utils/generateTokens');
const userRepo = require('../db/repositories/userRepository');
const { refreshCookieOptions, REFRESH_MAX_AGE_MS } = require('../utils/refreshCookie');

const DUMMY_PASSWORD_HASH =
  '$2a$10$N9qo8uLOickgx2ZMRZoMyeIjZAgcfl7p92ldGxad68LJZdL17lhWy';
const INVALID_LOGIN_MESSAGE = 'Invalid email or password.';
const passwordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[\W_]).{8,}$/;

exports.register = async (req, res) => {
  const { username, email, password, role_id } = req.body;
  if (!username || !email || !password || role_id == null) {
    return res.status(400).json({ error: 'username, email, password, and role_id are required.' });
  }
  if (!passwordRegex.test(password)) {
    return res.status(400).json({ error: 'Password must be strong (8+ chars, upper, lower, number, symbol).' });
  }
  try {
    const hashedPassword = await bcrypt.hash(password, 10);
    const user = await userRepo.create({
      username: String(username).trim(),
      email: String(email).trim().toLowerCase(),
      password: hashedPassword,
      role_id,
    });
    return res.status(201).json({
      message: 'User registered successfully',
      user: {
        id: user.id,
        user_id: user.user_id,
        username: user.username,
        email: user.email,
        role_id: user.role_id,
      },
    });
  } catch (error) {
    if (error.code === '23505') return res.status(409).json({ error: 'Email already registered.' });
    return res.status(500).json({ error: 'Registration failed', details: error.message });
  }
};

exports.login = async (req, res) => {
  const { email, password } = req.body;
  if (!email || !password) {
    return res.status(400).json({ error: 'Email and password are required.' });
  }
  try {
    const user = await userRepo.findByEmail(String(email).trim().toLowerCase());
    const isMatch = await bcrypt.compare(password, user ? user.password : DUMMY_PASSWORD_HASH);
    if (!user || !isMatch) {
      return res.status(401).json({ error: INVALID_LOGIN_MESSAGE });
    }
    const accessToken = generateAccessToken(user);
    const refreshToken = generateRefreshToken(user);
    const expiresAt = new Date(Date.now() + REFRESH_MAX_AGE_MS);
    await userRepo.updateByUserId(user.user_id, {
      refresh_token: refreshToken,
      refresh_token_expires: expiresAt,
      last_login_at: new Date(),
    });
    res.cookie('refreshToken', refreshToken, refreshCookieOptions({ maxAge: REFRESH_MAX_AGE_MS }));
    return res.json({ message: 'Login successful', accessToken });
  } catch (error) {
    console.error('Login error:', error);
    return res.status(500).json({ error: 'Login failed', details: error.message });
  }
};

exports.logout = async (req, res) => {
  try {
    const token = req.cookies.refreshToken;
    if (token) await userRepo.clearRefreshToken(token);
    res.clearCookie('refreshToken', refreshCookieOptions());
    return res.json({ message: 'Logout successful' });
  } catch (error) {
    return res.status(500).json({ error: 'Logout failed', details: error.message });
  }
};

exports.refresh = async (req, res) => {
  try {
    const token = req.cookies.refreshToken;
    if (!token) return res.status(401).json({ error: 'Refresh token missing' });
    const user = await userRepo.findByRefreshToken(token);
    if (!user) return res.status(403).json({ error: 'Invalid or expired refresh token' });
    jwt.verify(token, process.env.REFRESH_TOKEN_SECRET);
    const accessToken = generateAccessToken(user);
    return res.json({ accessToken });
  } catch {
    return res.status(403).json({ error: 'Invalid or expired refresh token' });
  }
};

exports.me = async (req, res) => {
  try {
    const user = await userRepo.findByUserId(req.user.user_id);
    if (!user) return res.status(404).json({ error: 'User not found' });
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
    return res.status(500).json({ error: 'Failed to load profile', details: error.message });
  }
};

exports.forgotPassword = async (req, res) => {
  const email = String(req.body?.email || '').trim().toLowerCase();
  if (!email) return res.status(400).json({ error: 'Email is required.' });
  try {
    const user = await userRepo.findByEmail(email);
    if (user) {
      const resetToken = crypto.randomBytes(32).toString('hex');
      await userRepo.updateByUserId(user.user_id, {
        reset_token: resetToken,
        reset_token_expires: new Date(Date.now() + 60 * 60 * 1000),
      });
      const origin = String(process.env.FRONTEND_URL || 'http://localhost:5173').split(',')[0];
      await sendEmail({
        to: email,
        subject: 'Petrolenz QA/QC password reset',
        text: `Reset your password: ${origin}/reset-password?token=${resetToken}`,
      });
    }
    return res.json({ message: 'If that email is registered, a reset link was sent.' });
  } catch (error) {
    return res.status(500).json({ error: 'Failed to process request', details: error.message });
  }
};

exports.resetPassword = async (req, res) => {
  const { token, password } = req.body || {};
  if (!token || !password) return res.status(400).json({ error: 'token and password are required.' });
  if (!passwordRegex.test(password)) {
    return res.status(400).json({ error: 'Password must be strong.' });
  }
  try {
    const user = await userRepo.findByResetToken(token);
    if (!user) return res.status(400).json({ error: 'Invalid or expired reset token.' });
    const hashed = await bcrypt.hash(password, 10);
    await userRepo.updateByUserId(user.user_id, {
      password: hashed,
      reset_token: null,
      reset_token_expires: null,
    });
    return res.json({ message: 'Password updated.' });
  } catch (error) {
    return res.status(500).json({ error: 'Reset failed', details: error.message });
  }
};
