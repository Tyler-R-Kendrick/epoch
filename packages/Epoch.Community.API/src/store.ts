import {
  CommunityError,
  type Clock,
  validateCommunityEntity,
  validateObjectRef,
  type CommunityEntity,
  type CommunityRelation,
} from "@epoch/community-core";
import {
  validateCommunityStateV3,
  type CommunitySourceCheckpoint,
  type CommunityStateExport,
  type CommunityStateMetadata,
  type CommunityStateV3,
  type NamespaceMount,
  type PersistedProjectionDefinition,
  type QuarantinedProjectionDefinition,
} from "./state-schema";
type BoundaryValue = null | undefined | boolean | number | string | bigint | symbol | Readonly<object>;


export interface CommunityStateSnapshot {
  readonly metadata: CommunityStateMetadata;
  readonly entities: readonly CommunityEntity[];
  readonly relations: readonly CommunityRelation[];
  readonly projectionDefinitions: readonly PersistedProjectionDefinition[];
  readonly namespaceMounts: readonly NamespaceMount[];
  readonly sourceCheckpoints: readonly CommunitySourceCheckpoint[];
  readonly quarantinedDefinitions: readonly QuarantinedProjectionDefinition[];
  entity(objectId: string): CommunityEntity | undefined;
  projection(projectionId: string): PersistedProjectionDefinition | undefined;
  mount(mountId: string): NamespaceMount | undefined;
  checkpoint(sourceId: string): CommunitySourceCheckpoint | undefined;
}

export interface CommunityStateTransaction extends CommunityStateSnapshot {
  putEntity(entity: CommunityEntity): void;
  deleteEntity(objectId: string): void;
  putRelation(relation: CommunityRelation): void;
  deleteRelation(relation: CommunityRelation): void;
  putProjection(projection: PersistedProjectionDefinition): void;
  deleteProjection(projectionId: string): void;
  putMount(mount: NamespaceMount): void;
  deleteMount(mountId: string): void;
  putCheckpoint(checkpoint: CommunitySourceCheckpoint): void;
  deleteCheckpoint(sourceId: string): void;
  putQuarantinedDefinition(definition: QuarantinedProjectionDefinition): void;
  clearQuarantinedDefinitions(): void;
  setMetadata(metadata: CommunityStateMetadata): void;
}

export interface CommunityStateStore {
  read<T>(operation: (snapshot: CommunityStateSnapshot) => T | Promise<T>): Promise<T>;
  write<T>(operation: (transaction: CommunityStateTransaction) => T | Promise<T>): Promise<T>;
  export(): Promise<CommunityStateExport>;
  import(input: CommunityStateExport): Promise<void>;
}

export interface MemoryCommunityStateStoreOptions {
  readonly persist?: (state: CommunityStateV3) => void | Promise<void>;
  readonly clock?: Clock;
}

export function createMemoryCommunityStateStore(
  initial: CommunityStateV3,
  options: MemoryCommunityStateStoreOptions = {},
): CommunityStateStore {
  let current = validateCommunityStateV3(initial);
  let writes = Promise.resolve();

  const read = async <T>(operation: (snapshot: CommunityStateSnapshot) => T | Promise<T>): Promise<T> => {
    await writes;
    return operation(snapshotOf(current));
  };

  const write = async <T>(operation: (transaction: CommunityStateTransaction) => T | Promise<T>): Promise<T> => {
    let resolveResult!: (result: T | PromiseLike<T>) => void;
    let rejectResult!: (reason?: BoundaryValue) => void;
    const result = new Promise<T>((resolve, reject) => { resolveResult = resolve; rejectResult = reject; });
    writes = writes.then(async () => {
      const transaction = transactionOf(current);
      try {
        const value = await operation(transaction);
        if (options.clock !== undefined) {
          const now = options.clock.now();
          if (!(now instanceof Date) || !Number.isFinite(now.getTime())) {
            throw new CommunityError("PERSISTENCE_MIGRATION", "Community state clock returned an invalid instant");
          }
          transaction.setMetadata({ ...transaction.metadata, updatedAt: now.toISOString() });
        }
        const candidate = validateCommunityStateV3(exportTransaction(transaction));
        await options.persist?.(candidate);
        current = candidate;
        resolveResult(value);
      } catch (error) {
        rejectResult(error);
      }
    });
    await writes;
    return result;
  };

  return Object.freeze({
    read,
    write,
    export: () => read((snapshot) => exportSnapshot(snapshot)),
    import: async (input: CommunityStateExport) => {
      const validated = validateCommunityStateV3(input);
      await write((transaction) => replaceTransaction(transaction, validated));
    },
  });
}

function snapshotOf(state: CommunityStateV3): CommunityStateSnapshot {
  const entities = new Map(state.entities.map((entity) => [entity.ref.objectId, entity]));
  const projections = new Map(state.projectionDefinitions.map((projection) => [projection.definition.projectionId, projection]));
  const mounts = new Map(state.namespaceMounts.map((mount) => [mount.mountId, mount]));
  const checkpoints = new Map(state.sourceCheckpoints.map((checkpoint) => [checkpoint.sourceId, checkpoint]));
  return Object.freeze({
    metadata: structuredClone(state.metadata),
    entities: structuredClone(state.entities),
    relations: structuredClone(state.relations),
    projectionDefinitions: structuredClone(state.projectionDefinitions),
    namespaceMounts: structuredClone(state.namespaceMounts),
    sourceCheckpoints: structuredClone(state.sourceCheckpoints),
    quarantinedDefinitions: structuredClone(state.quarantinedDefinitions),
    entity: (objectId: string) => clone(entities.get(objectId)),
    projection: (projectionId: string) => clone(projections.get(projectionId)),
    mount: (mountId: string) => clone(mounts.get(mountId)),
    checkpoint: (sourceId: string) => clone(checkpoints.get(sourceId)),
  });
}

function transactionOf(state: CommunityStateV3): CommunityStateTransaction {
  let metadata = structuredClone(state.metadata);
  const entities = new Map(state.entities.map((entity) => [entity.ref.objectId, structuredClone(entity)]));
  const projections = new Map(state.projectionDefinitions.map((projection) => [projection.definition.projectionId, structuredClone(projection)]));
  const relations = new Map(state.relations.map((relation) => [relationKey(relation), structuredClone(relation)]));
  const mounts = new Map(state.namespaceMounts.map((mount) => [mount.mountId, structuredClone(mount)]));
  const checkpoints = new Map(state.sourceCheckpoints.map((checkpoint) => [checkpoint.sourceId, structuredClone(checkpoint)]));
  let quarantined = structuredClone(state.quarantinedDefinitions);
  const transaction = {
    get metadata() { return structuredClone(metadata); },
    get entities() { return structuredClone([...entities.values()]); },
    get relations() { return structuredClone([...relations.values()].sort(compareRelations)); },
    get projectionDefinitions() { return structuredClone([...projections.values()]); },
    get namespaceMounts() { return structuredClone([...mounts.values()]); },
    get sourceCheckpoints() { return structuredClone([...checkpoints.values()]); },
    get quarantinedDefinitions() { return structuredClone(quarantined); },
    entity: (objectId: string) => clone(entities.get(objectId)),
    projection: (projectionId: string) => clone(projections.get(projectionId)),
    mount: (mountId: string) => clone(mounts.get(mountId)),
    checkpoint: (sourceId: string) => clone(checkpoints.get(sourceId)),
    putEntity: (entity: CommunityEntity) => {
      const valid = validateCommunityEntity(entity);
      for (const relation of entities.get(valid.ref.objectId)?.relations ?? []) relations.delete(relationKey(relation));
      entities.set(valid.ref.objectId, valid);
      for (const relation of valid.relations) relations.set(relationKey(relation), structuredClone(relation));
    },
    deleteEntity: (objectId: string) => {
      const valid = validateObjectId(objectId);
      entities.delete(valid);
      for (const [key, relation] of relations) {
        if (relation.source.objectId === valid || relation.target.objectId === valid) relations.delete(key);
      }
    },
    putRelation: (relation: CommunityRelation) => { relations.set(relationKey(relation), structuredClone(relation)); },
    deleteRelation: (relation: CommunityRelation) => { relations.delete(relationKey(relation)); },
    putProjection: (projection: PersistedProjectionDefinition) => { projections.set(projection.definition.projectionId, structuredClone(projection)); },
    deleteProjection: (projectionId: string) => { projections.delete(projectionId); },
    putMount: (mount: NamespaceMount) => { mounts.set(mount.mountId, structuredClone(mount)); },
    deleteMount: (mountId: string) => { mounts.delete(mountId); },
    putCheckpoint: (checkpoint: CommunitySourceCheckpoint) => { checkpoints.set(checkpoint.sourceId, structuredClone(checkpoint)); },
    deleteCheckpoint: (sourceId: string) => { checkpoints.delete(sourceId); },
    putQuarantinedDefinition: (definition: QuarantinedProjectionDefinition) => { quarantined = [...quarantined, structuredClone(definition)]; },
    clearQuarantinedDefinitions: () => { quarantined = []; },
    setMetadata: (value: CommunityStateMetadata) => { metadata = structuredClone(value); },
  } satisfies CommunityStateTransaction;
  return transaction;
}

function replaceTransaction(transaction: CommunityStateTransaction, state: CommunityStateV3): void {
  for (const relation of transaction.relations) transaction.deleteRelation(relation);
  for (const entity of transaction.entities) transaction.deleteEntity(entity.ref.objectId);
  for (const projection of transaction.projectionDefinitions) transaction.deleteProjection(projection.definition.projectionId);
  for (const mount of transaction.namespaceMounts) transaction.deleteMount(mount.mountId);
  for (const checkpoint of transaction.sourceCheckpoints) transaction.deleteCheckpoint(checkpoint.sourceId);
  for (const entity of state.entities) transaction.putEntity(entity);
  for (const relation of state.relations) transaction.putRelation(relation);
  for (const projection of state.projectionDefinitions) transaction.putProjection(projection);
  for (const mount of state.namespaceMounts) transaction.putMount(mount);
  for (const checkpoint of state.sourceCheckpoints) transaction.putCheckpoint(checkpoint);
  transaction.setMetadata(state.metadata);
  transaction.clearQuarantinedDefinitions();
  for (const definition of state.quarantinedDefinitions) transaction.putQuarantinedDefinition(definition);
}

function exportTransaction(transaction: CommunityStateTransaction): CommunityStateV3 {
  return {
    schemaVersion: 3,
    metadata: transaction.metadata,
    entities: transaction.entities,
    relations: transaction.relations,
    projectionDefinitions: transaction.projectionDefinitions,
    namespaceMounts: transaction.namespaceMounts,
    sourceCheckpoints: transaction.sourceCheckpoints,
    quarantinedDefinitions: transaction.quarantinedDefinitions,
  };
}

function exportSnapshot(snapshot: CommunityStateSnapshot): CommunityStateExport {
  return validateCommunityStateV3({
    schemaVersion: 3,
    metadata: snapshot.metadata,
    entities: snapshot.entities,
    relations: snapshot.relations,
    projectionDefinitions: snapshot.projectionDefinitions,
    namespaceMounts: snapshot.namespaceMounts,
    sourceCheckpoints: snapshot.sourceCheckpoints,
    quarantinedDefinitions: snapshot.quarantinedDefinitions,
  });
}

function relationKey(relation: CommunityRelation): string {
  validateObjectRef(relation.source);
  validateObjectRef(relation.target);
  return `${relation.type}\0${relation.source.objectId}\0${relation.target.objectId}`;
}

function compareRelations(left: CommunityRelation, right: CommunityRelation): number {
  return left.type.localeCompare(right.type)
    || left.source.objectId.localeCompare(right.source.objectId)
    || left.target.objectId.localeCompare(right.target.objectId);
}

function validateObjectId(objectId: string): string {
  return validateObjectRef({ objectId, kind: "message" }).objectId;
}

function clone<T>(value: T | undefined): T | undefined {
  return value === undefined ? undefined : structuredClone(value);
}
