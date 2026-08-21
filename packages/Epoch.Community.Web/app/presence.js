/**
 * Room presence for the Community Web board.
 *
 * Tracks who is active in each channel from declared per-member fixture
 * states plus real Core `channel.presence` events — never from the
 * `channel.count` subscriber fields, which are not presence.
 *
 * States rank for roster sorting: here/active/working → online, idle →
 * middle, away/offline → last, anything else after that.
 *
 *   note(channelId, principalId, state) → true when the active set changed
 *   ingest(events) → channelIds whose active count changed
 *   activeCount(channelId) / activeHandles(channelId)
 *   sortByPresence(members) — stable, fixture order kept within a rank
 *   onChange(fn) — notified after changes (targeted repaints)
 *   seedFromFixtures(D) — mark roster members declared "here" as active
 */
(function () {
  "use strict";

  /** channelId → { principalId: latestState } */
  var latest = {};
  var listeners = [];

  function presenceRank(state) {
    if (state === "here" || state === "active" || state === "working") return 0;
    if (state === "idle") return 1;
    if (state === "away" || state === "offline") return 2;
    return 3;
  }

  function sortByPresence(members) {
    return (members || []).slice().sort(function (a, b) {
      return presenceRank(a && a.state) - presenceRank(b && b.state);
    });
  }

  function isActive(state) {
    return state === "active" || state === "here";
  }

  function activeHandles(channelId) {
    var bag = latest[String(channelId || "")] || {};
    return Object.keys(bag).filter(function (principalId) { return isActive(bag[principalId]); });
  }

  function activeCount(channelId) {
    return activeHandles(channelId).length;
  }

  function notify() {
    listeners.slice().forEach(function (fn) {
      try {
        fn();
      } catch (err) {
        // A broken listener must not take presence ingest down with it.
        void err;
      }
    });
  }

  /** Upsert without notifying; true when the channel's active set changed. */
  function apply(channelId, principalId, state) {
    channelId = String(channelId || "");
    principalId = String(principalId || "");
    if (!channelId || !principalId) return false;
    var bag = latest[channelId] || (latest[channelId] = {});
    var was = isActive(bag[principalId]);
    bag[principalId] = state;
    return was !== isActive(state);
  }

  function note(channelId, principalId, state) {
    var changed = apply(channelId, principalId, state);
    if (changed) notify();
    return changed;
  }

  /** Accepts Core envelopes ({ type, body }) or bare channel.presence bodies. */
  function ingest(events) {
    var changed = [];
    (events || []).forEach(function (event) {
      var body = event && globalThis.CW_VALUE.isObject(event.body) ? event.body : event;
      if (!body) return;
      var channelId = String(body.channelId || "");
      if (!channelId) return;
      var before = activeCount(channelId);
      apply(channelId, body.principalId, body.state);
      if (activeCount(channelId) !== before && changed.indexOf(channelId) === -1) {
        changed.push(channelId);
      }
    });
    if (changed.length) notify();
    return changed;
  }

  function onChange(fn) {
    if (globalThis.CW_VALUE.isFunction(fn)) listeners.push(fn);
  }

  /**
   * Declared fixture presence: roster members with state "here" count as
   * active in every room. Subscriber counts (channel.count) are never read.
   */
  function seedFromFixtures(data) {
    data = data || {};
    var members = data.members || [];
    (data.channels || []).forEach(function (channel) {
      var channelId = String(channel && (channel.id || channel.label) || "");
      if (!channelId) return;
      members.forEach(function (member) {
        if (member && member.state === "here" && member.handle) {
          apply(channelId, member.handle, "here");
        }
      });
    });
  }

  window.CW_PRESENCE = {
    presenceRank: presenceRank,
    sortByPresence: sortByPresence,
    note: note,
    ingest: ingest,
    activeCount: activeCount,
    activeHandles: activeHandles,
    onChange: onChange,
    seedFromFixtures: seedFromFixtures,
  };
})();
