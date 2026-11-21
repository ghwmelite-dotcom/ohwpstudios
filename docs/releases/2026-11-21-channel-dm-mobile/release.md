# Channel direct messages, mobile chat and credential hygiene

Released 21 November 2026 to https://ohwpstudios.org.

- Immutable deployment: https://d4f9ec4d.ohwpstudios.pages.dev
- Application commit: `a050301`.
- Repository security cleanup: `5eb9cc5`.
- Source pushed to `codex/premium-homepage`.

## Website release

Shared Telegram quote links now open https://t.me/HodgesCoStudios?direct. Homepage, Services, footer, Contact, chatbot, estimator, shared proposals and future estimator follow-ups inherit this destination. Footer labels show the new handle. Mobile chat includes the reviewed panel gutters, composer spacing, readable transcript grid, 48px targets, short-screen layout and landscape launcher overlap fix.

Telegram's public landing page retains the documented direct-message flag, but drops draft text. The estimator explicitly directs clients to copy their brief link; shared proposal pages add a Copy brief link control, accessible feedback and a manual-copy fallback. PDF/print, contact forms, bookings and existing transcript sharing remain available.

## GitGuardian investigation

The owner supplied an alert naming historical November 2025 Google/Resend key incidents and a Generic Password finding in `edf288c` on 21 November 2026. Inspection identified hardcoded synthetic passwords in `scripts/prepare-e2e.ts` and `scripts/check-site-flows.mjs`. These seeded and exercised isolated local accounts; they were not production credentials. They have been replaced with randomly generated per-sandbox credentials saved outside the repository by default. The checker requires the generated private credentials file.

An offline Gitleaks v8.30.1 scan examined 487 historical commits. It independently detected old Google/Resend keys in historical `wrangler.toml` revisions. The owner explicitly confirmed those provider keys were already revoked or rotated; provider dashboards were not independently checked. Git history was not rewritten and the historical values remain visible there. GitGuardian incidents were not dismissed or marked resolved by this work.

Already-tracked local Claude settings and a local Wrangler SQLite file were removed from the Git index, while local copies were retained. Ignore rules prevent reintroduction. A checksum-verified Gitleaks scanner and GitHub Actions workflow were added. Narrow allowlists cover public Web Analytics identifiers in two historical setup guides and a legacy password digest, not provider credentials. An IndexNow documentation example was converted to a placeholder. The custom rule also catches reusable password literals in code.

Final indexed-source rescan: **zero findings**. This does not mean old Git history is clean or independently prove historical revocation. No raw credentials are included in this release evidence.

## Validation and preservation

- Final production build passed.
- Regression suite: 21 passed, 96 assertions, zero failures.
- Seven additional real HTTP checks against a fresh sandbox with randomly generated admin/client credentials passed: login, cookie flags, authenticated session, CSRF rejection, tenant isolation and anonymous operator rejection.
- Production smoke suite: nine passed.
- Production access/validation probes: 14 passed.
- All 34 linked internal pages passed. All 44 baseline destinations retained, with the intentional old-personal-account to channel-DM replacement.
- Homepage, Contact and estimator form markup matches the previous immutable release after normalizing Cloudflare Rocket Loader markers.
- Browser: live quote destination, new footer handle, mobile panel fit, preserved control presence and minimize behavior verified. Successful chat, brief-copy/paste, transcript-copy and retained-conversation behavior were exercised in the isolated preview.

No production database migrations or record changes were performed. Existing authentication, CSRF, rate limiting, tenant/visitor ownership and private-route caching behavior remain unchanged. No real chat enquiries, emails, Telegram messages, payments or contracts were sent/created during production verification. Physical phone keyboard behavior and recipient-side delivery remain untested.

Application rollback target: https://ef08c9b0.ohwpstudios.pages.dev. Repository security cleanup should be retained during application rollback.
