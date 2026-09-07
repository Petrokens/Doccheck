const userRepo = require('../db/repositories/userRepository');
const roleRepo = require('../db/repositories/roleRepository');
const permissionRepo = require('../db/repositories/permissionRepository');
const { publicError, internalError } = require('../security/httpErrors');
const { audit, recent, startedAt } = require('../security/audit');

exports.listUsers = async (_req, res) => {
  try {
    const users = await userRepo.findAllSorted();
    return res.json({
      users: users.map((u) => ({
        id: u.id,
        user_id: u.user_id,
        username: u.username,
        email: u.email,
        role_id: u.role_id,
        last_login_at: u.last_login_at,
        created_at: u.created_at,
      })),
    });
  } catch (error) {
    return internalError(res, error, 'Failed to list users');
  }
};

exports.updateUser = async (req, res) => {
  try {
    const targetId = String(req.params.userId || '');
    if (!targetId) return publicError(res, 400, 'User id required');
    const target = await userRepo.findByUserId(targetId);
    if (!target) return publicError(res, 404, 'User not found');

    const patch = {};
    if (req.body?.username != null) {
      const username = String(req.body.username || '').trim().slice(0, 255);
      if (!username) return publicError(res, 400, 'Username is required');
      patch.username = username;
    }
    if (req.body?.role_id != null && req.body.role_id !== '') {
      const roleId = Number(req.body.role_id);
      if (!Number.isInteger(roleId) || roleId < 1) return publicError(res, 400, 'Invalid role');
      const role = await roleRepo.findById(roleId);
      if (!role) return publicError(res, 404, 'Role not found');
      if (Number(target.role_id) === 1 && roleId !== 1) {
        const masters = await userRepo.countByRole(1);
        if (masters <= 1) return publicError(res, 400, 'Cannot demote the last Master user.');
      }
      patch.role_id = roleId;
    }
    if (!Object.keys(patch).length) return publicError(res, 400, 'No changes provided');

    const updated = await userRepo.updateByUserId(targetId, patch);
    audit('admin.user_update', { actor: req.user?.user_id, target: targetId, fields: Object.keys(patch) });
    return res.json({
      user: {
        id: updated.id,
        user_id: updated.user_id,
        username: updated.username,
        email: updated.email,
        role_id: updated.role_id,
        last_login_at: updated.last_login_at,
        created_at: updated.created_at,
      },
    });
  } catch (error) {
    return internalError(res, error, 'Failed to update user');
  }
};

exports.listSystemLogs = async (_req, res) => {
  try {
    return res.json({
      startedAt,
      now: new Date().toISOString(),
      node: process.version,
      env: process.env.NODE_ENV || 'development',
      events: recent(200),
    });
  } catch (error) {
    return internalError(res, error, 'Failed to load system logs');
  }
};

exports.deleteUser = async (req, res) => {
  try {
    const targetId = String(req.params.userId || '');
    if (!targetId) return publicError(res, 400, 'User id required');
    if (targetId === String(req.user?.user_id)) {
      return publicError(res, 400, 'You cannot delete your own account.');
    }
    const target = await userRepo.findByUserId(targetId);
    if (!target) return publicError(res, 404, 'User not found');
    if (Number(target.role_id) === 1) {
      const masters = await userRepo.countByRole(1);
      if (masters <= 1) return publicError(res, 400, 'Cannot delete the last Master user.');
    }
    await userRepo.deleteByUserId(targetId);
    audit('admin.user_delete', { actor: req.user?.user_id, target: targetId });
    return res.json({ message: 'User deleted' });
  } catch (error) {
    return internalError(res, error, 'Failed to delete user');
  }
};

exports.listRoles = async (_req, res) => {
  try {
    const roles = await roleRepo.findAll();
    return res.json({ roles });
  } catch (error) {
    return internalError(res, error, 'Failed to list roles');
  }
};

exports.createRole = async (req, res) => {
  try {
    const name = String(req.body?.name || '').trim().slice(0, 64);
    if (!name) return publicError(res, 400, 'Role name is required');
    const roles = await roleRepo.findAll();
    const nextId = Math.max(0, ...roles.map((r) => r.id)) + 1;
    const role = await roleRepo.create({ id: nextId, name });
    audit('admin.role_create', { actor: req.user?.user_id, role_id: role.id });
    return res.status(201).json({ role });
  } catch (error) {
    return internalError(res, error, 'Failed to create role');
  }
};

exports.updateRole = async (req, res) => {
  try {
    const name = String(req.body?.name || '').trim().slice(0, 64);
    if (!name) return publicError(res, 400, 'Role name is required');
    const role = await roleRepo.update(req.params.id, { name });
    if (!role) return publicError(res, 404, 'Role not found');
    return res.json({ role });
  } catch (error) {
    return internalError(res, error, 'Failed to update role');
  }
};

exports.listPermissions = async (_req, res) => {
  try {
    const permissions = await permissionRepo.findAll();
    return res.json({ permissions });
  } catch (error) {
    return internalError(res, error, 'Failed to list permissions');
  }
};

exports.getRolePermissions = async (req, res) => {
  try {
    const ids = await permissionRepo.findRolePermissionIds(req.params.id);
    return res.json({ permission_ids: ids });
  } catch (error) {
    return internalError(res, error, 'Failed to load role permissions');
  }
};

exports.setRolePermissions = async (req, res) => {
  try {
    const ids = Array.isArray(req.body?.permission_ids)
      ? req.body.permission_ids.map(Number).filter((n) => Number.isInteger(n) && n > 0)
      : [];
    await permissionRepo.setRolePermissions(req.params.id, ids);
    audit('admin.permissions_set', { actor: req.user?.user_id, role_id: req.params.id });
    return res.json({ message: 'Permissions updated' });
  } catch (error) {
    return internalError(res, error, 'Failed to update permissions');
  }
};
