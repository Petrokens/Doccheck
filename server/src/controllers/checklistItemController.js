const pool = require('../config/db');

// Create a checklist item
exports.createChecklistItem = async (req, res) => {
  const { checklist_id, item_text, is_required = true, order_index = 0 } = req.body;

  if (!checklist_id || !item_text) {
    return res.status(400).json({ error: 'Checklist ID and item text are required' });
  }

  try {
    const result = await pool.query(
      `INSERT INTO checklist_items (checklist_id, item_text, is_required, order_index)
       VALUES ($1, $2, $3, $4)
       RETURNING *`,
      [checklist_id, item_text, is_required, order_index]
    );

    res.status(201).json({ message: 'Checklist item created', item: result.rows[0] });
  } catch (error) {
    res.status(500).json({ error: 'Failed to create checklist item', details: error.message });
  }
};

// Get all items for a checklist
exports.getChecklistItems = async (req, res) => {
  const { checklist_id } = req.params;

  try {
    const result = await pool.query(
      `SELECT * FROM checklist_items WHERE checklist_id = $1 ORDER BY order_index ASC`,
      [checklist_id]
    );
    res.json({ items: result.rows });
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch checklist items', details: error.message });
  }
};

// Update a checklist item
exports.updateChecklistItem = async (req, res) => {
  const { id } = req.params;
  const { item_text, is_required, order_index } = req.body;

  try {
    const result = await pool.query(
      `UPDATE checklist_items
       SET item_text = $1,
           is_required = $2,
           order_index = $3
       WHERE id = $4
       RETURNING *`,
      [item_text, is_required, order_index, id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Checklist item not found' });
    }

    res.json({ message: 'Checklist item updated', item: result.rows[0] });
  } catch (error) {
    res.status(500).json({ error: 'Failed to update checklist item', details: error.message });
  }
};

// Delete a checklist item
exports.deleteChecklistItem = async (req, res) => {
  const { id } = req.params;

  try {
    const result = await pool.query(`DELETE FROM checklist_items WHERE id = $1 RETURNING *`, [id]);

    if (result.rowCount === 0) {
      return res.status(404).json({ error: 'Checklist item not found' });
    }

    res.json({ message: 'Checklist item deleted successfully' });
  } catch (error) {
    res.status(500).json({ error: 'Failed to delete checklist item', details: error.message });
  }
};
