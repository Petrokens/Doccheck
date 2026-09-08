const roleRepo = require('../db/repositories/roleRepository');
const sidebarRepo = require('../db/repositories/sidebarRepository');
const { defaultItemIds } = require('../security/sidebarAccess');

async function ensureRoleSidebarAccess() {
  const items = await sidebarRepo.listRawItems();
  if (!items.length) return;
  const roles = await roleRepo.findAll();
  let seeded = 0;
  for (const role of roles) {
    const existing = await sidebarRepo.listRoleItemIds(role.id);
    if (existing.length) continue;
    await sidebarRepo.setRoleItemIds(role.id, defaultItemIds(role.id, items));
    seeded += 1;
  }
  if (seeded) console.log(`Role sidebar access seeded for ${seeded} role(s)`);
}

module.exports = ensureRoleSidebarAccess;
