const express = require('express');
const admin = require('../controllers/adminController');
const verifyToken = require('../middleware/verifyToken');
const requireRole = require('../middleware/requireRole');
const requireTrustedOrigin = require('../middleware/requireTrustedOrigin');

const users = express.Router();
users.use(verifyToken, requireRole([1]));
users.get('/', admin.listUsers);
users.delete('/:userId', requireTrustedOrigin, admin.deleteUser);

const roles = express.Router();
roles.use(verifyToken, requireRole([1]));
roles.get('/', admin.listRoles);
roles.post('/', requireTrustedOrigin, admin.createRole);
roles.patch('/:id', requireTrustedOrigin, admin.updateRole);
roles.get('/:id/permissions', admin.getRolePermissions);
roles.put('/:id/permissions', requireTrustedOrigin, admin.setRolePermissions);

const permissions = express.Router();
permissions.use(verifyToken, requireRole([1]));
permissions.get('/', admin.listPermissions);

module.exports = { users, roles, permissions };
