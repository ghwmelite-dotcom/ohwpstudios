-- Migration 041: Rename the legacy "WordPress" theme color slot to a neutral "Highlight" slot
-- Description: Part of removing WordPress branding from the site. The fourth brand color
--              was named after WordPress; this renames it to "Highlight" across the theme
--              system while preserving any value the admin has already saved.
-- Date: 2026-06-07

-- 1) Theme settings (key-value store): migrate the saved color under the new key, drop the old one
INSERT OR REPLACE INTO theme_settings (setting_key, setting_value, setting_type, category)
  SELECT 'color_highlight', setting_value, 'color', 'colors'
  FROM theme_settings WHERE setting_key = 'color_wordpress';

DELETE FROM theme_settings WHERE setting_key = 'color_wordpress';

-- 2) Color presets: rename the column from wordpress_color -> highlight_color
ALTER TABLE color_presets RENAME COLUMN wordpress_color TO highlight_color;

-- 3) Color presets: de-WordPress the preset names/descriptions shown in the admin theme picker
UPDATE color_presets
  SET description = 'Modern vibrant gradient with a blue highlight'
  WHERE name = 'Default (Indigo & Pink)';

UPDATE color_presets
  SET name = 'Classic Blue', description = 'Classic blue with warm accents'
  WHERE name = 'WordPress Classic';
