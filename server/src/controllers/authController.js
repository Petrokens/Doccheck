const pool = require('../config/db');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const { sendEmail } = require('../utils/sendEmail');
const { generateAccessToken, generateRefreshToken } = require('../utils/generateTokens');

// Password strength regex
const passwordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[\W_]).{8,}$/;

// =====================
// Register
// =====================
exports.register = async (req, res) => {
  const { username, email, password, role_id } = req.body;

  if (!passwordRegex.test(password)) {
    return res.status(400).json({ error: 'Password must be strong and meet complexity requirements.' });
  }

  try {
    const hashedPassword = await bcrypt.hash(password, 10);
    const result = await pool.query(
      `INSERT INTO users (username, email, password, role_id)
       VALUES ($1, LOWER($2), $3, $4)
       RETURNING id, user_id, username, email, role_id`,
      [username, email, hashedPassword, role_id]
    );

    res.status(201).json({ message: 'User registered successfully', user: result.rows[0] });
  } catch (error) {
    res.status(500).json({ error: 'Registration failed', details: error.message });
  }
};


// =====================
// Login
// =====================
exports.login = async (req, res) => {
  const { email, password } = req.body;

  try {
    const result = await pool.query('SELECT * FROM users WHERE email = LOWER($1)', [email]);
    const user = result.rows[0];

    if (!user) return res.status(404).json({ error: 'User not found' });

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) return res.status(401).json({ error: 'Invalid credentials' });

    const accessToken = generateAccessToken(user);
    const refreshToken = generateRefreshToken(user);
    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7 days

    // Store refresh token in DB
    await pool.query(
      `UPDATE users SET refresh_token = $1, refresh_token_expires = $2, updated_at = CURRENT_TIMESTAMP WHERE id = $3`,
      [refreshToken, expiresAt, user.id]
    );

    // Set HTTP-only secure cookie
    res.cookie('refreshToken', refreshToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'Strict',
      maxAge: 7 * 24 * 60 * 60 * 1000
    });

    res.json({ message: 'Login successful', accessToken });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ error: 'Login failed', details: error.message });
    
  }
};

// =====================
// Logout
// =====================
exports.logout = async (req, res) => {
  try {
    const token = req.cookies.refreshToken;

    if (token) {
      await pool.query(
        `UPDATE users SET refresh_token = NULL, refresh_token_expires = NULL WHERE refresh_token = $1`,
        [token]
      );
    }

    res.clearCookie('refreshToken', { httpOnly: true, sameSite: 'Strict', secure: process.env.NODE_ENV === 'production' });
    res.json({ message: 'Logout successful' });
  } catch (error) {
    res.status(500).json({ error: 'Logout failed', details: error.message });
  }
};

// =====================
// Refresh Token
// =====================
exports.refresh = async (req, res) => {
  try {
    const token = req.cookies.refreshToken;
    if (!token) return res.status(401).json({ error: 'Refresh token missing' });

    // Check DB for token validity
    const userResult = await pool.query(
      `SELECT * FROM users WHERE refresh_token = $1 AND refresh_token_expires > NOW()`,
      [token]
    );
    const user = userResult.rows[0];
    if (!user) return res.status(403).json({ error: 'Invalid or expired refresh token' });

    // Verify token signature
    jwt.verify(token, process.env.REFRESH_TOKEN_SECRET, (err, decoded) => {
      if (err) return res.status(403).json({ error: 'Invalid refresh token' });

      const accessToken = generateAccessToken(user);
      return res.json({ accessToken });
    });
  } catch (error) {
    res.status(500).json({ error: 'Token refresh failed', details: error.message });
  }
};

// =====================
// Forgot Password
// =====================
exports.forgotPassword = async (req, res) => {
  const { email } = req.body;

  try {
    const result = await pool.query('SELECT * FROM users WHERE email = LOWER($1)', [email]);
    const user = result.rows[0];
    if (!user) return res.status(404).json({ error: 'User not found' });

    const token = crypto.randomBytes(32).toString('hex');
    const expires = new Date(Date.now() + 3600000); // 1 hour

    await pool.query(
      'UPDATE users SET reset_token = $1, reset_token_expires = $2 WHERE id = $3',
      [token, expires, user.id]
    );

    const resetLink = `${process.env.FRONTEND_URL}/reset-password/${token}`;
    await sendEmail(email, 'Reset Password', `Click the link to reset your password: ${resetLink}`);

    res.json({ message: 'Reset link sent to email' });
  } catch (error) {
    res.status(500).json({ error: 'Failed to send reset email', details: error.message });
  }
};

// =====================
// Reset Password
// =====================
exports.resetPassword = async (req, res) => {
  const { token, password } = req.body;

  if (!passwordRegex.test(password)) {
    return res.status(400).json({ error: 'Password must be strong (uppercase, lowercase, number, special character).' });
  }

  try {
    const result = await pool.query(
      'SELECT * FROM users WHERE reset_token = $1 AND reset_token_expires > NOW()',
      [token]
    );

    const user = result.rows[0];
    if (!user) return res.status(400).json({ error: 'Invalid or expired token' });

    const hashed = await bcrypt.hash(password, 10);

    await pool.query(
      `UPDATE users SET password = $1, reset_token = NULL, reset_token_expires = NULL WHERE id = $2`,
      [hashed, user.id]
    );

    res.json({ message: 'Password reset successful' });
  } catch (error) {
    res.status(500).json({ error: 'Password reset failed', details: error.message });
  }
};

