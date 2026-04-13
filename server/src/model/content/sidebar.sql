CREATE TABLE sidebar_sections (
  id SERIAL PRIMARY KEY,
  name VARCHAR(100) NOT NULL UNIQUE,
  display_order INTEGER NOT NULL
);


CREATE TABLE sidebar_items (
  id SERIAL PRIMARY KEY,
  section_id INTEGER REFERENCES sidebar_sections(id) ON DELETE CASCADE,
  label VARCHAR(100) NOT NULL,
  path VARCHAR(255) NOT NULL,
  icon_name VARCHAR(50),  -- e.g., 'Flame', 'BarChart'
  display_order INTEGER NOT NULL
);



INSERT INTO sidebar_sections (name, display_order) VALUES
  ('Disciplines', 1),
  ('Utilities', 2),
  ('AI Tools', 3),
  ('Documents', 4),
  ('Analytics', 5),
  ('System', 6),
  ('Admin Tools', 7);


INSERT INTO sidebar_items (section_id, label, path, icon_name, display_order) VALUES
(1, 'Process', '/dashboard/process', 'Flame', 1),
(1, 'Piping', '/dashboard/piping', 'Wrench', 2),
(1, 'Pipeline', '/dashboard/pipeline', 'Route', 3),
(1, 'Civil & Structural', '/dashboard/civil-structural', 'Building', 4),
(1, 'Mechanical – Rotating', '/dashboard/mechanical-rotating', 'Cog', 5),
(1, 'Mechanical – Static', '/dashboard/mechanical-static', 'Cpu', 6),
(1, 'Electrical', '/dashboard/electrical', 'Zap', 7),
(1, 'HVAC', '/dashboard/hvac', 'Thermometer', 8),
(1, 'Instrumentation', '/dashboard/instrumentation', 'Activity', 9),
(1, 'Telecom', '/dashboard/telecom', 'RadioTower', 10),
(1, 'HSE', '/dashboard/hse', 'Shield', 11),
(1, 'General Deliverables', '/dashboard/general-deliverables', 'Layers', 12);


INSERT INTO sidebar_items (section_id, label, path, icon_name, display_order) VALUES
(2, 'History', '/dashboard/history', 'Clock', 1),
(2, 'Profile', '/dashboard/profile', 'User', 2),
(2, 'Settings', '/dashboard/settings', 'Settings', 3);


INSERT INTO sidebar_items (section_id, label, path, icon_name, display_order) VALUES
(3, 'AI QC Inbox', '/dashboard/ai-review', 'Brain', 1),
(3, 'Checklist Manager', '/dashboard/checklists', 'ClipboardList', 2),
(3, 'QC Score Analytics', '/dashboard/qc-analytics', 'BarChart', 3),
(3, 'AI Feedback', '/dashboard/feedback', 'MessageSquare', 4);

INSERT INTO sidebar_items (section_id, label, path, icon_name, display_order) VALUES
(4, 'Document Uploads', '/dashboard/uploads', 'UploadCloud', 1),
(4, 'Failed Checks', '/dashboard/failures', 'AlertCircle', 2),
(4, 'Version History', '/dashboard/version-history', 'History', 3),
(4, 'Report Templates', '/dashboard/templates', 'FileText', 4);

INSERT INTO sidebar_items (section_id, label, path, icon_name, display_order) VALUES
(5, 'Score Trends', '/dashboard/score-trends', 'TrendingUp', 1),
(5, 'Audit Logs', '/dashboard/user-activity', 'Clipboard', 2),
(5, 'Document Stats', '/dashboard/doc-statistics', 'PieChart', 3);


INSERT INTO sidebar_items (section_id, label, path, icon_name, display_order) VALUES
(6, 'System Status', '/dashboard/system-status', 'Server', 1),
(6, 'Environment Config', '/dashboard/env-settings', 'Sliders', 2);
