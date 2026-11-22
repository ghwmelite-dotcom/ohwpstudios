-- Additive repository provenance. Existing projects and publishing state stay intact.
ALTER TABLE portfolio_projects ADD COLUMN repository_url TEXT;
ALTER TABLE portfolio_projects ADD COLUMN repository_readme_sha TEXT;
ALTER TABLE portfolio_projects ADD COLUMN repository_verified_at TEXT;
