CREATE TABLE checklists (
  id SERIAL PRIMARY KEY,
  title VARCHAR(255) NOT NULL,
  discipline VARCHAR(100) NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE checklist_items (
  id SERIAL PRIMARY KEY,
  checklist_id INT REFERENCES checklists(id) ON DELETE CASCADE,
  content TEXT NOT NULL
);
