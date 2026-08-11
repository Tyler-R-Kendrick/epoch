import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";

const ROOT = join(process.cwd(), "docs/design-explorations/nightboard");

type BrowserWindow = Record<string, unknown>;

function load(name: string, window: BrowserWindow): void {
  const source = readFileSync(join(ROOT, name), "utf8");
  new Function("window", "document", source)(window, window.document ?? {});
}

export async function runNightboardNavigationRuntimeTests(): Promise<void> {
  const window: BrowserWindow = {
    location: { origin: "https://epoch.example", pathname: "/board.html", search: "" },
    URL,
    URLSearchParams,
    document: {},
  };
  load("navigation.js", window);
  const nav = window.NB_NAV as {
    canonicalLocation(input: Record<string, unknown>): Record<string, unknown>;
    parseLocation(url: string): Record<string, unknown>;
    resolveDeterministic(cwd: string, input: string, candidates: readonly Record<string, unknown>[]): Record<string, unknown>;
    rankJumpCandidates(terms: string, candidates: readonly Record<string, unknown>[], visits?: readonly Record<string, unknown>[]): readonly Record<string, unknown>[];
    createLayerStack(onStatus?: (message: string) => void): {
      push(layer: Record<string, unknown>): void;
      cancelTop(): Record<string, unknown> | null;
      top(): Record<string, unknown> | null;
      status(): string;
    };
    createHistory(adapter: {
      pushState(state: unknown, unused: string, url: string): void;
      replaceState(state: unknown, unused: string, url: string): void;
    }): {
      commit(location: Record<string, unknown>, options?: { replace?: boolean }): boolean;
    };
  };

  const canonical = nav.canonicalLocation({
    projectionId: "proj:mentions",
    objectId: "msg-001",
    revision: "cid-2",
    aliasPath: "/private/DO_NOT_LEAK_7f3c",
  });
  assert.equal(canonical.objectId, "msg-001", "NAV-ID-005 keeps canonical identity");
  assert.equal(canonical.projectionId, "proj:mentions", "NAV-ID-005 keeps contextual projection");
  assert.ok(!JSON.stringify(canonical).includes("DO_NOT_LEAK_7f3c"), "NAV-ID-004 strips private aliases");
  const parsed = nav.parseLocation("https://epoch.example/board.html?projection=proj%3Amentions&focus=msg-001");
  assert.equal(parsed.objectId, "msg-001", "NAV-ROUTE-002 parses stable focused object");
  assert.equal(parsed.projectionId, "proj:mentions");

  const paths = [
    { id: "local-general", path: "/projects/community/channels/general", label: "general", group: "CURRENT", kind: "channel" },
    { id: "global-generate", path: "/projects/tools/channels/generators", label: "generators", group: "GLOBAL", kind: "channel" },
  ];
  const ambiguous = nav.resolveDeterministic("/projects/community", "gen", paths);
  assert.equal(ambiguous.ok, false, "NAV-JUMP-001 cd must fail for partial fuzzy input");
  assert.equal(ambiguous.reason, "not-found");
  const exact = nav.resolveDeterministic("/projects/community", "/projects/community/channels/general", paths);
  assert.equal(exact.ok, true);
  const ranked = nav.rankJumpCandidates("general", paths, [{ id: "local-general", visitedAt: 10, count: 2 }]);
  assert.equal(ranked[0]?.id, "local-general", "NAV-JUMP-002 exact jump ranks first");
  assert.equal(ranked[0]?.matchReason, "exact");

  const statuses: string[] = [];
  const layers = nav.createLayerStack((message) => statuses.push(message));
  layers.push({ id: "thread", label: "thread", escapeLabel: "close thread" });
  layers.push({ id: "help", label: "help", escapeLabel: "close help" });
  layers.push({ id: "completion", label: "suggestions", escapeLabel: "close suggestions" });
  assert.equal(layers.status(), "Esc: close suggestions", "NAV-LAYER-003 predicts the immediate result");
  assert.equal(layers.cancelTop()?.id, "completion", "NAV-LAYER-001 closes one layer");
  assert.equal(layers.top()?.id, "help", "NAV-LAYER-001 leaves lower layers intact");
  assert.ok(statuses.at(-1)?.includes("close help"), "focus/status returns to the next layer");

  const historyCalls: Array<{ type: string; state: unknown; url: string }> = [];
  const history = nav.createHistory({
    pushState(state, _unused, url) { historyCalls.push({ type: "push", state, url }); },
    replaceState(state, _unused, url) { historyCalls.push({ type: "replace", state, url }); },
  });
  assert.equal(history.commit({ projectionId: "proj:channel:general", objectId: "msg-001", focusRegion: "feed" }), true);
  assert.equal(history.commit({ projectionId: "proj:channel:general", objectId: "msg-001", focusRegion: "feed" }), false,
    "NAV-ROUTE-003 identical/ephemeral state does not add history");
  assert.equal(historyCalls.length, 1);
  assert.ok(!JSON.stringify(historyCalls).includes("DO_NOT_LEAK_7f3c"), "NAV-ID-004 history stays privacy-safe");

  load("action-registry.js", window);
  const actions = window.NB_ACTIONS as {
    register(descriptor: Record<string, unknown>): void;
    invoke(actionId: string, input: unknown, context: Record<string, unknown>): Promise<unknown>;
    resolve(origin: string, alias: string): string | null;
    lastEvent(): Record<string, unknown> | null;
    commandCatalog(): readonly Record<string, unknown>[];
    mcpCatalog(): readonly Record<string, unknown>[];
    migrateMacro(input: Record<string, unknown>): Record<string, unknown>;
  };
  const executions: unknown[] = [];
  actions.register({
    actionId: "view.open",
    label: "Open view",
    description: "Open a saved projection",
    contexts: ["board"],
    sideEffect: "local",
    commandAliases: ["view-open"],
    slashAliases: ["/view-open"],
    keyBindings: [{ key: "v", contexts: ["board"] }],
    voiceAliases: ["open saved view"],
    mcp: { toolName: "board_view_open", inputSchema: { type: "object" } },
    execute(input: unknown) { executions.push(input); return { ok: true, input }; },
  });
  for (const [origin, alias] of [
    ["cli", "view-open"], ["slash", "/view-open"], ["voice", "open saved view"], ["mcp", "board_view_open"],
  ]) {
    assert.equal(actions.resolve(origin, alias), "view.open", `NAV-ACTION-001 ${origin} resolves one action ID`);
    await actions.invoke("view.open", { projectionId: "saved-1", privateText: "DO_NOT_LEAK_7f3c" }, { origin, projectionId: "saved-1" });
    const event = actions.lastEvent();
    assert.equal(event?.actionId, "view.open");
    assert.equal(event?.origin, origin);
    assert.ok(!JSON.stringify(event).includes("DO_NOT_LEAK_7f3c"), "NAV-ID-004 action telemetry omits private input");
  }
  assert.equal(executions.length, 4);
  assert.equal(actions.commandCatalog()[0]?.actionId, "view.open", "NAV-ACTION-004 command catalog derives from registry");
  assert.equal(actions.mcpCatalog()[0]?.actionId, "view.open", "NAV-ACTION-004 MCP catalog derives from registry");
  const migratedMacro = actions.migrateMacro({ name: "daily", commands: ["view-open saved-1"], voice: "open daily" });
  assert.deepEqual(migratedMacro.actionIds, ["view.open"], "NAV-ACTION-003 legacy macro resolves action IDs");

  const storage = new Map<string, string>();
  const sessionWindow: BrowserWindow = {
    localStorage: {
      getItem(key: string) { return storage.get(key) ?? null; },
      setItem(key: string, value: string) { storage.set(key, value); },
      removeItem(key: string) { storage.delete(key); },
    },
    location: { reload() {} },
    crypto: { getRandomValues(bytes: Uint8Array) { bytes.fill(7); return bytes; } },
    NB_DATA: { spaces: [] },
  };
  load("session.js", sessionWindow);
  const session = sessionWindow.NB_SESSION as {
    migrateBoardState(value: Record<string, unknown>): Record<string, unknown>;
    BOARD_SCHEMA_VERSION: number;
  };
  const previous = {
    path: "/projects/community/channels/general",
    sessions: [{ path: "/projects/community/channels/general", cursor: 2, draft: "keep me" }],
    threadFocus: "p3",
  };
  const migrated = session.migrateBoardState(previous);
  const migratedAgain = session.migrateBoardState(migrated);
  assert.equal(migrated.schemaVersion, session.BOARD_SCHEMA_VERSION, "NAV-MIGRATE-002 versions board state");
  assert.deepEqual(migratedAgain, migrated, "NAV-MIGRATE-002 migration is idempotent");
  assert.equal((migrated.sessions as Array<Record<string, unknown>>)[0]?.draft, "keep me");

  console.log("nightboard navigation runtime tests passed");
}
