# Kodie Telegram quote button release

Deployed on 21 November 2026 to https://ohwpstudios.org.

- Immutable deployment: https://ef08c9b0.ohwpstudios.pages.dev
- Application commit: `9e0162f`, pushed to `codex/premium-homepage`.

The approved gold Telegram quote button now sits immediately below Kodie's header and remains available before and during conversations. It uses the shared quote-link helper to open https://t.me/oh84dev with a generic project enquiry draft. It does not automatically transmit the conversation or visitor details. The previous small bottom quote link was replaced.

Only `src/components/Chatbot.astro` changed. The component's script blocks and all form markup were compared against the previous commit and match exactly. Messaging, history, qualification, export handlers, initialization, visitor ownership and access controls were not modified. No database migrations, secrets, infrastructure or security settings changed.

## Verification

- Final production build passed.
- Regression suite: 21 tests passed, 92 assertions, zero failures, including chat visitor ownership, forged-role filtering, tenant isolation, expiry and service worker private-route protections.
- Approved isolated preview: started a synthetic conversation, sent a quote question, received the existing tailored-quote reply, verified message composer and four transcript actions, minimized/reopened with messages retained, and reviewed desktop/mobile screenshots.
- Production: nine smoke checks and 14 access/validation probes passed.
- Production: all 34 homepage-linked internal pages returned HTTP 200; all 44 baseline destinations retained.
- Live browser: verified the new button, exact Telegram destination, `noopener noreferrer`, welcome form, composer/export control presence and minimize/reopen behavior. Screenshot saved as `live-chatbot.jpg`.

Live verification did not create chat leads, send messages or transcripts, generate a quote, send email or change credentials. Successful conversation flow was exercised against the isolated preview; production API behavior was checked through non-writing access and validation probes.

Rollback target for application code: previous deployment https://c73b4af5.ohwpstudios.pages.dev. This release performs no database operations.
