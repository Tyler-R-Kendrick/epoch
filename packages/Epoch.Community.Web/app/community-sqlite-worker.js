/* Generated from packages/Epoch.Community.Web/src/search/sqlite-worker-entry.ts. Run npm run community-web:app:build. */
var __create = Object.create;
var __defProp = Object.defineProperty;
var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __getProtoOf = Object.getPrototypeOf;
var __hasOwnProp = Object.prototype.hasOwnProperty;
var __esm = (fn, res, err) => function __init() {
  if (err) throw err[0];
  try {
    return fn && (res = (0, fn[__getOwnPropNames(fn)[0]])(fn = 0)), res;
  } catch (e) {
    throw err = [e], e;
  }
};
var __commonJS = (cb, mod) => function __require() {
  try {
    return mod || (0, cb[__getOwnPropNames(cb)[0]])((mod = { exports: {} }).exports, mod), mod.exports;
  } catch (e) {
    throw mod = 0, e;
  }
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
var __toESM = (mod, isNodeMode, target) => (target = mod != null ? __create(__getProtoOf(mod)) : {}, __copyProps(
  // If the importer is in node compatibility mode or this is not an ESM
  // file that has been converted to a CommonJS file using a Babel-
  // compatible transform (i.e. "__esModule" has not been set), then set
  // "default" to the CommonJS "module.exports" for node compatibility.
  isNodeMode || !mod || !mod.__esModule ? __defProp(target, "default", { value: mod, enumerable: true }) : target,
  mod
));

// packages/Epoch.Community.Core/dist/authorization.js
var require_authorization = __commonJS({
  "packages/Epoch.Community.Core/dist/authorization.js"(exports) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    exports.hasCommunityPermission = hasCommunityPermission;
    exports.canReadCommunityResource = canReadCommunityResource;
    function hasCommunityPermission(authorization, permission) {
      return authorization.actorId !== void 0 && authorization.permissions?.includes(permission) === true;
    }
    function canReadCommunityResource(target, authorization = {}) {
      const actorId = authorization.actorId;
      if (target.kind === "dm") {
        if (actorId === void 0)
          return false;
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
  }
});

// packages/Epoch.Community.Core/dist/navigation.js
var require_navigation = __commonJS({
  "packages/Epoch.Community.Core/dist/navigation.js"(exports) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    exports.NAVIGATION_ACTION_IDS = void 0;
    exports.NAVIGATION_ACTION_IDS = [
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
  }
});

// packages/Epoch.Community.Core/dist/actions.js
var require_actions = __commonJS({
  "packages/Epoch.Community.Core/dist/actions.js"(exports) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    exports.BUILT_IN_ACTIONS = exports.COMMUNITY_ACTION_IDS = void 0;
    exports.createActionRegistry = createActionRegistry;
    var navigation_1 = require_navigation();
    exports.COMMUNITY_ACTION_IDS = [
      ...navigation_1.NAVIGATION_ACTION_IDS,
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
    exports.BUILT_IN_ACTIONS = exports.COMMUNITY_ACTION_IDS.map((actionId) => Object.freeze({
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
      if (definitionsById.size !== definitions.length)
        throw new Error("Action registry contains duplicate action IDs");
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
        if (definition === void 0)
          throw new Error(`Unknown community action: ${actionId}`);
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
        for (const [surface, values] of [["command", definition.commandAliases], ["slash", definition.slashAliases], ["voice", definition.voiceAliases]]) {
          for (const value of values ?? [])
            bind(`${surface}\0${value.normalize("NFC").toLocaleLowerCase("en-US")}`, definition.actionId);
        }
        if (definition.mcp !== void 0)
          bind(`mcp\0${definition.mcp.toolName}`, definition.actionId);
        for (const binding of definition.keyBindings ?? []) {
          for (const context of binding.contexts ?? definition.contexts)
            bind(`key\0${binding.key}\0${context}`, definition.actionId);
        }
      }
      function bind(key, actionId) {
        const previous = bindings.get(key);
        if (previous !== void 0 && previous !== actionId)
          throw new Error(`Action registry binding collision: ${previous} and ${actionId}`);
        bindings.set(key, actionId);
      }
    }
  }
});

// packages/Epoch.Community.Core/dist/convergence.js
var require_convergence = __commonJS({
  "packages/Epoch.Community.Core/dist/convergence.js"(exports) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    exports.ConvergenceWorkbench = void 0;
    exports.createConvergenceFixture = createConvergenceFixture;
    function createConvergenceFixture(options) {
      const ids = splitList(options.changes);
      const dependencyMap = /* @__PURE__ */ new Map();
      for (const relation of splitList(options.dependencies ?? "")) {
        const [child, parent] = relation.split(">");
        if (child !== void 0 && parent !== void 0)
          dependencyMap.set(child, [...dependencyMap.get(child) ?? [], parent]);
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
    var ConvergenceWorkbench = class {
      #state;
      constructor(snapshot) {
        this.#state = cloneState(snapshot);
      }
      snapshot() {
        return cloneState(this.#state);
      }
      reconstructDigest() {
        return this.#state.snapshotDigest;
      }
      splitChange(changeId, partIds, fileBoundaries) {
        const index = this.#state.changes.findIndex((change) => change.changeId === changeId);
        if (index < 0)
          return { ok: false, explanation: `Unknown change ${changeId}; change graph unchanged.` };
        const duplicateBoundary = new Set(fileBoundaries).size !== fileBoundaries.length;
        if (partIds.length < 2 || partIds.length !== fileBoundaries.length || duplicateBoundary || fileBoundaries.includes(this.#state.ambiguousPath ?? "")) {
          return { ok: false, explanation: `${this.#state.ambiguousPath ?? "edit"} contains an ambiguous hunk; define a human boundary before splitting. Change graph unchanged.` };
        }
        if (new Set(partIds).size !== partIds.length || partIds.some((id) => this.#state.changes.some((change) => change.changeId === id && change.changeId !== changeId))) {
          return { ok: false, explanation: "Split identities must be unique; change graph unchanged." };
        }
        const original = this.#state.changes[index];
        if (original === void 0)
          throw new Error(`Invariant: missing change ${changeId}`);
        const parts = partIds.map((partId, partIndex) => createChange(partId, partIndex === 0 ? original.dependsOn : [partIds[partIndex - 1] ?? original.changeId], false, [fileBoundaries[partIndex] ?? "unknown"]));
        const lastPart = parts.at(-1)?.changeId ?? changeId;
        this.#state.changes = this.#state.changes.flatMap((change) => change.changeId === changeId ? parts : [{ ...change, dependsOn: change.dependsOn.map((dependency) => dependency === changeId ? lastPart : dependency) }]);
        this.#state.selectedChangeId = parts[0]?.changeId ?? this.#state.selectedChangeId;
        return { ok: true, explanation: `Split ${changeId} at explicit file boundaries; reconstructed snapshot remains ${this.#state.snapshotDigest}.` };
      }
      revisionHistory(changeId) {
        const change = this.#change(changeId);
        return { heads: [...change.currentRevisionIds], revisions: change.revisions.map((revision) => ({ ...revision })) };
      }
      planPartialMerge(changeId) {
        this.#change(changeId);
        const includedSet = /* @__PURE__ */ new Set();
        const visit = (id) => {
          if (includedSet.has(id))
            return;
          for (const dependency of this.#change(id).dependsOn)
            visit(dependency);
          includedSet.add(id);
        };
        visit(changeId);
        const included = this.#state.changes.filter((change) => includedSet.has(change.changeId)).map((change) => change.changeId);
        const excluded = this.#state.changes.filter((change) => !includedSet.has(change.changeId)).map((change) => change.changeId);
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
        const sources = plan.included.map((id) => this.#change(id));
        const changeId = `squash-${sources.map((change) => change.changeId).join("-")}`;
        const sourceRevisions = sources.flatMap((change) => change.currentRevisionIds);
        return {
          ...createChange(changeId, [], false, sources.flatMap((change) => change.files)),
          sourceChanges: sources.map((change) => change.changeId),
          sourceRevisions
        };
      }
      mergeAuthority(changeId) {
        const change = this.#change(changeId);
        const stale = this.#state.gates.find((gate) => gate.changeId === changeId && gate.state === "stale");
        if (stale !== void 0)
          return { allowed: false, explanation: `STALE approval targets ${stale.revisionId ?? "an older revision"}; current revision is ${change.currentRevisionIds.join(", ")}. Re-review before merge.` };
        const blockers = this.#state.gates.filter((gate) => gate.changeId === changeId && gate.state !== "passing");
        return blockers.length === 0 ? { allowed: true, explanation: "Current gates pass; confirmation is still required." } : { allowed: false, explanation: `Blocked by ${blockers.map((gate) => `${gate.label}: ${gate.state}`).join(", ")}.` };
      }
      resolveConflict(conflictId, input) {
        const index = this.#state.conflicts.findIndex((conflict) => conflict.conflictId === conflictId);
        const current = this.#state.conflicts[index];
        if (current === void 0)
          throw new Error(`Unknown conflict: ${conflictId}`);
        if (input.strategy === "deterministic")
          return { ...current };
        if (input.strategy === "ai-proposal") {
          const next = { ...current, aiProposalState: "untrusted-proposal" };
          this.#state.conflicts[index] = next;
          return { ...next, trust: "untrusted-proposal" };
        }
        requireMutation({ authority: input.authority, confirmed: input.confirmed === true }, "maintainer.resolve", "resolve conflict");
        const resolved = { ...current, state: "resolved", acceptedBy: "human" };
        this.#state.conflicts[index] = resolved;
        return resolved;
      }
      hydrate(objectId) {
        const replica = this.#state.replica;
        if (replica === void 0 || !replica.promisedObjectIds.includes(objectId))
          throw new Error(`Object ${objectId} is not promised by this replica.`);
        this.#state.replica = { ...replica, online: true, hydratedObjectIds: [.../* @__PURE__ */ new Set([...replica.hydratedObjectIds, objectId])] };
        return { availability: "available", integrity: replica.integrity, copyMode: replica.copyMode, executionIsolation: replica.executionIsolation };
      }
      synchronizeMirror() {
        const forge = this.#state.forge;
        if (forge === void 0)
          throw new Error("No forge mirror configured.");
        this.#state.forge = { ...forge, mirrorState: "current" };
        return { jjChangeId: forge.jjChangeId, fidelity: forge.fidelity, exportPayload: JSON.stringify({ changeId: forge.jjChangeId, revision: this.#state.changes[0]?.currentRevisionIds[0], fidelity: forge.fidelity }) };
      }
      reserveAgentBudget(amount) {
        const agent = this.#agent();
        if (!Number.isFinite(amount) || amount <= 0 || amount > agent.budget.allocated - agent.budget.consumed - agent.budget.reserved - agent.budget.expired)
          throw new Error("Budget reservation exceeds remaining allocation.");
        this.#state.agent = { ...agent, budget: { ...agent.budget, reserved: agent.budget.reserved + amount } };
        return { ...this.#agent().budget };
      }
      consumeAgentBudget(amount) {
        const agent = this.#agent();
        if (!Number.isFinite(amount) || amount <= 0 || amount > agent.budget.reserved)
          throw new Error("Budget consumption requires a matching reservation.");
        this.#state.agent = { ...agent, budget: { ...agent.budget, reserved: agent.budget.reserved - amount, consumed: agent.budget.consumed + amount } };
        return { ...this.#agent().budget };
      }
      revokeAgentGrant() {
        const agent = this.#agent();
        this.#state.agent = { ...agent, grantStatus: "revoked" };
      }
      authorizeAgentWork() {
        const agent = this.#agent();
        const allowed2 = agent.principalKeyStatus === "active" && agent.grantStatus === "active" && agent.budget.allocated > agent.budget.consumed + agent.budget.expired;
        return { allowed: allowed2, explanation: allowed2 ? `${agent.principalId} sponsored by ${agent.sponsorId}: active grant and budget available.` : `${agent.principalId} sponsored by ${agent.sponsorId}: ${agent.grantStatus} grant; budget cannot authorize new work.` };
      }
      archiveRelease(input) {
        if (input.visibility === "private")
          return { status: "denied-private", explanation: "Private content and raw sessions are never submitted to a public archive." };
        requireMutation(input, "release.archive", "public archive");
        if (this.#state.archive === void 0)
          throw new Error("Release has no archival identity.");
        return { status: "remote-confirmed", swhid: this.#state.archive.swhid, explanation: "Remote archive confirmed the public release." };
      }
      #change(changeId) {
        const change = this.#state.changes.find((candidate) => candidate.changeId === changeId);
        if (change === void 0)
          throw new Error(`Unknown change: ${changeId}`);
        return change;
      }
      #agent() {
        if (this.#state.agent === void 0)
          throw new Error("No agent authority configured.");
        return this.#state.agent;
      }
    };
    exports.ConvergenceWorkbench = ConvergenceWorkbench;
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
      if (input.authority !== authority)
        throw new Error(`${action} requires authority ${authority}.`);
      if (!input.confirmed)
        throw new Error(`${action} requires explicit confirmation.`);
    }
  }
});

// packages/Epoch.Community.Core/dist/errors.js
var require_errors = __commonJS({
  "packages/Epoch.Community.Core/dist/errors.js"(exports) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    exports.CommunityError = void 0;
    exports.communityErrorHttpStatus = communityErrorHttpStatus;
    exports.isCommunityError = isCommunityError;
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
    var CommunityError4 = class extends Error {
      code;
      httpStatus;
      details;
      constructor(code, message, details, options) {
        super(message, options);
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
    exports.CommunityError = CommunityError4;
    function communityErrorHttpStatus(code) {
      return STATUS_BY_CODE[code];
    }
    function isCommunityError(error) {
      return error instanceof CommunityError4 || typeof error === "object" && error !== null && error.name === "CommunityError" && typeof error.message === "string" && isCommunityErrorCode(error.code) && error.httpStatus === communityErrorHttpStatus(error.code);
    }
    function isCommunityErrorCode(value) {
      return typeof value === "string" && Object.hasOwn(STATUS_BY_CODE, value);
    }
  }
});

// packages/Epoch.Community.Core/dist/identity.js
var require_identity = __commonJS({
  "packages/Epoch.Community.Core/dist/identity.js"(exports) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    exports.VERSION = void 0;
    exports.validateObjectRef = validateObjectRef;
    exports.validateProjectionId = validateProjectionId;
    exports.objectUrl = objectUrl;
    exports.parseObjectUrl = parseObjectUrl;
    exports.VERSION = "community-core/1";
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
      if (typeof value !== "object" || value === null)
        throw new Error("Community object reference must be an object");
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
      if (ref.revision !== void 0)
        validateRevision(ref.revision);
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
      if (url.pathname !== "/board.html")
        return void 0;
      const projectionId = url.searchParams.get("projection") ?? void 0;
      const objectId = url.searchParams.get(projectionId === void 0 ? "object" : "focus") ?? void 0;
      if (objectId === void 0 || !opaqueId.test(objectId))
        return void 0;
      if (projectionId !== void 0 && !opaqueId.test(projectionId))
        return void 0;
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
  }
});

// packages/Epoch.Community.Core/dist/entity.js
var require_entity = __commonJS({
  "packages/Epoch.Community.Core/dist/entity.js"(exports) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    exports.communityMessageToEntity = communityMessageToEntity;
    exports.communityEntityToMessage = communityEntityToMessage;
    exports.validateCommunityEntity = validateCommunityEntity;
    exports.isCommunityFieldValue = isCommunityFieldValue;
    exports.validateIsoDateTime = validateIsoDateTime;
    var errors_1 = require_errors();
    var identity_1 = require_identity();
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
    function communityMessageToEntity(message, options) {
      const value = cloneMessage(message);
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
        throw new errors_1.CommunityError("INVALID_ENTITY", "Community entity is not a lossless message projection");
      }
      return cloneMessage(validated.domain.value);
    }
    function validateCommunityEntity(value) {
      if (typeof value !== "object" || value === null)
        invalid("Community entity must be an object");
      const input = value;
      const ref = (0, identity_1.validateObjectRef)(input.ref);
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
      if (!Number.isFinite(timestamp))
        invalid(`${label} must be a valid datetime`);
      return new Date(timestamp).toISOString();
    }
    function validateFields(value) {
      if (typeof value !== "object" || value === null || Array.isArray(value))
        invalid("Community entity fields must be an object");
      const output = /* @__PURE__ */ Object.create(null);
      for (const [name, field] of Object.entries(value)) {
        if (!FIELD_NAME.test(name))
          invalid(`Invalid community field name: ${name}`);
        if (!isCommunityFieldValue(field))
          invalid(`Community field value is invalid: ${name}`);
        output[name] = Array.isArray(field) ? Object.freeze([...field]) : field;
      }
      return Object.freeze(output);
    }
    function validateSearchableText(value) {
      if (typeof value !== "object" || value === null || Array.isArray(value))
        invalid("searchableText must be an object");
      const output = /* @__PURE__ */ Object.create(null);
      for (const [name, text] of Object.entries(value)) {
        if (!FIELD_NAME.test(name) || typeof text !== "string" || text.length > 1e7)
          invalid(`Invalid searchable text field: ${name}`);
        output[name] = text;
      }
      return Object.freeze(output);
    }
    function validateRelations(value) {
      if (!Array.isArray(value) || value.length > 1e5)
        invalid("Community entity relations must be a bounded array");
      return Object.freeze(value.map((candidate) => {
        if (typeof candidate !== "object" || candidate === null)
          invalid("Community relation must be an object");
        const relation = candidate;
        if (!RELATION_TYPES.has(relation.type))
          invalid(`Unsupported community relation: ${String(relation.type)}`);
        return Object.freeze({
          type: relation.type,
          source: (0, identity_1.validateObjectRef)(relation.source),
          target: (0, identity_1.validateObjectRef)(relation.target)
        });
      }));
    }
    function cloneProvenance(value) {
      if (typeof value !== "object" || value === null)
        invalid("Community provenance must be an object");
      const provenance = value;
      const uri = provenance.uri;
      if (uri !== void 0)
        validateProvenanceUri(uri);
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
      if (/^at:\/\/[^/]+\/[^/]+\/[^/]+$/u.test(value))
        return value;
      try {
        const uri = new URL(value);
        if (!["https:", "http:"].includes(uri.protocol) || uri.username || uri.password)
          invalid("Community provenance URI is invalid");
      } catch {
        invalid("Community provenance URI is invalid");
      }
      return value;
    }
    function cloneMessage(message) {
      const publishedAt = validateIsoDateTime(message.publishedAt, "message.publishedAt");
      const updatedAt = message.updatedAt === void 0 ? void 0 : validateIsoDateTime(message.updatedAt, "message.updatedAt");
      const relations = validateRelations(message.relations);
      const reactions = message.reactions === void 0 ? void 0 : Object.freeze({ ...message.reactions });
      if (reactions !== void 0 && Object.entries(reactions).some(([token, count]) => token.length === 0 || !Number.isFinite(count) || count < 0)) {
        invalid("Message reactions must contain finite non-negative counts");
      }
      return Object.freeze({
        ref: (0, identity_1.validateObjectRef)(message.ref),
        context: (0, identity_1.validateObjectRef)(message.context),
        authorId: boundedString(message.authorId, "message.authorId"),
        ...message.title === void 0 ? {} : { title: message.title },
        body: message.body,
        publishedAt,
        ...updatedAt === void 0 ? {} : { updatedAt },
        ...message.inReplyTo === void 0 ? {} : { inReplyTo: (0, identity_1.validateObjectRef)(message.inReplyTo) },
        threadRoot: (0, identity_1.validateObjectRef)(message.threadRoot),
        relations,
        ...reactions === void 0 ? {} : { reactions },
        state: boundedString(message.state, "message.state"),
        aliases: canonicalStrings(message.aliases, "message.aliases", false),
        ...message.tombstone === void 0 ? {} : { tombstone: cloneTombstone(message.tombstone) }
      });
    }
    function validateDomain(value, ref, createdAt, updatedAt) {
      if (value === void 0)
        return void 0;
      if (typeof value !== "object" || value === null || value.kind !== "message") {
        invalid("Unsupported community entity domain projection");
      }
      const message = cloneMessage(value.value);
      if (message.ref.objectId !== ref.objectId || message.publishedAt !== createdAt || (message.updatedAt ?? message.publishedAt) !== updatedAt) {
        invalid("Message projection does not match its canonical entity");
      }
      return Object.freeze({ kind: "message", value: message });
    }
    function cloneTombstone(value) {
      if (typeof value !== "object" || value === null)
        invalid("Community tombstone must be an object");
      const tombstone = value;
      if (!["deleted", "moderated", "missing", "unavailable", "unauthorized"].includes(tombstone.reason)) {
        invalid("Community tombstone reason is invalid");
      }
      const formerKind = (0, identity_1.validateObjectRef)({ objectId: "former-kind", kind: tombstone.formerKind }).kind;
      return Object.freeze({
        formerKind,
        reason: tombstone.reason,
        ...tombstone.deletedAt === void 0 ? {} : { deletedAt: validateIsoDateTime(tombstone.deletedAt, "tombstone.deletedAt") },
        ...tombstone.replacement === void 0 ? {} : { replacement: (0, identity_1.validateObjectRef)(tombstone.replacement) }
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
    function invalid(message) {
      throw new errors_1.CommunityError("INVALID_ENTITY", message);
    }
  }
});

// packages/Epoch.Community.Core/dist/fields.js
var require_fields = __commonJS({
  "packages/Epoch.Community.Core/dist/fields.js"(exports) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    exports.CORE_COMMUNITY_FIELDS = void 0;
    exports.createCommunityFieldRegistry = createCommunityFieldRegistry;
    var errors_1 = require_errors();
    var entity_1 = require_entity();
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
    exports.CORE_COMMUNITY_FIELDS = Object.freeze([
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
      if (!Number.isSafeInteger(version) || version < 1)
        throw new errors_1.CommunityError("INVALID_FIELD", "Field registry version must be a positive integer");
      const definitions = [
        ...exports.CORE_COMMUNITY_FIELDS.map((definition) => validateDefinition(definition, false)),
        ...sourceDefinitions.map((definition) => validateDefinition(definition, true))
      ];
      const byName = /* @__PURE__ */ new Map();
      const register = (key, definition) => {
        const normalized = key.toLocaleLowerCase("en-US");
        if (byName.has(normalized))
          throw new errors_1.CommunityError("INVALID_FIELD", `Duplicate community field or alias: ${key}`);
        byName.set(normalized, definition);
      };
      for (const definition of definitions) {
        register(definition.name, definition);
        for (const alias of definition.aliases)
          register(alias, definition);
      }
      const ordered = Object.freeze([...new Set(byName.values())].sort((left, right) => left.name.localeCompare(right.name, "en")));
      return Object.freeze({
        version,
        list: (authorization) => Object.freeze(ordered.filter((definition) => !definition.sensitive || hasSensitiveFieldPermission(authorization))),
        resolve: (name) => typeof name === "string" ? byName.get(name.toLocaleLowerCase("en-US")) : void 0,
        validateValue,
        suggest: (name, authorization = {}) => suggestions(name, ordered.filter((definition) => !definition.sensitive || hasSensitiveFieldPermission(authorization)))
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
      if (typeof input !== "object" || input === null || !NAME.test(input.name))
        throw new errors_1.CommunityError("INVALID_FIELD", "Community field name is invalid");
      if (source && !SOURCE_NAME.test(input.name))
        throw new errors_1.CommunityError("INVALID_FIELD", "Source-contributed fields must use a namespaced name");
      if (!Array.isArray(input.aliases) || input.aliases.some((alias) => !NAME.test(alias)))
        throw new errors_1.CommunityError("INVALID_FIELD", `Aliases for ${input.name} are invalid`);
      if (!Array.isArray(input.operators) || input.operators.length === 0 || input.operators.some((operator) => !ALL_OPERATORS.has(operator))) {
        throw new errors_1.CommunityError("INVALID_FIELD", `Operators for ${input.name} are invalid`);
      }
      if (input.operators.some((operator) => !OPERATORS_BY_TYPE[input.type]?.has(operator))) {
        throw new errors_1.CommunityError("INVALID_FIELD", `Operators for ${input.name} are incompatible with ${input.type}`);
      }
      if (input.description.length === 0 || input.description.length > 1024)
        throw new errors_1.CommunityError("INVALID_FIELD", `Description for ${input.name} is invalid`);
      if (input.enumValues?.some((value) => typeof value !== "string" || value.length === 0 || value.length > 512) === true) {
        throw new errors_1.CommunityError("INVALID_FIELD", `Enum values for ${input.name} are invalid`);
      }
      return Object.freeze({
        ...input,
        aliases: Object.freeze([...input.aliases]),
        operators: Object.freeze([...new Set(input.operators)]),
        ...input.enumValues === void 0 ? {} : { enumValues: Object.freeze([...new Set(input.enumValues)]) }
      });
    }
    function validateValue(fieldDefinition, value) {
      const values = Array.isArray(value) ? value : [value];
      if (values.length > 4096)
        throw invalidValue(fieldDefinition, "contains too many values");
      const validated = values.map((candidate) => validateScalar(fieldDefinition, candidate));
      return Object.freeze(Array.isArray(value) ? validated : validated[0]);
    }
    function validateScalar(fieldDefinition, value) {
      if (value === null)
        return null;
      let result;
      switch (fieldDefinition.type) {
        case "number":
          if (typeof value !== "number" || !Number.isFinite(value))
            throw invalidValue(fieldDefinition, "must be a finite number");
          result = value;
          break;
        case "boolean":
          if (typeof value !== "boolean")
            throw invalidValue(fieldDefinition, "must be a boolean");
          result = value;
          break;
        case "datetime":
          try {
            result = (0, entity_1.validateIsoDateTime)(value, fieldDefinition.name);
          } catch {
            throw invalidValue(fieldDefinition, "must be a datetime with an explicit timezone");
          }
          break;
        case "object-id":
          if (typeof value !== "string" || !OBJECT_ID.test(value))
            throw invalidValue(fieldDefinition, "must be an opaque object ID");
          result = value;
          break;
        case "uri":
          if (typeof value !== "string")
            throw invalidValue(fieldDefinition, "must be a URI");
          try {
            new URL(value);
          } catch {
            throw invalidValue(fieldDefinition, "must be an absolute URI");
          }
          result = value;
          break;
        case "keyword":
        case "text":
          if (typeof value !== "string" || value.length > 1e6)
            throw invalidValue(fieldDefinition, "must be a bounded string");
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
      return new errors_1.CommunityError("INVALID_FIELD", `${fieldDefinition.name} ${reason}`);
    }
    function operatorSet(...operators) {
      return new Set(operators);
    }
  }
});

// packages/Epoch.Community.Core/dist/graph.js
var require_graph = __commonJS({
  "packages/Epoch.Community.Core/dist/graph.js"(exports) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    exports.createMessageGraph = createMessageGraph;
    exports.threadRelations = threadRelations;
    var identity_1 = require_identity();
    function createMessageGraph(input) {
      const messages = /* @__PURE__ */ new Map();
      for (const message of input) {
        const ref = (0, identity_1.validateObjectRef)(message.ref);
        (0, identity_1.validateObjectRef)(message.context);
        (0, identity_1.validateObjectRef)(message.threadRoot);
        if (message.inReplyTo !== void 0)
          (0, identity_1.validateObjectRef)(message.inReplyTo);
        if (messages.has(ref.objectId))
          throw new Error(`Duplicate community object ID: ${ref.objectId}`);
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
        if (message.inReplyTo === void 0)
          continue;
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
          if (ancestors.has(objectId))
            throw new Error(`Community reply graph contains a cycle at ${objectId}`);
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
        if (start === void 0)
          throw new Error(`Community object not found: ${idOf(ref)}`);
        let current = start;
        const visited = /* @__PURE__ */ new Set();
        while (current.inReplyTo !== void 0) {
          if (visited.has(current.ref.objectId))
            throw new Error(`Community reply graph contains a cycle at ${current.ref.objectId}`);
          visited.add(current.ref.objectId);
          const parent = messages.get(current.inReplyTo.objectId);
          if (parent === void 0)
            return current.inReplyTo;
          current = parent;
        }
        return current.ref;
      };
      const sibling = (ref, delta) => {
        const parent = parentOf(ref);
        if (parent === void 0)
          return void 0;
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
  }
});

// packages/Epoch.Community.Core/dist/query-evaluator.js
var require_query_evaluator = __commonJS({
  "packages/Epoch.Community.Core/dist/query-evaluator.js"(exports) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    exports.evaluateSearchExpression = evaluateSearchExpression;
    exports.searchFieldValues = searchFieldValues;
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
            if (result)
              matched.add(node.field);
            return result;
          }
          case "range": {
            const result = values(entity, node.field).some((value) => inRange(value, node));
            if (result)
              matched.add(node.field);
            return result;
          }
          case "text": {
            const fields = node.fields.length === 0 ? Object.keys(entity.searchableText) : node.fields;
            const result = fields.some((field) => {
              const found = values(entity, field).some((value) => typeof value === "string" && textMatches(value, node.value, node.mode));
              if (found)
                matched.add(field);
              return found;
            });
            return result;
          }
          case "related": {
            const result = relationMatches(entity, node, options.resolveEntity, options.relationsFor);
            if (result)
              matched.add(`related.${node.relation}`);
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
        for (const entity of frontier)
          for (const relation of relationsFor?.(entity.ref.objectId) ?? entity.relations) {
            if (relation.type !== node.relation)
              continue;
            const adjacent = node.direction === "out" && relation.source.objectId === entity.ref.objectId ? relation.target : node.direction === "in" && relation.target.objectId === entity.ref.objectId ? relation.source : void 0;
            if (adjacent === void 0)
              continue;
            if (adjacent.objectId === node.target.objectId)
              return true;
            const resolved = resolveEntity?.(adjacent.objectId);
            if (resolved !== void 0 && !visited.has(adjacent.objectId)) {
              visited.add(adjacent.objectId);
              next.push(resolved);
            }
          }
        frontier = next;
        if (frontier.length === 0)
          return false;
      }
      return false;
    }
    function searchFieldValues(entity, field) {
      return values(entity, field);
    }
    function values(entity, field) {
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
      const value = special[field] ?? entity.fields[field] ?? entity.searchableText[field];
      return value === void 0 ? [] : Array.isArray(value) ? value : [value];
    }
    function compareCandidates(candidates, operator, expected) {
      const wanted = Array.isArray(expected) ? expected : [expected];
      if (operator === "ne")
        return candidates.every((candidate) => wanted.every((value) => compare(candidate, value) !== 0));
      if (operator === "in")
        return candidates.some((candidate) => wanted.some((value) => compare(candidate, value) === 0));
      return candidates.some((candidate) => wanted.some((value) => {
        const result = compare(candidate, value);
        return operator === "eq" ? result === 0 : operator === "lt" ? result < 0 : operator === "lte" ? result <= 0 : operator === "gt" ? result > 0 : result >= 0;
      }));
    }
    function compare(left, right) {
      if (left === right)
        return 0;
      if (left === null)
        return -1;
      if (right === null)
        return 1;
      if (typeof left !== typeof right)
        return Number.NaN;
      if (typeof left === "number" && typeof right === "number")
        return left - right;
      if (typeof left === "boolean" && typeof right === "boolean")
        return Number(left) - Number(right);
      return String(left).localeCompare(String(right), "en", { sensitivity: "variant" });
    }
    function inRange(value, range) {
      if (value === null)
        return false;
      const lower = range.lower === void 0 ? true : range.includeLower ? compare(value, range.lower) >= 0 : compare(value, range.lower) > 0;
      const upper = range.upper === void 0 ? true : range.includeUpper ? compare(value, range.upper) <= 0 : compare(value, range.upper) < 0;
      return lower && upper;
    }
    function textMatches(candidate, query, mode2) {
      const normalizedCandidate = normalizeText(candidate);
      const normalizedQuery = normalizeText(query);
      if (mode2 === "phrase")
        return normalizedCandidate.includes(normalizedQuery);
      const words = tokenize(normalizedCandidate);
      return mode2 === "prefix" ? words.some((word) => word.startsWith(normalizedQuery)) : words.includes(normalizedQuery);
    }
    function normalizeText(value) {
      return value.normalize("NFKC").toLocaleLowerCase("en-US");
    }
    function tokenize(value) {
      return value.match(/[\p{L}\p{N}_+-]+/gu) ?? [];
    }
  }
});

// packages/Epoch.Community.Core/dist/search-expression.js
var require_search_expression = __commonJS({
  "packages/Epoch.Community.Core/dist/search-expression.js"(exports) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    exports.semanticExpression = semanticExpression;
    exports.canonicalExpressionJson = canonicalExpressionJson;
    exports.stableQueryHash = stableQueryHash;
    function semanticExpression(expression) {
      if (expression === null)
        return null;
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
  }
});

// packages/Epoch.Community.Core/dist/query-parser.js
var require_query_parser = __commonJS({
  "packages/Epoch.Community.Core/dist/query-parser.js"(exports) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    exports.MAX_QUERY_DEPTH = exports.MAX_QUERY_NODES = exports.MAX_QUERY_BYTES = exports.QUERY_FIELD_REGISTRY_VERSION = exports.QUERY_LANGUAGE_VERSION = void 0;
    exports.parseCommunityQuery = parseCommunityQuery;
    exports.serializeExpression = serializeExpression;
    var fields_1 = require_fields();
    var identity_1 = require_identity();
    var search_expression_1 = require_search_expression();
    exports.QUERY_LANGUAGE_VERSION = 2;
    exports.QUERY_FIELD_REGISTRY_VERSION = 2;
    exports.MAX_QUERY_BYTES = 16384;
    exports.MAX_QUERY_NODES = 256;
    exports.MAX_QUERY_DEPTH = 16;
    var MAX_VALUE_LENGTH = 2048;
    var MIN_PREFIX_LENGTH = 2;
    var DEFAULT_FIELD_REGISTRY = (0, fields_1.createCommunityFieldRegistry)([], exports.QUERY_FIELD_REGISTRY_VERSION);
    var QueryFailure = class extends Error {
      code;
      span;
      suggestions;
      constructor(code, message, span, suggestions = []) {
        super(message);
        this.code = code;
        this.span = span;
        this.suggestions = suggestions;
      }
    };
    function parseCommunityQuery(input, options = {}) {
      const fieldRegistryVersion = options.fieldRegistryVersion ?? options.fieldRegistry?.version ?? exports.QUERY_FIELD_REGISTRY_VERSION;
      let resolvedAt;
      try {
        resolvedAt = normalizeNow(options.now);
      } catch (error) {
        const failure = error instanceof QueryFailure ? error : new QueryFailure("QUERY_CONTEXT_INVALID", String(error));
        return invalid(failure, "1970-01-01T00:00:00.000Z", fieldRegistryVersion);
      }
      if (options.version !== void 0 && options.version > exports.QUERY_LANGUAGE_VERSION) {
        return invalid(new QueryFailure("QUERY_VERSION_UNSUPPORTED", `Query language version ${options.version} is newer than supported version ${exports.QUERY_LANGUAGE_VERSION}`), resolvedAt, fieldRegistryVersion);
      }
      if (new TextEncoder().encode(input).length > (options.maxBytes ?? exports.MAX_QUERY_BYTES)) {
        return invalid(new QueryFailure("QUERY_TOO_LARGE", `Query exceeds the ${options.maxBytes ?? exports.MAX_QUERY_BYTES} byte limit`), resolvedAt, fieldRegistryVersion);
      }
      try {
        const parser = new Parser(input, options, resolvedAt);
        const parsed = parser.parse();
        const separated = separateSort(parsed);
        const ast = separated.expression === null ? null : normalizeExpression(separated.expression);
        const canonical = [ast === null ? "" : serializeExpression(ast), ...separated.sorts.map((sort2) => sort2.canonical)].filter(Boolean).join(" ");
        const sort = separated.sorts.map((value) => value.order);
        const canonicalJson = JSON.stringify({ expression: JSON.parse((0, search_expression_1.canonicalExpressionJson)(ast)), sort });
        return {
          ast,
          canonical,
          canonicalJson,
          queryHash: (0, search_expression_1.stableQueryHash)(`${fieldRegistryVersion}
${canonicalJson}`),
          sort,
          version: exports.QUERY_LANGUAGE_VERSION,
          fieldRegistryVersion,
          resolvedAt,
          diagnostics: []
        };
      } catch (error) {
        const failure = error instanceof QueryFailure ? error : new QueryFailure("QUERY_SYNTAX", error instanceof Error ? error.message : String(error));
        return invalid(failure, resolvedAt, fieldRegistryVersion);
      }
    }
    var Parser = class {
      input;
      options;
      resolvedAt;
      tokens;
      fieldRegistry;
      position = 0;
      nodes = 0;
      depth = 0;
      constructor(input, options, resolvedAt) {
        this.input = input;
        this.options = options;
        this.resolvedAt = resolvedAt;
        this.tokens = tokenize(input);
        this.fieldRegistry = options.fieldRegistry ?? DEFAULT_FIELD_REGISTRY;
      }
      parse() {
        if (this.peek().type === "EOF")
          return null;
        const result = this.parseOr();
        if (this.peek().type !== "EOF")
          this.fail("QUERY_SYNTAX", `Unexpected trailing input: ${this.peek().value || this.peek().type}`, this.peek());
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
        if (terms.length === 1)
          return terms[0];
        const expressions = terms.filter((term) => term.kind !== "sort-marker");
        const markers = terms.filter((term) => term.kind === "sort-marker");
        if (expressions.length === 0)
          return markers.length === 1 ? markers[0] : this.combineSorts(markers);
        const expression = expressions.length === 1 ? expressions[0] : this.node({
          kind: "and",
          terms: expressions,
          span: mergeSpans(expressions[0]?.span, expressions.at(-1)?.span)
        });
        if (markers.length === 0)
          return expression;
        return this.node({ kind: "and", terms: [expression, ...markers], span: mergeSpans(expression.span, markers.at(-1)?.span) });
      }
      combineSorts(markers) {
        return this.node({ kind: "and", terms: markers, span: mergeSpans(markers[0]?.span, markers.at(-1)?.span) });
      }
      parseNot(inherited) {
        const negation = this.take("NOT");
        if (negation === void 0)
          return this.parsePrimary(inherited);
        const term = this.parseNot(inherited);
        if (term.kind === "sort-marker")
          this.fail("QUERY_SORT_CONTEXT", "A sort clause cannot be negated", negation);
        return this.node({ kind: "not", term, span: spanBetween(this.input, negation.start, term.span?.end ?? negation.end) });
      }
      parsePrimary(inherited) {
        const open = this.take("LPAREN");
        if (open !== void 0) {
          this.depth += 1;
          if (this.depth > (this.options.maxDepth ?? exports.MAX_QUERY_DEPTH))
            this.fail("QUERY_DEPTH_LIMIT", "Query nesting is too deep", open);
          const expression = this.parseOr(inherited);
          const close = this.expect("RPAREN");
          this.depth -= 1;
          if (expression.kind === "sort-marker")
            return { ...expression, span: spanBetween(this.input, open.start, close.end) };
          return { ...expression, span: spanBetween(this.input, open.start, close.end) };
        }
        const phrase = this.take("PHRASE");
        if (phrase !== void 0)
          return this.text(inherited, phrase.value, "phrase", phrase);
        const word = this.take("WORD");
        if (word === void 0)
          this.fail("QUERY_SYNTAX", `Unexpected token: ${this.peek().value || this.peek().type}`, this.peek());
        if (this.take("COLON") === void 0) {
          if (inherited !== void 0)
            return this.fieldValue(inherited, "eq", word.value, false, word);
          return this.text(void 0, word.value, word.value.endsWith("*") ? "prefix" : "term", word);
        }
        if (word.value.toLowerCase() === "sort")
          return this.sort(word);
        if (word.value.toLowerCase().startsWith("related."))
          return this.related(word);
        const field = this.resolveField(word);
        const fieldGroup = this.take("LPAREN");
        if (fieldGroup !== void 0) {
          this.depth += 1;
          if (this.depth > (this.options.maxDepth ?? exports.MAX_QUERY_DEPTH))
            this.fail("QUERY_DEPTH_LIMIT", "Query nesting is too deep", fieldGroup);
          const expression = this.parseOr(field);
          const close = this.expect("RPAREN");
          this.depth -= 1;
          if (expression.kind === "sort-marker")
            this.fail("QUERY_SORT_CONTEXT", "Sort is not valid inside a field group", word);
          return { ...expression, span: spanBetween(this.input, word.start, close.end) };
        }
        const operator = this.readOperator();
        const rangeOpen = this.take("LBRACKET") ?? this.take("LBRACE");
        if (rangeOpen !== void 0)
          return this.range(field, rangeOpen, word.start);
        const phraseValue = this.take("PHRASE");
        if (phraseValue !== void 0)
          return this.fieldValue(field, operator, phraseValue.value, true, spanToken(word.start, phraseValue.end));
        const valueToken = this.readValueToken();
        if (valueToken.value === "*" && operator === "eq") {
          this.requireOperator(field, "exists", word);
          return this.node({ kind: "exists", field: field.name, span: spanBetween(this.input, word.start, valueToken.end) });
        }
        return this.fieldValue(field, operator, valueToken.value, false, spanToken(word.start, valueToken.end));
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
          if (!["first", "last"].includes(nulls))
            this.fail("QUERY_INVALID_SORT", `Invalid null ordering: ${nulls}`, fieldToken, ["first", "last"]);
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
        const allowed2 = ["reply", "quote", "mention", "provenance", "promotion", "replacement", "moderation", "attachment", "backlink"];
        if (!allowed2.includes(relation)) {
          this.fail("QUERY_UNKNOWN_RELATION", `Unknown relation: ${relation}`, fieldToken, nearest(relation, allowed2));
        }
        const value = this.readValueToken();
        const slash = value.value.indexOf("/");
        const kind = slash < 0 ? "message" : value.value.slice(0, slash);
        const objectId = slash < 0 ? value.value : value.value.slice(slash + 1);
        let target;
        try {
          target = (0, identity_1.validateObjectRef)({ objectId, kind });
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
      range(field, open, start) {
        this.requireOperator(field, "in", open);
        const lowerToken = this.readValueToken();
        this.expect("TO");
        const upperToken = this.readValueToken();
        const close = this.take("RBRACKET") ?? this.take("RBRACE");
        if (close === void 0)
          this.fail("QUERY_SYNTAX", "Expected ] or } to close range", this.peek());
        const lower = lowerToken.value === "*" ? void 0 : this.convert(field, lowerToken.value, lowerToken);
        const upper = upperToken.value === "*" ? void 0 : this.convert(field, upperToken.value, upperToken);
        if (lower === void 0 && upper === void 0)
          this.fail("QUERY_INVALID_RANGE", "A range must have at least one bound", open);
        return this.node({
          kind: "range",
          field: field.name,
          ...lower === void 0 ? {} : { lower },
          ...upper === void 0 ? {} : { upper },
          includeLower: open.type === "LBRACKET",
          includeUpper: close.type === "RBRACKET",
          span: spanBetween(this.input, start, close.end)
        });
      }
      fieldValue(field, operator, raw, phrase, token) {
        if (raw.length > MAX_VALUE_LENGTH)
          this.fail("QUERY_VALUE_TOO_LARGE", `Query value exceeds ${MAX_VALUE_LENGTH} characters`, token);
        if (/^\/.*\/$/u.test(raw) || /[~?^]/u.test(raw))
          this.fail("QUERY_UNSUPPORTED_SYNTAX", "Regex, fuzzy, boost, and wildcard query syntax is not supported", token);
        const prefix = !phrase && raw.endsWith("*");
        if (prefix) {
          this.requireOperator(field, "prefix", token);
          const value2 = raw.slice(0, -1);
          if (value2.length < MIN_PREFIX_LENGTH)
            this.fail("QUERY_PREFIX_TOO_SHORT", `Prefix queries require at least ${MIN_PREFIX_LENGTH} characters`, token);
          if (value2.includes("*"))
            this.fail("QUERY_UNSUPPORTED_SYNTAX", "Only one trailing prefix wildcard is supported", token);
          return this.node({ kind: "text", fields: [field.name], value: value2.normalize("NFC"), mode: "prefix", span: tokenSpan(this.input, token) });
        }
        if (raw.includes("*"))
          this.fail("QUERY_UNSUPPORTED_SYNTAX", "Only one trailing prefix wildcard is supported", token);
        const mapped = compareOperator(operator);
        this.requireOperator(field, field.type === "text" && operator === "eq" ? phrase ? "phrase" : "term" : mapped, token);
        if (field.type === "datetime" && operator === "eq" && ["today", "yesterday"].includes(raw.toLowerCase())) {
          const bounds = contextualDay(raw.toLowerCase(), this.resolvedAt, this.options.timezone ?? "UTC", tokenSpan(this.input, token));
          return this.node({
            kind: "range",
            field: field.name,
            lower: bounds.lower,
            upper: bounds.upper,
            includeLower: true,
            includeUpper: false,
            span: tokenSpan(this.input, token)
          });
        }
        const contextual = raw.toLowerCase() === "me" && ["author", "owner"].includes(field.name);
        if (contextual && this.options.actorId === void 0)
          this.fail("QUERY_CONTEXT_REQUIRED", `Field ${field.name} requires an authenticated actor to resolve "me"`, token);
        const value = this.convert(field, contextual ? this.options.actorId : raw, token);
        if (field.type === "text" && operator === "eq") {
          return this.node({ kind: "text", fields: field.name === "text" ? ["title", "body"] : [field.name], value: String(value), mode: phrase ? "phrase" : "term", span: tokenSpan(this.input, token) });
        }
        return this.node({ kind: "compare", field: field.name, operator, value, span: tokenSpan(this.input, token) });
      }
      text(field, raw, mode2, token) {
        if (/[~?^]/u.test(raw) || /^\/.*\/$/u.test(raw))
          this.fail("QUERY_UNSUPPORTED_SYNTAX", "Regex, fuzzy, boost, and wildcard query syntax is not supported", token);
        const value = mode2 === "prefix" ? raw.slice(0, -1) : raw;
        if (mode2 === "prefix" && value.length < MIN_PREFIX_LENGTH)
          this.fail("QUERY_PREFIX_TOO_SHORT", `Prefix queries require at least ${MIN_PREFIX_LENGTH} characters`, token);
        if (raw.includes("*") && mode2 !== "prefix")
          this.fail("QUERY_UNSUPPORTED_SYNTAX", "Only one trailing prefix wildcard is supported", token);
        if (field !== void 0)
          return this.fieldValue(field, "eq", raw, mode2 === "phrase", token);
        return this.node({ kind: "text", fields: ["title", "body"], value: value.normalize("NFC"), mode: mode2, span: tokenSpan(this.input, token) });
      }
      convert(field, raw, token) {
        const value = raw.normalize("NFC");
        switch (field.type) {
          case "number": {
            if (!/^-?(?:0|[1-9]\d*)(?:\.\d+)?$/u.test(value))
              this.fail("QUERY_INVALID_VALUE", `${field.name} requires a finite number`, token);
            const number = Number(value);
            if (!Number.isFinite(number) || !Number.isSafeInteger(number) && !value.includes("."))
              this.fail("QUERY_INVALID_VALUE", `${field.name} requires a safe finite number`, token);
            return number;
          }
          case "boolean":
            if (!/^(?:true|false)$/iu.test(value))
              this.fail("QUERY_INVALID_VALUE", `${field.name} requires true or false`, token, ["true", "false"]);
            return value.toLowerCase() === "true";
          case "datetime":
            return normalizeDatetime(value, tokenSpan(this.input, token));
          case "uri": {
            try {
              return new URL(value).toString();
            } catch {
              return this.fail("QUERY_INVALID_VALUE", `${field.name} requires an absolute URI`, token);
            }
          }
          default:
            if (field.enumValues !== void 0 && !field.enumValues.includes(value.toLowerCase())) {
              this.fail("QUERY_INVALID_VALUE", `Unknown ${field.name} value: ${value}`, token, nearest(value, field.enumValues));
            }
            return field.enumValues === void 0 ? value : value.toLowerCase();
        }
      }
      readOperator() {
        const token = this.peek();
        const mapping = { EQ: "eq", NE: "ne", LT: "lt", LTE: "lte", GT: "gt", GTE: "gte" };
        const operator = mapping[token.type];
        if (operator === void 0)
          return "eq";
        this.position += 1;
        return operator;
      }
      readValueToken() {
        const first = this.take("WORD") ?? this.take("PHRASE");
        if (first === void 0)
          this.fail("QUERY_SYNTAX", "Expected a query value", this.peek());
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
        const field = this.fieldRegistry.resolve(token.value);
        const visible = field !== void 0 && this.fieldRegistry.list(this.options.authorization ?? {}).includes(field);
        if (field !== void 0 && visible)
          return field;
        const suggestions = this.fieldRegistry.suggest(token.value, this.options.authorization);
        this.fail("QUERY_UNKNOWN_FIELD", `Unknown query field "${token.value}"${suggestions[0] === void 0 ? "" : `; did you mean ${suggestions[0]}?`}`, token, suggestions);
      }
      requireOperator(field, operator, token) {
        if (!field.operators.includes(operator))
          this.fail("QUERY_INVALID_OPERATOR", `${operator} is not supported for ${field.name}`, token, field.operators);
      }
      combine(kind, left, right) {
        const terms = [left, right].flatMap((term) => term.kind === kind ? term.terms : [term]);
        return this.node({ kind, terms, span: mergeSpans(left.span, right.span) });
      }
      node(node) {
        this.nodes += 1;
        if (this.nodes > (this.options.maxNodes ?? exports.MAX_QUERY_NODES))
          this.fail("QUERY_NODE_LIMIT", "Query has too many clauses", node.span);
        return node;
      }
      peek() {
        return this.tokens[this.position] ?? this.tokens.at(-1);
      }
      previous() {
        return this.tokens[Math.max(0, this.position - 1)];
      }
      take(type) {
        if (this.peek().type !== type)
          return void 0;
        const token = this.peek();
        this.position += 1;
        return token;
      }
      expect(type) {
        const token = this.take(type);
        if (token === void 0)
          this.fail("QUERY_SYNTAX", `Expected ${type} near ${this.peek().value || "end"}`, this.peek());
        return token;
      }
      fail(code, message, value, suggestions = []) {
        const span = value === void 0 ? void 0 : "type" in value ? tokenSpan(this.input, value) : value;
        throw new QueryFailure(code, message, span, suggestions);
      }
    };
    function tokenize(input) {
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
            if (input[index] === "\\")
              index += 1;
            index += 1;
          }
          if (input[index] !== '"')
            throw new QueryFailure("QUERY_SYNTAX", "unterminated quoted phrase", spanBetween(input, start2, input.length));
          index += 1;
          let phrase;
          try {
            phrase = JSON.parse(input.slice(start2, index));
          } catch {
            throw new QueryFailure("QUERY_SYNTAX", "invalid quoted phrase escape", spanBetween(input, start2, index));
          }
          if (typeof phrase !== "string")
            throw new QueryFailure("QUERY_SYNTAX", "invalid quoted phrase", spanBetween(input, start2, index));
          push("PHRASE", start2, index, phrase.normalize("NFC"));
          continue;
        }
        const start = index;
        while (index < input.length && !/[\s():[\]{}"=<>]/u.test(input[index] ?? ""))
          index += 1;
        const raw = input.slice(start, index).normalize("NFC");
        const upper = raw.toUpperCase();
        const type = upper === "AND" || upper === "OR" || upper === "NOT" || upper === "TO" ? upper : "WORD";
        push(type, start, index, raw);
      }
      tokens.push({ type: "EOF", value: "", start: input.length, end: input.length });
      return tokens;
    }
    function separateSort(node) {
      if (node === null)
        return { expression: null, sorts: [] };
      if (node.kind === "sort-marker")
        return { expression: null, sorts: [node] };
      if (node.kind !== "and")
        return { expression: node, sorts: [] };
      const sorts = node.terms.filter((term) => term.kind === "sort-marker");
      const expressions = node.terms.filter((term) => term.kind !== "sort-marker");
      const seen = /* @__PURE__ */ new Set();
      for (const sort of sorts) {
        if (seen.has(sort.order.field))
          throw new QueryFailure("QUERY_DUPLICATE_SORT", `Duplicate sort field: ${sort.order.field}`, sort.span);
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
          if (normalized.kind === "all" && expression.kind === "and")
            return [];
          return normalized.kind === expression.kind ? normalized.terms : [normalized];
        });
        if (terms.length === 0)
          return { kind: "all", ...expression.span === void 0 ? {} : { span: expression.span } };
        if (terms.length === 1)
          return terms[0];
        return { ...expression, terms };
      }
      if (expression.kind === "not")
        return { ...expression, term: normalizeExpression(expression.term) };
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
      if (typeof value === "string")
        return escapeValue(value);
      if (Array.isArray(value))
        return `(${value.map(serializeScalar).join(" OR ")})`;
      return String(value);
    }
    function escapeValue(value) {
      return /^[^\s():[\]{}"=<>]+$/u.test(value) ? value : JSON.stringify(value);
    }
    function normalizeNow(value) {
      if (value === void 0)
        return "1970-01-01T00:00:00.000Z";
      const date = value instanceof Date ? new Date(value.getTime()) : new Date(value);
      if (!Number.isFinite(date.getTime()))
        throw new QueryFailure("QUERY_CONTEXT_INVALID", "Invalid query clock value");
      return date.toISOString();
    }
    function normalizeDatetime(value, span) {
      if (!/(?:Z|[+-]\d{2}:\d{2})$/u.test(value))
        throw new QueryFailure("QUERY_INVALID_VALUE", "Datetime values require an explicit timezone", span);
      const date = new Date(value);
      if (!Number.isFinite(date.getTime()))
        throw new QueryFailure("QUERY_INVALID_VALUE", `Invalid datetime: ${value}`, span);
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
    function invalid(error, resolvedAt, fieldRegistryVersion) {
      const diagnostic = {
        code: error.code,
        message: error.message,
        severity: "error",
        ...error.span === void 0 ? {} : { span: error.span },
        suggestions: error.suggestions
      };
      const canonicalJson = JSON.stringify({ expression: null, sort: [] });
      return {
        ast: null,
        canonical: "",
        canonicalJson,
        queryHash: (0, search_expression_1.stableQueryHash)(`${fieldRegistryVersion}
${canonicalJson}`),
        sort: [],
        version: exports.QUERY_LANGUAGE_VERSION,
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
      if (left === void 0)
        return right;
      if (right === void 0)
        return left;
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
  }
});

// packages/Epoch.Community.Core/dist/query.js
var require_query = __commonJS({
  "packages/Epoch.Community.Core/dist/query.js"(exports) {
    "use strict";
    var __createBinding = exports && exports.__createBinding || (Object.create ? (function(o, m, k2, k22) {
      if (k22 === void 0) k22 = k2;
      var desc = Object.getOwnPropertyDescriptor(m, k2);
      if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
        desc = { enumerable: true, get: function() {
          return m[k2];
        } };
      }
      Object.defineProperty(o, k22, desc);
    }) : (function(o, m, k2, k22) {
      if (k22 === void 0) k22 = k2;
      o[k22] = m[k2];
    }));
    var __exportStar = exports && exports.__exportStar || function(m, exports2) {
      for (var p in m) if (p !== "default" && !Object.prototype.hasOwnProperty.call(exports2, p)) __createBinding(exports2, m, p);
    };
    Object.defineProperty(exports, "__esModule", { value: true });
    exports.COMMUNITY_QUERY_FIELDS = exports.QUERY_LANGUAGE_VERSION = exports.QUERY_FIELD_REGISTRY_VERSION = exports.parseCommunityQuery = void 0;
    exports.normalizeQuery = normalizeQuery;
    exports.migrateNormalizedQuery = migrateNormalizedQuery;
    exports.matchesNormalizedQuery = matchesNormalizedQuery;
    var entity_1 = require_entity();
    var query_evaluator_1 = require_query_evaluator();
    var fields_1 = require_fields();
    var query_parser_1 = require_query_parser();
    var query_parser_2 = require_query_parser();
    Object.defineProperty(exports, "parseCommunityQuery", { enumerable: true, get: function() {
      return query_parser_2.parseCommunityQuery;
    } });
    Object.defineProperty(exports, "QUERY_FIELD_REGISTRY_VERSION", { enumerable: true, get: function() {
      return query_parser_2.QUERY_FIELD_REGISTRY_VERSION;
    } });
    Object.defineProperty(exports, "QUERY_LANGUAGE_VERSION", { enumerable: true, get: function() {
      return query_parser_2.QUERY_LANGUAGE_VERSION;
    } });
    __exportStar(require_search_expression(), exports);
    exports.COMMUNITY_QUERY_FIELDS = Object.freeze(fields_1.CORE_COMMUNITY_FIELDS.map(({ name }) => name));
    function normalizeQuery(input, options = {}) {
      return (0, query_parser_1.parseCommunityQuery)(input, options);
    }
    function migrateNormalizedQuery(saved) {
      const version = saved.queryLanguageVersion ?? saved.version ?? 0;
      if (version > query_parser_1.QUERY_LANGUAGE_VERSION) {
        return (0, query_parser_1.parseCommunityQuery)("", { version });
      }
      const source = saved.canonical ?? saved.query;
      if (source !== void 0)
        return (0, query_parser_1.parseCommunityQuery)(source, { version });
      if (saved.ast !== void 0) {
        const serialized = saved.ast === null ? "" : isPersistedNode(saved.ast) ? serializePersisted(saved.ast) : serializeSemantic(saved.ast);
        const sort = typeof saved.sort === "string" ? `sort:${saved.sort}` : "";
        return (0, query_parser_1.parseCommunityQuery)([serialized, sort].filter(Boolean).join(" "), { version });
      }
      return invalidMigration("Saved query has no canonical query or normalized AST");
    }
    function matchesNormalizedQuery(message, query) {
      if (query.error !== void 0)
        return false;
      if (query.ast !== null && isPersistedNode(query.ast))
        return matchesNormalizedQuery(message, migrateNormalizedQuery(query));
      if (query.ast === null)
        return true;
      const entity = (0, entity_1.communityMessageToEntity)(message, {
        provenance: { sourceId: "community-message", nativeId: message.ref.objectId, observedAt: message.updatedAt ?? message.publishedAt },
        visibility: message.context.kind === "dm" ? "private" : "public",
        participantIds: []
      });
      return (0, query_evaluator_1.evaluateSearchExpression)(entity, query.ast).matches;
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
      if (node === void 0)
        throw new Error("Malformed saved query AST");
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
    function invalidMigration(message) {
      const parsed = (0, query_parser_1.parseCommunityQuery)("");
      return { ...parsed, diagnostics: [{ code: "QUERY_MIGRATION", message, severity: "error", suggestions: [] }], error: message };
    }
  }
});

// packages/Epoch.Community.Core/dist/runtime-context.js
var require_runtime_context = __commonJS({
  "packages/Epoch.Community.Core/dist/runtime-context.js"(exports) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    exports.createCommunityRuntimeContext = createCommunityRuntimeContext;
    exports.authorizationFingerprint = authorizationFingerprint;
    var errors_1 = require_errors();
    var SAFE_NAMESPACE = /^[A-Za-z0-9][A-Za-z0-9._~-]{0,127}$/u;
    function createCommunityRuntimeContext(input) {
      validateTimezone(input.timezone);
      let locale;
      try {
        [locale] = Intl.getCanonicalLocales(input.locale);
      } catch {
        throw new errors_1.CommunityError("INVALID_FIELD", "Locale must be a valid BCP 47 language tag");
      }
      if (locale === void 0)
        throw new errors_1.CommunityError("INVALID_FIELD", "Locale must be a valid BCP 47 language tag");
      return Object.freeze({
        ...input,
        locale,
        now: () => {
          const value = input.clock.now();
          if (!(value instanceof Date) || !Number.isFinite(value.getTime())) {
            throw new errors_1.CommunityError("INVALID_FIELD", "Clock returned an invalid instant");
          }
          return value.toISOString();
        },
        nextId: (namespace) => {
          if (!SAFE_NAMESPACE.test(namespace))
            throw new errors_1.CommunityError("INVALID_FIELD", "ID namespace must be an opaque URL-safe value");
          const value = input.idGenerator.generate(namespace);
          if (!SAFE_NAMESPACE.test(value))
            throw new errors_1.CommunityError("INVALID_FIELD", "ID generator returned an invalid opaque identifier");
          return value;
        }
      });
    }
    async function authorizationFingerprint(authorization) {
      const subtle = globalThis.crypto?.subtle;
      if (subtle === void 0)
        throw new errors_1.CommunityError("CRYPTO_UNAVAILABLE", "SHA-256 is unavailable in this runtime");
      const canonical = JSON.stringify({
        actorId: boundedClaim(authorization.actorId),
        permissions: canonicalClaimSet(authorization.permissions),
        readableDmIds: canonicalClaimSet(authorization.readableDmIds)
      });
      const digest = await subtle.digest("SHA-256", new TextEncoder().encode(canonical));
      return `sha256:${[...new Uint8Array(digest)].map((value) => value.toString(16).padStart(2, "0")).join("")}`;
    }
    function canonicalClaimSet(values) {
      if (values === void 0)
        return [];
      if (values.length > 4096)
        throw new errors_1.CommunityError("AUTHORIZATION_DENIED", "Authorization claim set exceeds the supported limit");
      return [...new Set(values.map((value) => boundedClaim(value) ?? ""))].sort();
    }
    function boundedClaim(value) {
      if (value === void 0)
        return null;
      if (value.length === 0 || value.length > 512 || [...value].some((character) => {
        const code = character.charCodeAt(0);
        return code <= 31 || code === 127;
      })) {
        throw new errors_1.CommunityError("AUTHORIZATION_DENIED", "Authorization contains an invalid claim");
      }
      return value.normalize("NFC");
    }
    function validateTimezone(timezone) {
      try {
        new Intl.DateTimeFormat("en", { timeZone: timezone }).format(0);
      } catch {
        throw new errors_1.CommunityError("INVALID_FIELD", "Timezone must be a valid IANA timezone");
      }
    }
  }
});

// packages/Epoch.Community.Core/dist/cursor.js
var require_cursor = __commonJS({
  "packages/Epoch.Community.Core/dist/cursor.js"(exports) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    exports.createKeysetCursorCodec = createKeysetCursorCodec;
    var errors_1 = require_errors();
    function createKeysetCursorCodec(options) {
      const maxBytes = options.maxBytes ?? 4096;
      if (options.key.byteLength < 32)
        throw new errors_1.CommunityError("CURSOR_INVALID", "Cursor signing key must contain at least 256 bits");
      const keyBytes = new Uint8Array(options.key);
      return Object.freeze({
        encode: async (payload) => {
          validatePayload(payload);
          const body = new TextEncoder().encode(JSON.stringify(payload));
          if (body.byteLength > maxBytes)
            throw new errors_1.CommunityError("CURSOR_INVALID", "Cursor exceeds the supported size");
          return base64Url(await seal(body, keyBytes));
        },
        decode: async (cursor, binding) => {
          if (typeof cursor !== "string" || cursor.length > maxBytes * 2)
            throw new errors_1.CommunityError("CURSOR_INVALID", "Cursor is malformed or oversized");
          let body;
          try {
            body = await open(fromBase64Url(cursor), keyBytes);
          } catch {
            throw new errors_1.CommunityError("CURSOR_INVALID", "Cursor authentication failed");
          }
          if (body.byteLength > maxBytes)
            throw new errors_1.CommunityError("CURSOR_INVALID", "Cursor payload is oversized");
          let payload;
          try {
            payload = JSON.parse(new TextDecoder("utf-8", { fatal: true }).decode(body));
          } catch {
            throw new errors_1.CommunityError("CURSOR_INVALID", "Cursor payload is invalid");
          }
          validatePayload(payload);
          const valid = payload;
          if (valid.snapshotId !== binding.snapshotId || valid.planHash !== binding.planHash || valid.authorizationFingerprint !== binding.authorizationFingerprint) {
            throw new errors_1.CommunityError("CURSOR_STALE", "Cursor does not belong to this query snapshot or authorization context");
          }
          return valid;
        }
      });
    }
    var CURSOR_AAD = new TextEncoder().encode("epoch-community-cursor-v1");
    async function seal(body, keyBytes) {
      const subtle = globalThis.crypto?.subtle;
      if (subtle === void 0 || globalThis.crypto?.getRandomValues === void 0)
        throw new errors_1.CommunityError("CRYPTO_UNAVAILABLE", "Cursor encryption is unavailable in this runtime");
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
      if (subtle === void 0)
        throw new errors_1.CommunityError("CRYPTO_UNAVAILABLE", "Cursor decryption is unavailable in this runtime");
      if (envelope[0] !== 1 || envelope.byteLength < 30)
        throw new Error("invalid cursor envelope");
      const key = await subtle.importKey("raw", arrayBuffer(keyBytes), "AES-GCM", false, ["decrypt"]);
      const plaintext = await subtle.decrypt({ name: "AES-GCM", iv: arrayBuffer(envelope.slice(1, 13)), additionalData: arrayBuffer(CURSOR_AAD) }, key, arrayBuffer(envelope.slice(13)));
      return new Uint8Array(plaintext);
    }
    function validatePayload(value) {
      if (typeof value !== "object" || value === null)
        throw new errors_1.CommunityError("CURSOR_INVALID", "Cursor payload must be an object");
      const payload = value;
      if (payload.version !== 1 || !bounded(payload.snapshotId) || !bounded(payload.planHash) || !bounded(payload.authorizationFingerprint) || !bounded(payload.objectId) || !Array.isArray(payload.sortKey) || payload.sortKey.length > 32 || payload.sortKey.some(invalidScalar)) {
        throw new errors_1.CommunityError("CURSOR_INVALID", "Cursor payload fields are invalid");
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
      for (const byte of value)
        binary += String.fromCharCode(byte);
      return btoa(binary).replaceAll("+", "-").replaceAll("/", "_").replace(/=+$/u, "");
    }
    function fromBase64Url(value) {
      if (!/^[A-Za-z0-9_-]+$/u.test(value))
        throw new Error("invalid base64url");
      const standard = value.replaceAll("-", "+").replaceAll("_", "/");
      const binary = atob(standard.padEnd(Math.ceil(standard.length / 4) * 4, "="));
      return Uint8Array.from(binary, (character) => character.charCodeAt(0));
    }
    function arrayBuffer(value) {
      return Uint8Array.from(value).buffer;
    }
  }
});

// packages/Epoch.Community.Core/dist/search-backend.js
var require_search_backend = __commonJS({
  "packages/Epoch.Community.Core/dist/search-backend.js"(exports) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    exports.ReferenceSearchBackend = void 0;
    var cursor_1 = require_cursor();
    var query_evaluator_1 = require_query_evaluator();
    var ReferenceSearchBackend2 = class {
      backendId = "epoch-reference";
      backendVersion = "1";
      #entities = /* @__PURE__ */ new Map();
      #snapshots = /* @__PURE__ */ new Map();
      #registry;
      #cursor;
      #closed = false;
      constructor(options) {
        this.#registry = options.registry;
        this.#cursor = (0, cursor_1.createKeysetCursorCodec)({ key: options.cursorKey });
      }
      async apply(changes) {
        this.#ensureOpen();
        const next = new Map(this.#entities);
        for (const ref of changes.deletes)
          next.delete(ref.objectId);
        for (const entity of changes.upserts)
          next.set(entity.ref.objectId, entity);
        this.#entities.clear();
        for (const [id, entity] of next)
          this.#entities.set(id, entity);
      }
      async rebuild(input) {
        this.#ensureOpen();
        const next = /* @__PURE__ */ new Map();
        for await (const entity of input)
          next.set(entity.ref.objectId, entity);
        this.#entities.clear();
        for (const [id, entity] of next)
          this.#entities.set(id, entity);
        this.#snapshots.clear();
      }
      async search(plan, page, signal) {
        this.#ensureOpen();
        abort(signal);
        const candidates = this.#candidates(plan, signal);
        let start = 0;
        if (page.after !== void 0) {
          const cursor = await this.#cursor.decode(page.after, binding(plan));
          start = candidates.findIndex((candidate) => candidate.entity.ref.objectId === cursor.objectId && equalKeys(candidate.hit.sortKey, cursor.sortKey)) + 1;
          if (start === 0)
            start = candidates.length;
        }
        abort(signal);
        const selected = candidates.slice(start, start + page.first);
        const cursors = await Promise.all(selected.map((candidate) => this.#cursor.encode({
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
        this.#ensureOpen();
        const visible = this.#candidates(plan);
        return Object.freeze(fields.map((field) => {
          const definition = this.#registry.resolve(field);
          if (definition?.facetable !== true || !plan.canObserveField(field))
            return { field, values: [] };
          const counts = /* @__PURE__ */ new Map();
          for (const { entity } of visible)
            for (const value of (0, query_evaluator_1.searchFieldValues)(entity, definition.name)) {
              const key = JSON.stringify(value);
              const current = counts.get(key) ?? { value, count: 0 };
              counts.set(key, { value, count: current.count + 1 });
            }
          return Object.freeze({ field: definition.name, values: Object.freeze([...counts.values()].sort((a, b) => b.count - a.count || scalarCompare(a.value, b.value))) });
        }));
      }
      async suggest(input) {
        this.#ensureOpen();
        const definition = this.#registry.resolve(input.field);
        if (definition === void 0 || !input.plan.canObserveField(input.field) || !definition.searchable && !definition.facetable)
          return [];
        const prefix = normalize(input.prefix);
        const counts = /* @__PURE__ */ new Map();
        for (const { entity } of this.#candidates(input.plan))
          for (const value of (0, query_evaluator_1.searchFieldValues)(entity, definition.name)) {
            if (typeof value !== "string" || !normalize(value).startsWith(prefix))
              continue;
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
        this.#closed = true;
        this.#entities.clear();
        this.#snapshots.clear();
      }
      #candidates(plan, signal) {
        const cacheKey = `${plan.snapshot.snapshotId}:${plan.planHash}:${plan.authorizationFingerprint}`;
        const cached = this.#snapshots.get(cacheKey);
        if (cached !== void 0)
          return cached;
        const candidates = [];
        let inspected = 0;
        for (const entity of this.#entities.values()) {
          inspected += 1;
          if (inspected % 256 === 0)
            abort(signal);
          if (!plan.canRead(entity))
            continue;
          const evaluation = (0, query_evaluator_1.evaluateSearchExpression)(entity, plan.expression, {
            resolveEntity: (objectId) => {
              const resolved = this.#entities.get(objectId);
              return resolved !== void 0 && plan.canRead(resolved) ? resolved : void 0;
            },
            relationsFor: (objectId) => [...this.#entities.values()].filter(plan.canRead).flatMap((candidate) => candidate.relations).filter((relation) => relation.source.objectId === objectId || relation.target.objectId === objectId)
          });
          if (!evaluation.matches)
            continue;
          const sortKey = plan.order.map((order) => (0, query_evaluator_1.searchFieldValues)(entity, order.field)[0] ?? null);
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
        candidates.sort((left, right) => compareCandidates(left, right, plan));
        const frozen = Object.freeze(candidates);
        this.#snapshots.set(cacheKey, frozen);
        if (this.#snapshots.size > 32)
          this.#snapshots.delete(this.#snapshots.keys().next().value);
        return frozen;
      }
      #ensureOpen() {
        if (this.#closed)
          throw new Error("Search backend is closed");
      }
    };
    exports.ReferenceSearchBackend = ReferenceSearchBackend2;
    function compareCandidates(left, right, plan) {
      for (let index = 0; index < plan.order.length; index += 1) {
        const order = plan.order[index];
        const a = left.hit.sortKey[index] ?? null;
        const b = right.hit.sortKey[index] ?? null;
        if (a === b)
          continue;
        if (a === null)
          return order?.nulls === "first" ? -1 : 1;
        if (b === null)
          return order?.nulls === "first" ? 1 : -1;
        const result = scalarCompare(a, b);
        if (result !== 0)
          return order?.direction === "descending" ? -result : result;
      }
      return left.entity.ref.objectId.localeCompare(right.entity.ref.objectId, "en");
    }
    function scalarCompare(left, right) {
      if (left === right)
        return 0;
      if (left === null)
        return -1;
      if (right === null)
        return 1;
      if (typeof left === "number" && typeof right === "number")
        return left - right;
      if (typeof left === "boolean" && typeof right === "boolean")
        return Number(left) - Number(right);
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
      if (signal?.aborted === true)
        throw new DOMException("Search was cancelled", "AbortError");
    }
    function normalize(value) {
      return value.normalize("NFKC").toLocaleLowerCase("en-US");
    }
  }
});

// packages/Epoch.Community.Core/dist/search-plan.js
var require_search_plan = __commonJS({
  "packages/Epoch.Community.Core/dist/search-plan.js"(exports) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    exports.createSearchPlan = createSearchPlan;
    var errors_1 = require_errors();
    var search_expression_1 = require_search_expression();
    function createSearchPlan(input) {
      const maxSources = input.limits?.maxSources ?? 32;
      const maxLimit = input.limits?.maxLimit ?? 1e3;
      if (input.sources.length > maxSources)
        throw new errors_1.CommunityError("QUERY_COST_LIMIT", `Query exceeds the ${maxSources} source fanout limit`);
      if (!Number.isSafeInteger(input.limit) || input.limit < 1 || input.limit > maxLimit)
        throw new errors_1.CommunityError("QUERY_COST_LIMIT", `Query result limit must be between 1 and ${maxLimit}`);
      validateExpression(input.expression, input.registry, input.authorization);
      const order = totalOrder(input.order, input.registry, input.authorization);
      const sourcePlans = input.sources.map((source) => partitionSource(input.expression, source));
      const cost = sourcePlans.reduce((total, source) => total + source.estimatedCost, 0);
      const maxCost = input.limits?.maxCost ?? 1e4;
      if (cost > maxCost)
        throw new errors_1.CommunityError("QUERY_COST_LIMIT", `Query estimated cost ${cost} exceeds limit ${maxCost}`, { estimatedCost: cost, maxCost });
      const planHash = (0, search_expression_1.stableQueryHash)(JSON.stringify({
        version: 1,
        expression: JSON.parse((0, search_expression_1.canonicalExpressionJson)(input.expression)),
        order,
        sources: sourcePlans.map(({ sourceId, pushdown, residual, checkpoint }) => ({
          sourceId,
          pushdown: JSON.parse((0, search_expression_1.canonicalExpressionJson)(pushdown)),
          residual: JSON.parse((0, search_expression_1.canonicalExpressionJson)(residual)),
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
          if (expression.maxDepth < 1 || expression.maxDepth > 8)
            throw new errors_1.CommunityError("QUERY_COST_LIMIT", "Relation depth must be between 1 and 8");
          return;
        case "text":
          for (const name of expression.fields)
            requireField(name, expression.mode, registry, authorization);
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
      const field = registry.resolve(name);
      const visible = registry.list(authorization).some((candidate) => candidate.name === field?.name);
      if (field === void 0 || !visible)
        throw new errors_1.CommunityError("QUERY_UNKNOWN_FIELD", `Unknown or unavailable query field: ${name}`, { suggestions: registry.suggest(name, authorization) });
      if (!field.operators.includes(operator))
        throw new errors_1.CommunityError("QUERY_INVALID_OPERATOR", `${operator} is not supported for ${field.name}`);
    }
    function totalOrder(input, registry, authorization) {
      const result = [...input];
      if (result.length === 0)
        result.push({ field: "updatedAt", direction: "descending", nulls: "last" });
      for (const order of result) {
        const field = registry.resolve(order.field);
        if (field === void 0 || !registry.list(authorization).includes(field) || !field.sortable)
          throw new errors_1.CommunityError("QUERY_INVALID_OPERATOR", `Field is not sortable: ${order.field}`);
      }
      for (const field of ["kind", "objectId"]) {
        if (!result.some((order) => order.field === field))
          result.push({ field, direction: "ascending", nulls: "last" });
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
          if (left.kind !== "all")
            pushed.push(left);
          if (right.kind !== "all")
            residual.push(right);
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
          return source.fullText !== "none" && expression.fields.every((field) => source.fields[field]?.operators.includes(expression.mode));
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
      if (entity.ref.kind === "dm")
        return authorization.actorId !== void 0 && (entity.participantIds.includes(authorization.actorId) || authorization.readableDmIds?.includes(entity.ref.objectId) === true);
      if (entity.visibility === "public")
        return true;
      if (authorization.actorId === void 0)
        return false;
      return entity.ownerId === authorization.actorId || entity.visibility === "shared" && entity.participantIds.includes(authorization.actorId);
    }
  }
});

// packages/Epoch.Community.Core/dist/snapshot.js
var require_snapshot = __commonJS({
  "packages/Epoch.Community.Core/dist/snapshot.js"(exports) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    exports.createSearchSnapshot = createSearchSnapshot;
    var runtime_context_1 = require_runtime_context();
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
        authorizationFingerprint: await (0, runtime_context_1.authorizationFingerprint)(input.authorization),
        sourceCheckpoints: Object.freeze([...input.sourceCheckpoints].sort((a, b) => a.sourceId.localeCompare(b.sourceId, "en")))
      });
    }
  }
});

// packages/Epoch.Community.Core/dist/source.js
var require_source = __commonJS({
  "packages/Epoch.Community.Core/dist/source.js"(exports) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    exports.applyCommunityChangeSetAtomically = applyCommunityChangeSetAtomically;
    exports.validateSourceCapabilities = validateSourceCapabilities;
    exports.sourceKeysetCursor = sourceKeysetCursor;
    exports.decodeSourceKeysetCursor = decodeSourceKeysetCursor;
    exports.abortSource = abortSource;
    exports.boundedSourcePageSize = boundedSourcePageSize;
    var errors_1 = require_errors();
    async function applyCommunityChangeSetAtomically(changes, targets) {
      const staged = [];
      try {
        for (const target of targets)
          staged.push({ target, prepared: await target.stage(changes) });
        for (const entry of staged)
          await entry.prepared.commit();
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
        throw new errors_1.CommunityError("INDEX_STALE", "Atomic community change ingestion failed; affected targets were marked stale", {
          sourceId: changes.sourceId,
          checkpoint: changes.checkpoint.token
        }, { cause: error });
      }
    }
    function validateSourceCapabilities(value) {
      if (value.sourceId.length === 0 || value.sourceId.length > 128 || !/^[a-z0-9][a-z0-9._-]*$/u.test(value.sourceId)) {
        throw new errors_1.CommunityError("QUERY_UNSUPPORTED_SOURCE", "Source ID must be a bounded lowercase token");
      }
      if (!Number.isSafeInteger(value.maxPageSize) || value.maxPageSize < 1 || value.maxPageSize > 1e4) {
        throw new errors_1.CommunityError("QUERY_UNSUPPORTED_SOURCE", "Source maxPageSize is invalid");
      }
      return Object.freeze({ ...value, fields: Object.freeze({ ...value.fields }) });
    }
    var sourceCursors = /* @__PURE__ */ new Map();
    function sourceKeysetCursor(sourceId, objectId) {
      const bytes = globalThis.crypto?.getRandomValues(new Uint8Array(24));
      if (bytes === void 0)
        throw new errors_1.CommunityError("CRYPTO_UNAVAILABLE", "Source cursor generation is unavailable");
      const token = base64Url(bytes);
      sourceCursors.set(token, { sourceId, objectId });
      if (sourceCursors.size > 4096)
        sourceCursors.delete(sourceCursors.keys().next().value);
      return token;
    }
    function decodeSourceKeysetCursor(cursor, sourceId) {
      if (!/^[A-Za-z0-9_-]{32}$/u.test(cursor))
        throw new errors_1.CommunityError("CURSOR_INVALID", "Source cursor is invalid");
      const payload = sourceCursors.get(cursor);
      if (payload === void 0 || payload.sourceId !== sourceId)
        throw new errors_1.CommunityError("CURSOR_STALE", "Source cursor does not belong to this source snapshot");
      return payload.objectId;
    }
    function abortSource(signal) {
      if (signal.aborted)
        throw new DOMException("Source operation was cancelled", "AbortError");
    }
    function boundedSourcePageSize(requested, capabilities) {
      if (!Number.isSafeInteger(requested) || requested < 1)
        throw new errors_1.CommunityError("QUERY_COST_LIMIT", "Source page size must be a positive integer");
      return Math.min(requested, capabilities.maxPageSize);
    }
    function base64Url(value) {
      let binary = "";
      for (const byte of value)
        binary += String.fromCharCode(byte);
      return btoa(binary).replaceAll("+", "-").replaceAll("/", "_").replace(/=+$/u, "");
    }
  }
});

// packages/Epoch.Community.Core/dist/search-service.js
var require_search_service = __commonJS({
  "packages/Epoch.Community.Core/dist/search-service.js"(exports) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    exports.SearchService = void 0;
    exports.createSearchServiceFromSources = createSearchServiceFromSources;
    var authorization_1 = require_authorization();
    var runtime_context_1 = require_runtime_context();
    var errors_1 = require_errors();
    var search_expression_1 = require_search_expression();
    var search_plan_1 = require_search_plan();
    var snapshot_1 = require_snapshot();
    var source_1 = require_source();
    var SearchService = class {
      #backend;
      #registry;
      #context;
      #sources;
      constructor(input) {
        this.#backend = input.backend;
        this.#registry = input.registry;
        this.#context = input.context;
        this.#sources = input.sources;
      }
      async plan(input) {
        const queryHash = (0, search_expression_1.stableQueryHash)((0, search_expression_1.canonicalExpressionJson)(input.expression));
        if (input.snapshot !== void 0) {
          const fingerprint = await (0, runtime_context_1.authorizationFingerprint)(input.authorization);
          if (input.snapshot.authorizationFingerprint !== fingerprint || input.snapshot.queryHash !== queryHash || input.snapshot.fieldRegistryVersion !== this.#registry.version || !sameCheckpoints(input.snapshot.sourceCheckpoints, this.#sources.map((source) => source.checkpoint))) {
            throw new errors_1.CommunityError("CURSOR_STALE", "Search snapshot does not match the query, sources, field registry, or authorization context");
          }
        }
        const seed = input.snapshot ?? await (0, snapshot_1.createSearchSnapshot)({
          context: this.#context,
          queryHash,
          planHash: "pending",
          fieldRegistryVersion: this.#registry.version,
          analyzerVersion: "epoch-tokenizer-v1",
          authorization: input.authorization,
          sourceCheckpoints: this.#sources.map((source) => source.checkpoint)
        });
        return (0, search_plan_1.createSearchPlan)({
          expression: input.expression,
          order: input.order,
          sources: this.#sources,
          registry: this.#registry,
          authorization: input.authorization,
          authorizationFingerprint: seed.authorizationFingerprint,
          snapshot: seed,
          limit: input.limit
        });
      }
      async search(input) {
        if (input.signal?.aborted === true)
          throw new DOMException("Search was cancelled", "AbortError");
        const plan = await this.plan({
          expression: input.expression,
          order: input.order,
          authorization: input.authorization,
          limit: input.first,
          ...input.snapshot === void 0 ? {} : { snapshot: input.snapshot }
        });
        const page = { first: input.first, ...input.after === void 0 ? {} : { after: input.after } };
        return this.#backend.search(plan, page, input.signal);
      }
    };
    exports.SearchService = SearchService;
    function sameCheckpoints(left, right) {
      const ordered = (values) => [...values].sort((a2, b2) => a2.sourceId.localeCompare(b2.sourceId, "en"));
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
        throw new errors_1.CommunityError("QUERY_COST_LIMIT", "Registered source hydration exceeds configured bounds");
      }
      const configured = input.sources.map((source) => {
        const capabilities = (0, source_1.validateSourceCapabilities)(source.capabilities());
        if (capabilities.sourceId !== source.sourceId) {
          throw new errors_1.CommunityError("QUERY_UNSUPPORTED_SOURCE", "Source capability identity does not match its registered identity");
        }
        return { source, capabilities };
      });
      if (new Set(configured.map(({ source }) => source.sourceId)).size !== configured.length) {
        throw new errors_1.CommunityError("QUERY_UNSUPPORTED_SOURCE", "Registered source IDs must be unique");
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
      for (const scan of scans)
        for (const entity of scan.entities) {
          if (!(0, authorization_1.canReadCommunityResource)({
            kind: entity.ref.kind,
            resourceId: entity.ref.objectId,
            visibility: entity.visibility,
            ownerId: entity.ownerId,
            participantIds: entity.participantIds
          }, input.authorization))
            continue;
          if (entities.has(entity.ref.objectId)) {
            throw new errors_1.CommunityError("INVALID_ENTITY", "Multiple registered sources produced the same canonical Entity without an authoritative reconciliation", {
              objectId: entity.ref.objectId
            });
          }
          entities.set(entity.ref.objectId, entity);
          if (entities.size > maxEntities)
            throw new errors_1.CommunityError("QUERY_COST_LIMIT", `Registered sources exceed the ${maxEntities} Entity hydration limit`);
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
        if (input.signal !== void 0)
          (0, source_1.abortSource)(input.signal);
        let checkpoint = await input.source.checkpoint();
        if (checkpoint.sourceId !== input.source.sourceId)
          throw new Error("checkpoint source mismatch");
        let observedAt = validObservedAt(checkpoint.observedAt);
        const entities = [];
        const cursors = /* @__PURE__ */ new Set();
        let after;
        for (let pageNumber = 0; pageNumber < input.maxPages; pageNumber += 1) {
          if (input.signal !== void 0)
            (0, source_1.abortSource)(input.signal);
          const page = await input.source.scan({
            ...after === void 0 ? {} : { after },
            limit: (0, source_1.boundedSourcePageSize)(input.pageSize, input.capabilities),
            authorization: input.authorization
          });
          if (page.checkpoint.sourceId !== input.source.sourceId)
            throw new Error("page checkpoint source mismatch");
          const pageObservedAt = validObservedAt(page.checkpoint.observedAt);
          if (page.checkpoint.status === "current" && pageObservedAt < observedAt)
            throw new Error("source checkpoint regressed");
          entities.push(...page.entities);
          checkpoint = page.checkpoint;
          observedAt = pageObservedAt;
          if (page.next === void 0)
            return { entities: Object.freeze(entities), capabilities: input.capabilities, checkpoint };
          if (input.capabilities.pagination === "none" || cursors.has(page.next))
            throw new Error("source pagination did not advance");
          cursors.add(page.next);
          after = page.next;
        }
        return { entities: [], capabilities: input.capabilities, checkpoint: unavailable() };
      } catch (error) {
        if (error instanceof DOMException && error.name === "AbortError")
          throw error;
        return { entities: [], capabilities: input.capabilities, checkpoint: unavailable() };
      }
    }
    function validObservedAt(value) {
      const timestamp = Date.parse(value);
      if (!Number.isFinite(timestamp) || new Date(timestamp).toISOString() !== value)
        throw new Error("source checkpoint time is invalid");
      return timestamp;
    }
    function planningSource(capabilities, checkpoint) {
      return Object.freeze({
        sourceId: capabilities.sourceId,
        fields: Object.freeze(Object.fromEntries(Object.entries(capabilities.fields).map(([name, field]) => [name, {
          operators: field.operators,
          sortable: field.sortable,
          facetable: field.facetable
        }]))),
        fullText: capabilities.fullText,
        supportsRelations: capabilities.supportsRelations,
        checkpoint
      });
    }
  }
});

// packages/Epoch.Community.Core/dist/projection-definition.js
var require_projection_definition = __commonJS({
  "packages/Epoch.Community.Core/dist/projection-definition.js"(exports) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    exports.PROJECTION_DEFINITION_API_VERSION = void 0;
    exports.PROJECTION_DEFINITION_API_VERSION = "epoch.dev/v1alpha1";
  }
});

// packages/Epoch.Community.Core/dist/builtin-projections.js
var require_builtin_projections = __commonJS({
  "packages/Epoch.Community.Core/dist/builtin-projections.js"(exports) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    exports.builtinDefaultProjection = void 0;
    var projection_definition_1 = require_projection_definition();
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
      apiVersion: projection_definition_1.PROJECTION_DEFINITION_API_VERSION,
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
    exports.builtinDefaultProjection = Object.freeze(defaultProjection);
  }
});

// packages/Epoch.Community.Core/dist/projection-compiler.js
var require_projection_compiler = __commonJS({
  "packages/Epoch.Community.Core/dist/projection-compiler.js"(exports) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    exports.ProjectionCompileError = void 0;
    exports.compileProjectionDefinition = compileProjectionDefinition;
    exports.renderSegmentTemplate = renderSegmentTemplate;
    exports.normalizeProjectionSegment = normalizeProjectionSegment;
    exports.createProjectionOccurrenceId = createProjectionOccurrenceId;
    exports.assignProjectionCollisionNames = assignProjectionCollisionNames;
    exports.formatProjectionDefinition = formatProjectionDefinition;
    var identity_1 = require_identity();
    var projection_definition_1 = require_projection_definition();
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
      diagnostics;
      code = "PROJECTION_INVALID";
      constructor(diagnostics) {
        super(`PROJECTION_INVALID: ${diagnostics.map((item) => `${item.pointer}: ${item.message}`).join("; ")}`);
        this.diagnostics = diagnostics;
      }
    };
    exports.ProjectionCompileError = ProjectionCompileError;
    function compileProjectionDefinition(definition, context) {
      const diagnostics = [];
      const fields = new Set(context.fields);
      const sortable = new Set(context.sortableFields);
      const nodeIds = /* @__PURE__ */ new Set();
      const active = /* @__PURE__ */ new Set();
      let nodeCount = 0;
      let maximumDepth = 0;
      let estimatedFanout = 1;
      if (definition.apiVersion !== projection_definition_1.PROJECTION_DEFINITION_API_VERSION)
        problem(diagnostics, "PROJECTION_INVALID", "/apiVersion", "Unsupported projection API version");
      try {
        validateDefinitionId(definition.projectionId);
      } catch (error) {
        problem(diagnostics, "PROJECTION_INVALID", "/projectionId", message(error));
      }
      if (!Number.isInteger(definition.version) || definition.version < 1)
        problem(diagnostics, "PROJECTION_INVALID", "/version", "Version must be a positive integer");
      if (typeof definition.label !== "string" || definition.label.trim().length === 0 || definition.label.length > 160)
        problem(diagnostics, "PROJECTION_INVALID", "/label", "Label must be non-empty and at most 160 characters");
      if (!["private", "shared", "public"].includes(definition.visibility))
        problem(diagnostics, "PROJECTION_INVALID", "/visibility", "Unsupported projection visibility");
      if (!["live", "queued", "snapshot"].includes(definition.updateMode))
        problem(diagnostics, "PROJECTION_INVALID", "/updateMode", "Unsupported update mode");
      if (!["current", "session-snapshot", "fixed-snapshot"].includes(definition.consistency))
        problem(diagnostics, "PROJECTION_INVALID", "/consistency", "Unsupported consistency mode");
      validateLimits(context, diagnostics);
      validateDefinitionLimits(definition, context, diagnostics);
      for (const field of ["kind", "objectId"])
        if (!fields.has(field) || !sortable.has(field)) {
          problem(diagnostics, "PROJECTION_UNSTABLE_ORDER", "/order", `Canonical tie-breaker ${field} must be visible and sortable`);
        }
      validateOrders(definition.order, "/order", fields, sortable, diagnostics);
      const visit = (node, pointer, depth, isRoot = false) => {
        nodeCount += 1;
        maximumDepth = Math.max(maximumDepth, depth);
        if (nodeCount > context.limits.maxNodes)
          problem(diagnostics, "PROJECTION_LIMIT", pointer, `Projection exceeds ${context.limits.maxNodes} nodes`);
        if (depth > context.limits.maxDepth)
          problem(diagnostics, "PROJECTION_LIMIT", pointer, `Projection exceeds depth ${context.limits.maxDepth}`);
        if (active.has(node)) {
          problem(diagnostics, "PROJECTION_CYCLE", pointer, "Projection node graph contains a cycle");
          return;
        }
        active.add(node);
        if (!NODE_ID.test(node.nodeId))
          problem(diagnostics, "PROJECTION_INVALID", `${pointer}/nodeId`, "nodeId must be an opaque URL-safe identifier");
        if (nodeIds.has(node.nodeId))
          problem(diagnostics, "PROJECTION_COLLISION", `${pointer}/nodeId`, `Duplicate nodeId ${node.nodeId}`);
        nodeIds.add(node.nodeId);
        switch (node.kind) {
          case "literal":
            validateLiteralSegment(node.segment, `${pointer}/segment`, diagnostics, isRoot);
            validateChildren(node.children, pointer, depth);
            break;
          case "select":
            if (node.objectKinds.length === 0)
              problem(diagnostics, "PROJECTION_INVALID", `${pointer}/objectKinds`, "select must include at least one object kind");
            for (const [index, kind] of node.objectKinds.entries())
              if (!OBJECT_KINDS.has(kind))
                problem(diagnostics, "PROJECTION_INVALID", `${pointer}/objectKinds/${index}`, `Unknown object kind ${kind}`);
            if (node.limit !== void 0 && (!Number.isInteger(node.limit) || node.limit < 1 || node.limit > context.limits.maxFanout))
              problem(diagnostics, "PROJECTION_LIMIT", `${pointer}/limit`, `select limit must be between 1 and ${context.limits.maxFanout}`);
            estimatedFanout = Math.min(Number.MAX_SAFE_INTEGER, estimatedFanout * (node.limit ?? context.limits.maxFanout));
            if (node.where !== void 0)
              validateSearchExpression(node.where, `${pointer}/where`, fields, context, diagnostics);
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
            if (!RELATIONS.has(node.relation))
              problem(diagnostics, "PROJECTION_INVALID", `${pointer}/relation`, `Unknown relation ${node.relation}`);
            const maximum = Math.min(context.limits.maxRelationDepth ?? context.limits.maxDepth, context.limits.maxDepth);
            if (!Number.isInteger(node.maxDepth) || node.maxDepth < 1 || node.maxDepth > maximum)
              problem(diagnostics, "PROJECTION_LIMIT", `${pointer}/maxDepth`, `Relation depth must be between 1 and ${maximum}`);
            visit(node.child, `${pointer}/child`, depth + 1);
            break;
          }
          case "union":
            if (node.children.length === 0)
              problem(diagnostics, "PROJECTION_INVALID", `${pointer}/children`, "union must include at least one child");
            validateChildren(node.children, pointer, depth);
            break;
          case "alias":
            try {
              (0, identity_1.validateObjectRef)(node.target);
            } catch (error) {
              problem(diagnostics, "PROJECTION_INVALID", `${pointer}/target`, message(error));
            }
            validateTemplate(node.segment, `${pointer}/segment`, fields, context, diagnostics);
            validateChildren(node.children, pointer, depth);
            break;
          case "leaf":
            validateTemplate(node.segment, `${pointer}/segment`, fields, context, diagnostics);
            if (!["default", "body.md", "metadata.json"].includes(node.representation))
              problem(diagnostics, "PROJECTION_INVALID", `${pointer}/representation`, "Unsupported leaf representation");
            break;
          default:
            problem(diagnostics, "PROJECTION_INVALID", pointer, `Unknown projection node kind ${node.kind}`);
        }
        active.delete(node);
        function validateChildren(children, parentPointer, parentDepth) {
          if (children.length > context.limits.maxFanout)
            problem(diagnostics, "PROJECTION_LIMIT", `${parentPointer}/children`, `Node exceeds fanout ${context.limits.maxFanout}`);
          children.forEach((child, index) => visit(child, `${parentPointer}/children/${index}`, parentDepth + 1));
        }
      };
      visit(definition.root, "/root", 1, true);
      const effectiveOrder = totalOrder(definition.order);
      if (diagnostics.some((item) => item.severity === "error"))
        throw new ProjectionCompileError(diagnostics);
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
    function renderSegmentTemplate(template, values, limits = {}) {
      const maxTemplateLength = limits.maxTemplateLength ?? 256;
      const maxSegmentLength = limits.maxSegmentLength ?? 120;
      if (typeof template.template !== "string" || template.template.length === 0 || template.template.length > maxTemplateLength)
        throw new Error("Projection segment template is empty or too long");
      const fields = /* @__PURE__ */ new Set();
      let output = "";
      let cursor = 0;
      while (cursor < template.template.length) {
        const open = template.template.indexOf("{", cursor);
        if (open < 0) {
          output += template.template.slice(cursor);
          break;
        }
        output += template.template.slice(cursor, open);
        const close = matchingBrace(template.template, open);
        if (close < 0)
          throw new Error("Projection segment template has an unmatched brace");
        const parser = new TemplateExpressionParser(template.template.slice(open + 1, close), values, fields);
        output += scalar(parser.parse());
        cursor = close + 1;
      }
      const segment = normalizeProjectionSegment(output, maxSegmentLength);
      return Object.freeze({ original: template.template, segment, fields: Object.freeze([...fields].sort()) });
    }
    function normalizeProjectionSegment(value, maximumLength = 120) {
      if (typeof value !== "string" || value.length === 0)
        throw new Error("Projection segment must not be empty");
      if (value !== value.normalize("NFKC"))
        throw new Error("Projection segment uses ambiguous Unicode normalization");
      if (value === "." || value === ".." || value.toLowerCase() === RECOVERY_SEGMENT)
        throw new Error("Projection segment is reserved or unsafe");
      if (value.length > maximumLength)
        throw new Error(`Projection segment exceeds ${maximumLength} characters`);
      if (value.includes("/") || value.includes("\\") || [...value].some((character) => {
        const code = character.codePointAt(0) ?? 0;
        return code < 32 || code === 127;
      }))
        throw new Error("Projection segment contains an unsafe path character");
      return value;
    }
    function createProjectionOccurrenceId(identity) {
      validateDefinitionId(identity.projectionId);
      (0, identity_1.validateObjectRef)(identity.target);
      if (!Number.isInteger(identity.projectionVersion) || identity.projectionVersion < 1)
        throw new Error("Projection occurrence version must be positive");
      if (!NODE_ID.test(identity.nodeId) || !identity.branchId || !identity.parentEntryId)
        throw new Error("Projection occurrence requires stable node, branch, and parent identity");
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
        if (occurrences.has(occurrence))
          throw new Error(`PROJECTION_COLLISION: duplicate occurrence ${candidate.target.objectId}/${candidate.nodeId}`);
        occurrences.add(occurrence);
        const values = groups.get(candidate.normalizedSegment) ?? [];
        values.push(candidate);
        groups.set(candidate.normalizedSegment, values);
      }
      const resolved = /* @__PURE__ */ new Map();
      for (const [name, values] of groups) {
        const sorted = [...values].sort((left, right) => compareText(occurrenceKey(left), occurrenceKey(right)));
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
        const sentinels = Object.fromEntries([...fields].map((field) => [field, "2026-01-01T00:00:00Z"]));
        const rendered = renderSegmentTemplate(template, sentinels, context.limits);
        for (const field of rendered.fields)
          validateField(field, pointer, fields, diagnostics);
      } catch (error) {
        problem(diagnostics, "PROJECTION_INVALID", pointer, message(error));
      }
    }
    function validateLiteralSegment(value, pointer, diagnostics, allowEmpty = false) {
      if (allowEmpty && value === "")
        return;
      try {
        normalizeProjectionSegment(value);
      } catch (error) {
        problem(diagnostics, "PROJECTION_INVALID", pointer, message(error));
      }
    }
    function validateField(value, pointer, fields, diagnostics) {
      if (!FIELD.test(value) || !fields.has(value))
        problem(diagnostics, "PROJECTION_UNKNOWN_FIELD", pointer, `Unknown or inaccessible field ${value}`);
    }
    function validateOrders(orders, pointer, fields, sortable, diagnostics) {
      if (orders.length === 0)
        problem(diagnostics, "PROJECTION_UNSTABLE_ORDER", pointer, "Projection order must be explicit");
      orders.forEach((order, index) => {
        validateField(order.field, `${pointer}/${index}/field`, fields, diagnostics);
        if (!sortable.has(order.field))
          problem(diagnostics, "PROJECTION_UNSTABLE_ORDER", `${pointer}/${index}/field`, `Field ${order.field} is not sortable`);
        if (!["ascending", "descending"].includes(order.direction) || !["first", "last"].includes(order.nulls))
          problem(diagnostics, "PROJECTION_INVALID", `${pointer}/${index}`, "Invalid sort direction or null order");
      });
    }
    function validateLimits(context, diagnostics) {
      for (const [name, value] of Object.entries(context.limits)) {
        if (value !== void 0 && (!Number.isInteger(value) || value < 1 || value > 1e6))
          problem(diagnostics, "PROJECTION_LIMIT", `/limits/${name}`, `${name} must be a bounded positive integer`);
      }
    }
    function validateDefinitionLimits(definition, context, diagnostics) {
      if (definition.limits === void 0)
        return;
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
          if (expression.terms.length === 0)
            problem(diagnostics, "PROJECTION_INVALID", `${pointer}/terms`, `${expression.kind} expression requires terms`);
          expression.terms.forEach((term, index) => validateSearchExpression(term, `${pointer}/terms/${index}`, fields, context, diagnostics, next, depth + 1));
          break;
        case "not":
          validateSearchExpression(expression.term, `${pointer}/term`, fields, context, diagnostics, next, depth + 1);
          break;
        case "text":
          expression.fields.forEach((field, index) => validateField(field, `${pointer}/fields/${index}`, fields, diagnostics));
          break;
        case "compare":
        case "range":
        case "exists":
          validateField(expression.field, `${pointer}/field`, fields, diagnostics);
          break;
        case "related": {
          const maximum = context.limits.maxRelationDepth ?? context.limits.maxDepth;
          if (!Number.isInteger(expression.maxDepth) || expression.maxDepth < 1 || expression.maxDepth > maximum)
            problem(diagnostics, "PROJECTION_LIMIT", `${pointer}/maxDepth`, `Relation predicate depth must be between 1 and ${maximum}`);
          break;
        }
      }
    }
    function totalOrder(orders) {
      const result = [...orders];
      for (const field of ["kind", "objectId"])
        if (!result.some((order) => order.field === field))
          result.push({ field, direction: "ascending", nulls: "last" });
      return result;
    }
    function problem(diagnostics, code, pointer, messageValue) {
      diagnostics.push(Object.freeze({ code, message: messageValue, severity: "error", pointer }));
    }
    function message(error) {
      return error instanceof Error ? error.message : String(error);
    }
    function matchingBrace(value, open) {
      let quote = "";
      for (let index = open + 1; index < value.length; index += 1) {
        const character = value[index] ?? "";
        if (quote) {
          if (character === "\\")
            index += 1;
          else if (character === quote)
            quote = "";
        } else if (character === "'" || character === '"')
          quote = character;
        else if (character === "}")
          return index;
      }
      return -1;
    }
    var TemplateExpressionParser = class {
      input;
      values;
      fields;
      index = 0;
      constructor(input, values, fields) {
        this.input = input;
        this.values = values;
        this.fields = fields;
      }
      parse() {
        const value = this.expression();
        this.space();
        if (this.index !== this.input.length)
          throw new Error(`Unexpected template input near ${this.input.slice(this.index)}`);
        return value;
      }
      expression() {
        this.space();
        const character = this.input[this.index];
        if (character === "'" || character === '"')
          return this.string();
        if (character !== void 0 && /[0-9-]/u.test(character))
          return this.number();
        const identifier = this.identifier();
        this.space();
        if (this.input[this.index] !== "(") {
          if (!FIELD.test(identifier))
            throw new Error(`Invalid template field ${identifier}`);
          this.fields.add(identifier);
          return this.values[identifier] ?? "";
        }
        if (!FUNCTIONS.has(identifier))
          throw new Error(`Unsupported projection template function ${identifier}`);
        this.index += 1;
        const args = [];
        this.space();
        while (this.input[this.index] !== ")") {
          if (this.index >= this.input.length)
            throw new Error("Unclosed projection template function");
          args.push(this.expression());
          this.space();
          if (this.input[this.index] === ",") {
            this.index += 1;
            this.space();
            continue;
          }
          if (this.input[this.index] !== ")")
            throw new Error("Expected comma or closing parenthesis in projection template");
        }
        this.index += 1;
        return applyTemplateFunction(identifier, args);
      }
      identifier() {
        const start = this.index;
        while (/[A-Za-z0-9._-]/u.test(this.input[this.index] ?? ""))
          this.index += 1;
        if (start === this.index)
          throw new Error("Expected projection template field or function");
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
            if (this.index >= this.input.length)
              throw new Error("Invalid string escape in projection template");
            value += this.input[this.index];
          } else
            value += character;
          this.index += 1;
        }
        if (this.input[this.index] !== quote)
          throw new Error("Unclosed string in projection template");
        this.index += 1;
        return value;
      }
      number() {
        const start = this.index;
        while (/[0-9-]/u.test(this.input[this.index] ?? ""))
          this.index += 1;
        const value = Number(this.input.slice(start, this.index));
        if (!Number.isSafeInteger(value))
          throw new Error("Template number must be a safe integer");
        return value;
      }
      space() {
        while (/\s/u.test(this.input[this.index] ?? ""))
          this.index += 1;
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
          if (Number.isNaN(date.valueOf()))
            throw new Error("date() requires an ISO-compatible datetime");
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
          if (fill.length !== 1)
            throw new Error("pad fill must be one character");
          return first.padStart(width, fill);
        }
        case "truncate":
          return first.slice(0, integerArg(args[1], "truncate length", 1, 120));
        case "replace": {
          const search = scalar(args[1]);
          if (!search)
            throw new Error("replace search must not be empty");
          return first.split(search).join(scalar(args[2]));
        }
        default:
          throw new Error(`Unsupported projection template function ${name}`);
      }
    }
    function scalar(value) {
      if (value === void 0 || value === null)
        return "";
      if (typeof value === "string" || typeof value === "number" || typeof value === "boolean")
        return String(value);
      throw new Error("Projection template values must be scalar");
    }
    function integerArg(value, label, minimum, maximum) {
      if (!Number.isSafeInteger(value) || value < minimum || value > maximum)
        throw new Error(`${label} must be between ${minimum} and ${maximum}`);
      return value;
    }
    function occurrenceKey(candidate) {
      return `${candidate.target.objectId}\0${candidate.nodeId}\0${candidate.branchId ?? ""}`;
    }
    function uniqueSuffixes(candidates) {
      for (const length of [8, 10, 12, 13]) {
        const suffixes = candidates.map((candidate) => stableHash(occurrenceKey(candidate)).slice(0, length));
        if (new Set(suffixes).size === suffixes.length)
          return suffixes;
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
      if (value === null || typeof value !== "object")
        return JSON.stringify(value);
      if (Array.isArray(value))
        return `[${value.map(canonicalJson).join(",")}]`;
      return `{${Object.entries(value).filter(([, item]) => item !== void 0).sort(([left], [right]) => compareText(left, right)).map(([key, item]) => `${JSON.stringify(key)}:${canonicalJson(item)}`).join(",")}}`;
    }
    function cloneJson(value) {
      return JSON.parse(JSON.stringify(value));
    }
    function deepFreeze(value) {
      if (value !== null && typeof value === "object" && !Object.isFrozen(value)) {
        Object.freeze(value);
        for (const child of Object.values(value))
          deepFreeze(child);
      }
      return value;
    }
    function validateDefinitionId(value) {
      if (/^builtin:[a-z][a-z0-9-]{0,63}$/u.test(value))
        return value;
      return (0, identity_1.validateProjectionId)(value);
    }
    function compareText(left, right) {
      return left < right ? -1 : left > right ? 1 : 0;
    }
  }
});

// packages/Epoch.Community.Core/dist/projection-runtime.js
var require_projection_runtime = __commonJS({
  "packages/Epoch.Community.Core/dist/projection-runtime.js"(exports) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    exports.InMemoryProjectionRuntime = void 0;
    exports.normalizeVirtualPath = normalizeVirtualPath;
    exports.combineCompleteness = combineCompleteness;
    exports.validateVfsEntry = validateVfsEntry;
    var errors_1 = require_errors();
    var identity_1 = require_identity();
    var projection_compiler_1 = require_projection_compiler();
    var InMemoryProjectionRuntime = class {
      source;
      stored = /* @__PURE__ */ new Map();
      constructor(source, definitions = []) {
        this.source = source;
        for (const definition of definitions)
          this.register(definition);
      }
      async compile(definition, context) {
        return (0, projection_compiler_1.compileProjectionDefinition)(definition, context);
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
        return [...this.stored.keys()].sort(compareText);
      }
      async list(projectionId, path, page, context) {
        validateExecution(path, page, context);
        const result = await this.source.list(projectionId, path, page, context);
        if (result.entries.length > page.first)
          throw new errors_1.CommunityError("PROJECTION_INVALID", "Projection data source exceeded the requested page size");
        return Object.freeze({ ...result, entries: Object.freeze(result.entries.map((entry) => validateVfsEntry(entry, projectionId))), freshness: validateCompleteness(result.freshness) });
      }
      async resolve(projectionId, path, context) {
        validateExecution(path, void 0, context);
        const result = await this.source.resolve(projectionId, path, context);
        return result === void 0 ? void 0 : validateVfsEntry(result, projectionId);
      }
      async locate(projectionId, target, context) {
        validateExecution("/", void 0, context);
        (0, identity_1.validateObjectRef)(target);
        return Object.freeze((await this.source.locate(projectionId, target, context)).map((entry) => validateVfsEntry(entry, projectionId)));
      }
      async explain(projectionId, path, context) {
        validateExecution(path, void 0, context);
        if (this.source.explain !== void 0)
          return this.source.explain(projectionId, path, context);
        const entry = await this.resolve(projectionId, path, context);
        return Object.freeze({ projectionId, path, ...entry === void 0 ? {} : { entry }, componentOrder: [projectionId], shadowed: [], detail: entry === void 0 ? "Path did not resolve" : "Path resolved directly in the projection" });
      }
      async *watch(projectionId, path, context) {
        validateExecution(path, void 0, context);
        const stream = context.changes ?? this.source.watch?.(projectionId, path, context);
        if (stream === void 0)
          return;
        for await (const delta of stream) {
          if (context.signal.aborted)
            return;
          if (delta.projectionId === projectionId)
            yield delta;
        }
      }
    };
    exports.InMemoryProjectionRuntime = InMemoryProjectionRuntime;
    function normalizeVirtualPath(path) {
      if (typeof path !== "string" || path.length === 0 || path.length > 4096 || !path.startsWith("/"))
        throw new errors_1.CommunityError("PROJECTION_INVALID", "Virtual paths must be absolute and bounded");
      if (path !== path.normalize("NFKC"))
        throw new errors_1.CommunityError("PROJECTION_INVALID", "Virtual path uses ambiguous Unicode normalization");
      if ([...path].some((character) => {
        const code = character.codePointAt(0) ?? 0;
        return code === 0 || code < 32 || code === 127 || character === "\\";
      }))
        throw new errors_1.CommunityError("PROJECTION_INVALID", "Virtual path contains an unsafe character");
      const segments = path.split("/").filter(Boolean);
      if (segments.some((segment) => segment === "." || segment === ".."))
        throw new errors_1.CommunityError("PROJECTION_INVALID", "Virtual path traversal is not allowed");
      return segments.length === 0 ? "/" : `/${segments.join("/")}`;
    }
    function combineCompleteness(values) {
      const severity = { complete: 0, approximate: 1, stale: 2, partial: 3 };
      const status = values.reduce((worst, value) => severity[value.status] > severity[worst] ? value.status : worst, "complete");
      const sources = /* @__PURE__ */ new Map();
      for (const value of values)
        for (const source of value.sources)
          sources.set(`${source.sourceId}\0${source.token}`, source);
      return Object.freeze({
        status,
        sources: Object.freeze([...sources.values()].sort((left, right) => compareText(left.sourceId, right.sourceId))),
        omittedSources: Object.freeze([...new Set(values.flatMap((value) => value.omittedSources))].sort(compareText)),
        unsupportedPredicates: Object.freeze([...new Set(values.flatMap((value) => value.unsupportedPredicates))].sort(compareText))
      });
    }
    function validateVfsEntry(entry, projectionId) {
      if (entry.projectionId !== projectionId || !Number.isInteger(entry.projectionVersion) || entry.projectionVersion < 1)
        throw new errors_1.CommunityError("PROJECTION_INVALID", "Projection entry has mismatched projection identity");
      if (typeof entry.entryId !== "string" || entry.entryId.length === 0 || entry.entryId.length > 512 || typeof entry.parentEntryId !== "string" || entry.parentEntryId.length > 512)
        throw new errors_1.CommunityError("PROJECTION_INVALID", "Projection occurrence identity is invalid");
      if (typeof entry.name !== "string" || entry.name.length === 0 || entry.name.length > 120 || entry.name === "." || entry.name === ".." || /[/\\]/u.test(entry.name))
        throw new errors_1.CommunityError("PROJECTION_INVALID", "Projection entry name is unsafe");
      normalizeVirtualPath(entry.logicalPath);
      (0, identity_1.validateObjectRef)(entry.target);
      if (!["directory", "entity", "representation", "relation", "mount"].includes(entry.kind))
        throw new errors_1.CommunityError("PROJECTION_INVALID", "Projection entry kind is invalid");
      if (entry.sortKey.length > 128 || entry.sortKey.some((value) => !isFieldScalar(value)))
        throw new errors_1.CommunityError("PROJECTION_INVALID", "Projection entry sort key is invalid");
      return Object.freeze({ ...entry, freshness: validateCompleteness(entry.freshness) });
    }
    function validateCompleteness(value) {
      if (!["complete", "partial", "stale", "approximate"].includes(value.status) || value.sources.length > 4096 || value.omittedSources.length > 4096 || value.unsupportedPredicates.length > 4096)
        throw new errors_1.CommunityError("PROJECTION_INVALID", "Projection completeness metadata is invalid");
      return value;
    }
    function isFieldScalar(value) {
      return value === null || typeof value === "string" || typeof value === "boolean" || typeof value === "number" && Number.isFinite(value);
    }
    function validateExecution(path, page, context) {
      normalizeVirtualPath(path);
      if (!context.authorizationFingerprint || !context.snapshotId)
        throw new errors_1.CommunityError("AUTHORIZATION_DENIED", "Projection execution requires snapshot-bound authorization");
      if (page !== void 0 && (!Number.isInteger(page.first) || page.first < 1 || page.first > 1e3))
        throw new errors_1.CommunityError("PROJECTION_INVALID", "Projection page size must be between 1 and 1000");
    }
    function compareText(left, right) {
      return left < right ? -1 : left > right ? 1 : 0;
    }
  }
});

// packages/Epoch.Community.Core/dist/projection-delta.js
var require_projection_delta = __commonJS({
  "packages/Epoch.Community.Core/dist/projection-delta.js"(exports) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    exports.ProjectionDeltaController = void 0;
    exports.applyProjectionDelta = applyProjectionDelta;
    var errors_1 = require_errors();
    var entity_1 = require_entity();
    var projection_runtime_1 = require_projection_runtime();
    var ProjectionDeltaController = class {
      track(mode2, entries, anchor) {
        return new ProjectionDeltaState(mode2, entries, anchor);
      }
    };
    exports.ProjectionDeltaController = ProjectionDeltaController;
    var ProjectionDeltaState = class {
      mode;
      anchor;
      current;
      queued = [];
      sequence = 0;
      projectionId;
      projectionVersion;
      constructor(mode2, entries, anchor) {
        this.mode = mode2;
        this.anchor = anchor;
        this.current = Object.freeze([...entries]);
      }
      ingest(delta) {
        if (!Number.isInteger(delta.sequence) || delta.sequence <= this.sequence)
          throw new errors_1.CommunityError("PROJECTION_INVALID", "Projection delta sequence must increase monotonically");
        if (this.projectionId !== void 0 && (delta.projectionId !== this.projectionId || delta.projectionVersion !== this.projectionVersion))
          throw new errors_1.CommunityError("PROJECTION_INVALID", "Projection delta changed projection identity");
        this.projectionId ??= delta.projectionId;
        this.projectionVersion ??= delta.projectionVersion;
        this.sequence = delta.sequence;
        if (this.mode === "snapshot")
          return this.result(false);
        if (this.mode === "queued") {
          this.queued.push(delta);
          return this.result(false);
        }
        this.current = applyProjectionDelta(this.current, delta);
        return this.result(true);
      }
      applyQueued() {
        if (this.mode !== "queued")
          return this.result(false);
        for (const delta of this.queued)
          this.current = applyProjectionDelta(this.current, delta);
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
      if (!Number.isInteger(delta.projectionVersion) || delta.projectionVersion < 1 || delta.deletes.length > 1e5 || delta.upserts.length > 1e5)
        throw new errors_1.CommunityError("PROJECTION_INVALID", "Projection delta metadata is invalid");
      (0, entity_1.validateIsoDateTime)(delta.observedAt, "projection delta observedAt");
      const byId = new Map(entries.map((entry) => [entry.entryId, entry]));
      for (const entryId of delta.deletes)
        byId.delete(entryId);
      for (const entry of delta.upserts) {
        const valid = (0, projection_runtime_1.validateVfsEntry)(entry, delta.projectionId);
        if (valid.projectionVersion !== delta.projectionVersion)
          throw new errors_1.CommunityError("PROJECTION_INVALID", "Projection delta entry version does not match");
        byId.set(valid.entryId, valid);
      }
      return Object.freeze([...byId.values()].sort(compareEntries));
    }
    function compareEntries(left, right) {
      const leftKey = JSON.stringify(left.sortKey);
      const rightKey = JSON.stringify(right.sortKey);
      if (leftKey !== rightKey)
        return leftKey < rightKey ? -1 : 1;
      return left.entryId < right.entryId ? -1 : left.entryId > right.entryId ? 1 : 0;
    }
  }
});

// packages/Epoch.Community.Core/dist/namespace.js
var require_namespace = __commonJS({
  "packages/Epoch.Community.Core/dist/namespace.js"(exports) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    exports.ProjectionDeltaController = exports.InMemoryProjectionRuntime = void 0;
    exports.createNamespaceRuntime = createNamespaceRuntime;
    var builtin_projections_1 = require_builtin_projections();
    var errors_1 = require_errors();
    var identity_1 = require_identity();
    var projection_delta_1 = require_projection_delta();
    Object.defineProperty(exports, "ProjectionDeltaController", { enumerable: true, get: function() {
      return projection_delta_1.ProjectionDeltaController;
    } });
    var projection_runtime_1 = require_projection_runtime();
    Object.defineProperty(exports, "InMemoryProjectionRuntime", { enumerable: true, get: function() {
      return projection_runtime_1.InMemoryProjectionRuntime;
    } });
    var RECOVERY_ROOT = "/.epoch";
    var RECOVERY_NAMES = ["default", "canonical", "projections", "sources", "diagnostics"];
    var SCOPE_RANK = { session: 5, user: 4, workspace: 3, community: 2, builtin: 1 };
    var EMPTY = Object.freeze({ status: "complete", sources: [], omittedSources: [], unsupportedPredicates: [] });
    var READ_ONLY = Object.freeze({ read: true, enter: true, expand: true, composeUnder: false, execute: false });
    function createNamespaceRuntime(projections, initial = []) {
      projections.register(builtin_projections_1.builtinDefaultProjection);
      const mounts = /* @__PURE__ */ new Map();
      const cursors = createNamespaceCursorStore();
      const preserved = new Set(projections.definitions());
      for (const mount of initial)
        addMount(mount);
      if (![...mounts.values()].some((mount) => mount.scope === "builtin" && mount.mountPath === "/")) {
        addMount({ mountId: "builtin-root", scope: "builtin", mountPath: "/", projectionId: "builtin:default", mode: "replace", order: 0, writable: false, createdAt: "1970-01-01T00:00:00.000Z", updatedAt: "1970-01-01T00:00:00.000Z" });
      }
      const runtime = {
        async list(path, page, context) {
          const normalized = (0, projection_runtime_1.normalizeVirtualPath)(path);
          validatePage(page, context);
          if (normalized === RECOVERY_ROOT)
            return recoveryPage(page, context, cursors);
          if (normalized.startsWith(`${RECOVERY_ROOT}/`))
            return recoveryChildPage(normalized, page, projections, context, cursors);
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
              } else
                shadowed.push(Object.freeze({ name: entry.name, winner, entry, mountId: candidate.component.mount.mountId, reason: "shadowed" }));
            }
          }
          for (const mountEntry of childMountEntries(normalized, mounts.values())) {
            const winner = winners.get(mountEntry.name);
            if (winner === void 0) {
              winners.set(mountEntry.name, mountEntry);
              entries.push(mountEntry);
            } else
              shadowed.push(Object.freeze({ name: mountEntry.name, winner, entry: mountEntry, mountId: mountEntry.entryId, reason: "shadowed" }));
          }
          return pageOf(entries, page, (0, projection_runtime_1.combineCompleteness)(candidates.map((candidate) => candidate.page.freshness)), shadowed, candidates.map((candidate) => candidate.component.mount.mountId), context, cursors);
        },
        async resolve(path, context) {
          const normalized = (0, projection_runtime_1.normalizeVirtualPath)(path);
          validateContext(context);
          const recovery = recoveryEntry(normalized);
          if (recovery !== void 0)
            return recovery;
          if (normalized.startsWith(`${RECOVERY_ROOT}/`))
            return resolveRecoveryChild(normalized, projections, context);
          for (const component of componentsFor(normalized, mounts.values())) {
            const resolved = await projections.resolve(component.mount.projectionId, component.relativePath, context);
            if (resolved !== void 0)
              return namespaceEntry(resolved, component.mount, parentPath(normalized));
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
          const normalized = (0, projection_runtime_1.normalizeVirtualPath)(path);
          const components = componentsFor(normalized, mounts.values());
          const occurrences = [];
          for (const component of components) {
            const found = await projections.resolve(component.mount.projectionId, component.relativePath, context);
            if (found !== void 0)
              occurrences.push(namespaceEntry(found, component.mount, parentPath(normalized)));
          }
          const entry = occurrences[0];
          const shadowed = occurrences.slice(1);
          return Object.freeze({ projectionId: "namespace", path: normalized, ...entry === void 0 ? {} : { entry }, componentOrder: components.map((component) => component.mount.mountId), shadowed, detail: entry === void 0 ? "No visible mount component contains the path" : shadowed.length === 0 ? "The first matching mount component provides this path" : `${shadowed.length} lower-precedence occurrence(s) are shadowed` });
        },
        async *watch(path, context) {
          const normalized = (0, projection_runtime_1.normalizeVirtualPath)(path);
          const streams = componentsFor(normalized, mounts.values()).map((component) => projections.watch(component.mount.projectionId, component.relativePath, context));
          yield* mergeDeltaStreams(streams, context.signal);
        },
        mounts: () => Object.freeze(sortedMounts(mounts.values())),
        mount: (mount) => addMount(mount),
        unmount(mountId) {
          if (mountId.startsWith("recovery-"))
            throw protectedRecovery();
          mounts.delete(mountId);
        },
        reset(scope) {
          const removed = [...mounts.values()].filter((mount) => mount.scope === scope).map((mount) => mount.mountId).sort(compareText);
          for (const mountId of removed)
            mounts.delete(mountId);
          return Object.freeze({ scope, removedMountIds: Object.freeze(removed), preservedProjectionIds: Object.freeze([...preserved].sort(compareText)) });
        },
        definitions: () => Object.freeze([...preserved].sort(compareText)),
        writableMountFor(path, context) {
          validateContext(context);
          const normalized = (0, projection_runtime_1.normalizeVirtualPath)(path);
          const writable = componentsFor(normalized, mounts.values()).map((component) => component.mount).filter((mount) => mount.writable);
          if (writable.length === 0)
            throw new errors_1.CommunityError("NAMESPACE_MOUNT_CONFLICT", "Namespace path is read-only");
          if (writable.length !== 1)
            throw new errors_1.CommunityError("NAMESPACE_MOUNT_CONFLICT", "Namespace write is ambiguous across multiple writable mounts");
          return writable[0];
        }
      };
      return Object.freeze(runtime);
      function addMount(input) {
        const mount = validateMount(input);
        if (mount.mountPath === RECOVERY_ROOT || mount.mountPath.startsWith(`${RECOVERY_ROOT}/`))
          throw protectedRecovery();
        if (mounts.has(mount.mountId))
          throw new errors_1.CommunityError("NAMESPACE_MOUNT_CONFLICT", `Namespace mount already exists: ${mount.mountId}`);
        if (projections.definition(mount.projectionId) === void 0)
          throw new errors_1.CommunityError("PROJECTION_INVALID", `Namespace mount references an unknown projection: ${mount.projectionId}`);
        preserved.add(mount.projectionId);
        mounts.set(mount.mountId, mount);
        return mount;
      }
    }
    function componentsFor(path, values) {
      const normalized = (0, projection_runtime_1.normalizeVirtualPath)(path);
      const applicable = sortedMounts(values).filter((mount) => isUnder(normalized, mount.mountPath));
      const byPath = /* @__PURE__ */ new Map();
      for (const mount of applicable) {
        const group = byPath.get(mount.mountPath) ?? [];
        group.push(mount);
        byPath.set(mount.mountPath, group);
      }
      const output = [];
      for (const [mountPath, group] of [...byPath.entries()].sort(([left], [right]) => right.length - left.length || compareText(left, right))) {
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
    function sortedMounts(values) {
      return [...values].sort(compareMount);
    }
    function compareMount(left, right) {
      return SCOPE_RANK[right.scope] - SCOPE_RANK[left.scope] || left.order - right.order || compareText(left.mountId, right.mountId);
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
      if (path.startsWith(`${RECOVERY_ROOT}/default/`))
        return projections.resolve("builtin:default", path.slice(`${RECOVERY_ROOT}/default`.length), context);
      const canonical = path.match(/^\/\.epoch\/canonical\/([^/]+)\/([^/]+)$/u);
      if (canonical !== null) {
        let target;
        try {
          target = (0, identity_1.validateObjectRef)({ objectId: canonical[2] ?? "", kind: canonical[1] ?? "" });
        } catch {
          return void 0;
        }
        for (const projectionId of projections.definitions())
          if ((await projections.locate(projectionId, target, context)).length > 0) {
            return Object.freeze({ ...makeRecovery(target.objectId, `recovery-canonical-${stableToken(`${target.kind}:${target.objectId}`)}`, "entity", path), target });
          }
        return void 0;
      }
      if (path.startsWith(`${RECOVERY_ROOT}/projections/`)) {
        const projectionId = path.slice(`${RECOVERY_ROOT}/projections/`.length);
        if (projections.definition(projectionId) !== void 0)
          return makeRecovery(projectionId, `recovery-projection-${stableToken(projectionId)}`, "representation", path, projectionId);
      }
      return recoveryEntry(path);
    }
    function recoveryEntry(path) {
      if (path === RECOVERY_ROOT)
        return makeRecovery(".epoch", "recovery-root", "directory", RECOVERY_ROOT);
      if (!path.startsWith(`${RECOVERY_ROOT}/`))
        return void 0;
      const remainder = path.slice(`${RECOVERY_ROOT}/`.length);
      if (!RECOVERY_NAMES.includes(remainder))
        return void 0;
      const kind = remainder === "default" ? "mount" : "directory";
      return makeRecovery(remainder, `recovery-${remainder}`, kind, path, remainder === "default" ? "builtin:default" : `recovery:${remainder}`);
    }
    function makeRecovery(name, entryId, kind, logicalPath, projectionId = "recovery") {
      const target = { objectId: entryId, kind: "projection" };
      return Object.freeze({ entryId, target, projectionId, projectionVersion: 1, parentEntryId: "recovery-root", name, logicalPath, kind, sortKey: [name], capabilities: READ_ONLY, freshness: EMPTY });
    }
    function validateMount(input) {
      if (!/^[A-Za-z0-9][A-Za-z0-9._~-]{0,127}$/u.test(input.mountId))
        throw new errors_1.CommunityError("NAMESPACE_MOUNT_CONFLICT", "Mount ID must be an opaque URL-safe identifier");
      const mountPath = (0, projection_runtime_1.normalizeVirtualPath)(input.mountPath);
      if (!Object.hasOwn(SCOPE_RANK, input.scope) || !["replace", "before", "after"].includes(input.mode))
        throw new errors_1.CommunityError("NAMESPACE_MOUNT_CONFLICT", "Namespace mount scope or mode is invalid");
      if (!Number.isSafeInteger(input.order))
        throw new errors_1.CommunityError("NAMESPACE_MOUNT_CONFLICT", "Namespace mount order must be a safe integer");
      return Object.freeze({ ...input, mountPath });
    }
    function childMountEntries(path, values) {
      const childMounts = sortedMounts(values).filter((mount) => mount.mountPath !== "/" && parentPath(mount.mountPath) === path);
      const output = [];
      const seen = /* @__PURE__ */ new Set();
      for (const mount of childMounts) {
        const name = basename(mount.mountPath);
        if (seen.has(name))
          continue;
        seen.add(name);
        const target = { objectId: `mount-${mount.mountId}`, kind: "projection" };
        output.push(Object.freeze({ entryId: `mount-${mount.mountId}`, target, projectionId: mount.projectionId, projectionVersion: 1, parentEntryId: "namespace", name, logicalPath: mount.mountPath, kind: "mount", sortKey: [name, mount.mountId], capabilities: READ_ONLY, freshness: EMPTY }));
      }
      return output;
    }
    function pageOf(entries, page, freshness, shadowed, componentOrder, context, cursors) {
      const cursor = page.after === void 0 ? void 0 : cursors.decode(page.after, context);
      const start = cursor === void 0 ? 0 : entries.findIndex((entry) => entry.entryId === cursor.entryId) + 1;
      if (cursor !== void 0 && start === 0)
        throw new errors_1.CommunityError("CURSOR_STALE", "Namespace cursor no longer resolves in this snapshot");
      const values = entries.slice(start, start + page.first);
      const hasNextPage = start + page.first < entries.length;
      const pageInfo = Object.freeze({ hasNextPage, ...hasNextPage && values.length > 0 ? { endCursor: cursors.encode(values.at(-1).entryId, context) } : {} });
      return Object.freeze({ entries: Object.freeze(values), pageInfo, freshness, shadowed: Object.freeze([...shadowed]), componentOrder: Object.freeze([...componentOrder]) });
    }
    function createNamespaceCursorStore() {
      const issued = /* @__PURE__ */ new Map();
      return {
        encode(entryId, context) {
          const bytes = globalThis.crypto?.getRandomValues(new Uint8Array(24));
          if (bytes === void 0)
            throw new errors_1.CommunityError("CRYPTO_UNAVAILABLE", "Namespace cursor generation is unavailable");
          let binary = "";
          for (const byte of bytes)
            binary += String.fromCharCode(byte);
          const token = globalThis.btoa(binary).replace(/\+/gu, "-").replace(/\//gu, "_").replace(/=+$/gu, "");
          issued.set(token, { entryId, snapshotId: context.snapshotId, authorizationFingerprint: context.authorizationFingerprint });
          if (issued.size > 4096)
            issued.delete(issued.keys().next().value);
          return token;
        },
        decode(cursor, context) {
          if (!/^[A-Za-z0-9_-]{32}$/u.test(cursor))
            throw new errors_1.CommunityError("CURSOR_INVALID", "Namespace cursor is malformed");
          const value = issued.get(cursor);
          if (value === void 0 || value.snapshotId !== context.snapshotId || value.authorizationFingerprint !== context.authorizationFingerprint) {
            throw new errors_1.CommunityError("CURSOR_STALE", "Namespace cursor does not match this snapshot or authorization");
          }
          return { entryId: value.entryId };
        }
      };
    }
    function validatePage(page, context) {
      validateContext(context);
      if (!Number.isInteger(page.first) || page.first < 1 || page.first > 1e3)
        throw new errors_1.CommunityError("PROJECTION_INVALID", "Namespace page size must be between 1 and 1000");
    }
    function validateContext(context) {
      if (!context.authorizationFingerprint || !context.snapshotId)
        throw new errors_1.CommunityError("AUTHORIZATION_DENIED", "Namespace operation requires snapshot-bound authorization");
    }
    function protectedRecovery() {
      return new errors_1.CommunityError("NAMESPACE_RECOVERY_PROTECTED", "The /.epoch recovery namespace is immutable");
    }
    function isUnder(path, mountPath) {
      return mountPath === "/" || path === mountPath || path.startsWith(`${mountPath}/`);
    }
    function parentPath(path) {
      const values = path.split("/").filter(Boolean);
      values.pop();
      return values.length === 0 ? "/" : `/${values.join("/")}`;
    }
    function basename(path) {
      return path.split("/").filter(Boolean).at(-1) ?? "";
    }
    function joinPath(parent, name) {
      return parent === "/" ? `/${name}` : `${parent}/${name}`;
    }
    function compareEntry(left, right) {
      return compareText(left.name, right.name) || compareText(left.entryId, right.entryId);
    }
    function compareText(left, right) {
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
        if (iterator !== void 0)
          pending.set(index, iterator.next().then((result) => ({ index, result })));
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
  }
});

// packages/Epoch.Community.Core/dist/entity-projection-runtime.js
var require_entity_projection_runtime = __commonJS({
  "packages/Epoch.Community.Core/dist/entity-projection-runtime.js"(exports) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    exports.EntityProjectionRuntime = void 0;
    var cursor_1 = require_cursor();
    var errors_1 = require_errors();
    var identity_1 = require_identity();
    var projection_compiler_1 = require_projection_compiler();
    var projection_runtime_1 = require_projection_runtime();
    var query_evaluator_1 = require_query_evaluator();
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
    var EntityProjectionRuntime = class {
      #entities;
      #byId;
      #completeness;
      #compileContext;
      #cursor;
      #compiled = /* @__PURE__ */ new Map();
      constructor(options, definitions = []) {
        const byId = /* @__PURE__ */ new Map();
        for (const entity of options.entities) {
          if (byId.has(entity.ref.objectId))
            throw new errors_1.CommunityError("PROJECTION_INVALID", `Duplicate canonical entity ${entity.ref.objectId}`);
          byId.set(entity.ref.objectId, entity);
        }
        this.#entities = Object.freeze([...byId.values()]);
        this.#byId = byId;
        this.#completeness = freezeCompleteness(options.completeness);
        this.#compileContext = options.compileContext;
        this.#cursor = (0, cursor_1.createKeysetCursorCodec)({ key: options.cursorKey });
        for (const definition of definitions)
          this.register(definition);
      }
      async compile(definition, context) {
        return (0, projection_compiler_1.compileProjectionDefinition)(definition, context);
      }
      register(definition) {
        const compiled = (0, projection_compiler_1.compileProjectionDefinition)(definition, this.#compileContext);
        this.#compiled.set(definition.projectionId, compiled);
      }
      unregister(projectionId) {
        this.#compiled.delete(projectionId);
      }
      definition(projectionId) {
        return this.#compiled.get(projectionId)?.definition;
      }
      definitions() {
        return Object.freeze([...this.#compiled.keys()].sort(compareText));
      }
      async list(projectionId, path, page, context) {
        validateRequest(path, page, context);
        const compiled = this.#require(projectionId);
        const parent = await this.#walk(compiled, path);
        if (path !== "/" && parent === void 0)
          return emptyPage(this.#completeness);
        const records = path === "/" ? this.#root(compiled) : this.#children(compiled, parent);
        const binding = cursorBinding(compiled, context, parent?.entry.entryId ?? rootEntryId(compiled));
        let start = 0;
        if (page.after !== void 0) {
          const decoded = await this.#cursor.decode(page.after, binding);
          const index = records.findIndex(({ entry }) => entry.entryId === decoded.objectId && equalScalars(entry.sortKey, decoded.sortKey));
          if (index < 0)
            throw new errors_1.CommunityError("CURSOR_STALE", "Projection cursor no longer resolves in this snapshot");
          start = index + 1;
        }
        const selected = records.slice(start, start + page.first);
        const cursors = await Promise.all(selected.map(({ entry }) => this.#cursor.encode({
          version: 1,
          snapshotId: context.snapshotId,
          planHash: binding.planHash,
          authorizationFingerprint: context.authorizationFingerprint,
          sortKey: entry.sortKey,
          objectId: entry.entryId
        })));
        const pageInfo = Object.freeze({
          hasNextPage: start + selected.length < records.length,
          ...cursors[0] === void 0 ? {} : { startCursor: cursors[0] },
          ...cursors.at(-1) === void 0 ? {} : { endCursor: cursors.at(-1) }
        });
        return Object.freeze({ entries: Object.freeze(selected.map(({ entry }) => entry)), pageInfo, freshness: this.#completeness });
      }
      async resolve(projectionId, path, context) {
        validateRequest(path, void 0, context);
        if ((0, projection_runtime_1.normalizeVirtualPath)(path) === "/")
          return void 0;
        return (await this.#walk(this.#require(projectionId), path))?.entry;
      }
      async locate(projectionId, target, context) {
        validateRequest("/", void 0, context);
        (0, identity_1.validateObjectRef)(target);
        const compiled = this.#require(projectionId);
        const queue = [...this.#root(compiled)];
        const found = [];
        const limit = compiled.definition.limits?.maxTotalEntries ?? 1e5;
        for (let index = 0; index < queue.length; index += 1) {
          if (index >= limit)
            throw new errors_1.CommunityError("PROJECTION_INVALID", `Projection exceeds its ${limit} entry execution limit`);
          const occurrence = queue[index];
          if (occurrence.entry.target.objectId === target.objectId)
            found.push(occurrence.entry);
          queue.push(...this.#children(compiled, occurrence));
        }
        return Object.freeze(found);
      }
      async explain(projectionId, path, context) {
        validateRequest(path, void 0, context);
        const compiled = this.#require(projectionId);
        const occurrence = (0, projection_runtime_1.normalizeVirtualPath)(path) === "/" ? void 0 : await this.#walk(compiled, path);
        if (occurrence === void 0)
          return Object.freeze({ projectionId, path, componentOrder: [projectionId], shadowed: [], detail: path === "/" ? "Projection root" : "Path did not resolve" });
        const collision = occurrence.collision;
        const detail = collision.collided ? `${occurrence.raw.nodeId} rendered ${JSON.stringify(collision.originalSegment)} as ${JSON.stringify(collision.normalizedSegment)}; collision set [${collision.collisionSet.join(", ")}] produced ${JSON.stringify(collision.finalName)}` : `${occurrence.raw.nodeId} rendered ${JSON.stringify(collision.originalSegment)} as ${JSON.stringify(collision.finalName)}`;
        return Object.freeze({ projectionId, path, entry: occurrence.entry, componentOrder: [projectionId], shadowed: [], detail });
      }
      async *watch(projectionId, path, context) {
        validateRequest(path, void 0, context);
        this.#require(projectionId);
        if (context.changes === void 0)
          return;
        for await (const delta of context.changes) {
          if (context.signal.aborted)
            return;
          if (delta.projectionId === projectionId)
            yield delta;
        }
      }
      #require(projectionId) {
        const compiled = this.#compiled.get(projectionId);
        if (compiled === void 0)
          throw new errors_1.CommunityError("PROJECTION_INVALID", `Unknown projection ${projectionId}`);
        return compiled;
      }
      #root(compiled) {
        const parentEntryId = rootEntryId(compiled);
        const entities = sortEntities(this.#entities, compiled.effectiveOrder);
        const frame = { entities, branchId: "root", parentEntryId, path: "/" };
        const root = compiled.definition.root;
        const raw = root.kind === "literal" && root.segment === "" ? this.#emitMany(compiled, root.children, { ...frame, branchId: `${frame.branchId}/${root.nodeId}` }) : this.#emit(compiled, root, frame);
        return this.#materialize(compiled, raw, parentEntryId, "/");
      }
      #children(compiled, parent) {
        const raw = this.#emitMany(compiled, parent.raw.childNodes, {
          ...parent.raw.childFrame,
          branchId: parent.raw.branchId,
          parentEntryId: parent.entry.entryId,
          path: parent.entry.logicalPath
        });
        return this.#materialize(compiled, raw, parent.entry.entryId, parent.entry.logicalPath);
      }
      async #walk(compiled, path) {
        const normalized = (0, projection_runtime_1.normalizeVirtualPath)(path);
        if (normalized === "/")
          return void 0;
        let children = this.#root(compiled);
        let current;
        const segments = normalized.slice(1).split("/");
        for (const [index, segment] of segments.entries()) {
          current = children.find(({ entry }) => entry.name === segment);
          if (current === void 0)
            return void 0;
          if (index < segments.length - 1)
            children = this.#children(compiled, current);
        }
        return current;
      }
      #emitMany(compiled, nodes, frame) {
        return nodes.flatMap((node, index) => this.#emit(compiled, node, { ...frame, branchId: `${frame.branchId}/${index}` }));
      }
      #emit(compiled, node, frame) {
        switch (node.kind) {
          case "literal": {
            const branchId = `${frame.branchId}/${node.nodeId}`;
            const target = structuralRef(compiled, node.nodeId, branchId);
            return [this.#raw(compiled, node.nodeId, branchId, node.segment, "directory", target, frame, node.children)];
          }
          case "select": {
            const selected = sortEntities(frame.entities.filter((entity) => node.objectKinds.includes(entity.ref.kind) && (node.where === void 0 || (0, query_evaluator_1.evaluateSearchExpression)(entity, node.where, this.#evaluationOptions()).matches)), node.order ?? compiled.effectiveOrder).slice(0, node.limit);
            return this.#emitMany(compiled, node.children, { ...frame, entities: selected, branchId: `${frame.branchId}/${node.nodeId}` });
          }
          case "group": {
            const groups = /* @__PURE__ */ new Map();
            for (const entity of frame.entities) {
              const values = (0, query_evaluator_1.searchFieldValues)(entity, node.field).filter((value) => value !== null);
              for (const value of values.length === 0 ? [null] : values) {
                const key = JSON.stringify(value);
                const group = groups.get(key) ?? { value, entities: [] };
                group.entities.push(entity);
                groups.set(key, group);
              }
            }
            const ordered = [...groups.values()].sort((left, right) => groupCompare(left, right, node.order));
            return ordered.map((group) => {
              const branchId = `${frame.branchId}/${node.nodeId}:${stableHash(JSON.stringify(group.value))}`;
              const values = Object.freeze({ ...frame.templateValues ?? {}, [node.field]: group.value, count: group.entities.length });
              const segment = group.value === null ? node.missing : (0, projection_compiler_1.renderSegmentTemplate)(node.segment, values).segment;
              const target = structuralRef(compiled, node.nodeId, branchId);
              return this.#raw(compiled, node.nodeId, branchId, segment, "directory", target, { ...frame, entities: Object.freeze(group.entities), templateValues: values }, [node.child], group.value === null ? node.missing : node.segment.template);
            });
          }
          case "traverse": {
            const output = [];
            for (const start of frame.entities) {
              const reached = this.#traverse(start, node.relation, node.direction, node.maxDepth);
              output.push(...this.#emit(compiled, node.child, {
                ...frame,
                entities: reached,
                branchId: `${frame.branchId}/${node.nodeId}:${start.ref.objectId}`
              }));
            }
            return output;
          }
          case "union":
            return this.#emitMany(compiled, node.children, { ...frame, branchId: `${frame.branchId}/${node.nodeId}` });
          case "alias": {
            const entity = this.#byId.get(node.target.objectId);
            if (entity === void 0)
              return [];
            const branchId = `${frame.branchId}/${node.nodeId}:${entity.ref.objectId}`;
            const segment = (0, projection_compiler_1.renderSegmentTemplate)(node.segment, templateValues(entity, frame.templateValues)).segment;
            return [this.#raw(compiled, node.nodeId, branchId, segment, "entity", entity.ref, { ...frame, entities: [entity] }, node.children, node.segment.template)];
          }
          case "leaf":
            return frame.entities.map((entity) => {
              const branchId = `${frame.branchId}/${node.nodeId}:${entity.ref.objectId}:${node.representation}`;
              const segment = (0, projection_compiler_1.renderSegmentTemplate)(node.segment, templateValues(entity, frame.templateValues)).segment;
              return this.#raw(compiled, node.nodeId, branchId, segment, node.representation === "default" ? "entity" : "representation", entity.ref, { ...frame, entities: [entity] }, [], node.segment.template);
            });
        }
      }
      #raw(compiled, nodeId, branchId, segment, kind, target, childFrame, childNodes, originalSegment = segment) {
        const entity = this.#byId.get(target.objectId);
        return Object.freeze({
          target,
          nodeId,
          branchId,
          originalSegment,
          normalizedSegment: segment,
          kind,
          sortKey: Object.freeze(compiled.effectiveOrder.map((order) => entity === void 0 ? null : (0, query_evaluator_1.searchFieldValues)(entity, order.field)[0] ?? null)),
          childNodes,
          childFrame
        });
      }
      #materialize(compiled, raw, parentEntryId, parentPath) {
        const maximum = compiled.definition.limits?.maxEntriesPerDirectory ?? this.#compileContext.limits.maxFanout;
        if (raw.length > maximum)
          throw new errors_1.CommunityError("PROJECTION_INVALID", `Virtual directory exceeds its ${maximum} entry limit`);
        const collisions = (0, projection_compiler_1.assignProjectionCollisionNames)(raw.map((candidate) => ({
          target: candidate.target,
          nodeId: candidate.nodeId,
          branchId: candidate.branchId,
          originalSegment: candidate.originalSegment,
          normalizedSegment: candidate.normalizedSegment
        })));
        return Object.freeze(raw.map((candidate, index) => {
          const collision = collisions[index];
          const entryId = (0, projection_compiler_1.createProjectionOccurrenceId)({
            projectionId: compiled.definition.projectionId,
            projectionVersion: compiled.definition.version,
            nodeId: candidate.nodeId,
            branchId: candidate.branchId,
            parentEntryId,
            target: candidate.target,
            resolvedSegment: candidate.normalizedSegment
          });
          const logicalPath = parentPath === "/" ? `/${collision.finalName}` : `${parentPath}/${collision.finalName}`;
          const entry = (0, projection_runtime_1.validateVfsEntry)({
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
            freshness: this.#completeness
          }, compiled.definition.projectionId);
          return Object.freeze({ raw: candidate, collision, entry });
        }));
      }
      #evaluationOptions() {
        return {
          resolveEntity: (objectId) => this.#byId.get(objectId),
          relationsFor: (objectId) => this.#entities.flatMap((entity) => entity.relations).filter((relation) => relation.source.objectId === objectId || relation.target.objectId === objectId)
        };
      }
      #traverse(start, relationType, direction, maximumDepth) {
        let frontier = [start.ref.objectId];
        const visited = new Set(frontier);
        const reached = [];
        for (let depth = 0; depth < maximumDepth && frontier.length > 0; depth += 1) {
          const next = [];
          for (const objectId of frontier)
            for (const relation of this.#entities.flatMap((entity) => entity.relations)) {
              if (relation.type !== relationType)
                continue;
              const adjacent = direction === "out" && relation.source.objectId === objectId ? relation.target : direction === "in" && relation.target.objectId === objectId ? relation.source : void 0;
              if (adjacent === void 0 || visited.has(adjacent.objectId))
                continue;
              visited.add(adjacent.objectId);
              const entity = this.#byId.get(adjacent.objectId);
              if (entity !== void 0) {
                reached.push(entity);
                next.push(entity.ref.objectId);
              }
            }
          frontier = next;
        }
        return Object.freeze(reached.sort((left, right) => compareText(left.ref.objectId, right.ref.objectId)));
      }
    };
    exports.EntityProjectionRuntime = EntityProjectionRuntime;
    function sortEntities(entities, order) {
      return Object.freeze([...entities].sort((left, right) => {
        for (const item of order) {
          const a = (0, query_evaluator_1.searchFieldValues)(left, item.field)[0] ?? null;
          const b = (0, query_evaluator_1.searchFieldValues)(right, item.field)[0] ?? null;
          const compared = scalarCompare(a, b, item.nulls);
          if (compared !== 0)
            return a === null || b === null || item.direction === "ascending" ? compared : -compared;
        }
        return compareText(left.ref.kind, right.ref.kind) || compareText(left.ref.objectId, right.ref.objectId);
      }));
    }
    function scalarCompare(left, right, nulls = "last") {
      if (left === right)
        return 0;
      if (left === null)
        return nulls === "first" ? -1 : 1;
      if (right === null)
        return nulls === "first" ? 1 : -1;
      if (typeof left === "number" && typeof right === "number")
        return left - right;
      if (typeof left === "boolean" && typeof right === "boolean")
        return Number(left) - Number(right);
      return compareText(String(left), String(right));
    }
    function groupCompare(left, right, order) {
      if (order === "count-ascending" || order === "count-descending") {
        const count = left.entities.length - right.entities.length;
        if (count !== 0)
          return order === "count-ascending" ? count : -count;
      }
      const key = scalarCompare(left.value, right.value);
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
      for (const [name, value] of Object.entries(output))
        if (Array.isArray(value))
          output[name] = value[0] ?? "";
      return output;
    }
    function structuralRef(compiled, nodeId, branchId) {
      return Object.freeze({ objectId: `vfs-${stableHash(`${compiled.definition.projectionId}\0${compiled.definition.version}\0${nodeId}\0${branchId}`)}`, kind: "projection" });
    }
    function rootEntryId(compiled) {
      return `root-${stableHash(`${compiled.definition.projectionId}\0${compiled.definition.version}`)}`;
    }
    function cursorBinding(compiled, context, parentEntryId) {
      return {
        snapshotId: context.snapshotId,
        authorizationFingerprint: context.authorizationFingerprint,
        planHash: `projection:${stableHash(`${compiled.canonicalJson}\0${parentEntryId}`)}`
      };
    }
    function validateRequest(path, page, context) {
      (0, projection_runtime_1.normalizeVirtualPath)(path);
      if (!context.authorizationFingerprint || !context.snapshotId)
        throw new errors_1.CommunityError("AUTHORIZATION_DENIED", "Projection execution requires snapshot-bound authorization");
      if (page !== void 0 && (!Number.isInteger(page.first) || page.first < 1 || page.first > 1e3))
        throw new errors_1.CommunityError("PROJECTION_INVALID", "Projection page size must be between 1 and 1000");
    }
    function freezeCompleteness(value) {
      if (typeof value !== "object" || value === null || !["complete", "partial", "stale", "approximate"].includes(value.status) || value.sources.length > 4096 || value.omittedSources.length > 4096 || value.unsupportedPredicates.length > 4096) {
        throw new errors_1.CommunityError("PROJECTION_INVALID", "Projection completeness metadata is invalid");
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
    function stableHash(value) {
      let hash = 0xcbf29ce484222325n;
      for (const byte of new TextEncoder().encode(value)) {
        hash ^= BigInt(byte);
        hash = BigInt.asUintN(64, hash * 0x100000001b3n);
      }
      return hash.toString(36).padStart(13, "0");
    }
    function compareText(left, right) {
      return left < right ? -1 : left > right ? 1 : 0;
    }
  }
});

// packages/Epoch.Community.Core/dist/index.js
var require_dist = __commonJS({
  "packages/Epoch.Community.Core/dist/index.js"(exports) {
    "use strict";
    var __createBinding = exports && exports.__createBinding || (Object.create ? (function(o, m, k2, k22) {
      if (k22 === void 0) k22 = k2;
      var desc = Object.getOwnPropertyDescriptor(m, k2);
      if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
        desc = { enumerable: true, get: function() {
          return m[k2];
        } };
      }
      Object.defineProperty(o, k22, desc);
    }) : (function(o, m, k2, k22) {
      if (k22 === void 0) k22 = k2;
      o[k22] = m[k2];
    }));
    var __exportStar = exports && exports.__exportStar || function(m, exports2) {
      for (var p in m) if (p !== "default" && !Object.prototype.hasOwnProperty.call(exports2, p)) __createBinding(exports2, m, p);
    };
    Object.defineProperty(exports, "__esModule", { value: true });
    exports.createCommunityClient = createCommunityClient;
    exports.createHttpCommunityClient = createHttpCommunityClient;
    __exportStar(require_authorization(), exports);
    __exportStar(require_actions(), exports);
    __exportStar(require_convergence(), exports);
    __exportStar(require_entity(), exports);
    __exportStar(require_errors(), exports);
    __exportStar(require_fields(), exports);
    __exportStar(require_graph(), exports);
    __exportStar(require_identity(), exports);
    __exportStar(require_navigation(), exports);
    __exportStar(require_query(), exports);
    __exportStar(require_runtime_context(), exports);
    __exportStar(require_cursor(), exports);
    __exportStar(require_query_evaluator(), exports);
    __exportStar(require_search_backend(), exports);
    __exportStar(require_search_plan(), exports);
    __exportStar(require_search_service(), exports);
    __exportStar(require_snapshot(), exports);
    __exportStar(require_source(), exports);
    __exportStar(require_namespace(), exports);
    __exportStar(require_projection_definition(), exports);
    __exportStar(require_projection_compiler(), exports);
    __exportStar(require_projection_delta(), exports);
    __exportStar(require_projection_runtime(), exports);
    __exportStar(require_entity_projection_runtime(), exports);
    __exportStar(require_builtin_projections(), exports);
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
  }
});

// node_modules/@sqlite.org/sqlite-wasm/dist/index.mjs
var dist_exports = {};
__export(dist_exports, {
  default: () => sqlite3_bundler_friendly_default,
  sqlite3Worker1Promiser: () => sqlite3_worker1_promiser_default
});
async function sqlite3InitModule(moduleArg = {}) {
  var moduleRtn;
  var Module = moduleArg;
  var ENVIRONMENT_IS_WEB = !!globalThis.window;
  var ENVIRONMENT_IS_WORKER = !!globalThis.WorkerGlobalScope;
  globalThis.process?.versions?.node && globalThis.process?.type;
  var thisProgram = "./this.program";
  var _scriptName = import.meta.url;
  var scriptDirectory = "";
  function locateFile(path) {
    if (Module["locateFile"]) return Module["locateFile"](path, scriptDirectory);
    return scriptDirectory + path;
  }
  var readAsync, readBinary;
  if (ENVIRONMENT_IS_WEB || ENVIRONMENT_IS_WORKER) {
    try {
      scriptDirectory = new URL(".", _scriptName).href;
    } catch {
    }
    if (ENVIRONMENT_IS_WORKER) readBinary = (url) => {
      var xhr = new XMLHttpRequest();
      xhr.open("GET", url, false);
      xhr.responseType = "arraybuffer";
      xhr.send(null);
      return new Uint8Array(xhr.response);
    };
    readAsync = async (url) => {
      var response = await fetch(url, { credentials: "same-origin" });
      if (response.ok) return response.arrayBuffer();
      throw new Error(response.status + " : " + response.url);
    };
  }
  var out = console.log.bind(console);
  var err = console.error.bind(console);
  var wasmBinary;
  var ABORT = false;
  var readyPromiseResolve, readyPromiseReject;
  var runtimeInitialized = false;
  function updateMemoryViews() {
    var b = wasmMemory.buffer;
    HEAP8 = new Int8Array(b);
    HEAP16 = new Int16Array(b);
    HEAPU8 = new Uint8Array(b);
    HEAPU16 = new Uint16Array(b);
    HEAP32 = new Int32Array(b);
    HEAPU32 = new Uint32Array(b);
    HEAPF32 = new Float32Array(b);
    HEAPF64 = new Float64Array(b);
    HEAP64 = new BigInt64Array(b);
    HEAPU64 = new BigUint64Array(b);
  }
  function initMemory() {
    if (Module["wasmMemory"]) wasmMemory = Module["wasmMemory"];
    else {
      var INITIAL_MEMORY = Module["INITIAL_MEMORY"] || 8388608;
      wasmMemory = new WebAssembly.Memory({
        "initial": INITIAL_MEMORY / 65536,
        "maximum": 32768
      });
    }
    updateMemoryViews();
  }
  function preRun() {
    if (Module["preRun"]) {
      if (typeof Module["preRun"] == "function") Module["preRun"] = [Module["preRun"]];
      while (Module["preRun"].length) addOnPreRun(Module["preRun"].shift());
    }
    callRuntimeCallbacks(onPreRuns);
  }
  function initRuntime() {
    runtimeInitialized = true;
    if (!Module["noFSInit"] && !FS.initialized) FS.init();
    TTY.init();
    wasmExports["__wasm_call_ctors"]();
    FS.ignorePermissions = false;
  }
  function postRun() {
    if (Module["postRun"]) {
      if (typeof Module["postRun"] == "function") Module["postRun"] = [Module["postRun"]];
      while (Module["postRun"].length) addOnPostRun(Module["postRun"].shift());
    }
    callRuntimeCallbacks(onPostRuns);
  }
  function abort(what) {
    Module["onAbort"]?.(what);
    what = `Aborted(${what})`;
    err(what);
    ABORT = true;
    what += ". Build with -sASSERTIONS for more info.";
    var e = new WebAssembly.RuntimeError(what);
    readyPromiseReject?.(e);
    throw e;
  }
  var wasmBinaryFile;
  function findWasmBinary() {
    if (Module["locateFile"]) return locateFile("sqlite3.wasm");
    return new URL("sqlite3.wasm", import.meta.url).href;
  }
  function getBinarySync(file) {
    if (file == wasmBinaryFile && wasmBinary) return new Uint8Array(wasmBinary);
    if (readBinary) return readBinary(file);
    throw "both async and sync fetching of the wasm failed";
  }
  async function getWasmBinary(binaryFile) {
    if (!wasmBinary) try {
      var response = await readAsync(binaryFile);
      return new Uint8Array(response);
    } catch {
    }
    return getBinarySync(binaryFile);
  }
  async function instantiateArrayBuffer(binaryFile, imports) {
    try {
      var binary = await getWasmBinary(binaryFile);
      return await WebAssembly.instantiate(binary, imports);
    } catch (reason) {
      err(`failed to asynchronously prepare wasm: ${reason}`);
      abort(reason);
    }
  }
  async function instantiateAsync(binary, binaryFile, imports) {
    if (!binary) try {
      var response = fetch(binaryFile, { credentials: "same-origin" });
      return await WebAssembly.instantiateStreaming(response, imports);
    } catch (reason) {
      err(`wasm streaming compile failed: ${reason}`);
      err("falling back to ArrayBuffer instantiation");
    }
    return instantiateArrayBuffer(binaryFile, imports);
  }
  function getWasmImports() {
    return {
      "env": wasmImports,
      "wasi_snapshot_preview1": wasmImports
    };
  }
  async function createWasm() {
    function receiveInstance(instance, module) {
      wasmExports = instance.exports;
      assignWasmExports(wasmExports);
      return wasmExports;
    }
    function receiveInstantiationResult(result) {
      return receiveInstance(result["instance"]);
    }
    var info = getWasmImports();
    if (Module["instantiateWasm"]) return new Promise((resolve, reject) => {
      Module["instantiateWasm"](info, (inst, mod) => {
        resolve(receiveInstance(inst, mod));
      });
    });
    wasmBinaryFile ??= findWasmBinary();
    return receiveInstantiationResult(await instantiateAsync(wasmBinary, wasmBinaryFile, info));
  }
  var HEAP16;
  var HEAP32;
  var HEAP64;
  var HEAP8;
  var HEAPF32;
  var HEAPF64;
  var HEAPU16;
  var HEAPU32;
  var HEAPU64;
  var HEAPU8;
  var callRuntimeCallbacks = (callbacks) => {
    while (callbacks.length > 0) callbacks.shift()(Module);
  };
  var onPostRuns = [];
  var addOnPostRun = (cb) => onPostRuns.push(cb);
  var onPreRuns = [];
  var addOnPreRun = (cb) => onPreRuns.push(cb);
  var wasmMemory;
  var PATH = {
    isAbs: (path) => path.charAt(0) === "/",
    splitPath: (filename) => {
      return /^(\/?|)([\s\S]*?)((?:\.{1,2}|[^\/]+?|)(\.[^.\/]*|))(?:[\/]*)$/.exec(filename).slice(1);
    },
    normalizeArray: (parts, allowAboveRoot) => {
      var up = 0;
      for (var i = parts.length - 1; i >= 0; i--) {
        var last = parts[i];
        if (last === ".") parts.splice(i, 1);
        else if (last === "..") {
          parts.splice(i, 1);
          up++;
        } else if (up) {
          parts.splice(i, 1);
          up--;
        }
      }
      if (allowAboveRoot) for (; up; up--) parts.unshift("..");
      return parts;
    },
    normalize: (path) => {
      var isAbsolute = PATH.isAbs(path), trailingSlash = path.slice(-1) === "/";
      path = PATH.normalizeArray(path.split("/").filter((p) => !!p), !isAbsolute).join("/");
      if (!path && !isAbsolute) path = ".";
      if (path && trailingSlash) path += "/";
      return (isAbsolute ? "/" : "") + path;
    },
    dirname: (path) => {
      var result = PATH.splitPath(path), root = result[0], dir = result[1];
      if (!root && !dir) return ".";
      if (dir) dir = dir.slice(0, -1);
      return root + dir;
    },
    basename: (path) => path && path.match(/([^\/]+|\/)\/*$/)[1],
    join: (...paths) => PATH.normalize(paths.join("/")),
    join2: (l, r) => PATH.normalize(l + "/" + r)
  };
  var initRandomFill = () => {
    return (view) => (crypto.getRandomValues(view), 0);
  };
  var randomFill = (view) => (randomFill = initRandomFill())(view);
  var PATH_FS = {
    resolve: (...args) => {
      var resolvedPath = "", resolvedAbsolute = false;
      for (var i = args.length - 1; i >= -1 && !resolvedAbsolute; i--) {
        var path = i >= 0 ? args[i] : FS.cwd();
        if (typeof path != "string") throw new TypeError("Arguments to path.resolve must be strings");
        else if (!path) return "";
        resolvedPath = path + "/" + resolvedPath;
        resolvedAbsolute = PATH.isAbs(path);
      }
      resolvedPath = PATH.normalizeArray(resolvedPath.split("/").filter((p) => !!p), !resolvedAbsolute).join("/");
      return (resolvedAbsolute ? "/" : "") + resolvedPath || ".";
    },
    relative: (from, to) => {
      from = PATH_FS.resolve(from).slice(1);
      to = PATH_FS.resolve(to).slice(1);
      function trim(arr) {
        var start = 0;
        for (; start < arr.length; start++) if (arr[start] !== "") break;
        var end = arr.length - 1;
        for (; end >= 0; end--) if (arr[end] !== "") break;
        if (start > end) return [];
        return arr.slice(start, end - start + 1);
      }
      var fromParts = trim(from.split("/"));
      var toParts = trim(to.split("/"));
      var length = Math.min(fromParts.length, toParts.length);
      var samePartsLength = length;
      for (var i = 0; i < length; i++) if (fromParts[i] !== toParts[i]) {
        samePartsLength = i;
        break;
      }
      var outputParts = [];
      for (var i = samePartsLength; i < fromParts.length; i++) outputParts.push("..");
      outputParts = outputParts.concat(toParts.slice(samePartsLength));
      return outputParts.join("/");
    }
  };
  var UTF8Decoder = new TextDecoder();
  var findStringEnd = (heapOrArray, idx, maxBytesToRead, ignoreNul) => {
    var maxIdx = idx + maxBytesToRead;
    if (ignoreNul) return maxIdx;
    while (heapOrArray[idx] && !(idx >= maxIdx)) ++idx;
    return idx;
  };
  var UTF8ArrayToString = (heapOrArray, idx = 0, maxBytesToRead, ignoreNul) => {
    var endPtr = findStringEnd(heapOrArray, idx, maxBytesToRead, ignoreNul);
    return UTF8Decoder.decode(heapOrArray.buffer ? heapOrArray.subarray(idx, endPtr) : new Uint8Array(heapOrArray.slice(idx, endPtr)));
  };
  var FS_stdin_getChar_buffer = [];
  var lengthBytesUTF8 = (str) => {
    var len = 0;
    for (var i = 0; i < str.length; ++i) {
      var c = str.charCodeAt(i);
      if (c <= 127) len++;
      else if (c <= 2047) len += 2;
      else if (c >= 55296 && c <= 57343) {
        len += 4;
        ++i;
      } else len += 3;
    }
    return len;
  };
  var stringToUTF8Array = (str, heap, outIdx, maxBytesToWrite) => {
    if (!(maxBytesToWrite > 0)) return 0;
    var startIdx = outIdx;
    var endIdx = outIdx + maxBytesToWrite - 1;
    for (var i = 0; i < str.length; ++i) {
      var u = str.codePointAt(i);
      if (u <= 127) {
        if (outIdx >= endIdx) break;
        heap[outIdx++] = u;
      } else if (u <= 2047) {
        if (outIdx + 1 >= endIdx) break;
        heap[outIdx++] = 192 | u >> 6;
        heap[outIdx++] = 128 | u & 63;
      } else if (u <= 65535) {
        if (outIdx + 2 >= endIdx) break;
        heap[outIdx++] = 224 | u >> 12;
        heap[outIdx++] = 128 | u >> 6 & 63;
        heap[outIdx++] = 128 | u & 63;
      } else {
        if (outIdx + 3 >= endIdx) break;
        heap[outIdx++] = 240 | u >> 18;
        heap[outIdx++] = 128 | u >> 12 & 63;
        heap[outIdx++] = 128 | u >> 6 & 63;
        heap[outIdx++] = 128 | u & 63;
        i++;
      }
    }
    heap[outIdx] = 0;
    return outIdx - startIdx;
  };
  var intArrayFromString = (stringy, dontAddNull, length) => {
    var len = length > 0 ? length : lengthBytesUTF8(stringy) + 1;
    var u8array = new Array(len);
    var numBytesWritten = stringToUTF8Array(stringy, u8array, 0, u8array.length);
    if (dontAddNull) u8array.length = numBytesWritten;
    return u8array;
  };
  var FS_stdin_getChar = () => {
    if (!FS_stdin_getChar_buffer.length) {
      var result = null;
      if (globalThis.window?.prompt) {
        result = window.prompt("Input: ");
        if (result !== null) result += "\n";
      }
      if (!result) return null;
      FS_stdin_getChar_buffer = intArrayFromString(result, true);
    }
    return FS_stdin_getChar_buffer.shift();
  };
  var TTY = {
    ttys: [],
    init() {
    },
    shutdown() {
    },
    register(dev, ops) {
      TTY.ttys[dev] = {
        input: [],
        output: [],
        ops
      };
      FS.registerDevice(dev, TTY.stream_ops);
    },
    stream_ops: {
      open(stream) {
        var tty = TTY.ttys[stream.node.rdev];
        if (!tty) throw new FS.ErrnoError(43);
        stream.tty = tty;
        stream.seekable = false;
      },
      close(stream) {
        stream.tty.ops.fsync(stream.tty);
      },
      fsync(stream) {
        stream.tty.ops.fsync(stream.tty);
      },
      read(stream, buffer, offset, length, pos) {
        if (!stream.tty || !stream.tty.ops.get_char) throw new FS.ErrnoError(60);
        var bytesRead = 0;
        for (var i = 0; i < length; i++) {
          var result;
          try {
            result = stream.tty.ops.get_char(stream.tty);
          } catch (e) {
            throw new FS.ErrnoError(29);
          }
          if (result === void 0 && bytesRead === 0) throw new FS.ErrnoError(6);
          if (result === null || result === void 0) break;
          bytesRead++;
          buffer[offset + i] = result;
        }
        if (bytesRead) stream.node.atime = Date.now();
        return bytesRead;
      },
      write(stream, buffer, offset, length, pos) {
        if (!stream.tty || !stream.tty.ops.put_char) throw new FS.ErrnoError(60);
        try {
          for (var i = 0; i < length; i++) stream.tty.ops.put_char(stream.tty, buffer[offset + i]);
        } catch (e) {
          throw new FS.ErrnoError(29);
        }
        if (length) stream.node.mtime = stream.node.ctime = Date.now();
        return i;
      }
    },
    default_tty_ops: {
      get_char(tty) {
        return FS_stdin_getChar();
      },
      put_char(tty, val) {
        if (val === null || val === 10) {
          out(UTF8ArrayToString(tty.output));
          tty.output = [];
        } else if (val != 0) tty.output.push(val);
      },
      fsync(tty) {
        if (tty.output?.length > 0) {
          out(UTF8ArrayToString(tty.output));
          tty.output = [];
        }
      },
      ioctl_tcgets(tty) {
        return {
          c_iflag: 25856,
          c_oflag: 5,
          c_cflag: 191,
          c_lflag: 35387,
          c_cc: [
            3,
            28,
            127,
            21,
            4,
            0,
            1,
            0,
            17,
            19,
            26,
            0,
            18,
            15,
            23,
            22,
            0,
            0,
            0,
            0,
            0,
            0,
            0,
            0,
            0,
            0,
            0,
            0,
            0,
            0,
            0,
            0
          ]
        };
      },
      ioctl_tcsets(tty, optional_actions, data) {
        return 0;
      },
      ioctl_tiocgwinsz(tty) {
        return [24, 80];
      }
    },
    default_tty1_ops: {
      put_char(tty, val) {
        if (val === null || val === 10) {
          err(UTF8ArrayToString(tty.output));
          tty.output = [];
        } else if (val != 0) tty.output.push(val);
      },
      fsync(tty) {
        if (tty.output?.length > 0) {
          err(UTF8ArrayToString(tty.output));
          tty.output = [];
        }
      }
    }
  };
  var zeroMemory = (ptr, size) => HEAPU8.fill(0, ptr, ptr + size);
  var alignMemory = (size, alignment) => {
    return Math.ceil(size / alignment) * alignment;
  };
  var mmapAlloc = (size) => {
    size = alignMemory(size, 65536);
    var ptr = _emscripten_builtin_memalign(65536, size);
    if (ptr) zeroMemory(ptr, size);
    return ptr;
  };
  var MEMFS = {
    ops_table: null,
    mount(mount) {
      return MEMFS.createNode(null, "/", 16895, 0);
    },
    createNode(parent, name, mode2, dev) {
      if (FS.isBlkdev(mode2) || FS.isFIFO(mode2)) throw new FS.ErrnoError(63);
      MEMFS.ops_table ||= {
        dir: {
          node: {
            getattr: MEMFS.node_ops.getattr,
            setattr: MEMFS.node_ops.setattr,
            lookup: MEMFS.node_ops.lookup,
            mknod: MEMFS.node_ops.mknod,
            rename: MEMFS.node_ops.rename,
            unlink: MEMFS.node_ops.unlink,
            rmdir: MEMFS.node_ops.rmdir,
            readdir: MEMFS.node_ops.readdir,
            symlink: MEMFS.node_ops.symlink
          },
          stream: { llseek: MEMFS.stream_ops.llseek }
        },
        file: {
          node: {
            getattr: MEMFS.node_ops.getattr,
            setattr: MEMFS.node_ops.setattr
          },
          stream: {
            llseek: MEMFS.stream_ops.llseek,
            read: MEMFS.stream_ops.read,
            write: MEMFS.stream_ops.write,
            mmap: MEMFS.stream_ops.mmap,
            msync: MEMFS.stream_ops.msync
          }
        },
        link: {
          node: {
            getattr: MEMFS.node_ops.getattr,
            setattr: MEMFS.node_ops.setattr,
            readlink: MEMFS.node_ops.readlink
          },
          stream: {}
        },
        chrdev: {
          node: {
            getattr: MEMFS.node_ops.getattr,
            setattr: MEMFS.node_ops.setattr
          },
          stream: FS.chrdev_stream_ops
        }
      };
      var node = FS.createNode(parent, name, mode2, dev);
      if (FS.isDir(node.mode)) {
        node.node_ops = MEMFS.ops_table.dir.node;
        node.stream_ops = MEMFS.ops_table.dir.stream;
        node.contents = {};
      } else if (FS.isFile(node.mode)) {
        node.node_ops = MEMFS.ops_table.file.node;
        node.stream_ops = MEMFS.ops_table.file.stream;
        node.usedBytes = 0;
        node.contents = MEMFS.emptyFileContents ??= new Uint8Array(0);
      } else if (FS.isLink(node.mode)) {
        node.node_ops = MEMFS.ops_table.link.node;
        node.stream_ops = MEMFS.ops_table.link.stream;
      } else if (FS.isChrdev(node.mode)) {
        node.node_ops = MEMFS.ops_table.chrdev.node;
        node.stream_ops = MEMFS.ops_table.chrdev.stream;
      }
      node.atime = node.mtime = node.ctime = Date.now();
      if (parent) {
        parent.contents[name] = node;
        parent.atime = parent.mtime = parent.ctime = node.atime;
      }
      return node;
    },
    getFileDataAsTypedArray(node) {
      return node.contents.subarray(0, node.usedBytes);
    },
    expandFileStorage(node, newCapacity) {
      var prevCapacity = node.contents.length;
      if (prevCapacity >= newCapacity) return;
      newCapacity = Math.max(newCapacity, prevCapacity * (prevCapacity < 1024 * 1024 ? 2 : 1.125) >>> 0);
      if (prevCapacity) newCapacity = Math.max(newCapacity, 256);
      var oldContents = MEMFS.getFileDataAsTypedArray(node);
      node.contents = new Uint8Array(newCapacity);
      node.contents.set(oldContents);
    },
    resizeFileStorage(node, newSize) {
      if (node.usedBytes == newSize) return;
      var oldContents = node.contents;
      node.contents = new Uint8Array(newSize);
      node.contents.set(oldContents.subarray(0, Math.min(newSize, node.usedBytes)));
      node.usedBytes = newSize;
    },
    node_ops: {
      getattr(node) {
        var attr = {};
        attr.dev = FS.isChrdev(node.mode) ? node.id : 1;
        attr.ino = node.id;
        attr.mode = node.mode;
        attr.nlink = 1;
        attr.uid = 0;
        attr.gid = 0;
        attr.rdev = node.rdev;
        if (FS.isDir(node.mode)) attr.size = 4096;
        else if (FS.isFile(node.mode)) attr.size = node.usedBytes;
        else if (FS.isLink(node.mode)) attr.size = node.link.length;
        else attr.size = 0;
        attr.atime = new Date(node.atime);
        attr.mtime = new Date(node.mtime);
        attr.ctime = new Date(node.ctime);
        attr.blksize = 4096;
        attr.blocks = Math.ceil(attr.size / attr.blksize);
        return attr;
      },
      setattr(node, attr) {
        for (const key of [
          "mode",
          "atime",
          "mtime",
          "ctime"
        ]) if (attr[key] != null) node[key] = attr[key];
        if (attr.size !== void 0) MEMFS.resizeFileStorage(node, attr.size);
      },
      lookup(parent, name) {
        if (!MEMFS.doesNotExistError) {
          MEMFS.doesNotExistError = new FS.ErrnoError(44);
          MEMFS.doesNotExistError.stack = "<generic error, no stack>";
        }
        throw MEMFS.doesNotExistError;
      },
      mknod(parent, name, mode2, dev) {
        return MEMFS.createNode(parent, name, mode2, dev);
      },
      rename(old_node, new_dir, new_name) {
        var new_node;
        try {
          new_node = FS.lookupNode(new_dir, new_name);
        } catch (e) {
        }
        if (new_node) {
          if (FS.isDir(old_node.mode)) for (var i in new_node.contents) throw new FS.ErrnoError(55);
          FS.hashRemoveNode(new_node);
        }
        delete old_node.parent.contents[old_node.name];
        new_dir.contents[new_name] = old_node;
        old_node.name = new_name;
        new_dir.ctime = new_dir.mtime = old_node.parent.ctime = old_node.parent.mtime = Date.now();
      },
      unlink(parent, name) {
        delete parent.contents[name];
        parent.ctime = parent.mtime = Date.now();
      },
      rmdir(parent, name) {
        for (var i in FS.lookupNode(parent, name).contents) throw new FS.ErrnoError(55);
        delete parent.contents[name];
        parent.ctime = parent.mtime = Date.now();
      },
      readdir(node) {
        return [
          ".",
          "..",
          ...Object.keys(node.contents)
        ];
      },
      symlink(parent, newname, oldpath) {
        var node = MEMFS.createNode(parent, newname, 41471, 0);
        node.link = oldpath;
        return node;
      },
      readlink(node) {
        if (!FS.isLink(node.mode)) throw new FS.ErrnoError(28);
        return node.link;
      }
    },
    stream_ops: {
      read(stream, buffer, offset, length, position) {
        var contents = stream.node.contents;
        if (position >= stream.node.usedBytes) return 0;
        var size = Math.min(stream.node.usedBytes - position, length);
        buffer.set(contents.subarray(position, position + size), offset);
        return size;
      },
      write(stream, buffer, offset, length, position, canOwn) {
        if (buffer.buffer === HEAP8.buffer) canOwn = false;
        if (!length) return 0;
        var node = stream.node;
        node.mtime = node.ctime = Date.now();
        if (canOwn) {
          node.contents = buffer.subarray(offset, offset + length);
          node.usedBytes = length;
        } else if (node.usedBytes === 0 && position === 0) {
          node.contents = buffer.slice(offset, offset + length);
          node.usedBytes = length;
        } else {
          MEMFS.expandFileStorage(node, position + length);
          node.contents.set(buffer.subarray(offset, offset + length), position);
          node.usedBytes = Math.max(node.usedBytes, position + length);
        }
        return length;
      },
      llseek(stream, offset, whence) {
        var position = offset;
        if (whence === 1) position += stream.position;
        else if (whence === 2) {
          if (FS.isFile(stream.node.mode)) position += stream.node.usedBytes;
        }
        if (position < 0) throw new FS.ErrnoError(28);
        return position;
      },
      mmap(stream, length, position, prot, flags) {
        if (!FS.isFile(stream.node.mode)) throw new FS.ErrnoError(43);
        var ptr;
        var allocated;
        var contents = stream.node.contents;
        if (!(flags & 2) && contents.buffer === HEAP8.buffer) {
          allocated = false;
          ptr = contents.byteOffset;
        } else {
          allocated = true;
          ptr = mmapAlloc(length);
          if (!ptr) throw new FS.ErrnoError(48);
          if (contents) {
            if (position > 0 || position + length < contents.length) if (contents.subarray) contents = contents.subarray(position, position + length);
            else contents = Array.prototype.slice.call(contents, position, position + length);
            HEAP8.set(contents, ptr);
          }
        }
        return {
          ptr,
          allocated
        };
      },
      msync(stream, buffer, offset, length, mmapFlags) {
        MEMFS.stream_ops.write(stream, buffer, 0, length, offset, false);
        return 0;
      }
    }
  };
  var FS_modeStringToFlags = (str) => {
    if (typeof str != "string") return str;
    var flags = {
      "r": 0,
      "r+": 2,
      "w": 577,
      "w+": 578,
      "a": 1089,
      "a+": 1090
    }[str];
    if (typeof flags == "undefined") throw new Error(`Unknown file open mode: ${str}`);
    return flags;
  };
  var FS_fileDataToTypedArray = (data) => {
    if (typeof data == "string") data = intArrayFromString(data, true);
    if (!data.subarray) data = new Uint8Array(data);
    return data;
  };
  var FS_getMode = (canRead, canWrite) => {
    var mode2 = 0;
    if (canRead) mode2 |= 365;
    if (canWrite) mode2 |= 146;
    return mode2;
  };
  var asyncLoad = async (url) => {
    var arrayBuffer = await readAsync(url);
    return new Uint8Array(arrayBuffer);
  };
  var FS_createDataFile = (...args) => FS.createDataFile(...args);
  var getUniqueRunDependency = (id) => {
    return id;
  };
  var runDependencies = 0;
  var dependenciesFulfilled = null;
  var removeRunDependency = (id) => {
    runDependencies--;
    Module["monitorRunDependencies"]?.(runDependencies);
    if (runDependencies == 0) {
      if (dependenciesFulfilled) {
        var callback = dependenciesFulfilled;
        dependenciesFulfilled = null;
        callback();
      }
    }
  };
  var addRunDependency = (id) => {
    runDependencies++;
    Module["monitorRunDependencies"]?.(runDependencies);
  };
  var preloadPlugins = [];
  var FS_handledByPreloadPlugin = async (byteArray, fullname) => {
    if (typeof Browser != "undefined") Browser.init();
    for (var plugin of preloadPlugins) if (plugin["canHandle"](fullname)) return plugin["handle"](byteArray, fullname);
    return byteArray;
  };
  var FS_preloadFile = async (parent, name, url, canRead, canWrite, dontCreateFile, canOwn, preFinish) => {
    var fullname = name ? PATH_FS.resolve(PATH.join2(parent, name)) : parent;
    var dep = getUniqueRunDependency(`cp ${fullname}`);
    addRunDependency(dep);
    try {
      var byteArray = url;
      if (typeof url == "string") byteArray = await asyncLoad(url);
      byteArray = await FS_handledByPreloadPlugin(byteArray, fullname);
      preFinish?.();
      if (!dontCreateFile) FS_createDataFile(parent, name, byteArray, canRead, canWrite, canOwn);
    } finally {
      removeRunDependency(dep);
    }
  };
  var FS_createPreloadedFile = (parent, name, url, canRead, canWrite, onload, onerror, dontCreateFile, canOwn, preFinish) => {
    FS_preloadFile(parent, name, url, canRead, canWrite, dontCreateFile, canOwn, preFinish).then(onload).catch(onerror);
  };
  var FS = {
    root: null,
    mounts: [],
    devices: {},
    streams: [],
    nextInode: 1,
    nameTable: null,
    currentPath: "/",
    initialized: false,
    ignorePermissions: true,
    filesystems: null,
    syncFSRequests: 0,
    ErrnoError: class {
      name = "ErrnoError";
      constructor(errno) {
        this.errno = errno;
      }
    },
    FSStream: class {
      shared = {};
      get object() {
        return this.node;
      }
      set object(val) {
        this.node = val;
      }
      get isRead() {
        return (this.flags & 2097155) !== 1;
      }
      get isWrite() {
        return (this.flags & 2097155) !== 0;
      }
      get isAppend() {
        return this.flags & 1024;
      }
      get flags() {
        return this.shared.flags;
      }
      set flags(val) {
        this.shared.flags = val;
      }
      get position() {
        return this.shared.position;
      }
      set position(val) {
        this.shared.position = val;
      }
    },
    FSNode: class {
      node_ops = {};
      stream_ops = {};
      readMode = 365;
      writeMode = 146;
      mounted = null;
      constructor(parent, name, mode2, rdev) {
        if (!parent) parent = this;
        this.parent = parent;
        this.mount = parent.mount;
        this.id = FS.nextInode++;
        this.name = name;
        this.mode = mode2;
        this.rdev = rdev;
        this.atime = this.mtime = this.ctime = Date.now();
      }
      get read() {
        return (this.mode & this.readMode) === this.readMode;
      }
      set read(val) {
        val ? this.mode |= this.readMode : this.mode &= ~this.readMode;
      }
      get write() {
        return (this.mode & this.writeMode) === this.writeMode;
      }
      set write(val) {
        val ? this.mode |= this.writeMode : this.mode &= ~this.writeMode;
      }
      get isFolder() {
        return FS.isDir(this.mode);
      }
      get isDevice() {
        return FS.isChrdev(this.mode);
      }
    },
    lookupPath(path, opts = {}) {
      if (!path) throw new FS.ErrnoError(44);
      opts.follow_mount ??= true;
      if (!PATH.isAbs(path)) path = FS.cwd() + "/" + path;
      linkloop: for (var nlinks = 0; nlinks < 40; nlinks++) {
        var parts = path.split("/").filter((p) => !!p);
        var current = FS.root;
        var current_path = "/";
        for (var i = 0; i < parts.length; i++) {
          var islast = i === parts.length - 1;
          if (islast && opts.parent) break;
          if (parts[i] === ".") continue;
          if (parts[i] === "..") {
            current_path = PATH.dirname(current_path);
            if (FS.isRoot(current)) {
              path = current_path + "/" + parts.slice(i + 1).join("/");
              nlinks--;
              continue linkloop;
            } else current = current.parent;
            continue;
          }
          current_path = PATH.join2(current_path, parts[i]);
          try {
            current = FS.lookupNode(current, parts[i]);
          } catch (e) {
            if (e?.errno === 44 && islast && opts.noent_okay) return { path: current_path };
            throw e;
          }
          if (FS.isMountpoint(current) && (!islast || opts.follow_mount)) current = current.mounted.root;
          if (FS.isLink(current.mode) && (!islast || opts.follow)) {
            if (!current.node_ops.readlink) throw new FS.ErrnoError(52);
            var link = current.node_ops.readlink(current);
            if (!PATH.isAbs(link)) link = PATH.dirname(current_path) + "/" + link;
            path = link + "/" + parts.slice(i + 1).join("/");
            continue linkloop;
          }
        }
        return {
          path: current_path,
          node: current
        };
      }
      throw new FS.ErrnoError(32);
    },
    getPath(node) {
      var path;
      while (true) {
        if (FS.isRoot(node)) {
          var mount = node.mount.mountpoint;
          if (!path) return mount;
          return mount[mount.length - 1] !== "/" ? `${mount}/${path}` : mount + path;
        }
        path = path ? `${node.name}/${path}` : node.name;
        node = node.parent;
      }
    },
    hashName(parentid, name) {
      var hash = 0;
      for (var i = 0; i < name.length; i++) hash = (hash << 5) - hash + name.charCodeAt(i) | 0;
      return (parentid + hash >>> 0) % FS.nameTable.length;
    },
    hashAddNode(node) {
      var hash = FS.hashName(node.parent.id, node.name);
      node.name_next = FS.nameTable[hash];
      FS.nameTable[hash] = node;
    },
    hashRemoveNode(node) {
      var hash = FS.hashName(node.parent.id, node.name);
      if (FS.nameTable[hash] === node) FS.nameTable[hash] = node.name_next;
      else {
        var current = FS.nameTable[hash];
        while (current) {
          if (current.name_next === node) {
            current.name_next = node.name_next;
            break;
          }
          current = current.name_next;
        }
      }
    },
    lookupNode(parent, name) {
      var errCode = FS.mayLookup(parent);
      if (errCode) throw new FS.ErrnoError(errCode);
      var hash = FS.hashName(parent.id, name);
      for (var node = FS.nameTable[hash]; node; node = node.name_next) {
        var nodeName = node.name;
        if (node.parent.id === parent.id && nodeName === name) return node;
      }
      return FS.lookup(parent, name);
    },
    createNode(parent, name, mode2, rdev) {
      var node = new FS.FSNode(parent, name, mode2, rdev);
      FS.hashAddNode(node);
      return node;
    },
    destroyNode(node) {
      FS.hashRemoveNode(node);
    },
    isRoot(node) {
      return node === node.parent;
    },
    isMountpoint(node) {
      return !!node.mounted;
    },
    isFile(mode2) {
      return (mode2 & 61440) === 32768;
    },
    isDir(mode2) {
      return (mode2 & 61440) === 16384;
    },
    isLink(mode2) {
      return (mode2 & 61440) === 40960;
    },
    isChrdev(mode2) {
      return (mode2 & 61440) === 8192;
    },
    isBlkdev(mode2) {
      return (mode2 & 61440) === 24576;
    },
    isFIFO(mode2) {
      return (mode2 & 61440) === 4096;
    },
    isSocket(mode2) {
      return (mode2 & 49152) === 49152;
    },
    flagsToPermissionString(flag) {
      var perms = [
        "r",
        "w",
        "rw"
      ][flag & 3];
      if (flag & 512) perms += "w";
      return perms;
    },
    nodePermissions(node, perms) {
      if (FS.ignorePermissions) return 0;
      if (perms.includes("r") && !(node.mode & 292)) return 2;
      if (perms.includes("w") && !(node.mode & 146)) return 2;
      if (perms.includes("x") && !(node.mode & 73)) return 2;
      return 0;
    },
    mayLookup(dir) {
      if (!FS.isDir(dir.mode)) return 54;
      var errCode = FS.nodePermissions(dir, "x");
      if (errCode) return errCode;
      if (!dir.node_ops.lookup) return 2;
      return 0;
    },
    mayCreate(dir, name) {
      if (!FS.isDir(dir.mode)) return 54;
      try {
        FS.lookupNode(dir, name);
        return 20;
      } catch (e) {
      }
      return FS.nodePermissions(dir, "wx");
    },
    mayDelete(dir, name, isdir) {
      var node;
      try {
        node = FS.lookupNode(dir, name);
      } catch (e) {
        return e.errno;
      }
      var errCode = FS.nodePermissions(dir, "wx");
      if (errCode) return errCode;
      if (isdir) {
        if (!FS.isDir(node.mode)) return 54;
        if (FS.isRoot(node) || FS.getPath(node) === FS.cwd()) return 10;
      } else if (FS.isDir(node.mode)) return 31;
      return 0;
    },
    mayOpen(node, flags) {
      if (!node) return 44;
      if (FS.isLink(node.mode)) return 32;
      var mode2 = FS.flagsToPermissionString(flags);
      if (FS.isDir(node.mode)) {
        if (mode2 !== "r" || flags & 576) return 31;
      }
      return FS.nodePermissions(node, mode2);
    },
    checkOpExists(op, err2) {
      if (!op) throw new FS.ErrnoError(err2);
      return op;
    },
    MAX_OPEN_FDS: 4096,
    nextfd() {
      for (var fd = 0; fd <= FS.MAX_OPEN_FDS; fd++) if (!FS.streams[fd]) return fd;
      throw new FS.ErrnoError(33);
    },
    getStreamChecked(fd) {
      var stream = FS.getStream(fd);
      if (!stream) throw new FS.ErrnoError(8);
      return stream;
    },
    getStream: (fd) => FS.streams[fd],
    createStream(stream, fd = -1) {
      stream = Object.assign(new FS.FSStream(), stream);
      if (fd == -1) fd = FS.nextfd();
      stream.fd = fd;
      FS.streams[fd] = stream;
      return stream;
    },
    closeStream(fd) {
      FS.streams[fd] = null;
    },
    dupStream(origStream, fd = -1) {
      var stream = FS.createStream(origStream, fd);
      stream.stream_ops?.dup?.(stream);
      return stream;
    },
    doSetAttr(stream, node, attr) {
      var setattr = stream?.stream_ops.setattr;
      var arg = setattr ? stream : node;
      setattr ??= node.node_ops.setattr;
      FS.checkOpExists(setattr, 63);
      setattr(arg, attr);
    },
    chrdev_stream_ops: {
      open(stream) {
        stream.stream_ops = FS.getDevice(stream.node.rdev).stream_ops;
        stream.stream_ops.open?.(stream);
      },
      llseek() {
        throw new FS.ErrnoError(70);
      }
    },
    major: (dev) => dev >> 8,
    minor: (dev) => dev & 255,
    makedev: (ma, mi) => ma << 8 | mi,
    registerDevice(dev, ops) {
      FS.devices[dev] = { stream_ops: ops };
    },
    getDevice: (dev) => FS.devices[dev],
    getMounts(mount) {
      var mounts = [];
      var check = [mount];
      while (check.length) {
        var m = check.pop();
        mounts.push(m);
        check.push(...m.mounts);
      }
      return mounts;
    },
    syncfs(populate, callback) {
      if (typeof populate == "function") {
        callback = populate;
        populate = false;
      }
      FS.syncFSRequests++;
      if (FS.syncFSRequests > 1) err(`warning: ${FS.syncFSRequests} FS.syncfs operations in flight at once, probably just doing extra work`);
      var mounts = FS.getMounts(FS.root.mount);
      var completed = 0;
      function doCallback(errCode) {
        FS.syncFSRequests--;
        return callback(errCode);
      }
      function done(errCode) {
        if (errCode) {
          if (!done.errored) {
            done.errored = true;
            return doCallback(errCode);
          }
          return;
        }
        if (++completed >= mounts.length) doCallback(null);
      }
      for (var mount of mounts) if (mount.type.syncfs) mount.type.syncfs(mount, populate, done);
      else done(null);
    },
    mount(type, opts, mountpoint) {
      var root = mountpoint === "/";
      var pseudo = !mountpoint;
      var node;
      if (root && FS.root) throw new FS.ErrnoError(10);
      else if (!root && !pseudo) {
        var lookup = FS.lookupPath(mountpoint, { follow_mount: false });
        mountpoint = lookup.path;
        node = lookup.node;
        if (FS.isMountpoint(node)) throw new FS.ErrnoError(10);
        if (!FS.isDir(node.mode)) throw new FS.ErrnoError(54);
      }
      var mount = {
        type,
        opts,
        mountpoint,
        mounts: []
      };
      var mountRoot = type.mount(mount);
      mountRoot.mount = mount;
      mount.root = mountRoot;
      if (root) FS.root = mountRoot;
      else if (node) {
        node.mounted = mount;
        if (node.mount) node.mount.mounts.push(mount);
      }
      return mountRoot;
    },
    unmount(mountpoint) {
      var lookup = FS.lookupPath(mountpoint, { follow_mount: false });
      if (!FS.isMountpoint(lookup.node)) throw new FS.ErrnoError(28);
      var node = lookup.node;
      var mount = node.mounted;
      var mounts = FS.getMounts(mount);
      for (var [hash, current] of Object.entries(FS.nameTable)) while (current) {
        var next = current.name_next;
        if (mounts.includes(current.mount)) FS.destroyNode(current);
        current = next;
      }
      node.mounted = null;
      var idx = node.mount.mounts.indexOf(mount);
      node.mount.mounts.splice(idx, 1);
    },
    lookup(parent, name) {
      return parent.node_ops.lookup(parent, name);
    },
    mknod(path, mode2, dev) {
      var parent = FS.lookupPath(path, { parent: true }).node;
      var name = PATH.basename(path);
      if (!name) throw new FS.ErrnoError(28);
      if (name === "." || name === "..") throw new FS.ErrnoError(20);
      var errCode = FS.mayCreate(parent, name);
      if (errCode) throw new FS.ErrnoError(errCode);
      if (!parent.node_ops.mknod) throw new FS.ErrnoError(63);
      return parent.node_ops.mknod(parent, name, mode2, dev);
    },
    statfs(path) {
      return FS.statfsNode(FS.lookupPath(path, { follow: true }).node);
    },
    statfsStream(stream) {
      return FS.statfsNode(stream.node);
    },
    statfsNode(node) {
      var rtn = {
        bsize: 4096,
        frsize: 4096,
        blocks: 1e6,
        bfree: 5e5,
        bavail: 5e5,
        files: FS.nextInode,
        ffree: FS.nextInode - 1,
        fsid: 42,
        flags: 2,
        namelen: 255
      };
      if (node.node_ops.statfs) Object.assign(rtn, node.node_ops.statfs(node.mount.opts.root));
      return rtn;
    },
    create(path, mode2 = 438) {
      mode2 &= 4095;
      mode2 |= 32768;
      return FS.mknod(path, mode2, 0);
    },
    mkdir(path, mode2 = 511) {
      mode2 &= 1023;
      mode2 |= 16384;
      return FS.mknod(path, mode2, 0);
    },
    mkdirTree(path, mode2) {
      var dirs = path.split("/");
      var d = "";
      for (var dir of dirs) {
        if (!dir) continue;
        if (d || PATH.isAbs(path)) d += "/";
        d += dir;
        try {
          FS.mkdir(d, mode2);
        } catch (e) {
          if (e.errno != 20) throw e;
        }
      }
    },
    mkdev(path, mode2, dev) {
      if (typeof dev == "undefined") {
        dev = mode2;
        mode2 = 438;
      }
      mode2 |= 8192;
      return FS.mknod(path, mode2, dev);
    },
    symlink(oldpath, newpath) {
      if (!PATH_FS.resolve(oldpath)) throw new FS.ErrnoError(44);
      var parent = FS.lookupPath(newpath, { parent: true }).node;
      if (!parent) throw new FS.ErrnoError(44);
      var newname = PATH.basename(newpath);
      var errCode = FS.mayCreate(parent, newname);
      if (errCode) throw new FS.ErrnoError(errCode);
      if (!parent.node_ops.symlink) throw new FS.ErrnoError(63);
      return parent.node_ops.symlink(parent, newname, oldpath);
    },
    rename(old_path, new_path) {
      var old_dirname = PATH.dirname(old_path);
      var new_dirname = PATH.dirname(new_path);
      var old_name = PATH.basename(old_path);
      var new_name = PATH.basename(new_path);
      var lookup = FS.lookupPath(old_path, { parent: true }), old_dir = lookup.node, new_dir;
      lookup = FS.lookupPath(new_path, { parent: true });
      new_dir = lookup.node;
      if (!old_dir || !new_dir) throw new FS.ErrnoError(44);
      if (old_dir.mount !== new_dir.mount) throw new FS.ErrnoError(75);
      var old_node = FS.lookupNode(old_dir, old_name);
      var relative = PATH_FS.relative(old_path, new_dirname);
      if (relative.charAt(0) !== ".") throw new FS.ErrnoError(28);
      relative = PATH_FS.relative(new_path, old_dirname);
      if (relative.charAt(0) !== ".") throw new FS.ErrnoError(55);
      var new_node;
      try {
        new_node = FS.lookupNode(new_dir, new_name);
      } catch (e) {
      }
      if (old_node === new_node) return;
      var isdir = FS.isDir(old_node.mode);
      var errCode = FS.mayDelete(old_dir, old_name, isdir);
      if (errCode) throw new FS.ErrnoError(errCode);
      errCode = new_node ? FS.mayDelete(new_dir, new_name, isdir) : FS.mayCreate(new_dir, new_name);
      if (errCode) throw new FS.ErrnoError(errCode);
      if (!old_dir.node_ops.rename) throw new FS.ErrnoError(63);
      if (FS.isMountpoint(old_node) || new_node && FS.isMountpoint(new_node)) throw new FS.ErrnoError(10);
      if (new_dir !== old_dir) {
        errCode = FS.nodePermissions(old_dir, "w");
        if (errCode) throw new FS.ErrnoError(errCode);
      }
      FS.hashRemoveNode(old_node);
      try {
        old_dir.node_ops.rename(old_node, new_dir, new_name);
        old_node.parent = new_dir;
      } catch (e) {
        throw e;
      } finally {
        FS.hashAddNode(old_node);
      }
    },
    rmdir(path) {
      var parent = FS.lookupPath(path, { parent: true }).node;
      var name = PATH.basename(path);
      var node = FS.lookupNode(parent, name);
      var errCode = FS.mayDelete(parent, name, true);
      if (errCode) throw new FS.ErrnoError(errCode);
      if (!parent.node_ops.rmdir) throw new FS.ErrnoError(63);
      if (FS.isMountpoint(node)) throw new FS.ErrnoError(10);
      parent.node_ops.rmdir(parent, name);
      FS.destroyNode(node);
    },
    readdir(path) {
      var node = FS.lookupPath(path, { follow: true }).node;
      return FS.checkOpExists(node.node_ops.readdir, 54)(node);
    },
    unlink(path) {
      var parent = FS.lookupPath(path, { parent: true }).node;
      if (!parent) throw new FS.ErrnoError(44);
      var name = PATH.basename(path);
      var node = FS.lookupNode(parent, name);
      var errCode = FS.mayDelete(parent, name, false);
      if (errCode) throw new FS.ErrnoError(errCode);
      if (!parent.node_ops.unlink) throw new FS.ErrnoError(63);
      if (FS.isMountpoint(node)) throw new FS.ErrnoError(10);
      parent.node_ops.unlink(parent, name);
      FS.destroyNode(node);
    },
    readlink(path) {
      var link = FS.lookupPath(path).node;
      if (!link) throw new FS.ErrnoError(44);
      if (!link.node_ops.readlink) throw new FS.ErrnoError(28);
      return link.node_ops.readlink(link);
    },
    stat(path, dontFollow) {
      var node = FS.lookupPath(path, { follow: !dontFollow }).node;
      return FS.checkOpExists(node.node_ops.getattr, 63)(node);
    },
    fstat(fd) {
      var stream = FS.getStreamChecked(fd);
      var node = stream.node;
      var getattr = stream.stream_ops.getattr;
      var arg = getattr ? stream : node;
      getattr ??= node.node_ops.getattr;
      FS.checkOpExists(getattr, 63);
      return getattr(arg);
    },
    lstat(path) {
      return FS.stat(path, true);
    },
    doChmod(stream, node, mode2, dontFollow) {
      FS.doSetAttr(stream, node, {
        mode: mode2 & 4095 | node.mode & -4096,
        ctime: Date.now(),
        dontFollow
      });
    },
    chmod(path, mode2, dontFollow) {
      var node;
      if (typeof path == "string") node = FS.lookupPath(path, { follow: !dontFollow }).node;
      else node = path;
      FS.doChmod(null, node, mode2, dontFollow);
    },
    lchmod(path, mode2) {
      FS.chmod(path, mode2, true);
    },
    fchmod(fd, mode2) {
      var stream = FS.getStreamChecked(fd);
      FS.doChmod(stream, stream.node, mode2, false);
    },
    doChown(stream, node, dontFollow) {
      FS.doSetAttr(stream, node, {
        timestamp: Date.now(),
        dontFollow
      });
    },
    chown(path, uid, gid, dontFollow) {
      var node;
      if (typeof path == "string") node = FS.lookupPath(path, { follow: !dontFollow }).node;
      else node = path;
      FS.doChown(null, node, dontFollow);
    },
    lchown(path, uid, gid) {
      FS.chown(path, uid, gid, true);
    },
    fchown(fd, uid, gid) {
      var stream = FS.getStreamChecked(fd);
      FS.doChown(stream, stream.node, false);
    },
    doTruncate(stream, node, len) {
      if (FS.isDir(node.mode)) throw new FS.ErrnoError(31);
      if (!FS.isFile(node.mode)) throw new FS.ErrnoError(28);
      var errCode = FS.nodePermissions(node, "w");
      if (errCode) throw new FS.ErrnoError(errCode);
      FS.doSetAttr(stream, node, {
        size: len,
        timestamp: Date.now()
      });
    },
    truncate(path, len) {
      if (len < 0) throw new FS.ErrnoError(28);
      var node;
      if (typeof path == "string") node = FS.lookupPath(path, { follow: true }).node;
      else node = path;
      FS.doTruncate(null, node, len);
    },
    ftruncate(fd, len) {
      var stream = FS.getStreamChecked(fd);
      if (len < 0 || (stream.flags & 2097155) === 0) throw new FS.ErrnoError(28);
      FS.doTruncate(stream, stream.node, len);
    },
    utime(path, atime, mtime) {
      var node = FS.lookupPath(path, { follow: true }).node;
      FS.checkOpExists(node.node_ops.setattr, 63)(node, {
        atime,
        mtime
      });
    },
    open(path, flags, mode2 = 438) {
      if (path === "") throw new FS.ErrnoError(44);
      flags = FS_modeStringToFlags(flags);
      if (flags & 64) mode2 = mode2 & 4095 | 32768;
      else mode2 = 0;
      var node;
      var isDirPath;
      if (typeof path == "object") node = path;
      else {
        isDirPath = path.endsWith("/");
        var lookup = FS.lookupPath(path, {
          follow: !(flags & 131072),
          noent_okay: true
        });
        node = lookup.node;
        path = lookup.path;
      }
      var created = false;
      if (flags & 64) if (node) {
        if (flags & 128) throw new FS.ErrnoError(20);
      } else if (isDirPath) throw new FS.ErrnoError(31);
      else {
        node = FS.mknod(path, mode2 | 511, 0);
        created = true;
      }
      if (!node) throw new FS.ErrnoError(44);
      if (FS.isChrdev(node.mode)) flags &= -513;
      if (flags & 65536 && !FS.isDir(node.mode)) throw new FS.ErrnoError(54);
      if (!created) {
        var errCode = FS.mayOpen(node, flags);
        if (errCode) throw new FS.ErrnoError(errCode);
      }
      if (flags & 512 && !created) FS.truncate(node, 0);
      flags &= -131713;
      var stream = FS.createStream({
        node,
        path: FS.getPath(node),
        flags,
        seekable: true,
        position: 0,
        stream_ops: node.stream_ops,
        ungotten: [],
        error: false
      });
      if (stream.stream_ops.open) stream.stream_ops.open(stream);
      if (created) FS.chmod(node, mode2 & 511);
      return stream;
    },
    close(stream) {
      if (FS.isClosed(stream)) throw new FS.ErrnoError(8);
      if (stream.getdents) stream.getdents = null;
      try {
        if (stream.stream_ops.close) stream.stream_ops.close(stream);
      } catch (e) {
        throw e;
      } finally {
        FS.closeStream(stream.fd);
      }
      stream.fd = null;
    },
    isClosed(stream) {
      return stream.fd === null;
    },
    llseek(stream, offset, whence) {
      if (FS.isClosed(stream)) throw new FS.ErrnoError(8);
      if (!stream.seekable || !stream.stream_ops.llseek) throw new FS.ErrnoError(70);
      if (whence != 0 && whence != 1 && whence != 2) throw new FS.ErrnoError(28);
      stream.position = stream.stream_ops.llseek(stream, offset, whence);
      stream.ungotten = [];
      return stream.position;
    },
    read(stream, buffer, offset, length, position) {
      if (length < 0 || position < 0) throw new FS.ErrnoError(28);
      if (FS.isClosed(stream)) throw new FS.ErrnoError(8);
      if ((stream.flags & 2097155) === 1) throw new FS.ErrnoError(8);
      if (FS.isDir(stream.node.mode)) throw new FS.ErrnoError(31);
      if (!stream.stream_ops.read) throw new FS.ErrnoError(28);
      var seeking = typeof position != "undefined";
      if (!seeking) position = stream.position;
      else if (!stream.seekable) throw new FS.ErrnoError(70);
      var bytesRead = stream.stream_ops.read(stream, buffer, offset, length, position);
      if (!seeking) stream.position += bytesRead;
      return bytesRead;
    },
    write(stream, buffer, offset, length, position, canOwn) {
      if (length < 0 || position < 0) throw new FS.ErrnoError(28);
      if (FS.isClosed(stream)) throw new FS.ErrnoError(8);
      if ((stream.flags & 2097155) === 0) throw new FS.ErrnoError(8);
      if (FS.isDir(stream.node.mode)) throw new FS.ErrnoError(31);
      if (!stream.stream_ops.write) throw new FS.ErrnoError(28);
      if (stream.seekable && stream.flags & 1024) FS.llseek(stream, 0, 2);
      var seeking = typeof position != "undefined";
      if (!seeking) position = stream.position;
      else if (!stream.seekable) throw new FS.ErrnoError(70);
      var bytesWritten = stream.stream_ops.write(stream, buffer, offset, length, position, canOwn);
      if (!seeking) stream.position += bytesWritten;
      return bytesWritten;
    },
    mmap(stream, length, position, prot, flags) {
      if ((prot & 2) !== 0 && (flags & 2) === 0 && (stream.flags & 2097155) !== 2) throw new FS.ErrnoError(2);
      if ((stream.flags & 2097155) === 1) throw new FS.ErrnoError(2);
      if (!stream.stream_ops.mmap) throw new FS.ErrnoError(43);
      if (!length) throw new FS.ErrnoError(28);
      return stream.stream_ops.mmap(stream, length, position, prot, flags);
    },
    msync(stream, buffer, offset, length, mmapFlags) {
      if (!stream.stream_ops.msync) return 0;
      return stream.stream_ops.msync(stream, buffer, offset, length, mmapFlags);
    },
    ioctl(stream, cmd, arg) {
      if (!stream.stream_ops.ioctl) throw new FS.ErrnoError(59);
      return stream.stream_ops.ioctl(stream, cmd, arg);
    },
    readFile(path, opts = {}) {
      opts.flags = opts.flags || 0;
      opts.encoding = opts.encoding || "binary";
      if (opts.encoding !== "utf8" && opts.encoding !== "binary") abort(`Invalid encoding type "${opts.encoding}"`);
      var stream = FS.open(path, opts.flags);
      var length = FS.stat(path).size;
      var buf = new Uint8Array(length);
      FS.read(stream, buf, 0, length, 0);
      if (opts.encoding === "utf8") buf = UTF8ArrayToString(buf);
      FS.close(stream);
      return buf;
    },
    writeFile(path, data, opts = {}) {
      opts.flags = opts.flags || 577;
      var stream = FS.open(path, opts.flags, opts.mode);
      data = FS_fileDataToTypedArray(data);
      FS.write(stream, data, 0, data.byteLength, void 0, opts.canOwn);
      FS.close(stream);
    },
    cwd: () => FS.currentPath,
    chdir(path) {
      var lookup = FS.lookupPath(path, { follow: true });
      if (lookup.node === null) throw new FS.ErrnoError(44);
      if (!FS.isDir(lookup.node.mode)) throw new FS.ErrnoError(54);
      var errCode = FS.nodePermissions(lookup.node, "x");
      if (errCode) throw new FS.ErrnoError(errCode);
      FS.currentPath = lookup.path;
    },
    createDefaultDirectories() {
      FS.mkdir("/tmp");
      FS.mkdir("/home");
      FS.mkdir("/home/web_user");
    },
    createDefaultDevices() {
      FS.mkdir("/dev");
      FS.registerDevice(FS.makedev(1, 3), {
        read: () => 0,
        write: (stream, buffer, offset, length, pos) => length,
        llseek: () => 0
      });
      FS.mkdev("/dev/null", FS.makedev(1, 3));
      TTY.register(FS.makedev(5, 0), TTY.default_tty_ops);
      TTY.register(FS.makedev(6, 0), TTY.default_tty1_ops);
      FS.mkdev("/dev/tty", FS.makedev(5, 0));
      FS.mkdev("/dev/tty1", FS.makedev(6, 0));
      var randomBuffer = new Uint8Array(1024), randomLeft = 0;
      var randomByte = () => {
        if (randomLeft === 0) {
          randomFill(randomBuffer);
          randomLeft = randomBuffer.byteLength;
        }
        return randomBuffer[--randomLeft];
      };
      FS.createDevice("/dev", "random", randomByte);
      FS.createDevice("/dev", "urandom", randomByte);
      FS.mkdir("/dev/shm");
      FS.mkdir("/dev/shm/tmp");
    },
    createSpecialDirectories() {
      FS.mkdir("/proc");
      var proc_self = FS.mkdir("/proc/self");
      FS.mkdir("/proc/self/fd");
      FS.mount({ mount() {
        var node = FS.createNode(proc_self, "fd", 16895, 73);
        node.stream_ops = { llseek: MEMFS.stream_ops.llseek };
        node.node_ops = {
          lookup(parent, name) {
            var fd = +name;
            var stream = FS.getStreamChecked(fd);
            var ret = {
              parent: null,
              mount: { mountpoint: "fake" },
              node_ops: { readlink: () => stream.path },
              id: fd + 1
            };
            ret.parent = ret;
            return ret;
          },
          readdir() {
            return Array.from(FS.streams.entries()).filter(([k2, v2]) => v2).map(([k2, v2]) => k2.toString());
          }
        };
        return node;
      } }, {}, "/proc/self/fd");
    },
    createStandardStreams(input, output, error) {
      if (input) FS.createDevice("/dev", "stdin", input);
      else FS.symlink("/dev/tty", "/dev/stdin");
      if (output) FS.createDevice("/dev", "stdout", null, output);
      else FS.symlink("/dev/tty", "/dev/stdout");
      if (error) FS.createDevice("/dev", "stderr", null, error);
      else FS.symlink("/dev/tty1", "/dev/stderr");
      FS.open("/dev/stdin", 0);
      FS.open("/dev/stdout", 1);
      FS.open("/dev/stderr", 1);
    },
    staticInit() {
      FS.nameTable = new Array(4096);
      FS.mount(MEMFS, {}, "/");
      FS.createDefaultDirectories();
      FS.createDefaultDevices();
      FS.createSpecialDirectories();
      FS.filesystems = { "MEMFS": MEMFS };
    },
    init(input, output, error) {
      FS.initialized = true;
      input ??= Module["stdin"];
      output ??= Module["stdout"];
      error ??= Module["stderr"];
      FS.createStandardStreams(input, output, error);
    },
    quit() {
      FS.initialized = false;
      for (var stream of FS.streams) if (stream) FS.close(stream);
    },
    findObject(path, dontResolveLastLink) {
      var ret = FS.analyzePath(path, dontResolveLastLink);
      if (!ret.exists) return null;
      return ret.object;
    },
    analyzePath(path, dontResolveLastLink) {
      try {
        var lookup = FS.lookupPath(path, { follow: !dontResolveLastLink });
        path = lookup.path;
      } catch (e) {
      }
      var ret = {
        isRoot: false,
        exists: false,
        error: 0,
        name: null,
        path: null,
        object: null,
        parentExists: false,
        parentPath: null,
        parentObject: null
      };
      try {
        var lookup = FS.lookupPath(path, { parent: true });
        ret.parentExists = true;
        ret.parentPath = lookup.path;
        ret.parentObject = lookup.node;
        ret.name = PATH.basename(path);
        lookup = FS.lookupPath(path, { follow: !dontResolveLastLink });
        ret.exists = true;
        ret.path = lookup.path;
        ret.object = lookup.node;
        ret.name = lookup.node.name;
        ret.isRoot = lookup.path === "/";
      } catch (e) {
        ret.error = e.errno;
      }
      return ret;
    },
    createPath(parent, path, canRead, canWrite) {
      parent = typeof parent == "string" ? parent : FS.getPath(parent);
      var parts = path.split("/").reverse();
      while (parts.length) {
        var part = parts.pop();
        if (!part) continue;
        var current = PATH.join2(parent, part);
        try {
          FS.mkdir(current);
        } catch (e) {
          if (e.errno != 20) throw e;
        }
        parent = current;
      }
      return current;
    },
    createFile(parent, name, properties, canRead, canWrite) {
      var path = PATH.join2(typeof parent == "string" ? parent : FS.getPath(parent), name);
      var mode2 = FS_getMode(canRead, canWrite);
      return FS.create(path, mode2);
    },
    createDataFile(parent, name, data, canRead, canWrite, canOwn) {
      var path = name;
      if (parent) {
        parent = typeof parent == "string" ? parent : FS.getPath(parent);
        path = name ? PATH.join2(parent, name) : parent;
      }
      var mode2 = FS_getMode(canRead, canWrite);
      var node = FS.create(path, mode2);
      if (data) {
        data = FS_fileDataToTypedArray(data);
        FS.chmod(node, mode2 | 146);
        var stream = FS.open(node, 577);
        FS.write(stream, data, 0, data.length, 0, canOwn);
        FS.close(stream);
        FS.chmod(node, mode2);
      }
    },
    createDevice(parent, name, input, output) {
      var path = PATH.join2(typeof parent == "string" ? parent : FS.getPath(parent), name);
      var mode2 = FS_getMode(!!input, !!output);
      FS.createDevice.major ??= 64;
      var dev = FS.makedev(FS.createDevice.major++, 0);
      FS.registerDevice(dev, {
        open(stream) {
          stream.seekable = false;
        },
        close(stream) {
          if (output?.buffer?.length) output(10);
        },
        read(stream, buffer, offset, length, pos) {
          var bytesRead = 0;
          for (var i = 0; i < length; i++) {
            var result;
            try {
              result = input();
            } catch (e) {
              throw new FS.ErrnoError(29);
            }
            if (result === void 0 && bytesRead === 0) throw new FS.ErrnoError(6);
            if (result === null || result === void 0) break;
            bytesRead++;
            buffer[offset + i] = result;
          }
          if (bytesRead) stream.node.atime = Date.now();
          return bytesRead;
        },
        write(stream, buffer, offset, length, pos) {
          for (var i = 0; i < length; i++) try {
            output(buffer[offset + i]);
          } catch (e) {
            throw new FS.ErrnoError(29);
          }
          if (length) stream.node.mtime = stream.node.ctime = Date.now();
          return i;
        }
      });
      return FS.mkdev(path, mode2, dev);
    },
    forceLoadFile(obj) {
      if (obj.isDevice || obj.isFolder || obj.link || obj.contents) return true;
      if (globalThis.XMLHttpRequest) abort("Lazy loading should have been performed (contents set) in createLazyFile, but it was not. Lazy loading only works in web workers. Use --embed-file or --preload-file in emcc on the main thread.");
      else try {
        obj.contents = readBinary(obj.url);
      } catch (e) {
        throw new FS.ErrnoError(29);
      }
    },
    createLazyFile(parent, name, url, canRead, canWrite) {
      class LazyUint8Array {
        lengthKnown = false;
        chunks = [];
        get(idx) {
          if (idx > this.length - 1 || idx < 0) return;
          var chunkOffset = idx % this.chunkSize;
          var chunkNum = idx / this.chunkSize | 0;
          return this.getter(chunkNum)[chunkOffset];
        }
        setDataGetter(getter) {
          this.getter = getter;
        }
        cacheLength() {
          var xhr = new XMLHttpRequest();
          xhr.open("HEAD", url, false);
          xhr.send(null);
          if (!(xhr.status >= 200 && xhr.status < 300 || xhr.status === 304)) abort("Couldn't load " + url + ". Status: " + xhr.status);
          var datalength = Number(xhr.getResponseHeader("Content-length"));
          var header;
          var hasByteServing = (header = xhr.getResponseHeader("Accept-Ranges")) && header === "bytes";
          var usesGzip = (header = xhr.getResponseHeader("Content-Encoding")) && header === "gzip";
          var chunkSize = 1024 * 1024;
          if (!hasByteServing) chunkSize = datalength;
          var doXHR = (from, to) => {
            if (from > to) abort("invalid range (" + from + ", " + to + ") or no bytes requested!");
            if (to > datalength - 1) abort("only " + datalength + " bytes available! programmer error!");
            var xhr2 = new XMLHttpRequest();
            xhr2.open("GET", url, false);
            if (datalength !== chunkSize) xhr2.setRequestHeader("Range", "bytes=" + from + "-" + to);
            xhr2.responseType = "arraybuffer";
            if (xhr2.overrideMimeType) xhr2.overrideMimeType("text/plain; charset=x-user-defined");
            xhr2.send(null);
            if (!(xhr2.status >= 200 && xhr2.status < 300 || xhr2.status === 304)) abort("Couldn't load " + url + ". Status: " + xhr2.status);
            if (xhr2.response !== void 0) return new Uint8Array(xhr2.response || []);
            return intArrayFromString(xhr2.responseText || "", true);
          };
          var lazyArray = this;
          lazyArray.setDataGetter((chunkNum) => {
            var start = chunkNum * chunkSize;
            var end = (chunkNum + 1) * chunkSize - 1;
            end = Math.min(end, datalength - 1);
            if (typeof lazyArray.chunks[chunkNum] == "undefined") lazyArray.chunks[chunkNum] = doXHR(start, end);
            if (typeof lazyArray.chunks[chunkNum] == "undefined") abort("doXHR failed!");
            return lazyArray.chunks[chunkNum];
          });
          if (usesGzip || !datalength) {
            chunkSize = datalength = 1;
            datalength = this.getter(0).length;
            chunkSize = datalength;
            out("LazyFiles on gzip forces download of the whole file when length is accessed");
          }
          this._length = datalength;
          this._chunkSize = chunkSize;
          this.lengthKnown = true;
        }
        get length() {
          if (!this.lengthKnown) this.cacheLength();
          return this._length;
        }
        get chunkSize() {
          if (!this.lengthKnown) this.cacheLength();
          return this._chunkSize;
        }
      }
      if (globalThis.XMLHttpRequest) {
        if (!ENVIRONMENT_IS_WORKER) abort("Cannot do synchronous binary XHRs outside webworkers in modern browsers. Use --embed-file or --preload-file in emcc");
        var properties = {
          isDevice: false,
          contents: new LazyUint8Array()
        };
      } else var properties = {
        isDevice: false,
        url
      };
      var node = FS.createFile(parent, name, properties, canRead, canWrite);
      if (properties.contents) node.contents = properties.contents;
      else if (properties.url) {
        node.contents = null;
        node.url = properties.url;
      }
      Object.defineProperties(node, { usedBytes: { get: function() {
        return this.contents.length;
      } } });
      var stream_ops = {};
      for (const [key, fn] of Object.entries(node.stream_ops)) stream_ops[key] = (...args) => {
        FS.forceLoadFile(node);
        return fn(...args);
      };
      function writeChunks(stream, buffer, offset, length, position) {
        var contents = stream.node.contents;
        if (position >= contents.length) return 0;
        var size = Math.min(contents.length - position, length);
        if (contents.slice) for (var i = 0; i < size; i++) buffer[offset + i] = contents[position + i];
        else for (var i = 0; i < size; i++) buffer[offset + i] = contents.get(position + i);
        return size;
      }
      stream_ops.read = (stream, buffer, offset, length, position) => {
        FS.forceLoadFile(node);
        return writeChunks(stream, buffer, offset, length, position);
      };
      stream_ops.mmap = (stream, length, position, prot, flags) => {
        FS.forceLoadFile(node);
        var ptr = mmapAlloc(length);
        if (!ptr) throw new FS.ErrnoError(48);
        writeChunks(stream, HEAP8, ptr, length, position);
        return {
          ptr,
          allocated: true
        };
      };
      node.stream_ops = stream_ops;
      return node;
    }
  };
  var UTF8ToString = (ptr, maxBytesToRead, ignoreNul) => {
    if (!ptr) return "";
    var end = findStringEnd(HEAPU8, ptr, maxBytesToRead, ignoreNul);
    return UTF8Decoder.decode(HEAPU8.subarray(ptr, end));
  };
  var SYSCALLS = {
    calculateAt(dirfd, path, allowEmpty) {
      if (PATH.isAbs(path)) return path;
      var dir;
      if (dirfd === -100) dir = FS.cwd();
      else dir = SYSCALLS.getStreamFromFD(dirfd).path;
      if (path.length == 0) {
        if (!allowEmpty) throw new FS.ErrnoError(44);
        return dir;
      }
      return dir + "/" + path;
    },
    writeStat(buf, stat) {
      HEAPU32[buf >> 2] = stat.dev;
      HEAPU32[buf + 4 >> 2] = stat.mode;
      HEAPU32[buf + 8 >> 2] = stat.nlink;
      HEAPU32[buf + 12 >> 2] = stat.uid;
      HEAPU32[buf + 16 >> 2] = stat.gid;
      HEAPU32[buf + 20 >> 2] = stat.rdev;
      HEAP64[buf + 24 >> 3] = BigInt(stat.size);
      HEAP32[buf + 32 >> 2] = 4096;
      HEAP32[buf + 36 >> 2] = stat.blocks;
      var atime = stat.atime.getTime();
      var mtime = stat.mtime.getTime();
      var ctime = stat.ctime.getTime();
      HEAP64[buf + 40 >> 3] = BigInt(Math.floor(atime / 1e3));
      HEAPU32[buf + 48 >> 2] = atime % 1e3 * 1e3 * 1e3;
      HEAP64[buf + 56 >> 3] = BigInt(Math.floor(mtime / 1e3));
      HEAPU32[buf + 64 >> 2] = mtime % 1e3 * 1e3 * 1e3;
      HEAP64[buf + 72 >> 3] = BigInt(Math.floor(ctime / 1e3));
      HEAPU32[buf + 80 >> 2] = ctime % 1e3 * 1e3 * 1e3;
      HEAP64[buf + 88 >> 3] = BigInt(stat.ino);
      return 0;
    },
    writeStatFs(buf, stats) {
      HEAPU32[buf + 4 >> 2] = stats.bsize;
      HEAPU32[buf + 60 >> 2] = stats.bsize;
      HEAP64[buf + 8 >> 3] = BigInt(stats.blocks);
      HEAP64[buf + 16 >> 3] = BigInt(stats.bfree);
      HEAP64[buf + 24 >> 3] = BigInt(stats.bavail);
      HEAP64[buf + 32 >> 3] = BigInt(stats.files);
      HEAP64[buf + 40 >> 3] = BigInt(stats.ffree);
      HEAPU32[buf + 48 >> 2] = stats.fsid;
      HEAPU32[buf + 64 >> 2] = stats.flags;
      HEAPU32[buf + 56 >> 2] = stats.namelen;
    },
    doMsync(addr, stream, len, flags, offset) {
      if (!FS.isFile(stream.node.mode)) throw new FS.ErrnoError(43);
      if (flags & 2) return 0;
      var buffer = HEAPU8.slice(addr, addr + len);
      FS.msync(stream, buffer, offset, len, flags);
    },
    getStreamFromFD(fd) {
      return FS.getStreamChecked(fd);
    },
    varargs: void 0,
    getStr(ptr) {
      return UTF8ToString(ptr);
    }
  };
  function ___syscall_chmod(path, mode2) {
    try {
      path = SYSCALLS.getStr(path);
      FS.chmod(path, mode2);
      return 0;
    } catch (e) {
      if (typeof FS == "undefined" || !(e.name === "ErrnoError")) throw e;
      return -e.errno;
    }
  }
  function ___syscall_faccessat(dirfd, path, amode, flags) {
    try {
      path = SYSCALLS.getStr(path);
      path = SYSCALLS.calculateAt(dirfd, path);
      if (amode & -8) return -28;
      var node = FS.lookupPath(path, { follow: true }).node;
      if (!node) return -44;
      var perms = "";
      if (amode & 4) perms += "r";
      if (amode & 2) perms += "w";
      if (amode & 1) perms += "x";
      if (perms && FS.nodePermissions(node, perms)) return -2;
      return 0;
    } catch (e) {
      if (typeof FS == "undefined" || !(e.name === "ErrnoError")) throw e;
      return -e.errno;
    }
  }
  function ___syscall_fchmod(fd, mode2) {
    try {
      FS.fchmod(fd, mode2);
      return 0;
    } catch (e) {
      if (typeof FS == "undefined" || !(e.name === "ErrnoError")) throw e;
      return -e.errno;
    }
  }
  function ___syscall_fchown32(fd, owner, group) {
    try {
      FS.fchown(fd, owner, group);
      return 0;
    } catch (e) {
      if (typeof FS == "undefined" || !(e.name === "ErrnoError")) throw e;
      return -e.errno;
    }
  }
  var syscallGetVarargI = () => {
    var ret = HEAP32[+SYSCALLS.varargs >> 2];
    SYSCALLS.varargs += 4;
    return ret;
  };
  var syscallGetVarargP = syscallGetVarargI;
  function ___syscall_fcntl64(fd, cmd, varargs) {
    SYSCALLS.varargs = varargs;
    try {
      var stream = SYSCALLS.getStreamFromFD(fd);
      switch (cmd) {
        case 0:
          var arg = syscallGetVarargI();
          if (arg < 0) return -28;
          while (FS.streams[arg]) arg++;
          return FS.dupStream(stream, arg).fd;
        case 1:
        case 2:
          return 0;
        case 3:
          return stream.flags;
        case 4:
          var arg = syscallGetVarargI();
          stream.flags |= arg;
          return 0;
        case 12:
          var arg = syscallGetVarargP();
          var offset = 0;
          HEAP16[arg + offset >> 1] = 2;
          return 0;
        case 13:
        case 14:
          return 0;
      }
      return -28;
    } catch (e) {
      if (typeof FS == "undefined" || !(e.name === "ErrnoError")) throw e;
      return -e.errno;
    }
  }
  function ___syscall_fstat64(fd, buf) {
    try {
      return SYSCALLS.writeStat(buf, FS.fstat(fd));
    } catch (e) {
      if (typeof FS == "undefined" || !(e.name === "ErrnoError")) throw e;
      return -e.errno;
    }
  }
  var INT53_MAX = 9007199254740992;
  var INT53_MIN = -9007199254740992;
  var bigintToI53Checked = (num) => num < INT53_MIN || num > INT53_MAX ? NaN : Number(num);
  function ___syscall_ftruncate64(fd, length) {
    length = bigintToI53Checked(length);
    try {
      if (isNaN(length)) return -61;
      FS.ftruncate(fd, length);
      return 0;
    } catch (e) {
      if (typeof FS == "undefined" || !(e.name === "ErrnoError")) throw e;
      return -e.errno;
    }
  }
  var stringToUTF8 = (str, outPtr, maxBytesToWrite) => {
    return stringToUTF8Array(str, HEAPU8, outPtr, maxBytesToWrite);
  };
  function ___syscall_getcwd(buf, size) {
    try {
      if (size === 0) return -28;
      var cwd = FS.cwd();
      var cwdLengthInBytes = lengthBytesUTF8(cwd) + 1;
      if (size < cwdLengthInBytes) return -68;
      stringToUTF8(cwd, buf, size);
      return cwdLengthInBytes;
    } catch (e) {
      if (typeof FS == "undefined" || !(e.name === "ErrnoError")) throw e;
      return -e.errno;
    }
  }
  function ___syscall_ioctl(fd, op, varargs) {
    SYSCALLS.varargs = varargs;
    try {
      var stream = SYSCALLS.getStreamFromFD(fd);
      switch (op) {
        case 21509:
          if (!stream.tty) return -59;
          return 0;
        case 21505:
          if (!stream.tty) return -59;
          if (stream.tty.ops.ioctl_tcgets) {
            var termios = stream.tty.ops.ioctl_tcgets(stream);
            var argp = syscallGetVarargP();
            HEAP32[argp >> 2] = termios.c_iflag || 0;
            HEAP32[argp + 4 >> 2] = termios.c_oflag || 0;
            HEAP32[argp + 8 >> 2] = termios.c_cflag || 0;
            HEAP32[argp + 12 >> 2] = termios.c_lflag || 0;
            for (var i = 0; i < 32; i++) HEAP8[argp + i + 17] = termios.c_cc[i] || 0;
            return 0;
          }
          return 0;
        case 21510:
        case 21511:
        case 21512:
          if (!stream.tty) return -59;
          return 0;
        case 21506:
        case 21507:
        case 21508:
          if (!stream.tty) return -59;
          if (stream.tty.ops.ioctl_tcsets) {
            var argp = syscallGetVarargP();
            var c_iflag = HEAP32[argp >> 2];
            var c_oflag = HEAP32[argp + 4 >> 2];
            var c_cflag = HEAP32[argp + 8 >> 2];
            var c_lflag = HEAP32[argp + 12 >> 2];
            var c_cc = [];
            for (var i = 0; i < 32; i++) c_cc.push(HEAP8[argp + i + 17]);
            return stream.tty.ops.ioctl_tcsets(stream.tty, op, {
              c_iflag,
              c_oflag,
              c_cflag,
              c_lflag,
              c_cc
            });
          }
          return 0;
        case 21519:
          if (!stream.tty) return -59;
          var argp = syscallGetVarargP();
          HEAP32[argp >> 2] = 0;
          return 0;
        case 21520:
          if (!stream.tty) return -59;
          return -28;
        case 21537:
        case 21531:
          var argp = syscallGetVarargP();
          return FS.ioctl(stream, op, argp);
        case 21523:
          if (!stream.tty) return -59;
          if (stream.tty.ops.ioctl_tiocgwinsz) {
            var winsize = stream.tty.ops.ioctl_tiocgwinsz(stream.tty);
            var argp = syscallGetVarargP();
            HEAP16[argp >> 1] = winsize[0];
            HEAP16[argp + 2 >> 1] = winsize[1];
          }
          return 0;
        case 21524:
          if (!stream.tty) return -59;
          return 0;
        case 21515:
          if (!stream.tty) return -59;
          return 0;
        default:
          return -28;
      }
    } catch (e) {
      if (typeof FS == "undefined" || !(e.name === "ErrnoError")) throw e;
      return -e.errno;
    }
  }
  function ___syscall_lstat64(path, buf) {
    try {
      path = SYSCALLS.getStr(path);
      return SYSCALLS.writeStat(buf, FS.lstat(path));
    } catch (e) {
      if (typeof FS == "undefined" || !(e.name === "ErrnoError")) throw e;
      return -e.errno;
    }
  }
  function ___syscall_mkdirat(dirfd, path, mode2) {
    try {
      path = SYSCALLS.getStr(path);
      path = SYSCALLS.calculateAt(dirfd, path);
      FS.mkdir(path, mode2, 0);
      return 0;
    } catch (e) {
      if (typeof FS == "undefined" || !(e.name === "ErrnoError")) throw e;
      return -e.errno;
    }
  }
  function ___syscall_newfstatat(dirfd, path, buf, flags) {
    try {
      path = SYSCALLS.getStr(path);
      var nofollow = flags & 256;
      var allowEmpty = flags & 4096;
      flags = flags & -6401;
      path = SYSCALLS.calculateAt(dirfd, path, allowEmpty);
      return SYSCALLS.writeStat(buf, nofollow ? FS.lstat(path) : FS.stat(path));
    } catch (e) {
      if (typeof FS == "undefined" || !(e.name === "ErrnoError")) throw e;
      return -e.errno;
    }
  }
  function ___syscall_openat(dirfd, path, flags, varargs) {
    SYSCALLS.varargs = varargs;
    try {
      path = SYSCALLS.getStr(path);
      path = SYSCALLS.calculateAt(dirfd, path);
      var mode2 = varargs ? syscallGetVarargI() : 0;
      return FS.open(path, flags, mode2).fd;
    } catch (e) {
      if (typeof FS == "undefined" || !(e.name === "ErrnoError")) throw e;
      return -e.errno;
    }
  }
  function ___syscall_readlinkat(dirfd, path, buf, bufsize) {
    try {
      path = SYSCALLS.getStr(path);
      path = SYSCALLS.calculateAt(dirfd, path);
      if (bufsize <= 0) return -28;
      var ret = FS.readlink(path);
      var len = Math.min(bufsize, lengthBytesUTF8(ret));
      var endChar = HEAP8[buf + len];
      stringToUTF8(ret, buf, bufsize + 1);
      HEAP8[buf + len] = endChar;
      return len;
    } catch (e) {
      if (typeof FS == "undefined" || !(e.name === "ErrnoError")) throw e;
      return -e.errno;
    }
  }
  function ___syscall_rmdir(path) {
    try {
      path = SYSCALLS.getStr(path);
      FS.rmdir(path);
      return 0;
    } catch (e) {
      if (typeof FS == "undefined" || !(e.name === "ErrnoError")) throw e;
      return -e.errno;
    }
  }
  function ___syscall_stat64(path, buf) {
    try {
      path = SYSCALLS.getStr(path);
      return SYSCALLS.writeStat(buf, FS.stat(path));
    } catch (e) {
      if (typeof FS == "undefined" || !(e.name === "ErrnoError")) throw e;
      return -e.errno;
    }
  }
  function ___syscall_unlinkat(dirfd, path, flags) {
    try {
      path = SYSCALLS.getStr(path);
      path = SYSCALLS.calculateAt(dirfd, path);
      if (!flags) FS.unlink(path);
      else if (flags === 512) FS.rmdir(path);
      else return -28;
      return 0;
    } catch (e) {
      if (typeof FS == "undefined" || !(e.name === "ErrnoError")) throw e;
      return -e.errno;
    }
  }
  var readI53FromI64 = (ptr) => {
    return HEAPU32[ptr >> 2] + HEAP32[ptr + 4 >> 2] * 4294967296;
  };
  function ___syscall_utimensat(dirfd, path, times, flags) {
    try {
      path = SYSCALLS.getStr(path);
      path = SYSCALLS.calculateAt(dirfd, path, true);
      var now = Date.now(), atime, mtime;
      if (!times) {
        atime = now;
        mtime = now;
      } else {
        var seconds = readI53FromI64(times);
        var nanoseconds = HEAP32[times + 8 >> 2];
        if (nanoseconds == 1073741823) atime = now;
        else if (nanoseconds == 1073741822) atime = null;
        else atime = seconds * 1e3 + nanoseconds / (1e3 * 1e3);
        times += 16;
        seconds = readI53FromI64(times);
        nanoseconds = HEAP32[times + 8 >> 2];
        if (nanoseconds == 1073741823) mtime = now;
        else if (nanoseconds == 1073741822) mtime = null;
        else mtime = seconds * 1e3 + nanoseconds / (1e3 * 1e3);
      }
      if ((mtime ?? atime) !== null) FS.utime(path, atime, mtime);
      return 0;
    } catch (e) {
      if (typeof FS == "undefined" || !(e.name === "ErrnoError")) throw e;
      return -e.errno;
    }
  }
  var isLeapYear = (year) => year % 4 === 0 && (year % 100 !== 0 || year % 400 === 0);
  var MONTH_DAYS_LEAP_CUMULATIVE = [
    0,
    31,
    60,
    91,
    121,
    152,
    182,
    213,
    244,
    274,
    305,
    335
  ];
  var MONTH_DAYS_REGULAR_CUMULATIVE = [
    0,
    31,
    59,
    90,
    120,
    151,
    181,
    212,
    243,
    273,
    304,
    334
  ];
  var ydayFromDate = (date) => {
    return (isLeapYear(date.getFullYear()) ? MONTH_DAYS_LEAP_CUMULATIVE : MONTH_DAYS_REGULAR_CUMULATIVE)[date.getMonth()] + date.getDate() - 1;
  };
  function __localtime_js(time, tmPtr) {
    time = bigintToI53Checked(time);
    var date = /* @__PURE__ */ new Date(time * 1e3);
    HEAP32[tmPtr >> 2] = date.getSeconds();
    HEAP32[tmPtr + 4 >> 2] = date.getMinutes();
    HEAP32[tmPtr + 8 >> 2] = date.getHours();
    HEAP32[tmPtr + 12 >> 2] = date.getDate();
    HEAP32[tmPtr + 16 >> 2] = date.getMonth();
    HEAP32[tmPtr + 20 >> 2] = date.getFullYear() - 1900;
    HEAP32[tmPtr + 24 >> 2] = date.getDay();
    var yday = ydayFromDate(date) | 0;
    HEAP32[tmPtr + 28 >> 2] = yday;
    HEAP32[tmPtr + 36 >> 2] = -(date.getTimezoneOffset() * 60);
    var start = new Date(date.getFullYear(), 0, 1);
    var summerOffset = new Date(date.getFullYear(), 6, 1).getTimezoneOffset();
    var winterOffset = start.getTimezoneOffset();
    var dst = (summerOffset != winterOffset && date.getTimezoneOffset() == Math.min(winterOffset, summerOffset)) | 0;
    HEAP32[tmPtr + 32 >> 2] = dst;
  }
  function __mmap_js(len, prot, flags, fd, offset, allocated, addr) {
    offset = bigintToI53Checked(offset);
    try {
      var stream = SYSCALLS.getStreamFromFD(fd);
      var res = FS.mmap(stream, len, offset, prot, flags);
      var ptr = res.ptr;
      HEAP32[allocated >> 2] = res.allocated;
      HEAPU32[addr >> 2] = ptr;
      return 0;
    } catch (e) {
      if (typeof FS == "undefined" || !(e.name === "ErrnoError")) throw e;
      return -e.errno;
    }
  }
  function __munmap_js(addr, len, prot, flags, fd, offset) {
    offset = bigintToI53Checked(offset);
    try {
      var stream = SYSCALLS.getStreamFromFD(fd);
      if (prot & 2) SYSCALLS.doMsync(addr, stream, len, flags, offset);
    } catch (e) {
      if (typeof FS == "undefined" || !(e.name === "ErrnoError")) throw e;
      return -e.errno;
    }
  }
  var __tzset_js = (timezone, daylight, std_name, dst_name) => {
    var currentYear = (/* @__PURE__ */ new Date()).getFullYear();
    var winter = new Date(currentYear, 0, 1);
    var summer = new Date(currentYear, 6, 1);
    var winterOffset = winter.getTimezoneOffset();
    var summerOffset = summer.getTimezoneOffset();
    var stdTimezoneOffset = Math.max(winterOffset, summerOffset);
    HEAPU32[timezone >> 2] = stdTimezoneOffset * 60;
    HEAP32[daylight >> 2] = Number(winterOffset != summerOffset);
    var extractZone = (timezoneOffset) => {
      var sign = timezoneOffset >= 0 ? "-" : "+";
      var absOffset = Math.abs(timezoneOffset);
      return `UTC${sign}${String(Math.floor(absOffset / 60)).padStart(2, "0")}${String(absOffset % 60).padStart(2, "0")}`;
    };
    var winterName = extractZone(winterOffset);
    var summerName = extractZone(summerOffset);
    if (summerOffset < winterOffset) {
      stringToUTF8(winterName, std_name, 17);
      stringToUTF8(summerName, dst_name, 17);
    } else {
      stringToUTF8(winterName, dst_name, 17);
      stringToUTF8(summerName, std_name, 17);
    }
  };
  var _emscripten_get_now = () => performance.now();
  var _emscripten_date_now = () => Date.now();
  var nowIsMonotonic = 1;
  var checkWasiClock = (clock_id) => clock_id >= 0 && clock_id <= 3;
  function _clock_time_get(clk_id, ignored_precision, ptime) {
    ignored_precision = bigintToI53Checked(ignored_precision);
    if (!checkWasiClock(clk_id)) return 28;
    var now;
    if (clk_id === 0) now = _emscripten_date_now();
    else if (nowIsMonotonic) now = _emscripten_get_now();
    else return 52;
    var nsec = Math.round(now * 1e3 * 1e3);
    HEAP64[ptime >> 3] = BigInt(nsec);
    return 0;
  }
  var getHeapMax = () => 2147483648;
  var _emscripten_get_heap_max = () => getHeapMax();
  var growMemory = (size) => {
    var pages = (size - wasmMemory.buffer.byteLength + 65535) / 65536 | 0;
    try {
      wasmMemory.grow(pages);
      updateMemoryViews();
      return 1;
    } catch (e) {
    }
  };
  var _emscripten_resize_heap = (requestedSize) => {
    var oldSize = HEAPU8.length;
    requestedSize >>>= 0;
    var maxHeapSize = getHeapMax();
    if (requestedSize > maxHeapSize) return false;
    for (var cutDown = 1; cutDown <= 4; cutDown *= 2) {
      var overGrownHeapSize = oldSize * (1 + 0.2 / cutDown);
      overGrownHeapSize = Math.min(overGrownHeapSize, requestedSize + 100663296);
      if (growMemory(Math.min(maxHeapSize, alignMemory(Math.max(requestedSize, overGrownHeapSize), 65536)))) return true;
    }
    return false;
  };
  var ENV = {};
  var getExecutableName = () => thisProgram || "./this.program";
  var getEnvStrings = () => {
    if (!getEnvStrings.strings) {
      var env = {
        "USER": "web_user",
        "LOGNAME": "web_user",
        "PATH": "/",
        "PWD": "/",
        "HOME": "/home/web_user",
        "LANG": (globalThis.navigator?.language ?? "C").replace("-", "_") + ".UTF-8",
        "_": getExecutableName()
      };
      for (var x in ENV) if (ENV[x] === void 0) delete env[x];
      else env[x] = ENV[x];
      var strings = [];
      for (var x in env) strings.push(`${x}=${env[x]}`);
      getEnvStrings.strings = strings;
    }
    return getEnvStrings.strings;
  };
  var _environ_get = (__environ, environ_buf) => {
    var bufSize = 0;
    var envp = 0;
    for (var string of getEnvStrings()) {
      var ptr = environ_buf + bufSize;
      HEAPU32[__environ + envp >> 2] = ptr;
      bufSize += stringToUTF8(string, ptr, Infinity) + 1;
      envp += 4;
    }
    return 0;
  };
  var _environ_sizes_get = (penviron_count, penviron_buf_size) => {
    var strings = getEnvStrings();
    HEAPU32[penviron_count >> 2] = strings.length;
    var bufSize = 0;
    for (var string of strings) bufSize += lengthBytesUTF8(string) + 1;
    HEAPU32[penviron_buf_size >> 2] = bufSize;
    return 0;
  };
  function _fd_close(fd) {
    try {
      var stream = SYSCALLS.getStreamFromFD(fd);
      FS.close(stream);
      return 0;
    } catch (e) {
      if (typeof FS == "undefined" || !(e.name === "ErrnoError")) throw e;
      return e.errno;
    }
  }
  function _fd_fdstat_get(fd, pbuf) {
    try {
      var rightsBase = 0;
      var rightsInheriting = 0;
      var flags = 0;
      var stream = SYSCALLS.getStreamFromFD(fd);
      var type = stream.tty ? 2 : FS.isDir(stream.mode) ? 3 : FS.isLink(stream.mode) ? 7 : 4;
      HEAP8[pbuf] = type;
      HEAP16[pbuf + 2 >> 1] = flags;
      HEAP64[pbuf + 8 >> 3] = BigInt(rightsBase);
      HEAP64[pbuf + 16 >> 3] = BigInt(rightsInheriting);
      return 0;
    } catch (e) {
      if (typeof FS == "undefined" || !(e.name === "ErrnoError")) throw e;
      return e.errno;
    }
  }
  var doReadv = (stream, iov, iovcnt, offset) => {
    var ret = 0;
    for (var i = 0; i < iovcnt; i++) {
      var ptr = HEAPU32[iov >> 2];
      var len = HEAPU32[iov + 4 >> 2];
      iov += 8;
      var curr = FS.read(stream, HEAP8, ptr, len, offset);
      if (curr < 0) return -1;
      ret += curr;
      if (curr < len) break;
      if (typeof offset != "undefined") offset += curr;
    }
    return ret;
  };
  function _fd_read(fd, iov, iovcnt, pnum) {
    try {
      var num = doReadv(SYSCALLS.getStreamFromFD(fd), iov, iovcnt);
      HEAPU32[pnum >> 2] = num;
      return 0;
    } catch (e) {
      if (typeof FS == "undefined" || !(e.name === "ErrnoError")) throw e;
      return e.errno;
    }
  }
  function _fd_seek(fd, offset, whence, newOffset) {
    offset = bigintToI53Checked(offset);
    try {
      if (isNaN(offset)) return 61;
      var stream = SYSCALLS.getStreamFromFD(fd);
      FS.llseek(stream, offset, whence);
      HEAP64[newOffset >> 3] = BigInt(stream.position);
      if (stream.getdents && offset === 0 && whence === 0) stream.getdents = null;
      return 0;
    } catch (e) {
      if (typeof FS == "undefined" || !(e.name === "ErrnoError")) throw e;
      return e.errno;
    }
  }
  function _fd_sync(fd) {
    try {
      var stream = SYSCALLS.getStreamFromFD(fd);
      return stream.stream_ops?.fsync?.(stream);
    } catch (e) {
      if (typeof FS == "undefined" || !(e.name === "ErrnoError")) throw e;
      return e.errno;
    }
  }
  var doWritev = (stream, iov, iovcnt, offset) => {
    var ret = 0;
    for (var i = 0; i < iovcnt; i++) {
      var ptr = HEAPU32[iov >> 2];
      var len = HEAPU32[iov + 4 >> 2];
      iov += 8;
      var curr = FS.write(stream, HEAP8, ptr, len, offset);
      if (curr < 0) return -1;
      ret += curr;
      if (curr < len) break;
      if (typeof offset != "undefined") offset += curr;
    }
    return ret;
  };
  function _fd_write(fd, iov, iovcnt, pnum) {
    try {
      var num = doWritev(SYSCALLS.getStreamFromFD(fd), iov, iovcnt);
      HEAPU32[pnum >> 2] = num;
      return 0;
    } catch (e) {
      if (typeof FS == "undefined" || !(e.name === "ErrnoError")) throw e;
      return e.errno;
    }
  }
  FS.createPreloadedFile = FS_createPreloadedFile;
  FS.preloadFile = FS_preloadFile;
  FS.staticInit();
  initMemory();
  if (Module["noExitRuntime"]) Module["noExitRuntime"];
  if (Module["preloadPlugins"]) preloadPlugins = Module["preloadPlugins"];
  if (Module["print"]) out = Module["print"];
  if (Module["printErr"]) err = Module["printErr"];
  if (Module["wasmBinary"]) wasmBinary = Module["wasmBinary"];
  if (Module["arguments"]) Module["arguments"];
  if (Module["thisProgram"]) thisProgram = Module["thisProgram"];
  if (Module["preInit"]) {
    if (typeof Module["preInit"] == "function") Module["preInit"] = [Module["preInit"]];
    while (Module["preInit"].length > 0) Module["preInit"].shift()();
  }
  Module["wasmMemory"] = wasmMemory;
  var _emscripten_builtin_memalign;
  function assignWasmExports(wasmExports2) {
    Module["_sqlite3_status64"] = wasmExports2["sqlite3_status64"];
    Module["_sqlite3_status"] = wasmExports2["sqlite3_status"];
    Module["_sqlite3_db_status64"] = wasmExports2["sqlite3_db_status64"];
    Module["_sqlite3_msize"] = wasmExports2["sqlite3_msize"];
    Module["_sqlite3_db_status"] = wasmExports2["sqlite3_db_status"];
    Module["_sqlite3_vfs_find"] = wasmExports2["sqlite3_vfs_find"];
    Module["_sqlite3_initialize"] = wasmExports2["sqlite3_initialize"];
    Module["_sqlite3_malloc"] = wasmExports2["sqlite3_malloc"];
    Module["_sqlite3_free"] = wasmExports2["sqlite3_free"];
    Module["_sqlite3_vfs_register"] = wasmExports2["sqlite3_vfs_register"];
    Module["_sqlite3_vfs_unregister"] = wasmExports2["sqlite3_vfs_unregister"];
    Module["_sqlite3_malloc64"] = wasmExports2["sqlite3_malloc64"];
    Module["_sqlite3_realloc"] = wasmExports2["sqlite3_realloc"];
    Module["_sqlite3_realloc64"] = wasmExports2["sqlite3_realloc64"];
    Module["_sqlite3_value_text"] = wasmExports2["sqlite3_value_text"];
    Module["_sqlite3_randomness"] = wasmExports2["sqlite3_randomness"];
    Module["_sqlite3_stricmp"] = wasmExports2["sqlite3_stricmp"];
    Module["_sqlite3_strnicmp"] = wasmExports2["sqlite3_strnicmp"];
    Module["_sqlite3_uri_parameter"] = wasmExports2["sqlite3_uri_parameter"];
    Module["_sqlite3_uri_boolean"] = wasmExports2["sqlite3_uri_boolean"];
    Module["_sqlite3_serialize"] = wasmExports2["sqlite3_serialize"];
    Module["_sqlite3_prepare_v2"] = wasmExports2["sqlite3_prepare_v2"];
    Module["_sqlite3_step"] = wasmExports2["sqlite3_step"];
    Module["_sqlite3_column_int64"] = wasmExports2["sqlite3_column_int64"];
    Module["_sqlite3_reset"] = wasmExports2["sqlite3_reset"];
    Module["_sqlite3_exec"] = wasmExports2["sqlite3_exec"];
    Module["_sqlite3_column_int"] = wasmExports2["sqlite3_column_int"];
    Module["_sqlite3_finalize"] = wasmExports2["sqlite3_finalize"];
    Module["_sqlite3_file_control"] = wasmExports2["sqlite3_file_control"];
    Module["_sqlite3_column_name"] = wasmExports2["sqlite3_column_name"];
    Module["_sqlite3_column_text"] = wasmExports2["sqlite3_column_text"];
    Module["_sqlite3_column_type"] = wasmExports2["sqlite3_column_type"];
    Module["_sqlite3_errmsg"] = wasmExports2["sqlite3_errmsg"];
    Module["_sqlite3_deserialize"] = wasmExports2["sqlite3_deserialize"];
    Module["_sqlite3_clear_bindings"] = wasmExports2["sqlite3_clear_bindings"];
    Module["_sqlite3_value_blob"] = wasmExports2["sqlite3_value_blob"];
    Module["_sqlite3_value_bytes"] = wasmExports2["sqlite3_value_bytes"];
    Module["_sqlite3_value_double"] = wasmExports2["sqlite3_value_double"];
    Module["_sqlite3_value_int"] = wasmExports2["sqlite3_value_int"];
    Module["_sqlite3_value_int64"] = wasmExports2["sqlite3_value_int64"];
    Module["_sqlite3_value_subtype"] = wasmExports2["sqlite3_value_subtype"];
    Module["_sqlite3_value_pointer"] = wasmExports2["sqlite3_value_pointer"];
    Module["_sqlite3_value_type"] = wasmExports2["sqlite3_value_type"];
    Module["_sqlite3_value_nochange"] = wasmExports2["sqlite3_value_nochange"];
    Module["_sqlite3_value_frombind"] = wasmExports2["sqlite3_value_frombind"];
    Module["_sqlite3_value_dup"] = wasmExports2["sqlite3_value_dup"];
    Module["_sqlite3_value_free"] = wasmExports2["sqlite3_value_free"];
    Module["_sqlite3_result_blob"] = wasmExports2["sqlite3_result_blob"];
    Module["_sqlite3_result_error_toobig"] = wasmExports2["sqlite3_result_error_toobig"];
    Module["_sqlite3_result_error_nomem"] = wasmExports2["sqlite3_result_error_nomem"];
    Module["_sqlite3_result_double"] = wasmExports2["sqlite3_result_double"];
    Module["_sqlite3_result_error"] = wasmExports2["sqlite3_result_error"];
    Module["_sqlite3_result_int"] = wasmExports2["sqlite3_result_int"];
    Module["_sqlite3_result_int64"] = wasmExports2["sqlite3_result_int64"];
    Module["_sqlite3_result_null"] = wasmExports2["sqlite3_result_null"];
    Module["_sqlite3_result_pointer"] = wasmExports2["sqlite3_result_pointer"];
    Module["_sqlite3_result_subtype"] = wasmExports2["sqlite3_result_subtype"];
    Module["_sqlite3_result_text"] = wasmExports2["sqlite3_result_text"];
    Module["_sqlite3_result_zeroblob"] = wasmExports2["sqlite3_result_zeroblob"];
    Module["_sqlite3_result_zeroblob64"] = wasmExports2["sqlite3_result_zeroblob64"];
    Module["_sqlite3_result_error_code"] = wasmExports2["sqlite3_result_error_code"];
    Module["_sqlite3_user_data"] = wasmExports2["sqlite3_user_data"];
    Module["_sqlite3_context_db_handle"] = wasmExports2["sqlite3_context_db_handle"];
    Module["_sqlite3_vtab_nochange"] = wasmExports2["sqlite3_vtab_nochange"];
    Module["_sqlite3_vtab_in_first"] = wasmExports2["sqlite3_vtab_in_first"];
    Module["_sqlite3_vtab_in_next"] = wasmExports2["sqlite3_vtab_in_next"];
    Module["_sqlite3_aggregate_context"] = wasmExports2["sqlite3_aggregate_context"];
    Module["_sqlite3_get_auxdata"] = wasmExports2["sqlite3_get_auxdata"];
    Module["_sqlite3_set_auxdata"] = wasmExports2["sqlite3_set_auxdata"];
    Module["_sqlite3_column_count"] = wasmExports2["sqlite3_column_count"];
    Module["_sqlite3_data_count"] = wasmExports2["sqlite3_data_count"];
    Module["_sqlite3_column_blob"] = wasmExports2["sqlite3_column_blob"];
    Module["_sqlite3_column_bytes"] = wasmExports2["sqlite3_column_bytes"];
    Module["_sqlite3_column_double"] = wasmExports2["sqlite3_column_double"];
    Module["_sqlite3_column_value"] = wasmExports2["sqlite3_column_value"];
    Module["_sqlite3_column_decltype"] = wasmExports2["sqlite3_column_decltype"];
    Module["_sqlite3_column_database_name"] = wasmExports2["sqlite3_column_database_name"];
    Module["_sqlite3_column_table_name"] = wasmExports2["sqlite3_column_table_name"];
    Module["_sqlite3_column_origin_name"] = wasmExports2["sqlite3_column_origin_name"];
    Module["_sqlite3_bind_blob"] = wasmExports2["sqlite3_bind_blob"];
    Module["_sqlite3_bind_double"] = wasmExports2["sqlite3_bind_double"];
    Module["_sqlite3_bind_int"] = wasmExports2["sqlite3_bind_int"];
    Module["_sqlite3_bind_int64"] = wasmExports2["sqlite3_bind_int64"];
    Module["_sqlite3_bind_null"] = wasmExports2["sqlite3_bind_null"];
    Module["_sqlite3_bind_pointer"] = wasmExports2["sqlite3_bind_pointer"];
    Module["_sqlite3_bind_text"] = wasmExports2["sqlite3_bind_text"];
    Module["_sqlite3_bind_zeroblob"] = wasmExports2["sqlite3_bind_zeroblob"];
    Module["_sqlite3_bind_parameter_count"] = wasmExports2["sqlite3_bind_parameter_count"];
    Module["_sqlite3_bind_parameter_name"] = wasmExports2["sqlite3_bind_parameter_name"];
    Module["_sqlite3_bind_parameter_index"] = wasmExports2["sqlite3_bind_parameter_index"];
    Module["_sqlite3_db_handle"] = wasmExports2["sqlite3_db_handle"];
    Module["_sqlite3_stmt_readonly"] = wasmExports2["sqlite3_stmt_readonly"];
    Module["_sqlite3_stmt_isexplain"] = wasmExports2["sqlite3_stmt_isexplain"];
    Module["_sqlite3_stmt_explain"] = wasmExports2["sqlite3_stmt_explain"];
    Module["_sqlite3_stmt_busy"] = wasmExports2["sqlite3_stmt_busy"];
    Module["_sqlite3_next_stmt"] = wasmExports2["sqlite3_next_stmt"];
    Module["_sqlite3_stmt_status"] = wasmExports2["sqlite3_stmt_status"];
    Module["_sqlite3_sql"] = wasmExports2["sqlite3_sql"];
    Module["_sqlite3_expanded_sql"] = wasmExports2["sqlite3_expanded_sql"];
    Module["_sqlite3_preupdate_old"] = wasmExports2["sqlite3_preupdate_old"];
    Module["_sqlite3_preupdate_count"] = wasmExports2["sqlite3_preupdate_count"];
    Module["_sqlite3_preupdate_depth"] = wasmExports2["sqlite3_preupdate_depth"];
    Module["_sqlite3_preupdate_blobwrite"] = wasmExports2["sqlite3_preupdate_blobwrite"];
    Module["_sqlite3_preupdate_new"] = wasmExports2["sqlite3_preupdate_new"];
    Module["_sqlite3_value_numeric_type"] = wasmExports2["sqlite3_value_numeric_type"];
    Module["_sqlite3_set_authorizer"] = wasmExports2["sqlite3_set_authorizer"];
    Module["_sqlite3_strglob"] = wasmExports2["sqlite3_strglob"];
    Module["_sqlite3_strlike"] = wasmExports2["sqlite3_strlike"];
    Module["_sqlite3_auto_extension"] = wasmExports2["sqlite3_auto_extension"];
    Module["_sqlite3_cancel_auto_extension"] = wasmExports2["sqlite3_cancel_auto_extension"];
    Module["_sqlite3_reset_auto_extension"] = wasmExports2["sqlite3_reset_auto_extension"];
    Module["_sqlite3_prepare_v3"] = wasmExports2["sqlite3_prepare_v3"];
    Module["_sqlite3_create_module"] = wasmExports2["sqlite3_create_module"];
    Module["_sqlite3_create_module_v2"] = wasmExports2["sqlite3_create_module_v2"];
    Module["_sqlite3_drop_modules"] = wasmExports2["sqlite3_drop_modules"];
    Module["_sqlite3_declare_vtab"] = wasmExports2["sqlite3_declare_vtab"];
    Module["_sqlite3_vtab_on_conflict"] = wasmExports2["sqlite3_vtab_on_conflict"];
    Module["_sqlite3_vtab_collation"] = wasmExports2["sqlite3_vtab_collation"];
    Module["_sqlite3_vtab_in"] = wasmExports2["sqlite3_vtab_in"];
    Module["_sqlite3_vtab_rhs_value"] = wasmExports2["sqlite3_vtab_rhs_value"];
    Module["_sqlite3_vtab_distinct"] = wasmExports2["sqlite3_vtab_distinct"];
    Module["_sqlite3_keyword_name"] = wasmExports2["sqlite3_keyword_name"];
    Module["_sqlite3_keyword_count"] = wasmExports2["sqlite3_keyword_count"];
    Module["_sqlite3_keyword_check"] = wasmExports2["sqlite3_keyword_check"];
    Module["_sqlite3_complete"] = wasmExports2["sqlite3_complete"];
    Module["_sqlite3_libversion"] = wasmExports2["sqlite3_libversion"];
    Module["_sqlite3_libversion_number"] = wasmExports2["sqlite3_libversion_number"];
    Module["_sqlite3_shutdown"] = wasmExports2["sqlite3_shutdown"];
    Module["_sqlite3_last_insert_rowid"] = wasmExports2["sqlite3_last_insert_rowid"];
    Module["_sqlite3_set_last_insert_rowid"] = wasmExports2["sqlite3_set_last_insert_rowid"];
    Module["_sqlite3_changes64"] = wasmExports2["sqlite3_changes64"];
    Module["_sqlite3_changes"] = wasmExports2["sqlite3_changes"];
    Module["_sqlite3_total_changes64"] = wasmExports2["sqlite3_total_changes64"];
    Module["_sqlite3_total_changes"] = wasmExports2["sqlite3_total_changes"];
    Module["_sqlite3_txn_state"] = wasmExports2["sqlite3_txn_state"];
    Module["_sqlite3_close_v2"] = wasmExports2["sqlite3_close_v2"];
    Module["_sqlite3_busy_handler"] = wasmExports2["sqlite3_busy_handler"];
    Module["_sqlite3_progress_handler"] = wasmExports2["sqlite3_progress_handler"];
    Module["_sqlite3_busy_timeout"] = wasmExports2["sqlite3_busy_timeout"];
    Module["_sqlite3_interrupt"] = wasmExports2["sqlite3_interrupt"];
    Module["_sqlite3_is_interrupted"] = wasmExports2["sqlite3_is_interrupted"];
    Module["_sqlite3_create_function"] = wasmExports2["sqlite3_create_function"];
    Module["_sqlite3_create_function_v2"] = wasmExports2["sqlite3_create_function_v2"];
    Module["_sqlite3_create_window_function"] = wasmExports2["sqlite3_create_window_function"];
    Module["_sqlite3_overload_function"] = wasmExports2["sqlite3_overload_function"];
    Module["_sqlite3_trace_v2"] = wasmExports2["sqlite3_trace_v2"];
    Module["_sqlite3_commit_hook"] = wasmExports2["sqlite3_commit_hook"];
    Module["_sqlite3_update_hook"] = wasmExports2["sqlite3_update_hook"];
    Module["_sqlite3_rollback_hook"] = wasmExports2["sqlite3_rollback_hook"];
    Module["_sqlite3_preupdate_hook"] = wasmExports2["sqlite3_preupdate_hook"];
    Module["_sqlite3_set_errmsg"] = wasmExports2["sqlite3_set_errmsg"];
    Module["_sqlite3_error_offset"] = wasmExports2["sqlite3_error_offset"];
    Module["_sqlite3_errcode"] = wasmExports2["sqlite3_errcode"];
    Module["_sqlite3_extended_errcode"] = wasmExports2["sqlite3_extended_errcode"];
    Module["_sqlite3_errstr"] = wasmExports2["sqlite3_errstr"];
    Module["_sqlite3_limit"] = wasmExports2["sqlite3_limit"];
    Module["_sqlite3_open"] = wasmExports2["sqlite3_open"];
    Module["_sqlite3_open_v2"] = wasmExports2["sqlite3_open_v2"];
    Module["_sqlite3_create_collation"] = wasmExports2["sqlite3_create_collation"];
    Module["_sqlite3_create_collation_v2"] = wasmExports2["sqlite3_create_collation_v2"];
    Module["_sqlite3_collation_needed"] = wasmExports2["sqlite3_collation_needed"];
    Module["_sqlite3_get_autocommit"] = wasmExports2["sqlite3_get_autocommit"];
    Module["_sqlite3_table_column_metadata"] = wasmExports2["sqlite3_table_column_metadata"];
    Module["_sqlite3_extended_result_codes"] = wasmExports2["sqlite3_extended_result_codes"];
    Module["_sqlite3_uri_key"] = wasmExports2["sqlite3_uri_key"];
    Module["_sqlite3_uri_int64"] = wasmExports2["sqlite3_uri_int64"];
    Module["_sqlite3_db_name"] = wasmExports2["sqlite3_db_name"];
    Module["_sqlite3_db_filename"] = wasmExports2["sqlite3_db_filename"];
    Module["_sqlite3_db_readonly"] = wasmExports2["sqlite3_db_readonly"];
    Module["_sqlite3_compileoption_used"] = wasmExports2["sqlite3_compileoption_used"];
    Module["_sqlite3_compileoption_get"] = wasmExports2["sqlite3_compileoption_get"];
    Module["_sqlite3session_diff"] = wasmExports2["sqlite3session_diff"];
    Module["_sqlite3session_attach"] = wasmExports2["sqlite3session_attach"];
    Module["_sqlite3session_create"] = wasmExports2["sqlite3session_create"];
    Module["_sqlite3session_delete"] = wasmExports2["sqlite3session_delete"];
    Module["_sqlite3session_table_filter"] = wasmExports2["sqlite3session_table_filter"];
    Module["_sqlite3session_changeset"] = wasmExports2["sqlite3session_changeset"];
    Module["_sqlite3session_changeset_strm"] = wasmExports2["sqlite3session_changeset_strm"];
    Module["_sqlite3session_patchset_strm"] = wasmExports2["sqlite3session_patchset_strm"];
    Module["_sqlite3session_patchset"] = wasmExports2["sqlite3session_patchset"];
    Module["_sqlite3session_enable"] = wasmExports2["sqlite3session_enable"];
    Module["_sqlite3session_indirect"] = wasmExports2["sqlite3session_indirect"];
    Module["_sqlite3session_isempty"] = wasmExports2["sqlite3session_isempty"];
    Module["_sqlite3session_memory_used"] = wasmExports2["sqlite3session_memory_used"];
    Module["_sqlite3session_object_config"] = wasmExports2["sqlite3session_object_config"];
    Module["_sqlite3session_changeset_size"] = wasmExports2["sqlite3session_changeset_size"];
    Module["_sqlite3changeset_start"] = wasmExports2["sqlite3changeset_start"];
    Module["_sqlite3changeset_start_v2"] = wasmExports2["sqlite3changeset_start_v2"];
    Module["_sqlite3changeset_start_strm"] = wasmExports2["sqlite3changeset_start_strm"];
    Module["_sqlite3changeset_start_v2_strm"] = wasmExports2["sqlite3changeset_start_v2_strm"];
    Module["_sqlite3changeset_next"] = wasmExports2["sqlite3changeset_next"];
    Module["_sqlite3changeset_op"] = wasmExports2["sqlite3changeset_op"];
    Module["_sqlite3changeset_pk"] = wasmExports2["sqlite3changeset_pk"];
    Module["_sqlite3changeset_old"] = wasmExports2["sqlite3changeset_old"];
    Module["_sqlite3changeset_new"] = wasmExports2["sqlite3changeset_new"];
    Module["_sqlite3changeset_conflict"] = wasmExports2["sqlite3changeset_conflict"];
    Module["_sqlite3changeset_fk_conflicts"] = wasmExports2["sqlite3changeset_fk_conflicts"];
    Module["_sqlite3changeset_finalize"] = wasmExports2["sqlite3changeset_finalize"];
    Module["_sqlite3changeset_invert"] = wasmExports2["sqlite3changeset_invert"];
    Module["_sqlite3changeset_invert_strm"] = wasmExports2["sqlite3changeset_invert_strm"];
    Module["_sqlite3changeset_apply_v2"] = wasmExports2["sqlite3changeset_apply_v2"];
    Module["_sqlite3changeset_apply_v3"] = wasmExports2["sqlite3changeset_apply_v3"];
    Module["_sqlite3changeset_apply"] = wasmExports2["sqlite3changeset_apply"];
    Module["_sqlite3changeset_apply_v3_strm"] = wasmExports2["sqlite3changeset_apply_v3_strm"];
    Module["_sqlite3changeset_apply_v2_strm"] = wasmExports2["sqlite3changeset_apply_v2_strm"];
    Module["_sqlite3changeset_apply_strm"] = wasmExports2["sqlite3changeset_apply_strm"];
    Module["_sqlite3changegroup_new"] = wasmExports2["sqlite3changegroup_new"];
    Module["_sqlite3changegroup_add"] = wasmExports2["sqlite3changegroup_add"];
    Module["_sqlite3changegroup_output"] = wasmExports2["sqlite3changegroup_output"];
    Module["_sqlite3changegroup_add_strm"] = wasmExports2["sqlite3changegroup_add_strm"];
    Module["_sqlite3changegroup_output_strm"] = wasmExports2["sqlite3changegroup_output_strm"];
    Module["_sqlite3changegroup_delete"] = wasmExports2["sqlite3changegroup_delete"];
    Module["_sqlite3changeset_concat"] = wasmExports2["sqlite3changeset_concat"];
    Module["_sqlite3changeset_concat_strm"] = wasmExports2["sqlite3changeset_concat_strm"];
    Module["_sqlite3session_config"] = wasmExports2["sqlite3session_config"];
    Module["_sqlite3_sourceid"] = wasmExports2["sqlite3_sourceid"];
    Module["_sqlite3__wasm_pstack_ptr"] = wasmExports2["sqlite3__wasm_pstack_ptr"];
    Module["_sqlite3__wasm_pstack_restore"] = wasmExports2["sqlite3__wasm_pstack_restore"];
    Module["_sqlite3__wasm_pstack_alloc"] = wasmExports2["sqlite3__wasm_pstack_alloc"];
    Module["_sqlite3__wasm_pstack_remaining"] = wasmExports2["sqlite3__wasm_pstack_remaining"];
    Module["_sqlite3__wasm_pstack_quota"] = wasmExports2["sqlite3__wasm_pstack_quota"];
    Module["_sqlite3__wasm_test_struct"] = wasmExports2["sqlite3__wasm_test_struct"];
    Module["_sqlite3__wasm_enum_json"] = wasmExports2["sqlite3__wasm_enum_json"];
    Module["_sqlite3__wasm_vfs_unlink"] = wasmExports2["sqlite3__wasm_vfs_unlink"];
    Module["_sqlite3__wasm_db_vfs"] = wasmExports2["sqlite3__wasm_db_vfs"];
    Module["_sqlite3__wasm_db_reset"] = wasmExports2["sqlite3__wasm_db_reset"];
    Module["_sqlite3__wasm_db_export_chunked"] = wasmExports2["sqlite3__wasm_db_export_chunked"];
    Module["_sqlite3__wasm_db_serialize"] = wasmExports2["sqlite3__wasm_db_serialize"];
    Module["_sqlite3__wasm_vfs_create_file"] = wasmExports2["sqlite3__wasm_vfs_create_file"];
    Module["_sqlite3__wasm_posix_create_file"] = wasmExports2["sqlite3__wasm_posix_create_file"];
    Module["_sqlite3__wasm_kvvfsMakeKey"] = wasmExports2["sqlite3__wasm_kvvfsMakeKey"];
    Module["_sqlite3__wasm_kvvfs_methods"] = wasmExports2["sqlite3__wasm_kvvfs_methods"];
    Module["_sqlite3__wasm_vtab_config"] = wasmExports2["sqlite3__wasm_vtab_config"];
    Module["_sqlite3__wasm_db_config_ip"] = wasmExports2["sqlite3__wasm_db_config_ip"];
    Module["_sqlite3__wasm_db_config_pii"] = wasmExports2["sqlite3__wasm_db_config_pii"];
    Module["_sqlite3__wasm_db_config_s"] = wasmExports2["sqlite3__wasm_db_config_s"];
    Module["_sqlite3__wasm_config_i"] = wasmExports2["sqlite3__wasm_config_i"];
    Module["_sqlite3__wasm_config_ii"] = wasmExports2["sqlite3__wasm_config_ii"];
    Module["_sqlite3__wasm_config_j"] = wasmExports2["sqlite3__wasm_config_j"];
    Module["_sqlite3__wasm_qfmt_token"] = wasmExports2["sqlite3__wasm_qfmt_token"];
    Module["_sqlite3__wasm_kvvfs_decode"] = wasmExports2["sqlite3__wasm_kvvfs_decode"];
    Module["_sqlite3__wasm_kvvfs_encode"] = wasmExports2["sqlite3__wasm_kvvfs_encode"];
    Module["_sqlite3__wasm_init_wasmfs"] = wasmExports2["sqlite3__wasm_init_wasmfs"];
    Module["_sqlite3__wasm_test_intptr"] = wasmExports2["sqlite3__wasm_test_intptr"];
    Module["_sqlite3__wasm_test_voidptr"] = wasmExports2["sqlite3__wasm_test_voidptr"];
    Module["_sqlite3__wasm_test_int64_max"] = wasmExports2["sqlite3__wasm_test_int64_max"];
    Module["_sqlite3__wasm_test_int64_min"] = wasmExports2["sqlite3__wasm_test_int64_min"];
    Module["_sqlite3__wasm_test_int64_times2"] = wasmExports2["sqlite3__wasm_test_int64_times2"];
    Module["_sqlite3__wasm_test_int64_minmax"] = wasmExports2["sqlite3__wasm_test_int64_minmax"];
    Module["_sqlite3__wasm_test_int64ptr"] = wasmExports2["sqlite3__wasm_test_int64ptr"];
    Module["_sqlite3__wasm_test_stack_overflow"] = wasmExports2["sqlite3__wasm_test_stack_overflow"];
    Module["_sqlite3__wasm_test_str_hello"] = wasmExports2["sqlite3__wasm_test_str_hello"];
    Module["_sqlite3__wasm_SQLTester_strglob"] = wasmExports2["sqlite3__wasm_SQLTester_strglob"];
    Module["_malloc"] = wasmExports2["malloc"];
    Module["_free"] = wasmExports2["free"];
    Module["_realloc"] = wasmExports2["realloc"];
    _emscripten_builtin_memalign = wasmExports2["emscripten_builtin_memalign"];
    wasmExports2["_emscripten_stack_restore"];
    wasmExports2["_emscripten_stack_alloc"];
    wasmExports2["emscripten_stack_get_current"];
    wasmExports2["__indirect_function_table"];
  }
  var wasmImports = {
    __syscall_chmod: ___syscall_chmod,
    __syscall_faccessat: ___syscall_faccessat,
    __syscall_fchmod: ___syscall_fchmod,
    __syscall_fchown32: ___syscall_fchown32,
    __syscall_fcntl64: ___syscall_fcntl64,
    __syscall_fstat64: ___syscall_fstat64,
    __syscall_ftruncate64: ___syscall_ftruncate64,
    __syscall_getcwd: ___syscall_getcwd,
    __syscall_ioctl: ___syscall_ioctl,
    __syscall_lstat64: ___syscall_lstat64,
    __syscall_mkdirat: ___syscall_mkdirat,
    __syscall_newfstatat: ___syscall_newfstatat,
    __syscall_openat: ___syscall_openat,
    __syscall_readlinkat: ___syscall_readlinkat,
    __syscall_rmdir: ___syscall_rmdir,
    __syscall_stat64: ___syscall_stat64,
    __syscall_unlinkat: ___syscall_unlinkat,
    __syscall_utimensat: ___syscall_utimensat,
    _localtime_js: __localtime_js,
    _mmap_js: __mmap_js,
    _munmap_js: __munmap_js,
    _tzset_js: __tzset_js,
    clock_time_get: _clock_time_get,
    emscripten_date_now: _emscripten_date_now,
    emscripten_get_heap_max: _emscripten_get_heap_max,
    emscripten_get_now: _emscripten_get_now,
    emscripten_resize_heap: _emscripten_resize_heap,
    environ_get: _environ_get,
    environ_sizes_get: _environ_sizes_get,
    fd_close: _fd_close,
    fd_fdstat_get: _fd_fdstat_get,
    fd_read: _fd_read,
    fd_seek: _fd_seek,
    fd_sync: _fd_sync,
    fd_write: _fd_write,
    memory: wasmMemory
  };
  function run() {
    if (runDependencies > 0) {
      dependenciesFulfilled = run;
      return;
    }
    preRun();
    if (runDependencies > 0) {
      dependenciesFulfilled = run;
      return;
    }
    function doRun() {
      Module["calledRun"] = true;
      if (ABORT) return;
      initRuntime();
      readyPromiseResolve?.(Module);
      Module["onRuntimeInitialized"]?.();
      postRun();
    }
    if (Module["setStatus"]) {
      Module["setStatus"]("Running...");
      setTimeout(() => {
        setTimeout(() => Module["setStatus"](""), 1);
        doRun();
      }, 1);
    } else doRun();
  }
  var wasmExports = await createWasm();
  run();
  Module.runSQLite3PostLoadInit = async function(sqlite3InitScriptInfo, EmscriptenModule, sqlite3IsUnderTest) {
    "use strict";
    delete EmscriptenModule.runSQLite3PostLoadInit;
    globalThis.sqlite3ApiBootstrap = async function sqlite3ApiBootstrap(apiConfig = globalThis.sqlite3ApiConfig || sqlite3ApiBootstrap.defaultConfig) {
      if (sqlite3ApiBootstrap.sqlite3) {
        (sqlite3ApiBootstrap.sqlite3.config || console).warn("sqlite3ApiBootstrap() called multiple times.", "Config and external initializers are ignored on calls after the first.");
        return sqlite3ApiBootstrap.sqlite3;
      }
      const nu = (...obj) => Object.assign(/* @__PURE__ */ Object.create(null), ...obj);
      const config = nu({
        exports: void 0,
        memory: void 0,
        bigIntEnabled: !!globalThis.BigInt64Array,
        debug: console.debug.bind(console),
        warn: console.warn.bind(console),
        error: console.error.bind(console),
        log: console.log.bind(console),
        wasmfsOpfsDir: "/opfs",
        useStdAlloc: false
      }, apiConfig);
      Object.assign(config, {
        allocExportName: config.useStdAlloc ? "malloc" : "sqlite3_malloc",
        deallocExportName: config.useStdAlloc ? "free" : "sqlite3_free",
        reallocExportName: config.useStdAlloc ? "realloc" : "sqlite3_realloc"
      });
      [
        "exports",
        "memory",
        "functionTable",
        "wasmfsOpfsDir"
      ].forEach((k2) => {
        if ("function" === typeof config[k2]) config[k2] = config[k2]();
      });
      const capi = nu();
      const wasm = nu();
      const __rcStr = (rc) => {
        return capi.sqlite3_js_rc_str && capi.sqlite3_js_rc_str(rc) || "Unknown result code #" + rc;
      };
      const isInt32 = (n) => "number" === typeof n && n === (n | 0) && n <= 2147483647 && n >= -2147483648;
      class SQLite3Error extends Error {
        /**
        Constructs this object with a message depending on its arguments:

        If its first argument is an integer, it is assumed to be
        an SQLITE_... result code and it is passed to
        sqlite3.capi.sqlite3_js_rc_str() to stringify it.

        If called with exactly 2 arguments and the 2nd is an object,
        that object is treated as the 2nd argument to the parent
        constructor.

        The exception's message is created by concatenating its
        arguments with a space between each, except for the
        two-args-with-an-object form and that the first argument will
        get coerced to a string, as described above, if it's an
        integer.

        If passed an integer first argument, the error object's
        `resultCode` member will be set to the given integer value,
        else it will be set to capi.SQLITE_ERROR.
        */
        constructor(...args) {
          let rc;
          if (args.length) if (isInt32(args[0])) {
            rc = args[0];
            if (1 === args.length) super(__rcStr(args[0]));
            else {
              const rcStr = __rcStr(rc);
              if ("object" === typeof args[1]) super(rcStr, args[1]);
              else {
                args[0] = rcStr + ":";
                super(args.join(" "));
              }
            }
          } else if (2 === args.length && "object" === typeof args[1]) super(...args);
          else super(args.join(" "));
          this.resultCode = rc || capi.SQLITE_ERROR;
          this.name = "SQLite3Error";
        }
      }
      SQLite3Error.toss = (...args) => {
        throw new SQLite3Error(...args);
      };
      const toss3 = SQLite3Error.toss;
      if (config.wasmfsOpfsDir && !/^\/[^/]+$/.test(config.wasmfsOpfsDir)) toss3("config.wasmfsOpfsDir must be falsy or in the form '/dir-name'.");
      const bigIntFits64 = function f(b) {
        if (!f._max) {
          f._max = BigInt("0x7fffffffffffffff");
          f._min = ~f._max;
        }
        return b >= f._min && b <= f._max;
      };
      const bigIntFits32 = (b) => b >= -2147483647n - 1n && b <= 2147483647n;
      const bigIntFitsDouble = function f(b) {
        if (!f._min) {
          f._min = Number.MIN_SAFE_INTEGER;
          f._max = Number.MAX_SAFE_INTEGER;
        }
        return b >= f._min && b <= f._max;
      };
      const isTypedArray = (v2) => {
        return v2 && v2.constructor && isInt32(v2.constructor.BYTES_PER_ELEMENT) ? v2 : false;
      };
      const isBindableTypedArray = (v2) => v2 && (v2 instanceof Uint8Array || v2 instanceof Int8Array || v2 instanceof ArrayBuffer);
      const isSQLableTypedArray = (v2) => v2 && (v2 instanceof Uint8Array || v2 instanceof Int8Array || v2 instanceof ArrayBuffer);
      const affirmBindableTypedArray = (v2) => isBindableTypedArray(v2) || toss3("Value is not of a supported TypedArray type.");
      const flexibleString = function(v2) {
        if (isSQLableTypedArray(v2)) return wasm.typedArrayToString(v2 instanceof ArrayBuffer ? new Uint8Array(v2) : v2, 0, v2.length);
        else if (Array.isArray(v2)) return v2.join("");
        else if (wasm.isPtr(v2)) v2 = wasm.cstrToJs(v2);
        return v2;
      };
      class WasmAllocError extends Error {
        /**
        If called with 2 arguments and the 2nd one is an object, it
        behaves like the Error constructor, else it concatenates all
        arguments together with a single space between each to
        construct an error message string. As a special case, if
        called with no arguments then it uses a default error
        message.
        */
        constructor(...args) {
          if (2 === args.length && "object" === typeof args[1]) super(...args);
          else if (args.length) super(args.join(" "));
          else super("Allocation failed.");
          this.resultCode = capi.SQLITE_NOMEM;
          this.name = "WasmAllocError";
        }
      }
      WasmAllocError.toss = (...args) => {
        throw new WasmAllocError(...args);
      };
      Object.assign(capi, {
        sqlite3_bind_blob: void 0,
        sqlite3_bind_text: void 0,
        sqlite3_create_function_v2: (pDb2, funcName, nArg, eTextRep, pApp, xFunc, xStep, xFinal, xDestroy) => {
        },
        sqlite3_create_function: (pDb2, funcName, nArg, eTextRep, pApp, xFunc, xStep, xFinal) => {
        },
        sqlite3_create_window_function: (pDb2, funcName, nArg, eTextRep, pApp, xStep, xFinal, xValue, xInverse, xDestroy) => {
        },
        sqlite3_prepare_v3: (dbPtr, sql, sqlByteLen, prepFlags, stmtPtrPtr, strPtrPtr) => {
        },
        sqlite3_prepare_v2: (dbPtr, sql, sqlByteLen, stmtPtrPtr, strPtrPtr) => {
        },
        sqlite3_exec: (pDb2, sql, callback, pVoid, pErrMsg) => {
        },
        sqlite3_randomness: (n, outPtr) => {
        }
      });
      const util = {
        affirmBindableTypedArray,
        flexibleString,
        bigIntFits32,
        bigIntFits64,
        bigIntFitsDouble,
        isBindableTypedArray,
        isInt32,
        isSQLableTypedArray,
        isTypedArray,
        isUIThread: () => globalThis.window === globalThis && !!globalThis.document,
        toss: function(...args) {
          throw new Error(args.join(" "));
        },
        toss3,
        typedArrayPart: wasm.typedArrayPart,
        nu,
        assert: function(arg, msg) {
          if (!arg) util.toss("Assertion failed:", msg);
        },
        affirmDbHeader: function(bytes) {
          if (bytes instanceof ArrayBuffer) bytes = new Uint8Array(bytes);
          const header = "SQLite format 3";
          if (15 > bytes.byteLength) toss3("Input does not contain an SQLite3 database header.");
          for (let i = 0; i < 15; ++i) if (header.charCodeAt(i) !== bytes[i]) toss3("Input does not contain an SQLite3 database header.");
        },
        affirmIsDb: function(bytes) {
          if (bytes instanceof ArrayBuffer) bytes = new Uint8Array(bytes);
          const n = bytes.byteLength;
          if (n < 512 || n % 512 !== 0) toss3("Byte array size", n, "is invalid for an SQLite3 db.");
          util.affirmDbHeader(bytes);
        }
      };
      Object.assign(wasm, {
        exports: config.exports || toss3("Missing API config.exports (WASM module exports)."),
        memory: config.memory || config.exports["memory"] || toss3("API config object requires a WebAssembly.Memory object", "in either config.exports.memory (exported)", "or config.memory (imported)."),
        pointerSize: "number" === typeof config.exports.sqlite3_libversion() ? 4 : 8,
        bigIntEnabled: !!config.bigIntEnabled,
        functionTable: config.functionTable,
        alloc: void 0,
        realloc: void 0,
        dealloc: void 0
      });
      wasm.allocFromTypedArray = function(srcTypedArray) {
        if (srcTypedArray instanceof ArrayBuffer) srcTypedArray = new Uint8Array(srcTypedArray);
        affirmBindableTypedArray(srcTypedArray);
        const pRet = wasm.alloc(srcTypedArray.byteLength || 1);
        wasm.heapForSize(srcTypedArray.constructor).set(srcTypedArray.byteLength ? srcTypedArray : [0], Number(pRet));
        return pRet;
      };
      {
        const keyAlloc = config.allocExportName, keyDealloc = config.deallocExportName, keyRealloc = config.reallocExportName;
        for (const key of [
          keyAlloc,
          keyDealloc,
          keyRealloc
        ]) if (!(wasm.exports[key] instanceof Function)) toss3("Missing required exports[", key, "] function.");
        wasm.alloc = function f(n) {
          return f.impl(n) || WasmAllocError.toss("Failed to allocate", n, " bytes.");
        };
        wasm.alloc.impl = wasm.exports[keyAlloc];
        wasm.realloc = function f(m, n) {
          const m2 = f.impl(wasm.ptr.coerce(m), n);
          return n ? m2 || WasmAllocError.toss("Failed to reallocate", n, " bytes.") : wasm.ptr.null;
        };
        wasm.realloc.impl = wasm.exports[keyRealloc];
        wasm.dealloc = function f(m) {
          f.impl(wasm.ptr.coerce(m));
        };
        wasm.dealloc.impl = wasm.exports[keyDealloc];
      }
      wasm.compileOptionUsed = function f(optName) {
        if (!arguments.length) {
          if (f._result) return f._result;
          else if (!f._opt) {
            f._rx = /^([^=]+)=(.+)/;
            f._rxInt = /^-?\d+$/;
            f._opt = function(opt, rv) {
              const m = f._rx.exec(opt);
              rv[0] = m ? m[1] : opt;
              rv[1] = m ? f._rxInt.test(m[2]) ? +m[2] : m[2] : true;
            };
          }
          const rc = nu(), ov = [0, 0];
          let i = 0, k2;
          while (k2 = capi.sqlite3_compileoption_get(i++)) {
            f._opt(k2, ov);
            rc[ov[0]] = ov[1];
          }
          return f._result = rc;
        } else if (Array.isArray(optName)) {
          const rc = nu();
          optName.forEach((v2) => {
            rc[v2] = capi.sqlite3_compileoption_used(v2);
          });
          return rc;
        } else if ("object" === typeof optName) {
          Object.keys(optName).forEach((k2) => {
            optName[k2] = capi.sqlite3_compileoption_used(k2);
          });
          return optName;
        }
        return "string" === typeof optName ? !!capi.sqlite3_compileoption_used(optName) : false;
      };
      wasm.pstack = nu({
        restore: wasm.exports.sqlite3__wasm_pstack_restore,
        alloc: function(n) {
          if ("string" === typeof n && !(n = wasm.sizeofIR(n))) WasmAllocError.toss("Invalid value for pstack.alloc(", arguments[0], ")");
          return wasm.exports.sqlite3__wasm_pstack_alloc(n) || WasmAllocError.toss("Could not allocate", n, "bytes from the pstack.");
        },
        allocChunks: function(n, sz) {
          if ("string" === typeof sz && !(sz = wasm.sizeofIR(sz))) WasmAllocError.toss("Invalid size value for allocChunks(", arguments[1], ")");
          const mem = wasm.pstack.alloc(n * sz);
          const rc = [mem];
          let i = 1, offset = sz;
          for (; i < n; ++i, offset += sz) rc.push(wasm.ptr.add(mem, offset));
          return rc;
        },
        allocPtr: (n = 1, safePtrSize = true) => {
          return 1 === n ? wasm.pstack.alloc(safePtrSize ? 8 : wasm.ptr.size) : wasm.pstack.allocChunks(n, safePtrSize ? 8 : wasm.ptr.size);
        },
        call: function(f) {
          const stackPos = wasm.pstack.pointer;
          try {
            return f(sqlite3);
          } finally {
            wasm.pstack.restore(stackPos);
          }
        }
      });
      Object.defineProperties(wasm.pstack, {
        pointer: {
          configurable: false,
          iterable: true,
          writeable: false,
          get: wasm.exports.sqlite3__wasm_pstack_ptr
        },
        quota: {
          configurable: false,
          iterable: true,
          writeable: false,
          get: wasm.exports.sqlite3__wasm_pstack_quota
        },
        remaining: {
          configurable: false,
          iterable: true,
          writeable: false,
          get: wasm.exports.sqlite3__wasm_pstack_remaining
        }
      });
      capi.sqlite3_randomness = (...args) => {
        if (1 === args.length && util.isTypedArray(args[0]) && 1 === args[0].BYTES_PER_ELEMENT) {
          const ta = args[0];
          if (0 === ta.byteLength) {
            wasm.exports.sqlite3_randomness(0, wasm.ptr.null);
            return ta;
          }
          const stack = wasm.pstack.pointer;
          try {
            let n = ta.byteLength, offset = 0;
            const r = wasm.exports.sqlite3_randomness;
            const heap = wasm.heap8u();
            const nAlloc = n < 512 ? n : 512;
            const ptr = wasm.pstack.alloc(nAlloc);
            do {
              const j = n > nAlloc ? nAlloc : n;
              r(j, ptr);
              ta.set(wasm.typedArrayPart(heap, ptr, wasm.ptr.add(ptr, j)), offset);
              n -= j;
              offset += j;
            } while (n > 0);
          } catch (e) {
            config.error("Highly unexpected (and ignored!) exception in sqlite3_randomness():", e);
          } finally {
            wasm.pstack.restore(stack);
          }
          return ta;
        }
        wasm.exports.sqlite3_randomness(...args);
      };
      capi.sqlite3_wasmfs_opfs_dir = function() {
        if (void 0 !== this.dir) return this.dir;
        const pdir = config.wasmfsOpfsDir;
        if (!pdir || !globalThis.FileSystemHandle || !globalThis.FileSystemDirectoryHandle || !globalThis.FileSystemFileHandle || !wasm.exports.sqlite3__wasm_init_wasmfs) return this.dir = "";
        try {
          if (pdir && 0 === wasm.xCallWrapped("sqlite3__wasm_init_wasmfs", "i32", ["string"], pdir)) return this.dir = pdir;
          else return this.dir = "";
        } catch (e) {
          return this.dir = "";
        }
      }.bind(nu());
      capi.sqlite3_wasmfs_filename_is_persistent = function(name) {
        const p = capi.sqlite3_wasmfs_opfs_dir();
        return p && name ? name.startsWith(p + "/") : false;
      };
      capi.sqlite3_js_db_uses_vfs = function(pDb2, vfsName, dbName = 0) {
        try {
          const pK = capi.sqlite3_vfs_find(vfsName);
          if (!pK) return false;
          else if (!pDb2) return pK === capi.sqlite3_vfs_find(0) ? pK : false;
          else return pK === capi.sqlite3_js_db_vfs(pDb2, dbName) ? pK : false;
        } catch (e) {
          return false;
        }
      };
      capi.sqlite3_js_vfs_list = function() {
        const rc = [];
        let pVfs = capi.sqlite3_vfs_find(wasm.ptr.null);
        while (pVfs) {
          const oVfs = new capi.sqlite3_vfs(pVfs);
          rc.push(wasm.cstrToJs(oVfs.$zName));
          pVfs = oVfs.$pNext;
          oVfs.dispose();
        }
        return rc;
      };
      capi.sqlite3_js_db_export = function(pDb2, schema = 0) {
        pDb2 = wasm.xWrap.testConvertArg("sqlite3*", pDb2);
        if (!pDb2) toss3("Invalid sqlite3* argument.");
        if (!wasm.bigIntEnabled) toss3("BigInt support is not enabled.");
        const scope = wasm.scopedAllocPush();
        let pOut;
        try {
          const pSize = wasm.scopedAlloc(8 + wasm.ptr.size);
          const ppOut = wasm.ptr.add(pSize, 8);
          const zSchema = schema ? wasm.isPtr(schema) ? schema : wasm.scopedAllocCString("" + schema) : wasm.ptr.null;
          let rc = wasm.exports.sqlite3__wasm_db_serialize(pDb2, zSchema, ppOut, pSize, 0);
          if (rc) toss3("Database serialization failed with code", sqlite3.capi.sqlite3_js_rc_str(rc));
          pOut = wasm.peekPtr(ppOut);
          const nOut = wasm.peek(pSize, "i64");
          rc = nOut ? wasm.heap8u().slice(Number(pOut), Number(pOut) + Number(nOut)) : new Uint8Array();
          return rc;
        } finally {
          if (pOut) wasm.exports.sqlite3_free(pOut);
          wasm.scopedAllocPop(scope);
        }
      };
      capi.sqlite3_js_db_vfs = (dbPointer, dbName = wasm.ptr.null) => util.sqlite3__wasm_db_vfs(dbPointer, dbName);
      capi.sqlite3_js_aggregate_context = (pCtx, n) => {
        return capi.sqlite3_aggregate_context(pCtx, n) || (n ? WasmAllocError.toss("Cannot allocate", n, "bytes for sqlite3_aggregate_context()") : 0);
      };
      capi.sqlite3_js_posix_create_file = function(filename, data, dataLen) {
        let pData;
        if (data && wasm.isPtr(data)) pData = data;
        else if (data instanceof ArrayBuffer || data instanceof Uint8Array) {
          pData = wasm.allocFromTypedArray(data);
          if (arguments.length < 3 || !util.isInt32(dataLen) || dataLen < 0) dataLen = data.byteLength;
        } else SQLite3Error.toss("Invalid 2nd argument for sqlite3_js_posix_create_file().");
        try {
          if (!util.isInt32(dataLen) || dataLen < 0) SQLite3Error.toss("Invalid 3rd argument for sqlite3_js_posix_create_file().");
          const rc = util.sqlite3__wasm_posix_create_file(filename, pData, dataLen);
          if (rc) SQLite3Error.toss("Creation of file failed with sqlite3 result code", capi.sqlite3_js_rc_str(rc));
        } finally {
          if (pData && pData !== data) wasm.dealloc(pData);
        }
      };
      capi.sqlite3_js_vfs_create_file = function(vfs, filename, data, dataLen) {
        config.warn("sqlite3_js_vfs_create_file() is deprecated and", "should be avoided because it can lead to C-level crashes.", "See its documentation for alternatives.");
        let pData;
        if (data) if (wasm.isPtr(data)) pData = data;
        else {
          if (data instanceof ArrayBuffer) data = new Uint8Array(data);
          if (data instanceof Uint8Array) {
            pData = wasm.allocFromTypedArray(data);
            if (arguments.length < 4 || !util.isInt32(dataLen) || dataLen < 0) dataLen = data.byteLength;
          } else SQLite3Error.toss("Invalid 3rd argument type for sqlite3_js_vfs_create_file().");
        }
        else pData = 0;
        if (!util.isInt32(dataLen) || dataLen < 0) {
          if (pData && pData !== data) wasm.dealloc(pData);
          SQLite3Error.toss("Invalid 4th argument for sqlite3_js_vfs_create_file().");
        }
        try {
          const rc = util.sqlite3__wasm_vfs_create_file(vfs, filename, pData, dataLen);
          if (rc) SQLite3Error.toss("Creation of file failed with sqlite3 result code", capi.sqlite3_js_rc_str(rc));
        } finally {
          if (pData && pData !== data) wasm.dealloc(pData);
        }
      };
      capi.sqlite3_js_sql_to_string = (sql) => {
        if ("string" === typeof sql) return sql;
        const x = flexibleString(v);
        return x === v ? void 0 : x;
      };
      capi.sqlite3_db_config = function(pDb2, op, ...args) {
        switch (op) {
          case capi.SQLITE_DBCONFIG_ENABLE_FKEY:
          case capi.SQLITE_DBCONFIG_ENABLE_TRIGGER:
          case capi.SQLITE_DBCONFIG_ENABLE_FTS3_TOKENIZER:
          case capi.SQLITE_DBCONFIG_ENABLE_LOAD_EXTENSION:
          case capi.SQLITE_DBCONFIG_NO_CKPT_ON_CLOSE:
          case capi.SQLITE_DBCONFIG_ENABLE_QPSG:
          case capi.SQLITE_DBCONFIG_TRIGGER_EQP:
          case capi.SQLITE_DBCONFIG_RESET_DATABASE:
          case capi.SQLITE_DBCONFIG_DEFENSIVE:
          case capi.SQLITE_DBCONFIG_WRITABLE_SCHEMA:
          case capi.SQLITE_DBCONFIG_LEGACY_ALTER_TABLE:
          case capi.SQLITE_DBCONFIG_DQS_DML:
          case capi.SQLITE_DBCONFIG_DQS_DDL:
          case capi.SQLITE_DBCONFIG_ENABLE_VIEW:
          case capi.SQLITE_DBCONFIG_LEGACY_FILE_FORMAT:
          case capi.SQLITE_DBCONFIG_TRUSTED_SCHEMA:
          case capi.SQLITE_DBCONFIG_STMT_SCANSTATUS:
          case capi.SQLITE_DBCONFIG_REVERSE_SCANORDER:
          case capi.SQLITE_DBCONFIG_ENABLE_ATTACH_CREATE:
          case capi.SQLITE_DBCONFIG_ENABLE_ATTACH_WRITE:
          case capi.SQLITE_DBCONFIG_ENABLE_COMMENTS:
          case capi.SQLITE_DBCONFIG_FP_DIGITS:
            if (!this.ip) this.ip = wasm.xWrap("sqlite3__wasm_db_config_ip", "int", [
              "sqlite3*",
              "int",
              "int",
              "*"
            ]);
            return this.ip(pDb2, op, args[0], args[1] || 0);
          case capi.SQLITE_DBCONFIG_LOOKASIDE:
            if (!this.pii) this.pii = wasm.xWrap("sqlite3__wasm_db_config_pii", "int", [
              "sqlite3*",
              "int",
              "*",
              "int",
              "int"
            ]);
            return this.pii(pDb2, op, args[0], args[1], args[2]);
          case capi.SQLITE_DBCONFIG_MAINDBNAME:
            if (!this.s) this.s = wasm.xWrap("sqlite3__wasm_db_config_s", "int", [
              "sqlite3*",
              "int",
              "string:static"
            ]);
            return this.s(pDb2, op, args[0]);
          default:
            return capi.SQLITE_MISUSE;
        }
      }.bind(nu());
      capi.sqlite3_value_to_js = function(pVal, throwIfCannotConvert = true) {
        let arg;
        const valType = capi.sqlite3_value_type(pVal);
        switch (valType) {
          case capi.SQLITE_INTEGER:
            if (wasm.bigIntEnabled) {
              arg = capi.sqlite3_value_int64(pVal);
              if (util.bigIntFitsDouble(arg)) arg = Number(arg);
            } else arg = capi.sqlite3_value_double(pVal);
            break;
          case capi.SQLITE_FLOAT:
            arg = capi.sqlite3_value_double(pVal);
            break;
          case capi.SQLITE_TEXT:
            arg = capi.sqlite3_value_text(pVal);
            break;
          case capi.SQLITE_BLOB: {
            const n = capi.sqlite3_value_bytes(pVal);
            const pBlob = capi.sqlite3_value_blob(pVal);
            if (n && !pBlob) sqlite3.WasmAllocError.toss("Cannot allocate memory for blob argument of", n, "byte(s)");
            arg = n ? wasm.heap8u().slice(Number(pBlob), Number(pBlob) + Number(n)) : null;
            break;
          }
          case capi.SQLITE_NULL:
            arg = null;
            break;
          default:
            if (throwIfCannotConvert) toss3(capi.SQLITE_MISMATCH, "Unhandled sqlite3_value_type():", valType);
            arg = void 0;
        }
        return arg;
      };
      capi.sqlite3_values_to_js = function(argc, pArgv, throwIfCannotConvert = true) {
        let i;
        const tgt = [];
        for (i = 0; i < argc; ++i)
          tgt.push(capi.sqlite3_value_to_js(wasm.peekPtr(wasm.ptr.add(pArgv, wasm.ptr.size * i)), throwIfCannotConvert));
        return tgt;
      };
      capi.sqlite3_result_error_js = function(pCtx, e) {
        if (e instanceof WasmAllocError) capi.sqlite3_result_error_nomem(pCtx);
        else capi.sqlite3_result_error(pCtx, "" + e, -1);
      };
      capi.sqlite3_result_js = function(pCtx, val) {
        if (val instanceof Error) {
          capi.sqlite3_result_error_js(pCtx, val);
          return;
        }
        try {
          switch (typeof val) {
            case "undefined":
              break;
            case "boolean":
              capi.sqlite3_result_int(pCtx, val ? 1 : 0);
              break;
            case "bigint":
              if (util.bigIntFits32(val)) capi.sqlite3_result_int(pCtx, Number(val));
              else if (util.bigIntFitsDouble(val)) capi.sqlite3_result_double(pCtx, Number(val));
              else if (wasm.bigIntEnabled) if (util.bigIntFits64(val)) capi.sqlite3_result_int64(pCtx, val);
              else toss3("BigInt value", val.toString(), "is too BigInt for int64.");
              else toss3("BigInt value", val.toString(), "is too BigInt.");
              break;
            case "number": {
              let f;
              if (util.isInt32(val)) f = capi.sqlite3_result_int;
              else if (wasm.bigIntEnabled && Number.isInteger(val) && util.bigIntFits64(BigInt(val))) f = capi.sqlite3_result_int64;
              else f = capi.sqlite3_result_double;
              f(pCtx, val);
              break;
            }
            case "string": {
              const [p, n] = wasm.allocCString(val, true);
              capi.sqlite3_result_text(pCtx, p, n, capi.SQLITE_WASM_DEALLOC);
              break;
            }
            case "object":
              if (null === val) {
                capi.sqlite3_result_null(pCtx);
                break;
              } else if (util.isBindableTypedArray(val)) {
                const pBlob = wasm.allocFromTypedArray(val);
                capi.sqlite3_result_blob(pCtx, pBlob, val.byteLength, capi.SQLITE_WASM_DEALLOC);
                break;
              }
            default:
              toss3("Don't not how to handle this UDF result value:", typeof val, val);
          }
        } catch (e) {
          capi.sqlite3_result_error_js(pCtx, e);
        }
      };
      capi.sqlite3_column_js = function(pStmt, iCol, throwIfCannotConvert = true) {
        const v2 = capi.sqlite3_column_value(pStmt, iCol);
        return 0 === v2 ? void 0 : capi.sqlite3_value_to_js(v2, throwIfCannotConvert);
      };
      {
        const __newOldValue = function(pObj, iCol, impl) {
          impl = capi[impl];
          if (!this.ptr) this.ptr = wasm.allocPtr();
          else wasm.pokePtr(this.ptr, 0);
          const rc = impl(pObj, iCol, this.ptr);
          if (rc) return SQLite3Error.toss(rc, arguments[2] + "() failed with code " + rc);
          const pv = wasm.peekPtr(this.ptr);
          return pv ? capi.sqlite3_value_to_js(pv, true) : void 0;
        }.bind(nu());
        capi.sqlite3_preupdate_new_js = (pDb2, iCol) => __newOldValue(pDb2, iCol, "sqlite3_preupdate_new");
        capi.sqlite3_preupdate_old_js = (pDb2, iCol) => __newOldValue(pDb2, iCol, "sqlite3_preupdate_old");
        capi.sqlite3changeset_new_js = (pChangesetIter, iCol) => __newOldValue(pChangesetIter, iCol, "sqlite3changeset_new");
        capi.sqlite3changeset_old_js = (pChangesetIter, iCol) => __newOldValue(pChangesetIter, iCol, "sqlite3changeset_old");
      }
      capi.sqlite3_js_retry_busy = function(maxTimes, callback, beforeRetry) {
        for (let n = 1; n <= maxTimes; ++n) try {
          if (beforeRetry && n > 1) beforeRetry(n);
          const rc = callback();
          if (capi.SQLITE_BUSY === rc) {
            if (n === maxTimes) throw new SQLite3Error(rc, [
              "sqlite3_js_retry_busy() max retry attempts (",
              maxTimes,
              ") reached."
            ].join(""));
            continue;
          }
          return rc;
        } catch (e) {
          if (n < maxTimes && e instanceof SQLite3Error && e.resultCode === capi.SQLITE_BUSY) continue;
          throw e;
        }
      };
      const sqlite3 = {
        WasmAllocError,
        SQLite3Error,
        capi,
        util,
        wasm,
        config,
        version: nu(),
        client: void 0,
        asyncPostInit: async function ff() {
          if (ff.isReady instanceof Promise) return ff.isReady;
          let lia = this.initializersAsync;
          delete this.initializersAsync;
          const postInit = async () => {
            if (!sqlite3.__isUnderTest) {
              delete sqlite3.util;
              delete sqlite3.StructBinder;
              delete sqlite3.opfs;
            }
            return sqlite3;
          };
          const catcher = (e) => {
            config.error("an async sqlite3 initializer failed:", e);
            throw e;
          };
          if (!lia || !lia.length) return ff.isReady = postInit().catch(catcher);
          lia = lia.map((f) => {
            return f instanceof Function ? async (x) => f(sqlite3) : f;
          });
          lia.push(postInit);
          let p = Promise.resolve(sqlite3);
          while (lia.length) p = p.then(lia.shift());
          return ff.isReady = p.catch(catcher);
        }.bind(sqlite3ApiBootstrap),
        scriptInfo: void 0
      };
      if ("undefined" !== typeof sqlite3IsUnderTest) sqlite3.__isUnderTest = !!sqlite3IsUnderTest;
      try {
        sqlite3ApiBootstrap.initializers.forEach((f) => {
          f(sqlite3);
        });
      } catch (e) {
        console.error("sqlite3 bootstrap initializer threw:", e);
        throw e;
      }
      delete sqlite3ApiBootstrap.initializers;
      sqlite3ApiBootstrap.sqlite3 = sqlite3;
      if ("undefined" !== typeof sqlite3InitScriptInfo) {
        sqlite3InitScriptInfo.debugModule("sqlite3ApiBootstrap() complete", sqlite3);
        sqlite3.scriptInfo = sqlite3InitScriptInfo;
      }
      if (sqlite3.__isUnderTest) {
        if ("undefined" !== typeof EmscriptenModule) sqlite3.config.emscripten = EmscriptenModule;
        const iw = sqlite3.scriptInfo?.instantiateWasm;
        if (iw) {
          sqlite3.wasm.module = iw.module;
          sqlite3.wasm.instance = iw.instance;
          sqlite3.wasm.imports = iw.imports;
        }
      }
      delete globalThis.sqlite3ApiConfig;
      delete globalThis.sqlite3ApiBootstrap;
      delete sqlite3ApiBootstrap.defaultConfig;
      return sqlite3.asyncPostInit().then((s) => {
        if ("undefined" !== typeof sqlite3InitScriptInfo) sqlite3InitScriptInfo.debugModule("sqlite3.asyncPostInit() complete", s);
        delete s.asyncPostInit;
        delete s.scriptInfo;
        delete s.emscripten;
        return s;
      });
    };
    globalThis.sqlite3ApiBootstrap.initializers = [];
    globalThis.sqlite3ApiBootstrap.initializersAsync = [];
    globalThis.sqlite3ApiBootstrap.defaultConfig = /* @__PURE__ */ Object.create(null);
    globalThis.sqlite3ApiBootstrap.sqlite3 = void 0;
    globalThis.sqlite3ApiBootstrap.initializers.push(function(sqlite3) {
      sqlite3.version = {
        "libVersion": "3.53.0",
        "libVersionNumber": 3053e3,
        "sourceId": "2026-04-09 11:41:38 4525003a53a7fc63ca75c59b22c79608659ca12f0131f52c18637f829977f20b",
        "downloadVersion": 353e4,
        "scm": {
          "sha3-256": "4525003a53a7fc63ca75c59b22c79608659ca12f0131f52c18637f829977f20b",
          "branch": "trunk",
          "tags": "release major-release version-3.53.0",
          "datetime": "2026-04-09T11:41:38.498Z"
        }
      };
    });
    globalThis.WhWasmUtilInstaller = function WhWasmUtilInstaller(target) {
      "use strict";
      if (void 0 === target.bigIntEnabled) target.bigIntEnabled = !!globalThis["BigInt64Array"];
      const toss = (...args) => {
        throw new Error(args.join(" "));
      };
      if (!target.pointerSize && !target.pointerIR && target.alloc && target.dealloc) {
        const ptr = target.alloc(1);
        target.pointerSize = "bigint" === typeof ptr ? 8 : 4;
        target.dealloc(ptr);
      }
      if (target.pointerSize && !target.pointerIR) target.pointerIR = 4 === target.pointerSize ? "i32" : "i64";
      const __ptrIR = target.pointerIR ??= "i32";
      const __ptrSize = target.pointerSize ??= "i32" === __ptrIR ? 4 : "i64" === __ptrIR ? 8 : 0;
      delete target.pointerSize;
      delete target.pointerIR;
      if ("i32" !== __ptrIR && "i64" !== __ptrIR) toss("Invalid pointerIR:", __ptrIR);
      else if (8 !== __ptrSize && 4 !== __ptrSize) toss("Invalid pointerSize:", __ptrSize);
      const __BigInt = target.bigIntEnabled ? (v2) => BigInt(v2 || 0) : (v2) => toss("BigInt support is disabled in this build.");
      const __Number = (v2) => Number(v2 || 0);
      const __asPtrType = 4 === __ptrSize ? __Number : __BigInt;
      const __NullPtr = __asPtrType(0);
      const __ptrAdd = function(...args) {
        let rc = __asPtrType(0);
        for (const v2 of args) rc += __asPtrType(v2);
        return rc;
      };
      {
        const __ptr = /* @__PURE__ */ Object.create(null);
        Object.defineProperty(target, "ptr", {
          enumerable: true,
          get: () => __ptr,
          set: () => toss("The ptr property is read-only.")
        });
        (function f(name, val) {
          Object.defineProperty(__ptr, name, {
            enumerable: true,
            get: () => val,
            set: () => toss("ptr[" + name + "] is read-only.")
          });
          return f;
        })("null", __NullPtr)("size", __ptrSize)("ir", __ptrIR)("coerce", __asPtrType)("add", __ptrAdd)("addn", 4 === __ptrIR ? __ptrAdd : (...args) => Number(__ptrAdd(...args)));
      }
      if (!target.exports) Object.defineProperty(target, "exports", {
        enumerable: true,
        configurable: true,
        get: () => target.instance?.exports
      });
      const cache = /* @__PURE__ */ Object.create(null);
      cache.heapSize = 0;
      cache.memory = null;
      cache.freeFuncIndexes = [];
      cache.scopedAlloc = [];
      cache.scopedAlloc.pushPtr = (ptr) => {
        cache.scopedAlloc[cache.scopedAlloc.length - 1].push(ptr);
        return ptr;
      };
      cache.utf8Decoder = new TextDecoder();
      cache.utf8Encoder = new TextEncoder("utf-8");
      target.sizeofIR = (n) => {
        switch (n) {
          case "i8":
            return 1;
          case "i16":
            return 2;
          case "i32":
          case "f32":
          case "float":
            return 4;
          case "i64":
          case "f64":
          case "double":
            return 8;
          case "*":
            return __ptrSize;
          default:
            return ("" + n).endsWith("*") ? __ptrSize : void 0;
        }
      };
      const heapWrappers = function() {
        if (!cache.memory) cache.memory = target.memory instanceof WebAssembly.Memory ? target.memory : target.exports.memory;
        else if (cache.heapSize === cache.memory.buffer.byteLength) return cache;
        const b = cache.memory.buffer;
        cache.HEAP8 = new Int8Array(b);
        cache.HEAP8U = new Uint8Array(b);
        cache.HEAP16 = new Int16Array(b);
        cache.HEAP16U = new Uint16Array(b);
        cache.HEAP32 = new Int32Array(b);
        cache.HEAP32U = new Uint32Array(b);
        cache.HEAP32F = new Float32Array(b);
        cache.HEAP64F = new Float64Array(b);
        if (target.bigIntEnabled) if ("undefined" !== typeof BigInt64Array) {
          cache.HEAP64 = new BigInt64Array(b);
          cache.HEAP64U = new BigUint64Array(b);
        } else toss("BigInt support is enabled, but the BigInt64Array type is missing.");
        cache.heapSize = b.byteLength;
        return cache;
      };
      target.heap8 = () => heapWrappers().HEAP8;
      target.heap8u = () => heapWrappers().HEAP8U;
      target.heap16 = () => heapWrappers().HEAP16;
      target.heap16u = () => heapWrappers().HEAP16U;
      target.heap32 = () => heapWrappers().HEAP32;
      target.heap32u = () => heapWrappers().HEAP32U;
      target.heapForSize = function(n, unsigned = true) {
        const c = cache.memory && cache.heapSize === cache.memory.buffer.byteLength ? cache : heapWrappers();
        switch (n) {
          case Int8Array:
            return c.HEAP8;
          case Uint8Array:
            return c.HEAP8U;
          case Int16Array:
            return c.HEAP16;
          case Uint16Array:
            return c.HEAP16U;
          case Int32Array:
            return c.HEAP32;
          case Uint32Array:
            return c.HEAP32U;
          case 8:
            return unsigned ? c.HEAP8U : c.HEAP8;
          case 16:
            return unsigned ? c.HEAP16U : c.HEAP16;
          case 32:
            return unsigned ? c.HEAP32U : c.HEAP32;
          case 64:
            if (c.HEAP64) return unsigned ? c.HEAP64U : c.HEAP64;
            break;
          default:
            if (target.bigIntEnabled) {
              if (n === globalThis["BigUint64Array"]) return c.HEAP64U;
              else if (n === globalThis["BigInt64Array"]) return c.HEAP64;
              break;
            }
        }
        toss("Invalid heapForSize() size: expecting 8, 16, 32,", "or (if BigInt is enabled) 64.");
      };
      const __funcTable = target.functionTable;
      delete target.functionTable;
      target.functionTable = __funcTable ? () => __funcTable : () => target.exports.__indirect_function_table;
      target.functionEntry = function(fptr) {
        const ft = target.functionTable();
        return fptr < ft.length ? ft.get(__asPtrType(fptr)) : void 0;
      };
      target.jsFuncToWasm = function f(func, sig) {
        if (!f._) f._ = {
          sigTypes: Object.assign(/* @__PURE__ */ Object.create(null), {
            i: "i32",
            p: __ptrIR,
            P: __ptrIR,
            s: __ptrIR,
            j: "i64",
            f: "f32",
            d: "f64"
          }),
          typeCodes: Object.assign(/* @__PURE__ */ Object.create(null), {
            f64: 124,
            f32: 125,
            i64: 126,
            i32: 127
          }),
          uleb128Encode: (tgt, method, n) => {
            if (n < 128) tgt[method](n);
            else tgt[method](n % 128 | 128, n >> 7);
          },
          rxJSig: /^(\w)\((\w*)\)$/,
          sigParams: (sig2) => {
            const m = f._.rxJSig.exec(sig2);
            return m ? m[2] : sig2.substr(1);
          },
          letterType: (x) => f._.sigTypes[x] || toss("Invalid signature letter:", x),
          pushSigType: (dest, letter) => dest.push(f._.typeCodes[f._.letterType(letter)])
        };
        if ("string" === typeof func) {
          const x = sig;
          sig = func;
          func = x;
        }
        const _ = f._;
        const sigParams = _.sigParams(sig);
        const wasmCode = [1, 96];
        _.uleb128Encode(wasmCode, "push", sigParams.length);
        for (const x of sigParams) _.pushSigType(wasmCode, x);
        if ("v" === sig[0]) wasmCode.push(0);
        else {
          wasmCode.push(1);
          _.pushSigType(wasmCode, sig[0]);
        }
        _.uleb128Encode(wasmCode, "unshift", wasmCode.length);
        wasmCode.unshift(0, 97, 115, 109, 1, 0, 0, 0, 1);
        wasmCode.push(2, 7, 1, 1, 101, 1, 102, 0, 0, 7, 5, 1, 1, 102, 0, 0);
        return new WebAssembly.Instance(new WebAssembly.Module(new Uint8Array(wasmCode)), { e: { f: func } }).exports["f"];
      };
      const __installFunction = function f(func, sig, scoped) {
        if (scoped && !cache.scopedAlloc.length) toss("No scopedAllocPush() scope is active.");
        if ("string" === typeof func) {
          const x = sig;
          sig = func;
          func = x;
        }
        if ("string" !== typeof sig || !(func instanceof Function)) toss("Invalid arguments: expecting (function,signature) or (signature,function).");
        const ft = target.functionTable();
        const oldLen = __asPtrType(ft.length);
        let ptr;
        while (ptr = cache.freeFuncIndexes.pop()) if (ft.get(ptr)) {
          ptr = null;
          continue;
        } else break;
        if (!ptr) {
          ptr = __asPtrType(oldLen);
          ft.grow(__asPtrType(1));
        }
        try {
          ft.set(ptr, func);
          if (scoped) cache.scopedAlloc.pushPtr(ptr);
          return ptr;
        } catch (e) {
          if (!(e instanceof TypeError)) {
            if (ptr === oldLen) cache.freeFuncIndexes.push(oldLen);
            throw e;
          }
        }
        try {
          const fptr = target.jsFuncToWasm(func, sig);
          ft.set(ptr, fptr);
          if (scoped) cache.scopedAlloc.pushPtr(ptr);
        } catch (e) {
          if (ptr === oldLen) cache.freeFuncIndexes.push(oldLen);
          throw e;
        }
        return ptr;
      };
      target.installFunction = (func, sig) => __installFunction(func, sig, false);
      target.scopedInstallFunction = (func, sig) => __installFunction(func, sig, true);
      target.uninstallFunction = function(ptr) {
        if (!ptr && __NullPtr !== ptr) return void 0;
        const ft = target.functionTable();
        cache.freeFuncIndexes.push(ptr);
        const rc = ft.get(ptr);
        ft.set(ptr, null);
        return rc;
      };
      target.peek = function f(ptr, type = "i8") {
        if (type.endsWith("*")) type = __ptrIR;
        const c = cache.memory && cache.heapSize === cache.memory.buffer.byteLength ? cache : heapWrappers();
        const list = Array.isArray(ptr) ? [] : void 0;
        let rc;
        do {
          if (list) ptr = arguments[0].shift();
          switch (type) {
            case "i1":
            case "i8":
              rc = c.HEAP8[Number(ptr) >> 0];
              break;
            case "i16":
              rc = c.HEAP16[Number(ptr) >> 1];
              break;
            case "i32":
              rc = c.HEAP32[Number(ptr) >> 2];
              break;
            case "float":
            case "f32":
              rc = c.HEAP32F[Number(ptr) >> 2];
              break;
            case "double":
            case "f64":
              rc = Number(c.HEAP64F[Number(ptr) >> 3]);
              break;
            case "i64":
              if (c.HEAP64) {
                rc = __BigInt(c.HEAP64[Number(ptr) >> 3]);
                break;
              }
            default:
              toss("Invalid type for peek():", type);
          }
          if (list) list.push(rc);
        } while (list && arguments[0].length);
        return list || rc;
      };
      target.poke = function(ptr, value, type = "i8") {
        if (type.endsWith("*")) type = __ptrIR;
        const c = cache.memory && cache.heapSize === cache.memory.buffer.byteLength ? cache : heapWrappers();
        for (const p of Array.isArray(ptr) ? ptr : [ptr]) switch (type) {
          case "i1":
          case "i8":
            c.HEAP8[Number(p) >> 0] = value;
            continue;
          case "i16":
            c.HEAP16[Number(p) >> 1] = value;
            continue;
          case "i32":
            c.HEAP32[Number(p) >> 2] = value;
            continue;
          case "float":
          case "f32":
            c.HEAP32F[Number(p) >> 2] = value;
            continue;
          case "double":
          case "f64":
            c.HEAP64F[Number(p) >> 3] = value;
            continue;
          case "i64":
            if (c.HEAP64) {
              c.HEAP64[Number(p) >> 3] = __BigInt(value);
              continue;
            }
          default:
            toss("Invalid type for poke(): " + type);
        }
        return this;
      };
      target.peekPtr = (...ptr) => target.peek(1 === ptr.length ? ptr[0] : ptr, __ptrIR);
      target.pokePtr = (ptr, value = 0) => target.poke(ptr, value, __ptrIR);
      target.peek8 = (...ptr) => target.peek(1 === ptr.length ? ptr[0] : ptr, "i8");
      target.poke8 = (ptr, value) => target.poke(ptr, value, "i8");
      target.peek16 = (...ptr) => target.peek(1 === ptr.length ? ptr[0] : ptr, "i16");
      target.poke16 = (ptr, value) => target.poke(ptr, value, "i16");
      target.peek32 = (...ptr) => target.peek(1 === ptr.length ? ptr[0] : ptr, "i32");
      target.poke32 = (ptr, value) => target.poke(ptr, value, "i32");
      target.peek64 = (...ptr) => target.peek(1 === ptr.length ? ptr[0] : ptr, "i64");
      target.poke64 = (ptr, value) => target.poke(ptr, value, "i64");
      target.peek32f = (...ptr) => target.peek(1 === ptr.length ? ptr[0] : ptr, "f32");
      target.poke32f = (ptr, value) => target.poke(ptr, value, "f32");
      target.peek64f = (...ptr) => target.peek(1 === ptr.length ? ptr[0] : ptr, "f64");
      target.poke64f = (ptr, value) => target.poke(ptr, value, "f64");
      target.getMemValue = target.peek;
      target.getPtrValue = target.peekPtr;
      target.setMemValue = target.poke;
      target.setPtrValue = target.pokePtr;
      target.isPtr32 = (ptr) => "number" === typeof ptr && ptr >= 0 && ptr === (ptr | 0);
      target.isPtr64 = (ptr) => "bigint" === typeof ptr ? ptr >= 0 : target.isPtr32(ptr);
      target.isPtr = 4 === __ptrSize ? target.isPtr32 : target.isPtr64;
      target.cstrlen = function(ptr) {
        if (!ptr || !target.isPtr(ptr)) return null;
        ptr = Number(ptr);
        const h = heapWrappers().HEAP8U;
        let pos = ptr;
        for (; h[pos] !== 0; ++pos) ;
        return pos - ptr;
      };
      const __SAB = "undefined" === typeof SharedArrayBuffer ? function() {
      } : SharedArrayBuffer;
      const isSharedTypedArray = (aTypedArray) => aTypedArray.buffer instanceof __SAB;
      target.isSharedTypedArray = isSharedTypedArray;
      const typedArrayPart = (aTypedArray, begin, end) => {
        if (8 === __ptrSize) {
          if ("bigint" === typeof begin) begin = Number(begin);
          if ("bigint" === typeof end) end = Number(end);
        }
        return isSharedTypedArray(aTypedArray) ? aTypedArray.slice(begin, end) : aTypedArray.subarray(begin, end);
      };
      target.typedArrayPart = typedArrayPart;
      const typedArrayToString = (typedArray, begin, end) => cache.utf8Decoder.decode(typedArrayPart(typedArray, begin, end));
      target.typedArrayToString = typedArrayToString;
      target.cstrToJs = function(ptr) {
        const n = target.cstrlen(ptr);
        return n ? typedArrayToString(heapWrappers().HEAP8U, Number(ptr), Number(ptr) + n) : null === n ? n : "";
      };
      target.jstrlen = function(str) {
        if ("string" !== typeof str) return null;
        const n = str.length;
        let len = 0;
        for (let i = 0; i < n; ++i) {
          let u = str.charCodeAt(i);
          if (u >= 55296 && u <= 57343) u = 65536 + ((u & 1023) << 10) | str.charCodeAt(++i) & 1023;
          if (u <= 127) ++len;
          else if (u <= 2047) len += 2;
          else if (u <= 65535) len += 3;
          else len += 4;
        }
        return len;
      };
      target.jstrcpy = function(jstr, tgt, offset = 0, maxBytes = -1, addNul = true) {
        if (!tgt || !(tgt instanceof Int8Array) && !(tgt instanceof Uint8Array)) toss("jstrcpy() target must be an Int8Array or Uint8Array.");
        maxBytes = Number(maxBytes);
        offset = Number(offset);
        if (maxBytes < 0) maxBytes = tgt.length - offset;
        if (!(maxBytes > 0) || !(offset >= 0)) return 0;
        let i = 0, max = jstr.length;
        const begin = offset, end = offset + maxBytes - (addNul ? 1 : 0);
        for (; i < max && offset < end; ++i) {
          let u = jstr.charCodeAt(i);
          if (u >= 55296 && u <= 57343) u = 65536 + ((u & 1023) << 10) | jstr.charCodeAt(++i) & 1023;
          if (u <= 127) {
            if (offset >= end) break;
            tgt[offset++] = u;
          } else if (u <= 2047) {
            if (offset + 1 >= end) break;
            tgt[offset++] = 192 | u >> 6;
            tgt[offset++] = 128 | u & 63;
          } else if (u <= 65535) {
            if (offset + 2 >= end) break;
            tgt[offset++] = 224 | u >> 12;
            tgt[offset++] = 128 | u >> 6 & 63;
            tgt[offset++] = 128 | u & 63;
          } else {
            if (offset + 3 >= end) break;
            tgt[offset++] = 240 | u >> 18;
            tgt[offset++] = 128 | u >> 12 & 63;
            tgt[offset++] = 128 | u >> 6 & 63;
            tgt[offset++] = 128 | u & 63;
          }
        }
        if (addNul) tgt[offset++] = 0;
        return offset - begin;
      };
      target.cstrncpy = function(tgtPtr, srcPtr, n) {
        if (!tgtPtr || !srcPtr) toss("cstrncpy() does not accept NULL strings.");
        if (n < 0) n = target.cstrlen(strPtr) + 1;
        else if (!(n > 0)) return 0;
        const heap = target.heap8u();
        let i = 0, ch;
        const tgtNumber = Number(tgtPtr), srcNumber = Number(srcPtr);
        for (; i < n && (ch = heap[srcNumber + i]); ++i) heap[tgtNumber + i] = ch;
        if (i < n) heap[tgtNumber + i++] = 0;
        return i;
      };
      target.jstrToUintArray = (str, addNul = false) => {
        return cache.utf8Encoder.encode(addNul ? str + "\0" : str);
      };
      const __affirmAlloc = (obj, funcName) => {
        if (!(obj.alloc instanceof Function) || !(obj.dealloc instanceof Function)) toss("Object is missing alloc() and/or dealloc() function(s)", "required by", funcName + "().");
      };
      const __allocCStr = function(jstr, returnWithLength, allocator, funcName) {
        __affirmAlloc(target, funcName);
        if ("string" !== typeof jstr) return null;
        const u = cache.utf8Encoder.encode(jstr), ptr = allocator(u.length + 1);
        let toFree = ptr;
        try {
          const heap = heapWrappers().HEAP8U;
          heap.set(u, Number(ptr));
          heap[__ptrAdd(ptr, u.length)] = 0;
          toFree = __NullPtr;
          return returnWithLength ? [ptr, u.length] : ptr;
        } finally {
          if (toFree) target.dealloc(toFree);
        }
      };
      target.allocCString = (jstr, returnWithLength = false) => __allocCStr(jstr, returnWithLength, target.alloc, "allocCString()");
      target.scopedAllocPush = function() {
        __affirmAlloc(target, "scopedAllocPush");
        const a = [];
        cache.scopedAlloc.push(a);
        return a;
      };
      target.scopedAllocPop = function(state) {
        __affirmAlloc(target, "scopedAllocPop");
        const n = arguments.length ? cache.scopedAlloc.indexOf(state) : cache.scopedAlloc.length - 1;
        if (n < 0) toss("Invalid state object for scopedAllocPop().");
        if (0 === arguments.length) state = cache.scopedAlloc[n];
        cache.scopedAlloc.splice(n, 1);
        for (let p; p = state.pop(); ) if (target.functionEntry(p)) target.uninstallFunction(p);
        else target.dealloc(p);
      };
      target.scopedAlloc = function(n) {
        if (!cache.scopedAlloc.length) toss("No scopedAllocPush() scope is active.");
        const p = __asPtrType(target.alloc(n));
        return cache.scopedAlloc.pushPtr(p);
      };
      Object.defineProperty(target.scopedAlloc, "level", {
        configurable: false,
        enumerable: false,
        get: () => cache.scopedAlloc.length,
        set: () => toss("The 'active' property is read-only.")
      });
      target.scopedAllocCString = (jstr, returnWithLength = false) => __allocCStr(jstr, returnWithLength, target.scopedAlloc, "scopedAllocCString()");
      const __allocMainArgv = function(isScoped, list) {
        const pList = target[isScoped ? "scopedAlloc" : "alloc"]((list.length + 1) * target.ptr.size);
        let i = 0;
        list.forEach((e) => {
          target.pokePtr(__ptrAdd(pList, target.ptr.size * i++), target[isScoped ? "scopedAllocCString" : "allocCString"]("" + e));
        });
        target.pokePtr(__ptrAdd(pList, target.ptr.size * i), 0);
        return pList;
      };
      target.scopedAllocMainArgv = (list) => __allocMainArgv(true, list);
      target.allocMainArgv = (list) => __allocMainArgv(false, list);
      target.cArgvToJs = (argc, pArgv) => {
        const list = [];
        for (let i = 0; i < argc; ++i) {
          const arg = target.peekPtr(__ptrAdd(pArgv, target.ptr.size * i));
          list.push(arg ? target.cstrToJs(arg) : null);
        }
        return list;
      };
      target.scopedAllocCall = function(func) {
        target.scopedAllocPush();
        try {
          return func();
        } finally {
          target.scopedAllocPop();
        }
      };
      const __allocPtr = function(howMany, safePtrSize, method) {
        __affirmAlloc(target, method);
        const pIr = safePtrSize ? "i64" : __ptrIR;
        let m = target[method](howMany * (safePtrSize ? 8 : __ptrSize));
        target.poke(m, 0, pIr);
        if (1 === howMany) return m;
        const a = [m];
        for (let i = 1; i < howMany; ++i) {
          m = __ptrAdd(m, safePtrSize ? 8 : __ptrSize);
          a[i] = m;
          target.poke(m, 0, pIr);
        }
        return a;
      };
      target.allocPtr = (howMany = 1, safePtrSize = true) => __allocPtr(howMany, safePtrSize, "alloc");
      target.scopedAllocPtr = (howMany = 1, safePtrSize = true) => __allocPtr(howMany, safePtrSize, "scopedAlloc");
      target.xGet = function(name) {
        return target.exports[name] || toss("Cannot find exported symbol:", name);
      };
      const __argcMismatch = (f, n) => toss(f + "() requires", n, "argument(s).");
      target.xCall = function(fname, ...args) {
        const f = fname instanceof Function ? fname : target.xGet(fname);
        if (!(f instanceof Function)) toss("Exported symbol", fname, "is not a function.");
        if (f.length !== args.length) __argcMismatch(f === fname ? f.name : fname, f.length);
        return 2 === arguments.length && Array.isArray(arguments[1]) ? f.apply(null, arguments[1]) : f.apply(null, args);
      };
      cache.xWrap = /* @__PURE__ */ Object.create(null);
      cache.xWrap.convert = /* @__PURE__ */ Object.create(null);
      cache.xWrap.convert.arg = /* @__PURE__ */ new Map();
      cache.xWrap.convert.result = /* @__PURE__ */ new Map();
      const xArg = cache.xWrap.convert.arg, xResult = cache.xWrap.convert.result;
      const __xArgPtr = __asPtrType;
      xArg.set("i64", __BigInt).set("i32", (i) => i | 0).set("i16", (i) => (i | 0) & 65535).set("i8", (i) => (i | 0) & 255).set("f32", (i) => Number(i).valueOf()).set("float", xArg.get("f32")).set("f64", xArg.get("f32")).set("double", xArg.get("f64")).set("int", xArg.get("i32")).set("null", (i) => i).set(null, xArg.get("null")).set("**", __xArgPtr).set("*", __xArgPtr);
      xResult.set("*", __xArgPtr).set("pointer", __xArgPtr).set("number", (v2) => Number(v2)).set("void", (v2) => void 0).set(void 0, xResult.get("void")).set("null", (v2) => v2).set(null, xResult.get("null"));
      for (const t of [
        "i8",
        "i16",
        "i32",
        "i64",
        "int",
        "f32",
        "float",
        "f64",
        "double"
      ]) {
        xArg.set(t + "*", __xArgPtr);
        xResult.set(t + "*", __xArgPtr);
        xResult.set(t, xArg.get(t) || toss("Maintenance required: missing arg converter for", t));
      }
      const __xArgString = (v2) => {
        return "string" === typeof v2 ? target.scopedAllocCString(v2) : __asPtrType(v2);
      };
      xArg.set("string", __xArgString).set("utf8", __xArgString);
      xResult.set("string", (i) => target.cstrToJs(i)).set("utf8", xResult.get("string")).set("string:dealloc", (i) => {
        try {
          return i ? target.cstrToJs(i) : null;
        } finally {
          target.dealloc(i);
        }
      }).set("utf8:dealloc", xResult.get("string:dealloc")).set("json", (i) => JSON.parse(target.cstrToJs(i))).set("json:dealloc", (i) => {
        try {
          return i ? JSON.parse(target.cstrToJs(i)) : null;
        } finally {
          target.dealloc(i);
        }
      });
      const AbstractArgAdapter = class {
        constructor(opt) {
          this.name = opt.name || "unnamed adapter";
        }
        /**
        Gets called via xWrap() to "convert" v to whatever type
        this specific class supports.

        argIndex is the argv index of _this_ argument in the
        being-xWrap()'d call. argv is the current argument list
        undergoing xWrap() argument conversion. argv entries to the
        left of argIndex will have already undergone transformation and
        those to the right will not have (they will have the values the
        client-level code passed in, awaiting conversion). The RHS
        indexes must never be relied upon for anything because their
        types are indeterminate, whereas the LHS values will be
        WASM-compatible values by the time this is called.

        The reason for the argv and argIndex arguments is that we
        frequently need more context than v for a specific conversion,
        and that context invariably lies in the LHS arguments of v.
        Examples of how this is useful can be found in FuncPtrAdapter.
        */
        convertArg(v2, argv, argIndex) {
          toss("AbstractArgAdapter must be subclassed.");
        }
      };
      xArg.FuncPtrAdapter = class FuncPtrAdapter extends AbstractArgAdapter {
        constructor(opt) {
          super(opt);
          if (xArg.FuncPtrAdapter.warnOnUse) console.warn("xArg.FuncPtrAdapter is an internal-only API", "and is not intended to be invoked from", "client-level code. Invoked with:", opt);
          this.name = opt.name || "unnamed";
          this.signature = opt.signature;
          if (opt.contextKey instanceof Function) {
            this.contextKey = opt.contextKey;
            if (!opt.bindScope) opt.bindScope = "context";
          }
          this.bindScope = opt.bindScope || toss("FuncPtrAdapter options requires a bindScope (explicit or implied).");
          if (FuncPtrAdapter.bindScopes.indexOf(opt.bindScope) < 0) toss("Invalid options.bindScope (" + opt.bindMod + ") for FuncPtrAdapter. Expecting one of: (" + FuncPtrAdapter.bindScopes.join(", ") + ")");
          this.isTransient = "transient" === this.bindScope;
          this.isContext = "context" === this.bindScope;
          this.isPermanent = "permanent" === this.bindScope;
          this.singleton = "singleton" === this.bindScope ? [] : void 0;
          this.callProxy = opt.callProxy instanceof Function ? opt.callProxy : void 0;
        }
        /**
        The static class members are defined outside of the class to
        work around an emcc toolchain build problem: one of the tools
        in emsdk v3.1.42 does not support the static keyword.
        */
        contextKey(argv, argIndex) {
          return this;
        }
        /**
        Returns this object's mapping for the given context key, in the
        form of an an array, creating the mapping if needed. The key
        may be anything suitable for use in a Map.

        The returned array is intended to be used as a pair of
        [JSValue, WasmFuncPtr], where the first element is one passed
        to this.convertArg() and the second is its WASM form.
        */
        contextMap(key) {
          const cm = this.__cmap || (this.__cmap = /* @__PURE__ */ new Map());
          let rc = cm.get(key);
          if (void 0 === rc) cm.set(key, rc = []);
          return rc;
        }
        /**
        Gets called via xWrap() to "convert" v to a WASM-bound function
        pointer. If v is one of (a WASM pointer, null, undefined) then
        (v||0) is returned and any earlier function installed by this
        mapping _might_, depending on how it's bound, be uninstalled.
        If v is not one of those types, it must be a Function, for
        which this method creates (if needed) a WASM function binding
        and returns the WASM pointer to that binding.

        If this instance is not in 'transient' mode, it will remember
        the binding for at least the next call, to avoid recreating the
        function binding unnecessarily.

        If it's passed a pointer(ish) value for v, it assumes it's a
        WASM function pointer and does _not_ perform any function
        binding, so this object's bindMode is irrelevant/ignored for
        such cases.

        See the parent class's convertArg() docs for details on what
        exactly the 2nd and 3rd arguments are.
        */
        convertArg(v2, argv, argIndex) {
          let pair = this.singleton;
          if (!pair && this.isContext) pair = this.contextMap(this.contextKey(argv, argIndex));
          if (pair && 2 === pair.length && pair[0] === v2) return pair[1];
          if (v2 instanceof Function) {
            if (this.callProxy) v2 = this.callProxy(v2);
            const fp = __installFunction(v2, this.signature, this.isTransient);
            if (FuncPtrAdapter.debugFuncInstall) FuncPtrAdapter.debugOut("FuncPtrAdapter installed", this, this.contextKey(argv, argIndex), "@" + fp, v2);
            if (pair) {
              if (pair[1]) {
                if (FuncPtrAdapter.debugFuncInstall) FuncPtrAdapter.debugOut("FuncPtrAdapter uninstalling", this, this.contextKey(argv, argIndex), "@" + pair[1], v2);
                try {
                  cache.scopedAlloc.pushPtr(pair[1]);
                } catch (e) {
                }
              }
              pair[0] = arguments[0] || __NullPtr;
              pair[1] = fp;
            }
            return fp;
          } else if (target.isPtr(v2) || null === v2 || void 0 === v2) {
            if (pair && pair[1] && pair[1] !== v2) {
              if (FuncPtrAdapter.debugFuncInstall) FuncPtrAdapter.debugOut("FuncPtrAdapter uninstalling", this, this.contextKey(argv, argIndex), "@" + pair[1], v2);
              try {
                cache.scopedAlloc.pushPtr(pair[1]);
              } catch (e) {
              }
              pair[0] = pair[1] = v2 || __NullPtr;
            }
            return v2 || __NullPtr;
          } else throw new TypeError("Invalid FuncPtrAdapter argument type. Expecting a function pointer or a " + (this.name ? this.name + " " : "") + "function matching signature " + this.signature + ".");
        }
      };
      xArg.FuncPtrAdapter.warnOnUse = false;
      xArg.FuncPtrAdapter.debugFuncInstall = false;
      xArg.FuncPtrAdapter.debugOut = console.debug.bind(console);
      xArg.FuncPtrAdapter.bindScopes = [
        "transient",
        "context",
        "singleton",
        "permanent"
      ];
      const __xArgAdapterCheck = (t) => xArg.get(t) || toss("Argument adapter not found:", t);
      const __xResultAdapterCheck = (t) => xResult.get(t) || toss("Result adapter not found:", t);
      cache.xWrap.convertArg = (t, ...args) => __xArgAdapterCheck(t)(...args);
      cache.xWrap.convertArgNoCheck = (t, ...args) => xArg.get(t)(...args);
      cache.xWrap.convertResult = (t, v2) => null === t ? v2 : t ? __xResultAdapterCheck(t)(v2) : void 0;
      cache.xWrap.convertResultNoCheck = (t, v2) => null === t ? v2 : t ? xResult.get(t)(v2) : void 0;
      target.xWrap = function callee3(fArg, resultType, ...argTypes) {
        if (3 === arguments.length && Array.isArray(arguments[2])) argTypes = arguments[2];
        if (target.isPtr(fArg)) fArg = target.functionEntry(fArg) || toss("Function pointer not found in WASM function table.");
        const fIsFunc = fArg instanceof Function;
        const xf = fIsFunc ? fArg : target.xGet(fArg);
        if (fIsFunc) fArg = xf.name || "unnamed function";
        if (argTypes.length !== xf.length) __argcMismatch(fArg, xf.length);
        if (0 === xf.length && (null === resultType || "null" === resultType)) return xf;
        __xResultAdapterCheck(resultType);
        for (const t of argTypes) if (t instanceof AbstractArgAdapter) xArg.set(t, (...args) => t.convertArg(...args));
        else __xArgAdapterCheck(t);
        const cxw = cache.xWrap;
        if (0 === xf.length) return (...args) => args.length ? __argcMismatch(fArg, xf.length) : cxw.convertResult(resultType, xf.call(null));
        return function(...args) {
          if (args.length !== xf.length) __argcMismatch(fArg, xf.length);
          const scope = target.scopedAllocPush();
          try {
            let i = 0;
            if (callee3.debug) console.debug("xWrap() preparing: resultType ", resultType, "xf", xf, "argTypes", argTypes, "args", args);
            for (; i < args.length; ++i) args[i] = cxw.convertArgNoCheck(argTypes[i], args[i], args, i);
            if (callee3.debug) console.debug("xWrap() calling: resultType ", resultType, "xf", xf, "argTypes", argTypes, "args", args);
            return cxw.convertResultNoCheck(resultType, xf.apply(null, args));
          } finally {
            target.scopedAllocPop(scope);
          }
        };
      };
      const __xAdapter = function(func, argc, typeName, adapter, modeName, xcvPart) {
        if ("string" === typeof typeName) {
          if (1 === argc) return xcvPart.get(typeName);
          else if (2 === argc) {
            if (!adapter) {
              xcvPart.delete(typeName);
              return func;
            } else if (!(adapter instanceof Function)) toss(modeName, "requires a function argument.");
            xcvPart.set(typeName, adapter);
            return func;
          }
        }
        toss("Invalid arguments to", modeName);
      };
      target.xWrap.resultAdapter = function f(typeName, adapter) {
        return __xAdapter(f, arguments.length, typeName, adapter, "resultAdapter()", xResult);
      };
      target.xWrap.argAdapter = function f(typeName, adapter) {
        return __xAdapter(f, arguments.length, typeName, adapter, "argAdapter()", xArg);
      };
      target.xWrap.FuncPtrAdapter = xArg.FuncPtrAdapter;
      target.xCallWrapped = function(fArg, resultType, argTypes, ...args) {
        if (Array.isArray(arguments[3])) args = arguments[3];
        return target.xWrap(fArg, resultType, argTypes || []).apply(null, args || []);
      };
      target.xWrap.testConvertArg = cache.xWrap.convertArg;
      target.xWrap.testConvertResult = cache.xWrap.convertResult;
      return target;
    };
    globalThis.WhWasmUtilInstaller.yawl = function yawl(config) {
      "use strict";
      const wfetch = () => fetch(config.uri, { credentials: "same-origin" });
      const wui = this;
      const finalThen = function(arg) {
        if (config.wasmUtilTarget) {
          const toss = (...args) => {
            throw new Error(args.join(" "));
          };
          const tgt = config.wasmUtilTarget;
          tgt.module = arg.module;
          tgt.instance = arg.instance;
          if (!tgt.instance.exports.memory)
            tgt.memory = config?.imports?.env?.memory || toss("Missing 'memory' object!");
          if (!tgt.alloc && arg.instance.exports.malloc) {
            const exports = arg.instance.exports;
            tgt.alloc = function(n) {
              return exports.malloc(n) || toss("Allocation of", n, "bytes failed.");
            };
            tgt.dealloc = function(m) {
              m && exports.free(m);
            };
          }
          wui(tgt);
        }
        arg.config = config;
        if (config.onload) config.onload(arg);
        return arg;
      };
      return WebAssembly.instantiateStreaming ? () => WebAssembly.instantiateStreaming(wfetch(), config.imports || {}).then(finalThen) : () => wfetch().then((response) => response.arrayBuffer()).then((bytes) => WebAssembly.instantiate(bytes, config.imports || {})).then(finalThen);
    }.bind(globalThis.WhWasmUtilInstaller);
    globalThis.Jaccwabyt = function StructBinderFactory(config) {
      "use strict";
      const toss = (...args) => {
        throw new Error(args.join(" "));
      };
      {
        let h = config.heap;
        if (h instanceof WebAssembly.Memory) h = function() {
          return new Uint8Array(this.buffer);
        }.bind(h);
        else if (!(h instanceof Function)) toss("config.heap must be WebAssembly.Memory instance or", "a function which returns one.");
        config.heap = h;
      }
      ["alloc", "dealloc"].forEach(function(k2) {
        config[k2] instanceof Function || toss("Config option '" + k2 + "' must be a function.");
      });
      const SBF = StructBinderFactory, heap = config.heap, alloc = config.alloc, dealloc = config.dealloc;
      config.realloc;
      const log = config.log || console.debug.bind(console), memberPrefix = config.memberPrefix || "", memberSuffix = config.memberSuffix || "", BigInt2 = globalThis["BigInt"], BigInt64Array2 = globalThis["BigInt64Array"], bigIntEnabled = config.bigIntEnabled ?? !!BigInt64Array2;
      let ptr;
      const ptrSize = config.pointerSize || config.ptrSize || ("bigint" === typeof (ptr = alloc(1)) ? 8 : 4);
      const ptrIR = config.pointerIR || config.ptrIR || (4 === ptrSize ? "i32" : "i64");
      if (ptr) {
        dealloc(ptr);
        ptr = void 0;
      }
      if (ptrSize !== 4 && ptrSize !== 8) toss("Invalid pointer size:", ptrSize);
      if (ptrIR !== "i32" && ptrIR !== "i64") toss("Invalid pointer representation:", ptrIR);
      const __BigInt = bigIntEnabled && BigInt2 ? (v2) => BigInt2(v2 || 0) : (v2) => toss("BigInt support is disabled in this build.");
      const __asPtrType = "i32" == ptrIR ? Number : __BigInt;
      const __NullPtr = __asPtrType(0);
      const __ptrAdd = function(...args) {
        let rc = __NullPtr;
        for (let i = 0; i < args.length; ++i) rc += __asPtrType(args[i]);
        return rc;
      };
      const __ptrAddSelf = function(...args) {
        return __ptrAdd(this.pointer, ...args);
      };
      if (!SBF.debugFlags) {
        SBF.__makeDebugFlags = function(deriveFrom = null) {
          if (deriveFrom && deriveFrom.__flags) deriveFrom = deriveFrom.__flags;
          const f = function f2(flags) {
            if (0 === arguments.length) return f2.__flags;
            if (flags < 0) {
              delete f2.__flags.getter;
              delete f2.__flags.setter;
              delete f2.__flags.alloc;
              delete f2.__flags.dealloc;
            } else {
              f2.__flags.getter = 0 !== (1 & flags);
              f2.__flags.setter = 0 !== (2 & flags);
              f2.__flags.alloc = 0 !== (4 & flags);
              f2.__flags.dealloc = 0 !== (8 & flags);
            }
            return f2._flags;
          };
          Object.defineProperty(f, "__flags", {
            iterable: false,
            writable: false,
            value: Object.create(deriveFrom)
          });
          if (!deriveFrom) f(0);
          return f;
        };
        SBF.debugFlags = SBF.__makeDebugFlags();
      }
      const isLittleEndian = true;
      const isFuncSig = (s) => "(" === s[1];
      const isPtrSig = (s) => "p" === s || "P" === s || "s" === s;
      const isAutoPtrSig = (s) => "P" === s;
      const sigLetter = (s) => s ? isFuncSig(s) ? "p" : s[0] : void 0;
      const sigIR = function(s) {
        switch (sigLetter(s)) {
          case "c":
          case "C":
            return "i8";
          case "i":
            return "i32";
          case "p":
          case "P":
          case "s":
            return ptrIR;
          case "j":
            return "i64";
          case "f":
            return "float";
          case "d":
            return "double";
        }
        toss("Unhandled signature IR:", s);
      };
      const sigSize = function(s) {
        switch (sigLetter(s)) {
          case "c":
          case "C":
            return 1;
          case "i":
            return 4;
          case "p":
          case "P":
          case "s":
            return ptrSize;
          case "j":
            return 8;
          case "f":
            return 4;
          case "d":
            return 8;
        }
        toss("Unhandled signature sizeof:", s);
      };
      const affirmBigIntArray = BigInt64Array2 ? () => true : () => toss("BigInt64Array is not available.");
      const sigDVGetter = function(s) {
        switch (sigLetter(s)) {
          case "p":
          case "P":
          case "s":
            switch (ptrSize) {
              case 4:
                return "getInt32";
              case 8:
                return affirmBigIntArray() && "getBigInt64";
            }
            break;
          case "i":
            return "getInt32";
          case "c":
            return "getInt8";
          case "C":
            return "getUint8";
          case "j":
            return affirmBigIntArray() && "getBigInt64";
          case "f":
            return "getFloat32";
          case "d":
            return "getFloat64";
        }
        toss("Unhandled DataView getter for signature:", s);
      };
      const sigDVSetter = function(s) {
        switch (sigLetter(s)) {
          case "p":
          case "P":
          case "s":
            switch (ptrSize) {
              case 4:
                return "setInt32";
              case 8:
                return affirmBigIntArray() && "setBigInt64";
            }
            break;
          case "i":
            return "setInt32";
          case "c":
            return "setInt8";
          case "C":
            return "setUint8";
          case "j":
            return affirmBigIntArray() && "setBigInt64";
          case "f":
            return "setFloat32";
          case "d":
            return "setFloat64";
        }
        toss("Unhandled DataView setter for signature:", s);
      };
      const sigDVSetWrapper = function(s) {
        switch (sigLetter(s)) {
          case "i":
          case "f":
          case "c":
          case "C":
          case "d":
            return Number;
          case "j":
            return __BigInt;
          case "p":
          case "P":
          case "s":
            switch (ptrSize) {
              case 4:
                return Number;
              case 8:
                return __BigInt;
            }
            break;
        }
        toss("Unhandled DataView set wrapper for signature:", s);
      };
      const sPropName = (s, k2) => s + "::" + k2;
      const __propThrowOnSet = function(structName, propName) {
        return () => toss(sPropName(structName, propName), "is read-only.");
      };
      const getInstanceHandle = function f(obj, create = true) {
        let ii = f.map.get(obj);
        if (!ii && create) f.map.set(obj, ii = f.create(obj));
        return ii;
      };
      getInstanceHandle.map = /* @__PURE__ */ new WeakMap();
      getInstanceHandle.create = (forObj) => {
        return Object.assign(/* @__PURE__ */ Object.create(null), {
          o: forObj,
          p: void 0,
          ownsPointer: false,
          zod: false,
          xb: 0
        });
      };
      const rmInstanceHandle = (obj) => getInstanceHandle.map.delete(obj);
      const __isPtr32 = (ptr2) => "number" === typeof ptr2 && ptr2 === (ptr2 | 0) && ptr2 >= 0;
      const __isPtr64 = (ptr2) => "bigint" === typeof ptr2 && ptr2 >= 0 || __isPtr32(ptr2);
      const __isPtr = 4 === ptrSize ? __isPtr32 : __isPtr64;
      const __isNonNullPtr = (v2) => __isPtr(v2) && v2 > 0;
      const __freeStruct = function(ctor, obj, m) {
        const ii = getInstanceHandle(obj, false);
        if (!ii) return;
        rmInstanceHandle(obj);
        if (!m && !(m = ii.p)) {
          console.warn("Cannot(?) happen: __freeStruct() found no instanceInfo");
          return;
        }
        if (Array.isArray(obj.ondispose)) {
          let x;
          while (x = obj.ondispose.pop()) try {
            if (x instanceof Function) x.call(obj);
            else if (x instanceof StructType) x.dispose();
            else if (__isPtr(x)) dealloc(x);
          } catch (e) {
            console.warn("ondispose() for", ctor.structName, "@", m, "threw. NOT propagating it.", e);
          }
        } else if (obj.ondispose instanceof Function) try {
          obj.ondispose();
        } catch (e) {
          console.warn("ondispose() for", ctor.structName, "@", m, "threw. NOT propagating it.", e);
        }
        delete obj.ondispose;
        if (ctor.debugFlags.__flags.dealloc) log("debug.dealloc:", ii.ownsPointer ? "" : "EXTERNAL", ctor.structName, "instance:", ctor.structInfo.sizeof, "bytes @" + m);
        if (ii.ownsPointer) {
          if (ii.zod || ctor.structInfo.zeroOnDispose) heap().fill(0, Number(m), Number(m) + ctor.structInfo.sizeof + ii.xb);
          dealloc(m);
        }
      };
      const rop0 = () => {
        return {
          configurable: false,
          writable: false,
          iterable: false
        };
      };
      const rop = (v2) => {
        return {
          ...rop0(),
          value: v2
        };
      };
      const __allocStruct = function f(ctor, obj, xm) {
        let opt;
        const checkPtr = (ptr2) => {
          __isNonNullPtr(ptr2) || toss("Invalid pointer value", arguments[0], "for", ctor.structName, "constructor.");
        };
        if (arguments.length >= 3) if (xm && "object" === typeof xm) {
          opt = xm;
          xm = opt?.wrap;
        } else {
          checkPtr(xm);
          opt = { wrap: xm };
        }
        else opt = {};
        const fill = !xm;
        let nAlloc = 0;
        let ownsPointer = false;
        if (xm) {
          checkPtr(xm);
          ownsPointer = !!opt?.takeOwnership;
        } else {
          const nX = opt?.extraBytes ?? 0;
          if (nX < 0 || nX !== (nX | 0)) toss("Invalid extraBytes value:", opt?.extraBytes);
          nAlloc = ctor.structInfo.sizeof + nX;
          xm = alloc(nAlloc) || toss("Allocation of", ctor.structName, "structure failed.");
          ownsPointer = true;
        }
        try {
          if (opt?.debugFlags) obj.debugFlags(opt.debugFlags);
          if (ctor.debugFlags.__flags.alloc) log("debug.alloc:", fill ? "" : "EXTERNAL", ctor.structName, "instance:", ctor.structInfo.sizeof, "bytes @" + xm);
          if (fill) heap().fill(0, Number(xm), Number(xm) + nAlloc);
          const ii = getInstanceHandle(obj);
          ii.p = xm;
          ii.ownsPointer = ownsPointer;
          ii.xb = nAlloc ? nAlloc - ctor.structInfo.sizeof : 0;
          ii.zod = !!opt?.zeroOnDispose;
          if (opt?.ondispose && opt.ondispose !== xm) obj.addOnDispose(opt.ondispose);
        } catch (e) {
          __freeStruct(ctor, obj, xm);
          throw e;
        }
      };
      const looksLikeASig = function f(sig) {
        f.rxSig1 ??= /^[ipPsjfdcC]$/;
        f.rxSig2 ??= /^[vipPsjfdcC]\([ipPsjfdcC]*\)$/;
        return f.rxSig1.test(sig) || f.rxSig2.test(sig);
      };
      const __adaptorsFor = function(who) {
        let x = this.get(who);
        if (!x) {
          x = [
            /* @__PURE__ */ Object.create(null),
            /* @__PURE__ */ Object.create(null),
            /* @__PURE__ */ Object.create(null)
          ];
          this.set(who, x);
        }
        return x;
      }.bind(/* @__PURE__ */ new WeakMap());
      const __adaptor = function(who, which, key, proxy) {
        const a = __adaptorsFor(who)[which];
        if (3 === arguments.length) return a[key];
        if (proxy) return a[key] = proxy;
        return delete a[key];
      };
      const __adaptGet = function(key, ...args) {
        return __adaptor(this, 0, key, ...args);
      };
      const __affirmNotASig = function(ctx, key) {
        looksLikeASig(key) && toss(ctx, "(", key, ") collides with a data type signature.");
      };
      const __adaptSet = function(key, ...args) {
        __affirmNotASig("Setter adaptor", key);
        return __adaptor(this, 1, key, ...args);
      };
      const __adaptStruct = function(key, ...args) {
        __affirmNotASig("Struct adaptor", key);
        return __adaptor(this, 2, key, ...args);
      };
      const __adaptStruct2 = function(who, key) {
        const si = "string" === typeof key ? __adaptor(who, 2, key) : key;
        if ("object" !== typeof si) toss("Invalid struct mapping object. Arg =", key, JSON.stringify(si));
        return si;
      };
      const __memberKey = (k2) => memberPrefix + k2 + memberSuffix;
      const __memberKeyProp = rop(__memberKey);
      const __lookupMember = function(structInfo, memberName, tossIfNotFound = true) {
        let m = structInfo.members[memberName];
        if (!m && (memberPrefix || memberSuffix)) {
          for (const v2 of Object.values(structInfo.members)) if (v2.key === memberName) {
            m = v2;
            break;
          }
          if (!m && tossIfNotFound) toss(sPropName(structInfo.name || structInfo.structName, memberName), "is not a mapped struct member.");
        }
        return m;
      };
      const __memberSignature = function f(obj, memberName, emscriptenFormat = false) {
        if (!f._) f._ = (x) => x.replace(/[^vipPsjrdcC]/g, "").replace(/[pPscC]/g, "i");
        const m = __lookupMember(obj.structInfo, memberName, true);
        return emscriptenFormat ? f._(m.signature) : m.signature;
      };
      const __structMemberKeys = rop(function() {
        const a = [];
        for (const k2 of Object.keys(this.structInfo.members)) a.push(this.memberKey(k2));
        return a;
      });
      const __utf8Decoder = new TextDecoder("utf-8");
      const __utf8Encoder = new TextEncoder();
      const __SAB = "undefined" === typeof SharedArrayBuffer ? function() {
      } : SharedArrayBuffer;
      const __utf8Decode = function(arrayBuffer, begin, end) {
        if (8 === ptrSize) {
          begin = Number(begin);
          end = Number(end);
        }
        return __utf8Decoder.decode(arrayBuffer.buffer instanceof __SAB ? arrayBuffer.slice(begin, end) : arrayBuffer.subarray(begin, end));
      };
      const __memberIsString = function(obj, memberName, tossIfNotFound = false) {
        const m = __lookupMember(obj.structInfo, memberName, tossIfNotFound);
        return m && 1 === m.signature.length && "s" === m.signature[0] ? m : false;
      };
      const __affirmCStringSignature = function(member) {
        if ("s" === member.signature) return;
        toss("Invalid member type signature for C-string value:", JSON.stringify(member));
      };
      const __memberToJsString = function f(obj, memberName) {
        const m = __lookupMember(obj.structInfo, memberName, true);
        __affirmCStringSignature(m);
        const addr = obj[m.key];
        if (!addr) return null;
        let pos = addr;
        const mem = heap();
        for (; mem[pos] !== 0; ++pos) ;
        return addr === pos ? "" : __utf8Decode(mem, addr, pos);
      };
      const __addOnDispose = function(obj, ...v2) {
        if (obj.ondispose) {
          if (!Array.isArray(obj.ondispose)) obj.ondispose = [obj.ondispose];
        } else obj.ondispose = [];
        obj.ondispose.push(...v2);
      };
      const __allocCString = function(str) {
        const u = __utf8Encoder.encode(str);
        const mem = alloc(u.length + 1);
        if (!mem) toss("Allocation error while duplicating string:", str);
        const h = heap();
        h.set(u, Number(mem));
        h[__ptrAdd(mem, u.length)] = 0;
        return mem;
      };
      const __setMemberCString = function(obj, memberName, str) {
        const m = __lookupMember(obj.structInfo, memberName, true);
        __affirmCStringSignature(m);
        const mem = __allocCString(str);
        obj[m.key] = mem;
        __addOnDispose(obj, mem);
        return obj;
      };
      const StructType = function StructType2(structName, structInfo) {
        if (arguments[2] !== rop) toss("Do not call the StructType constructor", "from client-level code.");
        Object.defineProperties(this, {
          structName: rop(structName),
          structInfo: rop(structInfo)
        });
      };
      StructType.prototype = Object.create(null, {
        dispose: rop(function() {
          __freeStruct(this.constructor, this);
        }),
        lookupMember: rop(function(memberName, tossIfNotFound = true) {
          return __lookupMember(this.structInfo, memberName, tossIfNotFound);
        }),
        memberToJsString: rop(function(memberName) {
          return __memberToJsString(this, memberName);
        }),
        memberIsString: rop(function(memberName, tossIfNotFound = true) {
          return __memberIsString(this, memberName, tossIfNotFound);
        }),
        memberKey: __memberKeyProp,
        memberKeys: __structMemberKeys,
        memberSignature: rop(function(memberName, emscriptenFormat = false) {
          return __memberSignature(this, memberName, emscriptenFormat);
        }),
        memoryDump: rop(function() {
          const p = this.pointer;
          return p ? new Uint8Array(heap().slice(Number(p), Number(p) + this.structInfo.sizeof)) : null;
        }),
        extraBytes: {
          configurable: false,
          enumerable: false,
          get: function() {
            return getInstanceHandle(this, false)?.xb ?? 0;
          }
        },
        zeroOnDispose: {
          configurable: false,
          enumerable: false,
          get: function() {
            return getInstanceHandle(this, false)?.zod ?? !!this.structInfo.zeroOnDispose;
          }
        },
        pointer: {
          configurable: false,
          enumerable: false,
          get: function() {
            return getInstanceHandle(this, false)?.p;
          },
          set: () => toss("Cannot assign the 'pointer' property of a struct.")
        },
        setMemberCString: rop(function(memberName, str) {
          return __setMemberCString(this, memberName, str);
        })
      });
      Object.assign(StructType.prototype, { addOnDispose: function(...v2) {
        __addOnDispose(this, ...v2);
        return this;
      } });
      Object.defineProperties(StructType, {
        allocCString: rop(__allocCString),
        isA: rop((v2) => v2 instanceof StructType),
        hasExternalPointer: rop((v2) => {
          const ii = getInstanceHandle(v2, false);
          return !!(ii?.p && !ii?.ownsPointer);
        }),
        memberKey: __memberKeyProp
      });
      const memberGetterProxy = function(si) {
        return si.get || (si.adaptGet ? StructBinder.adaptGet(si.adaptGet) : void 0);
      };
      const memberSetterProxy = function(si) {
        return si.set || (si.adaptSet ? StructBinder.adaptSet(si.adaptSet) : void 0);
      };
      const makeMemberStructWrapper = function callee3(ctor, name, si) {
        const __innerStructs = callee3.innerStructs ??= /* @__PURE__ */ new Map();
        const key = ctor.memberKey(name);
        if (void 0 !== si.signature) toss("'signature' cannot be used on an embedded struct (", ctor.structName, ".", key, ").");
        if (memberSetterProxy(si)) toss("'set' and 'adaptSet' are not permitted for nested struct members.");
        si.structName ??= ctor.structName + "::" + name;
        si.key = key;
        si.name = name;
        si.constructor = this.call(this, si.structName, si);
        const getterProxy = memberGetterProxy(si);
        const prop = Object.assign(/* @__PURE__ */ Object.create(null), {
          configurable: false,
          enumerable: false,
          set: __propThrowOnSet(ctor.structName, key),
          get: function() {
            const dbg = this.debugFlags.__flags;
            const p = this.pointer;
            const k2 = p + "." + key;
            let s = __innerStructs.get(k2);
            if (dbg.getter) log("debug.getter: k =", k2);
            if (!s) {
              s = new si.constructor(__ptrAdd(p, si.offset));
              __innerStructs.set(k2, s);
              this.addOnDispose(() => s.dispose());
              s.addOnDispose(() => __innerStructs.delete(k2));
            }
            if (getterProxy) s = getterProxy.apply(this, [s, key]);
            if (dbg.getter) log("debug.getter: result =", s);
            return s;
          }
        });
        Object.defineProperty(ctor.prototype, key, prop);
      };
      const makeMemberWrapper = function f(ctor, name, si) {
        si = __adaptStruct2(this, si);
        if (si.members) return makeMemberStructWrapper.call(this, ctor, name, si);
        if (!f.cache) {
          f.cache = {
            getters: {},
            setters: {},
            sw: {}
          };
          const a = [
            "i",
            "c",
            "C",
            "p",
            "P",
            "s",
            "f",
            "d",
            "v()"
          ];
          if (bigIntEnabled) a.push("j");
          a.forEach(function(v2) {
            f.cache.getters[v2] = sigDVGetter(v2);
            f.cache.setters[v2] = sigDVSetter(v2);
            f.cache.sw[v2] = sigDVSetWrapper(v2);
          });
          f.sigCheck = function(obj, name2, key2, sig) {
            if (Object.prototype.hasOwnProperty.call(obj, key2)) toss(obj.structName, "already has a property named", key2 + ".");
            looksLikeASig(sig) || toss("Malformed signature for", sPropName(obj.structName, name2) + ":", sig);
          };
        }
        const key = ctor.memberKey(name);
        f.sigCheck(ctor.prototype, name, key, si.signature);
        si.key = key;
        si.name = name;
        const sigGlyph = sigLetter(si.signature);
        const xPropName = sPropName(ctor.structName, key);
        const dbg = ctor.debugFlags.__flags;
        const getterProxy = memberGetterProxy(si);
        const prop = /* @__PURE__ */ Object.create(null);
        prop.configurable = false;
        prop.enumerable = false;
        prop.get = function() {
          if (dbg.getter) log("debug.getter:", f.cache.getters[sigGlyph], "for", sigIR(sigGlyph), xPropName, "@", this.pointer, "+", si.offset, "sz", si.sizeof);
          let rc = new DataView(heap().buffer, Number(this.pointer) + si.offset, si.sizeof)[f.cache.getters[sigGlyph]](0, isLittleEndian);
          if (getterProxy) rc = getterProxy.apply(this, [key, rc]);
          if (dbg.getter) log("debug.getter:", xPropName, "result =", rc);
          return rc;
        };
        if (si.readOnly) prop.set = __propThrowOnSet(ctor.prototype.structName, key);
        else {
          const setterProxy = memberSetterProxy(si);
          prop.set = function(v2) {
            if (dbg.setter) log("debug.setter:", f.cache.setters[sigGlyph], "for", sigIR(sigGlyph), xPropName, "@", this.pointer, "+", si.offset, "sz", si.sizeof, v2);
            if (!this.pointer) toss("Cannot set native property on a disposed", this.structName, "instance.");
            if (setterProxy) v2 = setterProxy.apply(this, [key, v2]);
            if (null === v2 || void 0 === v2) v2 = __NullPtr;
            else if (isPtrSig(si.signature) && !__isPtr(v2)) if (isAutoPtrSig(si.signature) && v2 instanceof StructType) {
              v2 = v2.pointer || __NullPtr;
              if (dbg.setter) log("debug.setter:", xPropName, "resolved to", v2);
            } else toss("Invalid value for pointer-type", xPropName + ".");
            new DataView(heap().buffer, Number(this.pointer) + si.offset, si.sizeof)[f.cache.setters[sigGlyph]](0, f.cache.sw[sigGlyph](v2), isLittleEndian);
          };
        }
        Object.defineProperty(ctor.prototype, key, prop);
      };
      const StructBinderImpl = function StructBinderImpl2(structName, si, opt = /* @__PURE__ */ Object.create(null)) {
        const StructCtor = function StructCtor2(arg) {
          if (!(this instanceof StructCtor2)) toss("The", structName, "constructor may only be called via 'new'.");
          __allocStruct(StructCtor2, this, ...arguments);
        };
        const self2 = this;
        const ads = (x) => {
          return "string" === typeof x && looksLikeASig(x) ? { signature: x } : __adaptStruct2(self2, x);
        };
        if (1 === arguments.length) {
          si = ads(structName);
          structName = si.structName || si.name;
        } else if (2 === arguments.length) {
          si = ads(si);
          si.name ??= structName;
        } else si = ads(si);
        structName ??= si.structName;
        structName ??= opt.structName;
        if (!structName) toss("One of 'name' or 'structName' are required.");
        if (si.adapt) {
          Object.keys(si.adapt.struct || {}).forEach((k2) => {
            __adaptStruct.call(StructBinderImpl2, k2, si.adapt.struct[k2]);
          });
          Object.keys(si.adapt.set || {}).forEach((k2) => {
            __adaptSet.call(StructBinderImpl2, k2, si.adapt.set[k2]);
          });
          Object.keys(si.adapt.get || {}).forEach((k2) => {
            __adaptGet.call(StructBinderImpl2, k2, si.adapt.get[k2]);
          });
        }
        if (!si.members && !si.sizeof) si.sizeof = sigSize(si.signature);
        const debugFlags = rop(SBF.__makeDebugFlags(StructBinder.debugFlags));
        Object.defineProperties(StructCtor, {
          debugFlags,
          isA: rop((v2) => v2 instanceof StructCtor),
          memberKey: __memberKeyProp,
          memberKeys: __structMemberKeys,
          structInfo: rop(si),
          structName: rop(structName),
          ptrAdd: rop(__ptrAdd)
        });
        StructCtor.prototype = new StructType(structName, si, rop);
        Object.defineProperties(StructCtor.prototype, {
          debugFlags,
          constructor: rop(StructCtor),
          ptrAdd: rop(__ptrAddSelf)
        });
        let lastMember = false;
        let offset = 0;
        const autoCalc = !!si.autoCalcSizeOffset;
        if (!autoCalc) {
          if (!si.sizeof) toss(structName, "description is missing its sizeof property.");
          si.offset ??= 0;
        } else si.offset ??= 0;
        Object.keys(si.members || {}).forEach((k2) => {
          let m = ads(si.members[k2]);
          if (!m.members && !m.sizeof) {
            m.sizeof = sigSize(m.signature);
            if (!m.sizeof) toss(sPropName(structName, k2), "is missing a sizeof property.", m);
          }
          if (void 0 === m.offset) if (autoCalc) m.offset = offset;
          else toss(sPropName(structName, k2), "is missing its offset.", JSON.stringify(m));
          si.members[k2] = m;
          if (!lastMember || lastMember.offset < m.offset) lastMember = m;
          const oldAutoCalc = !!m.autoCalc;
          if (autoCalc) m.autoCalcSizeOffset = true;
          makeMemberWrapper.call(self2, StructCtor, k2, m);
          if (oldAutoCalc) m.autoCalcSizeOffset = true;
          else delete m.autoCalcSizeOffset;
          offset += m.sizeof;
        });
        if (!lastMember) toss("No member property descriptions found.");
        if (!si.sizeof) si.sizeof = offset;
        if (si.sizeof === 1) si.signature === "c" || si.signature === "C" || toss("Unexpected sizeof==1 member", sPropName(structName, k), "with signature", si.signature);
        else {
          if (0 !== si.sizeof % 4) {
            console.warn("Invalid struct member description", si);
            toss(structName, "sizeof is not aligned. sizeof=" + si.sizeof);
          }
          if (0 !== si.offset % 4) {
            console.warn("Invalid struct member description", si);
            toss(structName, "offset is not aligned. offset=" + si.offset);
          }
        }
        if (si.sizeof < offset) {
          console.warn("Suspect struct description:", si, "offset =", offset);
          toss("Mismatch in the calculated vs. the provided sizeof/offset info.", "Expected sizeof", offset, "but got", si.sizeof, "for", si);
        }
        delete si.autoCalcSizeOffset;
        return StructCtor;
      };
      const StructBinder = function StructBinder2(structName, structInfo) {
        return 1 == arguments.length ? StructBinderImpl.call(StructBinder2, structName) : StructBinderImpl.call(StructBinder2, structName, structInfo);
      };
      StructBinder.StructType = StructType;
      StructBinder.config = config;
      StructBinder.allocCString = __allocCString;
      StructBinder.adaptGet = __adaptGet;
      StructBinder.adaptSet = __adaptSet;
      StructBinder.adaptStruct = __adaptStruct;
      StructBinder.ptrAdd = __ptrAdd;
      if (!StructBinder.debugFlags) StructBinder.debugFlags = SBF.__makeDebugFlags(SBF.debugFlags);
      return StructBinder;
    };
    globalThis.sqlite3ApiBootstrap.initializers.push(function(sqlite3) {
      "use strict";
      const toss = (...args) => {
        throw new Error(args.join(" "));
      };
      const capi = sqlite3.capi, wasm = sqlite3.wasm, util = sqlite3.util;
      globalThis.WhWasmUtilInstaller(wasm);
      delete globalThis.WhWasmUtilInstaller;
      const bindingSignatures = {
        core: [
          [
            "sqlite3_aggregate_context",
            "void*",
            "sqlite3_context*",
            "int"
          ],
          [
            "sqlite3_bind_double",
            "int",
            "sqlite3_stmt*",
            "int",
            "f64"
          ],
          [
            "sqlite3_bind_int",
            "int",
            "sqlite3_stmt*",
            "int",
            "int"
          ],
          [
            "sqlite3_bind_null",
            void 0,
            "sqlite3_stmt*",
            "int"
          ],
          [
            "sqlite3_bind_parameter_count",
            "int",
            "sqlite3_stmt*"
          ],
          [
            "sqlite3_bind_parameter_index",
            "int",
            "sqlite3_stmt*",
            "string"
          ],
          [
            "sqlite3_bind_parameter_name",
            "string",
            "sqlite3_stmt*",
            "int"
          ],
          [
            "sqlite3_bind_pointer",
            "int",
            "sqlite3_stmt*",
            "int",
            "*",
            "string:static",
            "*"
          ],
          [
            "sqlite3_bind_zeroblob",
            "int",
            "sqlite3_stmt*",
            "int",
            "int"
          ],
          [
            "sqlite3_busy_handler",
            "int",
            [
              "sqlite3*",
              new wasm.xWrap.FuncPtrAdapter({
                signature: "i(pi)",
                contextKey: (argv, argIndex) => argv[0]
              }),
              "*"
            ]
          ],
          [
            "sqlite3_busy_timeout",
            "int",
            "sqlite3*",
            "int"
          ],
          [
            "sqlite3_changes",
            "int",
            "sqlite3*"
          ],
          [
            "sqlite3_clear_bindings",
            "int",
            "sqlite3_stmt*"
          ],
          [
            "sqlite3_collation_needed",
            "int",
            "sqlite3*",
            "*",
            "*"
          ],
          [
            "sqlite3_column_blob",
            "*",
            "sqlite3_stmt*",
            "int"
          ],
          [
            "sqlite3_column_bytes",
            "int",
            "sqlite3_stmt*",
            "int"
          ],
          [
            "sqlite3_column_count",
            "int",
            "sqlite3_stmt*"
          ],
          [
            "sqlite3_column_decltype",
            "string",
            "sqlite3_stmt*",
            "int"
          ],
          [
            "sqlite3_column_double",
            "f64",
            "sqlite3_stmt*",
            "int"
          ],
          [
            "sqlite3_column_int",
            "int",
            "sqlite3_stmt*",
            "int"
          ],
          [
            "sqlite3_column_name",
            "string",
            "sqlite3_stmt*",
            "int"
          ],
          [
            "sqlite3_column_type",
            "int",
            "sqlite3_stmt*",
            "int"
          ],
          [
            "sqlite3_column_value",
            "sqlite3_value*",
            "sqlite3_stmt*",
            "int"
          ],
          [
            "sqlite3_commit_hook",
            "void*",
            [
              "sqlite3*",
              new wasm.xWrap.FuncPtrAdapter({
                name: "sqlite3_commit_hook",
                signature: "i(p)",
                contextKey: (argv) => argv[0]
              }),
              "*"
            ]
          ],
          [
            "sqlite3_compileoption_get",
            "string",
            "int"
          ],
          [
            "sqlite3_compileoption_used",
            "int",
            "string"
          ],
          [
            "sqlite3_complete",
            "int",
            "string:flexible"
          ],
          [
            "sqlite3_context_db_handle",
            "sqlite3*",
            "sqlite3_context*"
          ],
          [
            "sqlite3_data_count",
            "int",
            "sqlite3_stmt*"
          ],
          [
            "sqlite3_db_filename",
            "string",
            "sqlite3*",
            "string"
          ],
          [
            "sqlite3_db_handle",
            "sqlite3*",
            "sqlite3_stmt*"
          ],
          [
            "sqlite3_db_name",
            "string",
            "sqlite3*",
            "int"
          ],
          [
            "sqlite3_db_readonly",
            "int",
            "sqlite3*",
            "string"
          ],
          [
            "sqlite3_db_status",
            "int",
            "sqlite3*",
            "int",
            "*",
            "*",
            "int"
          ],
          [
            "sqlite3_errcode",
            "int",
            "sqlite3*"
          ],
          [
            "sqlite3_errmsg",
            "string",
            "sqlite3*"
          ],
          [
            "sqlite3_error_offset",
            "int",
            "sqlite3*"
          ],
          [
            "sqlite3_errstr",
            "string",
            "int"
          ],
          [
            "sqlite3_exec",
            "int",
            [
              "sqlite3*",
              "string:flexible",
              new wasm.xWrap.FuncPtrAdapter({
                signature: "i(pipp)",
                bindScope: "transient",
                callProxy: (callback) => {
                  let aNames;
                  return (pVoid, nCols, pColVals, pColNames) => {
                    try {
                      const aVals = wasm.cArgvToJs(nCols, pColVals);
                      if (!aNames) aNames = wasm.cArgvToJs(nCols, pColNames);
                      return callback(aVals, aNames) | 0;
                    } catch (e) {
                      return e.resultCode || capi.SQLITE_ERROR;
                    }
                  };
                }
              }),
              "*",
              "**"
            ]
          ],
          [
            "sqlite3_expanded_sql",
            "string",
            "sqlite3_stmt*"
          ],
          [
            "sqlite3_extended_errcode",
            "int",
            "sqlite3*"
          ],
          [
            "sqlite3_extended_result_codes",
            "int",
            "sqlite3*",
            "int"
          ],
          [
            "sqlite3_file_control",
            "int",
            "sqlite3*",
            "string",
            "int",
            "*"
          ],
          [
            "sqlite3_finalize",
            "int",
            "sqlite3_stmt*"
          ],
          [
            "sqlite3_free",
            void 0,
            "*"
          ],
          [
            "sqlite3_get_autocommit",
            "int",
            "sqlite3*"
          ],
          [
            "sqlite3_get_auxdata",
            "*",
            "sqlite3_context*",
            "int"
          ],
          ["sqlite3_initialize", void 0],
          [
            "sqlite3_interrupt",
            void 0,
            "sqlite3*"
          ],
          [
            "sqlite3_is_interrupted",
            "int",
            "sqlite3*"
          ],
          ["sqlite3_keyword_count", "int"],
          [
            "sqlite3_keyword_name",
            "int",
            [
              "int",
              "**",
              "*"
            ]
          ],
          [
            "sqlite3_keyword_check",
            "int",
            ["string", "int"]
          ],
          ["sqlite3_libversion", "string"],
          ["sqlite3_libversion_number", "int"],
          [
            "sqlite3_limit",
            "int",
            [
              "sqlite3*",
              "int",
              "int"
            ]
          ],
          [
            "sqlite3_malloc",
            "*",
            "int"
          ],
          [
            "sqlite3_next_stmt",
            "sqlite3_stmt*",
            ["sqlite3*", "sqlite3_stmt*"]
          ],
          [
            "sqlite3_open",
            "int",
            "string",
            "*"
          ],
          [
            "sqlite3_open_v2",
            "int",
            "string",
            "*",
            "int",
            "string"
          ],
          [
            "sqlite3_realloc",
            "*",
            "*",
            "int"
          ],
          [
            "sqlite3_reset",
            "int",
            "sqlite3_stmt*"
          ],
          [
            "sqlite3_result_blob",
            void 0,
            "sqlite3_context*",
            "*",
            "int",
            "*"
          ],
          [
            "sqlite3_result_double",
            void 0,
            "sqlite3_context*",
            "f64"
          ],
          [
            "sqlite3_result_error",
            void 0,
            "sqlite3_context*",
            "string",
            "int"
          ],
          [
            "sqlite3_result_error_code",
            void 0,
            "sqlite3_context*",
            "int"
          ],
          [
            "sqlite3_result_error_nomem",
            void 0,
            "sqlite3_context*"
          ],
          [
            "sqlite3_result_error_toobig",
            void 0,
            "sqlite3_context*"
          ],
          [
            "sqlite3_result_int",
            void 0,
            "sqlite3_context*",
            "int"
          ],
          [
            "sqlite3_result_null",
            void 0,
            "sqlite3_context*"
          ],
          [
            "sqlite3_result_pointer",
            void 0,
            "sqlite3_context*",
            "*",
            "string:static",
            "*"
          ],
          [
            "sqlite3_result_subtype",
            void 0,
            "sqlite3_value*",
            "int"
          ],
          [
            "sqlite3_result_text",
            void 0,
            "sqlite3_context*",
            "string",
            "int",
            "*"
          ],
          [
            "sqlite3_result_zeroblob",
            void 0,
            "sqlite3_context*",
            "int"
          ],
          [
            "sqlite3_rollback_hook",
            "void*",
            [
              "sqlite3*",
              new wasm.xWrap.FuncPtrAdapter({
                name: "sqlite3_rollback_hook",
                signature: "v(p)",
                contextKey: (argv) => argv[0]
              }),
              "*"
            ]
          ],
          [
            "sqlite3_set_auxdata",
            void 0,
            [
              "sqlite3_context*",
              "int",
              "*",
              "*"
            ]
          ],
          [
            "sqlite3_set_errmsg",
            "int",
            "sqlite3*",
            "int",
            "string"
          ],
          ["sqlite3_shutdown", void 0],
          ["sqlite3_sourceid", "string"],
          [
            "sqlite3_sql",
            "string",
            "sqlite3_stmt*"
          ],
          [
            "sqlite3_status",
            "int",
            "int",
            "*",
            "*",
            "int"
          ],
          [
            "sqlite3_step",
            "int",
            "sqlite3_stmt*"
          ],
          [
            "sqlite3_stmt_busy",
            "int",
            "sqlite3_stmt*"
          ],
          [
            "sqlite3_stmt_readonly",
            "int",
            "sqlite3_stmt*"
          ],
          [
            "sqlite3_stmt_status",
            "int",
            "sqlite3_stmt*",
            "int",
            "int"
          ],
          [
            "sqlite3_strglob",
            "int",
            "string",
            "string"
          ],
          [
            "sqlite3_stricmp",
            "int",
            "string",
            "string"
          ],
          [
            "sqlite3_strlike",
            "int",
            "string",
            "string",
            "int"
          ],
          [
            "sqlite3_strnicmp",
            "int",
            "string",
            "string",
            "int"
          ],
          [
            "sqlite3_table_column_metadata",
            "int",
            "sqlite3*",
            "string",
            "string",
            "string",
            "**",
            "**",
            "*",
            "*",
            "*"
          ],
          [
            "sqlite3_total_changes",
            "int",
            "sqlite3*"
          ],
          [
            "sqlite3_trace_v2",
            "int",
            [
              "sqlite3*",
              "int",
              new wasm.xWrap.FuncPtrAdapter({
                name: "sqlite3_trace_v2::callback",
                signature: "i(ippp)",
                contextKey: (argv, argIndex) => argv[0]
              }),
              "*"
            ]
          ],
          [
            "sqlite3_txn_state",
            "int",
            ["sqlite3*", "string"]
          ],
          [
            "sqlite3_uri_boolean",
            "int",
            "sqlite3_filename",
            "string",
            "int"
          ],
          [
            "sqlite3_uri_key",
            "string",
            "sqlite3_filename",
            "int"
          ],
          [
            "sqlite3_uri_parameter",
            "string",
            "sqlite3_filename",
            "string"
          ],
          [
            "sqlite3_user_data",
            "void*",
            "sqlite3_context*"
          ],
          [
            "sqlite3_value_blob",
            "*",
            "sqlite3_value*"
          ],
          [
            "sqlite3_value_bytes",
            "int",
            "sqlite3_value*"
          ],
          [
            "sqlite3_value_double",
            "f64",
            "sqlite3_value*"
          ],
          [
            "sqlite3_value_dup",
            "sqlite3_value*",
            "sqlite3_value*"
          ],
          [
            "sqlite3_value_free",
            void 0,
            "sqlite3_value*"
          ],
          [
            "sqlite3_value_frombind",
            "int",
            "sqlite3_value*"
          ],
          [
            "sqlite3_value_int",
            "int",
            "sqlite3_value*"
          ],
          [
            "sqlite3_value_nochange",
            "int",
            "sqlite3_value*"
          ],
          [
            "sqlite3_value_numeric_type",
            "int",
            "sqlite3_value*"
          ],
          [
            "sqlite3_value_pointer",
            "*",
            "sqlite3_value*",
            "string:static"
          ],
          [
            "sqlite3_value_subtype",
            "int",
            "sqlite3_value*"
          ],
          [
            "sqlite3_value_type",
            "int",
            "sqlite3_value*"
          ],
          [
            "sqlite3_vfs_find",
            "*",
            "string"
          ],
          [
            "sqlite3_vfs_register",
            "int",
            "sqlite3_vfs*",
            "int"
          ],
          [
            "sqlite3_vfs_unregister",
            "int",
            "sqlite3_vfs*"
          ]
        ],
        int64: [
          [
            "sqlite3_bind_int64",
            "int",
            [
              "sqlite3_stmt*",
              "int",
              "i64"
            ]
          ],
          [
            "sqlite3_changes64",
            "i64",
            ["sqlite3*"]
          ],
          [
            "sqlite3_column_int64",
            "i64",
            ["sqlite3_stmt*", "int"]
          ],
          [
            "sqlite3_deserialize",
            "int",
            "sqlite3*",
            "string",
            "*",
            "i64",
            "i64",
            "int"
          ],
          [
            "sqlite3_last_insert_rowid",
            "i64",
            ["sqlite3*"]
          ],
          [
            "sqlite3_malloc64",
            "*",
            "i64"
          ],
          [
            "sqlite3_msize",
            "i64",
            "*"
          ],
          [
            "sqlite3_overload_function",
            "int",
            [
              "sqlite3*",
              "string",
              "int"
            ]
          ],
          [
            "sqlite3_realloc64",
            "*",
            "*",
            "i64"
          ],
          [
            "sqlite3_result_int64",
            void 0,
            "*",
            "i64"
          ],
          [
            "sqlite3_result_zeroblob64",
            "int",
            "*",
            "i64"
          ],
          [
            "sqlite3_serialize",
            "*",
            "sqlite3*",
            "string",
            "*",
            "int"
          ],
          [
            "sqlite3_set_last_insert_rowid",
            void 0,
            ["sqlite3*", "i64"]
          ],
          [
            "sqlite3_status64",
            "int",
            "int",
            "*",
            "*",
            "int"
          ],
          [
            "sqlite3_db_status64",
            "int",
            "sqlite3*",
            "int",
            "*",
            "*",
            "int"
          ],
          [
            "sqlite3_total_changes64",
            "i64",
            ["sqlite3*"]
          ],
          [
            "sqlite3_update_hook",
            "*",
            [
              "sqlite3*",
              new wasm.xWrap.FuncPtrAdapter({
                name: "sqlite3_update_hook::callback",
                signature: "v(pippj)",
                contextKey: (argv) => argv[0],
                callProxy: (callback) => {
                  return (p, op, z0, z1, rowid) => {
                    callback(p, op, wasm.cstrToJs(z0), wasm.cstrToJs(z1), rowid);
                  };
                }
              }),
              "*"
            ]
          ],
          [
            "sqlite3_uri_int64",
            "i64",
            [
              "sqlite3_filename",
              "string",
              "i64"
            ]
          ],
          [
            "sqlite3_value_int64",
            "i64",
            "sqlite3_value*"
          ]
        ],
        wasmInternal: [
          [
            "sqlite3__wasm_db_reset",
            "int",
            "sqlite3*"
          ],
          [
            "sqlite3__wasm_db_vfs",
            "sqlite3_vfs*",
            "sqlite3*",
            "string"
          ],
          [
            "sqlite3__wasm_vfs_create_file",
            "int",
            "sqlite3_vfs*",
            "string",
            "*",
            "int"
          ],
          [
            "sqlite3__wasm_posix_create_file",
            "int",
            "string",
            "*",
            "int"
          ],
          [
            "sqlite3__wasm_vfs_unlink",
            "int",
            "sqlite3_vfs*",
            "string"
          ],
          [
            "sqlite3__wasm_qfmt_token",
            "string:dealloc",
            "string",
            "int"
          ]
        ]
      };
      if (!!wasm.exports.sqlite3_progress_handler) bindingSignatures.core.push([
        "sqlite3_progress_handler",
        void 0,
        [
          "sqlite3*",
          "int",
          new wasm.xWrap.FuncPtrAdapter({
            name: "xProgressHandler",
            signature: "i(p)",
            bindScope: "context",
            contextKey: (argv, argIndex) => argv[0]
          }),
          "*"
        ]
      ]);
      if (!!wasm.exports.sqlite3_stmt_explain) bindingSignatures.core.push([
        "sqlite3_stmt_explain",
        "int",
        "sqlite3_stmt*",
        "int"
      ], [
        "sqlite3_stmt_isexplain",
        "int",
        "sqlite3_stmt*"
      ]);
      if (!!wasm.exports.sqlite3_set_authorizer) bindingSignatures.core.push([
        "sqlite3_set_authorizer",
        "int",
        [
          "sqlite3*",
          new wasm.xWrap.FuncPtrAdapter({
            name: "sqlite3_set_authorizer::xAuth",
            signature: "i(pissss)",
            contextKey: (argv, argIndex) => argv[0],
            callProxy: (callback) => {
              return (pV, iCode, s0, s1, s2, s3) => {
                try {
                  s0 = s0 && wasm.cstrToJs(s0);
                  s1 = s1 && wasm.cstrToJs(s1);
                  s2 = s2 && wasm.cstrToJs(s2);
                  s3 = s3 && wasm.cstrToJs(s3);
                  return callback(pV, iCode, s0, s1, s2, s3) | 0;
                } catch (e) {
                  return e.resultCode || capi.SQLITE_ERROR;
                }
              };
            }
          }),
          "*"
        ]
      ]);
      if (!!wasm.exports.sqlite3_column_origin_name) bindingSignatures.core.push([
        "sqlite3_column_database_name",
        "string",
        "sqlite3_stmt*",
        "int"
      ], [
        "sqlite3_column_origin_name",
        "string",
        "sqlite3_stmt*",
        "int"
      ], [
        "sqlite3_column_table_name",
        "string",
        "sqlite3_stmt*",
        "int"
      ]);
      if (wasm.bigIntEnabled && !!wasm.exports.sqlite3_declare_vtab) bindingSignatures.int64.push([
        "sqlite3_create_module",
        "int",
        [
          "sqlite3*",
          "string",
          "sqlite3_module*",
          "*"
        ]
      ], [
        "sqlite3_create_module_v2",
        "int",
        [
          "sqlite3*",
          "string",
          "sqlite3_module*",
          "*",
          "*"
        ]
      ], [
        "sqlite3_declare_vtab",
        "int",
        ["sqlite3*", "string:flexible"]
      ], [
        "sqlite3_drop_modules",
        "int",
        ["sqlite3*", "**"]
      ], [
        "sqlite3_vtab_collation",
        "string",
        "sqlite3_index_info*",
        "int"
      ], [
        "sqlite3_vtab_distinct",
        "int",
        "sqlite3_index_info*"
      ], [
        "sqlite3_vtab_in",
        "int",
        "sqlite3_index_info*",
        "int",
        "int"
      ], [
        "sqlite3_vtab_in_first",
        "int",
        "sqlite3_value*",
        "**"
      ], [
        "sqlite3_vtab_in_next",
        "int",
        "sqlite3_value*",
        "**"
      ], [
        "sqlite3_vtab_nochange",
        "int",
        "sqlite3_context*"
      ], [
        "sqlite3_vtab_on_conflict",
        "int",
        "sqlite3*"
      ], [
        "sqlite3_vtab_rhs_value",
        "int",
        "sqlite3_index_info*",
        "int",
        "**"
      ]);
      if (wasm.bigIntEnabled && !!wasm.exports.sqlite3_preupdate_hook) bindingSignatures.int64.push([
        "sqlite3_preupdate_blobwrite",
        "int",
        "sqlite3*"
      ], [
        "sqlite3_preupdate_count",
        "int",
        "sqlite3*"
      ], [
        "sqlite3_preupdate_depth",
        "int",
        "sqlite3*"
      ], [
        "sqlite3_preupdate_hook",
        "*",
        [
          "sqlite3*",
          new wasm.xWrap.FuncPtrAdapter({
            name: "sqlite3_preupdate_hook",
            signature: "v(ppippjj)",
            contextKey: (argv) => argv[0],
            callProxy: (callback) => {
              return (p, db, op, zDb, zTbl, iKey1, iKey2) => {
                callback(p, db, op, wasm.cstrToJs(zDb), wasm.cstrToJs(zTbl), iKey1, iKey2);
              };
            }
          }),
          "*"
        ]
      ], [
        "sqlite3_preupdate_new",
        "int",
        [
          "sqlite3*",
          "int",
          "**"
        ]
      ], [
        "sqlite3_preupdate_old",
        "int",
        [
          "sqlite3*",
          "int",
          "**"
        ]
      ]);
      if (wasm.bigIntEnabled && !!wasm.exports.sqlite3changegroup_add && !!wasm.exports.sqlite3session_create && !!wasm.exports.sqlite3_preupdate_hook) {
        const __ipsProxy = {
          signature: "i(ps)",
          callProxy: (callback) => {
            return (p, s) => {
              try {
                return callback(p, wasm.cstrToJs(s)) | 0;
              } catch (e) {
                return e.resultCode || capi.SQLITE_ERROR;
              }
            };
          }
        };
        bindingSignatures.int64.push([
          "sqlite3changegroup_add",
          "int",
          [
            "sqlite3_changegroup*",
            "int",
            "void*"
          ]
        ], [
          "sqlite3changegroup_add_strm",
          "int",
          [
            "sqlite3_changegroup*",
            new wasm.xWrap.FuncPtrAdapter({
              name: "xInput",
              signature: "i(ppp)",
              bindScope: "transient"
            }),
            "void*"
          ]
        ], [
          "sqlite3changegroup_delete",
          void 0,
          ["sqlite3_changegroup*"]
        ], [
          "sqlite3changegroup_new",
          "int",
          ["**"]
        ], [
          "sqlite3changegroup_output",
          "int",
          [
            "sqlite3_changegroup*",
            "int*",
            "**"
          ]
        ], [
          "sqlite3changegroup_output_strm",
          "int",
          [
            "sqlite3_changegroup*",
            new wasm.xWrap.FuncPtrAdapter({
              name: "xOutput",
              signature: "i(ppi)",
              bindScope: "transient"
            }),
            "void*"
          ]
        ], [
          "sqlite3changeset_apply",
          "int",
          [
            "sqlite3*",
            "int",
            "void*",
            new wasm.xWrap.FuncPtrAdapter({
              name: "xFilter",
              bindScope: "transient",
              ...__ipsProxy
            }),
            new wasm.xWrap.FuncPtrAdapter({
              name: "xConflict",
              signature: "i(pip)",
              bindScope: "transient"
            }),
            "void*"
          ]
        ], [
          "sqlite3changeset_apply_strm",
          "int",
          [
            "sqlite3*",
            new wasm.xWrap.FuncPtrAdapter({
              name: "xInput",
              signature: "i(ppp)",
              bindScope: "transient"
            }),
            "void*",
            new wasm.xWrap.FuncPtrAdapter({
              name: "xFilter",
              bindScope: "transient",
              ...__ipsProxy
            }),
            new wasm.xWrap.FuncPtrAdapter({
              name: "xConflict",
              signature: "i(pip)",
              bindScope: "transient"
            }),
            "void*"
          ]
        ], [
          "sqlite3changeset_apply_v2",
          "int",
          [
            "sqlite3*",
            "int",
            "void*",
            new wasm.xWrap.FuncPtrAdapter({
              name: "xFilter",
              bindScope: "transient",
              ...__ipsProxy
            }),
            new wasm.xWrap.FuncPtrAdapter({
              name: "xConflict",
              signature: "i(pip)",
              bindScope: "transient"
            }),
            "void*",
            "**",
            "int*",
            "int"
          ]
        ], [
          "sqlite3changeset_apply_v2_strm",
          "int",
          [
            "sqlite3*",
            new wasm.xWrap.FuncPtrAdapter({
              name: "xInput",
              signature: "i(ppp)",
              bindScope: "transient"
            }),
            "void*",
            new wasm.xWrap.FuncPtrAdapter({
              name: "xFilter",
              bindScope: "transient",
              ...__ipsProxy
            }),
            new wasm.xWrap.FuncPtrAdapter({
              name: "xConflict",
              signature: "i(pip)",
              bindScope: "transient"
            }),
            "void*",
            "**",
            "int*",
            "int"
          ]
        ], [
          "sqlite3changeset_apply_v3",
          "int",
          [
            "sqlite3*",
            "int",
            "void*",
            new wasm.xWrap.FuncPtrAdapter({
              name: "xFilter",
              signature: "i(pp)",
              bindScope: "transient"
            }),
            new wasm.xWrap.FuncPtrAdapter({
              name: "xConflict",
              signature: "i(pip)",
              bindScope: "transient"
            }),
            "void*",
            "**",
            "int*",
            "int"
          ]
        ], [
          "sqlite3changeset_apply_v3_strm",
          "int",
          [
            "sqlite3*",
            new wasm.xWrap.FuncPtrAdapter({
              name: "xInput",
              signature: "i(ppp)",
              bindScope: "transient"
            }),
            "void*",
            new wasm.xWrap.FuncPtrAdapter({
              name: "xFilter",
              signature: "i(pp)",
              bindScope: "transient"
            }),
            new wasm.xWrap.FuncPtrAdapter({
              name: "xConflict",
              signature: "i(pip)",
              bindScope: "transient"
            }),
            "void*",
            "**",
            "int*",
            "int"
          ]
        ], [
          "sqlite3changeset_concat",
          "int",
          [
            "int",
            "void*",
            "int",
            "void*",
            "int*",
            "**"
          ]
        ], [
          "sqlite3changeset_concat_strm",
          "int",
          [
            new wasm.xWrap.FuncPtrAdapter({
              name: "xInputA",
              signature: "i(ppp)",
              bindScope: "transient"
            }),
            "void*",
            new wasm.xWrap.FuncPtrAdapter({
              name: "xInputB",
              signature: "i(ppp)",
              bindScope: "transient"
            }),
            "void*",
            new wasm.xWrap.FuncPtrAdapter({
              name: "xOutput",
              signature: "i(ppi)",
              bindScope: "transient"
            }),
            "void*"
          ]
        ], [
          "sqlite3changeset_conflict",
          "int",
          [
            "sqlite3_changeset_iter*",
            "int",
            "**"
          ]
        ], [
          "sqlite3changeset_finalize",
          "int",
          ["sqlite3_changeset_iter*"]
        ], [
          "sqlite3changeset_fk_conflicts",
          "int",
          ["sqlite3_changeset_iter*", "int*"]
        ], [
          "sqlite3changeset_invert",
          "int",
          [
            "int",
            "void*",
            "int*",
            "**"
          ]
        ], [
          "sqlite3changeset_invert_strm",
          "int",
          [
            new wasm.xWrap.FuncPtrAdapter({
              name: "xInput",
              signature: "i(ppp)",
              bindScope: "transient"
            }),
            "void*",
            new wasm.xWrap.FuncPtrAdapter({
              name: "xOutput",
              signature: "i(ppi)",
              bindScope: "transient"
            }),
            "void*"
          ]
        ], [
          "sqlite3changeset_new",
          "int",
          [
            "sqlite3_changeset_iter*",
            "int",
            "**"
          ]
        ], [
          "sqlite3changeset_next",
          "int",
          ["sqlite3_changeset_iter*"]
        ], [
          "sqlite3changeset_old",
          "int",
          [
            "sqlite3_changeset_iter*",
            "int",
            "**"
          ]
        ], [
          "sqlite3changeset_op",
          "int",
          [
            "sqlite3_changeset_iter*",
            "**",
            "int*",
            "int*",
            "int*"
          ]
        ], [
          "sqlite3changeset_pk",
          "int",
          [
            "sqlite3_changeset_iter*",
            "**",
            "int*"
          ]
        ], [
          "sqlite3changeset_start",
          "int",
          [
            "**",
            "int",
            "*"
          ]
        ], [
          "sqlite3changeset_start_strm",
          "int",
          [
            "**",
            new wasm.xWrap.FuncPtrAdapter({
              name: "xInput",
              signature: "i(ppp)",
              bindScope: "transient"
            }),
            "void*"
          ]
        ], [
          "sqlite3changeset_start_v2",
          "int",
          [
            "**",
            "int",
            "*",
            "int"
          ]
        ], [
          "sqlite3changeset_start_v2_strm",
          "int",
          [
            "**",
            new wasm.xWrap.FuncPtrAdapter({
              name: "xInput",
              signature: "i(ppp)",
              bindScope: "transient"
            }),
            "void*",
            "int"
          ]
        ], [
          "sqlite3session_attach",
          "int",
          ["sqlite3_session*", "string"]
        ], [
          "sqlite3session_changeset",
          "int",
          [
            "sqlite3_session*",
            "int*",
            "**"
          ]
        ], [
          "sqlite3session_changeset_size",
          "i64",
          ["sqlite3_session*"]
        ], [
          "sqlite3session_changeset_strm",
          "int",
          [
            "sqlite3_session*",
            new wasm.xWrap.FuncPtrAdapter({
              name: "xOutput",
              signature: "i(ppp)",
              bindScope: "transient"
            }),
            "void*"
          ]
        ], [
          "sqlite3session_config",
          "int",
          ["int", "void*"]
        ], [
          "sqlite3session_create",
          "int",
          [
            "sqlite3*",
            "string",
            "**"
          ]
        ], [
          "sqlite3session_diff",
          "int",
          [
            "sqlite3_session*",
            "string",
            "string",
            "**"
          ]
        ], [
          "sqlite3session_enable",
          "int",
          ["sqlite3_session*", "int"]
        ], [
          "sqlite3session_indirect",
          "int",
          ["sqlite3_session*", "int"]
        ], [
          "sqlite3session_isempty",
          "int",
          ["sqlite3_session*"]
        ], [
          "sqlite3session_memory_used",
          "i64",
          ["sqlite3_session*"]
        ], [
          "sqlite3session_object_config",
          "int",
          [
            "sqlite3_session*",
            "int",
            "void*"
          ]
        ], [
          "sqlite3session_patchset",
          "int",
          [
            "sqlite3_session*",
            "*",
            "**"
          ]
        ], [
          "sqlite3session_patchset_strm",
          "int",
          [
            "sqlite3_session*",
            new wasm.xWrap.FuncPtrAdapter({
              name: "xOutput",
              signature: "i(ppp)",
              bindScope: "transient"
            }),
            "void*"
          ]
        ], [
          "sqlite3session_table_filter",
          void 0,
          [
            "sqlite3_session*",
            new wasm.xWrap.FuncPtrAdapter({
              name: "xFilter",
              ...__ipsProxy,
              contextKey: (argv, argIndex) => argv[0]
            }),
            "*"
          ]
        ]);
      }
      sqlite3.StructBinder = globalThis.Jaccwabyt({
        heap: wasm.heap8u,
        alloc: wasm.alloc,
        dealloc: wasm.dealloc,
        bigIntEnabled: wasm.bigIntEnabled,
        pointerIR: wasm.ptr.ir,
        memberPrefix: "$"
      });
      delete globalThis.Jaccwabyt;
      {
        const __xString = wasm.xWrap.argAdapter("string");
        wasm.xWrap.argAdapter("string:flexible", (v2) => __xString(util.flexibleString(v2)));
        wasm.xWrap.argAdapter("string:static", function(v2) {
          if (wasm.isPtr(v2)) return v2;
          v2 = "" + v2;
          return this[v2] || (this[v2] = wasm.allocCString(v2));
        }.bind(/* @__PURE__ */ Object.create(null)));
        const __xArgPtr = wasm.xWrap.argAdapter("*");
        const nilType = function() {
        };
        wasm.xWrap.argAdapter("sqlite3_filename", __xArgPtr)("sqlite3_context*", __xArgPtr)("sqlite3_value*", __xArgPtr)("void*", __xArgPtr)("sqlite3_changegroup*", __xArgPtr)("sqlite3_changeset_iter*", __xArgPtr)("sqlite3_session*", __xArgPtr)("sqlite3_stmt*", (v2) => __xArgPtr(v2 instanceof (sqlite3?.oo1?.Stmt || nilType) ? v2.pointer : v2))("sqlite3*", (v2) => __xArgPtr(v2 instanceof (sqlite3?.oo1?.DB || nilType) ? v2.pointer : v2))("sqlite3_vfs*", (v2) => {
          if ("string" === typeof v2) return capi.sqlite3_vfs_find(v2) || sqlite3.SQLite3Error.toss(capi.SQLITE_NOTFOUND, "Unknown sqlite3_vfs name:", v2);
          return __xArgPtr(v2 instanceof (capi.sqlite3_vfs || nilType) ? v2.pointer : v2);
        });
        if (wasm.exports.sqlite3_declare_vtab) wasm.xWrap.argAdapter("sqlite3_index_info*", (v2) => __xArgPtr(v2 instanceof (capi.sqlite3_index_info || nilType) ? v2.pointer : v2))("sqlite3_module*", (v2) => __xArgPtr(v2 instanceof (capi.sqlite3_module || nilType) ? v2.pointer : v2));
        const __xRcPtr = wasm.xWrap.resultAdapter("*");
        wasm.xWrap.resultAdapter("sqlite3*", __xRcPtr)("sqlite3_context*", __xRcPtr)("sqlite3_stmt*", __xRcPtr)("sqlite3_value*", __xRcPtr)("sqlite3_vfs*", __xRcPtr)("void*", __xRcPtr);
        for (const e of bindingSignatures.core) capi[e[0]] = wasm.xWrap.apply(null, e);
        for (const e of bindingSignatures.wasmInternal) util[e[0]] = wasm.xWrap.apply(null, e);
        for (const e of bindingSignatures.int64) capi[e[0]] = wasm.bigIntEnabled ? wasm.xWrap.apply(null, e) : () => toss(e[0] + "() is unavailable due to lack", "of BigInt support in this build.");
        delete bindingSignatures.core;
        delete bindingSignatures.int64;
        delete bindingSignatures.wasmInternal;
        util.sqlite3__wasm_db_error = function(pDb2, resultCode, message) {
          if (!pDb2) return capi.SQLITE_MISUSE;
          if (resultCode instanceof sqlite3.WasmAllocError) {
            resultCode = capi.SQLITE_NOMEM;
            message = 0;
          } else if (resultCode instanceof Error) {
            message = message || "" + resultCode;
            resultCode = resultCode.resultCode || capi.SQLITE_ERROR;
          }
          return capi.sqlite3_set_errmsg(pDb2, resultCode, message) || resultCode;
        };
      }
      {
        const cJson = wasm.xCall("sqlite3__wasm_enum_json");
        if (!cJson) toss("Maintenance required: increase sqlite3__wasm_enum_json()'s", "static buffer size!");
        wasm.ctype = JSON.parse(wasm.cstrToJs(cJson));
        const defineGroups = [
          "access",
          "authorizer",
          "blobFinalizers",
          "changeset",
          "config",
          "dataTypes",
          "dbConfig",
          "dbStatus",
          "encodings",
          "fcntl",
          "flock",
          "ioCap",
          "limits",
          "openFlags",
          "prepareFlags",
          "resultCodes",
          "sqlite3Status",
          "stmtStatus",
          "syncFlags",
          "trace",
          "txnState",
          "udfFlags",
          "version"
        ];
        if (wasm.bigIntEnabled) defineGroups.push("serialize", "session", "vtab");
        for (const t of defineGroups) for (const e of Object.entries(wasm.ctype[t])) capi[e[0]] = e[1];
        if (!wasm.functionEntry(capi.SQLITE_WASM_DEALLOC)) toss("Internal error: cannot resolve exported function", "entry SQLITE_WASM_DEALLOC (==" + capi.SQLITE_WASM_DEALLOC + ").");
        const __rcMap = /* @__PURE__ */ Object.create(null);
        for (const e of Object.entries(wasm.ctype["resultCodes"])) __rcMap[e[1]] = e[0];
        capi.sqlite3_js_rc_str = (rc) => __rcMap[rc];
        const notThese = Object.assign(/* @__PURE__ */ Object.create(null), {
          WasmTestStruct: true,
          sqlite3_index_info: !wasm.bigIntEnabled,
          sqlite3_index_constraint: !wasm.bigIntEnabled,
          sqlite3_index_orderby: !wasm.bigIntEnabled,
          sqlite3_index_constraint_usage: !wasm.bigIntEnabled
        });
        for (const s of wasm.ctype.structs) if (!notThese[s.name]) capi[s.name] = sqlite3.StructBinder(s);
        if (capi.sqlite3_index_info) {
          for (const k2 of [
            "sqlite3_index_constraint",
            "sqlite3_index_orderby",
            "sqlite3_index_constraint_usage"
          ]) {
            capi.sqlite3_index_info[k2] = capi[k2];
            delete capi[k2];
          }
          capi.sqlite3_vtab_config = wasm.xWrap("sqlite3__wasm_vtab_config", "int", [
            "sqlite3*",
            "int",
            "int"
          ]);
        }
      }
      const __dbArgcMismatch = (pDb2, f, n) => {
        return util.sqlite3__wasm_db_error(pDb2, capi.SQLITE_MISUSE, f + "() requires " + n + " argument" + (1 === n ? "" : "s") + ".");
      };
      const __errEncoding = (pDb2) => {
        return util.sqlite3__wasm_db_error(pDb2, capi.SQLITE_FORMAT, "SQLITE_UTF8 is the only supported encoding.");
      };
      const __argPDb = (pDb2) => wasm.xWrap.argAdapter("sqlite3*")(pDb2);
      const __argStr = (str) => wasm.isPtr(str) ? wasm.cstrToJs(str) : str;
      const __dbCleanupMap = function(pDb2, mode2) {
        pDb2 = __argPDb(pDb2);
        let m = this.dbMap.get(pDb2);
        if (!mode2) {
          this.dbMap.delete(pDb2);
          return m;
        } else if (!m && mode2 > 0) this.dbMap.set(pDb2, m = /* @__PURE__ */ Object.create(null));
        return m;
      }.bind(Object.assign(/* @__PURE__ */ Object.create(null), { dbMap: /* @__PURE__ */ new Map() }));
      __dbCleanupMap.addCollation = function(pDb2, name) {
        const m = __dbCleanupMap(pDb2, 1);
        if (!m.collation) m.collation = /* @__PURE__ */ new Set();
        m.collation.add(__argStr(name).toLowerCase());
      };
      __dbCleanupMap._addUDF = function(pDb2, name, arity, map) {
        name = __argStr(name).toLowerCase();
        let u = map.get(name);
        if (!u) map.set(name, u = /* @__PURE__ */ new Set());
        u.add(arity < 0 ? -1 : arity);
      };
      __dbCleanupMap.addFunction = function(pDb2, name, arity) {
        const m = __dbCleanupMap(pDb2, 1);
        if (!m.udf) m.udf = /* @__PURE__ */ new Map();
        this._addUDF(pDb2, name, arity, m.udf);
      };
      if (wasm.exports.sqlite3_create_window_function) __dbCleanupMap.addWindowFunc = function(pDb2, name, arity) {
        const m = __dbCleanupMap(pDb2, 1);
        if (!m.wudf) m.wudf = /* @__PURE__ */ new Map();
        this._addUDF(pDb2, name, arity, m.wudf);
      };
      __dbCleanupMap.cleanup = function(pDb2) {
        pDb2 = __argPDb(pDb2);
        for (const obj of [
          ["sqlite3_busy_handler", 3],
          ["sqlite3_commit_hook", 3],
          ["sqlite3_preupdate_hook", 3],
          ["sqlite3_progress_handler", 4],
          ["sqlite3_rollback_hook", 3],
          ["sqlite3_set_authorizer", 3],
          ["sqlite3_trace_v2", 4],
          ["sqlite3_update_hook", 3]
        ]) {
          const [name, arity] = obj;
          if (!wasm.exports[name]) continue;
          const closeArgs = [pDb2];
          closeArgs.length = arity;
          try {
            capi[name](...closeArgs);
          } catch (e) {
            sqlite3.config.warn("close-time call of", name + "(", closeArgs, ") threw:", e);
          }
        }
        const m = __dbCleanupMap(pDb2, 0);
        if (!m) return;
        if (m.collation) {
          for (const name of m.collation) try {
            capi.sqlite3_create_collation_v2(pDb2, name, capi.SQLITE_UTF8, 0, 0, 0);
          } catch (e) {
          }
          delete m.collation;
        }
        let i;
        for (i = 0; i < 2; ++i) {
          const fmap = i ? m.wudf : m.udf;
          if (!fmap) continue;
          const func = i ? capi.sqlite3_create_window_function : capi.sqlite3_create_function_v2;
          for (const e of fmap) {
            const name = e[0], arities = e[1];
            const fargs = [
              pDb2,
              name,
              0,
              capi.SQLITE_UTF8,
              0,
              0,
              0,
              0,
              0
            ];
            if (i) fargs.push(0);
            for (const arity of arities) try {
              fargs[2] = arity;
              func.apply(null, fargs);
            } catch (e2) {
            }
            arities.clear();
          }
          fmap.clear();
        }
        delete m.udf;
        delete m.wudf;
      };
      {
        const __sqlite3CloseV2 = wasm.xWrap("sqlite3_close_v2", "int", "sqlite3*");
        capi.sqlite3_close_v2 = function(pDb2) {
          if (1 !== arguments.length) return __dbArgcMismatch(pDb2, "sqlite3_close_v2", 1);
          if (pDb2) try {
            __dbCleanupMap.cleanup(pDb2);
          } catch (e) {
          }
          return __sqlite3CloseV2(pDb2);
        };
      }
      if (capi.sqlite3session_create) {
        const __sqlite3SessionDelete = wasm.xWrap("sqlite3session_delete", void 0, ["sqlite3_session*"]);
        capi.sqlite3session_delete = function(pSession) {
          if (1 !== arguments.length) return __dbArgcMismatch(pDb, "sqlite3session_delete", 1);
          else if (pSession) capi.sqlite3session_table_filter(pSession, 0, 0);
          __sqlite3SessionDelete(pSession);
        };
      }
      {
        const contextKey = (argv, argIndex) => {
          return "argv[" + argIndex + "]:" + argv[0] + ":" + wasm.cstrToJs(argv[1]).toLowerCase();
        };
        const __sqlite3CreateCollationV2 = wasm.xWrap("sqlite3_create_collation_v2", "int", [
          "sqlite3*",
          "string",
          "int",
          "*",
          new wasm.xWrap.FuncPtrAdapter({
            name: "xCompare",
            signature: "i(pipip)",
            contextKey
          }),
          new wasm.xWrap.FuncPtrAdapter({
            name: "xDestroy",
            signature: "v(p)",
            contextKey
          })
        ]);
        capi.sqlite3_create_collation_v2 = function(pDb2, zName, eTextRep, pArg, xCompare, xDestroy) {
          if (6 !== arguments.length) return __dbArgcMismatch(pDb2, "sqlite3_create_collation_v2", 6);
          else if (0 === (eTextRep & 15)) eTextRep |= capi.SQLITE_UTF8;
          else if (capi.SQLITE_UTF8 !== (eTextRep & 15)) return __errEncoding(pDb2);
          try {
            const rc = __sqlite3CreateCollationV2(pDb2, zName, eTextRep, pArg, xCompare, xDestroy);
            if (0 === rc && xCompare instanceof Function) __dbCleanupMap.addCollation(pDb2, zName);
            return rc;
          } catch (e) {
            return util.sqlite3__wasm_db_error(pDb2, e);
          }
        };
        capi.sqlite3_create_collation = (pDb2, zName, eTextRep, pArg, xCompare) => {
          return 5 === arguments.length ? capi.sqlite3_create_collation_v2(pDb2, zName, eTextRep, pArg, xCompare, 0) : __dbArgcMismatch(pDb2, "sqlite3_create_collation", 5);
        };
      }
      {
        const contextKey = function(argv, argIndex) {
          return argv[0] + ":" + (argv[2] < 0 ? -1 : argv[2]) + ":" + argIndex + ":" + wasm.cstrToJs(argv[1]).toLowerCase();
        };
        const __cfProxy = Object.assign(/* @__PURE__ */ Object.create(null), {
          xInverseAndStep: {
            signature: "v(pip)",
            contextKey,
            callProxy: (callback) => {
              return (pCtx, argc, pArgv) => {
                try {
                  callback(pCtx, ...capi.sqlite3_values_to_js(argc, pArgv));
                } catch (e) {
                  capi.sqlite3_result_error_js(pCtx, e);
                }
              };
            }
          },
          xFinalAndValue: {
            signature: "v(p)",
            contextKey,
            callProxy: (callback) => {
              return (pCtx) => {
                try {
                  capi.sqlite3_result_js(pCtx, callback(pCtx));
                } catch (e) {
                  capi.sqlite3_result_error_js(pCtx, e);
                }
              };
            }
          },
          xFunc: {
            signature: "v(pip)",
            contextKey,
            callProxy: (callback) => {
              return (pCtx, argc, pArgv) => {
                try {
                  capi.sqlite3_result_js(pCtx, callback(pCtx, ...capi.sqlite3_values_to_js(argc, pArgv)));
                } catch (e) {
                  capi.sqlite3_result_error_js(pCtx, e);
                }
              };
            }
          },
          xDestroy: {
            signature: "v(p)",
            contextKey,
            callProxy: (callback) => {
              return (pVoid) => {
                try {
                  callback(pVoid);
                } catch (e) {
                  console.error("UDF xDestroy method threw:", e);
                }
              };
            }
          }
        });
        const __sqlite3CreateFunction = wasm.xWrap("sqlite3_create_function_v2", "int", [
          "sqlite3*",
          "string",
          "int",
          "int",
          "*",
          new wasm.xWrap.FuncPtrAdapter({
            name: "xFunc",
            ...__cfProxy.xFunc
          }),
          new wasm.xWrap.FuncPtrAdapter({
            name: "xStep",
            ...__cfProxy.xInverseAndStep
          }),
          new wasm.xWrap.FuncPtrAdapter({
            name: "xFinal",
            ...__cfProxy.xFinalAndValue
          }),
          new wasm.xWrap.FuncPtrAdapter({
            name: "xDestroy",
            ...__cfProxy.xDestroy
          })
        ]);
        const __sqlite3CreateWindowFunction = wasm.exports.sqlite3_create_window_function ? wasm.xWrap("sqlite3_create_window_function", "int", [
          "sqlite3*",
          "string",
          "int",
          "int",
          "*",
          new wasm.xWrap.FuncPtrAdapter({
            name: "xStep",
            ...__cfProxy.xInverseAndStep
          }),
          new wasm.xWrap.FuncPtrAdapter({
            name: "xFinal",
            ...__cfProxy.xFinalAndValue
          }),
          new wasm.xWrap.FuncPtrAdapter({
            name: "xValue",
            ...__cfProxy.xFinalAndValue
          }),
          new wasm.xWrap.FuncPtrAdapter({
            name: "xInverse",
            ...__cfProxy.xInverseAndStep
          }),
          new wasm.xWrap.FuncPtrAdapter({
            name: "xDestroy",
            ...__cfProxy.xDestroy
          })
        ]) : void 0;
        capi.sqlite3_create_function_v2 = function f(pDb2, funcName, nArg, eTextRep, pApp, xFunc, xStep, xFinal, xDestroy) {
          if (f.length !== arguments.length) return __dbArgcMismatch(pDb2, "sqlite3_create_function_v2", f.length);
          else if (0 === (eTextRep & 15)) eTextRep |= capi.SQLITE_UTF8;
          else if (capi.SQLITE_UTF8 !== (eTextRep & 15)) return __errEncoding(pDb2);
          try {
            const rc = __sqlite3CreateFunction(pDb2, funcName, nArg, eTextRep, pApp, xFunc, xStep, xFinal, xDestroy);
            if (0 === rc && (xFunc instanceof Function || xStep instanceof Function || xFinal instanceof Function || xDestroy instanceof Function)) __dbCleanupMap.addFunction(pDb2, funcName, nArg);
            return rc;
          } catch (e) {
            console.error("sqlite3_create_function_v2() setup threw:", e);
            return util.sqlite3__wasm_db_error(pDb2, e, "Creation of UDF threw: " + e);
          }
        };
        capi.sqlite3_create_function = function f(pDb2, funcName, nArg, eTextRep, pApp, xFunc, xStep, xFinal) {
          return f.length === arguments.length ? capi.sqlite3_create_function_v2(pDb2, funcName, nArg, eTextRep, pApp, xFunc, xStep, xFinal, 0) : __dbArgcMismatch(pDb2, "sqlite3_create_function", f.length);
        };
        if (__sqlite3CreateWindowFunction) capi.sqlite3_create_window_function = function f(pDb2, funcName, nArg, eTextRep, pApp, xStep, xFinal, xValue, xInverse, xDestroy) {
          if (f.length !== arguments.length) return __dbArgcMismatch(pDb2, "sqlite3_create_window_function", f.length);
          else if (0 === (eTextRep & 15)) eTextRep |= capi.SQLITE_UTF8;
          else if (capi.SQLITE_UTF8 !== (eTextRep & 15)) return __errEncoding(pDb2);
          try {
            const rc = __sqlite3CreateWindowFunction(pDb2, funcName, nArg, eTextRep, pApp, xStep, xFinal, xValue, xInverse, xDestroy);
            if (0 === rc && (xStep instanceof Function || xFinal instanceof Function || xValue instanceof Function || xInverse instanceof Function || xDestroy instanceof Function)) __dbCleanupMap.addWindowFunc(pDb2, funcName, nArg);
            return rc;
          } catch (e) {
            console.error("sqlite3_create_window_function() setup threw:", e);
            return util.sqlite3__wasm_db_error(pDb2, e, "Creation of UDF threw: " + e);
          }
        };
        else delete capi.sqlite3_create_window_function;
        capi.sqlite3_create_function_v2.udfSetResult = capi.sqlite3_create_function.udfSetResult = capi.sqlite3_result_js;
        if (capi.sqlite3_create_window_function) capi.sqlite3_create_window_function.udfSetResult = capi.sqlite3_result_js;
        capi.sqlite3_create_function_v2.udfConvertArgs = capi.sqlite3_create_function.udfConvertArgs = capi.sqlite3_values_to_js;
        if (capi.sqlite3_create_window_function) capi.sqlite3_create_window_function.udfConvertArgs = capi.sqlite3_values_to_js;
        capi.sqlite3_create_function_v2.udfSetError = capi.sqlite3_create_function.udfSetError = capi.sqlite3_result_error_js;
        if (capi.sqlite3_create_window_function) capi.sqlite3_create_window_function.udfSetError = capi.sqlite3_result_error_js;
      }
      {
        const __flexiString = (v2, n) => {
          if ("string" === typeof v2) n = -1;
          else if (util.isSQLableTypedArray(v2)) {
            n = v2.byteLength;
            v2 = wasm.typedArrayToString(v2 instanceof ArrayBuffer ? new Uint8Array(v2) : v2);
          } else if (Array.isArray(v2)) {
            v2 = v2.join("");
            n = -1;
          }
          return [v2, n];
        };
        const __prepare = {
          basic: wasm.xWrap("sqlite3_prepare_v3", "int", [
            "sqlite3*",
            "string",
            "int",
            "int",
            "**",
            "**"
          ]),
          full: wasm.xWrap("sqlite3_prepare_v3", "int", [
            "sqlite3*",
            "*",
            "int",
            "int",
            "**",
            "**"
          ])
        };
        capi.sqlite3_prepare_v3 = function f(pDb2, sql, sqlLen, prepFlags, ppStmt, pzTail) {
          if (f.length !== arguments.length) return __dbArgcMismatch(pDb2, "sqlite3_prepare_v3", f.length);
          const [xSql, xSqlLen] = __flexiString(sql, Number(sqlLen));
          switch (typeof xSql) {
            case "string":
              return __prepare.basic(pDb2, xSql, xSqlLen, prepFlags, ppStmt, null);
            case typeof wasm.ptr.null:
              return __prepare.full(pDb2, wasm.ptr.coerce(xSql), xSqlLen, prepFlags, ppStmt, pzTail);
            default:
              return util.sqlite3__wasm_db_error(pDb2, capi.SQLITE_MISUSE, "Invalid SQL argument type for sqlite3_prepare_v2/v3(). typeof=" + typeof xSql);
          }
        };
        capi.sqlite3_prepare_v2 = function f(pDb2, sql, sqlLen, ppStmt, pzTail) {
          return f.length === arguments.length ? capi.sqlite3_prepare_v3(pDb2, sql, sqlLen, 0, ppStmt, pzTail) : __dbArgcMismatch(pDb2, "sqlite3_prepare_v2", f.length);
        };
      }
      {
        const __bindText = wasm.xWrap("sqlite3_bind_text", "int", [
          "sqlite3_stmt*",
          "int",
          "string",
          "int",
          "*"
        ]);
        const __bindBlob = wasm.xWrap("sqlite3_bind_blob", "int", [
          "sqlite3_stmt*",
          "int",
          "*",
          "int",
          "*"
        ]);
        capi.sqlite3_bind_text = function f(pStmt, iCol, text, nText, xDestroy) {
          if (f.length !== arguments.length) return __dbArgcMismatch(capi.sqlite3_db_handle(pStmt), "sqlite3_bind_text", f.length);
          else if (wasm.isPtr(text) || null === text) return __bindText(pStmt, iCol, text, nText, xDestroy);
          else if (text instanceof ArrayBuffer) text = new Uint8Array(text);
          else if (Array.isArray(pMem)) text = pMem.join("");
          let p, n;
          try {
            if (util.isSQLableTypedArray(text)) {
              p = wasm.allocFromTypedArray(text);
              n = text.byteLength;
            } else if ("string" === typeof text) [p, n] = wasm.allocCString(text);
            else return util.sqlite3__wasm_db_error(capi.sqlite3_db_handle(pStmt), capi.SQLITE_MISUSE, "Invalid 3rd argument type for sqlite3_bind_text().");
            return __bindText(pStmt, iCol, p, n, capi.SQLITE_WASM_DEALLOC);
          } catch (e) {
            wasm.dealloc(p);
            return util.sqlite3__wasm_db_error(capi.sqlite3_db_handle(pStmt), e);
          }
        };
        capi.sqlite3_bind_blob = function f(pStmt, iCol, pMem2, nMem, xDestroy) {
          if (f.length !== arguments.length) return __dbArgcMismatch(capi.sqlite3_db_handle(pStmt), "sqlite3_bind_blob", f.length);
          else if (wasm.isPtr(pMem2) || null === pMem2) return __bindBlob(pStmt, iCol, pMem2, nMem, xDestroy);
          else if (pMem2 instanceof ArrayBuffer) pMem2 = new Uint8Array(pMem2);
          else if (Array.isArray(pMem2)) pMem2 = pMem2.join("");
          let p, n;
          try {
            if (util.isBindableTypedArray(pMem2)) {
              p = wasm.allocFromTypedArray(pMem2);
              n = nMem >= 0 ? nMem : pMem2.byteLength;
            } else if ("string" === typeof pMem2) [p, n] = wasm.allocCString(pMem2);
            else return util.sqlite3__wasm_db_error(capi.sqlite3_db_handle(pStmt), capi.SQLITE_MISUSE, "Invalid 3rd argument type for sqlite3_bind_blob().");
            return __bindBlob(pStmt, iCol, p, n, capi.SQLITE_WASM_DEALLOC);
          } catch (e) {
            wasm.dealloc(p);
            return util.sqlite3__wasm_db_error(capi.sqlite3_db_handle(pStmt), e);
          }
        };
      }
      if (!capi.sqlite3_column_text) {
        const argStmt = wasm.xWrap.argAdapter("sqlite3_stmt*"), argInt = wasm.xWrap.argAdapter("int"), argValue = wasm.xWrap.argAdapter("sqlite3_value*"), newStr = (cstr, n) => wasm.typedArrayToString(wasm.heap8u(), Number(cstr), Number(cstr) + n);
        capi.sqlite3_column_text = function(stmt, colIndex) {
          const a0 = argStmt(stmt), a1 = argInt(colIndex);
          const cstr = wasm.exports.sqlite3_column_text(a0, a1);
          return cstr ? newStr(cstr, wasm.exports.sqlite3_column_bytes(a0, a1)) : null;
        };
        capi.sqlite3_value_text = function(val) {
          const a0 = argValue(val);
          const cstr = wasm.exports.sqlite3_value_text(a0);
          return cstr ? newStr(cstr, wasm.exports.sqlite3_value_bytes(a0)) : null;
        };
      }
      capi.sqlite3_config = function(op, ...args) {
        if (arguments.length < 2) return capi.SQLITE_MISUSE;
        switch (op) {
          case capi.SQLITE_CONFIG_COVERING_INDEX_SCAN:
          case capi.SQLITE_CONFIG_MEMSTATUS:
          case capi.SQLITE_CONFIG_SMALL_MALLOC:
          case capi.SQLITE_CONFIG_SORTERREF_SIZE:
          case capi.SQLITE_CONFIG_STMTJRNL_SPILL:
          case capi.SQLITE_CONFIG_URI:
            return wasm.exports.sqlite3__wasm_config_i(op, args[0]);
          case capi.SQLITE_CONFIG_LOOKASIDE:
            return wasm.exports.sqlite3__wasm_config_ii(op, args[0], args[1]);
          case capi.SQLITE_CONFIG_MEMDB_MAXSIZE:
            return wasm.exports.sqlite3__wasm_config_j(op, args[0]);
          case capi.SQLITE_CONFIG_GETMALLOC:
          case capi.SQLITE_CONFIG_GETMUTEX:
          case capi.SQLITE_CONFIG_GETPCACHE2:
          case capi.SQLITE_CONFIG_GETPCACHE:
          case capi.SQLITE_CONFIG_HEAP:
          case capi.SQLITE_CONFIG_LOG:
          case capi.SQLITE_CONFIG_MALLOC:
          case capi.SQLITE_CONFIG_MMAP_SIZE:
          case capi.SQLITE_CONFIG_MULTITHREAD:
          case capi.SQLITE_CONFIG_MUTEX:
          case capi.SQLITE_CONFIG_PAGECACHE:
          case capi.SQLITE_CONFIG_PCACHE2:
          case capi.SQLITE_CONFIG_PCACHE:
          case capi.SQLITE_CONFIG_PCACHE_HDRSZ:
          case capi.SQLITE_CONFIG_PMASZ:
          case capi.SQLITE_CONFIG_SERIALIZED:
          case capi.SQLITE_CONFIG_SINGLETHREAD:
          case capi.SQLITE_CONFIG_SQLLOG:
          case capi.SQLITE_CONFIG_WIN32_HEAPSIZE:
          default:
            return capi.SQLITE_NOTFOUND;
        }
      };
      {
        const __autoExtFptr = /* @__PURE__ */ new Set();
        capi.sqlite3_auto_extension = function(fPtr) {
          if (fPtr instanceof Function) fPtr = wasm.installFunction("i(ppp)", fPtr);
          else if (1 !== arguments.length || !wasm.isPtr(fPtr)) return capi.SQLITE_MISUSE;
          const rc = wasm.exports.sqlite3_auto_extension(fPtr);
          if (fPtr !== arguments[0]) if (0 === rc) __autoExtFptr.add(fPtr);
          else wasm.uninstallFunction(fPtr);
          return rc;
        };
        capi.sqlite3_cancel_auto_extension = function(fPtr) {
          if (!fPtr || 1 !== arguments.length || !wasm.isPtr(fPtr)) return 0;
          return wasm.exports.sqlite3_cancel_auto_extension(fPtr);
        };
        capi.sqlite3_reset_auto_extension = function() {
          wasm.exports.sqlite3_reset_auto_extension();
          for (const fp of __autoExtFptr) wasm.uninstallFunction(fp);
          __autoExtFptr.clear();
        };
      }
      wasm.xWrap.FuncPtrAdapter.warnOnUse = true;
      const StructBinder = sqlite3.StructBinder;
      const installMethod = function callee3(tgt, name, func, applyArgcCheck = callee3.installMethodArgcCheck) {
        if (!(tgt instanceof StructBinder.StructType)) toss("Usage error: target object is-not-a StructType.");
        else if (!(func instanceof Function) && !wasm.isPtr(func)) toss("Usage error: expecting a Function or WASM pointer to one.");
        if (1 === arguments.length) return (n, f) => callee3(tgt, n, f, applyArgcCheck);
        if (!callee3.argcProxy) {
          callee3.argcProxy = function(tgt2, funcName, func2, sig) {
            return function(...args) {
              if (func2.length !== arguments.length) toss("Argument mismatch for", tgt2.structInfo.name + "::" + funcName + ": Native signature is:", sig);
              return func2.apply(this, args);
            };
          };
          callee3.removeFuncList = function() {
            if (this.ondispose.__removeFuncList) {
              this.ondispose.__removeFuncList.forEach((v2, ndx) => {
                if (wasm.isPtr(v2)) try {
                  wasm.uninstallFunction(v2);
                } catch (e) {
                }
              });
              delete this.ondispose.__removeFuncList;
            }
          };
        }
        const sigN = tgt.memberSignature(name);
        if (sigN.length < 2) toss("Member", name, "does not have a function pointer signature:", sigN);
        const memKey = tgt.memberKey(name);
        const fProxy = applyArgcCheck && !wasm.isPtr(func) ? callee3.argcProxy(tgt, memKey, func, sigN) : func;
        if (wasm.isPtr(fProxy)) {
          if (fProxy && !wasm.functionEntry(fProxy)) toss("Pointer", fProxy, "is not a WASM function table entry.");
          tgt[memKey] = fProxy;
        } else {
          const pFunc = wasm.installFunction(fProxy, sigN);
          tgt[memKey] = pFunc;
          if (!tgt.ondispose || !tgt.ondispose.__removeFuncList) {
            tgt.addOnDispose("ondispose.__removeFuncList handler", callee3.removeFuncList);
            tgt.ondispose.__removeFuncList = [];
          }
          tgt.ondispose.__removeFuncList.push(memKey, pFunc);
        }
        return (n, f) => callee3(tgt, n, f, applyArgcCheck);
      };
      installMethod.installMethodArgcCheck = false;
      const installMethods = function(structInstance, methods, applyArgcCheck = installMethod.installMethodArgcCheck) {
        const seen = /* @__PURE__ */ new Map();
        for (const k2 of Object.keys(methods)) {
          const m = methods[k2];
          const prior = seen.get(m);
          if (prior) {
            const mkey = structInstance.memberKey(k2);
            structInstance[mkey] = structInstance[structInstance.memberKey(prior)];
          } else {
            installMethod(structInstance, k2, m, applyArgcCheck);
            seen.set(m, k2);
          }
        }
        return structInstance;
      };
      StructBinder.StructType.prototype.installMethod = function callee3(name, func, applyArgcCheck = installMethod.installMethodArgcCheck) {
        return arguments.length < 3 && name && "object" === typeof name ? installMethods(this, ...arguments) : installMethod(this, ...arguments);
      };
      StructBinder.StructType.prototype.installMethods = function(methods, applyArgcCheck = installMethod.installMethodArgcCheck) {
        return installMethods(this, methods, applyArgcCheck);
      };
    });
    globalThis.sqlite3ApiBootstrap.initializers.push(function(sqlite3) {
      const toss3 = (...args) => {
        throw new sqlite3.SQLite3Error(...args);
      };
      const capi = sqlite3.capi, wasm = sqlite3.wasm, util = sqlite3.util;
      const outWrapper = function(f) {
        return (...args) => f("sqlite3.oo1:", ...args);
      };
      sqlite3.__isUnderTest ? outWrapper(console.debug.bind(console)) : outWrapper(sqlite3.config.debug);
      sqlite3.__isUnderTest ? outWrapper(console.warn.bind(console)) : outWrapper(sqlite3.config.warn);
      sqlite3.__isUnderTest ? outWrapper(console.error.bind(console)) : outWrapper(sqlite3.config.error);
      const __ptrMap = /* @__PURE__ */ new WeakMap();
      const __doesNotOwnHandle = /* @__PURE__ */ new Set();
      const __stmtMap = /* @__PURE__ */ new WeakMap();
      const getOwnOption = (opts, p, dflt) => {
        const d = Object.getOwnPropertyDescriptor(opts, p);
        return d ? d.value : dflt;
      };
      const checkSqlite3Rc = function(dbPtr, sqliteResultCode) {
        if (sqliteResultCode) {
          if (dbPtr instanceof DB) dbPtr = dbPtr.pointer;
          toss3(sqliteResultCode, "sqlite3 result code", sqliteResultCode + ":", dbPtr ? capi.sqlite3_errmsg(dbPtr) : capi.sqlite3_errstr(sqliteResultCode));
        }
        return arguments[0];
      };
      const __dbTraceToConsole = wasm.installFunction("i(ippp)", function(t, c, p, x) {
        if (capi.SQLITE_TRACE_STMT === t) console.log("SQL TRACE #" + ++this.counter, "via sqlite3@" + c + "[" + capi.sqlite3_db_filename(c, null) + "]", wasm.cstrToJs(x));
      }.bind({ counter: 0 }));
      const __vfsPostOpenCallback = /* @__PURE__ */ Object.create(null);
      const dbCtorHelper = function ctor(...args) {
        const opt = ctor.normalizeArgs(...args);
        let pDb2;
        if (pDb2 = opt["sqlite3*"]) {
          if (!opt["sqlite3*:takeOwnership"]) __doesNotOwnHandle.add(this);
          this.filename = capi.sqlite3_db_filename(pDb2, "main");
        } else {
          let fn = opt.filename, vfsName = opt.vfs, flagsStr = opt.flags;
          if ("string" !== typeof fn && !wasm.isPtr(fn) || "string" !== typeof flagsStr || vfsName && "string" !== typeof vfsName && !wasm.isPtr(vfsName)) {
            sqlite3.config.error("Invalid DB ctor args", opt, arguments);
            toss3("Invalid arguments for DB constructor:", arguments, "opts:", opt);
          }
          let oflags = 0;
          if (flagsStr.indexOf("c") >= 0) oflags |= capi.SQLITE_OPEN_CREATE | capi.SQLITE_OPEN_READWRITE;
          if (flagsStr.indexOf("w") >= 0) oflags |= capi.SQLITE_OPEN_READWRITE;
          if (0 === oflags) oflags |= capi.SQLITE_OPEN_READONLY;
          oflags |= capi.SQLITE_OPEN_EXRESCODE;
          const stack = wasm.pstack.pointer;
          try {
            const pPtr = wasm.pstack.allocPtr();
            let rc = capi.sqlite3_open_v2(fn, pPtr, oflags, vfsName || wasm.ptr.null);
            pDb2 = wasm.peekPtr(pPtr);
            checkSqlite3Rc(pDb2, rc);
            capi.sqlite3_extended_result_codes(pDb2, 1);
            if (flagsStr.indexOf("t") >= 0) capi.sqlite3_trace_v2(pDb2, capi.SQLITE_TRACE_STMT, __dbTraceToConsole, pDb2);
          } catch (e) {
            if (pDb2) capi.sqlite3_close_v2(pDb2);
            throw e;
          } finally {
            wasm.pstack.restore(stack);
          }
          this.filename = wasm.isPtr(fn) ? wasm.cstrToJs(fn) : fn;
        }
        __ptrMap.set(this, pDb2);
        __stmtMap.set(this, /* @__PURE__ */ Object.create(null));
        if (!opt["sqlite3*"]) try {
          const postInitSql = __vfsPostOpenCallback[capi.sqlite3_js_db_vfs(pDb2) || toss3("Internal error: cannot get VFS for new db handle.")];
          if (postInitSql)
            if (postInitSql instanceof Function) postInitSql(this, sqlite3);
            else checkSqlite3Rc(pDb2, capi.sqlite3_exec(pDb2, postInitSql, 0, 0, 0));
        } catch (e) {
          this.close();
          throw e;
        }
      };
      dbCtorHelper.setVfsPostOpenCallback = function(pVfs, callback) {
        if (!(callback instanceof Function)) toss3("dbCtorHelper.setVfsPostOpenCallback() should not be used with a non-function argument.", arguments);
        __vfsPostOpenCallback[pVfs] = callback;
      };
      dbCtorHelper.normalizeArgs = function(filename = ":memory:", flags = "c", vfs = null) {
        const arg = {};
        if (1 === arguments.length && arguments[0] && "object" === typeof arguments[0]) {
          Object.assign(arg, arguments[0]);
          if (void 0 === arg.flags) arg.flags = "c";
          if (void 0 === arg.vfs) arg.vfs = null;
          if (void 0 === arg.filename) arg.filename = ":memory:";
        } else {
          arg.filename = filename;
          arg.flags = flags;
          arg.vfs = vfs;
        }
        return arg;
      };
      const DB = function(...args) {
        dbCtorHelper.apply(this, args);
      };
      DB.dbCtorHelper = dbCtorHelper;
      const BindTypes = {
        null: 1,
        number: 2,
        string: 3,
        boolean: 4,
        blob: 5
      };
      if (wasm.bigIntEnabled) BindTypes.bigint = BindTypes.number;
      const Stmt = function() {
        if (BindTypes !== arguments[2]) toss3(capi.SQLITE_MISUSE, "Do not call the Stmt constructor directly. Use DB.prepare().");
        this.db = arguments[0];
        __ptrMap.set(this, arguments[1]);
        if (arguments.length > 3 && !arguments[3]) __doesNotOwnHandle.add(this);
      };
      const affirmDbOpen = function(db) {
        if (!db.pointer) toss3("DB has been closed.");
        return db;
      };
      const affirmColIndex = function(stmt, ndx) {
        if (ndx !== (ndx | 0) || ndx < 0 || ndx >= stmt.columnCount) toss3("Column index", ndx, "is out of range.");
        return stmt;
      };
      const parseExecArgs = function(db, args) {
        const out2 = /* @__PURE__ */ Object.create(null);
        out2.opt = /* @__PURE__ */ Object.create(null);
        switch (args.length) {
          case 1:
            if ("string" === typeof args[0] || util.isSQLableTypedArray(args[0])) out2.sql = args[0];
            else if (Array.isArray(args[0])) out2.sql = args[0];
            else if (args[0] && "object" === typeof args[0]) {
              out2.opt = args[0];
              out2.sql = out2.opt.sql;
            }
            break;
          case 2:
            out2.sql = args[0];
            out2.opt = args[1];
            break;
          default:
            toss3("Invalid argument count for exec().");
        }
        out2.sql = util.flexibleString(out2.sql);
        if ("string" !== typeof out2.sql) toss3("Missing SQL argument or unsupported SQL value type.");
        const opt = out2.opt;
        switch (opt.returnValue) {
          case "resultRows":
            if (!opt.resultRows) opt.resultRows = [];
            out2.returnVal = () => opt.resultRows;
            break;
          case "saveSql":
            if (!opt.saveSql) opt.saveSql = [];
            out2.returnVal = () => opt.saveSql;
            break;
          case void 0:
          case "this":
            out2.returnVal = () => db;
            break;
          default:
            toss3("Invalid returnValue value:", opt.returnValue);
        }
        if (!opt.callback && !opt.returnValue && void 0 !== opt.rowMode) {
          if (!opt.resultRows) opt.resultRows = [];
          out2.returnVal = () => opt.resultRows;
        }
        if (opt.callback || opt.resultRows) switch (void 0 === opt.rowMode ? "array" : opt.rowMode) {
          case "object":
            out2.cbArg = (stmt, cache) => {
              if (!cache.columnNames) cache.columnNames = stmt.getColumnNames([]);
              const row = stmt.get([]);
              const rv = /* @__PURE__ */ Object.create(null);
              for (const i in cache.columnNames) rv[cache.columnNames[i]] = row[i];
              return rv;
            };
            break;
          case "array":
            out2.cbArg = (stmt) => stmt.get([]);
            break;
          case "stmt":
            if (Array.isArray(opt.resultRows)) toss3("exec(): invalid rowMode for a resultRows array: must", "be one of 'array', 'object',", "a result column number, or column name reference.");
            out2.cbArg = (stmt) => stmt;
            break;
          default:
            if (util.isInt32(opt.rowMode)) {
              out2.cbArg = (stmt) => stmt.get(opt.rowMode);
              break;
            } else if ("string" === typeof opt.rowMode && opt.rowMode.length > 1 && "$" === opt.rowMode[0]) {
              const $colName = opt.rowMode.substr(1);
              out2.cbArg = (stmt) => {
                const rc = stmt.get(/* @__PURE__ */ Object.create(null))[$colName];
                return void 0 === rc ? toss3(capi.SQLITE_NOTFOUND, "exec(): unknown result column:", $colName) : rc;
              };
              break;
            }
            toss3("Invalid rowMode:", opt.rowMode);
        }
        return out2;
      };
      const __selectFirstRow = (db, sql, bind, ...getArgs) => {
        const stmt = db.prepare(sql);
        try {
          const rc = stmt.bind(bind).step() ? stmt.get(...getArgs) : void 0;
          stmt.reset();
          return rc;
        } finally {
          stmt.finalize();
        }
      };
      const __selectAll = (db, sql, bind, rowMode) => db.exec({
        sql,
        bind,
        rowMode,
        returnValue: "resultRows"
      });
      DB.checkRc = (db, resultCode) => checkSqlite3Rc(db, resultCode);
      DB.prototype = {
        isOpen: function() {
          return !!this.pointer;
        },
        affirmOpen: function() {
          return affirmDbOpen(this);
        },
        close: function() {
          const pDb2 = this.pointer;
          if (pDb2) {
            if (this.onclose && this.onclose.before instanceof Function) try {
              this.onclose.before(this);
            } catch (e) {
            }
            Object.keys(__stmtMap.get(this)).forEach((k2, s) => {
              if (s && s.pointer) try {
                s.finalize();
              } catch (e) {
              }
            });
            __ptrMap.delete(this);
            __stmtMap.delete(this);
            if (!__doesNotOwnHandle.delete(this)) capi.sqlite3_close_v2(pDb2);
            if (this.onclose && this.onclose.after instanceof Function) try {
              this.onclose.after(this);
            } catch (e) {
            }
            delete this.filename;
          }
        },
        changes: function(total = false, sixtyFour = false) {
          const p = affirmDbOpen(this).pointer;
          if (total) return sixtyFour ? capi.sqlite3_total_changes64(p) : capi.sqlite3_total_changes(p);
          else return sixtyFour ? capi.sqlite3_changes64(p) : capi.sqlite3_changes(p);
        },
        dbFilename: function(dbName = "main") {
          return capi.sqlite3_db_filename(affirmDbOpen(this).pointer, dbName);
        },
        dbName: function(dbNumber = 0) {
          return capi.sqlite3_db_name(affirmDbOpen(this).pointer, dbNumber);
        },
        dbVfsName: function(dbName = 0) {
          let rc;
          const pVfs = capi.sqlite3_js_db_vfs(affirmDbOpen(this).pointer, dbName);
          if (pVfs) {
            const v2 = new capi.sqlite3_vfs(pVfs);
            try {
              rc = wasm.cstrToJs(v2.$zName);
            } finally {
              v2.dispose();
            }
          }
          return rc;
        },
        prepare: function(sql) {
          affirmDbOpen(this);
          const stack = wasm.pstack.pointer;
          let ppStmt, pStmt;
          try {
            ppStmt = wasm.pstack.alloc(8);
            DB.checkRc(this, capi.sqlite3_prepare_v2(this.pointer, sql, -1, ppStmt, null));
            pStmt = wasm.peekPtr(ppStmt);
          } finally {
            wasm.pstack.restore(stack);
          }
          if (!pStmt) toss3("Cannot prepare empty SQL.");
          const stmt = new Stmt(this, pStmt, BindTypes);
          __stmtMap.get(this)[pStmt] = stmt;
          return stmt;
        },
        exec: function() {
          affirmDbOpen(this);
          const arg = parseExecArgs(this, arguments);
          if (!arg.sql) return toss3("exec() requires an SQL string.");
          const opt = arg.opt;
          const callback = opt.callback;
          const resultRows = Array.isArray(opt.resultRows) ? opt.resultRows : void 0;
          let stmt;
          let bind = opt.bind;
          let evalFirstResult = !!(arg.cbArg || opt.columnNames || resultRows);
          const stack = wasm.scopedAllocPush();
          const saveSql = Array.isArray(opt.saveSql) ? opt.saveSql : void 0;
          try {
            const isTA = util.isSQLableTypedArray(arg.sql);
            let sqlByteLen = isTA ? arg.sql.byteLength : wasm.jstrlen(arg.sql);
            const ppStmt = wasm.scopedAlloc(2 * wasm.ptr.size + (sqlByteLen + 1));
            const pzTail = wasm.ptr.add(ppStmt, wasm.ptr.size);
            let pSql = wasm.ptr.add(pzTail, wasm.ptr.size);
            const pSqlEnd = wasm.ptr.add(pSql, sqlByteLen);
            if (isTA) wasm.heap8().set(arg.sql, pSql);
            else wasm.jstrcpy(arg.sql, wasm.heap8(), pSql, sqlByteLen, false);
            wasm.poke8(wasm.ptr.add(pSql, sqlByteLen), 0);
            while (pSql && wasm.peek8(pSql)) {
              wasm.pokePtr([ppStmt, pzTail], 0);
              DB.checkRc(this, capi.sqlite3_prepare_v3(this.pointer, pSql, sqlByteLen, 0, ppStmt, pzTail));
              const pStmt = wasm.peekPtr(ppStmt);
              pSql = wasm.peekPtr(pzTail);
              sqlByteLen = Number(wasm.ptr.add(pSqlEnd, -pSql));
              if (!pStmt) continue;
              if (saveSql) saveSql.push(capi.sqlite3_sql(pStmt).trim());
              stmt = new Stmt(this, pStmt, BindTypes);
              if (bind && stmt.parameterCount) {
                stmt.bind(bind);
                bind = null;
              }
              if (evalFirstResult && stmt.columnCount) {
                let gotColNames = Array.isArray(opt.columnNames) ? 0 : 1;
                evalFirstResult = false;
                if (arg.cbArg || resultRows) {
                  const cbArgCache = /* @__PURE__ */ Object.create(null);
                  for (; stmt.step(); __execLock.delete(stmt)) {
                    if (0 === gotColNames++) stmt.getColumnNames(cbArgCache.columnNames = opt.columnNames || []);
                    __execLock.add(stmt);
                    const row = arg.cbArg(stmt, cbArgCache);
                    if (resultRows) resultRows.push(row);
                    if (callback && false === callback.call(opt, row, stmt)) break;
                  }
                  __execLock.delete(stmt);
                }
                if (0 === gotColNames) stmt.getColumnNames(opt.columnNames);
              } else stmt.step();
              stmt.reset().finalize();
              stmt = null;
            }
          } finally {
            if (stmt) {
              __execLock.delete(stmt);
              stmt.finalize();
            }
            wasm.scopedAllocPop(stack);
          }
          return arg.returnVal();
        },
        createFunction: function f(name, xFunc, opt) {
          const isFunc = (f2) => f2 instanceof Function;
          switch (arguments.length) {
            case 1:
              opt = name;
              name = opt.name;
              xFunc = opt.xFunc || 0;
              break;
            case 2:
              if (!isFunc(xFunc)) {
                opt = xFunc;
                xFunc = opt.xFunc || 0;
              }
              break;
            case 3:
              break;
            default:
              break;
          }
          if (!opt) opt = {};
          if ("string" !== typeof name) toss3("Invalid arguments: missing function name.");
          let xStep = opt.xStep || 0;
          let xFinal = opt.xFinal || 0;
          const xValue = opt.xValue || 0;
          const xInverse = opt.xInverse || 0;
          let isWindow = void 0;
          if (isFunc(xFunc)) {
            isWindow = false;
            if (isFunc(xStep) || isFunc(xFinal)) toss3("Ambiguous arguments: scalar or aggregate?");
            xStep = xFinal = null;
          } else if (isFunc(xStep)) {
            if (!isFunc(xFinal)) toss3("Missing xFinal() callback for aggregate or window UDF.");
            xFunc = null;
          } else if (isFunc(xFinal)) toss3("Missing xStep() callback for aggregate or window UDF.");
          else toss3("Missing function-type properties.");
          if (false === isWindow) {
            if (isFunc(xValue) || isFunc(xInverse)) toss3("xValue and xInverse are not permitted for non-window UDFs.");
          } else if (isFunc(xValue)) {
            if (!isFunc(xInverse)) toss3("xInverse must be provided if xValue is.");
            isWindow = true;
          } else if (isFunc(xInverse)) toss3("xValue must be provided if xInverse is.");
          const pApp = opt.pApp;
          if (void 0 !== pApp && null !== pApp && !wasm.isPtr(pApp)) toss3("Invalid value for pApp property. Must be a legal WASM pointer value.");
          const xDestroy = opt.xDestroy || 0;
          if (xDestroy && !isFunc(xDestroy)) toss3("xDestroy property must be a function.");
          let fFlags = 0;
          if (getOwnOption(opt, "deterministic")) fFlags |= capi.SQLITE_DETERMINISTIC;
          if (getOwnOption(opt, "directOnly")) fFlags |= capi.SQLITE_DIRECTONLY;
          if (getOwnOption(opt, "innocuous")) fFlags |= capi.SQLITE_INNOCUOUS;
          name = name.toLowerCase();
          const xArity = xFunc || xStep;
          const arity = getOwnOption(opt, "arity");
          const arityArg = "number" === typeof arity ? arity : xArity.length ? xArity.length - 1 : 0;
          let rc;
          if (isWindow) rc = capi.sqlite3_create_window_function(this.pointer, name, arityArg, capi.SQLITE_UTF8 | fFlags, pApp || 0, xStep, xFinal, xValue, xInverse, xDestroy);
          else rc = capi.sqlite3_create_function_v2(this.pointer, name, arityArg, capi.SQLITE_UTF8 | fFlags, pApp || 0, xFunc, xStep, xFinal, xDestroy);
          DB.checkRc(this, rc);
          return this;
        },
        selectValue: function(sql, bind, asType) {
          return __selectFirstRow(this, sql, bind, 0, asType);
        },
        selectValues: function(sql, bind, asType) {
          const stmt = this.prepare(sql), rc = [];
          try {
            stmt.bind(bind);
            while (stmt.step()) rc.push(stmt.get(0, asType));
            stmt.reset();
          } finally {
            stmt.finalize();
          }
          return rc;
        },
        selectArray: function(sql, bind) {
          return __selectFirstRow(this, sql, bind, []);
        },
        selectObject: function(sql, bind) {
          return __selectFirstRow(this, sql, bind, {});
        },
        selectArrays: function(sql, bind) {
          return __selectAll(this, sql, bind, "array");
        },
        selectObjects: function(sql, bind) {
          return __selectAll(this, sql, bind, "object");
        },
        openStatementCount: function() {
          return this.pointer ? Object.keys(__stmtMap.get(this)).length : 0;
        },
        transaction: function(callback) {
          let opener = "BEGIN";
          if (arguments.length > 1) {
            if (/[^a-zA-Z]/.test(arguments[0])) toss3(capi.SQLITE_MISUSE, "Invalid argument for BEGIN qualifier.");
            opener += " " + arguments[0];
            callback = arguments[1];
          }
          affirmDbOpen(this).exec(opener);
          try {
            const rc = callback(this);
            this.exec("COMMIT");
            return rc;
          } catch (e) {
            this.exec("ROLLBACK");
            throw e;
          }
        },
        savepoint: function(callback) {
          affirmDbOpen(this).exec("SAVEPOINT oo1");
          try {
            const rc = callback(this);
            this.exec("RELEASE oo1");
            return rc;
          } catch (e) {
            this.exec("ROLLBACK to SAVEPOINT oo1; RELEASE SAVEPOINT oo1");
            throw e;
          }
        },
        checkRc: function(resultCode) {
          return checkSqlite3Rc(this, resultCode);
        }
      };
      DB.wrapHandle = function(pDb2, takeOwnership = false) {
        if (!pDb2 || !wasm.isPtr(pDb2)) throw new sqlite3.SQLite3Error(capi.SQLITE_MISUSE, "Argument must be a WASM sqlite3 pointer");
        return new DB({
          "sqlite3*": pDb2,
          "sqlite3*:takeOwnership": !!takeOwnership
        });
      };
      const affirmStmtOpen = function(stmt) {
        if (!stmt.pointer) toss3("Stmt has been closed.");
        return stmt;
      };
      const isSupportedBindType = function(v2) {
        let t = BindTypes[null === v2 || void 0 === v2 ? "null" : typeof v2];
        switch (t) {
          case BindTypes.boolean:
          case BindTypes.null:
          case BindTypes.number:
          case BindTypes.string:
            return t;
          case BindTypes.bigint:
            return wasm.bigIntEnabled ? t : void 0;
          default:
            return util.isBindableTypedArray(v2) ? BindTypes.blob : void 0;
        }
      };
      const affirmSupportedBindType = function(v2) {
        return isSupportedBindType(v2) || toss3("Unsupported bind() argument type:", typeof v2);
      };
      const affirmParamIndex = function(stmt, key) {
        const n = "number" === typeof key ? key : capi.sqlite3_bind_parameter_index(stmt.pointer, key);
        if (0 === n || !util.isInt32(n)) toss3("Invalid bind() parameter name: " + key);
        else if (n < 1 || n > stmt.parameterCount) toss3("Bind index", key, "is out of range.");
        return n;
      };
      const __execLock = /* @__PURE__ */ new Set();
      const __stmtMayGet = /* @__PURE__ */ new Set();
      const affirmNotLockedByExec = function(stmt, currentOpName) {
        if (__execLock.has(stmt)) toss3("Operation is illegal when statement is locked:", currentOpName);
        return stmt;
      };
      const bindOne = function f(stmt, ndx, bindType, val) {
        affirmNotLockedByExec(affirmStmtOpen(stmt), "bind()");
        if (!f._) {
          f._tooBigInt = (v2) => toss3("BigInt value is too big to store without precision loss:", v2);
          f._ = { string: function(stmt2, ndx2, val2, asBlob) {
            const [pStr, n] = wasm.allocCString(val2, true);
            return (asBlob ? capi.sqlite3_bind_blob : capi.sqlite3_bind_text)(stmt2.pointer, ndx2, pStr, n, capi.SQLITE_WASM_DEALLOC);
          } };
        }
        affirmSupportedBindType(val);
        ndx = affirmParamIndex(stmt, ndx);
        let rc = 0;
        switch (null === val || void 0 === val ? BindTypes.null : bindType) {
          case BindTypes.null:
            rc = capi.sqlite3_bind_null(stmt.pointer, ndx);
            break;
          case BindTypes.string:
            rc = f._.string(stmt, ndx, val, false);
            break;
          case BindTypes.number: {
            let m;
            if (util.isInt32(val)) m = capi.sqlite3_bind_int;
            else if ("bigint" === typeof val) if (!util.bigIntFits64(val)) f._tooBigInt(val);
            else if (wasm.bigIntEnabled) m = capi.sqlite3_bind_int64;
            else if (util.bigIntFitsDouble(val)) {
              val = Number(val);
              m = capi.sqlite3_bind_double;
            } else f._tooBigInt(val);
            else {
              val = Number(val);
              if (wasm.bigIntEnabled && Number.isInteger(val)) m = capi.sqlite3_bind_int64;
              else m = capi.sqlite3_bind_double;
            }
            rc = m(stmt.pointer, ndx, val);
            break;
          }
          case BindTypes.boolean:
            rc = capi.sqlite3_bind_int(stmt.pointer, ndx, val ? 1 : 0);
            break;
          case BindTypes.blob: {
            if ("string" === typeof val) {
              rc = f._.string(stmt, ndx, val, true);
              break;
            } else if (val instanceof ArrayBuffer) val = new Uint8Array(val);
            else if (!util.isBindableTypedArray(val)) toss3("Binding a value as a blob requires", "that it be a string, Uint8Array, Int8Array, or ArrayBuffer.");
            const pBlob = wasm.alloc(val.byteLength || 1);
            wasm.heap8().set(val.byteLength ? val : [0], Number(pBlob));
            rc = capi.sqlite3_bind_blob(stmt.pointer, ndx, pBlob, val.byteLength, capi.SQLITE_WASM_DEALLOC);
            break;
          }
          default:
            sqlite3.config.warn("Unsupported bind() argument type:", val);
            toss3("Unsupported bind() argument type: " + typeof val);
        }
        if (rc) DB.checkRc(stmt.db.pointer, rc);
        return stmt;
      };
      Stmt.prototype = {
        finalize: function() {
          const ptr = this.pointer;
          if (ptr) {
            affirmNotLockedByExec(this, "finalize()");
            const rc = __doesNotOwnHandle.delete(this) ? 0 : capi.sqlite3_finalize(ptr);
            delete __stmtMap.get(this.db)[ptr];
            __ptrMap.delete(this);
            __execLock.delete(this);
            __stmtMayGet.delete(this);
            delete this.parameterCount;
            delete this.db;
            return rc;
          }
        },
        clearBindings: function() {
          affirmNotLockedByExec(affirmStmtOpen(this), "clearBindings()");
          capi.sqlite3_clear_bindings(this.pointer);
          __stmtMayGet.delete(this);
          return this;
        },
        reset: function(alsoClearBinds) {
          affirmNotLockedByExec(this, "reset()");
          if (alsoClearBinds) this.clearBindings();
          const rc = capi.sqlite3_reset(affirmStmtOpen(this).pointer);
          __stmtMayGet.delete(this);
          checkSqlite3Rc(this.db, rc);
          return this;
        },
        bind: function() {
          affirmStmtOpen(this);
          let ndx, arg;
          switch (arguments.length) {
            case 1:
              ndx = 1;
              arg = arguments[0];
              break;
            case 2:
              ndx = arguments[0];
              arg = arguments[1];
              break;
            default:
              toss3("Invalid bind() arguments.");
          }
          if (void 0 === arg) return this;
          else if (!this.parameterCount) toss3("This statement has no bindable parameters.");
          __stmtMayGet.delete(this);
          if (null === arg) return bindOne(this, ndx, BindTypes.null, arg);
          else if (Array.isArray(arg)) {
            if (1 !== arguments.length) toss3("When binding an array, an index argument is not permitted.");
            arg.forEach((v2, i) => bindOne(this, i + 1, affirmSupportedBindType(v2), v2));
            return this;
          } else if (arg instanceof ArrayBuffer) arg = new Uint8Array(arg);
          if ("object" === typeof arg && !util.isBindableTypedArray(arg)) {
            if (1 !== arguments.length) toss3("When binding an object, an index argument is not permitted.");
            Object.keys(arg).forEach((k2) => bindOne(this, k2, affirmSupportedBindType(arg[k2]), arg[k2]));
            return this;
          } else return bindOne(this, ndx, affirmSupportedBindType(arg), arg);
          toss3("Should not reach this point.");
        },
        bindAsBlob: function(ndx, arg) {
          affirmStmtOpen(this);
          if (1 === arguments.length) {
            arg = ndx;
            ndx = 1;
          }
          const t = affirmSupportedBindType(arg);
          if (BindTypes.string !== t && BindTypes.blob !== t && BindTypes.null !== t) toss3("Invalid value type for bindAsBlob()");
          return bindOne(this, ndx, BindTypes.blob, arg);
        },
        step: function() {
          affirmNotLockedByExec(this, "step()");
          const rc = capi.sqlite3_step(affirmStmtOpen(this).pointer);
          switch (rc) {
            case capi.SQLITE_DONE:
              __stmtMayGet.delete(this);
              return false;
            case capi.SQLITE_ROW:
              __stmtMayGet.add(this);
              return true;
            default:
              __stmtMayGet.delete(this);
              sqlite3.config.warn("sqlite3_step() rc=", rc, capi.sqlite3_js_rc_str(rc), "SQL =", capi.sqlite3_sql(this.pointer));
              DB.checkRc(this.db.pointer, rc);
          }
        },
        stepReset: function() {
          this.step();
          return this.reset();
        },
        stepFinalize: function() {
          try {
            const rc = this.step();
            this.reset();
            return rc;
          } finally {
            try {
              this.finalize();
            } catch (e) {
            }
          }
        },
        get: function(ndx, asType) {
          if (!__stmtMayGet.has(affirmStmtOpen(this))) toss3("Stmt.step() has not (recently) returned true.");
          if (Array.isArray(ndx)) {
            let i = 0;
            const n = this.columnCount;
            while (i < n) ndx[i] = this.get(i++);
            return ndx;
          } else if (ndx && "object" === typeof ndx) {
            let i = 0;
            const n = this.columnCount;
            while (i < n) ndx[capi.sqlite3_column_name(this.pointer, i)] = this.get(i++);
            return ndx;
          }
          affirmColIndex(this, ndx);
          switch (void 0 === asType ? capi.sqlite3_column_type(this.pointer, ndx) : asType) {
            case capi.SQLITE_NULL:
              return null;
            case capi.SQLITE_INTEGER:
              if (wasm.bigIntEnabled) {
                const rc = capi.sqlite3_column_int64(this.pointer, ndx);
                if (rc >= Number.MIN_SAFE_INTEGER && rc <= Number.MAX_SAFE_INTEGER) return Number(rc).valueOf();
                return rc;
              } else {
                const rc = capi.sqlite3_column_double(this.pointer, ndx);
                if (rc > Number.MAX_SAFE_INTEGER || rc < Number.MIN_SAFE_INTEGER) toss3("Integer is out of range for JS integer range: " + rc);
                return util.isInt32(rc) ? rc | 0 : rc;
              }
            case capi.SQLITE_FLOAT:
              return capi.sqlite3_column_double(this.pointer, ndx);
            case capi.SQLITE_TEXT:
              return capi.sqlite3_column_text(this.pointer, ndx);
            case capi.SQLITE_BLOB: {
              const n = capi.sqlite3_column_bytes(this.pointer, ndx), ptr = capi.sqlite3_column_blob(this.pointer, ndx), rc = new Uint8Array(n);
              if (n) {
                rc.set(wasm.heap8u().slice(Number(ptr), Number(ptr) + n), 0);
                if (this.db._blobXfer instanceof Array) this.db._blobXfer.push(rc.buffer);
              }
              return rc;
            }
            default:
              toss3("Don't know how to translate", "type of result column #" + ndx + ".");
          }
          toss3("Not reached.");
        },
        getInt: function(ndx) {
          return this.get(ndx, capi.SQLITE_INTEGER);
        },
        getFloat: function(ndx) {
          return this.get(ndx, capi.SQLITE_FLOAT);
        },
        getString: function(ndx) {
          return this.get(ndx, capi.SQLITE_TEXT);
        },
        getBlob: function(ndx) {
          return this.get(ndx, capi.SQLITE_BLOB);
        },
        getJSON: function(ndx) {
          const s = this.get(ndx, capi.SQLITE_STRING);
          return null === s ? s : JSON.parse(s);
        },
        getColumnName: function(ndx) {
          return capi.sqlite3_column_name(affirmColIndex(affirmStmtOpen(this), ndx).pointer, ndx);
        },
        getColumnNames: function(tgt = []) {
          affirmColIndex(affirmStmtOpen(this), 0);
          const n = this.columnCount;
          for (let i = 0; i < n; ++i) tgt.push(capi.sqlite3_column_name(this.pointer, i));
          return tgt;
        },
        getParamIndex: function(name) {
          return affirmStmtOpen(this).parameterCount ? capi.sqlite3_bind_parameter_index(this.pointer, name) : void 0;
        },
        getParamName: function(ndx) {
          return affirmStmtOpen(this).parameterCount ? capi.sqlite3_bind_parameter_name(this.pointer, ndx) : void 0;
        },
        isBusy: function() {
          return 0 !== capi.sqlite3_stmt_busy(affirmStmtOpen(this));
        },
        isReadOnly: function() {
          return 0 !== capi.sqlite3_stmt_readonly(affirmStmtOpen(this));
        }
      };
      {
        const prop = {
          enumerable: true,
          get: function() {
            return __ptrMap.get(this);
          },
          set: () => toss3("The pointer property is read-only.")
        };
        Object.defineProperty(Stmt.prototype, "pointer", prop);
        Object.defineProperty(DB.prototype, "pointer", prop);
      }
      Object.defineProperty(Stmt.prototype, "columnCount", {
        enumerable: false,
        get: function() {
          return capi.sqlite3_column_count(this.pointer);
        },
        set: () => toss3("The columnCount property is read-only.")
      });
      Object.defineProperty(Stmt.prototype, "parameterCount", {
        enumerable: false,
        get: function() {
          return capi.sqlite3_bind_parameter_count(this.pointer);
        },
        set: () => toss3("The parameterCount property is read-only.")
      });
      Stmt.wrapHandle = function(oo1db, pStmt, takeOwnership = false) {
        if (!(oo1db instanceof DB) || !oo1db.pointer) throw new sqlite3.SQLite3Error(sqlite3.SQLITE_MISUSE, "First argument must be an opened sqlite3.oo1.DB instance");
        if (!pStmt || !wasm.isPtr(pStmt)) throw new sqlite3.SQLite3Error(sqlite3.SQLITE_MISUSE, "Second argument must be a WASM sqlite3_stmt pointer");
        return new Stmt(oo1db, pStmt, BindTypes, !!takeOwnership);
      };
      sqlite3.oo1 = {
        DB,
        Stmt
      };
    });
    globalThis.sqlite3ApiBootstrap.initializers.push(function(sqlite3) {
      const util = sqlite3.util;
      sqlite3.initWorker1API = function() {
        "use strict";
        const toss = (...args) => {
          throw new Error(args.join(" "));
        };
        if (!(globalThis.WorkerGlobalScope instanceof Function)) toss("initWorker1API() must be run from a Worker thread.");
        const sqlite32 = this.sqlite3 || toss("Missing this.sqlite3 object.");
        const DB = sqlite32.oo1.DB;
        const getDbId = function(db) {
          let id = wState.idMap.get(db);
          if (id) return id;
          id = "db#" + ++wState.idSeq + ":" + Math.floor(Math.random() * 1e8) + ":" + Math.floor(Math.random() * 1e8);
          wState.idMap.set(db, id);
          return id;
        };
        const wState = {
          dbList: [],
          idSeq: 0,
          idMap: /* @__PURE__ */ new WeakMap(),
          xfer: [],
          open: function(opt) {
            const db = new DB(opt);
            this.dbs[getDbId(db)] = db;
            if (this.dbList.indexOf(db) < 0) this.dbList.push(db);
            return db;
          },
          close: function(db, alsoUnlink) {
            if (db) {
              delete this.dbs[getDbId(db)];
              const filename = db.filename;
              const pVfs = util.sqlite3__wasm_db_vfs(db.pointer, 0);
              db.close();
              const ddNdx = this.dbList.indexOf(db);
              if (ddNdx >= 0) this.dbList.splice(ddNdx, 1);
              if (alsoUnlink && filename && pVfs) util.sqlite3__wasm_vfs_unlink(pVfs, filename);
            }
          },
          post: function(msg, xferList) {
            if (xferList && xferList.length) {
              globalThis.postMessage(msg, Array.from(xferList));
              xferList.length = 0;
            } else globalThis.postMessage(msg);
          },
          dbs: /* @__PURE__ */ Object.create(null),
          getDb: function(id, require2 = true) {
            return this.dbs[id] || (require2 ? toss("Unknown (or closed) DB ID:", id) : void 0);
          }
        };
        const affirmDbOpen = function(db = wState.dbList[0]) {
          return db && db.pointer ? db : toss("DB is not opened.");
        };
        const getMsgDb = function(msgData, affirmExists = true) {
          const db = wState.getDb(msgData.dbId, false) || wState.dbList[0];
          return affirmExists ? affirmDbOpen(db) : db;
        };
        const getDefaultDbId = function() {
          return wState.dbList[0] && getDbId(wState.dbList[0]);
        };
        const wMsgHandler = {
          open: function(ev) {
            const oargs = /* @__PURE__ */ Object.create(null), args = ev.args || /* @__PURE__ */ Object.create(null);
            if (args.simulateError) toss("Throwing because of simulateError flag.");
            const rc = /* @__PURE__ */ Object.create(null);
            oargs.vfs = args.vfs;
            oargs.filename = args.filename || "";
            const db = wState.open(oargs);
            rc.filename = db.filename;
            rc.persistent = !!sqlite32.capi.sqlite3_js_db_uses_vfs(db.pointer, "opfs");
            rc.dbId = getDbId(db);
            rc.vfs = db.dbVfsName();
            return rc;
          },
          close: function(ev) {
            const db = getMsgDb(ev, false);
            const response = { filename: db && db.filename };
            if (db) {
              const doUnlink = ev.args && "object" === typeof ev.args ? !!ev.args.unlink : false;
              wState.close(db, doUnlink);
            }
            return response;
          },
          exec: function(ev) {
            const rc = "string" === typeof ev.args ? { sql: ev.args } : ev.args || /* @__PURE__ */ Object.create(null);
            if ("stmt" === rc.rowMode) toss("Invalid rowMode for 'exec': stmt mode", "does not work in the Worker API.");
            else if (!rc.sql) toss("'exec' requires input SQL.");
            const db = getMsgDb(ev);
            if (rc.callback || Array.isArray(rc.resultRows)) db._blobXfer = wState.xfer;
            const theCallback = rc.callback;
            let rowNumber = 0;
            const hadColNames = !!rc.columnNames;
            if ("string" === typeof theCallback) {
              if (!hadColNames) rc.columnNames = [];
              rc.callback = function(row, stmt) {
                wState.post({
                  type: theCallback,
                  columnNames: rc.columnNames,
                  rowNumber: ++rowNumber,
                  row
                }, wState.xfer);
              };
            }
            try {
              const changeCount = !!rc.countChanges ? db.changes(true, 64 === rc.countChanges) : void 0;
              db.exec(rc);
              if (void 0 !== changeCount) rc.changeCount = db.changes(true, 64 === rc.countChanges) - changeCount;
              const lastInsertRowId = !!rc.lastInsertRowId ? sqlite32.capi.sqlite3_last_insert_rowid(db) : void 0;
              if (void 0 !== lastInsertRowId) rc.lastInsertRowId = lastInsertRowId;
              if (rc.callback instanceof Function) {
                rc.callback = theCallback;
                wState.post({
                  type: theCallback,
                  columnNames: rc.columnNames,
                  rowNumber: null,
                  row: void 0
                });
              }
            } finally {
              delete db._blobXfer;
              if (rc.callback) rc.callback = theCallback;
            }
            return rc;
          },
          "config-get": function() {
            const rc = /* @__PURE__ */ Object.create(null), src = sqlite32.config;
            ["bigIntEnabled"].forEach(function(k2) {
              if (Object.getOwnPropertyDescriptor(src, k2)) rc[k2] = src[k2];
            });
            rc.version = sqlite32.version;
            rc.vfsList = sqlite32.capi.sqlite3_js_vfs_list();
            return rc;
          },
          export: function(ev) {
            const db = getMsgDb(ev);
            const response = {
              byteArray: sqlite32.capi.sqlite3_js_db_export(db.pointer),
              filename: db.filename,
              mimetype: "application/x-sqlite3"
            };
            wState.xfer.push(response.byteArray.buffer);
            return response;
          },
          toss: function(ev) {
            toss("Testing worker exception");
          }
        };
        globalThis.onmessage = async function(ev) {
          ev = ev.data;
          let result, dbId = ev.dbId, evType = ev.type;
          const arrivalTime = performance.now();
          try {
            if (wMsgHandler.hasOwnProperty(evType) && wMsgHandler[evType] instanceof Function) result = await wMsgHandler[evType](ev);
            else toss("Unknown db worker message type:", ev.type);
          } catch (err2) {
            evType = "error";
            result = {
              operation: ev.type,
              message: err2.message,
              errorClass: err2.name,
              input: ev
            };
            if (err2.stack) result.stack = "string" === typeof err2.stack ? err2.stack.split(/\n\s*/) : err2.stack;
          }
          if (!dbId) dbId = result.dbId || getDefaultDbId();
          wState.post({
            type: evType,
            dbId,
            messageId: ev.messageId,
            workerReceivedTime: arrivalTime,
            workerRespondTime: performance.now(),
            departureTime: ev.departureTime,
            result
          }, wState.xfer);
        };
        globalThis.postMessage({
          type: "sqlite3-api",
          result: "worker1-ready"
        });
      }.bind({ sqlite3 });
    });
    globalThis.sqlite3ApiBootstrap.initializers.push(function(sqlite3) {
      const wasm = sqlite3.wasm, capi = sqlite3.capi, toss = sqlite3.util.toss3;
      const vfs = /* @__PURE__ */ Object.create(null);
      sqlite3.vfs = vfs;
      capi.sqlite3_vfs.prototype.registerVfs = function(asDefault = false) {
        if (!(this instanceof sqlite3.capi.sqlite3_vfs)) toss("Expecting a sqlite3_vfs-type argument.");
        const rc = capi.sqlite3_vfs_register(this, asDefault ? 1 : 0);
        if (rc) toss("sqlite3_vfs_register(", this, ") failed with rc", rc);
        if (this.pointer !== capi.sqlite3_vfs_find(this.$zName)) toss("BUG: sqlite3_vfs_find(vfs.$zName) failed for just-installed VFS", this);
        return this;
      };
      vfs.installVfs = function(opt) {
        let count = 0;
        const propList = ["io", "vfs"];
        for (const key of propList) {
          const o = opt[key];
          if (o) {
            ++count;
            o.struct.installMethods(o.methods, !!o.applyArgcCheck);
            if ("vfs" === key) {
              if (!o.struct.$zName && "string" === typeof o.name) o.struct.addOnDispose(o.struct.$zName = wasm.allocCString(o.name));
              o.struct.registerVfs(!!o.asDefault);
            }
          }
        }
        if (!count) toss("Misuse: installVfs() options object requires at least", "one of:", propList);
        return this;
      };
    });
    globalThis.sqlite3ApiBootstrap.initializers.push(function(sqlite3) {
      if (!sqlite3.wasm.exports.sqlite3_declare_vtab) return;
      const wasm = sqlite3.wasm, capi = sqlite3.capi, toss = sqlite3.util.toss3;
      const vtab = /* @__PURE__ */ Object.create(null);
      sqlite3.vtab = vtab;
      const sii = capi.sqlite3_index_info;
      sii.prototype.nthConstraint = function(n, asPtr = false) {
        if (n < 0 || n >= this.$nConstraint) return false;
        const ptr = wasm.ptr.add(this.$aConstraint, sii.sqlite3_index_constraint.structInfo.sizeof * n);
        return asPtr ? ptr : new sii.sqlite3_index_constraint(ptr);
      };
      sii.prototype.nthConstraintUsage = function(n, asPtr = false) {
        if (n < 0 || n >= this.$nConstraint) return false;
        const ptr = wasm.ptr.add(this.$aConstraintUsage, sii.sqlite3_index_constraint_usage.structInfo.sizeof * n);
        return asPtr ? ptr : new sii.sqlite3_index_constraint_usage(ptr);
      };
      sii.prototype.nthOrderBy = function(n, asPtr = false) {
        if (n < 0 || n >= this.$nOrderBy) return false;
        const ptr = wasm.ptr.add(this.$aOrderBy, sii.sqlite3_index_orderby.structInfo.sizeof * n);
        return asPtr ? ptr : new sii.sqlite3_index_orderby(ptr);
      };
      const __xWrapFactory = function(methodName, StructType) {
        return function(ptr, removeMapping = false) {
          if (0 === arguments.length) ptr = new StructType();
          if (ptr instanceof StructType) {
            this.set(ptr.pointer, ptr);
            return ptr;
          } else if (!wasm.isPtr(ptr)) sqlite3.SQLite3Error.toss("Invalid argument to", methodName + "()");
          let rc = this.get(ptr);
          if (removeMapping) this.delete(ptr);
          return rc;
        }.bind(/* @__PURE__ */ new Map());
      };
      const StructPtrMapper = function(name, StructType) {
        const __xWrap = __xWrapFactory(name, StructType);
        return Object.assign(/* @__PURE__ */ Object.create(null), {
          StructType,
          create: (ppOut) => {
            const rc = __xWrap();
            wasm.pokePtr(ppOut, rc.pointer);
            return rc;
          },
          get: (pCObj) => __xWrap(pCObj),
          unget: (pCObj) => __xWrap(pCObj, true),
          dispose: (pCObj) => __xWrap(pCObj, true)?.dispose?.()
        });
      };
      vtab.xVtab = StructPtrMapper("xVtab", capi.sqlite3_vtab);
      vtab.xCursor = StructPtrMapper("xCursor", capi.sqlite3_vtab_cursor);
      vtab.xIndexInfo = (pIdxInfo) => new capi.sqlite3_index_info(pIdxInfo);
      vtab.xError = function f(methodName, err2, defaultRc) {
        if (f.errorReporter instanceof Function) try {
          f.errorReporter("sqlite3_module::" + methodName + "(): " + err2.message);
        } catch (e) {
        }
        let rc;
        if (err2 instanceof sqlite3.WasmAllocError) rc = capi.SQLITE_NOMEM;
        else if (arguments.length > 2) rc = defaultRc;
        else if (err2 instanceof sqlite3.SQLite3Error) rc = err2.resultCode;
        return rc || capi.SQLITE_ERROR;
      };
      vtab.xError.errorReporter = sqlite3.config.error.bind(sqlite3.config);
      vtab.xRowid = (ppRowid64, value) => wasm.poke(ppRowid64, value, "i64");
      vtab.setupModule = function(opt) {
        let createdMod = false;
        const mod = this instanceof capi.sqlite3_module ? this : opt.struct || (createdMod = new capi.sqlite3_module());
        try {
          const methods = opt.methods || toss("Missing 'methods' object.");
          for (const e of Object.entries({
            xConnect: "xCreate",
            xDisconnect: "xDestroy"
          })) {
            const k2 = e[0], v2 = e[1];
            if (true === methods[k2]) methods[k2] = methods[v2];
            else if (true === methods[v2]) methods[v2] = methods[k2];
          }
          if (opt.catchExceptions) {
            const fwrap = function(methodName, func) {
              if (["xConnect", "xCreate"].indexOf(methodName) >= 0) return function(pDb2, pAux, argc, argv, ppVtab, pzErr) {
                try {
                  return func(...arguments) || 0;
                } catch (e) {
                  if (!(e instanceof sqlite3.WasmAllocError)) {
                    wasm.dealloc(wasm.peekPtr(pzErr));
                    wasm.pokePtr(pzErr, wasm.allocCString(e.message));
                  }
                  return vtab.xError(methodName, e);
                }
              };
              else return function(...args) {
                try {
                  return func(...args) || 0;
                } catch (e) {
                  return vtab.xError(methodName, e);
                }
              };
            };
            const mnames = [
              "xCreate",
              "xConnect",
              "xBestIndex",
              "xDisconnect",
              "xDestroy",
              "xOpen",
              "xClose",
              "xFilter",
              "xNext",
              "xEof",
              "xColumn",
              "xRowid",
              "xUpdate",
              "xBegin",
              "xSync",
              "xCommit",
              "xRollback",
              "xFindFunction",
              "xRename",
              "xSavepoint",
              "xRelease",
              "xRollbackTo",
              "xShadowName"
            ];
            const remethods = /* @__PURE__ */ Object.create(null);
            for (const k2 of mnames) {
              const m = methods[k2];
              if (!(m instanceof Function)) continue;
              else if ("xConnect" === k2 && methods.xCreate === m) remethods[k2] = methods.xCreate;
              else if ("xCreate" === k2 && methods.xConnect === m) remethods[k2] = methods.xConnect;
              else remethods[k2] = fwrap(k2, m);
            }
            mod.installMethods(remethods, false);
          } else mod.installMethods(methods, !!opt.applyArgcCheck);
          if (0 === mod.$iVersion) {
            let v2;
            if ("number" === typeof opt.iVersion) v2 = opt.iVersion;
            else if (mod.$xIntegrity) v2 = 4;
            else if (mod.$xShadowName) v2 = 3;
            else if (mod.$xSavePoint || mod.$xRelease || mod.$xRollbackTo) v2 = 2;
            else v2 = 1;
            mod.$iVersion = v2;
          }
        } catch (e) {
          if (createdMod) createdMod.dispose();
          throw e;
        }
        return mod;
      };
      capi.sqlite3_module.prototype.setupModule = function(opt) {
        return vtab.setupModule.call(this, opt);
      };
    });
    globalThis.sqlite3ApiBootstrap.initializers.push(function(sqlite3) {
      if (sqlite3.config.disable?.vfs?.kvvfs) return;
      const capi = sqlite3.capi, sqlite3_kvvfs_methods = capi.sqlite3_kvvfs_methods, KVVfsFile = capi.KVVfsFile, pKvvfs = sqlite3.capi.sqlite3_vfs_find("kvvfs");
      delete capi.sqlite3_kvvfs_methods;
      delete capi.KVVfsFile;
      if (!pKvvfs) return;
      const util = sqlite3.util, wasm = sqlite3.wasm, toss3 = util.toss3;
      const kvvfsMethods = new sqlite3_kvvfs_methods(wasm.exports.sqlite3__wasm_kvvfs_methods());
      util.assert(32 <= kvvfsMethods.$nKeySize, "unexpected kvvfsMethods.$nKeySize: " + kvvfsMethods.$nKeySize);
      const cache = Object.assign(/* @__PURE__ */ Object.create(null), {
        rxJournalSuffix: /-journal$/,
        zKeyJrnl: wasm.allocCString("jrnl"),
        zKeySz: wasm.allocCString("sz"),
        keySize: kvvfsMethods.$nKeySize,
        buffer: Object.assign(/* @__PURE__ */ Object.create(null), {
          n: kvvfsMethods.$nBufferSize,
          pool: /* @__PURE__ */ Object.create(null)
        })
      });
      cache.memBuffer = (id = 0) => cache.buffer.pool[id] ??= wasm.alloc(cache.buffer.n);
      cache.memBufferFree = (id) => {
        const b = cache.buffer.pool[id];
        if (b) {
          wasm.dealloc(b);
          delete cache.buffer.pool[id];
        }
      };
      const noop = () => {
      };
      const debug = sqlite3.__isUnderTest ? (...args) => sqlite3.config.debug?.("kvvfs:", ...args) : noop;
      const warn = (...args) => sqlite3.config.warn?.("kvvfs:", ...args);
      const error = (...args) => sqlite3.config.error?.("kvvfs:", ...args);
      class KVVfsStorage {
        #map = /* @__PURE__ */ Object.create(null);
        #keys = null;
        #size = 0;
        constructor() {
          this.clear();
        }
        #getKeys() {
          return this.#keys ??= Object.keys(this.#map);
        }
        key(n) {
          if (n < 0 || n >= this.#size) return null;
          return this.#getKeys()[n];
        }
        getItem(k2) {
          return this.#map[k2] ?? null;
        }
        setItem(k2, v2) {
          if (!(k2 in this.#map)) {
            ++this.#size;
            this.#keys = null;
          }
          this.#map[k2] = "" + v2;
        }
        removeItem(k2) {
          if (k2 in this.#map) {
            delete this.#map[k2];
            --this.#size;
            this.#keys = null;
          }
        }
        clear() {
          this.#map = /* @__PURE__ */ Object.create(null);
          this.#keys = null;
          this.#size = 0;
        }
        get length() {
          return this.#size;
        }
      }
      const kvvfsIsPersistentName = (v2) => "local" === v2 || "session" === v2;
      const kvvfsKeyPrefix = (v2) => kvvfsIsPersistentName(v2) ? "kvvfs-" + v2 + "-" : "";
      const validateStorageName = function(n, mayBeJournal = false) {
        if (kvvfsIsPersistentName(n)) return;
        const len = new Blob([n]).size;
        if (!len) toss3(capi.SQLITE_MISUSE, "Empty name is not permitted.");
        let maxLen = cache.keySize - 1;
        if (cache.rxJournalSuffix.test(n)) {
          if (!mayBeJournal) toss3(capi.SQLITE_MISUSE, "Storage names may not have a '-journal' suffix.");
        } else if (["-wal", "-shm"].filter((v2) => n.endsWith(v2)).length) toss3(capi.SQLITE_MISUSE, "Storage names may not have a -wal or -shm suffix.");
        else maxLen -= 8;
        if (len > maxLen) toss3(capi.SQLITE_RANGE, "Storage name is too long. Limit =", maxLen);
        let i;
        for (i = 0; i < len; ++i) {
          const ch = n.codePointAt(i);
          if (ch < 32) toss3(capi.SQLITE_RANGE, "Illegal character (" + ch + "d) in storage name:", n);
        }
      };
      const newStorageObj = (name, storage = void 0) => Object.assign(/* @__PURE__ */ Object.create(null), {
        jzClass: name,
        refc: 1,
        deleteAtRefc0: false,
        storage: storage || new KVVfsStorage(),
        keyPrefix: kvvfsKeyPrefix(name),
        files: [],
        listeners: void 0
      });
      const kvvfs = sqlite3.kvvfs = /* @__PURE__ */ Object.create(null);
      if (sqlite3.__isUnderTest) kvvfs.log = Object.assign(/* @__PURE__ */ Object.create(null), {
        xOpen: false,
        xClose: false,
        xWrite: false,
        xRead: false,
        xSync: false,
        xAccess: false,
        xFileControl: false,
        xRcrdRead: false,
        xRcrdWrite: false,
        xRcrdDelete: false
      });
      const deleteStorage = function(store) {
        const other = cache.rxJournalSuffix.test(store.jzClass) ? store.jzClass.replace(cache.rxJournalSuffix, "") : store.jzClass + "-journal";
        kvvfs?.log?.xClose && debug("cleaning up storage handles [", store.jzClass, other, "]", store);
        delete cache.storagePool[store.jzClass];
        delete cache.storagePool[other];
        if (!sqlite3.__isUnderTest) {
          delete store.storage;
          delete store.refc;
        }
      };
      const installStorageAndJournal = (store) => cache.storagePool[store.jzClass] = cache.storagePool[store.jzClass + "-journal"] = store;
      const nameOfThisThreadStorage = ".";
      cache.storagePool = Object.assign(/* @__PURE__ */ Object.create(null), { [nameOfThisThreadStorage]: newStorageObj(nameOfThisThreadStorage) });
      if (globalThis.Storage) {
        if (globalThis.localStorage instanceof globalThis.Storage) cache.storagePool.local = newStorageObj("local", globalThis.localStorage);
        if (globalThis.sessionStorage instanceof globalThis.Storage) cache.storagePool.session = newStorageObj("session", globalThis.sessionStorage);
      }
      cache.builtinStorageNames = Object.keys(cache.storagePool);
      const isBuiltinName = (n) => cache.builtinStorageNames.indexOf(n) > -1;
      for (const k2 of Object.keys(cache.storagePool)) {
        const orig = cache.storagePool[k2];
        cache.storagePool[k2 + "-journal"] = orig;
      }
      cache.setError = (e = void 0, dfltErrCode = capi.SQLITE_ERROR) => {
        if (e) {
          cache.lastError = e;
          return e.resultCode | 0 || dfltErrCode;
        }
        delete cache.lastError;
        return 0;
      };
      cache.popError = () => {
        const e = cache.lastError;
        delete cache.lastError;
        return e;
      };
      const catchForNotify = (e) => {
        warn("kvvfs.listener handler threw:", e);
      };
      const kvvfsDecode = wasm.exports.sqlite3__wasm_kvvfs_decode;
      const kvvfsEncode = wasm.exports.sqlite3__wasm_kvvfs_encode;
      const notifyListeners = async function(eventName, store, ...args) {
        try {
          if (store.keyPrefix && args[0]) args[0] = args[0].replace(store.keyPrefix, "");
          let u8enc, z0, z1, wcache;
          for (const ear of store.listeners) {
            const ev = /* @__PURE__ */ Object.create(null);
            ev.storageName = store.jzClass;
            ev.type = eventName;
            ear.decodePages;
            const f = ear.events[eventName];
            if (f) {
              if (!ear.includeJournal && args[0] === "jrnl") continue;
              if ("write" === eventName && ear.decodePages && +args[0] > 0) {
                ev.data = [args[0]];
                if (wcache?.[args[0]]) {
                  ev.data[1] = wcache[args[0]];
                  continue;
                }
                u8enc ??= new TextEncoder("utf-8");
                z0 ??= cache.memBuffer(10);
                z1 ??= cache.memBuffer(11);
                const u = u8enc.encode(args[1]);
                const heap = wasm.heap8u();
                heap.set(u, Number(z0));
                heap[wasm.ptr.addn(z0, u.length)] = 0;
                const rc = kvvfsDecode(z0, z1, cache.buffer.n);
                if (rc > 0) {
                  wcache ??= /* @__PURE__ */ Object.create(null);
                  wcache[args[0]] = ev.data[1] = heap.slice(Number(z1), wasm.ptr.addn(z1, rc));
                } else continue;
              } else ev.data = args.length ? args.length === 1 ? args[0] : args : void 0;
              try {
                f(ev)?.catch?.(catchForNotify);
              } catch (e) {
                warn("notifyListeners [", store.jzClass, "]", eventName, e);
              }
            }
          }
        } catch (e) {
          catchForNotify(e);
        }
      };
      const storageForZClass = (zClass) => "string" === typeof zClass ? cache.storagePool[zClass] : cache.storagePool[wasm.cstrToJs(zClass)];
      const kvvfsMakeKey = wasm.exports.sqlite3__wasm_kvvfsMakeKey;
      const zKeyForStorage = (store, zClass, zKey) => {
        return zClass && store.keyPrefix ? kvvfsMakeKey(zClass, zKey) : zKey;
      };
      const jsKeyForStorage = (store, zClass, zKey) => wasm.cstrToJs(zKeyForStorage(store, zClass, zKey));
      const storageGetDbSize = (store) => +store.storage.getItem(store.keyPrefix + "sz");
      const pFileHandles = /* @__PURE__ */ new Map();
      const originalMethods = {
        vfs: /* @__PURE__ */ Object.create(null),
        ioDb: /* @__PURE__ */ Object.create(null),
        ioJrnl: /* @__PURE__ */ Object.create(null)
      };
      const pVfs = new capi.sqlite3_vfs(kvvfsMethods.$pVfs);
      const pIoDb = new capi.sqlite3_io_methods(kvvfsMethods.$pIoDb);
      const pIoJrnl = new capi.sqlite3_io_methods(kvvfsMethods.$pIoJrnl);
      const recordHandler = /* @__PURE__ */ Object.create(null);
      const kvvfsInternal = Object.assign(/* @__PURE__ */ Object.create(null), {
        pFileHandles,
        cache,
        storageForZClass,
        KVVfsStorage,
        disablePageSizeChange: true
      });
      if (kvvfs.log) kvvfs.internal = kvvfsInternal;
      const methodOverrides = {
        recordHandler: {
          xRcrdRead: (zClass, zKey, zBuf, nBuf) => {
            try {
              const jzClass = wasm.cstrToJs(zClass);
              const store = storageForZClass(jzClass);
              if (!store) return -1;
              const jXKey = jsKeyForStorage(store, zClass, zKey);
              kvvfs?.log?.xRcrdRead && warn("xRcrdRead", jzClass, jXKey, nBuf, store);
              const jV = store.storage.getItem(jXKey);
              if (null === jV) return -1;
              const nV = jV.length;
              if (nBuf <= 0) return nV;
              else if (1 === nBuf) {
                wasm.poke(zBuf, 0);
                return nV;
              }
              if (nBuf + 1 < nV) toss3(capi.SQLITE_RANGE, "xRcrdRead()", jzClass, jXKey, "input buffer is too small: need", nV, "but have", nBuf);
              const zV = cache.memBuffer(0);
              const heap = wasm.heap8();
              let i;
              for (i = 0; i < nV; ++i) heap[wasm.ptr.add(zV, i)] = jV.codePointAt(i) & 255;
              heap.copyWithin(Number(zBuf), Number(zV), wasm.ptr.addn(zV, i));
              heap[wasm.ptr.add(zBuf, nV)] = 0;
              return nBuf;
            } catch (e) {
              error("kvrecordRead()", e);
              cache.setError(e);
              return -2;
            }
          },
          xRcrdWrite: (zClass, zKey, zData) => {
            try {
              const store = storageForZClass(zClass);
              const jxKey = jsKeyForStorage(store, zClass, zKey);
              const jData = wasm.cstrToJs(zData);
              kvvfs?.log?.xRcrdWrite && warn("xRcrdWrite", jxKey, store);
              store.storage.setItem(jxKey, jData);
              store.listeners && notifyListeners("write", store, jxKey, jData);
              return 0;
            } catch (e) {
              error("kvrecordWrite()", e);
              return cache.setError(e, capi.SQLITE_IOERR);
            }
          },
          xRcrdDelete: (zClass, zKey) => {
            try {
              const store = storageForZClass(zClass);
              const jxKey = jsKeyForStorage(store, zClass, zKey);
              kvvfs?.log?.xRcrdDelete && warn("xRcrdDelete", jxKey, store);
              store.storage.removeItem(jxKey);
              store.listeners && notifyListeners("delete", store, jxKey);
              return 0;
            } catch (e) {
              error("kvrecordDelete()", e);
              return cache.setError(e, capi.SQLITE_IOERR);
            }
          }
        },
        vfs: {
          xOpen: function(pProtoVfs, zName, pProtoFile, flags, pOutFlags) {
            cache.popError();
            let zToFree;
            try {
              if (!zName) {
                zToFree = wasm.allocCString("" + pProtoFile + "." + (Math.random() * 1e5 | 0));
                zName = zToFree;
              }
              const jzClass = wasm.cstrToJs(zName);
              kvvfs?.log?.xOpen && debug("xOpen", jzClass, "flags =", flags);
              validateStorageName(jzClass, true);
              if (flags & (capi.SQLITE_OPEN_MAIN_DB | capi.SQLITE_OPEN_TEMP_DB | capi.SQLITE_OPEN_TRANSIENT_DB) && cache.rxJournalSuffix.test(jzClass)) toss3(capi.SQLITE_ERROR, "DB files may not have a '-journal' suffix.");
              let s = storageForZClass(jzClass);
              if (!s && !(flags & capi.SQLITE_OPEN_CREATE)) toss3(capi.SQLITE_ERROR, "Storage not found:", jzClass);
              const rc = originalMethods.vfs.xOpen(pProtoVfs, zName, pProtoFile, flags, pOutFlags);
              if (rc) return rc;
              let deleteAt0 = !!(capi.SQLITE_OPEN_DELETEONCLOSE & flags);
              if (wasm.isPtr(arguments[1])) {
                if (capi.sqlite3_uri_boolean(zName, "delete-on-close", 0)) deleteAt0 = true;
              }
              const f = new KVVfsFile(pProtoFile);
              util.assert(f.$zClass, "Missing f.$zClass");
              f.addOnDispose(zToFree);
              zToFree = void 0;
              if (s) {
                ++s.refc;
                s.files.push(f);
                wasm.poke32(pOutFlags, flags);
              } else {
                wasm.poke32(pOutFlags, flags | capi.SQLITE_OPEN_CREATE);
                util.assert(!f.$isJournal, "Opening a journal before its db? " + jzClass);
                const nm = jzClass.replace(cache.rxJournalSuffix, "");
                s = newStorageObj(nm);
                installStorageAndJournal(s);
                s.files.push(f);
                s.deleteAtRefc0 = deleteAt0;
                kvvfs?.log?.xOpen && debug("xOpen installed storage handle [", nm, nm + "-journal", "]", s);
              }
              pFileHandles.set(pProtoFile, {
                store: s,
                file: f,
                jzClass
              });
              s.listeners && notifyListeners("open", s, s.files.length);
              return 0;
            } catch (e) {
              warn("xOpen:", e);
              return cache.setError(e);
            } finally {
              zToFree && wasm.dealloc(zToFree);
            }
          },
          xDelete: function(pVfs2, zName, iSyncFlag) {
            cache.popError();
            try {
              const jzName = wasm.cstrToJs(zName);
              if (cache.rxJournalSuffix.test(jzName)) recordHandler.xRcrdDelete(zName, cache.zKeyJrnl);
              return 0;
            } catch (e) {
              warn("xDelete", e);
              return cache.setError(e);
            }
          },
          xAccess: function(pProtoVfs, zPath, flags, pResOut) {
            cache.popError();
            try {
              const s = storageForZClass(zPath);
              const jzPath = s?.jzClass || wasm.cstrToJs(zPath);
              if (kvvfs?.log?.xAccess) debug("xAccess", jzPath, "flags =", flags, "*pResOut =", wasm.peek32(pResOut), "store =", s);
              if (!s)
                try {
                  validateStorageName(jzPath);
                } catch (e) {
                  wasm.poke32(pResOut, 0);
                  return 0;
                }
              if (s) {
                const key = s.keyPrefix + (cache.rxJournalSuffix.test(jzPath) ? "jrnl" : "1");
                const res = s.storage.getItem(key) ? 0 : 1;
                wasm.poke32(pResOut, res);
              } else wasm.poke32(pResOut, 0);
              return 0;
            } catch (e) {
              error("xAccess", e);
              return cache.setError(e);
            }
          },
          xRandomness: function(pVfs2, nOut, pOut) {
            const heap = wasm.heap8u();
            let i = 0;
            const npOut = Number(pOut);
            for (; i < nOut; ++i) heap[npOut + i] = Math.random() * 255e3 & 255;
            return nOut;
          },
          xGetLastError: function(pVfs2, nOut, pOut) {
            const e = cache.popError();
            debug("xGetLastError", e);
            if (e) {
              const scope = wasm.scopedAllocPush();
              try {
                const [cMsg, n] = wasm.scopedAllocCString(e.message, true);
                wasm.cstrncpy(pOut, cMsg, nOut);
                if (n > nOut) wasm.poke8(wasm.ptr.add(pOut, nOut, -1), 0);
                debug("set xGetLastError", e.message);
                return e.resultCode | 0 || capi.SQLITE_IOERR;
              } catch (e2) {
                return capi.SQLITE_NOMEM;
              } finally {
                wasm.scopedAllocPop(scope);
              }
            }
            return 0;
          }
        },
        ioDb: {
          xClose: function(pFile) {
            cache.popError();
            try {
              const h = pFileHandles.get(pFile);
              kvvfs?.log?.xClose && debug("xClose", pFile, h);
              if (h) {
                pFileHandles.delete(pFile);
                const s = h.store;
                s.files = s.files.filter((v2) => v2 !== h.file);
                if (--s.refc <= 0 && s.deleteAtRefc0) deleteStorage(s);
                originalMethods.ioDb.xClose(pFile);
                h.file.dispose();
                s.listeners && notifyListeners("close", s, s.files.length);
              }
              return 0;
            } catch (e) {
              error("xClose", e);
              return cache.setError(e);
            }
          },
          xFileControl: function(pFile, opId, pArg) {
            cache.popError();
            try {
              const h = pFileHandles.get(pFile);
              util.assert(h, "Missing KVVfsFile handle");
              kvvfs?.log?.xFileControl && debug("xFileControl", h, "op =", opId);
              if (opId === capi.SQLITE_FCNTL_PRAGMA && kvvfsInternal.disablePageSizeChange) {
                const zName = wasm.peekPtr(wasm.ptr.add(pArg, wasm.ptr.size));
                if ("page_size" === wasm.cstrToJs(zName)) {
                  kvvfs?.log?.xFileControl && debug("xFileControl pragma", wasm.cstrToJs(zName));
                  const zVal = wasm.peekPtr(wasm.ptr.add(pArg, 2 * wasm.ptr.size));
                  if (zVal) {
                    kvvfs?.log?.xFileControl && warn("xFileControl pragma", h, "NOT setting page size to", wasm.cstrToJs(zVal));
                    h.file.$szPage = -1;
                    return 0;
                  } else if (h.file.$szPage > 0) {
                    kvvfs?.log?.xFileControl && warn("xFileControl", h, "getting page size", h.file.$szPage);
                    wasm.pokePtr(pArg, wasm.allocCString("" + h.file.$szPage));
                    return 0;
                  }
                }
              }
              const rc = originalMethods.ioDb.xFileControl(pFile, opId, pArg);
              if (0 == rc && capi.SQLITE_FCNTL_SYNC === opId) h.store.listeners && notifyListeners("sync", h.store, false);
              return rc;
            } catch (e) {
              error("xFileControl", e);
              return cache.setError(e);
            }
          },
          xSync: function(pFile, flags) {
            cache.popError();
            try {
              const h = pFileHandles.get(pFile);
              kvvfs?.log?.xSync && debug("xSync", h);
              util.assert(h, "Missing KVVfsFile handle");
              const rc = originalMethods.ioDb.xSync(pFile, flags);
              if (0 == rc && h.store.listeners) notifyListeners("sync", h.store, true);
              return rc;
            } catch (e) {
              error("xSync", e);
              return cache.setError(e);
            }
          }
        },
        ioJrnl: { xClose: true }
      };
      try {
        util.assert(cache.buffer.n > 1024 * 129, "Heap buffer is not large enough");
        for (const e of Object.entries(methodOverrides.recordHandler)) {
          const k2 = e[0], f = e[1];
          recordHandler[k2] = f;
          kvvfsMethods[kvvfsMethods.memberKey(k2)] = wasm.installFunction(kvvfsMethods.memberSignature(k2), f);
        }
        for (const e of Object.entries(methodOverrides.vfs)) {
          const k2 = e[0], f = e[1], km = pVfs.memberKey(k2), member = pVfs.structInfo.members[k2] || util.toss("Missing pVfs.structInfo[", k2, "]");
          originalMethods.vfs[k2] = wasm.functionEntry(pVfs[km]);
          pVfs[km] = wasm.installFunction(member.signature, f);
        }
        for (const e of Object.entries(methodOverrides.ioDb)) {
          const k2 = e[0], f = e[1], km = pIoDb.memberKey(k2);
          originalMethods.ioDb[k2] = wasm.functionEntry(pIoDb[km]) || util.toss("Missing native pIoDb[", km, "]");
          pIoDb[km] = wasm.installFunction(pIoDb.memberSignature(k2), f);
        }
        for (const e of Object.entries(methodOverrides.ioJrnl)) {
          const k2 = e[0], f = e[1], km = pIoJrnl.memberKey(k2);
          originalMethods.ioJrnl[k2] = wasm.functionEntry(pIoJrnl[km]) || util.toss("Missing native pIoJrnl[", km, "]");
          if (true === f) pIoJrnl[km] = pIoDb[km] || util.toss("Missing copied pIoDb[", km, "]");
          else pIoJrnl[km] = wasm.installFunction(pIoJrnl.memberSignature(k2), f);
        }
      } finally {
        kvvfsMethods.dispose();
        pVfs.dispose();
        pIoDb.dispose();
        pIoJrnl.dispose();
      }
      const sqlite3_js_kvvfs_clear = function callee3(which) {
        if ("" === which) return callee3("local") + callee3("session");
        const store = storageForZClass(which);
        if (!store) return 0;
        if (store.files.length) if (globalThis.localStorage === store.storage || globalThis.sessionStorage === store.storage) {
        } else toss3(capi.SQLITE_ACCESS, "Cannot clear in-use database storage.");
        const s = store.storage;
        const toRm = [];
        let i, n = s.length;
        for (i = 0; i < n; ++i) {
          const k2 = s.key(i);
          if (!store.keyPrefix || k2.startsWith(store.keyPrefix)) toRm.push(k2);
        }
        toRm.forEach((kk) => s.removeItem(kk));
        return toRm.length;
      };
      const sqlite3_js_kvvfs_size = function callee3(which) {
        if ("" === which) return callee3("local") + callee3("session");
        const store = storageForZClass(which);
        if (!store) return 0;
        const s = store.storage;
        let i, sz = 0;
        for (i = 0; i < s.length; ++i) {
          const k2 = s.key(i);
          if (!store.keyPrefix || k2.startsWith(store.keyPrefix)) {
            sz += k2.length;
            sz += s.getItem(k2).length;
          }
        }
        return sz * 2;
      };
      const sqlite3_js_kvvfs_export = function callee3(...args) {
        let opt;
        if (1 === args.length && "object" === typeof args[0]) opt = args[0];
        else if (args.length) opt = Object.assign(/* @__PURE__ */ Object.create(null), { name: args[0] });
        const store = opt ? storageForZClass(opt.name) : null;
        if (!store) toss3(capi.SQLITE_NOTFOUND, "There is no kvvfs storage named", opt?.name);
        const s = store.storage;
        const rc = Object.assign(/* @__PURE__ */ Object.create(null), {
          name: store.jzClass,
          timestamp: Date.now(),
          pages: []
        });
        const pages = /* @__PURE__ */ Object.create(null);
        const keyPrefix = store.keyPrefix;
        const rxTail = keyPrefix ? /^kvvfs-[^-]+-(\w+)/ : void 0;
        let i = 0, n = s.length;
        for (; i < n; ++i) {
          const k2 = s.key(i);
          if (!keyPrefix || k2.startsWith(keyPrefix)) {
            let kk = (keyPrefix ? rxTail.exec(k2) : void 0)?.[1] ?? k2;
            switch (kk) {
              case "jrnl":
                if (opt.includeJournal) rc.journal = s.getItem(k2);
                break;
              case "sz":
                rc.size = +s.getItem(k2);
                break;
              default:
                kk = +kk;
                if (!util.isInt32(kk) || kk <= 0) toss3(capi.SQLITE_RANGE, "Malformed kvvfs key: " + k2);
                if (opt.decodePages) {
                  const spg = s.getItem(k2), n2 = spg.length, z = cache.memBuffer(0), zDec = cache.memBuffer(1), heap = wasm.heap8u();
                  let i2 = 0;
                  for (; i2 < n2; ++i2) heap[wasm.ptr.add(z, i2)] = spg.codePointAt(i2) & 255;
                  heap[wasm.ptr.add(z, i2)] = 0;
                  const nDec = kvvfsDecode(z, zDec, cache.buffer.n);
                  pages[kk] = heap.slice(Number(zDec), wasm.ptr.addn(zDec, nDec));
                } else pages[kk] = s.getItem(k2);
                break;
            }
          }
        }
        if (opt.decodePages) cache.memBufferFree(1);
        Object.keys(pages).map((v2) => +v2).sort().forEach((v2) => rc.pages.push(pages[v2]));
        return rc;
      };
      const sqlite3_js_kvvfs_import = function(exp, overwrite = false) {
        if (!exp?.timestamp || !exp.name || void 0 === exp.size || !Array.isArray(exp.pages)) toss3(capi.SQLITE_MISUSE, "Malformed export object.");
        else if (!exp.size || exp.size !== (exp.size | 0) || exp.size >= 2147483647) toss3(capi.SQLITE_RANGE, "Invalid db size: " + exp.size);
        validateStorageName(exp.name);
        let store = storageForZClass(exp.name);
        const isNew = !store;
        if (store) {
          if (!overwrite) toss3(capi.SQLITE_ACCESS, "Storage '" + exp.name + "' already exists and", "overwrite was not specified.");
          else if (!store.files || !store.jzClass) toss3(capi.SQLITE_ERROR, "Internal storage object", exp.name, "seems to be malformed.");
          else if (store.files.length) toss3(capi.SQLITE_IOERR_ACCESS, "Cannot import db storage while it is in use.");
          sqlite3_js_kvvfs_clear(exp.name);
        } else store = newStorageObj(exp.name);
        const keyPrefix = kvvfsKeyPrefix(exp.name);
        let zEnc;
        try {
          const s = store.storage;
          s.setItem(keyPrefix + "sz", exp.size);
          if (exp.journal) s.setItem(keyPrefix + "jrnl", exp.journal);
          if (exp.pages[0] instanceof Uint8Array) exp.pages.forEach((u, ndx) => {
            const n = u.length;
            zEnc ??= cache.memBuffer(1);
            const zBin = cache.memBuffer(0), heap = wasm.heap8u();
            heap.set(u, Number(zBin));
            heap[wasm.ptr.addn(zBin, n)] = 0;
            const rc = kvvfsEncode(zBin, n, zEnc);
            util.assert(rc < cache.buffer.n, "Impossibly long output - possibly smashed the heap");
            util.assert(0 === wasm.peek8(wasm.ptr.add(zEnc, rc)), "Expecting NUL-terminated encoded output");
            const jenc = wasm.cstrToJs(zEnc);
            s.setItem(keyPrefix + (ndx + 1), jenc);
          });
          else if (exp.pages[0]) exp.pages.forEach((v2, ndx) => s.setItem(keyPrefix + (ndx + 1), v2));
          if (isNew) installStorageAndJournal(store);
        } catch {
          if (!isNew) try {
            sqlite3_js_kvvfs_clear(exp.name);
          } catch (ee) {
          }
        } finally {
          if (zEnc) cache.memBufferFree(1);
        }
        return this;
      };
      const sqlite3_js_kvvfs_reserve = function(name) {
        let store = storageForZClass(name);
        if (store) {
          ++store.refc;
          return;
        }
        validateStorageName(name);
        installStorageAndJournal(newStorageObj(name));
      };
      const sqlite3_js_kvvfs_unlink = function(name) {
        const store = storageForZClass(name);
        if (!store || kvvfsIsPersistentName(store.jzClass) || isBuiltinName(store.jzClass) || cache.rxJournalSuffix.test(name)) return false;
        if (store.refc > store.files.length || 0 === store.files.length) {
          if (--store.refc <= 0) deleteStorage(store);
          return true;
        }
        return false;
      };
      const sqlite3_js_kvvfs_listen = function(opt) {
        if (!opt || "object" !== typeof opt) toss3(capi.SQLITE_MISUSE, "Expecting a listener object.");
        let store = storageForZClass(opt.storage);
        if (!store) if (opt.storage && opt.reserve) {
          sqlite3_js_kvvfs_reserve(opt.storage);
          store = storageForZClass(opt.storage);
          util.assert(store, "Unexpectedly cannot fetch reserved storage " + opt.storage);
        } else toss3(capi.SQLITE_NOTFOUND, "No such storage:", opt.storage);
        if (opt.events) (store.listeners ??= []).push(opt);
      };
      const sqlite3_js_kvvfs_unlisten = function(opt) {
        const store = storageForZClass(opt?.storage);
        if (store?.listeners && opt.events) {
          const n = store.listeners.length;
          store.listeners = store.listeners.filter((v2) => v2 !== opt);
          const rc = n > store.listeners.length;
          if (!store.listeners.length) store.listeners = void 0;
          return rc;
        }
        return false;
      };
      sqlite3.kvvfs.reserve = sqlite3_js_kvvfs_reserve;
      sqlite3.kvvfs.import = sqlite3_js_kvvfs_import;
      sqlite3.kvvfs.export = sqlite3_js_kvvfs_export;
      sqlite3.kvvfs.unlink = sqlite3_js_kvvfs_unlink;
      sqlite3.kvvfs.listen = sqlite3_js_kvvfs_listen;
      sqlite3.kvvfs.unlisten = sqlite3_js_kvvfs_unlisten;
      sqlite3.kvvfs.exists = (name) => !!storageForZClass(name);
      sqlite3.kvvfs.estimateSize = sqlite3_js_kvvfs_size;
      sqlite3.kvvfs.clear = sqlite3_js_kvvfs_clear;
      if (globalThis.Storage) {
        capi.sqlite3_js_kvvfs_size = (which = "") => sqlite3_js_kvvfs_size(which);
        capi.sqlite3_js_kvvfs_clear = (which = "") => sqlite3_js_kvvfs_clear(which);
      }
      if (sqlite3.oo1?.DB) {
        const DB = sqlite3.oo1.DB;
        sqlite3.oo1.JsStorageDb = function(storageName = sqlite3.oo1.JsStorageDb.defaultStorageName) {
          const opt = DB.dbCtorHelper.normalizeArgs(...arguments);
          opt.vfs = "kvvfs";
          switch (opt.filename) {
            case ":sessionStorage:":
              opt.filename = "session";
              break;
            case ":localStorage:":
              opt.filename = "local";
              break;
          }
          const m = /(file:(\/\/)?)([^?]+)/.exec(opt.filename);
          validateStorageName(m ? m[3] : opt.filename);
          DB.dbCtorHelper.call(this, opt);
        };
        sqlite3.oo1.JsStorageDb.defaultStorageName = cache.storagePool.session ? "session" : nameOfThisThreadStorage;
        const jdb = sqlite3.oo1.JsStorageDb;
        jdb.prototype = Object.create(DB.prototype);
        jdb.clearStorage = sqlite3_js_kvvfs_clear;
        jdb.prototype.clearStorage = function() {
          return jdb.clearStorage(this.affirmOpen().dbFilename(), true);
        };
        jdb.storageSize = sqlite3_js_kvvfs_size;
        jdb.prototype.storageSize = function() {
          return jdb.storageSize(this.affirmOpen().dbFilename(), true);
        };
      }
      if (sqlite3.__isUnderTest && sqlite3.vtab) {
        const cols = Object.assign(/* @__PURE__ */ Object.create(null), {
          rowid: { type: "INTEGER" },
          name: { type: "TEXT" },
          nRef: { type: "INTEGER" },
          nOpen: { type: "INTEGER" },
          isTransient: { type: "INTEGER" },
          dbSize: { type: "INTEGER" }
        });
        Object.keys(cols).forEach((v2, i) => cols[v2].colId = i);
        const VT = sqlite3.vtab;
        const ProtoCursor = Object.assign(/* @__PURE__ */ Object.create(null), { row: function() {
          return cache.storagePool[this.names[this.rowid]];
        } });
        Object.assign(Object.create(ProtoCursor), {
          rowid: 0,
          names: Object.keys(cache.storagePool).filter((v2) => !cache.rxJournalSuffix.test(v2))
        });
        const cursorState = function(cursor, reset) {
          const o = cursor instanceof capi.sqlite3_vtab_cursor ? cursor : VT.xCursor.get(cursor);
          if (reset || !o.vTabState) o.vTabState = Object.assign(Object.create(ProtoCursor), {
            rowid: 0,
            names: Object.keys(cache.storagePool).filter((v2) => !cache.rxJournalSuffix.test(v2))
          });
          return o.vTabState;
        };
        const dbg = () => {
        };
        const theModule = function f() {
          return f.mod ??= new sqlite3.capi.sqlite3_module().setupModule({
            catchExceptions: true,
            methods: {
              xConnect: function(pDb2, pAux, argc, argv, ppVtab, pzErr) {
                dbg("xConnect");
                try {
                  const xcol = [];
                  Object.keys(cols).forEach((k2) => {
                    xcol.push(k2 + " " + cols[k2].type);
                  });
                  const rc = capi.sqlite3_declare_vtab(pDb2, "CREATE TABLE ignored(" + xcol.join(",") + ")");
                  if (0 === rc) {
                    const t = VT.xVtab.create(ppVtab);
                    util.assert(t === VT.xVtab.get(wasm.peekPtr(ppVtab)), "output pointer check failed");
                  }
                  return rc;
                } catch (e) {
                  return VT.xError("xConnect", e, capi.SQLITE_ERROR);
                }
              },
              xCreate: wasm.ptr.null,
              xDisconnect: function(pVtab) {
                dbg("xDisconnect", ...arguments);
                VT.xVtab.dispose(pVtab);
                return 0;
              },
              xOpen: function(pVtab, ppCursor) {
                dbg("xOpen", ...arguments);
                VT.xCursor.create(ppCursor);
                return 0;
              },
              xClose: function(pCursor) {
                dbg("xClose", ...arguments);
                const c = VT.xCursor.unget(pCursor);
                delete c.vTabState;
                c.dispose();
                return 0;
              },
              xNext: function(pCursor) {
                dbg("xNext", ...arguments);
                const c = VT.xCursor.get(pCursor);
                ++cursorState(c).rowid;
                return 0;
              },
              xColumn: function(pCursor, pCtx, iCol) {
                dbg("xColumn", ...arguments);
                const st = cursorState(pCursor);
                const store = st.row();
                util.assert(store, "Unexpected xColumn call");
                switch (iCol) {
                  case cols.rowid.colId:
                    capi.sqlite3_result_int(pCtx, st.rowid);
                    break;
                  case cols.name.colId:
                    capi.sqlite3_result_text(pCtx, store.jzClass, -1, capi.SQLITE_TRANSIENT);
                    break;
                  case cols.nRef.colId:
                    capi.sqlite3_result_int(pCtx, store.refc);
                    break;
                  case cols.nOpen.colId:
                    capi.sqlite3_result_int(pCtx, store.files.length);
                    break;
                  case cols.isTransient.colId:
                    capi.sqlite3_result_int(pCtx, !!store.deleteAtRefc0);
                    break;
                  case cols.dbSize.colId:
                    capi.sqlite3_result_int(pCtx, storageGetDbSize(store));
                    break;
                  default:
                    capi.sqlite3_result_error(pCtx, "Invalid column id: " + iCol);
                    return capi.SQLITE_RANGE;
                }
                return 0;
              },
              xRowid: function(pCursor, ppRowid64) {
                dbg("xRowid", ...arguments);
                const st = cursorState(pCursor);
                VT.xRowid(ppRowid64, st.rowid);
                return 0;
              },
              xEof: function(pCursor) {
                const st = cursorState(pCursor);
                dbg("xEof?=" + !st.row(), ...arguments);
                return !st.row();
              },
              xFilter: function(pCursor, idxNum, idxCStr, argc, argv) {
                dbg("xFilter", ...arguments);
                cursorState(pCursor, true);
                return 0;
              },
              xBestIndex: function(pVtab, pIdxInfo) {
                dbg("xBestIndex", ...arguments);
                const pii = new capi.sqlite3_index_info(pIdxInfo);
                pii.$estimatedRows = cache.storagePool.size;
                pii.$estimatedCost = 1;
                pii.dispose();
                return 0;
              }
            }
          });
        };
        sqlite3.kvvfs.create_module = function(pDb2, name = "sqlite_kvvfs") {
          return capi.sqlite3_create_module(pDb2, name, theModule(), wasm.ptr.null);
        };
      }
    });
    globalThis.sqlite3ApiBootstrap.initializers.push(function(sqlite3) {
      "use strict";
      if (sqlite3.config.disable?.vfs?.opfs && sqlite3.config.disable.vfs["opfs-vfs"]) return;
      const toss = sqlite3.util.toss;
      sqlite3.capi;
      const util = sqlite3.util;
      sqlite3.wasm;
      const opfsUtil = sqlite3.opfs = /* @__PURE__ */ Object.create(null);
      opfsUtil.thisThreadHasOPFS = () => {
        return globalThis.FileSystemHandle && globalThis.FileSystemDirectoryHandle && globalThis.FileSystemFileHandle && globalThis.FileSystemFileHandle.prototype.createSyncAccessHandle && navigator?.storage?.getDirectory;
      };
      opfsUtil.getRootDir = async function f() {
        return f.promise ??= navigator.storage.getDirectory().then((d) => {
          opfsUtil.rootDirectory = d;
          return d;
        }).catch((e) => {
          delete f.promise;
          throw e;
        });
      };
      opfsUtil.getResolvedPath = function(filename, splitIt) {
        const p = new URL(filename, "file://irrelevant").pathname;
        return splitIt ? p.split("/").filter((v2) => !!v2) : p;
      };
      opfsUtil.getDirForFilename = async function f(absFilename, createDirs = false) {
        const path = opfsUtil.getResolvedPath(absFilename, true);
        const filename = path.pop();
        let dh = await opfsUtil.getRootDir();
        for (const dirName of path) if (dirName) dh = await dh.getDirectoryHandle(dirName, { create: !!createDirs });
        return [dh, filename];
      };
      opfsUtil.mkdir = async function(absDirName) {
        try {
          await opfsUtil.getDirForFilename(absDirName + "/filepart", true);
          return true;
        } catch (e) {
          return false;
        }
      };
      opfsUtil.entryExists = async function(fsEntryName) {
        try {
          const [dh, fn] = await opfsUtil.getDirForFilename(fsEntryName);
          await dh.getFileHandle(fn);
          return true;
        } catch (e) {
          return false;
        }
      };
      opfsUtil.randomFilename = function f(len = 16) {
        if (!f._chars) {
          f._chars = "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ012346789";
          f._n = f._chars.length;
        }
        const a = [];
        let i = 0;
        for (; i < len; ++i) {
          const ndx = Math.random() * (f._n * 64) % f._n | 0;
          a[i] = f._chars[ndx];
        }
        return a.join("");
      };
      opfsUtil.treeList = async function() {
        const doDir = async function callee3(dirHandle, tgt) {
          tgt.name = dirHandle.name;
          tgt.dirs = [];
          tgt.files = [];
          for await (const handle of dirHandle.values()) if ("directory" === handle.kind) {
            const subDir = /* @__PURE__ */ Object.create(null);
            tgt.dirs.push(subDir);
            await callee3(handle, subDir);
          } else tgt.files.push(handle.name);
        };
        const root = /* @__PURE__ */ Object.create(null);
        await doDir(await opfsUtil.getRootDir(), root);
        return root;
      };
      opfsUtil.rmfr = async function() {
        const dir = await opfsUtil.getRootDir(), opt = { recurse: true };
        for await (const handle of dir.values()) dir.removeEntry(handle.name, opt);
      };
      opfsUtil.unlink = async function(fsEntryName, recursive = false, throwOnError = false) {
        try {
          const [hDir, filenamePart] = await opfsUtil.getDirForFilename(fsEntryName, false);
          await hDir.removeEntry(filenamePart, { recursive });
          return true;
        } catch (e) {
          if (throwOnError) throw new Error("unlink(", arguments[0], ") failed: " + e.message, { cause: e });
          return false;
        }
      };
      opfsUtil.traverse = async function(opt) {
        const defaultOpt = {
          recursive: true,
          directory: await opfsUtil.getRootDir()
        };
        if ("function" === typeof opt) opt = { callback: opt };
        opt = Object.assign(defaultOpt, opt || {});
        (async function callee3(dirHandle, depth) {
          for await (const handle of dirHandle.values()) if (false === opt.callback(handle, dirHandle, depth)) return false;
          else if (opt.recursive && "directory" === handle.kind) {
            if (false === await callee3(handle, depth + 1)) break;
          }
        })(opt.directory, 0);
      };
      const importDbChunked = async function(filename, callback) {
        const [hDir, fnamePart] = await opfsUtil.getDirForFilename(filename, true);
        let sah = await (await hDir.getFileHandle(fnamePart, { create: true })).createSyncAccessHandle(), nWrote = 0, chunk, checkedHeader = false;
        try {
          sah.truncate(0);
          while (void 0 !== (chunk = await callback())) {
            if (chunk instanceof ArrayBuffer) chunk = new Uint8Array(chunk);
            if (!checkedHeader && 0 === nWrote && chunk.byteLength >= 15) {
              util.affirmDbHeader(chunk);
              checkedHeader = true;
            }
            sah.write(chunk, { at: nWrote });
            nWrote += chunk.byteLength;
          }
          if (nWrote < 512 || 0 !== nWrote % 512) toss("Input size", nWrote, "is not correct for an SQLite database.");
          if (!checkedHeader) {
            const header = new Uint8Array(20);
            sah.read(header, { at: 0 });
            util.affirmDbHeader(header);
          }
          sah.write(new Uint8Array([1, 1]), { at: 18 });
          return nWrote;
        } catch (e) {
          await sah.close();
          sah = void 0;
          await hDir.removeEntry(fnamePart).catch(() => {
          });
          throw e;
        } finally {
          if (sah) await sah.close();
        }
      };
      opfsUtil.importDb = async function(filename, bytes) {
        if (bytes instanceof Function) return importDbChunked(filename, bytes);
        if (bytes instanceof ArrayBuffer) bytes = new Uint8Array(bytes);
        util.affirmIsDb(bytes);
        const n = bytes.byteLength;
        const [hDir, fnamePart] = await opfsUtil.getDirForFilename(filename, true);
        let sah, nWrote = 0;
        try {
          sah = await (await hDir.getFileHandle(fnamePart, { create: true })).createSyncAccessHandle();
          sah.truncate(0);
          nWrote = sah.write(bytes, { at: 0 });
          if (nWrote != n) toss("Expected to write " + n + " bytes but wrote " + nWrote + ".");
          sah.write(new Uint8Array([1, 1]), { at: 18 });
          return nWrote;
        } catch (e) {
          if (sah) {
            await sah.close();
            sah = void 0;
          }
          await hDir.removeEntry(fnamePart).catch(() => {
          });
          throw e;
        } finally {
          if (sah) await sah.close();
        }
      };
      opfsUtil.vfsInstallationFeatureCheck = function(vfsName) {
        if (!globalThis.SharedArrayBuffer || !globalThis.Atomics) toss("Cannot install OPFS: Missing SharedArrayBuffer and/or Atomics.", "The server must emit the COOP/COEP response headers to enable those.", "See https://sqlite.org/wasm/doc/trunk/persistence.md#coop-coep");
        else if ("undefined" === typeof WorkerGlobalScope) toss("The OPFS sqlite3_vfs cannot run in the main thread", "because it requires Atomics.wait().");
        else if (!globalThis.FileSystemHandle || !globalThis.FileSystemDirectoryHandle || !globalThis.FileSystemFileHandle?.prototype?.createSyncAccessHandle || !navigator?.storage?.getDirectory) toss("Missing required OPFS APIs.");
        else if ("opfs-wl" === vfsName && !globalThis.Atomics.waitAsync) toss("The", vfsName, "VFS requires Atomics.waitAsync(), which is not available.");
      };
      opfsUtil.initOptions = function callee3(vfsName, options) {
        const urlParams = new URL(globalThis.location.href).searchParams;
        if (urlParams.has(vfsName + "-disable")) return;
        try {
          opfsUtil.vfsInstallationFeatureCheck(vfsName);
        } catch (e) {
          return;
        }
        options = util.nu(options);
        options.vfsName = vfsName;
        options.verbose ??= urlParams.has("opfs-verbose") ? +urlParams.get("opfs-verbose") : 1;
        options.sanityChecks ??= urlParams.has("opfs-sanity-check");
        if (!opfsUtil.proxyUri) {
          opfsUtil.proxyUri = "sqlite3-opfs-async-proxy.js";
          if (sqlite3.scriptInfo?.sqlite3Dir) opfsUtil.proxyUri = sqlite3.scriptInfo.sqlite3Dir + opfsUtil.proxyUri;
        }
        options.proxyUri ??= opfsUtil.proxyUri;
        if ("function" === typeof options.proxyUri) options.proxyUri = options.proxyUri();
        return opfsUtil.options = options;
      };
      opfsUtil.createVfsState = function() {
        const state = util.nu();
        const options = opfsUtil.options;
        state.verbose = options.verbose;
        const loggers = [
          sqlite3.config.error,
          sqlite3.config.warn,
          sqlite3.config.log
        ];
        const vfsName = options.vfsName || toss("Maintenance required: missing VFS name");
        const logImpl = (level, ...args) => {
          if (state.verbose > level) loggers[level](vfsName + ":", ...args);
        };
        const log = (...args) => logImpl(2, ...args), warn = (...args) => logImpl(1, ...args), error = (...args) => logImpl(0, ...args), capi = sqlite3.capi, wasm = sqlite3.wasm;
        const opfsVfs = state.vfs = new capi.sqlite3_vfs();
        const opfsIoMethods = opfsVfs.ioMethods = new capi.sqlite3_io_methods();
        opfsIoMethods.$iVersion = 1;
        opfsVfs.$iVersion = 2;
        opfsVfs.$szOsFile = capi.sqlite3_file.structInfo.sizeof;
        opfsVfs.$mxPathname = 1024;
        opfsVfs.$zName = wasm.allocCString(vfsName);
        opfsVfs.addOnDispose(
          "$zName",
          opfsVfs.$zName,
          opfsIoMethods
          /**
          Pedantic sidebar: the entries in this array are items to
          clean up when opfsVfs.dispose() is called, but in this
          environment it will never be called. The VFS instance simply
          hangs around until the WASM module instance is cleaned up. We
          "could" _hypothetically_ clean it up by "importing" an
          sqlite3_os_end() impl into the wasm build, but the shutdown
          order of the wasm engine and the JS one are undefined so
          there is no guaranty that the opfsVfs instance would be
          available in one environment or the other when
          sqlite3_os_end() is called (_if_ it gets called at all in a
          wasm build, which is undefined). i.e. addOnDispose() here is
          a matter of "correctness", not necessity. It just wouldn't do
          to leave the impression that we're blindly leaking memory.
          */
        );
        opfsVfs.metrics = util.nu({
          counters: util.nu(),
          dump: function() {
            let k2, n = 0, t = 0, w = 0;
            for (k2 in state.opIds) {
              const m = metrics[k2];
              n += m.count;
              t += m.time;
              w += m.wait;
              m.avgTime = m.count && m.time ? m.time / m.count : 0;
              m.avgWait = m.count && m.wait ? m.wait / m.count : 0;
            }
            sqlite3.config.log(globalThis.location.href, "metrics for", globalThis.location.href, ":", metrics, "\nTotal of", n, "op(s) for", t, "ms (incl. " + w + " ms of waiting on the async side)");
            sqlite3.config.log("Serialization metrics:", opfsVfs.metrics.counters.s11n);
            opfsVfs.worker?.postMessage?.({ type: "opfs-async-metrics" });
          },
          reset: function() {
            let k2;
            const r = (m2) => m2.count = m2.time = m2.wait = 0;
            const m = opfsVfs.metrics.counters;
            for (k2 in state.opIds) r(m[k2] = /* @__PURE__ */ Object.create(null));
            let s = m.s11n = /* @__PURE__ */ Object.create(null);
            s = s.serialize = /* @__PURE__ */ Object.create(null);
            s.count = s.time = 0;
            s = m.s11n.deserialize = /* @__PURE__ */ Object.create(null);
            s.count = s.time = 0;
          }
        });
        state.asyncIdleWaitTime = 150;
        state.asyncS11nExceptions = 1;
        state.fileBufferSize = 1024 * 64;
        state.sabS11nOffset = state.fileBufferSize;
        state.sabS11nSize = opfsVfs.$mxPathname * 2;
        state.sabIO = new SharedArrayBuffer(state.fileBufferSize + state.sabS11nSize);
        state.opIds = /* @__PURE__ */ Object.create(null);
        {
          let i = 0;
          state.opIds.whichOp = i++;
          state.opIds.rc = i++;
          state.opIds.xAccess = i++;
          state.opIds.xClose = i++;
          state.opIds.xDelete = i++;
          state.opIds.xDeleteNoWait = i++;
          state.opIds.xFileSize = i++;
          state.opIds.xLock = i++;
          state.opIds.xOpen = i++;
          state.opIds.xRead = i++;
          state.opIds.xSleep = i++;
          state.opIds.xSync = i++;
          state.opIds.xTruncate = i++;
          state.opIds.xUnlock = i++;
          state.opIds.xWrite = i++;
          state.opIds.mkdir = i++;
          state.opIds["opfs-async-metrics"] = i++;
          state.opIds["opfs-async-shutdown"] = i++;
          state.opIds.retry = i++;
          state.sabOP = new SharedArrayBuffer(i * 4);
        }
        state.sq3Codes = /* @__PURE__ */ Object.create(null);
        for (const k2 of [
          "SQLITE_ACCESS_EXISTS",
          "SQLITE_ACCESS_READWRITE",
          "SQLITE_BUSY",
          "SQLITE_CANTOPEN",
          "SQLITE_ERROR",
          "SQLITE_IOERR",
          "SQLITE_IOERR_ACCESS",
          "SQLITE_IOERR_CLOSE",
          "SQLITE_IOERR_DELETE",
          "SQLITE_IOERR_FSYNC",
          "SQLITE_IOERR_LOCK",
          "SQLITE_IOERR_READ",
          "SQLITE_IOERR_SHORT_READ",
          "SQLITE_IOERR_TRUNCATE",
          "SQLITE_IOERR_UNLOCK",
          "SQLITE_IOERR_WRITE",
          "SQLITE_LOCK_EXCLUSIVE",
          "SQLITE_LOCK_NONE",
          "SQLITE_LOCK_PENDING",
          "SQLITE_LOCK_RESERVED",
          "SQLITE_LOCK_SHARED",
          "SQLITE_LOCKED",
          "SQLITE_MISUSE",
          "SQLITE_NOTFOUND",
          "SQLITE_OPEN_CREATE",
          "SQLITE_OPEN_DELETEONCLOSE",
          "SQLITE_OPEN_MAIN_DB",
          "SQLITE_OPEN_READONLY",
          "SQLITE_LOCK_NONE",
          "SQLITE_LOCK_SHARED",
          "SQLITE_LOCK_RESERVED",
          "SQLITE_LOCK_PENDING",
          "SQLITE_LOCK_EXCLUSIVE"
        ]) state.sq3Codes[k2] = capi[k2] ?? toss("Maintenance required: not found:", k2);
        state.opfsFlags = Object.assign(/* @__PURE__ */ Object.create(null), {
          OPFS_UNLOCK_ASAP: 1,
          OPFS_UNLINK_BEFORE_OPEN: 2,
          defaultUnlockAsap: false
        });
        opfsVfs.metrics.reset();
        const metrics = opfsVfs.metrics.counters;
        const opRun = opfsVfs.opRun = (op, ...args) => {
          const opNdx = state.opIds[op] || toss(opfsVfs.vfsName + ": Invalid op ID:", op);
          state.s11n.serialize(...args);
          Atomics.store(state.sabOPView, state.opIds.rc, -1);
          Atomics.store(state.sabOPView, state.opIds.whichOp, opNdx);
          Atomics.notify(state.sabOPView, state.opIds.whichOp);
          const t = performance.now();
          while ("not-equal" !== Atomics.wait(state.sabOPView, state.opIds.rc, -1)) ;
          const rc = Atomics.load(state.sabOPView, state.opIds.rc);
          metrics[op].wait += performance.now() - t;
          if (rc && state.asyncS11nExceptions) {
            const err2 = state.s11n.deserialize();
            if (err2) error(op + "() async error:", ...err2);
          }
          return rc;
        };
        const opTimer = /* @__PURE__ */ Object.create(null);
        opTimer.op = void 0;
        opTimer.start = void 0;
        const mTimeStart = opfsVfs.mTimeStart = (op) => {
          opTimer.start = performance.now();
          opTimer.op = op;
          ++metrics[op].count;
        };
        const mTimeEnd = opfsVfs.mTimeEnd = () => metrics[opTimer.op].time += performance.now() - opTimer.start;
        const __openFiles = opfsVfs.__openFiles = /* @__PURE__ */ Object.create(null);
        opfsVfs.ioSyncWrappers = util.nu({
          xCheckReservedLock: function(pFile, pOut) {
            wasm.poke(pOut, 0, "i32");
            return 0;
          },
          xClose: function(pFile) {
            mTimeStart("xClose");
            let rc = 0;
            const f = __openFiles[pFile];
            if (f) {
              delete __openFiles[pFile];
              rc = opRun("xClose", pFile);
              if (f.sq3File) f.sq3File.dispose();
            }
            mTimeEnd();
            return rc;
          },
          xDeviceCharacteristics: function(pFile) {
            return capi.SQLITE_IOCAP_UNDELETABLE_WHEN_OPEN;
          },
          xFileControl: function(pFile, opId, pArg) {
            return capi.SQLITE_NOTFOUND;
          },
          xFileSize: function(pFile, pSz64) {
            mTimeStart("xFileSize");
            let rc = opRun("xFileSize", pFile);
            if (0 == rc) try {
              const sz = state.s11n.deserialize()[0];
              wasm.poke(pSz64, sz, "i64");
            } catch (e) {
              error("Unexpected error reading xFileSize() result:", e);
              rc = state.sq3Codes.SQLITE_IOERR;
            }
            mTimeEnd();
            return rc;
          },
          xRead: function(pFile, pDest, n, offset64) {
            mTimeStart("xRead");
            const f = __openFiles[pFile];
            let rc;
            try {
              rc = opRun("xRead", pFile, n, Number(offset64));
              if (0 === rc || capi.SQLITE_IOERR_SHORT_READ === rc)
                wasm.heap8u().set(f.sabView.subarray(0, n), Number(pDest));
            } catch (e) {
              error("xRead(", arguments, ") failed:", e, f);
              rc = capi.SQLITE_IOERR_READ;
            }
            mTimeEnd();
            return rc;
          },
          xSync: function(pFile, flags) {
            mTimeStart("xSync");
            const rc = opRun("xSync", pFile, flags);
            mTimeEnd();
            return rc;
          },
          xTruncate: function(pFile, sz64) {
            mTimeStart("xTruncate");
            const rc = opRun("xTruncate", pFile, Number(sz64));
            mTimeEnd();
            return rc;
          },
          xWrite: function(pFile, pSrc, n, offset64) {
            mTimeStart("xWrite");
            const f = __openFiles[pFile];
            let rc;
            try {
              f.sabView.set(wasm.heap8u().subarray(Number(pSrc), Number(pSrc) + n));
              rc = opRun("xWrite", pFile, n, Number(offset64));
            } catch (e) {
              error("xWrite(", arguments, ") failed:", e, f);
              rc = capi.SQLITE_IOERR_WRITE;
            }
            mTimeEnd();
            return rc;
          }
        });
        opfsVfs.vfsSyncWrappers = {
          xAccess: function(pVfs, zName, flags, pOut) {
            mTimeStart("xAccess");
            const rc = opRun("xAccess", wasm.cstrToJs(zName));
            wasm.poke(pOut, rc ? 0 : 1, "i32");
            mTimeEnd();
            return 0;
          },
          xCurrentTime: function(pVfs, pOut) {
            wasm.poke(pOut, 24405875e-1 + (/* @__PURE__ */ new Date()).getTime() / 864e5, "double");
            return 0;
          },
          xCurrentTimeInt64: function(pVfs, pOut) {
            wasm.poke(pOut, 24405875e-1 * 864e5 + (/* @__PURE__ */ new Date()).getTime(), "i64");
            return 0;
          },
          xDelete: function(pVfs, zName, doSyncDir) {
            mTimeStart("xDelete");
            const rc = opRun("xDelete", wasm.cstrToJs(zName), doSyncDir, false);
            mTimeEnd();
            return rc;
          },
          xFullPathname: function(pVfs, zName, nOut, pOut) {
            return wasm.cstrncpy(pOut, zName, nOut) < nOut ? 0 : capi.SQLITE_CANTOPEN;
          },
          xGetLastError: function(pVfs, nOut, pOut) {
            sqlite3.config.warn("OPFS xGetLastError() has nothing sensible to return.");
            return 0;
          },
          xOpen: function f(pVfs, zName, pFile, flags, pOutFlags) {
            mTimeStart("xOpen");
            let opfsFlags = 0;
            let jzName, zToFree;
            if (!zName) {
              jzName = opfsUtil.randomFilename();
              zName = zToFree = wasm.allocCString(jzName);
            } else if (wasm.isPtr(zName)) {
              if (capi.sqlite3_uri_boolean(zName, "opfs-unlock-asap", 0)) opfsFlags |= state.opfsFlags.OPFS_UNLOCK_ASAP;
              if (capi.sqlite3_uri_boolean(zName, "delete-before-open", 0)) opfsFlags |= state.opfsFlags.OPFS_UNLINK_BEFORE_OPEN;
              jzName = wasm.cstrToJs(zName);
            } else {
              sqlite3.config.error("Impossible zName value in xOpen?", zName);
              return capi.SQLITE_CANTOPEN;
            }
            const fh = util.nu({
              fid: pFile,
              filename: jzName,
              sab: new SharedArrayBuffer(state.fileBufferSize),
              flags,
              readOnly: !(capi.SQLITE_OPEN_CREATE & flags) && !!(flags & capi.SQLITE_OPEN_READONLY)
            });
            const rc = opRun("xOpen", pFile, jzName, flags, opfsFlags);
            if (rc) {
              if (zToFree) wasm.dealloc(zToFree);
            } else {
              if (fh.readOnly) wasm.poke(pOutFlags, capi.SQLITE_OPEN_READONLY, "i32");
              __openFiles[pFile] = fh;
              fh.sabView = state.sabFileBufView;
              fh.sq3File = new capi.sqlite3_file(pFile);
              if (zToFree) fh.sq3File.addOnDispose(zToFree);
              fh.sq3File.$pMethods = opfsIoMethods.pointer;
              fh.lockType = capi.SQLITE_LOCK_NONE;
            }
            mTimeEnd();
            return rc;
          }
        };
        const pDVfs = capi.sqlite3_vfs_find(null);
        if (pDVfs) {
          const dVfs = new capi.sqlite3_vfs(pDVfs);
          opfsVfs.$xRandomness = dVfs.$xRandomness;
          opfsVfs.$xSleep = dVfs.$xSleep;
          dVfs.dispose();
        }
        if (!opfsVfs.$xRandomness) opfsVfs.vfsSyncWrappers.xRandomness = function(pVfs, nOut, pOut) {
          const heap = wasm.heap8u();
          let i = 0;
          const npOut = Number(pOut);
          for (; i < nOut; ++i) heap[npOut + i] = Math.random() * 255e3 & 255;
          return i;
        };
        if (!opfsVfs.$xSleep) opfsVfs.vfsSyncWrappers.xSleep = function(pVfs, ms) {
          mTimeStart("xSleep");
          Atomics.wait(state.sabOPView, state.opIds.xSleep, 0, ms);
          mTimeEnd();
          return 0;
        };
        const initS11n = function() {
          if (state.s11n) return state.s11n;
          const textDecoder = new TextDecoder(), textEncoder = new TextEncoder("utf-8"), viewU8 = new Uint8Array(state.sabIO, state.sabS11nOffset, state.sabS11nSize), viewDV = new DataView(state.sabIO, state.sabS11nOffset, state.sabS11nSize);
          state.s11n = /* @__PURE__ */ Object.create(null);
          const TypeIds = /* @__PURE__ */ Object.create(null);
          TypeIds.number = {
            id: 1,
            size: 8,
            getter: "getFloat64",
            setter: "setFloat64"
          };
          TypeIds.bigint = {
            id: 2,
            size: 8,
            getter: "getBigInt64",
            setter: "setBigInt64"
          };
          TypeIds.boolean = {
            id: 3,
            size: 4,
            getter: "getInt32",
            setter: "setInt32"
          };
          TypeIds.string = { id: 4 };
          const getTypeId = (v2) => TypeIds[typeof v2] || toss("Maintenance required: this value type cannot be serialized.", v2);
          const getTypeIdById = (tid) => {
            switch (tid) {
              case TypeIds.number.id:
                return TypeIds.number;
              case TypeIds.bigint.id:
                return TypeIds.bigint;
              case TypeIds.boolean.id:
                return TypeIds.boolean;
              case TypeIds.string.id:
                return TypeIds.string;
              default:
                toss("Invalid type ID:", tid);
            }
          };
          state.s11n.deserialize = function(clear = false) {
            performance.now();
            const argc = viewU8[0];
            const rc = argc ? [] : null;
            if (argc) {
              const typeIds = [];
              let offset = 1, i, n, v2;
              for (i = 0; i < argc; ++i, ++offset) typeIds.push(getTypeIdById(viewU8[offset]));
              for (i = 0; i < argc; ++i) {
                const t = typeIds[i];
                if (t.getter) {
                  v2 = viewDV[t.getter](offset, state.littleEndian);
                  offset += t.size;
                } else {
                  n = viewDV.getInt32(offset, state.littleEndian);
                  offset += 4;
                  v2 = textDecoder.decode(viewU8.slice(offset, offset + n));
                  offset += n;
                }
                rc.push(v2);
              }
            }
            if (clear) viewU8[0] = 0;
            return rc;
          };
          state.s11n.serialize = function(...args) {
            performance.now();
            if (args.length) {
              const typeIds = [];
              let i = 0, offset = 1;
              viewU8[0] = args.length & 255;
              for (; i < args.length; ++i, ++offset) {
                typeIds.push(getTypeId(args[i]));
                viewU8[offset] = typeIds[i].id;
              }
              for (i = 0; i < args.length; ++i) {
                const t = typeIds[i];
                if (t.setter) {
                  viewDV[t.setter](offset, args[i], state.littleEndian);
                  offset += t.size;
                } else {
                  const s = textEncoder.encode(args[i]);
                  viewDV.setInt32(offset, s.byteLength, state.littleEndian);
                  offset += 4;
                  viewU8.set(s, offset);
                  offset += s.byteLength;
                }
              }
            } else viewU8[0] = 0;
          };
          return state.s11n;
        };
        opfsVfs.initS11n = initS11n;
        opfsVfs.bindVfs = function(ioMethods, callback) {
          Object.assign(opfsVfs.ioSyncWrappers, ioMethods);
          return new Promise(function(promiseResolve_, promiseReject_) {
            let promiseWasRejected = void 0;
            const promiseReject = (err2) => {
              promiseWasRejected = true;
              opfsVfs.dispose();
              return promiseReject_(err2);
            };
            const promiseResolve = () => {
              try {
                callback(sqlite3, opfsVfs);
              } catch (e) {
                return promiseReject(e);
              }
              promiseWasRejected = false;
              return promiseResolve_(sqlite3);
            };
            const options2 = opfsUtil.options;
            options2.proxyUri + (options2.proxyUri.indexOf("?") < 0 ? "?" : "&") + vfsName;
            const opfsAsyncProxyUrl = new URL("sqlite3-opfs-async-proxy.js", import.meta.url);
            opfsAsyncProxyUrl.searchParams.set("vfs", vfsName);
            const W = opfsVfs.worker = new Worker(opfsAsyncProxyUrl.toString());
            let zombieTimer = setTimeout(() => {
              if (void 0 === promiseWasRejected) promiseReject(/* @__PURE__ */ new Error("Timeout while waiting for OPFS async proxy worker."));
            }, 4e3);
            W._originalOnError = W.onerror;
            W.onerror = function(err2) {
              error("Error initializing OPFS asyncer:", err2);
              promiseReject(/* @__PURE__ */ new Error("Loading OPFS async Worker failed for unknown reasons."));
            };
            opfsVfs.opRun;
            const sanityCheck = function() {
              const scope = wasm.scopedAllocPush();
              const sq3File = new capi.sqlite3_file();
              try {
                const fid = sq3File.pointer;
                const openFlags = capi.SQLITE_OPEN_CREATE | capi.SQLITE_OPEN_READWRITE | capi.SQLITE_OPEN_MAIN_DB;
                const pOut = wasm.scopedAlloc(8);
                const dbFile = "/sanity/check/file" + randomFilename(8);
                const zDbFile = wasm.scopedAllocCString(dbFile);
                let rc;
                state.s11n.serialize("This is \xE4 string.");
                rc = state.s11n.deserialize();
                log("deserialize() says:", rc);
                if ("This is \xE4 string." !== rc[0]) toss("String d13n error.");
                opfsVfs.vfsSyncWrappers.xAccess(opfsVfs.pointer, zDbFile, 0, pOut);
                rc = wasm.peek(pOut, "i32");
                log("xAccess(", dbFile, ") exists ?=", rc);
                rc = opfsVfs.vfsSyncWrappers.xOpen(opfsVfs.pointer, zDbFile, fid, openFlags, pOut);
                log("open rc =", rc, "state.sabOPView[xOpen] =", state.sabOPView[state.opIds.xOpen]);
                if (0 !== rc) {
                  error("open failed with code", rc);
                  return;
                }
                opfsVfs.vfsSyncWrappers.xAccess(opfsVfs.pointer, zDbFile, 0, pOut);
                rc = wasm.peek(pOut, "i32");
                if (!rc) toss("xAccess() failed to detect file.");
                rc = opfsVfs.ioSyncWrappers.xSync(sq3File.pointer, 0);
                if (rc) toss("sync failed w/ rc", rc);
                rc = opfsVfs.ioSyncWrappers.xTruncate(sq3File.pointer, 1024);
                if (rc) toss("truncate failed w/ rc", rc);
                wasm.poke(pOut, 0, "i64");
                rc = opfsVfs.ioSyncWrappers.xFileSize(sq3File.pointer, pOut);
                if (rc) toss("xFileSize failed w/ rc", rc);
                log("xFileSize says:", wasm.peek(pOut, "i64"));
                rc = opfsVfs.ioSyncWrappers.xWrite(sq3File.pointer, zDbFile, 10, 1);
                if (rc) toss("xWrite() failed!");
                const readBuf = wasm.scopedAlloc(16);
                rc = opfsVfs.ioSyncWrappers.xRead(sq3File.pointer, readBuf, 6, 2);
                wasm.poke(readBuf + 6, 0);
                let jRead = wasm.cstrToJs(readBuf);
                log("xRead() got:", jRead);
                if ("sanity" !== jRead) toss("Unexpected xRead() value.");
                if (opfsVfs.vfsSyncWrappers.xSleep) {
                  log("xSleep()ing before close()ing...");
                  opfsVfs.vfsSyncWrappers.xSleep(opfsVfs.pointer, 2e3);
                  log("waking up from xSleep()");
                }
                rc = opfsVfs.ioSyncWrappers.xClose(fid);
                log("xClose rc =", rc, "sabOPView =", state.sabOPView);
                log("Deleting file:", dbFile);
                opfsVfs.vfsSyncWrappers.xDelete(opfsVfs.pointer, zDbFile, 4660);
                opfsVfs.vfsSyncWrappers.xAccess(opfsVfs.pointer, zDbFile, 0, pOut);
                rc = wasm.peek(pOut, "i32");
                if (rc) toss("Expecting 0 from xAccess(", dbFile, ") after xDelete().");
                warn("End of OPFS sanity checks.");
              } finally {
                sq3File.dispose();
                wasm.scopedAllocPop(scope);
              }
            };
            W.onmessage = function({ data }) {
              switch (data.type) {
                case "opfs-unavailable":
                  promiseReject(new Error(data.payload.join(" ")));
                  break;
                case "opfs-async-loaded":
                  delete state.vfs;
                  W.postMessage({
                    type: "opfs-async-init",
                    args: util.nu(state)
                  });
                  break;
                case "opfs-async-inited":
                  if (true === promiseWasRejected) break;
                  clearTimeout(zombieTimer);
                  zombieTimer = null;
                  try {
                    sqlite3.vfs.installVfs({
                      io: {
                        struct: opfsVfs.ioMethods,
                        methods: opfsVfs.ioSyncWrappers
                      },
                      vfs: {
                        struct: opfsVfs,
                        methods: opfsVfs.vfsSyncWrappers
                      }
                    });
                    state.sabOPView = new Int32Array(state.sabOP);
                    state.sabFileBufView = new Uint8Array(state.sabIO, 0, state.fileBufferSize);
                    state.sabS11nView = new Uint8Array(state.sabIO, state.sabS11nOffset, state.sabS11nSize);
                    opfsVfs.initS11n();
                    delete opfsVfs.initS11n;
                    if (options2.sanityChecks) {
                      warn("Running sanity checks because of opfs-sanity-check URL arg...");
                      sanityCheck();
                    }
                    if (opfsUtil.thisThreadHasOPFS()) opfsUtil.getRootDir().then((d) => {
                      W.onerror = W._originalOnError;
                      delete W._originalOnError;
                      log("End of OPFS sqlite3_vfs setup.", opfsVfs);
                      promiseResolve();
                    }).catch(promiseReject);
                    else promiseResolve();
                  } catch (e) {
                    error(e);
                    promiseReject(e);
                  }
                  break;
                case "debug":
                  warn("debug message from worker:", data);
                  break;
                default: {
                  const errMsg = "Unexpected message from the OPFS async worker: " + JSON.stringify(data);
                  error(errMsg);
                  promiseReject(new Error(errMsg));
                  break;
                }
              }
            };
          });
        };
        return state;
      };
    });
    globalThis.sqlite3ApiBootstrap.initializers.push(function(sqlite3) {
      if (!sqlite3.opfs || sqlite3.config.disable?.vfs?.opfs) return;
      const util = sqlite3.util, opfsUtil = sqlite3.opfs || sqlite3.util.toss("Missing sqlite3.opfs");
      const installOpfsVfs = async function(options) {
        options = opfsUtil.initOptions("opfs", options);
        if (!options) return sqlite3;
        const capi = sqlite3.capi, opfsVfs = opfsUtil.createVfsState().vfs, metrics = opfsVfs.metrics.counters, mTimeStart = opfsVfs.mTimeStart, mTimeEnd = opfsVfs.mTimeEnd, opRun = opfsVfs.opRun, __openFiles = opfsVfs.__openFiles;
        return opfsVfs.bindVfs(util.nu({
          xLock: function(pFile, lockType) {
            mTimeStart("xLock");
            ++metrics.xLock.count;
            const f = __openFiles[pFile];
            let rc = 0;
            if (f.lockType) f.lockType = lockType;
            else {
              rc = opRun("xLock", pFile, lockType);
              if (0 === rc) f.lockType = lockType;
            }
            mTimeEnd();
            return rc;
          },
          xUnlock: function(pFile, lockType) {
            mTimeStart("xUnlock");
            ++metrics.xUnlock.count;
            const f = __openFiles[pFile];
            let rc = 0;
            if (capi.SQLITE_LOCK_NONE === lockType && f.lockType) rc = opRun("xUnlock", pFile, lockType);
            if (0 === rc) f.lockType = lockType;
            mTimeEnd();
            return rc;
          }
        }), function(sqlite32, vfs) {
          if (sqlite32.oo1) {
            const OpfsDb = function(...args) {
              const opt = sqlite32.oo1.DB.dbCtorHelper.normalizeArgs(...args);
              opt.vfs = vfs.$zName;
              sqlite32.oo1.DB.dbCtorHelper.call(this, opt);
            };
            OpfsDb.prototype = Object.create(sqlite32.oo1.DB.prototype);
            sqlite32.oo1.OpfsDb = OpfsDb;
            OpfsDb.importDb = opfsUtil.importDb;
            sqlite32.oo1.DB.dbCtorHelper.setVfsPostOpenCallback(opfsVfs.pointer, function(oo1Db, sqlite33) {
              sqlite33.capi.sqlite3_busy_timeout(oo1Db, 1e4);
            });
          }
        });
      };
      globalThis.sqlite3ApiBootstrap.initializersAsync.push(async (sqlite32) => {
        return installOpfsVfs().catch((e) => {
          sqlite32.config.warn("Ignoring inability to install 'opfs' sqlite3_vfs:", e);
        });
      });
    });
    globalThis.sqlite3ApiBootstrap.initializers.push(function(sqlite3) {
      "use strict";
      if (sqlite3.config.disable?.vfs?.["opfs-sahpool"]) return;
      const toss = sqlite3.util.toss;
      const toss3 = sqlite3.util.toss3;
      const initPromises = /* @__PURE__ */ Object.create(null);
      const capi = sqlite3.capi;
      const util = sqlite3.util;
      const wasm = sqlite3.wasm;
      const SECTOR_SIZE = 4096;
      const HEADER_MAX_PATH_SIZE = 512;
      const HEADER_FLAGS_SIZE = 4;
      const HEADER_DIGEST_SIZE = 8;
      const HEADER_CORPUS_SIZE = HEADER_MAX_PATH_SIZE + HEADER_FLAGS_SIZE;
      const HEADER_OFFSET_FLAGS = HEADER_MAX_PATH_SIZE;
      const HEADER_OFFSET_DIGEST = HEADER_CORPUS_SIZE;
      const HEADER_OFFSET_DATA = SECTOR_SIZE;
      const PERSISTENT_FILE_TYPES = capi.SQLITE_OPEN_MAIN_DB | capi.SQLITE_OPEN_MAIN_JOURNAL | capi.SQLITE_OPEN_SUPER_JOURNAL | capi.SQLITE_OPEN_WAL;
      const FLAG_COMPUTE_DIGEST_V2 = capi.SQLITE_OPEN_MEMORY;
      const OPAQUE_DIR_NAME = ".opaque";
      const getRandomName = () => Math.random().toString(36).slice(2);
      const textDecoder = new TextDecoder();
      const textEncoder = new TextEncoder();
      const optionDefaults = Object.assign(/* @__PURE__ */ Object.create(null), {
        name: "opfs-sahpool",
        directory: void 0,
        initialCapacity: 6,
        clearOnInit: false,
        verbosity: 2,
        forceReinitIfPreviouslyFailed: false
      });
      const loggers = [
        sqlite3.config.error,
        sqlite3.config.warn,
        sqlite3.config.log
      ];
      sqlite3.config.log;
      const warn = sqlite3.config.warn;
      sqlite3.config.error;
      const __mapVfsToPool = /* @__PURE__ */ new Map();
      const getPoolForVfs = (pVfs) => __mapVfsToPool.get(pVfs);
      const setPoolForVfs = (pVfs, pool) => {
        if (pool) __mapVfsToPool.set(pVfs, pool);
        else __mapVfsToPool.delete(pVfs);
      };
      const __mapSqlite3File = /* @__PURE__ */ new Map();
      const getPoolForPFile = (pFile) => __mapSqlite3File.get(pFile);
      const setPoolForPFile = (pFile, pool) => {
        if (pool) __mapSqlite3File.set(pFile, pool);
        else __mapSqlite3File.delete(pFile);
      };
      const ioMethods = {
        xCheckReservedLock: function(pFile, pOut) {
          const pool = getPoolForPFile(pFile);
          pool.log("xCheckReservedLock");
          pool.storeErr();
          wasm.poke32(pOut, 1);
          return 0;
        },
        xClose: function(pFile) {
          const pool = getPoolForPFile(pFile);
          pool.storeErr();
          const file = pool.getOFileForS3File(pFile);
          if (file) try {
            pool.log(`xClose ${file.path}`);
            pool.mapS3FileToOFile(pFile, false);
            file.sah.flush();
            if (file.flags & capi.SQLITE_OPEN_DELETEONCLOSE) pool.deletePath(file.path);
          } catch (e) {
            return pool.storeErr(e, capi.SQLITE_IOERR);
          }
          return 0;
        },
        xDeviceCharacteristics: function(pFile) {
          return capi.SQLITE_IOCAP_UNDELETABLE_WHEN_OPEN;
        },
        xFileControl: function(pFile, opId, pArg) {
          return capi.SQLITE_NOTFOUND;
        },
        xFileSize: function(pFile, pSz64) {
          const pool = getPoolForPFile(pFile);
          pool.log(`xFileSize`);
          const size = pool.getOFileForS3File(pFile).sah.getSize() - HEADER_OFFSET_DATA;
          wasm.poke64(pSz64, BigInt(size));
          return 0;
        },
        xLock: function(pFile, lockType) {
          const pool = getPoolForPFile(pFile);
          pool.log(`xLock ${lockType}`);
          pool.storeErr();
          const file = pool.getOFileForS3File(pFile);
          file.lockType = lockType;
          return 0;
        },
        xRead: function(pFile, pDest, n, offset64) {
          const pool = getPoolForPFile(pFile);
          pool.storeErr();
          const file = pool.getOFileForS3File(pFile);
          pool.log(`xRead ${file.path} ${n} @ ${offset64}`);
          try {
            const nRead = file.sah.read(wasm.heap8u().subarray(Number(pDest), Number(pDest) + n), { at: HEADER_OFFSET_DATA + Number(offset64) });
            if (nRead < n) {
              wasm.heap8u().fill(0, Number(pDest) + nRead, Number(pDest) + n);
              return capi.SQLITE_IOERR_SHORT_READ;
            }
            return 0;
          } catch (e) {
            return pool.storeErr(e, capi.SQLITE_IOERR);
          }
        },
        xSectorSize: function(pFile) {
          return SECTOR_SIZE;
        },
        xSync: function(pFile, flags) {
          const pool = getPoolForPFile(pFile);
          pool.log(`xSync ${flags}`);
          pool.storeErr();
          const file = pool.getOFileForS3File(pFile);
          try {
            file.sah.flush();
            return 0;
          } catch (e) {
            return pool.storeErr(e, capi.SQLITE_IOERR);
          }
        },
        xTruncate: function(pFile, sz64) {
          const pool = getPoolForPFile(pFile);
          pool.log(`xTruncate ${sz64}`);
          pool.storeErr();
          const file = pool.getOFileForS3File(pFile);
          try {
            file.sah.truncate(HEADER_OFFSET_DATA + Number(sz64));
            return 0;
          } catch (e) {
            return pool.storeErr(e, capi.SQLITE_IOERR);
          }
        },
        xUnlock: function(pFile, lockType) {
          const pool = getPoolForPFile(pFile);
          pool.log("xUnlock");
          const file = pool.getOFileForS3File(pFile);
          file.lockType = lockType;
          return 0;
        },
        xWrite: function(pFile, pSrc, n, offset64) {
          const pool = getPoolForPFile(pFile);
          pool.storeErr();
          const file = pool.getOFileForS3File(pFile);
          pool.log(`xWrite ${file.path} ${n} ${offset64}`);
          try {
            return n === file.sah.write(wasm.heap8u().subarray(Number(pSrc), Number(pSrc) + n), { at: HEADER_OFFSET_DATA + Number(offset64) }) ? 0 : toss("Unknown write() failure.");
          } catch (e) {
            return pool.storeErr(e, capi.SQLITE_IOERR);
          }
        }
      };
      const opfsIoMethods = new capi.sqlite3_io_methods();
      opfsIoMethods.$iVersion = 1;
      sqlite3.vfs.installVfs({ io: {
        struct: opfsIoMethods,
        methods: ioMethods
      } });
      const vfsMethods = {
        xAccess: function(pVfs, zName, flags, pOut) {
          const pool = getPoolForVfs(pVfs);
          pool.storeErr();
          try {
            const name = pool.getPath(zName);
            wasm.poke32(pOut, pool.hasFilename(name) ? 1 : 0);
          } catch (e) {
            wasm.poke32(pOut, 0);
          }
          return 0;
        },
        xCurrentTime: function(pVfs, pOut) {
          wasm.poke(pOut, 24405875e-1 + (/* @__PURE__ */ new Date()).getTime() / 864e5, "double");
          return 0;
        },
        xCurrentTimeInt64: function(pVfs, pOut) {
          wasm.poke(pOut, 24405875e-1 * 864e5 + (/* @__PURE__ */ new Date()).getTime(), "i64");
          return 0;
        },
        xDelete: function(pVfs, zName, doSyncDir) {
          const pool = getPoolForVfs(pVfs);
          pool.log(`xDelete ${wasm.cstrToJs(zName)}`);
          pool.storeErr();
          try {
            pool.deletePath(pool.getPath(zName));
            return 0;
          } catch (e) {
            pool.storeErr(e);
            return capi.SQLITE_IOERR_DELETE;
          }
        },
        xFullPathname: function(pVfs, zName, nOut, pOut) {
          return wasm.cstrncpy(pOut, zName, nOut) < nOut ? 0 : capi.SQLITE_CANTOPEN;
        },
        xGetLastError: function(pVfs, nOut, pOut) {
          const pool = getPoolForVfs(pVfs);
          const e = pool.popErr();
          pool.log(`xGetLastError ${nOut} e =`, e);
          if (e) {
            const scope = wasm.scopedAllocPush();
            try {
              const [cMsg, n] = wasm.scopedAllocCString(e.message, true);
              wasm.cstrncpy(pOut, cMsg, nOut);
              if (n > nOut) wasm.poke8(wasm.ptr.add(pOut, nOut, -1), 0);
            } catch (e2) {
              return capi.SQLITE_NOMEM;
            } finally {
              wasm.scopedAllocPop(scope);
            }
          }
          return e ? e.sqlite3Rc || capi.SQLITE_IOERR : 0;
        },
        xOpen: function f(pVfs, zName, pFile, flags, pOutFlags) {
          const pool = getPoolForVfs(pVfs);
          try {
            flags &= ~FLAG_COMPUTE_DIGEST_V2;
            pool.log(`xOpen ${wasm.cstrToJs(zName)} ${flags}`);
            const path = zName && wasm.peek8(zName) ? pool.getPath(zName) : getRandomName();
            let sah = pool.getSAHForPath(path);
            if (!sah && flags & capi.SQLITE_OPEN_CREATE) if (pool.getFileCount() < pool.getCapacity()) {
              sah = pool.nextAvailableSAH();
              pool.setAssociatedPath(sah, path, flags);
            } else toss("SAH pool is full. Cannot create file", path);
            if (!sah) toss("file not found:", path);
            const file = {
              path,
              flags,
              sah
            };
            pool.mapS3FileToOFile(pFile, file);
            file.lockType = capi.SQLITE_LOCK_NONE;
            const sq3File = new capi.sqlite3_file(pFile);
            sq3File.$pMethods = opfsIoMethods.pointer;
            sq3File.dispose();
            wasm.poke32(pOutFlags, flags);
            return 0;
          } catch (e) {
            pool.storeErr(e);
            return capi.SQLITE_CANTOPEN;
          }
        }
      };
      const createOpfsVfs = function(vfsName) {
        if (sqlite3.capi.sqlite3_vfs_find(vfsName)) toss3("VFS name is already registered:", vfsName);
        const opfsVfs = new capi.sqlite3_vfs();
        const pDVfs = capi.sqlite3_vfs_find(null);
        const dVfs = pDVfs ? new capi.sqlite3_vfs(pDVfs) : null;
        opfsVfs.$iVersion = 2;
        opfsVfs.$szOsFile = capi.sqlite3_file.structInfo.sizeof;
        opfsVfs.$mxPathname = HEADER_MAX_PATH_SIZE;
        opfsVfs.addOnDispose(opfsVfs.$zName = wasm.allocCString(vfsName), () => setPoolForVfs(opfsVfs.pointer, 0));
        if (dVfs) {
          opfsVfs.$xRandomness = dVfs.$xRandomness;
          opfsVfs.$xSleep = dVfs.$xSleep;
          dVfs.dispose();
        }
        if (!opfsVfs.$xRandomness && !vfsMethods.xRandomness) vfsMethods.xRandomness = function(pVfs, nOut, pOut) {
          const heap = wasm.heap8u();
          let i = 0;
          const npOut = Number(pOut);
          for (; i < nOut; ++i) heap[npOut + i] = Math.random() * 255e3 & 255;
          return i;
        };
        if (!opfsVfs.$xSleep && !vfsMethods.xSleep) vfsMethods.xSleep = (pVfs, ms) => 0;
        sqlite3.vfs.installVfs({ vfs: {
          struct: opfsVfs,
          methods: vfsMethods
        } });
        return opfsVfs;
      };
      class OpfsSAHPool {
        vfsDir;
        #dhVfsRoot;
        #dhOpaque;
        #dhVfsParent;
        #mapSAHToName = /* @__PURE__ */ new Map();
        #mapFilenameToSAH = /* @__PURE__ */ new Map();
        #availableSAH = /* @__PURE__ */ new Set();
        #mapS3FileToOFile_ = /* @__PURE__ */ new Map();
        /** Buffer used by [sg]etAssociatedPath(). */
        #apBody = new Uint8Array(HEADER_CORPUS_SIZE);
        #dvBody;
        #cVfs;
        #verbosity;
        constructor(options = /* @__PURE__ */ Object.create(null)) {
          this.#verbosity = options.verbosity ?? optionDefaults.verbosity;
          this.vfsName = options.name || optionDefaults.name;
          this.#cVfs = createOpfsVfs(this.vfsName);
          setPoolForVfs(this.#cVfs.pointer, this);
          this.vfsDir = options.directory || "." + this.vfsName;
          this.#dvBody = new DataView(this.#apBody.buffer, this.#apBody.byteOffset);
          this.isReady = this.reset(!!(options.clearOnInit ?? optionDefaults.clearOnInit)).then(() => {
            if (this.$error) throw this.$error;
            return this.getCapacity() ? Promise.resolve(void 0) : this.addCapacity(options.initialCapacity || optionDefaults.initialCapacity);
          });
        }
        #logImpl(level, ...args) {
          if (this.#verbosity > level) loggers[level](this.vfsName + ":", ...args);
        }
        log(...args) {
          this.#logImpl(2, ...args);
        }
        warn(...args) {
          this.#logImpl(1, ...args);
        }
        error(...args) {
          this.#logImpl(0, ...args);
        }
        getVfs() {
          return this.#cVfs;
        }
        getCapacity() {
          return this.#mapSAHToName.size;
        }
        getFileCount() {
          return this.#mapFilenameToSAH.size;
        }
        getFileNames() {
          const rc = [];
          for (const n of this.#mapFilenameToSAH.keys()) rc.push(n);
          return rc;
        }
        /**
        Adds n files to the pool's capacity. This change is
        persistent across settings. Returns a Promise which resolves
        to the new capacity.
        */
        async addCapacity(n) {
          for (let i = 0; i < n; ++i) {
            const name = getRandomName();
            const ah = await (await this.#dhOpaque.getFileHandle(name, { create: true })).createSyncAccessHandle();
            this.#mapSAHToName.set(ah, name);
            this.setAssociatedPath(ah, "", 0);
          }
          return this.getCapacity();
        }
        /**
        Reduce capacity by n, but can only reduce up to the limit
        of currently-available SAHs. Returns a Promise which resolves
        to the number of slots really removed.
        */
        async reduceCapacity(n) {
          let nRm = 0;
          for (const ah of Array.from(this.#availableSAH)) {
            if (nRm === n || this.getFileCount() === this.getCapacity()) break;
            const name = this.#mapSAHToName.get(ah);
            ah.close();
            await this.#dhOpaque.removeEntry(name);
            this.#mapSAHToName.delete(ah);
            this.#availableSAH.delete(ah);
            ++nRm;
          }
          return nRm;
        }
        /**
        Releases all currently-opened SAHs. The only legal operation
        after this is acquireAccessHandles() or (if this is called from
        pauseVfs()) either of isPaused() or unpauseVfs().
        */
        releaseAccessHandles() {
          for (const ah of this.#mapSAHToName.keys()) ah.close();
          this.#mapSAHToName.clear();
          this.#mapFilenameToSAH.clear();
          this.#availableSAH.clear();
        }
        /**
        Opens all files under this.vfsDir/this.#dhOpaque and acquires a
        SAH for each. Returns a Promise which resolves to no value but
        completes once all SAHs are acquired. If acquiring an SAH
        throws, this.$error will contain the corresponding Error
        object.

        If it throws, it releases any SAHs which it may have
        acquired before the exception was thrown, leaving the VFS in a
        well-defined but unusable state.

        If clearFiles is true, the client-stored state of each file is
        cleared when its handle is acquired, including its name, flags,
        and any data stored after the metadata block.
        */
        async acquireAccessHandles(clearFiles = false) {
          const files = [];
          for await (const [name, h] of this.#dhOpaque) if ("file" === h.kind) files.push([name, h]);
          return Promise.all(files.map(async ([name, h]) => {
            try {
              const ah = await h.createSyncAccessHandle();
              this.#mapSAHToName.set(ah, name);
              if (clearFiles) {
                ah.truncate(HEADER_OFFSET_DATA);
                this.setAssociatedPath(ah, "", 0);
              } else {
                const path = this.getAssociatedPath(ah);
                if (path) this.#mapFilenameToSAH.set(path, ah);
                else this.#availableSAH.add(ah);
              }
            } catch (e) {
              this.storeErr(e);
              this.releaseAccessHandles();
              throw e;
            }
          }));
        }
        /**
        Given an SAH, returns the client-specified name of
        that file by extracting it from the SAH's header.

        On error, it disassociates SAH from the pool and
        returns an empty string.
        */
        getAssociatedPath(sah) {
          sah.read(this.#apBody, { at: 0 });
          const flags = this.#dvBody.getUint32(HEADER_OFFSET_FLAGS);
          if (this.#apBody[0] && (flags & capi.SQLITE_OPEN_DELETEONCLOSE || (flags & PERSISTENT_FILE_TYPES) === 0)) {
            warn(`Removing file with unexpected flags ${flags.toString(16)}`, this.#apBody);
            this.setAssociatedPath(sah, "", 0);
            return "";
          }
          const fileDigest = new Uint32Array(HEADER_DIGEST_SIZE / 4);
          sah.read(fileDigest, { at: HEADER_OFFSET_DIGEST });
          const compDigest = this.computeDigest(this.#apBody, flags);
          if (fileDigest.every((v2, i) => v2 === compDigest[i])) {
            const pathBytes = this.#apBody.findIndex((v2) => 0 === v2);
            if (0 === pathBytes) sah.truncate(HEADER_OFFSET_DATA);
            return pathBytes ? textDecoder.decode(this.#apBody.subarray(0, pathBytes)) : "";
          } else {
            warn("Disassociating file with bad digest.");
            this.setAssociatedPath(sah, "", 0);
            return "";
          }
        }
        /**
        Stores the given client-defined path and SQLITE_OPEN_xyz flags
        into the given SAH. If path is an empty string then the file is
        disassociated from the pool but its previous name is preserved
        in the metadata.
        */
        setAssociatedPath(sah, path, flags) {
          const enc = textEncoder.encodeInto(path, this.#apBody);
          if (HEADER_MAX_PATH_SIZE <= enc.written + 1) toss("Path too long:", path);
          if (path && flags) flags |= FLAG_COMPUTE_DIGEST_V2;
          this.#apBody.fill(0, enc.written, HEADER_MAX_PATH_SIZE);
          this.#dvBody.setUint32(HEADER_OFFSET_FLAGS, flags);
          const digest = this.computeDigest(this.#apBody, flags);
          sah.write(this.#apBody, { at: 0 });
          sah.write(digest, { at: HEADER_OFFSET_DIGEST });
          sah.flush();
          if (path) {
            this.#mapFilenameToSAH.set(path, sah);
            this.#availableSAH.delete(sah);
          } else {
            sah.truncate(HEADER_OFFSET_DATA);
            this.#availableSAH.add(sah);
          }
        }
        /**
        Computes a digest for the given byte array and returns it as a
        two-element Uint32Array. This digest gets stored in the
        metadata for each file as a validation check. Changing this
        algorithm invalidates all existing databases for this VFS, so
        don't do that.

        See the docs for FLAG_COMPUTE_DIGEST_V2 for more details.
        */
        computeDigest(byteArray, fileFlags) {
          if (fileFlags & FLAG_COMPUTE_DIGEST_V2) {
            let h1 = 3735928559;
            let h2 = 1103547991;
            for (const v2 of byteArray) {
              h1 = Math.imul(h1 ^ v2, 2654435761);
              h2 = Math.imul(h2 ^ v2, 104729);
            }
            return new Uint32Array([h1 >>> 0, h2 >>> 0]);
          } else return new Uint32Array([0, 0]);
        }
        /**
        Re-initializes the state of the SAH pool, releasing and
        re-acquiring all handles.

        See acquireAccessHandles() for the specifics of the clearFiles
        argument.
        */
        async reset(clearFiles) {
          await this.isReady;
          let h = await navigator.storage.getDirectory(), prev;
          for (const d of this.vfsDir.split("/")) if (d) {
            prev = h;
            h = await h.getDirectoryHandle(d, { create: true });
          }
          this.#dhVfsRoot = h;
          this.#dhVfsParent = prev;
          this.#dhOpaque = await this.#dhVfsRoot.getDirectoryHandle(OPAQUE_DIR_NAME, { create: true });
          this.releaseAccessHandles();
          return this.acquireAccessHandles(clearFiles);
        }
        /**
        Returns the pathname part of the given argument,
        which may be any of:

        - a URL object
        - A JS string representing a file name
        - Wasm C-string representing a file name

        All "../" parts and duplicate slashes are resolve/removed from
        the returned result.
        */
        getPath(arg) {
          if (wasm.isPtr(arg)) arg = wasm.cstrToJs(arg);
          return (arg instanceof URL ? arg : new URL(arg, "file://localhost/")).pathname;
        }
        /**
        Removes the association of the given client-specified file
        name (JS string) from the pool. Returns true if a mapping
        is found, else false.
        */
        deletePath(path) {
          const sah = this.#mapFilenameToSAH.get(path);
          if (sah) {
            this.#mapFilenameToSAH.delete(path);
            this.setAssociatedPath(sah, "", 0);
          }
          return !!sah;
        }
        /**
        Sets e (an Error object) as this object's current error. Pass a
        falsy (or no) value to clear it. If code is truthy it is
        assumed to be an SQLITE_xxx result code, defaulting to
        SQLITE_IOERR if code is falsy.

        Returns the 2nd argument.
        */
        storeErr(e, code) {
          if (e) {
            e.sqlite3Rc = code || capi.SQLITE_IOERR;
            this.error(e);
          }
          this.$error = e;
          return code;
        }
        /**
        Pops this object's Error object and returns
        it (a falsy value if no error is set).
        */
        popErr() {
          const rc = this.$error;
          this.$error = void 0;
          return rc;
        }
        /**
        Returns the next available SAH without removing
        it from the set.
        */
        nextAvailableSAH() {
          const [rc] = this.#availableSAH.keys();
          return rc;
        }
        /**
        Given an (sqlite3_file*), returns the mapped
        xOpen file object.
        */
        getOFileForS3File(pFile) {
          return this.#mapS3FileToOFile_.get(pFile);
        }
        /**
        Maps or unmaps (if file is falsy) the given (sqlite3_file*)
        to an xOpen file object and to this pool object.
        */
        mapS3FileToOFile(pFile, file) {
          if (file) {
            this.#mapS3FileToOFile_.set(pFile, file);
            setPoolForPFile(pFile, this);
          } else {
            this.#mapS3FileToOFile_.delete(pFile);
            setPoolForPFile(pFile, false);
          }
        }
        /**
        Returns true if the given client-defined file name is in this
        object's name-to-SAH map.
        */
        hasFilename(name) {
          return this.#mapFilenameToSAH.has(name);
        }
        /**
        Returns the SAH associated with the given
        client-defined file name.
        */
        getSAHForPath(path) {
          return this.#mapFilenameToSAH.get(path);
        }
        /**
        Removes this object's sqlite3_vfs registration and shuts down
        this object, releasing all handles, mappings, and whatnot,
        including deleting its data directory. There is currently no
        way to "revive" the object and reaquire its
        resources. Similarly, there is no recovery strategy if removal
        of any given SAH fails, so such errors are ignored by this
        function.

        This function is intended primarily for testing.

        Resolves to true if it did its job, false if the
        VFS has already been shut down.

        @see pauseVfs()
        @see unpauseVfs()
        */
        async removeVfs() {
          if (!this.#cVfs.pointer || !this.#dhOpaque) return false;
          capi.sqlite3_vfs_unregister(this.#cVfs.pointer);
          this.#cVfs.dispose();
          delete initPromises[this.vfsName];
          try {
            this.releaseAccessHandles();
            await this.#dhVfsRoot.removeEntry(OPAQUE_DIR_NAME, { recursive: true });
            this.#dhOpaque = void 0;
            await this.#dhVfsParent.removeEntry(this.#dhVfsRoot.name, { recursive: true });
            this.#dhVfsRoot = this.#dhVfsParent = void 0;
          } catch (e) {
            sqlite3.config.error(this.vfsName, "removeVfs() failed with no recovery strategy:", e);
          }
          return true;
        }
        /**
        "Pauses" this VFS by unregistering it from SQLite and
        relinquishing all open SAHs, leaving the associated files
        intact. If this object is already paused, this is a
        no-op. Returns this object.

        This function throws if SQLite has any opened file handles
        hosted by this VFS, as the alternative would be to invoke
        Undefined Behavior by closing file handles out from under the
        library. Similarly, automatically closing any database handles
        opened by this VFS would invoke Undefined Behavior in
        downstream code which is holding those pointers.

        If this function throws due to open file handles then it has
        no side effects. If the OPFS API throws while closing handles
        then the VFS is left in an undefined state.

        @see isPaused()
        @see unpauseVfs()
        */
        pauseVfs() {
          if (this.#mapS3FileToOFile_.size > 0) sqlite3.SQLite3Error.toss(capi.SQLITE_MISUSE, "Cannot pause VFS", this.vfsName, "because it has opened files.");
          if (this.#mapSAHToName.size > 0) {
            capi.sqlite3_vfs_unregister(this.vfsName);
            this.releaseAccessHandles();
          }
          return this;
        }
        /**
        Returns true if this pool is currently paused else false.

        @see pauseVfs()
        @see unpauseVfs()
        */
        isPaused() {
          return 0 === this.#mapSAHToName.size;
        }
        /**
        "Unpauses" this VFS, reacquiring all SAH's and (if successful)
        re-registering it with SQLite. This is a no-op if the VFS is
        not currently paused.

        The returned Promise resolves to this object. See
        acquireAccessHandles() for how it behaves if it throws due to
        SAH acquisition failure.

        @see isPaused()
        @see pauseVfs()
        */
        async unpauseVfs() {
          if (0 === this.#mapSAHToName.size) return this.acquireAccessHandles(false).then(() => capi.sqlite3_vfs_register(this.#cVfs, 0), this);
          return this;
        }
        //! Documented elsewhere in this file.
        exportFile(name) {
          const sah = this.#mapFilenameToSAH.get(name) || toss("File not found:", name);
          const n = sah.getSize() - HEADER_OFFSET_DATA;
          const b = new Uint8Array(n > 0 ? n : 0);
          if (n > 0) {
            const nRead = sah.read(b, { at: HEADER_OFFSET_DATA });
            if (nRead != n) toss("Expected to read " + n + " bytes but read " + nRead + ".");
          }
          return b;
        }
        //! Impl for importDb() when its 2nd arg is a function.
        async importDbChunked(name, callback) {
          const sah = this.#mapFilenameToSAH.get(name) || this.nextAvailableSAH() || toss("No available handles to import to.");
          sah.truncate(0);
          let nWrote = 0, chunk, checkedHeader = false;
          try {
            while (void 0 !== (chunk = await callback())) {
              if (chunk instanceof ArrayBuffer) chunk = new Uint8Array(chunk);
              if (!checkedHeader && 0 === nWrote && chunk.byteLength >= 15) {
                util.affirmDbHeader(chunk);
                checkedHeader = true;
              }
              sah.write(chunk, { at: HEADER_OFFSET_DATA + nWrote });
              nWrote += chunk.byteLength;
            }
            if (nWrote < 512 || 0 !== nWrote % 512) toss("Input size", nWrote, "is not correct for an SQLite database.");
            if (!checkedHeader) {
              const header = new Uint8Array(20);
              sah.read(header, { at: 0 });
              util.affirmDbHeader(header);
            }
            sah.write(new Uint8Array([1, 1]), { at: HEADER_OFFSET_DATA + 18 });
          } catch (e) {
            this.setAssociatedPath(sah, "", 0);
            throw e;
          }
          this.setAssociatedPath(sah, name, capi.SQLITE_OPEN_MAIN_DB);
          return nWrote;
        }
        //! Documented elsewhere in this file.
        importDb(name, bytes) {
          if (bytes instanceof ArrayBuffer) bytes = new Uint8Array(bytes);
          else if (bytes instanceof Function) return this.importDbChunked(name, bytes);
          const sah = this.#mapFilenameToSAH.get(name) || this.nextAvailableSAH() || toss("No available handles to import to.");
          const n = bytes.byteLength;
          if (n < 512 || n % 512 != 0) toss("Byte array size is invalid for an SQLite db.");
          const header = "SQLite format 3";
          for (let i = 0; i < 15; ++i) if (header.charCodeAt(i) !== bytes[i]) toss("Input does not contain an SQLite database header.");
          const nWrote = sah.write(bytes, { at: HEADER_OFFSET_DATA });
          if (nWrote != n) {
            this.setAssociatedPath(sah, "", 0);
            toss("Expected to write " + n + " bytes but wrote " + nWrote + ".");
          } else {
            sah.write(new Uint8Array([1, 1]), { at: HEADER_OFFSET_DATA + 18 });
            this.setAssociatedPath(sah, name, capi.SQLITE_OPEN_MAIN_DB);
          }
          return nWrote;
        }
      }
      class OpfsSAHPoolUtil {
        #p;
        constructor(sahPool) {
          this.#p = sahPool;
          this.vfsName = sahPool.vfsName;
        }
        async addCapacity(n) {
          return this.#p.addCapacity(n);
        }
        async reduceCapacity(n) {
          return this.#p.reduceCapacity(n);
        }
        getCapacity() {
          return this.#p.getCapacity(this.#p);
        }
        getFileCount() {
          return this.#p.getFileCount();
        }
        getFileNames() {
          return this.#p.getFileNames();
        }
        async reserveMinimumCapacity(min) {
          const c = this.#p.getCapacity();
          return c < min ? this.#p.addCapacity(min - c) : c;
        }
        exportFile(name) {
          return this.#p.exportFile(name);
        }
        importDb(name, bytes) {
          return this.#p.importDb(name, bytes);
        }
        async wipeFiles() {
          return this.#p.reset(true);
        }
        unlink(filename) {
          return this.#p.deletePath(filename);
        }
        async removeVfs() {
          return this.#p.removeVfs();
        }
        pauseVfs() {
          this.#p.pauseVfs();
          return this;
        }
        async unpauseVfs() {
          return this.#p.unpauseVfs().then(() => this);
        }
        isPaused() {
          return this.#p.isPaused();
        }
      }
      const apiVersionCheck = async () => {
        const dh = await navigator.storage.getDirectory();
        const fn = ".opfs-sahpool-sync-check-" + getRandomName();
        const close = (await (await dh.getFileHandle(fn, { create: true })).createSyncAccessHandle()).close();
        await close;
        await dh.removeEntry(fn);
        if (close?.then) toss("The local OPFS API is too old for opfs-sahpool:", "it has an async FileSystemSyncAccessHandle.close() method.");
        return true;
      };
      sqlite3.installOpfsSAHPoolVfs = async function(options = /* @__PURE__ */ Object.create(null)) {
        options = Object.assign(/* @__PURE__ */ Object.create(null), optionDefaults, options || {});
        const vfsName = options.name;
        if (options.$testThrowPhase1) throw options.$testThrowPhase1;
        if (initPromises[vfsName]) try {
          return await initPromises[vfsName];
        } catch (e) {
          if (options.forceReinitIfPreviouslyFailed) delete initPromises[vfsName];
          else throw e;
        }
        if (!globalThis.FileSystemHandle || !globalThis.FileSystemDirectoryHandle || !globalThis.FileSystemFileHandle || !globalThis.FileSystemFileHandle.prototype.createSyncAccessHandle || !navigator?.storage?.getDirectory) return initPromises[vfsName] = Promise.reject(/* @__PURE__ */ new Error("Missing required OPFS APIs."));
        return initPromises[vfsName] = apiVersionCheck().then(async function() {
          if (options.$testThrowPhase2) throw options.$testThrowPhase2;
          const thePool = new OpfsSAHPool(options);
          return thePool.isReady.then(async () => {
            const poolUtil = new OpfsSAHPoolUtil(thePool);
            if (sqlite3.oo1) {
              const oo1 = sqlite3.oo1;
              const theVfs = thePool.getVfs();
              const OpfsSAHPoolDb = function(...args) {
                const opt = oo1.DB.dbCtorHelper.normalizeArgs(...args);
                opt.vfs = theVfs.$zName;
                oo1.DB.dbCtorHelper.call(this, opt);
              };
              OpfsSAHPoolDb.prototype = Object.create(oo1.DB.prototype);
              poolUtil.OpfsSAHPoolDb = OpfsSAHPoolDb;
            }
            thePool.log("VFS initialized.");
            return poolUtil;
          }).catch(async (e) => {
            await thePool.removeVfs().catch(() => {
            });
            throw e;
          });
        }).catch((err2) => {
          return initPromises[vfsName] = Promise.reject(err2);
        });
      };
    });
    globalThis.sqlite3ApiBootstrap.initializers.push(function(sqlite3) {
      if (!sqlite3.opfs || sqlite3.config.disable?.vfs?.["opfs-wl"]) return;
      const util = sqlite3.util;
      sqlite3.util.toss;
      const opfsUtil = sqlite3.opfs;
      const vfsName = "opfs-wl";
      const installOpfsWlVfs = async function(options) {
        options = opfsUtil.initOptions(vfsName, options);
        if (!options) return sqlite3;
        sqlite3.capi;
        const opfsVfs = opfsUtil.createVfsState().vfs;
        opfsVfs.metrics.counters;
        const mTimeStart = opfsVfs.mTimeStart, mTimeEnd = opfsVfs.mTimeEnd, opRun = opfsVfs.opRun, __openFiles = opfsVfs.__openFiles;
        return opfsVfs.bindVfs(util.nu({
          xLock: function(pFile, lockType) {
            mTimeStart("xLock");
            const f = __openFiles[pFile];
            const rc = opRun("xLock", pFile, lockType);
            if (!rc) f.lockType = lockType;
            mTimeEnd();
            return rc;
          },
          xUnlock: function(pFile, lockType) {
            mTimeStart("xUnlock");
            const f = __openFiles[pFile];
            const rc = opRun("xUnlock", pFile, lockType);
            if (!rc) f.lockType = lockType;
            mTimeEnd();
            return rc;
          }
        }), function(sqlite32, vfs) {
          if (sqlite32.oo1) {
            const OpfsWlDb = function(...args) {
              const opt = sqlite32.oo1.DB.dbCtorHelper.normalizeArgs(...args);
              opt.vfs = vfs.$zName;
              sqlite32.oo1.DB.dbCtorHelper.call(this, opt);
            };
            OpfsWlDb.prototype = Object.create(sqlite32.oo1.DB.prototype);
            sqlite32.oo1.OpfsWlDb = OpfsWlDb;
            OpfsWlDb.importDb = opfsUtil.importDb;
          }
        });
      };
      globalThis.sqlite3ApiBootstrap.initializersAsync.push(async (sqlite32) => {
        return installOpfsWlVfs().catch((e) => {
          sqlite32.config.warn("Ignoring inability to install the", vfsName, "sqlite3_vfs:", e);
        });
      });
    });
    try {
      const bootstrapConfig = Object.assign(
        /* @__PURE__ */ Object.create(null),
        /** The WASM-environment-dependent configuration for sqlite3ApiBootstrap() */
        {
          memory: "undefined" !== typeof wasmMemory ? wasmMemory : EmscriptenModule["wasmMemory"],
          exports: "undefined" !== typeof wasmExports ? wasmExports : Object.prototype.hasOwnProperty.call(EmscriptenModule, "wasmExports") ? EmscriptenModule["wasmExports"] : EmscriptenModule["asm"]
        },
        globalThis.sqlite3ApiBootstrap.defaultConfig,
        globalThis.sqlite3ApiConfig || {}
      );
      sqlite3InitScriptInfo.debugModule("Bootstrapping lib config", bootstrapConfig);
      const p = globalThis.sqlite3ApiBootstrap(bootstrapConfig);
      delete globalThis.sqlite3ApiBootstrap;
      return p;
    } catch (e) {
      console.error("sqlite3ApiBootstrap() error:", e);
      throw e;
    }
  };
  if (runtimeInitialized) moduleRtn = Module;
  else moduleRtn = new Promise((resolve, reject) => {
    readyPromiseResolve = resolve;
    readyPromiseReject = reject;
  });
  return moduleRtn;
}
var sqlite3_worker1_promiser_default, sqlite3_bundler_friendly_default;
var init_dist = __esm({
  "node_modules/@sqlite.org/sqlite-wasm/dist/index.mjs"() {
    globalThis.sqlite3Worker1Promiser = function callee(config = callee.defaultConfig) {
      if (1 === arguments.length && "function" === typeof arguments[0]) {
        const f = config;
        config = Object.assign(/* @__PURE__ */ Object.create(null), callee.defaultConfig);
        config.onready = f;
      } else config = Object.assign(/* @__PURE__ */ Object.create(null), callee.defaultConfig, config);
      const handlerMap = /* @__PURE__ */ Object.create(null);
      const noop = function() {
      };
      const err = config.onerror || noop;
      const debug = config.debug || noop;
      const idTypeMap = config.generateMessageId ? void 0 : /* @__PURE__ */ Object.create(null);
      const genMsgId = config.generateMessageId || function(msg) {
        return msg.type + "#" + (idTypeMap[msg.type] = (idTypeMap[msg.type] || 0) + 1);
      };
      const toss = (...args) => {
        throw new Error(args.join(" "));
      };
      if (!config.worker) config.worker = callee.defaultConfig.worker;
      if ("function" === typeof config.worker) config.worker = config.worker();
      let dbId;
      let promiserFunc;
      config.worker.onmessage = function(ev) {
        ev = ev.data;
        debug("worker1.onmessage", ev);
        let msgHandler = handlerMap[ev.messageId];
        if (!msgHandler) {
          if (ev && "sqlite3-api" === ev.type && "worker1-ready" === ev.result) {
            if (config.onready) config.onready(promiserFunc);
            return;
          }
          msgHandler = handlerMap[ev.type];
          if (msgHandler && msgHandler.onrow) {
            msgHandler.onrow(ev);
            return;
          }
          if (config.onunhandled) config.onunhandled(arguments[0]);
          else err("sqlite3Worker1Promiser() unhandled worker message:", ev);
          return;
        }
        delete handlerMap[ev.messageId];
        switch (ev.type) {
          case "error":
            msgHandler.reject(ev);
            return;
          case "open":
            if (!dbId) dbId = ev.dbId;
            break;
          case "close":
            if (ev.dbId === dbId) dbId = void 0;
            break;
          default:
            break;
        }
        try {
          msgHandler.resolve(ev);
        } catch (e) {
          msgHandler.reject(e);
        }
      };
      return promiserFunc = function() {
        let msg;
        if (1 === arguments.length) msg = arguments[0];
        else if (2 === arguments.length) {
          msg = /* @__PURE__ */ Object.create(null);
          msg.type = arguments[0];
          msg.args = arguments[1];
          msg.dbId = msg.args.dbId;
        } else toss("Invalid arguments for sqlite3Worker1Promiser()-created factory.");
        if (!msg.dbId && msg.type !== "open") msg.dbId = dbId;
        msg.messageId = genMsgId(msg);
        msg.departureTime = performance.now();
        const proxy = /* @__PURE__ */ Object.create(null);
        proxy.message = msg;
        let rowCallbackId;
        if ("exec" === msg.type && msg.args) {
          if ("function" === typeof msg.args.callback) {
            rowCallbackId = msg.messageId + ":row";
            proxy.onrow = msg.args.callback;
            msg.args.callback = rowCallbackId;
            handlerMap[rowCallbackId] = proxy;
          } else if ("string" === typeof msg.args.callback) toss("exec callback may not be a string when using the Promise interface.");
        }
        let p = new Promise(function(resolve, reject) {
          proxy.resolve = resolve;
          proxy.reject = reject;
          handlerMap[msg.messageId] = proxy;
          debug("Posting", msg.type, "message to Worker dbId=" + (dbId || "default") + ":", msg);
          config.worker.postMessage(msg);
        });
        if (rowCallbackId) p = p.finally(() => delete handlerMap[rowCallbackId]);
        return p;
      };
    };
    globalThis.sqlite3Worker1Promiser.defaultConfig = {
      worker: function() {
        return new Worker(new URL("sqlite3-worker1.mjs", import.meta.url), { type: "module" });
      },
      onerror: (...args) => console.error("sqlite3Worker1Promiser():", ...args)
    };
    globalThis.sqlite3Worker1Promiser.v2 = function callee2(config = callee2.defaultConfig) {
      let oldFunc;
      if ("function" == typeof config) {
        oldFunc = config;
        config = {};
      } else if ("function" === typeof config?.onready) {
        oldFunc = config.onready;
        delete config.onready;
      }
      const promiseProxy = /* @__PURE__ */ Object.create(null);
      config = Object.assign(config || /* @__PURE__ */ Object.create(null), { onready: async function(func) {
        try {
          if (oldFunc) await oldFunc(func);
          promiseProxy.resolve(func);
        } catch (e) {
          promiseProxy.reject(e);
        }
      } });
      const p = new Promise(function(resolve, reject) {
        promiseProxy.resolve = resolve;
        promiseProxy.reject = reject;
      });
      try {
        this.original(config);
      } catch (e) {
        promiseProxy.reject(e);
      }
      return p;
    }.bind({ original: sqlite3Worker1Promiser });
    globalThis.sqlite3Worker1Promiser.v2.defaultConfig = globalThis.sqlite3Worker1Promiser.defaultConfig;
    sqlite3_worker1_promiser_default = sqlite3Worker1Promiser.v2;
    delete globalThis.sqlite3Worker1Promiser;
    sqlite3InitModule = (function() {
      const originalInit = sqlite3InitModule;
      if (!originalInit) throw new Error("Expecting sqlite3InitModule to be defined by the Emscripten build.");
      const sIMS = globalThis.sqlite3InitModuleState = Object.assign(/* @__PURE__ */ Object.create(null), {
        moduleScript: globalThis?.document?.currentScript,
        isWorker: "undefined" !== typeof WorkerGlobalScope,
        location: globalThis.location,
        urlParams: globalThis?.location?.href ? new URL(globalThis.location.href).searchParams : new URLSearchParams(),
        wasmFilename: "sqlite3.wasm"
      });
      sIMS.debugModule = sIMS.urlParams.has("sqlite3.debugModule") ? (...args) => console.warn("sqlite3.debugModule:", ...args) : () => {
      };
      if (sIMS.urlParams.has("sqlite3.dir")) sIMS.sqlite3Dir = sIMS.urlParams.get("sqlite3.dir") + "/";
      else if (sIMS.moduleScript) {
        const li = sIMS.moduleScript.src.split("/");
        li.pop();
        sIMS.sqlite3Dir = li.join("/") + "/";
      }
      const sIM = globalThis.sqlite3InitModule = function ff(...args) {
        sIMS.emscriptenLocateFile = args[0]?.locateFile;
        sIMS.emscriptenInstantiateWasm = args[0]?.instantiateWasm;
        return originalInit(...args).then((EmscriptenModule) => {
          sIMS.debugModule("sqlite3InitModule() sIMS =", sIMS);
          sIMS.debugModule("sqlite3InitModule() EmscriptenModule =", EmscriptenModule);
          const s = EmscriptenModule.runSQLite3PostLoadInit(sIMS, EmscriptenModule, !!ff.__isUnderTest);
          sIMS.debugModule("sqlite3InitModule() sqlite3 =", s);
          return s;
        }).catch((e) => {
          console.error("Exception loading sqlite3 module:", e);
          throw e;
        });
      };
      sIM.ready = originalInit.ready;
      if (sIMS.moduleScript) {
        let src = sIMS.moduleScript.src.split("/");
        src.pop();
        sIMS.scriptDir = src.join("/") + "/";
      }
      sIMS.debugModule("extern-post-js.c-pp.js sqlite3InitModuleState =", sIMS);
      return sIM;
    })();
    sqlite3_bundler_friendly_default = sqlite3InitModule;
  }
});

// packages/Epoch.Community.Web/src/search/sqlite-worker.ts
var import_community_core3 = __toESM(require_dist());

// packages/Epoch.Community.Web/src/search/sqlite-wasm-backend.ts
var import_community_core = __toESM(require_dist());
var SQLITE_INDEX_SCHEMA_VERSION = 1;
var SQLITE_ANALYZER_VERSION = "epoch-sqlite-fts5-unicode61-v1";
async function initializeSqliteIndex(database, options) {
  const fts5 = Number(database.value("SELECT sqlite_compileoption_used('ENABLE_FTS5')")) === 1;
  if (!fts5) {
    throw new import_community_core.CommunityError("QUERY_UNSUPPORTED_SOURCE", "This SQLite WASM runtime does not provide FTS5");
  }
  const version = Number(database.value("PRAGMA user_version") ?? 0);
  if (!Number.isSafeInteger(version) || version < 0 || version > SQLITE_INDEX_SCHEMA_VERSION) {
    throw new import_community_core.CommunityError("PERSISTENCE_MIGRATION", `Unsupported SQLite search-index schema version: ${String(version)}`);
  }
  if (version < 1) {
    database.execute("BEGIN IMMEDIATE");
    try {
      for (const statement of SQLITE_SCHEMA_V1) database.execute(statement);
      database.execute(`PRAGMA user_version = ${SQLITE_INDEX_SCHEMA_VERSION}`);
      database.execute("COMMIT");
    } catch (error) {
      try {
        database.execute("ROLLBACK");
      } catch {
      }
      throw new import_community_core.CommunityError("PERSISTENCE_MIGRATION", "Could not migrate the browser search index", void 0, { cause: error });
    }
  }
  return Object.freeze({
    fts5: true,
    schemaVersion: SQLITE_INDEX_SCHEMA_VERSION,
    storageMode: options.storageMode,
    analyzerVersion: SQLITE_ANALYZER_VERSION
  });
}
function translateSearchExpressionToSql(expression, allowedObjectIds) {
  if (allowedObjectIds.length > 1e4) throw new import_community_core.CommunityError("QUERY_COST_LIMIT", "SQLite candidate authorization set exceeds 10000 objects");
  const parameters = [];
  const bind = (value) => {
    parameters.push(value);
    return "?";
  };
  const authorization = allowedObjectIds.length === 0 ? "0" : `entity.object_id IN (${allowedObjectIds.map((id) => bind(id)).join(", ")})`;
  const predicate = translateExpression(expression, bind);
  return Object.freeze({
    sql: `SELECT entity.object_id FROM entity WHERE ${authorization} AND (${predicate}) ORDER BY entity.object_id ASC`,
    parameters: Object.freeze(parameters),
    authorizationCount: allowedObjectIds.length
  });
}
function translateExpression(expression, bind) {
  switch (expression.kind) {
    case "all":
      return "1";
    case "and":
      return expression.terms.length === 0 ? "1" : expression.terms.map((term) => `(${translateExpression(term, bind)})`).join(" AND ");
    case "or":
      return expression.terms.length === 0 ? "0" : expression.terms.map((term) => `(${translateExpression(term, bind)})`).join(" OR ");
    case "not":
      return `NOT (${translateExpression(expression.term, bind)})`;
    case "exists":
      return `EXISTS (SELECT 1 FROM entity_field AS field WHERE field.object_id = entity.object_id AND field.field_name = ${bind(expression.field)})`;
    case "range": {
      const conditions = [`field.object_id = entity.object_id`, `field.field_name = ${bind(expression.field)}`];
      if (expression.lower !== void 0) conditions.push(`field.${valueColumn(expression.lower)} ${expression.includeLower ? ">=" : ">"} ${bind(expression.lower)}`);
      if (expression.upper !== void 0) conditions.push(`field.${valueColumn(expression.upper)} ${expression.includeUpper ? "<=" : "<"} ${bind(expression.upper)}`);
      return `EXISTS (SELECT 1 FROM entity_field AS field WHERE ${conditions.join(" AND ")})`;
    }
    case "compare": {
      const fieldParameter = bind(expression.field);
      const values = Array.isArray(expression.value) ? expression.value : [expression.value];
      const comparisons = values.map((value) => comparisonSql(value, expression.operator, bind));
      const joined = expression.operator === "ne" ? comparisons.join(" AND ") : comparisons.join(" OR ");
      return `EXISTS (SELECT 1 FROM entity_field AS field WHERE field.object_id = entity.object_id AND field.field_name = ${fieldParameter} AND (${joined}))`;
    }
    case "text": {
      const supported = /* @__PURE__ */ new Set(["title", "body", "text"]);
      if (expression.fields.length === 0 || expression.fields.some((field) => !supported.has(field))) {
        throw new import_community_core.CommunityError("QUERY_UNSUPPORTED_SOURCE", `SQLite FTS5 fields are unsupported: ${expression.fields.join(", ")}`);
      }
      const value = fts5Query(expression.value, expression.mode);
      const matches = expression.fields.map((field) => `${field} MATCH ${bind(value)}`).join(" OR ");
      return `entity.object_id IN (SELECT object_id FROM entity_fts WHERE ${matches})`;
    }
    case "related": {
      const source = expression.direction === "out" ? "source_id" : "target_id";
      const target = expression.direction === "out" ? "target_id" : "source_id";
      return `EXISTS (SELECT 1 FROM relation WHERE relation.${source} = entity.object_id AND relation.relation_type = ${bind(expression.relation)} AND relation.${target} = ${bind(expression.target.objectId)})`;
    }
  }
}
function comparisonSql(value, operator, bind) {
  if (value === null) {
    if (operator !== "eq" && operator !== "ne" && operator !== "in") return "0";
    return `field.null_value ${operator === "ne" ? "IS NULL" : "IS NOT NULL"}`;
  }
  return `field.${valueColumn(value)} ${sqlOperator(operator)} ${bind(typeof value === "boolean" ? Number(value) : value)}`;
}
function sqlOperator(operator) {
  switch (operator) {
    case "eq":
    case "in":
      return "=";
    case "ne":
      return "<>";
    case "lt":
      return "<";
    case "lte":
      return "<=";
    case "gt":
      return ">";
    case "gte":
      return ">=";
  }
}
function valueColumn(value) {
  if (value === null) return "null_value";
  if (typeof value === "number") return "number_value";
  if (typeof value === "boolean") return "boolean_value";
  return "text_value";
}
function fts5Query(value, mode2) {
  const escaped = value.normalize("NFC").replaceAll('"', '""');
  return expressionMode(escaped, mode2);
}
function expressionMode(value, mode2) {
  if (mode2 === "prefix") return `"${value}"*`;
  return `"${value}"`;
}
var SQLITE_SCHEMA_V1 = Object.freeze([
  "CREATE TABLE IF NOT EXISTS entity (object_id TEXT PRIMARY KEY, kind TEXT NOT NULL, visibility TEXT NOT NULL, entity_json TEXT NOT NULL, updated_at TEXT NOT NULL)",
  "CREATE TABLE IF NOT EXISTS entity_field (object_id TEXT NOT NULL REFERENCES entity(object_id) ON DELETE CASCADE, field_name TEXT NOT NULL, ordinal INTEGER NOT NULL, text_value TEXT, number_value REAL, boolean_value INTEGER, null_value INTEGER, PRIMARY KEY (object_id, field_name, ordinal))",
  "CREATE TABLE IF NOT EXISTS relation (source_id TEXT NOT NULL, relation_type TEXT NOT NULL, target_id TEXT NOT NULL, PRIMARY KEY (source_id, relation_type, target_id))",
  "CREATE VIRTUAL TABLE IF NOT EXISTS entity_fts USING fts5(object_id UNINDEXED, title, body, text, tokenize='unicode61 remove_diacritics 2')",
  "CREATE TABLE IF NOT EXISTS source_checkpoint (source_id TEXT PRIMARY KEY, token TEXT NOT NULL, observed_at TEXT NOT NULL, status TEXT NOT NULL, detail TEXT)",
  "CREATE TABLE IF NOT EXISTS projection_definition (projection_id TEXT NOT NULL, version INTEGER NOT NULL, definition_json TEXT NOT NULL, PRIMARY KEY (projection_id, version))",
  "CREATE TABLE IF NOT EXISTS namespace_mount (mount_id TEXT PRIMARY KEY, mount_json TEXT NOT NULL)",
  "CREATE TABLE IF NOT EXISTS query_history (history_id TEXT PRIMARY KEY, query_json TEXT NOT NULL, created_at TEXT NOT NULL)",
  "CREATE TABLE IF NOT EXISTS index_metadata (key TEXT PRIMARY KEY, value TEXT NOT NULL)",
  "CREATE INDEX IF NOT EXISTS entity_field_lookup ON entity_field(field_name, text_value, number_value, boolean_value)",
  "CREATE INDEX IF NOT EXISTS relation_target_lookup ON relation(target_id, relation_type, source_id)"
]);

// packages/Epoch.Community.Web/src/search/persistence-coordinator.ts
var import_community_core2 = __toESM(require_dist());
function mapSqlitePersistenceError(error) {
  if (error instanceof import_community_core2.CommunityError) return error;
  const name = error instanceof DOMException ? error.name : "";
  if (name === "QuotaExceededError") {
    return new import_community_core2.CommunityError("INDEX_QUOTA", "The browser search index exceeded its storage quota", void 0, { cause: error });
  }
  if (name === "InvalidStateError" || name === "NoModificationAllowedError") {
    return new import_community_core2.CommunityError("INDEX_LOCKED", "The browser search index is locked by another tab", void 0, { cause: error });
  }
  return new import_community_core2.CommunityError("INDEX_STALE", "The browser search index is stale and must be rebuilt", void 0, { cause: error });
}

// packages/Epoch.Community.Web/src/search/sqlite-worker.ts
async function startSqliteWorker(scope, options) {
  const { default: initSqlite3 } = await Promise.resolve().then(() => (init_dist(), dist_exports));
  const sqlite3 = await initSqlite3();
  const raw = await openDatabase(sqlite3, options.storageMode, options.filename);
  const database = createSqliteStatementDatabase(raw);
  let health = await initializeSqliteIndex(database, { storageMode: options.storageMode });
  const cancelled = /* @__PURE__ */ new Set();
  scope.onmessage = (event) => {
    const message = event.data;
    if (!("operation" in message)) {
      cancelled.add(message.requestId);
      return;
    }
    void execute(message.requestId, message.operation).then(
      (value) => respond(scope, { requestId: message.requestId, ok: true, value }),
      (error) => {
        const typed = mapSqlitePersistenceError(error);
        respond(scope, { requestId: message.requestId, ok: false, error: { code: typed.code, message: typed.message } });
      }
    ).finally(() => cancelled.delete(message.requestId));
  };
  async function execute(requestId, operation) {
    assertNotCancelled(requestId, cancelled);
    switch (operation.type) {
      case "health":
        return health;
      case "apply":
        applyChangeSet(database, operation.changes, () => assertNotCancelled(requestId, cancelled));
        return void 0;
      case "replace":
        replaceEntities(database, operation.entities, () => assertNotCancelled(requestId, cancelled));
        return void 0;
      case "query": {
        const translated = translateSearchExpressionToSql(operation.expression, operation.allowedObjectIds);
        assertNotCancelled(requestId, cancelled);
        return database.rows(translated.sql, translated.parameters).map((row) => String(row.object_id));
      }
      case "export":
        return database.export?.() ?? new Uint8Array();
      case "reset":
        resetIndex(database);
        health = await initializeSqliteIndex(database, { storageMode: options.storageMode });
        return health;
      case "close":
        database.close();
        return void 0;
    }
  }
}
async function openDatabase(runtime, mode2, filename = "/epoch-community-search.sqlite3") {
  if (mode2 === "memory") return new runtime.oo1.DB(":memory:", "c");
  if (mode2 === "opfs-wl") {
    if (runtime.oo1.OpfsWlDb === void 0) throw new import_community_core3.CommunityError("QUERY_UNSUPPORTED_SOURCE", "SQLite OPFS-WL is unavailable");
    return new runtime.oo1.OpfsWlDb(filename, "c");
  }
  if (mode2 === "opfs-sahpool") {
    await runtime.installOpfsSAHPoolVfs?.({ name: "epoch-opfs-sahpool" });
    if (runtime.oo1.OpfsSAHPoolDb === void 0) throw new import_community_core3.CommunityError("QUERY_UNSUPPORTED_SOURCE", "SQLite OPFS SAH pool is unavailable");
    return new runtime.oo1.OpfsSAHPoolDb(filename, "c");
  }
  if (runtime.oo1.OpfsDb === void 0) throw new import_community_core3.CommunityError("QUERY_UNSUPPORTED_SOURCE", "SQLite OPFS is unavailable");
  return new runtime.oo1.OpfsDb(filename, "c");
}
function createSqliteStatementDatabase(raw) {
  return {
    value(sql, parameters = []) {
      if (raw.selectValue !== void 0) return parameters.length === 0 ? raw.selectValue(sql) : raw.selectValue(sql, parameters);
      return this.rows(sql, parameters)[0]?.value;
    },
    execute(sql, parameters = []) {
      raw.exec(parameters.length === 0 ? { sql } : { sql, bind: parameters });
    },
    rows(sql, parameters = []) {
      const rows = [];
      raw.exec(parameters.length === 0 ? { sql, rowMode: "object", returnValue: "resultRows", resultRows: rows } : { sql, bind: parameters, rowMode: "object", returnValue: "resultRows", resultRows: rows });
      return rows;
    },
    export: raw.export === void 0 ? void 0 : () => raw.export?.() ?? new Uint8Array(),
    close() {
      raw.close();
    }
  };
}
function replaceEntities(database, entities, cancelled) {
  database.execute("BEGIN IMMEDIATE");
  try {
    database.execute("DELETE FROM entity_fts");
    database.execute("DELETE FROM relation");
    database.execute("DELETE FROM entity_field");
    database.execute("DELETE FROM entity");
    for (const entity of entities) {
      cancelled();
      writeEntity(database, entity);
    }
    database.execute("COMMIT");
  } catch (error) {
    try {
      database.execute("ROLLBACK");
    } catch {
    }
    throw error;
  }
}
function applyChangeSet(database, changes, cancelled) {
  database.execute("BEGIN IMMEDIATE");
  try {
    for (const ref of changes.deletes) {
      cancelled();
      deleteEntity(database, ref.objectId);
    }
    for (const entity of changes.upserts) {
      cancelled();
      deleteEntity(database, entity.ref.objectId);
      writeEntity(database, entity);
    }
    database.execute("INSERT INTO source_checkpoint(source_id, token, observed_at, status, detail) VALUES (?, ?, ?, ?, ?) ON CONFLICT(source_id) DO UPDATE SET token=excluded.token, observed_at=excluded.observed_at, status=excluded.status, detail=excluded.detail", [
      changes.sourceId,
      changes.checkpoint.token,
      changes.checkpoint.observedAt,
      changes.checkpoint.status,
      changes.checkpoint.detail ?? null
    ]);
    database.execute("COMMIT");
  } catch (error) {
    try {
      database.execute("ROLLBACK");
    } catch {
    }
    throw error;
  }
}
function deleteEntity(database, objectId) {
  database.execute("DELETE FROM entity_fts WHERE object_id = ?", [objectId]);
  database.execute("DELETE FROM relation WHERE source_id = ? OR target_id = ?", [objectId, objectId]);
  database.execute("DELETE FROM entity WHERE object_id = ?", [objectId]);
}
function writeEntity(database, entity) {
  database.execute("INSERT INTO entity(object_id, kind, visibility, entity_json, updated_at) VALUES (?, ?, ?, ?, ?)", [
    entity.ref.objectId,
    entity.ref.kind,
    entity.visibility,
    JSON.stringify(entity),
    entity.updatedAt
  ]);
  for (const [field, raw] of Object.entries(entity.fields)) {
    const values = Array.isArray(raw) ? raw : [raw];
    values.forEach((value, ordinal) => {
      database.execute("INSERT INTO entity_field(object_id, field_name, ordinal, text_value, number_value, boolean_value, null_value) VALUES (?, ?, ?, ?, ?, ?, ?)", [
        entity.ref.objectId,
        field,
        ordinal,
        typeof value === "string" ? value : null,
        typeof value === "number" ? value : null,
        typeof value === "boolean" ? Number(value) : null,
        value === null ? 1 : null
      ]);
    });
  }
  for (const relation of entity.relations) database.execute(
    "INSERT OR IGNORE INTO relation(source_id, relation_type, target_id) VALUES (?, ?, ?)",
    [relation.source.objectId, relation.type, relation.target.objectId]
  );
  database.execute("INSERT INTO entity_fts(object_id, title, body, text) VALUES (?, ?, ?, ?)", [
    entity.ref.objectId,
    entity.searchableText.title ?? "",
    entity.searchableText.body ?? "",
    entity.searchableText.text ?? Object.values(entity.searchableText).join(" ")
  ]);
}
function resetIndex(database) {
  database.execute("BEGIN IMMEDIATE");
  try {
    database.execute("DROP TABLE IF EXISTS entity_fts");
    for (const table of ["relation", "entity_field", "entity", "source_checkpoint", "projection_definition", "namespace_mount", "query_history", "index_metadata"]) {
      database.execute(`DROP TABLE IF EXISTS ${table}`);
    }
    database.execute("PRAGMA user_version = 0");
    database.execute("COMMIT");
  } catch (error) {
    try {
      database.execute("ROLLBACK");
    } catch {
    }
    throw error;
  }
}
function assertNotCancelled(requestId, cancelled) {
  if (cancelled.has(requestId)) throw abortError();
}
function respond(scope, response) {
  const transfers = response.value instanceof Uint8Array ? [response.value.buffer] : void 0;
  scope.postMessage(response, transfers);
}
function abortError() {
  return new DOMException("The SQLite search request was cancelled", "AbortError");
}

// packages/Epoch.Community.Web/src/search/sqlite-worker-entry.ts
var mode = new URL(self.location.href).searchParams.get("mode") ?? "memory";
var allowed = /* @__PURE__ */ new Set(["memory", "opfs", "opfs-wl", "opfs-sahpool"]);
if (!allowed.has(mode)) throw new Error("Unsupported Epoch SQLite Worker storage mode");
void startSqliteWorker(self, { storageMode: mode });
/*! Bundled license information:

@sqlite.org/sqlite-wasm/dist/index.mjs:
  (* @preserve
  **
  ** LICENSE for the sqlite3 WebAssembly/JavaScript APIs.
  **
  ** This bundle (typically released as sqlite3.js or sqlite3.mjs)
  ** is an amalgamation of JavaScript source code from two projects:
  **
  ** 1) https://emscripten.org: the Emscripten "glue code" is covered by
  **    the terms of the MIT license and University of Illinois/NCSA
  **    Open Source License, as described at:
  **
  **    https://emscripten.org/docs/introducing_emscripten/emscripten_license.html
  **
  ** 2) https://sqlite.org: all code and documentation labeled as being
  **    from this source are released under the same terms as the sqlite3
  **    C library:
  **
  ** 2022-10-16
  **
  ** The author disclaims copyright to this source code.  In place of a
  ** legal notice, here is a blessing:
  **
  ** *   May you do good and not evil.
  ** *   May you find forgiveness for yourself and forgive others.
  ** *   May you share freely, never taking more than you give.
  *)
  (* @preserve
  ** This code was built from sqlite3 version...
  **
  ** SQLITE_VERSION "3.53.0"
  ** SQLITE_VERSION_NUMBER 3053000
  ** SQLITE_SOURCE_ID "2026-04-09 11:41:38 4525003a53a7fc63ca75c59b22c79608659ca12f0131f52c18637f829977f20b"
  **
  ** Emscripten SDK: 5.0.5
  *)
*/
