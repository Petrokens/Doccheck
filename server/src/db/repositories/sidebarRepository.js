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

async function listSectionsWithItems() {
  const { rows: sections } = await pool.query(
    'SELECT * FROM sidebar_sections ORDER BY display_order, id',
  );
  const { rows: items } = await pool.query(
    'SELECT * FROM sidebar_items ORDER BY display_order, id',
  );
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

module.exports = {
  upsertSection,
  upsertItem,
  deleteItem,
  deleteItemsNotIn,
  deleteSection,
  deleteSectionsNotIn,
  listSectionsWithItems,
};
