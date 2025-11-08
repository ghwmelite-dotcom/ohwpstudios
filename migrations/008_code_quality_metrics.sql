-- Code Quality Metrics System Migration

-- Code Quality Metrics Table
CREATE TABLE IF NOT EXISTS code_quality_metrics (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  project_id INTEGER NOT NULL,
  metric_date TEXT NOT NULL,

  -- Quality Scores (0-100)
  code_coverage_percent INTEGER DEFAULT 0,
  security_score INTEGER DEFAULT 0,
  performance_score INTEGER DEFAULT 0,
  test_pass_rate INTEGER DEFAULT 0,

  -- Test Statistics
  total_tests INTEGER DEFAULT 0,
  passing_tests INTEGER DEFAULT 0,
  failing_tests INTEGER DEFAULT 0,

  -- Code Quality
  code_quality_grade TEXT DEFAULT 'C',
  technical_debt_hours REAL DEFAULT 0,

  -- Security Vulnerabilities
  vulnerabilities_critical INTEGER DEFAULT 0,
  vulnerabilities_high INTEGER DEFAULT 0,
  vulnerabilities_medium INTEGER DEFAULT 0,
  vulnerabilities_low INTEGER DEFAULT 0,

  -- Deployment Info
  last_deployment_at TEXT,
  deployment_status TEXT DEFAULT 'success',
  deployment_duration_seconds INTEGER DEFAULT 0,

  -- Performance Metrics
  uptime_percent REAL DEFAULT 100.0,
  response_time_ms INTEGER DEFAULT 0,

  created_at TEXT DEFAULT (datetime('now')),

  FOREIGN KEY (project_id) REFERENCES client_projects(id) ON DELETE CASCADE
);

-- Deployment History Table
CREATE TABLE IF NOT EXISTS deployment_history (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  project_id INTEGER NOT NULL,
  deployed_at TEXT NOT NULL,
  deployed_by TEXT DEFAULT 'admin',
  version TEXT,
  branch TEXT DEFAULT 'main',
  status TEXT DEFAULT 'success',
  duration_seconds INTEGER DEFAULT 0,
  commit_message TEXT,
  created_at TEXT DEFAULT (datetime('now')),

  FOREIGN KEY (project_id) REFERENCES client_projects(id) ON DELETE CASCADE
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_code_quality_metrics_project_id ON code_quality_metrics(project_id);
CREATE INDEX IF NOT EXISTS idx_code_quality_metrics_date ON code_quality_metrics(metric_date);
CREATE INDEX IF NOT EXISTS idx_deployment_history_project_id ON deployment_history(project_id);
CREATE INDEX IF NOT EXISTS idx_deployment_history_deployed_at ON deployment_history(deployed_at);
