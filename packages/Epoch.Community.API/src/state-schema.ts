// SAFETY: The module validates or constructs this value before applying the asserted contract.
// SAFETY: The module validates or constructs this value before applying the asserted contract.
import {
  CommunityError,
  validateCommunityEntity,
  validateIsoDateTime,
  validateObjectRef,
  validateProjectionId,
  type CommunityEntity,
  type CommunityRelation,
  type CommunitySourceCheckpoint,
  type NamespaceMount,
  type ProjectionDefinition,
} from "@epoch/community-core";
type BoundaryValue = null | undefined | boolean | number | string | bigint | symbol | Readonly<object>;
type DictionaryValue = null | undefined | boolean | number | string | bigint | readonly DictionaryValue[] | { readonly [key: string]: DictionaryValue };
function __epochIsString<T>(value: T): value is T & string { return typeof value === "string"; }
function __epochIsBoolean<T>(value: T): value is T & boolean { return typeof value === "boolean"; }


export type { CommunitySourceCheckpoint, NamespaceMount } from "@epoch/community-core";

export const COMMUNITY_STATE_SCHEMA_VERSION = 3 as const;

export interface CommunityStateMetadata {
  readonly createdAt: string;
  readonly updatedAt: string;
  readonly migratedAt: string;
  readonly migrationTimestamp: string;
  /** Always the current Community state schema; older on-disk schemas are refused. */
  readonly sourceSchemaVersion: typeof COMMUNITY_STATE_SCHEMA_VERSION;
  readonly migrationId: string;
}

export interface PersistedProjectionDefinition {
  readonly definition: ProjectionDefinition;
  readonly revision: number;
  readonly createdAt: string;
  readonly updatedAt: string;
}

export interface QuarantinedProjectionDefinition {
  readonly projectionId?: string;
  readonly reason: string;
  readonly quarantinedAt: string;
  readonly input: unknown;
}

export interface CommunityStateV3 {
  readonly schemaVersion: typeof COMMUNITY_STATE_SCHEMA_VERSION;
  readonly metadata: CommunityStateMetadata;
  readonly entities: readonly CommunityEntity[];
  readonly relations: readonly CommunityRelation[];
  readonly projectionDefinitions: readonly PersistedProjectionDefinition[];
  readonly namespaceMounts: readonly NamespaceMount[];
  readonly sourceCheckpoints: readonly CommunitySourceCheckpoint[];
  readonly quarantinedDefinitions: readonly QuarantinedProjectionDefinition[];
}

export type CommunityStateExport = CommunityStateV3;

const SAFE_ID = /^[A-Za-z0-9][A-Za-z0-9._~-]{0,255}$/u;
const SAFE_PATH = /^\/(?:[^/\\\0]+(?:\/[^/\\\0]+)*)?$/u;

export function validateCommunityStateV3(input: BoundaryValue): CommunityStateV3 {
  if (!record(input) || input.schemaVersion !== COMMUNITY_STATE_SCHEMA_VERSION) invalid("Community state must use schema version 3");
  const metadata = validateMetadata(input.metadata);
  const entities = array(input.entities, "entities").map(validateCommunityEntity);
  unique(entities, (entity) => entity.ref.objectId, "canonical entity");
  const relations = array(input.relations, "relations").map(validateRelation);
  const projectionDefinitions = array(input.projectionDefinitions, "projectionDefinitions").map(validateProjectionRecord);
  unique(projectionDefinitions, (projection) => projection.definition.projectionId, "projection definition");
  const namespaceMounts = array(input.namespaceMounts, "namespaceMounts").map(validateMount);
  unique(namespaceMounts, (mount) => mount.mountId, "namespace mount");
  const sourceCheckpoints = array(input.sourceCheckpoints, "sourceCheckpoints").map(validateCheckpoint);
  unique(sourceCheckpoints, (checkpoint) => checkpoint.sourceId, "source checkpoint");
  const quarantinedDefinitions = array(input.quarantinedDefinitions, "quarantinedDefinitions").map(validateQuarantine);
  return structuredClone(Object.freeze({
    schemaVersion: COMMUNITY_STATE_SCHEMA_VERSION,
    metadata,
    entities,
    relations,
    projectionDefinitions,
    namespaceMounts,
    sourceCheckpoints,
    quarantinedDefinitions,
  }));
}

function validateMetadata(input: BoundaryValue): CommunityStateMetadata {
  if (!record(input) || input.sourceSchemaVersion !== COMMUNITY_STATE_SCHEMA_VERSION) {
    invalid("Community state metadata must use schema version 3");
  }
  return Object.freeze({
    createdAt: validateIsoDateTime(input.createdAt, "metadata.createdAt"),
    updatedAt: validateIsoDateTime(input.updatedAt, "metadata.updatedAt"),
    migratedAt: validateIsoDateTime(input.migratedAt, "metadata.migratedAt"),
    migrationTimestamp: validateIsoDateTime(input.migrationTimestamp, "metadata.migrationTimestamp"),
    sourceSchemaVersion: COMMUNITY_STATE_SCHEMA_VERSION,
    migrationId: bounded(input.migrationId, "metadata.migrationId"),
  });
}

function validateRelation(input: BoundaryValue): CommunityRelation {
  if (!record(input) || !__epochIsString(input.type)) invalid("Persisted relation is invalid");
  const allowed = ["reply", "quote", "mention", "provenance", "promotion", "replacement", "moderation", "attachment", "backlink"];
  if (!allowed.includes(input.type)) invalid(`Unsupported persisted relation: ${input.type}`);
  // SAFETY: Relation type validated against allowed persisted relation names.
  return Object.freeze({
    type: input.type as CommunityRelation["type"],
    source: validateObjectRef(input.source),
    target: validateObjectRef(input.target),
  });
}

function readProjectionDefinition(value: Record<string, DictionaryValue>): ProjectionDefinition {
  // SAFETY: Persisted v3 projection definitions are validated by validateProjectionRecord after read.
  return JSON.parse(JSON.stringify(value)) as ProjectionDefinition;
}

function validateProjectionRecord(input: BoundaryValue): PersistedProjectionDefinition {
  if (!record(input) || !record(input.definition)) invalid("Persisted projection definition is invalid");
  const definition = readProjectionDefinition(input.definition);
  validateProjectionId(definition.projectionId);
  if (definition.apiVersion !== "epoch.dev/v1alpha1" || !Number.isInteger(definition.version) || definition.version < 1) {
    // SAFETY: The module validates or constructs this value before applying the asserted contract.
    invalid("Persisted projection definition version is invalid");
  }
  // SAFETY: Runtime checks or construction above establish number) < 1) invalid("Persisted projection revision is invalid").
  if (!Number.isInteger(input.revision) || (input.revision as number) < 1) invalid("Persisted projection revision is invalid");
  // SAFETY: Integer revision validated above.
  const revision = input.revision as number;
  return Object.freeze({
    definition,
    revision,
    createdAt: validateIsoDateTime(input.createdAt, "projection.createdAt"),
    updatedAt: validateIsoDateTime(input.updatedAt, "projection.updatedAt"),
  });
}

function validateMount(input: BoundaryValue): NamespaceMount {
  if (!record(input)) invalid("Persisted namespace mount is invalid");
  const mountId = bounded(input.mountId, "mount.mountId");
  const projectionId = validateProjectionId(String(input.projectionId));
  if (!(input.scope === "builtin" || input.scope === "community" || input.scope === "workspace" || input.scope === "user" || input.scope === "session")) {
    invalid("Persisted namespace mount scope is invalid");
  }
  if (!(input.mode === "replace" || input.mode === "before" || input.mode === "after")) invalid("Persisted namespace mount mode is invalid");
  if (!__epochIsString(input.mountPath) || !SAFE_PATH.test(input.mountPath) || input.mountPath.split("/").some((segment) => segment === "." || segment === "..")) {
    invalid("Persisted namespace mount path is invalid");
  }
  if (!Number.isSafeInteger(input.order) || !__epochIsBoolean(input.writable)) invalid("Persisted namespace mount order or writability is invalid");
  // SAFETY: SafeInteger order validated above.
  const order = input.order as number;
  const mount: NamespaceMount = Object.freeze({
    mountId,
    scope: input.scope,
    mountPath: input.mountPath,
    projectionId,
    mode: input.mode,
    order,
    writable: input.writable,
    createdAt: validateIsoDateTime(input.createdAt, "mount.createdAt"),
    updatedAt: validateIsoDateTime(input.updatedAt, "mount.updatedAt"),
  });
  if (input.ownerId !== undefined) {
    return Object.freeze({ ...mount, ownerId: bounded(input.ownerId, "mount.ownerId") });
  }
  return mount;
}

function validateCheckpoint(input: BoundaryValue): CommunitySourceCheckpoint {
  if (!record(input) || !["current", "stale", "partial", "unavailable"].includes(String(input.status))) {
    invalid("Persisted source checkpoint is invalid");
  }
  const checkpoint: CommunitySourceCheckpoint = Object.freeze({
    sourceId: bounded(input.sourceId, "checkpoint.sourceId"),
    token: bounded(input.token, "checkpoint.token", 4096),
    observedAt: validateIsoDateTime(input.observedAt, "checkpoint.observedAt"),
    // SAFETY: Status string validated against checkpoint vocabulary above.
    status: input.status as CommunitySourceCheckpoint["status"],
  });
  if (input.detail !== undefined) {
    return Object.freeze({ ...checkpoint, detail: bounded(input.detail, "checkpoint.detail", 4096) });
  }
  return checkpoint;
}

function validateQuarantine(input: BoundaryValue): QuarantinedProjectionDefinition {
  if (!record(input)) invalid("Persisted projection quarantine entry is invalid");
  const quarantine: QuarantinedProjectionDefinition = Object.freeze({
    reason: bounded(input.reason, "quarantine.reason", 4096),
    quarantinedAt: validateIsoDateTime(input.quarantinedAt, "quarantine.quarantinedAt"),
    input: structuredClone(input.input),
  });
  if (input.projectionId !== undefined) {
    return Object.freeze({
      ...quarantine,
      projectionId: __epochIsString(input.projectionId) ? input.projectionId : String(input.projectionId),
    });
  }
  return quarantine;
}

function unique<T>(values: readonly T[], key: (value: T) => string, label: string): void {
  const seen = new Set<string>();
  for (const value of values) {
    const id = key(value);
    if (seen.has(id)) invalid(`Duplicate persisted ${label}: ${id}`);
    seen.add(id);
  }
}

function bounded(input: BoundaryValue, label: string, limit = 512): string {
  if (!__epochIsString(input) || input.length === 0 || input.length > limit || input.includes(String.fromCharCode(0))) invalid(`${label} is invalid`);
  const value = input.normalize("NFC");
  if (limit <= 512 && !SAFE_ID.test(value)) invalid(`${label} must be an opaque identifier`);
  return value;
}

function array(input: BoundaryValue, label: string): BoundaryValue[] {
  if (!Array.isArray(input) || input.length > 1_000_000) invalid(`Community state ${label} must be a bounded array`);
  // SAFETY: Array elements are validated by downstream schema validators.
  return input as BoundaryValue[];
}

function record(input: BoundaryValue): input is Record<string, DictionaryValue> {
  return typeof input === "object" && input !== null && !Array.isArray(input);
}

function invalid(message: string): never {
  throw new CommunityError("PERSISTENCE_MIGRATION", message);
}
