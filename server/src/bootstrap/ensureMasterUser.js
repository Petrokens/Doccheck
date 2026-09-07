const bcrypt = require('bcrypt');
const userRepo = require('../db/repositories/userRepository');
const roleRepo = require('../db/repositories/roleRepository');

async function ensureMasterUser() {
  const roleId = 1;
  const existingRole = await roleRepo.findById(roleId);
  if (!existingRole) {
    await roleRepo.create({ id: roleId, name: 'Master' });
  }

  const email = String(process.env.MASTER_EMAIL || 'admin@petrolenz.local').trim().toLowerCase();
  const password = String(process.env.MASTER_PASSWORD || 'ChangeMe123!');
  const username = String(process.env.MASTER_USERNAME || 'Master User');

  const existing = await userRepo.findByEmail(email);
  if (existing) {
    const matches = await bcrypt.compare(password, existing.password);
    if (!matches && process.env.NODE_ENV !== 'production') {
      const hashed = await bcrypt.hash(password, 10);
      await userRepo.updateByUserId(existing.user_id, { password: hashed });
      console.log(`Master user password synced from MASTER_PASSWORD: ${email}`);
    } else {
      console.log(`Master user already exists: ${email}`);
    }
    return existing;
  }

  const hashed = await bcrypt.hash(password, 10);
  const user = await userRepo.create({
    username,
    email,
    password: hashed,
    role_id: roleId,
  });
  console.log(`Master user created: ${email}`);
  return user;
}

module.exports = ensureMasterUser;
