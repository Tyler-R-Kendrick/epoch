import assert from "node:assert/strict";
import type { CommunityAuthorizationContext } from "../../packages/Epoch.Community.Core/src/authorization";
import type { CommunityMessage } from "../../packages/Epoch.Community.Core/src/graph";
import {
  communityEntityToMessage,
  communityMessageToEntity,
  validateCommunityEntity,
} from "../../packages/Epoch.Community.Core/src/entity";
import {
  CORE_COMMUNITY_FIELDS,
  createCommunityFieldRegistry,
} from "../../packages/Epoch.Community.Core/src/fields";
import {
  CommunityError,
  communityErrorHttpStatus,
  isCommunityError,
} from "../../packages/Epoch.Community.Core/src/errors";
import {
  authorizationFingerprint,
  createCommunityRuntimeContext,
} from "../../packages/Epoch.Community.Core/src/runtime-context";

const message: CommunityMessage = {
  ref: { objectId: "message-01", kind: "message", revision: "rev-7" },
  context: { objectId: "channel-general", kind: "channel" },
  authorId: "maya",
  title: "Projection review",
  body: "The deterministic projection is ready.",
  publishedAt: "2026-08-12T14:00:00.000Z",
  updatedAt: "2026-08-12T15:00:00.000Z",
  inReplyTo: { objectId: "message-parent", kind: "message" },
  threadRoot: { objectId: "message-root", kind: "message" },
  relations: [{
    type: "reply",
    source: { objectId: "message-01", kind: "message" },
    target: { objectId: "message-parent", kind: "message" },
  }],
  reactions: { "+1": 2, eyes: 0 },
  state: "needs-review",
  aliases: ["projection-review"],
};

export async function runCommunitySearchEntityFieldTests(): Promise<void> {
  messageEntityRoundTripIsLossless();
  registryCanonicalizesAndProtectsSensitiveFields();
  registryRejectsInvalidValuesAndDescriptors();
  validateEntityFailsClosed();
  atUriProvenanceIsPreserved();
  await fingerprintsAreStableAndOpaque();
  runtimeContextUsesOnlyInjectedServices();
  errorsHaveStableCodesAndStatuses();
}

function messageEntityRoundTripIsLossless(): void {
  const entity = communityMessageToEntity(message, {
    provenance: {
      sourceId: "community-store",
      nativeId: "message-01",
      observedAt: "2026-08-12T15:01:00.000Z",
      checkpoint: "checkpoint-9",
    },
    visibility: "shared",
    ownerId: "maya",
    participantIds: ["maya", "rene"],
  });

  assert.deepEqual(communityEntityToMessage(entity), message);
  assert.equal(entity.ref.objectId, message.ref.objectId);
  assert.equal(entity.createdAt, message.publishedAt);
  assert.equal(entity.updatedAt, message.updatedAt);
  assert.equal(entity.fields.contextId, "channel-general");
  assert.equal(entity.fields.channelId, "channel-general");
  assert.equal(entity.fields.score, 2);
  assert.deepEqual(entity.fields.has, ["subject", "title", "re", "reply", "parent", "reaction", "reactions"]);
  assert.equal(entity.searchableText.body, message.body);
}

function registryCanonicalizesAndProtectsSensitiveFields(): void {
  const registry = createCommunityFieldRegistry([{
    name: "forge.reviewers",
    aliases: ["reviewers"],
    type: "keyword",
    operators: ["eq", "in", "exists"],
    searchable: false,
    sortable: false,
    facetable: true,
    sensitive: true,
    description: "Reviewers visible only to authorized principals.",
  }]);

  assert.equal(registry.resolve("AUTHOR")?.name, "author");
  assert.equal(registry.resolve("reviewers")?.name, "forge.reviewers");
  assert.equal(registry.suggest("updatdAt")[0], "updatedAt");
  assert.equal(registry.list({}).some((field) => field.name === "forge.reviewers"), false);
  assert.equal(registry.list(sensitiveAuthorization()).some((field) => field.name === "forge.reviewers"), true);
  assert.equal(registry.suggest("reviewer").includes("forge.reviewers"), false);
  assert.equal(registry.suggest("reviewer", sensitiveAuthorization()).includes("forge.reviewers"), true);
  assert.ok(CORE_COMMUNITY_FIELDS.some((field) => field.name === "objectId"));
}

function registryRejectsInvalidValuesAndDescriptors(): void {
  const registry = createCommunityFieldRegistry();
  const score = registry.resolve("score");
  const updatedAt = registry.resolve("updatedAt");
  assert.ok(score);
  assert.ok(updatedAt);
  assert.equal(registry.validateValue(score, 12), 12);
  assert.equal(registry.validateValue(updatedAt, "2026-08-12T10:00:00-05:00"), "2026-08-12T15:00:00.000Z");
  assert.throws(() => registry.validateValue(score, Number.NaN), /finite/u);
  assert.throws(() => registry.validateValue(updatedAt, "2026-08-12"), /timezone/u);
  assert.throws(() => createCommunityFieldRegistry([{
    name: "unscoped",
    aliases: [],
    type: "text",
    operators: ["term"],
    searchable: true,
    sortable: false,
    facetable: false,
    sensitive: false,
    description: "Invalid source field.",
  }]), /namespaced/u);
  assert.throws(() => createCommunityFieldRegistry([{
    name: "forge.score",
    aliases: [],
    type: "number",
    operators: ["phrase"],
    searchable: false,
    sortable: true,
    facetable: false,
    sensitive: false,
    description: "Invalid numeric phrase field.",
  }]), /incompatible/u);
}

function validateEntityFailsClosed(): void {
  const valid = communityMessageToEntity(message, {
    provenance: { sourceId: "store", nativeId: "m1", observedAt: "2026-08-12T15:01:00Z" },
    visibility: "public",
  });
  assert.equal(validateCommunityEntity(valid).ref.objectId, "message-01");
  assert.throws(() => validateCommunityEntity({ ...valid, createdAt: "today" }), /createdAt/u);
  assert.throws(() => validateCommunityEntity({
    ...valid,
    fields: { ...valid.fields, unsafe: { nested: true } },
  }), /field value/u);
}

function atUriProvenanceIsPreserved(): void {
  const valid = communityMessageToEntity(message, {
    provenance: {
      sourceId: "atproto",
      nativeId: "at://did:plc:alice/app.epoch.issue/issue-1",
      uri: "at://did:plc:alice/app.epoch.issue/issue-1",
      observedAt: "2026-08-12T15:01:00Z",
    },
    visibility: "public",
  });
  assert.equal(validateCommunityEntity(valid).provenance.uri, valid.provenance.uri);
  assert.throws(() => validateCommunityEntity({
    ...valid,
    provenance: { ...valid.provenance, uri: "javascript:alert(1)" },
  }), /URI/u);
}

async function fingerprintsAreStableAndOpaque(): Promise<void> {
  const first = await authorizationFingerprint({
    actorId: "maya-secret-actor",
    permissions: ["object:state:write"],
    readableDmIds: ["dm-b", "dm-a"],
  });
  const reordered = await authorizationFingerprint({
    actorId: "maya-secret-actor",
    permissions: ["object:state:write"],
    readableDmIds: ["dm-a", "dm-b"],
  });
  assert.equal(first, reordered);
  assert.match(first, /^sha256:[a-f0-9]{64}$/u);
  assert.doesNotMatch(first, /maya|dm-a/u);
  assert.notEqual(first, await authorizationFingerprint({ actorId: "someone-else" }));
}

function runtimeContextUsesOnlyInjectedServices(): void {
  let sequence = 0;
  const context = createCommunityRuntimeContext({
    clock: { now: () => new Date("2026-08-12T16:00:00.000Z") },
    idGenerator: { generate: (namespace) => `${namespace}-${sequence += 1}` },
    timezone: "America/Chicago",
    locale: "en-US",
  });
  assert.equal(context.now(), "2026-08-12T16:00:00.000Z");
  assert.equal(context.nextId("query"), "query-1");
  assert.equal(context.nextId("query"), "query-2");
}

function errorsHaveStableCodesAndStatuses(): void {
  const syntax = new CommunityError("QUERY_SYNTAX", "Unexpected token", { span: { start: 2, end: 3 } });
  assert.equal(syntax.httpStatus, 400);
  assert.equal(syntax.code, "QUERY_SYNTAX");
  assert.deepEqual(syntax.toJSON(), {
    code: "QUERY_SYNTAX",
    message: "Unexpected token",
    details: { span: { start: 2, end: 3 } },
  });
  assert.equal(communityErrorHttpStatus("SOURCE_UNAVAILABLE"), 503);
  assert.equal(communityErrorHttpStatus("NAMESPACE_MOUNT_CONFLICT"), 409);
  assert.equal(isCommunityError({ name: "CommunityError", message: "Unavailable source",
    code: "QUERY_UNSUPPORTED_SOURCE", httpStatus: 422 }), true,
  "a validated Community error survives a browser bundle boundary");
  assert.equal(isCommunityError({ name: "CommunityError", message: "spoof", code: "UNKNOWN", httpStatus: 500 }), false);
  assert.equal(isCommunityError({ name: "CommunityError", message: "spoof", code: "QUERY_SYNTAX", httpStatus: 500 }), false);
}

function sensitiveAuthorization(): CommunityAuthorizationContext {
  return { actorId: "maya", permissions: ["field:sensitive:read" as "object:state:write"] };
}

if (require.main === module) {
  runCommunitySearchEntityFieldTests().then(
    () => console.log("community search entity and field tests passed"),
    (error: unknown) => {
      console.error(error);
      process.exitCode = 1;
    },
  );
}
