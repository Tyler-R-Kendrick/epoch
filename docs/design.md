# Epoch Current Design

This document describes the implementation that exists in this repository today. Roadmap ideas belong outside this current-state design until they have code and feature coverage.

## Summary

Epoch is a TypeScript prototype for a signed, event-driven DVCS. A repository is a filesystem directory with `.epoch/` metadata, signed append-only events, content-addressed blobs, CRDT helpers, explicit sync between local repository paths, intent policy events, named views, signed deployable versions, HA/DR compacts, and Git compatibility adapters. The workspace also contains `Epoch.Platform.Core` and `Epoch.Platform.Sdk` for headless control-plane workflows, `Epoch.Platform.Web` as the hosting control-plane PWA for Epoch services, and separate Community API, Core client, CLI, and Web packages for GitHub-like repository collaboration.

## Repository Layout

An initialized repository contains:

```text
.epoch/
  blobs/
  compacts/
  events/
  patches/
  users/
  checkout.json
  config.toml
  heads.json
  identity.json
  views.json
```

- `events/` stores signed event JSON by event ID.
- `blobs/` stores recorded content by SHA-256.
- `users/` stores per-author signing identities.
- `heads.json` stores current event frontier IDs.
- `views.json` stores current named-view state.
- `compacts/` stores materialized log-prefix compacts and their manifest.
- `config.toml` stores local repository config; `init` seeds `[working_tree] materialization = "virtual"`.
- `checkout.json` and `patches/` are the virtual working tree cache (see below).

### Virtual Working Tree

`checkout` and `version materialize` support a virtual materialization mode that
writes only the files a view changes relative to a base; unchanged files stay
virtual. A virtual checkout records `checkout.json` (every path with its
`blob_sha256`, `size`, and `virtual`/`materialized` status) and a rolling
`base -> view` unified diff at `patches/<hash>.patch`. `previewPatch()` prints
that aggregate without materializing, and `hydrate()` realizes virtual files from
blobs on demand. These artifacts are regenerable local caches, like `views.json`
and `compacts/`: they are not signed and are excluded from `verify()`, which
still re-hashes whole-content blobs. `checkoutView()` with `materialization:
"full"` restores whole-tree materialization.

This mode selects files by *difference from a base*, not by user interest, so it
is delta materialization rather than sparse checkout.
[ADR-0038](design-decisions/0041-workspace-selection-and-materialization-modes.md)
keeps the behavior, renames the mode to `delta`, and adds a separate
workspace-local Selection; neither the rename nor Selection is implemented yet.

## Event Model

Every event includes:

- type
- author
- author public key
- Lamport timestamp
- parent event IDs
- payload
- Unix timestamp
- signature
- content-derived event ID

`EpochRepository.append()` signs and persists events, updates heads, and records view-local intents when the current view is not `main`.

## Current Event Types

The current domain constants include:

- `record`
- `crdt`
- `intent`
- `intent.merge`
- `intent.reject`
- `intent.comment`
- `collaboration.issue`
- `collaboration.review`
- `conflict-resolution`
- `file.copy`
- `file.delete`
- `file.forget`
- `file.move`
- `operation`
- `redaction`
- `rollback`
- `version`
- `view-definition`
- `approval`
- `rejection`
- `ci`

Records, CRDT operations, and native file lifecycle events are also treated as
intents for named-view projection because they represent requested, not yet
necessarily accepted, state changes.

## Repository Creation And Versions

`EpochRepository.create()` and `EpochRepository.openOrCreate()` provide
one-call repository creation helpers on top of the existing `init()` layout.
`push()` is the asset-first workflow: it opens or creates a repository, walks
requested files/directories under the repository root, skips `.epoch/` and
`.git/`, applies Epoch ignore rules, records changed assets, enforces configured
new-file size limits, and creates a signed version unless disabled.

Native working-tree commands are part of the main `epoch` CLI. `mv`, `rm`, `cp`,
`track`, and `forget` append signed `file.*` or `record` events so path
lifecycle intent survives sync and version materialization. `status` projects
tracked, modified, deleted, untracked, and ignored paths from the current
filesystem and signed record projection. Ignore discovery reads `.epochignore`,
`.epoch/info/exclude`, and any TOML-configured global ignore file.

Repository configuration is TOML-based. Local settings live in
`.epoch/config.toml`; shared project policy can live in `epoch.toml` and be
recorded as normal repository content. The current enforced config value is
`working_tree.max_new_file_bytes` for automatic asset capture.

`version` events bind a materialized view/frontier to a manifest of files and
optional CRDT entity snapshots. File entries reference existing
content-addressed blobs and source record events. CRDT snapshots are written as
JSON blobs and reference the CRDT source events included in the selected view.

`materializeVersion()` resolves a version by id or unambiguous name, verifies
referenced blobs through normal repository verification, writes files and
snapshots into a clean output directory, and writes `epoch-version.json` next to
the materialized output. Non-empty output directories are rejected unless the
caller explicitly forces replacement.

## Intent Policy

`intentFile()` creates an intent from file patches. `mergeIntent()` and `rejectIntent()` append signed decisions. `policy()` computes merged, rejected, and pending intents with configurable merge-signature requirements and optional maintainer filtering.

The main projection is derived from merged, non-rejected intents. Direct `record` and `crdt` events can also participate in named views as local intents.

Signed collaboration objects extend the same event log. `createIssue()` records
issue-like discussion roots, `reviewIntent()` records review decisions against
intents, and `recordCI()` records signed CI attestations. `gateStatus()` is a
pure projection over intent, review, approval, rejection, and CI events, so
policy is deterministic and local verification still decides trust.

## CRDT Surfaces

Epoch has two entity and CRDT-related surfaces:

- `CRDTRegistry` handles snapshot-style three-way merges for media-aware entity
  adapters. Defaults include text, JSON, and row-keyed CSV.
- `recordCodeOperation()` records signed operation-level CRDT updates. Optional Change, session, tool, and private-conversation-digest context links code edits to collaboration without publishing raw transcripts. `materialize(entity)` replays those events into a current map or text value.

The operation CRDT backend is Collabs with a protobuf override documented in
[ADR-0002: CRDT Backend Selection](crdt-backend-decision.md).

Reusable conflict resolutions are signed `conflict-resolution` events. They
match only when path, media type, base value, left value, and right value hash
to the same conflict identity.

Redaction is represented by signed `redaction` events. Local verification
accepts a missing blob only when a redaction event references that exact blob
hash, preserving audit evidence without promising global deletion from peers
that already copied the bytes.

## Sync

`syncFrom(peerPath)` copies missing event and blob files from another local repository path, then merges heads.

`sync(peerPath)` performs two-way exchange by syncing both repositories. The CLI exposes this as:

```bash
epoch sync PEER_REPO
```

`EpochTransport` is the transport contract. `exportToMemoryTransport()` and
`syncWithTransport()` provide an explicit transport seam for moving events,
heads, and blobs without making the transport authoritative. `BundleEpochTransport`
persists the same hash-checked packet for offline handoff. A transport packet
is still verified after import. Browser helpers use a virtual file system for
live local repository state rather than assuming Node filesystem access.

This implementation does not include network discovery, access control, or always-on background replication.

## Serialization

Event files use a pluggable `EpochSerializationProvider`. JSON remains the
default provider, but repositories can substitute another serializer with its
own format and file extension. Event IDs and signatures continue to use
canonical JSON over the unsigned event payload so alternative wire/storage
formats do not change identity or verification semantics.

## Named Views

Named views are deterministic projections over event IDs. The current implementation supports:

- `all`
- `intent-list`
- `ancestor-chain`
- `tag-filter`
- `union`
- `intersection`
- `difference`
- `until`
- `base`

View APIs include `createView()`, `listViews()`, `checkoutView()`, `deleteView()`, `computeViewState()`, `diffViews()`, and `promoteToView()`.

## Compacts And Recovery

Compacts materialize a prefix of the event log and referenced blobs into signed data under `.epoch/compacts`.

Current HA/DR APIs include:

- `createCompact()`
- `pruneEventLogBeforeCompact()`
- `restoreFromCompact()`
- `latestCompact()`
- `verifyCompact()`
- `createColdBackup()`
- `restoreFromColdBackup()`
- `verifyColdBackup()`
- `bootstrapFromSeed()`
- `bootstrapFromSeeds()`

See `docs/HA-DR.md` for operator usage.

## Hooks And Actors

Hooks observe repository lifecycle events for init, append, record, CRDT operation/materialization, read, event listing, heads, verify, sync, and gossip.

`EpochActorSystem` wraps a repository with serialized async command handling. Per-user actors attach a stable author to appended and recorded events.

Operation history is covered by signed `operation` events. `appendOperation()`
records command, status, detail, author, and causal parents in the shared event
log; `operations()` projects those events for recovery and explanation.
Mutating CLI commands append operation events automatically.

See the [Core SDK Reference](sdk.md) for actor API, CRDT operation, and hook examples.

## CLI And Git Compatibility

The CLI exposes the currently implemented repository, intent, sync, view, merge, Git import/export, and HA/DR plan flows. Git compatibility classes bridge trusted host Git repositories where native filesystem and Git access are available. WASM-facing Git helpers return explicit unsupported errors for native host operations.

See the [CLI Reference](cli.md) for source-checkout shorthand, installed binaries, command groups, and Git-compatible command behavior.

## Epoch.Platform Core, SDK, And Web Foundation

`@epoch/platform-core` provides the Epoch.Platform domain service. It can run as
an in-memory service for focused tests and embedded demos, or as a
filesystem-backed service through `createFileSystemPlatformCore()` for durable
control-plane state. Filesystem-backed Core writes `platform-state.json` as a
hash-verified state envelope, rejects tampered state during startup, stores
backup artifacts under the configured data directory, verifies backup manifests
against their snapshots, restores fresh instances from verified backup
artifacts, and verifies webhooks with HMAC signatures. Core owns platform state
and invariants for:

- capability discovery, including optional Community enablement
- organization, project, repository, environment, and deployable creation
- project overview empty-state actions
- first-run readiness across infrastructure, backup destination, and first deployment
- runner registration and deployment job logs
- secret references that appear in deploy plans without exposing plaintext
- deploy plan generation with source, target, required approvals, primary action labels, impact summary, rollback strategy, and SDK operation metadata
- protected-environment approval checks before deployment execution
- platform users, teams, memberships, and team role bindings for protected
  environment approval governance
- SSO provider configuration, SCIM user provisioning, service accounts, API
  tokens, sessions, and typed API request correlation
- HMAC webhook registration/signature verification and replayable platform events
- secret rotation, access grants, reference-only reads, audit export, retention,
  compliance reports, tenant export, and tenant export deletion
- deployment execution audit events
- degraded deployment incident diagnosis and rollback
- failed deployment classification, incident acknowledgement, and follow-up
  issue creation
- AI action plans with approval-gated execution and audit records
- AI context packs, source citations, secret redaction, tool authorization, and
  eval result recording
- issues, review intents, CI checks, AI review summaries, approvals, and merge
  state for forge collaboration
- package publication from deployments and platform search across repositories,
  deployables, and packages
- observability summaries for runner count and latest deployment state
- infrastructure targets, resources, deployable templates, manifest discovery,
  dry-run plan editing/canceling, deployment promotion, runner heartbeat,
  runner quarantine, platform job retry, runner-loss reconciliation, and
  configuration validation
- operator dashboards, support bundles, backup start/verify with manifest
  artifacts, restore dry-run, backup-artifact restore, HA profile declaration,
  and failover drill records
- Community project publication only when Community is enabled
- Community visibility policy review and Community status reporting
- Community showcase publication guarded by project maintainer RBAC when a
  project is RBAC-managed
- Community moderation approval before public visibility
- Community public/internal/private profiles, follows, stars, bookmarks,
  discussions, public activity feed, personalized feed entrypoint, discussion
  reports, AI-assisted moderation triage, and report resolution
- Community topics, showcase assets, public releases, contribution reputation,
  search, abuse throttles, takedowns, blocking, legal-hold export, and worker
  disablement state
- platform snapshots that restore Core and Community state into a fresh Core
  instance

`@epoch/platform-sdk` wraps the Core API with a headless management surface for operators, automation, and agents. It intentionally delegates correctness to Core rather than duplicating business rules.

## Platform Web Apps

`Epoch.Platform.Web`, `Epoch.Community.Web`, and
`Epoch.Community.Operations.Web` are separate projects.

`Epoch.Platform.Web` is a PWA SPA definition for operating Epoch hosting
infrastructure. It exposes deployable service descriptors for the Epoch node,
object store, sync seed, and any explicitly registered Epoch app. Its
`communityWorkflows` surface is intentionally empty.

`Epoch.Community.Web` is a separate deployable Epoch community product. Its
canonical browser runtime is Nightboard: a CanvasUI creator landing at `/` and
a tmux-style, keyboard-first board at `/board.html`, both sourced from
`docs/design-explorations/nightboard`. The local server and Vercel static build
use that same source tree, so no second visual shell can drift into production.
Nightboard renders a hierarchical navigator + detail blade over Community
Core's stable objects, explicit relations, projections, navigation operations,
normalized saved queries, and action descriptors. Filesystem-like paths are a
namespace adapter rather than object identity; reply ancestry and tombstones
remain explicit when aliases, order, visibility, or projection change. The
generated browser artifact prevents a second identity/graph/action algorithm
from drifting away from Core.
`Epoch.Community.Core` and the package model still own the API-facing repository,
issue, review, discussion, profile, and release contracts used by CLI and
integration code. `materializeCommunityWebSiteWithEpoch()` remains available to
produce signed-history snapshots, but its historical document renderer is not a
local or deployment entrypoint.

Community Web design is driven by design thinking, user-centric design, and
human-centered design. The default persona is a GitHub open-source contributor
who needs trustworthy repository state, security context, cost clarity,
accessible contribution paths, and graceful recovery when hosted dependencies
are degraded. See
[Epoch Community Human-Centered Design](community-human-centered-design.md) and
[ADR-0012](design-decisions/0012-community-human-centered-design.md).

`Epoch.Community.API` owns the in-memory API implementation for the current
prototype and its versioned persisted object/projection state.
`Epoch.Community.Core` owns shared canonical object, graph, projection, query,
navigation, action, transport, and API client contracts. `Epoch.Community.CLI`
uses Core to list repositories and operate issue/change-review workflows from
the command line.

See [Epoch Platform Packages](platforms.md) and
[ADR-0008](design-decisions/0008-separate-platform-web-and-community.md). See
[ADR-0010](design-decisions/0010-epoch-community-design-system.md) for the
Community design-system decision and
[ADR-0011](design-decisions/0011-community-web-dogfoods-epoch.md) for the
Community Web dogfooding history and
[ADR-0027](design-decisions/0027-community-visual-world-nightboard.md) for the
canonical runtime decision, and
[ADR-0028](design-decisions/0028-nightboard-startup-routing-and-hobo-authoring.md)
for recoverable startup, workspace-sticky model routing, and deterministic HoBo
authoring through the default Bo agent.

### Federated Community and gossip (shipped MVP)

Public Community federation is implemented as an MVP in `@epoch/atproto`
(`FederatedCommunity`, mock PDS, lexicons, public artifact dual-write) per
[ADR-0020](design-decisions/0020-community-federation-atproto-git-proxy.md),
[ADR-0022](design-decisions/0022-gossip-event-plane-atproto-public-artifacts.md),
and [docs/community-atproto.md](community-atproto.md).

- **Gossip** (`GossipPeer`, HTTP `/epoch/gossip`) is the authoritative network
  event plane for signed events and blobs; path-based `gossip` remains.
- **ATProto** carries public social metadata and optional public artifact
  mirrors (`org.epoch.release`); AT CIDs are location hints only.
- The [Git compatibility proxy](git-compatibility-proxy.md) is the Git façade
  for clone/push and live migration ([ADR-0021](design-decisions/0021-git-projection-and-live-migration.md)).

Epoch Core remains authoritative; Community disabled and local-only modes stay
supported. Private content never touches ATProto.

`Epoch.Community.Operations.Web` is a separate Coolify-inspired project
operations extension. It consumes `Epoch.Platform.Sdk` and
`Epoch.Platform.Core` contracts to project existing Platform state into hosted
apps, preview deploys, GitHub Actions-style workflow runs, agent sandboxes,
runners, secrets metadata, and signed activity. It exports a generic deployment
target so Platform Web can register it without importing the extension package.
It does not mutate Platform Core; Core remains authoritative for deployments,
jobs, runners, secrets, AI plans, policy, and audit.

See [Epoch Platform Packages](platforms.md),
[ADR-0008](design-decisions/0008-separate-platform-web-and-community.md), and
[ADR-0013](design-decisions/0013-community-operations-extension-package.md).

## Change Graph And Operation History

The current implementation separates browser-safe contracts from host
adapters:

- `@epoch/protocol` defines `epoch.protocol/v1`, typed stable IDs and errors,
  Revision/Change/Change Graph/Review Bundle/Merge Plan schemas, the revset parser/evaluator, and
  browser-safe graph, filter, sync, and SWHID inspection.
- `@epoch/core` implements explicit-parent atomic transactions, Change Graphs,
  exact split/review/merge validation, durable conflicts,
  conservative commutation, object/chunk/promise verification,
  `epoch.sync/v2`, and workspace providers.
- `@epoch/git-proxy` projects deterministic SHA-1 Git objects and refs, keeps
  incoming objects in quarantine until validation, forwards a validated
  `Git-Protocol` value as `GIT_PROTOCOL`, and advertises `filter` only when a
  promisor is configured and tested.
- `@epoch/forge` supplies public-only loss-aware codecs and an injected mirror
  coordinator with explicit direction/authority, expected-old-OID drift,
  idempotency, checkpoints, SSRF policy, and per-ref pause.
- `@epoch/identity` models principals, attenuated grants, budgets, and receipts;
  its shipped authority ledger is in memory, so durable deployments inject a
  transactional store.
- `@epoch/software-heritage` parses and computes SWHID v1.2 identifiers and
  exposes an injected Save Code Now client for public origins. The Change Graph
  CLI ships a default HTTP adapter (`EPOCH_SWH_SAVE_URL` overrides the
  endpoint) and still denies private or non-HTTPS origins.

Pre-release compatibility identifiers and aliases are not supported. Change
Graph CLI commands persist signed protocol events. A leftover
`.epoch/change-graph-v1.json` file is ignored and is not authoritative.

Capability manifests are authoritative. The Git service is a bounded
protocol-v2 subset, ForgeFed reports `transport: none`, F3 is a codec rather
than a native server, browser OPFS/IndexedDB are detected capabilities rather
than implicit persistence, and Rift is only an explicit safe launch spec whose
execution mode is `in-process`. Details and escape paths are in
[Change Graph And Operation History](change-graph.md). Canonical terms are in
[Epoch Nomenclature](nomenclature.md).

## Extensions And Capability Providers

`@epoch/extensions` implements the two-tier extension model. External
subcommands resolve as `epoch-<name>` from `.epoch/ext/bin`,
`~/.epoch/ext/bin`, then `$PATH`, and run only when the `[extensions]` trust
policy in repository config admits them; discovery without trust is reported,
not silently executed or silently ignored. `CapabilityRegistry` holds typed
providers for `command`, `syntax`, `diff`, `merge`, `compression`, `view`,
`codec`, and `hook`, resolved by explicit pin, then match specificity, then
provider ID — never registration order. `CapabilityRegistry.describe()`
produces the provider descriptor recorded alongside signed state.

`epoch ext list|show|trust|untrust` is the operator surface. See
[Extensions And Capability Providers](extensions.md) and
[ADR-0037](design-decisions/0037-extension-mechanism-and-capability-registry.md).

## Spaces

`@epoch/core` ships `SignedSpaceStore`, the object a second person can join. A
Space composes existing primitives and replaces none of them: one View selects
history, Workspaces materialize it per machine and keep reporting their own
capability facts, Principals hold Grants and Budgets, and each turn records the
declared execution mode it ran under. `epoch.space/v1` events —
`space.created`, `space.participant.joined/left`, `space.workspace.bound`,
`space.turn.recorded`, `space.capture.opened/closed/operation`, and
`space.anchor.recorded` — are signed protocol events on the ordinary event log,
so `verify()` covers them and sync carries them without a new transport.

The governance is enforced rather than described:

- **Joining is receiving a grant.** Membership and authority are one fact, so
  leaving revokes in the same signed event and a departed participant's turns
  are refused immediately.
- **Turns are bounded.** A turn without a live grant is `grant-denied`, a turn
  past its allocation is `budget-exceeded`, and an `observer` grant never
  authorizes one.
- **Capture requires recorded consent.** Continuous Code Operation capture is
  refused outside an open Capture Session, whose declared scope, retention, and
  redaction policy is itself signed history.
- **Workspaces stay truthful.** Binding routes through
  `createWorkspaceStateManifest()`, so a Space cannot claim isolated execution,
  copy-on-write, or residency the provider did not positively declare.
- **Anchors are structural.** A comment binds to `(RevisionId, structural
  path)` resolved through `@epoch/semantic`, so it survives reformatting and
  reordering (`moved`) and reports honestly when the construct is deleted
  (`unresolved`) instead of pointing at the wrong place.

`epoch space ...` is the operator surface. Phases that remain unbuilt are named
in [ADR-0042](design-decisions/0042-spaces-shared-signed-workspaces.md): there
is no mount provider, no isolated execution provider, and no federated join, so
a per-turn Sandbox binding currently records a fact rather than enforcing a
boundary.

## Semantic Content Pipeline

`@epoch/semantic` is a browser-safe engine for structural diff, patch, merge,
and compression planning over a bytes → lines → tokens → syntax → entities
ladder. Artifacts are keyed by structural path (`object#0/member:version`)
rather than line offset, so a structural patch still applies after the target
is reformatted, and a conflict still names the same construct after a rebase.

Builtin syntax providers cover JSON, a TOML subset, Markdown heading trees, and
a generic balanced-delimiter provider for brace-delimited languages. The
delimiter provider recovers block structure and is not a grammar;
grammar-backed providers are expected to arrive as extensions through the
capability registry.

Merge resolves disjoint subtrees independently, merges independent insertions
into declared commutative containers, and leaves genuine disagreement as a
path-scoped conflict carrying a formatting-insensitive signature for reusable
resolutions. Compression planning provides syntax-guided chunking grouped by
node count, subtree dedup, deterministic dictionary derivation, and semantic
deltas; object identity and `verify()` are unchanged, since SHA-256 over whole
content remains authoritative.

`epoch semantic diff|apply|merge|plan` is the operator surface. See
[Semantic Content Pipeline](semantic-pipeline.md) and
[ADR-0038](design-decisions/0038-semantic-diff-merge-and-compression.md).

## Non-Goals In The Current Prototype

The current implementation does not provide:

- network peer discovery
- repository access control
- key rotation
- signed tags
- remote publishing for `push`
- shallow clones
- delta sync
- timestamp restoration
- configured hook scripts
- automatic background sync scheduling
- persisted Epoch.Platform control-plane storage
- real Epoch.Platform runners or infrastructure adapters
- production container orchestration for the platform service descriptors
- process, filesystem, or network sandboxing of external extensions
- grammar-backed syntax providers for general-purpose languages
- byte-level entropy coding or a packfile format for semantic compression
- a kernel VFS/FUSE mount provider, an isolated execution provider, or
  federated Space discovery (ADR-0042 phases 4 through 6)
- the ADR-0039 native capabilities that have no code yet (`absorb`, `log --smart`, `undo`, `graph restack`, `changelog`, `rewrite`, `pick`, `compose`)
- writable nested Repository Links, overlapping mount roots, and transparent
  lazy (VFS/FUSE) materialization; `lazy` currently behaves like `explicit`
  ([ADR-0040](design-decisions/0040-repository-composition-and-links.md),
  [ADR-0041](design-decisions/0041-workspace-selection-and-materialization-modes.md))
- Repository Link resolution over the network: links resolve through injected
  resolvers and local sibling repositories only
