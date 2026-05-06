import { useCallback, useMemo, useSyncExternalStore } from "react";

export interface EpochReactStorage {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
  removeItem?(key: string): void;
}

export interface EpochReactEvent {
  readonly id: string;
  readonly type: "crdt";
  readonly author: string;
  readonly lamport: number;
  readonly payload: Record<string, unknown>;
}

export type EpochReactOperation =
  | { readonly kind: "map-set"; readonly entity: string; readonly key: string; readonly value: unknown }
  | { readonly kind: "map-delete"; readonly entity: string; readonly key: string };

export type EpochReactMaterializationTarget = "latest" | number | string;
export type EpochReactStateUpdater<TState extends object> = TState | ((state: TState) => TState);

export interface EpochReactStoreOptions<TState extends object> {
  readonly entity: string;
  readonly initialState: TState;
  readonly author?: string;
  readonly storage?: EpochReactStorage;
  readonly storageKey?: string;
  readonly replicaId?: string;
}

export interface EpochReactSnapshot<TState extends object> {
  readonly state: TState;
  readonly events: readonly EpochReactEvent[];
  readonly cursor: EpochReactMaterializationTarget;
  readonly currentEventId?: string;
}

export interface EpochReactChange<TState extends object> {
  readonly state: TState;
  readonly events: readonly EpochReactEvent[];
}

export interface EpochReactControls<TState extends object> {
  readonly snapshot: EpochReactSnapshot<TState>;
  rewind(target: EpochReactMaterializationTarget): void;
  materialize(target?: EpochReactMaterializationTarget): TState;
  history(): readonly EpochReactEvent[];
}

export interface EpochReactStore<TState extends object> extends EpochReactControls<TState> {
  getSnapshot(): EpochReactSnapshot<TState>;
  subscribe(listener: () => void): () => void;
  setState(update: EpochReactStateUpdater<TState>): EpochReactChange<TState>;
}

export interface EpochVirtualFileSystem {
  readFile(path: string): string | undefined;
  writeFile(path: string, content: string): void;
  deleteFile(path: string): void;
  listFiles(prefix?: string): readonly string[];
}

export interface EpochLiveRepositoryEvent {
  readonly id: string;
  readonly type: "entity";
  readonly entity: string;
  readonly author: string;
  readonly lamport: number;
  readonly payload: Record<string, unknown>;
}

export interface EpochLiveRepositoryOptions {
  readonly vfs: EpochVirtualFileSystem;
  readonly author?: string;
  readonly root?: string;
}

export interface EpochLiveRepository {
  append(entity: string, value: Record<string, unknown>): EpochLiveRepositoryEvent;
  entity(entity: string): Record<string, unknown>;
  history(): readonly EpochLiveRepositoryEvent[];
  view(): { readonly events: readonly EpochLiveRepositoryEvent[]; readonly entities: Readonly<Record<string, Record<string, unknown>>> };
  subscribe(listener: () => void): () => void;
  syncFrom(peer: EpochVirtualFileSystem): number;
}

interface PersistedEpochReactState {
  readonly version: 1;
  readonly entity: string;
  readonly events: readonly EpochReactEvent[];
}

export function createMemoryEpochReactStorage(initial: Record<string, string> = {}): EpochReactStorage {
  const values = new Map(Object.entries(initial));
  return {
    getItem: (key) => values.get(key) ?? null,
    setItem: (key, value) => {
      values.set(key, value);
    },
    removeItem: (key) => {
      values.delete(key);
    },
  };
}

export function createMemoryEpochVfs(initial: Record<string, string> = {}): EpochVirtualFileSystem {
  const files = new Map(Object.entries(initial));
  return {
    readFile: (path) => files.get(path),
    writeFile: (path, content) => {
      files.set(path, content);
    },
    deleteFile: (path) => {
      files.delete(path);
    },
    listFiles: (prefix = "") => [...files.keys()].filter((path) => path.startsWith(prefix)).sort(),
  };
}

export function createEpochReactStore<TState extends object>(options: EpochReactStoreOptions<TState>): EpochReactStore<TState> {
  const entity = requireNonEmpty(options.entity, "entity");
  const author = options.author ?? "react";
  const storage = options.storage ?? browserStorage() ?? createMemoryEpochReactStorage();
  const storageKey = options.storageKey;
  const replicaId = options.replicaId ?? stableId(author);
  const listeners = new Set<() => void>();
  const initialState = normalizeState(options.initialState);
  let events = storageKey === undefined ? [] : loadPersisted(storage, storageKey, entity);
  let cursor: EpochReactMaterializationTarget = "latest";
  let snapshot: EpochReactSnapshot<TState>;

  if (events.length === 0) {
    events = appendOperations([], operationsForState(entity, asRecord(initialState)), author, replicaId);
    persist();
  }
  snapshot = computeSnapshot();

  function getSnapshot(): EpochReactSnapshot<TState> {
    return snapshot;
  }

  function subscribe(listener: () => void): () => void {
    listeners.add(listener);
    return () => {
      listeners.delete(listener);
    };
  }

  function setState(update: EpochReactStateUpdater<TState>): EpochReactChange<TState> {
    const nextState = normalizeState(typeof update === "function" ? update(snapshot.state) : update);
    const operations = diffStates(entity, asRecord(snapshot.state), asRecord(nextState));
    if (operations.length === 0) return { state: snapshot.state, events: [] };

    const appended = appendOperations(events, operations, author, replicaId);
    events = appended;
    const changeEvents = appended.slice(-operations.length);
    cursor = "latest";
    persist();
    refresh();
    return { state: snapshot.state, events: changeEvents };
  }

  function rewind(target: EpochReactMaterializationTarget): void {
    cursor = normalizeTarget(target, events);
    refresh();
  }

  function materialize(target: EpochReactMaterializationTarget = cursor): TState {
    return materializeState<TState>(entity, eventsForTarget(events, normalizeTarget(target, events)));
  }

  function history(): readonly EpochReactEvent[] {
    return events;
  }

  function refresh(): void {
    const next = computeSnapshot();
    const changed = next.cursor !== snapshot.cursor || stableJson(next.state) !== stableJson(snapshot.state) || next.events.length !== snapshot.events.length;
    snapshot = next;
    if (changed) notify();
  }

  function computeSnapshot(): EpochReactSnapshot<TState> {
    const selectedEvents = eventsForTarget(events, cursor);
    return {
      state: materializeState<TState>(entity, selectedEvents),
      events,
      cursor,
      currentEventId: selectedEvents.at(-1)?.id,
    };
  }

  function persist(): void {
    if (storageKey === undefined) return;
    storage.setItem(storageKey, JSON.stringify({ version: 1, entity, events } satisfies PersistedEpochReactState));
  }

  function notify(): void {
    for (const listener of listeners) listener();
  }

  return {
    getSnapshot,
    subscribe,
    setState,
    rewind,
    materialize,
    history,
    get snapshot() {
      return snapshot;
    },
  };
}

export function useEpochState<TState extends object>(
  store: EpochReactStore<TState>,
): readonly [TState, (update: EpochReactStateUpdater<TState>) => EpochReactChange<TState>, EpochReactControls<TState>] {
  const snapshot = useSyncExternalStore(store.subscribe, store.getSnapshot, store.getSnapshot);
  const setState = useCallback((update: EpochReactStateUpdater<TState>) => store.setState(update), [store]);
  const controls = useMemo<EpochReactControls<TState>>(() => ({
    snapshot,
    rewind: store.rewind,
    materialize: store.materialize,
    history: store.history,
  }), [snapshot, store]);

  return [snapshot.state, setState, controls] as const;
}

export function createEpochLiveRepository(options: EpochLiveRepositoryOptions): EpochLiveRepository {
  const vfs = options.vfs;
  const author = options.author ?? "browser";
  const root = normalizeVfsRoot(options.root ?? "/.epoch-live");
  const listeners = new Set<() => void>();
  let historySnapshot = loadHistory();
  let entitySnapshots = materializeLiveEntities(historySnapshot);

  function append(entity: string, value: Record<string, unknown>): EpochLiveRepositoryEvent {
    const cleanEntity = requireNonEmpty(entity, "live entity");
    const payload = normalizeState(value);
    const lamport = history().length + 1;
    const event: EpochLiveRepositoryEvent = {
      id: `epoch-live-${lamport}-${hashString(stableJson({ author, cleanEntity, payload, lamport }))}`,
      type: "entity",
      entity: cleanEntity,
      author,
      lamport,
      payload,
    };
    vfs.writeFile(eventPath(root, event.id), JSON.stringify(event));
    refresh();
    notify();
    return event;
  }

  function entity(name: string): Record<string, unknown> {
    return entitySnapshots.get(name) ?? emptyLiveEntity;
  }

  function history(): readonly EpochLiveRepositoryEvent[] {
    return historySnapshot;
  }

  function view(): { readonly events: readonly EpochLiveRepositoryEvent[]; readonly entities: Readonly<Record<string, Record<string, unknown>>> } {
    return {
      events: historySnapshot,
      entities: Object.fromEntries(entitySnapshots.entries()),
    };
  }

  function loadHistory(): readonly EpochLiveRepositoryEvent[] {
    return vfs.listFiles(eventsRoot(root))
      .map((path) => parseLiveEvent(vfs.readFile(path)))
      .filter((event): event is EpochLiveRepositoryEvent => event !== undefined)
      .sort((left, right) => left.lamport - right.lamport || left.id.localeCompare(right.id));
  }

  function subscribe(listener: () => void): () => void {
    listeners.add(listener);
    return () => {
      listeners.delete(listener);
    };
  }

  function syncFrom(peer: EpochVirtualFileSystem): number {
    let copied = 0;
    for (const path of peer.listFiles(eventsRoot(root))) {
      if (vfs.readFile(path) !== undefined) continue;
      const content = peer.readFile(path);
      if (content === undefined) continue;
      vfs.writeFile(path, content);
      copied += 1;
    }
    if (copied > 0) {
      refresh();
      notify();
    }
    return copied;
  }

  function refresh(): void {
    historySnapshot = loadHistory();
    entitySnapshots = materializeLiveEntities(historySnapshot);
  }

  function notify(): void {
    for (const listener of listeners) listener();
  }

  return { append, entity, history, view, subscribe, syncFrom };
}

export function useEpochHistory(repository: EpochLiveRepository): readonly EpochLiveRepositoryEvent[] {
  return useSyncExternalStore(repository.subscribe, repository.history, repository.history);
}

export function useEpochEntity(repository: EpochLiveRepository, entity: string): Record<string, unknown> {
  return useSyncExternalStore(repository.subscribe, () => repository.entity(entity), () => repository.entity(entity));
}

export function useEpochView(repository: EpochLiveRepository): { readonly events: readonly EpochLiveRepositoryEvent[]; readonly entities: Readonly<Record<string, Record<string, unknown>>> } {
  return useSyncExternalStore(repository.subscribe, repository.view, repository.view);
}

function appendOperations(
  existing: readonly EpochReactEvent[],
  operations: readonly EpochReactOperation[],
  author: string,
  replicaId: string,
): EpochReactEvent[] {
  const next = [...existing];
  for (const operation of operations) {
    const lamport = next.length + 1;
    const payload = {
      backend: "epoch-react",
      entity: operation.entity,
      operation,
      replica_id: hashString(stableJson({ replicaId, lamport, operation })).padStart(8, "0").slice(0, 32),
    };
    next.push({
      id: `epoch-react-${lamport}-${hashString(stableJson(payload))}`,
      type: "crdt",
      author,
      lamport,
      payload,
    });
  }
  return next;
}

function operationsForState(entity: string, state: Record<string, unknown>): EpochReactOperation[] {
  return Object.entries(state)
    .filter(([, value]) => value !== undefined)
    .map(([key, value]) => ({ kind: "map-set", entity, key, value }));
}

function diffStates(entity: string, previous: Record<string, unknown>, next: Record<string, unknown>): EpochReactOperation[] {
  const operations: EpochReactOperation[] = [];
  const keys = [...new Set([...Object.keys(previous), ...Object.keys(next)])].sort();
  for (const key of keys) {
    if (!(key in next) || next[key] === undefined) {
      if (key in previous) operations.push({ kind: "map-delete", entity, key });
      continue;
    }
    if (!(key in previous) || stableJson(previous[key]) !== stableJson(next[key])) {
      operations.push({ kind: "map-set", entity, key, value: next[key] });
    }
  }
  return operations;
}

function materializeState<TState extends object>(
  entity: string,
  events: readonly EpochReactEvent[],
): TState {
  if (events.length === 0) return {} as TState;
  const state: Record<string, unknown> = {};
  for (const event of events) {
    const operation = event.payload.operation;
    if (!isReactOperation(operation) || operation.entity !== entity) continue;
    if (operation.kind === "map-delete") delete state[operation.key];
    else state[operation.key] = operation.value;
  }
  return normalizeState(state) as TState;
}

function eventsForTarget(events: readonly EpochReactEvent[], target: EpochReactMaterializationTarget): readonly EpochReactEvent[] {
  if (target === "latest") return events;
  if (typeof target === "number") return events.slice(0, clampEventCount(target, events.length));
  const index = events.findIndex((event) => event.id === target);
  if (index === -1) throw new Error(`unknown Epoch React event '${target}'`);
  return events.slice(0, index + 1);
}

function normalizeVfsRoot(root: string): string {
  const trimmed = root.replace(/\/+$/u, "");
  return trimmed.length === 0 ? "/.epoch-live" : trimmed;
}

function eventsRoot(root: string): string {
  return `${root}/events/`;
}

function eventPath(root: string, eventId: string): string {
  return `${eventsRoot(root)}${eventId}.json`;
}

function parseLiveEvent(raw: string | undefined): EpochLiveRepositoryEvent | undefined {
  if (raw === undefined) return undefined;
  const parsed = JSON.parse(raw) as Partial<EpochLiveRepositoryEvent>;
  if (parsed.type !== "entity" || typeof parsed.id !== "string" || typeof parsed.entity !== "string" || typeof parsed.author !== "string" || typeof parsed.lamport !== "number" || !isRecord(parsed.payload)) {
    throw new Error("invalid Epoch live repository event");
  }
  return {
    id: parsed.id,
    type: "entity",
    entity: parsed.entity,
    author: parsed.author,
    lamport: parsed.lamport,
    payload: normalizeState(parsed.payload),
  };
}

const emptyLiveEntity: Record<string, unknown> = {};

function materializeLiveEntities(events: readonly EpochLiveRepositoryEvent[]): Map<string, Record<string, unknown>> {
  const entities = new Map<string, Record<string, unknown>>();
  for (const event of events) entities.set(event.entity, normalizeState(event.payload));
  return entities;
}

function normalizeTarget(target: EpochReactMaterializationTarget, events: readonly EpochReactEvent[]): EpochReactMaterializationTarget {
  if (target === "latest") return target;
  if (typeof target === "number") return clampEventCount(target, events.length);
  if (!events.some((event) => event.id === target)) throw new Error(`unknown Epoch React event '${target}'`);
  return target;
}

function loadPersisted(storage: EpochReactStorage, storageKey: string, entity: string): EpochReactEvent[] {
  const raw = storage.getItem(storageKey);
  if (raw === null) return [];
  const parsed = JSON.parse(raw) as Partial<PersistedEpochReactState>;
  if (parsed.version !== 1 || parsed.entity !== entity || !Array.isArray(parsed.events)) {
    throw new Error(`invalid Epoch React storage payload for '${storageKey}'`);
  }
  return parsed.events.map((event) => ({
    id: requireNonEmpty(event.id, "event id"),
    type: "crdt",
    author: requireNonEmpty(event.author, "event author"),
    lamport: requireNumber(event.lamport, "event lamport"),
    payload: requireRecord(event.payload, "event payload"),
  }));
}

function browserStorage(): EpochReactStorage | undefined {
  return typeof globalThis.localStorage === "undefined" ? undefined : globalThis.localStorage;
}

function normalizeState<TState extends object>(value: TState): TState {
  if (!isRecord(value)) throw new TypeError("Epoch React state must be a JSON object");
  return JSON.parse(JSON.stringify(value)) as TState;
}

function stableId(value: string): string {
  return hashString(value).padStart(8, "0").slice(0, 32);
}

function stableJson(value: unknown): string {
  if (Array.isArray(value)) return `[${value.map((item) => stableJson(item)).join(",")}]`;
  if (isRecord(value)) return `{${Object.keys(value).sort().map((key) => `${JSON.stringify(key)}:${stableJson(value[key])}`).join(",")}}`;
  return JSON.stringify(value);
}

function hashString(value: string): string {
  let hash = 2166136261;
  for (let index = 0; index < value.length; index += 1) {
    hash ^= value.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }
  return (hash >>> 0).toString(16);
}

function clampEventCount(count: number, length: number): number {
  if (!Number.isInteger(count)) throw new Error("Epoch React rewind count must be an integer");
  return Math.max(0, Math.min(count, length));
}

function requireNonEmpty(value: unknown, label: string): string {
  if (typeof value !== "string" || value.length === 0) throw new Error(`invalid Epoch React ${label}`);
  return value;
}

function requireNumber(value: unknown, label: string): number {
  if (typeof value !== "number" || !Number.isFinite(value)) throw new Error(`invalid Epoch React ${label}`);
  return value;
}

function requireRecord(value: unknown, label: string): Record<string, unknown> {
  if (!isRecord(value)) throw new Error(`invalid Epoch React ${label}`);
  return value;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function asRecord(value: object): Record<string, unknown> {
  if (!isRecord(value)) throw new TypeError("Epoch React state must be a JSON object");
  return value;
}

function isReactOperation(value: unknown): value is EpochReactOperation {
  if (!isRecord(value) || typeof value.entity !== "string" || typeof value.key !== "string") return false;
  return value.kind === "map-delete" || value.kind === "map-set";
}
