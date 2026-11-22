-- Additive only: existing posts, client records and auth tables are untouched.
CREATE TABLE IF NOT EXISTS editorial_settings (
  id INTEGER PRIMARY KEY CHECK (id = 1),
  enabled INTEGER NOT NULL DEFAULT 1 CHECK (enabled IN (0,1)),
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);
INSERT OR IGNORE INTO editorial_settings(id,enabled) VALUES(1,1);
CREATE TABLE IF NOT EXISTS editorial_runs (
  week_key TEXT PRIMARY KEY,
  topic_key TEXT NOT NULL,
  status TEXT NOT NULL CHECK (status IN ('running','draft','failed')),
  attempt_count INTEGER NOT NULL DEFAULT 1 CHECK (attempt_count BETWEEN 1 AND 2),
  lease_token TEXT NOT NULL,
  started_at TEXT NOT NULL,
  finished_at TEXT,
  post_id INTEGER REFERENCES blog_posts(id) ON DELETE SET NULL,
  source_notes TEXT NOT NULL DEFAULT '[]',
  review_notes TEXT NOT NULL DEFAULT '',
  error_code TEXT,
  word_count INTEGER,
  content_hash TEXT UNIQUE,
  model TEXT NOT NULL,
  usage TEXT NOT NULL DEFAULT '{}'
);
CREATE INDEX IF NOT EXISTS idx_editorial_runs_started ON editorial_runs(started_at DESC);
