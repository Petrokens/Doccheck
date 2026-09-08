const { pool } = require('../config/db');

async function ensureSecuritySchema() {
  await pool.query(`
    ALTER TABLE users ADD COLUMN IF NOT EXISTS failed_login_count INTEGER NOT NULL DEFAULT 0;
    ALTER TABLE users ADD COLUMN IF NOT EXISTS locked_until TIMESTAMPTZ;
  `);
  await pool.query(`
    CREATE TABLE IF NOT EXISTS user_sidebar_items (
      user_id UUID NOT NULL REFERENCES users(user_id) ON DELETE CASCADE,
      sidebar_item_id INTEGER NOT NULL REFERENCES sidebar_items(id) ON DELETE CASCADE,
      PRIMARY KEY (user_id, sidebar_item_id)
    );
    CREATE INDEX IF NOT EXISTS idx_user_sidebar_items_user ON user_sidebar_items (user_id);
  `);
  await pool.query(`
    CREATE TABLE IF NOT EXISTS role_sidebar_items (
      role_id INTEGER NOT NULL REFERENCES roles(id) ON DELETE CASCADE,
      sidebar_item_id INTEGER NOT NULL REFERENCES sidebar_items(id) ON DELETE CASCADE,
      PRIMARY KEY (role_id, sidebar_item_id)
    );
    CREATE INDEX IF NOT EXISTS idx_role_sidebar_items_role ON role_sidebar_items (role_id);
  `);
  await pool.query(`
    ALTER TABLE process_reports ADD COLUMN IF NOT EXISTS prompt_tokens INTEGER NOT NULL DEFAULT 0;
    ALTER TABLE process_reports ADD COLUMN IF NOT EXISTS completion_tokens INTEGER NOT NULL DEFAULT 0;
    ALTER TABLE process_reports ADD COLUMN IF NOT EXISTS total_tokens INTEGER NOT NULL DEFAULT 0;
    ALTER TABLE process_reports ADD COLUMN IF NOT EXISTS token_cost_usd NUMERIC(14, 6) NOT NULL DEFAULT 0;
    ALTER TABLE process_reports ADD COLUMN IF NOT EXISTS ai_provider VARCHAR(32) NOT NULL DEFAULT '';
    ALTER TABLE process_reports ADD COLUMN IF NOT EXISTS ai_model VARCHAR(128) NOT NULL DEFAULT '';
  `);
}

module.exports = ensureSecuritySchema;
