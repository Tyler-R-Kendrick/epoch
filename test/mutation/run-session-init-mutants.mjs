#!/usr/bin/env node
/**
 * Kill listed session-init mutants: patch `.claude/hooks/session-start.sh`,
 * expect the session-init hook tests to fail. Restores the file even on crash.
 * Not Stryker; focused on the three mechanisms that keep a session's lint
 * toolchain runnable.
 *
 * Each mutant reverts one mechanism to the behavior that shipped the defect
 * this lane exists for, so a test that cannot notice the reversion is proven
 * to be no gate at all.
 */
import { spawnSync } from "node:child_process";
import { readFileSync, writeFileSync } from "node:fs";

const HOOK = ".claude/hooks/session-start.sh";

const mutants = [
  {
    // The original defect: probing one binary calls a partial tree ready.
    name: "probe-only-tsgo",
    file: HOOK,
    find: 'required_bins="tsgo oxlint eslint konsistent"',
    replace: 'required_bins="tsgo"',
  },
  {
    // Without the fallback a half-written tree stays broken for the session.
    name: "no-clean-install-fallback",
    file: HOOK,
    find: '      echo "SessionStart: npm install exited $install_status (a corrupt tree cannot be repaired in place) -- retrying with npm ci." >&2\n      npm ci\n      install_status=$?',
    replace: '      echo "SessionStart: npm install exited $install_status." >&2',
  },
  {
    // Without direct wiring the gates are silently inactive when install is skipped.
    name: "no-git-hook-wiring",
    file: HOOK,
    find: '  node scripts/install-hooks.mjs >/dev/null 2>&1',
    replace: '  true',
  },
];

const originals = new Map();

function restore() {
  for (const [file, contents] of originals) {
    writeFileSync(file, contents);
  }
}

function runOracle() {
  // The hook tests read the hook from disk, so the mutant applies without a
  // rebuild. EPOCH_UPDATE_VERIFIED is cleared so a mutant can never launder
  // itself by rewriting the golden it violates.
  const env = { ...process.env };
  delete env.EPOCH_UPDATE_VERIFIED;
  return spawnSync(
    process.execPath,
    ["-e", "require('./dist/test/unit/session-init-hook.test.js').runSessionInitHookTests()"],
    { stdio: "pipe", encoding: "utf8", env },
  );
}

try {
  for (const mutant of mutants) {
    if (!originals.has(mutant.file)) {
      originals.set(mutant.file, readFileSync(mutant.file, "utf8"));
    }
  }

  const baseline = runOracle();
  if (baseline.status !== 0) {
    throw new Error(
      `session-init hook tests must pass before mutating (exit ${baseline.status}). Run \`npm run build\` first.\n${baseline.stderr}`,
    );
  }

  let survived = 0;
  for (const mutant of mutants) {
    restore();
    const before = readFileSync(mutant.file, "utf8");
    const count = before.split(mutant.find).length - 1;
    if (count !== 1) {
      throw new Error(
        `${mutant.name}: expected exactly one occurrence in ${mutant.file}, found ${count}`,
      );
    }
    writeFileSync(mutant.file, before.replace(mutant.find, mutant.replace));
    const test = runOracle();
    if (test.status === 0) {
      survived += 1;
      console.error(`SURVIVED ${mutant.name}`);
      console.error(test.stdout);
    } else {
      console.log(`KILLED ${mutant.name} (exit ${test.status})`);
    }
  }

  restore();

  if (survived > 0) {
    console.error(`${survived} mutant(s) survived`);
    process.exitCode = 1;
  } else {
    console.log(`killed ${mutants.length} session-init mutants`);
  }
} catch (error) {
  restore();
  console.error(error);
  process.exitCode = 1;
}
