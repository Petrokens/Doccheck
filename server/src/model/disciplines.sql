CREATE TABLE disciplines (
  id SERIAL PRIMARY KEY,
  name TEXT NOT NULL UNIQUE
);

INSERT INTO disciplines (name) VALUES
  ('Process'),
  ('Piping'),
  ('Pipeline'),
  ('Civil & Structural'),
  ('Mechanical – Rotating'),
  ('Mechanical – Static'),                   
  ('Electrical'),
  ('HVAC'),
  ('Instrumentation'),
  ('Telecom'),
  ('HSE'),
  ('General Deliverables'),
  ('Projects');


  