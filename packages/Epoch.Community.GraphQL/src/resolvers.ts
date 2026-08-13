import {
  CommunityError,
  isCommunityError,
  normalizeVirtualPath,
  semanticExpression,
  validateObjectRef,
  type CommunityAuthorizationContext,
  type CommunityEntity,
  type CommunityFieldScalar,
  type NamespaceMount,
  type NamespaceResetResult,
  type ProjectionDefinition,
  type ProjectionDelta,
  type ProjectionExecutionContext,
  type ProjectionExplanation,
  type SearchExplanation,
  type SearchExpression,
  type SearchOrder,
  type SearchPage,
  type VfsEntry,
  type VfsPage,
} from "@epoch/community-core";
import { GraphQLError } from "graphql";
import { projectionDeltaEvents } from "./subscriptions";

export interface SearchScope {
  readonly sourceIds?: readonly string[];
  readonly objectKinds?: readonly string[];
}

export interface CommunityGraphQLSourceCapabilities {
  readonly sourceId: string;
  readonly fields: Readonly<Record<string, {
    readonly type: string;
    readonly operators: readonly string[];
    readonly sortable: boolean;
    readonly facetable: boolean;
  }>>;
  readonly fullText: "none" | "substring" | "lexical";
  readonly pagination: "none" | "offset" | "keyset" | "opaque";
  readonly supportsWatch: boolean;
  readonly supportsPointLookup: boolean;
  readonly supportsRelations: boolean;
  readonly maxPageSize: number;
}

export interface CommunityGraphQLServices {
  node(id: string, authorization: CommunityAuthorizationContext): Promise<CommunityEntity | undefined>;
  observableFields(entity: CommunityEntity, authorization: CommunityAuthorizationContext): CommunityEntity["fields"];
  search(input: {
    readonly where: SearchExpression;
    readonly scope?: SearchScope;
    readonly orderBy: readonly SearchOrder[];
    readonly first: number;
    readonly after?: string;
    readonly snapshot?: string;
    readonly authorization: CommunityAuthorizationContext;
    readonly signal?: AbortSignal;
  }): Promise<SearchPage>;
  parseSearch(expression: string, input: {
    readonly timezone?: string;
    readonly locale?: string;
    readonly authorization: CommunityAuthorizationContext;
  }): CommunityParsedSearch;
  explainSearch(input: {
    readonly where: SearchExpression;
    readonly scope?: SearchScope;
    readonly orderBy: readonly SearchOrder[];
    readonly authorization: CommunityAuthorizationContext;
  }): Promise<SearchExplanation>;
  projections(authorization: CommunityAuthorizationContext): Promise<readonly ProjectionDefinition[]>;
  projection(id: string, authorization: CommunityAuthorizationContext): Promise<ProjectionDefinition | undefined>;
  saveProjection(definition: ProjectionDefinition, authorization: CommunityAuthorizationContext): Promise<ProjectionDefinition>;
  deleteProjection(id: string, authorization: CommunityAuthorizationContext): Promise<boolean>;
  projectionContext(authorization: CommunityAuthorizationContext, snapshot?: string): Promise<ProjectionExecutionContext>;
  listPath(input: {
    readonly namespace?: string;
    readonly path: string;
    readonly first: number;
    readonly after?: string;
    readonly context: ProjectionExecutionContext;
  }): Promise<VfsPage & { readonly shadowed?: readonly unknown[]; readonly componentOrder?: readonly string[] }>;
  resolvePath(input: { readonly namespace?: string; readonly path: string; readonly context: ProjectionExecutionContext }): Promise<VfsEntry | undefined>;
  locate(input: { readonly namespace?: string; readonly objectId: string; readonly context: ProjectionExecutionContext }): Promise<readonly VfsEntry[]>;
  explainPath(input: { readonly namespace?: string; readonly path: string; readonly context: ProjectionExecutionContext }): Promise<ProjectionExplanation>;
  sourceCapabilities(authorization: CommunityAuthorizationContext): Promise<readonly CommunityGraphQLSourceCapabilities[]>;
  namespaceMounts(authorization: CommunityAuthorizationContext): Promise<readonly NamespaceMount[]>;
  mountProjection(input: CommunityGraphQLMountInput, authorization: CommunityAuthorizationContext): Promise<NamespaceMount>;
  unmountProjection(id: string, authorization: CommunityAuthorizationContext): Promise<boolean>;
  resetNamespace(scope: "workspace" | "user" | "session", authorization: CommunityAuthorizationContext): Promise<NamespaceResetResult>;
  projectionDeltas(input: {
    readonly namespace?: string;
    readonly path: string;
    readonly context: ProjectionExecutionContext;
    readonly signal: AbortSignal;
  }): AsyncIterable<ProjectionDelta>;
}

export interface CommunityParsedSearch {
  readonly ast: SearchExpression | null;
  readonly canonical: string;
  readonly canonicalJson: string;
  readonly queryHash: string;
  readonly sort: readonly SearchOrder[];
  readonly version: number;
  readonly fieldRegistryVersion: number;
  readonly resolvedAt: string;
  readonly diagnostics: readonly {
    readonly code: string;
    readonly message: string;
    readonly severity: "error" | "warning";
    readonly span?: { readonly start: number; readonly end: number; readonly line: number; readonly column: number };
    readonly suggestions: readonly string[];
  }[];
}

export interface CommunityGraphQLMountInput {
  readonly mountId: string;
  readonly projectionId: string;
  readonly mountPath: string;
  readonly mode: "replace" | "before" | "after";
  readonly scope: "builtin" | "community" | "workspace" | "user" | "session";
  readonly order: number;
  readonly writable: boolean;
}

export interface CommunityGraphQLContext {
  readonly authorization: CommunityAuthorizationContext;
  readonly signal?: AbortSignal;
}

export interface SearchExpressionInput {
  readonly all?: { readonly enabled: boolean };
  readonly and?: { readonly terms: readonly SearchExpressionInput[] };
  readonly or?: { readonly terms: readonly SearchExpressionInput[] };
  readonly not?: { readonly term: SearchExpressionInput };
  readonly text?: { readonly fields: readonly string[]; readonly value: string; readonly mode: string };
  readonly compare?: { readonly field: string; readonly operator: string; readonly value: CommunityValueInput };
  readonly range?: { readonly field: string; readonly lower?: CommunityScalarInput; readonly upper?: CommunityScalarInput; readonly includeLower: boolean; readonly includeUpper: boolean };
  readonly exists?: { readonly field: string };
  readonly related?: { readonly relation: string; readonly target: { readonly objectId: string; readonly kind: string; readonly atUri?: string; readonly revision?: string }; readonly direction: string; readonly maxDepth: number };
}
export type CommunityScalarInput = { readonly string?: string; readonly number?: number; readonly boolean?: boolean; readonly nullValue?: boolean };
export type CommunityValueInput = { readonly scalar?: CommunityScalarInput; readonly values?: readonly CommunityScalarInput[] };

const RELATIONS = new Set(["reply", "quote", "mention", "provenance", "promotion", "replacement", "moderation", "attachment", "backlink"]);
const SCOPES = new Set(["builtin", "community", "workspace", "user", "session"]);

export function createRootResolvers(services: CommunityGraphQLServices): Readonly<Record<string, unknown>> {
  return Object.freeze({
    node: guard(async ({ id }: { readonly id: string }, context: CommunityGraphQLContext) => {
      const authorized = authorization(context);
      const entity = await services.node(id, authorized);
      return nodeRecord(entity, entity === undefined ? undefined : services.observableFields(entity, authorized));
    }),
    search: guard(async (args: SearchArgs, context: CommunityGraphQLContext) => searchRecord(await services.search({
      where: searchExpressionFromInput(args.where),
      ...(args.scope === undefined ? {} : { scope: args.scope }),
      orderBy: orders(args.orderBy),
      first: boundedFirst(args.first),
      ...(args.after === undefined ? {} : { after: args.after }),
      ...(args.snapshot === undefined ? {} : { snapshot: args.snapshot }),
      authorization: authorization(context),
      ...(context.signal === undefined ? {} : { signal: context.signal }),
    }))),
    parseSearch: guard(async (args: { readonly expression: string; readonly timezone?: string; readonly locale?: string }, context: CommunityGraphQLContext) => parsedRecord(services.parseSearch(args.expression, {
      ...(args.timezone === undefined ? {} : { timezone: args.timezone }),
      ...(args.locale === undefined ? {} : { locale: args.locale }),
      authorization: authorization(context),
    }))),
    explainSearch: guard(async (args: { readonly where: SearchExpressionInput; readonly scope?: SearchScope; readonly orderBy?: readonly SearchOrderInput[] }, context: CommunityGraphQLContext) => {
      const where = searchExpressionFromInput(args.where);
      return explanationRecord(await services.explainSearch({
      where,
      ...(args.scope === undefined ? {} : { scope: args.scope }),
      orderBy: orders(args.orderBy),
      authorization: authorization(context),
      }), where);
    }),
    projections: guard(async (_args: unknown, context: CommunityGraphQLContext) => (await services.projections(authorization(context))).map(projectionRecord)),
    projection: guard(async ({ id }: { readonly id: string }, context: CommunityGraphQLContext) => projectionRecord(await services.projection(id, authorization(context)))),
    listPath: guard(async (args: PathPageArgs, context: CommunityGraphQLContext) => {
      const execution = await services.projectionContext(authorization(context), args.snapshot);
      const result = await services.listPath({ ...(args.namespace === undefined ? {} : { namespace: args.namespace }), path: normalizeVirtualPath(args.path), first: boundedFirst(args.first), ...(args.after === undefined ? {} : { after: args.after }), context: execution });
      return { nodes: result.entries, pageInfo: result.pageInfo, freshness: result.freshness, shadowed: result.shadowed ?? [], componentOrder: result.componentOrder ?? [] };
    }),
    resolvePath: guard(async (args: PathArgs, context: CommunityGraphQLContext) => services.resolvePath({ ...(args.namespace === undefined ? {} : { namespace: args.namespace }), path: normalizeVirtualPath(args.path), context: await services.projectionContext(authorization(context), args.snapshot) })),
    locate: guard(async (args: { readonly namespace?: string; readonly objectId: string; readonly snapshot?: string }, context: CommunityGraphQLContext) => services.locate({ ...(args.namespace === undefined ? {} : { namespace: args.namespace }), objectId: args.objectId, context: await services.projectionContext(authorization(context), args.snapshot) })),
    explainPath: guard(async (args: PathArgs, context: CommunityGraphQLContext) => services.explainPath({ ...(args.namespace === undefined ? {} : { namespace: args.namespace }), path: normalizeVirtualPath(args.path), context: await services.projectionContext(authorization(context), args.snapshot) })),
    sourceCapabilities: guard(async (_args: unknown, context: CommunityGraphQLContext) => (await services.sourceCapabilities(authorization(context))).map(sourceCapabilitiesRecord)),
    namespaceMounts: guard(async (_args: unknown, context: CommunityGraphQLContext) => (await services.namespaceMounts(authorization(context))).map(mountRecord)),
    saveProjection: guard(async ({ input }: { readonly input: { readonly definition: ProjectionDefinition } }, context: CommunityGraphQLContext) => projectionRecord(await services.saveProjection(input.definition, authorization(context)))),
    deleteProjection: guard(async ({ id }: { readonly id: string }, context: CommunityGraphQLContext) => services.deleteProjection(id, authorization(context))),
    mountProjection: guard(async ({ input }: { readonly input: MountInput }, context: CommunityGraphQLContext) => mountRecord(await services.mountProjection(mountInput(input), authorization(context)))),
    unmountProjection: guard(async ({ id }: { readonly id: string }, context: CommunityGraphQLContext) => services.unmountProjection(id, authorization(context))),
    resetNamespace: guard(async ({ scope }: { readonly scope: string }, context: CommunityGraphQLContext) => services.resetNamespace(resettableNamespaceScope(scope), authorization(context))),
    projectionDeltas: guard(async (args: PathArgs, context: CommunityGraphQLContext) => projectionDeltaEvents(services.projectionDeltas({ ...(args.namespace === undefined ? {} : { namespace: args.namespace }), path: normalizeVirtualPath(args.path), context: await services.projectionContext(authorization(context), args.snapshot), signal: context.signal ?? new AbortController().signal }), context.signal)),
  });
}

interface SearchArgs { readonly where: SearchExpressionInput; readonly scope?: SearchScope; readonly orderBy?: readonly SearchOrderInput[]; readonly first: number; readonly after?: string; readonly snapshot?: string }
interface SearchOrderInput { readonly field: string; readonly direction: string; readonly nulls: string }
interface PathArgs { readonly namespace?: string; readonly path: string; readonly snapshot?: string }
interface PathPageArgs extends PathArgs { readonly first: number; readonly after?: string }
interface MountInput { readonly mountId: string; readonly projectionId: string; readonly path: string; readonly mode: string; readonly scope: string; readonly order: number; readonly writable: boolean }

export function searchExpressionFromInput(input: SearchExpressionInput, depth = 1, counter = { value: 0 }): SearchExpression {
  counter.value += 1;
  if (depth > 16 || counter.value > 256) throw new CommunityError("QUERY_COST_LIMIT", "Structured search expression exceeds depth or node limits");
  const keys = Object.entries(input).filter(([, value]) => value !== undefined && value !== null);
  if (keys.length !== 1) throw new CommunityError("QUERY_SYNTAX", "SearchExpressionInput must contain exactly one variant");
  const [kind, value] = keys[0]!;
  switch (kind) {
    case "all":
      if ((value as SearchExpressionInput["all"])?.enabled !== true) throw new CommunityError("QUERY_SYNTAX", "all.enabled must be true");
      return { kind: "all" };
    case "and": case "or": {
      const terms = (value as { readonly terms: readonly SearchExpressionInput[] }).terms;
      if (!Array.isArray(terms) || terms.length < 1 || terms.length > 64) throw new CommunityError("QUERY_COST_LIMIT", `${kind} requires between 1 and 64 terms`);
      return { kind, terms: Object.freeze(terms.map((term) => searchExpressionFromInput(term, depth + 1, counter))) };
    }
    case "not": return { kind: "not", term: searchExpressionFromInput((value as { readonly term: SearchExpressionInput }).term, depth + 1, counter) };
    case "text": {
      const text = value as NonNullable<SearchExpressionInput["text"]>;
      if (text.fields.length < 1 || text.fields.length > 64 || text.value.length > 2048) throw new CommunityError("QUERY_COST_LIMIT", "Text search fields or value exceed limits");
      return { kind: "text", fields: Object.freeze([...text.fields]), value: text.value, mode: enumValue(text.mode, ["term", "phrase", "prefix"], "text mode") };
    }
    case "compare": {
      const compare = value as NonNullable<SearchExpressionInput["compare"]>;
      return { kind: "compare", field: compare.field, operator: enumValue(compare.operator, ["eq", "ne", "lt", "lte", "gt", "gte", "in"], "comparison operator"), value: communityValue(compare.value) };
    }
    case "range": {
      const range = value as NonNullable<SearchExpressionInput["range"]>;
      if (range.lower === undefined && range.upper === undefined) throw new CommunityError("QUERY_SYNTAX", "Range search requires a lower or upper bound");
      return { kind: "range", field: range.field, ...(range.lower === undefined ? {} : { lower: communityScalar(range.lower) }), ...(range.upper === undefined ? {} : { upper: communityScalar(range.upper) }), includeLower: range.includeLower, includeUpper: range.includeUpper };
    }
    case "exists": return { kind: "exists", field: (value as NonNullable<SearchExpressionInput["exists"]>).field };
    case "related": {
      const related = value as NonNullable<SearchExpressionInput["related"]>;
      if (!Number.isInteger(related.maxDepth) || related.maxDepth < 1 || related.maxDepth > 8) throw new CommunityError("QUERY_COST_LIMIT", "Relation depth must be between 1 and 8");
      return { kind: "related", relation: relation(related.relation), target: validateObjectRef(related.target), direction: enumValue(related.direction, ["in", "out"], "relation direction"), maxDepth: related.maxDepth };
    }
    default: throw new CommunityError("QUERY_SYNTAX", `Unsupported SearchExpressionInput variant: ${kind}`);
  }
}

function communityValue(input: CommunityValueInput): CommunityFieldScalar | readonly CommunityFieldScalar[] {
  if (input.scalar !== undefined) return communityScalar(input.scalar);
  if (input.values !== undefined && input.values.length > 0 && input.values.length <= 256) return Object.freeze(input.values.map(communityScalar));
  throw new CommunityError("QUERY_SYNTAX", "CommunityValueInput must contain one scalar or a bounded non-empty value list");
}

function communityScalar(input: CommunityScalarInput): CommunityFieldScalar {
  const entries = Object.entries(input).filter(([, value]) => value !== undefined && value !== null);
  if (entries.length !== 1) throw new CommunityError("QUERY_SYNTAX", "CommunityScalarInput must contain exactly one value");
  const [kind, value] = entries[0]!;
  if (kind === "nullValue") {
    if (value !== true) throw new CommunityError("QUERY_SYNTAX", "nullValue must be true");
    return null;
  }
  if (kind === "number" && (typeof value !== "number" || !Number.isFinite(value))) throw new CommunityError("QUERY_SYNTAX", "Numeric query values must be finite");
  if (kind === "string" && (typeof value !== "string" || value.length > 2048)) throw new CommunityError("QUERY_COST_LIMIT", "String query value exceeds its limit");
  if (typeof value !== "string" && typeof value !== "number" && typeof value !== "boolean") throw new CommunityError("QUERY_SYNTAX", "Invalid query scalar");
  return value;
}

function orders(input: readonly SearchOrderInput[] | undefined): readonly SearchOrder[] {
  if (input === undefined) return [];
  if (input.length > 16) throw new CommunityError("QUERY_COST_LIMIT", "Search order exceeds 16 fields");
  return Object.freeze(input.map((order) => ({ field: order.field, direction: enumValue(order.direction, ["ascending", "descending"], "sort direction"), nulls: enumValue(order.nulls, ["first", "last"], "null order") })));
}

function boundedFirst(value: number): number {
  if (!Number.isInteger(value) || value < 1 || value > 1000) throw new CommunityError("QUERY_COST_LIMIT", "first must be between 1 and 1000");
  return value;
}

function authorization(context: CommunityGraphQLContext): CommunityAuthorizationContext {
  if (typeof context !== "object" || context === null || typeof context.authorization !== "object" || context.authorization === null) throw new CommunityError("AUTHORIZATION_DENIED", "GraphQL host must inject authorization context");
  return context.authorization;
}

function nodeRecord(entity: CommunityEntity | undefined, fields: CommunityEntity["fields"] | undefined): unknown {
  return entity === undefined ? undefined : { id: entity.ref.objectId, ref: entity.ref, fields: fields ?? {}, visibility: entity.visibility, ownerId: entity.ownerId, createdAt: entity.createdAt, updatedAt: entity.updatedAt, provenance: entity.provenance, tombstone: entity.tombstone };
}
function searchRecord(page: SearchPage): unknown { return { nodes: page.hits, pageInfo: page.pageInfo, snapshot: page.snapshot, completeness: page.completeness }; }
function explanationRecord(explanation: SearchExplanation, normalized: SearchExpression): unknown {
  return { ...explanation, parsedExpression: null, normalizedExpression: semanticExpression(normalized), omissions: [] };
}
function parsedRecord(query: CommunityParsedSearch): unknown { return { expression: semanticExpression(query.ast), canonical: query.canonical, canonicalJson: query.canonicalJson, queryHash: query.queryHash, version: query.version, fieldRegistryVersion: query.fieldRegistryVersion, resolvedAt: query.resolvedAt, orderBy: query.sort, diagnostics: query.diagnostics }; }
function projectionRecord(value: ProjectionDefinition | undefined): unknown { return value === undefined ? undefined : { id: value.projectionId, version: value.version, label: value.label, ownerId: value.ownerId, visibility: value.visibility, updateMode: value.updateMode, consistency: value.consistency, definition: value }; }
function mountRecord(value: NamespaceMount): unknown { return { id: value.mountId, scope: value.scope, path: value.mountPath, projectionId: value.projectionId, mode: value.mode, order: value.order, writable: value.writable, ownerId: value.ownerId, createdAt: value.createdAt, updatedAt: value.updatedAt }; }
function sourceCapabilitiesRecord(value: CommunityGraphQLSourceCapabilities): unknown { return { ...value, fields: Object.entries(value.fields).map(([name, field]) => ({ name, ...field })) }; }

function mountInput(value: MountInput): CommunityGraphQLMountInput {
  return { mountId: value.mountId, projectionId: value.projectionId, mountPath: normalizeVirtualPath(value.path), mode: enumValue(value.mode, ["replace", "before", "after"], "mount mode"), scope: namespaceScope(value.scope), order: value.order, writable: value.writable };
}
function namespaceScope(value: string): "builtin" | "community" | "workspace" | "user" | "session" {
  const normalized = value.toLowerCase();
  if (!SCOPES.has(normalized)) throw new CommunityError("NAMESPACE_MOUNT_CONFLICT", `Unsupported namespace scope: ${value}`);
  return normalized as "builtin" | "community" | "workspace" | "user" | "session";
}
function resettableNamespaceScope(value: string): "workspace" | "user" | "session" {
  const scope = namespaceScope(value);
  if (scope === "builtin" || scope === "community") throw new CommunityError("NAMESPACE_RECOVERY_PROTECTED", `Namespace scope cannot be reset: ${scope}`);
  return scope;
}
function relation(value: string): "reply" | "quote" | "mention" | "provenance" | "promotion" | "replacement" | "moderation" | "attachment" | "backlink" {
  const normalized = value.toLowerCase();
  if (!RELATIONS.has(normalized)) throw new CommunityError("QUERY_INVALID_OPERATOR", `Unsupported relation: ${value}`);
  return normalized as "reply";
}

function enumValue<const T extends string>(value: string, allowed: readonly T[], label: string): T {
  const normalized = value.toLowerCase();
  if (!allowed.includes(normalized as T)) throw new CommunityError("QUERY_INVALID_OPERATOR", `Unsupported ${label}: ${value}`);
  return normalized as T;
}

function guard<TArgs, TResult>(resolver: (args: TArgs, context: CommunityGraphQLContext) => TResult | Promise<TResult>): (args: TArgs, context: CommunityGraphQLContext) => Promise<TResult> {
  return async (args, context) => {
    try { return await resolver(args, context); }
    catch (error) { throw graphQLError(error); }
  };
}

function graphQLError(error: unknown): GraphQLError {
  if (error instanceof GraphQLError) return error;
  if (isCommunityError(error)) return new GraphQLError(error.message, { originalError: error, extensions: { code: error.code, httpStatus: error.httpStatus } });
  if (typeof error === "object" && error !== null && "name" in error && error.name === "AbortError") return new GraphQLError("Operation cancelled", { extensions: { code: "CANCELLED", httpStatus: 499 } });
  return new GraphQLError("Internal Community GraphQL failure", { extensions: { code: "INTERNAL", httpStatus: 500 } });
}
