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
| `belong` | Community-owned hangout | Discord, Slack | **partial** | discord, slack, forge | yes | Durable multi-user community store |
| `discover` | Network builder discovery | X, Tangled, Bluesky, GH | **partial** | x-com, tangled, bluesky, github | yes | Real feed or stricter sample + drill-in |
| `identity` | Portable who | Bluesky, Tangled | **partial** | bluesky, tangled | yes | AT handle session + fail-closed |
| `share` | Share what I built | Discord, X, GH | **partial** | discord, github, x-com | yes | Network-visible ship from Share a ship |
| `promote` | Talk → signed work | GitHub, Buzz | **partial** | github, forge, buzz | yes | Review state on promoted message |
| `agents_member` | Agents as members | Buzz | **partial** | buzz, agentic, discord | no (ACP external) | Live ACP into `#agent-runs` |
| `receipts` | Reconstruct why shipped | Buzz, GH | **missing** | buzz, forge, slack | yes | Search messages + intents + agent runs |
| `honesty` | Live vs sample | Epoch | **partial** | buzz, forge, tangled | yes | Working only when session live |
| `craft` | Density + calm | Slack, X, Telegram, DESIGN.md | **partial** | design personas, telegram | yes | Craft pass vs DESIGN.md |
| `persistence` | Multi-user durable community | All live products | **missing** | discord, slack, forge | yes | Persist beyond process lifetime |

Status enum: `proven` | `partial` | `missing` | `external-blocked`.

---

## Status snapshot (2026-08-03)

### Proven enough for chrome (not production multiplayer)

- Community switcher + social channels without repo (`belong` partial)
- Share a ship + sticky drafts (`share` partial)
- Agents rail + multi-agent samples + harness/managed-by after live refresh (`agents_member` partial UI)
- Live/snapshot honesty banners (`honesty` partial)

### Still missing / blocked for “significantly better”

1. **persistence** — in-memory Community API seed is not a hangout
2. **identity** — handle/DID chip without real AT session
3. **promote** — incomplete review/merge evidence loop in UI
4. **agents_member** — no live ACP Working truth
5. **receipts** — no unified search

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

## Product phases (Stream C)

| Phase | Dimensions moved | Focus |
|---|---|---|
| C0 | honesty, agents_member | Regression + honesty audit |
| C1 | persistence, identity, belong | Durable store + AT session honesty |
| C2 | promote, receipts | Full promote/review UI |
| C3 | agents_member | Live ACP / Working truth |
| C4 | belong, receipts | Unread + search |

---

## Change log

| Date | Change |
|---|---|
| 2026-08-03 | Initial scorecard after competitor analysis + PR #85/#86/#87 merge |
