-- Website Audits Table
CREATE TABLE IF NOT EXISTS website_audits (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  url TEXT NOT NULL,
  visitor_email TEXT,
  visitor_name TEXT,

  -- Performance Metrics
  performance_score INTEGER,
  speed_index INTEGER,
  largest_contentful_paint REAL,
  total_blocking_time REAL,
  cumulative_layout_shift REAL,

  -- SEO Metrics
  seo_score INTEGER,
  has_meta_description BOOLEAN,
  has_title_tag BOOLEAN,
  is_mobile_friendly BOOLEAN,
  has_sitemap BOOLEAN,

  -- Accessibility Metrics
  accessibility_score INTEGER,
  color_contrast_issues INTEGER,
  missing_alt_tags INTEGER,
  wcag_compliance_level TEXT,

  -- Security Metrics
  security_score INTEGER,
  has_ssl BOOLEAN,
  has_https BOOLEAN,
  security_headers_count INTEGER,

  -- Overall Score
  overall_score INTEGER,

  -- Metadata
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  ip_address TEXT
);

-- Index for faster lookups
CREATE INDEX IF NOT EXISTS idx_audits_url ON website_audits(url);
CREATE INDEX IF NOT EXISTS idx_audits_email ON website_audits(visitor_email);
CREATE INDEX IF NOT EXISTS idx_audits_created ON website_audits(created_at);
