const crypto = require('crypto');
const { pool } = require('../../config/db');

function mapUser(row) {
  if (!row) return null;
  return {
    id: row.id,
    user_id: row.user_id,
    username: row.username,
    email: row.email,
    password: row.password,
    role_id: row.role_id,
    refresh_token: row.refresh_token,
    refresh_token_expires: row.refresh_token_expires,
    last_login_at: row.last_login_at,
    reset_token: row.reset_token,
    reset_token_expires: row.reset_token_expires,
    created_at: row.created_at,
    updated_at: row.updated_at,
  };
}

async function create({ username, email, password, role_id, user_id }) {
  const uid = user_id || crypto.randomUUID();
  const { rows } = await pool.query(
    `INSERT INTO users (user_id, username, email, password, role_id)
     VALUES ($1::uuid, $2, $3, $4, $5) RETURNING *`,
    [uid, username, email, password, role_id],
  );
  return mapUser(rows[0]);
}

async function findByEmail(email) {
  const { rows } = await pool.query('SELECT * FROM users WHERE email = $1 LIMIT 1', [email]);
  return mapUser(rows[0]);
}

async function findByUserId(userId) {
  const { rows } = await pool.query('SELECT * FROM users WHERE user_id = $1::uuid LIMIT 1', [userId]);
  return mapUser(rows[0]);
}

async function findByUserIds(ids) {
  if (!ids?.length) return [];
  const { rows } = await pool.query(
    'SELECT user_id, username, email FROM users WHERE user_id = ANY($1::uuid[])',
    [ids],
  );
  return rows;
}

async function findByRefreshToken(token) {
  const { rows } = await pool.query(
    `SELECT * FROM users WHERE refresh_token = $1 AND refresh_token_expires > NOW() LIMIT 1`,
    [token],
  );
  return mapUser(rows[0]);
}

async function findByResetToken(token) {
  const { rows } = await pool.query(
    `SELECT * FROM users WHERE reset_token = $1 AND reset_token_expires > NOW() LIMIT 1`,
    [token],
  );
  return mapUser(rows[0]);
}

async function clearRefreshToken(token) {
  await pool.query(
    `UPDATE users SET refresh_token = NULL, refresh_token_expires = NULL, updated_at = NOW()
     WHERE refresh_token = $1`,
    [token],
  );
}

async function findAllSorted() {
  const { rows } = await pool.query(
    `SELECT id, user_id, username, email, role_id, last_login_at, created_at
     FROM users ORDER BY created_at ASC`,
  );
  return rows.map(mapUser);
}

async function updateByUserId(userId, fields) {
  const allowed = [
    'username',
    'email',
    'password',
    'role_id',
    'refresh_token',
    'refresh_token_expires',
    'last_login_at',
    'reset_token',
    'reset_token_expires',
  ];
  const sets = [];
  const values = [];
  let i = 1;
  for (const [key, value] of Object.entries(fields || {})) {
    if (!allowed.includes(key)) continue;
    sets.push(`${key} = $${i}`);
    values.push(value);
    i += 1;
  }
  if (!sets.length) return findByUserId(userId);
  values.push(userId);
  const { rows } = await pool.query(
    `UPDATE users SET ${sets.join(', ')}, updated_at = NOW() WHERE user_id = $${i}::uuid RETURNING *`,
    values,
  );
  return mapUser(rows[0]);
}

async function deleteByUserId(userId) {
  await pool.query('DELETE FROM users WHERE user_id = $1::uuid', [userId]);
}

module.exports = {
  create,
  findByEmail,
  findByUserId,
  findByUserIds,
  findByRefreshToken,
  findByResetToken,
  clearRefreshToken,
  findAllSorted,
  updateByUserId,
  deleteByUserId,
};
