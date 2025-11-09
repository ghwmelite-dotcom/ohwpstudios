-- Enhance Project Milestones Table
-- Add priority, deliverables, and approval tracking fields

-- Add new columns to project_milestones table
ALTER TABLE project_milestones ADD COLUMN priority TEXT DEFAULT 'medium';
ALTER TABLE project_milestones ADD COLUMN deliverables TEXT; -- JSON array of deliverable items
ALTER TABLE project_milestones ADD COLUMN approval_status TEXT DEFAULT 'pending'; -- pending, approved, changes_requested
ALTER TABLE project_milestones ADD COLUMN approval_notes TEXT;
ALTER TABLE project_milestones ADD COLUMN approved_at TEXT;
ALTER TABLE project_milestones ADD COLUMN approved_by TEXT;
ALTER TABLE project_milestones ADD COLUMN created_at TEXT DEFAULT (datetime('now'));
ALTER TABLE project_milestones ADD COLUMN updated_at TEXT DEFAULT (datetime('now'));
