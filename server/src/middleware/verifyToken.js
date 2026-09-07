const jwt = require('jsonwebtoken');
const userRepo = require('../db/repositories/userRepository');

module.exports = async function verifyToken(req, res, next) {
  try {
    const authHeader = req.headers.authorization;
    const token = authHeader && authHeader.startsWith('Bearer ') ? authHeader.slice(7) : null;
    if (!token) {
      return res.status(401).json({ error: 'Access token required' });
    }
    let payload;
    try {
      payload = jwt.verify(token, process.env.ACCESS_TOKEN_SECRET);
    } catch (err) {
      if (err.name === 'TokenExpiredError') {
        return res.status(401).json({ error: 'Access token expired' });
      }
      return res.status(403).json({ error: 'Invalid or malformed token' });
    }
    const dbUser = await userRepo.findByUserId(payload.user_id);
    if (!dbUser) {
      return res.status(401).json({ error: 'Account is no longer valid' });
    }
    req.user = { user_id: dbUser.user_id, role_id: dbUser.role_id };
    return next();
  } catch (error) {
    return res.status(401).json({ error: 'Authentication failed' });
  }
};
