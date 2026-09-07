const { pool } = require('../../config/db');

async function findById(id) {
  const { rows } = await pool.query('SELECT * FROM roles WHERE id = $1', [id]);
  return rows[0] || null;
}

async function findAll() {
  const { rows } = await pool.query('SELECT * FROM roles ORDER BY id ASC');
  return rows;
}

async function create({ id, name }) {
  const { rows } = await pool.query(
    `INSERT INTO roles (id, name) VALUES ($1, $2)
     ON CONFLICT (id) DO UPDATE SET name = EXCLUDED.name, updated_at = NOW()
     RETURNING *`,
    [id, name],
  );
  return rows[0];
}

async function update(id, { name }) {
  const { rows } = await pool.query(
    `UPDATE roles SET name = $1, updated_at = NOW() WHERE id = $2 RETURNING *`,
    [name, id],
  );
  return rows[0] || null;
}

async function remove(id) {
  await pool.query('DELETE FROM roles WHERE id = $1', [id]);
}

module.exports = { findById, findAll, create, update, remove };
