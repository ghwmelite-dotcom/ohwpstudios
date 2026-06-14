# Quiz Wiring — Design Spec

**Date:** 2026-06-14
**Status:** Approved by user (design conversation, this session)
**Scope:** Turn the Project Discovery Quiz from a silent dead-end into a working lead channel — make submission actually work, persist leads, email both parties, surface leads in admin, and bring the quiz content up to the site's standing standards. Phase 3 sub-project (quiz wiring).

## Context (audited facts)

- **The submit endpoint is dead.** `src/pages/api/quiz/submit.astro` is an `.astro` file. Astro only treats `.js`/`.ts` files under `src/pages/` as API routes — an `.astro` file becomes a *page*, so its `export const POST` is dead code and a POST to `/api/quiz/submit` never runs the handler. Every quiz submission fails (`response.ok` false → the widget's "Something went wrong" alert). Leads are lost. This is the same dead-endpoint class as the historical `functions/`-directory regression.
- **No notifications.** The handler has `TODO: email admin` and `TODO: email user`. `src/pages/quiz/thank-you.astro` promises *"We'll email you a detailed recommendation within 24 hours"* — nothing sends.
- **No admin visibility.** Quiz leads are not surfaced anywhere under `/admin` (chat, contacts, contracts, bookings, estimates all are; quiz is not).
- **Off-standard content.** Question-6 budget options are USD-only (`$10k-$25k`…), violating the GHS-primary currency standard (1 USD = 12 GH₵). All 28 option icons (7 questions × 4) and the recommendation icon are emoji (🚀📈⚡…), violating the "SVG icons, no emoji in production UI" design rule already enforced elsewhere on the site.
- **No rate-limit** on the public submit endpoint (same abuse class hardened on the chat endpoints).
- **Existing reusable infrastructure (all verified present):**
  - `quiz_leads` table — migration `006_quiz_leads_and_case_studies.sql`, **confirmed applied to remote prod D1**. Columns: `id, name, email, company, goal, platform, audience, timeline, features, budget, involvement, created_at, contacted (BOOLEAN default 0), contacted_at, notes`. The existing INSERT column mapping is correct.
  - `src/lib/email.ts` — `sendEmail(env, {to, subject, html, replyTo?})` (throws on failure; no-ops without `RESEND_API_KEY` in local dev), `emailShell(title, bodyHtml)` (branded kente wrapper), `emailButton(href, label)`, `escapeHtml(s)`, `ADMIN_EMAIL = 'ohwpstudios@gmail.com'`. `src/pages/api/booking.ts` is the reference caller.
  - `src/utils/rate-limit.ts` — `checkRateLimit(id, config) → {allowed, retryAfter, remaining}`, `getClientIdentifier(request)` (CF-Connecting-IP), `RATE_LIMITS` (LOGIN/API/PAYMENT/CHAT). In-memory per-isolate.
  - `src/middleware.ts` — auto-guards every `/admin/*` page and `/api/admin/*` endpoint: valid session cookie required (else 401 for API / redirect for pages), and mutating admin API requests must carry the per-session `X-CSRF-Token` header. Admin identity lands on `locals.adminUser`. A new admin page + API route are protected for free by living under those paths.
  - Admin list pattern: `src/pages/admin/contacts.astro` (page) + `src/pages/api/admin/contacts.ts` (data API) + a card on `src/pages/admin/dashboard.astro`, with client-side CSV export.
  - Analytics: `window.ohwpTrack?.('quiz_completed')` already fires on successful submit. (Keep; no new events.)
- **Deploy:** GitHub Actions is billing-locked → MANUAL `wrangler pages deploy dist --project-name=ohwpstudios --branch=main` after building with prod `PUBLIC_*` env vars. CF Pages preview environment lacks `RESEND_API_KEY` (production-only) — email delivery can only be tested on production.

## 1. Shared recommendation engine

Create `src/lib/quiz-recommendation.ts` — a **pure, rule-based** module, single source of truth used by both the quiz page (client, bundled import) and the submit endpoint (email content).

```ts
export interface QuizAnswers {
  goal?: string; platform?: string; audience?: string;
  timeline?: string; features?: string; budget?: string; involvement?: string;
}
export interface Recommendation {
  key: string;            // stable id, e.g. 'mobile-app'
  title: string;          // e.g. 'Mobile App Development'
  description: string;    // 1-2 sentence blurb
  serviceUrl: string;     // matching on-site service/solution page
  iconId: string;         // key into the page's inline-SVG icon set (no emoji)
}
export function recommendSolution(a: QuizAnswers): Recommendation { /* rule mapping */ }
```

Mapping mirrors and strengthens the current client logic (platform=mobile → Mobile App; platform=both → Full-Stack Web & Mobile; goal=startup → MVP Development; goal=transform → Digital Transformation; platform=enterprise → Enterprise Software; default → Custom Software Development), each pointing at the real matching page under `/services/*` or `/solutions/*`. Deterministic, instant, zero AI cost. No server-only dependencies, so it is safe to import from the client `<script>`.

## 2. Working submit endpoint

Replace `src/pages/api/quiz/submit.astro` with `src/pages/api/quiz/submit.ts` (`prerender = false`, `export const POST: APIRoute`). Delete the `.astro` file. Flow:

1. Parse `{ name, email, company, answers }`; validate `name`, `email`, `answers` present (400 if missing). Cap lengths defensively (name ≤120, email ≤200, company ≤200).
2. **Rate-limit:** add `RATE_LIMITS.QUIZ` (e.g. `maxAttempts: 5, windowMs: 60*1000, blockDurationMs: 5*60*1000`). On `!allowed` return HTTP 429 `{ error: 'Too many submissions, please try again shortly.' }` (the widget already shows a retry alert on non-ok).
3. **Persist (critical path):** INSERT into `quiz_leads` (the existing correct column mapping). If the write throws → 500 so the widget retries; never silently drop a lead. If `db` is missing → 500 (a quiz with no DB is a misconfiguration, not a normal path).
4. Compute `recommendation = recommendSolution(answers)`.
5. **Emails (best-effort, non-fatal):** wrap in try/catch → `console.error` only; a mail failure must NOT fail the submit after the lead is saved.
   - Admin alert → `ADMIN_EMAIL`, subject `New quiz lead: {name}`, body = contact details + all 7 answers + the recommendation, `replyTo: email`.
   - Visitor → `email`, subject `Your OhWP Studios recommendation`, body = the recommendation (title + description) + `emailButton('/booking', 'Book a free consultation')`. All user-supplied values run through `escapeHtml`.
6. Return `{ success: true, recommendation }` (200).

`env` is `locals.runtime.env` (has `DB` + `RESEND_API_KEY` in prod). Imports: `sendEmail, emailShell, emailButton, escapeHtml, ADMIN_EMAIL` from `../../../lib/email`; `checkRateLimit, getClientIdentifier, RATE_LIMITS` from `../../../utils/rate-limit`; `recommendSolution` from `../../../lib/quiz-recommendation`.

## 3. Quiz page content + standards (`src/pages/quiz.astro`)

- **Recommendation:** replace the inline `generateRecommendation()` with a call to `recommendSolution(answers)` from the shared module (client import). The results slide renders title + description from it. (Server email and page now agree.)
- **Currency → GHS-primary dual** on the Question-6 budget options (data-value keys `starter/growth/scale/enterprise` UNCHANGED so DB + logic are untouched; only the visible labels change), at ×12:
  - starter: `GH₵120,000 – GH₵300,000` / sub `($10k – $25k · MVP or simple app)`
  - growth: `GH₵300,000 – GH₵600,000` / `($25k – $50k · full-featured product)`
  - scale: `GH₵600,000 – GH₵1,200,000` / `($50k – $100k · enterprise-grade)`
  - enterprise: `GH₵1,200,000+` / `($100k+ · large-scale platform)`
- **Emoji → inline SVG:** replace all 28 option-card emoji and the recommendation-card icon with inline line-SVGs (stroke style matching the existing `.question-icon` SVGs already in the file — `stroke-width=2`, `currentColor`). One curated icon per option; the plan enumerates the exact SVG per option. No emoji remain in the quiz.
- Submit-success behavior unchanged: `ohwpTrack('quiz_completed')` then redirect to `/quiz/thank-you`.

## 4. Admin quiz-leads view

Mirror the `contacts` admin pattern; both are auto-guarded by middleware.

- `src/pages/api/admin/quiz-leads.ts`:
  - `GET` → `SELECT * FROM quiz_leads ORDER BY created_at DESC` → `{ leads: [...] }`.
  - `POST` (mark contacted) → body `{ id, contacted }`; requires the `X-CSRF-Token` header (middleware enforces); `UPDATE quiz_leads SET contacted = ?, contacted_at = CASE WHEN ? THEN CURRENT_TIMESTAMP ELSE NULL END WHERE id = ?`.
- `src/pages/admin/quiz-leads.astro` (`prerender = false`): table newest-first — email, company, the 7 answers (goal/platform/audience/timeline/features/budget/involvement), created_at, contacted toggle; "Mark contacted" action (sends the CSRF header from `locals.adminUser.csrfToken`, as other admin pages do); client-side CSV export (copy the contacts pattern). Back-link to dashboard.
- `src/pages/admin/dashboard.astro`: add a "Quiz Leads" card linking to `/admin/quiz-leads`, consistent with the existing dashboard cards.

## Out of scope

AI-generated recommendations (rule-based only this cycle); reworking the quiz questions/flow; tying quiz leads into the chatbot's `chat_qualified_leads` pipeline; quiz-lead deletion/notes-editing in admin (the `notes` column exists but no editor this cycle); new analytics events beyond the existing `quiz_completed`; a new migration (table already exists in prod).

## Error handling

- Persistence is the critical path: a DB failure or missing `db` → 500 so the widget retries (never silently lose a lead).
- Emails + analytics are best-effort: wrapped so a failure after persistence never breaks the submit. `sendEmail` already no-ops without `RESEND_API_KEY` (so local dev and CF preview simply skip email without error).
- Rate-limit → 429 with a friendly message the widget surfaces via its existing alert.
- All user-supplied strings escaped (`escapeHtml`) before entering email HTML; all SQL via prepared `.bind()` statements (no injection).

## Verification

- `npm run build` exit 0 per task.
- Dev: a full quiz run posts to `submit.ts` → 200 `{success, recommendation}`; `quiz_leads` gains one row with the 7 answers; results slide shows the shared recommendation; budget options show GH₵-primary; no emoji in the rendered quiz; an over-limit burst → 429 friendly. (Email no-ops locally without the key.)
- Admin: `/admin/quiz-leads` lists the new lead, mark-contacted toggles `contacted`/`contacted_at`, CSV exports; unauthenticated `/api/admin/quiz-leads` → 401 (middleware).
- Production (manual deploy, Actions billing-locked): prod smoke green → one real test submission persists, **both emails arrive at `ohwpstudios@gmail.com`** (visitor test uses the admin address), the lead shows in `/admin/quiz-leads`; then delete the test row from prod D1.
