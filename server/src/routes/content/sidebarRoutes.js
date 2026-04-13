const express = require('express');
const router = express.Router();
const { getSidebarStructure } = require('../../controllers/content/sidebarController');

router.get('/', getSidebarStructure);

module.exports = router;
