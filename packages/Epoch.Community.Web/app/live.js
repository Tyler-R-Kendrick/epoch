/**
 * Hosting a Live Space from the board.
 *
 * The hard part of this surface is not the buttons. It is that a host has to
 * be able to answer "what are they seeing right now?" before they start, and
 * keep answering it while they run — because the failure mode is silent and
 * unrecoverable. A pixel stream leaks by showing; this leaks by publishing an
 * action whose arguments carry something the host forgot was in scope, to an
 * audience that has already copied it.
 *
 * So preflight is not a nicety here, it is the product: the same policy object
 * and the same sanitizer the publisher will use after start, run before start,
 * reported as the allow-list a spectator would actually receive. Nothing on
 * this panel is a preview of a different code path.
 *
 * Every mutation goes through the shared command bus and renders the receipt
 * that came back. This panel never decides anything — it asks, and it reports.
 */
(function () {
  "use strict";

  /**
   * The session this panel is about, and the last thing the bus said.
   *
   * Held here rather than on `window` so a generated interface revision cannot
   * reach in and rewrite what the safety chrome believes.
   */
  var sessionId = null;
  var snapshot = null;
  var preflight = null;
  var note = "";
  var noteKind = "";
  var busy = false;

  /** Lifecycle states in which released bytes are reaching an audience. */
  var RELEASING = ["live", "paused"];

  function $(selector) {
    return document.querySelector(selector);
  }

  function esc(value) {
    return String(value === null || value === undefined ? "" : value)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;");
  }

  function workspace() {
    return window.CW_WORKSPACE || null;
  }

  /**
   * Run one live command and keep whatever the bus said, refusal included.
   *
   * A refused command is an outcome to show, not an error to swallow: the host
   * pressed something and is owed the reason nothing happened.
   */
  async function run(kind, input, options) {
    var ws = workspace();
    if (!ws || !globalThis.CW_VALUE.isFunction(ws.execute)) {
      return refusal("The workspace runtime is not available in this page.");
    }
    busy = true;
    paint();
    try {
      var receipt = await ws.execute(kind, input || {}, options || {});
      return adopt(receipt);
    } catch (error) {
      return refusal((error && error.message) || String(error));
    } finally {
      busy = false;
      paint();
    }
  }

  function refusal(reason) {
    note = reason;
    noteKind = "rejected";
    paint();
    return null;
  }

  /**
   * Read a receipt without assuming it succeeded.
   *
   * With no deployment configured the bus answers `unavailable` with a reason
   * rather than throwing, and that answer is the one the panel must show. A
   * host who cannot tell "refused" from "nothing configured" will retry
   * forever against a deployment that was never there.
   */
  function adopt(receipt) {
    var data = receipt && receipt.data;
    if (isRefusal(data)) {
      note = String(data.reason || "This deployment cannot host Live Spaces.");
      noteKind = "unavailable";
      paint();
      return null;
    }
    note = "";
    noteKind = "";
    return data === undefined ? null : data;
  }

  function isRefusal(data) {
    return !!data && globalThis.CW_VALUE.isObject(data) && data.refused === "unavailable";
  }

  /* ── Commands ──────────────────────────────────────────────────────────── */

  async function show(id) {
    var next = await run("live.session.show", { sessionId: id });
    if (next) {
      sessionId = id;
      snapshot = next;
    }
    paint();
    return next;
  }

  async function runPreflight() {
    if (!sessionId) return refusal("Open a Live Session before running preflight.");
    var report = await run("live.session.preflight", { sessionId: sessionId });
    if (report) preflight = report;
    paint();
    return report;
  }

  /**
   * Irreversible steps carry confirmation explicitly.
   *
   * `confirmed` is set only from a real click, never inferred: a start is the
   * moment the allow-list stops being a draft, and an end is the moment the
   * log is closed. Both refuse by default everywhere else in the system, and
   * this surface does not get to be the exception.
   */
  async function lifecycle(command, confirmed) {
    if (!sessionId) return refusal("Open a Live Session first.");
    var next = await run("live.session." + command, { sessionId: sessionId }, { confirmed: confirmed === true });
    if (next) snapshot = next;
    // The policy that preflight reported may no longer be the policy in force.
    if (command === "start" || command === "end") preflight = null;
    paint();
    return next;
  }

  async function checkpoint() {
    if (!sessionId) return refusal("Open a Live Session first.");
    var mark = await run("live.presentation.checkpoint", { sessionId: sessionId });
    if (mark) {
      note = "Checkpoint recorded. Spectators can resync and fork from it.";
      noteKind = "ok";
    }
    paint();
    return mark;
  }

  /* ── Painting ──────────────────────────────────────────────────────────── */

  function lifecycleOf() {
    return snapshot && globalThis.CW_VALUE.isString(snapshot.lifecycle) ? snapshot.lifecycle : "none";
  }

  function releasing() {
    return RELEASING.indexOf(lifecycleOf()) !== -1;
  }

  /**
   * The standing label, in the vocabulary the rest of the product uses.
   *
   * "unavailable" is a first-class answer here, not an error state: it is what
   * a browser with no configured deployment honestly is.
   */
  function label() {
    if (noteKind === "unavailable") return "unavailable";
    if (!snapshot) return "no session";
    if (snapshot.health === "degraded") return "degraded";
    if (snapshot.sealed) return "sealed";
    return lifecycleOf();
  }

  function factsHtml() {
    if (!snapshot) return "";
    var rows = [
      ["session", snapshot.sessionId],
      ["space", snapshot.spaceId],
      ["view", snapshot.presentationViewRef],
      ["visibility", snapshot.visibility],
      ["security", snapshot.securityMode],
      // The digest is what consent was recorded against. Widening the policy
      // changes it, which is how a stale consent is detected rather than
      // assumed still valid.
      ["policy digest", String(snapshot.policyDigest || "").slice(0, 12)],
      ["released through", snapshot.releasedThroughSequence],
      ["joins", snapshot.joinLocked ? "locked" : "open"],
    ];
    return rows.map(function (row) {
      return '<div class="cw-live-fact"><dt>' + esc(row[0]) + "</dt><dd>" + esc(row[1]) + "</dd></div>";
    }).join("");
  }

  function listHtml(title, items, kind) {
    if (!items || !items.length) return "";
    return '<div class="cw-live-list" data-kind="' + esc(kind) + '">' +
      '<span class="cw-live-list-title">' + esc(title) + "</span><ul>" +
      items.map(function (item) { return "<li>" + esc(item) + "</li>"; }).join("") +
      "</ul></div>";
  }

  /**
   * Preflight, rendered as what an audience would receive.
   *
   * Denials come before allowances on purpose. A host reading this is checking
   * for the thing that should not be in it, and the answer to "is my key in
   * scope?" should not be below the fold.
   */
  function preflightHtml() {
    if (!preflight) return "";
    return listHtml("never published", preflight.immutableDenials, "denied") +
      listHtml("errors — start is refused", preflight.errors, "error") +
      listHtml("missing consent", preflight.missingConsentScopes, "error") +
      listHtml("warnings", preflight.warnings, "warn") +
      listHtml("published actions", preflight.allowedActionIds, "allowed") +
      listHtml("published paths", preflight.allowedPathPatterns, "allowed") +
      '<p class="cw-live-verdict" data-live-verdict data-allowed="' +
      (preflight.startAllowed === true ? "true" : "false") + '">' +
      (preflight.startAllowed === true
        ? "Preflight passes. Starting releases the above to this session's audience."
        : "Preflight fails. Start stays refused until every error above is cleared.") +
      "</p>";
  }

  /**
   * Controls the current state actually permits.
   *
   * A control that cannot work is absent rather than disabled-and-hopeful: a
   * greyed Start next to a failing preflight invites a second click, and the
   * honest statement is that there is nothing to click yet.
   */
  function controlsHtml() {
    if (noteKind === "unavailable") return "";
    var state = lifecycleOf();
    var controls = [];
    if (sessionId) controls.push(["live.preflight", "preflight", "Report exactly what an audience would receive"]);
    if (state === "draft") controls.push(["live.openLobby", "open lobby", "Let authorized participants join before release"]);
    if (state === "lobby" && preflight && preflight.startAllowed === true) {
      controls.push(["live.start", "start", "Begin releasing. Published bytes cannot be recalled"]);
    }
    if (state === "live") {
      controls.push(["live.pause", "pause", "Hold release at the current sequence"]);
      controls.push(["live.checkpoint", "checkpoint", "Record a point spectators can resync and fork from"]);
    }
    if (state === "paused") controls.push(["live.resume", "resume", "Resume releasing"]);
    if (releasing()) controls.push(["live.end", "end", "Stop release and close the log to new joins"]);

    return controls.map(function (control) {
      return '<button type="button" class="cw-live-act" data-action-id="' + esc(control[0]) + '"' +
        ' title="' + esc(control[2]) + '" aria-label="' + esc(control[2]) + '"' +
        (busy ? " disabled" : "") + ">" + esc(control[1]) + "</button>";
    }).join("");
  }

  /**
   * Fill the static hosts. This never authors chrome — the region, its heading
   * and its standing statement are in board.html and stay there.
   */
  function paint() {
    var host = $("[data-live-host]");
    if (!host) return;

    var visible = !!sessionId || noteKind === "unavailable" || note !== "";
    host.hidden = !visible;
    host.dataset.state = label();
    host.dataset.releasing = releasing() ? "true" : "false";

    // Scoped to the host, never document-wide. A bare `[data-live-state]`
    // lookup also matches <body>, which carries the same flag for CSS — and
    // writing textContent onto <body> erases the page.
    var state = host.querySelector("[data-live-state]");
    if (state) {
      state.textContent = note !== "" ? note : stateSentence();
      state.dataset.kind = noteKind || (releasing() ? "live" : "");
    }

    var facts = host.querySelector("[data-live-facts]");
    if (facts) facts.innerHTML = factsHtml();

    var report = host.querySelector("[data-live-preflight]");
    if (report) {
      report.innerHTML = preflightHtml();
      report.hidden = !preflight;
    }

    var controls = host.querySelector("[data-live-controls]");
    if (controls) controls.innerHTML = controlsHtml();

    // The badge is the part a host sees without looking at the panel. It says
    // only whether bytes are leaving, because that is the fact that matters
    // when attention is elsewhere.
    var badge = $("[data-live-badge]");
    if (badge) {
      badge.hidden = !releasing();
      badge.textContent = lifecycleOf() === "paused" ? "LIVE — PAUSED" : "LIVE — PUBLISHING";
    }
    // A distinct name from the panel's own hooks, so a document-wide lookup
    // for a panel element can never resolve to <body>.
    document.body.dataset.liveHosting = label();
  }

  function stateSentence() {
    if (!snapshot) return "No Live Session is open.";
    var state = lifecycleOf();
    if (state === "draft") return "Draft. Nothing is published and no one can join yet.";
    if (state === "lobby") return "Lobby open. Participants can join; nothing is published yet.";
    if (state === "live") return "Publishing. Released actions are public and cannot be recalled.";
    if (state === "paused") return "Paused at sequence " + esc(snapshot.releasedThroughSequence) + ". Nothing new is released.";
    if (state === "ended") return snapshot.sealed
      ? "Ended and sealed. The replay manifest is immutable."
      : "Ended. Seal it to freeze the replay manifest.";
    return "Lifecycle: " + esc(state) + ".";
  }

  function reset() {
    sessionId = null;
    snapshot = null;
    preflight = null;
    note = "";
    noteKind = "";
    busy = false;
    paint();
  }

  window.CW_LIVE = {
    show: show,
    preflight: runPreflight,
    openLobby: function () { return lifecycle("openLobby", false); },
    start: function (confirmed) { return lifecycle("start", confirmed === true); },
    pause: function () { return lifecycle("pause", false); },
    resume: function () { return lifecycle("resume", false); },
    end: function (confirmed) { return lifecycle("end", confirmed === true); },
    checkpoint: checkpoint,
    paint: paint,
    reset: reset,
    sessionId: function () { return sessionId; },
    snapshot: function () { return snapshot; },
    report: function () { return preflight; },
    label: function () { return label(); },
    releasing: function () { return releasing(); },
    note: function () { return { text: note, kind: noteKind }; },
  };

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", paint);
  } else {
    paint();
  }
})();
