-- Migration 045: Shareable proposals for the Scope My Project funnel
-- Description: Adds a unique share_token (for /proposal/<token> shareable pages) and an
--              optional website_url (existing site, fed into the AI scoping prompt) to
--              project_estimates.
-- Date: 2026-06-07

ALTER TABLE project_estimates ADD COLUMN share_token TEXT;
ALTER TABLE project_estimates ADD COLUMN website_url TEXT;

CREATE INDEX IF NOT EXISTS idx_project_estimates_share_token ON project_estimates(share_token);
