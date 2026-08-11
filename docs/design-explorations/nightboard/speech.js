/**
 * Speech-to-text for the Nightboard prompt — on-device model first.
 *
 * Preferred backend: Microsoft Edge's local SpeechRecognition model
 * (`processLocally`, `SpeechRecognition.available` / `.install`) — a
 * browser-shipped quantized STT pack. Grok/xAI STT is cloud-only and is not
 * used here.
 *
 * Voice features (mic, `, Alt+V) enable only when availability is
 * **"available"**. The mic is always painted so unsupported / downloading
 * states are obvious; hotkeys no-op until the model is ready.
 *
 * Availability states (same vocabulary as the Prompt API / Edge docs):
 *   absent | unavailable | downloadable | downloading | available
 *
 * Input modes (Discord-style listen chords):
 *
 *   push-to-talk   hold ` (Backquote) — listen while held, commit on release
 *   toggle         Alt+V — continuous listen until Alt+V / Esc / stop again
 *
 * Intent modes (Windows Voice Access / macOS Voice Control pattern):
 *
 *   default     — wake-prefix or recognized grammar → command; else dictation
 *   dictation   — every phrase is text in the prompt
 *   commands    — every phrase is a command (unrecognized fails soft)
 *
 * Cycle intent with Alt+Shift+V, or say "commands mode" / "dictation mode" /
 * "default mode". In default mode, wake prefixes ("computer …", "command …",
 * "hey epoch …") force a command parse of the remainder.
 *
 * Fail soft: permission denied, network errors, and no-speech end the session
 * without throwing into the board.
 */
(function () {
  "use strict";

  var INTENT_MODES = ["default", "dictation", "commands"];
  var DEFAULT_LANG = "en-US";

  var WAKE_PREFIXES = [
    /^hey\s+epoch[\s,]+/i,
    /^okay\s+epoch[\s,]+/i,
    /^ok\s+epoch[\s,]+/i,
    /^computer[\s,]+/i,
    /^command[\s,]+/i,
    /^voice\s+command[\s,]+/i,
  ];

  function RecognitionCtor() {
    return window.SpeechRecognition || window.webkitSpeechRecognition || null;
  }

  /** True when the Web Speech constructor exists (not the same as model-ready). */
  function isSupported() {
    return !!RecognitionCtor();
  }

  function defaultLang() {
    try {
      var nav = (typeof navigator !== "undefined" && navigator.language) || DEFAULT_LANG;
      // Edge local STT currently documents en-US (+ a few others). Prefer en-US
      // when the browser language is English; otherwise pass through.
      if (/^en\b/i.test(nav)) return "en-US";
      return nav || DEFAULT_LANG;
    } catch {
      return DEFAULT_LANG;
    }
  }

  /** Microsoft Edge (Chromium) — ships the on-device speech pack we target. */
  function isEdgeBrowser() {
    try {
      var ua = (typeof navigator !== "undefined" && navigator.userAgent) || "";
      return /\bEdg\//.test(ua);
    } catch {
      return false;
    }
  }

  /**
   * Browser built-ins stringify as [native code]. Test doubles / polyfills do
   * not — important because Chromium currently exposes SpeechRecognition.available
   * + .install stubs that can **crash the renderer** when called with
   * processLocally. We only invoke the native probe on Edge.
   */
  function isNativeCtor(Ctor) {
    if (!Ctor) return false;
    try {
      return /\[native code\]/.test(Function.prototype.toString.call(Ctor));
    } catch {
      return true;
    }
  }

  /**
   * Probe on-device STT readiness. Prefer Edge's SpeechRecognition.available
   * with processLocally; without that API we refuse to enable (cloud-only
   * Web Speech is not treated as a supported voice backend).
   *
   * @returns {Promise<{ state: string, lang: string, backend: string, reason?: string }>}
   */
  async function availability(lang) {
    lang = lang || defaultLang();
    var Ctor = RecognitionCtor();
    if (!Ctor) {
      return {
        state: "absent",
        lang: lang,
        backend: "none",
        reason: "no SpeechRecognition in this browser — on-device STT needs Edge Canary/Dev (local speech model)",
      };
    }
    if (typeof Ctor.available !== "function" || typeof Ctor.install !== "function") {
      return {
        state: "unavailable",
        lang: lang,
        backend: "cloud-only",
        reason: "this browser's speech API has no on-device model pack — use Edge Canary/Dev with \"Speech Recognition with on-device model\"",
      };
    }
    // Chromium Headless/Chrome expose available/install but calling
    // available({ processLocally: true }) can hard-crash the tab. Only probe
    // the native API on Edge; allow non-native mocks/polyfills everywhere.
    if (isNativeCtor(Ctor) && !isEdgeBrowser()) {
      return {
        state: "unavailable",
        lang: lang,
        backend: "cloud-only",
        reason: "on-device STT needs Microsoft Edge (local speech model). This browser's SpeechRecognition.available stub is not safe to probe — voice stays off",
      };
    }
    try {
      var raw = await Ctor.available({ langs: [lang], processLocally: true });
      var state = String(raw || "unavailable");
      if (["available", "downloadable", "downloading", "unavailable"].indexOf(state) === -1) {
        state = "unavailable";
      }
      var reason = null;
      if (state === "unavailable") {
        reason = "on-device speech model unavailable for " + lang;
      } else if (state === "downloadable") {
        reason = "on-device speech model for " + lang + " needs one download";
      } else if (state === "downloading") {
        reason = "downloading on-device speech model for " + lang + "…";
      }
      return { state: state, lang: lang, backend: "edge-local", reason: reason };
    } catch (err) {
      return {
        state: "unavailable",
        lang: lang,
        backend: "edge-local",
        reason: "speech availability check failed: " +
          ((err && err.message) || String(err)),
      };
    }
  }

  /**
   * Ensure the on-device model is installed. Calls report(msg, kind) while
   * downloading. Resolves to an availability snapshot.
   */
  async function ensureModel(lang, opts) {
    opts = opts || {};
    var report = opts.report || function () {};
    lang = lang || defaultLang();
    var snap = await availability(lang);
    if (snap.state === "available") return snap;
    if (snap.state === "absent" || snap.state === "unavailable") return snap;

    var Ctor = RecognitionCtor();
    if (!Ctor || typeof Ctor.install !== "function") {
      return {
        state: "unavailable",
        lang: lang,
        backend: snap.backend || "none",
        reason: "speech model install API missing",
      };
    }

    report("Downloading on-device speech model (" + lang + ") — voice stays off until this finishes", "busy");
    try {
      var ok = await Ctor.install({ langs: [lang], processLocally: true });
      if (!ok) {
        return {
          state: "unavailable",
          lang: lang,
          backend: "edge-local",
          reason: "speech model install failed for " + lang,
        };
      }
    } catch (err) {
      return {
        state: "unavailable",
        lang: lang,
        backend: "edge-local",
        reason: "speech model install error: " + ((err && err.message) || String(err)),
      };
    }
    snap = await availability(lang);
    if (snap.state === "available") {
      report("Speech model ready — hold ` to dictate, Alt+V to listen", "ok");
    }
    return snap;
  }

  function isReady(snap) {
    return !!(snap && snap.state === "available");
  }

  function statusLabel(snap) {
    if (!snap) return "speech unknown";
    if (snap.state === "available") return "speech ready (on-device)";
    if (snap.state === "downloading") return "speech downloading…";
    if (snap.state === "downloadable") return "speech needs download";
    if (snap.state === "absent") return "speech unsupported";
    return "speech unavailable";
  }

  function normalizeIntent(mode) {
    var m = String(mode || "default").toLowerCase();
    if (INTENT_MODES.indexOf(m) === -1) return "default";
    return m;
  }

  function nextIntentMode(current) {
    var i = INTENT_MODES.indexOf(normalizeIntent(current));
    return INTENT_MODES[(i + 1) % INTENT_MODES.length];
  }

  function stripWake(raw) {
    var text = String(raw || "").trim();
    for (var i = 0; i < WAKE_PREFIXES.length; i++) {
      if (WAKE_PREFIXES[i].test(text)) {
        return { woke: true, rest: text.replace(WAKE_PREFIXES[i], "").trim() };
      }
    }
    return { woke: false, rest: text };
  }

  /**
   * Map a spoken phrase to a board line (slash/CLI) when it matches the
   * command grammar. Returns null when the phrase is not a command.
   */
  function matchCommand(phrase) {
    var t = String(phrase || "").trim().replace(/\s+/g, " ");
    if (!t) return null;
    var lower = t.toLowerCase();

    // Mode switches (Voice Access: "commands mode" / "dictation mode").
    if (/^(commands?|command)\s+mode$/.test(lower) || lower === "command mode") {
      return { kind: "mode-switch", nextMode: "commands", hint: "commands mode" };
    }
    if (/^dictation\s+mode$/.test(lower) || lower === "dictate mode") {
      return { kind: "mode-switch", nextMode: "dictation", hint: "dictation mode" };
    }
    if (/^default\s+mode$/.test(lower) || lower === "normal mode" || lower === "mixed mode") {
      return { kind: "mode-switch", nextMode: "default", hint: "default mode" };
    }

    // Help / discoverability (Voice Access: "what can I say?").
    if (/^what can i say\??$/.test(lower) ||
        /^voice\s+help$/.test(lower) ||
        /^show\s+(voice\s+)?commands$/.test(lower) ||
        /^help\s+voice$/.test(lower)) {
      return { kind: "help", hint: "voice commands" };
    }

    // Stop listening.
    if (/^(stop\s+listening|stop\s+dictation|cancel|never\s+mind|nevermind)$/.test(lower)) {
      return { kind: "stop", hint: "stop listening" };
    }

    // Submit / send the prompt.
    if (/^(send|submit|post\s+it|send\s+it|enter)$/.test(lower)) {
      return { kind: "submit", hint: "send" };
    }

    // Clear prompt.
    if (/^(clear( the)? (prompt|input|line)|delete that|scratch that)$/.test(lower)) {
      return { kind: "clear", hint: "clear prompt" };
    }

    // Exact user phrases resolve to the same safe action used by the prompt
    // and WebMCP. Near matches remain unknown in commands mode.
    var userAction = window.NB_POWER && window.NB_POWER.resolveVoice(t);
    if (userAction) {
      return { kind: "command", line: "macro run " + userAction, hint: "macro " + userAction };
    }

    // Navigation.
    var go = /^(?:go(?:\s+to)?|open|navigate(?:\s+to)?|cd)\s+(.+)$/i.exec(t);
    if (go) {
      var dest = go[1].trim().replace(/\s+/g, "/").replace(/^\/+/, "");
      return { kind: "command", line: "/go " + dest, hint: "go " + dest };
    }

    // Search.
    var search = /^(?:search|find|look\s+for)\s+(.+)$/i.exec(t);
    if (search) {
      return { kind: "command", line: "/search " + search[1].trim(), hint: "search" };
    }

    // Sort / view.
    var sort = /^(?:sort(?:\s+by)?|view)\s+(hot|new|top|best)$/i.exec(t);
    if (sort) {
      return { kind: "command", line: "/sort " + sort[1].toLowerCase(), hint: "sort " + sort[1] };
    }

    // Theme.
    var theme = /^(?:theme|use\s+theme)\s+(.+)$/i.exec(t);
    if (theme) {
      return { kind: "command", line: "/theme " + theme[1].trim(), hint: "theme" };
    }

    // Workspace.
    if (/^(new\s+(workspace|tab)|open\s+(a\s+)?new\s+(workspace|tab))$/i.test(t)) {
      return { kind: "command", line: "/tab", hint: "new workspace" };
    }

    // Activity / DMs / help / keys.
    if (/^(open\s+)?(activity|notifications)$/i.test(t)) {
      return { kind: "command", line: "/activity", hint: "activity" };
    }
    var dm = /^(?:(?:open\s+)?(?:dm|message|msg)|message)\s+(\S+)$/i.exec(t);
    if (dm) {
      return { kind: "command", line: "/dm " + dm[1].replace(/^@/, ""), hint: "dm" };
    }
    if (/^(show\s+)?(keys|hotkeys|cheatsheet)$/i.test(t) || lower === "show keys") {
      // Hotkey cheatsheet — not a user-facing slash; agents may still /keys.
      return { kind: "command", line: "/keys", hint: "keys" };
    }
    if (/^help$/.test(lower) || /^slash\s+help$/.test(lower)) {
      return { kind: "command", line: "/help", hint: "help" };
    }
    // Context actions roll under /act.
    if (/^(reply(\s+to)?|arm\s+reply)$/i.test(lower)) {
      return { kind: "command", line: "/act reply", hint: "act reply" };
    }
    var replySaid = /^reply\s+(.+)$/i.exec(t);
    if (replySaid) {
      return { kind: "command", line: "/act reply " + replySaid[1].trim(), hint: "act reply" };
    }
    if (/^(join\s+voice|leave\s+voice|voice\s+(join|leave|mute|status))$/i.test(t)) {
      var vrest = t.replace(/^voice\s+/i, "").replace(/\s+voice$/i, "");
      if (/^join\s+voice$/i.test(t)) vrest = "join";
      if (/^leave\s+voice$/i.test(t)) vrest = "leave";
      return { kind: "command", line: "/act voice " + vrest, hint: "act voice" };
    }

    // AI / CLI mode — user-facing slash is /mode; agents may still use /ai|/cli.
    if (/^(ai\s+mode|switch\s+to\s+ai|mode\s+ai)$/i.test(t)) {
      return { kind: "command", line: "/mode ai", hint: "ai mode" };
    }
    if (/^(cli\s+mode|command\s+line\s+mode|switch\s+to\s+cli|mode\s+cli)$/i.test(t)) {
      return { kind: "command", line: "/mode cli", hint: "cli mode" };
    }

    // Bare slash spoken as "slash go bugs".
    var slashSaid = /^slash\s+(\/.+)$/i.exec(t) || /^slash\s+(.+)$/i.exec(t);
    if (slashSaid) {
      var rest = slashSaid[1].trim();
      if (rest.charAt(0) !== "/") rest = "/" + rest.replace(/\s+/g, " ");
      return { kind: "command", line: rest.replace(/\s+/g, " "), hint: "slash" };
    }

    return null;
  }

  /**
   * Classify a final transcript under the active intent mode.
   *
   * @returns {{
   *   kind: "dictation"|"command"|"mode-switch"|"help"|"stop"|"submit"|"clear"|"unknown",
   *   text?: string, line?: string, nextMode?: string, hint?: string, woke?: boolean
   * }}
   */
  function parseUtterance(raw, intentMode) {
    var intent = normalizeIntent(intentMode);
    var woke = stripWake(raw);
    var phrase = woke.rest;
    if (!phrase && woke.woke) {
      return { kind: "help", hint: "voice commands", woke: true };
    }
    if (!phrase) return { kind: "dictation", text: "" };

    // Mode switches and stop always win (safe from any intent mode).
    var always = matchCommand(phrase);
    if (always && (always.kind === "mode-switch" || always.kind === "stop" ||
        always.kind === "help" || always.kind === "submit" || always.kind === "clear")) {
      always.woke = woke.woke;
      return always;
    }

    if (intent === "dictation" && !woke.woke) {
      return { kind: "dictation", text: phrase, woke: false };
    }

    // Force command parse when woke or in commands mode.
    var forceCmd = intent === "commands" || woke.woke;
    var hit = matchCommand(phrase);
    if (hit && hit.kind === "command") {
      hit.woke = woke.woke;
      return hit;
    }

    if (forceCmd) {
      // Unrecognized in commands mode — do not dump into the prompt.
      return {
        kind: "unknown",
        text: phrase,
        hint: "unrecognized — say \"what can I say?\"",
        woke: woke.woke,
      };
    }

    // Default mode, no wake: treat as dictation.
    return { kind: "dictation", text: phrase, woke: false };
  }

  function whatCanISay() {
    return [
      "Voice modes (say, or Alt+Shift+V): default · dictation · commands",
      "Wake prefixes (default mode): \"computer …\", \"command …\", \"hey epoch …\"",
      "go to <path> · search <query> · sort by hot|new|top|best",
      "theme <name> · new workspace · open activity · message <handle>",
      "saved macro voice phrases run their matching user action",
      "show keys · help · ai mode · cli mode · slash <command>",
      "send · clear prompt · stop listening · what can I say?",
    ].join("\n");
  }

  /**
   * @param {object} opts
   * @param {function(string): void} opts.onPartial  interim transcript
   * @param {function(string): void} opts.onFinal    committed phrase
   * @param {function(object): void} [opts.onState]  { listening, mode, error, supported }
   * @param {string} [opts.lang]
   */
  function create(opts) {
    opts = opts || {};
    var Ctor = RecognitionCtor();
    var rec = null;
    var state = {
      supported: !!Ctor,
      listening: false,
      mode: null, // "ptt" | "toggle" | null
      error: null,
      interim: "",
    };

    function emit() {
      if (opts.onState) opts.onState({
        supported: state.supported,
        listening: state.listening,
        mode: state.mode,
        error: state.error,
        interim: state.interim,
      });
    }

    function destroyRec() {
      if (!rec) return;
      try { rec.onresult = null; rec.onerror = null; rec.onend = null; rec.onstart = null; } catch { /* fine */ }
      try { rec.abort(); } catch { /* fine */ }
      rec = null;
    }

    function ensureRec() {
      if (!Ctor) return null;
      if (rec) return rec;
      rec = new Ctor();
      rec.continuous = true;
      rec.interimResults = true;
      rec.lang = opts.lang || defaultLang();
      rec.maxAlternatives = 1;
      // Prefer on-device recognition when the engine exposes the Edge flag.
      try {
        if ("processLocally" in rec) rec.processLocally = true;
      } catch { /* fine */ }

      rec.onstart = function () {
        state.listening = true;
        state.error = null;
        emit();
      };

      rec.onresult = function (ev) {
        var interim = "";
        var finals = [];
        for (var i = ev.resultIndex; i < ev.results.length; i++) {
          var r = ev.results[i];
          var t = (r[0] && r[0].transcript) || "";
          if (r.isFinal) finals.push(t);
          else interim += t;
        }
        state.interim = interim;
        if (finals.length && opts.onFinal) {
          finals.forEach(function (phrase) {
            var p = String(phrase || "").trim();
            if (p) opts.onFinal(p);
          });
        }
        if (opts.onPartial) opts.onPartial(interim);
        emit();
      };

      rec.onerror = function (ev) {
        var code = (ev && ev.error) || "error";
        // no-speech / aborted are normal ends for PTT; don't paint as failure.
        if (code === "no-speech" || code === "aborted") {
          state.error = null;
        } else if (code === "not-allowed" || code === "service-not-allowed") {
          state.error = "mic denied — allow microphone to dictate";
        } else if (code === "network") {
          state.error = "speech network error";
        } else {
          state.error = "speech: " + code;
        }
        emit();
      };

      rec.onend = function () {
        // Continuous toggle: engine may end between phrases — restart if still on.
        if (state.mode === "toggle" && state.listening) {
          try { rec.start(); return; } catch { /* already started */ }
        }
        state.listening = false;
        state.mode = null;
        state.interim = "";
        emit();
      };

      return rec;
    }

    function start(mode) {
      if (!Ctor) {
        state.error = "speech not supported in this browser";
        emit();
        return false;
      }
      if (opts.requireReady && !opts.isReady()) {
        state.error = opts.notReadyReason
          ? opts.notReadyReason()
          : "speech model not ready — wait for download or use a browser with on-device STT";
        emit();
        return false;
      }
      mode = mode || "toggle";
      var r = ensureRec();
      if (!r) return false;
      state.mode = mode;
      state.error = null;
      state.interim = "";
      try {
        r.start();
        // onstart will set listening; some engines are sync about errors.
        state.listening = true;
        emit();
        return true;
      } catch (e) {
        // InvalidStateError if already started — treat as success.
        if (e && (e.name === "InvalidStateError" || /already started/i.test(String(e.message || e)))) {
          state.listening = true;
          emit();
          return true;
        }
        state.listening = false;
        state.mode = null;
        state.error = "speech could not start";
        emit();
        return false;
      }
    }

    function stop() {
      state.mode = null;
      state.listening = false;
      state.interim = "";
      if (rec) {
        try { rec.stop(); } catch { /* fine */ }
        try { rec.abort(); } catch { /* fine */ }
      }
      emit();
    }

    /** Push-to-talk: start on press. */
    function pttDown() {
      if (state.listening && state.mode === "toggle") return true; // don't clobber toggle
      return start("ptt");
    }

    /** Push-to-talk: stop on release. */
    function pttUp() {
      if (state.mode !== "ptt") return;
      stop();
    }

    /** Toggle continuous dictation (voice-activity analogue). */
    function toggle() {
      if (!Ctor) {
        state.error = "speech not supported in this browser";
        emit();
        return false;
      }
      if (state.listening) {
        stop();
        return false;
      }
      return start("toggle");
    }

    function dispose() {
      stop();
      destroyRec();
    }

    return {
      isSupported: function () { return !!Ctor; },
      getState: function () {
        return {
          supported: state.supported,
          listening: state.listening,
          mode: state.mode,
          error: state.error,
          interim: state.interim,
        };
      },
      start: start,
      stop: stop,
      pttDown: pttDown,
      pttUp: pttUp,
      toggle: toggle,
      dispose: dispose,
    };
  }

  /**
   * Is this key event the Discord-style push-to-talk chord?
   * Default: bare Backquote ` (common Discord PTT bind), no modifiers.
   */
  function isPttKey(ev) {
    if (!ev) return false;
    if (ev.altKey || ev.ctrlKey || ev.metaKey || ev.shiftKey) return false;
    return ev.code === "Backquote" || ev.key === "`" || ev.key === "Dead";
  }

  /** Alt+V — toggle continuous listening (does not collide with sort `v`). */
  function isToggleKey(ev) {
    if (!ev) return false;
    if (ev.shiftKey) return false; // Alt+Shift+V is intent-mode cycle
    return ev.altKey && !ev.ctrlKey && !ev.metaKey &&
      (ev.key === "v" || ev.key === "V" || ev.code === "KeyV");
  }

  /** Alt+Shift+V — cycle Voice Access-style intent mode. */
  function isIntentModeKey(ev) {
    if (!ev) return false;
    return ev.altKey && ev.shiftKey && !ev.ctrlKey && !ev.metaKey &&
      (ev.key === "v" || ev.key === "V" || ev.code === "KeyV");
  }

  window.NB_SPEECH = {
    isSupported: isSupported,
    availability: availability,
    ensureModel: ensureModel,
    isReady: isReady,
    statusLabel: statusLabel,
    defaultLang: defaultLang,
    create: create,
    isPttKey: isPttKey,
    isToggleKey: isToggleKey,
    isIntentModeKey: isIntentModeKey,
    INTENT_MODES: INTENT_MODES.slice(),
    normalizeIntent: normalizeIntent,
    nextIntentMode: nextIntentMode,
    parseUtterance: parseUtterance,
    matchCommand: matchCommand,
    whatCanISay: whatCanISay,
    // Documented defaults for cheatsheet / docs.
    HOTKEYS: {
      ptt: "`",
      pttLabel: "Hold `",
      toggle: "Alt+V",
      toggleLabel: "Alt+V",
      intent: "Alt+Shift+V",
      intentLabel: "Alt+Shift+V",
    },
  };
})();
