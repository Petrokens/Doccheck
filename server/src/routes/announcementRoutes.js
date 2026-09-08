const express = require('express');
const announcements = require('../controllers/announcementController');
const verifyToken = require('../middleware/verifyToken');
const requireRole = require('../middleware/requireRole');
const requireTrustedOrigin = require('../middleware/requireTrustedOrigin');

const router = express.Router();
router.use(verifyToken);
router.get('/', announcements.listAnnouncements);
router.post('/', requireTrustedOrigin, requireRole([1]), announcements.createAnnouncement);

module.exports = router;
