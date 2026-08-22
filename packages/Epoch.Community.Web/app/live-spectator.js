/**
 * Watching a Live Space, without being lied to.
 *
 * A spectator cannot verify anything for themselves. They did not choose the
 * allow-list, cannot see what was dropped, and have no way to tell a quiet
 * stream from a broken one. So the only thing this surface owes them is an
 * honest account of its own state: what arrived, in what order, what is
 * missing, and what was refused.
 *
 * That is why a gap is rendered rather than filled, and why a quarantined
 * envelope is counted and named rather than dropped silently. A stream that
 * hides its holes is worse than one that stalls — the reader believes they
 * have seen everything.
 *
 * The projection itself is the shared one every surface uses. This module
 * renders it and nothing more; it makes no ordering decisions of its own.
 */
(function () {
  "use strict";

  var sessionId = null;
  var projection = null;
  var catalog = null;
  var entries = [];
  var gaps = [];
  var note = "";
  var noteKind = "";

  /** Bounded so a long session cannot grow the page without limit. */
  var MAX_ENTRIES = 200;

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

  function runtime() {
    return window.CW_RUNTIME || {};
  }

  /**
   * Start watching. The projection is per-session on purpose: adopting
   * envelopes from a different session is `unverified-source`, not a merge.
   */
  function watch(id) {
    var api = runtime();
    if (!globalThis.CW_VALUE.isFunction(api.createLiveSpectatorProjection)) {
      note = "The runtime bundle does not provide a spectator projection.";
      noteKind = "unavailable";
      paint();
      return null;
    }
    sessionId = String(id || "").trim() || null;
    if (!sessionId) {
      note = "Watching needs a session id.";
      noteKind = "rejected";
      paint();
      return null;
    }
    projection = api.createLiveSpectatorProjection({ sessionId: sessionId });
    catalog = globalThis.CW_VALUE.isFunction(api.createLiveActionCatalog)
      ? api.createLiveActionCatalog({})
      : null;
    entries = [];
    gaps = [];
    note = "";
    noteKind = "";
    paint();
    return projection;
  }

  /**
   * Apply one released envelope and record what actually happened to it.
   *
   * Every outcome is kept, including the ones that produced nothing visible.
   * "Nothing arrived" and "three things arrived and were refused" look
   * identical in a feed that only renders successes.
   */
  function receive(envelope) {
    if (!projection) {
      note = "Nothing is being watched yet.";
      noteKind = "rejected";
      paint();
      return null;
    }
    var result = projection.apply(envelope);
    record(result, envelope);
    paint();
    return result;
  }

  function record(result, envelope) {
    if (result.kind === "gap") {
      gaps.push({ from: result.missingFrom, to: result.missingTo });
      return;
    }
    if (result.kind === "quarantined") {
      entries.push({ kind: "quarantined", reason: result.reason, sequence: null, actionId: null, path: null });
      trim();
      return;
    }
    if (result.kind === "duplicate") {
      // Kept, but not as content: a duplicate is evidence about the
      // transport, not a second thing the host did.
      entries.push({ kind: "duplicate", sequence: result.sequence, actionId: null, path: null, reason: null });
      trim();
      return;
    }
    var decision = catalog && globalThis.CW_VALUE.isFunction(projection.replayDecision)
      ? projection.replayDecision(envelope, catalog)
      : { kind: "apply" };
    if (decision.kind === "skip") {
      // The host's own view preferences are theirs. Replaying them would
      // reach into a spectator's page and change it on the host's behalf.
      entries.push({ kind: "skipped", sequence: result.sequence, actionId: envelope.actionId, path: null, reason: decision.reason });
      trim();
      return;
    }
    entries.push({
      kind: "applied",
      sequence: result.sequence,
      actionId: envelope.actionId,
      path: envelope.path || null,
      reason: null,
    });
    trim();
  }

  function trim() {
    if (entries.length > MAX_ENTRIES) entries = entries.slice(entries.length - MAX_ENTRIES);
  }

  /**
   * Late join, or recovery after a gap: adopt a checkpoint and then the
   * deltas after it. The checkpoint is the branch point the host recorded —
   * not a guess at where the reader was.
   */
  function resync(checkpoint, envelopes) {
    if (!projection) {
      note = "Nothing is being watched yet.";
      noteKind = "rejected";
      paint();
      return null;
    }
    var list = Array.isArray(envelopes) ? envelopes : [];
    var results = projection.resyncFrom(checkpoint, list);
    gaps = [];
    for (var i = 0; i < results.length; i++) record(results[i], list[i]);
    // Both halves matter: what just happened, and where the reader now is.
    // A resync notice without a position leaves them guessing whether it
    // worked, which is the question they resynced to answer.
    note = "Resynchronized from checkpoint " + esc(checkpoint && checkpoint.checkpointId) +
      ". " + sentence(stateOf());
    noteKind = "ok";
    paint();
    return results;
  }

  /* ── Painting ──────────────────────────────────────────────────────────── */

  function stateOf() {
    return projection ? projection.state() : { lastSequence: 0, appliedCount: 0, pendingCount: 0, quarantinedCount: 0 };
  }

  function entryHtml(entry) {
    var label = entry.kind === "applied"
      ? esc(entry.actionId) + (entry.path ? " · " + esc(entry.path) : "")
      : entry.kind === "skipped"
        ? esc(entry.actionId) + " — not replayed (" + esc(entry.reason) + ")"
        : entry.kind === "duplicate"
          ? "duplicate of #" + esc(entry.sequence)
          : "refused before release (" + esc(entry.reason) + ")";
    var seq = entry.sequence === null ? "··" : esc(entry.sequence);
    return '<li class="cw-spec-entry" data-kind="' + esc(entry.kind) + '">' +
      '<span class="cw-spec-seq">#' + seq + "</span>" +
      '<span class="cw-spec-label">' + label + "</span></li>";
  }

  /**
   * A gap is the one thing that must never be quiet. It is rendered as its own
   * region rather than an item in the list, because a reader scanning the feed
   * would scroll past a line and believe the stream was whole.
   */
  function gapHtml() {
    if (!gaps.length) return "";
    return gaps.map(function (gap) {
      return "Missing #" + esc(gap.from) + "–#" + esc(gap.to) + ". Resync from a checkpoint to recover.";
    }).join(" ");
  }

  function paint() {
    var host = $("[data-live-spectator]");
    if (!host) return;
    var state = stateOf();

    host.hidden = !projection && note === "";
    host.dataset.watching = projection ? "true" : "false";

    var status = host.querySelector("[data-spec-status]");
    if (status) {
      status.textContent = note !== "" ? note : sentence(state);
      status.dataset.kind = noteKind;
    }

    var facts = host.querySelector("[data-spec-facts]");
    if (facts) {
      facts.innerHTML = [
        ["session", sessionId || "—"],
        ["through", state.lastSequence],
        ["applied", state.appliedCount],
        ["waiting", state.pendingCount],
        ["refused", state.quarantinedCount],
      ].map(function (row) {
        return '<div class="cw-spec-fact"><dt>' + esc(row[0]) + "</dt><dd>" + esc(row[1]) + "</dd></div>";
      }).join("");
    }

    var gapHost = host.querySelector("[data-spec-gap]");
    if (gapHost) {
      var text = gapHtml();
      gapHost.textContent = text;
      gapHost.hidden = text === "";
    }

    var feed = host.querySelector("[data-spec-feed]");
    if (feed) feed.innerHTML = entries.map(entryHtml).join("");
  }

  function sentence(state) {
    if (!projection) return "Not watching a session.";
    if (gaps.length) return "Out of sync: the stream has a hole and is not showing you everything.";
    if (state.pendingCount > 0) {
      return "Holding " + state.pendingCount + " envelope(s) that arrived early; waiting for the ones before them.";
    }
    return "In sync through #" + state.lastSequence + ".";
  }

  function reset() {
    sessionId = null;
    projection = null;
    catalog = null;
    entries = [];
    gaps = [];
    note = "";
    noteKind = "";
    paint();
  }

  window.CW_LIVE_SPECTATOR = {
    watch: watch,
    receive: receive,
    resync: resync,
    paint: paint,
    reset: reset,
    sessionId: function () { return sessionId; },
    state: stateOf,
    entries: function () { return entries.slice(); },
    gaps: function () { return gaps.slice(); },
    note: function () { return { text: note, kind: noteKind }; },
  };

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", paint);
  } else {
    paint();
  }
})();
