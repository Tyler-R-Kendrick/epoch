import {
  authorizationFingerprint,
  CommunityError,
  type CommunityAuthorizationContext,
  type CommunityFieldRegistry,
  type CommunityRuntimeContext,
  type ProjectionCompileContext,
  type ProjectionDefinition,
  type ProjectionRuntime,
  type ProjectionExplanation,
  type PageRequest,
  type VfsPage,
} from "@epoch/community-core";
import type { PersistedProjectionDefinition } from "./state-schema";
import type { CommunityStateStore } from "./store";

export interface CommunityProjectionApi {
  list(authorization: CommunityAuthorizationContext): Promise<readonly ProjectionDefinition[]>;
  get(projectionId: string, authorization: CommunityAuthorizationContext): Promise<ProjectionDefinition | undefined>;
  save(definition: ProjectionDefinition, authorization: CommunityAuthorizationContext): Promise<ProjectionDefinition>;
  delete(projectionId: string, authorization: CommunityAuthorizationContext): Promise<boolean>;
  preview(definition: ProjectionDefinition, path: string, page: PageRequest, authorization: CommunityAuthorizationContext): Promise<VfsPage>;
  explain(projectionId: string, path: string, authorization: CommunityAuthorizationContext): Promise<ProjectionExplanation>;
}

export function createCommunityProjectionApi(input: {
  readonly store: CommunityStateStore;
  readonly runtime: CommunityRuntimeContext;
  readonly projectionRuntime: ProjectionRuntime;
  readonly fields: CommunityFieldRegistry;
  readonly compileLimits?: ProjectionCompileContext["limits"];
}): CommunityProjectionApi {
  const compileContext = (authorization: CommunityAuthorizationContext): ProjectionCompileContext => {
    const fields = input.fields.list(authorization);
    return {
      fields: fields.map((field) => field.name),
      sortableFields: fields.filter((field) => field.sortable).map((field) => field.name),
      limits: input.compileLimits ?? { maxDepth: 16, maxNodes: 256, maxFanout: 10_000, maxTemplateLength: 1024, maxSegmentLength: 255 },
    };
  };
  const api: CommunityProjectionApi = {
    list: (authorization) => input.store.read((state) => Object.freeze(state.projectionDefinitions
      .filter((record) => canRead(record.definition, authorization))
      .map((record) => structuredClone(record.definition))
      .sort((left, right) => left.projectionId.localeCompare(right.projectionId, "en")))),
    async get(projectionId, authorization) {
      return input.store.read((state) => {
        const record = state.projection(projectionId);
        if (record === undefined) return undefined;
        requireRead(record.definition, authorization);
        return structuredClone(record.definition);
      });
    },
    async save(definition, authorization) {
      const ownedDefinition = claimDefinition(definition, authorization);
      const compiled = await input.projectionRuntime.compile(ownedDefinition, compileContext(authorization));
      const failure = compiled.diagnostics.find((diagnostic) => diagnostic.severity === "error");
      if (failure !== undefined) throw new CommunityError(failure.code === "PROJECTION_CYCLE" ? "PROJECTION_CYCLE" : "PROJECTION_INVALID", failure.message);
      const now = input.runtime.now();
      await input.store.write((transaction) => {
        const previous = transaction.projection(definition.projectionId);
        if (previous !== undefined) requireOwner(previous.definition, authorization);
        const record: PersistedProjectionDefinition = {
          definition: structuredClone(compiled.definition),
          revision: (previous?.revision ?? 0) + 1,
          createdAt: previous?.createdAt ?? now,
          updatedAt: now,
        };
        transaction.putProjection(record);
      });
      input.projectionRuntime.register(compiled.definition);
      return structuredClone(compiled.definition);
    },
    async delete(projectionId, authorization) {
      const deleted = await input.store.write((transaction) => {
        const previous = transaction.projection(projectionId);
        if (previous === undefined) return false;
        requireOwner(previous.definition, authorization);
        transaction.deleteProjection(projectionId);
        return true;
      });
      if (deleted) input.projectionRuntime.unregister(projectionId);
      return deleted;
    },
    async preview(definition, path, page, authorization) {
      const compiled = await input.projectionRuntime.compile(claimDefinition(definition, authorization), compileContext(authorization));
      const failure = compiled.diagnostics.find((diagnostic) => diagnostic.severity === "error");
      if (failure !== undefined) throw new CommunityError(failure.code === "PROJECTION_CYCLE" ? "PROJECTION_CYCLE" : "PROJECTION_INVALID", failure.message);
      const previewId = `preview-${input.runtime.nextId("projection")}`;
      const preview = { ...compiled.definition, projectionId: previewId };
      input.projectionRuntime.register(preview);
      try {
        return await input.projectionRuntime.list(previewId, path, page, {
          authorizationFingerprint: await authorizationFingerprint(authorization),
          snapshotId: input.runtime.nextId("snapshot"),
        });
      } finally {
        input.projectionRuntime.unregister(previewId);
      }
    },
    async explain(projectionId, path, authorization) {
      const definition = await api.get(projectionId, authorization);
      if (definition === undefined) throw new CommunityError("PROJECTION_INVALID", "Projection does not exist");
      return input.projectionRuntime.explain(projectionId, path, {
        authorizationFingerprint: await authorizationFingerprint(authorization),
        snapshotId: input.runtime.nextId("snapshot"),
      });
    },
  };
  return Object.freeze(api);
}

function canRead(definition: ProjectionDefinition, authorization: CommunityAuthorizationContext): boolean {
  if (definition.visibility === "public") return true;
  if (authorization.actorId === undefined) return false;
  return definition.ownerId === authorization.actorId || definition.visibility === "shared";
}
function requireRead(definition: ProjectionDefinition, authorization: CommunityAuthorizationContext): void {
  if (!canRead(definition, authorization)) throw new CommunityError("AUTHORIZATION_DENIED", "Projection is unavailable");
}
function requireOwner(definition: ProjectionDefinition, authorization: CommunityAuthorizationContext): void {
  if (definition.ownerId === undefined || authorization.actorId !== definition.ownerId) throw new CommunityError("AUTHORIZATION_DENIED", "Projection mutation requires its owner");
}
function claimDefinition(definition: ProjectionDefinition, authorization: CommunityAuthorizationContext): ProjectionDefinition {
  if (authorization.actorId === undefined) throw new CommunityError("AUTHORIZATION_DENIED", "Projection mutation requires an authenticated owner");
  if (definition.ownerId !== undefined && definition.ownerId !== authorization.actorId) throw new CommunityError("AUTHORIZATION_DENIED", "Projection mutation requires its owner");
  return definition.ownerId === undefined ? { ...definition, ownerId: authorization.actorId } : definition;
}
