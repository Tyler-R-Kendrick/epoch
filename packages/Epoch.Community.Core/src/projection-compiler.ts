import { validateObjectRef, validateProjectionId } from "./identity";
import type { CommunityFieldValue } from "./entity";
import type { SearchExpression, SearchOrder } from "./search-expression";
import {
  PROJECTION_DEFINITION_API_VERSION,
  type CompiledProjection,
  type ProjectionCollisionCandidate,
  type ProjectionCompileContext,
  type ProjectionDefinition,
  type ProjectionDiagnostic,
  type ProjectionNode,
  type ProjectionOccurrenceIdentity,
  type RenderedSegment,
  type ResolvedProjectionCollision,
  type SegmentTemplate,
} from "./projection-definition";

const NODE_ID = /^[A-Za-z0-9][A-Za-z0-9._~-]{0,127}$/u;
const FIELD = /^[A-Za-z][A-Za-z0-9._-]{0,127}$/u;
const FUNCTIONS = new Set(["slug", "shortId", "date", "lower", "upper", "coalesce", "pad", "truncate", "replace"]);
const RECOVERY_SEGMENT = ".epoch";
const RELATIONS = new Set(["reply", "quote", "mention", "provenance", "promotion", "replacement", "moderation", "attachment", "backlink"]);
const OBJECT_KINDS = new Set([
  "message", "thread", "channel", "dm", "notification", "projection", "project", "issue", "change", "member", "agent", "artifact", "tombstone",
]);

export class ProjectionCompileError extends Error {
  readonly code = "PROJECTION_INVALID";
  constructor(readonly diagnostics: readonly ProjectionDiagnostic[]) {
    super(`PROJECTION_INVALID: ${diagnostics.map((item) => `${item.pointer}: ${item.message}`).join("; ")}`);
  }
}

export function compileProjectionDefinition(
  definition: ProjectionDefinition,
  context: ProjectionCompileContext,
): CompiledProjection {
  const diagnostics: ProjectionDiagnostic[] = [];
  const fields = new Set(context.fields);
  const sortable = new Set(context.sortableFields);
  const nodeIds = new Set<string>();
  const active = new Set<object>();
  let nodeCount = 0;
  let maximumDepth = 0;
  let estimatedFanout = 1;

  if (definition.apiVersion !== PROJECTION_DEFINITION_API_VERSION) problem(diagnostics, "PROJECTION_INVALID", "/apiVersion", "Unsupported projection API version");
  try { validateDefinitionId(definition.projectionId); } catch (error) { problem(diagnostics, "PROJECTION_INVALID", "/projectionId", message(error)); }
  if (!Number.isInteger(definition.version) || definition.version < 1) problem(diagnostics, "PROJECTION_INVALID", "/version", "Version must be a positive integer");
  if (definition.label.trim().length === 0 || definition.label.length > 160) problem(diagnostics, "PROJECTION_INVALID", "/label", "Label must be non-empty and at most 160 characters");
  if (!["private", "shared", "public"].includes(definition.visibility)) problem(diagnostics, "PROJECTION_INVALID", "/visibility", "Unsupported projection visibility");
  if (!["live", "queued", "snapshot"].includes(definition.updateMode)) problem(diagnostics, "PROJECTION_INVALID", "/updateMode", "Unsupported update mode");
  if (!["current", "session-snapshot", "fixed-snapshot"].includes(definition.consistency)) problem(diagnostics, "PROJECTION_INVALID", "/consistency", "Unsupported consistency mode");
  validateLimits(context, diagnostics);
  validateDefinitionLimits(definition, context, diagnostics);
  for (const field of ["kind", "objectId"]) if (!fields.has(field) || !sortable.has(field)) {
    problem(diagnostics, "PROJECTION_UNSTABLE_ORDER", "/order", `Canonical tie-breaker ${field} must be visible and sortable`);
  }
  validateOrders(definition.order, "/order", fields, sortable, diagnostics);

  const visit = (node: ProjectionNode, pointer: string, depth: number, isRoot = false): void => {
    nodeCount += 1;
    maximumDepth = Math.max(maximumDepth, depth);
    if (nodeCount > context.limits.maxNodes) problem(diagnostics, "PROJECTION_LIMIT", pointer, `Projection exceeds ${context.limits.maxNodes} nodes`);
    if (depth > context.limits.maxDepth) problem(diagnostics, "PROJECTION_LIMIT", pointer, `Projection exceeds depth ${context.limits.maxDepth}`);
    // SAFETY: The surrounding validation and domain contract establish the asserted type.
    if (active.has(node as object)) {
      problem(diagnostics, "PROJECTION_CYCLE", pointer, "Projection node graph contains a cycle");
      return;
    }
    // SAFETY: The surrounding validation and domain contract establish the asserted type.
    active.add(node as object);
    if (!NODE_ID.test(node.nodeId)) problem(diagnostics, "PROJECTION_INVALID", `${pointer}/nodeId`, "nodeId must be an opaque URL-safe identifier");
    if (nodeIds.has(node.nodeId)) problem(diagnostics, "PROJECTION_COLLISION", `${pointer}/nodeId`, `Duplicate nodeId ${node.nodeId}`);
    nodeIds.add(node.nodeId);

    switch (node.kind) {
      case "literal":
        validateLiteralSegment(node.segment, `${pointer}/segment`, diagnostics, isRoot);
        validateChildren(node.children, pointer, depth);
        break;
      case "select":
        if (node.objectKinds.length === 0) problem(diagnostics, "PROJECTION_INVALID", `${pointer}/objectKinds`, "select must include at least one object kind");
        for (const [index, kind] of node.objectKinds.entries()) if (!OBJECT_KINDS.has(kind)) problem(diagnostics, "PROJECTION_INVALID", `${pointer}/objectKinds/${index}`, `Unknown object kind ${kind}`);
        if (node.limit !== undefined && (!Number.isInteger(node.limit) || node.limit < 1 || node.limit > context.limits.maxFanout)) problem(diagnostics, "PROJECTION_LIMIT", `${pointer}/limit`, `select limit must be between 1 and ${context.limits.maxFanout}`);
        estimatedFanout = Math.min(Number.MAX_SAFE_INTEGER, estimatedFanout * (node.limit ?? context.limits.maxFanout));
        if (node.where !== undefined) validateSearchExpression(node.where, `${pointer}/where`, fields, context, diagnostics);
        validateOrders(node.order ?? definition.order, `${pointer}/order`, fields, sortable, diagnostics);
        validateChildren(node.children, pointer, depth);
        break;
      case "group":
        validateField(node.field, `${pointer}/field`, fields, diagnostics);
        validateTemplate(node.segment, `${pointer}/segment`, fields, context, diagnostics);
        validateLiteralSegment(node.missing, `${pointer}/missing`, diagnostics);
        visit(node.child, `${pointer}/child`, depth + 1);
        break;
      case "traverse": {
        if (!RELATIONS.has(node.relation)) problem(diagnostics, "PROJECTION_INVALID", `${pointer}/relation`, `Unknown relation ${node.relation}`);
        const maximum = Math.min(context.limits.maxRelationDepth ?? context.limits.maxDepth, context.limits.maxDepth);
        if (!Number.isInteger(node.maxDepth) || node.maxDepth < 1 || node.maxDepth > maximum) problem(diagnostics, "PROJECTION_LIMIT", `${pointer}/maxDepth`, `Relation depth must be between 1 and ${maximum}`);
        visit(node.child, `${pointer}/child`, depth + 1);
        break;
      }
      case "union":
        if (node.children.length === 0) problem(diagnostics, "PROJECTION_INVALID", `${pointer}/children`, "union must include at least one child");
        validateChildren(node.children, pointer, depth);
        break;
      case "alias":
        try { validateObjectRef(node.target); } catch (error) { problem(diagnostics, "PROJECTION_INVALID", `${pointer}/target`, message(error)); }
        validateTemplate(node.segment, `${pointer}/segment`, fields, context, diagnostics);
        validateChildren(node.children, pointer, depth);
        break;
      case "leaf":
        validateTemplate(node.segment, `${pointer}/segment`, fields, context, diagnostics);
        if (!["default", "body.md", "metadata.json"].includes(node.representation)) problem(diagnostics, "PROJECTION_INVALID", `${pointer}/representation`, "Unsupported leaf representation");
        break;
      default:
        // SAFETY: The surrounding validation and domain contract establish the asserted type.
        problem(diagnostics, "PROJECTION_INVALID", pointer, `Unknown projection node kind ${(node as { readonly kind?: unknown }).kind as string}`);
    }
    // SAFETY: The surrounding validation and domain contract establish the asserted type.
    active.delete(node as object);

    function validateChildren(children: readonly ProjectionNode[], parentPointer: string, parentDepth: number): void {
      if (children.length > context.limits.maxFanout) problem(diagnostics, "PROJECTION_LIMIT", `${parentPointer}/children`, `Node exceeds fanout ${context.limits.maxFanout}`);
      children.forEach((child, index) => visit(child, `${parentPointer}/children/${index}`, parentDepth + 1));
    }
  };
  visit(definition.root, "/root", 1, true);

  const effectiveOrder = totalOrder(definition.order);
  if (diagnostics.some((item) => item.severity === "error")) throw new ProjectionCompileError(diagnostics);
  return Object.freeze({
    definition: deepFreeze(cloneJson(definition)),
    canonicalJson: canonicalJson(definition),
    diagnostics: Object.freeze(diagnostics),
    nodeCount,
    maximumDepth,
    estimatedFanout,
    effectiveOrder: Object.freeze(effectiveOrder),
  });
}

export function renderSegmentTemplate(
  template: SegmentTemplate,
  values: TemplateValues,
  limits: { readonly maxTemplateLength?: number; readonly maxSegmentLength?: number } = {},
): RenderedSegment {
  const maxTemplateLength = limits.maxTemplateLength ?? 256;
  const maxSegmentLength = limits.maxSegmentLength ?? 120;
  if (template.template.length === 0 || template.template.length > maxTemplateLength) throw new Error("Projection segment template is empty or too long");
  const fields = new Set<string>();
  let output = "";
  let cursor = 0;
  while (cursor < template.template.length) {
    const open = template.template.indexOf("{", cursor);
    if (open < 0) { output += template.template.slice(cursor); break; }
    output += template.template.slice(cursor, open);
    const close = matchingBrace(template.template, open);
    if (close < 0) throw new Error("Projection segment template has an unmatched brace");
    const parser = new TemplateExpressionParser(template.template.slice(open + 1, close), values, fields);
    output += scalar(parser.parse());
    cursor = close + 1;
  }
  const segment = normalizeProjectionSegment(output, maxSegmentLength);
  return Object.freeze({ original: template.template, segment, fields: Object.freeze([...fields].sort()) });
}

export function normalizeProjectionSegment(value: string, maximumLength = 120): string {
  if (value.length === 0) throw new Error("Projection segment must not be empty");
  if (value !== value.normalize("NFKC")) throw new Error("Projection segment uses ambiguous Unicode normalization");
  if (value === "." || value === ".." || value.toLowerCase() === RECOVERY_SEGMENT) throw new Error("Projection segment is reserved or unsafe");
  if (value.length > maximumLength) throw new Error(`Projection segment exceeds ${maximumLength} characters`);
  if (value.includes("/") || value.includes("\\") || [...value].some((character) => {
    const code = character.codePointAt(0) ?? 0;
    return code < 32 || code === 127;
  })) throw new Error("Projection segment contains an unsafe path character");
  return value;
}

export function createProjectionOccurrenceId(identity: ProjectionOccurrenceIdentity): string {
  validateDefinitionId(identity.projectionId);
  validateObjectRef(identity.target);
  if (!Number.isInteger(identity.projectionVersion) || identity.projectionVersion < 1) throw new Error("Projection occurrence version must be positive");
  if (!NODE_ID.test(identity.nodeId) || !identity.branchId || !identity.parentEntryId) throw new Error("Projection occurrence requires stable node, branch, and parent identity");
  const segment = normalizeProjectionSegment(identity.resolvedSegment);
  return `entry-${stableHash([
    identity.projectionId,
    String(identity.projectionVersion),
    identity.nodeId,
    identity.branchId,
    identity.parentEntryId,
    identity.target.objectId,
    segment,
  ].join("\u0000"))}`;
}

export function assignProjectionCollisionNames(
  candidates: readonly ProjectionCollisionCandidate[],
): readonly ResolvedProjectionCollision[] {
  const groups = new Map<string, ProjectionCollisionCandidate[]>();
  const occurrences = new Set<string>();
  for (const candidate of candidates) {
    normalizeProjectionSegment(candidate.normalizedSegment);
    const occurrence = `${candidate.target.objectId}\u0000${candidate.nodeId}\u0000${candidate.branchId ?? ""}`;
    if (occurrences.has(occurrence)) throw new Error(`PROJECTION_COLLISION: duplicate occurrence ${candidate.target.objectId}/${candidate.nodeId}`);
    occurrences.add(occurrence);
    const values = groups.get(candidate.normalizedSegment) ?? [];
    values.push(candidate);
    groups.set(candidate.normalizedSegment, values);
  }
  const resolved = new Map<ProjectionCollisionCandidate, ResolvedProjectionCollision>();
  for (const [name, values] of groups) {
    const sorted = [...values].sort((left, right) => compareText(occurrenceKey(left), occurrenceKey(right)));
    const collisionSet = Object.freeze(sorted.map(occurrenceKey));
    const suffixes = uniqueSuffixes(sorted);
    sorted.forEach((candidate, index) => resolved.set(candidate, Object.freeze({
      ...candidate,
      finalName: sorted.length === 1 ? name : `${name.slice(0, 111)}~${suffixes[index]}`,
      collided: sorted.length > 1,
      collisionSet,
    })));
  }
  return Object.freeze(candidates.map((candidate) => resolved.get(candidate)!));
}

export function formatProjectionDefinition(definition: ProjectionDefinition): string {
  return `${JSON.stringify(JSON.parse(canonicalJson(definition)), null, 2)}\n`;
}

function validateTemplate(template: SegmentTemplate, pointer: string, fields: ReadonlySet<string>, context: ProjectionCompileContext, diagnostics: ProjectionDiagnostic[]): void {
  try {
    const sentinels = Object.fromEntries([...fields].map((field) => [field, "2026-01-01T00:00:00Z"]));
    const rendered = renderSegmentTemplate(template, sentinels, context.limits);
    for (const field of rendered.fields) validateField(field, pointer, fields, diagnostics);
  } catch (error) {
    problem(diagnostics, "PROJECTION_INVALID", pointer, message(error));
  }
}

function validateLiteralSegment(value: string, pointer: string, diagnostics: ProjectionDiagnostic[], allowEmpty = false): void {
  if (allowEmpty && value === "") return;
  try { normalizeProjectionSegment(value); } catch (error) { problem(diagnostics, "PROJECTION_INVALID", pointer, message(error)); }
}

function validateField(value: string, pointer: string, fields: ReadonlySet<string>, diagnostics: ProjectionDiagnostic[]): void {
  if (!FIELD.test(value) || !fields.has(value)) problem(diagnostics, "PROJECTION_UNKNOWN_FIELD", pointer, `Unknown or inaccessible field ${value}`);
}

function validateOrders(orders: readonly SearchOrder[], pointer: string, fields: ReadonlySet<string>, sortable: ReadonlySet<string>, diagnostics: ProjectionDiagnostic[]): void {
  if (orders.length === 0) problem(diagnostics, "PROJECTION_UNSTABLE_ORDER", pointer, "Projection order must be explicit");
  orders.forEach((order, index) => {
    validateField(order.field, `${pointer}/${index}/field`, fields, diagnostics);
    if (!sortable.has(order.field)) problem(diagnostics, "PROJECTION_UNSTABLE_ORDER", `${pointer}/${index}/field`, `Field ${order.field} is not sortable`);
    if (!["ascending", "descending"].includes(order.direction) || !["first", "last"].includes(order.nulls)) problem(diagnostics, "PROJECTION_INVALID", `${pointer}/${index}`, "Invalid sort direction or null order");
  });
}

function validateLimits(context: ProjectionCompileContext, diagnostics: ProjectionDiagnostic[]): void {
  for (const [name, value] of Object.entries(context.limits)) {
    if (value !== undefined && (!Number.isInteger(value) || value < 1 || value > 1_000_000)) problem(diagnostics, "PROJECTION_LIMIT", `/limits/${name}`, `${name} must be a bounded positive integer`);
  }
}

function validateDefinitionLimits(definition: ProjectionDefinition, context: ProjectionCompileContext, diagnostics: ProjectionDiagnostic[]): void {
  if (definition.limits === undefined) return;
  const maximums = new Map<string, number>([
    ["maxDepth", context.limits.maxDepth],
    ["maxEntriesPerDirectory", context.limits.maxFanout],
    ["maxTotalEntries", 1_000_000],
    ["maxRelationDepth", context.limits.maxRelationDepth ?? context.limits.maxDepth],
  ]);
  for (const [name, value] of Object.entries(definition.limits)) {
    if (value === undefined || !Number.isInteger(value) || value < 1 || value > (maximums.get(name) ?? 0)) {
      problem(diagnostics, "PROJECTION_LIMIT", `/limits/${name}`, `${name} exceeds the host projection limit`);
    }
  }
}

function validateSearchExpression(
  expression: SearchExpression,
  pointer: string,
  fields: ReadonlySet<string>,
  context: ProjectionCompileContext,
  diagnostics: ProjectionDiagnostic[],
  active = new Set<object>(),
  depth = 1,
): void {
  if (depth > context.limits.maxDepth) {
    problem(diagnostics, "PROJECTION_LIMIT", pointer, `Search expression exceeds depth ${context.limits.maxDepth}`);
    return;
  }
  // SAFETY: The surrounding validation and domain contract establish the asserted type.
  if (active.has(expression as object)) {
    problem(diagnostics, "PROJECTION_CYCLE", pointer, "Search expression contains a cycle");
    return;
  }
  // SAFETY: The surrounding validation and domain contract establish the asserted type.
  const next = new Set(active).add(expression as object);
  switch (expression.kind) {
    case "all": break;
    case "and": case "or":
      if (expression.terms.length === 0) problem(diagnostics, "PROJECTION_INVALID", `${pointer}/terms`, `${expression.kind} expression requires terms`);
      expression.terms.forEach((term, index) => validateSearchExpression(term, `${pointer}/terms/${index}`, fields, context, diagnostics, next, depth + 1));
      break;
    case "not": validateSearchExpression(expression.term, `${pointer}/term`, fields, context, diagnostics, next, depth + 1); break;
    case "text": expression.fields.forEach((field, index) => validateField(field, `${pointer}/fields/${index}`, fields, diagnostics)); break;
    case "compare": case "range": case "exists": validateField(expression.field, `${pointer}/field`, fields, diagnostics); break;
    case "related": {
      const maximum = context.limits.maxRelationDepth ?? context.limits.maxDepth;
      if (!Number.isInteger(expression.maxDepth) || expression.maxDepth < 1 || expression.maxDepth > maximum) problem(diagnostics, "PROJECTION_LIMIT", `${pointer}/maxDepth`, `Relation predicate depth must be between 1 and ${maximum}`);
      break;
    }
  }
}

function totalOrder(orders: readonly SearchOrder[]): readonly SearchOrder[] {
  const result = [...orders];
  for (const field of ["kind", "objectId"]) if (!result.some((order) => order.field === field)) result.push({ field, direction: "ascending", nulls: "last" });
  return result;
}

function problem(diagnostics: ProjectionDiagnostic[], code: ProjectionDiagnostic["code"], pointer: string, messageValue: string): void {
  diagnostics.push(Object.freeze({ code, message: messageValue, severity: "error", pointer }));
}

function message(cause: unknown): string { return cause instanceof Error ? cause.message : String(cause); }

function matchingBrace(value: string, open: number): number {
  let quote = "";
  for (let index = open + 1; index < value.length; index += 1) {
    const character = value[index] ?? "";
    if (quote) {
      if (character === "\\") index += 1;
      else if (character === quote) quote = "";
    } else if (character === "'" || character === "\"") quote = character;
    else if (character === "}") return index;
  }
  return -1;
}

class TemplateExpressionParser {
  private index = 0;
  constructor(
    private readonly input: string,
    private readonly values: TemplateValues,
    private readonly fields: Set<string>,
  ) {}

  parse(): CommunityFieldValue {
    const value = this.expression();
    this.space();
    if (this.index !== this.input.length) throw new Error(`Unexpected template input near ${this.input.slice(this.index)}`);
    return value;
  }

  private expression(): CommunityFieldValue {
    this.space();
    const character = this.input[this.index];
    if (character === "'" || character === "\"") return this.string();
    if (character !== undefined && /[0-9-]/u.test(character)) return this.number();
    const identifier = this.identifier();
    this.space();
    if (this.input[this.index] !== "(") {
      if (!FIELD.test(identifier)) throw new Error(`Invalid template field ${identifier}`);
      this.fields.add(identifier);
      return this.values[identifier] ?? "";
    }
    if (!FUNCTIONS.has(identifier)) throw new Error(`Unsupported projection template function ${identifier}`);
    this.index += 1;
    const args: CommunityFieldValue[] = [];
    this.space();
    while (this.input[this.index] !== ")") {
      if (this.index >= this.input.length) throw new Error("Unclosed projection template function");
      args.push(this.expression());
      this.space();
      if (this.input[this.index] === ",") { this.index += 1; this.space(); continue; }
      if (this.input[this.index] !== ")") throw new Error("Expected comma or closing parenthesis in projection template");
    }
    this.index += 1;
    return applyTemplateFunction(identifier, args);
  }

  private identifier(): string {
    const start = this.index;
    while (/[A-Za-z0-9._-]/u.test(this.input[this.index] ?? "")) this.index += 1;
    if (start === this.index) throw new Error("Expected projection template field or function");
    return this.input.slice(start, this.index);
  }

  private string(): string {
    const quote = this.input[this.index] ?? "";
    this.index += 1;
    let value = "";
    while (this.index < this.input.length && this.input[this.index] !== quote) {
      const character = this.input[this.index] ?? "";
      if (character === "\\") {
        this.index += 1;
        if (this.index >= this.input.length) throw new Error("Invalid string escape in projection template");
        value += this.input[this.index];
      } else value += character;
      this.index += 1;
    }
    if (this.input[this.index] !== quote) throw new Error("Unclosed string in projection template");
    this.index += 1;
    return value;
  }

  private number(): number {
    const start = this.index;
    while (/[0-9-]/u.test(this.input[this.index] ?? "")) this.index += 1;
    const value = Number(this.input.slice(start, this.index));
    if (!Number.isSafeInteger(value)) throw new Error("Template number must be a safe integer");
    return value;
  }

  private space(): void { while (/\s/u.test(this.input[this.index] ?? "")) this.index += 1; }
}

function applyTemplateFunction(name: string, args: readonly CommunityFieldValue[]): string {
  const first = scalar(args[0]);
  switch (name) {
    case "slug": return first.normalize("NFKC").toLowerCase().replace(/[^a-z0-9]+/gu, "-").replace(/^-+|-+$/gu, "") || "item";
    case "shortId": return first.replace(/[^A-Za-z0-9]/gu, "").slice(-8) || "unknown";
    case "date": {
      const date = new Date(first);
      if (Number.isNaN(date.valueOf())) throw new Error("date() requires an ISO-compatible datetime");
      return date.toISOString().slice(0, 10);
    }
    case "lower": return first.toLowerCase();
    case "upper": return first.toUpperCase();
    case "coalesce": return args.map(scalar).find((value) => value.length > 0) ?? "";
    case "pad": {
      const width = integerArg(args[1], "pad width", 1, 120);
      const fill = scalar(args[2] ?? "0");
      if (fill.length !== 1) throw new Error("pad fill must be one character");
      return first.padStart(width, fill);
    }
    case "truncate": return first.slice(0, integerArg(args[1], "truncate length", 1, 120));
    case "replace": {
      const search = scalar(args[1]);
      if (!search) throw new Error("replace search must not be empty");
      return first.split(search).join(scalar(args[2]));
    }
    default: throw new Error(`Unsupported projection template function ${name}`);
  }
}

function scalar(value: CommunityFieldValue | undefined): string {
  if (value === undefined || value === null) return "";
  if (!Array.isArray(value)) return String(value);
  throw new Error("Projection template values must be scalar");
}

function integerArg(value: CommunityFieldValue | undefined, label: string, minimum: number, maximum: number): number {
  if (!isNumber(value) || !Number.isSafeInteger(value) || value < minimum || value > maximum) throw new Error(`${label} must be between ${minimum} and ${maximum}`);
  return value;
}

function occurrenceKey(candidate: ProjectionCollisionCandidate): string {
  return `${candidate.target.objectId}\u0000${candidate.nodeId}\u0000${candidate.branchId ?? ""}`;
}

function uniqueSuffixes(candidates: readonly ProjectionCollisionCandidate[]): readonly string[] {
  for (const length of [8, 10, 12, 13]) {
    const suffixes = candidates.map((candidate) => stableHash(occurrenceKey(candidate)).slice(0, length));
    if (new Set(suffixes).size === suffixes.length) return suffixes;
  }
  throw new Error("PROJECTION_COLLISION: stable collision hashes are not unique");
}

function stableHash(value: string): string {
  let hash = 0xcbf29ce484222325n;
  for (const byte of new TextEncoder().encode(value)) {
    hash ^= BigInt(byte);
    hash = BigInt.asUintN(64, hash * 0x100000001b3n);
  }
  return hash.toString(36).padStart(13, "0");
}

function canonicalJson<Value>(value: Value): string {
  if (!isNonNullObject(value)) return JSON.stringify(value);
  if (Array.isArray(value)) return `[${value.map(canonicalJson).join(",")}]`;
  return `{${Object.entries(value)
    .filter(([, item]) => item !== undefined)
    .sort(([left], [right]) => compareText(left, right))
    .map(([key, item]) => `${JSON.stringify(key)}:${canonicalJson(item)}`).join(",")}}`;
}

// SAFETY: The surrounding validation and domain contract establish the asserted type.
function cloneJson<T>(value: T): T { return /* SAFETY: Assertion is justified by surrounding validation or construction. */ JSON.parse(JSON.stringify(value)) as T; }
function deepFreeze<T>(value: T): T {
  if (isNonNullObject(value) && !Object.isFrozen(value)) {
    Object.freeze(value);
    for (const child of Object.values(value)) deepFreeze(child);
  }
  return value;
}

interface TemplateValues { readonly [key: string]: CommunityFieldValue }
function isNumber(value: CommunityFieldValue | undefined): value is number { return typeof value === "number"; }
function isNonNullObject<Value>(value: Value): value is Value & object { return typeof value === "object" && value !== null; }

function validateDefinitionId(value: string): string {
  if (/^builtin:[a-z][a-z0-9-]{0,63}$/u.test(value)) return value;
  return validateProjectionId(value);
}

function compareText(left: string, right: string): number { return left < right ? -1 : left > right ? 1 : 0; }
