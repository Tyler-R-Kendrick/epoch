import { canonicalJson } from "./json";

export interface CRDTDefinition {
  readonly entityType: string;
  merge(base: unknown, left: unknown, right: unknown): unknown;
}

export class MergeConflictError extends Error {
  constructor(readonly path: string, message = `merge conflict at ${path}`) {
    super(message);
    this.name = "MergeConflictError";
  }
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
    const merged = mergeTextHunks(baseLines, diffLines(baseLines, splitLines(left)), diffLines(baseLines, splitLines(right)));

    const suffix = left.endsWith("\n") || right.endsWith("\n") ? "\n" : "";
    return `${merged.join("\n")}${suffix}`;
  }
}

export class JsonMapCRDT implements CRDTDefinition {
  readonly entityType = "application/json";

  merge(base: unknown, left: unknown, right: unknown): unknown {
    return this.mergeValue(base, left, right, "$");
  }

  private mergeValue(base: unknown, left: unknown, right: unknown, path: string): unknown {
    if (same(left, right)) return left;
    if (same(left, base)) return right;
    if (same(right, base)) return left;

    if (isRecord(base) && isRecord(left) && isRecord(right)) {
      return this.mergeMap(base, left, right, path);
    }
    if (isRecord(left) && isRecord(right)) {
      return this.mergeMap({}, left, right, path);
    }

    throw new MergeConflictError(path);
  }

  private mergeMap(
    base: Record<string, unknown>,
    left: Record<string, unknown>,
    right: Record<string, unknown>,
    path: string,
  ): Record<string, unknown> {
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
        merged[key] = this.mergeValue(null, left[key], right[key], `${path}.${key}`);
      } else {
        merged[key] = this.mergeValue(base[key], left[key], right[key], `${path}.${key}`);
      }
    }
    return merged;
  }
}

export function threeWayMerge(base: unknown, left: unknown, right: unknown): unknown {
  if (same(left, right)) return left;
  if (same(left, base)) return right;
  if (same(right, base)) return left;
  throw new MergeConflictError("$");
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

interface TextHunk {
  start: number;
  end: number;
  lines: string[];
}

function diffLines(base: string[], edited: string[]): TextHunk[] {
  const lcs = Array.from({ length: base.length + 1 }, () => Array<number>(edited.length + 1).fill(0));
  for (let i = base.length - 1; i >= 0; i -= 1) {
    for (let j = edited.length - 1; j >= 0; j -= 1) {
      lcs[i][j] = base[i] === edited[j] ? lcs[i + 1][j + 1] + 1 : Math.max(lcs[i + 1][j], lcs[i][j + 1]);
    }
  }

  const hunks: TextHunk[] = [];
  let i = 0;
  let j = 0;
  while (i < base.length || j < edited.length) {
    if (i < base.length && j < edited.length && base[i] === edited[j]) {
      i += 1;
      j += 1;
      continue;
    }

    const start = i;
    const lines: string[] = [];
    while (i < base.length || j < edited.length) {
      if (i < base.length && j < edited.length && base[i] === edited[j]) break;
      if (j < edited.length && (i === base.length || lcs[i][j + 1] >= lcs[i + 1][j])) {
        lines.push(edited[j]);
        j += 1;
      } else {
        i += 1;
      }
    }
    hunks.push({ start, end: i, lines });
  }
  return hunks;
}

function mergeTextHunks(base: string[], left: TextHunk[], right: TextHunk[]): string[] {
  const merged: string[] = [];
  let cursor = 0;
  let leftIndex = 0;
  let rightIndex = 0;

  while (leftIndex < left.length || rightIndex < right.length) {
    const nextStart = Math.min(left[leftIndex]?.start ?? Number.POSITIVE_INFINITY, right[rightIndex]?.start ?? Number.POSITIVE_INFINITY);
    merged.push(...base.slice(cursor, nextStart));

    const leftGroup: TextHunk[] = [];
    const rightGroup: TextHunk[] = [];
    let groupEnd = nextStart;
    let changed = true;
    while (changed) {
      changed = false;
      while (leftIndex < left.length && left[leftIndex].start <= groupEnd) {
        leftGroup.push(left[leftIndex]);
        groupEnd = Math.max(groupEnd, left[leftIndex].end);
        leftIndex += 1;
        changed = true;
      }
      while (rightIndex < right.length && right[rightIndex].start <= groupEnd) {
        rightGroup.push(right[rightIndex]);
        groupEnd = Math.max(groupEnd, right[rightIndex].end);
        rightIndex += 1;
        changed = true;
      }
    }

    const leftLines = replacementForSide(base, leftGroup, nextStart, groupEnd);
    const rightLines = replacementForSide(base, rightGroup, nextStart, groupEnd);
    if (leftGroup.length === 0) {
      merged.push(...rightLines);
    } else if (rightGroup.length === 0) {
      merged.push(...leftLines);
    } else if (same(leftLines, rightLines)) {
      merged.push(...leftLines);
    } else if ([...leftGroup, ...rightGroup].every((hunk) => hunk.start === hunk.end)) {
      merged.push(...leftLines, ...rightLines);
    } else {
      throw new MergeConflictError(formatLineRange(nextStart, groupEnd));
    }
    cursor = groupEnd;
  }

  merged.push(...base.slice(cursor));
  return merged;
}

function replacementForSide(base: string[], sideGroup: TextHunk[], start: number, end: number): string[] {
  if (sideGroup.length === 0) return base.slice(start, end);
  const lines: string[] = [];
  let cursor = start;
  for (const hunk of sideGroup.sort((left, right) => left.start - right.start || left.end - right.end)) {
    lines.push(...base.slice(cursor, hunk.start), ...hunk.lines);
    cursor = hunk.end;
  }
  lines.push(...base.slice(cursor, end));
  return lines;
}

function formatLineRange(start: number, end: number): string {
  const firstLine = start + 1;
  if (end <= start) return `insertion at line ${firstLine}`;
  return firstLine === end ? `line ${firstLine}` : `lines ${firstLine}-${end}`;
}

function same(left: unknown, right: unknown): boolean {
  return canonicalJson(left) === canonicalJson(right);
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}
