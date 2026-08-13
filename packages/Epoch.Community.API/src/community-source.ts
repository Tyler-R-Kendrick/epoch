import {
  canReadCommunityResource,
  boundedSourcePageSize,
  decodeSourceKeysetCursor,
  sourceKeysetCursor,
  type CommunityAuthorizationContext,
  type CommunityEntity,
  type CommunitySourceAdapter,
  type CommunitySourceCheckpoint,
  validateSourceCapabilities,
} from "@epoch/community-core";

export interface CommunityEntitySnapshotReader {
  readEntities(): Promise<readonly CommunityEntity[]>;
  checkpoint(): Promise<CommunitySourceCheckpoint>;
}

export function createCanonicalStoreSource(reader: CommunityEntitySnapshotReader): CommunitySourceAdapter {
  const sourceId = "community-store";
  const capabilities = validateSourceCapabilities({
    sourceId,
    fields: {},
    fullText: "none",
    pagination: "keyset",
    supportsWatch: false,
    supportsPointLookup: true,
    supportsRelations: true,
    maxPageSize: 1000,
  });
  const visible = (entity: CommunityEntity, authorization: CommunityAuthorizationContext): boolean => canReadCommunityResource({
    kind: entity.ref.kind,
    resourceId: entity.ref.objectId,
    visibility: entity.visibility,
    ownerId: entity.ownerId,
    participantIds: entity.participantIds,
  }, authorization);
  return Object.freeze({
    sourceId,
    capabilities: () => capabilities,
    checkpoint: () => reader.checkpoint(),
    scan: async ({ after, limit, authorization }: {
      readonly after?: string;
      readonly limit: number;
      readonly authorization: CommunityAuthorizationContext;
    }) => {
      const checkpoint = await reader.checkpoint();
      const afterId = after === undefined ? undefined : decodeSourceKeysetCursor(after, sourceId);
      const entities = [...await reader.readEntities()].filter((entity) => visible(entity, authorization))
        .sort((left, right) => left.ref.objectId.localeCompare(right.ref.objectId, "en"));
      const start = afterId === undefined ? 0 : entities.findIndex((entity) => entity.ref.objectId === afterId) + 1;
      const pageSize = boundedSourcePageSize(limit, capabilities);
      const page = entities.slice(start < 0 ? entities.length : start, (start < 0 ? entities.length : start) + pageSize);
      const last = page.at(-1);
      return Object.freeze({
        entities: Object.freeze(page),
        ...(last === undefined || start + page.length >= entities.length ? {} : { next: sourceKeysetCursor(sourceId, last.ref.objectId) }),
        checkpoint,
      });
    },
    get: async (refs: readonly { readonly objectId: string }[], authorization: CommunityAuthorizationContext) => {
      const wanted = new Set(refs.map((ref) => ref.objectId));
      return Object.freeze((await reader.readEntities()).filter((entity) => wanted.has(entity.ref.objectId) && visible(entity, authorization)));
    },
  });
}
