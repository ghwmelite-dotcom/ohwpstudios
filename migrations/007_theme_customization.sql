-- Migration: Theme Customization System
-- Description: Add theme settings and more testimonials
-- Date: 2025-01-07

-- Add 2 more testimonials
INSERT INTO testimonials (name, role, company, content, rating, avatar_initials, avatar_gradient, featured, display_order, is_active) VALUES
('Emily R.', 'E-Commerce Director', 'FashionHub Retail', 'Their WooCommerce expertise transformed our online store completely. Sales increased by 85% in the first quarter, and the checkout experience is now seamless. Best investment we ever made!', 5, 'ER', 'linear-gradient(135deg, #f59e0b 0%, #ef4444 100%)', 1, 5, 1),
('David K.', 'CTO', 'InnovateTech Solutions', 'The team''s technical prowess and attention to security is outstanding. They built us a scalable WordPress platform that handles millions of visitors flawlessly. Truly world-class work!', 5, 'DK', 'linear-gradient(135deg, #10b981 0%, #3b82f6 100%)', 1, 6, 1);

-- Create theme_settings table
CREATE TABLE IF NOT EXISTS theme_settings (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  setting_key TEXT UNIQUE NOT NULL,
  setting_value TEXT NOT NULL,
  setting_type TEXT DEFAULT 'text',
  category TEXT DEFAULT 'general',
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Insert default theme settings
INSERT OR REPLACE INTO theme_settings (setting_key, setting_value, setting_type, category) VALUES
-- Color Scheme
('color_scheme', 'default', 'select', 'colors'),
('color_primary', '#6366f1', 'color', 'colors'),
('color_secondary', '#ec4899', 'color', 'colors'),
('color_accent', '#f59e0b', 'color', 'colors'),
('color_wordpress', '#0073aa', 'color', 'colors'),

-- Typography
('font_heading', 'Inter', 'font', 'typography'),
('font_body', 'Inter', 'font', 'typography'),
('font_size_base', '16', 'number', 'typography'),

-- Custom CSS (for advanced users)
('custom_css', '', 'textarea', 'advanced');

-- Create color scheme presets table
CREATE TABLE IF NOT EXISTS color_presets (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT UNIQUE NOT NULL,
  description TEXT,
  primary_color TEXT NOT NULL,
  secondary_color TEXT NOT NULL,
  accent_color TEXT NOT NULL,
  wordpress_color TEXT DEFAULT '#0073aa',
  is_active BOOLEAN DEFAULT 1,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Insert predefined color schemes
INSERT INTO color_presets (name, description, primary_color, secondary_color, accent_color, wordpress_color) VALUES
('Default (Indigo & Pink)', 'Modern vibrant gradient with WordPress blue', '#6366f1', '#ec4899', '#f59e0b', '#0073aa'),
('WordPress Classic', 'Classic WordPress blue with warm accents', '#0073aa', '#00a0d2', '#f59e0b', '#0073aa'),
('Purple Haze', 'Rich purple with pink accents', '#8b5cf6', '#ec4899', '#f59e0b', '#6d28d9'),
('Ocean Blue', 'Deep blue with cyan highlights', '#1e40af', '#06b6d4', '#3b82f6', '#0284c7'),
('Forest Green', 'Natural green with earth tones', '#059669', '#10b981', '#f59e0b', '#047857'),
('Sunset Orange', 'Warm orange and red gradient', '#f59e0b', '#ef4444', '#f97316', '#ea580c'),
('Royal Purple', 'Elegant purple and gold', '#7c3aed', '#a855f7', '#fbbf24', '#6d28d9'),
('Midnight Dark', 'Dark blue with neon accents', '#1e293b', '#3b82f6', '#06b6d4', '#0284c7'),
('Rose Gold', 'Sophisticated pink and gold', '#ec4899', '#f472b6', '#fbbf24', '#db2777'),
('Tech Green', 'Modern green with blue', '#10b981', '#06b6d4', '#8b5cf6', '#059669');

-- Create font presets table
CREATE TABLE IF NOT EXISTS font_presets (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT UNIQUE NOT NULL,
  category TEXT NOT NULL,
  google_font_name TEXT NOT NULL,
  google_font_weights TEXT DEFAULT '400,500,600,700',
  fallback_fonts TEXT DEFAULT 'system-ui, sans-serif',
  is_active BOOLEAN DEFAULT 1
);

-- Insert popular Google Fonts
INSERT INTO font_presets (name, category, google_font_name, google_font_weights, fallback_fonts) VALUES
-- Sans-Serif
('Inter', 'sans-serif', 'Inter', '300,400,500,600,700,800', 'system-ui, -apple-system, sans-serif'),
('Poppins', 'sans-serif', 'Poppins', '300,400,500,600,700,800', 'system-ui, sans-serif'),
('Roboto', 'sans-serif', 'Roboto', '300,400,500,700,900', 'system-ui, sans-serif'),
('Open Sans', 'sans-serif', 'Open Sans', '300,400,600,700,800', 'system-ui, sans-serif'),
('Montserrat', 'sans-serif', 'Montserrat', '300,400,500,600,700,800', 'system-ui, sans-serif'),
('Raleway', 'sans-serif', 'Raleway', '300,400,500,600,700,800', 'system-ui, sans-serif'),
('Nunito', 'sans-serif', 'Nunito', '300,400,600,700,800', 'system-ui, sans-serif'),
('Work Sans', 'sans-serif', 'Work Sans', '300,400,500,600,700,800', 'system-ui, sans-serif'),
('DM Sans', 'sans-serif', 'DM Sans', '400,500,700', 'system-ui, sans-serif'),
('Plus Jakarta Sans', 'sans-serif', 'Plus Jakarta Sans', '300,400,500,600,700,800', 'system-ui, sans-serif'),

-- Serif
('Playfair Display', 'serif', 'Playfair Display', '400,500,600,700,800,900', 'Georgia, serif'),
('Merriweather', 'serif', 'Merriweather', '300,400,700,900', 'Georgia, serif'),
('Lora', 'serif', 'Lora', '400,500,600,700', 'Georgia, serif'),
('PT Serif', 'serif', 'PT Serif', '400,700', 'Georgia, serif'),
('Crimson Text', 'serif', 'Crimson Text', '400,600,700', 'Georgia, serif'),

-- Display/Decorative
('Space Grotesk', 'display', 'Space Grotesk', '300,400,500,600,700', 'system-ui, sans-serif'),
('Archivo', 'display', 'Archivo', '300,400,500,600,700,800', 'system-ui, sans-serif'),
('Outfit', 'display', 'Outfit', '300,400,500,600,700,800', 'system-ui, sans-serif'),
('Sora', 'display', 'Sora', '300,400,500,600,700,800', 'system-ui, sans-serif'),
('Urbanist', 'display', 'Urbanist', '300,400,500,600,700,800', 'system-ui, sans-serif');

-- Create index for faster queries
CREATE INDEX IF NOT EXISTS idx_theme_settings_key ON theme_settings(setting_key);
CREATE INDEX IF NOT EXISTS idx_color_presets_active ON color_presets(is_active);
CREATE INDEX IF NOT EXISTS idx_font_presets_active ON font_presets(is_active);
