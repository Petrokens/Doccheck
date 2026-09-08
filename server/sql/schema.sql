-- Petrolenz QA/QC — PostgreSQL schema
-- psql -U postgres -d petrolenz_qaqc -f sql/schema.sql

CREATE EXTENSION IF NOT EXISTS "pgcrypto";

CREATE TABLE IF NOT EXISTS roles (
  id          INTEGER PRIMARY KEY,
  name        VARCHAR(255) NOT NULL UNIQUE,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS permissions (
  id          INTEGER PRIMARY KEY,
  key         VARCHAR(64) NOT NULL UNIQUE,
  name        VARCHAR(255) NOT NULL,
  description TEXT NOT NULL DEFAULT '',
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS role_permissions (
  role_id       INTEGER NOT NULL REFERENCES roles(id) ON DELETE CASCADE,
  permission_id INTEGER NOT NULL REFERENCES permissions(id) ON DELETE CASCADE,
  PRIMARY KEY (role_id, permission_id)
);

CREATE TABLE IF NOT EXISTS users (
  id                    SERIAL PRIMARY KEY,
  user_id               UUID NOT NULL UNIQUE DEFAULT gen_random_uuid(),
  username              VARCHAR(255) NOT NULL,
  email                 VARCHAR(255) NOT NULL UNIQUE,
  password              VARCHAR(255) NOT NULL,
  role_id               INTEGER NOT NULL REFERENCES roles(id),
  refresh_token         TEXT,
  refresh_token_expires TIMESTAMPTZ,
  last_login_at         TIMESTAMPTZ,
  reset_token           TEXT,
  reset_token_expires   TIMESTAMPTZ,
  failed_login_count    INTEGER NOT NULL DEFAULT 0,
  locked_until          TIMESTAMPTZ,
  created_at            TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at            TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_users_user_id ON users (user_id);
CREATE INDEX IF NOT EXISTS idx_users_email ON users (email);

CREATE TABLE IF NOT EXISTS sidebar_sections (
  id            INTEGER PRIMARY KEY,
  name          VARCHAR(255) NOT NULL,
  display_order INTEGER NOT NULL DEFAULT 0,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS sidebar_items (
  id            INTEGER PRIMARY KEY,
  section_id    INTEGER NOT NULL REFERENCES sidebar_sections(id) ON DELETE CASCADE,
  label         VARCHAR(255) NOT NULL,
  path          VARCHAR(512) NOT NULL,
  icon_name     VARCHAR(128) NOT NULL DEFAULT '',
  display_order INTEGER NOT NULL DEFAULT 0,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS user_sidebar_items (
  user_id         UUID NOT NULL REFERENCES users(user_id) ON DELETE CASCADE,
  sidebar_item_id INTEGER NOT NULL REFERENCES sidebar_items(id) ON DELETE CASCADE,
  PRIMARY KEY (user_id, sidebar_item_id)
);

CREATE INDEX IF NOT EXISTS idx_user_sidebar_items_user ON user_sidebar_items (user_id);

CREATE TABLE IF NOT EXISTS role_sidebar_items (
  role_id         INTEGER NOT NULL REFERENCES roles(id) ON DELETE CASCADE,
  sidebar_item_id INTEGER NOT NULL REFERENCES sidebar_items(id) ON DELETE CASCADE,
  PRIMARY KEY (role_id, sidebar_item_id)
);

CREATE INDEX IF NOT EXISTS idx_role_sidebar_items_role ON role_sidebar_items (role_id);

CREATE TABLE IF NOT EXISTS process_reports (
  id                    VARCHAR(32) PRIMARY KEY,
  document_type         VARCHAR(255) NOT NULL,
  main_document_name    TEXT NOT NULL,
  support_document_name TEXT NOT NULL DEFAULT '',
  report_markdown       TEXT NOT NULL,
  report_structured     JSONB,
  workflow              VARCHAR(64) NOT NULL DEFAULT 'qaqc',
  report_title          TEXT NOT NULL DEFAULT '',
  checked_by_user_id    VARCHAR(64) NOT NULL DEFAULT '',
  prompt_tokens         INTEGER NOT NULL DEFAULT 0,
  completion_tokens     INTEGER NOT NULL DEFAULT 0,
  total_tokens          INTEGER NOT NULL DEFAULT 0,
  token_cost_usd        NUMERIC(14, 6) NOT NULL DEFAULT 0,
  ai_provider           VARCHAR(32) NOT NULL DEFAULT '',
  ai_model              VARCHAR(128) NOT NULL DEFAULT '',
  created_at            TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at            TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_process_reports_workflow ON process_reports (workflow);
CREATE INDEX IF NOT EXISTS idx_process_reports_checked_by ON process_reports (checked_by_user_id);
CREATE INDEX IF NOT EXISTS idx_process_reports_created_at ON process_reports (created_at DESC);

CREATE TABLE IF NOT EXISTS login_otp_challenges (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id      UUID NOT NULL REFERENCES users(user_id) ON DELETE CASCADE,
  otp_hash     TEXT NOT NULL,
  expires_at   TIMESTAMPTZ NOT NULL,
  attempts     INTEGER NOT NULL DEFAULT 0,
  consumed_at  TIMESTAMPTZ,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_login_otp_user ON login_otp_challenges (user_id);
CREATE INDEX IF NOT EXISTS idx_login_otp_expires ON login_otp_challenges (expires_at);

CREATE TABLE IF NOT EXISTS announcements (
  id               SERIAL PRIMARY KEY,
  title            VARCHAR(255) NOT NULL,
  body             TEXT NOT NULL,
  created_by       UUID REFERENCES users(user_id) ON DELETE SET NULL,
  email_sent       BOOLEAN NOT NULL DEFAULT FALSE,
  email_sent_at    TIMESTAMPTZ,
  recipient_count  INTEGER NOT NULL DEFAULT 0,
  created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at       TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS announcement_roles (
  announcement_id INTEGER NOT NULL REFERENCES announcements(id) ON DELETE CASCADE,
  role_id         INTEGER NOT NULL REFERENCES roles(id) ON DELETE CASCADE,
  PRIMARY KEY (announcement_id, role_id)
);

CREATE INDEX IF NOT EXISTS idx_announcement_roles_role ON announcement_roles (role_id);

INSERT INTO roles (id, name) VALUES (1, 'Master'), (2, 'Engineer')
ON CONFLICT (id) DO NOTHING;

INSERT INTO permissions (id, key, name, description) VALUES
  (1, 'users.view',        'View users',        'Open user directory'),
  (2, 'users.manage',      'Manage users',      'Create and edit users'),
  (3, 'roles.view',        'View roles',        'See role definitions'),
  (4, 'roles.manage',      'Manage roles',      'Edit roles'),
  (5, 'permissions.view',  'View permissions',  'See permission catalog'),
  (6, 'permissions.manage','Manage permissions','Edit permission assignments'),
  (7, 'system.settings',   'System settings',   'Environment configuration')
ON CONFLICT (id) DO UPDATE SET
  name = EXCLUDED.name,
  description = EXCLUDED.description,
  updated_at = NOW();

INSERT INTO role_permissions (role_id, permission_id)
SELECT 1, id FROM permissions
ON CONFLICT DO NOTHING;

INSERT INTO role_permissions (role_id, permission_id)
SELECT 2, id FROM permissions WHERE key IN ('users.view')
ON CONFLICT DO NOTHING;
