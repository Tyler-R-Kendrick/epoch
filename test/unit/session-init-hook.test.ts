/**
 * Behavior tests for `.claude/hooks/session-start.sh`.
 *
 * The hook decides whether a session's toolchain needs installing. It has no
 * product surface, but it silently gates every local lint run: a session was
 * observed where the hook reported "dependencies already installed" while
 * `oxlint` was absent from `node_modules` entirely, so `npm run lint` and
 * `npm run lint:oxlint` both failed with the toolchain reported ready.
 *
 * Each case runs the real hook against a sandbox project with a stub `npm`
 * on PATH that records its invocations instead of installing anything, so the
 * decisions are observable without a network or a real dependency tree.
 */
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { chmodSync, cpSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import os from "node:os";
import path from "node:path";
import { assertVerified, verifiedFixture } from "../verify/assert-verified";

const REQUIRED_BINS = ["tsgo", "oxlint", "eslint", "konsistent"] as const;
const REPO_ROOT = process.cwd();
const HOOK_PATH = path.join(REPO_ROOT, ".claude/hooks/session-start.sh");

interface HookRun {
  readonly stderr: string;
  readonly status: number;
  /** One entry per stub-npm invocation, e.g. "install" or "ci". */
  readonly npmCalls: readonly string[];
  readonly hooksPath: string;
}

interface Sandbox {
  /** Project root the hook runs against. */
  readonly dir: string;
  /** Directory prepended to PATH so the stub npm shadows the real one. */
  readonly stubBinDir: string;
}

interface SandboxOptions {
  /** Binaries to link under node_modules/.bin; omit one to simulate a partial tree. */
  readonly presentBins: readonly string[];
  /** Exit code the stub npm returns for `npm install`. Non-zero simulates ENOTEMPTY. */
  readonly npmInstallExit?: number;
  /** Whether the sandbox has a node_modules directory at all. */
  readonly hasNodeModules?: boolean;
}

function writeExecutable(file: string, contents: string): void {
  writeFileSync(file, contents);
  chmodSync(file, 0o755);
}

/**
 * Builds a throwaway project the hook can run against: a git checkout, a
 * `.githooks` directory, a partial `node_modules/.bin`, and a stub `npm`
 * whose subcommand is appended to a log the assertions read back.
 */
function makeSandbox(options: SandboxOptions): Sandbox {
  const dir = mkdtempSync(path.join(os.tmpdir(), "epoch-session-init-"));
  const hasNodeModules = options.hasNodeModules !== false;

  spawnSync("git", ["-c", "init.defaultBranch=main", "init", "--quiet"], { cwd: dir });
  // The installer no-ops outside a git checkout, so the sandbox needs an identity-free repo only.
  mkdirSync(path.join(dir, ".githooks"), { recursive: true });
  writeExecutable(path.join(dir, ".githooks/pre-commit"), "#!/bin/sh\nexit 0\n");
  writeExecutable(path.join(dir, ".githooks/pre-push"), "#!/bin/sh\nexit 0\n");

  mkdirSync(path.join(dir, "scripts"), { recursive: true });
  cpSync(path.join(REPO_ROOT, "scripts/install-hooks.mjs"), path.join(dir, "scripts/install-hooks.mjs"));

  if (hasNodeModules) {
    const binDir = path.join(dir, "node_modules/.bin");
    mkdirSync(binDir, { recursive: true });
    for (const bin of options.presentBins) {
      writeExecutable(path.join(binDir, bin), "#!/bin/sh\nexit 0\n");
    }
  }

  const stubDir = path.join(dir, ".stub-bin");
  mkdirSync(stubDir, { recursive: true });
  const npmLog = path.join(dir, "npm-calls.log");
  const installExit = options.npmInstallExit ?? 0;
  // The stub records the subcommand and, for `install`, can fail the way a
  // half-written tree does, so the fallback path is exercised for real.
  writeExecutable(
    path.join(stubDir, "npm"),
    [
      "#!/bin/sh",
      `echo "$1" >> ${JSON.stringify(npmLog)}`,
      `if [ "$1" = "install" ]; then exit ${installExit}; fi`,
      "exit 0",
    ].join("\n") + "\n",
  );

  return { dir, stubBinDir: stubDir };
}

/** Reads the stub's invocation log; an absent log means npm was never called. */
function readNpmCalls(logPath: string): readonly string[] {
  try {
    return readFileSync(logPath, "utf8").split("\n").filter((line) => line.length > 0);
  } catch {
    return [];
  }
}

function runHook(sandbox: Sandbox): HookRun {
  const result = spawnSync("bash", [HOOK_PATH], {
    cwd: sandbox.dir,
    encoding: "utf8",
    env: {
      ...process.env,
      CLAUDE_PROJECT_DIR: sandbox.dir,
      PATH: `${sandbox.stubBinDir}${path.delimiter}${process.env.PATH ?? ""}`,
      // Keep the installer from no-opping the way it does on CI, so the
      // hooksPath branch is actually exercised here.
      CI: "",
      SKIP_GIT_HOOKS: "",
    },
  });

  const npmCalls = readNpmCalls(path.join(sandbox.dir, "npm-calls.log"));

  const hooksPath = spawnSync("git", ["config", "core.hooksPath"], {
    cwd: sandbox.dir,
    encoding: "utf8",
  }).stdout.trim();

  return { stderr: result.stderr, status: result.status ?? -1, npmCalls, hooksPath };
}

function completeTreeSkipsInstall(): void {
  const sandbox = makeSandbox({ presentBins: REQUIRED_BINS });
  try {
    const run = runHook(sandbox);
    assert.equal(run.status, 0);
    assert.deepEqual(run.npmCalls, [], "a complete tree must not trigger an install");
    assert.match(run.stderr, /dependencies already installed/u);
    assert.match(run.stderr, /toolchain ready/u);
  } finally {
    rmSync(sandbox.dir, { recursive: true, force: true });
  }
}

/**
 * The regression this hook change exists for: `tsgo` present but `oxlint`
 * missing is a partial tree, and the old single-binary probe called it ready.
 */
function partialTreeWithLintBinaryMissingInstalls(): void {
  const sandbox = makeSandbox({ presentBins: ["tsgo", "eslint", "konsistent"] });
  try {
    const run = runHook(sandbox);
    assert.equal(run.status, 0);
    assert.ok(run.npmCalls.length > 0, "a tree missing oxlint must trigger an install");
    assert.match(run.stderr, /missing from node_modules\/\.bin: oxlint/u);
    assert.doesNotMatch(run.stderr, /dependencies already installed/u);
  } finally {
    rmSync(sandbox.dir, { recursive: true, force: true });
  }
}

/** Every probed binary must be able to trigger the install on its own. */
function eachRequiredBinaryIsProbed(): void {
  for (const missing of REQUIRED_BINS) {
    const sandbox = makeSandbox({ presentBins: REQUIRED_BINS.filter((bin) => bin !== missing) });
    try {
      const run = runHook(sandbox);
      assert.ok(
        run.npmCalls.length > 0,
        `a tree missing ${missing} must trigger an install`,
      );
      assert.match(run.stderr, new RegExp(`missing from node_modules/\\.bin: .*${missing}`, "u"));
    } finally {
      rmSync(sandbox.dir, { recursive: true, force: true });
    }
  }
}

/**
 * A half-written tree fails `npm install` with ENOTEMPTY and no retry repairs
 * it; only a clean tree does. The hook must fall through to `npm ci`.
 */
function failedInstallFallsBackToCleanInstall(): void {
  const sandbox = makeSandbox({ presentBins: ["tsgo"], npmInstallExit: 217 });
  try {
    const run = runHook(sandbox);
    assert.deepEqual(run.npmCalls, ["install", "ci"], "a failed npm install must fall back to npm ci");
    assert.match(run.stderr, /retrying with npm ci/u);
  } finally {
    rmSync(sandbox.dir, { recursive: true, force: true });
  }
}

/** With no tree at all there is nothing to repair in place, so go straight to `npm ci`. */
function absentTreeUsesCleanInstall(): void {
  const sandbox = makeSandbox({ presentBins: [], hasNodeModules: false });
  try {
    const run = runHook(sandbox);
    assert.deepEqual(run.npmCalls, ["ci"]);
  } finally {
    rmSync(sandbox.dir, { recursive: true, force: true });
  }
}

/**
 * `prepare` never runs when the install is skipped, so the gates would be
 * silently inactive unless the hook wires core.hooksPath itself.
 */
function gitHooksAreWiredEvenWhenInstallIsSkipped(): void {
  const sandbox = makeSandbox({ presentBins: REQUIRED_BINS });
  try {
    const before = spawnSync("git", ["config", "core.hooksPath"], {
      cwd: sandbox.dir,
      encoding: "utf8",
    }).stdout.trim();
    assert.equal(before, "", "sandbox must start without core.hooksPath");

    const run = runHook(sandbox);
    assert.deepEqual(run.npmCalls, [], "this case must not install");
    assert.equal(run.hooksPath, ".githooks", "the hook must wire core.hooksPath itself");
    assert.match(run.stderr, /git hooks wired/u);
  } finally {
    rmSync(sandbox.dir, { recursive: true, force: true });
  }
}

/** SessionStart fires on resume, clear, and compact, so repeats must be free. */
function repeatRunsAreIdempotent(): void {
  const sandbox = makeSandbox({ presentBins: REQUIRED_BINS });
  try {
    runHook(sandbox);
    const second = runHook(sandbox);
    assert.equal(second.status, 0);
    assert.deepEqual(second.npmCalls, [], "a satisfied session must not reinstall");
    assert.equal(second.hooksPath, ".githooks");
    assert.doesNotMatch(second.stderr, /wiring \.githooks/u, "hooks must not be re-wired once set");
  } finally {
    rmSync(sandbox.dir, { recursive: true, force: true });
  }
}

/**
 * Characterization golden over the decision matrix, so a future edit that
 * quietly changes which trees install shows up as a golden diff.
 */
function decisionMatrixMatchesGolden(): void {
  const cases: SandboxOptions[] = [
    { presentBins: REQUIRED_BINS },
    { presentBins: ["tsgo", "eslint", "konsistent"] },
    { presentBins: ["tsgo"] },
    { presentBins: ["tsgo"], npmInstallExit: 217 },
    { presentBins: [], hasNodeModules: false },
  ];

  const observed = cases.map((options) => {
    const sandbox = makeSandbox(options);
    try {
      const run = runHook(sandbox);
      return {
        presentBins: [...options.presentBins].sort(),
        hasNodeModules: options.hasNodeModules !== false,
        npmInstallExit: options.npmInstallExit ?? 0,
        npmCalls: run.npmCalls,
        wiredHooksPath: run.hooksPath,
        exitStatus: run.status,
      };
    } finally {
      rmSync(sandbox.dir, { recursive: true, force: true });
    }
  });

  assertVerified("session-init-hook-decisions", verifiedFixture(observed));
}

export function runSessionInitHookTests(): void {
  completeTreeSkipsInstall();
  partialTreeWithLintBinaryMissingInstalls();
  eachRequiredBinaryIsProbed();
  failedInstallFallsBackToCleanInstall();
  absentTreeUsesCleanInstall();
  gitHooksAreWiredEvenWhenInstallIsSkipped();
  repeatRunsAreIdempotent();
  decisionMatrixMatchesGolden();
}
