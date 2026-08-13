import type { CommunityEntity, CommunityProvenance } from "./entity";
import type { CommunityFieldRegistry } from "./fields";
import type { CommunityObjectRef } from "./identity";
import { createKeysetCursorCodec, type KeysetCursorCodec } from "./cursor";
import { evaluateSearchExpression, searchFieldValues } from "./query-evaluator";
import type { SearchPlan } from "./search-plan";
import type { CommunityFieldScalar } from "./search-expression";
import type { CommunitySourceCheckpoint, SearchSnapshot } from "./snapshot";

export interface CommunitySearchChangeSet {
  readonly sourceId: string;
  readonly checkpoint: CommunitySourceCheckpoint;
  readonly upserts: readonly CommunityEntity[];
  readonly deletes: readonly CommunityObjectRef[];
  readonly observedAt: string;
}

export interface PageRequest {
  readonly first: number;
  readonly after?: string;
}

export interface KeysetPageInfo {
  readonly hasNextPage: boolean;
  readonly startCursor?: string;
  readonly endCursor?: string;
}

export interface SearchCompleteness {
  readonly status: "complete" | "partial" | "stale" | "approximate";
  readonly sources: readonly CommunitySourceCheckpoint[];
  readonly omittedSources: readonly string[];
  readonly unsupportedPredicates: readonly string[];
}

export interface SearchHit {
  readonly target: CommunityObjectRef;
  readonly score?: number;
  readonly sortKey: readonly CommunityFieldScalar[];
  readonly matchedFields: readonly string[];
  readonly provenance: CommunityProvenance;
}

export interface SearchPage {
  readonly hits: readonly SearchHit[];
  readonly pageInfo: KeysetPageInfo;
  readonly snapshot: SearchSnapshot;
  readonly completeness: SearchCompleteness;
}

export interface FacetResult {
  readonly field: string;
  readonly values: readonly { readonly value: CommunityFieldScalar; readonly count: number }[];
}

export interface SuggestRequest {
  readonly plan: SearchPlan;
  readonly field: string;
  readonly prefix: string;
  readonly limit: number;
}

export interface Suggestion {
  readonly value: string;
  readonly count: number;
}

export interface SearchExplanation {
  readonly planHash: string;
  readonly backendId: string;
  readonly expression: unknown;
  readonly sourcePlans: readonly {
    readonly sourceId: string;
    readonly pushdown: unknown;
    readonly residual: unknown;
  }[];
  readonly ordering: readonly string[];
  readonly authorization: "pre-filtered";
}

export interface SearchBackend {
  readonly backendId: string;
  readonly backendVersion: string;
  apply(changes: CommunitySearchChangeSet): Promise<void>;
  search(plan: SearchPlan, page: PageRequest, signal?: AbortSignal): Promise<SearchPage>;
  facets(plan: SearchPlan, fields: readonly string[]): Promise<readonly FacetResult[]>;
  suggest(input: SuggestRequest): Promise<readonly Suggestion[]>;
  explain(plan: SearchPlan): Promise<SearchExplanation>;
  rebuild(entities: AsyncIterable<CommunityEntity> | Iterable<CommunityEntity>): Promise<void>;
  close(): Promise<void>;
}

interface Candidate { readonly entity: CommunityEntity; readonly hit: SearchHit }

export class ReferenceSearchBackend implements SearchBackend {
  readonly backendId = "epoch-reference";
  readonly backendVersion = "1";
  readonly #entities = new Map<string, CommunityEntity>();
  readonly #snapshots = new Map<string, readonly Candidate[]>();
  readonly #registry: CommunityFieldRegistry;
  readonly #cursor: KeysetCursorCodec;
  #closed = false;

  constructor(options: { readonly registry: CommunityFieldRegistry; readonly cursorKey: Uint8Array }) {
    this.#registry = options.registry;
    this.#cursor = createKeysetCursorCodec({ key: options.cursorKey });
  }

  async apply(changes: CommunitySearchChangeSet): Promise<void> {
    this.#ensureOpen();
    const next = new Map(this.#entities);
    for (const ref of changes.deletes) next.delete(ref.objectId);
    for (const entity of changes.upserts) next.set(entity.ref.objectId, entity);
    this.#entities.clear();
    for (const [id, entity] of next) this.#entities.set(id, entity);
  }

  async rebuild(input: AsyncIterable<CommunityEntity> | Iterable<CommunityEntity>): Promise<void> {
    this.#ensureOpen();
    const next = new Map<string, CommunityEntity>();
    for await (const entity of input) next.set(entity.ref.objectId, entity);
    this.#entities.clear();
    for (const [id, entity] of next) this.#entities.set(id, entity);
    this.#snapshots.clear();
  }

  async search(plan: SearchPlan, page: PageRequest, signal?: AbortSignal): Promise<SearchPage> {
    this.#ensureOpen();
    abort(signal);
    const candidates = this.#candidates(plan, signal);
    let start = 0;
    if (page.after !== undefined) {
      const cursor = await this.#cursor.decode(page.after, binding(plan));
      start = candidates.findIndex((candidate) => candidate.entity.ref.objectId === cursor.objectId
        && equalKeys(candidate.hit.sortKey, cursor.sortKey)) + 1;
      if (start === 0) start = candidates.length;
    }
    abort(signal);
    const selected = candidates.slice(start, start + page.first);
    const cursors = await Promise.all(selected.map((candidate) => this.#cursor.encode({
      version: 1,
      snapshotId: plan.snapshot.snapshotId,
      planHash: plan.planHash,
      authorizationFingerprint: plan.authorizationFingerprint,
      sortKey: candidate.hit.sortKey,
      objectId: candidate.entity.ref.objectId,
    })));
    return Object.freeze({
      hits: Object.freeze(selected.map(({ hit }) => hit)),
      pageInfo: Object.freeze({
        hasNextPage: start + selected.length < candidates.length,
        ...(cursors[0] === undefined ? {} : { startCursor: cursors[0] }),
        ...(cursors.at(-1) === undefined ? {} : { endCursor: cursors.at(-1) }),
      }),
      snapshot: plan.snapshot,
      completeness: completeness(plan.snapshot.sourceCheckpoints),
    });
  }

  async facets(plan: SearchPlan, fields: readonly string[]): Promise<readonly FacetResult[]> {
    this.#ensureOpen();
    const visible = this.#candidates(plan);
    return Object.freeze(fields.map((field) => {
      const definition = this.#registry.resolve(field);
      if (definition?.facetable !== true || !plan.canObserveField(field)) return { field, values: [] };
      const counts = new Map<string, { readonly value: CommunityFieldScalar; count: number }>();
      for (const { entity } of visible) for (const value of searchFieldValues(entity, definition.name)) {
        const key = JSON.stringify(value);
        const current = counts.get(key) ?? { value, count: 0 };
        counts.set(key, { value, count: current.count + 1 });
      }
      return Object.freeze({ field: definition.name, values: Object.freeze([...counts.values()]
        .sort((a, b) => b.count - a.count || scalarCompare(a.value, b.value))) });
    }));
  }

  async suggest(input: SuggestRequest): Promise<readonly Suggestion[]> {
    this.#ensureOpen();
    const definition = this.#registry.resolve(input.field);
    if (definition === undefined || !input.plan.canObserveField(input.field) || (!definition.searchable && !definition.facetable)) return [];
    const prefix = normalize(input.prefix);
    const counts = new Map<string, number>();
    for (const { entity } of this.#candidates(input.plan)) for (const value of searchFieldValues(entity, definition.name)) {
      if (typeof value !== "string" || !normalize(value).startsWith(prefix)) continue;
      counts.set(value, (counts.get(value) ?? 0) + 1);
    }
    return Object.freeze([...counts].map(([value, count]) => ({ value, count }))
      .sort((a, b) => b.count - a.count || a.value.localeCompare(b.value, "en")).slice(0, input.limit));
  }

  async explain(plan: SearchPlan): Promise<SearchExplanation> {
    const safeExpression = JSON.parse(JSON.stringify(plan.expression)) as unknown;
    return Object.freeze({
      planHash: plan.planHash,
      backendId: this.backendId,
      expression: safeExpression,
      sourcePlans: Object.freeze(plan.sourcePlans.map((source) => ({
        sourceId: source.sourceId,
        pushdown: JSON.parse(JSON.stringify(source.pushdown)) as unknown,
        residual: JSON.parse(JSON.stringify(source.residual)) as unknown,
      }))),
      ordering: Object.freeze(plan.order.map((order) => `${order.field}:${order.direction}:${order.nulls}`)),
      authorization: "pre-filtered" as const,
    });
  }

  async close(): Promise<void> {
    this.#closed = true;
    this.#entities.clear();
    this.#snapshots.clear();
  }

  #candidates(plan: SearchPlan, signal?: AbortSignal): readonly Candidate[] {
    const cacheKey = `${plan.snapshot.snapshotId}:${plan.planHash}:${plan.authorizationFingerprint}`;
    const cached = this.#snapshots.get(cacheKey);
    if (cached !== undefined) return cached;
    const candidates: Candidate[] = [];
    let inspected = 0;
    for (const entity of this.#entities.values()) {
      inspected += 1;
      if (inspected % 256 === 0) abort(signal);
      if (!plan.canRead(entity)) continue;
      const evaluation = evaluateSearchExpression(entity, plan.expression, {
        resolveEntity: (objectId) => {
          const resolved = this.#entities.get(objectId);
          return resolved !== undefined && plan.canRead(resolved) ? resolved : undefined;
        },
        relationsFor: (objectId) => [...this.#entities.values()].filter(plan.canRead).flatMap((candidate) => candidate.relations)
          .filter((relation) => relation.source.objectId === objectId || relation.target.objectId === objectId),
      });
      if (!evaluation.matches) continue;
      const sortKey = plan.order.map((order) => searchFieldValues(entity, order.field)[0] ?? null);
      candidates.push({
        entity,
        hit: Object.freeze({
          target: entity.ref,
          sortKey: Object.freeze(sortKey),
          matchedFields: evaluation.matchedFields,
          provenance: entity.provenance,
        }),
      });
    }
    candidates.sort((left, right) => compareCandidates(left, right, plan));
    const frozen = Object.freeze(candidates);
    this.#snapshots.set(cacheKey, frozen);
    if (this.#snapshots.size > 32) this.#snapshots.delete(this.#snapshots.keys().next().value as string);
    return frozen;
  }

  #ensureOpen(): void {
    if (this.#closed) throw new Error("Search backend is closed");
  }
}

function compareCandidates(left: Candidate, right: Candidate, plan: SearchPlan): number {
  for (let index = 0; index < plan.order.length; index += 1) {
    const order = plan.order[index];
    const a = left.hit.sortKey[index] ?? null;
    const b = right.hit.sortKey[index] ?? null;
    if (a === b) continue;
    if (a === null) return order?.nulls === "first" ? -1 : 1;
    if (b === null) return order?.nulls === "first" ? 1 : -1;
    const result = scalarCompare(a, b);
    if (result !== 0) return order?.direction === "descending" ? -result : result;
  }
  return left.entity.ref.objectId.localeCompare(right.entity.ref.objectId, "en");
}

function scalarCompare(left: CommunityFieldScalar, right: CommunityFieldScalar): number {
  if (left === right) return 0;
  if (left === null) return -1;
  if (right === null) return 1;
  if (typeof left === "number" && typeof right === "number") return left - right;
  if (typeof left === "boolean" && typeof right === "boolean") return Number(left) - Number(right);
  return String(left).localeCompare(String(right), "en", { sensitivity: "variant" });
}

function equalKeys(left: readonly CommunityFieldScalar[], right: readonly CommunityFieldScalar[]): boolean {
  return left.length === right.length && left.every((value, index) => value === right[index]);
}

function binding(plan: SearchPlan) {
  return { snapshotId: plan.snapshot.snapshotId, planHash: plan.planHash, authorizationFingerprint: plan.authorizationFingerprint };
}

function completeness(checkpoints: readonly CommunitySourceCheckpoint[]): SearchCompleteness {
  const omittedSources = checkpoints.filter((source) => source.status === "unavailable").map((source) => source.sourceId);
  const status = checkpoints.some((source) => source.status === "unavailable" || source.status === "partial") ? "partial"
    : checkpoints.some((source) => source.status === "stale") ? "stale" : "complete";
  return Object.freeze({ status, sources: checkpoints, omittedSources: Object.freeze(omittedSources), unsupportedPredicates: Object.freeze([]) });
}

function abort(signal: AbortSignal | undefined): void {
  if (signal?.aborted === true) throw new DOMException("Search was cancelled", "AbortError");
}

function normalize(value: string): string {
  return value.normalize("NFKC").toLocaleLowerCase("en-US");
}
