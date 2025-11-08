-- Virtual PM Chat System Migration

-- PM Chat Conversations Table
CREATE TABLE IF NOT EXISTS pm_chat_conversations (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  project_id INTEGER NOT NULL,
  client_id INTEGER NOT NULL,
  status TEXT DEFAULT 'active',
  last_message_at TEXT DEFAULT (datetime('now')),
  created_at TEXT DEFAULT (datetime('now')),
  updated_at TEXT DEFAULT (datetime('now')),
  FOREIGN KEY (project_id) REFERENCES client_projects(id) ON DELETE CASCADE,
  FOREIGN KEY (client_id) REFERENCES client_users(id) ON DELETE CASCADE
);

-- PM Chat Messages Table
CREATE TABLE IF NOT EXISTS pm_chat_messages (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  conversation_id INTEGER NOT NULL,
  role TEXT NOT NULL,
  content TEXT NOT NULL,
  metadata TEXT,
  created_at TEXT DEFAULT (datetime('now')),
  FOREIGN KEY (conversation_id) REFERENCES pm_chat_conversations(id) ON DELETE CASCADE
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_pm_conversations_project_id ON pm_chat_conversations(project_id);
CREATE INDEX IF NOT EXISTS idx_pm_conversations_client_id ON pm_chat_conversations(client_id);
CREATE INDEX IF NOT EXISTS idx_pm_conversations_status ON pm_chat_conversations(status);
CREATE INDEX IF NOT EXISTS idx_pm_messages_conversation_id ON pm_chat_messages(conversation_id);
CREATE INDEX IF NOT EXISTS idx_pm_messages_created_at ON pm_chat_messages(created_at);
