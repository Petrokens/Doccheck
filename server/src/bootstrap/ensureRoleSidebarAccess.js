const roleRepo = require('../db/repositories/roleRepository');
const sidebarRepo = require('../db/repositories/sidebarRepository');
const {
  defaultItemIds,
  ANNOUNCEMENTS_ITEM_ID,
  COMMON_DOCUMENT_CHECK_ITEM_ID,
} = require('../security/sidebarAccess');

async function ensureRoleSidebarAccess() {
  const items = await sidebarRepo.listRawItems();
  if (!items.length) return;
  const roles = await roleRepo.findAll();
  const announcementExists = items.some((item) => Number(item.id) === ANNOUNCEMENTS_ITEM_ID);
  const commonDocExists = items.some((item) => Number(item.id) === COMMON_DOCUMENT_CHECK_ITEM_ID);
  let seeded = 0;
  for (const role of roles) {
    const existing = await sidebarRepo.listRoleItemIds(role.id);
    if (!existing.length) {
      await sidebarRepo.setRoleItemIds(role.id, defaultItemIds(role.id, items));
      seeded += 1;
      continue;
    }
    const next = [...existing];
    if (announcementExists && !next.includes(ANNOUNCEMENTS_ITEM_ID)) {
      next.push(ANNOUNCEMENTS_ITEM_ID);
    }
    if (commonDocExists && !next.includes(COMMON_DOCUMENT_CHECK_ITEM_ID)) {
      next.push(COMMON_DOCUMENT_CHECK_ITEM_ID);
    }
    if (next.length !== existing.length) {
      await sidebarRepo.setRoleItemIds(role.id, next);
    }
  }
  if (seeded) console.log(`Role sidebar access seeded for ${seeded} role(s)`);
}

module.exports = ensureRoleSidebarAccess;
