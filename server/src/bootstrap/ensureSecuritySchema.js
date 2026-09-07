const { pool } = require('../config/db');

async function ensureSecuritySchema() {
  await pool.query(`
    ALTER TABLE users ADD COLUMN IF NOT EXISTS failed_login_count INTEGER NOT NULL DEFAULT 0;
    ALTER TABLE users ADD COLUMN IF NOT EXISTS locked_until TIMESTAMPTZ;
  `);
}

module.exports = ensureSecuritySchema;
