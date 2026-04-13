const pool = require('../config/db');
const fs = require('fs');
const path = require('path');
const { extractTextFromFile } = require('../services/parserService');

// Upload and parse checklist document (PDF, DOCX, etc.)
exports.uploadChecklist = async (req, res) => {
  const { title, discipline_id, uploaded_by } = req.body;
  const file = req.file;

  if (!file || !title || !discipline_id) {
    return res.status(400).json({ error: 'Title, discipline_id, and file are required' });
  }

  try {
    const filePath = path.join(__dirname, '../../uploads/', file.filename);

    // Step 1: Extract text lines using textract
    const items = await extractTextFromFile(filePath);

    // Step 2: Insert checklist record
    const checklistResult = await pool.query(
      `INSERT INTO checklists (title, discipline_id, uploaded_by)
       VALUES ($1, $2, $3) RETURNING id`,
      [title, discipline_id, uploaded_by || null]
    );
    const checklistId = checklistResult.rows[0].id;

    // Step 3: Insert checklist items
    const insertPromises = items.map((item, index) =>
      pool.query(
        `INSERT INTO checklist_items (checklist_id, item_text, order_index)
         VALUES ($1, $2, $3)`,
        [checklistId, item, index + 1]
      )
    );
    await Promise.all(insertPromises);

    // Step 4: Remove file after parsing
    fs.unlinkSync(filePath);

    res.status(201).json({
      message: 'Checklist uploaded and items saved',
      checklist_id: checklistId,
      item_count: items.length
    });
  } catch (error) {
    res.status(500).json({ error: 'Upload failed', details: error.message });
  }
};

// Get all checklists with discipline name
exports.getAllChecklists = async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT c.*, d.name AS discipline_name
      FROM checklists c
      JOIN disciplines d ON c.discipline_id = d.id
      ORDER BY c.created_at DESC
    `);
    res.json({ checklists: result.rows });
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch checklists', details: error.message });
  }
};

// Get checklist by ID (with items)
exports.getChecklistById = async (req, res) => {
  const { id } = req.params;

  try {
    const checklistResult = await pool.query(
      `SELECT c.*, d.name AS discipline_name
       FROM checklists c
       JOIN disciplines d ON c.discipline_id = d.id
       WHERE c.id = $1`,
      [id]
    );

    if (checklistResult.rows.length === 0) {
      return res.status(404).json({ error: 'Checklist not found' });
    }

    const itemsResult = await pool.query(
      `SELECT * FROM checklist_items WHERE checklist_id = $1 ORDER BY order_index ASC`,
      [id]
    );

    res.json({
      checklist: checklistResult.rows[0],
      items: itemsResult.rows
    });
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch checklist', details: error.message });
  }
};

// Delete checklist (cascades to items)
exports.deleteChecklist = async (req, res) => {
  const { id } = req.params;

  try {
    const result = await pool.query(`DELETE FROM checklists WHERE id = $1 RETURNING *`, [id]);
    if (result.rowCount === 0) {
      return res.status(404).json({ error: 'Checklist not found' });
    }
    res.json({ message: 'Checklist deleted successfully' });
  } catch (error) {
    res.status(500).json({ error: 'Failed to delete checklist', details: error.message });
  }
};
