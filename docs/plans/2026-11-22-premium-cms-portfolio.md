# Premium CMS workspace and repository portfolio preview

## Design contract

Preserve the approved blue/gold studio identity and multipage site. The CMS should feel like a considered editorial workspace: navy (#0b1025), cobalt (#273d83), gold (#ddc18c), ivory (#fffdf8), pale slate (#edf0f7), ink (#18243d). Fraunces headings; existing body sans for controls. Left-aligned grouped editors, generous full-width fields and a narrower live copy preview. Source evidence and publication state are explicit in portfolio cards. No decorative counters, tiny textareas, giant empty-state artwork or generic metric claims.

Home: [grouped hero / studio / contact editors] [live copy preview]
Services: [intro / software / AI / trading / guided build] [live discipline preview]
Portfolio: [collection header + import/manage actions] [filterable visual project cards]

The shared CMS component must own its styles: dashboard-scoped CSS does not cross Astro component boundaries. Dynamic cards need explicitly scoped/global descendant styles and delegated actions.

## Data and behavior

- Review only public owned repositories; curate eight source-backed projects and retain README SHA evidence. Do not publish private repos, keys, test data, invented metrics, endorsements or unverified outcomes.
- Use existing portfolio_projects and full project manager as the canonical admin source. Fix the dashboard's wrong response schema / legacy-table payload mismatch. Preserve CRUD, filters, tags, galleries and existing records.
- Add optional repository provenance columns through an additive migration; no rebuilds. Authenticated, CSRF-protected idempotent import never overwrites an existing project. New work starts as drafts; already-public featured entries keep their approved content/publication state when adopted into the CMS.
- Present original project-specific SVG studies as illustrations, not product screenshots. Keep the three approved screenshot-led featured projects.
- Respect CMS publication state and edits on public project pages; use existing static featured work only when no corresponding CMS record exists, or storage is unavailable. Public reads never use admin APIs.
- Harden touched portfolio writes with a fixed column allowlist and prepared values. No auth/CSRF, chatbot, quote flow, weekly editorial worker or client data changes.
- Populate an isolated preview, exercise import idempotency, draft visibility, CMS saves, add/edit project navigation, responsive layout and public case studies. No production changes or deployment before review.
