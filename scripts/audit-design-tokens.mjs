#!/usr/bin/env node
// Token-conformance audit: verifies the emitted CSS of every web surface against the
// DESIGN.md palette and the .impeccable/design.json contract (ADR-0010).
//
// Report mode (default): prints findings, writes .optimizexp/audits/token-conformance.json,
// always exits 0 so gates stay green while known drift is burned down.
// Enforce mode (--enforce): exits 1 when any finding class is present.
// Structural enforce mode (--enforce-structural): exits 1 for structural classes
// (undefined-token, var-fallback, var-fallback-mismatch, design-json-drift) everywhere,
// plus every rule listed for a package in PACKAGE_ENFORCED_RULES.
//
// ADR-0027: DESIGN.md is Nightboard while Community / Ops / Platform Web still
// emit Course Line hex — palette rules are report-only until those surfaces port.
// Structural rules stay enforced for every package.
//
// Finding classes:
//   undefined-token       var(--epoch-*) used but the custom property is never defined
//   var-fallback          var() carries a literal fallback (tokens are always inlined first,
//                         so fallbacks only exist to drift — see the #c47a3a incident)
//   var-fallback-mismatch fallback literal disagrees with the token's defined value
//   off-palette-hex       literal hex not present in the DESIGN.md palette
//   near-miss-palette     literal hex within near-miss distance of a palette color but not equal
//   ops-token-not-aliased --ops-* token defined as a literal instead of aliasing --epoch-*
//   design-json-drift     .impeccable/design.json canonical color disagrees with DESIGN.md

import { readFileSync, writeFileSync, mkdirSync, readdirSync, statSync } from "node:fs";
import { join, dirname, relative } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const enforce = process.argv.includes("--enforce");
const enforceStructural = process.argv.includes("--enforce-structural");

const STRUCTURAL_RULES = new Set([
  "undefined-token",
  "var-fallback",
  "var-fallback-mismatch",
  "design-json-drift",
  // A contract that disagrees with its own tokens is not advisory.
  "designmd-prose-drift",
]);

// Palette rule ids — re-attach via PACKAGE_ENFORCED_RULES when Nightboard CSS ports land.
const PALETTE_RULES = ["near-miss-palette", "off-palette-hex", "ops-token-not-aliased"];

// Rules that fail --enforce-structural per package, in addition to STRUCTURAL_RULES.
// Empty lists = ADR-0027 burn-down (DESIGN.md is Nightboard; web CSS still Course Line).
// When a surface ports, set its entry back to PALETTE_RULES.
const PACKAGE_ENFORCED_RULES = new Map([
  ["community-web", []],
  ["community-operations-web", []],
  ["platform-web", []],
]);
void PALETTE_RULES;

// All three web surfaces inline the generated @epoch/design-tokens :root block at
// render time, so the --epoch-* definitions live in the generated module.
const TOKEN_DEFINITIONS = ["packages/Epoch.DesignTokens/src/tokens.generated.ts"];

const SCANNED_PACKAGES = [
  {
    id: "community-web",
    // Directory scan: the Community Web source is decomposed into modules
    // (model/, view/, render/, client/), so every .ts file is scanned.
    path: "packages/Epoch.Community.Web/src",
    extraDefinitionPaths: TOKEN_DEFINITIONS,
  },
  {
    id: "community-operations-web",
    path: "packages/Epoch.Community.Operations.Web/src/index.ts",
    extraDefinitionPaths: TOKEN_DEFINITIONS,
  },
  {
    id: "platform-web",
    path: "packages/Epoch.Platform.Web/src/index.ts",
    extraDefinitionPaths: TOKEN_DEFINITIONS,
  },
];

// Euclidean RGB distance below which a literal is "trying to be" a palette color.
const NEAR_MISS_DISTANCE = 60;

function parseDesignMdColors(designMd) {
  const colors = new Map();
  const match = designMd.match(/^colors:\n((?: {2}[\w-]+: "#[0-9a-fA-F]{3,8}"\n)+)/mu);
  if (!match) {
    throw new Error("DESIGN.md frontmatter colors block not found");
  }
  for (const line of match[1].trimEnd().split("\n")) {
    const entry = line.match(/^ {2}([\w-]+): "(#[0-9a-fA-F]{3,8})"$/u);
    if (entry) {
      colors.set(entry[1], entry[2].toLowerCase());
    }
  }
  return colors;
}

function hexToRgb(hex) {
  let value = hex.slice(1);
  if (value.length === 3 || value.length === 4) {
    value = [...value].map((ch) => ch + ch).join("");
  }
  return [0, 2, 4].map((offset) => Number.parseInt(value.slice(offset, offset + 2), 16));
}

function rgbDistance(a, b) {
  const [ar, ag, ab] = hexToRgb(a);
  const [br, bg, bb] = hexToRgb(b);
  return Math.hypot(ar - br, ag - bg, ab - bb);
}

function lineOf(source, index) {
  return source.slice(0, index).split("\n").length;
}

function listTsFilesRecursively(directory) {
  const files = [];
  for (const entry of readdirSync(directory).sort()) {
    const path = join(directory, entry);
    const stat = statSync(path);
    if (stat.isDirectory()) {
      files.push(...listTsFilesRecursively(path));
    } else if (stat.isFile() && entry.endsWith(".ts")) {
      files.push(path);
    }
  }
  return files;
}

function scanPackage(pkg, palette) {
  const findings = [];
  const packageRoot = join(root, pkg.path);
  const sourcePaths = statSync(packageRoot).isDirectory()
    ? listTsFilesRecursively(packageRoot).map((path) => relative(root, path))
    : [pkg.path];
  const sources = sourcePaths.map((path) => ({
    path,
    source: readFileSync(join(root, path), "utf8"),
  }));

  const defined = new Map();
  const definitionSources = [
    ...sources.map((entry) => entry.source),
    ...(pkg.extraDefinitionPaths ?? []).map((path) => readFileSync(join(root, path), "utf8")),
  ];
  for (const definitionSource of definitionSources) {
    for (const match of definitionSource.matchAll(/(--[\w-]+)\s*:\s*([^;\n]+)[;\n]/gu)) {
      if (!defined.has(match[1])) {
        defined.set(match[1], match[2].trim());
      }
    }
  }

  const paletteValues = new Set(palette.values());
  for (const { path, source } of sources) {
    for (const match of source.matchAll(/var\(\s*(--epoch-[\w-]+)\s*[),]/gu)) {
      if (!defined.has(match[1])) {
        findings.push({
          rule: "undefined-token",
          package: pkg.id,
          file: path,
          line: lineOf(source, match.index),
          detail: `${match[1]} is used but never defined; the declaration silently does nothing`,
        });
      }
    }

    for (const match of source.matchAll(/var\(\s*(--[\w-]+)\s*,\s*([^)]+)\)/gu)) {
      const token = match[1];
      const fallback = match[2].trim();
      const definedValue = defined.get(token);
      const mismatch = definedValue !== undefined
        && fallback.toLowerCase() !== definedValue.toLowerCase();
      findings.push({
        rule: mismatch ? "var-fallback-mismatch" : "var-fallback",
        package: pkg.id,
        file: path,
        line: lineOf(source, match.index),
        detail: mismatch
          ? `var(${token}, ${fallback}) fallback disagrees with defined value ${definedValue}`
          : `var(${token}, ${fallback}) carries a literal fallback; tokens are inlined first, drop it`,
      });
    }

    for (const match of source.matchAll(/#[0-9a-fA-F]{6}\b|#[0-9a-fA-F]{3}\b/gu)) {
      const hex = match[0].toLowerCase();
      if (paletteValues.has(hex)) {
        continue;
      }
      let nearest = null;
      let nearestDistance = Number.POSITIVE_INFINITY;
      for (const [name, value] of palette) {
        const distance = rgbDistance(hex, value);
        if (distance < nearestDistance) {
          nearestDistance = distance;
          nearest = { name, value };
        }
      }
      const nearMiss = nearest !== null && nearestDistance <= NEAR_MISS_DISTANCE;
      findings.push({
        rule: nearMiss ? "near-miss-palette" : "off-palette-hex",
        package: pkg.id,
        file: path,
        line: lineOf(source, match.index),
        detail: nearMiss
          ? `${hex} is within ${Math.round(nearestDistance)} RGB of palette ${nearest.name} (${nearest.value}) but not equal`
          : `${hex} is not in the DESIGN.md palette`,
      });
    }

    if (pkg.id === "community-operations-web") {
      for (const match of source.matchAll(/(--ops-[\w-]+)\s*:\s*([^;\n]+)[;\n]/gu)) {
        const value = match[2].trim();
        if (!/^var\(\s*--epoch-[\w-]+\s*\)$/u.test(value) && !/^\d/u.test(value)) {
          findings.push({
            rule: "ops-token-not-aliased",
            package: pkg.id,
            file: path,
            line: lineOf(source, match.index),
            detail: `${match[1]}: ${value} defines its own value instead of aliasing an --epoch-* token`,
          });
        }
      }
    }
  }

  return findings;
}

function checkDesignJson(palette) {
  const findings = [];
  const path = ".impeccable/design.json";
  const designJson = JSON.parse(readFileSync(join(root, path), "utf8"));
  const colorMeta = designJson.extensions?.colorMeta ?? {};
  for (const [name, meta] of Object.entries(colorMeta)) {
    const expected = palette.get(name);
    const canonical = typeof meta.canonical === "string" ? meta.canonical.toLowerCase() : undefined;
    if (expected !== undefined && canonical !== undefined && canonical !== expected) {
      findings.push({
        rule: "design-json-drift",
        package: "design-contract",
        file: path,
        detail: `${name} canonical ${canonical} disagrees with DESIGN.md ${expected}`,
      });
    }
  }
  return findings;
}


/**
 * DESIGN.md states each type step twice: once in the frontmatter the token
 * generator reads, and once in the §3 Hierarchy prose a human reads. Two places
 * for one fact drift, and in this repo they have drifted three times — each time
 * leaving the contract disagreeing with the product it governs, which is the
 * exact failure the design system exists to prevent.
 *
 * The generator cannot catch it because it never reads the prose. This does.
 */
function checkTypographyProse(designMd) {
  const findings = [];
  const fm = /^---\n([\s\S]*?)\n---/u.exec(designMd);
  if (fm === null) return findings;

  const sizes = new Map();
  const typoBlock = /typography:\n([\s\S]*?)(?=\n[a-z-]+:\n|$)/u.exec(fm[1]);
  if (typoBlock !== null) {
    let level = null;
    for (const line of typoBlock[1].split("\n")) {
      const lvl = /^ {2}([a-z]+):\s*$/u.exec(line);
      if (lvl !== null) level = lvl[1];
      const size = /^ {4}fontSize:\s*"([^"]+)"/u.exec(line);
      if (size !== null && level !== null) sizes.set(level, size[1]);
    }
  }

  const hierarchy = /### Hierarchy\n([\s\S]*?)(?=\n###|\n## )/u.exec(designMd);
  if (hierarchy === null) return findings;

  for (const line of hierarchy[1].split("\n")) {
    const m = /^- \*\*([A-Z][a-z]+)\*\* \([0-9]+, ([0-9.]+rem)/u.exec(line.trim());
    if (m === null) continue;
    const level = m[1].toLowerCase();
    const declared = sizes.get(level);
    if (declared !== undefined && declared !== m[2]) {
      findings.push({
        rule: "designmd-prose-drift",
        file: "DESIGN.md",
        detail: `Hierarchy prose says ${level} is ${m[2]}; frontmatter says ${declared}.`,
      });
    }
  }
  return findings;
}

function main() {
  const designMd = readFileSync(join(root, "DESIGN.md"), "utf8");
  const palette = parseDesignMdColors(designMd);
  const findings = [
    ...SCANNED_PACKAGES.flatMap((pkg) => scanPackage(pkg, palette)),
    ...checkDesignJson(palette),
    ...checkTypographyProse(designMd),
  ];

  const summary = {};
  for (const finding of findings) {
    summary[finding.rule] = (summary[finding.rule] ?? 0) + 1;
  }

  const report = {
    tool: "audit-design-tokens",
    mode: enforce ? "enforce" : enforceStructural ? "enforce-structural" : "report",
    designMdPalette: Object.fromEntries(palette),
    summary,
    pass: findings.length === 0,
    findings,
  };

  const outputPath = join(root, ".optimizexp/audits/token-conformance.json");
  mkdirSync(dirname(outputPath), { recursive: true });
  writeFileSync(outputPath, `${JSON.stringify(report, null, 2)}\n`);

  const total = findings.length;
  console.log(`token-conformance: ${total} finding${total === 1 ? "" : "s"}`);
  for (const [rule, count] of Object.entries(summary).sort()) {
    console.log(`  ${rule}: ${count}`);
  }
  console.log(`report: .optimizexp/audits/token-conformance.json (${report.mode} mode)`);

  const enforcedUnderStructural = (finding) =>
    STRUCTURAL_RULES.has(finding.rule)
    || (PACKAGE_ENFORCED_RULES.get(finding.package) ?? []).includes(finding.rule);
  if (enforce && total > 0) {
    process.exitCode = 1;
  } else if (enforceStructural && findings.some(enforcedUnderStructural)) {
    process.exitCode = 1;
  }
}

main();
