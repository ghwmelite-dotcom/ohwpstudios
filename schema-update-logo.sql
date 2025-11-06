-- Update schema to add logo and favicon
-- Run: wrangler d1 execute agency-db --file=./schema-update-logo.sql --remote

INSERT OR IGNORE INTO site_content (content_key, content_value, content_type, updated_at)
VALUES
  ('site_logo', '', 'text', datetime('now')),
  ('site_favicon', '/favicon.svg', 'text', datetime('now'));
