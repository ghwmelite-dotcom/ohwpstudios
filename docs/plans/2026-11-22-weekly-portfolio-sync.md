# Weekly public GitHub portfolio drafts

Schedule: Mondays 10:00 Africa/Accra (UTC), separate Cloudflare Worker, no public Worker URL. Website feature, not a duplicate Codex desktop reminder.

Scope: fixed owner ghwmelite-dotcom; paginate public-owned repositories from GitHub REST with no credential; exclude forks, archived, disabled and empty repositories. Reverify each new candidate before insertion. Copy only bounded name/description/language metadata; use a labelled generic studio illustration. Never fetch README, execute repository content, invent case-study results, or auto-publish.

Persistence: additive settings, weekly run ledger and stable repository-ID mapping. Existing entries matched by canonical GitHub URL (case-insensitive, optional trailing slash/.git). Preserve all existing fields, slugs, publishing states and deletes; ledger tombstones prevent recreation of removed drafts. New slug includes GitHub ID, category is Repository projects, published=0/featured=0. Twenty new drafts maximum per run; record deferred backlog for the next weekly run. Bounded pages, payloads, timeouts and requests, fail closed on provider failures.

Reliability: atomic weekly claim/lease, bounded explicit retry (two attempts), no overlapping run writes, atomic D1 batch, enabled/lease guards on persistence, pause during retrieval prevents insert. Audit static error codes, counts and timestamps only. Do not overwrite previous successful runs.

Admin: existing authenticated /api/admin session and CSRF guards, no-store status, pause/resume/sync-this-week actions, recent history, source link and clear draft-review instructions. Preserve curated import and full project management.

Evidence gates: real SQLite tests for duplicate discovery, renames, deletions, collisions, edited/unpublished existing records, malformed/private sources, provider failures/redirects, concurrent claims, retries, pause/lease race and rollback; production build/strict checks/secret scan; isolated Cloudflare runtime and browser verification before enabling. Deployment uses additive migration only and whole-database before/after record comparison. First controlled run creates drafts only; verify public portfolio unchanged. No new credentials or changed access controls.
