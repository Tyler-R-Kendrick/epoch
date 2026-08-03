---
product: Block Buzz
slug: block-buzz
last_researched: 2026-08-03
evidence: docs/evidence/competition/block-buzz/
---

# Block Buzz design extract

## Product shape

| Layer | Buzz | Epoch Community (target contrast) |
|---|---|---|
| Place unit | Community (URL / relay selects workspace) | Community space (Discord-like) + Network Dev Feed |
| Primary chrome | Sidebar: Inbox, Projects, **Agents**, channel groups, DMs | Rail: Network Feed, Communities, Channels, Linked projects |
| Identity | Nostr keypair per human **and** agent | Ed25519 author + AT DID + optional Nostr binding (ADR-0023) |
| Truth log | Signed Nostr events (message, reaction, workflow, git) | Signed intents / event history + AT-observed feed |
| Agent model | **Member** with harness (Goose/Codex/Claude Code via ACP) | Agent-runs channel + signed intents (strengthen membership) |

## Visual / IA observations (from official screenshots)

Evidence: [channel-agents.png](../../../../evidence/competition/block-buzz/channel-agents.png), [channel-thread.png](../../../../evidence/competition/block-buzz/channel-thread.png), [create-channel.png](../../../../evidence/competition/block-buzz/create-channel.png), [media-comments.png](../../../../evidence/competition/block-buzz/media-comments.png).

### Steal

1. **Agents in the stream** — Agent avatars (e.g. Bumble, Fizz, Honey) post in the same message list as humans; @mentions hand work between agents; humans remain visible as reviewers.
2. **Sidebar “Agents” as first-class nav** — Not buried under Apps; agent membership is a product surface.
3. **Artifact cards in-channel** — “Buzz · PR” / “GitHub · PR” attachments appear as room objects, not only URLs.
4. **Presence of work** — Status like “Honey: Working” under the composer makes agent liveness legible without a separate console.
5. **Thread structure for plans** — Agents post structured plans (numbered steps) that humans can react to and refine.
6. **Reaction grammar on agent work** — Emoji + reply counts on agent messages (same as human messages).
7. **Light, dense Slack-class chrome** — All-day channel density with clear channel list hierarchy (product groups, private channels).

### Refuse

1. **Agent spam without scope UI** — Member agents that never show permission boundaries or mute paths.
2. **Unsigned “AI did it”** — Claims without inspectable event/receipt identity.
3. **Narrative forge** — Marketing that feature-branch-as-room is complete while git hosting is still wiring.
4. **Nostr as the only identity** for users who live on AT handles / Epoch authors.
5. **Cute agent cosplay without control** — Personality without kill switch, rate limit, or harness transparency.
6. **Desktop-only AI-native** as the long-term default (mobile incomplete at research time).

## Maturity (honest)

| Works today (per upstream README) | Being wired / incomplete |
|---|---|
| Relay, channels, threads, DMs, canvases, media, search, audit log | Mobile clients |
| Desktop app; `buzz-cli`; ACP harnesses | Workflow approval glue; full git hosting UX |
| YAML workflows; git events (NIP-34) | Huddle lifecycle; push; cross-relay reputation |

## Steal → Epoch mapping

| Buzz concept | Epoch mapping |
|---|---|
| Agent as channel member | Promote `#agent-runs` + membership chrome: agents listed like people with scope badges |
| Agent posts artifacts into room | Agent run cards must deep-link **signed intent + evidence**, not only chat text |
| Branch / work as room | Community channels already multi-project; add **work-room** pattern for linked change/intent |
| Harness-swappable agents | AX: agent identity stable; harness/model visible as metadata, swappable without history loss |
| One event log search | Search across messages + intents + agent runs with provenance filters |
| “Working” agent status | Honest live agent state on composer / channel (never fake presence) |

## Relation to ADR-0023

Buzz rooms need **Nostr (BIP-340)** identities. Epoch roots are **Ed25519**. Do **not** collapse planes: bind mutually ([ADR-0023](../../../../design-decisions/0023-three-plane-identity-binding.md)) so agents/humans can appear in Buzz-compatible rooms without weakening Epoch verification.
