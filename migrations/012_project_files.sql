-- Create Project Files Table
-- For managing project deliverables and shared files

CREATE TABLE IF NOT EXISTS project_files (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  project_id INTEGER NOT NULL,
  filename TEXT NOT NULL,
  original_filename TEXT NOT NULL,
  file_url TEXT NOT NULL, -- URL to the uploaded file
  file_size INTEGER, -- in bytes
  file_type TEXT, -- MIME type
  category TEXT DEFAULT 'general', -- designs, documents, code, deliverables, general
  description TEXT,
  is_visible_to_client INTEGER DEFAULT 1, -- 1 = visible, 0 = internal only
  uploaded_by TEXT, -- admin username/email
  version INTEGER DEFAULT 1,
  parent_file_id INTEGER, -- for file versioning, references previous version
  created_at TEXT DEFAULT (datetime('now')),
  updated_at TEXT DEFAULT (datetime('now')),
  FOREIGN KEY (project_id) REFERENCES client_projects(id) ON DELETE CASCADE,
  FOREIGN KEY (parent_file_id) REFERENCES project_files(id) ON DELETE SET NULL
);

-- Create indexes for faster queries
CREATE INDEX IF NOT EXISTS idx_project_files_project_id ON project_files(project_id);
CREATE INDEX IF NOT EXISTS idx_project_files_category ON project_files(category);
CREATE INDEX IF NOT EXISTS idx_project_files_created_at ON project_files(created_at DESC);
