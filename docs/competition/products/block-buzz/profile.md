---
product: Block Buzz
slug: block-buzz
category: ai_native_workspace
primary_sources:
  - https://buzz.xyz/
  - https://block.xyz/inside/introducing-buzz-where-humans-and-agents-work-together
  - https://github.com/block/buzz
  - https://github.com/block/buzz/blob/main/README.md
  - https://github.com/block/buzz/blob/main/VISION_AGENT.md
last_researched: 2026-08-03
disambiguation: >
  This dossier is Block Buzz (buzz.xyz / github.com/block/buzz) only.
  Not PolyBuzz character chat, not buzz.ai SDR, not Hive “Buzz AI” assistant.
---

# Block Buzz

Block Buzz is a free, open-source **collaboration workspace** where **humans and AI agents share the same channels** as first-class members. It is built on the **Nostr** protocol: messages, reactions, workflow steps, review approvals, and git events are **signed events** in one relay log. The desktop client (Tauri + React) presents a Slack-like room IA; under the hood it is an event log with cryptographic identity for every participant—person or process.

## Competitive Relevance

- **AI-native room model** Epoch under-specs today: agents are members with keys, memberships, and audit trails—not slash-bots or a separate agent console.
- **One searchable record** for conversation + work (patches, CI, approvals) challenges Epoch’s multi-surface story (Community channels + linked projects + Dev Feed).
- **Harness-swappable agents** (Goose, Codex, Claude Code via ACP; `buzz-cli` JSON I/O) set the bar for agent portability.
- **Sovereign relay** narrative (self-host, Apache-2.0) overlaps Epoch’s anti-central-forge / signed-history goals.
- Epoch already anticipates Buzz-compatible presence via [ADR-0023](../../../design-decisions/0023-three-plane-identity-binding.md) (Ed25519 · Nostr BIP-340 · AT DID binding).

## Epoch Implications

- Compete on **agents-in-the-room with receipts**, not on cloning Nostr.
- Keep dual-plane **ATProto network feed** + **community-owned channels**; add **member agents** with scoped power and inspectable signed actions.
- Do not copy launch immaturity: flaky agents, incomplete git hosting, or “compliance later” as product defaults.
- Differentiate with Ed25519 signed intents, civic-workshop brand, and ATProto portability—not a pure Nostr identity monoculture.

## Related Epoch work

- Identity bridge / three-plane binding: `docs/identity-bridge.md`, ADR-0023
- Community Web dual-plane: `docs/community-web-experience.md`
- Evidence screenshots: [docs/evidence/competition/block-buzz/](../../../evidence/competition/block-buzz/)

## Feature scenarios

- [agents-as-members.feature](features/agents-as-members.feature)
- [branch-as-room.feature](features/branch-as-room.feature)

## OptimizeXP persona

`buzz-power-user` (`.optimizexp/personas/buzz-power-user.md`) must **research current Buzz features** (README, CHANGELOG/releases, official screenshots) **before** scoring Epoch. Dossier text alone is insufficient.
