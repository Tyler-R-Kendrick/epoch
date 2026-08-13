---
type: Reference
title: "Community Web Persuade + Operate session state"
description: "SDLC state for landing Persuade marketing home, Operate board split, terminal channels, and Canvas UI landing FX."
tags: [epoch, plans, sdlc, community-web, persuade, operate]
---

# Initiative: Community Web Persuade + Operate

- **Phase:** closed (`/sdlc finish` 2026-08-07)
- **Slug:** `community-web-persuade-operate`
- **Opened:** 2026-08-06 (session work on `main` dirty tree)
- **Host:** Cursor / Auto coordinator
- **Branch:** `feat/community-web-persuade-operate-session`

## Goal

Land this session’s Community Web exploration work:

1. Split Persuade (`/`) marketing landing from Operate (`board.html`) TUI.
2. Terminal channel nav nodes (siblings stay in navbar; feed/detail in Following pane).
3. Canvas UI landing FX: hero/theater glitch, brand + E01 decrypt/reveal, VHS preview.
4. Headline typewriter, copy clarify, e2e/unit coverage, docs graph updates.

## Session PR set

| PR | Title | Status |
|---|---|---|
| [#108](https://github.com/Tyler-R-Kendrick/epoch/pull/108) | feat(nightboard): Persuade landing + Operate board advances | squash-merged `5ae0db1e` |

## Residuals (not in this PR)

- Local WIP `skills/gauntlet-loop/` (docs:check ignored until a dedicated land)
- `.impeccable/` critique/mocks, `.serena/`, `.claude/`, `.cursor/`
- Unused `canvasui-object.js` / three.js object sources (FX-only bundle kept)

## Validation

- `npm run gate:push` green (local CI substitute)
- `CW_E2E=landing npm run community-web:app:e2e` green
- Vercel SUCCESS on PR; CodeRabbit PENDING at merge (documented)
- Squash-merged with `--admin` (Actions quality CI disabled)
