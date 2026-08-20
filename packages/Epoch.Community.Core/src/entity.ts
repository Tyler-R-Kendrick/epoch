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
  const fields = {
    objectId: value.ref.objectId,
    kind: value.ref.kind,
    author: value.authorId,
    state: value.state,
    contextId: value.context.objectId,
    createdAt: value.publishedAt,
    updatedAt: value.updatedAt ?? value.publishedAt,
    visibility: options.visibility,
    aliases: [...value.aliases],
    participantIds,
    has: [...new Set([
      ...(value.title === undefined ? [] : ["subject", "title"]),
      ...(value.inReplyTo === undefined ? [] : ["re", "reply", "parent"]),
      ...(Object.values(value.reactions ?? {}).some((count) => count > 0) ? ["reaction", "reactions"] : []),
      ...value.relations.map((relation) => relation.type),
    ])],
  } satisfies Record<string, CommunityFieldValue>;
  if (value.context.kind === "channel") Object.assign(fields, { channelId: value.context.objectId });
  if (value.context.kind === "dm") Object.assign(fields, { dmId: value.context.objectId });
  if (value.context.kind === "project") Object.assign(fields, { projectId: value.context.objectId });
  if (value.title !== undefined) Object.assign(fields, { title: value.title });
  if (value.inReplyTo !== undefined) Object.assign(fields, { parentId: value.inReplyTo.objectId });
  if (value.reactions !== undefined) Object.assign(fields, {
    reactions: Object.keys(value.reactions).filter((token) => (value.reactions?.[token] ?? 0) > 0).sort(),
    score: Object.values(value.reactions).reduce((sum, count) => sum + Math.max(0, count), 0),
  });
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
    participantIds,
    createdAt: value.publishedAt,
    updatedAt: value.updatedAt ?? value.publishedAt,
    provenance: cloneProvenance(options.provenance),
    domain: Object.freeze({ kind: "message", value }),
  };
  if (options.ownerId !== undefined) Object.assign(entity, { ownerId: options.ownerId });
  if (value.tombstone !== undefined) Object.assign(entity, { tombstone: value.tombstone });
  // SAFETY: The surrounding validation and domain contract establish the asserted type.
  return validateCommunityEntity(entity) as CommunityMessageEntity;
}

export function communityEntityToMessage(entity: CommunityEntity): CommunityMessage {
  // SAFETY: The surrounding validation and domain contract establish the asserted type.
  const validated = validateCommunityEntity(entity) as CommunityEntity & Partial<CommunityMessageEntity>;
  if (validated.domain?.kind !== "message") {
    throw new CommunityError("INVALID_ENTITY", "Community entity is not a lossless message projection");
  }
  return cloneMessage(validated.domain.value);
}

export function validateCommunityEntity<Value>(value: Value): CommunityEntity {
  if (!isNonNullObject(value)) invalid("Community entity must be an object");
  // SAFETY: The surrounding validation and domain contract establish the asserted type.
  const input = value as Partial<CommunityEntity> & { readonly domain?: unknown };
  const ref = validateObjectRef(input.ref);
  const fields = validateFields(input.fields);
  const searchableText = validateSearchableText(input.searchableText);
  const relations = validateRelations(input.relations);
  // SAFETY: The surrounding validation and domain contract establish the asserted type.
  if (!(["private", "shared", "public"] as const).includes(input.visibility as CommunityEntity["visibility"])) {
    invalid("Community entity visibility is invalid");
  }
  const participantIds = canonicalStrings(input.participantIds, "participantIds");
  const createdAt = validateIsoDateTime(input.createdAt, "createdAt");
  const updatedAt = validateIsoDateTime(input.updatedAt, "updatedAt");
  const provenance = cloneProvenance(input.provenance);
  const domain = validateDomain(input.domain, ref, createdAt, updatedAt);
  const entity: CommunityEntity = {
    ref,
    fields,
    searchableText,
    relations,
    // SAFETY: The surrounding validation and domain contract establish the asserted type.
    visibility: input.visibility as CommunityEntity["visibility"],
    participantIds,
    createdAt,
    updatedAt,
    provenance,
  };
  if (input.ownerId !== undefined) Object.assign(entity, { ownerId: boundedString(input.ownerId, "ownerId") });
  if (input.tombstone !== undefined) Object.assign(entity, { tombstone: cloneTombstone(input.tombstone) });
  if (domain !== undefined) Object.assign(entity, { domain });
  return Object.freeze(entity);
}

export function isCommunityFieldValue<Value>(value: Value): value is Value & CommunityFieldValue {
  return isScalar(value) || (Array.isArray(value) && value.length <= 4096 && value.every(isScalar));
}

export function validateIsoDateTime<Value>(value: Value, label = "datetime"): string {
  if (!isString(value) || value.length > 128 || !/(?:Z|[+-]\d{2}:\d{2})$/u.test(value)) {
    invalid(`${label} must be an ISO 8601 datetime with an explicit timezone`);
  }
  // SAFETY: The surrounding validation and domain contract establish the asserted type.
  const timestamp = Date.parse(value);
  if (!Number.isFinite(timestamp)) invalid(`${label} must be a valid datetime`);
  return new Date(timestamp).toISOString();
}

function validateFields<Value>(value: Value): Readonly<Record<string, CommunityFieldValue>> {
  if (!isNonNullObject(value) || Array.isArray(value)) invalid("Community entity fields must be an object");
  // SAFETY: The surrounding validation and domain contract establish the asserted type.
  const output: Record<string, CommunityFieldValue> = Object.create(null) as Record<string, CommunityFieldValue>;
  // SAFETY: The surrounding validation and domain contract establish the asserted type.
  for (const [name, field] of Object.entries(value)) {
    if (!FIELD_NAME.test(name)) invalid(`Invalid community field name: ${name}`);
    if (!isCommunityFieldValue(field)) invalid(`Community field value is invalid: ${name}`);
    output[name] = Array.isArray(field) ? Object.freeze([...field]) : field;
  }
  return Object.freeze(output);
}

function validateSearchableText<Value>(value: Value): Readonly<Record<string, string>> {
  if (!isNonNullObject(value) || Array.isArray(value)) invalid("searchableText must be an object");
  // SAFETY: The surrounding validation and domain contract establish the asserted type.
  const output: Record<string, string> = Object.create(null) as Record<string, string>;
  // SAFETY: The surrounding validation and domain contract establish the asserted type.
  for (const [name, text] of Object.entries(value)) {
    if (!FIELD_NAME.test(name) || !isString(text) || text.length > 10_000_000) invalid(`Invalid searchable text field: ${name}`);
    output[name] = text;
  }
  return Object.freeze(output);
}

function validateRelations<Value>(value: Value): readonly CommunityRelation[] {
  if (!Array.isArray(value) || value.length > 100_000) invalid("Community entity relations must be a bounded array");
  return Object.freeze(value.map((candidate) => {
    if (!isNonNullObject(candidate)) invalid("Community relation must be an object");
    // SAFETY: The surrounding validation and domain contract establish the asserted type.
    const relation = candidate as Partial<CommunityRelation>;
    // SAFETY: The surrounding validation and domain contract establish the asserted type.
    if (!RELATION_TYPES.has(relation.type as CommunityRelation["type"])) invalid(`Unsupported community relation: ${String(relation.type)}`);
    return Object.freeze({
      // SAFETY: The surrounding validation and domain contract establish the asserted type.
      type: relation.type as CommunityRelation["type"],
      source: validateObjectRef(relation.source),
      target: validateObjectRef(relation.target),
    });
  }));
}

function cloneProvenance<Value>(value: Value): CommunityProvenance {
  if (!isNonNullObject(value)) invalid("Community provenance must be an object");
  // SAFETY: The surrounding validation and domain contract establish the asserted type.
  const provenance = value as Partial<CommunityProvenance>;
  const uri = provenance.uri;
  if (uri !== undefined) validateProvenanceUri(uri);
  const cloned: CommunityProvenance = {
    sourceId: boundedString(provenance.sourceId, "provenance.sourceId"),
    nativeId: boundedString(provenance.nativeId, "provenance.nativeId"),
    observedAt: validateIsoDateTime(provenance.observedAt, "provenance.observedAt"),
  };
  if (provenance.checkpoint !== undefined) Object.assign(cloned, { checkpoint: boundedString(provenance.checkpoint, "provenance.checkpoint", 4096) });
  if (uri !== undefined) Object.assign(cloned, { uri });
  if (provenance.revision !== undefined) Object.assign(cloned, { revision: boundedString(provenance.revision, "provenance.revision", 4096) });
  return Object.freeze(cloned);
}

function validateProvenanceUri<Value>(value: Value): string {
  if (!isString(value) || value.length === 0 || value.length > 4096 || [...value].some((character) => {
    const code = character.codePointAt(0) ?? 0;
    return code <= 32 || code === 127;
  })) {
    invalid("Community provenance URI is invalid");
  }
  // SAFETY: The surrounding validation and domain contract establish the asserted type.
  if (/^at:\/\/[^/]+\/[^/]+\/[^/]+$/u.test(value)) return value;
  try {
    // SAFETY: The surrounding validation and domain contract establish the asserted type.
    const uri = new URL(value);
    if (!["https:", "http:"].includes(uri.protocol) || uri.username || uri.password) invalid("Community provenance URI is invalid");
  } catch { invalid("Community provenance URI is invalid"); }
  // SAFETY: The surrounding validation and domain contract establish the asserted type.
  return value;
}

function cloneMessage(message: CommunityMessage): CommunityMessage {
  const publishedAt = validateIsoDateTime(message.publishedAt, "message.publishedAt");
  const updatedAt = message.updatedAt === undefined ? undefined : validateIsoDateTime(message.updatedAt, "message.updatedAt");
  const relations = validateRelations(message.relations);
  const reactions = message.reactions === undefined ? undefined : Object.freeze({ ...message.reactions });
  if (reactions !== undefined && Object.entries(reactions).some(([token, count]) => token.length === 0 || !Number.isFinite(count) || count < 0)) {
    invalid("Message reactions must contain finite non-negative counts");
  }
  const cloned: CommunityMessage = {
    ref: validateObjectRef(message.ref),
    context: validateObjectRef(message.context),
    authorId: boundedString(message.authorId, "message.authorId"),
    body: message.body,
    publishedAt,
    threadRoot: validateObjectRef(message.threadRoot),
    relations,
    state: boundedString(message.state, "message.state"),
    aliases: canonicalStrings(message.aliases, "message.aliases", false),
  };
  if (message.title !== undefined) Object.assign(cloned, { title: message.title });
  if (updatedAt !== undefined) Object.assign(cloned, { updatedAt });
  if (message.inReplyTo !== undefined) Object.assign(cloned, { inReplyTo: validateObjectRef(message.inReplyTo) });
  if (reactions !== undefined) Object.assign(cloned, { reactions });
  if (message.tombstone !== undefined) Object.assign(cloned, { tombstone: cloneTombstone(message.tombstone) });
  return Object.freeze(cloned);
}

function validateDomain<Value>(
  value: Value,
  ref: CommunityObjectRef,
  createdAt: string,
  updatedAt: string,
): CommunityMessageEntity["domain"] | undefined {
  if (value === undefined) return undefined;
  // SAFETY: The surrounding validation and domain contract establish the asserted type.
  if (!isNonNullObject(value) || !("kind" in value) || value.kind !== "message" || !("value" in value)) {
    invalid("Unsupported community entity domain projection");
  }
  // SAFETY: The domain discriminator and value property were checked immediately above.
  const message = cloneMessage(value.value as CommunityMessage);
  if (message.ref.objectId !== ref.objectId || message.publishedAt !== createdAt || (message.updatedAt ?? message.publishedAt) !== updatedAt) {
    invalid("Message projection does not match its canonical entity");
  }
  return Object.freeze({ kind: "message", value: message });
}

function cloneTombstone<Value>(value: Value): CommunityTombstone {
  if (!isNonNullObject(value)) invalid("Community tombstone must be an object");
  // SAFETY: The surrounding validation and domain contract establish the asserted type.
  const tombstone = value as Partial<CommunityTombstone>;
  // SAFETY: The surrounding validation and domain contract establish the asserted type.
  if (!(["deleted", "moderated", "missing", "unavailable", "unauthorized"] as const).includes(tombstone.reason as CommunityTombstone["reason"])) {
    invalid("Community tombstone reason is invalid");
  }
  const formerKind = validateObjectRef({ objectId: "former-kind", kind: tombstone.formerKind }).kind;
  // SAFETY: The surrounding validation and domain contract establish the asserted type.
  const cloned: CommunityTombstone = {
    formerKind,
    // SAFETY: The surrounding validation and domain contract establish the asserted type.
    reason: tombstone.reason as CommunityTombstone["reason"],
  };
  if (tombstone.deletedAt !== undefined) Object.assign(cloned, { deletedAt: validateIsoDateTime(tombstone.deletedAt, "tombstone.deletedAt") });
  if (tombstone.replacement !== undefined) Object.assign(cloned, { replacement: validateObjectRef(tombstone.replacement) });
  return Object.freeze(cloned);
}

function canonicalStrings<Value>(value: Value, label = "values", sort = true): readonly string[] {
  if (!Array.isArray(value) || value.length > 4096 || value.some((item) => !isString(item) || item.length > 4096)) {
    invalid(`${label} must be a bounded string array`);
  }
  // SAFETY: The surrounding validation and domain contract establish the asserted type.
  const output = [...(value as string[])];
  return Object.freeze(sort ? [...new Set(output)].sort() : output);
}

function boundedString<Value>(value: Value, label: string, limit = 512): string {
  if (!isString(value) || value.length === 0 || value.length > limit || value.includes(String.fromCharCode(0))) {
    invalid(`${label} must be a bounded string`);
  }
  return value.normalize("NFC");
}

function isScalar<Value>(value: Value): value is Value & CommunityFieldScalar {
  return value === null || typeof value === "string" || typeof value === "boolean"
    || (typeof value === "number" && Number.isFinite(value));
}

function isString<Value>(value: Value): value is Value & string {
  return typeof value === "string";
}

function isNonNullObject<Value>(value: Value): value is Value & object {
  return typeof value === "object" && value !== null;
}

function invalid(message: string): never {
  throw new CommunityError("INVALID_ENTITY", message);
}
