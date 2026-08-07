/**
 * Context-aware right-click menus for Nightboard.
 *
 * Resolves the clicked control, surfaces a themed menu (Prompt… + ≤3 learned
 * actions), and runs a background “Epoch agent” that learns from interactions
 * to pre-generate likely verbs per control.
 */
(function () {
  "use strict";

  var LEDGER_KEY = "nb-ctx-ledger";
  var ACTIONS_KEY = "nb-ctx-actions";
  var MAX_LEDGER = 200;
  var MAX_ACTIONS = 3;
  var SYNTH_IDLE_MS = 10000;

  var KIND_TEMPLATES = {
    "nav-item": [
      { id: "copy", label: "Copy", verb: "copy" },
      { id: "activate", label: "Open / activate", verb: "activate" },
      { id: "copy-path", label: "Copy path", verb: "copy-path" },
    ],
    post: [
      { id: "copy", label: "Copy thread", verb: "copy" },
      { id: "reply", label: "Reply", verb: "reply" },
      { id: "copy-path", label: "Copy path", verb: "copy-path" },
    ],
    channel: [
      { id: "copy", label: "Copy feed", verb: "copy" },
      { id: "rename", label: "Rename…", verb: "rename" },
      { id: "activate", label: "Open channel", verb: "activate" },
    ],
    member: [
      { id: "copy", label: "Copy", verb: "copy" },
      { id: "activate", label: "Open DM", verb: "activate" },
      { id: "copy-path", label: "Copy path", verb: "copy-path" },
    ],
    dm: [
      { id: "copy", label: "Copy messages", verb: "copy" },
      { id: "reply", label: "Write message", verb: "reply" },
      { id: "activate", label: "Open messages", verb: "activate" },
    ],
    activity: [
      { id: "copy", label: "Copy", verb: "copy" },
      { id: "activate", label: "Open", verb: "activate" },
      { id: "dismiss", label: "Dismiss", verb: "dismiss" },
    ],
    file: [
      { id: "copy", label: "Copy", verb: "copy" },
      { id: "activate", label: "Edit file", verb: "activate" },
      { id: "copy-path", label: "Copy path", verb: "copy-path" },
    ],
    tab: [
      { id: "copy", label: "Copy chat", verb: "copy" },
      { id: "activate", label: "Switch workspace", verb: "activate" },
      { id: "copy-path", label: "Copy path", verb: "copy-path" },
    ],
    masthead: [
      { id: "activate", label: "Go home", verb: "activate" },
      { id: "copy-path", label: "Copy path", verb: "copy-path" },
    ],
    prompt: [
      { id: "copy", label: "Copy chat", verb: "copy" },
      { id: "copy-path", label: "Copy cwd path", verb: "copy-path" },
    ],
    "chat-line": [
      { id: "copy", label: "Copy turn", verb: "copy" },
      { id: "copy-chat", label: "Copy chat", verb: "copy-chat" },
      { id: "copy-path", label: "Copy path", verb: "copy-path" },
    ],
    chat: [
      { id: "copy", label: "Copy chat", verb: "copy" },
      { id: "copy-path", label: "Copy path", verb: "copy-path" },
    ],
    blade: [
      { id: "copy", label: "Copy chat", verb: "copy" },
      { id: "activate", label: "Focus blade", verb: "activate" },
      { id: "copy-path", label: "Copy path", verb: "copy-path" },
    ],
    detail: [
      { id: "copy", label: "Copy", verb: "copy" },
      { id: "activate", label: "Activate", verb: "activate" },
      { id: "reply", label: "Compose", verb: "reply" },
    ],
  };

  var ledger = [];
  var actionMap = Object.create(null);
  var synthTimer = null;

  function loadJson(key, fallback) {
    try {
      var raw = localStorage.getItem(key);
      if (!raw) return fallback;
      var parsed = JSON.parse(raw);
      return parsed == null ? fallback : parsed;
    } catch {
      return fallback;
    }
  }

  function saveJson(key, value) {
    try {
      localStorage.setItem(key, JSON.stringify(value));
    } catch { /* private mode / quota — soft-fail */ }
  }

  function resetLearning() {
    ledger = [];
    actionMap = Object.create(null);
    saveJson(LEDGER_KEY, ledger);
    saveJson(ACTIONS_KEY, actionMap);
    if (synthTimer) {
      clearTimeout(synthTimer);
      synthTimer = null;
    }
  }

  function hydrate() {
    ledger = loadJson(LEDGER_KEY, []);
    if (!Array.isArray(ledger)) ledger = [];
    actionMap = loadJson(ACTIONS_KEY, {}) || {};
  }

  function templatesFor(kind) {
    return (KIND_TEMPLATES[kind] || KIND_TEMPLATES["nav-item"] || []).slice();
  }

  /**
   * Resolve a stable target from a pointer event + app state.
   */
  function resolveTarget(ev, state) {
    state = state || (window.NB_APP && window.NB_APP.state) || {};
    var el = ev && ev.target && ev.target.nodeType === 1
      ? ev.target
      : (ev && ev.target && ev.target.parentElement) || null;
    if (!el || !el.closest) {
      return fallbackTarget(state);
    }

    var brand = el.closest("[data-brand], [data-goto-landing], [data-goto-home]");
    if (brand) {
      return makeTarget({
        kind: "masthead",
        id: "brand",
        name: "Epoch",
        path: "/",
      });
    }

    var tab = el.closest("[data-session]");
    if (tab && tab.hasAttribute("data-session") && !tab.hasAttribute("data-session-close")) {
      var si = Number(tab.getAttribute("data-session"));
      var sess = (state.sessions || [])[si];
      var sp = (sess && sess.path) || state.path || "/";
      return makeTarget({
        kind: "tab",
        id: "session-" + si,
        name: tab.textContent.replace(/\s+/g, " ").trim() || ("ws " + (si + 1)),
        path: sp,
      });
    }

    var comment = el.closest(".cn-comment[data-key]");
    if (comment) {
      var cid = comment.getAttribute("data-key");
      var who = (comment.querySelector("[data-c=handle], .cn-who, [data-who]") || {}).textContent || "";
      var title = who.trim() || cid;
      return makeTarget({
        kind: "post",
        id: cid,
        name: title.slice(0, 48),
        path: (state.path || "/") + (String(state.path || "").indexOf(cid) >= 0 ? "" : "/" + cid),
      });
    }

    var chatLine = el.closest(".cn-line[data-key], .cn-blade-out, .cn-out.cn-blade-out");
    if (chatLine) {
      if (chatLine.classList.contains("cn-line")) {
        var lid = chatLine.getAttribute("data-key");
        var lkind = chatLine.getAttribute("data-kind") || "out";
        return makeTarget({
          kind: "chat-line",
          id: lid,
          name: lkind + " turn",
          path: state.path || "/",
        });
      }
      return makeTarget({
        kind: "chat",
        id: "session-chat",
        name: "session chat",
        path: state.path || "/",
      });
    }

    var notif = el.closest("[data-notif-id], [data-home-item], .cn-notif-row, .cn-activity-card");
    if (notif) {
      var nid = notif.getAttribute("data-notif-id") ||
        notif.getAttribute("data-home-item") ||
        notif.getAttribute("data-key") ||
        "activity";
      var nlabel = (notif.textContent || "").replace(/\s+/g, " ").trim().slice(0, 40) || nid;
      return makeTarget({
        kind: "activity",
        id: nid,
        name: nlabel,
        path: state.path || "/notifications",
      });
    }

    var item = el.closest(".cn-item[data-key], .cn-item[data-path]");
    if (item) {
      var path = item.getAttribute("data-path") ||
        resolveItemPath(state, item.getAttribute("data-key"));
      var name = item.getAttribute("data-key") || leafName(path);
      var kind = classifyPath(path, item.getAttribute("data-kind"), name);
      return makeTarget({
        kind: kind,
        id: path || name,
        name: name,
        path: path || state.path || "/",
        elementKey: item.getAttribute("data-key"),
      });
    }

    var blade = el.closest("[data-blade-path]");
    if (blade) {
      var bp = blade.getAttribute("data-blade-path") || state.path || "/";
      return makeTarget({
        kind: "blade",
        id: bp,
        name: leafName(bp) || "blade",
        path: bp,
      });
    }

    var prompt = el.closest(".cn-prompt, [data-cli], .cn-prompt-stack");
    if (prompt) {
      return makeTarget({
        kind: "prompt",
        id: "prompt",
        name: "prompt",
        path: state.path || "/",
      });
    }

    return fallbackTarget(state);
  }

  function fallbackTarget(state) {
    var path = (state && state.path) || "/";
    var MAP = window.NB_MAP;
    var here = MAP && MAP.list
      ? (MAP.list(path, (state && state.merged) || []) || [])
      : [];
    var sel = here[Math.min((state && state.cursor) || 0, Math.max(0, here.length - 1))];
    if (sel) {
      var full = MAP.resolve(path, sel.name);
      return makeTarget({
        kind: classifyPath(full, sel.kind, sel.name),
        id: full,
        name: sel.name,
        path: full,
      });
    }
    return makeTarget({
      kind: "blade",
      id: path,
      name: leafName(path) || "board",
      path: path,
    });
  }

  function resolveItemPath(state, key) {
    if (!key) return state.path || "/";
    var MAP = window.NB_MAP;
    if (!MAP) return (state.path || "/") + "/" + key;
    return MAP.resolve(state.path || "/", key);
  }

  function leafName(path) {
    var parts = String(path || "/").split("/").filter(Boolean);
    return parts.length ? parts[parts.length - 1] : "board";
  }

  function classifyPath(path, dataKind, name) {
    var p = String(path || "");
    var parts = p.split("/").filter(Boolean);
    if (dataKind === "file" || /\.(md|ts|js|json|txt|css|html)$/i.test(name || "")) {
      return "file";
    }
    if (parts[0] === "dms") return "dm";
    if (parts[0] === "members" || parts[parts.length - 2] === "members") return "member";
    if (parts[0] === "notifications") return "activity";
    if (parts.indexOf("channels") >= 0 && parts[parts.length - 1] &&
        parts[parts.length - 1] !== "channels") {
      return "channel";
    }
    if (dataKind === "dir") return "nav-item";
    return "nav-item";
  }

  function makeTarget(t) {
    var kind = t.kind || "nav-item";
    var id = String(t.id || t.path || t.name || "unknown");
    var name = String(t.name || leafName(t.path) || id);
    var path = String(t.path || "/");
    return {
      kind: kind,
      id: id,
      name: name,
      path: path,
      controlKey: kind + ":" + id,
      elementKey: t.elementKey || null,
    };
  }

  function record(entry) {
    if (!entry || !entry.controlKey || !entry.verb) return;
    ledger.push({
      controlKey: String(entry.controlKey),
      verb: String(entry.verb),
      at: entry.at || Date.now(),
    });
    if (ledger.length > MAX_LEDGER) {
      ledger = ledger.slice(ledger.length - MAX_LEDGER);
    }
    saveJson(LEDGER_KEY, ledger);
    scheduleSynth();
  }

  function scheduleSynth() {
    if (synthTimer) clearTimeout(synthTimer);
    var run = function () {
      synthTimer = null;
      synthesizeNow();
    };
    if (typeof window.requestIdleCallback === "function") {
      synthTimer = setTimeout(function () {
        window.requestIdleCallback(function () { run(); }, { timeout: SYNTH_IDLE_MS });
      }, Math.min(2500, SYNTH_IDLE_MS));
    } else {
      synthTimer = setTimeout(run, SYNTH_IDLE_MS);
    }
  }

  function synthesizeNow() {
    var byKey = Object.create(null);
    ledger.forEach(function (ev) {
      if (!byKey[ev.controlKey]) byKey[ev.controlKey] = Object.create(null);
      var bucket = byKey[ev.controlKey];
      if (!bucket[ev.verb]) bucket[ev.verb] = { verb: ev.verb, n: 0, last: 0 };
      bucket[ev.verb].n += 1;
      bucket[ev.verb].last = Math.max(bucket[ev.verb].last, ev.at || 0);
    });

    var now = Date.now();
    Object.keys(byKey).forEach(function (key) {
      var kind = key.split(":")[0] || "nav-item";
      var scores = Object.keys(byKey[key]).map(function (verb) {
        var row = byKey[key][verb];
        var recency = 1 / (1 + (now - (row.last || now)) / 60000);
        return { verb: verb, score: row.n * (1 + recency) };
      }).sort(function (a, b) { return b.score - a.score; });

      var templates = templatesFor(kind);
      var byVerb = Object.create(null);
      templates.forEach(function (t) { byVerb[t.verb] = t; });

      var out = [];
      scores.forEach(function (s) {
        if (out.length >= MAX_ACTIONS) return;
        var tmpl = byVerb[s.verb] || {
          id: s.verb,
          label: labelForVerb(s.verb),
          verb: s.verb,
        };
        out.push({
          id: tmpl.id || s.verb,
          label: tmpl.label || labelForVerb(s.verb),
          verb: s.verb,
        });
      });
      templates.forEach(function (t) {
        if (out.length >= MAX_ACTIONS) return;
        if (out.some(function (o) { return o.verb === t.verb; })) return;
        out.push({ id: t.id, label: t.label, verb: t.verb });
      });
      actionMap[key] = out.slice(0, MAX_ACTIONS);
    });
    saveJson(ACTIONS_KEY, actionMap);
  }

  function labelForVerb(verb) {
    var map = {
      activate: "Open / activate",
      "copy-path": "Copy path",
      expand: "Preview",
      reply: "Reply",
      "open-thread": "Open thread",
      dismiss: "Dismiss",
      "prompt-about": "Ask about this",
      rename: "Rename…",
      copy: "Copy",
      "copy-chat": "Copy chat",
    };
    return map[verb] || verb;
  }

  function actionsFor(controlKey, kind) {
    var learned = actionMap[controlKey];
    if (learned && learned.length) return learned.slice(0, MAX_ACTIONS);
    // Also try synthesising from ledger for this key only.
    var hits = ledger.filter(function (e) { return e.controlKey === controlKey; });
    if (hits.length) {
      synthesizeNow();
      learned = actionMap[controlKey];
      if (learned && learned.length) return learned.slice(0, MAX_ACTIONS);
    }
    return templatesFor(kind || String(controlKey || "").split(":")[0]).slice(0, MAX_ACTIONS);
  }

  function boundChipsFromTarget(target) {
    if (!target) return [];
    var chips = [{
      id: target.id,
      name: target.name,
      kind: target.kind,
    }];
    // Parent path chip when distinct.
    if (target.path && target.path !== target.id && target.path !== "/") {
      var parent = target.path;
      if (parent !== target.id) {
        chips.push({
          id: parent,
          name: leafName(parent),
          kind: "path",
        });
      }
    }
    // Dedupe by id.
    var seen = Object.create(null);
    return chips.filter(function (c) {
      if (seen[c.id]) return false;
      seen[c.id] = true;
      return true;
    }).slice(0, 4);
  }

  function composeWithBoundContext(text, chips) {
    chips = chips || [];
    if (!chips.length) return String(text || "");
    var head = chips.map(function (c) {
      return "[" + (c.kind || "ctx") + ":" + (c.name || c.id) + "]";
    }).join(" ");
    var body = String(text || "").trim();
    return body ? head + "\n" + body : head;
  }

  hydrate();

  window.NB_CTX = {
    resolveTarget: resolveTarget,
    record: record,
    synthesizeNow: synthesizeNow,
    scheduleSynth: scheduleSynth,
    actionsFor: actionsFor,
    templatesFor: templatesFor,
    boundChipsFromTarget: boundChipsFromTarget,
    composeWithBoundContext: composeWithBoundContext,
    resetLearning: resetLearning,
    labelForVerb: labelForVerb,
    MAX_ACTIONS: MAX_ACTIONS,
    KIND_TEMPLATES: KIND_TEMPLATES,
  };
})();
