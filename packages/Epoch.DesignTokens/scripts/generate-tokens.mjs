#!/usr/bin/env node
// Generates src/tokens.generated.ts from the DESIGN.md frontmatter (the single
// source of truth for Epoch design tokens) and locks the canonical colors in
// .impeccable/design.json to the same palette (ADR-0010 contract).
//
// Usage: npm run tokens:generate (from the repo root) or node scripts/generate-tokens.mjs.
// Idempotent: re-running against unchanged inputs produces no diff.

import { readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const packageRoot = join(dirname(fileURLToPath(import.meta.url)), "..");
const repoRoot = join(packageRoot, "..", "..");

const TYPOGRAPHY_LEVELS = ["display", "headline", "title", "body", "label", "meta"];
const ROUNDED_KEYS = ["xs", "sm", "md"];
const SPACING_KEYS = ["xs", "sm", "md", "lg", "xl", "xxl"];

function extractFrontmatter(markdown) {
  const match = markdown.match(/^---\n([\s\S]*?)\n---/u);
  if (!match) {
    throw new Error("DESIGN.md frontmatter block not found");
  }
  return match[1];
}

function parseScalar(raw) {
  const trimmed = raw.trim();
  const quoted = trimmed.match(/^"(.*)"$/u);
  if (quoted) {
    return quoted[1];
  }
  if (/^-?\d+(?:\.\d+)?$/u.test(trimmed)) {
    return Number(trimmed);
  }
  return trimmed;
}

function sectionLines(frontmatter, name) {
  const match = frontmatter.match(new RegExp(`^${name}:\\n((?: {2,}\\S.*\\n?)+)`, "mu"));
  if (!match) {
    throw new Error(`DESIGN.md frontmatter section not found: ${name}`);
  }
  return match[1].trimEnd().split("\n");
}

function parseFlatMap(frontmatter, name) {
  const entries = {};
  for (const line of sectionLines(frontmatter, name)) {
    const entry = line.match(/^ {2}([\w-]+): (.+)$/u);
    if (entry) {
      entries[entry[1]] = parseScalar(entry[2]);
    }
  }
  return entries;
}

function parseTypography(frontmatter) {
  const levels = {};
  let current = null;
  for (const line of sectionLines(frontmatter, "typography")) {
    const level = line.match(/^ {2}([\w-]+):$/u);
    if (level) {
      current = {};
      levels[level[1]] = current;
      continue;
    }
    const prop = line.match(/^ {4}([\w-]+): (.+)$/u);
    if (prop && current) {
      current[prop[1]] = parseScalar(prop[2]);
    }
  }
  return levels;
}

function assertKeys(actual, expected, section) {
  for (const key of expected) {
    if (!(key in actual)) {
      throw new Error(`DESIGN.md ${section} is missing expected key: ${key}`);
    }
  }
}

function tsKey(key) {
  return /^[A-Za-z_$][\w$]*$/u.test(key) ? key : JSON.stringify(key);
}

function tsFlatMap(entries, indent) {
  return Object.entries(entries)
    .map(([key, value]) => `${indent}${tsKey(key)}: ${JSON.stringify(value)},`)
    .join("\n");
}

function tsTypography(levels) {
  return Object.entries(levels)
    .map(([level, props]) => [
      `    ${tsKey(level)}: {`,
      tsFlatMap(props, "      "),
      "    },",
    ].join("\n"))
    .join("\n");
}

function buildCss(colors, typography, rounded, spacing) {
  const lines = [":root {", "  color-scheme: light;"];
  for (const [name, value] of Object.entries(colors)) {
    lines.push(`  --epoch-color-${name}: ${value};`);
  }
  for (const key of ROUNDED_KEYS) {
    lines.push(`  --epoch-radius-${key}: ${rounded[key]};`);
  }
  for (const key of SPACING_KEYS) {
    lines.push(`  --epoch-space-${key}: ${spacing[key]};`);
  }
  lines.push(`  --epoch-font-ui: ${typography.body.fontFamily};`);
  lines.push(`  --epoch-font-mono: ${typography.meta.fontFamily};`);
  for (const level of TYPOGRAPHY_LEVELS) {
    const type = typography[level];
    lines.push(`  --epoch-type-${level}-size: ${type.fontSize};`);
    lines.push(`  --epoch-type-${level}-weight: ${type.fontWeight};`);
    lines.push(`  --epoch-type-${level}-leading: ${type.lineHeight};`);
    lines.push(`  --epoch-type-${level}-tracking: ${type.letterSpacing};`);
  }
  lines.push("}");
  return lines.join("\n");
}

function buildModule(colors, typography, rounded, spacing) {
  const css = buildCss(colors, typography, rounded, spacing);
  return [
    "// GENERATED — do not edit; npm run tokens:generate",
    "// Source of truth: DESIGN.md frontmatter (colors, typography, rounded, spacing).",
    "",
    "export const epochTokens = {",
    "  colors: {",
    tsFlatMap(colors, "    "),
    "  },",
    "  typography: {",
    tsTypography(typography),
    "  },",
    "  rounded: {",
    tsFlatMap(rounded, "    "),
    "  },",
    "  spacing: {",
    tsFlatMap(spacing, "    "),
    "  },",
    "} as const;",
    "",
    "export const epochTokensCss: string = `" + css + "`;",
    "",
  ].join("\n");
}


/**
 * Derive a token's tonal ramp from its own canonical value.
 *
 * The ramp used to be hand-authored, so regenerating locked the canonical to
 * DESIGN.md and left the ramp describing whatever colour was there before. That
 * produced entries like "Copper Action" whose canonical was magenta and whose
 * eight ramp stops were all copper — a file that looks generated, reads as
 * authoritative, and is wrong. A derived ramp cannot disagree with its value.
 */
function rampFor(hex) {
  const m = /^#([0-9a-f]{6})$/iu.exec(hex);
  if (!m) return null;
  const n = parseInt(m[1], 16);
  const r = (n >> 16) & 255, g = (n >> 8) & 255, b = n & 255;
  const mix = (t) => {
    // Negative t darkens toward black, positive lightens toward white.
    const to = t < 0 ? 0 : 255;
    const k = Math.abs(t);
    const c = (v) => Math.round(v + (to - v) * k);
    return `#${[c(r), c(g), c(b)].map((v) => v.toString(16).padStart(2, "0")).join("")}`;
  };
  return [-0.82, -0.62, -0.4, -0.18, 0, 0.32, 0.58, 0.84].map((t) => (t === 0 ? hex.toLowerCase() : mix(t)));
}

function rewriteDesignJson(colors) {
  const path = join(repoRoot, ".impeccable", "design.json");
  let text = readFileSync(path, "utf8");
  const colorMeta = JSON.parse(text).extensions?.colorMeta ?? {};
  for (const name of Object.keys(colorMeta)) {
    const hex = colors[name];
    if (typeof hex !== "string") {
      continue;
    }
    const pattern = new RegExp(
      `("${name}":\\s*\\{[^{}]*?"canonical":\\s*")#[0-9a-fA-F]{3,8}(")`,
      "u",
    );
    if (!pattern.test(text)) {
      throw new Error(`design.json colorMeta entry not found for ${name}`);
    }
    text = text.replace(pattern, `$1${hex}$2`);

    // Keep the ramp honest: derive it from the canonical rather than leaving
    // whatever colour the previous world used.
    const ramp = rampFor(hex);
    if (ramp !== null) {
      const rampPattern = new RegExp(
        `("${name}":\\s*\\{[^{}]*?"tonalRamp":\\s*)\\[[^\\]]*\\]`,
        "u",
      );
      if (rampPattern.test(text)) {
        text = text.replace(
          rampPattern,
          `$1[\n        ${ramp.map((c) => `"${c}"`).join(",\n        ")}\n      ]`,
        );
      }
    }
  }
  const stamp = `${new Date().toISOString().slice(0, 10)}T00:00:00.0000000Z`;
  text = text.replace(/"generatedAt":\s*"[^"]*"/u, `"generatedAt": "${stamp}"`);
  writeFileSync(path, text);
}

function main() {
  const frontmatter = extractFrontmatter(readFileSync(join(repoRoot, "DESIGN.md"), "utf8"));
  const colors = parseFlatMap(frontmatter, "colors");
  const typography = parseTypography(frontmatter);
  const rounded = parseFlatMap(frontmatter, "rounded");
  const spacing = parseFlatMap(frontmatter, "spacing");

  assertKeys(typography, TYPOGRAPHY_LEVELS, "typography");
  assertKeys(rounded, ROUNDED_KEYS, "rounded");
  assertKeys(spacing, SPACING_KEYS, "spacing");
  for (const [name, value] of Object.entries(colors)) {
    if (!/^#[0-9a-fA-F]{3,8}$/u.test(String(value))) {
      throw new Error(`DESIGN.md color ${name} is not a hex literal: ${value}`);
    }
  }
  for (const level of TYPOGRAPHY_LEVELS) {
    assertKeys(
      typography[level],
      ["fontFamily", "fontSize", "fontWeight", "lineHeight", "letterSpacing"],
      `typography.${level}`,
    );
  }

  const outputPath = join(packageRoot, "src", "tokens.generated.ts");
  writeFileSync(outputPath, buildModule(colors, typography, rounded, spacing));
  rewriteDesignJson(colors);

  console.log(`tokens:generate: wrote ${outputPath}`);
  console.log("tokens:generate: locked .impeccable/design.json canonical colors to DESIGN.md");
}

main();
