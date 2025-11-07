-- Update default admin password to use SHA-256 hash
-- This migration hashes the default password 'admin123' properly
-- Hash: 240be518fabd2724ddb6f04eeb1da5967448d7e831c08c8fa822809f74c720a9

UPDATE admin_users
SET password_hash = '240be518fabd2724ddb6f04eeb1da5967448d7e831c08c8fa822809f74c720a9'
WHERE id = 1 AND password_hash = 'admin123_changeme';
