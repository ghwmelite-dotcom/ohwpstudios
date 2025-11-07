-- Contact Form Submissions Table
CREATE TABLE IF NOT EXISTS contact_submissions (
  id INTEGER PRIMARY KEY AUTOINCREMENT,

  -- Contact Information
  full_name TEXT NOT NULL,
  email TEXT NOT NULL,
  phone TEXT,
  company TEXT,

  -- Project Details
  service_type TEXT NOT NULL,
  budget_range TEXT,
  project_timeline TEXT,
  project_description TEXT NOT NULL,

  -- Additional Information
  how_found TEXT,
  attachments TEXT, -- JSON array of file URLs

  -- Status & Tracking
  status TEXT DEFAULT 'new' CHECK(status IN ('new', 'contacted', 'in_progress', 'converted', 'closed')),
  priority TEXT DEFAULT 'medium' CHECK(priority IN ('low', 'medium', 'high', 'urgent')),
  assigned_to TEXT,

  -- Analytics
  form_version TEXT DEFAULT 'v1',
  user_agent TEXT,
  referrer TEXT,
  utm_source TEXT,
  utm_medium TEXT,
  utm_campaign TEXT,

  -- Metadata
  notes TEXT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  responded_at DATETIME
);

-- Form Analytics Table
CREATE TABLE IF NOT EXISTS form_analytics (
  id INTEGER PRIMARY KEY AUTOINCREMENT,

  -- Session Information
  session_id TEXT NOT NULL,
  form_type TEXT DEFAULT 'contact',

  -- Progress Tracking
  step_reached INTEGER DEFAULT 1,
  total_steps INTEGER DEFAULT 4,
  completed BOOLEAN DEFAULT FALSE,

  -- Timing Data
  time_spent_seconds INTEGER,
  started_at DATETIME NOT NULL,
  completed_at DATETIME,

  -- User Information
  user_agent TEXT,
  ip_address TEXT,
  referrer TEXT,

  -- Behavior
  field_interactions TEXT, -- JSON object tracking field focus/blur events
  errors_encountered TEXT, -- JSON array of validation errors

  -- Conversion Data
  utm_source TEXT,
  utm_medium TEXT,
  utm_campaign TEXT,

  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Auto-responder Templates Table
CREATE TABLE IF NOT EXISTS email_templates (
  id INTEGER PRIMARY KEY AUTOINCREMENT,

  template_name TEXT NOT NULL UNIQUE,
  template_type TEXT NOT NULL CHECK(template_type IN ('auto_reply', 'notification', 'follow_up')),

  subject TEXT NOT NULL,
  body_html TEXT NOT NULL,
  body_text TEXT NOT NULL,

  -- Variables that can be used in templates: {{name}}, {{email}}, {{service_type}}, etc.
  available_variables TEXT, -- JSON array

  active BOOLEAN DEFAULT TRUE,

  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_contact_status ON contact_submissions(status);
CREATE INDEX IF NOT EXISTS idx_contact_created ON contact_submissions(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_contact_email ON contact_submissions(email);
CREATE INDEX IF NOT EXISTS idx_analytics_session ON form_analytics(session_id);
CREATE INDEX IF NOT EXISTS idx_analytics_completed ON form_analytics(completed, created_at DESC);

-- Insert default auto-responder template
INSERT OR IGNORE INTO email_templates (template_name, template_type, subject, body_html, body_text, available_variables)
VALUES (
  'contact_auto_reply',
  'auto_reply',
  'Thank you for contacting {{company_name}}!',
  '<html><body><h2>Thank you, {{name}}!</h2><p>We have received your inquiry about <strong>{{service_type}}</strong>.</p><p>Our team will review your message and get back to you within 24 hours.</p><p>In the meantime, feel free to explore our <a href="{{website_url}}/portfolio">portfolio</a> or learn more about our <a href="{{website_url}}/services">services</a>.</p><p>Best regards,<br>{{company_name}} Team</p></body></html>',
  'Thank you, {{name}}!\n\nWe have received your inquiry about {{service_type}}.\n\nOur team will review your message and get back to you within 24 hours.\n\nBest regards,\n{{company_name}} Team',
  '["name", "email", "service_type", "company_name", "website_url"]'
);

-- Insert notification template for internal team
INSERT OR IGNORE INTO email_templates (template_name, template_type, subject, body_html, body_text, available_variables)
VALUES (
  'new_contact_notification',
  'notification',
  'New Contact Form Submission: {{service_type}}',
  '<html><body><h2>New Contact Submission</h2><p><strong>Name:</strong> {{name}}</p><p><strong>Email:</strong> {{email}}</p><p><strong>Phone:</strong> {{phone}}</p><p><strong>Company:</strong> {{company}}</p><p><strong>Service:</strong> {{service_type}}</p><p><strong>Budget:</strong> {{budget_range}}</p><p><strong>Timeline:</strong> {{project_timeline}}</p><p><strong>Message:</strong></p><p>{{project_description}}</p><p><a href="{{admin_url}}">View in Admin Panel</a></p></body></html>',
  'New Contact Submission\n\nName: {{name}}\nEmail: {{email}}\nPhone: {{phone}}\nCompany: {{company}}\nService: {{service_type}}\nBudget: {{budget_range}}\nTimeline: {{project_timeline}}\n\nMessage:\n{{project_description}}',
  '["name", "email", "phone", "company", "service_type", "budget_range", "project_timeline", "project_description", "admin_url"]'
);
