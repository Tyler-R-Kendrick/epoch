import { PROTOCOL_EVENT_SCHEMAS, type ProtocolEventType } from "./events";
import { CANONICAL_ID_KINDS, type CanonicalIdKind } from "./ids";

type JsonSchema = Readonly<Record<string, unknown>>;

const revisionId: JsonSchema = { type: "string", pattern: "^[A-Za-z0-9][A-Za-z0-9._~-]{0,127}$" };
const digest: JsonSchema = { type: "string", pattern: "^[a-f0-9]{64}$" };
const repositoryPath: JsonSchema = { type: "string", minLength: 1, maxLength: 4096, pattern: "^(?!/)(?!.*(?:^|/)\\.\\.?(?:/|$))[^\\\\\\u0000]+$" };
const nonemptyString: JsonSchema = { type: "string", minLength: 1 };
const nonnegativeInteger: JsonSchema = { type: "integer", minimum: 0 };
const ref = (name: string): JsonSchema => ({ $ref: `#/$defs/${name}` });
const arrayOf = (items: JsonSchema, minItems = 0): JsonSchema => ({ type: "array", items, minItems, uniqueItems: true });
const id = (kind: CanonicalIdKind): JsonSchema => ({ type: "string", pattern: `^epoch:${kind}:[a-z2-7]{52}$` });
const object = (required: readonly string[], properties: Readonly<Record<string, JsonSchema>>): JsonSchema => ({
  type: "object", additionalProperties: false, required: [...required], properties,
});

const simpleBodies: Readonly<Record<string, JsonSchema>> = {
  repositoryIdentityBody: object(["repositoryId", "principalId"], { repositoryId: id("repo"), principalId: id("principal"), keyId: id("key") }),
  changeSupersededBody: object(["changeId", "supersededRevisionId", "byRevisionId"], { changeId: id("change"), supersededRevisionId: revisionId, byRevisionId: revisionId }),
  changeDependencyBody: object(["changeRevisionId", "dependencyRevisionId"], { changeRevisionId: revisionId, dependencyRevisionId: revisionId }),
  reviewRecordedBody: object(["reviewBundleId", "bundleRevisionId", "reviewerPrincipalId", "verdict"], {
    reviewBundleId: id("review-bundle"), bundleRevisionId: revisionId, reviewerPrincipalId: id("principal"), verdict: { enum: ["approved", "changes-requested", "commented"] },
  }),
  mergeGateBody: object(["mergePlanId", "gateDefinitionDigest", "status", "evidenceRevisionIds"], {
    mergePlanId: id("merge-plan"), gateDefinitionDigest: digest, status: { enum: ["passed", "failed"] }, evidenceRevisionIds: arrayOf(revisionId),
  }),
  mergeAppliedBody: object(["mergePlanId", "targetRevisionId", "resultRevisionId", "resultTreeDigest", "mergeMode", "sourceRevisionIds"], {
    mergePlanId: id("merge-plan"), targetRevisionId: revisionId, resultRevisionId: revisionId, resultTreeDigest: digest,
    mergeMode: { enum: ["per-change-squash", "change-graph-squash"] }, sourceRevisionIds: arrayOf(revisionId),
  }),
  conflictResolutionBody: object(["conflictId", "resolutionRevisionId", "principalId"], {
    conflictId: id("conflict"), resolutionRevisionId: revisionId, principalId: id("principal"),
  }),
  agentMembershipBody: object(["workspaceId", "principalId", "grantId"], {
    workspaceId: id("workspace"), principalId: id("principal"), grantId: id("grant"),
  }),
  agentCapabilityBody: object(["grantId", "principalId", "capability"], {
    grantId: id("grant"), principalId: id("principal"), capability: nonemptyString,
  }),
  agentBudgetBody: object(["budgetId", "principalId", "units"], {
    budgetId: id("budget"), principalId: id("principal"), units: nonnegativeInteger,
  }),
  projectionBody: object(["projectionId", "repositoryId", "definitionDigest"], {
    projectionId: id("projection"), repositoryId: id("repo"), definitionDigest: digest,
  }),
  mirrorBody: object(["mirrorId", "repositoryId", "remoteRef", "frontier"], {
    mirrorId: id("mirror"), repositoryId: id("repo"), remoteRef: nonemptyString, frontier: arrayOf(revisionId),
  }),
  objectPromiseBody: object(["promiseId", "contentDigest", "status"], {
    promiseId: id("promise"), contentDigest: digest, status: { enum: ["pending", "fulfilled", "rejected"] },
  }),
  softwareHeritageMappingBody: object(["repositoryId", "swhId", "frontier"], {
    repositoryId: id("repo"), swhId: nonemptyString, frontier: arrayOf(revisionId),
  }),
  softwareHeritageArchiveBody: object(["repositoryId", "versionId", "requestId", "status"], {
    repositoryId: id("repo"), versionId: id("version"), requestId: nonemptyString,
    status: { enum: ["requested", "pending", "succeeded", "failed", "cancelled"] },
  }),
  spaceCreatedBody: object(["spaceId", "repositoryId", "ownerPrincipalId", "viewName", "title"], {
    spaceId: id("space"), repositoryId: id("repo"), ownerPrincipalId: id("principal"),
    viewName: nonemptyString, title: nonemptyString,
  }),
  spaceParticipantJoinedBody: object(["spaceId", "principalId", "grantId", "role"], {
    spaceId: id("space"), principalId: id("principal"), grantId: id("grant"),
    role: { enum: ["owner", "collaborator", "agent", "observer"] },
  }),
  spaceParticipantLeftBody: object(["spaceId", "principalId", "grantId"], {
    spaceId: id("space"), principalId: id("principal"), grantId: id("grant"),
  }),
  spaceWorkspaceBoundBody: object(
    ["spaceId", "principalId", "workspaceId", "providerId", "storageMode", "residency", "materialization", "execution"],
    {
      spaceId: id("space"), principalId: id("principal"), workspaceId: id("workspace"),
      providerId: nonemptyString, storageMode: nonemptyString,
      residency: { enum: ["resident", "partial", "virtual"] },
      materialization: { enum: ["materialized", "virtual"] },
      execution: { enum: ["disabled", "in-process", "isolated"] },
    },
  ),
  spaceTurnRecordedBody: object(["spaceId", "principalId", "grantId", "execution", "requestDigest"], {
    spaceId: id("space"), principalId: id("principal"), grantId: id("grant"),
    execution: { enum: ["disabled", "in-process", "isolated"] }, requestDigest: digest,
    sandboxId: id("sandbox"), budgetId: id("budget"), units: nonnegativeInteger,
  }),
  spaceBudgetAllocatedBody: object(["spaceId", "budgetId", "principalId", "units"], {
    spaceId: id("space"), budgetId: id("budget"), principalId: id("principal"), units: nonnegativeInteger,
  }),
  spaceCaptureOpenedBody: object(["spaceId", "sessionId", "principalId", "scope", "retention", "redaction"], {
    spaceId: id("space"), sessionId: id("session"), principalId: id("principal"),
    scope: nonemptyString, retention: nonemptyString,
    redaction: { enum: ["none", "declared-secrets", "full"] },
  }),
  spaceCaptureClosedBody: object(["spaceId", "sessionId", "principalId", "operationCount"], {
    spaceId: id("space"), sessionId: id("session"), principalId: id("principal"), operationCount: nonnegativeInteger,
  }),
  spaceCaptureOperationBody: object(["spaceId", "sessionId", "principalId", "path", "contentDigest"], {
    spaceId: id("space"), sessionId: id("session"), principalId: id("principal"),
    path: repositoryPath, contentDigest: digest,
  }),
  spaceAnchorRecordedBody: object(["spaceId", "anchorId", "principalId", "revisionId", "path", "structuralPath", "contentDigest"], {
    spaceId: id("space"), anchorId: id("anchor"), principalId: id("principal"), revisionId,
    path: repositoryPath, structuralPath: nonemptyString, contentDigest: digest,
  }),
};

const complexBodies: Readonly<Record<string, JsonSchema>> = {
  fragmentSource: object(["path"], { path: repositoryPath, digest }),
  fragmentPrecondition: {
    oneOf: [
      object(["kind"], { kind: { const: "absent" } }),
      object(["kind", "digest"], { kind: { const: "digest" }, digest }),
    ],
  },
  fragmentProvenance: object(["principalId"], { principalId: id("principal"), sourceRevisionId: revisionId }),
  fragment: object(["fragmentId", "kind", "path", "precondition", "resultDigest", "order", "dependencies", "provenance", "mergeStrategy"], {
    fragmentId: id("fragment"), kind: { enum: ["add", "delete", "move", "copy", "text", "structured", "binary"] },
    path: repositoryPath, from: ref("fragmentSource"), precondition: ref("fragmentPrecondition"), resultDigest: digest,
    contentRef: { type: "string", pattern: "^(sha256:[a-f0-9]{64}|swh:[A-Za-z0-9:._~-]+|promise:epoch:promise:[a-z2-7]{52})$" },
    order: nonnegativeInteger, dependencies: arrayOf(id("fragment")), provenance: ref("fragmentProvenance"),
    mergeStrategy: { enum: ["exact", "text", "structured", "binary-replace"] },
  }),
  changeRevisionBody: object(["changeId", "baseFrontier", "baseTreeDigest", "parentRevisionIds", "fragments", "resultingTreeDigest", "authorPrincipalId"], {
    changeId: id("change"), baseFrontier: arrayOf(revisionId), baseTreeDigest: digest, parentRevisionIds: arrayOf(revisionId),
    fragments: arrayOf(ref("fragment"), 1), resultingTreeDigest: digest, authorPrincipalId: id("principal"),
  }),
  changeGraphEdge: object(["from", "to", "kind"], { from: revisionId, to: revisionId, kind: { enum: ["requires", "orders-after", "conflicts-with", "derived-from"] } }),
  changeGraphBody: object(["changeGraphId", "memberRevisionIds", "edges"], { changeGraphId: id("change-graph"), memberRevisionIds: arrayOf(revisionId), edges: { type: "array", items: ref("changeGraphEdge") } }),
  splitGroup: object(["fragmentIds", "risk", "reason"], { fragmentIds: arrayOf(id("fragment")), risk: { enum: ["low", "medium", "high", "ambiguous"] }, reason: { type: "string" } }),
  splitBody: object(["sourceRevisionId", "groups", "resultingRevisionIds", "reconstructionDigest"], {
    sourceRevisionId: revisionId, groups: { type: "array", items: ref("splitGroup"), minItems: 1 },
    resultingRevisionIds: arrayOf(revisionId), reconstructionDigest: digest,
  }),
  reviewOverlap: object(["left", "right"], { left: id("fragment"), right: id("fragment") }),
  reviewBundleBody: object(["reviewBundleId", "selectedRevisionIds", "baseFrontier", "baseTreeDigest", "combinedTreeDigest", "overlaps", "conflictIds", "gateDefinitionDigest"], {
    reviewBundleId: id("review-bundle"), selectedRevisionIds: arrayOf(revisionId), baseFrontier: arrayOf(revisionId), baseTreeDigest: digest,
    combinedTreeDigest: digest, overlaps: { type: "array", items: ref("reviewOverlap") }, conflictIds: arrayOf(id("conflict")), gateDefinitionDigest: digest,
  }),
  mergePlanBody: object(["mergePlanId", "targetRevisionId", "selectedRevisionIds", "hardDependencyClosure", "reviewBundleRevisionId", "conflictResolutionRevisionIds", "gateDefinitionDigest", "mergeMode", "resultingTreeDigest"], {
    mergePlanId: id("merge-plan"), targetRevisionId: revisionId, selectedRevisionIds: arrayOf(revisionId), hardDependencyClosure: arrayOf(revisionId),
    reviewBundleRevisionId: revisionId, conflictResolutionRevisionIds: arrayOf(revisionId), gateDefinitionDigest: digest,
    mergeMode: { enum: ["per-change-squash", "change-graph-squash"] }, resultingTreeDigest: digest,
  }),
  conflictBody: object(["conflictId", "sideRevisionIds", "status", "resolutionRevisionIds"], {
    conflictId: id("conflict"), sideRevisionIds: arrayOf(revisionId, 2), status: { enum: ["unresolved", "proposed", "accepted", "rejected"] },
    resolutionRevisionIds: arrayOf(revisionId),
  }),
};

const bodyDefinitionByType: Readonly<Record<ProtocolEventType, string>> = {
  "repository.identity": "repositoryIdentityBody",
  "change.created": "changeRevisionBody", "change.revised": "changeRevisionBody", "change.superseded": "changeSupersededBody",
  "change.dependency.added": "changeDependencyBody", "change.dependency.removed": "changeDependencyBody",
  "change-graph.defined": "changeGraphBody", "change-graph.revised": "changeGraphBody", "split.accepted": "splitBody",
  "review.bundle.created": "reviewBundleBody", "review.bundle.revised": "reviewBundleBody", "review.recorded": "reviewRecordedBody",
  "merge.plan.created": "mergePlanBody", "merge.plan.gate-recorded": "mergeGateBody", "merge.plan.applied": "mergeAppliedBody",
  "conflict.recorded": "conflictBody", "conflict.resolution.proposed": "conflictResolutionBody",
  "conflict.resolution.accepted": "conflictResolutionBody", "conflict.resolution.rejected": "conflictResolutionBody",
  "agent.membership.granted": "agentMembershipBody", "agent.membership.revoked": "agentMembershipBody",
  "agent.capability.granted": "agentCapabilityBody", "agent.capability.revoked": "agentCapabilityBody",
  "agent.budget.allocated": "agentBudgetBody", "agent.budget.reserved": "agentBudgetBody",
  "agent.budget.consumed": "agentBudgetBody", "agent.budget.released": "agentBudgetBody",
  "projection.recorded": "projectionBody", "mirror.defined": "mirrorBody", "mirror.checkpoint": "mirrorBody", "mirror.run": "mirrorBody",
  "object.promise.recorded": "objectPromiseBody", "software-heritage.mapping": "softwareHeritageMappingBody",
  "software-heritage.archive-requested": "softwareHeritageArchiveBody", "software-heritage.archive-status": "softwareHeritageArchiveBody",
  "space.created": "spaceCreatedBody", "space.participant.joined": "spaceParticipantJoinedBody",
  "space.participant.left": "spaceParticipantLeftBody", "space.workspace.bound": "spaceWorkspaceBoundBody",
  "space.turn.recorded": "spaceTurnRecordedBody", "space.budget.allocated": "spaceBudgetAllocatedBody", "space.capture.opened": "spaceCaptureOpenedBody",
  "space.capture.closed": "spaceCaptureClosedBody", "space.capture.operation": "spaceCaptureOperationBody",
  "space.anchor.recorded": "spaceAnchorRecordedBody",
};

/** Deterministic, dependency-free JSON Schema emitted by the authoritative runtime contract. */
export function protocolJsonSchemas() {
  return {
    $schema: "https://json-schema.org/draft/2020-12/schema",
    $id: "https://epoch.dev/schemas/protocol/events-v1.json",
    title: "Epoch Protocol Events v1",
    type: "object",
    additionalProperties: false,
    required: ["schemaVersion", "type", "eventId", "revisionId", "body"],
    properties: {
      schemaVersion: { const: 1 },
      type: { enum: [...PROTOCOL_EVENT_SCHEMAS] },
      eventId: revisionId,
      revisionId,
      body: { type: "object" },
    },
    oneOf: PROTOCOL_EVENT_SCHEMAS.map((type) => ({
      properties: { type: { const: type }, body: ref(bodyDefinitionByType[type]) },
      required: ["type", "body"],
    })),
    $defs: {
      canonicalId: { type: "string", pattern: `^epoch:(${CANONICAL_ID_KINDS.join("|")}):[a-z2-7]{52}$` },
      revisionId,
      digest,
      repositoryPath,
      ...complexBodies,
      ...simpleBodies,
    },
  } as const;
}
