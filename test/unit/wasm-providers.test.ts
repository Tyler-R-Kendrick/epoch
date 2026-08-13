import assert from "node:assert/strict";
import {
  DEFAULT_WASM_LIMITS,
  instantiateWasmSyntaxModule,
  wasmSyntaxProvider,
  WasmProviderError,
} from "@epoch/extensions";
import { semanticDiff } from "@epoch/semantic";
import { buildSyntaxProviderModule } from "./wasm-fixture";

/**
 * The provider ABI is a boundary with untrusted code on the other side, so the
 * tests are about what the host refuses, not about what a cooperative module
 * returns (ADR-0041).
 */
export function runWasmProviderTests(): void {
  aWellFormedModuleParses();
  theHostReconstructsTextFromItsOwnSource();
  theModuleGetsNoCapabilities();
  malformedResultsAreRefused();
  malformedTreesAreRefused();
  multiByteOffsetsMapToCodeUnits();
  aWasmProviderIsInterchangeableWithABuiltin();
}

/** A tree for `{"a":1}` as a provider would report it, in UTF-8 byte offsets. */
function objectTree(source: string): string {
  return JSON.stringify({
    language: "json",
    root: {
      kind: "object",
      start: 0,
      end: Buffer.byteLength(source, "utf8"),
      commutative: true,
      separator: ",",
      children: [{ kind: "member", name: "a", start: 1, end: 6 }],
    },
  });
}

function moduleFor(source: string, overrides: Record<string, unknown> = {}) {
  return instantiateWasmSyntaxModule(
    buildSyntaxProviderModule({ result: objectTree(source), ...overrides }),
  );
}

function aWellFormedModuleParses(): void {
  const source = `{"a":1}`;
  const parsed = moduleFor(source).parse(source);

  assert.equal(parsed.language, "json");
  assert.equal(parsed.root.kind, "object");
  assert.equal(parsed.root.commutative, true);
  assert.equal(parsed.root.separator, ",");
  assert.equal(parsed.root.children.length, 1);
  assert.equal(parsed.root.children[0].name, "a");
}

/**
 * The module reports spans; the host supplies the text. A module therefore
 * cannot claim a span and a text that disagree, which is the invariant every
 * structural splice depends on (ADR-0038).
 */
function theHostReconstructsTextFromItsOwnSource(): void {
  const source = `{"a":1}`;
  const parsed = moduleFor(source).parse(source);

  assert.equal(parsed.root.text, source);
  assert.equal(parsed.root.children[0].text, source.slice(1, 6));
  assert.equal(parsed.root.children[0].text, `"a":1`);
}

/**
 * The module is instantiated with exactly one import — memory the host owns.
 * Anything it would need to reach the filesystem, a clock, or the network is
 * simply not present, which is why the sandbox cannot be escaped by finding a
 * flaw in code that withholds those capabilities.
 */
function theModuleGetsNoCapabilities(): void {
  const bytes = buildSyntaxProviderModule({ result: objectTree("{}") });
  const imports = WebAssembly.Module.imports(new WebAssembly.Module(bytes as BufferSource));

  assert.deepEqual(imports, [{ module: "env", name: "memory", kind: "memory" }]);

  // And the ceiling is the host's, enforced by the engine rather than by asking
  // the guest to behave.
  const memory = new WebAssembly.Memory({ initial: 1, maximum: DEFAULT_WASM_LIMITS.maximumPages });
  assert.throws(() => memory.grow(DEFAULT_WASM_LIMITS.maximumPages + 1), RangeError);
}

function malformedResultsAreRefused(): void {
  const source = "{}";

  // An ABI this build does not speak.
  assert.throws(
    () => instantiateWasmSyntaxModule(buildSyntaxProviderModule({ result: objectTree(source), abiVersion: 99 })),
    (error: unknown) => error instanceof WasmProviderError && error.code === "abi-mismatch",
  );

  // A module missing a required export.
  for (const omit of ["epoch_abi_version", "alloc", "parse"] as const) {
    assert.throws(
      () => instantiateWasmSyntaxModule(buildSyntaxProviderModule({ result: objectTree(source), omit })),
      (error: unknown) => error instanceof WasmProviderError && error.code === "missing-export",
      `omitting ${omit} must be refused`,
    );
  }

  // Bytes that are not WebAssembly at all.
  assert.throws(
    () => instantiateWasmSyntaxModule(new Uint8Array([1, 2, 3, 4])),
    (error: unknown) => error instanceof WasmProviderError && error.code === "instantiation-failed",
  );

  // A result claiming to extend past the end of guest memory.
  assert.throws(
    () => moduleFor(source, { overstateLength: 10_000_000 }).parse(source),
    (error: unknown) => error instanceof WasmProviderError && error.code === "out-of-bounds",
  );

  // A result that is not JSON.
  assert.throws(
    () => instantiateWasmSyntaxModule(buildSyntaxProviderModule({ result: "not json" })).parse(source),
    (error: unknown) => error instanceof WasmProviderError && error.code === "invalid-result",
  );
}

/**
 * Every tree defect is a refusal rather than a repair: a provider that reports
 * a span outside the source or children escaping their parent has produced a
 * tree that patching would splice wrongly, and a wrong patch is worse than a
 * missing one.
 */
function malformedTreesAreRefused(): void {
  const source = `{"a":1}`;
  const refuse = (root: unknown, why: string): void => {
    assert.throws(
      () => instantiateWasmSyntaxModule(
        buildSyntaxProviderModule({ result: JSON.stringify({ language: "json", root }) }),
      ).parse(source),
      (error: unknown) => error instanceof WasmProviderError && error.code === "invalid-tree",
      why,
    );
  };

  refuse({ kind: "", start: 0, end: 7 }, "an empty kind");
  refuse({ kind: "object", start: 0, end: 99 }, "a span past the end of the source");
  refuse({ kind: "object", start: 4, end: 2 }, "an inverted span");
  refuse({ kind: "object", start: 0, end: "7" }, "a non-integer span");
  refuse(
    { kind: "object", start: 0, end: 7, children: [{ kind: "member", start: 0, end: 99 }] },
    "a child escaping its parent",
  );
  refuse(
    {
      kind: "object",
      start: 0,
      end: 7,
      children: [{ kind: "member", start: 4, end: 6 }, { kind: "member", start: 1, end: 3 }],
    },
    "children out of order",
  );
  refuse({ kind: "object", start: 0, end: 7, name: 5 }, "a non-string name");
  refuse({ kind: "object", start: 0, end: 7, children: "nope" }, "non-array children");

  // Depth is bounded, so a module cannot exhaust the host stack.
  let deep: unknown = { kind: "leaf", start: 0, end: 7 };
  for (let level = 0; level < DEFAULT_WASM_LIMITS.maximumDepth + 2; level += 1) {
    deep = { kind: "wrap", start: 0, end: 7, children: [deep] };
  }
  refuse(deep, "a tree deeper than the limit");
}

/**
 * The guest works in UTF-8 bytes; `SyntaxNode` offsets index the JavaScript
 * string. The host converts, and rejects a boundary that lands inside a
 * character rather than rounding it into a wrong span.
 */
function multiByteOffsetsMapToCodeUnits(): void {
  const source = `{"é":1}`;                       // 'é' is two UTF-8 bytes
  const byteLength = Buffer.byteLength(source, "utf8");
  assert.notEqual(byteLength, source.length, "the fixture must actually be multi-byte");

  const tree = JSON.stringify({
    language: "json",
    root: {
      kind: "object",
      start: 0,
      end: byteLength,
      children: [{ kind: "member", name: "é", start: 1, end: byteLength - 1 }],
    },
  });
  const parsed = instantiateWasmSyntaxModule(buildSyntaxProviderModule({ result: tree })).parse(source);

  assert.equal(parsed.root.text, source);
  assert.equal(parsed.root.children[0].text, `"é":1`);

  // Byte 3 is the continuation byte of 'é'. A boundary there names no character
  // position at all, so it is refused rather than rounded to a wrong span.
  const split = JSON.stringify({
    language: "json",
    root: { kind: "object", start: 0, end: byteLength, children: [{ kind: "member", start: 3, end: 4 }] },
  });
  assert.throws(
    () => instantiateWasmSyntaxModule(buildSyntaxProviderModule({ result: split })).parse(source),
    (error: unknown) => error instanceof WasmProviderError && error.code === "invalid-tree",
  );
}

/**
 * The engine never learns where a provider came from. That is what keeps
 * `@epoch/semantic` browser-safe and lets one provider serve both surfaces.
 */
function aWasmProviderIsInterchangeableWithABuiltin(): void {
  const before = `{"a":1}`;
  const after = `{"a":2}`;
  const declaration = { id: "test.syntax.json", language: "json", extensions: [".json"] } as const;

  const provider = wasmSyntaxProvider(declaration, moduleFor(before));
  const tree = provider.parse(before);
  assert.equal(tree.providerId, "test.syntax.json");
  assert.equal(tree.source, before);

  // A diff runs over it with no knowledge that it came from WebAssembly.
  const patch = semanticDiff(provider.parse(before), wasmSyntaxProvider(declaration, moduleFor(after)).parse(after));
  assert.equal(patch.providerId, "test.syntax.json");
  assert.ok(patch.edits.length >= 1, "a changed member must produce at least one edit");
}
