/** Local-only integration checks; leaves six published preview articles. */
import assert from 'node:assert/strict';
import { readFileSync, mkdirSync, writeFileSync } from 'node:fs';
import { EDITORIAL_POSTS } from '../src/content/editorial-pack';
import { STUDIO_DEFAULTS } from '../src/lib/studio-content';
const base = 'http://localhost:8850';
const target = readFileSync('.wrangler/studio-cms-preview-path.txt', 'utf8').trim();
const credentials = JSON.parse(readFileSync(`${target}/credentials.json`, 'utf8'));
const results: string[] = [];
let cookie = '', csrf = '';
async function api(path: string, body?: unknown, method = body ? 'POST' : 'GET', authorised = true, withCSRF = true) {
  return fetch(base + path, { method, redirect: 'manual', headers: { 'Content-Type': 'application/json', ...(authorised ? { Cookie: cookie } : {}), ...(withCSRF ? { 'X-CSRF-Token': csrf } : {}) }, ...(body === undefined ? {} : { body: JSON.stringify(body) }) });
}
assert.equal((await api('/api/admin/editorial-pack', {}, 'POST', false)).status, 401);
const login = await api('/api/admin/login', { username: 'e2e-admin', password: credentials.adminPassword });
assert.equal(login.status, 200); cookie = login.headers.get('set-cookie')!.split(';')[0]; csrf = (await login.json()).csrf_token;
assert.equal((await api('/api/admin/editorial-pack', {}, 'POST', true, false)).status, 403);
results.push('Anonymous import rejected; authenticated import requires CSRF');
const first = await (await api('/api/admin/editorial-pack', {}, 'POST')).json(); assert.equal(first.added, 6);
assert.equal((await (await api('/api/admin/editorial-pack', {}, 'POST')).json()).added, 0);
let posts = (await (await api('/api/admin/blog')).json()).posts as (typeof EDITORIAL_POSTS[number] & {id:number;published:number})[];
assert.equal(posts.length, 6); assert.ok(posts.every(post => post.published === 0));
for (const post of posts) assert.equal((await fetch(`${base}/blog/${post.slug}`)).status, 404);
assert.ok(!(await (await fetch(`${base}/llms.txt`)).text()).includes(posts[0].slug));
results.push('Import adds six private drafts; second import adds zero; public draft URLs return 404');
const changed = { ...posts[0], title: 'Owner-edited preview title' };
assert.equal((await api('/api/admin/blog', changed, 'PUT')).status, 200);
await api('/api/admin/editorial-pack', {}, 'POST');
assert.ok((await (await api('/api/admin/blog')).json()).posts.some((post: {title:string}) => post.title === changed.title));
results.push('Reimport preserves owner edits');
for (const post of posts) assert.equal((await api('/api/admin/blog', { ...post, published: 1 }, 'PUT')).status, 200);
for (const post of posts) {
  const response = await fetch(`${base}/blog/${post.slug}`); assert.equal(response.status, 200);
  const html = await response.text(); assert.ok(html.includes('application/ld+json')); assert.ok(html.includes('Hodges &amp; Co. Studios'));
  assert.ok(html.includes('noindex')); assert.ok(html.includes('Sources and further reading'));
  for (const match of html.matchAll(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/g)) JSON.parse(match[1]);
  assert.equal((await fetch(base + post.featured_image)).status, 200);
}
const sitemap = await (await fetch(`${base}/sitemap-blog.xml`)).text(); const llms = await (await fetch(`${base}/llms.txt`)).text();
assert.ok(posts.every(post => sitemap.includes(post.slug) && llms.includes(post.slug)));
results.push('Six articles, covers, JSON-LD and published-only indexes work; preview remains noindex');
assert.equal((await api('/api/admin/content', { content: { studio_hero_title: '<CMS verification>', studio_about_title: 'About CMS verification', studio_footer_title: 'Footer CMS verification' } })).status, 200);
assert.ok((await (await fetch(base)).text()).includes('&lt;CMS verification&gt;'));
assert.ok((await (await fetch(base + '/about')).text()).includes('About CMS verification'));
assert.ok((await (await fetch(base + '/contact')).text()).includes('Footer CMS verification'));
assert.equal((await api('/api/admin/content', { content: STUDIO_DEFAULTS })).status, 200);
results.push('Homepage, About and shared footer render saved CMS text with escaping; approved copy restored');
const folder = 'docs/reviews/studio-cms-editorial-2026-11-22'; mkdirSync(folder, { recursive: true });
writeFileSync(`${folder}/integration-results.json`, JSON.stringify({ base, checks: results, posts: posts.map(post => ({ slug: post.slug, title: post.title })), productionChanged: false }, null, 2));
console.log(results.join('\n'));
