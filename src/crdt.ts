import { canonicalJson } from "./json";

export interface CRDTDefinition {
  readonly entityType: string;
  merge(base: unknown, left: unknown, right: unknown): unknown;
}

export class CRDTRegistry {
  private readonly definitions = new Map<string, CRDTDefinition>();

  static defaults(): CRDTRegistry {
    const registry = new CRDTRegistry();
    registry.register(new TextWeaveCRDT());
    registry.register(new JsonMapCRDT());
    return registry;
  }

  register(definition: CRDTDefinition): void {
    this.definitions.set(definition.entityType, definition);
  }

  merge(entityType: string, base: unknown, left: unknown, right: unknown): unknown {
    return (this.definitions.get(entityType) ?? { merge: threeWayMerge }).merge(base, left, right);
  }
}

export class TextWeaveCRDT implements CRDTDefinition {
  readonly entityType = "text/plain";

  merge(base: unknown, left: unknown, right: unknown): string {
    if (typeof base !== "string" || typeof left !== "string" || typeof right !== "string") {
      throw new TypeError("text/plain merges require string values");
    }
    if (left === right) return left;
    if (left === base) return right;
    if (right === base) return left;

    const baseLines = splitLines(base);
    const leftLines = splitLines(left);
    const rightLines = splitLines(right);
    const leftSet = new Set(leftLines);
    const rightSet = new Set(rightLines);
    const baseSet = new Set(baseLines);
    const merged: string[] = [];
    const seen = new Set<string>();

    const addOnce = (line: string): void => {
      if (!seen.has(line)) {
        seen.add(line);
        merged.push(line);
      }
    };

    for (const line of baseLines) {
      if (leftSet.has(line) || rightSet.has(line)) addOnce(line);
    }

    for (const line of [...leftLines, ...rightLines].filter((line) => !baseSet.has(line)).sort()) {
      addOnce(line);
    }

    const suffix = left.endsWith("\n") || right.endsWith("\n") ? "\n" : "";
    return `${merged.join("\n")}${suffix}`;
  }
}

export class JsonMapCRDT implements CRDTDefinition {
  readonly entityType = "application/json";

  merge(base: unknown, left: unknown, right: unknown): unknown {
    return this.mergeValue(base, left, right);
  }

  private mergeValue(base: unknown, left: unknown, right: unknown): unknown {
    if (same(left, right)) return left;
    if (same(left, base)) return right;
    if (same(right, base)) return left;

    if (isRecord(base) && isRecord(left) && isRecord(right)) {
      return this.mergeMap(base, left, right);
    }
    if (isRecord(left) && isRecord(right)) {
      return this.mergeMap({}, left, right);
    }

    return canonicalJson(left) <= canonicalJson(right) ? left : right;
  }

  private mergeMap(base: Record<string, unknown>, left: Record<string, unknown>, right: Record<string, unknown>): Record<string, unknown> {
    const merged: Record<string, unknown> = {};
    for (const key of [...new Set([...Object.keys(base), ...Object.keys(left), ...Object.keys(right)])].sort()) {
      const baseHas = Object.hasOwn(base, key);
      const leftHas = Object.hasOwn(left, key);
      const rightHas = Object.hasOwn(right, key);

      if (!leftHas && rightHas) {
        if (!same(right[key], base[key])) merged[key] = right[key];
      } else if (leftHas && !rightHas) {
        if (!same(left[key], base[key])) merged[key] = left[key];
      } else if (!baseHas) {
        merged[key] = this.mergeValue(null, left[key], right[key]);
      } else {
        merged[key] = this.mergeValue(base[key], left[key], right[key]);
      }
    }
    return merged;
  }
}

export function threeWayMerge(base: unknown, left: unknown, right: unknown): unknown {
  if (same(left, right)) return left;
  if (same(left, base)) return right;
  if (same(right, base)) return left;
  return canonicalJson(left) <= canonicalJson(right) ? left : right;
}

export function loadEntity(entityType: string, text: string): unknown {
  return entityType === "application/json" ? JSON.parse(text) : text;
}

export function dumpEntity(entityType: string, value: unknown): string {
  return entityType === "application/json" ? `${JSON.stringify(value, null, 2)}\n` : String(value);
}

function splitLines(text: string): string[] {
  const trimmed = text.endsWith("\n") ? text.slice(0, -1) : text;
  return trimmed === "" ? [] : trimmed.split("\n");
}

function same(left: unknown, right: unknown): boolean {
  return canonicalJson(left) === canonicalJson(right);
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}
