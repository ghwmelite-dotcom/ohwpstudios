/** Real HTTP/D1 checks. Refuses public hosts: writes synthetic local data only. */
import assert from 'node:assert/strict';
import { mkdirSync, writeFileSync, readFileSync } from 'node:fs';
const base = process.argv[2] || 'http://localhost:8831';
if (!['localhost', '127.0.0.1'].includes(new URL(base).hostname)) throw new Error('Local sandbox only');
const output = process.argv[3] || '.wrangler/e2e-results.json';
const credentialFile = process.env.E2E_CREDENTIALS_FILE || process.argv[4];
if (!credentialFile) throw new Error('Provide the isolated sandbox credentials file as argument 4 or E2E_CREDENTIALS_FILE');
const credentials = JSON.parse(readFileSync(credentialFile, 'utf8'));
if (typeof credentials.adminPassword !== 'string' || typeof credentials.clientPassword !== 'string' || credentials.adminPassword.length < 32 || credentials.clientPassword.length < 32) throw new Error('Regenerate sandbox credentials with prepare-e2e.ts');
const results = [];
async function check(name, fn) {
  try { await fn(); results.push({ name, passed: true }); console.log(`PASS ${name}`); }
  catch (error) { results.push({ name, passed: false, error: error.message }); console.log(`FAIL ${name}: ${error.message}`); }
}
async function api(path, { body, cookie, token, csrf, method } = {}) {
  return fetch(new URL(path, base), { method: method || (body ? 'POST' : 'GET'), redirect: 'manual',
    headers: { 'Content-Type': 'application/json', ...(cookie ? { Cookie: cookie } : {}), ...(token ? { Authorization: `Bearer ${token}` } : {}), ...(csrf ? { 'X-CSRF-Token': csrf } : {}) },
    ...(body ? { body: JSON.stringify(body) } : {}) });
}
let cookie, csrf, token, chatCookie, conversationId;
await check('Anonymous admin, client and chat operator APIs reject access', async () => {
  for (const path of ['/api/admin/session', '/api/admin/content', '/api/client/projects', '/api/client/project/1', '/api/chat/conversations', '/api/chat/conversations/', '/api/chat/messages?conversation_id=1', '/api/chat/canned-responses']) {
    assert.equal((await api(path)).status, 401, path);
  }
  assert.equal((await api('/admin/dashboard')).status, 302);
});
await check('Admin invalid login and real PBKDF2 login with HttpOnly secure cookie', async () => {
  const bad = await api('/api/admin/login', { body: { username: 'e2e-admin', password: 'wrong' } });
  assert.equal(bad.status, 401);
  const response = await api('/api/admin/login', { body: { username: 'e2e-admin', password: credentials.adminPassword } });
  assert.equal(response.status, 200);
  const header = response.headers.get('set-cookie');
  assert.match(header, /HttpOnly/i); assert.match(header, /Secure/i); assert.match(header, /SameSite=Lax/i);
  cookie = header.split(';')[0];
  const data = await response.json(); assert.equal(data.token, undefined); csrf = data.csrf_token;
  assert.equal((await api('/api/admin/session', { cookie })).status, 200);
});
await check('Admin writes and operator replies require valid CSRF', async () => {
  assert.equal((await api('/api/admin/content', { cookie, body: {} })).status, 403);
  assert.equal((await api('/api/chat/messages', { cookie, body: { conversation_id: 1, message: 'Forbidden', sender_type: 'operator' } })).status, 403);
  assert.equal((await api('/api/admin/content', { cookie, csrf: 'wrong', body: {} })).status, 403);
});
await check('Client login and tenant-isolated projects and details', async () => {
  const response = await api('/api/client/login', { body: { email: 'client@example.test', password: credentials.clientPassword } });
  assert.equal(response.status, 200); token = (await response.json()).token; assert.ok(token);
  const list = await (await api('/api/client/projects', { token })).json();
  assert.equal(list.projects.length, 1); assert.equal(list.projects[0].id, 1);
  assert.equal((await api('/api/client/project/1', { token })).status, 200);
  assert.equal((await api('/api/client/project/2', { token })).status, 404);
  assert.equal((await api('/api/client/code-quality?project_id=2', { token })).status, 404);
});
await check('Client project-file write persists and cross-tenant write is denied', async () => {
  const body = { project_id: 1, file_name: 'HTTP E2E file', file_url: 'https://example.test/notes.pdf' };
  assert.equal((await api('/api/client/upload-file', { token, body: { ...body, project_id: 2 } })).status, 404);
  assert.equal((await api('/api/client/upload-file', { token, body })).status, 201);
  assert.equal((await api('/api/client/upload-file', { token, body: { ...body, file_url: 'javascript:alert(1)' } })).status, 400);
  const data = await (await api('/api/client/project/1', { token })).json();
  assert.ok(JSON.stringify(data).includes('HTTP E2E file'));
});
await check('Legacy live-chat visitor flow retains private reads and visitor sends', async () => {
  const response = await api('/api/chat/conversations', { body: { visitor_name: 'E2E legacy visitor', visitor_email: 'legacy@example.test', initial_message: 'Local chat test' } });
  assert.equal(response.status, 201);
  const ownCookie = response.headers.get('set-cookie')?.split(';')[0];
  const id = (await response.json()).conversation_id;
  const body = { conversation_id: id, message: 'Visitor followup', sender_type: 'visitor', sender_name: 'E2E legacy visitor' };
  assert.equal((await api('/api/chat/messages', { body })).status, 401);
  assert.equal((await api('/api/chat/messages', { cookie: ownCookie, body })).status, 201);
  assert.equal((await api(`/api/chat/messages?conversation_id=${id}`, { cookie: ownCookie })).status, 200);
});
await check('Kodie conversation persists and visitor credential protects followups', async () => {
  const response = await api('/api/chat/kodie', { body: { message: 'I need a booking website for an Accra salon.', userName: 'E2E Visitor', userEmail: 'visitor@example.test' } });
  assert.equal(response.status, 200); const data = await response.json();
  assert.ok(data.response.message); assert.ok(data.conversation_id); conversationId = data.conversation_id;
  chatCookie = response.headers.get('set-cookie')?.split(';')[0]; assert.ok(chatCookie);
  assert.equal((await api(`/api/chat/messages?conversation_id=${conversationId}`)).status, 401);
  const messages = await (await api(`/api/chat/messages?conversation_id=${conversationId}`, { cookie: chatCookie })).json();
  assert.equal(messages.messages.length, 2);
  assert.equal((await api('/api/chat/kodie', { body: { message: 'Forged reply', conversation_id: conversationId } })).status, 403);
  const followup = await api('/api/chat/kodie', { cookie: chatCookie, body: { message: 'It should support mobile money.', conversation_id: conversationId, conversation_history: [{ role: 'user', content: 'I need a salon booking app in Accra' }, { role: 'assistant', content: data.response.message }] } });
  assert.equal(followup.status, 200);
  assert.equal((await followup.json()).conversation_id, conversationId);
});
await check('Visitor cannot impersonate operator; real admin can reply with CSRF', async () => {
  const body = { conversation_id: conversationId, message: 'E2E operator reply', sender_type: 'operator', sender_name: 'E2E Support' };
  assert.equal((await api('/api/chat/messages', { cookie: chatCookie, body })).status, 401);
  assert.equal((await api('/api/chat/messages', { cookie, csrf, body })).status, 201);
  const data = await (await api(`/api/chat/messages?conversation_id=${conversationId}`, { cookie: chatCookie })).json();
  assert.ok(data.messages.some(message => message.message_text === body.message));
});
await check('Chat qualification is available only to the conversation owner', async () => {
  const body = { conversation_id: conversationId, conversation_history: [{ sender_type: 'visitor', message: 'I need a React booking website with a budget of $15000 and a timeline of three months.' }], user_name: 'E2E Visitor', user_email: 'visitor@example.test' };
  assert.equal((await api('/api/chat/ai-qualify', { body })).status, 403);
  const response = await api('/api/chat/ai-qualify', { cookie: chatCookie, body });
  assert.equal(response.status, 200); assert.ok((await response.json()).qualification);
});
await check(process.env.E2E_EXPECT_AI === '1' ? 'PM assistant uses Workers AI with private project context and saved history' : 'PM assistant preserves tenant checks and reports unavailable AI in a binding-free sandbox', async () => {
  assert.equal((await api('/api/client/pm-chat', { token, body: { projectId: 2, message: 'Status?' } })).status, 404);
  const response = await api('/api/client/pm-chat', { token, body: { projectId: '1', message: 'What is my project progress and next milestone?' } });
  if (process.env.E2E_EXPECT_AI !== '1') {
    assert.equal(response.status, 503);
    assert.equal((await response.json()).error, 'AI service not configured');
    assert.equal((await api('/api/client/pm-chat?projectId=2', { token })).status, 404);
    return;
  }
  assert.equal(response.status, 200); const data = await response.json(); assert.ok(data.message);
  const history = await (await api('/api/client/pm-chat?projectId=1', { token })).json();
  assert.ok(history.messages.some(message => message.role === 'assistant'));
  assert.equal((await api('/api/client/pm-chat?projectId=2', { token })).status, 404);
});
await check('Estimator persists result and returns a usable shared-proposal token', async () => {
  const response = await api('/api/estimate-project', { body: { name: 'E2E Reviewer', email: 'estimate@example.test', project_description: 'An Accra salon booking application with appointment schedules, staff availability and mobile money checkout.', project_type: 'web', timeline_preference: '1-3 months', budget_range: 'to-discuss' } });
  assert.equal(response.status, 200); const data = await response.json();
  assert.ok(data.id); assert.match(data.share_token, /^[a-z0-9]{12}$/);
  assert.equal(data.pricing, 'review_required'); assert.equal(data.estimated_cost_min, undefined); assert.equal(data.estimated_cost_max, undefined);
  assert.equal(new URL(data.telegram_url).pathname, '/HodgesCoStudios');
  assert.ok(new URL(data.telegram_url).searchParams.has('direct'));
  // Browser verifies the proposal page and PDF separately.
  results.push({ name: 'Shared proposal token', token: data.share_token });
});
await check('Admin logout revokes session at the database', async () => {
  assert.equal((await api('/api/admin/logout', { cookie, csrf, method: 'POST' })).status, 200);
  assert.equal((await api('/api/admin/session', { cookie })).status, 401);
});
await check('Client logout revokes the bearer token at the database', async () => {
  assert.equal((await api('/api/client/logout', { token, method: 'POST' })).status, 200);
  assert.equal((await api('/api/client/projects', { token })).status, 401);
});
writeFileSync(output, JSON.stringify({ base, checkedAt: new Date().toISOString(), results }, null, 2));
if (results.some(result => result.passed === false)) process.exitCode = 1;
