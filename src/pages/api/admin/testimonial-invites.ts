import type { APIRoute } from 'astro';
import * as Sentry from '@sentry/cloudflare';
import { sendEmail, emailShell, emailButton, escapeHtml } from '../../../lib/email';

export const prerender = false;

// NOTE: This endpoint mirrors /api/admin/bookings.ts, which has no auth guard.
// Admin API authentication is a known Phase 3 hardening item.

export const POST: APIRoute = async ({ request, locals }) => {
  const json = (body: object, status: number) =>
    new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } });
  const env = locals.runtime?.env;
  const db = env?.DB;
  if (!db) return json({ success: false, error: 'DB unavailable' }, 500);

  let body: { client_name?: string; email?: string };
  try { body = await request.json(); } catch { return json({ success: false, error: 'Invalid body' }, 400); }
  const client_name = body.client_name?.trim();
  const email = body.email?.trim();
  if (!client_name || client_name.length > 200 || !email || email.length > 200 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return json({ success: false, error: 'Name and valid email required' }, 400);
  }

  // Unauthenticated admin surface (Phase 3 item) — cap outbound invite volume
  // so the endpoint can't be used as a spam cannon.
  const recent = await db
    .prepare("SELECT COUNT(*) AS n FROM testimonial_invites WHERE created_at > datetime('now', '-1 hour')")
    .first();
  if (Number(recent?.n ?? 0) >= 10) {
    return json({ success: false, error: 'Rate limit reached — try again later.' }, 429);
  }

  const token = crypto.randomUUID().replace(/-/g, '').slice(0, 16);
  await db.prepare('INSERT INTO testimonial_invites (token, client_name, email) VALUES (?, ?, ?)')
    .bind(token, client_name, email).run();

  const link = `https://ohwpstudios.org/testimonial/${token}`;
  const firstName = escapeHtml(client_name.split(/\s+/)[0]);
  try {
    await sendEmail(env, {
      to: email,
      subject: `${client_name.split(/\s+/)[0]}, would you share a quick word about working with us?`,
      html: emailShell(
        'Two minutes, huge favor',
        `<p>Hi ${firstName},</p>
         <p>It was a pleasure building with you. Would you share a short testimonial about the experience? It takes about two minutes and means the world to a studio like ours.</p>
         ${emailButton(link, 'Share your experience')}
         <p style="font-size:13px;color:#6b7280;">This link is personal to you and works once.</p>`,
      ),
    });
  } catch (e) {
    Sentry.captureException(e);
    return json({ success: true, link, emailed: false }, 200); // invite valid even if email failed
  }
  return json({ success: true, link, emailed: true }, 200);
};
