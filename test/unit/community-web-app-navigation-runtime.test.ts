import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";

const ROOT = join(process.cwd(), "packages/Epoch.Community.Web/app");

type BrowserConstructor = abstract new (...args: never[]) => object;
type BrowserFunction = (...args: never[]) => BrowserValue | Readonly<object> | void;
type BrowserValue = boolean | null | number | string | BrowserConstructor | BrowserWindow | BrowserFunction | readonly BrowserValue[] | undefined;
interface BrowserWindow {
  [key: string]: BrowserValue;
}

function load(name: string, window: BrowserWindow): void {
  const source = readFileSync(join(ROOT, name), "utf8");
  new Function("window", "document", source)(window, window.document ?? {});
}

export async function runCommunityWebAppNavigationRuntimeTests(): Promise<void> {
  const window: BrowserWindow = {
    location: { origin: "https://epoch.example", pathname: "/board.html", search: "" },
    URL,
    URLSearchParams,
    document: {},
  };
  load("navigation.js", window);
  // SAFETY: Runtime checks or construction above establish {.
  const nav = window.CW_NAV as {
    canonicalLocation(input: BrowserWindow): BrowserWindow;
    parseLocation(url: string): BrowserWindow;
    resolveDeterministic(cwd: string, input: string, candidates: readonly BrowserWindow[]): BrowserWindow;
    rankJumpCandidates(terms: string, candidates: readonly BrowserWindow[], visits?: readonly BrowserWindow[]): readonly BrowserWindow[];
    createLayerStack(onStatus?: (message: string) => void): {
      push(layer: BrowserWindow): void;
      cancelTop(): BrowserWindow | null;
      top(): BrowserWindow | null;
      status(): string;
    };
    createHistory(adapter: {
      pushState(state: BrowserValue, unused: string, url: string): void;
      replaceState(state: BrowserValue, unused: string, url: string): void;
    }): {
      commit(location: BrowserWindow, options?: { replace?: boolean }): boolean;
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
  layers.cancelTop();
  layers.cancelTop();
  assert.equal(layers.cancelTop(), null, "NAV-LAYER-002 Escape with no layer does not perform ancestry or history");

  const historyCalls: Array<{ type: string; state: BrowserValue; url: string }> = [];
  const history = nav.createHistory({
    pushState(state, _unused, url) { historyCalls.push({ type: "push", state, url }); },
    replaceState(state, _unused, url) { historyCalls.push({ type: "replace", state, url }); },
  });
  assert.equal(history.commit({ projectionId: "proj:channel:general", objectId: "msg-001", focusRegion: "feed" }), true);
  assert.equal(history.commit({ projectionId: "proj:channel:general", objectId: "msg-001", focusRegion: "feed" }), false,
    "NAV-ROUTE-003 identical/ephemeral state does not add history");
  assert.equal(historyCalls.length, 1);
  assert.ok(!JSON.stringify(historyCalls).includes("DO_NOT_LEAK_7f3c"), "NAV-ID-004 history stays privacy-safe");
  for (const location of [
    { projectionId: "proj:thread", objectId: "msg-001", threadRootId: "msg-001" },
    { projectionId: "proj:saved", objectId: "msg-001", savedViewId: "saved-1" },
    { projectionId: "proj:dm", objectId: "dm-001" },
  ]) history.commit(location);
  assert.equal(historyCalls.length, 4, "NAV-ROUTE-001 meaningful channel thread saved-view and DM states are distinct");

  const chooser = nav.rankJumpCandidates("gen", [
    { id: "current", path: "/current/general", label: "general", group: "CURRENT", kind: "channel" },
    { id: "saved", path: "/views/general", label: "general review", group: "SAVED VIEWS", kind: "saved-view" },
    { id: "global", path: "/global/generators", label: "generators", group: "GLOBAL", kind: "channel" },
  ]);
  assert.deepEqual(new Set(chooser.map((candidate) => candidate.group)), new Set(["CURRENT", "SAVED VIEWS", "GLOBAL"]),
    "NAV-JUMP-003 interactive chooser exposes grouped candidates before acceptance");
  assert.equal(nav.resolveDeterministic("/current", "gen", paths).ok, false,
    "NAV-JUMP-004 deterministic navigate fails where ranked jump returns candidates");
  assert.ok(chooser.length > 0, "NAV-JUMP-004 fuzzy jump returns ranked candidates");

  load("action-registry.js", window);
  // SAFETY: Runtime checks or construction above establish {.
  const actions = window.CW_ACTIONS as BrowserWindow & {
    register(descriptor: BrowserWindow): void;
    invoke(actionId: string, input: BrowserValue, context: BrowserWindow): Promise<BrowserValue>;
    resolve(origin: string, alias: string): string | null;
    lastEvent(): BrowserWindow | null;
    commandCatalog(): readonly BrowserWindow[];
    mcpCatalog(): readonly BrowserWindow[];
    migrateMacro(input: BrowserWindow): BrowserWindow;
  };
  const executions: BrowserValue[] = [];
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
    execute(input: BrowserValue) { executions.push(input); return { ok: true, input }; },
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
  let permissionChecks = 0;
  let permissionedExecutions = 0;
  actions.register({
    actionId: "post.voteUp",
    label: "Upvote post",
    description: "Permissioned post action",
    contexts: ["board"],
    sideEffect: "shared",
    permission: "community.participate",
    execute() { permissionedExecutions += 1; return { ok: true }; },
  });
  await assert.rejects(actions.invoke("post.voteUp", { objectId: "p1" }, {
    origin: "keyboard",
    context: "board",
    authorize() { permissionChecks += 1; return false; },
  }), /permission denied/u, "NAV-ACTION-002 denied post actions fail before execution");
  assert.equal(permissionChecks, 1, "NAV-ACTION-002 permission is decided once per invocation");
  assert.equal(permissionedExecutions, 0, "NAV-ACTION-002 denied action never executes");
  await actions.invoke("post.voteUp", { objectId: "p1" }, {
    origin: "pointer",
    context: "board",
    authorize() { permissionChecks += 1; return true; },
  });
  assert.equal(permissionChecks, 2, "NAV-ACTION-002 pointer uses the same single permission decision");
  assert.equal(permissionedExecutions, 1, "NAV-ACTION-002 authorized action executes exactly once");
  const migratedMacro = actions.migrateMacro({ name: "daily", commands: ["view-open saved-1"], voice: "open daily" });
  assert.deepEqual(migratedMacro.actionIds, ["view.open"], "NAV-ACTION-003 legacy macro resolves action IDs");

  const mcpWindow: BrowserWindow = {
    document: {},
  };
  let mcpAllowed = false;
  let mcpWrites = 0;
  mcpWindow.CW_APP = {
    actionContext(origin: string) {
      return {
        origin,
        context: "board",
        authorize(permission: string) {
          return permission === "community.participate" && mcpAllowed;
        },
      };
    },
    executeAction(actionId: string) {
      assert.equal(actionId, "compose.publish");
      mcpWrites += 1;
      return { ok: true };
    },
  };
  load("action-registry.js", mcpWindow);
  load("actions.js", mcpWindow);
  load("webmcp.js", mcpWindow);
  // SAFETY: Runtime checks or construction above establish {.
  const mcp = mcpWindow.CW_MCP as BrowserWindow & {
    registerTool(descriptor: BrowserWindow): void;
    call(name: string, input: BrowserValue): Promise<BrowserWindow>;
  };
  // SAFETY: Runtime checks or construction above establish {.
  const mcpActions = mcpWindow.CW_ACTIONS as BrowserWindow & {
    resolve(origin: string, alias: string): string | null;
    get(actionId: string): BrowserWindow | null;
  };
  mcp.registerTool({
    name: "board_post",
    description: "Publish a message",
    inputSchema: { type: "object" },
    execute() { mcpWrites += 1; return { ok: true }; },
  });
  const deniedPost = await mcp.call("board_post", { body: "denied" });
  assert.equal(deniedPost.isError, true,
    "NAV-ACTION-002 WebMCP cannot bypass a denied participation policy");
  assert.equal(mcpWrites, 0, "NAV-ACTION-002 denied MCP mutation does not execute");
  assert.equal(mcpActions.resolve("mcp", "board_post"), "compose.publish");
  assert.equal(mcpActions.get("compose.publish")?.sideEffect, "shared");
  assert.equal(mcpActions.get("compose.publish")?.permission, "community.participate");
  for (const toolName of ["board_create_channel", "board_rename_channel", "board_create_project"]) {
    const actionId = mcpActions.resolve("mcp", toolName);
    assert.ok(actionId, `NAV-ACTION-004 ${toolName} has a canonical action descriptor`);
    assert.equal(mcpActions.get(actionId)?.permission, "community.participate");
  }
  mcpAllowed = true;
  const allowedPost = await mcp.call("board_post", { body: "allowed" });
  assert.notEqual(allowedPost.isError, true,
    "NAV-ACTION-002 authorized WebMCP uses the same canonical action");
  assert.equal(mcpWrites, 1);

  const storage = new Map<string, string>();
  const sessionWindow: BrowserWindow = {
    localStorage: {
      getItem(key: string) { return storage.get(key) ?? null; },
      setItem(key: string, value: string) { storage.set(key, value); },
      removeItem(key: string) { storage.delete(key); },
    },
    location: { reload() {} },
    crypto: { getRandomValues(bytes: Uint8Array) { bytes.fill(7); return bytes; } },
    CW_DATA: { spaces: [] },
  };
  load("session.js", sessionWindow);
  // SAFETY: Runtime checks or construction above establish {.
  const session = sessionWindow.CW_SESSION as {
    migrateBoardState(value: BrowserValue): BrowserWindow;
    loadBoardState(): BrowserWindow | null;
    exportBoardState(): string | null;
    clearBoardState(): void;
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
  // SAFETY: Runtime checks or construction above establish Array<Record<string.
  assert.equal((migrated.sessions as Array<BrowserWindow>)[0]?.draft, "keep me");
  const isolated = session.migrateBoardState({ sessions: [
    { id: "one", path: "/one", history: ["cd /one"], draft: "first" },
    { id: "two", path: "/two", history: ["cd /two"], draft: "second" },
  ] });
  // SAFETY: Runtime checks or construction above establish Array<Record<string.
  assert.notDeepEqual((isolated.sessions as Array<BrowserWindow>)[0],
    // SAFETY: Runtime checks or construction above establish Array<Record<string.
    (isolated.sessions as Array<BrowserWindow>)[1],
    "NAV-ROUTE-004 workspace histories drafts and focus remain isolated");
  const malformed = session.migrateBoardState(null);
  // SAFETY: Runtime checks or construction above establish Record<string.
  assert.equal((malformed.recovery as BrowserWindow).reason, "malformed",
    "NAV-MIGRATE-004 malformed persisted state fails safely with recovery guidance");
  // SAFETY: Runtime checks or construction above establish Record<string.
  assert.deepEqual((malformed.recovery as BrowserWindow).actions, ["export", "reset"],
    "NAV-MIGRATE-004 recovery exposes explicit export and reset actions");
  storage.set("cw-board-state", "{broken-json");
  // SAFETY: Runtime checks or construction above establish Record<string.
  assert.equal((session.loadBoardState()?.recovery as BrowserWindow).reason, "malformed");
  assert.equal(session.exportBoardState(), "{broken-json",
    "NAV-MIGRATE-004 malformed state remains exportable until explicit reset");
  session.clearBoardState();
  assert.equal(session.exportBoardState(), null, "NAV-MIGRATE-004 reset explicitly clears the saved state");

  console.log("Community Web app navigation runtime tests passed");
}
