-- Add CSRF token support to sessions tables
-- This allows per-session CSRF tokens for enhanced security

-- Add csrf_token column to admin sessions table
ALTER TABLE sessions ADD COLUMN csrf_token TEXT;

-- Create index for faster CSRF validation lookups
CREATE INDEX IF NOT EXISTS idx_sessions_csrf_token ON sessions(csrf_token);

-- Add csrf_token to client_users table (they store session data there)
ALTER TABLE client_users ADD COLUMN csrf_token TEXT;

-- Create index for client CSRF validation
CREATE INDEX IF NOT EXISTS idx_client_users_csrf_token ON client_users(csrf_token);
