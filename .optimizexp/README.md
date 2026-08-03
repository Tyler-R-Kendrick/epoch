# Epoch OptimizeXP personas

This global persona panel turns Epoch's documented competitor research into a
small, diverse set of schema-v2 judgment instruments. The personas represent
synthetic market archetypes, not real people or exhaustive claims about every
user of a competitor.

| Persona | Competitor grounding | Experience tracks |
|---|---|---|
| [Forge and community power user](personas/forge-community-power-user.md) | Forges, code review, social coding, and channel-first communities | UX, DX |
| [Slack power user](personas/slack-power-user.md) | Slack channel density, sticky composer, workplace collab | UX, DX |
| [Discord power user](personas/discord-power-user.md) | Discord community-owned channels and hangout IA | UX |
| [Bluesky power user](personas/bluesky-power-user.md) | Bluesky ATProto portable identity, soft feeds, and open-timeline scan rhythm (absorbed the retired X power user) | UX, DX |
| [GitHub power user](personas/github-power-user.md) | GitHub contribution feed, forge baseline, social coding | UX, DX |
| [Tangled power user](personas/tangled-power-user.md) | Tangled ATProto social coding timeline, knots, AppView | UX, DX, AX |
| [Buzz power user](personas/buzz-power-user.md) | Block Buzz: agents as members, signed event log, harness-swappable ACP agents | UX, DX, AX |
| [Version-control and review power user](personas/vcs-review-power-user.md) | Advanced DVCS semantics, operation logs, stacks, visual Git, and review systems | DX |
| [Local-first state and data power user](personas/local-first-data-power-user.md) | CRDTs, reactive sync, state history, data branching, and materialization | DX |
| [Provenance and policy power user](personas/provenance-policy-power-user.md) | Signing, attestations, supply-chain policy, vulnerability context, and admission | DX |
| [Build platform and sandbox power user](personas/build-sandbox-power-user.md) | Remote build/cache, reproducible workspaces, and isolated agent execution | DX, AX |
| [Agentic coding power user](personas/agentic-coding-power-user.md) | Coding agents, AI review, checkpoints, permissions, and handoff | DX, AX |
| [Design-led app builder power user](personas/app-builder-design-power-user.md) | Prompt-to-app, design-to-code, preview, publishing, and rollback | UX, AX |
| [Asset-scale storage and distribution power user](personas/asset-distribution-power-user.md) | Large binaries, chunking, partial materialization, distribution, backup, and recovery | DX |
| [Designer](personas/designer.md) / [Product designer](personas/product-designer.md) / craft lenses | Community social craft + DESIGN.md | UX |
| [Screen reader power user](personas/screen-reader-power-user.md) | Assistive-tech community membership; accessibility-tree truth, focus order, live regions | UX |
| [Community moderator](personas/community-moderator.md) | Moderation queues, unread/notification design, trust-safety receipts | UX |

## Community Web competitive coverage

Default Community Web OptimizeXP panel is **`community-product`** — half
design-craft lenses (designer, product-designer, junior-mobile-designer,
screen-reader, moderator, app-builder), half competitor bars (see
`packages/Epoch.Community.Web/.optimizexp/config.json`). The design council
panel (`design-council`) is triggered by dimension status upgrades, milestone
closeouts, and DESIGN.md edits. The HCD tag ↔ persona reconciliation lives in
[persona-map.json](persona-map.json), enforced by `test/unit/persona-map.test.ts`.
The retired `telegram-power-user` and `x-com-power-user` merged into
`junior-mobile-designer` and `bluesky-power-user` respectively.

Living gap scorecard:

- [docs/community-web-experience-gap-scorecard.md](../docs/community-web-experience-gap-scorecard.md)
- Machine twin: [competitive/community-web-dimensions.json](competitive/community-web-dimensions.json)
- Skill ritual: `skills/optimizexp/references/competitive-coverage.md`

Every Community Web optimizexp run must update dimension statuses and write
`runs/<id>/competitive-scorecard.json` (not only cold-entry scores).

Validate the panel with:

```bash
node --import tsx skills/optimizexp/harness/generate-persona.mts --mode validate
node --import tsx skills/optimizexp/harness/doctor.mts check --project root
```
