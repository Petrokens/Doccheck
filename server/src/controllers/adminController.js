const userRepo = require('../db/repositories/userRepository');
const roleRepo = require('../db/repositories/roleRepository');
const permissionRepo = require('../db/repositories/permissionRepository');

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
    return res.status(500).json({ error: 'Failed to list users', details: error.message });
  }
};

exports.deleteUser = async (req, res) => {
  try {
    await userRepo.deleteByUserId(req.params.userId);
    return res.json({ message: 'User deleted' });
  } catch (error) {
    return res.status(500).json({ error: 'Failed to delete user', details: error.message });
  }
};

exports.listRoles = async (_req, res) => {
  try {
    const roles = await roleRepo.findAll();
    return res.json({ roles });
  } catch (error) {
    return res.status(500).json({ error: 'Failed to list roles', details: error.message });
  }
};

exports.createRole = async (req, res) => {
  try {
    const roles = await roleRepo.findAll();
    const nextId = Math.max(0, ...roles.map((r) => r.id)) + 1;
    const role = await roleRepo.create({ id: nextId, name: String(req.body?.name || '').trim() });
    return res.status(201).json({ role });
  } catch (error) {
    return res.status(500).json({ error: 'Failed to create role', details: error.message });
  }
};

exports.updateRole = async (req, res) => {
  try {
    const role = await roleRepo.update(req.params.id, { name: String(req.body?.name || '').trim() });
    if (!role) return res.status(404).json({ error: 'Role not found' });
    return res.json({ role });
  } catch (error) {
    return res.status(500).json({ error: 'Failed to update role', details: error.message });
  }
};

exports.listPermissions = async (_req, res) => {
  try {
    const permissions = await permissionRepo.findAll();
    return res.json({ permissions });
  } catch (error) {
    return res.status(500).json({ error: 'Failed to list permissions', details: error.message });
  }
};

exports.getRolePermissions = async (req, res) => {
  try {
    const ids = await permissionRepo.findRolePermissionIds(req.params.id);
    return res.json({ permission_ids: ids });
  } catch (error) {
    return res.status(500).json({ error: 'Failed to load role permissions', details: error.message });
  }
};

exports.setRolePermissions = async (req, res) => {
  try {
    await permissionRepo.setRolePermissions(req.params.id, req.body?.permission_ids || []);
    return res.json({ message: 'Permissions updated' });
  } catch (error) {
    return res.status(500).json({ error: 'Failed to update permissions', details: error.message });
  }
};
