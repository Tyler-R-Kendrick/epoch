---
type: Reference
title: "Nightboard authority + preview/dismiss session state"
description: "SDLC finish state for ADR-0027 Nightboard authority and Nightboard UX (preview-select, shared dismiss)."
tags: [epoch, plans, sdlc, nightboard, design]
---

# Initiative: Nightboard authority + preview/dismiss

- **Phase:** landing (`/sdlc finish` 2026-08-05)
- **Slug:** `nightboard-authority-preview`
- **Opened:** 2026-08-05
- **Host:** Cursor / Auto coordinator
- **Branch:** `feat/nightboard-authority-preview-dismiss`

## Goal

Land this session’s work:

1. Nightboard becomes the Community visual-world authority (ADR-0027, root
   `DESIGN.md`, tokens, Course Line archived).
2. Nightboard UX: select previews children/content; Enter activates; shared `d`
   dismiss; following identity stacks; session chat blade; brand → home.
3. Palette burn-down for web packages still on Course Line CSS until the port.

## Session PR set

| PR | Title | Status |
|---|---|---|
| (pending) | Nightboard authority + preview/dismiss | opening |

## Validation

- `npm run gate:push` green
- `npm run nightboard:e2e` — all features hold
- `.serena/` left untracked

## Residuals

- Port Community / Ops / Platform Web CSS onto Nightboard tokens (re-enable
  `PALETTE_RULES` in `scripts/audit-design-tokens.mjs`).
- Full `verify` (cucumber/coverage/pact) not required for this exploration+design
  token surface when `gate:push` is green.
