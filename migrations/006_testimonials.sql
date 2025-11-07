-- Migration: Add Testimonials Table
-- Description: Create testimonials table for client success stories
-- Date: 2025-01-07

-- Create testimonials table
CREATE TABLE IF NOT EXISTS testimonials (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  role TEXT NOT NULL,
  company TEXT NOT NULL,
  content TEXT NOT NULL,
  rating INTEGER DEFAULT 5 CHECK(rating >= 1 AND rating <= 5),
  avatar_url TEXT,
  avatar_initials TEXT,
  avatar_gradient TEXT,
  featured BOOLEAN DEFAULT 0,
  display_order INTEGER DEFAULT 0,
  is_active BOOLEAN DEFAULT 1,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Insert default testimonials
INSERT INTO testimonials (name, role, company, content, rating, avatar_initials, avatar_gradient, featured, display_order, is_active) VALUES
('Oliver B.', 'Marketing Director', 'TechSolutions Inc.', 'Working with this team has been an absolute game-changer for our business. Their attention to detail and commitment to excellence is unmatched. Our website traffic increased by 300% in just 3 months!', 5, 'OB', 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)', 1, 1, 1),
('Sarah M.', 'Founder', 'GreenLeaf Organics', 'The custom WordPress solution they built for us exceeded all expectations. Our conversion rate jumped 40%, and customer engagement has never been higher. Truly exceptional work!', 5, 'SM', 'linear-gradient(135deg, #0073aa 0%, #00a0d2 100%)', 1, 2, 1),
('Michael T.', 'CEO', 'BlueWave Consulting', 'We''ve been partners for over 3 years now, and their consistent quality and innovative solutions keep impressing us. They''re not just developers - they''re strategic partners in our growth.', 5, 'MT', 'linear-gradient(135deg, #ec4899 0%, #f59e0b 100%)', 1, 3, 1),
('Johny T.', 'Blogger', 'Travel Tales', 'As a blogger, I needed a fast, beautiful, and SEO-friendly site. They delivered beyond my wildest dreams! The learning resources they provided were the cherry on top. Highly recommended!', 5, 'JT', 'linear-gradient(135deg, #8b5cf6 0%, #6366f1 100%)', 1, 4, 1);

-- Create index on display_order for faster queries
CREATE INDEX IF NOT EXISTS idx_testimonials_order ON testimonials(display_order);

-- Create index on is_active for filtering
CREATE INDEX IF NOT EXISTS idx_testimonials_active ON testimonials(is_active);

-- Update site content with WordPress branding
UPDATE site_content SET content_value = 'OHWP Studios' WHERE content_key = 'site_name';
UPDATE site_content SET content_value = 'We Speak WordPress Fluently - Expert WordPress Development & Solutions' WHERE content_key = 'site_tagline';
UPDATE site_content SET content_value = 'ohwpstudios@gmail.com' WHERE content_key = 'site_email';
UPDATE site_content SET content_value = '(+233) 54 012 5882' WHERE content_key = 'site_phone';
UPDATE site_content SET content_value = '/wp-logo.svg' WHERE content_key = 'site_logo';
UPDATE site_content SET content_value = '/wp-logo.svg' WHERE content_key = 'site_favicon';

-- Update hero content
UPDATE site_content SET content_value = 'Let''s Talk About Your Next Project' WHERE content_key = 'hero_title';
UPDATE site_content SET content_value = 'Transform your digital presence with world-class WordPress development' WHERE content_key = 'hero_subtitle';

-- Update hero stats
UPDATE site_content SET content_value = '10+' WHERE content_key = 'hero_stat1_number';
UPDATE site_content SET content_value = 'Years Experience' WHERE content_key = 'hero_stat1_label';
UPDATE site_content SET content_value = '400+' WHERE content_key = 'hero_stat2_number';
UPDATE site_content SET content_value = 'Happy Clients' WHERE content_key = 'hero_stat2_label';
UPDATE site_content SET content_value = '100%' WHERE content_key = 'hero_stat3_number';
UPDATE site_content SET content_value = 'WordPress Focused' WHERE content_key = 'hero_stat3_label';

-- Insert WordPress-focused services if they don't exist
INSERT OR IGNORE INTO services (title, description, icon, display_order, is_active) VALUES
('Custom WordPress Development', 'Build stunning, responsive WordPress websites tailored to your unique needs with cutting-edge features and seamless functionality.', 'code', 1, 1),
('WordPress Theme Customization', 'Transform your vision into reality with custom theme development and modifications that perfectly match your brand identity.', 'palette', 2, 1),
('WooCommerce Solutions', 'Create powerful online stores with WooCommerce integration, custom features, and optimized checkout experiences.', 'briefcase', 3, 1),
('WordPress Optimization', 'Supercharge your WordPress site with performance optimization, caching strategies, and speed enhancements.', 'trending-up', 4, 1),
('WordPress Security', 'Protect your WordPress investment with comprehensive security audits, hardening, and ongoing monitoring.', 'shield', 5, 1),
('WordPress Support & Maintenance', 'Keep your WordPress site running smoothly with regular updates, backups, and dedicated technical support.', 'settings', 6, 1);
