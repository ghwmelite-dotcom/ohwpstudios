# Contract-Signing Verification Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make contract signing secure: unguessable token URLs (no enumeration), email-OTP identity verification before a signature is accepted, and a completed "send contract" email flow.

**Architecture:** A migration adds `share_token` to `contracts` and a `contract_verifications` OTP table. The single dynamic page `contract/[token].astro` SSR-loads the contract by token (numeric/unknown → identical "moved/invalid" state, no data leak). Signing is a two-step API: `request-code` emails a 6-digit code to the contract's on-file `client_email`; `sign` re-verifies the code server-side before recording the signature with the verified email as the audit trail. Admin "Send" now emails the secure link via the existing `email.ts`. New contracts get a token at creation; the one existing contract is backfilled.

**Tech Stack:** Astro 4 hybrid + Cloudflare D1, WebCrypto (token + SHA-256 code hashing), `src/lib/email.ts` (Resend), existing `SignaturePad` component.

**Spec:** `docs/superpowers/specs/2026-06-13-contract-signing-verification-design.md`

**Verified current state:**
- `src/pages/contract/[id].astro`: frontmatter `const { id } = Astro.params;`; client script fetches `GET /api/contract/sign?id=${contractId}`, renders via `displayContract()` + `sanitizeHTML()`, form collects `signer-name`/`signer-email`/signature, POSTs `{contract_id, signer_name, signer_email, signature_data}` to `/api/contract/sign`.
- `src/pages/api/contract/sign.ts`: GET returns contract by numeric id to anyone (sets `viewed_at`); POST records signature from any name/email with no verification.
- `src/pages/api/admin/contracts/send.ts`: sets status='sent', builds `/contract/{numeric_id}`, Resend block commented out (lines 80-104).
- `src/pages/api/admin/contracts.ts`: POST inserts a contract (`CON-YYYY-NNN`), no token.
- `contracts` columns: id, contract_number, client_name, client_email (NOT NULL), client_company, title, description, content, total_amount, currency, status, sent_at, viewed_at, signed_at, signature_data, signed_ip, signed_user_agent, updated_at. `contract_signatures`: contract_id, signer_name, signer_email, signer_role, signature_data, signed_at, ip_address, user_agent. `contract_history`: contract_id, action, performed_by, changes, created_at.
- Highest migration: 046 → new is 047.
- Admin contract APIs are behind the middleware auth wall (shipped); client contract APIs (`/api/contract/*`) are public by design (token+OTP is their auth) — confirm they are NOT caught by the `/api/admin/` guard (they aren't; different path).
- `SITE_URL` env = `https://ohwpstudios.org` (wrangler.toml vars).

**Testing note:** no test framework (by design). Each task: `npm run build` + targeted dev/wrangler checks; OTP email tested end-to-end on the preview with a real inbox in the final task.

---

### Task 1: Migration 047 — token columns + verifications table

**Files:**
- Create: `migrations/047_contract_signing_verification.sql`

- [ ] **Step 1: Create the migration**

```sql
-- Secure, unguessable access to contracts (replaces enumerable numeric ids)
ALTER TABLE contracts ADD COLUMN share_token TEXT;
ALTER TABLE contracts ADD COLUMN token_expires_at TEXT;
CREATE UNIQUE INDEX IF NOT EXISTS idx_contracts_share_token ON contracts(share_token);

-- One-time email codes proving the signer controls the on-file client_email
CREATE TABLE IF NOT EXISTS contract_verifications (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  contract_id INTEGER NOT NULL,
  code_hash TEXT NOT NULL,
  expires_at TEXT NOT NULL,
  attempts INTEGER NOT NULL DEFAULT 0,
  consumed_at TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE INDEX IF NOT EXISTS idx_contract_verifications_contract ON contract_verifications(contract_id);
```

- [ ] **Step 2: Validate on a fresh local chain**

Do NOT run full `migrations apply` locally (known 007 local bug). Validate just this file against a reset local DB seeded with the base schema:

```powershell
Remove-Item -Recurse -Force .wrangler\state -ErrorAction SilentlyContinue
npx wrangler d1 execute agency-db --local --file migrations/001_initial_setup.sql
npx wrangler d1 execute agency-db --local --file migrations/007_econtract_system.sql
npx wrangler d1 execute agency-db --local --file migrations/047_contract_signing_verification.sql
npx wrangler d1 execute agency-db --local --command "PRAGMA table_info(contracts);" 
npx wrangler d1 execute agency-db --local --command "SELECT name FROM sqlite_master WHERE name IN ('contract_verifications','idx_contracts_share_token');"
```

Expected: `share_token` + `token_expires_at` present on contracts; both objects listed. (007 creates `contracts`; if 007 depends on earlier tables, also run any it references — if it errors on a missing table, run the intervening migrations it needs first; report which.)

- [ ] **Step 3: Commit**

```powershell
git add migrations/047_contract_signing_verification.sql
git commit -m "feat(db): contract share_token + contract_verifications (OTP) table"
```

---

### Task 2: Contract verification lib

**Files:**
- Create: `src/lib/contract-verify.ts`

- [ ] **Step 1: Create the lib**

```ts
/**
 * Primitives for secure contract access + email-OTP signing.
 * Token = unguessable URL secret. Code = short-lived 6-digit email OTP.
 */

function toHex(bytes: Uint8Array): string {
  return Array.from(bytes, (b) => b.toString(16).padStart(2, '0')).join('');
}

/** 32-hex unguessable share token for /contract/<token>. */
export function generateShareToken(): string {
  return crypto.randomUUID().replace(/-/g, '');
}

/** 6-digit numeric OTP (leading zeros preserved). */
export function generateCode(): string {
  const n = crypto.getRandomValues(new Uint32Array(1))[0] % 1_000_000;
  return n.toString().padStart(6, '0');
}

export async function hashCode(code: string): Promise<string> {
  const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(code));
  return toHex(new Uint8Array(digest));
}

/** Timing-safe equality for equal-length hex hashes. */
export function timingSafeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return diff === 0;
}

export const CODE_TTL_MIN = 10;
export const MAX_ATTEMPTS = 5;
export const RESEND_COOLDOWN_SEC = 60;
export const MAX_CODES_PER_HOUR = 6;
```

- [ ] **Step 2: Verify + commit**

`npm run build` → exit 0. Quick: `node -e "import('./src/lib/contract-verify.ts')"` won't run TS directly — instead trust the build. Sanity-check generateCode format mentally (6 digits, zero-padded).

```powershell
git add src/lib/contract-verify.ts
git commit -m "feat(contract): token + OTP verification primitives"
```

---

### Task 3: Token at creation + secure-link email on Send

**Files:**
- Modify: `src/pages/api/admin/contracts.ts` (POST insert — add share_token)
- Modify: `src/pages/api/admin/contracts/send.ts` (ensure token + email the link)

- [ ] **Step 1: Token at creation in `contracts.ts`**

Read the POST handler's INSERT. Add `share_token` to the column list and bind `generateShareToken()`:

```ts
import { generateShareToken } from '../../../lib/contract-verify';
// ...in POST, before the INSERT:
const shareToken = generateShareToken();
// add `share_token` to the INSERT columns and bind shareToken in the right position.
```

(Adapt to the file's actual INSERT shape; keep all existing columns.)

- [ ] **Step 2: Rewrite `send.ts` to ensure a token and email the client**

Replace the commented Resend block + the numeric URL with:

```ts
import { generateShareToken } from '../../../../lib/contract-verify';
import { sendEmail, emailShell, emailButton, escapeHtml } from '../../../../lib/email';
// (adjust relative depth: send.ts is src/pages/api/admin/contracts/send.ts → ../../../../lib/...)

// after fetching `contract` and the not-signed check, before/with the status update:
let token = contract.share_token as string | null;
if (!token) {
  token = generateShareToken();
  await db.prepare('UPDATE contracts SET share_token = ? WHERE id = ?').bind(token, contract_id).run();
}

const siteUrl = (locals.runtime?.env?.SITE_URL as string) || 'https://ohwpstudios.org';
const contractUrl = `${siteUrl}/contract/${token}`;

// ...keep the existing status='sent' UPDATE and history insert...

// email the client (non-fatal: contract is already marked sent)
try {
  await sendEmail(locals.runtime?.env ?? {}, {
    to: String(contract.client_email),
    subject: `Your contract from OhWP Studios — ${contract.title}`,
    html: emailShell(
      'Your contract is ready',
      `<p>Hi ${escapeHtml(String(contract.client_name).split(/\s+/)[0] || 'there')},</p>
       <p>${escapeHtml(message || 'Your contract is ready to review and sign.')}</p>
       <p>Contract <strong>${escapeHtml(String(contract.contract_number))}</strong>. When you click below you'll be asked for a quick verification code we email you, then you can sign.</p>
       ${emailButton(contractUrl, 'Review & sign your contract')}`,
    ),
  });
} catch (e) {
  console.error('contract send email failed:', e);
}

return new Response(JSON.stringify({ success: true, contract_url: contractUrl, message: 'Contract sent' }), { status: 200, headers: { 'Content-Type': 'application/json' } });
```

Delete the old `/*...*/` Resend block and the `/contract/${contract_id}` numeric URL line.

- [ ] **Step 3: Verify + commit**

`npm run build` → exit 0. Dev: a created contract row has a non-null `share_token` (insert one via the admin flow or check the SQL). Send (locally, no RESEND key → email skipped silently) returns `contract_url` with the token (not numeric).

```powershell
git add src/pages/api/admin/contracts.ts src/pages/api/admin/contracts/send.ts
git commit -m "feat(contract): token at creation; Send emails the secure signing link"
```

---

### Task 4: request-code endpoint (email OTP)

**Files:**
- Create: `src/pages/api/contract/request-code.ts`

- [ ] **Step 1: Create the endpoint**

```ts
import type { APIRoute } from 'astro';
import * as Sentry from '@sentry/cloudflare';
import { generateCode, hashCode, CODE_TTL_MIN, RESEND_COOLDOWN_SEC, MAX_CODES_PER_HOUR } from '../../../lib/contract-verify';
import { sendEmail, emailShell } from '../../../lib/email';

export const prerender = false;

const json = (b: object, s = 200) => new Response(JSON.stringify(b), { status: s, headers: { 'Content-Type': 'application/json' } });

export const POST: APIRoute = async ({ request, locals }) => {
  const db = locals.runtime?.env?.DB;
  if (!db) return json({ success: false, error: 'Service unavailable' }, 503);

  let body: { token?: string };
  try { body = await request.json(); } catch { return json({ success: false, error: 'Invalid request' }, 400); }
  const token = body.token;
  if (!token) return json({ success: false, error: 'Invalid request' }, 400);

  const contract = await db.prepare('SELECT id, client_email, status FROM contracts WHERE share_token = ?').bind(token).first();
  // Generic response regardless of existence/state to avoid an oracle, EXCEPT we can be specific once a valid token is held.
  if (!contract) return json({ success: false, error: 'This contract link is invalid or has expired.' }, 404);
  if (contract.status === 'signed' || contract.status === 'completed') {
    return json({ success: false, error: 'This contract has already been signed.' }, 400);
  }

  // throttle: 60s cooldown since the most recent code, and <= 6 codes/hour
  const recent = await db.prepare("SELECT created_at FROM contract_verifications WHERE contract_id = ? ORDER BY created_at DESC LIMIT 1").bind(contract.id).first<{ created_at: string }>();
  if (recent) {
    const ageSec = (Date.now() - new Date(recent.created_at.replace(' ', 'T') + 'Z').getTime()) / 1000;
    if (ageSec < RESEND_COOLDOWN_SEC) return json({ success: false, error: `Please wait a moment before requesting another code.` }, 429);
  }
  const hourCount = await db.prepare("SELECT COUNT(*) AS n FROM contract_verifications WHERE contract_id = ? AND created_at > datetime('now','-1 hour')").bind(contract.id).first<{ n: number }>();
  if (Number(hourCount?.n ?? 0) >= MAX_CODES_PER_HOUR) return json({ success: false, error: 'Too many code requests. Please try again later.' }, 429);

  // invalidate prior unconsumed codes, issue a fresh one
  await db.prepare("UPDATE contract_verifications SET consumed_at = datetime('now') WHERE contract_id = ? AND consumed_at IS NULL").bind(contract.id).run();
  const code = generateCode();
  const codeHash = await hashCode(code);
  await db.prepare("INSERT INTO contract_verifications (contract_id, code_hash, expires_at) VALUES (?, ?, datetime('now', ?))").bind(contract.id, codeHash, `+${CODE_TTL_MIN} minutes`).run();

  try {
    await sendEmail(locals.runtime?.env ?? {}, {
      to: String(contract.client_email),
      subject: 'Your OhWP Studios signing code',
      html: emailShell('Your signing code', `<p>Use this code to sign your contract — it expires in ${CODE_TTL_MIN} minutes:</p><p style="font-size:30px;font-weight:800;letter-spacing:6px;text-align:center;color:#241D17;">${code}</p><p style="font-size:13px;color:#8a7d68;">If you didn't request this, you can ignore this email.</p>`),
    });
  } catch (e) {
    Sentry.captureException(e);
    // un-issue so a retry can resend (don't strand the signer on a code they never got)
    await db.prepare("UPDATE contract_verifications SET consumed_at = datetime('now') WHERE contract_id = ? AND consumed_at IS NULL").bind(contract.id).run();
    return json({ success: false, error: "We couldn't send the code right now. Please try again." }, 502);
  }

  return json({ success: true, message: 'A verification code has been sent to the email on file for this contract.' });
};
```

- [ ] **Step 2: Verify + commit**

`npm run build` → exit 0. Dev (seed a contract with a token + client_email locally): POST `{token}` → 200 (email skipped without RESEND key — but the verification row is inserted: check `SELECT * FROM contract_verifications`). POST again immediately → 429 cooldown. POST unknown token → 404.

```powershell
git add src/pages/api/contract/request-code.ts
git commit -m "feat(contract): request-code endpoint emails a one-time signing code"
```

---

### Task 5: Rewrite sign.ts — token lookup + OTP-verified signing

**Files:**
- Modify: `src/pages/api/contract/sign.ts` (remove the open GET leak; POST requires token + code)

- [ ] **Step 1: Replace the file**

```ts
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

  const contract = await db.prepare('SELECT * FROM contracts WHERE share_token = ?').bind(token).first();
  if (!contract) return json({ success: false, error: 'This contract link is invalid or has expired.' }, 404);
  if (contract.status === 'signed' || contract.status === 'completed') {
    return json({ success: false, error: 'This contract has already been signed.' }, 400);
  }

  // latest unconsumed, unexpired code for this contract
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

  // code OK → consume it and record the signature
  await db.prepare("UPDATE contract_verifications SET consumed_at = datetime('now') WHERE id = ?").bind(v.id).run();

  const clientIP = request.headers.get('cf-connecting-ip') || request.headers.get('x-forwarded-for') || 'unknown';
  const userAgent = request.headers.get('user-agent') || 'unknown';
  const verifiedEmail = String(contract.client_email);

  await db.prepare("UPDATE contracts SET signature_data = ?, signed_at = datetime('now'), signed_ip = ?, signed_user_agent = ?, status = 'signed', updated_at = datetime('now') WHERE id = ?")
    .bind(signature_data, clientIP, userAgent, contract.id).run();
  await db.prepare("INSERT INTO contract_signatures (contract_id, signer_name, signer_email, signer_role, signature_data, signed_at, ip_address, user_agent, notes) VALUES (?, ?, ?, 'client', ?, datetime('now'), ?, ?, 'email OTP verified')")
    .bind(contract.id, signer_name.trim(), verifiedEmail, signature_data, clientIP, userAgent).run();
  await db.prepare("INSERT INTO contract_history (contract_id, action, performed_by, changes, created_at) VALUES (?, 'signed', ?, ?, datetime('now'))")
    .bind(contract.id, verifiedEmail, JSON.stringify({ ip: clientIP, otp_verified: true })).run();

  // notifications (non-fatal)
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
```

(The GET handler is intentionally DROPPED — the page now SSR-loads the contract by token in Task 6, so there's no open contract-fetch API.)

- [ ] **Step 2: Verify + commit**

`npm run build` → exit 0. Dev (seeded contract + a known code row): POST with wrong code → 400 + attempts increments; 5 wrong → 429 + consumed; correct code → 200, contract status='signed', `contract_signatures` row has `signer_email` = client_email + notes 'email OTP verified'. POST again → 'already signed'.

```powershell
git add src/pages/api/contract/sign.ts
git commit -m "feat(contract): OTP-verified signing; record verified email; drop open GET"
```

---

### Task 6: Page rename to [token] + moved-state + OTP UI

**Files:**
- Rename: `src/pages/contract/[id].astro` → `src/pages/contract/[token].astro` (git mv)
- Rename: `src/pages/contract/[id]/payments.astro` → `src/pages/contract/[token]/payments.astro` (git mv)
- Modify both renamed files.

- [ ] **Step 1: git mv both files**

```powershell
git mv src/pages/contract/[id].astro src/pages/contract/[token].astro
git mv "src/pages/contract/[id]/payments.astro" "src/pages/contract/[token]/payments.astro"
```

(If the `[id]` directory only held payments.astro, the empty dir is removed by git.)

- [ ] **Step 2: SSR the contract by token in `[token].astro` frontmatter**

Replace the frontmatter:

```astro
---
export const prerender = false;
import BaseLayout from '@/layouts/BaseLayout.astro';
import SignaturePad from '@/components/SignaturePad.astro';

const { token } = Astro.params;
const db = Astro.locals.runtime?.env?.DB;

// A purely-numeric param or an unknown token both resolve to the same "invalid
// link" state — no contract is rendered, no existence oracle.
let contract: any = null;
if (token && db && !/^\d+$/.test(token)) {
  contract = await db.prepare('SELECT * FROM contracts WHERE share_token = ?').bind(token).first();
  if (contract && !contract.viewed_at) {
    await db.prepare("UPDATE contracts SET viewed_at = datetime('now'), status = ? WHERE id = ?")
      .bind(contract.status === 'sent' ? 'viewed' : contract.status, contract.id).run();
    await db.prepare("INSERT INTO contract_history (contract_id, action, performed_by, created_at) VALUES (?, 'viewed', ?, datetime('now'))")
      .bind(contract.id, contract.client_email).run();
  }
}
const moved = !contract;
// Data passed to the client script (never includes signature_data/ip)
const contractView = contract ? {
  contract_number: contract.contract_number, title: contract.title, content: contract.content,
  status: contract.status, client_name: contract.client_name,
} : null;
---
```

Then: render a "moved/invalid" block when `moved` (a friendly message + "contact us" link, NO contract fields), and the existing contract UI otherwise. Inject `contractView` + `token` to the client script via `define:vars` (replace the old `contractId`/fetch approach). Keep `sanitizeHTML` + `displayContract` but feed it `contractView` directly instead of fetching `/api/contract/sign`.

- [ ] **Step 3: Add the OTP step to the signing UI (client script)**

Rework `handleSignature`/the form so signing is two-phase:
1. A "Send me a code" button → `POST /api/contract/request-code` `{ token }` → on success show a code input + "I've entered the code, sign now".
2. Submit → `POST /api/contract/sign` `{ token, code, signer_name, signature_data }` (NOTE: no signer_email — it's server-side). Show success/already-signed/invalid-code states from the response.

Remove the `signer-email` form field (identity is the on-file email; do not collect/POST it). Keep the name field + signature pad + terms checkbox. Show the masked target ("a code was sent to the email on file") without printing the full address.

- [ ] **Step 4: `[token]/payments.astro` — look up by token**

Change its frontmatter/param from numeric id to `token`; look the contract up by `share_token` (for the id needed by the milestones/payment APIs, resolve token→id server-side in the frontmatter and inject the numeric id to the existing payment JS, OR update the payment fetches to carry the token). Simplest: frontmatter resolves `token`→contract; if not found render the same "invalid link" state; inject the resolved numeric `contract.id` to the existing payment script so `/api/contracts/{id}/milestones` etc. keep working unchanged. Numeric/unknown token → invalid state, no data.

- [ ] **Step 5: Verify + commit**

`npm run build` → exit 0 (no route collision; `[token]` is the only dynamic seg under /contract). Dev: `/contract/<realtoken>` renders the contract; `/contract/1` and `/contract/bogus` render the identical "invalid link" page with no contract content; the signing flow shows the code step.

```powershell
git add src/pages/contract
git commit -m "feat(contract): token-only signing page with moved-state + OTP step"
```

---

### Task 7: Backfill the existing contract's token (remote D1)

**Files:** none committed (remote data op + verification)

- [ ] **Step 1: Generate a token and backfill the 1 row**

```powershell
$env:CLOUDFLARE_ACCOUNT_ID="ea2eb3a9813660dfca2a60e594858538"
# inspect: which contracts lack a token
npx wrangler d1 execute agency-db --remote --command "SELECT id, contract_number, status, share_token FROM contracts;"
```

For each row with `share_token IS NULL`, generate a 32-hex token locally (`node -e "console.log(crypto.randomUUID().replace(/-/g,''))"`) and:

```powershell
npx wrangler d1 execute agency-db --remote --command "UPDATE contracts SET share_token = '<token>' WHERE id = <id> AND share_token IS NULL;"
```

NOTE: this runs AFTER migration 047 is applied to remote (CI applies it on merge). So Task 7's remote backfill happens in the final task AFTER merge/deploy, OR pre-apply 047 to remote manually before backfill. Do it post-deploy in Task 8's production steps — keep this task's commands ready.

- [ ] **Step 2: Verify** — re-SELECT shows every contract has a non-null unique `share_token`. Record the token for the existing 'sent' contract so the user can be told its new URL (or just re-send it from admin, which emails the link).

---

### Task 8: Smoke guard + verification + preview/merge gate (MANUAL)

**Files:**
- Modify: `scripts/smoke-test.mjs`

- [ ] **Step 1: Smoke guard for numeric enumeration**

Add a check that a numeric contract URL does NOT return contract content. Since the page renders 200 with the "invalid link" message, assert the moved sentinel is present and a contract-only string is absent:

```js
// Numeric/guessed contract URLs must NOT expose a contract (enumeration closed).
{ path: '/contract/1', mustContain: 'link is invalid' },
```

(Use the exact sentinel text from the moved-state block in `[token].astro` — keep them in sync.)

- [ ] **Step 2: Build + local verify**

`npm run build` → exit 0. `node scripts/smoke-test.mjs https://ohwpstudios.org` → the new `/contract/1` check FAILS against current prod (today it still serves via the old numeric page until merge) — note it; goes green post-merge. Locally it should pass once the page is built.

- [ ] **Step 3: Commit**

```powershell
git add scripts/smoke-test.mjs
git commit -m "feat(ci): smoke-guard contract numeric-URL enumeration"
```

- [ ] **Step 4: PR + preview E2E (real inbox)**

Push, open PR, preview deploys (migration 047 NOT yet on the shared prod D1 until merge — so on the preview, contract token lookup works only after 047 is applied; the preview shares prod D1 which lacks 047 until merge → token columns missing → frontmatter query errors. THEREFORE: apply 047 to remote D1 manually BEFORE preview testing, since it's purely additive and safe: `npx wrangler d1 execute agency-db --remote --file migrations/047_contract_signing_verification.sql`. Then CI's `migrations apply` on merge will no-op it as already-applied — verify migration tracking treats it as applied or is idempotent via the IF NOT EXISTS / additive nature; if CI re-runs ADD COLUMN it will error on duplicate column — so after manual apply, mark 047 as applied in the d1_migrations tracking table, mirroring the booking baseline pattern from Phase 1, OR rely on `migrations apply` detecting it. SAFEST: apply 047 manually now, then insert its row into d1_migrations so CI skips it.)

Then on the preview, with the existing contract backfilled (Task 7): open `/contract/<token>` → contract renders; `/contract/1` → invalid page; click "send code" → code arrives at the contract's client_email (use a contract whose client_email is a test inbox you control, or temporarily set the existing contract's client_email to your address); enter wrong code → rejected with attempts; correct → signs, status='signed', admin + client notifications arrive; re-open → already-signed.

- [ ] **Step 5: USER GATE → merge → production verify**

Present preview results. On approval: merge → deploy (migration step no-ops 047 if baselined) → backfill any remaining null tokens (Task 7 commands) → `node scripts/smoke-test.mjs https://ohwpstudios.org` green incl. `/contract/1` → the user's one existing contract: re-send from admin to deliver its new secure link. Update memory.

## Done means

- `/contract/<32hex-token>` is the only way to reach a contract; `/contract/1` (or any numeric/unknown) shows an invalid-link page with zero contract data, and the smoke test enforces it.
- Signing requires a 6-digit code emailed to the contract's on-file client_email; wrong codes are capped and codes expire; the recorded signature carries the verified email + OTP audit note.
- Admin "Send" emails the client their secure link.
- Every new contract gets a token at creation; the existing one is backfilled.
