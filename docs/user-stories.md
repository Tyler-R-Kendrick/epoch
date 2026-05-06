# Epoch Implemented User Stories

This document lists user stories supported by the current implementation and feature suite. It does not list roadmap stories without executable coverage.

See the [Feature Registry](features.md) for feature IDs and executable coverage links.

## Developer Stories

### DEV-001: Initialize A Signed Repository

**As a** developer,  
**I want** to initialize an Epoch repository with my author name,  
**So that** future events are signed with a local Ed25519 identity.

Flow:

1. Run `epoch init --author alice`.
2. Epoch creates `.epoch/` metadata, an identity document, event/blob directories, and heads.
3. Run `epoch verify`.
4. Verification reports `ok`.

Acceptance criteria:

- Repository metadata is created on disk.
- Identity uses Ed25519 keys.
- Verification succeeds immediately after initialization.

### DEV-002: Record A File As A Signed Event

**As a** developer,  
**I want** to record a workspace file,  
**So that** the repository has a signed, content-addressed event for that change.

Flow:

1. Write a file in the workspace.
2. Run `epoch record --type text/plain note.txt`.
3. Epoch stores the file bytes under `.epoch/blobs`.
4. Epoch appends a signed `record` event.

Acceptance criteria:

- Blob content matches the original file.
- Event payload includes path, MIME type, blob hash, and size.
- Tampered event or blob data is reported by `epoch verify`.

### DEV-003: Work Offline With Intents

**As a** contributor,  
**I want** to create an intent and have maintainers sign a decision later,  
**So that** non-merged changes are communicated as intent instead of hidden branch state.

Flow:

1. Run `epoch intent README.md --type text/plain --title "Update README"`.
2. A maintainer runs `epoch merge INTENT_ID --author bob`.
3. Another maintainer can run `epoch reject INTENT_ID --author carol --reason duplicate`.
4. Run `epoch status` to inspect policy state.

Acceptance criteria:

- Intent, merge, rejection, and comment events are signed.
- Intent metadata supports title, description, reason, and labels.
- Policy projection classifies intents as merged, rejected, or pending.

### DEV-004: Resolve Text And JSON Entities

**As a** developer,  
**I want** built-in merge behavior for common file types,  
**So that** routine concurrent edits can be resolved through the CLI.

Flow:

1. Prepare base, left, and right files.
2. Run `epoch resolve --type application/json base.json left.json right.json`.
3. Inspect the merged result on stdout.

Acceptance criteria:

- JSON object merges preserve non-conflicting keys.
- Text merges produce conflict markers for incompatible edits.
- Unsupported or invalid values report clear errors.

## Collaboration Stories

### COLLAB-001: Explicitly Sync Two Local Repositories

**As a** collaborator,  
**I want** to sync with a peer repository path,  
**So that** both local repositories have the same signed events and blobs.

Flow:

1. Initialize two local Epoch repositories.
2. Record different events in each repository.
3. Run `epoch --repo ./peer-a sync ./peer-b`.
4. Verify both repositories.

Acceptance criteria:

- Missing event files are copied both directions.
- Missing blobs are copied both directions.
- Both repositories converge to the same frontier.

### COLLAB-002: Materialize Shared Agent State

**As an** agent developer,  
**I want** to append CRDT operations and materialize current state,  
**So that** concurrent map and text updates converge after sync.

Flow:

1. Two actor users append CRDT operations for the same entity.
2. Repositories sync.
3. Code calls `materialize(entity)`.

Acceptance criteria:

- Independent map updates from multiple authors are present.
- Concurrent text inserts converge deterministically.
- Materialized values match on both peers after sync.

### COLLAB-003: Use Async Repository Actors

**As an** application developer,  
**I want** serialized async repository commands and per-user actors,  
**So that** concurrent local writes keep correct authorship and signing keys.

Flow:

1. Create `EpochActorSystem`.
2. Initialize it.
3. Use `repository.user("alice")` and `repository.user("bob")` concurrently.
4. Verify the event log.

Acceptance criteria:

- Concurrent operations append valid signed events.
- Per-author signing keys are distinct.
- Actor verification reports no repository problems.

## Operator Stories

### OPS-001: Create And Restore A Compact

**As a** repository operator,  
**I want** to compact a validated log prefix and restore from it,  
**So that** recovery does not require retaining every event as a loose file.

Flow:

1. Record events.
2. Call `createCompact(repository)`.
3. Call `pruneEventLogBeforeCompact(repository, compact.id)`.
4. Call `restoreFromCompact(repository, compact.id)`.
5. Run `verify()`.

Acceptance criteria:

- Compact data is signed and hash-verified.
- Pruning removes only events before the compact boundary.
- Restore rebuilds event and blob storage.

### OPS-002: Restore A Cold Backup

**As a** repository operator,  
**I want** to create a signed cold backup and restore it into a fresh repository,  
**So that** I can recover from local data loss.

Flow:

1. Run `createColdBackup(repository)`.
2. Restore with `restoreFromColdBackup(freshRepository, backup)`.
3. Verify the fresh repository.

Acceptance criteria:

- Backup signature is verified.
- Compact events and tail events are restored.
- Referenced blobs are restored.

### OPS-003: Bootstrap From A Trusted Seed

**As a** repository operator,  
**I want** a fresh peer to bootstrap from a trusted local seed path,  
**So that** recovery can start from a known-good repository identity.

Flow:

1. Create a compact in the seed repository.
2. Initialize a peer repository.
3. Call `bootstrapFromSeed(peer, seedConfig)`.

Acceptance criteria:

- Full-trust bootstrap restores the seed compact.
- Unexpected seed identity is rejected.
- Missing events and blobs are copied with sync.

## Tooling Stories

### TOOL-001: Import And Export Git Files

**As a** tool integrator,  
**I want** to import from and export to trusted host Git repositories,  
**So that** Epoch can interoperate with existing Git workflows.

Flow:

1. Import tracked files from a Git repository.
2. Verify the Epoch repository.
3. Export the latest recorded blobs to a fresh Git repository.

Acceptance criteria:

- Imported files become signed Epoch record events.
- Exported files match recorded blob content.
- Unsupported Git-compatible commands fail with explicit errors.

### TOOL-002: Use WASM-Safe Surfaces

**As a** WASM host developer,  
**I want** explicit unsupported errors for native Git operations,  
**So that** browser-hosted code does not silently assume filesystem access.

Flow:

1. Call WASM CRDT registry helpers.
2. Try a native Git operation through `Epoch.WASM.Git`.

Acceptance criteria:

- CRDT helpers return expected merge results.
- Native Git operations return explicit unsupported errors.
