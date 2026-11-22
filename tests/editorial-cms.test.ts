import { afterEach, expect, test } from 'bun:test';
import { Database } from 'bun:sqlite';
import { readFileSync } from 'node:fs';
import type { APIContext } from 'astro';
import { EDITORIAL_POSTS } from '../src/content/editorial-pack';
import { getStudioContent, STUDIO_DEFAULTS } from '../src/lib/studio-content';
import { parseBlogInput } from '../src/lib/blog-editor';
import { POST as importPack } from '../src/pages/api/admin/editorial-pack';
import { GET as list, PUT as update } from '../src/pages/api/admin/blog';
import { POST as saveContent } from '../src/pages/api/admin/content';

const open: Database[] = [];
function fixture() {
  const sqlite = new Database(':memory:'); open.push(sqlite);
  sqlite.exec(readFileSync('schema.sql', 'utf8').split('-- Services table')[0]);
  sqlite.exec(readFileSync('migrations/004_blog_posts.sql', 'utf8').split('-- Insert sample')[0]);
  type Value = string | number | null;
  const prepare = (sql: string, values: Value[] = []) => ({
    bind: (...params: Value[]) => prepare(sql, params),
    first: async () => sqlite.prepare(sql).get(...values),
    all: async () => ({ results: sqlite.prepare(sql).all(...values) }),
    run: async () => { const result = sqlite.prepare(sql).run(...values); return { meta: { changes: result.changes, last_row_id: Number(result.lastInsertRowid) } }; },
  });
  const db = { prepare, batch: async (statements: ReturnType<typeof prepare>[]) => Promise.all(statements.map(statement => statement.run())) };
  const context = (body?: unknown) => ({ locals: { runtime: { env: { DB: db } } }, request: new Request('http://localhost/api/admin/blog', { method: body ? 'POST' : 'GET', ...(body ? { body: JSON.stringify(body) } : {}) }) }) as unknown as APIContext;
  return { sqlite, db: db as unknown as D1Database, context };
}
afterEach(() => open.splice(0).forEach(db => db.close()));

test('approved CMS defaults ignore legacy placeholders and save only recognised text fields', async () => {
  const { sqlite, db, context } = fixture();
  sqlite.exec("INSERT INTO site_content(content_key,content_value,updated_at) VALUES('hero_title','Legacy placeholder',datetime('now'))");
  expect((await getStudioContent(db)).studio_hero_title).toBe(STUDIO_DEFAULTS.studio_hero_title);
  expect((await saveContent(context({ content: { studio_hero_title: 'A client-specific headline' } }))).status).toBe(200);
  expect((await getStudioContent(db)).studio_hero_title).toBe('A client-specific headline');
  expect((await saveContent(context({ content: { unknown_field: 'x' } }))).status).toBe(400);
  expect((await saveContent(context({ content: { studio_hero_title: 42 } }))).status).toBe(400);
});

test('editorial import is idempotent, preserves edits, and keeps posts as drafts', async () => {
  const { sqlite, context } = fixture();
  expect((await (await importPack(context())).json()).added).toBe(6);
  sqlite.prepare('UPDATE blog_posts SET title=? WHERE slug=?').run('Owner edit', EDITORIAL_POSTS[0].slug);
  expect((await (await importPack(context())).json()).added).toBe(0);
  const posts = (await (await list(context())).json()).posts;
  expect(posts).toHaveLength(6);
  expect(posts.every((post: { published: number }) => post.published === 0)).toBe(true);
  expect(sqlite.prepare('SELECT title FROM blog_posts WHERE slug=?').get(EDITORIAL_POSTS[0].slug)).toEqual({ title: 'Owner edit' });
  expect(sqlite.prepare('SELECT count(*) AS n FROM blog_posts WHERE published=1').get()).toEqual({ n: 0 });
});

test('publishing assigns a date, duplicate slugs fail and content validation rejects unsafe URLs', async () => {
  const { sqlite, context } = fixture(); await importPack(context());
  const post = sqlite.prepare('SELECT * FROM blog_posts ORDER BY id LIMIT 1').get() as Record<string, unknown>;
  expect((await update(context({ ...post, published: 1 }))).status).toBe(200);
  expect(sqlite.prepare('SELECT published,published_at FROM blog_posts WHERE id=?').get(Number(post.id))).toMatchObject({ published: 1, published_at: expect.any(String) });
  expect((await update(context({ ...post, slug: EDITORIAL_POSTS[1].slug }))).status).toBe(409);
  expect(parseBlogInput({ ...post, featured_image: 'javascript:alert(1)' })).toBeNull();
  expect(parseBlogInput({ ...post, content: '<p onclick="alert(1)">Useful</p><script>alert(1)</script>' })?.content).toBe('<p>Useful</p>');
});
