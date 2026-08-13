---
type: Reference
title: "Community Web authority + preview/dismiss session state"
description: "SDLC finish state for ADR-0027 Community Web authority and Community Web UX (preview-select, shared dismiss)."
tags: [epoch, plans, sdlc, community-web, design]
---

# Initiative: Community Web authority + preview/dismiss

- **Phase:** closed
- **Slug:** `community-web-authority-preview`
- **Opened:** 2026-08-05
- **Closed:** 2026-08-06
- **Host:** Cursor / Auto coordinator
- **Branch:** `feat/community-web-authority-preview-dismiss` (deleted after merge)

## Goal

Land this session’s work:

1. Community Web becomes the Community visual-world authority (ADR-0027, root
   `DESIGN.md`, tokens, Course Line archived).
2. Community Web UX: select previews children/content; Enter activates; shared `d`
   dismiss; following identity stacks; session chat blade; brand → home.
3. Palette burn-down for web packages still on Course Line CSS until the port.

## Session PR set

| PR | Title | Status |
|---|---|---|
| [#106](https://github.com/Tyler-R-Kendrick/epoch/pull/106) | Community Web authority + preview/dismiss | squash-merged `f3dfb89` |

## Validation

- `npm run gate:push` green
- `npm run community-web:app:e2e` — all features hold
- `.serena/` left untracked

## Residuals

- Port Community / Ops / Platform Web CSS onto Community Web tokens (re-enable
  `PALETTE_RULES` in `scripts/audit-design-tokens.mjs`).
- Full `verify` (cucumber/coverage/pact) not required for this exploration+design
  token surface when `gate:push` is green.
