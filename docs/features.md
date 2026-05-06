# Epoch Current Feature Registry

This registry describes features implemented in the current TypeScript prototype. It intentionally excludes roadmap items that do not have executable coverage in `features/`.

## Executable Feature Specs

The current registry is backed by these Cucumber feature files:

| Feature spec | Coverage focus |
|---|---|
| [`features/repository.feature`](../features/repository.feature) | Repository initialization, recording, verification, sync, hooks, and Git import/export. |
| [`features/actors.feature`](../features/actors.feature) | Async actor facade and per-user authorship. |
| [`features/crdt_log.feature`](../features/crdt_log.feature) | Operation CRDT events and materialized map/text state. |
| [`features/merge.feature`](../features/merge.feature) | Intent policy and entity merge behavior. |
| [`features/named_views.feature`](../features/named_views.feature) | Named logical views and promotion flows. |
| [`features/cli_wasm.feature`](../features/cli_wasm.feature) | CLI command behavior and WASM-safe exports. |
| [`features/wasm_react.feature`](../features/wasm_react.feature) | Browser-safe React state persistence, rewind, rematerialization, and resume flows. |
| [`features/ha_dr.feature`](../features/ha_dr.feature) | Compacts, backups, seed bootstrap, and recovery flows. |

## F-001 - Signed Event Log

Every repository stores signed immutable events under `.epoch/events`.

Implemented behavior:

- `EpochRepository.init(author?)` creates repository metadata and an Ed25519 identity.
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
