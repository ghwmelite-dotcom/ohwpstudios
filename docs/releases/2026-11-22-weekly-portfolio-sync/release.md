# Weekly GitHub portfolio drafts — production release

Released 22 November 2026 at https://ohwpstudios.org.
Application commit: 2a79f40. Pages deployment: https://77fa0fbb.ohwpstudios.pages.dev.
Worker: hodges-studio-portfolio-sync, version 3e1693df-627c-476c-bfb7-8fc519ae56e6.

## Active automation

The independent Cloudflare Worker has exactly one cron: `0 10 * * MON` (Mondays, 10:00 Africa/Accra/UTC). Next normal scheduled run: 23 November 2026, 10:00. workers.dev and preview URLs are disabled and the fetch handler returns 404. The existing blog Worker remains on `0 9 * * MON`; root Pages AI and DB bindings are preserved. No desktop reminder or duplicate scheduler was created.

A controlled first production sync completed for the preceding week key, 2026-11-16, using the same engine against production D1 through the existing authenticated Cloudflare API. It discovered 65 eligible public repositories, mapped eight existing approved projects without editing them, inserted 20 private/unfeatured drafts and deferred 37. Repeating it returned `existing`, with no duplicates. The next Monday uses a fresh slot. This controlled run is not represented as an observed normal scheduled dispatch; that first dispatch is due 23 November.

Public portfolio remains exactly the same eight approved studies. All original 22 project rows retain their original fields and publication flags (14 historical examples remain retained and publicly excluded under the previous release). Total project rows are now 42: 22 original rows plus 20 drafts. Future imports never publish automatically.

## Preservation and security

Only additive migration 053 was applied: settings, weekly audit and stable repository-ID mapping tables. All original records in 71 tables compare unchanged before/after migration and after the first sync. Indexes, triggers, views and sequences were retained; no new foreign-key violations were introduced. Private snapshots are in ignored `.wrangler/portfolio-sync-release`, never committed.

Existing project fields and states are never updated. GitHub IDs and canonical source URL matching avoid duplicate imports and preserve renames; null project pointers retain deletion tombstones, including deletion during retrieval. New metadata cannot supply publication flags, outcomes, customer names, metrics or executable HTML. No README bodies, repository scripts, model prompts, private repositories or new credentials are used.

Bounded public discovery/reverification, response-size/page/time limits, manual redirects, fixed owner and prepared statements are enforced. One weekly claim/lease, two explicit attempts maximum, pause/lease guards and atomic writes prevent partial or overlapping imports. Errors record static codes only. `/api/admin/portfolio-sync` retains central session/CSRF protection and no-store status responses. Admin adds schedule/history, pause/resume and Sync this week; the curated import and complete project editor remain intact.

## Verification

- 55 tests / 363 assertions pass; strict targeted TypeScript includes the engine, admin client, API and scheduled Worker; production build and diff checks pass; redacted Gitleaks scan reports zero findings.
- SQLite tests cover draft-only insertion, metadata injection, unchanged owner edits and publication states, canonical source adoption, stable rename identity, tombstones/deletion during retrieval, private/foreign/forked/archived/disabled/empty exclusions, visibility changes, overlapping invocations, exhausted retries, pause during fetch, stale lease, atomic rollback, pagination and scheduling boundaries.
- Isolated local Cloudflare Pages runtime imported 20 real GitHub projects as drafts. Every new detail returned 404 anonymously. Admin login, status, pause/resume, repeated-sync protection and auth/CSRF negative checks passed.
- Temporary remote Cloudflare Worker and synthetic D1 verified native GitHub discovery and D1 persistence: 20 inserted, published=0, featured=0; repeated invocation returned existing. Both temporary resources were deleted after testing.
- Browser verified the admin controls, recent run counts, successful pause/resume and repeat-run message. A 390px viewport fits without horizontal overflow; controls remain at least 44px high. Screenshots in docs/reviews/weekly-portfolio-sync-2026-11-22 are isolated QA evidence, not production account screenshots.
- 39 live routes and all five previously added illustrations pass; public project slugs remain exactly the original reviewed eight. Existing 14 admin/client/chat validation/authentication checks pass; the new sync endpoint rejects anonymous GET and POST with 401.
- Cloudflare API confirms the production Pages deployment, both independent cron schedules, preserved AI/DB bindings, and disabled public Worker/preview URLs.
- No production password resets, temporary privileged sessions, payment transactions or email sends were introduced for testing. Authenticated browser controls were tested in isolation; live owner sign-in was not bypassed.

Operations, review steps and error handling: docs/operations/weekly-portfolio-sync.md.

## Rollback

Previous Pages deployment: https://89527b27.ohwpstudios.pages.dev. Pause the sync setting or remove its cron before rolling back the Worker. Additive tables and review drafts can remain; do not restore a full snapshot over later client activity. Do not routinely delete identity mappings, since their tombstones protect owner deletion choices.
