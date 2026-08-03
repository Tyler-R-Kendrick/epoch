---
type: Reference
title: "Epoch Community OptimizeXP initiative state"
description: "SDLC state for Community Web competitive personas, Buzz agents-as-members, and optimizexp review-cycle work."
tags: [epoch, plans, sdlc, optimizexp, community]
---

# Initiative: Epoch Community competitive experience + OptimizeXP

- **Phase:** closed (session land 2026-08-03)
- **Slug:** `epoch-community-optimizexp`
- **Opened:** 2026-08-01
- **Session closeout:** 2026-08-03
- **Host:** Grok Build / Codex

## Goal

Make Epoch Community Web competitive as a **signed community hangout + network discovery +
agents-as-members** wedge; land competitor research, personas, product experiments, and a
durable OptimizeXP competitive review cycle on `main`.

## Session outcomes (2026-08-03)

| PR | Title | Merge |
|---|---|---|
| [#84](https://github.com/Tyler-R-Kendrick/epoch/pull/84) | Sync sdlc + optimizexp skills from HoBo | merged |
| [#85](https://github.com/Tyler-R-Kendrick/epoch/pull/85) | Designer personas from HoBo | merged |
| [#86](https://github.com/Tyler-R-Kendrick/epoch/pull/86) | Competitor power users + share path / drafts / identity | merged |
| [#87](https://github.com/Tyler-R-Kendrick/epoch/pull/87) | Block Buzz dossier + agents-as-members | merged |
| [#88](https://github.com/Tyler-R-Kendrick/epoch/pull/88) | Competitive gap scorecard + Community Web panels | merged |
| [#89](https://github.com/Tyler-R-Kendrick/epoch/pull/89) | Honest sample vs live agent session status | merged |

### OptimizeXP runs

| Run | Stop | Notes |
|---|---|---|
| `buzz-agent-member-20260803-1126` | pareto-equilibrium | Agents-as-members UI |
| `community-competitive-20260803-1719` | pareto-equilibrium | Competitive panel + honesty experiment + scorecard |

### Product landed

- Community-owned channels + Network Feed dual-plane (prior)
- Share a ship, sticky drafts, AT identity chip, members strip
- Agents rail, multi-agent handoffs, harness/managed-by/intent receipts
- Client feed retention of agent messages through live API refresh
- `sessionKind: sample | live` honesty (no fake live Working for seeds)

### Process landed

- Living scorecard: `docs/community-web-experience-gap-scorecard.md`
- Machine twin: `.optimizexp/competitive/community-web-dimensions.json`
- Project panel config: `packages/Epoch.Community.Web/.optimizexp/config.json`
- Skill: `skills/optimizexp/references/competitive-coverage.md`

## Residual (not this session — Stream C)

- Durable multi-user community persistence
- Real AT handle/session login
- Complete promote → review → merge evidence UI
- Live ACP agent sessions
- Search / unread power hangout

## Delivery decisions

- Backend: sequential fallback; coordinator implemented inline
- Sibling PR fan-out then rebase #87 onto #86 for `index.ts` keep-both
- Billing-red CI: not applicable (local gate:push enforced)
- Unrelated open PR #75 (design explorations) **not** session scope — left open

## Validation

- Local `gate:push` / unit tests green on delivery branches
- Playwright evidence for agents-as-members + agent session honesty
- OptimizeXP assert-complete + mark-complete for both 2026-08-03 runs

## Prior closeout (2026-08-01)

- OptimizeXP run `20260801-ux-community-web` at pareto-equilibrium
- PR [#81](https://github.com/Tyler-R-Kendrick/epoch/pull/81) squash-merged
