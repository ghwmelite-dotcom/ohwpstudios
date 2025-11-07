-- About page content storage
-- Adding fields to site_content for about page

-- Insert default about page content
INSERT OR REPLACE INTO site_content (content_key, content_value, content_type, updated_at, updated_by) VALUES
('about_hero_badge', 'About Us', 'text', datetime('now'), 1),
('about_hero_title', 'Building Digital Excellence One Project at a Time', 'text', datetime('now'), 1),
('about_hero_description', 'We''re a team of passionate designers, developers, and strategists dedicated to creating digital experiences that make a difference.', 'text', datetime('now'), 1),
('about_story_title', 'Our Story', 'text', datetime('now'), 1),
('about_story_content', 'Founded with a vision to transform the digital landscape, our agency has grown from a small team of passionate creators into a full-service digital powerhouse. We believe in the power of great design and cutting-edge technology to solve real business challenges.', 'text', datetime('now'), 1);

-- Team members table
CREATE TABLE IF NOT EXISTS team_members (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  role TEXT NOT NULL,
  bio TEXT,
  image_url TEXT,
  display_order INTEGER DEFAULT 0,
  is_active INTEGER DEFAULT 1,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

-- Insert default team members
INSERT INTO team_members (name, role, bio, display_order) VALUES
('John Smith', 'CEO & Founder', 'Visionary leader with 15+ years in digital innovation.', 1),
('Sarah Johnson', 'Creative Director', 'Award-winning designer crafting beautiful experiences.', 2),
('Michael Chen', 'Lead Developer', 'Full-stack expert passionate about clean code.', 3),
('Emily Rodriguez', 'Marketing Director', 'Strategic thinker driving growth and engagement.', 4);

-- Core values table
CREATE TABLE IF NOT EXISTS core_values (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  title TEXT NOT NULL,
  description TEXT NOT NULL,
  icon TEXT NOT NULL,
  display_order INTEGER DEFAULT 0,
  is_active INTEGER DEFAULT 1,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

-- Insert default core values
INSERT INTO core_values (title, description, icon, display_order) VALUES
('Innovation First', 'We stay ahead of the curve, constantly exploring new technologies and methodologies to deliver cutting-edge solutions.', 'layers', 1),
('Client Partnership', 'Your success is our success. We work closely with you, treating your goals as our own throughout the entire journey.', 'users', 2),
('Quality Obsessed', 'We sweat the details. Every pixel, every line of code, every interaction is crafted with precision and care.', 'activity', 3),
('Timely Delivery', 'We respect deadlines. Our agile processes ensure projects are delivered on time without compromising quality.', 'clock', 4),
('Continuous Growth', 'We''re always learning. Our team is committed to personal and professional development to serve you better.', 'trending-up', 5),
('Passion Driven', 'We love what we do. This passion fuels our creativity and drives us to create extraordinary digital experiences.', 'heart', 6);
