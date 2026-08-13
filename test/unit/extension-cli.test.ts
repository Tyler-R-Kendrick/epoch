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
  aCorruptStoreTrustsNothing();
  trustRefusesNamesOutsideTheGrammar();
  dispatchRefusesABinarySwappedAfterTheCheck();
}

interface Captured {
  readonly io: { stdout: { write(message: string): void }; stderr: { write(message: string): void } };
  out(): string;
  err(): string;
}

function capture(): Captured {
  let out = "";
  let err = "";
  return {
    io: { stdout: { write: (message) => { out += message; } }, stderr: { write: (message) => { err += message; } } },
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
  const bin = join(root, ".epoch", "ext", "bin");
  mkdirSync(bin, { recursive: true });
  const executable = join(bin, "epoch-greet");
  writeFileSync(executable, body, "utf8");
  chmodSync(executable, 0o755);
  writeFileSync(
    join(bin, "epoch-greet.toml"),
    [`name = "greet"`, "api = 1", `version = "1.0.0"`, `capabilities = ["command"]`].join("\n"),
    "utf8",
  );
}

function configPath(root: string): string {
  return join(root, ".epoch", "config.toml");
}

function storePath(root: string): string {
  return join(root, ".epoch", "ext", "trust.json");
}

const isolated = { pathEntries: [] as readonly string[] };

/** Dispatch `greet` without launching anything, reporting whether it would run. */
function wouldRun(root: string): boolean {
  let spawned = false;
  const result = dispatchExternalSubcommand(root, "greet", [], capture().io, {
    pathEntries: [],
    homeDirectory: join(root, "absent-home"),
    spawn: () => {
      spawned = true;
      return 0;
    },
  });
  assert.equal(result.handled, true, "greet is installed, so dispatch must own it either way");
  return spawned;
}

function operationsOf(root: string): readonly (string | undefined)[] {
  return new EpochRepository(root).events()
    .filter((event) => event.type === "operation")
    .map((event) => (event.payload as { command?: string }).command);
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
  const shapes: readonly string[] = [
    `[extensions]\nallow = ["mergiraf"]\n`,
    `[extensions]  # policy\nallow = [\n  "mergiraf",\n]\n`,
    `["extensions"]\nallow = ["mergiraf"]\n`,
    `[["extensions"]]\nname = "a"\n`,
    `["\\u0065xtensions"]\nallow = ["mergiraf"]\n`,
    `[extensions]\nallow = ["a"]\nallow = ["b"]\n`,
  ];

  for (const shape of shapes) {
    const root = workspace();
    try {
      const before = `[core]\ndefault_branch = "main"\n\n${shape}`;
      writeFileSync(configPath(root), before, "utf8");

      runExtensionCommand(root, ["trust", "greet"], capture().io, isolated);

      // Whatever the operator wrote, Epoch leaves it exactly as found.
      assert.equal(readFileSync(configPath(root), "utf8"), before, `must not rewrite: ${shape}`);
      assert.ok(existsSync(storePath(root)), "consent is recorded beside the config, not inside it");
      assert.equal(wouldRun(root), true, `consent must take effect despite: ${shape}`);
    } finally {
      rmSync(root, { force: true, recursive: true });
    }
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
    assert.throws(
      () => runExtensionCommand(root, ["trust", "greet"], capture().io, isolated),
      /not a readable trust store/u,
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
