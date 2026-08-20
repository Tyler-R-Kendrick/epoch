#!/usr/bin/env node
/**
 * Install Microsoft SkillOpt (PyPI `skillopt`) as user CLIs via `uv tool`.
 * Provides: skillopt-sleep, skillopt-train, skillopt-eval.
 *
 * Usage:
 *   node scripts/install-skillopt.mjs
 *   node scripts/install-skillopt.mjs --check   # exit 1 if CLIs missing
 *   node scripts/install-skillopt.mjs --upgrade
 *
 * Prefer `uv` (already common on agent machines). Falls back to
 * `python3 -m pip install --user` when uv is unavailable.
 */
import { spawnSync } from "node:child_process";
import { existsSync } from "node:fs";
import { homedir } from "node:os";
import { delimiter, join } from "node:path";

const SKILLOPT_SPEC = "git+https://github.com/microsoft/SkillOpt.git";
// Pin note: install from upstream main so SkillOpt-Sleep includes Cursor/Copilot
// harvest backends (PyPI 0.2.0 wheel is older). Idempotent via uv tool.
const BINS = ["skillopt-sleep", "skillopt-train", "skillopt-eval"];


const checkOnly = process.argv.includes("--check");
const upgrade = process.argv.includes("--upgrade");

function which(bin) {
  const pathEnv = process.env.PATH ?? "";
  const localBin = join(homedir(), ".local", "bin");
  const dirs = [localBin, ...pathEnv.split(delimiter)].filter(Boolean);
  for (const dir of dirs) {
    const candidate = join(dir, bin);
    if (existsSync(candidate)) return candidate;
  }
  // Also ask the shell (covers Windows shims / other layouts).
  const probe = spawnSync(process.platform === "win32" ? "where" : "command", ["-v", bin], {
    encoding: "utf8",
    shell: process.platform !== "win32",
  });
  if (probe.status === 0) {
    const line = String(probe.stdout || "")
      .trim()
      .split("\n")[0];
    if (line) return line;
  }
  return null;
}

function haveAllBins() {
  /** @type {Record<string, string | null>} */
  const found = {};
  for (const bin of BINS) found[bin] = which(bin);
  return found;
}

function run(cmd, args, opts = {}) {
  const result = spawnSync(cmd, args, {
    encoding: "utf8",
    stdio: "inherit",
    ...opts,
  });
  if (result.error) {
    console.error(`install-skillopt: failed to spawn ${cmd}:`, result.error.message);
    process.exit(1);
  }
  if (result.status !== 0) {
    console.error(`install-skillopt: ${cmd} exited ${result.status}`);
    process.exit(result.status ?? 1);
  }
}

function ensurePathHint() {
  const localBin = join(homedir(), ".local", "bin");
  const pathEnv = process.env.PATH ?? "";
  if (!pathEnv.split(delimiter).includes(localBin)) {
    console.log(`install-skillopt: ensure PATH includes ${localBin} (uv tool default)`);
  }
}

const found = haveAllBins();
const missing = BINS.filter((b) => !found[b]);

if (checkOnly) {
  if (missing.length) {
    console.error(`install-skillopt: missing CLIs: ${missing.join(", ")}`);
    console.error("Run once via sdlc init: node scripts/install-skillopt.mjs");
    process.exit(1);
  }
  for (const bin of BINS) console.log(`ok  ${bin} → ${found[bin]}`);
  console.log(`install-skillopt: skillopt present (${SKILLOPT_SPEC})`);
  process.exit(0);
}

if (!missing.length && !upgrade) {
  for (const bin of BINS) console.log(`ok  ${bin} → ${found[bin]}`);
  console.log("install-skillopt: already installed (pass --upgrade to refresh)");
  ensurePathHint();
  process.exit(0);
}

const uv = which("uv");
const spec = SKILLOPT_SPEC;

if (uv) {
  const args = ["tool", "install", spec];
  if (upgrade || missing.length < BINS.length) args.push("--force");
  console.log(`install-skillopt: ${uv} ${args.join(" ")}`);
  run(uv, args);
} else {
  console.log("install-skillopt: uv not found; falling back to python3 -m pip --user");
  const py = which("python3") || which("python");
  if (!py) {
    console.error("install-skillopt: need `uv` or `python3` with pip");
    process.exit(1);
  }
  const pipArgs = ["-m", "pip", "install", "--user", spec];
  if (upgrade) pipArgs.push("--upgrade");
  run(py, pipArgs);
}

const after = haveAllBins();
const stillMissing = BINS.filter((b) => !after[b]);
if (stillMissing.length) {
  console.error(`install-skillopt: install finished but still missing: ${stillMissing.join(", ")}`);
  ensurePathHint();
  process.exit(1);
}

for (const bin of BINS) console.log(`ok  ${bin} → ${after[bin]}`);
ensurePathHint();
console.log("install-skillopt: Microsoft SkillOpt ready (skillopt-sleep / train / eval)");
