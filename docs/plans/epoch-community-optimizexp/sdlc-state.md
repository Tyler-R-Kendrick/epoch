---
type: Reference
title: "Epoch Community OptimizeXP initiative state"
description: "SDLC state for Community Web competitive personas, Buzz agents-as-members, optimizexp review cycle, and production skeptic closeout."
tags: [epoch, plans, sdlc, optimizexp, community]
---

# Initiative: Epoch Community competitive experience + OptimizeXP

- **Phase:** closed (`/sdlc finish` 2026-08-03 final)
- **Slug:** `epoch-community-optimizexp`
- **Opened:** 2026-08-01
- **Session closeout:** 2026-08-03 (final)
- **Host:** Grok Build

## Goal

Make Epoch Community Web competitive as a **signed community hangout + network discovery +
agents-as-members** wedge; land competitor research, personas, product experiments, durable
OptimizeXP competitive review, and production-hardened local delivery on `main`.

## Session PR set (all squash-merged)

| PR | Title | Merged |
|---|---|---|
| [#84](https://github.com/Tyler-R-Kendrick/epoch/pull/84) | Sync sdlc + optimizexp skills from HoBo | yes |
| [#85](https://github.com/Tyler-R-Kendrick/epoch/pull/85) | Designer personas from HoBo | yes |
| [#86](https://github.com/Tyler-R-Kendrick/epoch/pull/86) | Competitor power users + share path / drafts / identity | yes |
| [#87](https://github.com/Tyler-R-Kendrick/epoch/pull/87) | Block Buzz dossier + agents-as-members | yes |
| [#88](https://github.com/Tyler-R-Kendrick/epoch/pull/88) | Competitive gap scorecard + Community Web panels | yes |
| [#89](https://github.com/Tyler-R-Kendrick/epoch/pull/89) | Honest sample vs live agent session status | yes |
| [#90](https://github.com/Tyler-R-Kendrick/epoch/pull/90) | SDLC closeout docs (mid-session) | yes |
| [#91](https://github.com/Tyler-R-Kendrick/epoch/pull/91) | Receipt search, promote cards, identity honesty | yes |
| [#92](https://github.com/Tyler-R-Kendrick/epoch/pull/92) | Production durability, identity, receipt tests | yes |

**Trunk tip at closeout:** includes `6b05c4a` (#92).

### OptimizeXP runs

| Run | Stop | Notes |
|---|---|---|
| `buzz-agent-member-20260803-1126` | pareto-equilibrium | Agents-as-members UI |
| `community-competitive-20260803-1719` | pareto-equilibrium | Competitive panel + sample/live honesty |
| `community-persona-uplift-20260803-1823` | pareto-equilibrium | Receipt search + promote + identity uplift |

### Product landed

- Community-owned channels + Network Feed dual-plane
- Share a ship, sticky drafts, members strip
- Agents rail, multi-agent handoffs, harness/managed-by/intent receipts
- Client feed retention through live API refresh
- `sessionKind: sample | live` + `liveAgentIds` seam
- State-driven identity: `sample-session` | `api-session` | `authenticated`
- Community-wide **receipt search**
- **Promote/intent receipt cards** with review state
- **File-backed Community API** (`EPOCH_COMMUNITY_API_STATE` / `.data/community-api.json`)
- Cucumber + unit coverage for search / promote / identity / persistence

### Process landed

- Living scorecard: `docs/community-web-experience-gap-scorecard.md`
- Machine twin: `.optimizexp/competitive/community-web-dimensions.json`
- Project panel config: `packages/Epoch.Community.Web/.optimizexp/config.json`
- Skill: `skills/optimizexp/references/competitive-coverage.md`

## Residual (next initiative — not unfinished merge)

1. Multi-node multiplayer HA (beyond single-node file persistence)
2. Full AT OAuth → `authenticated`
3. Real ACP process attach into `liveAgentIds`
4. Deep forge merge/export trail beyond promote+approve

## Delivery decisions

- Backend: sequential fallback; coordinator implemented inline
- Sibling PRs rebased for `index.ts` keep-both (#86 + #87)
- Skeptic panel closed via #92 (tests + durability + docs alignment)
- Unrelated open PR #75 (design explorations) **not** session scope — left open

## Validation

- `npm run gate:push` green on delivery branches
- Unit: community-web helpers, API persistence reload, HTML assertions
- Cucumber: `features/community_web_experience.feature` **13/13** passed
- OptimizeXP assert-complete + mark-complete for session runs

## Prior closeout (2026-08-01)

- OptimizeXP run `20260801-ux-community-web` at pareto-equilibrium
- PR [#81](https://github.com/Tyler-R-Kendrick/epoch/pull/81) squash-merged
