const express = require('express');
const sidebarRepo = require('../db/repositories/sidebarRepository');
const verifyToken = require('../middleware/verifyToken');

const router = express.Router();
router.get('/', verifyToken, async (_req, res) => {
  try {
    const sections = await sidebarRepo.listSectionsWithItems();
    return res.json(sections);
  } catch (error) {
    return res.status(500).json({ error: 'Failed to load sidebar', details: error.message });
  }
});

module.exports = router;
