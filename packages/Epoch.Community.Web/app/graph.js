/** Community Web host adapter for the portable @epoch/community-graphql runtime. */
(function () {
  "use strict";

  var D = window.CW_DATA;
  var MAP = window.CW_MAP;
  var CORE = window.CW_CORE;
  var PORTABLE = window.CommunityGraphQL;
  var COMPLETE = Object.freeze({ status: "complete", sources: [], omittedSources: [], unsupportedPredicates: [] });
  var CURSOR_KEY = new Uint8Array(32).fill(37);
  var FIELD_REGISTRY = CORE.createCommunityFieldRegistry([], CORE.QUERY_FIELD_REGISTRY_VERSION);
  var COMPILE_CONTEXT = {
    fields: CORE.CORE_COMMUNITY_FIELDS.map(function (field) { return field.name; }),
    sortableFields: CORE.CORE_COMMUNITY_FIELDS.filter(function (field) { return field.sortable; })
      .map(function (field) { return field.name; }),
    limits: { maxDepth: 24, maxNodes: 512, maxFanout: 1000, maxTemplateLength: 256,
      maxSegmentLength: 120, maxRelationDepth: 8 },
  };
  var states = new Map();
  var projectionStates = new Map();
  var snapshots = new Map();
  var schema;

  function allPosts() {
    var live = window.CW_APP && window.CW_APP.state && window.CW_APP.state.merged || [];
    return (D.posts || []).concat(D.projectPosts || [], live.filter(function (post) { return !post.dm; }));
  }

  function allDmMessages() {
    var live = window.CW_APP && window.CW_APP.state && window.CW_APP.state.merged || [];
    return (D.dmMessages || []).concat(live.filter(function (post) { return !!post.dm; }));
  }

  function readableDmIds(viewer) {
    return new Set(viewer && viewer.actorId ? viewer.readableDmIds || [] : []);
  }

  function canViewPost(post, viewer) {
    if (!post || !post.dm) return true;
    return readableDmIds(viewer).has(post.dm);
  }

  function dmIdFromNotification(notification) {
    var match = /^\/dms\/([^/?#]+)/.exec(String(notification && notification.where || ""));
    return match ? decodeURIComponent(match[1]) : null;
  }

  /** Filter before hints, counts, collision names, or content become observable. */
  function filterNamespaceEntries(path, entries, viewer) {
    var parts = MAP.split(path);
    var readable = readableDmIds(viewer);
    if (parts[0] === "dms" && parts[1] && !readable.has(parts[1])) return [];
    return (entries || []).filter(function (entry) {
      var dmId = parts[0] === "dms" && parts.length === 1
        ? entry.dm && entry.dm.id || entry.name
        : entry.post && entry.post.dm || dmIdFromNotification(entry.notification);
      return !dmId || readable.has(dmId);
    }).map(function (entry) {
      if (parts.length !== 0 || entry.name !== "dms") return entry;
      var visible = (D.dms || []).filter(function (dm) { return readable.has(dm.id); });
      var unread = visible.reduce(function (count, dm) { return count + (dm.unread || 0); }, 0);
      return Object.assign({}, entry, {
        hint: visible.length + " threads" + (unread ? " · " + unread + " unread" : ""),
      });
    });
  }

  /** UI-facing namespace listing stays a thin presentation adapter over the canonical map. */
  function listPath(path, viewer) {
    var live = window.CW_APP && window.CW_APP.state && window.CW_APP.state.merged || [];
    var entries = MAP.list(path, live);
    return entries && filterNamespaceEntries(path, entries, viewer || {});
  }

  function visibleDefinitions(authorization) {
    var definitions = [CORE.builtinDefaultProjection].concat(window.CW_WORKBENCH ? window.CW_WORKBENCH.definitions() : []);
    return definitions.filter(function (definition, index, values) {
      if (values.findIndex(function (item) { return item.projectionId === definition.projectionId; }) !== index) return false;
      return definition.visibility === "public" || definition.ownerId === authorization.actorId;
    });
  }

  function visibleMounts(authorization, definitions) {
    var ids = new Set(definitions.map(function (definition) { return definition.projectionId; }));
    return (window.CW_WORKBENCH ? window.CW_WORKBENCH.mounts() : []).filter(function (mount) {
      return ids.has(mount.projectionId) && (!mount.ownerId || mount.ownerId === authorization.actorId);
    }).map(function (mount) {
      return Object.assign({
        createdAt: D.board.observedAt,
        updatedAt: D.board.observedAt,
        order: 0,
        writable: false,
      }, mount);
    });
  }

  function authorizationKey(authorization) {
    return JSON.stringify({
      actorId: authorization.actorId || null,
      permissions: (authorization.permissions || []).slice().sort(),
      readableDmIds: (authorization.readableDmIds || []).slice().sort(),
    });
  }

  function corpusKey(authorization) {
    return JSON.stringify({
      authorization: authorizationKey(authorization),
      corpus: allPosts().concat(allDmMessages().filter(function (post) { return canViewPost(post, authorization); }))
        .map(function (post) { return [post.id, post.state, post.updatedAt || post.at, post.subject || "", post.body || ""]; }),
      definitions: visibleDefinitions(authorization),
      mounts: window.CW_WORKBENCH ? window.CW_WORKBENCH.mounts() : [],
    });
  }

  async function stateFor(authorization) {
    var key = corpusKey(authorization);
    var cached = states.get(key);
    if (cached) return cached;
    var promise = createState(authorization);
    states.set(key, promise);
    if (states.size > 8) states.delete(states.keys().next().value);
    try { return await promise; }
    catch (error) { states.delete(key); throw error; }
  }

  async function createState(authorization) {
    var entities = entitiesFor(authorization);
    var backend = new CORE.ReferenceSearchBackend({ registry: FIELD_REGISTRY, cursorKey: CURSOR_KEY });
    await backend.rebuild(entities);
    var checkpoint = {
      sourceId: "community-web-host",
      token: "entities-" + CORE.stableQueryHash(JSON.stringify(entities.map(function (entity) {
        return [entity.ref.objectId, entity.updatedAt, entity.fields, entity.searchableText];
      }))),
      observedAt: D.board.observedAt,
      status: "current",
    };
    var fields = Object.fromEntries(FIELD_REGISTRY.list(authorization).map(function (field) {
      return [field.name, { operators: field.operators, sortable: field.sortable, facetable: field.facetable }];
    }));
    var fingerprint = await CORE.authorizationFingerprint(authorization);
    var nextId = 0;
    var runtimeContext = CORE.createCommunityRuntimeContext({
      clock: { now: function () { return new Date(D.board.observedAt); } },
      idGenerator: { generate: function (namespace) {
        nextId += 1;
        return namespace + "-" + fingerprint.slice(7, 19) + "-" + nextId;
      } },
      timezone: "UTC",
      locale: "en-US",
    });
    var search = new CORE.SearchService({
      backend: backend,
      registry: FIELD_REGISTRY,
      context: runtimeContext,
      sources: [{ sourceId: "community-web-host", fields: fields, fullText: "lexical",
        supportsRelations: true, checkpoint: checkpoint }],
    });
    var definitions = visibleDefinitions(authorization);
    var projection = new CORE.EntityProjectionRuntime({
      entities: entities,
      completeness: Object.freeze(Object.assign({}, COMPLETE, { sources: [checkpoint] })),
      cursorKey: CURSOR_KEY,
      compileContext: COMPILE_CONTEXT,
    }, definitions);
    var namespace = CORE.createNamespaceRuntime(projection, visibleMounts(authorization, definitions));
    return { entities: entities, byId: new Map(entities.map(function (entity) { return [entity.ref.objectId, entity]; })),
      backend: backend, search: search, projection: projection, namespace: namespace, checkpoint: checkpoint,
      authorizationFingerprint: fingerprint };
  }

  function entitiesFor(authorization) {
    var byId = new Map();
    function add(entity) { if (!byId.has(entity.ref.objectId)) byId.set(entity.ref.objectId, entity); }
    allPosts().forEach(function (post) { add(messageEntity(post, false, authorization)); });
    allDmMessages().filter(function (post) { return canViewPost(post, authorization); })
      .forEach(function (post) { add(messageEntity(post, true, authorization)); });
    (D.projects || []).forEach(function (project) {
      add(genericEntity({ objectId: "project-" + MAP.slug(project.slug), kind: "project" }, project.slug,
        { state: "open" }, "public"));
    });
    (D.channels || []).filter(function (channel) { return !channel.voice && channel.kind !== "voice"; })
      .forEach(function (channel) {
        add(genericEntity({ objectId: "channel-" + channel.id, kind: "channel" }, channel.label,
          { state: channel.kind || "open" }, "public"));
      });
    var readable = readableDmIds(authorization);
    (D.dms || []).filter(function (dm) { return readable.has(dm.id); }).forEach(function (dm) {
      add(genericEntity({ objectId: dm.objectId || "dm-" + dm.id, kind: "dm" }, dm.peer,
        { state: dm.unread ? "unread" : "read", dmId: dm.id }, "private", authorization.actorId));
    });
    (D.members || []).forEach(function (member) {
      add(genericEntity({ objectId: member.objectId || "member-" + member.handle, kind: member.kind === "agent" ? "agent" : "member" },
        member.handle, { state: member.state || member.role || "member", author: member.handle }, "public"));
    });
    ((D.agents && D.agents.board) || []).forEach(function (agent) {
      add(genericEntity({ objectId: agent.objectId || "agent-" + agent.id, kind: "agent" }, agent.name || agent.id,
        { state: agent.status || "agent", author: agent.id }, "public"));
    });
    (D.notifications || []).filter(function (notification) {
      var dmId = dmIdFromNotification(notification);
      return !dmId || readable.has(dmId);
    }).forEach(function (notification) {
      add(genericEntity(notification.ref || { objectId: "notification-" + notification.id, kind: "notification" },
        notification.title || notification.body || notification.id, { state: notification.read ? "read" : "unread" }, "public"));
    });
    visibleDefinitions(authorization).forEach(function (definition) {
      if (definition.projectionId === "builtin:default") return;
      add(genericEntity({ objectId: definition.projectionId, kind: "projection" }, definition.label,
        { state: definition.updateMode }, definition.visibility === "public" ? "public" : "private", definition.ownerId));
    });
    return Object.freeze(Array.from(byId.values()));
  }

  function messageEntity(post, isDm, authorization) {
    var message = MAP.toCommunityMessage(post);
    return CORE.communityMessageToEntity(message, {
      provenance: { sourceId: "community-web-host", nativeId: message.ref.objectId, observedAt: message.updatedAt || message.publishedAt },
      visibility: isDm ? "private" : "public",
      ...(isDm ? { ownerId: authorization.actorId, participantIds: [authorization.actorId] } : {}),
    });
  }

  function genericEntity(ref, title, extraFields, visibility, ownerId) {
    ref = CORE.validateObjectRef(ref);
    var fields = Object.assign({ objectId: ref.objectId, kind: ref.kind, title: String(title || ref.objectId),
      createdAt: D.board.observedAt, updatedAt: D.board.observedAt, visibility: visibility }, extraFields || {});
    return CORE.validateCommunityEntity({
      ref: ref,
      fields: fields,
      searchableText: { title: fields.title },
      relations: [],
      visibility: visibility,
      ...(ownerId ? { ownerId: ownerId, participantIds: [ownerId] } : { participantIds: [] }),
      createdAt: D.board.observedAt,
      updatedAt: D.board.observedAt,
      provenance: { sourceId: "community-web-host", nativeId: ref.objectId, observedAt: D.board.observedAt },
    });
  }

  function canSeeDefinition(definition, authorization) {
    return definition.visibility === "public" || definition.ownerId === authorization.actorId;
  }

  function requireActor(authorization) {
    if (!authorization.actorId) throw new CORE.CommunityError("AUTHORIZATION_DENIED", "An authenticated principal is required");
    return authorization.actorId;
  }

  var services = {
    node: async function (id, authorization) { return (await stateFor(authorization)).byId.get(id); },
    observableFields: function (entity, authorization) {
      var allowed = new Set(FIELD_REGISTRY.list(authorization).map(function (field) { return field.name; }));
      return Object.fromEntries(Object.entries(entity.fields).filter(function (pair) { return allowed.has(pair[0]); }));
    },
    search: async function (input) {
      var state = await stateFor(input.authorization);
      var expression = scopedExpression(input.where, input.scope);
      var snapshot;
      if (input.snapshot) {
        snapshot = snapshots.get(input.snapshot);
        if (!snapshot) throw new CORE.CommunityError("CURSOR_STALE", "Search snapshot is unavailable or stale");
      }
      var page = await state.search.search({ expression: expression, order: input.orderBy,
        authorization: input.authorization, first: input.first,
        ...(input.after ? { after: input.after } : {}), ...(snapshot ? { snapshot: snapshot } : {}),
        ...(input.signal ? { signal: input.signal } : {}) });
      snapshots.set(page.snapshot.snapshotId, page.snapshot);
      if (snapshots.size > 64) snapshots.delete(snapshots.keys().next().value);
      return page;
    },
    parseSearch: function (expression, input) {
      return CORE.normalizeQuery(expression, { actorId: input.authorization.actorId, authorization: input.authorization,
        timezone: input.timezone || "UTC", locale: input.locale || "en-US", now: D.board.observedAt,
        fieldRegistry: FIELD_REGISTRY, fieldRegistryVersion: FIELD_REGISTRY.version });
    },
    explainSearch: async function (input) {
      var state = await stateFor(input.authorization);
      return state.backend.explain(await state.search.plan({ expression: scopedExpression(input.where, input.scope), order: input.orderBy,
        authorization: input.authorization, limit: 100 }));
    },
    projections: async function (authorization) { return visibleDefinitions(authorization); },
    projection: async function (id, authorization) {
      return visibleDefinitions(authorization).find(function (definition) { return definition.projectionId === id; });
    },
    saveProjection: async function (definition, authorization) {
      var actor = requireActor(authorization);
      if (definition.ownerId && definition.ownerId !== actor) throw new CORE.CommunityError("AUTHORIZATION_DENIED", "Projection owner does not match the authenticated principal");
      var state = {};
      window.CW_WORKBENCH.openProjection(state, Object.assign({}, definition, { ownerId: actor }));
      var saved = window.CW_WORKBENCH.saveProjection(state);
      clearStateCaches();
      return saved;
    },
    deleteProjection: async function (id, authorization) {
      var definition = visibleDefinitions(authorization).find(function (item) { return item.projectionId === id; });
      if (!definition || definition.ownerId !== requireActor(authorization)) throw new CORE.CommunityError("AUTHORIZATION_DENIED", "Only the projection owner may delete it");
      var deleted = window.CW_WORKBENCH.deleteProjection(id);
      clearStateCaches();
      return deleted;
    },
    projectionContext: async function (authorization, snapshot) {
      var state = await stateFor(authorization);
      projectionStates.set(state.authorizationFingerprint, state);
      return { authorizationFingerprint: state.authorizationFingerprint,
        snapshotId: snapshot || "community-web-" + D.board.observedAt.replace(/[^0-9]/g, "") };
    },
    listPath: async function (input) {
      var state = stateForAuthorization(input.context);
      var page = { first: input.first, ...(input.after ? { after: input.after } : {}) };
      return input.namespace ? state.projection.list(input.namespace, input.path, page, input.context)
        : state.namespace.list(input.path, page, input.context);
    },
    resolvePath: async function (input) {
      var state = stateForAuthorization(input.context);
      return input.namespace ? state.projection.resolve(input.namespace, input.path, input.context)
        : state.namespace.resolve(input.path, input.context);
    },
    locate: async function (input) {
      var state = stateForAuthorization(input.context);
      var entity = state.byId.get(input.objectId);
      if (!entity) return [];
      return input.namespace ? state.projection.locate(input.namespace, entity.ref, input.context)
        : state.namespace.locate(entity.ref, input.context);
    },
    explainPath: async function (input) {
      var state = stateForAuthorization(input.context);
      return input.namespace ? state.projection.explain(input.namespace, input.path, input.context)
        : state.namespace.explain(input.path, input.context);
    },
    sourceCapabilities: async function (authorization) {
      var fields = Object.fromEntries(FIELD_REGISTRY.list(authorization).map(function (field) {
        return [field.name, { type: field.type, operators: field.operators, sortable: field.sortable, facetable: field.facetable }];
      }));
      return [{ sourceId: "community-web-host", fields: fields, fullText: "lexical", pagination: "keyset",
        supportsWatch: false, supportsPointLookup: true, supportsRelations: true, maxPageSize: 1000 }];
    },
    namespaceMounts: async function (authorization) { return (await stateFor(authorization)).namespace.mounts(); },
    mountProjection: async function (input, authorization) {
      var actor = requireActor(authorization);
      var definition = visibleDefinitions(authorization).find(function (item) { return item.projectionId === input.projectionId; });
      if (!definition || !canSeeDefinition(definition, authorization)) throw new CORE.CommunityError("AUTHORIZATION_DENIED", "Projection is unavailable");
      var now = D.board.observedAt;
      var mount = Object.assign({}, input, { ownerId: actor, createdAt: now, updatedAt: now });
      window.CW_WORKBENCH.mount(mount);
      clearStateCaches();
      return mount;
    },
    unmountProjection: async function (id, authorization) {
      var actor = requireActor(authorization);
      var mount = window.CW_WORKBENCH.mounts().find(function (item) { return item.mountId === id; });
      if (!mount || mount.ownerId && mount.ownerId !== actor) throw new CORE.CommunityError("AUTHORIZATION_DENIED", "Only the mount owner may remove it");
      var removed = window.CW_WORKBENCH.unmount(id);
      clearStateCaches();
      return removed;
    },
    resetNamespace: async function (scope, authorization) {
      requireActor(authorization);
      var before = window.CW_WORKBENCH.mounts().filter(function (mount) { return mount.scope === scope; });
      window.CW_WORKBENCH.resetNamespace(scope);
      clearStateCaches();
      return { scope: scope, removedMountIds: before.map(function (mount) { return mount.mountId; }).sort(),
        preservedProjectionIds: visibleDefinitions(authorization).map(function (definition) { return definition.projectionId; }).sort() };
    },
    projectionDeltas: async function* () {},
  };

  function scopedExpression(expression, scope) {
    if (!scope) return expression;
    if (scope.sourceIds && scope.sourceIds.some(function (sourceId) { return sourceId !== "community-web-host"; })) {
      throw new CORE.CommunityError("QUERY_UNSUPPORTED_SOURCE", "Search scope names an unavailable source");
    }
    if (!scope.objectKinds || scope.objectKinds.length === 0) return expression;
    return { kind: "and", terms: [expression,
      { kind: "compare", field: "kind", operator: "in", value: scope.objectKinds }] };
  }

  function clearStateCaches() {
    states.clear();
    projectionStates.clear();
  }

  /* Projection contexts carry only a fingerprint; recover the matching authorized state. */
  function stateForAuthorization(context) {
    var state = projectionStates.get(context.authorizationFingerprint);
    if (state) return state;
    throw new CORE.CommunityError("AUTHORIZATION_DENIED", "Projection authorization context is stale");
  }

  function ready() {
    if (!PORTABLE || typeof PORTABLE.createCommunityGraphQLSchema !== "function") return false;
    if (!schema) schema = PORTABLE.createCommunityGraphQLSchema(services);
    return true;
  }

  async function query(source, variables, viewer) {
    if (!ready()) return { errors: [{ message: "Portable Community GraphQL runtime is unavailable",
      extensions: { code: "SOURCE_UNAVAILABLE" } }] };
    var authorization = Object.assign({}, viewer || {});
    var key = await CORE.authorizationFingerprint(authorization);
    var context = { authorization: authorization, hostStateKey: key };
    return PORTABLE.executeCommunityGraphQL({ schema: schema, source: source,
      variableValues: variables || undefined, context: context });
  }

  function introspect(viewer) {
    return query("{ __schema { queryType { fields { name } } mutationType { fields { name } } } }", undefined, viewer);
  }

  window.CW_GRAPH = {
    query: query,
    introspect: introspect,
    listPath: listPath,
    filterNamespaceEntries: filterNamespaceEntries,
    SDL: PORTABLE && PORTABLE.COMMUNITY_GRAPHQL_SDL || "",
  };
})();
