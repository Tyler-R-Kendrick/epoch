// SAFETY: The module validates or constructs this value before applying the asserted contract.
// SAFETY: The module validates or constructs this value before applying the asserted contract.
import {
  CommunityError,
  communityMessageToEntity,
  createCommunityRuntimeContext,
  migrateNormalizedQuery,
  validateCommunityEntity,
  validateIsoDateTime,
  validateObjectRef,
  validateProjectionId,
  type Clock,
  type CommunityEntity,
  type CommunityMessage,
  type CommunityObjectKind,
  type CommunityObjectRef,
  type IdGenerator,
  type ProjectionDefinition,
  type SearchOrder,
} from "@epoch/community-core";
import {
  validateCommunityStateV3,
  type CommunityStateV3,
  type PersistedProjectionDefinition,
  type QuarantinedProjectionDefinition,
} from "./state-schema";
type BoundaryValue = null | undefined | boolean | number | string | bigint | symbol | Readonly<object>;
type DictionaryValue = null | undefined | boolean | number | string | bigint | readonly DictionaryValue[] | { readonly [key: string]: DictionaryValue };
function __epochIsString<T>(value: T): value is T & string { return typeof value === "string"; }
function __epochIsNumber<T>(value: T): value is T & number { return typeof value === "number"; }


export interface CommunityMigrationContext {
  readonly clock: Clock;
  readonly idGenerator: IdGenerator;
  readonly timezone: string;
  readonly locale: string;
}

export interface LocalSavedViewMigrationResult {
  readonly projectionDefinitions: readonly PersistedProjectionDefinition[];
  readonly quarantinedDefinitions: readonly QuarantinedProjectionDefinition[];
}

interface LegacyStateV1 { readonly schemaVersion: 1; readonly repositories: readonly unknown[] }
interface LegacyStateV2 {
  readonly schemaVersion: 2;
  readonly repositories: readonly unknown[];
  readonly objects: readonly unknown[];
  readonly projections: readonly unknown[];
}

const ALL_OBJECT_KINDS = [
  "message", "thread", "channel", "dm", "notification", "projection", "project", "issue", "change",
  "member", "agent", "artifact", "tombstone",
] as const satisfies readonly CommunityObjectKind[];

export function migrateCommunityState(input: BoundaryValue, context: CommunityMigrationContext): CommunityStateV3 {
  if (record(input) && input.schemaVersion === 3) return validateCommunityStateV3(input);
  if (!record(input) || (input.schemaVersion !== 1 && input.schemaVersion !== 2) || !Array.isArray(input.repositories)) {
    fail("Unsupported Community state schema", { schemaVersion: record(input) ? input.schemaVersion : undefined });
  }
  // SAFETY: The module validates or constructs this value before applying the asserted contract.
  const sourceVersion = input.schemaVersion as 1 | 2;
  const runtime = createCommunityRuntimeContext(context);
  const migratedAt = runtime.now();
  const metadata = {
    createdAt: migratedAt,
    updatedAt: migratedAt,
    migratedAt,
    migrationTimestamp: migratedAt,
    sourceSchemaVersion: sourceVersion,
    migrationId: runtime.nextId("migration"),
  } as const;
  const entities = new Map<string, CommunityEntity>();
  const conflicts: { readonly objectId: string; readonly firstSource: string; readonly secondSource: string }[] = [];
  const add = (entity: CommunityEntity, source: string, preferExisting = false): void => {
    const valid = validateCommunityEntity(entity);
    const previous = entities.get(valid.ref.objectId);
    if (previous === undefined) { entities.set(valid.ref.objectId, valid); return; }
    if (canonical(previous) === canonical(valid)) return;
    if (preferExisting) {
      entities.set(valid.ref.objectId, validateCommunityEntity({
        ...previous,
        fields: { ...valid.fields, ...previous.fields },
        relations: deriveRelations([valid, previous]),
      }));
      return;
    }
    conflicts.push({ objectId: valid.ref.objectId, firstSource: previous.provenance.sourceId, secondSource: source });
  };

  if (sourceVersion === 2) {
    // SAFETY: The module validates or constructs this value before applying the asserted contract.
    const state = input as LegacyStateV2;
    if (!Array.isArray(state.objects) || !Array.isArray(state.projections)) fail("Schema 2 state collections are invalid");
    for (const value of state.objects) {
      const message = validateLegacyMessage(value);
      // SAFETY: The module validates or constructs this value before applying the asserted contract.
      add(communityMessageToEntity(message, {
        provenance: { sourceId: "community-api-v2", nativeId: message.ref.objectId, observedAt: message.updatedAt ?? message.publishedAt },
        visibility: message.context.kind === "dm" ? "private" : "public",
        participantIds: message.context.kind === "dm" ? [message.authorId] : [],
      }), "objects");
    }
  }

  // SAFETY: Runtime checks or construction above establish LegacyStateV1).repositories) {.
  for (const value of (input as LegacyStateV1).repositories) {
    for (const entity of migrateRepository(value, runtime, migratedAt)) add(entity, "repositories", sourceVersion === 2);
  }
  if (conflicts.length > 0) fail("Conflicting duplicate canonical objects require recovery", {
    recovery: { code: "DUPLICATE_CANONICAL_OBJECT", conflicts },
  });

  const projectionDefinitions: PersistedProjectionDefinition[] = [];
  // SAFETY: The module validates or constructs this value before applying the asserted contract.
  const quarantinedDefinitions: QuarantinedProjectionDefinition[] = [];
  if (sourceVersion === 2) {
    // SAFETY: Runtime checks or construction above establish LegacyStateV2).projections) {.
    for (const value of (input as LegacyStateV2).projections) {
      try {
        projectionDefinitions.push(migrateProjection(value, migratedAt));
      } catch (error) {
        const projectionId = record(value) && __epochIsString(value.projectionId) ? value.projectionId : undefined;
        quarantinedDefinitions.push({
          ...(!(projectionId === undefined) && { projectionId }),
          reason: error instanceof Error ? error.message : String(error),
          quarantinedAt: migratedAt,
          input: structuredClone(value),
        });
      }
    }
  }

  const orderedEntities = [...entities.values()].sort((left, right) => left.ref.objectId.localeCompare(right.ref.objectId));
  return validateCommunityStateV3({
    schemaVersion: 3,
    metadata,
    entities: orderedEntities,
    relations: deriveRelations(orderedEntities),
    projectionDefinitions: projectionDefinitions.sort((left, right) => left.definition.projectionId.localeCompare(right.definition.projectionId)),
    namespaceMounts: [],
    sourceCheckpoints: [],
    quarantinedDefinitions,
  });
}

export function migrateLocalSavedViews(input: BoundaryValue, context: CommunityMigrationContext): LocalSavedViewMigrationResult {
  const runtime = createCommunityRuntimeContext(context);
  const migratedAt = runtime.now();
  const source = Array.isArray(input) ? input : record(input) && Array.isArray(input.views) ? input.views : undefined;
  if (source === undefined) {
    return {
      projectionDefinitions: [],
      quarantinedDefinitions: [{ reason: "Schema-1 saved-view state is malformed", quarantinedAt: migratedAt, input: structuredClone(input) }],
    };
  }
  const projectionDefinitions: PersistedProjectionDefinition[] = [];
  const quarantinedDefinitions: QuarantinedProjectionDefinition[] = [];
  for (const value of source) {
    try {
      if (!record(value)) fail("Saved view must be an object");
      projectionDefinitions.push(migrateProjection({
        ...value,
        projectionId: value.projectionId ?? value.id,
        label: value.label ?? value.name ?? "Saved view",
        visibility: value.visibility ?? "private",
        version: value.version ?? 1,
      }, migratedAt));
    } catch (error) {
      const projectionId = record(value)
        ? __epochIsString(value.projectionId) ? value.projectionId : __epochIsString(value.id) ? value.id : undefined
        : undefined;
      quarantinedDefinitions.push({
        ...(!(projectionId === undefined) && { projectionId }),
        reason: error instanceof Error ? error.message : String(error),
        quarantinedAt: migratedAt,
        input: structuredClone(value),
      });
    }
  }
  return { projectionDefinitions, quarantinedDefinitions };
}

function migrateRepository(value: BoundaryValue, runtime: ReturnType<typeof createCommunityRuntimeContext>, migratedAt: string): readonly CommunityEntity[] {
  if (!record(value)) fail("Invalid persisted Community repository");
  const slug = text(value.slug, "repository.slug");
  const repositoryRef = optionalRef(value.ref) ?? nextRef(runtime, "project");
  const visibility = repositoryVisibility(value.visibility);
  const maintainers = strings(value.maintainers, "repository.maintainers");
  const repository = genericEntity(repositoryRef, {
    objectId: repositoryRef.objectId,
    kind: "project",
    slug,
    title: text(value.displayName, "repository.displayName"),
    description: text(value.description, "repository.description", true),
    visibility,
    defaultView: text(value.defaultView ?? "main", "repository.defaultView"),
    maintainers,
    topics: strings(value.topics ?? [], "repository.topics"),
  }, { title: text(value.displayName, "repository.displayName"), description: text(value.description, "repository.description", true) },
  visibility, maintainers, migratedAt, "repository", slug);
  const output: CommunityEntity[] = [repository];

  for (const issueValue of array(value.issues ?? [], "repository.issues")) {
    if (!record(issueValue)) fail("Invalid persisted Community issue");
    const issueId = text(issueValue.id, "issue.id");
    const issueRef = optionalRef(issueValue.ref) ?? nextRef(runtime, "issue");
    const author = text(issueValue.author, "issue.author");
    const issueMessage: CommunityMessage = {
      ref: issueRef,
      context: repositoryRef,
      authorId: author,
      title: text(issueValue.title, "issue.title"),
      body: text(issueValue.body, "issue.body", true),
      publishedAt: timestamp(issueValue, migratedAt),
      threadRoot: issueRef,
      relations: [],
      state: text(issueValue.status, "issue.status"),
      aliases: [issueId],
    };
    output.push(enrichEntity(messageEntity(issueMessage, visibility, maintainers, "repository-issue", `${slug}:${issueId}`), {
      repositorySlug: slug,
      issueId,
      labels: strings(issueValue.labels, "issue.labels"),
    }));
    for (const commentValue of array(issueValue.comments, "issue.comments")) {
      if (!record(commentValue)) fail("Invalid persisted Community comment");
      const ref = optionalRef(commentValue.ref) ?? nextRef(runtime, "message");
      const commentId = __epochIsString(commentValue.id) ? commentValue.id : runtime.nextId("comment");
      const publishedAt = timestamp(commentValue, migratedAt);
      output.push(messageEntity({
        ref,
        context: repositoryRef,
        authorId: text(commentValue.author, "comment.author"),
        body: text(commentValue.body, "comment.body", true),
        publishedAt,
        inReplyTo: issueRef,
        threadRoot: issueRef,
        relations: [{ type: "reply", source: ref, target: issueRef }],
        state: "read",
        aliases: [commentId],
      }, visibility, maintainers, "repository-comment", `${slug}:${issueId}:${commentId}`));
    }
  }

  for (const changeValue of array(value.changeProposals ?? [], "repository.changeProposals")) {
    if (!record(changeValue)) fail("Invalid persisted Community change");
    const id = text(changeValue.id, "change.id");
    const ref = optionalRef(changeValue.ref) ?? nextRef(runtime, "change");
    output.push(enrichEntity(messageEntity({
      ref,
      context: repositoryRef,
      authorId: text(changeValue.author, "change.author"),
      title: text(changeValue.title, "change.title"),
      body: text(changeValue.body, "change.body", true),
      publishedAt: timestamp(changeValue, migratedAt),
      threadRoot: ref,
      relations: [],
      state: text(changeValue.status, "change.status"),
      aliases: [id],
    }, visibility, maintainers, "repository-change", `${slug}:${id}`), {
      repositorySlug: slug,
      changeId: id,
      sourceView: text(changeValue.sourceView, "change.sourceView"),
      targetView: text(changeValue.targetView, "change.targetView"),
      reviewers: array(changeValue.reviews, "change.reviews").flatMap((review) => record(review) && __epochIsString(review.reviewer) ? [review.reviewer] : []),
      reviewDecisions: array(changeValue.reviews, "change.reviews").flatMap((review) => record(review) && __epochIsString(review.decision) ? [review.decision] : []),
      reviewBodies: array(changeValue.reviews, "change.reviews").flatMap((review) => record(review) && __epochIsString(review.body) ? [review.body] : []),
    }));
  }

  for (const discussionValue of array(value.discussions ?? [], "repository.discussions")) {
    if (!record(discussionValue)) fail("Invalid persisted Community discussion");
    const id = text(discussionValue.id, "discussion.id");
    const ref = optionalRef(discussionValue.ref) ?? nextRef(runtime, "thread");
    output.push(enrichEntity(messageEntity({
      ref,
      context: repositoryRef,
      authorId: text(discussionValue.author, "discussion.author"),
      title: text(discussionValue.title, "discussion.title"),
      body: "",
      publishedAt: timestamp(discussionValue, migratedAt),
      threadRoot: ref,
      relations: [],
      state: "open",
      aliases: [id],
    }, visibility, maintainers, "repository-discussion", `${slug}:${id}`), { repositorySlug: slug, discussionId: id }));
    for (const commentValue of array(discussionValue.comments, "discussion.comments")) {
      if (!record(commentValue)) fail("Invalid persisted Community discussion comment");
      const commentRef = optionalRef(commentValue.ref) ?? nextRef(runtime, "message");
      const commentId = __epochIsString(commentValue.id) ? commentValue.id : runtime.nextId("comment");
      output.push(enrichEntity(messageEntity({
        ref: commentRef,
        context: repositoryRef,
        authorId: text(commentValue.author, "comment.author"),
        body: text(commentValue.body, "comment.body", true),
        publishedAt: timestamp(commentValue, migratedAt),
        inReplyTo: ref,
        threadRoot: ref,
        relations: [{ type: "reply", source: commentRef, target: ref }],
        state: "read",
        aliases: [commentId],
      }, visibility, maintainers, "repository-discussion-comment", `${slug}:${id}:${commentId}`), {
        repositorySlug: slug,
        discussionId: id,
        commentId,
      }));
    }
  }
  return output;
}

function migrateProjection(value: BoundaryValue, migratedAt: string): PersistedProjectionDefinition {
  if (!record(value)) fail("Saved projection must be an object");
  const projectionId = validateProjectionId(text(value.projectionId, "projection.projectionId"));
  const ownerId = text(value.ownerId, "projection.ownerId");
  // SAFETY: The module validates or constructs this value before applying the asserted contract.
  const query = value.query === undefined ? undefined : migrateNormalizedQuery(
    __epochIsString(value.query)
      ? { query: value.query, queryLanguageVersion: __epochIsNumber(value.queryLanguageVersion) ? value.queryLanguageVersion : 0 }
      : value.query as never,
  );
  if (query?.error !== undefined) fail(`Invalid saved projection query: ${query.error}`);
  const createdAt = dateOr(value.createdAt, migratedAt);
  const updatedAt = dateOr(value.updatedAt, createdAt);
  const definition: ProjectionDefinition = {
    apiVersion: "epoch.dev/v1alpha1",
    projectionId,
    version: integer(value.version, "projection.version"),
    label: text(value.label, "projection.label"),
    ownerId,
    visibility: visibility(value.visibility),
    root: {
      nodeId: `${projectionId}.root`,
      kind: "literal",
      segment: projectionId,
      children: [{
        nodeId: `${projectionId}.select`,
        kind: "select",
        objectKinds: ALL_OBJECT_KINDS,
        ...(!(query?.ast === undefined || query.ast === null) && { where: query.ast }),
        children: [{
          nodeId: `${projectionId}.leaf`,
          kind: "leaf",
          segment: { template: "{shortId(objectId)}" },
          representation: "default",
        }],
      }],
    },
    order: migrateOrder(value.order),
    updateMode: "live",
    consistency: "current",
  };
  return { definition, revision: 1, createdAt, updatedAt };
}

function migrateOrder(input: BoundaryValue): readonly SearchOrder[] {
  if (!record(input)) return [{ field: "updatedAt", direction: "descending", nulls: "last" }];
  const field = input.by === "publishedAt" ? "createdAt" : __epochIsString(input.by) ? input.by : "updatedAt";
  return [{ field, direction: input.direction === "ascending" ? "ascending" : "descending", nulls: "last" }];
}

function messageEntity(
  message: CommunityMessage,
  visibility: "private" | "public",
  participants: readonly string[],
  sourceId: string,
  nativeId: string,
): CommunityEntity {
  return communityMessageToEntity(message, {
    provenance: { sourceId, nativeId, observedAt: message.updatedAt ?? message.publishedAt },
    visibility,
    participantIds: visibility === "private" ? participants : [],
  });
}

function genericEntity(
  ref: CommunityObjectRef,
  fields: CommunityEntity["fields"],
  searchableText: CommunityEntity["searchableText"],
  visibility: "private" | "public",
  participants: readonly string[],
  timestampValue: string,
  sourceId: string,
  nativeId: string,
): CommunityEntity {
  return validateCommunityEntity({
    ref, fields, searchableText, relations: [], visibility,
    participantIds: visibility === "private" ? participants : [],
    createdAt: timestampValue, updatedAt: timestampValue,
    provenance: { sourceId, nativeId, observedAt: timestampValue },
  });
}

function enrichEntity(entity: CommunityEntity, fields: CommunityEntity["fields"]): CommunityEntity {
  return validateCommunityEntity({ ...entity, fields: { ...entity.fields, ...fields } });
}

function validateLegacyMessage(value: BoundaryValue): CommunityMessage {
  if (!record(value)) fail("Invalid persisted Community object");
  // SAFETY: The module validates or constructs this value before applying the asserted contract.
  const message = structuredClone(value) as CommunityMessage;
  const ref = migrateSchema2Ref(message.ref);
  const context = migrateSchema2Ref(message.context);
  const threadRoot = migrateSchema2Ref(message.threadRoot);
  const inReplyTo = message.inReplyTo === undefined ? undefined : migrateSchema2Ref(message.inReplyTo);
  validateIsoDateTime(message.publishedAt, "message.publishedAt");
  if (message.updatedAt !== undefined) validateIsoDateTime(message.updatedAt, "message.updatedAt");
  if (!Array.isArray(message.relations) || !Array.isArray(message.aliases)) fail("Invalid persisted Community object collections");
  const relations = message.relations.map((relation) => ({ ...relation, source: migrateSchema2Ref(relation.source), target: migrateSchema2Ref(relation.target) }));
  return { ...message, ref, context, threadRoot, relations, ...(!(inReplyTo === undefined) && { inReplyTo }) };
}

function migrateSchema2Ref(value: BoundaryValue): CommunityObjectRef {
  if (record(value) && value.kind === "saved-view") return validateObjectRef({ ...value, kind: "projection" });
  return validateObjectRef(value);
}

function deriveRelations(entities: readonly CommunityEntity[]) {
  const values = entities.flatMap((entity) => entity.relations);
  const seen = new Set<string>();
  return values.filter((relation) => {
    const key = `${relation.type}\0${relation.source.objectId}\0${relation.target.objectId}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

function nextRef(runtime: ReturnType<typeof createCommunityRuntimeContext>, kind: CommunityObjectKind): CommunityObjectRef {
  return validateObjectRef({ objectId: runtime.nextId(kind), kind });
}

function optionalRef(value: BoundaryValue): CommunityObjectRef | undefined { return value === undefined ? undefined : validateObjectRef(value); }
function timestamp(input: Record<string, DictionaryValue>, fallback: string): string { return dateOr(input.publishedAt ?? input.createdAt, fallback); }
function dateOr(value: BoundaryValue, fallback: string): string { return value === undefined ? fallback : validateIsoDateTime(value); }

function visibility(value: BoundaryValue): ProjectionDefinition["visibility"] {
  if (value === "private" || value === "shared" || value === "public") return value;
  fail("Saved projection visibility is invalid");
}

function repositoryVisibility(value: BoundaryValue): "private" | "public" {
  if (value === undefined) return "public";
  if (value === "private" || value === "public") return value;
  fail("Repository visibility is invalid");
}

function integer(value: BoundaryValue, label: string): number {
  // SAFETY: Runtime checks or construction above establish number) < 1) fail(`${label} is invalid`).
  if (!Number.isInteger(value) || (value as number) < 1) fail(`${label} is invalid`);
  // SAFETY: The module validates or constructs this value before applying the asserted contract.
  return value as number;
}

function text(value: BoundaryValue, label: string, empty = false): string {
  if (!__epochIsString(value) || (!empty && value.length === 0) || value.length > 10_000_000) fail(`${label} is invalid`);
  return value.normalize("NFC");
}

function strings(value: BoundaryValue, label: string): readonly string[] {
  const values = array(value, label);
  if (!values.every((item) => __epochIsString(item))) fail(`${label} is invalid`);
  // SAFETY: The module validates or constructs this value before applying the asserted contract.
  return (values as string[]).map((item) => item.normalize("NFC"));
}

function array(value: BoundaryValue, label: string): readonly unknown[] {
  if (!Array.isArray(value)) fail(`${label} must be an array`);
  return value;
}

function record(value: BoundaryValue): value is Record<string, DictionaryValue> { return typeof value === "object" && value !== null && !Array.isArray(value); }
function canonical(value: BoundaryValue): string { return JSON.stringify(value); }

function fail(message: string, details?: Readonly<Record<string, DictionaryValue>>): never {
  throw new CommunityError("PERSISTENCE_MIGRATION", message, details);
}
