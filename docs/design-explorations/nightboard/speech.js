/**
 * Speech-to-text for the Nightboard prompt — only when the browser exposes it.
 *
 * Uses the Web Speech API (`SpeechRecognition` / `webkitSpeechRecognition`).
 * If the constructor is missing, every public entry returns unsupported and
 * the UI must not offer a mic control or STT hotkeys.
 *
 * Discord-style input modes (mapped onto dictation, not voice chat):
 *
 *   push-to-talk   hold ` (Backquote) — listen while held, commit on release
 *   toggle         Alt+V — continuous listen until Alt+V / Esc / stop again
 *
 * Fail soft: permission denied, network errors, and no-speech end the session
 * without throwing into the board.
 */
(function () {
  "use strict";

  function RecognitionCtor() {
    return window.SpeechRecognition || window.webkitSpeechRecognition || null;
  }

  function isSupported() {
    return !!RecognitionCtor();
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
      rec.lang = opts.lang || (typeof navigator !== "undefined" && navigator.language) || "en-US";
      rec.maxAlternatives = 1;

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

  /** Alt+V — toggle continuous dictation (does not collide with sort `v`). */
  function isToggleKey(ev) {
    if (!ev) return false;
    return ev.altKey && !ev.ctrlKey && !ev.metaKey &&
      (ev.key === "v" || ev.key === "V" || ev.code === "KeyV");
  }

  window.NB_SPEECH = {
    isSupported: isSupported,
    create: create,
    isPttKey: isPttKey,
    isToggleKey: isToggleKey,
    // Documented defaults for cheatsheet / docs.
    HOTKEYS: {
      ptt: "`",
      pttLabel: "Hold `",
      toggle: "Alt+V",
      toggleLabel: "Alt+V",
    },
  };
})();
