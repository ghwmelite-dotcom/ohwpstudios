-- Update site logo with WP Studios logo
-- This migration updates the site_logo to the new WP Studios logo

-- Update the site logo
UPDATE site_content
SET content_value = 'https://i.postimg.cc/Njz2hPXQ/wp-studios-logo.png',
    updated_at = datetime('now')
WHERE content_key = 'site_logo';

-- If the site_logo doesn't exist, insert it
INSERT OR IGNORE INTO site_content (content_key, content_value, content_type, updated_at)
VALUES ('site_logo', 'https://i.postimg.cc/Njz2hPXQ/wp-studios-logo.png', 'text', datetime('now'));
