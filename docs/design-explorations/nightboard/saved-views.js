/** Durable named query projections. Query semantics remain owned by NB_QUERY. */
(function () {
  "use strict";

  var STORAGE_KEY = "nb-saved-views-v2";
  var LEGACY_KEY = "nb-saved-views-v1";
  var SCHEMA_VERSION = 3;
  var principalId = null;
  var recoveryRaw = null;

  function failedState(raw, reason, detail) {
    recoveryRaw = raw;
    return {
      schemaVersion: SCHEMA_VERSION,
      views: [],
      error: detail,
      recovery: {
        reason: reason,
        message: detail + "; export the saved-view state or reset it before saving",
        actions: ["export", "reset"],
      },
    };
  }

  function read() {
    try {
      var current = window.localStorage.getItem(STORAGE_KEY);
      var parsed = JSON.parse(current || "null");
      if (!parsed || !Array.isArray(parsed.views)) {
        return current ? failedState(current, "unsupported", "unsupported saved-view schema")
          : migrateLegacy();
      }
      if (parsed.schemaVersion === 2) return migrateState(parsed, current);
      if (parsed.schemaVersion !== SCHEMA_VERSION) {
        return failedState(current, "unsupported", "unsupported saved-view schema");
      }
      recoveryRaw = null;
      return parsed;
    } catch (error) {
      var raw = null;
      try { raw = window.localStorage.getItem(STORAGE_KEY); } catch { /* private */ }
      return failedState(raw, "malformed", "saved-view state is malformed: " +
        (error && error.message || String(error)));
    }
  }

  function migrateState(state, raw) {
    try {
      var next = {
        schemaVersion: SCHEMA_VERSION,
        views: state.views.map(function (view) {
          var query = window.NB_CORE.migrateNormalizedQuery({
            query: view.query,
            canonical: view.canonical,
            ast: view.ast,
            sort: view.order,
            queryLanguageVersion: view.queryLanguageVersion,
          });
          if (query.error) throw new Error(query.error);
          return Object.assign({}, view, {
            ownerId: view.ownerId || null,
            query: query.canonical,
            ast: query.ast,
            queryLanguageVersion: query.version,
            order: view.order || query.sort || "new",
          });
        }),
      };
      if (!write(next)) throw new Error("storage may be unavailable or full");
      recoveryRaw = null;
      return next;
    } catch (error) {
      return failedState(raw, "migration", "saved view migration failed: " +
        (error && error.message || String(error)));
    }
  }

  function migrateLegacy() {
    var empty = { schemaVersion: SCHEMA_VERSION, views: [] };
    try {
      var raw = window.localStorage.getItem(LEGACY_KEY);
      if (!raw) return empty;
      var legacy = JSON.parse(raw);
      var source = Array.isArray(legacy) ? legacy : legacy.views;
      if (!Array.isArray(source)) return Object.assign(empty, { error: "legacy saved views are malformed" });
      var now = new Date().toISOString();
      var migrated = source.map(function (view) {
        var query = window.NB_CORE.migrateNormalizedQuery({
          query: view.query || "",
          queryLanguageVersion: view.queryLanguageVersion || 0,
        });
        if (query.error) throw new Error(query.error);
        return {
          projectionId: view.projectionId || view.id,
          kind: "saved-query",
          label: view.label || view.name || "Saved view",
          visibility: view.visibility || "private",
          ownerId: view.ownerId || null,
          query: query.canonical,
          ast: query.ast,
          queryLanguageVersion: query.version,
          order: view.order || query.sort || "new",
          version: 1,
          createdAt: view.createdAt || now,
          updatedAt: view.updatedAt || now,
        };
      });
      var next = { schemaVersion: SCHEMA_VERSION, views: migrated };
      if (!write(next)) throw new Error("storage may be unavailable or full");
      recoveryRaw = null;
      return next;
    } catch (error) {
      return failedState(raw, "migration", "saved view migration failed: " +
        (error && error.message || String(error)));
    }
  }

  function write(state) {
    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
      return true;
    } catch {
      return false;
    }
  }

  function exportState() {
    try {
      return recoveryRaw != null ? recoveryRaw :
        (window.localStorage.getItem(STORAGE_KEY) || window.localStorage.getItem(LEGACY_KEY));
    } catch {
      return recoveryRaw;
    }
  }

  function resetState() {
    try {
      window.localStorage.removeItem(STORAGE_KEY);
      window.localStorage.removeItem(LEGACY_KEY);
      recoveryRaw = null;
      return true;
    } catch {
      return false;
    }
  }

  function requireWritable(state) {
    if (state && state.error) throw new Error(state.recovery && state.recovery.message || state.error);
    return state;
  }

  function createId() {
    if (window.crypto && typeof window.crypto.randomUUID === "function") {
      return "view-" + window.crypto.randomUUID();
    }
    return "view-" + Date.now().toString(36) + "-" + Math.random().toString(36).slice(2, 10);
  }

  function validateVisibility(value) {
    if (value !== "private" && value !== "shared" && value !== "public") {
      throw new Error("saved view visibility must be private, shared, or public");
    }
    return value;
  }

  function normalized(query) {
    var result = window.NB_QUERY.normalize(query);
    if (result.error) throw new Error(result.error);
    return result;
  }

  function setPrincipal(value) {
    principalId = typeof value === "string" && value.trim() ? value.trim() : null;
    if (!principalId) return null;
    var state = read();
    if (state.error) return principalId;
    var changed = false;
    state.views = state.views.map(function (view) {
      if (view.ownerId) return view;
      changed = true;
      return Object.assign({}, view, { ownerId: principalId });
    });
    if (changed) write(state);
    return principalId;
  }

  function selectedPrincipal(options) {
    return options && typeof options.principalId === "string" ? options.principalId : principalId;
  }

  function canAccess(view, options) {
    return window.NB_CORE.canReadCommunityResource({
      kind: "saved-view",
      resourceId: view.projectionId,
      visibility: view.visibility,
      ownerId: view.ownerId || undefined,
    }, { actorId: selectedPrincipal(options) || undefined });
  }

  function requirePrincipal() {
    if (!principalId) throw new Error("saved view requires an authenticated principal");
    return principalId;
  }

  function save(input) {
    input = input || {};
    var ownerId = requirePrincipal();
    var query = normalized(input.query || "");
    var state = requireWritable(read());
    var now = new Date().toISOString();
    var view = {
      projectionId: input.projectionId || createId(),
      kind: "saved-query",
      label: String(input.label || "Saved view").trim() || "Saved view",
      visibility: validateVisibility(input.visibility || "private"),
      ownerId: ownerId,
      query: query.canonical,
      ast: query.ast,
      queryLanguageVersion: query.version,
      order: input.order || query.sort || "new",
      version: 1,
      createdAt: input.createdAt || now,
      updatedAt: now,
    };
    var existing = state.views.findIndex(function (item) {
      return item.projectionId === view.projectionId;
    });
    if (existing >= 0) {
      if (state.views[existing].ownerId !== ownerId) throw new Error("saved view permission denied");
      view.createdAt = state.views[existing].createdAt;
      view.version = (state.views[existing].version || 1) + 1;
      state.views[existing] = view;
    } else {
      state.views.push(view);
    }
    if (!write(state)) throw new Error("saved view could not be persisted; storage may be unavailable or full");
    return view;
  }

  function get(projectionId, options) {
    options = options || {};
    var view = read().views.find(function (item) { return item.projectionId === projectionId; }) || null;
    if (view && view.visibility === "private" && options.includePrivate === false) return null;
    return view && canAccess(view, options) ? forViewer(view, options) : null;
  }

  function list(options) {
    options = options || {};
    return read().views.filter(function (view) {
      return (options.includePrivate !== false || view.visibility !== "private") && canAccess(view, options);
    }).map(function (view) { return forViewer(view, options); });
  }

  function forViewer(view, options) {
    var copy = Object.assign({}, view);
    if (selectedPrincipal(options) === view.ownerId) return copy;
    delete copy.query;
    delete copy.ast;
    return copy;
  }

  function rename(projectionId, label) {
    var view = get(projectionId);
    if (!view) throw new Error("saved view not found: " + projectionId);
    return save(Object.assign({}, view, { label: label }));
  }

  function remove(projectionId) {
    var state = requireWritable(read());
    var existing = state.views.find(function (view) { return view.projectionId === projectionId; });
    if (!existing || existing.ownerId !== principalId) return false;
    var count = state.views.length;
    state.views = state.views.filter(function (view) { return view.projectionId !== projectionId; });
    return count !== state.views.length && write(state);
  }

  function open(projectionId, objects, context) {
    context = context || {};
    var options = {
      includePrivate: context.includePrivate !== false,
      principalId: context.principalId,
    };
    var view = read().views.find(function (item) { return item.projectionId === projectionId; }) || null;
    if (view && view.visibility === "private" && options.includePrivate === false) view = null;
    if (view && !canAccess(view, options)) view = null;
    if (!view) return { view: null, posts: [], error: "saved view is unavailable or unauthorized" };
    var visible = (objects || []).filter(function (post) {
      if (typeof context.authorize === "function") return context.authorize(post, view);
      return view.visibility === "private" || !post.dm;
    });
    var result = window.NB_QUERY.apply(visible, view.query, context);
    return Object.assign({ view: forViewer(view, options) }, result);
  }

  window.NB_SAVED_VIEWS = {
    save: save,
    setPrincipal: setPrincipal,
    get: get,
    list: list,
    rename: rename,
    delete: remove,
    open: open,
    exportState: exportState,
    resetState: resetState,
    STORAGE_KEY: STORAGE_KEY,
    SCHEMA_VERSION: SCHEMA_VERSION,
    LEGACY_KEY: LEGACY_KEY,
  };
})();
