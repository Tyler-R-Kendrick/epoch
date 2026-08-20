import assert from "node:assert/strict";
import { JSDOM } from "jsdom";
import React from "react";
import { flushSync } from "react-dom";
import { createRoot } from "react-dom/client";
import { assign, createActor, createMachine } from "xstate";
import { createBrowserEpoch, createMemoryEpochIntegrationStorage, stableJson } from "@epoch/integration-core";
import { trackGeneratedUiChange } from "@epoch/gen-ui";
import { EpochProvider, useEpochRepository, useEpochTrackedEntity, useEpochVersionLedger } from "@epoch/react";
import { createEpochReduxMiddleware } from "@epoch/redux";
import { createEpochXStateObserver, trackXStateMachineUpdate } from "@epoch/xstate";

interface DashboardSpec {
  readonly label: string;
}

interface ReduxAction {
  readonly type: string;
  readonly payload?: unknown;
}

interface CounterMachineTypes {
  readonly context: { count: number };
  readonly events: { type: "increment" } | { type: "ignored" };
}

interface ReduxStore<State> {
  dispatch(action: ReduxAction): ReduxAction;
  getState(): State;
}

export async function runEpochIntegrationSuiteTests(): Promise<void> {
  recordsTrackedChangesWithBrowserDefaults();
  serializesUndefinedStably();
  versionsGeneratedUiComponents();
  tracksReduxActionsExplicitly();
  tracksReduxFunctionMatcherAndMetadata();
  tracksXStateTransitionsExplicitly();
  tracksXStateOptionalFiltersAndSummaries();
  recordsXStateMachineUpdatesExplicitly();
  await providesReactHooksForTrackedEntitiesAndLedgers();
  await providesReactHooksFromOptionsWithoutInjectedEpoch();
}

function recordsTrackedChangesWithBrowserDefaults(): void {
  const epoch = createBrowserEpoch({ namespace: "suite-core", author: "agent" });

  const first = epoch.trackChange({
    entity: "dashboard",
    surface: "gen-ui",
    source: "unit-test",
    summary: "first generated dashboard",
    payload: { widgets: 1 },
  });
  const second = epoch.trackChange({
    entity: "dashboard",
    surface: "redux",
    source: "unit-test",
    summary: "state notification",
    payload: { widgets: 2 },
  });

  assert.equal(first.revision, 1);
  assert.equal(second.revision, 2);
  assert.equal(epoch.repository.history().length, 2);
  assert.equal(epoch.readTrackedEntity<{ widgets: number }>("dashboard").payload.widgets, 2);
  assert.deepEqual(epoch.versionLedger("dashboard").map((entry) => entry.surface), ["gen-ui", "redux"]);
}

function serializesUndefinedStably(): void {
  assert.equal(stableJson(undefined), "null");
  assert.equal(stableJson([undefined]), "[null]");
  assert.equal(stableJson({ optional: undefined }), "{\"optional\":null}");
}

async function providesReactHooksForTrackedEntitiesAndLedgers(): Promise<void> {
  const dom = new JSDOM("<!doctype html><main id=\"host\"></main>", { url: "https://epoch.local/" });
  const restore = installDomGlobals(dom);
  try {
    const epoch = createBrowserEpoch({
      namespace: "suite-react",
      author: "react-agent",
      storage: createMemoryEpochIntegrationStorage(),
    });
    const host = dom.window.document.getElementById("host");
    assert.ok(host);

    function Dashboard(): React.ReactElement {
      const contextEpoch = useEpochRepository();
      const current = useEpochTrackedEntity<{ count: number }>("dashboard");
      const ledger = useEpochVersionLedger("dashboard");
      return React.createElement("section", { "aria-label": "Epoch dashboard" },
        React.createElement("output", { id: "count" }, `count: ${current?.payload.count ?? 0}`),
        React.createElement("output", { id: "ledger" }, `versions: ${ledger.length}`),
        React.createElement("button", {
          id: "track",
          onClick: () => contextEpoch.trackChange({
            entity: "dashboard",
            surface: "gen-ui",
            source: "react-test",
            summary: "tracked from provider",
            payload: { count: 1 },
          }),
        }, "track"),
      );
    }

    const root = createRoot(host);
    flushSync(() => root.render(React.createElement(EpochProvider, { epoch }, React.createElement(Dashboard))));
    assert.equal(text(dom, "#count"), "count: 0");
    click(dom, "#track");
    assert.equal(text(dom, "#count"), "count: 1");
    assert.equal(text(dom, "#ledger"), "versions: 1");
    flushSync(() => root.unmount());
    await settleReactClient();
  } finally {
    restore();
    dom.window.close();
  }
}

function versionsGeneratedUiComponents(): void {
  const epoch = createBrowserEpoch({
    namespace: "suite-gen-ui",
    author: "designer",
    storage: createMemoryEpochIntegrationStorage(),
  });

  const first = trackGeneratedUiChange<DashboardSpec>(epoch, {
    entity: "dashboard",
    source: "prompt",
    summary: "add revenue card",
    renderer: "json-render",
    components: [{ id: "component:revenue", spec: { label: "Revenue" } }],
  });
  const second = trackGeneratedUiChange<DashboardSpec>(epoch, {
    entity: "dashboard",
    source: "prompt",
    summary: "refresh revenue card",
    renderer: "json-render",
    components: [{ id: "component:revenue", spec: { label: "Revenue updated" } }],
  });

  assert.equal(first.components[0]?.version, 1);
  assert.equal(second.components[0]?.version, 2);
  assert.equal(epoch.versionLedger("dashboard").at(-1)?.eventId, second.event.id);
  assert.equal(epoch.readTrackedEntity<{ components: readonly { version: number }[] }>("dashboard").payload.components[0]?.version, 2);
}

function tracksReduxFunctionMatcherAndMetadata(): void {
  const epoch = createBrowserEpoch({
    namespace: "suite-redux-fn",
    author: "redux-agent",
    storage: createMemoryEpochIntegrationStorage(),
  });
  const store = createTinyReduxStore({ counter: 0 });
  const middleware = createEpochReduxMiddleware<{ counter: number }, ReduxAction>({
    epoch,
    entity: "redux:counter-fn",
    source: "counter-store",
    actions: (action) => action.type.startsWith("counter/"),
    select: (state) => ({ counter: state.counter }),
    summary: (action) => `saw ${action.type}`,
    metadata: (action) => ({ via: action.type }),
  });
  const dispatch = middleware(store)((action) => store.dispatch(action));
  dispatch({ type: "other/skip" });
  dispatch({ type: "counter/increment" });
  assert.equal(epoch.repository.history().length, 1);
  assert.equal(epoch.versionLedger("redux:counter-fn")[0]?.summary, "saw counter/increment");
  assert.equal(epoch.versionLedger("redux:counter-fn")[0]?.metadata?.via, "counter/increment");

  const open = createEpochReduxMiddleware<{ counter: number }, ReduxAction>({
    epoch,
    entity: "redux:open",
    source: "open-store",
    select: (state) => state,
  });
  const openDispatch = open(store)((action) => store.dispatch(action));
  openDispatch({ type: "anything" });
  assert.equal(epoch.versionLedger("redux:open").length, 1);
}

function tracksReduxActionsExplicitly(): void {
  const epoch = createBrowserEpoch({
    namespace: "suite-redux",
    author: "redux-agent",
    storage: createMemoryEpochIntegrationStorage(),
  });
  const store = createTinyReduxStore({ counter: 0 });
  const middleware = createEpochReduxMiddleware<{ counter: number }, ReduxAction>({
    epoch,
    entity: "redux:counter",
    source: "counter-store",
    actions: ["counter/increment"],
    select: (state) => ({ counter: state.counter }),
  });
  const dispatch = middleware(store)((action) => store.dispatch(action));

  dispatch({ type: "counter/ignored" });
  dispatch({ type: "counter/increment" });

  assert.equal(store.getState().counter, 1);
  assert.equal(epoch.repository.history().length, 1);
  assert.equal(epoch.versionLedger("redux:counter")[0]?.surface, "redux");
  assert.equal(epoch.readTrackedEntity<{ counter: number }>("redux:counter").payload.counter, 1);
}

function tracksXStateTransitionsExplicitly(): void {
  const epoch = createBrowserEpoch({
    namespace: "suite-xstate",
    author: "machine-agent",
    storage: createMemoryEpochIntegrationStorage(),
  });
  const machine = createMachine({
    // SAFETY: Runtime checks or construction above establish { context: { count: number }.
    types: {} as CounterMachineTypes,
    id: "counter",
    context: { count: 0 },
    initial: "idle",
    states: {
      idle: {
        on: {
          increment: { actions: assign({ count: ({ context }) => context.count + 1 }) },
          ignored: {},
        },
      },
    },
  });
  const actor = createActor(machine);
  const observer = createEpochXStateObserver({
    epoch,
    entity: "xstate:counter",
    source: "counter-machine",
    events: ["increment"],
    select: (snapshot) => snapshot.context,
  });

  actor.subscribe(observer);
  actor.start();
  actor.send({ type: "ignored" });
  actor.send({ type: "increment" });
  actor.stop();

  assert.equal(epoch.repository.history().length, 1);
  assert.equal(epoch.versionLedger("xstate:counter")[0]?.surface, "xstate");
  assert.equal(epoch.readTrackedEntity<{ count: number }>("xstate:counter").payload.count, 1);
}

function tracksXStateOptionalFiltersAndSummaries(): void {
  const epoch = createBrowserEpoch({
    namespace: "suite-xstate-open",
    author: "machine-agent",
    storage: createMemoryEpochIntegrationStorage(),
  });
  const observer = createEpochXStateObserver({
    epoch,
    entity: "xstate:open",
    source: "open-machine",
    select: (snapshot) => snapshot.context,
    summary: (snapshot) => `to ${String(snapshot.value)}`,
    metadata: (snapshot) => ({ value: snapshot.value }),
  });
  observer.next({ context: { count: 0 }, value: "idle" });
  observer.next({ context: { count: 0 }, value: "idle" });
  observer.next({ context: { count: 1 }, value: "ready", event: { type: "advance" } });
  assert.equal(epoch.repository.history().length, 1);
  assert.equal(epoch.versionLedger("xstate:open")[0]?.summary, "to ready");

  const filtered = createEpochXStateObserver({
    epoch,
    entity: "xstate:filtered",
    source: "filtered-machine",
    events: ["keep"],
    select: (snapshot) => snapshot.context,
  });
  filtered.next({ context: { n: 0 } });
  filtered.next({ context: { n: 1 }, event: { type: "drop" } });
  filtered.next({ context: { n: 2 }, event: {} });
  assert.equal(epoch.versionLedger("xstate:filtered").length, 1);

  trackXStateMachineUpdate(epoch, {
    entity: "xstate:machine-meta",
    source: "generator",
    summary: "with metadata",
    definition: { id: "m" },
    metadata: { origin: "test" },
  });
  assert.equal(epoch.versionLedger("xstate:machine-meta")[0]?.metadata?.origin, "test");
}

function recordsXStateMachineUpdatesExplicitly(): void {
  const epoch = createBrowserEpoch({
    namespace: "suite-xstate-update",
    author: "machine-agent",
    storage: createMemoryEpochIntegrationStorage(),
  });
  const result = trackXStateMachineUpdate(epoch, {
    entity: "xstate:machine",
    source: "machine-generator",
    summary: "generated guard update",
    definition: { guards: ["canDeploy"] },
  });

  assert.equal(result.revision, 1);
  assert.equal(epoch.versionLedger("xstate:machine")[0]?.summary, "generated guard update");
  assert.deepEqual(epoch.readTrackedEntity<{ definition: { guards: string[] } }>("xstate:machine").payload.definition.guards, ["canDeploy"]);
}

async function providesReactHooksFromOptionsWithoutInjectedEpoch(): Promise<void> {
  const dom = new JSDOM("<!doctype html><main id=\"host\"></main>", { url: "https://epoch.local/" });
  const restore = installDomGlobals(dom);
  try {
    const host = dom.window.document.getElementById("host");
    assert.ok(host);
    function Label(): React.ReactElement {
      const epoch = useEpochRepository();
      return React.createElement("output", { id: "ns" }, epoch.namespace);
    }
    const root = createRoot(host);
    flushSync(() => root.render(React.createElement(EpochProvider, {
      options: { namespace: "from-options", author: "react-agent" },
    }, React.createElement(Label))));
    assert.equal(text(dom, "#ns"), "from-options");
    flushSync(() => root.unmount());
    await settleReactClient();
  } finally {
    restore();
    dom.window.close();
  }
}

function createTinyReduxStore(initialState: { readonly counter: number }): ReduxStore<{ counter: number }> {
  let state = initialState;
  return {
    dispatch(action) {
      if (action.type === "counter/increment") state = { counter: state.counter + 1 };
      return action;
    },
    getState() {
      return state;
    },
  };
}

function installDomGlobals(dom: JSDOM): () => void {
  const previousWindow = Object.getOwnPropertyDescriptor(globalThis, "window");
  const previousDocument = Object.getOwnPropertyDescriptor(globalThis, "document");
  const previousNavigator = Object.getOwnPropertyDescriptor(globalThis, "navigator");
  const previousHTMLElement = Object.getOwnPropertyDescriptor(globalThis, "HTMLElement");
  const previousEvent = Object.getOwnPropertyDescriptor(globalThis, "Event");
  const previousMouseEvent = Object.getOwnPropertyDescriptor(globalThis, "MouseEvent");

  Object.defineProperty(globalThis, "window", { configurable: true, value: dom.window });
  Object.defineProperty(globalThis, "document", { configurable: true, value: dom.window.document });
  Object.defineProperty(globalThis, "navigator", { configurable: true, value: dom.window.navigator });
  Object.defineProperty(globalThis, "HTMLElement", { configurable: true, value: dom.window.HTMLElement });
  Object.defineProperty(globalThis, "Event", { configurable: true, value: dom.window.Event });
  Object.defineProperty(globalThis, "MouseEvent", { configurable: true, value: dom.window.MouseEvent });

  return () => {
    restoreGlobal("window", previousWindow);
    restoreGlobal("document", previousDocument);
    restoreGlobal("navigator", previousNavigator);
    restoreGlobal("HTMLElement", previousHTMLElement);
    restoreGlobal("Event", previousEvent);
    restoreGlobal("MouseEvent", previousMouseEvent);
  };
}

function click(dom: JSDOM, selector: string): void {
  const element = dom.window.document.querySelector(selector);
  assert.ok(element instanceof HTMLElement);
  flushSync(() => {
    element.dispatchEvent(new MouseEvent("click", { bubbles: true }));
  });
}

function text(dom: JSDOM, selector: string): string {
  const element = dom.window.document.querySelector(selector);
  assert.ok(element);
  return element.textContent ?? "";
}

function restoreGlobal(key: string, descriptor: PropertyDescriptor | undefined): void {
  if (descriptor === undefined) {
    // SAFETY: Runtime checks or construction above establish keyof typeof globalThis].
    delete globalThis[key as keyof typeof globalThis];
  } else {
    Object.defineProperty(globalThis, key, descriptor);
  }
}

async function settleReactClient(): Promise<void> {
  await new Promise<void>((resolve) => {
    setTimeout(resolve, 0);
  });
  await new Promise<void>((resolve) => {
    setImmediate(resolve);
  });
}
