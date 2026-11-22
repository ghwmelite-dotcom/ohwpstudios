# CMS alignment and editorial preview — 22 November 2026

Status: local review preview. No deployment, production database change, migration, credential rotation or production publishing performed.

Preview: http://localhost:8850/blog and http://localhost:8850/admin/dashboard. The open admin tab uses a disposable local account; it is unrelated to the production admin account. The sandbox path is recorded locally in `.wrangler/studio-cms-preview-path.txt`; random test credentials stay outside the repository.

## Changes

- Retained the site-wide blue/gold loader from the preceding task, including reduced-motion and no-JavaScript fallbacks.
- Added 24 typed CMS fields matching the approved homepage, homepage disciplines, About and footer invitation. Approved copy is the fallback, independently of historical seed placeholders. Public prose is escaped. About and Contact render on request so edits are visible.
- Removed misleading legacy statistics from the active editor. Source-controlled branding and contact destinations display the approved configuration. Existing portfolio, catalogue, team, values, contacts, clients and other tools remain accessible.
- Footer copy is rendered on the server for dynamic pages. A public read-only endpoint supplies only the invitation title and kicker to prebuilt pages; it uses a 60-second cache and preserves the rendered fallback on connection failure. It contains no private/admin data.
- Fixed admin draft visibility, sanitized-away edit/delete inline handlers, and the cover field's rejection of local SVG URLs. The existing editor can save and toggle publishing.
- Added an idempotent six-article importer. It creates drafts and never overwrites an existing slug. Six posts were published only in this disposable preview to permit public review. This is a prepared editorial pack, not a recurring generation service.
- Updated article/breadcrumb structured data, current publisher identity, publication dates, canonical metadata, escaped JSON-LD, draft 404s, visible FAQs and source citations. Fixed the blog sitemap's static-build/database mismatch. Replaced the obsolete static AI index with a published-only dynamic index and updated the companion description.

## Editorial pack

1. Business website or web app in Ghana: which do you need? — 804 words.
2. How to write a software project brief that gets a useful quote — 818 words.
3. Building with Codex or Claude Code: what guided development includes — 803 words.
4. Mobile money payments on a Ghana website: design for confirmation — 798 words.
5. TradingView indicator or MetaTrader bot: choosing what to build — 772 words.
6. AI assistants for Ghanaian businesses: start with one useful workflow — 927 words.

Counts include headings and reference/CTA text. Each has a distinct intent, original prose, blue/gold diagram cover, answer summary, practical guidance, visible FAQs, internal links, source links and an AI-assisted preparation disclosure. Examples are labelled hypothetical. No fixed prices, invented client results or unsupported trading returns. Quotes follow human scope review.

Research uses official Google Search documentation, W3C accessibility guidance, Paystack payment-channel/verification/webhook documentation, OpenAI Codex security guidance, Claude Code security documentation, TradingView Pine strategies, MQL5 testing and Cloudflare Workers AI data-usage documentation. Sources are linked in the relevant articles. Useful content and correct technical indexing support discoverability; neither search rankings nor AI citations are guaranteed. No claim is made that general commercial FAQs receive Google's restricted FAQ rich results.

## Evidence

- Final production build passed using `bun --bun node_modules/astro/astro.js build`. The first Node-run attempt failed locally allocating WebAssembly code memory; no source workaround or infrastructure change was made.
- `bun test tests`: 24 passed, 112 assertions. New in-memory tests cover approved defaults, recognised text fields, idempotent import, edit preservation, drafts, first publication dates, duplicate slugs and input validation.
- `integration-results.json`: authenticated local HTTP tests cover anonymous rejection, CSRF, import twice, owner-edit preservation, public draft 404s, publication, all six covers, parseable JSON-LD, preview noindex, published indexes and CMS round trips. Approved copy restored.
- `site-flows.json`: 13 local flow checks passed, including real PBKDF2 admin login, cookie flags, CSRF, client isolation, file ownership, chat ownership/operator impersonation rejection, estimator saved scope/current channel direct-message link and logout revocation.
- The isolated sandbox has no live Workers AI binding or mail keys. The PM assistant's configured-unavailable 503 and tenant boundaries were checked, not a live provider response. This limit is explicit in the test. Existing fixture checks were corrected to use the generated client password and current Telegram channel rather than the old personal username.
- `baseline-links.json`: 34 local linked routes returned 200. This records the present preview, not a full authenticated audit of every historical route.
- Browser: admin sign-in, CMS save with public rendering, restoration, import without duplicates, article edit, unpublish and republish, category filter and article navigation verified. Local SVG cover validation fix was verified by a successful browser save. Narrow-screen DOM geometry was checked at 390px; the browser's screenshot surface did not reliably reflect emulation, so no mobile visual certification is claimed. Temporary emulation was reset.
- Final Gitleaks scan: zero findings, output redacted. Authentication, CSRF, rate-limit and tenant/visitor enforcement source was not changed. This is targeted regression evidence, not a new comprehensive security audit.

Screenshots: `admin-blog.png` and `blog-desktop.png`. Full-page captures can omit entrance/reveal content below the viewport; review the running preview for the footer.

## Production follow-through after approval

Deploy the reviewed build, import the starter articles using the protected admin action, inspect existing slugs/drafts and publish the reviewed posts. No migration is needed. Existing production articles and client records must be preserved; never run the disposable test seed on production. Verify production indexing and published-only sitemap contents after publishing. Search Console submission/performance monitoring has not been performed.
