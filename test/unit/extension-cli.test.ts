import assert from "node:assert/strict";
import { chmodSync, existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { EpochRepository } from "@epoch/core";
import { isExtensionName, parseTrustStore, type ExtensionFileSystem } from "@epoch/extensions";
import { dispatchExternalSubcommand, runExtensionCommand } from "@epoch/cli";

/**
 * `epoch ext trust|untrust` decides whether an external process runs, so what
 * it records — and what it refuses to record — is security behavior rather
 * than convenience.
 */
export function runExtensionCliTests(): void {
  trustGrantsAndUntrustRevokesUnderEveryMode();
  consentDoesNotTransferToADifferentBinary();
  operatorConfigurationIsReadNeverRewritten();
  anUnreadableConfigurationIsReportedAndNotRunThrough();
  anUnknownPolicyKeyWarnsWithoutRefusing();
  aCorruptStoreTrustsNothing();
  trustRefusesNamesOutsideTheGrammar();
  trustRefusesWhatItCannotBindToABinary();
  dispatchRefusesABinarySwappedAfterTheCheck();
  dispatchRefusesWhenTheBinaryCannotBeDigested();
}

type ExtensionCliIO = Parameters<typeof runExtensionCommand>[2];

interface Captured {
  readonly io: ExtensionCliIO;
  out(): string;
  err(): string;
}

function capture(): Captured {
  let out = "";
  let err = "";
  return {
    // SAFETY: Capture buffers implement ExtensionCliIO for dispatch and trust commands under test.
    io: { stdout: { write: (message: string) => { out += message; } }, stderr: { write: (message: string) => { err += message; } } } as ExtensionCliIO,
    out: () => out,
    err: () => err,
  };
}

function workspace(body = "#!/bin/sh\nexit 0\n"): string {
  const root = mkdtempSync(join(tmpdir(), "epoch-ext-cli-"));
  new EpochRepository(root).init("alice");
  installGreet(root, body);
  return root;
}

function installGreet(root: string, body: string): void {
  installExtension(root, "greet", body);
}

function installExtension(root: string, name: string, body: string): void {
  const bin = join(root, ".epoch", "ext", "bin");
  mkdirSync(bin, { recursive: true });
  const executable = join(bin, `epoch-${name}`);
  writeFileSync(executable, body, "utf8");
  chmodSync(executable, 0o755);
  writeFileSync(
    join(bin, `epoch-${name}.toml`),
    [`name = "${name}"`, "api = 1", `version = "1.0.0"`, `capabilities = ["command"]`].join("\n"),
    "utf8",
  );
}

function configPath(root: string): string {
  return join(root, ".epoch", "config.toml");
}

function storePath(root: string): string {
  return join(root, ".epoch", "ext", "trust.json");
}

// SAFETY: Runtime checks or construction above establish readonly string[] }.
const isolated = { pathEntries: [] as readonly string[] };

/** Dispatch `greet` without launching anything, reporting whether it would run. */
function wouldRun(root: string): boolean {
  return wouldRunNamed(root, "greet");
}

function wouldRunNamed(root: string, name: string): boolean {
  let spawned = false;
  const result = dispatchExternalSubcommand(root, name, [], capture().io, {
    pathEntries: [],
    homeDirectory: join(root, "absent-home"),
    spawn: () => {
      spawned = true;
      return 0;
    },
  });
  assert.equal(result.handled, true, `${name} is installed, so dispatch must own it either way`);
  return spawned;
}

function operationsOf(root: string): readonly (string | undefined)[] {
  return new EpochRepository(root).events()
    .filter((event) => event.type === "operation")
    // SAFETY: Runtime checks or construction above establish { command?: string }).command).
    .map((event) => (/* SAFETY: Assertion is justified by surrounding validation or construction. */ event.payload as { command?: string }).command);
}

function trustGrantsAndUntrustRevokesUnderEveryMode(): void {
  const root = workspace();
  try {
    assert.equal(wouldRun(root), false, "the default policy admits nothing");

    runExtensionCommand(root, ["trust", "greet"], capture().io, isolated);
    assert.equal(wouldRun(root), true);

    // Consent is recorded against the binary, not merely the name.
    const store = parseTrustStore(readFileSync(storePath(root), "utf8"));
    assert.equal(store.allow.length, 1);
    assert.equal(store.allow[0].name, "greet");
    assert.match(store.allow[0].executableSha256 ?? "", /^[a-f0-9]{64}$/u);

    runExtensionCommand(root, ["untrust", "greet"], capture().io, isolated);
    assert.equal(wouldRun(root), false);

    // Revocation has to hold under a policy that admits extensions the allow
    // list never named, or `untrust` would report success and change nothing.
    writeFileSync(configPath(root), `${readFileSync(configPath(root), "utf8")}\n[extensions]\ntrust = "any"\n`, "utf8");

    // Prove the open mode is actually in force, or the next assertion could
    // pass because nothing was admitted rather than because the block held.
    installExtension(root, "other", "#!/bin/sh\nexit 0\n");
    assert.equal(wouldRunNamed(root, "other"), true, "trust = 'any' admits an unlisted extension");
    assert.equal(wouldRun(root), false, "a recorded revocation outranks an open trust mode");

    runExtensionCommand(root, ["trust", "greet"], capture().io, isolated);
    assert.equal(wouldRun(root), true, "trust must clear the block it set");
    assert.deepEqual(parseTrustStore(readFileSync(storePath(root), "utf8")).block, []);

    const operations = operationsOf(root);
    assert.ok(operations.includes("ext-trust"));
    assert.ok(operations.includes("ext-untrust"));
  } finally {
    rmSync(root, { force: true, recursive: true });
  }
}

/**
 * The defect this design removes: a grant that survives the binary it was
 * given for. Under a name-only allow list, replacing the executable inherits
 * the previous consent silently.
 */
function consentDoesNotTransferToADifferentBinary(): void {
  const root = workspace();
  try {
    runExtensionCommand(root, ["trust", "greet"], capture().io, isolated);
    assert.equal(wouldRun(root), true);

    installGreet(root, "#!/bin/sh\necho different\n");
    assert.equal(wouldRun(root), false, "a replaced binary has not been consented to");

    const captured = capture();
    dispatchExternalSubcommand(root, "greet", [], captured.io, {
      pathEntries: [],
      homeDirectory: join(root, "absent-home"),
      spawn: () => 0,
    });
    assert.match(captured.err(), /has changed since you trusted it/u);

    // Re-consenting adopts the new binary rather than accumulating grants.
    runExtensionCommand(root, ["trust", "greet"], capture().io, isolated);
    assert.equal(wouldRun(root), true);
    assert.equal(parseTrustStore(readFileSync(storePath(root), "utf8")).allow.length, 1);
  } finally {
    rmSync(root, { force: true, recursive: true });
  }
}

/**
 * Hand-authored configuration is input, not storage. Epoch parses no TOML it
 * did not write and rewrites none of it, which is what removes the class of
 * defect that repeated line-editing of this file kept producing.
 */
function operatorConfigurationIsReadNeverRewritten(): void {
  /**
   * `runs: false` is not a lesser outcome. A policy that could not be read in
   * full cannot be relied on to deny anything, and the half that survives is
   * the half that permits — so the launch is refused with a reason rather than
   * allowed on an incomplete denial (ADR-0048).
   */
  const fixtures: readonly { readonly toml: string; readonly runs: boolean }[] = [
    { toml: `[extensions]\nallow = ["mergiraf"]\n`, runs: true },
    { toml: `[extensions]  # policy\nallow = [\n  "mergiraf",\n]\n`, runs: true },
    { toml: `["extensions"]\nallow = ["mergiraf"]\n`, runs: true },
    { toml: `["\\u0065xtensions"]\nallow = ["mergiraf"]\n`, runs: true },
    // Every spelling of `[extensions]` reaches the same table, including the
    // ones an earlier line-editing implementation could be walked past.
    { toml: `[extensions]\nallow = ["mergiraf"]  # trailing "]" and # inside a comment\n`, runs: true },
    { toml: `[[extensions]]\nname = "a"\n`, runs: false },
    { toml: `[extensions]\nallow = ["a"]\nallow = ["b"]\n`, runs: false },
    // A typo in `trust` narrows the policy and loses no denial, so it is a
    // warning rather than a reason to refuse everything.
    { toml: `[extensions]\ntrust = "eny"\n`, runs: true },
    { toml: `[extensions]\nallow = ["mergiraf"]\nunknown_key = 1\n`, runs: true },
  ];

  for (const fixture of fixtures) {
    const root = workspace();
    try {
      const before = `[core]\ndefault_branch = "main"\n\n${fixture.toml}`;
      writeFileSync(configPath(root), before, "utf8");

      runExtensionCommand(root, ["trust", "greet"], capture().io, isolated);

      // Whatever the operator wrote, Epoch leaves it exactly as found.
      assert.equal(readFileSync(configPath(root), "utf8"), before, `must not rewrite: ${fixture.toml}`);
      assert.ok(existsSync(storePath(root)), "consent is recorded beside the config, not inside it");
      assert.equal(wouldRun(root), fixture.runs, `wrong outcome for: ${fixture.toml}`);
    } finally {
      rmSync(root, { force: true, recursive: true });
    }
  }
}

/**
 * A key Epoch does not recognise is worth saying out loud, and nothing more.
 *
 * The distinction that matters: a policy that could not be *read in full*
 * cannot be relied on to deny anything, so it refuses every launch. A policy
 * that was read in full but contains a key with no meaning has lost no part of
 * its `block` list, so refusing everything would turn a typo into a
 * repository-wide outage.
 */
function anUnknownPolicyKeyWarnsWithoutRefusing(): void {
  const root = workspace();
  try {
    runExtensionCommand(root, ["trust", "greet"], capture().io, isolated);
    writeFileSync(
      configPath(root),
      `[extensions]\nallow = []\nfuture_key = "from a newer Epoch"\n\n[extensions.subtable]\nx = 1\n`,
      "utf8",
    );

    const listed = capture();
    runExtensionCommand(root, ["list"], listed.io, isolated);
    assert.match(listed.err(), /future_key/u, "the operator is told the key has no effect");
    assert.equal(wouldRun(root), true, "recorded consent still applies");

    // And a block in the same file is still obeyed, which is the property that
    // makes warning rather than refusing safe.
    writeFileSync(
      configPath(root),
      `[extensions]\nblock = ["greet"]\nfuture_key = "from a newer Epoch"\n`,
      "utf8",
    );
    assert.equal(wouldRun(root), false, "the block list survives an unknown key beside it");
  } finally {
    rmSync(root, { force: true, recursive: true });
  }
}

/**
 * A configuration Epoch cannot read is an error the operator sees.
 *
 * The composition this closes: a hand-written `block` list plus an unrelated
 * syntax error elsewhere used to mean the block silently disappeared while
 * recorded consent kept running the extension (ADR-0048).
 */
function anUnreadableConfigurationIsReportedAndNotRunThrough(): void {
  const root = workspace();
  try {
    runExtensionCommand(root, ["trust", "greet"], capture().io, isolated);
    assert.equal(wouldRun(root), true, "consent alone runs the extension");

    writeFileSync(
      configPath(root),
      `[extensions]\nblock = ["greet"]\n\n[docs]\nhome = "https://example.com/#top\n`,
      "utf8",
    );

    const listed = capture();
    runExtensionCommand(root, ["list"], listed.io, isolated);
    assert.match(listed.err(), /config\.toml:5:\d+/u, "the operator is told which line stopped the read");

    const dispatched = capture();
    const result = dispatchExternalSubcommand(root, "greet", [], dispatched.io, {
      ...isolated,
      spawn: () => { throw new Error("must not launch under an unreadable policy"); },
    });
    assert.equal(result.exitCode, 1);
    assert.match(dispatched.err(), /refusing to run extension 'greet'/u);
  } finally {
    rmSync(root, { force: true, recursive: true });
  }
}

/**
 * A damaged store must not read as "no entries": that would drop its `block`
 * list, turning corruption into a widened policy.
 */
function aCorruptStoreTrustsNothing(): void {
  const root = workspace();
  try {
    runExtensionCommand(root, ["trust", "greet"], capture().io, isolated);
    assert.equal(wouldRun(root), true);

    writeFileSync(configPath(root), `${readFileSync(configPath(root), "utf8")}\n[extensions]\ntrust = "any"\n`, "utf8");
    writeFileSync(storePath(root), `{"version":1,"allow":[{"name":`, "utf8");

    assert.equal(wouldRun(root), false, "a corrupt store closes the policy, even under trust = 'any'");

    const damaged = readFileSync(storePath(root), "utf8");
    const before = operationsOf(root).length;
    // The refusal names what is wrong, so the operator can repair the file
    // rather than being told to delete consent they may still want.
    assert.throws(
      () => runExtensionCommand(root, ["trust", "greet"], capture().io, isolated),
      /refusing to edit .*trust\.json: trust store is not valid JSON/u,
      "and it is never silently overwritten",
    );
    assert.equal(readFileSync(storePath(root), "utf8"), damaged, "the operator's file is left as found");
    assert.equal(operationsOf(root).length, before, "a refused grant records no operation");
  } finally {
    rmSync(root, { force: true, recursive: true });
  }
}

function trustRefusesNamesOutsideTheGrammar(): void {
  const rejected: readonly string[] = [`greet", "evil`, `greet\nblock = []`, `greet # c`, `../../etc/passwd`, `Greet`, ``];

  for (const name of rejected) {
    const root = workspace();
    try {
      assert.throws(
        () => runExtensionCommand(root, ["trust", name], capture().io, isolated),
        /invalid extension name/u,
        `'${name}' must be refused`,
      );
      assert.ok(!existsSync(storePath(root)), `'${name}' must not reach the store`);
      assert.ok(!operationsOf(root).includes("ext-trust"), `'${name}' must record no operation`);
    } finally {
      rmSync(root, { force: true, recursive: true });
    }
  }

  // The CLI and the manifest parser share one grammar, so a name cannot be
  // trustable but unloadable.
  assert.equal(isExtensionName("git-town"), true);
  assert.equal(isExtensionName(`a", "b`), false);
}

/**
 * The hole this design would otherwise have: `ext trust foo` before `foo` is
 * installed has no binary to bind to. Recording it anyway would grant consent
 * to a *name*, and any binary later dropped at that path would inherit it —
 * silently, and permanently.
 */
function trustRefusesWhatItCannotBindToABinary(): void {
  const root = mkdtempSync(join(tmpdir(), "epoch-ext-cli-"));
  try {
    new EpochRepository(root).init("alice");

    assert.throws(
      () => runExtensionCommand(root, ["trust", "greet"], capture().io, isolated),
      /no extension by that name is installed/u,
      "consent needs a binary to bind to",
    );
    assert.ok(!existsSync(storePath(root)), "nothing may be recorded");
    assert.ok(!operationsOf(root).includes("ext-trust"), "and no operation claims otherwise");

    // Installing afterwards must not inherit a grant that was never given.
    installGreet(root, "#!/bin/sh\nexit 0\n");
    assert.equal(wouldRun(root), false);

    // An executable that cannot be digested is refused for the same reason.
    assert.throws(
      () => runExtensionCommand(root, ["trust", "greet"], capture().io, {
        pathEntries: [],
        fileSystem: {
          listDirectory: (directory) => (directory === join(root, ".epoch", "ext", "bin")
            ? ["epoch-greet", "epoch-greet.toml"]
            : []),
          isExecutableFile: () => true,
          readTextFile: (path) => (existsSync(path) ? readFileSync(path, "utf8") : undefined),
          fileDigest: () => undefined,
        },
      }),
      /could not be read to bind consent/u,
    );
    assert.ok(!existsSync(storePath(root)));

    // Revocation needs no binary — it must work even for something uninstalled.
    runExtensionCommand(root, ["untrust", "absent"], capture().io, isolated);
    assert.deepEqual(parseTrustStore(readFileSync(storePath(root), "utf8")).block, ["absent"]);
  } finally {
    rmSync(root, { force: true, recursive: true });
  }
}

/**
 * Trust is decided against a digest read moments before launch. Re-reading it
 * at the spawn boundary does not close that window, but it narrows it, and a
 * swap that loses the race is refused rather than run.
 */
function dispatchRefusesABinarySwappedAfterTheCheck(): void {
  const root = workspace();
  try {
    const bin = join(root, ".epoch", "ext", "bin");
    const executable = join(bin, "epoch-greet");
    // A filesystem whose digest answers are scripted, so the swap lands in the
    // window between the trust decision and the launch rather than before it.
    const scripted = (digests: readonly string[]): ExtensionFileSystem => {
      let calls = 0;
      return {
        listDirectory: (directory) => (directory === bin ? ["epoch-greet", "epoch-greet.toml"] : []),
        isExecutableFile: (path) => path === executable,
        readTextFile: (path) => (existsSync(path) ? readFileSync(path, "utf8") : undefined),
        fileDigest: () => digests[Math.min(calls++, digests.length - 1)],
      };
    };

    const consented = "a".repeat(64);
    runExtensionCommand(root, ["trust", "greet"], capture().io, {
      pathEntries: [],
      fileSystem: scripted([consented]),
    });

    const captured = capture();
    let spawned = false;
    const result = dispatchExternalSubcommand(root, "greet", [], captured.io, {
      pathEntries: [],
      homeDirectory: join(root, "absent-home"),
      // Matches the grant at discovery, differs at the spawn boundary.
      fileSystem: scripted([consented, "b".repeat(64)]),
      spawn: () => {
        spawned = true;
        return 0;
      },
    });

    assert.equal(spawned, false, "a binary that changed mid-command must not be launched");
    assert.equal(result.exitCode, 1);
    assert.match(captured.err(), /changed on disk while it was being checked/u);
  } finally {
    rmSync(root, { force: true, recursive: true });
  }
}

/**
 * Two absent digests compare equal, so a filesystem that cannot digest would
 * have waved the launch straight through the guard meant to catch swaps.
 */
function dispatchRefusesWhenTheBinaryCannotBeDigested(): void {
  const root = workspace();
  try {
    const bin = join(root, ".epoch", "ext", "bin");
    // A name-only `allow` in configuration is the case where the pre-spawn
    // guard is the *only* digest check: there is no recorded grant to compare
    // against, so nothing upstream refuses first.
    writeFileSync(
      configPath(root),
      `${readFileSync(configPath(root), "utf8")}\n[extensions]\nallow = ["greet"]\n`,
      "utf8",
    );

    const captured = capture();
    let spawned = false;
    const result = dispatchExternalSubcommand(root, "greet", [], captured.io, {
      pathEntries: [],
      homeDirectory: join(root, "absent-home"),
      fileSystem: {
        listDirectory: (directory) => (directory === bin ? ["epoch-greet", "epoch-greet.toml"] : []),
        isExecutableFile: () => true,
        readTextFile: (path) => (existsSync(path) ? readFileSync(path, "utf8") : undefined),
        // No fileDigest at all: the seam declares it optional.
      },
      spawn: () => {
        spawned = true;
        return 0;
      },
    });

    assert.equal(spawned, false, "an undigestible binary must not be launched");
    assert.equal(result.exitCode, 1);
    assert.match(captured.err(), /could not be digested before launch/u);
  } finally {
    rmSync(root, { force: true, recursive: true });
  }
}
