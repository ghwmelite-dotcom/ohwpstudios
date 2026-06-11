import type { APIRoute } from 'astro';
import * as Sentry from '@sentry/cloudflare';
import { sendEmail, emailShell, emailButton, escapeHtml, ADMIN_EMAIL } from '../../lib/email';
import { buildConsultIcs } from '../../lib/ics';

export const prerender = false;

const VALID_SLOTS = ['09:00', '10:00', '11:00', '13:00', '14:00', '15:00', '16:00'];
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/** btoa() throws on chars outside Latin-1 (the .ics SUMMARY contains an em-dash); encode UTF-8 bytes instead. */
function base64Utf8(s: string): string {
  return btoa(String.fromCharCode(...new TextEncoder().encode(s)));
}

export const POST: APIRoute = async ({ request, locals }) => {
  const json = (body: object, status: number) =>
    new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } });

  let data: Record<string, string>;
  try {
    data = await request.json();
  } catch {
    return json({ success: false, error: 'Invalid request body' }, 400);
  }

  const { name, email, phone, date, time, message } = data;
  if (!name?.trim() || !email?.trim() || !date || !time || !message?.trim()) {
    return json({ success: false, error: 'Please fill in all required fields.' }, 400);
  }
  if (!EMAIL_RE.test(email)) {
    return json({ success: false, error: 'Please enter a valid email address.' }, 400);
  }
  if (!VALID_SLOTS.includes(time)) {
    return json({ success: false, error: 'Please pick a valid time slot.' }, 400);
  }
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date) || new Date(`${date}T${time}:00Z`).getTime() <= Date.now()) {
    return json({ success: false, error: 'Please pick a date and time in the future.' }, 400);
  }

  const env = locals.runtime?.env;
  const db = env?.DB;
  if (!db) return json({ success: false, error: 'Service temporarily unavailable.' }, 500);

  // 1. Persist FIRST — the lead must never be lost again.
  await db
    .prepare(
      'INSERT INTO bookings (name, email, phone, preferred_date, preferred_time, message) VALUES (?, ?, ?, ?, ?, ?)'
    )
    .bind(name.trim(), email.trim(), phone?.trim() || null, date, time, message.trim())
    .run();

  // 2. Emails — failures reported, never fatal (booking is already saved).
  try {
    const safeName = escapeHtml(name.trim());
    const safeMessage = escapeHtml(message.trim());
    const ics = buildConsultIcs({ attendeeName: name.trim(), attendeeEmail: email.trim(), dateISO: date, timeHHMM: time });
    await sendEmail(env, {
      to: email.trim(),
      subject: 'Your consultation with OhWP Studios is booked',
      html: emailShell(
        'You’re booked!',
        `<p>Hi ${escapeHtml(name.split(' ')[0])},</p>
         <p>Your free consultation is scheduled for <strong>${date} at ${time} (GMT)</strong>. The calendar invite is attached — add it with one click.</p>
         <p>We’ll reach out before the session with a meeting link. Want us to come prepared? Reply to this email with anything you’d like us to look at first.</p>
         ${emailButton('https://ohwpstudios.org/estimate-project?utm_source=booking_email&utm_medium=email', 'Scope your project with AI meanwhile')}`,
      ),
      attachments: [{ filename: 'consultation.ics', content: base64Utf8(ics), contentType: 'text/calendar' }],
    });
    await sendEmail(env, {
      to: ADMIN_EMAIL,
      subject: `New booking: ${name.trim()} — ${date} ${time}`,
      html: emailShell(
        'New consultation booking',
        `<p><strong>${safeName}</strong> (${escapeHtml(email.trim())}${phone ? `, ${escapeHtml(phone.trim())}` : ''})</p>
         <p><strong>When:</strong> ${date} at ${time} GMT</p>
         <p><strong>Message:</strong></p><p style="background:#f4f4f7;border-radius:8px;padding:12px;">${safeMessage}</p>
         ${emailButton('https://ohwpstudios.org/admin/bookings', 'Open bookings admin')}`,
      ),
    });
  } catch (e) {
    Sentry.captureException(e); // no-op when DSN unset
  }

  return json({ success: true, message: 'Booking confirmed! Check your email for the calendar invite.' }, 200);
};
