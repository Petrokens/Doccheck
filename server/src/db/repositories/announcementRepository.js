const { pool } = require('../../config/db');

function mapRow(row) {
  if (!row) return null;
  return {
    id: row.id,
    title: row.title,
    body: row.body,
    created_by: row.created_by,
    created_by_name: row.created_by_name || 'Master Admin',
    email_sent: Boolean(row.email_sent),
    email_sent_at: row.email_sent_at,
    recipient_count: Number(row.recipient_count || 0),
    created_at: row.created_at,
    role_ids: Array.isArray(row.role_ids) ? row.role_ids.map(Number) : [],
    role_names: Array.isArray(row.role_names) ? row.role_names : [],
  };
}

async function create({ title, body, createdBy, roleIds }) {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const { rows } = await client.query(
      `INSERT INTO announcements (title, body, created_by)
       VALUES ($1, $2, $3::uuid)
       RETURNING *`,
      [title, body, createdBy],
    );
    const announcement = rows[0];
    const ids = [...new Set((roleIds || []).map(Number).filter((id) => Number.isInteger(id) && id > 0))];
    if (ids.length) {
      await client.query(
        `INSERT INTO announcement_roles (announcement_id, role_id)
         SELECT $1, x FROM unnest($2::int[]) AS x
         ON CONFLICT DO NOTHING`,
        [announcement.id, ids],
      );
    }
    await client.query('COMMIT');
    return findById(announcement.id);
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
}

const ROLE_AGG = `
  COALESCE((
    SELECT array_agg(r.id ORDER BY r.id)
    FROM announcement_roles ar
    JOIN roles r ON r.id = ar.role_id
    WHERE ar.announcement_id = a.id
  ), ARRAY[]::int[]) AS role_ids,
  COALESCE((
    SELECT array_agg(r.name ORDER BY r.id)
    FROM announcement_roles ar
    JOIN roles r ON r.id = ar.role_id
    WHERE ar.announcement_id = a.id
  ), ARRAY[]::text[]) AS role_names`;

async function findById(id) {
  const { rows } = await pool.query(
    `SELECT a.*, u.username AS created_by_name, ${ROLE_AGG}
     FROM announcements a
     LEFT JOIN users u ON u.user_id = a.created_by
     WHERE a.id = $1`,
    [id],
  );
  return mapRow(rows[0]);
}

async function listForRole({ roleId, isMaster }) {
  const params = [];
  let where = '';
  if (!isMaster) {
    params.push(Number(roleId));
    where = `WHERE EXISTS (
      SELECT 1 FROM announcement_roles ar
      WHERE ar.announcement_id = a.id AND ar.role_id = $1
    )`;
  }
  const { rows } = await pool.query(
    `SELECT a.*, u.username AS created_by_name, ${ROLE_AGG}
     FROM announcements a
     LEFT JOIN users u ON u.user_id = a.created_by
     ${where}
     ORDER BY a.created_at DESC
     LIMIT 200`,
    params,
  );
  return rows.map(mapRow);
}

async function markEmailed(id, recipientCount) {
  const { rows } = await pool.query(
    `UPDATE announcements
     SET email_sent = TRUE, email_sent_at = NOW(), recipient_count = $2, updated_at = NOW()
     WHERE id = $1
     RETURNING *`,
    [id, recipientCount],
  );
  return rows[0] || null;
}

module.exports = { create, findById, listForRole, markEmailed };
