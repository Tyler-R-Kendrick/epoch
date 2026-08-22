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
    // `window.LanguageModel`, not the bare global: a browser without the
    // Prompt API has no such binding, so naming it directly throws a
    // ReferenceError instead of reporting the absence this function exists
    // to report.
    if (globalThis.CW_VALUE.isUndefined(window.LanguageModel)) return "absent";
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
            var raw = globalThis.CW_VALUE.isNumber(e.loaded) ? e.loaded : 0;
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

  /* ── One session, warmed once ───────────────────────────────────────────
   *
   * The first version opened a session per turn and destroyed it in `finally`,
   * so every message paid the full startup cost and the model was effectively
   * re-acquired each time. The download itself persists in the browser profile
   * across reloads; what did not persist was any attempt to hold on to it.
   *
   * This keeps exactly one session, starts warming it at boot, and hands the
   * same one to every turn. It is only rebuilt if it actually breaks — a
   * session can be evicted under memory pressure, and pretending otherwise
   * would trade one bug for a worse one.
   */
  var shared = { session: null, promise: null, prompt: null, state: "cold", error: null };
  var READY_KEY = "cw-model-ready";

  function wasReadyBefore() {
    try { return window.localStorage.getItem(READY_KEY) === "1"; } catch { return false; }
  }
  function rememberReady() {
    try { window.localStorage.setItem(READY_KEY, "1"); } catch { /* private mode */ }
  }

  /**
   * Begin acquiring the model. Safe to call repeatedly — the same promise comes
   * back, so a click during warm-up joins the in-flight load instead of racing
   * a second one.
   */
  function warm(opts) {
    var o = opts || {};
    if (shared.promise) return shared.promise;
    shared.state = "warming";
    shared.prompt = o.initialPrompt || null;
    shared.promise = (async function () {
      var avail = await availability();
      if (avail === "absent" || avail === "unavailable") {
        shared.state = "unavailable";
        throw new Error("no on-device model in this browser");
      }
      var session = await openSession({
        report: o.report || function () {},
        initialPrompts: shared.prompt ? [{ role: "system", content: shared.prompt }] : undefined,
      });
      shared.session = session;
      shared.state = "ready";
      shared.error = null;
      rememberReady();
      return session;
    })();
    shared.promise.catch(function (err) {
      // Record why, and leave the state saying "failed" rather than "warming".
      // A warm-up that dies silently leaves the UI claiming it is still loading
      // forever, which is the same lie as a spinner that never resolves.
      shared.state = "failed";
      shared.error = (err && err.message) || String(err);
      shared.promise = null;
    });
    return shared.promise;
  }

  /** The shared session, warming it first if nobody has yet. */
  async function session(opts) {
    if (shared.session) return shared.session;
    return warm(opts);
  }

  /** Drop the shared session so the next turn rebuilds it. */
  function invalidate() {
    shared.session = null;
    shared.promise = null;
    shared.state = "cold";
  }

  function modelState() {
    return { state: shared.state, error: shared.error || null, seenBefore: wasReadyBefore() };
  }

  /* One route per workspace. Re-pick only after policy change or failure. */
  var ROUTE_KEY = "cw-route-affinity-v1";
  var DEFAULT_POLICY = {
    version: "community-web-local-v1",
    affinity: "workspace-session",
    invalidateOn: ["policy-change", "recoverable-failure"],
    routes: [
      { id: "local", model: "on-device", format: "native" },
      { id: "capable", model: "switchyard/capable", format: "auto" },
    ],
  };

  function readRoutes() {
    try {
      var got = JSON.parse(window.localStorage.getItem(ROUTE_KEY) || "{}");
      return got && globalThis.CW_VALUE.isObject(got) && !Array.isArray(got) ? got : {};
    } catch { return {}; }
  }

  function writeRoutes(routes) {
    try { window.localStorage.setItem(ROUTE_KEY, JSON.stringify(routes)); } catch { /* session only */ }
  }

  function pickRoute(workspaceId, policy) {
    var workspace = String(workspaceId || "default");
    var p = policy || DEFAULT_POLICY;
    var routes = Array.isArray(p.routes) ? p.routes.filter(function (route) {
      return route && globalThis.CW_VALUE.isString(route.id) && route.id && globalThis.CW_VALUE.isString(route.model);
    }) : [];
    if (!routes.length) return null;
    var bag = readRoutes();
    var prior = bag[workspace];
    var samePolicy = prior && prior.policyVersion === String(p.version || "default");
    var sticky = samePolicy && !prior.invalidated
      ? routes.find(function (route) { return route.id === prior.routeId; })
      : null;
    if (sticky) return Object.assign({}, sticky, { reason: "workspace affinity" });
    var excluded = samePolicy && prior && prior.invalidated ? prior.routeId : null;
    var selected = routes.find(function (route) { return route.id !== excluded; }) || routes[0];
    var reason = prior && prior.invalidated
      ? String(prior.invalidated)
      : (prior && !samePolicy ? "policy changed" : "policy default");
    bag[workspace] = {
      policyVersion: String(p.version || "default"),
      routeId: selected.id,
      invalidated: null,
      selectedAt: Date.now(),
    };
    writeRoutes(bag);
    return Object.assign({}, selected, { reason: reason });
  }

  function invalidateRoute(workspaceId, reason) {
    var workspace = String(workspaceId || "default");
    var bag = readRoutes();
    if (!bag[workspace]) return false;
    bag[workspace].invalidated = String(reason || "recoverable failure");
    writeRoutes(bag);
    return true;
  }

  window.CW_ROUTE = {
    pick: pickRoute,
    invalidate: invalidateRoute,
    DEFAULT_POLICY: DEFAULT_POLICY,
    STORAGE_KEY: ROUTE_KEY,
  };

  window.CWResilient = {
    warm: warm,
    session: session,
    invalidate: invalidate,
    modelState: modelState,
    availability: availability,
    openSession: openSession,
    streamPrompt: streamPrompt,
    withRetry: withRetry,
    isTransient: isTransient,
    STALL_MS: STALL_MS,
  };
})();
