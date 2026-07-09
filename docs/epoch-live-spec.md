# Epoch Live (`@epoch/live`) Specification

Status: Draft v1 — implemented. This document specifies the **framework-agnostic**
`@epoch/live` browser client (`packages/Epoch.Live`) and its compatibility
extensions `@epoch/live-react`, `@epoch/live-redux`, and `@epoch/live-yjs`,
delivered as a composition layer over existing Epoch primitives with a runnable
sample ([`samples/epoch-live-collab`](../samples/epoch-live-collab/README.md))
plus unit, provider, compatibility, and React coverage. The core package imports
none of the state or collaboration libraries it competes with; interop is
expressed through structural contracts in the extensions. The decision is
recorded in
[ADR-0019](design-decisions/0019-epoch-live-browser-state-and-propagation.md).

## 1. Normative Frame

- **Audience.** Engineers and coding agents who will implement `@epoch/live`, and
  reviewers evaluating Epoch against Redux and Yjs.
- **Purpose.** Define a browser-first client that is a direct competitor to
  **Redux** (predictable state container with time-travel) and **Yjs** (CRDT
  data propagation), unifying both on one signed, auditable Epoch event history,
  with **rollback** and **data propagation** as the two hero capabilities.
- **Normative language.** `MUST`, `MUST NOT`, `SHOULD`, `MAY`, and `OPTIONAL`
  follow their usual conformance meaning. `implementation-defined` marks a choice
  the spec intentionally leaves open; an implementation that makes such a choice
  `MUST` document it.
- **Relationship to existing packages.** `@epoch/live` is a new **composition
  layer** over existing Epoch primitives. It `MUST NOT` fork the event model,
  introduce a second CRDT engine, or make any relay authoritative. It reuses
  `@epoch/core`, `@epoch/wasm-react`, and `@epoch/integration-core` (see §3).

## 2. Problem, Boundary, Goals, and Non-Goals

**Problem.** Browser apps today solve local state management with one stack
(Redux/RTK) and real-time collaboration with a different stack (Yjs + providers +
awareness). Neither gives durable, signed, auditable history, and neither treats
rollback as a first-class, replicated operation. Epoch already has the signed
event log, CRDT merge, transports, and a `rollback` event, but exposes them as
integrations that *observe* other state managers rather than as a *primary store*
that replaces them.

**Boundary.** `@epoch/live` owns: the reactive store API, rollback/time-travel,
the client-side propagation seam (`LiveProvider`), presence distribution, and
React bindings. It delegates: event signing, content addressing, CRDT merge,
transports, and verification to `@epoch/core`. It does **not** own: a hosted
relay server, authentication services, or a WebRTC signaling service (those are
deployment concerns behind the provider seam).

**Goals (required for conformance).**

1. A Redux-shaped store: `dispatch`, `getState`, `select`, `subscribe`, where
   every committed action becomes a signed Epoch event.
2. First-class rollback: an ephemeral `rewind` preview **and** a durable,
   replicated, signed `rollbackTo` that all peers converge on.
3. CRDT-backed shared entities that merge without user-visible conflicts.
4. Offline-first propagation across tabs and peers through pluggable providers,
   where inbound events are trusted only after `verify()`.
5. Ephemeral presence/awareness distributed over the same providers but never
   written to signed history.
6. A framework-agnostic core with zero imports of the incumbent state or
   collaboration libraries, plus extension packages that provide React hooks
   and structural compatibility facades for incumbent store and shared-map
   contracts with parity-or-better ergonomics.

**Non-Goals (protect scope).**

- No authoritative server, relay, or seed for repository truth.
- No signing of ephemeral presence into history.
- No second CRDT engine (the reference client uses a deterministic op-based
  LWW-map fold; Collabs remains available for richer entities per ADR-0002).
- No full patch-algebra rewrite of the event model.
- No bundled WebSocket-relay or WebRTC-signaling server; networked providers plug
  in behind the provider seam.
- No imports of incumbent state or collaboration libraries anywhere in the
  family; compatibility is structural, and only the React hooks extension
  carries a framework peer dependency.

**Product principles.** Local-first and offline-capable by default; durable and
auditable over convenient-but-ephemeral; familiar to Redux and Yjs developers;
transport moves bytes while verification decides trust (ADR-0003).

### 2.1 Competitive Comparison Matrix

| Dimension | Redux (+Toolkit/DevTools) | Yjs (+providers/awareness) | `@epoch/live` |
|---|---|---|---|
| State model | Single store; actions folded by pure reducers | Shared CRDT types (`Y.Map`/`Y.Array`/`Y.Text`) | Signed event log projected into reducer-state **and** CRDT entities |
| Rollback | DevTools time-travel: ephemeral, local, dev-only | Manual snapshots / `UndoManager`; no shared rollback | Signed `rollback` event: durable, replicated, audited |
| Time-travel | Yes, in dev tools | Local undo/redo via `UndoManager` | `rewind` preview + durable `rollbackTo` commit |
| Conflict resolution | None (app-defined; last dispatch wins) | Automatic CRDT merge | Automatic CRDT merge (Collabs) + signed reusable resolutions |
| Offline-first | Add-on (`redux-offline`) | Core strength | Core: append offline, converge on reconnect |
| Networked sync | None in core (add-ons) | Yes (WebSocket/WebRTC providers) | Yes (BroadcastChannel / WebSocket relay / WebRTC) over `EpochTransport` |
| Presence / awareness | None | Yes (awareness protocol) | Yes, ephemeral and **unsigned** |
| Identity / signing / audit | None | None (peer trust) | Ed25519-signed, content-addressed, `verify()` gate |
| Framework binding | React (`react-redux`) and others | Editor bindings; framework-agnostic | React hooks first; framework-agnostic core |
| Persistence | In-memory (add-ons for durable) | Pluggable (IndexedDB, etc.) | localStorage / IndexedDB VFS, compaction-aware |
| Runtime posture | Small core; ecosystem varies | Compact, high-performance | Builds on Epoch Core/WASM; audit-oriented, heavier |

**The claim this matrix supports:** `@epoch/live` is the only column that is
simultaneously a local state container *and* a collaboration engine on *one*
durable, signed history, with rollback as a replicated, audited operation.

## 3. System Overview

`@epoch/live` is layered. Each layer reuses a named existing primitive so the
design is concrete, not aspirational.

| Layer | Responsibility | Reuses |
|---|---|---|
| L0 Signed event log | Append-only Ed25519 events, content-addressed, Lamport + parents DAG | `EpochRepository` / `Event` (`packages/Epoch.Core/src/core.ts`); Ed25519 + sha256 (`packages/Epoch.Core/src/domain.ts`) |
| L1 State model | Reducer-state events (Redux-shaped) and CRDT-entity events (Yjs-shaped), both signed and replayable | `CRDTEventLog` / `EntityRegistry` / merge strategies / `compareEvents` (`packages/Epoch.Core/src/crdt.ts`); `diffStates` / `materializeState` (`packages/Epoch.WASM.React/src/index.ts`) |
| L2 Store API (Redux competitor) | `createLiveStore(...)` → `dispatch` / `getState` / `select` / `subscribe` | `EpochReactStore` / `createEpochReactStore` (`packages/Epoch.WASM.React/src/index.ts`); `BrowserEpoch` / `trackChange` (`packages/Epoch.Integration.Core/src/index.ts`) |
| L3 Rollback and time-travel (hero) | `rewind` preview; durable `rollbackTo`; `undo` / `redo` | `EpochRepository.rollback` (`core.ts:1545`); `rewind` / `materialize` / `history` (`Epoch.WASM.React`) |
| L4 Data propagation (Yjs competitor) | `LiveProvider` seam over `EpochTransport`; BroadcastChannel, WebSocket relay, WebRTC | `EpochTransport` / `MemoryEpochTransport` / `BundleEpochTransport` / `exportToMemoryTransport` / `syncWithTransport` / `gossip` / `syncFrom` (`core.ts:83-121, 1472-1543`) |
| L5 Presence / awareness (ephemeral) | `presence.set` / `presence.subscribe`; distributed over the same providers; **never signed** | new ephemeral channel; ADR-0003 Option 6 constraint |
| L6 Framework and compatibility extensions | `@epoch/live-react` hooks (`useLiveStore`, `useLiveSelector`, `useLiveRollback`, `useLiveHistory`, `usePresence`); `@epoch/live-redux` structural single-store facade + control actions; `@epoch/live-yjs` structural shared-map binding. Core ships none of these | `useEpochState` / `useEpochEntity` / `useEpochHistory` / `useEpochView` (`Epoch.WASM.React`); `EpochProvider` (`Epoch.React`) |
| Persistence | Browser VFS, compaction-aware | `createStorageEpochVfs` (`Epoch.Integration.Core`); `ha/compact.ts` (`createCompact` / `restoreFromCompact` / `pruneEventLogBeforeCompact`) |

**Abstraction layers, top to bottom:** configuration (store + provider options) →
coordination (append, sync handshake, presence topic) → execution (materialize,
merge, rollback) → integration (providers as transports) → observability (history
inspector) → safety (verify-before-trust, unsigned presence, quota compaction).

## 4. Domain Model

`@epoch/live` distinguishes **durable, signed** state from **ephemeral,
unsigned** presence. Durable state is expressed as three event kinds; presence is
never an event.

### 4.1 Reducer-state events (Redux-shaped)

- **Purpose.** Model application state that changes through explicit actions.
- **Shape.** A dispatched action `MUST` be reduced to a deterministic state diff
  and recorded as one or more signed events. Implementations `SHOULD` reuse the
  `map-set` / `map-delete` operation form and `diffStates` projection already in
  `Epoch.WASM.React`.
- **Required fields (per event).** `id` (content hash), `author`, `lamport`,
  `parents`, `payload` (action metadata + operation), `signature`,
  `authorPublicKey`.
- **Identity.** Reducer state is keyed by an `entity` string (the store slice).

### 4.2 CRDT-entity events (Yjs-shaped)

- **Purpose.** Model shared data that must converge without user-visible
  conflicts (text, maps, tables).
- **Shape.** Operations `map-set` / `map-delete` / `text-insert` / `text-delete`
  are captured as Collabs messages inside signed events via `CRDTEventLog`
  (`crdt.ts`). Merge is deterministic under the `compareEvents` total order.
- **Adapters.** Entity semantics come from `EntityRegistry` (JSON map, weave
  text, CSV table today; extensible per ADR-0003 Option 5).

### 4.3 Rollback events

- **Purpose.** Record that history was moved back to a prior target, durably and
  visibly, so the rollback itself propagates and is auditable.
- **Shape.** A signed `rollback` event `{ target, reason, previousHeads }`,
  exactly as `EpochRepository.rollback` produces (`core.ts:1545`). It `MUST NOT`
  destroy prior events; it appends.
- **Semantics.** Materialization after a rollback event `MUST` reflect the
  rolled-back frontier while preserving the full audit trail.

### 4.4 Presence records (ephemeral, unsigned)

- **Purpose.** Cursor position, selection, typing indicators, and user identity
  color for live collaboration UX.
- **Shape.** A plain JSON record per connected client, carried on an ephemeral
  provider topic. It `MUST NOT` be written to the signed event log, `MUST` expire
  on disconnect, and `MUST` be treated as untrusted display data.

## 5. Public Contracts

The following TypeScript signatures are **normative** and are implemented in
`packages/Epoch.Live` (see its `src/index.ts` barrel). The shapes below are the
design intent; the shipped types may add convenience fields.

### 5.1 Store

```ts
export interface LiveStoreOptions<TState extends object, TAction extends LiveAction> {
  readonly namespace: string;              // repository/entity namespace
  readonly author: string;                 // Ed25519 author identity
  readonly entity: string;                 // store slice key
  readonly initialState: TState;
  readonly reducer?: (state: TState, action: TAction) => TState; // optional; default is patch-merge
  readonly entities?: EntityRegistryConfig;    // CRDT entity adapters
  readonly storage?: EpochIntegrationStorage;  // defaults to localStorage VFS
  readonly providers?: readonly LiveProvider[];
}

export interface LiveStore<TState extends object, TAction extends LiveAction> {
  dispatch(action: TAction): LiveCommit<TState>;   // commits a signed event, returns new state + event id
  getState(): TState;
  select<T>(selector: (state: TState) => T): T;
  subscribe(listener: () => void): () => void;
  history(): readonly LiveHistoryEntry[];
  // rollback / time-travel — see 5.2
  rewind(target: LiveTarget): void;                // ephemeral, local preview
  rollbackTo(target: LiveTarget, reason?: string): LiveCommit<TState>; // durable, signed, replicated
  undo(): LiveCommit<TState>;
  redo(): LiveCommit<TState>;
  // presence — see 5.4
  presence: LivePresence;
}
```

### 5.2 Rollback and time-travel

- `LiveTarget = "latest" | number | string` (event count or event id), matching
  `EpochReactMaterializationTarget`.
- `rewind(target)` `MUST` be non-committing and local: it only moves a
  materialization cursor and notifies subscribers.
- `rollbackTo(target, reason)` `MUST` append a signed `rollback` event and
  `MUST` propagate through connected providers so peers converge.
- `undo()` / `redo()` `SHOULD` be sugar over the local author's most recent
  committed operations; they `MAY` be implemented as targeted `rollbackTo`.

### 5.3 Provider (propagation seam)

```ts
export interface LiveProvider {
  readonly id: string;
  connect(repo: LiveSyncEndpoint): Promise<void>;    // begin exchanging events
  disconnect(): void;
  status(): "connecting" | "online" | "offline";
}

export interface LiveSyncEndpoint {
  exportSnapshot(): MemoryEpochTransportSnapshot;      // {events, blobs, heads}
  ingest(snapshot: MemoryEpochTransportSnapshot): SyncResult; // MUST verify() before trust
  onLocalChange(listener: () => void): () => void;
}
```

- A provider `MUST` exchange `MemoryEpochTransportSnapshot` deltas and `MUST NOT`
  be treated as authoritative. `ingest` `MUST` run `verify()` and reject events
  that fail signature, hash, Lamport, or parent checks.
- Built-in providers (all `implementation-defined` in transport specifics):
  `BroadcastChannelProvider` (same-origin tabs), `WebSocketRelayProvider` (dumb
  relay), `WebRTCProvider` (peer mesh).

### 5.4 Presence

```ts
export interface LivePresence {
  set(state: Record<string, unknown>): void;           // ephemeral, unsigned
  subscribe(listener: (peers: readonly PresencePeer[]) => void): () => void;
  local(): PresencePeer;
}
```

### 5.5 Framework and compatibility extensions

The core package `MUST NOT` import any UI framework or any incumbent state or
collaboration library. Interop ships as separate extension packages:

- **`@epoch/live-react`** — `useLiveStore()`, `useLiveSelector(selector)`,
  `useLiveRollback()` (returns rewind / rollbackTo / undo / redo / history
  controls), `useLiveHistory()`, `usePresence()`. Hooks `MUST` use
  `useSyncExternalStore` for tearing-free reads, following the existing
  `useEpochState` pattern. This is the only extension with a framework peer
  dependency.
- **`@epoch/live-redux`** — `toCompatibleStore(store)` wraps a live store in the
  structural single-store contract (`getState()`, `dispatch(action)` returning
  the action, `subscribe(listener)` returning an unsubscribe), so code written
  against that contract — middleware pipelines, devtools bridges, existing
  containers — can drive Epoch Live unchanged. Control action creators
  (`undoAction`, `redoAction`, `rollbackAction`, `rewindAction`) express durable
  history navigation as ordinary dispatched actions. Existing
  `(state, action) => state` reducers pass directly into `createLiveStore`. The
  package imports no third-party state library; compatibility is structural.
- **`@epoch/live-yjs`** — `bindLiveStoreToSharedMap(store, map, options)`
  bidirectionally binds a store entity to any shared-map-shaped CRDT object
  (keyed `get`/`set`/`delete`, `forEach`, `observe`/`unobserve` with events
  carrying changed keys and the transaction origin). Binding-originated
  transactions are origin-stamped to prevent echo loops; remote map changes are
  committed to the signed history as ordinary actions. The package imports no
  third-party CRDT library; a real shared-map instance satisfies the contract
  structurally.

### 5.6 Configuration and events

- Store namespace/author `MUST` map onto an Epoch repository identity.
- Committed event payloads `MUST` be canonical JSON (`canonicalJson`,
  `packages/Epoch.Core/src/json.ts`) so ids are stable across hosts.
- Unknown payload fields on inbound events `MUST` be preserved (forward
  compatibility) and `MUST NOT` change an event id.

## 6. Runtime State and Lifecycle

**Store lifecycle:** `empty → hydrated → active → (rewinding) → active`.
Hydration replays persisted events from the VFS. `rewind` enters a preview
sub-state; any `dispatch` or `rollbackTo` returns to `active` at the live
frontier.

**Connection lifecycle (per provider):** `connecting → online → offline →
connecting`. On `online`, the provider performs the sync handshake (§7). On
`offline`, local `dispatch` continues to append; queued deltas flush on
reconnect.

**Idempotency.** Ingesting the same event twice `MUST` be a no-op (content
addressing guarantees dedupe, as in `syncWithTransport`). Applying the same
`rollback` target on two peers `MUST` converge to the same frontier.

**Restart.** After reload, the store `MUST` reconstruct identical state from the
persisted signed log; in-memory rewind cursors are not persisted.

## 7. Scheduling, Coordination, and Data Flow

- **Local append.** `dispatch` computes a deterministic diff, appends signed
  event(s), persists, and notifies — synchronously from the caller's view.
- **Sync handshake.** On provider `online`: each side calls `exportSnapshot`,
  sends it, and the receiver calls `ingest`, which copies missing events/blobs
  and unions heads (`[...new Set([...heads, ...incoming])].sort()`, mirroring
  `syncWithTransport` / `syncFrom`). Every inbound event passes `verify()` before
  it can affect materialized state.
- **Convergence.** CRDT-entity state is materialized by replaying Collabs
  messages in the `compareEvents` total order (Lamport → author → id), so all
  replicas that have seen the same events produce byte-identical state.
- **Ordering of reducer state.** Reducer-state events form a per-entity sequence;
  concurrent branches are resolved by the same deterministic event order, and
  application code `MAY` model genuinely conflicting fields as CRDT entities
  instead.
- **Control vs data plane.** Signed events are the data plane; presence is a
  separate ephemeral plane that `MUST NOT` block or gate signed convergence.

## 8. Resource and Safety Management

- **Storage.** Events persist to a browser VFS (`createStorageEpochVfs` over
  `localStorage`, or an `implementation-defined` IndexedDB backend for larger
  logs).
- **Quotas.** Long-lived logs `MUST` be compaction-aware. Implementations
  `SHOULD` use `createCompact` / `pruneEventLogBeforeCompact` /
  `restoreFromCompact` (`packages/Epoch.Core/src/ha/compact.ts`) to bound
  browser storage while preserving a verifiable prefix.
- **Cleanup.** Presence records `MUST` be evicted on disconnect and on a
  heartbeat timeout.

## 9. Integration Protocols

Each provider is an adapter that moves `MemoryEpochTransportSnapshot` bytes.

- **BroadcastChannelProvider.** Same-origin, multi-tab. Posts snapshot deltas on
  a named channel; receivers `ingest` and re-verify. Requires no server.
- **WebSocketRelayProvider.** Connects to a **dumb relay** that fans out opaque
  snapshot deltas to subscribers. The relay `MUST NOT` verify, order, or mutate
  content; clients verify. Reconnect `MUST` re-run the handshake.
- **WebRTCProvider.** Peer-to-peer mesh using data channels; an
  `implementation-defined` signaling mechanism establishes connections. Presence
  and snapshot deltas share the connection on separate topics.
- **Error mapping.** Transport errors `MUST` surface as `offline` status, never
  as corrupted state. Malformed or unverifiable payloads `MUST` be dropped and
  counted, not applied.

## 10. AI Context and Prompt Contracts

`@epoch/live` is not an AI-native system, but it is an attractive substrate for
agent-authored UI/state (the repo already tracks generated-UI changes via
`@epoch/gen-ui`). If an implementation exposes agent-driven mutation, it `MUST`
route those mutations through the same signed `dispatch` path so agent actions
are auditable and rollback-able, and it `MUST NOT` grant agents a bypass around
`verify()`.

## 11. Observability and Operator Surfaces

- **History inspector.** `history()` and `useLiveHistory()` `MUST` expose the
  ordered event log with author, lamport, summary, and rollback markers —
  Redux-DevTools-equivalent, but over durable signed history.
- **Sync metrics.** Providers `SHOULD` expose counts of events sent, ingested,
  deduped, and rejected-by-verify.
- **Presence view.** Connected peers and their ephemeral state `SHOULD` be
  inspectable for debugging, clearly labeled as untrusted.

## 12. Failure Model and Recovery

| Failure | Required behavior |
|---|---|
| Offline dispatch | Append locally; queue for next handshake; never lose committed events |
| Partial sync | Idempotent re-ingest; content addressing dedupes; heads reconcile by union |
| Unverifiable inbound event | Drop, count, and continue; `MUST NOT` mutate state |
| Conflicting concurrent rollbacks | Both are signed events; deterministic order yields one converged frontier with full audit trail |
| Storage quota exceeded | Compact prefix and prune; `MUST` keep a verifiable compact |
| Corrupted local store | Rebuild from last valid compact + remaining verifiable events |

## 13. Security and Operational Safety

- **Identity.** Authors are local Ed25519 identities; there is no central account
  authority.
- **Trust boundary.** Bytes from any provider are untrusted until `verify()`
  passes (signatures, content hashes, Lamport monotonicity, parent existence).
- **Presence boundary.** Presence is unsigned and ephemeral; it `MUST NOT` be
  used for authorization or written to history.
- **Relay posture.** A relay is dumb storage/fan-out; compromising a relay
  `MUST NOT` allow forged accepted state, only denial of delivery.
- **Redaction.** Sensitive content handling follows the redaction direction in
  ADR-0003 Option 7; `@epoch/live` `MUST NOT` invent a parallel deletion model.

## 14. Reference Algorithms

Language-agnostic pseudocode for the workflows that make the design reproducible.

**Materialize reducer state**

```text
function materialize(entity, events, cursor):
    selected = events up to cursor (all, first N, or up-to-id)
    state = {}
    for event in selected in event order:
        op = event.payload.operation
        if op.entity != entity: continue
        if op.kind == "map-delete": delete state[op.key]
        else: state[op.key] = op.value
    return state
```

**Dispatch (commit a signed action)**

```text
function dispatch(action):
    next = reducer(currentState, action)      // or patch-merge default
    ops  = diffStates(entity, currentState, next)
    if ops is empty: return currentState
    for op in ops: appendSignedEvent(entity, op, author)   // Ed25519 + content hash
    persist(); notify()
    return materialize(entity, events, "latest")
```

**Rollback as a signed, replicated event**

```text
function rollbackTo(target, reason):
    event = appendSignedEvent(type="rollback",
                              payload={target, reason, previousHeads: heads()})
    persist(); notify()
    for provider in providers: provider.pushLocalDelta()   // peers converge
    return materialize(entity, events, effectiveFrontier(event))
```

**Sync handshake (per provider, on online)**

```text
function handshake(localEndpoint, remote):
    remote.send(localEndpoint.exportSnapshot())        // {events, blobs, heads}
    on remote.snapshot(s):
        for e in s.events:
            if not verify(e): drop(e); continue         // trust gate
            if unknown(e.id): writeEvent(e)
        for (hash, blob) in s.blobs: if unknown(hash): writeBlob(hash, blob)
        heads = sortedUnion(heads, s.heads)
        rematerialize(); notify()
```

**CRDT merge order**

```text
function mergeEntity(entity, events):
    ordered = sort(events, by compareEvents)   // lamport, then author, then id
    runtime = newCollabsRuntime()
    for e in ordered: runtime.applyMessage(e.payload.collabsMessage)
    return runtime.value(entity)
```

**Presence gossip (ephemeral)**

```text
function presenceSet(record):
    local = {clientId, record, ts}
    for provider in providers: provider.publishEphemeral("presence", local)
    // never appended to the signed log; evicted on disconnect/timeout
```

## 15. Test and Validation Matrix

Each row is concrete enough to become a Gherkin scenario under `features/` when
the package is built (persona-tagged per AGENTS.md).

| Profile | Validation |
|---|---|
| Core conformance | A dispatched action commits exactly one signed, verifiable event and updates `getState`. |
| Core conformance | `rewind` previews a prior state locally and does not append an event; reload restores the live frontier. |
| Core conformance | `rollbackTo` appends a signed `rollback` event; a second client that ingests it converges on the same frontier. |
| Core conformance | Two clients editing the same CRDT text entity converge byte-identically after a handshake, with no user-visible conflict. |
| Networked profile | Two tabs sharing a `BroadcastChannelProvider` converge after independent offline edits. |
| Networked profile | An unverifiable event injected by a relay is dropped and counted; state is unchanged. |
| Networked profile | Presence updates propagate and expire on disconnect and never appear in `history()`. |
| DR profile | After exceeding a storage budget, the store compacts, prunes, and still verifies and rematerializes. |
| Migration profile | A Redux slice mapped onto a `LiveStore` reproduces the same `getState` results for a scripted action sequence. |

## 16. Implementation Checklist

Required for a first conformant slice:

- [ ] `createLiveStore` with `dispatch` / `getState` / `select` / `subscribe`
      over signed events (reuse `EpochReactStore` internals).
- [ ] `rewind` preview and durable `rollbackTo` (reuse `EpochRepository.rollback`).
- [ ] CRDT entities via `EntityRegistry` with deterministic merge.
- [ ] `LiveProvider` seam + `BroadcastChannelProvider` (cross-tab) over
      `EpochTransport`; `verify()` on every ingest.
- [ ] Ephemeral, unsigned presence channel.
- [ ] React bindings via `useSyncExternalStore`.
- [ ] Persistence over `createStorageEpochVfs`, compaction-aware.
- [ ] `features/*.feature` coverage for the §15 core rows and coverage floors met.

Recommended extensions:

- [ ] `WebSocketRelayProvider` and `WebRTCProvider` with a dumb-relay reference.
- [ ] `undo` / `redo` sugar and a history-inspector component.
- [ ] Signed reusable conflict resolutions (ADR-0003 Option 3).

## 17. Appendices

### 17.1 Redux migration notes

- Map a Redux slice to one `LiveStore` `entity`; keep the same reducer function
  signature so existing reducers `MAY` be reused verbatim.
- Or migrate incrementally: wrap the live store with `@epoch/live-redux`'s
  `toCompatibleStore` so existing code written against the single-store contract
  keeps working, and adopt the control actions (`undoAction`, `rollbackAction`)
  for durable history navigation.
- Replace `store.subscribe` / `store.getState` with `subscribe` / `getState`; the
  action log becomes durable signed history instead of DevTools memory.
- Time-travel debugging maps to `rewind`; production undo maps to `rollbackTo`.

### 17.2 Yjs migration notes

- Bridge incrementally with `@epoch/live-yjs`'s `bindLiveStoreToSharedMap`: keep
  an existing shared map (and its providers) while Epoch Live mirrors it into
  signed history, then retire the bridge once providers move to `LiveProvider`.
- Map `Y.Map` / `Y.Text` equivalents to CRDT entities via `EntityRegistry`
  adapters.
- Replace CRDT network providers with `LiveProvider` implementations; awareness
  maps to the ephemeral presence channel.
- Gain a signed, verifiable, auditable history in exchange for a heavier,
  audit-oriented runtime.

### 17.3 Glossary

- **Reducer-state event** — a signed event recording an action-derived diff.
- **CRDT-entity event** — a signed event carrying a Collabs message.
- **Rollback event** — a signed `{target, reason, previousHeads}` event.
- **Presence** — ephemeral, unsigned per-client UX state.
- **Provider** — a client-side transport adapter; moves bytes, never authoritative.

### 17.4 Rejected alternatives

- **Wrap Redux/Yjs and sync their state.** Rejected: keeps two models and loses
  a single signed history; this is what the existing `@epoch/redux` /
  `@epoch/xstate` observer adapters already do.
- **Sign presence for a complete audit trail.** Rejected: violates ADR-0003
  Option 6; floods history with ephemeral noise and storage growth.
- **Make the relay authoritative for ordering.** Rejected: violates the
  transport-moves-bytes principle and the local-first trust model.

## Related Documents

- [ADR-0019: Epoch Live Browser State And Propagation](design-decisions/0019-epoch-live-browser-state-and-propagation.md)
- [ADR-0003: Competitive Gap Design Options](design-decisions/0003-competitive-gap-design-options.md) (Options 2 and 6)
- [ADR-0002: CRDT Backend Selection](crdt-backend-decision.md)
- [Specification Template Outline](spec-template-outline.md)
- [Redux competitor dossier](competition/products/redux/profile.md) · [Yjs competitor dossier](competition/products/yjs/profile.md)
