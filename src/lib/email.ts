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

/** Branded wrapper: kente strip (table-safe for Outlook), gold-on-cocoa header,
    Hodges & Co. footer (brand rule — never remove). */
export function emailShell(title: string, bodyHtml: string): string {
  return `<!DOCTYPE html>
<html><body style="margin:0;padding:0;background:#F3EDE0;font-family:-apple-system,Segoe UI,Roboto,Helvetica,Arial,sans-serif;">
  <div style="max-width:560px;margin:0 auto;padding:24px 16px;">
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="border-collapse:collapse;border-radius:12px 12px 0 0;overflow:hidden;">
      <tr>
        <td style="height:6px;width:30%;background:#E3A92B;font-size:0;line-height:0;">&nbsp;</td>
        <td style="height:6px;width:15%;background:#1B5E3A;font-size:0;line-height:0;">&nbsp;</td>
        <td style="height:6px;width:15%;background:#161210;font-size:0;line-height:0;">&nbsp;</td>
        <td style="height:6px;width:8%;background:#CE1126;font-size:0;line-height:0;">&nbsp;</td>
        <td style="height:6px;width:32%;background:#E3A92B;font-size:0;line-height:0;">&nbsp;</td>
      </tr>
      <tr>
        <td colspan="5" style="background:#241D17;padding:18px 28px;">
          <span style="color:#E3A92B;font-size:18px;font-weight:800;letter-spacing:.3px;">OhWP Studios</span>
        </td>
      </tr>
    </table>
    <div style="background:#ffffff;border-radius:0 0 12px 12px;padding:28px;color:#241D17;font-size:15px;line-height:1.6;">
      <h1 style="font-size:20px;margin:0 0 16px;">${title}</h1>
      ${bodyHtml}
    </div>
    <p style="text-align:center;color:#8a7d68;font-size:12px;margin-top:16px;">
      OhWP Studios — Powered by Hodges &amp; Co.<br>
      <a href="https://ohwpstudios.org" style="color:#B8860B;">ohwpstudios.org</a>
    </p>
  </div>
</body></html>`;
}

/** Big-button CTA used inside email bodies — solid gold + ink (gradients unreliable in email). */
export function emailButton(href: string, label: string): string {
  return `<p style="text-align:center;margin:24px 0;"><a href="${href}" style="background:#E3A92B;color:#161210;text-decoration:none;font-weight:700;padding:13px 28px;border-radius:9999px;display:inline-block;">${label}</a></p>`;
}
