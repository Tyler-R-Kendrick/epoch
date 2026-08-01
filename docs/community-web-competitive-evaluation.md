# Community Web Competitive Evaluation

**Date:** 2026-07-31  
**Scope:** Product/UX evaluation of `Epoch.Community.Web` (plus Community API/Core), scored against **GitHub** and **Tangled**.  
**Method:** Code + docs review of Community Web, design system, HCD, and features; competition dossiers for GitHub and Tangled.

## Executive summary

| Question | Answer |
|---|---|
| Direction? | **Strong** — channel-first + signed intent + agents is differentiated. |
| Competitive *today*? | **No** as a daily social-coding platform. |
| Outcompete GitHub/Tangled *overall*? | **No** (network + ecosystem moats). |
| Outcompete on a *wedge*? | **Yes, conditional** — trust-first, agent-gated, private-capable project communities. |
| Overall score (now) | **~4.6 / 10** vs GitHub **~8.1**, Tangled **~6.3** |
| Credible target (12–18 mo, focused) | **~7.0 / 10** on wedge excellence, not forge parity |

**Do not** try to out-GitHub GitHub or out-Tangled Tangled on their home field.  
**Do** own: *the signed channel workspace where humans and agents turn conversation into auditable repository change — private or federated.*

---

## What Community Web is today

### Intent (strong)

- **Dual-plane:** Dev Feed home (ATProto-observed follows/stars/creates/releases + contributions) and Repo Workspace channels (signed intent wedge).
- Channels: `support`, `ideas`, `bugs`, `agent-runs`, `previews`, `governance` (after selecting a repo).
- Message selected → action tray: signed anchors, signatures, intent promotion, agent request, docs-patch, accepted answer, moderation.
- Primary persona: GitHub open-source contributor ([community-human-centered-design.md](community-human-centered-design.md)).
- Design system: “Signed Civic Workshop” ([DESIGN.md](../DESIGN.md)); feed comparison: [dev-feed-comparison.md](competition/dev-feed-comparison.md).

### Reality (prototype)

| Layer | Maturity |
|---|---|
| UI | Single HTML document + inline CSS/JS (`renderCommunityWebDocument`), ~1.8k LOC |
| Data | Live API issues/proposals mixed with hard-coded demo conversations |
| API | Thin in-memory Community API (repos, issues, changes, reviews) |
| Interactivity | Channel filter, select, tray, composer; API promotion when connected |
| PWA | Descriptor only |
| Dogfood | Site materialization through signed Epoch history (ops-facing) |
| Coverage | Gherkin + Playwright evidence for channel journeys |

**Label:** design-led, evidence-backed **prototype** of a channel-native forge community — not a production social coding product.

---

## Scorecard (0–10, current product)

| Dimension | Wt | Epoch | GitHub | Tangled |
|---|---:|---:|---:|---:|
| Contribution workflow maturity | 15% | **3** | **10** | **7** |
| Social discovery & network effects | 12% | **5** | **10** | **8** |
| Trust, provenance, auditability | 15% | **7** | **5** | **6** |
| Offline / degraded / self-host | 12% | **6** | **2** | **7** |
| Agent-native collaboration UX | 12% | **7** | **5** | **3** |
| Design craft & a11y baseline | 10% | **6** | **9** | **7** |
| Onboarding & familiarity | 8% | **4** | **10** | **6** |
| Decentralized identity / portability | 8% | **4** | **2** | **9** |
| Private / enterprise coherence | 8% | **6** | **9** | **3** |
| Ecosystem (CI, packages, marketplace) | 10% | **2** | **10** | **5** |
| **Weighted total** | | **~4.6** | **~8.1** | **~6.3** |

---

## Compare / contrast

### Product shape

| | GitHub | Tangled | Epoch Community Web |
|---|---|---|---|
| Metaphor | Repo forge + social proof | Social feed + decentralized forge | **Communities (Discord-like) + network feed + linked projects** |
| Home | Repo / dashboard / explore | Timeline (stars/follows/creates) | **Community channels** (`#general`…) with Network Feed discovery |
| Unit of work | Issue / PR | Issue / PR / star / follow | **Message → intent / agent / mod** |
| Code plane | Git hosting | Git on knots | Epoch events (+ Git proxy elsewhere) |
| Identity | GitHub account | AT DID / handle | Signed authors; AT not in Web UX yet |
| Live? | Global | Growing network | Prototype |

### Where GitHub wins

1. Complete contribution loop (clone → PR → CI → merge → release).  
2. Network effects (identity, search, Actions, packages, enterprise).  
3. Primer density for expert scanning.  
4. Social proof at scale.

**Implication:** Epoch cannot win as “another place to host repos.”

### Where Tangled wins

1. Shipped social coding network + DID login today.  
2. Portable social metadata on author PDS.  
3. Self-hostable knots + spindles.  
4. Atmosphere identity (Bluesky/AT) reduces signup friction for that cohort.

**Implication:** Epoch should not compete as “AT social forge #2.”

### Where Epoch is uniquely strong

1. **Channel-first** unifies support/ideas/bugs/agents/previews/governance.  
2. **Intent promotion from conversation** (GitHub forces tool-hopping).  
3. **Agent-runs** as first-class channel with human merge authority.  
4. **In-thread trust tray** (signature, anchor, legal-hold).  
5. **Private Community modes** (disabled / local-only / federated).  
6. **Dogfooded signed site history** (ops auditability).

---

## Outcompete assessment

| Arena | Can Epoch win? | Condition |
|---|---|---|
| GitHub overall | **No** | Network + habit moats |
| Tangled overall | **Unlikely** | They own live AT social coding mindshare |
| Chat → signed intent for maintainers | **Yes** | Live multi-user + durable promote path |
| Agent-gated collaboration | **Yes** | Policy, cost, evidence UX |
| Private org community | **Yes** | Modes as product, not flags |
| Offline / degraded central forge | **Maybe** | Gossip + snapshot must feel primary |
| Public OSS discovery / lifestyle | **No** | Don’t chase Explore or timelines first |

---

## Gap map

### P0 — credibility

1. Real multi-user persistence (drop demo-as-product).  
   **Status (2026-07-31):** Live feed is API-primary when `apiBaseUrl` + repository activity exist; hard-coded demos no longer mix into product feed. Snapshot demos remain only as labeled fallback. Multi-user durable backend persistence is still Community API in-memory for the prototype.  
2. Complete promote path: message → intent → review → merge evidence in UI.  
   **Status:** Promote records a live change proposal, links `proposal:<id>` on the message, updates message state, and upserts the Changes list. Full review → merge evidence UI still open.  
3. Familiar secondary surfaces (issue/change lists) linked from channels.  
   **Status:** Issues + Changes secondary rail surfaces ship; channel home remains default.  
4. Live vs snapshot honesty on every degraded dependency.  
   **Status:** Connection label + feed source banners; intent promotion fail-closed when disconnected.

### P0/P1 — differentiators

5. Agent-runs as hero surface.  
6. Trust tray as default literacy.  
7. Private mode as a feature.  
8. Gossip/offline peer affordances in Web when backends exist.

### Explicit non-goals (near term)

9. Public social timeline vs Tangled.  
10. Actions/marketplace clone of GitHub.  
11. Full Packages/Projects/Codespaces surface.

---

## 12–18 month score targets (if focused)

| Dimension | Now | Target |
|---|---:|---:|
| Contribution workflow | 3 | 6 |
| Social discovery | 2 | 3 (in-project only) |
| Trust/audit | 7 | 8 |
| Offline/self-host | 6 | 8 |
| Agent-native | 7 | 9 |
| Familiarity | 4 | 6 |
| AT portability (Web) | 4 | 6 if federated |
| Private enterprise | 6 | 8 |
| **Overall** | **~4.6** | **~7.0** |

At ~7.0 Epoch can win specific ICPs. At ~4.6 it only demos a thesis.

---

## Sources

- Epoch: `packages/Epoch.Community.Web`, [community-web-experience.md](community-web-experience.md), [DESIGN.md](../DESIGN.md), [community-human-centered-design.md](community-human-centered-design.md), `features/community_web_experience.feature`
- GitHub: [competition/products/github/](competition/products/github/)
- Tangled: [competition/products/tangled/](competition/products/tangled/)
- Backend context (not yet Web-primary UX): ADR-0020/0021/0022, [community-atproto.md](community-atproto.md)
