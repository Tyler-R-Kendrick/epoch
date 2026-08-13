import {
  canReadCommunityResource,
  createCommunityFieldRegistry,
  createNamespaceRuntime,
  createSearchServiceFromSources,
  EntityProjectionRuntime,
  ReferenceSearchBackend,
  builtinDefaultProjection,
  type CommunityAuthorizationContext,
  type CommunityEntity,
  type CommunityFieldRegistry,
  type CommunityRuntimeContext,
  type ProjectionDefinition,
  type ProjectionRuntime,
  type SearchPlan,
} from "@epoch/community-core";
import { createCanonicalStoreSource } from "./community-source";
import { createCommunityNamespaceApi, type CommunityNamespaceApi } from "./namespace-api";
import { createCommunityProjectionApi, type CommunityProjectionApi } from "./projection-api";
import { createCommunitySearchApi, type CommunitySearchApi } from "./search-api";
import type { CommunityStateStore } from "./store";

export interface CommunityServiceApis {
  readonly store: CommunityStateStore;
  readonly runtime: CommunityRuntimeContext;
  readonly search: CommunitySearchApi;
  readonly projections: CommunityProjectionApi;
  readonly namespace: CommunityNamespaceApi;
}

const COMPILE_LIMITS = {
  maxDepth: 16,
  maxNodes: 256,
  maxFanout: 10_000,
  maxTemplateLength: 1024,
  maxSegmentLength: 255,
} as const;

export interface CreateCommunityServiceApisOptions {
  readonly store: CommunityStateStore;
  readonly runtime: CommunityRuntimeContext;
  readonly registry?: CommunityFieldRegistry;
  readonly cursorKey?: Uint8Array;
}

/** Compose search, projection, and namespace services over one canonical store. */
export function createCommunityServiceApis(input: CreateCommunityServiceApisOptions): CommunityServiceApis {
  const registry = input.registry ?? createCommunityFieldRegistry();
  const cursorKey = input.cursorKey ?? defaultCursorKey();
  const source = createCanonicalStoreSource({
    readEntities: () => input.store.read((state) => state.entities),
    checkpoint: async () => {
      const stored = await input.store.read((state) => state.checkpoint("community-store"));
      if (stored !== undefined) return stored;
      const observedAt = input.runtime.now();
      return { sourceId: "community-store", token: observedAt, observedAt, status: "current" };
    },
  });
  const backend = new ReferenceSearchBackend({ registry, cursorKey });
  const persistProjections = createCommunityProjectionApi({
    store: input.store,
    runtime: input.runtime,
    projectionRuntime: emptyRuntime(registry, cursorKey),
    fields: registry,
    compileLimits: COMPILE_LIMITS,
  });
  const persistNamespace = createCommunityNamespaceApi({
    store: input.store,
    runtime: input.runtime,
    namespaceRuntime: createNamespaceRuntime(emptyRuntime(registry, cursorKey)),
  });

  const search = createCommunitySearchApi({
    searchService: {
      async search(request) {
        return (await searchService(request.authorization, request.signal)).search(request);
      },
      async plan(request) {
        return (await searchService(request.authorization)).plan(request);
      },
    },
    registry,
    runtime: input.runtime,
    sources: [source],
    explain: (plan: SearchPlan) => backend.explain(plan),
  });

  const services: CommunityServiceApis = {
    store: input.store,
    runtime: input.runtime,
    search,
    projections: {
      list: (authorization) => persistProjections.list(authorization),
      get: (projectionId, authorization) => persistProjections.get(projectionId, authorization),
      save: (definition, authorization) => persistProjections.save(definition, authorization),
      delete: (projectionId, authorization) => persistProjections.delete(projectionId, authorization),
      preview: async (definition, path, page, authorization) => {
        const live = await liveProjectionRuntime(authorization, [definition]);
        return createCommunityProjectionApi({
          store: input.store,
          runtime: input.runtime,
          projectionRuntime: live,
          fields: registry,
          compileLimits: COMPILE_LIMITS,
        }).preview(definition, path, page, authorization);
      },
      explain: async (projectionId, path, authorization) => {
        const definition = await persistProjections.get(projectionId, authorization);
        const live = await liveProjectionRuntime(authorization, definition === undefined ? [] : [definition]);
        return createCommunityProjectionApi({
          store: input.store,
          runtime: input.runtime,
          projectionRuntime: live,
          fields: registry,
          compileLimits: COMPILE_LIMITS,
        }).explain(projectionId, path, authorization);
      },
    },
    namespace: {
      context: (authorization, snapshot) => persistNamespace.context(authorization, snapshot),
      list: async (path, page, authorization, snapshot) => (await liveNamespace(authorization)).list(path, page, authorization, snapshot),
      resolve: async (path, authorization, snapshot) => (await liveNamespace(authorization)).resolve(path, authorization, snapshot),
      locate: async (target, authorization, snapshot) => (await liveNamespace(authorization)).locate(target, authorization, snapshot),
      explain: async (path, authorization, snapshot) => (await liveNamespace(authorization)).explain(path, authorization, snapshot),
      watch: (path, authorization, signal, snapshot) => persistNamespace.watch(path, authorization, signal, snapshot),
      mounts: async (authorization) => (await liveNamespace(authorization)).mounts(authorization),
      mount: (value, authorization) => persistNamespace.mount(value, authorization),
      unmount: (mountId, authorization) => persistNamespace.unmount(mountId, authorization),
      reset: (scope, authorization) => persistNamespace.reset(scope, authorization),
    },
  };
  return Object.freeze(services);

  async function searchService(authorization: CommunityAuthorizationContext, signal?: AbortSignal) {
    return createSearchServiceFromSources({
      backend: new ReferenceSearchBackend({ registry, cursorKey }),
      registry,
      context: input.runtime,
      sources: [source],
      authorization,
      ...(signal === undefined ? {} : { signal }),
    });
  }

  async function liveProjectionRuntime(
    authorization: CommunityAuthorizationContext,
    extra: readonly ProjectionDefinition[] = [],
  ): Promise<ProjectionRuntime> {
    const snapshot = await input.store.read((state) => state);
    const entities = snapshot.entities.filter((entity) => readable(entity, authorization));
    const definitions = [
      builtinDefaultProjection,
      ...snapshot.projectionDefinitions.map((record) => record.definition),
      ...extra,
    ];
    const unique = [...new Map(definitions.map((definition) => [definition.projectionId, definition])).values()];
    return new EntityProjectionRuntime({
      entities,
      completeness: {
        status: "complete",
        sources: snapshot.sourceCheckpoints,
        omittedSources: [],
        unsupportedPredicates: [],
      },
      cursorKey,
      compileContext: compileContext(registry, authorization),
    }, unique);
  }

  async function liveNamespace(authorization: CommunityAuthorizationContext) {
    const mounts = await input.store.read((state) => state.namespaceMounts);
    return createCommunityNamespaceApi({
      store: input.store,
      runtime: input.runtime,
      namespaceRuntime: createNamespaceRuntime(await liveProjectionRuntime(authorization), mounts),
    });
  }
}

function readable(entity: CommunityEntity, authorization: CommunityAuthorizationContext): boolean {
  return canReadCommunityResource({
    kind: entity.ref.kind,
    resourceId: entity.ref.objectId,
    visibility: entity.visibility,
    ownerId: entity.ownerId,
    participantIds: entity.participantIds,
  }, authorization);
}

function compileContext(registry: CommunityFieldRegistry, authorization: CommunityAuthorizationContext) {
  const fields = registry.list(authorization);
  return {
    fields: fields.map((field) => field.name),
    sortableFields: fields.filter((field) => field.sortable).map((field) => field.name),
    limits: COMPILE_LIMITS,
  };
}

function emptyRuntime(registry: CommunityFieldRegistry, cursorKey: Uint8Array): ProjectionRuntime {
  return new EntityProjectionRuntime({
    entities: [],
    completeness: { status: "complete", sources: [], omittedSources: [], unsupportedPredicates: [] },
    cursorKey,
    compileContext: compileContext(registry, {}),
  }, [builtinDefaultProjection]);
}

function defaultCursorKey(): Uint8Array {
  const key = new Uint8Array(32);
  if (globalThis.crypto?.getRandomValues !== undefined) globalThis.crypto.getRandomValues(key);
  else key.fill(17);
  return key;
}
