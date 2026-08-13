import assert from "node:assert/strict";
import test from "node:test";
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import {
  CommunityError,
  createCommunityFieldRegistry,
  createCommunityRuntimeContext,
} from "@epoch/community-core";
import { createCommunityGraphQLSchema, executeCommunityGraphQL } from "../../Epoch.Community.GraphQL/dist/index.js";
import { createMemoryCommunityStateStore } from "../dist/store.js";
import { createCommunitySearchApi } from "../dist/search-api.js";
import { createCommunityProjectionApi } from "../dist/projection-api.js";
import { createCommunityNamespaceApi } from "../dist/namespace-api.js";
import { createCommunityApiFetchHandler, createInMemoryCommunityApi } from "../dist/index.js";

const instant = "2026-08-12T12:00:00.000Z";
let sequence = 0;
const runtime = createCommunityRuntimeContext({
  clock: { now: () => new Date(instant) },
  idGenerator: { generate: (namespace) => `${namespace}-${++sequence}` },
  timezone: "UTC",
  locale: "en-US",
});
const empty = {
  schemaVersion: 3,
  metadata: { createdAt: instant, updatedAt: instant, migratedAt: instant, migrationTimestamp: instant, sourceSchemaVersion: 3, migrationId: "migration-1" },
  entities: [], relations: [], projectionDefinitions: [], namespaceMounts: [], sourceCheckpoints: [], quarantinedDefinitions: [],
};

test("search API bounds work, forwards authorization, snapshots, cancellation, and capabilities", async () => {
  const calls = [];
  const searchService = {
    async search(input) {
      calls.push(input);
      if (input.signal?.aborted) throw new globalThis.DOMException("cancelled", "AbortError");
      return { hits: [], pageInfo: { hasNextPage: false }, snapshot: snapshot("snapshot-1"), completeness: complete };
    },
    async plan(input) { return { planHash: "plan-1", expression: input.expression, order: input.order, sourcePlans: [], authorizationFingerprint: "fingerprint", snapshot: snapshot("snapshot-plan"), limit: input.limit }; },
  };
  const source = { sourceId: "canonical", capabilities: () => ({ sourceId: "canonical", fields: { state: { type: "keyword", operators: ["eq"], sortable: true, facetable: true }, dmId: { type: "object-id", operators: ["eq"], sortable: false, facetable: true } }, fullText: "none", pagination: "keyset", supportsWatch: false, supportsPointLookup: true, supportsRelations: true, maxPageSize: 100 }), checkpoint: async () => ({ sourceId: "canonical", token: "1", observedAt: instant, status: "current" }), scan: async () => ({ entities: [], checkpoint: { sourceId: "canonical", token: "1", observedAt: instant, status: "current" } }) };
  const api = createCommunitySearchApi({ searchService, registry: createCommunityFieldRegistry(), runtime, sources: [source], explain: async (plan) => ({ planHash: plan.planHash, backendId: "reference", expression: plan.expression, sourcePlans: [], ordering: [], authorization: "pre-filtered" }) });
  const authorization = { actorId: "alice" };
  const parsed = api.parseSearch("state:open", { authorization });
  assert.equal(parsed.error, undefined);
  await api.search({ where: parsed.ast, orderBy: parsed.sort, first: 10 }, authorization);
  assert.equal(calls[0].authorization.actorId, "alice");
  const capabilities = await api.listSourceCapabilities(authorization);
  assert.deepEqual(capabilities.map((value) => value.sourceId), ["canonical"]);
  assert.deepEqual(Object.keys(capabilities[0].fields), ["state"], "sensitive field capabilities are filtered before introspection");
  await assert.rejects(() => api.search({ where: { kind: "all" }, orderBy: [], first: 1001 }, authorization), (error) => error.code === "QUERY_COST_LIMIT");
  const controller = new globalThis.AbortController(); controller.abort();
  await assert.rejects(() => api.search({ where: { kind: "all" }, orderBy: [], first: 1 }, authorization, controller.signal), /cancel/iu);
});

test("projection and namespace APIs persist authoritative definitions and mounts", async () => {
  const store = createMemoryCommunityStateStore(empty, { clock: runtime.clock });
  const definitions = new Map();
  const mounts = new Map();
  const projectionRuntime = {
    async compile(definition) { return { definition, canonicalJson: JSON.stringify(definition), diagnostics: [], nodeCount: 1, maximumDepth: 1, estimatedFanout: 1, effectiveOrder: definition.order }; },
    register(definition) { definitions.set(definition.projectionId, definition); }, unregister(id) { definitions.delete(id); },
    definition(id) { return definitions.get(id); }, definitions() { return [...definitions.keys()]; },
  };
  const namespaceRuntime = {
    mounts: () => [...mounts.values()],
    mount(value) { if (mounts.has(value.mountId)) throw new CommunityError("NAMESPACE_MOUNT_CONFLICT", "duplicate"); mounts.set(value.mountId, value); return value; },
    unmount(id) { mounts.delete(id); }, reset(scope) { const ids = [...mounts.values()].filter((item) => item.scope === scope).map((item) => item.mountId); for (const id of ids) mounts.delete(id); return { scope, removedMountIds: ids, preservedProjectionIds: [...definitions.keys()] }; },
    list: async () => ({ entries: [], pageInfo: { hasNextPage: false }, freshness: complete, shadowed: [], componentOrder: [] }), resolve: async () => undefined, locate: async () => [],
    explain: async (path) => ({ projectionId: "namespace", path, componentOrder: [], shadowed: [], detail: "none" }),
    async *watch() {}, definitions: () => [...definitions.keys()], writableMountFor() { throw new Error("read-only"); },
  };
  const fields = createCommunityFieldRegistry();
  const projectionApi = createCommunityProjectionApi({ store, runtime, projectionRuntime, fields });
  const definition = projection("alice-projection", "private", "alice");
  await projectionApi.save(definition, { actorId: "alice" });
  const cloned = await projectionApi.save(projection("alice-clone", "private", undefined), { actorId: "alice" });
  assert.equal(cloned.ownerId, "alice", "a new ownerless definition is claimed by its authenticated creator");
  assert.equal((await store.read((state) => state.projection("alice-projection"))).revision, 1);
  await assert.rejects(() => projectionApi.get("alice-projection", { actorId: "mallory" }), (error) => error.code === "AUTHORIZATION_DENIED");

  const namespaceApi = createCommunityNamespaceApi({ store, runtime, namespaceRuntime });
  const mounted = await namespaceApi.mount({ mountId: "mount-1", projectionId: "alice-projection", mountPath: "/work", mode: "replace", scope: "user", order: 0, writable: false }, { actorId: "alice" });
  assert.equal(mounted.createdAt, instant);
  assert.equal((await store.read((state) => state.mount("mount-1"))).projectionId, "alice-projection");
  await assert.rejects(() => namespaceApi.reset("builtin", { actorId: "alice" }), (error) => error.code === "NAMESPACE_RECOVERY_PROTECTED");

  const handler = createCommunityApiFetchHandler(createInMemoryCommunityApi({ runtime }), {
    resolveAuthorization: () => ({ actorId: "alice" }),
    services: { store, runtime, search: {}, projections: projectionApi, namespace: namespaceApi },
  });
  const response = await handler(new globalThis.Request("https://epoch.test/projections"));
  assert.equal(response.status, 200);
  assert.deepEqual((await response.json()).map((value) => value.projectionId), ["alice-clone", "alice-projection"], "REST exposes ordered ProjectionDefinitions without a flat occurrence-list projection");
});

test("GraphQL host uses service adapters and stable typed errors", async () => {
  const services = minimalGraphQLServices();
  const schema = createCommunityGraphQLSchema(services);
  const result = await executeCommunityGraphQL({ schema, source: `{ sourceCapabilities { sourceId } }`, context: { authorization: { actorId: "alice" } } });
  assert.equal(result.errors, undefined);
  assert.equal(result.data.sourceCapabilities[0].sourceId, "canonical");
});

test("REST search routes are bounded, cancellable, and return typed errors", async () => {
  const searchCalls = [];
  const serviceApis = {
    store: createMemoryCommunityStateStore(empty), runtime,
    search: {
      parseSearch(expression) { return { ast: { kind: "all" }, canonical: expression, canonicalJson: "{}", queryHash: "q", sort: [], version: 2, fieldRegistryVersion: 1, resolvedAt: instant, diagnostics: [] }; },
      async search(request, authorization, signal) { searchCalls.push([request, authorization, signal]); return { hits: [], pageInfo: { hasNextPage: false }, snapshot: snapshot("rest"), completeness: complete }; },
      async explain() { return { planHash: "p", backendId: "reference", expression: {}, sourcePlans: [], ordering: [], authorization: "pre-filtered" }; },
      async listSourceCapabilities() { return []; },
    },
    projections: {}, namespace: {},
  };
  const handler = createCommunityApiFetchHandler(createInMemoryCommunityApi({ runtime }), { services: serviceApis, resolveAuthorization: () => ({ actorId: "alice" }) });
  const response = await handler(new globalThis.Request("https://epoch.test/search", { method: "POST", body: JSON.stringify({ where: { kind: "all" }, orderBy: [], first: 5 }) }));
  assert.equal(response.status, 200);
  assert.equal(searchCalls[0][1].actorId, "alice");
  assert.ok(searchCalls[0][2] instanceof globalThis.AbortSignal);
  const unsupported = await createCommunityApiFetchHandler(createInMemoryCommunityApi({ runtime }))(new globalThis.Request("https://epoch.test/search", { method: "POST", body: "{}" }));
  assert.equal(unsupported.status, 422);
  assert.equal((await unsupported.json()).error.code, "QUERY_UNSUPPORTED_SOURCE");
});

test("default API host wires search projections and namespace without manual assembly", async () => {
  const { createCommunityApiHost } = await import("../dist/index.js");
  sequence = 0;
  const host = createCommunityApiHost({
    runtime,
    cursorKey: new Uint8Array(32).fill(19),
    resolveAuthorization: () => ({ actorId: "alice" }),
    repositories: [{ slug: "epoch/epoch", displayName: "Epoch", description: "canonical", maintainers: ["alice"], topics: ["dvcs"] }],
  });
  await host.api.openIssue("epoch/epoch", { id: "ISSUE-1", title: "Needs review", author: "alice" });
  const parsed = host.services.search.parseSearch("kind:issue", { authorization: { actorId: "alice" } });
  assert.equal(parsed.error, undefined);
  const searched = await host.handler(new globalThis.Request("https://epoch.test/search", {
    method: "POST",
    body: JSON.stringify({ where: parsed.ast, orderBy: parsed.sort, first: 10 }),
  }));
  assert.equal(searched.status, 200);
  const page = await searched.json();
  assert.ok(page.hits.some((hit) => hit.target.kind === "issue"));
  const listed = await host.handler(new globalThis.Request("https://epoch.test/projections"));
  assert.equal(listed.status, 200);
  const mounts = await host.handler(new globalThis.Request("https://epoch.test/namespace/mounts"));
  assert.equal(mounts.status, 200);
  const graphql = await host.handler(new globalThis.Request("https://epoch.test/graphql", {
    method: "POST",
    body: JSON.stringify({ query: "{ sourceCapabilities { sourceId } }" }),
  }));
  assert.equal(graphql.status, 200);
  assert.deepEqual((await graphql.json()).data.sourceCapabilities.map((value) => value.sourceId), ["community-store"]);
});

test("Community facade derives repository views from schema-v3 canonical state", async () => {
  sequence = 0;
  const api = createInMemoryCommunityApi({ runtime });
  const repository = await api.createRepository({ slug: "epoch/epoch", displayName: "Epoch", description: "canonical", maintainers: ["alice"] });
  const opened = await api.openIssue(repository.slug, { id: "ISSUE-1", title: "Stored once", author: "alice" });
  const issueId = opened.issues[0].ref.objectId;
  await api.updateObjectState(issueId, "closed", { actorId: "alice", permissions: ["object:state:write"] });
  assert.equal((await api.getRepository(repository.slug)).issues[0].status, "closed", "aggregate is derived from the updated canonical entity");

  const handler = createCommunityApiFetchHandler(api);
  const denied = await handler(new globalThis.Request(`https://epoch.test/objects/${issueId}/state`, { method: "PATCH", body: JSON.stringify({ state: "open" }) }));
  assert.equal(denied.status, 403);
  assert.equal((await denied.json()).error.code, "AUTHORIZATION_DENIED");
  const malformed = await handler(new globalThis.Request("https://epoch.test/repositories", { method: "POST", body: "{" }));
  assert.equal(malformed.status, 400);
  assert.equal((await malformed.json()).error.code, "QUERY_SYNTAX");
});

test("Community facade migrates schema 1 once and persists schema 3 deterministically", async () => {
  const directory = mkdtempSync(join(tmpdir(), "epoch-api-v3-"));
  const persistencePath = join(directory, "state.json");
  try {
    writeFileSync(persistencePath, JSON.stringify({ schemaVersion: 1, repositories: [{ slug: "epoch/migrated", displayName: "Migrated", description: "", visibility: "public", defaultView: "main", maintainers: ["alice"], topics: [], issues: [], changeProposals: [], discussions: [] }] }));
    sequence = 0;
    const first = createInMemoryCommunityApi({ persistencePath, runtime });
    const id = (await first.getRepository("epoch/migrated")).ref.objectId;
    const persisted = JSON.parse(readFileSync(persistencePath, "utf8"));
    assert.equal(persisted.schemaVersion, 3);
    assert.equal(persisted.metadata.migrationTimestamp, instant);
    const second = createInMemoryCommunityApi({ persistencePath, runtime });
    assert.equal((await second.getRepository("epoch/migrated")).ref.objectId, id);
  } finally { rmSync(directory, { recursive: true, force: true }); }
});

const complete = { status: "complete", sources: [], omittedSources: [], unsupportedPredicates: [] };
function snapshot(snapshotId) { return { snapshotId, createdAt: instant, resolvedNow: instant, timezone: "UTC", locale: "en-US", queryHash: "query", planHash: "plan", fieldRegistryVersion: 1, analyzerVersion: "epoch-tokenizer-v1", authorizationFingerprint: "fingerprint", sourceCheckpoints: [] }; }
function projection(projectionId, visibility, ownerId) { return { apiVersion: "epoch.dev/v1alpha1", projectionId, version: 1, label: projectionId, ownerId, visibility, root: { nodeId: "root", kind: "literal", segment: "work", children: [] }, order: [{ field: "objectId", direction: "ascending", nulls: "last" }], updateMode: "live", consistency: "current" }; }
function minimalGraphQLServices() { return {
  async node() {}, async search() { return { hits: [], pageInfo: { hasNextPage: false }, snapshot: snapshot("s"), completeness: complete }; },
  parseSearch() { throw new Error("unused"); }, async explainSearch() { throw new Error("unused"); }, async projections() { return []; }, async projection() {}, async saveProjection(value) { return value; }, async deleteProjection() { return true; },
  async projectionContext() { return { authorizationFingerprint: "fp", snapshotId: "s" }; }, async listPath() { return { entries: [], pageInfo: { hasNextPage: false }, freshness: complete }; }, async resolvePath() {}, async locate() { return []; }, async explainPath() { return { projectionId: "namespace", path: "/", componentOrder: [], shadowed: [], detail: "none" }; },
  async sourceCapabilities() { return [{ sourceId: "canonical", fields: {}, fullText: "none", pagination: "keyset", supportsWatch: false, supportsPointLookup: true, supportsRelations: true, maxPageSize: 100 }]; }, async namespaceMounts() { return []; }, async mountProjection() { throw new Error("unused"); }, async unmountProjection() { return false; }, async resetNamespace(scope) { return { scope, removedMountIds: [], preservedProjectionIds: [] }; }, async *projectionDeltas() {},
}; }
