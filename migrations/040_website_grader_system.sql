-- Migration: Website Grader System
-- Description: Store website analysis results and captured leads
-- Date: 2025-01-20

-- Create website grader leads table
CREATE TABLE IF NOT EXISTS website_grader_leads (
  id INTEGER PRIMARY KEY AUTOINCREMENT,

  -- Website and lead info
  url TEXT NOT NULL,
  email TEXT NOT NULL,
  name TEXT,

  -- Scores (0-100)
  overall_score INTEGER NOT NULL,
  performance_score INTEGER NOT NULL,
  seo_score INTEGER NOT NULL,
  security_score INTEGER NOT NULL,
  mobile_score INTEGER NOT NULL,

  -- Full analysis JSON
  analysis_json TEXT NOT NULL,

  -- Follow-up tracking
  contacted BOOLEAN DEFAULT 0,
  contacted_at TIMESTAMP,
  converted BOOLEAN DEFAULT 0,
  converted_at TIMESTAMP,
  notes TEXT,

  -- Timestamps
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_grader_leads_email ON website_grader_leads(email);
CREATE INDEX IF NOT EXISTS idx_grader_leads_score ON website_grader_leads(overall_score DESC);
CREATE INDEX IF NOT EXISTS idx_grader_leads_created ON website_grader_leads(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_grader_leads_contacted ON website_grader_leads(contacted, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_grader_leads_converted ON website_grader_leads(converted);
