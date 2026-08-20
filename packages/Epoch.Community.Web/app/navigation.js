/** Canonical Community Web navigation, history, jump, and interaction-layer primitives. */
(function () {
  "use strict";

  var ROUTE_KEYS = [
    "projectionId", "objectId", "revision", "threadRootId", "detailObjectId",
    "savedViewId", "query", "sort", "workspaceId", "focusRegion",
    "readingAnchor",
  ];

  function text(value) { return String(value == null ? "" : value); }

  function canonicalLocation(input) {
    input = input || {};
    var out = {};
    ROUTE_KEYS.forEach(function (key) {
      var value = input[key];
      if (value == null || value === "") return;
      if (key === "readingAnchor") {
        if (value && value.objectId) {
          out.readingAnchor = {
            objectId: text(value.objectId),
            pixelOffset: Number.isFinite(value.pixelOffset) ? value.pixelOffset : 0,
          };
        }
        return;
      }
      out[key] = globalThis.CW_VALUE.isString(value) ? value : text(value);
    });
    return out;
  }

  function routeUrl(location, origin) {
    var loc = canonicalLocation(location);
    var base = text(origin || (window.location && window.location.origin));
    var params = new window.URLSearchParams();
    if (loc.projectionId) params.set("projection", loc.projectionId);
    if (loc.objectId) params.set(loc.projectionId ? "focus" : "object", loc.objectId);
    if (loc.revision) params.set("revision", loc.revision);
    if (loc.threadRootId) params.set("thread", loc.threadRootId);
    if (loc.savedViewId) params.set("view", loc.savedViewId);
    if (loc.query) params.set("query", loc.query);
    if (loc.sort) params.set("sort", loc.sort);
    if (loc.workspaceId) params.set("workspace", loc.workspaceId);
    var query = params.toString();
    return base + "/board.html" + (query ? "?" + query : "");
  }

  function parseLocation(url) {
    var parsed = new window.URL(url, text(window.location && window.location.origin) || "http://localhost");
    var params = parsed.searchParams;
    return canonicalLocation({
      projectionId: params.get("projection"),
      objectId: params.get("focus") || params.get("object"),
      revision: params.get("revision"),
      threadRootId: params.get("thread"),
      savedViewId: params.get("view"),
      query: params.get("query"),
      sort: params.get("sort"),
      workspaceId: params.get("workspace"),
    });
  }

  function normalizePath(path) {
    var parts = [];
    text(path || "/").split("/").forEach(function (part) {
      if (!part || part === ".") return;
      if (part === "..") parts.pop();
      else parts.push(part);
    });
    return "/" + parts.join("/");
  }

  function resolvePath(cwd, input) {
    var value = text(input || ".").trim();
    if (value === "-") return "-";
    if (value.charAt(0) === "/") return normalizePath(value);
    return normalizePath(text(cwd || "/") + "/" + value);
  }

  function resolveDeterministic(cwd, input, candidates, previous) {
    var raw = text(input || ".").trim();
    var expected = raw === "-" ? normalizePath(previous || cwd || "/") : resolvePath(cwd, raw);
    var list = (candidates || []).filter(function (candidate) {
      return normalizePath(candidate.path) === expected ||
        (candidate.aliases || []).some(function (alias) { return normalizePath(alias) === expected; });
    });
    if (list.length === 1) {
      return { ok: true, path: normalizePath(list[0].path), candidate: list[0], aliasUsed: normalizePath(list[0].path) !== expected };
    }
    if (list.length > 1) return { ok: false, reason: "ambiguous", candidates: list };
    return { ok: false, reason: "not-found", candidates: [] };
  }

  function subsequence(label, query) {
    var at = -1;
    var spread = 0;
    for (var i = 0; i < query.length; i++) {
      var next = label.indexOf(query.charAt(i), at + 1);
      if (next < 0) return null;
      if (at >= 0) spread += next - at - 1;
      at = next;
    }
    return Math.max(1, 55 - spread);
  }

  function match(candidate, query) {
    var label = text(candidate.label || candidate.path).toLowerCase();
    var path = text(candidate.path).toLowerCase();
    var aliases = (candidate.aliases || []).map(function (alias) { return text(alias).toLowerCase(); });
    if (label === query || path === query || aliases.indexOf(query) >= 0) return { reason: "exact", score: 100 };
    if (label.indexOf(query) === 0 || path.split("/").some(function (part) { return part.indexOf(query) === 0; })) {
      return { reason: "prefix", score: 80 };
    }
    if (aliases.some(function (alias) { return alias.indexOf(query) >= 0; })) return { reason: "alias", score: 70 };
    var sub = subsequence(label + " " + path, query);
    return sub == null ? null : { reason: "subsequence", score: sub };
  }

  function rankJumpCandidates(terms, candidates, visits) {
    var query = text(terms).trim().toLowerCase();
    var visitMap = {};
    (visits || []).forEach(function (visit) { visitMap[visit.id] = visit; });
    return (candidates || []).map(function (candidate) {
      var hit = match(candidate, query);
      if (!hit) return null;
      var visit = visitMap[candidate.id];
      var score = hit.score;
      if (visit) score += Math.min(12, Number(visit.count || 0) * 2) + Math.min(8, Number(visit.visitedAt || 0) / 1000000000000);
      if (candidate.group === "SAVED VIEWS") score += 4;
      return Object.assign({}, candidate, {
        matchReason: visit && hit.reason !== "exact" ? "recent" : hit.reason,
        score: Math.round(score * 100) / 100,
        changesProjection: !!candidate.projectionId,
      });
    }).filter(Boolean).sort(function (a, b) {
      return b.score - a.score || text(a.path).localeCompare(text(b.path));
    });
  }

  function createLayerStack(onStatus) {
    var layers = [];
    var report = globalThis.CW_VALUE.isFunction(onStatus) ? onStatus : function () {};
    function status() {
      var top = layers[layers.length - 1];
      return top ? "Esc: " + (top.escapeLabel || ("close " + (top.label || top.id))) : "Esc: no action";
    }
    return {
      push: function (layer) {
        if (!layer || !layer.id) throw new Error("interaction layer id required");
        var found = layers.findIndex(function (item) { return item.id === layer.id; });
        if (found >= 0) layers.splice(found, 1);
        layers.push(layer);
        report(status());
      },
      remove: function (id) {
        var found = layers.findIndex(function (item) { return item.id === id; });
        if (found < 0) return null;
        var removed = layers.splice(found, 1)[0];
        report(status());
        return removed;
      },
      cancelTop: function () {
        if (!layers.length) { report(status()); return null; }
        var removed = layers.pop();
        if (globalThis.CW_VALUE.isFunction(removed.cancel)) removed.cancel();
        if (removed.returnFocus && removed.returnFocus.isConnected && globalThis.CW_VALUE.isFunction(removed.returnFocus.focus)) {
          removed.returnFocus.focus({ preventScroll: true });
        }
        report(status());
        return removed;
      },
      top: function () { return layers[layers.length - 1] || null; },
      list: function () { return layers.slice(); },
      status: status,
    };
  }

  function createHistory(adapter) {
    var last = null;
    function commit(location, options) {
      var next = canonicalLocation(location);
      var serialized = JSON.stringify(next);
      if (serialized === last) return false;
      last = serialized;
      var url = routeUrl(next);
      if (options && options.replace) adapter.replaceState(next, "", url);
      else adapter.pushState(next, "", url);
      return true;
    }
    return { commit: commit, restore: canonicalLocation, current: function () { return last && JSON.parse(last); } };
  }

  window.CW_NAV = {
    ROUTE_KEYS: ROUTE_KEYS,
    canonicalLocation: canonicalLocation,
    routeUrl: routeUrl,
    parseLocation: parseLocation,
    normalizePath: normalizePath,
    resolvePath: resolvePath,
    resolveDeterministic: resolveDeterministic,
    rankJumpCandidates: rankJumpCandidates,
    createLayerStack: createLayerStack,
    createHistory: createHistory,
  };
})();
