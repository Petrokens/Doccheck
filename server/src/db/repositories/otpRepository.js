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

async function findLatestOpenForUser(userId) {
  const { rows } = await pool.query(
    `SELECT * FROM login_otp_challenges
     WHERE user_id = $1::uuid
       AND consumed_at IS NULL
       AND expires_at > NOW()
     ORDER BY created_at DESC
     LIMIT 1`,
    [userId],
  );
  return rows[0] || null;
}

async function incrementAttempts(id) {
  const { rows } = await pool.query(
    `UPDATE login_otp_challenges
     SET attempts = attempts + 1
     WHERE id = $1::uuid
     RETURNING *`,
    [id],
  );
  return rows[0] || null;
}

async function consume(id) {
  const { rows } = await pool.query(
    `UPDATE login_otp_challenges
     SET consumed_at = NOW()
     WHERE id = $1::uuid AND consumed_at IS NULL
     RETURNING *`,
    [id],
  );
  return rows[0] || null;
}

async function invalidateOpenForUser(userId, exceptId = null) {
  if (exceptId) {
    await pool.query(
      `UPDATE login_otp_challenges
       SET consumed_at = COALESCE(consumed_at, NOW())
       WHERE user_id = $1::uuid
         AND consumed_at IS NULL
         AND id <> $2::uuid`,
      [userId, exceptId],
    );
    return;
  }
  await pool.query(
    `UPDATE login_otp_challenges
     SET consumed_at = COALESCE(consumed_at, NOW())
     WHERE user_id = $1::uuid AND consumed_at IS NULL`,
    [userId],
  );
}

async function rotateChallenge({ id, otpHash, expiresAt }) {
  const { rows } = await pool.query(
    `UPDATE login_otp_challenges
     SET otp_hash = $2,
         expires_at = $3,
         attempts = 0,
         consumed_at = NULL
     WHERE id = $1::uuid
       AND consumed_at IS NULL
     RETURNING *`,
    [id, otpHash, expiresAt],
  );
  return rows[0] || null;
}

module.exports = {
  createChallenge,
  findById,
  findLatestOpenForUser,
  incrementAttempts,
  consume,
  invalidateOpenForUser,
  rotateChallenge,
};
