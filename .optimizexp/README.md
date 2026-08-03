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
| [Telegram power user](personas/telegram-power-user.md) | Telegram content-first speed and low chrome | UX |
| [X power user](personas/x-com-power-user.md) | X public timeline scan and build broadcast | UX |
| [Bluesky power user](personas/bluesky-power-user.md) | Bluesky ATProto portable identity and soft feeds | UX, DX |
| [GitHub power user](personas/github-power-user.md) | GitHub contribution feed, forge baseline, social coding | UX, DX |
| [Tangled power user](personas/tangled-power-user.md) | Tangled ATProto social coding timeline, knots, AppView | UX, DX, AX |
| [Version-control and review power user](personas/vcs-review-power-user.md) | Advanced DVCS semantics, operation logs, stacks, visual Git, and review systems | DX |
| [Local-first state and data power user](personas/local-first-data-power-user.md) | CRDTs, reactive sync, state history, data branching, and materialization | DX |
| [Provenance and policy power user](personas/provenance-policy-power-user.md) | Signing, attestations, supply-chain policy, vulnerability context, and admission | DX |
| [Build platform and sandbox power user](personas/build-sandbox-power-user.md) | Remote build/cache, reproducible workspaces, and isolated agent execution | DX, AX |
| [Agentic coding power user](personas/agentic-coding-power-user.md) | Coding agents, AI review, checkpoints, permissions, and handoff | DX, AX |
| [Design-led app builder power user](personas/app-builder-design-power-user.md) | Prompt-to-app, design-to-code, preview, publishing, and rollback | UX, AX |
| [Asset-scale storage and distribution power user](personas/asset-distribution-power-user.md) | Large binaries, chunking, partial materialization, distribution, backup, and recovery | DX |

Validate the panel with:

```bash
node --import tsx skills/optimizexp/harness/generate-persona.mts --mode validate
node --import tsx skills/optimizexp/harness/doctor.mts check --project root
```
