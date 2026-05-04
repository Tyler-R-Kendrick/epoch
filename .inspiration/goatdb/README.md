# GoatDB

## Overview

GoatDB ([goatplatform/goatdb](https://github.com/goatplatform/goatdb)) is a local-first, peer-to-peer distributed document database written in pure TypeScript. Unlike traditional client–server databases where the server holds authoritative state, GoatDB treats every client as a full replica. The server acts purely as a coordination layer, not a source of truth.

GoatDB combines CRDT-based automatic conflict resolution, cryptographic signing of every commit (Ed25519), and a Git-like commit graph model to deliver a database that works fully offline, syncs automatically when online, and exposes a reactive query API via React hooks. In-memory reads on the client can be up to 300× faster than SQLite-in-browser benchmarks for typical read-heavy workloads.

**Reference**: [https://github.com/goatplatform/goatdb](https://github.com/goatplatform/goatdb) | [https://goatdb.dev/](https://goatdb.dev/)

---

## Features

### 1. Local-First Architecture
Every client holds a complete, independently-readable replica of all data it has synced. Reads never require a network round-trip. The application functions fully while offline and syncs changes when connectivity is restored.

### 2. Every Client is a Full Replica
There is no privileged "primary" node. Each client replica can accept writes, process queries, and compute merges independently. The server's role is limited to routing and bootstrapping, not enforcing consistency.

### 3. Peer-to-Peer Distribution
Clients can sync directly with each other or through seed/relay nodes. The protocol does not mandate a central hub, enabling truly decentralized data flows.

### 4. CRDT-Based Automatic Conflict Resolution
Concurrent writes are resolved automatically using CRDT semantics. Three-way merges are the default merge strategy; there are no merge conflicts surfaced to the user for standard data types.

### 5. Cryptographic Commit Signing (Ed25519)
Every commit is signed with the author's Ed25519 private key. Signatures are verified on every peer before applying changes, preventing tampering or impersonation even from the server.

### 6. Git-Like Commit Graph Model
The data model is a DAG of immutable commits — analogous to Git's object graph. Each commit references its parent(s), enabling full history traversal, branching, and time-travel queries.

### 7. Three-Way Merge
When two branches diverge from a common ancestor, GoatDB computes the three-way merge automatically using the CRDT definitions for each field type. This mirrors Git's merge strategy but operates at the field level.

### 8. In-Memory Reads (up to 300× faster than SQLite in browser)
The active working set lives entirely in memory. Query evaluation avoids disk I/O, making read-heavy workloads extremely fast compared to IndexedDB or SQLite-WASM in browser environments.

### 9. Live Queries with Built-in Reactivity
Queries are live: they automatically re-evaluate when the underlying data changes (local write or incoming sync). React hooks expose these reactive queries directly to UI components.

### 10. React Hooks API
`useQuery`, `useDocument`, and related hooks provide idiomatic React integration. Components subscribe to live queries and re-render automatically on data changes.

### 11. Pure TypeScript
The entire GoatDB codebase, including the CRDT engine, sync protocol, and storage adapters, is written in TypeScript with no native dependencies. It runs in Deno, Node.js, and the browser without recompilation.

### 12. Deno, Node.js, and Browser Support
A single TypeScript package targets all three runtimes. Storage adapters abstract over file system (Deno/Node) and IndexedDB (browser).

### 13. Automatic Sync Protocol
GoatDB manages sync transparently: detecting connectivity, batching commits, and applying remote deltas. Applications opt into sync by configuring endpoints; the protocol handles retry and deduplication.

### 14. Schema Validation
Document schemas are defined in TypeScript and enforced on write. Invalid documents are rejected before they enter the commit graph, maintaining data integrity across replicas.

### 15. Time-Travel / Historical Queries
Because the commit graph is immutable and append-only, any previous state of the database can be reconstructed by walking the graph to any commit hash. This enables audit logs and point-in-time restores.

---

## User Stories / User Flows

### US-1: Offline-First Mobile Application
**As a** mobile developer,  
**I want** my app to read and write data without requiring a network connection,  
**So that** users in low-connectivity environments have a seamless experience.

**Flow:**
1. User opens app; GoatDB hydrates from local IndexedDB storage.
2. User creates and edits documents; writes are committed locally and signed with Ed25519 key.
3. Device goes offline; app continues to function normally.
4. Device reconnects; GoatDB syncs local commits to the server and pulls remote commits.
5. Three-way merge resolves any concurrent edits without user intervention.

### US-2: Collaborative Document Editing
**As a** team member,  
**I want** concurrent edits from my colleagues to appear in my document automatically,  
**So that** we can collaborate in real-time without overwriting each other's work.

**Flow:**
1. User A and User B both have the document open.
2. User A edits `title` field; User B edits `body` field simultaneously.
3. GoatDB's CRDT merge sees no conflicting fields and merges both edits cleanly.
4. Both clients receive the merged state within ~700–1000ms.

### US-3: React UI Integration
**As a** frontend developer,  
**I want** my React components to automatically re-render when database data changes,  
**So that** I don't need to manage subscriptions or polling manually.

**Flow:**
1. Component calls `useQuery({ collection: 'todos', filter: { done: false } })`.
2. GoatDB registers the query as a live subscription.
3. Another user marks a todo as done; sync delivers the update.
4. React hook fires; component re-renders with updated list.

### US-4: Tamper-Evident Audit Log
**As a** compliance officer,  
**I want** every change to the database to be cryptographically signed by its author,  
**So that** I can verify the integrity and provenance of all data.

**Flow:**
1. Developer queries commit history for a document.
2. Each commit shows author public key, timestamp, and Ed25519 signature.
3. Verification function checks signature against commit payload.
4. Any tampered commit fails verification and is rejected.

### US-5: Multi-Device User Profile Sync
**As a** user,  
**I want** my profile and preferences to sync across my laptop, tablet, and phone,  
**So that** I have a consistent experience on all my devices.

**Flow:**
1. User signs in on laptop; GoatDB initializes replica with user's keypair.
2. User updates avatar on laptop; commit is pushed to relay.
3. Phone pulls the commit; avatar is updated automatically.
4. Both devices show identical state.

### US-6: Server-Side Data Processing
**As a** backend engineer,  
**I want** to run GoatDB on Node.js/Deno to aggregate data from multiple clients,  
**So that** I can build analytics dashboards without a separate database.

**Flow:**
1. Server initializes GoatDB with file-system storage adapter.
2. Clients sync to server; server accumulates all commits.
3. Server runs live query aggregating totals across all user documents.
4. Dashboard reads from server's in-memory state.

### US-7: Time-Travel Debug Session
**As a** developer debugging a production issue,  
**I want** to query the database state at a specific past commit,  
**So that** I can reproduce the bug that occurred at that point in time.

**Flow:**
1. Developer identifies the approximate commit hash from logs.
2. GoatDB time-travel API reconstructs state at that commit.
3. Developer queries the historical state to inspect field values.
4. Bug is reproduced and root cause identified.

---

## Known Issues and Limitations

### 1. Garbage Collection Still Maturing
GoatDB's storage model is append-only. Deleted documents are marked with tombstones but not physically removed. The GC mechanism for compacting old commits and removing tombstones is still under active development and not production-ready.

### 2. Optimized for Read-Heavy Workloads
The in-memory architecture excels at reads but is not optimized for write-heavy scenarios. High-frequency writes from many clients can cause large commit graphs and slow merge operations.

### 3. ~700–1000ms Sync Latency
GoatDB is not a real-time streaming protocol. Sync latency is typically 700ms–1000ms, making it unsuitable for applications requiring sub-100ms collaborative updates (e.g., multiplayer gaming, live cursors).

### 4. No Relational Queries or Joins
The query model is document-oriented. There is no SQL-like join syntax. Cross-collection relationships must be resolved in application code.

### 5. Client-Side Processing Load
Because every client is a full replica and runs the merge engine locally, CPU and memory usage on the client can be significant for large datasets or complex schemas.

### 6. All Synced Data Accessible to Clients
Because every client holds a full replica, data that has been synced is readable by that client. Row-level or field-level access control enforced server-side is not natively supported; sensitive data must be kept in separate collections with restricted sync.

### 7. JavaScript / TypeScript Only
GoatDB has no bindings for Rust, Go, Python, or other languages. Non-JS backends cannot natively participate in the sync protocol.

### 8. Evolving API
As an emerging project, the API surface is subject to breaking changes. Production adoption requires tracking upstream changes carefully.

### 9. Memory Footprint
Keeping the full working set in memory limits the maximum dataset size to available RAM. Very large datasets (gigabytes) are not practical.

### 10. No Fine-Grained Permission Model
Access control is coarse-grained (collection-level). There is no built-in mechanism for per-document or per-field permissions enforced by the CRDT merge engine.

---

## References

- **GoatDB GitHub**: [https://github.com/goatplatform/goatdb](https://github.com/goatplatform/goatdb)
- **GoatDB Documentation**: [https://goatdb.dev/](https://goatdb.dev/)
- **Ink & Switch — Local-First Software**: [https://www.inkandswitch.com/local-first/](https://www.inkandswitch.com/local-first/)
- **Ed25519 Signing**: [https://ed25519.cr.yp.to/](https://ed25519.cr.yp.to/)
- **CRDT Survey (Shapiro et al.)**: *"A Comprehensive Study of Convergent and Commutative Replicated Data Types"* (INRIA, 2011)
