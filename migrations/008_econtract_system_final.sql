-- Migration: E-Contract System (Final - Rename old table)
-- Created: 2025-01-10
-- Description: Rename old contracts table and create new e-contract system

-- Rename old project-based contracts table
ALTER TABLE contracts RENAME TO project_contracts_old;

-- Contract Templates Table
CREATE TABLE IF NOT EXISTS contract_templates (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  description TEXT,
  template_content TEXT NOT NULL,
  category TEXT,
  placeholders TEXT,
  default_terms TEXT,
  active BOOLEAN DEFAULT 1,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- New Contracts Table (E-Contract System)
CREATE TABLE contracts (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  contract_number TEXT UNIQUE NOT NULL,
  template_id INTEGER,
  client_name TEXT NOT NULL,
  client_email TEXT NOT NULL,
  client_company TEXT,
  client_phone TEXT,
  client_address TEXT,
  title TEXT NOT NULL,
  description TEXT,
  content TEXT NOT NULL,
  total_amount DECIMAL(10, 2),
  currency TEXT DEFAULT 'USD',
  payment_terms TEXT,
  start_date DATE,
  end_date DATE,
  delivery_date DATE,
  status TEXT DEFAULT 'draft',
  sent_at DATETIME,
  viewed_at DATETIME,
  signed_at DATETIME,
  completed_at DATETIME,
  signature_data TEXT,
  signed_ip TEXT,
  signed_user_agent TEXT,
  notes TEXT,
  created_by TEXT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (template_id) REFERENCES contract_templates(id)
);

-- Contract Signatures Table
CREATE TABLE contract_signatures (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  contract_id INTEGER NOT NULL,
  signer_name TEXT NOT NULL,
  signer_email TEXT NOT NULL,
  signer_role TEXT,
  signature_data TEXT NOT NULL,
  signed_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  ip_address TEXT,
  user_agent TEXT,
  notes TEXT,
  FOREIGN KEY (contract_id) REFERENCES contracts(id) ON DELETE CASCADE
);

-- Contract History Table
CREATE TABLE contract_history (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  contract_id INTEGER NOT NULL,
  action TEXT NOT NULL,
  performed_by TEXT,
  changes TEXT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (contract_id) REFERENCES contracts(id) ON DELETE CASCADE
);

-- Insert default contract templates
INSERT INTO contract_templates (id, name, description, category, template_content, placeholders, default_terms) VALUES (
  1,
  'Website Development Agreement',
  'Standard agreement for website development projects',
  'web_development',
  '<div class="contract-document"><div class="contract-header"><h1>Website Development Agreement</h1><p class="contract-number">Contract #: {{contract_number}}</p><p class="contract-date">Date: {{contract_date}}</p></div><section class="contract-section"><h2>Parties</h2><p>This Website Development Agreement ("Agreement") is entered into as of {{contract_date}} between:</p><p><strong>OHWP Studios</strong> ("Developer")<br>Address: [Your Business Address]</p><p><strong>{{client_name}}</strong> ("Client")<br>Company: {{client_company}}<br>Email: {{client_email}}<br>Phone: {{client_phone}}<br>Address: {{client_address}}</p></section><section class="contract-section"><h2>Project Description</h2><p><strong>Project Title:</strong> {{project_title}}</p><p>{{project_description}}</p></section><section class="contract-section"><h2>Timeline</h2><p><strong>Project Start Date:</strong> {{start_date}}</p><p><strong>Estimated Delivery Date:</strong> {{delivery_date}}</p><p><strong>Project End Date:</strong> {{end_date}}</p></section><section class="contract-section"><h2>Payment Terms</h2><p><strong>Total Project Cost:</strong> {{total_amount}} {{currency}}</p><p>{{payment_terms}}</p></section><section class="contract-section"><h2>Terms and Conditions</h2><ol><li><strong>Intellectual Property:</strong> Upon full payment, all rights to the developed website will be transferred to the Client.</li><li><strong>Revisions:</strong> The project includes up to 3 rounds of revisions.</li><li><strong>Client Responsibilities:</strong> Client agrees to provide necessary content, assets, and feedback within agreed timelines.</li><li><strong>Confidentiality:</strong> Both parties agree to keep confidential any proprietary information shared during this project.</li><li><strong>Termination:</strong> Either party may terminate this agreement with 14 days written notice.</li><li><strong>Support:</strong> Developer will provide 30 days of post-launch support.</li></ol></section><section class="contract-section"><h2>Acceptance</h2><p>By signing below, both parties agree to the terms and conditions outlined in this agreement.</p></section></div>',
  '["contract_number","contract_date","client_name","client_company","client_email","client_phone","client_address","project_title","project_description","start_date","delivery_date","end_date","total_amount","currency","payment_terms"]',
  'Payment Structure: 50% upfront, 50% upon completion. Support: 30 days post-launch. Revisions: 3 rounds included.'
);

INSERT INTO contract_templates (id, name, description, category, template_content, placeholders, default_terms) VALUES (
  2,
  'Consulting Services Agreement',
  'Agreement for consulting and advisory services',
  'consulting',
  '<div class="contract-document"><div class="contract-header"><h1>Consulting Services Agreement</h1><p class="contract-number">Contract #: {{contract_number}}</p><p class="contract-date">Date: {{contract_date}}</p></div><section class="contract-section"><h2>Parties</h2><p>This Consulting Services Agreement is entered into between:</p><p><strong>OHWP Studios</strong> ("Consultant")</p><p><strong>{{client_name}}</strong> ("Client")<br>Company: {{client_company}}<br>Email: {{client_email}}</p></section><section class="contract-section"><h2>Services</h2><p>Consultant agrees to provide professional consulting services as described below:</p><p>{{project_description}}</p></section><section class="contract-section"><h2>Duration</h2><p><strong>Start Date:</strong> {{start_date}}</p><p><strong>End Date:</strong> {{end_date}}</p></section><section class="contract-section"><h2>Compensation</h2><p><strong>Total Fee:</strong> {{total_amount}} {{currency}}</p><p>{{payment_terms}}</p></section></div>',
  '["contract_number","contract_date","client_name","client_company","client_email","project_description","start_date","end_date","total_amount","currency","payment_terms"]',
  'Invoiced monthly. Payment due within 15 days.'
);

INSERT INTO contract_templates (id, name, description, category, template_content, placeholders, default_terms) VALUES (
  3,
  'Maintenance & Support Agreement',
  'Ongoing maintenance and support services',
  'maintenance',
  '<div class="contract-document"><div class="contract-header"><h1>Website Maintenance & Support Agreement</h1><p class="contract-number">Contract #: {{contract_number}}</p><p class="contract-date">Date: {{contract_date}}</p></div><section class="contract-section"><h2>Parties</h2><p><strong>OHWP Studios</strong> ("Service Provider")</p><p><strong>{{client_name}}</strong> ("Client")<br>{{client_company}}</p></section><section class="contract-section"><h2>Services Included</h2><ul><li>Security updates and patches</li><li>Performance monitoring</li><li>Content updates (up to 5 hours/month)</li><li>Technical support via email</li><li>Monthly backup and restore</li><li>24-hour response time for critical issues</li></ul></section><section class="contract-section"><h2>Subscription</h2><p><strong>Monthly Fee:</strong> {{total_amount}} {{currency}}</p><p><strong>Start Date:</strong> {{start_date}}</p><p>{{payment_terms}}</p></section></div>',
  '["contract_number","contract_date","client_name","client_company","total_amount","currency","start_date","payment_terms"]',
  'Monthly subscription. 5 hours included.'
);

-- Create indexes for better performance
CREATE INDEX idx_contracts_client_email ON contracts(client_email);
CREATE INDEX idx_contracts_status ON contracts(status);
CREATE INDEX idx_contracts_contract_number ON contracts(contract_number);
CREATE INDEX idx_contracts_created_at ON contracts(created_at);
CREATE INDEX idx_contract_templates_category ON contract_templates(category);
CREATE INDEX idx_contract_templates_active ON contract_templates(active);
CREATE INDEX idx_contract_signatures_contract_id ON contract_signatures(contract_id);
CREATE INDEX idx_contract_history_contract_id ON contract_history(contract_id);
