# Epoch Core SDK Reference

Use the SDK docs when an application needs direct programmatic access to Epoch
repositories, signed events, CRDT state, lifecycle hooks, sync, trusted host
Git compatibility, or browser-safe React state history.

## Package And Imports

- Workspace package: `@epoch/core`
- React package: `@epoch/wasm-react`
- Root package export: `epoch`
- Git compatibility export: `epoch/Epoch.Core.Git`

Primary exports include `EpochRepository`, `EpochActorSystem`, `CRDTRegistry`,
CRDT helpers, lifecycle hook types, backup/compact helpers, seed-node helpers,
and Git compatibility classes.

## Repository Lifecycle

1. Construct `EpochRepository` with a repository root path.
2. Call `init(author?)` to create `.epoch/` metadata and identity files.
3. Record data with `recordFile(path, mimeType)` or create review flow events
   with `intentFile`, `mergeIntent`, `rejectIntent`, and `comment`.
4. Verify integrity with `verify()` before trusting or distributing state.
5. Exchange events and blobs with `sync(peerPath)` or `syncFrom(peerPath)`.

```ts
import { EpochRepository } from "epoch";

const repository = new EpochRepository("./repo");
await repository.init("alice");
await repository.recordFile("README.md", "text/markdown");

const problems = await repository.verify();
```

## Async Actor API

Use the XState-backed actor API when coordinating event-driven applications or
multiple local users. `EpochActorSystem` serializes repository commands, while
per-user actors attach stable authorship and signing identities to writes.

```ts
import { EpochActorSystem } from "epoch";

const repository = new EpochActorSystem("./repo");
await repository.init("alice");

await Promise.all([
  repository.user("alice").recordFile("alice.txt", "text/plain"),
  repository.user("bob").recordFile("bob.txt", "text/plain"),
]);

const problems = await repository.verify();
repository.stop();
```

Stop actor systems when work is complete to release XState resources.

## CRDT Workflow

Use operation-based CRDT events for shared agent state that changes frequently.
Append map/register or sequence-text operations with the actor API, then
materialize state with `materialize(entity)`.

```ts
const alice = repository.user("alice");
const bob = repository.user("bob");

await Promise.all([
  alice.appendCRDTOperation({
    kind: "map-set",
    entity: "tasks",
    key: "alice",
    value: { status: "draft" },
  }),
  bob.appendCRDTOperation({
    kind: "map-set",
    entity: "tasks",
    key: "bob",
    value: { status: "review" },
  }),
]);

const tasks = await repository.materialize("tasks");
```

Use `CRDTRegistry.defaults()` for built-in text, JSON, and row-keyed CSV merges.
Use `EntityRegistry.defaults()` when callers need the richer entity adapter
surface: merge, diff, validation, redaction, and display hooks. Register custom
definitions for application-specific entity types when three-way merge is not
enough.

## Collaboration, Gates, And Operations

Signed collaboration objects are stored in the same event log as repository
history.

```ts
const issue = repository.createIssue("Track gate pipeline", "Use signed gates");
const intent = repository.intentFile("policy.txt", "text/plain");

repository.reviewIntent(intent.id, "approved", "Looks deterministic", "bob");
repository.recordCI("unit", "passed", intent.id, "ci-bot");

const gate = repository.gateStatus(intent.id, {
  requiredReviewState: "approved",
  requiredCi: ["unit"],
});
```

Use `appendOperation(command, status, detail?)` when command history should be
represented in the signed event log rather than in local-only metadata.

## Transports And Serialization

`EpochTransport` is the transport contract. `exportToMemoryTransport()` and
`syncWithTransport()` exchange events, heads, and blobs through an explicit
packet while preserving `verify()` as the trust boundary. `BundleEpochTransport`
persists the same packet as a hash-checked bundle file for offline handoff.

Repositories accept an `EpochSerializationProvider` for event file encoding.
JSON is the default, but callers can substitute another serializer and
extension while event IDs and signatures remain canonical.

```ts
const sourcePacket = source.exportToMemoryTransport();
target.syncWithTransport(sourcePacket);

BundleEpochTransport.write("./sync.bundle", sourcePacket);
target.syncWithTransport(BundleEpochTransport.read("./sync.bundle"));

const toonRepository = new EpochRepository("./repo", {
  serializer: {
    format: "toon",
    extension: ".toon",
    serialize: (value) => `toon\n${JSON.stringify(value)}\n`,
    deserialize: (text) => JSON.parse(text.split("\n").slice(1).join("\n")),
  },
});
```

## Conflict Resolutions And Redactions

Reusable conflict resolutions are signed exact-match events:

```ts
repository.recordConflictResolution({
  path: "config.json",
  entityType: "application/json",
  base: { flag: 0 },
  left: { flag: 1 },
  right: { flag: 2 },
  resolved: { flag: 3 },
});
```

Use `redactBlob(blobHash, reason)` to record that local storage may remove a
sensitive blob while keeping signed audit evidence that a redaction occurred.
Use `planRedaction(blobHash)` first when an operator needs affected event IDs,
local blob presence, and whether a prior redaction exists.

## React Integration

Use `@epoch/wasm-react` when a browser-hosted React app needs local,
append-only state history without assuming native filesystem access.

```ts
import { createEpochReactStore, useEpochState } from "@epoch/wasm-react";

const counterStore = createEpochReactStore({
  entity: "counter",
  initialState: { count: 0 },
  storageKey: "epoch:counter",
  storage: localStorage,
});

function Counter() {
  const [state, setState, epoch] = useEpochState(counterStore);

  return (
    <button onClick={() => setState({ count: state.count + 1 })}>
      {state.count}
    </button>
  );
}

counterStore.rewind(1);
epoch.materialize("latest");
```

For live browser repository state, use the VFS-backed surface:

```ts
import {
  createEpochLiveRepository,
  createMemoryEpochVfs,
  useEpochEntity,
  useEpochHistory,
  useEpochView,
} from "@epoch/wasm-react";

const vfs = createMemoryEpochVfs();
const live = createEpochLiveRepository({ vfs, author: "browser" });

live.append("counter", { count: 1 });
live.append("counter", { count: 2 });

function Counter() {
  const history = useEpochHistory(live);
  const counter = useEpochEntity(live, "counter");
  const view = useEpochView(live);
  return <output>{history.length}:{counter.count}</output>;
}
```

## Hooks

Hooks observe repository lifecycle steps for init, append, record, CRDT
operation/materialization, read, event listing, heads, verify, sync, and gossip
operations.

```ts
import { EpochRepository } from "epoch";

const repository = new EpochRepository("./repo", {
  hooks: [
    (event) => {
      console.log(event.name, event.detail);
    },
  ],
});
```

## Git-Compatible Core Surface

`epoch/Epoch.Core.Git` exposes host-filesystem Git compatibility helpers.
Native Git operations are for trusted host environments and should not be
assumed to work in WASM.

## Related Docs

- [Current Design](design.md)
- [CLI Reference](cli.md)
- [Feature Registry](features.md)
