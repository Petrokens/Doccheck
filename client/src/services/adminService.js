import api from '../lib/axios';

export async function listUsers() {
  const { data } = await api.get('/users');
  return data.users || [];
}

export async function deleteUser(userId) {
  await api.delete(`/users/${userId}`);
}

export async function listRoles() {
  const { data } = await api.get('/roles');
  return data.roles || [];
}

export async function listPermissions() {
  const { data } = await api.get('/permissions');
  return data.permissions || [];
}

export async function getRolePermissions(roleId) {
  const { data } = await api.get(`/roles/${roleId}/permissions`);
  return data.permission_ids || [];
}

export async function setRolePermissions(roleId, permission_ids) {
  await api.put(`/roles/${roleId}/permissions`, { permission_ids });
}
