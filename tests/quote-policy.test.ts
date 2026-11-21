import { expect, test } from 'bun:test';
import { publicProjectScope, quoteSafeText, telegramQuoteLink } from '../src/lib/quote-policy';
import { POST as kodie } from '../src/pages/api/chat/kodie';
import type { APIContext } from 'astro';

test('public scopes redact historical/generated prices while retaining useful technical content', () => {
  const scope = publicProjectScope({ estimated_cost_min: 60000, estimated_cost_max: 180000,
    summary: 'The project costs GHS 60,000.', key_features: ['Booking calendar', 'Payment integration costs $3,000'],
    technology_stack: ['Cloudflare Workers'], estimated_timeline_weeks: 8, risk_level: 'medium' });
  expect(scope).not.toHaveProperty('estimated_cost_min');
  expect(scope).not.toHaveProperty('estimated_cost_max');
  expect(JSON.stringify(scope)).not.toMatch(/60,000|3,000/);
  expect(scope.technology_stack).toEqual(['Cloudflare Workers']);
  expect(scope.estimated_timeline_weeks).toBe(8);
  expect(quoteSafeText('Indicative delivery: 8 weeks.')).toBe('Indicative delivery: 8 weeks.');
});

test('Telegram handoff targets the confirmed studio account and includes a draft brief link', () => {
  const brief = 'https://ohwpstudios.org/proposal/abc123';
  const url = new URL(telegramQuoteLink(brief));
  expect(url.origin + url.pathname).toBe('https://t.me/oh84dev');
  expect(url.searchParams.get('text')).toContain(brief);
  expect(url.pathname).not.toContain('share');
});

test('pricing questions never call AI or return fabricated ranges', async () => {
  let calls = 0;
  const request = new Request('http://localhost/api/chat/kodie', { method: 'POST', headers: { 'Content-Type': 'application/json', 'CF-Connecting-IP': crypto.randomUUID() }, body: JSON.stringify({ message: 'How much is a website? Give me your prices.' }) });
  const response = await kodie({ request, locals: { runtime: { env: { AI: { run: async () => { calls++; return { response: '$60000' }; } } } } } } as unknown as APIContext);
  expect(response.status).toBe(200);
  const data = await response.json();
  expect(calls).toBe(0);
  expect(data.response.message).toContain('https://t.me/oh84dev');
  expect(data.response.message).not.toMatch(/\$\d|GH₵\d|GHS\s*\d/);
});
