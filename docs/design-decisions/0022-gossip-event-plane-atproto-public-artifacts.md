# ADR-0022: Gossip Event Plane + ATProto Public Artifact Distribution

## Status

Accepted (implemented MVP). Extends
[ADR-0020](0020-community-federation-atproto-git-proxy.md).

## Context

ADR-0020 federated public Community social metadata on ATProto and introduced a
Git compatibility proxy. Two gaps remained:

1. **Authoritative peer sync** for signed Epoch events and blobs still depended
   on local path `gossip`/`sync` or one-shot transports — no first-class network
   gossip session.
2. **Public artifact discovery** when no peer is online: ATProto was used for
   social records only, not dual-written public blobs.

Invariants must hold:

- Epoch Core is the sole source of truth for events and blobs.
- Private content never touches ATProto.
- Offline peers can sync with zero AT dependency.
- Integrity = Ed25519 events + SHA-256 blobs (AT CIDs are location hints only).
- Modes stay coherent: `disabled` | `local-only` | `federated`.

## Decision

### Gossip is the authoritative change/event store (network plane)

- Introduce `GossipPeer.exchange(snapshot)` over `MemoryEpochTransportSnapshot`.
- HTTP gossip: `POST /epoch/gossip` via `startGossipServer` / `HttpGossipPeer`.
- In-process: `LocalGossipPeer`.
- `EpochRepository.gossipExchange` fires the same `repository.gossip.before/after`
  hooks as path-based `gossip`.
- Local-path `gossip(peerRoot)` / `sync(peerRoot)` remain unchanged.

### ATProto is public artifact distribution only

- Extend `PdsTransport` with `uploadBlob` / `getBlob`.
- Lexicon `org.epoch.release` lists artifacts `{ sha256, size, mimeType?, atBlobCid? }`
  plus `epochSyncUrl` / `gossipPeers` hints and originating version event id.
- `publishPublicArtifacts` dual-writes **public** blobs only; uses existing
  `PrivatePublishError` / mode gates. AT publish requires `federated` mode.
- `verify()` remains pure local (SHA-256 + signatures); AT CIDs are never required.

### Hybrid resolution

Configurable order:

1. Local store  
2. Gossip peers (from card / session)  
3. AT public blob mirrors (public + federated only)

`bootstrapFromRepoCard` turns a public card into gossip peers + optional AT
artifact metadata. `disabled` / `local-only` ignore AT artifact paths.

## Consequences

Positive:

- Offline peer ↔ peer full history without AT.
- Public versions discoverable when no peer is online.
- Clear authority split: Core events vs AT mirrors.

Trade-offs:

- Dual-write can lag; clients must treat AT as best-effort cache.
- Mock PDS first; real PDS upload path is a follow-on adapter behind the same
  interface.

## Coverage

- `packages/Epoch.Core/src/gossip.ts`, `EpochRepository.gossipExchange`
- `packages/Epoch.Atproto` — blobs, release, hybrid helpers
- `epoch gossip|sync --peer|publish-artifacts` CLI
- `test/unit/gossip-atproto-integration.test.ts`
- [docs/community-atproto.md](../community-atproto.md)
