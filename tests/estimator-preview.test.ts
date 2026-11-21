import { describe, expect, test } from 'bun:test';
import { POST } from '../src/pages/api/estimate-project';
import type { APIContext } from 'astro';

describe('project estimator persistence contract', () => {
  test('does not offer a shareable proposal when the scope was not saved', async () => {
    const request = new Request('http://localhost/api/estimate-project', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: 'Preview Reviewer', email: 'preview@example.com', project_description: 'A booking platform with staff availability and mobile money payments.', project_type: 'web', timeline_preference: '1-3 months', budget_range: 'under 10k' }),
    });
    const context = { request, locals: { runtime: { env: {} } } } as unknown as APIContext;
    const response = await POST(context);
    const result = await response.json() as { share_token?: string; estimated_cost_min: number; estimated_cost_max: number };
    expect(response.status).toBe(200);
    expect(result.share_token).toBeUndefined();
    expect(result.estimated_cost_min).toBeGreaterThan(0);
    expect(result.estimated_cost_max).toBeGreaterThanOrEqual(result.estimated_cost_min);
  });
});
