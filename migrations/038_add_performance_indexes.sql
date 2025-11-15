-- Performance Optimization: Add Missing Indexes
-- Improves query performance for frequently accessed tables

-- Sessions table indexes
-- Speeds up session validation queries
CREATE INDEX IF NOT EXISTS idx_sessions_token ON sessions(token);
CREATE INDEX IF NOT EXISTS idx_sessions_expires_at ON sessions(expires_at);
CREATE INDEX IF NOT EXISTS idx_sessions_token_expires ON sessions(token, expires_at);

-- Portfolio projects indexes
-- Speeds up portfolio listing and filtering
CREATE INDEX IF NOT EXISTS idx_portfolio_status ON portfolio_projects(is_published);
CREATE INDEX IF NOT EXISTS idx_portfolio_display_order ON portfolio_projects(display_order);
CREATE INDEX IF NOT EXISTS idx_portfolio_status_order ON portfolio_projects(is_published, display_order);
CREATE INDEX IF NOT EXISTS idx_portfolio_featured ON portfolio_projects(is_featured);
CREATE INDEX IF NOT EXISTS idx_portfolio_created ON portfolio_projects(created_at);

-- Blog posts indexes
-- Speeds up blog listing and filtering
CREATE INDEX IF NOT EXISTS idx_blog_posts_published ON blog_posts(published);
CREATE INDEX IF NOT EXISTS idx_blog_posts_published_at ON blog_posts(published_at);
CREATE INDEX IF NOT EXISTS idx_blog_posts_published_date ON blog_posts(published, published_at);
CREATE INDEX IF NOT EXISTS idx_blog_posts_slug ON blog_posts(slug);
CREATE INDEX IF NOT EXISTS idx_blog_posts_author ON blog_posts(author);

-- Client users indexes
-- Speeds up client login and token validation
CREATE INDEX IF NOT EXISTS idx_client_users_token ON client_users(token);
CREATE INDEX IF NOT EXISTS idx_client_users_token_expires ON client_users(token, token_expires_at);

-- Affiliate programs indexes
-- Speeds up affiliate tracking and commission calculations
CREATE INDEX IF NOT EXISTS idx_affiliate_users_referral_code ON affiliate_users(referral_code);
CREATE INDEX IF NOT EXISTS idx_affiliate_users_status ON affiliate_users(status);
CREATE INDEX IF NOT EXISTS idx_affiliate_referrals_affiliate_id ON affiliate_referrals(affiliate_id);
CREATE INDEX IF NOT EXISTS idx_affiliate_referrals_status ON affiliate_referrals(status);

-- Contact and newsletter indexes
-- Speeds up admin dashboard queries
CREATE INDEX IF NOT EXISTS idx_contact_submissions_status ON contact_submissions(status);
CREATE INDEX IF NOT EXISTS idx_contact_submissions_created ON contact_submissions(created_at);
CREATE INDEX IF NOT EXISTS idx_newsletter_subscribers_status ON newsletter_subscribers(status);
CREATE INDEX IF NOT EXISTS idx_newsletter_subscribers_created ON newsletter_subscribers(created_at);

-- Job applications indexes
CREATE INDEX IF NOT EXISTS idx_job_applications_status ON job_applications(status);
CREATE INDEX IF NOT EXISTS idx_job_applications_created ON job_applications(created_at);
