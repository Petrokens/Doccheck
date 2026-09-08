import api from '../lib/axios';

export async function listUsers() {
  const { data } = await api.get('/users');
  return data.users || [];
}

export async function createUser({ username, email, password, role_id }) {
  const requested = Number(role_id) || 2;
  const registerRole = requested === 1 ? 1 : 2;
  const { data } = await api.post('/auth/register', {
    username,
    email,
    password,
    role_id: registerRole,
  });
  const user = data.user;
  if (user?.user_id && requested !== registerRole) {
    return updateUser(user.user_id, { role_id: requested });
  }
  return user;
}

export async function updateUser(userId, payload) {
  const { data } = await api.patch(`/users/${userId}`, payload);
  return data.user;
}

export async function deleteUser(userId) {
  await api.delete(`/users/${userId}`);
}

export async function listRoles() {
  const { data } = await api.get('/roles');
  return data.roles || [];
}

export async function createRole(name) {
  const { data } = await api.post('/roles', { name });
  return data.role;
}

export async function updateRole(id, name) {
  const { data } = await api.patch(`/roles/${id}`, { name });
  return data.role;
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

export async function fetchSystemLogs() {
  const { data } = await api.get('/system-logs');
  return data;
}

export async function listSidebarCatalog() {
  const { data } = await api.get('/roles/sidebar-catalog');
  return data.catalog || [];
}

export async function getRoleSidebar(roleId) {
  const { data } = await api.get(`/roles/${roleId}/sidebar`);
  return data;
}

export async function setRoleSidebar(roleId, item_ids) {
  const { data } = await api.put(`/roles/${roleId}/sidebar`, { item_ids });
  return data;
}
