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

  console.log("nightboard theme tests passed");
}
