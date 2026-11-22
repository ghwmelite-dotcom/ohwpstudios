-- Additive scheduler/audit metadata only. Existing projects and clients are untouched.
CREATE TABLE IF NOT EXISTS portfolio_sync_settings (
 id INTEGER PRIMARY KEY CHECK(id=1), enabled INTEGER NOT NULL DEFAULT 1 CHECK(enabled IN(0,1)),
 updated_at TEXT NOT NULL DEFAULT(datetime('now'))
);
INSERT OR IGNORE INTO portfolio_sync_settings(id,enabled) VALUES(1,1);
CREATE TABLE IF NOT EXISTS portfolio_sync_runs (
 week_key TEXT PRIMARY KEY, status TEXT NOT NULL CHECK(status IN('running','complete','failed','paused')),
 attempt_count INTEGER NOT NULL DEFAULT 1 CHECK(attempt_count BETWEEN 1 AND 2),
 lease_token TEXT NOT NULL, started_at TEXT NOT NULL, finished_at TEXT,
 discovered INTEGER NOT NULL DEFAULT 0, added INTEGER NOT NULL DEFAULT 0,
 preserved INTEGER NOT NULL DEFAULT 0, deferred INTEGER NOT NULL DEFAULT 0,
 error_code TEXT
);
CREATE TABLE IF NOT EXISTS portfolio_repository_sync (
 repository_id INTEGER PRIMARY KEY, repository_url TEXT NOT NULL,
 project_id INTEGER REFERENCES portfolio_projects(id) ON DELETE SET NULL,
 origin TEXT NOT NULL CHECK(origin IN('existing','draft')),
 run_token TEXT NOT NULL, discovered_at TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_portfolio_repository_project ON portfolio_repository_sync(project_id);
