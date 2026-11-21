# Mobile Kodie review

Checked production styling and exercised a CSS-only correction in the isolated preview at http://localhost:8843/. Not deployed.

## Findings and fixes

- Existing mobile `right:0!important` overrode the intended panel gutter. Restored 16px right spacing.
- Global input bottom margin wasted composer space. Scoped mobile input spacing and 16px text now keep the message field and 48px send control aligned.
- Transcript flex buttons cramped labels. Visible transcript actions now use a two-column grid with 48px targets, or four columns in short landscape windows.
- Short viewports now use almost the full available dynamic viewport. The header minimize action remains available while the redundant floating launcher is hidden to prevent overlap with Copy. The launcher returns after minimizing.
- Added safe-area padding, non-shrinking controls, scrollable message/welcome regions and long-content wrapping.

## Verification

Final browser-emulated viewports: 320×568, 375×667, 390×844, 430×932, 667×375 and 390×400. The panel and all seven checked controls fit within their bounds; labels fit without horizontal clipping and targets meet 48px minimum heights. JSON reports and portrait/landscape screenshots are included here.

Isolated conversation: name entry, Start Chat, message submission, tailored quote reply, transcript Copy and clipboard contents, minimize/reopen and retained messages verified. Quote destination is the existing https://t.me/oh84dev with generic draft text. Existing WhatsApp/Telegram/email export handlers remain unchanged; external recipient selection, actual sends and device mail-client handoff were not performed. Physical device keyboard behavior was not tested; reduced-height emulation is not proof of native keyboard behavior.

Production was inspected without creating a test chat lead or sending messages. Only `src/styles/atelier-brand.css` changed; chat JavaScript, forms, endpoints, authentication, rate limiting, tenant/visitor ownership, secrets and database settings remain unchanged. Production remains on the previously approved release.

Build passed. Regression suite passed: 21 tests, 92 assertions, zero failures. Final additional change only hides the short-screen redundant launcher while open; the build and browser minimize/reopen/copy checks were repeated after that change.
