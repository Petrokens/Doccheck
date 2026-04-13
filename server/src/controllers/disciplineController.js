const pool = require('../config/db');

// CREATE
exports.createDiscipline = async (req, res) => {
  const { name } = req.body;
  try {
    const result = await pool.query(
      'INSERT INTO disciplines (name) VALUES ($1) RETURNING *',
      [name]
    );
    res.status(201).json(result.rows[0]);
  } catch (error) {
    res.status(500).json({ error: 'Failed to create discipline', details: error.message });
  }
};

// READ (All)
exports.getAllDisciplines = async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM disciplines ORDER BY name');
    res.json(result.rows);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch disciplines', details: error.message });
  }
};
        
// READ (Single)
exports.getDisciplineById = async (req, res) => {
  const { id } = req.params;
  try {
    const result = await pool.query('SELECT * FROM disciplines WHERE id = $1', [id]);
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Discipline not found' });
    }
    res.json(result.rows[0]);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch discipline', details: error.message });
  }
};

// UPDATE
exports.updateDiscipline = async (req, res) => {
  const { id } = req.params;
  const { name } = req.body;
  try {
    const result = await pool.query(
      'UPDATE disciplines SET name = $1 WHERE id = $2 RETURNING *',
      [name, id]
    );
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Discipline not found' });
    }
    res.json(result.rows[0]);
  } catch (error) {
    res.status(500).json({ error: 'Failed to update discipline', details: error.message });
  }
};

// DELETE
exports.deleteDiscipline = async (req, res) => {
  const { id } = req.params;
  try {
    const result = await pool.query(
      'DELETE FROM disciplines WHERE id = $1 RETURNING *',
      [id]
    );
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Discipline not found' });
    }
    res.json({ message: 'Discipline deleted successfully' });
  } catch (error) {
    res.status(500).json({ error: 'Failed to delete discipline', details: error.message });
  }
};
