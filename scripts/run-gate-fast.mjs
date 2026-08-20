#!/usr/bin/env node
/**
 * Parallel local static gate used by `npm run gate:fast`.
 *
 * Runs independent checks concurrently so pre-commit stays fast while still
 * covering the same bar as the sequential chain (konsistent, docs, design,
 * ESLint, anti-slop Oxlint).
 */
import { spawn } from "node:child_process";
import { performance } from "node:perf_hooks";

const checks = [
  { name: "konsistent", script: "konsistent" },
  { name: "docs:check", script: "docs:check" },
  { name: "design:lint", script: "design:lint" },
  { name: "design:audit", script: "design:audit" },
  { name: "lint", script: "lint" },
  { name: "lint:oxlint", script: "lint:oxlint" },
];

/**
 * @param {{ name: string, script: string }} check
 * @returns {Promise<{ name: string, code: number, ms: number }>}
 */
function runCheck(check) {
  const started = performance.now();
  return new Promise((resolve) => {
    const child = spawn("npm", ["run", check.script], {
      stdio: "inherit",
      env: process.env,
      shell: false,
    });
    child.on("error", (error) => {
      console.error(`[gate:fast] ${check.name} failed to start:`, error);
      resolve({ name: check.name, code: 1, ms: performance.now() - started });
    });
    child.on("close", (code) => {
      resolve({ name: check.name, code: code ?? 1, ms: performance.now() - started });
    });
  });
}

const results = await Promise.all(checks.map(runCheck));
const failed = results.filter((result) => result.code !== 0);

for (const result of results) {
  const status = result.code === 0 ? "ok" : `fail(${result.code})`;
  console.error(`[gate:fast] ${result.name}: ${status} in ${(result.ms / 1000).toFixed(1)}s`);
}

if (failed.length > 0) {
  console.error(`[gate:fast] failed: ${failed.map((result) => result.name).join(", ")}`);
  process.exit(1);
}
