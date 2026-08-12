import assert from "node:assert/strict";

/** Small deterministic generator for bounded conformance fuzzing. Not a CSPRNG. */
export class SeededGenerator {
  #state: number;

  constructor(readonly seed: number) {
    assert.ok(Number.isSafeInteger(seed) && seed >= 0, "seed must be a non-negative safe integer");
    this.#state = seed >>> 0;
  }

  next(): number {
    let value = this.#state || 0x6d2b79f5;
    value ^= value << 13;
    value ^= value >>> 17;
    value ^= value << 5;
    this.#state = value >>> 0;
    return this.#state;
  }

  integer(maxExclusive: number): number {
    assert.ok(Number.isSafeInteger(maxExclusive) && maxExclusive > 0, "bound must be a positive safe integer");
    return this.next() % maxExclusive;
  }

  boolean(): boolean { return (this.next() & 1) === 1; }

  bytes(length: number): Buffer {
    const result = Buffer.alloc(length);
    for (let index = 0; index < length; index += 1) result[index] = this.next() & 0xff;
    return result;
  }

  pick<T>(values: readonly T[]): T {
    assert.ok(values.length > 0, "cannot pick from an empty collection");
    return values[this.integer(values.length)]!;
  }
}

export function property(name: string, seed: number, cases: number, run: (generator: SeededGenerator, caseIndex: number) => void | Promise<void>): Promise<void> {
  return (async () => {
    for (let caseIndex = 0; caseIndex < cases; caseIndex += 1) {
      const caseSeed = (seed + Math.imul(caseIndex + 1, 0x9e3779b1)) >>> 0;
      try {
        await run(new SeededGenerator(caseSeed), caseIndex);
      } catch (error) {
        throw new Error(`${name} failed (seed=${seed}, case=${caseIndex}, caseSeed=${caseSeed}): ${String((error as Error).message ?? error)}`, { cause: error });
      }
    }
  })();
}

export function canonical(value: unknown): string {
  if (Array.isArray(value)) return `[${value.map(canonical).join(",")}]`;
  if (value !== null && typeof value === "object") {
    return `{${Object.entries(value as Record<string, unknown>)
      .sort(([left], [right]) => left.localeCompare(right))
      .map(([key, item]) => `${JSON.stringify(key)}:${canonical(item)}`).join(",")}}`;
  }
  return JSON.stringify(value);
}
