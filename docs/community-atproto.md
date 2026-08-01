# Community ATProto

Design status: implemented MVP in `@epoch/atproto` (mock PDS, federation
service, public artifact dual-write, hybrid bootstrap). Normative product
boundary: [ADR-0020](design-decisions/0020-community-federation-atproto-git-proxy.md)
and [ADR-0022](design-decisions/0022-gossip-event-plane-atproto-public-artifacts.md).

## Authority split

| Plane | Role |
|---|---|
| **Gossip / Core** | Authoritative change and event store (Ed25519 events + SHA-256 blobs) |
| **ATProto** | Public social metadata + optional public artifact mirrors (CIDs are location hints only) |

Offline peers sync with **zero** AT dependency via gossip.

## Modes

| Mode | Gossip | AT social | AT artifact publish |
|---|---|---|---|
| `disabled` | path/HTTP gossip OK | blocked (`feature_disabled`) | blocked |
| `local-only` | path/HTTP gossip OK | local graph only | blocked |
| `federated` | path/HTTP gossip OK | PDS records | public dual-write only |

## Lexicons (`org.epoch.*`)

- `org.epoch.actor.profile`
- `org.epoch.graph.follow`
- `org.epoch.feed.star`
- `org.epoch.repo` (`gitCloneUrl`, `epochSyncUrl`, `gossipPeers`)
- `org.epoch.release` (version id, artifacts with `sha256` + optional `atBlobCid`, peer hints)
- `org.epoch.issue` / `org.epoch.issue.comment`
- `org.epoch.proposal` / `org.epoch.proposal.review`

## Private publish gate

Any attempt to federate non-`public` visibility fails with
`PrivatePublishError`. Private issues/artifacts never create AT records or blobs.

## Hybrid resolution

Order (public + federated):

1. Local `.epoch/blobs`
2. Gossip peers from card/session
3. AT `getBlob` using release artifact CIDs (then materialize locally)

`verify()` always uses local signatures and SHA-256 only.

## CLI

```bash
epoch gossip --peer http://host:port
epoch gossip --serve [--port N]
epoch sync --peer http://host:port
epoch publish-artifacts [--did DID] [--visibility public] [--mode federated] VERSION|EVENT_ID
```

## Git clone URL

Public repo cards set `gitCloneUrl` from the configured Git proxy base
(see [Git Compatibility Proxy](git-compatibility-proxy.md)).
