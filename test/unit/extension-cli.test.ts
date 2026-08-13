import assert from "node:assert/strict";
import { chmodSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { EpochRepository } from "@epoch/core";
import { isExtensionName } from "@epoch/extensions";
import { dispatchExternalSubcommand, runExtensionCommand } from "@epoch/cli";

/**
 * `epoch ext trust|untrust` writes the file that decides whether an external
 * process runs, so both what it writes and what it refuses to write are
 * security behavior rather than convenience.
 */
export function runExtensionCliTests(): void {
  trustGrantsAndUntrustRevokesUnderEveryMode();
  trustEditPreservesSurroundingConfiguration();
  configEditRefusesShapesItCannotRewriteSafely();
  trustRefusesNamesThatWouldInjectPolicy();
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

function workspace(): string {
  const root = mkdtempSync(join(tmpdir(), "epoch-ext-cli-"));
  new EpochRepository(root).init("alice");
  const bin = join(root, ".epoch", "ext", "bin");
  mkdirSync(bin, { recursive: true });
  const executable = join(bin, "epoch-greet");
  writeFileSync(executable, "#!/bin/sh\nexit 0\n", "utf8");
  chmodSync(executable, 0o755);
  writeFileSync(
    join(bin, "epoch-greet.toml"),
    [`name = "greet"`, "api = 1", `version = "1.0.0"`, `capabilities = ["command"]`].join("\n"),
    "utf8",
  );
  return root;
}

function configOf(root: string): string {
  return readFileSync(join(root, ".epoch", "config.toml"), "utf8");
}

/** Dispatch `greet` without launching anything, reporting whether it would run. */
function wouldRun(root: string): boolean {
  const captured = capture();
  let spawned = false;
  const result = dispatchExternalSubcommand(root, "greet", [], captured.io, {
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

function trustGrantsAndUntrustRevokesUnderEveryMode(): void {
  const root = workspace();
  try {
    assert.equal(wouldRun(root), false, "the default policy admits nothing");

    runExtensionCommand(root, ["trust", "greet"], capture().io, { pathEntries: [] });
    assert.equal(wouldRun(root), true);

    runExtensionCommand(root, ["untrust", "greet"], capture().io, { pathEntries: [] });
    assert.equal(wouldRun(root), false);

    // The revocation has to survive a policy that admits extensions the allow
    // list never named. Removing `greet` from `allow` alone would leave it
    // running here while the CLI reported it untrusted.
    writeFileSync(
      join(root, ".epoch", "config.toml"),
      configOf(root).replace("[extensions]", `[extensions]\ntrust = "any"`),
      "utf8",
    );
    assert.equal(wouldRun(root), false, "block wins over an open trust mode");

    runExtensionCommand(root, ["trust", "greet"], capture().io, { pathEntries: [] });
    assert.equal(wouldRun(root), true, "trust must clear the block it set");
    assert.match(configOf(root), /block = \[\]/u);

    // Both decisions are auditable from history alone.
    const operations = new EpochRepository(root).events()
      .filter((event) => event.type === "operation")
      .map((event) => (event.payload as { command?: string }).command);
    assert.ok(operations.includes("ext-trust"));
    assert.ok(operations.includes("ext-untrust"));
  } finally {
    rmSync(root, { force: true, recursive: true });
  }
}

function trustEditPreservesSurroundingConfiguration(): void {
  const root = workspace();
  try {
    writeFileSync(
      join(root, ".epoch", "config.toml"),
      [
        "[core]",
        `default_branch = "main"`,
        "",
        "[extensions]  # policy for community extensions",
        `trust = "explicit"`,
        `allow = ["mergiraf"]   # structural merge`,
        "",
        "[remote]",
        `url = "https://example.invalid"`,
        "",
      ].join("\n"),
      "utf8",
    );

    runExtensionCommand(root, ["trust", "greet"], capture().io, { pathEntries: [] });
    const config = configOf(root);

    // A header carrying a trailing comment is still the same table; appending a
    // second `[extensions]` would corrupt the file.
    assert.equal(config.match(/\[extensions\]/gu)?.length, 1);
    assert.match(config, /\[extensions\] {2}# policy for community extensions/u);
    assert.match(config, /allow = \["greet", "mergiraf"\]\s+# structural merge/u);
    assert.match(config, /\[core\]/u);
    assert.match(config, /url = "https:\/\/example\.invalid"/u);
    assert.match(config, /trust = "explicit"/u);

    // The result must still be readable by the repository's own config reader.
    const parsed = new EpochRepository(root).repositoryConfig();
    assert.deepEqual((parsed.extensions as { allow?: unknown }).allow, ["greet", "mergiraf"]);
  } finally {
    rmSync(root, { force: true, recursive: true });
  }
}

function configEditRefusesShapesItCannotRewriteSafely(): void {
  const unsupported: readonly { readonly label: string; readonly config: string }[] = [
    {
      label: "a second [extensions] table",
      config: `[extensions]\nallow = []\n\n[core]\nx = 1\n\n[extensions]\nblock = []\n`,
    },
    {
      label: "a multi-line allow array",
      config: `[extensions]\nallow = [\n  "mergiraf",\n]\n`,
    },
    {
      label: "a duplicate allow key",
      config: `[extensions]\nallow = ["a"]\nallow = ["b"]\n`,
    },
    {
      label: "an allow entry that is not a quoted name",
      config: `[extensions]\nallow = [mergiraf]\n`,
    },
    {
      // TOML forbids a regular table at a path already used as an array of
      // tables, so appending `[extensions]` here would write a file no reader
      // accepts — and an unreadable policy is an unenforced one.
      label: "[extensions] declared as an array of tables",
      config: `[[extensions]]  # array of tables\nname = "a"\n`,
    },
    {
      // A TOML table header is a key, and keys may be quoted, so this names the
      // same table as `[extensions]`. Appending the bare form would define it
      // twice.
      label: "[extensions] declared with a quoted key",
      config: `["extensions"]\nallow = ["mergiraf"]\n`,
    },
    {
      label: "[extensions] declared with a literal-quoted key",
      config: `[ 'extensions' ]  # literal key\nallow = []\n`,
    },
    {
      label: "[extensions] declared as a quoted array of tables",
      config: `[["extensions"]]\nname = "a"\n`,
    },
  ];

  for (const { label, config } of unsupported) {
    const root = workspace();
    try {
      writeFileSync(join(root, ".epoch", "config.toml"), config, "utf8");
      assert.throws(
        () => runExtensionCommand(root, ["trust", "greet"], capture().io, { pathEntries: [] }),
        /refusing to edit/u,
        `${label} must be refused, not rewritten`,
      );
      // Refusing means leaving the operator's file exactly as it was. A partial
      // rewrite of a trust policy is worse than no rewrite at all.
      assert.equal(configOf(root), config, `${label} must leave the file untouched`);

      // A refusal must not be recorded as a completed grant. `succeeded` has to
      // mean the policy actually changed, or the audit log describes decisions
      // the repository never made.
      const operations = new EpochRepository(root).events()
        .filter((event) => event.type === "operation")
        .map((event) => (event.payload as { command?: string }).command);
      assert.ok(!operations.includes("ext-trust"), `${label} must record no operation`);
    } finally {
      rmSync(root, { force: true, recursive: true });
    }
  }
}

/**
 * The name reaches a TOML string unescaped, so the grammar check is the only
 * thing standing between an argument and a forged policy entry.
 */
function trustRefusesNamesThatWouldInjectPolicy(): void {
  const injections: readonly string[] = [
    `greet", "evil`,
    `greet"]\ntrust = "any"\n#`,
    `greet\nblock = []`,
    `greet # comment`,
    `greet"`,
    `Greet`,
    `-greet`,
    ``,
  ];

  for (const name of injections) {
    const root = workspace();
    try {
      const before = configOf(root);
      assert.throws(
        () => runExtensionCommand(root, ["trust", name], capture().io, { pathEntries: [] }),
        /invalid extension name/u,
        `'${name}' must be refused`,
      );
      assert.equal(configOf(root), before, `'${name}' must not reach the policy file`);

      // Refused before the audit append, so a rejected name leaves no operation
      // claiming a grant that was never made.
      const operations = new EpochRepository(root).events()
        .filter((event) => event.type === "operation")
        .map((event) => (event.payload as { command?: string }).command);
      assert.ok(!operations.includes("ext-trust"), `'${name}' must not record an operation`);
    } finally {
      rmSync(root, { force: true, recursive: true });
    }
  }

  // The grammar the manifest parser enforces and the one the CLI enforces must
  // be the same, or a name could be trustable but never loadable.
  assert.equal(isExtensionName("greet"), true);
  assert.equal(isExtensionName("git-town"), true);
  assert.equal(isExtensionName("a1"), true);
  assert.equal(isExtensionName(`a", "b`), false);
}
