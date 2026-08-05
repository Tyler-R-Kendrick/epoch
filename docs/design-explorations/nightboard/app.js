/**
 * The driver.
 *
 * One navigation model, three input methods that are peers rather than a
 * primary and two fallbacks:
 *
 *   keyboard   ←→ column, ↑↓ entry, Enter descend, : command, / filter, v view
 *   pointer    every entry, breadcrumb and view chip is a real button
 *   touch      columns scroll-snap horizontally; entries are ≥32px targets
 *
 * The command line is not a separate mode that replaces the columns — it moves
 * the same cursor. Typing `cd ideas` and clicking `ideas` end in exactly the
 * same place, because both call navigate().
 */
(function () {
  "use strict";

  var $ = function (s, r) { return (r || document).querySelector(s); };
  var D = window.NB_DATA;
  var MAP = window.NB_MAP;

  /**
   * A terminal tab is an isolated virtual worktree: its own path, preview,
   * folds, transcript, history, detail pane, attachments and editor focus.
   * New tabs start at the default home path — never inherit the previous tab's
   * scope. Shared board state (merged posts, live stream, furniture) stays
   * global so a post lands once, not once per tab.
   */
  var lineSeq = 1;
  function nextLineId(prefix) {
    lineSeq += 1;
    return (prefix || "L") + lineSeq;
  }

  /** Default landing path for a brand-new workspace tab. */
  var DEFAULT_WORKSPACE_PATH = "/projects/community/channels/general";

  function makeSession(path) {
    return {
      path: path || DEFAULT_WORKSPACE_PATH,
      cursor: 0,
      focus: 1,
      sort: "hot",
      filter: "",
      feedQuery: "",
      feedView: "hot",
      feedPinnedViews: [],
      prev: "/",
      folded: {},
      votes: {},
      reactions: {},
      treeOpen: {},
      history: [],
      histIndex: -1,
      lines: [],
      openTools: {},
      busy: false,
      cliDraft: "",
      // Pane/editor context — frozen with the tab so workspaces stay isolated.
      detailOpen: true,
      homeFeed: "following",
      homeCursor: 0,
      threadFocus: null,
      attachments: [],
      editorPath: null,
      editorFocused: false,
    };
  }

  var SESSION_FIELDS = [
    "path", "cursor", "focus", "sort", "filter", "feedQuery", "feedView", "feedPinnedViews", "prev",
    "folded", "votes", "reactions", "treeOpen",
    "history", "histIndex", "lines", "openTools", "busy",
    "detailOpen", "homeFeed", "homeCursor", "threadFocus",
  ];

  var state = {
    path: "/projects/community/channels/general",
    cursor: 0,
    focus: 1,
    sort: "hot",
    filter: "",
    // Lucene-style feed query / named view projection.
    feedQuery: "",
    feedView: "hot",
    feedPinnedViews: [],
    feedAddOpen: false,
    feedQueryError: null,
    merged: [],
    pending: [],
    nextId: 1,
    live: true,
    cliOpen: false,
    intelOpen: false,
    helpOpen: false,
    helpCtx: null,
    completion: null,
    candIndex: 0,
    // Esc closes the suggestion combobox without clearing the draft; typing
    // clears this so the catalogue can reopen for the next fragment.
    menuDismissed: false,
    history: [],
    histIndex: -1,
    lines: [],
    openTools: {},
    // When true, session transcript (.cn-blade-out) is the active pane —
    // used after inconclusive prompts so the turn is visible to iterate on.
    sessionOutFocus: false,
    votes: {},
    // reactions[postId] = { counts: { "+1": n }, mine: { "+1": true } }
    reactions: {},
    reactPick: null,
    // Discord spoilers revealed this session: spoilers[innerText] = true
    spoilers: {},
    // Armed reply target — cleared on send or when navigating away from its channel.
    replyTo: null,
    // Session-created channels / projects (sitemap reads boardOverlay).
    boardOverlay: { channels: [], projects: [], projectChannels: {} },
    treeOpen: {},
    prev: "/",
    ai: true,
    busy: false,
    folded: {},
    panes: null,
    sessions: [makeSession("/projects/community/channels/general")],
    activeSession: 0,
    // Speech-to-text: mic always painted; hotkeys enable only when ready.
    speech: {
      supported: !!(window.NB_SPEECH && window.NB_SPEECH.isSupported()),
      // absent | unavailable | downloadable | downloading | available
      availability: "absent",
      ready: false,
      backend: "none",
      lang: "en-US",
      reason: null,
      listening: false,
      mode: null,
      // Voice Access-style intent: default | dictation | commands
      intent: "default",
      interim: "",
      error: null,
    },
    // Discord-parity channel voice (WebRTC mesh). See voice.js.
    voice: {
      supported: !!(window.NB_VOICE && window.NB_VOICE.isSupported()),
      joined: false,
      channelId: null,
      channelPath: null,
      muted: false,
      deafened: false,
      inputMode: "vad",
      speaking: false,
      peers: {},
      peerCount: 0,
      latencyMs: null,
      handle: null,
      error: null,
    },
    // Teams-style Activity: ids the session has marked read.
    notifRead: loadNotifRead(),
    // Home feed (Following pane): which toggle is active + read receipt map.
    homeFeed: "following",
    homeFeedRead: loadHomeFeedRead(),
    // Cursor into the home feed list (Following / announcements / …).
    homeCursor: 0,
    // Announcement ids the user collapsed this session (default: expanded).
    homeAnnCollapsed: {},
    // Person pane on /dms/<handle>: messages (default) | profile.
    personPane: "messages",
    personPeer: null,
    // Prompt attachments for chat context (cleared on send).
    attachments: [],
    attachDrop: false,
    // Terminal file editor (detail pane for files).
    editor: {
      active: null,
      buffers: {},
      focused: false,
      // Pointer drag selection
      dragging: false,
      // Touch swipe scroll
      touchY: null,
      touchScroll: 0,
    },
    // Detail pane is optional — user can close it with × and reopen by
    // selecting a file or pressing Enter / → on a leaf.
    detailOpen: true,
    // When set to a post id, detail shows that message's thread only
    // (not the channel's top-level feed). Cleared by back / Esc / nav browse.
    threadFocus: null,
  };
  state.panes = loadPanes();

  function loadNotifRead() {
    try {
      var raw = window.localStorage.getItem("nb-notif-read");
      if (!raw) return {};
      var got = JSON.parse(raw);
      return got && typeof got === "object" ? got : {};
    } catch {
      return {};
    }
  }

  function saveNotifRead() {
    try { window.localStorage.setItem("nb-notif-read", JSON.stringify(state.notifRead || {})); } catch { /* private */ }
  }

  function loadHomeFeedRead() {
    try {
      var raw = window.localStorage.getItem("nb-home-feed-read");
      if (!raw) return {};
      var got = JSON.parse(raw);
      return got && typeof got === "object" ? got : {};
    } catch {
      return {};
    }
  }

  function saveHomeFeedRead() {
    try {
      window.localStorage.setItem("nb-home-feed-read", JSON.stringify(state.homeFeedRead || {}));
    } catch { /* private */ }
  }

  function markHomeFeedRead(id) {
    if (!id) return;
    state.homeFeedRead = state.homeFeedRead || {};
    if (state.homeFeedRead[id]) return;
    state.homeFeedRead[id] = true;
    saveHomeFeedRead();
  }

  function setHomeFeed(view, opts) {
    opts = opts || {};
    var allowed = { following: 1, announcements: 1, featured: 1, creators: 1 };
    var next = allowed[view] ? view : "following";
    var changed = state.homeFeed !== next;
    state.homeFeed = next;
    state.detailOpen = false;
    if (changed) state.homeCursor = 0;
    if (!opts.noRender) render(true);
    // After morph layout: bring tabs into the visible blade strip.
    requestAnimationFrame(revealHomeFeedTabs);
    if (!opts.silent) status("home · " + next);
    return true;
  }

  /** Collapse/expand a home announcement (session-only; default expanded). */
  function toggleAnnCollapsed(id) {
    if (!id) return false;
    state.homeAnnCollapsed = state.homeAnnCollapsed || {};
    if (state.homeAnnCollapsed[id]) delete state.homeAnnCollapsed[id];
    else state.homeAnnCollapsed[id] = true;
    render(true);
    return true;
  }

  /**
   * On narrow layouts the nav+detail blades scroll horizontally. Home feed
   * tabs live in the detail blade — bring every tab into the visible strip
   * so a real mouse/touch hit can activate it (Playwright auto-scroll hid this).
   */
  function revealHomeFeedTabs() {
    var blades = document.querySelector(".cn-blades");
    if (!blades) return;
    var tabs = blades.querySelector(".cn-home-tabs");
    var detail = blades.querySelector('.cn-blade[data-blade-kind="detail"]');
    var target = tabs || detail;
    if (!target) return;
    var br = blades.getBoundingClientRect();
    var tr = target.getBoundingClientRect();
    var pad = 10;
    if (tr.right > br.right - pad) {
      blades.scrollLeft += tr.right - br.right + pad;
    }
    if (tr.left < br.left + pad) {
      blades.scrollLeft -= br.left - tr.left + pad;
    }
    // Second pass: individual tabs (wrapped rows / unread badges).
    var nodes = blades.querySelectorAll(".cn-home-tab");
    for (var i = 0; i < nodes.length; i++) {
      var r = nodes[i].getBoundingClientRect();
      if (r.right > br.right - pad) blades.scrollLeft += r.right - br.right + pad;
      if (r.left < br.left + pad) blades.scrollLeft -= br.left - r.left + pad;
      br = blades.getBoundingClientRect();
    }
  }

  function homeFeedUnreadCounts() {
    if (window.NB_MAP && window.NB_MAP.homeFeedUnreadCounts) {
      return window.NB_MAP.homeFeedUnreadCounts(state.merged, state.homeFeedRead);
    }
    return {};
  }

  /**
   * Toggle the person detail pane between messages (default) and profile.
   * Scoped to the current DM peer — switching peers resets to messages.
   */
  function setPersonPane(pane, opts) {
    opts = opts || {};
    var next = pane === "profile" ? "profile" : "messages";
    state.personPane = next;
    if (!opts.noRender) render(true);
    if (!opts.silent) {
      var peer = currentDmPeer();
      status(peer
        ? ("@" + peer + " · " + next)
        : ("person · " + next));
    }
    return true;
  }

  function currentDmPeer() {
    var parts = MAP.split(state.path);
    if (parts[0] === "dms" && parts[1]) return parts[1];
    return state.personPeer || null;
  }

  function syncPersonPanePeer(peer) {
    peer = peer ? String(peer).replace(/^@/, "").toLowerCase() : null;
    if (peer && state.personPeer && state.personPeer !== peer) {
      state.personPane = "messages";
    }
    if (peer) state.personPeer = peer;
  }

  function markNotificationRead(id) {
    if (!id) return;
    state.notifRead = state.notifRead || {};
    state.notifRead[id] = true;
    saveNotifRead();
    paintActivityBell();
  }

  function unreadActivityCount() {
    if (window.NB_MAP && window.NB_MAP.unreadNotificationCount) {
      return window.NB_MAP.unreadNotificationCount(state.notifRead);
    }
    return (window.NB_DATA.notifications || []).filter(function (n) {
      return n.unread && !(state.notifRead && state.notifRead[n.id]);
    }).length;
  }

  function browserNotifySupported() {
    return !!(window.NB_NOTIFY && window.NB_NOTIFY.isSupported());
  }

  function browserNotifyPermission() {
    return window.NB_NOTIFY ? window.NB_NOTIFY.permission() : "unsupported";
  }

  function activityItems() {
    if (window.NB_MAP && window.NB_MAP.allNotifications) {
      return window.NB_MAP.allNotifications(state.notifRead);
    }
    return (window.NB_DATA.notifications || []).map(function (n) {
      var copy = Object.assign({}, n);
      if (state.notifRead && state.notifRead[n.id]) copy.unread = false;
      return copy;
    });
  }

  function onBrowserNotificationClick(data) {
    // Focus already requested by notify.js; open the source in this tab.
    if (data && data.id) openNotification(data.id);
    else if (data && data.where) navigate(data.where, { keepCli: true });
    else openActivity("all");
  }

  /** Push unread Activity items through the browser Notification API. */
  function deliverBrowserNotifications(opts) {
    opts = opts || {};
    if (!browserNotifySupported()) return 0;
    if (browserNotifyPermission() !== "granted") return 0;
    var items = activityItems().filter(function (n) { return n.unread; });
    if (!window.NB_NOTIFY) return 0;
    var shown = window.NB_NOTIFY.deliverUnread(items, {
      force: !!opts.force,
      onClick: onBrowserNotificationClick,
    });
    if (shown > 0 && !opts.silent) {
      status("sent " + shown + " browser " + (shown === 1 ? "alert" : "alerts"));
    }
    return shown;
  }

  /**
   * Deliver a single Activity item (e.g. a live-arriving match).
   * No-ops unless permission is already granted.
   */
  function deliverBrowserNotification(item) {
    if (!item || !browserNotifySupported()) return null;
    if (browserNotifyPermission() !== "granted") return null;
    if (!window.NB_NOTIFY) return null;
    // Treat as unread for delivery purposes.
    var copy = Object.assign({}, item, { unread: true });
    return window.NB_NOTIFY.deliver(copy, { onClick: onBrowserNotificationClick });
  }

  /**
   * Emit a custom hook event. Matching enabled hooks with notify=true produce
   * Activity items (via NB_HOOKS.fired) and browser notifications when granted.
   * Returns the Activity items that fired.
   */
  function broadcastHookEvent(eventName, payload, opts) {
    if (!window.NB_HOOKS || !window.NB_HOOKS.emit) return [];
    opts = opts || {};
    var items = window.NB_HOOKS.emit(eventName, payload || {}, {
      at: opts.at || clock(),
      identity: identity,
    });
    items.forEach(function (item) {
      deliverBrowserNotification(item);
    });
    if (items.length) {
      paintActivityBell();
      // Refresh Activity blade if the user is already looking at it.
      if (String(state.path || "").indexOf("/notifications") === 0) render(true);
    }
    return items;
  }

  /**
   * /hooks command surface:
   *   (empty)|list          — list hooks
   *   events                — event catalog
   *   add <event> [match]   — subscribe
   *   rm|remove <id>        — unsubscribe
   *   on|off <id>           — enable / disable
   *   test [event]          — fire a sample event through matching hooks
   *   open|view             — /notifications/hooks
   *   reset                 — restore fixture defaults
   */
  function runHooksCommand(arg) {
    if (!window.NB_HOOKS) return "hooks: module not loaded";
    var H = window.NB_HOOKS;
    var raw = String(arg || "").trim();
    var parts = raw ? raw.split(/\s+/) : [];
    var cmd = (parts[0] || "list").toLowerCase();
    var rest = parts.slice(1);

    if (cmd === "open" || cmd === "view" || cmd === "activity") {
      openActivity("hooks");
      return "/hooks → " + state.path + " · " + (H.summarize().fired) + " fired";
    }
    if (cmd === "events" || cmd === "catalog") {
      return "events: " + H.events().map(function (e) {
        return e.id + " (" + e.label + ")";
      }).join(" · ");
    }
    if (cmd === "list" || cmd === "ls" || cmd === "") {
      var all = H.list();
      if (!all.length) return "hooks: none — /hooks add <event> [match]";
      var sum = H.summarize();
      return "hooks (" + sum.enabled + "/" + sum.total + " on · " + sum.fired + " fired): " +
        all.map(function (h) {
          return (h.enabled ? "●" : "○") + " " + h.id + " " + h.event +
            (h.match ? " [" + h.match + "]" : "") +
            (h.notify ? "" : " (silent)") +
            " — " + (h.label || "");
        }).join(" · ");
    }
    if (cmd === "add" || cmd === "subscribe" || cmd === "new") {
      var event = rest[0];
      if (!event) {
        return "usage: /hooks add <event> [match…] — events: " +
          H.events().map(function (e) { return e.id; }).join(", ");
      }
      var match = rest.slice(1).join(" ");
      var label = H.eventLabel(event) + (match ? " · " + match : "");
      var added = H.add({ event: event, match: match, label: label, notify: true, enabled: true });
      if (!added.ok) return "hooks add: " + (added.error || "failed");
      return "hook " + (added.replaced ? "updated" : "added") + ": " + added.hook.id +
        " · " + added.hook.event +
        (added.hook.match ? " [" + added.hook.match + "]" : "") +
        " → notifies Activity";
    }
    if (cmd === "rm" || cmd === "remove" || cmd === "del" || cmd === "delete") {
      var rid = rest[0];
      if (!rid) return "usage: /hooks rm <id>";
      var removed = H.remove(rid);
      return removed.ok ? "removed hook " + rid : "hooks rm: " + (removed.error || "failed");
    }
    if (cmd === "on" || cmd === "enable") {
      var onId = rest[0];
      if (!onId) return "usage: /hooks on <id>";
      var onRes = H.enable(onId, true);
      return onRes.ok ? "hook on: " + onId : "hooks on: " + (onRes.error || "failed");
    }
    if (cmd === "off" || cmd === "disable") {
      var offId = rest[0];
      if (!offId) return "usage: /hooks off <id>";
      var offRes = H.enable(offId, false);
      return offRes.ok ? "hook off: " + offId : "hooks off: " + (offRes.error || "failed");
    }
    if (cmd === "test" || cmd === "fire" || cmd === "emit") {
      var tev = rest[0] || "post.created";
      var samplePayload = {
        id: "hook-test-" + Date.now(),
        who: (identity && identity.handle) || "you",
        channel: "bugs",
        subject: "Hook test",
        body: "cache install path — hook test @" + ((identity && identity.handle) || "you"),
        key: "+1",
        handle: (identity && identity.handle) || "you",
        kind: identity ? identity.kind : "guest",
        spaceId: identity && identity.spaceId,
        spaceName: identity && identity.spaceName,
      };
      // Ensure a temporary hook exists for the event if none match.
      var matched = H.match(tev, samplePayload);
      if (!matched.length && tev !== "query.matched") {
        H.add({
          id: "hook-test-tmp",
          event: tev,
          match: "",
          label: "Test " + tev,
          notify: true,
          enabled: true,
        });
      }
      var fired = broadcastHookEvent(tev, samplePayload);
      if (tev === "post.created") {
        // Also exercise query.matched path when cache talk hooks exist.
        broadcastHookEvent("post.created", samplePayload);
      }
      openActivity("hooks");
      return fired.length
        ? "fired " + fired.length + " hook " + (fired.length === 1 ? "notification" : "notifications") +
          " for " + tev + " → /notifications/hooks"
        : "no hooks matched " + tev + " — /hooks add " + tev + "  or /hooks events";
    }
    if (cmd === "reset") {
      H.reset();
      return "hooks reset to defaults · " + H.summarize().total + " hooks";
    }
    return "/hooks: list | events | add <event> [match] | rm <id> | on|off <id> | test [event] | open | reset";
  }

  function requestBrowserNotifications() {
    if (!browserNotifySupported()) {
      status("browser notifications not available here");
      paintActivityBell();
      return Promise.resolve("unsupported");
    }
    return window.NB_NOTIFY.requestPermission().then(function (p) {
      paintActivityBell();
      if (p === "granted") {
        var n = deliverBrowserNotifications({ silent: true });
        status(n > 0
          ? "browser alerts on — sent " + n + " pending"
          : "browser alerts on — mentions and subscriptions will notify you");
      } else if (p === "denied") {
        status("browser alerts blocked — enable them in the browser site settings");
      } else {
        status("browser alerts not enabled");
      }
      return p;
    });
  }

  function paintActivityBell() {
    var bell = $("[data-activity-bell]");
    if (!bell) return;
    var n = unreadActivityCount();
    var perm = browserNotifyPermission();
    bell.dataset.unread = n > 0 ? "true" : "false";
    bell.dataset.browserPerm = perm;
    var label = n > 0
      ? "Activity — " + n + " unread notifications"
      : "Activity — notifications";
    if (window.NB_NOTIFY) label += " · " + window.NB_NOTIFY.permissionLabel(perm);
    bell.setAttribute("aria-label", label);
    bell.title = label;
    var badge = bell.querySelector("[data-activity-badge]");
    if (badge) {
      if (n > 0) {
        badge.hidden = false;
        badge.textContent = n > 99 ? "99+" : String(n);
      } else {
        badge.hidden = true;
        badge.textContent = "0";
      }
    }
    // Enable / denied control beside the bell.
    var permBtn = $("[data-activity-perm]");
    if (permBtn) {
      if (!browserNotifySupported()) {
        permBtn.hidden = true;
      } else if (perm === "granted") {
        permBtn.hidden = true;
        permBtn.dataset.state = "granted";
      } else if (perm === "denied") {
        permBtn.hidden = false;
        permBtn.dataset.state = "denied";
        permBtn.textContent = "Alerts blocked";
        permBtn.title = "Browser blocked notifications — change site settings to allow alerts";
      } else {
        permBtn.hidden = false;
        permBtn.dataset.state = "default";
        permBtn.textContent = "Enable alerts";
        permBtn.title = "Enable browser notifications for mentions and subscriptions";
      }
    }
  }

  function openActivity(filter) {
    var dest = "/notifications/" + (filter || "all");
    navigate(dest, { keepCli: true });
    status("activity · " + (filter || "all") +
      (browserNotifySupported()
        ? " · " + (window.NB_NOTIFY ? window.NB_NOTIFY.permissionLabel() : "")
        : ""));
  }

  function openNotification(id) {
    var n = window.NB_MAP && window.NB_MAP.findNotification
      ? window.NB_MAP.findNotification(id, state.notifRead)
      : (window.NB_DATA.notifications || []).filter(function (x) { return x.id === id; })[0];
    if (!n) return status("notification not found");
    markNotificationRead(n.id);
    // Keep OS tray honest: mark as pushed so it is not re-delivered.
    if (window.NB_NOTIFY) window.NB_NOTIFY.markPushed(n.id);
    if (n.where && navigate(n.where, { keepCli: true })) {
      status("opened " + (n.whereLabel || n.where));
      return true;
    }
    status("could not open " + (n.where || id));
    return false;
  }

  // themeIndex lives here so restore can re-apply the saved theme at boot.
  var themeIndex = 0;
  var cliValue = "";
  // Base prompt text when a dictation session started; finals append here.
  var speechBase = "";
  var speechEngine = null;
  var pttHeld = false;
  var voiceEngine = null;
  var voicePttHeld = false;

  function speechSupported() {
    return !!(window.NB_SPEECH && window.NB_SPEECH.isSupported());
  }

  function speechReady() {
    return !!(state.speech && state.speech.ready);
  }

  function applySpeechAvailability(snap) {
    snap = snap || {};
    state.speech.availability = snap.state || "unavailable";
    state.speech.ready = !!(window.NB_SPEECH && window.NB_SPEECH.isReady
      ? window.NB_SPEECH.isReady(snap)
      : snap.state === "available");
    state.speech.backend = snap.backend || "none";
    state.speech.lang = snap.lang || state.speech.lang || "en-US";
    state.speech.reason = snap.reason || null;
    state.speech.supported = speechSupported();
  }

  function speechNotReadyReason() {
    if (state.speech && state.speech.reason) return state.speech.reason;
    if (state.speech && state.speech.availability === "downloading") {
      return "downloading on-device speech model — voice stays off until ready";
    }
    if (state.speech && state.speech.availability === "downloadable") {
      return "speech model needs one download — click the mic to fetch it";
    }
    return "on-device speech not ready in this browser";
  }

  function voiceSupported() {
    return !!(window.NB_VOICE && window.NB_VOICE.isSupported());
  }

  /** When channel voice is in PTT mode, bare ` belongs to transmit — not STT. */
  function voiceClaimsPtt() {
    return !!(state.voice && state.voice.joined && state.voice.inputMode === "ptt");
  }

  function findVoiceChannel(query) {
    var chans = (window.NB_DATA && window.NB_DATA.channels) || [];
    var needle = String(query || "").trim().toLowerCase();
    if (!needle) {
      var m = /\/channels\/([^/]+)/.exec(state.path || "");
      if (m) needle = m[1].toLowerCase();
    }
    var voiceOnly = chans.filter(function (c) {
      return !!(c.voice || c.kind === "voice");
    });
    if (!needle) return voiceOnly[0] || null;
    for (var i = 0; i < voiceOnly.length; i++) {
      var c = voiceOnly[i];
      if (c.id === needle || c.label === needle) return c;
    }
    return null;
  }

  function voiceChannelPath(chan) {
    if (!chan) return null;
    if (state.voice && state.voice.channelPath && state.voice.channelId === chan.id) {
      return state.voice.channelPath;
    }
    var label = chan.label || chan.id;
    return "/projects/community/channels/" + label;
  }

  function paintVoiceLight(st) {
    var dock = document.querySelector(".cn-voice-dock");
    if (!dock) return false;
    var rtt = dock.querySelector(".cn-voice-rtt");
    if (rtt) rtt.textContent = st.latencyMs != null ? (st.latencyMs + " ms") : "…";
    var self = dock.querySelector(".cn-voice-user[data-self=true]");
    if (self) {
      self.dataset.speaking = st.speaking ? "true" : "false";
      self.dataset.muted = st.muted ? "true" : "false";
      self.textContent = (st.handle || "you") + (st.muted ? " · mute" : "") +
        (st.speaking ? " · talk" : "");
    }
    var mode = dock.querySelector(".cn-voice-mode-tag");
    if (mode) mode.textContent = st.inputMode || "vad";
    return true;
  }

  function onVoiceState(st) {
    var prev = state.voice || {};
    var structural =
      !!prev.joined !== !!st.joined ||
      prev.channelId !== st.channelId ||
      !!prev.muted !== !!st.muted ||
      !!prev.deafened !== !!st.deafened ||
      prev.inputMode !== st.inputMode ||
      (prev.peerCount || 0) !== (st.peerCount || 0);
    state.voice = {
      supported: !!st.supported,
      joined: !!st.joined,
      channelId: st.channelId || null,
      channelPath: st.channelPath || null,
      muted: !!st.muted,
      deafened: !!st.deafened,
      inputMode: st.inputMode === "ptt" ? "ptt" : "vad",
      speaking: !!st.speaking,
      peers: st.peers || {},
      peerCount: st.peerCount || 0,
      latencyMs: st.latencyMs != null ? st.latencyMs : null,
      handle: st.handle || null,
      error: st.error || null,
    };
    if (st.error) status(st.error);
    if (structural || !paintVoiceLight(state.voice)) {
      render(true);
    }
  }

  function ensureVoiceEngine() {
    if (!voiceSupported()) return null;
    if (voiceEngine) return voiceEngine;
    voiceEngine = window.NB_VOICE.create({
      onState: onVoiceState,
    });
    return voiceEngine;
  }

  function joinVoice(channelId, channelPath) {
    if (!voiceSupported()) {
      status("channel voice not available in this browser");
      return Promise.resolve({ ok: false, error: "unsupported" });
    }
    var chan = null;
    if (channelId) {
      chan = findVoiceChannel(channelId);
      if (!chan) chan = { id: channelId, label: channelId, voice: true };
    } else {
      chan = findVoiceChannel(null);
    }
    if (!chan) {
      status("no voice channel here — try /voice join lounge");
      return Promise.resolve({ ok: false, error: "no channel" });
    }
    var path = channelPath || voiceChannelPath(chan);
    var eng = ensureVoiceEngine();
    if (!eng) return Promise.resolve({ ok: false, error: "no engine" });
    return eng.join(chan.id, path).then(function (res) {
      if (res && res.ok) {
        status("joined voice/" + (chan.label || chan.id) +
          " · " + (state.voice.inputMode || "vad") +
          (state.voice.inputMode === "ptt" ? " (hold ` to talk)" : ""));
        if (path && state.path !== path) navigate(path, { keepCli: true });
        else render(true);
      } else {
        status((res && res.error) || "could not join voice");
      }
      return res;
    });
  }

  function leaveVoice() {
    if (!voiceEngine) {
      state.voice.joined = false;
      render(true);
      return Promise.resolve({ ok: true });
    }
    return voiceEngine.leave().then(function (res) {
      voicePttHeld = false;
      status("left voice");
      render(true);
      return res;
    });
  }

  function toggleVoiceMute() {
    var eng = ensureVoiceEngine();
    if (!eng || !state.voice.joined) {
      status("not in voice — /voice join");
      return false;
    }
    var on = eng.toggleMute();
    status(on ? "muted" : "unmuted");
    return on;
  }

  function toggleVoiceDeafen() {
    var eng = ensureVoiceEngine();
    if (!eng || !state.voice.joined) {
      status("not in voice — /voice join");
      return false;
    }
    var on = eng.toggleDeafen();
    status(on ? "deafened" : "undeafened");
    return on;
  }

  function setVoiceInputMode(mode) {
    var eng = ensureVoiceEngine();
    if (!eng || !state.voice.joined) {
      status("not in voice — /voice join");
      return null;
    }
    var next = eng.setInputMode(mode);
    status("voice input: " + next +
      (next === "ptt" ? " — hold ` to transmit" : " — speaks when you talk"));
    return next;
  }

  function runVoiceCommand(arg) {
    var parts = String(arg || "").trim().split(/\s+/);
    var sub = (parts[0] || "status").toLowerCase();
    var rest = parts.slice(1).join(" ");
    if (sub === "join") {
      return joinVoice(rest || null, null).then(function (res) {
        return (res && res.ok)
          ? "voice: joined " + (state.voice.channelId || rest || "room")
          : "voice: " + ((res && res.error) || "join failed");
      });
    }
    if (sub === "leave" || sub === "disconnect" || sub === "hangup") {
      return leaveVoice().then(function () { return "voice: left"; });
    }
    if (sub === "mute") {
      toggleVoiceMute();
      return Promise.resolve("voice: " + (state.voice.muted ? "muted" : "unmuted"));
    }
    if (sub === "deafen" || sub === "deaf") {
      toggleVoiceDeafen();
      return Promise.resolve("voice: " + (state.voice.deafened ? "deafened" : "undeafened"));
    }
    if (sub === "ptt" || sub === "push-to-talk") {
      setVoiceInputMode("ptt");
      return Promise.resolve("voice: ptt");
    }
    if (sub === "vad" || sub === "activity") {
      setVoiceInputMode("vad");
      return Promise.resolve("voice: vad");
    }
    if (sub === "status" || sub === "who") {
      if (!state.voice.joined) {
        return Promise.resolve("voice: not connected — /voice join lounge|standup");
      }
      return Promise.resolve(
        "voice/" + state.voice.channelId +
        " · " + (state.voice.inputMode || "vad") +
        (state.voice.muted ? " · muted" : "") +
        (state.voice.deafened ? " · deafened" : "") +
        (state.voice.latencyMs != null ? " · " + state.voice.latencyMs + " ms rtt" : "") +
        " · peers " + (state.voice.peerCount || 0)
      );
    }
    return Promise.resolve("/voice: join [channel] | leave | mute | deafen | ptt | vad | status");
  }

  function appendSpeechPhrase(phrase) {
    var p = String(phrase || "").trim();
    if (!p) return;
    var base = speechBase;
    if (base && !/\s$/.test(base)) base += " ";
    speechBase = base + p;
    cliValue = speechBase;
    var input = $("[data-cli]");
    if (input) input.value = cliValue;
    recompute();
    paintGhost();
    // Light render so the value sticks if morph rewrites; keepCli avoids focus fight.
    render(true);
  }

  function clearSpeechPrompt() {
    speechBase = "";
    cliValue = "";
    state.speech.interim = "";
    var input = $("[data-cli]");
    if (input) input.value = "";
    recompute();
    paintGhost();
    render(true);
  }

  function submitSpeechPrompt() {
    var text = cliValue || ($("[data-cli]") && $("[data-cli]").value) || "";
    closeIntel();
    if (!String(text || "").trim() && !(state.attachments && state.attachments.length)) {
      status("nothing to send");
      return;
    }
    speechBase = "";
    cliValue = "";
    var input = $("[data-cli]");
    if (input) input.value = "";
    recompute();
    if (window.NB_COMPLETE.isSlash(text)) {
      render(true);
      return runSlash(text);
    }
    var cctx = composeContext();
    var trimmed = String(text || "").trim();
    if (trimmed && !isCommand(text) &&
        (cctx.kind === "reply" || cctx.kind === "post" || cctx.kind === "dm")) {
      if (!requireParticipation("post")) {
        cliValue = text;
        if (input) input.value = text;
        speechBase = text;
        return render(true);
      }
      publishCompose(trimmed, cctx);
      return;
    }
    if (state.ai && (!trimmed || !isCommand(text))) {
      render(true);
      return ask(text);
    }
    return run(text);
  }

  function setSpeechIntent(mode) {
    var next = window.NB_SPEECH && window.NB_SPEECH.normalizeIntent
      ? window.NB_SPEECH.normalizeIntent(mode)
      : "default";
    state.speech.intent = next;
    render(true);
    status("voice " + next + " mode — say \"what can I say?\" for commands");
    return next;
  }

  function cycleSpeechIntent() {
    var next = window.NB_SPEECH && window.NB_SPEECH.nextIntentMode
      ? window.NB_SPEECH.nextIntentMode(state.speech.intent)
      : "default";
    return setSpeechIntent(next);
  }

  /** Route a final transcript through Voice Access-style intent parsing. */
  function handleSpeechFinal(phrase) {
    var p = String(phrase || "").trim();
    if (!p) return;
    var parsed = window.NB_SPEECH && window.NB_SPEECH.parseUtterance
      ? window.NB_SPEECH.parseUtterance(p, state.speech.intent || "default")
      : { kind: "dictation", text: p };
    if (parsed.kind === "mode-switch" && parsed.nextMode) {
      setSpeechIntent(parsed.nextMode);
      return;
    }
    if (parsed.kind === "help") {
      var help = window.NB_SPEECH.whatCanISay ? window.NB_SPEECH.whatCanISay() : "voice help";
      pushLine({ kind: "out", text: help });
      render(true);
      status("voice commands listed in transcript");
      scrollOut();
      return;
    }
    if (parsed.kind === "stop") {
      endDictation({ skipLeftover: true });
      status("listening stopped");
      return;
    }
    if (parsed.kind === "clear") {
      clearSpeechPrompt();
      status("prompt cleared");
      return;
    }
    if (parsed.kind === "submit") {
      submitSpeechPrompt();
      return;
    }
    if (parsed.kind === "command" && parsed.line) {
      // Commands do not append into the prompt — they run like slash verbs.
      speechBase = cliValue;
      closeIntel();
      if (window.NB_COMPLETE.isSlash(parsed.line)) {
        runSlash(parsed.line);
      } else {
        run(parsed.line, { silentUser: false });
      }
      render(true);
      status((parsed.hint || "voice command") + " · " + parsed.line);
      return;
    }
    if (parsed.kind === "unknown") {
      status(parsed.hint || "unrecognized voice command");
      return;
    }
    // Dictation (default).
    appendSpeechPhrase(parsed.text || p);
  }

  function paintSpeechInterim(interim) {
    state.speech.interim = interim || "";
    var input = $("[data-cli]");
    if (!input) return;
    // In commands mode, interim is status-only — don't type into the prompt.
    if ((state.speech.intent || "default") === "commands") {
      if (interim) status("command: " + interim);
      return;
    }
    var show = speechBase;
    if (interim) {
      if (show && !/\s$/.test(show)) show += " ";
      show += interim;
    }
    // Interim is live preview only — do not commit until final / stop.
    if (document.activeElement === input || state.speech.listening) {
      input.value = show;
    }
  }

  function onSpeechState(st) {
    state.speech.supported = !!st.supported;
    state.speech.listening = !!st.listening;
    state.speech.mode = st.mode || null;
    state.speech.error = st.error || null;
    state.speech.interim = st.interim || "";
    // Mic button aria-pressed and listening chrome live on the prompt.
    var mic = $("[data-speech-mic]");
    if (mic) {
      mic.setAttribute("aria-pressed", state.speech.listening ? "true" : "false");
      mic.dataset.listening = state.speech.listening ? "true" : "false";
      mic.dataset.mode = state.speech.mode || "";
      mic.dataset.intent = state.speech.intent || "default";
    }
    var prompt = $(".cn-prompt");
    if (prompt) {
      prompt.dataset.speech = state.speech.listening ? (state.speech.mode || "on") : "off";
      prompt.dataset.voiceIntent = state.speech.intent || "default";
    }
    var intent = state.speech.intent || "default";
    if (st.error) status(st.error);
    else if (st.listening && st.mode === "ptt") {
      status("listening (" + intent + ") — release ` to stop");
    } else if (st.listening && st.mode === "toggle") {
      status("listening (" + intent + ") — Alt+V or Esc to stop · Alt+Shift+V cycles mode");
    }
  }

  function ensureSpeechEngine() {
    if (!speechSupported()) return null;
    if (speechEngine) return speechEngine;
    speechEngine = window.NB_SPEECH.create({
      lang: state.speech.lang || (window.NB_SPEECH.defaultLang && window.NB_SPEECH.defaultLang()),
      requireReady: true,
      isReady: speechReady,
      notReadyReason: speechNotReadyReason,
      onFinal: handleSpeechFinal,
      onPartial: paintSpeechInterim,
      onState: onSpeechState,
    });
    return speechEngine;
  }

  function beginDictation(mode) {
    if (!speechSupported()) {
      status(speechNotReadyReason());
      render(true);
      return false;
    }
    if (!speechReady()) {
      // downloadable → fetch on this gesture; downloading/unavailable → explain.
      if (state.speech.availability === "downloadable" ||
          state.speech.availability === "downloading") {
        fetchSpeechModel({ fromGesture: true });
        return false;
      }
      status(speechNotReadyReason());
      render(true);
      return false;
    }
    var eng = ensureSpeechEngine();
    if (!eng) return false;
    speechBase = cliValue || "";
    state.speech.interim = "";
    var ok = mode === "ptt" ? eng.pttDown() : eng.start(mode || "toggle");
    if (ok) {
      state.columnFocus = false;
      focusCli();
      render(true);
    }
    return ok;
  }

  function endDictation(opts) {
    if (!speechEngine) return;
    opts = opts || {};
    // Capture interim before stop() clears engine state.
    var leftover = state.speech.interim;
    speechEngine.stop();
    pttHeld = false;
    if (leftover && !opts.skipLeftover) {
      handleSpeechFinal(leftover);
      state.speech.interim = "";
      return;
    }
    state.speech.interim = "";
    cliValue = speechBase || cliValue;
    var input = $("[data-cli]");
    if (input) input.value = cliValue;
    recompute();
    render(true);
  }

  function toggleDictation() {
    if (state.speech.listening) {
      endDictation();
      status("listening stopped");
      return;
    }
    beginDictation("toggle");
  }

  var speechWarmArmed = false;
  var speechFetchInflight = null;

  async function fetchSpeechModel(opts) {
    opts = opts || {};
    if (!window.NB_SPEECH || !window.NB_SPEECH.ensureModel) return null;
    if (speechFetchInflight) return speechFetchInflight;
    speechFetchInflight = (async function () {
      state.speech.availability = "downloading";
      state.speech.ready = false;
      state.speech.reason = "downloading on-device speech model…";
      render(true);
      status("Downloading on-device speech model — mic stays off until ready");
      var snap = await window.NB_SPEECH.ensureModel(state.speech.lang, {
        report: function (m) { if (!state.busy) status(m); },
      });
      applySpeechAvailability(snap);
      render(true);
      if (snap.state === "available") {
        status("speech ready (on-device) — hold ` to dictate · Alt+V listen");
        if (opts.autoListen) beginDictation(opts.autoListen);
      } else {
        status(snap.reason || speechNotReadyReason());
      }
      return snap;
    })();
    try {
      return await speechFetchInflight;
    } finally {
      speechFetchInflight = null;
    }
  }

  /**
   * Probe / install the on-device STT pack early. Voice chords stay disabled
   * until availability === "available". First-run downloads need a gesture
   * (same constraint as LanguageModel).
   */
  async function warmSpeechModel() {
    if (!window.NB_SPEECH || !window.NB_SPEECH.availability) {
      applySpeechAvailability({
        state: "absent",
        backend: "none",
        reason: "speech module missing",
      });
      return render(true);
    }
    var lang = window.NB_SPEECH.defaultLang
      ? window.NB_SPEECH.defaultLang()
      : "en-US";
    state.speech.lang = lang;
    var snap = await window.NB_SPEECH.availability(lang);
    applySpeechAvailability(snap);
    render(true);

    if (snap.state === "available") {
      return status("speech ready (on-device) — hold ` · Alt+V");
    }
    if (snap.state === "absent" || snap.state === "unavailable") {
      return status(snap.reason || speechNotReadyReason());
    }

    // downloadable / downloading — wait for a gesture before install().
    status("speech model needs one download — click the mic (or any key) to fetch it");
    if (speechWarmArmed) return;
    speechWarmArmed = true;
    var start = function () {
      window.removeEventListener("keydown", start, true);
      window.removeEventListener("pointerdown", start, true);
      // Defer past the current pointer/key event so a mic click can finish
      // (morph mid-gesture detaches the button and looks like a dead control).
      setTimeout(function () {
        fetchSpeechModel({ fromGesture: true });
      }, 0);
    };
    window.addEventListener("keydown", start, true);
    window.addEventListener("pointerdown", start, true);
  }

  /* ── Durable identity + page state ─────────────────────────────────────── */
  var policy = window.NB_SESSION
    ? window.NB_SESSION.loadPolicy()
    : { guestsAllowed: true, name: "EPOCH CIVIC WORKSHOP" };
  var identity = window.NB_SESSION
    ? window.NB_SESSION.loadIdentity(policy)
    : { kind: "guest", principalId: "guest_local", displayName: "guest", canParticipate: true, claimable: true };

  function persistIdentity() {
    if (window.NB_SESSION) window.NB_SESSION.saveIdentity(identity);
    paintIdentity();
  }

  function canParticipate() {
    return !!(identity && identity.canParticipate);
  }

  function requireParticipation(action) {
    if (canParticipate()) return true;
    status((action || "that") + " needs a signed-in session — open Profile or /login");
    openAuth("space");
    return false;
  }

  var profileMenuOpen = false;

  function profileLabel() {
    return window.NB_SESSION && window.NB_SESSION.profileLabel
      ? window.NB_SESSION.profileLabel(identity)
      : (identity.displayName || "Anonymous");
  }

  function profileInitials() {
    return window.NB_SESSION && window.NB_SESSION.profileInitials
      ? window.NB_SESSION.profileInitials(identity)
      : "AN";
  }

  function listSpaces() {
    return window.NB_SESSION && window.NB_SESSION.listSpaces
      ? window.NB_SESSION.listSpaces()
      : ((window.NB_DATA && window.NB_DATA.spaces) || []);
  }

  function paintIdentity() {
    var host = $("[data-identity-host]");
    if (!host) return;
    var note = window.NB_SESSION ? window.NB_SESSION.authNote(identity) : identity.kind;
    var detail = window.NB_SESSION ? window.NB_SESSION.authDetail(identity) : "";
    var label = profileLabel();
    var initials = profileInitials();
    var space = identity.spaceName || identity.spaceShort || policy.name || "space";
    host.innerHTML =
      '<button type="button" class="nb-profile-btn" data-profile-btn data-kind="' +
      escAttr(identity.kind) + '" data-anonymous="' + (identity.anonymous || identity.kind === "guest" ? "true" : "false") + '"' +
      ' title="' + escAttr(detail) + '" aria-haspopup="menu" aria-expanded="' +
      (profileMenuOpen ? "true" : "false") + '" aria-label="Profile: ' +
      escAttr(label) + " · " + escAttr(space) + '">' +
      '<span class="nb-profile-avatar" aria-hidden="true">' + escHtml(initials) + "</span>" +
      '<span class="nb-profile-meta">' +
      '<span class="nb-profile-name">' + escHtml(label) + "</span>" +
      '<span class="nb-profile-space">' + escHtml(note) + "</span>" +
      "</span></button>";
    if (profileMenuOpen) paintProfileMenu();
  }

  function paintProfileMenu() {
    var menu = $("[data-profile-menu]");
    if (!menu) return;
    var label = profileLabel();
    var note = window.NB_SESSION ? window.NB_SESSION.authNote(identity) : identity.kind;
    var detail = window.NB_SESSION ? window.NB_SESSION.authDetail(identity) : "";
    var spaces = listSpaces();
    var spaceRows = spaces.map(function (s) {
      var current = identity.spaceId === s.id;
      var lock = s.guestsAllowed === false ? "members" : "open";
      return '<button type="button" class="nb-profile-item" role="menuitem" data-space-join="' +
        escAttr(s.id) + '"' + (current ? ' aria-current="true"' : "") +
        ' title="' + escAttr((s.slug || s.id) + " · " + (s.description || "")) + '">' +
        '<span class="nb-space-short">' + escHtml(s.short || s.id.slice(0, 4).toUpperCase()) + "</span>" +
        "<span>" + escHtml(s.name) +
        '<span class="nb-profile-item-sub">' + escHtml(s.slug || s.id) +
        " · " + (s.subscribers || 0) + " members</span></span>" +
        '<span class="nb-profile-item-desc">' + (current ? "current" : lock) + "</span>" +
        "</button>";
    }).join("");
    var signedIn = identity.kind === "claimed" || identity.kind === "atproto";
    menu.innerHTML =
      '<div class="nb-profile-head">' +
      '<div class="nb-profile-head-name">' + escHtml(label) + "</div>" +
      '<div class="nb-profile-head-note">' + escHtml(note) + "</div>" +
      '<div class="nb-profile-head-space">' + escHtml(detail) + "</div>" +
      "</div>" +
      '<div class="nb-profile-section">' +
      '<div class="nb-profile-section-title">Spaces</div>' +
      spaceRows +
      '<button type="button" class="nb-profile-item" role="menuitem" data-goto="/spaces">' +
      "Browse all spaces…</button>" +
      "</div>" +
      '<div class="nb-profile-section">' +
      '<div class="nb-profile-section-title">Account</div>' +
      '<button type="button" class="nb-profile-item" role="menuitem" data-profile-signin>' +
      (signedIn ? "Switch space with sign-in…" : "Sign in to a space…") + "</button>" +
      (identity.claimable
        ? '<button type="button" class="nb-profile-item" role="menuitem" data-profile-claim>Claim anonymous identity…</button>'
        : "") +
      (identity.kind !== "atproto"
        ? '<button type="button" class="nb-profile-item" role="menuitem" data-profile-bluesky>Sign in with handle…</button>'
        : "") +
      (signedIn
        ? '<button type="button" class="nb-profile-item danger" role="menuitem" data-profile-signout>Sign out · go anonymous</button>'
        : '<button type="button" class="nb-profile-item" role="menuitem" data-profile-signout>Reset anonymous session</button>') +
      "</div>";
  }

  function positionProfileMenu() {
    var menu = $("[data-profile-menu]");
    var btn = $("[data-profile-btn]");
    if (!menu || !btn) return;
    var r = btn.getBoundingClientRect();
    var mw = menu.offsetWidth || 260;
    var left = Math.max(8, Math.min(window.innerWidth - mw - 8, r.right - mw));
    var top = r.bottom + 6;
    menu.style.left = left + "px";
    menu.style.top = top + "px";
  }

  function openProfileMenu() {
    profileMenuOpen = true;
    paintIdentity();
    var menu = $("[data-profile-menu]");
    if (!menu) return;
    menu.hidden = false;
    menu.dataset.open = "true";
    paintProfileMenu();
    positionProfileMenu();
  }

  function closeProfileMenu() {
    profileMenuOpen = false;
    var menu = $("[data-profile-menu]");
    if (menu) {
      menu.dataset.open = "false";
      menu.hidden = true;
    }
    var btn = $("[data-profile-btn]");
    if (btn) btn.setAttribute("aria-expanded", "false");
  }

  function toggleProfileMenu() {
    if (profileMenuOpen) closeProfileMenu();
    else openProfileMenu();
  }

  function escHtml(s) {
    return String(s == null ? "" : s)
      .replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
  }
  function escAttr(s) { return escHtml(s).replace(/'/g, "&#39;"); }

  function fillSpaceSelect(selectedId) {
    var sel = $("[data-auth-space]");
    if (!sel) return;
    var spaces = listSpaces();
    sel.innerHTML = spaces.map(function (s) {
      return '<option value="' + escAttr(s.id) + '"' +
        (s.id === selectedId ? " selected" : "") + ">" +
        escHtml(s.name) + (s.guestsAllowed === false ? " (members)" : "") +
        "</option>";
    }).join("");
  }

  function openAuth(mode) {
    // mode: "login" | "claim" | "space" | "either"
    closeProfileMenu();
    var dlg = $("[data-auth-dialog]");
    if (!dlg) return;
    mode = mode || "space";
    dlg.dataset.mode = mode;
    dlg.dataset.open = "true";
    dlg.hidden = false;
    var title = $("[data-auth-title]");
    var lead = $("[data-auth-lead]");
    var claimBtn = $("[data-auth-claim]");
    var atBtn = $("[data-auth-atproto]");
    var err = $("[data-auth-err]");
    if (err) { err.hidden = true; err.textContent = ""; }
    fillSpaceSelect(identity.spaceId || (window.NB_SESSION && window.NB_SESSION.homeSpace
      ? window.NB_SESSION.homeSpace().id : "civic-workshop"));
    if (title) {
      title.textContent = mode === "claim" ? "Claim anonymous identity"
        : mode === "login" ? "Sign in with handle"
        : "Sign in to a space";
    }
    if (lead) {
      lead.textContent = mode === "claim"
        ? "Bind a local handle to this anonymous principal in the selected space."
        : mode === "login"
          ? "Enter a handle to sign in to the selected space."
          : "Pick a space and a handle. Members-only spaces require sign-in.";
    }
    if (claimBtn) {
      claimBtn.hidden = mode === "login";
      claimBtn.textContent = mode === "claim" ? "Claim identity" : "Sign in to space";
      claimBtn.disabled = mode === "login";
    }
    if (atBtn) {
      atBtn.hidden = mode === "claim";
      atBtn.textContent = "Sign in with handle";
    }
    var input = $("[data-auth-handle]");
    if (input) {
      input.value = identity.handle || "";
      setTimeout(function () { try { input.focus({ preventScroll: true }); input.select(); } catch { /* fine */ } }, 0);
    }
  }

  function closeAuth() {
    var dlg = $("[data-auth-dialog]");
    if (!dlg) return;
    dlg.dataset.open = "false";
    dlg.hidden = true;
    var err = $("[data-auth-err]");
    if (err) { err.hidden = true; err.textContent = ""; }
  }

  function authError(msg) {
    var err = $("[data-auth-err]");
    if (err) { err.hidden = false; err.textContent = msg; }
    status(msg);
  }

  function selectedAuthSpaceId() {
    var sel = $("[data-auth-space]");
    return (sel && sel.value) || identity.spaceId || "civic-workshop";
  }

  function applyIdentity(next, note, evt) {
    identity = next;
    persistIdentity();
    schedulePersist();
    closeAuth();
    closeProfileMenu();
    render(true);
    status(note || (window.NB_SESSION ? window.NB_SESSION.authNote(identity) : "identity updated"));
    if (evt) {
      broadcastHookEvent(evt, {
        handle: identity.handle,
        who: identity.handle || "you",
        kind: identity.kind,
        spaceId: identity.spaceId,
        spaceName: identity.spaceName,
        body: note || "",
      });
    }
  }

  function doClaim(handle) {
    if (!window.NB_SESSION) return authError("session module missing");
    try {
      var spaceId = selectedAuthSpaceId();
      var next = window.NB_SESSION.claimIdentity(identity, handle, spaceId);
      applyIdentity(next, "signed in to " + next.spaceName + " as @" + next.handle, "identity.changed");
    } catch (e) {
      authError(e && e.message ? e.message : String(e));
    }
  }

  function doAtprotoLogin(handle) {
    if (!window.NB_SESSION) return authError("session module missing");
    try {
      var spaceId = selectedAuthSpaceId();
      var next = window.NB_SESSION.authorizeAtproto(handle, identity.principalId, spaceId);
      if (identity.createdAt) next.createdAt = identity.createdAt;
      applyIdentity(next, "signed in to " + next.spaceName + " as @" + next.handle + " · " + next.did,
        "identity.changed");
    } catch (e) {
      authError(e && e.message ? e.message : String(e));
    }
  }

  function doJoinSpace(spaceId, opts) {
    if (!window.NB_SESSION) return status("session module missing");
    try {
      var next = window.NB_SESSION.joinSpace(identity, spaceId, opts || {});
      applyIdentity(next, next.anonymous
        ? "anonymous in " + next.spaceName
        : "in " + next.spaceName + " as " + (next.displayName || next.handle),
        "space.joined");
      // Land on the space hub (feed, channels, projects, about).
      navigate("/spaces/" + next.spaceId, { keepCli: true });
    } catch (e) {
      // Members-only: open sign-in dialog pre-selected to that space.
      var msg = e && e.message ? e.message : String(e);
      status(msg);
      openAuth("space");
      fillSpaceSelect(spaceId);
      authError(msg);
    }
  }

  function doSignOut() {
    if (!window.NB_SESSION) return;
    identity = window.NB_SESSION.signOut(policy);
    persistIdentity();
    schedulePersist();
    closeAuth();
    closeProfileMenu();
    render(true);
    status(identity.kind === "guest"
      ? "anonymous in " + (identity.spaceName || "home space")
      : "signed out");
    broadcastHookEvent("identity.changed", {
      handle: identity.handle || "anonymous",
      who: "you",
      kind: identity.kind,
      spaceId: identity.spaceId,
      spaceName: identity.spaceName,
      body: "signed out",
    });
  }

  function snapshotBoard() {
    freezeSession();
    return {
      v: 2,
      principalId: identity.principalId,
      path: state.path,
      cursor: state.cursor,
      focus: state.focus,
      sort: state.sort,
      filter: state.filter,
      feedQuery: state.feedQuery,
      feedView: state.feedView,
      feedPinnedViews: (state.feedPinnedViews || []).slice(),
      prev: state.prev,
      folded: state.folded,
      votes: state.votes,
      reactions: state.reactions,
      treeOpen: state.treeOpen,
      history: state.history,
      histIndex: state.histIndex,
      lines: (state.lines || []).slice(-80),
      openTools: state.openTools,
      ai: state.ai,
      live: state.live,
      nextId: state.nextId,
      merged: (state.merged || []).slice(-40),
      pending: state.pending || [],
      sessions: state.sessions,
      activeSession: state.activeSession,
      panes: state.panes,
      themeIndex: themeIndex,
      savedAt: Date.now(),
    };
  }

  var persistTimer = null;
  function schedulePersist() {
    if (persistTimer) clearTimeout(persistTimer);
    persistTimer = setTimeout(function () {
      persistTimer = null;
      if (window.NB_SESSION) window.NB_SESSION.saveBoardState(snapshotBoard());
    }, 200);
  }

  function restoreBoardState() {
    if (!window.NB_SESSION) return;
    var snap = window.NB_SESSION.loadBoardState();
    if (!snap || snap.v < 1) return;
    // Only restore board work that belongs to this principal (guest continuity ok).
    if (snap.principalId && identity.principalId && snap.principalId !== identity.principalId) {
      // Different principal on a shared machine — keep furniture panes only.
      if (snap.panes) state.panes = Object.assign({}, state.panes, snap.panes, { zoom: false });
      return;
    }
    try {
      if (Array.isArray(snap.sessions) && snap.sessions.length) {
        state.sessions = snap.sessions.map(function (s) {
          // Rehydrate missing session fields after older snapshots.
          return Object.assign(makeSession(s.path), s);
        });
        state.activeSession = Math.min(snap.activeSession || 0, state.sessions.length - 1);
        thawSession(state.activeSession);
      } else {
        ["path", "cursor", "focus", "sort", "filter", "feedQuery", "feedView", "feedPinnedViews", "prev", "ai", "live", "nextId"].forEach(function (k) {
          if (snap[k] != null) state[k] = snap[k];
        });
        state.folded = Object.assign({}, snap.folded || {});
        state.votes = Object.assign({}, snap.votes || {});
        state.reactions = Object.assign({}, snap.reactions || {});
        state.treeOpen = Object.assign({}, snap.treeOpen || {});
        state.openTools = Object.assign({}, snap.openTools || {});
        state.lines = (snap.lines || []).slice();
        state.history = (snap.history || []).slice();
        state.histIndex = snap.histIndex != null ? snap.histIndex : -1;
        // Mirror into the single active session so freeze/thaw stay coherent.
        if (state.sessions[0]) {
          SESSION_FIELDS.forEach(function (k) {
            if (k === "lines" || k === "history") state.sessions[0][k] = (state[k] || []).slice();
            else if (k === "folded" || k === "openTools" || k === "votes" || k === "reactions" || k === "treeOpen") {
              state.sessions[0][k] = Object.assign({}, state[k] || {});
            } else state.sessions[0][k] = state[k];
          });
        }
      }
      state.merged = (snap.merged || []).slice();
      state.pending = (snap.pending || []).slice();
      if (snap.panes) state.panes = Object.assign({}, state.panes, snap.panes, { zoom: false });
      if (typeof snap.themeIndex === "number" && snap.themeIndex >= 0) themeIndex = snap.themeIndex;
    } catch { /* corrupt snapshot — keep defaults */ }
  }

  function freezeSession() {
    var sess = state.sessions[state.activeSession];
    if (!sess) return;
    SESSION_FIELDS.forEach(function (k) {
      if (k === "lines" || k === "history" || k === "feedPinnedViews") sess[k] = (state[k] || []).slice();
      else if (k === "folded" || k === "openTools" || k === "votes" || k === "reactions" || k === "treeOpen") {
        sess[k] = Object.assign({}, state[k] || {});
      } else if (k === "detailOpen") {
        sess.detailOpen = state.detailOpen !== false;
      } else sess[k] = state[k];
    });
    sess.cliDraft = typeof cliValue === "string" ? cliValue : "";
    // Attachments and editor focus are per-workspace (not shared board state).
    sess.attachments = (state.attachments || []).slice();
    var Ed = state.editor;
    sess.editorPath = Ed && Ed.active && Ed.active.path ? Ed.active.path : null;
    sess.editorFocused = !!(Ed && Ed.focused);
  }

  function thawSession(i) {
    var sess = state.sessions[i];
    if (!sess) return;
    state.activeSession = i;
    state.path = sess.path || "/";
    state.cursor = sess.cursor || 0;
    state.focus = sess.focus != null ? sess.focus : 1;
    state.sort = sess.sort || "hot";
    state.filter = sess.filter || "";
    state.feedQuery = sess.feedQuery || "";
    state.feedView = sess.feedView || "hot";
    state.feedPinnedViews = Array.isArray(sess.feedPinnedViews) ? sess.feedPinnedViews.slice() : [];
    state.feedAddOpen = false;
    state.feedQueryError = null;
    state.prev = sess.prev || "/";
    state.homeFeed = sess.homeFeed || "following";
    state.threadFocus = sess.threadFocus || null;
    state.histIndex = sess.histIndex != null ? sess.histIndex : -1;
    state.busy = !!sess.busy;
    // Deep-enough copies so mutating folds/tools/lines does not cross tabs.
    state.folded = Object.assign({}, sess.folded || {});
    state.openTools = Object.assign({}, sess.openTools || {});
    state.votes = Object.assign({}, sess.votes || {});
    state.reactions = Object.assign({}, sess.reactions || {});
    state.treeOpen = Object.assign({}, sess.treeOpen || {});
    state.reactPick = null;
    state.lines = (sess.lines || []).slice();
    state.history = (sess.history || []).slice();
    state.detailOpen = sess.detailOpen !== false;
    state.attachments = (sess.attachments || []).slice();
    // Restore this workspace's editor focus; buffers stay shared by path.
    if (!state.editor) {
      state.editor = {
        active: null, buffers: {}, focused: false,
        dragging: false, touchY: null, touchScroll: 0,
      };
    }
    var wantPath = sess.editorPath || null;
    if (wantPath && state.editor.buffers && state.editor.buffers[wantPath]) {
      state.editor.active = state.editor.buffers[wantPath];
      state.editor.focused = !!sess.editorFocused;
    } else {
      state.editor.active = null;
      state.editor.focused = false;
    }
    cliValue = sess.cliDraft || "";
  }

  /**
   * Apply a Lucene-style feed query (or named view id) as the active projection.
   * Updates sort when the query includes sort:…; clears error on success.
   */
  function setFeedQuery(query, viewId) {
    query = String(query == null ? "" : query).trim();
    state.feedQuery = query;
    if (viewId) state.feedView = viewId;
    else {
      // Match a preset if the query equals one.
      var presets = window.NB_QUERY && window.NB_QUERY.presets
        ? window.NB_QUERY.presets()
        : [];
      var hit = null;
      for (var i = 0; i < presets.length; i++) {
        if (presets[i].query === query || presets[i].id === query) {
          hit = presets[i];
          break;
        }
      }
      state.feedView = hit ? hit.id : (query ? "custom" : "hot");
      if (hit && !query) state.feedQuery = hit.query;
    }
    if (window.NB_QUERY && query) {
      var parsed = window.NB_QUERY.parse(query);
      state.feedQueryError = parsed.error || null;
      if (!parsed.error && parsed.sort) state.sort = parsed.sort;
    } else {
      state.feedQueryError = null;
      if (!query && state.feedView === "hot") state.sort = "hot";
    }
    render(true);
    status(state.feedQueryError
      ? "query error: " + state.feedQueryError
      : (query ? "view: " + query : "view: hot"));
  }

  function applyFeedView(viewId) {
    var presets = window.NB_QUERY && window.NB_QUERY.presets
      ? window.NB_QUERY.presets()
      : [];
    var hit = null;
    for (var i = 0; i < presets.length; i++) {
      if (presets[i].id === viewId) { hit = presets[i]; break; }
    }
    if (!hit) {
      // Back-compat: hot/new/top/best chips.
      if (["hot", "new", "top", "best"].indexOf(viewId) >= 0) {
        state.sort = viewId;
        state.feedQuery = "sort:" + viewId;
        state.feedView = viewId;
        state.feedQueryError = null;
        render(true);
        return status("sort: " + viewId);
      }
      return status("unknown view: " + viewId);
    }
    setFeedQuery(hit.query, hit.id);
  }

  /**
   * Toggle a reaction pill on a post (GitHub/Slack style).
   * First click adds yours; second removes it. Counts start from fixture
   * reactions and layer the local session.
   */
  function toggleReaction(postId, key) {
    if (!postId || !key) return;
    if (!requireParticipation("react")) return;
    var bag = state.reactions[postId] || { counts: {}, mine: {} };
    bag.counts = Object.assign({}, bag.counts || {});
    bag.mine = Object.assign({}, bag.mine || {});
    // Seed counts from fixture post once, if present.
    if (!bag.seeded) {
      var post = null;
      var all = (window.NB_DATA.posts || [])
        .concat(window.NB_DATA.dmMessages || [])
        .concat(window.NB_DATA.projectPosts || [])
        .concat(state.merged || []);
      for (var i = 0; i < all.length; i++) {
        if (all[i].id === postId) { post = all[i]; break; }
      }
      if (post && post.reactions) {
        Object.keys(post.reactions).forEach(function (k) {
          if (bag.counts[k] == null) bag.counts[k] = post.reactions[k];
        });
      }
      bag.seeded = true;
    }
    var added = false;
    if (bag.mine[key]) {
      delete bag.mine[key];
      bag.counts[key] = Math.max(0, (bag.counts[key] || 1) - 1);
      if (bag.counts[key] === 0) delete bag.counts[key];
    } else {
      bag.mine[key] = true;
      bag.counts[key] = (bag.counts[key] || 0) + 1;
      added = true;
    }
    state.reactions[postId] = bag;
    state.reactPick = null;
    render(true);
    status((bag.mine[key] ? "reacted " : "removed ") + key);
    if (added) {
      broadcastHookEvent("reaction.added", {
        id: postId,
        postId: postId,
        key: key,
        who: (identity && identity.handle) || "you",
        body: "reacted " + key + " on " + postId,
        subject: "Reaction " + key,
      });
    }
  }

  function switchSession(i, opts) {
    if (i === state.activeSession || i < 0 || i >= state.sessions.length) return;
    freezeSession();
    thawSession(i);
    recompute();
    render();
    if (opts && opts.keepFocus) return;
    focusCli();
  }

  function newSession() {
    freezeSession();
    // Isolated worktree: default home path + empty transcript/history —
    // never inherit the previous tab's path, filter, editor, or attachments.
    var sess = makeSession(DEFAULT_WORKSPACE_PATH);
    state.sessions.push(sess);
    thawSession(state.sessions.length - 1);
    recompute();
    render();
    focusCli();
    status("workspace " + state.sessions.length + " · fresh at " + state.path);
  }

  function closeSession(i) {
    if (state.sessions.length <= 1) return;
    freezeSession();
    var was = state.activeSession;
    state.sessions.splice(i, 1);
    var next = was;
    if (was === i) next = Math.min(i, state.sessions.length - 1);
    else if (was > i) next = was - 1;
    thawSession(next);
    recompute();
    render();
    focusCli();
  }

  function pushLine(line) {
    if (!line.id) line.id = nextLineId();
    state.lines.push(line);
    if (state.lines.length > 80) state.lines = state.lines.slice(-80);
    // Session output lives in the detail blade — keep it open so CLI/AI replies
    // are not trapped behind a closed pane (there is no side terminal).
    // Exception: session-chat focus on the home feed keeps Following visible.
    if (line.kind && line.kind !== "banner" && state.detailOpen === false &&
        !state.sessionOutFocus) {
      state.detailOpen = true;
    }
  }

  function updateLine(id, patch) {
    for (var i = state.lines.length - 1; i >= 0; i--) {
      if (state.lines[i].id === id) {
        Object.assign(state.lines[i], patch);
        return state.lines[i];
      }
    }
    return null;
  }

  function toolSummary(tool, args) {
    args = args || {};
    if (args.path) return args.path;
    if (args.mode) return "view " + args.mode;
    if (args.text) return args.text.slice(0, 72);
    if (args.query) return args.query.slice(0, 72);
    if (args.tokens) return Object.keys(args.tokens).length + " colours";
    var keys = Object.keys(args);
    if (!keys.length) return "";
    try { return JSON.stringify(args).slice(0, 72); } catch { return keys.join(", "); }
  }

  /**
   * Pane layout is the user's furniture arrangement; it survives the session.
   * Everything else about the board is navigation state and does not.
   */
  function loadPanes() {
    // Furniture arrangement: column widths, terminal height/width, dock side,
    // and collapse/max flags. Zoom is session-only so a tmux-z never traps you
    // after a reload. Dock cycles left → bottom → right, the VS Code panel
    // positions that keep the miller columns readable.
    var docks = { bottom: 1, right: 1, left: 1 };
    var fallback = {
      c0: 15, c1: 20, mc0: false, mc1: false,
      out: false, outH: 12, outW: 28, outMax: false, dock: "bottom", zoom: false,
    };
    try {
      var raw = window.localStorage.getItem("nb-panes");
      if (!raw) return fallback;
      var got = JSON.parse(raw);
      return {
        c0: Math.max(6, Math.min(34, Number(got.c0) || 15)),
        c1: Math.max(6, Math.min(34, Number(got.c1) || 20)),
        mc0: !!got.mc0, mc1: !!got.mc1,
        out: !!got.out,
        outH: Math.max(6, Math.min(40, Number(got.outH) || 12)),
        outW: Math.max(14, Math.min(48, Number(got.outW) || 28)),
        outMax: !!got.outMax,
        dock: docks[got.dock] ? got.dock : "bottom",
        zoom: false,
      };
    } catch { return fallback; }
  }

  function savePanes() {
    try { window.localStorage.setItem("nb-panes", JSON.stringify(state.panes)); } catch { /* private mode */ }
  }

  /**
   * Collapse or expand navigation list blades.
   * Collapsed = thin path rails so the detail pane claims the width.
   * Uses panes.zoom as the durable session flag (not restored across reloads).
   */
  function setNavCollapsed(on, opts) {
    opts = opts || {};
    if (!state.panes) state.panes = loadPanes();
    var next = !!on;
    if (state.panes.zoom === next && !opts.forceRender) {
      if (!opts.silent) status(next ? "nav collapsed" : "nav expanded");
      return next;
    }
    state.panes.zoom = next;
    // zoom is session-only furniture preference for this work session.
    savePanes();
    if (!opts.noRender) render(true);
    if (!opts.silent) {
      status(next
        ? "nav collapsed — detail fills width · z or rail to expand"
        : "nav expanded");
    }
    return next;
  }

  function toggleNavCollapsed(opts) {
    if (!state.panes) state.panes = loadPanes();
    return setNavCollapsed(!state.panes.zoom, opts);
  }

  function isNavCollapsed() {
    return !!(state.panes && state.panes.zoom);
  }

  /* ── Terminal file editor (detail pane) ────────────────────────────────── */

  function editorApi() {
    return window.NB_EDITOR || null;
  }

  function ensureEditorState() {
    if (!state.editor) {
      state.editor = {
        active: null, buffers: {}, focused: false,
        dragging: false, touchY: null, touchScroll: 0,
      };
    }
    if (!state.editor.buffers) state.editor.buffers = {};
    return state.editor;
  }

  /**
   * Open (or reuse) a buffer for a file entry in the detail pane.
   */
  function openFileInEditor(entry, path) {
    var Ed = editorApi();
    if (!Ed || !entry) return null;
    var es = ensureEditorState();
    var src = Ed.contentFromEntry(entry, path || entry.name);
    var key = src.path;
    if (!es.buffers[key]) {
      es.buffers[key] = Ed.open(key, src.text, {
        name: src.name,
        language: src.language,
      });
    }
    es.active = es.buffers[key];
    es.focused = true;
    state.columnFocus = true;
    return es.active;
  }

  function focusEditor() {
    var es = ensureEditorState();
    es.focused = true;
    state.columnFocus = true;
    render(true);
    var el = $("[data-editor]");
    if (el) {
      try { el.focus({ preventScroll: true }); } catch { /* fine */ }
    }
  }

  function blurEditor() {
    var es = ensureEditorState();
    es.focused = false;
    es.dragging = false;
    render(true);
  }

  function editorHandleKey(ev) {
    var Ed = editorApi();
    var es = ensureEditorState();
    if (!Ed || !es.active || !es.focused) return false;
    // Let the CLI keep chords when the prompt is focused.
    if (ev.target && ev.target.closest && ev.target.closest("[data-cli]")) return false;
    var consumed = Ed.handleKey(es.active, ev);
    if (consumed) {
      if (ev.preventDefault) ev.preventDefault();
      if (ev.stopPropagation) ev.stopPropagation();
      render(true);
      focusEditor();
      return true;
    }
    return false;
  }

  function editorClickAt(line, col, opts) {
    var Ed = editorApi();
    var es = ensureEditorState();
    if (!Ed || !es.active) return;
    Ed.clickAt(es.active, line, col, opts || {});
    es.focused = true;
    state.columnFocus = true;
    render(true);
    focusEditor();
  }


  var themeStyle = document.createElement("style");
  document.head.appendChild(themeStyle);

  var TOKEN_OF = {
    bg: "--nb-bg", surface: "--nb-surface", ink: "--nb-ink", inkDim: "--nb-ink-dim",
    inkFaint: "--nb-ink-faint", rule: "--nb-rule", accent: "--nb-accent",
    accentInk: "--nb-accent-ink", signed: "--nb-signed", live: "--nb-live",
    warn: "--nb-warn", danger: "--nb-danger", agent: "--nb-agent",
  };

  function setTheme(i) {
    themeIndex = (i + window.NB_THEMES.length) % window.NB_THEMES.length;
    var t = window.NB_THEMES[themeIndex];
    themeStyle.textContent = t.css;
    document.body.dataset.theme = t.name;
    var n = $("[data-theme-name]"); if (n) n.textContent = t.name;
    var note = $("[data-theme-note]"); if (note) note.textContent = t.note;
    schedulePersist();
  }

  /**
   * Apply generated tokens over the current theme.
   *
   * Partial is fine and expected: anything the agent omits keeps its current
   * value, so "make the accent blue" changes one thing rather than demanding a
   * complete palette. Values are validated here because a schema the page did
   * not enforce is not a safety measure.
   */
  function applyTokens(tokens, label) {
    var hex = /^#(?:[0-9a-f]{3}|[0-9a-f]{6})$/i;
    var css = [];
    var taken = 0;
    Object.keys(tokens || {}).forEach(function (k) {
      var name = TOKEN_OF[k] || (k.indexOf("--") === 0 ? k : null);
      if (!name) return;
      var v = String(tokens[k]).trim();
      if (!hex.test(v)) return;
      css.push(name + ":" + v);
      taken += 1;
    });
    if (!taken) return 0;
    themeStyle.textContent = window.NB_THEMES[themeIndex].css + ":root{" + css.join(";") + "}";
    document.body.dataset.theme = label || "custom";
    var n = $("[data-theme-name]"); if (n) n.textContent = label || "custom";
    return taken;
  }

  var experiences = window.NB_EXPERIENCES;
  var current = 0;
  var expStyle = document.createElement("style");
  document.head.appendChild(expStyle);

  function exp() { return experiences[current]; }
  function entries() { return MAP.list(state.path, state.merged) || []; }

  function visible() {
    var all = entries();
    if (!state.filter) return all;
    return all.filter(function (e) {
      return window.NB_COMPLETE.score(e.name, state.filter) !== null;
    });
  }

  /* ── Render ────────────────────────────────────────────────────────────── */

  var lastScrolled = null;

  function render(keepCli) {
    // Keep the active virtual worktree's snapshot current so tab labels and
    // a later switch restore the path/transcript you actually left.
    freezeSession();
    // Live feature-detect: a polyfill or late-available SpeechRecognition
    // should surface the mic without a reload.
    if (state.speech) state.speech.supported = speechSupported();
    var mount = $("[data-mount]");
    mount.dataset.exp = exp().id;
    mount.dataset.tui = "true";
    // Morph, don't replace. A node that did not change survives the render —
    // and with it everything the browser hangs off a node: focus and caret,
    // scroll position, hover state, and any animation mid-flight. The old
    // innerHTML swap destroyed all of that on every live tick, which is what
    // made the surface flicker and motion impossible.
    window.NB_MORPH.morph(mount, exp().render(state));
    var input = $("[data-cli]");
    if (input) {
      // The input's value is state the user owns; render only touches it when
      // the program changed cliValue underneath (Enter clearing it, Tab
      // completing it). While typing the two are already equal.
      if (input.value !== cliValue) {
        input.value = cliValue;
        if (document.activeElement === input) {
          try { input.setSelectionRange(cliValue.length, cliValue.length); } catch { /* fine */ }
        }
      }
      paintGhost();
      if (!state.columnFocus && !keepCli && document.activeElement !== input) input.focus({ preventScroll: true });
    }
    // Scroll only when the selection actually moved, and only the column's own
    // pane. scrollIntoView walks every scrollable ancestor — during load, when
    // layout is still settling, that includes the page itself, which it then
    // leaves permanently mis-scrolled with the header off-screen.
    var cur = mount.querySelector('.cn-blade[data-focus="true"] .cn-item[aria-current="true"], .cn-col[data-focus="true"] .cn-item[aria-current="true"]');
    if (cur && cur !== lastScrolled) {
      var pane = cur.closest(".cn-blade-body, .cn-col-body");
      if (pane) {
        var top = cur.getBoundingClientRect().top - pane.getBoundingClientRect().top + pane.scrollTop;
        if (top < pane.scrollTop) pane.scrollTop = top;
        else if (top + cur.offsetHeight > pane.scrollTop + pane.clientHeight) {
          pane.scrollTop = top + cur.offsetHeight - pane.clientHeight;
        }
      }
      // Keep the focused blade in horizontal view of the cascade.
      var blade = cur.closest(".cn-blade, .cn-col");
      if (blade && blade.scrollIntoView) {
        try { blade.scrollIntoView({ inline: "nearest", block: "nearest", behavior: "smooth" }); } catch { /* ok */ }
      }
    }
    lastScrolled = cur;
    paintActivityBell();
    paintKeysCue();
    schedulePersist();
  }

  /** Persistent status-bar cue for Ctrl+Space — always visible, never transient. */
  function paintKeysCue() {
    var el = $("[data-keys-open]");
    if (!el) return;
    var open = !!(state.helpOpen && state.intelOpen);
    el.dataset.open = open ? "true" : "false";
    el.setAttribute("aria-pressed", open ? "true" : "false");
  }

  /** Toggle the same overlay Ctrl+Space opens (status cue + /keys). */
  function toggleKeys() {
    if (state.intelOpen && state.helpOpen) {
      closeIntel();
      render(true);
      focusCli();
      status();
      return;
    }
    openIntel();
  }

  /** Move the menu highlight without re-rendering the input under the caret. */
  function highlightCandidate() {
    var menu = document.querySelector(".cn-menu");
    if (!menu) return;
    var opts = menu.querySelectorAll('[role="option"], [data-cand]');
    var input = $("[data-cli]");
    Array.prototype.forEach.call(opts, function (el) {
      var i = Number(el.getAttribute("data-cand"));
      if (i === state.candIndex) {
        el.setAttribute("aria-current", "true");
        el.setAttribute("aria-selected", "true");
        el.scrollIntoView({ block: "nearest" });
        if (input) input.setAttribute("aria-activedescendant", el.id || ("cn-cand-" + i));
      } else {
        el.removeAttribute("aria-current");
        el.setAttribute("aria-selected", "false");
      }
    });
  }

  /**
   * Keep ghost / insert / preview aligned with the highlighted catalogue row.
   * Arrow ↑↓ only moved aria-current before — → and Tab then always took the
   * first-ranked option. Call after candIndex changes without recomputing.
   */
  function syncCompletionToIndex() {
    var c = state.completion;
    if (!c || !c.candidates || !c.candidates.length) return;
    var n = c.candidates.length;
    var i = ((state.candIndex % n) + n) % n;
    state.candIndex = i;
    var cand = c.candidates[i];
    if (!cand) return;
    var value = String(cand.value || "");
    var q = String(c.query || "");
    c.insert = value;
    // Bare "/" slash catalogue: typed "/" + ghost "go " → "/go ".
    if (q === "/" && value.charAt(0) === "/") {
      c.ghost = value.slice(1) + " ";
      c.preview = "";
      return;
    }
    if (value.toLowerCase().indexOf(q.toLowerCase()) === 0) {
      var rest = value.slice(q.length);
      if ((c.kind === "command" || c.kind === "slash" || c.kind === "cmd") &&
          rest !== "" && !/\s$/.test(rest)) {
        rest += " ";
      }
      c.ghost = rest;
      c.preview = "";
      return;
    }
    // Absolute path / non-prefix match — replace preview for the selection.
    c.ghost = "";
    c.preview = value;
  }

  function paintGhost() {
    var input = $("[data-cli]");
    var mirror = $("[data-cli-mirror]") || $("[data-ghost]");
    if (!input || !mirror) return;
    var c = state.completion || { candidates: [], ghost: "" };
    if (window.NB_COMPLETE && window.NB_COMPLETE.formatCliPreview) {
      mirror.innerHTML = window.NB_COMPLETE.formatCliPreview(input.value, c);
    } else {
      var ghost = c.ghost ? input.value + c.ghost : input.value;
      mirror.textContent = ghost;
    }
  }

  function status(msg) {
    $("[data-status-line]").textContent = msg || exp().keys;
  }

  function renderNotice() {
    var region = $('[data-region="notice"]');
    var n = state.pending.length;
    region.hidden = n === 0;
    if (n === 0) { region.innerHTML = ""; return; }
    // Update in place once shown: rebuilding the button on every arriving post
    // would restart its entrance animation, and a notice that flashes on each
    // tick reads as an alarm rather than a count.
    var count = region.querySelector('[data-c="count"]');
    if (count) { count.textContent = n; return; }
    region.innerHTML = '<button type="button" data-c="notice" data-state="pending" data-merge>' +
      '<span data-c="count">' + n + "</span> new " + (n === 1 ? "post" : "posts") +
      " — press R to load</button>";
  }

  /* ── Navigation (single reusable nav blade + detail) ───────────────────── */

  /** Always the one nav blade (index 0) — never a stack of path segments. */
  function listBladeIndex() {
    return 0;
  }


  /**
   * Toggle one-level expand/collapse for a directory path (Space / +−).
   * Does not change navigation path — only the treeOpen map.
   */
  function toggleTreeDir(dirPath) {
    if (!dirPath) return;
    if (!state.treeOpen) state.treeOpen = {};
    if (state.treeOpen[dirPath]) {
      delete state.treeOpen[dirPath];
      status("collapsed " + dirPath);
    } else {
      state.treeOpen[dirPath] = true;
      status("expanded " + dirPath + " · one level");
    }
    render(true);
  }

  /**
   * Expand/collapse the directory under the keyboard cursor (Space).
   * Files are ignored. Depth is always one level in the list blade.
   */
  function toggleCursorTree() {
    var list = entries();
    var e = list[state.cursor];
    if (!e || e.kind !== "dir") return status("space expands directories");
    var full = MAP.resolve(state.path, e.name);
    toggleTreeDir(full);
  }

  /** Detail index when open; still 1 for focus math when present. */
  function detailBladeIndex() {
    return 1;
  }

  function isDetailOpen() {
    return state.detailOpen !== false;
  }

  /**
   * Open one message's conversation in the detail pane — root thread only,
   * with the clicked message marked. Channel feed stays for browse; click /
   * Enter opens the thread.
   */
  function openThread(postId, opts) {
    opts = opts || {};
    postId = postId ? String(postId) : "";
    if (!postId) return false;
    state.threadFocus = postId;
    state.detailOpen = true;
    if (opts.focus !== false) state.focus = detailBladeIndex();
    var list = entries();
    var ix = list.findIndex(function (e) { return e.post && e.post.id === postId; });
    if (ix >= 0) state.cursor = ix;
    if (state.editor) state.editor.focused = false;
    if (!opts.noRender) render(true);
    if (!opts.silent) status("thread · " + postId);
    return true;
  }

  function clearThreadFocus(opts) {
    opts = opts || {};
    if (!state.threadFocus) return false;
    state.threadFocus = null;
    if (!opts.noRender) render(true);
    if (!opts.silent) status("channel feed");
    return true;
  }

  /** Show selection in the detail pane (e.g. after selecting a file). */
  function openDetail(opts) {
    opts = opts || {};
    state.detailOpen = true;
    if (opts.focus !== false) state.focus = detailBladeIndex();
    if (!opts.noRender) render(true);
    if (!opts.silent) status("detail open");
    return true;
  }

  /**
   * Leave selection detail for the Following TUI log (people you follow).
   * Detail pane stays mounted — nav never expands to fill the workbench.
   */
  function closeDetail(opts) {
    opts = opts || {};
    state.detailOpen = false;
    state.threadFocus = null;
    state.focus = detailBladeIndex();
    if (state.editor) state.editor.focused = false;
    // Expand nav if it was collapsed for detail-first reading.
    if (state.panes && state.panes.zoom) {
      state.panes.zoom = false;
      savePanes();
    }
    if (!opts.noRender) render(true);
    requestAnimationFrame(revealHomeFeedTabs);
    if (!opts.silent) status("following feed");
    return true;
  }

  /**
   * Close / × on a blade:
   *   nav (0)    → reload nav at parent path (up)
   *   detail (1) → show Following feed (keep detail pane)
   */
  function closeBlade(index) {
    index = Number(index);
    if (index >= 1) {
      return closeDetail();
    }
    // Nav close = up one level (same as ascend when not at root).
    if (MAP.split(state.path).length === 0) return status("board nav stays open");
    var parts = MAP.split(state.path);
    var leaving = parts[parts.length - 1];
    var parentPath = MAP.join(parts.slice(0, -1)) || "/";
    state.prev = state.path;
    state.path = parentPath;
    state.filter = "";
    state.focus = 0;
    // Clear peeks under the path we left so the nav stays one-branch clean.
    if (state.treeOpen) {
      Object.keys(state.treeOpen).forEach(function (k) {
        if (k === state.prev || k.indexOf(state.prev + "/") === 0) delete state.treeOpen[k];
      });
    }
    var list = entries();
    var i = list.findIndex(function (x) { return x.name === leaving; });
    state.cursor = i >= 0 ? i : 0;
    render(true);
    return status("nav · " + state.path);
  }

  function navigate(path, opts) {
    var target = MAP.resolve(state.path, path);
    if (!MAP.isDir(target, state.merged)) {
      // A file path selects its entry in the parent directory rather than
      // failing, because "cd" to a thing you can see should go there.
      var parts = MAP.split(target);
      var dir = MAP.join(parts.slice(0, -1));
      if (MAP.isDir(dir, state.merged)) {
        // Only a leaf that actually exists counts as arriving. Reporting
        // success for a name that is not there made every caller believe a
        // typo had worked, which is why `cd bugs` silently did nothing.
        var probe = MAP.list(dir, state.merged) || [];
        var leaf = parts[parts.length - 1];
        var found = probe.findIndex(function (e) { return e.name === leaf; });
        if (found === -1) return false;
        state.prev = state.path;
        state.path = dir;
        state.filter = "";
        state.cursor = found;
        // File selection opens/focuses detail; nav reloads for the parent dir.
        state.detailOpen = true;
        // Posts open as a thread detail; other files leave thread focus clear.
        var hit = probe[found];
        state.threadFocus = hit && hit.post ? hit.post.id : null;
        state.focus = detailBladeIndex();
        syncReplyWithPath();
        syncPersonFromPath();
        render(opts && opts.keepCli);
        return true;
      }
      return false;
    }
    state.prev = state.path;
    state.path = target;
    state.cursor = 0;
    state.filter = "";
    state.threadFocus = null;
    // Drop one-level peeks when the nav reloads into a new branch.
    if (state.treeOpen) {
      Object.keys(state.treeOpen).forEach(function (k) {
        if (k.indexOf(target + "/") === 0 || k === target) delete state.treeOpen[k];
      });
    }
    // Land on the single nav blade — same pane, new branch of subnodes.
    state.focus = listBladeIndex();
    syncReplyWithPath();
    syncPersonFromPath();
    render(opts && opts.keepCli);
    return true;
  }

  function listOwnsKeyboard() {
    return (state.focus == null || state.focus <= listBladeIndex());
  }

  function detailOwnsKeyboard() {
    return isDetailOpen() && !listOwnsKeyboard();
  }

  function onHomeFeed() {
    return state.detailOpen === false;
  }

  /** Home feed owns j/k / Enter / → when selection is closed and detail is focused. */
  function homeOwnsKeyboard() {
    return onHomeFeed() && !listOwnsKeyboard();
  }

  function currentHomeItems() {
    if (window.NB_MAP && window.NB_MAP.homeFeedItems) {
      return window.NB_MAP.homeFeedItems(state.homeFeed, state.merged, state.homeFeedRead) || [];
    }
    return [];
  }

  function moveHomeCursor(delta) {
    var items = currentHomeItems();
    if (!items.length) {
      status("home · empty");
      return;
    }
    var cur = state.homeCursor || 0;
    if (cur < 0 || cur >= items.length) cur = 0;
    state.homeCursor = Math.max(0, Math.min(items.length - 1, cur + delta));
    focusColumns();
    state.focus = detailBladeIndex();
    if (state.editor) state.editor.focused = false;
    render(true);
    requestAnimationFrame(function () {
      var el = document.querySelector('[data-home-item][aria-current="true"]') ||
        document.querySelector("[data-home-cursor]");
      if (el && el.scrollIntoView) {
        try { el.scrollIntoView({ block: "nearest" }); } catch { /* fine */ }
      }
    });
    var it = items[state.homeCursor];
    if (it) status("home · " + (it.who || it.title || it.id));
  }

  function cycleHomeTab(delta) {
    var views = window.NB_MAP && window.NB_MAP.homeFeedViews
      ? window.NB_MAP.homeFeedViews()
      : [
        { id: "following" }, { id: "announcements" },
        { id: "featured" }, { id: "creators" },
      ];
    if (!views.length) return;
    var ix = 0;
    for (var i = 0; i < views.length; i++) {
      if (views[i].id === state.homeFeed) { ix = i; break; }
    }
    var next = views[(ix + delta + views.length * 8) % views.length];
    setHomeFeed(next.id);
  }

  /** Open the home-feed row under homeCursor (mark read + navigate). */
  function activateHomeItem() {
    var items = currentHomeItems();
    if (!items.length) {
      status("home · empty");
      return false;
    }
    var cur = state.homeCursor || 0;
    if (cur < 0 || cur >= items.length) cur = 0;
    var it = items[cur];
    if (!it) return false;
    if (it.id) markHomeFeedRead(it.id);
    state.detailOpen = true;
    focusColumns();
    var dest = it.where || "/";
    if (navigate(dest, { keepCli: true })) {
      status("open · " + (it.whereLabel || dest));
      return true;
    }
    status("cannot open " + dest);
    return false;
  }

  /**
   * When a thread is focused, j/k move to the previous/next post in the nav
   * list without dumping you back to the channel feed.
   */
  function moveThreadBrowse(delta) {
    var list = entries().filter(function (e) { return e && e.post; });
    if (!list.length) return;
    var ix = -1;
    for (var i = 0; i < list.length; i++) {
      if (list[i].post.id === state.threadFocus) { ix = i; break; }
    }
    if (ix < 0) ix = 0;
    var next = Math.max(0, Math.min(list.length - 1, ix + delta));
    var post = list[next].post;
    // Keep nav cursor aligned with the thread we're reading.
    var all = entries();
    state.cursor = all.findIndex(function (e) {
      return e && e.post && e.post.id === post.id;
    });
    if (state.cursor < 0) state.cursor = 0;
    openThread(post.id, { silent: true });
    status("thread · " + post.id);
  }

  function moveCursor(delta) {
    // Keyboard navigation acts on the current path's list blade; parent blades
    // re-scope only via click or close (they display the path dependency).
    // When the terminal editor is focused, list motion yields to the editor.
    if (state.editor && state.editor.focused) return;
    // Home feed owns j/k when selection is closed and the detail pane is focused.
    if (homeOwnsKeyboard()) return moveHomeCursor(delta);
    // Detail owns the keyboard: keep thread focus; browse sibling posts in-thread.
    if (detailOwnsKeyboard()) {
      if (state.threadFocus) return moveThreadBrowse(delta);
      // Channel/DM feed in detail without a focused thread — nudge nav cursor
      // but keep detail focus (don't steal back to the sidebar).
      var listD = visible();
      if (!listD.length) return;
      var allD = entries();
      var currentNameD = allD[state.cursor] ? allD[state.cursor].name : null;
      var viD = listD.findIndex(function (e) { return e.name === currentNameD; });
      if (viD === -1) viD = 0;
      var nextD = Math.max(0, Math.min(listD.length - 1, viD + delta));
      state.cursor = allD.findIndex(function (e) { return e.name === listD[nextD].name; });
      if (state.editor) state.editor.focused = false;
      render();
      return;
    }
    var list = visible();
    if (!list.length) return;
    var all = entries();
    var currentName = all[state.cursor] ? all[state.cursor].name : null;
    var vi = list.findIndex(function (e) { return e.name === currentName; });
    if (vi === -1) vi = 0;
    var next = Math.max(0, Math.min(list.length - 1, vi + delta));
    state.cursor = all.findIndex(function (e) { return e.name === list[next].name; });
    state.focus = listBladeIndex();
    // Browse the channel from the nav — arrow moves leave thread focus.
    state.threadFocus = null;
    // Selecting a new list row leaves the editor focus.
    if (state.editor) state.editor.focused = false;
    render();
  }

  /**
   * Entries whose detail is text the terminal editor can host — files and
   * agent payloads. Posts open as threads (use `e` to edit a post body).
   */
  function entryHasTextEditor(e) {
    if (!e || e.kind === "dir" || e.notification || e.post) return false;
    if (e.agentFile || e.agentSkill || e.agentTool) return true;
    if (e.meta === "instructions" || e.meta === "config" ||
        e.meta === "skill" || e.meta === "tool") return true;
    if (/\.(md|ts|tsx|js|jsx|json|css|html|txt|py|rs|go|yml|yaml|sh)$/i.test(e.name || "")) {
      return true;
    }
    return e.kind === "file" && !e.space && !e.relay && !e.member && !e.openDm;
  }

  /** Open detail and put keyboard focus in the terminal editor for entry. */
  function activateDetailEditor(e) {
    if (!e) return false;
    state.detailOpen = true;
    state.focus = detailBladeIndex();
    openFileInEditor(e, MAP.resolve(state.path, e.name));
    focusEditor();
    status("edit · " + ((state.editor && state.editor.active && state.editor.active.name) || e.name) +
      " · i insert · Esc normal");
    return true;
  }

  function moveBladeFocus(delta) {
    // → from nav into Following opens selection detail (and editor when text).
    if (delta > 0 && !isDetailOpen()) {
      var leaf = entries()[state.cursor];
      if (entryHasTextEditor(leaf)) return activateDetailEditor(leaf);
      openDetail({ silent: true });
      return;
    }
    // Detail blade is always mounted (selection or Following).
    var max = detailBladeIndex();
    state.focus = Math.max(0, Math.min(max, (state.focus != null ? state.focus : listBladeIndex()) + delta));
    render(true);
  }

  /**
   * Open the DM conversation with a member (not a member profile card).
   * Path becomes /dms/<handle>; empty threads are allowed for known members.
   */
  function openMemberDm(handle, opts) {
    opts = opts || {};
    handle = String(handle || "").replace(/^@/, "").toLowerCase();
    if (!handle) return false;
    syncPersonPanePeer(handle);
    state.personPane = "messages";
    var dest = MAP.dmPath ? MAP.dmPath(handle) : ("/dms/" + handle);
    // Ensure known members (people + Eve agents) can open even if sitemap lag.
    var known = window.NB_MAP.isKnownPeer
      ? window.NB_MAP.isKnownPeer(handle)
      : (window.NB_DATA.members || []).some(function (m) {
        return m.handle === handle;
      });
    if (known && navigate(dest, { keepCli: !!opts.keepCli })) {
      if (!opts.silent) status("dm · @" + handle);
      return true;
    }
    if (known && navigate("/dms", { keepCli: !!opts.keepCli })) {
      if (!opts.silent) status("dm · @" + handle + " — no thread yet");
      return true;
    }
    if (!opts.silent) status("no member @" + handle);
    return false;
  }

  /**
   * Right / Enter: slide into the selected child when it is a directory
   * (its children become the next blade's first-level list). Files open detail.
   * Members open their DM thread, not a profile card.
   */
  function descend() {
    var list = entries();
    var e = list[state.cursor];
    if (!e) return;
    // Board or project members roll → DMs with that person/agent.
    var pathParts = MAP.split(state.path);
    var onBoardMembers = pathParts[0] === "members";
    var onProjectMembers = pathParts[0] === "projects" && pathParts[2] === "members";
    if (e.openDm || ((onBoardMembers || onProjectMembers) && e.name && !e.post)) {
      openMemberDm(e.openDm || e.name, { keepCli: true });
      return;
    }
    if (e.kind === "dir") {
      // Collapse any expand-in-place on the row we're leaving so the parent
      // blade does not keep a duplicate of the new first-level list.
      var full = MAP.resolve(state.path, e.name);
      if (state.treeOpen && state.treeOpen[full]) delete state.treeOpen[full];
      navigate(e.name);
      status("slide → " + state.path);
      return;
    }
    if (e.notification) {
      openNotification(e.notification.id);
      // Keep nav open — collapse is explicit (z / Alt+Z / header).
      return;
    }
    // File / post detail — posts open as a thread; other files open detail.
    // Leave nav expanded so the user can keep navigating.
    if (e.post) {
      openThread(e.post.id);
      return;
    }
    state.threadFocus = null;
    state.detailOpen = true;
    state.focus = detailBladeIndex();
    // Editable files open in the terminal editor.
    if (e.agentFile || e.agentSkill || e.agentTool ||
        (e.kind !== "dir" && !e.post && /\./.test(e.name || ""))) {
      openFileInEditor(e, MAP.resolve(state.path, e.name));
    }
    render();
    if (state.editor && state.editor.active) {
      focusEditor();
      status("edit · " + (state.editor.active.name || e.name) + " · i insert · Esc normal");
    } else {
      status(e.hint ? e.name + " · " + e.hint : e.name);
    }
  }

  /**
   * Left: leave detail → list, or slide back to the parent scope (siblings
   * of the current path become the first-level list again).
   */
  function ascend() {
    if (isDetailOpen() && (state.focus != null ? state.focus : 0) >= detailBladeIndex()) {
      // First ← from detail focuses nav (detail stays open as preview).
      // User closes detail with ×.
      state.focus = listBladeIndex();
      if (state.editor) state.editor.focused = false;
      setNavCollapsed(false, { silent: true, noRender: true });
      render(true);
      return;
    }
    if (MAP.split(state.path).length === 0) return;
    closeBlade(listBladeIndex());
    status("slide ← " + state.path);
  }

  /**
   * Right arrow / l: directory → slide into it; post → open thread (same as
   * Enter); other text leaves → editor; else focus detail.
   */
  function goRight() {
    // Home feed rows only when the home pane owns focus — nav → still opens
    // the selected dir / post / file even while the Following log is visible.
    if (homeOwnsKeyboard()) return activateHomeItem();
    var list = entries();
    var e = list[state.cursor];
    var onList = listOwnsKeyboard();
    if (onList && e && e.kind === "dir") return descend();
    if (onList && e && e.post) return openThread(e.post.id);
    if (onList && e && entryHasTextEditor(e)) return activateDetailEditor(e);
    if (onList && e) return descend();
    return moveBladeFocus(1);
  }

  /**
   * Left arrow: if focused on detail, return to list; else slide to parent.
   * On the home feed, ← / h focuses the nav sidebar.
   */
  function goLeft() {
    if (homeOwnsKeyboard()) {
      focusColumns();
      state.focus = listBladeIndex();
      render(true);
      status("nav — ↑↓ to move, → or Enter to open · Esc returns to home rows");
      return;
    }
    return ascend();
  }

  /** Explicit editor open — posts included (→ opens threads instead). */
  function editCursorEntry() {
    if (homeOwnsKeyboard()) {
      status("home · open a row first (Enter), then e to edit");
      return false;
    }
    var e = entries()[state.cursor];
    if (!e) return false;
    if (e.post || entryHasTextEditor(e) || e.kind === "file") {
      return activateDetailEditor(e);
    }
    status("nothing to edit");
    return false;
  }

  /* ── Live stream ───────────────────────────────────────────────────────── */

  function clock() {
    var d = new Date();
    return String(d.getHours()).padStart(2, "0") + ":" + String(d.getMinutes()).padStart(2, "0");
  }

  /**
   * If a live post matches a subscription or mentions you, mint an Activity
   * item and push a browser notification when allowed.
   */
  function activityFromLivePost(post) {
    if (!post) return null;
    var subs = window.NB_DATA.subscriptions || [];
    var body = String(post.body || "") + " " + String(post.subject || "");
    var mentionsYou = /@you\b/i.test(body) ||
      (identity && identity.handle && new RegExp("@" + identity.handle + "\\b", "i").test(body));
    var subHit = null;
    for (var i = 0; i < subs.length; i++) {
      var s = subs[i];
      if (s.kind === "channel" && post.channel === s.target) { subHit = s; break; }
      if (s.kind === "member" && post.who === s.target) { subHit = s; break; }
      if (s.kind === "topic" && body.toLowerCase().indexOf(String(s.target).toLowerCase()) !== -1) {
        subHit = s; break;
      }
    }
    if (!mentionsYou && !subHit) return null;
    var chan = (D.channels || []).filter(function (c) { return c.id === post.channel; })[0];
    var where = chan && MAP.channelPath
      ? MAP.channelPath(chan.label)
      : "/projects/community/channels/" + (post.channel || "general");
    return {
      id: "live-n-" + post.id,
      kind: mentionsYou ? "mention" : "subscription",
      unread: true,
      at: post.at || clock(),
      who: post.who || "someone",
      where: where,
      whereLabel: chan ? "#" + chan.label : where,
      subject: post.subject || (mentionsYou ? "Mentioned you" : "Watched activity"),
      body: post.body || "",
      reason: mentionsYou
        ? "mentioned you"
        : ("subscribed to " + (subHit.label || subHit.target)),
      sub: subHit || null,
      ref: post.id,
    };
  }

  /** Live traffic → legacy Activity + custom hooks → browser notifications. */
  function notifyFromLivePost(post) {
    if (!post) return;
    var body = String(post.body || "") + " " + String(post.subject || "");
    var mentionsYou = /@you\b/i.test(body) ||
      (identity && identity.handle && new RegExp("@" + identity.handle + "\\b", "i").test(body));
    var act = activityFromLivePost(post);
    if (act) deliverBrowserNotification(act);

    // Custom hooks: post.created always; mention / subscription when they hit.
    var payload = Object.assign({}, post);
    if (act && act.where) {
      payload.where = act.where;
      payload.whereLabel = act.whereLabel;
    }
    broadcastHookEvent("post.created", payload);
    if (mentionsYou) broadcastHookEvent("mention.you", payload);
    if (act && act.kind === "subscription" && act.sub) {
      broadcastHookEvent("subscription.matched", Object.assign({}, payload, {
        topic: act.sub.target,
        label: act.sub.label,
      }));
    }
    if (post.dm) broadcastHookEvent("dm.received", payload);
  }

  /**
   * Prompt context from the active blade path + armed reply.
   * reply → reply to that post; channel/dm → new message; otherwise nav scope
   * for create-channel / create-project (AI tools).
   */
  function composeContext() {
    if (state.replyTo && state.replyTo.id) {
      return {
        kind: "reply",
        postId: state.replyTo.id,
        who: state.replyTo.who,
        channel: state.replyTo.channel,
        project: state.replyTo.project || null,
        path: state.path,
      };
    }
    // Home feed (selection closed) is not a channel/DM compose surface —
    // leftover path must not silently publish into a prior room.
    if (!state.detailOpen) {
      return { kind: "nav", scope: "home", path: state.path || "/" };
    }
    var parts = MAP.split(state.path);
    if (parts[0] === "dms" && parts[1]) {
      return { kind: "dm", dm: parts[1], path: state.path };
    }
    if (parts[0] === "projects" && parts[2] === "channels" && parts[3]) {
      var proj = parts[1];
      var label = parts[3];
      var ch = MAP.findChannelByLabel ? MAP.findChannelByLabel(label) : null;
      var channelId = ch ? ch.id : (proj === "community" ? label : label);
      return {
        kind: "post",
        project: proj,
        channel: channelId,
        channelLabel: label,
        path: state.path,
      };
    }
    if (parts[0] === "projects" && parts.length === 1) {
      return { kind: "nav", scope: "projects", path: state.path };
    }
    if (parts[0] === "projects" && parts.length === 2) {
      return { kind: "nav", scope: "project", project: parts[1], path: state.path };
    }
    if (parts[0] === "projects" && parts[2] === "channels" && parts.length === 3) {
      return { kind: "nav", scope: "channels", project: parts[1], path: state.path };
    }
    if (parts[0] === "projects" && parts[2] === "members") {
      return { kind: "nav", scope: "members", project: parts[1], path: state.path };
    }
    return { kind: "nav", scope: "board", path: state.path };
  }

  function composeLabel(ctx) {
    ctx = ctx || composeContext();
    if (ctx.kind === "reply") {
      return "reply @" + (ctx.who || "?") + " · " + (ctx.postId || "");
    }
    if (ctx.kind === "post") {
      return "post #" + (ctx.channelLabel || ctx.channel || "?");
    }
    if (ctx.kind === "dm") return "dm @" + (ctx.dm || "?");
    if (ctx.kind === "nav") {
      if (ctx.scope === "home") return "nav · home feed";
      if (ctx.scope === "channels") return "nav · create channel in " + (ctx.project || "project");
      if (ctx.scope === "projects") return "nav · create project";
      if (ctx.scope === "project") return "nav · " + (ctx.project || "project");
      return "nav · " + (ctx.path || "/");
    }
    return "prompt";
  }

  function armReplyTo(postId, who, channel, project) {
    state.replyTo = {
      id: postId,
      who: who || "there",
      channel: channel || null,
      project: project || null,
    };
  }

  function clearReplyTo() {
    state.replyTo = null;
  }

  /** Clear armed reply when the path leaves that channel (or board entirely). */
  function syncReplyWithPath() {
    if (!state.replyTo) return;
    var parts = MAP.split(state.path);
    var ch = state.replyTo.channel;
    if (!ch) { clearReplyTo(); return; }
    var label = ch;
    if (MAP.findChannelByLabel) {
      var found = (MAP.allChannels && MAP.allChannels() || []).filter(function (c) {
        return c.id === ch;
      })[0];
      if (found) label = found.label;
    }
    var onChannel = parts[0] === "projects" && parts[2] === "channels" &&
      (parts[3] === label || parts[3] === ch);
    var onDm = parts[0] === "dms";
    if (!onChannel && !onDm) clearReplyTo();
  }

  /** Keep person pane peer in sync with /dms/<handle>; reset to messages on peer change. */
  function syncPersonFromPath() {
    var parts = MAP.split(state.path);
    if (parts[0] === "dms" && parts[1]) {
      syncPersonPanePeer(parts[1]);
      return;
    }
    // Selecting a member in the roll previews their DM — track that peer too.
    if (parts[0] === "members" || (parts[0] === "projects" && parts[2] === "members")) {
      var list = entries();
      var e = list[state.cursor];
      if (e && (e.openDm || e.name)) syncPersonPanePeer(e.openDm || e.name);
    }
  }

  function authorHandle() {
    if (identity && identity.handle) return String(identity.handle).replace(/^@/, "");
    if (identity && identity.displayName && identity.kind !== "guest") {
      return String(identity.displayName).replace(/\s+/g, "-").toLowerCase();
    }
    return "you";
  }

  /**
   * Publish from the prompt into the active compose scope (reply / post / dm).
   */
  function publishCompose(body, ctx) {
    ctx = ctx || composeContext();
    body = String(body || "").trim();
    if (!body) return null;
    if (ctx.kind !== "reply" && ctx.kind !== "post" && ctx.kind !== "dm") return null;
    var who = authorHandle();
    var post = {
      id: "live-" + state.nextId,
      at: clock(),
      who: who,
      body: body,
      state: "open",
      sig: "sig:" + who + "-" + state.nextId,
    };
    state.nextId += 1;
    if (ctx.kind === "reply") {
      post.re = ctx.postId;
      post.channel = ctx.channel;
      if (ctx.project && ctx.project !== "community") post.project = ctx.project;
    } else if (ctx.kind === "post") {
      post.channel = ctx.channel;
      if (ctx.project && ctx.project !== "community") post.project = ctx.project;
    } else if (ctx.kind === "dm") {
      post.dm = ctx.dm;
    }
    state.merged.push(post);
    if (ctx.kind === "reply") clearReplyTo();
    clearSessionOutFocus({ noRender: true });
    beginUserTurn(body, "compose");
    var where = ctx.kind === "dm"
      ? ("@" + ctx.dm)
      : (ctx.kind === "reply"
        ? ("reply to " + ctx.postId)
        : ("#" + (ctx.channelLabel || ctx.channel)));
    pushLine({ kind: "out", text: "posted · " + where });
    notifyFromLivePost(post);
    render(true);
    status("posted · " + where);
    return post;
  }

  function ensureOverlay() {
    if (!state.boardOverlay) {
      state.boardOverlay = { channels: [], projects: [], projectChannels: {} };
    }
    if (!state.boardOverlay.channels) state.boardOverlay.channels = [];
    if (!state.boardOverlay.projects) state.boardOverlay.projects = [];
    if (!state.boardOverlay.projectChannels) state.boardOverlay.projectChannels = {};
    return state.boardOverlay;
  }

  function createChannel(name, opts) {
    opts = opts || {};
    name = String(name || "").trim();
    if (!name) return { ok: false, error: "name required" };
    var ov = ensureOverlay();
    var ctx = composeContext();
    var project = opts.project || ctx.project ||
      (MAP.split(state.path)[0] === "projects" ? MAP.split(state.path)[1] : "community");
    project = String(project || "community");
    var id = MAP.slug(name);
    var label = name;
    // Prefer keeping typed slug-looking names as both id and label for listings.
    if (/^[a-z0-9][a-z0-9-]*$/i.test(name)) {
      id = name.toLowerCase();
      label = name;
    }
    var proj = MAP.findProject(project);
    if (!proj && project !== "community") {
      return { ok: false, error: "no such project: " + project };
    }
    if (proj && proj.community) {
      if ((ov.channels || []).some(function (c) { return c.id === id || c.label === label; }) ||
          (MAP.allChannels && MAP.allChannels().some(function (c) {
            return c.id === id || c.label === label;
          }))) {
        return { ok: false, error: "channel exists: " + label };
      }
      ov.channels.push({ id: id, label: label, kind: "social", unread: 0 });
    } else {
      var bag = ov.projectChannels;
      if (!bag[project]) bag[project] = [];
      var names = MAP.projectChannelNames ? MAP.projectChannelNames(proj) : (proj.channels || []);
      if (names.indexOf(label) !== -1 || bag[project].indexOf(label) !== -1) {
        return { ok: false, error: "channel exists: " + label };
      }
      bag[project].push(label);
    }
    render(true);
    status("created channel " + label + " in " + project);
    return { ok: true, name: label, id: id, project: project };
  }

  function createProject(name) {
    name = String(name || "").trim();
    if (!name) return { ok: false, error: "name required" };
    var ov = ensureOverlay();
    var id = MAP.slug(name);
    if (/^[a-z0-9][a-z0-9-]*$/i.test(name)) id = name.toLowerCase();
    if (MAP.findProject(id) || (ov.projects || []).some(function (p) { return p.id === id; })) {
      return { ok: false, error: "project exists: " + id };
    }
    ov.projects.push({
      id: id,
      slug: id,
      open: 0,
      channels: ["issues", "changes"],
      hint: "created",
    });
    render(true);
    status("created project " + id);
    return { ok: true, id: id, name: id };
  }

  function tick() {
    if (!state.live) return;
    var seed = D.incoming[(state.nextId - 1) % D.incoming.length];
    var post = Object.assign({}, seed, {
      id: "live-" + state.nextId, at: clock(), sig: seed.sig + "-" + state.nextId,
    });
    state.nextId += 1;
    // Watching a community channel: /projects/community/channels/<label>
    var segs = MAP.split(state.path);
    var watching = segs[0] === "projects" && segs[1] === "community" &&
      segs[2] === "channels" && segs[3];
    var chan = D.channels.filter(function (c) { return c.id === post.channel; })[0];
    if (chan && watching === chan.label) {
      state.pending.push(post);
      renderNotice();
    } else {
      if (chan) chan.unread = (chan.unread || 0) + 1;
      state.merged.push(post);
      render(true);
    }
    // Browser Notification API + custom hooks.
    notifyFromLivePost(post);
  }

  function mergePending() {
    if (!state.pending.length) return;
    var n = state.pending.length;
    state.merged = state.merged.concat(state.pending);
    state.pending = [];
    renderNotice();
    render(true);
    status("loaded " + n + " new " + (n === 1 ? "post" : "posts"));
  }

  /* ── Command line ──────────────────────────────────────────────────────── */

  function closeCli() {
    state.cliOpen = false;
    state.intelOpen = false;
    state.helpOpen = false;
    state.helpCtx = null;
    state.completion = null;
    state.menuDismissed = false;
    cliValue = "";
    render();
    status();
  }

  function recompute() {
    state.completion = window.NB_COMPLETE.analyse(cliValue, {
      cwd: state.path, extra: state.merged,
      // Agent chat prefers slash verbs; empty prompt catalogues them.
      slash: !!state.ai || String(cliValue || "").charAt(0) === "/",
    });
    state.candIndex = 0;
  }

  /** Whether the completion palette should be visible. */
  function menuShouldOpen() {
    var c = state.completion;
    if (!c || !c.candidates || !c.candidates.length) return false;
    // Esc dismissed the combobox — stay closed until the user types again or
    // forces intellisense open with Ctrl+Space.
    if (state.menuDismissed && !state.intelOpen) return false;
    // Ctrl+Space forces the palette open (including the full command catalogue
    // on an empty prompt). Ordinary typing only opens when there is text and a
    // real choice — otherwise Enter-then-clear would leave every command listed.
    if (state.intelOpen) return true;
    var typed = String(cliValue || "");
    // Slash catalogue opens as soon as `/` is typed (even a single candidate).
    if (typed.charAt(0) === "/" && c.candidates.length >= 1) return true;
    // Smart markers (`@` mentions, `#` topics) open on the first match.
    if (window.NB_COMPLETE.isMarkerKind && window.NB_COMPLETE.isMarkerKind(c.kind) &&
        c.candidates.length >= 1) {
      return true;
    }
    // CLI: show suggestions as soon as a verb/path/sort/query has matches.
    if (typed.length > 0 && c.candidates.length >= 1 &&
        (c.kind === "command" || c.kind === "path" || c.kind === "sort" || c.kind === "query")) {
      return true;
    }
    return c.candidates.length > 1 && typed.length > 0;
  }

  /** True when the suggestion list is (or would be) showing for this draft. */
  function menuIsActive() {
    if (state.intelOpen || state.helpOpen) return true;
    if (state.menuDismissed) return false;
    var c = state.completion;
    if (!c || !c.candidates || !c.candidates.length) return false;
    var typed = String(cliValue || "");
    if (typed.charAt(0) === "/" && c.candidates.length >= 1) return true;
    if (window.NB_COMPLETE.isMarkerKind && window.NB_COMPLETE.isMarkerKind(c.kind) &&
        c.candidates.length >= 1) {
      return true;
    }
    if (typed.length > 0 && c.candidates.length >= 1 &&
        (c.kind === "command" || c.kind === "path" || c.kind === "sort" || c.kind === "query")) {
      return true;
    }
    return c.candidates.length > 1 && typed.length > 0;
  }

  /** Dismiss the suggestion combobox; keep the draft. Returns true if it was open. */
  function dismissMenu() {
    if (state.intelOpen || state.helpOpen) return closeIntel();
    if (!menuIsActive()) return false;
    state.menuDismissed = true;
    return true;
  }

  /** Apply a completion candidate into the prompt, with marker trailing space. */
  function applyCandidate(value, c) {
    c = c || state.completion;
    var head = cliValue.slice(0, (c && c.replaceFrom) || 0);
    var next = head + value;
    if (c && c.insertSpace && value && !/\s$/.test(value)) next += " ";
    cliValue = next;
  }

  /**
   * Ctrl+Space: intellisense + hotkey cheatsheet for the focused component.
   * Context is frozen *before* focus moves into the prompt, so opening from
   * nav/detail/editor still lists that component's keys.
   */
  function openIntel() {
    // Freeze first — columnFocus, path, thread presence, panel furniture.
    if (window.NB_HELP && window.NB_HELP.buildContext) {
      state.helpCtx = window.NB_HELP.buildContext(state);
    } else {
    state.helpCtx = {
        path: state.path, focus: state.columnFocus ? "columns" : "prompt",
        context: state.columnFocus ? "nav" : "prompt",
        contextLabel: state.columnFocus ? "navigation" : "prompt",
        surfaces: [state.columnFocus ? "nav" : "prompt"],
        hasThread: false, sessions: (state.sessions || []).length || 1,
        session: (state.activeSession || 0) + 1, sort: state.sort || "hot",
        dock: "page", ai: !!state.ai,
      };
    }
    state.columnFocus = false;
    state.menuDismissed = false;
    recompute();
    if (!state.completion || !state.completion.candidates.length) {
      // Free-form AI text has no path tokens — still show a catalogue so
      // Ctrl+Space is never empty. In ai mode that is slash commands.
      state.completion = window.NB_COMPLETE.analyse(state.ai ? "/" : "", {
        cwd: state.path, extra: state.merged, slash: !!state.ai,
      });
      state.candIndex = 0;
    }
    state.intelOpen = true;
    state.helpOpen = true;
    state.cliOpen = true;
    render(true);
    focusCli();
    var where = state.helpCtx && state.helpCtx.contextLabel
      ? state.helpCtx.contextLabel
      : (state.helpCtx && state.helpCtx.path ? state.helpCtx.path : state.path);
    status("keys · " + where + " — Esc closes");
  }

  function closeIntel() {
    if (!state.intelOpen && !state.helpOpen) return false;
    state.intelOpen = false;
    state.helpOpen = false;
    state.cliOpen = false;
    state.helpCtx = null;
    return true;
  }

  /** Tab: complete the unambiguous part first, then cycle. */
  function complete(shift) {
    var c = state.completion;
    if (!c || !c.candidates.length) return;
    var input = $("[data-cli]");
    if (c.insert && c.insert.length > String(c.query || "").length && !shift) {
      applyCandidate(c.insert, c);
    } else {
      var n = c.candidates.length;
      state.candIndex = ((state.candIndex + (shift ? -1 : 1)) % n + n) % n;
      applyCandidate(c.candidates[state.candIndex].value, c);
    }
    input.value = cliValue;
    recompute();
    render(true);
    var el = $("[data-cli]");
    if (el) { el.focus({ preventScroll: true }); el.setSelectionRange(cliValue.length, cliValue.length); }
  }

  function acceptGhost() {
    var c = state.completion;
    if (!c) return false;
    if (c.candidates && c.candidates.length) syncCompletionToIndex();
    c = state.completion;
    // Replace-preview (absolute path from basename) — insert the selected value.
    if (c.preview && c.insert) {
      applyCandidate(c.insert, c);
      var input = $("[data-cli]");
      if (input) input.value = cliValue;
      recompute();
      render(true);
      var el = $("[data-cli]");
      if (el) {
        el.focus({ preventScroll: true });
        el.setSelectionRange(cliValue.length, cliValue.length);
      }
      return true;
    }
    if (!c.ghost) return false;
    cliValue = cliValue + c.ghost;
    recompute();
    render(true);
    var el2 = $("[data-cli]");
    if (el2) {
      el2.focus({ preventScroll: true });
      el2.setSelectionRange(cliValue.length, cliValue.length);
    }
    return true;
  }

  function run(line, opts) {
    var text = String(line || "").trim();
    // Empty text is still a send when attachments are staged (chat context only).
    if (text === "" && !(state.attachments && state.attachments.length)) {
      closeCli();
      return;
    }
    if (text) {
      state.history.push(text);
      state.histIndex = -1;
    }
    var parts = text ? text.split(/\s+/) : [""];
    var cmd = parts[0];
    var arg = parts.slice(1).join(" ");
    var reply = null;
    var atts = takeAttachments();

    if (!(opts && opts.silentUser)) {
      pushLine({
        kind: "user",
        text: text || (atts.length
          ? "(attached " + atts.length + " file" + (atts.length === 1 ? "" : "s") + ")"
          : ""),
        mode: "cli",
        attachments: attachmentMetaList(atts),
      });
    }
    // Attachments alone in CLI mode: surface context into the transcript.
    if (!text && atts.length) {
      reply = window.NB_ATTACH && window.NB_ATTACH.formatContext
        ? window.NB_ATTACH.formatContext(atts)
        : "attached " + atts.length + " file(s)";
      if (reply != null) pushLine({ kind: "out", text: reply });
      cliValue = "";
      recompute();
      render();
      scrollOut();
      return;
    }

    if (cmd === "cd") {
      var dest = arg === "-" ? state.prev : arg;
      if (!navigate(dest || "/", { keepCli: true })) {
        // Completion already resolves `bugs` to /channels/bugs from anywhere;
        // execution refusing the same input made the two disagree, which reads
        // as the completion lying. One resolver, one answer.
        var guess = window.NB_COMPLETE.analyse("cd " + dest, { cwd: state.path, extra: state.merged });
        var best = guess && guess.candidates && guess.candidates[0];
        if (best && navigate(best.value, { keepCli: true })) {
          reply = "cd: " + dest + " → " + state.path;
        } else {
          reply = "cd: no such path: " + dest;
        }
      }
    } else if (cmd === "ls") {
      var l = MAP.list(MAP.resolve(state.path, arg || "."), state.merged);
      reply = l
        ? l.map(function (e) { return (e.kind === "dir" ? "▸ " : "  ") + e.name; }).join("  ")
        : "ls: not a directory";
    } else if (cmd === "cat") {
      var p = MAP.postAt(MAP.resolve(state.path, arg), state.merged);
      reply = p
        ? p.who + " " + p.at + " · " + p.state + "\n" + p.body + "\nsig: " + p.sig
        : "cat: not a readable entry";
    } else if (cmd === "sort") {
      var sorts = (window.NB_CONSOLE_VIEWS && window.NB_CONSOLE_VIEWS.SORTS) || ["hot", "new", "top", "best"];
      if (sorts.indexOf(arg) !== -1) {
        applyFeedView(arg);
        reply = "sort: " + arg;
      } else reply = "sort: " + sorts.join(" | ");
    } else if (cmd === "view" || cmd === "q" || cmd === "query") {
      if (!arg || arg === "help") {
        reply = window.NB_QUERY && window.NB_QUERY.helpText
          ? window.NB_QUERY.helpText()
          : "view <lucene query>";
      } else if (arg === "clear") {
        setFeedQuery("", "hot");
        state.sort = "hot";
        reply = "view cleared";
      } else {
        setFeedQuery(arg, "custom");
        reply = state.feedQueryError ? "query error: " + state.feedQueryError : "view: " + arg;
      }
    } else if (cmd === "find") {
      var hits = [];
      ["/projects", "/members", "/spaces", "/dms"].forEach(function (root) {
        (MAP.list(root, state.merged) || []).forEach(function (e) {
          if (window.NB_COMPLETE.score(e.name, arg) !== null) hits.push(root + "/" + e.name);
          if (e.kind === "dir") {
            (MAP.list(root + "/" + e.name, state.merged) || []).forEach(function (f) {
              if (window.NB_COMPLETE.score(f.name, arg) !== null) hits.push(root + "/" + e.name + "/" + f.name);
            });
          }
        });
      });
      reply = hits.length ? hits.slice(0, 12).join("\n") : "find: nothing matched";
    } else if (cmd === "search") {
      return finishSearch(arg);
    } else if (cmd === "grep") {
      var g = D.posts.concat(state.merged).filter(function (q) {
        return (q.body + " " + (q.subject || "")).toLowerCase().indexOf(arg.toLowerCase()) !== -1;
      });
      reply = g.length ? g.slice(0, 8).map(function (q) {
        return q.channel + "/" + q.who + ": " + (q.subject || q.body).slice(0, 60);
      }).join("\n") : "grep: no matches";
    } else if (cmd === "tail") {
      var n = state.pending.length; mergePending();
      reply = n ? "loaded " + n : "nothing queued";
    } else if (cmd === "watch") {
      state.live = true; reply = "stream resumed";
    } else if (cmd === "stat") {
      reply = "epoch " + D.board.epoch + " · " + D.board.landed + "/" + D.board.total +
        " landed · ships " + D.board.ships;
    } else if (cmd === "help") {
      reply = window.NB_COMPLETE.formatGroupedHelp
        ? window.NB_COMPLETE.formatGroupedHelp(window.NB_COMPLETE.COMMANDS)
        : window.NB_COMPLETE.COMMANDS.map(function (c) {
          return c.name + (c.arg ? " <" + c.arg + ">" : "") + "  " + c.help;
        }).join("\n");
    } else if (cmd === "clear") {
      state.lines = [];
    } else {
      reply = cmd + ": not found — try help";
    }
    if (reply != null) pushLine({ kind: "out", text: reply });
    // Keep the active session's tab label honest after cd.
    if (state.sessions[state.activeSession]) {
      state.sessions[state.activeSession].path = state.path;
    }
    cliValue = "";
    recompute();
    render();
    scrollOut();
  }

  function scrollOut() {
    var pane = $(".cn-blade-out") || $(".cn-out");
    if (pane) pane.scrollTop = pane.scrollHeight;
  }

  /**
   * Surface the session transcript as the active pane in the detail blade
   * so inconclusive turns (e.g. @handle outside a DM) are visible to iterate on.
   */
  function revealSessionChat(opts) {
    opts = opts || {};
    state.sessionOutFocus = true;
    if (!opts.noRender) render(true);
    requestAnimationFrame(function () {
      var pane = $(".cn-blade-out") || $(".cn-out");
      if (!pane) return;
      try {
        pane.scrollIntoView({ block: "nearest", inline: "nearest" });
      } catch { /* old */ }
      pane.scrollTop = pane.scrollHeight;
      try {
        if (!pane.hasAttribute("tabindex")) pane.setAttribute("tabindex", "-1");
        pane.focus({ preventScroll: true });
      } catch { /* fine */ }
    });
    if (!opts.silent) status("session · see chat history in detail");
    return true;
  }

  function clearSessionOutFocus(opts) {
    opts = opts || {};
    if (!state.sessionOutFocus) return false;
    state.sessionOutFocus = false;
    if (!opts.noRender) render(true);
    return true;
  }

  /**
   * `@knownHandle …` outside reply/post/dm compose — not a send path.
   * Returns { handle, rest } or null.
   */
  function parseAtOutsideCompose(text, ctx) {
    ctx = ctx || composeContext();
    if (ctx.kind === "dm" || ctx.kind === "reply" || ctx.kind === "post") return null;
    var m = String(text || "").trim().match(/^@([a-z0-9_-]+)\b/i);
    if (!m) return null;
    var handle = m[1].toLowerCase();
    var known = window.NB_MAP && window.NB_MAP.isKnownPeer
      ? window.NB_MAP.isKnownPeer(handle)
      : (window.NB_DATA.members || []).some(function (mem) {
        return String(mem.handle || "").toLowerCase() === handle;
      });
    if (!known) return null;
    return {
      handle: handle,
      rest: String(text || "").trim().slice(m[0].length).trim(),
    };
  }

  /** Local tip + reveal session chat; does not publish or call the agent. */
  function tipAtOutsideDm(text, parsed) {
    parsed = parsed || parseAtOutsideCompose(text);
    if (!parsed) return false;
    var display = String(text || "").trim();
    if (display) {
      state.history.push(display);
      state.histIndex = -1;
    }
    var wasDetail = state.detailOpen;
    // Mark focus before pushLine so async progress cannot reopen selection detail.
    if (!wasDetail) state.sessionOutFocus = true;
    beginUserTurn(display, "compose");
    pushLine({
      kind: "out",
      text: "not sent — prompt is not in a DM. /dm @" + parsed.handle +
        "  or open their thread, then Enter",
    });
    if (!wasDetail) state.detailOpen = false;
    revealSessionChat();
    return true;
  }

  function markAskInconclusive() {
    state._askInconclusive = true;
  }

  function flushAskInconclusive() {
    if (!state._askInconclusive) return false;
    state._askInconclusive = false;
    revealSessionChat({ silent: true });
    status("session · inconclusive — see chat history");
    return true;
  }

  /**
   * AG-UI events → structured transcript lines.
   * User turns and agent replies get a who-rail; tools collapse under the agent
   * with a one-line summary and an expandable detail block.
   */
  function onEvent(ev) {
    var E = window.NB_AGENT.EVENT;
    if (ev.type === E.RUN_STARTED) {
      // ask() may already have painted the user turn with attachment chips.
      var last = state.lines[state.lines.length - 1];
      if (last && last.kind === "user" && last._pendingAsk) {
        delete last._pendingAsk;
      } else {
        pushLine({
          kind: "user",
          text: (ev.displayInput != null ? ev.displayInput : ev.input),
          mode: "ai",
        });
      }
    } else if (ev.type === "PROGRESS") {
      // One live progress row: update the last progress line rather than
      // spamming the transcript with every "loading…" tick.
      var lastProg = state.lines[state.lines.length - 1];
      if (lastProg && lastProg.kind === "progress") updateLine(lastProg.id, { text: ev.message });
      else pushLine({ kind: "progress", text: ev.message });
      if (/no on-device model/i.test(String(ev.message || ""))) markAskInconclusive();
    } else if (ev.type === E.TOOL_CALL_ARGS) {
      var payload = ev.args || {};
      var tool = payload.tool || ev.toolCallName || "tool";
      var args = payload.args || payload;
      var toolDetail;
      try { toolDetail = JSON.stringify(args, null, 2); } catch { toolDetail = String(args); }
      pushLine({
        id: ev.toolCallId || nextLineId("T"),
        kind: "tool",
        tool: tool,
        summary: toolSummary(tool, args),
        detail: toolDetail,
        result: "",
        ok: null,
      });
    } else if (ev.type === E.TOOL_CALL_RESULT) {
      var id = ev.toolCallId;
      var content = ev.content == null ? "" : String(ev.content);
      var updated = updateLine(id, { ok: !!ev.ok, result: content });
      if (updated) {
        // Keep a one-line brief when collapsed. Failures must still say
        // "failed" so the transcript is honest without expanding.
        var brief = updated.summary || "";
        if (!ev.ok) {
          updated.summary = brief
            ? brief.replace(/\s·\sfailed$/, "") + " · failed"
            : (updated.tool || "tool") + " failed";
        } else if (content && content.length < 72 && !brief) {
          updated.summary = content;
        }
      } else {
        pushLine({
          id: id || nextLineId("T"),
          kind: "tool",
          tool: "tool",
          summary: ev.ok ? (content.slice(0, 72) || "ok") : "failed",
          result: content,
          ok: !!ev.ok,
        });
      }
      if (!ev.ok) {
        var failedTool = (updated && updated.tool) || "";
        if (failedTool === "board_post" ||
            /not in a channel\/dm|could not publish|not-in-scope|navigate first/i.test(content)) {
          markAskInconclusive();
        }
      }
    } else if (ev.type === E.TEXT_MESSAGE_CONTENT) {
      if (ev.delta) pushLine({ kind: "agent", text: ev.delta });
    } else if (ev.type === E.RUN_ERROR) {
      pushLine({ kind: "error", text: ev.message || "run failed" });
      markAskInconclusive();
    } else {
      return;
    }    if (state.sessions[state.activeSession]) {
      state.sessions[state.activeSession].path = state.path;
    }
    render(true);
    scrollOut();
  }

  /* ── Attachments (file upload → chat context) ──────────────────────────── */

  function attachmentMetaList(atts) {
    if (!window.NB_ATTACH) {
      return (atts || []).map(function (a) {
        return { id: a.id, name: a.name, size: a.size, type: a.type, kind: a.kind, error: a.error };
      });
    }
    return (atts || []).map(window.NB_ATTACH.meta);
  }

  function takeAttachments() {
    var list = (state.attachments || []).slice();
    state.attachments = [];
    state.attachDrop = false;
    return list;
  }

  function removeAttachment(id) {
    if (!id) return;
    state.attachments = (state.attachments || []).filter(function (a) { return a.id !== id; });
    render(true);
    status(state.attachments.length
      ? state.attachments.length + " attachment" + (state.attachments.length === 1 ? "" : "s")
      : "attachments cleared");
  }

  function clearAttachments() {
    state.attachments = [];
    state.attachDrop = false;
    render(true);
    status("attachments cleared");
  }

  /**
   * Add File / FileList items to the prompt tray. Returns a Promise of how many
   * were accepted (excluding pure limit errors).
   */
  function addAttachmentFiles(files) {
    if (!window.NB_ATTACH) {
      status("attachments module not loaded");
      return Promise.resolve(0);
    }
    var existing = (state.attachments || []).length;
    return window.NB_ATTACH.readFiles(files, { existing: existing }).then(function (atts) {
      if (!atts || !atts.length) return 0;
      var added = 0;
      atts.forEach(function (a) {
        if (a.name === "(limit)" && a.error) {
          status(a.error);
          return;
        }
        // Dedupe by name+size when already staged.
        var dup = (state.attachments || []).some(function (x) {
          return x.name === a.name && x.size === a.size && !x.error;
        });
        if (dup) return;
        state.attachments = (state.attachments || []).concat([a]);
        added += 1;
      });
      // Cap after merge.
      if (state.attachments.length > window.NB_ATTACH.MAX_FILES) {
        state.attachments = state.attachments.slice(0, window.NB_ATTACH.MAX_FILES);
      }
      render(true);
      if (added) {
        status("attached " + added + " file" + (added === 1 ? "" : "s") +
          " · " + state.attachments.length + " ready for chat context");
      }
      return added;
    });
  }

  function openAttachPicker() {
    var input = $("[data-attach-input]");
    if (!input) return status("attach control missing");
    try { input.value = ""; } catch { /* fine */ }
    try { input.click(); } catch { status("could not open file picker"); }
  }

  function composeWithAttachments(text, atts) {
    if (window.NB_ATTACH && window.NB_ATTACH.composeInput) {
      return window.NB_ATTACH.composeInput(text, atts);
    }
    return String(text || "");
  }

  /**
   * Emit a user transcript line (with optional attachment chips) and return
   * the agent-facing input that includes attachment context.
   */
  function beginUserTurn(text, mode, atts) {
    atts = atts || takeAttachments();
    var display = String(text || "").trim();
    if (!display && atts.length) display = "(attached " + atts.length +
      " file" + (atts.length === 1 ? "" : "s") + ")";
    pushLine({
      kind: "user",
      text: display,
      mode: mode || (state.ai ? "ai" : "cli"),
      attachments: attachmentMetaList(atts),
      _pendingAsk: mode === "ai",
    });
    return { display: display, agentInput: composeWithAttachments(display, atts), attachments: atts };
  }

  async function ask(text) {
    if (state.busy) return;
    state.busy = true;
    state._askInconclusive = false;
    var here = (MAP.list(state.path, state.merged) || []).map(function (e) { return e.name; });
    var turn = beginUserTurn(text, "ai");
    try {
      await window.NB_AGENT.run(turn.agentInput, {
        cwd: state.path,
        here: here,
        compose: composeContext(),
        signal: undefined,
        attachments: turn.attachments,
        displayInput: turn.display,
      }, onEvent);
    } finally {
      state.busy = false;
      flushAskInconclusive();
      focusCli();
    }
  }

  /** Does this line already name a command the console can run itself? */
  function isCommand(text) {
    var first = String(text || "").trim().split(/\s+/)[0];
    if (!first) return false;
    if (first.charAt(0) === "/") return !!window.NB_COMPLETE.slashSpec(first);
    return window.NB_COMPLETE.COMMANDS.some(function (c) { return c.name === first; });
  }

  /** Switch prompt interpretation: ai (intent) or cli (commands). */
  function setPromptMode(mode, opts) {
    opts = opts || {};
    var next = String(mode || "").trim().toLowerCase();
    if (next !== "ai" && next !== "cli") return false;
    state.ai = next === "ai";
    if (!opts.noRender) render(true);
    if (!opts.silent) {
      status(state.ai
        ? "ai — your words are interpreted, bad commands repaired"
        : "cli — your words are commands");
    }
    return true;
  }

  /**
   * `/act` — the only context-dependent slash verb. Capabilities change with
   * path / selection (reply, create channel/project, voice, share).
   */
  function runActCommand(arg) {
    var parts = String(arg || "").trim().split(/\s+/).filter(Boolean);
    var verb = (parts[0] || "").toLowerCase();
    var rest = parts.slice(1).join(" ").trim();

    function finishAct(msg) {
      if (msg != null) pushLine({ kind: "out", text: msg });
      if (state.sessions[state.activeSession]) {
        state.sessions[state.activeSession].path = state.path;
      }
      cliValue = "";
      recompute();
      if (state._slashRevealOut) {
        state._slashRevealOut = false;
        revealSessionChat({ silent: true });
      } else {
        render();
        scrollOut();
      }
      return true;
    }

    if (!verb) {
      var caps = window.NB_COMPLETE.actCapabilities
        ? window.NB_COMPLETE.actCapabilities({ cwd: state.path, extra: state.merged })
        : [];
      if (!caps.length) {
        return finishAct("act · nothing context-bound here — open a post, …/channels, or a voice room");
      }
      return finishAct("act · available here:\n" + caps.map(function (c) {
        return "  " + c.value + " — " + c.hint;
      }).join("\n"));
    }

    if (verb === "share") {
      var link = "nightboard:" + state.path + "?sort=" + (state.sort || "hot");
      if (navigator.clipboard && navigator.clipboard.writeText) {
        navigator.clipboard.writeText(link).then(function () {
          finishAct("copied " + link);
        }, function () {
          finishAct("share: " + link);
        });
        return true;
      }
      return finishAct("share: " + link);
    }

    if (verb === "reply") {
      if (!requireParticipation("reply")) {
        cliValue = "";
        render(true);
        return true;
      }
      state.ai = true;
      var hereR = MAP.list(state.path, state.merged) || [];
      var selR = hereR[state.cursor];
      var post = selR && selR.post ? selR.post : null;
      if (!post && state.threadFocus) {
        for (var ri = 0; ri < hereR.length; ri++) {
          if (hereR[ri].post && hereR[ri].post.id === state.threadFocus) {
            post = hereR[ri].post;
            break;
          }
        }
      }
      if (post) {
        armReplyTo(post.id, post.who, post.channel, post.project);
        cliValue = rest || "";
        recompute();
        pushLine({
          kind: "out",
          text: "reply @" + post.who + " armed — type and Enter",
        });
        render(true);
        focusCli();
        return true;
      }
      cliValue = rest || "";
      recompute();
      pushLine({ kind: "out", text: "act reply · select a post in the thread first" });
      render(true);
      focusCli();
      return true;
    }

    if (verb === "channel") {
      var chName = rest.replace(/^(new|create|add)\s+/i, "").trim();
      if (!chName) return finishAct("act channel <name> — create in the current project");
      var made = createChannel(chName);
      return finishAct(made.ok ? ("channel " + made.name + " in " + made.project) : made.error);
    }

    if (verb === "project") {
      var prName = rest.replace(/^(new|create|add)\s+/i, "").trim();
      if (!prName) return finishAct("act project <name> — create under /projects");
      var madeP = createProject(prName);
      return finishAct(madeP.ok ? ("project " + madeP.id) : madeP.error);
    }

    if (verb === "voice") {
      return runVoiceCommand(rest).then(function (msg) {
        return finishAct(msg);
      });
    }

    return finishAct("act: unknown '" + verb + "' — /act lists what works here");
  }

  /**
   * Run a slash command from agent chat. Returns true if handled (including
   * errors printed to the transcript); false if the line is not a slash verb.
   */
  function runSlash(line) {
    var text = String(line || "").trim();
    if (!window.NB_COMPLETE.isSlash(text)) return false;
    var parts = text.split(/\s+/);
    var verb = parts[0].toLowerCase();
    var arg = parts.slice(1).join(" ");
    var spec = window.NB_COMPLETE.slashSpec(verb);
    // /attach manages the tray itself — do not consume staged files.
    var attachCmd = spec && spec.run === "attach";
    var atts = attachCmd ? [] : takeAttachments();
    pushLine({
      kind: "user",
      text: text,
      mode: "slash",
      attachments: attachmentMetaList(atts),
    });
    if (!spec) {
      pushLine({ kind: "error", text: verb + ": unknown slash command — try /help" });
      return true;
    }
    var run = spec.run;
    var reply = null;

    if (run === "attach") {
      var sub = String(arg || "").trim().toLowerCase();
      if (!sub || sub === "open" || sub === "add" || sub === "pick") {
        openAttachPicker();
        reply = "attach: pick files for chat context (or drop / paste onto the prompt)";
      } else if (sub === "list" || sub === "ls") {
        var all = state.attachments || [];
        reply = all.length
          ? "attachments (" + all.length + "): " + all.map(function (a) {
            return (window.NB_ATTACH ? window.NB_ATTACH.chipLabel(a) : a.name);
          }).join(" · ")
          : "attachments: none — /attach or paperclip to add";
      } else if (sub === "clear" || sub === "rm" || sub === "reset") {
        clearAttachments();
        reply = "attachments cleared";
      } else {
        reply = "/attach: open | list | clear";
      }
    } else if (run === "cd") {
      var dest = arg === "-" ? state.prev : (arg || "/");
      if (!navigate(dest, { keepCli: true })) {
        var guess = window.NB_COMPLETE.analyse("cd " + dest, { cwd: state.path, extra: state.merged });
        var best = guess && guess.candidates && guess.candidates[0];
        if (best && navigate(best.value, { keepCli: true })) {
          reply = "/go: " + dest + " → " + state.path;
        } else {
          reply = "/go: no such path: " + dest;
        }
      } else {
        reply = "/go: " + state.path;
      }
    } else if (run === "ls" || run === "cat" || run === "sort" || run === "find" ||
               run === "search" || run === "grep" || run === "tail" || run === "watch" ||
               run === "stat" || run === "clear") {
      // Reuse CLI implementations by synthesizing a command line.
      var synthetic = (run === "tail" ? "tail" : run) + (arg ? " " + arg : "");
      // Inline a minimal fork of run() outcomes without double user lines.
      return runSlashViaCli(synthetic, run);
    } else if (run === "pause") {
      state.live = false;
      reply = "stream paused";
    } else if (run === "where") {
      var here = entries();
      var sel = here[state.cursor];
      reply = "path " + state.path +
        (sel ? " · selected " + sel.name : "") +
        " · sort " + (state.sort || "hot") +
        " · " + (state.ai ? "ai" : "cli");
    } else if (run === "theme") {
      if (!arg) {
        reply = "themes: " + window.NB_THEMES.map(function (t) { return t.id; }).join(", ");
      } else {
        var ti = window.NB_THEMES.findIndex(function (t) {
          return t.id === arg || t.name.toLowerCase() === arg.toLowerCase();
        });
        if (ti === -1) reply = "unknown theme: " + arg;
        else { setTheme(ti); reply = "theme is " + window.NB_THEMES[ti].name; }
      }
    } else if (run === "mode" || run === "ai" || run === "cli") {
      // /mode ai|cli is the user-facing verb; /ai and /cli remain for agents.
      var modeArg = run === "mode"
        ? String(arg || "").trim().toLowerCase().split(/\s+/)[0]
        : run;
      if (!modeArg) {
        reply = "mode is " + (state.ai ? "ai" : "cli") + " — /mode ai | /mode cli";
      } else if (modeArg !== "ai" && modeArg !== "cli") {
        reply = "/mode: ai | cli (got " + modeArg + ")";
      } else {
        setPromptMode(modeArg, { silent: true });
        reply = modeArg === "ai"
          ? "ai mode — slash commands still run directly"
          : "cli mode — type commands without a slash";
      }
    } else if (run === "slash-help") {
      reply = window.NB_COMPLETE.formatGroupedHelp
        ? window.NB_COMPLETE.formatGroupedHelp(window.NB_COMPLETE.SLASH_COMMANDS)
        : window.NB_COMPLETE.SLASH_COMMANDS.map(function (c) {
          return c.name + (c.arg ? " <" + c.arg + ">" : "") + "  " + c.help;
        }).join("\n");
      reply += "\n\n/act is context-dependent — type /act for actions here.";
    } else if (run === "act") {
      return runActCommand(arg);
    } else if (run === "keys") {
      toggleKeys();
      return true;
    } else if (run === "share") {
      var link = "nightboard:" + state.path + "?sort=" + (state.sort || "hot");
      if (navigator.clipboard && navigator.clipboard.writeText) {
        navigator.clipboard.writeText(link).then(function () {
          pushLine({ kind: "out", text: "copied " + link });
          render(true); scrollOut();
        }, function () {
          pushLine({ kind: "out", text: "share: " + link });
          render(true); scrollOut();
        });
      } else {
        reply = "share: " + link;
      }
    } else if (run === "tab") {
      newSession();
      reply = "workspace " + state.sessions.length + " · fresh at " + state.path;
    } else if (run === "reply") {
      if (!requireParticipation("reply")) {
        cliValue = "";
        render(true);
        return true;
      }
      state.ai = true;
      var hereR = MAP.list(state.path, state.merged) || [];
      var selR = hereR[state.cursor];
      if (selR && selR.post) {
        armReplyTo(selR.post.id, selR.post.who, selR.post.channel, selR.post.project);
        cliValue = arg || "";
        recompute();
        render(true);
        focusCli();
        reply = "reply @" + selR.post.who + " armed — type and Enter";
      } else {
        cliValue = arg || "";
        recompute();
        render(true);
        focusCli();
        reply = "select a post in the thread, then /reply";
      }
    } else if (run === "channel") {
      var chArg = String(arg || "").trim();
      var chParts = chArg.split(/\s+/);
      var chVerb = (chParts[0] || "").toLowerCase();
      var chName = chParts.slice(1).join(" ").trim();
      if (chVerb === "new" || chVerb === "create" || chVerb === "add") {
        var made = createChannel(chName);
        reply = made.ok ? ("channel " + made.name + " in " + made.project) : made.error;
      } else {
        reply = "/channel new <name> — create in current project scope";
      }
    } else if (run === "project") {
      var prArg = String(arg || "").trim();
      var prParts = prArg.split(/\s+/);
      var prVerb = (prParts[0] || "").toLowerCase();
      var prName = prParts.slice(1).join(" ").trim() || (prVerb !== "new" && prVerb !== "create" ? prArg : "");
      if (prVerb === "new" || prVerb === "create" || prVerb === "add") {
        var madeP = createProject(prName);
        reply = madeP.ok ? ("project " + madeP.id) : madeP.error;
      } else if (prName) {
        var madeP2 = createProject(prName);
        reply = madeP2.ok ? ("project " + madeP2.id) : madeP2.error;
      } else {
        reply = "/project new <name> — create under /projects";
      }
    } else if (run === "view") {
      if (!arg || arg === "help" || arg === "?") {
        reply = window.NB_QUERY && window.NB_QUERY.helpText
          ? window.NB_QUERY.helpText()
          : "Lucene feed views: state:needs-review who:maya sort:new";
      } else if (arg === "clear" || arg === "reset") {
        setFeedQuery("", "hot");
        state.sort = "hot";
        reply = "view cleared · hot";
      } else {
        // Named preset id or free-form query.
        var presets = window.NB_QUERY && window.NB_QUERY.presets
          ? window.NB_QUERY.presets()
          : [];
        var named = null;
        for (var vi = 0; vi < presets.length; vi++) {
          if (presets[vi].id === arg || presets[vi].label === arg) {
            named = presets[vi];
            break;
          }
        }
        if (named) {
          setFeedQuery(named.query, named.id);
          reply = "view " + named.id + ": " + named.query;
        } else {
          setFeedQuery(arg, "custom");
          reply = state.feedQueryError
            ? "query error: " + state.feedQueryError
            : "view: " + arg;
        }
      }
    } else if (run === "whoami") {
      var det = window.NB_SESSION ? window.NB_SESSION.authDetail(identity) : identity.kind;
      reply = "you are " + profileLabel() +
        " · " + identity.kind +
        (identity.spaceName ? " · space " + identity.spaceName : "") +
        (identity.principalId ? " · " + identity.principalId : "") +
        (identity.did ? " · " + identity.did : "") +
        "\n" + det +
        (identity.canParticipate ? "\nparticipation: authorized" : "\nparticipation: denied");
    } else if (run === "space") {
      // Bare /space → selectable catalogue. /space <id> joins that space.
      // Legacy /spaces (if typed) is treated the same as bare /space.
      if (!arg || arg === "list" || arg === "ls") {
        if (navigate("/spaces", { keepCli: true })) {
          state.columnFocus = true;
          state.focus = 0;
          reply = "/space · pick a space";
        } else {
          reply = "/space: cannot open spaces";
        }
      } else {
        doJoinSpace(arg.trim().replace(/^r\//, ""));
        return true;
      }
    } else if (run === "dm") {
      // Open a direct message thread with a person or agent (sibling of projects).
      var handle = String(arg || "").trim().replace(/^@/, "").toLowerCase();
      if (!handle) {
        if (navigate("/dms", { keepCli: true })) {
          clearSessionOutFocus({ noRender: true });
          reply = "/dm: " + state.path;
        } else reply = "/dm: cannot open /dms";
      } else {
        var dmDest = "/dms/" + handle;
        // Prefer an existing DM thread; otherwise still open the path so the
        // board can show an empty conversation for a known member or Eve agent.
        if (!navigate(dmDest, { keepCli: true })) {
          var knownPeer = window.NB_MAP.isKnownPeer
            ? window.NB_MAP.isKnownPeer(handle)
            : (window.NB_DATA.members || []).some(function (m) {
              return m.handle === handle;
            });
          if (knownPeer && navigate("/dms", { keepCli: true })) {
            clearSessionOutFocus({ noRender: true });
            reply = "/dm: no thread with @" + handle + " yet — at /dms";
          } else {
            reply = "/dm: no such person or agent: " + handle;
            state._slashRevealOut = true;
          }
        } else {
          clearSessionOutFocus({ noRender: true });
          reply = "/dm: " + state.path + " · @" + handle;
        }
      }
    } else if (run === "notifications") {
      var filt = String(arg || "all").trim().toLowerCase();
      if (filt === "mention") filt = "mentions";
      if (filt === "subscription" || filt === "watching" || filt === "subs") filt = "subscribed";
      if (filt === "hook") filt = "hooks";
      if (filt === "enable" || filt === "allow" || filt === "permission") {
        requestBrowserNotifications();
        return true;
      }
      if (filt === "test" || filt === "send") {
        if (browserNotifyPermission() !== "granted") {
          reply = "browser alerts not granted — /notifications enable first";
        } else {
          var sample = activityItems().filter(function (n) { return n.unread; })[0] ||
            activityItems()[0];
          if (sample && window.NB_NOTIFY) {
            window.NB_NOTIFY.deliver(Object.assign({}, sample, { unread: true }), {
              force: true,
              onClick: onBrowserNotificationClick,
            });
            reply = "sent browser alert: " + (sample.subject || sample.id);
          } else {
            reply = "no activity items to send";
          }
        }
      } else if (filt !== "all" && filt !== "mentions" && filt !== "subscribed" && filt !== "hooks") {
        reply = "/notifications: all | mentions | subscribed | hooks | enable | test";
      } else {
        openActivity(filt);
        reply = "/notifications: " + state.path +
          " · " + unreadActivityCount() + " unread" +
          (browserNotifySupported()
            ? " · " + window.NB_NOTIFY.permissionLabel()
            : "");
      }
    } else if (run === "hooks") {
      reply = runHooksCommand(arg);
    } else if (run === "login") {
      if (arg) {
        doAtprotoLogin(arg);
        return true;
      }
      openAuth("login");
      reply = "sign in — dialog or /login <handle>";
    } else if (run === "claim") {
      if (!identity.claimable && identity.kind !== "guest") {
        reply = identity.kind === "atproto"
          ? "already signed in with a portable handle — claim not needed"
          : identity.kind === "claimed"
            ? "already signed in as @" + identity.handle + " · " + (identity.spaceName || "")
            : "cannot claim in this state (" + identity.kind + ")";
      } else if (arg) {
        doClaim(arg);
        return true;
      } else {
        openAuth("claim");
        reply = "claim anonymous identity in a space — dialog or /claim myhandle";
      }
    } else if (run === "logout") {
      doSignOut();
      return true;
    } else if (run === "voice") {
      return runVoiceCommand(arg).then(function (msg) {
        if (msg != null) pushLine({ kind: "out", text: msg });
        if (state.sessions[state.activeSession]) {
          state.sessions[state.activeSession].path = state.path;
        }
        cliValue = "";
        recompute();
        render();
        scrollOut();
      });
    } else {
      reply = verb + ": not implemented";
    }

    if (reply != null) pushLine({ kind: "out", text: reply });
    if (state.sessions[state.activeSession]) {
      state.sessions[state.activeSession].path = state.path;
    }
    cliValue = "";
    recompute();
    if (state._slashRevealOut) {
      state._slashRevealOut = false;
      revealSessionChat({ silent: true });
    } else {
      render();
      scrollOut();
    }
    return true;
  }

  /** Map a slash run-id onto the existing CLI runner without double-logging the user. */
  function runSlashViaCli(synthetic) {
    run(synthetic, { silentUser: true });
    return true;
  }

  /**
   * Board-wide Lucene search — shared by CLI `search`, slash `/search`, and
   * the `board_search` WebMCP tool. Paints color-coded hits in the transcript.
   */
  function runSearch(query, opts) {
    opts = opts || {};
    if (!window.NB_QUERY || !window.NB_QUERY.searchBoard) {
      return { text: "search: query engine unavailable", format: null, html: null };
    }
    var result = window.NB_QUERY.searchBoard(query, {
      extra: state.merged,
      votes: state.votes,
      reactions: state.reactions,
      members: (window.NB_DATA && window.NB_DATA.members) || [],
    });
    var formatted = window.NB_QUERY.formatSearchResults(result, { limit: opts.limit });
    return {
      text: formatted.text,
      html: formatted.html,
      format: formatted.format,
      result: result,
    };
  }

  function finishSearch(arg) {
    var out = runSearch(arg);
    pushLine({
      kind: "out",
      text: out.text,
      html: out.html,
      format: out.format,
    });
    if (state.sessions[state.activeSession]) {
      state.sessions[state.activeSession].path = state.path;
    }
    cliValue = "";
    recompute();
    render();
    scrollOut();
    return true;
  }

  function focusCli() {
    var el = $("[data-cli]");
    if (el) { el.focus({ preventScroll: true }); el.setSelectionRange(el.value.length, el.value.length); }
  }

  /**
   * Hand keyboard steering to the workbench (nav / home / detail). Always
   * blurs the prompt so document-level chords are not swallowed by the
   * input's early-return — columnFocus alone is not enough when the CLI
   * still owns DOM focus.
   */
  function focusColumns() {
    state.columnFocus = true;
    var input = $("[data-cli]");
    if (input && document.activeElement === input) {
      try { input.blur(); } catch { /* fine */ }
    }
  }

  /** Keys that mean "steer the board" while columns own focus. */
  function isColumnSteerKey(ev) {
    if (ev.altKey || ev.ctrlKey || ev.metaKey) return false;
    var k = ev.key;
    if (k === "ArrowDown" || k === "ArrowUp" || k === "ArrowLeft" || k === "ArrowRight") {
      return true;
    }
    if (k === "Enter" || k === "Backspace" || k === "Home" || k === "End") return true;
    if (k === " " || k === "Spacebar" || k === "PageUp" || k === "PageDown") return true;
    if (k === "[" || k === "]") return true;
    if (k.length === 1 && /^[hjklzvre]$/i.test(k)) return true;
    return false;
  }

  /* ── Input ─────────────────────────────────────────────────────────────── */

  /**
   * One delegated listener per event type, attached once at boot.
   *
   * With morphing, nodes persist across renders — re-attaching listeners per
   * render (the old model) would stack a new handler on the same button every
   * frame. Delegation also means a node inserted by the morph is live the
   * moment it exists, with nothing to wire.
   */
  function wireMount() {
    var mount = $("[data-mount]");

    mount.addEventListener("click", function (ev) {
      var attachPick = ev.target.closest("[data-attach-pick]");
      if (attachPick) {
        ev.preventDefault();
        openAttachPicker();
        return;
      }
      var attachRm = ev.target.closest("[data-attach-rm]");
      if (attachRm) {
        ev.preventDefault();
        removeAttachment(attachRm.dataset.attachRm);
        return;
      }
      var attachClear = ev.target.closest("[data-attach-clear]");
      if (attachClear) {
        ev.preventDefault();
        clearAttachments();
        return;
      }
      var closedSplit = ev.target.closest('.cn-split[data-closed="true"]');
      if (closedSplit) {
        var reopen = closedSplit.dataset.split === "0" ? "mc0" : "mc1";
        state.panes[reopen] = false;
        state.panes.zoom = false;
        savePanes();
        return render(true);
      }
      var fold = ev.target.closest("[data-fold]");
      if (fold) {
        var id = fold.dataset.fold;
        if (state.folded[id]) delete state.folded[id];
        else state.folded[id] = true;
        return render(true);
      }
      var notifOpen = ev.target.closest("[data-notif-open]");
      if (notifOpen) {
        openNotification(notifOpen.dataset.notifOpen);
        return;
      }
      var notifReadBtn = ev.target.closest("[data-notif-read]");
      if (notifReadBtn) {
        markNotificationRead(notifReadBtn.dataset.notifRead);
        render(true);
        return status("marked read");
      }
      // Clicking the activity card body (not a button) opens the source.
      var notifCard = ev.target.closest("[data-notif]");
      if (notifCard && !ev.target.closest("button")) {
        openNotification(notifCard.dataset.notif);
        return;
      }
      var voteBtn = ev.target.closest("[data-vote-id]");
      if (voteBtn) {
        if (!requireParticipation("vote")) return;
        var vid = voteBtn.dataset.voteId;
        var dir = voteBtn.dataset.vote === "down" ? -1 : 1;
        var cur = state.votes[vid] || 0;
        // Toggle off if pressing the same direction again.
        state.votes[vid] = cur === dir ? 0 : dir;
        if (state.votes[vid] === 0) delete state.votes[vid];
        return render(true);
      }
      // Discord spoilers — persist open set so morph/live ticks keep reveal.
      var spoiler = ev.target.closest("[data-spoiler]");
      if (spoiler) {
        ev.preventDefault();
        var sKey = spoiler.getAttribute("data-spoiler") || spoiler.textContent || "";
        state.spoilers = state.spoilers || {};
        if (state.spoilers[sKey]) delete state.spoilers[sKey];
        else state.spoilers[sKey] = true;
        return render(true);
      }
      // Reaction marks (+1, eyes, …) and the + picker.
      var reactPickBtn = ev.target.closest("[data-react-pick]");
      if (reactPickBtn) {
        var pickId = reactPickBtn.dataset.reactPick;
        state.reactPick = state.reactPick === pickId ? null : pickId;
        return render(true);
      }
      var reactBtn = ev.target.closest("[data-react][data-react-id]");
      if (reactBtn) {
        toggleReaction(reactBtn.dataset.reactId, reactBtn.dataset.react);
        return;
      }
      // Click outside an open picker closes it.
      if (state.reactPick && !ev.target.closest("[data-react-picker]")) {
        state.reactPick = null;
        // Fall through so other clicks still work after close.
      }
      var replyBtn = ev.target.closest("[data-reply]");
      if (replyBtn) {
        if (!requireParticipation("reply")) return;
        var who = replyBtn.dataset.replyWho || "there";
        var rid = replyBtn.dataset.reply;
        var post = null;
        (D.posts || []).concat(state.merged || []).some(function (p) {
          if (p.id === rid) { post = p; return true; }
          return false;
        });
        armReplyTo(rid, who, post && post.channel, post && post.project);
        state.columnFocus = false;
        state.ai = true;
        cliValue = "";
        render(true);
        focusCli();
        return status("reply @" + who + " — type and Enter to post");
      }
      if (ev.target.closest("[data-compose-clear]")) {
        clearReplyTo();
        render(true);
        focusCli();
        return status("reply cleared");
      }
      if (ev.target.closest("[data-help-close]")) {
        closeIntel();
        render(true);
        focusCli();
        return status();
      }
      // Click the dimmed backdrop (not the card) to dismiss the cheatsheet.
      if (ev.target.classList && ev.target.classList.contains("cn-help")) {
        closeIntel();
        render(true);
        focusCli();
        return status();
      }
      if (ev.target.closest("[data-share]")) {
        var sharePath = state.path || "/";
        var hereList = entries();
        var sel = hereList[state.cursor];
        if (sel && sel.post) sharePath = MAP.resolve(state.path, sel.name);
        var link = "nightboard:" + sharePath + "?sort=" + (state.sort || "hot");
        var done = function (ok) {
          status(ok ? "copied " + link : "share: " + link);
        };
        if (navigator.clipboard && navigator.clipboard.writeText) {
          navigator.clipboard.writeText(link).then(function () { done(true); }, function () { done(false); });
        } else {
          done(false);
        }
        return;
      }
      var sortBtn = ev.target.closest(".cn-sort[data-sort], .cn-sort[data-feed-view]");
      if (sortBtn) {
        // Only the chip itself — never a parent like .cn-tree[data-sort].
        state.feedAddOpen = false;
        applyFeedView(sortBtn.dataset.feedView || sortBtn.dataset.sort);
        return;
      }
      var viewBtn = ev.target.closest("[data-feed-view]");
      if (viewBtn) {
        state.feedAddOpen = false;
        applyFeedView(viewBtn.dataset.feedView);
        return;
      }
      if (ev.target.closest("[data-feed-add]")) {
        state.feedAddOpen = !state.feedAddOpen;
        render(true);
        return;
      }
      var pinBtn = ev.target.closest("[data-feed-pin]");
      if (pinBtn) {
        var pinId = pinBtn.getAttribute("data-feed-pin");
        if (pinId) {
          state.feedPinnedViews = (state.feedPinnedViews || []).slice();
          if (state.feedPinnedViews.indexOf(pinId) === -1) state.feedPinnedViews.push(pinId);
          state.feedAddOpen = false;
          applyFeedView(pinId);
        }
        return;
      }
      var unpinBtn = ev.target.closest("[data-feed-unpin]");
      if (unpinBtn) {
        var unpinId = unpinBtn.getAttribute("data-feed-unpin");
        state.feedPinnedViews = (state.feedPinnedViews || []).filter(function (id) {
          return id !== unpinId;
        });
        if (state.feedView === unpinId) {
          applyFeedView("hot");
        } else {
          freezeSession();
          render(true);
          status("unpinned " + unpinId);
        }
        return;
      }
      if (ev.target.closest("[data-feed-query-run]")) {
        var qEl = $("[data-feed-query]");
        setFeedQuery(qEl ? qEl.value : state.feedQuery);
        return;
      }
      if (ev.target.closest("[data-feed-query-clear]")) {
        setFeedQuery("", "hot");
        state.sort = "hot";
        return;
      }
      if (ev.target.closest("[data-feed-query-help]")) {
        if (window.NB_QUERY && window.NB_QUERY.helpText) {
          pushLine({ kind: "out", text: window.NB_QUERY.helpText() });
          render(true);
          scrollOut();
        }
        return status("feed query help in transcript");
      }
      // (Dockable terminal panel removed — the page is the TUI.)
      var toolToggle = ev.target.closest("[data-tool-toggle]");
      if (toolToggle) {
        var tid = toolToggle.dataset.toolToggle;
        if (state.openTools[tid]) delete state.openTools[tid];
        else state.openTools[tid] = true;
        return render(true);
      }
      var sessClose = ev.target.closest("[data-session-close]");
      if (sessClose) {
        ev.preventDefault();
        ev.stopPropagation();
        closeSession(Number(sessClose.dataset.sessionClose));
        return;
      }
      if (ev.target.closest("[data-session-new]")) {
        return newSession();
      }
      var sessTab = ev.target.closest("[data-session]");
      if (sessTab) {
        var idx = Number(sessTab.dataset.session);
        if (idx === state.activeSession) return render(true);
        switchSession(idx);
        return;
      }
      var bladeClose = ev.target.closest("[data-blade-close]");
      if (bladeClose) {
        closeBlade(bladeClose.dataset.bladeClose);
        return;
      }
      var treeToggle = ev.target.closest("[data-tree-toggle]");
      if (treeToggle) {
        ev.preventDefault();
        ev.stopPropagation();
        // +/− toggles one-level expand only — never navigates (Enter/→ slides).
        toggleTreeDir(treeToggle.dataset.treeToggle);
        return;
      }
      // Legacy minimise on a list blade = close it (cascade rule).
      var paneMin = ev.target.closest("[data-pane-min]");
      if (paneMin) {
        closeBlade(Number(paneMin.dataset.paneMin));
        return;
      }
      if (ev.target.closest("[data-pane-zoom]") ||
          ev.target.closest("[data-nav-collapse]")) {
        toggleNavCollapsed();
        return;
      }
      var navExpand = ev.target.closest("[data-nav-expand]");
      if (navExpand) {
        // Expand nav; optionally re-scope to the rail's path.
        var railPath = navExpand.dataset.bladePath || navExpand.getAttribute("data-blade-path");
        setNavCollapsed(false, { silent: true, noRender: true });
        if (railPath && railPath !== state.path) {
          navigate(railPath, { keepCli: true });
        } else {
          state.focus = listBladeIndex();
          render(true);
        }
        return status("nav expanded" + (railPath ? " · " + railPath : ""));
      }
      if (ev.target.closest("[data-thread-back]")) {
        try { ev.preventDefault(); } catch { /* fine */ }
        return clearThreadFocus();
      }
      var commentHit = ev.target.closest(".cn-comment");
      if (commentHit && !ev.target.closest(
        "button, a, [data-vote-id], [data-reply], [data-fold], [data-react], [data-react-pick], [data-spoiler]",
      )) {
        var cid = commentHit.getAttribute("data-key");
        if (cid) {
          try { ev.preventDefault(); } catch { /* fine */ }
          return openThread(cid);
        }
      }
      var homeTab = ev.target.closest("[data-home-feed]");
      if (homeTab) {
        try { ev.preventDefault(); ev.stopPropagation(); } catch { /* fine */ }
        return setHomeFeed(homeTab.dataset.homeFeed);
      }
      var annToggle = ev.target.closest("[data-ann-toggle]");
      if (annToggle) {
        try { ev.preventDefault(); ev.stopPropagation(); } catch { /* fine */ }
        return toggleAnnCollapsed(annToggle.dataset.annToggle);
      }
      var personTab = ev.target.closest("[data-person-pane]");
      if (personTab) {
        try { ev.preventDefault(); ev.stopPropagation(); } catch { /* fine */ }
        return setPersonPane(personTab.dataset.personPane);
      }
      var go = ev.target.closest("[data-goto]");
      if (go) {
        try { ev.preventDefault(); } catch { /* fine */ }
        // Following-card Open / row click → land on source with selection detail.
        if (go.closest(".cn-follow-row") || go.closest(".cn-home-open") ||
            go.hasAttribute("data-follow-open")) {
          var homeItem = go.closest("[data-home-item]") || go;
          var homeId = homeItem.dataset.homeItem || go.dataset.followOpen;
          if (homeId) markHomeFeedRead(homeId);
          state.detailOpen = true;
        }
        return navigate(go.dataset.goto);
      }
      var candEl = ev.target.closest("[data-cand]");
      if (candEl) {
        state.candIndex = Number(candEl.dataset.cand);
        var c = state.completion;
        if (c && c.candidates && c.candidates[state.candIndex]) {
          applyCandidate(c.candidates[state.candIndex].value, c);
        }
        recompute();
        return render();
      }
      var item = ev.target.closest(".cn-item");
      if (item) {
        // Item carries its absolute path. Selecting in a parent blade re-scopes
        // the cascade: navigate() rebuilds the stack and drops dependents that
        // no longer match the new parent selection (Azure blade rule).
        var target = item.dataset.path;
        if (!target) return;
        // Board or project members: open DMs (not a profile card).
        var tParts = window.NB_MAP.split(target);
        var isMemberLeaf =
          item.dataset.openDm ||
          (tParts[0] === "members" && tParts.length === 2) ||
          (tParts[0] === "projects" && tParts[2] === "members" && tParts.length === 4);
        if (isMemberLeaf) {
          var dmHandle = item.dataset.openDm || item.dataset.key ||
            tParts[tParts.length - 1];
          openMemberDm(dmHandle, { keepCli: true });
          return;
        }
        if (item.dataset.kind === "dir") {
          // Directory navigation needs full nav panes.
          setNavCollapsed(false, { silent: true, noRender: true });
          return navigate(target, { keepCli: true });
        }
        var segs = window.NB_MAP.split(target);
        var parentDir = window.NB_MAP.join(segs.slice(0, -1));
        var name = segs[segs.length - 1];
        if (state.path !== parentDir && !navigate(parentDir, { keepCli: true })) return;
        var all = entries();
        state.cursor = all.findIndex(function (e) { return e.name === name; });
        state.focus = detailBladeIndex();
        // Keep nav open so selecting a post does not strand further navigation.
        // Collapse is explicit (z / Alt+Z / header ▭ / —).
        var fileEntry = all[state.cursor];
        state.detailOpen = true;
        if (fileEntry && fileEntry.post) {
          return openThread(fileEntry.post.id);
        }
        state.threadFocus = null;
        if (fileEntry && (fileEntry.agentFile || fileEntry.agentSkill || fileEntry.agentTool ||
            (fileEntry.kind !== "dir" && !fileEntry.post && /\./.test(fileEntry.name || "")))) {
          openFileInEditor(fileEntry, target);
        }
        render(true);
        if (state.editor && state.editor.active && state.editor.active.path === target) {
          focusEditor();
          status("edit · " + state.editor.active.name);
        } else {
          status(name);
        }
      }
    });

    // Terminal editor: click/tap places caret; shift/drag extends visual.
    mount.addEventListener("pointerdown", function (ev) {
      var ed = ev.target.closest && ev.target.closest("[data-editor]");
      if (!ed) return;
      // Don't steal split/sash.
      if (ev.target.closest(".cn-split")) return;
      var ch = ev.target.closest("[data-line][data-col]");
      var lineEl = ev.target.closest("[data-line]");
      var line = ch
        ? Number(ch.dataset.line)
        : (lineEl ? Number(lineEl.dataset.line) : null);
      var col = ch ? Number(ch.dataset.col) : 0;
      if (line == null || isNaN(line)) return;
      // Focus editor before click handling.
      ensureEditorState().focused = true;
      state.columnFocus = true;
      editorClickAt(line, col, {
        extend: !!ev.shiftKey,
        insert: ev.detail >= 2 && ev.pointerType !== "touch",
      });
      // Begin drag-select for mouse/pen.
      if (ev.pointerType === "mouse" || ev.pointerType === "pen") {
        ensureEditorState().dragging = true;
        try { ed.setPointerCapture(ev.pointerId); } catch { /* fine */ }
      }
      // Touch: track for swipe-scroll.
      if (ev.pointerType === "touch") {
        ensureEditorState().touchY = ev.clientY;
        ensureEditorState().touchScroll = (state.editor.active && state.editor.active.scroll) || 0;
      }
      ev.preventDefault();
    });
    mount.addEventListener("pointermove", function (ev) {
      var es = ensureEditorState();
      if (!es.active) return;
      // Drag visual select
      if (es.dragging) {
        var ch = document.elementFromPoint(ev.clientX, ev.clientY);
        var cell = ch && ch.closest && ch.closest("[data-line][data-col]");
        if (cell) {
          editorClickAt(Number(cell.dataset.line), Number(cell.dataset.col), { extend: true });
        }
        return;
      }
      // Touch swipe → scroll buffer
      if (es.touchY != null && ev.pointerType === "touch") {
        var dy = es.touchY - ev.clientY;
        var lineDelta = Math.round(dy / 18);
        if (lineDelta !== 0 && window.NB_EDITOR) {
          es.active.scroll = es.touchScroll;
          window.NB_EDITOR.scrollBy(es.active, lineDelta);
          render(true);
        }
      }
    });
    mount.addEventListener("pointerup", function () {
      var es = ensureEditorState();
      es.dragging = false;
      es.touchY = null;
    });
    mount.addEventListener("pointercancel", function () {
      var es = ensureEditorState();
      es.dragging = false;
      es.touchY = null;
    });
    // Wheel scroll inside editor body
    mount.addEventListener("wheel", function (ev) {
      var body = ev.target.closest && ev.target.closest("[data-editor-body]");
      if (!body || !state.editor || !state.editor.active || !window.NB_EDITOR) return;
      var delta = ev.deltaY > 0 ? 3 : -3;
      window.NB_EDITOR.scrollBy(state.editor.active, delta);
      ev.preventDefault();
      render(true);
    }, { passive: false });

    // The splitter is the pane's own control: drag resizes, double-click or
    // Enter collapses and reopens, arrows nudge. Pointer events cover mouse,
    // touch and pen with one code path. Column sashes are vertical; the
    // terminal sash is horizontal when bottom-docked and vertical on a side.
    mount.addEventListener("pointerdown", function (ev) {
      var split = ev.target.closest(".cn-split");
      if (!split) return;
      ev.preventDefault();
      var remPx = parseFloat(getComputedStyle(document.documentElement).fontSize) || 16;
      var moved = false;
      split.setPointerCapture(ev.pointerId);

      if (split.dataset.split === "out") {
        var dock = state.panes.dock || "bottom";
        var side = dock === "left" || dock === "right";
        var start = side ? ev.clientX : ev.clientY;
        var startSize = state.panes.out
          ? 0
          : (side ? (state.panes.outW || 28) : (state.panes.outH || 12));
        var panel = split.closest(".cn-panel");
        var onMoveOut = function (e) {
          var cur = side ? e.clientX : e.clientY;
          // Bottom: drag up grows. Right: drag left grows. Left: drag right grows.
          var d = side
            ? ((dock === "right" ? start - cur : cur - start) / remPx)
            : ((start - cur) / remPx);
          if (!moved && Math.abs(d) < 0.25) return;
          moved = true;
          state.panes.out = false;
          state.panes.outMax = false;
          if (side) {
            state.panes.outW = Math.max(14, Math.min(48, startSize + d));
            if (panel) panel.style.setProperty("--nb-out-w", state.panes.outW + "rem");
          } else {
            state.panes.outH = Math.max(6, Math.min(40, startSize + d));
            if (panel) panel.style.setProperty("--nb-out-h", state.panes.outH + "rem");
          }
        };
        var onUpOut = function (e) {
          try { split.releasePointerCapture(e.pointerId); } catch { /* already released */ }
          split.removeEventListener("pointermove", onMoveOut);
          if (moved) { savePanes(); render(true); }
        };
        split.addEventListener("pointermove", onMoveOut);
        split.addEventListener("pointerup", onUpOut, { once: true });
        return;
      }

      var key = split.dataset.split === "0" ? "c0" : "c1";
      var minKey = split.dataset.split === "0" ? "mc0" : "mc1";
      var cols = split.parentElement;
      var startX = ev.clientX;
      var startW = state.panes[minKey] || state.panes.zoom ? 0 : state.panes[key];
      var onMove = function (e) {
        var d = (e.clientX - startX) / remPx;
        if (!moved && Math.abs(d) < 0.25) return;
        moved = true;
        var w = Math.max(6, Math.min(34, startW + d));
        state.panes[key] = w;
        state.panes[minKey] = false;
        state.panes.zoom = false;
        cols.style.setProperty("--nb-" + key, w + "rem");
        var other = key === "c0" ? "c1" : "c0";
        cols.style.setProperty("--nb-" + other,
          (state.panes[other === "c0" ? "mc0" : "mc1"] ? 0 : state.panes[other]) + "rem");
      };
      var onUp = function (e) {
        try { split.releasePointerCapture(e.pointerId); } catch { /* already released */ }
        split.removeEventListener("pointermove", onMove);
        if (moved) { savePanes(); render(true); }
      };
      split.addEventListener("pointermove", onMove);
      split.addEventListener("pointerup", onUp, { once: true });
    });

    mount.addEventListener("dblclick", function (ev) {
      var split = ev.target.closest(".cn-split");
      if (!split) return;
      if (split.dataset.split === "out") {
        state.panes.out = !state.panes.out;
        if (state.panes.out) state.panes.outMax = false; // see panel-min
        savePanes();
        return render(true);
      }
      var minKey = split.dataset.split === "0" ? "mc0" : "mc1";
      state.panes[minKey] = !state.panes[minKey];
      state.panes.zoom = false;
      savePanes();
      render(true);
    });

    mount.addEventListener("input", function (ev) {
      // Live-type the feed query without committing until Enter/run.
      if (ev.target && ev.target.hasAttribute && ev.target.hasAttribute("data-feed-query")) {
        state.feedQuery = ev.target.value;
        return;
      }
      var cli = ev.target;
      if (!cli.hasAttribute || !cli.hasAttribute("data-cli")) return;
      cliValue = cli.value;
      state.menuDismissed = false;
      recompute();
      // Repaint the menu without stealing focus or resetting the caret.
      var menu = mount.querySelector(".cn-menu");
      var wrap = mount.querySelector(".cn-tui-foot") || mount.querySelector(".cn-prompt-stack");
      state.candIndex = 0;
      var open = menuShouldOpen();
      // Typing keeps intellisense in sync when it was opened via Ctrl+Space.
      if (wrap) wrap.dataset.open = String(open);
      // data-morph-keep freezes the input node — sync live ARIA here.
      cli.setAttribute("aria-expanded", open ? "true" : "false");
      if (open && state.completion && state.completion.candidates.length) {
        cli.setAttribute("aria-activedescendant", "cn-cand-0");
      } else {
        cli.removeAttribute("aria-activedescendant");
      }
      if (menu) {
        if (open) menu.removeAttribute("hidden");
        else menu.setAttribute("hidden", "");
        var cands = state.completion ? state.completion.candidates : [];
        var kind = state.completion && state.completion.kind;
        if (!open) {
          menu.innerHTML = "";
        } else {
          var head = '<div class="cn-menu-head" data-key="menu-head">' +
            (state.intelOpen ? "Intellisense" : "Suggestions") +
            (kind ? " · " + kind : "") + "</div>";
          menu.innerHTML = head + cands.slice(0, 40)
            .map(function (c, i) {
              return '<div class="cn-cand" role="option" id="cn-cand-' + i + '" data-cand="' + i + '"' +
                ' aria-selected="' + (i === 0 ? "true" : "false") + '"' +
                (i === 0 ? ' aria-current="true"' : "") +
                '><span>' + (c.label || c.value) + "</span><i>" + (c.hint || "") + "</i></div>";
            }).join("");
        }
      }
      paintGhost();
    });

    mount.addEventListener("keydown", function (ev) {
      // Feed query input — Enter runs the Lucene projection.
      if (ev.target && ev.target.hasAttribute && ev.target.hasAttribute("data-feed-query")) {
        if (ev.key === "Enter") {
          ev.preventDefault();
          setFeedQuery(ev.target.value);
          return;
        }
        if (ev.key === "Escape") {
          ev.preventDefault();
          setFeedQuery("", "hot");
          state.sort = "hot";
          return;
        }
        return; // let typing happen; don't steal for CLI
      }
      // Ctrl+Space is handled once on document so columns and the prompt share
      // one chord without double-firing (open then immediately close).
      var split = ev.target.closest && ev.target.closest(".cn-split");
      if (split) {
        if (split.dataset.split === "out") {
          var dockK = state.panes.dock || "bottom";
          var sideK = dockK === "left" || dockK === "right";
          if ((!sideK && (ev.key === "ArrowUp" || ev.key === "ArrowDown")) ||
              (sideK && (ev.key === "ArrowLeft" || ev.key === "ArrowRight"))) {
            ev.preventDefault();
            state.panes.out = false;
            state.panes.outMax = false;
            if (sideK) {
              var dw = (ev.key === "ArrowRight" ? 1 : -1) * (dockK === "right" ? -1 : 1);
              state.panes.outW = Math.max(14, Math.min(48, (state.panes.outW || 28) + dw));
            } else {
              state.panes.outH = Math.max(6, Math.min(40,
                (state.panes.outH || 12) + (ev.key === "ArrowUp" ? 1 : -1)));
            }
            savePanes();
            return render(true);
          }
          if (ev.key === "Enter" || ev.key === " ") {
            ev.preventDefault();
            state.panes.out = !state.panes.out;
            if (state.panes.out) state.panes.outMax = false;
            savePanes();
            return render(true);
          }
          return;
        }
        var key = split.dataset.split === "0" ? "c0" : "c1";
        var minKey = split.dataset.split === "0" ? "mc0" : "mc1";
        if (ev.key === "ArrowLeft" || ev.key === "ArrowRight") {
          ev.preventDefault();
          state.panes[minKey] = false;
          state.panes[key] = Math.max(6, Math.min(34,
            state.panes[key] + (ev.key === "ArrowRight" ? 1 : -1)));
          savePanes();
          return render(true);
        }
        if (ev.key === "Enter" || ev.key === " ") {
          ev.preventDefault();
          state.panes[minKey] = !state.panes[minKey];
          state.panes.zoom = false;
          savePanes();
          return render(true);
        }
        return;
      }
      var cli = ev.target;
      if (!cli.hasAttribute || !cli.hasAttribute("data-cli")) return;
      if (ev.key === "Tab") { ev.preventDefault(); return complete(ev.shiftKey); }
      if (ev.key === "Enter") {
        ev.preventDefault();
        // Enter always submits/runs the typed line. Autocomplete accept is Tab
        // (or click a candidate) — never Enter — so a open suggestion menu
        // cannot trap the key that means "send".
        closeIntel();
        var text = cli.value;
        // Allow send with only attachments staged (chat context turn).
        if (!String(text || "").trim() && !(state.attachments && state.attachments.length)) {
          return;
        }
        cliValue = "";
        cli.value = "";
        recompute();
        // Slash commands always run locally (agent chat verbs). Bare CLI
        // commands also run directly. Compose scopes (reply/post/dm) publish
        // into the active blade — the whole page is the TUI, not a side terminal.
        if (window.NB_COMPLETE.isSlash(text)) {
          render(true);
          return runSlash(text);
        }
        var cctx = composeContext();
        var trimmed = String(text || "").trim();
        if (trimmed && !isCommand(text) &&
            (cctx.kind === "reply" || cctx.kind === "post" || cctx.kind === "dm")) {
          if (!requireParticipation("post")) {
            cliValue = text;
            cli.value = text;
            return render(true);
          }
          publishCompose(trimmed, cctx);
          return;
        }
        // @knownHandle outside DM/channel/reply — tip + session chat, no agent.
        var atOutside = parseAtOutsideCompose(trimmed, cctx);
        if (atOutside && tipAtOutsideDm(trimmed, atOutside)) return;
        if (state.ai && (!trimmed || !isCommand(text))) {
          render(true);
          return ask(text);
        }
        return run(text);
      }
      if (ev.key === "Escape") {
        ev.preventDefault();
        // Dictation Esc is handled in capture-phase wireSpeech; if we still
        // see it here, fall through to intel / suggestions / columns.
        if (dismissMenu()) {
          render(true);
          focusCli();
          return status("closed suggestions");
        }
        if (state.sessionOutFocus) {
          clearSessionOutFocus();
          return focusCli();
        }
        // Idempotent with the document handler: if columns already own
        // steering (state ahead of DOM focus), Esc closes detail then
        // returns to the prompt — same ladder as when the body is focused.
        if (state.columnFocus) {
          cli.blur();
          if (state.threadFocus) return clearThreadFocus();
          if (isDetailOpen()) return closeDetail();
          state.columnFocus = false;
          render();
          return focusCli();
        }
        // First Esc from the prompt hands steering to the columns.
        focusColumns();
        return status("columns — ←→↑↓ to move, i or : to return to the prompt");
      }
      if (ev.altKey && ev.key.toLowerCase() === "a") {
        ev.preventDefault();
        state.ai = !state.ai;
        render(true);
        return status(state.ai
          ? "ai — your words are interpreted, bad commands repaired"
          : "cli — your words are commands");
      }
      // The prompt owns almost every keystroke, so pane chords are Alt'd the
      // same way the mode toggle is; bare z still works in column mode.
      if (ev.altKey && ev.key.toLowerCase() === "z") {
        ev.preventDefault();
        return toggleNavCollapsed();
      }
      if (ev.altKey && ev.key.toLowerCase() === "j") {
        ev.preventDefault();
        return status("the page is the terminal — no separate panel to minimise");
      }
      if (ev.altKey && ev.key.toLowerCase() === "m") {
        ev.preventDefault();
        return status("the page is the terminal — blades fill the TUI");
      }
      if (ev.altKey && ev.key.toLowerCase() === "d") {
        ev.preventDefault();
        return status("the page is the terminal — no dock cycle");
      }
      if (ev.altKey && ev.key.toLowerCase() === "t") {
        ev.preventDefault();
        return newSession();
      }
      if (ev.key === "ArrowRight" || ev.key === "End") {
        if (cli.selectionStart === cli.value.length && acceptGhost()) ev.preventDefault();
        return;
      }
      if (ev.key === "ArrowUp" || ev.key === "ArrowDown") {
        ev.preventDefault();
        var c = state.completion;
        // With a *visible* multi-choice menu, arrows walk candidates. An empty
        // prompt still has a full command catalogue in completion state, but
        // that menu is closed — ↑↓ must mean history for power users.
        var menuOpen = menuShouldOpen();
        if (c && c.candidates.length > 1 && menuOpen) {
          var n = c.candidates.length;
          state.candIndex = ((state.candIndex + (ev.key === "ArrowDown" ? 1 : -1)) % n + n) % n;
          syncCompletionToIndex();
          highlightCandidate();
          paintGhost();
          return;
        }
        if (!state.history.length) return;
        var dir = ev.key === "ArrowUp" ? 1 : -1;
        state.histIndex = Math.max(-1, Math.min(state.history.length - 1, state.histIndex + dir));
        cliValue = state.histIndex === -1 ? "" : state.history[state.history.length - 1 - state.histIndex];
        cli.value = cliValue;
        recompute();
        paintGhost();
      }
    });
  }

  function wireGlobal() {
    document.addEventListener("click", function (ev) {
      if (ev.target.closest("[data-keys-open]")) {
        ev.preventDefault();
        return toggleKeys();
      }
      if (ev.target.closest("[data-merge]")) return mergePending();
      if (ev.target.closest("[data-mode-toggle]")) {
        state.ai = !state.ai;
        state.columnFocus = false;
        render();
        focusCli();
        return status(state.ai
          ? "ai — your words are interpreted, bad commands repaired"
          : "cli — your words are commands");
      }
      if (ev.target.closest("[data-attach-pick]")) {
        openAttachPicker();
        return;
      }
      if (ev.target.closest("[data-attach-rm]")) {
        var rm = ev.target.closest("[data-attach-rm]");
        removeAttachment(rm && rm.dataset.attachRm);
        return;
      }
      if (ev.target.closest("[data-attach-clear]")) {
        clearAttachments();
        return;
      }
      if (ev.target.closest("[data-speech-mic]")) {
        toggleDictation();
        return;
      }
      if (ev.target.closest("[data-voice-intent]")) {
        cycleSpeechIntent();
        return;
      }
      if (ev.target.closest("[data-voice-join]")) {
        var joinBtn = ev.target.closest("[data-voice-join]");
        joinVoice(joinBtn.dataset.voiceJoin, joinBtn.dataset.voicePath || null);
        return;
      }
      if (ev.target.closest("[data-voice-leave]")) {
        leaveVoice();
        return;
      }
      if (ev.target.closest("[data-voice-mute]")) {
        toggleVoiceMute();
        return;
      }
      if (ev.target.closest("[data-voice-deafen]")) {
        toggleVoiceDeafen();
        return;
      }
      if (ev.target.closest("[data-voice-input]")) {
        var modeBtn = ev.target.closest("[data-voice-input]");
        setVoiceInputMode(modeBtn.dataset.voiceInput || "vad");
        return;
      }
      if (ev.target.closest("[data-activity-perm]") ||
          ev.target.closest("[data-activity-perm-inline]")) {
        var permNow = browserNotifyPermission();
        if (permNow === "denied") {
          status("browser alerts blocked — allow notifications for this site in browser settings");
          return;
        }
        // User gesture: safe to request Notification permission.
        requestBrowserNotifications();
        return;
      }
      if (ev.target.closest("[data-activity-bell]")) {
        // First click also offers permission when still default (user gesture).
        if (browserNotifySupported() && browserNotifyPermission() === "default") {
          requestBrowserNotifications().then(function () { openActivity("all"); });
          return;
        }
        openActivity("all");
        // Already granted: refresh any pending OS alerts.
        if (browserNotifyPermission() === "granted") deliverBrowserNotifications({ silent: true });
        return;
      }
      if (ev.target.closest("[data-live-toggle]")) {
        state.live = !state.live;
        status(state.live ? "stream resumed" : "stream paused");
      }
      // Profile button + Slack-style spaces menu (outside morph mount).
      if (ev.target.closest("[data-profile-btn]")) {
        toggleProfileMenu();
        return;
      }
      if (ev.target.closest("[data-profile-signin]")) {
        closeProfileMenu();
        return openAuth("space");
      }
      if (ev.target.closest("[data-profile-claim]")) {
        closeProfileMenu();
        return openAuth("claim");
      }
      if (ev.target.closest("[data-profile-bluesky]")) {
        closeProfileMenu();
        return openAuth("login");
      }
      if (ev.target.closest("[data-profile-signout]")) return doSignOut();
      var spaceJoin = ev.target.closest("[data-space-join]");
      if (spaceJoin) {
        closeProfileMenu();
        return doJoinSpace(spaceJoin.dataset.spaceJoin);
      }
      var spaceOpen = ev.target.closest("[data-space-open]");
      if (spaceOpen) {
        closeProfileMenu();
        return doJoinSpace(spaceOpen.dataset.spaceOpen);
      }
      // Profile menu "Browse all spaces" and other data-goto outside mount.
      var barGoto = ev.target.closest("[data-goto]");
      if (barGoto && !ev.target.closest("[data-mount]")) {
        closeProfileMenu();
        return navigate(barGoto.dataset.goto, { keepCli: true });
      }
      // Click outside profile menu closes it.
      if (profileMenuOpen && !ev.target.closest("[data-profile-menu]") &&
          !ev.target.closest("[data-profile-btn]")) {
        closeProfileMenu();
      }
      if (ev.target.closest("[data-auth-cancel]")) return closeAuth();
      if (ev.target.closest("[data-auth-claim]")) {
        var h1 = ($("[data-auth-handle]") || {}).value;
        return doClaim(h1);
      }
      if (ev.target.closest("[data-auth-atproto]")) {
        var h2 = ($("[data-auth-handle]") || {}).value;
        return doAtprotoLogin(h2);
      }
      // Backdrop click dismisses the auth dialog.
      if (ev.target.matches("[data-auth-dialog]")) return closeAuth();
    });

    var authInput = $("[data-auth-handle]");
    if (authInput) {
      authInput.addEventListener("keydown", function (ev) {
        if (ev.key === "Escape") { ev.preventDefault(); return closeAuth(); }
        if (ev.key === "Enter") {
          ev.preventDefault();
          var mode = ($("[data-auth-dialog]") || {}).dataset.mode || "space";
          var h = authInput.value;
          if (mode === "claim") return doClaim(h);
          if (mode === "login") return doAtprotoLogin(h);
          // space / either: domain handle → ATProto, else claim into space.
          if (h && h.indexOf(".") !== -1) return doAtprotoLogin(h);
          return doClaim(h);
        }
      });
    }

    document.addEventListener("keydown", function (ev) {
      // Global Ctrl/Cmd+Space — available from columns as well as the prompt.
      if ((ev.ctrlKey || ev.metaKey) && (ev.key === " " || ev.code === "Space")) {
        // In editor insert mode, Ctrl+Space still opens intellisense only if not typing.
        if (!(state.editor && state.editor.focused && state.editor.active &&
              state.editor.active.mode === "insert")) {
          ev.preventDefault();
          return toggleKeys();
        }
      }

      // Esc dismiss cascade (outermost first): auth → profile → help/intel
      // (later) → filter / selection / columns. Speech stop is capture-phase.
      if (ev.key === "Escape") {
        var authDlg = $("[data-auth-dialog]");
        if (authDlg && authDlg.dataset.open === "true" && !authDlg.hidden) {
          ev.preventDefault();
          return closeAuth();
        }
        if (profileMenuOpen) {
          ev.preventDefault();
          closeProfileMenu();
          return;
        }
      }

      // Workspace tablist: arrows move selection; Delete closes (× is mouse-only).
      var wsTab = ev.target.closest && ev.target.closest(".cn-workspace-tablist [role='tab']");
      if (wsTab && !ev.altKey && !ev.ctrlKey && !ev.metaKey) {
        var wsTabs = Array.prototype.slice.call(
          document.querySelectorAll(".cn-workspace-tablist [role='tab']"),
        );
        var tabIdx = wsTabs.indexOf(wsTab);
        if (tabIdx >= 0) {
          var tabKey = ev.key;
          var nextTab = -1;
          if (tabKey === "ArrowRight") nextTab = (tabIdx + 1) % wsTabs.length;
          else if (tabKey === "ArrowLeft") nextTab = (tabIdx - 1 + wsTabs.length) % wsTabs.length;
          else if (tabKey === "Home") nextTab = 0;
          else if (tabKey === "End") nextTab = wsTabs.length - 1;
          else if ((tabKey === "Delete" || tabKey === "Backspace") && state.sessions.length > 1) {
            ev.preventDefault();
            closeSession(tabIdx);
            setTimeout(function () {
              var t = document.querySelector(".cn-workspace-tablist [role='tab'][aria-selected='true']");
              if (t) try { t.focus({ preventScroll: true }); } catch { /* fine */ }
            }, 0);
            return;
          }
          if (nextTab >= 0) {
            ev.preventDefault();
            if (nextTab !== state.activeSession) switchSession(nextTab, { keepFocus: true });
            setTimeout(function () {
              var t = document.querySelector(".cn-workspace-tablist [role='tab'][aria-selected='true']");
              if (t) try { t.focus({ preventScroll: true }); } catch { /* fine */ }
            }, 0);
            return;
          }
        }
      }

      // Terminal editor consumes keys when focused (vim modes + insert typing).
      if (state.editor && state.editor.focused && state.editor.active) {
        if (ev.target.matches && ev.target.matches("input, textarea, select") &&
            !ev.target.closest("[data-editor]")) {
          // Prompt wins when it's the target.
        } else if (editorHandleKey(ev)) {
          return;
        }
      }

      // Inputs normally own every keystroke. Exception: columns already own
      // steering (Esc from prompt, click into nav/home) but the CLI still has
      // DOM focus — then board chords (j/k/arrows/…) must reach the board.
      if (ev.target.matches("input, textarea, select")) {
        var cliEl = ev.target.hasAttribute && ev.target.hasAttribute("data-cli");
        if (state.columnFocus && cliEl && isColumnSteerKey(ev)) {
          try { ev.target.blur(); } catch { /* fine */ }
        } else {
          return;
        }
      }
      var k = ev.key;

      if (ev.key === "Escape" && (state.intelOpen || state.helpOpen)) {
        ev.preventDefault();
        closeIntel();
        render(true);
        return status("closed intellisense");
      }

      if (ev.altKey && k.toLowerCase() === "a") {
        ev.preventDefault();
        state.ai = !state.ai;
        state.columnFocus = false;
        render();
        return status(state.ai ? "ai — words are interpreted" : "cli — words are commands");
      }
      // Anything that is not steering hands focus back to the prompt, so the
      // input is where you are by default and returning is one key.
      if (k === ":" || k === "i" || k === ">") {
        ev.preventDefault();
        state.columnFocus = false;
        render();
        return focusCli();
      }
      if (k === "/") { ev.preventDefault(); state.filter = ""; state.focus = 1; render(); return status("filter: type to narrow, Esc to clear"); }
      if (k === "Escape") {
        if (state.filter) { state.filter = ""; render(true); return; }
        if (state.sessionOutFocus) {
          ev.preventDefault();
          clearSessionOutFocus();
          return focusCli();
        }
        // Esc leaves a focused thread for the channel feed before closing detail.
        if (state.threadFocus) {
          ev.preventDefault();
          focusColumns();
          return clearThreadFocus();
        }
        // Esc returns to Following feed when selection detail is open (matches [esc]).
        if (isDetailOpen()) {
          ev.preventDefault();
          focusColumns();
          return closeDetail();
        }
        state.columnFocus = false; render(); return focusCli();
      }
      if (k === "v") {
        ev.preventDefault();
        var visible = (window.NB_CONSOLE_VIEWS && window.NB_CONSOLE_VIEWS.visibleFeedViews)
          ? window.NB_CONSOLE_VIEWS.visibleFeedViews(state)
          : [{ id: "hot" }, { id: "new" }, { id: "top" }];
        var ids = visible.map(function (v) { return v.id; });
        if (!ids.length) ids = ["hot", "new", "top"];
        var cur = ids.indexOf(state.feedView || state.sort || "hot");
        var next = ids[(cur + 1) % ids.length];
        applyFeedView(next);
        return;
      }
      // tmux's z: the preview takes the whole width, and again restores.
      if (k === "z") {
        ev.preventDefault();
        focusColumns();
        return toggleNavCollapsed();
      }
      if (ev.altKey && k.toLowerCase() === "j") {
        ev.preventDefault();
        return status("the page is the terminal — no separate panel to minimise");
      }
      if (ev.altKey && k.toLowerCase() === "m") {
        ev.preventDefault();
        return status("the page is the terminal — blades fill the TUI");
      }
      if (ev.altKey && k.toLowerCase() === "d") {
        ev.preventDefault();
        return status("the page is the terminal — no dock cycle");
      }
      if (ev.altKey && k.toLowerCase() === "t") {
        ev.preventDefault();
        return newSession();
      }
      if (k.toLowerCase() === "r") { ev.preventDefault(); return mergePending(); }
      if (k.toLowerCase() === "t" && state.columnFocus) { ev.preventDefault(); return setTheme(themeIndex + 1); }

      // Home feed: j/k rows, Enter/→ open, [ ] tabs — only when home owns focus.
      if (homeOwnsKeyboard() && state.columnFocus) {
        if (k === "ArrowDown" || k === "j") {
          ev.preventDefault();
          return moveHomeCursor(1);
        }
        if (k === "ArrowUp" || k === "k") {
          ev.preventDefault();
          return moveHomeCursor(-1);
        }
        if (k === "Enter" || k === "ArrowRight" || k === "l") {
          ev.preventDefault();
          return activateHomeItem();
        }
        if (k === "ArrowLeft" || k === "h") {
          ev.preventDefault();
          return goLeft();
        }
        if (k === "[" || k === "PageUp") {
          ev.preventDefault();
          return cycleHomeTab(-1);
        }
        if (k === "]" || k === "PageDown") {
          ev.preventDefault();
          return cycleHomeTab(1);
        }
        // Don't let printable keys filter the nav while reading home.
        if (k.length === 1 && /[a-z0-9-]/i.test(k)) return;
      }

      // Home visible + nav focused: [ ] still cycle home tabs (power shortcut).
      if (onHomeFeed() && state.columnFocus && listOwnsKeyboard()) {
        if (k === "[" || k === "PageUp") {
          ev.preventDefault();
          return cycleHomeTab(-1);
        }
        if (k === "]" || k === "PageDown") {
          ev.preventDefault();
          return cycleHomeTab(1);
        }
      }

      if (k === "ArrowDown" || k === "j") { ev.preventDefault(); focusColumns(); return moveCursor(1); }
      if (k === "ArrowUp" || k === "k") { ev.preventDefault(); focusColumns(); return moveCursor(-1); }
      // → / l : slide into selected dir, open post thread, or edit a file
      if (k === "ArrowRight" || k === "l") { ev.preventDefault(); focusColumns(); return goRight(); }
      if (k === "Enter") { ev.preventDefault(); focusColumns(); return descend(); }
      // e : open terminal editor (posts included — → opens threads instead)
      if (k === "e" && state.columnFocus) {
        ev.preventDefault();
        return editCursorEntry();
      }
      // ← / h : slide back to parent (siblings of current path reappear as 1st-level)
      if (k === "ArrowLeft" || k === "h") { ev.preventDefault(); focusColumns(); return goLeft(); }
      // Space: one-level expand/collapse under the cursor (dirs only)
      if (k === " " || k === "Spacebar") {
        ev.preventDefault();
        focusColumns();
        return toggleCursorTree();
      }
      if (k === "Backspace" && !state.filter) {
        ev.preventDefault();
        focusColumns();
        // On thread: back to channel feed. On detail: close. On nav: go up.
        if (state.threadFocus) return clearThreadFocus();
        if (isDetailOpen() && (state.focus != null ? state.focus : 0) >= detailBladeIndex()) {
          return closeDetail();
        }
        return closeBlade(listBladeIndex());
      }
      if (k === "Home") { ev.preventDefault(); state.cursor = 0; return render(); }
      if (k === "End") { ev.preventDefault(); state.cursor = entries().length - 1; return render(); }

      // Incremental filter only while the nav list owns the keyboard — not
      // when reading a thread/detail pane (those keys are reserved).
      if (k.length === 1 && /[a-z0-9-]/i.test(k) && state.columnFocus &&
          listOwnsKeyboard() && isDetailOpen()) {
        state.filter += k;
        state.cursor = 0;
        render();
        status("filter: " + state.filter);
      }
      if (k === "Backspace" && state.filter) {
        ev.preventDefault();
        state.filter = state.filter.slice(0, -1);
        render();
        status(state.filter ? "filter: " + state.filter : "");
      }
    });
  }

  /**
   * Acquire the model as early as the browser permits.
   *
   * Chrome refuses `LanguageModel.create()` without a user gesture while the
   * model still needs downloading — "Requires a user gesture when availability
   * is downloading or downloadable" — so warming unconditionally at load fails
   * on a first visit and succeeds on every visit after, which is a confusing
   * thing to ship. Once it is cached, availability reports "available" and it
   * warms with no interaction at all.
   *
   * Either way it happens once and the session is reused for every turn.
   */
  async function warmModel() {
    if (!window.NB_AGENT || !window.NB_AGENT.warm) return;
    var avail = await window.NBResilient.availability();

    if (avail === "absent" || avail === "unavailable") {
      state.ai = false;
      render(true);
      return status("no on-device model here — cli mode, Alt+A to switch");
    }

    if (avail === "available") {
      status("loading the on-device model…");
      await window.NB_AGENT.warm(function (m) { if (!state.busy) status(m); });
      var st = window.NBResilient.modelState();
      if (st.state !== "ready") { state.ai = false; render(true); }
      return status(st.state === "ready"
        ? "model ready — ai mode. Alt+A for cli."
        : "model unavailable (" + (st.error || "unknown") + ") — cli mode, Alt+A to switch");
    }

    // Needs downloading, so it needs a gesture. Say so plainly and take the
    // first one that arrives rather than nagging.
    status("ai needs to fetch the on-device model once — press any key or click to start");
    var armed = false;
    var start = async function () {
      if (armed) return;
      armed = true;
      window.removeEventListener("keydown", start, true);
      window.removeEventListener("pointerdown", start, true);
      status("fetching the on-device model, once…");
      await window.NB_AGENT.warm(function (m) { if (!state.busy) status(m); });
      var st2 = window.NBResilient.modelState();
      if (st2.state !== "ready") { state.ai = false; render(true); }
      status(st2.state === "ready"
        ? "model ready — ai mode. Alt+A for cli."
        : "model unavailable (" + (st2.error || "unknown") + ") — cli mode, Alt+A to switch");
    };
    window.addEventListener("keydown", start, true);
    window.addEventListener("pointerdown", start, true);
  }

  /**
   * Epoch top-bar brand: FIGlet ANSI Shadow wordmark with a designed
   * power-on ignite, then a slow column energy wave (letterforms fixed).
   * Honours prefers-reduced-motion — static colourised mark only.
   */
  var brandBootTimer = null;
  function startBrandAnimation() {
    var host = $("[data-brand]");
    var el = $("[data-brand-art]");
    if (!el || !window.NB_ASCII || !window.NB_ASCII.brandHtml) return;
    if (brandBootTimer) {
      clearTimeout(brandBootTimer);
      brandBootTimer = null;
    }
    var reduce = false;
    try {
      reduce = !!(window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches);
    } catch { /* private / old */ }

    if (reduce) {
      el.innerHTML = window.NB_ASCII.brandHtml({ phase: "idle" });
      if (host) {
        host.dataset.phase = "idle";
        host.dataset.boot = "false";
      }
      return;
    }

    // Boot: column ignite, then settle into idle wave.
    el.innerHTML = window.NB_ASCII.brandHtml({ phase: "boot" });
    if (host) {
      host.dataset.phase = "boot";
      host.dataset.boot = "true";
    }
    brandBootTimer = setTimeout(function () {
      brandBootTimer = null;
      if (host) {
        host.dataset.boot = "false";
        host.dataset.phase = "idle";
      }
      // Re-stamp idle phase so CSS picks up the wave without a full rebuild
      // when possible; rebuild keeps morph-free and is cheap for a plaque.
      el.innerHTML = window.NB_ASCII.brandHtml({ phase: "idle" });
    }, 1100);
  }

  function boot() {
    // Probe STT availability before first paint of mic state settles.
    warmSpeechModel();
    // Restore durable page state before first paint so path, workspaces,
    // furniture and theme match the last authorized session.
    restoreBoardState();
    setTheme(themeIndex);
    warmModel();
    // Theme is Grid only — no chrome dropdown. theme_use / legacy /theme resolve NB_THEMES.
    expStyle.textContent = exp().css;
    // Experience select / thesis prose removed from chrome — console is the
    // board. Optional hosts still work if a fork reintroduces them.
    var thesis = $("[data-exp-thesis]");
    if (thesis) thesis.textContent = exp().thesis || "";
    var sel = $("[data-exp-select]");
    if (sel) {
      experiences.forEach(function (e) {
        var o = document.createElement("option");
        o.value = e.id; o.textContent = e.name;
        sel.appendChild(o);
      });
      sel.value = exp().id;
    }
    startBrandAnimation();
    if (window.NB_GRIDROAD && typeof window.NB_GRIDROAD.start === "function") {
      window.NB_GRIDROAD.start();
    }
    paintIdentity();
    paintActivityBell();
    wireGlobal();
    wireSpeech();
    wireVoice();
    wireAttach();
    wireMount();
    render();
    renderNotice();
    paintActivityBell();
    // If permission was granted on a prior visit, deliver any still-unread
    // Activity items that have not yet been pushed to the OS tray.
    if (browserNotifyPermission() === "granted") {
      deliverBrowserNotifications({ silent: true });
    }
    var bootNote = identity.kind === "guest" || identity.anonymous
      ? "Anonymous · " + (identity.spaceName || "home space") + " — Profile to sign in"
      : identity.kind === "denied"
        ? "signed out — Profile to sign in to a space"
        : (window.NB_SESSION ? window.NB_SESSION.authNote(identity) : profileLabel());
    if (speechSupported()) {
      bootNote = (bootNote ? bootNote + " · " : "") +
        "speech on — hold ` PTT · Alt+V listen · Alt+Shift+V voice mode";
    }
    var actN = unreadActivityCount();
    if (actN > 0) {
      bootNote = (bootNote ? bootNote + " · " : "") + actN + " activity";
    }
    if (browserNotifySupported()) {
      bootNote = (bootNote ? bootNote + " · " : "") + window.NB_NOTIFY.permissionLabel();
    }
    status(bootNote);
    setInterval(tick, 9000);
  }

  /**
   * File attach for chat context: picker change, drag-drop onto the prompt,
   * and paste of files/images into the CLI input.
   */
  function wireAttach() {
    document.addEventListener("change", function (ev) {
      var input = ev.target && ev.target.closest && ev.target.closest("[data-attach-input]");
      if (!input || !input.files || !input.files.length) return;
      addAttachmentFiles(input.files).then(function () {
        try { input.value = ""; } catch { /* fine */ }
        focusCli();
      });
    });

    function isPromptDropTarget(ev) {
      var t = ev.target;
      if (!t || !t.closest) return false;
      return !!(t.closest("[data-key='prompt-stack']") || t.closest(".cn-prompt") ||
        t.closest("[data-cli]") || t.closest("[data-attach-tray]") || t.closest(".cn-tui-foot"));
    }

    document.addEventListener("dragenter", function (ev) {
      if (!ev.dataTransfer) return;
      var types = ev.dataTransfer.types;
      var hasFiles = false;
      if (types) {
        for (var i = 0; i < types.length; i++) {
          if (types[i] === "Files") { hasFiles = true; break; }
        }
      }
      if (!hasFiles) return;
      if (!isPromptDropTarget(ev)) return;
      ev.preventDefault();
      if (!state.attachDrop) {
        state.attachDrop = true;
        render(true);
      }
    });
    document.addEventListener("dragover", function (ev) {
      if (!state.attachDrop && !isPromptDropTarget(ev)) return;
      if (!ev.dataTransfer) return;
      ev.preventDefault();
      try { ev.dataTransfer.dropEffect = "copy"; } catch { /* fine */ }
    });
    document.addEventListener("dragleave", function (ev) {
      if (!state.attachDrop) return;
      // Leaving the window / panel.
      var related = ev.relatedTarget;
      if (related && related.closest && related.closest(".cn-tui-foot")) return;
      state.attachDrop = false;
      render(true);
    });
    document.addEventListener("drop", function (ev) {
      if (!ev.dataTransfer) return;
      var files = window.NB_ATTACH
        ? window.NB_ATTACH.filesFromDataTransfer(ev.dataTransfer)
        : Array.prototype.slice.call(ev.dataTransfer.files || []);
      if (!files.length) return;
      // Only accept drops aimed at the terminal / prompt region.
      if (!isPromptDropTarget(ev) && !state.attachDrop) return;
      ev.preventDefault();
      state.attachDrop = false;
      addAttachmentFiles(files).then(function () { focusCli(); });
    });

    document.addEventListener("paste", function (ev) {
      var t = ev.target;
      if (!t || !t.closest) return;
      if (!t.closest("[data-cli]") && !t.closest(".cn-prompt")) return;
      var cd = ev.clipboardData;
      if (!cd) return;
      var files = window.NB_ATTACH
        ? window.NB_ATTACH.filesFromDataTransfer(cd)
        : [];
      if (!files.length && cd.files && cd.files.length) {
        files = Array.prototype.slice.call(cd.files);
      }
      if (!files.length) return;
      ev.preventDefault();
      addAttachmentFiles(files).then(function () { focusCli(); });
    });
  }

  /**
   * Discord-style speech hotkeys, capture phase so they win over the prompt
   * (PTT must not type ` into the input) and over column-mode `v` for sort.
   * Handlers no-op when SpeechRecognition is absent so a late polyfill can
   * enable the feature without rewiring.
   */
  function wireSpeech() {
    if (!window.NB_SPEECH) return;

    function blockedTarget(ev) {
      var t = ev.target;
      if (!t) return false;
      if (t.closest && t.closest("[data-auth-dialog][data-open='true']")) return true;
      if (t.matches && t.matches("select, textarea")) return true;
      return false;
    }

    document.addEventListener("keydown", function (ev) {
      if (!speechSupported()) return;
      if (blockedTarget(ev)) return;
      if (window.NB_SPEECH.isIntentModeKey && window.NB_SPEECH.isIntentModeKey(ev)) {
        ev.preventDefault();
        ev.stopPropagation();
        return cycleSpeechIntent();
      }
      if (window.NB_SPEECH.isToggleKey(ev)) {
        ev.preventDefault();
        ev.stopPropagation();
        return toggleDictation();
      }
      if (window.NB_SPEECH.isPttKey(ev)) {
        // Channel-voice PTT owns bare ` while joined in ptt mode.
        if (voiceClaimsPtt()) return;
        ev.preventDefault();
        ev.stopPropagation();
        if (ev.repeat) return;
        if (!pttHeld) {
          pttHeld = true;
          beginDictation("ptt");
        }
        return;
      }
      if (ev.key === "Escape" && state.speech && state.speech.listening) {
        ev.preventDefault();
        ev.stopPropagation();
        endDictation({ skipLeftover: true });
        return status("listening stopped");
      }
    }, true);

    document.addEventListener("keyup", function (ev) {
      if (!pttHeld) return;
      if (!window.NB_SPEECH.isPttKey(ev)) return;
      ev.preventDefault();
      ev.stopPropagation();
      pttHeld = false;
      if (speechSupported()) {
        endDictation();
        status("dictation stopped");
      }
    }, true);

    // Releasing the window mid-hold must not leave the mic open.
    window.addEventListener("blur", function () {
      if (pttHeld || (state.speech && state.speech.listening && state.speech.mode === "ptt")) {
        pttHeld = false;
        endDictation();
      }
    });
  }

  /**
   * Discord-parity channel voice hotkeys. Capture phase so PTT does not type
   * ` into the prompt. When joined in PTT mode, bare ` transmits audio instead
   * of starting speech-to-text (wireSpeech yields via voiceClaimsPtt).
   */
  function wireVoice() {
    if (!window.NB_VOICE) return;

    function blockedTarget(ev) {
      var t = ev.target;
      if (!t) return false;
      if (t.closest && t.closest("[data-auth-dialog][data-open='true']")) return true;
      if (t.matches && t.matches("select, textarea")) return true;
      return false;
    }

    document.addEventListener("keydown", function (ev) {
      if (!state.voice || !state.voice.joined) return;
      if (blockedTarget(ev)) return;
      // Ctrl+Shift+M — Discord mute toggle
      if ((ev.key === "m" || ev.key === "M") && ev.ctrlKey && ev.shiftKey && !ev.altKey && !ev.metaKey) {
        ev.preventDefault();
        ev.stopPropagation();
        toggleVoiceMute();
        return;
      }
      if (!voiceClaimsPtt()) return;
      if (!window.NB_VOICE.isVoicePttKey(ev)) return;
      ev.preventDefault();
      ev.stopPropagation();
      if (ev.repeat) return;
      if (!voicePttHeld) {
        voicePttHeld = true;
        var eng = ensureVoiceEngine();
        if (eng) eng.pttDown();
      }
    }, true);

    document.addEventListener("keyup", function (ev) {
      if (!voicePttHeld) return;
      if (!window.NB_VOICE.isVoicePttKey(ev)) return;
      ev.preventDefault();
      ev.stopPropagation();
      voicePttHeld = false;
      if (voiceEngine) voiceEngine.pttUp();
    }, true);

    window.addEventListener("blur", function () {
      if (voicePttHeld && voiceEngine) {
        voicePttHeld = false;
        voiceEngine.pttUp();
      }
    });
  }

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", boot);
  else boot();

  // The API the WebMCP tools close over. Every entry is the verb the UI itself
  // calls, so a tool cannot drift from the button it mirrors.
  window.NB_APP = {
    render: render, status: status, navigate: navigate, state: state,
    composeContext: composeContext,
    composeLabel: composeLabel,
    publishCompose: publishCompose,
    createChannel: createChannel,
    createProject: createProject,
    armReplyTo: armReplyTo,
    clearReplyTo: clearReplyTo,
    setView: function (v) {
      // Back-compat: view_set tool / chips now map onto feed projections.
      applyFeedView(v);
    },
    setSort: function (s) { applyFeedView(s); },
    setFeedQuery: setFeedQuery,
    applyFeedView: applyFeedView,
    setTheme: setTheme,
    setPromptMode: setPromptMode,
    applyTokens: applyTokens,
    mergePending: mergePending,
    setLive: function (on) { state.live = on; },
    run: run,
    runSearch: runSearch,
    pushLine: pushLine,
    toggleKeys: toggleKeys,
    openIntel: openIntel,
    // Profile + spaces (tests and WebMCP honesty).
    getIdentity: function () { return identity; },
    getPolicy: function () { return policy; },
    openAuth: openAuth,
    openProfileMenu: openProfileMenu,
    closeProfileMenu: closeProfileMenu,
    claim: doClaim,
    loginAtproto: doAtprotoLogin,
    joinSpace: doJoinSpace,
    signOut: doSignOut,
    listSpaces: listSpaces,
    profileLabel: profileLabel,
    schedulePersist: schedulePersist,
    snapshotBoard: snapshotBoard,
    // Speech-to-text (gated until on-device model is available).
    speechSupported: speechSupported,
    speechReady: speechReady,
    fetchSpeechModel: fetchSpeechModel,
    warmSpeechModel: warmSpeechModel,
    toggleDictation: toggleDictation,
    cycleSpeechIntent: cycleSpeechIntent,
    setSpeechIntent: setSpeechIntent,
    handleSpeechFinal: handleSpeechFinal,
    beginDictation: beginDictation,
    endDictation: endDictation,
    // Discord-parity channel voice (WebRTC mesh).
    voiceSupported: voiceSupported,
    joinVoice: joinVoice,
    leaveVoice: leaveVoice,
    toggleVoiceMute: toggleVoiceMute,
    toggleVoiceDeafen: toggleVoiceDeafen,
    setVoiceInputMode: setVoiceInputMode,
    runVoiceCommand: runVoiceCommand,
    findVoiceChannel: findVoiceChannel,
    // Teams-style Activity + browser Notification API.
    openActivity: openActivity,
    openNotification: openNotification,
    openMemberDm: openMemberDm,
    markNotificationRead: markNotificationRead,
    unreadActivityCount: unreadActivityCount,
    paintActivityBell: paintActivityBell,
    browserNotifySupported: browserNotifySupported,
    browserNotifyPermission: browserNotifyPermission,
    requestBrowserNotifications: requestBrowserNotifications,
    deliverBrowserNotifications: deliverBrowserNotifications,
    deliverBrowserNotification: deliverBrowserNotification,
    // Custom event hooks → Activity + browser notifications.
    broadcastHookEvent: broadcastHookEvent,
    runHooksCommand: runHooksCommand,
    // Prompt attachments for chat context.
    addAttachmentFiles: addAttachmentFiles,
    removeAttachment: removeAttachment,
    clearAttachments: clearAttachments,
    openAttachPicker: openAttachPicker,
    takeAttachments: takeAttachments,
    // Collapsible nav panes (detail-first reading).
    setNavCollapsed: setNavCollapsed,
    toggleNavCollapsed: toggleNavCollapsed,
    isNavCollapsed: isNavCollapsed,
    // Detail pane open/close.
    openDetail: openDetail,
    closeDetail: closeDetail,
    isDetailOpen: isDetailOpen,
    openThread: openThread,
    clearThreadFocus: clearThreadFocus,
    setHomeFeed: setHomeFeed,
    markHomeFeedRead: markHomeFeedRead,
    toggleAnnCollapsed: toggleAnnCollapsed,
    homeFeedUnreadCounts: homeFeedUnreadCounts,
    activateHomeItem: activateHomeItem,
    cycleHomeTab: cycleHomeTab,
    moveHomeCursor: moveHomeCursor,
    focusColumns: focusColumns,
    revealSessionChat: revealSessionChat,
    clearSessionOutFocus: clearSessionOutFocus,
    setPersonPane: setPersonPane,
    currentDmPeer: currentDmPeer,
    // Terminal file editor.
    openFileInEditor: openFileInEditor,
    focusEditor: focusEditor,
    blurEditor: blurEditor,
    getEditor: function () { return ensureEditorState().active; },
  };

  // Tools are registered once the app exists, because they call into it.
  if (window.NB_TOOLS) {
    var registered = window.NB_TOOLS.install(window.NB_APP);
    var native = window.NB_MCP.isNative();
    // Recorded rather than announced: the count matters when a tool goes
    // missing, and the native/shim distinction matters when debugging why a
    // browser agent cannot see them.
    window.NB_APP.toolCount = registered;
    window.NB_APP.toolHost = native ? "document.modelContext" : "in-page registry";
    // No Epoch terminal banner — the masthead carries brand. Tools register
    // silently; counts are available on NB_APP for debugging.
    state.lines = (state.sessions[0].lines || []).slice();
    // Drop any restored cold-start banners from older sessions.
    state.lines = state.lines.filter(function (ln) { return ln.kind !== "banner"; });
    state.sessions[0].lines = state.lines.slice();
    render();
  }
})();
