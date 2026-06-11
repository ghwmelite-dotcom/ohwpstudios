# Phase 1: Measurement + Safety Net — Design Spec

**Date:** 2026-06-11
**Status:** Approved by user (design conversation, this session)
**Scope:** Analytics, error tracking, CI/CD for ohwpstudios.org. No design changes, no new content, no test suite beyond a deploy smoke check, no feature work.

## Context

ohwpstudios.org is an Astro 4 site on Cloudflare Pages (project `ohwpstudios`, D1 database `agency-db`, id `ddff1c97-f090-43eb-9f8d-4a4f68517faf`). It has a strong feature surface (AI estimator, booking, contracts/payments via Paystack, client portal) but zero observability: no analytics, no error tracking, manual `wrangler` deploys, and 45 D1 migrations applied by hand. This phase adds instruments and a pipeline so later phases (conversion, content) are measurable and deploys are safe.

This is Phase 1 of a four-phase roadmap:

1. **Measurement + safety net** (this spec)
2. Conversion + visual polish pass (homepage → estimator → booking, testimonials, portfolio seeding)
3. Finish half-built features (chatbot off mocks, Open Build, quiz wiring)
4. Content engine (blog expansion, landing pages)

## 1. Analytics

### Cloudflare Web Analytics (ground truth, always on)

- Cookieless beacon script added to `src/layouts/BaseLayout.astro` (verify `SEOPageLayout.astro` nests BaseLayout; if not, add there too).
- No consent required. User creates the site in the Cloudflare dashboard and provides the beacon token.

### GA4 with Consent Mode v2

- gtag loaded from `BaseLayout` with Consent Mode v2 defaults set to `denied` (analytics_storage) before the gtag script loads.
- A lightweight consent banner (small, bottom-corner, site-themed, accessible: focusable buttons, AA contrast) offers Accept / Decline. Choice persisted in `localStorage`; on Accept, consent is updated to `granted`. No banner re-display after a choice. Declining still allows Cloudflare Web Analytics (cookieless).
- GA4 Measurement ID supplied as a public build-time env var (`PUBLIC_GA_ID`). If unset, GA4 code is omitted entirely (local dev stays clean).

### Conversion events

One helper module `src/lib/analytics.ts` exporting `track(event, params?)`:

- No-ops when GA4 is absent or consent not granted.
- Components/pages call `track()` only — never gtag directly — so providers can be swapped later.

Events wired in this phase:

| Event | Where |
|---|---|
| `estimator_started`, `estimator_step`, `estimator_completed` | `/estimate-project` multi-step form |
| `booking_submitted` | `/booking` form success |
| `contact_submitted` | `/contact` form success |
| `quiz_completed` | `/quiz` completion |
| `chat_opened` | chatbot widget open |
| `grader_run` | `/website-analyzer` submission |
| `newsletter_signup` | newsletter subscribe success |

Mark `estimator_completed`, `booking_submitted`, and `contact_submitted` as key events (conversions) in the GA4 UI.

## 2. Error tracking — Sentry (client + server)

### Client

- Sentry browser SDK initialized from `BaseLayout` (via `@sentry/astro` client config or plain browser SDK — implementer's choice, smallest bundle wins).
- `release` tagged with the git commit SHA (injected at build time), so errors map to deploys.
- DSN from `PUBLIC_SENTRY_DSN`; if unset, Sentry is omitted (local dev clean).
- Sample rates: 100% errors, 0% performance tracing (free-tier budget; tracing can come later).

### Server (Cloudflare constraint)

- `@sentry/astro`'s server side assumes Node and does not work on Cloudflare Workers. Use **`@sentry/cloudflare`** instead, invoked from Astro middleware (`src/middleware.ts`): wrap request handling, capture exceptions from API routes (estimator, Paystack webhook, contact, chat), and re-throw so existing error responses are unchanged.
- May require the `nodejs_compat` compatibility flag in `wrangler.toml` — verify during implementation.
- **PII scrubbing:** `sendDefaultPii` off; do not attach request bodies for `/api/contact/*`, `/api/estimate-project`, `/api/careers/*`. URL, method, status, and stack traces only.

### Alerts

- Sentry default email alert on each new issue → ohwpstudios@gmail.com. Free tier.

## 3. CI/CD — GitHub Actions

### `deploy.yml` (push to `main`)

1. Checkout, setup Node 20, `npm ci`.
2. `astro build` (with `PUBLIC_GA_ID`, `PUBLIC_SENTRY_DSN`, commit SHA injected).
3. Apply pending D1 migrations: `npx wrangler d1 migrations apply agency-db --remote`.
4. Deploy: `npx wrangler pages deploy dist --project-name=ohwpstudios`.
5. **Smoke test**: script (`scripts/smoke-test.mjs`) curls the production URL for `/`, `/estimate-project`, and one API health check; any non-200 (or missing sentinel content on `/`) fails the job.
6. Job failure produces a GitHub notification (default) — visible failure is the requirement.

Wrangler is pinned (devDependency or pinned `npx wrangler@<version>`) — it is not currently in `package.json`.

### `preview.yml` (pull requests)

- Build + `wrangler pages deploy` to a preview branch deployment; comment the preview URL on the PR. **No migrations on previews.**

### ⚠️ Migration baseline (must happen before the pipeline's first run)

The 45 existing migrations were applied by hand; wrangler's remote `d1_migrations` tracking table may be missing or incomplete. Before enabling `deploy.yml`:

1. Inspect remote state: `npx wrangler d1 migrations list agency-db --remote`.
2. If migrations show as unapplied but their schema already exists, baseline by inserting their rows into `d1_migrations` directly (no re-execution), then re-verify `migrations list` reports clean.
3. Only then merge the workflow. A no-op `migrations apply --remote` must succeed before the pipeline is trusted.

(Known local quirk from project memory: migration 007 has a local-apply bug — irrelevant to remote, but don't "fix" it in this phase.)

### Secrets / variables (GitHub repo settings)

| Name | Type | Source |
|---|---|---|
| `CLOUDFLARE_API_TOKEN` | secret | CF dashboard → API token with Pages + D1 edit |
| `CLOUDFLARE_ACCOUNT_ID` | secret | CF dashboard |
| `PUBLIC_GA_ID` | variable | GA4 property (user creates) |
| `PUBLIC_SENTRY_DSN` | variable | Sentry project (user creates) |

User-side setup (walked through during implementation): create GA4 property, create Sentry project, create CF Web Analytics site, add the four values above.

## 4. Verification

- Local: `astro build` passes; smoke-test script runs green against production before being wired into CI.
- Post-first-deploy checklist:
  1. GA4 Realtime shows a visit; accept consent and confirm an event (`estimator_started`) arrives.
  2. Trigger a deliberate client error and a deliberate API error (temporary `/api/debug-sentry` route, removed after verification) — both appear in Sentry with the release SHA.
  3. `wrangler d1 migrations apply --remote` no-op run is clean in CI logs.
  4. Open a trivial PR; preview deploy URL is commented.

## Error handling

- Analytics and Sentry are strictly non-blocking: failures to load (ad blockers, network) must never break the page. `track()` is try/catch-wrapped and silent.
- Deploy pipeline fails closed: migration or smoke-test failure stops the pipeline and leaves the previous deployment live (Pages keeps prior deployment active until the new one succeeds; smoke failure alerts even though deploy already swapped — acceptable for this phase, rollback is one click in CF dashboard).

## Out of scope

Design/UX changes, new content, unit/E2E test suites, chatbot/Open Build/quiz feature work, performance work, staging environment.
