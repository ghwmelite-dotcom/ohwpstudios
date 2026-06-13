# Contract-Signing Verification — Design Spec

**Date:** 2026-06-13
**Status:** Approved by user (design conversation, this session)
**Scope:** Replace guessable numeric contract URLs with unguessable tokens, add email-OTP identity verification before signing, and complete the (currently commented-out) "send contract" email delivery. Phase 3 sub-project #2 (after admin auth hardening, which shipped).

## Context (audited facts)

- Signing page `src/pages/contract/[id].astro` loads a contract by **numeric id** (`Astro.params.id`); a `token` param is read but never used. No auth, no verification — anyone with the URL can view and sign. Numeric IDs are enumerable (`/contract/1`, `/contract/2`, …).
- Sign API `src/pages/api/contract/sign.ts`: GET returns the contract by id to anyone (and sets `viewed_at`); POST records a signature from any `signer_name`/`signer_email`/`signature_data` with no check that the signer is the intended client. Captures IP + user-agent + `signed_at`.
- `contracts` table (`migrations/007_econtract_system.sql`): has `client_email TEXT NOT NULL` (the counterparty), `status` (draft/sent/viewed/signed/completed/cancelled), `signature_data`, `signed_ip`, `signed_user_agent`, `signed_at`. **No share_token.** `contract_signatures` table records signer_name/email/role/signature/ip/ua. `contract_number` is `CON-YYYY-NNN`.
- Admin send `src/pages/api/admin/contracts/send.ts`: sets status='sent', generates URL `/contract/{numeric_id}`, returns it for manual copy. **Resend email integration is commented out** — never delivers.
- Payments page `src/pages/contract/[id]/payments.astro` loads by numeric id too; signing does NOT gate payment.
- Email infra exists and works: `src/lib/email.ts` (`sendEmail`/`emailShell`/`emailButton`/`escapeHtml`), verified sender `OhWP Studios <noreply@ohwpstudios.org>`.
- Production has exactly **1 contract** (status 'sent', 0 signed) — backward-compat risk for retiring numeric URLs is negligible.
- Proposal token pattern (reference): `project_estimates.share_token`, page `/proposal/[token]`, lookup `WHERE share_token = ?`.

## 1. Secure access — token replaces numeric ID

### Migration (next number after 046 → 047)

```sql
ALTER TABLE contracts ADD COLUMN share_token TEXT;
ALTER TABLE contracts ADD COLUMN token_expires_at TEXT; -- nullable; null = no expiry
CREATE UNIQUE INDEX IF NOT EXISTS idx_contracts_share_token ON contracts(share_token);
```

(D1/SQLite cannot add a UNIQUE column inline; add the column then a UNIQUE index — matches the booking-rename pattern from migration 046.)

Backfill for existing rows is NOT done in SQL (can't call crypto in D1 SQL). Instead: a one-time guarded backfill at deploy — a tiny admin-only script step (Task in plan) runs `UPDATE contracts SET share_token = ? WHERE id = ? AND share_token IS NULL` with a generated token per row, via wrangler. New contracts get a token at creation time (see §3).

### Routing

- The existing `src/pages/contract/[id].astro` is **renamed** to `src/pages/contract/[token].astro` (and `[id]/payments.astro` → `[token]/payments.astro`); Astro allows only one dynamic segment per path level, so this single file owns the `/contract/<x>` route. `prerender = false`.
- That single file treats the param as a `share_token` and looks the contract up by `WHERE share_token = ?` (prepared). If the param is purely numeric OR no token matches, it renders an "invalid / moved link" state — a friendly message ("This contract link has moved — please use the secure link we emailed you, or contact us") with **no contract query result rendered**. The response is byte-identical for a numeric id vs an unknown token (no existence oracle, no enumeration). The page renders normally (HTTP 200) with the moved notice; the smoke test asserts that real contract content is ABSENT for a numeric URL.
- Token format for new contracts: `crypto.randomUUID().replace(/-/g,'')` (32 hex).
- Client-facing APIs (`/api/contract/sign`, payment init, milestones) accept the **token** to identify the contract, not the raw numeric id. Admin-side APIs (`/api/admin/contracts*`) keep using numeric id (they're behind the admin auth wall now).

## 2. Identity proof — email OTP

### New table (same migration 047)

```sql
CREATE TABLE IF NOT EXISTS contract_verifications (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  contract_id INTEGER NOT NULL,
  code_hash TEXT NOT NULL,        -- SHA-256 of the 6-digit code (codes are low-entropy + short-lived + attempt-capped)
  expires_at TEXT NOT NULL,
  attempts INTEGER NOT NULL DEFAULT 0,
  consumed_at TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE INDEX IF NOT EXISTS idx_contract_verifications_contract ON contract_verifications(contract_id);
```

### Flow

1. Client opens `/contract/<token>` → contract renders read-only; a "Sign this contract" CTA.
2. CTA → `POST /api/contract/request-code` `{ token }`:
   - Look up contract by token; if missing/already-signed/expired → generic error.
   - Rate limit: refuse if an unconsumed code for this contract was created < 60s ago (anti-spam to the client's inbox), and cap total codes per contract per hour (e.g. 6).
   - Generate a 6-digit numeric code, store `code_hash` = SHA-256(code), `expires_at` = now+10min, attempts=0, consumed_at=null. Invalidate prior unconsumed codes for this contract (mark consumed).
   - Email the code to the contract's **on-file `client_email`** (NOT a client-supplied address) via `email.ts`. Subject "Your OhWP Studios signing code". Body: the code, 10-min validity, "ignore if you didn't request this."
   - Respond `{ success: true }` generically (reveal nothing about contract state beyond "code sent if applicable" — but since the client already has a valid token, a clear "code sent to your email on file" message is fine UX).
3. Client enters code → the signing form's submit (`POST /api/contract/sign`) now requires `{ token, code, signer_name, signature_data }`:
   - Look up contract by token (not id).
   - Look up the latest unconsumed, unexpired verification for this contract; increment `attempts`; if attempts > 5 → invalidate (consume) and reject ("too many attempts, request a new code"). Compare SHA-256(submitted code) to `code_hash` (timing-safe). On mismatch → reject with remaining-attempts messaging.
   - On match: mark the verification `consumed_at`; proceed to record the signature.
   - `signer_email` is NOT taken from the form — it is the contract's `client_email` (the verified address). Record signature into `contracts` (signature_data, signed_at, signed_ip, signed_user_agent, status='signed') and `contract_signatures` (signer_name, signer_email = client_email, signer_role='client', signature_data, ip, ua) — same as today but with the verified email and a note that OTP was verified.
   - Idempotency: if already signed → reject ("already signed").
4. After signing: confirmation state; optionally email both client and admin a "contract signed" notification (admin notification yes — to ohwpstudios@gmail.com; client confirmation yes — to client_email). Reuse `email.ts`.

### Audit trail

The signed contract's defensible record = verified `client_email` (OTP-proven control of that inbox) + `signer_name` (typed) + signature image + `signed_ip` + `signed_user_agent` + `signed_at` + the consumed verification row (code issued to that email, verified at that time). This is materially stronger than today's "anyone typed anything."

## 3. Delivery — "Send" emails the secure link

- `POST /api/admin/contracts/send` (already guarded by the admin auth middleware): on send, ensure the contract has a `share_token` (generate + persist if null — this also covers contracts created before §1's creation-time token), set status='sent' + `sent_at` (existing), and **email the client** via `email.ts`: branded message, "Review & sign your contract" button → `https://ohwpstudios.org/contract/<token>`. Still return `contract_url` in the response as an admin fallback.
- Contract creation (`/api/admin/contracts` POST): generate `share_token` at insert so every new contract has one immediately.
- The one existing 'sent' contract: after deploy, admin clicks Send again → it generates+persists a token (if backfill didn't) and emails the secure link.

## 4. Out of scope

Signing gating payment (payments page moves to token URLs for non-enumerability but signing still doesn't block payment — separate concern); client-portal login for contracts (token+OTP IS the auth); multi-party / witness / countersignature flows (schema's `signer_role` left for a later add); SMS OTP; contract PDF generation.

## 5. Error handling

- OTP email send failure: the request-code endpoint reports a soft error ("couldn't send the code, try again") and does NOT mark the code consumed, so a retry works; capture to Sentry.
- All token/contract lookups: prepared statements; unknown token and numeric-id both render the identical "invalid/moved link" state (no existence oracle).
- Verification: attempts capped (5), codes single-use + 10-min TTL, re-request throttled (60s + 6/hr). SHA-256 hashed at rest, timing-safe compare.
- Signing after expiry/already-signed/invalid-code → clear, non-leaky messages.

## 6. Verification

- Migration applies on preview/prod cleanly; backfill token for the 1 existing row; new column UNIQUE-indexed.
- E2E on preview (real email to a test inbox): token link renders contract; numeric `/contract/1` → moved page with NO contract content; request code → arrives at on-file email; wrong code rejected with attempt cap; correct code unlocks → signature records with verified client_email + OTP audit; re-request throttled; admin "Send" emails the secure link; signed → admin + client notifications arrive.
- Smoke test: `GET /contract/1` (numeric) must NOT return contract data (assert a sentinel from the moved page, not contract title); `/api/contract/sign` GET without a valid token → not a contract leak.
- Preview-deploy gate; user approval before merge.
