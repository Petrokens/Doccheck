const { pool } = require('../../config/db');

async function createChallenge({ id, userId, otpHash, expiresAt }) {
  const { rows } = await pool.query(
    `INSERT INTO login_otp_challenges (id, user_id, otp_hash, expires_at)
     VALUES ($1::uuid, $2::uuid, $3, $4)
     RETURNING *`,
    [id, userId, otpHash, expiresAt],
  );
  return rows[0];
}

async function findById(id) {
  const { rows } = await pool.query(
    'SELECT * FROM login_otp_challenges WHERE id = $1::uuid LIMIT 1',
    [id],
  );
  return rows[0] || null;
}

async function incrementAttempts(id) {
  const { rows } = await pool.query(
    `UPDATE login_otp_challenges
     SET attempts = attempts + 1
     WHERE id = $1::uuid
     RETURNING attempts`,
    [id],
  );
  return Number(rows[0]?.attempts || 0);
}

async function consume(id) {
  await pool.query(
    `UPDATE login_otp_challenges SET consumed_at = NOW() WHERE id = $1::uuid AND consumed_at IS NULL`,
    [id],
  );
}

async function invalidateOpenForUser(userId) {
  await pool.query(
    `UPDATE login_otp_challenges
     SET consumed_at = NOW()
     WHERE user_id = $1::uuid AND consumed_at IS NULL`,
    [userId],
  );
}

module.exports = {
  createChallenge,
  findById,
  incrementAttempts,
  consume,
  invalidateOpenForUser,
};
