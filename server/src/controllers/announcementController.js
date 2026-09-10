const announcementRepo = require('../db/repositories/announcementRepository');
const roleRepo = require('../db/repositories/roleRepository');
const { audit } = require('../security/audit');
const { publicError, internalError } = require('../security/httpErrors');
const { isMasterRole } = require('../security/sidebarAccess');

exports.listAnnouncements = async (req, res) => {
  try {
    const isMaster = isMasterRole(req.user?.role_id);
    const announcements = await announcementRepo.listForRole({
      roleId: req.user?.role_id,
      isMaster,
    });
    return res.json({ announcements, can_compose: isMaster });
  } catch (error) {
    return internalError(res, error, 'Failed to load announcements');
  }
};

exports.createAnnouncement = async (req, res) => {
  if (!isMasterRole(req.user?.role_id)) {
    return publicError(res, 403, 'Insufficient permissions');
  }
  const title = String(req.body?.title || '').trim().slice(0, 255);
  const body = String(req.body?.body || '').trim().slice(0, 8000);
  const requestedRoles = Array.isArray(req.body?.role_ids) ? req.body.role_ids : [];
  if (!title || !body) {
    return publicError(res, 400, 'Title and message are required.');
  }
  try {
    const roles = await roleRepo.findAll();
    const validIds = new Set(roles.map((role) => Number(role.id)));
    const roleIds = [...new Set(requestedRoles.map(Number).filter((id) => validIds.has(id)))];
    if (!roleIds.length) {
      return publicError(res, 400, 'Select at least one role to notify.');
    }

    const announcement = await announcementRepo.create({
      title,
      body,
      createdBy: req.user.user_id,
      roleIds,
    });

    const saved = await announcementRepo.findById(announcement.id);
    audit('announcement.create', {
      actor: req.user.user_id,
      id: announcement.id,
      roles: roleIds,
    });
    return res.status(201).json({ announcement: saved });
  } catch (error) {
    return internalError(res, error, 'Failed to create announcement');
  }
};
