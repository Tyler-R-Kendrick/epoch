/**
 * Property tests for the session-init toolchain probe in
 * `.claude/hooks/session-start.sh`.
 *
 * The example-based cases in `test/unit/session-init-hook.test.ts` pin the
 * decisions that actually shipped a defect. This lane covers the general
 * claim behind them: for ANY subset of the required binaries present, the
 * hook installs exactly when something the gates need is absent, and names
 * every absent binary. A probe that quietly ignores one entry passes the
 * examples and fails here.
 */
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { chmodSync, cpSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import fc from "fast-check";
import os from "node:os";
import path from "node:path";

const REQUIRED_BINS = ["tsgo", "oxlint", "eslint", "konsistent"] as const;
const REPO_ROOT = process.cwd();
const HOOK_PATH = path.join(REPO_ROOT, ".claude/hooks/session-start.sh");

interface ProbeResult {
  readonly installed: boolean;
  readonly stderr: string;
}

function writeExecutable(file: string, contents: string): void {
  writeFileSync(file, contents);
  chmodSync(file, 0o755);
}

function probeWith(presentBins: readonly string[]): ProbeResult {
  const dir = mkdtempSync(path.join(os.tmpdir(), "epoch-session-probe-"));
  try {
    spawnSync("git", ["-c", "init.defaultBranch=main", "init", "--quiet"], { cwd: dir });
    mkdirSync(path.join(dir, ".githooks"), { recursive: true });
    mkdirSync(path.join(dir, "scripts"), { recursive: true });
    cpSync(path.join(REPO_ROOT, "scripts/install-hooks.mjs"), path.join(dir, "scripts/install-hooks.mjs"));

    const binDir = path.join(dir, "node_modules/.bin");
    mkdirSync(binDir, { recursive: true });
    for (const bin of presentBins) {
      writeExecutable(path.join(binDir, bin), "#!/bin/sh\nexit 0\n");
    }

    const stubDir = path.join(dir, ".stub-bin");
    mkdirSync(stubDir, { recursive: true });
    const npmLog = path.join(dir, "npm-calls.log");
    writeExecutable(
      path.join(stubDir, "npm"),
      `#!/bin/sh\necho "$1" >> ${JSON.stringify(npmLog)}\nexit 0\n`,
    );

    const result = spawnSync("bash", [HOOK_PATH], {
      cwd: dir,
      encoding: "utf8",
      env: {
        ...process.env,
        CLAUDE_PROJECT_DIR: dir,
        PATH: `${stubDir}${path.delimiter}${process.env.PATH ?? ""}`,
        CI: "",
        SKIP_GIT_HOOKS: "",
      },
    });

    let installed = false;
    try {
      installed = readFileSync(npmLog, "utf8").trim().length > 0;
    } catch {
      // A missing log means npm was never invoked.
      installed = false;
    }

    return { installed, stderr: result.stderr };
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
}

function main(): void {
  const numRuns = Number(process.env.EPOCH_FUZZ_RUNS ?? "24");
  const seed = Number(process.env.EPOCH_FUZZ_SEED ?? "0x46415354");
  const params = {
    numRuns: Number.isFinite(numRuns) && numRuns > 0 ? numRuns : 24,
    seed: seed >>> 0,
    endOnFailure: true,
  };

  fc.assert(
    fc.property(fc.subarray([...REQUIRED_BINS]), (presentBins) => {
      const missing = REQUIRED_BINS.filter((bin) => !presentBins.includes(bin));
      const result = probeWith(presentBins);

      assert.equal(
        result.installed,
        missing.length > 0,
        `present=[${presentBins.join(",")}] must install exactly when something is missing`,
      );

      for (const bin of missing) {
        assert.match(
          result.stderr,
          new RegExp(`missing from node_modules/\\.bin: .*\\b${bin}\\b`, "u"),
          `${bin} is absent and must be named`,
        );
      }

      if (missing.length === 0) {
        assert.match(result.stderr, /toolchain ready/u);
      }
    }),
    params,
  );

  console.log("session-init probe fast-check properties passed");
}

main();
