# Remaining blue-and-gold pages — production release

Released 21 November 2026 following approval of the local preview.

- Production: https://ohwpstudios.org/
- Deployment: https://54043c09.ohwpstudios.pages.dev
- Deployed source: 1cf36e8, branch codex/premium-homepage.
- Previous deployment: https://96b1474c.ohwpstudios.pages.dev (source b410b10).
- Existing Cloudflare Pages direct upload retained. No GitHub push, migration, secret change or provider configuration change.

## Shipped
Approved blue-and-gold Portfolio, Services and shared public-page treatments; Services and Explore mega menus; branded client sign-in, dashboard, project-detail and agreement presentation; portal loading mark. Existing project tabs, file/contract controls, messaging, forms, newsletter, estimator and other navigation destinations remain in place.

Two existing portal issues were corrected in the approved preview: project cards now use standard links that survive sanitization, and PM chat reads the existing client_token key used by login. PM and Kodie launchers have distinct positions. Backend API/authentication handlers remain unchanged.

## Final checks
- Bun suite: 12 passed / 40 assertions / 0 failed.
- Strict shared-script TypeScript check, production build and application-source diff checks passed.
- Local and live smoke suites passed: Home, About, Contact, estimator, page-init/D1, invalid booking validation, admin protection and invalid contract handling.
- Before/after comparison: all 43 extracted homepage anchor destinations retained; all 34 linked internal pages returned success locally and in production.
- Actual client project-list, project-detail and PM-chat APIs returned 401 for unauthenticated requests, both locally and in production.
- Scanned the deployment bundle: synthetic preview credentials/token/workspace absent. The preview harness remains documentation/local tooling outside the application bundle.
- Live browser: Portfolio contains the three curated studio products; branded client login retains email, password and remember controls, with correct dark-on-ivory heading contrast.
- Live responsive checks: 18 combinations across Portfolio, service detail, Services directory, client login, About and estimator at 390/768/1440px. No horizontal overflow and branding present throughout.
- Live mobile mega menus: 14 Services links; panel inside viewport and scrollable; exclusive open behavior; Escape closes and returns focus to Explore.
- Live screenshots and JSON reports saved alongside this release note.

## Preservation and verification limits
No real enquiry, newsletter signup, payment, email, upload or AI request was sent. Authenticated portal sign-in, dashboard navigation, six tabs, upload-modal open/cancel and PM-chat open/close were exercised locally using synthetic preview data during review. Real authenticated production workflows and email/AI delivery were not re-tested end-to-end. Existing admin presentation is unchanged. Unrelated local settings, package scripts, database state and documentation edits were excluded from the source commit.
