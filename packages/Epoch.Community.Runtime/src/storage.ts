import type { EpochIntegrationStorage } from "@epoch/integration-core";
type BoundaryValue = null | undefined | boolean | number | string | bigint | symbol | Readonly<object>;


/**
 * Durable browser storage.
 *
 * `localStorage` is synchronous, small, and shared with everything else on the
 * origin — fine for a demo, wrong for a growing object graph. IndexedDB is the
 * right store and is asynchronous, while the repository underneath is
 * synchronous by design.
 *
 * So: read everything once at open, serve reads from memory, and persist writes
 * in the background with a durable queue. A workspace is a bounded set of events
 * that this browser wrote, so the whole set fits in memory comfortably; what
 * does not fit is a reason to compact, not a reason to block a keystroke on a
 * transaction.
 *
 * Two properties are load bearing. Failed writes are *recorded*, not swallowed —
 * `pendingWrites()` and `lastError()` exist so a page can say "your last change
 * is not on disk" instead of quietly losing it. And opening an origin that has
 * a `localStorage` workspace migrates it, because moving to better storage must
 * never mean starting over.
 */
export interface DurableStorageOptions {
  readonly namespace: string;
  readonly databaseName?: string;
  readonly storeName?: string;
  readonly schemaVersion?: number;
  /** Injected for tests and for hosts that provide their own factory. */
  readonly indexedDB?: IDBFactory;
  /** A synchronous store to migrate from, if it holds this namespace. */
  readonly migrateFrom?: EpochIntegrationStorage;
}

export interface DurableStorage extends EpochIntegrationStorage {
  readonly kind: "indexeddb" | "memory";
  readonly schemaVersion: number;
  /** Entries that have not reached disk yet. */
  pendingWrites(): number;
  /** The last persistence failure, if there was one. */
  lastError(): string | undefined;
  /** Resolves once every queued write has settled. */
  flush(): Promise<void>;
  /** Everything in this namespace, for export or handoff to the CLI. */
  snapshot(): Readonly<Record<string, string>>;
  /** Replace this namespace's contents; used by import. */
  restore(entries: Readonly<Record<string, string>>): Promise<void>;
  /** How many entries were carried over from a previous store. */
  readonly migrated: number;
  close(): void;
}

const DEFAULT_DATABASE = "epoch-community";
const DEFAULT_STORE = "workspace";
const SCHEMA_VERSION = 1;

export async function openDurableStorage(options: DurableStorageOptions): Promise<DurableStorage> {
  const schemaVersion = options.schemaVersion ?? SCHEMA_VERSION;
  const prefix = `${options.namespace}:`;
  const factory = options.indexedDB ?? globalThis.indexedDB;
  const values = new Map<string, string>();

  let database: IDBDatabase | undefined;
  let pending = 0;
  let failure: string | undefined;
  let settled: Promise<void> = Promise.resolve();

  if (factory !== undefined) {
    try {
      database = await openDatabase(factory, options.databaseName ?? DEFAULT_DATABASE,
        options.storeName ?? DEFAULT_STORE, schemaVersion);
      for (const [key, value] of await readAll(database, options.storeName ?? DEFAULT_STORE)) {
        if (key.startsWith(prefix)) values.set(key, value);
      }
    } catch (error) {
      // SAFETY: Storage open failures are normalized to human-readable messages at this boundary.
      failure = message(error as BoundaryValue);
      database = undefined;
    }
  }

  // Moving to better storage must never mean starting over.
  let migrated = 0;
  if (values.size === 0 && options.migrateFrom !== undefined) {
    for (let index = 0; index < options.migrateFrom.length; index += 1) {
      const key = options.migrateFrom.key(index);
      if (key === null || !key.startsWith(prefix)) continue;
      const value = options.migrateFrom.getItem(key);
      if (value === null) continue;
      values.set(key, value);
      migrated += 1;
    }
    for (const [key, value] of values) queue(key, value);
  }

  function queue(key: string, value: string | null): void {
    if (database === undefined) return;
    pending += 1;
    // SAFETY: The module validates or constructs this value before applying the asserted contract.
    settled = settled.then(() => write(database as IDBDatabase, options.storeName ?? DEFAULT_STORE, key, value))
      .then(() => { pending -= 1; }, (error) => {
        pending -= 1;
        // SAFETY: IndexedDB write failures are normalized at this storage boundary.
        failure = message(error as BoundaryValue);
      });
  }

  return {
    kind: database === undefined ? "memory" : "indexeddb",
    schemaVersion,
    migrated,
    get length() {
      return values.size;
    },
    key: (index) => [...values.keys()][index] ?? null,
    getItem: (key) => values.get(key) ?? null,
    setItem: (key, value) => {
      values.set(key, value);
      queue(key, value);
    },
    removeItem: (key) => {
      values.delete(key);
      queue(key, null);
    },
    pendingWrites: () => pending,
    lastError: () => failure,
    flush: async () => {
      await settled;
    },
    snapshot: () => Object.fromEntries(values),
    restore: async (entries) => {
      for (const key of [...values.keys()]) {
        values.delete(key);
        queue(key, null);
      }
      for (const [key, value] of Object.entries(entries)) {
        values.set(key, value);
        queue(key, value);
      }
      await settled;
    },
    close: () => {
      database?.close();
      database = undefined;
    },
  };
}

function openDatabase(
  factory: IDBFactory,
  databaseName: string,
  storeName: string,
  version: number,
): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = factory.open(databaseName, version);
    request.onupgradeneeded = () => {
      const database = request.result;
      if (!database.objectStoreNames.contains(storeName)) database.createObjectStore(storeName);
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error ?? new Error("IndexedDB refused to open"));
    request.onblocked = () => reject(new Error("IndexedDB open is blocked by another tab"));
  });
}

function readAll(database: IDBDatabase, storeName: string): Promise<readonly (readonly [string, string])[]> {
  return new Promise((resolve, reject) => {
    const transaction = database.transaction(storeName, "readonly");
    const store = transaction.objectStore(storeName);
    const keys = store.getAllKeys();
    const values = store.getAll();
    transaction.oncomplete = () => {
      const pairs = keys.result.map((key, index) => [String(key), String(values.result[index])] as const);
      resolve(pairs);
    };
    transaction.onerror = () => reject(transaction.error ?? new Error("IndexedDB read failed"));
  });
}

function write(database: IDBDatabase, storeName: string, key: string, value: string | null): Promise<void> {
  return new Promise((resolve, reject) => {
    const transaction = database.transaction(storeName, "readwrite");
    const store = transaction.objectStore(storeName);
    if (value === null) store.delete(key);
    else store.put(value, key);
    transaction.oncomplete = () => resolve();
    transaction.onerror = () => reject(transaction.error ?? new Error("IndexedDB write failed"));
    transaction.onabort = () => reject(transaction.error ?? new Error("IndexedDB write aborted"));
  });
}

function message(error: BoundaryValue): string {
  return error instanceof Error ? error.message : String(error);
}
