# ADR-0019: Epoch Live Browser State And Propagation

## Status

Accepted. Chosen design direction; implementation deferred to a follow-up change.
This ADR advances [ADR-0003](0003-competitive-gap-design-options.md) Option 6
(Browser Live Repository Surface) and Option 2 (Pluggable Sync And Availability
Tiers) from options into a single packaged design. The full specification is
[docs/epoch-live-spec.md](../epoch-live-spec.md).

## Context

Epoch already has every primitive a browser state-and-sync client needs: a
signed, content-addressed event log with a first-class `rollback` event
(`packages/Epoch.Core/src/core.ts`), a CRDT engine over Collabs
(`packages/Epoch.Core/src/crdt.ts`, ADR-0002), pluggable transports and gossip
(`EpochTransport`, `syncWithTransport`, `gossip`), reactive React stores with
time-travel (`EpochReactStore` and `EpochLiveRepository` in
`packages/Epoch.WASM.React/src/index.ts`), and a browser change hub
(`packages/Epoch.Integration.Core/src/index.ts`).

Those primitives are currently exposed as **integrations that observe** other
state managers. `@epoch/redux` and `@epoch/xstate` are thin `trackChange`
adapters that watch an existing store; `EpochLiveRepository` materializes state as
last-writer-wins per entity rather than through the real CRDT merge, and its
`syncFrom` is a pull-only copy from a peer virtual file system with no networked
provider and no presence.

The market frames client state through two incumbents. **Redux** owns the
predictable-store-with-time-travel mental model, but its time-travel is an
ephemeral developer-tool affordance and it delegates persistence, undo, offline,
and sync to add-on libraries. **Yjs** owns CRDT data propagation and awareness,
but provides no signed, auditable history and treats state management and
collaboration as separate concerns. The repository has competitor dossiers for
Yjs and Automerge, but none for Redux, and no artifact that positions Epoch as a
direct competitor to either for rollback and data propagation.

## Decision

Design a new browser client package, `@epoch/live` (folder `Epoch.Live` when
built), as a **direct competitor to Redux and Yjs** that unifies local state
management and real-time collaboration on one signed, auditable Epoch history,
with **rollback** and **data propagation** as the hero capabilities. This change
delivers the design and competitive justification only; no runtime code or
package registration lands with it.

`@epoch/live` is a composition layer, not a fork. It reuses existing primitives:

### Layered architecture

- **L0 Signed event log** — `EpochRepository` / `Event` (Ed25519, content
  addressing, Lamport + parents DAG).
- **L1 State model** — reducer-state events (Redux-shaped) and CRDT-entity events
  (Yjs-shaped) via `CRDTEventLog` / `EntityRegistry`, both signed and replayable.
- **L2 Store API (Redux competitor)** — `createLiveStore(...)` exposing
  `dispatch` / `getState` / `select` / `subscribe`, where every committed action
  is a signed event.
- **L3 Rollback and time-travel (hero)** — an ephemeral `rewind` preview plus a
  durable `rollbackTo` that appends the signed `rollback` event
  (`core.ts:1545`) and replicates so peers converge; `undo` / `redo` as sugar.
- **L4 Data propagation (Yjs competitor)** — a `LiveProvider` seam over
  `EpochTransport` with BroadcastChannel (cross-tab), WebSocket relay (dumb
  relay), and WebRTC (peer mesh) providers; offline-first; heads-union;
  verify-before-trust.
- **L5 Presence / awareness** — an ephemeral, **unsigned** channel over the same
  providers, never written to the signed log.
- **L6 React bindings** — `useLiveStore`, `useLiveSelector`, `useRollback`,
  `useLiveHistory`, `usePresence` via `useSyncExternalStore`.

The differentiator is that `@epoch/live` is simultaneously the local store
(Redux's job) and the collaboration engine (Yjs's job) on one durable, signed
history, and rollback is a first-class, replicated, audited operation rather than
a debugging convenience or a manual snapshot.

### Condensed comparison

| Capability | Redux | Yjs | `@epoch/live` |
|---|---|---|---|
| Rollback | Ephemeral dev-only time-travel | Manual snapshots / local undo | Durable, replicated, signed `rollback` |
| Data propagation | Add-on libraries | Core (providers/awareness) | Core (providers over `EpochTransport`) |
| Signed, auditable history | No | No | Yes (`verify()` gate) |
| One model for state + collaboration | No | Partial | Yes |

The full matrix and normative contracts are in
[docs/epoch-live-spec.md](../epoch-live-spec.md). Competitive framing lives in the
[Redux](../competition/products/redux/profile.md) and
[Yjs](../competition/products/yjs/profile.md) dossiers.

## Design-Goal Alignment

| Epoch design goal | How this design honors it |
|---|---|
| Local-first, offline-capable | `dispatch` appends locally offline; providers converge on reconnect. |
| Auditable by default | Every action and rollback is a signed, content-addressed event. |
| Transport moves bytes; verification decides trust | Providers are dumb; `ingest` runs `verify()` before applying (ADR-0003 Option 2). |
| Durable state separate from ephemeral awareness | Presence is unsigned, ephemeral, and never in history (ADR-0003 Option 6). |
| One CRDT backend | Reuses Collabs via `CRDTEventLog` (ADR-0002); no second engine. |
| Small, composable surface | A composition layer over existing packages, not a rewrite. |

## Consequences

Positive:

- Gives Epoch a credible, familiar answer to "why not just use Redux or Yjs,"
  backed by a conformance-grade spec a future team or agent can build from.
- Turns scattered primitives (rollback event, transports, reactive store, CRDT
  merge) into one coherent product story.
- Makes rollback a replicated, audited operation that neither incumbent offers.
- Adds the missing Redux competitor dossier and a Redux-vs-Yjs-vs-Epoch matrix.

Trade-offs:

- `@epoch/live` will be heavier at runtime than Redux's small core or Yjs's
  compact engine, in exchange for signing and audit.
- Reducer-state semantics under concurrency are weaker than CRDT entities;
  genuinely conflicting fields should be modeled as CRDT entities.
- Networked providers (WebSocket relay, WebRTC) need deployment infrastructure to
  exercise end to end, so their conformance is validated behind the provider seam
  rather than in-process.
- Implementation is deferred; this ADR creates an expectation the codebase does
  not yet satisfy until the follow-up change lands.

## Non-Goals

- No authoritative server, relay, or seed for repository truth.
- No signing of ephemeral presence into history.
- No second CRDT engine or patch-algebra rewrite of the event model.
- No runtime code or `packages/Epoch.Live/` registration in this change.

## Revisit Criteria

Revisit when browser live collaboration becomes a committed product goal and
implementation begins; when a concrete provider (WebSocket relay or WebRTC)
requires a signaling or relay service decision; when reducer-state concurrency
needs stronger guarantees than deterministic event ordering; or when key
rotation, redaction, or maintainer-identity policy beyond the current local
Ed25519 model becomes necessary.

## Related Documents

- [Epoch Live Specification](../epoch-live-spec.md)
- [ADR-0003: Competitive Gap Design Options](0003-competitive-gap-design-options.md)
- [ADR-0002: CRDT Backend Selection](../crdt-backend-decision.md)
- [ADR-0001: Design Philosophy And Inspiration](0001-design-philosophy-and-inspiration.md)
- [ADR-0011: Community Web Dogfoods Epoch](0011-community-web-dogfoods-epoch.md)
- [Redux competitor dossier](../competition/products/redux/profile.md)
- [Yjs competitor dossier](../competition/products/yjs/profile.md)
