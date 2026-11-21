CREATE TABLE IF NOT EXISTS admin_users(id INTEGER PRIMARY KEY,username TEXT,password_hash TEXT,email TEXT,last_login TEXT);
CREATE TABLE IF NOT EXISTS sessions(token TEXT PRIMARY KEY,user_id INTEGER,csrf_token TEXT,created_at TEXT,expires_at TEXT);
INSERT OR REPLACE INTO admin_users(id,username,password_hash,email) VALUES(9001,'Preview reviewer','unused-local-preview','preview@example.com');
INSERT OR REPLACE INTO sessions(token,user_id,csrf_token,created_at,expires_at) VALUES('local-admin-design-review-only',9001,'local-preview-csrf',datetime('now'),datetime('now','+1 day'));
