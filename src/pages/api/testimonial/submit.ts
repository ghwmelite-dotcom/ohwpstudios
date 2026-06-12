import type { APIRoute } from 'astro';

export const prerender = false;

export const POST: APIRoute = async ({ request, locals }) => {
  const json = (body: object, status: number) =>
    new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } });
  const db = locals.runtime?.env?.DB;
  if (!db) return json({ success: false, error: 'Service unavailable' }, 500);

  let body: Record<string, unknown>;
  try { body = await request.json(); } catch { return json({ success: false, error: 'Invalid body' }, 400); }
  const token = typeof body.token === 'string' ? body.token : '';
  const name = typeof body.name === 'string' ? body.name.trim() : '';
  const role = typeof body.role === 'string' ? body.role.trim() : '';
  const company = typeof body.company === 'string' ? body.company.trim() : '';
  const content = typeof body.content === 'string' ? body.content.trim() : '';
  const avatar_url = typeof body.avatar_url === 'string' ? body.avatar_url.trim() : '';
  if (!token || !name || !content) return json({ success: false, error: 'Name and testimonial are required.' }, 400);
  if (name.length > 200 || role.length > 100 || company.length > 100 || content.length > 600 || avatar_url.length > 500) {
    return json({ success: false, error: 'One of the fields is too long.' }, 400);
  }
  if (avatar_url && !/^https:\/\//.test(avatar_url)) {
    return json({ success: false, error: 'Photo URL must start with https://' }, 400);
  }
  const stars = Math.min(5, Math.max(1, Number(body.rating) || 5));

  const redeemed = await db
    .prepare('UPDATE testimonial_invites SET used = 1 WHERE token = ? AND used = 0')
    .bind(token)
    .run();
  if (!redeemed.meta || redeemed.meta.changes !== 1) {
    return json({ success: false, error: 'This link has expired.' }, 410);
  }

  const initials = name.split(/\s+/).map((p: string) => p[0]).join('').slice(0, 2).toUpperCase();

  await db.prepare(
    `INSERT INTO testimonials (name, role, company, content, rating, avatar_url, avatar_initials, avatar_gradient, is_active)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, 0)`
  ).bind(name, role, company, content, stars, avatar_url || null, initials, 'linear-gradient(135deg, #E3A92B, #F5C969)').run();

  return json({ success: true }, 200);
};
