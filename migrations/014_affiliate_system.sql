-- Affiliate System Database Schema

-- Affiliates table
CREATE TABLE IF NOT EXISTS affiliates (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id TEXT UNIQUE NOT NULL,
  email TEXT UNIQUE NOT NULL,
  name TEXT NOT NULL,
  company_name TEXT,
  website TEXT,
  social_profiles TEXT, -- JSON: {twitter, linkedin, instagram}

  -- Affiliate code
  affiliate_code TEXT UNIQUE NOT NULL,

  -- Status
  status TEXT CHECK(status IN ('pending', 'active', 'suspended', 'rejected')) DEFAULT 'pending',
  tier TEXT CHECK(tier IN ('bronze', 'silver', 'gold', 'platinum')) DEFAULT 'bronze',

  -- Commission rates (can override defaults)
  commission_rate_project REAL DEFAULT 10.0,
  commission_rate_consulting REAL DEFAULT 15.0,
  commission_rate_recurring REAL DEFAULT 5.0,

  -- Payment info
  payment_method TEXT CHECK(payment_method IN ('paypal', 'bank_transfer', 'crypto')) DEFAULT 'paypal',
  payment_details TEXT, -- JSON: encrypted payment details
  tax_form_submitted INTEGER DEFAULT 0,

  -- Stats
  total_clicks INTEGER DEFAULT 0,
  total_leads INTEGER DEFAULT 0,
  total_conversions INTEGER DEFAULT 0,
  total_earned REAL DEFAULT 0.0,
  total_paid REAL DEFAULT 0.0,
  pending_payout REAL DEFAULT 0.0,

  -- Metadata
  notes TEXT,
  referred_by INTEGER, -- Affiliate who referred this affiliate (multi-level)
  approved_by TEXT,
  approved_at TEXT,
  created_at TEXT DEFAULT (datetime('now')),
  updated_at TEXT DEFAULT (datetime('now')),

  FOREIGN KEY (referred_by) REFERENCES affiliates(id)
);

-- Affiliate clicks tracking
CREATE TABLE IF NOT EXISTS affiliate_clicks (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  affiliate_id INTEGER NOT NULL,
  affiliate_code TEXT NOT NULL,

  -- Tracking data
  ip_address TEXT,
  user_agent TEXT,
  referer TEXT,
  landing_page TEXT,
  utm_source TEXT,
  utm_medium TEXT,
  utm_campaign TEXT,

  -- Cookie/session
  tracking_cookie TEXT UNIQUE NOT NULL,
  cookie_expires_at TEXT NOT NULL,

  -- Conversion tracking
  converted INTEGER DEFAULT 0,
  lead_id INTEGER, -- Links to contact_form_submissions
  project_id INTEGER, -- Links to projects

  clicked_at TEXT DEFAULT (datetime('now')),

  FOREIGN KEY (affiliate_id) REFERENCES affiliates(id),
  FOREIGN KEY (lead_id) REFERENCES contact_form_submissions(id),
  FOREIGN KEY (project_id) REFERENCES projects(id)
);

-- Affiliate commissions
CREATE TABLE IF NOT EXISTS affiliate_commissions (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  affiliate_id INTEGER NOT NULL,

  -- Commission details
  type TEXT CHECK(type IN ('project', 'consulting', 'recurring', 'bonus')) NOT NULL,
  amount REAL NOT NULL,
  commission_rate REAL NOT NULL,
  project_value REAL,

  -- Related records
  project_id INTEGER,
  click_id INTEGER,

  -- Status
  status TEXT CHECK(status IN ('pending', 'approved', 'paid', 'cancelled')) DEFAULT 'pending',

  -- Payment
  payout_id INTEGER, -- Links to payout batch
  paid_at TEXT,

  -- Notes
  description TEXT,
  admin_notes TEXT,

  created_at TEXT DEFAULT (datetime('now')),
  updated_at TEXT DEFAULT (datetime('now')),

  FOREIGN KEY (affiliate_id) REFERENCES affiliates(id),
  FOREIGN KEY (project_id) REFERENCES projects(id),
  FOREIGN KEY (click_id) REFERENCES affiliate_clicks(id),
  FOREIGN KEY (payout_id) REFERENCES affiliate_payouts(id)
);

-- Affiliate payouts (batch payments)
CREATE TABLE IF NOT EXISTS affiliate_payouts (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  affiliate_id INTEGER NOT NULL,

  -- Payout details
  amount REAL NOT NULL,
  payment_method TEXT NOT NULL,
  transaction_id TEXT, -- PayPal transaction ID, bank reference, etc.

  -- Status
  status TEXT CHECK(status IN ('pending', 'processing', 'completed', 'failed')) DEFAULT 'pending',

  -- Metadata
  commission_ids TEXT, -- JSON array of commission IDs included
  invoice_url TEXT,
  notes TEXT,
  processed_by TEXT,

  created_at TEXT DEFAULT (datetime('now')),
  completed_at TEXT,

  FOREIGN KEY (affiliate_id) REFERENCES affiliates(id)
);

-- Affiliate resources/materials
CREATE TABLE IF NOT EXISTS affiliate_resources (
  id INTEGER PRIMARY KEY AUTOINCREMENT,

  -- Resource details
  title TEXT NOT NULL,
  description TEXT,
  type TEXT CHECK(type IN ('email_template', 'social_graphic', 'blog_template', 'video', 'case_study', 'other')) NOT NULL,

  -- File info
  file_url TEXT,
  file_size INTEGER,
  thumbnail_url TEXT,

  -- Metadata
  downloads INTEGER DEFAULT 0,
  tier_required TEXT CHECK(tier_required IN ('bronze', 'silver', 'gold', 'platinum')) DEFAULT 'bronze',
  tags TEXT, -- JSON array

  active INTEGER DEFAULT 1,
  created_at TEXT DEFAULT (datetime('now')),
  updated_at TEXT DEFAULT (datetime('now'))
);

-- Affiliate resource downloads tracking
CREATE TABLE IF NOT EXISTS affiliate_resource_downloads (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  affiliate_id INTEGER NOT NULL,
  resource_id INTEGER NOT NULL,

  downloaded_at TEXT DEFAULT (datetime('now')),

  FOREIGN KEY (affiliate_id) REFERENCES affiliates(id),
  FOREIGN KEY (resource_id) REFERENCES affiliate_resources(id)
);

-- Indexes for performance
CREATE INDEX idx_affiliates_code ON affiliates(affiliate_code);
CREATE INDEX idx_affiliates_email ON affiliates(email);
CREATE INDEX idx_affiliates_status ON affiliates(status);

CREATE INDEX idx_clicks_affiliate ON affiliate_clicks(affiliate_id);
CREATE INDEX idx_clicks_cookie ON affiliate_clicks(tracking_cookie);
CREATE INDEX idx_clicks_converted ON affiliate_clicks(converted);

CREATE INDEX idx_commissions_affiliate ON affiliate_commissions(affiliate_id);
CREATE INDEX idx_commissions_status ON affiliate_commissions(status);
CREATE INDEX idx_commissions_project ON affiliate_commissions(project_id);

CREATE INDEX idx_payouts_affiliate ON affiliate_payouts(affiliate_id);
CREATE INDEX idx_payouts_status ON affiliate_payouts(status);
