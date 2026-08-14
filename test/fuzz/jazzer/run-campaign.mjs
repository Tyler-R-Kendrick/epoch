#!/usr/bin/env node
/**
 * Runs Jazzer.js targets against versioned corpora.
 * PR: --mode=regression (corpus only). Campaign: fuzzing with time budget.
 */
import { spawnSync } from "node:child_process";
import { existsSync, mkdirSync, readdirSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "../../..");
const targets = [
  "revset",
  "canonical-id",
  "pkt-line",
  "remote-helper",
  "chunk-manifest",
  "swhid",
  "forge-codecs",
  "protocol-event",
  "path-query",
];

const mode = process.argv.includes("--mode=regression") ? "regression" : "fuzzing";
const only = process.argv.find((arg) => arg.startsWith("--only="))?.slice("--only=".length);
const seconds = Number(process.env.EPOCH_JAZZER_SECONDS ?? (mode === "regression" ? 1 : 120));
const selected = only ? targets.filter((name) => name === only) : targets;

function ensureSeed(target) {
  const corpusDir = join(root, "test/fuzz/corpus/v1", target);
  mkdirSync(corpusDir, { recursive: true });
  const entries = readdirSync(corpusDir).filter((name) => name !== ".gitkeep");
  if (entries.length > 0) return;
  const seeds = {
    revset: Buffer.from("heads() | roots()"),
    "canonical-id": Buffer.from("epoch:change:aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa"),
    "pkt-line": Buffer.from("0010hello world\n"),
    "remote-helper": Buffer.from("option verbosity 1"),
    "chunk-manifest": Buffer.from("{}"),
    swhid: Buffer.from("swh:1:cnt:e69de29bb2d1d6434b8b29ae775ad8c2e48c5391"),
    "forge-codecs": Buffer.from("{\"f3Version\":\"4.0\",\"objects\":[]}"),
    "protocol-event": Buffer.from("{\"schemaVersion\":1}"),
    "path-query": Buffer.from("status:open"),
  };
  writeFileSync(join(corpusDir, "seed-0"), seeds[target] ?? Buffer.from("x"));
}

let failed = 0;
for (const target of selected) {
  const modulePath = join(root, "dist/test/fuzz/jazzer", `${target}.js`);
  if (!existsSync(modulePath)) {
    console.error(`missing compiled target ${modulePath}; run npm run build first`);
    failed += 1;
    continue;
  }
  ensureSeed(target);
  const corpusDir = join(root, "test/fuzz/corpus/v1", target);
  const args = [
    "jazzer",
    modulePath,
    corpusDir,
    "-m",
    mode,
    "--sync",
    "--",
    `-max_total_time=${Number.isFinite(seconds) ? seconds : 60}`,
  ];
  console.log(`jazzer ${target} mode=${mode}`);
  const result = spawnSync("npx", args, { cwd: root, stdio: "inherit", env: process.env });
  if (result.status !== 0) {
    failed += 1;
    console.error(`jazzer target failed: ${target}`);
  }
}

process.exitCode = failed === 0 ? 0 : 1;
