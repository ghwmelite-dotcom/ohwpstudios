-- Secure, unguessable access to contracts (replaces enumerable numeric ids)
ALTER TABLE contracts ADD COLUMN share_token TEXT;
ALTER TABLE contracts ADD COLUMN token_expires_at TEXT;
CREATE UNIQUE INDEX IF NOT EXISTS idx_contracts_share_token ON contracts(share_token);

-- One-time email codes proving the signer controls the on-file client_email
CREATE TABLE IF NOT EXISTS contract_verifications (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  contract_id INTEGER NOT NULL,
  code_hash TEXT NOT NULL,
  expires_at TEXT NOT NULL,
  attempts INTEGER NOT NULL DEFAULT 0,
  consumed_at TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE INDEX IF NOT EXISTS idx_contract_verifications_contract ON contract_verifications(contract_id);
