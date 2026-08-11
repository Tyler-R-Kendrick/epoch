#!/usr/bin/env node
import { readFileSync, readdirSync } from "node:fs";
import { join, normalize } from "node:path";

const manifestPath = join("docs", "evidence", "nightboard-navigation-projection-parity", "parity-manifest.json");
const manifest = JSON.parse(readFileSync(manifestPath, "utf8"));
const required = ["testId", "sourcePatternId", "primarySourceUrl", "invariant", "proofKind", "implementationSurface"];
const proofKinds = new Set(["unit", "contract", "feature", "browser", "fault", "accessibility", "design", "docs"]);
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
const candidateSet = new Set(candidates.map(normalize));
const references = manifest.testReferences || {};

if (manifest.schemaVersion !== 2) errors.push("manifest schemaVersion must be 2");

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
  const reference = references[claim.testId];
  if (!reference || typeof reference.path !== "string" || typeof reference.kind !== "string") {
    errors.push(`${claim.testId}: missing explicit test reference`);
    continue;
  }
  const path = normalize(reference.path);
  if (!candidateSet.has(path)) {
    errors.push(`${claim.testId}: test reference is not an executable test file: ${reference.path}`);
    continue;
  }
  if (!proofKinds.has(reference.kind)) errors.push(`${claim.testId}: unknown proof kind ${reference.kind}`);
  const claimedKinds = claim.proofKind.split("-");
  const compatibleKind = reference.kind === "accessibility" ? "a11y" : reference.kind;
  if (!claimedKinds.includes(reference.kind) && !claimedKinds.includes(compatibleKind)) {
    errors.push(`${claim.testId}: ${reference.kind} test does not match declared ${claim.proofKind} proof`);
  }
  const executable = readFileSync(path, "utf8").split("\n").some((line) =>
    !/^\s*(?:\/\/|\/\*|\*|#)/.test(line) && line.includes(claim.testId));
  if (!executable) errors.push(`${claim.testId}: referenced test does not contain the ID in executable code`);
}

for (const testId of Object.keys(references)) {
  if (!seen.has(testId)) errors.push(`${testId}: orphan test reference`);
}

if (manifest.claims?.some((claim) => Object.hasOwn(claim, "pass"))) {
  errors.push("manifest must not contain hand-entered pass fields");
}
if (errors.length) {
  errors.forEach((error) => console.error(`nightboard-parity: ${error}`));
  process.exit(1);
}
console.log(`nightboard parity manifest resolved ${manifest.claims.length} claims across ${
  new Set(Object.values(references).map((reference) => reference.path)).size
} explicitly referenced executable files`);
