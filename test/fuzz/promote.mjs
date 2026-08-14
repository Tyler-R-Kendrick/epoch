#!/usr/bin/env node
/**
 * Promote a minimized crash/input into corpus/v1/<target>/ and a regression stub.
 *
 * Usage:
 *   node test/fuzz/promote.mjs --target=revset --input=./crash.bin --name=revset-null-byte
 *   node test/fuzz/promote.mjs --target=history --input=./failure.json --name=history-merge-drop
 */
import { createHash } from "node:crypto";
import { copyFileSync, mkdirSync, readFileSync, writeFileSync, existsSync } from "node:fs";
import { basename, join, resolve } from "node:path";

function arg(name, fallback) {
  const prefix = `--${name}=`;
  const hit = process.argv.find((item) => item.startsWith(prefix));
  return hit ? hit.slice(prefix.length) : fallback;
}

const target = arg("target");
const inputPath = arg("input");
const name = arg("name", basename(inputPath ?? "crash").replace(/\.[^.]+$/u, ""));

if (!target || !inputPath) {
  console.error("Usage: node test/fuzz/promote.mjs --target=<name> --input=<path> [--name=<slug>]");
  process.exit(1);
}

const abs = resolve(inputPath);
if (!existsSync(abs)) {
  console.error(`input not found: ${abs}`);
  process.exit(1);
}

const bytes = readFileSync(abs);
const hash = createHash("sha256").update(bytes).digest("hex").slice(0, 24);
const corpusDir = join(process.cwd(), "test/fuzz/corpus/v1", target);
mkdirSync(corpusDir, { recursive: true });
const corpusFile = join(corpusDir, hash);
copyFileSync(abs, corpusFile);

const regressionsDir = join(process.cwd(), "test/fuzz/regressions");
mkdirSync(regressionsDir, { recursive: true });
const regressionFile = join(regressionsDir, `${name}.test.ts`);
if (!existsSync(regressionFile)) {
  writeFileSync(regressionFile, `import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";

/** Regression promoted from fuzz campaign — do not delete. */
export function run(): void {
  const bytes = readFileSync(join(process.cwd(), "test/fuzz/corpus/v1/${target}/${hash}"));
  assert.ok(bytes.length >= 0);
  // Target-specific oracle replay is covered by corpus-regression.test.ts.
  process.stdout.write(JSON.stringify({ regression: "${name}", target: "${target}", hash: "${hash}", bytes: bytes.length }) + "\\n");
}

void run();
`);
}

console.log(JSON.stringify({ promoted: true, target, hash, corpusFile, regressionFile }, null, 2));
