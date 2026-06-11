# Measurement + Safety Net Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add GA4 + Cloudflare Web Analytics with consent, Sentry error tracking (client + Cloudflare server), and a GitHub Actions deploy pipeline with D1 migration safety and a post-deploy smoke test to ohwpstudios.org.

**Architecture:** Analytics and Sentry load from `BaseLayout.astro` (which every page uses, directly or via `SEOPageLayout`), are entirely env-var-gated (absent vars = zero code emitted, local dev stays clean), and never block rendering. Server errors are captured by a new Astro middleware wrapping `/api/*` routes with `@sentry/cloudflare`. CI is two GitHub Actions workflows; production deploys apply D1 migrations first, deploy second, smoke-test third. A one-time manual baseline of the remote `d1_migrations` table gates the pipeline's first run.

**Tech Stack:** Astro 4 (hybrid, `@astrojs/cloudflare` 11), Cloudflare Pages project `ohwpstudios`, D1 `agency-db`, GA4 (gtag + Consent Mode v2), Cloudflare Web Analytics beacon, `@sentry/browser` + `@sentry/cloudflare` v8, GitHub Actions, wrangler 3.x.

**Spec:** `docs/superpowers/specs/2026-06-11-measurement-safety-net-design.md`

**Testing note:** The repo has no test framework and the spec explicitly excludes test suites in this phase (YAGNI). Verification per task = `npm run build` passing plus manual dev-server checks; the deploy pipeline gets a real smoke-test script that is itself run against production before being trusted in CI.

**Env vars used throughout (all optional — features self-disable when absent):**
- `PUBLIC_GA_ID` — GA4 Measurement ID (`G-XXXXXXXXXX`)
- `PUBLIC_CF_BEACON_TOKEN` — Cloudflare Web Analytics beacon token
- `PUBLIC_SENTRY_DSN` — Sentry DSN (one project, used by client and server)
- `PUBLIC_COMMIT_SHA` — injected by CI; defaults to `dev` locally

---

### Task 1: Pin toolchain dependencies

**Files:**
- Modify: `package.json`

- [ ] **Step 1: Install dependencies**

```powershell
npm install @sentry/browser@^8 @sentry/cloudflare@^8
npm install -D wrangler@^3.114.0
```

If npm reports `@sentry/*@^8` as deprecated/superseded, install the current major instead — the only APIs this plan uses are `Sentry.init`, `Sentry.wrapRequestHandler`, and `beforeSend`, which are stable across v8+.

- [ ] **Step 2: Verify build still passes**

Run: `npm run build`
Expected: completes with exit code 0 (same as before the install).

- [ ] **Step 3: Verify wrangler resolves locally**

Run: `npx wrangler --version`
Expected: prints a 3.x (or installed) version — confirms CI's `npx wrangler` will use the pinned copy.

- [ ] **Step 4: Commit**

```powershell
git add package.json package-lock.json
git commit -m "build: pin wrangler and add Sentry SDKs for observability phase"
```

---

### Task 2: Analytics core — `track()` helper and global exposure

**Files:**
- Create: `src/lib/analytics.ts`
- Modify: `src/env.d.ts`
- Modify: `src/layouts/BaseLayout.astro` (script near closing `</body>`, around line 391)

- [ ] **Step 1: Create `src/lib/analytics.ts`**

```ts
/**
 * Single analytics entry point. Components call track() (or window.ohwpTrack)
 * and never gtag directly, so the provider can change without touching pages.
 * Strictly non-blocking: every failure path is silent.
 */
export function track(
  event: string,
  params?: Record<string, string | number | boolean>
): void {
  try {
    if (typeof window === 'undefined') return;
    if (localStorage.getItem('analytics-consent') !== 'granted') return;
    if (typeof window.gtag !== 'function') return;
    window.gtag('event', event, params ?? {});
  } catch {
    // analytics must never break the page
  }
}
```

- [ ] **Step 2: Add window typings to `src/env.d.ts`**

Append to the existing file (keep current contents):

```ts
interface Window {
  gtag?: (...args: unknown[]) => void;
  dataLayer?: unknown[];
  ohwpTrack?: (
    event: string,
    params?: Record<string, string | number | boolean>
  ) => void;
}

interface ImportMetaEnv {
  readonly PUBLIC_GA_ID?: string;
  readonly PUBLIC_CF_BEACON_TOKEN?: string;
  readonly PUBLIC_SENTRY_DSN?: string;
  readonly PUBLIC_COMMIT_SHA?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
```

- [ ] **Step 3: Expose `window.ohwpTrack` from BaseLayout**

In `src/layouts/BaseLayout.astro`, just before the existing `/scripts/init.js` script tag near the bottom of `<body>` (~line 391), add a **processed** (no `is:inline`) script:

```astro
<script>
  import { track } from '../lib/analytics';
  window.ohwpTrack = track;
</script>
```

Pages use Astro-processed inline scripts, but exposing the helper on `window` lets every existing script call `window.ohwpTrack?.(…)` regardless of how it is bundled.

- [ ] **Step 4: Verify**

Run: `npm run build`
Expected: exit 0, no TypeScript errors.
Run: `npm run dev`, open http://localhost:4321, in console run `typeof window.ohwpTrack`
Expected: `"function"`.

- [ ] **Step 5: Commit**

```powershell
git add src/lib/analytics.ts src/env.d.ts src/layouts/BaseLayout.astro
git commit -m "feat(analytics): add track() helper with consent gate and global exposure"
```

---

### Task 3: CF Web Analytics beacon + GA4 loader with Consent Mode v2

**Files:**
- Modify: `src/layouts/BaseLayout.astro` (frontmatter + `<head>`)

- [ ] **Step 1: Read env vars in BaseLayout frontmatter**

Add to the component frontmatter (the `---` block at the top):

```ts
const GA_ID = import.meta.env.PUBLIC_GA_ID;
const CF_BEACON_TOKEN = import.meta.env.PUBLIC_CF_BEACON_TOKEN;
```

- [ ] **Step 2: Add both scripts at the end of `<head>`**

```astro
{CF_BEACON_TOKEN && (
  <script
    is:inline
    defer
    src="https://static.cloudflareinsights.com/beacon.min.js"
    data-cf-beacon={`{"token": "${CF_BEACON_TOKEN}"}`}
  ></script>
)}
{GA_ID && (
  <script is:inline define:vars={{ GA_ID }}>
    window.dataLayer = window.dataLayer || [];
    function gtag() { dataLayer.push(arguments); }
    window.gtag = gtag;
    gtag('consent', 'default', {
      analytics_storage: 'denied',
      ad_storage: 'denied',
      ad_user_data: 'denied',
      ad_personalization: 'denied'
    });
    try {
      if (localStorage.getItem('analytics-consent') === 'granted') {
        gtag('consent', 'update', { analytics_storage: 'granted' });
      }
    } catch (e) { /* private mode etc. — stay denied */ }
    gtag('js', new Date());
    gtag('config', GA_ID, { anonymize_ip: true });
    var gaScript = document.createElement('script');
    gaScript.async = true;
    gaScript.src = 'https://www.googletagmanager.com/gtag/js?id=' + GA_ID;
    document.head.appendChild(gaScript);
  </script>
)}
```

Consent default MUST be set in the same inline script, before the gtag.js network request is appended — that ordering is what makes Consent Mode v2 valid.

- [ ] **Step 3: Verify gated-off behavior (no env vars)**

Run: `npm run build`, then search output: `Select-String -Path dist -Pattern "googletagmanager" -SimpleMatch -Recurse` (or grep dist)
Expected: zero matches — with no env vars set, no analytics code ships.

- [ ] **Step 4: Verify gated-on behavior**

Create `.env` (gitignored by Astro convention; verify `.gitignore` covers it, add `.env` if not) containing:

```
PUBLIC_GA_ID=G-TESTTEST12
PUBLIC_CF_BEACON_TOKEN=test-token
```

Run: `npm run dev`, open the homepage, view source.
Expected: both scripts present; in console `window.dataLayer` exists and contains a consent-default entry. Network tab shows gtag.js requested. Delete or keep `.env` locally — but it must NOT be committed.

- [ ] **Step 5: Commit**

```powershell
git add src/layouts/BaseLayout.astro .gitignore
git commit -m "feat(analytics): CF Web Analytics beacon + GA4 with Consent Mode v2 defaults"
```

---

### Task 4: Consent banner

**Files:**
- Create: `src/components/ConsentBanner.astro`
- Modify: `src/layouts/BaseLayout.astro` (render banner inside `<body>`, next to `<SocialProof />` etc.)

- [ ] **Step 1: Create `src/components/ConsentBanner.astro`**

```astro
---
// Only meaningful when GA4 is configured; CF Web Analytics is cookieless
// and needs no consent.
const GA_ID = import.meta.env.PUBLIC_GA_ID;
---
{GA_ID && (
  <div
    id="consent-banner"
    role="dialog"
    aria-label="Analytics consent"
    aria-describedby="consent-text"
    hidden
  >
    <p id="consent-text">
      We use analytics cookies to understand how visitors use our site.
    </p>
    <div class="consent-actions">
      <button id="consent-accept" type="button">Accept</button>
      <button id="consent-decline" type="button">Decline</button>
    </div>
  </div>
)}
<style>
  #consent-banner {
    position: fixed;
    bottom: 1rem;
    left: 1rem;
    z-index: 9999;
    max-width: 22rem;
    padding: 1rem;
    border-radius: 12px;
    border: 1px solid var(--border-color, rgba(255, 255, 255, 0.15));
    background: var(--bg-secondary, #111827);
    color: var(--text-primary, #f9fafb);
    box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1), 0 10px 24px rgba(0, 0, 0, 0.25);
    font-size: 0.875rem;
    line-height: 1.5;
  }
  #consent-banner p { margin: 0 0 0.75rem; }
  .consent-actions { display: flex; gap: 0.5rem; }
  .consent-actions button {
    min-height: 44px;
    padding: 0 1rem;
    border-radius: 8px;
    font: inherit;
    cursor: pointer;
    border: 1px solid transparent;
  }
  #consent-accept {
    background: var(--accent-color, #6366f1);
    color: #fff;
  }
  #consent-decline {
    background: transparent;
    color: inherit;
    border-color: var(--border-color, rgba(255, 255, 255, 0.3));
  }
  .consent-actions button:focus-visible {
    outline: 2px solid var(--accent-color, #6366f1);
    outline-offset: 2px;
  }
  @media (max-width: 480px) {
    #consent-banner { left: 0.5rem; right: 0.5rem; max-width: none; }
  }
</style>
<script>
  const banner = document.getElementById('consent-banner');
  if (banner) {
    const choice = (() => {
      try { return localStorage.getItem('analytics-consent'); } catch { return 'denied'; }
    })();
    if (choice !== 'granted' && choice !== 'denied') {
      banner.hidden = false;
    }
    const decide = (value: 'granted' | 'denied') => {
      try { localStorage.setItem('analytics-consent', value); } catch { /* ignore */ }
      if (value === 'granted' && typeof window.gtag === 'function') {
        window.gtag('consent', 'update', { analytics_storage: 'granted' });
      }
      banner.hidden = true;
    };
    document.getElementById('consent-accept')?.addEventListener('click', () => decide('granted'));
    document.getElementById('consent-decline')?.addEventListener('click', () => decide('denied'));
  }
</script>
```

Match the site's existing CSS custom property names: before writing styles, check `BaseLayout.astro`/global CSS for the actual variable names (`--bg-secondary`, `--accent-color`, etc.) and use those; the fallbacks above keep it safe either way. AA contrast and 44px touch targets are requirements, not suggestions.

- [ ] **Step 2: Render banner in BaseLayout**

In `src/layouts/BaseLayout.astro`: import it in frontmatter

```ts
import ConsentBanner from '../components/ConsentBanner.astro';
```

and render `<ConsentBanner />` inside `<body>` alongside the existing `<SocialProof />` / `<PWAInstallPrompt />` components (~line 386-390).

- [ ] **Step 3: Verify the full consent flow**

With `.env` from Task 3 present, `npm run dev`:
1. Fresh profile / cleared localStorage → banner visible.
2. Click Accept → banner hides; `localStorage.getItem('analytics-consent')` is `granted`; `window.dataLayer` contains a consent update entry; reload → banner stays hidden.
3. Clear localStorage, click Decline → banner hides, value `denied`, reload → stays hidden.
4. Keyboard: Tab reaches both buttons with a visible focus ring; Enter activates.

- [ ] **Step 4: Commit**

```powershell
git add src/components/ConsentBanner.astro src/layouts/BaseLayout.astro
git commit -m "feat(analytics): consent banner gating GA4 via Consent Mode v2"
```

---

### Task 5: Sentry client

**Files:**
- Create: `src/lib/sentry-client.ts`
- Modify: `src/layouts/BaseLayout.astro` (the processed script from Task 2 Step 3)

- [ ] **Step 1: Create `src/lib/sentry-client.ts`**

```ts
import * as Sentry from '@sentry/browser';

export function initSentry(): void {
  const dsn = import.meta.env.PUBLIC_SENTRY_DSN;
  if (!dsn) return;
  Sentry.init({
    dsn,
    release: import.meta.env.PUBLIC_COMMIT_SHA || 'dev',
    sampleRate: 1.0, // capture all errors; volume is low
    tracesSampleRate: 0, // no performance tracing this phase (free-tier budget)
  });
}
```

- [ ] **Step 2: Call it from the BaseLayout processed script**

Extend the script added in Task 2 Step 3:

```astro
<script>
  import { track } from '../lib/analytics';
  import { initSentry } from '../lib/sentry-client';
  window.ohwpTrack = track;
  initSentry();
</script>
```

Note: `initSentry` no-ops without a DSN, so the import cost only ships when bundled — Astro/Vite cannot tree-shake on a runtime env check, so `@sentry/browser` (~25 KB gz) is in the bundle either way. Accepted in the spec (errors-only client tracking); do not add tracing/replay integrations, which is where bundle size explodes.

- [ ] **Step 3: Verify**

Add `PUBLIC_SENTRY_DSN=https://examplePublicKey@o0.ingest.sentry.io/0` to `.env`, `npm run dev`:
In browser console: `window.__SENTRY__` exists (SDK initialized). Throwing a test error sends a (rejected, fake-DSN) request to `ingest.sentry.io` — visible in Network tab. Without the env var, no Sentry network activity at all.

Run: `npm run build` → exit 0.

- [ ] **Step 4: Commit**

```powershell
git add src/lib/sentry-client.ts src/layouts/BaseLayout.astro
git commit -m "feat(observability): Sentry browser SDK, errors-only, release-tagged"
```

---

### Task 6: Sentry server — Astro middleware with `@sentry/cloudflare`

**Files:**
- Create: `src/middleware.ts`

- [ ] **Step 1: Create `src/middleware.ts`**

```ts
import { defineMiddleware } from 'astro:middleware';
import * as Sentry from '@sentry/cloudflare';

/**
 * Captures unhandled exceptions from API routes into Sentry.
 * - Only wraps /api/* (page rendering stays untouched).
 * - No-ops entirely when PUBLIC_SENTRY_DSN is unset (local dev).
 * - PII: request bodies, cookies, and headers are stripped in beforeSend;
 *   contact/estimate/careers submissions must never reach Sentry.
 */
export const onRequest = defineMiddleware((context, next) => {
  const dsn = import.meta.env.PUBLIC_SENTRY_DSN;
  if (!dsn || !context.url.pathname.startsWith('/api/')) {
    return next();
  }

  // Astro's Cloudflare adapter exposes the Workers execution context here.
  // Typed loosely because the adapter does not export this shape.
  const runtime = (context.locals as { runtime?: { ctx?: unknown } }).runtime;

  return Sentry.wrapRequestHandler(
    {
      options: {
        dsn,
        release: import.meta.env.PUBLIC_COMMIT_SHA || 'dev',
        sendDefaultPii: false,
        tracesSampleRate: 0,
        beforeSend(event) {
          if (event.request) {
            delete event.request.data;
            delete event.request.cookies;
            delete event.request.headers;
          }
          return event;
        },
      },
      request: context.request,
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      context: runtime?.ctx as any,
    },
    () => next()
  );
});
```

**Fallback if `wrapRequestHandler` rejects this calling shape at build/runtime** (its signature has shifted between majors): replace the wrapper with a plain try/catch that initializes a scoped client and calls `Sentry.captureException(err)` before re-throwing. The contract that matters: errors reach Sentry with the release tag, the original error response behavior is unchanged, and bodies/cookies/headers are never attached.

- [ ] **Step 2: Verify build and local behavior**

Run: `npm run build`
Expected: exit 0. If the build fails with Node-builtin resolution errors from `@sentry/cloudflare`, add to `wrangler.toml`:

```toml
compatibility_flags = ["nodejs_compat"]
```

and document that change in the commit message (it affects the whole Pages project — that's acceptable, `nodejs_compat` is additive).

Run: `npm run dev`, hit `http://localhost:4321/api/page-init`
Expected: normal JSON response (middleware no-ops without DSN).

- [ ] **Step 3: Commit**

```powershell
git add src/middleware.ts wrangler.toml
git commit -m "feat(observability): Sentry capture for API routes via Astro middleware"
```

---

### Task 7: Wire conversion events

**Files:**
- Modify: `src/pages/estimate-project.astro` (~lines 1242-1263, ~1324-1330)
- Modify: `src/components/ContactFormAdvanced.astro` (success branch of fetch to `/api/contact/submit`)
- Modify: `src/pages/booking.astro` (~line 394-397)
- Modify: `src/pages/quiz.astro` (~line 855)
- Modify: `src/components/Chatbot.astro` (~line 1587)
- Modify: `src/pages/website-analyzer.astro` (~line 862 submit handler)
- Modify: `src/components/NewsletterSubscribe.astro` (~line 258-260)

All call sites use the same pattern — `window.ohwpTrack?.('event_name', { … })` — which is safe in any script type and a silent no-op before consent. Line numbers are approximate; locate by the quoted anchor code, not the number.

- [ ] **Step 1: Estimator events in `src/pages/estimate-project.astro`**

In the `.next-btn` click handler (~1242-1263), after validation passes and before/with the `currentStep` increment:

```js
if (currentStep === 1) {
  window.ohwpTrack?.('estimator_started');
}
window.ohwpTrack?.('estimator_step', { step: currentStep + 1 });
```

In the submission success branch (~1324, inside `if (response.ok)` next to `displayResults(result)`):

```js
window.ohwpTrack?.('estimator_completed');
```

- [ ] **Step 2: Contact form in `src/components/ContactFormAdvanced.astro`**

Find the fetch to `/api/contact/submit` in the component's script and add in its success branch (where the success UI is shown):

```js
window.ohwpTrack?.('contact_submitted');
```

- [ ] **Step 3: Booking in `src/pages/booking.astro`**

In the `if (response.ok)` branch (~line 394, next to the "Booking confirmed!" message):

```js
window.ohwpTrack?.('booking_submitted');
```

- [ ] **Step 4: Quiz in `src/pages/quiz.astro`**

Immediately before `window.location.href = '/quiz/thank-you'` (~line 855):

```js
window.ohwpTrack?.('quiz_completed', { transport_type: 'beacon' });
```

(`transport_type: 'beacon'` so the event survives the immediate navigation.)

- [ ] **Step 5: Chatbot in `src/components/Chatbot.astro`**

In the `#chatbot-toggle` click handler (~line 1587, where `lazyInitChatbot()` is called):

```js
window.ohwpTrack?.('chat_opened');
```

- [ ] **Step 6: Grader in `src/pages/website-analyzer.astro`**

In the `#analyzer-form` submit handler (~line 813-862), after the URL is read and before/with the fetch:

```js
window.ohwpTrack?.('grader_run');
```

- [ ] **Step 7: Newsletter in `src/components/NewsletterSubscribe.astro`**

In the `if (data.success)` branch (~line 258):

```js
window.ohwpTrack?.('newsletter_signup');
```

- [ ] **Step 8: Verify**

Run: `npm run build` → exit 0.
With `.env` set and consent accepted in dev: open `/estimate-project`, advance one step, and confirm in console that `window.dataLayer` gained an `estimator_started` and `estimator_step` event entry. Spot-check `chat_opened` by opening the chatbot.

- [ ] **Step 9: Commit**

```powershell
git add src/pages/estimate-project.astro src/components/ContactFormAdvanced.astro src/pages/booking.astro src/pages/quiz.astro src/components/Chatbot.astro src/pages/website-analyzer.astro src/components/NewsletterSubscribe.astro
git commit -m "feat(analytics): wire conversion events across the funnel"
```

---

### Task 8: Smoke-test script

**Files:**
- Create: `scripts/smoke-test.mjs`

- [ ] **Step 1: Create `scripts/smoke-test.mjs`**

```js
#!/usr/bin/env node
/**
 * Post-deploy smoke test. Usage: node scripts/smoke-test.mjs [baseUrl]
 * Exits non-zero if any check fails — CI treats that as a failed deploy.
 */
const base = (process.argv[2] || 'https://ohwpstudios.org').replace(/\/$/, '');

const checks = [
  { path: '/', mustContain: 'OhWP' },
  { path: '/estimate-project', mustContain: 'estimate' },
  { path: '/api/page-init' }, // exercises a Pages Function + D1
];

let failed = 0;
for (const check of checks) {
  const url = base + check.path;
  try {
    const res = await fetch(url, { redirect: 'follow' });
    if (res.status !== 200) {
      console.error(`FAIL ${url} — status ${res.status}`);
      failed++;
      continue;
    }
    if (check.mustContain) {
      const body = await res.text();
      if (!body.toLowerCase().includes(check.mustContain.toLowerCase())) {
        console.error(`FAIL ${url} — missing sentinel "${check.mustContain}"`);
        failed++;
        continue;
      }
    }
    console.log(`OK   ${url}`);
  } catch (err) {
    console.error(`FAIL ${url} — ${err.message}`);
    failed++;
  }
}

if (failed > 0) {
  console.error(`\n${failed} smoke check(s) failed`);
  process.exit(1);
}
console.log('\nAll smoke checks passed');
```

- [ ] **Step 2: Verify against live production**

Run: `node scripts/smoke-test.mjs https://ohwpstudios.org`
Expected: `All smoke checks passed`, exit 0. If `/api/page-init` is not 200 in production, inspect what it actually returns and either fix the check's expectation or pick a different always-on GET API route — the script must be green against current production before it can gate deploys.

Also verify failure mode: `node scripts/smoke-test.mjs https://ohwpstudios.org/nonexistent-base` → non-zero exit.

- [ ] **Step 3: Commit**

```powershell
git add scripts/smoke-test.mjs
git commit -m "feat(ci): post-deploy smoke test script"
```

---

### Task 9: Baseline remote D1 migration state (MANUAL GATE — must precede Task 10 merge)

**Files:** none committed (remote database operation + verification)

The 45 migrations in `migrations/` were applied by hand; wrangler's remote tracking may be missing/incomplete. If CI ran `migrations apply --remote` naively it could re-execute already-applied DDL against the live database. This task makes remote state truthful first. (Known local quirk: migration 007 has a local-apply bug — remote only here, do not touch it.)

- [ ] **Step 1: Inspect remote migration state**

```powershell
npx wrangler d1 migrations list agency-db --remote
```

(Requires `CLOUDFLARE_ACCOUNT_ID`/auth per project memory.) Three possible outcomes:
- **Nothing pending** → remote tracking is already complete; skip to Step 4.
- **All/some listed as pending** but their schema demonstrably exists → baseline needed; continue.
- **Genuinely unapplied migrations** → STOP and surface to the user; do not blindly apply.

To check whether a "pending" migration's schema actually exists:

```powershell
npx wrangler d1 execute agency-db --remote --command "SELECT name FROM sqlite_master WHERE type='table' ORDER BY name;"
```

and compare against the tables each pending migration creates.

- [ ] **Step 2: Create the tracking table if absent**

```powershell
npx wrangler d1 execute agency-db --remote --command "CREATE TABLE IF NOT EXISTS d1_migrations(id INTEGER PRIMARY KEY AUTOINCREMENT, name TEXT UNIQUE, applied_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP);"
```

- [ ] **Step 3: Insert a baseline row per already-applied migration file**

Generate the INSERT statements from the actual filenames in `migrations/` (do not hand-type 45 names):

```powershell
$names = Get-ChildItem migrations -Filter *.sql | Sort-Object Name | ForEach-Object { "('" + $_.Name + "')" }
$sql = "INSERT OR IGNORE INTO d1_migrations (name) VALUES " + ($names -join ', ') + ";"
npx wrangler d1 execute agency-db --remote --command $sql
```

`INSERT OR IGNORE` makes this idempotent against partially-tracked state.

- [ ] **Step 4: Verify clean state — the gate condition**

```powershell
npx wrangler d1 migrations list agency-db --remote
npx wrangler d1 migrations apply agency-db --remote
```

Expected: list shows no pending migrations; apply reports nothing to do. **Task 10's workflow must not be merged until this is the observed output.**

---

### Task 10: Production deploy workflow

**Files:**
- Create: `.github/workflows/deploy.yml`

- [ ] **Step 1: Create `.github/workflows/deploy.yml`**

```yaml
name: Deploy

on:
  push:
    branches: [main]
  workflow_dispatch:

concurrency:
  group: deploy-production
  cancel-in-progress: false

jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - uses: actions/setup-node@v4
        with:
          node-version: 20
          cache: npm

      - name: Install
        run: npm ci

      - name: Build
        run: npm run build
        env:
          PUBLIC_GA_ID: ${{ vars.PUBLIC_GA_ID }}
          PUBLIC_CF_BEACON_TOKEN: ${{ vars.PUBLIC_CF_BEACON_TOKEN }}
          PUBLIC_SENTRY_DSN: ${{ vars.PUBLIC_SENTRY_DSN }}
          PUBLIC_COMMIT_SHA: ${{ github.sha }}

      - name: Apply D1 migrations
        run: npx wrangler d1 migrations apply agency-db --remote
        env:
          CLOUDFLARE_API_TOKEN: ${{ secrets.CLOUDFLARE_API_TOKEN }}
          CLOUDFLARE_ACCOUNT_ID: ${{ secrets.CLOUDFLARE_ACCOUNT_ID }}

      - name: Deploy to Cloudflare Pages
        run: npx wrangler pages deploy dist --project-name=ohwpstudios --branch=main --commit-dirty=true
        env:
          CLOUDFLARE_API_TOKEN: ${{ secrets.CLOUDFLARE_API_TOKEN }}
          CLOUDFLARE_ACCOUNT_ID: ${{ secrets.CLOUDFLARE_ACCOUNT_ID }}

      - name: Smoke test production
        run: node scripts/smoke-test.mjs https://ohwpstudios.org
```

Ordering rationale: migrations before deploy so new code never runs against an old schema; additive-only migrations remain compatible with the old code during the seconds in between.

- [ ] **Step 2: Verify YAML and gate**

Run: `npx wrangler --version` (sanity) and lint the YAML by pushing to a branch — do NOT merge to main until Task 9's gate condition is verified and Task 12's secrets exist.

- [ ] **Step 3: Commit (on the working branch)**

```powershell
git add .github/workflows/deploy.yml
git commit -m "feat(ci): production deploy pipeline — migrate, deploy, smoke-test"
```

---

### Task 11: PR preview workflow

**Files:**
- Create: `.github/workflows/preview.yml`

- [ ] **Step 1: Create `.github/workflows/preview.yml`**

```yaml
name: Preview

on:
  pull_request:
    types: [opened, synchronize, reopened]

permissions:
  contents: read
  pull-requests: write

concurrency:
  group: preview-${{ github.event.pull_request.number }}
  cancel-in-progress: true

jobs:
  preview:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - uses: actions/setup-node@v4
        with:
          node-version: 20
          cache: npm

      - name: Install
        run: npm ci

      - name: Build
        run: npm run build
        env:
          PUBLIC_GA_ID: ${{ vars.PUBLIC_GA_ID }}
          PUBLIC_CF_BEACON_TOKEN: ${{ vars.PUBLIC_CF_BEACON_TOKEN }}
          PUBLIC_SENTRY_DSN: ${{ vars.PUBLIC_SENTRY_DSN }}
          PUBLIC_COMMIT_SHA: ${{ github.sha }}

      # No D1 migrations on previews — preview code runs against prod schema.

      - name: Deploy preview
        id: deploy
        run: |
          url=$(npx wrangler pages deploy dist --project-name=ohwpstudios --branch="pr-${{ github.event.pull_request.number }}" --commit-dirty=true | grep -Eo 'https://[^ ]+\.pages\.dev' | tail -1)
          echo "url=$url" >> "$GITHUB_OUTPUT"
        env:
          CLOUDFLARE_API_TOKEN: ${{ secrets.CLOUDFLARE_API_TOKEN }}
          CLOUDFLARE_ACCOUNT_ID: ${{ secrets.CLOUDFLARE_ACCOUNT_ID }}

      - name: Comment preview URL
        uses: actions/github-script@v7
        with:
          script: |
            const url = '${{ steps.deploy.outputs.url }}';
            const marker = '<!-- preview-url -->';
            const body = `${marker}\n🔍 **Preview deployed:** ${url}`;
            const { data: comments } = await github.rest.issues.listComments({
              ...context.repo, issue_number: context.issue.number,
            });
            const existing = comments.find(c => c.body.includes(marker));
            if (existing) {
              await github.rest.issues.updateComment({ ...context.repo, comment_id: existing.id, body });
            } else {
              await github.rest.issues.createComment({ ...context.repo, issue_number: context.issue.number, body });
            }
```

- [ ] **Step 2: Commit (on the working branch)**

```powershell
git add .github/workflows/preview.yml
git commit -m "feat(ci): PR preview deploys with URL comment"
```

---

### Task 12: User setup + first-deploy verification (MANUAL, with the user)

**Files:** none (external dashboards + GitHub settings)

- [ ] **Step 1: Walk the user through external setup**

Give the user this exact checklist:
1. **GA4**: analytics.google.com → Admin → Create property "OhWP Studios" → Web stream for `https://ohwpstudios.org` → copy the Measurement ID (`G-…`).
2. **Sentry**: sentry.io → Create project (platform: JavaScript) named `ohwpstudios` → copy the DSN. Alerts default to "email on new issue" — confirm the notification email is ohwpstudios@gmail.com.
3. **CF Web Analytics**: Cloudflare dashboard → Analytics & Logs → Web Analytics → Add site `ohwpstudios.org` (choose manual/JS-snippet install, NOT auto-inject, since we ship the beacon ourselves) → copy the beacon token.
4. **CF API token**: Cloudflare dashboard → My Profile → API Tokens → Create Token with permissions: Account → Cloudflare Pages: Edit, Account → D1: Edit.
5. **GitHub** repo → Settings → Secrets and variables → Actions:
   - Secrets: `CLOUDFLARE_API_TOKEN`, `CLOUDFLARE_ACCOUNT_ID`
   - Variables: `PUBLIC_GA_ID`, `PUBLIC_SENTRY_DSN`, `PUBLIC_CF_BEACON_TOKEN`

- [ ] **Step 2: Confirm Task 9 gate, then merge the branch to main**

Re-run `npx wrangler d1 migrations apply agency-db --remote` → "no migrations to apply". Merge. Watch the Actions run: build → migrations (no-op) → deploy → smoke test, all green.

- [ ] **Step 3: Verify analytics end-to-end**

Visit https://ohwpstudios.org, accept the consent banner, click around, open the estimator and advance a step. In GA4 → Reports → Realtime: the visit and `estimator_started` / `estimator_step` events appear. In GA4 Admin → Events, mark `estimator_completed`, `booking_submitted`, `contact_submitted` as key events.

- [ ] **Step 4: Verify Sentry end-to-end, then remove the test route**

Create `src/pages/api/debug-sentry.ts` on a branch:

```ts
export const prerender = false;

export async function GET(): Promise<Response> {
  throw new Error('Sentry server verification — safe to ignore');
}
```

Deploy (merge or use the PR preview), hit `/api/debug-sentry`, and in the browser console run `throw new Error('Sentry client verification')` on the homepage. Both errors appear in Sentry tagged with the deploy's release SHA. Then DELETE the route file and push — verification routes do not live in production.

```powershell
git rm src/pages/api/debug-sentry.ts
git commit -m "chore: remove Sentry verification route"
```

- [ ] **Step 5: Confirm preview flow**

Open a trivial PR (e.g., README whitespace); the preview workflow comments a working `*.pages.dev` URL. Close the PR.

---

## Done means

- GA4 Realtime shows pageviews + funnel events after consent; CF Web Analytics collecting regardless of consent.
- Sentry receives client and server errors with release SHAs; new-issue email alerts on.
- Pushing to main runs migrate → deploy → smoke automatically; a red ✗ on the commit means deploy/smoke failed.
- PRs get preview URLs.
- `wrangler d1 migrations list agency-db --remote` is permanently truthful.
