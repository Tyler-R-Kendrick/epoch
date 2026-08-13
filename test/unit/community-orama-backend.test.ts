import assert from "node:assert/strict";
import {
  ReferenceSearchBackend,
  createCommunityFieldRegistry,
  createSearchPlan,
  validateCommunityEntity,
  type CommunityEntity,
  type CommunitySearchChangeSet,
  type SearchExpression,
  type SearchPlan,
} from "@epoch/community-core";
import {
  ORAMA_BACKEND_VERSION,
  OramaSearchBackend,
  createOramaLexicalIndex,
} from "../../packages/Epoch.Community.Web/src/search/orama-backend";
import type { BrowserLexicalIndex } from "../../packages/Epoch.Community.Web/src/search/browser-index";
import { createSearchWorkerHandler } from "../../packages/Epoch.Community.Web/src/search/search-worker";

export async function runCommunityOramaBackendTests(): Promise<void> {
  await test("Orama uses canonical IDs and matches reference ordering and pages", backendMatchesReference);
  await test("Orama preserves authorization non-interference for hits facets and suggestions", backendAuthorizationNonInterference);
  await test("Orama applies changes and rebuilds through atomic generations", backendApplyAndRebuild);
  await test("Orama cancellation fails before returning observable results", backendCancellation);
  await test("worker requests are bounded cancellable and contain no Orama internal IDs", workerProtocolIsSafe);
}

async function test(name: string, run: () => void | Promise<void>): Promise<void> {
  try { await run(); } catch (error) { throw new Error(name, { cause: error }); }
}

const registry = createCommunityFieldRegistry();
const cursorKey = new Uint8Array(32).fill(7);

async function backendMatchesReference(): Promise<void> {
  const entities = corpus(false);
  const reference = new ReferenceSearchBackend({ registry, cursorKey });
  const backend = new OramaSearchBackend({ registry, cursorKey, index: createOramaLexicalIndex() });
  await reference.rebuild(entities);
  await backend.rebuild(entities);
  const searchPlan = plan({ kind: "text", fields: ["title", "body"], value: "projection", mode: "term" });
  const expected = await reference.search(searchPlan, { first: 1 });
  const actual = await backend.search(searchPlan, { first: 1 });
  assert.deepEqual(actual.hits, expected.hits);
  assert.equal(actual.pageInfo.hasNextPage, true);
  const second = await backend.search(searchPlan, { first: 1, after: actual.pageInfo.endCursor });
  assert.notEqual(second.hits[0]?.target.objectId, actual.hits[0]?.target.objectId);
  assert.ok(second.hits.every((hit) => hit.target.objectId.startsWith("object-")), "only external canonical IDs escape");
  assert.equal((await backend.explain(searchPlan)).backendId, "orama-browser");
  assert.equal(backend.health().backendVersion, ORAMA_BACKEND_VERSION);
  assert.equal(backend.health().documentCount, entities.length);
  const phrasePlan = plan({ kind: "text", fields: ["body"], value: "projection engine", mode: "phrase" });
  assert.deepEqual((await backend.search(phrasePlan, { first: 10 })).hits,
    (await reference.search(phrasePlan, { first: 10 })).hits, "uncertain lexical forms remain Core residuals");
  const tokenizerCorpus = [
    entity("object-token-1", "Snake case", "projection_engine", "public"),
    entity("object-token-2", "Unicode", "café", "public"),
    entity("object-token-3", "Punctuation", "C++", "public"),
  ];
  await reference.rebuild(tokenizerCorpus);
  await backend.rebuild(tokenizerCorpus);
  for (const value of ["projection_engine", "café", "C++"]) {
    const tokenizerPlan = plan({ kind: "text", fields: ["body"], value, mode: "term" });
    assert.deepEqual((await backend.search(tokenizerPlan, { first: 10 })).hits,
      (await reference.search(tokenizerPlan, { first: 10 })).hits, `optimized tokenization must preserve Core semantics for ${value}`);
  }
}

async function backendAuthorizationNonInterference(): Promise<void> {
  const visible = corpus(false);
  const withHidden = corpus(true);
  const first = new OramaSearchBackend({ registry, cursorKey, index: createOramaLexicalIndex() });
  const second = new OramaSearchBackend({ registry, cursorKey, index: createOramaLexicalIndex() });
  await first.rebuild(visible);
  await second.rebuild(withHidden);
  const searchPlan = plan({ kind: "text", fields: ["title", "body"], value: "projection", mode: "term" });
  const firstPage = await first.search(searchPlan, { first: 10 });
  const secondPage = await second.search(searchPlan, { first: 10 });
  assert.deepEqual(firstPage.hits, secondPage.hits);
  assert.deepEqual(firstPage.completeness, secondPage.completeness);
  assert.equal(firstPage.pageInfo.hasNextPage, secondPage.pageInfo.hasNextPage);
  assert.deepEqual(await first.facets(searchPlan, ["kind"]), await second.facets(searchPlan, ["kind"]));
  assert.deepEqual(await first.suggest({ plan: searchPlan, field: "author", prefix: "a", limit: 10 }),
    await second.suggest({ plan: searchPlan, field: "author", prefix: "a", limit: 10 }));
}

async function backendApplyAndRebuild(): Promise<void> {
  const backend = new OramaSearchBackend({ registry, cursorKey, index: createOramaLexicalIndex() });
  await backend.rebuild(corpus(false));
  const before = backend.health().generation;
  const added = entity("object-added", "Projection added", "projection", "public");
  await backend.apply(changeSet([added], [{ objectId: "object-1", kind: "message" }]));
  assert.equal(backend.health().generation, before + 1);
  assert.equal(backend.health().documentCount, 3);
  const result = await backend.search(plan({ kind: "compare", field: "objectId", operator: "eq", value: "object-added" }), { first: 10 });
  assert.deepEqual(result.hits.map((hit) => hit.target.objectId), ["object-added"]);
  await backend.rebuild([entity("object-only", "Only", "one", "public")]);
  assert.equal(backend.health().documentCount, 1);
}

async function backendCancellation(): Promise<void> {
  const backend = new OramaSearchBackend({ registry, cursorKey, index: createOramaLexicalIndex() });
  await backend.rebuild(corpus(false));
  const controller = new AbortController();
  controller.abort();
  await assert.rejects(() => backend.search(plan({ kind: "all" }), { first: 10 }, controller.signal), { name: "AbortError" });
}

async function workerProtocolIsSafe(): Promise<void> {
  const responses: unknown[] = [];
  const handler = createSearchWorkerHandler(createOramaLexicalIndex(), (response) => responses.push(response));
  await handler({ requestId: "r1", type: "rebuild", documents: corpus(false).map((value) => ({
    objectId: value.ref.objectId,
    text: Object.values(value.searchableText).join(" "),
  })) });
  await handler({ requestId: "r2", type: "search", query: "projection", allowedObjectIds: corpus(false).map((value) => value.ref.objectId), limit: 10 });
  assert.equal(JSON.stringify(responses).includes("internalDocumentID"), false);
  assert.match(JSON.stringify(responses), /object-1/u);
  await handler({ requestId: "r3", type: "cancel", targetRequestId: "missing" });
  await handler({ requestId: "r4", type: "search", query: "x", allowedObjectIds: [], limit: 100_001 });
  assert.match(JSON.stringify(responses.at(-1)), /QUERY_COST_LIMIT/u);

  const cancellableResponses: unknown[] = [];
  const cancellable: BrowserLexicalIndex = {
    rebuild: async () => undefined,
    search: async ({ signal }) => new Promise((_, reject) => signal?.addEventListener("abort",
      () => reject(new DOMException("cancelled", "AbortError")), { once: true })),
    health: () => ({ backendId: "orama-browser", backendVersion: ORAMA_BACKEND_VERSION,
      analyzerVersion: "orama-3.1.18-en-v1", documentCount: 0, generation: 0, state: "ready" }),
    close: async () => undefined,
  };
  const cancellableHandler = createSearchWorkerHandler(cancellable, (response) => cancellableResponses.push(response));
  const pending = cancellableHandler({ requestId: "r5", type: "search", query: "projection", allowedObjectIds: ["object-1"], limit: 1 });
  await cancellableHandler({ requestId: "r6", type: "cancel", targetRequestId: "r5" });
  await pending;
  assert.match(JSON.stringify(cancellableResponses), /CANCELLED/u);
}

function plan(expression: SearchExpression): SearchPlan {
  const checkpoint = { sourceId: "fixture", token: "fixture:1", observedAt: "2026-08-12T00:00:00.000Z", status: "current" as const };
  return createSearchPlan({
    expression,
    order: [{ field: "updatedAt", direction: "descending", nulls: "last" }],
    sources: [{ sourceId: "fixture", fields: {}, fullText: "none", supportsRelations: false, checkpoint }],
    registry,
    authorization: { actorId: "alice" },
    authorizationFingerprint: "auth-alice",
    snapshot: {
      snapshotId: "snapshot-1", createdAt: "2026-08-12T00:00:00.000Z", resolvedNow: "2026-08-12T00:00:00.000Z",
      timezone: "UTC", locale: "en-US", queryHash: "query", planHash: "pending", fieldRegistryVersion: registry.version,
      analyzerVersion: "epoch-tokenizer-v1", authorizationFingerprint: "auth-alice", sourceCheckpoints: [checkpoint],
    },
    limit: 100,
  });
}

function corpus(hidden: boolean): CommunityEntity[] {
  return [
    entity("object-1", "Projection search", "projection engine", "public"),
    entity("object-2", "Other", "projection browser", "public"),
    entity("object-3", "Unrelated", "elsewhere", "public"),
    ...(hidden ? [entity("object-hidden", "Projection secret", "projection", "private", "mallory")] : []),
  ];
}

function entity(objectId: string, title: string, body: string, visibility: "public" | "private", ownerId = "alice"): CommunityEntity {
  return validateCommunityEntity({
    ref: { objectId, kind: "message" }, fields: { objectId, kind: "message", title, body, author: ownerId },
    searchableText: { title, body }, relations: [], visibility, ownerId, participantIds: [],
    createdAt: "2026-08-11T00:00:00.000Z", updatedAt: objectId === "object-1" ? "2026-08-12T00:00:00.000Z" : "2026-08-11T00:00:00.000Z",
    provenance: { sourceId: "fixture", nativeId: objectId, observedAt: "2026-08-12T00:00:00.000Z" },
  });
}

function changeSet(upserts: readonly CommunityEntity[], deletes: CommunitySearchChangeSet["deletes"]): CommunitySearchChangeSet {
  return {
    sourceId: "fixture", checkpoint: { sourceId: "fixture", token: "fixture:2", observedAt: "2026-08-12T01:00:00.000Z", status: "current" },
    upserts, deletes, observedAt: "2026-08-12T01:00:00.000Z",
  };
}
