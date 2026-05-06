# Epoch Current Design

This document describes the implementation that exists in this repository today. Roadmap ideas belong outside this current-state design until they have code and feature coverage.

## Summary

Epoch is a TypeScript prototype for a signed, event-driven DVCS. A repository is a filesystem directory with `.epoch/` metadata, signed append-only events, content-addressed blobs, CRDT helpers, explicit sync between local repository paths, intent policy events, named views, HA/DR compacts, and Git compatibility adapters.

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
- `rollback`
- `view-definition`
- `approval`
- `rejection`
- `ci`

Records and CRDT operations are also treated as intents for named-view projection because they represent requested, not yet necessarily accepted, state changes.

## Intent Policy

`intentFile()` creates an intent from file patches. `mergeIntent()` and `rejectIntent()` append signed decisions. `policy()` computes merged, rejected, and pending intents with configurable merge-signature requirements and optional maintainer filtering.

The main projection is derived from merged, non-rejected intents. Direct `record` and `crdt` events can also participate in named views as local intents.

## CRDT Surfaces

Epoch has two CRDT-related surfaces:

- `CRDTRegistry` handles snapshot-style three-way merges for text and JSON entities.
- `appendCRDTOperation()` records operation CRDT updates, and `materialize(entity)` replays signed CRDT events into a current map or text value.

The operation CRDT backend is Collabs with a protobuf override documented in
[ADR-0002: CRDT Backend Selection](crdt-backend-decision.md).

## Sync

`syncFrom(peerPath)` copies missing event and blob files from another local repository path, then merges heads.

`sync(peerPath)` performs two-way exchange by syncing both repositories. The CLI exposes this as:

```bash
epoch sync PEER_REPO
```

This implementation does not include network discovery, access control, or always-on background replication.

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

See the [Core SDK Reference](sdk.md) for actor API, CRDT operation, and hook examples.

## CLI And Git Compatibility

The CLI exposes the currently implemented repository, intent, sync, view, merge, Git import/export, and HA/DR plan flows. Git compatibility classes bridge trusted host Git repositories where native filesystem and Git access are available. WASM-facing Git helpers return explicit unsupported errors for native host operations.

See the [CLI Reference](cli.md) for source-checkout shorthand, installed binaries, command groups, and Git-compatible command behavior.

## Non-Goals In The Current Prototype

The current implementation does not provide:

- network peer discovery
- repository access control
- key rotation
- signed tags
- shallow clones
- delta sync
- issue tracking
- timestamp restoration
- configured hook scripts
- automatic background sync scheduling
