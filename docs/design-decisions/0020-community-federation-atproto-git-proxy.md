# ADR-0020: Community Federation Via ATProto And Git Compatibility Proxy

## Status

Accepted (design). Implementation is phased; this ADR freezes the product
boundary and authority model.

## Context

Epoch Community today is an optional Platform capability with in-memory
profiles, follows, stars, feeds, and a separate Community API/Web stack
([ADR-0007](0007-platform-community-module.md),
[ADR-0008](0008-separate-platform-web-and-community.md)). Identity is local
Ed25519 authorship ([ADR-0001](0001-design-philosophy-and-inspiration.md)).
There is no federated social graph and no network-facing code host that the
broader developer ecosystem expects.

**AT Protocol social coding** implies portable DID identity, social and
collaboration metadata as records on user Personal Data Servers (PDSes), and
Git-shaped clone/push URLs for tools and CI. Epoch is not Git; its canonical
store is a signed event log with CRDT-aware entities.

ADR-0007 already anticipated federation: revisit if Community becomes
federated. Shipping ATProto without a Git façade would yield portable social
cards that cannot host code for ordinary Git clients.

## Decision

Adopt a **dual-plane federated Community** model:

1. **Social plane (ATProto)** — Public social graph and public collaboration
   metadata (profiles, follows, stars, public issues/discussions/proposals) are
   written as Epoch-native lexicon records (`org.epoch.*` unless a controlled
   NSID is chosen later). Users authenticate with DIDs/handles. An AppView
   (query/materialization layer) aggregates firehose data for timelines and
   search. Private Community content stays on Platform and is never published
   as public AT records.

2. **Code plane (Git compatibility proxy)** — Network-facing Git
   (smart HTTP first; SSH later) is provided by a **Git compatibility proxy**
   that projects Epoch repositories to Git refs/objects and ingests Git pushes
   and upstream mirrors into signed Epoch events. Epoch Core remains
   authoritative. Git is a projection and migration boundary, not a second
   source of truth. Details live in
   [ADR-0021](0021-git-projection-and-live-migration.md) and
   [docs/git-compatibility-proxy.md](../git-compatibility-proxy.md).

3. **Enterprise plane (Platform)** — Community remains optional. Modes:

   | Mode | Behavior |
   |---|---|
   | Disabled | No AT writes; APIs return `feature_disabled` |
   | Local-only | Social graph in tenant storage; no PDS publish |
   | Federated | Public objects to user PDS; AppView indexes |

4. **Lexicon strategy** — Epoch-native lexicons only for the product surface.
   No third-party forge lexicon bridges in product scope.

5. **Identity binding** — Platform users and Epoch authors may bind a DID.
   Core continues to verify Epoch signatures. DID is the federated social
   identity; Ed25519 remains the local event author key until a rotation story
   unifies them.

Public `org.epoch.repo` records MUST include a `gitCloneUrl` pointing at the
Git proxy (and MAY include a native `epochSyncUrl`). Without the proxy URL,
AT repo cards cannot serve ordinary Git clients.

## Consequences

Positive:

- Community social data can become portable across PDSes (account migration).
- Git clients and CI can interact with Epoch-backed repos via the proxy.
- Private enterprise installs keep a clean off-switch and local-only mode.
- Epoch differentiators (signed intents, CRDT merge, deploy platform,
  channel/agent UX) stay on Core rather than being rewritten as Git.

Trade-offs:

- Two identity systems (DID + Epoch author) until binding UX is mature.
- Git projection is lossy for pure intent/CRDT semantics; only file/tree
  projection is guaranteed in early phases.
- AppView is a cache and can drift; backfill and verify gates are required.
- Operational surface grows (proxy, optional firehose ingest, PDS dependency
  for federated mode).

## Revisit Criteria

Revisit if:

- AT Protocol gains first-class private records that change the public/private
  split;
- a pure Epoch-native network (no Git) becomes sufficient for target users;
- lexicon namespace strategy needs to change; or
- DID and Epoch signing keys are unified under one portable key lifecycle.

## Coverage

Design and research:

- [docs/git-compatibility-proxy.md](../git-compatibility-proxy.md)
- [ADR-0021](0021-git-projection-and-live-migration.md)
- Competition tracking (not product integration):
  [docs/competition/products/tangled/](../competition/products/tangled/)

Implementation coverage:

- `packages/Epoch.Core/src/git-projection.ts`
- `packages/Epoch.Git.Proxy` (`@epoch/git-proxy`)
- `packages/Epoch.Atproto` (`@epoch/atproto`)
- `test/unit/git-projection.test.ts`, `test/unit/git-proxy.test.ts`,
  `test/unit/atproto-community.test.ts`
- Operator: [docs/git-live-migration-cutover.md](../git-live-migration-cutover.md),
  [docs/community-atproto.md](../community-atproto.md)
