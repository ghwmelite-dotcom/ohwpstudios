# Telegram quote flow and site reliability release

Released to production on 21 November 2026.

- Site: https://ohwpstudios.org
- Immutable deployment: https://c3887665.ohwpstudios.pages.dev
- Application source: `edf288c`
- Telegram destination: https://t.me/oh84dev

## Shipped

The estimator now prepares a saved, shareable project brief with a PDF and a Telegram handoff. Automatic public prices are removed from results, Kodie, qualification, shared briefs and follow-up emails. Previous private quote data and agreed client contract amounts are retained.

The release includes the reviewed PM assistant, client expiry/logout, visitor chat ownership, operator authentication/CSRF, qualification routing and admin file-management fixes. PM inference uses the existing Cloudflare Workers AI binding. No routes, secrets, credentials, client records or security settings were removed.

## Database preservation

A full production SQL export and native D1 Time Travel recovery bookmark were captured before migration. Backups and record-level verification data are stored outside the repository in the owner's private Codex documents directory. They are not uploaded with the website or committed to Git.

The three reviewed migrations were applied in one atomic D1 file-import operation:

1. `048_chat_visitor_sessions.sql`
2. `049_project_file_metadata.sql`
3. `050_project_scope_review.sql`

Production schema inspection identified an existing `update_project_estimates_timestamp` trigger. Migration 050 explicitly recreates it and preserves the AUTOINCREMENT high-water mark, including deleted IDs. A populated production backup was rehearsed through the actual local D1 runtime before the remote operation.

The post-migration production export was compared against the immediate pre-migration export:

- All original records across all 68 existing application tables matched exactly when projected onto their original columns.
- No existing indexes or triggers/views were lost.
- No ID sequences regressed.
- No new foreign-key violations were introduced.
- Existing names, client data, contracts, historic estimates, notes, timestamps and proposal share tokens were retained.

New file metadata columns were added/backfilled; original file names and timestamps remained unchanged. The budget CHECK constraint now accepts an unpriced `to-discuss` request without inventing a budget band.

## Verification

- Regression suite: **21 passed, 0 failed; 92 assertions**.
- Build and scoped strict TypeScript checks passed.
- Isolated HTTP flow suite from the approved preview: **13 groups passed**, including real local authentication, cookie/CSRF checks, tenant isolation, file persistence, visitor ownership, operator replies, qualification, Workers AI, saved briefs and both logout paths.
- Production smoke suite: **9 checks passed**.
- Production page audit: **34 linked internal pages**, **44 destinations**, no failures or missing baseline links.
- Production access/validation probes: **14 checks passed**. Anonymous admin/operator/client APIs reject access; admin dashboard redirects to login; malformed public inputs and unowned qualification requests are rejected before writes.
- Live browser: revised estimator, Telegram destination, Services mega menu, admin-login redirect and client-portal login verified. Screenshot: `live-quote-flow.jpg`.

Production verification did not create synthetic client accounts, project briefs or chat leads, send emails/Telegram messages, charge payments, sign contracts or modify live credentials. Successful authenticated workflows were exercised against isolated synthetic accounts before deployment; real production passwords were not requested.

## Operational notes

Apply neither the three migrations again nor historical seed migrations. The new columns and table already exist. Application rollback does not reverse database migrations; the expanded schema remains compatible with previous records. Any database recovery must use the retained backup/Time Travel checkpoint and account for newer legitimate activity.

Existing unrelated local changes to package scripts, Claude settings, local Wrangler state and earlier review/marketing artifacts were excluded from the application commit.

References used to verify migration behavior: [Cloudflare import/export documentation](https://developers.cloudflare.com/d1/best-practices/import-export-data/) and the project's pinned Wrangler 3.114.17 implementation of the atomic D1 file-import endpoint.
