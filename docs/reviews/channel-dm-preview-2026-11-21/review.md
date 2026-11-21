# Channel direct messages and mobile chat preview

Preview: http://localhost:8846/ — not deployed. Production continues to use @oh84dev.

The shared Telegram destination is now https://t.me/HodgesCoStudios?direct, following [Telegram's documented channel DM links](https://core.telegram.org/api/links#monoforum-links). The helper preserves the valueless direct flag when adding optional draft text. Homepage, footer, Services, Contact, chatbot, estimator, proposal and future estimator email links inherit the shared destination. Footer labels use the configured username; chatbot subtitle now reads “Private quotes · Studio inbox”. No personal Telegram references remain in application source or tests.

The mobile CSS fixes from the reviewed preview are included: 16px gutter, aligned composer without inherited bottom margin, 48px controls, two-column transcript actions, compact short-screen layout, four-column landscape actions and no launcher overlap. Chat JavaScript handlers, APIs, visitor/tenant ownership, authentication, rate limits and private-route caching controls are unchanged.

Telegram's public landing page retains the direct flag in both its app and web links, but drops draft text. The estimator now explicitly instructs clients to copy the brief link before opening the private chat. Shared proposals have a Copy brief link action, read-only manual-copy fallback and accessible status. Copy was verified by pasting the link into the isolated chat composer without sending it. Existing proposal PDF, estimator PDF/print, form, booking and transcript features remain.

Checks: production build passed; 21 regression tests passed (96 assertions); 34 linked internal pages passed; all 44 baseline destinations preserved except the intentional Telegram destination replacement. Browser verified the updated chat pricing reply, link destination, brief copying and control fit at 320×568, 390×844 and 667×375. Previous mobile review also covers 375×667, 430×932 and reduced-height 390×400.

No deployment, database migrations, secrets, credentials or infrastructure settings changed. Tests used isolated synthetic data and did not send real Telegram messages or emails. Actual device keyboard behavior and recipient-side Telegram message delivery were not tested. External transcript sharing handlers are retained; no transcript was sent externally.
