const { pool } = require('../../config/db');

async function upsertSection(section) {
  await pool.query(
    `INSERT INTO sidebar_sections (id, name, display_order)
     VALUES ($1, $2, $3)
     ON CONFLICT (id) DO UPDATE SET name = EXCLUDED.name, display_order = EXCLUDED.display_order, updated_at = NOW()`,
    [section.id, section.name, section.display_order],
  );
}

async function upsertItem(item) {
  await pool.query(
    `INSERT INTO sidebar_items (id, section_id, label, path, icon_name, display_order)
     VALUES ($1, $2, $3, $4, $5, $6)
     ON CONFLICT (id) DO UPDATE SET
       section_id = EXCLUDED.section_id,
       label = EXCLUDED.label,
       path = EXCLUDED.path,
       icon_name = EXCLUDED.icon_name,
       display_order = EXCLUDED.display_order,
       updated_at = NOW()`,
    [item.id, item.section_id, item.label, item.path, item.icon_name, item.display_order],
  );
}

async function deleteItem(id) {
  await pool.query('DELETE FROM sidebar_items WHERE id = $1', [id]);
}

async function deleteItemsNotIn(ids) {
  if (!ids?.length) return;
  await pool.query('DELETE FROM sidebar_items WHERE NOT (id = ANY($1::int[]))', [ids]);
}

async function deleteSection(id) {
  await pool.query('DELETE FROM sidebar_sections WHERE id = $1', [id]);
}

async function deleteSectionsNotIn(ids) {
  if (!ids?.length) return;
  await pool.query('DELETE FROM sidebar_sections WHERE NOT (id = ANY($1::int[]))', [ids]);
}

async function listRawItems() {
  const { rows } = await pool.query(
    'SELECT id, section_id, label, path, icon_name, display_order FROM sidebar_items ORDER BY display_order, id',
  );
  return rows;
}

async function listSectionsWithItems() {
  const { rows: sections } = await pool.query(
    'SELECT * FROM sidebar_sections ORDER BY display_order, id',
  );
  const items = await listRawItems();
  return sections.map((section) => ({
    id: section.id,
    title: section.name,
    items: items
      .filter((item) => item.section_id === section.id)
      .map((item) => ({
        id: item.id,
        label: item.label,
        path: item.path,
        icon_key: String(item.icon_name || '').toLowerCase(),
      })),
  }));
}

async function listRoleItemIds(roleId) {
  if (!roleId) return [];
  const { rows } = await pool.query(
    'SELECT sidebar_item_id FROM role_sidebar_items WHERE role_id = $1 ORDER BY sidebar_item_id',
    [roleId],
  );
  return rows.map((row) => Number(row.sidebar_item_id));
}

async function setRoleItemIds(roleId, ids) {
  const itemIds = [...new Set((ids || []).map(Number).filter((id) => Number.isInteger(id) && id > 0))];
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    await client.query('DELETE FROM role_sidebar_items WHERE role_id = $1', [roleId]);
    if (itemIds.length) {
      await client.query(
        `INSERT INTO role_sidebar_items (role_id, sidebar_item_id)
         SELECT $1, x FROM unnest($2::int[]) AS x
         ON CONFLICT DO NOTHING`,
        [roleId, itemIds],
      );
    }
    await client.query('COMMIT');
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
  return listRoleItemIds(roleId);
}

module.exports = {
  upsertSection,
  upsertItem,
  deleteItem,
  deleteItemsNotIn,
  deleteSection,
  deleteSectionsNotIn,
  listRawItems,
  listSectionsWithItems,
  listRoleItemIds,
  setRoleItemIds,
};
