# Epoch Current Feature Registry

This registry describes features implemented in the current TypeScript prototype. It intentionally excludes roadmap items that do not have executable coverage in `features/`.

## Executable Feature Specs

The current registry is backed by these Cucumber feature files:

| Feature spec | Coverage focus |
|---|---|
| [`features/repository.feature`](../features/repository.feature) | Repository creation, asset push, signed versions, materialization, verification, sync, hooks, and Git import/export. |
| [`features/actors.feature`](../features/actors.feature) | Async actor facade and per-user authorship. |
| [`features/crdt_log.feature`](../features/crdt_log.feature) | Operation CRDT events and materialized map/text state. |
| [`features/merge.feature`](../features/merge.feature) | Intent policy and entity merge behavior. |
| [`features/named_views.feature`](../features/named_views.feature) | Named logical views and promotion flows. |
| [`features/cli_wasm.feature`](../features/cli_wasm.feature) | CLI command behavior and WASM-safe exports. |
| [`features/wasm_react.feature`](../features/wasm_react.feature) | Browser-safe React state persistence, rewind, rematerialization, and resume flows. |
| [`features/ha_dr.feature`](../features/ha_dr.feature) | Compacts, backups, seed bootstrap, and recovery flows. |
| [`features/advanced_collaboration.feature`](../features/advanced_collaboration.feature) | Signed collaboration objects, gates, memory transport, reusable conflict resolutions, operation events, CSV adapters, redactions, and serialization providers. |

## F-001 - Signed Event Log

Every repository stores signed immutable events under `.epoch/events`.

Implemented behavior:

- `EpochRepository.init(author?)` creates repository metadata and an Ed25519 identity.
- `EpochRepository.create(root, options)` and `openOrCreate(root, options)` provide one-call repository creation helpers.
- `recordFile(path, mimeType)` appends a signed `record` event with causal parents.
- `events()`, `read(eventId)`, and `heads()` expose the local event log.
- `verify()` checks event IDs, signatures, parent references, heads, and blob integrity.

Covered by:

- `features/repository.feature`
- `features/actors.feature`

## F-002 - Content-Addressed Blob Storage

Recorded file content is stored once by SHA-256 hash under `.epoch/blobs`.

Implemented behavior:

- Blob hashes, sizes, and MIME types are recorded in event payloads.
- Duplicate content reuses the same content-addressed blob.
- Verification reports missing, tampered, or size-mismatched blobs.

Covered by:

- `features/repository.feature`

## F-003 - Intent Policy

Epoch represents requested changes as intents. Maintainers can sign merge, rejection, and comment events for those intents.

Implemented behavior:

- `intentFile()` and `intent()` create signed `intent` events.
- `mergeIntent()`, `rejectIntent()`, and `comment()` create signed policy events.
- `policy()`, `mainIntentIds()`, `mergedIntents()`, and `mainPatches()` compute the deterministic main projection.
- The CLI exposes `intent`, `merge`, `reject`, `comment`, `status`, and `main`.

Covered by:

- `features/merge.feature`
- `features/cli_wasm.feature`

## F-004 - Entity Merge Registry

Epoch includes a pluggable registry for snapshot-style entity merges.

Implemented behavior:

- `CRDTRegistry.defaults()` provides text and JSON merge behavior.
- `threeWayMerge()` handles text defaults and JSON object merges.
- `epoch resolve --type MIME BASE LEFT RIGHT` exposes the registry through the CLI.
- WASM exports expose the registry helpers without native filesystem access.

Covered by:

- `features/merge.feature`
- `features/cli_wasm.feature`

## F-005 - Operation CRDT Log

Epoch can store operation-based CRDT updates as signed events and materialize convergent map/text views.

Implemented behavior:

- `appendCRDTOperation()` records map and text CRDT operations.
- `materialize(entity)` replays CRDT events into the current materialized value.
- `EpochActorSystem` exposes async CRDT operation recording and materialization.

Covered by:

- `features/crdt_log.feature`
- `features/actors.feature`

## F-006 - Explicit Repository Sync

Local repositories can exchange missing events and blobs by repository path.

Implemented behavior:

- `syncFrom(peerPath)` copies missing events and blobs from a peer.
- `sync(peerPath)` performs two-way exchange by syncing both repositories.
- `epoch sync PEER_REPO` exposes two-way sync through the CLI.
- Sync currently targets local filesystem repository paths.

Covered by:

- `features/repository.feature`
- `features/crdt_log.feature`
- `features/cli_wasm.feature`

## F-007 - Lifecycle Hooks

Repository hooks observe core lifecycle points.

Implemented behavior:

- Hooks receive `EpochHookEvent` objects with a name, repository, timestamp, and detail payload.
- Hook names cover init, append, record, CRDT operation/materialization, read, events, heads, verify, sync, and gossip operations.

Covered by:

- `features/repository.feature`

## F-008 - Async Actor Facade

XState-backed actors serialize repository commands and support per-user authorship.

Implemented behavior:

- `EpochActorSystem` exposes async init, append, record, materialize, verify, and sync calls.
- `EpochUserActor` records events for a fixed author.
- Concurrent actor operations preserve per-author signing identities.

Covered by:

- `features/actors.feature`

## F-009 - Named Views

Named views compute deterministic logical workspaces over the shared event log.

Implemented behavior:

- `createView()`, `listViews()`, `checkoutView()`, `deleteView()`, `diffViews()`, and `promoteToView()` manage views.
- Inclusion rules include all, intent list, ancestor chain, tag filter, union, intersection, difference, until, and base view composition.
- Main view inclusion can be gated by approvals and CI statuses.
- The CLI exposes view create/list/checkout/delete/diff/promote commands.

Covered by:

- `features/named_views.feature`
- `features/cli_wasm.feature`

## F-010 - Compacts, Cold Backups, and Seed Bootstrap

Epoch can materialize a prefix of the log, prune local event files before that compact, and restore from backups.

Implemented behavior:

- `createCompact()`, `pruneEventLogBeforeCompact()`, `restoreFromCompact()`, `latestCompact()`, and `verifyCompact()` manage compacts.
- `createColdBackup()`, `restoreFromColdBackup()`, and `verifyColdBackup()` manage signed backup bundles.
- `bootstrapFromSeed()` and `bootstrapFromSeeds()` bootstrap peers from trusted local seed paths.

Covered by:

- `features/ha_dr.feature`

## F-011 - Git Compatibility

Epoch can bridge to trusted host Git repositories.

Implemented behavior:

- `importFromGit()` records tracked files from a Git repository.
- `exportToGit()` writes current recorded blobs to a Git repository and commits changes.
- `EpochCoreGit`, `EpochCLIGit`, and `Epoch.WASM.Git` expose Git-compatible surfaces with explicit unsupported errors where host access is unavailable.

Covered by:

- `features/repository.feature`
- `features/cli_wasm.feature`

## F-012 - CLI and WASM Entrypoints

The prototype includes command-line and WASM-facing integration surfaces.

Implemented behavior:

- The CLI covers repository init, record, intent policy, events, verify, sync, resolve, rollback, views, Git import/export, and disaster recovery plan output.
- WASM exports CRDT helpers and returns explicit unsupported errors for native Git operations.

Covered by:

- `features/cli_wasm.feature`

## F-013 - WASM React State History

Epoch includes browser-safe React helpers that persist local state changes as
append-only Epoch event history.

Implemented behavior:

- `@epoch/wasm-react` exposes `createEpochReactStore()`,
  `createMemoryEpochReactStorage()`, and `useEpochState()`.
- React state updates persist as append-only CRDT events that can be rewound
  and materialized at earlier points in history.
- Browser-hosted React flows restore persisted state and continue appending new
  events after rewind and rematerialization.

Covered by:

- `features/wasm_react.feature`

## F-014 - Advanced Collaboration And Gates

Epoch stores collaboration and policy state as signed events.

Implemented behavior:

- `createIssue()` records signed issue-style discussion roots.
- `reviewIntent()` records signed reviews against intents.
- `recordCI()` records signed CI attestations.
- `collaboration()` projects issues and reviews.
- `gateStatus()` deterministically evaluates required review state,
  approvals, rejections, and named CI checks.

Covered by:

- `features/advanced_collaboration.feature`

## F-015 - Transport And Serialization Providers

Epoch exposes transport and serialization seams without making either one
authoritative.

Implemented behavior:

- `exportToMemoryTransport()` exports events, heads, and blobs to an explicit
  memory transport packet.
- `syncWithTransport()` imports missing content from that packet and keeps
  verification as the trust boundary.
- `EpochTransport` defines the transport contract, and `BundleEpochTransport`
  persists a hash-checked bundle packet for offline handoff.
- `EpochSerializationProvider` lets repositories substitute event file
  serialization while preserving canonical event IDs and signatures.

Covered by:

- `features/advanced_collaboration.feature`

## F-016 - Media-Aware Entity Adapters And Conflict Reuse

Epoch's merge registry is aware of media types and can reuse signed conflict
resolutions.

Implemented behavior:

- `CRDTRegistry.defaults()` includes text, JSON, and row-keyed CSV merge
  adapters.
- `EntityRegistry.defaults()` exposes merge, diff, validation, redaction, and
  display adapter hooks where an adapter implements them.
- `recordConflictResolution()` records signed exact-match conflict
  resolutions.
- `reusableConflictResolution()` returns a prior resolution only when path,
  media type, base, left, and right match exactly.
- `mergeEntity()` reuses a signed exact-match resolution before falling back to
  media-aware adapter merge behavior.
- The CLI can record resolutions with `resolve --record-resolution` and reuse
  them with `resolve --path`.

Covered by:

- `features/merge.feature`
- `features/advanced_collaboration.feature`

## F-017 - Operation Events And Secret-Safe Redactions

Epoch represents local operation history and redaction workflow in the event
log.

Implemented behavior:

- `appendOperation()` appends signed operation events with command, status, and
  detail payloads.
- `operations()` projects operation events for recovery and explanation.
- `redactBlob()` appends a signed redaction marker for a blob hash and reason.
- `planRedaction()` reports affected event IDs, local blob presence, and
  whether a matching redaction already exists.
- `verify()` accepts missing blobs only when an exact redaction event exists.
- `redactions()` projects signed redaction markers.
- Mutating CLI commands append signed operation events for user-facing
  recovery and explanation, and `op-log` / `op-show` expose them.

Covered by:

- `features/advanced_collaboration.feature`

## F-018 - Browser Live VFS Repository

Epoch React helpers include a browser-safe live repository surface backed by a
virtual file system.

Implemented behavior:

- `createMemoryEpochVfs()` creates an in-memory virtual file system for browser
  and test hosts.
- `createEpochLiveRepository()` stores live entity events in the VFS.
- `syncFrom()` copies missing VFS event files between live repositories.
- `useEpochHistory()`, `useEpochEntity()`, and `useEpochView()` subscribe to
  live repository history and materialized entity state through
  `useSyncExternalStore`.

Covered by:

- `features/wasm_react.feature`

## F-019 - First-Class Repository Creation And Versions

Epoch can create repositories from empty directories or existing assets, then
bind deployable content to signed version manifests.

Implemented behavior:

- `epoch create` creates an empty signed repository with concise state output.
- `epoch push` opens or creates a repository, recursively records existing
  assets, skips `.epoch/`, `.git/`, and `node_modules/`, and creates a signed
  version by default.
- `EpochRepository.push()` and `EpochRepository.openOrCreate()` expose the same
  asset-first workflow through the SDK.
- `createVersion()`, `versions()`, `resolveVersion()`, and
  `materializeVersion()` manage signed `version` events.
- Version manifests reference a view/frontier, file blobs, source record
  events, and optional CRDT snapshot blobs.
- Version materialization writes recorded files, CRDT JSON snapshots, and an
  `epoch-version.json` manifest while refusing to overwrite non-empty output by
  default.
- `epoch version create`, `epoch versions`, `epoch version show`, and
  `epoch version materialize` expose the version workflow through the CLI.

Covered by:

- `features/repository.feature`
