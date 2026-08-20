import assert from "node:assert/strict";
import {
  CommunityError,
  ReferenceSearchBackend,
  createCommunityFieldRegistry,
  createCommunityRuntimeContext,
  createSearchServiceFromSources,
  validateCommunityEntity,
  type CommunityAuthorizationContext,
  type CommunityEntity,
  type CommunitySourceAdapter,
  type CommunitySourceCapabilities,
  type CommunitySourceCheckpoint,
  type SourceSearchPage,
} from "@epoch/community-core";

const NOW = "2026-08-12T20:00:00.000Z";
const OLDER = "2026-08-12T19:00:00.000Z";
const ACTOR: CommunityAuthorizationContext = { actorId: "maya" };
const REGISTRY = createCommunityFieldRegistry();
const CONTEXT = createCommunityRuntimeContext({
  clock: { now: () => new Date(NOW) },
  idGenerator: { generate: (namespace) => `${namespace}-fixed` },
  timezone: "UTC",
  locale: "en-US",
});

export async function runCommunitySourceOrchestrationAdversarialTests(): Promise<void> {
  await regressingCheckpointCannotMasqueradeAsCurrent();
  await unauthorizedDuplicateIdentityIsNonInterfering();
  await failedLaterPageDoesNotPublishPartialObjectsOrLeakFailure();
  await publicDuplicateIdentityDoesNotMutateTheBackend();
  await staleFinalCheckpointIsVisibleInTheSnapshot();
}

async function unauthorizedDuplicateIdentityIsNonInterfering(): Promise<void> {
  const visible = entity("public-a", "public", "maya");
  const hidden = entity("private-collision", "private", "other");
  const baseline = await hydrateAndObserve([
    source("public", [[visible]]), source("hidden-a", [[]]), source("hidden-b", [[]]),
  ]);
  const withHiddenDuplicates = await hydrateAndObserve([
    source("public", [[visible]]), source("hidden-a", [[hidden]]), source("hidden-b", [[hidden]]),
  ]);
  assert.deepEqual(withHiddenDuplicates, baseline,
    "objects denied to the actor must not alter hydration failure, hits, completeness, or source details");
}

async function failedLaterPageDoesNotPublishPartialObjectsOrLeakFailure(): Promise<void> {
  const adapter = source("failing", [[entity("partial", "public", "maya")]], {
    scan: async ({ after }) => {
      if (after === undefined) return page("failing", [entity("partial", "public", "maya")], "current-1", "next");
      throw new Error("credential=https://secret.invalid token=private");
    },
  });
  const observation = await hydrateAndObserve([adapter]);
  assert.deepEqual(observation.hits, []);
  assert.equal(observation.status, "partial");
  assert.deepEqual(observation.omittedSources, ["failing"]);
  assert.doesNotMatch(JSON.stringify(observation), /secret|credential|token=private/u);
}

async function publicDuplicateIdentityDoesNotMutateTheBackend(): Promise<void> {
  const prior = entity("prior", "public", "maya");
  const backend = new ReferenceSearchBackend({ registry: REGISTRY, cursorKey: new Uint8Array(32).fill(71) });
  await backend.rebuild([prior]);
  await assert.rejects(() => createSearchServiceFromSources({
    backend, registry: REGISTRY, context: CONTEXT, authorization: ACTOR,
    sources: [source("one", [[entity("duplicate", "public", "maya")]]), source("two", [[entity("duplicate", "public", "maya")]])],
  }), (error) => error instanceof CommunityError && error.code === "INVALID_ENTITY");
  const service = await createSearchServiceFromSources({
    backend, registry: REGISTRY, context: CONTEXT, authorization: ACTOR, sources: [source("prior", [[prior]])],
  });
  const result = await service.search({ expression: { kind: "all" }, order: [], authorization: ACTOR, first: 10 });
  assert.deepEqual(result.hits.map((hit) => hit.target.objectId), ["prior"]);
  await backend.close();
}

async function regressingCheckpointCannotMasqueradeAsCurrent(): Promise<void> {
  const adapter = source("regressing", [[entity("rollback-only", "public", "maya")]], {
    initialCheckpoint: { token: "frontier-2", observedAt: NOW, status: "current" },
    pageCheckpoint: { token: "frontier-1", observedAt: OLDER, status: "current" },
  });
  const observation = await hydrateAndObserve([adapter]);
  assert.deepEqual(observation.hits, [], "a regressing checkpoint must not publish unverified stale state");
  assert.equal(observation.status, "partial");
  assert.deepEqual(observation.omittedSources, ["regressing"]);
}

async function staleFinalCheckpointIsVisibleInTheSnapshot(): Promise<void> {
  const adapter = source("stale", [[entity("stale-a", "public", "maya")]], {
    pageCheckpoint: { token: "stale-7", observedAt: NOW, status: "stale" },
  });
  const observation = await hydrateAndObserve([adapter]);
  assert.deepEqual(observation.hits, ["stale-a"]);
  assert.equal(observation.status, "stale");
  assert.deepEqual(observation.sources, [{ sourceId: "stale", token: "stale-7", observedAt: NOW, status: "stale" }]);
}

async function hydrateAndObserve(sources: readonly CommunitySourceAdapter[]): Promise<{
  readonly hits: readonly string[]; readonly status: string; readonly omittedSources: readonly string[]; readonly sources: readonly unknown[];
}> {
  const backend = new ReferenceSearchBackend({ registry: REGISTRY, cursorKey: new Uint8Array(32).fill(72) });
  const service = await createSearchServiceFromSources({ backend, registry: REGISTRY, context: CONTEXT, sources, authorization: ACTOR });
  const result = await service.search({ expression: { kind: "all" }, order: [], authorization: ACTOR, first: 20 });
  await backend.close();
  return {
    hits: result.hits.map((hit) => hit.target.objectId), status: result.completeness.status,
    omittedSources: result.completeness.omittedSources, sources: result.completeness.sources,
  };
}

function source(
  sourceId: string,
  pages: readonly (readonly CommunityEntity[])[],
  overrides: {
    readonly scan?: CommunitySourceAdapter["scan"];
    readonly initialCheckpoint?: Omit<CommunitySourceCheckpoint, "sourceId">;
    readonly pageCheckpoint?: Omit<CommunitySourceCheckpoint, "sourceId">;
  } = {},
): CommunitySourceAdapter {
  const capabilities = sourceCapabilities(sourceId);
  return {
    sourceId,
    capabilities: () => capabilities,
    checkpoint: async () => ({ sourceId, ...(overrides.initialCheckpoint ?? { token: "frontier-0", observedAt: NOW, status: "current" as const }) }),
    scan: overrides.scan ?? (async ({ after }) => {
      const index = after === undefined ? 0 : Number(after);
      const entities = pages[index] ?? [];
      const next = index + 1 < pages.length ? String(index + 1) : undefined;
      const result = {
        entities,
        checkpoint: { sourceId, ...(overrides.pageCheckpoint ?? { token: `frontier-${index + 1}`, observedAt: NOW, status: "current" as const }) },
      };
      return next === undefined ? result : { ...result, next };
    }),
  };
}

function sourceCapabilities(sourceId: string): CommunitySourceCapabilities {
  return { sourceId, fields: {}, fullText: "none", pagination: "keyset", supportsWatch: false,
    supportsPointLookup: false, supportsRelations: false, maxPageSize: 10 };
}

function page(sourceId: string, entities: readonly CommunityEntity[], token: string, next?: string): SourceSearchPage {
  const result = { entities, checkpoint: checkpoint(sourceId, token) };
  return next === undefined ? result : { ...result, next };
}

function checkpoint(sourceId: string, token = "frontier-1") {
  return { sourceId, token, observedAt: NOW, status: "current" as const };
}

function entity(objectId: string, visibility: CommunityEntity["visibility"], ownerId: string): CommunityEntity {
  return validateCommunityEntity({
    ref: { objectId, kind: "issue" },
    fields: { objectId, kind: "issue", title: objectId, visibility, createdAt: NOW, updatedAt: NOW },
    searchableText: { title: objectId }, relations: [], visibility, ownerId, participantIds: [], createdAt: NOW, updatedAt: NOW,
    provenance: { sourceId: "adversarial", nativeId: objectId, observedAt: NOW },
  });
}

if (require.main === module) {
  runCommunitySourceOrchestrationAdversarialTests().then(
    () => console.log("community source orchestration adversarial tests passed"),
    (error) => { console.error(error); process.exitCode = 1; },
  );
}
