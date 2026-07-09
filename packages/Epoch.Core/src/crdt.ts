import { CRuntime, CText, CValueMap, SendEvent } from "@collabs/collabs";
import { canonicalJson, isRecord } from "./json";
import { EntityType, MergeText, TextToken } from "./domain";

export interface CRDTDefinition {
  readonly entityType: string;
  merge(base: unknown, left: unknown, right: unknown): unknown;
}

export interface EntityAdapter extends CRDTDefinition {
  validate?(value: unknown): readonly string[];
  diff?(left: unknown, right: unknown): readonly string[];
  redact?(value: unknown, fields: readonly string[]): unknown;
  display?(value: unknown): string;
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

interface CollabsPayload extends Record<string, unknown> {
  readonly backend: "collabs";
  readonly entity: string;
  readonly entity_kind: "map" | "text";
  readonly messages_base64: string[];
  readonly operation?: CRDTOperation;
}

interface CollabsDocument {
  readonly runtime: CRuntime;
  readonly map: CValueMap<string, unknown>;
  readonly text: CText;
}

export class MergeConflictError extends Error {
  constructor(readonly path: string, message = `merge conflict at ${path}`) {
    super(message);
    this.name = MergeText.conflictName;
  }
}

export class CRDTRegistry {
  private readonly definitions = new Map<string, CRDTDefinition>();

  static defaults(): CRDTRegistry {
    const registry = new CRDTRegistry();
    registry.register(new TextWeaveCRDT());
    registry.register(new JsonMapCRDT());
    registry.register(new CsvTableCRDT());
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
  changeForOperation(events: readonly CRDTEvent[], operation: CRDTOperation, replicaID: string): CollabsPayload {
    const document = this.documentFor(events, replicaID, operation.entity);
    const messages: Uint8Array[] = [];
    document.runtime.on("Send", (event: SendEvent) => messages.push(event.message));
    try {
      document.runtime.transact(() => applyOperation(document, operation));
    } catch (error) {
      throw new Error(`failed to apply CRDT operation ${operation.kind} for entity ${operation.entity}: ${error instanceof Error ? error.message : String(error)}`, { cause: error });
    }
    if (messages.length === 0) {
      throw new Error(`CRDT operation produced no Collabs message: ${operation.kind} for entity ${operation.entity}; check for no-op writes or unsupported entity configuration`);
    }
    return {
      backend: "collabs",
      entity: operation.entity,
      entity_kind: operation.kind.startsWith("text-") ? "text" : "map",
      messages_base64: messages.map((message) => Buffer.from(message).toString("base64")),
      operation,
    };
  }

  materialize(events: readonly CRDTEvent[], entity: string): unknown {
    const payloads = this.payloadsFor(events, entity);
    const document = this.documentFor(events, "materializer", entity);
    if (payloads[0]?.entity_kind === "text") return document.text.toString();
    return JSON.parse(JSON.stringify(Object.fromEntries(document.map.entries()))) as Record<string, unknown>;
  }

  private documentFor(events: readonly CRDTEvent[], replicaID: string, entity?: string): CollabsDocument {
    const document = createCollabsDocument(replicaID);
    const messages = events
      .filter((event) => event.type === "crdt")
      .sort(compareEvents)
      .flatMap((event) => {
        const payload = collabsPayload(event.payload);
        if (entity !== undefined && payload?.entity !== entity) return [];
        return payload === undefined ? [] : payload.messages_base64.map((message) => Buffer.from(message, "base64"));
      });
    document.runtime.batchRemoteUpdates(() => {
      for (const message of messages) document.runtime.receive(message);
    });
    return document;
  }

  private payloadsFor(events: readonly CRDTEvent[], entity: string): CollabsPayload[] {
    return events
      .filter((event) => event.type === "crdt")
      .sort(compareEvents)
      .flatMap((event) => {
        const payload = collabsPayload(event.payload);
        return payload?.entity === entity ? [payload] : [];
      });
  }
}

export class TextWeaveCRDT implements CRDTDefinition {
  readonly entityType = EntityType.plainText;

  merge(base: unknown, left: unknown, right: unknown): string {
    if (!isString(base) || !isString(left) || !isString(right)) {
      throw new TypeError(MergeText.textTypeError);
    }
    if (left === right) return left;
    if (left === base) return right;
    if (right === base) return left;

    const baseLines = splitLines(base);
    const merged = mergeTextHunks(baseLines, diffLines(baseLines, splitLines(left)), diffLines(baseLines, splitLines(right)));

    const suffix = left.endsWith(TextToken.newline) || right.endsWith(TextToken.newline) ? TextToken.newline : TextToken.empty;
    return `${merged.join(TextToken.newline)}${suffix}`;
  }
}

export class JsonMapCRDT implements CRDTDefinition {
  readonly entityType = EntityType.json;

  merge(base: unknown, left: unknown, right: unknown): unknown {
    return this.mergeValue(base, left, right, MergeText.jsonPathRoot);
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

export class EntityRegistry {
  private readonly adapters = new Map<string, EntityAdapter>();

  static defaults(): EntityRegistry {
    const registry = new EntityRegistry();
    registry.register(new TextWeaveCRDT());
    registry.register(new JsonMapCRDT());
    registry.register(new CsvTableCRDT());
    return registry;
  }

  register(adapter: EntityAdapter): void {
    this.adapters.set(adapter.entityType, adapter);
  }

  adapter(entityType: string): EntityAdapter {
    const adapter = this.adapters.get(entityType);
    if (adapter === undefined) throw new Error(`no entity adapter registered for ${entityType}`);
    return adapter;
  }

  merge(entityType: string, base: unknown, left: unknown, right: unknown): unknown {
    return (this.adapters.get(entityType) ?? { merge: threeWayMerge }).merge(base, left, right);
  }
}

export class CsvTableCRDT implements CRDTDefinition {
  readonly entityType = EntityType.csv;

  merge(base: unknown, left: unknown, right: unknown): string {
    if (!isString(base) || !isString(left) || !isString(right)) {
      throw new TypeError("text/csv merges require string values");
    }
    const baseTable = parseCsvTable(base);
    const leftTable = parseCsvTable(left);
    const rightTable = parseCsvTable(right);
    const header = leftTable.header.length > 0 ? leftTable.header : rightTable.header.length > 0 ? rightTable.header : baseTable.header;
    if (!same(header, baseTable.header) && baseTable.header.length > 0) throw new MergeConflictError("$.header");
    if (!same(header, rightTable.header) && rightTable.header.length > 0) throw new MergeConflictError("$.header");

    const rows = new Map<string, string[]>();
    for (const id of [...new Set([...baseTable.rows.keys(), ...leftTable.rows.keys(), ...rightTable.rows.keys()])].sort()) {
      const baseRow = baseTable.rows.get(id);
      const leftRow = leftTable.rows.get(id);
      const rightRow = rightTable.rows.get(id);
      const merged = mergeCsvRow(id, baseRow, leftRow, rightRow);
      if (merged !== undefined) rows.set(id, merged);
    }

    return [header, ...rows.values()].map((row) => row.join(TextToken.comma)).join(TextToken.newline) + TextToken.newline;
  }

  diff(left: unknown, right: unknown): readonly string[] {
    if (!isString(left) || !isString(right)) return ["non-string CSV value"];
    const leftRows = parseCsvTable(left).rows;
    const rightRows = parseCsvTable(right).rows;
    const changes: string[] = [];
    for (const id of [...new Set([...leftRows.keys(), ...rightRows.keys()])].sort()) {
      if (!same(leftRows.get(id), rightRows.get(id))) changes.push(id);
    }
    return changes;
  }

  redact(value: unknown, fields: readonly string[]): string {
    if (!isString(value)) throw new TypeError("text/csv redaction requires string values");
    const table = parseCsvTable(value);
    const redactedIndexes = fields.map((field) => table.header.indexOf(field)).filter((index) => index >= 0);
    const rows = [...table.rows.values()].map((row) => row.map((cell, index) => redactedIndexes.includes(index) ? "[redacted]" : cell));
    return [table.header, ...rows].map((row) => row.join(TextToken.comma)).join(TextToken.newline) + TextToken.newline;
  }
}

export function threeWayMerge(base: unknown, left: unknown, right: unknown): unknown {
  if (same(left, right)) return left;
  if (same(left, base)) return right;
  if (same(right, base)) return left;
  throw new MergeConflictError(MergeText.jsonPathRoot);
}

export function loadEntity(entityType: string, text: string): unknown {
  return entityType === EntityType.json ? JSON.parse(text) : text;
}

export function dumpEntity(entityType: string, value: unknown): string {
  return entityType === EntityType.json ? `${JSON.stringify(value, null, 2)}\n` : String(value);
}

function splitLines(text: string): string[] {
  const trimmed = text.endsWith(TextToken.newline) ? text.slice(0, -1) : text;
  return trimmed === TextToken.empty ? [] : trimmed.split(TextToken.newline);
}

interface CsvTable {
  readonly header: string[];
  readonly rows: Map<string, string[]>;
}

function parseCsvTable(text: string): CsvTable {
  const lines = splitLines(text).filter((line) => line.length > 0);
  const header = lines.length === 0 ? [] : lines[0].split(TextToken.comma);
  const rows = new Map<string, string[]>();
  for (const line of lines.slice(1)) {
    const row = line.split(TextToken.comma);
    if (row[0] !== undefined && row[0].length > 0) rows.set(row[0], row);
  }
  return { header, rows };
}

function mergeCsvRow(id: string, base: string[] | undefined, left: string[] | undefined, right: string[] | undefined): string[] | undefined {
  if (same(left, right)) return left;
  if (same(left, base)) return right;
  if (same(right, base)) return left;
  if (base === undefined && left === undefined) return right;
  if (base === undefined && right === undefined) return left;
  if (left === undefined && right === undefined) return undefined;
  throw new MergeConflictError(`$.${id}`);
}

export interface TextHunk {
  start: number;
  end: number;
  lines: string[];
}

export function diffLines(base: string[], edited: string[]): TextHunk[] {
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

function isString(value: unknown): value is string {
  return typeof value === "string";
}

function createCollabsDocument(replicaID: string): CollabsDocument {
  const runtime = new CRuntime({ debugReplicaID: replicaID, autoTransactions: "error" });
  return {
    runtime,
    map: runtime.registerCollab("map", (init) => new CValueMap<string, unknown>(init)),
    text: runtime.registerCollab("text", (init) => new CText(init)),
  };
}

function applyOperation(document: CollabsDocument, operation: CRDTOperation): void {
  switch (operation.kind) {
    case "map-set":
      document.map.set(operation.key, operation.value);
      return;
    case "map-delete":
      document.map.delete(operation.key);
      return;
    case "text-insert": {
      const index = operationIndex(operation.index, document.text.length, document.text.length);
      document.text.insert(index, operation.value);
      return;
    }
    case "text-delete": {
      const index = operationIndex(operation.index, document.text.length, document.text.length);
      const count = Math.max(0, Math.min(operation.count ?? 1, document.text.length - index));
      if (count > 0) document.text.delete(index, count);
      return;
    }
  }
}

function collabsPayload(payload: Record<string, unknown>): CollabsPayload | undefined {
  if (
    payload.backend === "collabs"
    && typeof payload.entity === "string"
    && (payload.entity_kind === "map" || payload.entity_kind === "text")
    && Array.isArray(payload.messages_base64)
    && payload.messages_base64.every((message) => typeof message === "string")
  ) {
    return payload as unknown as CollabsPayload;
  }
  return undefined;
}

/**
 * Clamps an operation index to valid text bounds.
 *
 * Non-finite values default to the end of the text; finite values are truncated and clamped to [0, length].
 */
function clampIndex(index: number, length: number): number {
  if (!Number.isFinite(index)) return length;
  return Math.max(0, Math.min(Math.trunc(index), length));
}

/**
 * Resolves optional operation indices before bounds validation.
 *
 * Undefined indices use the provided fallback, then delegate to `clampIndex` for final text bounds.
 */
function operationIndex(index: number | undefined, fallback: number, length: number): number {
  return clampIndex(index ?? fallback, length);
}

/**
 * Orders events for deterministic CRDT replay across replicas.
 *
 * Returns a negative value when `left` sorts before `right`, zero when they are equivalent for ordering,
 * and a positive value when `left` sorts after `right`. Lamport time captures causality; author and event
 * ID provide stable tie-breaking for concurrent events. Every replica must use this exact total order when
 * replaying Collabs messages so materialized views converge.
 */
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
