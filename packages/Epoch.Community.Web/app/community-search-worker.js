/* Generated from packages/Epoch.Community.Web/src/search/orama-worker-entry.ts. Run npm run community-web:app:build. */
var __create = Object.create;
var __defProp = Object.defineProperty;
var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __getProtoOf = Object.getPrototypeOf;
var __hasOwnProp = Object.prototype.hasOwnProperty;
var __commonJS = (cb, mod) => function __require() {
  try {
    return mod || (0, cb[__getOwnPropNames(cb)[0]])((mod = { exports: {} }).exports, mod), mod.exports;
  } catch (e) {
    throw mod = 0, e;
  }
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
        const allowed = agent.principalKeyStatus === "active" && agent.grantStatus === "active" && agent.budget.allocated > agent.budget.consumed + agent.budget.expired;
        return { allowed, explanation: allowed ? `${agent.principalId} sponsored by ${agent.sponsorId}: active grant and budget available.` : `${agent.principalId} sponsored by ${agent.sponsorId}: ${agent.grantStatus} grant; budget cannot authorize new work.` };
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
    exports.isCommunityError = isCommunityError2;
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
    var CommunityError3 = class extends Error {
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
    exports.CommunityError = CommunityError3;
    function communityErrorHttpStatus(code) {
      return STATUS_BY_CODE[code];
    }
    function isCommunityError2(error) {
      return error instanceof CommunityError3 || typeof error === "object" && error !== null && error.name === "CommunityError" && typeof error.message === "string" && isCommunityErrorCode(error.code) && error.httpStatus === communityErrorHttpStatus(error.code);
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
          score: Object.values(value.reactions).reduce((sum, count3) => sum + Math.max(0, count3), 0)
        },
        has: [.../* @__PURE__ */ new Set([
          ...value.title === void 0 ? [] : ["subject", "title"],
          ...value.inReplyTo === void 0 ? [] : ["re", "reply", "parent"],
          ...Object.values(value.reactions ?? {}).some((count3) => count3 > 0) ? ["reaction", "reactions"] : [],
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
      if (reactions !== void 0 && Object.entries(reactions).some(([token, count3]) => token.length === 0 || !Number.isFinite(count3) || count3 < 0)) {
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
    var OBJECT_ID2 = /^[A-Za-z0-9][A-Za-z0-9._~-]{0,127}$/u;
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
          if (typeof value !== "string" || !OBJECT_ID2.test(value))
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
    function textMatches(candidate, query, mode) {
      const normalizedCandidate = normalizeText(candidate);
      const normalizedQuery = normalizeText(query);
      if (mode === "phrase")
        return normalizedCandidate.includes(normalizedQuery);
      const words = tokenize2(normalizedCandidate);
      return mode === "prefix" ? words.some((word) => word.startsWith(normalizedQuery)) : words.includes(normalizedQuery);
    }
    function normalizeText(value) {
      return value.normalize("NFKC").toLocaleLowerCase("en-US");
    }
    function tokenize2(value) {
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
        const failure2 = error instanceof QueryFailure ? error : new QueryFailure("QUERY_CONTEXT_INVALID", String(error));
        return invalid(failure2, "1970-01-01T00:00:00.000Z", fieldRegistryVersion);
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
        const failure2 = error instanceof QueryFailure ? error : new QueryFailure("QUERY_SYNTAX", error instanceof Error ? error.message : String(error));
        return invalid(failure2, resolvedAt, fieldRegistryVersion);
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
        this.tokens = tokenize2(input);
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
      text(field, raw, mode, token) {
        if (/[~?^]/u.test(raw) || /^\/.*\/$/u.test(raw))
          this.fail("QUERY_UNSUPPORTED_SYNTAX", "Regex, fuzzy, boost, and wildcard query syntax is not supported", token);
        const value = mode === "prefix" ? raw.slice(0, -1) : raw;
        if (mode === "prefix" && value.length < MIN_PREFIX_LENGTH)
          this.fail("QUERY_PREFIX_TOO_SHORT", `Prefix queries require at least ${MIN_PREFIX_LENGTH} characters`, token);
        if (raw.includes("*") && mode !== "prefix")
          this.fail("QUERY_UNSUPPORTED_SYNTAX", "Only one trailing prefix wildcard is supported", token);
        if (field !== void 0)
          return this.fieldValue(field, "eq", raw, mode === "phrase", token);
        return this.node({ kind: "text", fields: ["title", "body"], value: value.normalize("NFC"), mode, span: tokenSpan(this.input, token) });
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
    var __createBinding = exports && exports.__createBinding || (Object.create ? (function(o, m, k, k2) {
      if (k2 === void 0) k2 = k;
      var desc = Object.getOwnPropertyDescriptor(m, k);
      if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
        desc = { enumerable: true, get: function() {
          return m[k];
        } };
      }
      Object.defineProperty(o, k2, desc);
    }) : (function(o, m, k, k2) {
      if (k2 === void 0) k2 = k;
      o[k2] = m[k];
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
        abort2(signal);
        const candidates = this.#candidates(plan, signal);
        let start = 0;
        if (page.after !== void 0) {
          const cursor = await this.#cursor.decode(page.after, binding(plan));
          start = candidates.findIndex((candidate) => candidate.entity.ref.objectId === cursor.objectId && equalKeys(candidate.hit.sortKey, cursor.sortKey)) + 1;
          if (start === 0)
            start = candidates.length;
        }
        abort2(signal);
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
        return Object.freeze([...counts].map(([value, count3]) => ({ value, count: count3 })).sort((a, b) => b.count - a.count || a.value.localeCompare(b.value, "en")).slice(0, input.limit));
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
            abort2(signal);
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
    function abort2(signal) {
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
          const search3 = scalar(args[1]);
          if (!search3)
            throw new Error("replace search must not be empty");
          return first.split(search3).join(scalar(args[2]));
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
      track(mode, entries, anchor) {
        return new ProjectionDeltaState(mode, entries, anchor);
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
      constructor(mode, entries, anchor) {
        this.mode = mode;
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
        const count3 = left.entities.length - right.entities.length;
        if (count3 !== 0)
          return order === "count-ascending" ? count3 : -count3;
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

// packages/Epoch.Protocol/dist/capabilities.js
var require_capabilities = __commonJS({
  "packages/Epoch.Protocol/dist/capabilities.js"(exports) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    exports.PROTOCOL_CAPABILITIES = void 0;
    exports.PROTOCOL_CAPABILITIES = Object.freeze({
      schemaVersion: 1,
      identifiers: { randomBits: 256, encoding: "base32-lower-no-padding", injectableCsprng: true },
      transactions: {
        explicitParents: true,
        compareAndSwapHeads: true,
        atomicPublish: false,
        quarantineAtomicPublish: true,
        repositoryAppendRecovery: false,
        syncBatchAtomic: false,
        gitPromotionAtomic: false
      },
      changes: { stableLineage: true, multipleParents: true, fragmentKinds: ["add", "delete", "move", "copy", "text", "structured", "binary"] },
      merge: { dependencyClosure: true, durableConflicts: true, conservativeCommutation: true, squashProvenance: true },
      operations: { localOnly: true, concurrentHeads: true, undoRestore: true, secretRedaction: true },
      providers: { trusted: false, mayMutateCanonicalState: false },
      fidelity: { byteExactSplit: true, binarySemanticMerge: false },
      review: {
        changeBased: true,
        gitChangeIdTrailer: true,
        reviewRef: "refs/for/*",
        publishOptions: ["topic", "hashtag", "wip"],
        pullRequestBranches: false
      }
    });
  }
});

// packages/Epoch.Protocol/dist/errors.js
var require_errors2 = __commonJS({
  "packages/Epoch.Protocol/dist/errors.js"(exports) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    exports.ProtocolError = void 0;
    exports.fail = fail;
    var ProtocolError = class extends Error {
      code;
      details;
      name = "ProtocolError";
      constructor(code, message, details = {}) {
        super(message);
        this.code = code;
        this.details = details;
      }
    };
    exports.ProtocolError = ProtocolError;
    function fail(code, message, details = {}) {
      throw new ProtocolError(code, message, details);
    }
  }
});

// packages/Epoch.Protocol/dist/ids.js
var require_ids = __commonJS({
  "packages/Epoch.Protocol/dist/ids.js"(exports) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    exports.CANONICAL_ID_KINDS = void 0;
    exports.createCanonicalId = createCanonicalId;
    exports.parseCanonicalId = parseCanonicalId;
    exports.parseChangeId = parseChangeId;
    exports.assertRevisionId = assertRevisionId;
    var errors_1 = require_errors2();
    exports.CANONICAL_ID_KINDS = [
      "repo",
      "principal",
      "key",
      "change",
      "change-graph",
      "fragment",
      "review-bundle",
      "merge-plan",
      "conflict",
      "workspace",
      "operation",
      "grant",
      "budget",
      "projection",
      "mirror",
      "version",
      "session",
      "promise",
      // ADR-0043. A Space composes the kinds above; it never replaces one. Sandbox
      // and anchor get their own kinds so a turn can name where it ran and a
      // comment can name what it points at without either borrowing `workspace`.
      "space",
      "sandbox",
      "anchor",
      // ADR-0055 native channels: a channel is a signed gossip object, never a transport identity.
      "channel"
    ];
    var kindSet = new Set(exports.CANONICAL_ID_KINDS);
    var tokenPattern = /^[a-z2-7]{52}$/u;
    var eventIdPattern = /^[A-Za-z0-9][A-Za-z0-9._~-]{0,127}$/u;
    var alphabet = "abcdefghijklmnopqrstuvwxyz234567";
    function createCanonicalId(kind, random = platformRandom) {
      if (!kindSet.has(kind))
        (0, errors_1.fail)("invalid-id", `Unknown canonical ID kind: ${String(kind)}`);
      const bytes = random(32);
      if (bytes.byteLength !== 32)
        (0, errors_1.fail)("invalid-id", "Canonical IDs require exactly 256 bits of randomness");
      return `epoch:${kind}:${base32(bytes)}`;
    }
    function parseCanonicalId(value, expectedKind) {
      if (typeof value !== "string" || value.length > 96 || [...value].some((character) => character.codePointAt(0) > 127)) {
        return (0, errors_1.fail)("invalid-id", "Canonical ID must be bounded ASCII");
      }
      const parts = value.split(":");
      const kind = parts[1];
      const token = parts[2];
      if (parts.length !== 3 || parts[0] !== "epoch" || kind === void 0 || !kindSet.has(kind) || expectedKind !== void 0 && kind !== expectedKind || token === void 0 || !tokenPattern.test(token)) {
        return (0, errors_1.fail)("invalid-id", `Invalid canonical ID: ${value}`);
      }
      return { kind, token };
    }
    function parseChangeId(value) {
      const parsed = parseCanonicalId(value, "change");
      return { kind: "change", token: parsed.token };
    }
    function assertRevisionId(value) {
      if (typeof value !== "string" || !eventIdPattern.test(value))
        (0, errors_1.fail)("invalid-ref", "RevisionId must be a signed EventId");
      return value;
    }
    function platformRandom(byteLength) {
      const crypto = globalThis.crypto;
      if (crypto === void 0 || typeof crypto.getRandomValues !== "function") {
        (0, errors_1.fail)("unsupported-capability", "This runtime has no cryptographic random source; inject a 256-bit CSPRNG");
      }
      return crypto.getRandomValues(new Uint8Array(byteLength));
    }
    function base32(bytes) {
      if (bytes.length !== 32)
        (0, errors_1.fail)("invalid-id", "Canonical IDs require exactly 256 bits of randomness");
      let bits = 0;
      let buffer = 0;
      let result = "";
      for (const byte of bytes) {
        buffer = buffer << 8 | byte;
        bits += 8;
        while (bits >= 5) {
          bits -= 5;
          result += alphabet[buffer >>> bits & 31];
          buffer &= (1 << bits) - 1;
        }
      }
      if (bits > 0)
        result += alphabet[buffer << 5 - bits & 31];
      return result;
    }
  }
});

// packages/Epoch.Protocol/dist/events.js
var require_events = __commonJS({
  "packages/Epoch.Protocol/dist/events.js"(exports) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    exports.PROTOCOL_EVENT_SCHEMAS = void 0;
    exports.assertProtocolEvent = assertProtocolEvent;
    var errors_1 = require_errors2();
    var ids_1 = require_ids();
    exports.PROTOCOL_EVENT_SCHEMAS = [
      "repository.identity",
      "change.created",
      "change.revised",
      "change.superseded",
      "change.dependency.added",
      "change.dependency.removed",
      "change-graph.defined",
      "change-graph.revised",
      "split.accepted",
      "review.bundle.created",
      "review.bundle.revised",
      "review.recorded",
      "merge.plan.created",
      "merge.plan.gate-recorded",
      "merge.plan.applied",
      "conflict.recorded",
      "conflict.resolution.proposed",
      "conflict.resolution.accepted",
      "conflict.resolution.rejected",
      "agent.membership.granted",
      "agent.membership.revoked",
      "agent.capability.granted",
      "agent.capability.revoked",
      "agent.budget.allocated",
      "agent.budget.reserved",
      "agent.budget.consumed",
      "agent.budget.released",
      "projection.recorded",
      "mirror.defined",
      "mirror.checkpoint",
      "mirror.run",
      "object.promise.recorded",
      "software-heritage.mapping",
      "software-heritage.archive-requested",
      "software-heritage.archive-status",
      "space.created",
      "space.participant.joined",
      "space.participant.left",
      "space.workspace.bound",
      "space.turn.recorded",
      "space.budget.allocated",
      "space.capture.opened",
      "space.capture.closed",
      "space.capture.operation",
      "space.anchor.recorded",
      "space.turn.receipt",
      "channel.create",
      "channel.message",
      "channel.presence",
      "channel.read"
    ];
    var typeSet = new Set(exports.PROTOCOL_EVENT_SCHEMAS);
    var digestPattern = /^[a-f0-9]{64}$/u;
    var safePathSegment = /^(?!\.\.?$)[^/\\\0]+$/u;
    function assertProtocolEvent(value) {
      const event = record(value, "event");
      exact(event, ["schemaVersion", "type", "eventId", "revisionId", "body"], "event");
      if (event.schemaVersion !== 1)
        (0, errors_1.fail)("invalid-schema", "Unsupported protocol schemaVersion");
      if (typeof event.type !== "string" || !typeSet.has(event.type))
        (0, errors_1.fail)("invalid-schema", `Unknown protocol event type: ${String(event.type)}`);
      const eventId = (0, ids_1.assertRevisionId)(event.eventId);
      const revisionId = (0, ids_1.assertRevisionId)(event.revisionId);
      if (revisionId !== eventId)
        (0, errors_1.fail)("invalid-schema", "RevisionId must equal the signed EventId");
      validateBody(event.type, event.body);
      return value;
    }
    function validateBody(type, value) {
      switch (type) {
        case "change.created":
        case "change.revised":
          validateChangeRevision(value);
          return;
        case "change-graph.defined":
        case "change-graph.revised":
          validateChangeGraph(value);
          return;
        case "split.accepted":
          validateSplit(value);
          return;
        case "review.bundle.created":
        case "review.bundle.revised":
          validateReviewBundle(value);
          return;
        case "merge.plan.created":
          validateMergePlan(value);
          return;
        case "conflict.recorded":
          validateConflict(value);
          return;
        case "repository.identity":
          validateFields(value, {
            required: ["repositoryId", "principalId"],
            ids: { repositoryId: "repo", principalId: "principal" },
            optional: ["keyId"],
            optionalIds: { keyId: "key" }
          });
          return;
        case "change.superseded":
          validateFields(value, {
            required: ["changeId", "supersededRevisionId", "byRevisionId"],
            ids: { changeId: "change" },
            revisions: ["supersededRevisionId", "byRevisionId"]
          });
          return;
        case "change.dependency.added":
        case "change.dependency.removed":
          validateFields(value, {
            required: ["changeRevisionId", "dependencyRevisionId"],
            revisions: ["changeRevisionId", "dependencyRevisionId"]
          });
          return;
        case "review.recorded":
          validateFields(value, {
            required: ["reviewBundleId", "bundleRevisionId", "reviewerPrincipalId", "verdict"],
            ids: { reviewBundleId: "review-bundle", reviewerPrincipalId: "principal" },
            revisions: ["bundleRevisionId"],
            enums: { verdict: ["approved", "changes-requested", "commented"] }
          });
          return;
        case "merge.plan.gate-recorded":
          validateFields(value, {
            required: ["mergePlanId", "gateDefinitionDigest", "status", "evidenceRevisionIds"],
            ids: { mergePlanId: "merge-plan" },
            digests: ["gateDefinitionDigest"],
            revisionArrays: ["evidenceRevisionIds"],
            enums: { status: ["passed", "failed"] }
          });
          return;
        case "merge.plan.applied":
          validateFields(value, {
            required: ["mergePlanId", "targetRevisionId", "resultRevisionId", "resultTreeDigest", "mergeMode", "sourceRevisionIds"],
            ids: { mergePlanId: "merge-plan" },
            revisions: ["targetRevisionId", "resultRevisionId"],
            digests: ["resultTreeDigest"],
            revisionArrays: ["sourceRevisionIds"],
            enums: { mergeMode: ["per-change-squash", "change-graph-squash"] }
          });
          return;
        case "conflict.resolution.proposed":
        case "conflict.resolution.accepted":
        case "conflict.resolution.rejected":
          validateFields(value, {
            required: ["conflictId", "resolutionRevisionId", "principalId"],
            ids: { conflictId: "conflict", principalId: "principal" },
            revisions: ["resolutionRevisionId"]
          });
          return;
        case "agent.membership.granted":
        case "agent.membership.revoked":
          validateFields(value, {
            required: ["workspaceId", "principalId", "grantId"],
            ids: { workspaceId: "workspace", principalId: "principal", grantId: "grant" }
          });
          return;
        case "agent.capability.granted":
        case "agent.capability.revoked":
          validateFields(value, {
            required: ["grantId", "principalId", "capability"],
            ids: { grantId: "grant", principalId: "principal" },
            strings: ["capability"]
          });
          return;
        case "agent.budget.allocated":
        case "agent.budget.reserved":
        case "agent.budget.consumed":
        case "agent.budget.released":
          validateFields(value, {
            required: ["budgetId", "principalId", "units"],
            ids: { budgetId: "budget", principalId: "principal" },
            nonnegativeIntegers: ["units"]
          });
          return;
        case "projection.recorded":
          validateFields(value, {
            required: ["projectionId", "repositoryId", "definitionDigest"],
            ids: { projectionId: "projection", repositoryId: "repo" },
            digests: ["definitionDigest"]
          });
          return;
        case "mirror.defined":
        case "mirror.checkpoint":
        case "mirror.run":
          validateFields(value, {
            required: ["mirrorId", "repositoryId", "remoteRef", "frontier"],
            ids: { mirrorId: "mirror", repositoryId: "repo" },
            strings: ["remoteRef"],
            revisionArrays: ["frontier"]
          });
          return;
        case "object.promise.recorded":
          validateFields(value, {
            required: ["promiseId", "contentDigest", "status"],
            ids: { promiseId: "promise" },
            digests: ["contentDigest"],
            enums: { status: ["pending", "fulfilled", "rejected"] }
          });
          return;
        case "software-heritage.mapping":
          validateFields(value, {
            required: ["repositoryId", "swhId", "frontier"],
            ids: { repositoryId: "repo" },
            strings: ["swhId"],
            revisionArrays: ["frontier"]
          });
          return;
        case "software-heritage.archive-requested":
        case "software-heritage.archive-status":
          validateFields(value, {
            required: ["repositoryId", "versionId", "requestId", "status"],
            ids: { repositoryId: "repo", versionId: "version" },
            strings: ["requestId"],
            enums: { status: ["requested", "pending", "succeeded", "failed", "cancelled"] }
          });
          return;
        case "space.created":
          validateFields(value, {
            required: ["spaceId", "repositoryId", "ownerPrincipalId", "viewName", "title"],
            ids: { spaceId: "space", repositoryId: "repo", ownerPrincipalId: "principal" },
            strings: ["viewName", "title"]
          });
          return;
        // Joining is receiving a grant, not an ACL row: the grant ID is required so
        // membership and authority cannot drift apart (ADR-0034, ADR-0043).
        case "space.participant.joined":
          validateFields(value, {
            required: ["spaceId", "principalId", "grantId", "role"],
            ids: { spaceId: "space", principalId: "principal", grantId: "grant" },
            enums: { role: ["owner", "collaborator", "agent", "observer"] }
          });
          return;
        case "space.participant.left":
          validateFields(value, {
            required: ["spaceId", "principalId", "grantId"],
            ids: { spaceId: "space", principalId: "principal", grantId: "grant" }
          });
          return;
        // The Space reports nothing about materialization on a provider's behalf;
        // it records what that provider truthfully declared (ADR-0032).
        case "space.workspace.bound":
          validateFields(value, {
            required: ["spaceId", "principalId", "workspaceId", "providerId", "storageMode", "residency", "materialization", "execution"],
            ids: { spaceId: "space", principalId: "principal", workspaceId: "workspace" },
            strings: ["providerId", "storageMode"],
            enums: {
              residency: ["resident", "partial", "virtual"],
              materialization: ["materialized", "virtual"],
              execution: ["disabled", "in-process", "isolated"]
            }
          });
          return;
        case "space.turn.recorded":
          validateFields(value, {
            required: ["spaceId", "principalId", "grantId", "execution", "requestDigest"],
            optional: ["sandboxId", "budgetId", "units"],
            ids: { spaceId: "space", principalId: "principal", grantId: "grant" },
            optionalIds: { sandboxId: "sandbox", budgetId: "budget" },
            digests: ["requestDigest"],
            optionalNonnegativeIntegers: ["units"],
            enums: { execution: ["disabled", "in-process", "isolated"] }
          });
          return;
        // Budgets bind to the Space that allocated them. Without the spaceId an
        // allocation made in one Space would be spendable in another.
        case "space.budget.allocated":
          validateFields(value, {
            required: ["spaceId", "budgetId", "principalId", "units"],
            ids: { spaceId: "space", budgetId: "budget", principalId: "principal" },
            nonnegativeIntegers: ["units"]
          });
          return;
        case "space.capture.opened":
          validateFields(value, {
            required: ["spaceId", "sessionId", "principalId", "scope", "retention", "redaction"],
            ids: { spaceId: "space", sessionId: "session", principalId: "principal" },
            strings: ["scope", "retention"],
            enums: { redaction: ["none", "declared-secrets", "full"] }
          });
          return;
        case "space.capture.closed":
          validateFields(value, {
            required: ["spaceId", "sessionId", "principalId", "operationCount"],
            ids: { spaceId: "space", sessionId: "session", principalId: "principal" },
            nonnegativeIntegers: ["operationCount"]
          });
          return;
        case "space.capture.operation":
          validateFields(value, {
            required: ["spaceId", "sessionId", "principalId", "path", "contentDigest"],
            ids: { spaceId: "space", sessionId: "session", principalId: "principal" },
            paths: ["path"],
            digests: ["contentDigest"]
          });
          return;
        // Anchors bind to a structural path inside an exact Revision, so they
        // re-resolve after reformatting rather than naming a byte offset.
        // A receipt is the evidence half of a turn: what actually ran, under which
        // proven confinement, and what it cost (ADR-0034, ADR-0043 phase 5).
        case "space.turn.receipt":
          validateFields(value, {
            required: ["spaceId", "principalId", "turnRevisionId", "sandboxId", "isolation", "network", "outcome"],
            optional: ["exitCode", "durationMs"],
            ids: { spaceId: "space", principalId: "principal", sandboxId: "sandbox" },
            revisions: ["turnRevisionId"],
            optionalNonnegativeIntegers: ["durationMs"],
            enums: {
              isolation: ["none", "process", "namespace"],
              network: ["inherited", "denied"],
              outcome: ["succeeded", "failed", "timed-out", "refused"]
            }
          });
          return;
        case "space.anchor.recorded":
          validateFields(value, {
            required: ["spaceId", "anchorId", "principalId", "revisionId", "path", "structuralPath", "contentDigest"],
            ids: { spaceId: "space", anchorId: "anchor", principalId: "principal" },
            revisions: ["revisionId"],
            paths: ["path"],
            strings: ["structuralPath"],
            digests: ["contentDigest"]
          });
          return;
        case "channel.create":
          validateFields(value, {
            required: ["schema", "channelId", "communityId", "name", "principalId", "visibility"],
            ids: { channelId: "channel", communityId: "space", principalId: "principal" },
            strings: ["name"],
            enums: { schema: ["epoch.channel/v1"], visibility: ["public", "shared", "private"] }
          });
          return;
        case "channel.message":
          validateFields(value, {
            required: ["schema", "channelId", "messageId", "principalId", "bodyDigest", "visibility"],
            ids: { channelId: "channel", principalId: "principal" },
            revisions: ["messageId"],
            digests: ["bodyDigest"],
            enums: { schema: ["epoch.channel/v1"], visibility: ["public", "shared", "private"] }
          });
          return;
        case "channel.presence":
          validateFields(value, {
            required: ["schema", "channelId", "principalId", "state"],
            ids: { channelId: "channel", principalId: "principal" },
            enums: { schema: ["epoch.channel/v1"], state: ["active", "idle", "away"] }
          });
          return;
        case "channel.read":
          validateFields(value, {
            required: ["schema", "channelId", "principalId", "watermarkEventId"],
            ids: { channelId: "channel", principalId: "principal" },
            revisions: ["watermarkEventId"],
            enums: { schema: ["epoch.channel/v1"] }
          });
          return;
      }
    }
    function validateChangeRevision(value) {
      const body = record(value, "change revision");
      exact(body, ["changeId", "baseFrontier", "baseTreeDigest", "parentRevisionIds", "fragments", "resultingTreeDigest", "authorPrincipalId"], "change revision");
      (0, ids_1.parseCanonicalId)(body.changeId, "change");
      revisions(body.baseFrontier, "baseFrontier");
      digest(body.baseTreeDigest, "baseTreeDigest");
      revisions(body.parentRevisionIds, "parentRevisionIds");
      if (!Array.isArray(body.fragments) || body.fragments.length === 0)
        (0, errors_1.fail)("invalid-schema", "Change revision requires fragments");
      const ids = /* @__PURE__ */ new Set();
      for (const fragment of body.fragments) {
        validateFragment(fragment);
        const id = fragment.fragmentId;
        if (ids.has(id))
          (0, errors_1.fail)("invalid-schema", `Duplicate fragment ID: ${id}`);
        ids.add(id);
      }
      digest(body.resultingTreeDigest, "resultingTreeDigest");
      (0, ids_1.parseCanonicalId)(body.authorPrincipalId, "principal");
    }
    function validateFragment(value) {
      const fragment = record(value, "fragment");
      exact(fragment, ["fragmentId", "kind", "path", "from", "precondition", "resultDigest", "contentRef", "order", "dependencies", "provenance", "mergeStrategy"], "fragment", true);
      (0, ids_1.parseCanonicalId)(fragment.fragmentId, "fragment");
      if (!["add", "delete", "move", "copy", "text", "structured", "binary"].includes(String(fragment.kind)))
        (0, errors_1.fail)("invalid-schema", "Unknown fragment kind");
      path(fragment.path);
      if (["move", "copy"].includes(String(fragment.kind))) {
        const from = record(fragment.from, "fragment source");
        exact(from, ["path", "digest"], "fragment source", true);
        path(from.path);
        if (from.digest !== void 0)
          digest(from.digest, "source digest");
      } else if (fragment.from !== void 0)
        (0, errors_1.fail)("invalid-schema", "Only move/copy fragments may carry from");
      const precondition = record(fragment.precondition, "fragment precondition");
      exact(precondition, ["kind", "digest"], "fragment precondition", true);
      if (precondition.kind === "absent") {
        if (precondition.digest !== void 0)
          (0, errors_1.fail)("invalid-schema", "Absent precondition cannot carry digest");
      } else if (precondition.kind === "digest")
        digest(precondition.digest, "precondition digest");
      else
        (0, errors_1.fail)("invalid-schema", "Unknown fragment precondition");
      digest(fragment.resultDigest, "resultDigest");
      if (fragment.contentRef !== void 0 && (typeof fragment.contentRef !== "string" || !/^(sha256:[a-f0-9]{64}|swh:[A-Za-z0-9:._~-]+|promise:epoch:promise:[a-z2-7]{52})$/u.test(fragment.contentRef)))
        (0, errors_1.fail)("invalid-ref", "Invalid fragment content reference");
      if (!Number.isInteger(fragment.order) || Number(fragment.order) < 0)
        (0, errors_1.fail)("invalid-schema", "Fragment order must be nonnegative integer");
      canonicalIds(fragment.dependencies, "fragment", "fragment dependencies");
      const provenance = record(fragment.provenance, "fragment provenance");
      exact(provenance, ["principalId", "sourceRevisionId"], "fragment provenance", true);
      (0, ids_1.parseCanonicalId)(provenance.principalId, "principal");
      if (provenance.sourceRevisionId !== void 0)
        (0, ids_1.assertRevisionId)(provenance.sourceRevisionId);
      if (!["exact", "text", "structured", "binary-replace"].includes(String(fragment.mergeStrategy)))
        (0, errors_1.fail)("invalid-schema", "Unknown fragment merge strategy");
    }
    function validateChangeGraph(value) {
      const body = record(value, "change graph");
      exact(body, ["changeGraphId", "memberRevisionIds", "edges"], "change graph");
      (0, ids_1.parseCanonicalId)(body.changeGraphId, "change-graph");
      const members = revisions(body.memberRevisionIds, "change graph revisions");
      if (!Array.isArray(body.edges))
        (0, errors_1.fail)("invalid-schema", "Change graph edges must be an array");
      for (const edgeValue of body.edges) {
        const edge = record(edgeValue, "change graph edge");
        exact(edge, ["from", "to", "kind"], "change graph edge");
        (0, ids_1.assertRevisionId)(edge.from);
        (0, ids_1.assertRevisionId)(edge.to);
        if (!members.has(String(edge.from)) || !members.has(String(edge.to)))
          (0, errors_1.fail)("invalid-ref", "Change graph edge must reference exact member revisions");
        if (!["requires", "orders-after", "conflicts-with", "derived-from"].includes(String(edge.kind)))
          (0, errors_1.fail)("invalid-schema", "Unknown change graph edge kind");
      }
    }
    function validateSplit(value) {
      const body = record(value, "split acceptance");
      exact(body, ["sourceRevisionId", "groups", "resultingRevisionIds", "reconstructionDigest"], "split acceptance");
      (0, ids_1.assertRevisionId)(body.sourceRevisionId);
      if (!Array.isArray(body.groups) || body.groups.length === 0)
        (0, errors_1.fail)("invalid-schema", "Split acceptance requires groups");
      for (const groupValue of body.groups) {
        const group = record(groupValue, "split group");
        exact(group, ["fragmentIds", "risk", "reason"], "split group");
        canonicalIds(group.fragmentIds, "fragment", "split fragments");
        if (!["low", "medium", "high", "ambiguous"].includes(String(group.risk)) || typeof group.reason !== "string")
          (0, errors_1.fail)("invalid-schema", "Invalid split risk");
      }
      revisions(body.resultingRevisionIds, "split results");
      digest(body.reconstructionDigest, "reconstructionDigest");
    }
    function validateReviewBundle(value) {
      const body = record(value, "review bundle");
      exact(body, ["reviewBundleId", "selectedRevisionIds", "baseFrontier", "baseTreeDigest", "combinedTreeDigest", "overlaps", "conflictIds", "gateDefinitionDigest"], "review bundle");
      (0, ids_1.parseCanonicalId)(body.reviewBundleId, "review-bundle");
      revisions(body.selectedRevisionIds, "selected review revisions");
      revisions(body.baseFrontier, "review base frontier");
      digest(body.baseTreeDigest, "review base digest");
      digest(body.combinedTreeDigest, "combined review tree digest");
      digest(body.gateDefinitionDigest, "review gate definition digest");
      canonicalIds(body.conflictIds, "conflict", "review conflicts");
      if (!Array.isArray(body.overlaps))
        (0, errors_1.fail)("invalid-schema", "Review overlaps must be an array");
      for (const overlapValue of body.overlaps) {
        const overlap = record(overlapValue, "review overlap");
        exact(overlap, ["left", "right"], "review overlap");
        (0, ids_1.parseCanonicalId)(overlap.left, "fragment");
        (0, ids_1.parseCanonicalId)(overlap.right, "fragment");
      }
    }
    function validateMergePlan(value) {
      const body = record(value, "merge plan");
      exact(body, ["mergePlanId", "targetRevisionId", "selectedRevisionIds", "hardDependencyClosure", "reviewBundleRevisionId", "conflictResolutionRevisionIds", "gateDefinitionDigest", "mergeMode", "resultingTreeDigest"], "merge plan");
      (0, ids_1.parseCanonicalId)(body.mergePlanId, "merge-plan");
      (0, ids_1.assertRevisionId)(body.targetRevisionId);
      revisions(body.selectedRevisionIds, "selected merge revisions");
      revisions(body.hardDependencyClosure, "hard dependency closure");
      (0, ids_1.assertRevisionId)(body.reviewBundleRevisionId);
      revisions(body.conflictResolutionRevisionIds, "conflict resolutions");
      digest(body.gateDefinitionDigest, "merge gate definition digest");
      digest(body.resultingTreeDigest, "merge result digest");
      if (!["per-change-squash", "change-graph-squash"].includes(String(body.mergeMode)))
        (0, errors_1.fail)("invalid-schema", "Unknown merge mode");
    }
    function validateConflict(value) {
      const body = record(value, "conflict");
      exact(body, ["conflictId", "sideRevisionIds", "status", "resolutionRevisionIds"], "conflict");
      (0, ids_1.parseCanonicalId)(body.conflictId, "conflict");
      if (revisions(body.sideRevisionIds, "conflict sides").size < 2)
        (0, errors_1.fail)("invalid-schema", "Conflict requires at least two sides");
      if (!["unresolved", "proposed", "accepted", "rejected"].includes(String(body.status)))
        (0, errors_1.fail)("invalid-schema", "Unknown conflict status");
      revisions(body.resolutionRevisionIds, "conflict resolutions");
    }
    function validateFields(value, rules) {
      const body = record(value, "event body");
      exact(body, [...rules.required, ...rules.optional ?? []], "event body", true);
      for (const field of rules.required)
        if (!(field in body))
          (0, errors_1.fail)("invalid-schema", `Missing event body field: ${field}`);
      for (const [field, kind] of Object.entries(rules.ids ?? {}))
        (0, ids_1.parseCanonicalId)(body[field], kind);
      for (const [field, kind] of Object.entries(rules.optionalIds ?? {}))
        if (body[field] !== void 0)
          (0, ids_1.parseCanonicalId)(body[field], kind);
      for (const field of rules.revisions ?? [])
        (0, ids_1.assertRevisionId)(body[field]);
      for (const field of rules.revisionArrays ?? [])
        revisions(body[field], field);
      for (const field of rules.digests ?? [])
        digest(body[field], field);
      for (const field of rules.strings ?? [])
        if (typeof body[field] !== "string" || body[field] === "")
          (0, errors_1.fail)("invalid-schema", `${field} must be non-empty string`);
      for (const field of rules.paths ?? [])
        path(body[field]);
      for (const field of rules.nonnegativeIntegers ?? [])
        if (!Number.isSafeInteger(body[field]) || Number(body[field]) < 0)
          (0, errors_1.fail)("invalid-schema", `${field} must be nonnegative integer`);
      for (const field of rules.optionalNonnegativeIntegers ?? []) {
        if (body[field] !== void 0 && (!Number.isSafeInteger(body[field]) || Number(body[field]) < 0)) {
          (0, errors_1.fail)("invalid-schema", `${field} must be nonnegative integer`);
        }
      }
      for (const [field, allowed] of Object.entries(rules.enums ?? {}))
        if (!allowed.includes(String(body[field])))
          (0, errors_1.fail)("invalid-schema", `Unknown ${field} variant`);
    }
    function record(value, label) {
      if (typeof value !== "object" || value === null || Array.isArray(value))
        (0, errors_1.fail)("invalid-schema", `${label} must be an object`);
      return value;
    }
    function exact(value, fields, label, optional = false) {
      const allowed = new Set(fields);
      for (const key of Object.keys(value))
        if (!allowed.has(key))
          (0, errors_1.fail)("invalid-schema", `Unknown ${label} field: ${key}`);
      if (!optional) {
        for (const field of fields)
          if (!(field in value))
            (0, errors_1.fail)("invalid-schema", `Missing ${label} field: ${field}`);
      }
    }
    function revisions(value, label) {
      if (!Array.isArray(value))
        (0, errors_1.fail)("invalid-schema", `${label} must be an array`);
      const result = /* @__PURE__ */ new Set();
      for (const item of value) {
        const revision = (0, ids_1.assertRevisionId)(item);
        if (result.has(revision))
          (0, errors_1.fail)("invalid-schema", `Duplicate ${label}: ${revision}`);
        result.add(revision);
      }
      return result;
    }
    function canonicalIds(value, kind, label) {
      if (!Array.isArray(value))
        (0, errors_1.fail)("invalid-schema", `${label} must be an array`);
      const result = /* @__PURE__ */ new Set();
      for (const item of value) {
        (0, ids_1.parseCanonicalId)(item, kind);
        if (result.has(String(item)))
          (0, errors_1.fail)("invalid-schema", `Duplicate ${label}: ${String(item)}`);
        result.add(String(item));
      }
      return result;
    }
    function digest(value, label) {
      if (typeof value !== "string" || !digestPattern.test(value))
        (0, errors_1.fail)("invalid-ref", `${label} must be a lowercase SHA-256 digest`);
      return value;
    }
    function path(value) {
      if (typeof value !== "string" || value === "" || value.length > 4096 || value.startsWith("/") || value.split("/").some((segment) => !safePathSegment.test(segment)))
        (0, errors_1.fail)("invalid-path", "Fragment path must be normalized repository-relative path");
      return value;
    }
  }
});

// packages/Epoch.Protocol/dist/inspection.js
var require_inspection = __commonJS({
  "packages/Epoch.Protocol/dist/inspection.js"(exports) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    exports.inspectRevisionGraph = inspectRevisionGraph;
    exports.inspectCloneFilter = inspectCloneFilter;
    exports.inspectSyncContract = inspectSyncContract;
    exports.parseSwhid = parseSwhid;
    exports.inspectSwhid = inspectSwhid;
    exports.nodeOnlyAdapterStatus = nodeOnlyAdapterStatus;
    var errors_1 = require_errors2();
    function inspectRevisionGraph(nodes) {
      const byId = /* @__PURE__ */ new Map();
      for (const node of nodes) {
        if (!node.revisionId || byId.has(node.revisionId))
          (0, errors_1.fail)("invalid-schema", `Duplicate or empty revision: ${node.revisionId}`);
        byId.set(node.revisionId, node);
      }
      for (const node of nodes)
        for (const parent of node.parentRevisionIds)
          if (!byId.has(parent))
            (0, errors_1.fail)("missing-dependency", `Missing graph parent: ${parent}`);
      const visiting = /* @__PURE__ */ new Set();
      const visited = /* @__PURE__ */ new Set();
      const visit = (revisionId) => {
        if (visiting.has(revisionId))
          (0, errors_1.fail)("invalid-schema", `Revision graph cycle: ${revisionId}`);
        if (visited.has(revisionId))
          return;
        visiting.add(revisionId);
        for (const parent of byId.get(revisionId).parentRevisionIds)
          visit(parent);
        visiting.delete(revisionId);
        visited.add(revisionId);
      };
      for (const revisionId of [...byId.keys()].sort())
        visit(revisionId);
      const parents = new Set(nodes.flatMap((node) => [...node.parentRevisionIds]));
      return Object.freeze({
        valid: true,
        revisions: Object.freeze([...byId.keys()].sort()),
        heads: Object.freeze([...byId.keys()].filter((id) => !parents.has(id)).sort()),
        roots: Object.freeze(nodes.filter((node) => node.parentRevisionIds.length === 0).map((node) => node.revisionId).sort())
      });
    }
    function inspectCloneFilter(value) {
      if (typeof value !== "object" || value === null || Array.isArray(value))
        (0, errors_1.fail)("invalid-schema", "Filter must be an object");
      const input = value;
      const known = /* @__PURE__ */ new Set(["paths", "entityTypes", "maxBytes", "includePromises"]);
      for (const key of Object.keys(input))
        if (!known.has(key))
          (0, errors_1.fail)("invalid-schema", `Unknown filter field: ${key}`);
      const strings = (name) => {
        const item = input[name];
        if (item === void 0)
          return void 0;
        if (!Array.isArray(item) || item.some((entry) => typeof entry !== "string" || entry.length === 0 || entry.includes("\0"))) {
          return (0, errors_1.fail)("invalid-schema", `${name} must be bounded non-empty strings`);
        }
        return Object.freeze([...new Set(item)].sort());
      };
      const paths = strings("paths");
      const entityTypes = strings("entityTypes");
      if (input.maxBytes !== void 0 && (!Number.isSafeInteger(input.maxBytes) || input.maxBytes < 0))
        (0, errors_1.fail)("invalid-schema", "maxBytes must be a non-negative integer");
      if (input.includePromises !== void 0 && typeof input.includePromises !== "boolean")
        (0, errors_1.fail)("invalid-schema", "includePromises must be boolean");
      return Object.freeze({ valid: true, canonical: Object.freeze({ ...paths ? { paths } : {}, ...entityTypes ? { entityTypes } : {}, ...input.maxBytes === void 0 ? {} : { maxBytes: input.maxBytes }, ...input.includePromises === void 0 ? {} : { includePromises: input.includePromises } }) });
    }
    function inspectSyncContract(value) {
      if (typeof value !== "object" || value === null)
        (0, errors_1.fail)("invalid-schema", "Sync contract must be an object");
      const input = value;
      if (input.protocol !== "epoch.sync/v2")
        return { supported: false, code: "unsupported-capability", reason: `unsupported sync protocol: ${String(input.protocol)}` };
      if (!Array.isArray(input.commands) || !input.commands.every((command) => typeof command === "string"))
        (0, errors_1.fail)("invalid-schema", "Sync commands must be strings");
      return { supported: true, protocol: "epoch.sync/v2", code: "ok" };
    }
    var swhKinds = /* @__PURE__ */ new Set(["cnt", "dir", "rev", "rel", "snp"]);
    var swhQualifiers = /* @__PURE__ */ new Set(["origin", "visit", "anchor", "path", "lines"]);
    function parseSwhid(value) {
      if (typeof value !== "string" || value.length > 2048)
        (0, errors_1.fail)("invalid-id", "Invalid SWHID length");
      const [core, ...parts] = value.split(";");
      const fields = core.split(":");
      if (fields.length !== 4 || fields[0] !== "swh")
        (0, errors_1.fail)("invalid-id", "Invalid SWHID namespace or shape");
      if (fields[1] !== "1")
        (0, errors_1.fail)("invalid-id", "Unsupported SWHID version");
      const kind = fields[2];
      if (!swhKinds.has(kind))
        (0, errors_1.fail)("invalid-id", "Invalid SWHID object kind");
      const digest = fields[3];
      if (!/^[0-9a-f]{40}$/u.test(digest))
        (0, errors_1.fail)("invalid-id", "Invalid SWHID digest");
      const qualifiers = {};
      for (const part of parts) {
        const equals = part.indexOf("=");
        if (equals < 1)
          (0, errors_1.fail)("invalid-id", "Malformed SWHID qualifier");
        const key = part.slice(0, equals);
        if (!swhQualifiers.has(key) || qualifiers[key] !== void 0)
          (0, errors_1.fail)("invalid-id", "Unsupported or duplicate SWHID qualifier");
        try {
          qualifiers[key] = decodeURIComponent(part.slice(equals + 1));
        } catch {
          (0, errors_1.fail)("invalid-id", "Malformed SWHID qualifier encoding");
        }
      }
      return Object.freeze({
        version: 1,
        kind,
        digest,
        qualifiers: Object.freeze(Object.fromEntries(Object.entries(qualifiers).sort(([left], [right]) => left.localeCompare(right))))
      });
    }
    function inspectSwhid(value) {
      const parsed = parseSwhid(value);
      return Object.freeze({ namespace: "swh", version: 1, objectType: parsed.kind, objectId: parsed.digest, qualifiers: parsed.qualifiers });
    }
    function nodeOnlyAdapterStatus(adapter) {
      return Object.freeze({ code: "unsupported-capability", adapter, reason: `${adapter} requires a Node.js host adapter` });
    }
  }
});

// packages/Epoch.Protocol/dist/models.js
var require_models = __commonJS({
  "packages/Epoch.Protocol/dist/models.js"(exports) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
  }
});

// packages/Epoch.Protocol/dist/posture.js
var require_posture = __commonJS({
  "packages/Epoch.Protocol/dist/posture.js"(exports) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    exports.DENIED_POSTURE_POLICY = exports.OPEN_POSTURE_DEFAULTS = exports.TRUST_POSTURES = void 0;
    exports.evaluatePosture = evaluatePosture;
    var errors_1 = require_errors2();
    exports.TRUST_POSTURES = Object.freeze(["hosted", "private", "open"]);
    exports.OPEN_POSTURE_DEFAULTS = Object.freeze({
      posture: "open",
      allowServiceDiscovery: false,
      allowCrossCommunityFabric: false,
      publicArtifactPlane: "atproto",
      interNodeTransport: "gossip",
      serverTrackedReadState: false
    });
    exports.DENIED_POSTURE_POLICY = Object.freeze({
      posture: "open",
      allowServiceDiscovery: false,
      allowCrossCommunityFabric: false,
      publicArtifactPlane: "none",
      interNodeTransport: "none",
      serverTrackedReadState: false
    });
    var POSTURE_SET = new Set(exports.TRUST_POSTURES);
    function evaluatePosture(config) {
      if (config === void 0 || config === null) {
        return { ...exports.OPEN_POSTURE_DEFAULTS };
      }
      if (typeof config !== "object" || Array.isArray(config)) {
        (0, errors_1.fail)("policy-denied", "Malformed trust posture config");
      }
      const row = flattenPostureConfig(config);
      if (row === void 0) {
        return { ...exports.OPEN_POSTURE_DEFAULTS };
      }
      const postureRaw = firstString(row, ["posture", "trust_posture", "trustPosture"]);
      if (postureRaw === void 0) {
        (0, errors_1.fail)("policy-denied", "Unknown trust posture: (missing)");
      }
      if (!POSTURE_SET.has(postureRaw)) {
        (0, errors_1.fail)("policy-denied", `Unknown trust posture: ${postureRaw}`);
      }
      const posture = postureRaw;
      const allowServiceDiscovery = optionalBoolean(row, ["allowServiceDiscovery", "allow_service_discovery"]);
      const allowCrossCommunityFabric = optionalBoolean(row, ["allowCrossCommunityFabric", "allow_cross_community_fabric"]);
      const serverTrackedReadState = optionalBoolean(row, ["serverTrackedReadState", "server_tracked_read_state"]);
      const publicArtifactPlane = optionalEnum(row, ["publicArtifactPlane", "public_artifact_plane"], ["atproto", "none"]);
      const interNodeTransport = optionalEnum(row, ["interNodeTransport", "inter_node_transport"], ["xmpp-s2s", "gossip", "none"]);
      const allowlist = optionalStringArray(row, ["s2sAllowlist", "s2s_allowlist"]);
      if (allowCrossCommunityFabric === true) {
        (0, errors_1.fail)("policy-denied", "cross-community fabric is never allowed");
      }
      if (posture === "open" && allowServiceDiscovery === true) {
        (0, errors_1.fail)("policy-denied", "open posture cannot enable service discovery");
      }
      if (interNodeTransport === "xmpp-s2s" && (allowlist === void 0 || allowlist.length === 0) && posture === "open") {
        (0, errors_1.fail)("policy-denied", "open xmpp-s2s requires an explicit s2s allowlist");
      }
      if (posture === "hosted") {
        return {
          posture,
          allowServiceDiscovery: allowServiceDiscovery ?? true,
          allowCrossCommunityFabric: false,
          publicArtifactPlane: publicArtifactPlane ?? "atproto",
          interNodeTransport: interNodeTransport ?? "none",
          serverTrackedReadState: serverTrackedReadState ?? true
        };
      }
      if (posture === "private") {
        return {
          posture,
          allowServiceDiscovery: allowServiceDiscovery ?? true,
          allowCrossCommunityFabric: false,
          publicArtifactPlane: publicArtifactPlane ?? "none",
          interNodeTransport: interNodeTransport ?? "none",
          serverTrackedReadState: serverTrackedReadState ?? true
        };
      }
      return {
        posture: "open",
        allowServiceDiscovery: false,
        allowCrossCommunityFabric: false,
        publicArtifactPlane: publicArtifactPlane ?? "atproto",
        interNodeTransport: interNodeTransport ?? "gossip",
        serverTrackedReadState: serverTrackedReadState ?? false
      };
    }
    function flattenPostureConfig(config) {
      const community = config.community;
      if (isRecord(community) && isRecord(community.posture)) {
        return community.posture;
      }
      if (isRecord(config.posture) && typeof config.posture.posture === "string") {
        return config.posture;
      }
      if (typeof config.posture === "string" || typeof config.trust_posture === "string" || typeof config.trustPosture === "string") {
        return config;
      }
      if (Object.keys(config).length === 0)
        return void 0;
      if (isRecord(community) && Object.keys(community).length === 0)
        return void 0;
      if ("posture" in config || "trust_posture" in config || "trustPosture" in config)
        return config;
      return void 0;
    }
    function isRecord(value) {
      return value !== null && typeof value === "object" && !Array.isArray(value);
    }
    function firstString(row, keys) {
      for (const key of keys) {
        const value = row[key];
        if (typeof value === "string")
          return value;
      }
      return void 0;
    }
    function optionalBoolean(row, keys) {
      for (const key of keys) {
        const value = row[key];
        if (value === void 0)
          continue;
        if (typeof value === "boolean")
          return value;
        (0, errors_1.fail)("policy-denied", `Malformed posture boolean: ${key}`);
      }
      return void 0;
    }
    function optionalEnum(row, keys, allowed) {
      for (const key of keys) {
        const value = row[key];
        if (value === void 0)
          continue;
        if (typeof value === "string" && allowed.includes(value))
          return value;
        (0, errors_1.fail)("policy-denied", `Unknown posture enum: ${key}=${String(value)}`);
      }
      return void 0;
    }
    function optionalStringArray(row, keys) {
      for (const key of keys) {
        const value = row[key];
        if (value === void 0)
          continue;
        if (!Array.isArray(value) || value.some((item) => typeof item !== "string" || item.length === 0)) {
          (0, errors_1.fail)("policy-denied", `Malformed posture allowlist: ${key}`);
        }
        return value;
      }
      return void 0;
    }
  }
});

// packages/Epoch.Protocol/dist/revset.js
var require_revset = __commonJS({
  "packages/Epoch.Protocol/dist/revset.js"(exports) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    exports.RevsetParseError = void 0;
    exports.parseRevset = parseRevset;
    exports.evaluateRevset = evaluateRevset;
    var RevsetParseError = class extends Error {
      offset;
      name = "RevsetParseError";
      code = "invalid-revset";
      constructor(message, offset) {
        super(`${message} at offset ${offset}`);
        this.offset = offset;
      }
    };
    exports.RevsetParseError = RevsetParseError;
    var functions = /* @__PURE__ */ new Set(["heads", "roots", "ancestors", "descendants", "change", "graph", "conflicts", "pending", "approved", "mergeable", "author"]);
    function tokenize2(input) {
      if (input.length > 4096)
        throw new RevsetParseError("revset exceeds 4096 characters", 4096);
      const tokens = [];
      for (let index = 0; index < input.length; ) {
        const character = input[index];
        if (/\s/u.test(character)) {
          index += 1;
          continue;
        }
        if (["(", ")", "|", "&", "-"].includes(character)) {
          tokens.push({ type: character, value: character, offset: index++ });
          continue;
        }
        const start = index;
        while (index < input.length && !/[\s()|&]/u.test(input[index]))
          index += 1;
        tokens.push({ type: "word", value: input.slice(start, index), offset: start });
      }
      tokens.push({ type: "eof", value: "", offset: input.length });
      return tokens;
    }
    function parseRevset(input) {
      const tokens = tokenize2(input);
      let cursor = 0;
      const current = () => tokens[cursor];
      const take = (type) => {
        const token = current();
        if (token.type !== type)
          throw new RevsetParseError(`expected ${type}`, token.offset);
        cursor += 1;
        return token;
      };
      function primary() {
        if (current().type === "(") {
          take("(");
          const expression2 = union();
          take(")");
          return expression2;
        }
        const nameToken = take("word");
        if (!functions.has(nameToken.value))
          throw new RevsetParseError(`unknown revset function ${nameToken.value}`, nameToken.offset);
        const name = nameToken.value;
        take("(");
        if (current().type === ")") {
          take(")");
          return { type: "call", name };
        }
        const nested = current().type === "word" && tokens[cursor + 1]?.type !== "(" ? take("word").value : union();
        take(")");
        return { type: "call", name, argument: nested };
      }
      function intersection() {
        let left = primary();
        while (current().type === "&" || current().type === "-") {
          const operator = take(current().type).type === "&" ? "intersection" : "difference";
          left = { type: "binary", operator, left, right: primary() };
        }
        return left;
      }
      function union() {
        let left = intersection();
        while (current().type === "|") {
          take("|");
          left = { type: "binary", operator: "union", left, right: intersection() };
        }
        return left;
      }
      if (!input.trim())
        throw new RevsetParseError("revset is empty", 0);
      const expression = union();
      if (current().type !== "eof")
        throw new RevsetParseError("unexpected token", current().offset);
      return expression;
    }
    function evaluateRevset(expression, nodes) {
      const ast = typeof expression === "string" ? parseRevset(expression) : expression;
      const byId = new Map(nodes.map((node) => [node.revisionId, node]));
      const children = /* @__PURE__ */ new Map();
      for (const node of nodes)
        for (const parent of node.parentRevisionIds)
          children.set(parent, [...children.get(parent) ?? [], node.revisionId]);
      const all = new Set(byId.keys());
      const result = visit(ast);
      return [...result].sort();
      function visit(value) {
        if (value.type === "binary") {
          const left = visit(value.left);
          const right = visit(value.right);
          if (value.operator === "union")
            return /* @__PURE__ */ new Set([...left, ...right]);
          if (value.operator === "intersection")
            return new Set([...left].filter((id) => right.has(id)));
          return new Set([...left].filter((id) => !right.has(id)));
        }
        const literal = typeof value.argument === "string" ? value.argument : void 0;
        if (value.name === "heads") {
          const parents = new Set(nodes.flatMap((node) => [...node.parentRevisionIds]));
          return new Set([...all].filter((id) => !parents.has(id)));
        }
        if (value.name === "roots")
          return new Set(nodes.filter((node) => node.parentRevisionIds.length === 0).map((node) => node.revisionId));
        if (value.name === "change")
          return new Set(nodes.filter((node) => node.changeId === literal).map((node) => node.revisionId));
        if (value.name === "graph")
          return new Set(nodes.filter((node) => node.changeGraphIds?.includes(literal ?? "")).map((node) => node.revisionId));
        if (value.name === "author")
          return new Set(nodes.filter((node) => node.authorId === literal).map((node) => node.revisionId));
        if (value.name === "conflicts")
          return new Set(nodes.filter((node) => node.conflict).map((node) => node.revisionId));
        if (value.name === "pending" || value.name === "approved")
          return new Set(nodes.filter((node) => node.reviewState === value.name).map((node) => node.revisionId));
        if (value.name === "mergeable")
          return new Set(nodes.filter((node) => node.mergeable === true).map((node) => node.revisionId));
        const seed = typeof value.argument === "string" ? /* @__PURE__ */ new Set([value.argument]) : value.argument ? visit(value.argument) : /* @__PURE__ */ new Set();
        const output = new Set(seed);
        const queue = [...seed];
        while (queue.length) {
          const id = queue.shift();
          const next = value.name === "ancestors" ? byId.get(id)?.parentRevisionIds ?? [] : children.get(id) ?? [];
          for (const related of next)
            if (!output.has(related)) {
              output.add(related);
              queue.push(related);
            }
        }
        return output;
      }
    }
  }
});

// packages/Epoch.Protocol/dist/schema.js
var require_schema = __commonJS({
  "packages/Epoch.Protocol/dist/schema.js"(exports) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    exports.protocolJsonSchemas = protocolJsonSchemas;
    var events_1 = require_events();
    var ids_1 = require_ids();
    var revisionId = { type: "string", pattern: "^[A-Za-z0-9][A-Za-z0-9._~-]{0,127}$" };
    var digest = { type: "string", pattern: "^[a-f0-9]{64}$" };
    var repositoryPath = { type: "string", minLength: 1, maxLength: 4096, pattern: "^(?!/)(?!.*(?:^|/)\\.\\.?(?:/|$))[^\\\\\\u0000]+$" };
    var nonemptyString = { type: "string", minLength: 1 };
    var nonnegativeInteger = { type: "integer", minimum: 0 };
    var ref = (name) => ({ $ref: `#/$defs/${name}` });
    var arrayOf = (items, minItems = 0) => ({ type: "array", items, minItems, uniqueItems: true });
    var id = (kind) => ({ type: "string", pattern: `^epoch:${kind}:[a-z2-7]{52}$` });
    var object = (required, properties) => ({
      type: "object",
      additionalProperties: false,
      required: [...required],
      properties
    });
    var simpleBodies = {
      repositoryIdentityBody: object(["repositoryId", "principalId"], { repositoryId: id("repo"), principalId: id("principal"), keyId: id("key") }),
      changeSupersededBody: object(["changeId", "supersededRevisionId", "byRevisionId"], { changeId: id("change"), supersededRevisionId: revisionId, byRevisionId: revisionId }),
      changeDependencyBody: object(["changeRevisionId", "dependencyRevisionId"], { changeRevisionId: revisionId, dependencyRevisionId: revisionId }),
      reviewRecordedBody: object(["reviewBundleId", "bundleRevisionId", "reviewerPrincipalId", "verdict"], {
        reviewBundleId: id("review-bundle"),
        bundleRevisionId: revisionId,
        reviewerPrincipalId: id("principal"),
        verdict: { enum: ["approved", "changes-requested", "commented"] }
      }),
      mergeGateBody: object(["mergePlanId", "gateDefinitionDigest", "status", "evidenceRevisionIds"], {
        mergePlanId: id("merge-plan"),
        gateDefinitionDigest: digest,
        status: { enum: ["passed", "failed"] },
        evidenceRevisionIds: arrayOf(revisionId)
      }),
      mergeAppliedBody: object(["mergePlanId", "targetRevisionId", "resultRevisionId", "resultTreeDigest", "mergeMode", "sourceRevisionIds"], {
        mergePlanId: id("merge-plan"),
        targetRevisionId: revisionId,
        resultRevisionId: revisionId,
        resultTreeDigest: digest,
        mergeMode: { enum: ["per-change-squash", "change-graph-squash"] },
        sourceRevisionIds: arrayOf(revisionId)
      }),
      conflictResolutionBody: object(["conflictId", "resolutionRevisionId", "principalId"], {
        conflictId: id("conflict"),
        resolutionRevisionId: revisionId,
        principalId: id("principal")
      }),
      agentMembershipBody: object(["workspaceId", "principalId", "grantId"], {
        workspaceId: id("workspace"),
        principalId: id("principal"),
        grantId: id("grant")
      }),
      agentCapabilityBody: object(["grantId", "principalId", "capability"], {
        grantId: id("grant"),
        principalId: id("principal"),
        capability: nonemptyString
      }),
      agentBudgetBody: object(["budgetId", "principalId", "units"], {
        budgetId: id("budget"),
        principalId: id("principal"),
        units: nonnegativeInteger
      }),
      projectionBody: object(["projectionId", "repositoryId", "definitionDigest"], {
        projectionId: id("projection"),
        repositoryId: id("repo"),
        definitionDigest: digest
      }),
      mirrorBody: object(["mirrorId", "repositoryId", "remoteRef", "frontier"], {
        mirrorId: id("mirror"),
        repositoryId: id("repo"),
        remoteRef: nonemptyString,
        frontier: arrayOf(revisionId)
      }),
      objectPromiseBody: object(["promiseId", "contentDigest", "status"], {
        promiseId: id("promise"),
        contentDigest: digest,
        status: { enum: ["pending", "fulfilled", "rejected"] }
      }),
      softwareHeritageMappingBody: object(["repositoryId", "swhId", "frontier"], {
        repositoryId: id("repo"),
        swhId: nonemptyString,
        frontier: arrayOf(revisionId)
      }),
      softwareHeritageArchiveBody: object(["repositoryId", "versionId", "requestId", "status"], {
        repositoryId: id("repo"),
        versionId: id("version"),
        requestId: nonemptyString,
        status: { enum: ["requested", "pending", "succeeded", "failed", "cancelled"] }
      }),
      spaceCreatedBody: object(["spaceId", "repositoryId", "ownerPrincipalId", "viewName", "title"], {
        spaceId: id("space"),
        repositoryId: id("repo"),
        ownerPrincipalId: id("principal"),
        viewName: nonemptyString,
        title: nonemptyString
      }),
      spaceParticipantJoinedBody: object(["spaceId", "principalId", "grantId", "role"], {
        spaceId: id("space"),
        principalId: id("principal"),
        grantId: id("grant"),
        role: { enum: ["owner", "collaborator", "agent", "observer"] }
      }),
      spaceParticipantLeftBody: object(["spaceId", "principalId", "grantId"], {
        spaceId: id("space"),
        principalId: id("principal"),
        grantId: id("grant")
      }),
      spaceWorkspaceBoundBody: object(["spaceId", "principalId", "workspaceId", "providerId", "storageMode", "residency", "materialization", "execution"], {
        spaceId: id("space"),
        principalId: id("principal"),
        workspaceId: id("workspace"),
        providerId: nonemptyString,
        storageMode: nonemptyString,
        residency: { enum: ["resident", "partial", "virtual"] },
        materialization: { enum: ["materialized", "virtual"] },
        execution: { enum: ["disabled", "in-process", "isolated"] }
      }),
      spaceTurnRecordedBody: object(["spaceId", "principalId", "grantId", "execution", "requestDigest"], {
        spaceId: id("space"),
        principalId: id("principal"),
        grantId: id("grant"),
        execution: { enum: ["disabled", "in-process", "isolated"] },
        requestDigest: digest,
        sandboxId: id("sandbox"),
        budgetId: id("budget"),
        units: nonnegativeInteger
      }),
      spaceBudgetAllocatedBody: object(["spaceId", "budgetId", "principalId", "units"], {
        spaceId: id("space"),
        budgetId: id("budget"),
        principalId: id("principal"),
        units: nonnegativeInteger
      }),
      spaceCaptureOpenedBody: object(["spaceId", "sessionId", "principalId", "scope", "retention", "redaction"], {
        spaceId: id("space"),
        sessionId: id("session"),
        principalId: id("principal"),
        scope: nonemptyString,
        retention: nonemptyString,
        redaction: { enum: ["none", "declared-secrets", "full"] }
      }),
      spaceCaptureClosedBody: object(["spaceId", "sessionId", "principalId", "operationCount"], {
        spaceId: id("space"),
        sessionId: id("session"),
        principalId: id("principal"),
        operationCount: nonnegativeInteger
      }),
      spaceCaptureOperationBody: object(["spaceId", "sessionId", "principalId", "path", "contentDigest"], {
        spaceId: id("space"),
        sessionId: id("session"),
        principalId: id("principal"),
        path: repositoryPath,
        contentDigest: digest
      }),
      spaceTurnReceiptBody: object(["spaceId", "principalId", "turnRevisionId", "sandboxId", "isolation", "network", "outcome"], {
        spaceId: id("space"),
        principalId: id("principal"),
        turnRevisionId: revisionId,
        sandboxId: id("sandbox"),
        isolation: { enum: ["none", "process", "namespace"] },
        network: { enum: ["inherited", "denied"] },
        outcome: { enum: ["succeeded", "failed", "timed-out", "refused"] },
        exitCode: { type: "integer" },
        durationMs: nonnegativeInteger
      }),
      spaceAnchorRecordedBody: object(["spaceId", "anchorId", "principalId", "revisionId", "path", "structuralPath", "contentDigest"], {
        spaceId: id("space"),
        anchorId: id("anchor"),
        principalId: id("principal"),
        revisionId,
        path: repositoryPath,
        structuralPath: nonemptyString,
        contentDigest: digest
      }),
      channelCreateBody: object(["schema", "channelId", "communityId", "name", "principalId", "visibility"], {
        schema: { const: "epoch.channel/v1" },
        channelId: id("channel"),
        communityId: id("space"),
        name: nonemptyString,
        principalId: id("principal"),
        visibility: { enum: ["public", "shared", "private"] }
      }),
      channelMessageBody: object(["schema", "channelId", "messageId", "principalId", "bodyDigest", "visibility"], {
        schema: { const: "epoch.channel/v1" },
        channelId: id("channel"),
        messageId: revisionId,
        principalId: id("principal"),
        bodyDigest: digest,
        visibility: { enum: ["public", "shared", "private"] }
      }),
      channelPresenceBody: object(["schema", "channelId", "principalId", "state"], {
        schema: { const: "epoch.channel/v1" },
        channelId: id("channel"),
        principalId: id("principal"),
        state: { enum: ["active", "idle", "away"] }
      }),
      channelReadBody: object(["schema", "channelId", "principalId", "watermarkEventId"], {
        schema: { const: "epoch.channel/v1" },
        channelId: id("channel"),
        principalId: id("principal"),
        watermarkEventId: revisionId
      })
    };
    var complexBodies = {
      fragmentSource: object(["path"], { path: repositoryPath, digest }),
      fragmentPrecondition: {
        oneOf: [
          object(["kind"], { kind: { const: "absent" } }),
          object(["kind", "digest"], { kind: { const: "digest" }, digest })
        ]
      },
      fragmentProvenance: object(["principalId"], { principalId: id("principal"), sourceRevisionId: revisionId }),
      fragment: object(["fragmentId", "kind", "path", "precondition", "resultDigest", "order", "dependencies", "provenance", "mergeStrategy"], {
        fragmentId: id("fragment"),
        kind: { enum: ["add", "delete", "move", "copy", "text", "structured", "binary"] },
        path: repositoryPath,
        from: ref("fragmentSource"),
        precondition: ref("fragmentPrecondition"),
        resultDigest: digest,
        contentRef: { type: "string", pattern: "^(sha256:[a-f0-9]{64}|swh:[A-Za-z0-9:._~-]+|promise:epoch:promise:[a-z2-7]{52})$" },
        order: nonnegativeInteger,
        dependencies: arrayOf(id("fragment")),
        provenance: ref("fragmentProvenance"),
        mergeStrategy: { enum: ["exact", "text", "structured", "binary-replace"] }
      }),
      changeRevisionBody: object(["changeId", "baseFrontier", "baseTreeDigest", "parentRevisionIds", "fragments", "resultingTreeDigest", "authorPrincipalId"], {
        changeId: id("change"),
        baseFrontier: arrayOf(revisionId),
        baseTreeDigest: digest,
        parentRevisionIds: arrayOf(revisionId),
        fragments: arrayOf(ref("fragment"), 1),
        resultingTreeDigest: digest,
        authorPrincipalId: id("principal")
      }),
      changeGraphEdge: object(["from", "to", "kind"], { from: revisionId, to: revisionId, kind: { enum: ["requires", "orders-after", "conflicts-with", "derived-from"] } }),
      changeGraphBody: object(["changeGraphId", "memberRevisionIds", "edges"], { changeGraphId: id("change-graph"), memberRevisionIds: arrayOf(revisionId), edges: { type: "array", items: ref("changeGraphEdge") } }),
      splitGroup: object(["fragmentIds", "risk", "reason"], { fragmentIds: arrayOf(id("fragment")), risk: { enum: ["low", "medium", "high", "ambiguous"] }, reason: { type: "string" } }),
      splitBody: object(["sourceRevisionId", "groups", "resultingRevisionIds", "reconstructionDigest"], {
        sourceRevisionId: revisionId,
        groups: { type: "array", items: ref("splitGroup"), minItems: 1 },
        resultingRevisionIds: arrayOf(revisionId),
        reconstructionDigest: digest
      }),
      reviewOverlap: object(["left", "right"], { left: id("fragment"), right: id("fragment") }),
      reviewBundleBody: object(["reviewBundleId", "selectedRevisionIds", "baseFrontier", "baseTreeDigest", "combinedTreeDigest", "overlaps", "conflictIds", "gateDefinitionDigest"], {
        reviewBundleId: id("review-bundle"),
        selectedRevisionIds: arrayOf(revisionId),
        baseFrontier: arrayOf(revisionId),
        baseTreeDigest: digest,
        combinedTreeDigest: digest,
        overlaps: { type: "array", items: ref("reviewOverlap") },
        conflictIds: arrayOf(id("conflict")),
        gateDefinitionDigest: digest
      }),
      mergePlanBody: object(["mergePlanId", "targetRevisionId", "selectedRevisionIds", "hardDependencyClosure", "reviewBundleRevisionId", "conflictResolutionRevisionIds", "gateDefinitionDigest", "mergeMode", "resultingTreeDigest"], {
        mergePlanId: id("merge-plan"),
        targetRevisionId: revisionId,
        selectedRevisionIds: arrayOf(revisionId),
        hardDependencyClosure: arrayOf(revisionId),
        reviewBundleRevisionId: revisionId,
        conflictResolutionRevisionIds: arrayOf(revisionId),
        gateDefinitionDigest: digest,
        mergeMode: { enum: ["per-change-squash", "change-graph-squash"] },
        resultingTreeDigest: digest
      }),
      conflictBody: object(["conflictId", "sideRevisionIds", "status", "resolutionRevisionIds"], {
        conflictId: id("conflict"),
        sideRevisionIds: arrayOf(revisionId, 2),
        status: { enum: ["unresolved", "proposed", "accepted", "rejected"] },
        resolutionRevisionIds: arrayOf(revisionId)
      })
    };
    var bodyDefinitionByType = {
      "repository.identity": "repositoryIdentityBody",
      "change.created": "changeRevisionBody",
      "change.revised": "changeRevisionBody",
      "change.superseded": "changeSupersededBody",
      "change.dependency.added": "changeDependencyBody",
      "change.dependency.removed": "changeDependencyBody",
      "change-graph.defined": "changeGraphBody",
      "change-graph.revised": "changeGraphBody",
      "split.accepted": "splitBody",
      "review.bundle.created": "reviewBundleBody",
      "review.bundle.revised": "reviewBundleBody",
      "review.recorded": "reviewRecordedBody",
      "merge.plan.created": "mergePlanBody",
      "merge.plan.gate-recorded": "mergeGateBody",
      "merge.plan.applied": "mergeAppliedBody",
      "conflict.recorded": "conflictBody",
      "conflict.resolution.proposed": "conflictResolutionBody",
      "conflict.resolution.accepted": "conflictResolutionBody",
      "conflict.resolution.rejected": "conflictResolutionBody",
      "agent.membership.granted": "agentMembershipBody",
      "agent.membership.revoked": "agentMembershipBody",
      "agent.capability.granted": "agentCapabilityBody",
      "agent.capability.revoked": "agentCapabilityBody",
      "agent.budget.allocated": "agentBudgetBody",
      "agent.budget.reserved": "agentBudgetBody",
      "agent.budget.consumed": "agentBudgetBody",
      "agent.budget.released": "agentBudgetBody",
      "projection.recorded": "projectionBody",
      "mirror.defined": "mirrorBody",
      "mirror.checkpoint": "mirrorBody",
      "mirror.run": "mirrorBody",
      "object.promise.recorded": "objectPromiseBody",
      "software-heritage.mapping": "softwareHeritageMappingBody",
      "software-heritage.archive-requested": "softwareHeritageArchiveBody",
      "software-heritage.archive-status": "softwareHeritageArchiveBody",
      "space.created": "spaceCreatedBody",
      "space.participant.joined": "spaceParticipantJoinedBody",
      "space.participant.left": "spaceParticipantLeftBody",
      "space.workspace.bound": "spaceWorkspaceBoundBody",
      "space.turn.recorded": "spaceTurnRecordedBody",
      "space.budget.allocated": "spaceBudgetAllocatedBody",
      "space.capture.opened": "spaceCaptureOpenedBody",
      "space.capture.closed": "spaceCaptureClosedBody",
      "space.capture.operation": "spaceCaptureOperationBody",
      "space.anchor.recorded": "spaceAnchorRecordedBody",
      "space.turn.receipt": "spaceTurnReceiptBody",
      "channel.create": "channelCreateBody",
      "channel.message": "channelMessageBody",
      "channel.presence": "channelPresenceBody",
      "channel.read": "channelReadBody"
    };
    function protocolJsonSchemas() {
      return {
        $schema: "https://json-schema.org/draft/2020-12/schema",
        $id: "https://epoch.dev/schemas/protocol/events-v1.json",
        title: "Epoch Protocol Events v1",
        type: "object",
        additionalProperties: false,
        required: ["schemaVersion", "type", "eventId", "revisionId", "body"],
        properties: {
          schemaVersion: { const: 1 },
          type: { enum: [...events_1.PROTOCOL_EVENT_SCHEMAS] },
          eventId: revisionId,
          revisionId,
          body: { type: "object" }
        },
        oneOf: events_1.PROTOCOL_EVENT_SCHEMAS.map((type) => ({
          properties: { type: { const: type }, body: ref(bodyDefinitionByType[type]) },
          required: ["type", "body"]
        })),
        $defs: {
          canonicalId: { type: "string", pattern: `^epoch:(${ids_1.CANONICAL_ID_KINDS.join("|")}):[a-z2-7]{52}$` },
          revisionId,
          digest,
          repositoryPath,
          ...complexBodies,
          ...simpleBodies
        }
      };
    }
  }
});

// packages/Epoch.Protocol/dist/review-publish.js
var require_review_publish = __commonJS({
  "packages/Epoch.Protocol/dist/review-publish.js"(exports) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    exports.gerritChangeIdTrailer = gerritChangeIdTrailer;
    exports.gerritReviewRef = gerritReviewRef;
    exports.gerritPushOptions = gerritPushOptions;
    exports.gerritPushSpec = gerritPushSpec;
    exports.describeChangePublish = describeChangePublish;
    var ids_1 = require_ids();
    var errors_1 = require_errors2();
    var TARGET_PATTERN = /^[A-Za-z0-9._][A-Za-z0-9._/-]*$/u;
    var OPTION_PATTERN = /^[A-Za-z0-9._][A-Za-z0-9._/-]*$/u;
    var ALPHABET = "abcdefghijklmnopqrstuvwxyz234567";
    function gerritChangeIdTrailer(changeId) {
      const { token } = (0, ids_1.parseChangeId)(changeId);
      const bytes = decodeBase32Token(token);
      let hex = "";
      for (let index = 0; index < 20; index += 1) {
        hex += (bytes[index] ?? 0).toString(16).padStart(2, "0");
      }
      return `I${hex}`;
    }
    function gerritReviewRef(target = "main") {
      return `refs/for/${normalizeTarget(target)}`;
    }
    function gerritPushOptions(input = {}) {
      const options = [];
      if (input.topic !== void 0 && input.topic !== "") {
        options.push(`topic=${sanitizeOption(input.topic, "topic")}`);
      }
      for (const tag of input.hashtags ?? []) {
        if (!tag)
          continue;
        options.push(`hashtag=${sanitizeOption(tag, "hashtag")}`);
      }
      if (input.wip === true)
        options.push("wip");
      return Object.freeze(options);
    }
    function gerritPushSpec(input = {}) {
      const ref = gerritReviewRef(input.target);
      const options = gerritPushOptions(input);
      return options.length === 0 ? ref : `${ref}%${options.join(",")}`;
    }
    function describeChangePublish(input) {
      const target = normalizeTarget(input.target ?? "main");
      const hashtags = Object.freeze((input.hashtags ?? []).filter((tag) => tag.length > 0).map((tag) => sanitizeOption(tag, "hashtag")));
      const topic = input.topic ? sanitizeOption(input.topic, "topic") : void 0;
      const options = { target, topic, hashtags, wip: input.wip === true };
      return Object.freeze({
        changeId: (0, ids_1.parseChangeId)(input.changeId) && input.changeId,
        revisionId: input.revisionId,
        changeIdTrailer: gerritChangeIdTrailer(input.changeId),
        target,
        reviewRef: gerritReviewRef(target),
        pushSpec: gerritPushSpec(options),
        pushOptions: gerritPushOptions(options),
        ...topic === void 0 ? {} : { topic },
        hashtags,
        wip: input.wip === true
      });
    }
    function normalizeTarget(raw) {
      const trimmed = raw.trim().replace(/^refs\/(?:for|heads)\//u, "").replace(/^\/+/u, "").replace(/\/+$/u, "");
      if (!trimmed || !TARGET_PATTERN.test(trimmed) || trimmed.includes("..")) {
        return (0, errors_1.fail)("invalid-ref", `Invalid review target: ${raw}`);
      }
      return trimmed;
    }
    function sanitizeOption(value, label) {
      if (!OPTION_PATTERN.test(value) || value.includes("..")) {
        return (0, errors_1.fail)("invalid-ref", `Invalid ${label}: ${value}`);
      }
      return value;
    }
    function decodeBase32Token(token) {
      let bits = 0;
      let buffer = 0;
      const bytes = [];
      for (const character of token) {
        const value = ALPHABET.indexOf(character);
        if (value < 0)
          return (0, errors_1.fail)("invalid-id", `Invalid canonical token: ${token}`);
        buffer = buffer << 5 | value;
        bits += 5;
        if (bits >= 8) {
          bits -= 8;
          bytes.push(buffer >>> bits & 255);
          buffer &= (1 << bits) - 1;
        }
      }
      return Uint8Array.from(bytes.slice(0, 32));
    }
  }
});

// packages/Epoch.Protocol/dist/index.js
var require_dist = __commonJS({
  "packages/Epoch.Protocol/dist/index.js"(exports) {
    "use strict";
    var __createBinding = exports && exports.__createBinding || (Object.create ? (function(o, m, k, k2) {
      if (k2 === void 0) k2 = k;
      var desc = Object.getOwnPropertyDescriptor(m, k);
      if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
        desc = { enumerable: true, get: function() {
          return m[k];
        } };
      }
      Object.defineProperty(o, k2, desc);
    }) : (function(o, m, k, k2) {
      if (k2 === void 0) k2 = k;
      o[k2] = m[k];
    }));
    var __exportStar = exports && exports.__exportStar || function(m, exports2) {
      for (var p in m) if (p !== "default" && !Object.prototype.hasOwnProperty.call(exports2, p)) __createBinding(exports2, m, p);
    };
    Object.defineProperty(exports, "__esModule", { value: true });
    __exportStar(require_capabilities(), exports);
    __exportStar(require_errors2(), exports);
    __exportStar(require_events(), exports);
    __exportStar(require_ids(), exports);
    __exportStar(require_inspection(), exports);
    __exportStar(require_models(), exports);
    __exportStar(require_posture(), exports);
    __exportStar(require_revset(), exports);
    __exportStar(require_schema(), exports);
    __exportStar(require_review_publish(), exports);
  }
});

// packages/Epoch.Community.Core/dist/channel.js
var require_channel = __commonJS({
  "packages/Epoch.Community.Core/dist/channel.js"(exports) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    exports.CHANNEL_EVENT_SCHEMA = void 0;
    exports.digestChannelBody = digestChannelBody;
    exports.assertChannelEvent = assertChannelEvent;
    exports.projectChannelEvents = projectChannelEvents;
    exports.unreadForPosture = unreadForPosture;
    exports.evaluateChannelPosture = evaluateChannelPosture;
    exports.queuePreservesWatermark = queuePreservesWatermark;
    exports.sanitizeChannelLivestreamEnvelope = sanitizeChannelLivestreamEnvelope;
    var protocol_1 = require_dist();
    var entity_1 = require_entity();
    exports.CHANNEL_EVENT_SCHEMA = "epoch.channel/v1";
    var CHANNEL_TYPES = /* @__PURE__ */ new Set([
      "channel.create",
      "channel.message",
      "channel.presence",
      "channel.read"
    ]);
    function digestChannelBody(text) {
      const bytes = new TextEncoder().encode(text);
      let mix = 2166136261;
      for (const byte of bytes)
        mix = Math.imul(mix ^ byte, 16777619) >>> 0;
      return mix.toString(16).padStart(64, "0").slice(-64);
    }
    function assertChannelEvent(value) {
      const event = (0, protocol_1.assertProtocolEvent)(value);
      if (!CHANNEL_TYPES.has(event.type)) {
        throw new Error(`not a channel event: ${event.type}`);
      }
      return event;
    }
    function projectChannelEvents(events) {
      const channels = /* @__PURE__ */ new Map();
      const messages = [];
      const presence = /* @__PURE__ */ new Map();
      const reads = /* @__PURE__ */ new Map();
      for (const raw of events) {
        const event = assertChannelEvent(raw);
        if (event.type === "channel.create") {
          const body2 = event.body;
          channels.set(body2.channelId, body2);
          continue;
        }
        if (event.type === "channel.message") {
          const body2 = event.body;
          messages.push((0, entity_1.communityMessageToEntity)(channelMessageFromEvent(event.eventId, body2), {
            provenance: {
              sourceId: "epoch.channel",
              nativeId: event.eventId,
              observedAt: (/* @__PURE__ */ new Date(0)).toISOString()
            },
            visibility: body2.visibility,
            ownerId: body2.principalId,
            participantIds: [body2.principalId]
          }));
          continue;
        }
        if (event.type === "channel.presence") {
          const body2 = event.body;
          presence.set(`${body2.channelId}:${body2.principalId}`, body2);
          continue;
        }
        const body = event.body;
        reads.set(`${body.channelId}:${body.principalId}`, body);
      }
      return { channels, messages, presence, reads };
    }
    function unreadForPosture(policy, read, localWatermark) {
      if (policy.serverTrackedReadState && read !== void 0) {
        return { mode: "server", watermarkEventId: read.watermarkEventId };
      }
      return { mode: "local", watermarkEventId: localWatermark };
    }
    function evaluateChannelPosture(config) {
      return (0, protocol_1.evaluatePosture)(config);
    }
    function queuePreservesWatermark(watermarkEventId, incomingMessageIds) {
      const unreadIds = incomingMessageIds.filter((id) => id !== watermarkEventId);
      return { watermarkEventId, unreadIds };
    }
    function sanitizeChannelLivestreamEnvelope(input) {
      if (input.protectedInput === true || typeof input.secret === "string" && input.secret.length > 0) {
        return { kind: "drop", reason: "protected-secret" };
      }
      if (input.visibility !== "public") {
        return { kind: "drop", reason: "non-public" };
      }
      return {
        kind: "emit",
        envelope: {
          kind: "channel.message",
          channelId: input.channelId,
          messageId: input.messageId,
          bodyDigest: digestChannelBody(input.body ?? ""),
          visibility: "public"
        }
      };
    }
    function channelMessageFromEvent(eventId, body) {
      const ref = { objectId: opaqueCommunityId(body.messageId), kind: "message", revision: eventId };
      const channel = { objectId: opaqueCommunityId(body.channelId), kind: "channel" };
      return {
        ref,
        context: channel,
        authorId: body.principalId,
        body: body.bodyDigest,
        publishedAt: (/* @__PURE__ */ new Date(0)).toISOString(),
        threadRoot: ref,
        relations: [],
        state: "signed",
        aliases: []
      };
    }
    function opaqueCommunityId(value) {
      const mapped = value.replaceAll(":", ".");
      if (!/^[A-Za-z0-9][A-Za-z0-9._~-]{0,127}$/u.test(mapped)) {
        throw new Error("channel identity cannot project to a Community objectId");
      }
      return mapped;
    }
  }
});

// packages/Epoch.Community.Core/dist/index.js
var require_dist2 = __commonJS({
  "packages/Epoch.Community.Core/dist/index.js"(exports) {
    "use strict";
    var __createBinding = exports && exports.__createBinding || (Object.create ? (function(o, m, k, k2) {
      if (k2 === void 0) k2 = k;
      var desc = Object.getOwnPropertyDescriptor(m, k);
      if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
        desc = { enumerable: true, get: function() {
          return m[k];
        } };
      }
      Object.defineProperty(o, k2, desc);
    }) : (function(o, m, k, k2) {
      if (k2 === void 0) k2 = k;
      o[k2] = m[k];
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
    __exportStar(require_channel(), exports);
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

// packages/Epoch.Community.Web/src/search/search-worker.ts
var import_community_core2 = __toESM(require_dist2());

// node_modules/@orama/orama/dist/browser/components/tokenizer/languages.js
var STEMMERS = {
  arabic: "ar",
  armenian: "am",
  bulgarian: "bg",
  czech: "cz",
  danish: "dk",
  dutch: "nl",
  english: "en",
  finnish: "fi",
  french: "fr",
  german: "de",
  greek: "gr",
  hungarian: "hu",
  indian: "in",
  indonesian: "id",
  irish: "ie",
  italian: "it",
  lithuanian: "lt",
  nepali: "np",
  norwegian: "no",
  portuguese: "pt",
  romanian: "ro",
  russian: "ru",
  serbian: "rs",
  slovenian: "ru",
  spanish: "es",
  swedish: "se",
  tamil: "ta",
  turkish: "tr",
  ukrainian: "uk",
  sanskrit: "sk"
};
var SPLITTERS = {
  dutch: /[^A-Za-zàèéìòóù0-9_'-]+/gim,
  english: /[^A-Za-zàèéìòóù0-9_'-]+/gim,
  french: /[^a-z0-9äâàéèëêïîöôùüûœç-]+/gim,
  italian: /[^A-Za-zàèéìòóù0-9_'-]+/gim,
  norwegian: /[^a-z0-9_æøåÆØÅäÄöÖüÜ]+/gim,
  portuguese: /[^a-z0-9à-úÀ-Ú]/gim,
  russian: /[^a-z0-9а-яА-ЯёЁ]+/gim,
  spanish: /[^a-z0-9A-Zá-úÁ-ÚñÑüÜ]+/gim,
  swedish: /[^a-z0-9_åÅäÄöÖüÜ-]+/gim,
  german: /[^a-z0-9A-ZäöüÄÖÜß]+/gim,
  finnish: /[^a-z0-9äöÄÖ]+/gim,
  danish: /[^a-z0-9æøåÆØÅ]+/gim,
  hungarian: /[^a-z0-9áéíóöőúüűÁÉÍÓÖŐÚÜŰ]+/gim,
  romanian: /[^a-z0-9ăâîșțĂÂÎȘȚ]+/gim,
  serbian: /[^a-z0-9čćžšđČĆŽŠĐ]+/gim,
  turkish: /[^a-z0-9çÇğĞıİöÖşŞüÜ]+/gim,
  lithuanian: /[^a-z0-9ąčęėįšųūžĄČĘĖĮŠŲŪŽ]+/gim,
  arabic: /[^a-z0-9أ-ي]+/gim,
  nepali: /[^a-z0-9अ-ह]+/gim,
  irish: /[^a-z0-9áéíóúÁÉÍÓÚ]+/gim,
  indian: /[^a-z0-9अ-ह]+/gim,
  armenian: /[^a-z0-9ա-ֆ]+/gim,
  greek: /[^a-z0-9α-ωά-ώ]+/gim,
  indonesian: /[^a-z0-9]+/gim,
  ukrainian: /[^a-z0-9а-яА-ЯіїєІЇЄ]+/gim,
  slovenian: /[^a-z0-9čžšČŽŠ]+/gim,
  bulgarian: /[^a-z0-9а-яА-Я]+/gim,
  tamil: /[^a-z0-9அ-ஹ]+/gim,
  sanskrit: /[^a-z0-9A-Zāīūṛḷṃṁḥśṣṭḍṇṅñḻḹṝ]+/gim,
  czech: /[^A-Z0-9a-zěščřžýáíéúůóťďĚŠČŘŽÝÁÍÉÓÚŮŤĎ-]+/gim
};
var SUPPORTED_LANGUAGES = Object.keys(STEMMERS);
function getLocale(language) {
  return language !== void 0 && SUPPORTED_LANGUAGES.includes(language) ? STEMMERS[language] : void 0;
}

// node_modules/@orama/orama/dist/browser/utils.js
var baseId = Date.now().toString().slice(5);
var lastId = 0;
var nano = BigInt(1e3);
var milli = BigInt(1e6);
var second = BigInt(1e9);
var MAX_ARGUMENT_FOR_STACK = 65535;
function safeArrayPush(arr, newArr) {
  if (newArr.length < MAX_ARGUMENT_FOR_STACK) {
    Array.prototype.push.apply(arr, newArr);
  } else {
    const newArrLength = newArr.length;
    for (let i = 0; i < newArrLength; i += MAX_ARGUMENT_FOR_STACK) {
      Array.prototype.push.apply(arr, newArr.slice(i, i + MAX_ARGUMENT_FOR_STACK));
    }
  }
}
function sprintf(template, ...args) {
  return template.replace(/%(?:(?<position>\d+)\$)?(?<width>-?\d*\.?\d*)(?<type>[dfs])/g, function(...replaceArgs) {
    const groups = replaceArgs[replaceArgs.length - 1];
    const { width: rawWidth, type, position } = groups;
    const replacement = position ? args[Number.parseInt(position) - 1] : args.shift();
    const width = rawWidth === "" ? 0 : Number.parseInt(rawWidth);
    switch (type) {
      case "d":
        return replacement.toString().padStart(width, "0");
      case "f": {
        let value = replacement;
        const [padding, precision] = rawWidth.split(".").map((w) => Number.parseFloat(w));
        if (typeof precision === "number" && precision >= 0) {
          value = value.toFixed(precision);
        }
        return typeof padding === "number" && padding >= 0 ? value.toString().padStart(width, "0") : value.toString();
      }
      case "s":
        return width < 0 ? replacement.toString().padEnd(-width, " ") : replacement.toString().padStart(width, " ");
      default:
        return replacement;
    }
  });
}
function isInsideWebWorker() {
  return typeof WorkerGlobalScope !== "undefined" && self instanceof WorkerGlobalScope;
}
function isInsideNode() {
  return typeof process !== "undefined" && process.release && process.release.name === "node";
}
function getNanosecondTimeViaPerformance() {
  return BigInt(Math.floor(performance.now() * 1e6));
}
function formatNanoseconds(value) {
  if (typeof value === "number") {
    value = BigInt(value);
  }
  if (value < nano) {
    return `${value}ns`;
  } else if (value < milli) {
    return `${value / nano}\u03BCs`;
  } else if (value < second) {
    return `${value / milli}ms`;
  }
  return `${value / second}s`;
}
function getNanosecondsTime() {
  if (isInsideWebWorker()) {
    return getNanosecondTimeViaPerformance();
  }
  if (isInsideNode()) {
    return process.hrtime.bigint();
  }
  if (typeof process !== "undefined" && typeof process?.hrtime?.bigint === "function") {
    return process.hrtime.bigint();
  }
  if (typeof performance !== "undefined") {
    return getNanosecondTimeViaPerformance();
  }
  return BigInt(0);
}
function uniqueId() {
  return `${baseId}-${lastId++}`;
}
function getOwnProperty(object, property) {
  if (Object.hasOwn === void 0) {
    return Object.prototype.hasOwnProperty.call(object, property) ? object[property] : void 0;
  }
  return Object.hasOwn(object, property) ? object[property] : void 0;
}
function sortTokenScorePredicate(a, b) {
  if (b[1] === a[1]) {
    return a[0] - b[0];
  }
  return b[1] - a[1];
}
function intersect(arrays) {
  if (arrays.length === 0) {
    return [];
  } else if (arrays.length === 1) {
    return arrays[0];
  }
  for (let i = 1; i < arrays.length; i++) {
    if (arrays[i].length < arrays[0].length) {
      const tmp = arrays[0];
      arrays[0] = arrays[i];
      arrays[i] = tmp;
    }
  }
  const set = /* @__PURE__ */ new Map();
  for (const elem of arrays[0]) {
    set.set(elem, 1);
  }
  for (let i = 1; i < arrays.length; i++) {
    let found = 0;
    for (const elem of arrays[i]) {
      const count3 = set.get(elem);
      if (count3 === i) {
        set.set(elem, count3 + 1);
        found++;
      }
    }
    if (found === 0)
      return [];
  }
  return arrays[0].filter((e) => {
    const count3 = set.get(e);
    if (count3 !== void 0)
      set.set(e, 0);
    return count3 === arrays.length;
  });
}
function getDocumentProperties(doc, paths) {
  const properties = {};
  const pathsLength = paths.length;
  for (let i = 0; i < pathsLength; i++) {
    const path = paths[i];
    const pathTokens = path.split(".");
    let current = doc;
    const pathTokensLength = pathTokens.length;
    for (let j = 0; j < pathTokensLength; j++) {
      current = current[pathTokens[j]];
      if (typeof current === "object") {
        if (current !== null && "lat" in current && "lon" in current && typeof current.lat === "number" && typeof current.lon === "number") {
          current = properties[path] = current;
          break;
        } else if (!Array.isArray(current) && current !== null && j === pathTokensLength - 1) {
          current = void 0;
          break;
        }
      } else if ((current === null || typeof current !== "object") && j < pathTokensLength - 1) {
        current = void 0;
        break;
      }
    }
    if (typeof current !== "undefined") {
      properties[path] = current;
    }
  }
  return properties;
}
function getNested(obj, path) {
  const props = getDocumentProperties(obj, [path]);
  return props[path];
}
var mapDistanceToMeters = {
  cm: 0.01,
  m: 1,
  km: 1e3,
  ft: 0.3048,
  yd: 0.9144,
  mi: 1609.344
};
function convertDistanceToMeters(distance, unit) {
  const ratio = mapDistanceToMeters[unit];
  if (ratio === void 0) {
    throw new Error(createError("INVALID_DISTANCE_SUFFIX", distance).message);
  }
  return distance * ratio;
}
function removeVectorsFromHits(searchResult, vectorProperties) {
  searchResult.hits = searchResult.hits.map((result) => ({
    ...result,
    document: {
      ...result.document,
      // Remove embeddings from the result
      ...vectorProperties.reduce((acc, prop) => {
        const path = prop.split(".");
        const lastKey = path.pop();
        let obj = acc;
        for (const key of path) {
          obj[key] = obj[key] ?? {};
          obj = obj[key];
        }
        obj[lastKey] = null;
        return acc;
      }, result.document)
    }
  }));
}
function isAsyncFunction(func) {
  if (Array.isArray(func)) {
    return func.some((item) => isAsyncFunction(item));
  }
  return func?.constructor?.name === "AsyncFunction";
}
var withIntersection = "intersection" in /* @__PURE__ */ new Set();
function setIntersection(...sets) {
  if (sets.length === 0) {
    return /* @__PURE__ */ new Set();
  }
  if (sets.length === 1) {
    return sets[0];
  }
  if (sets.length === 2) {
    const set1 = sets[0];
    const set2 = sets[1];
    if (withIntersection) {
      return set1.intersection(set2);
    }
    const result = /* @__PURE__ */ new Set();
    const base2 = set1.size < set2.size ? set1 : set2;
    const other = base2 === set1 ? set2 : set1;
    for (const value of base2) {
      if (other.has(value)) {
        result.add(value);
      }
    }
    return result;
  }
  const min = {
    index: 0,
    size: sets[0].size
  };
  for (let i = 1; i < sets.length; i++) {
    if (sets[i].size < min.size) {
      min.index = i;
      min.size = sets[i].size;
    }
  }
  if (withIntersection) {
    let base2 = sets[min.index];
    for (let i = 0; i < sets.length; i++) {
      if (i === min.index) {
        continue;
      }
      base2 = base2.intersection(sets[i]);
    }
    return base2;
  }
  const base = sets[min.index];
  for (let i = 0; i < sets.length; i++) {
    if (i === min.index) {
      continue;
    }
    const other = sets[i];
    for (const value of base) {
      if (!other.has(value)) {
        base.delete(value);
      }
    }
  }
  return base;
}
var withUnion = "union" in /* @__PURE__ */ new Set();
function setUnion(set1, set2) {
  if (withUnion) {
    if (set1) {
      return set1.union(set2);
    }
    return set2;
  }
  if (!set1) {
    return new Set(set2);
  }
  return /* @__PURE__ */ new Set([...set1, ...set2]);
}
function setDifference(set1, set2) {
  const result = /* @__PURE__ */ new Set();
  for (const value of set1) {
    if (!set2.has(value)) {
      result.add(value);
    }
  }
  return result;
}
function sleep(ms) {
  if (typeof SharedArrayBuffer !== "undefined" && typeof Atomics !== "undefined") {
    const nil = new Int32Array(new SharedArrayBuffer(4));
    const valid = ms > 0 && ms < Infinity;
    if (valid === false) {
      if (typeof ms !== "number" && typeof ms !== "bigint") {
        throw TypeError("sleep: ms must be a number");
      }
      throw RangeError("sleep: ms must be a number that is greater than 0 but less than Infinity");
    }
    Atomics.wait(nil, 0, 0, Number(ms));
  } else {
    const valid = ms > 0 && ms < Infinity;
    if (valid === false) {
      if (typeof ms !== "number" && typeof ms !== "bigint") {
        throw TypeError("sleep: ms must be a number");
      }
      throw RangeError("sleep: ms must be a number that is greater than 0 but less than Infinity");
    }
    const target = Date.now() + Number(ms);
    while (target > Date.now()) {
    }
  }
}

// node_modules/@orama/orama/dist/browser/errors.js
var allLanguages = SUPPORTED_LANGUAGES.join("\n - ");
var errors = {
  NO_LANGUAGE_WITH_CUSTOM_TOKENIZER: "Do not pass the language option to create when using a custom tokenizer.",
  LANGUAGE_NOT_SUPPORTED: `Language "%s" is not supported.
Supported languages are:
 - ${allLanguages}`,
  INVALID_STEMMER_FUNCTION_TYPE: `config.stemmer property must be a function.`,
  MISSING_STEMMER: `As of version 1.0.0 @orama/orama does not ship non English stemmers by default. To solve this, please explicitly import and specify the "%s" stemmer from the package @orama/stemmers. See https://docs.orama.com/docs/orama-js/text-analysis/stemming for more information.`,
  CUSTOM_STOP_WORDS_MUST_BE_FUNCTION_OR_ARRAY: "Custom stop words array must only contain strings.",
  UNSUPPORTED_COMPONENT: `Unsupported component "%s".`,
  COMPONENT_MUST_BE_FUNCTION: `The component "%s" must be a function.`,
  COMPONENT_MUST_BE_FUNCTION_OR_ARRAY_FUNCTIONS: `The component "%s" must be a function or an array of functions.`,
  INVALID_SCHEMA_TYPE: `Unsupported schema type "%s" at "%s". Expected "string", "boolean" or "number" or array of them.`,
  DOCUMENT_ID_MUST_BE_STRING: `Document id must be of type "string". Got "%s" instead.`,
  DOCUMENT_ALREADY_EXISTS: `A document with id "%s" already exists.`,
  DOCUMENT_DOES_NOT_EXIST: `A document with id "%s" does not exists.`,
  MISSING_DOCUMENT_PROPERTY: `Missing searchable property "%s".`,
  INVALID_DOCUMENT_PROPERTY: `Invalid document property "%s": expected "%s", got "%s"`,
  UNKNOWN_INDEX: `Invalid property name "%s". Expected a wildcard string ("*") or array containing one of the following properties: %s`,
  INVALID_BOOST_VALUE: `Boost value must be a number greater than, or less than 0.`,
  INVALID_FILTER_OPERATION: `You can only use one operation per filter, you requested %d.`,
  SCHEMA_VALIDATION_FAILURE: `Cannot insert document due schema validation failure on "%s" property.`,
  INVALID_SORT_SCHEMA_TYPE: `Unsupported sort schema type "%s" at "%s". Expected "string" or "number".`,
  CANNOT_SORT_BY_ARRAY: `Cannot configure sort for "%s" because it is an array (%s).`,
  UNABLE_TO_SORT_ON_UNKNOWN_FIELD: `Unable to sort on unknown field "%s". Allowed fields: %s`,
  SORT_DISABLED: `Sort is disabled. Please read the documentation at https://docs.orama.com/docs/orama-js for more information.`,
  UNKNOWN_GROUP_BY_PROPERTY: `Unknown groupBy property "%s".`,
  INVALID_GROUP_BY_PROPERTY: `Invalid groupBy property "%s". Allowed types: "%s", but given "%s".`,
  UNKNOWN_FILTER_PROPERTY: `Unknown filter property "%s".`,
  UNKNOWN_VECTOR_PROPERTY: `Unknown vector property "%s". Make sure the property exists in the schema and is configured as a vector.`,
  INVALID_VECTOR_SIZE: `Vector size must be a number greater than 0. Got "%s" instead.`,
  INVALID_VECTOR_VALUE: `Vector value must be a number greater than 0. Got "%s" instead.`,
  INVALID_INPUT_VECTOR: `Property "%s" was declared as a %s-dimensional vector, but got a %s-dimensional vector instead.
Input vectors must be of the size declared in the schema, as calculating similarity between vectors of different sizes can lead to unexpected results.`,
  WRONG_SEARCH_PROPERTY_TYPE: `Property "%s" is not searchable. Only "string" properties are searchable.`,
  FACET_NOT_SUPPORTED: `Facet doens't support the type "%s".`,
  INVALID_DISTANCE_SUFFIX: `Invalid distance suffix "%s". Valid suffixes are: cm, m, km, mi, yd, ft.`,
  INVALID_SEARCH_MODE: `Invalid search mode "%s". Valid modes are: "fulltext", "vector", "hybrid".`,
  MISSING_VECTOR_AND_SECURE_PROXY: `No vector was provided and no secure proxy was configured. Please provide a vector or configure an Orama Secure Proxy to perform hybrid search.`,
  MISSING_TERM: `"term" is a required parameter when performing hybrid search. Please provide a search term.`,
  INVALID_VECTOR_INPUT: `Invalid "vector" property. Expected an object with "value" and "property" properties, but got "%s" instead.`,
  PLUGIN_CRASHED: `A plugin crashed during initialization. Please check the error message for more information:`,
  PLUGIN_SECURE_PROXY_NOT_FOUND: `Could not find '@orama/secure-proxy-plugin' installed in your Orama instance.
Please install it before proceeding with creating an answer session.
Read more at https://docs.orama.com/docs/orama-js/plugins/plugin-secure-proxy#plugin-secure-proxy
`,
  PLUGIN_SECURE_PROXY_MISSING_CHAT_MODEL: `Could not find a chat model defined in the secure proxy plugin configuration.
Please provide a chat model before proceeding with creating an answer session.
Read more at https://docs.orama.com/docs/orama-js/plugins/plugin-secure-proxy#plugin-secure-proxy
`,
  ANSWER_SESSION_LAST_MESSAGE_IS_NOT_ASSISTANT: `The last message in the session is not an assistant message. Cannot regenerate non-assistant messages.`,
  PLUGIN_COMPONENT_CONFLICT: `The component "%s" is already defined. The plugin "%s" is trying to redefine it.`
};
function createError(code, ...args) {
  const error = new Error(sprintf(errors[code] ?? `Unsupported Orama Error code: ${code}`, ...args));
  error.code = code;
  if ("captureStackTrace" in Error.prototype) {
    Error.captureStackTrace(error);
  }
  return error;
}

// node_modules/@orama/orama/dist/browser/components/defaults.js
function formatElapsedTime(n) {
  return {
    raw: Number(n),
    formatted: formatNanoseconds(n)
  };
}
function getDocumentIndexId(doc) {
  if (doc.id) {
    if (typeof doc.id !== "string") {
      throw createError("DOCUMENT_ID_MUST_BE_STRING", typeof doc.id);
    }
    return doc.id;
  }
  return uniqueId();
}
function validateSchema(doc, schema) {
  for (const [prop, type] of Object.entries(schema)) {
    const value = doc[prop];
    if (typeof value === "undefined") {
      continue;
    }
    if (type === "geopoint" && typeof value === "object" && typeof value.lon === "number" && typeof value.lat === "number") {
      continue;
    }
    if (type === "enum" && (typeof value === "string" || typeof value === "number")) {
      continue;
    }
    if (type === "enum[]" && Array.isArray(value)) {
      const valueLength = value.length;
      for (let i = 0; i < valueLength; i++) {
        if (typeof value[i] !== "string" && typeof value[i] !== "number") {
          return prop + "." + i;
        }
      }
      continue;
    }
    if (isVectorType(type)) {
      const vectorSize = getVectorSize(type);
      if (!Array.isArray(value) || value.length !== vectorSize) {
        throw createError("INVALID_INPUT_VECTOR", prop, vectorSize, value.length);
      }
      continue;
    }
    if (isArrayType(type)) {
      if (!Array.isArray(value)) {
        return prop;
      }
      const expectedType = getInnerType(type);
      const valueLength = value.length;
      for (let i = 0; i < valueLength; i++) {
        if (typeof value[i] !== expectedType) {
          return prop + "." + i;
        }
      }
      continue;
    }
    if (typeof type === "object") {
      if (!value || typeof value !== "object") {
        return prop;
      }
      const subProp = validateSchema(value, type);
      if (subProp) {
        return prop + "." + subProp;
      }
      continue;
    }
    if (typeof value !== type) {
      return prop;
    }
  }
  return void 0;
}
var IS_ARRAY_TYPE = {
  string: false,
  number: false,
  boolean: false,
  enum: false,
  geopoint: false,
  "string[]": true,
  "number[]": true,
  "boolean[]": true,
  "enum[]": true
};
var INNER_TYPE = {
  "string[]": "string",
  "number[]": "number",
  "boolean[]": "boolean",
  "enum[]": "enum"
};
function isGeoPointType(type) {
  return type === "geopoint";
}
function isVectorType(type) {
  return typeof type === "string" && /^vector\[\d+\]$/.test(type);
}
function isArrayType(type) {
  return typeof type === "string" && IS_ARRAY_TYPE[type];
}
function getInnerType(type) {
  return INNER_TYPE[type];
}
function getVectorSize(type) {
  const size = Number(type.slice(7, -1));
  switch (true) {
    case isNaN(size):
      throw createError("INVALID_VECTOR_VALUE", type);
    case size <= 0:
      throw createError("INVALID_VECTOR_SIZE", type);
    default:
      return size;
  }
}

// node_modules/@orama/orama/dist/browser/components/internal-document-id-store.js
function createInternalDocumentIDStore() {
  return {
    idToInternalId: /* @__PURE__ */ new Map(),
    internalIdToId: [],
    save,
    load
  };
}
function save(store2) {
  return {
    internalIdToId: store2.internalIdToId
  };
}
function load(orama, raw) {
  const { internalIdToId } = raw;
  orama.internalDocumentIDStore.idToInternalId.clear();
  orama.internalDocumentIDStore.internalIdToId = [];
  const internalIdToIdLength = internalIdToId.length;
  for (let i = 0; i < internalIdToIdLength; i++) {
    const internalIdItem = internalIdToId[i];
    orama.internalDocumentIDStore.idToInternalId.set(internalIdItem, i + 1);
    orama.internalDocumentIDStore.internalIdToId.push(internalIdItem);
  }
}
function getInternalDocumentId(store2, id) {
  if (typeof id === "string") {
    const internalId = store2.idToInternalId.get(id);
    if (internalId) {
      return internalId;
    }
    const currentId = store2.idToInternalId.size + 1;
    store2.idToInternalId.set(id, currentId);
    store2.internalIdToId.push(id);
    return currentId;
  }
  if (id > store2.internalIdToId.length) {
    return getInternalDocumentId(store2, id.toString());
  }
  return id;
}
function getDocumentIdFromInternalId(store2, internalId) {
  if (store2.internalIdToId.length < internalId) {
    throw new Error(`Invalid internalId ${internalId}`);
  }
  return store2.internalIdToId[internalId - 1];
}

// node_modules/@orama/orama/dist/browser/components/documents-store.js
function create(_, sharedInternalDocumentStore) {
  return {
    sharedInternalDocumentStore,
    docs: {},
    count: 0
  };
}
function get(store2, id) {
  const internalId = getInternalDocumentId(store2.sharedInternalDocumentStore, id);
  return store2.docs[internalId];
}
function getMultiple(store2, ids) {
  const idsLength = ids.length;
  const found = Array.from({ length: idsLength });
  for (let i = 0; i < idsLength; i++) {
    const internalId = getInternalDocumentId(store2.sharedInternalDocumentStore, ids[i]);
    found[i] = store2.docs[internalId];
  }
  return found;
}
function getAll(store2) {
  return store2.docs;
}
function store(store2, id, internalId, doc) {
  if (typeof store2.docs[internalId] !== "undefined") {
    return false;
  }
  store2.docs[internalId] = doc;
  store2.count++;
  return true;
}
function remove(store2, id) {
  const internalId = getInternalDocumentId(store2.sharedInternalDocumentStore, id);
  if (typeof store2.docs[internalId] === "undefined") {
    return false;
  }
  delete store2.docs[internalId];
  store2.count--;
  return true;
}
function count(store2) {
  return store2.count;
}
function load2(sharedInternalDocumentStore, raw) {
  const rawDocument = raw;
  return {
    docs: rawDocument.docs,
    count: rawDocument.count,
    sharedInternalDocumentStore
  };
}
function save2(store2) {
  return {
    docs: store2.docs,
    count: store2.count
  };
}
function createDocumentsStore() {
  return {
    create,
    get,
    getMultiple,
    getAll,
    store,
    remove,
    count,
    load: load2,
    save: save2
  };
}

// node_modules/@orama/orama/dist/browser/components/plugins.js
var AVAILABLE_PLUGIN_HOOKS = [
  "beforeInsert",
  "afterInsert",
  "beforeRemove",
  "afterRemove",
  "beforeUpdate",
  "afterUpdate",
  "beforeUpsert",
  "afterUpsert",
  "beforeSearch",
  "afterSearch",
  "beforeInsertMultiple",
  "afterInsertMultiple",
  "beforeRemoveMultiple",
  "afterRemoveMultiple",
  "beforeUpdateMultiple",
  "afterUpdateMultiple",
  "beforeUpsertMultiple",
  "afterUpsertMultiple",
  "beforeLoad",
  "afterLoad",
  "afterCreate"
];
function getAllPluginsByHook(orama, hook) {
  const pluginsToRun = [];
  const pluginsLength = orama.plugins?.length;
  if (!pluginsLength) {
    return pluginsToRun;
  }
  for (let i = 0; i < pluginsLength; i++) {
    try {
      const plugin = orama.plugins[i];
      if (typeof plugin[hook] === "function") {
        pluginsToRun.push(plugin[hook]);
      }
    } catch (error) {
      console.error("Caught error in getAllPluginsByHook:", error);
      throw createError("PLUGIN_CRASHED");
    }
  }
  return pluginsToRun;
}

// node_modules/@orama/orama/dist/browser/components/hooks.js
var OBJECT_COMPONENTS = ["tokenizer", "index", "documentsStore", "sorter", "pinning"];
var FUNCTION_COMPONENTS = [
  "validateSchema",
  "getDocumentIndexId",
  "getDocumentProperties",
  "formatElapsedTime"
];
function runSingleHook(hooks, orama, id, doc) {
  const needAsync = hooks.some(isAsyncFunction);
  if (needAsync) {
    return (async () => {
      for (const hook of hooks) {
        await hook(orama, id, doc);
      }
    })();
  } else {
    for (const hook of hooks) {
      hook(orama, id, doc);
    }
  }
}
function runMultipleHook(hooks, orama, docsOrIds) {
  const needAsync = hooks.some(isAsyncFunction);
  if (needAsync) {
    return (async () => {
      for (const hook of hooks) {
        await hook(orama, docsOrIds);
      }
    })();
  } else {
    for (const hook of hooks) {
      hook(orama, docsOrIds);
    }
  }
}
function runAfterSearch(hooks, db, params, language, results) {
  const needAsync = hooks.some(isAsyncFunction);
  if (needAsync) {
    return (async () => {
      for (const hook of hooks) {
        await hook(db, params, language, results);
      }
    })();
  } else {
    for (const hook of hooks) {
      hook(db, params, language, results);
    }
  }
}
function runBeforeSearch(hooks, db, params, language) {
  const needAsync = hooks.some(isAsyncFunction);
  if (needAsync) {
    return (async () => {
      for (const hook of hooks) {
        await hook(db, params, language);
      }
    })();
  } else {
    for (const hook of hooks) {
      hook(db, params, language);
    }
  }
}
function runAfterCreate(hooks, db) {
  const needAsync = hooks.some(isAsyncFunction);
  if (needAsync) {
    return (async () => {
      for (const hook of hooks) {
        await hook(db);
      }
    })();
  } else {
    for (const hook of hooks) {
      hook(db);
    }
  }
}

// node_modules/@orama/orama/dist/browser/trees/avl.js
var AVLNode = class _AVLNode {
  k;
  v;
  l = null;
  r = null;
  h = 1;
  constructor(key, value) {
    this.k = key;
    this.v = new Set(value);
  }
  updateHeight() {
    this.h = Math.max(_AVLNode.getHeight(this.l), _AVLNode.getHeight(this.r)) + 1;
  }
  static getHeight(node) {
    return node ? node.h : 0;
  }
  getBalanceFactor() {
    return _AVLNode.getHeight(this.l) - _AVLNode.getHeight(this.r);
  }
  rotateLeft() {
    const newRoot = this.r;
    this.r = newRoot.l;
    newRoot.l = this;
    this.updateHeight();
    newRoot.updateHeight();
    return newRoot;
  }
  rotateRight() {
    const newRoot = this.l;
    this.l = newRoot.r;
    newRoot.r = this;
    this.updateHeight();
    newRoot.updateHeight();
    return newRoot;
  }
  toJSON() {
    return {
      k: this.k,
      v: Array.from(this.v),
      l: this.l ? this.l.toJSON() : null,
      r: this.r ? this.r.toJSON() : null,
      h: this.h
    };
  }
  static fromJSON(json) {
    const node = new _AVLNode(json.k, json.v);
    node.l = json.l ? _AVLNode.fromJSON(json.l) : null;
    node.r = json.r ? _AVLNode.fromJSON(json.r) : null;
    node.h = json.h;
    return node;
  }
};
var AVLTree = class _AVLTree {
  root = null;
  insertCount = 0;
  constructor(key, value) {
    if (key !== void 0 && value !== void 0) {
      this.root = new AVLNode(key, value);
    }
  }
  insert(key, value, rebalanceThreshold = 1e3) {
    this.root = this.insertNode(this.root, key, value, rebalanceThreshold);
  }
  insertMultiple(key, value, rebalanceThreshold = 1e3) {
    for (const v2 of value) {
      this.insert(key, v2, rebalanceThreshold);
    }
  }
  // Rebalance the tree if the insert count reaches the threshold.
  // This will improve insertion performance since we won't be rebalancing the tree on every insert.
  // When inserting docs using `insertMultiple`, the threshold will be set to the number of docs being inserted.
  // We can force rebalancing the tree by setting the threshold to 1 (default).
  rebalance() {
    if (this.root) {
      this.root = this.rebalanceNode(this.root);
    }
  }
  toJSON() {
    return {
      root: this.root ? this.root.toJSON() : null,
      insertCount: this.insertCount
    };
  }
  static fromJSON(json) {
    const tree = new _AVLTree();
    tree.root = json.root ? AVLNode.fromJSON(json.root) : null;
    tree.insertCount = json.insertCount || 0;
    return tree;
  }
  insertNode(node, key, value, rebalanceThreshold) {
    if (node === null) {
      return new AVLNode(key, [value]);
    }
    const path = [];
    let current = node;
    let parent = null;
    while (current !== null) {
      path.push({ parent, node: current });
      if (key < current.k) {
        if (current.l === null) {
          current.l = new AVLNode(key, [value]);
          path.push({ parent: current, node: current.l });
          break;
        } else {
          parent = current;
          current = current.l;
        }
      } else if (key > current.k) {
        if (current.r === null) {
          current.r = new AVLNode(key, [value]);
          path.push({ parent: current, node: current.r });
          break;
        } else {
          parent = current;
          current = current.r;
        }
      } else {
        current.v.add(value);
        return node;
      }
    }
    let needRebalance = false;
    if (this.insertCount++ % rebalanceThreshold === 0) {
      needRebalance = true;
    }
    for (let i = path.length - 1; i >= 0; i--) {
      const { parent: parent2, node: currentNode } = path[i];
      currentNode.updateHeight();
      if (needRebalance) {
        const rebalancedNode = this.rebalanceNode(currentNode);
        if (parent2) {
          if (parent2.l === currentNode) {
            parent2.l = rebalancedNode;
          } else if (parent2.r === currentNode) {
            parent2.r = rebalancedNode;
          }
        } else {
          node = rebalancedNode;
        }
      }
    }
    return node;
  }
  rebalanceNode(node) {
    const balanceFactor = node.getBalanceFactor();
    if (balanceFactor > 1) {
      if (node.l && node.l.getBalanceFactor() >= 0) {
        return node.rotateRight();
      } else if (node.l) {
        node.l = node.l.rotateLeft();
        return node.rotateRight();
      }
    }
    if (balanceFactor < -1) {
      if (node.r && node.r.getBalanceFactor() <= 0) {
        return node.rotateLeft();
      } else if (node.r) {
        node.r = node.r.rotateRight();
        return node.rotateLeft();
      }
    }
    return node;
  }
  find(key) {
    const node = this.findNodeByKey(key);
    return node ? node.v : null;
  }
  contains(key) {
    return this.find(key) !== null;
  }
  getSize() {
    let count3 = 0;
    const stack = [];
    let current = this.root;
    while (current || stack.length > 0) {
      while (current) {
        stack.push(current);
        current = current.l;
      }
      current = stack.pop();
      count3++;
      current = current.r;
    }
    return count3;
  }
  isBalanced() {
    if (!this.root)
      return true;
    const stack = [this.root];
    while (stack.length > 0) {
      const node = stack.pop();
      const balanceFactor = node.getBalanceFactor();
      if (Math.abs(balanceFactor) > 1) {
        return false;
      }
      if (node.l)
        stack.push(node.l);
      if (node.r)
        stack.push(node.r);
    }
    return true;
  }
  remove(key) {
    this.root = this.removeNode(this.root, key);
  }
  removeDocument(key, id) {
    const node = this.findNodeByKey(key);
    if (!node) {
      return;
    }
    if (node.v.size === 1) {
      this.root = this.removeNode(this.root, key);
    } else {
      node.v = new Set([...node.v.values()].filter((v2) => v2 !== id));
    }
  }
  findNodeByKey(key) {
    let node = this.root;
    while (node) {
      if (key < node.k) {
        node = node.l;
      } else if (key > node.k) {
        node = node.r;
      } else {
        return node;
      }
    }
    return null;
  }
  removeNode(node, key) {
    if (node === null)
      return null;
    const path = [];
    let current = node;
    while (current !== null && current.k !== key) {
      path.push(current);
      if (key < current.k) {
        current = current.l;
      } else {
        current = current.r;
      }
    }
    if (current === null) {
      return node;
    }
    if (current.l === null || current.r === null) {
      const child = current.l ? current.l : current.r;
      if (path.length === 0) {
        node = child;
      } else {
        const parent = path[path.length - 1];
        if (parent.l === current) {
          parent.l = child;
        } else {
          parent.r = child;
        }
      }
    } else {
      let successorParent = current;
      let successor = current.r;
      while (successor.l !== null) {
        successorParent = successor;
        successor = successor.l;
      }
      current.k = successor.k;
      current.v = successor.v;
      if (successorParent.l === successor) {
        successorParent.l = successor.r;
      } else {
        successorParent.r = successor.r;
      }
      current = successorParent;
    }
    path.push(current);
    for (let i = path.length - 1; i >= 0; i--) {
      const currentNode = path[i];
      currentNode.updateHeight();
      const rebalancedNode = this.rebalanceNode(currentNode);
      if (i > 0) {
        const parent = path[i - 1];
        if (parent.l === currentNode) {
          parent.l = rebalancedNode;
        } else if (parent.r === currentNode) {
          parent.r = rebalancedNode;
        }
      } else {
        node = rebalancedNode;
      }
    }
    return node;
  }
  rangeSearch(min, max) {
    const result = /* @__PURE__ */ new Set();
    const stack = [];
    let current = this.root;
    while (current || stack.length > 0) {
      while (current) {
        stack.push(current);
        current = current.l;
      }
      current = stack.pop();
      if (current.k >= min && current.k <= max) {
        for (const value of current.v) {
          result.add(value);
        }
      }
      if (current.k > max) {
        break;
      }
      current = current.r;
    }
    return result;
  }
  greaterThan(key, inclusive = false) {
    const result = /* @__PURE__ */ new Set();
    const stack = [];
    let current = this.root;
    while (current || stack.length > 0) {
      while (current) {
        stack.push(current);
        current = current.r;
      }
      current = stack.pop();
      if (inclusive && current.k >= key || !inclusive && current.k > key) {
        for (const value of current.v) {
          result.add(value);
        }
      } else if (current.k <= key) {
        break;
      }
      current = current.l;
    }
    return result;
  }
  lessThan(key, inclusive = false) {
    const result = /* @__PURE__ */ new Set();
    const stack = [];
    let current = this.root;
    while (current || stack.length > 0) {
      while (current) {
        stack.push(current);
        current = current.l;
      }
      current = stack.pop();
      if (inclusive && current.k <= key || !inclusive && current.k < key) {
        for (const value of current.v) {
          result.add(value);
        }
      } else if (current.k > key) {
        break;
      }
      current = current.r;
    }
    return result;
  }
};

// node_modules/@orama/orama/dist/browser/trees/flat.js
var FlatTree = class _FlatTree {
  numberToDocumentId;
  constructor() {
    this.numberToDocumentId = /* @__PURE__ */ new Map();
  }
  insert(key, value) {
    if (this.numberToDocumentId.has(key)) {
      this.numberToDocumentId.get(key).add(value);
    } else {
      this.numberToDocumentId.set(key, /* @__PURE__ */ new Set([value]));
    }
  }
  find(key) {
    const idSet = this.numberToDocumentId.get(key);
    return idSet ? Array.from(idSet) : null;
  }
  remove(key) {
    this.numberToDocumentId.delete(key);
  }
  removeDocument(id, key) {
    const idSet = this.numberToDocumentId.get(key);
    if (idSet) {
      idSet.delete(id);
      if (idSet.size === 0) {
        this.numberToDocumentId.delete(key);
      }
    }
  }
  contains(key) {
    return this.numberToDocumentId.has(key);
  }
  getSize() {
    let size = 0;
    for (const idSet of this.numberToDocumentId.values()) {
      size += idSet.size;
    }
    return size;
  }
  filter(operation) {
    const operationKeys = Object.keys(operation);
    if (operationKeys.length !== 1) {
      throw new Error("Invalid operation");
    }
    const operationType = operationKeys[0];
    switch (operationType) {
      case "eq": {
        const value = operation[operationType];
        const idSet = this.numberToDocumentId.get(value);
        return idSet ? Array.from(idSet) : [];
      }
      case "in": {
        const values = operation[operationType];
        const resultSet = /* @__PURE__ */ new Set();
        for (const value of values) {
          const idSet = this.numberToDocumentId.get(value);
          if (idSet) {
            for (const id of idSet) {
              resultSet.add(id);
            }
          }
        }
        return Array.from(resultSet);
      }
      case "nin": {
        const excludeValues = new Set(operation[operationType]);
        const resultSet = /* @__PURE__ */ new Set();
        for (const [key, idSet] of this.numberToDocumentId.entries()) {
          if (!excludeValues.has(key)) {
            for (const id of idSet) {
              resultSet.add(id);
            }
          }
        }
        return Array.from(resultSet);
      }
      default:
        throw new Error("Invalid operation");
    }
  }
  filterArr(operation) {
    const operationKeys = Object.keys(operation);
    if (operationKeys.length !== 1) {
      throw new Error("Invalid operation");
    }
    const operationType = operationKeys[0];
    switch (operationType) {
      case "containsAll": {
        const values = operation[operationType];
        const idSets = values.map((value) => this.numberToDocumentId.get(value) ?? /* @__PURE__ */ new Set());
        if (idSets.length === 0)
          return [];
        const intersection = idSets.reduce((prev, curr) => {
          return new Set([...prev].filter((id) => curr.has(id)));
        });
        return Array.from(intersection);
      }
      case "containsAny": {
        const values = operation[operationType];
        const idSets = values.map((value) => this.numberToDocumentId.get(value) ?? /* @__PURE__ */ new Set());
        if (idSets.length === 0)
          return [];
        const union = idSets.reduce((prev, curr) => {
          return /* @__PURE__ */ new Set([...prev, ...curr]);
        });
        return Array.from(union);
      }
      default:
        throw new Error("Invalid operation");
    }
  }
  static fromJSON(json) {
    if (!json.numberToDocumentId) {
      throw new Error("Invalid Flat Tree JSON");
    }
    const tree = new _FlatTree();
    for (const [key, ids] of json.numberToDocumentId) {
      tree.numberToDocumentId.set(key, new Set(ids));
    }
    return tree;
  }
  toJSON() {
    return {
      numberToDocumentId: Array.from(this.numberToDocumentId.entries()).map(([key, idSet]) => [key, Array.from(idSet)])
    };
  }
};

// node_modules/@orama/orama/dist/browser/components/levenshtein.js
function _boundedLevenshtein(term, word, tolerance) {
  if (tolerance < 0)
    return -1;
  if (term === word)
    return 0;
  const m = term.length;
  const n = word.length;
  if (m === 0)
    return n <= tolerance ? n : -1;
  if (n === 0)
    return m <= tolerance ? m : -1;
  const diff = Math.abs(m - n);
  if (term.startsWith(word)) {
    return diff <= tolerance ? diff : -1;
  }
  if (word.startsWith(term)) {
    return 0;
  }
  if (diff > tolerance)
    return -1;
  const matrix = [];
  for (let i = 0; i <= m; i++) {
    matrix[i] = [i];
    for (let j = 1; j <= n; j++) {
      matrix[i][j] = i === 0 ? j : 0;
    }
  }
  for (let i = 1; i <= m; i++) {
    let rowMin = Infinity;
    for (let j = 1; j <= n; j++) {
      if (term[i - 1] === word[j - 1]) {
        matrix[i][j] = matrix[i - 1][j - 1];
      } else {
        matrix[i][j] = Math.min(
          matrix[i - 1][j] + 1,
          // deletion
          matrix[i][j - 1] + 1,
          // insertion
          matrix[i - 1][j - 1] + 1
          // substitution
        );
      }
      rowMin = Math.min(rowMin, matrix[i][j]);
    }
    if (rowMin > tolerance) {
      return -1;
    }
  }
  return matrix[m][n] <= tolerance ? matrix[m][n] : -1;
}
function syncBoundedLevenshtein(term, w, tolerance) {
  const distance = _boundedLevenshtein(term, w, tolerance);
  return {
    distance,
    isBounded: distance >= 0
  };
}

// node_modules/@orama/orama/dist/browser/trees/radix.js
var RadixNode = class _RadixNode {
  // Node key
  k;
  // Node subword
  s;
  // Node children
  c = /* @__PURE__ */ new Map();
  // Node documents
  d = /* @__PURE__ */ new Set();
  // Node end
  e;
  // Node word
  w = "";
  constructor(key, subWord, end) {
    this.k = key;
    this.s = subWord;
    this.e = end;
  }
  updateParent(parent) {
    this.w = parent.w + this.s;
  }
  addDocument(docID) {
    this.d.add(docID);
  }
  removeDocument(docID) {
    return this.d.delete(docID);
  }
  findAllWords(output, term, exact, tolerance) {
    const stack = [this];
    while (stack.length > 0) {
      const node = stack.pop();
      if (node.e) {
        const { w, d: docIDs } = node;
        if (exact && w !== term) {
          continue;
        }
        if (getOwnProperty(output, w) !== null) {
          if (tolerance) {
            const difference = Math.abs(term.length - w.length);
            if (difference <= tolerance && syncBoundedLevenshtein(term, w, tolerance).isBounded) {
              output[w] = [];
            } else {
              continue;
            }
          } else {
            output[w] = [];
          }
        }
        if (getOwnProperty(output, w) != null && docIDs.size > 0) {
          const docs = output[w];
          for (const docID of docIDs) {
            if (!docs.includes(docID)) {
              docs.push(docID);
            }
          }
        }
      }
      if (node.c.size > 0) {
        stack.push(...node.c.values());
      }
    }
    return output;
  }
  insert(word, docId) {
    let node = this;
    let i = 0;
    const wordLength = word.length;
    while (i < wordLength) {
      const currentCharacter = word[i];
      const childNode = node.c.get(currentCharacter);
      if (childNode) {
        const edgeLabel = childNode.s;
        const edgeLabelLength = edgeLabel.length;
        let j = 0;
        while (j < edgeLabelLength && i + j < wordLength && edgeLabel[j] === word[i + j]) {
          j++;
        }
        if (j === edgeLabelLength) {
          node = childNode;
          i += j;
          if (i === wordLength) {
            if (!childNode.e) {
              childNode.e = true;
            }
            childNode.addDocument(docId);
            return;
          }
          continue;
        }
        const commonPrefix = edgeLabel.slice(0, j);
        const newEdgeLabel = edgeLabel.slice(j);
        const newWordLabel = word.slice(i + j);
        const inbetweenNode = new _RadixNode(commonPrefix[0], commonPrefix, false);
        node.c.set(commonPrefix[0], inbetweenNode);
        inbetweenNode.updateParent(node);
        childNode.s = newEdgeLabel;
        childNode.k = newEdgeLabel[0];
        inbetweenNode.c.set(newEdgeLabel[0], childNode);
        childNode.updateParent(inbetweenNode);
        if (newWordLabel) {
          const newNode = new _RadixNode(newWordLabel[0], newWordLabel, true);
          newNode.addDocument(docId);
          inbetweenNode.c.set(newWordLabel[0], newNode);
          newNode.updateParent(inbetweenNode);
        } else {
          inbetweenNode.e = true;
          inbetweenNode.addDocument(docId);
        }
        return;
      } else {
        const newNode = new _RadixNode(currentCharacter, word.slice(i), true);
        newNode.addDocument(docId);
        node.c.set(currentCharacter, newNode);
        newNode.updateParent(node);
        return;
      }
    }
    if (!node.e) {
      node.e = true;
    }
    node.addDocument(docId);
  }
  _findLevenshtein(term, index, tolerance, originalTolerance, output) {
    const stack = [{ node: this, index, tolerance }];
    while (stack.length > 0) {
      const { node, index: index2, tolerance: tolerance2 } = stack.pop();
      if (node.w.startsWith(term)) {
        node.findAllWords(output, term, false, 0);
        continue;
      }
      if (tolerance2 < 0) {
        continue;
      }
      if (node.e) {
        const { w, d: docIDs } = node;
        if (w) {
          if (syncBoundedLevenshtein(term, w, originalTolerance).isBounded) {
            output[w] = [];
          }
          if (getOwnProperty(output, w) !== void 0 && docIDs.size > 0) {
            const docs = new Set(output[w]);
            for (const docID of docIDs) {
              docs.add(docID);
            }
            output[w] = Array.from(docs);
          }
        }
      }
      if (index2 >= term.length) {
        continue;
      }
      const currentChar = term[index2];
      if (node.c.has(currentChar)) {
        const childNode = node.c.get(currentChar);
        stack.push({ node: childNode, index: index2 + 1, tolerance: tolerance2 });
      }
      stack.push({ node, index: index2 + 1, tolerance: tolerance2 - 1 });
      for (const [character, childNode] of node.c) {
        stack.push({ node: childNode, index: index2, tolerance: tolerance2 - 1 });
        if (character !== currentChar) {
          stack.push({ node: childNode, index: index2 + 1, tolerance: tolerance2 - 1 });
        }
      }
    }
  }
  find(params) {
    const { term, exact, tolerance } = params;
    if (tolerance && !exact) {
      const output = {};
      this._findLevenshtein(term, 0, tolerance, tolerance, output);
      return output;
    } else {
      let node = this;
      let i = 0;
      const termLength = term.length;
      while (i < termLength) {
        const character = term[i];
        const childNode = node.c.get(character);
        if (childNode) {
          const edgeLabel = childNode.s;
          const edgeLabelLength = edgeLabel.length;
          let j = 0;
          while (j < edgeLabelLength && i + j < termLength && edgeLabel[j] === term[i + j]) {
            j++;
          }
          if (j === edgeLabelLength) {
            node = childNode;
            i += j;
          } else if (i + j === termLength) {
            if (j === termLength - i) {
              if (exact) {
                return {};
              } else {
                const output2 = {};
                childNode.findAllWords(output2, term, exact, tolerance);
                return output2;
              }
            } else {
              return {};
            }
          } else {
            return {};
          }
        } else {
          return {};
        }
      }
      const output = {};
      node.findAllWords(output, term, exact, tolerance);
      return output;
    }
  }
  contains(term) {
    let node = this;
    let i = 0;
    const termLength = term.length;
    while (i < termLength) {
      const character = term[i];
      const childNode = node.c.get(character);
      if (childNode) {
        const edgeLabel = childNode.s;
        const edgeLabelLength = edgeLabel.length;
        let j = 0;
        while (j < edgeLabelLength && i + j < termLength && edgeLabel[j] === term[i + j]) {
          j++;
        }
        if (j < edgeLabelLength) {
          return false;
        }
        i += edgeLabelLength;
        node = childNode;
      } else {
        return false;
      }
    }
    return true;
  }
  removeWord(term) {
    if (!term) {
      return false;
    }
    let node = this;
    const termLength = term.length;
    const stack = [];
    for (let i = 0; i < termLength; i++) {
      const character = term[i];
      if (node.c.has(character)) {
        const childNode = node.c.get(character);
        stack.push({ parent: node, character });
        i += childNode.s.length - 1;
        node = childNode;
      } else {
        return false;
      }
    }
    node.d.clear();
    node.e = false;
    while (stack.length > 0 && node.c.size === 0 && !node.e && node.d.size === 0) {
      const { parent, character } = stack.pop();
      parent.c.delete(character);
      node = parent;
    }
    return true;
  }
  removeDocumentByWord(term, docID, exact = true) {
    if (!term) {
      return true;
    }
    let node = this;
    const termLength = term.length;
    for (let i = 0; i < termLength; i++) {
      const character = term[i];
      if (node.c.has(character)) {
        const childNode = node.c.get(character);
        i += childNode.s.length - 1;
        node = childNode;
        if (exact && node.w !== term) {
        } else {
          node.removeDocument(docID);
        }
      } else {
        return false;
      }
    }
    return true;
  }
  static getCommonPrefix(a, b) {
    const len = Math.min(a.length, b.length);
    let i = 0;
    while (i < len && a.charCodeAt(i) === b.charCodeAt(i)) {
      i++;
    }
    return a.slice(0, i);
  }
  toJSON() {
    return {
      w: this.w,
      s: this.s,
      e: this.e,
      k: this.k,
      d: Array.from(this.d),
      c: Array.from(this.c?.entries())?.map(([key, node]) => [key, node.toJSON()])
    };
  }
  static fromJSON(json) {
    const node = new _RadixNode(json.k, json.s, json.e);
    node.w = json.w;
    node.d = new Set(json.d);
    node.c = new Map(json?.c?.map(([key, nodeJson]) => [key, _RadixNode.fromJSON(nodeJson)]) || []);
    return node;
  }
};
var RadixTree = class _RadixTree extends RadixNode {
  constructor() {
    super("", "", false);
  }
  static fromJSON(json) {
    const tree = new _RadixTree();
    tree.w = json.w;
    tree.s = json.s;
    tree.e = json.e;
    tree.k = json.k;
    tree.d = new Set(json.d);
    tree.c = new Map(json?.c?.map(([key, nodeJson]) => [key, RadixNode.fromJSON(nodeJson)]) || []);
    return tree;
  }
  toJSON() {
    return super.toJSON();
  }
};

// node_modules/@orama/orama/dist/browser/trees/bkd.js
var K = 2;
var EARTH_RADIUS = 6371e3;
var BKDNode = class _BKDNode {
  point;
  docIDs;
  left;
  right;
  parent;
  constructor(point, docIDs) {
    this.point = point;
    this.docIDs = new Set(docIDs);
    this.left = null;
    this.right = null;
    this.parent = null;
  }
  toJSON() {
    return {
      point: this.point,
      docIDs: Array.from(this.docIDs),
      left: this.left ? this.left.toJSON() : null,
      right: this.right ? this.right.toJSON() : null
    };
  }
  static fromJSON(json, parent = null) {
    const node = new _BKDNode(json.point, json.docIDs);
    node.parent = parent;
    if (json.left) {
      node.left = _BKDNode.fromJSON(json.left, node);
    }
    if (json.right) {
      node.right = _BKDNode.fromJSON(json.right, node);
    }
    return node;
  }
};
var BKDTree = class _BKDTree {
  root;
  nodeMap;
  constructor() {
    this.root = null;
    this.nodeMap = /* @__PURE__ */ new Map();
  }
  getPointKey(point) {
    return `${point.lon},${point.lat}`;
  }
  insert(point, docIDs) {
    const pointKey = this.getPointKey(point);
    const existingNode = this.nodeMap.get(pointKey);
    if (existingNode) {
      docIDs.forEach((id) => existingNode.docIDs.add(id));
      return;
    }
    const newNode = new BKDNode(point, docIDs);
    this.nodeMap.set(pointKey, newNode);
    if (this.root == null) {
      this.root = newNode;
      return;
    }
    let node = this.root;
    let depth = 0;
    while (true) {
      const axis = depth % K;
      if (axis === 0) {
        if (point.lon < node.point.lon) {
          if (node.left == null) {
            node.left = newNode;
            newNode.parent = node;
            return;
          }
          node = node.left;
        } else {
          if (node.right == null) {
            node.right = newNode;
            newNode.parent = node;
            return;
          }
          node = node.right;
        }
      } else {
        if (point.lat < node.point.lat) {
          if (node.left == null) {
            node.left = newNode;
            newNode.parent = node;
            return;
          }
          node = node.left;
        } else {
          if (node.right == null) {
            node.right = newNode;
            newNode.parent = node;
            return;
          }
          node = node.right;
        }
      }
      depth++;
    }
  }
  contains(point) {
    const pointKey = this.getPointKey(point);
    return this.nodeMap.has(pointKey);
  }
  getDocIDsByCoordinates(point) {
    const pointKey = this.getPointKey(point);
    const node = this.nodeMap.get(pointKey);
    if (node) {
      return Array.from(node.docIDs);
    }
    return null;
  }
  removeDocByID(point, docID) {
    const pointKey = this.getPointKey(point);
    const node = this.nodeMap.get(pointKey);
    if (node) {
      node.docIDs.delete(docID);
      if (node.docIDs.size === 0) {
        this.nodeMap.delete(pointKey);
        this.deleteNode(node);
      }
    }
  }
  deleteNode(node) {
    const parent = node.parent;
    const child = node.left ? node.left : node.right;
    if (child) {
      child.parent = parent;
    }
    if (parent) {
      if (parent.left === node) {
        parent.left = child;
      } else if (parent.right === node) {
        parent.right = child;
      }
    } else {
      this.root = child;
      if (this.root) {
        this.root.parent = null;
      }
    }
  }
  searchByRadius(center, radius, inclusive = true, sort = "asc", highPrecision = false) {
    const distanceFn = highPrecision ? _BKDTree.vincentyDistance : _BKDTree.haversineDistance;
    const stack = [{ node: this.root, depth: 0 }];
    const result = [];
    while (stack.length > 0) {
      const { node, depth } = stack.pop();
      if (node == null)
        continue;
      const dist = distanceFn(center, node.point);
      if (inclusive ? dist <= radius : dist > radius) {
        result.push({ point: node.point, docIDs: Array.from(node.docIDs) });
      }
      if (node.left != null) {
        stack.push({ node: node.left, depth: depth + 1 });
      }
      if (node.right != null) {
        stack.push({ node: node.right, depth: depth + 1 });
      }
    }
    if (sort) {
      result.sort((a, b) => {
        const distA = distanceFn(center, a.point);
        const distB = distanceFn(center, b.point);
        return sort.toLowerCase() === "asc" ? distA - distB : distB - distA;
      });
    }
    return result;
  }
  searchByPolygon(polygon, inclusive = true, sort = null, highPrecision = false) {
    const stack = [{ node: this.root, depth: 0 }];
    const result = [];
    while (stack.length > 0) {
      const { node, depth } = stack.pop();
      if (node == null)
        continue;
      if (node.left != null) {
        stack.push({ node: node.left, depth: depth + 1 });
      }
      if (node.right != null) {
        stack.push({ node: node.right, depth: depth + 1 });
      }
      const isInsidePolygon = _BKDTree.isPointInPolygon(polygon, node.point);
      if (isInsidePolygon && inclusive || !isInsidePolygon && !inclusive) {
        result.push({ point: node.point, docIDs: Array.from(node.docIDs) });
      }
    }
    const centroid = _BKDTree.calculatePolygonCentroid(polygon);
    if (sort) {
      const distanceFn = highPrecision ? _BKDTree.vincentyDistance : _BKDTree.haversineDistance;
      result.sort((a, b) => {
        const distA = distanceFn(centroid, a.point);
        const distB = distanceFn(centroid, b.point);
        return sort.toLowerCase() === "asc" ? distA - distB : distB - distA;
      });
    }
    return result;
  }
  toJSON() {
    return {
      root: this.root ? this.root.toJSON() : null
    };
  }
  static fromJSON(json) {
    const tree = new _BKDTree();
    if (json.root) {
      tree.root = BKDNode.fromJSON(json.root);
      tree.buildNodeMap(tree.root);
    }
    return tree;
  }
  buildNodeMap(node) {
    if (node == null)
      return;
    const pointKey = this.getPointKey(node.point);
    this.nodeMap.set(pointKey, node);
    if (node.left) {
      this.buildNodeMap(node.left);
    }
    if (node.right) {
      this.buildNodeMap(node.right);
    }
  }
  static calculatePolygonCentroid(polygon) {
    let totalArea = 0;
    let centroidX = 0;
    let centroidY = 0;
    const polygonLength = polygon.length;
    for (let i = 0, j = polygonLength - 1; i < polygonLength; j = i++) {
      const xi = polygon[i].lon;
      const yi = polygon[i].lat;
      const xj = polygon[j].lon;
      const yj = polygon[j].lat;
      const areaSegment = xi * yj - xj * yi;
      totalArea += areaSegment;
      centroidX += (xi + xj) * areaSegment;
      centroidY += (yi + yj) * areaSegment;
    }
    totalArea /= 2;
    const centroidCoordinate = 6 * totalArea;
    centroidX /= centroidCoordinate;
    centroidY /= centroidCoordinate;
    return { lon: centroidX, lat: centroidY };
  }
  static isPointInPolygon(polygon, point) {
    let isInside = false;
    const x = point.lon;
    const y = point.lat;
    const polygonLength = polygon.length;
    for (let i = 0, j = polygonLength - 1; i < polygonLength; j = i++) {
      const xi = polygon[i].lon;
      const yi = polygon[i].lat;
      const xj = polygon[j].lon;
      const yj = polygon[j].lat;
      const intersect2 = yi > y !== yj > y && x < (xj - xi) * (y - yi) / (yj - yi) + xi;
      if (intersect2)
        isInside = !isInside;
    }
    return isInside;
  }
  static haversineDistance(coord1, coord2) {
    const P = Math.PI / 180;
    const lat1 = coord1.lat * P;
    const lat2 = coord2.lat * P;
    const deltaLat = (coord2.lat - coord1.lat) * P;
    const deltaLon = (coord2.lon - coord1.lon) * P;
    const a = Math.sin(deltaLat / 2) * Math.sin(deltaLat / 2) + Math.cos(lat1) * Math.cos(lat2) * Math.sin(deltaLon / 2) * Math.sin(deltaLon / 2);
    const c2 = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return EARTH_RADIUS * c2;
  }
  static vincentyDistance(coord1, coord2) {
    const a = 6378137;
    const f = 1 / 298.257223563;
    const b = (1 - f) * a;
    const P = Math.PI / 180;
    const lat1 = coord1.lat * P;
    const lat2 = coord2.lat * P;
    const deltaLon = (coord2.lon - coord1.lon) * P;
    const U1 = Math.atan((1 - f) * Math.tan(lat1));
    const U2 = Math.atan((1 - f) * Math.tan(lat2));
    const sinU1 = Math.sin(U1);
    const cosU1 = Math.cos(U1);
    const sinU2 = Math.sin(U2);
    const cosU2 = Math.cos(U2);
    let lambda = deltaLon;
    let prevLambda;
    let iterationLimit = 1e3;
    let sinSigma;
    let cosSigma;
    let sigma;
    let sinAlpha;
    let cos2Alpha;
    let cos2SigmaM;
    do {
      const sinLambda = Math.sin(lambda);
      const cosLambda = Math.cos(lambda);
      sinSigma = Math.sqrt(cosU2 * sinLambda * (cosU2 * sinLambda) + (cosU1 * sinU2 - sinU1 * cosU2 * cosLambda) * (cosU1 * sinU2 - sinU1 * cosU2 * cosLambda));
      if (sinSigma === 0)
        return 0;
      cosSigma = sinU1 * sinU2 + cosU1 * cosU2 * cosLambda;
      sigma = Math.atan2(sinSigma, cosSigma);
      sinAlpha = cosU1 * cosU2 * sinLambda / sinSigma;
      cos2Alpha = 1 - sinAlpha * sinAlpha;
      cos2SigmaM = cosSigma - 2 * sinU1 * sinU2 / cos2Alpha;
      if (isNaN(cos2SigmaM))
        cos2SigmaM = 0;
      const C2 = f / 16 * cos2Alpha * (4 + f * (4 - 3 * cos2Alpha));
      prevLambda = lambda;
      lambda = deltaLon + (1 - C2) * f * sinAlpha * (sigma + C2 * sinSigma * (cos2SigmaM + C2 * cosSigma * (-1 + 2 * cos2SigmaM * cos2SigmaM)));
    } while (Math.abs(lambda - prevLambda) > 1e-12 && --iterationLimit > 0);
    if (iterationLimit === 0) {
      return NaN;
    }
    const uSquared = cos2Alpha * (a * a - b * b) / (b * b);
    const A = 1 + uSquared / 16384 * (4096 + uSquared * (-768 + uSquared * (320 - 175 * uSquared)));
    const B = uSquared / 1024 * (256 + uSquared * (-128 + uSquared * (74 - 47 * uSquared)));
    const deltaSigma = B * sinSigma * (cos2SigmaM + B / 4 * (cosSigma * (-1 + 2 * cos2SigmaM * cos2SigmaM) - B / 6 * cos2SigmaM * (-3 + 4 * sinSigma * sinSigma) * (-3 + 4 * cos2SigmaM * cos2SigmaM)));
    const s = b * A * (sigma - deltaSigma);
    return s;
  }
};

// node_modules/@orama/orama/dist/browser/trees/bool.js
var BoolNode = class _BoolNode {
  true;
  false;
  constructor() {
    this.true = /* @__PURE__ */ new Set();
    this.false = /* @__PURE__ */ new Set();
  }
  insert(value, bool) {
    if (bool) {
      this.true.add(value);
    } else {
      this.false.add(value);
    }
  }
  delete(value, bool) {
    if (bool) {
      this.true.delete(value);
    } else {
      this.false.delete(value);
    }
  }
  getSize() {
    return this.true.size + this.false.size;
  }
  toJSON() {
    return {
      true: Array.from(this.true),
      false: Array.from(this.false)
    };
  }
  static fromJSON(json) {
    const node = new _BoolNode();
    node.true = new Set(json.true);
    node.false = new Set(json.false);
    return node;
  }
};

// node_modules/@orama/orama/dist/browser/components/algorithms.js
function BM25(tf, matchingCount, docsCount, fieldLength, averageFieldLength, { k, b, d }) {
  const idf = Math.log(1 + (docsCount - matchingCount + 0.5) / (matchingCount + 0.5));
  return idf * (d + tf * (k + 1)) / (tf + k * (1 - b + b * fieldLength / averageFieldLength));
}

// node_modules/@orama/orama/dist/browser/trees/vector.js
var DEFAULT_SIMILARITY = 0.8;
var VectorIndex = class _VectorIndex {
  size;
  vectors = /* @__PURE__ */ new Map();
  constructor(size) {
    this.size = size;
  }
  add(internalDocumentId, value) {
    if (!(value instanceof Float32Array)) {
      value = new Float32Array(value);
    }
    const magnitude = getMagnitude(value, this.size);
    this.vectors.set(internalDocumentId, [magnitude, value]);
  }
  remove(internalDocumentId) {
    this.vectors.delete(internalDocumentId);
  }
  find(vector, similarity, whereFiltersIDs) {
    if (!(vector instanceof Float32Array)) {
      vector = new Float32Array(vector);
    }
    const results = findSimilarVectors(vector, whereFiltersIDs, this.vectors, this.size, similarity);
    return results;
  }
  toJSON() {
    const vectors = [];
    for (const [id, [magnitude, vector]] of this.vectors) {
      vectors.push([id, [magnitude, Array.from(vector)]]);
    }
    return {
      size: this.size,
      vectors
    };
  }
  static fromJSON(json) {
    const raw = json;
    const index = new _VectorIndex(raw.size);
    for (const [id, [magnitude, vector]] of raw.vectors) {
      index.vectors.set(id, [magnitude, new Float32Array(vector)]);
    }
    return index;
  }
};
function getMagnitude(vector, vectorLength) {
  let magnitude = 0;
  for (let i = 0; i < vectorLength; i++) {
    magnitude += vector[i] * vector[i];
  }
  return Math.sqrt(magnitude);
}
function findSimilarVectors(targetVector, keys, vectors, length, threshold) {
  const targetMagnitude = getMagnitude(targetVector, length);
  const similarVectors = [];
  const base = keys ? keys : vectors.keys();
  for (const vectorId of base) {
    const entry = vectors.get(vectorId);
    if (!entry) {
      continue;
    }
    const magnitude = entry[0];
    const vector = entry[1];
    let dotProduct = 0;
    for (let i = 0; i < length; i++) {
      dotProduct += targetVector[i] * vector[i];
    }
    const similarity = dotProduct / (targetMagnitude * magnitude);
    if (similarity >= threshold) {
      similarVectors.push([vectorId, similarity]);
    }
  }
  return similarVectors;
}

// node_modules/@orama/orama/dist/browser/components/index.js
function insertDocumentScoreParameters(index, prop, id, tokens, docsCount) {
  const internalId = getInternalDocumentId(index.sharedInternalDocumentStore, id);
  index.avgFieldLength[prop] = ((index.avgFieldLength[prop] ?? 0) * (docsCount - 1) + tokens.length) / docsCount;
  index.fieldLengths[prop][internalId] = tokens.length;
  index.frequencies[prop][internalId] = {};
}
function insertTokenScoreParameters(index, prop, id, tokens, token) {
  let tokenFrequency = 0;
  for (const t of tokens) {
    if (t === token) {
      tokenFrequency++;
    }
  }
  const internalId = getInternalDocumentId(index.sharedInternalDocumentStore, id);
  const tf = tokenFrequency / tokens.length;
  index.frequencies[prop][internalId][token] = tf;
  if (!(token in index.tokenOccurrences[prop])) {
    index.tokenOccurrences[prop][token] = 0;
  }
  index.tokenOccurrences[prop][token] = (index.tokenOccurrences[prop][token] ?? 0) + 1;
}
function removeDocumentScoreParameters(index, prop, id, docsCount) {
  const internalId = getInternalDocumentId(index.sharedInternalDocumentStore, id);
  if (docsCount > 1) {
    index.avgFieldLength[prop] = (index.avgFieldLength[prop] * docsCount - index.fieldLengths[prop][internalId]) / (docsCount - 1);
  } else {
    index.avgFieldLength[prop] = void 0;
  }
  index.fieldLengths[prop][internalId] = void 0;
  index.frequencies[prop][internalId] = void 0;
}
function removeTokenScoreParameters(index, prop, token) {
  index.tokenOccurrences[prop][token]--;
}
function create2(orama, sharedInternalDocumentStore, schema, index, prefix = "") {
  if (!index) {
    index = {
      sharedInternalDocumentStore,
      indexes: {},
      vectorIndexes: {},
      searchableProperties: [],
      searchablePropertiesWithTypes: {},
      frequencies: {},
      tokenOccurrences: {},
      avgFieldLength: {},
      fieldLengths: {}
    };
  }
  for (const [prop, type] of Object.entries(schema)) {
    const path = `${prefix}${prefix ? "." : ""}${prop}`;
    if (typeof type === "object" && !Array.isArray(type)) {
      create2(orama, sharedInternalDocumentStore, type, index, path);
      continue;
    }
    if (isVectorType(type)) {
      index.searchableProperties.push(path);
      index.searchablePropertiesWithTypes[path] = type;
      index.vectorIndexes[path] = {
        type: "Vector",
        node: new VectorIndex(getVectorSize(type)),
        isArray: false
      };
    } else {
      const isArray = /\[/.test(type);
      switch (type) {
        case "boolean":
        case "boolean[]":
          index.indexes[path] = { type: "Bool", node: new BoolNode(), isArray };
          break;
        case "number":
        case "number[]":
          index.indexes[path] = { type: "AVL", node: new AVLTree(0, []), isArray };
          break;
        case "string":
        case "string[]":
          index.indexes[path] = { type: "Radix", node: new RadixTree(), isArray };
          index.avgFieldLength[path] = 0;
          index.frequencies[path] = {};
          index.tokenOccurrences[path] = {};
          index.fieldLengths[path] = {};
          break;
        case "enum":
        case "enum[]":
          index.indexes[path] = { type: "Flat", node: new FlatTree(), isArray };
          break;
        case "geopoint":
          index.indexes[path] = { type: "BKD", node: new BKDTree(), isArray };
          break;
        default:
          throw createError("INVALID_SCHEMA_TYPE", Array.isArray(type) ? "array" : type, path);
      }
      index.searchableProperties.push(path);
      index.searchablePropertiesWithTypes[path] = type;
    }
  }
  return index;
}
function insertScalarBuilder(implementation, index, prop, internalId, language, tokenizer, docsCount, options) {
  return (value) => {
    const { type, node } = index.indexes[prop];
    switch (type) {
      case "Bool": {
        node[value ? "true" : "false"].add(internalId);
        break;
      }
      case "AVL": {
        const avlRebalanceThreshold = options?.avlRebalanceThreshold ?? 1;
        node.insert(value, internalId, avlRebalanceThreshold);
        break;
      }
      case "Radix": {
        const tokens = tokenizer.tokenize(value, language, prop, false);
        implementation.insertDocumentScoreParameters(index, prop, internalId, tokens, docsCount);
        for (const token of tokens) {
          implementation.insertTokenScoreParameters(index, prop, internalId, tokens, token);
          node.insert(token, internalId);
        }
        break;
      }
      case "Flat": {
        node.insert(value, internalId);
        break;
      }
      case "BKD": {
        node.insert(value, [internalId]);
        break;
      }
    }
  };
}
function insert(implementation, index, prop, id, internalId, value, schemaType, language, tokenizer, docsCount, options) {
  if (isVectorType(schemaType)) {
    return insertVector(index, prop, value, id, internalId);
  }
  const insertScalar = insertScalarBuilder(implementation, index, prop, internalId, language, tokenizer, docsCount, options);
  if (!isArrayType(schemaType)) {
    return insertScalar(value);
  }
  const elements = value;
  const elementsLength = elements.length;
  for (let i = 0; i < elementsLength; i++) {
    insertScalar(elements[i]);
  }
}
function insertVector(index, prop, value, id, internalDocumentId) {
  index.vectorIndexes[prop].node.add(internalDocumentId, value);
}
function removeScalar(implementation, index, prop, id, internalId, value, schemaType, language, tokenizer, docsCount) {
  if (isVectorType(schemaType)) {
    index.vectorIndexes[prop].node.remove(internalId);
    return true;
  }
  const { type, node } = index.indexes[prop];
  switch (type) {
    case "AVL": {
      node.removeDocument(value, internalId);
      return true;
    }
    case "Bool": {
      node[value ? "true" : "false"].delete(internalId);
      return true;
    }
    case "Radix": {
      const tokens = tokenizer.tokenize(value, language, prop);
      implementation.removeDocumentScoreParameters(index, prop, id, docsCount);
      for (const token of tokens) {
        implementation.removeTokenScoreParameters(index, prop, token);
        node.removeDocumentByWord(token, internalId);
      }
      return true;
    }
    case "Flat": {
      node.removeDocument(internalId, value);
      return true;
    }
    case "BKD": {
      node.removeDocByID(value, internalId);
      return false;
    }
  }
}
function remove2(implementation, index, prop, id, internalId, value, schemaType, language, tokenizer, docsCount) {
  if (!isArrayType(schemaType)) {
    return removeScalar(implementation, index, prop, id, internalId, value, schemaType, language, tokenizer, docsCount);
  }
  const innerSchemaType = getInnerType(schemaType);
  const elements = value;
  const elementsLength = elements.length;
  for (let i = 0; i < elementsLength; i++) {
    removeScalar(implementation, index, prop, id, internalId, elements[i], innerSchemaType, language, tokenizer, docsCount);
  }
  return true;
}
function calculateResultScores(index, prop, term, ids, docsCount, bm25Relevance, resultsMap, boostPerProperty, whereFiltersIDs, keywordMatchesMap) {
  const documentIDs = Array.from(ids);
  const avgFieldLength = index.avgFieldLength[prop];
  const fieldLengths = index.fieldLengths[prop];
  const oramaOccurrences = index.tokenOccurrences[prop];
  const oramaFrequencies = index.frequencies[prop];
  const termOccurrences = typeof oramaOccurrences[term] === "number" ? oramaOccurrences[term] ?? 0 : 0;
  const documentIDsLength = documentIDs.length;
  for (let k = 0; k < documentIDsLength; k++) {
    const internalId = documentIDs[k];
    if (whereFiltersIDs && !whereFiltersIDs.has(internalId)) {
      continue;
    }
    if (!keywordMatchesMap.has(internalId)) {
      keywordMatchesMap.set(internalId, /* @__PURE__ */ new Map());
    }
    const propertyMatches = keywordMatchesMap.get(internalId);
    propertyMatches.set(prop, (propertyMatches.get(prop) || 0) + 1);
    const tf = oramaFrequencies?.[internalId]?.[term] ?? 0;
    const bm25 = BM25(tf, termOccurrences, docsCount, fieldLengths[internalId], avgFieldLength, bm25Relevance);
    if (resultsMap.has(internalId)) {
      resultsMap.set(internalId, resultsMap.get(internalId) + bm25 * boostPerProperty);
    } else {
      resultsMap.set(internalId, bm25 * boostPerProperty);
    }
  }
}
function search(index, term, tokenizer, language, propertiesToSearch, exact, tolerance, boost, relevance, docsCount, whereFiltersIDs, threshold = 0) {
  const tokens = tokenizer.tokenize(term, language);
  const keywordsCount = tokens.length || 1;
  const keywordMatchesMap = /* @__PURE__ */ new Map();
  const tokenFoundMap = /* @__PURE__ */ new Map();
  const resultsMap = /* @__PURE__ */ new Map();
  for (const prop of propertiesToSearch) {
    if (!(prop in index.indexes)) {
      continue;
    }
    const tree = index.indexes[prop];
    const { type } = tree;
    if (type !== "Radix") {
      throw createError("WRONG_SEARCH_PROPERTY_TYPE", prop);
    }
    const boostPerProperty = boost[prop] ?? 1;
    if (boostPerProperty <= 0) {
      throw createError("INVALID_BOOST_VALUE", boostPerProperty);
    }
    if (tokens.length === 0 && !term) {
      tokens.push("");
    }
    const tokenLength = tokens.length;
    for (let i = 0; i < tokenLength; i++) {
      const token = tokens[i];
      const searchResult = tree.node.find({ term: token, exact, tolerance });
      const termsFound = Object.keys(searchResult);
      if (termsFound.length > 0) {
        tokenFoundMap.set(token, true);
      }
      const termsFoundLength = termsFound.length;
      for (let j = 0; j < termsFoundLength; j++) {
        const word = termsFound[j];
        const ids = searchResult[word];
        calculateResultScores(index, prop, word, ids, docsCount, relevance, resultsMap, boostPerProperty, whereFiltersIDs, keywordMatchesMap);
      }
    }
  }
  const results = Array.from(resultsMap.entries()).map(([id, score]) => [id, score]).sort((a, b) => b[1] - a[1]);
  if (results.length === 0) {
    return [];
  }
  if (threshold === 1) {
    return results;
  }
  if (threshold === 0) {
    if (keywordsCount === 1) {
      return results;
    }
    for (const token of tokens) {
      if (!tokenFoundMap.get(token)) {
        return [];
      }
    }
    const fullMatches2 = results.filter(([id]) => {
      const propertyMatches = keywordMatchesMap.get(id);
      if (!propertyMatches)
        return false;
      return Array.from(propertyMatches.values()).some((matches) => matches === keywordsCount);
    });
    return fullMatches2;
  }
  const fullMatches = results.filter(([id]) => {
    const propertyMatches = keywordMatchesMap.get(id);
    if (!propertyMatches)
      return false;
    return Array.from(propertyMatches.values()).some((matches) => matches === keywordsCount);
  });
  if (fullMatches.length > 0) {
    const remainingResults = results.filter(([id]) => !fullMatches.some(([fid]) => fid === id));
    const additionalResults = Math.ceil(remainingResults.length * threshold);
    return [...fullMatches, ...remainingResults.slice(0, additionalResults)];
  }
  return results;
}
function searchByWhereClause(index, tokenizer, filters, language) {
  if ("and" in filters && filters.and && Array.isArray(filters.and)) {
    const andFilters = filters.and;
    if (andFilters.length === 0) {
      return /* @__PURE__ */ new Set();
    }
    const results = andFilters.map((filter) => searchByWhereClause(index, tokenizer, filter, language));
    return setIntersection(...results);
  }
  if ("or" in filters && filters.or && Array.isArray(filters.or)) {
    const orFilters = filters.or;
    if (orFilters.length === 0) {
      return /* @__PURE__ */ new Set();
    }
    const results = orFilters.map((filter) => searchByWhereClause(index, tokenizer, filter, language));
    return results.reduce((acc, set) => setUnion(acc, set), /* @__PURE__ */ new Set());
  }
  if ("not" in filters && filters.not) {
    const notFilter = filters.not;
    const allDocs = /* @__PURE__ */ new Set();
    const docsStore = index.sharedInternalDocumentStore;
    for (let i = 1; i <= docsStore.internalIdToId.length; i++) {
      allDocs.add(i);
    }
    const notResult = searchByWhereClause(index, tokenizer, notFilter, language);
    return setDifference(allDocs, notResult);
  }
  const filterKeys = Object.keys(filters);
  const filtersMap = filterKeys.reduce((acc, key) => ({
    [key]: /* @__PURE__ */ new Set(),
    ...acc
  }), {});
  for (const param of filterKeys) {
    const operation = filters[param];
    if (typeof index.indexes[param] === "undefined") {
      throw createError("UNKNOWN_FILTER_PROPERTY", param);
    }
    const { node, type, isArray } = index.indexes[param];
    if (type === "Bool") {
      const idx = node;
      const filteredIDs = operation ? idx.true : idx.false;
      filtersMap[param] = setUnion(filtersMap[param], filteredIDs);
      continue;
    }
    if (type === "BKD") {
      let reqOperation;
      if ("radius" in operation) {
        reqOperation = "radius";
      } else if ("polygon" in operation) {
        reqOperation = "polygon";
      } else {
        throw new Error(`Invalid operation ${operation}`);
      }
      if (reqOperation === "radius") {
        const { value, coordinates, unit = "m", inside = true, highPrecision = false } = operation[reqOperation];
        const distanceInMeters = convertDistanceToMeters(value, unit);
        const ids = node.searchByRadius(coordinates, distanceInMeters, inside, void 0, highPrecision);
        filtersMap[param] = addGeoResult(filtersMap[param], ids);
      } else {
        const { coordinates, inside = true, highPrecision = false } = operation[reqOperation];
        const ids = node.searchByPolygon(coordinates, inside, void 0, highPrecision);
        filtersMap[param] = addGeoResult(filtersMap[param], ids);
      }
      continue;
    }
    if (type === "Radix" && (typeof operation === "string" || Array.isArray(operation))) {
      for (const raw of [operation].flat()) {
        const term = tokenizer.tokenize(raw, language, param);
        for (const t of term) {
          const filteredIDsResults = node.find({ term: t, exact: true });
          filtersMap[param] = addFindResult(filtersMap[param], filteredIDsResults);
        }
      }
      continue;
    }
    const operationKeys = Object.keys(operation);
    if (operationKeys.length > 1) {
      throw createError("INVALID_FILTER_OPERATION", operationKeys.length);
    }
    if (type === "Flat") {
      const results = new Set(isArray ? node.filterArr(operation) : node.filter(operation));
      filtersMap[param] = setUnion(filtersMap[param], results);
      continue;
    }
    if (type === "AVL") {
      const operationOpt = operationKeys[0];
      const operationValue = operation[operationOpt];
      let filteredIDs;
      switch (operationOpt) {
        case "gt": {
          filteredIDs = node.greaterThan(operationValue, false);
          break;
        }
        case "gte": {
          filteredIDs = node.greaterThan(operationValue, true);
          break;
        }
        case "lt": {
          filteredIDs = node.lessThan(operationValue, false);
          break;
        }
        case "lte": {
          filteredIDs = node.lessThan(operationValue, true);
          break;
        }
        case "eq": {
          const ret = node.find(operationValue);
          filteredIDs = ret ?? /* @__PURE__ */ new Set();
          break;
        }
        case "between": {
          const [min, max] = operationValue;
          filteredIDs = node.rangeSearch(min, max);
          break;
        }
        default:
          throw createError("INVALID_FILTER_OPERATION", operationOpt);
      }
      filtersMap[param] = setUnion(filtersMap[param], filteredIDs);
    }
  }
  return setIntersection(...Object.values(filtersMap));
}
function getSearchableProperties(index) {
  return index.searchableProperties;
}
function getSearchablePropertiesWithTypes(index) {
  return index.searchablePropertiesWithTypes;
}
function load3(sharedInternalDocumentStore, raw) {
  const { indexes: rawIndexes, vectorIndexes: rawVectorIndexes, searchableProperties, searchablePropertiesWithTypes, frequencies, tokenOccurrences, avgFieldLength, fieldLengths } = raw;
  const indexes = {};
  const vectorIndexes = {};
  for (const prop of Object.keys(rawIndexes)) {
    const { node, type, isArray } = rawIndexes[prop];
    switch (type) {
      case "Radix":
        indexes[prop] = {
          type: "Radix",
          node: RadixTree.fromJSON(node),
          isArray
        };
        break;
      case "Flat":
        indexes[prop] = {
          type: "Flat",
          node: FlatTree.fromJSON(node),
          isArray
        };
        break;
      case "AVL":
        indexes[prop] = {
          type: "AVL",
          node: AVLTree.fromJSON(node),
          isArray
        };
        break;
      case "BKD":
        indexes[prop] = {
          type: "BKD",
          node: BKDTree.fromJSON(node),
          isArray
        };
        break;
      case "Bool":
        indexes[prop] = {
          type: "Bool",
          node: BoolNode.fromJSON(node),
          isArray
        };
        break;
      default:
        indexes[prop] = rawIndexes[prop];
    }
  }
  for (const idx of Object.keys(rawVectorIndexes)) {
    vectorIndexes[idx] = {
      type: "Vector",
      isArray: false,
      node: VectorIndex.fromJSON(rawVectorIndexes[idx])
    };
  }
  return {
    sharedInternalDocumentStore,
    indexes,
    vectorIndexes,
    searchableProperties,
    searchablePropertiesWithTypes,
    frequencies,
    tokenOccurrences,
    avgFieldLength,
    fieldLengths
  };
}
function save3(index) {
  const { indexes, vectorIndexes, searchableProperties, searchablePropertiesWithTypes, frequencies, tokenOccurrences, avgFieldLength, fieldLengths } = index;
  const dumpVectorIndexes = {};
  for (const idx of Object.keys(vectorIndexes)) {
    dumpVectorIndexes[idx] = vectorIndexes[idx].node.toJSON();
  }
  const savedIndexes = {};
  for (const name of Object.keys(indexes)) {
    const { type, node, isArray } = indexes[name];
    if (type === "Flat" || type === "Radix" || type === "AVL" || type === "BKD" || type === "Bool") {
      savedIndexes[name] = {
        type,
        node: node.toJSON(),
        isArray
      };
    } else {
      savedIndexes[name] = indexes[name];
      savedIndexes[name].node = savedIndexes[name].node.toJSON();
    }
  }
  return {
    indexes: savedIndexes,
    vectorIndexes: dumpVectorIndexes,
    searchableProperties,
    searchablePropertiesWithTypes,
    frequencies,
    tokenOccurrences,
    avgFieldLength,
    fieldLengths
  };
}
function createIndex() {
  return {
    create: create2,
    insert,
    remove: remove2,
    insertDocumentScoreParameters,
    insertTokenScoreParameters,
    removeDocumentScoreParameters,
    removeTokenScoreParameters,
    calculateResultScores,
    search,
    searchByWhereClause,
    getSearchableProperties,
    getSearchablePropertiesWithTypes,
    load: load3,
    save: save3
  };
}
function addGeoResult(set, ids) {
  if (!set) {
    set = /* @__PURE__ */ new Set();
  }
  const idsLength = ids.length;
  for (let i = 0; i < idsLength; i++) {
    const entry = ids[i].docIDs;
    const idsLength2 = entry.length;
    for (let j = 0; j < idsLength2; j++) {
      set.add(entry[j]);
    }
  }
  return set;
}
function createGeoTokenScores(ids, centerPoint, highPrecision = false) {
  const distanceFn = highPrecision ? BKDTree.vincentyDistance : BKDTree.haversineDistance;
  const results = [];
  const distances = [];
  for (const { point } of ids) {
    distances.push(distanceFn(centerPoint, point));
  }
  const maxDistance = Math.max(...distances);
  let index = 0;
  for (const { docIDs } of ids) {
    const distance = distances[index];
    const score = maxDistance - distance + 1;
    for (const docID of docIDs) {
      results.push([docID, score]);
    }
    index++;
  }
  results.sort((a, b) => b[1] - a[1]);
  return results;
}
function isGeosearchOnlyQuery(filters, index) {
  const filterKeys = Object.keys(filters);
  if (filterKeys.length !== 1) {
    return { isGeoOnly: false };
  }
  const param = filterKeys[0];
  const operation = filters[param];
  if (typeof index.indexes[param] === "undefined") {
    return { isGeoOnly: false };
  }
  const { type } = index.indexes[param];
  if (type === "BKD" && operation && ("radius" in operation || "polygon" in operation)) {
    return { isGeoOnly: true, geoProperty: param, geoOperation: operation };
  }
  return { isGeoOnly: false };
}
function searchByGeoWhereClause(index, filters) {
  const indexTyped = index;
  const geoInfo = isGeosearchOnlyQuery(filters, indexTyped);
  if (!geoInfo.isGeoOnly || !geoInfo.geoProperty || !geoInfo.geoOperation) {
    return null;
  }
  const { node } = indexTyped.indexes[geoInfo.geoProperty];
  const operation = geoInfo.geoOperation;
  const bkdNode = node;
  let results;
  if ("radius" in operation) {
    const { value, coordinates, unit = "m", inside = true, highPrecision = false } = operation.radius;
    const centerPoint = coordinates;
    const distanceInMeters = convertDistanceToMeters(value, unit);
    results = bkdNode.searchByRadius(centerPoint, distanceInMeters, inside, "asc", highPrecision);
    return createGeoTokenScores(results, centerPoint, highPrecision);
  } else if ("polygon" in operation) {
    const { coordinates, inside = true, highPrecision = false } = operation.polygon;
    results = bkdNode.searchByPolygon(coordinates, inside, "asc", highPrecision);
    const centroid = BKDTree.calculatePolygonCentroid(coordinates);
    return createGeoTokenScores(results, centroid, highPrecision);
  }
  return null;
}
function addFindResult(set, filteredIDsResults) {
  if (!set) {
    set = /* @__PURE__ */ new Set();
  }
  const keys = Object.keys(filteredIDsResults);
  const keysLength = keys.length;
  for (let i = 0; i < keysLength; i++) {
    const ids = filteredIDsResults[keys[i]];
    const idsLength = ids.length;
    for (let j = 0; j < idsLength; j++) {
      set.add(ids[j]);
    }
  }
  return set;
}

// node_modules/@orama/orama/dist/browser/components/sorter.js
function innerCreate(orama, sharedInternalDocumentStore, schema, sortableDeniedProperties, prefix) {
  const sorter = {
    language: orama.tokenizer.language,
    sharedInternalDocumentStore,
    enabled: true,
    isSorted: true,
    sortableProperties: [],
    sortablePropertiesWithTypes: {},
    sorts: {}
  };
  for (const [prop, type] of Object.entries(schema)) {
    const path = `${prefix}${prefix ? "." : ""}${prop}`;
    if (sortableDeniedProperties.includes(path)) {
      continue;
    }
    if (typeof type === "object" && !Array.isArray(type)) {
      const ret = innerCreate(orama, sharedInternalDocumentStore, type, sortableDeniedProperties, path);
      safeArrayPush(sorter.sortableProperties, ret.sortableProperties);
      sorter.sorts = {
        ...sorter.sorts,
        ...ret.sorts
      };
      sorter.sortablePropertiesWithTypes = {
        ...sorter.sortablePropertiesWithTypes,
        ...ret.sortablePropertiesWithTypes
      };
      continue;
    }
    if (!isVectorType(type)) {
      switch (type) {
        case "boolean":
        case "number":
        case "string":
          sorter.sortableProperties.push(path);
          sorter.sortablePropertiesWithTypes[path] = type;
          sorter.sorts[path] = {
            docs: /* @__PURE__ */ new Map(),
            orderedDocsToRemove: /* @__PURE__ */ new Map(),
            orderedDocs: [],
            type
          };
          break;
        case "geopoint":
        case "enum":
          continue;
        case "enum[]":
        case "boolean[]":
        case "number[]":
        case "string[]":
          continue;
        default:
          throw createError("INVALID_SORT_SCHEMA_TYPE", Array.isArray(type) ? "array" : type, path);
      }
    }
  }
  return sorter;
}
function create3(orama, sharedInternalDocumentStore, schema, config) {
  const isSortEnabled = config?.enabled !== false;
  if (!isSortEnabled) {
    return {
      disabled: true
    };
  }
  return innerCreate(orama, sharedInternalDocumentStore, schema, (config || {}).unsortableProperties || [], "");
}
function insert2(sorter, prop, id, value) {
  if (!sorter.enabled) {
    return;
  }
  sorter.isSorted = false;
  const internalId = getInternalDocumentId(sorter.sharedInternalDocumentStore, id);
  const s = sorter.sorts[prop];
  if (s.orderedDocsToRemove.has(internalId)) {
    ensureOrderedDocsAreDeletedByProperty(sorter, prop);
  }
  s.docs.set(internalId, s.orderedDocs.length);
  s.orderedDocs.push([internalId, value]);
}
function ensureIsSorted(sorter) {
  if (sorter.isSorted || !sorter.enabled) {
    return;
  }
  const properties = Object.keys(sorter.sorts);
  for (const prop of properties) {
    ensurePropertyIsSorted(sorter, prop);
  }
  sorter.isSorted = true;
}
function stringSort(language, value, d) {
  return value[1].localeCompare(d[1], getLocale(language));
}
function numberSort(value, d) {
  return value[1] - d[1];
}
function booleanSort(value, d) {
  return d[1] ? -1 : 1;
}
function ensurePropertyIsSorted(sorter, prop) {
  const s = sorter.sorts[prop];
  let predicate;
  switch (s.type) {
    case "string":
      predicate = stringSort.bind(null, sorter.language);
      break;
    case "number":
      predicate = numberSort.bind(null);
      break;
    case "boolean":
      predicate = booleanSort.bind(null);
      break;
  }
  s.orderedDocs.sort(predicate);
  const orderedDocsLength = s.orderedDocs.length;
  for (let i = 0; i < orderedDocsLength; i++) {
    const docId = s.orderedDocs[i][0];
    s.docs.set(docId, i);
  }
}
function ensureOrderedDocsAreDeleted(sorter) {
  const properties = Object.keys(sorter.sorts);
  for (const prop of properties) {
    ensureOrderedDocsAreDeletedByProperty(sorter, prop);
  }
}
function ensureOrderedDocsAreDeletedByProperty(sorter, prop) {
  const s = sorter.sorts[prop];
  if (!s.orderedDocsToRemove.size)
    return;
  s.orderedDocs = s.orderedDocs.filter((doc) => !s.orderedDocsToRemove.has(doc[0]));
  s.orderedDocsToRemove.clear();
}
function remove3(sorter, prop, id) {
  if (!sorter.enabled) {
    return;
  }
  const s = sorter.sorts[prop];
  const internalId = getInternalDocumentId(sorter.sharedInternalDocumentStore, id);
  const index = s.docs.get(internalId);
  if (!index)
    return;
  s.docs.delete(internalId);
  s.orderedDocsToRemove.set(internalId, true);
}
function sortBy(sorter, docIds, by) {
  if (!sorter.enabled) {
    throw createError("SORT_DISABLED");
  }
  const property = by.property;
  const isDesc = by.order === "DESC";
  const s = sorter.sorts[property];
  if (!s) {
    throw createError("UNABLE_TO_SORT_ON_UNKNOWN_FIELD", property, sorter.sortableProperties.join(", "));
  }
  ensureOrderedDocsAreDeletedByProperty(sorter, property);
  ensureIsSorted(sorter);
  docIds.sort((a, b) => {
    const indexOfA = s.docs.get(getInternalDocumentId(sorter.sharedInternalDocumentStore, a[0]));
    const indexOfB = s.docs.get(getInternalDocumentId(sorter.sharedInternalDocumentStore, b[0]));
    const isAIndexed = typeof indexOfA !== "undefined";
    const isBIndexed = typeof indexOfB !== "undefined";
    if (!isAIndexed && !isBIndexed) {
      return 0;
    }
    if (!isAIndexed) {
      return 1;
    }
    if (!isBIndexed) {
      return -1;
    }
    return isDesc ? indexOfB - indexOfA : indexOfA - indexOfB;
  });
  return docIds;
}
function getSortableProperties(sorter) {
  if (!sorter.enabled) {
    return [];
  }
  return sorter.sortableProperties;
}
function getSortablePropertiesWithTypes(sorter) {
  if (!sorter.enabled) {
    return {};
  }
  return sorter.sortablePropertiesWithTypes;
}
function load4(sharedInternalDocumentStore, raw) {
  const rawDocument = raw;
  if (!rawDocument.enabled) {
    return {
      enabled: false
    };
  }
  const sorts = Object.keys(rawDocument.sorts).reduce((acc, prop) => {
    const { docs, orderedDocs, type } = rawDocument.sorts[prop];
    acc[prop] = {
      docs: new Map(Object.entries(docs).map(([k, v2]) => [+k, v2])),
      orderedDocsToRemove: /* @__PURE__ */ new Map(),
      orderedDocs,
      type
    };
    return acc;
  }, {});
  return {
    sharedInternalDocumentStore,
    language: rawDocument.language,
    sortableProperties: rawDocument.sortableProperties,
    sortablePropertiesWithTypes: rawDocument.sortablePropertiesWithTypes,
    sorts,
    enabled: true,
    isSorted: rawDocument.isSorted
  };
}
function save4(sorter) {
  if (!sorter.enabled) {
    return {
      enabled: false
    };
  }
  ensureOrderedDocsAreDeleted(sorter);
  ensureIsSorted(sorter);
  const sorts = Object.keys(sorter.sorts).reduce((acc, prop) => {
    const { docs, orderedDocs, type } = sorter.sorts[prop];
    acc[prop] = {
      docs: Object.fromEntries(docs.entries()),
      orderedDocs,
      type
    };
    return acc;
  }, {});
  return {
    language: sorter.language,
    sortableProperties: sorter.sortableProperties,
    sortablePropertiesWithTypes: sorter.sortablePropertiesWithTypes,
    sorts,
    enabled: sorter.enabled,
    isSorted: sorter.isSorted
  };
}
function createSorter() {
  return {
    create: create3,
    insert: insert2,
    remove: remove3,
    save: save4,
    load: load4,
    sortBy,
    getSortableProperties,
    getSortablePropertiesWithTypes
  };
}

// node_modules/@orama/orama/dist/browser/components/tokenizer/diacritics.js
var DIACRITICS_CHARCODE_START = 192;
var DIACRITICS_CHARCODE_END = 383;
var CHARCODE_REPLACE_MAPPING = [
  65,
  65,
  65,
  65,
  65,
  65,
  65,
  67,
  69,
  69,
  69,
  69,
  73,
  73,
  73,
  73,
  69,
  78,
  79,
  79,
  79,
  79,
  79,
  null,
  79,
  85,
  85,
  85,
  85,
  89,
  80,
  115,
  97,
  97,
  97,
  97,
  97,
  97,
  97,
  99,
  101,
  101,
  101,
  101,
  105,
  105,
  105,
  105,
  101,
  110,
  111,
  111,
  111,
  111,
  111,
  null,
  111,
  117,
  117,
  117,
  117,
  121,
  112,
  121,
  65,
  97,
  65,
  97,
  65,
  97,
  67,
  99,
  67,
  99,
  67,
  99,
  67,
  99,
  68,
  100,
  68,
  100,
  69,
  101,
  69,
  101,
  69,
  101,
  69,
  101,
  69,
  101,
  71,
  103,
  71,
  103,
  71,
  103,
  71,
  103,
  72,
  104,
  72,
  104,
  73,
  105,
  73,
  105,
  73,
  105,
  73,
  105,
  73,
  105,
  73,
  105,
  74,
  106,
  75,
  107,
  107,
  76,
  108,
  76,
  108,
  76,
  108,
  76,
  108,
  76,
  108,
  78,
  110,
  78,
  110,
  78,
  110,
  110,
  78,
  110,
  79,
  111,
  79,
  111,
  79,
  111,
  79,
  111,
  82,
  114,
  82,
  114,
  82,
  114,
  83,
  115,
  83,
  115,
  83,
  115,
  83,
  115,
  84,
  116,
  84,
  116,
  84,
  116,
  85,
  117,
  85,
  117,
  85,
  117,
  85,
  117,
  85,
  117,
  85,
  117,
  87,
  119,
  89,
  121,
  89,
  90,
  122,
  90,
  122,
  90,
  122,
  115
];
function replaceChar(charCode) {
  if (charCode < DIACRITICS_CHARCODE_START || charCode > DIACRITICS_CHARCODE_END)
    return charCode;
  return CHARCODE_REPLACE_MAPPING[charCode - DIACRITICS_CHARCODE_START] || charCode;
}
function replaceDiacritics(str) {
  const stringCharCode = [];
  for (let idx = 0; idx < str.length; idx++) {
    stringCharCode[idx] = replaceChar(str.charCodeAt(idx));
  }
  return String.fromCharCode(...stringCharCode);
}

// node_modules/@orama/orama/dist/browser/components/tokenizer/english-stemmer.js
var step2List = {
  ational: "ate",
  tional: "tion",
  enci: "ence",
  anci: "ance",
  izer: "ize",
  bli: "ble",
  alli: "al",
  entli: "ent",
  eli: "e",
  ousli: "ous",
  ization: "ize",
  ation: "ate",
  ator: "ate",
  alism: "al",
  iveness: "ive",
  fulness: "ful",
  ousness: "ous",
  aliti: "al",
  iviti: "ive",
  biliti: "ble",
  logi: "log"
};
var step3List = {
  icate: "ic",
  ative: "",
  alize: "al",
  iciti: "ic",
  ical: "ic",
  ful: "",
  ness: ""
};
var c = "[^aeiou]";
var v = "[aeiouy]";
var C = c + "[^aeiouy]*";
var V = v + "[aeiou]*";
var mgr0 = "^(" + C + ")?" + V + C;
var meq1 = "^(" + C + ")?" + V + C + "(" + V + ")?$";
var mgr1 = "^(" + C + ")?" + V + C + V + C;
var s_v = "^(" + C + ")?" + v;
function stemmer(w) {
  let stem;
  let suffix;
  let re;
  let re2;
  let re3;
  let re4;
  if (w.length < 3) {
    return w;
  }
  const firstch = w.substring(0, 1);
  if (firstch == "y") {
    w = firstch.toUpperCase() + w.substring(1);
  }
  re = /^(.+?)(ss|i)es$/;
  re2 = /^(.+?)([^s])s$/;
  if (re.test(w)) {
    w = w.replace(re, "$1$2");
  } else if (re2.test(w)) {
    w = w.replace(re2, "$1$2");
  }
  re = /^(.+?)eed$/;
  re2 = /^(.+?)(ed|ing)$/;
  if (re.test(w)) {
    const fp = re.exec(w);
    re = new RegExp(mgr0);
    if (re.test(fp[1])) {
      re = /.$/;
      w = w.replace(re, "");
    }
  } else if (re2.test(w)) {
    const fp = re2.exec(w);
    stem = fp[1];
    re2 = new RegExp(s_v);
    if (re2.test(stem)) {
      w = stem;
      re2 = /(at|bl|iz)$/;
      re3 = new RegExp("([^aeiouylsz])\\1$");
      re4 = new RegExp("^" + C + v + "[^aeiouwxy]$");
      if (re2.test(w)) {
        w = w + "e";
      } else if (re3.test(w)) {
        re = /.$/;
        w = w.replace(re, "");
      } else if (re4.test(w)) {
        w = w + "e";
      }
    }
  }
  re = /^(.+?)y$/;
  if (re.test(w)) {
    const fp = re.exec(w);
    stem = fp?.[1];
    re = new RegExp(s_v);
    if (stem && re.test(stem)) {
      w = stem + "i";
    }
  }
  re = /^(.+?)(ational|tional|enci|anci|izer|bli|alli|entli|eli|ousli|ization|ation|ator|alism|iveness|fulness|ousness|aliti|iviti|biliti|logi)$/;
  if (re.test(w)) {
    const fp = re.exec(w);
    stem = fp?.[1];
    suffix = fp?.[2];
    re = new RegExp(mgr0);
    if (stem && re.test(stem)) {
      w = stem + step2List[suffix];
    }
  }
  re = /^(.+?)(icate|ative|alize|iciti|ical|ful|ness)$/;
  if (re.test(w)) {
    const fp = re.exec(w);
    stem = fp?.[1];
    suffix = fp?.[2];
    re = new RegExp(mgr0);
    if (stem && re.test(stem)) {
      w = stem + step3List[suffix];
    }
  }
  re = /^(.+?)(al|ance|ence|er|ic|able|ible|ant|ement|ment|ent|ou|ism|ate|iti|ous|ive|ize)$/;
  re2 = /^(.+?)(s|t)(ion)$/;
  if (re.test(w)) {
    const fp = re.exec(w);
    stem = fp?.[1];
    re = new RegExp(mgr1);
    if (stem && re.test(stem)) {
      w = stem;
    }
  } else if (re2.test(w)) {
    const fp = re2.exec(w);
    stem = fp?.[1] ?? "" + fp?.[2] ?? "";
    re2 = new RegExp(mgr1);
    if (re2.test(stem)) {
      w = stem;
    }
  }
  re = /^(.+?)e$/;
  if (re.test(w)) {
    const fp = re.exec(w);
    stem = fp?.[1];
    re = new RegExp(mgr1);
    re2 = new RegExp(meq1);
    re3 = new RegExp("^" + C + v + "[^aeiouwxy]$");
    if (stem && (re.test(stem) || re2.test(stem) && !re3.test(stem))) {
      w = stem;
    }
  }
  re = /ll$/;
  re2 = new RegExp(mgr1);
  if (re.test(w) && re2.test(w)) {
    re = /.$/;
    w = w.replace(re, "");
  }
  if (firstch == "y") {
    w = firstch.toLowerCase() + w.substring(1);
  }
  return w;
}

// node_modules/@orama/orama/dist/browser/components/tokenizer/index.js
function normalizeToken(prop, token, withCache = true) {
  const key = `${this.language}:${prop}:${token}`;
  if (withCache && this.normalizationCache.has(key)) {
    return this.normalizationCache.get(key);
  }
  if (this.stopWords?.includes(token)) {
    if (withCache) {
      this.normalizationCache.set(key, "");
    }
    return "";
  }
  if (this.stemmer && !this.stemmerSkipProperties.has(prop)) {
    token = this.stemmer(token);
  }
  token = replaceDiacritics(token);
  if (withCache) {
    this.normalizationCache.set(key, token);
  }
  return token;
}
function trim(text) {
  while (text[text.length - 1] === "") {
    text.pop();
  }
  while (text[0] === "") {
    text.shift();
  }
  return text;
}
function tokenize(input, language, prop, withCache = true) {
  if (language && language !== this.language) {
    throw createError("LANGUAGE_NOT_SUPPORTED", language);
  }
  if (typeof input !== "string") {
    return [input];
  }
  const normalizeToken2 = this.normalizeToken.bind(this, prop ?? "");
  let tokens;
  if (prop && this.tokenizeSkipProperties.has(prop)) {
    tokens = [normalizeToken2(input, withCache)];
  } else {
    const splitRule = SPLITTERS[this.language];
    tokens = input.toLowerCase().split(splitRule).map((t) => normalizeToken2(t, withCache)).filter(Boolean);
  }
  const trimTokens = trim(tokens);
  if (!this.allowDuplicates) {
    return Array.from(new Set(trimTokens));
  }
  return trimTokens;
}
function createTokenizer(config = {}) {
  if (!config.language) {
    config.language = "english";
  } else if (!SUPPORTED_LANGUAGES.includes(config.language)) {
    throw createError("LANGUAGE_NOT_SUPPORTED", config.language);
  }
  let stemmer2;
  if (config.stemming || config.stemmer && !("stemming" in config)) {
    if (config.stemmer) {
      if (typeof config.stemmer !== "function") {
        throw createError("INVALID_STEMMER_FUNCTION_TYPE");
      }
      stemmer2 = config.stemmer;
    } else {
      if (config.language === "english") {
        stemmer2 = stemmer;
      } else {
        throw createError("MISSING_STEMMER", config.language);
      }
    }
  }
  let stopWords;
  if (config.stopWords !== false) {
    stopWords = [];
    if (Array.isArray(config.stopWords)) {
      stopWords = config.stopWords;
    } else if (typeof config.stopWords === "function") {
      stopWords = config.stopWords(stopWords);
    } else if (config.stopWords) {
      throw createError("CUSTOM_STOP_WORDS_MUST_BE_FUNCTION_OR_ARRAY");
    }
    if (!Array.isArray(stopWords)) {
      throw createError("CUSTOM_STOP_WORDS_MUST_BE_FUNCTION_OR_ARRAY");
    }
    for (const s of stopWords) {
      if (typeof s !== "string") {
        throw createError("CUSTOM_STOP_WORDS_MUST_BE_FUNCTION_OR_ARRAY");
      }
    }
  }
  const tokenizer = {
    tokenize,
    language: config.language,
    stemmer: stemmer2,
    stemmerSkipProperties: new Set(config.stemmerSkipProperties ? [config.stemmerSkipProperties].flat() : []),
    tokenizeSkipProperties: new Set(config.tokenizeSkipProperties ? [config.tokenizeSkipProperties].flat() : []),
    stopWords,
    allowDuplicates: Boolean(config.allowDuplicates),
    normalizeToken,
    normalizationCache: /* @__PURE__ */ new Map()
  };
  tokenizer.tokenize = tokenize.bind(tokenizer);
  tokenizer.normalizeToken = normalizeToken;
  return tokenizer;
}

// node_modules/@orama/orama/dist/browser/components/pinning.js
function create4(sharedInternalDocumentStore) {
  return {
    sharedInternalDocumentStore,
    rules: /* @__PURE__ */ new Map()
  };
}
function addRule(store2, rule) {
  if (store2.rules.has(rule.id)) {
    throw new Error(`PINNING_RULE_ALREADY_EXISTS: A pinning rule with id "${rule.id}" already exists. Use updateRule to modify it.`);
  }
  store2.rules.set(rule.id, rule);
}
function updateRule(store2, rule) {
  if (!store2.rules.has(rule.id)) {
    throw new Error(`PINNING_RULE_NOT_FOUND: Cannot update pinning rule with id "${rule.id}" because it does not exist. Use addRule to create it.`);
  }
  store2.rules.set(rule.id, rule);
}
function removeRule(store2, ruleId) {
  return store2.rules.delete(ruleId);
}
function getRule(store2, ruleId) {
  return store2.rules.get(ruleId);
}
function getAllRules(store2) {
  return Array.from(store2.rules.values());
}
function matchesCondition(term, condition) {
  const normalizedTerm = term.toLowerCase().trim();
  const normalizedPattern = condition.pattern.toLowerCase().trim();
  switch (condition.anchoring) {
    case "is":
      return normalizedTerm === normalizedPattern;
    case "starts_with":
      return normalizedTerm.startsWith(normalizedPattern);
    case "contains":
      return normalizedTerm.includes(normalizedPattern);
    default:
      return false;
  }
}
function matchesRule(term, rule) {
  if (!term) {
    return false;
  }
  return rule.conditions.every((condition) => matchesCondition(term, condition));
}
function getMatchingRules(store2, term) {
  if (!term) {
    return [];
  }
  const matchingRules = [];
  for (const rule of store2.rules.values()) {
    if (matchesRule(term, rule)) {
      matchingRules.push(rule);
    }
  }
  return matchingRules;
}
function load5(sharedInternalDocumentStore, raw) {
  const rawStore = raw;
  return {
    sharedInternalDocumentStore,
    rules: new Map(rawStore?.rules ?? [])
  };
}
function save5(store2) {
  return {
    rules: Array.from(store2.rules.entries())
  };
}
function createPinning() {
  return {
    create: create4,
    addRule,
    updateRule,
    removeRule,
    getRule,
    getAllRules,
    getMatchingRules,
    load: load5,
    save: save5
  };
}

// node_modules/@orama/orama/dist/browser/methods/create.js
function validateComponents(components) {
  const defaultComponents = {
    formatElapsedTime,
    getDocumentIndexId,
    getDocumentProperties,
    validateSchema
  };
  for (const rawKey of FUNCTION_COMPONENTS) {
    const key = rawKey;
    if (components[key]) {
      if (typeof components[key] !== "function") {
        throw createError("COMPONENT_MUST_BE_FUNCTION", key);
      }
    } else {
      components[key] = defaultComponents[key];
    }
  }
  for (const rawKey of Object.keys(components)) {
    if (!OBJECT_COMPONENTS.includes(rawKey) && !FUNCTION_COMPONENTS.includes(rawKey)) {
      throw createError("UNSUPPORTED_COMPONENT", rawKey);
    }
  }
}
function create5({ schema, sort, language, components, id, plugins }) {
  if (!components) {
    components = {};
  }
  for (const plugin of plugins ?? []) {
    if (!("getComponents" in plugin)) {
      continue;
    }
    if (typeof plugin.getComponents !== "function") {
      continue;
    }
    const pluginComponents = plugin.getComponents(schema);
    const keys = Object.keys(pluginComponents);
    for (const key of keys) {
      if (components[key]) {
        throw createError("PLUGIN_COMPONENT_CONFLICT", key, plugin.name);
      }
    }
    components = {
      ...components,
      ...pluginComponents
    };
  }
  if (!id) {
    id = uniqueId();
  }
  let tokenizer = components.tokenizer;
  let index = components.index;
  let documentsStore = components.documentsStore;
  let sorter = components.sorter;
  let pinning = components.pinning;
  if (!tokenizer) {
    tokenizer = createTokenizer({ language: language ?? "english" });
  } else if (!tokenizer.tokenize) {
    tokenizer = createTokenizer(tokenizer);
  } else {
    const customTokenizer = tokenizer;
    tokenizer = customTokenizer;
  }
  if (components.tokenizer && language) {
    throw createError("NO_LANGUAGE_WITH_CUSTOM_TOKENIZER");
  }
  const internalDocumentStore = createInternalDocumentIDStore();
  index ||= createIndex();
  sorter ||= createSorter();
  documentsStore ||= createDocumentsStore();
  pinning ||= createPinning();
  validateComponents(components);
  const { getDocumentProperties: getDocumentProperties2, getDocumentIndexId: getDocumentIndexId2, validateSchema: validateSchema2, formatElapsedTime: formatElapsedTime2 } = components;
  const orama = {
    data: {},
    caches: {},
    schema,
    tokenizer,
    index,
    sorter,
    documentsStore,
    pinning,
    internalDocumentIDStore: internalDocumentStore,
    getDocumentProperties: getDocumentProperties2,
    getDocumentIndexId: getDocumentIndexId2,
    validateSchema: validateSchema2,
    beforeInsert: [],
    afterInsert: [],
    beforeRemove: [],
    afterRemove: [],
    beforeUpdate: [],
    afterUpdate: [],
    beforeUpsert: [],
    afterUpsert: [],
    beforeSearch: [],
    afterSearch: [],
    beforeInsertMultiple: [],
    afterInsertMultiple: [],
    beforeRemoveMultiple: [],
    afterRemoveMultiple: [],
    beforeUpdateMultiple: [],
    afterUpdateMultiple: [],
    beforeUpsertMultiple: [],
    afterUpsertMultiple: [],
    afterCreate: [],
    formatElapsedTime: formatElapsedTime2,
    id,
    plugins,
    version: getVersion()
  };
  orama.data = {
    index: orama.index.create(orama, internalDocumentStore, schema),
    docs: orama.documentsStore.create(orama, internalDocumentStore),
    sorting: orama.sorter.create(orama, internalDocumentStore, schema, sort),
    pinning: orama.pinning.create(internalDocumentStore)
  };
  for (const hook of AVAILABLE_PLUGIN_HOOKS) {
    orama[hook] = (orama[hook] ?? []).concat(getAllPluginsByHook(orama, hook));
  }
  const afterCreate = orama["afterCreate"];
  if (afterCreate) {
    runAfterCreate(afterCreate, orama);
  }
  return orama;
}
function getVersion() {
  return "{{VERSION}}";
}

// node_modules/@orama/orama/dist/browser/methods/docs.js
function count2(db) {
  return db.documentsStore.count(db.data.docs);
}

// node_modules/@orama/orama/dist/browser/methods/insert.js
function insert3(orama, doc, language, skipHooks, options) {
  const errorProperty = orama.validateSchema(doc, orama.schema);
  if (errorProperty) {
    throw createError("SCHEMA_VALIDATION_FAILURE", errorProperty);
  }
  const asyncNeeded = isAsyncFunction(orama.beforeInsert) || isAsyncFunction(orama.afterInsert) || isAsyncFunction(orama.index.beforeInsert) || isAsyncFunction(orama.index.insert) || isAsyncFunction(orama.index.afterInsert);
  if (asyncNeeded) {
    return innerInsertAsync(orama, doc, language, skipHooks, options);
  }
  return innerInsertSync(orama, doc, language, skipHooks, options);
}
var ENUM_TYPE = /* @__PURE__ */ new Set(["enum", "enum[]"]);
var STRING_NUMBER_TYPE = /* @__PURE__ */ new Set(["string", "number"]);
async function innerInsertAsync(orama, doc, language, skipHooks, options) {
  const { index, docs } = orama.data;
  const id = orama.getDocumentIndexId(doc);
  if (typeof id !== "string") {
    throw createError("DOCUMENT_ID_MUST_BE_STRING", typeof id);
  }
  const internalId = getInternalDocumentId(orama.internalDocumentIDStore, id);
  if (!skipHooks) {
    await runSingleHook(orama.beforeInsert, orama, id, doc);
  }
  if (!orama.documentsStore.store(docs, id, internalId, doc)) {
    throw createError("DOCUMENT_ALREADY_EXISTS", id);
  }
  const docsCount = orama.documentsStore.count(docs);
  const indexableProperties = orama.index.getSearchableProperties(index);
  const indexablePropertiesWithTypes = orama.index.getSearchablePropertiesWithTypes(index);
  const indexableValues = orama.getDocumentProperties(doc, indexableProperties);
  for (const [key, value] of Object.entries(indexableValues)) {
    if (typeof value === "undefined")
      continue;
    const actualType = typeof value;
    const expectedType = indexablePropertiesWithTypes[key];
    validateDocumentProperty(actualType, expectedType, key, value);
  }
  await indexAndSortDocument(orama, id, indexableProperties, indexableValues, docsCount, language, doc, options);
  if (!skipHooks) {
    await runSingleHook(orama.afterInsert, orama, id, doc);
  }
  return id;
}
function innerInsertSync(orama, doc, language, skipHooks, options) {
  const { index, docs } = orama.data;
  const id = orama.getDocumentIndexId(doc);
  if (typeof id !== "string") {
    throw createError("DOCUMENT_ID_MUST_BE_STRING", typeof id);
  }
  const internalId = getInternalDocumentId(orama.internalDocumentIDStore, id);
  if (!skipHooks) {
    runSingleHook(orama.beforeInsert, orama, id, doc);
  }
  if (!orama.documentsStore.store(docs, id, internalId, doc)) {
    throw createError("DOCUMENT_ALREADY_EXISTS", id);
  }
  const docsCount = orama.documentsStore.count(docs);
  const indexableProperties = orama.index.getSearchableProperties(index);
  const indexablePropertiesWithTypes = orama.index.getSearchablePropertiesWithTypes(index);
  const indexableValues = orama.getDocumentProperties(doc, indexableProperties);
  for (const [key, value] of Object.entries(indexableValues)) {
    if (typeof value === "undefined")
      continue;
    const actualType = typeof value;
    const expectedType = indexablePropertiesWithTypes[key];
    validateDocumentProperty(actualType, expectedType, key, value);
  }
  indexAndSortDocumentSync(orama, id, indexableProperties, indexableValues, docsCount, language, doc, options);
  if (!skipHooks) {
    runSingleHook(orama.afterInsert, orama, id, doc);
  }
  return id;
}
function validateDocumentProperty(actualType, expectedType, key, value) {
  if (isGeoPointType(expectedType) && typeof value === "object" && typeof value.lon === "number" && typeof value.lat === "number") {
    return;
  }
  if (isVectorType(expectedType) && Array.isArray(value))
    return;
  if (isArrayType(expectedType) && Array.isArray(value))
    return;
  if (ENUM_TYPE.has(expectedType) && STRING_NUMBER_TYPE.has(actualType))
    return;
  if (actualType !== expectedType) {
    throw createError("INVALID_DOCUMENT_PROPERTY", key, expectedType, actualType);
  }
}
async function indexAndSortDocument(orama, id, indexableProperties, indexableValues, docsCount, language, doc, options) {
  for (const prop of indexableProperties) {
    const value = indexableValues[prop];
    if (typeof value === "undefined")
      continue;
    const expectedType = orama.index.getSearchablePropertiesWithTypes(orama.data.index)[prop];
    await orama.index.beforeInsert?.(orama.data.index, prop, id, value, expectedType, language, orama.tokenizer, docsCount);
    const internalId = orama.internalDocumentIDStore.idToInternalId.get(id);
    await orama.index.insert(orama.index, orama.data.index, prop, id, internalId, value, expectedType, language, orama.tokenizer, docsCount, options);
    await orama.index.afterInsert?.(orama.data.index, prop, id, value, expectedType, language, orama.tokenizer, docsCount);
  }
  const sortableProperties = orama.sorter.getSortableProperties(orama.data.sorting);
  const sortableValues = orama.getDocumentProperties(doc, sortableProperties);
  for (const prop of sortableProperties) {
    const value = sortableValues[prop];
    if (typeof value === "undefined")
      continue;
    const expectedType = orama.sorter.getSortablePropertiesWithTypes(orama.data.sorting)[prop];
    orama.sorter.insert(orama.data.sorting, prop, id, value, expectedType, language);
  }
}
function indexAndSortDocumentSync(orama, id, indexableProperties, indexableValues, docsCount, language, doc, options) {
  for (const prop of indexableProperties) {
    const value = indexableValues[prop];
    if (typeof value === "undefined")
      continue;
    const expectedType = orama.index.getSearchablePropertiesWithTypes(orama.data.index)[prop];
    const internalDocumentId = getInternalDocumentId(orama.internalDocumentIDStore, id);
    orama.index.beforeInsert?.(orama.data.index, prop, id, value, expectedType, language, orama.tokenizer, docsCount);
    orama.index.insert(orama.index, orama.data.index, prop, id, internalDocumentId, value, expectedType, language, orama.tokenizer, docsCount, options);
    orama.index.afterInsert?.(orama.data.index, prop, id, value, expectedType, language, orama.tokenizer, docsCount);
  }
  const sortableProperties = orama.sorter.getSortableProperties(orama.data.sorting);
  const sortableValues = orama.getDocumentProperties(doc, sortableProperties);
  for (const prop of sortableProperties) {
    const value = sortableValues[prop];
    if (typeof value === "undefined")
      continue;
    const expectedType = orama.sorter.getSortablePropertiesWithTypes(orama.data.sorting)[prop];
    orama.sorter.insert(orama.data.sorting, prop, id, value, expectedType, language);
  }
}
function insertMultiple(orama, docs, batchSize, language, skipHooks, timeout) {
  const asyncNeeded = isAsyncFunction(orama.afterInsertMultiple) || isAsyncFunction(orama.beforeInsertMultiple) || isAsyncFunction(orama.index.beforeInsert) || isAsyncFunction(orama.index.insert) || isAsyncFunction(orama.index.afterInsert);
  if (asyncNeeded) {
    return innerInsertMultipleAsync(orama, docs, batchSize, language, skipHooks, timeout);
  }
  return innerInsertMultipleSync(orama, docs, batchSize, language, skipHooks, timeout);
}
async function innerInsertMultipleAsync(orama, docs, batchSize = 1e3, language, skipHooks, timeout = 0) {
  const ids = [];
  const processNextBatch = async (startIndex) => {
    const endIndex = Math.min(startIndex + batchSize, docs.length);
    const batch = docs.slice(startIndex, endIndex);
    for (const doc of batch) {
      const options = { avlRebalanceThreshold: batch.length };
      const id = await insert3(orama, doc, language, skipHooks, options);
      ids.push(id);
    }
    return endIndex;
  };
  const processAllBatches = async () => {
    let currentIndex = 0;
    while (currentIndex < docs.length) {
      const startTime = Date.now();
      currentIndex = await processNextBatch(currentIndex);
      if (timeout > 0) {
        const elapsedTime = Date.now() - startTime;
        const waitTime = timeout - elapsedTime;
        if (waitTime > 0) {
          sleep(waitTime);
        }
      }
    }
  };
  await processAllBatches();
  if (!skipHooks) {
    await runMultipleHook(orama.afterInsertMultiple, orama, docs);
  }
  return ids;
}
function innerInsertMultipleSync(orama, docs, batchSize = 1e3, language, skipHooks, timeout = 0) {
  const ids = [];
  let i = 0;
  function processNextBatch() {
    const batch = docs.slice(i * batchSize, (i + 1) * batchSize);
    if (batch.length === 0)
      return false;
    for (const doc of batch) {
      const options = { avlRebalanceThreshold: batch.length };
      const id = insert3(orama, doc, language, skipHooks, options);
      ids.push(id);
    }
    i++;
    return true;
  }
  function processAllBatches() {
    const startTime = Date.now();
    while (true) {
      const hasMoreBatches = processNextBatch();
      if (!hasMoreBatches)
        break;
      if (timeout > 0) {
        const elapsedTime = Date.now() - startTime;
        if (elapsedTime >= timeout) {
          const remainingTime = timeout - elapsedTime % timeout;
          if (remainingTime > 0) {
            sleep(remainingTime);
          }
        }
      }
    }
  }
  processAllBatches();
  if (!skipHooks) {
    runMultipleHook(orama.afterInsertMultiple, orama, docs);
  }
  return ids;
}

// node_modules/@orama/orama/dist/browser/constants.js
var MODE_FULLTEXT_SEARCH = "fulltext";
var MODE_HYBRID_SEARCH = "hybrid";
var MODE_VECTOR_SEARCH = "vector";

// node_modules/@orama/orama/dist/browser/components/facets.js
function sortAsc(a, b) {
  return a[1] - b[1];
}
function sortDesc(a, b) {
  return b[1] - a[1];
}
function sortingPredicateBuilder(order = "desc") {
  return order.toLowerCase() === "asc" ? sortAsc : sortDesc;
}
function getFacets(orama, results, facetsConfig) {
  const facets = {};
  const allIDs = results.map(([id]) => id);
  const allDocs = orama.documentsStore.getMultiple(orama.data.docs, allIDs);
  const facetKeys = Object.keys(facetsConfig);
  const properties = orama.index.getSearchablePropertiesWithTypes(orama.data.index);
  for (const facet of facetKeys) {
    let values;
    if (properties[facet] === "number") {
      const { ranges } = facetsConfig[facet];
      const rangesLength = ranges.length;
      const tmp = Array.from({ length: rangesLength });
      for (let i = 0; i < rangesLength; i++) {
        const range = ranges[i];
        tmp[i] = [`${range.from}-${range.to}`, 0];
      }
      values = Object.fromEntries(tmp);
    }
    facets[facet] = {
      count: 0,
      values: values ?? {}
    };
  }
  const allDocsLength = allDocs.length;
  for (let i = 0; i < allDocsLength; i++) {
    const doc = allDocs[i];
    for (const facet of facetKeys) {
      const facetValue = facet.includes(".") ? getNested(doc, facet) : doc[facet];
      const propertyType = properties[facet];
      const facetValues = facets[facet].values;
      switch (propertyType) {
        case "number": {
          const ranges = facetsConfig[facet].ranges;
          calculateNumberFacetBuilder(ranges, facetValues)(facetValue);
          break;
        }
        case "number[]": {
          const alreadyInsertedValues = /* @__PURE__ */ new Set();
          const ranges = facetsConfig[facet].ranges;
          const calculateNumberFacet = calculateNumberFacetBuilder(ranges, facetValues, alreadyInsertedValues);
          for (const v2 of facetValue) {
            calculateNumberFacet(v2);
          }
          break;
        }
        case "boolean":
        case "enum":
        case "string": {
          calculateBooleanStringOrEnumFacetBuilder(facetValues, propertyType)(facetValue);
          break;
        }
        case "boolean[]":
        case "enum[]":
        case "string[]": {
          const alreadyInsertedValues = /* @__PURE__ */ new Set();
          const innerType = propertyType === "boolean[]" ? "boolean" : "string";
          const calculateBooleanStringOrEnumFacet = calculateBooleanStringOrEnumFacetBuilder(facetValues, innerType, alreadyInsertedValues);
          for (const v2 of facetValue) {
            calculateBooleanStringOrEnumFacet(v2);
          }
          break;
        }
        default:
          throw createError("FACET_NOT_SUPPORTED", propertyType);
      }
    }
  }
  for (const facet of facetKeys) {
    const currentFacet = facets[facet];
    currentFacet.count = Object.keys(currentFacet.values).length;
    if (properties[facet] === "string") {
      const stringFacetDefinition = facetsConfig[facet];
      const sortingPredicate = sortingPredicateBuilder(stringFacetDefinition.sort);
      currentFacet.values = Object.fromEntries(Object.entries(currentFacet.values).sort(sortingPredicate).slice(stringFacetDefinition.offset ?? 0, stringFacetDefinition.limit ?? 10));
    }
  }
  return facets;
}
function calculateNumberFacetBuilder(ranges, values, alreadyInsertedValues) {
  return (facetValue) => {
    for (const range of ranges) {
      const value = `${range.from}-${range.to}`;
      if (alreadyInsertedValues?.has(value)) {
        continue;
      }
      if (facetValue >= range.from && facetValue <= range.to) {
        if (values[value] === void 0) {
          values[value] = 1;
        } else {
          values[value]++;
          alreadyInsertedValues?.add(value);
        }
      }
    }
  };
}
function calculateBooleanStringOrEnumFacetBuilder(values, propertyType, alreadyInsertedValues) {
  const defaultValue = propertyType === "boolean" ? "false" : "";
  return (facetValue) => {
    const value = facetValue?.toString() ?? defaultValue;
    if (alreadyInsertedValues?.has(value)) {
      return;
    }
    values[value] = (values[value] ?? 0) + 1;
    alreadyInsertedValues?.add(value);
  };
}

// node_modules/@orama/orama/dist/browser/components/groups.js
var DEFAULT_REDUCE = {
  reducer: (_, acc, res, index) => {
    acc[index] = res;
    return acc;
  },
  getInitialValue: (length) => Array.from({ length })
};
var ALLOWED_TYPES = ["string", "number", "boolean"];
function getGroups(orama, results, groupBy) {
  const properties = groupBy.properties;
  const propertiesLength = properties.length;
  const schemaProperties = orama.index.getSearchablePropertiesWithTypes(orama.data.index);
  for (let i = 0; i < propertiesLength; i++) {
    const property = properties[i];
    if (typeof schemaProperties[property] === "undefined") {
      throw createError("UNKNOWN_GROUP_BY_PROPERTY", property);
    }
    if (!ALLOWED_TYPES.includes(schemaProperties[property])) {
      throw createError("INVALID_GROUP_BY_PROPERTY", property, ALLOWED_TYPES.join(", "), schemaProperties[property]);
    }
  }
  const allIDs = results.map(([id]) => getDocumentIdFromInternalId(orama.internalDocumentIDStore, id));
  const allDocs = orama.documentsStore.getMultiple(orama.data.docs, allIDs);
  const allDocsLength = allDocs.length;
  const returnedCount = groupBy.maxResult || Number.MAX_SAFE_INTEGER;
  const listOfValues = [];
  const g = {};
  for (let i = 0; i < propertiesLength; i++) {
    const groupByKey = properties[i];
    const group = {
      property: groupByKey,
      perValue: {}
    };
    const values = /* @__PURE__ */ new Set();
    for (let j = 0; j < allDocsLength; j++) {
      const doc = allDocs[j];
      const value = getNested(doc, groupByKey);
      if (typeof value === "undefined") {
        continue;
      }
      const keyValue = typeof value !== "boolean" ? value : "" + value;
      const perValue = group.perValue[keyValue] ?? {
        indexes: [],
        count: 0
      };
      if (perValue.count >= returnedCount) {
        continue;
      }
      perValue.indexes.push(j);
      perValue.count++;
      group.perValue[keyValue] = perValue;
      values.add(value);
    }
    listOfValues.push(Array.from(values));
    g[groupByKey] = group;
  }
  const combinations = calculateCombination(listOfValues);
  const combinationsLength = combinations.length;
  const groups = [];
  for (let i = 0; i < combinationsLength; i++) {
    const combination = combinations[i];
    const combinationLength = combination.length;
    const group = {
      values: [],
      indexes: []
    };
    const indexes = [];
    for (let j = 0; j < combinationLength; j++) {
      const value = combination[j];
      const property = properties[j];
      indexes.push(g[property].perValue[typeof value !== "boolean" ? value : "" + value].indexes);
      group.values.push(value);
    }
    group.indexes = intersect(indexes).sort((a, b) => a - b);
    if (group.indexes.length === 0) {
      continue;
    }
    groups.push(group);
  }
  const groupsLength = groups.length;
  const res = Array.from({ length: groupsLength });
  for (let i = 0; i < groupsLength; i++) {
    const group = groups[i];
    const reduce = groupBy.reduce || DEFAULT_REDUCE;
    const docs = group.indexes.map((index) => {
      return {
        id: allIDs[index],
        score: results[index][1],
        document: allDocs[index]
      };
    });
    const func = reduce.reducer.bind(null, group.values);
    const initialValue = reduce.getInitialValue(group.indexes.length);
    const aggregationValue = docs.reduce(func, initialValue);
    res[i] = {
      values: group.values,
      result: aggregationValue
    };
  }
  return res;
}
function calculateCombination(arrs, index = 0) {
  if (index + 1 === arrs.length)
    return arrs[index].map((item) => [item]);
  const head = arrs[index];
  const c2 = calculateCombination(arrs, index + 1);
  const combinations = [];
  for (const value of head) {
    for (const combination of c2) {
      const result = [value];
      safeArrayPush(result, combination);
      combinations.push(result);
    }
  }
  return combinations;
}

// node_modules/@orama/orama/dist/browser/components/pinning-manager.js
function applyPinningRules(orama, pinningStore, uniqueDocsArray, searchTerm) {
  const matchingRules = getMatchingRules(pinningStore, searchTerm);
  if (matchingRules.length === 0) {
    return uniqueDocsArray;
  }
  const allPromotions = matchingRules.flatMap((rule) => rule.consequence.promote);
  allPromotions.sort((a, b) => a.position - b.position);
  const pinnedInternalIds = /* @__PURE__ */ new Set();
  const promotionsMap = /* @__PURE__ */ new Map();
  const positionsTaken = /* @__PURE__ */ new Set();
  for (const promotion of allPromotions) {
    const internalId = getInternalDocumentId(orama.internalDocumentIDStore, promotion.doc_id);
    if (internalId === void 0) {
      continue;
    }
    if (promotionsMap.has(internalId)) {
      const existingPosition = promotionsMap.get(internalId);
      if (promotion.position < existingPosition) {
        promotionsMap.set(internalId, promotion.position);
      }
      continue;
    }
    if (positionsTaken.has(promotion.position)) {
      continue;
    }
    pinnedInternalIds.add(internalId);
    promotionsMap.set(internalId, promotion.position);
    positionsTaken.add(promotion.position);
  }
  if (promotionsMap.size === 0) {
    return uniqueDocsArray;
  }
  const unpinnedResults = uniqueDocsArray.filter(([id]) => !pinnedInternalIds.has(id));
  const BASE_PIN_SCORE = 1e6;
  const pinnedResults = [];
  for (const [internalId, position] of promotionsMap.entries()) {
    const existingResult = uniqueDocsArray.find(([id]) => id === internalId);
    if (existingResult) {
      pinnedResults.push([internalId, BASE_PIN_SCORE - position]);
    } else {
      const doc = orama.documentsStore.get(orama.data.docs, internalId);
      if (doc) {
        pinnedResults.push([internalId, 0]);
      }
    }
  }
  pinnedResults.sort((a, b) => {
    const posA = promotionsMap.get(a[0]) ?? Infinity;
    const posB = promotionsMap.get(b[0]) ?? Infinity;
    return posA - posB;
  });
  const finalResults = [];
  const pinnedByPosition = /* @__PURE__ */ new Map();
  for (const pinnedResult of pinnedResults) {
    const position = promotionsMap.get(pinnedResult[0]);
    pinnedByPosition.set(position, pinnedResult);
  }
  let unpinnedIndex = 0;
  let currentPosition = 0;
  while (currentPosition < unpinnedResults.length + pinnedResults.length) {
    if (pinnedByPosition.has(currentPosition)) {
      finalResults.push(pinnedByPosition.get(currentPosition));
      currentPosition++;
    } else if (unpinnedIndex < unpinnedResults.length) {
      finalResults.push(unpinnedResults[unpinnedIndex]);
      unpinnedIndex++;
      currentPosition++;
    } else {
      break;
    }
  }
  for (const [position, pinnedResult] of pinnedByPosition.entries()) {
    if (position >= finalResults.length) {
      finalResults.push(pinnedResult);
    }
  }
  return finalResults;
}

// node_modules/@orama/orama/dist/browser/methods/search-fulltext.js
function innerFullTextSearch(orama, params, language) {
  const { term, properties } = params;
  const index = orama.data.index;
  let propertiesToSearch = orama.caches["propertiesToSearch"];
  if (!propertiesToSearch) {
    const propertiesToSearchWithTypes = orama.index.getSearchablePropertiesWithTypes(index);
    propertiesToSearch = orama.index.getSearchableProperties(index);
    propertiesToSearch = propertiesToSearch.filter((prop) => propertiesToSearchWithTypes[prop].startsWith("string"));
    orama.caches["propertiesToSearch"] = propertiesToSearch;
  }
  if (properties && properties !== "*") {
    for (const prop of properties) {
      if (!propertiesToSearch.includes(prop)) {
        throw createError("UNKNOWN_INDEX", prop, propertiesToSearch.join(", "));
      }
    }
    propertiesToSearch = propertiesToSearch.filter((prop) => properties.includes(prop));
  }
  const hasFilters = Object.keys(params.where ?? {}).length > 0;
  let whereFiltersIDs;
  if (hasFilters) {
    whereFiltersIDs = orama.index.searchByWhereClause(index, orama.tokenizer, params.where, language);
  }
  let uniqueDocsIDs;
  const threshold = params.threshold !== void 0 && params.threshold !== null ? params.threshold : 1;
  if (term || properties) {
    const docsCount = count2(orama);
    uniqueDocsIDs = orama.index.search(index, term || "", orama.tokenizer, language, propertiesToSearch, params.exact || false, params.tolerance || 0, params.boost || {}, applyDefault(params.relevance), docsCount, whereFiltersIDs, threshold);
    if (params.exact && term) {
      const searchTerms = term.trim().split(/\s+/);
      uniqueDocsIDs = uniqueDocsIDs.filter(([docId]) => {
        const doc = orama.documentsStore.get(orama.data.docs, docId);
        if (!doc)
          return false;
        for (const prop of propertiesToSearch) {
          const propValue = getPropValue(doc, prop);
          if (typeof propValue === "string") {
            const hasAllTerms = searchTerms.every((searchTerm) => {
              const regex = new RegExp(`\\b${escapeRegex(searchTerm)}\\b`);
              return regex.test(propValue);
            });
            if (hasAllTerms) {
              return true;
            }
          }
        }
        return false;
      });
    }
  } else {
    if (hasFilters) {
      const geoResults = searchByGeoWhereClause(index, params.where);
      if (geoResults) {
        uniqueDocsIDs = geoResults;
      } else {
        const docIds = whereFiltersIDs ? Array.from(whereFiltersIDs) : [];
        uniqueDocsIDs = docIds.map((k) => [+k, 0]);
      }
    } else {
      const docIds = Object.keys(orama.documentsStore.getAll(orama.data.docs));
      uniqueDocsIDs = docIds.map((k) => [+k, 0]);
    }
  }
  return uniqueDocsIDs;
}
function escapeRegex(str) {
  return str.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}
function getPropValue(obj, path) {
  const keys = path.split(".");
  let value = obj;
  for (const key of keys) {
    if (value && typeof value === "object" && key in value) {
      value = value[key];
    } else {
      return void 0;
    }
  }
  return value;
}
function fullTextSearch(orama, params, language) {
  const timeStart = getNanosecondsTime();
  function performSearchLogic() {
    const vectorProperties = Object.keys(orama.data.index.vectorIndexes);
    const shouldCalculateFacets = params.facets && Object.keys(params.facets).length > 0;
    const { limit = 10, offset = 0, distinctOn, includeVectors = false } = params;
    const isPreflight = params.preflight === true;
    let uniqueDocsArray = innerFullTextSearch(orama, params, language);
    if (params.sortBy) {
      if (typeof params.sortBy === "function") {
        const ids = uniqueDocsArray.map(([id]) => id);
        const docs = orama.documentsStore.getMultiple(orama.data.docs, ids);
        const docsWithIdAndScore = docs.map((d, i) => [
          uniqueDocsArray[i][0],
          uniqueDocsArray[i][1],
          d
        ]);
        docsWithIdAndScore.sort(params.sortBy);
        uniqueDocsArray = docsWithIdAndScore.map(([id, score]) => [id, score]);
      } else {
        uniqueDocsArray = orama.sorter.sortBy(orama.data.sorting, uniqueDocsArray, params.sortBy).map(([id, score]) => [getInternalDocumentId(orama.internalDocumentIDStore, id), score]);
      }
    } else {
      uniqueDocsArray = uniqueDocsArray.sort(sortTokenScorePredicate);
    }
    uniqueDocsArray = applyPinningRules(orama, orama.data.pinning, uniqueDocsArray, params.term);
    let results;
    if (!isPreflight) {
      results = distinctOn ? fetchDocumentsWithDistinct(orama, uniqueDocsArray, offset, limit, distinctOn) : fetchDocuments(orama, uniqueDocsArray, offset, limit);
    }
    const searchResult = {
      elapsed: {
        formatted: "",
        raw: 0
      },
      hits: [],
      count: uniqueDocsArray.length
    };
    if (typeof results !== "undefined") {
      searchResult.hits = results.filter(Boolean);
      if (!includeVectors) {
        removeVectorsFromHits(searchResult, vectorProperties);
      }
    }
    if (shouldCalculateFacets) {
      const facets = getFacets(orama, uniqueDocsArray, params.facets);
      searchResult.facets = facets;
    }
    if (params.groupBy) {
      searchResult.groups = getGroups(orama, uniqueDocsArray, params.groupBy);
    }
    searchResult.elapsed = orama.formatElapsedTime(getNanosecondsTime() - timeStart);
    return searchResult;
  }
  async function executeSearchAsync() {
    if (orama.beforeSearch) {
      await runBeforeSearch(orama.beforeSearch, orama, params, language);
    }
    const searchResult = performSearchLogic();
    if (orama.afterSearch) {
      await runAfterSearch(orama.afterSearch, orama, params, language, searchResult);
    }
    return searchResult;
  }
  const asyncNeeded = orama.beforeSearch?.length || orama.afterSearch?.length;
  if (asyncNeeded) {
    return executeSearchAsync();
  }
  return performSearchLogic();
}
var defaultBM25Params = {
  k: 1.2,
  b: 0.75,
  d: 0.5
};
function applyDefault(bm25Relevance) {
  const r = bm25Relevance ?? {};
  r.k = r.k ?? defaultBM25Params.k;
  r.b = r.b ?? defaultBM25Params.b;
  r.d = r.d ?? defaultBM25Params.d;
  return r;
}

// node_modules/@orama/orama/dist/browser/methods/search-vector.js
function innerVectorSearch(orama, params, language) {
  const vector = params.vector;
  if (vector && (!("value" in vector) || !("property" in vector))) {
    throw createError("INVALID_VECTOR_INPUT", Object.keys(vector).join(", "));
  }
  const vectorIndex = orama.data.index.vectorIndexes[vector.property];
  if (!vectorIndex) {
    throw createError("UNKNOWN_VECTOR_PROPERTY", vector.property);
  }
  const vectorSize = vectorIndex.node.size;
  if (vector?.value.length !== vectorSize) {
    if (vector?.property === void 0 || vector?.value.length === void 0) {
      throw createError("INVALID_INPUT_VECTOR", "undefined", vectorSize, "undefined");
    }
    throw createError("INVALID_INPUT_VECTOR", vector.property, vectorSize, vector.value.length);
  }
  const index = orama.data.index;
  let whereFiltersIDs;
  const hasFilters = Object.keys(params.where ?? {}).length > 0;
  if (hasFilters) {
    whereFiltersIDs = orama.index.searchByWhereClause(index, orama.tokenizer, params.where, language);
  }
  return vectorIndex.node.find(vector.value, params.similarity ?? DEFAULT_SIMILARITY, whereFiltersIDs);
}
function searchVector(orama, params, language = "english") {
  const timeStart = getNanosecondsTime();
  function performSearchLogic() {
    let results = innerVectorSearch(orama, params, language).sort(sortTokenScorePredicate);
    results = applyPinningRules(orama, orama.data.pinning, results, void 0);
    let facetsResults = [];
    const shouldCalculateFacets = params.facets && Object.keys(params.facets).length > 0;
    if (shouldCalculateFacets) {
      const facets = getFacets(orama, results, params.facets);
      facetsResults = facets;
    }
    const vectorProperty = params.vector.property;
    const includeVectors = params.includeVectors ?? false;
    const limit = params.limit ?? 10;
    const offset = params.offset ?? 0;
    const docs = Array.from({ length: limit });
    for (let i = 0; i < limit; i++) {
      const result = results[i + offset];
      if (!result) {
        break;
      }
      const doc = orama.data.docs.docs[result[0]];
      if (doc) {
        if (!includeVectors) {
          doc[vectorProperty] = null;
        }
        const newDoc = {
          id: getDocumentIdFromInternalId(orama.internalDocumentIDStore, result[0]),
          score: result[1],
          document: doc
        };
        docs[i] = newDoc;
      }
    }
    let groups = [];
    if (params.groupBy) {
      groups = getGroups(orama, results, params.groupBy);
    }
    const timeEnd = getNanosecondsTime();
    const elapsedTime = timeEnd - timeStart;
    return {
      count: results.length,
      hits: docs.filter(Boolean),
      elapsed: {
        raw: Number(elapsedTime),
        formatted: formatNanoseconds(elapsedTime)
      },
      ...facetsResults ? { facets: facetsResults } : {},
      ...groups ? { groups } : {}
    };
  }
  async function executeSearchAsync() {
    if (orama.beforeSearch) {
      await runBeforeSearch(orama.beforeSearch, orama, params, language);
    }
    const results = performSearchLogic();
    if (orama.afterSearch) {
      await runAfterSearch(orama.afterSearch, orama, params, language, results);
    }
    return results;
  }
  const asyncNeeded = orama.beforeSearch?.length || orama.afterSearch?.length;
  if (asyncNeeded) {
    return executeSearchAsync();
  }
  return performSearchLogic();
}

// node_modules/@orama/orama/dist/browser/methods/search-hybrid.js
function innerHybridSearch(orama, params, language) {
  const fullTextIDs = minMaxScoreNormalization(innerFullTextSearch(orama, params, language));
  const vectorIDs = innerVectorSearch(orama, params, language);
  const hybridWeights = params.hybridWeights;
  return mergeAndRankResults(fullTextIDs, vectorIDs, params.term ?? "", hybridWeights);
}
function hybridSearch(orama, params, language) {
  const timeStart = getNanosecondsTime();
  function performSearchLogic() {
    let uniqueTokenScores = innerHybridSearch(orama, params, language);
    uniqueTokenScores = applyPinningRules(orama, orama.data.pinning, uniqueTokenScores, params.term);
    let facetsResults;
    const shouldCalculateFacets = params.facets && Object.keys(params.facets).length > 0;
    if (shouldCalculateFacets) {
      facetsResults = getFacets(orama, uniqueTokenScores, params.facets);
    }
    let groups;
    if (params.groupBy) {
      groups = getGroups(orama, uniqueTokenScores, params.groupBy);
    }
    const offset = params.offset ?? 0;
    const limit = params.limit ?? 10;
    const results = fetchDocuments(orama, uniqueTokenScores, offset, limit).filter(Boolean);
    const timeEnd = getNanosecondsTime();
    const returningResults = {
      count: uniqueTokenScores.length,
      elapsed: {
        raw: Number(timeEnd - timeStart),
        formatted: formatNanoseconds(timeEnd - timeStart)
      },
      hits: results,
      ...facetsResults ? { facets: facetsResults } : {},
      ...groups ? { groups } : {}
    };
    const includeVectors = params.includeVectors ?? false;
    if (!includeVectors) {
      const vectorProperties = Object.keys(orama.data.index.vectorIndexes);
      removeVectorsFromHits(returningResults, vectorProperties);
    }
    return returningResults;
  }
  async function executeSearchAsync() {
    if (orama.beforeSearch) {
      await runBeforeSearch(orama.beforeSearch, orama, params, language);
    }
    const results = performSearchLogic();
    if (orama.afterSearch) {
      await runAfterSearch(orama.afterSearch, orama, params, language, results);
    }
    return results;
  }
  const asyncNeeded = orama.beforeSearch?.length || orama.afterSearch?.length;
  if (asyncNeeded) {
    return executeSearchAsync();
  }
  return performSearchLogic();
}
function extractScore(token) {
  return token[1];
}
function minMaxScoreNormalization(results) {
  const maxScore = Math.max.apply(Math, results.map(extractScore));
  return results.map(([id, score]) => [id, score / maxScore]);
}
function normalizeScore(score, maxScore) {
  return score / maxScore;
}
function hybridScoreBuilder(textWeight, vectorWeight) {
  return (textScore, vectorScore) => textScore * textWeight + vectorScore * vectorWeight;
}
function mergeAndRankResults(textResults, vectorResults, query, hybridWeights) {
  const maxTextScore = Math.max.apply(Math, textResults.map(extractScore));
  const maxVectorScore = Math.max.apply(Math, vectorResults.map(extractScore));
  const hasHybridWeights = hybridWeights && hybridWeights.text && hybridWeights.vector;
  const { text: textWeight, vector: vectorWeight } = hasHybridWeights ? hybridWeights : getQueryWeights(query);
  const mergedResults = /* @__PURE__ */ new Map();
  const textResultsLength = textResults.length;
  const hybridScore = hybridScoreBuilder(textWeight, vectorWeight);
  for (let i = 0; i < textResultsLength; i++) {
    const [id, score] = textResults[i];
    const normalizedScore = normalizeScore(score, maxTextScore);
    const hybridScoreValue = hybridScore(normalizedScore, 0);
    mergedResults.set(id, hybridScoreValue);
  }
  const vectorResultsLength = vectorResults.length;
  for (let i = 0; i < vectorResultsLength; i++) {
    const [resultId, score] = vectorResults[i];
    const normalizedScore = normalizeScore(score, maxVectorScore);
    const existingRes = mergedResults.get(resultId) ?? 0;
    mergedResults.set(resultId, existingRes + hybridScore(0, normalizedScore));
  }
  return [...mergedResults].sort((a, b) => b[1] - a[1]);
}
function getQueryWeights(query) {
  return {
    text: 0.5,
    vector: 0.5
  };
}

// node_modules/@orama/orama/dist/browser/methods/search.js
function search2(orama, params, language) {
  const mode = params.mode ?? MODE_FULLTEXT_SEARCH;
  if (mode === MODE_FULLTEXT_SEARCH) {
    return fullTextSearch(orama, params, language);
  }
  if (mode === MODE_VECTOR_SEARCH) {
    return searchVector(orama, params);
  }
  if (mode === MODE_HYBRID_SEARCH) {
    return hybridSearch(orama, params);
  }
  throw createError("INVALID_SEARCH_MODE", mode);
}
function fetchDocumentsWithDistinct(orama, uniqueDocsArray, offset, limit, distinctOn) {
  const docs = orama.data.docs;
  const values = /* @__PURE__ */ new Map();
  const results = [];
  const resultIDs = /* @__PURE__ */ new Set();
  const uniqueDocsArrayLength = uniqueDocsArray.length;
  let count3 = 0;
  for (let i = 0; i < uniqueDocsArrayLength; i++) {
    const idAndScore = uniqueDocsArray[i];
    if (typeof idAndScore === "undefined") {
      continue;
    }
    const [id, score] = idAndScore;
    if (resultIDs.has(id)) {
      continue;
    }
    const doc = orama.documentsStore.get(docs, id);
    const value = getNested(doc, distinctOn);
    if (typeof value === "undefined" || values.has(value)) {
      continue;
    }
    values.set(value, true);
    count3++;
    if (count3 <= offset) {
      continue;
    }
    results.push({ id: getDocumentIdFromInternalId(orama.internalDocumentIDStore, id), score, document: doc });
    resultIDs.add(id);
    if (count3 >= offset + limit) {
      break;
    }
  }
  return results;
}
function fetchDocuments(orama, uniqueDocsArray, offset, limit) {
  const docs = orama.data.docs;
  const results = Array.from({
    length: limit
  });
  const resultIDs = /* @__PURE__ */ new Set();
  for (let i = offset; i < limit + offset; i++) {
    const idAndScore = uniqueDocsArray[i];
    if (typeof idAndScore === "undefined") {
      break;
    }
    const [id, score] = idAndScore;
    if (!resultIDs.has(id)) {
      const fullDoc = orama.documentsStore.get(docs, id);
      results[i] = { id: getDocumentIdFromInternalId(orama.internalDocumentIDStore, id), score, document: fullDoc };
      resultIDs.add(id);
    }
  }
  return results;
}

// packages/Epoch.Community.Web/src/search/orama-backend.ts
var import_community_core = __toESM(require_dist2());
var ORAMA_BACKEND_VERSION = "3.1.18";
var ORAMA_ANALYZER_VERSION = "orama-3.1.18-en-v1";
var ORAMA_SCHEMA = { objectId: "string", text: "string" };
function createOramaLexicalIndex() {
  let database = create5({ schema: ORAMA_SCHEMA, language: "english" });
  let health = {
    backendId: "orama-browser",
    backendVersion: ORAMA_BACKEND_VERSION,
    analyzerVersion: ORAMA_ANALYZER_VERSION,
    documentCount: 0,
    generation: 0,
    state: "ready"
  };
  let closed = false;
  const ensureOpen = () => {
    if (closed) throw new import_community_core.CommunityError("INDEX_STALE", "Orama browser index is closed");
  };
  const index = {
    rebuild: async (documents) => {
      ensureOpen();
      const next = create5({ schema: ORAMA_SCHEMA, language: "english" });
      health = { ...health, state: "rebuilding" };
      try {
        if (documents.length > 0) await insertMultiple(next, documents.map((document) => ({
          id: document.objectId,
          objectId: document.objectId,
          text: document.text
        })), 500);
        database = next;
        health = { ...health, documentCount: documents.length, generation: health.generation + 1, state: "ready" };
      } catch (error) {
        health = { ...health, state: "stale" };
        throw new import_community_core.CommunityError("INDEX_STALE", "Orama rebuild failed; the previous generation remains active", void 0, { cause: error });
      }
    },
    search: async ({ query, allowedObjectIds, limit, signal }) => {
      ensureOpen();
      abort(signal);
      validateLexicalRequest(query, allowedObjectIds, limit);
      if (allowedObjectIds.length === 0) return [];
      const result = await search2(database, {
        term: query,
        properties: ["text"],
        where: { objectId: [...allowedObjectIds] },
        tolerance: 0,
        threshold: 0,
        limit
      });
      abort(signal);
      const authorized = new Set(allowedObjectIds);
      const seen = /* @__PURE__ */ new Set();
      const hits = Object.freeze(result.hits.flatMap((hit) => {
        const objectId = String(hit.document.objectId);
        if (!authorized.has(objectId) || seen.has(objectId) || !Number.isFinite(hit.score)) return [];
        seen.add(objectId);
        return [Object.freeze({ objectId, score: hit.score })];
      }));
      health = { ...health, lastCandidateCount: hits.length };
      return hits;
    },
    health: () => Object.freeze({ ...health }),
    close: async () => {
      closed = true;
      database = create5({ schema: ORAMA_SCHEMA, language: "english" });
      health = { ...health, documentCount: 0, state: "closed" };
    }
  };
  return Object.freeze(index);
}
function validateLexicalRequest(query, allowedObjectIds, limit) {
  if (query.length === 0 || new TextEncoder().encode(query).length > 16384) {
    throw new import_community_core.CommunityError("QUERY_COST_LIMIT", "Orama lexical query must be a non-empty bounded value");
  }
  if (!Number.isSafeInteger(limit) || limit < 1 || limit > 1e5 || allowedObjectIds.length > 1e5) {
    throw new import_community_core.CommunityError("QUERY_COST_LIMIT", "Orama candidate request exceeds the supported limit");
  }
  if (allowedObjectIds.some((id) => !/^[A-Za-z0-9][A-Za-z0-9._~-]{0,127}$/u.test(id))) {
    throw new import_community_core.CommunityError("INVALID_ENTITY", "Orama candidate authorization contains an invalid object ID");
  }
}
function abort(signal) {
  if (signal?.aborted === true) throw new DOMException("Search was cancelled", "AbortError");
}

// packages/Epoch.Community.Web/src/search/search-worker.ts
var MAX_DOCUMENTS = 1e5;
var MAX_DOCUMENT_BYTES = 10 * 1024 * 1024;
var MAX_TOTAL_BYTES = 128 * 1024 * 1024;
var REQUEST_ID = /^[A-Za-z0-9][A-Za-z0-9._~-]{0,127}$/u;
var OBJECT_ID = /^[A-Za-z0-9][A-Za-z0-9._~-]{0,127}$/u;
function createSearchWorkerHandler(index, postMessage) {
  const active = /* @__PURE__ */ new Map();
  return async (request) => {
    if (!REQUEST_ID.test(request.requestId)) {
      postMessage(failure("invalid-request", new import_community_core2.CommunityError("QUERY_COST_LIMIT", "Worker request ID is invalid")));
      return;
    }
    if (request.type === "cancel") {
      active.get(request.targetRequestId)?.abort();
      active.delete(request.targetRequestId);
      postMessage(success(request.requestId));
      return;
    }
    const controller = new AbortController();
    active.set(request.requestId, controller);
    try {
      switch (request.type) {
        case "rebuild":
          validateDocuments(request.documents);
          await index.rebuild(request.documents);
          postMessage(success(request.requestId));
          break;
        case "search":
          postMessage(success(request.requestId, await index.search({
            query: request.query,
            allowedObjectIds: request.allowedObjectIds,
            limit: request.limit,
            signal: controller.signal
          })));
          break;
        case "health":
          postMessage(success(request.requestId, index.health()));
          break;
        case "close":
          await index.close();
          postMessage(success(request.requestId));
          break;
      }
    } catch (error) {
      postMessage(failure(request.requestId, error));
    } finally {
      active.delete(request.requestId);
    }
  };
}
function installSearchWorker(scope, index = createOramaLexicalIndex()) {
  const handle = createSearchWorkerHandler(index, (response) => scope.postMessage(response));
  scope.addEventListener("message", (event) => {
    void handle(event.data);
  });
}
function validateDocuments(documents) {
  if (documents.length > MAX_DOCUMENTS) {
    throw new import_community_core2.CommunityError("QUERY_COST_LIMIT", "Browser index rebuild exceeds the document limit");
  }
  const encoder = new TextEncoder();
  let totalBytes = 0;
  const seen = /* @__PURE__ */ new Set();
  for (const document of documents) {
    if (!OBJECT_ID.test(document.objectId) || seen.has(document.objectId)) {
      throw new import_community_core2.CommunityError("INVALID_ENTITY", "Browser index document IDs must be unique canonical object IDs");
    }
    seen.add(document.objectId);
    const bytes = encoder.encode(document.text).length;
    if (bytes > MAX_DOCUMENT_BYTES) {
      throw new import_community_core2.CommunityError("QUERY_COST_LIMIT", "Browser index document exceeds the text limit");
    }
    totalBytes += bytes;
    if (totalBytes > MAX_TOTAL_BYTES) {
      throw new import_community_core2.CommunityError("QUERY_COST_LIMIT", "Browser index rebuild exceeds the total text limit");
    }
  }
}
function success(requestId, result) {
  return { requestId, ok: true, ...result === void 0 ? {} : { result } };
}
function failure(requestId, error) {
  if ((0, import_community_core2.isCommunityError)(error)) {
    return { requestId, ok: false, error: { code: error.code, message: error.message } };
  }
  if (error instanceof DOMException && error.name === "AbortError") {
    return { requestId, ok: false, error: { code: "CANCELLED", message: "Search was cancelled" } };
  }
  return { requestId, ok: false, error: { code: "INTERNAL", message: "Browser search worker failed" } };
}

// packages/Epoch.Community.Web/src/search/orama-worker-entry.ts
installSearchWorker(self);
