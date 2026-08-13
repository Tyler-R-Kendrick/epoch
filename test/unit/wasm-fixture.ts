/**
 * A hand-assembled WebAssembly provider module, used to exercise the real
 * engine rather than a stub of it (ADR-0041).
 *
 * The tests that matter here are about what the host does with a module it did
 * not write — bounds, ABI mismatches, malformed trees — so the module under
 * test has to be genuine WebAssembly instantiated by the real engine. Building
 * one from bytes keeps that honest without adding a toolchain to the repository.
 */

const SECTION = {
  type: 1,
  import: 2,
  function: 3,
  export: 7,
  code: 10,
  data: 11,
} as const;

const TYPE = { i32: 0x7f, func: 0x60 } as const;

/** LEB128, unsigned. WebAssembly encodes every length and index this way. */
function uleb(value: number): number[] {
  const out: number[] = [];
  let remaining = value;
  do {
    let byte = remaining & 0x7f;
    remaining >>>= 7;
    if (remaining !== 0) byte |= 0x80;
    out.push(byte);
  } while (remaining !== 0);
  return out;
}

function vector(items: readonly (readonly number[])[]): number[] {
  return [...uleb(items.length), ...items.flat()];
}

function section(id: number, payload: readonly number[]): number[] {
  return [id, ...uleb(payload.length), ...payload];
}

function name(text: string): number[] {
  const bytes = [...new TextEncoder().encode(text)];
  return [...uleb(bytes.length), ...bytes];
}

export interface FixtureOptions {
  /** Value returned by `epoch_abi_version`. Non-1 exercises the ABI check. */
  readonly abiVersion?: number;
  /** JSON the module returns from `parse`, verbatim. */
  readonly result: string;
  /** Omit an export to exercise the missing-export path. */
  readonly omit?: "epoch_abi_version" | "alloc" | "parse";
  /** Report a result length longer than the data, to exercise bounds checks. */
  readonly overstateLength?: number;
  /** Return this from `alloc` instead of the arena, to exercise refusals. */
  readonly allocReturns?: number;
  /** Number of `wrap` nodes to bury the tree under, to exercise node limits. */
  readonly wrapDepth?: number;
}

/**
 * Input arena, and the space before the result record.
 *
 * `alloc` always hands back the same address, so a source longer than this
 * would overwrite the result the fixture is about to return. Asserted rather
 * than commented, so a later test that outgrows the arena fails saying so
 * instead of producing a confusing bounds error.
 */
const INPUT_AT = 64;
const RECORD_AT = 1016;
const RESULT_AT = 1024;
const INPUT_CAPACITY = RECORD_AT - INPUT_AT;

/**
 * Build a provider module that returns a fixed tree.
 *
 * Layout: the result JSON is written at offset 1024 by a data segment, and the
 * 8-byte `{pointer, length}` record `parse` returns lives at offset 1016. The
 * guest ignores its input, which is fine — the host contract under test is the
 * boundary, not the parsing.
 */
export function buildSyntaxProviderModule(options: FixtureOptions): Uint8Array {
  if (byteLengthOf(options.result) > 65_536 - RESULT_AT) {
    throw new Error("fixture result does not fit in the module's first page");
  }
  const resultBytes = [...new TextEncoder().encode(options.result)];
  const declaredLength = options.overstateLength ?? resultBytes.length;

  // () -> i32   and   (i32) -> i32   and   (i32, i32) -> i32
  const types = vector([
    [TYPE.func, ...uleb(0), ...uleb(1), TYPE.i32],
    [TYPE.func, ...uleb(1), TYPE.i32, ...uleb(1), TYPE.i32],
    [TYPE.func, ...uleb(2), TYPE.i32, TYPE.i32, ...uleb(1), TYPE.i32],
  ]);

  // The single import: memory the host owns, so the host caps it.
  const imports = vector([[...name("env"), ...name("memory"), 0x02, 0x00, ...uleb(1)]]);

  const functions = vector([uleb(0), uleb(1), uleb(2)]);

  const exported: (readonly number[])[] = [];
  if (options.omit !== "epoch_abi_version") exported.push([...name("epoch_abi_version"), 0x00, ...uleb(0)]);
  if (options.omit !== "alloc") exported.push([...name("alloc"), 0x00, ...uleb(1)]);
  if (options.omit !== "parse") exported.push([...name("parse"), 0x00, ...uleb(2)]);
  exported.push([...name("memory"), 0x02, ...uleb(0)]);
  const exports = vector(exported);

  const i32const = (value: number): number[] => [0x41, ...sleb(value)];
  const end = 0x0b;

  // epoch_abi_version() -> i32
  const abiBody = [...uleb(0), ...i32const(options.abiVersion ?? 1), end];
  // alloc(len) -> i32: a bump allocator that always hands back the input arena.
  const allocBody = [...uleb(0), ...i32const(options.allocReturns ?? INPUT_AT), end];
  // parse(ptr, len) -> i32: write the record, return its address.
  const parseBody = [
    ...uleb(0),
    ...i32const(RECORD_AT), ...i32const(RESULT_AT), 0x36, 0x02, 0x00, // i32.store
    ...i32const(RECORD_AT + 4), ...i32const(declaredLength), 0x36, 0x02, 0x00,
    ...i32const(RECORD_AT),
    end,
  ];

  const code = vector([
    [...uleb(abiBody.length), ...abiBody],
    [...uleb(allocBody.length), ...allocBody],
    [...uleb(parseBody.length), ...parseBody],
  ]);

  const data = vector([[0x00, ...i32const(RESULT_AT), end, ...uleb(resultBytes.length), ...resultBytes]]);

  return new Uint8Array([
    0x00, 0x61, 0x73, 0x6d, 0x01, 0x00, 0x00, 0x00,
    ...section(SECTION.type, types),
    ...section(SECTION.import, imports),
    ...section(SECTION.function, functions),
    ...section(SECTION.export, exports),
    ...section(SECTION.code, code),
    ...section(SECTION.data, data),
  ]);
}

/** LEB128, signed. `i32.const` takes a signed immediate. */
function sleb(value: number): number[] {
  const out: number[] = [];
  let remaining = value;
  for (;;) {
    const byte = remaining & 0x7f;
    remaining >>= 7;
    const signBit = (byte & 0x40) !== 0;
    if ((remaining === 0 && !signBit) || (remaining === -1 && signBit)) {
      out.push(byte);
      return out;
    }
    out.push(byte | 0x80);
  }
}

/** Bytes a string occupies, for the arena assertions above. */
function byteLengthOf(text: string): number {
  return new TextEncoder().encode(text).length;
}

/** The largest source a fixture module can be given before it self-overwrites. */
export const FIXTURE_INPUT_CAPACITY = INPUT_CAPACITY;
