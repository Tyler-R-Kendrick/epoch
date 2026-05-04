# CRDT Backend Decision

Epoch's role is the signed, event-driven DVCS envelope: identity, append-only events, anti-entropy, verification, and source-control integration. It should not reinvent mature CRDT entity implementations when a credible library can provide map/text semantics.

## Candidates measured

Measured locally on Node.js v20.20.2 with a 4-agent offline workload:

- 750 map writes per agent
- 750 text appends per agent
- 6,000 total CRDT updates
- materialization by replaying all updates into a fresh replica

| Backend | Generate updates | Replay/materialize | Update bytes | Result |
|---|---:|---:|---:|---|
| `@automerge/automerge` 3.2.6, wasm-backed | 2142.8 ms | 433.5 ms | 981.8 KiB | 3,000 map entries, 3,000 text chars |
| `@collabs/collabs` 0.13.4 | 68.7 ms | 23.5 ms | 470.3 KiB | 3,000 map entries, 3,000 text chars |

## Pros and cons

### Automerge

Pros:

- Mature local-first CRDT model with map/object and text splice semantics.
- `@automerge/automerge` is backed by the Automerge WASM implementation in Node.
- No production vulnerabilities reported by `npm audit --omit=dev` in this repository.
- Changes are binary, portable updates that fit Epoch's signed event payloads.

Cons:

- Slower than Collabs in the measured per-operation update workload.
- Larger update payloads in the measured workload.
- Dynamic entity creation must be handled carefully so independent offline first-writes do not conflict on the container path.

### Collabs

Pros:

- Much faster than Automerge in this local benchmark.
- Smaller update payloads in this local benchmark.
- More extensible CRDT construction model with built-in `CValueMap`, `CText`, lists, sets, counters, presence, and custom Collab composition.

Cons:

- Adding `@collabs/collabs@0.13.4` currently introduces critical transitive audit findings through `protobufjs <7.5.5`.
- No available non-breaking npm audit fix was reported for the tested version.
- Its runtime/schema model is a stronger architectural commitment than Epoch needs for the first CRDT-backed event slice.

## Decision

Use `@automerge/automerge` for the current Epoch prototype because it provides existing, credible CRDT entities without introducing known production vulnerabilities. Epoch stores Automerge changes inside signed `crdt` events and materializes views by applying those changes, keeping Epoch focused on source-control concerns instead of CRDT entity algorithms.

Revisit Collabs when its dependency chain no longer introduces critical audit findings. Based on the measurement, Collabs is the preferred future candidate for performance and extensibility if the security blocker is resolved.
