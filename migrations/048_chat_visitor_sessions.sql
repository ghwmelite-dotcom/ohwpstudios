-- Bind public chat access to an HttpOnly visitor credential, not enumerable IDs.
CREATE TABLE IF NOT EXISTS chat_visitor_sessions (
  conversation_id INTEGER PRIMARY KEY REFERENCES chat_conversations(id) ON DELETE CASCADE,
  token TEXT NOT NULL,
  expires_at TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_chat_visitor_expiry ON chat_visitor_sessions(expires_at);
