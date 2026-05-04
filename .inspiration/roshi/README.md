# Roshi

## Overview

Roshi is SoundCloud's distributed, eventually-consistent CRDT set implementation, designed for high-throughput timeline and feed management. Built on top of multiple Redis clusters, Roshi implements the **Observed-Remove Set (OR-Set)** CRDT, which supports both add and remove operations while guaranteeing that all replicas eventually converge to the same state.

SoundCloud open-sourced Roshi to address a specific problem at scale: maintaining user timelines (ordered sets of event IDs) across multiple data centers with millions of writes per second, where occasional inconsistency is acceptable but data loss is not.

**Reference**: [https://github.com/soundcloud/roshi](https://github.com/soundcloud/roshi) | SoundCloud Engineering Blog

---

## Features

### 1. Distributed Eventually-Consistent CRDT Set (OR-Set)
Roshi implements the Observed-Remove Set semantics: an element can be added and removed multiple times, and concurrent add/remove operations resolve deterministically. The "observed" in OR-Set means a remove only removes elements the removing peer has observed (preventing accidental deletion of concurrent adds).

### 2. High Write Throughput (Millions of Writes/Second)
Roshi's stateless API layer fans out writes to multiple Redis clusters in parallel. Each Redis cluster handles writes independently; the API layer coordinates quorum. This architecture supports millions of writes per second.

### 3. Stateless API Layer Over Multiple Redis Clusters
The Roshi API servers hold no persistent state. All data lives in Redis clusters. API servers can be scaled horizontally without data migration; failing API servers are immediately replaceable.

### 4. Anti-Entropy and Reconciliation
Roshi runs background anti-entropy processes that walk through keys, compare values across replicas, and reconcile divergence. This ensures eventual consistency even when real-time replication is delayed or partially failed.

### 5. Quorum-Based Read/Write Coordination
Reads and writes are sent to all replicas; a configurable quorum (e.g., majority) must respond successfully before the operation is acknowledged. This provides tunable consistency/availability trade-offs (CAP theorem).

### 6. Timeline and Feed Management Use Case
Roshi is optimized for ordered set operations on event IDs: add an event to a user's timeline, remove an event (e.g., unliked track), walk the timeline in score order. These operations map directly to sorted set operations in Redis.

### 7. Add and Remove Operations with Tombstone Tracking
Every element is tracked as (key, member, score). Removes write a tombstone with the same member. The CRDT merge favors adds over removes when timestamps are ambiguous, ensuring items aren't lost to race conditions.

### 8. Score-Based Ordering
Elements in each set are associated with a float64 score (typically a timestamp). Sets are traversed in score order, enabling efficient timeline pagination (most-recent-first or oldest-first).

### 9. Multi-Cluster Replication
Data is written to N Redis clusters simultaneously. This provides both horizontal scaling and geographic redundancy. Read operations across clusters use quorum to detect and repair divergence.

### 10. Walk Operations for Feed Pagination
The `walk` operation efficiently pages through a set's elements in score order, handling the complexity of merging sorted results from multiple clusters while excluding tombstoned elements.

### 11. Insert-Wins Semantics for Concurrent Operations
When an add and a remove for the same member occur concurrently (same timestamp), Roshi resolves in favor of the add. This prevents items from being silently dropped due to timing coincidences.

### 12. Operational Simplicity via Redis
By building on Redis (a well-understood, operationally mature data store), Roshi inherits Redis's monitoring, backup, persistence (RDB/AOF), and replication tooling.

---

## User Stories / User Flows

### US-1: Adding a Track to a User's Timeline
**As a** SoundCloud user,  
**I want** tracks I follow to appear immediately in my timeline,  
**So that** I can discover new music from artists I follow as soon as they post.

**Flow:**
1. Artist posts a new track; event `{user_id: artist, track_id: T, timestamp: now}` is generated.
2. Timeline service calls Roshi `add(key=follower_id, member=track_id, score=timestamp)`.
3. Roshi fans out the write to all Redis clusters; waits for quorum acknowledgment.
4. Follower's timeline now includes the new track.

### US-2: Removing a Deleted Track from Timelines
**As a** user,  
**I want** tracks deleted by artists to disappear from my timeline,  
**So that** I don't see broken playback links.

**Flow:**
1. Artist deletes track T; deletion event generated.
2. Timeline service calls Roshi `remove(key=follower_id, member=track_id, score=timestamp)`.
3. Tombstone is written to all clusters.
4. Next timeline walk filters out tombstoned members.

### US-3: Paginating Through a Long Timeline
**As a** user,  
**I want** to scroll through hundreds of timeline entries smoothly,  
**So that** my feed loads quickly even with many followed artists.

**Flow:**
1. Frontend requests first page: `walk(key=user_id, offset=0, limit=20, order=desc)`.
2. Roshi queries all Redis clusters, merges results by score (desc), filters tombstones.
3. Returns 20 most-recent timeline entries.
4. Next page request uses the last-seen score as cursor.

### US-4: Reconciling Diverged Replicas
**As a** Roshi operator,  
**I want** background anti-entropy to detect and fix replicas that fell out of sync,  
**So that** transient network partitions don't cause permanent inconsistency.

**Flow:**
1. Network partition temporarily isolates one Redis cluster.
2. During partition, some writes reach only 2 of 3 clusters.
3. Anti-entropy process scans keys, detects divergence in cluster 3.
4. Missing entries are replicated from clusters 1 and 2 to cluster 3.
5. All clusters converge.

### US-5: Horizontal Scaling During Peak Traffic
**As a** Roshi operator,  
**I want** to add API server capacity during a viral event without data migration,  
**So that** the system handles traffic spikes without degradation.

**Flow:**
1. Operator provisions additional Roshi API servers behind the load balancer.
2. New servers start routing writes/reads to the existing Redis clusters.
3. No data migration required; all state lives in Redis.
4. Traffic is distributed; latency normalizes.

### US-6: Monitoring Replication Lag
**As a** platform engineer,  
**I want** dashboards showing the replication state of each Redis cluster,  
**So that** I can detect and respond to consistency issues before they affect users.

**Flow:**
1. Roshi exposes metrics per cluster: write success rate, quorum failures, anti-entropy lag.
2. Prometheus scrapes metrics; Grafana dashboard visualizes.
3. Alert fires when quorum failure rate exceeds threshold.
4. Engineer investigates the affected cluster.

---

## Known Issues and Limitations

### 1. Eventual Not Strong Consistency
Roshi does not provide linearizability or serializability. A read immediately after a write may not reflect that write (read-your-writes is not guaranteed without routing to the same cluster). Applications must tolerate stale reads.

### 2. No Transactional Guarantees
Operations are not atomic across clusters. A write that partially succeeds (reaches 2 of 3 clusters before failure) leaves replicas in a diverged state until anti-entropy repairs it.

### 3. Complex Deletes: Tombstones Can Resurface Deleted Items
Tombstones are stored alongside live entries. If a tombstone is GC'd before all replicas have seen it, a late-arriving add operation for the same member may reappear on replicas that no longer have the tombstone to suppress it.

### 4. Heavily Tuned for SoundCloud's Specific Use Case
Roshi's data model (scored sets, timeline semantics, add-wins) reflects SoundCloud's feed management needs. Adapting it to general-purpose use cases (e.g., key-value store, relational data) requires significant rework.

### 5. Dependency on Redis (Memory, Snapshotting)
All data must fit in Redis memory. For massive datasets (billions of timeline entries), memory costs are prohibitive. Redis's snapshotting and persistence add operational overhead.

### 6. No Rich Querying (Set Operations Only)
Roshi supports add, remove, and walk (scored range scan) on sets. There is no filtering, aggregation, join, or secondary index support. Complex queries must be implemented in application code.

### 7. Operational Complexity of Redis Cluster Management
Running multiple Redis clusters with proper monitoring, backup, failover, and capacity planning is operationally demanding. Incidents in one cluster can affect quorum and degrade service.

### 8. Not a General-Purpose Database
Roshi is purpose-built for one class of problem. It is not a substitute for PostgreSQL, MongoDB, or Cassandra in workloads requiring rich data models or strong consistency.

### 9. Add-Wins Semantics Not Always Desired
In some domains, remove should win over concurrent add (e.g., banning a user should override a concurrent follow). Roshi's insert-wins default is not configurable without forking the codebase.

### 10. Limited Documentation and Community
As an internal SoundCloud tool that was open-sourced, Roshi has limited documentation, minimal active community, and no professional support options.

---

## References

- **Roshi GitHub**: [https://github.com/soundcloud/roshi](https://github.com/soundcloud/roshi)
- **SoundCloud Engineering Blog**: Posts describing Roshi's design and production experience.
- **OR-Set (Observed-Remove Set)**: Shapiro et al., *"A Comprehensive Study of Convergent and Commutative Replicated Data Types"* (INRIA, 2011)
- **Redis Sorted Sets**: [https://redis.io/docs/data-types/sorted-sets/](https://redis.io/docs/data-types/sorted-sets/) — Underlying storage primitive.
- **CAP Theorem**: Brewer, *"Towards Robust Distributed Systems"* (PODC, 2000)
- **Dynamo**: Amazon's eventually-consistent key-value store — inspirational architecture for Roshi's multi-cluster design.
