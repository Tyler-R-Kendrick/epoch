import { canReadCommunityResource, type CommunityAuthorizationContext } from "./authorization";
import type { CommunityEntity } from "./entity";
import type { CommunityFieldRegistry } from "./fields";
import type { CommunityRuntimeContext } from "./runtime-context";
import { authorizationFingerprint } from "./runtime-context";
import { CommunityError } from "./errors";
import { canonicalExpressionJson, stableQueryHash, type SearchExpression, type SearchOrder } from "./search-expression";
import type { PageRequest, SearchBackend, SearchPage } from "./search-backend";
import { createSearchPlan, type SearchPlan, type SearchPlanningSource } from "./search-plan";
import { createSearchSnapshot, type SearchSnapshot } from "./snapshot";
import {
  abortSource,
  boundedSourcePageSize,
  validateSourceCapabilities,
  type CommunitySourceAdapter,
  type CommunitySourceCapabilities,
} from "./source";

export interface SearchRequest {
  readonly expression: SearchExpression;
  readonly order: readonly SearchOrder[];
  readonly authorization: CommunityAuthorizationContext;
  readonly first: number;
  readonly after?: string;
  readonly snapshot?: SearchSnapshot;
  readonly signal?: AbortSignal;
}

export class SearchService {
  readonly #backend: SearchBackend;
  readonly #registry: CommunityFieldRegistry;
  readonly #context: CommunityRuntimeContext;
  readonly #sources: readonly SearchPlanningSource[];

  constructor(input: {
    readonly backend: SearchBackend;
    readonly registry: CommunityFieldRegistry;
    readonly context: CommunityRuntimeContext;
    readonly sources: readonly SearchPlanningSource[];
  }) {
    this.#backend = input.backend;
    this.#registry = input.registry;
    this.#context = input.context;
    this.#sources = input.sources;
  }

  async plan(input: {
    readonly expression: SearchExpression;
    readonly order: readonly SearchOrder[];
    readonly authorization: CommunityAuthorizationContext;
    readonly limit: number;
    readonly snapshot?: SearchSnapshot;
  }): Promise<SearchPlan> {
    const queryHash = stableQueryHash(canonicalExpressionJson(input.expression));
    if (input.snapshot !== undefined) {
      const fingerprint = await authorizationFingerprint(input.authorization);
      if (input.snapshot.authorizationFingerprint !== fingerprint || input.snapshot.queryHash !== queryHash
        || input.snapshot.fieldRegistryVersion !== this.#registry.version
        || !sameCheckpoints(input.snapshot.sourceCheckpoints, this.#sources.map((source) => source.checkpoint))) {
        throw new CommunityError("CURSOR_STALE", "Search snapshot does not match the query, sources, field registry, or authorization context");
      }
    }
    const seed = input.snapshot ?? await createSearchSnapshot({
      context: this.#context,
      queryHash,
      planHash: "pending",
      fieldRegistryVersion: this.#registry.version,
      analyzerVersion: "epoch-tokenizer-v1",
      authorization: input.authorization,
      sourceCheckpoints: this.#sources.map((source) => source.checkpoint),
    });
    return createSearchPlan({
      expression: input.expression,
      order: input.order,
      sources: this.#sources,
      registry: this.#registry,
      authorization: input.authorization,
      authorizationFingerprint: seed.authorizationFingerprint,
      snapshot: seed,
      limit: input.limit,
    });
  }

  async search(input: SearchRequest): Promise<SearchPage> {
    if (input.signal?.aborted === true) throw new DOMException("Search was cancelled", "AbortError");
    const planInput = {
      expression: input.expression,
      order: input.order,
      authorization: input.authorization,
      limit: input.first,
    };
    const plan = input.snapshot === undefined
      ? await this.plan(planInput)
      : await this.plan({ ...planInput, snapshot: input.snapshot });
    const page: PageRequest = input.after === undefined ? { first: input.first } : { first: input.first, after: input.after };
    return this.#backend.search(plan, page, input.signal);
  }
}

function sameCheckpoints(
  left: readonly SearchPlanningSource["checkpoint"][],
  right: readonly SearchPlanningSource["checkpoint"][],
): boolean {
  const ordered = (values: readonly SearchPlanningSource["checkpoint"][]) => [...values].sort((a, b) => a.sourceId.localeCompare(b.sourceId, "en"));
  const a = ordered(left);
  const b = ordered(right);
  return a.length === b.length && a.every((value, index) => {
    const other = b[index];
    return other !== undefined && value.sourceId === other.sourceId && value.token === other.token
      && value.observedAt === other.observedAt && value.status === other.status;
  });
}

export async function createSearchServiceFromSources(input: {
  readonly backend: SearchBackend;
  readonly registry: CommunityFieldRegistry;
  readonly context: CommunityRuntimeContext;
  readonly sources: readonly CommunitySourceAdapter[];
  readonly authorization: CommunityAuthorizationContext;
  readonly signal?: AbortSignal;
  readonly pageSize?: number;
  readonly maxPagesPerSource?: number;
  readonly maxEntities?: number;
}): Promise<SearchService> {
  const maxPages = input.maxPagesPerSource ?? 1_000;
  const maxEntities = input.maxEntities ?? 100_000;
  if (input.sources.length > 32 || !Number.isSafeInteger(maxPages) || maxPages < 1
    || !Number.isSafeInteger(maxEntities) || maxEntities < 1) {
    throw new CommunityError("QUERY_COST_LIMIT", "Registered source hydration exceeds configured bounds");
  }
  const configured = input.sources.map((source) => {
    const capabilities = validateSourceCapabilities(source.capabilities());
    if (capabilities.sourceId !== source.sourceId) {
      throw new CommunityError("QUERY_UNSUPPORTED_SOURCE", "Source capability identity does not match its registered identity");
    }
    return { source, capabilities };
  });
  if (new Set(configured.map(({ source }) => source.sourceId)).size !== configured.length) {
    throw new CommunityError("QUERY_UNSUPPORTED_SOURCE", "Registered source IDs must be unique");
  }

  const failureObservedAt = input.context.clock.now().toISOString();
  const scans = await Promise.all(configured.map(({ source, capabilities }) => scanSource({
    source,
    capabilities,
    authorization: input.authorization,
    failureObservedAt,
    pageSize: input.pageSize ?? 1_000,
    maxPages,
    signal: input.signal,
  })));
  const entities = new Map<string, CommunityEntity>();
  for (const scan of scans) for (const entity of scan.entities) {
    if (!canReadCommunityResource({
      kind: entity.ref.kind,
      resourceId: entity.ref.objectId,
      visibility: entity.visibility,
      ownerId: entity.ownerId,
      participantIds: entity.participantIds,
    }, input.authorization)) continue;
    if (entities.has(entity.ref.objectId)) {
      throw new CommunityError("INVALID_ENTITY", "Multiple registered sources produced the same canonical Entity without an authoritative reconciliation", {
        objectId: entity.ref.objectId,
      });
    }
    entities.set(entity.ref.objectId, entity);
    if (entities.size > maxEntities) throw new CommunityError("QUERY_COST_LIMIT", `Registered sources exceed the ${maxEntities} Entity hydration limit`);
  }
  await input.backend.rebuild(entities.values());
  return new SearchService({
    backend: input.backend,
    registry: input.registry,
    context: input.context,
    sources: scans.map(({ capabilities, checkpoint }) => planningSource(capabilities, checkpoint)),
  });
}

async function scanSource(input: {
  readonly source: CommunitySourceAdapter;
  readonly capabilities: CommunitySourceCapabilities;
  readonly authorization: CommunityAuthorizationContext;
  readonly failureObservedAt: string;
  readonly pageSize: number;
  readonly maxPages: number;
  readonly signal?: AbortSignal;
}): Promise<{
  readonly entities: readonly CommunityEntity[];
  readonly capabilities: CommunitySourceCapabilities;
  readonly checkpoint: SearchPlanningSource["checkpoint"];
}> {
  const unavailable = (): SearchPlanningSource["checkpoint"] => ({
    sourceId: input.source.sourceId,
    token: "unavailable",
    observedAt: input.failureObservedAt,
    status: "unavailable",
    detail: "The registered source could not provide a verified page",
  });
  try {
    if (input.signal !== undefined) abortSource(input.signal);
    let checkpoint = await input.source.checkpoint();
    if (checkpoint.sourceId !== input.source.sourceId) throw new Error("checkpoint source mismatch");
    let observedAt = validObservedAt(checkpoint.observedAt);
    const entities: CommunityEntity[] = [];
    const cursors = new Set<string>();
    let after: string | undefined;
    for (let pageNumber = 0; pageNumber < input.maxPages; pageNumber += 1) {
      if (input.signal !== undefined) abortSource(input.signal);
      const scanInput = {
        limit: boundedSourcePageSize(input.pageSize, input.capabilities),
        authorization: input.authorization,
      };
      const page = await input.source.scan(after === undefined ? scanInput : { ...scanInput, after });
      if (page.checkpoint.sourceId !== input.source.sourceId) throw new Error("page checkpoint source mismatch");
      const pageObservedAt = validObservedAt(page.checkpoint.observedAt);
      if (page.checkpoint.status === "current" && pageObservedAt < observedAt) throw new Error("source checkpoint regressed");
      entities.push(...page.entities);
      checkpoint = page.checkpoint;
      observedAt = pageObservedAt;
      if (page.next === undefined) return { entities: Object.freeze(entities), capabilities: input.capabilities, checkpoint };
      if (input.capabilities.pagination === "none" || cursors.has(page.next)) throw new Error("source pagination did not advance");
      cursors.add(page.next);
      after = page.next;
    }
    return { entities: [], capabilities: input.capabilities, checkpoint: unavailable() };
  } catch (error) {
    if (error instanceof DOMException && error.name === "AbortError") throw error;
    return { entities: [], capabilities: input.capabilities, checkpoint: unavailable() };
  }
}

function validObservedAt(value: string): number {
  const timestamp = Date.parse(value);
  if (!Number.isFinite(timestamp) || new Date(timestamp).toISOString() !== value) throw new Error("source checkpoint time is invalid");
  return timestamp;
}

function planningSource(
  capabilities: CommunitySourceCapabilities,
  checkpoint: SearchPlanningSource["checkpoint"],
): SearchPlanningSource {
  return Object.freeze({
    sourceId: capabilities.sourceId,
    fields: Object.freeze(Object.fromEntries(Object.entries(capabilities.fields).map(([name, field]) => [name, {
      operators: field.operators,
      sortable: field.sortable,
      facetable: field.facetable,
    }]))),
    fullText: capabilities.fullText,
    supportsRelations: capabilities.supportsRelations,
    checkpoint,
  });
}
