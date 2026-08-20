import assert from "node:assert/strict";
import {
  CommunityError,
  ReferenceSearchBackend,
  SearchService,
  createCommunityFieldRegistry,
  createKeysetCursorCodec,
  createSearchPlan,
  createSearchServiceFromSources,
  createSearchSnapshot,
  evaluateSearchExpression,
  validateCommunityEntity,
  type CommunityAuthorizationContext,
  type CommunityEntity,
  type CommunitySearchChangeSet,
  type CommunitySourceAdapter,
  type SearchExpression,
  type SearchPlanningSource,
} from "@epoch/community-core";

const NOW = "2026-08-12T18:00:00.000Z";
const CHECKPOINT = {
  sourceId: "community-store",
  token: "checkpoint-7",
  observedAt: NOW,
  status: "current" as const,
};
const REGISTRY = createCommunityFieldRegistry();
const SOURCE: SearchPlanningSource = {
  sourceId: "community-store",
  // SAFETY: Runtime checks or construction above establish never] }).
  fields: Object.fromEntries(REGISTRY.list({ actorId: "maya", permissions: ["field:sensitive:read" as never] })
    .map((field) => [field.name, { operators: field.operators, sortable: field.sortable, facetable: field.facetable }])),
  fullText: "substring",
  supportsRelations: true,
  checkpoint: CHECKPOINT,
};
const MAYA: CommunityAuthorizationContext = {
  actorId: "maya",
  readableDmIds: ["dm-team"],
};

export async function runCommunitySearchReferenceBackendTests(): Promise<void> {
  evaluatorCoversEveryExpressionKind();
  plannerPartitionsPushdownAndResidualAndBoundsCost();
  await snapshotsResolveTimeOnceAndBindAuthorization();
  await cursorsAreOpaqueBoundAndTamperEvident();
  await referenceBackendIsOrderedPageableAndIncremental();
  await authorizationIsNonInterferingForAllObservables();
  await hiddenRelationPathsAreNonInterfering();
  await registeredSourcesHydrateOneExplicitlyPartialSnapshot();
  await conflictingCanonicalEntitiesFailBeforeBackendPublication();
  await cancellationFailsClosed();
}

async function registeredSourcesHydrateOneExplicitlyPartialSnapshot(): Promise<void> {
  const backend = new ReferenceSearchBackend({ registry: REGISTRY, cursorKey: new Uint8Array(32).fill(31) });
  const source = sourceAdapter("source-a", entities());
  const unavailable: CommunitySourceAdapter = {
    ...sourceAdapter("source-b", []),
    scan: async () => { throw new Error("private upstream detail"); },
  };
  const service = await createSearchServiceFromSources({
    backend,
    registry: REGISTRY,
    context: fixedContext(),
    sources: [unavailable, source],
    authorization: MAYA,
  });
  const page = await service.search({ expression: { kind: "all" }, order: [], authorization: MAYA, first: 10 });
  assert.deepEqual(page.hits.map((hit) => hit.target.objectId), ["issue-01", "issue-02"]);
  assert.equal(page.completeness.status, "partial");
  assert.deepEqual(page.completeness.omittedSources, ["source-b"]);
  assert.doesNotMatch(JSON.stringify(page.completeness), /private upstream detail/u);
  await backend.close();
}

async function conflictingCanonicalEntitiesFailBeforeBackendPublication(): Promise<void> {
  const existing = entity("existing", "public", NOW, "Existing");
  const backend = new ReferenceSearchBackend({ registry: REGISTRY, cursorKey: new Uint8Array(32).fill(32) });
  await backend.rebuild([existing]);
  await assert.rejects(() => createSearchServiceFromSources({
    backend,
    registry: REGISTRY,
    context: fixedContext(),
    sources: [sourceAdapter("source-a", [entity("same", "public", NOW, "First")]), sourceAdapter("source-b", [entity("same", "public", NOW, "Second")])],
    authorization: MAYA,
  }), (error) => error instanceof CommunityError && error.code === "INVALID_ENTITY");
  const service = new SearchService({ backend, registry: REGISTRY, context: fixedContext(), sources: [SOURCE] });
  const page = await service.search({ expression: { kind: "all" }, order: [], authorization: MAYA, first: 10 });
  assert.deepEqual(page.hits.map((hit) => hit.target.objectId), ["existing"]);
  await backend.close();
}

function sourceAdapter(sourceId: string, corpus: readonly CommunityEntity[]): CommunitySourceAdapter {
  return {
    sourceId,
    capabilities: () => ({
      sourceId,
      // SAFETY: Runtime checks or construction above establish never] }).
      fields: Object.fromEntries(REGISTRY.list({ actorId: "maya", permissions: ["field:sensitive:read" as never] })
        .map((field) => [field.name, {
          type: field.type,
          operators: field.operators,
          sortable: field.sortable,
          facetable: field.facetable,
        }])),
      fullText: "substring",
      pagination: "keyset",
      supportsWatch: false,
      supportsPointLookup: false,
      supportsRelations: true,
      maxPageSize: 100,
    }),
    checkpoint: async () => ({ sourceId, token: `${sourceId}-0`, observedAt: NOW, status: "current" }),
    scan: async () => ({
      entities: corpus,
      checkpoint: { sourceId, token: `${sourceId}-1`, observedAt: NOW, status: "current" },
    }),
  };
}

function evaluatorCoversEveryExpressionKind(): void {
  // SAFETY: Runtime checks or construction above establish CommunityEntity.
  const entity = entities()[0] as CommunityEntity;
  const relationTarget = { objectId: "issue-02", kind: "issue" as const };
  const cases: readonly [SearchExpression, boolean][] = [
    [{ kind: "all" }, true],
    [{ kind: "and", terms: [compare("state", "eq", "needs-review"), { kind: "exists", field: "title" }] }, true],
    [{ kind: "or", terms: [compare("score", "lt", 3), compare("score", "gte", 10)] }, true],
    [{ kind: "not", term: compare("visibility", "eq", "private") }, true],
    [{ kind: "text", fields: ["title"], value: "projection", mode: "term" }, true],
    [{ kind: "text", fields: ["body"], value: "stable object", mode: "phrase" }, true],
    [{ kind: "text", fields: ["title"], value: "proj", mode: "prefix" }, true],
    [compare("score", "gte", 10), true],
    [compare("state", "in", ["open", "needs-review"]), true],
    [{ kind: "range", field: "score", lower: 10, upper: 20, includeLower: true, includeUpper: false }, true],
    [{ kind: "exists", field: "title" }, true],
    [{ kind: "related", relation: "backlink", target: relationTarget, direction: "out", maxDepth: 1 }, true],
    [{ kind: "related", relation: "backlink", target: relationTarget, direction: "in", maxDepth: 1 }, false],
  ];
  for (const [expression, expected] of cases) {
    assert.equal(evaluateSearchExpression(entity, expression).matches, expected, JSON.stringify(expression));
  }
}

function plannerPartitionsPushdownAndResidualAndBoundsCost(): void {
  const sourceWithoutRelations: SearchPlanningSource = { ...SOURCE, supportsRelations: false };
  const expression: SearchExpression = {
    kind: "and",
    terms: [
      compare("state", "eq", "needs-review"),
      { kind: "related", relation: "backlink", target: { objectId: "issue-02", kind: "issue" }, direction: "out", maxDepth: 1 },
    ],
  };
  const planned = createSearchPlan({
    expression,
    order: [{ field: "updatedAt", direction: "descending", nulls: "last" }],
    sources: [sourceWithoutRelations],
    registry: REGISTRY,
    authorization: MAYA,
    authorizationFingerprint: "sha256:authorized-maya",
    snapshot: snapshot("plan-pending"),
    limit: 25,
  });
  assert.deepEqual(planned.sourcePlans[0]?.pushdown, compare("state", "eq", "needs-review"));
  assert.equal(planned.sourcePlans[0]?.residual.kind, "related");
  assert.deepEqual(planned.order.slice(-2).map((order) => order.field), ["kind", "objectId"]);
  assert.throws(() => createSearchPlan({
    expression: { kind: "related", relation: "reply", target: { objectId: "issue-02", kind: "issue" }, direction: "out", maxDepth: 9 },
    order: [],
    sources: [SOURCE],
    registry: REGISTRY,
    authorization: MAYA,
    authorizationFingerprint: "sha256:authorized-maya",
    snapshot: snapshot("expensive"),
    limit: 25,
    limits: { maxCost: 3 },
  }), (error) => error instanceof CommunityError && error.code === "QUERY_COST_LIMIT");
}

async function snapshotsResolveTimeOnceAndBindAuthorization(): Promise<void> {
  let calls = 0;
  const context = {
    clock: { now: () => { calls += 1; return new Date(NOW); } },
    idGenerator: { generate: () => "snapshot-stable" },
    timezone: "America/Chicago",
    locale: "en-US",
    now: () => NOW,
    nextId: () => "snapshot-stable",
  };
  const first = await createSearchSnapshot({
    context,
    queryHash: "query-7",
    planHash: "plan-7",
    fieldRegistryVersion: 1,
    analyzerVersion: "epoch-tokenizer-v1",
    authorization: MAYA,
    sourceCheckpoints: [CHECKPOINT],
  });
  assert.equal(first.createdAt, NOW);
  assert.equal(first.resolvedNow, NOW);
  assert.equal(first.snapshotId, "snapshot-stable");
  assert.match(first.authorizationFingerprint, /^sha256:[a-f0-9]{64}$/u);
  assert.equal(calls, 1);
}

async function cursorsAreOpaqueBoundAndTamperEvident(): Promise<void> {
  const codec = createKeysetCursorCodec({ key: new Uint8Array(32).fill(7), maxBytes: 1024 });
  const cursor = await codec.encode({
    version: 1,
    snapshotId: "snapshot-7",
    planHash: "plan-7",
    authorizationFingerprint: "sha256:maya",
    sortKey: [NOW, "issue", "issue-01"],
    objectId: "issue-01",
  });
  assert.doesNotMatch(cursor, /issue-01|maya/u);
  const encoded = cursor.split(".")[0] ?? cursor;
  const decodedTransport = new TextDecoder().decode(Uint8Array.from(
    atob(encoded.replaceAll("-", "+").replaceAll("_", "/")),
    (character) => character.charCodeAt(0),
  ));
  assert.doesNotMatch(decodedTransport, /issue-01|maya|snapshot-7|plan-7/u, "cursor transport must not reveal its payload");
  assert.equal((await codec.decode(cursor, {
    snapshotId: "snapshot-7",
    planHash: "plan-7",
    authorizationFingerprint: "sha256:maya",
  })).objectId, "issue-01");
  const tamperIndex = Math.floor(cursor.length / 2);
  const tampered = `${cursor.slice(0, tamperIndex)}${cursor[tamperIndex] === "A" ? "B" : "A"}${cursor.slice(tamperIndex + 1)}`;
  await assert.rejects(() => codec.decode(tampered, {
    snapshotId: "snapshot-7", planHash: "plan-7", authorizationFingerprint: "sha256:maya",
  }), (error) => error instanceof CommunityError && error.code === "CURSOR_INVALID");
  await assert.rejects(() => codec.decode("!!!not-a-cursor!!!", {
    snapshotId: "snapshot-7", planHash: "plan-7", authorizationFingerprint: "sha256:maya",
  }), (error) => error instanceof CommunityError && error.code === "CURSOR_INVALID");
  await assert.rejects(() => codec.decode("", {
    snapshotId: "snapshot-7", planHash: "plan-7", authorizationFingerprint: "sha256:maya",
  }), (error) => error instanceof CommunityError && error.code === "CURSOR_INVALID");
  assert.throws(
    () => createKeysetCursorCodec({ key: new Uint8Array(16) }),
    (error) => error instanceof CommunityError && error.code === "CURSOR_INVALID",
  );
  await assert.rejects(() => codec.encode({
    version: 2,
    snapshotId: "snapshot-7",
    planHash: "plan-7",
    authorizationFingerprint: "sha256:maya",
    sortKey: [NOW, "issue", "issue-01"],
    objectId: "issue-01",
  }), (error) => error instanceof CommunityError && error.code === "CURSOR_INVALID");
  await assert.rejects(() => codec.decode(cursor, {
    snapshotId: "snapshot-other", planHash: "plan-7", authorizationFingerprint: "sha256:maya",
  }), (error) => error instanceof CommunityError && error.code === "CURSOR_STALE");
}

async function referenceBackendIsOrderedPageableAndIncremental(): Promise<void> {
  const backend = new ReferenceSearchBackend({ registry: REGISTRY, cursorKey: new Uint8Array(32).fill(11) });
  await backend.rebuild([...entities()].reverse());
  const service = new SearchService({
    backend,
    registry: REGISTRY,
    context: fixedContext(),
    sources: [SOURCE],
  });
  const request = {
    expression: { kind: "all" } as const,
    order: [{ field: "updatedAt", direction: "descending", nulls: "last" } as const],
    authorization: MAYA,
    first: 1,
  };
  const first = await service.search(request);
  const second = await service.search({ ...request, snapshot: first.snapshot, after: first.pageInfo.endCursor });
  assert.deepEqual([...first.hits, ...second.hits].map((hit) => hit.target.objectId), ["issue-01", "issue-02"]);
  assert.equal(new Set([...first.hits, ...second.hits].map((hit) => hit.target.objectId)).size, 2);
  assert.equal(first.completeness.status, "complete");
  const orderedBackend = new ReferenceSearchBackend({ registry: REGISTRY, cursorKey: new Uint8Array(32).fill(12) });
  await orderedBackend.rebuild(entities());
  const orderedService = new SearchService({ backend: orderedBackend, registry: REGISTRY, context: fixedContext(), sources: [SOURCE] });
  const independentlyOrdered = await orderedService.search({ ...request, first: 10 });
  assert.deepEqual(independentlyOrdered.hits.map((hit) => hit.target.objectId), ["issue-01", "issue-02"]);
  await orderedBackend.close();
  await assert.rejects(() => service.search({
    ...request,
    authorization: { actorId: "rene" },
    snapshot: first.snapshot,
    after: first.pageInfo.endCursor,
  }), (error) => error instanceof CommunityError && error.code === "CURSOR_STALE");

  const changes: CommunitySearchChangeSet = {
    sourceId: "community-store",
    checkpoint: { ...CHECKPOINT, token: "checkpoint-8" },
    observedAt: NOW,
    upserts: [entity("issue-03", "public", "2026-08-12T19:00:00.000Z", "New projection")],
    deletes: [{ objectId: "issue-02", kind: "issue" }],
  };
  await backend.apply(changes);
  const afterChange = await service.search({ ...request, first: 10 });
  assert.deepEqual(afterChange.hits.map((hit) => hit.target.objectId), ["issue-03", "issue-01"]);
  await backend.close();
}

async function authorizationIsNonInterferingForAllObservables(): Promise<void> {
  const publicOnly = entities();
  const withHidden = [...publicOnly, entity("secret-99", "private", "2027-01-01T00:00:00.000Z", "Secret sentinel", "other")];
  const observe = async (corpus: readonly CommunityEntity[]) => {
    const backend = new ReferenceSearchBackend({ registry: REGISTRY, cursorKey: new Uint8Array(32).fill(13) });
    await backend.rebuild(corpus);
    const service = new SearchService({ backend, registry: REGISTRY, context: fixedContext(), sources: [SOURCE] });
    const page = await service.search({ expression: { kind: "all" }, order: [], authorization: MAYA, first: 50 });
    const plan = await service.plan({ expression: { kind: "all" }, order: [], authorization: MAYA, limit: 50 });
    const facets = await backend.facets(plan, ["state"]);
    const suggestions = await backend.suggest({ plan, field: "title", prefix: "s", limit: 10 });
    const sensitiveFacets = await backend.facets(plan, ["dmId"]);
    const sensitiveSuggestions = await backend.suggest({ plan, field: "dmId", prefix: "dm", limit: 10 });
    const explanation = await backend.explain(plan);
    await backend.close();
    return { hits: page.hits, facets, suggestions, sensitiveFacets, sensitiveSuggestions, explanation };
  };
  assert.deepEqual(await observe(withHidden), await observe(publicOnly));
}

async function hiddenRelationPathsAreNonInterfering(): Promise<void> {
  const start = {
    ...entity("issue-start", "public", NOW, "Public start"),
    relations: [{
      type: "backlink" as const,
      source: { objectId: "issue-start", kind: "issue" as const },
      target: { objectId: "secret-mid", kind: "issue" as const },
    }],
  };
  const hidden = {
    ...entity("secret-mid", "private", NOW, "Hidden bridge", "other"),
    relations: [{
      type: "backlink" as const,
      source: { objectId: "secret-mid", kind: "issue" as const },
      target: { objectId: "issue-target", kind: "issue" as const },
    }],
  };
  const observe = async (corpus: readonly CommunityEntity[]): Promise<readonly string[]> => {
    const backend = new ReferenceSearchBackend({ registry: REGISTRY, cursorKey: new Uint8Array(32).fill(29) });
    await backend.rebuild(corpus);
    const service = new SearchService({ backend, registry: REGISTRY, context: fixedContext(), sources: [SOURCE] });
    const page = await service.search({
      expression: { kind: "related", relation: "backlink", target: { objectId: "issue-target", kind: "issue" }, direction: "out", maxDepth: 2 },
      order: [], authorization: MAYA, first: 10,
    });
    await backend.close();
    return page.hits.map((hit) => hit.target.objectId);
  };
  assert.deepEqual(await observe([start, hidden]), await observe([start]));
}

async function cancellationFailsClosed(): Promise<void> {
  const backend = new ReferenceSearchBackend({ registry: REGISTRY, cursorKey: new Uint8Array(32).fill(17) });
  await backend.rebuild(entities());
  const controller = new AbortController();
  controller.abort();
  const service = new SearchService({ backend, registry: REGISTRY, context: fixedContext(), sources: [SOURCE] });
  await assert.rejects(() => service.search({
    expression: { kind: "all" }, order: [], authorization: MAYA, first: 10, signal: controller.signal,
  }), (error) => error instanceof DOMException && error.name === "AbortError");
}

function compare(field: string, operator: "eq" | "ne" | "lt" | "lte" | "gt" | "gte" | "in", value: string | number | readonly string[]): SearchExpression {
  return { kind: "compare", field, operator, value };
}

function entities(): readonly CommunityEntity[] {
  return [
    entity("issue-01", "public", "2026-08-12T17:00:00.000Z", "Projection engine", "maya", 10, "needs-review", "A stable object projection."),
    entity("issue-02", "shared", "2026-08-12T16:00:00.000Z", "Search plan", "maya", 3, "open", "Typed search planning."),
  ];
}

function entity(
  objectId: string,
  visibility: CommunityEntity["visibility"],
  updatedAt: string,
  title: string,
  ownerId = "maya",
  score = 1,
  state = "open",
  body = "body",
): CommunityEntity {
  return validateCommunityEntity({
    ref: { objectId, kind: "issue" },
    fields: { objectId, kind: "issue", title, body, author: ownerId, score, state, visibility, createdAt: NOW, updatedAt },
    searchableText: { title, body },
    relations: objectId === "issue-01" ? [{
      type: "backlink",
      source: { objectId: "issue-01", kind: "issue" },
      target: { objectId: "issue-02", kind: "issue" },
    }] : [],
    visibility,
    ownerId,
    participantIds: ownerId === "maya" ? ["maya"] : [],
    createdAt: NOW,
    updatedAt,
    provenance: { sourceId: "community-store", nativeId: objectId, observedAt: NOW, checkpoint: "checkpoint-7" },
  });
}

function fixedContext() {
  let sequence = 0;
  return {
    clock: { now: () => new Date(NOW) },
    idGenerator: { generate: (namespace: string) => `${namespace}-${sequence += 1}` },
    timezone: "America/Chicago",
    locale: "en-US",
    now: () => NOW,
    nextId: (namespace: string) => `${namespace}-${sequence += 1}`,
  };
}

function snapshot(snapshotId: string) {
  return {
    snapshotId,
    createdAt: NOW,
    resolvedNow: NOW,
    timezone: "America/Chicago",
    locale: "en-US",
    queryHash: "query-7",
    planHash: "plan-7",
    fieldRegistryVersion: 1,
    analyzerVersion: "epoch-tokenizer-v1",
    authorizationFingerprint: "sha256:authorized-maya",
    sourceCheckpoints: [CHECKPOINT],
  };
}

if (require.main === module) {
  runCommunitySearchReferenceBackendTests().then(
    () => console.log("community search reference backend tests passed"),
    (error) => {
      console.error(error);
      process.exitCode = 1;
    },
  );
}
