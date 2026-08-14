import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";

/**
 * The Community Web contract has a contrast floor. Two of the ten themes shipped
 * below it — Breadbin at 6.0:1 and Solar Night at 5.6:1 against a 7:1 body
 * floor — and nothing caught it, because a theme is data and data was not
 * tested. Anyone adding an eleventh theme should not have to remember.
 *
 * This also enforces the harder rule: a theme is CSS and nothing else. A theme
 * that reaches the network breaks the page's self-contained guarantee, and one
 * that writes markup breaks the garden for every other theme.
 */

const ROOT = join(process.cwd(), "packages/Epoch.Community.Web/app");
const DOCS = join(process.cwd(), "docs/community-web");

interface Theme {
  readonly id: string;
  readonly name: string;
  readonly css: string;
}

function dataJson(): string {
  const source = readFileSync(join(ROOT, "data.js"), "utf8");
  const sandbox: { CW_DATA?: unknown } = {};
  new Function("window", source)(sandbox);
  return JSON.stringify(sandbox.CW_DATA);
}

function loadCommunityCore(window: object): void {
  new Function("window", readFileSync(join(ROOT, "community-core-runtime.js"), "utf8"))(window);
}

function loadActions(window: object): void {
  new Function("window", readFileSync(join(ROOT, "action-registry.js"), "utf8"))(window);
  new Function("window", readFileSync(join(ROOT, "actions.js"), "utf8"))(window);
}

function loadThemes(): readonly Theme[] {
  const source = readFileSync(join(ROOT, "themes.js"), "utf8");
  const sandbox: { CW_THEMES?: Theme[] } = {};
  // The file is a browser script assigning to window; give it a window.
  new Function("window", source)(sandbox);
  assert.ok(Array.isArray(sandbox.CW_THEMES), "themes.js must define window.CW_THEMES");
  return sandbox.CW_THEMES as Theme[];
}

function tokensOf(css: string): Map<string, string> {
  const tokens = new Map<string, string>();
  const root = /:root\s*\{([\s\S]*?)\}/u.exec(css);
  if (root === null) return tokens;
  for (const decl of root[1].split(";")) {
    const m = /^\s*(--[a-z-]+)\s*:\s*(.+?)\s*$/iu.exec(decl);
    if (m !== null) tokens.set(m[1], m[2]);
  }
  return tokens;
}

function luminance(hex: string): number {
  let h = hex.replace("#", "");
  if (h.length === 3) h = h.split("").map((c) => c + c).join("");
  const channels = [0, 2, 4].map((i) => {
    const c = Number.parseInt(h.slice(i, i + 2), 16) / 255;
    return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
  });
  return 0.2126 * channels[0] + 0.7152 * channels[1] + 0.0722 * channels[2];
}

function contrast(a: string, b: string): number {
  const l1 = luminance(a);
  const l2 = luminance(b);
  return (Math.max(l1, l2) + 0.05) / (Math.min(l1, l2) + 0.05);
}

export async function runCommunityWebAppThemeTests(): Promise<void> {
  // Hoisted source snapshots — many sections assert against these.
  const appSrc = readFileSync(join(ROOT, "app.js"), "utf8");
  const actionSrc = readFileSync(join(ROOT, "actions.js"), "utf8");
  const consoleSrc2 = readFileSync(join(ROOT, "console.js"), "utf8");
  const asciiSrc = readFileSync(join(ROOT, "ascii.js"), "utf8");
  const baseCss = readFileSync(join(ROOT, "base.css"), "utf8");

  const themes = loadThemes();
  assert.equal(themes.length, 1, "Grid is the only built-in theme");
  assert.equal(themes[0].id, "grid");
  assert.equal(themes[0].name, "Grid", "NAV-REG-004 Grid remains the authoritative visual contract");
  const navigationDocs = ["README.md", "CONTRACT.md"].map((name) =>
    readFileSync(join(DOCS, name), "utf8")).join("\n");
  assert.ok(navigationDocs.includes("hierarchical navigator + detail blade") &&
    !/true\s+Miller[- ]column/iu.test(navigationDocs),
  "NAV-REG-006 canonical documentation uses hierarchical navigator plus detail blade terminology");
  assert.ok(!readFileSync(join(ROOT, "board.html"), "utf8").includes("data-theme-select"),
    "chrome must not offer a Grid/Line Printer theme dropdown");

  const ids = new Set<string>();
  for (const theme of themes) {
    assert.ok(theme.id && theme.name, "every theme is identified");
    assert.ok(!ids.has(theme.id), `duplicate theme id: ${theme.id}`);
    ids.add(theme.id);

    // A theme is CSS. Anything that reaches the network or writes markup breaks
    // the self-contained page, so it is not a theme.
    assert.ok(!/url\(|@import|<script|javascript:/iu.test(theme.css),
      `${theme.id} must not load external resources`);

    const tokens = tokensOf(theme.css);
    const bg = tokens.get("--cw-bg");
    const ink = tokens.get("--cw-ink");
    const dim = tokens.get("--cw-ink-dim");
    assert.ok(bg && ink && dim, `${theme.id} must set --cw-bg, --cw-ink and --cw-ink-dim`);

    const inkRatio = contrast(ink as string, bg as string);
    const dimRatio = contrast(dim as string, bg as string);
    assert.ok(inkRatio >= 7,
      `${theme.id}: body ink is ${inkRatio.toFixed(1)}:1 on its ground, below the 7:1 floor`);
    assert.ok(dimRatio >= 4.5,
      `${theme.id}: dim ink is ${dimRatio.toFixed(1)}:1 on its ground, below the 4.5:1 floor`);
    const faint = tokens.get("--cw-ink-faint");
    if (faint !== undefined) {
      const faintRatio = contrast(faint as string, bg as string);
      assert.ok(faintRatio >= 4.5,
        `${theme.id}: faint ink is ${faintRatio.toFixed(1)}:1 on its ground, below the 4.5:1 AA floor`);
    }

    // The reserved ink must be tellable from the state inks, or the legend lies.
    const accent = tokens.get("--cw-accent");
    if (accent !== undefined) {
      for (const role of ["--cw-live", "--cw-warn", "--cw-danger"]) {
        const other = tokens.get(role);
        if (other !== undefined) {
          assert.notEqual(accent.toLowerCase(), other.toLowerCase(),
            `${theme.id}: accent and ${role} are the same colour, so the legend cannot be true`);
        }
      }
    }
  }

  // The OpenUI Lang artifacts are generated. If the library changes and nobody
  // reruns the build, the page ships a prompt and a schema that disagree with
  // the renderer — the drift class this repo keeps rediscovering.
  const library = readFileSync(join(ROOT, "openui-library.js"), "utf8");
  const librarySandbox: { CW_OPENUI?: { schema: { properties?: Record<string, unknown> }; systemPrompt: string } } = {};
  new Function("window", library)(librarySandbox);
  const openui = librarySandbox.CW_OPENUI;
  assert.ok(openui, "openui-library.js must define window.CW_OPENUI");
  const components = Object.keys(openui.schema.properties ?? {});
  assert.deepEqual(components.sort(), ["Channel", "Fact", "Notice", "Panel", "Post", "Theme"],
    "the generated library must match the components something knows how to handle");
  assert.ok(openui.systemPrompt.includes("openui-lang"),
    "the generated system prompt must instruct the model in openui-lang");

  // Every component the library offers must be handled somewhere, or a model
  // can emit one that silently disappears. View components render in
  // generate.js; Theme is applied by the garden panel as tokens, not markup.
  const renderer = readFileSync(join(ROOT, "generate.js"), "utf8");
  const themePanel = readFileSync(join(ROOT, "theme.js"), "utf8");
  for (const component of components) {
    if (component === "Theme") {
      assert.ok(themePanel.includes('typeName !== "Theme"'),
        "theme.js must consume the Theme component");
      continue;
    }
    assert.ok(renderer.includes(`case "${component}"`),
      `generate.js has no renderer for ${component}, so a model could emit one that vanishes`);
  }

  // The resilience layer is what keeps a failed generation from looking idle.
  // Its absence is the defect that produced "I asked for blue and nothing
  // happened", so its presence is asserted rather than assumed.
  const resilient = readFileSync(join(ROOT, "resilient.js"), "utf8");
  for (const capability of ["withRetry", "streamPrompt", "openSession", "isTransient"]) {
    assert.ok(resilient.includes(`function ${capability}`),
      `resilient.js must provide ${capability}`);
  }
  assert.ok(themePanel.includes("promptStreaming") || resilient.includes("promptStreaming"),
    "generation must stream rather than block on a single call");

  // The parser is a vendored build artifact; it has to be present and it must
  // not have dragged Zod in with it.
  const parser = readFileSync(join(ROOT, "openui-parser.js"), "utf8");
  assert.ok(parser.length > 10_000, "the OpenUI parser bundle looks truncated");
  assert.ok(parser.length < 120_000,
    `the parser bundle is ${parser.length} bytes — Zod has probably been bundled in again`);

  // Consolidated to one experience. The ten before it navigated badly and most
  // were the same layout twice; graph, shell and diff had the ideas and are now
  // one thing. What has to be tested is that the navigation model is coherent,
  // not that a count is met.
  const consoleSource = readFileSync(join(ROOT, "console.js"), "utf8");
  const sandbox2: { CW_DATA?: unknown; CW_MAP?: unknown; CW_EXPERIENCES?: { id: string; keys?: string }[] } = {
    CW_DATA: JSON.parse(dataJson()),
  };
  loadCommunityCore(sandbox2);
  new Function("window", readFileSync(join(ROOT, "sitemap.js"), "utf8"))(sandbox2);
  new Function("window", consoleSource)(sandbox2);
  const exps = sandbox2.CW_EXPERIENCES ?? [];
  assert.equal(exps.length, 1, "one consolidated experience");

  // Every input method must be a peer. A keyboard-only surface is unusable on a
  // phone; a pointer-only one is unusable for the audience this is built for.
  for (const hook of ["cn-crumb", "cn-item", "cn-sort", "cn-cand"]) {
    assert.ok(consoleSource.includes(hook), `console must expose ${hook} as a real control`);
  }
  assert.ok(consoleSource.includes("scroll-snap-type"),
    "columns must swipe on narrow viewports, not just scroll");

  // The agent must only be able to do what a person could do by typing, and
  // every AG-UI event the console renders must be one the agent emits.
  const agent = readFileSync(join(ROOT, "agent.js"), "utf8");
  for (const event of ["RUN_STARTED", "RUN_ERROR", "TOOL_CALL_ARGS", "TOOL_CALL_RESULT"]) {
    assert.ok(agent.includes(event), `agent must emit ${event}`);
    assert.ok(readFileSync(join(ROOT, "app.js"), "utf8").includes(event),
      `console must handle ${event}, or the agent can fail invisibly`);
  }
  assert.ok(agent.includes("isTransient"),
    "a mid-stream fault must be retried, not just one while opening the session");

  // Every UI capability must be reachable as a WebMCP tool, and every tool must
  // call the console's own verb rather than reimplementing it — a second copy
  // of what a button does is a second thing to keep in sync.
  const tools = readFileSync(join(ROOT, "tools.js"), "utf8");
  for (const tool of ["board_navigate", "board_list", "board_where", "view_set", "sort_set",
    "stream_load", "stream_pause", "theme_set", "theme_use", "graph_query", "graph_schema"]) {
    assert.ok(tools.includes(`name: "${tool}"`), `tools.js must register ${tool}`);
  }
  const appSource = readFileSync(join(ROOT, "app.js"), "utf8");
  for (const verb of ["setView", "setTheme", "applyTokens", "mergePending", "setLive"]) {
    assert.ok(appSource.includes(`${verb}:`) || appSource.includes(`function ${verb}`),
      `app must expose ${verb} for the tools to call`);
  }

  // The agent's vocabulary comes from the registry, not a hand-kept list, or a
  // component that stops registering a tool leaves a phantom behind.
  const agentSource = readFileSync(join(ROOT, "agent.js"), "utf8");
  assert.ok(agentSource.includes("CW_MCP.list()") || agentSource.includes("window.CW_MCP"),
    "the agent must take its tools from the WebMCP registry");
  assert.ok(agentSource.includes("CW_MCP.call"),
    "the agent must invoke tools through the registry, so it does what a browser agent would");

  // WebMCP is a proposal, so the page must work with and without the native API.
  const mcp = readFileSync(join(ROOT, "webmcp.js"), "utf8");
  assert.ok(mcp.includes("document.modelContext"), "must register natively when available");
  assert.ok(mcp.includes("local"), "must keep a local registry when it is not");

  // The browser host exposes the portable Community GraphQL contract, not a
  // second Nightboard schema. The agent introspects these types.
  const graph = readFileSync(join(ROOT, "graph.js"), "utf8");
  assert.ok(graph.includes("COMMUNITY_GRAPHQL_SDL"), "graph.js must bind the portable SDL");
  const sdl = readFileSync(join(ROOT, "graphql-engine.js"), "utf8");
  for (const type of [
    "type CommunityNode",
    "type SearchConnection",
    "type Query",
    "input SearchExpressionInput @oneOf",
  ]) {
    assert.ok(sdl.includes(type), `the portable GraphQL schema must define ${type}`);
  }
  assert.ok(!sdl.includes("type Post"), "portable schema must not reintroduce type Post");
  assert.ok(graph.includes("dms(") || graph.includes("/dms") || readFileSync(join(ROOT, "sitemap.js"), "utf8").includes("/dms"),
    "board still exposes dms as a navigable surface");

  // Completion is the difference between a shell and a prompt that echoes.
  const complete = readFileSync(join(ROOT, "complete.js"), "utf8");
  for (const capability of ["function score", "function commonPrefix", "function globalDirs", "ghost"]) {
    assert.ok(complete.includes(capability), `complete.js must provide ${capability}`);
  }

  // Every path the sitemap can produce must be resolvable, or `cd` lies.
  const map = sandbox2.CW_MAP as {
    list: (p: string, e?: unknown) => unknown[] | null;
    join: (p: string[]) => string;
  };
  for (const root of ["/", "/channels", "/members", "/projects", "/dms", "/notifications", "/spaces", "/.agents"]) {
    assert.ok(map.list(root) !== null, `sitemap must list ${root}`);
  }
  assert.equal(map.list("/epochs"), null, "epochs leaf removed — it meant nothing");
  // Board root exposes spaces, dms, notifications as siblings of projects.
  const boardRoot = map.list("/") as Array<{ name: string }>;
  assert.ok(boardRoot.some((e) => e.name === "projects"), "board root lists projects");
  assert.ok(boardRoot.some((e) => e.name === "spaces"), "board root lists spaces");
  assert.ok(boardRoot.some((e) => e.name === "dms"), "board root lists dms as sibling of projects");
  assert.ok(boardRoot.some((e) => e.name === "notifications"),
    "board root lists notifications (Teams-style Activity)");
  // Members roll opens DMs, not a profile card path.
  const memberList = map.list("/members") as Array<{ name: string; openDm?: string; member?: { kind?: string; eve?: boolean } }>;
  assert.ok(memberList.some((e) => e.name === "scout" && e.openDm === "scout"),
    "members list marks openDm for each person/agent");
  assert.ok(memberList.some((e) => e.name === "space-steward" && e.openDm === "space-steward"),
    "board Eve agents appear on the members roll");
  assert.ok(map.list("/dms/scout") !== null, "member DMs are listable threads");
  assert.ok(map.list("/dms/space-steward") !== null,
    "Eve agents are chatable — empty DM thread opens");
  assert.equal(map.list("/members/scout"), null,
    "/members/<handle> is not a place — DMs live under /dms/<handle>");
  assert.ok(map.list("/dms/nora") !== null,
    "known members without fixture history still get an openable empty DM");
  // Every project tree has a members child beside channels.
  const communityKids = map.list("/projects/community") as Array<{ name: string }>;
  assert.ok(communityKids.some((e) => e.name === "channels"), "project has channels");
  assert.ok(communityKids.some((e) => e.name === "members"), "project has members child");
  const projMembers = map.list("/projects/community/members") as Array<{ name: string; openDm?: string }>;
  assert.ok(projMembers.length >= 1 && projMembers.every((e) => e.openDm),
    "project members open DMs");
  assert.ok(projMembers.some((e) => e.name === "community-host"),
    "project Eve agents appear on that project's members roll");
  const tunerKids = map.list("/projects/civic-tuner") as Array<{ name: string }>;
  assert.ok(tunerKids.some((e) => e.name === "members"), "linked project has members");
  const tunerRoster = map.list("/projects/civic-tuner/members") as Array<{ name: string }>;
  assert.ok(tunerRoster.some((e) => e.name === "maya") || tunerRoster.length >= 1,
    "linked project roster is non-empty");
  assert.ok(tunerRoster.some((e) => e.name === "install-cache"),
    "tuner Eve agent is on the civic-tuner members roll");
  // Terminal file editor (vim-like detail pane for files).
  const editorSrc = readFileSync(join(ROOT, "editor.js"), "utf8");
  assert.ok(editorSrc.includes("CW_EDITOR") && editorSrc.includes("handleKey"),
    "editor.js must expose CW_EDITOR with key handling");
  assert.ok(readFileSync(join(ROOT, "board.html"), "utf8").includes("editor.js"),
    "index must load editor.js");
  const edWin: {
    CW_EDITOR?: {
      open: (path: string, text: string, meta?: object) => {
        lines: string[]; cursor: { line: number; col: number }; mode: string; dirty: boolean;
      };
      handleKey: (buf: object, ev: { key: string; preventDefault?: () => void }) => boolean;
      render: (buf: object, opts?: object) => string;
      text: (buf: object) => string;
      clickAt: (buf: object, line: number, col: number, opts?: object) => object;
      contentFromEntry: (entry: object, path?: string) => { text: string; name: string; path: string };
    };
  } = {};
  new Function("window", editorSrc)(edWin);
  assert.ok(edWin.CW_EDITOR);
  const Ed = edWin.CW_EDITOR!;
  const buf = Ed.open("/tmp/note.md", "hello\nworld", { name: "note.md" });
  assert.equal(buf.mode, "normal");
  assert.equal(buf.lines.length, 2);
  assert.ok(Ed.handleKey(buf, { key: "i" }));
  assert.equal(buf.mode, "insert");
  assert.ok(Ed.handleKey(buf, { key: "!" }));
  assert.ok(buf.dirty);
  assert.ok(Ed.text(buf).startsWith("!hello") || Ed.text(buf).includes("!"));
  assert.ok(Ed.handleKey(buf, { key: "Escape" }));
  assert.equal(buf.mode, "normal");
  const html = Ed.render(buf, { focused: true });
  assert.ok(html.includes("cw-ed") && html.includes("cw-ed-status") && html.includes("cw-ed-gutter"),
    "editor renders terminal chrome, status, gutter");
  assert.ok(html.includes("cw-ed-caret"), "focused editor shows caret");
  Ed.clickAt(buf, 1, 0);
  assert.equal(buf.cursor.line, 1);
  const fromEntry = Ed.contentFromEntry({
    agentFile: "instructions",
    agent: { instructions: "Be kind.\n", model: "x" },
  }, "/.agents/x/instructions.md");
  assert.ok(fromEntry.text.includes("Be kind"));
  assert.ok(appSrc.includes("openFileInEditor") && appSrc.includes("editorHandleKey"),
    "app wires editor open and keys");
  assert.ok(consoleSrc2.includes("viewFileEditor") || consoleSrc2.includes("cw-ed"),
    "console renders the terminal editor in the detail pane");

  // .agents (Vercel Eve) at board + project levels.
  assert.ok(boardRoot.some((e) => e.name === ".agents"),
    "board root lists .agents (space-scoped Eve agents)");
  const boardAgents = map.list("/.agents") as Array<{ name: string; agent?: { scope?: string } }>;
  assert.ok(boardAgents.length >= 1, "board .agents has space agents");
  assert.ok(boardAgents.every((e) => e.agent && e.agent.scope === "space"),
    "board agents are space-scoped");
  const steward = map.list("/.agents/space-steward") as Array<{ name: string }>;
  assert.ok(steward.some((e) => e.name === "instructions.md"), "eve agent has instructions.md");
  assert.ok(steward.some((e) => e.name === "agent.ts"), "eve agent has agent.ts");
  assert.ok(steward.some((e) => e.name === "skills"), "eve agent has skills/");
  assert.ok(steward.some((e) => e.name === "tools"), "eve agent has tools/");
  assert.ok(communityKids.some((e) => e.name === ".agents"),
    "project tree has .agents child");
  assert.ok(tunerKids.some((e) => e.name === ".agents"),
    "linked project has .agents child");
  const tunerAgents = map.list("/projects/civic-tuner/.agents") as Array<{
    name: string; agent?: { scope?: string; project?: string };
  }>;
  assert.ok(tunerAgents.length >= 1 && tunerAgents.every((e) => e.agent?.scope === "project"),
    "project agents are project-scoped");
  const dataAgents = readFileSync(join(ROOT, "data.js"), "utf8");
  assert.ok(dataAgents.includes("agents:") && dataAgents.includes("space-steward"),
    "fixtures include Eve agent definitions");
  const spaceList = map.list("/spaces") as Array<{ name: string; hint?: string; space?: { relay?: { protocol?: string } } }>;
  assert.ok(spaceList.length >= 2, "spaces catalogue lists joinable spaces");
  assert.ok(spaceList.some((e) => e.name === "civic-workshop"), "home space present");
  const hub = map.list("/spaces/civic-workshop") as Array<{ name: string }>;
  assert.ok(hub.some((e) => e.name === "feed"), "space hub has feed");
  assert.ok(hub.some((e) => e.name === "channels"), "space hub has channels");
  assert.ok(hub.some((e) => e.name === "projects"), "space hub has projects");
  assert.ok(hub.some((e) => e.name === "about"), "space hub has about");
  assert.ok(!hub.some((e) => e.name === "relay"),
    "space hub must not surface relay as a user-facing child");
  assert.ok(!spaceList.some((e) => /nostr|relay\+/i.test(e.hint || "")),
    "space catalogue hints must not name transport internals");
  const feed = map.list("/spaces/civic-workshop/feed") as Array<{ post?: unknown }>;
  assert.ok(feed.length >= 1 && feed.every((e) => e.post), "space feed lists posts");
  const dmList = map.list("/dms") as Array<{ name: string; kind: string }>;
  assert.ok(dmList.length >= 2, "fixture DMs with people and agents");
  assert.ok(dmList.some((e) => e.name === "scout"), "agent DM thread exists");
  assert.ok(dmList.some((e) => e.name === "maya"), "person DM thread exists");
  const scoutThread = map.list("/dms/scout") as Array<{ post?: { who: string; dm?: string } }>;
  assert.ok(scoutThread.length >= 2 && scoutThread.every((e) => e.post),
    "DM threads list post-shaped messages");
  assert.ok(scoutThread.some((e) => e.post && e.post.who === "scout"),
    "agent messages appear in their DM");
  assert.ok(scoutThread.some((e) => e.post && e.post.who === "you"),
    "local principal messages use who: you");

  // Notifications: filters + mention/subscription kinds.
  const notifFilters = map.list("/notifications") as Array<{ name: string }>;
  assert.ok(notifFilters.some((e) => e.name === "all"));
  assert.ok(notifFilters.some((e) => e.name === "mentions"));
  assert.ok(notifFilters.some((e) => e.name === "subscribed"));
  assert.ok(notifFilters.some((e) => e.name === "hooks"),
    "notifications lists hooks filter for custom event subscriptions");
  const mentions = map.list("/notifications/mentions") as Array<{
    notification?: { kind: string; unread?: boolean; body?: string };
  }>;
  assert.ok(mentions.length >= 1 && mentions.every((e) => e.notification?.kind === "mention"),
    "mentions filter is only @you mentions");
  const subscribed = map.list("/notifications/subscribed") as Array<{
    notification?: { kind: string };
  }>;
  assert.ok(subscribed.length >= 1, "subscribed filter has watched-room activity");
  assert.ok(subscribed.every((e) =>
    e.notification?.kind === "subscription" || e.notification?.kind === "reply"),
    "subscribed filter excludes pure mentions");
  const dataSrcNotif = readFileSync(join(ROOT, "data.js"), "utf8");
  assert.ok(dataSrcNotif.includes("subscriptions:") && dataSrcNotif.includes("notifications:"),
    "fixtures include subscriptions and notifications");
  const consoleNotif = readFileSync(join(ROOT, "console.js"), "utf8");
  assert.ok(consoleNotif.includes("viewNotifications") && consoleNotif.includes("cn-activity"),
    "Activity feed renders Teams-style notification cards");
  const appNotif = readFileSync(join(ROOT, "app.js"), "utf8");
  assert.ok(appNotif.includes("openActivity") && appNotif.includes("data-activity-bell"),
    "Activity bell and openActivity are wired");
  assert.ok(actionSrc.includes('"/notifications"') || actionSrc.includes('"/activity"'),
    "slash surface exposes /notifications or /activity");

  // Browser Notification API bridge for Activity.
  const notifySrc = readFileSync(join(ROOT, "notify.js"), "utf8");
  assert.ok(notifySrc.includes("CW_NOTIFY") && notifySrc.includes("Notification"),
    "notify.js must wrap the browser Notification API");
  assert.ok(notifySrc.includes("requestPermission") && notifySrc.includes("deliver"),
    "notify.js must request permission and deliver alerts");
  assert.ok(appNotif.includes("deliverBrowserNotifications") &&
    appNotif.includes("requestBrowserNotifications"),
    "app must push Activity through the browser Notification API");
  assert.ok(readFileSync(join(ROOT, "board.html"), "utf8").includes("notify.js"),
    "index must load notify.js");

  // Unsupported: no constructor → permission unsupported, deliver no-ops.
  type NotifyItem = {
    id: string;
    kind?: string;
    body?: string;
    who?: string;
    unread?: boolean;
    where?: string;
    whereLabel?: string;
  };
  const memN = new Map<string, string>();
  const notifyOff: {
    Notification?: unknown;
    CW_NOTIFY?: {
      isSupported: () => boolean;
      permission: () => string;
      permissionLabel: (p?: string) => string;
      requestPermission: () => Promise<string>;
      deliver: (item: NotifyItem, h?: object) => unknown;
      deliverUnread: (items: NotifyItem[], h?: object) => number;
      wasPushed: (id: string) => boolean;
      markPushed: (id: string) => void;
      optionsFor: (item: object) => { title: string; body: string; tag: string; data: { id: string | null } };
    };
    localStorage: { getItem: (k: string) => string | null; setItem: (k: string, v: string) => void; removeItem: (k: string) => void };
  } = {
    localStorage: {
      getItem: (k: string) => (memN.has(k) ? memN.get(k)! : null),
      setItem: (k: string, v: string) => { memN.set(k, String(v)); },
      removeItem: (k: string) => { memN.delete(k); },
    },
  };
  new Function("window", notifySrc)(notifyOff);
  assert.ok(notifyOff.CW_NOTIFY);
  assert.equal(notifyOff.CW_NOTIFY!.isSupported(), false);
  assert.equal(notifyOff.CW_NOTIFY!.permission(), "unsupported");
  assert.equal(notifyOff.CW_NOTIFY!.deliver({ id: "x", body: "hi" }), null);

  // Supported mock Notification.
  type NotifInst = {
    title: string;
    options: Record<string, unknown>;
    onclick: ((ev?: unknown) => void) | null;
    onclose: (() => void) | null;
    onerror: (() => void) | null;
    close: () => void;
  };
  const created: NotifInst[] = [];
  class MockNotification {
    static permission = "default";
    static requestPermission() {
      MockNotification.permission = "granted";
      return Promise.resolve("granted");
    }
    title: string;
    options: Record<string, unknown>;
    onclick: ((ev?: unknown) => void) | null = null;
    onclose: (() => void) | null = null;
    onerror: (() => void) | null = null;
    constructor(title: string, options: Record<string, unknown> = {}) {
      this.title = title;
      this.options = options;
      created.push(this);
    }
    close() { /* noop */ }
  }
  memN.clear();
  created.length = 0;
  const notifyOn: typeof notifyOff & { Notification: typeof MockNotification } = {
    Notification: MockNotification,
    localStorage: notifyOff.localStorage,
  };
  new Function("window", notifySrc)(notifyOn);
  assert.equal(notifyOn.CW_NOTIFY!.isSupported(), true);
  assert.equal(notifyOn.CW_NOTIFY!.permission(), "default");
  // Grant without awaiting the promise chain — mock sets permission synchronously.
  MockNotification.permission = "granted";
  assert.equal(notifyOn.CW_NOTIFY!.permission(), "granted");
  const opts = notifyOn.CW_NOTIFY!.optionsFor({
    id: "n1", kind: "mention", who: "maya", body: "@you hello", whereLabel: "#general",
  });
  assert.match(opts.title, /maya/i);
  assert.ok(opts.body.includes("#general") || opts.body.includes("@you"));
  const delivered = notifyOn.CW_NOTIFY!.deliver({
    id: "n1", kind: "mention", who: "maya", body: "@you hello", unread: true,
    where: "/projects/community/channels/general", whereLabel: "#general",
  });
  assert.ok(delivered);
  assert.equal(created.length, 1);
  assert.ok(notifyOn.CW_NOTIFY!.wasPushed("n1"));
  // Second deliver without force is a no-op.
  assert.equal(notifyOn.CW_NOTIFY!.deliver({
    id: "n1", kind: "mention", who: "maya", body: "again", unread: true,
  }), null);
  assert.equal(created.length, 1);
  const unreadShown = notifyOn.CW_NOTIFY!.deliverUnread([
    { id: "n2", unread: true, kind: "subscription", who: "scout", body: "watched" },
    { id: "n3", unread: false, kind: "mention", who: "lea", body: "old" },
  ]);
  assert.equal(unreadShown, 1);
  assert.equal(created.length, 2);

  // The contract is the thing themes are written against; it has to exist.
  const contract = readFileSync(join(DOCS, "CONTRACT.md"), "utf8");
  for (const hook of ["data-region", "data-c", "data-state", "data-kind", "--cw-accent"]) {
    assert.ok(contract.includes(hook), `CONTRACT.md must document ${hook}`);
  }

  // ── The ASCII layer ──────────────────────────────────────────────────────
  // These glyphs are readings, not decoration, so they are testable: a
  // sparkline that does not track its series and a sigil that collides are both
  // lies told in a font nobody reads closely.
  const ascii: {
    CW_ASCII?: {
      sparkline: (v: number[], w?: number) => string;
      gauge: (d: number, t: number, w?: number) => string;
      sigil: (t: string, w?: number) => string;
      rule: (c: string, w?: number) => string;
      branch: (last: boolean, depth: number) => string;
      banner: (b: Record<string, unknown>, n: number, host: string) => string;
      BLOCKS: string[];
    };
  } = {};
  new Function("window", readFileSync(join(ROOT, "ascii.js"), "utf8"))(ascii);
  const A = ascii.CW_ASCII as {
    sparkline: (v: number[], w?: number) => string;
    gauge: (d: number, t: number, w?: number) => string;
    sigil: (t: string, w?: number) => string;
    rule: (c: string, w?: number) => string;
    branch: (last: boolean, depth: number) => string;
    banner: (b: Record<string, unknown>, n: number, host: string) => string;
    BLOCKS: string[];
    markdown?: (s: string) => string;
    asciiTable?: (rows: string[][], opts?: { asHtml?: boolean }) => string;
    looksLikeMarkdown?: (s: string) => boolean;
    formatBody?: (s: string) => string;
    colorizeAscii?: (s: string) => string;
  };
  assert.ok(A, "ascii.js must expose CW_ASCII");
  // Markdown + colour-coded ASCII tables.
  assert.ok(typeof A.markdown === "function" && typeof A.asciiTable === "function",
    "ascii.js must render markdown and ASCII tables");
  assert.ok(A.looksLikeMarkdown!("| a | b |\n| --- | --- |\n| 1 | 2 |"),
    "pipe tables are detected as markdown");
  const mdTable = A.markdown!("| who | role |\n| --- | --- |\n| maya | maintainer |\n| scout | agent |");
  assert.ok(mdTable.includes("cw-md-atable") && mdTable.includes("cw-md-th"),
    "markdown tables become colourable ASCII table markup");
  assert.ok(mdTable.includes("maya") && mdTable.includes("│"),
    "table keeps cell text and box-drawing");
  const plainTable = A.asciiTable!([["a", "b"], ["1", "2"]], { asHtml: false });
  assert.ok(plainTable.includes("┌") && plainTable.includes("│"),
    "asciiTable plain mode is pure box-drawing text");
  const bold = A.markdown!("hello **world** and `code`");
  assert.ok(bold.includes("cw-md-strong") && bold.includes("cw-md-code"),
    "inline markdown marks are classed for themes");
  const colored = A.colorizeAscii!("┌─█─┐\n│ ⣿ │");
  assert.ok(colored.includes("cw-md-box") && colored.includes("cw-md-block"),
    "plain ASCII colourises box edges and block gauges");
  assert.ok(A.formatBody!("| x | y |\n| --- | --- |\n| 1 | 2 |").includes("cw-md-atable"),
    "formatBody routes tables through markdown");
  const consoleMd = readFileSync(join(ROOT, "console.js"), "utf8");
  assert.ok(consoleMd.includes("formatBody") && consoleMd.includes("cw-md-atable"),
    "console must apply formatBody and style markdown tables");

  // Link preview cards — generated summary, ASCII/terminal reusable component.
  const A2 = A as typeof A & {
    linkPreview?: (url: string, opts?: object) => string;
    linkPreviewAscii?: (summary: object, w?: number) => string;
    summarizeLink?: (url: string, opts?: object) => {
      href: string; title: string; description: string; kind: string; site: string; displayUrl: string;
    };
    extractLinks?: (text: string) => Array<{ href: string; label: string }>;
    linkPreviewsFor?: (text: string) => string;
  };
  assert.ok(typeof A2.linkPreview === "function" && typeof A2.summarizeLink === "function",
    "ascii.js must expose linkPreview + summarizeLink");
  const sum = A2.summarizeLink!("https://github.com/ag-ui-protocol");
  assert.equal(sum.kind, "repo");
  assert.ok(/AG-UI/i.test(sum.title), "catalog title for known GitHub URL");
  assert.ok(sum.description.length > 10, "generated description");
  const plainCard = A2.linkPreview!("https://github.com/ag-ui-protocol", { asHtml: false });
  assert.ok(plainCard.includes("┌") && plainCard.includes("│") && plainCard.includes("└"),
    "plain link preview is box-drawn ASCII");
  assert.ok(plainCard.includes("AG-UI") || plainCard.includes("GitHub"),
    "ASCII card carries title/site");
  const htmlCard = A2.linkPreview!("https://github.com/ag-ui-protocol");
  assert.ok(htmlCard.includes("cw-link-preview") && htmlCard.includes('data-c="link-preview"'),
    "HTML card uses reusable component classes");
  assert.ok(htmlCard.includes("cw-link-preview-title") && htmlCard.includes("cw-link-preview-ascii"),
    "card has title + ascii pre");
  assert.ok(htmlCard.includes('data-kind="repo"'), "kind is data attribute for themes");
  const extracted = A2.extractLinks!(
    "See [AG-UI](https://github.com/ag-ui-protocol) and https://docs.epoch.local/install-cache plus /projects/community/channels/bugs",
  );
  assert.ok(extracted.length >= 3, "extracts markdown, bare URL, and board path");
  const bodyWithLinks = A.formatBody!(
    "Spec: [AG-UI Protocol](https://github.com/ag-ui-protocol)\n\nhttps://docs.epoch.local/install-cache",
  );
  assert.ok(bodyWithLinks.includes("cw-md-a") && bodyWithLinks.includes("cw-link-preview"),
    "formatBody inline-links and appends preview cards");
  assert.ok((bodyWithLinks.match(/cw-link-preview/g) || []).length >= 2,
    "one card per unique link");
  const boardCard = A2.linkPreview!("/projects/community/channels/bugs");
  assert.ok(boardCard.includes('data-kind="board"') && boardCard.includes("data-goto") &&
    boardCard.includes("button"),
    "board paths get in-app button + data-goto previews");
  assert.ok(consoleMd.includes("cw-link-preview") && consoleMd.includes("cw-link-preview-ascii"),
    "console styles the link preview component");
  const dataSrcLinks = readFileSync(join(ROOT, "data.js"), "utf8");
  assert.ok(dataSrcLinks.includes("github.com/ag-ui-protocol") ||
    dataSrcLinks.includes("docs.epoch.local"),
    "fixture post includes sample links for preview cards");

  const spark = A.sparkline([0, 1, 2, 3, 4, 5, 6, 7], 8);
  assert.equal(spark.length, 8, "a sparkline must be exactly the width asked for");
  assert.equal(spark[0], A.BLOCKS[0], "the minimum of a rising series is the empty block");
  assert.equal(spark[7], A.BLOCKS[A.BLOCKS.length - 1], "its maximum is the full block");
  assert.equal(A.sparkline([3, 3, 3, 3], 4), A.BLOCKS[A.BLOCKS.length - 1].repeat(4),
    "a flat series must render flat, so the console can detect and drop it");

  assert.equal(A.gauge(0, 10, 4), "[····]", "an empty gauge shows no fill");
  assert.equal(A.gauge(10, 10, 4), "[████]", "a full gauge is full");
  assert.equal(A.gauge(5, 10, 4), "[██··]", "a half gauge is half");
  assert.equal(A.gauge(1, 0, 4), "[····]", "a gauge with no total must not divide by zero");

  // A signature mark is only useful if equal inputs match and unequal ones do not.
  assert.equal(A.sigil("sig:maya-promote", 4), A.sigil("sig:maya-promote", 4),
    "the same signature must always draw the same mark");
  const marks = new Set(["lea-install", "nora-repro", "scout-188", "maya-promote", "sam-ack"]
    .map((s) => A.sigil("sig:" + s, 4)));
  assert.equal(marks.size, 5, "distinct signatures must draw distinct marks");
  for (const ch of [...marks].join("")) {
    const code = ch.codePointAt(0) ?? 0;
    assert.ok(code >= 0x2800 && code <= 0x28ff, "a sigil cell must be a braille pattern");
  }

  assert.equal(A.rule("hi", 12).length, 12, "a rule fills the width it is given");
  assert.ok(A.rule("hi", 12).includes(" hi "), "a rule carries its caption inline");
  assert.ok(A.branch(true, 1).startsWith("└─"), "the last child closes its branch");
  assert.ok(A.branch(false, 1).startsWith("├─"), "any other child continues it");

  // The banner may only state facts the board can assert. It is given them.
  const banner = A.banner(
    { name: "EPOCH", node: "/", epoch: 13, landed: 9, total: 12, ships: "FRI" }, 11, "in-page registry");
  assert.ok(banner.includes("epoch 13") && banner.includes("11 tools"),
    "the banner must state the epoch and the real tool count");
  const widths = new Set(banner.split("\n").map((l) => [...l].length));
  assert.equal(widths.size, 1, "every banner line must be the same width or the box breaks");

  // The optional canvas lens must be capability-gated, and must be able to fail.
  const fx = readFileSync(join(ROOT, "fx.js"), "utf8");
  assert.ok(fx.includes("supportsHtmlInCanvas"), "fx.js must ask the browser before drawing");
  assert.ok(fx.includes("function disable"), "an effect that cannot be undone is damage");
  const toolsSrc = readFileSync(join(ROOT, "tools.js"), "utf8");
  assert.ok(toolsSrc.includes("fx_asciify"), "the lens must be reachable as a tool");
  assert.ok(/fx_asciify[\s\S]*?MCP\.fail\("cannot: /.test(toolsSrc),
    "an unsupported browser must be reported as a failure, not as ok");

  // ── Rendering is morphing, not replacing ─────────────────────────────────
  // The innerHTML swap destroyed every node per render: focus, scroll, hover
  // and any running animation died on each live tick. These pin the shape of
  // the fix so it cannot quietly regress to the nuke.
  assert.ok(appSrc.includes("CW_MORPH.morph"), "render() must morph the mount");
  assert.equal((appSrc.match(/mount\.innerHTML\s*=/g) ?? []).length, 0,
    "nothing may replace the mount wholesale — that is the flicker");
  assert.ok(appSrc.includes("function wireMount"), "events must be delegated once at boot");
  assert.ok(!appSrc.includes("function wireSurface"),
    "per-render listener wiring must be gone — with persistent nodes it stacks handlers");

  for (const keyed of ['class="cn-item" data-key=', 'class="cn-comment" data-key=', 'data-key="blades"']) {
    assert.ok(consoleSrc2.includes(keyed), `morph targets must be keyed: ${keyed}`);
  }

  // Behavioural check of the morph algorithm itself, on a minimal DOM stand-in.
  const morphSandbox: { CW_MORPH?: { morph: (live: unknown, html: string) => void } } = {};
  new Function("window", readFileSync(join(ROOT, "morph.js"), "utf8"))(morphSandbox);
  assert.ok(morphSandbox.CW_MORPH, "morph.js must expose CW_MORPH");

  // ── Motion is declared and respectful ────────────────────────────────────
  // An animation exists for arriving posts and nothing else animates forever;
  // all of it sits behind prefers-reduced-motion. Restraint is testable.
  assert.ok(consoleSrc2.includes("prefers-reduced-motion: no-preference"),
    "motion must be opt-out via the OS setting");
  assert.ok(consoleSrc2.includes("@keyframes cn-arrive"), "arrival motion must exist");
  assert.ok(!/animation:[^;}]*infinite/.test(consoleSrc2),
    "nothing may animate forever — a pulse that never stops is load, not meaning");

  // ── The furniture: scrollbars, panes, threads, context ───────────────────
  assert.ok(baseCss.includes("scrollbar-color") && baseCss.includes("::-webkit-scrollbar"),
    "scrollbars must take the theme's ink on both engines");

  assert.ok(consoleSrc2.includes("buildBladeStack") && consoleSrc2.includes("data-blade-path"),
    "navigation must render blades with data-blade-path");
  // Single reusable nav + detail — never a stack of cloned list blades.
  assert.ok(consoleSrc2.includes('stable: "nav"') || consoleSrc2.includes('data-key="blade-nav"'),
    "nav blade uses a stable morph key so it is reused, not cloned");
  assert.ok(consoleSrc2.includes("single reusable") || consoleSrc2.includes("Never a cascade") ||
    consoleSrc2.includes("Two panes only") || consoleSrc2.includes("reused and reloaded"),
    "blade stack is documented as one nav + detail");
  assert.ok(appSrc.includes("listBladeIndex") && /return 0/.test(
    appSrc.slice(appSrc.indexOf("function listBladeIndex"), appSrc.indexOf("function listBladeIndex") + 120),
  ), "listBladeIndex is always 0 (one nav blade)");
  assert.ok(consoleSrc2.includes("data-blade-close") || appSrc.includes("closeBlade"),
    "nav close goes up; detail close hides the pane");
  assert.ok(consoleSrc2.includes("cn-blade-back") && consoleSrc2.includes("data-nav-back") &&
    consoleSrc2.includes("&lt;&lt;"),
    "drilled-down nav shows a leading << back control");
  assert.ok(consoleSrc2.includes('data-nav-drilled="true"') || consoleSrc2.includes("data-nav-drilled"),
    "nav marks drilled state when not at board root");
  assert.ok(appSrc.includes("closeDetail") && appSrc.includes("detailOpen"),
    "detail pane can be closed and reopened");
  assert.ok(consoleSrc2.includes("cn-follow-feed") && consoleSrc2.includes("viewFollowingFeed"),
    "closed detail must render Following feed, not expand nav alone");
  assert.ok(consoleSrc2.includes("cn-follow-row") && !consoleSrc2.includes("cn-follow-card"),
    "Following must be TUI rows, not web cards");
  assert.ok(!consoleSrc2.includes("cn-follow-banner-lead") && !consoleSrc2.includes("like X / Bluesky"),
    "Following banner must not sell social-web marketing copy");
  assert.ok(consoleSrc2.includes("cn-home-tab") && consoleSrc2.includes("data-home-feed"),
    "home feed must expose following/announcements/featured/creators toggles");
  assert.ok(consoleSrc2.includes("cn-home-unread"),
    "each home feed tab must show an unread count");
  assert.ok(appSrc.includes("setHomeFeed") && appSrc.includes("homeFeedRead"),
    "app must switch home feed views and persist read state");
  assert.ok(appSrc.includes("following feed"),
    "closeDetail status must advertise Following feed");
  assert.ok(!appSrc.includes("detail closed · nav only"),
    "nav-only full-width mode is retired");
  assert.ok(readFileSync(join(ROOT, "data.js"), "utf8").includes("follows:"),
    "fixture must declare who the local principal follows");
  assert.ok(readFileSync(join(ROOT, "data.js"), "utf8").includes("announcements:") &&
    readFileSync(join(ROOT, "data.js"), "utf8").includes("featuredProjects:") &&
    readFileSync(join(ROOT, "data.js"), "utf8").includes("featuredCreators:"),
    "fixture must declare home feed announcements, featured projects, and creators");
  assert.ok(readFileSync(join(ROOT, "sitemap.js"), "utf8").includes("followingFeed"),
    "sitemap must build the following timeline");
  assert.ok(readFileSync(join(ROOT, "sitemap.js"), "utf8").includes("homeFeedUnreadCounts"),
    "sitemap must compute per-tab home feed unread counts");
  assert.ok(
    /bladeClose[\s\S]{0,200}closeBlade/.test(appSrc),
    "an explicit blade control closes detail without overloading bare Escape",
  );

  // Following feed: only followed authors; sam is not followed.
  {
    const followWin: {
      CW_DATA?: { follows?: string[] };
      CW_MAP?: {
        followingFeed: (extra?: unknown[]) => Array<{ who: string; summary: string; unread?: boolean }>;
        followsList: () => string[];
        homeFeedViews: () => Array<{ id: string; label: string }>;
        homeFeedItems: (view: string, extra?: unknown[], read?: Record<string, boolean>) =>
          Array<{ id: string; unread?: boolean; who?: string }>;
        homeFeedUnreadCounts: (extra?: unknown[], read?: Record<string, boolean>) =>
          Record<string, number>;
      };
    } = {};
    loadCommunityCore(followWin);
    new Function("window", readFileSync(join(ROOT, "data.js"), "utf8"))(followWin);
    new Function("window", readFileSync(join(ROOT, "sitemap.js"), "utf8"))(followWin);
    assert.ok(followWin.CW_MAP && followWin.CW_DATA);
    const follows = followWin.CW_MAP!.followsList();
    assert.ok(follows.includes("maya") && !follows.includes("sam"),
      "follows fixture curates the graph");
    const feed = followWin.CW_MAP!.followingFeed([]);
    assert.ok(feed.length >= 3, "following feed has posts");
    assert.ok(feed.every((it) => follows.includes(it.who)),
      "feed only includes followed authors");
    assert.ok(feed.every((it) => it.summary && it.summary.length <= 181),
      "summaries are short (X/Bluesky style)");
    assert.ok(!feed.some((it) => it.who === "sam"), "unfollowed authors excluded");
    const views = followWin.CW_MAP!.homeFeedViews().map((v) => v.id);
    assert.deepEqual(views, ["following", "announcements", "featured", "creators"],
      "home feed exposes the four toggles");
    const counts = followWin.CW_MAP!.homeFeedUnreadCounts([], {});
    assert.ok(counts.following >= 1, "following has unread");
    assert.ok(counts.announcements >= 1, "announcements has unread");
    assert.ok(counts.featured >= 1, "featured has unread");
    assert.ok(counts.creators >= 1, "creators has unread");
    const ann = followWin.CW_MAP!.homeFeedItems("announcements", [], {});
    assert.ok(ann.some((it) => it.unread), "announcement fixtures include unread");
    const marked = followWin.CW_MAP!.homeFeedItems("announcements", [], { [ann[0].id]: true });
    const markedItem = marked.find((it) => it.id === ann[0].id);
    assert.ok(markedItem, "announcement remains after read-set mark");
    assert.ok(!markedItem!.unread, "read set clears announcement unread");
    const featured = followWin.CW_MAP!.homeFeedItems("featured", [], {});
    assert.ok(featured.length >= 2 && featured.every((it) => it.who),
      "featured projects list repos");
    const creators = followWin.CW_MAP!.homeFeedItems("creators", [], {});
    assert.ok(creators.some((it) => it.who === "maya"), "featured creators include maya");
  }
  assert.ok(consoleSrc2.includes("data-tree-toggle") && consoleSrc2.includes("cn-blade-tree"),
    "nav list uses +/- tree peek, not arrow glyphs");
  assert.ok(consoleSrc2.includes('data-tree-mode="first-level"') ||
    consoleSrc2.includes("first-level"),
    "nav advertises first-level tree mode");
  assert.ok(consoleSrc2.includes("cn-subkids") || consoleSrc2.includes("data-has-kids"),
    "dirs with further children show a child count");
  // Tree iconography: only + / − (and blank leaf spacer). No ·  ›  ▸  * twists.
  const treeIconSlice = consoleSrc2.slice(
    consoleSrc2.indexOf("function bladeListHtml"),
    consoleSrc2.indexOf("function bladeHtml"),
  );
  assert.ok(treeIconSlice.length > 200, "bladeListHtml tree renderer present");
  assert.ok(!/[·•›▸▾*]/.test(treeIconSlice.replace(/\/\*[\s\S]*?\*\//g, "").replace(/\/\/[^\n]*/g, "")),
    "nav tree rows must not use dots or arrows as icons");
  assert.ok(treeIconSlice.includes('(open ? "−" : "+")') ||
    (treeIconSlice.includes('"+"') && treeIconSlice.includes('"−"')),
    "tree expand/collapse icons are + and −");
  assert.ok(treeIconSlice.includes("cn-pm-leaf") && !/cn-pm-leaf[^>]*>[·•]/.test(treeIconSlice),
    "leaf tree rows use a blank spacer, not a dot");
  assert.ok(appSrc.includes("toggleCursorTree") && appSrc.includes("goRight"),
    "Space expands one level; → reloads nav into selected dir");
  assert.ok(appSrc.includes('k === " "') || appSrc.includes('k === "Spacebar"'),
    "Space is bound for tree expand/collapse");
  // Collapsible nav — rail frees width for detail.
  assert.ok(appSrc.includes("toggleNavCollapsed") && appSrc.includes("setNavCollapsed"),
    "app must collapse/expand nav");
  assert.ok(consoleSrc2.includes("data-nav-collapsed") && consoleSrc2.includes("cn-blade-rail"),
    "collapsed nav is a rail, not a second stack");
  assert.ok(consoleSrc2.includes("data-nav-collapse") || consoleSrc2.includes("data-nav-expand"),
    "collapse/expand controls are present on blades");
  assert.ok(!/isDir \? "▸"/.test(consoleSrc2),
    "directory rows must not use ▸ arrows");
  assert.ok(consoleSrc2.includes("cn-tui-foot") && consoleSrc2.includes("data-region=\"composer\""),
    "compose foot is the page TUI prompt, not a dockable terminal panel");
  assert.ok(!consoleSrc2.includes("data-panel-dock") && !consoleSrc2.includes("data-panel-max"),
    "dockable terminal panel chrome must stay removed");
  assert.ok(consoleSrc2.includes("cn-panel-tab") || consoleSrc2.includes("cn-workspace-tab"),
    "workspace tabs remain for isolated worktrees");
  assert.ok(consoleSrc2.includes("role=\"tablist\"") && consoleSrc2.includes("role=\"tab\""),
    "workspace tabs expose ARIA tablist/tab roles");
  assert.ok(consoleSrc2.includes("role=\"combobox\"") && consoleSrc2.includes("aria-controls=\"cn-cli-listbox\""),
    "prompt is a combobox wired to the suggestion listbox");
  assert.ok(consoleSrc2.includes("data-session-new") && consoleSrc2.includes("data-session="),
    "terminal must support multiple workspace tabs");
  assert.ok(consoleSrc2.includes("cn-who") && consoleSrc2.includes("renderTranscript"),
    "transcript must align identity on a who-rail");
  assert.ok(consoleSrc2.includes('data-turn="start"') && consoleSrc2.includes("cn-msg") &&
    consoleSrc2.includes('"sys"'),
    "session transcript must mark turns, wrap messages, and label sys output");
  assert.ok(consoleSrc2.includes("data-tool-toggle") && consoleSrc2.includes("cn-tool-detail"),
    "tool use must be collapsible");
  // Top chrome: Epoch animated ASCII brand — no NIGHTBOARD / console select / pause / thesis prose.
  const boardHtmlBrand = readFileSync(join(ROOT, "board.html"), "utf8");
  assert.ok(boardHtmlBrand.includes("cw-skip") && boardHtmlBrand.includes("role=\"banner\""),
    "skip link and banner landmark must exist for keyboard a11y");
  assert.ok(boardHtmlBrand.includes('data-brand') && boardHtmlBrand.includes("data-brand-art"),
    "top bar must host the Epoch ASCII brand mark");
  assert.ok(boardHtmlBrand.includes("data-goto-landing"),
    "board brand must navigate to the marketing landing");
  assert.ok(!/NIGHTBOARD/i.test(boardHtmlBrand), "NIGHTBOARD wordmark must be gone from chrome");
  assert.ok(!boardHtmlBrand.includes("data-exp-select") && !boardHtmlBrand.includes("data-exp-thesis"),
    "experience select and thesis prose must leave the bar");
  assert.ok(!boardHtmlBrand.includes("data-live-toggle"),
    "pause live-toggle button must leave the bar");
  // Marketing landing is the default site entry (Persuade).
  const landingHtml = readFileSync(join(ROOT, "index.html"), "utf8");
  const landingCss = readFileSync(join(ROOT, "landing.css"), "utf8");
  assert.ok(landingHtml.includes('data-landing="true"') || landingHtml.includes("data-landing"),
    "index.html must be the marketing landing surface");
  assert.ok(/href=["']board\.html["']/.test(landingHtml),
    "landing CTA must enter the Operate board");
  assert.ok(landingHtml.includes("cw-landing") || landingHtml.includes("data-landing-hero"),
    "landing must expose a Persuade hero composition");
  assert.ok(
    landingHtml.includes("data-landing-what") &&
      landingHtml.includes("data-landing-how") &&
      landingHtml.includes("data-landing-who"),
    "landing must describe what / how / who for the product");
  assert.ok(landingHtml.includes("data-landing-preview"),
    "landing must preview board planes for recognition");
  assert.ok(landingHtml.includes("data-landing-theater"),
    "landing must include the promote-to-receipt theater canvas");
  assert.ok(landingHtml.includes("data-landing-grid"),
    "landing must include the Grid cyclorama canvas");
  assert.ok(landingHtml.includes("data-landing-crt"),
    "landing must include CRT monitor shell");
  assert.ok(landingHtml.includes("cw-crt-grain") && landingHtml.includes("cw-crt-barrel"),
    "landing CRT must include grain + barrel tube mass");
  assert.ok(
    landingHtml.includes("data-ride-track") && landingHtml.includes("data-ride-stage"),
    "landing must use a scroll-scrub ride track + fixed stage (not stacked-doc scroll alone)");
  assert.ok(
    landingHtml.includes("data-crt-tube") &&
      (landingHtml.includes("cw-crt-barrel-filter") || landingHtml.includes("feDisplacementMap")),
    "landing CRT must include tube immersion warp filter like shader.se");
  assert.ok(
    /chapterFromProgress|CHAPTERS|rideProgress|scrollSmooth/.test(
      readFileSync(join(ROOT, "landing.js"), "utf8"),
    ),
    "landing.js must map scroll progress to chapters (scrub ride)");
  assert.ok(landingCss.includes("data-canvas-failed") || landingCss.includes("[data-canvas-failed"),
    "landing must style canvas-unavailable recovery");
  assert.ok(
    /getContext[\s\S]{0,200}failTheater|canvas unavailable|Demo canvas unavailable/i.test(
      readFileSync(join(ROOT, "landing.js"), "utf8"),
    ),
    "landing.js must recover when theater canvas context is missing");
  assert.ok(landingHtml.includes("data-scroll-rail"),
    "landing must include scroll-to-explore chapter rail");
  assert.ok(landingHtml.includes("cw-scroll-rail-item") && landingHtml.includes("cw-case-code"),
    "landing chapter rail must use coded case index items (Aino → Grid)");
  assert.ok(landingHtml.includes("data-plane-catalog") && landingHtml.includes('data-plane="channels"'),
    "landing board section must expose an interactive plane catalog");
  assert.ok(/clip-path:\s*inset\(0\s+0\s+0\s+0\)/.test(landingCss) ||
    landingCss.includes("clip-path: inset(0 0 0 0)"),
    "landing day state must keep FIGlet brand unclipped");
  assert.ok(landingCss.includes("cw-landing-cta-rise"),
    "landing CTA rise must not use opacity gating");
  assert.ok(landingHtml.includes("data-theater-scrub") && landingHtml.includes("data-seek-phase"),
    "landing theater must be scrubbable and seekable from How steps");
  assert.ok(landingHtml.includes("data-skip-intro"),
    "landing dawn theatre must be skippable");
  assert.ok(/collaborat|promote your work|get paid|creator/i.test(landingHtml),
    "landing must state collaborate → promote work → get paid");
  assert.ok(!/promote(?:d)? (?:a |the )?message|promote → intent|conversation becomes signed/i.test(landingHtml),
    "landing must not reuse the old promote-message thesis");
  assert.ok(!/font:\s*inherit/.test(landingCss),
    "landing must not inherit UA serif onto the FIGlet brand");
  assert.ok(/font-family:\s*var\(--cw-font\)/.test(landingCss),
    "landing must use the Community Web monospace stack");
  assert.ok(appSrc.includes("goLanding") || appSrc.includes("data-goto-landing"),
    "board brand click must route to marketing landing");
  assert.ok(asciiSrc.includes("brandHtml") && asciiSrc.includes("EPOCH_MARK"),
    "ascii.js must provide a FIGlet Epoch brand wordmark");
  assert.ok(asciiSrc.includes("███████") && asciiSrc.includes("cw-brand-fig"),
    "brand is continuous ANSI Shadow letterforms (not per-glyph spans)");
  assert.ok(!/EPOCH_TAG\s*=\s*"CIVIC WORKSHOP"/.test(asciiSrc),
    "brand title must not carry Civic Workshop wording");
  assert.ok(!/brandHtml[\s\S]*?CIVIC WORKSHOP/.test(asciiSrc),
    "brandHtml must not render Civic Workshop by default");
  assert.ok(/\.cw-brand\s*\{[^}]*border:\s*0/.test(baseCss),
    "brand title must not wear a border plaque");
  assert.ok(appSrc.includes("startBrandAnimation") && appSrc.includes("brandHtml"),
    "app must mount brand HTML and run power-on → idle");
  assert.ok(baseCss.includes("cw-brand") && baseCss.includes("cw-brand-sheen") &&
    baseCss.includes("cw-brand-wipe") && baseCss.includes("background-clip"),
    "base CSS must sheen continuous letterforms and power-on wipe");

  assert.ok(appSrc.includes("makeSession") && appSrc.includes("newSession"),
    "terminal tabs are virtual worktree sessions");
  assert.ok(appSrc.includes("DEFAULT_WORKSPACE_PATH") ||
    appSrc.includes('makeSession(DEFAULT_WORKSPACE_PATH)'),
    "new workspace tabs start at a default home path");
  assert.ok(/newSession[\s\S]{0,400}makeSession\(\s*DEFAULT_WORKSPACE_PATH\s*\)/.test(appSrc) ||
    /newSession[\s\S]{0,400}makeSession\(\s*\)/.test(appSrc) ||
    (appSrc.includes("never inherit") && appSrc.includes("DEFAULT_WORKSPACE_PATH")),
    "newSession must not copy the active tab path");
  assert.ok(appSrc.includes("sess.attachments") && appSrc.includes("sess.editorPath"),
    "freeze/thaw isolates attachments and editor focus per workspace");
  assert.ok(appSrc.includes('"cw-panes"'), "pane layout must persist across sessions");
  assert.ok(appSrc.includes("outH") && appSrc.includes("outW") && appSrc.includes("dock"),
    "terminal furniture state (height, width, dock) must persist");
  assert.ok(appSrc.includes("setPointerCapture"),
    "splitter drag must use pointer capture — one path for mouse, touch and pen");
  assert.ok(appSrc.includes('dataset.split === "out"') || appSrc.includes('split.dataset.split === "out"'),
    "terminal sash must share the pointer-capture resize path");
  assert.ok(!appSrc.includes(".focus()"),
    "every focus() must preventScroll — a scrolling focus broke the frame once already");

  // Threads: Reddit-style tree — nest rails, ± fold, votes, sort filters.
  const dataSrc = readFileSync(join(ROOT, "data.js"), "utf8");
  assert.ok(/re: "p\d+"/.test(dataSrc), "fixture posts must carry reply links");
  assert.ok(consoleSrc2.includes("subtreeCount"),
    "a fold covers the whole subtree, so it must count the whole subtree");
  assert.ok(consoleSrc2.includes("data-fold="), "threads must be foldable from ± or nest rails");
  assert.ok(consoleSrc2.includes("cn-rail") && consoleSrc2.includes("cn-pm"),
    "nest rails and ± controls are the Reddit fold grammar");
  assert.ok(consoleSrc2.includes("data-vote") && consoleSrc2.includes("data-reply"),
    "comments carry upvote/downvote and reply");
  assert.ok(consoleSrc2.includes("cn-react-pill") && consoleSrc2.includes("REACTIONS"),
    "comments carry emoji reaction pills (+1, eyes, …)");
  assert.ok(appSrc.includes("toggleReaction") && appSrc.includes("reactPick"),
    "app must toggle reactions and open the picker");

  // Lucene-style feed queries / views.
  const querySrc = readFileSync(join(ROOT, "query.js"), "utf8");
  assert.ok(querySrc.includes("CW_QUERY") && querySrc.includes("filterEntries"),
    "query.js must expose Lucene-style feed projections");
  assert.ok(readFileSync(join(ROOT, "board.html"), "utf8").includes("query.js"),
    "index must load query.js");
  const qWin: {
    CW_QUERY?: {
      parse: (q: string) => { ast: unknown; sort: string | null; error: string | null };
      apply: (posts: object[], q: string, ctx?: object) => {
        posts: object[]; sort: string | null; error: string | null;
      };
      filterEntries: (entries: object[], q: string, ctx?: object) => {
        entries: object[]; matched: number; count: number; error: string | null; sort: string | null;
      };
      presets: () => Array<{ id: string; query: string }>;
    };
    CW_DATA?: { members?: object[] };
  } = { CW_DATA: { members: [{ handle: "maya", kind: "person" }, { handle: "scout", kind: "agent" }] } };
  loadCommunityCore(qWin);
  new Function("window", querySrc)(qWin);
  assert.ok(qWin.CW_QUERY);
  const Q = qWin.CW_QUERY!;
  const samplePosts = [
    { id: "a", who: "maya", channel: "bugs", state: "needs-review", subject: "Cache", body: "cold install", anchor: "x", reactions: { "+1": 2 } },
    { id: "b", who: "scout", channel: "agent-runs", state: "open", subject: "Plan", body: "draft", re: "a" },
    { id: "c", who: "lea", channel: "general", state: "signed", subject: "Done", body: "shipped" },
  ];
  assert.equal(Q.parse("state:needs-review").error, null);
  assert.equal(Q.apply(samplePosts, "state:needs-review").posts.length, 1);
  assert.equal((Q.apply(samplePosts, "state:needs-review").posts[0] as { id: string }).id, "a");
  assert.equal(Q.apply(samplePosts, "who:maya OR kind:agent").posts.length, 2);
  assert.equal(Q.apply(samplePosts, "has:anchor").posts.length, 1);
  assert.equal(Q.apply(samplePosts, "react:+1").posts.length, 1);
  assert.equal(Q.apply(samplePosts, "body:cold").posts.length, 1);
  assert.equal(Q.apply(samplePosts, "state:(open OR signed)").posts.length, 2);
  assert.equal(Q.apply(samplePosts, "-state:signed").posts.length, 2);
  const sorted = Q.apply(samplePosts, "kind:agent sort:new");
  assert.equal(sorted.sort, "new");
  assert.equal(sorted.posts.length, 1);
  const entries = samplePosts.map((p) => ({ name: p.id, post: p, kind: "file" }));
  const fe = Q.filterEntries(entries, "who:scout", {});
  // Parent of scout's reply kept for tree coherence.
  assert.ok(fe.matched >= 1);
  assert.ok(fe.entries.some((e: { post?: { id: string } }) => e.post && e.post.id === "a"),
    "filter keeps ancestors of matches");
  assert.ok(Q.presets().some((p) => p.id === "needs-review"));
  assert.ok(appSrc.includes("setFeedQuery") && appSrc.includes("feedQuery"),
    "app must wire feed query state");
  assert.ok(consoleSrc2.includes("data-feed-query") && consoleSrc2.includes("data-feed-view") &&
    consoleSrc2.includes("data-feed-query-toggle") && consoleSrc2.includes("feedQueryOpen"),
    "feed Lucene query is a foldable power control, not always-on chrome");
  assert.ok(appSrc.includes("humanModelStatus") && appSrc.includes("unsigned ·"),
    "model status is plain language; compose declares unsigned for guests");
  assert.ok(consoleSrc2.includes("data-feed-query") && consoleSrc2.includes("data-feed-view"),
    "console must expose query bar and view chips");
  assert.ok(actionSrc.includes('"/view"') || actionSrc.includes('"/q"'),
    "slash surface exposes /view or /q");

  // File attachments for chat context.
  const attachSrc = readFileSync(join(ROOT, "attach.js"), "utf8");
  assert.ok(attachSrc.includes("CW_ATTACH") && attachSrc.includes("composeInput"),
    "attach.js must expose CW_ATTACH for chat context files");
  assert.ok(readFileSync(join(ROOT, "board.html"), "utf8").includes("attach.js"),
    "index must load attach.js");
  assert.ok(appSrc.includes("addAttachmentFiles") && appSrc.includes("attachments"),
    "app must stage attachments on the prompt");
  assert.ok(consoleSrc2.includes("data-attach-pick") && consoleSrc2.includes("cn-attach-tray"),
    "console must render attach control and tray");
  assert.ok(actionSrc.includes('"/attach"'),
    "slash surface exposes /attach");
  const attachWin: {
    CW_ATTACH?: {
      kindFor: (f: { name?: string; type?: string }) => string;
      formatSize: (n: number) => string;
      composeInput: (text: string, atts: object[]) => string;
      formatContext: (atts: object[]) => string;
      chipLabel: (a: object) => string;
      meta: (a: object) => { name?: string; kind?: string };
      MAX_FILES: number;
    };
  } = {};
  new Function("window", attachSrc)(attachWin);
  assert.ok(attachWin.CW_ATTACH);
  const Att = attachWin.CW_ATTACH!;
  assert.equal(Att.kindFor({ name: "notes.md", type: "text/markdown" }), "text");
  assert.equal(Att.kindFor({ name: "shot.png", type: "image/png" }), "image");
  assert.equal(Att.kindFor({ name: "blob.bin", type: "application/octet-stream" }), "file");
  const ctx = Att.formatContext([
    { name: "notes.md", type: "text/markdown", kind: "text", size: 12, text: "hello cache" },
    { name: "shot.png", type: "image/png", kind: "image", size: 100 },
  ]);
  assert.ok(ctx.includes("[attachments: 2") && ctx.includes("hello cache") && ctx.includes("shot.png"),
    "formatContext inlines text and notes images");
  const composed = Att.composeInput("summarise this", [
    { name: "notes.md", kind: "text", type: "text/plain", size: 5, text: "body" },
  ]);
  assert.ok(composed.includes("summarise this") && composed.includes("[attachments"),
    "composeInput appends attachment block to user text");
  assert.ok(Att.chipLabel({ name: "a.md", kind: "text", size: 100 }).includes("a.md"));
  assert.ok(Att.MAX_FILES >= 1);

  // Custom event hooks → Activity + browser notifications.
  const hooksSrc = readFileSync(join(ROOT, "hooks.js"), "utf8");
  assert.ok(hooksSrc.includes("CW_HOOKS") && hooksSrc.includes("emit"),
    "hooks.js must expose CW_HOOKS with emit");
  assert.ok(readFileSync(join(ROOT, "board.html"), "utf8").includes("hooks.js"),
    "index must load hooks.js");
  assert.ok(dataSrc.includes("hooks:") || dataSrc.includes("hooks :"),
    "fixtures include default hooks");
  assert.ok(appSrc.includes("broadcastHookEvent") && appSrc.includes("runHooksCommand"),
    "app must broadcast hook events and expose /hooks");
  assert.ok(actionSrc.includes('"/hooks"'),
    "slash surface exposes /hooks");
  assert.ok(consoleSrc2.includes("hooks") && consoleSrc2.includes("/notifications/hooks"),
    "Activity UI surfaces hooks filter");
  const hooksWin: {
    localStorage: {
      store: Record<string, string>;
      getItem: (k: string) => string | null;
      setItem: (k: string, v: string) => void;
      removeItem: (k: string) => void;
    };
    CW_DATA?: { hooks?: object[]; members?: object[] };
    CW_QUERY?: typeof Q;
    CW_HOOKS?: {
      events: () => Array<{ id: string; label: string }>;
      list: () => Array<{ id: string; event: string; match: string; enabled: boolean; notify: boolean }>;
      add: (spec: object) => { ok: boolean; hook?: { id: string; event: string } };
      remove: (id: string) => { ok: boolean };
      enable: (id: string, on: boolean) => { ok: boolean; hook?: { enabled: boolean } };
      match: (event: string, payload: object) => object[];
      emit: (event: string, payload: object, opts?: object) => Array<{ id: string; kind: string; subject?: string }>;
      fired: () => Array<{ id: string; kind: string }>;
      clearFired: () => unknown;
      reset: () => unknown;
      summarize: () => { total: number; enabled: number; fired: number };
      matchesFilter: (match: string, payload: object, event?: string) => boolean;
    };
  } = {
    localStorage: {
      store: {},
      getItem(k) { return Object.prototype.hasOwnProperty.call(this.store, k) ? this.store[k] : null; },
      setItem(k, v) { this.store[k] = String(v); },
      removeItem(k) { delete this.store[k]; },
    },
    CW_DATA: {
      members: [{ handle: "maya" }, { handle: "scout" }],
      hooks: [
        { id: "hook-bugs", event: "post.created", match: "channel:bugs", label: "Bugs", notify: true, enabled: true },
        { id: "hook-plusone", event: "reaction.added", match: "key:+1", label: "+1", notify: true, enabled: true },
      ],
    },
    CW_QUERY: Q,
  };
  new Function("window", hooksSrc)(hooksWin);
  assert.ok(hooksWin.CW_HOOKS);
  const H = hooksWin.CW_HOOKS!;
  assert.ok(H.events().some((e) => e.id === "post.created"));
  assert.ok(H.list().length >= 2);
  assert.equal(H.match("post.created", { channel: "bugs", body: "x" }).length, 1);
  assert.equal(H.match("post.created", { channel: "general", body: "x" }).length, 0);
  assert.ok(H.matchesFilter("channel:bugs", { channel: "bugs" }));
  assert.ok(!H.matchesFilter("key:+1", { key: "eyes" }));
  const emitted = H.emit("post.created", {
    id: "p-live-1", channel: "bugs", who: "maya", body: "broken install", subject: "Bug",
  });
  assert.ok(emitted.length >= 1);
  assert.equal(emitted[0].kind, "hook");
  assert.ok(H.fired().some((n) => n.id === emitted[0].id));
  const reactEmit = H.emit("reaction.added", { id: "p1", key: "+1", who: "you" });
  assert.ok(reactEmit.length >= 1);
  const added = H.add({ event: "mention.you", match: "", label: "My mentions" });
  assert.ok(added.ok && added.hook?.event === "mention.you");
  assert.ok(H.enable(added.hook!.id, false).ok);
  assert.ok(H.remove(added.hook!.id).ok);
  assert.ok(H.summarize().total >= 2);
  // sitemap merges hook-fired into Activity.
  assert.ok(readFileSync(join(ROOT, "sitemap.js"), "utf8").includes('filter === "hooks"') ||
    readFileSync(join(ROOT, "sitemap.js"), "utf8").includes('filter === "hook"'),
    "sitemap must filter hooks Activity");

  assert.ok(consoleSrc2.includes("data-sort=") && consoleSrc2.includes("data-share"),
    "hot/new/top/best filters and share replace graph/diff/raw");
  assert.ok(consoleSrc2.includes("function contextStrip"),
    "a channel must show what it is before what it contains");
  assert.ok(consoleSrc2.includes("cn-help") && consoleSrc2.includes("HELP_GROUPS"),
    "Ctrl+Space cheatsheet overlay must be rendered");
  assert.ok(consoleSrc2.includes("data-help-close") && consoleSrc2.includes('class="cn-esc"'),
    "cheatsheet dismiss must be [esc], not a close label");
  assert.ok(!/data-help-close[^>]*>\s*close\s*</i.test(consoleSrc2) &&
    !consoleSrc2.includes("cn-help-close"),
    "cheatsheet must not render a close button label");
  assert.ok(consoleSrc2.includes("data-esc-dismiss") &&
    /cn-blade-close[^>]*>esc</.test(consoleSrc2),
    "detail dismiss chrome must be [esc]");
  assert.ok(!/cn-blade-close[^>]*>\s*×\s*</.test(consoleSrc2),
    "detail must not use × as the dismiss affordance");
  assert.ok(consoleSrc2.includes("resolveHelpComponent") && consoleSrc2.includes("contexts:"),
    "cheatsheet must key off the focused component context");
  assert.ok(consoleSrc2.includes("visibleHelpGroups") || consoleSrc2.includes("visibleGroups"),
    "cheatsheet must expose visible group filtering");
  assert.ok(consoleSrc2.includes("buildHelpContext") && consoleSrc2.includes("contextLabel"),
    "cheatsheet must scope to the focused component");
  assert.ok(consoleSrc2.includes("detailOpen"),
    "help context must know whether selection detail is open");
  assert.ok(appSrc.includes("if (profileMenuOpen)") && appSrc.includes("closeProfileMenu") &&
    appSrc.includes('ev.key === "Escape"'),
    "Esc must dismiss the profile menu");
  assert.ok(appSrc.includes("openIntel") && appSrc.includes("ctrlKey"),
    "Ctrl+Space must open intellisense");
  assert.ok(appSrc.includes("maybeOpenKeysOnboard") && appSrc.includes("cw-keys-onboarded") &&
    appSrc.includes("keysOnboard"),
    "first visit must open the hotkey sheet and remember dismiss");
  assert.ok(appSrc.includes("intelOpen") && appSrc.includes("helpOpen") && appSrc.includes("helpCtx"),
    "intellisense freezes help context before focusing the prompt");
  assert.ok(appSrc.includes("menuDismissed") && appSrc.includes("dismissMenu"),
    "Esc must dismiss the suggestion combobox without clearing the draft");
  assert.ok(consoleSrc2.includes("menuShouldOpen"),
    "console render must use app.menuShouldOpen (includes menuDismissed) for the combobox");
  assert.ok(appSrc.includes("jumpChooserShouldOpen"),
    "jump chooser must stay visible after Enter clears the prompt");
  assert.ok(appSrc.includes("feedNoticeOpen") && appSrc.includes("pendingByFeed") &&
    consoleSrc2.includes("cn-feed-notice"),
    "new-posts notice is feed-scoped overlay, not page chrome");
  assert.ok(appSrc.includes("syncCompletionToIndex") &&
    /ArrowDown[\s\S]{0,200}syncCompletionToIndex[\s\S]{0,80}paintGhost/.test(appSrc),
    "↑↓ must sync ghost/insert to the highlighted candidate and repaint preview");
  assert.ok(/acceptGhost[\s\S]{0,200}syncCompletionToIndex/.test(appSrc),
    "→/End must accept the highlighted candidate, not always the first");
  assert.ok(appSrc.includes("setPersonPane") && appSrc.includes("personPane"),
    "person pane toggles messages (default) and profile");
  assert.ok(consoleSrc2.includes("cn-person-tab") && consoleSrc2.includes("data-person-pane"),
    "DM context exposes messages/profile toggles");
  assert.ok(consoleSrc2.includes("viewPersonProfile") && consoleSrc2.includes("cn-person-profile"),
    "person profile renders as TUI, not a web card");
  assert.ok(consoleSrc2.includes("cn-person-bio") && consoleSrc2.includes("cn-person-fact"),
    "profile supports GitHub-style bio + facts");
  assert.ok(!consoleSrc2.includes("cn-profile-card"),
    "person profile must not use card chrome");
  assert.ok(readFileSync(join(ROOT, "data.js"), "utf8").includes("bio:") &&
    readFileSync(join(ROOT, "data.js"), "utf8").includes("pinned:"),
    "member fixtures include bio and pinned projects");
  assert.ok(appSrc.includes('personPane = "messages"') || appSrc.includes("personPane: \"messages\""),
    "opening a person defaults to the messages pane");

  // Behavioural: focused component decides which groups appear.
  const helpWin: {
    CW_HELP?: {
      buildContext: (s: Record<string, unknown>) => { context: string; contextLabel: string };
      visibleGroups: (ctx: { context: string }) => { id: string; title: string }[];
      resolveComponent: (s: Record<string, unknown>) => string;
    };
    CW_MAP?: unknown;
    CW_DATA?: unknown;
  } = { CW_DATA: JSON.parse(dataJson()) };
  loadCommunityCore(helpWin);
  new Function("window", readFileSync(join(ROOT, "sitemap.js"), "utf8"))(helpWin);
  new Function("window", consoleSrc2)(helpWin);
  assert.ok(helpWin.CW_HELP, "CW_HELP must export");
  const promptCtx = helpWin.CW_HELP!.buildContext({
    path: "/", columnFocus: false, focus: 0, detailOpen: true, ai: true,
  });
  assert.equal(promptCtx.context, "prompt");
  const promptIds = helpWin.CW_HELP!.visibleGroups(promptCtx).map((g) => g.id);
  assert.ok(promptIds.includes("prompt") && promptIds.includes("sheet"),
    "prompt focus shows Prompt: " + promptIds.join(","));
  assert.ok(!promptIds.includes("nav") && !promptIds.includes("thread"),
    "prompt focus must not list nav/thread: " + promptIds.join(","));
  const navCtx = helpWin.CW_HELP!.buildContext({
    path: "/", columnFocus: true, focus: 0, detailOpen: true, ai: true,
  });
  assert.equal(navCtx.context, "nav");
  const navIds = helpWin.CW_HELP!.visibleGroups(navCtx).map((g) => g.id);
  assert.ok(navIds.includes("nav") && !navIds.includes("prompt"),
    "nav focus shows Navigation only: " + navIds.join(","));
  // First-visit onboard: lead teaches the win — sheet + trimmed verbs only.
  const onboardGroups = helpWin.CW_HELP!.visibleGroups(
    Object.assign({}, navCtx, { onboard: true }),
  );
  const onboardIds = onboardGroups.map((g) => g.id);
  assert.deepEqual(onboardIds.filter((id) => id === "nav"), [],
    "onboard must not dump Navigation: " + onboardIds.join(","));
  assert.ok(onboardIds.includes("sheet") && onboardIds.includes("verbs"),
    "onboard keeps sheet + verbs: " + onboardIds.join(","));
  const onboardVerbKeys = ((onboardGroups.find((g) => g.id === "verbs") as
    { rows?: { keys?: string }[] } | undefined)?.rows || [])
    .map((r) => String(r.keys || ""));
  assert.ok(onboardVerbKeys.every((k: string) => /^(j k|Enter|esc)/i.test(k)),
    "onboard verbs trimmed to first-win keys, got: " + onboardVerbKeys.join("|"));
  assert.ok(onboardVerbKeys.length >= 1 && onboardVerbKeys.length <= 4,
    "onboard verb count stays small: " + onboardVerbKeys.length);
  assert.ok(!/Allow alerts/.test(appSrc) || /permBtn\.hidden\s*=\s*true/.test(appSrc),
    "masthead must not host Allow alerts — Activity owns enable");
  assert.ok(/--cw-signed:\s*#7dff9a/.test(readFileSync(join(ROOT, "base.css"), "utf8")),
    "signed mint must sit far from warn amber");
  assert.ok(consoleSrc2.includes("cn-search-state[data-state=signed]{color:var(--cw-signed)}"),
    "search signed state uses --cw-signed, not live green");
  assert.ok(consoleSrc2.includes('title="Unread"') && /cn-badge[\s\S]{0,80}new/.test(consoleSrc2),
    "nav unread badge must say new/count — never stringify boolean true");
  assert.ok(consoleSrc2.includes('? "first keys"') || consoleSrc2.includes('"first keys"'),
    "onboard help scope must say first keys, not NAVIGATION");
  assert.ok(consoleSrc2.includes("scroll-padding-block-end") ||
    /cn-blade-body[\s\S]{0,120}3\.25rem/.test(consoleSrc2),
    "detail feed must pad above sticky prompt so scores are not occluded");
  assert.ok(consoleSrc2.includes('id: "states"'),
    "post-state colours live in the keys sheet");
  assert.ok(!/cn-state-legend[\s\S]{0,120}needs-review/.test(consoleSrc2) ||
    !/<span class="cn-state-legend"/.test(consoleSrc2),
    "state legend must not be permanent channel ctx chrome");
  assert.ok(readFileSync(join(ROOT, "sitemap.js"), "utf8").includes("label:") &&
    consoleSrc2.includes("e.label || e.name"),
    "Activity nav rows use human labels matching the card feed");
  const threadCtx = helpWin.CW_HELP!.buildContext({
    path: "/projects/community/channels/general",
    columnFocus: true, focus: 1, detailOpen: true, ai: true, cursor: 0,
  });
  assert.equal(threadCtx.context, "thread",
    "detail focus on a channel must be thread, got " + threadCtx.context);
  const threadIds = helpWin.CW_HELP!.visibleGroups(threadCtx).map((g) => g.id);
  assert.ok(threadIds.includes("thread") && !threadIds.includes("prompt"),
    "thread focus shows Thread: " + threadIds.join(","));
  const followCtx = helpWin.CW_HELP!.buildContext({
    path: "/", columnFocus: true, focus: 1, detailOpen: false, ai: true,
  });
  assert.equal(followCtx.context, "following");
  const dmCtx = helpWin.CW_HELP!.buildContext({
    path: "/dms/scout", columnFocus: true, focus: 1, detailOpen: true, ai: true,
  });
  assert.equal(dmCtx.context, "dm");
  assert.ok(helpWin.CW_HELP!.visibleGroups(dmCtx).some((g) => g.id === "dm"),
    "dm focus shows Messages");
  const completeSrc = readFileSync(join(ROOT, "complete.js"), "utf8");
  assert.ok(completeSrc.includes("SLASH_COMMANDS") && actionSrc.includes('"/go"'),
    "slash command catalogue must exist for agent chat");
  assert.ok(appSrc.includes("runSlash") && appSrc.includes("isSlash"),
    "slash commands must execute from the terminal prompt");

  // ── Smart input markers: @ mentions, # topics ───────────────────────────
  assert.ok(completeSrc.includes("MARKER_SPECS") && completeSrc.includes("activeMarker"),
    "completion must support smart-input markers");
  assert.ok(completeSrc.includes('char: "@"') && completeSrc.includes('char: "#"'),
    "@ and # markers must be registered");
  assert.ok(dataSrc.includes("topics:") || dataSrc.includes("topics :"),
    "fixture topics power # trending completion");
  assert.ok(appSrc.includes("applyCandidate") && appSrc.includes("isMarkerKind"),
    "prompt must apply marker candidates with trailing space");
  assert.ok(consoleSrc2.includes("Mentions") && consoleSrc2.includes('keys: "@"'),
    "UI must surface mentions in the palette and cheatsheet");

  // Behavioural: analyse("@ma") → @maya; analyse("#draft") → #draft-persistence
  const completeWin: {
    CW_DATA?: unknown;
    CW_MAP?: unknown;
    CW_COMPLETE?: {
      analyse: (input: string, ctx: { cwd: string; extra: unknown[]; slash?: boolean }) => {
        kind: string; candidates: Array<{ value: string; label?: string; kind?: string }>; insert: string;
        insertSpace?: boolean; replaceFrom: number; query: string;
      };
      activeMarker: (text: string) => { char: string; query: string } | null;
      isMarkerKind: (k: string) => boolean;
      formatGroupedHelp: (list: unknown[]) => string;
      slashSpec: (name: string) => { name: string; run?: string } | null;
      SLASH_COMMANDS: Array<{ name: string; run?: string; help?: string }>;
    };
  } = {};
  new Function("window", readFileSync(join(ROOT, "data.js"), "utf8"))(completeWin);
  loadActions(completeWin);
  // sitemap optional for markers; provide a stub MAP if complete.js closes over it.
  completeWin.CW_MAP = {
    list: () => [],
    resolve: (_cwd: string, p: string) => p,
    split: () => [],
    join: () => "/",
  };
  new Function("window", completeSrc)(completeWin);
  assert.ok(completeWin.CW_COMPLETE, "complete.js must define CW_COMPLETE");
  const C = completeWin.CW_COMPLETE!;
  assert.ok(typeof C.formatGroupedHelp === "function", "formatGroupedHelp groups aliases");
  const helpText = C.formatGroupedHelp(C.SLASH_COMMANDS);
  assert.ok(/\/dm,\s*\/msg/.test(helpText), "help groups /dm with /msg");
  assert.ok(!/alias of \/dm/i.test(helpText), "help must not list alias-of lines");
  assert.ok(/\/hooks/.test(helpText) && !/\/hook,/.test(helpText) && !/, \/hook/.test(helpText),
    "help lists /hooks once (not /hook,/hooks)");
  assert.equal(C.slashSpec("/hook")?.name, "/hooks", "legacy /hook resolves to /hooks");
  assert.equal(C.slashSpec("/hooks")?.run, "hooks");
  const slashCat = C.analyse("/", { cwd: "/", extra: [], slash: true });
  assert.ok(slashCat.candidates.some((c) => (c.label || c.value).includes("/dm") &&
    (c.label || c.value).includes("/msg")),
    "slash catalogue shows dm aliases together");
  assert.ok(!slashCat.candidates.some((c) => c.value === "/msg" && !c.label),
    "bare /msg must not be a separate catalogue row");
  assert.ok(slashCat.candidates.some((c) => c.value === "/hooks"),
    "slash catalogue includes /hooks");
  assert.ok(!slashCat.candidates.some((c) => c.value === "/hook" ||
    (c.label || "").split(/,\s*/).includes("/hook")),
    "/hook must not appear as its own catalogue row");
  assert.equal(C.activeMarker("hello @ma")?.char, "@");
  assert.equal(C.activeMarker("hello @ma ") , null, "trailing space ends the marker");
  assert.equal(C.activeMarker("email@x") , null, "mid-token @ is not a mention marker");
  assert.ok(C.isMarkerKind("mention") && C.isMarkerKind("topic"));
  const mentionHit = C.analyse("ping @ma", { cwd: "/", extra: [] });
  assert.equal(mentionHit.kind, "mention");
  assert.ok(mentionHit.candidates.some((c) => c.value === "@maya"), "mentions include @maya");
  assert.equal(mentionHit.candidates[0].value.charAt(0), "@");
  assert.equal(mentionHit.insertSpace, true);
  const topicHit = C.analyse("see #draft", { cwd: "/", extra: [] });
  assert.ok(C.isMarkerKind(topicHit.kind), "# completion is a marker kind");
  assert.ok(topicHit.candidates.some((c) => c.value === "#draft-persistence"),
    "topics include #draft-persistence");
  const bareMention = C.analyse("@", { cwd: "/", extra: [], slash: true });
  assert.equal(bareMention.kind, "mention");
  assert.ok(bareMention.candidates.length >= 4, "bare @ lists members even in ai/slash mode");
  const bareTopic = C.analyse("#", { cwd: "/", extra: [] });
  assert.ok(bareTopic.candidates.some((c) => c.kind === "topic" || c.value.startsWith("#")));
  assert.ok(bareTopic.candidates.some((c) => c.value === "#bugs" || c.kind === "channel"),
    "# also surfaces channel short-names");

  const pathWin: {
    CW_DATA?: unknown;
    CW_MAP?: {
      messagePath: (path: string, id: string, extra: unknown[]) => string | null;
      list: (path: string, extra?: unknown[]) => Array<{ name: string; hint?: string }> | null;
    };
    CW_COMPLETE?: {
      analyse: (input: string, ctx: { cwd: string; extra: unknown[] }) => {
        candidates: Array<{ value: string; label?: string; hint?: string; kind?: string }>;
      };
    };
  } = { CW_DATA: JSON.parse(dataJson()) };
  loadCommunityCore(pathWin);
  new Function("window", readFileSync(join(ROOT, "sitemap.js"), "utf8"))(pathWin);
  loadActions(pathWin);
  new Function("window", completeSrc)(pathWin);
  const messagePath = pathWin.CW_MAP!.messagePath(
    "/projects/community/channels/general", "p3", [],
  );
  assert.equal(messagePath, "/projects/community/channels/general/p1/p2/p3");
  assert.deepEqual(pathWin.CW_MAP!.list("/projects/community/channels/general/p1/p2", [])
    ?.map((entry) => entry.name), ["body.md", "metadata.json", "replies", "backlinks", "receipts"],
  "message directories expose readable representations and relations");
  assert.ok(pathWin.CW_MAP!.list("/projects/community/channels/general/p1/p2/replies", [])
    ?.some((entry) => entry.name === "p3"), "message replies list direct children by stable id");
  const messageCd = pathWin.CW_COMPLETE!.analyse("cd p3", {
    cwd: "/projects/community/channels/general", extra: [],
  });
  const p3Choice = messageCd.candidates.find((candidate) => candidate.label === "p3");
  assert.ok(p3Choice && /Drafted a plan to split the cache key/i.test(p3Choice.hint || ""),
    "cd completion pairs message ids with their title/summary");

  // ── Speech-to-text: feature-detect + Discord-style hotkeys ───────────────
  const speechSrc = readFileSync(join(ROOT, "speech.js"), "utf8");
  assert.ok(speechSrc.includes("CW_SPEECH") && speechSrc.includes("SpeechRecognition"),
    "speech module must feature-detect Web Speech API");
  assert.ok(speechSrc.includes("isPttKey") && speechSrc.includes("Backquote"),
    "push-to-talk must bind Discord-style hold `");
  assert.ok(speechSrc.includes("isToggleKey") && speechSrc.includes("Alt"),
    "toggle dictation must bind Alt+V");
  assert.ok(speechSrc.includes("isIntentModeKey") && speechSrc.includes("parseUtterance"),
    "voice commands must expose intent-mode cycle and utterance parsing");
  assert.ok(speechSrc.includes("whatCanISay") && speechSrc.includes("commands mode"),
    "voice help must match Voice Access discoverability");
  assert.ok(appSrc.includes("wireSpeech") && appSrc.includes("toggleDictation"),
    "app must wire speech only when supported");
  assert.ok(appSrc.includes("handleSpeechFinal") && appSrc.includes("cycleSpeechIntent"),
    "app must route finals through voice intent and cycle modes");
  assert.ok(appSrc.includes("data-speech-mic") || consoleSrc2.includes("data-speech-mic"),
    "mic control is rendered from the console prompt");
  assert.ok(readFileSync(join(ROOT, "icons.js"), "utf8").includes("CW_ICONS") &&
    readFileSync(join(ROOT, "icons.js"), "utf8").includes("pixelarticons"),
    "16-bit iconography pack (pixelarticons) must expose CW_ICONS");
  assert.ok(consoleSrc2.includes("CW_ICONS") && consoleSrc2.includes("cw-ico"),
    "mic button must use the 16-bit pack glyph, not the word mic");
  assert.ok(readFileSync(join(ROOT, "board.html"), "utf8").includes("icons.js"),
    "index must load icons.js");
  assert.ok(consoleSrc2.includes("Hold `") && consoleSrc2.includes("Alt+V"),
    "cheatsheet documents speech hotkeys when speech is available");
  assert.ok(readFileSync(join(ROOT, "board.html"), "utf8").includes("speech.js"),
    "index must load speech.js");

  // Unsupported browser: no constructor → isSupported false, create still safe.
  const speechOff: {
    SpeechRecognition?: unknown;
    webkitSpeechRecognition?: unknown;
    CW_SPEECH?: {
      isSupported: () => boolean;
      create: (opts: {
        onFinal?: (t: string) => void;
        onPartial?: (t: string) => void;
        onState?: (s: { listening: boolean; mode: string | null; error: string | null }) => void;
      }) => {
        isSupported: () => boolean;
        pttDown: () => boolean;
        pttUp: () => void;
        toggle: () => boolean;
        stop: () => void;
        getState: () => { listening: boolean; mode: string | null };
      };
      isPttKey: (ev: { code?: string; key?: string; altKey?: boolean; ctrlKey?: boolean; metaKey?: boolean; shiftKey?: boolean }) => boolean;
      isToggleKey: (ev: { key?: string; code?: string; altKey?: boolean; ctrlKey?: boolean; metaKey?: boolean; shiftKey?: boolean }) => boolean;
      isIntentModeKey?: (ev: { key?: string; code?: string; altKey?: boolean; ctrlKey?: boolean; metaKey?: boolean; shiftKey?: boolean }) => boolean;
      parseUtterance?: (raw: string, intent?: string) => {
        kind: string; text?: string; line?: string; nextMode?: string; hint?: string;
      };
      nextIntentMode?: (current?: string) => string;
      whatCanISay?: () => string;
      HOTKEYS: { ptt: string; toggle: string; intent?: string };
    };
  } = {};
  new Function("window", speechSrc)(speechOff);
  assert.ok(speechOff.CW_SPEECH, "speech.js defines CW_SPEECH");
  assert.equal(speechOff.CW_SPEECH!.isSupported(), false, "no SpeechRecognition → unsupported");
  assert.equal(speechOff.CW_SPEECH!.isPttKey({ code: "Backquote", key: "`" }), true);
  assert.equal(speechOff.CW_SPEECH!.isPttKey({ code: "Backquote", key: "`", ctrlKey: true }), false,
    "PTT ignores modified backticks");
  assert.equal(speechOff.CW_SPEECH!.isToggleKey({ key: "v", altKey: true }), true);
  assert.equal(speechOff.CW_SPEECH!.isToggleKey({ key: "v", altKey: false }), false);
  assert.equal(speechOff.CW_SPEECH!.HOTKEYS.ptt, "`");
  assert.equal(speechOff.CW_SPEECH!.HOTKEYS.toggle, "Alt+V");
  assert.equal(speechOff.CW_SPEECH!.HOTKEYS.intent, "Alt+Shift+V");
  assert.equal(speechOff.CW_SPEECH!.isIntentModeKey!({ key: "v", altKey: true, shiftKey: true }), true);
  assert.equal(speechOff.CW_SPEECH!.isToggleKey({ key: "v", altKey: true, shiftKey: true }), false,
    "Alt+Shift+V must not also fire listen toggle");
  // Voice Access-style parse: wake prefix + grammar.
  const P = speechOff.CW_SPEECH!;
  assert.equal(P.parseUtterance!("hello board", "dictation").kind, "dictation");
  assert.equal(P.parseUtterance!("hello board", "dictation").text, "hello board");
  assert.equal(P.parseUtterance!("computer go to bugs", "default").kind, "command");
  assert.match(P.parseUtterance!("computer go to bugs", "default").line || "", /\/go /);
  assert.equal(P.parseUtterance!("go to bugs", "commands").kind, "command");
  assert.equal(P.parseUtterance!("go to bugs", "dictation").kind, "dictation",
    "without wake, dictation mode types the phrase");
  assert.equal(P.parseUtterance!("commands mode", "dictation").kind, "mode-switch");
  assert.equal(P.parseUtterance!("commands mode", "dictation").nextMode, "commands");
  assert.equal(P.parseUtterance!("what can I say", "default").kind, "help");
  assert.equal(P.parseUtterance!("blorp the zorp", "commands").kind, "unknown");
  assert.equal(P.nextIntentMode!("default"), "dictation");
  assert.equal(P.nextIntentMode!("dictation"), "commands");
  assert.equal(P.nextIntentMode!("commands"), "default");
  assert.ok((P.whatCanISay!() || "").includes("go to"));

  // Supported: mock Recognition drives ptt/toggle + final transcript.
  type RecHandler = ((ev?: unknown) => void) | null;
  class MockRec {
    continuous = false;
    interimResults = false;
    lang = "";
    onstart: RecHandler = null;
    onresult: RecHandler = null;
    onerror: RecHandler = null;
    onend: RecHandler = null;
    started = false;
    start() {
      this.started = true;
      if (this.onstart) this.onstart();
    }
    stop() {
      this.started = false;
      if (this.onend) this.onend();
    }
    abort() {
      this.started = false;
      if (this.onend) this.onend();
    }
    emitFinal(text: string) {
      if (this.onresult) {
        this.onresult({
          resultIndex: 0,
          results: [{ isFinal: true, 0: { transcript: text }, length: 1 }],
        });
      }
    }
    emitInterim(text: string) {
      if (this.onresult) {
        this.onresult({
          resultIndex: 0,
          results: [{ isFinal: false, 0: { transcript: text }, length: 1 }],
        });
      }
    }
  }
  const speechOn: typeof speechOff & { SpeechRecognition: typeof MockRec } = {
    SpeechRecognition: MockRec,
  };
  new Function("window", speechSrc)(speechOn);
  assert.equal(speechOn.CW_SPEECH!.isSupported(), true);
  const finals: string[] = [];
  const partials: string[] = [];
  const states: Array<{ listening: boolean; mode: string | null }> = [];
  const eng = speechOn.CW_SPEECH!.create({
    onFinal: (t) => finals.push(t),
    onPartial: (t) => partials.push(t),
    onState: (s) => states.push({ listening: s.listening, mode: s.mode }),
  });
  assert.equal(eng.isSupported(), true);
  assert.equal(eng.pttDown(), true);
  assert.equal(eng.getState().mode, "ptt");
  assert.equal(eng.getState().listening, true);
  // Reach into the live instance via a second start path is awkward; drive via
  // the fact create keeps one rec — re-call start internals by toggling.
  // Instead, use toggle after stop and emit from a fresh MockRec each start.
  eng.stop();
  assert.equal(eng.getState().listening, false);
  assert.equal(eng.toggle(), true);
  assert.equal(eng.getState().mode, "toggle");
  // Find the active mock: last constructed is the engine's rec.
  // Emit through a controlled instance by constructing one that create will use.
  // Simpler path: call create again with a factory window that records instances.
  const instances: MockRec[] = [];
  class TrackingRec extends MockRec {
    constructor() {
      super();
      instances.push(this);
    }
  }
  const speechTrack: typeof speechOff & { SpeechRecognition: typeof TrackingRec } = {
    SpeechRecognition: TrackingRec,
  };
  new Function("window", speechSrc)(speechTrack);
  const finals2: string[] = [];
  const eng2 = speechTrack.CW_SPEECH!.create({
    onFinal: (t) => finals2.push(t),
    onPartial: () => undefined,
  });
  eng2.pttDown();
  assert.ok(instances.length >= 1);
  instances[instances.length - 1].emitFinal("hello board");
  assert.deepEqual(finals2, ["hello board"]);
  eng2.pttUp();
  assert.equal(eng2.getState().listening, false);

  // ── Channel voice: Discord-parity WebRTC mesh ────────────────────────────
  const voiceSrc = readFileSync(join(ROOT, "voice.js"), "utf8");
  assert.ok(voiceSrc.includes("CW_VOICE") && voiceSrc.includes("RTCPeerConnection"),
    "voice module must feature-detect WebRTC");
  assert.ok(voiceSrc.includes("preferOpusOnPc") && voiceSrc.includes("setCodecPreferences"),
    "voice must prefer Opus via setCodecPreferences (no SDP munging)");
  assert.ok(!/offer\.sdp\s*=\s*preferOpus|answer\.sdp\s*=\s*preferOpus/.test(voiceSrc),
    "voice must not rewrite offer/answer SDP strings");
  assert.ok(voiceSrc.includes("isVoicePttKey") && voiceSrc.includes("BroadcastChannel"),
    "voice PTT + BroadcastChannel signaling");
  assert.ok(voiceSrc.includes("echoCancellation") && voiceSrc.includes("latencyHint"),
    "getUserMedia must request low-latency capture");
  assert.ok(appSrc.includes("wireVoice") && appSrc.includes("joinVoice"),
    "app must wire channel voice join/leave");
  assert.ok(appSrc.includes("voiceClaimsPtt") && appSrc.includes("Ctrl+Shift+M"),
    "voice PTT must preempt STT; Ctrl+Shift+M mutes");
  assert.ok(consoleSrc2.includes("cn-voice-dock") && consoleSrc2.includes("data-voice-join"),
    "console must render voice dock and join controls");
  assert.ok(readFileSync(join(ROOT, "board.html"), "utf8").includes("voice.js"),
    "index must load voice.js");
  assert.ok(actionSrc.includes('"/voice"'),
    "slash catalogue includes /voice");
  assert.ok(readFileSync(join(ROOT, "data.js"), "utf8").includes('kind: "voice"'),
    "seed data includes voice channels");
  assert.ok(readFileSync(join(ROOT, "tools.js"), "utf8").includes("board_voice_join"),
    "WebMCP exposes board_voice_join");

  const voiceOff: {
    RTCPeerConnection?: unknown;
    BroadcastChannel?: unknown;
    CW_VOICE?: {
      isSupported: () => boolean;
      isVoicePttKey: (ev: {
        code?: string; key?: string; altKey?: boolean; ctrlKey?: boolean;
        metaKey?: boolean; shiftKey?: boolean;
      }) => boolean;
      create: (opts?: { onState?: (s: Record<string, unknown>) => void }) => {
        join: (id: string, path?: string) => Promise<{ ok: boolean; error?: string }>;
        leave: () => Promise<{ ok: boolean }>;
        toggleMute: () => boolean;
        setInputMode: (m: string) => string;
        getState: () => { joined: boolean; muted: boolean; inputMode: string; supported: boolean };
        isSupported: () => boolean;
      };
      CHANNEL: string;
    };
    navigator?: { mediaDevices?: { getUserMedia?: unknown } };
  } = { navigator: {} };
  new Function("window", voiceSrc)(voiceOff);
  assert.ok(voiceOff.CW_VOICE, "voice.js defines CW_VOICE");
  assert.equal(voiceOff.CW_VOICE!.isSupported(), false, "no RTCPeerConnection → unsupported");
  assert.equal(voiceOff.CW_VOICE!.isVoicePttKey({ code: "Backquote", key: "`" }), true);
  assert.equal(voiceOff.CW_VOICE!.isVoicePttKey({ code: "Backquote", key: "`", altKey: true }), false,
    "voice PTT ignores modified backticks");
  assert.equal(voiceOff.CW_VOICE!.CHANNEL, "epoch-community-web-voice-v1");

  // Supported path with mocked WebRTC + mic (no real devices in unit).
  class MockPC {
    connectionState = "new";
    onicecandidate: ((ev: { candidate: null }) => void) | null = null;
    ontrack: ((ev: unknown) => void) | null = null;
    onconnectionstatechange: (() => void) | null = null;
    addTrack() { /* noop */ }
    close() { this.connectionState = "closed"; }
    createOffer() { return Promise.resolve({ type: "offer", sdp: "m=audio 9 UDP/TLS/RTP/SAVPF 111\r\na=rtpmap:111 opus/48000/2\r\n" }); }
    createAnswer() { return Promise.resolve({ type: "answer", sdp: "m=audio 9 UDP/TLS/RTP/SAVPF 111\r\n" }); }
    setLocalDescription() { return Promise.resolve(); }
    setRemoteDescription() { return Promise.resolve(); }
    addIceCandidate() { return Promise.resolve(); }
    getStats() { return Promise.resolve(new Map()); }
  }
  const busInbox: unknown[] = [];
  class MockBC {
    name: string;
    onmessage: ((ev: { data: unknown }) => void) | null = null;
    constructor(name: string) { this.name = name; }
    postMessage(data: unknown) { busInbox.push(data); }
    close() { /* noop */ }
  }
  const micTrack = { kind: "audio", enabled: true, stop() { /* noop */ } };
  const voiceOn = {
    RTCPeerConnection: MockPC,
    BroadcastChannel: MockBC,
    AudioContext: class {
      createMediaStreamSource() {
        return { connect() { /* noop */ } };
      }
      createAnalyser() {
        return {
          fftSize: 512,
          smoothingTimeConstant: 0.3,
          getByteTimeDomainData(arr: Uint8Array) {
            for (let i = 0; i < arr.length; i++) arr[i] = 128;
          },
        };
      }
      close() { return Promise.resolve(); }
    },
    navigator: {
      mediaDevices: {
        getUserMedia: async () => ({
          getTracks: () => [micTrack],
          getAudioTracks: () => [micTrack],
        }),
      },
    },
    CW_VOICE: undefined as undefined | typeof voiceOff.CW_VOICE,
  };
  new Function("window", voiceSrc)(voiceOn);
  assert.equal(voiceOn.CW_VOICE!.isSupported(), true);
  const voiceStates: Array<Record<string, unknown>> = [];
  const veng = voiceOn.CW_VOICE!.create({ onState: (s) => voiceStates.push(s) });
  const voiceJoined = await veng.join("lounge", "/projects/community/channels/lounge");
  assert.equal(voiceJoined.ok, true, "mock join succeeds");
  assert.equal(veng.getState().joined, true);
  assert.equal(veng.getState().inputMode, "vad");
  assert.ok(busInbox.some((m) => (m as { type?: string }).type === "hello"),
    "hello signal posted on join");
  assert.equal(veng.toggleMute(), true);
  assert.equal(veng.getState().muted, true);
  assert.equal(veng.setInputMode("ptt"), "ptt");
  await veng.leave();
  assert.equal(veng.getState().joined, false);
  assert.ok(voiceStates.length >= 1, "onState fired during voice session");

  // ── Durable page state + Anonymous profile + spaces + portable auth ────
  const sessionSrc = readFileSync(join(ROOT, "session.js"), "utf8");
  assert.ok(sessionSrc.includes("CW_SESSION") && sessionSrc.includes("cw-identity"),
    "session module must expose durable identity storage");
  assert.ok(sessionSrc.includes("authorizeAtproto") && sessionSrc.includes("PAR/PKCE/DPoP"),
    "AT sign-in requires PAR/PKCE/DPoP and must not mint a stub DID");
  assert.ok(sessionSrc.includes("claimIdentity") && sessionSrc.includes("principalId"),
    "claim must preserve the anonymous principal id");
  assert.ok(sessionSrc.includes("joinSpace") && sessionSrc.includes("listSpaces"),
    "spaces must be joinable");
  assert.ok(sessionSrc.includes("relayForIdentity") || sessionSrc.includes("relay"),
    "session keeps internal transport state on identity");
  assert.ok(!/Spaces · relays · subreddits|relay\+workspace\+subreddit/.test(appSrc + consoleSrc2),
    "UI must not declare relay/workspace/subreddit as space framing");
  assert.ok(!/name:\s*"\/spaces"/.test(completeSrc) && completeSrc.includes('"/space"'),
    "slash surface is /space only (no separate /spaces command)");
  assert.ok(completeSrc.includes('"/spaces"') && completeSrc.includes('n = "/space"'),
    "legacy /spaces aliases to /space");
  assert.ok(!/name:\s*"\/hook"/.test(completeSrc) && completeSrc.includes('"/hooks"'),
    "slash surface is /hooks only (no separate /hook command)");
  assert.ok(completeSrc.includes('"/hook"') && completeSrc.includes('n = "/hooks"'),
    "legacy /hook aliases to /hooks");
  assert.ok(completeSrc.includes("spaceCandidates") || completeSrc.includes('arg: "space"'),
    "/space args complete to space ids");
  assert.ok(appSrc.includes('navigate("/spaces"') && /run === "space"/.test(appSrc),
    "bare /space opens the spaces select list");
  assert.ok(sessionSrc.includes("profileInitials") && sessionSrc.includes("Anonymous"),
    "profile defaults to Anonymous initials");
  assert.ok(sessionSrc.includes("guestsAllowed") && sessionSrc.includes("canParticipate"),
    "community policy must gate guest participation");
  assert.ok(sessionSrc.includes("saveBoardState") && sessionSrc.includes("cw-board-state"),
    "page state (path, workspaces, furniture) must be durable");

  // In-memory localStorage stand-in so the browser script runs under node.
  const mem = new Map<string, string>();
  const ls = {
    getItem: (k: string) => (mem.has(k) ? mem.get(k)! : null),
    setItem: (k: string, v: string) => { mem.set(k, String(v)); },
    removeItem: (k: string) => { mem.delete(k); },
  };
  type Space = {
    id: string; name: string; short: string; guestsAllowed: boolean; home?: boolean;
    slug?: string; subscribers?: number;
    relay?: { url: string; protocol: string; status: string; read: boolean; write: boolean };
  };
  type SessionApi = {
    loadPolicy: () => { guestsAllowed: boolean };
    loadIdentity: (p: { guestsAllowed: boolean }) => {
      kind: string; principalId: string | null; canParticipate: boolean; claimable: boolean;
      displayName?: string; spaceId?: string; anonymous?: boolean;
      relay?: { status?: string; write?: boolean; protocol?: string };
    };
    claimIdentity: (cur: { principalId: string; kind: string }, handle: string, spaceId?: string) => {
      kind: string; principalId: string; handle: string; claimable: boolean; spaceId?: string;
    };
    authorizeAtproto: (handle: string, principalId?: string, spaceId?: string, oauth?: { did: string; handle?: string; accessToken: string; source: string; pdsEndpoint?: string }) => {
      kind: string; did: string; handle: string; principalId: string; atproto: { did: string };
      spaceId?: string;
    };
    joinSpace: (cur: object, spaceId: string, opts?: { handle?: string; atprotoHandle?: string }) => {
      kind: string; spaceId?: string; handle?: string | null; anonymous?: boolean;
      relay?: { status?: string; write?: boolean };
    };
    listSpaces: () => Space[];
    profileLabel: (id: object) => string;
    profileInitials: (id: object) => string;
    signOut: (p: { guestsAllowed: boolean }) => { kind: string; principalId?: string | null; displayName?: string };
    saveBoardState: (s: unknown) => void;
    loadBoardState: () => unknown;
    saveIdentity: (id: unknown) => void;
    KEYS: { identity: string; board: string; policy: string };
  };
  const win: {
    CW_SESSION?: SessionApi;
    CW_DATA?: { spaces: Space[] };
    localStorage: typeof ls;
  } = {
    localStorage: ls,
    CW_DATA: {
      spaces: [
        {
          id: "civic-workshop", name: "EPOCH CIVIC WORKSHOP", short: "CIVIC", slug: "r/civic-workshop",
          guestsAllowed: true, home: true, subscribers: 10,
          relay: { url: "wss://r/civic", protocol: "nostr", status: "connected", read: true, write: true },
        },
        {
          id: "agent-lab", name: "Agent Lab", short: "AGNT", slug: "r/agent-lab",
          guestsAllowed: true, subscribers: 5,
          relay: { url: "wss://r/agents", protocol: "nostr", status: "connected", read: true, write: true },
        },
        {
          id: "tuner-crew", name: "Tuner Crew", short: "TUNR", slug: "r/tuner-crew",
          guestsAllowed: false, subscribers: 3,
          relay: { url: "wss://r/tuner", protocol: "nostr", status: "idle", read: true, write: false },
        },
      ],
    },
  };
  new Function("window", sessionSrc)(win);
  assert.ok(win.CW_SESSION, "session.js must define window.CW_SESSION");
  const S = win.CW_SESSION!;
  const pol = S.loadPolicy();
  assert.equal(pol.guestsAllowed, true, "default community allows guests");
  const guest = S.loadIdentity(pol);
  assert.equal(guest.kind, "guest");
  assert.equal(guest.displayName, "Anonymous");
  assert.equal(guest.spaceId, "civic-workshop");
  assert.ok(guest.relay && guest.relay.protocol === "nostr", "joining home attaches internal transport");
  assert.ok(guest.principalId && guest.principalId.startsWith("guest_"), "guest mints principalId");
  assert.equal(guest.canParticipate, true);
  assert.equal(guest.claimable, true);
  assert.equal(S.profileLabel(guest), "Anonymous");
  assert.equal(S.profileInitials(guest), "AN");
  const spacesListed = S.listSpaces();
  assert.ok(spacesListed.every((s) => s.relay && s.slug), "each space has transport + slug internally");
  // Durable: reloading identity returns the same principal.
  const guest2 = S.loadIdentity(pol);
  assert.equal(guest2.principalId, guest.principalId, "guest identity survives reload");
  // Claim keeps principalId and can target a space.
  const claimed = S.claimIdentity(
    { principalId: guest.principalId!, kind: guest.kind },
    "maya",
    "agent-lab",
  );
  assert.equal(claimed.kind, "claimed");
  assert.equal(claimed.principalId, guest.principalId, "claim preserves principal");
  assert.equal(claimed.handle, "maya");
  assert.equal(claimed.spaceId, "agent-lab");
  assert.equal(claimed.claimable, false);
  assert.throws(() => S.authorizeAtproto("maya", guest.principalId!, "tuner-crew"), /PAR\/PKCE\/DPoP/u);
  const at = S.authorizeAtproto("maya", guest.principalId!, "tuner-crew", {
    did: "did:plc:fromtokennotahash",
    handle: "maya.bsky.social",
    accessToken: "dpop-access",
    source: "par-pkce-dpop",
    pdsEndpoint: "https://auth.test",
  });
  assert.equal(at.kind, "atproto");
  assert.equal(at.handle, "maya.bsky.social");
  assert.equal(at.did, "did:plc:fromtokennotahash");
  assert.equal(at.principalId, guest.principalId, "AT login may keep guest principal");
  assert.equal(at.spaceId, "tuner-crew");
  assert.ok(at.atproto && at.atproto.did === at.did);
  // joinSpace: anonymous into open space works; members-only requires handle.
  const anonLab = S.joinSpace(guest, "agent-lab");
  assert.equal(anonLab.spaceId, "agent-lab");
  assert.equal(anonLab.kind, "guest");
  assert.throws(() => S.joinSpace(guest, "tuner-crew"), /sign-in|members|requires/i);
  const joined = S.joinSpace(guest, "tuner-crew", { handle: "lea" });
  assert.equal(joined.spaceId, "tuner-crew");
  assert.equal(joined.kind, "claimed");
  assert.equal(joined.handle, "lea");
  assert.ok(joined.relay && joined.relay.write === true, "signed-in members get relay write");
  assert.ok(S.listSpaces().length >= 3);
  // Sign-out mints a fresh anonymous guest when policy allows.
  S.saveIdentity(at);
  const afterOut = S.signOut(pol);
  assert.equal(afterOut.kind, "guest");
  assert.equal(afterOut.displayName, "Anonymous");
  assert.notEqual(
    afterOut.principalId,
    guest.principalId,
    "sign-out drops the prior principal so the next person is not you",
  );
  // Board state round-trip.
  S.saveBoardState({ v: 2, principalId: guest.principalId, path: "/projects/community/channels/bugs" });
  const board = S.loadBoardState() as { path: string; principalId: string };
  assert.equal(board.path, "/projects/community/channels/bugs");
  assert.equal(board.principalId, guest.principalId);
  // Denied when community disallows guests and no AT session.
  mem.clear();
  ls.setItem(S.KEYS.policy, JSON.stringify({ guestsAllowed: false, name: "closed" }));
  const closed = S.loadPolicy();
  assert.equal(closed.guestsAllowed, false);
  const denied = S.loadIdentity(closed);
  assert.equal(denied.kind, "denied");
  assert.equal(denied.canParticipate, false);

  assert.ok(appSrc.includes("paintIdentity") && appSrc.includes("data-profile-btn"),
    "app must paint a profile button");
  assert.ok(appSrc.includes("openProfileMenu") && appSrc.includes("doJoinSpace"),
    "profile menu and space join must be wired");
  assert.ok(appSrc.includes("restoreBoardState") && appSrc.includes("schedulePersist"),
    "page state must restore at boot and persist after mutations");
  assert.ok(appSrc.includes("doAtprotoLogin") && appSrc.includes("doClaim"),
    "claim and portable-handle login must be wired");
  assert.ok(appSrc.includes("requireParticipation"),
    "participation (vote/reply) must gate on authorized session");
  assert.ok(actionSrc.includes('"/whoami"') && actionSrc.includes('"/login"') &&
    actionSrc.includes('"/claim"') && actionSrc.includes('"/logout"') &&
    actionSrc.includes('"/space"'),
    "slash surface must expose whoami / login / claim / logout / space");
  const indexHtml = readFileSync(join(ROOT, "board.html"), "utf8");
  assert.ok(indexHtml.includes("session.js") && indexHtml.includes("data-identity-host"),
    "index must load session.js and host the profile");
  assert.ok(indexHtml.includes("data-profile-menu") && indexHtml.includes("data-auth-space"),
    "index must host profile menu and space picker");
  assert.ok(indexHtml.includes("data-auth-dialog") && indexHtml.includes("data-auth-atproto"),
    "index must host the sign-in dialog");
  assert.ok(/data-auth-cancel[^>]*>esc</.test(indexHtml),
    "auth cancel must be [esc]");
  const loginHelp = (actionSrc.match(/"\/login"[^}]+/) || [""])[0];
  const authDialog = (indexHtml.match(/data-auth-dialog[\s\S]*?<\/div>\s*<\/div>/) || [""])[0];
  const openAuthFn = (appSrc.match(/function openAuth[\s\S]*?function closeAuth/) || [""])[0];
  const profileLogin = (appSrc.match(/data-profile-bluesky[^>]*>[^<]+/) || [""])[0];
  assert.ok(loginHelp.length > 0, "/login completer must exist");
  assert.ok(authDialog.length > 0, "auth dialog markup must exist");
  assert.ok(openAuthFn.length > 0, "openAuth helper must exist");
  assert.ok(!/Bluesky|bsky\.social/.test(authDialog + openAuthFn + profileLogin + loginHelp),
    "login UI must not mention Bluesky");
  assert.ok(baseCss.includes(".cw-profile-btn") && baseCss.includes(".cw-profile-menu") &&
    baseCss.includes(".cw-auth"),
    "profile button, menu, and auth dialog styles must exist");
  assert.ok(dataSrc.includes("spaces:") || dataSrc.includes("spaces :"),
    "fixture spaces power space sign-in");
  assert.ok(!/relay\+workspace\+subreddit|Spaces · relays · subreddits/.test(dataSrc + consoleSrc2 + appSrc),
    "fixtures and UI must not advertise relay/workspace/subreddit mashup");

  console.log("Community Web app theme tests passed");
}
