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
  users/
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
- `operation`
- `redaction`
- `rollback`
- `version`
- `view-definition`
- `approval`
- `rejection`
- `ci`

Records and CRDT operations are also treated as intents for named-view projection because they represent requested, not yet necessarily accepted, state changes.

## Repository Creation And Versions

`EpochRepository.create()` and `EpochRepository.openOrCreate()` provide
one-call repository creation helpers on top of the existing `init()` layout.
`push()` is the asset-first workflow: it opens or creates a repository, walks
requested files/directories under the repository root, skips `.epoch/`, `.git/`,
and `node_modules/`, records changed assets, and creates a signed version
unless disabled.

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
- `appendCRDTOperation()` records operation CRDT updates, and `materialize(entity)` replays signed CRDT events into a current map or text value.

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

`Epoch.Platform.Web` and `Epoch.Community.Web` are separate projects.

`Epoch.Platform.Web` is a PWA SPA definition for operating Epoch hosting
infrastructure. It exposes deployable service descriptors for the Epoch node,
object store, sync seed, and any explicitly registered Epoch app. Its
`communityWorkflows` surface is intentionally empty.

`Epoch.Community.Web` is a separate PWA SPA definition for the Epoch community
product. It consumes `Epoch.Community.Core` to read repository browsing, issue
tracking, change review, discussions, maintainer profiles, release discovery,
and organization-space data from an API client. It exports a generic deployment
target so a host can register Community with Platform Web without Platform Web
importing Community packages.

`Epoch.Community.API` owns the in-memory API implementation for the current
prototype. `Epoch.Community.Core` owns shared community domain types and the API
client wrapper. `Epoch.Community.CLI` uses Core to list repositories and operate
issue/change-review workflows from the command line.

See [Epoch Platform Packages](platforms.md) and
[ADR-0008](design-decisions/0008-separate-platform-web-and-community.md).

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
