#!/usr/bin/env node
import { readFileSync, readdirSync } from "node:fs";
import { join, relative } from "node:path";

const manifestPath = join("docs", "evidence", "nightboard-navigation-projection-parity", "parity-manifest.json");
const manifest = JSON.parse(readFileSync(manifestPath, "utf8"));
const required = ["testId", "sourcePatternId", "primarySourceUrl", "invariant", "proofKind", "implementationSurface"];
const errors = [];
const seen = new Set();
function filesUnder(directory) {
  return readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const path = join(directory, entry.name);
    return entry.isDirectory() ? filesUnder(path) : [path];
  });
}

const candidates = ["test", "features", join("docs", "design-explorations", "nightboard")]
  .flatMap(filesUnder)
  .filter((file) => /\.(?:[cm]?[jt]s|feature)$/.test(file));

for (const claim of manifest.claims || []) {
  for (const field of required) {
    if (!claim[field]) errors.push(`${claim.testId || "unknown"}: missing ${field}`);
  }
  if (seen.has(claim.testId)) errors.push(`${claim.testId}: duplicate claim`);
  seen.add(claim.testId);
  try { new URL(claim.primarySourceUrl); }
  catch { errors.push(`${claim.testId}: primarySourceUrl is not an absolute URL`); }
  for (const sourceUrl of claim.additionalSourceUrls || []) {
    try { new URL(sourceUrl); }
    catch { errors.push(`${claim.testId}: additionalSourceUrls contains a non-absolute URL`); }
  }
  const matches = candidates.filter((file) => {
    const lines = readFileSync(file, "utf8").split("\n");
    return lines.some((line) => !/^\s*(?:\/\/|\/\*|\*|#)/.test(line) && line.includes(claim.testId));
  });
  if (!matches.length) errors.push(`${claim.testId}: no executable test reference`);
  claim.resolvedTests = matches.map((file) => relative(process.cwd(), file));
}

if (manifest.claims?.some((claim) => Object.hasOwn(claim, "pass"))) {
  errors.push("manifest must not contain hand-entered pass fields");
}
if (errors.length) {
  errors.forEach((error) => console.error(`nightboard-parity: ${error}`));
  process.exit(1);
}
console.log(`nightboard parity manifest resolved ${manifest.claims.length} claims across ${
  new Set(manifest.claims.flatMap((claim) => claim.resolvedTests)).size
} executable files`);
