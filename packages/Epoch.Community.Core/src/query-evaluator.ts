import type { CommunityEntity, CommunityFieldValue } from "./entity";
import type { CommunityFieldScalar, SearchExpression } from "./search-expression";

export interface SearchEvaluation {
  readonly matches: boolean;
  readonly matchedFields: readonly string[];
}

export function evaluateSearchExpression(
  entity: CommunityEntity,
  expression: SearchExpression,
  options: {
    readonly resolveEntity?: (objectId: string) => CommunityEntity | undefined;
    readonly relationsFor?: (objectId: string) => readonly CommunityEntity["relations"][number][];
  } = {},
): SearchEvaluation {
  const matched = new Set<string>();
  const evaluate = (node: SearchExpression): boolean => {
    switch (node.kind) {
      case "all": return true;
      case "and": return node.terms.every(evaluate);
      case "or": return node.terms.some(evaluate);
      case "not": return !evaluate(node.term);
      case "exists": return values(entity, node.field).some((value) => value !== null);
      case "compare": {
        const candidates = values(entity, node.field);
        const result = compareCandidates(candidates, node.operator, node.value);
        if (result) matched.add(node.field);
        return result;
      }
      case "range": {
        const result = values(entity, node.field).some((value) => inRange(value, node));
        if (result) matched.add(node.field);
        return result;
      }
      case "text": {
        const fields = node.fields.length === 0 ? Object.keys(entity.searchableText) : node.fields;
        const result = fields.some((field) => {
          const found = values(entity, field).some((value) => typeof value === "string" && textMatches(value, node.value, node.mode));
          if (found) matched.add(field);
          return found;
        });
        return result;
      }
      case "related": {
        const result = relationMatches(entity, node, options.resolveEntity, options.relationsFor);
        if (result) matched.add(`related.${node.relation}`);
        return result;
      }
    }
  };
  return Object.freeze({ matches: evaluate(expression), matchedFields: Object.freeze([...matched].sort()) });
}

function relationMatches(
  start: CommunityEntity,
  node: Extract<SearchExpression, { readonly kind: "related" }>,
  resolveEntity: ((objectId: string) => CommunityEntity | undefined) | undefined,
  relationsFor: ((objectId: string) => readonly CommunityEntity["relations"][number][]) | undefined,
): boolean {
  let frontier: readonly CommunityEntity[] = [start];
  const visited = new Set([start.ref.objectId]);
  for (let depth = 0; depth < node.maxDepth; depth += 1) {
    const next: CommunityEntity[] = [];
    for (const entity of frontier) for (const relation of relationsFor?.(entity.ref.objectId) ?? entity.relations) {
      if (relation.type !== node.relation) continue;
      const adjacent = node.direction === "out" && relation.source.objectId === entity.ref.objectId ? relation.target
        : node.direction === "in" && relation.target.objectId === entity.ref.objectId ? relation.source : undefined;
      if (adjacent === undefined) continue;
      if (adjacent.objectId === node.target.objectId) return true;
      const resolved = resolveEntity?.(adjacent.objectId);
      if (resolved !== undefined && !visited.has(adjacent.objectId)) {
        visited.add(adjacent.objectId);
        next.push(resolved);
      }
    }
    frontier = next;
    if (frontier.length === 0) return false;
  }
  return false;
}

export function searchFieldValues(entity: CommunityEntity, field: string): readonly CommunityFieldScalar[] {
  return values(entity, field);
}

function values(entity: CommunityEntity, field: string): readonly CommunityFieldScalar[] {
  const special: Readonly<Record<string, CommunityFieldValue | undefined>> = {
    objectId: entity.ref.objectId,
    kind: entity.ref.kind,
    createdAt: entity.createdAt,
    updatedAt: entity.updatedAt,
    visibility: entity.visibility,
    owner: entity.ownerId,
    uri: entity.provenance.uri,
    tombstone: entity.tombstone !== undefined,
  };
  const value = special[field] ?? entity.fields[field] ?? entity.searchableText[field];
  return value === undefined ? [] : Array.isArray(value) ? value : [value as CommunityFieldScalar];
}

function compareCandidates(candidates: readonly CommunityFieldScalar[], operator: "eq" | "ne" | "lt" | "lte" | "gt" | "gte" | "in", expected: CommunityFieldValue): boolean {
  const wanted = Array.isArray(expected) ? expected : [expected as CommunityFieldScalar];
  if (operator === "ne") return candidates.every((candidate) => wanted.every((value) => compare(candidate, value) !== 0));
  if (operator === "in") return candidates.some((candidate) => wanted.some((value) => compare(candidate, value) === 0));
  return candidates.some((candidate) => wanted.some((value) => {
    const result = compare(candidate, value);
    return operator === "eq" ? result === 0 : operator === "lt" ? result < 0 : operator === "lte" ? result <= 0 : operator === "gt" ? result > 0 : result >= 0;
  }));
}

function compare(left: CommunityFieldScalar, right: CommunityFieldScalar): number {
  if (left === right) return 0;
  if (left === null) return -1;
  if (right === null) return 1;
  if (typeof left !== typeof right) return Number.NaN;
  if (typeof left === "number" && typeof right === "number") return left - right;
  if (typeof left === "boolean" && typeof right === "boolean") return Number(left) - Number(right);
  return String(left).localeCompare(String(right), "en", { sensitivity: "variant" });
}

function inRange(value: CommunityFieldScalar, range: Extract<SearchExpression, { readonly kind: "range" }>): boolean {
  if (value === null) return false;
  const lower = range.lower === undefined ? true : range.includeLower ? compare(value, range.lower) >= 0 : compare(value, range.lower) > 0;
  const upper = range.upper === undefined ? true : range.includeUpper ? compare(value, range.upper) <= 0 : compare(value, range.upper) < 0;
  return lower && upper;
}

function textMatches(candidate: string, query: string, mode: "term" | "phrase" | "prefix"): boolean {
  const normalizedCandidate = normalizeText(candidate);
  const normalizedQuery = normalizeText(query);
  if (mode === "phrase") return normalizedCandidate.includes(normalizedQuery);
  const words = tokenize(normalizedCandidate);
  return mode === "prefix" ? words.some((word) => word.startsWith(normalizedQuery)) : words.includes(normalizedQuery);
}

function normalizeText(value: string): string {
  return value.normalize("NFKC").toLocaleLowerCase("en-US");
}

function tokenize(value: string): readonly string[] {
  return value.match(/[\p{L}\p{N}_+-]+/gu) ?? [];
}
