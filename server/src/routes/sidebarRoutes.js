const express = require('express');
const sidebarRepo = require('../db/repositories/sidebarRepository');
const verifyToken = require('../middleware/verifyToken');
const { internalError } = require('../security/httpErrors');

const MASTER_ONLY_PATHS = new Set([
  '/dashboard/users',
  '/dashboard/roles',
  '/dashboard/permissions',
  '/dashboard/env-settings',
  '/dashboard/audit-reports',
  '/dashboard/system-logs',
  '/dashboard/api-docs',
]);

const router = express.Router();
router.get('/', verifyToken, async (req, res) => {
  try {
    const isMaster = Number(req.user?.role_id) === 1;
    const sections = await sidebarRepo.listSectionsWithItems();
    const filtered = sections
      .filter((section) => !['analytics', 'system'].includes(String(section.title || '').toLowerCase()))
      .map((section) => ({
        ...section,
        items: section.items.filter((item) => isMaster || !MASTER_ONLY_PATHS.has(item.path)),
      }))
      .filter((section) => section.items.length);
    return res.json(filtered);
  } catch (error) {
    return internalError(res, error, 'Failed to load sidebar');
  }
});

module.exports = router;
