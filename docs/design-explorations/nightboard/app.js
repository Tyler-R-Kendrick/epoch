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
      attachments: [],
      editorPath: null,
      editorFocused: false,
    };
  }

  var SESSION_FIELDS = [
    "path", "cursor", "focus", "sort", "filter", "feedQuery", "feedView", "prev",
    "folded", "votes", "reactions", "treeOpen",
    "history", "histIndex", "lines", "openTools", "busy",
    "detailOpen",
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
    history: [],
    histIndex: -1,
    lines: [],
    openTools: {},
    votes: {},
    // reactions[postId] = { counts: { "+1": n }, mine: { "+1": true } }
    reactions: {},
    reactPick: null,
    treeOpen: {},
    prev: "/",
    ai: true,
    busy: false,
    folded: {},
    panes: null,
    sessions: [makeSession("/projects/community/channels/general")],
    activeSession: 0,
    // Speech-to-text: only meaningful when NB_SPEECH reports support.
    speech: {
      supported: !!(window.NB_SPEECH && window.NB_SPEECH.isSupported()),
      listening: false,
      mode: null,
      interim: "",
      error: null,
    },
    // Teams-style Activity: ids the session has marked read.
    notifRead: loadNotifRead(),
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

  function speechSupported() {
    return !!(window.NB_SPEECH && window.NB_SPEECH.isSupported());
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

  function paintSpeechInterim(interim) {
    state.speech.interim = interim || "";
    var input = $("[data-cli]");
    if (!input) return;
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
    }
    var prompt = $(".cn-prompt");
    if (prompt) prompt.dataset.speech = state.speech.listening ? (state.speech.mode || "on") : "off";
    if (st.error) status(st.error);
    else if (st.listening && st.mode === "ptt") status("listening — release ` to stop (push-to-talk)");
    else if (st.listening && st.mode === "toggle") status("listening — Alt+V or Esc to stop");
  }

  function ensureSpeechEngine() {
    if (!speechSupported()) return null;
    if (speechEngine) return speechEngine;
    speechEngine = window.NB_SPEECH.create({
      onFinal: appendSpeechPhrase,
      onPartial: paintSpeechInterim,
      onState: onSpeechState,
    });
    return speechEngine;
  }

  function beginDictation(mode) {
    if (!speechSupported()) {
      status("speech-to-text not available in this browser");
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

  function endDictation() {
    if (!speechEngine) return;
    // Capture interim before stop() clears engine state.
    var leftover = state.speech.interim;
    speechEngine.stop();
    pttHeld = false;
    if (leftover) {
      appendSpeechPhrase(leftover);
      state.speech.interim = "";
      return;
    }
    cliValue = speechBase || cliValue;
    var input = $("[data-cli]");
    if (input) input.value = cliValue;
    recompute();
    render(true);
  }

  function toggleDictation() {
    if (!speechSupported()) {
      status("speech-to-text not available in this browser");
      return;
    }
    var eng = ensureSpeechEngine();
    if (!eng) return;
    if (state.speech.listening) {
      endDictation();
      status("dictation stopped");
      return;
    }
    beginDictation("toggle");
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
      var relay = s.relay || {};
      var lock = s.guestsAllowed === false ? "members" : "open";
      var relayBit = (relay.protocol || "relay") + "·" + (relay.status || "idle");
      return '<button type="button" class="nb-profile-item" role="menuitem" data-space-join="' +
        escAttr(s.id) + '"' + (current ? ' aria-current="true"' : "") +
        ' title="' + escAttr((s.slug || s.id) + " · " + (s.description || "") + " · " + (relay.url || "")) + '">' +
        '<span class="nb-space-short">' + escHtml(s.short || s.id.slice(0, 4).toUpperCase()) + "</span>" +
        "<span>" + escHtml(s.name) +
        '<span class="nb-profile-item-sub">' + escHtml(s.slug || "") + " · " + escHtml(relayBit) +
        " · " + (s.subscribers || 0) + " subs</span></span>" +
        '<span class="nb-profile-item-desc">' + (current ? "current" : lock) + "</span>" +
        "</button>";
    }).join("");
    var signedIn = identity.kind === "claimed" || identity.kind === "atproto";
    var relayNow = identity.relay || {};
    menu.innerHTML =
      '<div class="nb-profile-head">' +
      '<div class="nb-profile-head-name">' + escHtml(label) + "</div>" +
      '<div class="nb-profile-head-note">' + escHtml(note) + "</div>" +
      '<div class="nb-profile-head-space">' + escHtml(detail) + "</div>" +
      (relayNow.url
        ? '<div class="nb-profile-head-space">relay ' + escHtml(relayNow.protocol || "nostr") +
          " · " + escHtml(relayNow.status || "idle") +
          (relayNow.write ? " · write" : " · read-only") + "</div>"
        : "") +
      "</div>" +
      '<div class="nb-profile-section">' +
      '<div class="nb-profile-section-title">Spaces · relays · subreddits</div>' +
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
        ? '<button type="button" class="nb-profile-item" role="menuitem" data-profile-bluesky>Sign in with Bluesky…</button>'
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
        : mode === "login" ? "Sign in with Bluesky"
        : "Sign in to a space";
    }
    if (lead) {
      lead.textContent = mode === "claim"
        ? "Bind a local handle to this anonymous principal in the selected space."
        : mode === "login"
          ? "Bluesky-style ATProto auth into a space: enter a handle. Mock OAuth → did:plc."
          : "Pick a Slack-style space and a handle. Members-only spaces require sign-in.";
    }
    if (claimBtn) {
      claimBtn.hidden = mode === "login";
      claimBtn.textContent = mode === "claim" ? "Claim identity" : "Sign in to space";
      claimBtn.disabled = mode === "login";
    }
    if (atBtn) {
      atBtn.hidden = mode === "claim";
      atBtn.textContent = "Bluesky + space";
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
        ? "anonymous in " + next.spaceName +
          (next.relay ? " · relay " + (next.relay.status || "idle") : "")
        : "in " + next.spaceName + " as " + (next.displayName || next.handle) +
          (next.relay ? " · relay " + (next.relay.status || "idle") : ""),
        "space.joined");
      // Land on the space hub so relay / feed / channels are visible.
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
        ["path", "cursor", "focus", "sort", "filter", "feedQuery", "feedView", "prev", "ai", "live", "nextId"].forEach(function (k) {
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
      if (k === "lines" || k === "history") sess[k] = (state[k] || []).slice();
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
    state.feedQueryError = null;
    state.prev = sess.prev || "/";
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

  function switchSession(i) {
    if (i === state.activeSession || i < 0 || i >= state.sessions.length) return;
    freezeSession();
    thawSession(i);
    recompute();
    render();
    focusCli();
  }

  function newSession() {
    freezeSession();
    // Isolated worktree: default home path + empty transcript/history —
    // never inherit the previous tab's path, filter, editor, or attachments.
    var sess = makeSession(DEFAULT_WORKSPACE_PATH);
    seedBanner(sess);
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

  function seedBanner(sess) {
    var target = sess || state;
    var lines = target.lines || (target.lines = []);
    var text = window.NB_ASCII.banner(
      {
        name: window.NB_DATA.board.name,
        node: (sess && sess.path) || state.path,
        epoch: window.NB_DATA.board.epoch,
        landed: window.NB_DATA.board.landed,
        total: window.NB_DATA.board.total,
        ships: window.NB_DATA.board.ships,
      },
      window.NB_APP && window.NB_APP.toolCount != null ? window.NB_APP.toolCount : "?",
      window.NB_APP && window.NB_APP.toolHost ? window.NB_APP.toolHost : "…",
      Math.floor(Math.min(document.documentElement.clientWidth, 640) / 10) - 4,
    );
    lines.unshift({ id: nextLineId("B"), kind: "banner", text: text });
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
    var sel = $("[data-theme-select]"); if (sel) sel.value = t.id;
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
    schedulePersist();
  }

  /** Move the menu highlight without re-rendering the input under the caret. */
  function highlightCandidate() {
    var menu = document.querySelector(".cn-menu");
    if (!menu) return;
    Array.prototype.forEach.call(menu.children, function (el, i) {
      if (i === state.candIndex) {
        el.setAttribute("aria-current", "true");
        el.scrollIntoView({ block: "nearest" });
      } else {
        el.removeAttribute("aria-current");
      }
    });
  }

  function paintGhost() {
    var input = $("[data-cli]");
    var ghost = $("[data-ghost]");
    if (!input || !ghost) return;
    var c = state.completion;
    ghost.textContent = c && c.ghost ? input.value + c.ghost : "";
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

  /** Show the detail pane (e.g. after selecting a file). */
  function openDetail(opts) {
    opts = opts || {};
    state.detailOpen = true;
    if (opts.focus !== false) state.focus = detailBladeIndex();
    if (!opts.noRender) render(true);
    if (!opts.silent) status("detail open");
    return true;
  }

  /** Hide the detail pane entirely — nav takes the row. */
  function closeDetail(opts) {
    opts = opts || {};
    state.detailOpen = false;
    state.focus = listBladeIndex();
    if (state.editor) state.editor.focused = false;
    // Expand nav if it was collapsed for detail-first reading.
    if (state.panes && state.panes.zoom) {
      state.panes.zoom = false;
      savePanes();
    }
    if (!opts.noRender) render(true);
    if (!opts.silent) status("detail closed · nav only");
    return true;
  }

  /**
   * Close / × on a blade:
   *   nav (0)    → reload nav at parent path (up)
   *   detail (1) → hide detail pane entirely
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
        state.focus = detailBladeIndex();
        render(opts && opts.keepCli);
        return true;
      }
      return false;
    }
    state.prev = state.path;
    state.path = target;
    state.cursor = 0;
    state.filter = "";
    // Drop one-level peeks when the nav reloads into a new branch.
    if (state.treeOpen) {
      Object.keys(state.treeOpen).forEach(function (k) {
        if (k.indexOf(target + "/") === 0 || k === target) delete state.treeOpen[k];
      });
    }
    // Land on the single nav blade — same pane, new branch of subnodes.
    state.focus = listBladeIndex();
    render(opts && opts.keepCli);
    return true;
  }

  function moveCursor(delta) {
    // Keyboard navigation acts on the current path's list blade; parent blades
    // re-scope only via click or close (they display the path dependency).
    // When the terminal editor is focused, list motion yields to the editor.
    if (state.editor && state.editor.focused) return;
    var list = visible();
    if (!list.length) return;
    var all = entries();
    var currentName = all[state.cursor] ? all[state.cursor].name : null;
    var vi = list.findIndex(function (e) { return e.name === currentName; });
    if (vi === -1) vi = 0;
    var next = Math.max(0, Math.min(list.length - 1, vi + delta));
    state.cursor = all.findIndex(function (e) { return e.name === list[next].name; });
    state.focus = listBladeIndex();
    // Selecting a new list row leaves the editor focus.
    if (state.editor) state.editor.focused = false;
    render();
  }

  function moveBladeFocus(delta) {
    // If detail is closed, → opens it; ← does nothing extra.
    if (delta > 0 && !isDetailOpen()) {
      openDetail({ silent: true });
      return;
    }
    var max = isDetailOpen() ? detailBladeIndex() : listBladeIndex();
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
    var dest = MAP.dmPath ? MAP.dmPath(handle) : ("/dms/" + handle);
    if (navigate(dest, { keepCli: !!opts.keepCli })) {
      if (!opts.silent) status("dm · @" + handle);
      return true;
    }
    // Ensure known members can open even if sitemap lag; land on /dms.
    var known = (window.NB_DATA.members || []).some(function (m) {
      return m.handle === handle;
    });
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
      // Detail content: free width for the activity source path.
      setNavCollapsed(true, { silent: true, noRender: true });
      return;
    }
    // File / post detail — open detail pane; collapse nav so content can breathe.
    state.detailOpen = true;
    state.focus = detailBladeIndex();
    setNavCollapsed(true, { silent: true, noRender: true });
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
   * Right arrow: if the list has a directory selected, slide into it;
   * otherwise move focus toward the detail blade.
   */
  function goRight() {
    var list = entries();
    var e = list[state.cursor];
    var onList = (state.focus == null || state.focus <= listBladeIndex());
    if (onList && e && e.kind === "dir") return descend();
    return moveBladeFocus(1);
  }

  /**
   * Left arrow: if focused on detail, return to list; else slide to parent.
   */
  function goLeft() {
    return ascend();
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
    return c.candidates.length > 1 && typed.length > 0;
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
   * Ctrl+Space: intellisense + hotkey cheatsheet scoped to this workspace.
   * Context is frozen *before* focus moves into the prompt, so opening from
   * columns still lists column/thread keys for the surfaces that were active.
   */
  function openIntel() {
    // Freeze first — columnFocus, path, thread presence, panel furniture.
    if (window.NB_HELP && window.NB_HELP.buildContext) {
      state.helpCtx = window.NB_HELP.buildContext(state);
    } else {
      state.helpCtx = {
        path: state.path, focus: state.columnFocus ? "columns" : "prompt",
        surfaces: ["workspace", "columns", "terminal", "prompt"],
        hasThread: false, sessions: (state.sessions || []).length || 1,
        session: (state.activeSession || 0) + 1, sort: state.sort || "hot",
        dock: (state.panes && state.panes.dock) || "bottom", ai: !!state.ai,
      };
    }
    state.columnFocus = false;
    if (state.panes && state.panes.out) {
      state.panes.out = false;
      savePanes();
    }
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
    var where = state.helpCtx && state.helpCtx.path ? state.helpCtx.path : state.path;
    status("keys for " + where + " — Esc closes");
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
    if (!c || !c.ghost) return false;
    cliValue = cliValue + c.ghost;
    recompute();
    render(true);
    var el = $("[data-cli]");
    if (el) { el.focus({ preventScroll: true }); el.setSelectionRange(cliValue.length, cliValue.length); }
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
      reply = window.NB_COMPLETE.COMMANDS.map(function (c) {
        return c.name + (c.arg ? " <" + c.arg + ">" : "") + "  " + c.help;
      }).join("\n");
    } else if (cmd === "clear") {
      state.lines = state.lines.filter(function (ln) { return ln.kind === "banner"; });
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
    var pane = $(".cn-out");
    if (pane) pane.scrollTop = pane.scrollHeight;
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
    } else if (ev.type === E.TEXT_MESSAGE_CONTENT) {
      if (ev.delta) pushLine({ kind: "agent", text: ev.delta });
    } else if (ev.type === E.RUN_ERROR) {
      pushLine({ kind: "error", text: ev.message || "run failed" });
    } else {
      return;
    }
    if (state.sessions[state.activeSession]) {
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
    var here = (MAP.list(state.path, state.merged) || []).map(function (e) { return e.name; });
    var turn = beginUserTurn(text, "ai");
    try {
      await window.NB_AGENT.run(turn.agentInput, {
        cwd: state.path,
        here: here,
        signal: undefined,
        attachments: turn.attachments,
        displayInput: turn.display,
      }, onEvent);
    } finally {
      state.busy = false;
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
               run === "grep" || run === "tail" || run === "watch" || run === "stat" ||
               run === "clear") {
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
    } else if (run === "ai") {
      state.ai = true;
      reply = "ai mode — slash commands still run directly";
    } else if (run === "cli") {
      state.ai = false;
      reply = "cli mode — type commands without a slash";
    } else if (run === "slash-help") {
      reply = window.NB_COMPLETE.SLASH_COMMANDS.map(function (c) {
        return c.name + (c.arg ? " <" + c.arg + ">" : "") + "  " + c.help;
      }).join("\n");
    } else if (run === "keys") {
      openIntel();
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
      cliValue = arg ? "reply to someone: " + arg : "reply to @";
      recompute();
      render(true);
      focusCli();
      return true;
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
    } else if (run === "spaces" || run === "space") {
      if (!arg) {
        // Markdown table — colour-coded ASCII table in the transcript.
        var rows = listSpaces().map(function (s) {
          var r = s.relay || {};
          return [
            identity.spaceId === s.id ? "*" + s.id : s.id,
            s.slug || s.id,
            (r.protocol || "relay") + ":" + (r.status || "idle"),
            s.guestsAllowed === false ? "members" : "open",
            String(s.subscribers || 0),
          ];
        });
        reply = "## Spaces\n\n" +
          "Relay · workspace · subreddit — join with `/space <id>`.\n\n" +
          "| id | slug | relay | access | subs |\n" +
          "| --- | --- | --- | --- | --- |\n" +
          rows.map(function (r) {
            return "| " + r.join(" | ") + " |";
          }).join("\n") +
          "\n\n**current:** `" + (identity.spaceId || "?") + "`" +
          (identity.relay ? " · relay **" + identity.relay.status + "**" : "") +
          "\n\nBrowse `/spaces` or open a hub feed.";
      } else {
        doJoinSpace(arg.trim().replace(/^r\//, ""));
        return true;
      }
    } else if (run === "dm") {
      // Open a direct message thread with a person or agent (sibling of projects).
      var handle = String(arg || "").trim().replace(/^@/, "").toLowerCase();
      if (!handle) {
        if (navigate("/dms", { keepCli: true })) reply = "/dm: " + state.path;
        else reply = "/dm: cannot open /dms";
      } else {
        var dmDest = "/dms/" + handle;
        // Prefer an existing DM thread; otherwise still open the path so the
        // board can show an empty conversation for a known member.
        if (!navigate(dmDest, { keepCli: true })) {
          var memberHit = (window.NB_DATA.members || []).filter(function (m) {
            return m.handle === handle;
          })[0];
          if (memberHit && navigate("/dms", { keepCli: true })) {
            reply = "/dm: no thread with @" + handle + " yet — at /dms";
          } else {
            reply = "/dm: no such person or agent: " + handle;
          }
        } else {
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
    } else if (run === "hooks" || run === "hook") {
      reply = runHooksCommand(arg);
    } else if (run === "login") {
      if (arg) {
        doAtprotoLogin(arg);
        return true;
      }
      openAuth("login");
      reply = "sign in to a space with Bluesky — dialog or /login maya.bsky.social";
    } else if (run === "claim") {
      if (!identity.claimable && identity.kind !== "guest") {
        reply = identity.kind === "atproto"
          ? "already linked to ATProto — claim not needed"
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
    } else {
      reply = verb + ": not implemented";
    }

    if (reply != null) pushLine({ kind: "out", text: reply });
    if (state.sessions[state.activeSession]) {
      state.sessions[state.activeSession].path = state.path;
    }
    cliValue = "";
    recompute();
    render();
    scrollOut();
    return true;
  }

  /** Map a slash run-id onto the existing CLI runner without double-logging the user. */
  function runSlashViaCli(synthetic) {
    run(synthetic, { silentUser: true });
    return true;
  }

  function focusCli() {
    var el = $("[data-cli]");
    if (el) { el.focus({ preventScroll: true }); el.setSelectionRange(el.value.length, el.value.length); }
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
      // Reaction pills (+1, eyes, …) and the + picker.
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
        state.columnFocus = false;
        state.ai = true;
        cliValue = "reply to @" + who + ": ";
        render(true);
        focusCli();
        return status("reply to @" + who + " — send from the prompt");
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
      var sortBtn = ev.target.closest("[data-sort]");
      if (sortBtn) {
        // Legacy sort chips also act as simple view projections.
        applyFeedView(sortBtn.dataset.sort);
        return;
      }
      var viewBtn = ev.target.closest("[data-feed-view]");
      if (viewBtn) {
        applyFeedView(viewBtn.dataset.feedView);
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
      // Terminal panel chrome (VS Code panel actions).
      if (ev.target.closest("[data-panel-min]")) {
        state.panes.out = !state.panes.out;
        // Minimise always leaves maximise — a maximised-and-minimised panel
        // still claimed the workbench column and looked like a black void.
        if (state.panes.out) state.panes.outMax = false;
        savePanes();
        return render(true);
      }
      if (ev.target.closest("[data-panel-max]")) {
        state.panes.outMax = !state.panes.outMax;
        if (state.panes.outMax) state.panes.out = false;
        savePanes();
        return render(true);
      }
      if (ev.target.closest("[data-panel-dock]")) {
        var order = ["bottom", "right", "left"];
        state.panes.dock = order[(order.indexOf(state.panes.dock) + 1) % order.length];
        savePanes();
        render(true);
        return status("terminal docked " + state.panes.dock + " — Alt+D to cycle");
      }
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
        if (state.panes.out) { state.panes.out = false; savePanes(); }
        return newSession();
      }
      var sessTab = ev.target.closest("[data-session]");
      if (sessTab) {
        // Clicking a workspace tab restores a minimised panel, VS Code style.
        // Same-tab clicks must still re-render — switchSession no-ops when the
        // index is already active.
        if (state.panes.out) {
          state.panes.out = false;
          savePanes();
        }
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
      var go = ev.target.closest("[data-goto]");
      if (go) {
        try { ev.preventDefault(); } catch { /* fine */ }
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
        // Detail content: collapse nav rails so the thread uses the width.
        setNavCollapsed(true, { silent: true, noRender: true });
        var fileEntry = all[state.cursor];
        state.detailOpen = true;
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
      recompute();
      // Repaint the menu without stealing focus or resetting the caret.
      var menu = mount.querySelector(".cn-menu");
      var wrap = mount.querySelector(".cn-panel");
      state.candIndex = 0;
      // Typing keeps intellisense in sync when it was opened via Ctrl+Space.
      if (wrap) wrap.dataset.open = String(menuShouldOpen());
      if (menu) {
        menu.innerHTML = (state.completion ? state.completion.candidates : []).slice(0, 40)
          .map(function (c, i) {
            return '<div class="cn-cand" data-cand="' + i + '"' + (i === 0 ? ' aria-current="true"' : "") +
              '><span>' + c.value + "</span><i>" + (c.hint || "") + "</i></div>";
          }).join("");
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
        var cc = state.completion;
        // Enter accepts a suggestion when intellisense is open, when the user
        // has moved the highlight off the first multi-candidate row, or when a
        // smart-marker palette (`@` / `#`) has an incomplete match. A fully
        // typed `@maya` / `#topic` sends instead of re-accepting.
        var pick = cc && cc.candidates.length
          ? cc.candidates[Math.min(state.candIndex, cc.candidates.length - 1)]
          : null;
        var frag = cc && pick ? cliValue.slice(cc.replaceFrom) : "";
        var markerIncomplete = cc && pick && window.NB_COMPLETE.isMarkerKind &&
          window.NB_COMPLETE.isMarkerKind(cc.kind) && frag !== pick.value;
        var acceptIntel = pick &&
          (state.intelOpen || markerIncomplete || (cc.candidates.length > 1 && state.candIndex > 0));
        if (acceptIntel) {
          applyCandidate(pick.value, cc);
          cli.value = cliValue;
          closeIntel();
          recompute();
          render(true);
          focusCli();
          return;
        }
        var text = cli.value;
        // Allow send with only attachments staged (chat context turn).
        if (!String(text || "").trim() && !(state.attachments && state.attachments.length)) {
          return;
        }
        cliValue = "";
        cli.value = "";
        closeIntel();
        recompute();
        // Slash commands always run locally (agent chat verbs). Bare CLI
        // commands also run directly. Free text in ai mode goes to the model.
        if (window.NB_COMPLETE.isSlash(text)) {
          render(true);
          return runSlash(text);
        }
        if (state.ai && (!String(text || "").trim() || !isCommand(text))) {
          render(true);
          return ask(text);
        }
        return run(text);
      }
      if (ev.key === "Escape") {
        ev.preventDefault();
        // Dictation Esc is handled in capture-phase wireSpeech; if we still
        // see it here, fall through to intel / columns.
        if (closeIntel()) {
          render(true);
          focusCli();
          return status("closed intellisense");
        }
        // Esc hands steering to the columns; it does not close anything,
        // because the prompt is the default place to be.
        state.columnFocus = true;
        cli.blur();
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
        state.panes.out = !state.panes.out;
        if (state.panes.out) state.panes.outMax = false;
        savePanes();
        render(true);
        return status(state.panes.out ? "terminal minimised — Alt+J or Terminal tab to restore" : "terminal restored");
      }
      if (ev.altKey && ev.key.toLowerCase() === "m") {
        ev.preventDefault();
        state.panes.outMax = !state.panes.outMax;
        if (state.panes.outMax) state.panes.out = false;
        savePanes();
        render(true);
        return status(state.panes.outMax ? "terminal maximised — Alt+M to restore" : "terminal restored");
      }
      if (ev.altKey && ev.key.toLowerCase() === "d") {
        ev.preventDefault();
        var docks = ["bottom", "right", "left"];
        state.panes.dock = docks[(docks.indexOf(state.panes.dock) + 1) % docks.length];
        savePanes();
        render(true);
        return status("terminal docked " + state.panes.dock);
      }
      if (ev.altKey && ev.key.toLowerCase() === "t") {
        ev.preventDefault();
        if (state.panes.out) { state.panes.out = false; savePanes(); }
        return newSession();
      }
      if (ev.key === "ArrowRight" || ev.key === "End") {
        if (cli.selectionStart === cli.value.length && acceptGhost()) ev.preventDefault();
        return;
      }
      if (ev.key === "ArrowUp" || ev.key === "ArrowDown") {
        ev.preventDefault();
        var c = state.completion;
        // With a menu open, the arrows belong to the menu; history is what
        // they mean only when there is nothing to choose between.
        if (c && c.candidates.length > 1) {
          var n = c.candidates.length;
          state.candIndex = ((state.candIndex + (ev.key === "ArrowDown" ? 1 : -1)) % n + n) % n;
          highlightCandidate();
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
          if (state.intelOpen && state.helpOpen) {
            closeIntel();
            render(true);
            focusCli();
            return status();
          }
          return openIntel();
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

      if (ev.target.matches("input, textarea, select")) return;
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
        // Esc closes the detail pane when it is open (matches × on detail).
        if (isDetailOpen()) {
          ev.preventDefault();
          state.columnFocus = true;
          return closeDetail();
        }
        state.columnFocus = false; render(); return focusCli();
      }
      if (k === "v") {
        ev.preventDefault();
        var sorts = (window.NB_CONSOLE_VIEWS && window.NB_CONSOLE_VIEWS.SORTS) || ["hot", "new", "top", "best"];
        state.sort = sorts[(sorts.indexOf(state.sort) + 1) % sorts.length];
        render();
        return status("sort: " + state.sort);
      }
      // tmux's z: the preview takes the whole width, and again restores.
      if (k === "z") {
        ev.preventDefault();
        state.columnFocus = true;
        return toggleNavCollapsed();
      }
      if (ev.altKey && k.toLowerCase() === "j") {
        ev.preventDefault();
        state.panes.out = !state.panes.out;
        if (state.panes.out) state.panes.outMax = false;
        savePanes(); render(true);
        return status(state.panes.out ? "terminal minimised — Alt+J or Terminal tab to restore" : "terminal restored");
      }
      if (ev.altKey && k.toLowerCase() === "m") {
        ev.preventDefault();
        state.panes.outMax = !state.panes.outMax;
        if (state.panes.outMax) state.panes.out = false;
        savePanes(); render(true);
        return status(state.panes.outMax ? "terminal maximised — Alt+M to restore" : "terminal restored");
      }
      if (ev.altKey && k.toLowerCase() === "d") {
        ev.preventDefault();
        var docksG = ["bottom", "right", "left"];
        state.panes.dock = docksG[(docksG.indexOf(state.panes.dock) + 1) % docksG.length];
        savePanes(); render(true);
        return status("terminal docked " + state.panes.dock);
      }
      if (ev.altKey && k.toLowerCase() === "t") {
        ev.preventDefault();
        if (state.panes.out) { state.panes.out = false; savePanes(); }
        return newSession();
      }
      if (k.toLowerCase() === "r") { ev.preventDefault(); return mergePending(); }
      if (k.toLowerCase() === "t" && state.columnFocus) { ev.preventDefault(); return setTheme(themeIndex + 1); }

      if (k === "ArrowDown" || k === "j") { ev.preventDefault(); state.columnFocus = true; return moveCursor(1); }
      if (k === "ArrowUp" || k === "k") { ev.preventDefault(); state.columnFocus = true; return moveCursor(-1); }
      // → / l : slide into selected dir (children become 1st-level) or focus detail
      if (k === "ArrowRight" || k === "l") { ev.preventDefault(); state.columnFocus = true; return goRight(); }
      if (k === "Enter") { ev.preventDefault(); state.columnFocus = true; return descend(); }
      // ← / h : slide back to parent (siblings of current path reappear as 1st-level)
      if (k === "ArrowLeft" || k === "h") { ev.preventDefault(); state.columnFocus = true; return goLeft(); }
      // Space: one-level expand/collapse under the cursor (dirs only)
      if (k === " " || k === "Spacebar") {
        ev.preventDefault();
        state.columnFocus = true;
        return toggleCursorTree();
      }
      if (k === "Backspace" && !state.filter) {
        ev.preventDefault();
        state.columnFocus = true;
        // On detail: close the pane. On nav: go up one level.
        if (isDetailOpen() && (state.focus != null ? state.focus : 0) >= detailBladeIndex()) {
          return closeDetail();
        }
        return closeBlade(listBladeIndex());
      }
      if (k === "Home") { ev.preventDefault(); state.cursor = 0; return render(); }
      if (k === "End") { ev.preventDefault(); state.cursor = entries().length - 1; return render(); }

      // Any printable key starts an incremental filter, the way a file manager
      // does — no mode to enter, no key to remember. Space is reserved for tree.
      if (k.length === 1 && /[a-z0-9-]/i.test(k) && state.columnFocus) {
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
    // Restore durable page state before first paint so path, workspaces,
    // furniture and theme match the last authorized session.
    restoreBoardState();
    setTheme(themeIndex);
    warmModel();
    var tsel = $("[data-theme-select]");
    if (tsel) {
      window.NB_THEMES.forEach(function (t) {
        var o = document.createElement("option");
        o.value = t.id; o.textContent = t.name;
        tsel.appendChild(o);
      });
      tsel.value = window.NB_THEMES[themeIndex] ? window.NB_THEMES[themeIndex].id : window.NB_THEMES[0].id;
      tsel.addEventListener("change", function () {
        window.NB_THEMES.forEach(function (t, i) { if (t.id === tsel.value) setTheme(i); });
      });
    }
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
    paintIdentity();
    paintActivityBell();
    wireGlobal();
    wireSpeech();
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
        "speech on — hold ` push-to-talk, Alt+V toggle";
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
        t.closest("[data-cli]") || t.closest("[data-attach-tray]") || t.closest(".cn-panel"));
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
      if (related && related.closest && related.closest(".cn-panel")) return;
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
      if (window.NB_SPEECH.isToggleKey(ev)) {
        ev.preventDefault();
        ev.stopPropagation();
        return toggleDictation();
      }
      if (window.NB_SPEECH.isPttKey(ev)) {
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
        endDictation();
        return status("dictation stopped");
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

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", boot);
  else boot();

  // The API the WebMCP tools close over. Every entry is the verb the UI itself
  // calls, so a tool cannot drift from the button it mirrors.
  window.NB_APP = {
    render: render, status: status, navigate: navigate, state: state,
    setView: function (v) {
      // Back-compat: view_set tool / chips now map onto feed projections.
      applyFeedView(v);
    },
    setSort: function (s) { applyFeedView(s); },
    setFeedQuery: setFeedQuery,
    applyFeedView: applyFeedView,
    setTheme: setTheme,
    applyTokens: applyTokens,
    mergePending: mergePending,
    setLive: function (on) { state.live = on; },
    run: run,
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
    // Speech-to-text (no-ops when unsupported).
    speechSupported: speechSupported,
    toggleDictation: toggleDictation,
    beginDictation: beginDictation,
    endDictation: endDictation,
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
    // The cold-start banner states only facts the board can actually assert —
    // its name, its epoch and how many tools are really registered — which is
    // why it can be drawn at all. It is written after tools install because
    // the count is one of those facts. Skip when a durable session already
    // restored a transcript so reloads do not double-banner.
    if (!state.sessions[0].lines || !state.sessions[0].lines.length) {
      seedBanner(state.sessions[0]);
    }
    state.lines = state.sessions[0].lines.slice();
    render();
  }
})();
