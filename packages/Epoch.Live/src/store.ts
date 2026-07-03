import type { EpochVirtualFileSystem } from "@epoch/wasm-react";
import { LiveLog, type LiveEvent, type LiveEventKind } from "./log";
import {
  diffToOps,
  materialize,
  materializeAt,
  resolveRollbackTargetId,
  type LiveOp,
  type LiveTarget,
} from "./materialize";
import { createPresenceHub, type LivePresence } from "./presence";
import type { LiveProvider, LiveSyncEndpoint } from "./providers";
import type { LiveSigner, LiveVerifier } from "./signer";
import { hashHex, isRecord, normalizeJson, requireNonEmpty } from "./util";

export interface LiveAction {
  readonly type: string;
  readonly payload?: Record<string, unknown>;
}

export type LiveReducer<TState extends object> = (state: TState, action: LiveAction) => TState;

export interface LiveStoreOptions<TState extends object> {
  readonly entity: string;
  readonly author: string;
  readonly initialState: TState;
  readonly reducer?: LiveReducer<TState>;
  readonly vfs?: EpochVirtualFileSystem;
  readonly signer?: LiveSigner;
  readonly verifier?: LiveVerifier;
  readonly root?: string;
  readonly clientId?: string;
  readonly providers?: readonly LiveProvider[];
}

export interface LiveCommit<TState extends object> {
  readonly state: TState;
  readonly events: readonly LiveEvent[];
}

export interface LiveHistoryEntry {
  readonly id: string;
  readonly kind: LiveEventKind;
  readonly author: string;
  readonly lamport: number;
  readonly summary: string;
}

export interface LiveStore<TState extends object> {
  readonly entity: string;
  readonly author: string;
  readonly clientId: string;
  readonly presence: LivePresence;
  dispatch(action: LiveAction): LiveCommit<TState>;
  getState(): TState;
  select<T>(selector: (state: TState) => T): T;
  subscribe(listener: () => void): () => void;
  history(): readonly LiveHistoryEntry[];
  rewind(target: LiveTarget): void;
  rollbackTo(target: LiveTarget, reason?: string): LiveCommit<TState>;
  undo(): LiveCommit<TState>;
  redo(): LiveCommit<TState>;
  canUndo(): boolean;
  canRedo(): boolean;
  connect(provider: LiveProvider): () => void;
  endpoint(): LiveSyncEndpoint;
  log(): LiveLog;
}

let clientCounter = 0;

export function createLiveStore<TState extends object>(options: LiveStoreOptions<TState>): LiveStore<TState> {
  const entity = requireNonEmpty(options.entity, "entity");
  const author = requireNonEmpty(options.author, "author");
  const clientId = options.clientId ?? `${author}:${hashHex(author)}:${(clientCounter += 1)}`;
  const reducer = options.reducer ?? patchReducer;
  const log = new LiveLog({
    vfs: options.vfs,
    signer: options.signer,
    verifier: options.verifier,
    author,
    root: options.root,
  });
  const presenceHub = createPresenceHub({ clientId, author });
  const stateListeners = new Set<() => void>();
  const localEventListeners = new Set<(events: readonly LiveEvent[]) => void>();
  const connected = new Set<LiveProvider>();

  let cursor: LiveTarget = "latest";
  const timeline: LiveTarget[] = ["genesis"];
  let undoIndex = 0;
  let snapshot: TState;
  let snapshotDirty = true;

  seedInitialState();
  initializeUndoBase();
  const endpoint = createEndpoint();
  for (const provider of options.providers ?? []) connect(provider);

  function seedInitialState(): void {
    if (log.forEntity(entity).some((event) => event.kind === "op")) return;
    const ops = diffToOps({}, asRecord(normalizeState(options.initialState)));
    for (const op of ops) appendOp(op, "@init");
  }

  // The undo floor is the current materialized state (seeded or restored), so
  // undo stops at the initial state rather than emptying it.
  function initializeUndoBase(): void {
    const ops = log.forEntity(entity).filter((event) => event.kind === "op");
    timeline[0] = ops.length > 0 ? ops[ops.length - 1].id : "genesis";
    undoIndex = 0;
  }

  function dispatch(action: LiveAction): LiveCommit<TState> {
    const current = latestState();
    const next = normalizeState(reducer(current, action));
    const ops = diffToOps(asRecord(current), asRecord(next));
    if (ops.length === 0) {
      cursor = "latest";
      return { state: getState(), events: [] };
    }
    const events = ops.map((op) => appendOp(op, action.type));
    branchTimeline(events[events.length - 1].id);
    finishLocalCommit(events);
    return { state: getState(), events };
  }

  function rollbackTo(target: LiveTarget, reason = ""): LiveCommit<TState> {
    const events = commitRollback(target, reason);
    branchTimeline(rollbackTargetOf(events));
    return { state: getState(), events };
  }

  function undo(): LiveCommit<TState> {
    if (undoIndex <= 0) return { state: getState(), events: [] };
    undoIndex -= 1;
    const events = commitRollback(timeline[undoIndex], "undo");
    return { state: getState(), events };
  }

  function redo(): LiveCommit<TState> {
    if (undoIndex >= timeline.length - 1) return { state: getState(), events: [] };
    undoIndex += 1;
    const events = commitRollback(timeline[undoIndex], "redo");
    return { state: getState(), events };
  }

  function commitRollback(target: LiveTarget, reason: string): readonly LiveEvent[] {
    const targetId = resolveRollbackTargetId(log.all(), entity, target);
    const event = log.append("rollback", entity, {
      target: targetId,
      reason,
      previousHeads: log.heads(),
    });
    finishLocalCommit([event]);
    return [event];
  }

  function appendOp(op: LiveOp, actionType: string): LiveEvent {
    return log.append("op", entity, { op, action: actionType, summary: summarizeOp(op, actionType) });
  }

  function finishLocalCommit(events: readonly LiveEvent[]): void {
    cursor = "latest";
    notifyState();
    for (const listener of localEventListeners) listener(events);
  }

  function branchTimeline(targetId: string): void {
    timeline.splice(undoIndex + 1);
    timeline.push(targetId);
    undoIndex = timeline.length - 1;
  }

  function getState(): TState {
    if (snapshotDirty) {
      snapshot = cursor === "latest" ? latestState() : (materializeAt(log.all(), entity, cursor) as TState);
      snapshotDirty = false;
    }
    return snapshot;
  }

  function latestState(): TState {
    return materialize(log.all(), entity) as TState;
  }

  function select<T>(selector: (state: TState) => T): T {
    return selector(getState());
  }

  function subscribe(listener: () => void): () => void {
    stateListeners.add(listener);
    return () => {
      stateListeners.delete(listener);
    };
  }

  function history(): readonly LiveHistoryEntry[] {
    return log.forEntity(entity).map((event) => ({
      id: event.id,
      kind: event.kind,
      author: event.author,
      lamport: event.lamport,
      summary: summaryOf(event),
    }));
  }

  function rewind(target: LiveTarget): void {
    if (typeof target === "string" && target !== "latest" && !log.forEntity(entity).some((event) => event.id === target)) {
      throw new Error(`Epoch Live unknown event '${target}'`);
    }
    cursor = target;
    notifyState();
  }

  function connect(provider: LiveProvider): () => void {
    connected.add(provider);
    provider.connect(endpoint);
    return () => {
      provider.disconnect();
      connected.delete(provider);
    };
  }

  function createEndpoint(): LiveSyncEndpoint {
    return {
      clientId,
      exportEvents: () => log.all(),
      ingestEvents: (events) => {
        const applied = log.ingest(events).applied;
        if (applied > 0) notifyState();
        return applied;
      },
      onLocalEvents: (listener) => {
        localEventListeners.add(listener);
        return () => {
          localEventListeners.delete(listener);
        };
      },
      exportPresence: () => presenceHub.exportLocal(),
      ingestPresence: (message) => presenceHub.ingest(message),
      onLocalPresence: (listener) => presenceHub.onLocalPresence(listener),
    };
  }

  function notifyState(): void {
    snapshotDirty = true;
    for (const listener of stateListeners) listener();
  }

  return {
    entity,
    author,
    clientId,
    presence: presenceHub,
    dispatch,
    getState,
    select,
    subscribe,
    history,
    rewind,
    rollbackTo,
    undo,
    redo,
    canUndo: () => undoIndex > 0,
    canRedo: () => undoIndex < timeline.length - 1,
    connect,
    endpoint: () => endpoint,
    log: () => log,
  };
}

function patchReducer<TState extends object>(state: TState, action: LiveAction): TState {
  return { ...state, ...(action.payload ?? {}) } as TState;
}

function summarizeOp(op: LiveOp, actionType: string): string {
  return op.kind === "delete" ? `${actionType}: delete ${op.key}` : `${actionType}: set ${op.key}`;
}

function summaryOf(event: LiveEvent): string {
  const summary = event.payload.summary;
  if (typeof summary === "string") return summary;
  if (event.kind === "rollback") {
    const reason = event.payload.reason;
    return `rollback${typeof reason === "string" && reason.length > 0 ? `: ${reason}` : ""}`;
  }
  return event.kind;
}

function rollbackTargetOf(events: readonly LiveEvent[]): string {
  const target = events[0]?.payload.target;
  return typeof target === "string" ? target : "genesis";
}

function normalizeState<TState extends object>(value: TState): TState {
  if (!isRecord(value)) throw new TypeError("Epoch Live state must be a JSON object");
  return normalizeJson(value);
}

function asRecord(value: object): Record<string, unknown> {
  if (!isRecord(value)) throw new TypeError("Epoch Live state must be a JSON object");
  return value;
}
