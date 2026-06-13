import type { APIRoute } from 'astro';
import * as Sentry from '@sentry/cloudflare';
import { generateCode, hashCode, CODE_TTL_MIN, RESEND_COOLDOWN_SEC, MAX_CODES_PER_HOUR } from '../../../lib/contract-verify';
import { sendEmail, emailShell } from '../../../lib/email';

export const prerender = false;

const json = (b: object, s = 200) => new Response(JSON.stringify(b), { status: s, headers: { 'Content-Type': 'application/json' } });

export const POST: APIRoute = async ({ request, locals }) => {
  const db = locals.runtime?.env?.DB;
  if (!db) return json({ success: false, error: 'Service unavailable' }, 503);

  let body: { token?: string };
  try { body = await request.json(); } catch { return json({ success: false, error: 'Invalid request' }, 400); }
  const token = body.token;
  if (!token) return json({ success: false, error: 'Invalid request' }, 400);

  const contract = await db.prepare('SELECT id, client_email, status FROM contracts WHERE share_token = ?').bind(token).first<{ id: number; client_email: string; status: string }>();
  if (!contract) return json({ success: false, error: 'This contract link is invalid or has expired.' }, 404);
  if (contract.status === 'signed' || contract.status === 'completed') {
    return json({ success: false, error: 'This contract has already been signed.' }, 400);
  }

  // throttle: 60s cooldown since the most recent code, and <= 6 codes/hour
  const recent = await db.prepare("SELECT created_at FROM contract_verifications WHERE contract_id = ? ORDER BY created_at DESC LIMIT 1").bind(contract.id).first<{ created_at: string }>();
  if (recent) {
    const ageSec = (Date.now() - new Date(recent.created_at.replace(' ', 'T') + 'Z').getTime()) / 1000;
    if (ageSec < RESEND_COOLDOWN_SEC) return json({ success: false, error: 'Please wait a moment before requesting another code.' }, 429);
  }
  const hourCount = await db.prepare("SELECT COUNT(*) AS n FROM contract_verifications WHERE contract_id = ? AND created_at > datetime('now','-1 hour')").bind(contract.id).first<{ n: number }>();
  if (Number(hourCount?.n ?? 0) >= MAX_CODES_PER_HOUR) return json({ success: false, error: 'Too many code requests. Please try again later.' }, 429);

  // invalidate prior unconsumed codes, issue a fresh one
  await db.prepare("UPDATE contract_verifications SET consumed_at = datetime('now') WHERE contract_id = ? AND consumed_at IS NULL").bind(contract.id).run();
  const code = generateCode();
  const codeHash = await hashCode(code);
  await db.prepare("INSERT INTO contract_verifications (contract_id, code_hash, expires_at) VALUES (?, ?, datetime('now', ?))").bind(contract.id, codeHash, `+${CODE_TTL_MIN} minutes`).run();

  try {
    await sendEmail(locals.runtime?.env ?? {}, {
      to: String(contract.client_email),
      subject: 'Your OhWP Studios signing code',
      html: emailShell('Your signing code', `<p>Use this code to sign your contract — it expires in ${CODE_TTL_MIN} minutes:</p><p style="font-size:30px;font-weight:800;letter-spacing:6px;text-align:center;color:#241D17;">${code}</p><p style="font-size:13px;color:#8a7d68;">If you didn't request this, you can ignore this email.</p>`),
    });
  } catch (e) {
    Sentry.captureException(e);
    await db.prepare("UPDATE contract_verifications SET consumed_at = datetime('now') WHERE contract_id = ? AND consumed_at IS NULL").bind(contract.id).run();
    return json({ success: false, error: "We couldn't send the code right now. Please try again." }, 502);
  }

  return json({ success: true, message: 'A verification code has been sent to the email on file for this contract.' });
};
