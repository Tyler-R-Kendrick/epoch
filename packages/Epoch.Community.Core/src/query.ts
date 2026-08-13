import type { CommunityMessage } from "./graph";
import { communityMessageToEntity } from "./entity";
import { evaluateSearchExpression } from "./query-evaluator";
import { CORE_COMMUNITY_FIELDS } from "./fields";
import {
  parseCommunityQuery,
  QUERY_LANGUAGE_VERSION,
  type ParseCommunityQueryOptions,
} from "./query-parser";
import type {
  NormalizedCommunityQuery as TypedNormalizedCommunityQuery,
  QueryDiagnostic,
  SearchExpression,
  SearchOrder,
} from "./search-expression";

export { parseCommunityQuery, QUERY_FIELD_REGISTRY_VERSION, QUERY_LANGUAGE_VERSION } from "./query-parser";
export * from "./search-expression";

export const COMMUNITY_QUERY_FIELDS = Object.freeze(CORE_COMMUNITY_FIELDS.map(({ name }) => name));

export type CommunityQueryField = typeof COMMUNITY_QUERY_FIELDS[number];
export type CommunityQuerySort = "hot" | "new" | "top" | "best";

interface PersistedQueryNode {
  readonly op: "term" | "field" | "field_group" | "not" | "and" | "or";
  readonly value?: string;
  readonly phrase?: boolean;
  readonly field?: string;
  readonly node?: PersistedQueryNode;
  readonly left?: PersistedQueryNode;
  readonly right?: PersistedQueryNode;
}

export type CommunityQueryNode = SearchExpression | PersistedQueryNode;

/** Persisted query record; newly normalized queries populate every typed field. */
export interface NormalizedCommunityQuery {
  readonly ast: CommunityQueryNode | null;
  readonly canonical: string;
  readonly canonicalJson?: string;
  readonly queryHash?: string;
  readonly sort: readonly SearchOrder[] | CommunityQuerySort | null;
  readonly version: number;
  readonly fieldRegistryVersion?: number;
  readonly resolvedAt?: string;
  readonly diagnostics?: readonly QueryDiagnostic[];
  readonly error?: string;
}

export interface PersistedSavedQuery {
  readonly query?: string;
  readonly canonical?: string;
  readonly queryLanguageVersion?: number;
  readonly version?: number;
  readonly sort?: string | readonly SearchOrder[] | null;
  readonly ast?: PersistedQueryNode | SearchExpression | null;
  readonly error?: string;
}

export function normalizeQuery(input: string, options: ParseCommunityQueryOptions = {}): TypedNormalizedCommunityQuery {
  return parseCommunityQuery(input, options);
}

export function migrateNormalizedQuery(saved: PersistedSavedQuery): TypedNormalizedCommunityQuery {
  const version = saved.queryLanguageVersion ?? saved.version ?? 0;
  if (version > QUERY_LANGUAGE_VERSION) {
    return parseCommunityQuery("", { version });
  }
  const source = saved.canonical ?? saved.query;
  if (source !== undefined) return parseCommunityQuery(source, { version });
  if (saved.ast !== undefined) {
    const serialized = saved.ast === null ? "" : isPersistedNode(saved.ast) ? serializePersisted(saved.ast) : serializeSemantic(saved.ast);
    const sort = typeof saved.sort === "string" ? `sort:${saved.sort}` : "";
    return parseCommunityQuery([serialized, sort].filter(Boolean).join(" "), { version });
  }
  return invalidMigration("Saved query has no canonical query or normalized AST");
}

export function matchesNormalizedQuery(message: CommunityMessage, query: NormalizedCommunityQuery): boolean {
  if (query.error !== undefined) return false;
  if (query.ast !== null && isPersistedNode(query.ast)) return matchesNormalizedQuery(message, migrateNormalizedQuery(query));
  if (query.ast === null) return true;
  const entity = communityMessageToEntity(message, {
    provenance: { sourceId: "community-message", nativeId: message.ref.objectId, observedAt: message.updatedAt ?? message.publishedAt },
    visibility: message.context.kind === "dm" ? "private" : "public",
    participantIds: [],
  });
  return evaluateSearchExpression(entity, query.ast).matches;
}

function isPersistedNode(value: PersistedQueryNode | SearchExpression): value is PersistedQueryNode {
  return "op" in value;
}

function serializePersisted(node: PersistedQueryNode, parentPrecedence = 0): string {
  const precedence = node.op === "or" ? 1 : node.op === "and" ? 2 : node.op === "not" ? 3 : 4;
  let value: string;
  switch (node.op) {
    case "or": case "and": value = `${serializePersisted(requiredNode(node.left), precedence)} ${node.op.toUpperCase()} ${serializePersisted(requiredNode(node.right), precedence)}`; break;
    case "not": value = `NOT ${serializePersisted(requiredNode(node.node), precedence)}`; break;
    case "field_group": value = `${node.field ?? "text"}:(${serializePersisted(requiredNode(node.node))})`; break;
    case "field": value = `${node.field ?? "text"}:${node.phrase ? JSON.stringify(node.value ?? "") : node.value ?? "*"}`; break;
    case "term": value = node.phrase ? JSON.stringify(node.value ?? "") : node.value ?? ""; break;
  }
  return precedence < parentPrecedence ? `(${value})` : value;
}

function requiredNode(node: PersistedQueryNode | undefined): PersistedQueryNode {
  if (node === undefined) throw new Error("Malformed saved query AST");
  return node;
}

function serializeSemantic(node: SearchExpression): string {
  // Keep the facade independent of parser internals while migrations remain deterministic.
  switch (node.kind) {
    case "all": return "";
    case "and": return node.terms.map(serializeSemantic).join(" AND ");
    case "or": return node.terms.map(serializeSemantic).join(" OR ");
    case "not": return `NOT (${serializeSemantic(node.term)})`;
    case "text": return `${node.fields.length === 2 ? "" : `${node.fields[0]}:`}${node.mode === "phrase" ? JSON.stringify(node.value) : `${node.value}${node.mode === "prefix" ? "*" : ""}`}`;
    case "compare": return `${node.field}:${({ eq: "", ne: "!=", lt: "<", lte: "<=", gt: ">", gte: ">=", in: "=" } as const)[node.operator]}${String(node.value)}`;
    case "range": return `${node.field}:${node.includeLower ? "[" : "{"}${node.lower ?? "*"} TO ${node.upper ?? "*"}${node.includeUpper ? "]" : "}"}`;
    case "exists": return `${node.field}:*`;
    case "related": return `related.${node.relation}:${node.target.kind}/${node.target.objectId}`;
  }
}

function invalidMigration(message: string): TypedNormalizedCommunityQuery {
  const parsed = parseCommunityQuery("");
  return { ...parsed, diagnostics: [{ code: "QUERY_MIGRATION", message, severity: "error", suggestions: [] }], error: message };
}
