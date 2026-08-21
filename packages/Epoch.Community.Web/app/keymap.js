/**
 * Community Web keymap — loadouts over board/action chords.
 *
 * Source of truth in the VFS: `/keymap.toml` (editable). Built-in loadouts
 * ship as `epoch` (default), `vim`, `yazi`, `emacs`, and `lazygit`. Active
 * selection persists in localStorage; applying a loadout rebinds CW_ACTIONS
 * key aliases and exposes board-steer matchers for j/k/h/l-style chords.
 *
 * Format (TOML subset):
 *
 *   active = "epoch"
 *
 *   [loadouts.epoch]
 *   label = "Epoch"
 *
 *   [loadouts.epoch.keys]
 *   "post.voteUp" = "u"
 *   "board.next" = ["j", "ArrowDown"]
 */
(function () {
  "use strict";

  var STORAGE_KEY = "cw-keymap-active";
  var TEXT_STORAGE_KEY = "cw-keymap-toml";
  var PATH = "/keymap.toml";

  /** Built-in loadouts — also serialized into the VFS file. */
  var BUILTINS = {
    epoch: {
      label: "Epoch",
      keys: {
        "board.prev": ["k", "ArrowUp"],
        "board.next": ["j", "ArrowDown"],
        "board.parent": ["h", "ArrowLeft"],
        "board.child": ["l", "ArrowRight"],
        "board.open": ["Enter"],
        "board.expand": [" ", "Space", "Spacebar"],
        "board.prompt": [":", "i", ">"],
        "board.filter": ["/"],
        "board.sort": ["v"],
        "board.zoom": ["z"],
        "board.theme": ["t"],
        "board.reload": ["r"],
        "board.edit": ["e"],
        "attention.dismiss": ["d"],
        "attention.markRead": ["m"],
        "post.voteUp": ["u"],
        "post.voteDown": ["d"],
        "post.fold": ["f"],
        "post.reactionPicker": ["a"],
        "post.repost": ["Shift+R"],
        "share.contextual": ["s"],
        "post.copy": ["y"],
        "compose.reply": ["r"],
        "jump.interactive": ["Ctrl+J"],
        "search.open": ["Ctrl+F"],
        "cancel.topLayer": ["Escape"],
        "history.back": ["Alt+Left"],
        "history.forward": ["Alt+Right"],
        "stream.protect": ["Ctrl+Shift+.", "Ctrl+Shift+>"],
      },
    },
    vim: {
      label: "Vim",
      keys: {
        "board.prev": ["k", "ArrowUp"],
        "board.next": ["j", "ArrowDown"],
        "board.parent": ["h", "ArrowLeft"],
        "board.child": ["l", "ArrowRight"],
        "board.open": ["Enter", "o"],
        "board.expand": [" ", "Space", "Spacebar"],
        "board.prompt": [":"],
        "board.filter": ["/"],
        "board.sort": ["Ctrl+v"],
        "board.zoom": ["z"],
        "board.theme": ["t"],
        "board.reload": ["r"],
        "board.edit": ["e"],
        // Free `d` / `u` for vim muscle memory elsewhere — votes use +/-.
        "attention.dismiss": ["x"],
        "attention.markRead": ["m"],
        "post.voteUp": ["+"],
        "post.voteDown": ["-"],
        "post.fold": ["f"],
        "post.reactionPicker": ["a"],
        "post.repost": ["Shift+R"],
        "share.contextual": ["s"],
        "post.copy": ["y"],
        "compose.reply": ["r"],
        "jump.interactive": ["Ctrl+J"],
        "search.open": ["Ctrl+F"],
        "cancel.topLayer": ["Escape"],
        "history.back": ["Alt+Left"],
        "history.forward": ["Alt+Right"],
        "stream.protect": ["Ctrl+Shift+.", "Ctrl+Shift+>"],
      },
    },
    // Yazi mgr defaults: https://yazi-rs.github.io/docs/configuration/keymap/
    // (hjkl hop, o/Enter open, f filter, / find, z fzf, s search, y yank, d trash).
    yazi: {
      label: "Yazi",
      keys: {
        "board.prev": ["k", "ArrowUp"],
        "board.next": ["j", "ArrowDown"],
        "board.parent": ["h", "ArrowLeft"],
        "board.child": ["l", "ArrowRight"],
        "board.open": ["Enter", "o"],
        "board.expand": [" ", "Space", "Spacebar"],
        "board.prompt": [":", ";"],
        "board.filter": ["f", "/"],
        "board.sort": [","],
        "board.zoom": ["Ctrl+z"],
        "board.theme": ["T"],
        "board.reload": ["Ctrl+r"],
        "board.edit": ["r"],
        "attention.dismiss": ["d", "x"],
        "attention.markRead": ["m"],
        "post.voteUp": ["+"],
        "post.voteDown": ["-"],
        "post.fold": ["F"],
        "post.reactionPicker": ["e"],
        "post.repost": ["Shift+R"],
        "share.contextual": ["c"],
        "post.copy": ["y"],
        "compose.reply": ["i"],
        "jump.interactive": ["z", "Z"],
        "search.open": ["s", "S"],
        "cancel.topLayer": ["Escape"],
        "history.back": ["Shift+H", "Alt+Left"],
        "history.forward": ["Shift+L", "Alt+Right"],
        "stream.protect": ["Ctrl+Shift+.", "Ctrl+Shift+>"],
      },
    },
    // Emacs motion/edit culture: C-n/p/f/b, C-s search, C-g cancel, M-x execute.
    // Chord letters are uppercase after modifiers (matches actionKeyAlias).
    emacs: {
      label: "Emacs",
      keys: {
        "board.prev": ["Ctrl+P", "ArrowUp"],
        "board.next": ["Ctrl+N", "ArrowDown"],
        "board.parent": ["Ctrl+B", "ArrowLeft"],
        "board.child": ["Ctrl+F", "ArrowRight"],
        "board.open": ["Enter"],
        "board.expand": [" ", "Space", "Spacebar"],
        "board.prompt": ["Alt+X", "Meta+X"],
        "board.filter": ["Ctrl+S"],
        "board.sort": ["Alt+S"],
        "board.zoom": ["Alt+Z"],
        "board.theme": ["Alt+T"],
        "board.reload": ["Alt+G"],
        "board.edit": ["Ctrl+X"],
        "attention.dismiss": ["Ctrl+K"],
        "attention.markRead": ["Alt+M"],
        "post.voteUp": ["+"],
        "post.voteDown": ["-"],
        "post.fold": ["Alt+F"],
        "post.reactionPicker": ["Alt+A"],
        "post.repost": ["Alt+Shift+R"],
        "share.contextual": ["Alt+Shift+W"],
        "post.copy": ["Alt+W", "Meta+W"],
        "compose.reply": ["Alt+R"],
        "jump.interactive": ["Alt+J"],
        "search.open": ["Ctrl+Alt+S"],
        "cancel.topLayer": ["Ctrl+G", "Escape"],
        "history.back": ["Alt+Left"],
        "history.forward": ["Alt+Right"],
        "stream.protect": ["Ctrl+Shift+.", "Ctrl+Shift+>"],
      },
    },
    // Lazygit universal/files defaults: j/k, h/l panels, / filter, x discard,
    // e edit, y copy, r refresh, c commit/compose, Space toggle.
    lazygit: {
      label: "Lazygit",
      keys: {
        "board.prev": ["k", "ArrowUp"],
        "board.next": ["j", "ArrowDown"],
        "board.parent": ["h", "ArrowLeft"],
        "board.child": ["l", "ArrowRight"],
        "board.open": ["Enter"],
        "board.expand": [" ", "Space", "Spacebar"],
        "board.prompt": [":", "@"],
        "board.filter": ["/"],
        "board.sort": ["s"],
        "board.zoom": ["="],
        "board.theme": ["T"],
        "board.reload": ["r"],
        "board.edit": ["e"],
        "attention.dismiss": ["x"],
        "attention.markRead": ["m"],
        "post.voteUp": ["+"],
        "post.voteDown": ["-"],
        "post.fold": ["f"],
        "post.reactionPicker": ["a"],
        "post.repost": ["Shift+P"],
        "share.contextual": ["Ctrl+O"],
        "post.copy": ["y"],
        "compose.reply": ["c"],
        "jump.interactive": ["Ctrl+R"],
        "search.open": ["Ctrl+F"],
        "cancel.topLayer": ["Escape"],
        "history.back": ["Alt+Left"],
        "history.forward": ["Alt+Right"],
        "stream.protect": ["Ctrl+Shift+.", "Ctrl+Shift+>"],
      },
    },
  };

  /** Action ids whose registry keyBindings are rewritten by the active loadout. */
  var REGISTRY_ACTIONS = [
    "post.voteUp", "post.voteDown", "post.fold", "post.reactionPicker",
    "post.repost", "share.contextual", "post.copy", "compose.reply",
    "jump.interactive", "search.open", "cancel.topLayer",
    "history.back", "history.forward", "stream.protect",
  ];

  var state = {
    active: "epoch",
    loadouts: cloneBuiltins(),
    source: null,
    error: null,
  };

  function cloneBuiltins() {
    var out = {};
    Object.keys(BUILTINS).forEach(function (id) {
      out[id] = {
        label: BUILTINS[id].label,
        keys: Object.assign({}, BUILTINS[id].keys),
      };
      Object.keys(out[id].keys).forEach(function (k) {
        out[id].keys[k] = BUILTINS[id].keys[k].slice();
      });
    });
    return out;
  }

  function asList(value) {
    if (value == null) return [];
    if (Array.isArray(value)) {
      return value.map(function (v) { return String(v); }).filter(Boolean);
    }
    return [String(value)].filter(Boolean);
  }

  /**
   * Minimal TOML reader for keymap.toml (tables, strings, string arrays).
   * Fail-closed: throws on unsupported constructs.
   */
  function parseKeymapToml(text) {
    var lines = String(text || "").split(/\r?\n/);
    var doc = { active: "epoch", loadouts: {} };
    var section = null; // null | { id, kind: "meta"|"keys" }
    var i;
    for (i = 0; i < lines.length; i++) {
      var raw = lines[i];
      var line = raw.replace(/#.*$/, "").trim();
      if (!line) continue;
      var table = line.match(/^\[([^\]]+)\]$/);
      if (table) {
        var path = table[1].trim();
        var loadoutMeta = path.match(/^loadouts\.([A-Za-z0-9_-]+)$/);
        var loadoutKeys = path.match(/^loadouts\.([A-Za-z0-9_-]+)\.keys$/);
        if (loadoutMeta) {
          section = { id: loadoutMeta[1], kind: "meta" };
          if (!doc.loadouts[section.id]) doc.loadouts[section.id] = { label: section.id, keys: {} };
        } else if (loadoutKeys) {
          section = { id: loadoutKeys[1], kind: "keys" };
          if (!doc.loadouts[section.id]) doc.loadouts[section.id] = { label: section.id, keys: {} };
        } else {
          throw new Error("unsupported table [" + path + "] at line " + (i + 1));
        }
        continue;
      }
      var kv = line.match(/^([A-Za-z0-9_./"-]+)\s*=\s*(.+)$/);
      if (!kv) throw new Error("invalid line " + (i + 1) + ": " + raw);
      var key = kv[1].replace(/^"|"$/g, "");
      var val = parseTomlValue(kv[2].trim(), i + 1);
      if (!section) {
        if (key === "active") doc.active = String(val);
        else throw new Error("unknown top-level key " + key + " at line " + (i + 1));
        continue;
      }
      if (section.kind === "meta") {
        if (key === "label") doc.loadouts[section.id].label = String(val);
        else throw new Error("unknown loadout meta " + key + " at line " + (i + 1));
      } else {
        doc.loadouts[section.id].keys[key] = asList(val);
      }
    }
    return doc;
  }

  function parseTomlValue(token, line) {
    if (token.charAt(0) === "[") {
      if (token.charAt(token.length - 1) !== "]") {
        throw new Error("unclosed array at line " + line);
      }
      var inner = token.slice(1, -1).trim();
      if (!inner) return [];
      return inner.split(",").map(function (part) {
        return parseTomlString(part.trim(), line);
      });
    }
    return parseTomlString(token, line);
  }

  function parseTomlString(token, line) {
    if ((token.charAt(0) === '"' && token.charAt(token.length - 1) === '"') ||
        (token.charAt(0) === "'" && token.charAt(token.length - 1) === "'")) {
      return token.slice(1, -1);
    }
    if (/^[A-Za-z0-9_./:+-]+$/.test(token)) return token;
    throw new Error("unsupported value at line " + line + ": " + token);
  }

  function serializeToml(active, loadouts) {
    var lines = [
      "# Community Web keymap — edit and `:w` / `keymap use <id>` to apply.",
      "# Loadouts remap action ids and board-steer chords. Free, local only.",
      "",
      'active = "' + escapeToml(active) + '"',
      "",
    ];
    Object.keys(loadouts).sort().forEach(function (id) {
      var lo = loadouts[id];
      lines.push("[loadouts." + id + "]");
      lines.push('label = "' + escapeToml(lo.label || id) + '"');
      lines.push("");
      lines.push("[loadouts." + id + ".keys]");
      Object.keys(lo.keys || {}).sort().forEach(function (actionId) {
        var chords = asList(lo.keys[actionId]);
        if (chords.length === 1) {
          lines.push('"' + escapeToml(actionId) + '" = "' + escapeToml(chords[0]) + '"');
        } else {
          lines.push('"' + escapeToml(actionId) + '" = [' +
            chords.map(function (c) { return '"' + escapeToml(c) + '"'; }).join(", ") + "]");
        }
      });
      lines.push("");
    });
    return lines.join("\n");
  }

  function escapeToml(value) {
    return String(value).replace(/\\/g, "\\\\").replace(/"/g, '\\"');
  }

  function readStoredActive() {
    try {
      var v = localStorage.getItem(STORAGE_KEY);
      return v || null;
    } catch {
      return null;
    }
  }

  function writeStoredActive(id) {
    try { localStorage.setItem(STORAGE_KEY, id); } catch { /* fine */ }
  }

  function readStoredText() {
    try { return localStorage.getItem(TEXT_STORAGE_KEY); } catch { return null; }
  }

  function writeStoredText(text) {
    try { localStorage.setItem(TEXT_STORAGE_KEY, text); } catch { /* fine */ }
  }

  function normalizeEventChord(ev) {
    var parts = [];
    if (ev.ctrlKey) parts.push("Ctrl");
    if (ev.metaKey) parts.push("Meta");
    if (ev.altKey) parts.push("Alt");
    if (ev.shiftKey) parts.push("Shift");
    var key = ev.key;
    if (ev.code === "Period") key = ".";
    else if (key === " ") key = " ";
    else if (key && key.length === 1) {
      key = ev.shiftKey || ev.ctrlKey || ev.metaKey || ev.altKey
        ? key.toUpperCase()
        : key.toLowerCase();
    }
    if (!key || /^(Control|Meta|Alt|Shift)$/.test(key)) return "";
    parts.push(key);
    return parts.join("+");
  }

  function chordsEqual(a, b) {
    return String(a || "").toLowerCase() === String(b || "").toLowerCase()
      || (a === " " && (b === "Space" || b === "Spacebar"))
      || (b === " " && (a === "Space" || a === "Spacebar"));
  }

  function activeKeys() {
    var lo = state.loadouts[state.active] || state.loadouts.epoch;
    return (lo && lo.keys) || BUILTINS.epoch.keys;
  }

  function chordFor(actionId) {
    var list = asList(activeKeys()[actionId]);
    return list[0] || "";
  }

  function chordsFor(actionId) {
    return asList(activeKeys()[actionId]);
  }

  function matches(ev, actionId) {
    var chord = normalizeEventChord(ev);
    if (!chord) return false;
    return chordsFor(actionId).some(function (c) { return chordsEqual(chord, c); });
  }

  function resolveChord(chord) {
    var keys = activeKeys();
    var found = null;
    Object.keys(keys).some(function (actionId) {
      if (asList(keys[actionId]).some(function (c) { return chordsEqual(chord, c); })) {
        found = actionId;
        return true;
      }
      return false;
    });
    return found;
  }

  function applyToRegistry() {
    if (!window.CW_ACTIONS || !globalThis.CW_VALUE.isFunction(window.CW_ACTIONS.rebindKeys)) {
      return false;
    }
    var overrides = {};
    REGISTRY_ACTIONS.forEach(function (actionId) {
      var chords = chordsFor(actionId);
      if (!chords.length) return;
      var descriptor = window.CW_ACTIONS.get(actionId);
      var contexts = [];
      if (descriptor && descriptor.keyBindings && descriptor.keyBindings[0]) {
        contexts = descriptor.keyBindings[0].contexts || [];
      }
      overrides[actionId] = chords.map(function (key) {
        return { key: key, contexts: contexts.slice() };
      });
    });
    window.CW_ACTIONS.rebindKeys(overrides);
    return true;
  }

  function use(id, opts) {
    opts = opts || {};
    id = String(id || "").trim();
    if (!state.loadouts[id]) {
      throw new Error("unknown loadout: " + id + " (try: " + Object.keys(state.loadouts).join(", ") + ")");
    }
    state.active = id;
    writeStoredActive(id);
    applyToRegistry();
    if (!opts.silent && window.CW_APP && globalThis.CW_VALUE.isFunction(window.CW_APP.status)) {
      var label = state.loadouts[id].label || id;
      window.CW_APP.status("keymap · " + label);
    }
    return id;
  }

  function applyDocument(doc, opts) {
    opts = opts || {};
    if (!doc || !doc.loadouts || !Object.keys(doc.loadouts).length) {
      throw new Error("keymap.toml has no loadouts");
    }
    Object.keys(doc.loadouts).forEach(function (id) {
      var incoming = doc.loadouts[id];
      var base = state.loadouts[id] || { label: id, keys: {} };
      var mergedKeys = Object.assign({}, base.keys || {});
      Object.keys(incoming.keys || {}).forEach(function (actionId) {
        mergedKeys[actionId] = asList(incoming.keys[actionId]);
      });
      state.loadouts[id] = {
        label: incoming.label || base.label || id,
        keys: mergedKeys,
      };
    });
    var want = doc.active || state.active || "epoch";
    if (!state.loadouts[want]) want = Object.keys(state.loadouts)[0];
    use(want, { silent: !!opts.silent });
    state.source = serialize();
    writeStoredText(state.source);
    state.error = null;
    return state.active;
  }

  function applyText(text, opts) {
    var doc = parseKeymapToml(text);
    return applyDocument(doc, opts);
  }

  function serialize() {
    return serializeToml(state.active, state.loadouts);
  }

  function defaultText() {
    return serializeToml("epoch", cloneBuiltins());
  }

  function boot() {
    state.loadouts = cloneBuiltins();
    state.source = defaultText();
    var storedText = readStoredText();
    if (storedText) {
      try {
        applyText(storedText, { silent: true });
        return;
      } catch (err) {
        state.error = (err && err.message) || String(err);
      }
    }
    var stored = readStoredActive();
    if (stored && state.loadouts[stored]) state.active = stored;
    else state.active = "epoch";
    state.source = serialize();
    // Defer registry rebind until actions.js has registered descriptors.
    setTimeout(function () { applyToRegistry(); }, 0);
  }

  function list() {
    return Object.keys(state.loadouts).map(function (id) {
      return {
        id: id,
        label: state.loadouts[id].label || id,
        active: id === state.active,
      };
    });
  }

  boot();

  window.CW_KEYMAP = {
    PATH: PATH,
    builtins: function () { return cloneBuiltins(); },
    active: function () { return state.active; },
    label: function () {
      var lo = state.loadouts[state.active];
      return (lo && lo.label) || state.active;
    },
    list: list,
    use: use,
    matches: matches,
    chord: chordFor,
    chords: chordsFor,
    resolve: resolveChord,
    normalizeEvent: normalizeEventChord,
    applyText: applyText,
    applyDocument: applyDocument,
    applyToRegistry: applyToRegistry,
    serialize: serialize,
    defaultText: defaultText,
    source: function () { return state.source || serialize(); },
    error: function () { return state.error; },
    parse: parseKeymapToml,
  };
})();
