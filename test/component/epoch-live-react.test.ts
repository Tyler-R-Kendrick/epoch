import assert from "node:assert/strict";
import { JSDOM } from "jsdom";
import React from "react";
import { createRoot } from "react-dom/client";
import { flushSync } from "react-dom";
import { createLiveStore, type LiveStore } from "@epoch/live";
import { useLiveHistory, useLiveSelector, useLiveStore, usePresence } from "@epoch/live-react";

interface CounterState {
  readonly count?: number;
  readonly [key: string]: unknown;
}

export async function runEpochLiveReactTests(): Promise<void> {
  const dom = new JSDOM('<!doctype html><main id="host"></main>', { url: "https://epoch.local/" });
  const previousWindow = globalThis.window;
  const previousDocument = globalThis.document;
  const previousNavigator = globalThis.navigator;
  const previousHTMLElement = globalThis.HTMLElement;
  const previousEvent = globalThis.Event;
  const previousMouseEvent = globalThis.MouseEvent;

  Object.defineProperty(globalThis, "window", { configurable: true, value: dom.window });
  Object.defineProperty(globalThis, "document", { configurable: true, value: dom.window.document });
  Object.defineProperty(globalThis, "navigator", { configurable: true, value: dom.window.navigator });
  Object.defineProperty(globalThis, "HTMLElement", { configurable: true, value: dom.window.HTMLElement });
  Object.defineProperty(globalThis, "Event", { configurable: true, value: dom.window.Event });
  Object.defineProperty(globalThis, "MouseEvent", { configurable: true, value: dom.window.MouseEvent });

  try {
    await rendersLiveStoreHooks(dom);
  } finally {
    restoreGlobal("window", previousWindow);
    restoreGlobal("document", previousDocument);
    restoreGlobal("navigator", previousNavigator);
    restoreGlobal("HTMLElement", previousHTMLElement);
    restoreGlobal("Event", previousEvent);
    restoreGlobal("MouseEvent", previousMouseEvent);
    dom.window.close();
  }
}

async function rendersLiveStoreHooks(dom: JSDOM): Promise<void> {
  const host = dom.window.document.getElementById("host");
  assert.ok(host);
  const store: LiveStore<CounterState> = createLiveStore<CounterState>({
    entity: "counter",
    author: "ui",
    initialState: { count: 0 },
  });

  function App(): React.ReactElement {
    const [state, dispatch, controls] = useLiveStore(store);
    const count = useLiveSelector(store, (current) => current.count ?? 0);
    const peers = usePresence(store);
    const history = useLiveHistory(store);
    const localPresence = peers.find((peer) => peer.author === "ui");
    return React.createElement(
      "section",
      null,
      React.createElement("output", { id: "count" }, `count: ${count}`),
      React.createElement("output", { id: "title" }, `title: ${String(state.title ?? "")}`),
      React.createElement("output", { id: "events" }, `events: ${history.length}`),
      React.createElement("output", { id: "undo" }, `undo: ${controls.canUndo}`),
      React.createElement("output", { id: "presence" }, `presence: ${JSON.stringify(localPresence?.state ?? {})}`),
      React.createElement("button", { id: "inc", onClick: () => dispatch({ type: "inc", payload: { count: count + 1 } }) }, "inc"),
      React.createElement("button", { id: "rollback", onClick: () => controls.rollbackTo(1, "revert") }, "rollback"),
      React.createElement("button", { id: "undo-btn", onClick: () => controls.undo() }, "undo"),
      React.createElement("button", { id: "presence-btn", onClick: () => store.presence.set({ typing: true }) }, "presence"),
    );
  }

  const root = createRoot(host);
  flushSync(() => root.render(React.createElement(App)));
  assert.equal(text(dom, "#count"), "count: 0");
  assert.equal(text(dom, "#undo"), "undo: false", "undo floor is the initial state");

  click(dom, "#inc");
  click(dom, "#inc");
  assert.equal(text(dom, "#count"), "count: 2", "selector reflects dispatched state");
  assert.equal(text(dom, "#undo"), "undo: true");

  click(dom, "#undo-btn");
  assert.equal(text(dom, "#count"), "count: 1", "undo hook reverts one step");

  click(dom, "#rollback");
  assert.equal(text(dom, "#count"), "count: 0", "rollback hook restores the seeded state");

  click(dom, "#presence-btn");
  assert.equal(text(dom, "#presence"), 'presence: {"typing":true}', "presence hook reflects local awareness");

  assert.match(text(dom, "#events"), /events: [1-9]/u, "history hook exposes the signed log");

  flushSync(() => root.unmount());
  await settleReactClient();
}

function click(dom: JSDOM, selector: string): void {
  const element = dom.window.document.querySelector(selector);
  assert.ok(element instanceof dom.window.HTMLElement);
  flushSync(() => {
    element.dispatchEvent(new dom.window.MouseEvent("click", { bubbles: true }));
  });
}

function text(dom: JSDOM, selector: string): string {
  const element = dom.window.document.querySelector(selector);
  assert.ok(element);
  return element.textContent ?? "";
}

function restoreGlobal(key: string, value: unknown): void {
  Object.defineProperty(globalThis, key, { configurable: true, value });
}

async function settleReactClient(): Promise<void> {
  await new Promise<void>((resolve) => {
    setTimeout(resolve, 0);
  });
  await new Promise<void>((resolve) => {
    setImmediate(resolve);
  });
}
