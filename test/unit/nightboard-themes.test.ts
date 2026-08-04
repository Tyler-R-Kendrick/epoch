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
  assert.equal(themes.length, 10, "the garden ships ten themes");

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

  // The failure this whole rewrite exists to fix: ten entries that were one
  // layout in ten palettes. An experience must bring its own structure and its
  // own navigation, so identical markup between two of them is a defect.
  const expSource = readFileSync(join(ROOT, "experiences.js"), "utf8");
  const expSandbox: {
    NB_DATA?: unknown;
    NB_EXPERIENCES?: { id: string; name: string; thesis: string; css: string; keys?: string }[];
  } = { NB_DATA: JSON.parse(dataJson()) };
  new Function("window", expSource)(expSandbox);
  const exps = expSandbox.NB_EXPERIENCES ?? [];
  assert.equal(exps.length, 10, "ten experiences");

  const cssShapes = new Set<string>();
  for (const e of exps) {
    assert.ok(e.id && e.name && e.thesis, `${e.id}: every experience states what it argues`);
    assert.ok(e.css.includes(`[data-exp="${e.id}"]`),
      `${e.id}: css must be scoped to its own experience or it leaks into the others`);
    // Two experiences that declare the same class vocabulary are the same
    // layout wearing different names.
    const classes = (e.css.match(/\.[a-z]{2}-[a-z-]+/gu) ?? []).sort().join(",");
    assert.ok(!cssShapes.has(classes), `${e.id} has the same structure as another experience`);
    cssShapes.add(classes);
  }

  // Navigation has to differ too, or they are the same experience with
  // different paint — which is exactly what was shipped and rejected.
  const keySets = new Set(exps.map((e) => e.keys ?? ""));
  assert.ok(keySets.size >= 6,
    `only ${keySets.size} distinct key maps across ten experiences — most of them navigate identically`);

  // The contract is the thing themes are written against; it has to exist.
  const contract = readFileSync(join(ROOT, "CONTRACT.md"), "utf8");
  for (const hook of ["data-region", "data-c", "data-state", "data-kind", "--nb-accent"]) {
    assert.ok(contract.includes(hook), `CONTRACT.md must document ${hook}`);
  }

  console.log("nightboard theme tests passed");
}
