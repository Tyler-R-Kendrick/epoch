/** Livestream command log: sanitize via the shared runtime policy, never pixel-share. */
(function () {
  "use strict";

  var muted = false;
  var protectedFocus = false;
  var roleName = "streamer";
  var log = [];
  var salt = "board";
  var policy = { ignore: "", rewrite: "" };
  var spectatorCanReadPath = null;

  function runtime() {
    return window.CW_RUNTIME || {};
  }

  function currentPath() {
    return (window.CW_APP && window.CW_APP.state && window.CW_APP.state.path) || "";
  }

  function readWorkspaceText(name) {
    if (window.CW_APP && globalThis.CW_VALUE.isFunction(window.CW_APP.readWorkspaceText)) {
      var text = window.CW_APP.readWorkspaceText(name);
      if (text) return String(text);
    }
    var buffers = window.CW_APP && window.CW_APP.state && window.CW_APP.state.editor &&
      window.CW_APP.state.editor.buffers;
    if (!buffers) return "";
    var candidates = [name, "/" + name];
    for (var i = 0; i < candidates.length; i++) {
      var buf = buffers[candidates[i]];
      if (!buf) continue;
      if (globalThis.CW_VALUE.isFunction(buf.text)) return String(buf.text() || "");
      if (globalThis.CW_VALUE.isString(buf)) return buf;
    }
    return "";
  }

  function loadWorkspacePolicy() {
    var ignore = readWorkspaceText(".epochstreamignore");
    var rewrite = readWorkspaceText(".epochstreamrewrite");
    if (ignore) policy.ignore = ignore;
    if (rewrite) policy.rewrite = rewrite;
  }

  function publicArgs(args) {
    var out = {};
    Object.keys(args || {}).forEach(function (key) {
      if (/password|secret|token|authorization|cookie/i.test(key)) return;
      out[key] = args[key];
    });
    return out;
  }

  function emit(actionId, args, path) {
    var api = runtime();
    if (!globalThis.CW_VALUE.isFunction(api.sanitizeStreamCommand)) return { kind: "drop", reason: "unavailable" };
    loadWorkspacePolicy();
    if (!policy.ignore && !policy.rewrite) fetchWorkspacePolicy();
    var result = api.sanitizeStreamCommand({
      envelope: {
        t: Date.now(),
        actorId: (window.CW_APP && window.CW_APP.getIdentity && window.CW_APP.getIdentity().principalId) || "guest",
        actionId: actionId,
        args: publicArgs(args),
        path: path || currentPath(),
      },
      inputMuted: muted,
      protectedInput: protectedFocus,
      ignore: policy.ignore,
      rewrite: policy.rewrite,
      sessionSalt: salt,
      spectatorCanReadPath: spectatorCanReadPath || undefined,
    });
    if (result.kind === "emit") log.push(result.envelope);
    return result;
  }

  function paint() {
    var el = document.querySelector("[data-stream-protect-state]");
    if (!el) return;
    var line = "";
    if (protectedFocus) line = "PROTECTED INPUT";
    else if (muted) line = "STREAM MUTE";
    el.hidden = !line;
    el.textContent = line;
    document.body.dataset.streamRole = roleName;
    document.body.dataset.streamMuted = muted || protectedFocus ? "true" : "false";
  }

  function toggleMute() {
    muted = !muted;
    var line = muted ? "STREAM MUTE · inputs" : "stream inputs live";
    if (window.CW_APP && globalThis.CW_VALUE.isFunction(window.CW_APP.status)) window.CW_APP.status(line);
    paint();
    return muted;
  }

  function inspectTarget(target) {
    if (!target || !target.closest) return false;
    var field = target.closest("input, textarea, [contenteditable=''], [contenteditable='true']");
    var dialog = target.closest("[data-auth-dialog], [data-stream-protect]");
    var api = runtime();
    if (!globalThis.CW_VALUE.isFunction(api.isProtectedStreamTarget)) {
      return !!(dialog || (field && field.getAttribute("type") === "password"));
    }
    var active = window.CW_APP && window.CW_APP.state && window.CW_APP.state.editor &&
      window.CW_APP.state.editor.active;
    var path = (field && (field.getAttribute("data-path") || field.getAttribute("name"))) ||
      (globalThis.CW_VALUE.isString(active) ? active : (active && active.path)) ||
      "";
    return api.isProtectedStreamTarget({
      path: path,
      inputType: field && field.getAttribute("type") || "",
      autocomplete: field && field.getAttribute("autocomplete") || "",
      protectAttr: !!(field && field.hasAttribute("data-stream-protect")) || !!dialog,
      inAuthDialog: !!(dialog && dialog.getAttribute("data-auth-dialog") !== null),
    });
  }

  function configure(next) {
    next = next || {};
    if (next.ignore != null) policy.ignore = String(next.ignore);
    if (next.rewrite != null) policy.rewrite = String(next.rewrite);
    if (next.sessionSalt != null) salt = String(next.sessionSalt);
    if (globalThis.CW_VALUE.isFunction(next.spectatorCanReadPath)) spectatorCanReadPath = next.spectatorCanReadPath;
    return { ignore: policy.ignore, rewrite: policy.rewrite };
  }

  function enterSpectator() {
    roleName = "spectator";
    paint();
    return roleName;
  }

  function exitSpectator() {
    roleName = "streamer";
    paint();
    return roleName;
  }

  function replayDecision(envelope) {
    var api = runtime();
    if (globalThis.CW_VALUE.isFunction(api.replayStreamCommand)) return api.replayStreamCommand(envelope);
    if (globalThis.CW_VALUE.isFunction(api.isSpectatorViewPreference) && api.isSpectatorViewPreference(envelope.actionId)) {
      return { kind: "skip", reason: "view-preference" };
    }
    return { kind: "apply", envelope: envelope };
  }

  function replay(envelopes) {
    var list = Array.isArray(envelopes) ? envelopes : [];
    var skipped = [];
    var jobs = [];
    list.forEach(function (envelope) {
      var decision = replayDecision(envelope);
      if (decision.kind !== "apply") {
        skipped.push({ actionId: envelope.actionId, reason: decision.reason || "skip" });
        return;
      }
      if (!window.CW_ACTIONS || !globalThis.CW_VALUE.isFunction(window.CW_ACTIONS.invoke)) return;
      jobs.push(window.CW_ACTIONS.invoke(envelope.actionId, envelope.args || {}, {
        origin: "stream-replay",
        replay: true,
        path: envelope.path,
      }));
    });
    return Promise.all(jobs).then(function (results) {
      return { applied: results.length, skipped: skipped };
    });
  }

  function slabHtml(raw, formatChunk) {
    var format = globalThis.CW_VALUE.isFunction(formatChunk) ? formatChunk : function (chunk) {
      return String(chunk == null ? "" : chunk).replace(/[&<>"]/g, function (c) {
        return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c];
      });
    };
    var text = String(raw == null ? "" : raw);
    if (roleName !== "spectator") return format(text);
    var api = runtime();
    var alphabet = api.STREAM_CIPHER_ALPHABET || "░▒▓█▀▄■□◆◇※‡†¤§øæ#@%&";
    var width = api.STREAM_CIPHER_WIDTH || 12;
    var escaped = alphabet.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    var re = new RegExp("[" + escaped + "]{" + width + "}", "g");
    var out = "";
    var last = 0;
    var match;
    while ((match = re.exec(text))) {
      if (match.index > last) out += format(text.slice(last, match.index));
      out += '<span class="cw-stream-slab" data-stream-slab data-fx="decrypt" data-decrypt-passthrough="0" aria-label="hidden">' +
        format(match[0]) + "</span>";
      last = match.index + match[0].length;
    }
    if (last < text.length) out += format(text.slice(last));
    return out;
  }

  function attachCipherSlabs(root) {
    if (roleName !== "spectator") return;
    var host = root && root.querySelectorAll ? root : document;
    var nodes = host.querySelectorAll("[data-stream-slab]");
    var fx = window.CW_FX || window.CW_CANVASUI;
    if (!fx || !globalThis.CW_VALUE.isFunction(fx.createDecryptReveal)) return;
    for (var i = 0; i < nodes.length; i++) {
      if (nodes[i].dataset.streamSlabReady) continue;
      nodes[i].dataset.streamSlabReady = "true";
      try {
        fx.createDecryptReveal({ root: nodes[i] }, { passthrough: 0, scramble: 1 });
      } catch {
        /* slab text stays ciphered even if the shader is unavailable */
      }
    }
  }

  function fetchWorkspacePolicy() {
    function okText(response) {
      if (!response || !response.ok) return "";
      var type = response.headers.get("content-type") || "";
      if (type.indexOf("text/html") >= 0) return "";
      return response.text().then(function (text) {
        return /^\s*</.test(text) ? "" : text;
      });
    }
    var load = globalThis.CW_VALUE.isFunction(window.fetch) ? window.fetch.bind(window) : null;
    if (!load) return Promise.resolve({ ignore: policy.ignore, rewrite: policy.rewrite });
    return Promise.all([
      load("/.epochstreamignore").then(okText).catch(function () { return ""; }),
      load("/.epochstreamrewrite").then(okText).catch(function () { return ""; }),
    ]).then(function (parts) {
      if (parts[0]) policy.ignore = parts[0];
      if (parts[1]) policy.rewrite = parts[1];
      return { ignore: policy.ignore, rewrite: policy.rewrite };
    });
  }

  document.addEventListener("focusin", function (ev) {
    protectedFocus = inspectTarget(ev.target);
    paint();
  });
  document.addEventListener("focusout", function () {
    window.setTimeout(function () {
      protectedFocus = inspectTarget(document.activeElement);
      paint();
    }, 0);
  });

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", paint);
  } else {
    paint();
  }

  window.CW_STREAM = {
    emit: emit,
    toggleMute: toggleMute,
    configure: configure,
    replay: replay,
    enterSpectator: enterSpectator,
    exitSpectator: exitSpectator,
    slabHtml: slabHtml,
    attachCipherSlabs: attachCipherSlabs,
    paint: paint,
    loadWorkspacePolicy: loadWorkspacePolicy,
    isMuted: function () { return muted; },
    isProtected: function () { return protectedFocus; },
    role: function () { return roleName; },
    policy: function () { return { ignore: policy.ignore, rewrite: policy.rewrite }; },
    log: function () { return log.slice(); },
    reset: function () {
      log = [];
      muted = false;
      protectedFocus = false;
      roleName = "streamer";
      policy = { ignore: "", rewrite: "" };
      spectatorCanReadPath = null;
      paint();
    },
  };
})();
