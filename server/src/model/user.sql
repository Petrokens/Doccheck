-- ========================
-- 1. Users Table
-- ========================
CREATE TABLE users (
  id SERIAL PRIMARY KEY,
  user_id UUID DEFAULT uuid_generate_v4() UNIQUE,
  username VARCHAR(100) NOT NULL,
  email VARCHAR(150) UNIQUE NOT NULL,
  password VARCHAR(255) NOT NULL,
  role_id INT REFERENCES roles(id) ON DELETE SET NULL,
  refresh_token TEXT,
  refresh_token_expires TIMESTAMP;
  reset_token VARCHAR(255),
  reset_token_expires TIMESTAMP,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);



-- ========================
-- 2. Lowercase Email Trigger
-- ========================
-- Function to lowercase emails
CREATE OR REPLACE FUNCTION lowercase_email()
RETURNS TRIGGER AS $$
BEGIN
  NEW.email := LOWER(NEW.email);
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger on users table
CREATE TRIGGER trg_lowercase_email
BEFORE INSERT OR UPDATE ON users
FOR EACH ROW
EXECUTE FUNCTION lowercase_email();

-- ========================
-- 3. Email Indexing
-- ========================
CREATE INDEX idx_users_email ON users (email);