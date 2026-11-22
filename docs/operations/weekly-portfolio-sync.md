# Weekly public GitHub portfolio sync

Admin → Portfolio contains the weekly sync panel and draft filter. The separate `hodges-studio-portfolio-sync` Cloudflare Worker runs Mondays at 10:00 Africa/Accra/UTC (`0 10 * * MON`); the existing blog Worker remains at 09:00. No Codex desktop job, GitHub token, AI model call or new credential is required.

## Review and controls

- New public, owned, non-fork, active, nonempty repositories become unpublished/unfeatured drafts. Up to 20 new drafts per run; the run history shows deferred backlog.
- Open Drafts → Edit project. Review the GitHub description, title, source and project-specific concept cover; write the actual project story and verify any claims. Publishing uses the existing project editor's explicit Published checkbox.
- Pause/resume controls the database setting checked before claiming and at commit. Pausing during retrieval prevents project insertion. The cloud trigger stays installed while paused.
- Sync this week starts an unconsumed weekly slot, or explicitly retries a failed/paused run. A completed week cannot be rerun. Two attempts maximum per week; an old running lease can be replaced after 20 minutes. Exhausted failures remain in history and the next Monday starts a fresh slot.
- Only new records are inserted. Existing titles, descriptions, links, images, results, metrics, slugs, order, feature/publication flags and review edits are never refreshed from GitHub.
- Stable GitHub repository IDs preserve identity across renames. An imported/adopted project that is deleted retains a null project pointer (tombstone); later syncs will not recreate it. Sync does not delete or unpublish existing work when a repository is archived, moved or made private.

## Boundaries and diagnostics

Fixed owner: ghwmelite-dotcom. Discovery uses the public GitHub REST user-repository endpoint with explicit pagination, bounded JSON responses/timeouts and a maximum of 10 pages. New candidates are independently reverified in groups of four. No arbitrary URLs, redirects, README bodies, repository scripts, model instructions or live homepage links are fetched/copied.

D1 migration 053 adds settings, run audit and repository identity tables; existing application tables are not rebuilt or rewritten. Claims and identity mappings are unique. All project writes, identity mappings and run completion share an atomic batch with lease/enabled guards. Fields and SQL are fixed and values bound. Operational errors store static codes, not provider bodies, credentials or customer records.

`/api/admin/portfolio-sync` GET lists schedule/status/history with no-store. POST accepts only pause, resume or sync and uses the existing session and CSRF middleware. The scheduled Worker has no production HTTP route, workers.dev URL or preview URL.

Common errors: `github_rate_limited` (wait for GitHub's public quota to recover, then retry this week); `github_fetch_failed`/`github_unavailable` (provider unavailable or redirect refused); `github_response_invalid`/`github_response_too_large`/`github_pagination_limit` (unexpected or bounded response); `sync_storage_or_network_failed` (inspect Cloudflare logs without publishing record values). Review the audit history before retrying; do not delete run/identity rows as a routine reset.

References: [GitHub repository API](https://docs.github.com/en/rest/repos/repos#list-repositories-for-a-user), [Cloudflare cron triggers](https://developers.cloudflare.com/workers/configuration/cron-triggers/), [D1 limits and batch behavior](https://developers.cloudflare.com/d1/platform/limits/).


## Repository cover art

New drafts receive distinct, versioned SVG covers based on public repository names, IDs and a bounded project discipline. Cover families include health, education, agriculture, finance, trading, civic systems, AI, software, data, property, security, media, browsers and sports. Compositions, palettes and typography remain consistent with the studio identity while varying between projects. They are labelled illustrations, not product screenshots or evidence of outcomes.

The image renderer reads no CMS/client records and makes no outbound requests. It accepts bounded repository-style names, safe numeric IDs and an allowlisted discipline; SVG content is escaped, has no script/foreign objects/external resources and uses a restrictive CSP. Versioned URLs are immutable; a future renderer design change should use a new URL version. No AI call or new credential is required.

Existing project images remain owner-controlled. The 22 November cover correction upgraded only 20 sync-created shared placeholders. Its guarded, idempotent refresh preserves custom featured images, custom thumbnails, source edits and publication states. Routine weekly runs still insert new drafts only; they do not refresh or overwrite existing covers.
