import { stableJson, type LiveStore } from "@epoch/live";
type BoundaryValue = null | undefined | boolean | number | string | bigint | symbol | Readonly<object>;
type DictionaryValue = null | undefined | boolean | number | string | bigint | readonly DictionaryValue[] | { readonly [key: string]: DictionaryValue };


/**
 * Structural contract for a shared CRDT map. This package imports no
 * third-party CRDT library — the shapes below match the observable surface of a
 * shared map document type (keyed get/set/delete, deep-equal-observable events
 * carrying the changed keys and the mutating transaction's origin), so a real
 * shared-map instance satisfies them structurally and test doubles can stand in
 * for one.
 */
export interface SharedMapEventLike {
  readonly keysChanged: Iterable<string>;
  readonly transaction: { readonly origin: unknown };
}

export interface SharedMapLike {
  get(key: string): BoundaryValue;
  set(key: string, value: BoundaryValue): void;
  delete(key: string): void;
  forEach(callback: (value: BoundaryValue, key: string) => void): void;
  observe(callback: (event: SharedMapEventLike) => void): void;
  unobserve(callback: (event: SharedMapEventLike) => void): void;
}

export interface SharedMapBindingOptions {
  /** Document-level transaction wrapper (a `doc.transact`-shaped function). */
  readonly transact?: (changes: () => void, origin: BoundaryValue) => void;
  /** Action type used when applying remote map changes to the store. */
  readonly actionType?: string;
  /** Origin token stamped on binding-originated transactions. */
  readonly origin?: unknown;
  /** Who wins at bind time when store state and map contents differ. */
  readonly initialSync?: "store-wins" | "map-wins";
}

/**
 * Bidirectionally bind a live store entity to a shared CRDT map. Store commits
 * (including replicated rollbacks) are mirrored into the map inside a single
 * origin-stamped transaction; remote map changes are dispatched into the store
 * as ordinary actions, so they land in the signed history like any other edit.
 * Returns an unbind function.
 */
export function bindLiveStoreToSharedMap<TState extends object>(
  store: LiveStore<TState>,
  map: SharedMapLike,
  options: SharedMapBindingOptions = {},
): () => void {
  const origin = options.origin ?? { binding: "@epoch/live-yjs" };
  const transact = options.transact ?? ((changes: () => void) => changes());
  const actionType = options.actionType ?? "@epoch/live/shared-map-apply";
  let applyingRemote = false;

  function pushStoreToMap(): void {
    // SAFETY: The module validates or constructs this value before applying the asserted contract.
    const state = store.getState() as Record<string, DictionaryValue>;
    transact(() => {
      const stale: string[] = [];
      map.forEach((_value, key) => {
        if (!(key in state)) stale.push(key);
      });
      for (const key of stale) map.delete(key);
      for (const [key, value] of Object.entries(state)) {
        if (stableJson(map.get(key)) !== stableJson(value)) map.set(key, value);
      }
    }, origin);
  }

  function pullMapIntoStore(keys: Iterable<string>): void {
    const payload: Record<string, DictionaryValue> = {};
    let changed = false;
    for (const key of keys) {
      payload[key] = map.get(key);
      changed = true;
    }
    if (!changed) return;
    applyingRemote = true;
    try {
      store.dispatch({ type: actionType, payload });
    } finally {
      applyingRemote = false;
    }
    // Reconcile: if a custom reducer transformed the remote change, mirror the
    // actual store state back; with the default patch reducer this is a no-op.
    pushStoreToMap();
  }

  const onMapEvent = (event: SharedMapEventLike): void => {
    if (event.transaction.origin === origin) return;
    pullMapIntoStore(event.keysChanged);
  };

  const offStore = store.subscribe(() => {
    if (!applyingRemote) pushStoreToMap();
  });
  map.observe(onMapEvent);

  if (options.initialSync === "map-wins") {
    const keys: string[] = [];
    map.forEach((_value, key) => keys.push(key));
    pullMapIntoStore(keys);
  }
  pushStoreToMap();

  return () => {
    offStore();
    map.unobserve(onMapEvent);
  };
}
