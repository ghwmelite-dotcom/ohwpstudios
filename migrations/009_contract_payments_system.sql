-- Migration: Add milestone-based payment system for contracts

-- Contract Milestones Table
CREATE TABLE IF NOT EXISTS contract_milestones (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  contract_id INTEGER NOT NULL,
  title TEXT NOT NULL,
  description TEXT,
  amount REAL NOT NULL,
  percentage REAL,
  due_date TEXT,
  status TEXT DEFAULT 'pending', -- pending, paid, overdue
  payment_reference TEXT,
  paystack_reference TEXT,
  paid_at TEXT,
  created_at TEXT DEFAULT (datetime('now')),
  updated_at TEXT DEFAULT (datetime('now')),
  FOREIGN KEY (contract_id) REFERENCES contracts(id) ON DELETE CASCADE
);

-- Contract Payments Table
CREATE TABLE IF NOT EXISTS contract_payments (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  contract_id INTEGER NOT NULL,
  milestone_id INTEGER,
  amount REAL NOT NULL,
  currency TEXT DEFAULT 'GHS',
  paystack_reference TEXT UNIQUE,
  payment_method TEXT,
  status TEXT DEFAULT 'pending', -- pending, success, failed, refunded
  customer_email TEXT,
  customer_name TEXT,
  paid_at TEXT,
  paystack_data TEXT, -- JSON with full Paystack response
  created_at TEXT DEFAULT (datetime('now')),
  updated_at TEXT DEFAULT (datetime('now')),
  FOREIGN KEY (contract_id) REFERENCES contracts(id) ON DELETE CASCADE,
  FOREIGN KEY (milestone_id) REFERENCES contract_milestones(id) ON DELETE SET NULL
);

-- Payment History Table (audit trail)
CREATE TABLE IF NOT EXISTS payment_history (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  payment_id INTEGER NOT NULL,
  event_type TEXT NOT NULL, -- initialized, success, failed, refunded, webhook_received
  event_data TEXT, -- JSON with event details
  created_at TEXT DEFAULT (datetime('now')),
  FOREIGN KEY (payment_id) REFERENCES contract_payments(id) ON DELETE CASCADE
);

-- Indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_milestones_contract ON contract_milestones(contract_id);
CREATE INDEX IF NOT EXISTS idx_milestones_status ON contract_milestones(status);
CREATE INDEX IF NOT EXISTS idx_payments_contract ON contract_payments(contract_id);
CREATE INDEX IF NOT EXISTS idx_payments_milestone ON contract_payments(milestone_id);
CREATE INDEX IF NOT EXISTS idx_payments_status ON contract_payments(status);
CREATE INDEX IF NOT EXISTS idx_payments_reference ON contract_payments(paystack_reference);

-- Milestones will be created when contracts are created
-- No sample data needed
