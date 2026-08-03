---
title: AI-native room concepts (Block Buzz → Epoch)
compared:
  - block-buzz
  - slack
  - discord
  - epoch-community
last_researched: 2026-08-03
---

# AI-native room concepts

How **Block Buzz** changes the competitive set for Epoch Community: the question is no longer only “chat vs forge,” but **whether agents are members of the room with receipts**.

Screenshots: [docs/evidence/competition/block-buzz/](../evidence/competition/block-buzz/).
Dossier: [products/block-buzz/](products/block-buzz/).

## Side-by-side

| Dimension | Slack | Discord | Block Buzz | Epoch Community (target) |
|---|---|---|---|---|
| Agent model | Apps/bots bolt-on | Bots / webhooks | **Agents as members** (keys, membership) | Agents in-room with **signed intents** + scoped membership |
| Identity | Workspace account | Server member | Nostr keypair (human + agent) | Ed25519 + AT DID + optional Nostr bind |
| Work + chat | Integrations | Links/embeds | Same event log (patches, CI, chat) | Channels + linked projects + Dev Feed; unify search/receipts |
| Default chrome | Channel density | Server → channels | Channel density + **Agents** nav | Dual-plane Network + community channels |
| Trust | Enterprise SSO | Roles/moderation | Signed events / self-host relay | Signature, anchor, live/snapshot honesty |

## Concepts to borrow (priority order)

1. **Member agent chrome** — list agents next to people; never only a slash command.
2. **In-stream agent work** — plans, patches, screenshots land in the channel humans already watch.
3. **Visible agent liveness** — “Working” / idle with honesty (no fake presence).
4. **Harness badge** — which runtime (Goose/Codex/Claude Code/…) without lock-in.
5. **Work-room pattern** — conversation + change evidence colocated.
6. **Receipt search** — one query across chat and signed work artifacts.

## Concepts to refuse

- Agent-only noise replacing human hangout (`#general` soul).
- Unsigned AI authorship.
- Vendor-locked agent drawer as the product.
- Compliance theater without real scope controls.

## Epoch next product steps (design, not this PR’s full implement)

- Strengthen `#agent-runs` + membership: agent member chips, scope, mute.
- Ensure agent run cards always link originating **signed intent**.
- Optional “work room” channel kind for linked change/intent.
- Keep dual-plane ATProto feed; do not replace with Nostr monoculture.
