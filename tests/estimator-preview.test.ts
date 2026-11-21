import { describe, expect, test } from 'bun:test';
import { POST } from '../src/pages/api/estimate-project';
import type { APIContext } from 'astro';
import { Database } from 'bun:sqlite';
import { readFileSync } from 'node:fs';

describe('project estimator persistence contract', () => {
  test('unpriced briefs persist while migration preserves old quoted records and share links', async () => {
    const sqlite = new Database(':memory:');
    try {
      for (const name of ['007_project_estimator.sql', '045_proposal_share_tokens.sql']) sqlite.exec(readFileSync(new URL(`../migrations/${name}`, import.meta.url), 'utf8'));
      sqlite.exec("INSERT INTO project_estimates(id,name,email,project_description,project_type,timeline_preference,budget_range,estimated_cost_min,estimated_cost_max,status,admin_notes,share_token) VALUES(42,'Existing Client','old@example.test','Old project','web','asap','10k-25k',10000,25000,'contacted','Preserve this note','existing-share');");
      const before = sqlite.prepare('SELECT * FROM project_estimates WHERE id=42').get();
      sqlite.exec("CREATE TRIGGER update_project_estimates_timestamp AFTER UPDATE ON project_estimates BEGIN UPDATE project_estimates SET updated_at = CURRENT_TIMESTAMP WHERE id = NEW.id; END;");
      sqlite.exec("INSERT INTO project_estimates(id,name,email,project_description,project_type,timeline_preference,budget_range) VALUES(99,'Deleted','deleted@example.test','Old project','web','asap','10k-25k'); DELETE FROM project_estimates WHERE id=99;");
      sqlite.exec(readFileSync(new URL('../migrations/050_project_scope_review.sql', import.meta.url), 'utf8'));
      expect(sqlite.prepare('SELECT * FROM project_estimates WHERE id=42').get()).toEqual(before);
      expect(sqlite.prepare("SELECT seq FROM sqlite_sequence WHERE name='project_estimates'").get()).toEqual({ seq: 99 });
      expect(sqlite.prepare("SELECT name FROM sqlite_master WHERE type='trigger' AND name='update_project_estimates_timestamp'").get()).toEqual({ name: 'update_project_estimates_timestamp' });
      const prepare = (sql: string, values: (string | number | null)[] = []) => ({ bind: (...params: (string | number | null)[]) => prepare(sql, params), run: async () => {
        const result = sqlite.prepare(sql).run(...values); return { success: true, meta: { last_row_id: Number(result.lastInsertRowid) } };
      } });
      const request = new Request('http://localhost/api/estimate-project', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ name: 'Brief Reviewer', email: 'brief@example.test', project_description: 'Build a booking platform with staff schedules and mobile money payments.', project_type: 'web', timeline_preference: '1-3 months', budget_range: 'to-discuss' }) });
      const response = await POST({ request, locals: { runtime: { env: { DB: { prepare } } } } } as unknown as APIContext);
      expect(response.status).toBe(200);
      const data = await response.json();
      expect(data.pricing).toBe('review_required');
      expect(data.share_token).toMatch(/^[a-z0-9]{12}$/);
      expect(data).not.toHaveProperty('estimated_cost_min');
      expect(sqlite.prepare("SELECT budget_range, estimated_cost_min, estimated_cost_max FROM project_estimates WHERE email='brief@example.test'").get()).toEqual({ budget_range: 'to-discuss', estimated_cost_min: 0, estimated_cost_max: 0 });
    } finally { sqlite.close(); }
  });
  test('rejects malformed payloads before AI or persistence', async () => {
    for (const body of [null, { name: 42 }, { name: 'Test', email: 'test@example.test', project_description: 'A booking app', project_type: 'unknown', timeline_preference: 'asap', budget_range: 'under 10k' }]) {
      const request = new Request('http://localhost/api/estimate-project', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
      expect((await POST({ request, locals: { runtime: { env: {} } } } as unknown as APIContext)).status).toBe(400);
    }
  });
  test('does not offer a shareable proposal when the scope was not saved', async () => {
    const request = new Request('http://localhost/api/estimate-project', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: 'Preview Reviewer', email: 'preview@example.com', project_description: 'A booking platform with staff availability and mobile money payments.', project_type: 'web', timeline_preference: '1-3 months', budget_range: 'under 10k' }),
    });
    const context = { request, locals: { runtime: { env: {} } } } as unknown as APIContext;
    const response = await POST(context);
    const result = await response.json() as { share_token?: string; estimated_cost_min?: number; estimated_cost_max?: number; pricing: string; telegram_url: string };
    expect(response.status).toBe(200);
    expect(result.share_token).toBeUndefined();
    expect(result.estimated_cost_min).toBeUndefined();
    expect(result.estimated_cost_max).toBeUndefined();
    expect(result.pricing).toBe('review_required');
    expect(new URL(result.telegram_url).pathname).toBe('/oh84dev');
  });
});
