---
product: Tangled
slug: tangled
category: atproto_social_forge
primary_sources:
  - https://tangled.org/
  - https://docs.tangled.org/
  - https://blog.tangled.org/bobbin/
  - https://tangled.org/tangled.org/core
  - https://atproto.com/guides/overview
last_researched: 2026-07-31
---

# Tangled

Tangled is a decentralized **social coding** platform built on the
[AT Protocol](https://atproto.com/). It combines portable DID identity and
on-protocol collaboration metadata with self-hostable **Git** hosts ("knots")
and optional CI ("spindles"). The public AppView at tangled.org aggregates the
network into a GitHub-like product experience.

## Competitive Relevance

- Live ATProto + forge product in the same space as Epoch Community federation.
- Splits **speech** (AT records on user PDSes: issues, stars, follows, repo
  cards) from **code bytes** (Git on knots).
- Shows demand for: AT login, public timelines, self-hosted code hosts, stacked
  PRs, and API-only AppViews (Bobbin).
- Epoch overlaps on signed authorship, self-hosting, and anti-central-forge
  goals; differs by event-log DVCS, CRDT entities, optional private Community,
  and deploy/ops platform depth.

## Architecture Snapshot

| Plane | Tangled mechanism |
|---|---|
| Identity | DID + handle; any PDS (including Bluesky) |
| Social / collab metadata | `sh.tangled.*` records on author PDS |
| Code | Git on knots (SSH/smart HTTP), not on PDS |
| Aggregation | AppView; Bobbin as read-only XRPC AppView |
| CI | Spindles (Nixery / microVM engines) |

## Epoch Implications

- Track as competition only — Epoch does **not** integrate with or bridge to
  Tangled product surfaces.
- Epoch social plane uses Epoch-native ATProto lexicons and its own Git
  compatibility proxy for interop with generic Git clients.
- Differentiate on signed intents, CRDT merge, channel/agent UX, Community
  off-switch, and Platform deploy/ops.

## Related Epoch Docs

- [Git compatibility proxy](../../../git-compatibility-proxy.md)
- [Community ATProto](../../../community-atproto.md)
- [Community human-centered design](../../../community-human-centered-design.md)
