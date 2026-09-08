const express = require('express');
const sidebarRepo = require('../db/repositories/sidebarRepository');
const verifyToken = require('../middleware/verifyToken');
const { internalError } = require('../security/httpErrors');
const { isMasterRole, filterSectionsForUser } = require('../security/sidebarAccess');

const router = express.Router();
router.get('/', verifyToken, async (req, res) => {
  try {
    const isMaster = isMasterRole(req.user?.role_id);
    const sections = await sidebarRepo.listSectionsWithItems();
    const assignedIds = await sidebarRepo.listRoleItemIds(req.user?.role_id);
    return res.json(filterSectionsForUser(sections, { isMaster, assignedIds }));
  } catch (error) {
    return internalError(res, error, 'Failed to load sidebar');
  }
});

module.exports = router;
