-- Clients table for managing client/partner information
CREATE TABLE IF NOT EXISTS clients (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  logo_url TEXT NOT NULL,
  website_url TEXT,
  industry TEXT,
  description TEXT,
  project_type TEXT,
  project_value TEXT,
  testimonial TEXT,
  testimonial_author TEXT,
  testimonial_position TEXT,
  is_featured INTEGER DEFAULT 0,
  display_order INTEGER DEFAULT 0,
  status TEXT DEFAULT 'active',
  created_at TEXT DEFAULT (datetime('now')),
  updated_at TEXT DEFAULT (datetime('now'))
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_clients_status ON clients(status);
CREATE INDEX IF NOT EXISTS idx_clients_featured ON clients(is_featured);
CREATE INDEX IF NOT EXISTS idx_clients_order ON clients(display_order);
