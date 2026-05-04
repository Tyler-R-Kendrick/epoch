# Epoch: Feature Definitions

This document provides the authoritative feature registry for the Epoch DVCS. Each feature is assigned a stable ID, a name, a category, a description, a user story, and acceptance criteria.

---

## F-001 — Event Log

| Field | Value |
|---|---|
| **ID** | F-001 |
| **Name** | Event Log |
| **Category** | Core |
| **Status** | Required |

### Description
Every change in Epoch is represented as an immutable, cryptographically signed event appended to the local event log. Events are never mutated or deleted (only compacted). The log is the single source of truth from which all repository state is derived.

### User Story
**As a** developer, **I want** every change I make to be recorded as an immutable event so that the full history of my repository is always auditable and recoverable.

### Acceptance Criteria
- [ ] Every record, intent, merge signature, rejection, tag, and configuration change produces exactly one event.
- [ ] Events are appended only; no event can be modified after creation.
- [ ] The log survives process restart and is durable on disk.
- [ ] The full repository state can be reconstructed by replaying the event log from genesis.

---

## F-002 — Content-Addressed Storage

| Field | Value |
|---|---|
| **ID** | F-002 |
| **Name** | Content-Addressed Storage |
| **Category** | Core |
| **Status** | Required |

### Description
All objects (file contents, directory trees, events) are identified by the SHA-256 hash of their content. Identical content is stored exactly once regardless of how many commits reference it.

### User Story
**As a** repository administrator, **I want** storage to be deduplicated automatically so that large repositories with many similar files don't waste disk space.

### Acceptance Criteria
- [ ] All blobs, trees, and events are stored keyed by SHA-256 hash.
- [ ] Writing the same content twice results in a single stored object.
- [ ] Object integrity can be verified by recomputing the hash.
- [ ] Corrupted objects are detectable via hash mismatch.

---

## F-003 — Ed25519 Identity

| Field | Value |
|---|---|
| **ID** | F-003 |
| **Name** | Ed25519 Identity |
| **Category** | Core |
| **Status** | Required |

### Description
Each Epoch user is identified by an Ed25519 keypair. The public key is the persistent identity; the private key signs all events. No central user registry is required.

### User Story
**As a** developer, **I want** a cryptographic identity that I own so that I can collaborate without depending on any third-party account service.

### Acceptance Criteria
- [ ] Identity is generated locally as an Ed25519 keypair.
- [ ] Public key is the canonical identity used in all events.
- [ ] Private key never leaves the local keystore unencrypted.
- [ ] Every emitted event carries a valid signature verifiable with the public key.

---

## F-004 — Record

| Field | Value |
|---|---|
| **ID** | F-004 |
| **Name** | Record |
| **Category** | Core |
| **Status** | Required |

### Description
A record is a signed event that stores a file patch or snapshot reference with author, timestamp, and causal parent event IDs.

### User Story
**As a** developer, **I want** to record changes as signed events so that I can capture logical units of work with clear attribution.

### Acceptance Criteria
- [ ] Record event contains: path, entity type, blob hash, author public key, signature, timestamp, parent event IDs.
- [ ] Record is signed by the author's Ed25519 private key.
- [ ] Record appears in the event log and is immediately queryable.
- [ ] Working tree content is preserved after a successful record.

---

## F-005 — Intent Policy

| Field | Value |
|---|---|
| **ID** | F-005 |
| **Name** | Intent Policy |
| **Category** | Core |
| **Status** | Required |

### Description
An intent is a signed patch event that states what an author wants included. Maintainers sign separate merge events to include the intent or rejection events to exclude it. This mirrors Radicle's patch workflow while keeping Epoch's main projection pointerless and deterministic.

### User Story
**As a** contributor, **I want** to publish an intent and have maintainers cryptographically sign inclusion or rejection so that review policy is transparent and auditable.

### Acceptance Criteria
- [ ] `epoch intent` creates a signed Intent event containing one or more CRDT patches.
- [ ] `epoch merge <intent-id>` creates a signed IntentMerge event referencing the intent.
- [ ] `epoch reject <intent-id>` creates a signed IntentReject event referencing the intent.
- [ ] Main is projected from merged, non-rejected intents and is deterministic for the same accepted patch set.

---

## F-006 — Tag

| Field | Value |
|---|---|
| **ID** | F-006 |
| **Name** | Tag |
| **Category** | Core |
| **Status** | Required |

### Description
A tag is an immutable named pointer to a specific event, signed by the tagger. Tags are used to mark releases and significant milestones.

### User Story
**As a** maintainer, **I want** to create a signed tag for each release so that users can verify the authenticity of any release they download.

### Acceptance Criteria
- [ ] Tags reference a specific event ID.
- [ ] Tags are signed by the tagger's Ed25519 key.
- [ ] Tag signatures are verifiable by any peer.
- [ ] Tags are propagated to peers and persist in the event log.

---

## F-007 — Three-Way Merge

| Field | Value |
|---|---|
| **ID** | F-007 |
| **Name** | Three-Way Merge |
| **Category** | Merge |
| **Status** | Required |

### Description
The default entity resolution strategy. Given a common base and two patch versions, Epoch computes the three-way result for each changed entity. For unregistered entity types, this is a line-level text resolution.

### User Story
**As a** developer, **I want** Epoch to resolve patch contents automatically when there are no conflicting changes so that routine integration work requires no manual intervention.

### Acceptance Criteria
- [ ] Three-way merge produces a correct result for non-overlapping changes.
- [ ] Conflicting changes are surfaced with conflict markers.
- [ ] The common ancestor is always the lowest common ancestor of the event DAG.
- [ ] Resolved content can be recorded or submitted as a new intent patch.

---

## F-008 — CRDT Merge

| Field | Value |
|---|---|
| **ID** | F-008 |
| **Name** | CRDT Merge |
| **Category** | Merge |
| **Status** | Required |

### Description
For entity types with a registered CRDT definition, the CRDT merge function is invoked instead of (or in addition to) three-way merge. CRDT merge guarantees no user-visible conflicts for registered types.

### User Story
**As a** developer, **I want** text files to merge character-by-character using CRDT semantics so that concurrent edits to the same file never produce a conflict that requires manual resolution.

### Acceptance Criteria
- [ ] CRDT merge is invoked for all entities whose MIME type matches a registered CRDT definition.
- [ ] CRDT merge produces identical results regardless of the order operations are applied.
- [ ] Concurrent inserts and deletes are resolved without user intervention.
- [ ] CRDT merge result is deterministic: same inputs always produce same output.

---

## F-009 — CRDT Extension API

| Field | Value |
|---|---|
| **ID** | F-009 |
| **Name** | CRDT Extension API |
| **Category** | Extension |
| **Status** | Required |

### Description
The public API for registering custom CRDT definitions. Third-party plugins implement the `CRDTDefinition` interface and register with the Epoch CRDT registry. Definitions are versioned and sandboxed.

### User Story
**As a** platform engineer, **I want** to register a custom CRDT definition for our proprietary data format so that merge operations on those files are handled automatically without line-level conflicts.

### Acceptance Criteria
- [ ] `CRDTDefinition` interface is publicly documented and stable.
- [ ] Definitions can be registered programmatically or via `epoch.config`.
- [ ] Definitions are versioned with semver; incompatible versions are rejected.
- [ ] Registered definitions are sandboxed (no file system or network access).

---

## F-010 — Conflict Surfacing

| Field | Value |
|---|---|
| **ID** | F-010 |
| **Name** | Conflict Surfacing |
| **Category** | Merge |
| **Status** | Required |

### Description
When neither three-way merge nor CRDT merge can automatically resolve a conflict, the conflict is surfaced to the user with standard conflict markers. The user resolves and commits the resolution.

### User Story
**As a** developer, **I want** unresolvable merge conflicts to be clearly marked in the affected files so that I know exactly what needs manual attention.

### Acceptance Criteria
- [ ] Conflicted entities are annotated with conflict markers (`<<<`, `===`, `>>>`).
- [ ] `epoch status` lists all conflicted entities.
- [ ] The merge cannot be committed while conflicts remain unresolved.
- [ ] After manual resolution, `epoch record` records the resolved entity.

---

## F-011 — Offline Operation

| Field | Value |
|---|---|
| **ID** | F-011 |
| **Name** | Offline Operation |
| **Category** | Distribution |
| **Status** | Required |

### Description
All core operations (record, intent, tag, diff, events, merge signatures, rejection signatures, and CRDT resolution) function without network access. The local event log and object store are sufficient for all local operations.

### User Story
**As a** developer on a flight without Wi-Fi, **I want** to record changes, create intents, sign merge decisions, and view history so that I can remain fully productive offline.

### Acceptance Criteria
- [ ] `epoch record`, `epoch intent`, `epoch tag`, `epoch diff`, `epoch events`, `epoch merge`, and `epoch resolve` all succeed with no network connection.
- [ ] No network call is attempted for local operations.
- [ ] Local events accumulated offline are synced automatically when connectivity is restored.

---

## F-012 — Gossip P2P Sync

| Field | Value |
|---|---|
| **ID** | F-012 |
| **Name** | Gossip P2P Sync |
| **Category** | Distribution |
| **Status** | Required |

### Description
New events are propagated across the peer network using an epidemic gossip protocol. Each node periodically forwards new events to a random subset of its peers, who forward to their peers, until all interested peers have the event.

### User Story
**As a** developer, **I want** my commits to propagate to my teammates' nodes automatically so that we stay in sync without manually pushing to a central server.

### Acceptance Criteria
- [ ] New events are gossiped to at least one peer within 5 seconds of creation.
- [ ] All online peers receive the event within a configurable TTL (default: 30 seconds).
- [ ] Gossip handles peer churn (nodes joining and leaving) gracefully.
- [ ] Duplicate events received via gossip are deduplicated and ignored.

---

## F-013 — Anti-Entropy

| Field | Value |
|---|---|
| **ID** | F-013 |
| **Name** | Anti-Entropy |
| **Category** | Distribution |
| **Status** | Required |

### Description
A background process that periodically compares the event frontier of two peers and exchanges any missing events. This ensures convergence even when gossip delivery is incomplete.

### User Story
**As a** repository operator, **I want** replicas to repair divergence automatically in the background so that I don't need to manually intervene when peers temporarily desynchronize.

### Acceptance Criteria
- [ ] Anti-entropy runs on a configurable interval (default: 60 seconds).
- [ ] Anti-entropy detects diverged peers and exchanges missing events.
- [ ] After anti-entropy, both peers have identical event frontiers.
- [ ] Anti-entropy is bandwidth-efficient (only missing events are transferred).

---

## F-014 — Seed Nodes

| Field | Value |
|---|---|
| **ID** | F-014 |
| **Name** | Seed Nodes |
| **Category** | Distribution |
| **Status** | Recommended |

### Description
Seed nodes are always-on peers that continuously replicate one or more repositories, providing high availability for clones and syncs. Seed nodes are not privileged; they are just well-connected, highly-available peers.

### User Story
**As a** maintainer of a popular open-source library, **I want** a seed node to ensure my repository is always available for cloning even when my personal node is offline.

### Acceptance Criteria
- [ ] Any Epoch node can be designated as a seed node for specific repositories.
- [ ] Seed nodes replicate all events for their configured repositories.
- [ ] Clones directed at a seed node succeed even when the original author's node is offline.
- [ ] Seed nodes are listed in repository metadata and gossiped to peers.

---

## F-015 — Explicit Event Sync

| Field | Value |
|---|---|
| **ID** | F-015 |
| **Name** | Explicit Event Sync |
| **Category** | Distribution |
| **Status** | Required |

### Description
Explicit sync operations exchange missing events between two peers with `epoch sync <peer>`.

### User Story
**As a** developer, **I want** to explicitly sync with specific peers so that I have control over when and where my changes are shared.

### Acceptance Criteria
- [ ] `epoch sync <peer>` exchanges all events either peer has not seen.
- [ ] `epoch sync <peer>` updates both event logs to the same frontier.
- [ ] Sync is atomic per event (partial transfers are recoverable).
- [ ] Authentication is via Ed25519 identity; unauthorized writes are rejected.

---

## F-016 — Repository Access Control

| Field | Value |
|---|---|
| **ID** | F-016 |
| **Name** | Repository Access Control |
| **Category** | Security |
| **Status** | Required |

### Description
Each repository maintains an allow-list of public keys with associated permission levels (read, write, admin). The allow-list is itself stored as signed events in the repository log.

### User Story
**As a** repository owner, **I want** to control who can write events to my repository so that unauthorized parties cannot modify the project's history.

### Acceptance Criteria
- [ ] Access control list is stored as signed events in the log.
- [ ] Only `admin` keys can modify the access control list.
- [ ] Write operations from unknown keys are rejected by all peers.
- [ ] Access control events are gossiped like any other event.

---

## F-017 — Event Signing

| Field | Value |
|---|---|
| **ID** | F-017 |
| **Name** | Event Signing |
| **Category** | Security |
| **Status** | Required |

### Description
Every event emitted by an Epoch node is signed with the author's Ed25519 private key before being appended to the log or gossiped. Receiving peers verify signatures before accepting events.

### User Story
**As a** peer, **I want** to verify that every received event is signed by its claimed author so that I can reject spoofed or tampered events.

### Acceptance Criteria
- [ ] Every event has a non-null `signature` field.
- [ ] Signature is computed over the full event payload (excluding the signature field itself).
- [ ] Receiving peers reject events with invalid signatures.
- [ ] Signature algorithm is Ed25519; key size is 256 bits.

---

## F-018 — Tamper Detection

| Field | Value |
|---|---|
| **ID** | F-018 |
| **Name** | Tamper Detection |
| **Category** | Security |
| **Status** | Required |

### Description
The causal chain structure of the event log makes tampering detectable. A tampered event produces a hash mismatch detectable by any peer. Forked histories (two events with the same causal parents from the same author) are detectable anomalies.

### User Story
**As a** security-conscious repository consumer, **I want** to detect if the event log has been tampered with so that I can be confident in the integrity of the codebase I'm using.

### Acceptance Criteria
- [ ] Any modification to a stored event's payload changes its hash and invalidates its signature.
- [ ] `epoch verify` command checks all event signatures and causal chain integrity.
- [ ] Forked events from the same author are reported as anomalies.
- [ ] Tamper detection runs automatically during sync/gossip operations.

---

## F-019 — Key Rotation

| Field | Value |
|---|---|
| **ID** | F-019 |
| **Name** | Key Rotation |
| **Category** | Security |
| **Status** | Required |

### Description
An author can rotate their Ed25519 keypair by emitting a `KeyRotation` event signed with the old key that references the new key. All subsequent events are signed with the new key; the historical chain of custody is preserved.

### User Story
**As a** developer whose laptop was stolen, **I want** to rotate my Ed25519 key so that the compromised key cannot be used to impersonate me.

### Acceptance Criteria
- [ ] `KeyRotation` event is signed with the old key and contains the new public key.
- [ ] After rotation, events signed with the new key are accepted.
- [ ] Events signed with the old key before the rotation remain valid.
- [ ] Events signed with the old key after the rotation are rejected.

---

## F-020 — Compaction / GC

| Field | Value |
|---|---|
| **ID** | F-020 |
| **Name** | Compaction / GC |
| **Category** | Storage |
| **Status** | Required |

### Description
Periodically, old events are compacted into a snapshot event that captures full repository state. Events before the snapshot can be pruned. Tombstones are garbage-collected after all peers confirm receipt. Compaction requires quorum agreement.

### User Story
**As a** repository operator, **I want** old events to be pruned after compaction so that the event log doesn't grow without bound on long-lived repositories.

### Acceptance Criteria
- [ ] Snapshot events capture complete repository state (tree + policy projection).
- [ ] Old events before the snapshot can be pruned after quorum agreement.
- [ ] Tombstones are GC'd only after all known peers confirm they've seen the deletion.
- [ ] The repository remains fully functional after compaction.

---

## F-021 — Shallow Clone

| Field | Value |
|---|---|
| **ID** | F-021 |
| **Name** | Shallow Clone |
| **Category** | Storage |
| **Status** | Recommended |

### Description
Clone a repository with a truncated event history (events since a specific snapshot). The working tree is fully functional; older history is not downloaded.

### User Story
**As a** CI runner with limited bandwidth, **I want** to clone only the recent history of a large repository so that checkout is fast.

### Acceptance Criteria
- [ ] `epoch clone --depth=<n>` clones only the most recent `n` events.
- [ ] Working tree is fully functional from a shallow clone.
- [ ] `epoch fetch --unshallow` retrieves the full history on demand.

---

## F-022 — Delta Sync

| Field | Value |
|---|---|
| **ID** | F-022 |
| **Name** | Delta Sync |
| **Category** | Distribution |
| **Status** | Required |

### Description
When syncing with a peer, only events not already present on the receiving peer are transferred. Epoch uses the event frontier (set of known event IDs) to compute the minimal delta.

### User Story
**As a** developer on a metered connection, **I want** sync to transfer only new events so that routine syncs use minimal bandwidth.

### Acceptance Criteria
- [ ] Delta is computed as the set difference between local and remote event frontiers.
- [ ] Only delta events are transferred; no redundant data is sent.
- [ ] Delta sync is correct for arbitrary network topologies (not just star topology).

---

## F-023 — Diff / Patch

| Field | Value |
|---|---|
| **ID** | F-023 |
| **Name** | Diff / Patch |
| **Category** | Inspection |
| **Status** | Required |

### Description
Compute the difference between any two events, intents, or working tree states. Output can be in unified diff format or structured (JSON) format for programmatic use.

### User Story
**As a** developer, **I want** to see exactly what changed between two commits so that I can understand the impact of a change before merging it.

### Acceptance Criteria
- [ ] `epoch diff <event-a> <event-b>` produces unified diff output.
- [ ] Diff respects entity type (binary files show binary diff summary).
- [ ] `epoch diff --json` produces machine-readable structured diff.
- [ ] Diff against working tree is supported: `epoch diff HEAD`.

---

## F-024 — Log / History

| Field | Value |
|---|---|
| **ID** | F-024 |
| **Name** | Log / History |
| **Category** | Inspection |
| **Status** | Required |

### Description
Traverse and query the event graph with filtering by author, date range, path, policy status, or event type. Output includes event IDs, authors, timestamps, messages, and causal parent links.

### User Story
**As a** developer, **I want** to view the history of changes to a specific file so that I can understand who changed it and why.

### Acceptance Criteria
- [ ] `epoch events` lists record, intent, merge, rejection, and sync-visible events.
- [ ] `epoch events -- <path>` filters to events touching a specific file.
- [ ] `epoch events --author=<key>` filters by author public key.
- [ ] Event graph is traversed in reverse causal order by default.

---

## F-025 — Hooks

| Field | Value |
|---|---|
| **ID** | F-025 |
| **Name** | Hooks |
| **Category** | Automation |
| **Status** | Required |

### Description
Pre- and post-event hooks allow arbitrary scripts or plugins to be invoked at lifecycle events: pre-record, post-record, pre-sync, post-sync, post-merge. Hooks can abort operations by returning non-zero.

### User Story
**As a** team lead, **I want** a pre-record hook that runs linting so that no unlinted code ever enters the repository.

### Acceptance Criteria
- [ ] Hooks are stored in `.epoch/hooks/` and are executable scripts.
- [ ] Pre-record hook returning non-zero aborts the record operation.
- [ ] Post-sync hook is invoked after event sync completes.
- [ ] Hook environment includes relevant event metadata as environment variables.

---

## F-026 — Stash

| Field | Value |
|---|---|
| **ID** | F-026 |
| **Name** | Stash |
| **Category** | Workflow |
| **Status** | Recommended |

### Description
Temporarily shelve in-progress working tree changes without committing. Stashed changes can be re-applied later. Stash is local-only and not propagated to peers.

### User Story
**As a** developer, **I want** to stash my work-in-progress changes so that I can quickly switch context to fix an urgent bug without losing my current work.

### Acceptance Criteria
- [ ] `epoch stash` saves working tree changes and resets to HEAD.
- [ ] `epoch stash pop` restores the most recent stash.
- [ ] Multiple stash entries are supported with `epoch stash list`.
- [ ] Stash is not gossiped to peers.

---

## F-027 — Worktrees

| Field | Value |
|---|---|
| **ID** | F-027 |
| **Name** | Worktrees |
| **Category** | Workflow |
| **Status** | Recommended |

### Description
Multiple working directories can be associated with a single Epoch object store. Each worktree can hold a different working copy while sharing the same event log and object store.

### User Story
**As a** developer, **I want** multiple working directories simultaneously so that I can compare candidate intent states side-by-side.

### Acceptance Criteria
- [ ] `epoch worktree add <path>` creates a linked worktree.
- [ ] Each worktree has its own HEAD and index; the object store is shared.
- [ ] Commits in a worktree appear in the shared event log.
- [ ] `epoch worktree remove <path>` cleanly removes the linked worktree.

---

## F-028 — Timestamp Restoration

| Field | Value |
|---|---|
| **ID** | F-028 |
| **Name** | Timestamp Restoration |
| **Category** | Compatibility |
| **Status** | Recommended |

### Description
After a clone or checkout, restore file modification timestamps to the value from the event that last modified each file. This is the Epoch equivalent of `git-warp-time`.

### User Story
**As a** build engineer, **I want** file modification timestamps to reflect the last commit that changed them so that incremental build systems work correctly after a fresh clone.

### Acceptance Criteria
- [ ] `epoch restore-times` sets each file's mtime to the timestamp of its last modifying event.
- [ ] The operation is efficient: O(files) not O(events × files).
- [ ] Can be triggered automatically via post-checkout hook.

---

## F-029 — Git Compatibility Layer

| Field | Value |
|---|---|
| **ID** | F-029 |
| **Name** | Git Compatibility Layer |
| **Category** | Compatibility |
| **Status** | Recommended |

### Description
Import existing Git repositories into Epoch (converting commits to events) and export Epoch repositories as Git repositories. This enables migration and coexistence.

### User Story
**As a** team migrating from Git, **I want** to import our Git history into Epoch so that we don't lose our commit history when adopting Epoch.

### Acceptance Criteria
- [ ] `epoch import-git <path>` converts a Git repo's commits to Epoch events.
- [ ] `epoch export-git <path>` exports Epoch history as a Git repository.
- [ ] Git commit hashes are preserved as metadata in imported events.
- [ ] Import handles merge commits correctly (two parent events).

---

## F-030 — Issues and Patches

| Field | Value |
|---|---|
| **ID** | F-030 |
| **Name** | Issues and Patches |
| **Category** | Collaboration |
| **Status** | Optional |

### Description
Decentralized issue tracking and intent-based patches. Issues and intents are content-addressed, signed events stored in the repository's event log and gossiped to all peers. No central forge required.

### User Story
**As a** contributor, **I want** to open an intent and discussion on an Epoch repository without creating an account on a third-party platform so that I can contribute using only my Epoch identity.

### Acceptance Criteria
- [ ] `epoch issue open` creates a signed Issue event and gossips it.
- [ ] `epoch intent` creates a signed Intent event referencing the current main projection.
- [ ] Comments on issues and intents are signed Comment events.
- [ ] All issue/intent data is replicated to all peers via gossip.
