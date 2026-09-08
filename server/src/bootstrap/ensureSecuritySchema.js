const fs = require('fs');
const path = require('path');
const { pool } = require('../config/db');

async function applyBaseSchema() {
  const { rows } = await pool.query(`SELECT to_regclass('public.users') AS users`);
  if (rows[0]?.users) return;

  const schemaPath = path.resolve(__dirname, '../../sql/schema.sql');
  const sql = fs.readFileSync(schemaPath, 'utf8');
  await pool.query(sql);
  console.log('Database schema applied from sql/schema.sql');
}

async function ensureSecuritySchema() {
  await applyBaseSchema();
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
  await pool.query(`
    CREATE TABLE IF NOT EXISTS login_otp_challenges (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      user_id UUID NOT NULL REFERENCES users(user_id) ON DELETE CASCADE,
      otp_hash TEXT NOT NULL,
      expires_at TIMESTAMPTZ NOT NULL,
      attempts INTEGER NOT NULL DEFAULT 0,
      consumed_at TIMESTAMPTZ,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );
    CREATE INDEX IF NOT EXISTS idx_login_otp_user ON login_otp_challenges (user_id);
    CREATE INDEX IF NOT EXISTS idx_login_otp_expires ON login_otp_challenges (expires_at);
  `);
  await pool.query(`
    CREATE TABLE IF NOT EXISTS announcements (
      id SERIAL PRIMARY KEY,
      title VARCHAR(255) NOT NULL,
      body TEXT NOT NULL,
      created_by UUID REFERENCES users(user_id) ON DELETE SET NULL,
      email_sent BOOLEAN NOT NULL DEFAULT FALSE,
      email_sent_at TIMESTAMPTZ,
      recipient_count INTEGER NOT NULL DEFAULT 0,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );
    CREATE TABLE IF NOT EXISTS announcement_roles (
      announcement_id INTEGER NOT NULL REFERENCES announcements(id) ON DELETE CASCADE,
      role_id INTEGER NOT NULL REFERENCES roles(id) ON DELETE CASCADE,
      PRIMARY KEY (announcement_id, role_id)
    );
    CREATE INDEX IF NOT EXISTS idx_announcement_roles_role ON announcement_roles (role_id);
  `);
  await pool.query(`
    ALTER TABLE announcements ADD COLUMN IF NOT EXISTS recipient_count INTEGER NOT NULL DEFAULT 0;
  `);
}

module.exports = ensureSecuritySchema;
