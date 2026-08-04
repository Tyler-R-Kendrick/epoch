import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";

/**
 * The Nightboard contract has a contrast floor. Two of the ten themes shipped
 * below it — Breadbin at 6.0:1 and Solar Night at 5.6:1 against a 7:1 body
 * floor — and nothing caught it, because a theme is data and data was not
 * tested. Anyone adding an eleventh theme should not have to remember.
 *
 * This also enforces the harder rule: a theme is CSS and nothing else. A theme
 * that reaches the network breaks the page's self-contained guarantee, and one
 * that writes markup breaks the garden for every other theme.
 */

const ROOT = join(process.cwd(), "docs/design-explorations/nightboard");

interface Theme {
  readonly id: string;
  readonly name: string;
  readonly css: string;
}

function dataJson(): string {
  const source = readFileSync(join(ROOT, "data.js"), "utf8");
  const sandbox: { NB_DATA?: unknown } = {};
  new Function("window", source)(sandbox);
  return JSON.stringify(sandbox.NB_DATA);
}

function loadThemes(): readonly Theme[] {
  const source = readFileSync(join(ROOT, "themes.js"), "utf8");
  const sandbox: { NB_THEMES?: Theme[] } = {};
  // The file is a browser script assigning to window; give it a window.
  new Function("window", source)(sandbox);
  assert.ok(Array.isArray(sandbox.NB_THEMES), "themes.js must define window.NB_THEMES");
  return sandbox.NB_THEMES as Theme[];
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

export function runNightboardThemeTests(): void {
  const themes = loadThemes();
  assert.equal(themes.length, 2, "two themes: the lit terminal and the printed one");

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
    const bg = tokens.get("--nb-bg");
    const ink = tokens.get("--nb-ink");
    const dim = tokens.get("--nb-ink-dim");
    assert.ok(bg && ink && dim, `${theme.id} must set --nb-bg, --nb-ink and --nb-ink-dim`);

    const inkRatio = contrast(ink as string, bg as string);
    const dimRatio = contrast(dim as string, bg as string);
    assert.ok(inkRatio >= 7,
      `${theme.id}: body ink is ${inkRatio.toFixed(1)}:1 on its ground, below the 7:1 floor`);
    assert.ok(dimRatio >= 4.5,
      `${theme.id}: dim ink is ${dimRatio.toFixed(1)}:1 on its ground, below the 4.5:1 floor`);

    // The reserved ink must be tellable from the state inks, or the legend lies.
    const accent = tokens.get("--nb-accent");
    if (accent !== undefined) {
      for (const role of ["--nb-live", "--nb-warn", "--nb-danger"]) {
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
  const librarySandbox: { NB_OPENUI?: { schema: { properties?: Record<string, unknown> }; systemPrompt: string } } = {};
  new Function("window", library)(librarySandbox);
  const openui = librarySandbox.NB_OPENUI;
  assert.ok(openui, "openui-library.js must define window.NB_OPENUI");
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
  const sandbox2: { NB_DATA?: unknown; NB_MAP?: unknown; NB_EXPERIENCES?: { id: string; keys?: string }[] } = {
    NB_DATA: JSON.parse(dataJson()),
  };
  new Function("window", readFileSync(join(ROOT, "sitemap.js"), "utf8"))(sandbox2);
  new Function("window", consoleSource)(sandbox2);
  const exps = sandbox2.NB_EXPERIENCES ?? [];
  assert.equal(exps.length, 1, "one consolidated experience");

  // Every input method must be a peer. A keyboard-only surface is unusable on a
  // phone; a pointer-only one is unusable for the audience this is built for.
  for (const hook of ["cn-crumb", "cn-item", "cn-view", "cn-cand"]) {
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
  for (const tool of ["board_navigate", "board_list", "board_where", "view_set",
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
  assert.ok(agentSource.includes("NB_MCP.list()") || agentSource.includes("window.NB_MCP"),
    "the agent must take its tools from the WebMCP registry");
  assert.ok(agentSource.includes("NB_MCP.call"),
    "the agent must invoke tools through the registry, so it does what a browser agent would");

  // WebMCP is a proposal, so the page must work with and without the native API.
  const mcp = readFileSync(join(ROOT, "webmcp.js"), "utf8");
  assert.ok(mcp.includes("document.modelContext"), "must register natively when available");
  assert.ok(mcp.includes("local"), "must keep a local registry when it is not");

  // The schema is the contract the agent introspects; these types must exist.
  const graph = readFileSync(join(ROOT, "graph.js"), "utf8");
  for (const type of ["type Member", "type Post", "type Channel", "type Project", "type Epoch", "type Query"]) {
    assert.ok(graph.includes(type), `the GraphQL schema must define ${type}`);
  }

  // Completion is the difference between a shell and a prompt that echoes.
  const complete = readFileSync(join(ROOT, "complete.js"), "utf8");
  for (const capability of ["function score", "function commonPrefix", "function globalDirs", "ghost"]) {
    assert.ok(complete.includes(capability), `complete.js must provide ${capability}`);
  }

  // Every path the sitemap can produce must be resolvable, or `cd` lies.
  const map = sandbox2.NB_MAP as {
    list: (p: string, e?: unknown) => unknown[] | null;
    join: (p: string[]) => string;
  };
  for (const root of ["/", "/channels", "/members", "/projects", "/epochs"]) {
    assert.ok(map.list(root) !== null, `sitemap must list ${root}`);
  }

  // The contract is the thing themes are written against; it has to exist.
  const contract = readFileSync(join(ROOT, "CONTRACT.md"), "utf8");
  for (const hook of ["data-region", "data-c", "data-state", "data-kind", "--nb-accent"]) {
    assert.ok(contract.includes(hook), `CONTRACT.md must document ${hook}`);
  }

  // ── The ASCII layer ──────────────────────────────────────────────────────
  // These glyphs are readings, not decoration, so they are testable: a
  // sparkline that does not track its series and a sigil that collides are both
  // lies told in a font nobody reads closely.
  const ascii: {
    NB_ASCII?: {
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
  const A = ascii.NB_ASCII;
  assert.ok(A, "ascii.js must expose NB_ASCII");

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

  console.log("nightboard theme tests passed");
}
