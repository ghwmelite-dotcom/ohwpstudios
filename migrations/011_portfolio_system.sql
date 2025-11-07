-- Portfolio Categories
CREATE TABLE IF NOT EXISTS portfolio_categories (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL UNIQUE,
  slug TEXT NOT NULL UNIQUE,
  description TEXT,
  icon TEXT,
  display_order INTEGER DEFAULT 0,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Portfolio Tags
CREATE TABLE IF NOT EXISTS portfolio_tags (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL UNIQUE,
  slug TEXT NOT NULL UNIQUE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Portfolio Projects
CREATE TABLE IF NOT EXISTS portfolio_projects (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  title TEXT NOT NULL,
  slug TEXT NOT NULL UNIQUE,
  subtitle TEXT,
  description TEXT,
  client_name TEXT,
  project_url TEXT,
  featured_image TEXT,
  thumbnail_image TEXT,

  -- Case study details
  challenge TEXT,
  solution TEXT,
  results TEXT,

  -- Project metadata
  category_id INTEGER,
  project_date DATE,
  completion_date DATE,
  duration TEXT,

  -- Stats and metrics
  metric_1_label TEXT,
  metric_1_value TEXT,
  metric_2_label TEXT,
  metric_2_value TEXT,
  metric_3_label TEXT,
  metric_3_value TEXT,
  metric_4_label TEXT,
  metric_4_value TEXT,

  -- Display settings
  is_featured BOOLEAN DEFAULT 0,
  is_published BOOLEAN DEFAULT 1,
  display_order INTEGER DEFAULT 0,

  -- SEO
  meta_title TEXT,
  meta_description TEXT,

  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

  FOREIGN KEY (category_id) REFERENCES portfolio_categories(id) ON DELETE SET NULL
);

-- Portfolio Project Images (Gallery)
CREATE TABLE IF NOT EXISTS portfolio_project_images (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  project_id INTEGER NOT NULL,
  image_url TEXT NOT NULL,
  caption TEXT,
  display_order INTEGER DEFAULT 0,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

  FOREIGN KEY (project_id) REFERENCES portfolio_projects(id) ON DELETE CASCADE
);

-- Portfolio Project Tags (Many-to-Many)
CREATE TABLE IF NOT EXISTS portfolio_project_tags (
  project_id INTEGER NOT NULL,
  tag_id INTEGER NOT NULL,
  PRIMARY KEY (project_id, tag_id),
  FOREIGN KEY (project_id) REFERENCES portfolio_projects(id) ON DELETE CASCADE,
  FOREIGN KEY (tag_id) REFERENCES portfolio_tags(id) ON DELETE CASCADE
);

-- Testimonials for Projects
CREATE TABLE IF NOT EXISTS portfolio_testimonials (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  project_id INTEGER NOT NULL,
  client_name TEXT NOT NULL,
  client_position TEXT,
  client_company TEXT,
  testimonial TEXT NOT NULL,
  avatar_url TEXT,
  rating INTEGER DEFAULT 5,
  is_featured BOOLEAN DEFAULT 0,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

  FOREIGN KEY (project_id) REFERENCES portfolio_projects(id) ON DELETE CASCADE
);

-- Insert default categories
INSERT OR IGNORE INTO portfolio_categories (name, slug, description, icon, display_order) VALUES
('Web Development', 'web-development', 'Custom websites and web applications', '🌐', 1),
('Mobile Apps', 'mobile-apps', 'iOS and Android mobile applications', '📱', 2),
('UI/UX Design', 'ui-ux-design', 'User interface and experience design', '🎨', 3),
('Branding', 'branding', 'Brand identity and visual design', '✨', 4),
('E-Commerce', 'e-commerce', 'Online stores and shopping platforms', '🛒', 5),
('Marketing', 'marketing', 'Digital marketing and SEO campaigns', '📊', 6);

-- Insert default tags
INSERT OR IGNORE INTO portfolio_tags (name, slug) VALUES
('React', 'react'),
('Vue.js', 'vue-js'),
('Next.js', 'next-js'),
('WordPress', 'wordpress'),
('Shopify', 'shopify'),
('Figma', 'figma'),
('Adobe XD', 'adobe-xd'),
('SEO', 'seo'),
('E-commerce', 'e-commerce'),
('Responsive', 'responsive'),
('Animation', 'animation'),
('JavaScript', 'javascript'),
('TypeScript', 'typescript'),
('Astro', 'astro'),
('Tailwind CSS', 'tailwind-css');

-- Create indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_portfolio_projects_category ON portfolio_projects(category_id);
CREATE INDEX IF NOT EXISTS idx_portfolio_projects_slug ON portfolio_projects(slug);
CREATE INDEX IF NOT EXISTS idx_portfolio_projects_featured ON portfolio_projects(is_featured);
CREATE INDEX IF NOT EXISTS idx_portfolio_projects_published ON portfolio_projects(is_published);
CREATE INDEX IF NOT EXISTS idx_portfolio_project_images_project ON portfolio_project_images(project_id);
CREATE INDEX IF NOT EXISTS idx_portfolio_testimonials_project ON portfolio_testimonials(project_id);
