import {
  validateCommunityEntity,
  type CommunityAuthorizationContext,
  type CommunityEntity,
  type CommunityObjectKind,
  boundedSourcePageSize,
  decodeSourceKeysetCursor,
  sourceKeysetCursor,
  validateSourceCapabilities,
} from "@epoch/community-core";

export interface CommunityWebFixtureRecord {
  readonly id?: string;
  readonly objectId?: string;
  readonly kind?: CommunityObjectKind;
  readonly title?: string;
  readonly subject?: string;
  readonly body?: string;
  readonly author?: string;
  readonly authorId?: string;
  readonly state?: string;
  readonly visibility?: "private" | "shared" | "public";
  readonly ownerId?: string;
  readonly participantIds?: readonly string[];
  readonly publishedAt?: string;
  readonly createdAt?: string;
  readonly updatedAt?: string;
  readonly revision?: string;
  readonly channel?: string;
  readonly project?: string;
  readonly dm?: string;
}

export interface CommunityWebFixtureData {
  readonly posts?: readonly CommunityWebFixtureRecord[];
  readonly dmMessages?: readonly CommunityWebFixtureRecord[];
  readonly projectPosts?: readonly CommunityWebFixtureRecord[];
  readonly notifications?: readonly CommunityWebFixtureRecord[];
  readonly members?: readonly CommunityWebFixtureRecord[];
}

export function createCommunityWebSource(data: CommunityWebFixtureData, observedAt: string) {
  const sourceId = "community-web-host";
  const entities = normalizeCommunityWebData(data, observedAt);
  const token = `community-web:${observedAt}:${entities.length}`;
  const checkpoint = Object.freeze({ sourceId, token, observedAt, status: "current" as const });
  const capabilities = validateSourceCapabilities({
    sourceId,
    fields: {},
    fullText: "none",
    pagination: "keyset",
    supportsWatch: false,
    supportsPointLookup: true,
    supportsRelations: false,
    maxPageSize: 500,
  });
  return Object.freeze({
    sourceId,
    capabilities: () => capabilities,
    checkpoint: async () => checkpoint,
    scan: async ({ after, limit, authorization }: { readonly after?: string; readonly limit: number; readonly authorization: CommunityAuthorizationContext }) => {
      const afterId = after === undefined ? undefined : decodeSourceKeysetCursor(after, sourceId);
      const visible = entities.filter((entity) => canRead(entity, authorization));
      const start = afterId === undefined ? 0 : visible.findIndex((entity) => entity.ref.objectId === afterId) + 1;
      const pageSize = boundedSourcePageSize(limit, capabilities);
      const page = visible.slice(start < 0 ? visible.length : start, (start < 0 ? visible.length : start) + pageSize);
      const last = page.at(-1);
      return Object.freeze({
        entities: Object.freeze(page),
        ...(last === undefined || start + page.length >= visible.length ? undefined : { next: sourceKeysetCursor(sourceId, last.ref.objectId) }),
        checkpoint,
      });
    },
    get: async (refs: readonly { readonly objectId: string }[], authorization: CommunityAuthorizationContext) => {
      const wanted = new Set(refs.map((ref) => ref.objectId));
      return Object.freeze(entities.filter((entity) => wanted.has(entity.ref.objectId) && canRead(entity, authorization)));
    },
  });
}

export function normalizeCommunityWebData(data: CommunityWebFixtureData, observedAt: string): readonly CommunityEntity[] {
  const groups: readonly [keyof CommunityWebFixtureData, CommunityObjectKind, CommunityEntity["visibility"]][] = [
    ["posts", "message", "public"],
    ["dmMessages", "message", "private"],
    ["projectPosts", "message", "shared"],
    ["notifications", "notification", "private"],
    ["members", "member", "public"],
  ];
  const entities = groups.flatMap(([key, defaultKind, defaultVisibility]) => (data[key] ?? []).map((record) => {
    const objectId = record.objectId ?? record.id;
    if (objectId === undefined) throw new Error(`Community Web ${key} record has no canonical object ID`);
    const createdAt = record.publishedAt ?? record.createdAt;
    if (createdAt === undefined) throw new Error(`Community Web ${key} record has no persisted timestamp`);
    const title = record.title ?? record.subject ?? "";
    const body = record.body ?? "";
    const visibility = record.visibility ?? defaultVisibility;
    return validateCommunityEntity({
      ref: { objectId, kind: record.kind ?? defaultKind, ...(record.revision === undefined ? undefined : { revision: record.revision }) },
      fields: {
        objectId,
        kind: record.kind ?? defaultKind,
        title,
        body,
        author: record.authorId ?? record.author ?? "unknown",
        state: record.state ?? "read",
        visibility,
        createdAt,
        updatedAt: record.updatedAt ?? createdAt,
        ...(record.channel === undefined ? undefined : { channelId: record.channel }),
        ...(record.project === undefined ? undefined : { projectId: record.project }),
        ...(record.dm === undefined ? undefined : { dmId: record.dm }),
      },
      searchableText: { title, body },
      relations: [],
      visibility,
      ...(record.ownerId === undefined ? undefined : { ownerId: record.ownerId }),
      participantIds: record.participantIds ?? [],
      createdAt,
      updatedAt: record.updatedAt ?? createdAt,
      provenance: { sourceId: "community-web-host", nativeId: record.id ?? objectId, observedAt, ...(record.revision === undefined ? undefined : { revision: record.revision }) },
    });
  }));
  const ids = new Set<string>();
  for (const entity of entities) {
    if (ids.has(entity.ref.objectId)) throw new Error(`Duplicate Community Web canonical object ID: ${entity.ref.objectId}`);
    ids.add(entity.ref.objectId);
  }
  return Object.freeze(entities.sort((left, right) => left.ref.objectId.localeCompare(right.ref.objectId, "en")));
}

function canRead(entity: CommunityEntity, authorization: CommunityAuthorizationContext): boolean {
  return entity.visibility === "public" || authorization.actorId !== undefined && (
    entity.ownerId === authorization.actorId || entity.visibility === "shared" && entity.participantIds.includes(authorization.actorId)
  );
}
