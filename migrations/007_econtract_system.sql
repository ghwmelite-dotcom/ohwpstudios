-- Migration: E-Contract System
-- Created: 2025-01-10
-- Description: Create tables for contract templates, contracts, and e-signatures

-- Contract Templates Table
CREATE TABLE IF NOT EXISTS contract_templates (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  description TEXT,
  template_content TEXT NOT NULL, -- HTML content with placeholders
  category TEXT, -- 'web_development', 'consulting', 'maintenance', 'design', 'other'
  placeholders TEXT, -- JSON array of placeholder names: ["client_name", "project_name", etc.]
  default_terms TEXT, -- Default payment terms, delivery timeline, etc.
  active BOOLEAN DEFAULT 1,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Contracts Table
CREATE TABLE IF NOT EXISTS contracts (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  contract_number TEXT UNIQUE NOT NULL, -- e.g., "CON-2025-001"
  template_id INTEGER,

  -- Client Information
  client_name TEXT NOT NULL,
  client_email TEXT NOT NULL,
  client_company TEXT,
  client_phone TEXT,
  client_address TEXT,

  -- Contract Details
  title TEXT NOT NULL,
  description TEXT,
  content TEXT NOT NULL, -- Final HTML content with placeholders filled

  -- Financial
  total_amount DECIMAL(10, 2),
  currency TEXT DEFAULT 'USD',
  payment_terms TEXT,

  -- Timeline
  start_date DATE,
  end_date DATE,
  delivery_date DATE,

  -- Status
  status TEXT DEFAULT 'draft', -- 'draft', 'sent', 'viewed', 'signed', 'completed', 'cancelled'
  sent_at DATETIME,
  viewed_at DATETIME,
  signed_at DATETIME,
  completed_at DATETIME,

  -- Signature
  signature_data TEXT, -- Base64 encoded signature image
  signed_ip TEXT,
  signed_user_agent TEXT,

  -- Metadata
  notes TEXT,
  created_by TEXT, -- Admin who created it
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,

  FOREIGN KEY (template_id) REFERENCES contract_templates(id)
);

-- Contract Signatures Table (for audit trail)
CREATE TABLE IF NOT EXISTS contract_signatures (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  contract_id INTEGER NOT NULL,
  signer_name TEXT NOT NULL,
  signer_email TEXT NOT NULL,
  signer_role TEXT, -- 'client', 'admin', 'witness'
  signature_data TEXT NOT NULL, -- Base64 encoded signature
  signed_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  ip_address TEXT,
  user_agent TEXT,
  notes TEXT,

  FOREIGN KEY (contract_id) REFERENCES contracts(id) ON DELETE CASCADE
);

-- Contract History Table (for version control and audit)
CREATE TABLE IF NOT EXISTS contract_history (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  contract_id INTEGER NOT NULL,
  action TEXT NOT NULL, -- 'created', 'edited', 'sent', 'viewed', 'signed', 'completed', 'cancelled'
  performed_by TEXT,
  changes TEXT, -- JSON of what changed
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,

  FOREIGN KEY (contract_id) REFERENCES contracts(id) ON DELETE CASCADE
);

-- Insert default contract templates
INSERT INTO contract_templates (
  name,
  description,
  category,
  template_content,
  placeholders,
  default_terms
) VALUES (
  'Website Development Agreement',
  'Standard agreement for website development projects',
  'web_development',
  '<div class="contract-document">
  <div class="contract-header">
    <h1>Website Development Agreement</h1>
    <p class="contract-number">Contract #: {{contract_number}}</p>
    <p class="contract-date">Date: {{contract_date}}</p>
  </div>

  <section class="contract-section">
    <h2>Parties</h2>
    <p>This Website Development Agreement ("Agreement") is entered into as of {{contract_date}} between:</p>
    <p><strong>OHWP Studios</strong> ("Developer")<br>
    Address: [Your Business Address]</p>
    <p><strong>{{client_name}}</strong> ("Client")<br>
    Company: {{client_company}}<br>
    Email: {{client_email}}<br>
    Phone: {{client_phone}}<br>
    Address: {{client_address}}</p>
  </section>

  <section class="contract-section">
    <h2>Project Description</h2>
    <p><strong>Project Title:</strong> {{project_title}}</p>
    <p>{{project_description}}</p>
  </section>

  <section class="contract-section">
    <h2>Scope of Work</h2>
    <p>Developer agrees to provide the following services:</p>
    {{scope_of_work}}
  </section>

  <section class="contract-section">
    <h2>Timeline</h2>
    <p><strong>Project Start Date:</strong> {{start_date}}</p>
    <p><strong>Estimated Delivery Date:</strong> {{delivery_date}}</p>
    <p><strong>Project End Date:</strong> {{end_date}}</p>
  </section>

  <section class="contract-section">
    <h2>Payment Terms</h2>
    <p><strong>Total Project Cost:</strong> {{total_amount}} {{currency}}</p>
    <p>{{payment_terms}}</p>
  </section>

  <section class="contract-section">
    <h2>Terms and Conditions</h2>
    <ol>
      <li><strong>Intellectual Property:</strong> Upon full payment, all rights to the developed website will be transferred to the Client.</li>
      <li><strong>Revisions:</strong> The project includes up to {{revision_rounds}} rounds of revisions.</li>
      <li><strong>Client Responsibilities:</strong> Client agrees to provide necessary content, assets, and feedback within agreed timelines.</li>
      <li><strong>Confidentiality:</strong> Both parties agree to keep confidential any proprietary information shared during this project.</li>
      <li><strong>Termination:</strong> Either party may terminate this agreement with 14 days written notice.</li>
      <li><strong>Support:</strong> Developer will provide {{support_duration}} days of post-launch support.</li>
    </ol>
  </section>

  <section class="contract-section">
    <h2>Acceptance</h2>
    <p>By signing below, both parties agree to the terms and conditions outlined in this agreement.</p>
  </section>
</div>',
  '["contract_number","contract_date","client_name","client_company","client_email","client_phone","client_address","project_title","project_description","scope_of_work","start_date","delivery_date","end_date","total_amount","currency","payment_terms","revision_rounds","support_duration"]',
  'Payment Structure: 50% upfront, 50% upon completion. Support: 30 days post-launch. Revisions: 3 rounds included.'
), (
  'Consulting Services Agreement',
  'Agreement for consulting and advisory services',
  'consulting',
  '<div class="contract-document">
  <div class="contract-header">
    <h1>Consulting Services Agreement</h1>
    <p class="contract-number">Contract #: {{contract_number}}</p>
    <p class="contract-date">Date: {{contract_date}}</p>
  </div>

  <section class="contract-section">
    <h2>Parties</h2>
    <p>This Consulting Services Agreement is entered into between:</p>
    <p><strong>OHWP Studios</strong> ("Consultant")</p>
    <p><strong>{{client_name}}</strong> ("Client")<br>
    Company: {{client_company}}<br>
    Email: {{client_email}}</p>
  </section>

  <section class="contract-section">
    <h2>Services</h2>
    <p>Consultant agrees to provide the following services:</p>
    {{services_description}}
  </section>

  <section class="contract-section">
    <h2>Duration</h2>
    <p><strong>Start Date:</strong> {{start_date}}</p>
    <p><strong>End Date:</strong> {{end_date}}</p>
    <p><strong>Hours:</strong> {{total_hours}} hours</p>
  </section>

  <section class="contract-section">
    <h2>Compensation</h2>
    <p><strong>Total Fee:</strong> {{total_amount}} {{currency}}</p>
    <p><strong>Rate:</strong> {{hourly_rate}}/hour</p>
    <p>{{payment_terms}}</p>
  </section>

  <section class="contract-section">
    <h2>Terms</h2>
    <ol>
      <li>All deliverables will be provided in digital format.</li>
      <li>Client will receive monthly progress reports.</li>
      <li>Either party may terminate with 30 days notice.</li>
    </ol>
  </section>
</div>',
  '["contract_number","contract_date","client_name","client_company","client_email","services_description","start_date","end_date","total_hours","total_amount","currency","hourly_rate","payment_terms"]',
  'Hourly rate: $150/hour. Invoiced monthly. Payment due within 15 days.'
), (
  'Maintenance & Support Agreement',
  'Ongoing maintenance and support services',
  'maintenance',
  '<div class="contract-document">
  <div class="contract-header">
    <h1>Website Maintenance & Support Agreement</h1>
    <p class="contract-number">Contract #: {{contract_number}}</p>
    <p class="contract-date">Date: {{contract_date}}</p>
  </div>

  <section class="contract-section">
    <h2>Parties</h2>
    <p><strong>OHWP Studios</strong> ("Service Provider")</p>
    <p><strong>{{client_name}}</strong> ("Client")<br>
    {{client_company}}</p>
  </section>

  <section class="contract-section">
    <h2>Services Included</h2>
    <ul>
      <li>Security updates and patches</li>
      <li>Performance monitoring</li>
      <li>Content updates (up to {{hours_per_month}} hours/month)</li>
      <li>Technical support via email</li>
      <li>Monthly backup and restore</li>
      <li>{{response_time}} response time for critical issues</li>
    </ul>
  </section>

  <section class="contract-section">
    <h2>Subscription</h2>
    <p><strong>Monthly Fee:</strong> {{monthly_fee}} {{currency}}</p>
    <p><strong>Billing Cycle:</strong> {{billing_cycle}}</p>
    <p><strong>Start Date:</strong> {{start_date}}</p>
  </section>

  <section class="contract-section">
    <h2>Terms</h2>
    <ol>
      <li>This is a month-to-month agreement.</li>
      <li>Either party may cancel with 30 days notice.</li>
      <li>Additional hours beyond the monthly limit will be billed at {{hourly_rate}}/hour.</li>
    </ol>
  </section>
</div>',
  '["contract_number","contract_date","client_name","client_company","hours_per_month","response_time","monthly_fee","currency","billing_cycle","start_date","hourly_rate"]',
  'Monthly subscription. 5 hours included. $150/hour for additional work.'
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_contracts_client_email ON contracts(client_email);
CREATE INDEX IF NOT EXISTS idx_contracts_status ON contracts(status);
CREATE INDEX IF NOT EXISTS idx_contracts_contract_number ON contracts(contract_number);
CREATE INDEX IF NOT EXISTS idx_contracts_created_at ON contracts(created_at);
CREATE INDEX IF NOT EXISTS idx_contract_templates_category ON contract_templates(category);
CREATE INDEX IF NOT EXISTS idx_contract_templates_active ON contract_templates(active);
CREATE INDEX IF NOT EXISTS idx_contract_signatures_contract_id ON contract_signatures(contract_id);
CREATE INDEX IF NOT EXISTS idx_contract_history_contract_id ON contract_history(contract_id);
