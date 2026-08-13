import { CommunityError } from "./errors";
import type { CommunityMessage, CommunityRelation, CommunityTombstone } from "./graph";
import { validateObjectRef, type CommunityObjectRef } from "./identity";

export type CommunityFieldScalar = string | number | boolean | null;
export type CommunityFieldValue = CommunityFieldScalar | readonly CommunityFieldScalar[];

export interface CommunityProvenance {
  readonly sourceId: string;
  readonly nativeId: string;
  readonly observedAt: string;
  readonly checkpoint?: string;
  readonly uri?: string;
  readonly revision?: string;
}

export interface CommunityEntity {
  readonly ref: CommunityObjectRef;
  readonly fields: Readonly<Record<string, CommunityFieldValue>>;
  readonly searchableText: Readonly<Record<string, string>>;
  readonly relations: readonly CommunityRelation[];
  readonly visibility: "private" | "shared" | "public";
  readonly ownerId?: string;
  readonly participantIds: readonly string[];
  readonly createdAt: string;
  readonly updatedAt: string;
  readonly provenance: CommunityProvenance;
  readonly tombstone?: CommunityTombstone;
}

export interface CommunityMessageEntity extends CommunityEntity {
  readonly domain: {
    readonly kind: "message";
    readonly value: CommunityMessage;
  };
}

export interface CommunityMessageEntityOptions {
  readonly provenance: CommunityProvenance;
  readonly visibility: CommunityEntity["visibility"];
  readonly ownerId?: string;
  readonly participantIds?: readonly string[];
}

const FIELD_NAME = /^[A-Za-z][A-Za-z0-9-]*(?:\.[A-Za-z][A-Za-z0-9-]*)*$/u;
const RELATION_TYPES = new Set<CommunityRelation["type"]>([
  "reply", "quote", "mention", "provenance", "promotion", "replacement",
  "moderation", "attachment", "backlink",
]);

export function communityMessageToEntity(
  message: CommunityMessage,
  options: CommunityMessageEntityOptions,
): CommunityMessageEntity {
  const value = cloneMessage(message);
  const participantIds = canonicalStrings(options.participantIds ?? []);
  const fields: Record<string, CommunityFieldValue> = {
    objectId: value.ref.objectId,
    kind: value.ref.kind,
    author: value.authorId,
    state: value.state,
    contextId: value.context.objectId,
    ...(value.context.kind === "channel" ? { channelId: value.context.objectId } : {}),
    ...(value.context.kind === "dm" ? { dmId: value.context.objectId } : {}),
    ...(value.context.kind === "project" ? { projectId: value.context.objectId } : {}),
    createdAt: value.publishedAt,
    updatedAt: value.updatedAt ?? value.publishedAt,
    visibility: options.visibility,
    aliases: [...value.aliases],
    participantIds,
    ...(value.title === undefined ? {} : { title: value.title }),
    ...(value.inReplyTo === undefined ? {} : { parentId: value.inReplyTo.objectId }),
    ...(value.reactions === undefined ? {} : {
      reactions: Object.keys(value.reactions).filter((token) => (value.reactions?.[token] ?? 0) > 0).sort(),
      score: Object.values(value.reactions).reduce((sum, count) => sum + Math.max(0, count), 0),
    }),
    has: [...new Set([
      ...(value.title === undefined ? [] : ["subject", "title"]),
      ...(value.inReplyTo === undefined ? [] : ["re", "reply", "parent"]),
      ...(Object.values(value.reactions ?? {}).some((count) => count > 0) ? ["reaction", "reactions"] : []),
      ...value.relations.map((relation) => relation.type),
    ])],
  };
  const entity: CommunityMessageEntity = {
    ref: value.ref,
    fields: Object.freeze(fields),
    searchableText: Object.freeze({
      title: value.title ?? "",
      body: value.body,
      author: value.authorId,
    }),
    relations: value.relations,
    visibility: options.visibility,
    ...(options.ownerId === undefined ? {} : { ownerId: options.ownerId }),
    participantIds,
    createdAt: value.publishedAt,
    updatedAt: value.updatedAt ?? value.publishedAt,
    provenance: cloneProvenance(options.provenance),
    ...(value.tombstone === undefined ? {} : { tombstone: value.tombstone }),
    domain: Object.freeze({ kind: "message", value }),
  };
  return validateCommunityEntity(entity) as CommunityMessageEntity;
}

export function communityEntityToMessage(entity: CommunityEntity): CommunityMessage {
  const validated = validateCommunityEntity(entity) as CommunityEntity & Partial<CommunityMessageEntity>;
  if (validated.domain?.kind !== "message") {
    throw new CommunityError("INVALID_ENTITY", "Community entity is not a lossless message projection");
  }
  return cloneMessage(validated.domain.value);
}

export function validateCommunityEntity(value: unknown): CommunityEntity {
  if (typeof value !== "object" || value === null) invalid("Community entity must be an object");
  const input = value as Partial<CommunityEntity> & { readonly domain?: unknown };
  const ref = validateObjectRef(input.ref);
  const fields = validateFields(input.fields);
  const searchableText = validateSearchableText(input.searchableText);
  const relations = validateRelations(input.relations);
  if (!(["private", "shared", "public"] as const).includes(input.visibility as CommunityEntity["visibility"])) {
    invalid("Community entity visibility is invalid");
  }
  const participantIds = canonicalStrings(input.participantIds, "participantIds");
  const createdAt = validateIsoDateTime(input.createdAt, "createdAt");
  const updatedAt = validateIsoDateTime(input.updatedAt, "updatedAt");
  const provenance = cloneProvenance(input.provenance);
  const domain = validateDomain(input.domain, ref, createdAt, updatedAt);
  return Object.freeze({
    ref,
    fields,
    searchableText,
    relations,
    visibility: input.visibility as CommunityEntity["visibility"],
    ...(input.ownerId === undefined ? {} : { ownerId: boundedString(input.ownerId, "ownerId") }),
    participantIds,
    createdAt,
    updatedAt,
    provenance,
    ...(input.tombstone === undefined ? {} : { tombstone: cloneTombstone(input.tombstone) }),
    ...(domain === undefined ? {} : { domain }),
  });
}

export function isCommunityFieldValue(value: unknown): value is CommunityFieldValue {
  return isScalar(value) || (Array.isArray(value) && value.length <= 4096 && value.every(isScalar));
}

export function validateIsoDateTime(value: unknown, label = "datetime"): string {
  if (typeof value !== "string" || value.length > 128 || !/(?:Z|[+-]\d{2}:\d{2})$/u.test(value)) {
    invalid(`${label} must be an ISO 8601 datetime with an explicit timezone`);
  }
  const timestamp = Date.parse(value as string);
  if (!Number.isFinite(timestamp)) invalid(`${label} must be a valid datetime`);
  return new Date(timestamp).toISOString();
}

function validateFields(value: unknown): Readonly<Record<string, CommunityFieldValue>> {
  if (typeof value !== "object" || value === null || Array.isArray(value)) invalid("Community entity fields must be an object");
  const output: Record<string, CommunityFieldValue> = Object.create(null) as Record<string, CommunityFieldValue>;
  for (const [name, field] of Object.entries(value as Record<string, unknown>)) {
    if (!FIELD_NAME.test(name)) invalid(`Invalid community field name: ${name}`);
    if (!isCommunityFieldValue(field)) invalid(`Community field value is invalid: ${name}`);
    output[name] = Array.isArray(field) ? Object.freeze([...field]) : field;
  }
  return Object.freeze(output);
}

function validateSearchableText(value: unknown): Readonly<Record<string, string>> {
  if (typeof value !== "object" || value === null || Array.isArray(value)) invalid("searchableText must be an object");
  const output: Record<string, string> = Object.create(null) as Record<string, string>;
  for (const [name, text] of Object.entries(value as Record<string, unknown>)) {
    if (!FIELD_NAME.test(name) || typeof text !== "string" || text.length > 10_000_000) invalid(`Invalid searchable text field: ${name}`);
    output[name] = text;
  }
  return Object.freeze(output);
}

function validateRelations(value: unknown): readonly CommunityRelation[] {
  if (!Array.isArray(value) || value.length > 100_000) invalid("Community entity relations must be a bounded array");
  return Object.freeze(value.map((candidate) => {
    if (typeof candidate !== "object" || candidate === null) invalid("Community relation must be an object");
    const relation = candidate as Partial<CommunityRelation>;
    if (!RELATION_TYPES.has(relation.type as CommunityRelation["type"])) invalid(`Unsupported community relation: ${String(relation.type)}`);
    return Object.freeze({
      type: relation.type as CommunityRelation["type"],
      source: validateObjectRef(relation.source),
      target: validateObjectRef(relation.target),
    });
  }));
}

function cloneProvenance(value: unknown): CommunityProvenance {
  if (typeof value !== "object" || value === null) invalid("Community provenance must be an object");
  const provenance = value as Partial<CommunityProvenance>;
  const uri = provenance.uri;
  if (uri !== undefined) validateProvenanceUri(uri);
  return Object.freeze({
    sourceId: boundedString(provenance.sourceId, "provenance.sourceId"),
    nativeId: boundedString(provenance.nativeId, "provenance.nativeId"),
    observedAt: validateIsoDateTime(provenance.observedAt, "provenance.observedAt"),
    ...(provenance.checkpoint === undefined ? {} : { checkpoint: boundedString(provenance.checkpoint, "provenance.checkpoint", 4096) }),
    ...(uri === undefined ? {} : { uri }),
    ...(provenance.revision === undefined ? {} : { revision: boundedString(provenance.revision, "provenance.revision", 4096) }),
  });
}

function validateProvenanceUri(value: unknown): string {
  if (typeof value !== "string" || value.length === 0 || value.length > 4096 || [...value].some((character) => {
    const code = character.codePointAt(0) ?? 0;
    return code <= 32 || code === 127;
  })) {
    invalid("Community provenance URI is invalid");
  }
  if (/^at:\/\/[^/]+\/[^/]+\/[^/]+$/u.test(value as string)) return value as string;
  try {
    const uri = new URL(value as string);
    if (!["https:", "http:"].includes(uri.protocol) || uri.username || uri.password) invalid("Community provenance URI is invalid");
  } catch { invalid("Community provenance URI is invalid"); }
  return value as string;
}

function cloneMessage(message: CommunityMessage): CommunityMessage {
  const publishedAt = validateIsoDateTime(message.publishedAt, "message.publishedAt");
  const updatedAt = message.updatedAt === undefined ? undefined : validateIsoDateTime(message.updatedAt, "message.updatedAt");
  const relations = validateRelations(message.relations);
  const reactions = message.reactions === undefined ? undefined : Object.freeze({ ...message.reactions });
  if (reactions !== undefined && Object.entries(reactions).some(([token, count]) => token.length === 0 || !Number.isFinite(count) || count < 0)) {
    invalid("Message reactions must contain finite non-negative counts");
  }
  return Object.freeze({
    ref: validateObjectRef(message.ref),
    context: validateObjectRef(message.context),
    authorId: boundedString(message.authorId, "message.authorId"),
    ...(message.title === undefined ? {} : { title: message.title }),
    body: message.body,
    publishedAt,
    ...(updatedAt === undefined ? {} : { updatedAt }),
    ...(message.inReplyTo === undefined ? {} : { inReplyTo: validateObjectRef(message.inReplyTo) }),
    threadRoot: validateObjectRef(message.threadRoot),
    relations,
    ...(reactions === undefined ? {} : { reactions }),
    state: boundedString(message.state, "message.state"),
    aliases: canonicalStrings(message.aliases, "message.aliases", false),
    ...(message.tombstone === undefined ? {} : { tombstone: cloneTombstone(message.tombstone) }),
  });
}

function validateDomain(
  value: unknown,
  ref: CommunityObjectRef,
  createdAt: string,
  updatedAt: string,
): CommunityMessageEntity["domain"] | undefined {
  if (value === undefined) return undefined;
  if (typeof value !== "object" || value === null || (value as { readonly kind?: unknown }).kind !== "message") {
    invalid("Unsupported community entity domain projection");
  }
  const message = cloneMessage((value as { readonly value: CommunityMessage }).value);
  if (message.ref.objectId !== ref.objectId || message.publishedAt !== createdAt || (message.updatedAt ?? message.publishedAt) !== updatedAt) {
    invalid("Message projection does not match its canonical entity");
  }
  return Object.freeze({ kind: "message", value: message });
}

function cloneTombstone(value: unknown): CommunityTombstone {
  if (typeof value !== "object" || value === null) invalid("Community tombstone must be an object");
  const tombstone = value as Partial<CommunityTombstone>;
  if (!(["deleted", "moderated", "missing", "unavailable", "unauthorized"] as const).includes(tombstone.reason as CommunityTombstone["reason"])) {
    invalid("Community tombstone reason is invalid");
  }
  const formerKind = validateObjectRef({ objectId: "former-kind", kind: tombstone.formerKind }).kind;
  return Object.freeze({
    formerKind,
    reason: tombstone.reason as CommunityTombstone["reason"],
    ...(tombstone.deletedAt === undefined ? {} : { deletedAt: validateIsoDateTime(tombstone.deletedAt, "tombstone.deletedAt") }),
    ...(tombstone.replacement === undefined ? {} : { replacement: validateObjectRef(tombstone.replacement) }),
  }) as CommunityTombstone;
}

function canonicalStrings(value: unknown, label = "values", sort = true): readonly string[] {
  if (!Array.isArray(value) || value.length > 4096 || value.some((item) => typeof item !== "string" || item.length > 4096)) {
    invalid(`${label} must be a bounded string array`);
  }
  const output = [...(value as string[])];
  return Object.freeze(sort ? [...new Set(output)].sort() : output);
}

function boundedString(value: unknown, label: string, limit = 512): string {
  if (typeof value !== "string" || value.length === 0 || value.length > limit || value.includes(String.fromCharCode(0))) {
    invalid(`${label} must be a bounded string`);
  }
  return value.normalize("NFC");
}

function isScalar(value: unknown): value is CommunityFieldScalar {
  return value === null || typeof value === "string" || typeof value === "boolean"
    || (typeof value === "number" && Number.isFinite(value));
}

function invalid(message: string): never {
  throw new CommunityError("INVALID_ENTITY", message);
}
