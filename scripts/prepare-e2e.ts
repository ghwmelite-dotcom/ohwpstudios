/** Builds a disposable local Pages sandbox. No production bindings or mail keys. */
import { Database } from 'bun:sqlite';
import { readFileSync, readdirSync, mkdirSync, writeFileSync, cpSync } from 'node:fs';
import { join } from 'node:path';
import { randomUUID } from 'node:crypto';
import { hashPassword } from '../src/lib/admin-auth';

const root = process.cwd();
const target = process.argv[2] || join(process.env.TEMP || 'C:/Windows/Temp', `hodges-site-e2e-${Date.now()}`);
mkdirSync(target, { recursive: true });
const sqlite = new Database(':memory:');
const applied: string[] = [];
const skipped: string[] = [];
// DDL only: never run historical seed content or production data updates.
for (const name of ['schema.sql', ...readdirSync('migrations').sort().map(n => `migrations/${n}`)]) {
  const sql = readFileSync(join(root, name), 'utf8').replace(/--[^\n]*/g, '');
  // Our schema-only rebuild must copy existing records before replacing the table.
  if (name.endsWith('050_project_scope_review.sql')) {
    sqlite.exec(sql); applied.push(sql); continue;
  }
  for (const statement of sql.split(';')) {
    if (!/^\s*(CREATE TABLE|CREATE (?:UNIQUE )?INDEX|ALTER TABLE)/i.test(statement)) continue;
    try { sqlite.exec(statement); applied.push(statement + ';'); }
    catch (error) { skipped.push(`${name}: ${String(error)}`); }
  }
}
const credentials = { adminPassword: randomUUID() + randomUUID(), clientPassword: randomUUID() + randomUUID() };
writeFileSync(join(target, 'credentials.json'), JSON.stringify(credentials), { mode: 0o600 });
const adminHash = await hashPassword(credentials.adminPassword);
const clientHash = new Bun.CryptoHasher('sha256').update(credentials.clientPassword).digest('hex');
const seed = `
INSERT OR IGNORE INTO editorial_settings(id,enabled) VALUES(1,1);
INSERT INTO admin_users(username,password_hash,email,created_at) VALUES ('e2e-admin','${adminHash}','admin@example.test',datetime('now'));
INSERT INTO client_users(email,password_hash,company_name,contact_name) VALUES
('client@example.test','${clientHash}','E2E Client','Test Client'),
('other@example.test','${clientHash}','Other Tenant','Other Client');
INSERT INTO client_projects(client_id,project_name,project_type,description,progress_percentage,status)
VALUES (1,'E2E private project','web','Isolated test project',40,'in_progress'),(2,'Other tenant private project','web','Must remain private',20,'in_progress');
INSERT INTO project_milestones(project_id,title,status,display_order) VALUES(1,'Design approval','completed',1),(1,'Build','in_progress',2);
INSERT INTO project_updates(project_id,title,description) VALUES(1,'Progress report','The test build is progressing.');
INSERT INTO project_files(project_id,file_name,file_url) VALUES(1,'Test brief','https://example.test/brief.pdf');
`;
sqlite.exec(seed);
writeFileSync(join(target, 'seed.sql'), applied.join('\n') + seed);
writeFileSync(join(target, 'schema-notes.json'), JSON.stringify(skipped, null, 2));
writeFileSync(join(target, 'wrangler.toml'), `name="hodges-isolated-e2e"\ncompatibility_date="2024-01-01"\ncompatibility_flags=["nodejs_compat"]\npages_build_output_dir="dist"\n[[d1_databases]]\nbinding="DB"\ndatabase_name="e2e-db"\ndatabase_id="00000000-0000-0000-0000-000000000001"\n[vars]\nSITE_URL="http://localhost:8830"\n`);
cpSync(join(root, 'dist'), join(target, 'dist'), { recursive: true });
console.log(JSON.stringify({ target, ddlStatements: applied.length, skipped: skipped.length }));
