-- Migration: AI Lead Qualification System
-- Description: Stores AI-analyzed qualified leads from chat conversations
-- Date: 2025-01-20

-- Create qualified leads table (AI-analyzed conversations)
CREATE TABLE IF NOT EXISTS chat_qualified_leads (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  conversation_id INTEGER NOT NULL,

  -- Project details extracted by AI
  project_type TEXT, -- Website Development, Mobile App, E-Commerce, SEO Services, Custom Software
  budget_range TEXT, -- e.g., "$10k-$25k", "Under $10k", "$50k+", "Not specified"
  timeline TEXT, -- e.g., "ASAP", "1-2 months", "Q1 2025", "Not specified"
  requirements_json TEXT, -- JSON array of extracted requirements

  -- AI analysis results
  sentiment_score REAL NOT NULL, -- 0-1 where 1 is extremely interested
  is_hot_lead BOOLEAN DEFAULT 0, -- Flagged as hot lead (sentiment = 'hot')
  confidence_score REAL, -- 0-1 confidence in the assessment
  recommended_action TEXT, -- book_meeting, send_estimate, continue_chat, escalate

  -- Estimate provided by AI
  estimate_provided TEXT, -- JSON with range and breakdown

  -- Lead contact info
  user_email TEXT,
  user_name TEXT,

  -- Tracking
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  notified_at TIMESTAMP, -- When hot lead email was sent
  followed_up BOOLEAN DEFAULT 0,
  followed_up_at TIMESTAMP,

  FOREIGN KEY (conversation_id) REFERENCES chat_conversations(id) ON DELETE CASCADE
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_qualified_leads_sentiment ON chat_qualified_leads(sentiment_score DESC);
CREATE INDEX IF NOT EXISTS idx_qualified_leads_hot ON chat_qualified_leads(is_hot_lead);
CREATE INDEX IF NOT EXISTS idx_qualified_leads_project_type ON chat_qualified_leads(project_type);
CREATE INDEX IF NOT EXISTS idx_qualified_leads_created ON chat_qualified_leads(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_qualified_leads_conversation ON chat_qualified_leads(conversation_id);
CREATE INDEX IF NOT EXISTS idx_qualified_leads_followed_up ON chat_qualified_leads(followed_up, created_at DESC);

-- Add qualification tracking to conversations table
-- This helps link conversations to their qualification status
ALTER TABLE chat_conversations ADD COLUMN is_qualified BOOLEAN DEFAULT 0;
ALTER TABLE chat_conversations ADD COLUMN qualification_checked BOOLEAN DEFAULT 0;
ALTER TABLE chat_conversations ADD COLUMN last_qualification_check TIMESTAMP;

-- Create index for qualification status
CREATE INDEX IF NOT EXISTS idx_conversations_qualified ON chat_conversations(is_qualified, qualification_checked);
