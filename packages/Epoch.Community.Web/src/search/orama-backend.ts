import { create, insertMultiple, search } from "@orama/orama";
import {
  CommunityError,
  ReferenceSearchBackend,
  type CommunityEntity,
  type CommunityFieldRegistry,
  type CommunitySearchChangeSet,
  type FacetResult,
  type PageRequest,
  type SearchBackend,
  type SearchExplanation,
  type SearchPage,
  type SearchPlan,
  type Suggestion,
  type SuggestRequest,
} from "@epoch/community-core";
import {
  checkpointOf,
  lexicalDocuments,
  type BrowserIndexHealth,
  type BrowserLexicalIndex,
  type OramaLexicalDocument,
} from "./browser-index";

export const ORAMA_BACKEND_VERSION = "3.1.18";
export const ORAMA_ANALYZER_VERSION = "orama-3.1.18-en-v1";
const ORAMA_SCHEMA = { objectId: "string", text: "string" } as const;

export function createOramaLexicalIndex(): BrowserLexicalIndex {
  let database = create({ schema: ORAMA_SCHEMA, language: "english" });
  let health: BrowserIndexHealth = {
    backendId: "orama-browser",
    backendVersion: ORAMA_BACKEND_VERSION,
    analyzerVersion: ORAMA_ANALYZER_VERSION,
    documentCount: 0,
    generation: 0,
    state: "ready",
  };
  let closed = false;
  const ensureOpen = (): void => { if (closed) throw new CommunityError("INDEX_STALE", "Orama browser index is closed"); };
  const index: BrowserLexicalIndex = {
    rebuild: async (documents: readonly OramaLexicalDocument[]) => {
      ensureOpen();
      const next = create({ schema: ORAMA_SCHEMA, language: "english" });
      health = { ...health, state: "rebuilding" };
      try {
        if (documents.length > 0) await insertMultiple(next, documents.map((document) => ({
          id: document.objectId,
          objectId: document.objectId,
          text: document.text,
        })), 500);
        database = next;
        health = { ...health, documentCount: documents.length, generation: health.generation + 1, state: "ready" };
      } catch (error) {
        health = { ...health, state: "stale" };
        throw new CommunityError("INDEX_STALE", "Orama rebuild failed; the previous generation remains active", undefined, { cause: error });
      }
    },
    search: async ({ query, allowedObjectIds, limit, signal }: Parameters<BrowserLexicalIndex["search"]>[0]) => {
      ensureOpen();
      abort(signal);
      validateLexicalRequest(query, allowedObjectIds, limit);
      if (allowedObjectIds.length === 0) return [];
      const result = await search(database, {
        term: query,
        properties: ["text"],
        where: { objectId: [...allowedObjectIds] },
        tolerance: 0,
        threshold: 0,
        limit,
      });
      abort(signal);
      const authorized = new Set(allowedObjectIds);
      const seen = new Set<string>();
      const hits = Object.freeze(result.hits.flatMap((hit) => {
        const objectId = String((hit.document as unknown as { readonly objectId: unknown }).objectId);
        if (!authorized.has(objectId) || seen.has(objectId) || !Number.isFinite(hit.score)) return [];
        seen.add(objectId);
        return [Object.freeze({ objectId, score: hit.score })];
      }));
      health = { ...health, lastCandidateCount: hits.length };
      return hits;
    },
    health: () => Object.freeze({ ...health }),
    close: async () => {
      closed = true;
      database = create({ schema: ORAMA_SCHEMA, language: "english" });
      health = { ...health, documentCount: 0, state: "closed" };
    },
  };
  return Object.freeze(index);
}

export class OramaSearchBackend implements SearchBackend {
  readonly backendId = "orama-browser";
  readonly backendVersion = ORAMA_BACKEND_VERSION;
  readonly #registry: CommunityFieldRegistry;
  readonly #cursorKey: Uint8Array;
  readonly #index: BrowserLexicalIndex;
  #reference: ReferenceSearchBackend;
  #entities = new Map<string, CommunityEntity>();
  #closed = false;
  #lastCheckpoint?: string;

  constructor(input: {
    readonly registry: CommunityFieldRegistry;
    readonly cursorKey: Uint8Array;
    readonly index: BrowserLexicalIndex;
  }) {
    this.#registry = input.registry;
    this.#cursorKey = new Uint8Array(input.cursorKey);
    this.#index = input.index;
    this.#reference = this.#newReference();
  }

  async rebuild(input: AsyncIterable<CommunityEntity> | Iterable<CommunityEntity>): Promise<void> {
    this.#ensureOpen();
    const next = new Map<string, CommunityEntity>();
    for await (const entity of input) next.set(entity.ref.objectId, entity);
    await this.#replace(next);
  }

  async apply(changes: CommunitySearchChangeSet): Promise<void> {
    this.#ensureOpen();
    const next = new Map(this.#entities);
    for (const ref of changes.deletes) next.delete(ref.objectId);
    for (const entity of changes.upserts) next.set(entity.ref.objectId, entity);
    await this.#replace(next);
    this.#lastCheckpoint = checkpointOf(changes);
  }

  async search(plan: SearchPlan, page: PageRequest, signal?: AbortSignal): Promise<SearchPage> {
    this.#ensureOpen();
    abort(signal);
    const query = lexicalProbe(plan.expression);
    if (query !== undefined) {
      const visible = [...this.#entities.values()].filter(plan.canRead);
      const allowed = visible.map((entity) => entity.ref.objectId);
      // The index is an authorization-scoped candidate accelerator. Core remains
      // the final residual evaluator and ordering authority for exact parity.
      const candidateIds = new Set((await this.#index.search({
        query,
        allowedObjectIds: allowed,
        limit: Math.min(allowed.length, 100_000),
        signal,
      })).map((candidate) => candidate.objectId));
      const residual = this.#newReference();
      await residual.rebuild(visible.filter((entity) => candidateIds.has(entity.ref.objectId)));
      try {
        return await residual.search(plan, page, signal);
      } finally {
        await residual.close();
      }
    }
    abort(signal);
    return this.#reference.search(plan, page, signal);
  }

  facets(plan: SearchPlan, fields: readonly string[]): Promise<readonly FacetResult[]> {
    this.#ensureOpen();
    return this.#reference.facets(plan, fields);
  }

  suggest(input: SuggestRequest): Promise<readonly Suggestion[]> {
    this.#ensureOpen();
    return this.#reference.suggest(input);
  }

  async explain(plan: SearchPlan): Promise<SearchExplanation> {
    this.#ensureOpen();
    const reference = await this.#reference.explain(plan);
    return Object.freeze({ ...reference, backendId: this.backendId });
  }

  health(): BrowserIndexHealth {
    const value = this.#index.health();
    return Object.freeze({ ...value, ...(this.#lastCheckpoint === undefined ? {} : { lastCheckpoint: this.#lastCheckpoint }) });
  }

  async close(): Promise<void> {
    if (this.#closed) return;
    this.#closed = true;
    await Promise.all([this.#index.close(), this.#reference.close()]);
    this.#entities.clear();
  }

  async #replace(next: ReadonlyMap<string, CommunityEntity>): Promise<void> {
    // A fresh dual generation trades update throughput for rollback-safe browser
    // indexing: neither the reference evaluator nor Orama observes a half-update.
    const reference = this.#newReference();
    await reference.rebuild(next.values());
    try {
      await this.#index.rebuild(lexicalDocuments([...next.values()]));
    } catch (error) {
      await reference.close();
      throw error;
    }
    await this.#reference.close();
    this.#reference = reference;
    this.#entities = new Map(next);
  }

  #newReference(): ReferenceSearchBackend {
    return new ReferenceSearchBackend({ registry: this.#registry, cursorKey: this.#cursorKey });
  }

  #ensureOpen(): void {
    if (this.#closed) throw new CommunityError("INDEX_STALE", "Orama search backend is closed");
  }
}

function lexicalProbe(expression: SearchPlan["expression"]): string | undefined {
  switch (expression.kind) {
    case "text": return expression.mode === "term" && /^[A-Za-z0-9_]+$/u.test(expression.value)
      ? expression.value : undefined;
    case "and": return expression.terms.some(containsRelation)
      ? undefined : expression.terms.map(lexicalProbe).find((value) => value !== undefined);
    case "or": case "not": case "all": case "compare": case "range": case "exists": case "related": return undefined;
  }
}

function containsRelation(expression: SearchPlan["expression"]): boolean {
  switch (expression.kind) {
    case "related": return true;
    case "and": case "or": return expression.terms.some(containsRelation);
    case "not": return containsRelation(expression.term);
    case "all": case "text": case "compare": case "range": case "exists": return false;
  }
}

function validateLexicalRequest(query: string, allowedObjectIds: readonly string[], limit: number): void {
  if (query.length === 0 || new TextEncoder().encode(query).length > 16_384) {
    throw new CommunityError("QUERY_COST_LIMIT", "Orama lexical query must be a non-empty bounded value");
  }
  if (!Number.isSafeInteger(limit) || limit < 1 || limit > 100_000 || allowedObjectIds.length > 100_000) {
    throw new CommunityError("QUERY_COST_LIMIT", "Orama candidate request exceeds the supported limit");
  }
  if (allowedObjectIds.some((id) => !/^[A-Za-z0-9][A-Za-z0-9._~-]{0,127}$/u.test(id))) {
    throw new CommunityError("INVALID_ENTITY", "Orama candidate authorization contains an invalid object ID");
  }
}

function abort(signal: AbortSignal | undefined): void {
  if (signal?.aborted === true) throw new DOMException("Search was cancelled", "AbortError");
}
