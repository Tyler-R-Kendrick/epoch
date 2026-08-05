---
type: Reference
title: "Nightboard garden initiative state"
description: "SDLC state for landing the Nightboard civic-workshop design exploration and workbench hardening."
tags: [epoch, plans, sdlc, nightboard, design-exploration]
---

# Initiative: Nightboard garden

- **Phase:** closed (`/sdlc finish` 2026-08-05)
- **Slug:** `nightboard-garden`
- **Opened:** 2026-08-04 (session work on branch)
- **Branch:** `nightboard-garden`
- **Host:** Cursor / Auto coordinator
- **PR:** [#100](https://github.com/Tyler-R-Kendrick/epoch/pull/100)

## Goal

Land the chosen Nightboard design direction as a live, keyboard-operated civic
workshop under `docs/design-explorations/nightboard/`: zen-garden theming
contract, Console filesystem model, workbench furniture, Epoch brand chrome,
and gated unit/e2e/fault coverage wired into `verify`.

## Session PR set

| PR | Title | Status |
|---|---|---|
| [#100](https://github.com/Tyler-R-Kendrick/epoch/pull/100) | Nightboard civic workshop console | squash-merged `5ed8447d` |

Single-layer delivery (no `gh stack`).

## Product landed

- Live board + ten themes + CONTRACT.md zen-garden rules
- Console: graph/shell/diff as one filesystem model
- Isolated terminal workspaces, closable detail, `<<` nav back
- FIGlet Epoch brand (power-on + sheen)
- Sessions, hooks, attachments, editor, speech, Lucene feed query
- GraphQL API, WebMCP tools, OpenUI generative UI, resilience/faults
- Evidence captures under `docs/evidence/`

## Finish repairs (2026-08-05)

1. Typecheck: widen `NotifyItem` / drop broken `_m` localStorage stub in unit tests
2. Esc ladder: CLI Esc idempotent with column mode (close detail → prompt)
3. e2e: keyboard case uses two Esc after Enter (detail defaults open)
4. faults: exclude Epoch brand idle animations from arrive-motion budget

## Validation

- `npm run gate:push` green (pre-push)
- `npm run nightboard:faults` — all cases handled
- `npm run nightboard:e2e` — all features hold
- Unit: `nightboard theme tests passed`

## Residual (next initiative — not unfinished merge)

- Promote Nightboard patterns into Community Web production when ready
- Full `verify` cucumber/coverage/pact not re-run this finish (nightboard lanes + gate:push covered)

## Delivery decisions

- Design exploration under docs — not Community Web production surface
- `.serena/` left untracked / out of commit
