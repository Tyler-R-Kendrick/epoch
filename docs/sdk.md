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

Use `CRDTRegistry.defaults()` for built-in text and JSON merges. Register custom
CRDT definitions for application-specific entity types when three-way merge is
not enough.

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
