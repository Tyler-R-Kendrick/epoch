# Weave CRDT

## Overview

Weave CRDT is an identifier-based replicated sequence algorithm designed for collaborative text editing and ordered data structures. Every element in the sequence carries a globally unique identifier, enabling peers to insert, delete, and merge changes without coordination. The structure is append-only: deletions are represented as tombstones rather than physical removals, preserving the ability to merge concurrent edits deterministically.

Weave CRDT sits at the heart of systems like Automerge and Yjs, providing the mathematical foundation for conflict-free merging of text documents across distributed peers. Its guarantees — eventual consistency, commutativity, and causality preservation — make it well-suited for offline-first collaborative applications.

---

## Features

### 1. Identifier-Based Element Addressing
Every element (character, node, block) in the sequence carries a globally unique identifier composed of a logical clock value and a site/author identifier. This means elements can be referenced unambiguously regardless of concurrent insertions or deletions elsewhere in the document.

### 2. Append-Only Structure
The underlying data structure only ever grows. Insertions add new nodes; deletions flip a tombstone flag on existing nodes. No structural reordering occurs during merge, making the merge operation simple and deterministic.

### 3. Tombstone-Based Deletion
Deleted elements remain in the sequence as invisible tombstones. This allows out-of-order delivery of operations: a delete that arrives before its corresponding insert can still be applied correctly once the insert arrives.

### 4. Commutative Operations
Insert and delete operations commute — they can be applied in any order and produce the same final state. This property eliminates the need for operational transformation (OT) matrices and the coordination overhead they require.

### 5. Causality Preservation via Lamport Timestamps
Each identifier encodes a Lamport timestamp (or vector clock component), ensuring that causally related operations are always ordered correctly. An insert that depends on seeing another insert will always be placed after it.

### 6. Offline-First with Eventual Consistency
Peers can diverge freely while offline. When reconnected, the merge of any two Weave states is deterministic and requires no conflict resolution by the user. All peers converge to the same sequence.

### 7. Local and Global View Model
Each peer maintains a local view (filtered sequence excluding tombstones) for display, while the underlying global view retains all nodes including tombstones. Syncing operates on the global view.

### 8. Concurrent Insert Disambiguation
When two peers insert at the same logical position simultaneously, a deterministic tie-breaking rule (typically site ID comparison) resolves the order without user intervention. The chosen order is arbitrary but consistent across all peers.

### 9. Vector Clock Integration
Full vector clock support allows the algorithm to track not just happens-before relationships but the exact causal history of every element. This enables optimizations such as delta-state synchronization.

### 10. Delta-State Sync
Rather than transmitting the entire document on sync, only the delta (elements with identifiers the remote peer has not yet seen) needs to be exchanged. This scales sub-linearly for documents with many collaborators.

### 11. Pluggable Ordering Strategies
Different applications may prioritize different tie-breaking behaviors (left-to-right, right-to-left, priority-based). Weave's identifier scheme is compatible with pluggable comparators.

### 12. Undo/Redo Support (Single-Author)
On a single author's local state, undo/redo is implementable by inverting local operations. Concurrent scenarios require additional protocol design but the base algorithm does not preclude it.

---

## User Stories / User Flows

### US-1: Collaborative Document Editing
**As a** developer building a shared text editor,  
**I want** concurrent edits by multiple authors to merge without conflicts,  
**So that** users never see data loss or merge dialogs during real-time collaboration.

**Flow:**
1. User A inserts "Hello" at position 0, generating identifiers `(1,A)` through `(5,A)`.
2. While offline, User B inserts "World" at the same position, generating `(1,B)` through `(5,B)`.
3. On reconnect, both operation sets are exchanged.
4. Both peers apply deterministic ordering: all `(n,A)` and `(n,B)` nodes are merged by their identifiers.
5. Final document is identical on both peers.

### US-2: Offline Edit and Sync
**As a** mobile user,  
**I want** to edit a document while offline and have my changes merged when I reconnect,  
**So that** I can work anywhere without losing productivity.

**Flow:**
1. User goes offline; local Weave state diverges from server state.
2. User makes N insertions and deletions locally.
3. On reconnect, local delta is pushed; remote delta is pulled.
4. Merge is applied; both sides converge.

### US-3: Deletion of a Concurrently-Moved Element
**As a** user,  
**I want** deletions to be idempotent even when the target element was concurrently re-inserted or referenced,  
**So that** I never see phantom elements or crashes.

**Flow:**
1. User A deletes element with ID `(5,B)`.
2. Simultaneously, User C inserts a new element after `(5,B)`.
3. On merge, `(5,B)` is marked tombstone; User C's new element remains (its causal parent is valid).

### US-4: Large Document Performance
**As a** power user with a 100,000-word document,  
**I want** insertions and cursor movements to remain responsive,  
**So that** the CRDT overhead doesn't degrade my editing experience.

**Flow:**
1. Document contains 100k nodes (including tombstones).
2. User inserts a character; algorithm locates insertion point via identifier binary search.
3. Operation is appended and the local view updated in sub-millisecond time.

### US-5: Audit Trail
**As a** document auditor,  
**I want** to see the full history of every element including deleted ones,  
**So that** I can reconstruct what was written and by whom at any point in time.

**Flow:**
1. Auditor queries the global view of the Weave structure.
2. Each node's identifier reveals author (site ID) and logical time of insertion.
3. Tombstone nodes reveal when and by whom elements were deleted.

### US-6: Multi-Device Sync
**As a** user with a laptop and a phone,  
**I want** edits on one device to propagate to the other automatically,  
**So that** I always have the latest version on all my devices.

**Flow:**
1. Edits on laptop generate a delta set.
2. Delta is pushed to a relay; phone subscribes and pulls.
3. Both devices apply the delta and converge.

---

## Known Issues and Limitations

### 1. Unbounded Tombstone Growth
Deleted elements remain as tombstones indefinitely. A heavily-edited document accumulates metadata for every character ever typed. Over time, the in-memory and on-disk footprint grows without bound unless explicit garbage collection is performed.

### 2. Garbage Collection Complexity
Safely removing tombstones requires a global consensus that no peer has a pending operation that references them. Computing this "stable frontier" in a decentralized network is non-trivial and typically requires coordination (e.g., a consensus round or centralized GC coordinator).

### 3. Metadata Overhead Per Element
Each node carries an identifier (site ID + clock), parent reference, and tombstone flag. For character-level granularity (standard for text editors), this metadata can exceed the payload by 10–100×.

### 4. Performance Degradation with Large Documents
As the global view grows (especially tombstones), operations like finding an insertion point by index require traversing or indexing the full node list. Naive implementations are O(n); even tree-indexed implementations have high constant factors.

### 5. No Native Undo/Redo in Concurrent Scenarios
While single-author undo is tractable, undoing an operation that has been causally extended by another author requires sophisticated selective undo protocols not included in the base Weave algorithm.

### 6. Memory Pressure
The append-only global view must fit in memory for fast access. For very large or long-lived documents, memory usage may become prohibitive without a compaction strategy.

### 7. Identifier Space Exhaustion
If site IDs are short (e.g., 8-bit), the namespace may be exhausted in large deployments. Longer IDs increase per-element overhead.

### 8. Ordering Non-Determinism Across Implementations
Different implementations of tie-breaking rules may produce different (but internally consistent) orderings, making interoperability between implementations difficult.

### 9. No Built-in Access Control
Weave CRDT has no notion of permissions. Any peer with access to the data structure can insert or delete elements. Access control must be layered on top.

### 10. Schema Evolution
The algorithm operates on sequences; mapping rich document structures (trees, tables) to sequences and handling schema changes is left to the application layer.

---

## References

- **Automerge**: [https://automerge.org](https://automerge.org) — Production CRDT library implementing a variant of Weave for JSON documents.
- **Yjs**: [https://yjs.dev](https://yjs.dev) — High-performance CRDT framework; uses YATA (Yet Another Transformation Approach), closely related to Weave.
- **Martin Kleppmann's Work**:
  - *"A Conflict-Free Replicated JSON Datatype"* (2017) — Formalizes CRDT for JSON, foundational for Automerge.
  - *"Local-First Software"* (Ink & Switch, 2019) — Defines the local-first paradigm that Weave enables.
  - *"Interleaving anomalies in collaborative text editors"* (2019) — Identifies ordering failure modes.
- **Soundcloud's Roshi** — Demonstrates CRDT set semantics at production scale.
- **Logoot / LSEQ** — Earlier identifier-based sequence CRDTs that influenced Weave's design.
- **RGA (Replicated Growable Array)** — Concurrent predecessor; Weave improves on RGA's insertion performance.
