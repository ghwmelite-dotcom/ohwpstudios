-- Migration: Project Estimator Tables
-- Description: Creates tables for AI-powered project estimation feature

CREATE TABLE IF NOT EXISTS project_estimates (
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
  budget_range TEXT NOT NULL CHECK(budget_range IN ('under 10k', '10k-25k', '25k-50k', '50k-100k', '100k+')),

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
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Index for faster queries
CREATE INDEX IF NOT EXISTS idx_project_estimates_status ON project_estimates(status);
CREATE INDEX IF NOT EXISTS idx_project_estimates_created ON project_estimates(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_project_estimates_email ON project_estimates(email);

-- Trigger to update updated_at timestamp
CREATE TRIGGER IF NOT EXISTS update_project_estimates_timestamp
AFTER UPDATE ON project_estimates
BEGIN
  UPDATE project_estimates SET updated_at = CURRENT_TIMESTAMP WHERE id = NEW.id;
END;
