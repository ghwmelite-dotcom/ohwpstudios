# Readable loader caption and distinct repository covers

Released 22 November 2026 at https://ohwpstudios.org.
Application commit: b4bea6c. Pages deployment: https://01be584b.ohwpstudios.pages.dev.
Repository sync Worker version: 0fbc7843-45e8-4677-b80f-385a5abac597.

## Loading caption

Global theme span rules had overridden the loader label colour. The shared loader now owns its caption colour with a sufficiently specific selector and explicit WebKit text fill. Warm ivory #f8f1e5 has 8.58:1 contrast against the brightest gradient stop, 14.77:1 against the middle stop and 17.14:1 against the darkest stop. Animation timing, dismissal, fail-safe, reduced-motion and no-JavaScript behavior are unchanged.

Six held-overlay QA snapshots used actual live homepage/admin/client styles with the exact new colour rules, in light and dark themes. They all computed rgb(248,241,229) and were visually inspected. Holding the transient overlay was confined to ignored static QA fixtures; it was not added to production. The actual local page computed the same caption colour. Live HTML/CSS checks confirm one shared loader and the new caption/text-fill rules on homepage, admin login and client login.

## Distinct project imagery

The weekly import previously used one shared illustration for new drafts. Twenty imported drafts shared it; none of those 20 were published. The approved eight public studies already had their individual covers and were retained.

New imports now receive stable, unique, versioned cover URLs and domain-specific SVG concept art. Fourteen illustration families, project typography and seeded composition/palette variations replace the repeated graphic. No fake screenshots, performance claims, external asset fetching or AI credentials are used. The renderer validates bounded parameters, escapes text, makes no CMS reads or network requests, and returns SVG with nosniff and a restrictive sandbox/default-src CSP. Illustration labelling is preserved on public details if an owner later publishes a draft.

A one-time prepared-statement refresh updated only sync-origin shared placeholder covers. It checks original source identity and the exact old image at write time. Custom featured images and thumbnails are protected; the weekly sync still never updates existing project content. All 20 new production image URLs returned 200 and all 20 rendered image hashes were distinct before their URLs were saved. Repeating the refresh updated zero records.

## Preservation and verification

No database migration or new table/binding was needed. Private before/after snapshots are ignored under `.wrangler/loader-covers-release`. Across 74 tables, only the 20 expected project image fields and their normal update timestamps changed. Every other project field, publication/featured state, all other table records, schema, sequences and foreign-key state remain unchanged. No drafts were published and the public portfolio still contains exactly the original eight approved studies.

- 59 tests / 398 assertions pass, including distinct/semantic covers, hostile-parameter rejection, standalone image rendering, unique weekly-import paths and guarded placeholder refresh with protected owner content and images.
- Targeted strict TypeScript, production build, diff and redacted Gitleaks checks pass; zero secret findings.
- Isolated Cloudflare Pages image routes returned 200 for 20 distinct SVGs. Browser verified actual admin cards, loaded images and 390px layout without overflow or broken images. Screenshots under docs/reviews/repository-covers-2026-11-22 are QA artifacts; the contact sheet was an intermediate illustration review, while actual admin screenshots show rendered endpoint images.
- 39 live routes, unchanged public project slugs and 14 existing live admin/client/chat security checks pass. The new image endpoint receives only public-style metadata, not privileged CMS content.
- Cloudflare confirms preserved AI/DB bindings, disabled public sync Worker/preview URLs and unchanged Monday schedules: blog 09:00, portfolio sync 10:00 Accra/UTC. No scheduled run was replayed for this visual correction.
- Live authenticated admin sign-in was not bypassed; admin rendering was checked in the isolated fixture. Production image bodies and conditional data changes were independently verified.

Previous Pages deployment: https://77fa0fbb.ohwpstudios.pages.dev. Any rollback must retain the new image-serving route while projects reference its URLs, or deliberately restore only the affected image fields from the private snapshot. Do not restore the whole database over later client activity.
