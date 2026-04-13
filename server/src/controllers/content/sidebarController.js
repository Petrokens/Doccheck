const pool = require('../../config/db');

exports.getSidebarStructure = async (req, res) => {
  try {
    const sectionsResult = await pool.query(
      'SELECT * FROM sidebar_sections ORDER BY display_order'
    );

    const sections = [];

    for (const section of sectionsResult.rows) {
      const itemsResult = await pool.query(
        'SELECT * FROM sidebar_items WHERE section_id = $1 ORDER BY display_order',
        [section.id]
      );

      sections.push({
        title: section.name,
        items: itemsResult.rows.map(item => ({
          label: item.label,
          // Legacy seed used "&" in the path, which breaks URL parsing (query string delimiter).
          path:
            item.path === '/dashboard/civil-&-structural'
              ? '/dashboard/civil-structural'
              : item.path,
          icon: item.icon_name
        }))
      });
    }

    res.json(sections);
  } catch (error) {
    console.error('Failed to fetch sidebar:', error.message);
    res.status(500).json({ error: 'Internal server error' });
  }
};
