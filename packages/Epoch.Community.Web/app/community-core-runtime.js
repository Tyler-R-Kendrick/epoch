/* Generated from packages/Epoch.Community.Core/src/index.ts. Run npm run community-web:app:build. */
/* global URLSearchParams */
"use strict";
var CW_CORE = (() => {
  var __defProp = Object.defineProperty;
  var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
  var __getOwnPropNames = Object.getOwnPropertyNames;
  var __hasOwnProp = Object.prototype.hasOwnProperty;
  var __typeError = (msg) => {
    throw TypeError(msg);
  };
  var __defNormalProp = (obj, key, value) => key in obj ? __defProp(obj, key, { enumerable: true, configurable: true, writable: true, value }) : obj[key] = value;
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
  var __publicField = (obj, key, value) => __defNormalProp(obj, typeof key !== "symbol" ? key + "" : key, value);
  var __accessCheck = (obj, member, msg) => member.has(obj) || __typeError("Cannot " + msg);
  var __privateGet = (obj, member, getter) => (__accessCheck(obj, member, "read from private field"), getter ? getter.call(obj) : member.get(obj));
  var __privateAdd = (obj, member, value) => member.has(obj) ? __typeError("Cannot add the same private member more than once") : member instanceof WeakSet ? member.add(obj) : member.set(obj, value);
  var __privateSet = (obj, member, value, setter) => (__accessCheck(obj, member, "write to private field"), setter ? setter.call(obj, value) : member.set(obj, value), value);
  var __privateMethod = (obj, member, method) => (__accessCheck(obj, member, "access private method"), method);

  // packages/Epoch.Community.Core/src/index.ts
  var index_exports = {};
  __export(index_exports, {
    BUILT_IN_ACTIONS: () => BUILT_IN_ACTIONS,
    COMMUNITY_ACTION_IDS: () => COMMUNITY_ACTION_IDS,
    COMMUNITY_QUERY_FIELDS: () => COMMUNITY_QUERY_FIELDS,
    CORE_COMMUNITY_FIELDS: () => CORE_COMMUNITY_FIELDS,
    CommunityError: () => CommunityError,
    ConvergenceWorkbench: () => ConvergenceWorkbench,
    EntityProjectionRuntime: () => EntityProjectionRuntime,
    InMemoryProjectionRuntime: () => InMemoryProjectionRuntime,
    NAVIGATION_ACTION_IDS: () => NAVIGATION_ACTION_IDS,
    PROJECTION_DEFINITION_API_VERSION: () => PROJECTION_DEFINITION_API_VERSION,
    ProjectionCompileError: () => ProjectionCompileError,
    ProjectionDeltaController: () => ProjectionDeltaController,
    QUERY_FIELD_REGISTRY_VERSION: () => QUERY_FIELD_REGISTRY_VERSION,
    QUERY_LANGUAGE_VERSION: () => QUERY_LANGUAGE_VERSION,
    ReferenceSearchBackend: () => ReferenceSearchBackend,
    SearchService: () => SearchService,
    VERSION: () => VERSION,
    abortSource: () => abortSource,
    applyCommunityChangeSetAtomically: () => applyCommunityChangeSetAtomically,
    applyProjectionDelta: () => applyProjectionDelta,
    assignProjectionCollisionNames: () => assignProjectionCollisionNames,
    authorizationFingerprint: () => authorizationFingerprint,
    boundedSourcePageSize: () => boundedSourcePageSize,
    builtinDefaultProjection: () => builtinDefaultProjection,
    canReadCommunityResource: () => canReadCommunityResource,
    canonicalExpressionJson: () => canonicalExpressionJson,
    combineCompleteness: () => combineCompleteness,
    communityEntityToMessage: () => communityEntityToMessage,
    communityErrorHttpStatus: () => communityErrorHttpStatus,
    communityMessageToEntity: () => communityMessageToEntity,
    compileProjectionDefinition: () => compileProjectionDefinition,
    createActionRegistry: () => createActionRegistry,
    createCommunityClient: () => createCommunityClient,
    createCommunityFieldRegistry: () => createCommunityFieldRegistry,
    createCommunityRuntimeContext: () => createCommunityRuntimeContext,
    createConvergenceFixture: () => createConvergenceFixture,
    createHttpCommunityClient: () => createHttpCommunityClient,
    createKeysetCursorCodec: () => createKeysetCursorCodec,
    createMessageGraph: () => createMessageGraph,
    createNamespaceRuntime: () => createNamespaceRuntime,
    createProjectionOccurrenceId: () => createProjectionOccurrenceId,
    createSearchPlan: () => createSearchPlan,
    createSearchServiceFromSources: () => createSearchServiceFromSources,
    createSearchSnapshot: () => createSearchSnapshot,
    decodeSourceKeysetCursor: () => decodeSourceKeysetCursor,
    evaluateSearchExpression: () => evaluateSearchExpression,
    formatProjectionDefinition: () => formatProjectionDefinition,
    hasCommunityPermission: () => hasCommunityPermission,
    isCommunityError: () => isCommunityError,
    isCommunityFieldValue: () => isCommunityFieldValue,
    matchesNormalizedQuery: () => matchesNormalizedQuery,
    migrateNormalizedQuery: () => migrateNormalizedQuery,
    normalizeProjectionSegment: () => normalizeProjectionSegment,
    normalizeQuery: () => normalizeQuery,
    normalizeVirtualPath: () => normalizeVirtualPath,
    objectUrl: () => objectUrl,
    parseCommunityQuery: () => parseCommunityQuery,
    parseObjectUrl: () => parseObjectUrl,
    renderSegmentTemplate: () => renderSegmentTemplate,
    searchFieldValues: () => searchFieldValues,
    semanticExpression: () => semanticExpression,
    sourceKeysetCursor: () => sourceKeysetCursor,
    stableQueryHash: () => stableQueryHash,
    threadRelations: () => threadRelations,
    validateCommunityEntity: () => validateCommunityEntity,
    validateIsoDateTime: () => validateIsoDateTime,
    validateObjectRef: () => validateObjectRef,
    validateProjectionId: () => validateProjectionId,
    validateSourceCapabilities: () => validateSourceCapabilities,
    validateVfsEntry: () => validateVfsEntry
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
    "jump.best",
    "jump.interactive",
    "detail.open",
    "detail.close",
    "compose.open",
    "cancel.topLayer"
  ];

  // packages/Epoch.Community.Core/src/actions.ts
  var COMMUNITY_ACTION_IDS = [
    ...NAVIGATION_ACTION_IDS,
    "search.open",
    "search.run",
    "search.cancel",
    "search.explain",
    "search.saveAsProjection",
    "search.history",
    "search.favorite",
    "search.localFilter",
    "projection.list",
    "projection.open",
    "projection.create",
    "projection.clone",
    "projection.edit",
    "projection.preview",
    "projection.diff",
    "projection.validate",
    "projection.save",
    "projection.delete",
    "projection.explain",
    "namespace.mount",
    "namespace.unmount",
    "namespace.list",
    "namespace.reset",
    "namespace.use",
    "namespace.explain",
    "snapshot.freeze",
    "snapshot.refresh",
    "snapshot.applyQueued"
  ];
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
    "jump.best": "Jump",
    "jump.interactive": "Choose destination",
    "detail.open": "Open detail",
    "detail.close": "Close detail",
    "compose.open": "Compose",
    "cancel.topLayer": "Cancel top layer",
    "search.open": "Open search",
    "search.run": "Run search",
    "search.cancel": "Cancel search",
    "search.explain": "Explain search",
    "search.saveAsProjection": "Save search as projection",
    "search.history": "Search history",
    "search.favorite": "Favorite search",
    "search.localFilter": "Filter current results",
    "projection.list": "List projections",
    "projection.open": "Open projection",
    "projection.create": "Create projection",
    "projection.clone": "Clone projection",
    "projection.edit": "Edit projection",
    "projection.preview": "Preview projection",
    "projection.diff": "Compare projection",
    "projection.validate": "Validate projection",
    "projection.save": "Save projection",
    "projection.delete": "Delete projection",
    "projection.explain": "Explain projection",
    "namespace.mount": "Mount projection",
    "namespace.unmount": "Unmount projection",
    "namespace.list": "List namespace mounts",
    "namespace.reset": "Reset namespace",
    "namespace.use": "Use namespace",
    "namespace.explain": "Explain namespace path",
    "snapshot.freeze": "Freeze snapshot",
    "snapshot.refresh": "Refresh snapshot",
    "snapshot.applyQueued": "Apply queued updates"
  };
  var MUTATING_ACTIONS = /* @__PURE__ */ new Set([
    "search.saveAsProjection",
    "projection.create",
    "projection.clone",
    "projection.save",
    "projection.delete",
    "namespace.mount",
    "namespace.unmount",
    "namespace.reset"
  ]);
  var BUILT_IN_ACTIONS = COMMUNITY_ACTION_IDS.map((actionId) => Object.freeze({
    actionId,
    label: labels[actionId],
    description: labels[actionId],
    contexts: actionId.startsWith("search.") || actionId.startsWith("projection.") ? ["workbench"] : ["global"],
    sideEffect: MUTATING_ACTIONS.has(actionId) ? "shared" : "local",
    ...actionId.startsWith("projection.") && MUTATING_ACTIONS.has(actionId) ? { permission: "community.projection.write" } : {},
    ...actionId.startsWith("namespace.") && MUTATING_ACTIONS.has(actionId) ? { permission: "community.namespace.write" } : {},
    ...actionId === "jump.best" ? { commandAliases: ["z"], slashAliases: ["/jump"] } : {},
    ...actionId === "jump.interactive" ? { commandAliases: ["zi"], mcp: { toolName: "board_jump", inputSchema: { type: "object" } } } : {},
    ...actionId === "search.open" ? { commandAliases: ["search"], slashAliases: ["/search"], keyBindings: [{ key: "Ctrl+F", contexts: ["global"] }], voiceAliases: ["open search"] } : {},
    ...actionId === "search.localFilter" ? { commandAliases: ["filter"], keyBindings: [{ key: "/", contexts: ["navigator", "feed", "workbench"] }] } : {},
    ...actionId === "projection.list" ? { commandAliases: ["projections"] } : {},
    ...actionId === "namespace.list" ? { commandAliases: ["mounts"] } : {}
  }));
  function createActionRegistry(definitions, executors) {
    const definitionsById = new Map(definitions.map((definition) => [definition.actionId, definition]));
    if (definitionsById.size !== definitions.length) throw new Error("Action registry contains duplicate action IDs");
    validateBindings(definitions);
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
  function validateBindings(definitions) {
    const bindings = /* @__PURE__ */ new Map();
    for (const definition of definitions) {
      for (const [surface, values2] of [["command", definition.commandAliases], ["slash", definition.slashAliases], ["voice", definition.voiceAliases]]) {
        for (const value of values2 ?? []) bind(`${surface}\0${value.normalize("NFC").toLocaleLowerCase("en-US")}`, definition.actionId);
      }
      if (definition.mcp !== void 0) bind(`mcp\0${definition.mcp.toolName}`, definition.actionId);
      for (const binding2 of definition.keyBindings ?? []) {
        for (const context of binding2.contexts ?? definition.contexts) bind(`key\0${binding2.key}\0${context}`, definition.actionId);
      }
    }
    function bind(key, actionId) {
      const previous = bindings.get(key);
      if (previous !== void 0 && previous !== actionId) throw new Error(`Action registry binding collision: ${previous} and ${actionId}`);
      bindings.set(key, actionId);
    }
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

  // packages/Epoch.Community.Core/src/errors.ts
  var STATUS_BY_CODE = Object.freeze({
    QUERY_SYNTAX: 400,
    QUERY_UNKNOWN_FIELD: 400,
    QUERY_INVALID_OPERATOR: 400,
    QUERY_COST_LIMIT: 413,
    QUERY_UNSUPPORTED_SOURCE: 422,
    CURSOR_INVALID: 400,
    CURSOR_STALE: 409,
    PROJECTION_INVALID: 400,
    PROJECTION_CYCLE: 400,
    PROJECTION_COLLISION: 409,
    NAMESPACE_MOUNT_CONFLICT: 409,
    NAMESPACE_RECOVERY_PROTECTED: 409,
    SOURCE_PARTIAL: 424,
    SOURCE_UNAVAILABLE: 503,
    INDEX_STALE: 409,
    INDEX_LOCKED: 423,
    INDEX_QUOTA: 507,
    AUTHORIZATION_DENIED: 403,
    PERSISTENCE_MIGRATION: 409,
    INVALID_ENTITY: 400,
    INVALID_FIELD: 400,
    CRYPTO_UNAVAILABLE: 503,
    INTERNAL: 500
  });
  var CommunityError = class extends Error {
    constructor(code, message2, details, options) {
      super(message2, options);
      __publicField(this, "code");
      __publicField(this, "httpStatus");
      __publicField(this, "details");
      this.name = "CommunityError";
      this.code = code;
      this.httpStatus = communityErrorHttpStatus(code);
      this.details = details === void 0 ? void 0 : Object.freeze({ ...details });
    }
    toJSON() {
      return {
        code: this.code,
        message: this.message,
        ...this.details === void 0 ? {} : { details: this.details }
      };
    }
  };
  function communityErrorHttpStatus(code) {
    return STATUS_BY_CODE[code];
  }
  function isCommunityError(error) {
    return error instanceof CommunityError || typeof error === "object" && error !== null && error.name === "CommunityError" && typeof error.message === "string" && isCommunityErrorCode(error.code) && error.httpStatus === communityErrorHttpStatus(
      error.code
    );
  }
  function isCommunityErrorCode(value) {
    return typeof value === "string" && Object.hasOwn(STATUS_BY_CODE, value);
  }

  // packages/Epoch.Community.Core/src/identity.ts
  var VERSION = "community-core/1";
  var kinds = /* @__PURE__ */ new Set([
    "message",
    "thread",
    "channel",
    "dm",
    "notification",
    "projection",
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

  // packages/Epoch.Community.Core/src/entity.ts
  var FIELD_NAME = /^[A-Za-z][A-Za-z0-9-]*(?:\.[A-Za-z][A-Za-z0-9-]*)*$/u;
  var RELATION_TYPES = /* @__PURE__ */ new Set([
    "reply",
    "quote",
    "mention",
    "provenance",
    "promotion",
    "replacement",
    "moderation",
    "attachment",
    "backlink"
  ]);
  function communityMessageToEntity(message2, options) {
    const value = cloneMessage(message2);
    const participantIds = canonicalStrings(options.participantIds ?? []);
    const fields = {
      objectId: value.ref.objectId,
      kind: value.ref.kind,
      author: value.authorId,
      state: value.state,
      contextId: value.context.objectId,
      ...value.context.kind === "channel" ? { channelId: value.context.objectId } : {},
      ...value.context.kind === "dm" ? { dmId: value.context.objectId } : {},
      ...value.context.kind === "project" ? { projectId: value.context.objectId } : {},
      createdAt: value.publishedAt,
      updatedAt: value.updatedAt ?? value.publishedAt,
      visibility: options.visibility,
      aliases: [...value.aliases],
      participantIds,
      ...value.title === void 0 ? {} : { title: value.title },
      ...value.inReplyTo === void 0 ? {} : { parentId: value.inReplyTo.objectId },
      ...value.reactions === void 0 ? {} : {
        reactions: Object.keys(value.reactions).filter((token) => (value.reactions?.[token] ?? 0) > 0).sort(),
        score: Object.values(value.reactions).reduce((sum, count) => sum + Math.max(0, count), 0)
      },
      has: [.../* @__PURE__ */ new Set([
        ...value.title === void 0 ? [] : ["subject", "title"],
        ...value.inReplyTo === void 0 ? [] : ["re", "reply", "parent"],
        ...Object.values(value.reactions ?? {}).some((count) => count > 0) ? ["reaction", "reactions"] : [],
        ...value.relations.map((relation) => relation.type)
      ])]
    };
    const entity = {
      ref: value.ref,
      fields: Object.freeze(fields),
      searchableText: Object.freeze({
        title: value.title ?? "",
        body: value.body,
        author: value.authorId
      }),
      relations: value.relations,
      visibility: options.visibility,
      ...options.ownerId === void 0 ? {} : { ownerId: options.ownerId },
      participantIds,
      createdAt: value.publishedAt,
      updatedAt: value.updatedAt ?? value.publishedAt,
      provenance: cloneProvenance(options.provenance),
      ...value.tombstone === void 0 ? {} : { tombstone: value.tombstone },
      domain: Object.freeze({ kind: "message", value })
    };
    return validateCommunityEntity(entity);
  }
  function communityEntityToMessage(entity) {
    const validated = validateCommunityEntity(entity);
    if (validated.domain?.kind !== "message") {
      throw new CommunityError("INVALID_ENTITY", "Community entity is not a lossless message projection");
    }
    return cloneMessage(validated.domain.value);
  }
  function validateCommunityEntity(value) {
    if (typeof value !== "object" || value === null) invalid("Community entity must be an object");
    const input = value;
    const ref = validateObjectRef(input.ref);
    const fields = validateFields(input.fields);
    const searchableText = validateSearchableText(input.searchableText);
    const relations = validateRelations(input.relations);
    if (!["private", "shared", "public"].includes(input.visibility)) {
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
      visibility: input.visibility,
      ...input.ownerId === void 0 ? {} : { ownerId: boundedString(input.ownerId, "ownerId") },
      participantIds,
      createdAt,
      updatedAt,
      provenance,
      ...input.tombstone === void 0 ? {} : { tombstone: cloneTombstone(input.tombstone) },
      ...domain === void 0 ? {} : { domain }
    });
  }
  function isCommunityFieldValue(value) {
    return isScalar(value) || Array.isArray(value) && value.length <= 4096 && value.every(isScalar);
  }
  function validateIsoDateTime(value, label = "datetime") {
    if (typeof value !== "string" || value.length > 128 || !/(?:Z|[+-]\d{2}:\d{2})$/u.test(value)) {
      invalid(`${label} must be an ISO 8601 datetime with an explicit timezone`);
    }
    const timestamp = Date.parse(value);
    if (!Number.isFinite(timestamp)) invalid(`${label} must be a valid datetime`);
    return new Date(timestamp).toISOString();
  }
  function validateFields(value) {
    if (typeof value !== "object" || value === null || Array.isArray(value)) invalid("Community entity fields must be an object");
    const output = /* @__PURE__ */ Object.create(null);
    for (const [name, field2] of Object.entries(value)) {
      if (!FIELD_NAME.test(name)) invalid(`Invalid community field name: ${name}`);
      if (!isCommunityFieldValue(field2)) invalid(`Community field value is invalid: ${name}`);
      output[name] = Array.isArray(field2) ? Object.freeze([...field2]) : field2;
    }
    return Object.freeze(output);
  }
  function validateSearchableText(value) {
    if (typeof value !== "object" || value === null || Array.isArray(value)) invalid("searchableText must be an object");
    const output = /* @__PURE__ */ Object.create(null);
    for (const [name, text] of Object.entries(value)) {
      if (!FIELD_NAME.test(name) || typeof text !== "string" || text.length > 1e7) invalid(`Invalid searchable text field: ${name}`);
      output[name] = text;
    }
    return Object.freeze(output);
  }
  function validateRelations(value) {
    if (!Array.isArray(value) || value.length > 1e5) invalid("Community entity relations must be a bounded array");
    return Object.freeze(value.map((candidate) => {
      if (typeof candidate !== "object" || candidate === null) invalid("Community relation must be an object");
      const relation = candidate;
      if (!RELATION_TYPES.has(relation.type)) invalid(`Unsupported community relation: ${String(relation.type)}`);
      return Object.freeze({
        type: relation.type,
        source: validateObjectRef(relation.source),
        target: validateObjectRef(relation.target)
      });
    }));
  }
  function cloneProvenance(value) {
    if (typeof value !== "object" || value === null) invalid("Community provenance must be an object");
    const provenance = value;
    const uri = provenance.uri;
    if (uri !== void 0) validateProvenanceUri(uri);
    return Object.freeze({
      sourceId: boundedString(provenance.sourceId, "provenance.sourceId"),
      nativeId: boundedString(provenance.nativeId, "provenance.nativeId"),
      observedAt: validateIsoDateTime(provenance.observedAt, "provenance.observedAt"),
      ...provenance.checkpoint === void 0 ? {} : { checkpoint: boundedString(provenance.checkpoint, "provenance.checkpoint", 4096) },
      ...uri === void 0 ? {} : { uri },
      ...provenance.revision === void 0 ? {} : { revision: boundedString(provenance.revision, "provenance.revision", 4096) }
    });
  }
  function validateProvenanceUri(value) {
    if (typeof value !== "string" || value.length === 0 || value.length > 4096 || [...value].some((character) => {
      const code = character.codePointAt(0) ?? 0;
      return code <= 32 || code === 127;
    })) {
      invalid("Community provenance URI is invalid");
    }
    if (/^at:\/\/[^/]+\/[^/]+\/[^/]+$/u.test(value)) return value;
    try {
      const uri = new URL(value);
      if (!["https:", "http:"].includes(uri.protocol) || uri.username || uri.password) invalid("Community provenance URI is invalid");
    } catch {
      invalid("Community provenance URI is invalid");
    }
    return value;
  }
  function cloneMessage(message2) {
    const publishedAt = validateIsoDateTime(message2.publishedAt, "message.publishedAt");
    const updatedAt = message2.updatedAt === void 0 ? void 0 : validateIsoDateTime(message2.updatedAt, "message.updatedAt");
    const relations = validateRelations(message2.relations);
    const reactions = message2.reactions === void 0 ? void 0 : Object.freeze({ ...message2.reactions });
    if (reactions !== void 0 && Object.entries(reactions).some(([token, count]) => token.length === 0 || !Number.isFinite(count) || count < 0)) {
      invalid("Message reactions must contain finite non-negative counts");
    }
    return Object.freeze({
      ref: validateObjectRef(message2.ref),
      context: validateObjectRef(message2.context),
      authorId: boundedString(message2.authorId, "message.authorId"),
      ...message2.title === void 0 ? {} : { title: message2.title },
      body: message2.body,
      publishedAt,
      ...updatedAt === void 0 ? {} : { updatedAt },
      ...message2.inReplyTo === void 0 ? {} : { inReplyTo: validateObjectRef(message2.inReplyTo) },
      threadRoot: validateObjectRef(message2.threadRoot),
      relations,
      ...reactions === void 0 ? {} : { reactions },
      state: boundedString(message2.state, "message.state"),
      aliases: canonicalStrings(message2.aliases, "message.aliases", false),
      ...message2.tombstone === void 0 ? {} : { tombstone: cloneTombstone(message2.tombstone) }
    });
  }
  function validateDomain(value, ref, createdAt, updatedAt) {
    if (value === void 0) return void 0;
    if (typeof value !== "object" || value === null || value.kind !== "message") {
      invalid("Unsupported community entity domain projection");
    }
    const message2 = cloneMessage(value.value);
    if (message2.ref.objectId !== ref.objectId || message2.publishedAt !== createdAt || (message2.updatedAt ?? message2.publishedAt) !== updatedAt) {
      invalid("Message projection does not match its canonical entity");
    }
    return Object.freeze({ kind: "message", value: message2 });
  }
  function cloneTombstone(value) {
    if (typeof value !== "object" || value === null) invalid("Community tombstone must be an object");
    const tombstone = value;
    if (!["deleted", "moderated", "missing", "unavailable", "unauthorized"].includes(tombstone.reason)) {
      invalid("Community tombstone reason is invalid");
    }
    const formerKind = validateObjectRef({ objectId: "former-kind", kind: tombstone.formerKind }).kind;
    return Object.freeze({
      formerKind,
      reason: tombstone.reason,
      ...tombstone.deletedAt === void 0 ? {} : { deletedAt: validateIsoDateTime(tombstone.deletedAt, "tombstone.deletedAt") },
      ...tombstone.replacement === void 0 ? {} : { replacement: validateObjectRef(tombstone.replacement) }
    });
  }
  function canonicalStrings(value, label = "values", sort = true) {
    if (!Array.isArray(value) || value.length > 4096 || value.some((item) => typeof item !== "string" || item.length > 4096)) {
      invalid(`${label} must be a bounded string array`);
    }
    const output = [...value];
    return Object.freeze(sort ? [...new Set(output)].sort() : output);
  }
  function boundedString(value, label, limit = 512) {
    if (typeof value !== "string" || value.length === 0 || value.length > limit || value.includes(String.fromCharCode(0))) {
      invalid(`${label} must be a bounded string`);
    }
    return value.normalize("NFC");
  }
  function isScalar(value) {
    return value === null || typeof value === "string" || typeof value === "boolean" || typeof value === "number" && Number.isFinite(value);
  }
  function invalid(message2) {
    throw new CommunityError("INVALID_ENTITY", message2);
  }

  // packages/Epoch.Community.Core/src/fields.ts
  var KINDS = [
    "message",
    "thread",
    "channel",
    "dm",
    "notification",
    "projection",
    "project",
    "issue",
    "change",
    "member",
    "agent",
    "artifact",
    "tombstone"
  ];
  var NAME = /^[A-Za-z][A-Za-z0-9-]*(?:\.[A-Za-z][A-Za-z0-9-]*)*$/u;
  var SOURCE_NAME = /^[A-Za-z][A-Za-z0-9-]*\.[A-Za-z][A-Za-z0-9.-]*$/u;
  var OBJECT_ID = /^[A-Za-z0-9][A-Za-z0-9._~-]{0,127}$/u;
  var ALL_OPERATORS = /* @__PURE__ */ new Set(["eq", "ne", "lt", "lte", "gt", "gte", "in", "exists", "term", "phrase", "prefix"]);
  var OPERATORS_BY_TYPE = Object.freeze({
    text: operatorSet("eq", "ne", "exists", "term", "phrase", "prefix"),
    keyword: operatorSet("eq", "ne", "in", "exists", "term", "prefix"),
    number: operatorSet("eq", "ne", "lt", "lte", "gt", "gte", "in", "exists"),
    boolean: operatorSet("eq", "ne", "exists"),
    datetime: operatorSet("eq", "ne", "lt", "lte", "gt", "gte", "in", "exists"),
    "object-id": operatorSet("eq", "ne", "in", "exists", "prefix"),
    uri: operatorSet("eq", "ne", "in", "exists", "prefix")
  });
  var CORE_COMMUNITY_FIELDS = Object.freeze([
    field("text", ["q"], "text", ["eq", "ne", "exists", "term", "phrase", "prefix"], { searchable: true, defaultTextField: true }),
    field("objectId", ["id"], "object-id", ["eq", "ne", "in", "exists", "prefix"], { sortable: true }),
    field("kind", [], "keyword", ["eq", "ne", "in", "exists", "term", "prefix"], { sortable: true, facetable: true, enumValues: KINDS }),
    field("title", ["subject"], "text", ["eq", "ne", "exists", "term", "phrase", "prefix"], { searchable: true, sortable: true, defaultTextField: true }),
    field("body", [], "text", ["exists", "term", "phrase", "prefix"], { searchable: true, defaultTextField: true }),
    field("author", ["who", "handle"], "keyword", ["eq", "ne", "in", "exists", "term", "prefix"], { searchable: true, sortable: true, facetable: true }),
    field("state", [], "keyword", ["eq", "ne", "in", "exists", "term", "prefix"], { searchable: true, sortable: true, facetable: true }),
    field("visibility", [], "keyword", ["eq", "ne", "in", "exists"], { sortable: true, facetable: true, enumValues: ["private", "shared", "public"] }),
    field("createdAt", ["publishedAt"], "datetime", ["eq", "ne", "lt", "lte", "gt", "gte", "in", "exists"], { sortable: true }),
    field("updatedAt", [], "datetime", ["eq", "ne", "lt", "lte", "gt", "gte", "in", "exists"], { sortable: true }),
    field("score", [], "number", ["eq", "ne", "lt", "lte", "gt", "gte", "in", "exists"], { sortable: true }),
    field("contextId", [], "object-id", ["eq", "ne", "in", "exists", "prefix"], { sortable: true }),
    field("channelId", ["channel"], "object-id", ["eq", "ne", "in", "exists", "prefix"], { facetable: true }),
    field("dmId", ["dm"], "object-id", ["eq", "ne", "in", "exists", "prefix"], { facetable: true, sensitive: true }),
    field("projectId", ["project"], "object-id", ["eq", "ne", "in", "exists", "prefix"], { facetable: true }),
    field("spaceId", ["space"], "object-id", ["eq", "ne", "in", "exists", "prefix"], { facetable: true }),
    field("parentId", ["re", "parent"], "object-id", ["eq", "ne", "in", "exists"], {}),
    field("has", [], "keyword", ["eq", "ne", "in", "exists", "term", "prefix"], { searchable: true }),
    field("owner", [], "keyword", ["eq", "ne", "in", "exists", "term", "prefix"], { searchable: true }),
    field("uri", [], "uri", ["eq", "ne", "in", "exists", "prefix"], {}),
    field("tombstone", [], "boolean", ["eq", "ne", "exists"], { facetable: true }),
    field("aliases", [], "keyword", ["eq", "ne", "in", "exists", "term", "prefix"], { searchable: true }),
    field("reactions", ["react", "reaction"], "keyword", ["eq", "ne", "in", "exists", "term", "prefix"], { facetable: true }),
    field("participantIds", [], "object-id", ["eq", "ne", "in", "exists"], { sensitive: true })
  ]);
  function createCommunityFieldRegistry(sourceDefinitions = [], version = 1) {
    if (!Number.isSafeInteger(version) || version < 1) throw new CommunityError("INVALID_FIELD", "Field registry version must be a positive integer");
    const definitions = [
      ...CORE_COMMUNITY_FIELDS.map((definition) => validateDefinition(definition, false)),
      ...sourceDefinitions.map((definition) => validateDefinition(definition, true))
    ];
    const byName = /* @__PURE__ */ new Map();
    const register = (key, definition) => {
      const normalized = key.toLocaleLowerCase("en-US");
      if (byName.has(normalized)) throw new CommunityError("INVALID_FIELD", `Duplicate community field or alias: ${key}`);
      byName.set(normalized, definition);
    };
    for (const definition of definitions) {
      register(definition.name, definition);
      for (const alias of definition.aliases) register(alias, definition);
    }
    const ordered = Object.freeze([...new Set(byName.values())].sort((left, right) => left.name.localeCompare(right.name, "en")));
    return Object.freeze({
      version,
      list: (authorization) => Object.freeze(ordered.filter((definition) => !definition.sensitive || hasSensitiveFieldPermission(authorization))),
      resolve: (name) => typeof name === "string" ? byName.get(name.toLocaleLowerCase("en-US")) : void 0,
      validateValue,
      suggest: (name, authorization = {}) => suggestions(
        name,
        ordered.filter((definition) => !definition.sensitive || hasSensitiveFieldPermission(authorization))
      )
    });
  }
  function field(name, aliases, type, operators, options) {
    return Object.freeze({
      name,
      aliases: Object.freeze([...aliases]),
      type,
      operators: Object.freeze([...operators]),
      searchable: options.searchable ?? false,
      sortable: options.sortable ?? false,
      facetable: options.facetable ?? false,
      sensitive: options.sensitive ?? false,
      description: `Canonical ${name} field.`,
      ...options.enumValues === void 0 ? {} : { enumValues: Object.freeze([...options.enumValues]) },
      ...options.defaultTextField === void 0 ? {} : { defaultTextField: options.defaultTextField }
    });
  }
  function validateDefinition(input, source) {
    if (typeof input !== "object" || input === null || !NAME.test(input.name)) throw new CommunityError("INVALID_FIELD", "Community field name is invalid");
    if (source && !SOURCE_NAME.test(input.name)) throw new CommunityError("INVALID_FIELD", "Source-contributed fields must use a namespaced name");
    if (!Array.isArray(input.aliases) || input.aliases.some((alias) => !NAME.test(alias))) throw new CommunityError("INVALID_FIELD", `Aliases for ${input.name} are invalid`);
    if (!Array.isArray(input.operators) || input.operators.length === 0 || input.operators.some((operator) => !ALL_OPERATORS.has(operator))) {
      throw new CommunityError("INVALID_FIELD", `Operators for ${input.name} are invalid`);
    }
    if (input.operators.some((operator) => !OPERATORS_BY_TYPE[input.type]?.has(operator))) {
      throw new CommunityError("INVALID_FIELD", `Operators for ${input.name} are incompatible with ${input.type}`);
    }
    if (input.description.length === 0 || input.description.length > 1024) throw new CommunityError("INVALID_FIELD", `Description for ${input.name} is invalid`);
    if (input.enumValues?.some((value) => typeof value !== "string" || value.length === 0 || value.length > 512) === true) {
      throw new CommunityError("INVALID_FIELD", `Enum values for ${input.name} are invalid`);
    }
    return Object.freeze({
      ...input,
      aliases: Object.freeze([...input.aliases]),
      operators: Object.freeze([...new Set(input.operators)]),
      ...input.enumValues === void 0 ? {} : { enumValues: Object.freeze([...new Set(input.enumValues)]) }
    });
  }
  function validateValue(fieldDefinition, value) {
    const values2 = Array.isArray(value) ? value : [value];
    if (values2.length > 4096) throw invalidValue(fieldDefinition, "contains too many values");
    const validated = values2.map((candidate) => validateScalar(fieldDefinition, candidate));
    return Object.freeze(Array.isArray(value) ? validated : validated[0]);
  }
  function validateScalar(fieldDefinition, value) {
    if (value === null) return null;
    let result;
    switch (fieldDefinition.type) {
      case "number":
        if (typeof value !== "number" || !Number.isFinite(value)) throw invalidValue(fieldDefinition, "must be a finite number");
        result = value;
        break;
      case "boolean":
        if (typeof value !== "boolean") throw invalidValue(fieldDefinition, "must be a boolean");
        result = value;
        break;
      case "datetime":
        try {
          result = validateIsoDateTime(value, fieldDefinition.name);
        } catch {
          throw invalidValue(fieldDefinition, "must be a datetime with an explicit timezone");
        }
        break;
      case "object-id":
        if (typeof value !== "string" || !OBJECT_ID.test(value)) throw invalidValue(fieldDefinition, "must be an opaque object ID");
        result = value;
        break;
      case "uri":
        if (typeof value !== "string") throw invalidValue(fieldDefinition, "must be a URI");
        try {
          new URL(value);
        } catch {
          throw invalidValue(fieldDefinition, "must be an absolute URI");
        }
        result = value;
        break;
      case "keyword":
      case "text":
        if (typeof value !== "string" || value.length > 1e6) throw invalidValue(fieldDefinition, "must be a bounded string");
        result = value.normalize("NFC");
        break;
    }
    if (fieldDefinition.enumValues !== void 0 && typeof result === "string" && !fieldDefinition.enumValues.includes(result)) {
      throw invalidValue(fieldDefinition, `must be one of ${fieldDefinition.enumValues.join(", ")}`);
    }
    return result;
  }
  function suggestions(input, definitions) {
    const needle = input.toLocaleLowerCase("en-US");
    return Object.freeze(definitions.map((definition) => ({ definition, distance: Math.min(...[definition.name, ...definition.aliases].map((candidate) => editDistance(needle, candidate.toLocaleLowerCase("en-US")))) })).sort((left, right) => left.distance - right.distance || left.definition.name.localeCompare(right.definition.name, "en")).slice(0, 3).map(({ definition }) => definition.name));
  }
  function editDistance(left, right) {
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
  function hasSensitiveFieldPermission(authorization) {
    return authorization.permissions?.includes("field:sensitive:read") === true;
  }
  function invalidValue(fieldDefinition, reason) {
    return new CommunityError("INVALID_FIELD", `${fieldDefinition.name} ${reason}`);
  }
  function operatorSet(...operators) {
    return new Set(operators);
  }

  // packages/Epoch.Community.Core/src/graph.ts
  function createMessageGraph(input) {
    const messages = /* @__PURE__ */ new Map();
    for (const message2 of input) {
      const ref = validateObjectRef(message2.ref);
      validateObjectRef(message2.context);
      validateObjectRef(message2.threadRoot);
      if (message2.inReplyTo !== void 0) validateObjectRef(message2.inReplyTo);
      if (messages.has(ref.objectId)) throw new Error(`Duplicate community object ID: ${ref.objectId}`);
      messages.set(ref.objectId, message2);
    }
    for (const message2 of input) {
      const parent = message2.inReplyTo;
      if (parent !== void 0 && !messages.has(parent.objectId)) {
        messages.set(parent.objectId, missingParent(parent, message2));
      }
    }
    const children = /* @__PURE__ */ new Map();
    for (const message2 of input) {
      if (message2.inReplyTo === void 0) continue;
      const values2 = children.get(message2.inReplyTo.objectId) ?? [];
      values2.push(message2.ref);
      children.set(message2.inReplyTo.objectId, values2);
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

  // packages/Epoch.Community.Core/src/query-evaluator.ts
  function evaluateSearchExpression(entity, expression, options = {}) {
    const matched = /* @__PURE__ */ new Set();
    const evaluate = (node) => {
      switch (node.kind) {
        case "all":
          return true;
        case "and":
          return node.terms.every(evaluate);
        case "or":
          return node.terms.some(evaluate);
        case "not":
          return !evaluate(node.term);
        case "exists":
          return values(entity, node.field).some((value) => value !== null);
        case "compare": {
          const candidates = values(entity, node.field);
          const result = compareCandidates(candidates, node.operator, node.value);
          if (result) matched.add(node.field);
          return result;
        }
        case "range": {
          const result = values(entity, node.field).some((value) => inRange(value, node));
          if (result) matched.add(node.field);
          return result;
        }
        case "text": {
          const fields = node.fields.length === 0 ? Object.keys(entity.searchableText) : node.fields;
          const result = fields.some((field2) => {
            const found = values(entity, field2).some((value) => typeof value === "string" && textMatches(value, node.value, node.mode));
            if (found) matched.add(field2);
            return found;
          });
          return result;
        }
        case "related": {
          const result = relationMatches(entity, node, options.resolveEntity, options.relationsFor);
          if (result) matched.add(`related.${node.relation}`);
          return result;
        }
      }
    };
    return Object.freeze({ matches: evaluate(expression), matchedFields: Object.freeze([...matched].sort()) });
  }
  function relationMatches(start, node, resolveEntity, relationsFor) {
    let frontier = [start];
    const visited = /* @__PURE__ */ new Set([start.ref.objectId]);
    for (let depth = 0; depth < node.maxDepth; depth += 1) {
      const next = [];
      for (const entity of frontier) for (const relation of relationsFor?.(entity.ref.objectId) ?? entity.relations) {
        if (relation.type !== node.relation) continue;
        const adjacent = node.direction === "out" && relation.source.objectId === entity.ref.objectId ? relation.target : node.direction === "in" && relation.target.objectId === entity.ref.objectId ? relation.source : void 0;
        if (adjacent === void 0) continue;
        if (adjacent.objectId === node.target.objectId) return true;
        const resolved = resolveEntity?.(adjacent.objectId);
        if (resolved !== void 0 && !visited.has(adjacent.objectId)) {
          visited.add(adjacent.objectId);
          next.push(resolved);
        }
      }
      frontier = next;
      if (frontier.length === 0) return false;
    }
    return false;
  }
  function searchFieldValues(entity, field2) {
    return values(entity, field2);
  }
  function values(entity, field2) {
    const special = {
      objectId: entity.ref.objectId,
      kind: entity.ref.kind,
      createdAt: entity.createdAt,
      updatedAt: entity.updatedAt,
      visibility: entity.visibility,
      owner: entity.ownerId,
      uri: entity.provenance.uri,
      tombstone: entity.tombstone !== void 0
    };
    const value = special[field2] ?? entity.fields[field2] ?? entity.searchableText[field2];
    return value === void 0 ? [] : Array.isArray(value) ? value : [value];
  }
  function compareCandidates(candidates, operator, expected) {
    const wanted = Array.isArray(expected) ? expected : [expected];
    if (operator === "ne") return candidates.every((candidate) => wanted.every((value) => compare(candidate, value) !== 0));
    if (operator === "in") return candidates.some((candidate) => wanted.some((value) => compare(candidate, value) === 0));
    return candidates.some((candidate) => wanted.some((value) => {
      const result = compare(candidate, value);
      return operator === "eq" ? result === 0 : operator === "lt" ? result < 0 : operator === "lte" ? result <= 0 : operator === "gt" ? result > 0 : result >= 0;
    }));
  }
  function compare(left, right) {
    if (left === right) return 0;
    if (left === null) return -1;
    if (right === null) return 1;
    if (typeof left !== typeof right) return Number.NaN;
    if (typeof left === "number" && typeof right === "number") return left - right;
    if (typeof left === "boolean" && typeof right === "boolean") return Number(left) - Number(right);
    return String(left).localeCompare(String(right), "en", { sensitivity: "variant" });
  }
  function inRange(value, range) {
    if (value === null) return false;
    const lower = range.lower === void 0 ? true : range.includeLower ? compare(value, range.lower) >= 0 : compare(value, range.lower) > 0;
    const upper = range.upper === void 0 ? true : range.includeUpper ? compare(value, range.upper) <= 0 : compare(value, range.upper) < 0;
    return lower && upper;
  }
  function textMatches(candidate, query, mode) {
    const normalizedCandidate = normalizeText(candidate);
    const normalizedQuery = normalizeText(query);
    if (mode === "phrase") return normalizedCandidate.includes(normalizedQuery);
    const words = tokenize(normalizedCandidate);
    return mode === "prefix" ? words.some((word) => word.startsWith(normalizedQuery)) : words.includes(normalizedQuery);
  }
  function normalizeText(value) {
    return value.normalize("NFKC").toLocaleLowerCase("en-US");
  }
  function tokenize(value) {
    return value.match(/[\p{L}\p{N}_+-]+/gu) ?? [];
  }

  // packages/Epoch.Community.Core/src/search-expression.ts
  function semanticExpression(expression) {
    if (expression === null) return null;
    switch (expression.kind) {
      case "all":
        return { kind: expression.kind };
      case "and":
      case "or":
        return { kind: expression.kind, terms: expression.terms.map(semanticExpression) };
      case "not":
        return { kind: expression.kind, term: semanticExpression(expression.term) };
      case "text":
        return { kind: expression.kind, fields: expression.fields, value: expression.value, mode: expression.mode };
      case "compare":
        return { kind: expression.kind, field: expression.field, operator: expression.operator, value: expression.value };
      case "range":
        return {
          kind: expression.kind,
          field: expression.field,
          ...expression.lower === void 0 ? {} : { lower: expression.lower },
          ...expression.upper === void 0 ? {} : { upper: expression.upper },
          includeLower: expression.includeLower,
          includeUpper: expression.includeUpper
        };
      case "exists":
        return { kind: expression.kind, field: expression.field };
      case "related":
        return {
          kind: expression.kind,
          relation: expression.relation,
          target: expression.target,
          direction: expression.direction,
          maxDepth: expression.maxDepth
        };
    }
  }
  function canonicalExpressionJson(expression) {
    return JSON.stringify(semanticExpression(expression));
  }
  function stableQueryHash(value) {
    let hash = 0xcbf29ce484222325n;
    for (const byte of new TextEncoder().encode(value)) {
      hash ^= BigInt(byte);
      hash = BigInt.asUintN(64, hash * 0x100000001b3n);
    }
    return hash.toString(16).padStart(16, "0");
  }

  // packages/Epoch.Community.Core/src/query-parser.ts
  var QUERY_LANGUAGE_VERSION = 2;
  var QUERY_FIELD_REGISTRY_VERSION = 2;
  var MAX_QUERY_BYTES = 16384;
  var MAX_QUERY_NODES = 256;
  var MAX_QUERY_DEPTH = 16;
  var MAX_VALUE_LENGTH = 2048;
  var MIN_PREFIX_LENGTH = 2;
  var DEFAULT_FIELD_REGISTRY = createCommunityFieldRegistry([], QUERY_FIELD_REGISTRY_VERSION);
  var QueryFailure = class extends Error {
    constructor(code, message2, span, suggestions2 = []) {
      super(message2);
      __publicField(this, "code", code);
      __publicField(this, "span", span);
      __publicField(this, "suggestions", suggestions2);
    }
  };
  function parseCommunityQuery(input, options = {}) {
    const fieldRegistryVersion = options.fieldRegistryVersion ?? options.fieldRegistry?.version ?? QUERY_FIELD_REGISTRY_VERSION;
    let resolvedAt;
    try {
      resolvedAt = normalizeNow(options.now);
    } catch (error) {
      const failure = error instanceof QueryFailure ? error : new QueryFailure("QUERY_CONTEXT_INVALID", String(error));
      return invalid2(failure, "1970-01-01T00:00:00.000Z", fieldRegistryVersion);
    }
    if (options.version !== void 0 && options.version > QUERY_LANGUAGE_VERSION) {
      return invalid2(new QueryFailure(
        "QUERY_VERSION_UNSUPPORTED",
        `Query language version ${options.version} is newer than supported version ${QUERY_LANGUAGE_VERSION}`
      ), resolvedAt, fieldRegistryVersion);
    }
    if (new TextEncoder().encode(input).length > (options.maxBytes ?? MAX_QUERY_BYTES)) {
      return invalid2(new QueryFailure("QUERY_TOO_LARGE", `Query exceeds the ${options.maxBytes ?? MAX_QUERY_BYTES} byte limit`), resolvedAt, fieldRegistryVersion);
    }
    try {
      const parser = new Parser(input, options, resolvedAt);
      const parsed = parser.parse();
      const separated = separateSort(parsed);
      const ast = separated.expression === null ? null : normalizeExpression(separated.expression);
      const canonical = [ast === null ? "" : serializeExpression(ast), ...separated.sorts.map((sort2) => sort2.canonical)].filter(Boolean).join(" ");
      const sort = separated.sorts.map((value) => value.order);
      const canonicalJson2 = JSON.stringify({ expression: JSON.parse(canonicalExpressionJson(ast)), sort });
      return {
        ast,
        canonical,
        canonicalJson: canonicalJson2,
        queryHash: stableQueryHash(`${fieldRegistryVersion}
${canonicalJson2}`),
        sort,
        version: QUERY_LANGUAGE_VERSION,
        fieldRegistryVersion,
        resolvedAt,
        diagnostics: []
      };
    } catch (error) {
      const failure = error instanceof QueryFailure ? error : new QueryFailure("QUERY_SYNTAX", error instanceof Error ? error.message : String(error));
      return invalid2(failure, resolvedAt, fieldRegistryVersion);
    }
  }
  var Parser = class {
    constructor(input, options, resolvedAt) {
      __publicField(this, "input", input);
      __publicField(this, "options", options);
      __publicField(this, "resolvedAt", resolvedAt);
      __publicField(this, "tokens");
      __publicField(this, "fieldRegistry");
      __publicField(this, "position", 0);
      __publicField(this, "nodes", 0);
      __publicField(this, "depth", 0);
      this.tokens = tokenize2(input);
      this.fieldRegistry = options.fieldRegistry ?? DEFAULT_FIELD_REGISTRY;
    }
    parse() {
      if (this.peek().type === "EOF") return null;
      const result = this.parseOr();
      if (this.peek().type !== "EOF") this.fail("QUERY_SYNTAX", `Unexpected trailing input: ${this.peek().value || this.peek().type}`, this.peek());
      return result;
    }
    parseOr(inherited) {
      let left = this.parseAnd(inherited);
      while (this.take("OR") !== void 0) {
        const right = this.parseAnd(inherited);
        if (left.kind === "sort-marker" || right.kind === "sort-marker") {
          const marker = left.kind === "sort-marker" ? left : right;
          this.fail("QUERY_SORT_CONTEXT", "Sort clauses may only be combined with filters using AND", tokenOf(marker));
        }
        left = this.combine("or", left, right);
      }
      return left;
    }
    parseAnd(inherited) {
      const terms = [this.parseNot(inherited)];
      while (!["OR", "RPAREN", "EOF"].includes(this.peek().type)) {
        if (this.take("AND") !== void 0 && ["OR", "RPAREN", "EOF"].includes(this.peek().type)) {
          this.fail("QUERY_SYNTAX", "Expected a query clause after AND", this.peek());
        }
        terms.push(this.parseNot(inherited));
      }
      if (terms.length === 1) return terms[0];
      const expressions = terms.filter((term) => term.kind !== "sort-marker");
      const markers = terms.filter((term) => term.kind === "sort-marker");
      if (expressions.length === 0) return markers.length === 1 ? markers[0] : this.combineSorts(markers);
      const expression = expressions.length === 1 ? expressions[0] : this.node({
        kind: "and",
        terms: expressions,
        span: mergeSpans(expressions[0]?.span, expressions.at(-1)?.span)
      });
      if (markers.length === 0) return expression;
      return this.node({ kind: "and", terms: [expression, ...markers], span: mergeSpans(expression.span, markers.at(-1)?.span) });
    }
    combineSorts(markers) {
      return this.node({ kind: "and", terms: markers, span: mergeSpans(markers[0]?.span, markers.at(-1)?.span) });
    }
    parseNot(inherited) {
      const negation = this.take("NOT");
      if (negation === void 0) return this.parsePrimary(inherited);
      const term = this.parseNot(inherited);
      if (term.kind === "sort-marker") this.fail("QUERY_SORT_CONTEXT", "A sort clause cannot be negated", negation);
      return this.node({ kind: "not", term, span: spanBetween(this.input, negation.start, term.span?.end ?? negation.end) });
    }
    parsePrimary(inherited) {
      const open2 = this.take("LPAREN");
      if (open2 !== void 0) {
        this.depth += 1;
        if (this.depth > (this.options.maxDepth ?? MAX_QUERY_DEPTH)) this.fail("QUERY_DEPTH_LIMIT", "Query nesting is too deep", open2);
        const expression = this.parseOr(inherited);
        const close = this.expect("RPAREN");
        this.depth -= 1;
        if (expression.kind === "sort-marker") return { ...expression, span: spanBetween(this.input, open2.start, close.end) };
        return { ...expression, span: spanBetween(this.input, open2.start, close.end) };
      }
      const phrase = this.take("PHRASE");
      if (phrase !== void 0) return this.text(inherited, phrase.value, "phrase", phrase);
      const word = this.take("WORD");
      if (word === void 0) this.fail("QUERY_SYNTAX", `Unexpected token: ${this.peek().value || this.peek().type}`, this.peek());
      if (this.take("COLON") === void 0) {
        if (inherited !== void 0) return this.fieldValue(inherited, "eq", word.value, false, word);
        return this.text(void 0, word.value, word.value.endsWith("*") ? "prefix" : "term", word);
      }
      if (word.value.toLowerCase() === "sort") return this.sort(word);
      if (word.value.toLowerCase().startsWith("related.")) return this.related(word);
      const field2 = this.resolveField(word);
      const fieldGroup = this.take("LPAREN");
      if (fieldGroup !== void 0) {
        this.depth += 1;
        if (this.depth > (this.options.maxDepth ?? MAX_QUERY_DEPTH)) this.fail("QUERY_DEPTH_LIMIT", "Query nesting is too deep", fieldGroup);
        const expression = this.parseOr(field2);
        const close = this.expect("RPAREN");
        this.depth -= 1;
        if (expression.kind === "sort-marker") this.fail("QUERY_SORT_CONTEXT", "Sort is not valid inside a field group", word);
        return { ...expression, span: spanBetween(this.input, word.start, close.end) };
      }
      const operator = this.readOperator();
      const rangeOpen = this.take("LBRACKET") ?? this.take("LBRACE");
      if (rangeOpen !== void 0) return this.range(field2, rangeOpen, word.start);
      const phraseValue = this.take("PHRASE");
      if (phraseValue !== void 0) return this.fieldValue(field2, operator, phraseValue.value, true, spanToken(word.start, phraseValue.end));
      const valueToken = this.readValueToken();
      if (valueToken.value === "*" && operator === "eq") {
        this.requireOperator(field2, "exists", word);
        return this.node({ kind: "exists", field: field2.name, span: spanBetween(this.input, word.start, valueToken.end) });
      }
      return this.fieldValue(field2, operator, valueToken.value, false, spanToken(word.start, valueToken.end));
    }
    sort(fieldToken) {
      const value = this.readValueToken().value;
      const parts = value.split(":");
      let order;
      let canonical;
      if (["new", "hot", "top", "best"].includes(value.toLowerCase())) {
        const shortcut = value.toLowerCase();
        order = { field: shortcut === "new" ? "updatedAt" : "score", direction: "descending", nulls: "last" };
        canonical = `sort:${shortcut}`;
      } else {
        const descriptor = this.resolveField({ ...fieldToken, value: parts[0] ?? "" });
        const direction = (parts[1] ?? "ascending").toLowerCase();
        const nulls = (parts[2] ?? "last").toLowerCase().replace(/^nulls/u, "");
        if (!["asc", "ascending", "desc", "descending"].includes(direction)) {
          this.fail("QUERY_INVALID_SORT", `Invalid sort direction: ${direction}`, fieldToken, ["ascending", "descending"]);
        }
        if (!["first", "last"].includes(nulls)) this.fail("QUERY_INVALID_SORT", `Invalid null ordering: ${nulls}`, fieldToken, ["first", "last"]);
        order = {
          field: descriptor.name,
          direction: direction.startsWith("desc") ? "descending" : "ascending",
          nulls
        };
        canonical = `sort:${order.field}:${order.direction === "ascending" ? "asc" : "desc"}:nulls${order.nulls}`;
      }
      return { kind: "sort-marker", order, canonical, span: spanBetween(this.input, fieldToken.start, this.previous().end) };
    }
    related(fieldToken) {
      const relation = fieldToken.value.slice("related.".length).toLowerCase();
      const allowed = ["reply", "quote", "mention", "provenance", "promotion", "replacement", "moderation", "attachment", "backlink"];
      if (!allowed.includes(relation)) {
        this.fail("QUERY_UNKNOWN_RELATION", `Unknown relation: ${relation}`, fieldToken, nearest(relation, allowed));
      }
      const value = this.readValueToken();
      const slash = value.value.indexOf("/");
      const kind = slash < 0 ? "message" : value.value.slice(0, slash);
      const objectId = slash < 0 ? value.value : value.value.slice(slash + 1);
      let target;
      try {
        target = validateObjectRef({ objectId, kind });
      } catch {
        this.fail("QUERY_INVALID_VALUE", `Invalid related object reference: ${value.value}`, value);
      }
      return this.node({
        kind: "related",
        relation,
        target,
        direction: "out",
        maxDepth: 1,
        span: spanBetween(this.input, fieldToken.start, value.end)
      });
    }
    range(field2, open2, start) {
      this.requireOperator(field2, "in", open2);
      const lowerToken = this.readValueToken();
      this.expect("TO");
      const upperToken = this.readValueToken();
      const close = this.take("RBRACKET") ?? this.take("RBRACE");
      if (close === void 0) this.fail("QUERY_SYNTAX", "Expected ] or } to close range", this.peek());
      const lower = lowerToken.value === "*" ? void 0 : this.convert(field2, lowerToken.value, lowerToken);
      const upper = upperToken.value === "*" ? void 0 : this.convert(field2, upperToken.value, upperToken);
      if (lower === void 0 && upper === void 0) this.fail("QUERY_INVALID_RANGE", "A range must have at least one bound", open2);
      return this.node({
        kind: "range",
        field: field2.name,
        ...lower === void 0 ? {} : { lower },
        ...upper === void 0 ? {} : { upper },
        includeLower: open2.type === "LBRACKET",
        includeUpper: close.type === "RBRACKET",
        span: spanBetween(this.input, start, close.end)
      });
    }
    fieldValue(field2, operator, raw, phrase, token) {
      if (raw.length > MAX_VALUE_LENGTH) this.fail("QUERY_VALUE_TOO_LARGE", `Query value exceeds ${MAX_VALUE_LENGTH} characters`, token);
      if (/^\/.*\/$/u.test(raw) || /[~?^]/u.test(raw)) this.fail("QUERY_UNSUPPORTED_SYNTAX", "Regex, fuzzy, boost, and wildcard query syntax is not supported", token);
      const prefix = !phrase && raw.endsWith("*");
      if (prefix) {
        this.requireOperator(field2, "prefix", token);
        const value2 = raw.slice(0, -1);
        if (value2.length < MIN_PREFIX_LENGTH) this.fail("QUERY_PREFIX_TOO_SHORT", `Prefix queries require at least ${MIN_PREFIX_LENGTH} characters`, token);
        if (value2.includes("*")) this.fail("QUERY_UNSUPPORTED_SYNTAX", "Only one trailing prefix wildcard is supported", token);
        return this.node({ kind: "text", fields: [field2.name], value: value2.normalize("NFC"), mode: "prefix", span: tokenSpan(this.input, token) });
      }
      if (raw.includes("*")) this.fail("QUERY_UNSUPPORTED_SYNTAX", "Only one trailing prefix wildcard is supported", token);
      const mapped = compareOperator(operator);
      this.requireOperator(field2, field2.type === "text" && operator === "eq" ? phrase ? "phrase" : "term" : mapped, token);
      if (field2.type === "datetime" && operator === "eq" && ["today", "yesterday"].includes(raw.toLowerCase())) {
        const bounds = contextualDay(raw.toLowerCase(), this.resolvedAt, this.options.timezone ?? "UTC", tokenSpan(this.input, token));
        return this.node({
          kind: "range",
          field: field2.name,
          lower: bounds.lower,
          upper: bounds.upper,
          includeLower: true,
          includeUpper: false,
          span: tokenSpan(this.input, token)
        });
      }
      const contextual = raw.toLowerCase() === "me" && ["author", "owner"].includes(field2.name);
      if (contextual && this.options.actorId === void 0) this.fail("QUERY_CONTEXT_REQUIRED", `Field ${field2.name} requires an authenticated actor to resolve "me"`, token);
      const value = this.convert(field2, contextual ? this.options.actorId : raw, token);
      if (field2.type === "text" && operator === "eq") {
        return this.node({ kind: "text", fields: field2.name === "text" ? ["title", "body"] : [field2.name], value: String(value), mode: phrase ? "phrase" : "term", span: tokenSpan(this.input, token) });
      }
      return this.node({ kind: "compare", field: field2.name, operator, value, span: tokenSpan(this.input, token) });
    }
    text(field2, raw, mode, token) {
      if (/[~?^]/u.test(raw) || /^\/.*\/$/u.test(raw)) this.fail("QUERY_UNSUPPORTED_SYNTAX", "Regex, fuzzy, boost, and wildcard query syntax is not supported", token);
      const value = mode === "prefix" ? raw.slice(0, -1) : raw;
      if (mode === "prefix" && value.length < MIN_PREFIX_LENGTH) this.fail("QUERY_PREFIX_TOO_SHORT", `Prefix queries require at least ${MIN_PREFIX_LENGTH} characters`, token);
      if (raw.includes("*") && mode !== "prefix") this.fail("QUERY_UNSUPPORTED_SYNTAX", "Only one trailing prefix wildcard is supported", token);
      if (field2 !== void 0) return this.fieldValue(field2, "eq", raw, mode === "phrase", token);
      return this.node({ kind: "text", fields: ["title", "body"], value: value.normalize("NFC"), mode, span: tokenSpan(this.input, token) });
    }
    convert(field2, raw, token) {
      const value = raw.normalize("NFC");
      switch (field2.type) {
        case "number": {
          if (!/^-?(?:0|[1-9]\d*)(?:\.\d+)?$/u.test(value)) this.fail("QUERY_INVALID_VALUE", `${field2.name} requires a finite number`, token);
          const number = Number(value);
          if (!Number.isFinite(number) || !Number.isSafeInteger(number) && !value.includes(".")) this.fail("QUERY_INVALID_VALUE", `${field2.name} requires a safe finite number`, token);
          return number;
        }
        case "boolean":
          if (!/^(?:true|false)$/iu.test(value)) this.fail("QUERY_INVALID_VALUE", `${field2.name} requires true or false`, token, ["true", "false"]);
          return value.toLowerCase() === "true";
        case "datetime":
          return normalizeDatetime(value, tokenSpan(this.input, token));
        case "uri": {
          try {
            return new URL(value).toString();
          } catch {
            return this.fail("QUERY_INVALID_VALUE", `${field2.name} requires an absolute URI`, token);
          }
        }
        default:
          if (field2.enumValues !== void 0 && !field2.enumValues.includes(value.toLowerCase())) {
            this.fail("QUERY_INVALID_VALUE", `Unknown ${field2.name} value: ${value}`, token, nearest(value, field2.enumValues));
          }
          return field2.enumValues === void 0 ? value : value.toLowerCase();
      }
    }
    readOperator() {
      const token = this.peek();
      const mapping = { EQ: "eq", NE: "ne", LT: "lt", LTE: "lte", GT: "gt", GTE: "gte" };
      const operator = mapping[token.type];
      if (operator === void 0) return "eq";
      this.position += 1;
      return operator;
    }
    readValueToken() {
      const first = this.take("WORD") ?? this.take("PHRASE");
      if (first === void 0) this.fail("QUERY_SYNTAX", "Expected a query value", this.peek());
      let value = first.value;
      let end = first.end;
      while (this.take("COLON") !== void 0) {
        const next = this.expect("WORD");
        value += `:${next.value}`;
        end = next.end;
      }
      return { type: first.type, value, start: first.start, end };
    }
    resolveField(token) {
      const field2 = this.fieldRegistry.resolve(token.value);
      const visible = field2 !== void 0 && this.fieldRegistry.list(this.options.authorization ?? {}).includes(field2);
      if (field2 !== void 0 && visible) return field2;
      const suggestions2 = this.fieldRegistry.suggest(token.value, this.options.authorization);
      this.fail("QUERY_UNKNOWN_FIELD", `Unknown query field "${token.value}"${suggestions2[0] === void 0 ? "" : `; did you mean ${suggestions2[0]}?`}`, token, suggestions2);
    }
    requireOperator(field2, operator, token) {
      if (!field2.operators.includes(operator)) this.fail("QUERY_INVALID_OPERATOR", `${operator} is not supported for ${field2.name}`, token, field2.operators);
    }
    combine(kind, left, right) {
      const terms = [left, right].flatMap((term) => term.kind === kind ? term.terms : [term]);
      return this.node({ kind, terms, span: mergeSpans(left.span, right.span) });
    }
    node(node) {
      this.nodes += 1;
      if (this.nodes > (this.options.maxNodes ?? MAX_QUERY_NODES)) this.fail("QUERY_NODE_LIMIT", "Query has too many clauses", node.span);
      return node;
    }
    peek() {
      return this.tokens[this.position] ?? this.tokens.at(-1);
    }
    previous() {
      return this.tokens[Math.max(0, this.position - 1)];
    }
    take(type) {
      if (this.peek().type !== type) return void 0;
      const token = this.peek();
      this.position += 1;
      return token;
    }
    expect(type) {
      const token = this.take(type);
      if (token === void 0) this.fail("QUERY_SYNTAX", `Expected ${type} near ${this.peek().value || "end"}`, this.peek());
      return token;
    }
    fail(code, message2, value, suggestions2 = []) {
      const span = value === void 0 ? void 0 : "type" in value ? tokenSpan(this.input, value) : value;
      throw new QueryFailure(code, message2, span, suggestions2);
    }
  };
  function tokenize2(input) {
    const tokens = [];
    let index = 0;
    const push = (type, start, end = start + 1, value = input.slice(start, end)) => {
      tokens.push({ type, value, start, end });
    };
    while (index < input.length) {
      const character = input[index] ?? "";
      if (/\s/u.test(character)) {
        index += 1;
        continue;
      }
      const two = input.slice(index, index + 2);
      const compound = { ">=": "GTE", "<=": "LTE", "!=": "NE" };
      if (compound[two] !== void 0) {
        push(compound[two], index, index + 2);
        index += 2;
        continue;
      }
      const punctuation = {
        "(": "LPAREN",
        ")": "RPAREN",
        "[": "LBRACKET",
        "]": "RBRACKET",
        "{": "LBRACE",
        "}": "RBRACE",
        ":": "COLON",
        "=": "EQ",
        "<": "LT",
        ">": "GT"
      };
      if (punctuation[character] !== void 0) {
        push(punctuation[character], index);
        index += 1;
        continue;
      }
      if (character === "-" && !/\d/u.test(input[index + 1] ?? "")) {
        push("NOT", index);
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
        if (input[index] !== '"') throw new QueryFailure("QUERY_SYNTAX", "unterminated quoted phrase", spanBetween(input, start2, input.length));
        index += 1;
        let phrase;
        try {
          phrase = JSON.parse(input.slice(start2, index));
        } catch {
          throw new QueryFailure("QUERY_SYNTAX", "invalid quoted phrase escape", spanBetween(input, start2, index));
        }
        if (typeof phrase !== "string") throw new QueryFailure("QUERY_SYNTAX", "invalid quoted phrase", spanBetween(input, start2, index));
        push("PHRASE", start2, index, phrase.normalize("NFC"));
        continue;
      }
      const start = index;
      while (index < input.length && !/[\s():[\]{}"=<>]/u.test(input[index] ?? "")) index += 1;
      const raw = input.slice(start, index).normalize("NFC");
      const upper = raw.toUpperCase();
      const type = upper === "AND" || upper === "OR" || upper === "NOT" || upper === "TO" ? upper : "WORD";
      push(type, start, index, raw);
    }
    tokens.push({ type: "EOF", value: "", start: input.length, end: input.length });
    return tokens;
  }
  function separateSort(node) {
    if (node === null) return { expression: null, sorts: [] };
    if (node.kind === "sort-marker") return { expression: null, sorts: [node] };
    if (node.kind !== "and") return { expression: node, sorts: [] };
    const sorts = node.terms.filter((term) => term.kind === "sort-marker");
    const expressions = node.terms.filter((term) => term.kind !== "sort-marker");
    const seen = /* @__PURE__ */ new Set();
    for (const sort of sorts) {
      if (seen.has(sort.order.field)) throw new QueryFailure("QUERY_DUPLICATE_SORT", `Duplicate sort field: ${sort.order.field}`, sort.span);
      seen.add(sort.order.field);
    }
    return {
      expression: expressions.length === 0 ? null : expressions.length === 1 ? expressions[0] : { ...node, terms: expressions },
      sorts
    };
  }
  function normalizeExpression(expression) {
    if (expression.kind === "and" || expression.kind === "or") {
      const terms = expression.terms.flatMap((term) => {
        const normalized = normalizeExpression(term);
        if (normalized.kind === "all" && expression.kind === "and") return [];
        return normalized.kind === expression.kind ? normalized.terms : [normalized];
      });
      if (terms.length === 0) return { kind: "all", ...expression.span === void 0 ? {} : { span: expression.span } };
      if (terms.length === 1) return terms[0];
      return { ...expression, terms };
    }
    if (expression.kind === "not") return { ...expression, term: normalizeExpression(expression.term) };
    return expression;
  }
  function serializeExpression(expression, parentPrecedence = 0) {
    const precedence = expression.kind === "or" ? 1 : expression.kind === "and" ? 2 : expression.kind === "not" ? 3 : 4;
    let value;
    switch (expression.kind) {
      case "all":
        value = "*";
        break;
      case "and":
      case "or":
        value = expression.terms.map((term) => serializeExpression(term, precedence)).join(` ${expression.kind.toUpperCase()} `);
        break;
      case "not":
        value = `NOT ${serializeExpression(expression.term, precedence)}`;
        break;
      case "text": {
        const raw = expression.mode === "phrase" ? JSON.stringify(expression.value) : `${escapeValue(expression.value)}${expression.mode === "prefix" ? "*" : ""}`;
        value = expression.fields.length === 2 && expression.fields[0] === "title" && expression.fields[1] === "body" ? raw : `${expression.fields[0]}:${raw}`;
        break;
      }
      case "compare":
        value = `${expression.field}:${operatorText(expression.operator)}${serializeScalar(expression.value)}`;
        break;
      case "range":
        value = `${expression.field}:${expression.includeLower ? "[" : "{"}${expression.lower === void 0 ? "*" : serializeScalar(expression.lower)} TO ${expression.upper === void 0 ? "*" : serializeScalar(expression.upper)}${expression.includeUpper ? "]" : "}"}`;
        break;
      case "exists":
        value = `${expression.field}:*`;
        break;
      case "related":
        value = `related.${expression.relation}:${expression.target.kind}/${escapeValue(expression.target.objectId)}`;
        break;
    }
    return precedence < parentPrecedence ? `(${value})` : value;
  }
  function operatorText(operator) {
    return { eq: "", ne: "!=", lt: "<", lte: "<=", gt: ">", gte: ">=", in: "=" }[operator];
  }
  function serializeScalar(value) {
    if (typeof value === "string") return escapeValue(value);
    if (Array.isArray(value)) return `(${value.map(serializeScalar).join(" OR ")})`;
    return String(value);
  }
  function escapeValue(value) {
    return /^[^\s():[\]{}"=<>]+$/u.test(value) ? value : JSON.stringify(value);
  }
  function normalizeNow(value) {
    if (value === void 0) return "1970-01-01T00:00:00.000Z";
    const date = value instanceof Date ? new Date(value.getTime()) : new Date(value);
    if (!Number.isFinite(date.getTime())) throw new QueryFailure("QUERY_CONTEXT_INVALID", "Invalid query clock value");
    return date.toISOString();
  }
  function normalizeDatetime(value, span) {
    if (!/(?:Z|[+-]\d{2}:\d{2})$/u.test(value)) throw new QueryFailure("QUERY_INVALID_VALUE", "Datetime values require an explicit timezone", span);
    const date = new Date(value);
    if (!Number.isFinite(date.getTime())) throw new QueryFailure("QUERY_INVALID_VALUE", `Invalid datetime: ${value}`, span);
    return date.toISOString();
  }
  function contextualDay(value, resolvedAt, timezone, span) {
    let formatter;
    try {
      formatter = new Intl.DateTimeFormat("en-CA", {
        timeZone: timezone,
        year: "numeric",
        month: "2-digit",
        day: "2-digit",
        hour: "2-digit",
        minute: "2-digit",
        second: "2-digit",
        hourCycle: "h23"
      });
    } catch {
      throw new QueryFailure("QUERY_CONTEXT_INVALID", `Invalid timezone: ${timezone}`, span);
    }
    const parts = formatter.formatToParts(new Date(resolvedAt));
    const year = Number(parts.find((part) => part.type === "year")?.value);
    const month = Number(parts.find((part) => part.type === "month")?.value);
    const day = Number(parts.find((part) => part.type === "day")?.value);
    const offset = value === "yesterday" ? -1 : 0;
    const lower = zonedMidnight(year, month, day + offset, formatter);
    const upper = zonedMidnight(year, month, day + offset + 1, formatter);
    return { lower: lower.toISOString(), upper: upper.toISOString() };
  }
  function zonedMidnight(year, month, day, formatter) {
    const target = Date.UTC(year, month - 1, day);
    let instant = target;
    for (let pass = 0; pass < 2; pass += 1) {
      const parts = formatter.formatToParts(new Date(instant));
      const part = (type) => Number(parts.find((value) => value.type === type)?.value);
      const represented = Date.UTC(part("year"), part("month") - 1, part("day"), part("hour"), part("minute"), part("second"));
      instant += target - represented;
    }
    return new Date(instant);
  }
  function compareOperator(operator) {
    return operator;
  }
  function invalid2(error, resolvedAt, fieldRegistryVersion) {
    const diagnostic = {
      code: error.code,
      message: error.message,
      severity: "error",
      ...error.span === void 0 ? {} : { span: error.span },
      suggestions: error.suggestions
    };
    const canonicalJson2 = JSON.stringify({ expression: null, sort: [] });
    return {
      ast: null,
      canonical: "",
      canonicalJson: canonicalJson2,
      queryHash: stableQueryHash(`${fieldRegistryVersion}
${canonicalJson2}`),
      sort: [],
      version: QUERY_LANGUAGE_VERSION,
      fieldRegistryVersion,
      resolvedAt,
      diagnostics: [diagnostic],
      error: diagnostic.message
    };
  }
  function spanToken(start, end) {
    return { type: "WORD", value: "", start, end };
  }
  function tokenOf(marker) {
    return marker.span;
  }
  function tokenSpan(input, token) {
    return spanBetween(input, token.start, token.end);
  }
  function spanBetween(input, start, end) {
    const before = input.slice(0, start);
    const lines = before.split("\n");
    return { start, end, line: lines.length, column: (lines.at(-1)?.length ?? 0) + 1 };
  }
  function mergeSpans(left, right) {
    if (left === void 0) return right;
    if (right === void 0) return left;
    return { start: left.start, end: right.end, line: left.line, column: left.column };
  }
  function nearest(value, candidates) {
    const normalized = value.toLowerCase();
    return [...new Set(candidates)].sort((left, right) => distance(normalized, left.toLowerCase()) - distance(normalized, right.toLowerCase()) || left.localeCompare(right)).slice(0, 1);
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

  // packages/Epoch.Community.Core/src/query.ts
  var COMMUNITY_QUERY_FIELDS = Object.freeze(CORE_COMMUNITY_FIELDS.map(({ name }) => name));
  function normalizeQuery(input, options = {}) {
    return parseCommunityQuery(input, options);
  }
  function migrateNormalizedQuery(saved) {
    const version = saved.queryLanguageVersion ?? saved.version ?? 0;
    if (version > QUERY_LANGUAGE_VERSION) {
      return parseCommunityQuery("", { version });
    }
    const source = saved.canonical ?? saved.query;
    if (source !== void 0) return parseCommunityQuery(source, { version });
    if (saved.ast !== void 0) {
      const serialized = saved.ast === null ? "" : isPersistedNode(saved.ast) ? serializePersisted(saved.ast) : serializeSemantic(saved.ast);
      const sort = typeof saved.sort === "string" ? `sort:${saved.sort}` : "";
      return parseCommunityQuery([serialized, sort].filter(Boolean).join(" "), { version });
    }
    return invalidMigration("Saved query has no canonical query or normalized AST");
  }
  function matchesNormalizedQuery(message2, query) {
    if (query.error !== void 0) return false;
    if (query.ast !== null && isPersistedNode(query.ast)) return matchesNormalizedQuery(message2, migrateNormalizedQuery(query));
    if (query.ast === null) return true;
    const entity = communityMessageToEntity(message2, {
      provenance: { sourceId: "community-message", nativeId: message2.ref.objectId, observedAt: message2.updatedAt ?? message2.publishedAt },
      visibility: message2.context.kind === "dm" ? "private" : "public",
      participantIds: []
    });
    return evaluateSearchExpression(entity, query.ast).matches;
  }
  function isPersistedNode(value) {
    return "op" in value;
  }
  function serializePersisted(node, parentPrecedence = 0) {
    const precedence = node.op === "or" ? 1 : node.op === "and" ? 2 : node.op === "not" ? 3 : 4;
    let value;
    switch (node.op) {
      case "or":
      case "and":
        value = `${serializePersisted(requiredNode(node.left), precedence)} ${node.op.toUpperCase()} ${serializePersisted(requiredNode(node.right), precedence)}`;
        break;
      case "not":
        value = `NOT ${serializePersisted(requiredNode(node.node), precedence)}`;
        break;
      case "field_group":
        value = `${node.field ?? "text"}:(${serializePersisted(requiredNode(node.node))})`;
        break;
      case "field":
        value = `${node.field ?? "text"}:${node.phrase ? JSON.stringify(node.value ?? "") : node.value ?? "*"}`;
        break;
      case "term":
        value = node.phrase ? JSON.stringify(node.value ?? "") : node.value ?? "";
        break;
    }
    return precedence < parentPrecedence ? `(${value})` : value;
  }
  function requiredNode(node) {
    if (node === void 0) throw new Error("Malformed saved query AST");
    return node;
  }
  function serializeSemantic(node) {
    switch (node.kind) {
      case "all":
        return "";
      case "and":
        return node.terms.map(serializeSemantic).join(" AND ");
      case "or":
        return node.terms.map(serializeSemantic).join(" OR ");
      case "not":
        return `NOT (${serializeSemantic(node.term)})`;
      case "text":
        return `${node.fields.length === 2 ? "" : `${node.fields[0]}:`}${node.mode === "phrase" ? JSON.stringify(node.value) : `${node.value}${node.mode === "prefix" ? "*" : ""}`}`;
      case "compare":
        return `${node.field}:${{ eq: "", ne: "!=", lt: "<", lte: "<=", gt: ">", gte: ">=", in: "=" }[node.operator]}${String(node.value)}`;
      case "range":
        return `${node.field}:${node.includeLower ? "[" : "{"}${node.lower ?? "*"} TO ${node.upper ?? "*"}${node.includeUpper ? "]" : "}"}`;
      case "exists":
        return `${node.field}:*`;
      case "related":
        return `related.${node.relation}:${node.target.kind}/${node.target.objectId}`;
    }
  }
  function invalidMigration(message2) {
    const parsed = parseCommunityQuery("");
    return { ...parsed, diagnostics: [{ code: "QUERY_MIGRATION", message: message2, severity: "error", suggestions: [] }], error: message2 };
  }

  // packages/Epoch.Community.Core/src/runtime-context.ts
  var SAFE_NAMESPACE = /^[A-Za-z0-9][A-Za-z0-9._~-]{0,127}$/u;
  function createCommunityRuntimeContext(input) {
    validateTimezone(input.timezone);
    let locale;
    try {
      [locale] = Intl.getCanonicalLocales(input.locale);
    } catch {
      throw new CommunityError("INVALID_FIELD", "Locale must be a valid BCP 47 language tag");
    }
    if (locale === void 0) throw new CommunityError("INVALID_FIELD", "Locale must be a valid BCP 47 language tag");
    return Object.freeze({
      ...input,
      locale,
      now: () => {
        const value = input.clock.now();
        if (!(value instanceof Date) || !Number.isFinite(value.getTime())) {
          throw new CommunityError("INVALID_FIELD", "Clock returned an invalid instant");
        }
        return value.toISOString();
      },
      nextId: (namespace) => {
        if (!SAFE_NAMESPACE.test(namespace)) throw new CommunityError("INVALID_FIELD", "ID namespace must be an opaque URL-safe value");
        const value = input.idGenerator.generate(namespace);
        if (!SAFE_NAMESPACE.test(value)) throw new CommunityError("INVALID_FIELD", "ID generator returned an invalid opaque identifier");
        return value;
      }
    });
  }
  async function authorizationFingerprint(authorization) {
    const subtle = globalThis.crypto?.subtle;
    if (subtle === void 0) throw new CommunityError("CRYPTO_UNAVAILABLE", "SHA-256 is unavailable in this runtime");
    const canonical = JSON.stringify({
      actorId: boundedClaim(authorization.actorId),
      permissions: canonicalClaimSet(authorization.permissions),
      readableDmIds: canonicalClaimSet(authorization.readableDmIds)
    });
    const digest = await subtle.digest("SHA-256", new TextEncoder().encode(canonical));
    return `sha256:${[...new Uint8Array(digest)].map((value) => value.toString(16).padStart(2, "0")).join("")}`;
  }
  function canonicalClaimSet(values2) {
    if (values2 === void 0) return [];
    if (values2.length > 4096) throw new CommunityError("AUTHORIZATION_DENIED", "Authorization claim set exceeds the supported limit");
    return [...new Set(values2.map((value) => boundedClaim(value) ?? ""))].sort();
  }
  function boundedClaim(value) {
    if (value === void 0) return null;
    if (value.length === 0 || value.length > 512 || [...value].some((character) => {
      const code = character.charCodeAt(0);
      return code <= 31 || code === 127;
    })) {
      throw new CommunityError("AUTHORIZATION_DENIED", "Authorization contains an invalid claim");
    }
    return value.normalize("NFC");
  }
  function validateTimezone(timezone) {
    try {
      new Intl.DateTimeFormat("en", { timeZone: timezone }).format(0);
    } catch {
      throw new CommunityError("INVALID_FIELD", "Timezone must be a valid IANA timezone");
    }
  }

  // packages/Epoch.Community.Core/src/cursor.ts
  function createKeysetCursorCodec(options) {
    const maxBytes = options.maxBytes ?? 4096;
    if (options.key.byteLength < 32) throw new CommunityError("CURSOR_INVALID", "Cursor signing key must contain at least 256 bits");
    const keyBytes = new Uint8Array(options.key);
    return Object.freeze({
      encode: async (payload) => {
        validatePayload(payload);
        const body = new TextEncoder().encode(JSON.stringify(payload));
        if (body.byteLength > maxBytes) throw new CommunityError("CURSOR_INVALID", "Cursor exceeds the supported size");
        return base64Url(await seal(body, keyBytes));
      },
      decode: async (cursor, binding2) => {
        if (typeof cursor !== "string" || cursor.length > maxBytes * 2) throw new CommunityError("CURSOR_INVALID", "Cursor is malformed or oversized");
        let body;
        try {
          body = await open(fromBase64Url(cursor), keyBytes);
        } catch {
          throw new CommunityError("CURSOR_INVALID", "Cursor authentication failed");
        }
        if (body.byteLength > maxBytes) throw new CommunityError("CURSOR_INVALID", "Cursor payload is oversized");
        let payload;
        try {
          payload = JSON.parse(new TextDecoder("utf-8", { fatal: true }).decode(body));
        } catch {
          throw new CommunityError("CURSOR_INVALID", "Cursor payload is invalid");
        }
        validatePayload(payload);
        const valid = payload;
        if (valid.snapshotId !== binding2.snapshotId || valid.planHash !== binding2.planHash || valid.authorizationFingerprint !== binding2.authorizationFingerprint) {
          throw new CommunityError("CURSOR_STALE", "Cursor does not belong to this query snapshot or authorization context");
        }
        return valid;
      }
    });
  }
  var CURSOR_AAD = new TextEncoder().encode("epoch-community-cursor-v1");
  async function seal(body, keyBytes) {
    const subtle = globalThis.crypto?.subtle;
    if (subtle === void 0 || globalThis.crypto?.getRandomValues === void 0) throw new CommunityError("CRYPTO_UNAVAILABLE", "Cursor encryption is unavailable in this runtime");
    const nonce = globalThis.crypto.getRandomValues(new Uint8Array(12));
    const key = await subtle.importKey("raw", arrayBuffer(keyBytes), "AES-GCM", false, ["encrypt"]);
    const ciphertext = new Uint8Array(await subtle.encrypt({ name: "AES-GCM", iv: arrayBuffer(nonce), additionalData: arrayBuffer(CURSOR_AAD) }, key, arrayBuffer(body)));
    const envelope = new Uint8Array(1 + nonce.byteLength + ciphertext.byteLength);
    envelope[0] = 1;
    envelope.set(nonce, 1);
    envelope.set(ciphertext, 13);
    return envelope;
  }
  async function open(envelope, keyBytes) {
    const subtle = globalThis.crypto?.subtle;
    if (subtle === void 0) throw new CommunityError("CRYPTO_UNAVAILABLE", "Cursor decryption is unavailable in this runtime");
    if (envelope[0] !== 1 || envelope.byteLength < 30) throw new Error("invalid cursor envelope");
    const key = await subtle.importKey("raw", arrayBuffer(keyBytes), "AES-GCM", false, ["decrypt"]);
    const plaintext = await subtle.decrypt({ name: "AES-GCM", iv: arrayBuffer(envelope.slice(1, 13)), additionalData: arrayBuffer(CURSOR_AAD) }, key, arrayBuffer(envelope.slice(13)));
    return new Uint8Array(plaintext);
  }
  function validatePayload(value) {
    if (typeof value !== "object" || value === null) throw new CommunityError("CURSOR_INVALID", "Cursor payload must be an object");
    const payload = value;
    if (payload.version !== 1 || !bounded(payload.snapshotId) || !bounded(payload.planHash) || !bounded(payload.authorizationFingerprint) || !bounded(payload.objectId) || !Array.isArray(payload.sortKey) || payload.sortKey.length > 32 || payload.sortKey.some(invalidScalar)) {
      throw new CommunityError("CURSOR_INVALID", "Cursor payload fields are invalid");
    }
  }
  function invalidScalar(value) {
    return value !== null && (typeof value !== "string" && typeof value !== "number" && typeof value !== "boolean" || typeof value === "number" && !Number.isFinite(value));
  }
  function bounded(value) {
    return typeof value === "string" && value.length > 0 && value.length <= 512;
  }
  function base64Url(value) {
    let binary = "";
    for (const byte of value) binary += String.fromCharCode(byte);
    return btoa(binary).replaceAll("+", "-").replaceAll("/", "_").replace(/=+$/u, "");
  }
  function fromBase64Url(value) {
    if (!/^[A-Za-z0-9_-]+$/u.test(value)) throw new Error("invalid base64url");
    const standard = value.replaceAll("-", "+").replaceAll("_", "/");
    const binary = atob(standard.padEnd(Math.ceil(standard.length / 4) * 4, "="));
    return Uint8Array.from(binary, (character) => character.charCodeAt(0));
  }
  function arrayBuffer(value) {
    return Uint8Array.from(value).buffer;
  }

  // packages/Epoch.Community.Core/src/search-backend.ts
  var _entities, _snapshots, _registry, _cursor, _closed, _ReferenceSearchBackend_instances, candidates_fn, ensureOpen_fn;
  var ReferenceSearchBackend = class {
    constructor(options) {
      __privateAdd(this, _ReferenceSearchBackend_instances);
      __publicField(this, "backendId", "epoch-reference");
      __publicField(this, "backendVersion", "1");
      __privateAdd(this, _entities, /* @__PURE__ */ new Map());
      __privateAdd(this, _snapshots, /* @__PURE__ */ new Map());
      __privateAdd(this, _registry);
      __privateAdd(this, _cursor);
      __privateAdd(this, _closed, false);
      __privateSet(this, _registry, options.registry);
      __privateSet(this, _cursor, createKeysetCursorCodec({ key: options.cursorKey }));
    }
    async apply(changes) {
      __privateMethod(this, _ReferenceSearchBackend_instances, ensureOpen_fn).call(this);
      const next = new Map(__privateGet(this, _entities));
      for (const ref of changes.deletes) next.delete(ref.objectId);
      for (const entity of changes.upserts) next.set(entity.ref.objectId, entity);
      __privateGet(this, _entities).clear();
      for (const [id, entity] of next) __privateGet(this, _entities).set(id, entity);
    }
    async rebuild(input) {
      __privateMethod(this, _ReferenceSearchBackend_instances, ensureOpen_fn).call(this);
      const next = /* @__PURE__ */ new Map();
      for await (const entity of input) next.set(entity.ref.objectId, entity);
      __privateGet(this, _entities).clear();
      for (const [id, entity] of next) __privateGet(this, _entities).set(id, entity);
      __privateGet(this, _snapshots).clear();
    }
    async search(plan, page, signal) {
      __privateMethod(this, _ReferenceSearchBackend_instances, ensureOpen_fn).call(this);
      abort(signal);
      const candidates = __privateMethod(this, _ReferenceSearchBackend_instances, candidates_fn).call(this, plan, signal);
      let start = 0;
      if (page.after !== void 0) {
        const cursor = await __privateGet(this, _cursor).decode(page.after, binding(plan));
        start = candidates.findIndex((candidate) => candidate.entity.ref.objectId === cursor.objectId && equalKeys(candidate.hit.sortKey, cursor.sortKey)) + 1;
        if (start === 0) start = candidates.length;
      }
      abort(signal);
      const selected = candidates.slice(start, start + page.first);
      const cursors = await Promise.all(selected.map((candidate) => __privateGet(this, _cursor).encode({
        version: 1,
        snapshotId: plan.snapshot.snapshotId,
        planHash: plan.planHash,
        authorizationFingerprint: plan.authorizationFingerprint,
        sortKey: candidate.hit.sortKey,
        objectId: candidate.entity.ref.objectId
      })));
      return Object.freeze({
        hits: Object.freeze(selected.map(({ hit }) => hit)),
        pageInfo: Object.freeze({
          hasNextPage: start + selected.length < candidates.length,
          ...cursors[0] === void 0 ? {} : { startCursor: cursors[0] },
          ...cursors.at(-1) === void 0 ? {} : { endCursor: cursors.at(-1) }
        }),
        snapshot: plan.snapshot,
        completeness: completeness(plan.snapshot.sourceCheckpoints)
      });
    }
    async facets(plan, fields) {
      __privateMethod(this, _ReferenceSearchBackend_instances, ensureOpen_fn).call(this);
      const visible = __privateMethod(this, _ReferenceSearchBackend_instances, candidates_fn).call(this, plan);
      return Object.freeze(fields.map((field2) => {
        const definition = __privateGet(this, _registry).resolve(field2);
        if (definition?.facetable !== true || !plan.canObserveField(field2)) return { field: field2, values: [] };
        const counts = /* @__PURE__ */ new Map();
        for (const { entity } of visible) for (const value of searchFieldValues(entity, definition.name)) {
          const key = JSON.stringify(value);
          const current = counts.get(key) ?? { value, count: 0 };
          counts.set(key, { value, count: current.count + 1 });
        }
        return Object.freeze({ field: definition.name, values: Object.freeze([...counts.values()].sort((a, b) => b.count - a.count || scalarCompare(a.value, b.value))) });
      }));
    }
    async suggest(input) {
      __privateMethod(this, _ReferenceSearchBackend_instances, ensureOpen_fn).call(this);
      const definition = __privateGet(this, _registry).resolve(input.field);
      if (definition === void 0 || !input.plan.canObserveField(input.field) || !definition.searchable && !definition.facetable) return [];
      const prefix = normalize(input.prefix);
      const counts = /* @__PURE__ */ new Map();
      for (const { entity } of __privateMethod(this, _ReferenceSearchBackend_instances, candidates_fn).call(this, input.plan)) for (const value of searchFieldValues(entity, definition.name)) {
        if (typeof value !== "string" || !normalize(value).startsWith(prefix)) continue;
        counts.set(value, (counts.get(value) ?? 0) + 1);
      }
      return Object.freeze([...counts].map(([value, count]) => ({ value, count })).sort((a, b) => b.count - a.count || a.value.localeCompare(b.value, "en")).slice(0, input.limit));
    }
    async explain(plan) {
      const safeExpression = JSON.parse(JSON.stringify(plan.expression));
      return Object.freeze({
        planHash: plan.planHash,
        backendId: this.backendId,
        expression: safeExpression,
        sourcePlans: Object.freeze(plan.sourcePlans.map((source) => ({
          sourceId: source.sourceId,
          pushdown: JSON.parse(JSON.stringify(source.pushdown)),
          residual: JSON.parse(JSON.stringify(source.residual))
        }))),
        ordering: Object.freeze(plan.order.map((order) => `${order.field}:${order.direction}:${order.nulls}`)),
        authorization: "pre-filtered"
      });
    }
    async close() {
      __privateSet(this, _closed, true);
      __privateGet(this, _entities).clear();
      __privateGet(this, _snapshots).clear();
    }
  };
  _entities = new WeakMap();
  _snapshots = new WeakMap();
  _registry = new WeakMap();
  _cursor = new WeakMap();
  _closed = new WeakMap();
  _ReferenceSearchBackend_instances = new WeakSet();
  candidates_fn = function(plan, signal) {
    const cacheKey = `${plan.snapshot.snapshotId}:${plan.planHash}:${plan.authorizationFingerprint}`;
    const cached = __privateGet(this, _snapshots).get(cacheKey);
    if (cached !== void 0) return cached;
    const candidates = [];
    let inspected = 0;
    for (const entity of __privateGet(this, _entities).values()) {
      inspected += 1;
      if (inspected % 256 === 0) abort(signal);
      if (!plan.canRead(entity)) continue;
      const evaluation = evaluateSearchExpression(entity, plan.expression, {
        resolveEntity: (objectId) => {
          const resolved = __privateGet(this, _entities).get(objectId);
          return resolved !== void 0 && plan.canRead(resolved) ? resolved : void 0;
        },
        relationsFor: (objectId) => [...__privateGet(this, _entities).values()].filter(plan.canRead).flatMap((candidate) => candidate.relations).filter((relation) => relation.source.objectId === objectId || relation.target.objectId === objectId)
      });
      if (!evaluation.matches) continue;
      const sortKey = plan.order.map((order) => searchFieldValues(entity, order.field)[0] ?? null);
      candidates.push({
        entity,
        hit: Object.freeze({
          target: entity.ref,
          sortKey: Object.freeze(sortKey),
          matchedFields: evaluation.matchedFields,
          provenance: entity.provenance
        })
      });
    }
    candidates.sort((left, right) => compareCandidates2(left, right, plan));
    const frozen = Object.freeze(candidates);
    __privateGet(this, _snapshots).set(cacheKey, frozen);
    if (__privateGet(this, _snapshots).size > 32) __privateGet(this, _snapshots).delete(__privateGet(this, _snapshots).keys().next().value);
    return frozen;
  };
  ensureOpen_fn = function() {
    if (__privateGet(this, _closed)) throw new Error("Search backend is closed");
  };
  function compareCandidates2(left, right, plan) {
    for (let index = 0; index < plan.order.length; index += 1) {
      const order = plan.order[index];
      const a = left.hit.sortKey[index] ?? null;
      const b = right.hit.sortKey[index] ?? null;
      if (a === b) continue;
      if (a === null) return order?.nulls === "first" ? -1 : 1;
      if (b === null) return order?.nulls === "first" ? 1 : -1;
      const result = scalarCompare(a, b);
      if (result !== 0) return order?.direction === "descending" ? -result : result;
    }
    return left.entity.ref.objectId.localeCompare(right.entity.ref.objectId, "en");
  }
  function scalarCompare(left, right) {
    if (left === right) return 0;
    if (left === null) return -1;
    if (right === null) return 1;
    if (typeof left === "number" && typeof right === "number") return left - right;
    if (typeof left === "boolean" && typeof right === "boolean") return Number(left) - Number(right);
    return String(left).localeCompare(String(right), "en", { sensitivity: "variant" });
  }
  function equalKeys(left, right) {
    return left.length === right.length && left.every((value, index) => value === right[index]);
  }
  function binding(plan) {
    return { snapshotId: plan.snapshot.snapshotId, planHash: plan.planHash, authorizationFingerprint: plan.authorizationFingerprint };
  }
  function completeness(checkpoints) {
    const omittedSources = checkpoints.filter((source) => source.status === "unavailable").map((source) => source.sourceId);
    const status = checkpoints.some((source) => source.status === "unavailable" || source.status === "partial") ? "partial" : checkpoints.some((source) => source.status === "stale") ? "stale" : "complete";
    return Object.freeze({ status, sources: checkpoints, omittedSources: Object.freeze(omittedSources), unsupportedPredicates: Object.freeze([]) });
  }
  function abort(signal) {
    if (signal?.aborted === true) throw new DOMException("Search was cancelled", "AbortError");
  }
  function normalize(value) {
    return value.normalize("NFKC").toLocaleLowerCase("en-US");
  }

  // packages/Epoch.Community.Core/src/search-plan.ts
  function createSearchPlan(input) {
    const maxSources = input.limits?.maxSources ?? 32;
    const maxLimit = input.limits?.maxLimit ?? 1e3;
    if (input.sources.length > maxSources) throw new CommunityError("QUERY_COST_LIMIT", `Query exceeds the ${maxSources} source fanout limit`);
    if (!Number.isSafeInteger(input.limit) || input.limit < 1 || input.limit > maxLimit) throw new CommunityError("QUERY_COST_LIMIT", `Query result limit must be between 1 and ${maxLimit}`);
    validateExpression(input.expression, input.registry, input.authorization);
    const order = totalOrder(input.order, input.registry, input.authorization);
    const sourcePlans = input.sources.map((source) => partitionSource(input.expression, source));
    const cost = sourcePlans.reduce((total, source) => total + source.estimatedCost, 0);
    const maxCost = input.limits?.maxCost ?? 1e4;
    if (cost > maxCost) throw new CommunityError("QUERY_COST_LIMIT", `Query estimated cost ${cost} exceeds limit ${maxCost}`, { estimatedCost: cost, maxCost });
    const planHash = stableQueryHash(JSON.stringify({
      version: 1,
      expression: JSON.parse(canonicalExpressionJson(input.expression)),
      order,
      sources: sourcePlans.map(({ sourceId, pushdown, residual, checkpoint }) => ({
        sourceId,
        pushdown: JSON.parse(canonicalExpressionJson(pushdown)),
        residual: JSON.parse(canonicalExpressionJson(residual)),
        checkpoint: checkpoint.token
      })),
      authorizationFingerprint: input.authorizationFingerprint,
      limit: input.limit
    }));
    const snapshot = Object.freeze({ ...input.snapshot, planHash });
    return Object.freeze({
      planVersion: 1,
      planHash,
      expression: input.expression,
      order,
      sourcePlans: Object.freeze(sourcePlans),
      residual: input.expression,
      authorizationFingerprint: input.authorizationFingerprint,
      snapshot,
      limit: input.limit,
      canRead: (entity) => input.canRead?.(entity, input.authorization) ?? defaultCanRead(entity, input.authorization),
      canObserveField: (name) => {
        const definition = input.registry.resolve(name);
        return definition !== void 0 && input.registry.list(input.authorization).includes(definition);
      }
    });
  }
  function validateExpression(expression, registry, authorization) {
    switch (expression.kind) {
      case "all":
        return;
      case "and":
      case "or":
        expression.terms.forEach((term) => validateExpression(term, registry, authorization));
        return;
      case "not":
        validateExpression(expression.term, registry, authorization);
        return;
      case "related":
        if (expression.maxDepth < 1 || expression.maxDepth > 8) throw new CommunityError("QUERY_COST_LIMIT", "Relation depth must be between 1 and 8");
        return;
      case "text":
        for (const name of expression.fields) requireField(name, expression.mode, registry, authorization);
        return;
      case "exists":
        requireField(expression.field, "exists", registry, authorization);
        return;
      case "range":
        requireField(expression.field, "gte", registry, authorization);
        return;
      case "compare":
        requireField(expression.field, expression.operator, registry, authorization);
        return;
    }
  }
  function requireField(name, operator, registry, authorization) {
    const field2 = registry.resolve(name);
    const visible = registry.list(authorization).some((candidate) => candidate.name === field2?.name);
    if (field2 === void 0 || !visible) throw new CommunityError("QUERY_UNKNOWN_FIELD", `Unknown or unavailable query field: ${name}`, { suggestions: registry.suggest(name, authorization) });
    if (!field2.operators.includes(operator)) throw new CommunityError("QUERY_INVALID_OPERATOR", `${operator} is not supported for ${field2.name}`);
  }
  function totalOrder(input, registry, authorization) {
    const result = [...input];
    if (result.length === 0) result.push({ field: "updatedAt", direction: "descending", nulls: "last" });
    for (const order of result) {
      const field2 = registry.resolve(order.field);
      if (field2 === void 0 || !registry.list(authorization).includes(field2) || !field2.sortable) throw new CommunityError("QUERY_INVALID_OPERATOR", `Field is not sortable: ${order.field}`);
    }
    for (const field2 of ["kind", "objectId"]) {
      if (!result.some((order) => order.field === field2)) result.push({ field: field2, direction: "ascending", nulls: "last" });
    }
    return Object.freeze(result);
  }
  function partitionSource(expression, source) {
    const [pushdown, residual] = partition(expression, source);
    return Object.freeze({
      sourceId: source.sourceId,
      pushdown,
      residual,
      checkpoint: source.checkpoint,
      estimatedCost: estimate(expression)
    });
  }
  function partition(expression, source) {
    if (expression.kind === "and") {
      const pushed = [];
      const residual = [];
      for (const term of expression.terms) {
        const [left, right] = partition(term, source);
        if (left.kind !== "all") pushed.push(left);
        if (right.kind !== "all") residual.push(right);
      }
      return [combineAnd(pushed), combineAnd(residual)];
    }
    return supported(expression, source) ? [expression, { kind: "all" }] : [{ kind: "all" }, expression];
  }
  function supported(expression, source) {
    switch (expression.kind) {
      case "all":
        return true;
      case "and":
      case "or":
        return expression.terms.every((term) => supported(term, source));
      case "not":
        return supported(expression.term, source);
      case "related":
        return source.supportsRelations;
      case "text":
        return source.fullText !== "none" && expression.fields.every((field2) => source.fields[field2]?.operators.includes(expression.mode));
      case "range":
        return source.fields[expression.field]?.operators.includes("gte") === true;
      case "exists":
        return source.fields[expression.field]?.operators.includes("exists") === true;
      case "compare":
        return source.fields[expression.field]?.operators.includes(expression.operator) === true;
    }
  }
  function combineAnd(terms) {
    return terms.length === 0 ? { kind: "all" } : terms.length === 1 ? terms[0] : { kind: "and", terms };
  }
  function estimate(expression) {
    switch (expression.kind) {
      case "all":
        return 1;
      case "and":
      case "or":
        return 1 + expression.terms.reduce((total, term) => total + estimate(term), 0);
      case "not":
        return 1 + estimate(expression.term);
      case "text":
        return 3 + expression.value.length;
      case "related":
        return 10 * expression.maxDepth;
      default:
        return 2;
    }
  }
  function defaultCanRead(entity, authorization) {
    if (entity.ref.kind === "dm") return authorization.actorId !== void 0 && (entity.participantIds.includes(authorization.actorId) || authorization.readableDmIds?.includes(entity.ref.objectId) === true);
    if (entity.visibility === "public") return true;
    if (authorization.actorId === void 0) return false;
    return entity.ownerId === authorization.actorId || entity.visibility === "shared" && entity.participantIds.includes(authorization.actorId);
  }

  // packages/Epoch.Community.Core/src/snapshot.ts
  async function createSearchSnapshot(input) {
    const createdAt = input.context.clock.now().toISOString();
    return Object.freeze({
      snapshotId: input.context.nextId("snapshot"),
      createdAt,
      resolvedNow: createdAt,
      timezone: input.context.timezone,
      locale: input.context.locale,
      queryHash: input.queryHash,
      planHash: input.planHash,
      fieldRegistryVersion: input.fieldRegistryVersion,
      analyzerVersion: input.analyzerVersion,
      authorizationFingerprint: await authorizationFingerprint(input.authorization),
      sourceCheckpoints: Object.freeze([...input.sourceCheckpoints].sort((a, b) => a.sourceId.localeCompare(b.sourceId, "en")))
    });
  }

  // packages/Epoch.Community.Core/src/source.ts
  async function applyCommunityChangeSetAtomically(changes, targets) {
    const staged = [];
    try {
      for (const target of targets) staged.push({ target, prepared: await target.stage(changes) });
      for (const entry of staged) await entry.prepared.commit();
    } catch (error) {
      for (const { target, prepared } of [...staged].reverse()) {
        try {
          await prepared.rollback();
        } catch {
        }
        try {
          await target.markStale(error);
        } catch {
        }
      }
      throw new CommunityError("INDEX_STALE", "Atomic community change ingestion failed; affected targets were marked stale", {
        sourceId: changes.sourceId,
        checkpoint: changes.checkpoint.token
      }, { cause: error });
    }
  }
  function validateSourceCapabilities(value) {
    if (value.sourceId.length === 0 || value.sourceId.length > 128 || !/^[a-z0-9][a-z0-9._-]*$/u.test(value.sourceId)) {
      throw new CommunityError("QUERY_UNSUPPORTED_SOURCE", "Source ID must be a bounded lowercase token");
    }
    if (!Number.isSafeInteger(value.maxPageSize) || value.maxPageSize < 1 || value.maxPageSize > 1e4) {
      throw new CommunityError("QUERY_UNSUPPORTED_SOURCE", "Source maxPageSize is invalid");
    }
    return Object.freeze({ ...value, fields: Object.freeze({ ...value.fields }) });
  }
  var sourceCursors = /* @__PURE__ */ new Map();
  function sourceKeysetCursor(sourceId, objectId) {
    const bytes = globalThis.crypto?.getRandomValues(new Uint8Array(24));
    if (bytes === void 0) throw new CommunityError("CRYPTO_UNAVAILABLE", "Source cursor generation is unavailable");
    const token = base64Url2(bytes);
    sourceCursors.set(token, { sourceId, objectId });
    if (sourceCursors.size > 4096) sourceCursors.delete(sourceCursors.keys().next().value);
    return token;
  }
  function decodeSourceKeysetCursor(cursor, sourceId) {
    if (!/^[A-Za-z0-9_-]{32}$/u.test(cursor)) throw new CommunityError("CURSOR_INVALID", "Source cursor is invalid");
    const payload = sourceCursors.get(cursor);
    if (payload === void 0 || payload.sourceId !== sourceId) throw new CommunityError("CURSOR_STALE", "Source cursor does not belong to this source snapshot");
    return payload.objectId;
  }
  function abortSource(signal) {
    if (signal.aborted) throw new DOMException("Source operation was cancelled", "AbortError");
  }
  function boundedSourcePageSize(requested, capabilities) {
    if (!Number.isSafeInteger(requested) || requested < 1) throw new CommunityError("QUERY_COST_LIMIT", "Source page size must be a positive integer");
    return Math.min(requested, capabilities.maxPageSize);
  }
  function base64Url2(value) {
    let binary = "";
    for (const byte of value) binary += String.fromCharCode(byte);
    return btoa(binary).replaceAll("+", "-").replaceAll("/", "_").replace(/=+$/u, "");
  }

  // packages/Epoch.Community.Core/src/search-service.ts
  var _backend, _registry2, _context, _sources;
  var SearchService = class {
    constructor(input) {
      __privateAdd(this, _backend);
      __privateAdd(this, _registry2);
      __privateAdd(this, _context);
      __privateAdd(this, _sources);
      __privateSet(this, _backend, input.backend);
      __privateSet(this, _registry2, input.registry);
      __privateSet(this, _context, input.context);
      __privateSet(this, _sources, input.sources);
    }
    async plan(input) {
      const queryHash = stableQueryHash(canonicalExpressionJson(input.expression));
      if (input.snapshot !== void 0) {
        const fingerprint = await authorizationFingerprint(input.authorization);
        if (input.snapshot.authorizationFingerprint !== fingerprint || input.snapshot.queryHash !== queryHash || input.snapshot.fieldRegistryVersion !== __privateGet(this, _registry2).version || !sameCheckpoints(input.snapshot.sourceCheckpoints, __privateGet(this, _sources).map((source) => source.checkpoint))) {
          throw new CommunityError("CURSOR_STALE", "Search snapshot does not match the query, sources, field registry, or authorization context");
        }
      }
      const seed = input.snapshot ?? await createSearchSnapshot({
        context: __privateGet(this, _context),
        queryHash,
        planHash: "pending",
        fieldRegistryVersion: __privateGet(this, _registry2).version,
        analyzerVersion: "epoch-tokenizer-v1",
        authorization: input.authorization,
        sourceCheckpoints: __privateGet(this, _sources).map((source) => source.checkpoint)
      });
      return createSearchPlan({
        expression: input.expression,
        order: input.order,
        sources: __privateGet(this, _sources),
        registry: __privateGet(this, _registry2),
        authorization: input.authorization,
        authorizationFingerprint: seed.authorizationFingerprint,
        snapshot: seed,
        limit: input.limit
      });
    }
    async search(input) {
      if (input.signal?.aborted === true) throw new DOMException("Search was cancelled", "AbortError");
      const plan = await this.plan({
        expression: input.expression,
        order: input.order,
        authorization: input.authorization,
        limit: input.first,
        ...input.snapshot === void 0 ? {} : { snapshot: input.snapshot }
      });
      const page = { first: input.first, ...input.after === void 0 ? {} : { after: input.after } };
      return __privateGet(this, _backend).search(plan, page, input.signal);
    }
  };
  _backend = new WeakMap();
  _registry2 = new WeakMap();
  _context = new WeakMap();
  _sources = new WeakMap();
  function sameCheckpoints(left, right) {
    const ordered = (values2) => [...values2].sort((a2, b2) => a2.sourceId.localeCompare(b2.sourceId, "en"));
    const a = ordered(left);
    const b = ordered(right);
    return a.length === b.length && a.every((value, index) => {
      const other = b[index];
      return other !== void 0 && value.sourceId === other.sourceId && value.token === other.token && value.observedAt === other.observedAt && value.status === other.status;
    });
  }
  async function createSearchServiceFromSources(input) {
    const maxPages = input.maxPagesPerSource ?? 1e3;
    const maxEntities = input.maxEntities ?? 1e5;
    if (input.sources.length > 32 || !Number.isSafeInteger(maxPages) || maxPages < 1 || !Number.isSafeInteger(maxEntities) || maxEntities < 1) {
      throw new CommunityError("QUERY_COST_LIMIT", "Registered source hydration exceeds configured bounds");
    }
    const configured = input.sources.map((source) => {
      const capabilities = validateSourceCapabilities(source.capabilities());
      if (capabilities.sourceId !== source.sourceId) {
        throw new CommunityError("QUERY_UNSUPPORTED_SOURCE", "Source capability identity does not match its registered identity");
      }
      return { source, capabilities };
    });
    if (new Set(configured.map(({ source }) => source.sourceId)).size !== configured.length) {
      throw new CommunityError("QUERY_UNSUPPORTED_SOURCE", "Registered source IDs must be unique");
    }
    const failureObservedAt = input.context.clock.now().toISOString();
    const scans = await Promise.all(configured.map(({ source, capabilities }) => scanSource({
      source,
      capabilities,
      authorization: input.authorization,
      failureObservedAt,
      pageSize: input.pageSize ?? 1e3,
      maxPages,
      signal: input.signal
    })));
    const entities = /* @__PURE__ */ new Map();
    for (const scan of scans) for (const entity of scan.entities) {
      if (!canReadCommunityResource({
        kind: entity.ref.kind,
        resourceId: entity.ref.objectId,
        visibility: entity.visibility,
        ownerId: entity.ownerId,
        participantIds: entity.participantIds
      }, input.authorization)) continue;
      if (entities.has(entity.ref.objectId)) {
        throw new CommunityError("INVALID_ENTITY", "Multiple registered sources produced the same canonical Entity without an authoritative reconciliation", {
          objectId: entity.ref.objectId
        });
      }
      entities.set(entity.ref.objectId, entity);
      if (entities.size > maxEntities) throw new CommunityError("QUERY_COST_LIMIT", `Registered sources exceed the ${maxEntities} Entity hydration limit`);
    }
    await input.backend.rebuild(entities.values());
    return new SearchService({
      backend: input.backend,
      registry: input.registry,
      context: input.context,
      sources: scans.map(({ capabilities, checkpoint }) => planningSource(capabilities, checkpoint))
    });
  }
  async function scanSource(input) {
    const unavailable = () => ({
      sourceId: input.source.sourceId,
      token: "unavailable",
      observedAt: input.failureObservedAt,
      status: "unavailable",
      detail: "The registered source could not provide a verified page"
    });
    try {
      if (input.signal !== void 0) abortSource(input.signal);
      let checkpoint = await input.source.checkpoint();
      if (checkpoint.sourceId !== input.source.sourceId) throw new Error("checkpoint source mismatch");
      let observedAt = validObservedAt(checkpoint.observedAt);
      const entities = [];
      const cursors = /* @__PURE__ */ new Set();
      let after;
      for (let pageNumber = 0; pageNumber < input.maxPages; pageNumber += 1) {
        if (input.signal !== void 0) abortSource(input.signal);
        const page = await input.source.scan({
          ...after === void 0 ? {} : { after },
          limit: boundedSourcePageSize(input.pageSize, input.capabilities),
          authorization: input.authorization
        });
        if (page.checkpoint.sourceId !== input.source.sourceId) throw new Error("page checkpoint source mismatch");
        const pageObservedAt = validObservedAt(page.checkpoint.observedAt);
        if (page.checkpoint.status === "current" && pageObservedAt < observedAt) throw new Error("source checkpoint regressed");
        entities.push(...page.entities);
        checkpoint = page.checkpoint;
        observedAt = pageObservedAt;
        if (page.next === void 0) return { entities: Object.freeze(entities), capabilities: input.capabilities, checkpoint };
        if (input.capabilities.pagination === "none" || cursors.has(page.next)) throw new Error("source pagination did not advance");
        cursors.add(page.next);
        after = page.next;
      }
      return { entities: [], capabilities: input.capabilities, checkpoint: unavailable() };
    } catch (error) {
      if (error instanceof DOMException && error.name === "AbortError") throw error;
      return { entities: [], capabilities: input.capabilities, checkpoint: unavailable() };
    }
  }
  function validObservedAt(value) {
    const timestamp = Date.parse(value);
    if (!Number.isFinite(timestamp) || new Date(timestamp).toISOString() !== value) throw new Error("source checkpoint time is invalid");
    return timestamp;
  }
  function planningSource(capabilities, checkpoint) {
    return Object.freeze({
      sourceId: capabilities.sourceId,
      fields: Object.freeze(Object.fromEntries(Object.entries(capabilities.fields).map(([name, field2]) => [name, {
        operators: field2.operators,
        sortable: field2.sortable,
        facetable: field2.facetable
      }]))),
      fullText: capabilities.fullText,
      supportsRelations: capabilities.supportsRelations,
      checkpoint
    });
  }

  // packages/Epoch.Community.Core/src/projection-definition.ts
  var PROJECTION_DEFINITION_API_VERSION = "epoch.dev/v1alpha1";

  // packages/Epoch.Community.Core/src/builtin-projections.ts
  var branch = (nodeId, segment, objectKinds) => ({
    nodeId,
    kind: "literal",
    segment,
    children: [{
      nodeId: `${nodeId}-select`,
      kind: "select",
      objectKinds,
      order: [
        { field: "updatedAt", direction: "descending", nulls: "last" },
        { field: "objectId", direction: "ascending", nulls: "last" }
      ],
      children: [{
        nodeId: `${nodeId}-leaf`,
        kind: "leaf",
        segment: { template: "{slug(coalesce(title, objectId))}" },
        representation: "default"
      }]
    }]
  });
  var defaultProjection = {
    apiVersion: PROJECTION_DEFINITION_API_VERSION,
    projectionId: "builtin:default",
    version: 1,
    label: "Epoch default",
    visibility: "public",
    root: {
      nodeId: "root",
      kind: "literal",
      segment: "",
      children: [
        branch("projects", "projects", ["project"]),
        branch("spaces", "spaces", ["channel"]),
        branch("dms", "dms", ["dm"]),
        branch("notifications", "notifications", ["notification"]),
        branch("agents", ".agents", ["agent"]),
        branch("members", "members", ["member"]),
        branch("search", "search", ["projection"]),
        branch("views", "views", ["projection"])
      ]
    },
    order: [
      { field: "updatedAt", direction: "descending", nulls: "last" },
      { field: "objectId", direction: "ascending", nulls: "last" }
    ],
    updateMode: "live",
    consistency: "current"
  };
  var builtinDefaultProjection = Object.freeze(defaultProjection);

  // packages/Epoch.Community.Core/src/projection-compiler.ts
  var NODE_ID = /^[A-Za-z0-9][A-Za-z0-9._~-]{0,127}$/u;
  var FIELD = /^[A-Za-z][A-Za-z0-9._-]{0,127}$/u;
  var FUNCTIONS = /* @__PURE__ */ new Set(["slug", "shortId", "date", "lower", "upper", "coalesce", "pad", "truncate", "replace"]);
  var RECOVERY_SEGMENT = ".epoch";
  var RELATIONS = /* @__PURE__ */ new Set(["reply", "quote", "mention", "provenance", "promotion", "replacement", "moderation", "attachment", "backlink"]);
  var OBJECT_KINDS = /* @__PURE__ */ new Set([
    "message",
    "thread",
    "channel",
    "dm",
    "notification",
    "projection",
    "project",
    "issue",
    "change",
    "member",
    "agent",
    "artifact",
    "tombstone"
  ]);
  var ProjectionCompileError = class extends Error {
    constructor(diagnostics) {
      super(`PROJECTION_INVALID: ${diagnostics.map((item) => `${item.pointer}: ${item.message}`).join("; ")}`);
      __publicField(this, "diagnostics", diagnostics);
      __publicField(this, "code", "PROJECTION_INVALID");
    }
  };
  function compileProjectionDefinition(definition, context) {
    const diagnostics = [];
    const fields = new Set(context.fields);
    const sortable = new Set(context.sortableFields);
    const nodeIds = /* @__PURE__ */ new Set();
    const active = /* @__PURE__ */ new Set();
    let nodeCount = 0;
    let maximumDepth = 0;
    let estimatedFanout = 1;
    if (definition.apiVersion !== PROJECTION_DEFINITION_API_VERSION) problem(diagnostics, "PROJECTION_INVALID", "/apiVersion", "Unsupported projection API version");
    try {
      validateDefinitionId(definition.projectionId);
    } catch (error) {
      problem(diagnostics, "PROJECTION_INVALID", "/projectionId", message(error));
    }
    if (!Number.isInteger(definition.version) || definition.version < 1) problem(diagnostics, "PROJECTION_INVALID", "/version", "Version must be a positive integer");
    if (typeof definition.label !== "string" || definition.label.trim().length === 0 || definition.label.length > 160) problem(diagnostics, "PROJECTION_INVALID", "/label", "Label must be non-empty and at most 160 characters");
    if (!["private", "shared", "public"].includes(definition.visibility)) problem(diagnostics, "PROJECTION_INVALID", "/visibility", "Unsupported projection visibility");
    if (!["live", "queued", "snapshot"].includes(definition.updateMode)) problem(diagnostics, "PROJECTION_INVALID", "/updateMode", "Unsupported update mode");
    if (!["current", "session-snapshot", "fixed-snapshot"].includes(definition.consistency)) problem(diagnostics, "PROJECTION_INVALID", "/consistency", "Unsupported consistency mode");
    validateLimits(context, diagnostics);
    validateDefinitionLimits(definition, context, diagnostics);
    for (const field2 of ["kind", "objectId"]) if (!fields.has(field2) || !sortable.has(field2)) {
      problem(diagnostics, "PROJECTION_UNSTABLE_ORDER", "/order", `Canonical tie-breaker ${field2} must be visible and sortable`);
    }
    validateOrders(definition.order, "/order", fields, sortable, diagnostics);
    const visit = (node, pointer, depth, isRoot = false) => {
      nodeCount += 1;
      maximumDepth = Math.max(maximumDepth, depth);
      if (nodeCount > context.limits.maxNodes) problem(diagnostics, "PROJECTION_LIMIT", pointer, `Projection exceeds ${context.limits.maxNodes} nodes`);
      if (depth > context.limits.maxDepth) problem(diagnostics, "PROJECTION_LIMIT", pointer, `Projection exceeds depth ${context.limits.maxDepth}`);
      if (active.has(node)) {
        problem(diagnostics, "PROJECTION_CYCLE", pointer, "Projection node graph contains a cycle");
        return;
      }
      active.add(node);
      if (!NODE_ID.test(node.nodeId)) problem(diagnostics, "PROJECTION_INVALID", `${pointer}/nodeId`, "nodeId must be an opaque URL-safe identifier");
      if (nodeIds.has(node.nodeId)) problem(diagnostics, "PROJECTION_COLLISION", `${pointer}/nodeId`, `Duplicate nodeId ${node.nodeId}`);
      nodeIds.add(node.nodeId);
      switch (node.kind) {
        case "literal":
          validateLiteralSegment(node.segment, `${pointer}/segment`, diagnostics, isRoot);
          validateChildren(node.children, pointer, depth);
          break;
        case "select":
          if (node.objectKinds.length === 0) problem(diagnostics, "PROJECTION_INVALID", `${pointer}/objectKinds`, "select must include at least one object kind");
          for (const [index, kind] of node.objectKinds.entries()) if (!OBJECT_KINDS.has(kind)) problem(diagnostics, "PROJECTION_INVALID", `${pointer}/objectKinds/${index}`, `Unknown object kind ${kind}`);
          if (node.limit !== void 0 && (!Number.isInteger(node.limit) || node.limit < 1 || node.limit > context.limits.maxFanout)) problem(diagnostics, "PROJECTION_LIMIT", `${pointer}/limit`, `select limit must be between 1 and ${context.limits.maxFanout}`);
          estimatedFanout = Math.min(Number.MAX_SAFE_INTEGER, estimatedFanout * (node.limit ?? context.limits.maxFanout));
          if (node.where !== void 0) validateSearchExpression(node.where, `${pointer}/where`, fields, context, diagnostics);
          validateOrders(node.order ?? definition.order, `${pointer}/order`, fields, sortable, diagnostics);
          validateChildren(node.children, pointer, depth);
          break;
        case "group":
          validateField(node.field, `${pointer}/field`, fields, diagnostics);
          validateTemplate(node.segment, `${pointer}/segment`, fields, context, diagnostics);
          validateLiteralSegment(node.missing, `${pointer}/missing`, diagnostics);
          visit(node.child, `${pointer}/child`, depth + 1);
          break;
        case "traverse": {
          if (!RELATIONS.has(node.relation)) problem(diagnostics, "PROJECTION_INVALID", `${pointer}/relation`, `Unknown relation ${node.relation}`);
          const maximum = Math.min(context.limits.maxRelationDepth ?? context.limits.maxDepth, context.limits.maxDepth);
          if (!Number.isInteger(node.maxDepth) || node.maxDepth < 1 || node.maxDepth > maximum) problem(diagnostics, "PROJECTION_LIMIT", `${pointer}/maxDepth`, `Relation depth must be between 1 and ${maximum}`);
          visit(node.child, `${pointer}/child`, depth + 1);
          break;
        }
        case "union":
          if (node.children.length === 0) problem(diagnostics, "PROJECTION_INVALID", `${pointer}/children`, "union must include at least one child");
          validateChildren(node.children, pointer, depth);
          break;
        case "alias":
          try {
            validateObjectRef(node.target);
          } catch (error) {
            problem(diagnostics, "PROJECTION_INVALID", `${pointer}/target`, message(error));
          }
          validateTemplate(node.segment, `${pointer}/segment`, fields, context, diagnostics);
          validateChildren(node.children, pointer, depth);
          break;
        case "leaf":
          validateTemplate(node.segment, `${pointer}/segment`, fields, context, diagnostics);
          if (!["default", "body.md", "metadata.json"].includes(node.representation)) problem(diagnostics, "PROJECTION_INVALID", `${pointer}/representation`, "Unsupported leaf representation");
          break;
        default:
          problem(diagnostics, "PROJECTION_INVALID", pointer, `Unknown projection node kind ${node.kind}`);
      }
      active.delete(node);
      function validateChildren(children, parentPointer, parentDepth) {
        if (children.length > context.limits.maxFanout) problem(diagnostics, "PROJECTION_LIMIT", `${parentPointer}/children`, `Node exceeds fanout ${context.limits.maxFanout}`);
        children.forEach((child, index) => visit(child, `${parentPointer}/children/${index}`, parentDepth + 1));
      }
    };
    visit(definition.root, "/root", 1, true);
    const effectiveOrder = totalOrder2(definition.order);
    if (diagnostics.some((item) => item.severity === "error")) throw new ProjectionCompileError(diagnostics);
    return Object.freeze({
      definition: deepFreeze(cloneJson(definition)),
      canonicalJson: canonicalJson(definition),
      diagnostics: Object.freeze(diagnostics),
      nodeCount,
      maximumDepth,
      estimatedFanout,
      effectiveOrder: Object.freeze(effectiveOrder)
    });
  }
  function renderSegmentTemplate(template, values2, limits = {}) {
    const maxTemplateLength = limits.maxTemplateLength ?? 256;
    const maxSegmentLength = limits.maxSegmentLength ?? 120;
    if (typeof template.template !== "string" || template.template.length === 0 || template.template.length > maxTemplateLength) throw new Error("Projection segment template is empty or too long");
    const fields = /* @__PURE__ */ new Set();
    let output = "";
    let cursor = 0;
    while (cursor < template.template.length) {
      const open2 = template.template.indexOf("{", cursor);
      if (open2 < 0) {
        output += template.template.slice(cursor);
        break;
      }
      output += template.template.slice(cursor, open2);
      const close = matchingBrace(template.template, open2);
      if (close < 0) throw new Error("Projection segment template has an unmatched brace");
      const parser = new TemplateExpressionParser(template.template.slice(open2 + 1, close), values2, fields);
      output += scalar(parser.parse());
      cursor = close + 1;
    }
    const segment = normalizeProjectionSegment(output, maxSegmentLength);
    return Object.freeze({ original: template.template, segment, fields: Object.freeze([...fields].sort()) });
  }
  function normalizeProjectionSegment(value, maximumLength = 120) {
    if (typeof value !== "string" || value.length === 0) throw new Error("Projection segment must not be empty");
    if (value !== value.normalize("NFKC")) throw new Error("Projection segment uses ambiguous Unicode normalization");
    if (value === "." || value === ".." || value.toLowerCase() === RECOVERY_SEGMENT) throw new Error("Projection segment is reserved or unsafe");
    if (value.length > maximumLength) throw new Error(`Projection segment exceeds ${maximumLength} characters`);
    if (value.includes("/") || value.includes("\\") || [...value].some((character) => {
      const code = character.codePointAt(0) ?? 0;
      return code < 32 || code === 127;
    })) throw new Error("Projection segment contains an unsafe path character");
    return value;
  }
  function createProjectionOccurrenceId(identity) {
    validateDefinitionId(identity.projectionId);
    validateObjectRef(identity.target);
    if (!Number.isInteger(identity.projectionVersion) || identity.projectionVersion < 1) throw new Error("Projection occurrence version must be positive");
    if (!NODE_ID.test(identity.nodeId) || !identity.branchId || !identity.parentEntryId) throw new Error("Projection occurrence requires stable node, branch, and parent identity");
    const segment = normalizeProjectionSegment(identity.resolvedSegment);
    return `entry-${stableHash([
      identity.projectionId,
      String(identity.projectionVersion),
      identity.nodeId,
      identity.branchId,
      identity.parentEntryId,
      identity.target.objectId,
      segment
    ].join("\0"))}`;
  }
  function assignProjectionCollisionNames(candidates) {
    const groups = /* @__PURE__ */ new Map();
    const occurrences = /* @__PURE__ */ new Set();
    for (const candidate of candidates) {
      normalizeProjectionSegment(candidate.normalizedSegment);
      const occurrence = `${candidate.target.objectId}\0${candidate.nodeId}\0${candidate.branchId ?? ""}`;
      if (occurrences.has(occurrence)) throw new Error(`PROJECTION_COLLISION: duplicate occurrence ${candidate.target.objectId}/${candidate.nodeId}`);
      occurrences.add(occurrence);
      const values2 = groups.get(candidate.normalizedSegment) ?? [];
      values2.push(candidate);
      groups.set(candidate.normalizedSegment, values2);
    }
    const resolved = /* @__PURE__ */ new Map();
    for (const [name, values2] of groups) {
      const sorted = [...values2].sort((left, right) => compareText(occurrenceKey(left), occurrenceKey(right)));
      const collisionSet = Object.freeze(sorted.map(occurrenceKey));
      const suffixes = uniqueSuffixes(sorted);
      sorted.forEach((candidate, index) => resolved.set(candidate, Object.freeze({
        ...candidate,
        finalName: sorted.length === 1 ? name : `${name.slice(0, 111)}~${suffixes[index]}`,
        collided: sorted.length > 1,
        collisionSet
      })));
    }
    return Object.freeze(candidates.map((candidate) => resolved.get(candidate)));
  }
  function formatProjectionDefinition(definition) {
    return `${JSON.stringify(JSON.parse(canonicalJson(definition)), null, 2)}
`;
  }
  function validateTemplate(template, pointer, fields, context, diagnostics) {
    try {
      const sentinels = Object.fromEntries([...fields].map((field2) => [field2, "2026-01-01T00:00:00Z"]));
      const rendered = renderSegmentTemplate(template, sentinels, context.limits);
      for (const field2 of rendered.fields) validateField(field2, pointer, fields, diagnostics);
    } catch (error) {
      problem(diagnostics, "PROJECTION_INVALID", pointer, message(error));
    }
  }
  function validateLiteralSegment(value, pointer, diagnostics, allowEmpty = false) {
    if (allowEmpty && value === "") return;
    try {
      normalizeProjectionSegment(value);
    } catch (error) {
      problem(diagnostics, "PROJECTION_INVALID", pointer, message(error));
    }
  }
  function validateField(value, pointer, fields, diagnostics) {
    if (!FIELD.test(value) || !fields.has(value)) problem(diagnostics, "PROJECTION_UNKNOWN_FIELD", pointer, `Unknown or inaccessible field ${value}`);
  }
  function validateOrders(orders, pointer, fields, sortable, diagnostics) {
    if (orders.length === 0) problem(diagnostics, "PROJECTION_UNSTABLE_ORDER", pointer, "Projection order must be explicit");
    orders.forEach((order, index) => {
      validateField(order.field, `${pointer}/${index}/field`, fields, diagnostics);
      if (!sortable.has(order.field)) problem(diagnostics, "PROJECTION_UNSTABLE_ORDER", `${pointer}/${index}/field`, `Field ${order.field} is not sortable`);
      if (!["ascending", "descending"].includes(order.direction) || !["first", "last"].includes(order.nulls)) problem(diagnostics, "PROJECTION_INVALID", `${pointer}/${index}`, "Invalid sort direction or null order");
    });
  }
  function validateLimits(context, diagnostics) {
    for (const [name, value] of Object.entries(context.limits)) {
      if (value !== void 0 && (!Number.isInteger(value) || value < 1 || value > 1e6)) problem(diagnostics, "PROJECTION_LIMIT", `/limits/${name}`, `${name} must be a bounded positive integer`);
    }
  }
  function validateDefinitionLimits(definition, context, diagnostics) {
    if (definition.limits === void 0) return;
    const maximums = {
      maxDepth: context.limits.maxDepth,
      maxEntriesPerDirectory: context.limits.maxFanout,
      maxTotalEntries: 1e6,
      maxRelationDepth: context.limits.maxRelationDepth ?? context.limits.maxDepth
    };
    for (const [name, value] of Object.entries(definition.limits)) {
      if (value === void 0 || !Number.isInteger(value) || value < 1 || value > (maximums[name] ?? 0)) {
        problem(diagnostics, "PROJECTION_LIMIT", `/limits/${name}`, `${name} exceeds the host projection limit`);
      }
    }
  }
  function validateSearchExpression(expression, pointer, fields, context, diagnostics, active = /* @__PURE__ */ new Set(), depth = 1) {
    if (depth > context.limits.maxDepth) {
      problem(diagnostics, "PROJECTION_LIMIT", pointer, `Search expression exceeds depth ${context.limits.maxDepth}`);
      return;
    }
    if (active.has(expression)) {
      problem(diagnostics, "PROJECTION_CYCLE", pointer, "Search expression contains a cycle");
      return;
    }
    const next = new Set(active).add(expression);
    switch (expression.kind) {
      case "all":
        break;
      case "and":
      case "or":
        if (expression.terms.length === 0) problem(diagnostics, "PROJECTION_INVALID", `${pointer}/terms`, `${expression.kind} expression requires terms`);
        expression.terms.forEach((term, index) => validateSearchExpression(term, `${pointer}/terms/${index}`, fields, context, diagnostics, next, depth + 1));
        break;
      case "not":
        validateSearchExpression(expression.term, `${pointer}/term`, fields, context, diagnostics, next, depth + 1);
        break;
      case "text":
        expression.fields.forEach((field2, index) => validateField(field2, `${pointer}/fields/${index}`, fields, diagnostics));
        break;
      case "compare":
      case "range":
      case "exists":
        validateField(expression.field, `${pointer}/field`, fields, diagnostics);
        break;
      case "related": {
        const maximum = context.limits.maxRelationDepth ?? context.limits.maxDepth;
        if (!Number.isInteger(expression.maxDepth) || expression.maxDepth < 1 || expression.maxDepth > maximum) problem(diagnostics, "PROJECTION_LIMIT", `${pointer}/maxDepth`, `Relation predicate depth must be between 1 and ${maximum}`);
        break;
      }
    }
  }
  function totalOrder2(orders) {
    const result = [...orders];
    for (const field2 of ["kind", "objectId"]) if (!result.some((order) => order.field === field2)) result.push({ field: field2, direction: "ascending", nulls: "last" });
    return result;
  }
  function problem(diagnostics, code, pointer, messageValue) {
    diagnostics.push(Object.freeze({ code, message: messageValue, severity: "error", pointer }));
  }
  function message(error) {
    return error instanceof Error ? error.message : String(error);
  }
  function matchingBrace(value, open2) {
    let quote = "";
    for (let index = open2 + 1; index < value.length; index += 1) {
      const character = value[index] ?? "";
      if (quote) {
        if (character === "\\") index += 1;
        else if (character === quote) quote = "";
      } else if (character === "'" || character === '"') quote = character;
      else if (character === "}") return index;
    }
    return -1;
  }
  var TemplateExpressionParser = class {
    constructor(input, values2, fields) {
      __publicField(this, "input", input);
      __publicField(this, "values", values2);
      __publicField(this, "fields", fields);
      __publicField(this, "index", 0);
    }
    parse() {
      const value = this.expression();
      this.space();
      if (this.index !== this.input.length) throw new Error(`Unexpected template input near ${this.input.slice(this.index)}`);
      return value;
    }
    expression() {
      this.space();
      const character = this.input[this.index];
      if (character === "'" || character === '"') return this.string();
      if (character !== void 0 && /[0-9-]/u.test(character)) return this.number();
      const identifier = this.identifier();
      this.space();
      if (this.input[this.index] !== "(") {
        if (!FIELD.test(identifier)) throw new Error(`Invalid template field ${identifier}`);
        this.fields.add(identifier);
        return this.values[identifier] ?? "";
      }
      if (!FUNCTIONS.has(identifier)) throw new Error(`Unsupported projection template function ${identifier}`);
      this.index += 1;
      const args = [];
      this.space();
      while (this.input[this.index] !== ")") {
        if (this.index >= this.input.length) throw new Error("Unclosed projection template function");
        args.push(this.expression());
        this.space();
        if (this.input[this.index] === ",") {
          this.index += 1;
          this.space();
          continue;
        }
        if (this.input[this.index] !== ")") throw new Error("Expected comma or closing parenthesis in projection template");
      }
      this.index += 1;
      return applyTemplateFunction(identifier, args);
    }
    identifier() {
      const start = this.index;
      while (/[A-Za-z0-9._-]/u.test(this.input[this.index] ?? "")) this.index += 1;
      if (start === this.index) throw new Error("Expected projection template field or function");
      return this.input.slice(start, this.index);
    }
    string() {
      const quote = this.input[this.index] ?? "";
      this.index += 1;
      let value = "";
      while (this.index < this.input.length && this.input[this.index] !== quote) {
        const character = this.input[this.index] ?? "";
        if (character === "\\") {
          this.index += 1;
          if (this.index >= this.input.length) throw new Error("Invalid string escape in projection template");
          value += this.input[this.index];
        } else value += character;
        this.index += 1;
      }
      if (this.input[this.index] !== quote) throw new Error("Unclosed string in projection template");
      this.index += 1;
      return value;
    }
    number() {
      const start = this.index;
      while (/[0-9-]/u.test(this.input[this.index] ?? "")) this.index += 1;
      const value = Number(this.input.slice(start, this.index));
      if (!Number.isSafeInteger(value)) throw new Error("Template number must be a safe integer");
      return value;
    }
    space() {
      while (/\s/u.test(this.input[this.index] ?? "")) this.index += 1;
    }
  };
  function applyTemplateFunction(name, args) {
    const first = scalar(args[0]);
    switch (name) {
      case "slug":
        return first.normalize("NFKC").toLowerCase().replace(/[^a-z0-9]+/gu, "-").replace(/^-+|-+$/gu, "") || "item";
      case "shortId":
        return first.replace(/[^A-Za-z0-9]/gu, "").slice(-8) || "unknown";
      case "date": {
        const date = new Date(first);
        if (Number.isNaN(date.valueOf())) throw new Error("date() requires an ISO-compatible datetime");
        return date.toISOString().slice(0, 10);
      }
      case "lower":
        return first.toLowerCase();
      case "upper":
        return first.toUpperCase();
      case "coalesce":
        return args.map(scalar).find((value) => value.length > 0) ?? "";
      case "pad": {
        const width = integerArg(args[1], "pad width", 1, 120);
        const fill = scalar(args[2] ?? "0");
        if (fill.length !== 1) throw new Error("pad fill must be one character");
        return first.padStart(width, fill);
      }
      case "truncate":
        return first.slice(0, integerArg(args[1], "truncate length", 1, 120));
      case "replace": {
        const search = scalar(args[1]);
        if (!search) throw new Error("replace search must not be empty");
        return first.split(search).join(scalar(args[2]));
      }
      default:
        throw new Error(`Unsupported projection template function ${name}`);
    }
  }
  function scalar(value) {
    if (value === void 0 || value === null) return "";
    if (typeof value === "string" || typeof value === "number" || typeof value === "boolean") return String(value);
    throw new Error("Projection template values must be scalar");
  }
  function integerArg(value, label, minimum, maximum) {
    if (!Number.isSafeInteger(value) || value < minimum || value > maximum) throw new Error(`${label} must be between ${minimum} and ${maximum}`);
    return value;
  }
  function occurrenceKey(candidate) {
    return `${candidate.target.objectId}\0${candidate.nodeId}\0${candidate.branchId ?? ""}`;
  }
  function uniqueSuffixes(candidates) {
    for (const length of [8, 10, 12, 13]) {
      const suffixes = candidates.map((candidate) => stableHash(occurrenceKey(candidate)).slice(0, length));
      if (new Set(suffixes).size === suffixes.length) return suffixes;
    }
    throw new Error("PROJECTION_COLLISION: stable collision hashes are not unique");
  }
  function stableHash(value) {
    let hash = 0xcbf29ce484222325n;
    for (const byte of new TextEncoder().encode(value)) {
      hash ^= BigInt(byte);
      hash = BigInt.asUintN(64, hash * 0x100000001b3n);
    }
    return hash.toString(36).padStart(13, "0");
  }
  function canonicalJson(value) {
    if (value === null || typeof value !== "object") return JSON.stringify(value);
    if (Array.isArray(value)) return `[${value.map(canonicalJson).join(",")}]`;
    return `{${Object.entries(value).filter(([, item]) => item !== void 0).sort(([left], [right]) => compareText(left, right)).map(([key, item]) => `${JSON.stringify(key)}:${canonicalJson(item)}`).join(",")}}`;
  }
  function cloneJson(value) {
    return JSON.parse(JSON.stringify(value));
  }
  function deepFreeze(value) {
    if (value !== null && typeof value === "object" && !Object.isFrozen(value)) {
      Object.freeze(value);
      for (const child of Object.values(value)) deepFreeze(child);
    }
    return value;
  }
  function validateDefinitionId(value) {
    if (/^builtin:[a-z][a-z0-9-]{0,63}$/u.test(value)) return value;
    return validateProjectionId(value);
  }
  function compareText(left, right) {
    return left < right ? -1 : left > right ? 1 : 0;
  }

  // packages/Epoch.Community.Core/src/projection-runtime.ts
  var InMemoryProjectionRuntime = class {
    constructor(source, definitions = []) {
      __publicField(this, "source", source);
      __publicField(this, "stored", /* @__PURE__ */ new Map());
      for (const definition of definitions) this.register(definition);
    }
    async compile(definition, context) {
      return compileProjectionDefinition(definition, context);
    }
    register(definition) {
      this.stored.set(definition.projectionId, definition);
    }
    unregister(projectionId) {
      this.stored.delete(projectionId);
    }
    definition(projectionId) {
      return this.stored.get(projectionId);
    }
    definitions() {
      return [...this.stored.keys()].sort(compareText2);
    }
    async list(projectionId, path, page, context) {
      validateExecution(path, page, context);
      const result = await this.source.list(projectionId, path, page, context);
      if (result.entries.length > page.first) throw new CommunityError("PROJECTION_INVALID", "Projection data source exceeded the requested page size");
      return Object.freeze({ ...result, entries: Object.freeze(result.entries.map((entry) => validateVfsEntry(entry, projectionId))), freshness: validateCompleteness(result.freshness) });
    }
    async resolve(projectionId, path, context) {
      validateExecution(path, void 0, context);
      const result = await this.source.resolve(projectionId, path, context);
      return result === void 0 ? void 0 : validateVfsEntry(result, projectionId);
    }
    async locate(projectionId, target, context) {
      validateExecution("/", void 0, context);
      validateObjectRef(target);
      return Object.freeze((await this.source.locate(projectionId, target, context)).map((entry) => validateVfsEntry(entry, projectionId)));
    }
    async explain(projectionId, path, context) {
      validateExecution(path, void 0, context);
      if (this.source.explain !== void 0) return this.source.explain(projectionId, path, context);
      const entry = await this.resolve(projectionId, path, context);
      return Object.freeze({ projectionId, path, ...entry === void 0 ? {} : { entry }, componentOrder: [projectionId], shadowed: [], detail: entry === void 0 ? "Path did not resolve" : "Path resolved directly in the projection" });
    }
    async *watch(projectionId, path, context) {
      validateExecution(path, void 0, context);
      const stream = context.changes ?? this.source.watch?.(projectionId, path, context);
      if (stream === void 0) return;
      for await (const delta of stream) {
        if (context.signal.aborted) return;
        if (delta.projectionId === projectionId) yield delta;
      }
    }
  };
  function normalizeVirtualPath(path) {
    if (typeof path !== "string" || path.length === 0 || path.length > 4096 || !path.startsWith("/")) throw new CommunityError("PROJECTION_INVALID", "Virtual paths must be absolute and bounded");
    if (path !== path.normalize("NFKC")) throw new CommunityError("PROJECTION_INVALID", "Virtual path uses ambiguous Unicode normalization");
    if ([...path].some((character) => {
      const code = character.codePointAt(0) ?? 0;
      return code === 0 || code < 32 || code === 127 || character === "\\";
    })) throw new CommunityError("PROJECTION_INVALID", "Virtual path contains an unsafe character");
    const segments = path.split("/").filter(Boolean);
    if (segments.some((segment) => segment === "." || segment === "..")) throw new CommunityError("PROJECTION_INVALID", "Virtual path traversal is not allowed");
    return segments.length === 0 ? "/" : `/${segments.join("/")}`;
  }
  function combineCompleteness(values2) {
    const severity = { complete: 0, approximate: 1, stale: 2, partial: 3 };
    const status = values2.reduce((worst, value) => severity[value.status] > severity[worst] ? value.status : worst, "complete");
    const sources = /* @__PURE__ */ new Map();
    for (const value of values2) for (const source of value.sources) sources.set(`${source.sourceId}\0${source.token}`, source);
    return Object.freeze({
      status,
      sources: Object.freeze([...sources.values()].sort((left, right) => compareText2(left.sourceId, right.sourceId))),
      omittedSources: Object.freeze([...new Set(values2.flatMap((value) => value.omittedSources))].sort(compareText2)),
      unsupportedPredicates: Object.freeze([...new Set(values2.flatMap((value) => value.unsupportedPredicates))].sort(compareText2))
    });
  }
  function validateVfsEntry(entry, projectionId) {
    if (entry.projectionId !== projectionId || !Number.isInteger(entry.projectionVersion) || entry.projectionVersion < 1) throw new CommunityError("PROJECTION_INVALID", "Projection entry has mismatched projection identity");
    if (typeof entry.entryId !== "string" || entry.entryId.length === 0 || entry.entryId.length > 512 || typeof entry.parentEntryId !== "string" || entry.parentEntryId.length > 512) throw new CommunityError("PROJECTION_INVALID", "Projection occurrence identity is invalid");
    if (typeof entry.name !== "string" || entry.name.length === 0 || entry.name.length > 120 || entry.name === "." || entry.name === ".." || /[/\\]/u.test(entry.name)) throw new CommunityError("PROJECTION_INVALID", "Projection entry name is unsafe");
    normalizeVirtualPath(entry.logicalPath);
    validateObjectRef(entry.target);
    if (!["directory", "entity", "representation", "relation", "mount"].includes(entry.kind)) throw new CommunityError("PROJECTION_INVALID", "Projection entry kind is invalid");
    if (entry.sortKey.length > 128 || entry.sortKey.some((value) => !isFieldScalar(value))) throw new CommunityError("PROJECTION_INVALID", "Projection entry sort key is invalid");
    return Object.freeze({ ...entry, freshness: validateCompleteness(entry.freshness) });
  }
  function validateCompleteness(value) {
    if (!["complete", "partial", "stale", "approximate"].includes(value.status) || value.sources.length > 4096 || value.omittedSources.length > 4096 || value.unsupportedPredicates.length > 4096) throw new CommunityError("PROJECTION_INVALID", "Projection completeness metadata is invalid");
    return value;
  }
  function isFieldScalar(value) {
    return value === null || typeof value === "string" || typeof value === "boolean" || typeof value === "number" && Number.isFinite(value);
  }
  function validateExecution(path, page, context) {
    normalizeVirtualPath(path);
    if (!context.authorizationFingerprint || !context.snapshotId) throw new CommunityError("AUTHORIZATION_DENIED", "Projection execution requires snapshot-bound authorization");
    if (page !== void 0 && (!Number.isInteger(page.first) || page.first < 1 || page.first > 1e3)) throw new CommunityError("PROJECTION_INVALID", "Projection page size must be between 1 and 1000");
  }
  function compareText2(left, right) {
    return left < right ? -1 : left > right ? 1 : 0;
  }

  // packages/Epoch.Community.Core/src/projection-delta.ts
  var ProjectionDeltaController = class {
    track(mode, entries, anchor) {
      return new ProjectionDeltaState(mode, entries, anchor);
    }
  };
  var ProjectionDeltaState = class {
    constructor(mode, entries, anchor) {
      __publicField(this, "mode", mode);
      __publicField(this, "anchor", anchor);
      __publicField(this, "current");
      __publicField(this, "queued", []);
      __publicField(this, "sequence", 0);
      __publicField(this, "projectionId");
      __publicField(this, "projectionVersion");
      this.current = Object.freeze([...entries]);
    }
    ingest(delta) {
      if (!Number.isInteger(delta.sequence) || delta.sequence <= this.sequence) throw new CommunityError("PROJECTION_INVALID", "Projection delta sequence must increase monotonically");
      if (this.projectionId !== void 0 && (delta.projectionId !== this.projectionId || delta.projectionVersion !== this.projectionVersion)) throw new CommunityError("PROJECTION_INVALID", "Projection delta changed projection identity");
      this.projectionId ?? (this.projectionId = delta.projectionId);
      this.projectionVersion ?? (this.projectionVersion = delta.projectionVersion);
      this.sequence = delta.sequence;
      if (this.mode === "snapshot") return this.result(false);
      if (this.mode === "queued") {
        this.queued.push(delta);
        return this.result(false);
      }
      this.current = applyProjectionDelta(this.current, delta);
      return this.result(true);
    }
    applyQueued() {
      if (this.mode !== "queued") return this.result(false);
      for (const delta of this.queued) this.current = applyProjectionDelta(this.current, delta);
      this.queued.length = 0;
      return this.result(true);
    }
    entries() {
      return this.current;
    }
    result(applied) {
      return Object.freeze({ applied, queuedCount: this.queued.length, entries: this.current, anchor: this.anchor });
    }
  };
  function applyProjectionDelta(entries, delta) {
    if (!Number.isInteger(delta.projectionVersion) || delta.projectionVersion < 1 || delta.deletes.length > 1e5 || delta.upserts.length > 1e5) throw new CommunityError("PROJECTION_INVALID", "Projection delta metadata is invalid");
    validateIsoDateTime(delta.observedAt, "projection delta observedAt");
    const byId = new Map(entries.map((entry) => [entry.entryId, entry]));
    for (const entryId of delta.deletes) byId.delete(entryId);
    for (const entry of delta.upserts) {
      const valid = validateVfsEntry(entry, delta.projectionId);
      if (valid.projectionVersion !== delta.projectionVersion) throw new CommunityError("PROJECTION_INVALID", "Projection delta entry version does not match");
      byId.set(valid.entryId, valid);
    }
    return Object.freeze([...byId.values()].sort(compareEntries));
  }
  function compareEntries(left, right) {
    const leftKey = JSON.stringify(left.sortKey);
    const rightKey = JSON.stringify(right.sortKey);
    if (leftKey !== rightKey) return leftKey < rightKey ? -1 : 1;
    return left.entryId < right.entryId ? -1 : left.entryId > right.entryId ? 1 : 0;
  }

  // packages/Epoch.Community.Core/src/namespace.ts
  var RECOVERY_ROOT = "/.epoch";
  var RECOVERY_NAMES = ["default", "canonical", "projections", "sources", "diagnostics"];
  var SCOPE_RANK = { session: 5, user: 4, workspace: 3, community: 2, builtin: 1 };
  var EMPTY = Object.freeze({ status: "complete", sources: [], omittedSources: [], unsupportedPredicates: [] });
  var READ_ONLY = Object.freeze({ read: true, enter: true, expand: true, composeUnder: false, execute: false });
  function createNamespaceRuntime(projections, initial = []) {
    projections.register(builtinDefaultProjection);
    const mounts = /* @__PURE__ */ new Map();
    const cursors = createNamespaceCursorStore();
    const preserved = new Set(projections.definitions());
    for (const mount of initial) addMount(mount);
    if (![...mounts.values()].some((mount) => mount.scope === "builtin" && mount.mountPath === "/")) {
      addMount({ mountId: "builtin-root", scope: "builtin", mountPath: "/", projectionId: "builtin:default", mode: "replace", order: 0, writable: false, createdAt: "1970-01-01T00:00:00.000Z", updatedAt: "1970-01-01T00:00:00.000Z" });
    }
    const runtime = {
      async list(path, page, context) {
        const normalized = normalizeVirtualPath(path);
        validatePage(page, context);
        if (normalized === RECOVERY_ROOT) return recoveryPage(page, context, cursors);
        if (normalized.startsWith(`${RECOVERY_ROOT}/`)) return recoveryChildPage(normalized, page, projections, context, cursors);
        const components = componentsFor(normalized, mounts.values());
        const candidates = await Promise.all(components.map(async (component) => ({ component, page: await projections.list(component.mount.projectionId, component.relativePath, { first: Math.min(1e3, page.first + 1) }, context) })));
        const entries = [];
        const shadowed = [];
        const winners = /* @__PURE__ */ new Map();
        if (normalized === "/") {
          const recovery = recoveryEntry(RECOVERY_ROOT);
          winners.set(recovery.name, recovery);
          entries.push(recovery);
        }
        for (const candidate of candidates) {
          for (const raw of candidate.page.entries) {
            const entry = namespaceEntry(raw, candidate.component.mount, normalized);
            const winner = winners.get(entry.name);
            if (winner === void 0) {
              winners.set(entry.name, entry);
              entries.push(entry);
            } else shadowed.push(Object.freeze({ name: entry.name, winner, entry, mountId: candidate.component.mount.mountId, reason: "shadowed" }));
          }
        }
        for (const mountEntry of childMountEntries(normalized, mounts.values())) {
          const winner = winners.get(mountEntry.name);
          if (winner === void 0) {
            winners.set(mountEntry.name, mountEntry);
            entries.push(mountEntry);
          } else shadowed.push(Object.freeze({ name: mountEntry.name, winner, entry: mountEntry, mountId: mountEntry.entryId, reason: "shadowed" }));
        }
        return pageOf(entries, page, combineCompleteness(candidates.map((candidate) => candidate.page.freshness)), shadowed, candidates.map((candidate) => candidate.component.mount.mountId), context, cursors);
      },
      async resolve(path, context) {
        const normalized = normalizeVirtualPath(path);
        validateContext(context);
        const recovery = recoveryEntry(normalized);
        if (recovery !== void 0) return recovery;
        if (normalized.startsWith(`${RECOVERY_ROOT}/`)) return resolveRecoveryChild(normalized, projections, context);
        for (const component of componentsFor(normalized, mounts.values())) {
          const resolved = await projections.resolve(component.mount.projectionId, component.relativePath, context);
          if (resolved !== void 0) return namespaceEntry(resolved, component.mount, parentPath(normalized));
        }
        return void 0;
      },
      async locate(target, context) {
        validateContext(context);
        const results = [];
        const seen = /* @__PURE__ */ new Set();
        for (const component of componentsFor("/", mounts.values())) {
          for (const entry of await projections.locate(component.mount.projectionId, target, context)) {
            const mounted = namespaceEntry(entry, component.mount, component.mount.mountPath);
            if (!seen.has(mounted.entryId)) {
              results.push(mounted);
              seen.add(mounted.entryId);
            }
          }
        }
        return Object.freeze(results.sort(compareEntry));
      },
      async explain(path, context) {
        const normalized = normalizeVirtualPath(path);
        const components = componentsFor(normalized, mounts.values());
        const occurrences = [];
        for (const component of components) {
          const found = await projections.resolve(component.mount.projectionId, component.relativePath, context);
          if (found !== void 0) occurrences.push(namespaceEntry(found, component.mount, parentPath(normalized)));
        }
        const entry = occurrences[0];
        const shadowed = occurrences.slice(1);
        return Object.freeze({ projectionId: "namespace", path: normalized, ...entry === void 0 ? {} : { entry }, componentOrder: components.map((component) => component.mount.mountId), shadowed, detail: entry === void 0 ? "No visible mount component contains the path" : shadowed.length === 0 ? "The first matching mount component provides this path" : `${shadowed.length} lower-precedence occurrence(s) are shadowed` });
      },
      async *watch(path, context) {
        const normalized = normalizeVirtualPath(path);
        const streams = componentsFor(normalized, mounts.values()).map((component) => projections.watch(component.mount.projectionId, component.relativePath, context));
        yield* mergeDeltaStreams(streams, context.signal);
      },
      mounts: () => Object.freeze(sortedMounts(mounts.values())),
      mount: (mount) => addMount(mount),
      unmount(mountId) {
        if (mountId.startsWith("recovery-")) throw protectedRecovery();
        mounts.delete(mountId);
      },
      reset(scope) {
        const removed = [...mounts.values()].filter((mount) => mount.scope === scope).map((mount) => mount.mountId).sort(compareText3);
        for (const mountId of removed) mounts.delete(mountId);
        return Object.freeze({ scope, removedMountIds: Object.freeze(removed), preservedProjectionIds: Object.freeze([...preserved].sort(compareText3)) });
      },
      definitions: () => Object.freeze([...preserved].sort(compareText3)),
      writableMountFor(path, context) {
        validateContext(context);
        const normalized = normalizeVirtualPath(path);
        const writable = componentsFor(normalized, mounts.values()).map((component) => component.mount).filter((mount) => mount.writable);
        if (writable.length === 0) throw new CommunityError("NAMESPACE_MOUNT_CONFLICT", "Namespace path is read-only");
        if (writable.length !== 1) throw new CommunityError("NAMESPACE_MOUNT_CONFLICT", "Namespace write is ambiguous across multiple writable mounts");
        return writable[0];
      }
    };
    return Object.freeze(runtime);
    function addMount(input) {
      const mount = validateMount(input);
      if (mount.mountPath === RECOVERY_ROOT || mount.mountPath.startsWith(`${RECOVERY_ROOT}/`)) throw protectedRecovery();
      if (mounts.has(mount.mountId)) throw new CommunityError("NAMESPACE_MOUNT_CONFLICT", `Namespace mount already exists: ${mount.mountId}`);
      if (projections.definition(mount.projectionId) === void 0) throw new CommunityError("PROJECTION_INVALID", `Namespace mount references an unknown projection: ${mount.projectionId}`);
      preserved.add(mount.projectionId);
      mounts.set(mount.mountId, mount);
      return mount;
    }
  }
  function componentsFor(path, values2) {
    const normalized = normalizeVirtualPath(path);
    const applicable = sortedMounts(values2).filter((mount) => isUnder(normalized, mount.mountPath));
    const byPath = /* @__PURE__ */ new Map();
    for (const mount of applicable) {
      const group = byPath.get(mount.mountPath) ?? [];
      group.push(mount);
      byPath.set(mount.mountPath, group);
    }
    const output = [];
    for (const [mountPath, group] of [...byPath.entries()].sort(([left], [right]) => right.length - left.length || compareText3(left, right))) {
      const ordered = composeGroup(group);
      const relativePath = normalized === mountPath ? "/" : normalized.slice(mountPath === "/" ? 0 : mountPath.length);
      output.push(...ordered.map((mount) => ({ mount, relativePath })));
    }
    return output;
  }
  function composeGroup(group) {
    const ranked = [...group].sort(compareMount);
    const replaceIndex = ranked.findIndex((mount) => mount.mode === "replace");
    const replace = replaceIndex < 0 ? void 0 : ranked[replaceIndex];
    const before = ranked.filter((mount) => mount.mode === "before" && (replace === void 0 || SCOPE_RANK[mount.scope] >= SCOPE_RANK[replace.scope]));
    const after = ranked.filter((mount) => mount.mode === "after" && (replace === void 0 || SCOPE_RANK[mount.scope] >= SCOPE_RANK[replace.scope]));
    const base = replace === void 0 ? ranked.filter((mount) => mount.mode === "replace") : [replace];
    return [...before, ...base, ...after];
  }
  function sortedMounts(values2) {
    return [...values2].sort(compareMount);
  }
  function compareMount(left, right) {
    return SCOPE_RANK[right.scope] - SCOPE_RANK[left.scope] || left.order - right.order || compareText3(left.mountId, right.mountId);
  }
  function namespaceEntry(entry, mount, directory) {
    const logicalPath = directory === mount.mountPath ? mount.mountPath === "/" ? entry.logicalPath : `${mount.mountPath}${entry.logicalPath}` : joinPath(directory, entry.name);
    return Object.freeze({ ...entry, entryId: `${mount.mountId}:${entry.entryId}`, logicalPath, kind: entry.kind, capabilities: Object.freeze({ ...entry.capabilities, composeUnder: entry.capabilities.composeUnder && mount.writable }) });
  }
  function recoveryPage(page, context, cursors) {
    return pageOf(RECOVERY_NAMES.map((name) => recoveryEntry(`${RECOVERY_ROOT}/${name}`)), page, EMPTY, [], ["recovery"], context, cursors);
  }
  async function recoveryChildPage(path, page, projections, context, cursors) {
    if (path === `${RECOVERY_ROOT}/default`) {
      const value = await projections.list("builtin:default", "/", page, context);
      return { ...value, shadowed: [], componentOrder: ["recovery-default"] };
    }
    if (path === `${RECOVERY_ROOT}/projections`) {
      const entries = projections.definitions().map((projectionId) => makeRecovery(projectionId, `recovery-projection-${stableToken(projectionId)}`, "representation", `${path}/${projectionId}`, projectionId));
      return pageOf(entries, page, EMPTY, [], ["recovery-projections"], context, cursors);
    }
    return pageOf([], page, EMPTY, [], [`recovery-${basename(path)}`], context, cursors);
  }
  async function resolveRecoveryChild(path, projections, context) {
    if (path.startsWith(`${RECOVERY_ROOT}/default/`)) return projections.resolve("builtin:default", path.slice(`${RECOVERY_ROOT}/default`.length), context);
    const canonical = path.match(/^\/\.epoch\/canonical\/([^/]+)\/([^/]+)$/u);
    if (canonical !== null) {
      let target;
      try {
        target = validateObjectRef({ objectId: canonical[2] ?? "", kind: canonical[1] ?? "" });
      } catch {
        return void 0;
      }
      for (const projectionId of projections.definitions()) if ((await projections.locate(projectionId, target, context)).length > 0) {
        return Object.freeze({ ...makeRecovery(target.objectId, `recovery-canonical-${stableToken(`${target.kind}:${target.objectId}`)}`, "entity", path), target });
      }
      return void 0;
    }
    if (path.startsWith(`${RECOVERY_ROOT}/projections/`)) {
      const projectionId = path.slice(`${RECOVERY_ROOT}/projections/`.length);
      if (projections.definition(projectionId) !== void 0) return makeRecovery(projectionId, `recovery-projection-${stableToken(projectionId)}`, "representation", path, projectionId);
    }
    return recoveryEntry(path);
  }
  function recoveryEntry(path) {
    if (path === RECOVERY_ROOT) return makeRecovery(".epoch", "recovery-root", "directory", RECOVERY_ROOT);
    if (!path.startsWith(`${RECOVERY_ROOT}/`)) return void 0;
    const remainder = path.slice(`${RECOVERY_ROOT}/`.length);
    if (!RECOVERY_NAMES.includes(remainder)) return void 0;
    const kind = remainder === "default" ? "mount" : "directory";
    return makeRecovery(remainder, `recovery-${remainder}`, kind, path, remainder === "default" ? "builtin:default" : `recovery:${remainder}`);
  }
  function makeRecovery(name, entryId, kind, logicalPath, projectionId = "recovery") {
    const target = { objectId: entryId, kind: "projection" };
    return Object.freeze({ entryId, target, projectionId, projectionVersion: 1, parentEntryId: "recovery-root", name, logicalPath, kind, sortKey: [name], capabilities: READ_ONLY, freshness: EMPTY });
  }
  function validateMount(input) {
    if (!/^[A-Za-z0-9][A-Za-z0-9._~-]{0,127}$/u.test(input.mountId)) throw new CommunityError("NAMESPACE_MOUNT_CONFLICT", "Mount ID must be an opaque URL-safe identifier");
    const mountPath = normalizeVirtualPath(input.mountPath);
    if (!Object.hasOwn(SCOPE_RANK, input.scope) || !["replace", "before", "after"].includes(input.mode)) throw new CommunityError("NAMESPACE_MOUNT_CONFLICT", "Namespace mount scope or mode is invalid");
    if (!Number.isSafeInteger(input.order)) throw new CommunityError("NAMESPACE_MOUNT_CONFLICT", "Namespace mount order must be a safe integer");
    return Object.freeze({ ...input, mountPath });
  }
  function childMountEntries(path, values2) {
    const childMounts = sortedMounts(values2).filter((mount) => mount.mountPath !== "/" && parentPath(mount.mountPath) === path);
    const output = [];
    const seen = /* @__PURE__ */ new Set();
    for (const mount of childMounts) {
      const name = basename(mount.mountPath);
      if (seen.has(name)) continue;
      seen.add(name);
      const target = { objectId: `mount-${mount.mountId}`, kind: "projection" };
      output.push(Object.freeze({ entryId: `mount-${mount.mountId}`, target, projectionId: mount.projectionId, projectionVersion: 1, parentEntryId: "namespace", name, logicalPath: mount.mountPath, kind: "mount", sortKey: [name, mount.mountId], capabilities: READ_ONLY, freshness: EMPTY }));
    }
    return output;
  }
  function pageOf(entries, page, freshness, shadowed, componentOrder, context, cursors) {
    const cursor = page.after === void 0 ? void 0 : cursors.decode(page.after, context);
    const start = cursor === void 0 ? 0 : entries.findIndex((entry) => entry.entryId === cursor.entryId) + 1;
    if (cursor !== void 0 && start === 0) throw new CommunityError("CURSOR_STALE", "Namespace cursor no longer resolves in this snapshot");
    const values2 = entries.slice(start, start + page.first);
    const hasNextPage = start + page.first < entries.length;
    const pageInfo = Object.freeze({ hasNextPage, ...hasNextPage && values2.length > 0 ? { endCursor: cursors.encode(values2.at(-1).entryId, context) } : {} });
    return Object.freeze({ entries: Object.freeze(values2), pageInfo, freshness, shadowed: Object.freeze([...shadowed]), componentOrder: Object.freeze([...componentOrder]) });
  }
  function createNamespaceCursorStore() {
    const issued = /* @__PURE__ */ new Map();
    return {
      encode(entryId, context) {
        const bytes = globalThis.crypto?.getRandomValues(new Uint8Array(24));
        if (bytes === void 0) throw new CommunityError("CRYPTO_UNAVAILABLE", "Namespace cursor generation is unavailable");
        let binary = "";
        for (const byte of bytes) binary += String.fromCharCode(byte);
        const token = globalThis.btoa(binary).replace(/\+/gu, "-").replace(/\//gu, "_").replace(/=+$/gu, "");
        issued.set(token, { entryId, snapshotId: context.snapshotId, authorizationFingerprint: context.authorizationFingerprint });
        if (issued.size > 4096) issued.delete(issued.keys().next().value);
        return token;
      },
      decode(cursor, context) {
        if (!/^[A-Za-z0-9_-]{32}$/u.test(cursor)) throw new CommunityError("CURSOR_INVALID", "Namespace cursor is malformed");
        const value = issued.get(cursor);
        if (value === void 0 || value.snapshotId !== context.snapshotId || value.authorizationFingerprint !== context.authorizationFingerprint) {
          throw new CommunityError("CURSOR_STALE", "Namespace cursor does not match this snapshot or authorization");
        }
        return { entryId: value.entryId };
      }
    };
  }
  function validatePage(page, context) {
    validateContext(context);
    if (!Number.isInteger(page.first) || page.first < 1 || page.first > 1e3) throw new CommunityError("PROJECTION_INVALID", "Namespace page size must be between 1 and 1000");
  }
  function validateContext(context) {
    if (!context.authorizationFingerprint || !context.snapshotId) throw new CommunityError("AUTHORIZATION_DENIED", "Namespace operation requires snapshot-bound authorization");
  }
  function protectedRecovery() {
    return new CommunityError("NAMESPACE_RECOVERY_PROTECTED", "The /.epoch recovery namespace is immutable");
  }
  function isUnder(path, mountPath) {
    return mountPath === "/" || path === mountPath || path.startsWith(`${mountPath}/`);
  }
  function parentPath(path) {
    const values2 = path.split("/").filter(Boolean);
    values2.pop();
    return values2.length === 0 ? "/" : `/${values2.join("/")}`;
  }
  function basename(path) {
    return path.split("/").filter(Boolean).at(-1) ?? "";
  }
  function joinPath(parent, name) {
    return parent === "/" ? `/${name}` : `${parent}/${name}`;
  }
  function compareEntry(left, right) {
    return compareText3(left.name, right.name) || compareText3(left.entryId, right.entryId);
  }
  function compareText3(left, right) {
    return left < right ? -1 : left > right ? 1 : 0;
  }
  function stableToken(value) {
    let hash = 0xcbf29ce484222325n;
    for (const byte of new TextEncoder().encode(value)) {
      hash ^= BigInt(byte);
      hash = BigInt.asUintN(64, hash * 0x100000001b3n);
    }
    return hash.toString(36);
  }
  async function* mergeDeltaStreams(streams, signal) {
    const iterators = streams.map((stream) => stream[Symbol.asyncIterator]());
    const pending = /* @__PURE__ */ new Map();
    const schedule = (index) => {
      const iterator = iterators[index];
      if (iterator !== void 0) pending.set(index, iterator.next().then((result) => ({ index, result })));
    };
    iterators.forEach((_, index) => schedule(index));
    try {
      while (pending.size > 0 && !signal.aborted) {
        const next = await Promise.race(pending.values());
        pending.delete(next.index);
        if (next.result.done !== true) {
          yield next.result.value;
          schedule(next.index);
        }
      }
    } finally {
      await Promise.all(iterators.map(async (iterator) => iterator.return?.()));
    }
  }

  // packages/Epoch.Community.Core/src/entity-projection-runtime.ts
  var DIRECTORY_CAPABILITIES = Object.freeze({
    read: true,
    enter: true,
    expand: true,
    composeUnder: false,
    execute: false
  });
  var ENTITY_CAPABILITIES = Object.freeze({
    read: true,
    enter: true,
    expand: false,
    composeUnder: false,
    execute: false
  });
  var _entities2, _byId, _completeness, _compileContext, _cursor2, _compiled, _EntityProjectionRuntime_instances, require_fn, root_fn, children_fn, walk_fn, emitMany_fn, emit_fn, raw_fn, materialize_fn, evaluationOptions_fn, traverse_fn;
  var EntityProjectionRuntime = class {
    constructor(options, definitions = []) {
      __privateAdd(this, _EntityProjectionRuntime_instances);
      __privateAdd(this, _entities2);
      __privateAdd(this, _byId);
      __privateAdd(this, _completeness);
      __privateAdd(this, _compileContext);
      __privateAdd(this, _cursor2);
      __privateAdd(this, _compiled, /* @__PURE__ */ new Map());
      const byId = /* @__PURE__ */ new Map();
      for (const entity of options.entities) {
        if (byId.has(entity.ref.objectId)) throw new CommunityError("PROJECTION_INVALID", `Duplicate canonical entity ${entity.ref.objectId}`);
        byId.set(entity.ref.objectId, entity);
      }
      __privateSet(this, _entities2, Object.freeze([...byId.values()]));
      __privateSet(this, _byId, byId);
      __privateSet(this, _completeness, freezeCompleteness(options.completeness));
      __privateSet(this, _compileContext, options.compileContext);
      __privateSet(this, _cursor2, createKeysetCursorCodec({ key: options.cursorKey }));
      for (const definition of definitions) this.register(definition);
    }
    async compile(definition, context) {
      return compileProjectionDefinition(definition, context);
    }
    register(definition) {
      const compiled = compileProjectionDefinition(definition, __privateGet(this, _compileContext));
      __privateGet(this, _compiled).set(definition.projectionId, compiled);
    }
    unregister(projectionId) {
      __privateGet(this, _compiled).delete(projectionId);
    }
    definition(projectionId) {
      return __privateGet(this, _compiled).get(projectionId)?.definition;
    }
    definitions() {
      return Object.freeze([...__privateGet(this, _compiled).keys()].sort(compareText4));
    }
    async list(projectionId, path, page, context) {
      validateRequest(path, page, context);
      const compiled = __privateMethod(this, _EntityProjectionRuntime_instances, require_fn).call(this, projectionId);
      const parent = await __privateMethod(this, _EntityProjectionRuntime_instances, walk_fn).call(this, compiled, path);
      if (path !== "/" && parent === void 0) return emptyPage(__privateGet(this, _completeness));
      const records = path === "/" ? __privateMethod(this, _EntityProjectionRuntime_instances, root_fn).call(this, compiled) : __privateMethod(this, _EntityProjectionRuntime_instances, children_fn).call(this, compiled, parent);
      const binding2 = cursorBinding(compiled, context, parent?.entry.entryId ?? rootEntryId(compiled));
      let start = 0;
      if (page.after !== void 0) {
        const decoded = await __privateGet(this, _cursor2).decode(page.after, binding2);
        const index = records.findIndex(({ entry }) => entry.entryId === decoded.objectId && equalScalars(entry.sortKey, decoded.sortKey));
        if (index < 0) throw new CommunityError("CURSOR_STALE", "Projection cursor no longer resolves in this snapshot");
        start = index + 1;
      }
      const selected = records.slice(start, start + page.first);
      const cursors = await Promise.all(selected.map(({ entry }) => __privateGet(this, _cursor2).encode({
        version: 1,
        snapshotId: context.snapshotId,
        planHash: binding2.planHash,
        authorizationFingerprint: context.authorizationFingerprint,
        sortKey: entry.sortKey,
        objectId: entry.entryId
      })));
      const pageInfo = Object.freeze({
        hasNextPage: start + selected.length < records.length,
        ...cursors[0] === void 0 ? {} : { startCursor: cursors[0] },
        ...cursors.at(-1) === void 0 ? {} : { endCursor: cursors.at(-1) }
      });
      return Object.freeze({ entries: Object.freeze(selected.map(({ entry }) => entry)), pageInfo, freshness: __privateGet(this, _completeness) });
    }
    async resolve(projectionId, path, context) {
      validateRequest(path, void 0, context);
      if (normalizeVirtualPath(path) === "/") return void 0;
      return (await __privateMethod(this, _EntityProjectionRuntime_instances, walk_fn).call(this, __privateMethod(this, _EntityProjectionRuntime_instances, require_fn).call(this, projectionId), path))?.entry;
    }
    async locate(projectionId, target, context) {
      validateRequest("/", void 0, context);
      validateObjectRef(target);
      const compiled = __privateMethod(this, _EntityProjectionRuntime_instances, require_fn).call(this, projectionId);
      const queue = [...__privateMethod(this, _EntityProjectionRuntime_instances, root_fn).call(this, compiled)];
      const found = [];
      const limit = compiled.definition.limits?.maxTotalEntries ?? 1e5;
      for (let index = 0; index < queue.length; index += 1) {
        if (index >= limit) throw new CommunityError("PROJECTION_INVALID", `Projection exceeds its ${limit} entry execution limit`);
        const occurrence = queue[index];
        if (occurrence.entry.target.objectId === target.objectId) found.push(occurrence.entry);
        queue.push(...__privateMethod(this, _EntityProjectionRuntime_instances, children_fn).call(this, compiled, occurrence));
      }
      return Object.freeze(found);
    }
    async explain(projectionId, path, context) {
      validateRequest(path, void 0, context);
      const compiled = __privateMethod(this, _EntityProjectionRuntime_instances, require_fn).call(this, projectionId);
      const occurrence = normalizeVirtualPath(path) === "/" ? void 0 : await __privateMethod(this, _EntityProjectionRuntime_instances, walk_fn).call(this, compiled, path);
      if (occurrence === void 0) return Object.freeze({ projectionId, path, componentOrder: [projectionId], shadowed: [], detail: path === "/" ? "Projection root" : "Path did not resolve" });
      const collision = occurrence.collision;
      const detail = collision.collided ? `${occurrence.raw.nodeId} rendered ${JSON.stringify(collision.originalSegment)} as ${JSON.stringify(collision.normalizedSegment)}; collision set [${collision.collisionSet.join(", ")}] produced ${JSON.stringify(collision.finalName)}` : `${occurrence.raw.nodeId} rendered ${JSON.stringify(collision.originalSegment)} as ${JSON.stringify(collision.finalName)}`;
      return Object.freeze({ projectionId, path, entry: occurrence.entry, componentOrder: [projectionId], shadowed: [], detail });
    }
    async *watch(projectionId, path, context) {
      validateRequest(path, void 0, context);
      __privateMethod(this, _EntityProjectionRuntime_instances, require_fn).call(this, projectionId);
      if (context.changes === void 0) return;
      for await (const delta of context.changes) {
        if (context.signal.aborted) return;
        if (delta.projectionId === projectionId) yield delta;
      }
    }
  };
  _entities2 = new WeakMap();
  _byId = new WeakMap();
  _completeness = new WeakMap();
  _compileContext = new WeakMap();
  _cursor2 = new WeakMap();
  _compiled = new WeakMap();
  _EntityProjectionRuntime_instances = new WeakSet();
  require_fn = function(projectionId) {
    const compiled = __privateGet(this, _compiled).get(projectionId);
    if (compiled === void 0) throw new CommunityError("PROJECTION_INVALID", `Unknown projection ${projectionId}`);
    return compiled;
  };
  root_fn = function(compiled) {
    const parentEntryId = rootEntryId(compiled);
    const entities = sortEntities(__privateGet(this, _entities2), compiled.effectiveOrder);
    const frame = { entities, branchId: "root", parentEntryId, path: "/" };
    const root = compiled.definition.root;
    const raw = root.kind === "literal" && root.segment === "" ? __privateMethod(this, _EntityProjectionRuntime_instances, emitMany_fn).call(this, compiled, root.children, { ...frame, branchId: `${frame.branchId}/${root.nodeId}` }) : __privateMethod(this, _EntityProjectionRuntime_instances, emit_fn).call(this, compiled, root, frame);
    return __privateMethod(this, _EntityProjectionRuntime_instances, materialize_fn).call(this, compiled, raw, parentEntryId, "/");
  };
  children_fn = function(compiled, parent) {
    const raw = __privateMethod(this, _EntityProjectionRuntime_instances, emitMany_fn).call(this, compiled, parent.raw.childNodes, {
      ...parent.raw.childFrame,
      branchId: parent.raw.branchId,
      parentEntryId: parent.entry.entryId,
      path: parent.entry.logicalPath
    });
    return __privateMethod(this, _EntityProjectionRuntime_instances, materialize_fn).call(this, compiled, raw, parent.entry.entryId, parent.entry.logicalPath);
  };
  walk_fn = async function(compiled, path) {
    const normalized = normalizeVirtualPath(path);
    if (normalized === "/") return void 0;
    let children = __privateMethod(this, _EntityProjectionRuntime_instances, root_fn).call(this, compiled);
    let current;
    const segments = normalized.slice(1).split("/");
    for (const [index, segment] of segments.entries()) {
      current = children.find(({ entry }) => entry.name === segment);
      if (current === void 0) return void 0;
      if (index < segments.length - 1) children = __privateMethod(this, _EntityProjectionRuntime_instances, children_fn).call(this, compiled, current);
    }
    return current;
  };
  emitMany_fn = function(compiled, nodes, frame) {
    return nodes.flatMap((node, index) => __privateMethod(this, _EntityProjectionRuntime_instances, emit_fn).call(this, compiled, node, { ...frame, branchId: `${frame.branchId}/${index}` }));
  };
  emit_fn = function(compiled, node, frame) {
    switch (node.kind) {
      case "literal": {
        const branchId = `${frame.branchId}/${node.nodeId}`;
        const target = structuralRef(compiled, node.nodeId, branchId);
        return [__privateMethod(this, _EntityProjectionRuntime_instances, raw_fn).call(this, compiled, node.nodeId, branchId, node.segment, "directory", target, frame, node.children)];
      }
      case "select": {
        const selected = sortEntities(frame.entities.filter((entity) => node.objectKinds.includes(entity.ref.kind) && (node.where === void 0 || evaluateSearchExpression(entity, node.where, __privateMethod(this, _EntityProjectionRuntime_instances, evaluationOptions_fn).call(this)).matches)), node.order ?? compiled.effectiveOrder).slice(0, node.limit);
        return __privateMethod(this, _EntityProjectionRuntime_instances, emitMany_fn).call(this, compiled, node.children, { ...frame, entities: selected, branchId: `${frame.branchId}/${node.nodeId}` });
      }
      case "group": {
        const groups = /* @__PURE__ */ new Map();
        for (const entity of frame.entities) {
          const values2 = searchFieldValues(entity, node.field).filter((value) => value !== null);
          for (const value of values2.length === 0 ? [null] : values2) {
            const key = JSON.stringify(value);
            const group = groups.get(key) ?? { value, entities: [] };
            group.entities.push(entity);
            groups.set(key, group);
          }
        }
        const ordered = [...groups.values()].sort((left, right) => groupCompare(left, right, node.order));
        return ordered.map((group) => {
          const branchId = `${frame.branchId}/${node.nodeId}:${stableHash2(JSON.stringify(group.value))}`;
          const values2 = Object.freeze({ ...frame.templateValues ?? {}, [node.field]: group.value, count: group.entities.length });
          const segment = group.value === null ? node.missing : renderSegmentTemplate(node.segment, values2).segment;
          const target = structuralRef(compiled, node.nodeId, branchId);
          return __privateMethod(this, _EntityProjectionRuntime_instances, raw_fn).call(this, compiled, node.nodeId, branchId, segment, "directory", target, { ...frame, entities: Object.freeze(group.entities), templateValues: values2 }, [node.child], group.value === null ? node.missing : node.segment.template);
        });
      }
      case "traverse": {
        const output = [];
        for (const start of frame.entities) {
          const reached = __privateMethod(this, _EntityProjectionRuntime_instances, traverse_fn).call(this, start, node.relation, node.direction, node.maxDepth);
          output.push(...__privateMethod(this, _EntityProjectionRuntime_instances, emit_fn).call(this, compiled, node.child, {
            ...frame,
            entities: reached,
            branchId: `${frame.branchId}/${node.nodeId}:${start.ref.objectId}`
          }));
        }
        return output;
      }
      case "union":
        return __privateMethod(this, _EntityProjectionRuntime_instances, emitMany_fn).call(this, compiled, node.children, { ...frame, branchId: `${frame.branchId}/${node.nodeId}` });
      case "alias": {
        const entity = __privateGet(this, _byId).get(node.target.objectId);
        if (entity === void 0) return [];
        const branchId = `${frame.branchId}/${node.nodeId}:${entity.ref.objectId}`;
        const segment = renderSegmentTemplate(node.segment, templateValues(entity, frame.templateValues)).segment;
        return [__privateMethod(this, _EntityProjectionRuntime_instances, raw_fn).call(this, compiled, node.nodeId, branchId, segment, "entity", entity.ref, { ...frame, entities: [entity] }, node.children, node.segment.template)];
      }
      case "leaf":
        return frame.entities.map((entity) => {
          const branchId = `${frame.branchId}/${node.nodeId}:${entity.ref.objectId}:${node.representation}`;
          const segment = renderSegmentTemplate(node.segment, templateValues(entity, frame.templateValues)).segment;
          return __privateMethod(this, _EntityProjectionRuntime_instances, raw_fn).call(this, compiled, node.nodeId, branchId, segment, node.representation === "default" ? "entity" : "representation", entity.ref, { ...frame, entities: [entity] }, [], node.segment.template);
        });
    }
  };
  raw_fn = function(compiled, nodeId, branchId, segment, kind, target, childFrame, childNodes, originalSegment = segment) {
    const entity = __privateGet(this, _byId).get(target.objectId);
    return Object.freeze({
      target,
      nodeId,
      branchId,
      originalSegment,
      normalizedSegment: segment,
      kind,
      sortKey: Object.freeze(compiled.effectiveOrder.map((order) => entity === void 0 ? null : searchFieldValues(entity, order.field)[0] ?? null)),
      childNodes,
      childFrame
    });
  };
  materialize_fn = function(compiled, raw, parentEntryId, parentPath2) {
    const maximum = compiled.definition.limits?.maxEntriesPerDirectory ?? __privateGet(this, _compileContext).limits.maxFanout;
    if (raw.length > maximum) throw new CommunityError("PROJECTION_INVALID", `Virtual directory exceeds its ${maximum} entry limit`);
    const collisions = assignProjectionCollisionNames(raw.map((candidate) => ({
      target: candidate.target,
      nodeId: candidate.nodeId,
      branchId: candidate.branchId,
      originalSegment: candidate.originalSegment,
      normalizedSegment: candidate.normalizedSegment
    })));
    return Object.freeze(raw.map((candidate, index) => {
      const collision = collisions[index];
      const entryId = createProjectionOccurrenceId({
        projectionId: compiled.definition.projectionId,
        projectionVersion: compiled.definition.version,
        nodeId: candidate.nodeId,
        branchId: candidate.branchId,
        parentEntryId,
        target: candidate.target,
        resolvedSegment: candidate.normalizedSegment
      });
      const logicalPath = parentPath2 === "/" ? `/${collision.finalName}` : `${parentPath2}/${collision.finalName}`;
      const entry = validateVfsEntry({
        entryId,
        target: candidate.target,
        projectionId: compiled.definition.projectionId,
        projectionVersion: compiled.definition.version,
        parentEntryId,
        name: collision.finalName,
        logicalPath,
        kind: candidate.kind,
        sortKey: candidate.sortKey,
        capabilities: candidate.kind === "directory" || candidate.childNodes.length > 0 ? DIRECTORY_CAPABILITIES : ENTITY_CAPABILITIES,
        freshness: __privateGet(this, _completeness)
      }, compiled.definition.projectionId);
      return Object.freeze({ raw: candidate, collision, entry });
    }));
  };
  evaluationOptions_fn = function() {
    return {
      resolveEntity: (objectId) => __privateGet(this, _byId).get(objectId),
      relationsFor: (objectId) => __privateGet(this, _entities2).flatMap((entity) => entity.relations).filter((relation) => relation.source.objectId === objectId || relation.target.objectId === objectId)
    };
  };
  traverse_fn = function(start, relationType, direction, maximumDepth) {
    let frontier = [start.ref.objectId];
    const visited = new Set(frontier);
    const reached = [];
    for (let depth = 0; depth < maximumDepth && frontier.length > 0; depth += 1) {
      const next = [];
      for (const objectId of frontier) for (const relation of __privateGet(this, _entities2).flatMap((entity) => entity.relations)) {
        if (relation.type !== relationType) continue;
        const adjacent = direction === "out" && relation.source.objectId === objectId ? relation.target : direction === "in" && relation.target.objectId === objectId ? relation.source : void 0;
        if (adjacent === void 0 || visited.has(adjacent.objectId)) continue;
        visited.add(adjacent.objectId);
        const entity = __privateGet(this, _byId).get(adjacent.objectId);
        if (entity !== void 0) {
          reached.push(entity);
          next.push(entity.ref.objectId);
        }
      }
      frontier = next;
    }
    return Object.freeze(reached.sort((left, right) => compareText4(left.ref.objectId, right.ref.objectId)));
  };
  function sortEntities(entities, order) {
    return Object.freeze([...entities].sort((left, right) => {
      for (const item of order) {
        const a = searchFieldValues(left, item.field)[0] ?? null;
        const b = searchFieldValues(right, item.field)[0] ?? null;
        const compared = scalarCompare2(a, b, item.nulls);
        if (compared !== 0) return a === null || b === null || item.direction === "ascending" ? compared : -compared;
      }
      return compareText4(left.ref.kind, right.ref.kind) || compareText4(left.ref.objectId, right.ref.objectId);
    }));
  }
  function scalarCompare2(left, right, nulls = "last") {
    if (left === right) return 0;
    if (left === null) return nulls === "first" ? -1 : 1;
    if (right === null) return nulls === "first" ? 1 : -1;
    if (typeof left === "number" && typeof right === "number") return left - right;
    if (typeof left === "boolean" && typeof right === "boolean") return Number(left) - Number(right);
    return compareText4(String(left), String(right));
  }
  function groupCompare(left, right, order) {
    if (order === "count-ascending" || order === "count-descending") {
      const count = left.entities.length - right.entities.length;
      if (count !== 0) return order === "count-ascending" ? count : -count;
    }
    const key = scalarCompare2(left.value, right.value);
    return order === "key-descending" ? -key : key;
  }
  function templateValues(entity, inherited) {
    const output = {
      ...inherited ?? {},
      ...entity.searchableText,
      ...entity.fields,
      objectId: entity.ref.objectId,
      kind: entity.ref.kind,
      createdAt: entity.createdAt,
      updatedAt: entity.updatedAt,
      visibility: entity.visibility
    };
    for (const [name, value] of Object.entries(output)) if (Array.isArray(value)) output[name] = value[0] ?? "";
    return output;
  }
  function structuralRef(compiled, nodeId, branchId) {
    return Object.freeze({ objectId: `vfs-${stableHash2(`${compiled.definition.projectionId}\0${compiled.definition.version}\0${nodeId}\0${branchId}`)}`, kind: "projection" });
  }
  function rootEntryId(compiled) {
    return `root-${stableHash2(`${compiled.definition.projectionId}\0${compiled.definition.version}`)}`;
  }
  function cursorBinding(compiled, context, parentEntryId) {
    return {
      snapshotId: context.snapshotId,
      authorizationFingerprint: context.authorizationFingerprint,
      planHash: `projection:${stableHash2(`${compiled.canonicalJson}\0${parentEntryId}`)}`
    };
  }
  function validateRequest(path, page, context) {
    normalizeVirtualPath(path);
    if (!context.authorizationFingerprint || !context.snapshotId) throw new CommunityError("AUTHORIZATION_DENIED", "Projection execution requires snapshot-bound authorization");
    if (page !== void 0 && (!Number.isInteger(page.first) || page.first < 1 || page.first > 1e3)) throw new CommunityError("PROJECTION_INVALID", "Projection page size must be between 1 and 1000");
  }
  function freezeCompleteness(value) {
    if (typeof value !== "object" || value === null || !["complete", "partial", "stale", "approximate"].includes(value.status) || value.sources.length > 4096 || value.omittedSources.length > 4096 || value.unsupportedPredicates.length > 4096) {
      throw new CommunityError("PROJECTION_INVALID", "Projection completeness metadata is invalid");
    }
    return Object.freeze({
      status: value.status,
      sources: Object.freeze([...value.sources]),
      omittedSources: Object.freeze([...value.omittedSources]),
      unsupportedPredicates: Object.freeze([...value.unsupportedPredicates])
    });
  }
  function emptyPage(freshness) {
    return Object.freeze({ entries: [], pageInfo: Object.freeze({ hasNextPage: false }), freshness });
  }
  function equalScalars(left, right) {
    return left.length === right.length && left.every((value, index) => value === right[index]);
  }
  function stableHash2(value) {
    let hash = 0xcbf29ce484222325n;
    for (const byte of new TextEncoder().encode(value)) {
      hash ^= BigInt(byte);
      hash = BigInt.asUintN(64, hash * 0x100000001b3n);
    }
    return hash.toString(36).padStart(13, "0");
  }
  function compareText4(left, right) {
    return left < right ? -1 : left > right ? 1 : 0;
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
      createChange: (slug, input) => transport.createChange(slug, input),
      reviewChange: (slug, changeId, input) => transport.reviewChange(slug, changeId, input),
      getObject: (objectId, authorization) => transport.getObject(objectId, authorization),
      updateObjectState: (objectId, state, authorization) => transport.updateObjectState(objectId, state, authorization),
      listThreadRelations: (objectId, authorization) => transport.listThreadRelations(objectId, authorization)
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
      createChange: (slug, input) => request("POST", `${repositoryPath(slug)}/changes`, input),
      reviewChange: (slug, changeId, input) => request("POST", `${repositoryPath(slug)}/changes/${encodeURIComponent(changeId)}/reviews`, input),
      getObject: (objectId) => request("GET", `/objects/${encodeURIComponent(objectId)}`),
      updateObjectState: (objectId, state) => request("PATCH", `/objects/${encodeURIComponent(objectId)}/state`, { state }),
      listThreadRelations: (objectId) => request("GET", `/objects/${encodeURIComponent(objectId)}/thread`)
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
        const message2 = errorMessage(parsed) ?? response.statusText;
        throw new Error(`Community API request failed (${response.status}): ${message2}`);
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
window.CW_CORE = CW_CORE;
