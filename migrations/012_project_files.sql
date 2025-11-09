-- Create Project Files Table
-- For managing project deliverables and shared files

CREATE TABLE IF NOT EXISTS project_files (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  project_id INTEGER NOT NULL,
  filename TEXT NOT NULL,
  original_filename TEXT NOT NULL,
  file_url TEXT NOT NULL,
  file_size INTEGER,
  file_type TEXT,
  category TEXT DEFAULT 'general',
  description TEXT,
  is_visible_to_client INTEGER DEFAULT 1,
  uploaded_by TEXT,
  version INTEGER DEFAULT 1,
  parent_file_id INTEGER,
  created_at TEXT DEFAULT (datetime('now')),
  updated_at TEXT DEFAULT (datetime('now')),
  FOREIGN KEY (project_id) REFERENCES client_projects(id) ON DELETE CASCADE,
  FOREIGN KEY (parent_file_id) REFERENCES project_files(id) ON DELETE SET NULL
);
