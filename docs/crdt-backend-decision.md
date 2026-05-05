# CRDT Backend Decision

Epoch's role is the signed, event-driven DVCS envelope: identity, append-only events, sync, verification, hooks, and source-control integration. Epoch should not define bespoke CRDT entity algorithms when a credible library can provide extensible map/text semantics.

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

### Collabs

Pros:

- Much faster than Automerge in this local benchmark.
- Smaller update payloads in this local benchmark.
- More extensible CRDT construction model with built-in `CValueMap`, `CText`, lists, sets, counters, presence, and custom Collab composition.
- Runtime messages are storage/network agnostic, which maps cleanly to Epoch signed events and sync.

Cons:

- `@collabs/collabs@0.13.4` depends on Collabs packages that request `protobufjs ~6.9.0`.
- `protobufjs <7.5.5` has a critical advisory, so using Collabs without an override fails production audit.
- Its runtime/schema model is a stronger architectural commitment than Automerge's document API.

### Automerge

Pros:

- Mature local-first CRDT model with map/object and text splice semantics.
- `@automerge/automerge` is backed by the Automerge WASM implementation in Node.
- Changes are binary, portable updates that fit Epoch's signed event payloads.

Cons:

- Slower than Collabs in the measured per-operation update workload.
- Larger update payloads in the measured workload.
- Less extensible for custom CRDT composition than Collabs.

## Dependency exception

Epoch uses `@collabs/collabs@0.13.4` and explicitly overrides `protobufjs` to `7.5.5`.

Rationale:

- Collabs is the selected CRDT entity backend because it is faster and more extensible for Epoch's agent-oriented workload.
- The known security issue is in the transitive `protobufjs <7.5.5` range, not in Epoch's CRDT event envelope.
- `package.json` pins a top-level `protobufjs@7.5.5` and uses npm `overrides` to force Collabs' transitive protobuf dependency to the patched version.
- `npm audit --omit=dev` currently reports zero production vulnerabilities with the override in place.

This exception should be revisited when Collabs publishes a version that depends on a patched protobuf range directly.

## Decision

Use `@collabs/collabs` for Epoch CRDT entities. Epoch stores Collabs runtime messages inside signed `crdt` events and materializes views by replaying those messages into `CValueMap` and `CText`, keeping Epoch focused on source-control concerns instead of CRDT entity algorithms.
