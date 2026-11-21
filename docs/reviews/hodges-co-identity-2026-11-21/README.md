# Hodges & Co. Studios — identity preview

Local compiled preview: http://127.0.0.1:8798/brand/identity-preview.html
Production has not been changed by this work.

## Design
Midnight blue, cobalt lighting, champagne gold, ivory, and Fraunces typography continue through About, Contact and the estimator. A bespoke shared-stem H/C monogram and serif wordmark replace the public masthead/footer logo; the same mark appears in the studio seal, favicon, app icon and Kodie launcher. Outlined SVG wordmarks are in public/brand. Existing domain, email addresses and social destinations remain unchanged.

## Preserved behaviour
Navigation destinations, public routes, forms, estimator steps, guided/managed engagement choices, proposal sharing, PDF generation, chat message and export contracts, newsletter, portals and backend handlers remain in place. Theme/install controls now use delegated event binding before optional observability loading. Mobile chat placement is corrected to remain inside the viewport. Print output hides the footer and chat.

## Verification
- Production build passed; strict TypeScript checks passed for estimator and shared feature scripts.
- Bun: 12 tests passed, 40 assertions, 0 failures.
- 34 linked internal routes returned HTTP 200 locally; all 39 existing homepage anchor destinations retained.
- Home/About/Contact/Estimator checked at 360, 390, 768, 1024 and 1440px; no horizontal page overflow.
- Contact four-step success, estimator three-step success/results/share link and chat message flow exercised using intercepted synthetic API responses. No real enquiry, email or paid AI request sent.
- Estimator PDF downloaded successfully; estimator-fixture.pdf contains synthetic preview data.
- Light/dark theme verified; print media hides header/footer/chat. Mobile chat verified against the compiled preview: panel inside a 390px viewport.
- Screenshots: about.png, contact.png, estimator.png, kodie.png, kodie-mobile.png, identity.png.

## Review scope and limits
This is an uncommitted local design preview. Authenticated portal flows and real email/AI delivery were not re-tested. No production database migrations, provider configuration changes, deployments, payments or outreach occurred. Other pre-existing working-tree edits were preserved.
