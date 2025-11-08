-- Create job applications table
CREATE TABLE IF NOT EXISTS job_applications (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  full_name TEXT NOT NULL,
  email TEXT NOT NULL,
  phone TEXT NOT NULL,
  location TEXT NOT NULL,
  position TEXT NOT NULL,
  experience_level TEXT NOT NULL,
  portfolio_url TEXT,
  linkedin_url TEXT,
  github_url TEXT,
  cover_letter TEXT NOT NULL,
  resume_url TEXT,
  skills TEXT NOT NULL,
  availability TEXT NOT NULL,
  salary_expectation TEXT,
  hear_about_us TEXT,
  status TEXT DEFAULT 'new',
  created_at TEXT DEFAULT (datetime('now')),
  updated_at TEXT DEFAULT (datetime('now'))
);

-- Create index on email for faster lookups
CREATE INDEX IF NOT EXISTS idx_job_applications_email ON job_applications(email);

-- Create index on status for filtering
CREATE INDEX IF NOT EXISTS idx_job_applications_status ON job_applications(status);

-- Create index on position for filtering
CREATE INDEX IF NOT EXISTS idx_job_applications_position ON job_applications(position);

-- Create index on created_at for sorting
CREATE INDEX IF NOT EXISTS idx_job_applications_created_at ON job_applications(created_at);
