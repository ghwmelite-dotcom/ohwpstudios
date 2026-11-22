# Studio CMS, site-wide loading and editorial release

Released 22 November 2026 to https://ohwpstudios.org.

Final immutable deployment: https://392f1c06.ohwpstudios.pages.dev
Application commits: cda93a8 and aaf40c7 on codex/premium-homepage.

The reviewed site-wide blue/gold loader, current studio content editors, blog workflow fixes, six editorial covers, published-only search indexes and structured data are deployed. A live check caught mismatched breadcrumb field names; aaf40c7 corrected their canonical URLs and made article schema image URLs absolute before final verification.

Six approved articles were added and published through parameterized D1 queries using the existing authorised Cloudflare session. INSERT ON CONFLICT DO NOTHING protected existing slugs. No migrations, settings changes, session changes, client changes or credential changes were performed. The 16 original blog records were compared and preserved byte-for-byte at the value level.

Private full database backups before/after are under the ignored .wrangler/studio-release-2026-11-22 directory. The redacted data comparison checked 69 tables: all original records unchanged, no missing indexes/triggers/views, no sequence regressions and no new foreign-key violations. Only six blog records were added.

Final validation:
- Production build and 24 tests / 112 assertions passed.
- Redacted Gitleaks scan passed with zero findings before deployment.
- 34 linked production routes returned 200; no baseline destinations missing.
- 22 additional live checks verified key public/admin/client pages, exactly one managed loader on those pages, anonymous API rejection, all six published article pages/covers, canonical URLs, indexable production metadata, parseable BlogPosting/BreadcrumbList schemas, sitemap and llms index contents, and the public-only footer response.
- Browser confirmed the new live studio blog shows all 22 posts: six new and 16 retained.

Authenticated editing, client isolation, CSRF, chat ownership and logout regression checks were performed in the disposable local sandbox before shipping. Production authenticated editing, live Workers AI inference and email sending were not repeated; no synthetic client/chat/contact records were written into production. Search rankings and AI citations have not been measured or promised.

Evidence: publication.json, data-preservation.json, production-links.json and live-checks.json. No private database export, authentication token, password or credential file is part of this release documentation.
