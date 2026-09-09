const MASTER_ROLE = 1;

const ANNOUNCEMENTS_ITEM_ID = 29;
const COMMON_DOCUMENT_CHECK_ITEM_ID = 30;

const MASTER_ONLY_PATHS = new Set([
  '/dashboard/users',
  '/dashboard/roles',
  '/dashboard/permissions',
  '/dashboard/env-settings',
  '/dashboard/audit-reports',
  '/dashboard/system-logs',
  '/dashboard/api-docs',
]);

function isAdminPath(path) {
  return MASTER_ONLY_PATHS.has(String(path || ''));
}

function isMasterRole(roleId) {
  return Number(roleId) === MASTER_ROLE;
}

function defaultItemIds(roleId, items) {
  const list = Array.isArray(items) ? items : [];
  if (isMasterRole(roleId)) return list.map((item) => Number(item.id)).filter((id) => id > 0);
  return list
    .filter((item) => !isAdminPath(item.path))
    .map((item) => Number(item.id))
    .filter((id) => id > 0);
}

function normalizeAssignedIds(roleId, requestedIds, items) {
  const allowed = new Map((items || []).map((item) => [Number(item.id), item]));
  const requested = Array.isArray(requestedIds)
    ? requestedIds.map(Number).filter((id) => Number.isInteger(id) && id > 0 && allowed.has(id))
    : [];
  const unique = [...new Set(requested)];
  const adminIds = [...allowed.values()].filter((item) => isAdminPath(item.path)).map((item) => Number(item.id));
  if (isMasterRole(roleId)) {
    return [...new Set([...unique, ...adminIds])];
  }
  const adminSet = new Set(adminIds);
  return unique.filter((id) => !adminSet.has(id));
}

function filterSectionsForUser(sections, { isMaster, assignedIds }) {
  const allowed = new Set((assignedIds || []).map(Number));
  return (sections || [])
    .filter((section) => !['analytics', 'system'].includes(String(section.title || '').toLowerCase()))
    .map((section) => ({
      ...section,
      items: (section.items || []).filter((item) => {
        if (isMaster && isAdminPath(item.path)) return true;
        return allowed.has(Number(item.id));
      }),
    }))
    .filter((section) => section.items.length);
}

function toCatalog(sections) {
  return (sections || []).map((section) => ({
    id: section.id,
    title: section.title,
    items: (section.items || []).map((item) => ({
      id: item.id,
      label: item.label,
      path: item.path,
      icon_key: item.icon_key,
      admin: isAdminPath(item.path),
    })),
  }));
}

module.exports = {
  MASTER_ROLE,
  ANNOUNCEMENTS_ITEM_ID,
  COMMON_DOCUMENT_CHECK_ITEM_ID,
  MASTER_ONLY_PATHS,
  isAdminPath,
  isMasterRole,
  defaultItemIds,
  normalizeAssignedIds,
  filterSectionsForUser,
  toCatalog,
};
