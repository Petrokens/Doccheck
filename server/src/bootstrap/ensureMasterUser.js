const bcrypt = require('bcrypt');
const userRepo = require('../db/repositories/userRepository');
const roleRepo = require('../db/repositories/roleRepository');

async function ensureMasterUser() {
  const roleId = 1;
  const existingRole = await roleRepo.findById(roleId);
  if (!existingRole) {
    await roleRepo.create({ id: roleId, name: 'Master' });
  }

  const email = String(process.env.MASTER_EMAIL || 'admin@petrolenz.com').trim().toLowerCase();
  const password = String(process.env.MASTER_PASSWORD || '');
  const username = String(process.env.MASTER_USERNAME || 'Master User');
  if (!password) {
    if (process.env.NODE_ENV === 'production') {
      throw new Error('MASTER_PASSWORD is required.');
    }
    console.warn('[security] MASTER_PASSWORD is empty; master user will not be created or synced.');
    return null;
  }

  let user = await userRepo.findByEmail(email);
  if (!user) {
    const masters = await userRepo.findByRoleId(roleId);
    user = masters[0] || null;
  }

  const hashed = await bcrypt.hash(password, 12);

  if (user) {
    const patch = {};
    if (String(user.email || '').toLowerCase() !== email) patch.email = email;
    if (String(user.username || '') !== username) patch.username = username;
    const matches = await bcrypt.compare(password, user.password);
    if (!matches) patch.password = hashed;
    if (Object.keys(patch).length) {
      const updated = await userRepo.updateByUserId(user.user_id, patch);
      console.log(`Master user updated: ${email}`);
      return updated;
    }
    console.log(`Master user already exists: ${email}`);
    return user;
  }

  const created = await userRepo.create({
    username,
    email,
    password: hashed,
    role_id: roleId,
  });
  console.log(`Master user created: ${email}`);
  return created;
}

module.exports = ensureMasterUser;
