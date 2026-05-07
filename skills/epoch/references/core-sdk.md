# Epoch Core SDK Reference

Use the Core SDK when an application needs direct programmatic access to Epoch repositories.

## Package and imports

- Workspace package: `@epoch/core`
- React package: `@epoch/wasm-react`
- Root package export: `epoch`
- Git compatibility export: `epoch/Epoch.Core.Git`

Primary exports include `EpochRepository`, `EpochActorSystem`, `CRDTRegistry`, CRDT helpers, transport and serialization helpers, lifecycle hook types, backup/compact helpers, seed-node helpers, and Git compatibility classes.

See the public [SDK docs](../../../docs/sdk.md) for code examples.

## Repository lifecycle

1. Create repositories with `EpochRepository.create(root, options)`, `openOrCreate(root, options)`, or `new EpochRepository(root).init(author?)`.
2. Record data with `recordFile(path, mimeType)`, push existing assets with `push(paths, options)`, or create review flow events with `intentFile`, `mergeIntent`, `rejectIntent`, `comment`, `createIssue`, `reviewIntent`, `recordCI`, and `gateStatus`.
3. Create signed deployable versions with `createVersion(options)` and materialize them with `materializeVersion(reference, options)`.
4. Verify integrity with `verify()` before trusting or distributing state.
5. Exchange events and blobs with `sync(peerPath)` or `syncFrom(peerPath)`.

## CRDT workflow

Use operation-based CRDT events for shared agent state that changes frequently. Append map/register or sequence-text operations with the actor API, then materialize state with `materialize(entity)`.

Use `CRDTRegistry.defaults()` for built-in text, JSON, and CSV merges. Register custom CRDT definitions for application-specific entity types when three-way merge is not enough.

## Advanced collaboration and infrastructure

- `createIssue`, `reviewIntent`, `recordCI`, `collaboration`, and `gateStatus` keep collaboration state in signed events.
- `appendOperation` and `operations` represent command history in the event log.
- `recordConflictResolution`, `reusableConflictResolution`, and `mergeEntity` provide exact-match reusable resolutions and media-aware fallback merging.
- `redactBlob`, `planRedaction`, and `redactions` provide a signed local redaction workflow.
- `EpochTransport`, `exportToMemoryTransport`, `syncWithTransport`, and `BundleEpochTransport` expose explicit transport and bundle seams.
- `EpochSerializationProvider` lets callers substitute event serialization while preserving canonical event IDs and signatures.
- `EntityRegistry` exposes media-aware adapter capabilities beyond merge, including diff and redaction hooks where implemented.

## Hooks and actors

- Hooks observe init, append, record, CRDT, sync, verify, and materialization lifecycle points.
- `EpochActorSystem` coordinates async event-driven usage and per-user actors.
- Stop actor systems when work is complete to release XState resources.

## Git-compatible core surface

`epoch/Epoch.Core.Git` exposes host-filesystem Git compatibility helpers. Native Git operations are for trusted host environments and should not be assumed to work in WASM.

## React surface

Use `@epoch/wasm-react` for browser-safe React state history built on append-only Epoch events and for VFS-backed live repository hooks.
