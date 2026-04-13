const pool = require('../config/db');

// Get all roles (already provided)
exports.getRoles = async (req, res) => {
  try {
    const result = await pool.query('SELECT id, name FROM roles ORDER BY id');
    res.json(result.rows);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch roles', details: error.message });
  }
};

// Create a new role
exports.createRole = async (req, res) => {
  const { name } = req.body;
  if (!name) return res.status(400).json({ error: 'Role name is required' });

  try {
    const result = await pool.query(
      'INSERT INTO roles (name) VALUES ($1) RETURNING *',
      [name]
    );
    res.status(201).json(result.rows[0]);
  } catch (error) {
    res.status(500).json({ error: 'Failed to create role', details: error.message });
  }
};

// Update a role
exports.updateRole = async (req, res) => {
  const { id } = req.params;
  const { name } = req.body;
  if (!name) return res.status(400).json({ error: 'Role name is required' });

  try {
    const result = await pool.query(
      'UPDATE roles SET name = $1 WHERE id = $2 RETURNING *',
      [name, id]
    );

    if (result.rowCount === 0) {
      return res.status(404).json({ error: 'Role not found' });
    }

    res.json(result.rows[0]);
  } catch (error) {
    res.status(500).json({ error: 'Failed to update role', details: error.message });
  }
};

// Delete a role
exports.deleteRole = async (req, res) => {
  const { id } = req.params;

  try {
    const result = await pool.query(
      'DELETE FROM roles WHERE id = $1 RETURNING *',
      [id]
    );

    if (result.rowCount === 0) {
      return res.status(404).json({ error: 'Role not found' });
    }

    res.json({ message: 'Role deleted successfully', deletedRole: result.rows[0] });
  } catch (error) {
    res.status(500).json({ error: 'Failed to delete role', details: error.message });
  }
};
