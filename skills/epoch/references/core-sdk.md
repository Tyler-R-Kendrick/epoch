# Epoch Core SDK Reference

Use the Core SDK when an application needs direct programmatic access to Epoch repositories.

## Package and imports

- Workspace package: `@epoch/core`
- Root package export: `epoch`
- Git compatibility export: `epoch/Epoch.Core.Git`

Primary exports include `EpochRepository`, `EpochActorSystem`, `CRDTRegistry`, CRDT helpers, lifecycle hook types, backup/checkpoint helpers, seed-node helpers, and Git compatibility classes.

## Repository lifecycle

1. Construct `EpochRepository` with a repository root path.
2. Call `init(author?)` to create `.epoch/` metadata and identity files.
3. Record data with `recordFile(path, mimeType)` or create review flow events with `intentFile`, `mergeIntent`, `rejectIntent`, and `comment`.
4. Verify integrity with `verify()` before trusting or distributing state.
5. Exchange events and blobs with `sync(peerPath)` or `syncFrom(peerPath)`.

## CRDT workflow

Use operation-based CRDT events for shared agent state that changes frequently. Append map/register or sequence-text operations with the actor API, then materialize state with `crdtView(entity)`.

Use `CRDTRegistry.defaults()` for built-in text and JSON merges. Register custom CRDT definitions for application-specific entity types when three-way merge is not enough.

## Hooks and actors

- Hooks observe init, append, record, CRDT, sync, verify, and materialization lifecycle points.
- `EpochActorSystem` coordinates async event-driven usage and per-user actors.
- Stop actor systems when work is complete to release XState resources.

## Git-compatible core surface

`epoch/Epoch.Core.Git` exposes host-filesystem Git compatibility helpers. Native Git operations are for trusted host environments and should not be assumed to work in WASM.
