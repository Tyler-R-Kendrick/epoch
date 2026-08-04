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

  // The contract is the thing themes are written against; it has to exist.
  const contract = readFileSync(join(ROOT, "CONTRACT.md"), "utf8");
  for (const hook of ["data-region", "data-c", "data-state", "data-kind", "--nb-accent"]) {
    assert.ok(contract.includes(hook), `CONTRACT.md must document ${hook}`);
  }

  console.log("nightboard theme tests passed");
}
