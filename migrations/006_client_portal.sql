-- Client Portal System Migration

-- Client Users Table (for client login)
CREATE TABLE IF NOT EXISTS client_users (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  email TEXT UNIQUE NOT NULL,
  password_hash TEXT NOT NULL,
  company_name TEXT NOT NULL,
  contact_name TEXT NOT NULL,
  phone TEXT,
  token TEXT,
  token_expires_at TEXT,
  status TEXT DEFAULT 'active',
  created_at TEXT DEFAULT (datetime('now')),
  updated_at TEXT DEFAULT (datetime('now'))
);

-- Client Projects Table
CREATE TABLE IF NOT EXISTS client_projects (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  client_id INTEGER NOT NULL,
  project_name TEXT NOT NULL,
  project_type TEXT NOT NULL,
  description TEXT,
  start_date TEXT,
  estimated_completion TEXT,
  actual_completion TEXT,
  status TEXT DEFAULT 'in_progress',
  budget TEXT,
  progress_percentage INTEGER DEFAULT 0,
  created_at TEXT DEFAULT (datetime('now')),
  updated_at TEXT DEFAULT (datetime('now')),
  FOREIGN KEY (client_id) REFERENCES client_users(id) ON DELETE CASCADE
);

-- Project Status Updates Table
CREATE TABLE IF NOT EXISTS project_updates (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  project_id INTEGER NOT NULL,
  title TEXT NOT NULL,
  description TEXT NOT NULL,
  update_type TEXT DEFAULT 'progress',
  created_by TEXT DEFAULT 'admin',
  created_at TEXT DEFAULT (datetime('now')),
  FOREIGN KEY (project_id) REFERENCES client_projects(id) ON DELETE CASCADE
);

-- Project Milestones Table
CREATE TABLE IF NOT EXISTS project_milestones (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  project_id INTEGER NOT NULL,
  title TEXT NOT NULL,
  description TEXT,
  due_date TEXT,
  status TEXT DEFAULT 'pending',
  completed_at TEXT,
  display_order INTEGER DEFAULT 0,
  FOREIGN KEY (project_id) REFERENCES client_projects(id) ON DELETE CASCADE
);

-- Contracts Table
CREATE TABLE IF NOT EXISTS contracts (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  project_id INTEGER NOT NULL,
  title TEXT NOT NULL,
  description TEXT,
  contract_url TEXT NOT NULL,
  amount TEXT,
  signed_by_client INTEGER DEFAULT 0,
  signed_at TEXT,
  signature_data TEXT,
  status TEXT DEFAULT 'pending',
  created_at TEXT DEFAULT (datetime('now')),
  FOREIGN KEY (project_id) REFERENCES client_projects(id) ON DELETE CASCADE
);

-- Project Files Table (for client upload and view)
CREATE TABLE IF NOT EXISTS project_files (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  project_id INTEGER NOT NULL,
  file_name TEXT NOT NULL,
  file_url TEXT NOT NULL,
  file_type TEXT,
  file_size INTEGER,
  category TEXT DEFAULT 'general',
  description TEXT,
  uploaded_by TEXT DEFAULT 'admin',
  uploaded_at TEXT DEFAULT (datetime('now')),
  FOREIGN KEY (project_id) REFERENCES client_projects(id) ON DELETE CASCADE
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_client_users_email ON client_users(email);
CREATE INDEX IF NOT EXISTS idx_client_users_status ON client_users(status);
CREATE INDEX IF NOT EXISTS idx_client_projects_client_id ON client_projects(client_id);
CREATE INDEX IF NOT EXISTS idx_client_projects_status ON client_projects(status);
CREATE INDEX IF NOT EXISTS idx_project_updates_project_id ON project_updates(project_id);
CREATE INDEX IF NOT EXISTS idx_project_milestones_project_id ON project_milestones(project_id);
CREATE INDEX IF NOT EXISTS idx_contracts_project_id ON contracts(project_id);
CREATE INDEX IF NOT EXISTS idx_project_files_project_id ON project_files(project_id);
