#!/usr/bin/env node
// Token-conformance audit: verifies the emitted CSS of every web surface against the
// DESIGN.md palette and the .impeccable/design.json contract (ADR-0010).
//
// Report mode (default): prints findings, writes .optimizexp/audits/token-conformance.json,
// always exits 0 so gates stay green while known drift is burned down.
// Enforce mode (--enforce): exits 1 when any enforced finding class is present.
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

import { readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const enforce = process.argv.includes("--enforce");

const SCANNED_PACKAGES = [
  { id: "community-web", path: "packages/Epoch.Community.Web/src/index.ts" },
  { id: "community-operations-web", path: "packages/Epoch.Community.Operations.Web/src/index.ts" },
  { id: "platform-web", path: "packages/Epoch.Platform.Web/src/index.ts" },
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

function scanPackage(pkg, palette) {
  const findings = [];
  const source = readFileSync(join(root, pkg.path), "utf8");

  const defined = new Map();
  for (const match of source.matchAll(/(--[\w-]+)\s*:\s*([^;\n]+)[;\n]/gu)) {
    if (!defined.has(match[1])) {
      defined.set(match[1], match[2].trim());
    }
  }

  for (const match of source.matchAll(/var\(\s*(--epoch-[\w-]+)\s*[),]/gu)) {
    if (!defined.has(match[1])) {
      findings.push({
        rule: "undefined-token",
        package: pkg.id,
        file: pkg.path,
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
      file: pkg.path,
      line: lineOf(source, match.index),
      detail: mismatch
        ? `var(${token}, ${fallback}) fallback disagrees with defined value ${definedValue}`
        : `var(${token}, ${fallback}) carries a literal fallback; tokens are inlined first, drop it`,
    });
  }

  const paletteValues = new Set(palette.values());
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
      file: pkg.path,
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
          file: pkg.path,
          line: lineOf(source, match.index),
          detail: `${match[1]}: ${value} defines its own value instead of aliasing an --epoch-* token`,
        });
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

function main() {
  const palette = parseDesignMdColors(readFileSync(join(root, "DESIGN.md"), "utf8"));
  const findings = [
    ...SCANNED_PACKAGES.flatMap((pkg) => scanPackage(pkg, palette)),
    ...checkDesignJson(palette),
  ];

  const summary = {};
  for (const finding of findings) {
    summary[finding.rule] = (summary[finding.rule] ?? 0) + 1;
  }

  const report = {
    tool: "audit-design-tokens",
    mode: enforce ? "enforce" : "report",
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

  if (enforce && total > 0) {
    process.exitCode = 1;
  }
}

main();
