import assert from "node:assert/strict";
import { createLiveStore, type LiveStore } from "@epoch/live";
import {
  bindLiveStoreToSharedMap,
  type SharedMapBindingOptions,
  type SharedMapEventLike,
  type SharedMapLike,
} from "@epoch/live-yjs";

type SharedValue = ReturnType<SharedMapLike["get"]>;
type SharedOrigin = SharedMapEventLike["transaction"]["origin"];

interface DocState {
  readonly title?: string;
  readonly count?: number;
  readonly [key: string]: SharedValue;
}

interface LiveYjsHarness {
  readonly store: LiveStore<DocState>;
  readonly map: FakeSharedMap;
  readonly unbind: () => void;
}

export function runEpochLiveYjsTests(): void {
  storeCommitsMirrorIntoTheSharedMap();
  remoteMapChangesLandInSignedHistory();
  bindingOriginPreventsEchoLoops();
  replicatedRollbackReachesTheSharedMap();
  mapWinsInitialSyncSeedsTheStore();
  unbindStopsBothDirections();
}

function harness(initialState: DocState = {}): LiveYjsHarness {
  const store = createLiveStore<DocState>({ entity: "doc", author: "alice", initialState });
  const map = new FakeSharedMap();
  const unbind = bindLiveStoreToSharedMap(store, map, { transact: map.transact });
  return { store, map, unbind };
}

function storeCommitsMirrorIntoTheSharedMap(): void {
  const { store, map } = harness({ count: 0 });
  assert.equal(map.get("count"), 0, "bind seeds the map from store state");

  store.dispatch({ type: "set", payload: { title: "hello", count: 1 } });
  assert.equal(map.get("title"), "hello");
  assert.equal(map.get("count"), 1);

  store.dispatch({ type: "clear", payload: { title: undefined } });
  assert.equal(map.get("title"), undefined, "store deletes propagate as map deletes");
}

function remoteMapChangesLandInSignedHistory(): void {
  const { store, map } = harness();
  const before = store.log().all().length;

  map.remoteSet("title", "from-map");
  assert.equal(store.getState().title, "from-map", "remote map change dispatches into the store");
  assert.ok(store.log().all().length > before, "remote change is committed as a signed event");
  assert.equal(store.log().verify().length, 0);

  map.remoteDelete("title");
  assert.ok(!("title" in store.getState()), "remote map delete removes the key from state");
}

function bindingOriginPreventsEchoLoops(): void {
  const { store, map } = harness({ count: 0 });
  map.resetWriteCounts();

  store.dispatch({ type: "set", payload: { count: 1 } });
  const writesAfterLocal = map.writeCount;
  assert.ok(writesAfterLocal >= 1);

  map.remoteSet("count", 2);
  assert.equal(store.getState().count, 2);
  // The remote apply reconciles via equality checks, so no redundant writes.
  assert.equal(map.writeCount, writesAfterLocal + 1, "no echo writes beyond the remote set itself");
}

function replicatedRollbackReachesTheSharedMap(): void {
  const { store, map } = harness();
  store.dispatch({ type: "set", payload: { title: "one" } });
  const first = store.history().at(-1);
  assert.ok(first);
  store.dispatch({ type: "set", payload: { title: "two" } });
  assert.equal(map.get("title"), "two");

  store.rollbackTo(first.id, "revert");
  assert.equal(map.get("title"), "one", "a durable rollback commit is mirrored into the shared map");
}

function mapWinsInitialSyncSeedsTheStore(): void {
  const store = createLiveStore<DocState>({ entity: "doc", author: "alice", initialState: { count: 0 } });
  const map = new FakeSharedMap();
  map.remoteSet("title", "pre-existing");
  bindLiveStoreToSharedMap(store, map, { transact: map.transact, initialSync: "map-wins" });

  assert.equal(store.getState().title, "pre-existing", "map contents seed the store under map-wins");
  assert.equal(map.get("count"), 0, "store-only keys still merge into the map");
}

function unbindStopsBothDirections(): void {
  const { store, map, unbind } = harness();
  unbind();

  store.dispatch({ type: "set", payload: { title: "after-unbind" } });
  assert.equal(map.get("title"), undefined, "store changes stop flowing after unbind");

  map.remoteSet("count", 9);
  assert.ok(!("count" in store.getState()), "map changes stop flowing after unbind");
}

/** Test double satisfying the structural shared-map contract. */
class FakeSharedMap implements SharedMapLike {
  writeCount = 0;
  private readonly values = new Map<string, SharedValue>();
  private readonly observers = new Set<(event: SharedMapEventLike) => void>();
  private currentOrigin: SharedOrigin = "remote";

  readonly transact: NonNullable<SharedMapBindingOptions["transact"]> = (changes, origin): void => {
    const previous = this.currentOrigin;
    this.currentOrigin = origin;
    try {
      changes();
    } finally {
      this.currentOrigin = previous;
    }
  };

  get(key: string): SharedValue {
    return this.values.get(key);
  }

  set(key: string, value: SharedValue): void {
    this.values.set(key, value);
    this.writeCount += 1;
    this.emit([key]);
  }

  delete(key: string): void {
    if (!this.values.delete(key)) return;
    this.writeCount += 1;
    this.emit([key]);
  }

  forEach(callback: Parameters<SharedMapLike["forEach"]>[0]): void {
    for (const [key, value] of this.values) callback(value, key);
  }

  observe(callback: (event: SharedMapEventLike) => void): void {
    this.observers.add(callback);
  }

  unobserve(callback: (event: SharedMapEventLike) => void): void {
    this.observers.delete(callback);
  }

  remoteSet(key: string, value: SharedValue): void {
    this.set(key, value);
  }

  remoteDelete(key: string): void {
    this.delete(key);
  }

  resetWriteCounts(): void {
    this.writeCount = 0;
  }

  private emit(keys: readonly string[]): void {
    const event: SharedMapEventLike = { keysChanged: keys, transaction: { origin: this.currentOrigin } };
    for (const observer of [...this.observers]) observer(event);
  }
}
