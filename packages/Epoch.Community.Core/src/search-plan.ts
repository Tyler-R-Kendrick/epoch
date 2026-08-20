import type { CommunityAuthorizationContext } from "./authorization";
import type { CommunityEntity } from "./entity";
import { CommunityError } from "./errors";
import type { CommunityFieldOperator, CommunityFieldRegistry } from "./fields";
import { canonicalExpressionJson, stableQueryHash, type SearchExpression, type SearchOrder } from "./search-expression";
import type { CommunitySourceCheckpoint, SearchSnapshot } from "./snapshot";

export interface SearchPlanningSource {
  readonly sourceId: string;
  readonly fields: Readonly<Record<string, {
    readonly operators: readonly CommunityFieldOperator[];
    readonly sortable: boolean;
    readonly facetable: boolean;
  }>>;
  readonly fullText: "none" | "substring" | "lexical";
  readonly supportsRelations: boolean;
  readonly checkpoint: CommunitySourceCheckpoint;
}

export interface SourceSearchPlan {
  readonly sourceId: string;
  readonly pushdown: SearchExpression;
  readonly residual: SearchExpression;
  readonly checkpoint: CommunitySourceCheckpoint;
  readonly estimatedCost: number;
}

export interface SearchPlan {
  readonly planVersion: number;
  readonly planHash: string;
  readonly expression: SearchExpression;
  readonly order: readonly SearchOrder[];
  readonly sourcePlans: readonly SourceSearchPlan[];
  readonly residual: SearchExpression;
  readonly authorizationFingerprint: string;
  readonly snapshot: SearchSnapshot;
  readonly limit: number;
  readonly canRead: (entity: CommunityEntity) => boolean;
  readonly canObserveField: (field: string) => boolean;
}

export interface SearchPlanLimits {
  readonly maxCost?: number;
  readonly maxSources?: number;
  readonly maxLimit?: number;
}

export function createSearchPlan(input: {
  readonly expression: SearchExpression;
  readonly order: readonly SearchOrder[];
  readonly sources: readonly SearchPlanningSource[];
  readonly registry: CommunityFieldRegistry;
  readonly authorization: CommunityAuthorizationContext;
  readonly authorizationFingerprint: string;
  readonly snapshot: SearchSnapshot;
  readonly limit: number;
  readonly limits?: SearchPlanLimits;
  readonly canRead?: (entity: CommunityEntity, authorization: CommunityAuthorizationContext) => boolean;
}): SearchPlan {
  const maxSources = input.limits?.maxSources ?? 32;
  const maxLimit = input.limits?.maxLimit ?? 1000;
  if (input.sources.length > maxSources) throw new CommunityError("QUERY_COST_LIMIT", `Query exceeds the ${maxSources} source fanout limit`);
  if (!Number.isSafeInteger(input.limit) || input.limit < 1 || input.limit > maxLimit) throw new CommunityError("QUERY_COST_LIMIT", `Query result limit must be between 1 and ${maxLimit}`);
  validateExpression(input.expression, input.registry, input.authorization);
  const order = totalOrder(input.order, input.registry, input.authorization);
  const sourcePlans = input.sources.map((source) => partitionSource(input.expression, source));
  const cost = sourcePlans.reduce((total, source) => total + source.estimatedCost, 0);
  const maxCost = input.limits?.maxCost ?? 10_000;
  if (cost > maxCost) throw new CommunityError("QUERY_COST_LIMIT", `Query estimated cost ${cost} exceeds limit ${maxCost}`, { estimatedCost: cost, maxCost });
  const planHash = stableQueryHash(JSON.stringify({
    version: 1,
    // SAFETY: The surrounding validation and domain contract establish the asserted type.
    expression: JSON.parse(canonicalExpressionJson(input.expression)) as unknown,
    order,
    sources: sourcePlans.map(({ sourceId, pushdown, residual, checkpoint }) => ({
      sourceId,
      // SAFETY: The surrounding validation and domain contract establish the asserted type.
      pushdown: JSON.parse(canonicalExpressionJson(pushdown)) as unknown,
      // SAFETY: The surrounding validation and domain contract establish the asserted type.
      residual: JSON.parse(canonicalExpressionJson(residual)) as unknown,
      checkpoint: checkpoint.token,
    })),
    authorizationFingerprint: input.authorizationFingerprint,
    limit: input.limit,
  }));
  const snapshot = Object.freeze({ ...input.snapshot, planHash });
  return Object.freeze({
    planVersion: 1,
    planHash,
    expression: input.expression,
    order,
    sourcePlans: Object.freeze(sourcePlans),
    residual: input.expression,
    authorizationFingerprint: input.authorizationFingerprint,
    snapshot,
    limit: input.limit,
    canRead: (entity: CommunityEntity) => input.canRead?.(entity, input.authorization) ?? defaultCanRead(entity, input.authorization),
    canObserveField: (name: string) => {
      const definition = input.registry.resolve(name);
      return definition !== undefined && input.registry.list(input.authorization).includes(definition);
    },
  });
}

function validateExpression(expression: SearchExpression, registry: CommunityFieldRegistry, authorization: CommunityAuthorizationContext): void {
  switch (expression.kind) {
    case "all": return;
    case "and": case "or": expression.terms.forEach((term) => validateExpression(term, registry, authorization)); return;
    case "not": validateExpression(expression.term, registry, authorization); return;
    case "related":
      if (expression.maxDepth < 1 || expression.maxDepth > 8) throw new CommunityError("QUERY_COST_LIMIT", "Relation depth must be between 1 and 8");
      return;
    case "text":
      for (const name of expression.fields) requireField(name, expression.mode, registry, authorization);
      return;
    case "exists": requireField(expression.field, "exists", registry, authorization); return;
    case "range": requireField(expression.field, "gte", registry, authorization); return;
    case "compare": requireField(expression.field, expression.operator, registry, authorization); return;
  }
}

function requireField(name: string, operator: CommunityFieldOperator, registry: CommunityFieldRegistry, authorization: CommunityAuthorizationContext): void {
  const field = registry.resolve(name);
  const visible = registry.list(authorization).some((candidate) => candidate.name === field?.name);
  if (field === undefined || !visible) throw new CommunityError("QUERY_UNKNOWN_FIELD", `Unknown or unavailable query field: ${name}`, { suggestions: registry.suggest(name, authorization) });
  if (!field.operators.includes(operator)) throw new CommunityError("QUERY_INVALID_OPERATOR", `${operator} is not supported for ${field.name}`);
}

function totalOrder(input: readonly SearchOrder[], registry: CommunityFieldRegistry, authorization: CommunityAuthorizationContext): readonly SearchOrder[] {
  const result = [...input];
  if (result.length === 0) result.push({ field: "updatedAt", direction: "descending", nulls: "last" });
  for (const order of result) {
    const field = registry.resolve(order.field);
    if (field === undefined || !registry.list(authorization).includes(field) || !field.sortable) throw new CommunityError("QUERY_INVALID_OPERATOR", `Field is not sortable: ${order.field}`);
  }
  for (const field of ["kind", "objectId"]) {
    if (!result.some((order) => order.field === field)) result.push({ field, direction: "ascending", nulls: "last" });
  }
  return Object.freeze(result);
}

function partitionSource(expression: SearchExpression, source: SearchPlanningSource): SourceSearchPlan {
  const [pushdown, residual] = partition(expression, source);
  return Object.freeze({
    sourceId: source.sourceId,
    pushdown,
    residual,
    checkpoint: source.checkpoint,
    estimatedCost: estimate(expression),
  });
}

function partition(expression: SearchExpression, source: SearchPlanningSource): readonly [SearchExpression, SearchExpression] {
  if (expression.kind === "and") {
    const pushed: SearchExpression[] = [];
    const residual: SearchExpression[] = [];
    for (const term of expression.terms) {
      const [left, right] = partition(term, source);
      if (left.kind !== "all") pushed.push(left);
      if (right.kind !== "all") residual.push(right);
    }
    return [combineAnd(pushed), combineAnd(residual)];
  }
  return supported(expression, source) ? [expression, { kind: "all" }] : [{ kind: "all" }, expression];
}

function supported(expression: SearchExpression, source: SearchPlanningSource): boolean {
  switch (expression.kind) {
    case "all": return true;
    case "and": case "or": return expression.terms.every((term) => supported(term, source));
    case "not": return supported(expression.term, source);
    case "related": return source.supportsRelations;
    case "text": return source.fullText !== "none" && expression.fields.every((field) => source.fields[field]?.operators.includes(expression.mode));
    case "range": return source.fields[expression.field]?.operators.includes("gte") === true;
    case "exists": return source.fields[expression.field]?.operators.includes("exists") === true;
    case "compare": return source.fields[expression.field]?.operators.includes(expression.operator) === true;
  }
}

function combineAnd(terms: readonly SearchExpression[]): SearchExpression {
  // SAFETY: The surrounding validation and domain contract establish the asserted type.
  return terms.length === 0 ? { kind: "all" } : terms.length === 1 ? terms[0] as SearchExpression : { kind: "and", terms };
}

function estimate(expression: SearchExpression): number {
  switch (expression.kind) {
    case "all": return 1;
    case "and": case "or": return 1 + expression.terms.reduce((total, term) => total + estimate(term), 0);
    case "not": return 1 + estimate(expression.term);
    case "text": return 3 + expression.value.length;
    case "related": return 10 * expression.maxDepth;
    default: return 2;
  }
}

function defaultCanRead(entity: CommunityEntity, authorization: CommunityAuthorizationContext): boolean {
  if (entity.ref.kind === "dm") return authorization.actorId !== undefined && (
    entity.participantIds.includes(authorization.actorId) || authorization.readableDmIds?.includes(entity.ref.objectId) === true
  );
  if (entity.visibility === "public") return true;
  if (authorization.actorId === undefined) return false;
  return entity.ownerId === authorization.actorId || (entity.visibility === "shared" && entity.participantIds.includes(authorization.actorId));
}
