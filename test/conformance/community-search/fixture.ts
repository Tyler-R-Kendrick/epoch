import {
  createCommunityFieldRegistry,
  createSearchPlan,
  validateCommunityEntity,
  type CommunityEntity,
  type SearchExpression,
  type SearchPlan,
} from "@epoch/community-core";

export const FIXED_NOW = "2026-08-12T20:00:00.000Z";
export const FIXED_CURSOR_KEY = new Uint8Array(32).fill(31);
export const FIELD_REGISTRY = createCommunityFieldRegistry();

export function conformanceCorpus(includeHidden = false): readonly CommunityEntity[] {
  return Object.freeze([
    entity("issue-alpha", "Projection engine", "stable virtual filesystem projection", "needs-review", 10, "2026-08-12T19:00:00.000Z"),
    entity("issue-beta", "Search planner", "deterministic projection search", "open", 4, "2026-08-12T18:00:00.000Z"),
    entity("issue-gamma", "Mount semantics", "plan nine namespace", "open", 2, "2026-08-12T17:00:00.000Z"),
    ...(includeHidden ? [entity("issue-secret", "Projection sentinel", "DO_NOT_OBSERVE", "secret", 999, "2027-01-01T00:00:00.000Z", "private", "mallory")] : []),
  ]);
}

export function conformancePlan(expression: SearchExpression, authorizationFingerprint = "auth:maya"): SearchPlan {
  const checkpoint = { sourceId: "fixture", token: "fixture:1", observedAt: FIXED_NOW, status: "current" as const };
  return createSearchPlan({
    expression,
    order: [{ field: "updatedAt", direction: "descending", nulls: "last" }],
    sources: [{ sourceId: "fixture", fields: {}, fullText: "none", supportsRelations: false, checkpoint }],
    registry: FIELD_REGISTRY,
    authorization: { actorId: "maya" },
    authorizationFingerprint,
    snapshot: {
      snapshotId: `snapshot:${authorizationFingerprint}`,
      createdAt: FIXED_NOW,
      resolvedNow: FIXED_NOW,
      timezone: "UTC",
      locale: "en-US",
      queryHash: "query:fixture",
      planHash: "pending",
      fieldRegistryVersion: FIELD_REGISTRY.version,
      analyzerVersion: "epoch-tokenizer-v1",
      authorizationFingerprint,
      sourceCheckpoints: [checkpoint],
    },
    limit: 100,
  });
}

export const CONFORMANCE_EXPRESSIONS: readonly SearchExpression[] = Object.freeze([
  { kind: "all" },
  { kind: "text", fields: ["title", "body"], value: "projection", mode: "term" },
  { kind: "text", fields: ["body"], value: "virtual filesystem", mode: "phrase" },
  { kind: "text", fields: ["title"], value: "sea", mode: "prefix" },
  { kind: "compare", field: "state", operator: "eq", value: "open" },
  { kind: "compare", field: "score", operator: "gte", value: 4 },
  { kind: "range", field: "score", lower: 2, upper: 10, includeLower: false, includeUpper: true },
  { kind: "exists", field: "title" },
  { kind: "not", term: { kind: "compare", field: "state", operator: "eq", value: "open" } },
  { kind: "and", terms: [{ kind: "exists", field: "title" }, { kind: "compare", field: "score", operator: "gt", value: 3 }] },
  { kind: "or", terms: [{ kind: "compare", field: "state", operator: "eq", value: "needs-review" }, { kind: "compare", field: "score", operator: "lt", value: 3 }] },
]);

function entity(
  objectId: string,
  title: string,
  body: string,
  state: string,
  score: number,
  updatedAt: string,
  visibility: CommunityEntity["visibility"] = "public",
  ownerId = "maya",
): CommunityEntity {
  return validateCommunityEntity({
    ref: { objectId, kind: "issue" },
    fields: { objectId, kind: "issue", title, body, state, score, visibility, createdAt: FIXED_NOW, updatedAt, author: ownerId },
    searchableText: { title, body },
    relations: [],
    visibility,
    ownerId,
    participantIds: ownerId === "maya" ? ["maya"] : [],
    createdAt: FIXED_NOW,
    updatedAt,
    provenance: { sourceId: "fixture", nativeId: objectId, observedAt: FIXED_NOW, checkpoint: "fixture:1" },
  });
}
