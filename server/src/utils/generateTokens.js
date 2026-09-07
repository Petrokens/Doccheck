const jwt = require('jsonwebtoken');

function generateAccessToken(user) {
  return jwt.sign(
    { user_id: user.user_id, role_id: user.role_id },
    process.env.ACCESS_TOKEN_SECRET,
    { expiresIn: '15m' },
  );
}

function generateRefreshToken(user) {
  return jwt.sign(
    { user_id: user.user_id },
    process.env.REFRESH_TOKEN_SECRET,
    { expiresIn: '7d' },
  );
}

module.exports = { generateAccessToken, generateRefreshToken };
