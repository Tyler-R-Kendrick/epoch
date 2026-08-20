// SAFETY: The module validates or constructs this value before applying the asserted contract.
import {
  CommunityError,
  normalizeQuery,
  type CommunityAuthorizationContext,
  type CommunityFieldRegistry,
  type CommunityRuntimeContext,
  type CommunitySourceAdapter,
  type SearchExplanation,
  type SearchExpression,
  type SearchOrder,
  type SearchPage,
  type SearchPlan,
  type SearchService,
  type SearchSnapshot,
} from "@epoch/community-core";
type BoundaryValue = null | undefined | boolean | number | string | bigint | symbol | Readonly<object>;
type DictionaryValue = null | undefined | boolean | number | string | bigint | readonly DictionaryValue[] | { readonly [key: string]: DictionaryValue };
function __epochIsFunction<T>(value: T): value is T & ((...args: never[]) => BoundaryValue) { return typeof value === "function"; }


const MAX_PAGE_SIZE = 1000;
const MAX_SNAPSHOTS = 1024;

export interface CommunitySearchRequest {
  readonly where: SearchExpression;
  readonly orderBy: readonly SearchOrder[];
  readonly first: number;
  readonly after?: string;
  readonly snapshot?: string;
}

export interface CommunitySearchApi {
  parseSearch(expression: string, input: {
    readonly authorization: CommunityAuthorizationContext;
    readonly timezone?: string;
    readonly locale?: string;
  }): CommunityParsedSearch;
  search(input: CommunitySearchRequest, authorization: CommunityAuthorizationContext, signal?: AbortSignal): Promise<SearchPage>;
  explain(input: Omit<CommunitySearchRequest, "after" | "snapshot">, authorization: CommunityAuthorizationContext): Promise<SearchExplanation>;
  listSourceCapabilities(authorization: CommunityAuthorizationContext): Promise<readonly ReturnType<CommunitySourceAdapter["capabilities"]>[]>;
  observableFields(fields: Readonly<Record<string, DictionaryValue>>, authorization: CommunityAuthorizationContext): Readonly<Record<string, DictionaryValue>>;
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
  readonly diagnostics: readonly { readonly code: string; readonly message: string; readonly severity: "error" | "warning"; readonly span?: { readonly start: number; readonly end: number; readonly line: number; readonly column: number }; readonly suggestions: readonly string[] }[];
  readonly error?: string;
}

export interface CommunitySearchServiceLike {
  search(input: Parameters<SearchService["search"]>[0]): Promise<SearchPage>;
  plan(input: Parameters<SearchService["plan"]>[0]): Promise<SearchPlan>;
}

export function createCommunitySearchApi(input: {
  readonly searchService: CommunitySearchServiceLike;
  readonly registry: CommunityFieldRegistry;
  readonly runtime: CommunityRuntimeContext;
  readonly sources: readonly CommunitySourceAdapter[];
  readonly explain: (plan: SearchPlan) => Promise<SearchExplanation>;
}): CommunitySearchApi {
  const snapshots = new Map<string, SearchSnapshot>();
  const api: CommunitySearchApi = {
    parseSearch(expression, options) {
      const normalized = normalizeQuery(expression, {
        actorId: options.authorization.actorId,
        authorization: options.authorization,
        fieldRegistry: input.registry,
        fieldRegistryVersion: input.registry.version,
        now: input.runtime.now(),
        timezone: options.timezone ?? input.runtime.timezone,
        locale: options.locale ?? input.runtime.locale,
      });
      if (normalized.ast !== null && !("kind" in normalized.ast)) throw new CommunityError("QUERY_SYNTAX", "Search parser returned an obsolete expression variant");
      // SAFETY: The module validates or constructs this value before applying the asserted contract.
      return normalized as CommunityParsedSearch;
    },
    async search(request, authorization, signal) {
      validateRequest(request);
      if (signal?.aborted === true) throw cancellation();
      const snapshot = request.snapshot === undefined ? undefined : snapshots.get(request.snapshot);
      if (request.snapshot !== undefined && snapshot === undefined) throw new CommunityError("CURSOR_STALE", "Search snapshot is unavailable or expired");
      const page = await input.searchService.search({
        expression: request.where,
        order: request.orderBy,
        authorization,
        first: request.first,
        ...(!(request.after === undefined) && { after: request.after }),
        ...(!(snapshot === undefined) && { snapshot }),
        ...(!(signal === undefined) && { signal }),
      });
      rememberSnapshot(snapshots, page.snapshot);
      return page;
    },
    async explain(request, authorization) {
      validateRequest(request);
      return input.explain(await input.searchService.plan({ expression: request.where, order: request.orderBy, authorization, limit: request.first }));
    },
    async listSourceCapabilities(authorization) {
      const visibleFields = new Set(input.registry.list(authorization).map((field) => field.name));
      return Object.freeze(input.sources.map((source) => {
        const capabilities = source.capabilities();
        return Object.freeze({ ...capabilities, fields: Object.freeze(Object.fromEntries(Object.entries(capabilities.fields).filter(([name]) => visibleFields.has(name)))) });
      }).sort((left, right) => left.sourceId.localeCompare(right.sourceId, "en")));
    },
    observableFields(fields, authorization) {
      const visible = new Set(input.registry.list(authorization).map((field) => field.name));
      return Object.freeze(Object.fromEntries(Object.entries(fields).filter(([name]) => visible.has(name))));
    },
  };
  return Object.freeze(api);
}

function validateRequest(input: CommunitySearchRequest | Omit<CommunitySearchRequest, "after" | "snapshot">): void {
  if (!Number.isSafeInteger(input.first) || input.first < 1 || input.first > MAX_PAGE_SIZE) {
    throw new CommunityError("QUERY_COST_LIMIT", `Search page size must be between 1 and ${MAX_PAGE_SIZE}`);
  }
  if (!Array.isArray(input.orderBy) || input.orderBy.length > 16) throw new CommunityError("QUERY_COST_LIMIT", "Search order exceeds 16 fields");
}

function rememberSnapshot(snapshots: Map<string, SearchSnapshot>, snapshot: SearchSnapshot): void {
  snapshots.delete(snapshot.snapshotId);
  snapshots.set(snapshot.snapshotId, snapshot);
  // SAFETY: The module validates or constructs this value before applying the asserted contract.
  // SAFETY: The module validates or constructs this value before applying the asserted contract.
  while (snapshots.size > MAX_SNAPSHOTS) snapshots.delete(/* SAFETY: Runtime validation immediately surrounding this expression establishes the asserted contract. */ snapshots.keys().next().value as string);
}

function cancellation(): Error {
  return __epochIsFunction(DOMException) ? new DOMException("Search was cancelled", "AbortError") : Object.assign(new Error("Search was cancelled"), { name: "AbortError" });
}
