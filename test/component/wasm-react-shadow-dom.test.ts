import assert from "node:assert/strict";
import { JSDOM } from "jsdom";
import React from "react";
import { createRoot } from "react-dom/client";
import { flushSync } from "react-dom";
import { createEpochReactStore, createMemoryEpochReactStorage, useEpochState } from "@epoch/wasm-react";

interface CounterState {
  count: number;
}

export async function runWasmReactShadowDomTests(): Promise<void> {
  const dom = new JSDOM("<!doctype html><main id=\"host\"></main>", { url: "https://epoch.local/" });
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
    await rendersHookUpdatesInsideShadowDom(dom);
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

async function rendersHookUpdatesInsideShadowDom(dom: JSDOM): Promise<void> {
  const host = dom.window.document.getElementById("host");
  assert.ok(host);
  const shadow = host.attachShadow({ mode: "open" });
  const storage = createMemoryEpochReactStorage();
  const store = createEpochReactStore<CounterState>({
    entity: "counter",
    initialState: { count: 0 },
    storage,
    storageKey: "epoch:counter",
  });

  function Counter(): React.ReactElement {
    const [state, setState, epoch] = useEpochState(store);
    return React.createElement("section", { "aria-label": "Epoch counter" },
      React.createElement("output", { id: "count" }, `count: ${state.count}`),
      React.createElement("button", { id: "increment", onClick: () => setState((current) => ({ count: current.count + 1 })) }, "increment"),
      React.createElement("button", { id: "rewind", onClick: () => epoch.rewind(2) }, "rewind"),
      React.createElement("button", { id: "materialize", onClick: () => setState({ count: 5 }) }, "materialize"),
    );
  }

  const root = createRoot(shadow);
  flushSync(() => root.render(React.createElement(Counter)));
  assert.equal(text(shadow, "#count"), "count: 0");

  click(shadow, "#increment");
  click(shadow, "#increment");
  assert.equal(text(shadow, "#count"), "count: 2");

  click(shadow, "#rewind");
  assert.equal(text(shadow, "#count"), "count: 1");

  click(shadow, "#materialize");
  assert.equal(text(shadow, "#count"), "count: 5");
  assert.match(storage.getItem("epoch:counter") ?? "", /"count"/u);

  flushSync(() => root.unmount());
  await settleReactClient();
}

function click(root: ShadowRoot, selector: string): void {
  const element = root.querySelector(selector);
  assert.ok(element instanceof HTMLElement);
  flushSync(() => {
    element.dispatchEvent(new MouseEvent("click", { bubbles: true }));
  });
}

function text(root: ShadowRoot, selector: string): string {
  const element = root.querySelector(selector);
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
  await new Promise<void>((resolve) => {
    setImmediate(resolve);
  });
}
