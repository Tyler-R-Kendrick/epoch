import { CRuntime, CText, CValueMap, SendEvent } from "@collabs/collabs";
import { canonicalJson, isRecord, type JsonObject, type JsonValue } from "./json";
import { EntityType, MergeText, TextToken } from "./domain";
import type { EventPayload } from "./domain";
import { parseCanonicalId, parseChangeId } from "@epoch/protocol";
import type { CanonicalId } from "@epoch/protocol";

export interface CRDTDefinition {
  readonly entityType: string;
  merge(base: JsonValue, left: JsonValue, right: JsonValue): JsonValue;
}

export interface EntityAdapter extends CRDTDefinition {
  validate?(value: JsonValue): readonly string[];
  diff?(left: JsonValue, right: JsonValue): readonly string[];
  redact?(value: JsonValue, fields: readonly string[]): JsonValue;
  display?(value: JsonValue): string;
}

export interface CodeOperationContext {
  readonly changeId?: CanonicalId<"change">;
  readonly sessionId?: CanonicalId<"session">;
  /** Digest of private conversation content; raw prompts and transcripts stay outside signed history. */
  readonly conversationDigest?: string;
  readonly tool?: string;
}

interface CodeOperationBase {
  readonly entity: string;
  readonly context?: CodeOperationContext;
}

export type CodeOperation = CodeOperationBase & (
  | { readonly kind: "map-set"; readonly key: string; readonly value: JsonValue }
  | { readonly kind: "map-delete"; readonly key: string }
  | { readonly kind: "text-insert"; readonly value: string; readonly index?: number }
  | { readonly kind: "text-delete"; readonly index: number; readonly count?: number }
);

export interface CodeOperationRecord {
  readonly eventId: string;
  readonly author: string;
  readonly operation: CodeOperation;
}

export type CodeOperationFilter = Readonly<Partial<Pick<CodeOperationContext, "changeId" | "sessionId" | "conversationDigest">>>;

export interface CRDTEvent {
  readonly id: string;
  readonly type: string;
  readonly author: string;
  readonly lamport: number;
  readonly payload: EventPayload;
}

interface CollabsPayload extends EventPayload {
  readonly backend: "collabs";
  readonly entity: string;
  readonly entity_kind: "map" | "text";
  readonly messages_base64: string[];
  readonly operation?: CodeOperation;
}

interface CollabsDocument {
  readonly runtime: CRuntime;
  readonly map: CValueMap<string, JsonValue>;
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

  merge(entityType: string, base: JsonValue, left: JsonValue, right: JsonValue): JsonValue {
    return (this.definitions.get(entityType) ?? { merge: threeWayMerge }).merge(base, left, right);
  }
}

export class CRDTEventLog {
  changeForOperation(events: readonly CRDTEvent[], operation: CodeOperation, replicaID: string): CollabsPayload {
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

  materialize(events: readonly CRDTEvent[], entity: string): JsonValue {
    const payloads = this.payloadsFor(events, entity);
    const document = this.documentFor(events, "materializer", entity);
    if (payloads[0]?.entity_kind === "text") return document.text.toString();
    // SAFETY: Collabs map values are constrained to JsonValue and JSON round-tripping produces a JsonObject.
    return JSON.parse(JSON.stringify(Object.fromEntries(document.map.entries()))) as JsonObject;
  }

  operations(events: readonly CRDTEvent[], filter: CodeOperationFilter = {}): CodeOperationRecord[] {
    return events
      .filter((event) => event.type === "crdt")
      .sort(compareEvents)
      .flatMap((event) => {
        const operation = collabsPayload(event.payload)?.operation;
        if (operation === undefined || !matchesOperationFilter(operation.context, filter)) return [];
        return [{ eventId: event.id, author: event.author, operation }];
      });
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

  merge(base: JsonValue, left: JsonValue, right: JsonValue): string {
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

  merge(base: JsonValue, left: JsonValue, right: JsonValue): JsonValue {
    return this.mergeValue(base, left, right, MergeText.jsonPathRoot);
  }

  private mergeValue(base: JsonValue, left: JsonValue, right: JsonValue, path: string): JsonValue {
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
    base: JsonObject,
    left: JsonObject,
    right: JsonObject,
    path: string,
  ): JsonObject {
    const merged: JsonObject = {};
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

  merge(entityType: string, base: JsonValue, left: JsonValue, right: JsonValue): JsonValue {
    return (this.adapters.get(entityType) ?? { merge: threeWayMerge }).merge(base, left, right);
  }
}

export class CsvTableCRDT implements CRDTDefinition {
  readonly entityType = EntityType.csv;

  merge(base: JsonValue, left: JsonValue, right: JsonValue): string {
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

  diff(left: JsonValue, right: JsonValue): readonly string[] {
    if (!isString(left) || !isString(right)) return ["non-string CSV value"];
    const leftRows = parseCsvTable(left).rows;
    const rightRows = parseCsvTable(right).rows;
    const changes: string[] = [];
    for (const id of [...new Set([...leftRows.keys(), ...rightRows.keys()])].sort()) {
      if (!same(leftRows.get(id), rightRows.get(id))) changes.push(id);
    }
    return changes;
  }

  redact(value: JsonValue, fields: readonly string[]): string {
    if (!isString(value)) throw new TypeError("text/csv redaction requires string values");
    const table = parseCsvTable(value);
    const redactedIndexes = fields.map((field) => table.header.indexOf(field)).filter((index) => index >= 0);
    const rows = [...table.rows.values()].map((row) => row.map((cell, index) => redactedIndexes.includes(index) ? "[redacted]" : cell));
    return [table.header, ...rows].map((row) => row.join(TextToken.comma)).join(TextToken.newline) + TextToken.newline;
  }
}

export function threeWayMerge(base: JsonValue, left: JsonValue, right: JsonValue): JsonValue {
  if (same(left, right)) return left;
  if (same(left, base)) return right;
  if (same(right, base)) return left;
  throw new MergeConflictError(MergeText.jsonPathRoot);
}

export function loadEntity(entityType: string, text: string): JsonValue {
  return entityType === EntityType.json ? JSON.parse(text) : text;
}

export function dumpEntity(entityType: string, value: JsonValue): string {
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

function same<Value>(left: Value, right: Value): boolean {
  return canonicalJson(left) === canonicalJson(right);
}

function isString<Value>(value: Value): value is Value & string {
  return typeof value === "string";
}

function createCollabsDocument(replicaID: string): CollabsDocument {
  const runtime = new CRuntime({ debugReplicaID: replicaID, autoTransactions: "error" });
  return {
    runtime,
    map: runtime.registerCollab("map", (init) => new CValueMap<string, JsonValue>(init)),
    text: runtime.registerCollab("text", (init) => new CText(init)),
  };
}

function applyOperation(document: CollabsDocument, operation: CodeOperation): void {
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

export function validateCodeOperation(operation: CodeOperation): CodeOperation {
  if (operation.entity.length === 0 || operation.entity.length > 512) throw new TypeError("Code operation entity must contain 1-512 characters");
  const context = operation.context;
  if (context?.changeId !== undefined) parseChangeId(context.changeId);
  if (context?.sessionId !== undefined) parseCanonicalId(context.sessionId, "session");
  if (context?.conversationDigest !== undefined && !/^[a-f0-9]{64}$/u.test(context.conversationDigest)) {
    throw new TypeError("Code operation conversationDigest must be a lowercase SHA-256 digest");
  }
  if (context?.tool !== undefined && !/^[ -~]{1,128}$/u.test(context.tool)) {
    throw new TypeError("Code operation tool must be bounded printable ASCII");
  }
  return operation;
}

function matchesOperationFilter(context: CodeOperationContext | undefined, filter: CodeOperationFilter): boolean {
  return (filter.changeId === undefined || context?.changeId === filter.changeId)
    && (filter.sessionId === undefined || context?.sessionId === filter.sessionId)
    && (filter.conversationDigest === undefined || context?.conversationDigest === filter.conversationDigest);
}

function collabsPayload(payload: EventPayload): CollabsPayload | undefined {
  if (
    payload.backend === "collabs"
    && isString(payload.entity)
    && (payload.entity_kind === "map" || payload.entity_kind === "text")
    && Array.isArray(payload.messages_base64)
    && payload.messages_base64.every(isString)
  ) {
    // SAFETY: The checks above validate every required Collabs payload field.
    return payload as CollabsPayload;
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
