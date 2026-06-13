# Admin Auth Hardening Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Server-verified cookie sessions guarding every admin page and API endpoint, PBKDF2 passwords with transparent migration, centrally-enforced CSRF, no dev backdoor, XSS-safe admin rendering.

**Architecture:** One auth library (`src/lib/admin-auth.ts`) owns password hashing and session creation; `src/middleware.ts` (already wrapping `/api/*` for Sentry) becomes the single guard for `/admin/*` + `/api/admin/*` — validating the `admin_session` httpOnly cookie against the existing-but-never-read `sessions` table and enforcing `X-CSRF-Token` on mutations. The 16 endpoints with ad-hoc Bearer checks lose them; the 8 unguarded ones need no per-file change. Admin pages swap localStorage gating for a `GET /api/admin/session` bootstrap.

**Tech Stack:** Astro middleware + `context.cookies`, WebCrypto PBKDF2-SHA256 (100k iter), existing `sessions`/`admin_users` D1 tables (no migration needed), existing `src/utils/csrf.ts` generator, Playwright verification.

**Spec:** `docs/superpowers/specs/2026-06-13-admin-auth-hardening-design.md`

**Verified facts:**
- `sessions` table (001): `id, token UNIQUE, user_id, csrf_token, created_at, expires_at TEXT` — login already INSERTs; nothing SELECTs.
- `src/utils/csrf.ts`: `generateCSRFToken(): string` (line 8, sound) — reuse; its `verifyCSRFToken(request, expected)` reads the header/body and returns a Response on failure — middleware uses its own inline constant-time compare instead (simpler in middleware context).
- Admin pages WITH `prerender = false` (13): chat, bookings, pm-chats, newsletter, code-quality, push-notifications, estimates, contacts, contacts/[id], portfolio, clients, testimonials, project/[id]. **MISSING (static → middleware can't protect): dashboard, applications, contracts, theme** (+ verify login/reset — those stay public so static is fine).
- Endpoints with ad-hoc Bearer checks to strip (16): applications, change-password, client-projects, client-users, clients, code-quality, contract-milestones, contract-templates, contracts, milestones, pm-chats, project-files, project-updates, push/send, push/subscriptions, content (partial).
- Endpoints with NO auth (8 — middleware will cover, no file changes): blog, bookings, contacts, content(GET), newsletter, portfolio, testimonial-invites, testimonials.
- Login: `src/pages/api/admin/login.ts` (SHA-256 helper lines 9-16, dev fallback line 52, token gen lines 53/96, sessions INSERT line 101, rate limiting present — KEEP rate limiting). Login page shows credentials at `login.astro:95-99`.
- XSS: `contacts.astro:696-711` raw interpolation (worst); audit applications/pm-chats/newsletter/estimates/chat + sweep.
- `src/middleware.ts`: Sentry wrapper gated on `pathname.startsWith('/api/')` (line ~97). Auth guard goes BEFORE the Sentry wrap.
- Canonical escape helper: `escapeHtml` already exported from `src/lib/email.ts` — but that's an email module; create `src/utils/escape-html.ts` as the canonical client-safe one (admin pages import it in client scripts via Astro-processed scripts).

---

### Task 1: Auth library + password tooling

**Files:**
- Create: `src/lib/admin-auth.ts`
- Create: `scripts/hash-password.mjs`

- [ ] **Step 1: Create `src/lib/admin-auth.ts`**

```ts
/**
 * Admin authentication primitives: PBKDF2 password hashing (with transparent
 * migration from the legacy unsalted SHA-256 format) and session helpers.
 * The middleware owns enforcement; this module owns crypto.
 */

const PBKDF2_ITERATIONS = 100_000;
export const SESSION_COOKIE = 'admin_session';
export const SESSION_HOURS = 24;

function toHex(bytes: Uint8Array): string {
  return Array.from(bytes, (b) => b.toString(16).padStart(2, '0')).join('');
}

function fromHex(hex: string): Uint8Array {
  const out = new Uint8Array(hex.length / 2);
  for (let i = 0; i < out.length; i++) out[i] = parseInt(hex.slice(i * 2, i * 2 + 2), 16);
  return out;
}

/** Constant-time comparison of equal-length strings (hex/token material). */
export function timingSafeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return diff === 0;
}

async function pbkdf2Bits(password: string, salt: Uint8Array, iterations: number): Promise<Uint8Array> {
  const key = await crypto.subtle.importKey('raw', new TextEncoder().encode(password), 'PBKDF2', false, ['deriveBits']);
  const bits = await crypto.subtle.deriveBits({ name: 'PBKDF2', hash: 'SHA-256', salt, iterations }, key, 256);
  return new Uint8Array(bits);
}

export async function hashPassword(password: string): Promise<string> {
  const salt = crypto.getRandomValues(new Uint8Array(16));
  const hash = await pbkdf2Bits(password, salt, PBKDF2_ITERATIONS);
  return `pbkdf2$${PBKDF2_ITERATIONS}$${toHex(salt)}$${toHex(hash)}`;
}

/** Verifies against PBKDF2 format or the legacy unsalted SHA-256 (64-hex). */
export async function verifyPassword(
  password: string,
  stored: string
): Promise<{ valid: boolean; needsRehash: boolean }> {
  if (stored.startsWith('pbkdf2$')) {
    const [, iterStr, saltHex, hashHex] = stored.split('$');
    const hash = await pbkdf2Bits(password, fromHex(saltHex), Number(iterStr));
    return { valid: timingSafeEqual(toHex(hash), hashHex), needsRehash: false };
  }
  // legacy: unsalted SHA-256 hex
  const digest = new Uint8Array(await crypto.subtle.digest('SHA-256', new TextEncoder().encode(password)));
  return { valid: timingSafeEqual(toHex(digest), stored.toLowerCase()), needsRehash: true };
}

/** 256-bit random session token, hex-encoded. */
export function generateSessionToken(): string {
  return toHex(crypto.getRandomValues(new Uint8Array(32)));
}
```

- [ ] **Step 2: Create `scripts/hash-password.mjs`** (local admin seeding tool)

```js
#!/usr/bin/env node
// Usage: node scripts/hash-password.mjs <password>
// Prints a pbkdf2$... hash for seeding/updating admin_users.
const password = process.argv[2];
if (!password) {
  console.error('Usage: node scripts/hash-password.mjs <password>');
  process.exit(1);
}
const ITER = 100_000;
const toHex = (u8) => Array.from(u8, (b) => b.toString(16).padStart(2, '0')).join('');
const salt = crypto.getRandomValues(new Uint8Array(16));
const key = await crypto.subtle.importKey('raw', new TextEncoder().encode(password), 'PBKDF2', false, ['deriveBits']);
const bits = new Uint8Array(await crypto.subtle.deriveBits({ name: 'PBKDF2', hash: 'SHA-256', salt, iterations: ITER }, key, 256));
console.log(`pbkdf2$${ITER}$${toHex(salt)}$${toHex(bits)}`);
console.log('\nSeed locally with:');
console.log(`npx wrangler d1 execute agency-db --local --command "INSERT OR REPLACE INTO admin_users (id, username, password_hash, email) VALUES (1, 'admin', '<hash-above>', 'ohwpstudios@gmail.com');"`);
```

- [ ] **Step 3: Verify + commit**

`npm run build` → exit 0. `node scripts/hash-password.mjs test123` prints a pbkdf2$100000$... string (and run twice → different salts/hashes).

```powershell
git add src/lib/admin-auth.ts scripts/hash-password.mjs
git commit -m "feat(auth): PBKDF2 password lib with legacy migration + seeding tool"
```

---

### Task 2: Login/logout/session endpoints + login page cleanup

**Files:**
- Modify: `src/pages/api/admin/login.ts` (read fully first — KEEP its rate limiting)
- Create: `src/pages/api/admin/logout.ts`
- Create: `src/pages/api/admin/session.ts`
- Modify: `src/pages/admin/login.astro` (remove credentials display ~95-99; stop storing admin_token; add legacy-token cleanup)

- [ ] **Step 1: Rebuild login.ts auth core**

Preserve: rate limiting, request parsing, response shape conventions. Replace the SHA-256 helper, dev fallback (DELETE lines ~52 entirely — no env-gated backdoor of any kind), and token generation with:

```ts
import { verifyPassword, hashPassword, generateSessionToken, SESSION_COOKIE, SESSION_HOURS } from '../../../lib/admin-auth';
import { generateCSRFToken } from '../../../utils/csrf';

// inside POST, after rate limiting + input parsing:
const user = await db.prepare('SELECT id, username, password_hash FROM admin_users WHERE username = ?').bind(username).first();
if (!user) return json({ success: false, error: 'Invalid credentials' }, 401);

const { valid, needsRehash } = await verifyPassword(password, String(user.password_hash));
if (!valid) return json({ success: false, error: 'Invalid credentials' }, 401);

if (needsRehash) {
  const newHash = await hashPassword(password);
  await db.prepare('UPDATE admin_users SET password_hash = ? WHERE id = ?').bind(newHash, user.id).run();
}

// opportunistic cleanup of this user's expired sessions
await db.prepare("DELETE FROM sessions WHERE user_id = ? AND expires_at <= datetime('now')").bind(user.id).run();

const token = generateSessionToken();
const csrfToken = generateCSRFToken();
await db
  .prepare("INSERT INTO sessions (token, user_id, csrf_token, expires_at) VALUES (?, ?, ?, datetime('now', ?))")
  .bind(token, user.id, csrfToken, `+${SESSION_HOURS} hours`)
  .run();
await db.prepare("UPDATE admin_users SET last_login = datetime('now') WHERE id = ?").bind(user.id).run();

cookies.set(SESSION_COOKIE, token, {
  httpOnly: true,
  secure: true,
  sameSite: 'lax',
  path: '/',
  maxAge: SESSION_HOURS * 3600,
});
return json({ success: true, username: user.username, csrf_token: csrfToken }, 200);
```

(`cookies` from the APIRoute context: `async ({ request, locals, cookies }) =>`. NO token in the response body.)

- [ ] **Step 2: Create `src/pages/api/admin/logout.ts`**

```ts
import type { APIRoute } from 'astro';
import { SESSION_COOKIE } from '../../../lib/admin-auth';

export const prerender = false;

export const POST: APIRoute = async ({ locals, cookies }) => {
  const db = locals.runtime?.env?.DB;
  const token = cookies.get(SESSION_COOKIE)?.value;
  if (db && token) {
    await db.prepare('DELETE FROM sessions WHERE token = ?').bind(token).run();
  }
  cookies.delete(SESSION_COOKIE, { path: '/' });
  return new Response(JSON.stringify({ success: true }), { headers: { 'Content-Type': 'application/json' } });
};
```

- [ ] **Step 3: Create `src/pages/api/admin/session.ts`**

```ts
import type { APIRoute } from 'astro';

export const prerender = false;

// Guarded by middleware; locals.adminUser is set when this runs.
export const GET: APIRoute = async ({ locals }) => {
  const admin = (locals as { adminUser?: { username: string; csrfToken: string } }).adminUser;
  if (!admin) return new Response(JSON.stringify({ success: false }), { status: 401, headers: { 'Content-Type': 'application/json' } });
  return new Response(JSON.stringify({ success: true, username: admin.username, csrf_token: admin.csrfToken }), {
    headers: { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' },
  });
};
```

- [ ] **Step 4: login.astro cleanup**

Remove the displayed default-credentials block (~lines 95-99). In the login script: drop `localStorage.setItem('admin_token', ...)`; add `localStorage.removeItem('admin_token');` on page load (hygiene); on success keep redirect to `/admin/dashboard` (cookie set server-side). If the page stores csrf in sessionStorage for later, drop that too — pages fetch it from `/api/admin/session` (Task 6).

- [ ] **Step 5: Verify + commit**

`npm run build` → exit 0. Dev: seed local admin (hash-password.mjs output INSERT), POST /api/admin/login with wrong password → 401; right password → 200, response has Set-Cookie admin_session with HttpOnly/SameSite=Lax (inspect headers), body has csrf_token but NO session token; local D1 `SELECT * FROM sessions` shows the row; verify the legacy migration: seed a user with the unsalted-SHA-256 hash of a password, login → 200 and password_hash now starts with `pbkdf2$`.

```powershell
git add src/pages/api/admin/login.ts src/pages/api/admin/logout.ts src/pages/api/admin/session.ts src/pages/admin/login.astro
git commit -m "feat(auth): cookie sessions, PBKDF2 verify with transparent migration, no dev fallback"
```

---

### Task 3: Middleware guard + CSRF enforcement

**Files:**
- Modify: `src/middleware.ts` (read fully — auth guard goes BEFORE the existing Sentry wrapper logic)

- [ ] **Step 1: Add the guard**

```ts
import { SESSION_COOKIE, SESSION_HOURS, timingSafeEqual } from './lib/admin-auth';

const PUBLIC_ADMIN_PATHS = ['/admin/login', '/admin/reset-password', '/api/admin/login'];
const MUTATING = new Set(['POST', 'PUT', 'PATCH', 'DELETE']);

function isGuardedAdminPath(pathname: string): boolean {
  if (PUBLIC_ADMIN_PATHS.some((p) => pathname === p || pathname.startsWith(p + '/'))) return false;
  return pathname === '/admin' || pathname.startsWith('/admin/') || pathname.startsWith('/api/admin/');
}
```

Inside `onRequest`, before the existing Sentry branch:

```ts
const pathname = context.url.pathname;
if (isGuardedAdminPath(pathname)) {
  const isApi = pathname.startsWith('/api/');
  const db = context.locals.runtime?.env?.DB;
  const deny = () =>
    isApi
      ? new Response(JSON.stringify({ success: false, error: 'Unauthorized' }), { status: 401, headers: { 'Content-Type': 'application/json' } })
      : context.redirect('/admin/login', 302);

  if (!db) {
    // fail CLOSED: no DB binding means no way to verify — never fail open
    return isApi
      ? new Response(JSON.stringify({ success: false, error: 'Service unavailable' }), { status: 503, headers: { 'Content-Type': 'application/json' } })
      : context.redirect('/admin/login', 302);
  }

  const token = context.cookies.get(SESSION_COOKIE)?.value;
  if (!token) return deny();

  const session = await db
    .prepare(
      "SELECT s.user_id AS userId, s.csrf_token AS csrfToken, s.expires_at AS expiresAt, u.username FROM sessions s JOIN admin_users u ON u.id = s.user_id WHERE s.token = ? AND s.expires_at > datetime('now')"
    )
    .bind(token)
    .first<{ userId: number; csrfToken: string; expiresAt: string; username: string }>();
  if (!session) return deny();

  if (isApi && MUTATING.has(context.request.method)) {
    const header = context.request.headers.get('X-CSRF-Token') ?? '';
    if (!session.csrfToken || !timingSafeEqual(header, session.csrfToken)) {
      return new Response(JSON.stringify({ success: false, error: 'CSRF token missing or invalid' }), { status: 403, headers: { 'Content-Type': 'application/json' } });
    }
  }

  (context.locals as Record<string, unknown>).adminUser = {
    id: session.userId,
    username: session.username,
    csrfToken: session.csrfToken,
  };

  // sliding renewal when less than half the window remains
  const msLeft = new Date(session.expiresAt.replace(' ', 'T') + 'Z').getTime() - Date.now();
  if (msLeft < (SESSION_HOURS / 2) * 3600 * 1000) {
    const renew = db
      .prepare("UPDATE sessions SET expires_at = datetime('now', ?) WHERE token = ?")
      .bind(`+${SESSION_HOURS} hours`, token)
      .run()
      .catch(() => {});
    context.locals.runtime?.ctx?.waitUntil?.(renew);
  }
}
```

CRITICAL details: the exclusion list runs FIRST (login endpoint must never self-deadlock); `datetime('now')` comparisons work because sessions.expires_at stores sqlite `YYYY-MM-DD HH:MM:SS` strings (lexicographic = chronological); the guard runs before Sentry wrapping so 401/403s don't enter Sentry's request handler at all (they're plain responses, no exceptions). Keep the existing Sentry logic untouched after the guard.

- [ ] **Step 2: Verify (dev, empirical)**

With a seeded local admin: unauthenticated GET /api/admin/contacts → 401 JSON; GET /admin/dashboard (no cookie, curl -I) → 302 Location /admin/login; login via UI → dashboard loads; POST to /api/admin/bookings PATCH without X-CSRF-Token → 403; with the header (from login response) → 200; /api/admin/login still reachable (200/401 by password, never 401-by-middleware). NOTE: the dashboard is still prerendered until Task 5 — if the 302 doesn't happen for it yet in `npm run dev` (dev always SSRs) note that production parity comes with Task 5.

- [ ] **Step 3: Commit**

```powershell
git add src/middleware.ts
git commit -m "feat(auth): middleware session guard + central CSRF for the admin surface"
```

---

### Task 4: Strip ad-hoc Bearer checks from 16 endpoints

**Files:** Modify (read each, remove ONLY the auth-check block + any now-unused token helpers/imports): `src/pages/api/admin/applications.ts`, `change-password.ts`, `client-projects.ts`, `client-users.ts`, `clients.ts`, `code-quality.ts`, `contract-milestones.ts`, `contract-templates.ts`, `contracts.ts`, `milestones.ts`, `pm-chats.ts`, `project-files.ts`, `project-updates.ts`, `push/send.ts`, `push/subscriptions.ts`, `content.ts`.

- [ ] **Step 1: For each file** — locate its auth guard (patterns: `request.headers.get('Authorization')`, `Bearer`, token verification queries) and remove it; handlers begin directly with their DB work. `change-password.ts` additionally: replace its SHA-256 hashing with `hashPassword` from `src/lib/admin-auth` and identify the user via `locals.adminUser.id` (set by middleware) instead of any token lookup.

- [ ] **Step 2: Verify** — `npm run build` exit 0. Grep: `Select-String -Path src/pages/api/admin/*.ts -Pattern "Bearer"` → only login.ts may mention it (if at all). Dev spot-check: with session cookie + CSRF header, PATCH /api/admin/contacts works; without cookie → 401 (middleware, not endpoint).

- [ ] **Step 3: Commit**

```powershell
git add src/pages/api/admin
git commit -m "refactor(auth): single middleware guard — remove 16 ad-hoc Bearer checks"
```

---

### Task 5: prerender=false on the static admin pages

**Files:**
- Modify: `src/pages/admin/dashboard.astro`, `src/pages/admin/applications.astro`, `src/pages/admin/contracts.astro`, `src/pages/admin/theme.astro` (+ sweep: any OTHER guarded page under src/pages/admin/ lacking `export const prerender = false` — glob and check; login + reset-password stay as they are).

- [ ] **Step 1:** Add `export const prerender = false;` to each frontmatter. Why: prerendered pages are static assets served around the worker — the middleware guard never runs for them in production.

- [ ] **Step 2: Verify** — `npm run build` exit 0; build output no longer lists those pages under prerendered routes (check the build log: they move to the server manifest); confirm via `Get-ChildItem dist -Recurse -Filter index.html | Select-String dashboard` → no static dashboard HTML in dist.

- [ ] **Step 3: Commit**

```powershell
git add src/pages/admin
git commit -m "fix(auth): SSR all guarded admin pages so the middleware can protect them"
```

---

### Task 6: Admin pages — session bootstrap + CSRF headers (part A: high-traffic pages)

**Files:** Modify: `src/pages/admin/dashboard.astro`, `contacts.astro`, `bookings.astro`, `testimonials.astro`, `estimates.astro`, `portfolio.astro`.

- [ ] **Step 1: Shared pattern per page** (each page's existing script gets this; adapt names to the page):

Replace the localStorage gate (`const token = localStorage.getItem('admin_token'); if (!token) ...redirect`) with:

```js
let CSRF = '';
async function initAdminSession() {
  const res = await fetch('/api/admin/session');
  if (!res.ok) { window.location.href = '/admin/login'; return false; }
  const data = await res.json();
  CSRF = data.csrf_token;
  return true;
}
```

Call it before the page's initial data load (`if (!(await initAdminSession())) return;`). Remove EVERY `Authorization: Bearer ...` header from fetches. Add `'X-CSRF-Token': CSRF` to every mutating fetch (POST/PUT/PATCH/DELETE). Logout buttons: `await fetch('/api/admin/logout', { method: 'POST', headers: { 'X-CSRF-Token': CSRF } }); localStorage.removeItem('admin_token'); window.location.href = '/admin/login';`

- [ ] **Step 2: Verify** — dev, logged in: each of the 6 pages loads data, a mutation works (e.g. booking status change, testimonial activate), logout works and bounces to login; logged out: direct page hit redirects (middleware).

- [ ] **Step 3: Commit**

```powershell
git add src/pages/admin
git commit -m "feat(auth): session bootstrap + CSRF headers — core admin pages"
```

---

### Task 7: Admin pages part B (remainder) 

**Files:** Modify: `src/pages/admin/applications.astro`, `clients.astro`, `chat.astro`, `pm-chats.astro`, `newsletter.astro`, `push-notifications.astro`, `code-quality.astro`, `contracts.astro`, `theme.astro`, `project/[id].astro`, `contacts/[id].astro` (sweep src/pages/admin for any remaining `admin_token` / `Authorization` references — finish them all).

- [ ] **Step 1:** Same pattern as Task 6 Step 1 on every remaining page.

- [ ] **Step 2: Verify** — `Select-String -Path src/pages/admin/**/*.astro -Pattern "admin_token|Authorization"` → zero hits (except the removeItem hygiene line in login.astro). Dev spot-check 3 pages incl. one mutation.

- [ ] **Step 3: Commit**

```powershell
git add src/pages/admin
git commit -m "feat(auth): session bootstrap + CSRF headers — remaining admin pages"
```

---

### Task 8: XSS repairs

**Files:**
- Create: `src/utils/escape-html.ts`
- Modify: `src/pages/admin/contacts.astro` (~696-711) + every admin page found by the sweep below.

- [ ] **Step 1: Canonical escaper** `src/utils/escape-html.ts`:

```ts
/** Escape user-controlled strings before HTML interpolation (admin client scripts). */
export function escapeHtml(s: unknown): string {
  return String(s ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}
```

- [ ] **Step 2: Sweep + fix** — `Select-String -Path src/pages/admin/**/*.astro -Pattern "innerHTML"` and inspect each hit: any template literal interpolating user-controlled fields (lead names, emails, messages, application fields, chat messages, subscriber emails, estimate descriptions) gets every such field wrapped in `escapeHtml(...)` (import from `@/utils/escape-html` in the page's processed script). `contacts.astro:696-711` is the known worst (full_name, email, phone, company, project_description). Attribute positions (`data-x="${...}"`, `title="${...}"`) need escaping too (the escaper covers quotes). Static/admin-authored content (service titles from config) may stay. Report every file:line fixed.

- [ ] **Step 3: Verify (empirical)** — local D1: insert a probe contact row with `full_name = '<img src=x onerror=window.__xss=1>'` and `project_description` containing `<script>window.__xss2=1</script>`; open /admin/contacts logged-in via Playwright: probe renders as text, `window.__xss`/`__xss2` undefined. Clean up the probe row.

- [ ] **Step 4: Commit**

```powershell
git add src/utils/escape-html.ts src/pages/admin
git commit -m "fix(security): escape user data in admin innerHTML rendering (XSS)"
```

---

### Task 9: Smoke-test guard

**Files:**
- Modify: `scripts/smoke-test.mjs`

- [ ] **Step 1:** Add to the checks array:

```js
// The admin wall must exist forever: unauthenticated admin API = 401.
{ path: '/api/admin/contacts', expectStatus: 401, contentType: 'application/json' },
```

- [ ] **Step 2: Verify** — `node scripts/smoke-test.mjs https://ohwpstudios.org` → the new check FAILS against current production (200 today — that's the vulnerability; the failure proves the guard detects it). Note in report; goes green post-merge. Other checks unchanged. Dev server: `node scripts/smoke-test.mjs http://localhost:4321` → the admin check passes (401).

- [ ] **Step 3: Commit**

```powershell
git add scripts/smoke-test.mjs
git commit -m "feat(ci): smoke-test the admin auth wall (401 required)"
```

---

### Task 10: Full verification + preview + merge gate (MANUAL)

**Files:** none (process)

- [ ] **Step 1: Local battery (Playwright)** — full e2e: login wrong password 401 + UI error; login right password → dashboard; cookie flags (HttpOnly, SameSite=Lax — Secure won't set on http://localhost, verify on preview); navigate 5 admin pages + 2 mutations; logout → page access redirects; direct API 401s; CSRF-less mutation 403; legacy-hash migration test; XSS probes inert; PUBLIC site regression: homepage loads, booking POST validation works, GA4 events fire (the middleware change touches every request — verify public paths are untouched), smoke vs dev all green.

- [ ] **Step 2: PR + preview** — push branch, PR, preview deploy. On the PREVIEW URL (which shares prod D1 — the real admin user): verify login with the real password works (legacy verify + transparent rehash happens HERE — after this the hash in prod D1 is PBKDF2), cookie Secure flag present, admin pages function, unauthenticated /api/admin/contacts → 401 on preview.

- [ ] **Step 3: USER GATE before merge** — explain: merging logs the admin out everywhere (old localStorage tokens dead); same password works; contacts/leads no longer publicly readable the moment deploy completes. On approval: merge → deploy → `node scripts/smoke-test.mjs https://ohwpstudios.org` all green INCLUDING the 401 check → production login once to confirm → update memory (admin-api-no-auth memory gets resolved status).

## Done means

- `GET https://ohwpstudios.org/api/admin/contacts` → 401 (and smoke-test enforces it forever).
- Every /admin page is SSR + middleware-guarded; localStorage gating gone.
- Sessions: httpOnly cookie, server-verified, 24h sliding, logout works.
- Passwords: PBKDF2 at rest after first login; no admin123 anywhere.
- Mutations without X-CSRF-Token → 403.
- Admin pages render hostile lead data inert.
