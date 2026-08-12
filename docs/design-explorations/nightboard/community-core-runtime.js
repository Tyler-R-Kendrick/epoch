/* Generated from packages/Epoch.Community.Core/src/index.ts. Run npm run nightboard:build. */
/* global URLSearchParams */
"use strict";
var NB_CORE = (() => {
  var __defProp = Object.defineProperty;
  var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
  var __getOwnPropNames = Object.getOwnPropertyNames;
  var __hasOwnProp = Object.prototype.hasOwnProperty;
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

  // packages/Epoch.Community.Core/src/index.ts
  var index_exports = {};
  __export(index_exports, {
    BUILT_IN_ACTIONS: () => BUILT_IN_ACTIONS,
    COMMUNITY_QUERY_FIELDS: () => COMMUNITY_QUERY_FIELDS,
    NAVIGATION_ACTION_IDS: () => NAVIGATION_ACTION_IDS,
    QUERY_LANGUAGE_VERSION: () => QUERY_LANGUAGE_VERSION,
    VERSION: () => VERSION,
    canReadCommunityResource: () => canReadCommunityResource,
    createActionRegistry: () => createActionRegistry,
    createCommunityClient: () => createCommunityClient,
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
    if (target.visibility === "private" && (actorId === void 0 || actorId !== target.ownerId)) {
      return false;
    }
    return true;
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
  function validateObjectRef(value) {
    if (typeof value !== "object" || value === null) throw new Error("Community object reference must be an object");
    const ref = value;
    if (typeof ref.objectId !== "string" || !opaqueId.test(ref.objectId)) {
      throw new Error("Community objectId must be an opaque URL-safe identifier");
    }
    if (typeof ref.kind !== "string" || !kinds.has(ref.kind)) {
      throw new Error(`Unsupported community object kind: ${String(ref.kind)}`);
    }
    if (ref.atUri !== void 0 && !/^at:\/\/[^/]+\/[^/]+\/[^/]+$/u.test(ref.atUri)) {
      throw new Error("Federated object identity must be a valid AT URI");
    }
    if (ref.revision !== void 0 && (ref.revision.length === 0 || ref.revision.length > 512)) {
      throw new Error("Community object revision must be a non-empty bounded value");
    }
    return Object.freeze({
      objectId: ref.objectId,
      kind: ref.kind,
      ...ref.atUri === void 0 ? {} : { atUri: ref.atUri },
      ...ref.revision === void 0 ? {} : { revision: ref.revision }
    });
  }
  function validateProjectionId(projectionId) {
    if (!opaqueId.test(projectionId)) throw new Error("Projection ID must be an opaque URL-safe identifier");
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
      if (revision.length === 0) throw new Error("Exact object links require a revision");
      params.set("revision", revision);
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
    for (const object of objects) {
      const key = object.parentRef?.objectId ?? spec.root.objectId;
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
        const key = object.parentRef?.objectId ?? spec.root.objectId;
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
        index += 1;
        let phrase = "";
        while (index < input.length && input[index] !== '"') {
          phrase += input[index];
          index += 1;
        }
        if (input[index] !== '"') throw new Error("unterminated quoted phrase");
        index += 1;
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
