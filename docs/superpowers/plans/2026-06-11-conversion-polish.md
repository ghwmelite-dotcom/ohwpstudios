# Conversion + Polish Pass Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Fix the broken booking funnel (404 API → D1 + emails + .ics), add estimator follow-up email, rework the hero to a focused funnel, reorder the homepage into a conversion ladder, and ship a testimonial collection flow.

**Architecture:** All email sending goes through one new helper (`src/lib/email.ts`, Resend SDK, branded shell) and one pure `.ics` builder (`src/lib/ics.ts`). New API routes live in `src/pages/api/` (the only location that deploys — `functions/` is dead). Homepage changes are two new merge components (`ProofBand`, `BuiltInTheOpen`) plus edits to `HeroWorld` and `index.astro`. Data: one additive migration (046) creating `bookings` + `testimonial_invites`; CI applies it on merge.

**Tech Stack:** Astro 4 hybrid on Cloudflare Pages, D1 (`locals.runtime.env.DB`), Resend SDK (`locals.runtime.env.RESEND_API_KEY`, verified sender `noreply@ohwpstudios.org`), existing design system (`.btn`, `.btn-primary`, `.card`, CSS custom properties), GA4 via `window.ohwpTrack`.

**Spec:** `docs/superpowers/specs/2026-06-11-conversion-polish-design.md`

**Testing note:** No test framework in repo (by design). Per-task verification = `npm run build` + targeted dev-server/`wrangler` checks; full end-to-end (emails, .ics) on a PR preview deploy in the final task before merge.

**Key existing facts (verified):**
- Resend pattern: `new Resend(locals.runtime?.env?.RESEND_API_KEY)` — see `src/pages/api/contact/submit.ts:172-207`.
- Booking form fields: `name,email,phone,date,time,message`; payload = `JSON.stringify(Object.fromEntries(formData))` to `/api/booking`; time slots `09:00,10:00,11:00,13:00,14:00,15:00,16:00` (`src/pages/booking.astro:86-166,388-391`).
- Estimator API: `src/pages/api/estimate-project.ts` — `share_token = crypto.randomUUID().replace(/-/g,'').slice(0,12)` (line 41), D1 INSERT lines 74-100, response built lines 104-112. `/proposal/[token].astro` exists.
- Highest migration: `045_proposal_share_tokens.sql` → new file is `046_…`.
- Homepage render order: `index.astro:44-54` (HeroWorld, Services, PortfolioHomepage, GitHubProjects, OpenBuildTeaser, Statistics, ClientLogos, Testimonials, AIEstimatorCTA, HomeFAQ, Contact).
- Brand rule (hard): every email footer must include "Powered by Hodges & Co."
- Currency rule: prices shown "GH₵X ($Y)" GHS-primary.
- 9 GA4 events live (do not break): chat_opened, booking_submitted, estimator_started/step/completed, grader_run, quiz_completed, newsletter_signup, contact_submitted.

---

### Task 1: Migration 046 — bookings + testimonial_invites

**Files:**
- Create: `migrations/046_bookings_and_testimonial_invites.sql`

- [ ] **Step 1: Create the migration file**

```sql
-- Bookings: consultation requests from /booking (previously lost — API 404'd)
CREATE TABLE IF NOT EXISTS bookings (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  email TEXT NOT NULL,
  phone TEXT,
  preferred_date TEXT NOT NULL,
  preferred_time TEXT NOT NULL,
  message TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'new',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS idx_bookings_status ON bookings(status);
CREATE INDEX IF NOT EXISTS idx_bookings_date ON bookings(preferred_date);

-- Single-use invite tokens for the testimonial collection flow
CREATE TABLE IF NOT EXISTS testimonial_invites (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  token TEXT NOT NULL UNIQUE,
  client_name TEXT NOT NULL,
  email TEXT NOT NULL,
  used INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

- [ ] **Step 2: Validate SQL syntax against a scratch local DB**

Do NOT run `wrangler d1 migrations apply agency-db` locally (known pre-existing failure at migration 007). Instead validate just this file:

```powershell
npx wrangler d1 execute agency-db --local --file migrations/046_bookings_and_testimonial_invites.sql
npx wrangler d1 execute agency-db --local --command "SELECT name FROM sqlite_master WHERE name IN ('bookings','testimonial_invites');"
```

Expected: both table names returned. (This runs against the throwaway local SQLite; remote application happens via CI on merge.)

- [ ] **Step 3: Commit**

```powershell
git add migrations/046_bookings_and_testimonial_invites.sql
git commit -m "feat(db): bookings and testimonial_invites tables"
```

---

### Task 2: Email helper + .ics builder

**Files:**
- Create: `src/lib/email.ts`
- Create: `src/lib/ics.ts`

- [ ] **Step 1: Create `src/lib/ics.ts`**

```ts
/**
 * Pure .ics (iCalendar) builder for the 45-minute consultation event.
 * Ghana is UTC+0 year-round, so the selected local slot IS the UTC time.
 */
export function buildConsultIcs(opts: {
  attendeeName: string;
  attendeeEmail: string;
  dateISO: string; // YYYY-MM-DD
  timeHHMM: string; // HH:MM (24h)
}): string {
  const [h, m] = opts.timeHHMM.split(':').map(Number);
  const start = `${opts.dateISO.replace(/-/g, '')}T${String(h).padStart(2, '0')}${String(m).padStart(2, '0')}00Z`;
  const endMinutes = h * 60 + m + 45;
  const end = `${opts.dateISO.replace(/-/g, '')}T${String(Math.floor(endMinutes / 60)).padStart(2, '0')}${String(endMinutes % 60).padStart(2, '0')}00Z`;
  const stamp = `${opts.dateISO.replace(/-/g, '')}T000000Z`;
  const uid = `booking-${opts.dateISO}-${opts.timeHHMM.replace(':', '')}-${opts.attendeeEmail}`;
  // iCalendar requires CRLF line endings (RFC 5545 §3.1)
  return [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//OhWP Studios//Booking//EN',
    'METHOD:REQUEST',
    'BEGIN:VEVENT',
    `UID:${uid}`,
    `DTSTAMP:${stamp}`,
    `DTSTART:${start}`,
    `DTEND:${end}`,
    'SUMMARY:OhWP Studios — Free Consultation',
    'DESCRIPTION:Your free project consultation with OhWP Studios. We will call or send a meeting link before the session.',
    `ORGANIZER;CN=OhWP Studios:mailto:noreply@ohwpstudios.org`,
    `ATTENDEE;CN=${opts.attendeeName};RSVP=TRUE:mailto:${opts.attendeeEmail}`,
    'STATUS:CONFIRMED',
    'END:VEVENT',
    'END:VCALENDAR',
  ].join('\r\n');
}
```

- [ ] **Step 2: Create `src/lib/email.ts`**

```ts
import { Resend } from 'resend';

const FROM = 'OhWP Studios <noreply@ohwpstudios.org>';
export const ADMIN_EMAIL = 'ohwpstudios@gmail.com';

interface SendOpts {
  to: string;
  subject: string;
  html: string;
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
    <div style="background:linear-gradient(90deg,#6366f1,#ec4899);border-radius:12px 12px 0 0;padding:20px 28px;">
      <span style="color:#ffffff;font-size:18px;font-weight:800;letter-spacing:.3px;">OhWP Studios</span>
    </div>
    <div style="background:#ffffff;border-radius:0 0 12px 12px;padding:28px;color:#111827;font-size:15px;line-height:1.6;">
      <h1 style="font-size:20px;margin:0 0 16px;">${title}</h1>
      ${bodyHtml}
    </div>
    <p style="text-align:center;color:#9ca3af;font-size:12px;margin-top:16px;">
      OhWP Studios — Powered by Hodges &amp; Co.<br>
      <a href="https://ohwpstudios.org" style="color:#6366f1;">ohwpstudios.org</a>
    </p>
  </div>
</body></html>`;
}

/** Big-button CTA used inside email bodies. */
export function emailButton(href: string, label: string): string {
  return `<p style="text-align:center;margin:24px 0;"><a href="${href}" style="background:linear-gradient(90deg,#6366f1,#ec4899);color:#ffffff;text-decoration:none;font-weight:700;padding:13px 28px;border-radius:9999px;display:inline-block;">${label}</a></p>`;
}
```

Note: Resend attachments `content` accepts a base64 string. Callers base64-encode (`btoa`) the `.ics` text.

- [ ] **Step 3: Verify build**

Run: `npm run build` → exit 0 (the libs compile; nothing imports them yet).

- [ ] **Step 4: Commit**

```powershell
git add src/lib/email.ts src/lib/ics.ts
git commit -m "feat(email): shared Resend helper, branded shell, .ics builder"
```

---

### Task 3: `/api/booking` — the black-hole fix

**Files:**
- Create: `src/pages/api/booking.ts`
- Delete: `functions/api/booking.ts` (dead code — `functions/` is ignored because the Astro adapter ships `_worker.js`)

- [ ] **Step 1: Create `src/pages/api/booking.ts`**

```ts
import type { APIRoute } from 'astro';
import * as Sentry from '@sentry/cloudflare';
import { sendEmail, emailShell, emailButton, ADMIN_EMAIL } from '../../lib/email';
import { buildConsultIcs } from '../../lib/ics';

export const prerender = false;

const VALID_SLOTS = ['09:00', '10:00', '11:00', '13:00', '14:00', '15:00', '16:00'];
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

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
  if (new Date(`${date}T${time}:00Z`).getTime() <= Date.now()) {
    return json({ success: false, error: 'Please pick a date and time in the future.' }, 400);
  }

  const env = (locals as App.Locals).runtime?.env;
  const db = env?.DB;
  if (!db) return json({ success: false, error: 'Service temporarily unavailable.' }, 500);

  // 1. Persist FIRST — the lead must never be lost again.
  await db
    .prepare(
      'INSERT INTO bookings (name, email, phone, preferred_date, preferred_time, message) VALUES (?, ?, ?, ?, ?, ?)'
    )
    .bind(name.trim(), email.trim(), phone?.trim() || null, date, time, message.trim())
    .run();

  // 2. Emails — failures are reported, never fatal (booking is already saved).
  try {
    const ics = buildConsultIcs({ attendeeName: name, attendeeEmail: email, dateISO: date, timeHHMM: time });
    await sendEmail(env, {
      to: email,
      subject: 'Your consultation with OhWP Studios is booked',
      html: emailShell(
        'You’re booked!',
        `<p>Hi ${name.split(' ')[0]},</p>
         <p>Your free consultation is scheduled for <strong>${date} at ${time} (GMT)</strong>. The calendar invite is attached — add it with one click.</p>
         <p>We’ll reach out before the session with a meeting link. Want us to come prepared? Reply to this email with anything you’d like us to look at first.</p>
         ${emailButton('https://ohwpstudios.org/estimate-project?utm_source=booking_email&utm_medium=email', 'Scope your project with AI meanwhile')}`,
      ),
      attachments: [{ filename: 'consultation.ics', content: btoa(ics), contentType: 'text/calendar' }],
    });
    await sendEmail(env, {
      to: ADMIN_EMAIL,
      subject: `New booking: ${name} — ${date} ${time}`,
      html: emailShell(
        'New consultation booking',
        `<p><strong>${name}</strong> (${email}${phone ? `, ${phone}` : ''})</p>
         <p><strong>When:</strong> ${date} at ${time} GMT</p>
         <p><strong>Message:</strong></p><p style="background:#f4f4f7;border-radius:8px;padding:12px;">${message}</p>
         ${emailButton('https://ohwpstudios.org/admin/bookings', 'Open bookings admin')}`,
      ),
    });
  } catch (e) {
    Sentry.captureException(e); // no-op when DSN unset
  }

  return json({ success: true, message: 'Booking confirmed! Check your email for the calendar invite.' }, 200);
};
```

Type note: if `App.Locals` isn't declared with `runtime`, use the same loose access as other routes (`(locals as { runtime?: { env?: Record<string, unknown> & { DB?: D1Database } } }).runtime?.env`) — read `src/pages/api/contact/submit.ts` and match its exact pattern.

- [ ] **Step 2: Delete the dead handler**

```powershell
git rm functions/api/booking.ts
```

If `functions/api/` is then empty and nothing else references `functions/`, leave the rest untouched (other files there may still be referenced by docs — do not delete anything but booking.ts).

- [ ] **Step 3: Verify locally**

`npm run build` → exit 0. Then `npm run dev` and:

```powershell
Invoke-WebRequest -Uri http://localhost:4321/api/booking -Method POST -Body '{}' -ContentType 'application/json' -SkipHttpErrorCheck | Select-Object StatusCode, Content
```

Expected: 400 with `{"success":false,"error":"Please fill in all required fields."}`. Then a valid payload:

```powershell
Invoke-WebRequest -Uri http://localhost:4321/api/booking -Method POST -ContentType 'application/json' -Body '{"name":"Test User","email":"test@example.com","date":"2027-01-15","time":"10:00","message":"Test booking"}' | Select-Object StatusCode, Content
```

Expected: 200 success (email step silently skipped without RESEND_API_KEY locally). Verify the row: `npx wrangler d1 execute agency-db --local --command "SELECT * FROM bookings;"` → 1 row.

- [ ] **Step 4: Commit**

```powershell
git add src/pages/api/booking.ts
git commit -m "feat(booking): real API — D1 persistence, confirmation + admin emails, .ics invite"
```

---

### Task 4: Bookings admin (list + status)

**Files:**
- Create: `src/pages/api/admin/bookings.ts`
- Create: `src/pages/admin/bookings.astro`
- Modify: `src/pages/admin/dashboard.astro:73` (nav item after Contact Submissions)

**Pattern source:** read `src/pages/api/admin/contacts.ts` and `src/pages/admin/contacts.astro` FIRST and mirror their auth/fetch/table structure exactly — including whatever (weak) auth check the API uses. Do not invent a new auth scheme in this task (known Phase 3 item).

- [ ] **Step 1: Create `src/pages/api/admin/bookings.ts`**

```ts
import type { APIRoute } from 'astro';

export const prerender = false;

// GET /api/admin/bookings — list, newest first
export const GET: APIRoute = async ({ locals }) => {
  const db = (locals as App.Locals).runtime?.env?.DB;
  if (!db) return new Response(JSON.stringify({ success: false, error: 'DB unavailable' }), { status: 500 });
  const { results } = await db
    .prepare('SELECT * FROM bookings ORDER BY created_at DESC LIMIT 200')
    .all();
  return new Response(JSON.stringify({ success: true, bookings: results }), {
    headers: { 'Content-Type': 'application/json' },
  });
};

// PATCH /api/admin/bookings — { id, status }
export const PATCH: APIRoute = async ({ request, locals }) => {
  const db = (locals as App.Locals).runtime?.env?.DB;
  if (!db) return new Response(JSON.stringify({ success: false, error: 'DB unavailable' }), { status: 500 });
  const { id, status } = await request.json();
  const allowed = ['new', 'confirmed', 'completed', 'cancelled'];
  if (!Number.isInteger(id) || !allowed.includes(status)) {
    return new Response(JSON.stringify({ success: false, error: 'Invalid id or status' }), { status: 400 });
  }
  await db.prepare('UPDATE bookings SET status = ? WHERE id = ?').bind(status, id).run();
  return new Response(JSON.stringify({ success: true }), { headers: { 'Content-Type': 'application/json' } });
};
```

Adjust the `locals` typing and ADD the same auth guard `src/pages/api/admin/contacts.ts` uses (mirror it exactly, whatever it is — if it has none, add none here and note that in your report).

- [ ] **Step 2: Create `src/pages/admin/bookings.astro`**

Mirror `src/pages/admin/contacts.astro`'s page skeleton (same layout import, same admin-token localStorage gate if present, same table styling classes). Content: a table with columns Name, Email, Phone, Date, Time, Message (truncated, expandable via `title` attr), Status (a `<select>` with the four statuses that PATCHes on change), Created. Client script:

```js
async function load() {
  const res = await fetch('/api/admin/bookings');
  const data = await res.json();
  const tbody = document.getElementById('bookings-body');
  tbody.innerHTML = (data.bookings || [])
    .map(
      (b) => `<tr>
        <td>${b.name}</td><td><a href="mailto:${b.email}">${b.email}</a></td><td>${b.phone ?? ''}</td>
        <td>${b.preferred_date}</td><td>${b.preferred_time}</td>
        <td title="${b.message.replace(/"/g, '&quot;')}">${b.message.slice(0, 60)}${b.message.length > 60 ? '…' : ''}</td>
        <td><select data-id="${b.id}" class="status-select">
          ${['new', 'confirmed', 'completed', 'cancelled'].map((s) => `<option ${s === b.status ? 'selected' : ''}>${s}</option>`).join('')}
        </select></td>
        <td>${(b.created_at || '').slice(0, 16)}</td>
      </tr>`
    )
    .join('');
  tbody.querySelectorAll('.status-select').forEach((sel) =>
    sel.addEventListener('change', () =>
      fetch('/api/admin/bookings', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: Number(sel.dataset.id), status: sel.value }),
      })
    )
  );
}
load();
```

(Escape user-controlled fields the same way contacts.astro does — if it uses textContent-based rendering instead of innerHTML, mirror that; innerHTML with unescaped user data is an XSS hole, so if contacts.astro escapes, follow it; if it doesn't, still escape here: set cell text via textContent in a loop rather than template strings.)

- [ ] **Step 3: Add nav item in `src/pages/admin/dashboard.astro`**

After the Contact Submissions link (~line 73), matching the existing nav-item pattern:

```html
<a href="/admin/bookings" class="nav-item" style="text-decoration: none; color: inherit;">
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
    <rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect>
    <line x1="16" y1="2" x2="16" y2="6"></line><line x1="8" y1="2" x2="8" y2="6"></line>
    <line x1="3" y1="10" x2="21" y2="10"></line>
  </svg>
  <span>Bookings</span>
</a>
```

- [ ] **Step 4: Verify**

`npm run build` → exit 0. Dev server: insert a test row locally (Task 3 Step 3 did), open `http://localhost:4321/admin/bookings` → row renders; change status → `SELECT status FROM bookings` shows the update.

- [ ] **Step 5: Commit**

```powershell
git add src/pages/api/admin/bookings.ts src/pages/admin/bookings.astro src/pages/admin/dashboard.astro
git commit -m "feat(admin): bookings list with status triage"
```

---

### Task 5: Estimator follow-up email

**Files:**
- Modify: `src/pages/api/estimate-project.ts` (after the INSERT around lines 74-100, before the response at ~104)

- [ ] **Step 1: Add the email dispatch**

Imports at top: `import { sendEmail, emailShell, emailButton } from '../../lib/email';`

After the estimate row is saved and `shareToken` + extracted numbers are in scope (read the file; variable names below must be adapted to the REAL local variable names — cost min/max, timeline weeks, team size are extracted near the INSERT):

```ts
// Fire-and-forget follow-up email — must never delay or fail the response.
const runtime = (locals as App.Locals).runtime;
const proposalUrl = `https://ohwpstudios.org/proposal/${shareToken}?utm_source=proposal_email&utm_medium=email&utm_campaign=estimate_followup`;
const followUp = async () => {
  try {
    await sendEmail(runtime?.env ?? {}, {
      to: email,
      subject: 'Your AI-scoped project proposal is ready',
      html: emailShell(
        'Your proposal is ready',
        `<p>Hi ${name.split(' ')[0]},</p>
         <p>Here’s the summary of your scoped project:</p>
         <ul>
           <li><strong>Estimated cost:</strong> GH₵${costMin.toLocaleString()} – GH₵${costMax.toLocaleString()} ($${Math.round(costMin / 12).toLocaleString()} – $${Math.round(costMax / 12).toLocaleString()})</li>
           <li><strong>Timeline:</strong> ~${timelineWeeks} weeks</li>
           <li><strong>Team:</strong> ${teamSize} people</li>
         </ul>
         ${emailButton(proposalUrl, 'View your full proposal')}
         <p style="text-align:center;font-size:13px;">Ready to move? <a href="https://ohwpstudios.org/booking?utm_source=proposal_email" style="color:#6366f1;">Book a free consult</a>.</p>`,
      ),
    });
  } catch (e) {
    console.error('estimate follow-up email failed:', e);
  }
};
if (runtime?.ctx?.waitUntil) runtime.ctx.waitUntil(followUp());
else await followUp();
```

IMPORTANT adaptations while reading the file: (a) use the route's actual variable names for name/email/cost/timeline/team (they exist near the INSERT bind), (b) if cost values can be null/undefined in the AI extraction, guard: only render the `<li>` lines for values that exist, with a fallback paragraph "Open your proposal for the full breakdown." — the email must never render "GH₵undefined". (c) GHS→USD divide-by-12 matches the site-wide currency standard.

- [ ] **Step 2: Verify**

`npm run build` → exit 0. Dev: run a real estimate through `http://localhost:4321/estimate-project` (needs ANTHROPIC_API_KEY in `.dev.vars` — if absent, verify by code review that the email block sits after persistence and inside waitUntil, and state that in your report).

- [ ] **Step 3: Commit**

```powershell
git add src/pages/api/estimate-project.ts
git commit -m "feat(estimator): follow-up email with proposal link and consult CTA"
```

---

### Task 6: Smoke test — booking route guard

**Files:**
- Modify: `scripts/smoke-test.mjs`

- [ ] **Step 1: Extend the check shape**

The checks array (lines 8-12) gains method/body/expectStatus support. Update the array and loop:

```js
const checks = [
  { path: '/', mustContain: 'OhWP' },
  { path: '/estimate-project', mustContain: 'estimate' },
  { path: '/api/page-init', contentType: 'application/json' }, // exercises a Pages Function + D1
  // Guards against the functions/-directory regression class: route must exist and validate.
  { path: '/api/booking', method: 'POST', body: '{}', expectStatus: 400, contentType: 'application/json' },
];
```

In the loop, build fetch options and compare against `expectStatus` (default 200):

```js
const res = await fetchWithRetry(url, {
  redirect: 'follow',
  signal: AbortSignal.timeout(10_000),
  method: check.method || 'GET',
  headers: check.body ? { 'Content-Type': 'application/json' } : undefined,
  body: check.body,
});
const wantStatus = check.expectStatus ?? 200;
if (res.status !== wantStatus) {
  console.error(`FAIL ${url} — status ${res.status} (expected ${wantStatus})`);
  failed++;
  continue;
}
```

(Replace the existing `res.status !== 200` block; everything else unchanged.)

- [ ] **Step 2: Verify against production — EXPECT THE NEW CHECK TO FAIL (route not deployed yet)**

`node scripts/smoke-test.mjs https://ohwpstudios.org` → the three old checks OK, `/api/booking` FAILS with 404 vs expected 400. That failure is CORRECT right now — it proves the check detects the live bug. Note it in your report; the final task verifies it goes green on the preview/production after deploy.

Also confirm old behavior intact: `node scripts/smoke-test.mjs https://example.com` → exit 1.

- [ ] **Step 3: Commit**

```powershell
git add scripts/smoke-test.mjs
git commit -m "feat(ci): smoke-test booking route existence + validation"
```

---

### Task 7: Hero rework — focused funnel

**Files:**
- Modify: `src/components/HeroWorld.astro` (headline lines ~48-51, CTAs ~60-74, stats ~77-92)

- [ ] **Step 1: Rework headline + subtitle**

Replace the current headline/subtitle block (keep surrounding structure/classes/animations):

```astro
<h1 class="hero-title">
  Your next project,
  <span class="text-gradient animate-gradient">scoped by AI in 2 minutes</span>
</h1>
<p class="hero-subtitle">
  Tell us what you're building. Get a realistic cost range, timeline, and team plan —
  free, before you talk to anyone.
</p>
```

- [ ] **Step 2: Rework CTAs — one dominant action**

Replace the two-button block with:

```astro
<div class="hero-cta">
  <a href="/estimate-project" class="btn btn-primary hero-btn-primary">
    Scope My Project — Free
  </a>
  <a href="#portfolio" class="hero-link-secondary">or view our work →</a>
</div>
```

And in the component's `<style>`, add (using existing tokens):

```css
.hero-cta { display: flex; align-items: center; gap: var(--space-md, 1.5rem); flex-wrap: wrap; }
.hero-link-secondary {
  color: var(--color-text-muted);
  text-decoration: underline;
  text-underline-offset: 4px;
  font-size: 0.95rem;
  min-height: 44px;
  display: inline-flex;
  align-items: center;
  transition: color var(--transition-fast);
}
.hero-link-secondary:hover { color: var(--color-text); }
@media (max-width: 640px) {
  .hero-cta { flex-direction: column; align-items: stretch; text-align: center; }
  .hero-cta .btn { width: 100%; }
  .hero-link-secondary { justify-content: center; }
}
```

Remove the now-unused secondary-button styles if they're local to this component (check before deleting; if shared classes, leave them).

- [ ] **Step 3: Stats → honest proof row**

Replace the three stat counters with real numbers only (drop "400+ Clients" — unsubstantiated):

```astro
<div class="hero-proof" aria-label="Track record">
  <span>10+ years building</span>
  <span aria-hidden="true">·</span>
  <span>14+ shipped projects</span>
  <span aria-hidden="true">·</span>
  <span>100% fullstack, end to end</span>
</div>
```

```css
.hero-proof {
  display: flex; gap: 0.6rem; flex-wrap: wrap; align-items: center;
  color: var(--color-text-muted); font-size: 0.875rem; margin-top: var(--space-lg, 2rem);
}
@media (max-width: 640px) { .hero-proof { justify-content: center; font-size: 0.8rem; } }
```

Keep (don't touch): the badge, the code-editor mockup panel, floating elements, all animations. If the old stats block used `data-counter` JS, remove only the markup; leave shared counter scripts alone (Statistics elsewhere may use them — checked in Task 8).

- [ ] **Step 4: Verify**

`npm run build` → exit 0. Dev server at 360px and 1280px widths: one dominant CTA, text link beside/below it, proof row single-line on desktop / centered wrap on mobile. Focus states visible on both links (tab through).

- [ ] **Step 5: Commit**

```powershell
git add src/components/HeroWorld.astro
git commit -m "feat(hero): focused-funnel hierarchy — one CTA, estimator-led headline, honest proof row"
```

---

### Task 8: ProofBand component (Statistics + ClientLogos merge)

**Files:**
- Create: `src/components/ProofBand.astro`
- Reference (do not delete yet): `src/components/Statistics.astro`, `src/components/ClientLogos.astro`

- [ ] **Step 1: Create `src/components/ProofBand.astro`**

Structure (port the logo carousel internals — markup + scoped CSS + logo assets list — from `ClientLogos.astro` lines ~14-67 into the band; read that file and lift faithfully):

```astro
---
// Compact proof band: one stat row (real numbers only) + client logo strip.
// Replaces the separate Statistics and ClientLogos sections.
const db = Astro.locals.runtime?.env?.DB;
let projectCount = 14; // honest fallback — current published count
try {
  if (db) {
    const row = await db
      .prepare('SELECT COUNT(*) AS n FROM portfolio_projects WHERE is_published = 1')
      .first();
    if (row?.n) projectCount = Number(row.n);
  }
} catch { /* keep fallback */ }
---
<section class="proof-band" aria-label="Track record and clients">
  <div class="container">
    <div class="proof-stats">
      <div class="proof-stat"><strong>10+</strong><span>years experience</span></div>
      <div class="proof-stat"><strong>{projectCount}+</strong><span>projects shipped</span></div>
      <div class="proof-stat"><strong>100%</strong><span>fullstack, end to end</span></div>
      <div class="proof-stat"><strong>2014</strong><span>building since</span></div>
    </div>
    <!-- logo carousel ported from ClientLogos.astro goes here -->
  </div>
</section>
<style>
  .proof-band { padding: var(--space-2xl, 4rem) 0; background: var(--color-bg-alt, #f9fafb); }
  .proof-stats {
    display: grid; grid-template-columns: repeat(auto-fit, minmax(140px, 1fr));
    gap: var(--space-lg, 2rem); margin-bottom: var(--space-xl, 3rem); text-align: center;
  }
  .proof-stat strong {
    display: block; font-size: 2rem; font-weight: 800;
    background: var(--gradient-primary, linear-gradient(90deg, #6366f1, #ec4899));
    -webkit-background-clip: text; background-clip: text; color: transparent;
  }
  .proof-stat span { color: var(--color-text-muted); font-size: 0.875rem; }
</style>
```

Use the real token names from `design-system.css` (verify `--gradient-primary`, `--color-bg-alt` exist; substitute actual names if different). Numbers: NO "400+ clients", NO "1000+ cups of coffee" — the four shown above only. Port the carousel's `prefers-reduced-motion` handling if ClientLogos has one; add `@media (prefers-reduced-motion: reduce) { /* pause the scroll animation */ }` if it doesn't.

- [ ] **Step 2: Verify standalone**

`npm run build` → exit 0 (component not yet rendered anywhere — that's Task 10).

- [ ] **Step 3: Commit**

```powershell
git add src/components/ProofBand.astro
git commit -m "feat(home): ProofBand — merged honest stats + client logos"
```

---

### Task 9: BuiltInTheOpen component (GitHubProjects + OpenBuildTeaser merge)

**Files:**
- Create: `src/components/BuiltInTheOpen.astro`
- Modify: `src/components/GitHubProjects.astro` (header becomes optional via prop)

- [ ] **Step 1: Make GitHubProjects' header optional**

In `src/components/GitHubProjects.astro` frontmatter add:

```ts
const { showHeader = true } = Astro.props;
```

Wrap its existing badge+title header block (lines ~35-44) in `{showHeader && ( ... )}`. NOTHING else changes — the live GitHub fetch logic is untouched (deliberate brand asset).

- [ ] **Step 2: Create `src/components/BuiltInTheOpen.astro`**

```astro
---
import GitHubProjects from './GitHubProjects.astro';
import OpenBuildTeaser from './OpenBuildTeaser.astro';
---
<section class="built-open" id="open-build">
  <div class="container">
    <div class="built-open-header">
      <span class="built-open-badge">Built in the open</span>
      <h2>Real code. Live builds. Nothing to hide.</h2>
      <p>Watch what we ship — from open-source repos to live public builds.</p>
    </div>
  </div>
  <GitHubProjects showHeader={false} />
  <OpenBuildTeaser />
</section>
<style>
  .built-open { padding-top: var(--space-2xl, 4rem); }
  .built-open-header { text-align: center; max-width: 640px; margin: 0 auto var(--space-xl, 3rem); }
  .built-open-badge {
    display: inline-block; font-size: 0.75rem; font-weight: 700; letter-spacing: 1px;
    text-transform: uppercase; color: var(--color-primary, #6366f1);
    border: 1px solid currentColor; border-radius: 9999px; padding: 4px 14px; margin-bottom: var(--space-md, 1.5rem);
  }
  .built-open-header h2 { font-size: clamp(1.6rem, 3.5vw, 2.2rem); margin: 0 0 0.5rem; }
  .built-open-header p { color: var(--color-text-muted); margin: 0; }
</style>
```

Match heading/badge styling conventions to neighboring sections (read Services.astro's header markup; reuse its classes instead of new ones if a shared pattern exists).

- [ ] **Step 3: Verify + commit**

`npm run build` → exit 0.

```powershell
git add src/components/BuiltInTheOpen.astro src/components/GitHubProjects.astro
git commit -m "feat(home): BuiltInTheOpen — merged GitHub strip + Open Build under one header"
```

---

### Task 10: Homepage conversion-ladder reorder

**Files:**
- Modify: `src/pages/index.astro` (imports lines ~1-18, render order lines ~44-54)

- [ ] **Step 1: Reorder**

New imports: add `ProofBand`, `BuiltInTheOpen`; remove `Statistics`, `ClientLogos`, `GitHubProjects`, `OpenBuildTeaser` imports (the latter two are now internal to BuiltInTheOpen). New render order:

```astro
<HeroWorld />
<Services />
<PortfolioHomepage />
<Testimonials />
<ProofBand />
<AIEstimatorCTA />
<BuiltInTheOpen />
<HomeFAQ />
<Contact />
```

- [ ] **Step 2: Integrity checks**

1. LCP preload (lines ~21-41) untouched and PortfolioHomepage still above the fold-ish — first portfolio image stays `loading="eager"`.
2. The hero's "or view our work →" anchor targets `#portfolio` — confirm PortfolioHomepage's section id is `portfolio` (add the id if the reorder lost it).
3. Grep the page + removed components for `data-counter` scripts: if Statistics.astro owned a counter script used by the hero, hero no longer uses counters (Task 7), so removal is safe — verify nothing else references it.
4. Old component files `Statistics.astro` / `ClientLogos.astro`: grep for other usages (`Grep: Statistics|ClientLogos in src/`); if homepage was the only consumer, `git rm` both. GitHubProjects/OpenBuildTeaser STAY (used by BuiltInTheOpen).

- [ ] **Step 3: Verify**

`npm run build` → exit 0. Dev server: scroll the page — 9 sections in ladder order, no double headers in Built-in-the-Open, anchors work (`/#portfolio` from hero link, `#open-build` if nav references it — grep Header.astro for `#` links to renamed/moved sections and fix any).

- [ ] **Step 4: Commit**

```powershell
git add src/pages/index.astro
git rm src/components/Statistics.astro src/components/ClientLogos.astro
git commit -m "feat(home): conversion-ladder order — proof stack before the ask, community below"
```

(Adjust the `git rm` per Step 2.4 findings.)

---

### Task 11: Testimonials honesty pass

**Files:**
- Modify: `src/components/Testimonials.astro` (fallback array lines ~19-75, trust row lines ~154-167)

- [ ] **Step 1: Remove the hardcoded fallback**

Delete the fallback array. New behavior: fetch from `/api/testimonials`; on error or empty list, render nothing (`{testimonials.length > 0 && ( <section…> )}`). A hidden failure should hide the section, not show fake data over a real outage.

- [ ] **Step 2: Dynamic, substantiated trust row**

Replace the hardcoded "4.9/5 · 400+ Happy Clients · 99% Would Recommend" with values computed from the fetched rows:

```astro
---
const avg = testimonials.length
  ? (testimonials.reduce((s, t) => s + (t.rating || 5), 0) / testimonials.length).toFixed(1)
  : null;
---
{avg && (
  <div class="trust-row">
    <span>★ {avg}/5 average rating</span>
    <span aria-hidden="true">·</span>
    <span>{testimonials.length} client reviews</span>
  </div>
)}
```

(Reuse the existing trust-row styling classes; only the content and data source change.)

- [ ] **Step 3: Verify + commit**

`npm run build` → exit 0. Dev: section renders with API data; temporarily break the fetch URL → section disappears entirely (restore).

```powershell
git add src/components/Testimonials.astro
git commit -m "fix(testimonials): drop fake fallback + unsubstantiated trust claims; compute from real data"
```

---

### Task 12: Testimonial collection flow

**Files:**
- Create: `src/pages/api/admin/testimonial-invites.ts`
- Create: `src/pages/testimonial/[token].astro`
- Create: `src/pages/api/testimonial/submit.ts`
- Create: `src/pages/admin/testimonials.astro`
- Create: `src/pages/api/admin/testimonials.ts`
- Modify: `src/pages/admin/dashboard.astro` (nav item, after Bookings from Task 4)

- [ ] **Step 1: Invite API — `src/pages/api/admin/testimonial-invites.ts`**

```ts
import type { APIRoute } from 'astro';
import * as Sentry from '@sentry/cloudflare';
import { sendEmail, emailShell, emailButton } from '../../../lib/email';

export const prerender = false;

// POST { client_name, email } → creates single-use invite, emails the link, returns it
export const POST: APIRoute = async ({ request, locals }) => {
  const json = (body: object, status: number) =>
    new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } });
  const env = (locals as App.Locals).runtime?.env;
  const db = env?.DB;
  if (!db) return json({ success: false, error: 'DB unavailable' }, 500);

  const { client_name, email } = await request.json();
  if (!client_name?.trim() || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email ?? '')) {
    return json({ success: false, error: 'Name and valid email required' }, 400);
  }

  const token = crypto.randomUUID().replace(/-/g, '').slice(0, 16);
  await db
    .prepare('INSERT INTO testimonial_invites (token, client_name, email) VALUES (?, ?, ?)')
    .bind(token, client_name.trim(), email.trim())
    .run();

  const link = `https://ohwpstudios.org/testimonial/${token}`;
  try {
    await sendEmail(env, {
      to: email,
      subject: `${client_name.split(' ')[0]}, would you share a quick word about working with us?`,
      html: emailShell(
        'Two minutes, huge favor',
        `<p>Hi ${client_name.split(' ')[0]},</p>
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
```

(Same auth-mirroring rule as Task 4: match whatever guard `api/admin/contacts.ts` uses.)

- [ ] **Step 2: Submission page — `src/pages/testimonial/[token].astro`**

`prerender = false`. Frontmatter: look up `SELECT * FROM testimonial_invites WHERE token = ? AND used = 0`; if no row → render the friendly expired state (IDENTICAL response for unknown vs used token — no enumeration): "This link has expired or was already used. If you meant to leave a testimonial, just reply to our email." Otherwise render a form (site design system: `.card`, `.btn .btn-primary`, base-8 spacing, labels above inputs, 44px touch targets): name (prefilled with `client_name`, editable), role, company, quote (`<textarea>`, required, maxlength 600 with counter), star rating (5 radio buttons styled as stars, default 5, keyboard accessible — real `<input type="radio">` elements in a `fieldset` with visible `:focus-visible`), photo URL (optional, type="url"). Submit via fetch to `/api/testimonial/submit` with `{ token, name, role, company, content, rating, avatar_url }`; on success replace the form with a thank-you state and fire `window.ohwpTrack?.('testimonial_submitted')`.

- [ ] **Step 3: Submission API — `src/pages/api/testimonial/submit.ts`**

```ts
import type { APIRoute } from 'astro';

export const prerender = false;

export const POST: APIRoute = async ({ request, locals }) => {
  const json = (body: object, status: number) =>
    new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } });
  const db = (locals as App.Locals).runtime?.env?.DB;
  if (!db) return json({ success: false, error: 'Service unavailable' }, 500);

  const { token, name, role, company, content, rating, avatar_url } = await request.json();
  if (!token || !name?.trim() || !content?.trim()) {
    return json({ success: false, error: 'Name and testimonial are required.' }, 400);
  }
  const stars = Math.min(5, Math.max(1, Number(rating) || 5));

  const invite = await db
    .prepare('SELECT id FROM testimonial_invites WHERE token = ? AND used = 0')
    .bind(token)
    .first();
  if (!invite) return json({ success: false, error: 'This link has expired.' }, 410);

  const initials = name
    .trim()
    .split(/\s+/)
    .map((p: string) => p[0])
    .join('')
    .slice(0, 2)
    .toUpperCase();

  // Pending review: is_active = 0 until activated in admin
  await db
    .prepare(
      `INSERT INTO testimonials (name, role, company, content, rating, avatar_url, avatar_initials, avatar_gradient, is_active)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, 0)`
    )
    .bind(
      name.trim(),
      role?.trim() || '',
      company?.trim() || '',
      content.trim().slice(0, 600),
      stars,
      avatar_url?.trim() || null,
      initials,
      'linear-gradient(135deg, #6366f1, #ec4899)'
    )
    .run();
  await db.prepare('UPDATE testimonial_invites SET used = 1 WHERE id = ?').bind(invite.id).run();

  return json({ success: true }, 200);
};
```

- [ ] **Step 4: Admin testimonials — `src/pages/api/admin/testimonials.ts` + `src/pages/admin/testimonials.astro` + nav item**

API: GET → `SELECT * FROM testimonials ORDER BY is_active ASC, created_at DESC` as `{ success, testimonials }`; PATCH `{ id, is_active }` (0|1) → UPDATE. Same shape/auth as Task 4's bookings API.

Page (mirror bookings.astro structure): table of testimonials — Name, Company, Quote (truncated), Rating, Status badge (Pending/Live), Activate/Deactivate toggle button (PATCH). Above the table, an "Invite a client" card: two inputs (client name, email) + button POSTing to `/api/admin/testimonial-invites`; on success show the returned link in a copyable input with an "emailed ✓ / email failed — send the link manually" note based on `emailed`.

Nav item in dashboard.astro after Bookings: same pattern, label "Testimonials", a quote-mark or star SVG icon.

- [ ] **Step 5: Verify end-to-end locally**

`npm run build` → exit 0. Dev:
1. POST an invite via the admin page (email silently skipped locally) → link shown.
2. Open the link → form renders prefilled.
3. Submit → success state; `SELECT * FROM testimonials WHERE is_active = 0` (local) shows the row; invite `used = 1`.
4. Re-open the same link → expired state.
5. Activate in admin → row's `is_active = 1`; homepage testimonials section now includes it (local DB).

- [ ] **Step 6: Commit**

```powershell
git add src/pages/api/admin/testimonial-invites.ts src/pages/testimonial src/pages/api/testimonial src/pages/admin/testimonials.astro src/pages/api/admin/testimonials.ts src/pages/admin/dashboard.astro
git commit -m "feat(testimonials): single-use invite flow, submission page, admin review"
```

---

### Task 13: Portfolio curation + card polish

**Files:**
- Modify: `src/components/PortfolioHomepage.astro`
- Remote D1 data updates (no migration — content operation)

- [ ] **Step 1: Card polish in `PortfolioHomepage.astro`**

1. Bump the fetch limit from 2 to 4 (`?status=published&limit=4`); first 2 keep `loading="eager"`/`fetchpriority="high"`, items 3-4 get `lazy`/`auto` (the `isAboveFold` logic already does this — verify the index cutoff is 2).
2. Image consistency: add to the image styles `aspect-ratio: 16 / 10; object-fit: cover; width: 100%;` so cards align regardless of source dimensions.
3. Metric chips: already rendered when present (lines ~94-121) — no change.
4. Hover: confirm the existing lift (`translateY(-8px)`) respects `prefers-reduced-motion`; if not wrapped, add:

```css
@media (prefers-reduced-motion: reduce) {
  .portfolio-item, .portfolio-image { transition: none; }
  .portfolio-item:hover { transform: none; }
  .portfolio-image:hover { transform: none; }
}
```

- [ ] **Step 2: Curate remote data — completeness-first ordering**

Inspect which projects are best documented:

```powershell
$env:CLOUDFLARE_ACCOUNT_ID="ea2eb3a9813660dfca2a60e594858538"
npx wrangler d1 execute agency-db --remote --command "SELECT id, title, (CASE WHEN challenge IS NOT NULL AND challenge != '' THEN 1 ELSE 0 END) + (CASE WHEN solution IS NOT NULL AND solution != '' THEN 1 ELSE 0 END) + (CASE WHEN results IS NOT NULL AND results != '' THEN 1 ELSE 0 END) + (CASE WHEN metric_1_value IS NOT NULL AND metric_1_value != '' THEN 1 ELSE 0 END) + (CASE WHEN featured_image IS NOT NULL AND featured_image != '' THEN 1 ELSE 0 END) AS completeness FROM portfolio_projects WHERE is_published = 1 ORDER BY completeness DESC, created_at DESC;"
```

Then set `display_order` ascending by that ranking (most complete = 1) and `is_featured = 1` for the top 4:

```powershell
npx wrangler d1 execute agency-db --remote --command "UPDATE portfolio_projects SET display_order = <rank>, is_featured = CASE WHEN <rank> <= 4 THEN 1 ELSE 0 END WHERE id = <id>;"
```

(One UPDATE per project, ranks from the SELECT. This is reversible content curation, not schema — the user re-curates in admin anytime.)

- [ ] **Step 3: Verify + commit**

`npm run build` → exit 0. Dev homepage: 4 aligned cards, best-documented first (local DB may differ from remote — the ordering query result in your report is the verification for remote).

```powershell
git add src/components/PortfolioHomepage.astro
git commit -m "feat(portfolio): 4 curated cards, consistent aspect, reduced-motion safe"
```

---

### Task 14: Preview deploy — end-to-end verification (MANUAL gate before merge)

**Files:** none (process)

- [ ] **Step 1: Open the PR**

Push the branch; `preview.yml` comments a `*.pages.dev` URL. NOTE: preview functions share the PRODUCTION D1 — migration 046 is NOT applied there yet (CI only migrates on main). So on the preview, `/api/booking` will 500 at the INSERT (table missing). Verify everything EXCEPT the live booking insert on preview; the booking insert path was verified locally (Task 3) and the migration applies on merge.

- [ ] **Step 2: Preview checks**

1. Homepage: ladder order, hero hierarchy, proof band numbers, Built-in-the-Open renders the live GitHub strip, mobile pass at 360px.
2. All 9 GA4 events still wired: accept consent on the preview URL, open estimator → `estimator_started` in `window.dataLayer`.
3. Estimator: full run → results + (with vars present on preview build) follow-up email arrives at a test inbox; proposal link works with UTM params.
4. Testimonial flow: create invite (admin), submit, expired-state on reuse, admin activate. (Uses prod D1 — use obviously-fake test data and deactivate/delete after.)
5. Lighthouse spot-check on preview homepage: LCP not regressed vs production.

- [ ] **Step 3: Merge gate**

Merge to main → CI applies migration 046 → deploy → smoke test must pass INCLUDING the new `/api/booking` 400 check. Then production checks:

1. Real booking end-to-end: submit on ohwpstudios.org → both emails arrive (client one has working `.ics` that opens in Google Calendar/Outlook), row in `/admin/bookings`.
2. `node scripts/smoke-test.mjs https://ohwpstudios.org` → all green.
3. Delete the test booking row / set status cancelled.

---

## Done means

- A booking on ohwpstudios.org lands in D1, the client gets a confirmation with a working `.ics`, the admin gets a notification, and the row is triageable in `/admin/bookings`.
- Estimator completion sends the lead a branded proposal email with UTM-tagged links.
- Homepage runs the 9-section conversion ladder with a single dominant hero CTA and honest numbers everywhere.
- Testimonial invites can be sent from admin; submissions arrive pending review; fake fallback data is gone.
- Smoke test guards `/api/booking` forever; all 9 GA4 events still fire.
