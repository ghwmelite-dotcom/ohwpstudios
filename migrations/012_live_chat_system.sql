-- Migration: Live Chat System
-- Description: Real-time chat support with operator management
-- Date: 2025-01-07

-- Create chat operators table (support team members)
CREATE TABLE IF NOT EXISTS chat_operators (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  email TEXT UNIQUE NOT NULL,
  avatar_url TEXT,
  role TEXT DEFAULT 'operator',
  status TEXT DEFAULT 'offline', -- online, away, busy, offline
  is_active BOOLEAN DEFAULT 1,
  max_concurrent_chats INTEGER DEFAULT 5,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create conversations table (chat sessions)
CREATE TABLE IF NOT EXISTS chat_conversations (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  visitor_name TEXT,
  visitor_email TEXT,
  visitor_phone TEXT,
  visitor_ip TEXT,
  visitor_user_agent TEXT,

  -- Conversation metadata
  subject TEXT,
  status TEXT DEFAULT 'active', -- active, pending, resolved, closed
  priority TEXT DEFAULT 'normal', -- low, normal, high, urgent

  -- Assignment
  assigned_to INTEGER, -- operator ID

  -- Tracking
  started_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  last_message_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  closed_at TIMESTAMP,

  -- Analytics
  first_response_time INTEGER, -- seconds until first operator response
  total_messages INTEGER DEFAULT 0,
  visitor_messages INTEGER DEFAULT 0,
  operator_messages INTEGER DEFAULT 0,

  -- Tags and categorization
  tags TEXT, -- JSON array of tags
  source TEXT DEFAULT 'website', -- website, mobile, email

  -- Customer satisfaction
  rating INTEGER, -- 1-5 stars
  feedback TEXT,

  FOREIGN KEY (assigned_to) REFERENCES chat_operators(id) ON DELETE SET NULL
);

-- Create messages table
CREATE TABLE IF NOT EXISTS chat_messages (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  conversation_id INTEGER NOT NULL,

  -- Message content
  message_text TEXT NOT NULL,
  message_type TEXT DEFAULT 'text', -- text, file, image, system
  attachment_url TEXT,

  -- Sender info
  sender_type TEXT NOT NULL, -- visitor, operator, system
  sender_id INTEGER, -- operator ID if sender is operator
  sender_name TEXT,

  -- Status
  is_read BOOLEAN DEFAULT 0,
  read_at TIMESTAMP,

  -- Timestamps
  sent_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

  FOREIGN KEY (conversation_id) REFERENCES chat_conversations(id) ON DELETE CASCADE,
  FOREIGN KEY (sender_id) REFERENCES chat_operators(id) ON DELETE SET NULL
);

-- Create chat settings table
CREATE TABLE IF NOT EXISTS chat_settings (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  setting_key TEXT UNIQUE NOT NULL,
  setting_value TEXT NOT NULL,
  setting_type TEXT DEFAULT 'text',
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Insert default chat settings
INSERT OR IGNORE INTO chat_settings (setting_key, setting_value, setting_type) VALUES
('chat_enabled', 'true', 'boolean'),
('chat_widget_position', 'bottom-right', 'select'), -- bottom-right, bottom-left
('chat_primary_color', '#6366f1', 'color'),
('chat_greeting_message', 'Hi! 👋 How can we help you today?', 'text'),
('chat_offline_message', 'We''re currently offline. Leave us a message and we''ll get back to you!', 'text'),
('chat_auto_reply', 'Thanks for your message! An agent will be with you shortly.', 'text'),
('chat_auto_reply_enabled', 'true', 'boolean'),
('chat_show_operator_avatars', 'true', 'boolean'),
('chat_allow_file_uploads', 'true', 'boolean'),
('chat_max_file_size_mb', '10', 'number'),
('chat_business_hours_enabled', 'false', 'boolean'),
('chat_business_hours', '{"monday":"9:00-17:00","tuesday":"9:00-17:00","wednesday":"9:00-17:00","thursday":"9:00-17:00","friday":"9:00-17:00"}', 'json'),
('chat_require_email', 'true', 'boolean'),
('chat_require_name', 'true', 'boolean');

-- Create canned responses table (quick replies for operators)
CREATE TABLE IF NOT EXISTS chat_canned_responses (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  title TEXT NOT NULL,
  shortcut TEXT UNIQUE, -- e.g., /greeting, /pricing
  message TEXT NOT NULL,
  category TEXT,
  is_active BOOLEAN DEFAULT 1,
  usage_count INTEGER DEFAULT 0,
  created_by INTEGER,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

  FOREIGN KEY (created_by) REFERENCES chat_operators(id) ON DELETE SET NULL
);

-- Insert default canned responses
INSERT OR IGNORE INTO chat_canned_responses (title, shortcut, message, category) VALUES
('Welcome Message', '/welcome', 'Welcome to OH WP Studios! I''m here to help you with any questions about our services.', 'greetings'),
('Thank You', '/thanks', 'Thank you for contacting us! We appreciate your interest in our services.', 'greetings'),
('Pricing Inquiry', '/pricing', 'I''d be happy to discuss our pricing! Our projects typically range from $5,000 to $50,000+ depending on complexity. Could you tell me more about what you''re looking for?', 'sales'),
('Schedule Call', '/schedule', 'I''d love to schedule a call to discuss your project in detail. You can book a time that works for you here: https://ohwpstudios.com/booking', 'sales'),
('Portfolio', '/portfolio', 'You can view our portfolio of recent projects here: https://ohwpstudios.com/#portfolio. Is there a specific type of project you''re interested in?', 'sales'),
('Timeline', '/timeline', 'Project timelines vary based on scope, but most projects take 4-12 weeks from start to launch. We''ll provide a detailed timeline after our initial consultation.', 'sales'),
('Contact Info', '/contact', 'You can reach us at:\n📧 Email: hello@ohwpstudios.com\n📞 Phone: +1 (555) 123-4567\n🕐 Hours: Monday-Friday, 9 AM - 6 PM EST', 'support'),
('Technical Support', '/tech', 'For technical support with an existing project, please email support@ohwpstudios.com with your project details and we''ll assist you promptly.', 'support');

-- Insert default operators
INSERT OR IGNORE INTO chat_operators (name, email, role, status) VALUES
('Sarah Johnson', 'sarah@ohwpstudios.com', 'admin', 'online'),
('Mike Chen', 'mike@ohwpstudios.com', 'operator', 'offline'),
('Emma Davis', 'emma@ohwpstudios.com', 'operator', 'offline');

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_conversations_status ON chat_conversations(status);
CREATE INDEX IF NOT EXISTS idx_conversations_assigned ON chat_conversations(assigned_to);
CREATE INDEX IF NOT EXISTS idx_conversations_last_message ON chat_conversations(last_message_at DESC);
CREATE INDEX IF NOT EXISTS idx_messages_conversation ON chat_messages(conversation_id);
CREATE INDEX IF NOT EXISTS idx_messages_sent_at ON chat_messages(sent_at DESC);
CREATE INDEX IF NOT EXISTS idx_operators_status ON chat_operators(status);
CREATE INDEX IF NOT EXISTS idx_canned_responses_shortcut ON chat_canned_responses(shortcut);
