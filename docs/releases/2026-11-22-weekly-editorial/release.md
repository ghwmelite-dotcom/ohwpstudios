# Weekly Workers AI editorial drafts — production release

Released 22 November 2026 at https://ohwpstudios.org.
Final Pages deployment: https://6421fee1.ohwpstudios.pages.dev
Application commits: 12c8c19, 3f2e60a, ce34d79 and 3488b0e.

## Active schedule and review gate

The separate hodges-studio-editorial Worker is deployed with exactly one trigger: `0 9 * * MON` (Mondays, 09:00 Accra/UTC). Normal first run: Monday 23 November 2026 at 09:00. workers.dev and preview URLs are disabled. Root Pages bindings, existing routes and security middleware were preserved. Admin → Blog Posts contains schedule status, run history, source provenance, review checklists, manual generation, pause/resume and a link into the existing article editor.

All automated inserts use prepared statements and force published=0 and published_at=NULL. Generated fields are independently validated and HTML-escaped into trusted templates. Sources, image paths, internal links, bylines and publication state cannot be supplied by the model. Two attempts maximum per weekly slot, atomic claim/lease, exact-content hash, duplicate title/slug checks, disabled-setting checks before generation and final persistence, bounded source retrieval and one model call per attempt. Publishing remains a separate authenticated human action using the existing editor and CSRF guard.

Workers AI model: @cf/meta/llama-3.3-70b-instruct-fp8-fast; maximum output 5,000 tokens. No Anthropic/OpenAI API key or third-party AI fallback was added. The account's existing Workers AI usage allocation applies; no plan upgrade was performed. No client/contact/chat records enter prompts or logs.

## Migration and preservation

Only additive migration 051_weekly_editorial_drafts.sql was applied. It creates settings and a run ledger; it does not rebuild or update existing application tables. Private before/after exports are in the ignored .wrangler/weekly-editorial-release folder. The comparison checked all 69 original tables: every original record remained unchanged, no indexes/triggers/views were lost, no sequences regressed and no new foreign-key violations appeared. All 22 published blog posts were retained. No generated canary post was published in production.

## Verification and limits

- Final production build passed; strict targeted TypeScript check passed.
- 34 tests / 158 assertions passed, including concurrent claims, private drafts, retry cap, pause during inference, deleted-post compatibility, expired leases, adversarial fields, source redirects/fallback allowlist, duplicate rollback, concise checklist labels and Accra scheduling.
- Final redacted Gitleaks scan passed with zero findings.
- All 34 linked live routes passed with no missing baseline destinations. New admin GET/POST routes reject anonymous calls; missing CSRF and invalid publish actions were rejected in the isolated authenticated test. Existing admin/client guards remain active.
- Browser verified pause/resume, source provenance, review link, unchecked publishing and the final wrapped layout. Screenshots are local QA artifacts only, intentionally not committed because they show unpublished generated content.
- All 19 configured references were successfully retrieved from Cloudflare runtime after hardening. W3C's canonical pages blocked Cloudflare requests, so verified official W3C GitHub source fallbacks were added. MDN has an official source fallback. MT5 references use accessible official MetaTrader help pages. Retrieved URL, timestamp and digest are recorded; source availability is not factual validation of model claims.
- A bounded production cron canary confirmed scheduled dispatch. Its failures exposed source availability and overly strict rejection of short checklist labels. Those defects were corrected. Failed canary history was retained with an explanatory review note; its exhausted slot is the preceding Monday week (16 November). The next normal weekly slot begins 23 November and is independent.
- Live Workers AI responses were inspected in isolated testing. A captured native response was replayed through the corrected validation and real Cloudflare D1 persistence path in a temporary QA database, producing one 667-word post with published=0. This is not represented as a successful final-version production scheduled inference; that first normal dispatch remains due 23 November. A separate local fixture verified public draft 404s and absence from blog/sitemap/llms indexes.
- Temporary minute-frequency canary scheduling was removed. Cloudflare API confirms only the Monday trigger remains. Remote preview/test sessions were stopped and the temporary QA D1 database was deleted. No public test endpoint was deployed.

AI output still needs human fact-checking, originality review and editorial polishing. Metadata length normalization and duplicate checks do not certify quality, legal compliance, search ranking or AI-engine citations. No automatic notifications, email broadcasts or publishing were introduced.

See docs/operations/weekly-editorial.md for operation, pausing, retries and maintenance. Evidence: live-checks.json, production-links.json, data-preservation.json and the content-free QA verification artifacts under docs/reviews/weekly-editorial-2026-11-22.
