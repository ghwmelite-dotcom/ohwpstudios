import { Resend } from 'resend';

const FROM = 'OhWP Studios <noreply@ohwpstudios.org>';
export const ADMIN_EMAIL = 'ohwpstudios@gmail.com';

/** Escape user-supplied strings before interpolating into email HTML. */
export function escapeHtml(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

interface SendOpts {
  to: string;
  subject: string;
  html: string;
  replyTo?: string;
  attachments?: Array<{ filename: string; content: string; contentType?: string }>;
}

/**
 * Sends via Resend. Throws on failure — callers decide whether a failure
 * is fatal (it never should be after data is persisted; catch + report).
 * No-ops silently when RESEND_API_KEY is absent (local dev).
 */
export async function sendEmail(env: { RESEND_API_KEY?: string }, opts: SendOpts): Promise<void> {
  if (!env.RESEND_API_KEY) return;
  const resend = new Resend(env.RESEND_API_KEY);
  const { error } = await resend.emails.send({
    from: FROM,
    to: opts.to,
    subject: opts.subject,
    html: opts.html,
    replyTo: opts.replyTo,
    attachments: opts.attachments?.map((a) => ({
      filename: a.filename,
      content: a.content,
      contentType: a.contentType,
    })),
  });
  if (error) throw new Error(`Resend: ${error.message ?? JSON.stringify(error)}`);
}

/** Branded wrapper: indigo gradient bar, white card, Hodges & Co. footer (brand rule — never remove). */
export function emailShell(title: string, bodyHtml: string): string {
  return `<!DOCTYPE html>
<html><body style="margin:0;padding:0;background:#f4f4f7;font-family:-apple-system,Segoe UI,Roboto,Helvetica,Arial,sans-serif;">
  <div style="max-width:560px;margin:0 auto;padding:24px 16px;">
    <div style="background:linear-gradient(90deg,#E3A92B,#F5C969);border-radius:12px 12px 0 0;padding:20px 28px;">
      <span style="color:#ffffff;font-size:18px;font-weight:800;letter-spacing:.3px;">OhWP Studios</span>
    </div>
    <div style="background:#ffffff;border-radius:0 0 12px 12px;padding:28px;color:#111827;font-size:15px;line-height:1.6;">
      <h1 style="font-size:20px;margin:0 0 16px;">${title}</h1>
      ${bodyHtml}
    </div>
    <p style="text-align:center;color:#9ca3af;font-size:12px;margin-top:16px;">
      OhWP Studios — Powered by Hodges &amp; Co.<br>
      <a href="https://ohwpstudios.org" style="color:#E3A92B;">ohwpstudios.org</a>
    </p>
  </div>
</body></html>`;
}

/** Big-button CTA used inside email bodies. */
export function emailButton(href: string, label: string): string {
  return `<p style="text-align:center;margin:24px 0;"><a href="${href}" style="background:linear-gradient(90deg,#E3A92B,#F5C969);color:#ffffff;text-decoration:none;font-weight:700;padding:13px 28px;border-radius:9999px;display:inline-block;">${label}</a></p>`;
}
