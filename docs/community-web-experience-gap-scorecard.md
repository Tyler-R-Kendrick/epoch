# Community Web experience gap scorecard

**Living scorecard** for Epoch Community Web vs Discord, Slack, X, Bluesky, GitHub, Tangled, and Block Buzz.

Machine-readable twin: [`.optimizexp/competitive/community-web-dimensions.json`](../.optimizexp/competitive/community-web-dimensions.json).

**Rule:** Every Community Web OptimizeXP run and every product experiment that claims a community-experience win **must update** the matching dimension row (`status`, evidence, `lastRunId`).

Related: [community-web-experience.md](community-web-experience.md), [community-web-competitive-evaluation.md](community-web-competitive-evaluation.md), [competition/ai-native-room-concepts.md](competition/ai-native-room-concepts.md).

---

## Wedge (do not dilute)

> Belong to a **signed community** → hang in **community-owned channels** → discover via **network feed** → **share ships** → **promote** talk into signed work → treat **agents as members** with harness and receipts — without faking live multiplayer.

**Refuse:** Discord voice/Nitro, X metric theater, GitHub Actions marketplace clone, Nostr monoculture replacing ATProto, fake live presence or fake agent Working.

---

## Dimensions

| id | Dimension | Competitor bars | Status | Persona owners | Implementable now? | Smallest experiment |
|---|---|---|---|---|---|---|
| `belong` | Community-owned hangout | Discord, Slack | **partial** | discord, slack, forge | yes | Multi-user presence beyond local durable API |
| `discover` | Network builder discovery | X, Tangled, Bluesky, GH | **partial** | x-com, tangled, bluesky, github | yes | Live AT-observed feed |
| `identity` | Portable who | Bluesky, Tangled | **partial** | bluesky, tangled | yes | Full AT OAuth link (api-session honesty shipped) |
| `share` | Share what I built | Discord, X, GH | **partial** | discord, github, x-com | yes | Network event emission when AT live |
| `promote` | Talk → signed work | GitHub, Buzz | **partial** | github, forge, buzz | yes | Merge/export evidence beyond approve |
| `agents_member` | Agents as members | Buzz | **partial** | buzz, agentic, discord | yes | Wire real ACP into `liveAgentIds` |
| `receipts` | Reconstruct why shipped | Buzz, GH | **partial** | buzz, forge, slack | yes | Deeper search index / server search |
| `honesty` | Live vs sample | Epoch | **partial** | buzz, forge, tangled | yes | Sample vs live agents + session auth states shipped |
| `craft` | Density + calm | Slack, X, Telegram, DESIGN.md | **partial** | design personas, telegram | yes | Ongoing craft passes |
| `persistence` | Multi-user durable community | All live products | **partial** | discord, slack, forge | yes | File-backed API shipped; multi-node HA next |

Status enum: `proven` | `partial` | `missing` | `external-blocked`.

---

## Status snapshot (2026-08-03)

### Shipped and tested (local production path)

- Community switcher + social channels without repo
- Share a ship + sticky drafts
- Agents rail, harness/managed-by, sample|live session kinds (`EPOCH_LIVE_AGENT_IDS`)
- **Receipt search** across community messages/intents/harnesses
- **Promote/intent receipt cards** with review state
- **State-driven identity** (`sample-session` | `api-session` | `authenticated`)
- **File-backed Community API persistence** (`EPOCH_COMMUNITY_API_STATE`, default `.data/community-api.json`)
- Live/snapshot honesty banners

### Remaining product gaps (not missing UI chrome)

1. **Multi-node / multi-user HA** — file-backed local durability is not a federated hangout
2. **Full AT OAuth** — api-session is honest; authenticated requires OAuth wiring
3. **Deep forge merge trail** — promote + approve exist; package/export pipeline is separate
4. **Real ACP harness control plane** — `liveAgentIds` is the integration seam; harness process is external

---

## OptimizeXP ritual (every Community Web run)

1. Load panel `community-competitive` (or override with `--personas` / panel flag).
2. Currency research for personas with `currencyPolicy: research-before-respond` (Buzz required).
3. Read this scorecard + `.optimizexp/competitive/community-web-dimensions.json`.
4. Score **each dimension** with persona evidence (expect → act → outcome).
5. Apply an experiment that moves a **scorecard row**.
6. Survey with **competitive questions** (`q_competitor_bar`, `q_parity`, `q_epoch_only`, `q_dealbreaker`, `q_dimension`).
7. Write `runs/<id>/competitive-scorecard.json` and update dimension JSON.
8. Tag backlog items with `competitiveDimension: <id>`.
9. `assert-complete` only when dual-regime + scorecard artifact exist (see skill `competitive-coverage.md`).

---

## Panels

| Panel | Personas | Use |
|---|---|---|
| `community-competitive` (default) | Discord, Slack, GH, Tangled, Bluesky, X, Buzz, forge, agentic, design-builder | Full gap capture |
| `community-craft` | design personas + telegram | Visual density |
| `community-agents` | buzz, agentic, discord | AI-native room only |

Configured in [packages/Epoch.Community.Web/.optimizexp/config.json](../packages/Epoch.Community.Web/.optimizexp/config.json) and the dimensions JSON `panels` map.

---

## Product phases

| Phase | Dimensions | Status |
|---|---|---|
| C0 | honesty, agents_member sample|live | shipped |
| C1 | persistence (file), identity api-session | shipped |
| C2 | promote receipts, receipts search | shipped |
| C3 | real ACP process attach | open (seam: `liveAgentIds`) |
| C4 | AT OAuth authenticated + multi-node | open |

---

## Change log

| Date | Change |
|---|---|
| 2026-08-03 | Initial scorecard after competitor analysis + PR #85/#86/#87 merge |
| 2026-08-03 | optimizexp `community-competitive-20260803-1719`: sample\|live agent session honesty |
| 2026-08-03 | optimizexp community-persona-uplift: receipt search, promote cards, identity sample-session |
| 2026-08-03 | Production skeptic fix: file-backed API, state-driven identity, liveAgentIds, cucumber+unit tests; scorecard docs aligned |
