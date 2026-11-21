# Admin blue-and-gold — local design preview

Preview: http://127.0.0.1:8821/admin/dashboard
Local-only sign-in: http://127.0.0.1:8821/admin/login/
Username: preview
Password: studio-preview
Production has not been deployed or modified by this task.

## Design contract
Continue the approved identity with midnight #090d21, navy panel #141d3a, action blue #2d438e, champagne #e7c997, ivory #fffdf8 and supporting ink #182745. Fraunces is used for display headings and the wordmark; Segoe UI for dense controls, tables and labels. A shared Studio office masthead and workspace picker unify the separate admin layouts. Dark navigation frames ivory editing surfaces. Gold identifies primary actions and active navigation; semantic status colours remain distinct.

## Scope
All 21 admin pages use the new scoped presentation, including dashboard, contacts and detail, bookings, quiz leads, testimonials, newsletter, portfolio/editor, clients and projects, estimates, PM/live chat, applications, code quality, push notifications, contracts, theme settings, login and both password-recovery pages.

Added AdminBrandbar.astro and admin-atelier.css; wired the shared BaseLayout and seven standalone admin documents into the same brand system. Existing sidebars, navigation destinations, forms, modals, filters, tables, action buttons and handlers remain in their owning pages. Runtime-rendered records receive explicit styles, since those nodes do not receive Astro scope attributes. Corrected mobile live-chat overflow through CSS.

## Evidence
- Production build passed; 12 tests / 40 assertions / 0 failures.
- 63 browser layout checks: all 21 admin pages at 390, 768 and 1440px, no horizontal page overflow and shared branding present.
- Dashboard: all eight content sections switched and retained their controls.
- Portfolio: add-project editor opened and cancelled; original category/status selectors and edit/delete controls present.
- Theme: changing the primary colour updated the original live-preview variable; both font selectors populated. No settings saved.
- Workspace picker: all 16 destinations present; Escape closes and returns focus.
- Login password visibility and Forgot password navigation verified. No password reset requested.
- Source preservation: no control IDs removed and all existing page scripts unchanged across 21 pages; report in preservation-checks.json.
- Actual local middleware: anonymous admin API returns 401; isolated synthetic session returns 200; mutating request without CSRF returns 403 before the handler. Authentication, CSRF and API source files unchanged.

## Preview isolation
preview-server.mjs listens only on 127.0.0.1:8821. It proxies rendered pages from the local compiled Pages runtime at port 8820, supplies synthetic records, and blocks mutations other than its local synthetic login/logout. The underlying middleware still validates a session against a separate local D1 persistence directory. No authentication exception was added to the application. No production client/admin records, real login, emails, uploads, notifications, resets, payments or AI calls were used.

This read-only harness lets the reviewer inspect controls but does not establish successful production saves, exports, sends, deletes or provider delivery. Those handlers were preserved and are not exercised against live data here. Some review lists intentionally show empty states. Synthetic records and credentials live only in review tooling, outside the app/public build.

## Restart locally
From C:/dev/ohwpstudios:

1. bun run build
2. bunx wrangler d1 execute agency-db --local --persist-to .wrangler/admin-design/state --file docs/reviews/admin-blue-gold-2026-11-21/preview-seed.sql
3. bunx wrangler pages dev dist --persist-to .wrangler/admin-design/state --port 8820
4. In another terminal: bun docs/reviews/admin-blue-gold-2026-11-21/preview-server.mjs

The database name is the existing binding, but --local and the separate persistence path keep these synthetic rows in the review directory. Never run the preview seed against a remote database.
