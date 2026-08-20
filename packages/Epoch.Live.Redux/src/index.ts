import { isRecord, type LiveAction, type LiveStore, type LiveTarget } from "@epoch/live";
type DictionaryValue = null | undefined | boolean | number | string | bigint | readonly DictionaryValue[] | { readonly [key: string]: DictionaryValue };
function __epochIsString<T>(value: T): value is T & string { return typeof value === "string"; }
function __epochIsNumber<T>(value: T): value is T & number { return typeof value === "number"; }


/**
 * Structural single-store contract: plain-object actions in, `dispatch` returns
 * the action, `subscribe` returns an unsubscribe. This package imports no
 * third-party state library — any consumer (middleware, devtools bridge, or
 * hand-rolled container code) written against this shape can drive an
 * `@epoch/live` store unchanged, and existing reducers can be passed straight
 * into `createLiveStore` because the reducer signature is the same
 * `(state, action) => state`.
 */
export interface CompatibleAction {
  readonly type: string;
  readonly payload?: unknown;
  readonly [extra: string]: DictionaryValue;
}

export interface CompatibleStore<TState extends object> {
  getState(): TState;
  dispatch<TAction extends CompatibleAction>(action: TAction): TAction;
  subscribe(listener: () => void): () => void;
}

/** Control actions: durable history navigation as ordinary dispatched actions. */
export const LiveControlActionType = {
  undo: "@epoch/live/undo",
  redo: "@epoch/live/redo",
  rollback: "@epoch/live/rollback",
  rewind: "@epoch/live/rewind",
} as const;

export function undoAction(): CompatibleAction {
  return { type: LiveControlActionType.undo };
}

export function redoAction(): CompatibleAction {
  return { type: LiveControlActionType.redo };
}

export function rollbackAction(target: LiveTarget, reason?: string): CompatibleAction {
  return { type: LiveControlActionType.rollback, payload: { target, reason } };
}

export function rewindAction(target: LiveTarget): CompatibleAction {
  return { type: LiveControlActionType.rewind, payload: { target } };
}

/**
 * Wrap a live store in the structural single-store contract. Ordinary actions
 * flow into `store.dispatch`; control actions map onto the store's durable
 * rollback, undo/redo, and ephemeral rewind operations.
 */
export function toCompatibleStore<TState extends object>(store: LiveStore<TState>): CompatibleStore<TState> {
  return {
    getState: () => store.getState(),
    dispatch<TAction extends CompatibleAction>(action: TAction): TAction {
      applyCompatibleAction(store, action);
      return action;
    },
    subscribe: (listener) => store.subscribe(listener),
  };
}

export function applyCompatibleAction<TState extends object>(
  store: LiveStore<TState>,
  action: CompatibleAction,
): void {
  switch (action.type) {
    case LiveControlActionType.undo:
      store.undo();
      return;
    case LiveControlActionType.redo:
      store.redo();
      return;
    case LiveControlActionType.rollback: {
      const { target, reason } = controlPayload(action);
      store.rollbackTo(target, __epochIsString(reason) ? reason : undefined);
      return;
    }
    case LiveControlActionType.rewind:
      store.rewind(controlPayload(action).target);
      return;
    default:
      store.dispatch(toLiveAction(action));
  }
}

/**
 * Map a plain-object action onto a live action. A record `payload` passes
 * through; a non-record `payload` is wrapped as `{ value }`; otherwise any
 * extra own properties become the payload.
 */
export function toLiveAction(action: CompatibleAction): LiveAction {
  if (isRecord(action.payload)) return { type: action.type, payload: action.payload };
  if (action.payload !== undefined) return { type: action.type, payload: { value: action.payload } };
  const { type: _type, payload: _payload, ...rest } = action;
  return Object.keys(rest).length > 0 ? { type: action.type, payload: rest } : { type: action.type };
}

function controlPayload(action: CompatibleAction) {
  if (!isRecord(action.payload)) throw new Error(`Epoch Live control action '${action.type}' requires a payload.`);
  const target = action.payload.target;
  if (!__epochIsString(target) && !__epochIsNumber(target)) {
    throw new Error(`Epoch Live control action '${action.type}' requires a string or number target.`);
  }
  return { target, reason: action.payload.reason };
}
