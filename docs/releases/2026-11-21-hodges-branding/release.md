# Hodges & Co. Studios — production release

Released 21 November 2026 after approval of the blue-and-gold pages and new branding.

- Production: https://ohwpstudios.org/
- Deployment: https://96b1474c.ohwpstudios.pages.dev
- Source: b410b10 (local branch codex/premium-homepage).
- Previous deployment: 15631386-c192-4560-8e67-018bc510bb46, source 5dc0420.
- Existing Cloudflare Pages direct-upload workflow retained. No GitHub push, database migration, secret change or infrastructure rename.

## Shipped
Blue-and-gold About, Contact and project estimator; shared Hodges & Co. Studios masthead/footer identity; H/C monogram, favicon and regular/maskable app icons; matching Kodie launcher and chat welcome styling. Existing website, email and social addresses remain unchanged. Mobile chat positioning corrected. Theme and install controls bind before optional observability loading.

## Release checks
- 12 tests passed, 40 assertions, no failures; strict TypeScript script checks and production build passed.
- Local and live smoke suites passed: homepage, About, Contact, estimator, page-init/D1, invalid booking validation, unauthenticated admin protection and invalid contract handling.
- All 34 linked internal pages returned HTTP 200 before and after release. All 43 extracted anchor destinations retained. Baseline/local/production link reports are saved alongside this document.
- Live browser checks across Home, About, Contact and estimator at 390, 768 and 1440px: no horizontal overflow; two logo lockups, one footer and chat launcher on every checked page.
- Live estimator navigated through all three steps, including guided-build selection, without submission. New chat opened/closed with correct accessible expanded state. Mobile chat bounds confirmed within a 390px viewport.
- Full contact success, estimator results/sharing/PDF and chat response flows were checked locally during preview using synthetic intercepted responses. PDF download evidence is in docs/reviews/hodges-co-identity-2026-11-21.
- Live About/estimator/mobile-chat screenshots saved here.

## Preservation and limits
All existing routes, feature controls, portal entry points and API contracts remain in place. No paid AI call, real enquiry, newsletter signup, payment or email was sent during verification. Authenticated portal workflows and real email/AI delivery were not re-tested end-to-end. Unrelated local settings, database state, package scripts and other documentation edits were excluded from the source commit.
