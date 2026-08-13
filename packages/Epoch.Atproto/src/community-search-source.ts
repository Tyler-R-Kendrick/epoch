import {
  validateCommunityEntity,
  type CommunityAuthorizationContext,
  type CommunityEntity,
  type CommunityObjectKind,
  type CommunitySearchChangeSet,
  boundedSourcePageSize,
  decodeSourceKeysetCursor,
  sourceKeysetCursor,
  validateSourceCapabilities,
} from "@epoch/community-core";
import type { AtRecord, CommunityFederationMode } from "./index";
import { EpochLexicon } from "./index";

export interface AtprotoCommunitySourceInput {
  readonly records: () => readonly AtRecord[] | Promise<readonly AtRecord[]>;
  readonly mode: CommunityFederationMode;
  readonly observedAt: string;
}

const KIND_BY_COLLECTION: Readonly<Record<string, CommunityObjectKind>> = Object.freeze({
  [EpochLexicon.profile]: "member",
  [EpochLexicon.follow]: "artifact",
  [EpochLexicon.star]: "artifact",
  [EpochLexicon.repo]: "project",
  [EpochLexicon.release]: "artifact",
  [EpochLexicon.issue]: "issue",
  [EpochLexicon.issueComment]: "message",
  [EpochLexicon.proposal]: "change",
  [EpochLexicon.proposalReview]: "message",
});

export function createAtprotoCommunitySource(input: AtprotoCommunitySourceInput) {
  const sourceId = "atproto";
  const capabilities = validateSourceCapabilities({
    sourceId,
    fields: {
      "atproto.collection": { type: "keyword", operators: ["eq", "ne", "in", "exists", "term", "prefix"], sortable: true, facetable: true },
      "atproto.did": { type: "keyword", operators: ["eq", "ne", "in", "exists", "term", "prefix"], sortable: true, facetable: true },
      "atproto.repo": { type: "keyword", operators: ["eq", "ne", "in", "exists", "term", "prefix"], sortable: true, facetable: true },
    },
    fullText: "none",
    pagination: "keyset",
    supportsWatch: false,
    supportsPointLookup: true,
    supportsRelations: false,
    maxPageSize: 500,
  });
  const records = async () => input.mode === "disabled" ? [] : discoverableRecords(await input.records());
  const checkpoint = async () => atprotoCheckpoint(sourceId, input.mode, input.observedAt, await records());
  const entities = async (current = records()) => normalizeAtprotoRecords(await current);
  return Object.freeze({
    sourceId,
    capabilities: () => capabilities,
    checkpoint,
    scan: async ({ after, limit, authorization: _authorization }: { readonly after?: string; readonly limit: number; readonly authorization: CommunityAuthorizationContext }) => {
      const currentRecords = await records();
      const current = await entities(Promise.resolve(currentRecords));
      const afterId = after === undefined ? undefined : decodeSourceKeysetCursor(after, sourceId);
      const start = afterId === undefined ? 0 : current.findIndex((entity) => entity.ref.objectId === afterId) + 1;
      const pageSize = boundedSourcePageSize(limit, capabilities);
      const page = current.slice(start < 0 ? current.length : start, (start < 0 ? current.length : start) + pageSize);
      const last = page.at(-1);
      return Object.freeze({
        entities: Object.freeze(page),
        ...(last === undefined || start + page.length >= current.length ? {} : { next: sourceKeysetCursor(sourceId, last.ref.objectId) }),
        checkpoint: atprotoCheckpoint(sourceId, input.mode, input.observedAt, currentRecords),
      });
    },
    get: async (refs: readonly { readonly objectId: string }[], _authorization: CommunityAuthorizationContext) => {
      const wanted = new Set(refs.map((ref) => ref.objectId));
      return Object.freeze((await entities()).filter((entity) => wanted.has(entity.ref.objectId)));
    },
  });
}

export async function normalizeAtprotoRecords(records: readonly AtRecord[]): Promise<readonly CommunityEntity[]> {
  const entities: CommunityEntity[] = [];
  for (const record of records) {
    if (record.value.visibility === "private" || record.value.visibility === "shared") continue;
    const kind = KIND_BY_COLLECTION[record.collection];
    if (kind === undefined) continue;
    entities.push(await atRecordEntity(record, kind));
  }
  return Object.freeze(entities.sort((left, right) => left.ref.objectId.localeCompare(right.ref.objectId, "en")));
}

function discoverableRecords(records: readonly AtRecord[]): readonly AtRecord[] {
  return records.filter((record) => record.value.visibility !== "private" && record.value.visibility !== "shared"
    && KIND_BY_COLLECTION[record.collection] !== undefined);
}

export async function atprotoDeletionChangeSet(input: {
  readonly deleted: readonly AtRecord[];
  readonly checkpoint: { readonly token: string; readonly observedAt: string; readonly status: "current" | "stale" | "partial" | "unavailable" };
}): Promise<CommunitySearchChangeSet> {
  const deletes = await Promise.all(input.deleted.filter((record) => KIND_BY_COLLECTION[record.collection] !== undefined)
    .map(async (record) => ({ objectId: await stableAtprotoObjectId(record.uri), kind: KIND_BY_COLLECTION[record.collection] as CommunityObjectKind, atUri: record.uri, revision: record.cid })));
  return Object.freeze({
    sourceId: "atproto",
    checkpoint: Object.freeze({ sourceId: "atproto", ...input.checkpoint }),
    upserts: Object.freeze([]),
    deletes: Object.freeze(deletes),
    observedAt: input.checkpoint.observedAt,
  });
}

async function atRecordEntity(record: AtRecord, kind: CommunityObjectKind): Promise<CommunityEntity> {
  validateAtRecord(record);
  const objectId = await stableAtprotoObjectId(record.uri);
  const createdAt = stringField(record.value, "createdAt") ?? record.createdAt;
  const updatedAt = stringField(record.value, "updatedAt") ?? createdAt;
  const title = stringField(record.value, "title") ?? stringField(record.value, "name") ?? stringField(record.value, "displayName") ?? "";
  const body = stringField(record.value, "body") ?? stringField(record.value, "description") ?? stringField(record.value, "bio") ?? "";
  const repo = stringField(record.value, "repo") ?? stringField(record.value, "repoSlug");
  return validateCommunityEntity({
    ref: { objectId, kind, atUri: record.uri, revision: record.cid },
    fields: {
      objectId,
      kind,
      title,
      body,
      author: record.did,
      uri: record.uri,
      createdAt,
      updatedAt,
      visibility: "public",
      "atproto.collection": record.collection,
      "atproto.did": record.did,
      ...(repo === undefined ? {} : { "atproto.repo": repo }),
    },
    searchableText: { title, body },
    relations: [],
    visibility: "public",
    ownerId: record.did,
    participantIds: [],
    createdAt,
    updatedAt,
    provenance: {
      sourceId: "atproto",
      nativeId: record.uri,
      observedAt: record.createdAt,
      uri: record.uri,
      revision: record.cid,
    },
  });
}

async function stableAtprotoObjectId(uri: string): Promise<string> {
  const subtle = globalThis.crypto?.subtle;
  if (subtle === undefined) throw new Error("SHA-256 is unavailable for ATProto identity mapping");
  const digest = new Uint8Array(await subtle.digest("SHA-256", new TextEncoder().encode(`epoch-atproto-v1\0${uri}`)));
  return `at-${[...digest].map((value) => value.toString(16).padStart(2, "0")).join("")}`;
}

function atprotoCheckpoint(sourceId: string, mode: CommunityFederationMode, observedAt: string, records: readonly AtRecord[]) {
  const ordered = [...records].sort((left, right) => left.uri.localeCompare(right.uri, "en"));
  return Object.freeze({
    sourceId,
    token: `${mode}:${ordered.length}:${ordered.at(-1)?.cid ?? "empty"}`,
    observedAt,
    status: mode === "disabled" ? "unavailable" as const : mode === "local-only" ? "partial" as const : "current" as const,
    ...(mode === "disabled" ? { detail: "ATProto federation is disabled" } : mode === "local-only" ? { detail: "Local records only" } : {}),
  });
}

function validateAtRecord(record: AtRecord): void {
  if (!/^at:\/\/[^/]+\/[^/]+\/[^/]+$/u.test(record.uri) || record.collection.length > 256 || record.cid.length > 512
    || record.did.length > 512 || typeof record.value !== "object" || record.value === null) {
    throw new Error("Malformed ATProto community record");
  }
  if (record.value.$type !== undefined && record.value.$type !== record.collection) throw new Error("ATProto record type does not match its collection");
}

function stringField(value: Record<string, unknown>, field: string): string | undefined {
  const candidate = value[field];
  if (candidate === undefined) return undefined;
  if (typeof candidate !== "string" || candidate.length > 1_000_000) throw new Error(`Malformed ATProto ${field} field`);
  return candidate;
}
