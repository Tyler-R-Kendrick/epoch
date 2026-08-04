/**
 * Talking to an on-device model, assuming everything fails.
 *
 * The first version assumed a session opens, a prompt returns, and output
 * parses. All three are optimistic. A first-run download can take minutes and
 * report nothing; a session can be evicted under memory pressure; a small model
 * can return prose, half a token, or nothing at all. Any of those produced a
 * panel that looked idle, which is the worst outcome: the user cannot tell
 * "thinking" from "broken".
 *
 * Everything here is streaming and every failure has a visible consequence.
 */
(function () {
  "use strict";

  /** Milliseconds with no token before the attempt is considered stalled. */
  var STALL_MS = 25000;
  /** Milliseconds with no download progress before saying so. */
  var QUIET_DOWNLOAD_MS = 4000;

  function isTransient(err) {
    var m = String((err && (err.name + " " + err.message)) || err).toLowerCase();
    // Eviction, quota, busy sessions and network hiccups are worth retrying.
    // A schema or syntax rejection is not: retrying produces the same answer.
    return (
      m.indexOf("quota") !== -1 ||
      m.indexOf("unavailable") !== -1 ||
      m.indexOf("busy") !== -1 ||
      m.indexOf("network") !== -1 ||
      m.indexOf("evict") !== -1 ||
      m.indexOf("aborterror") === -1 && m.indexOf("timeout") !== -1 ||
      m.indexOf("internal") !== -1
    );
  }

  function sleep(ms, signal) {
    return new Promise(function (resolve, reject) {
      var t = setTimeout(resolve, ms);
      if (signal) {
        signal.addEventListener("abort", function () {
          clearTimeout(t);
          reject(new DOMException("aborted", "AbortError"));
        }, { once: true });
      }
    });
  }

  /**
   * Availability, treated as four states plus absence, and never trusted to be
   * stable — it can change between the check and the call.
   */
  async function availability() {
    if (typeof LanguageModel === "undefined") return "absent";
    try {
      var state = await LanguageModel.availability({
        expectedInputs: [{ type: "text", languages: ["en"] }],
        expectedOutputs: [{ type: "text", languages: ["en"] }],
      });
      return state || "unavailable";
    } catch {
      return "absent";
    }
  }

  /**
   * Open a session, reporting download progress continuously.
   *
   * The download is the part that looks broken: `downloadprogress` may fire
   * rarely, or not at all until it completes. A heartbeat runs alongside it so
   * the panel keeps saying something true even when the event is silent.
   */
  async function openSession(opts) {
    var report = opts.report;
    var signal = opts.signal;
    var lastEvent = Date.now();
    var pct = null;
    var heartbeat = setInterval(function () {
      var quiet = Date.now() - lastEvent;
      if (pct === null && quiet > QUIET_DOWNLOAD_MS) {
        report(
          "Fetching the on-device model. It reports no progress until the first chunk lands, " +
          "and a first run can take several minutes. Waited " + Math.round(quiet / 1000) + "s.",
          "busy"
        );
      } else if (pct !== null && quiet > QUIET_DOWNLOAD_MS) {
        report("Downloading — " + pct + "% (paused for " + Math.round(quiet / 1000) + "s)", "busy");
      }
    }, 1000);

    try {
      return await LanguageModel.create({
        signal: signal,
        initialPrompts: opts.initialPrompts,
        monitor: function (m) {
          m.addEventListener("downloadprogress", function (e) {
            lastEvent = Date.now();
            // `loaded` is 0..1 in the current API but has shipped as 0..100
            // elsewhere; normalise rather than showing "4700%".
            var raw = typeof e.loaded === "number" ? e.loaded : 0;
            pct = Math.round(raw > 1 ? raw : raw * 100);
            report("Downloading the on-device model — " + pct + "%", "busy");
          });
        },
      });
    } finally {
      clearInterval(heartbeat);
    }
  }

  /**
   * Stream a prompt, surfacing every chunk and failing loudly on a stall.
   *
   * onChunk receives the accumulated text so a caller can parse progressively.
   * A stall watchdog exists because a hung stream otherwise looks identical to
   * a slow one, forever.
   */
  async function streamPrompt(session, prompt, opts) {
    var onChunk = opts.onChunk || function () {};
    var report = opts.report || function () {};
    var signal = opts.signal;
    var acc = "";
    var lastToken = Date.now();

    var watchdog = setInterval(function () {
      var quiet = Date.now() - lastToken;
      if (quiet > STALL_MS) {
        report("No output for " + Math.round(quiet / 1000) + "s — the model may be stalled.", "busy");
      }
    }, 2000);

    try {
      var stream = session.promptStreaming(prompt, {
        signal: signal,
        responseConstraint: opts.responseConstraint,
      });
      for await (var raw of stream) {
        lastToken = Date.now();
        // Some builds stream deltas, others stream the whole text each time.
        // Detect rather than assume, or output doubles — and always hand the
        // caller a true delta, because a streaming parser wants the next chunk,
        // not the transcript so far.
        var delta;
        if (raw.length >= acc.length && raw.indexOf(acc) === 0) {
          delta = raw.slice(acc.length);
          acc = raw;
        } else {
          delta = raw;
          acc += raw;
        }
        if (delta !== "") onChunk(acc, delta);
      }
      return acc;
    } finally {
      clearInterval(watchdog);
    }
  }

  /**
   * Run an attempt with retry and backoff, but only for faults where a retry
   * could plausibly help. Retrying a malformed answer just wastes the user's
   * battery.
   */
  async function withRetry(attempt, opts) {
    var tries = opts.tries || 3;
    var report = opts.report || function () {};
    var signal = opts.signal;
    var lastError = null;
    for (var i = 0; i < tries; i++) {
      if (signal && signal.aborted) throw new DOMException("aborted", "AbortError");
      try {
        return await attempt(i);
      } catch (err) {
        lastError = err;
        if (err && err.name === "AbortError") throw err;
        if (!isTransient(err) || i === tries - 1) throw err;
        var wait = Math.round(600 * Math.pow(2, i));
        report(
          "Attempt " + (i + 1) + " of " + tries + " failed (" + (err.message || err) + "). " +
          "Retrying in " + wait + "ms.",
          "busy"
        );
        await sleep(wait, signal);
      }
    }
    throw lastError;
  }

  window.NBResilient = {
    availability: availability,
    openSession: openSession,
    streamPrompt: streamPrompt,
    withRetry: withRetry,
    isTransient: isTransient,
    STALL_MS: STALL_MS,
  };
})();
