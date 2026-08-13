import { node, type SyntaxNode, type SyntaxProvider, type SyntaxTree } from "@epoch/semantic";

/**
 * WebAssembly capability providers (ADR-0041).
 *
 * A provider is a module instantiated with one import: memory the host owns and
 * caps. It has no clock, no entropy, no filesystem, and no network, because
 * nothing in its environment offers them. That is the only kind of sandbox that
 * does not eventually leak — a capability that is absent cannot be reached by
 * finding a hole in the code that withholds it.
 *
 * The host, not the module, reconstructs each node's `text` from the source it
 * supplied. A module therefore cannot claim a span and a text that disagree,
 * which is the ADR-0038 invariant every downstream splice depends on.
 */

export const WASM_PROVIDER_ABI_VERSION = 1;

/** 64 KiB, the WebAssembly page size. */
const PAGE_BYTES = 65_536;

export interface WasmProviderLimits {
  /** Hard ceiling on guest memory. Recorded in the provider descriptor. */
  readonly maximumPages: number;
  /** Nodes a single parse may return, before the tree is refused. */
  readonly maximumNodes: number;
  /** Tree depth a single parse may return. */
  readonly maximumDepth: number;
}

export const DEFAULT_WASM_LIMITS: WasmProviderLimits = {
  maximumPages: 256,
  maximumNodes: 500_000,
  maximumDepth: 512,
};

export type WasmProviderErrorCode =
  | "instantiation-failed"
  | "missing-export"
  | "abi-mismatch"
  | "allocation-failed"
  | "out-of-bounds"
  | "invalid-result"
  | "invalid-tree";

export class WasmProviderError extends Error {
  constructor(readonly code: WasmProviderErrorCode, message: string) {
    super(message);
    this.name = "WasmProviderError";
  }
}

interface GuestExports {
  readonly epoch_abi_version: () => number;
  readonly alloc: (length: number) => number;
  readonly parse: (pointer: number, length: number) => number;
}

function requireFunction(exports: WebAssembly.Exports, name: string): (...args: number[]) => number {
  const value = exports[name];
  if (typeof value !== "function") {
    throw new WasmProviderError("missing-export", `provider module does not export '${name}'`);
  }
  return value as (...args: number[]) => number;
}

/**
 * Map UTF-8 byte offsets to UTF-16 code-unit offsets.
 *
 * The guest sees bytes; `SyntaxNode` offsets index the JavaScript string. For
 * all-ASCII sources the two coincide and the table is skipped, which is the
 * common case; otherwise one entry per byte is built so a boundary landing
 * inside a code point can be rejected rather than silently rounded.
 */
function byteToUnitOffsets(source: string, byteLength: number): Int32Array | undefined {
  if (byteLength === source.length) return undefined;
  const table = new Int32Array(byteLength + 1).fill(-1);
  let byte = 0;
  for (let unit = 0; unit < source.length;) {
    const code = source.codePointAt(unit) ?? 0;
    table[byte] = unit;
    byte += code < 0x80 ? 1 : code < 0x800 ? 2 : code < 0x10000 ? 3 : 4;
    unit += code >= 0x10000 ? 2 : 1;
  }
  table[byteLength] = source.length;
  return table;
}

/** A parsed provider module, reusable across many `parse` calls. */
export interface WasmSyntaxModule {
  readonly abiVersion: number;
  readonly limits: WasmProviderLimits;
  parse(source: string): { readonly language?: string; readonly root: SyntaxNode };
}

/**
 * Instantiate a provider module.
 *
 * Synchronous instantiation keeps the provider usable from the existing
 * synchronous `SyntaxProvider.parse` contract. `WebAssembly.Module` compilation
 * is the expensive step and is done once per module, not once per parse.
 */
export function instantiateWasmSyntaxModule(
  moduleBytes: Uint8Array | ArrayBuffer,
  limits: WasmProviderLimits = DEFAULT_WASM_LIMITS,
): WasmSyntaxModule {
  // The host owns the memory so the ceiling is enforced by the engine rather
  // than by asking the module to behave. This is the module's only import.
  const memory = new WebAssembly.Memory({ initial: 1, maximum: limits.maximumPages });

  let instance: WebAssembly.Instance;
  try {
    // `BufferSource` is the engine's own parameter type; it stays inside this
    // module so the exported signature does not drag a DOM type into callers.
    instance = new WebAssembly.Instance(
      new WebAssembly.Module(moduleBytes as BufferSource),
      { env: { memory } },
    );
  } catch (error) {
    throw new WasmProviderError(
      "instantiation-failed",
      `provider module could not be instantiated: ${error instanceof Error ? error.message : String(error)}`,
    );
  }

  const guest: GuestExports = {
    epoch_abi_version: requireFunction(instance.exports, "epoch_abi_version"),
    alloc: requireFunction(instance.exports, "alloc") as (length: number) => number,
    parse: requireFunction(instance.exports, "parse") as (pointer: number, length: number) => number,
  };

  const abiVersion = guest.epoch_abi_version();
  if (abiVersion !== WASM_PROVIDER_ABI_VERSION) {
    throw new WasmProviderError(
      "abi-mismatch",
      `provider module targets ABI ${abiVersion}; this build speaks ${WASM_PROVIDER_ABI_VERSION}`,
    );
  }

  const view = (): DataView => new DataView(memory.buffer);
  const bytes = (): Uint8Array => new Uint8Array(memory.buffer);

  return {
    abiVersion,
    limits,
    parse(source: string) {
      const encoded = new TextEncoder().encode(source);
      const inputPointer = guest.alloc(encoded.byteLength);
      if (inputPointer <= 0 && encoded.byteLength > 0) {
        throw new WasmProviderError("allocation-failed", "provider module refused to allocate input");
      }
      // Re-read the buffer after every call into the guest: `memory.grow`
      // detaches the previous ArrayBuffer, and a stale view writes nowhere.
      requireRange(inputPointer, encoded.byteLength, memory.buffer.byteLength);
      bytes().set(encoded, inputPointer);

      const resultPointer = guest.parse(inputPointer, encoded.byteLength);
      requireRange(resultPointer, 8, memory.buffer.byteLength);
      const outputPointer = view().getUint32(resultPointer, true);
      const outputLength = view().getUint32(resultPointer + 4, true);
      requireRange(outputPointer, outputLength, memory.buffer.byteLength);

      const json = new TextDecoder("utf-8", { fatal: true }).decode(
        bytes().subarray(outputPointer, outputPointer + outputLength),
      );
      return decodeTree(json, source, encoded.byteLength, limits);
    },
  };
}

function requireRange(pointer: number, length: number, capacity: number): void {
  if (!Number.isInteger(pointer) || !Number.isInteger(length) || pointer < 0 || length < 0
    || pointer + length > capacity) {
    throw new WasmProviderError(
      "out-of-bounds",
      `provider module returned a range outside its memory: ${pointer}+${length} of ${capacity}`,
    );
  }
}

interface RawNode {
  readonly kind?: unknown;
  readonly name?: unknown;
  readonly start?: unknown;
  readonly end?: unknown;
  readonly children?: unknown;
  readonly commutative?: unknown;
  readonly separator?: unknown;
}

/**
 * Decode and validate the guest's tree.
 *
 * Everything here is a refusal rather than a repair. A provider that reports a
 * span outside the source, children escaping their parent, or siblings out of
 * order has produced a tree that structural patching would splice incorrectly,
 * and a wrong patch is worse than a missing one.
 */
function decodeTree(
  json: string,
  source: string,
  byteLength: number,
  limits: WasmProviderLimits,
): { readonly language?: string; readonly root: SyntaxNode } {
  let parsed: unknown;
  try {
    parsed = JSON.parse(json);
  } catch (error) {
    throw new WasmProviderError(
      "invalid-result",
      `provider module returned malformed JSON: ${error instanceof Error ? error.message : String(error)}`,
    );
  }
  if (typeof parsed !== "object" || parsed === null || Array.isArray(parsed)) {
    throw new WasmProviderError("invalid-result", "provider result must be a JSON object");
  }

  const record = parsed as { readonly language?: unknown; readonly root?: unknown };
  const offsets = byteToUnitOffsets(source, byteLength);
  const toUnit = (byte: number): number => {
    if (offsets === undefined) return byte;
    const unit = offsets[byte];
    if (unit === undefined || unit < 0) {
      throw new WasmProviderError("invalid-tree", `offset ${byte} does not fall on a character boundary`);
    }
    return unit;
  };

  let nodes = 0;
  const build = (raw: unknown, depth: number, lowerBound: number, upperBound: number): SyntaxNode => {
    if (depth > limits.maximumDepth) {
      throw new WasmProviderError("invalid-tree", `tree exceeds the depth limit of ${limits.maximumDepth}`);
    }
    if ((nodes += 1) > limits.maximumNodes) {
      throw new WasmProviderError("invalid-tree", `tree exceeds the node limit of ${limits.maximumNodes}`);
    }
    if (typeof raw !== "object" || raw === null || Array.isArray(raw)) {
      throw new WasmProviderError("invalid-tree", "every node must be a JSON object");
    }
    const value = raw as RawNode;
    if (typeof value.kind !== "string" || value.kind.length === 0) {
      throw new WasmProviderError("invalid-tree", "every node needs a non-empty 'kind'");
    }
    if (!Number.isInteger(value.start) || !Number.isInteger(value.end)) {
      throw new WasmProviderError("invalid-tree", `node '${value.kind}' needs integer 'start' and 'end'`);
    }
    const startByte = value.start as number;
    const endByte = value.end as number;
    if (startByte < 0 || endByte < startByte || endByte > byteLength) {
      throw new WasmProviderError("invalid-tree", `node '${value.kind}' spans ${startByte}..${endByte}, outside the source`);
    }
    const start = toUnit(startByte);
    const end = toUnit(endByte);
    if (start < lowerBound || end > upperBound) {
      throw new WasmProviderError("invalid-tree", `node '${value.kind}' escapes its parent's span`);
    }

    const rawChildren = value.children ?? [];
    if (!Array.isArray(rawChildren)) {
      throw new WasmProviderError("invalid-tree", `node '${value.kind}' has a non-array 'children'`);
    }
    const children: SyntaxNode[] = [];
    let cursor = start;
    for (const child of rawChildren) {
      const built = build(child, depth + 1, cursor, end);
      // Ordered and non-overlapping, because diff pairs children positionally
      // and patch splices their spans independently.
      if (built.start < cursor) {
        throw new WasmProviderError("invalid-tree", `children of '${value.kind}' overlap or are out of order`);
      }
      cursor = built.end;
      children.push(built);
    }

    if (value.name !== undefined && typeof value.name !== "string") {
      throw new WasmProviderError("invalid-tree", `node '${value.kind}' has a non-string 'name'`);
    }
    if (value.separator !== undefined && typeof value.separator !== "string") {
      throw new WasmProviderError("invalid-tree", `node '${value.kind}' has a non-string 'separator'`);
    }

    return node(value.kind, source, start, end, {
      name: typeof value.name === "string" ? value.name : undefined,
      children,
      commutative: value.commutative === true ? true : undefined,
      separator: typeof value.separator === "string" ? value.separator : undefined,
    });
  };

  return {
    language: typeof record.language === "string" ? record.language : undefined,
    root: build(record.root, 0, 0, source.length),
  };
}

export interface WasmProviderDeclaration {
  readonly id: string;
  readonly language: string;
  readonly extensions: readonly string[];
  readonly mimeTypes?: readonly string[];
  readonly fidelity?: "grammar" | "heuristic";
}

/**
 * Adapt an instantiated module to the `SyntaxProvider` the engine consumes.
 *
 * The engine never learns that a provider came from WebAssembly, which is what
 * keeps `@epoch/semantic` browser-safe and lets one provider serve the CLI and
 * the Community Web surface alike.
 */
export function wasmSyntaxProvider(
  declaration: WasmProviderDeclaration,
  module: WasmSyntaxModule,
): SyntaxProvider {
  return {
    id: declaration.id,
    language: declaration.language,
    extensions: declaration.extensions,
    mimeTypes: declaration.mimeTypes ?? [],
    fidelity: declaration.fidelity ?? "grammar",
    parse(source: string): SyntaxTree {
      const result = module.parse(source);
      return {
        providerId: declaration.id,
        language: result.language ?? declaration.language,
        source,
        root: result.root,
      };
    },
  };
}

/** Pages a limit expresses, in bytes. Reported so a descriptor is legible. */
export function limitBytes(limits: WasmProviderLimits): number {
  return limits.maximumPages * PAGE_BYTES;
}
