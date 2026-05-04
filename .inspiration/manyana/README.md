# Manyana

## Overview

Manyana is a conceptual and emerging project in the event-driven CRDT source control management (SCM) space. Rather than storing a mutable working tree and computing diffs on demand (as Git does), Manyana treats every change as an immutable, causally-ordered event appended to a distributed log. The log is the single source of truth; all current state is derived by replaying or projecting events.

By combining Event Sourcing, CQRS (Command Query Responsibility Segregation), and CRDT semantics, Manyana aims to provide peer-to-peer distributed source control with real-time collaboration and robust offline support — without a central server or blockchain overhead.

> **Note:** Manyana is a conceptual/emerging project. No widely-available production implementation exists at the time of writing. This document describes the intended design and research direction.

---

## Features

### 1. Event Sourcing: Every Change is an Immutable Event
No mutation of existing records. Every edit, commit, branch creation, merge, or deletion is appended as a new event to an immutable log. The current state of a repository is always derivable by replaying the event log from the beginning (or from a known snapshot).

### 2. CQRS Pattern (Command Query Responsibility Segregation)
Write operations (commands) and read operations (queries) are handled by separate models. Commands are validated and appended to the event log; queries are served from projections (read models) computed from the log. This decoupling allows independent scaling and optimization of reads vs. writes.

### 3. Causal Consistency via CRDT Semantics
Events carry causal metadata (vector clocks or similar). The CRDT merge function guarantees that any two peers who have seen the same set of events will produce identical state, regardless of the order in which those events were received.

### 4. Peer-to-Peer Distribution Without a Central Server
The event log is distributed across peers using a gossip or epidemic broadcast protocol. There is no designated master or primary node. Every peer can accept new events and propagate them.

### 5. Real-Time Collaboration with Offline Support
Peers can diverge freely while offline, appending local events to their own log. On reconnect, peers exchange events they haven't seen, and the CRDT projection reconciles all changes automatically.

### 6. Event Store as Single Source of Truth
The append-only event log is authoritative. Projections, working trees, and indexes are all derived from it and can be rebuilt at any time by replaying events. This makes the system inherently auditable and recoverable.

### 7. Idempotent Consumers
Projections and downstream consumers are designed to be idempotent: applying the same event twice produces the same result as applying it once. This enables safe retry on delivery failure.

### 8. Pluggable CRDT Definitions per Entity Type
Different entity types (source files, binary assets, configuration) can use different CRDT strategies for merge. Text files might use a character-level sequence CRDT; structured data might use a register or map CRDT.

### 9. Snapshot and Compaction
To avoid replaying the full event log from genesis on every startup, the system can periodically snapshot the derived state and truncate older events. Snapshots are themselves events in the log.

### 10. Causal Event Graph Visualization
Because events carry causal metadata, the full causal history of any entity can be visualized as a DAG — analogous to a Git commit graph but at finer granularity (per-field or per-character if desired).

### 11. Event-Level Access Control
Permissions can be enforced at the event level: certain event types (e.g., force-push, branch deletion) can be restricted to specific cryptographic identities. The access control policy is itself stored as events.

### 12. Schema Versioning via Event Upcasting
When the schema of an event type changes, upcasters transform old events to the new schema during replay. This allows backward-compatible evolution of the event log without rewriting history.

---

## User Stories / User Flows

### US-1: Distributed Team Collaboration Without Central Server
**As a** development team distributed across three continents,  
**I want** to push and pull code changes without depending on a single hosted service,  
**So that** we remain productive even when that service is unavailable.

**Flow:**
1. Each developer runs a local Manyana node.
2. Developer A commits code; a `CodeCommitted` event is appended locally and gossiped to peers.
3. Developer B, offline in a different timezone, pulls when reconnected.
4. Both developers' nodes receive all events and compute identical repository state.

### US-2: Real-Time Pair Programming
**As a** developer pair-programming remotely,  
**I want** my partner's keystrokes to appear in my editor in near real-time,  
**So that** we can collaborate as if sitting side by side.

**Flow:**
1. Both developers open the same file; local edit sessions are backed by a shared CRDT event stream.
2. Developer A types a line; a `TextInserted` event is generated and pushed.
3. Developer B's editor receives the event and applies the CRDT merge.
4. Both editors show the same content.

### US-3: Offline Development on a Plane
**As a** developer traveling without internet,  
**I want** to commit code changes locally and have them sync when I land,  
**So that** I don't lose work and my team gets my changes promptly.

**Flow:**
1. Developer's node is offline; all commits are appended to the local event log.
2. On landing, developer connects to the network.
3. Manyana gossips all locally-generated events to peers.
4. Remote peers merge events; conflicts are resolved via CRDT.

### US-4: Audit Trail for Compliance
**As a** compliance officer,  
**I want** an immutable, tamper-evident record of every change ever made to the codebase,  
**So that** I can satisfy regulatory requirements for software change management.

**Flow:**
1. Auditor queries the event log for all events in a date range.
2. Each event contains author identity, timestamp, causal parents, and payload.
3. Event signatures are verified; the log is provably unmodified.
4. Report is generated from the immutable log.

### US-5: Branching Without Server Round-Trip
**As a** developer,  
**I want** to create a feature branch entirely locally and push it later,  
**So that** I can experiment without polluting shared state.

**Flow:**
1. Developer emits a `BranchCreated` event locally.
2. Subsequent commits are tagged with the branch identifier.
3. When ready, developer connects; branch events are gossiped.
4. Team members see the new branch and can pull it.

### US-6: Recovering from Corrupted State
**As a** repository administrator,  
**I want** to rebuild the working tree from the event log if local state becomes corrupted,  
**So that** I can recover without data loss.

**Flow:**
1. Admin detects corrupted projection/working tree.
2. Admin triggers event replay from the last known good snapshot.
3. All events since the snapshot are replayed in causal order.
4. Working tree is reconstructed to its correct state.

---

## Known Issues and Limitations

### 1. No Widely Available Production Implementation
Manyana is a conceptual/research project. There is no widely-deployed, battle-tested implementation. Adopting it today means building from scratch or relying on early-stage prototypes.

### 2. Event Log Can Grow Unbounded Without Compaction
An append-only event log accumulates indefinitely. Without a robust compaction strategy, storage costs grow proportionally to the number of events, regardless of how many were "undone" or superseded.

### 3. Eventual Consistency May Surface Stale Reads
Because projections are derived asynchronously from the event log, a query immediately after a write may return state that does not yet include that write. Applications must tolerate or work around this.

### 4. Complex Event Schema Versioning
As the system evolves, old events must remain replayable. Managing upcasters, downcasters, and event version compatibility over years of schema evolution is non-trivial.

### 5. CQRS Adds Complexity for Simple Use Cases
The command/query separation that CQRS mandates introduces significant architectural overhead. For small teams or simple repositories, this complexity may outweigh the benefits.

### 6. Debugging Distributed Event Flows
Tracing a single logical operation across multiple peers' event logs and projections is significantly harder than debugging a traditional centralized system. Tooling for distributed event tracing is immature.

### 7. Gossip Protocol Overhead
Epidemic broadcast protocols are not perfectly efficient; they may deliver duplicate events and require deduplication logic. Under high churn (many peers joining/leaving), convergence time can be unpredictable.

### 8. No Standard Tooling Ecosystem
Unlike Git (which has GitHub, GitLab, IDEs, CI systems, etc.), Manyana has no existing tooling ecosystem. Every integration must be built from scratch.

### 9. Causal Metadata Overhead
Attaching vector clocks or causal tokens to every event adds per-event overhead. For fine-grained events (character-level edits), this can significantly inflate storage and network costs.

### 10. CRDT Merge Correctness Is Non-Trivial to Verify
Implementing and verifying that a CRDT merge function satisfies commutativity, associativity, and idempotency for all edge cases requires rigorous testing and formal methods that most teams lack.

---

## References

- **Event Sourcing Pattern**: Martin Fowler — [https://martinfowler.com/eaaDev/EventSourcing.html](https://martinfowler.com/eaaDev/EventSourcing.html)
- **CQRS Pattern**: Martin Fowler — [https://martinfowler.com/bliki/CQRS.html](https://martinfowler.com/bliki/CQRS.html)
- **CRDT Survey**: Shapiro et al., *"A Comprehensive Study of Convergent and Commutative Replicated Data Types"* (INRIA, 2011)
- **Roshi (SoundCloud)**: Production CRDT event-log system — [https://github.com/soundcloud/roshi](https://github.com/soundcloud/roshi)
- **Automerge**: CRDT for collaborative applications — [https://automerge.org](https://automerge.org)
- **Eventuate / Akka Persistence**: Event sourcing frameworks with CRDT integration
- **Local-First Software** (Ink & Switch): [https://www.inkandswitch.com/local-first/](https://www.inkandswitch.com/local-first/)
