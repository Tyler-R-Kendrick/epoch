#!/usr/bin/env node
/**
 * Fail-open git hook installer.
 *
 * Wires `core.hooksPath` to `.githooks` so a fast local pre-flight runs after
 * `npm install`:
 *   - pre-commit → `npm run gate:fast`
 *   - pre-push   → `npm run gate:fast` (GitHub Actions Quality Gates are the
 *                   authoritative bar; see .github/workflows/quality.yml)
 *
 * Never blocks an install: no-ops on CI, when `SKIP_GIT_HOOKS` is set, or
 * outside a git checkout, and swallows any error.
 */
import { execSync } from "node:child_process";
import { chmodSync, existsSync } from "node:fs";
import { join } from "node:path";

const skip = process.env.CI || process.env.SKIP_GIT_HOOKS || !existsSync(".git");
if (!skip) {
  try {
    execSync("git config core.hooksPath .githooks", { stdio: "ignore" });
    for (const name of ["pre-commit", "pre-push"]) {
      const hook = join(".githooks", name);
      if (existsSync(hook)) {
        chmodSync(hook, 0o755);
      }
    }
  } catch {
    // Hook wiring is best-effort; never fail the install because of it.
    process.exitCode = 0;
  }
}
