import { isFunction, isUndefined } from "../value-kind";
import { CommunityError } from "@epoch/community-core";

export type SqliteStorageMode = "memory" | "opfs" | "opfs-wl" | "opfs-sahpool";

export interface SqliteStorageCapabilities {
  readonly opfs: boolean;
  readonly crossOriginIsolated: boolean;
  readonly sharedArrayBuffer: boolean;
}

export interface SqliteStorageSelection {
  readonly mode: SqliteStorageMode;
  readonly persistent: boolean;
  readonly reason?: string;
}

export interface ExclusiveLockManager {
  acquire(name: string): Promise<undefined | (() => void)>;
}

export interface WriterLease {
  readonly release: () => Promise<void>;
}

export interface PersistenceChannel {
  postMessage(message: {
    readonly type: "writer-acquired" | "writer-released";
    readonly lockName: string;
  }): void;
  close(): void;
}

export function chooseSqliteStorage(
  capabilities: SqliteStorageCapabilities,
  policy: { readonly requirePersistence?: boolean } = {},
): SqliteStorageSelection {
  if (!capabilities.opfs) {
    if (policy.requirePersistence === true) {
      throw new CommunityError("QUERY_UNSUPPORTED_SOURCE", "Persistent SQLite search requires OPFS");
    }
    return Object.freeze({ mode: "memory", persistent: false, reason: "OPFS is unavailable" });
  }
  if (capabilities.crossOriginIsolated && capabilities.sharedArrayBuffer) {
    return Object.freeze({ mode: "opfs-wl", persistent: true });
  }
  return Object.freeze({ mode: "opfs-sahpool", persistent: true });
}

export function detectSqliteStorageCapabilities(scope: {
  readonly navigator?: { readonly storage?: { readonly getDirectory?: () => Promise<FileSystemDirectoryHandle> } };
  readonly crossOriginIsolated?: boolean;
  readonly SharedArrayBuffer?: SharedArrayBufferConstructor;
} = globalThis): SqliteStorageCapabilities {
  return Object.freeze({
    opfs: isFunction(scope.navigator?.storage?.getDirectory),
    crossOriginIsolated: scope.crossOriginIsolated === true,
    sharedArrayBuffer: isFunction(scope.SharedArrayBuffer),
  });
}

export function mapSqlitePersistenceError<ErrorValue>(error: ErrorValue): CommunityError {
  if (error instanceof CommunityError) return error;
  const name = error instanceof DOMException ? error.name : "";
  if (name === "QuotaExceededError") {
    return new CommunityError("INDEX_QUOTA", "The browser search index exceeded its storage quota", undefined, { cause: error });
  }
  if (name === "InvalidStateError" || name === "NoModificationAllowedError") {
    return new CommunityError("INDEX_LOCKED", "The browser search index is locked by another tab", undefined, { cause: error });
  }
  return new CommunityError("INDEX_STALE", "The browser search index is stale and must be rebuilt", undefined, { cause: error });
}

export class BrowserPersistenceCoordinator {
  readonly #lockManager: ExclusiveLockManager;
  readonly #lockName: string;
  readonly #channel?: PersistenceChannel;
  #lease?: () => void;

  constructor(options: {
    readonly lockManager?: ExclusiveLockManager;
    readonly lockName?: string;
    readonly channel?: PersistenceChannel;
  } = {}) {
    this.#lockManager = options.lockManager ?? createWebLockManager();
    this.#lockName = options.lockName ?? "epoch-community-sqlite-writer";
    this.#channel = options.channel;
  }

  async acquireWriter(): Promise<WriterLease> {
    if (this.#lease !== undefined) throw new CommunityError("INDEX_LOCKED", "This tab already owns the search-index writer lease");
    const release = await this.#lockManager.acquire(this.#lockName);
    if (release === undefined) throw new CommunityError("INDEX_LOCKED", "Another tab owns the search-index writer lease");
    this.#lease = release;
    this.#channel?.postMessage({ type: "writer-acquired", lockName: this.#lockName });
    let active = true;
    return Object.freeze({
      release: async () => {
        if (!active) return;
        active = false;
        this.#lease?.();
        this.#lease = undefined;
        this.#channel?.postMessage({ type: "writer-released", lockName: this.#lockName });
      },
    });
  }

  close(): void {
    this.#lease?.();
    this.#lease = undefined;
    this.#channel?.close();
  }
}

function createWebLockManager(): ExclusiveLockManager {
  const locks = isUndefined(navigator) ? undefined : navigator.locks;
  return {
    async acquire(name: string): Promise<undefined | (() => void)> {
      if (locks === undefined) return inProcessLocks.acquire(name);
      let acquired!: (value: boolean) => void;
      const ready = new Promise<boolean>((resolve) => { acquired = resolve; });
      let unlock!: () => void;
      const held = new Promise<void>((resolve) => { unlock = resolve; });
      void locks.request(name, { ifAvailable: true, mode: "exclusive" }, async (lock) => {
        acquired(lock !== null);
        if (lock !== null) await held;
      });
      return await ready ? unlock : undefined;
    },
  };
}

const heldInProcess = new Set<string>();
const inProcessLocks: ExclusiveLockManager = {
  async acquire(name) {
    if (heldInProcess.has(name)) return undefined;
    heldInProcess.add(name);
    return () => { heldInProcess.delete(name); };
  },
};
