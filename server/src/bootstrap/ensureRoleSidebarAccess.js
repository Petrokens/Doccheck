const roleRepo = require('../db/repositories/roleRepository');
const sidebarRepo = require('../db/repositories/sidebarRepository');
const { defaultItemIds, ANNOUNCEMENTS_ITEM_ID } = require('../security/sidebarAccess');

async function ensureRoleSidebarAccess() {
  const items = await sidebarRepo.listRawItems();
  if (!items.length) return;
  const roles = await roleRepo.findAll();
  const announcementExists = items.some((item) => Number(item.id) === ANNOUNCEMENTS_ITEM_ID);
  let seeded = 0;
  for (const role of roles) {
    const existing = await sidebarRepo.listRoleItemIds(role.id);
    if (!existing.length) {
      await sidebarRepo.setRoleItemIds(role.id, defaultItemIds(role.id, items));
      seeded += 1;
      continue;
    }
    if (announcementExists && !existing.includes(ANNOUNCEMENTS_ITEM_ID)) {
      await sidebarRepo.setRoleItemIds(role.id, [...existing, ANNOUNCEMENTS_ITEM_ID]);
    }
  }
  if (seeded) console.log(`Role sidebar access seeded for ${seeded} role(s)`);
}

module.exports = ensureRoleSidebarAccess;
