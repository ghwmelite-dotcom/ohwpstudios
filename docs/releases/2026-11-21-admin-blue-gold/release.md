# Admin design and H/C favicon — production release

Released 21 November 2026 after approval of the admin preview and the request to match the favicon to the revised logo.

- Production admin: https://ohwpstudios.org/admin/login
- Deployment: https://31c7cafc.ohwpstudios.pages.dev
- Deployed source: 969824a, branch codex/premium-homepage.
- Previous deployment: https://54043c09.ohwpstudios.pages.dev, source 1cf36e8.
- Existing Cloudflare Pages direct-upload workflow retained; no GitHub push.

## Shipped
Blue-and-gold presentation across all 21 admin pages, shared Studio office header/page picker, branded authentication/recovery pages and loading mark, navy navigation, ivory editing panels, matching forms/tables/modals and runtime-rendered records. All original page scripts and control IDs are preserved. API, middleware, session validation and CSRF source files are unchanged.

The approved H/C vector mark now supplies the root SVG favicon, a 16/32px ICO fallback, 180px Apple touch icon and existing installed-app icon sizes in SVG/PNG. Existing icon paths are retained. Apple touch metadata and Windows tile colour match the revised brand. scripts/generate-brand-icons.mjs reproduces these assets from the approved vector.

## Final validation
- 12 tests passed / 40 assertions / 0 failures. Strict shared-script TypeScript checks and final production build passed.
- Source preservation: no control IDs removed and all original scripts unchanged across all 21 admin pages; prior preview evidence includes eight dashboard sections, portfolio modal open/cancel, theme live-preview inputs and workspace-picker keyboard behavior.
- Local responsive evidence: 63 combinations (21 pages x 390/768/1440px), no horizontal overflow.
- Fresh compiled app: 37 access-control checks passed — 18 anonymous redirects, 18 synthetic local authenticated renders, and rejection of a mutating request without CSRF before its handler.
- Production: 18 protected admin routes redirect to login. Anonymous admin session API returns 401; the synthetic local review session is rejected in production with 401. All 20 checks passed.
- Local and production smoke suites passed: public core pages, page-init/D1, booking validation, admin API protection and invalid contract handling.
- All 34 linked public routes returned success before/after deployment. All 43 extracted homepage anchor destinations retained.
- Live admin login: branded masthead, username/password/remember fields, new favicon/touch links and readable heading contrast verified. Mobile 390px view has no overflow. Screenshots saved alongside this note.
- Review fixtures, synthetic credentials/session token and preview proxy markers were absent from the deployment bundle.

## Icon cache
The first live check caught a stale cached root SVG favicon. Wrangler OAuth did not permit the zone cache-purge API (401), so the targeted purge was completed through the signed-in Cloudflare dashboard. Only the 21 revised icon/browserconfig URLs were purged; no zone settings were changed. Subsequent SHA-256 comparisons confirmed the live SVG favicon, ICO, Apple touch assets and checked app PNGs exactly match the approved local files. Results are in icon-checks.json.

## Preservation and limits
No production database migration, seed, secret change, password reset, message, email, upload, notification, payment or AI call occurred. Real authenticated production admin saves/sends/deletes were not exercised; these workflows retain their existing code and were inspected through the isolated synthetic preview. The local preview database/session is separate from production and the preview harness is outside the deployed app. Unrelated local settings, package scripts, database state and documentation edits were excluded from the source commit.
