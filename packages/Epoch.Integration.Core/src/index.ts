import {
  createEpochLiveRepository,
  createMemoryEpochVfs,
  type EpochLiveRepository,
  type EpochLiveRepositoryEvent,
  type EpochVirtualFileSystem,
} from "@epoch/wasm-react";

export type EpochTrackedSurface = "gen-ui" | "redux" | "xstate" | string;

export interface EpochIntegrationStorage {
  readonly length: number;
  key(index: number): string | null;
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
  removeItem(key: string): void;
}

export interface BrowserEpochOptions {
  readonly namespace: string;
  readonly author: string;
  readonly storage?: EpochIntegrationStorage;
}

export interface TrackChangeInput<TPayload = unknown> {
  readonly entity: string;
  readonly surface: EpochTrackedSurface;
  readonly source: string;
  readonly summary: string;
  readonly payload: TPayload;
  readonly metadata?: Record<string, unknown>;
}

export interface TrackedChange<TPayload = unknown> {
  readonly kind: "tracked-change";
  readonly surface: EpochTrackedSurface;
  readonly source: string;
  readonly revision: number;
  readonly summary: string;
  readonly payload: TPayload;
  readonly metadata?: Record<string, unknown>;
}

export interface TrackedChangeLedgerEntry {
  readonly revision: number;
  readonly eventId: string;
  readonly surface: EpochTrackedSurface;
  readonly source: string;
  readonly summary: string;
  readonly metadata?: Record<string, unknown>;
}

export interface TrackChangeResult<TPayload = unknown> {
  readonly event: EpochLiveRepositoryEvent;
  readonly revision: number;
  readonly change: TrackedChange<TPayload>;
  readonly ledgerEntry: TrackedChangeLedgerEntry;
}

export interface BrowserEpoch {
  readonly namespace: string;
  readonly author: string;
  readonly vfs: EpochVirtualFileSystem;
  readonly repository: EpochLiveRepository;
  trackChange<TPayload>(input: TrackChangeInput<TPayload>): TrackChangeResult<TPayload>;
  readTrackedEntity<TPayload>(entity: string): TrackedChange<TPayload>;
  readOptionalTrackedEntity<TPayload>(entity: string): TrackedChange<TPayload> | undefined;
  versionLedger(entity: string): readonly TrackedChangeLedgerEntry[];
  subscribe(listener: () => void): () => void;
}

export function createBrowserEpoch(options: BrowserEpochOptions): BrowserEpoch {
  const namespace = requireNonEmpty(options.namespace, "namespace");
  const author = requireNonEmpty(options.author, "author");
  const storage = options.storage ?? browserStorage();
  const vfs = storage === undefined
    ? createMemoryEpochVfs()
    : createStorageEpochVfs(storage, `epoch:${namespace}:`);
  const repository = createEpochLiveRepository({ vfs, author });

  function trackChange<TPayload>(input: TrackChangeInput<TPayload>): TrackChangeResult<TPayload> {
    const entity = requireNonEmpty(input.entity, "tracked entity");
    const revision = nextRevision(repository, entity);
    const change: TrackedChange<TPayload> = normalizeJson({
      kind: "tracked-change",
      surface: requireNonEmpty(input.surface, "tracked surface"),
      source: requireNonEmpty(input.source, "tracked source"),
      revision,
      summary: requireNonEmpty(input.summary, "tracked summary"),
      payload: input.payload,
      metadata: input.metadata,
    }) as TrackedChange<TPayload>;
    const event = repository.append(entity, change as unknown as Record<string, unknown>);
    return {
      event,
      revision,
      change,
      ledgerEntry: ledgerEntryFromEvent(event, change),
    };
  }

  function readTrackedEntity<TPayload>(entity: string): TrackedChange<TPayload> {
    const tracked = readOptionalTrackedEntityFromRepository<TPayload>(repository, entity);
    if (tracked === undefined) throw new Error(`Epoch tracked entity '${entity}' has no tracked changes.`);
    return tracked;
  }

  function readOptionalTrackedEntity<TPayload>(entity: string): TrackedChange<TPayload> | undefined {
    return readOptionalTrackedEntityFromRepository(repository, entity);
  }

  function versionLedger(entity: string): readonly TrackedChangeLedgerEntry[] {
    return versionLedgerFromRepository(repository, entity);
  }

  return {
    namespace,
    author,
    vfs,
    repository,
    trackChange,
    readTrackedEntity,
    readOptionalTrackedEntity,
    versionLedger,
    subscribe: repository.subscribe,
  };
}

export function createMemoryEpochIntegrationStorage(initial: Record<string, string> = {}): EpochIntegrationStorage {
  const values = new Map(Object.entries(initial));
  return {
    get length() {
      return values.size;
    },
    key: (index) => [...values.keys()][index] ?? null,
    getItem: (key) => values.get(key) ?? null,
    setItem: (key, value) => {
      values.set(key, value);
    },
    removeItem: (key) => {
      values.delete(key);
    },
  };
}

export function createStorageEpochVfs(storage: EpochIntegrationStorage, prefix: string): EpochVirtualFileSystem {
  return {
    readFile: (path) => storage.getItem(storageKey(prefix, path)) ?? undefined,
    writeFile: (path, content) => {
      storage.setItem(storageKey(prefix, path), content);
    },
    deleteFile: (path) => {
      storage.removeItem(storageKey(prefix, path));
    },
    listFiles: (pathPrefix = "") => {
      const paths: string[] = [];
      for (let index = 0; index < storage.length; index += 1) {
        const key = storage.key(index);
        if (key === null || !key.startsWith(prefix)) continue;
        const path = key.slice(prefix.length);
        if (path.startsWith(pathPrefix)) paths.push(path);
      }
      return paths.sort();
    },
  };
}

export function readOptionalTrackedEntityFromRepository<TPayload>(
  repository: EpochLiveRepository,
  entity: string,
): TrackedChange<TPayload> | undefined {
  const value = repository.entity(entity);
  return isTrackedChange(value) ? value as TrackedChange<TPayload> : undefined;
}

export function versionLedgerFromRepository(
  repository: EpochLiveRepository,
  entity: string,
): readonly TrackedChangeLedgerEntry[] {
  return repository.history()
    .filter((event) => event.entity === entity && isTrackedChange(event.payload))
    .map((event) => ledgerEntryFromEvent(event, event.payload as unknown as TrackedChange));
}

function nextRevision(repository: EpochLiveRepository, entity: string): number {
  const latest = versionLedgerFromRepository(repository, entity).at(-1);
  return latest === undefined ? 1 : latest.revision + 1;
}

function ledgerEntryFromEvent(event: EpochLiveRepositoryEvent, change: TrackedChange): TrackedChangeLedgerEntry {
  return {
    revision: change.revision,
    eventId: event.id,
    surface: change.surface,
    source: change.source,
    summary: change.summary,
    metadata: change.metadata,
  };
}

function browserStorage(): EpochIntegrationStorage | undefined {
  try {
    const candidate = globalThis.localStorage;
    if (candidate === undefined) return undefined;
    return {
      get length() {
        return candidate.length;
      },
      key: (index) => candidate.key(index),
      getItem: (key) => candidate.getItem(key),
      setItem: (key, value) => {
        candidate.setItem(key, value);
      },
      removeItem: (key) => {
        candidate.removeItem(key);
      },
    };
  } catch {
    return undefined;
  }
}

function storageKey(prefix: string, path: string): string {
  return `${prefix}${path}`;
}

function normalizeJson<T>(value: T): T {
  return JSON.parse(JSON.stringify(value)) as T;
}

function requireNonEmpty(value: string, label: string): string {
  if (value.trim().length === 0) throw new Error(`Epoch ${label} is required.`);
  return value;
}

export function stableJson(value: unknown): string {
  if (value === undefined) return "null";
  if (Array.isArray(value)) return `[${value.map((item) => stableJson(item)).join(",")}]`;
  if (isRecord(value)) return `{${Object.keys(value).sort().map((key) => `${JSON.stringify(key)}:${stableJson(value[key])}`).join(",")}}`;
  return JSON.stringify(value);
}

export function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function isTrackedChange(value: unknown): value is TrackedChange {
  return isRecord(value)
    && value.kind === "tracked-change"
    && typeof value.surface === "string"
    && typeof value.source === "string"
    && typeof value.revision === "number"
    && typeof value.summary === "string"
    && "payload" in value;
}
