import type { CommunityRelation } from "./graph";
import { validateObjectRef, validateProjectionId, type CommunityObjectRef } from "./identity";
import type { NormalizedCommunityQuery } from "./query";

export type ProjectionKind =
  | "namespace" | "channel-feed" | "thread" | "dm" | "notifications" | "following"
  | "search" | "saved-query" | "project";

export interface ProjectionOrder {
  readonly by: "publishedAt" | "updatedAt" | "state" | "score" | "alias" | "manual";
  readonly direction: "ascending" | "descending";
}

export interface ProjectionSpec {
  readonly projectionId: string;
  readonly kind: ProjectionKind;
  readonly label: string;
  readonly root: CommunityObjectRef;
  readonly parentRelation: "projection" | CommunityRelation["type"];
  readonly order: ProjectionOrder;
  readonly visibility: "private" | "shared" | "public";
  readonly query?: NormalizedCommunityQuery;
  readonly queryLanguageVersion?: number;
  readonly version: number;
}

export interface ProjectionEntryCapabilities {
  readonly read: boolean;
  readonly enter: boolean;
  readonly expand: boolean;
  readonly composeUnder: boolean;
  readonly execute: boolean;
}

export interface ProjectionSourceEntry {
  readonly ref: CommunityObjectRef;
  readonly alias: string;
  readonly aliasPath: string;
  readonly parentRef?: CommunityObjectRef;
  readonly capabilities: ProjectionEntryCapabilities;
}

export interface ProjectionEntry extends ProjectionSourceEntry {
  readonly depth: number;
  readonly position: number;
  readonly setSize: number;
}

export interface CommunityProjection {
  readonly spec: ProjectionSpec;
  readonly entries: readonly ProjectionEntry[];
}

export interface SavedProjection extends ProjectionSpec {
  readonly ownerId: string;
  readonly createdAt: string;
  readonly updatedAt: string;
}

export interface SaveProjectionInput {
  readonly projection: ProjectionSpec;
  readonly ownerId: string;
}

export function createProjection(spec: ProjectionSpec, objects: readonly ProjectionSourceEntry[]): CommunityProjection {
  validateProjectionId(spec.projectionId);
  validateObjectRef(spec.root);
  if (!Number.isInteger(spec.version) || spec.version < 1) throw new Error("Projection version must be a positive integer");
  const byId = new Map<string, ProjectionSourceEntry>();
  for (const object of objects) {
    validateObjectRef(object.ref);
    if (byId.has(object.ref.objectId)) throw new Error(`Projection contains duplicate object: ${object.ref.objectId}`);
    if (!object.aliasPath || object.aliasPath.includes("..")) throw new Error("Projection aliases must be explicit safe paths");
    byId.set(object.ref.objectId, object);
  }
  const siblingGroups = new Map<string, ProjectionSourceEntry[]>();
  for (const object of objects) {
    const key = object.parentRef?.objectId ?? spec.root.objectId;
    const siblings = siblingGroups.get(key) ?? [];
    siblings.push(object);
    siblingGroups.set(key, siblings);
  }
  const depthOf = (object: ProjectionSourceEntry, seen = new Set<string>()): number => {
    const parentId = object.parentRef?.objectId;
    if (parentId === undefined || parentId === spec.root.objectId) return 1;
    if (seen.has(object.ref.objectId)) throw new Error(`Projection contains a parent cycle at ${object.ref.objectId}`);
    const parent = byId.get(parentId);
    return parent === undefined ? 1 : depthOf(parent, new Set(seen).add(object.ref.objectId)) + 1;
  };
  return {
    spec: Object.freeze({ ...spec }),
    entries: objects.map((object) => {
      const key = object.parentRef?.objectId ?? spec.root.objectId;
      const siblings = siblingGroups.get(key) ?? [];
      const capabilities = object.ref.kind === "tombstone"
        ? { read: true, enter: true, expand: object.capabilities.expand, composeUnder: false, execute: false }
        : { ...object.capabilities };
      return Object.freeze({
        ...object,
        capabilities,
        depth: depthOf(object),
        position: siblings.findIndex((candidate) => candidate.ref.objectId === object.ref.objectId) + 1,
        setSize: siblings.length,
      });
    }),
  };
}
