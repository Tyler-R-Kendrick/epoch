import { useCallback, useMemo, useSyncExternalStore } from "react";
import type {
  LiveAction,
  LiveCommit,
  LiveHistoryEntry,
  LiveStore,
  LiveTarget,
  PresencePeer,
} from "@epoch/live";

export interface LiveRollbackControls<TState extends object> {
  readonly rewind: (target: LiveTarget) => void;
  readonly rollbackTo: (target: LiveTarget, reason?: string) => LiveCommit<TState>;
  readonly undo: () => LiveCommit<TState>;
  readonly redo: () => LiveCommit<TState>;
  readonly canUndo: boolean;
  readonly canRedo: boolean;
  readonly history: readonly LiveHistoryEntry[];
}

export function useLiveState<TState extends object>(store: LiveStore<TState>): TState {
  return useSyncExternalStore(store.subscribe, store.getState, store.getState);
}

export function useLiveSelector<TState extends object, T>(
  store: LiveStore<TState>,
  selector: (state: TState) => T,
): T {
  const getSnapshot = useCallback(() => selector(store.getState()), [store, selector]);
  return useSyncExternalStore(store.subscribe, getSnapshot, getSnapshot);
}

export function useLiveRollback<TState extends object>(store: LiveStore<TState>): LiveRollbackControls<TState> {
  const state = useLiveState(store);
  return useMemo<LiveRollbackControls<TState>>(
    () => ({
      rewind: store.rewind,
      rollbackTo: store.rollbackTo,
      undo: store.undo,
      redo: store.redo,
      canUndo: store.canUndo(),
      canRedo: store.canRedo(),
      history: store.history(),
    }),
    // `state` re-derives the controls whenever the store commits.
    [store, state],
  );
}

export function useLiveHistory<TState extends object>(store: LiveStore<TState>): readonly LiveHistoryEntry[] {
  const state = useLiveState(store);
  return useMemo(() => store.history(), [store, state]);
}

export function useLiveStore<TState extends object>(
  store: LiveStore<TState>,
): readonly [TState, (action: LiveAction) => LiveCommit<TState>, LiveRollbackControls<TState>] {
  const state = useLiveState(store);
  const dispatch = useCallback((action: LiveAction) => store.dispatch(action), [store]);
  const controls = useLiveRollback(store);
  return [state, dispatch, controls] as const;
}

export function usePresence<TState extends object>(store: LiveStore<TState>): readonly PresencePeer[] {
  return useSyncExternalStore(store.presence.subscribe, store.presence.peers, store.presence.peers);
}
