# Phase 2: Conversion + Polish Pass — Design Spec

**Date:** 2026-06-11
**Status:** Approved by user (design conversation, this session)
**Scope:** Booking system rebuild, estimator follow-up email, hero rework, homepage conversion ladder, testimonial collection flow. Builds on Phase 1's measurement layer (`docs/superpowers/specs/2026-06-11-measurement-safety-net-design.md`).

## Context

The Phase 2 audit found the conversion funnel structurally sound but broken at the close: `/api/booking` returns **404 in production** (the handler sits in `functions/api/booking.ts`, a directory Cloudflare Pages ignores because the Astro adapter ships an advanced-mode `_worker.js`). Every booking submission has failed. Secondary findings: estimator proposals are never emailed to leads; the 6 D1 testimonials are seeded placeholders; the homepage asks for the sale at scroll position 9 of 11; the hero splits attention across two equal CTAs.

Facts verified live: `/api/testimonials` works (serves D1 rows); portfolio has 14 published projects in D1; Resend sends successfully from `noreply@ohwpstudios.org` (used by contact, careers, newsletter).

## 1. Booking system rebuild

### API

- Create `src/pages/api/booking.ts` (`prerender = false`, POST only). Delete `functions/api/booking.ts` (dead code that misleads).
- Validation (server-side): name, email, date, time, message required; email regex as used by contact form; date+time must be in the future; time must be one of the form's fixed slots.
- **Order of operations (lead never lost):**
  1. INSERT into new `bookings` table. Failure here → 500, client sees error.
  2. Send client confirmation email (Resend) with `.ics` attachment.
  3. Send admin notification email to ohwpstudios@gmail.com.
  4. Email failures after a successful insert do NOT fail the request: capture to Sentry, return success. Admin follows up manually from the admin list.
- Response shape preserves what `booking.astro`'s existing client script expects (`response.ok` + JSON).

### Schema (new migration, next number in sequence)

```sql
CREATE TABLE IF NOT EXISTS bookings (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  email TEXT NOT NULL,
  phone TEXT,
  preferred_date TEXT NOT NULL,   -- ISO date
  preferred_time TEXT NOT NULL,   -- HH:MM
  message TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'new',  -- new | confirmed | completed | cancelled
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

Migrations are applied by CI (`deploy.yml`) — additive-only, consistent with the pipeline contract.

### Emails

- Sender: `OhWP Studios <noreply@ohwpstudios.org>` (existing verified domain).
- **Client email:** branded confirmation; date/time restated; what happens next; `.ics` attachment (`text/calendar` METHOD:REQUEST, 45-minute event, UTC times derived from the selected slot treated as Africa/Accra (UTC+0), ORGANIZER noreply@, ATTENDEE the client, summary "OhWP Studios — Free Consultation").
- **Admin email:** lead details + message + link to `/admin` for triage.
- Booking page copy already promises a calendar invite — the `.ics` makes it true; no copy change needed there.

### Admin visibility

Minimal: bookings appear in a simple list (reuse the admin dashboard's existing table/list pattern; a basic `/api/admin/bookings` GET behind the existing admin auth + a section/page in the admin UI). Status field editable (new → confirmed/completed/cancelled). No calendar view — YAGNI.

## 2. Estimator follow-up email

- In `/api/estimate-project`, after the estimate row (with `share_token`) is saved and analysis extracted: send the lead a branded email via Resend, dispatched with `ctx.waitUntil` (fire-and-forget; never delays the results response). Failure → Sentry only.
- Content: headline numbers (cost range GH₵ primary + USD per currency standard, timeline weeks, team size), button → `https://ohwpstudios.org/proposal/<share_token>?utm_source=proposal_email&utm_medium=email&utm_campaign=estimate_followup`, secondary CTA → `/booking?utm_source=proposal_email`.
- One email, no drip sequence (YAGNI).

## 3. Hero rework (direction A — focused funnel)

`src/components/HeroWorld.astro` (hierarchy/copy/spacing rework, not a rebuild; existing mockup panel and animation system retained):

- Headline sells the estimator: pattern "Your next project, **scoped by AI in 2 minutes**" (final copy at implementation, same intent).
- ONE primary CTA: "Scope My Project — Free" → `/estimate-project`. Secondary becomes an inline text link "or view our work →" (anchor to portfolio).
- Stats reframed as proof with real numbers only: "4.9/5 client rating · 14 shipped projects · 10+ years". No invented counts (replaces "400+ clients" if it cannot be substantiated).
- Mobile: stats in one compact row; CTA full-width; no stacking artifacts. Touch targets ≥44px, AA contrast, `prefers-reduced-motion` respected (existing system).

## 4. Homepage conversion ladder

`src/pages/index.astro` reordered to 9 sections:

1. Hero (reworked)
2. Services
3. Portfolio
4. Testimonials
5. **Proof band** — new compact section merging Statistics + ClientLogos (one row of stats, one row of logos; real numbers only)
6. **Estimator CTA** (moved up from position 9)
7. **Built in the Open** — new section merging GitHubProjects + OpenBuildTeaser; preserves the live GitHub strip's existing fetch logic (re-wrap, not rewrite)
8. FAQ
9. Contact

- Old standalone components either become the merged components' internals or are removed from the page (files may remain if referenced elsewhere — check before deleting).
- Portfolio curation: set `is_featured`/`display_order` in D1 so the best-documented projects (case-study fields + metrics populated) lead; card polish — consistent image aspect, hover lift per design system, metric chips. Selection of "best" defaults to data completeness; user can re-curate in admin at any time.
- LCP preload of first portfolio image must keep working after reorder (it's wired in `index.astro`'s head).

## 5. Testimonial collection flow

- **Submission page** `/testimonial/[token]`: token = per-request invite code (new `testimonial_invites` table: token, client_name, email, used, created_at — same migration file as bookings). Form: name (prefilled), role, company, quote, rating (1-5 stars), optional photo URL. Submits to `/api/testimonial/submit` → INSERT into existing `testimonials` table with `is_active=0` (admin reviews/activates via existing admin patterns). Token single-use.
- **Request mechanism:** an admin action (button in admin testimonials area or simple API call) that creates an invite and sends the request email via Resend (template: thanks + link + "2 minutes"). Documented fallback: copyable invite link.
- **Honesty pass on display:** `Testimonials.astro` keeps current seeded quotes for now, but the trust-indicator row beneath ("4.9/5 average · 400+ clients · 99% recommend") is reduced to substantiated numbers only. Remove the hardcoded fallback array (the live API works; fallback hides real failures — let it degrade to hiding the section on API error instead).

## 6. Measurement

- Email links carry UTM params (section 2) so GA4 attributes email-driven returns.
- New `track()` event: `testimonial_submitted` on the submission page success.
- Existing funnel events unchanged; before/after comparison of `estimator_completed → booking_submitted` conversion is the success metric for this phase.

## Error handling

- All email sends: try/catch, Sentry capture, never block the user-facing response after data is persisted.
- `.ics` generation is pure string templating — no library dependency.
- Testimonial token: invalid/used token → friendly "this link has expired" page, no enumeration leak (same response for unknown vs used).

## Out of scope

Live-demo hero (backlogged pending GA4 hero CTR data), booking availability/double-booking logic, timezone selector, drip email sequences, chatbot/Open Build feature work (Phase 3), blog content (Phase 4), photo upload storage for testimonials (URL field only this phase).

## Testing / verification

- Each workstream verified on a PR preview deploy (Phase 1 pipeline) before merge.
- Booking: end-to-end on preview — real submission → D1 row visible, both emails arrive, `.ics` opens in Google Calendar/Outlook.
- Estimator email: end-to-end with a real inbox; results screen latency unchanged.
- Smoke test gains a `/api/booking` check (GET or empty POST → expected 4xx JSON, proving the route exists — guards against the functions/-directory regression class).
- Homepage: Lighthouse spot-check (LCP unchanged or better), mobile visual pass at 360px/768px, GA4 events still firing after reorder.
