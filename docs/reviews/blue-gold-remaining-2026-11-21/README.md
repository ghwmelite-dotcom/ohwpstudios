# Blue-and-gold remaining pages — local review

Preview: http://127.0.0.1:8810/portfolio
Services: http://127.0.0.1:8810/sitemap-pages/
Client portal: http://127.0.0.1:8810/client/login/
Synthetic local login: preview@example.com / studio-preview
Production is unchanged. This work is not deployed or committed.

## Design contract
Continue the approved identity: midnight #090d21, panel #141d3a, cobalt #344c9e, champagne #e7c997, ivory #fffdf8, supporting blue #c1cbe4. Fraunces carries display headings and the existing wordmark; Segoe UI carries navigation, forms and project information.

Portfolio opens as an editorial collection with an oversized title and studio seal, followed by the existing live products and published CMS work. Services and the other public content/tools share midnight mastheads and ivory working surfaces. Mega menus retain their groups/actions with a gold top rule, clear section headings and accessible scrollable mobile layouts. The portal has a distinct, quieter workspace treatment, a split sign-in introduction, readable form panel, blue project surfaces and gold progress/active controls. Existing semantic status colours remain meaningful.

## Implemented scope
- Shared public palette, headers, project collection/detail accents, service/technology/industry/solution pages and existing booking, quiz, audit/analyzer and content pages.
- Both Services and Explore mega menus; no links or actions removed.
- Client sign-in, dashboard, project detail, all six tabs, upload modal and PM/Kodie controls. Shared agreement/payment presentation receives the workspace palette; signing/payment logic is unchanged.
- Branded portal loading mark and masthead.
- Fixed existing dashboard project navigation: sanitization removed inline click handlers, so cards now use standard keyboard-accessible links.
- Separated overlapping PM/Kodie launchers; PM requests now read the same client_token key as the login flow. Authentication/API handlers and access controls were not changed.

## Verification
- Production build passed. Existing Bun suite: 12 passed / 40 assertions / 0 failed.
- Local smoke suite passed against the actual compiled app, including D1/page-init, booking validation, admin protection and invalid contract handling.
- 34 linked internal routes returned success. All 43 extracted homepage anchor destinations retained.
- Public responsive matrix: 30 checks at 390, 768 and 1440px, including Portfolio, service directory/detail, blog, booking, quiz, analyzer, audit, careers and client login. No horizontal overflow. See layout-checks.json.
- Mega-menu mobile bounds/scrolling, exclusive opening, Escape closure and focus return checked. All 14 Services-menu links retained.
- Portal sign-in/password visibility, logout, project navigation, six tabs, file-upload modal open/cancel and PM chat open/close checked with synthetic fixtures.
- Project-detail mobile width checked at 390px with no overflow. PM and Kodie controls no longer overlap.
- Source preservation check: no IDs or static links removed from changed feature components. Actual unauthenticated client project endpoints still return 401.

## Preview isolation and limitations
preview-server.mjs is a local-only review harness, separate from the application build. It proxies compiled pages from port 8802, supplies synthetic client/project data and blocks other write requests. It does not bypass production authentication or modify real client records. No real login, upload, message, enquiry, payment or email was sent. Real authenticated production flows remain to be checked after review/approval. The existing admin UI is unchanged.

To restart the review: build with bun run build, run bunx wrangler pages dev dist --port 8802, then run bun docs/reviews/blue-gold-remaining-2026-11-21/preview-server.mjs in a second terminal. The harness listens only on 127.0.0.1:8810.
