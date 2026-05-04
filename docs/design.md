# Epoch: Design Document

## Executive Summary

**Epoch** is a minimal, event-driven Distributed Version Control System (DVCS) with pluggable CRDT entity-level merging. It is designed to be the next evolution beyond Git: retaining Git's proven strengths (offline-first, content-addressed DAG, fast branching) while eliminating its weaknesses (text-only merges, no real-time collaboration, no decentralized identity, centralized forge dependency).

Epoch models every change as an **immutable, causally-ordered event** appended to a distributed event log. The current state of any repository is always a deterministic projection of its event history. Merges are handled at the **entity level**: each file type can register a CRDT definition that governs how concurrent edits are resolved — automatically, without user intervention, for types that support it. Files without CRDT definitions fall back to three-way merge.

Epoch uses **Ed25519 cryptographic identities** (no central username registry), a **content-addressed DAG** (no single point of failure), and a **event replication protocol** for peer-to-peer distribution — without a blockchain's cost, latency, or complexity.

---

## Inspiration Comparison

| System | Storage Model | Identity | Conflict Resolution | Distribution | Real-Time | Offline | Key Weakness |
|---|---|---|---|---|---|---|---|
| **Weave CRDT** | Append-only sequence | Site ID | CRDT (sequence) | N/A (algorithm) | Yes | Yes | Tombstone growth |
| **GoatDB** | DAG of commits | Ed25519 keys | CRDT + 3-way merge | P2P + relay | ~1s latency | Yes | JS-only, GC immaturity |
| **Manyana** | Append-only event log | Conceptual | CRDT semantics | Event Sync | Conceptual | Yes | No production impl |
| **git-warp** | Content-addressed DAG | Email (unverified) | 3-way merge (line) | Central/P2P | No | Yes | Line-level conflicts |
| **Radicle** | Git + event replication overlay | Ed25519 keys | Git 3-way merge | Event Sync | No | Yes | No CI/CD, Linux only |
| **Roshi** | CRDT OR-Set (Redis) | N/A | Add-wins CRDT | Multi-cluster | Yes | No | Set operations only |
| **SolGit** | On-chain (blockchain) | Wallet key | Chain ordering | Blockchain | No | No | Gas cost, immutability |
| **BDA-SVC** | IPFS + Hyperledger Fabric | X.509 | Chain ordering | Permissioned P2P | No | No | Extreme complexity |

### What Epoch Takes from Each

| Inspiration | Contribution to Epoch |
|---|---|
| **Weave CRDT** | Sequence CRDT as first-class entity type; tombstone model for deletions |
| **GoatDB** | Ed25519 signing, three-way merge default, commit DAG model |
| **Manyana** | Event sourcing: every change is an immutable event; CQRS-inspired projection |
| **git-warp** | DAG object model (blobs, trees, events), fast offline branching |
| **Radicle** | Event-based P2P distribution, append-only data model, seed nodes |
| **Roshi** | CRDT set semantics; convergence repair reconciliation for distributed consistency |
| **SolGit** | Cryptographic audit trail — without on-chain cost; retain tamper-evidence |
| **BDA-SVC** | Content-addressed storage (from IPFS model) — without pinning governance complexity |

---

## Core Epoch Design

### 1. Event-Driven Architecture

Every change in Epoch is an **immutable event** appended to a local event log. Events are never mutated or deleted (only compacted into snapshots after GC).

```
Event {
  id:           EventID          // content hash (SHA-256 of payload)
  type:         EventType        // Commit | Branch | Tag | Merge | Delete | Config
  author:       PublicKey        // Ed25519 public key
  signature:    Signature        // Ed25519 signature of payload
  timestamp:    LogicalClock     // Lamport timestamp for ordering
  causal_deps:  []EventID        // parent event IDs (causal frontier)
  payload:      EventPayload     // type-specific data
}
```

Inspired by **Manyana** and **Roshi**, this model ensures:
- All state is derivable from the log (full auditability).
- Offline writes are buffered locally and merged on reconnect.
- Projections (working tree, branch map, index) are always regenerable.

### 2. Entity-Level CRDT Merging

Unlike Git (which merges at the line level), Epoch supports **per-entity-type CRDT definitions**. A CRDT definition is a plugin that specifies:

```typescript
interface CRDTDefinition<T> {
  entityType: string;            // e.g., "text/plain", "application/json"
  merge(base: T, left: T, right: T): T;
  diff(before: T, after: T): CRDTDelta;
  apply(state: T, delta: CRDTDelta): T;
}
```

Inspired by **Weave CRDT** and **GoatDB**:
- Text files use a sequence CRDT (Weave-style, character-level).
- JSON/YAML files use a map CRDT (field-level, last-write-wins or merge).
- Binary files fall back to three-way merge (or "ours"/"theirs" strategies).
- Custom types register their own definitions at the repository level.

This makes Epoch **extensible**: language-aware CRDT merging (e.g., AST-level merge for TypeScript files) is achievable without modifying Epoch's core.

### 3. Cryptographic Identity (Ed25519)

Epoch has no username registry. Every identity is an Ed25519 keypair:
- The **public key** is the identity (analogous to a Radicle DID or GoatDB identity).
- The **private key** signs every event emitted by that identity.
- Identities are self-sovereign: no CA, no registration, no central authority.

Inspired by **GoatDB** and **Radicle**:
- Every event's signature is verifiable by any peer.
- Repository access control is an allow-list of public keys.
- Key rotation is handled by publishing a signed `KeyRotation` event.

### 4. Content-Addressed Storage (DAG of Events)

The Epoch object store is a content-addressed DAG, mirroring Git's object model but at the event level:

```
ObjectStore {
  blobs:   Map<SHA256, Bytes>        // raw file content
  trees:   Map<SHA256, Tree>         // directory snapshots
  events:  Map<EventID, Event>       // immutable event log
  heads:   Map<BranchName, EventID>  // mutable branch pointers
}
```

Inspired by **git-warp** and the IPFS model from **BDA-SVC**:
- Every unique file content is stored exactly once (automatic deduplication).
- The event graph is a verifiable chain of custody.
- Any state can be reconstructed by replaying events to a point in the DAG.

### 5. Peer-to-Peer Distribution (Event Sync Protocol)

Epoch uses an epidemic event replication protocol for event propagation, inspired by **Radicle**:
- Each node maintains a peer list; new events are event synced to a random subset of peers.
- Peers forward events they haven't seen; convergence is probabilistic but fast.
- **Seed nodes** are optional high-availability peers that replicate a repository continuously.
- No central server is required; the network is fully decentralized.

Anti-entropy (inspired by **Roshi**) runs periodically: peers compare their event frontier and exchange missing events.

### 6. No Blockchain

Epoch achieves the auditability goals of **SolGit** and **BDA-SVC** without blockchain:
- The append-only, cryptographically signed event log is tamper-evident by design.
- Forks of the event log are detectable (two events with the same causal frontier).
- No gas costs, no consensus latency, no wallet management.

The trade-off: Epoch's tamper-evidence is not "globally verified by miners/validators" but is instead verified by the peer network. This is sufficient for the vast majority of use cases and dramatically simpler operationally.

### 7. Append-Only Event Log with Compaction Strategy

To prevent unbounded growth (a key weakness in **Manyana**, **GoatDB**, and **Weave CRDT**):
- Events older than a configurable horizon (e.g., 1 year, or after a stable GC checkpoint) can be **compacted** into a snapshot event.
- Snapshot events capture full repository state; older events can be pruned.
- Compaction requires agreement from a quorum of peers (preventing premature GC).
- Tombstones are garbage-collected after all peers confirm they've seen the deletion.

### 8. Three-Way Merge as Default, CRDT as Opt-In Per Entity Type

Epoch does not force CRDT on every file:
- **Default**: Three-way merge (same as Git), applied at the entity level.
- **Opt-in CRDT**: Per-file-type CRDT definitions override three-way merge for registered types.
- **Conflict fallback**: If neither three-way merge nor CRDT resolves a conflict, Epoch surfaces a conflict for manual resolution (same as Git) — but only for unregistered types.

This design means Epoch is immediately useful (no CRDT definitions required) and progressively enhanced as teams add CRDT definitions for their critical file types.

---

## Extension Model for Custom CRDT Definitions

Epoch's extension API allows teams to define CRDT behavior for any file type:

```typescript
// Register a CRDT definition for TypeScript source files
epoch.registerCRDT({
  entityType: "text/typescript",
  merge: (base, left, right) => {
    // Parse to AST, merge at declaration level, serialize back
    const baseAST = parseTS(base);
    const leftAST = parseTS(left);
    const rightAST = parseTS(right);
    return serializeTS(mergeAST(baseAST, leftAST, rightAST));
  },
  diff: (before, after) => computeASTDelta(before, after),
  apply: (state, delta) => applyASTDelta(state, delta),
});
```

CRDT definitions are:
- **Versioned**: Each definition has a semver version. Repository configs specify which version to use.
- **Portable**: Definitions are standard JS/TS modules; they can be published to npm and shared.
- **Sandboxed**: Definitions run in a restricted environment with no file system or network access.
- **Composable**: Definitions for composite types (e.g., a Markdown file with embedded JSON frontmatter) can delegate to sub-definitions.

---

## Feature Definitions

| ID | Name | Category | Description |
|---|---|---|---|
| F-001 | Event Log | Core | Every change is an immutable, signed event appended to the local log |
| F-002 | Content-Addressed Storage | Core | All objects identified by SHA-256 hash; automatic deduplication |
| F-003 | Ed25519 Identity | Core | Self-sovereign keypair identity; no central user registry |
| F-004 | Commit | Core | Snapshot of repository state at a point in time, signed by author |
| F-005 | Branch | Core | Named pointer to a tip event in the event graph |
| F-006 | Tag | Core | Immutable named pointer to a specific event; signed by tagger |
| F-007 | Three-Way Merge | Merge | Default merge strategy: base + left + right applied at entity level |
| F-008 | CRDT Merge | Merge | Pluggable CRDT definition per entity type; automatic conflict resolution |
| F-009 | CRDT Extension API | Extension | API for registering custom CRDT definitions for any file type |
| F-010 | Conflict Surfacing | Merge | Unresolvable conflicts surfaced to user with markers; manual resolution |
| F-011 | Offline Operation | Distribution | All local operations (commit, branch, diff, log) work without network |
| F-012 | Event Sync | Distribution | Event propagation via event replication protocol; no central server required |
| F-013 | Convergence Repair | Distribution | Background reconciliation ensures all peers eventually converge |
| F-014 | Seed Nodes | Distribution | Optional always-on peers that guarantee availability |
| F-015 | Push/Pull | Distribution | Explicit sync operations for controlled event exchange |
| F-016 | Repository Access Control | Security | Allow-list of public keys with read/write permissions |
| F-017 | Event Signing | Security | Every event signed with Ed25519; verified on receipt |
| F-018 | Tamper Detection | Security | Forked/altered event graphs detected by signature chain |
| F-019 | Key Rotation | Security | Signed KeyRotation event updates identity without losing history |
| F-020 | Compaction / GC | Storage | Snapshot-based compaction of old events; tombstone cleanup |
| F-021 | Shallow Clone | Storage | Clone with truncated history for bandwidth-constrained environments |
| F-022 | Delta Sync | Distribution | Sync only events not yet seen by the remote peer |
| F-023 | Diff / Patch | Inspection | Compute diff between any two events or branches |
| F-024 | Log / History | Inspection | Traverse and query the event graph with filtering |
| F-025 | Hooks | Automation | Pre/post-event hooks for automation and CI/CD integration |
| F-026 | Stash | Workflow | Temporarily shelve in-progress changes |
| F-027 | Worktrees | Workflow | Multiple working directories sharing a single object store |
| F-028 | Timestamp Restoration | Compatibility | Restore file mtimes from event metadata (git-warp-time equivalent) |
| F-029 | Git Compatibility Layer | Compatibility | Import from / export to Git repositories |
| F-030 | Issues and Patches | Collaboration | Decentralized issue tracking and patch proposals (like Radicle) |

---

## User Stories

See [`user-stories.md`](user-stories.md) for the complete set of user stories organized by persona.

---

## Architecture Overview

```
┌─────────────────────────────────────────────────────────────────┐
│                         Epoch Node                              │
│                                                                 │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────────────┐  │
│  │   CLI / API  │  │  Web UI      │  │  Editor Integration  │  │
│  └──────┬───────┘  └──────┬───────┘  └──────────┬───────────┘  │
│         └─────────────────┴─────────────────────┘              │
│                            │                                    │
│  ┌─────────────────────────▼──────────────────────────────┐    │
│  │                    Epoch Core                          │    │
│  │                                                        │    │
│  │  ┌───────────────┐  ┌──────────────┐  ┌────────────┐  │    │
│  │  │  Event Engine │  │ Merge Engine │  │  CRDT Reg  │  │    │
│  │  │  (append/sign)│  │ (3-way+CRDT) │  │  (plugins) │  │    │
│  │  └───────┬───────┘  └──────┬───────┘  └────────────┘  │    │
│  │          │                 │                           │    │
│  │  ┌───────▼─────────────────▼──────────────────────┐   │    │
│  │  │              Object Store                      │   │    │
│  │  │  (blobs / trees / events — SHA-256 addressed)  │   │    │
│  │  └───────────────────────────────────────────────-┘   │    │
│  │                                                        │    │
│  │  ┌─────────────────────────────────────────────────┐  │    │
│  │  │            Identity / Keystore                  │  │    │
│  │  │          (Ed25519 sign / verify)                │  │    │
│  │  └─────────────────────────────────────────────────┘  │    │
│  └────────────────────────────┬───────────────────────────┘    │
│                               │                                 │
│  ┌────────────────────────────▼───────────────────────────┐    │
│  │                  Sync Layer                            │    │
│  │  ┌──────────────┐  ┌──────────────┐  ┌─────────────┐  │    │
│  │  │ Event Sync Proto │  │ Convergence Repair │  │  Push/Pull  │  │    │
│  │  └──────────────┘  └──────────────┘  └─────────────┘  │    │
│  └───────────────────────────────────────────────────-─────┘    │
└─────────────────────────────────────────────────────────────────┘
                               │
              ┌────────────────┼────────────────┐
              │                │                │
        ┌─────▼────┐     ┌─────▼────┐     ┌────▼──────┐
        │  Peer A  │     │  Peer B  │     │ Seed Node │
        └──────────┘     └──────────┘     └───────────┘
```

### Layer Responsibilities

| Layer | Responsibility |
|---|---|
| **CLI / API / Web UI** | User-facing interfaces; translate user intent to Epoch commands |
| **Event Engine** | Create, sign, validate, and append events to the local log |
| **Merge Engine** | Implement three-way merge and delegate to CRDT engine for registered types |
| **CRDT Registry** | Manage registered CRDT definitions; route merges by entity type |
| **Object Store** | Content-addressed storage for blobs, trees, and events |
| **Identity / Keystore** | Manage Ed25519 keypairs; sign outgoing events; verify incoming |
| **Sync Layer** | Event Sync propagation, convergence repair, explicit event sync operations |

### Data Flow: Commit

```
1. User edits files in working tree
2. `epoch record` invoked
3. Event Engine:
   a. Compute diff against last event snapshot
   b. Store new blobs and tree in Object Store
   c. Create Commit event with causal_deps = [current HEAD]
   d. Sign event with Ed25519 private key
   e. Append to local event log
   f. Update HEAD pointer
4. Sync Layer event syncs new event to known peers
```

### Data Flow: Merge

```
1. User invokes `epoch merge <branch>`
2. Merge Engine:
   a. Find common ancestor event (LCA of event DAGs)
   b. For each changed entity (file):
      i.  Check CRDT Registry for registered definition
      ii. If found: apply CRDT merge(base, left, right) → merged state
      iii.If not found: apply three-way text merge
      iv. If conflict: mark entity as conflicted
   c. Write merged tree to Object Store
   d. Create Merge event (two causal_deps: both branch tips)
   e. Sign and append
3. Working tree updated to merged state
4. Conflicted entities surfaced to user
```

---

## Design Principles

1. **Immutability by Default** — Events are never mutated. History is always complete and verifiable.
2. **Identity Without Authority** — Cryptographic keys, not central registries, establish identity.
3. **Offline First** — All core operations work without network access. Sync is an enhancement, not a requirement.
4. **Progressive Enhancement** — Three-way merge works out of the box. CRDT definitions add capability incrementally.
5. **No Unnecessary Complexity** — No blockchain, no certificate authorities, no complex operational dependencies.
6. **Auditability** — The full history of every change is cryptographically verifiable by any peer.
7. **Extensibility** — CRDT definitions, hooks, and storage adapters are first-class extension points.
8. **Interoperability** — Git import/export ensures no lock-in and smooth migration paths.

---

## Open Questions and Future Work

- **Compaction Protocol**: The exact quorum mechanism for safe tombstone/event GC requires further design.
- **Selective Sync**: Sparse checkout and partial clone semantics in a event sync network need careful design.
- **Performance Benchmarks**: In-memory event graph traversal at scale (millions of events) needs profiling.
- **CRDT Definition Security**: Sandboxing third-party CRDT plugins to prevent malicious code execution.
- **Mobile / Browser Support**: WASM compilation of the core for browser and mobile runtimes.
- **CI/CD Integration**: First-class hooks for triggering external pipelines from event sync events.
- **Patch / Issue Protocol**: Formal specification of decentralized issue and patch objects (similar to Radicle).
