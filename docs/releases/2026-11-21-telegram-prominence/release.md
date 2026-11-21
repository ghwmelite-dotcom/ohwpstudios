# Prominent Telegram contact release

Deployed on 21 November 2026 to https://ohwpstudios.org.

- Immutable deployment: https://c73b4af5.ohwpstudios.pages.dev
- Application commit: `f185d81`, pushed to `codex/premium-homepage`.
- Confirmed contact destination: https://t.me/oh84dev.

## Changes

The homepage hero and enquiry section now feature Telegram actions. The shared Services layout promotes Telegram in its hero and closing invitation while retaining booking, portfolio and contact-form links. The shared footer features a gold paper-plane invitation, the Telegram handle and a separate contact-form link. Existing directory, newsletter, legal and social links remain.

Only four existing presentation files and a shared SVG component changed. No database migrations, data operations, authentication changes, secrets or infrastructure/security configuration changes were performed.

## Final checks

- Production build passed.
- Regression suite: 21 tests passed, 92 assertions, zero failures. Includes contact persistence/validation, estimator, chat ownership, client expiry, tenant isolation and service worker privacy/freshness checks.
- All 34 homepage-linked internal pages returned HTTP 200; all 44 baseline destinations retained.
- Production smoke suite: nine checks passed.
- Production access and validation probes: 14 passed, zero failures.
- Forms on the homepage, Contact, a Service page and Services directory match the previous immutable release after normalizing Cloudflare Rocket Loader's per-response inline-handler markers. Their observed security headers also match the immediate pre-release baseline.
- Live browser confirmed homepage Telegram action, original enquiry anchor, four required enquiry fields, unchanged `/api/contact/submit` action, Services primary Telegram buttons, booking/portfolio actions and footer contact-form alternative.
- Desktop and mobile visual review completed on the approved preview; live screenshots saved alongside this report.

No real contact enquiries, emails or Telegram messages were sent during production verification. No synthetic client records were created. Authenticated production workflows were not re-exercised with real credentials for this presentation-only release.

Deployment followed the project's pinned Wrangler 3.114.17 and existing Pages Direct Upload workflow: [Cloudflare deployment documentation](https://developers.cloudflare.com/pages/how-to/use-direct-upload-with-continuous-integration/).
