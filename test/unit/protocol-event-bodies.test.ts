import assert from "node:assert/strict";
import {
  PROTOCOL_EVENT_SCHEMAS,
  assertProtocolEvent,
  type ProtocolEventType,
} from "@epoch/protocol";

export function runProtocolEventBodyTests(): void {
  everyDeclaredEventTypeAcceptsACanonicalBody();
  failClosedRejectsUnknownTypesFieldsAndEscapes();
  failClosedRejectsMalformedFragmentsAndGraphs();
}

function id(kind: string, token = "a"): string {
  return `epoch:${kind}:${token.repeat(52).slice(0, 52)}`;
}

function digest(token = "a"): string {
  const hex = [...token].map((character) => {
    const code = character.toLowerCase().codePointAt(0) ?? 97;
    return (code % 16).toString(16);
  }).join("") || "a";
  return hex.repeat(64).slice(0, 64);
}

function event(type: ProtocolEventType, body: Record<string, unknown>, eventId = "event-01") {
  return { schemaVersion: 1 as const, type, eventId, revisionId: eventId, body };
}

function addFragment(path = "src/new.ts") {
  return {
    fragmentId: id("fragment", "b"),
    kind: "add",
    path,
    precondition: { kind: "absent" },
    resultDigest: digest("b"),
    contentRef: `sha256:${digest("c")}`,
    order: 0,
    dependencies: [],
    provenance: { principalId: id("principal", "c") },
    mergeStrategy: "exact",
  };
}

function changeRevisionBody() {
  return {
    changeId: id("change"),
    baseFrontier: ["event-base"],
    baseTreeDigest: digest("a"),
    parentRevisionIds: [],
    fragments: [addFragment()],
    resultingTreeDigest: digest("d"),
    authorPrincipalId: id("principal", "c"),
  };
}

function canonicalBodies(): Record<ProtocolEventType, Record<string, unknown>> {
  const changeGraph = {
    changeGraphId: id("change-graph"),
    memberRevisionIds: ["rev-a", "rev-b"],
    edges: [{ from: "rev-a", to: "rev-b", kind: "requires" }],
  };
  const reviewBundle = {
    reviewBundleId: id("review-bundle"),
    selectedRevisionIds: ["rev-a"],
    baseFrontier: ["rev-base"],
    baseTreeDigest: digest("a"),
    combinedTreeDigest: digest("b"),
    overlaps: [{ left: id("fragment", "c"), right: id("fragment", "d") }],
    conflictIds: [id("conflict")],
    gateDefinitionDigest: digest("e"),
  };
  const mergePlan = {
    mergePlanId: id("merge-plan"),
    targetRevisionId: "rev-target",
    selectedRevisionIds: ["rev-a"],
    hardDependencyClosure: ["rev-a"],
    reviewBundleRevisionId: "rev-bundle",
    conflictResolutionRevisionIds: ["rev-resolution"],
    gateDefinitionDigest: digest("f"),
    mergeMode: "per-change-squash",
    resultingTreeDigest: digest("g"),
  };
  return {
    "repository.identity": { repositoryId: id("repo"), principalId: id("principal") },
    "change.created": changeRevisionBody(),
    "change.revised": changeRevisionBody(),
    "change.superseded": {
      changeId: id("change"),
      supersededRevisionId: "rev-old",
      byRevisionId: "rev-new",
    },
    "change.dependency.added": {
      changeRevisionId: "rev-change",
      dependencyRevisionId: "rev-dep",
    },
    "change.dependency.removed": {
      changeRevisionId: "rev-change",
      dependencyRevisionId: "rev-dep",
    },
    "change-graph.defined": changeGraph,
    "change-graph.revised": changeGraph,
    "split.accepted": {
      sourceRevisionId: "rev-source",
      groups: [{ fragmentIds: [id("fragment")], risk: "low", reason: "atomic" }],
      resultingRevisionIds: ["rev-a", "rev-b"],
      reconstructionDigest: digest("h"),
    },
    "review.bundle.created": reviewBundle,
    "review.bundle.revised": reviewBundle,
    "review.recorded": {
      reviewBundleId: id("review-bundle"),
      bundleRevisionId: "rev-bundle",
      reviewerPrincipalId: id("principal"),
      verdict: "approved",
    },
    "merge.plan.created": mergePlan,
    "merge.plan.gate-recorded": {
      mergePlanId: id("merge-plan"),
      gateDefinitionDigest: digest("i"),
      status: "passed",
      evidenceRevisionIds: ["rev-evidence"],
    },
    "merge.plan.applied": {
      mergePlanId: id("merge-plan"),
      targetRevisionId: "rev-target",
      resultRevisionId: "rev-result",
      resultTreeDigest: digest("j"),
      mergeMode: "change-graph-squash",
      sourceRevisionIds: ["rev-a"],
    },
    "conflict.recorded": {
      conflictId: id("conflict"),
      sideRevisionIds: ["rev-left", "rev-right"],
      status: "unresolved",
      resolutionRevisionIds: [],
    },
    "conflict.resolution.proposed": {
      conflictId: id("conflict"),
      resolutionRevisionId: "rev-resolution",
      principalId: id("principal"),
    },
    "conflict.resolution.accepted": {
      conflictId: id("conflict"),
      resolutionRevisionId: "rev-resolution",
      principalId: id("principal"),
    },
    "conflict.resolution.rejected": {
      conflictId: id("conflict"),
      resolutionRevisionId: "rev-resolution",
      principalId: id("principal"),
    },
    "agent.membership.granted": {
      workspaceId: id("workspace"),
      principalId: id("principal"),
      grantId: id("grant"),
    },
    "agent.membership.revoked": {
      workspaceId: id("workspace"),
      principalId: id("principal"),
      grantId: id("grant"),
    },
    "agent.capability.granted": {
      grantId: id("grant"),
      principalId: id("principal"),
      capability: "merge",
    },
    "agent.capability.revoked": {
      grantId: id("grant"),
      principalId: id("principal"),
      capability: "merge",
    },
    "agent.budget.allocated": { budgetId: id("budget"), principalId: id("principal"), units: 12 },
    "agent.budget.reserved": { budgetId: id("budget"), principalId: id("principal"), units: 4 },
    "agent.budget.consumed": { budgetId: id("budget"), principalId: id("principal"), units: 2 },
    "agent.budget.released": { budgetId: id("budget"), principalId: id("principal"), units: 1 },
    "projection.recorded": {
      projectionId: id("projection"),
      repositoryId: id("repo"),
      definitionDigest: digest("k"),
    },
    "mirror.defined": {
      mirrorId: id("mirror"),
      repositoryId: id("repo"),
      remoteRef: "refs/heads/main",
      frontier: ["rev-a"],
    },
    "mirror.checkpoint": {
      mirrorId: id("mirror"),
      repositoryId: id("repo"),
      remoteRef: "refs/heads/main",
      frontier: ["rev-a"],
    },
    "mirror.run": {
      mirrorId: id("mirror"),
      repositoryId: id("repo"),
      remoteRef: "refs/heads/main",
      frontier: ["rev-a"],
    },
    "object.promise.recorded": {
      promiseId: id("promise"),
      contentDigest: digest("l"),
      status: "pending",
    },
    "software-heritage.mapping": {
      repositoryId: id("repo"),
      swhId: `swh:1:rev:${"a".repeat(40)}`,
      frontier: ["rev-a"],
    },
    "software-heritage.archive-requested": {
      repositoryId: id("repo"),
      versionId: id("version"),
      requestId: "task-1",
      status: "requested",
    },
    "software-heritage.archive-status": {
      repositoryId: id("repo"),
      versionId: id("version"),
      requestId: "task-1",
      status: "succeeded",
    },
    "space.created": {
      spaceId: id("space"),
      repositoryId: id("repo"),
      ownerPrincipalId: id("principal"),
      viewName: "main",
      title: "Workshop",
    },
    "space.participant.joined": {
      spaceId: id("space"),
      principalId: id("principal"),
      grantId: id("grant"),
      role: "collaborator",
    },
    "space.participant.left": {
      spaceId: id("space"),
      principalId: id("principal"),
      grantId: id("grant"),
    },
    "space.workspace.bound": {
      spaceId: id("space"),
      principalId: id("principal"),
      workspaceId: id("workspace"),
      providerId: "filesystem",
      storageMode: "local",
      residency: "resident",
      materialization: "materialized",
      execution: "isolated",
    },
    "space.turn.recorded": {
      spaceId: id("space"),
      principalId: id("principal"),
      grantId: id("grant"),
      execution: "isolated",
      requestDigest: digest("m"),
      sandboxId: id("sandbox"),
      budgetId: id("budget"),
      units: 3,
    },
    "space.budget.allocated": {
      spaceId: id("space"),
      budgetId: id("budget"),
      principalId: id("principal"),
      units: 20,
    },
    "space.capture.opened": {
      spaceId: id("space"),
      sessionId: id("session"),
      principalId: id("principal"),
      scope: "workspace",
      retention: "session",
      redaction: "declared-secrets",
    },
    "space.capture.closed": {
      spaceId: id("space"),
      sessionId: id("session"),
      principalId: id("principal"),
      operationCount: 2,
    },
    "space.capture.operation": {
      spaceId: id("space"),
      sessionId: id("session"),
      principalId: id("principal"),
      path: "src/captured.ts",
      contentDigest: digest("n"),
    },
    "space.anchor.recorded": {
      spaceId: id("space"),
      anchorId: id("anchor"),
      principalId: id("principal"),
      revisionId: "rev-anchor",
      path: "src/main.ts",
      structuralPath: "/FunctionDeclaration/main",
      contentDigest: digest("o"),
    },
    "space.turn.receipt": {
      spaceId: id("space"),
      principalId: id("principal"),
      turnRevisionId: "rev-turn",
      sandboxId: id("sandbox"),
      isolation: "namespace",
      network: "denied",
      outcome: "succeeded",
      exitCode: 0,
      durationMs: 12,
    },
  };
}

function everyDeclaredEventTypeAcceptsACanonicalBody(): void {
  const bodies = canonicalBodies();
  assert.deepEqual(
    Object.keys(bodies).sort(),
    [...PROTOCOL_EVENT_SCHEMAS].sort(),
    "canonical fixtures must cover every declared protocol event type",
  );
  for (const type of PROTOCOL_EVENT_SCHEMAS) {
    const accepted = assertProtocolEvent(event(type, bodies[type]));
    assert.equal(accepted.type, type);
    assert.equal(accepted.eventId, accepted.revisionId);
  }
}

function failClosedRejectsUnknownTypesFieldsAndEscapes(): void {
  const bodies = canonicalBodies();
  assert.throws(() => assertProtocolEvent({
    ...event("change.created", bodies["change.created"]),
    type: "change.deleted",
  }), /Unknown protocol event type/u);
  assert.throws(() => assertProtocolEvent({
    ...event("repository.identity", bodies["repository.identity"]),
    extra: true,
  }), /Unknown event field/u);
  assert.throws(() => assertProtocolEvent({
    ...event("repository.identity", bodies["repository.identity"]),
    schemaVersion: 2,
  }), /Unsupported protocol schemaVersion/u);
  assert.throws(() => assertProtocolEvent({
    ...event("repository.identity", bodies["repository.identity"]),
    revisionId: "other-event",
  }), /must equal/u);
  assert.throws(() => assertProtocolEvent({
    ...event("agent.budget.allocated", { ...bodies["agent.budget.allocated"], units: -1 }),
  }), /nonnegative/u);
  assert.throws(() => assertProtocolEvent({
    ...event("space.capture.operation", { ...bodies["space.capture.operation"], path: "../etc/passwd" }),
  }), /repository-relative path/u);
  assert.throws(() => assertProtocolEvent({
    ...event("space.capture.operation", { ...bodies["space.capture.operation"], path: "/etc/passwd" }),
  }), /repository-relative path/u);
  assert.throws(() => assertProtocolEvent({
    ...event("review.recorded", { ...bodies["review.recorded"], verdict: "maybe" }),
  }), /Unknown verdict/u);
  assert.throws(() => assertProtocolEvent({
    ...event("object.promise.recorded", { ...bodies["object.promise.recorded"], status: "forged" }),
  }), /Unknown status/u);
  assert.throws(() => assertProtocolEvent({
    ...event("space.participant.joined", { ...bodies["space.participant.joined"], role: "admin" }),
  }), /Unknown role/u);
  assert.throws(() => assertProtocolEvent(null), /event must be an object/u);
  assert.throws(() => assertProtocolEvent({
    ...event("repository.identity", "not-an-object" as unknown as Record<string, unknown>),
  }), /event body must be an object/u);
}

function failClosedRejectsMalformedFragmentsAndGraphs(): void {
  const base = changeRevisionBody();
  assert.throws(() => assertProtocolEvent(event("change.created", { ...base, fragments: [] })), /requires fragments/u);
  assert.throws(() => assertProtocolEvent(event("change.created", {
    ...base,
    fragments: [addFragment(), addFragment()],
  })), /Duplicate fragment ID/u);
  assert.throws(() => assertProtocolEvent(event("change.created", {
    ...base,
    fragments: [{ ...addFragment(), kind: "symlink" }],
  })), /Unknown fragment kind/u);
  assert.throws(() => assertProtocolEvent(event("change.created", {
    ...base,
    fragments: [{ ...addFragment(), from: { path: "src/old.ts" } }],
  })), /Only move\/copy fragments may carry from/u);
  assert.throws(() => assertProtocolEvent(event("change.created", {
    ...base,
    fragments: [{
      ...addFragment(),
      kind: "move",
      from: { path: "../escape.ts" },
    }],
  })), /repository-relative path/u);
  assert.throws(() => assertProtocolEvent(event("change.created", {
    ...base,
    fragments: [{
      ...addFragment(),
      kind: "copy",
      from: { path: "src/old.ts", digest: digest("z") },
      precondition: { kind: "absent", digest: digest("q") },
    }],
  })), /Absent precondition cannot carry digest/u);
  assert.throws(() => assertProtocolEvent(event("change.created", {
    ...base,
    fragments: [{ ...addFragment(), precondition: { kind: "mystery" } }],
  })), /Unknown fragment precondition/u);
  assert.throws(() => assertProtocolEvent(event("change.created", {
    ...base,
    fragments: [{ ...addFragment(), contentRef: "md5:not-a-digest" }],
  })), /Invalid fragment content reference/u);
  assert.throws(() => assertProtocolEvent(event("change.created", {
    ...base,
    fragments: [{ ...addFragment(), order: -1 }],
  })), /Fragment order must be nonnegative/u);
  assert.throws(() => assertProtocolEvent(event("change.created", {
    ...base,
    fragments: [{ ...addFragment(), mergeStrategy: "ours" }],
  })), /Unknown fragment merge strategy/u);
  const acceptedText = assertProtocolEvent(event("change.created", {
    ...base,
    fragments: [{
      ...addFragment(),
      kind: "text",
      precondition: { kind: "digest", digest: digest("p") },
    }],
  }));
  assert.equal(acceptedText.type, "change.created");
  const acceptedMove = assertProtocolEvent(event("change.created", {
    ...base,
    fragments: [{
      ...addFragment(),
      kind: "move",
      from: { path: "src/old.ts", digest: digest("z") },
      precondition: { kind: "digest", digest: digest("p") },
    }],
  }));
  assert.equal(acceptedMove.type, "change.created");

  assert.throws(() => assertProtocolEvent(event("change-graph.defined", {
    changeGraphId: id("change-graph"),
    memberRevisionIds: ["rev-a"],
    edges: [{ from: "rev-a", to: "rev-missing", kind: "requires" }],
  })), /exact member revisions/u);
  assert.throws(() => assertProtocolEvent(event("change-graph.defined", {
    changeGraphId: id("change-graph"),
    memberRevisionIds: ["rev-a", "rev-b"],
    edges: [{ from: "rev-a", to: "rev-b", kind: "depends-on" }],
  })), /Unknown change graph edge kind/u);
  assert.throws(() => assertProtocolEvent(event("conflict.recorded", {
    conflictId: id("conflict"),
    sideRevisionIds: ["rev-only"],
    status: "unresolved",
    resolutionRevisionIds: [],
  })), /at least two sides/u);
  assert.throws(() => assertProtocolEvent(event("conflict.recorded", {
    conflictId: id("conflict"),
    sideRevisionIds: ["rev-left", "rev-right"],
    status: "ignored",
    resolutionRevisionIds: [],
  })), /Unknown conflict status/u);
  assert.throws(() => assertProtocolEvent(event("split.accepted", {
    sourceRevisionId: "rev-source",
    groups: [{ fragmentIds: [id("fragment")], risk: "unknown", reason: "nope" }],
    resultingRevisionIds: ["rev-a"],
    reconstructionDigest: digest("h"),
  })), /Invalid split risk/u);
  assert.throws(() => assertProtocolEvent(event("merge.plan.created", {
    mergePlanId: id("merge-plan"),
    targetRevisionId: "rev-target",
    selectedRevisionIds: ["rev-a"],
    hardDependencyClosure: ["rev-a"],
    reviewBundleRevisionId: "rev-bundle",
    conflictResolutionRevisionIds: [],
    gateDefinitionDigest: digest("f"),
    mergeMode: "ours",
    resultingTreeDigest: digest("g"),
  })), /Unknown merge mode/u);
}
