# Site flow verification and Telegram quote policy

Date: 21 November 2026. Status: fixed and verified in an isolated local Pages/D1 environment; **not deployed**. No production records, credentials, contracts, payments or security settings were modified. Production inspection was read-only.

## Owner decisions

- Keep the multipage site and existing portal/admin features.
- Use Cloudflare Workers AI for the project assistant; no Anthropic key or API calls.
- Do not publish automatic service prices. Prepare a project brief and direct prospective clients to **https://t.me/oh84dev** for requirements analysis and a tailored estimate.
- Keep prior quote data and agreed client contract amounts intact. The new policy concerns public marketing and automated quotes, not signed client records.

## Verification results

| Check | Result |
|---|---|
| Bun regression tests | 21 passed, 0 failed; 90 assertions |
| Real HTTP flow groups against local Pages/D1 | 13 passed, 0 failed; see `http-results.json` |
| Authenticated admin read endpoints | 26 returned 200 with required parameters; see `admin-read-results.json` |
| Qualification access | Owner 200; unrelated visitor 403 |
| Public link audit | 44 destinations, 34 linked internal pages; no missing baseline destinations or failed routes |
| Production smoke | Existing nine smoke checks passed before local changes |
| Production link baseline | 43 destinations, 34 linked internal pages; no failed routes |
| Build | Passed, Astro production build |
| Type checks | Scoped strict TypeScript checks passed for the estimator/browser scripts and changed typed auth/AI helpers; not a claim of repository-wide Astro type cleanliness |
| PDF | New two-page brief downloaded in-browser and parsed with pypdf; contains Telegram destination and no `$`, `USD` or `GHS` price tokens |
| Responsive checks | 390px estimator and project-chat layout checks had no horizontal page overflow; overrides reset |

Local database writes used only synthetic users/projects/leads outside the repository under a disposable temporary Pages directory. The runtime had no email or payment secrets. Workers AI requests used the existing Cloudflare account with synthetic project data. Qualification's no-key fallback was exercised locally.

## Browser flows exercised

1. Real admin username/password login using PBKDF2; existing HttpOnly/Secure/SameSite cookie; dashboard load; hero save and persistence after reload.
2. Real client login; own project dashboard/card; project overview, milestones and file list; file-reference submission; populated private assistant history; dashboard question shortcut; real Workers AI answer with correct project context; close/reopen history; client logout back to login.
3. Three-step estimator; saved brief; shareable page; PDF download; Telegram destination and URL-encoded draft containing the saved brief URL.
4. Public chatbot onboarding, real Workers AI reply, follow-up memory of Accra and Paystack; price enquiry returns human-review guidance and the confirmed Telegram account instead of an automatic quote.
5. Historical shared proposal no longer displays its old USD 12,000–22,000 amount. Its original database record remains intact.

Screenshots: `project-assistant.jpg`, `chatbot-memory.jpg`, `telegram-quote-policy.png`, `telegram-project-brief.png`. Final sample PDF: `project-brief.pdf`. These contain synthetic QA data, not client records.

## Corrections

- Replaced the dead Anthropic-only PM endpoint with the existing Cloudflare Workers AI binding.
- Corrected ISO/SQLite date comparisons for client-token expiry and PM rate limiting.
- Checked project ownership before creating PM conversations; accepted validated numeric Astro route parameters; returned the most recent 50 history messages in stable order.
- Fixed PM history rendering: keep the typing indicator attached before inserting messages, and prevent sends during history loading.
- Fixed dashboard examples to select an owned project and prefill its private assistant rather than opening the public chatbot.
- Added server-side client logout/token revocation and wired both client pages to it.
- Added visitor-bound HttpOnly chat credentials. Conversation IDs alone cannot read/write other visitors' chats or qualify their leads. Operator APIs now use the existing admin session and CSRF enforcement, including trailing-slash routes.
- Fixed qualification's static prerender configuration, which previously caused HTTP 405 on POST.
- Reconciled admin project-file metadata with the actual production schema. Existing file names/timestamps remain; versions, parent references and visibility work. Private files are excluded from client responses and PM context.
- Rejected malformed estimator/client inputs and executable file URL schemes.
- Removed public service price tables and fixed conversion assumptions from Kodie, qualification and the SaaS service FAQ.
- Public estimator responses, shared briefs, PDF and follow-up email do not include automatic prices. Historical generated scope text is filtered for quoted monetary amounts at the public boundary.
- Added direct Telegram links to the estimator result, shared brief, Contact page and chatbot, preserving transcript-sharing controls and existing enquiry/booking flows.
- New admin scope requests display “Awaiting studio quote”. Previous stored estimates are preserved.

## Deployment requirements — not executed

Apply only the new reviewed migrations, not historical seed scripts:

1. `048_chat_visitor_sessions.sql`: additive visitor access table.
2. `049_project_file_metadata.sql`: additive metadata columns and a legacy-name/timestamp backfill. Production column definitions were checked read-only before preparing it.
3. `050_project_scope_review.sql`: expands the budget CHECK constraint to support `to-discuss`. SQLite requires a table rebuild. Export/back up D1 and confirm the owning schema before applying it. The migration explicitly copies every existing field, ID, quote, status, admin note, timestamp and share token, then recreates all four existing indexes. A regression test compares a populated historical record before/after byte-for-field equality.

Deploy the application only after these migrations. Migration 050 must run as a D1 migration/atomic operation; do not manually execute partial statements. Preview data/state is disposable and must not be uploaded into production.

## Limits

- Actual production admin/client passwords were neither requested nor used. Successful login/save/logout testing used real application code against isolated synthetic accounts.
- No live email delivery, payment, refund, legally binding signature or Telegram message was sent. Telegram's documented username/draft URL was validated; delivery in a user's Telegram client was not exercised.
- The static link/admin read sweeps are not a guarantee that every possible workflow or integration is fault-free, nor a full penetration test.
- Existing in-memory rate-limit infrastructure was retained; distributed-rate-limit architecture was outside this change.
- Ghana pricing research was saved outside this public repository at `C:/Users/USER/Documents/Codex/2026-11-21/hodges-studios/ghana-pricing-research.md`. Its suggested rates are internal research, not an approved public rate card.

## Repeatable checks

`bun test`

`bun run build`

`bun scripts/prepare-e2e.ts` creates a fresh isolated directory, copies the build and prints its location. Execute its `seed.sql` only against a new local D1 persistence directory, then run `wrangler pages dev` from that directory. Never copy production secret files into it. Add the existing Workers AI binding/account only when intentionally testing provider integration.

`bun scripts/check-site-flows.mjs http://localhost:<port> <output.json>` refuses non-loopback hosts and performs synthetic writes plus inference calls when AI is configured.
