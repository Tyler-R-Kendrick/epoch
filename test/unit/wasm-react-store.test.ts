import assert from "node:assert/strict";
import { createEpochLiveRepository, createEpochReactStore, createMemoryEpochReactStorage, createMemoryEpochVfs } from "@epoch/wasm-react";

interface CounterState {
  count: number;
  label?: string;
}

export function runWasmReactStoreTests(): void {
  persistsStateChangesAsEpochHistory();
  restoresAndRewindsMaterializedState();
  notifiesSubscribersOnlyForPersistedChanges();
  notifiesSubscribersOnceWhenRewinding();
  materializesDeletedKeysWithoutReintroducingInitialState();
  syncsLiveRepositoriesThroughVfs();
}

function persistsStateChangesAsEpochHistory(): void {
  const storage = createMemoryEpochReactStorage();
  const store = createEpochReactStore<CounterState>({
    entity: "counter",
    initialState: { count: 0 },
    storage,
    storageKey: "epoch:counter",
    author: "alice",
  });

  store.setState((state) => ({ ...state, count: state.count + 1 }));
  store.setState((state) => ({ ...state, count: state.count + 1 }));

  assert.deepEqual(store.getSnapshot().state, { count: 2 });
  assert.equal(JSON.parse(storage.getItem("epoch:counter") ?? "{}").events.length, store.history().length);
}

function restoresAndRewindsMaterializedState(): void {
  const storage = createMemoryEpochReactStorage();
  const store = createEpochReactStore<CounterState>({
    entity: "counter",
    initialState: { count: 0 },
    storage,
    storageKey: "epoch:counter",
    author: "alice",
  });

  store.setState((state) => ({ ...state, count: state.count + 1 }));
  const firstIncrement = store.history().at(-1);
  assert.ok(firstIncrement);
  store.setState((state) => ({ ...state, count: state.count + 1 }));

  store.rewind(firstIncrement.id);

  assert.deepEqual(store.getSnapshot().state, { count: 1 });
  assert.deepEqual(store.materialize("latest"), { count: 2 });

  store.setState({ count: 5 });
  assert.deepEqual(store.getSnapshot().state, { count: 5 });

  const restored = createEpochReactStore<CounterState>({
    entity: "counter",
    initialState: { count: 0 },
    storage,
    storageKey: "epoch:counter",
    author: "alice",
  });
  assert.deepEqual(restored.getSnapshot().state, { count: 5 });
}

function notifiesSubscribersOnlyForPersistedChanges(): void {
  const storage = createMemoryEpochReactStorage();
  const store = createEpochReactStore<CounterState>({
    entity: "counter",
    initialState: { count: 0 },
    storage,
    storageKey: "epoch:counter",
  });
  let notifications = 0;
  const unsubscribe = store.subscribe(() => {
    notifications += 1;
  });

  const noChange = store.setState((state) => state);
  store.setState((state) => ({ ...state, count: state.count + 1 }));
  unsubscribe();
  store.setState((state) => ({ ...state, count: state.count + 1 }));

  assert.equal(noChange.events.length, 0);
  assert.equal(notifications, 1);
}

function notifiesSubscribersOnceWhenRewinding(): void {
  const storage = createMemoryEpochReactStorage();
  const store = createEpochReactStore<CounterState>({
    entity: "counter",
    initialState: { count: 0 },
    storage,
    storageKey: "epoch:counter",
  });
  store.setState((state) => ({ ...state, count: state.count + 1 }));
  const target = store.history().at(-1);
  assert.ok(target);
  store.setState((state) => ({ ...state, count: state.count + 1 }));

  let notifications = 0;
  store.subscribe(() => {
    notifications += 1;
  });
  store.rewind(target.id);

  assert.equal(notifications, 1);
}

function materializesDeletedKeysWithoutReintroducingInitialState(): void {
  const storage = createMemoryEpochReactStorage();
  const store = createEpochReactStore<CounterState>({
    entity: "counter",
    initialState: { count: 0, label: "draft" },
    storage,
    storageKey: "epoch:counter",
  });

  store.setState(({ label: _label, ...state }) => ({ ...state, count: 3 }));

  assert.deepEqual(store.getSnapshot().state, { count: 3 });
  assert.ok(!("label" in store.getSnapshot().state));
}

function syncsLiveRepositoriesThroughVfs(): void {
  const leftVfs = createMemoryEpochVfs();
  const rightVfs = createMemoryEpochVfs();
  const left = createEpochLiveRepository({ vfs: leftVfs, author: "alice" });
  const right = createEpochLiveRepository({ vfs: rightVfs, author: "bob" });

  left.append("left", { count: 1 });
  right.append("right", { count: 2 });

  assert.equal(left.syncFrom(rightVfs), 1);
  assert.equal(right.syncFrom(leftVfs), 1);
  assert.equal(left.history().length, 2);
  assert.deepEqual(right.view().entities.left, { count: 1 });
  assert.deepEqual(right.view().entities.right, { count: 2 });
}
