-- Allow a private, unpriced scope-review request without assigning a false budget band.
-- SQLite CHECK constraints require a table rebuild. All existing fields, IDs,
-- status, notes, historic estimates, timestamps and share tokens are copied.
-- Apply once, as a D1 migration, after an export/backup and schema verification.
CREATE TABLE project_estimates_review (
  id INTEGER PRIMARY KEY AUTOINCREMENT,

  -- Contact Information
  name TEXT NOT NULL,
  email TEXT NOT NULL,
  company TEXT,
  phone TEXT,

  -- Project Details
  project_description TEXT NOT NULL,
  project_type TEXT NOT NULL CHECK(project_type IN ('web', 'mobile', 'both', 'other')),
  timeline_preference TEXT NOT NULL CHECK(timeline_preference IN ('asap', '1-3 months', '3-6 months', '6+ months')),
  budget_range TEXT NOT NULL CHECK(budget_range IN ('to-discuss', 'under 10k', '10k-25k', '25k-50k', '50k-100k', '100k+')),

  -- AI Analysis Results
  ai_analysis TEXT, -- JSON stored as TEXT
  estimated_cost_min INTEGER,
  estimated_cost_max INTEGER,
  estimated_timeline_weeks INTEGER,
  technology_stack TEXT, -- JSON array stored as TEXT
  team_size_needed INTEGER,
  risk_level TEXT CHECK(risk_level IN ('low', 'medium', 'high')),

  -- Status Management
  status TEXT NOT NULL DEFAULT 'new' CHECK(status IN ('new', 'reviewed', 'contacted', 'converted')),
  admin_notes TEXT,

  -- Timestamps
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  share_token TEXT,
  website_url TEXT
);
INSERT INTO project_estimates_review (id, name, email, company, phone, project_description, project_type, timeline_preference, budget_range, ai_analysis, estimated_cost_min, estimated_cost_max, estimated_timeline_weeks, technology_stack, team_size_needed, risk_level, status, admin_notes, created_at, updated_at, share_token, website_url)
SELECT id, name, email, company, phone, project_description, project_type, timeline_preference, budget_range, ai_analysis, estimated_cost_min, estimated_cost_max, estimated_timeline_weeks, technology_stack, team_size_needed, risk_level, status, admin_notes, created_at, updated_at, share_token, website_url FROM project_estimates;
-- Keep the original AUTOINCREMENT high-water mark, including deleted IDs.
UPDATE sqlite_sequence SET seq = MAX(seq, COALESCE((SELECT seq FROM sqlite_sequence WHERE name = 'project_estimates'), 0)) WHERE name = 'project_estimates_review';
DROP TABLE project_estimates;
ALTER TABLE project_estimates_review RENAME TO project_estimates;
CREATE INDEX idx_project_estimates_status ON project_estimates(status);
CREATE INDEX idx_project_estimates_created ON project_estimates(created_at DESC);
CREATE INDEX idx_project_estimates_email ON project_estimates(email);
CREATE INDEX idx_project_estimates_share_token ON project_estimates(share_token);
-- Preserve the timestamp trigger present in the production database.
CREATE TRIGGER update_project_estimates_timestamp
AFTER UPDATE ON project_estimates
BEGIN
  UPDATE project_estimates SET updated_at = CURRENT_TIMESTAMP WHERE id = NEW.id;
END;
