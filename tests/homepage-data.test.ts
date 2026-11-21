import { afterEach, describe, expect, test } from 'bun:test';
import { Database } from 'bun:sqlite';
import { readFileSync } from 'node:fs';
import { getPublicProjects, getPublicProject, getPublicCategories, publicUrl } from '../src/lib/public-portfolio';
import { POST } from '../src/pages/api/contact/submit';

const databases: Database[] = [];
/** SQLite-backed D1 test adapter: exercises the actual SQL with no remote bindings. */
function fixture() {
  const sqlite = new Database(':memory:'); databases.push(sqlite);
  sqlite.exec(readFileSync(new URL('../migrations/011_portfolio_system.sql', import.meta.url), 'utf8'));
  const prepare = (sql: string, values: (string | number | null)[] = []) => ({
    bind: (...params: (string | number | null)[]) => prepare(sql, params),
    all: async () => ({ results: sqlite.prepare(sql).all(...values), success: true }),
    first: async () => sqlite.prepare(sql).get(...values),
    run: async () => {
      const result = sqlite.prepare(sql).run(...values);
      return { success: true, meta: { last_row_id: Number(result.lastInsertRowid) } };
    },
  });
  // Test adapter deliberately implements only the D1 operations exercised here.
  const db = { prepare } as unknown as D1Database;
  return { sqlite, db };
}
afterEach(() => { for (const db of databases.splice(0)) db.close(); });

describe('anonymous public portfolio', () => {
  test('lists published work, excluding drafts and known demo records', async () => {
    const { sqlite, db } = fixture();
    const insert = sqlite.prepare('INSERT INTO portfolio_projects (title,slug,is_published,category_id) VALUES (?,?,?,1)');
    insert.run('Real published project', 'real-project', 1);
    insert.run('Confidential draft', 'draft-project', 0);
    insert.run('FinPay demo', 'finpay-digital-banking', 1);
    const projects = await getPublicProjects(db);
    expect(projects.map(project => project.slug)).toEqual(['real-project']);
    expect(projects[0]).not.toHaveProperty('client_name');
    expect(projects[0]).not.toHaveProperty('metric_1_value');
    expect((await getPublicCategories(db)).map(category => category.id)).toEqual([1]);
  });
  test('detail lookup cannot expose drafts, seeded demos, or SQL-injection matches', async () => {
    const { sqlite, db } = fixture();
    sqlite.exec("INSERT INTO portfolio_projects (title,slug,is_published) VALUES ('Draft','draft',0),('Demo','finpay-digital-banking',1),('Public','public',1)");
    expect((await getPublicProject(db, 'public'))?.title).toBe('Public');
    expect(await getPublicProject(db, 'draft')).toBeNull();
    expect(await getPublicProject(db, 'finpay-digital-banking')).toBeNull();
    expect(await getPublicProject(db, "' OR 1=1 --")).toBeNull();
  });
  test('empty categories do not reveal unpublished work and limit is bounded', async () => {
    const { sqlite, db } = fixture();
    sqlite.exec("INSERT INTO portfolio_projects (title,slug,is_published,category_id) VALUES ('Draft','draft',0,1),('A','a',1,2),('B','b',1,2)");
    expect((await getPublicCategories(db)).map(category => category.id)).toEqual([2]);
    expect(await getPublicProjects(db, 1)).toHaveLength(1);
    expect(await getPublicProjects(db, Infinity)).toHaveLength(2);
  });
  test('rejects executable and protocol-relative CMS URLs', () => {
    expect(publicUrl('javascript:alert(1)')).toBeUndefined();
    expect(publicUrl('//untrusted.example')).toBeUndefined();
    expect(publicUrl('/\\untrusted.example')).toBeUndefined();
    expect(publicUrl('/images/work/afrilab.jpg')).toBe('/images/work/afrilab.jpg');
    expect(publicUrl('https://example.com')).toBe('https://example.com/');
  });
});

describe('homepage enquiry contract', () => {
  test('persists guided-build enquiry using exactly the homepage field contract', async () => {
    const { sqlite, db } = fixture();
    sqlite.exec(readFileSync(new URL('../migrations/010_contact_form_submissions.sql', import.meta.url), 'utf8'));
    const form = new FormData();
    for (const [key, value] of Object.entries({ full_name: 'Preview Test', email: 'preview@example.com',
      service_type: 'Guided build', project_description: 'Help me build a booking application with Codex.',
      session_id: 'local-test', time_spent: '0', field_interactions: '{}', user_agent: 'test' })) form.set(key, value);
    const request = new Request('http://localhost/api/contact/submit', { method: 'POST', body: form });
    // API context fixture has no mail credentials; no emails or production writes are possible.
    const context = { request, locals: { runtime: { env: { DB: db } } } } as unknown as Parameters<typeof POST>[0];
    const response = await POST(context);
    expect(response.status).toBe(200);
    expect(await response.json()).toMatchObject({ success: true });
    expect(sqlite.prepare('SELECT service_type FROM contact_submissions').get()).toEqual({ service_type: 'Guided build' });
  });
  test('rejects invalid input without creating a lead', async () => {
    const { sqlite, db } = fixture();
    sqlite.exec(readFileSync(new URL('../migrations/010_contact_form_submissions.sql', import.meta.url), 'utf8'));
    const request = new Request('http://localhost/api/contact/submit', { method: 'POST', body: new FormData() });
    const response = await POST({ request, locals: { runtime: { env: { DB: db } } } } as unknown as Parameters<typeof POST>[0]);
    expect(response.status).toBe(400);
    expect(sqlite.prepare('SELECT COUNT(*) AS n FROM contact_submissions').get()).toEqual({ n: 0 });
  });
});
