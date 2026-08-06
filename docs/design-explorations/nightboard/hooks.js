/**
 * Custom event hooks for Nightboard.
 *
 * Users subscribe to named app events; matching events broadcast through the
 * Activity feed and (when permission is granted) the browser Notification API.
 *
 *   hook = {
 *     id, event, match?, label?, notify?, enabled?
 *   }
 *
 * `event` is one of the catalog ids (post.created, mention.you, …).
 * `match` is an optional filter:
 *   - empty → all events of that type
 *   - field:value  (channel:bugs, who:scout, key:+1, topic:cache)
 *   - free text substring over subject/body/who/channel
 *   - Lucene-style query when NB_QUERY is available (for post-shaped payloads)
 *
 * Soft-fail: private mode / quota / missing deps never throw.
 */
(function () {
  "use strict";

  var KEY_HOOKS = "nb-hooks";
  var KEY_FIRED = "nb-hooks-fired";
  var MAX_FIRED = 80;

  var EVENTS = [
    { id: "post.created", label: "New post",
      help: "A post lands in a channel (live stream or publish)" },
    { id: "mention.you", label: "Mention of you",
      help: "Someone @-mentions your handle or @you" },
    { id: "reaction.added", label: "Reaction added",
      help: "An emoji reaction is applied to a post" },
    { id: "dm.received", label: "Direct message",
      help: "A DM message arrives from a peer" },
    { id: "subscription.matched", label: "Subscription match",
      help: "Traffic matches a watched channel, topic, member, or project" },
    { id: "identity.changed", label: "Identity changed",
      help: "Guest claim, sign-in, join space, or sign-out" },
    { id: "space.joined", label: "Space joined",
      help: "You join or switch into a space" },
    { id: "query.matched", label: "Query match",
      help: "A post matches a Lucene-style or field filter on the hook" },
  ];

  var DEFAULT_HOOKS = [
    {
      id: "hook-bugs",
      event: "post.created",
      match: "channel:bugs",
      label: "New posts in #bugs",
      notify: true,
      enabled: true,
    },
    {
      id: "hook-mentions",
      event: "mention.you",
      match: "",
      label: "Mentions of me",
      notify: true,
      enabled: true,
    },
    {
      id: "hook-plusone",
      event: "reaction.added",
      match: "key:+1",
      label: "+1 reactions",
      notify: true,
      enabled: true,
    },
    {
      id: "hook-cache",
      event: "query.matched",
      match: "body:cache OR subject:cache",
      label: "Cache talk",
      notify: true,
      enabled: true,
    },
    {
      id: "hook-scout",
      event: "post.created",
      match: "who:scout",
      label: "Posts from @scout",
      notify: true,
      enabled: false,
    },
  ];

  var hooksState = null;
  var firedState = null;

  function storage() {
    try { return window.localStorage; } catch { return null; }
  }

  function clone(obj) {
    return Object.assign({}, obj || {});
  }

  function normalizeHook(h, i) {
    h = h || {};
    var id = h.id || ("hook-" + (i != null ? i : Date.now()));
    var event = String(h.event || "post.created").trim();
    return {
      id: id,
      event: event,
      match: h.match == null ? "" : String(h.match),
      label: h.label || eventLabel(event) || event,
      notify: h.notify !== false,
      enabled: h.enabled !== false,
    };
  }

  function eventLabel(id) {
    for (var i = 0; i < EVENTS.length; i++) {
      if (EVENTS[i].id === id) return EVENTS[i].label;
    }
    return id;
  }

  function eventHelp(id) {
    for (var i = 0; i < EVENTS.length; i++) {
      if (EVENTS[i].id === id) return EVENTS[i].help;
    }
    return "";
  }

  function fixtureHooks() {
    var fromData = (window.NB_DATA && window.NB_DATA.hooks) || null;
    var base = Array.isArray(fromData) && fromData.length ? fromData : DEFAULT_HOOKS;
    return base.map(function (h, i) { return normalizeHook(h, i); });
  }

  function loadHooks() {
    if (hooksState) return hooksState.slice();
    try {
      var ls = storage();
      var raw = ls && ls.getItem(KEY_HOOKS);
      if (raw) {
        var got = JSON.parse(raw);
        if (Array.isArray(got) && got.length) {
          hooksState = got.map(function (h, i) { return normalizeHook(h, i); });
          return hooksState.slice();
        }
      }
    } catch { /* private */ }
    hooksState = fixtureHooks();
    return hooksState.slice();
  }

  function saveHooks(list) {
    hooksState = (list || []).map(function (h, i) { return normalizeHook(h, i); });
    try {
      var ls = storage();
      if (ls) ls.setItem(KEY_HOOKS, JSON.stringify(hooksState));
    } catch { /* private */ }
    return hooksState.slice();
  }

  function loadFired() {
    if (firedState) return firedState.slice();
    try {
      var ls = storage();
      var raw = ls && ls.getItem(KEY_FIRED);
      if (raw) {
        var got = JSON.parse(raw);
        if (Array.isArray(got)) {
          firedState = got;
          return firedState.slice();
        }
      }
    } catch { /* private */ }
    firedState = [];
    return [];
  }

  function saveFired(list) {
    firedState = (list || []).slice(0, MAX_FIRED);
    try {
      var ls = storage();
      if (ls) ls.setItem(KEY_FIRED, JSON.stringify(firedState));
    } catch { /* private */ }
    return firedState.slice();
  }

  function list() {
    return loadHooks();
  }

  function get(id) {
    if (!id) return null;
    var all = loadHooks();
    for (var i = 0; i < all.length; i++) {
      if (all[i].id === id) return all[i];
    }
    return null;
  }

  function findEvent(id) {
    for (var i = 0; i < EVENTS.length; i++) {
      if (EVENTS[i].id === id) return EVENTS[i];
    }
    return null;
  }

  function nextId() {
    return "hook-" + Date.now().toString(36) + "-" + Math.floor(Math.random() * 1e4).toString(36);
  }

  function add(spec) {
    spec = spec || {};
    var event = String(spec.event || "").trim();
    if (!event) return { ok: false, error: "event required" };
    if (!findEvent(event) && event !== "*") {
      // Allow unknown events for forward-compat, but prefer catalog.
    }
    var hook = normalizeHook({
      id: spec.id || nextId(),
      event: event,
      match: spec.match || "",
      label: spec.label || "",
      notify: spec.notify !== false,
      enabled: spec.enabled !== false,
    });
    if (!hook.label || hook.label === hook.event) {
      hook.label = eventLabel(hook.event) + (hook.match ? " · " + hook.match : "");
    }
    var all = loadHooks();
    // Replace if id collides.
    var replaced = false;
    for (var i = 0; i < all.length; i++) {
      if (all[i].id === hook.id) {
        all[i] = hook;
        replaced = true;
        break;
      }
    }
    if (!replaced) all.push(hook);
    saveHooks(all);
    return { ok: true, hook: hook, replaced: replaced };
  }

  function remove(id) {
    if (!id) return { ok: false, error: "id required" };
    var all = loadHooks();
    var next = all.filter(function (h) { return h.id !== id; });
    if (next.length === all.length) return { ok: false, error: "hook not found" };
    saveHooks(next);
    return { ok: true, id: id };
  }

  function enable(id, on) {
    var all = loadHooks();
    var hit = null;
    for (var i = 0; i < all.length; i++) {
      if (all[i].id === id) {
        all[i].enabled = on !== false;
        hit = all[i];
        break;
      }
    }
    if (!hit) return { ok: false, error: "hook not found" };
    saveHooks(all);
    return { ok: true, hook: hit };
  }

  function setNotify(id, on) {
    var all = loadHooks();
    var hit = null;
    for (var i = 0; i < all.length; i++) {
      if (all[i].id === id) {
        all[i].notify = on !== false;
        hit = all[i];
        break;
      }
    }
    if (!hit) return { ok: false, error: "hook not found" };
    saveHooks(all);
    return { ok: true, hook: hit };
  }

  function reset() {
    try {
      var ls = storage();
      if (ls) {
        ls.removeItem(KEY_HOOKS);
        ls.removeItem(KEY_FIRED);
      }
    } catch { /* fine */ }
    hooksState = null;
    firedState = null;
    return list();
  }

  /**
   * Build a flat searchable blob from an event payload.
   */
  function payloadText(payload) {
    payload = payload || {};
    var parts = [
      payload.subject, payload.body, payload.who, payload.channel,
      payload.dm, payload.key, payload.handle, payload.kind, payload.spaceId,
      payload.spaceName, payload.topic, payload.state, payload.id,
      payload.whereLabel, payload.label,
    ];
    return parts.filter(Boolean).map(String).join(" ").toLowerCase();
  }

  function fieldValue(payload, field) {
    payload = payload || {};
    field = String(field || "").toLowerCase();
    if (field === "channel") return String(payload.channel || "");
    if (field === "who" || field === "author") return String(payload.who || payload.handle || "");
    if (field === "key" || field === "react" || field === "reaction") return String(payload.key || "");
    if (field === "topic" || field === "tag") return String(payload.topic || "");
    if (field === "space" || field === "spaceid") return String(payload.spaceId || "");
    if (field === "kind") return String(payload.kind || "");
    if (field === "state") return String(payload.state || "");
    if (field === "dm") return String(payload.dm || "");
    if (field === "id") return String(payload.id || payload.postId || "");
    if (field === "subject") return String(payload.subject || "");
    if (field === "body") return String(payload.body || "");
    if (field === "handle") return String(payload.handle || payload.who || "");
    return "";
  }

  /**
   * Does this hook's match expression accept the payload?
   */
  function matchesFilter(match, payload, eventName) {
    match = String(match || "").trim();
    if (!match) return true;

    // query.matched (and any hook with a rich query) can use NB_QUERY on post-shaped payloads.
    if (window.NB_QUERY && window.NB_QUERY.apply &&
        (eventName === "query.matched" || /[():]| OR | AND |sort:|has:|state:|react:/.test(match))) {
      // Only post-shaped payloads benefit from Lucene.
      if (payload && (payload.body != null || payload.subject != null || payload.channel || payload.who)) {
        try {
          var result = window.NB_QUERY.apply([payload], match, {
            members: (window.NB_DATA && window.NB_DATA.members) || [],
          });
          if (!result.error) return (result.posts || []).length > 0;
        } catch { /* fall through to simple match */ }
      }
    }

    // field:value tokens (AND when multiple space-separated field: forms)
    var fieldRe = /^([a-zA-Z_]+):(\S+)$/;
    var tokens = match.split(/\s+/).filter(Boolean);
    var allField = tokens.length > 0 && tokens.every(function (t) { return fieldRe.test(t); });
    if (allField) {
      return tokens.every(function (t) {
        var m = t.match(fieldRe);
        var got = fieldValue(payload, m[1]).toLowerCase();
        var want = m[2].toLowerCase();
        return got === want || got.indexOf(want) !== -1;
      });
    }

    // Single field:value
    var one = match.match(fieldRe);
    if (one && match.indexOf(" ") === -1) {
      var gotOne = fieldValue(payload, one[1]).toLowerCase();
      var wantOne = one[2].toLowerCase();
      return gotOne === wantOne || gotOne.indexOf(wantOne) !== -1;
    }

    // Free-text substring over the payload blob.
    return payloadText(payload).indexOf(match.toLowerCase()) !== -1;
  }

  function matchingHooks(eventName, payload) {
    eventName = String(eventName || "");
    var all = loadHooks();
    return all.filter(function (h) {
      if (!h.enabled) return false;
      if (h.event !== eventName && h.event !== "*") return false;
      return matchesFilter(h.match, payload, h.event);
    });
  }

  function clockNow() {
    var d = new Date();
    return String(d.getHours()).padStart(2, "0") + ":" + String(d.getMinutes()).padStart(2, "0");
  }

  function whereFor(payload) {
    payload = payload || {};
    if (payload.where) return payload.where;
    if (payload.dm) return "/dms/" + payload.dm;
    if (payload.channel && window.NB_MAP && window.NB_MAP.channelPath) {
      var chan = ((window.NB_DATA && window.NB_DATA.channels) || []).filter(function (c) {
        return c.id === payload.channel;
      })[0];
      if (chan) return window.NB_MAP.channelPath(chan.label);
    }
    if (payload.channel) {
      return "/projects/community/channels/" + payload.channel;
    }
    if (payload.spaceId) return "/spaces/" + payload.spaceId;
    return "/notifications/hooks";
  }

  function whereLabelFor(payload) {
    payload = payload || {};
    if (payload.whereLabel) return payload.whereLabel;
    if (payload.dm) return "@" + payload.dm;
    if (payload.channel) return "#" + payload.channel;
    if (payload.spaceName) return payload.spaceName;
    return payload.event || "hook";
  }

  /**
   * Build one Activity item for a hook fire.
   */
  function activityFrom(hook, eventName, payload, opts) {
    opts = opts || {};
    payload = payload || {};
    var at = opts.at || payload.at || clockNow();
    var idBase = payload.id || payload.postId || payload.handle || eventName;
    var id = "hook-n-" + hook.id + "-" + idBase + "-" + at.replace(":", "");
    // Dedupe key may collide same minute — append short salt from body length.
    if (payload.body) id += "-" + String(payload.body.length);
    var subject = hook.label || eventLabel(eventName);
    var body = payload.body || payload.subject || payload.reason ||
      (payload.key ? ("reacted " + payload.key) : "") ||
      (payload.handle ? ("@" + payload.handle) : "") ||
      eventHelp(eventName) || eventName;
    return {
      id: id,
      kind: "hook",
      unread: true,
      at: at,
      who: payload.who || payload.handle || "system",
      where: whereFor(payload),
      whereLabel: whereLabelFor(payload),
      subject: subject,
      body: String(body).slice(0, 280),
      reason: "hook · " + (hook.label || eventName),
      hook: { id: hook.id, event: hook.event, match: hook.match, label: hook.label },
      event: eventName,
      ref: payload.id || payload.postId || null,
    };
  }

  /**
   * Emit an app event. Returns Activity items for hooks that match and want notify.
   * Side effect: appends items to the fired log (durable).
   */
  function emit(eventName, payload, opts) {
    opts = opts || {};
    eventName = String(eventName || "");
    if (!eventName) return [];

    var hits = matchingHooks(eventName, payload);
    // query.matched is also auto-checked for post-shaped traffic when listeners exist.
    if (eventName === "post.created" || eventName === "dm.received") {
      var qHooks = loadHooks().filter(function (h) {
        return h.enabled && h.event === "query.matched" && matchesFilter(h.match, payload, "query.matched");
      });
      qHooks.forEach(function (h) {
        if (!hits.some(function (x) { return x.id === h.id; })) hits.push(h);
      });
    }

    var items = [];
    var fired = loadFired();
    hits.forEach(function (hook) {
      if (hook.notify === false && !opts.forceNotify) return;
      var item = activityFrom(hook, hook.event === "query.matched" ? "query.matched" : eventName, payload, opts);
      // Skip exact id duplicates in the fired log.
      if (fired.some(function (f) { return f.id === item.id; })) return;
      items.push(item);
      fired.unshift(item);
    });
    if (items.length) saveFired(fired);
    return items;
  }

  function fired(readSet) {
    var list = loadFired();
    if (!readSet) return list.slice();
    return list.map(function (n) {
      var copy = clone(n);
      if (readSet[n.id]) copy.unread = false;
      return copy;
    });
  }

  function clearFired() {
    return saveFired([]);
  }

  function events() {
    return EVENTS.slice();
  }

  function summarize() {
    var all = loadHooks();
    return {
      total: all.length,
      enabled: all.filter(function (h) { return h.enabled; }).length,
      notify: all.filter(function (h) { return h.enabled && h.notify; }).length,
      fired: loadFired().length,
    };
  }

  window.NB_HOOKS = {
    KEY_HOOKS: KEY_HOOKS,
    KEY_FIRED: KEY_FIRED,
    events: events,
    eventLabel: eventLabel,
    eventHelp: eventHelp,
    list: list,
    get: get,
    add: add,
    remove: remove,
    enable: enable,
    setNotify: setNotify,
    reset: reset,
    match: matchingHooks,
    matchesFilter: matchesFilter,
    emit: emit,
    activityFrom: activityFrom,
    fired: fired,
    clearFired: clearFired,
    summarize: summarize,
    defaults: function () { return DEFAULT_HOOKS.map(function (h) { return normalizeHook(h); }); },
  };
})();
