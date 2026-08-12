/* Generated from packages/Epoch.Community.Core/src/index.ts. Run npm run nightboard:build. */
/* global URLSearchParams */
"use strict";
var NB_CORE = (() => {
  var __defProp = Object.defineProperty;
  var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
  var __getOwnPropNames = Object.getOwnPropertyNames;
  var __hasOwnProp = Object.prototype.hasOwnProperty;
  var __typeError = (msg) => {
    throw TypeError(msg);
  };
  var __export = (target, all) => {
    for (var name in all)
      __defProp(target, name, { get: all[name], enumerable: true });
  };
  var __copyProps = (to, from, except, desc) => {
    if (from && typeof from === "object" || typeof from === "function") {
      for (let key of __getOwnPropNames(from))
        if (!__hasOwnProp.call(to, key) && key !== except)
          __defProp(to, key, { get: () => from[key], enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable });
    }
    return to;
  };
  var __toCommonJS = (mod) => __copyProps(__defProp({}, "__esModule", { value: true }), mod);
  var __accessCheck = (obj, member, msg) => member.has(obj) || __typeError("Cannot " + msg);
  var __privateGet = (obj, member, getter) => (__accessCheck(obj, member, "read from private field"), getter ? getter.call(obj) : member.get(obj));
  var __privateAdd = (obj, member, value) => member.has(obj) ? __typeError("Cannot add the same private member more than once") : member instanceof WeakSet ? member.add(obj) : member.set(obj, value);
  var __privateSet = (obj, member, value, setter) => (__accessCheck(obj, member, "write to private field"), setter ? setter.call(obj, value) : member.set(obj, value), value);
  var __privateMethod = (obj, member, method) => (__accessCheck(obj, member, "access private method"), method);

  // packages/Epoch.Community.Core/src/index.ts
  var index_exports = {};
  __export(index_exports, {
    BUILT_IN_ACTIONS: () => BUILT_IN_ACTIONS,
    COMMUNITY_QUERY_FIELDS: () => COMMUNITY_QUERY_FIELDS,
    ConvergenceWorkbench: () => ConvergenceWorkbench,
    NAVIGATION_ACTION_IDS: () => NAVIGATION_ACTION_IDS,
    QUERY_LANGUAGE_VERSION: () => QUERY_LANGUAGE_VERSION,
    VERSION: () => VERSION,
    canReadCommunityResource: () => canReadCommunityResource,
    createActionRegistry: () => createActionRegistry,
    createCommunityClient: () => createCommunityClient,
    createConvergenceFixture: () => createConvergenceFixture,
    createHttpCommunityClient: () => createHttpCommunityClient,
    createMessageGraph: () => createMessageGraph,
    createProjection: () => createProjection,
    hasCommunityPermission: () => hasCommunityPermission,
    matchesNormalizedQuery: () => matchesNormalizedQuery,
    migrateNormalizedQuery: () => migrateNormalizedQuery,
    normalizeQuery: () => normalizeQuery,
    objectUrl: () => objectUrl,
    parseObjectUrl: () => parseObjectUrl,
    threadRelations: () => threadRelations,
    validateObjectRef: () => validateObjectRef,
    validateProjectionId: () => validateProjectionId
  });

  // packages/Epoch.Community.Core/src/authorization.ts
  function hasCommunityPermission(authorization, permission) {
    return authorization.actorId !== void 0 && authorization.permissions?.includes(permission) === true;
  }
  function canReadCommunityResource(target, authorization = {}) {
    const actorId = authorization.actorId;
    if (target.kind === "dm") {
      if (actorId === void 0) return false;
      return target.participantIds?.includes(actorId) === true || authorization.readableDmIds?.includes(target.resourceId) === true;
    }
    switch (target.visibility) {
      case "public":
        return true;
      case "shared":
        return actorId !== void 0 && (actorId === target.ownerId || target.participantIds?.includes(actorId) === true);
      case "private":
        return actorId !== void 0 && actorId === target.ownerId;
      default:
        return false;
    }
  }

  // packages/Epoch.Community.Core/src/navigation.ts
  var NAVIGATION_ACTION_IDS = [
    "nav.next",
    "nav.previous",
    "nav.first",
    "nav.last",
    "nav.enter",
    "nav.ascend",
    "nav.expand",
    "nav.collapse",
    "thread.parent",
    "thread.root",
    "thread.firstChild",
    "thread.nextSibling",
    "thread.previousSibling",
    "thread.nextUnread",
    "history.back",
    "history.forward",
    "history.previousLocation",
    "view.open",
    "view.filter",
    "view.save",
    "view.delete",
    "jump.best",
    "jump.interactive",
    "detail.open",
    "detail.close",
    "compose.open",
    "cancel.topLayer"
  ];

  // packages/Epoch.Community.Core/src/actions.ts
  var labels = {
    "nav.next": "Next",
    "nav.previous": "Previous",
    "nav.first": "First",
    "nav.last": "Last",
    "nav.enter": "Enter",
    "nav.ascend": "Ascend",
    "nav.expand": "Expand",
    "nav.collapse": "Collapse",
    "thread.parent": "Reply parent",
    "thread.root": "Thread root",
    "thread.firstChild": "First reply",
    "thread.nextSibling": "Next sibling",
    "thread.previousSibling": "Previous sibling",
    "thread.nextUnread": "Next unread",
    "history.back": "Back",
    "history.forward": "Forward",
    "history.previousLocation": "Previous location",
    "view.open": "Open view",
    "view.filter": "Filter view",
    "view.save": "Save view",
    "view.delete": "Delete view",
    "jump.best": "Jump",
    "jump.interactive": "Choose destination",
    "detail.open": "Open detail",
    "detail.close": "Close detail",
    "compose.open": "Compose",
    "cancel.topLayer": "Cancel top layer"
  };
  var BUILT_IN_ACTIONS = NAVIGATION_ACTION_IDS.map((actionId) => Object.freeze({
    actionId,
    label: labels[actionId],
    description: labels[actionId],
    contexts: ["global"],
    sideEffect: actionId === "view.delete" ? "shared" : "local",
    ...actionId === "view.delete" ? { permission: "community.view.delete" } : {},
    ...actionId === "jump.best" ? { commandAliases: ["z"], slashAliases: ["/jump"] } : {},
    ...actionId === "jump.interactive" ? { commandAliases: ["zi"], mcp: { toolName: "board_jump", inputSchema: { type: "object" } } } : {}
  }));
  function createActionRegistry(definitions, executors) {
    const definitionsById = new Map(definitions.map((definition) => [definition.actionId, definition]));
    if (definitionsById.size !== definitions.length) throw new Error("Action registry contains duplicate action IDs");
    let lastEvent;
    const event = (actionId, context, outcome) => {
      lastEvent = {
        actionId,
        origin: context.origin,
        ...context.projectionId === void 0 ? {} : { projectionId: context.projectionId },
        ...context.objectId === void 0 ? {} : { objectId: context.objectId },
        outcome
      };
    };
    const executeAction = async (actionId, input, context) => {
      const definition = definitionsById.get(actionId);
      if (definition === void 0) throw new Error(`Unknown community action: ${actionId}`);
      if (definition.permission !== void 0 && !context.permissions.includes(definition.permission)) {
        event(definition.actionId, context, "denied");
        throw new Error(`Action permission denied: ${definition.permission}`);
      }
      const execute = executors[definition.actionId];
      if (execute === void 0) {
        event(definition.actionId, context, "invalid");
        throw new Error(`Community action is unavailable: ${definition.actionId}`);
      }
      try {
        const result = await execute(input, context);
        event(definition.actionId, context, "success");
        return result;
      } catch (error) {
        event(definition.actionId, context, "failed");
        throw error;
      }
    };
    const actions = definitions.map((definition) => Object.freeze({
      ...definition,
      execute: (input, context) => executeAction(definition.actionId, input, context)
    }));
    const actionsById = new Map(actions.map((action) => [action.actionId, action]));
    return {
      actions,
      resolve: (actionId) => actionsById.get(actionId),
      execute: executeAction,
      lastActionEvent: () => lastEvent === void 0 ? void 0 : { ...lastEvent }
    };
  }

  // packages/Epoch.Community.Core/src/convergence.ts
  function createConvergenceFixture(options) {
    const ids = splitList(options.changes);
    const dependencyMap = /* @__PURE__ */ new Map();
    for (const relation of splitList(options.dependencies ?? "")) {
      const [child, parent] = relation.split(">");
      if (child !== void 0 && parent !== void 0) dependencyMap.set(child, [...dependencyMap.get(child) ?? [], parent]);
    }
    const changes = ids.map((changeId) => createChange(changeId, dependencyMap.get(changeId) ?? [], options.multiHead && changeId === ids[0]));
    const gates = options.gates ? changes.flatMap((change, index) => [
      { changeId: change.changeId, gateId: `${change.changeId}-tests`, label: "Tests", state: "passing", revisionId: change.currentRevisionIds[0] },
      { changeId: change.changeId, gateId: `${change.changeId}-review`, label: "Review", state: index === 1 ? "stale" : "passing", revisionId: index === 1 ? `rev-${change.changeId}-0` : change.currentRevisionIds[0] },
      { changeId: change.changeId, gateId: `${change.changeId}-security`, label: "Security", state: index === 2 ? "missing" : "passing", revisionId: change.currentRevisionIds[0] }
    ]) : options.staleApproval ? [{ changeId: ids[0] ?? "change", gateId: "approval", label: "Approval", state: "stale", revisionId: `rev-${ids[0] ?? "change"}-0` }] : [];
    const agent = options.agent ? {
      principalId: "agent-1",
      principalKeyStatus: "active",
      sponsorId: "maintainer-1",
      grantStatus: "active",
      budget: { allocated: 100, reserved: 0, consumed: 0, released: 0, expired: 0 }
    } : void 0;
    return {
      snapshotDigest: `snapshot:${ids.join("+") || "empty"}`,
      changes,
      gates,
      conflicts: options.conflict ? [{ conflictId: "conflict-1", path: "shared.ts", base: "object-base", left: "object-left", right: "object-right", state: "unresolved" }] : [],
      selectedChangeId: ids[0] ?? "",
      ...options.ambiguousPath === void 0 ? {} : { ambiguousPath: options.ambiguousPath },
      ...agent === void 0 ? {} : { agent },
      ...options.offline ? { replica: { online: false, promisedObjectIds: ["object-1"], hydratedObjectIds: [], integrity: "verified", copyMode: options.copyMode ?? "copy-on-write", executionIsolation: "none" } } : {},
      ...options.forge ? { forge: { jjChangeId: "jj-change-1", mirrorState: "lagging", fidelity: { preserved: ["change.identity", "revision.identity", "dependencies"], losses: ["review.threading"] } } } : {},
      ...options.archive ? { archive: { swhid: "swh:1:rev:0123456789abcdef0123456789abcdef01234567", publicRelease: true } } : {}
    };
  }
  var _state, _ConvergenceWorkbench_instances, change_fn, agent_fn;
  var ConvergenceWorkbench = class {
    constructor(snapshot) {
      __privateAdd(this, _ConvergenceWorkbench_instances);
      __privateAdd(this, _state);
      __privateSet(this, _state, cloneState(snapshot));
    }
    snapshot() {
      return cloneState(__privateGet(this, _state));
    }
    reconstructDigest() {
      return __privateGet(this, _state).snapshotDigest;
    }
    splitChange(changeId, partIds, fileBoundaries) {
      const index = __privateGet(this, _state).changes.findIndex((change) => change.changeId === changeId);
      if (index < 0) return { ok: false, explanation: `Unknown change ${changeId}; change graph unchanged.` };
      const duplicateBoundary = new Set(fileBoundaries).size !== fileBoundaries.length;
      if (partIds.length < 2 || partIds.length !== fileBoundaries.length || duplicateBoundary || fileBoundaries.includes(__privateGet(this, _state).ambiguousPath ?? "")) {
        return { ok: false, explanation: `${__privateGet(this, _state).ambiguousPath ?? "edit"} contains an ambiguous hunk; define a human boundary before splitting. Change graph unchanged.` };
      }
      if (new Set(partIds).size !== partIds.length || partIds.some((id) => __privateGet(this, _state).changes.some((change) => change.changeId === id && change.changeId !== changeId))) {
        return { ok: false, explanation: "Split identities must be unique; change graph unchanged." };
      }
      const original = __privateGet(this, _state).changes[index];
      if (original === void 0) throw new Error(`Invariant: missing change ${changeId}`);
      const parts = partIds.map((partId, partIndex) => createChange(partId, partIndex === 0 ? original.dependsOn : [partIds[partIndex - 1] ?? original.changeId], false, [fileBoundaries[partIndex] ?? "unknown"]));
      const lastPart = parts.at(-1)?.changeId ?? changeId;
      __privateGet(this, _state).changes = __privateGet(this, _state).changes.flatMap((change) => change.changeId === changeId ? parts : [{ ...change, dependsOn: change.dependsOn.map((dependency) => dependency === changeId ? lastPart : dependency) }]);
      __privateGet(this, _state).selectedChangeId = parts[0]?.changeId ?? __privateGet(this, _state).selectedChangeId;
      return { ok: true, explanation: `Split ${changeId} at explicit file boundaries; reconstructed snapshot remains ${__privateGet(this, _state).snapshotDigest}.` };
    }
    revisionHistory(changeId) {
      const change = __privateMethod(this, _ConvergenceWorkbench_instances, change_fn).call(this, changeId);
      return { heads: [...change.currentRevisionIds], revisions: change.revisions.map((revision) => ({ ...revision })) };
    }
    planPartialMerge(changeId) {
      __privateMethod(this, _ConvergenceWorkbench_instances, change_fn).call(this, changeId);
      const includedSet = /* @__PURE__ */ new Set();
      const visit = (id) => {
        if (includedSet.has(id)) return;
        for (const dependency of __privateMethod(this, _ConvergenceWorkbench_instances, change_fn).call(this, id).dependsOn) visit(dependency);
        includedSet.add(id);
      };
      visit(changeId);
      const included = __privateGet(this, _state).changes.filter((change) => includedSet.has(change.changeId)).map((change) => change.changeId);
      const excluded = __privateGet(this, _state).changes.filter((change) => !includedSet.has(change.changeId)).map((change) => change.changeId);
      return {
        targetChangeId: changeId,
        included,
        excluded,
        explanation: `Dependency-closed preview includes ${included.join(", ")}; ${excluded.length === 0 ? "no dependent changes remain" : `excludes dependent ${excluded.join(", ")}`}. Confirm to merge.`,
        confirmationRequired: true
      };
    }
    squash(plan, authority) {
      requireMutation(authority, "maintainer.merge", "squash merge");
      const sources = plan.included.map((id) => __privateMethod(this, _ConvergenceWorkbench_instances, change_fn).call(this, id));
      const changeId = `squash-${sources.map((change) => change.changeId).join("-")}`;
      const sourceRevisions = sources.flatMap((change) => change.currentRevisionIds);
      return {
        ...createChange(changeId, [], false, sources.flatMap((change) => change.files)),
        sourceChanges: sources.map((change) => change.changeId),
        sourceRevisions
      };
    }
    mergeAuthority(changeId) {
      const change = __privateMethod(this, _ConvergenceWorkbench_instances, change_fn).call(this, changeId);
      const stale = __privateGet(this, _state).gates.find((gate) => gate.changeId === changeId && gate.state === "stale");
      if (stale !== void 0) return { allowed: false, explanation: `STALE approval targets ${stale.revisionId ?? "an older revision"}; current revision is ${change.currentRevisionIds.join(", ")}. Re-review before merge.` };
      const blockers = __privateGet(this, _state).gates.filter((gate) => gate.changeId === changeId && gate.state !== "passing");
      return blockers.length === 0 ? { allowed: true, explanation: "Current gates pass; confirmation is still required." } : { allowed: false, explanation: `Blocked by ${blockers.map((gate) => `${gate.label}: ${gate.state}`).join(", ")}.` };
    }
    resolveConflict(conflictId, input) {
      const index = __privateGet(this, _state).conflicts.findIndex((conflict) => conflict.conflictId === conflictId);
      const current = __privateGet(this, _state).conflicts[index];
      if (current === void 0) throw new Error(`Unknown conflict: ${conflictId}`);
      if (input.strategy === "deterministic") return { ...current };
      if (input.strategy === "ai-proposal") {
        const next = { ...current, aiProposalState: "untrusted-proposal" };
        __privateGet(this, _state).conflicts[index] = next;
        return { ...next, trust: "untrusted-proposal" };
      }
      requireMutation({ authority: input.authority, confirmed: input.confirmed === true }, "maintainer.resolve", "resolve conflict");
      const resolved = { ...current, state: "resolved", acceptedBy: "human" };
      __privateGet(this, _state).conflicts[index] = resolved;
      return resolved;
    }
    hydrate(objectId) {
      const replica = __privateGet(this, _state).replica;
      if (replica === void 0 || !replica.promisedObjectIds.includes(objectId)) throw new Error(`Object ${objectId} is not promised by this replica.`);
      __privateGet(this, _state).replica = { ...replica, online: true, hydratedObjectIds: [.../* @__PURE__ */ new Set([...replica.hydratedObjectIds, objectId])] };
      return { availability: "available", integrity: replica.integrity, copyMode: replica.copyMode, executionIsolation: replica.executionIsolation };
    }
    synchronizeMirror() {
      const forge = __privateGet(this, _state).forge;
      if (forge === void 0) throw new Error("No forge mirror configured.");
      __privateGet(this, _state).forge = { ...forge, mirrorState: "current" };
      return { jjChangeId: forge.jjChangeId, fidelity: forge.fidelity, exportPayload: JSON.stringify({ changeId: forge.jjChangeId, revision: __privateGet(this, _state).changes[0]?.currentRevisionIds[0], fidelity: forge.fidelity }) };
    }
    reserveAgentBudget(amount) {
      const agent = __privateMethod(this, _ConvergenceWorkbench_instances, agent_fn).call(this);
      if (!Number.isFinite(amount) || amount <= 0 || amount > agent.budget.allocated - agent.budget.consumed - agent.budget.reserved - agent.budget.expired) throw new Error("Budget reservation exceeds remaining allocation.");
      __privateGet(this, _state).agent = { ...agent, budget: { ...agent.budget, reserved: agent.budget.reserved + amount } };
      return { ...__privateMethod(this, _ConvergenceWorkbench_instances, agent_fn).call(this).budget };
    }
    consumeAgentBudget(amount) {
      const agent = __privateMethod(this, _ConvergenceWorkbench_instances, agent_fn).call(this);
      if (!Number.isFinite(amount) || amount <= 0 || amount > agent.budget.reserved) throw new Error("Budget consumption requires a matching reservation.");
      __privateGet(this, _state).agent = { ...agent, budget: { ...agent.budget, reserved: agent.budget.reserved - amount, consumed: agent.budget.consumed + amount } };
      return { ...__privateMethod(this, _ConvergenceWorkbench_instances, agent_fn).call(this).budget };
    }
    revokeAgentGrant() {
      const agent = __privateMethod(this, _ConvergenceWorkbench_instances, agent_fn).call(this);
      __privateGet(this, _state).agent = { ...agent, grantStatus: "revoked" };
    }
    authorizeAgentWork() {
      const agent = __privateMethod(this, _ConvergenceWorkbench_instances, agent_fn).call(this);
      const allowed = agent.principalKeyStatus === "active" && agent.grantStatus === "active" && agent.budget.allocated > agent.budget.consumed + agent.budget.expired;
      return { allowed, explanation: allowed ? `${agent.principalId} sponsored by ${agent.sponsorId}: active grant and budget available.` : `${agent.principalId} sponsored by ${agent.sponsorId}: ${agent.grantStatus} grant; budget cannot authorize new work.` };
    }
    archiveRelease(input) {
      if (input.visibility === "private") return { status: "denied-private", explanation: "Private content and raw sessions are never submitted to a public archive." };
      requireMutation(input, "release.archive", "public archive");
      if (__privateGet(this, _state).archive === void 0) throw new Error("Release has no archival identity.");
      return { status: "remote-confirmed", swhid: __privateGet(this, _state).archive.swhid, explanation: "Remote archive confirmed the public release." };
    }
  };
  _state = new WeakMap();
  _ConvergenceWorkbench_instances = new WeakSet();
  change_fn = function(changeId) {
    const change = __privateGet(this, _state).changes.find((candidate) => candidate.changeId === changeId);
    if (change === void 0) throw new Error(`Unknown change: ${changeId}`);
    return change;
  };
  agent_fn = function() {
    if (__privateGet(this, _state).agent === void 0) throw new Error("No agent authority configured.");
    return __privateGet(this, _state).agent;
  };
  function createChange(changeId, dependsOn, multiHead = false, files = [`${changeId}.ts`]) {
    const base = { revisionId: `rev-${changeId}-0`, changeId, current: false, supersededBy: `rev-${changeId}-a` };
    const a = { revisionId: `rev-${changeId}-a`, changeId, current: true, supersedes: base.revisionId };
    const b = { revisionId: `rev-${changeId}-b`, changeId, current: true, supersedes: base.revisionId };
    return { changeId, label: changeId, dependsOn: [...dependsOn], revisions: multiHead ? [base, a, b] : [{ ...a, revisionId: `rev-${changeId}-1`, supersedes: void 0 }], currentRevisionIds: multiHead ? [a.revisionId, b.revisionId] : [`rev-${changeId}-1`], files: [...files] };
  }
  function cloneState(snapshot) {
    return {
      snapshotDigest: snapshot.snapshotDigest,
      changes: snapshot.changes.map((change) => ({ ...change, dependsOn: [...change.dependsOn], revisions: change.revisions.map((revision) => ({ ...revision })), currentRevisionIds: [...change.currentRevisionIds], files: [...change.files], ...change.sourceChanges === void 0 ? {} : { sourceChanges: [...change.sourceChanges] }, ...change.sourceRevisions === void 0 ? {} : { sourceRevisions: [...change.sourceRevisions] } })),
      gates: snapshot.gates.map((gate) => ({ ...gate })),
      conflicts: snapshot.conflicts.map((conflict) => ({ ...conflict })),
      selectedChangeId: snapshot.selectedChangeId,
      ...snapshot.ambiguousPath === void 0 ? {} : { ambiguousPath: snapshot.ambiguousPath },
      ...snapshot.agent === void 0 ? {} : { agent: { ...snapshot.agent, budget: { ...snapshot.agent.budget } } },
      ...snapshot.replica === void 0 ? {} : { replica: { ...snapshot.replica, promisedObjectIds: [...snapshot.replica.promisedObjectIds], hydratedObjectIds: [...snapshot.replica.hydratedObjectIds] } },
      ...snapshot.forge === void 0 ? {} : { forge: { ...snapshot.forge, fidelity: { preserved: [...snapshot.forge.fidelity.preserved], losses: [...snapshot.forge.fidelity.losses] } } },
      ...snapshot.archive === void 0 ? {} : { archive: { ...snapshot.archive } }
    };
  }
  function splitList(value) {
    return value.split(",").map((entry) => entry.trim()).filter(Boolean);
  }
  function requireMutation(input, authority, action) {
    if (input.authority !== authority) throw new Error(`${action} requires authority ${authority}.`);
    if (!input.confirmed) throw new Error(`${action} requires explicit confirmation.`);
  }

  // packages/Epoch.Community.Core/src/identity.ts
  var VERSION = "community-core/1";
  var kinds = /* @__PURE__ */ new Set([
    "message",
    "thread",
    "channel",
    "dm",
    "notification",
    "saved-view",
    "project",
    "issue",
    "change",
    "member",
    "agent",
    "artifact",
    "tombstone"
  ]);
  var opaqueId = /^[A-Za-z0-9][A-Za-z0-9._~-]{0,127}$/u;
  var MAX_REVISION_LENGTH = 512;
  function validateRevision(value) {
    if (typeof value !== "string" || value.length === 0 || value.length > MAX_REVISION_LENGTH) {
      throw new Error("Community object revision must be a non-empty bounded value");
    }
    return value;
  }
  function validateObjectRef(value) {
    if (typeof value !== "object" || value === null) throw new Error("Community object reference must be an object");
    const ref = value;
    if (typeof ref.objectId !== "string" || !opaqueId.test(ref.objectId)) {
      throw new Error("Community objectId must be an opaque URL-safe identifier");
    }
    if (typeof ref.kind !== "string" || !kinds.has(ref.kind)) {
      throw new Error(`Unsupported community object kind: ${String(ref.kind)}`);
    }
    if (ref.atUri !== void 0 && (typeof ref.atUri !== "string" || !/^at:\/\/[^/]+\/[^/]+\/[^/]+$/u.test(ref.atUri))) {
      throw new Error("Federated object identity must be a valid AT URI");
    }
    if (ref.revision !== void 0) validateRevision(ref.revision);
    return Object.freeze({
      objectId: ref.objectId,
      kind: ref.kind,
      ...ref.atUri === void 0 ? {} : { atUri: ref.atUri },
      ...ref.revision === void 0 ? {} : { revision: ref.revision }
    });
  }
  function validateProjectionId(projectionId) {
    if (typeof projectionId !== "string" || !opaqueId.test(projectionId)) {
      throw new Error("Projection ID must be an opaque URL-safe identifier");
    }
    return projectionId;
  }
  function objectUrl(ref, options = {}) {
    const valid = validateObjectRef(ref);
    const params = new URLSearchParams();
    if (options.projectionId === void 0) {
      params.set("object", valid.objectId);
    } else {
      params.set("projection", validateProjectionId(options.projectionId));
      params.set("focus", valid.objectId);
    }
    const revision = options.revision;
    if (revision !== void 0) {
      params.set("revision", validateRevision(revision));
    }
    const relative = `/board.html?${params.toString()}`;
    return options.origin === void 0 ? relative : new URL(relative, options.origin).toString();
  }
  function parseObjectUrl(input) {
    let url;
    try {
      url = new URL(input, "https://epoch.invalid");
    } catch {
      return void 0;
    }
    if (url.pathname !== "/board.html") return void 0;
    const projectionId = url.searchParams.get("projection") ?? void 0;
    const objectId = url.searchParams.get(projectionId === void 0 ? "object" : "focus") ?? void 0;
    if (objectId === void 0 || !opaqueId.test(objectId)) return void 0;
    if (projectionId !== void 0 && !opaqueId.test(projectionId)) return void 0;
    const revision = url.searchParams.get("revision") ?? void 0;
    if (revision !== void 0) {
      try {
        validateRevision(revision);
      } catch {
        return void 0;
      }
    }
    return {
      objectId,
      ...projectionId === void 0 ? {} : { projectionId },
      ...revision === void 0 ? {} : { revision }
    };
  }

  // packages/Epoch.Community.Core/src/graph.ts
  function createMessageGraph(input) {
    const messages = /* @__PURE__ */ new Map();
    for (const message of input) {
      const ref = validateObjectRef(message.ref);
      validateObjectRef(message.context);
      validateObjectRef(message.threadRoot);
      if (message.inReplyTo !== void 0) validateObjectRef(message.inReplyTo);
      if (messages.has(ref.objectId)) throw new Error(`Duplicate community object ID: ${ref.objectId}`);
      messages.set(ref.objectId, message);
    }
    for (const message of input) {
      const parent = message.inReplyTo;
      if (parent !== void 0 && !messages.has(parent.objectId)) {
        messages.set(parent.objectId, missingParent(parent, message));
      }
    }
    const children = /* @__PURE__ */ new Map();
    for (const message of input) {
      if (message.inReplyTo === void 0) continue;
      const values = children.get(message.inReplyTo.objectId) ?? [];
      values.push(message.ref);
      children.set(message.inReplyTo.objectId, values);
    }
    const idOf = (ref) => typeof ref === "string" ? ref : ref.objectId;
    const messageOf = (ref) => messages.get(idOf(ref));
    const parentOf = (ref) => {
      const parent = messageOf(ref)?.inReplyTo;
      return parent === void 0 ? void 0 : messages.get(parent.objectId)?.ref ?? parent;
    };
    const childrenOf = (ref) => [...children.get(idOf(ref)) ?? []];
    const descendantsOf = (ref) => {
      const result = [];
      const visit = (objectId, ancestors) => {
        if (ancestors.has(objectId)) throw new Error(`Community reply graph contains a cycle at ${objectId}`);
        const nextAncestors = new Set(ancestors).add(objectId);
        for (const child of children.get(objectId) ?? []) {
          result.push(child);
          visit(child.objectId, nextAncestors);
        }
      };
      visit(idOf(ref), /* @__PURE__ */ new Set());
      return result;
    };
    const rootOf = (ref) => {
      const start = messageOf(ref);
      if (start === void 0) throw new Error(`Community object not found: ${idOf(ref)}`);
      let current = start;
      const visited = /* @__PURE__ */ new Set();
      while (current.inReplyTo !== void 0) {
        if (visited.has(current.ref.objectId)) throw new Error(`Community reply graph contains a cycle at ${current.ref.objectId}`);
        visited.add(current.ref.objectId);
        const parent = messages.get(current.inReplyTo.objectId);
        if (parent === void 0) return current.inReplyTo;
        current = parent;
      }
      return current.ref;
    };
    const sibling = (ref, delta) => {
      const parent = parentOf(ref);
      if (parent === void 0) return void 0;
      const siblings = children.get(parent.objectId) ?? [];
      const index = siblings.findIndex((candidate) => candidate.objectId === idOf(ref));
      return index < 0 ? void 0 : siblings[index + delta];
    };
    const nextUnreadOf = (ref) => {
      const root = rootOf(ref);
      const ordered = [root, ...descendantsOf(root)];
      const current = ordered.findIndex((candidate) => candidate.objectId === idOf(ref));
      return ordered.slice(current + 1).find((candidate) => messages.get(candidate.objectId)?.state !== "read");
    };
    return Object.freeze({
      messageOf,
      parentOf,
      rootOf,
      childrenOf,
      descendantsOf,
      firstChildOf: (ref) => childrenOf(ref)[0],
      nextSiblingOf: (ref) => sibling(ref, 1),
      previousSiblingOf: (ref) => sibling(ref, -1),
      nextUnreadOf
    });
  }
  function threadRelations(graph, ref) {
    return {
      object: ref,
      parent: graph.parentOf(ref),
      root: graph.rootOf(ref),
      children: graph.childrenOf(ref),
      descendants: graph.descendantsOf(ref),
      previousSibling: graph.previousSiblingOf(ref),
      nextSibling: graph.nextSiblingOf(ref),
      nextUnread: graph.nextUnreadOf(ref)
    };
  }
  function missingParent(parent, child) {
    return {
      ref: { ...parent, kind: "tombstone" },
      context: child.context,
      authorId: "unavailable",
      body: "",
      publishedAt: child.publishedAt,
      threadRoot: parent,
      relations: [],
      state: "unavailable",
      aliases: [],
      tombstone: { formerKind: parent.kind, reason: "missing" }
    };
  }

  // packages/Epoch.Community.Core/src/projection.ts
  function createProjection(spec, objects) {
    validateProjectionId(spec.projectionId);
    validateObjectRef(spec.root);
    if (!Number.isInteger(spec.version) || spec.version < 1) throw new Error("Projection version must be a positive integer");
    const byId = /* @__PURE__ */ new Map();
    for (const object of objects) {
      validateObjectRef(object.ref);
      if (byId.has(object.ref.objectId)) throw new Error(`Projection contains duplicate object: ${object.ref.objectId}`);
      if (!object.aliasPath || object.aliasPath.includes("..")) throw new Error("Projection aliases must be explicit safe paths");
      byId.set(object.ref.objectId, object);
    }
    const siblingGroups = /* @__PURE__ */ new Map();
    const siblingGroupKey = (object) => {
      const parentId = object.parentRef?.objectId;
      return parentId !== void 0 && byId.has(parentId) ? parentId : spec.root.objectId;
    };
    for (const object of objects) {
      const key = siblingGroupKey(object);
      const siblings = siblingGroups.get(key) ?? [];
      siblings.push(object);
      siblingGroups.set(key, siblings);
    }
    const depthOf = (object, seen = /* @__PURE__ */ new Set()) => {
      const parentId = object.parentRef?.objectId;
      if (parentId === void 0 || parentId === spec.root.objectId) return 1;
      if (seen.has(object.ref.objectId)) throw new Error(`Projection contains a parent cycle at ${object.ref.objectId}`);
      const parent = byId.get(parentId);
      return parent === void 0 ? 1 : depthOf(parent, new Set(seen).add(object.ref.objectId)) + 1;
    };
    return {
      spec: Object.freeze({ ...spec }),
      entries: objects.map((object) => {
        const key = siblingGroupKey(object);
        const siblings = siblingGroups.get(key) ?? [];
        const capabilities = object.ref.kind === "tombstone" ? { read: true, enter: true, expand: object.capabilities.expand, composeUnder: false, execute: false } : { ...object.capabilities };
        return Object.freeze({
          ...object,
          capabilities,
          depth: depthOf(object),
          position: siblings.findIndex((candidate) => candidate.ref.objectId === object.ref.objectId) + 1,
          setSize: siblings.length
        });
      })
    };
  }

  // packages/Epoch.Community.Core/src/query.ts
  var QUERY_LANGUAGE_VERSION = 1;
  var COMMUNITY_QUERY_FIELDS = [
    "who",
    "author",
    "handle",
    "state",
    "channel",
    "dm",
    "project",
    "space",
    "subject",
    "body",
    "text",
    "q",
    "id",
    "re",
    "parent",
    "kind",
    "has",
    "react",
    "reaction",
    "score",
    "sort"
  ];
  function normalizeQuery(input, options = {}) {
    if (options.version !== void 0 && options.version > QUERY_LANGUAGE_VERSION) {
      return invalid(`Query language version ${options.version} is newer than supported version ${QUERY_LANGUAGE_VERSION}`);
    }
    let tokens;
    try {
      tokens = tokenize(input);
    } catch (error) {
      return invalid(error instanceof Error ? error.message : String(error));
    }
    let position = 0;
    const peek = () => tokens[position] ?? { type: "EOF", value: "" };
    const take = (type) => {
      if (peek().type !== type) return void 0;
      const token = peek();
      position += 1;
      return token;
    };
    const expect = (type) => {
      const token = take(type);
      if (token === void 0) throw new Error(`expected ${type} near ${peek().value || "end"}`);
      return token;
    };
    const parsePrimary = () => {
      if (take("LPAREN") !== void 0) {
        const node = parseOr();
        expect("RPAREN");
        return node;
      }
      const word = take("WORD");
      if (word !== void 0) {
        if (take("COLON") === void 0) return { op: "term", value: word.value, phrase: false };
        const field = validateField(word.value);
        if (take("LPAREN") !== void 0) {
          const node = parseOr();
          expect("RPAREN");
          return { op: "field_group", field, node };
        }
        const phrase2 = take("PHRASE");
        if (phrase2 !== void 0) return { op: "field", field, value: phrase2.value, phrase: true };
        const value = take("WORD");
        return { op: "field", field, value: value?.value ?? "*", phrase: false };
      }
      const phrase = take("PHRASE");
      if (phrase !== void 0) return { op: "term", value: phrase.value, phrase: true };
      throw new Error(`unexpected token: ${peek().value || peek().type}`);
    };
    const parseNot = () => take("NOT") === void 0 ? parsePrimary() : { op: "not", node: parseNot() };
    const parseAnd = () => {
      let left = parseNot();
      while (!["OR", "RPAREN", "EOF"].includes(peek().type)) {
        take("AND");
        if (["RPAREN", "EOF"].includes(peek().type)) break;
        left = { op: "and", left, right: parseNot() };
      }
      return left;
    };
    function parseOr() {
      let left = parseAnd();
      while (take("OR") !== void 0) left = { op: "or", left, right: parseAnd() };
      return left;
    }
    if (peek().type === "EOF") return { ast: null, canonical: "", sort: null, version: QUERY_LANGUAGE_VERSION };
    try {
      const parsed = parseOr();
      if (peek().type !== "EOF") throw new Error(`unexpected trailing input: ${peek().value}`);
      const extracted = extractSort(parsed);
      const canonicalFilter = extracted.ast === null ? "" : serialize(extracted.ast);
      const canonical = [canonicalFilter, extracted.sort === null ? "" : `sort:${extracted.sort}`].filter(Boolean).join(" ");
      return { ast: extracted.ast, canonical, sort: extracted.sort, version: QUERY_LANGUAGE_VERSION };
    } catch (error) {
      return invalid(error instanceof Error ? error.message : String(error));
    }
  }
  function migrateNormalizedQuery(saved) {
    const version = saved.queryLanguageVersion ?? saved.version ?? 0;
    if (version > QUERY_LANGUAGE_VERSION) return invalid(`Saved query version ${version} is not supported; update Epoch to open this view`);
    const source = saved.canonical ?? saved.query;
    if (source !== void 0) return normalizeQuery(source, { version });
    if (saved.ast !== void 0) {
      const serialized = saved.ast === null ? "" : serialize(saved.ast);
      return normalizeQuery([serialized, saved.sort === null || saved.sort === void 0 ? "" : `sort:${saved.sort}`].filter(Boolean).join(" "), { version });
    }
    return invalid("Saved query has no canonical query or normalized AST");
  }
  function matchesNormalizedQuery(message, query) {
    if (query.error !== void 0) return false;
    const field = (name, value) => {
      const needle = value.toLowerCase();
      const contains = (candidate) => (candidate ?? "").toLowerCase().includes(needle === "*" ? "" : needle);
      switch (name) {
        case "who":
        case "author":
        case "handle":
          return contains(message.authorId);
        case "state":
          return contains(message.state);
        case "subject":
          return contains(message.title);
        case "body":
          return contains(message.body);
        case "text":
        case "q":
          return contains(`${message.title ?? ""} ${message.body}`);
        case "id":
          return contains(message.ref.objectId);
        case "re":
        case "parent":
          return contains(message.inReplyTo?.objectId);
        case "channel":
        case "dm":
        case "project":
        case "space":
          return contains(message.context.objectId);
        case "kind":
          return message.ref.kind === needle;
        case "has":
          if (needle === "subject") return Boolean(message.title);
          if (["re", "reply", "parent"].includes(needle)) return message.inReplyTo !== void 0;
          if (["reaction", "reactions"].includes(needle)) {
            return Object.values(message.reactions ?? {}).some((count) => Number.isFinite(count) && count > 0);
          }
          return message.relations.some((relation) => relation.type === needle);
        case "react":
        case "reaction":
          return (message.reactions?.[value] ?? 0) > 0;
        case "score":
          return false;
        case "sort":
          return true;
      }
    };
    const evaluate = (node, inheritedField) => {
      switch (node.op) {
        case "and":
          return evaluate(node.left, inheritedField) && evaluate(node.right, inheritedField);
        case "or":
          return evaluate(node.left, inheritedField) || evaluate(node.right, inheritedField);
        case "not":
          return !evaluate(node.node, inheritedField);
        case "field_group":
          return evaluate(node.node, node.field);
        case "field":
          return field(inheritedField ?? node.field, node.value);
        case "term":
          return inheritedField === void 0 ? `${message.title ?? ""} ${message.body} ${message.authorId} ${message.context.objectId}`.toLowerCase().includes(node.value.toLowerCase()) : field(inheritedField, node.value);
      }
    };
    return query.ast === null || evaluate(query.ast);
  }
  function tokenize(input) {
    const tokens = [];
    let index = 0;
    const push = (type, value) => {
      tokens.push({ type, value });
    };
    while (index < input.length) {
      const character = input[index] ?? "";
      if (/\s/u.test(character)) {
        index += 1;
        continue;
      }
      if (character === "(") {
        push("LPAREN", character);
        index += 1;
        continue;
      }
      if (character === ")") {
        push("RPAREN", character);
        index += 1;
        continue;
      }
      if (character === ":") {
        push("COLON", character);
        index += 1;
        continue;
      }
      if (character === "-" && !/\s|\)/u.test(input[index + 1] ?? "")) {
        push("NOT", character);
        index += 1;
        continue;
      }
      if (character === '"') {
        const start2 = index;
        index += 1;
        while (index < input.length && input[index] !== '"') {
          if (input[index] === "\\") index += 1;
          index += 1;
        }
        if (input[index] !== '"') throw new Error("unterminated quoted phrase");
        index += 1;
        let phrase;
        try {
          phrase = JSON.parse(input.slice(start2, index));
        } catch {
          throw new Error("invalid quoted phrase escape");
        }
        if (typeof phrase !== "string") throw new Error("invalid quoted phrase");
        push("PHRASE", phrase);
        continue;
      }
      const start = index;
      while (index < input.length && !/[\s():"]/u.test(input[index] ?? "")) index += 1;
      const raw = input.slice(start, index);
      const upper = raw.toUpperCase();
      push(upper === "AND" || upper === "OR" || upper === "NOT" ? upper : "WORD", raw);
    }
    push("EOF", "");
    return tokens;
  }
  function validateField(value) {
    const field = value.toLowerCase();
    if (COMMUNITY_QUERY_FIELDS.includes(field)) return field;
    const suggestion = [...COMMUNITY_QUERY_FIELDS].sort((left, right) => distance(field, left) - distance(field, right))[0];
    throw new Error(`unknown query field "${field}"; valid fields include ${suggestion}`);
  }
  function extractSort(node) {
    if (node.op === "field" && node.field === "sort") {
      if (!["hot", "new", "top", "best"].includes(node.value.toLowerCase())) throw new Error(`unsupported sort: ${node.value}`);
      return { ast: null, sort: node.value.toLowerCase() };
    }
    if (node.op === "and" || node.op === "or") {
      const left = extractSort(node.left);
      const right = extractSort(node.right);
      const sort = left.sort ?? right.sort;
      if (left.ast === null) return { ast: right.ast, sort };
      if (right.ast === null) return { ast: left.ast, sort };
      return { ast: { op: node.op, left: left.ast, right: right.ast }, sort };
    }
    if (node.op === "not") {
      const inner = extractSort(node.node);
      return { ast: inner.ast === null ? null : { op: "not", node: inner.ast }, sort: inner.sort };
    }
    if (node.op === "field_group") {
      const inner = extractSort(node.node);
      return { ast: inner.ast === null ? null : { op: "field_group", field: node.field, node: inner.ast }, sort: inner.sort };
    }
    return { ast: node, sort: null };
  }
  function serialize(node, parentPrecedence = 0) {
    const precedence = node.op === "or" ? 1 : node.op === "and" ? 2 : node.op === "not" ? 3 : 4;
    let value;
    switch (node.op) {
      case "or":
      case "and":
        value = `${serialize(node.left, precedence)} ${node.op.toUpperCase()} ${serialize(node.right, precedence)}`;
        break;
      case "not":
        value = `NOT ${serialize(node.node, precedence)}`;
        break;
      case "field_group":
        value = `${node.field}:(${serialize(node.node)})`;
        break;
      case "field":
        value = `${node.field}:${node.phrase ? JSON.stringify(node.value) : node.value}`;
        break;
      case "term":
        value = node.phrase ? JSON.stringify(node.value) : node.value;
        break;
    }
    return precedence < parentPrecedence ? `(${value})` : value;
  }
  function invalid(error) {
    return { ast: null, canonical: "", sort: null, version: QUERY_LANGUAGE_VERSION, error };
  }
  function distance(left, right) {
    const row = [...Array(right.length + 1).keys()];
    for (let i = 1; i <= left.length; i += 1) {
      let previous = row[0] ?? 0;
      row[0] = i;
      for (let j = 1; j <= right.length; j += 1) {
        const old = row[j] ?? 0;
        row[j] = Math.min((row[j] ?? 0) + 1, (row[j - 1] ?? 0) + 1, previous + (left[i - 1] === right[j - 1] ? 0 : 1));
        previous = old;
      }
    }
    return row[right.length] ?? Number.MAX_SAFE_INTEGER;
  }

  // packages/Epoch.Community.Core/src/index.ts
  function createCommunityClient(transport) {
    return {
      listWorkflows: () => transport.listWorkflows(),
      listRepositories: () => transport.listRepositories(),
      getRepository: (slug) => transport.getRepository(slug),
      createRepository: (input) => transport.createRepository(input),
      openIssue: (slug, input) => transport.openIssue(slug, input),
      commentOnIssue: (slug, issueId, input) => transport.commentOnIssue(slug, issueId, input),
      proposeChange: (slug, input) => transport.proposeChange(slug, input),
      reviewChange: (slug, proposalId, input) => transport.reviewChange(slug, proposalId, input),
      getObject: (objectId, authorization) => transport.getObject(objectId, authorization),
      updateObjectState: (objectId, state, authorization) => transport.updateObjectState(objectId, state, authorization),
      listThreadRelations: (objectId, authorization) => transport.listThreadRelations(objectId, authorization),
      listProjections: (authorization) => transport.listProjections(authorization),
      getProjection: (projectionId, authorization) => transport.getProjection(projectionId, authorization),
      saveProjection: (input, authorization) => transport.saveProjection(input, authorization),
      deleteProjection: (projectionId, authorization) => transport.deleteProjection(projectionId, authorization)
    };
  }
  function createHttpCommunityClient(options) {
    const request = createCommunityHttpRequester(options);
    return createCommunityClient({
      listWorkflows: () => request("GET", "/workflows"),
      listRepositories: () => request("GET", "/repositories"),
      getRepository: (slug) => request("GET", repositoryPath(slug)),
      createRepository: (input) => request("POST", "/repositories", input),
      openIssue: (slug, input) => request("POST", `${repositoryPath(slug)}/issues`, input),
      commentOnIssue: (slug, issueId, input) => request("POST", `${repositoryPath(slug)}/issues/${encodeURIComponent(issueId)}/comments`, input),
      proposeChange: (slug, input) => request("POST", `${repositoryPath(slug)}/changes`, input),
      reviewChange: (slug, proposalId, input) => request("POST", `${repositoryPath(slug)}/changes/${encodeURIComponent(proposalId)}/reviews`, input),
      getObject: (objectId) => request("GET", `/objects/${encodeURIComponent(objectId)}`),
      updateObjectState: (objectId, state) => request("PATCH", `/objects/${encodeURIComponent(objectId)}/state`, { state }),
      listThreadRelations: (objectId) => request("GET", `/objects/${encodeURIComponent(objectId)}/thread`),
      listProjections: () => request("GET", "/projections"),
      getProjection: (projectionId) => request("GET", `/projections/${encodeURIComponent(projectionId)}`),
      saveProjection: (input) => request("POST", "/projections", input),
      deleteProjection: (projectionId) => request("DELETE", `/projections/${encodeURIComponent(projectionId)}`)
    });
  }
  function createCommunityHttpRequester(options) {
    const fetcher = options.fetch ?? globalThis.fetch;
    const baseUrl = options.baseUrl.endsWith("/") ? options.baseUrl.slice(0, -1) : options.baseUrl;
    return async function request(method, path, body) {
      const response = await fetcher(`${baseUrl}${path}`, {
        method,
        headers: {
          Accept: "application/json",
          ...body === void 0 ? {} : { "Content-Type": "application/json" }
        },
        body: body === void 0 ? void 0 : JSON.stringify(body)
      });
      const text = await response.text();
      const parsed = text.length === 0 ? void 0 : JSON.parse(text);
      if (!response.ok) {
        const message = errorMessage(parsed) ?? response.statusText;
        throw new Error(`Community API request failed (${response.status}): ${message}`);
      }
      return parsed;
    };
  }
  function repositoryPath(slug) {
    return `/repositories/${encodeURIComponent(slug)}`;
  }
  function errorMessage(value) {
    if (typeof value === "object" && value !== null && "error" in value) {
      const error = value.error;
      return typeof error === "string" ? error : void 0;
    }
    return void 0;
  }
  return __toCommonJS(index_exports);
})();
window.NB_CORE = NB_CORE;
