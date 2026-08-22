import { fail } from "./errors";
import { assertRevisionId, parseCanonicalId, type RevisionId } from "./ids";
import type { ChangeFragment, ChangeGraphDefinition, ChangeRevisionBody, DurableConflict, MergePlan, ReviewBundle, SplitPlan } from "./models";
type BoundaryValue = null | undefined | boolean | number | string | bigint | symbol | Readonly<object>;
type DictionaryValue = null | undefined | boolean | number | string | bigint | readonly DictionaryValue[] | { readonly [key: string]: DictionaryValue };
function __epochIsString<T>(value: T): value is T & string { return typeof value === "string"; }
function __epochIsObject<T>(value: T): value is T & object { return typeof value === "object"; }


export const PROTOCOL_EVENT_SCHEMAS = [
  "repository.identity",
  "change.created", "change.revised", "change.superseded", "change.dependency.added", "change.dependency.removed",
  "change-graph.defined", "change-graph.revised", "split.accepted",
  "review.bundle.created", "review.bundle.revised", "review.recorded",
  "merge.plan.created", "merge.plan.gate-recorded", "merge.plan.applied",
  "conflict.recorded", "conflict.resolution.proposed", "conflict.resolution.accepted", "conflict.resolution.rejected",
  "agent.membership.granted", "agent.membership.revoked",
  "agent.capability.granted", "agent.capability.revoked",
  "agent.budget.allocated", "agent.budget.reserved", "agent.budget.consumed", "agent.budget.released",
  "projection.recorded",
  "mirror.defined", "mirror.checkpoint", "mirror.run",
  "object.promise.recorded",
  "software-heritage.mapping", "software-heritage.archive-requested", "software-heritage.archive-status",
  "space.created", "space.participant.joined", "space.participant.left",
  "space.workspace.bound", "space.turn.recorded", "space.budget.allocated",
  "space.capture.opened", "space.capture.closed", "space.capture.operation",
  "space.anchor.recorded", "space.turn.receipt",
  "live.session.created", "live.session.lifecycle", "live.session.policy",
  "live.session.consent", "live.session.sealed", "live.session.bound",
  "channel.create", "channel.message", "channel.presence", "channel.read",
] as const;

/** Live Session vocabularies shared by validation and schema generation. */
export const LIVE_SESSION_LIFECYCLE_STATES = ["draft", "lobby", "live", "paused", "ended", "sealed"] as const;
export const LIVE_SESSION_LIFECYCLE_COMMANDS = ["openLobby", "start", "pause", "resume", "end"] as const;
export const LIVE_SESSION_VISIBILITIES = ["private", "community", "unlisted", "public"] as const;
export const LIVE_SESSION_SECURITY_MODES = ["semantic-only", "private-e2ee", "private-recordable", "public-broadcast"] as const;
export const LIVE_SESSION_CONSENT_SCOPES = ["semantic-capture", "audio", "camera", "screen-share", "captions", "recording", "external-egress"] as const;
export const LIVE_SESSION_POLICY_CHANGES = ["initial", "narrowing", "widening", "mixed"] as const;
export const LIVE_SESSION_COMPLETENESS = ["complete", "semantic-only", "media-missing", "partial"] as const;
/**
 * What a Live Session may bind itself to in Community.
 *
 * A session is a canonical Community entity, not a copy of one per projection,
 * so the binding names the single object every surface targets. `thread` is
 * where questions, moderation, and annotation live; `change` is what a fork
 * continues into.
 */
export const LIVE_SESSION_BINDING_KINDS = ["thread", "change"] as const;

export type ProtocolEventType = typeof PROTOCOL_EVENT_SCHEMAS[number];

export interface ProtocolEvent<TBody = unknown> {
  readonly schemaVersion: 1;
  readonly type: ProtocolEventType;
  readonly eventId: RevisionId;
  /** A revision is the signed event itself, never a mutable alias. */
  readonly revisionId: RevisionId;
  readonly body: TBody;
}

type RecordValue = Record<string, DictionaryValue>;
const typeSet = new Set<string>(PROTOCOL_EVENT_SCHEMAS);
const digestPattern = /^[a-f0-9]{64}$/u;
const safePathSegment = /^(?!\.\.?$)[^/\\\0]+$/u;

export function assertProtocolEvent(value: BoundaryValue): ProtocolEvent {
  const event = record(value, "event");
  exact(event, ["schemaVersion", "type", "eventId", "revisionId", "body"], "event");
  if (event.schemaVersion !== 1) fail("invalid-schema", "Unsupported protocol schemaVersion");
  if (!__epochIsString(event.type) || !typeSet.has(event.type)) fail("invalid-schema", `Unknown protocol event type: ${String(event.type)}`);
  const eventId = assertRevisionId(event.eventId);
  const revisionId = assertRevisionId(event.revisionId);
  if (revisionId !== eventId) fail("invalid-schema", "RevisionId must equal the signed EventId");
  // SAFETY: The module validates or constructs this value before applying the asserted contract.
  validateBody(event.type as ProtocolEventType, event.body);
  // SAFETY: The module validates or constructs this value before applying the asserted contract.
  return value as ProtocolEvent;
}

function validateBody(type: ProtocolEventType, value: BoundaryValue): void {
  switch (type) {
    case "change.created": case "change.revised": validateChangeRevision(value); return;
    case "change-graph.defined": case "change-graph.revised": validateChangeGraph(value); return;
    case "split.accepted": validateSplit(value); return;
    case "review.bundle.created": case "review.bundle.revised": validateReviewBundle(value); return;
    case "merge.plan.created": validateMergePlan(value); return;
    case "conflict.recorded": validateConflict(value); return;
    case "repository.identity": validateFields(value, {
      required: ["repositoryId", "principalId"], ids: { repositoryId: "repo", principalId: "principal" },
      optional: ["keyId"], optionalIds: { keyId: "key" },
    }); return;
    case "change.superseded": validateFields(value, {
      required: ["changeId", "supersededRevisionId", "byRevisionId"],
      ids: { changeId: "change" }, revisions: ["supersededRevisionId", "byRevisionId"],
    }); return;
    case "change.dependency.added": case "change.dependency.removed": validateFields(value, {
      required: ["changeRevisionId", "dependencyRevisionId"], revisions: ["changeRevisionId", "dependencyRevisionId"],
    }); return;
    case "review.recorded": validateFields(value, {
      required: ["reviewBundleId", "bundleRevisionId", "reviewerPrincipalId", "verdict"],
      ids: { reviewBundleId: "review-bundle", reviewerPrincipalId: "principal" }, revisions: ["bundleRevisionId"],
      enums: { verdict: ["approved", "changes-requested", "commented"] },
    }); return;
    case "merge.plan.gate-recorded": validateFields(value, {
      required: ["mergePlanId", "gateDefinitionDigest", "status", "evidenceRevisionIds"], ids: { mergePlanId: "merge-plan" },
      digests: ["gateDefinitionDigest"], revisionArrays: ["evidenceRevisionIds"], enums: { status: ["passed", "failed"] },
    }); return;
    case "merge.plan.applied": validateFields(value, {
      required: ["mergePlanId", "targetRevisionId", "resultRevisionId", "resultTreeDigest", "mergeMode", "sourceRevisionIds"],
      ids: { mergePlanId: "merge-plan" }, revisions: ["targetRevisionId", "resultRevisionId"],
      digests: ["resultTreeDigest"], revisionArrays: ["sourceRevisionIds"], enums: { mergeMode: ["per-change-squash", "change-graph-squash"] },
    }); return;
    case "conflict.resolution.proposed": case "conflict.resolution.accepted": case "conflict.resolution.rejected": validateFields(value, {
      required: ["conflictId", "resolutionRevisionId", "principalId"],
      ids: { conflictId: "conflict", principalId: "principal" }, revisions: ["resolutionRevisionId"],
    }); return;
    case "agent.membership.granted": case "agent.membership.revoked": validateFields(value, {
      required: ["workspaceId", "principalId", "grantId"], ids: { workspaceId: "workspace", principalId: "principal", grantId: "grant" },
    }); return;
    case "agent.capability.granted": case "agent.capability.revoked": validateFields(value, {
      required: ["grantId", "principalId", "capability"], ids: { grantId: "grant", principalId: "principal" }, strings: ["capability"],
    }); return;
    case "agent.budget.allocated": case "agent.budget.reserved": case "agent.budget.consumed": case "agent.budget.released": validateFields(value, {
      required: ["budgetId", "principalId", "units"], ids: { budgetId: "budget", principalId: "principal" }, nonnegativeIntegers: ["units"],
    }); return;
    case "projection.recorded": validateFields(value, {
      required: ["projectionId", "repositoryId", "definitionDigest"], ids: { projectionId: "projection", repositoryId: "repo" }, digests: ["definitionDigest"],
    }); return;
    case "mirror.defined": case "mirror.checkpoint": case "mirror.run": validateFields(value, {
      required: ["mirrorId", "repositoryId", "remoteRef", "frontier"], ids: { mirrorId: "mirror", repositoryId: "repo" }, strings: ["remoteRef"], revisionArrays: ["frontier"],
    }); return;
    case "object.promise.recorded": validateFields(value, {
      required: ["promiseId", "contentDigest", "status"], ids: { promiseId: "promise" }, digests: ["contentDigest"], enums: { status: ["pending", "fulfilled", "rejected"] },
    }); return;
    case "software-heritage.mapping": validateFields(value, {
      required: ["repositoryId", "swhId", "frontier"], ids: { repositoryId: "repo" }, strings: ["swhId"], revisionArrays: ["frontier"],
    }); return;
    case "software-heritage.archive-requested": case "software-heritage.archive-status": validateFields(value, {
      required: ["repositoryId", "versionId", "requestId", "status"],
      ids: { repositoryId: "repo", versionId: "version" }, strings: ["requestId"],
      enums: { status: ["requested", "pending", "succeeded", "failed", "cancelled"] },
    }); return;
    case "space.created": validateFields(value, {
      required: ["spaceId", "repositoryId", "ownerPrincipalId", "viewName", "title"],
      ids: { spaceId: "space", repositoryId: "repo", ownerPrincipalId: "principal" },
      strings: ["viewName", "title"],
    }); return;
    // Joining is receiving a grant, not an ACL row: the grant ID is required so
    // membership and authority cannot drift apart (ADR-0034, ADR-0043).
    case "space.participant.joined": validateFields(value, {
      required: ["spaceId", "principalId", "grantId", "role"],
      ids: { spaceId: "space", principalId: "principal", grantId: "grant" },
      enums: { role: ["owner", "collaborator", "agent", "observer"] },
    }); return;
    case "space.participant.left": validateFields(value, {
      required: ["spaceId", "principalId", "grantId"],
      ids: { spaceId: "space", principalId: "principal", grantId: "grant" },
    }); return;
    // The Space reports nothing about materialization on a provider's behalf;
    // it records what that provider truthfully declared (ADR-0032).
    case "space.workspace.bound": validateFields(value, {
      required: ["spaceId", "principalId", "workspaceId", "providerId", "storageMode", "residency", "materialization", "execution"],
      ids: { spaceId: "space", principalId: "principal", workspaceId: "workspace" },
      strings: ["providerId", "storageMode"],
      enums: {
        residency: ["resident", "partial", "virtual"],
        materialization: ["materialized", "virtual"],
        execution: ["disabled", "in-process", "isolated"],
      },
    }); return;
    case "space.turn.recorded": validateFields(value, {
      required: ["spaceId", "principalId", "grantId", "execution", "requestDigest"],
      optional: ["sandboxId", "budgetId", "units"],
      ids: { spaceId: "space", principalId: "principal", grantId: "grant" },
      optionalIds: { sandboxId: "sandbox", budgetId: "budget" },
      digests: ["requestDigest"],
      optionalNonnegativeIntegers: ["units"],
      enums: { execution: ["disabled", "in-process", "isolated"] },
    }); return;
    // Budgets bind to the Space that allocated them. Without the spaceId an
    // allocation made in one Space would be spendable in another.
    case "space.budget.allocated": validateFields(value, {
      required: ["spaceId", "budgetId", "principalId", "units"],
      ids: { spaceId: "space", budgetId: "budget", principalId: "principal" },
      nonnegativeIntegers: ["units"],
    }); return;
    case "space.capture.opened": validateFields(value, {
      required: ["spaceId", "sessionId", "principalId", "scope", "retention", "redaction"],
      ids: { spaceId: "space", sessionId: "session", principalId: "principal" },
      strings: ["scope", "retention"],
      enums: { redaction: ["none", "declared-secrets", "full"] },
    }); return;
    case "space.capture.closed": validateFields(value, {
      required: ["spaceId", "sessionId", "principalId", "operationCount"],
      ids: { spaceId: "space", sessionId: "session", principalId: "principal" },
      nonnegativeIntegers: ["operationCount"],
    }); return;
    case "space.capture.operation": validateFields(value, {
      required: ["spaceId", "sessionId", "principalId", "path", "contentDigest"],
      ids: { spaceId: "space", sessionId: "session", principalId: "principal" },
      paths: ["path"], digests: ["contentDigest"],
    }); return;
    // Anchors bind to a structural path inside an exact Revision, so they
    // re-resolve after reformatting rather than naming a byte offset.
    // A receipt is the evidence half of a turn: what actually ran, under which
    // proven confinement, and what it cost (ADR-0034, ADR-0043 phase 5).
    case "space.turn.receipt": validateFields(value, {
      required: ["spaceId", "principalId", "turnRevisionId", "sandboxId", "isolation", "network", "outcome"],
      optional: ["exitCode", "durationMs"],
      ids: { spaceId: "space", principalId: "principal", sandboxId: "sandbox" },
      revisions: ["turnRevisionId"],
      optionalNonnegativeIntegers: ["durationMs"],
      enums: {
        isolation: ["none", "process", "namespace"],
        network: ["inherited", "denied"],
        outcome: ["succeeded", "failed", "timed-out", "refused"],
      },
    }); return;
    case "space.anchor.recorded": validateFields(value, {
      required: ["spaceId", "anchorId", "principalId", "revisionId", "path", "structuralPath", "contentDigest"],
      ids: { spaceId: "space", anchorId: "anchor", principalId: "principal" },
      revisions: ["revisionId"], paths: ["path"], strings: ["structuralPath"], digests: ["contentDigest"],
    }); return;
    // A Live Session is a publication session bound to an existing Space and
    // View; `sessionKind` keeps live-session ids domain-separated from
    // capture-session ids that share the generic `session` canonical kind.
    case "live.session.created": validateFields(value, {
      required: ["spaceId", "sessionId", "principalId", "sessionKind", "viewName", "visibility", "securityMode", "policyDigest"],
      ids: { spaceId: "space", sessionId: "session", principalId: "principal" },
      strings: ["viewName", "policyDigest"],
      enums: {
        sessionKind: ["live"],
        visibility: LIVE_SESSION_VISIBILITIES,
        securityMode: LIVE_SESSION_SECURITY_MODES,
      },
    }); return;
    case "live.session.lifecycle": validateFields(value, {
      required: ["spaceId", "sessionId", "principalId", "command", "from", "to"],
      ids: { spaceId: "space", sessionId: "session", principalId: "principal" },
      enums: {
        command: LIVE_SESSION_LIFECYCLE_COMMANDS,
        from: LIVE_SESSION_LIFECYCLE_STATES,
        to: LIVE_SESSION_LIFECYCLE_STATES,
      },
    }); return;
    // Policy changes append; they never mutate a prior policy in place.
    case "live.session.policy": validateFields(value, {
      required: ["spaceId", "sessionId", "principalId", "policyDigest", "change"],
      ids: { spaceId: "space", sessionId: "session", principalId: "principal" },
      strings: ["policyDigest"],
      enums: { change: LIVE_SESSION_POLICY_CHANGES },
    }); return;
    case "live.session.consent": validateFields(value, {
      required: ["spaceId", "sessionId", "principalId", "policyDigest", "decision", "scopes"],
      ids: { spaceId: "space", sessionId: "session", principalId: "principal" },
      strings: ["policyDigest"],
      enums: { decision: ["granted", "withdrawn"] },
      enumArrays: { scopes: LIVE_SESSION_CONSENT_SCOPES },
    }); return;
    // Sealing is append-only: the manifest digest is signed evidence, and an
    // ended-but-unsealed session stays distinguishable from a sealed one.
    case "live.session.sealed": validateFields(value, {
      required: ["spaceId", "sessionId", "principalId", "manifestDigest", "completeness"],
      ids: { spaceId: "space", sessionId: "session", principalId: "principal" },
      digests: ["manifestDigest"],
      enums: { completeness: LIVE_SESSION_COMPLETENESS },
    }); return;
    // The session names one canonical Community object rather than copying
    // itself into each projection. Binding appends, so a rebinding is visible
    // as history instead of overwriting where an audience was told to look.
    case "live.session.bound": validateFields(value, {
      required: ["spaceId", "sessionId", "principalId", "objectId", "objectKind"],
      ids: { spaceId: "space", sessionId: "session", principalId: "principal" },
      strings: ["objectId"],
      enums: { objectKind: LIVE_SESSION_BINDING_KINDS },
    }); return;
    case "channel.create": validateFields(value, {
      required: ["schema", "channelId", "communityId", "name", "principalId", "visibility"],
      ids: { channelId: "channel", communityId: "space", principalId: "principal" },
      strings: ["name"],
      enums: { schema: ["epoch.channel/v1"], visibility: ["public", "shared", "private"] },
    }); return;
    case "channel.message": validateFields(value, {
      required: ["schema", "channelId", "messageId", "principalId", "bodyDigest", "visibility"],
      ids: { channelId: "channel", principalId: "principal" },
      revisions: ["messageId"],
      digests: ["bodyDigest"],
      enums: { schema: ["epoch.channel/v1"], visibility: ["public", "shared", "private"] },
    }); return;
    case "channel.presence": validateFields(value, {
      required: ["schema", "channelId", "principalId", "state"],
      ids: { channelId: "channel", principalId: "principal" },
      enums: { schema: ["epoch.channel/v1"], state: ["active", "idle", "away"] },
    }); return;
    case "channel.read": validateFields(value, {
      required: ["schema", "channelId", "principalId", "watermarkEventId"],
      ids: { channelId: "channel", principalId: "principal" },
      revisions: ["watermarkEventId"],
      enums: { schema: ["epoch.channel/v1"] },
    }); return;
  }
}

function validateChangeRevision(value: BoundaryValue): asserts value is ChangeRevisionBody {
  const body = record(value, "change revision");
  exact(body, ["changeId", "baseFrontier", "baseTreeDigest", "parentRevisionIds", "fragments", "resultingTreeDigest", "authorPrincipalId"], "change revision");
  parseCanonicalId(body.changeId, "change");
  revisions(body.baseFrontier, "baseFrontier");
  digest(body.baseTreeDigest, "baseTreeDigest");
  revisions(body.parentRevisionIds, "parentRevisionIds");
  if (!Array.isArray(body.fragments) || body.fragments.length === 0) fail("invalid-schema", "Change revision requires fragments");
  const ids = new Set<string>();
  for (const fragment of body.fragments) {
    validateFragment(fragment);
    // SAFETY: The module validates or constructs this value before applying the asserted contract.
    const id = (fragment as ChangeFragment).fragmentId;
    if (ids.has(id)) fail("invalid-schema", `Duplicate fragment ID: ${id}`);
    ids.add(id);
  }
  digest(body.resultingTreeDigest, "resultingTreeDigest");
  parseCanonicalId(body.authorPrincipalId, "principal");
}

function validateFragment(value: BoundaryValue): asserts value is ChangeFragment {
  const fragment = record(value, "fragment");
  exact(fragment, ["fragmentId", "kind", "path", "from", "precondition", "resultDigest", "contentRef", "order", "dependencies", "provenance", "mergeStrategy"], "fragment", true);
  parseCanonicalId(fragment.fragmentId, "fragment");
  if (!["add", "delete", "move", "copy", "text", "structured", "binary"].includes(String(fragment.kind))) fail("invalid-schema", "Unknown fragment kind");
  path(fragment.path);
  if (["move", "copy"].includes(String(fragment.kind))) {
    const from = record(fragment.from, "fragment source");
    exact(from, ["path", "digest"], "fragment source", true);
    path(from.path);
    if (from.digest !== undefined) digest(from.digest, "source digest");
  } else if (fragment.from !== undefined) fail("invalid-schema", "Only move/copy fragments may carry from");
  const precondition = record(fragment.precondition, "fragment precondition");
  exact(precondition, ["kind", "digest"], "fragment precondition", true);
  if (precondition.kind === "absent") {
    if (precondition.digest !== undefined) fail("invalid-schema", "Absent precondition cannot carry digest");
  } else if (precondition.kind === "digest") digest(precondition.digest, "precondition digest");
  else fail("invalid-schema", "Unknown fragment precondition");
  digest(fragment.resultDigest, "resultDigest");
  if (fragment.contentRef !== undefined && (typeof fragment.contentRef !== "string" || !/^(sha256:[a-f0-9]{64}|swh:[A-Za-z0-9:._~-]+|promise:epoch:promise:[a-z2-7]{52})$/u.test(fragment.contentRef))) fail("invalid-ref", "Invalid fragment content reference");
  if (!Number.isInteger(fragment.order) || Number(fragment.order) < 0) fail("invalid-schema", "Fragment order must be nonnegative integer");
  canonicalIds(fragment.dependencies, "fragment", "fragment dependencies");
  const provenance = record(fragment.provenance, "fragment provenance");
  exact(provenance, ["principalId", "sourceRevisionId"], "fragment provenance", true);
  parseCanonicalId(provenance.principalId, "principal");
  if (provenance.sourceRevisionId !== undefined) assertRevisionId(provenance.sourceRevisionId);
  if (!["exact", "text", "structured", "binary-replace"].includes(String(fragment.mergeStrategy))) fail("invalid-schema", "Unknown fragment merge strategy");
}

function validateChangeGraph(value: BoundaryValue): asserts value is ChangeGraphDefinition {
  const body = record(value, "change graph");
  exact(body, ["changeGraphId", "memberRevisionIds", "edges"], "change graph");
  parseCanonicalId(body.changeGraphId, "change-graph");
  const members = revisions(body.memberRevisionIds, "change graph revisions");
  if (!Array.isArray(body.edges)) fail("invalid-schema", "Change graph edges must be an array");
  for (const edgeValue of body.edges) {
    const edge = record(edgeValue, "change graph edge");
    exact(edge, ["from", "to", "kind"], "change graph edge");
    assertRevisionId(edge.from); assertRevisionId(edge.to);
    if (!members.has(String(edge.from)) || !members.has(String(edge.to))) fail("invalid-ref", "Change graph edge must reference exact member revisions");
    if (!["requires", "orders-after", "conflicts-with", "derived-from"].includes(String(edge.kind))) fail("invalid-schema", "Unknown change graph edge kind");
  }
}

function validateSplit(value: BoundaryValue): asserts value is SplitPlan {
  const body = record(value, "split acceptance");
  exact(body, ["sourceRevisionId", "groups", "resultingRevisionIds", "reconstructionDigest"], "split acceptance");
  assertRevisionId(body.sourceRevisionId);
  if (!Array.isArray(body.groups) || body.groups.length === 0) fail("invalid-schema", "Split acceptance requires groups");
  for (const groupValue of body.groups) {
    const group = record(groupValue, "split group");
    exact(group, ["fragmentIds", "risk", "reason"], "split group");
    canonicalIds(group.fragmentIds, "fragment", "split fragments");
    if (!["low", "medium", "high", "ambiguous"].includes(String(group.risk)) || typeof group.reason !== "string") fail("invalid-schema", "Invalid split risk");
  }
  revisions(body.resultingRevisionIds, "split results");
  digest(body.reconstructionDigest, "reconstructionDigest");
}

function validateReviewBundle(value: BoundaryValue): asserts value is ReviewBundle {
  const body = record(value, "review bundle");
  exact(body, ["reviewBundleId", "selectedRevisionIds", "baseFrontier", "baseTreeDigest", "combinedTreeDigest", "overlaps", "conflictIds", "gateDefinitionDigest"], "review bundle");
  parseCanonicalId(body.reviewBundleId, "review-bundle");
  revisions(body.selectedRevisionIds, "selected review revisions"); revisions(body.baseFrontier, "review base frontier");
  digest(body.baseTreeDigest, "review base digest"); digest(body.combinedTreeDigest, "combined review tree digest"); digest(body.gateDefinitionDigest, "review gate definition digest");
  canonicalIds(body.conflictIds, "conflict", "review conflicts");
  if (!Array.isArray(body.overlaps)) fail("invalid-schema", "Review overlaps must be an array");
  for (const overlapValue of body.overlaps) {
    const overlap = record(overlapValue, "review overlap"); exact(overlap, ["left", "right"], "review overlap");
    parseCanonicalId(overlap.left, "fragment"); parseCanonicalId(overlap.right, "fragment");
  }
}

function validateMergePlan(value: BoundaryValue): asserts value is MergePlan {
  const body = record(value, "merge plan");
  exact(body, ["mergePlanId", "targetRevisionId", "selectedRevisionIds", "hardDependencyClosure", "reviewBundleRevisionId", "conflictResolutionRevisionIds", "gateDefinitionDigest", "mergeMode", "resultingTreeDigest"], "merge plan");
  parseCanonicalId(body.mergePlanId, "merge-plan");
  assertRevisionId(body.targetRevisionId); revisions(body.selectedRevisionIds, "selected merge revisions"); revisions(body.hardDependencyClosure, "hard dependency closure");
  assertRevisionId(body.reviewBundleRevisionId); revisions(body.conflictResolutionRevisionIds, "conflict resolutions");
  digest(body.gateDefinitionDigest, "merge gate definition digest"); digest(body.resultingTreeDigest, "merge result digest");
  if (!["per-change-squash", "change-graph-squash"].includes(String(body.mergeMode))) fail("invalid-schema", "Unknown merge mode");
}

function validateConflict(value: BoundaryValue): asserts value is DurableConflict {
  const body = record(value, "conflict");
  exact(body, ["conflictId", "sideRevisionIds", "status", "resolutionRevisionIds"], "conflict");
  parseCanonicalId(body.conflictId, "conflict");
  if (revisions(body.sideRevisionIds, "conflict sides").size < 2) fail("invalid-schema", "Conflict requires at least two sides");
  if (!["unresolved", "proposed", "accepted", "rejected"].includes(String(body.status))) fail("invalid-schema", "Unknown conflict status");
  revisions(body.resolutionRevisionIds, "conflict resolutions");
}

interface FieldRules {
  readonly required: readonly string[];
  readonly optional?: readonly string[];
  readonly ids?: Readonly<Record<string, Parameters<typeof parseCanonicalId>[1]>>;
  readonly optionalIds?: Readonly<Record<string, Parameters<typeof parseCanonicalId>[1]>>;
  readonly revisions?: readonly string[];
  readonly revisionArrays?: readonly string[];
  readonly digests?: readonly string[];
  readonly strings?: readonly string[];
  /** Normalized repository-relative paths: no absolute, traversal, or NUL segments. */
  readonly paths?: readonly string[];
  readonly nonnegativeIntegers?: readonly string[];
  /** Validated when present, permitted to be absent. */
  readonly optionalNonnegativeIntegers?: readonly string[];
  readonly enums?: Readonly<Record<string, readonly string[]>>;
  /** Arrays whose members must each belong to the allowed set, without duplicates. */
  readonly enumArrays?: Readonly<Record<string, readonly string[]>>;
}

function validateFields(value: BoundaryValue, rules: FieldRules): void {
  const body = record(value, "event body");
  exact(body, [...rules.required, ...(rules.optional ?? [])], "event body", true);
  for (const field of rules.required) if (!(field in body)) fail("invalid-schema", `Missing event body field: ${field}`);
  for (const [field, kind] of Object.entries(rules.ids ?? {})) parseCanonicalId(body[field], kind);
  for (const [field, kind] of Object.entries(rules.optionalIds ?? {})) if (body[field] !== undefined) parseCanonicalId(body[field], kind);
  for (const field of rules.revisions ?? []) assertRevisionId(body[field]);
  for (const field of rules.revisionArrays ?? []) revisions(body[field], field);
  for (const field of rules.digests ?? []) digest(body[field], field);
  for (const field of rules.strings ?? []) if (!__epochIsString(body[field]) || body[field] === "") fail("invalid-schema", `${field} must be non-empty string`);
  for (const field of rules.paths ?? []) path(body[field]);
  for (const field of rules.nonnegativeIntegers ?? []) if (!Number.isSafeInteger(body[field]) || Number(body[field]) < 0) fail("invalid-schema", `${field} must be nonnegative integer`);
  for (const field of rules.optionalNonnegativeIntegers ?? []) {
    if (body[field] !== undefined && (!Number.isSafeInteger(body[field]) || Number(body[field]) < 0)) {
      fail("invalid-schema", `${field} must be nonnegative integer`);
    }
  }
  for (const [field, allowed] of Object.entries(rules.enums ?? {})) if (!allowed.includes(String(body[field]))) fail("invalid-schema", `Unknown ${field} variant`);
  for (const [field, allowed] of Object.entries(rules.enumArrays ?? {})) {
    const items = body[field];
    if (!Array.isArray(items)) fail("invalid-schema", `${field} must be an array`);
    const seen = new Set<string>();
    for (const item of items) {
      if (!__epochIsString(item) || !allowed.includes(item)) fail("invalid-schema", `Unknown ${field} variant`);
      if (seen.has(item)) fail("invalid-schema", `Duplicate ${field}: ${item}`);
      seen.add(item);
    }
  }
}

function record(value: BoundaryValue, label: string): RecordValue {
  if (!__epochIsObject(value) || value === null || Array.isArray(value)) fail("invalid-schema", `${label} must be an object`);
  // SAFETY: The module validates or constructs this value before applying the asserted contract.
  return value as RecordValue;
}

function exact(value: RecordValue, fields: readonly string[], label: string, optional = false): void {
  const allowed = new Set(fields);
  for (const key of Object.keys(value)) if (!allowed.has(key)) fail("invalid-schema", `Unknown ${label} field: ${key}`);
  if (!optional) for (const field of fields) if (!(field in value)) fail("invalid-schema", `Missing ${label} field: ${field}`);
}

function revisions(value: BoundaryValue, label: string): Set<string> {
  if (!Array.isArray(value)) fail("invalid-schema", `${label} must be an array`);
  const result = new Set<string>();
  for (const item of value) {
    const revision = assertRevisionId(item);
    if (result.has(revision)) fail("invalid-schema", `Duplicate ${label}: ${revision}`);
    result.add(revision);
  }
  return result;
}

function canonicalIds(value: BoundaryValue, kind: Parameters<typeof parseCanonicalId>[1], label: string): Set<string> {
  if (!Array.isArray(value)) fail("invalid-schema", `${label} must be an array`);
  const result = new Set<string>();
  for (const item of value) {
    parseCanonicalId(item, kind);
    if (result.has(String(item))) fail("invalid-schema", `Duplicate ${label}: ${String(item)}`);
    result.add(String(item));
  }
  return result;
}

function digest(value: BoundaryValue, label: string): string {
  if (!__epochIsString(value) || !digestPattern.test(value)) fail("invalid-ref", `${label} must be a lowercase SHA-256 digest`);
  return value;
}

function path(value: BoundaryValue): string {
  if (!__epochIsString(value) || value === "" || value.length > 4096 || value.startsWith("/")
    || value.split("/").some((segment) => !safePathSegment.test(segment))) fail("invalid-path", "Fragment path must be normalized repository-relative path");
  return value;
}
