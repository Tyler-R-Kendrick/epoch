import assert from "node:assert/strict";
import { createLiveStore } from "@epoch/live";
import {
  applyCompatibleAction,
  LiveControlActionType,
  redoAction,
  rewindAction,
  rollbackAction,
  toCompatibleStore,
  toLiveAction,
  undoAction,
  type CompatibleStore,
} from "@epoch/live-redux";

type TestJsonValue = boolean | null | number | string | TestJsonObject | readonly TestJsonValue[] | undefined;
interface TestJsonObject {
  readonly [key: string]: TestJsonValue;
}

interface DocState {
  readonly title?: string;
  readonly count?: number;
  readonly value?: unknown;
  readonly [key: string]: TestJsonValue;
}

export function runEpochLiveReduxTests(): void {
  facadeSatisfiesTheSingleStoreContract();
  controlActionsDriveDurableHistory();
  rewindActionPreviewsWithoutCommitting();
  actionPayloadMappingVariants();
  controlActionsValidateTheirPayloads();
}

function facadeSatisfiesTheSingleStoreContract(): void {
  const live = createLiveStore<DocState>({ entity: "doc", author: "alice", initialState: { count: 0 } });
  const store: CompatibleStore<DocState> = toCompatibleStore(live);

  let notifications = 0;
  const unsubscribe = store.subscribe(() => {
    notifications += 1;
  });

  const action = { type: "set", payload: { count: 1 } };
  const returned = store.dispatch(action);
  assert.equal(returned, action, "dispatch returns the action, per the single-store contract");
  assert.equal(store.getState().count, 1);
  assert.equal(notifications, 1);

  unsubscribe();
  store.dispatch({ type: "set", payload: { count: 2 } });
  assert.equal(notifications, 1, "unsubscribe stops notifications");
  assert.equal(live.log().verify().length, 0, "facade commits still verify as signed events");
}

function controlActionsDriveDurableHistory(): void {
  const live = createLiveStore<DocState>({ entity: "doc", author: "alice", initialState: { count: 0 } });
  const store = toCompatibleStore(live);
  store.dispatch({ type: "set", payload: { count: 1 } });
  const commit = live.history().at(-1);
  assert.ok(commit);
  store.dispatch({ type: "set", payload: { count: 2 } });

  store.dispatch(undoAction());
  assert.equal(store.getState().count, 1, "undo control action reverts one commit");
  store.dispatch(redoAction());
  assert.equal(store.getState().count, 2, "redo control action re-applies it");

  store.dispatch(rollbackAction(commit.id, "revert to one"));
  assert.equal(store.getState().count, 1, "rollback control action commits a durable rollback");
  assert.ok(live.history().some((entry) => entry.kind === "rollback" && entry.summary.includes("revert to one")));
}

function rewindActionPreviewsWithoutCommitting(): void {
  const live = createLiveStore<DocState>({ entity: "doc", author: "alice", initialState: {} });
  const store = toCompatibleStore(live);
  store.dispatch({ type: "set", payload: { title: "one" } });
  const first = live.history().at(-1);
  assert.ok(first);
  store.dispatch({ type: "set", payload: { title: "two" } });

  const events = live.log().all().length;
  store.dispatch(rewindAction(first.id));
  assert.equal(store.getState().title, "one", "rewind control action previews the past");
  assert.equal(live.log().all().length, events, "rewind appends nothing");
  store.dispatch(rewindAction("latest"));
  assert.equal(store.getState().title, "two");
}

function actionPayloadMappingVariants(): void {
  assert.deepEqual(toLiveAction({ type: "a", payload: { x: 1 } }), { type: "a", payload: { x: 1 } });
  assert.deepEqual(toLiveAction({ type: "a", payload: 5 }), { type: "a", payload: { value: 5 } });
  assert.deepEqual(toLiveAction({ type: "a", x: 1, y: "z" }), { type: "a", payload: { x: 1, y: "z" } });
  assert.deepEqual(toLiveAction({ type: "a" }), { type: "a" });

  const live = createLiveStore<DocState>({ entity: "doc", author: "alice", initialState: {} });
  const store = toCompatibleStore(live);
  store.dispatch({ type: "set", payload: 7 });
  assert.equal(store.getState().value, 7, "non-record payloads land under `value`");
  store.dispatch({ type: "set", title: "spread" });
  assert.equal(store.getState().title, "spread", "extra own properties become the payload");
}

function controlActionsValidateTheirPayloads(): void {
  const live = createLiveStore<DocState>({ entity: "doc", author: "alice", initialState: {} });
  assert.throws(
    () => applyCompatibleAction(live, { type: LiveControlActionType.rollback }),
    /requires a payload/u,
  );
  assert.throws(
    () => applyCompatibleAction(live, { type: LiveControlActionType.rewind, payload: { target: true } }),
    /string or number target/u,
  );
}
