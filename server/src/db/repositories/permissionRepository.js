const { pool } = require('../../config/db');

async function findAll() {
  const { rows } = await pool.query('SELECT * FROM permissions ORDER BY id ASC');
  return rows;
}

async function findKeysForRole(roleId) {
  const { rows } = await pool.query(
    `SELECT p.key FROM permissions p
     INNER JOIN role_permissions rp ON rp.permission_id = p.id
     WHERE rp.role_id = $1`,
    [roleId],
  );
  return rows.map((r) => r.key);
}

async function setRolePermissions(roleId, permissionIds) {
  await pool.query('DELETE FROM role_permissions WHERE role_id = $1', [roleId]);
  for (const pid of permissionIds || []) {
    await pool.query(
      `INSERT INTO role_permissions (role_id, permission_id) VALUES ($1, $2) ON CONFLICT DO NOTHING`,
      [roleId, pid],
    );
  }
}

async function findRolePermissionIds(roleId) {
  const { rows } = await pool.query(
    'SELECT permission_id FROM role_permissions WHERE role_id = $1',
    [roleId],
  );
  return rows.map((r) => r.permission_id);
}

module.exports = { findAll, findKeysForRole, setRolePermissions, findRolePermissionIds };
