import * as Automerge from "@automerge/automerge";
import { canonicalJson } from "./json";

export interface CRDTDefinition {
  readonly entityType: string;
  merge(base: unknown, left: unknown, right: unknown): unknown;
}

export type CRDTOperation =
  | { kind: "map-set"; entity: string; key: string; value: unknown }
  | { kind: "map-delete"; entity: string; key: string }
  | { kind: "text-insert"; entity: string; value: string; index?: number }
  | { kind: "text-delete"; entity: string; index: number; count?: number };

export interface CRDTEvent {
  readonly id: string;
  readonly type: string;
  readonly author: string;
  readonly lamport: number;
  readonly payload: Record<string, unknown>;
}

interface AutomergePayload extends Record<string, unknown> {
  readonly backend: "automerge";
  readonly entity: string;
  readonly entity_kind: "map" | "text";
  readonly change_base64: string;
  readonly operation?: CRDTOperation;
}

type AutomergeDocument = {
  map: Record<string, unknown>;
  text: string;
};

const AUTOMERGE_BASE_ACTOR = "00000000000000000000000000000000";

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

export class CRDTEventLog {
  changeForOperation(events: readonly CRDTEvent[], operation: CRDTOperation, actorId: string): AutomergePayload {
    const document = Automerge.change(this.documentFor(events, actorId, operation.entity), { message: operation.kind }, (draft) => {
      applyOperation(draft, operation);
    });
    const change = Automerge.getLastLocalChange(document);
    if (change === undefined) throw new Error(`CRDT operation produced no Automerge change: ${operation.kind}`);
    return {
      backend: "automerge",
      entity: operation.entity,
      entity_kind: operation.kind.startsWith("text-") ? "text" : "map",
      change_base64: Buffer.from(change).toString("base64"),
      operation,
    };
  }

  materialize(events: readonly CRDTEvent[], entity: string): unknown {
    const payloads = this.payloadsFor(events, entity);
    const document = this.documentFor(events, AUTOMERGE_BASE_ACTOR, entity);
    if (payloads[0]?.entity_kind === "text") return document.text;
    return JSON.parse(JSON.stringify(document.map)) as Record<string, unknown>;
  }

  private documentFor(events: readonly CRDTEvent[], actorId = AUTOMERGE_BASE_ACTOR, entity?: string): Automerge.Doc<AutomergeDocument> {
    const document = loadBaseAutomergeDocument(actorId);
    const changes = events
      .filter((event) => event.type === "crdt")
      .sort(compareEvents)
      .flatMap((event) => {
        const payload = automergePayload(event.payload);
        if (entity !== undefined && payload?.entity !== entity) return [];
        return payload === undefined ? [] : [Buffer.from(payload.change_base64, "base64")];
      });
    return Automerge.applyChanges(document, changes)[0];
  }

  private payloadsFor(events: readonly CRDTEvent[], entity: string): AutomergePayload[] {
    return events
      .filter((event) => event.type === "crdt")
      .sort(compareEvents)
      .flatMap((event) => {
        const payload = automergePayload(event.payload);
        return payload?.entity === entity ? [payload] : [];
      });
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

function loadBaseAutomergeDocument(actorId: string): Automerge.Doc<AutomergeDocument> {
  return Automerge.load(Automerge.save(Automerge.from<AutomergeDocument>({
    map: {},
    text: "",
  }, { actor: AUTOMERGE_BASE_ACTOR })), { actor: actorId });
}

function applyOperation(document: Automerge.Doc<AutomergeDocument>, operation: CRDTOperation): void {
  switch (operation.kind) {
    case "map-set":
      document.map[operation.key] = operation.value;
      return;
    case "map-delete":
      delete document.map[operation.key];
      return;
    case "text-insert": {
      const index = clampIndex(operation.index ?? document.text.length, document.text.length);
      Automerge.splice(document, ["text"], index, 0, operation.value);
      return;
    }
    case "text-delete": {
      const index = clampIndex(operation.index, document.text.length);
      const count = Math.max(0, Math.min(operation.count ?? 1, document.text.length - index));
      Automerge.splice(document, ["text"], index, count);
      return;
    }
  }
}

function automergePayload(payload: Record<string, unknown>): AutomergePayload | undefined {
  if (
    payload.backend === "automerge"
    && typeof payload.entity === "string"
    && (payload.entity_kind === "map" || payload.entity_kind === "text")
    && typeof payload.change_base64 === "string"
  ) {
    return payload as unknown as AutomergePayload;
  }
  return undefined;
}

function clampIndex(index: number, length: number): number {
  if (!Number.isFinite(index)) return length;
  return Math.max(0, Math.min(Math.trunc(index), length));
}

// Lamport time captures causality; author and event ID make concurrent operations converge with a stable total order.
function compareEvents(left: CRDTEvent, right: CRDTEvent): number {
  const lamportDiff = left.lamport - right.lamport;
  if (lamportDiff !== 0) return lamportDiff;
  const authorDiff = compareStrings(left.author, right.author);
  if (authorDiff !== 0) return authorDiff;
  return compareStrings(left.id, right.id);
}

function compareStrings(left: string, right: string): number {
  return left < right ? -1 : left > right ? 1 : 0;
}
