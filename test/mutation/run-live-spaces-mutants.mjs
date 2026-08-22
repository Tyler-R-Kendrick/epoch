#!/usr/bin/env node
/**
 * Kill listed Live Spaces mutants: patch source, rebuild the runtime package,
 * expect the Live Spaces tests to fail. Restores files even on crash.
 *
 * Coverage measures which lines ran. This measures whether anything would have
 * noticed them running differently — the distinction that matters for a
 * publication filter, where a test can execute every branch of a rule and still
 * not assert the rule holds.
 *
 * Each mutant below weakens one guarantee the feature is built on. A survivor
 * is a guarantee nothing is actually testing. Not Stryker.
 */
import { spawnSync } from "node:child_process";
import { existsSync, readFileSync, writeFileSync } from "node:fs";

const POLICY = "packages/Epoch.Community.Runtime/src/live/publication-policy.ts";
const LOG = "packages/Epoch.Community.Runtime/src/live/presentation-log.ts";
const COMMANDS = "packages/Epoch.Community.Runtime/src/live/commands.ts";

const mutants = [
  {
    // The floor a session cannot negotiate with. Removing one entry is the
    // single worst regression this feature can have.
    name: "immutable-deny-drops-dotenv",
    file: POLICY,
    find: '  "**/.env",\n',
    replace: '  "**/.env.never-matches",\n',
  },
  {
    // A credential filed under an honest label stops being refused.
    name: "secret-key-names-ignored",
    file: POLICY,
    find: "if (isSecretKeyName(key)) return { kind: \"fail\", reason: \"immutable-deny\" };",
    replace: "if (false) return { kind: \"fail\", reason: \"immutable-deny\" };",
  },
  {
    // A credential filed under a lie stops being refused — the gap the
    // property lane found and closed.
    name: "secret-value-shapes-ignored",
    file: POLICY,
    find: "  return SECRET_VALUE_PATTERNS.some((pattern) => pattern.test(value));",
    replace: "  return false;",
  },
  {
    // `?` goes back to reaching the compiled expression as a quantifier, so a
    // deny rule spelled `**/secret?.txt` releases `secrets.txt` again.
    name: "single-char-glob-is-a-quantifier",
    file: POLICY,
    find: '    .replaceAll("?", "\\0chr\\0")\n',
    replace: '',
  },
  {
    // Unverified captures enter the stream: publication stops requiring that
    // the source attested against signed history.
    name: "unverified-source-accepted",
    file: LOG,
    find: 'if (input.sourceVerified !== true) return { kind: "fail", reason: "unverified-source" };',
    replace: 'if (false) return { kind: "fail", reason: "unverified-source" };',
  },
  {
    // Sequence stops being the ordering authority: a hole is applied as if it
    // were contiguous, and the reader is silently behind.
    name: "spectator-ignores-gaps",
    file: LOG,
    find: "    if (envelope.sequence > lastSequence + 1) {",
    replace: "    if (false) {",
  },
  {
    // An issued checkpoint's content changes underneath its readers again.
    name: "checkpoint-not-idempotent",
    file: LOG,
    find: "const existing = checkpoints.find((candidate) => candidate.checkpointId === checkpointId);",
    replace: "const existing = checkpoints.find(() => false);",
  },
  {
    // Observers regain the ability to publish into a session they may watch.
    name: "observer-may-publish",
    file: COMMANDS,
    find: 'fail("policy-denied", "observer grants do not authorize publication");',
    replace: "void 0;",
  },
  {
    // Observers regain the ability to write checkpoints — the privilege gap
    // the characterization goldens exposed.
    name: "observer-may-checkpoint",
    file: COMMANDS,
    find: 'fail("policy-denied", "observer grants do not authorize recording a checkpoint");',
    replace: "void 0;",
  },
];

const originals = new Map();

function restore() {
  for (const [file, contents] of originals) writeFileSync(file, contents);
}

function run(command, args) {
  return spawnSync(command, args, { stdio: "pipe", encoding: "utf8" });
}

function buildRuntime() {
  const result = run("npm", ["run", "build", "-w", "@epoch/community-runtime"]);
  if (result.status !== 0) {
    throw new Error(`community-runtime build failed:\n${result.stdout}\n${result.stderr}`);
  }
}

/**
 * Run only the Live Spaces suites. The compiled tests import the runtime
 * through its package entry point, so rebuilding that package is enough for a
 * mutant to reach them without recompiling the whole test tree each round.
 */
function liveTests() {
  return run("node", ["-e", `
    const suites = [
      ["./dist/test/unit/live-spaces-policy.test.js", "runLiveSpacesPolicyTests"],
      ["./dist/test/unit/live-spaces-log.test.js", "runLiveSpacesLogTests"],
      ["./dist/test/unit/live-spaces-commands.test.js", "runLiveSpacesCommandTests"],
      ["./dist/test/unit/live-spaces-moderation.test.js", "runLiveSpacesModerationTests"],
      ["./dist/test/unit/live-spaces-characterization.test.js", "runLiveSpacesCharacterizationTests"],
    ];
    (async () => {
      for (const [path, name] of suites) await require(path)[name]();
    })().catch((error) => { console.error(String(error && error.message)); process.exit(1); });
  `]);
}

const TEST_TREE = "dist/test/unit/live-spaces-policy.test.js";

try {
  if (!existsSync(TEST_TREE)) {
    // The mutant loop never rebuilds the test tree, so it has to exist first.
    const built = run("npm", ["run", "build", "--", "--pretty", "false"]);
    if (built.status !== 0) throw new Error(`initial build failed:\n${built.stdout}\n${built.stderr}`);
  }

  for (const mutant of mutants) {
    if (!originals.has(mutant.file)) originals.set(mutant.file, readFileSync(mutant.file, "utf8"));
  }

  // A baseline that does not pass makes every "killed" meaningless: the tests
  // would be failing for a reason that has nothing to do with the mutant.
  restore();
  buildRuntime();
  const baseline = liveTests();
  if (baseline.status !== 0) {
    throw new Error(`live tests fail before any mutation:\n${baseline.stdout}\n${baseline.stderr}`);
  }

  let survived = 0;
  for (const mutant of mutants) {
    restore();
    const before = readFileSync(mutant.file, "utf8");
    const count = before.split(mutant.find).length - 1;
    if (count !== 1) {
      throw new Error(`${mutant.name}: expected exactly one '${mutant.find}' in ${mutant.file}, found ${count}`);
    }
    writeFileSync(mutant.file, before.replace(mutant.find, mutant.replace));
    buildRuntime();
    const result = liveTests();
    if (result.status === 0) {
      survived += 1;
      console.error(`SURVIVED ${mutant.name}`);
    } else {
      console.log(`KILLED ${mutant.name} (exit ${result.status})`);
    }
  }

  restore();
  buildRuntime();

  if (survived > 0) {
    console.error(`${survived} mutant(s) survived`);
    process.exitCode = 1;
  } else {
    console.log(`killed ${mutants.length} live spaces mutants`);
  }
} catch (error) {
  restore();
  try {
    buildRuntime();
  } catch {
    /* still report original error */
  }
  console.error(error);
  process.exitCode = 1;
}
