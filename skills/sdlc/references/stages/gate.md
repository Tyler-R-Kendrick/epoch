---
type: Agent Skill Reference
title: "SDLC gate"
description: "Run Epoch quality gates required before commit and before claiming Done."
tags: [epoch, sdlc, gate, lint, anti-slop, design]
timestamp: 2026-08-20T00:00:00Z
---

# `sdlc gate`

## Flags

| Flag | Meaning |
|---|---|
| (none) | `npm run gate:commit` |
| `--push` | `npm run gate:push` (commit + typecheck + build + unit) |
| `--verify` | `npm run verify` (full bar; expensive) |

## What `gate:commit` covers

- Parallel `gate:fast`: konsistent, docs:check, **design:lint**, **design:audit**, eslint,
  **anti-slop** `lint:oxlint`
- Community Web a11y lint
- Community Web design chrome lint (Bracket Rule / receipt chips) when wired

Never weaken oxlint rules or design gates to greenwash. See
[docs/anti-slop.md](../../../../docs/anti-slop.md) and root [DESIGN.md](../../../../DESIGN.md).

## When to run

- Before **every** commit (hooks already run `gate:commit`).
- After subagent handback, before `gh stack submit`.
- Before `sdlc finish` squash-merge of each PR (plus CI).
