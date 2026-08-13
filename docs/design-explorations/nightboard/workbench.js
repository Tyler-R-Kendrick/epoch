/** Thin Nightboard host for the canonical Community query and projection runtimes. */
(function () {
  "use strict";

  var HISTORY_KEY = "nb-search-history-v1";
  var DEFINITIONS_KEY = "nb-projection-definitions-v1";
  var SCHEMA_INPUT_KEYS = ["nb-saved-views-v2", "nb-saved-views-v1"];
  var MOUNTS_KEY = "nb-namespace-mounts-v1";
  var TABS = ["query", "results", "explain", "history"];
  var PROJECTION_TABS = ["definition", "preview", "diff", "explain", "validation"];
  var definitionRecovery = null;

  function esc(value) {
    return String(value == null ? "" : value).replace(/&/g, "&amp;").replace(/</g, "&lt;")
      .replace(/>/g, "&gt;").replace(/"/g, "&quot;");
  }

  function history() {
    try {
      var parsed = JSON.parse(window.localStorage.getItem(HISTORY_KEY) || "[]");
      if (!Array.isArray(parsed)) return [];
      return parsed.filter(function (entry) {
        return entry && typeof entry.queryHash === "string" && typeof entry.canonical === "string";
      }).slice(0, 50);
    } catch { return []; }
  }

  function recordHistory(query) {
    if (!query || !query.queryHash || query.error) return;
    var old = history();
    var previous = old.find(function (entry) { return entry.queryHash === query.queryHash; });
    var next = [{ queryHash: query.queryHash, canonical: query.canonical,
      resolvedAt: query.resolvedAt, favorite: !!(previous && previous.favorite) }]
      .concat(old.filter(function (entry) { return entry.queryHash !== query.queryHash; })).slice(0, 50);
    try { window.localStorage.setItem(HISTORY_KEY, JSON.stringify(next)); } catch { /* private ephemeral mode */ }
  }

  function openSearch(state, expression) {
    state.searchWorkbench = {
      kind: "search", tab: "query", expression: String(expression || ""), localFilter: "",
      running: false, parsed: null, result: null, explanation: null,
    };
    return state.searchWorkbench;
  }

  function openProjection(state, definition) {
    state.searchWorkbench = {
      kind: "projection", tab: "definition", source: JSON.stringify(definition || window.NB_CORE.builtinDefaultProjection, null, 2) + "\n",
      path: "/", diagnostics: [], running: false,
    };
    return state.searchWorkbench;
  }

  function parseProjection(workbench) {
    try { return JSON.parse(workbench.source); }
    catch (error) { throw new Error("Projection JSON is invalid: " + error.message, { cause: error }); }
  }

  function compileProjection(state) {
    var workbench = state.searchWorkbench;
    if (!workbench || workbench.kind !== "projection") throw new Error("Projection workbench is closed");
    try {
      var fields = window.NB_CORE.CORE_COMMUNITY_FIELDS;
      workbench.compiled = window.NB_CORE.compileProjectionDefinition(parseProjection(workbench), {
        fields: fields.map(function (field) { return field.name; }),
        sortableFields: fields.filter(function (field) { return field.sortable; }).map(function (field) { return field.name; }),
        limits: { maxDepth: 24, maxNodes: 512, maxFanout: 1000, maxTemplateLength: 256,
          maxSegmentLength: 120, maxRelationDepth: 8 },
      });
      workbench.diagnostics = workbench.compiled.diagnostics;
      workbench.error = null;
    } catch (error) {
      workbench.compiled = null;
      workbench.diagnostics = error.diagnostics || [{ code: "PROJECTION_INVALID", message: error.message, pointer: "/", severity: "error" }];
      workbench.error = error.message;
    }
    workbench.tab = "validation";
    return workbench;
  }

  function previewProjection(state) {
    var workbench = state.searchWorkbench;
    if (!workbench.compiled) compileProjection(state);
    if (!workbench.compiled) return workbench;
    var definition = workbench.compiled.definition;
    var root = definition.root;
    workbench.preview = root.kind === "literal" ? root.children.map(function (node) {
      return { nodeId: node.nodeId, kind: node.kind, segment: node.segment && (node.segment.template || node.segment) || "dynamic" };
    }) : [{ nodeId: root.nodeId, kind: root.kind, segment: "dynamic" }];
    workbench.tab = "preview";
    return workbench;
  }

  function definitions() {
    try {
      var current = window.localStorage.getItem(DEFINITIONS_KEY);
      if (current) {
        var parsed = JSON.parse(current);
        if (!Array.isArray(parsed)) throw new Error("Projection Definition state must be an array");
        return parsed;
      }
      return migrateSchemaInputs();
    } catch (error) {
      var raw = null;
      try { raw = recoverableDefinitionState(); } catch { /* storage can be unavailable */ }
      definitionRecovery = { raw: raw, message: "Projection Definition recovery required: " + error.message };
      return [];
    }
  }

  function migrateSchemaInputs() {
    var raw = recoverableDefinitionState();
    if (!raw) return [];
    var decoded = JSON.parse(raw);
    var inputs = Array.isArray(decoded) ? decoded : decoded && Array.isArray(decoded.views) ? decoded.views : null;
    if (!inputs) throw new Error("Saved query schema input is malformed");
    var migrated = inputs.map(function (input) {
      var normalized = window.NB_CORE.migrateNormalizedQuery({
        query: input.query || input.canonical || "",
        ast: input.ast,
        sort: input.order,
        queryLanguageVersion: input.queryLanguageVersion,
      });
      if (!normalized.ast || normalized.error) throw new Error(normalized.error || "Saved query has no Search Expression");
      return definitionFromSearch(input.projectionId || input.id, input.label || input.name, normalized, input.version || 1);
    });
    window.localStorage.setItem(DEFINITIONS_KEY, JSON.stringify(migrated));
    SCHEMA_INPUT_KEYS.forEach(function (key) { window.localStorage.removeItem(key); });
    definitionRecovery = null;
    return migrated;
  }

  function recoverableDefinitionState() {
    for (var index = 0; index < SCHEMA_INPUT_KEYS.length; index += 1) {
      var raw = window.localStorage.getItem(SCHEMA_INPUT_KEYS[index]);
      if (raw) return raw;
    }
    return null;
  }

  function definitionFromSearch(projectionId, label, normalized, version) {
    var order = normalized.sort && normalized.sort.length ? normalized.sort : [
      { field: "updatedAt", direction: "descending", nulls: "last" },
      { field: "objectId", direction: "ascending", nulls: "last" },
    ];
    return {
      apiVersion: "epoch.dev/v1alpha1", projectionId: String(projectionId || "projection-search-" + normalized.queryHash),
      version: version, label: String(label || "Projection"), visibility: "private",
      root: { nodeId: "root", kind: "literal", segment: "", children: [{
        nodeId: "selection", kind: "select",
        objectKinds: ["message", "thread", "channel", "dm", "notification", "project", "issue", "change", "member", "agent", "artifact"],
        where: normalized.ast, order: order,
        children: [{ nodeId: "result", kind: "leaf", segment: { template: "{slug(coalesce(title, objectId))}" }, representation: "default" }],
      }] }, order: order, updateMode: "live", consistency: "current",
    };
  }

  function saveProjection(state) {
    var workbench = compileProjection(state);
    if (!workbench.compiled) throw new Error(workbench.error || "Projection is invalid");
    var definition = workbench.compiled.definition;
    var existing = definitions();
    if (definitionRecovery) throw new Error(definitionRecovery.message + "; export or reset before saving");
    var next = [definition].concat(existing.filter(function (item) { return item.projectionId !== definition.projectionId; }));
    window.localStorage.setItem(DEFINITIONS_KEY, JSON.stringify(next));
    return definition;
  }

  function saveSearchProjection(state, label) {
    var workbench = state.searchWorkbench;
    if (!workbench || workbench.kind !== "search" || !workbench.parsed || workbench.parsed.error) {
      throw new Error("Run a valid deterministic search before saving a projection");
    }
    var projectionId = "projection-search-" + workbench.parsed.queryHash;
    var existing = definitions();
    if (definitionRecovery) throw new Error(definitionRecovery.message + "; export or reset before saving");
    var previous = existing.find(function (item) { return item.projectionId === projectionId; });
    var definition = definitionFromSearch(projectionId, label || "Projection", workbench.parsed, previous ? previous.version + 1 : 1);
    window.NB_CORE.compileProjectionDefinition(definition, {
      fields: window.NB_CORE.CORE_COMMUNITY_FIELDS.map(function (field) { return field.name; }),
      sortableFields: window.NB_CORE.CORE_COMMUNITY_FIELDS.filter(function (field) { return field.sortable; }).map(function (field) { return field.name; }),
      limits: { maxDepth: 24, maxNodes: 512, maxFanout: 1000, maxTemplateLength: 256, maxSegmentLength: 120, maxRelationDepth: 8 },
    });
    var next = [definition].concat(existing.filter(function (item) { return item.projectionId !== projectionId; }));
    window.localStorage.setItem(DEFINITIONS_KEY, JSON.stringify(next));
    return definition;
  }

  function deleteProjection(projectionId) {
    var before = definitions();
    if (definitionRecovery) throw new Error(definitionRecovery.message + "; export or reset before deleting");
    var next = before.filter(function (item) { return item.projectionId !== projectionId; });
    window.localStorage.setItem(DEFINITIONS_KEY, JSON.stringify(next));
    return next.length !== before.length;
  }

  function mounts() {
    try { var parsed = JSON.parse(window.localStorage.getItem(MOUNTS_KEY) || "[]"); return Array.isArray(parsed) ? parsed : []; }
    catch { return []; }
  }

  function mount(input) {
    if (!input || !input.mountId || !input.projectionId || !input.mountPath) throw new Error("Mount ID, projection, and path are required");
    if (input.mountPath === "/.epoch" || input.mountPath.indexOf("/.epoch/") === 0) throw new Error("NAMESPACE_RECOVERY_PROTECTED: /.epoch cannot be shadowed");
    var next = [input].concat(mounts().filter(function (item) { return item.mountId !== input.mountId; }));
    window.localStorage.setItem(MOUNTS_KEY, JSON.stringify(next));
    return input;
  }

  function unmount(mountId) {
    var before = mounts();
    var next = before.filter(function (item) { return item.mountId !== mountId; });
    window.localStorage.setItem(MOUNTS_KEY, JSON.stringify(next));
    return next.length !== before.length;
  }

  function resetNamespace(scope) {
    var kept = mounts().filter(function (item) { return item.scope !== scope; });
    window.localStorage.setItem(MOUNTS_KEY, JSON.stringify(kept));
    return { scope: scope, mounts: kept, recoveryPath: "/.epoch/default" };
  }

  function definitionStatus() { definitions(); return definitionRecovery && { reason: "migration", message: definitionRecovery.message }; }
  function exportDefinitions() { var current = definitions(); return definitionRecovery ? definitionRecovery.raw : JSON.stringify(current, null, 2); }
  function resetDefinitions() {
    try {
      window.localStorage.removeItem(DEFINITIONS_KEY);
      SCHEMA_INPUT_KEYS.forEach(function (key) { window.localStorage.removeItem(key); });
      definitionRecovery = null;
      return true;
    } catch { return false; }
  }

  function close(state) { state.searchWorkbench = null; }

  function runSearch(state, options) {
    options = options || {};
    var workbench = state.searchWorkbench || openSearch(state, options.expression);
    workbench.expression = String(options.expression == null ? workbench.expression || "" : options.expression);
    workbench.running = true;
    workbench.error = null;
    var parsed = window.NB_CORE.normalizeQuery(workbench.expression, {
      actorId: options.actorId,
      timezone: options.timezone || "UTC",
      locale: options.locale || "en-US",
    });
    workbench.parsed = parsed;
    if (parsed.error) {
      workbench.running = false;
      workbench.tab = "query";
      workbench.error = parsed.error;
      return Promise.resolve(workbench);
    }
    var result = window.NB_QUERY.searchBoard(parsed.canonical, options.context || {});
    var sourceCheckpoints = options.sourceCheckpoints || [
      { sourceId: "nightboard-host", token: "resident", observedAt: parsed.resolvedAt, status: "current" },
    ];
    var completenessStatus = options.completenessStatus || (sourceCheckpoints.some(function (source) {
      return source.status === "stale";
    }) ? "stale" : sourceCheckpoints.some(function (source) {
      return source.status === "partial" || source.status === "unavailable";
    }) ? "partial" : "complete");
    workbench.result = {
      hits: result.hits || [],
      matched: result.matched || 0,
      completeness: {
        status: completenessStatus,
        sources: sourceCheckpoints,
        omittedSources: [], unsupportedPredicates: [],
      },
      snapshot: { snapshotId: parsed.queryHash, queryHash: parsed.queryHash, resolvedNow: parsed.resolvedAt },
    };
    workbench.running = false;
    workbench.tab = "results";
    recordHistory(parsed);
    return Promise.resolve(workbench);
  }

  function explainSearch(state) {
    var workbench = state.searchWorkbench;
    if (!workbench || !workbench.parsed || workbench.parsed.error) return Promise.reject(new Error("Run a valid search first"));
    workbench.explanation = {
      parsed: workbench.expression,
      normalized: workbench.parsed.canonical,
      canonicalJson: workbench.parsed.canonicalJson,
      authorization: "pre-filtered",
      backend: "epoch-reference",
      ordering: workbench.parsed.sort,
      omissions: workbench.result ? workbench.result.completeness.omittedSources : [],
    };
    workbench.tab = "explain";
    return Promise.resolve(workbench);
  }

  function selectTab(state, tab) {
    var workbench = state.searchWorkbench;
    if (!workbench) return;
    var allowed = workbench.kind === "projection" ? PROJECTION_TABS : TABS;
    if (allowed.indexOf(tab) >= 0) workbench.tab = tab;
  }

  function render(state) {
    var workbench = state.searchWorkbench;
    if (!workbench) return "";
    return workbench.kind === "projection" ? renderProjection(workbench) : renderSearch(workbench);
  }

  function tabs(items, selected, prefix) {
    return '<div role="tablist" aria-label="' + esc(prefix) + ' workbench sections" class="cn-workbench-tabs">' +
      items.map(function (tab) {
        var active = tab === selected;
        return '<button type="button" role="tab" data-workbench-tab="' + esc(tab) + '" aria-selected="' + active +
          '" tabindex="' + (active ? "0" : "-1") + '">' + esc(tab.charAt(0).toUpperCase() + tab.slice(1)) + '</button>';
      }).join("") + "</div>";
  }

  function diagnostic(workbench) {
    var item = workbench.parsed && workbench.parsed.diagnostics && workbench.parsed.diagnostics[0];
    if (!item) return "";
    var span = item.span || {};
    return '<p class="cn-workbench-error" data-search-diagnostic role="alert" data-line="' + esc(span.line || 1) +
      '" data-column="' + esc(span.column || 1) + '">' + esc(item.message) +
      (item.suggestions && item.suggestions.length ? " · try " + esc(item.suggestions.join(", ")) : "") + "</p>";
  }

  function renderSearch(workbench) {
    var body;
    if (workbench.tab === "query") {
      body = '<label class="cn-workbench-field">Deterministic query<textarea data-search-expression="true" rows="4" ' +
        'aria-describedby="cn-search-guidance">' + esc(workbench.expression) + '</textarea></label>' +
        '<p id="cn-search-guidance">Lucene-like typed syntax. Ctrl+Enter runs. AI is never invoked.</p>' + diagnostic(workbench) +
        '<div class="cn-workbench-actions"><button type="button" data-search-run>Run search</button>' +
        '<button type="button" data-search-cancel' + (workbench.running ? "" : " disabled") + '>Cancel</button></div>';
    } else if (workbench.tab === "results") {
      var result = workbench.result || { hits: [], completeness: { status: "partial", sources: [] } };
      body = '<div class="cn-search-completeness" role="status" data-search-completeness>' + esc(result.completeness.status) +
        ' · ' + result.hits.length + ' authorized result' + (result.hits.length === 1 ? "" : "s") + '</div>' +
        '<div class="cn-source-badges">' + result.completeness.sources.map(function (source) {
          return '<span data-search-source="' + esc(source.sourceId) + '">' + esc(source.sourceId) + ' · ' + esc(source.status) + '</span>';
        }).join("") + '</div><label>Filter these results<input data-search-local-filter value="' + esc(workbench.localFilter || "") + '"></label>' +
        '<ol class="cn-search-results">' + result.hits.map(function (hit) {
          var target = hit.objectId || (hit.target && hit.target.objectId) || (hit.post && hit.post.id) || hit.where || hit.path || "unknown";
          return '<li data-search-target="' + esc(target) + '"><button type="button" data-search-open-target="' + esc(target) +
            '" data-goto="' + esc(hit.path || "/") + '"><b>' + esc(hit.label || target) + '</b><span>' + esc(hit.hint || hit.path || "") + '</span></button></li>';
        }).join("") + '</ol>';
    } else if (workbench.tab === "explain") {
      body = '<pre data-search-explanation tabindex="0">' + esc(JSON.stringify(workbench.explanation || {
        message: "Run Explain after a search to inspect pushdown, residual evaluation, authorization, and ordering.",
      }, null, 2)) + '</pre><button type="button" data-search-explain>Refresh explanation</button>';
    } else {
      body = '<ol class="cn-search-history">' + history().map(function (entry) {
        return '<li><button type="button" data-search-history-query="' + esc(entry.canonical) + '">' + esc(entry.canonical) +
          '</button>' + (entry.favorite ? '<span aria-label="Favorite">★</span>' : "") + '</li>';
      }).join("") + '</ol>';
    }
    return '<section class="cn-workbench" data-search-workbench aria-label="Search workbench">' +
      '<header><div><b>Search</b><span>cross-source · deterministic</span></div><button type="button" data-workbench-close aria-label="Close search workbench">×</button></header>' +
      tabs(TABS, workbench.tab, "Search") + '<div role="tabpanel">' + body + '</div></section>';
  }

  function renderProjection(workbench) {
    var body = workbench.tab === "definition"
      ? '<label class="cn-workbench-field">Projection definition<textarea data-projection-definition rows="18">' + esc(workbench.source) + '</textarea></label>' +
        '<button type="button" data-projection-validate>Validate</button><button type="button" data-projection-preview>Preview</button>'
      : '<pre tabindex="0">' + esc(JSON.stringify(workbench[workbench.tab] || workbench.diagnostics || [], null, 2)) + '</pre>' +
        (workbench.error ? '<p role="alert">' + esc(workbench.error) + '</p>' : '');
    return '<section class="cn-workbench" data-projection-workbench aria-label="Projection workbench"><header><div><b>Projection</b>' +
      '<span>definition · preview before mount</span></div><button type="button" data-workbench-close aria-label="Close projection workbench">×</button></header>' +
      tabs(PROJECTION_TABS, workbench.tab, "Projection") + '<div role="tabpanel">' + body + '</div></section>';
  }

  window.NB_WORKBENCH = {
    openSearch: openSearch, openProjection: openProjection, close: close, runSearch: runSearch,
    explainSearch: explainSearch, selectTab: selectTab, render: render, history: history,
    compileProjection: compileProjection, previewProjection: previewProjection, saveProjection: saveProjection,
    saveSearchProjection: saveSearchProjection, deleteProjection: deleteProjection,
    definitions: definitions, mounts: mounts, mount: mount, unmount: unmount, resetNamespace: resetNamespace,
    definitionStatus: definitionStatus, exportDefinitions: exportDefinitions, resetDefinitions: resetDefinitions,
  };
})();
