import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { chmodSync, mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { EpochRepository } from "@epoch/core";
import { parseExtensionManifest } from "@epoch/extensions";
import { repositorySyntaxRegistry, runExtensionCommand } from "@epoch/cli";
import type { SyntaxProvider } from "@epoch/semantic";
import { buildSyntaxProviderModule } from "./wasm-fixture";

/**
 * Loading the providers an extension ships (ADR-0045).
 *
 * `wasm.ts` could always run a module; that is not the same as an installed
 * extension displacing a builtin. These tests are about the wiring in between —
 * the manifest declaring a module, the digest binding it, and the trust policy
 * deciding whether it loads at all — because until that path works end to end,
 * "an extension can displace a builtin" is a claim about a library rather than
 * about the product.
 */
export function runProviderLoadingTests(): void {
  aTrustedExtensionDisplacesABuiltin();
  anUntrustedExtensionSuppliesNothing();
  aSwappedModuleIsRefused();
  aManifestMustBindEveryModuleItShips();
}

/** A tree the fixture module returns for any source, in UTF-8 byte offsets. */
function fixtureTree(source: string): string {
  return JSON.stringify({
    language: "json",
    root: {
      kind: "grammar-object",
      start: 0,
      end: Buffer.byteLength(source, "utf8"),
      children: [{ kind: "member", name: "a", start: 1, end: Buffer.byteLength(source, "utf8") - 1 }],
    },
  });
}

interface Fixture {
  readonly root: string;
  readonly moduleSha256: string;
}

function workspace(options: { readonly declaredDigest?: string } = {}): Fixture {
  const root = mkdtempSync(join(tmpdir(), "epoch-providers-"));
  new EpochRepository(root).init("alice");

  const bin = join(root, ".epoch", "ext", "bin");
  mkdirSync(bin, { recursive: true });
  const executable = join(bin, "epoch-grammar");
  writeFileSync(executable, "#!/bin/sh\nexit 0\n", "utf8");
  chmodSync(executable, 0o755);

  const wasm = buildSyntaxProviderModule({ result: fixtureTree(`{"a":1}`) });
  writeFileSync(join(bin, "grammar-json.wasm"), wasm);
  const moduleSha256 = createHash("sha256").update(wasm).digest("hex");

  writeFileSync(
    join(bin, "epoch-grammar.toml"),
    [
      `name = "grammar"`,
      "api = 1",
      `version = "1.0.0"`,
      `capabilities = ["syntax"]`,
      "",
      "[[provides]]",
      `capability = "syntax"`,
      `module = "grammar-json.wasm"`,
      `language = "json"`,
      `module_sha256 = "${options.declaredDigest ?? moduleSha256}"`,
      `extensions = [".json"]`,
    ].join("\n"),
    "utf8",
  );

  return { root, moduleSha256 };
}

interface Sink {
  stdout: { write(message: string): void };
  stderr: { write(message: string): void };
}

interface CapturedSink {
  readonly io: Sink;
  readonly err: () => string;
}

const io: Sink = { stdout: { write: () => true }, stderr: { write: () => true } };

function capture(): CapturedSink {
  let err = "";
  return {
    io: { stdout: { write: () => true }, stderr: { write: (message: string) => { err += message; return true; } } },
    err: () => err,
  };
}

function jsonProvider(root: string, sink: Sink = io): SyntaxProvider | undefined {
  return repositorySyntaxRegistry(root, sink).resolve<SyntaxProvider>("syntax", {
    language: "json",
    path: "a.json",
    forSignedState: true,
  })?.value;
}

/**
 * The claim ADR-0037 made and could not keep until now: a shipped provider
 * takes over a language from the builtin that had it.
 */
function aTrustedExtensionDisplacesABuiltin(): void {
  const { root } = workspace();
  try {
    // Before consent, the builtin owns JSON.
    assert.equal(jsonProvider(root)?.id, "epoch.syntax.json");

    runExtensionCommand(root, ["trust", "grammar"], io, { pathEntries: [] });

    const provider = jsonProvider(root);
    assert.equal(provider?.id, "grammar.syntax.json", "the extension's provider now owns the language");

    // And it is a real provider, not a registration: the tree comes from the
    // module, and its node kinds are the module's own.
    const tree = provider!.parse(`{"a":1}`);
    assert.equal(tree.root.kind, "grammar-object");
    assert.equal(tree.root.text, `{"a":1}`, "the host still supplies the text from its own source");
  } finally {
    rmSync(root, { force: true, recursive: true });
  }
}

/**
 * A provider runs inside an operation that produces signed evidence, so an
 * extension the operator has not consented to must not supply one — the same
 * rule Tier 1 dispatch applies, taken by the same policy.
 */
function anUntrustedExtensionSuppliesNothing(): void {
  const { root } = workspace();
  try {
    const sink = capture();
    assert.equal(jsonProvider(root, sink.io)?.id, "epoch.syntax.json");
    assert.match(sink.err(), /not trusted/u, "the reason is reported, not silent");
  } finally {
    rmSync(root, { force: true, recursive: true });
  }
}

/** Consent binds bytes here exactly as it does for an executable. */
function aSwappedModuleIsRefused(): void {
  const { root } = workspace();
  try {
    runExtensionCommand(root, ["trust", "grammar"], io, { pathEntries: [] });
    assert.equal(jsonProvider(root)?.id, "grammar.syntax.json");

    writeFileSync(
      join(root, ".epoch", "ext", "bin", "grammar-json.wasm"),
      buildSyntaxProviderModule({ result: fixtureTree("{}") }),
    );

    const sink = capture();
    assert.equal(jsonProvider(root, sink.io)?.id, "epoch.syntax.json", "the builtin takes the language back");
    assert.match(sink.err(), /does not match/u);
  } finally {
    rmSync(root, { force: true, recursive: true });
  }
}

/**
 * A module with no declared digest is a module nobody consented to, so the
 * manifest is refused rather than loaded with the binding left off.
 */
function aManifestMustBindEveryModuleItShips(): void {
  const declaration = [
    `name = "grammar"`,
    "api = 1",
    `version = "1.0.0"`,
    `capabilities = ["syntax"]`,
    "",
    "[[provides]]",
    `capability = "syntax"`,
    `module = "grammar-json.wasm"`,
    `language = "json"`,
  ].join("\n");
  assert.throws(() => parseExtensionManifest(declaration), /module_sha256/u);

  // A module name is a file beside the manifest, never a path out of it.
  assert.throws(
    () => parseExtensionManifest(declaration.replace("grammar-json.wasm", "../../../etc/evil.wasm")),
    /module/u,
  );

  // Tier 1 and Tier 2 are separated on exactly one line, and it is enforced.
  assert.throws(
    () => parseExtensionManifest(`${declaration}\nmodule_sha256 = "${"a".repeat(64)}"`
      .replace(`capability = "syntax"`, `capability = "command"`)),
    /Tier 1/u,
  );
}
