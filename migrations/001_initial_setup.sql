-- Initial database setup for Agency Website CMS
-- This creates all necessary tables and inserts default content

-- Site content table (key-value store for flexible content)
CREATE TABLE IF NOT EXISTS site_content (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  content_key TEXT UNIQUE NOT NULL,
  content_value TEXT NOT NULL,
  content_type TEXT NOT NULL DEFAULT 'text',
  updated_at TEXT NOT NULL,
  updated_by INTEGER DEFAULT 1
);

-- Admin users table
CREATE TABLE IF NOT EXISTS admin_users (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  username TEXT UNIQUE NOT NULL,
  password_hash TEXT NOT NULL,
  email TEXT UNIQUE NOT NULL,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  last_login TEXT
);

-- Session tokens table
CREATE TABLE IF NOT EXISTS sessions (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  token TEXT UNIQUE NOT NULL,
  user_id INTEGER NOT NULL,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  expires_at TEXT NOT NULL,
  FOREIGN KEY (user_id) REFERENCES admin_users(id)
);

-- Services table
CREATE TABLE IF NOT EXISTS services (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  title TEXT NOT NULL,
  description TEXT NOT NULL,
  icon TEXT NOT NULL,
  display_order INTEGER DEFAULT 0,
  is_active INTEGER DEFAULT 1,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

-- Portfolio items table
CREATE TABLE IF NOT EXISTS portfolio (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  title TEXT NOT NULL,
  description TEXT NOT NULL,
  image_url TEXT,
  project_url TEXT,
  tags TEXT,
  featured INTEGER DEFAULT 0,
  display_order INTEGER DEFAULT 0,
  is_active INTEGER DEFAULT 1,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

-- Contact form submissions
CREATE TABLE IF NOT EXISTS contacts (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  email TEXT NOT NULL,
  company TEXT,
  service TEXT,
  message TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

-- Booking submissions
CREATE TABLE IF NOT EXISTS bookings (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  email TEXT NOT NULL,
  phone TEXT,
  date TEXT NOT NULL,
  time TEXT NOT NULL,
  message TEXT NOT NULL,
  status TEXT DEFAULT 'pending',
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

-- Insert default admin user (password: admin123)
-- ⚠️ IMPORTANT: Change this password immediately after first login!
INSERT OR IGNORE INTO admin_users (id, username, password_hash, email, created_at)
VALUES (
  1,
  'admin', 
  'admin123_changeme',  -- This is a placeholder, implement proper hashing in production
  'admin@yoursite.com', 
  datetime('now')
);

-- Insert default site content
INSERT OR IGNORE INTO site_content (content_key, content_value, content_type, updated_at) VALUES
  ('hero_title', 'Crafting Digital Excellence That Drives Results', 'text', datetime('now')),
  ('hero_subtitle', 'We design and build stunning, high-performance websites and digital experiences for forward-thinking businesses ready to dominate their industry.', 'text', datetime('now')),
  ('hero_stat1_number', '500+', 'text', datetime('now')),
  ('hero_stat1_label', 'Projects Delivered', 'text', datetime('now')),
  ('hero_stat2_number', '98%', 'text', datetime('now')),
  ('hero_stat2_label', 'Client Satisfaction', 'text', datetime('now')),
  ('hero_stat3_number', '50+', 'text', datetime('now')),
  ('hero_stat3_label', 'Team Members', 'text', datetime('now')),
  ('site_name', 'Your Agency Name', 'text', datetime('now')),
  ('site_tagline', 'Crafting Digital Excellence', 'text', datetime('now')),
  ('site_email', 'hello@yoursite.com', 'text', datetime('now')),
  ('site_phone', '+1 (555) 123-4567', 'text', datetime('now'));

-- Insert default services
INSERT OR IGNORE INTO services (title, description, icon, display_order) VALUES
  ('Web Development', 'Custom websites and web applications built with cutting-edge technology for maximum performance.', 'code', 1),
  ('UI/UX Design', 'Beautiful, intuitive interfaces that engage users and drive conversions.', 'palette', 2),
  ('Branding', 'Comprehensive brand identity systems that make you stand out from the competition.', 'sparkles', 3),
  ('SEO & Marketing', 'Data-driven strategies to increase visibility and grow your online presence.', 'chart', 4),
  ('Cloud Solutions', 'Scalable, secure cloud infrastructure on Cloudflare, AWS, and more.', 'cloud', 5),
  ('Consulting', 'Expert guidance on technology strategy, architecture, and digital transformation.', 'lightbulb', 6);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_content_key ON site_content(content_key);
CREATE INDEX IF NOT EXISTS idx_sessions_token ON sessions(token);
CREATE INDEX IF NOT EXISTS idx_services_order ON services(display_order, is_active);
CREATE INDEX IF NOT EXISTS idx_portfolio_order ON portfolio(display_order, is_active);

