import type { APIRoute } from 'astro';
import * as Sentry from '@sentry/cloudflare';
import { hashCode, timingSafeEqual, MAX_ATTEMPTS } from '../../../lib/contract-verify';
import { sendEmail, emailShell, escapeHtml, ADMIN_EMAIL } from '../../../lib/email';

export const prerender = false;

const json = (b: object, s = 200) => new Response(JSON.stringify(b), { status: s, headers: { 'Content-Type': 'application/json' } });

// POST: verify the email code, then record the signature. Identity = the
// contract's on-file client_email (signer cannot choose where the code went).
export const POST: APIRoute = async ({ request, locals }) => {
  const db = locals.runtime?.env?.DB;
  if (!db) return json({ success: false, error: 'Service unavailable' }, 503);

  let data: { token?: string; code?: string; signer_name?: string; signature_data?: string };
  try { data = await request.json(); } catch { return json({ success: false, error: 'Invalid request' }, 400); }
  const { token, code, signer_name, signature_data } = data;
  if (!token || !code || !signer_name?.trim() || !signature_data) {
    return json({ success: false, error: 'Missing required fields' }, 400);
  }
  if (signature_data.length > 500000) {
    return json({ success: false, error: 'Signature data too large' }, 413);
  }

  const contract = await db.prepare('SELECT * FROM contracts WHERE share_token = ?').bind(token).first<Record<string, unknown>>();
  if (!contract) return json({ success: false, error: 'This contract link is invalid or has expired.' }, 404);
  if (contract.status === 'signed' || contract.status === 'completed') {
    return json({ success: false, error: 'This contract has already been signed.' }, 400);
  }

  const v = await db.prepare("SELECT id, code_hash, attempts FROM contract_verifications WHERE contract_id = ? AND consumed_at IS NULL AND expires_at > datetime('now') ORDER BY created_at DESC LIMIT 1").bind(contract.id).first<{ id: number; code_hash: string; attempts: number }>();
  if (!v) return json({ success: false, error: 'No valid code found. Please request a new code.' }, 400);

  if (v.attempts >= MAX_ATTEMPTS) {
    await db.prepare("UPDATE contract_verifications SET consumed_at = datetime('now') WHERE id = ?").bind(v.id).run();
    return json({ success: false, error: 'Too many attempts. Please request a new code.' }, 429);
  }

  const submittedHash = await hashCode(String(code).trim());
  if (!timingSafeEqual(submittedHash, v.code_hash)) {
    await db.prepare('UPDATE contract_verifications SET attempts = attempts + 1 WHERE id = ?').bind(v.id).run();
    const left = MAX_ATTEMPTS - (v.attempts + 1);
    return json({ success: false, error: left > 0 ? `Incorrect code. ${left} attempt(s) left.` : 'Too many attempts. Please request a new code.' }, 400);
  }

  // code OK → consume it atomically (guards the double-sign race) and record the signature
  const consumed = await db.prepare("UPDATE contract_verifications SET consumed_at = datetime('now') WHERE id = ? AND consumed_at IS NULL").bind(v.id).run();
  if (!consumed.meta || consumed.meta.changes !== 1) {
    return json({ success: false, error: 'This code was just used. Please request a new one if needed.' }, 409);
  }

  const clientIP = request.headers.get('cf-connecting-ip') || request.headers.get('x-forwarded-for') || 'unknown';
  const userAgent = request.headers.get('user-agent') || 'unknown';
  const verifiedEmail = String(contract.client_email);
  const cid = contract.id as number;

  await db.prepare("UPDATE contracts SET signature_data = ?, signed_at = datetime('now'), signed_ip = ?, signed_user_agent = ?, status = 'signed', updated_at = datetime('now') WHERE id = ?")
    .bind(signature_data, clientIP, userAgent, cid).run();
  await db.prepare("INSERT INTO contract_signatures (contract_id, signer_name, signer_email, signer_role, signature_data, signed_at, ip_address, user_agent, notes) VALUES (?, ?, ?, 'client', ?, datetime('now'), ?, ?, 'email OTP verified')")
    .bind(cid, signer_name.trim(), verifiedEmail, signature_data, clientIP, userAgent).run();
  await db.prepare("INSERT INTO contract_history (contract_id, action, performed_by, changes, created_at) VALUES (?, 'signed', ?, ?, datetime('now'))")
    .bind(cid, verifiedEmail, JSON.stringify({ ip: clientIP, otp_verified: true })).run();

  try {
    await sendEmail(locals.runtime?.env ?? {}, {
      to: ADMIN_EMAIL,
      subject: `Contract signed: ${contract.contract_number}`,
      html: emailShell('A contract was signed', `<p><strong>${escapeHtml(signer_name.trim())}</strong> (${escapeHtml(verifiedEmail)}) signed <strong>${escapeHtml(String(contract.contract_number))}</strong> — ${escapeHtml(String(contract.title))}.</p>`),
    });
    await sendEmail(locals.runtime?.env ?? {}, {
      to: verifiedEmail,
      subject: `You signed ${contract.contract_number}`,
      html: emailShell('Thanks — your contract is signed', `<p>Hi ${escapeHtml(signer_name.trim().split(/\s+/)[0])}, we've recorded your signature on <strong>${escapeHtml(String(contract.contract_number))}</strong>. We'll be in touch with next steps.</p>`),
    });
  } catch (e) { Sentry.captureException(e); }

  return json({ success: true, message: 'Contract signed successfully', contract_number: contract.contract_number });
};
