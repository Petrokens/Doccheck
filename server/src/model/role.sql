-- ========================
-- 1. Roles Table
-- ========================
CREATE TABLE roles (
  id SERIAL PRIMARY KEY,
  name VARCHAR(50) UNIQUE NOT NULL
);

-- ========================
-- 2. Insert Roles
-- ========================

INSERT INTO roles (name) VALUES
('admin'),
('user');
