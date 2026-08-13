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
  var D = window.CW_DATA;
  var MAP = window.CW_MAP;

  /** Following stack window: initial page size and refill trigger. */
  var HOME_FOLLOW_PAGE = 4;
  var HOME_FOLLOW_REFILL_AT = 2;

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
      reposts: {},
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
      feedMark: null,
      attachments: [],
      editorPath: null,
      editorFocused: false,
    };
  }

  var SESSION_FIELDS = [
    "path", "cursor", "focus", "sort", "filter", "feedQuery", "feedView", "feedPinnedViews", "prev",
    "folded", "votes", "reactions", "reposts", "treeOpen",
    "history", "histIndex", "lines", "openTools", "busy",
    "detailOpen", "homeFeed", "homeCursor", "threadFocus", "feedMark",
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
    // Lucene query row is a power fold — closed until toggled or a query is active.
    feedQueryOpen: false,
    feedQueryError: null,
    merged: [],
    // Live queue keyed by channel/space feed; `pending` mirrors the open feed.
    pendingByFeed: {},
    pending: [],
    nextId: 1,
    live: true,
    cliOpen: false,
    intelOpen: false,
    helpOpen: false,
    helpCtx: null,
    keysOnboard: false,
    completion: null,
    candIndex: -1,
    feedBusy: false,
    sessionRecovery: null,
    // The first durable local principal owns the fixture-backed private inbox.
    // Sign-out mints a different principal and must not transfer this ACL.
    dmOwnerPrincipalId: null,
    layers: [],
    navigationVisits: [],
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
    // Session chat blade starts closed — opens on agent/CLI transcript activity.
    // User can dismiss it; transcript may remain until `clear`.
    sessionClosed: true,
    votes: {},
    // reactions[postId] = { counts: { "+1": n }, mine: { "+1": true } }
    reactions: {},
    reposts: {},
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
      supported: !!(window.CW_SPEECH && window.CW_SPEECH.isSupported()),
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
      supported: !!(window.CW_VOICE && window.CW_VOICE.isSupported()),
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
    // Dismissed following face posts (identity reappears with next latest).
    homeFeedDismissed: loadHomeFeedDismissed(),
    // Visible window for rolled-up following stacks (grows on refill).
    homeFollowVisible: HOME_FOLLOW_PAGE,
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
    // Right-click context menu + agent-bound context chips (id/name above CLI).
    ctxMenu: null,
    boundContext: [],
    cdPreviewPath: null,
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
    // Marked root post while browsing a channel feed in detail (no thread yet).
    feedMark: null,
  };
  state.panes = loadPanes();

  function canonicalPostId(post) {
    return post && ((post.ref && post.ref.objectId) || post.objectId || post.id);
  }

  function mergeUniquePosts(existing, incoming) {
    var positions = {};
    var merged = [];
    (existing || []).concat(incoming || []).forEach(function (post) {
      var id = canonicalPostId(post);
      if (!id || positions[id] == null) {
        if (id) positions[id] = merged.length;
        merged.push(post);
      } else {
        merged[positions[id]] = post;
      }
    });
    return merged;
  }

  function loadNotifRead() {
    try {
      var raw = window.localStorage.getItem("cw-notif-read");
      if (!raw) return {};
      var got = JSON.parse(raw);
      return got && typeof got === "object" ? got : {};
    } catch {
      return {};
    }
  }

  function saveNotifRead() {
    try { window.localStorage.setItem("cw-notif-read", JSON.stringify(state.notifRead || {})); } catch { /* private */ }
  }

  function loadHomeFeedRead() {
    try {
      var raw = window.localStorage.getItem("cw-home-feed-read");
      if (!raw) return {};
      var got = JSON.parse(raw);
      return got && typeof got === "object" ? got : {};
    } catch {
      return {};
    }
  }

  function saveHomeFeedRead() {
    try {
      window.localStorage.setItem("cw-home-feed-read", JSON.stringify(state.homeFeedRead || {}));
    } catch { /* private */ }
  }

  function loadHomeFeedDismissed() {
    try {
      var raw = window.localStorage.getItem("cw-home-feed-dismissed");
      if (!raw) return {};
      var got = JSON.parse(raw);
      return got && typeof got === "object" ? got : {};
    } catch {
      return {};
    }
  }

  function saveHomeFeedDismissed() {
    try {
      window.localStorage.setItem(
        "cw-home-feed-dismissed",
        JSON.stringify(state.homeFeedDismissed || {}),
      );
    } catch { /* private */ }
  }

  function markHomeFeedRead(id) {
    if (!id) return;
    state.homeFeedRead = state.homeFeedRead || {};
    if (state.homeFeedRead[id]) return;
    state.homeFeedRead[id] = true;
    saveHomeFeedRead();
  }

  /** Mark every post id currently rolled into a following stack card. */
  function markHomeFollowStackRead(item) {
    if (!item) return;
    var ids = item.stackIds && item.stackIds.length ? item.stackIds : (item.id ? [item.id] : []);
    ids.forEach(function (id) { markHomeFeedRead(id); });
  }

  function homeFollowOpts(limit) {
    return {
      dismissed: state.homeFeedDismissed || {},
      limit: limit != null ? limit : (state.homeFollowVisible || HOME_FOLLOW_PAGE),
    };
  }

  function followingAvailableCount() {
    if (!window.CW_MAP || !window.CW_MAP.homeFeedItems) return 0;
    return window.CW_MAP.homeFeedItems(
      "following",
      state.merged,
      state.homeFeedRead,
      { dismissed: state.homeFeedDismissed || {}, limit: undefined },
    ).length;
  }

  /**
   * When the visible following stack is short, widen the window.
   * Channel/space pending stays feed-scoped — never dumped into Following.
   */
  function refillHomeFollow(opts) {
    opts = opts || {};
    if (state.homeFeed !== "following") return false;
    var before = currentHomeItems().length;
    var available = followingAvailableCount();
    var visible = state.homeFollowVisible || HOME_FOLLOW_PAGE;
    if (before <= HOME_FOLLOW_REFILL_AT && visible < available) {
      state.homeFollowVisible = Math.min(available, visible + HOME_FOLLOW_PAGE);
    }
    var after = currentHomeItems().length;
    if (!opts.silent) {
      if (after > before) {
        status("following · pulled more (" + after + ")");
      } else if (available === 0) {
        status("following · caught up — nothing more available");
      }
    }
    return after > before;
  }

  /**
   * Dismiss the face post of a following stack card. Marks it read, removes it
   * from the stack, and refills when the visible list is running low.
   */
  function dismissHomeFollow(id, opts) {
    opts = opts || {};
    if (!id) return false;
    markHomeFeedRead(id);
    state.homeFeedDismissed = state.homeFeedDismissed || {};
    state.homeFeedDismissed[id] = true;
    saveHomeFeedDismissed();
    var items = currentHomeItems();
    if (state.homeCursor >= items.length) {
      state.homeCursor = Math.max(0, items.length - 1);
    }
    refillHomeFollow({ silent: true });
    if (!opts.noRender) render(true);
    if (!opts.silent) {
      var left = currentHomeItems().length;
      var avail = followingAvailableCount();
      status(left
        ? ("dismissed · " + left + " showing" + (avail > left ? " · more waiting" : ""))
        : (avail
          ? "dismissed · refilling"
          : "dismissed · caught up"));
    }
    return true;
  }

  function markHomeFollowRead(id, opts) {
    opts = opts || {};
    var items = currentHomeItems();
    var it = null;
    for (var i = 0; i < items.length; i++) {
      if (items[i].id === id || (items[i].stackIds || []).indexOf(id) >= 0) {
        it = items[i];
        break;
      }
    }
    if (it) markHomeFollowStackRead(it);
    else markHomeFeedRead(id);
    if (!opts.noRender) render(true);
    if (!opts.silent) status("marked read");
    return true;
  }

  /**
   * Brand / logo: leave the Operate board for the Persuade marketing home.
   * Esc / following "home" still uses goHome() inside the board.
   */
  function goLanding() {
    try {
      var here = String(window.location.href || "");
      var dest = new URL("index.html", here).href;
      // Already on a file URL / nested path — prefer same-directory landing.
      if (/board\.html(?:[?#]|$)/i.test(here)) {
        window.location.assign(dest);
        return true;
      }
      window.location.assign(dest);
      return true;
    } catch {
      window.location.href = "index.html";
      return true;
    }
  }

  /**
   * In-board home: default community channel + Following feed.
   */
  function goHome(opts) {
    opts = opts || {};
    navigate(DEFAULT_WORKSPACE_PATH, { keepCli: true });
    state.detailOpen = false;
    state.threadFocus = null;
    state.homeFeed = "following";
    state.homeCursor = 0;
    state.focus = detailBladeIndex();
    if (state.editor) state.editor.focused = false;
    if (!opts.noRender) render(true);
    requestAnimationFrame(revealHomeFeedTabs);
    if (!opts.silent) status("home · following");
    return true;
  }

  function setHomeFeed(view, opts) {
    opts = opts || {};
    var allowed = { following: 1, announcements: 1, featured: 1, creators: 1 };
    var next = allowed[view] ? view : "following";
    var changed = state.homeFeed !== next;
    state.homeFeed = next;
    state.detailOpen = false;
    if (changed) {
      state.homeCursor = 0;
      if (next === "following") {
        state.homeFollowVisible = HOME_FOLLOW_PAGE;
        refillHomeFollow({ silent: true });
      }
    }
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
    if (window.CW_MAP && window.CW_MAP.homeFeedUnreadCounts) {
      return window.CW_MAP.homeFeedUnreadCounts(
        state.merged,
        state.homeFeedRead,
        { dismissed: state.homeFeedDismissed || {} },
      );
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
    if (window.CW_MAP && window.CW_MAP.unreadNotificationCount) {
      return window.CW_MAP.unreadNotificationCount(state.notifRead);
    }
    return (window.CW_DATA.notifications || []).filter(function (n) {
      return n.unread && !(state.notifRead && state.notifRead[n.id]);
    }).length;
  }

  function browserNotifySupported() {
    return !!(window.CW_NOTIFY && window.CW_NOTIFY.isSupported());
  }

  function browserNotifyPermission() {
    return window.CW_NOTIFY ? window.CW_NOTIFY.permission() : "unsupported";
  }

  function activityItems() {
    if (window.CW_MAP && window.CW_MAP.allNotifications) {
      return window.CW_MAP.allNotifications(state.notifRead);
    }
    return (window.CW_DATA.notifications || []).map(function (n) {
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
    if (!window.CW_NOTIFY) return 0;
    var shown = window.CW_NOTIFY.deliverUnread(items, {
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
    if (!window.CW_NOTIFY) return null;
    // Treat as unread for delivery purposes.
    var copy = Object.assign({}, item, { unread: true });
    return window.CW_NOTIFY.deliver(copy, { onClick: onBrowserNotificationClick });
  }

  /**
   * Emit a custom hook event. Matching enabled hooks with notify=true produce
   * Activity items (via CW_HOOKS.fired) and browser notifications when granted.
   * Returns the Activity items that fired.
   */
  function broadcastHookEvent(eventName, payload, opts) {
    if (!window.CW_HOOKS || !window.CW_HOOKS.emit) return [];
    opts = opts || {};
    var items = window.CW_HOOKS.emit(eventName, payload || {}, {
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
    if (!window.CW_HOOKS) return "hooks: module not loaded";
    var H = window.CW_HOOKS;
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
    return window.CW_NOTIFY.requestPermission().then(function (p) {
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
    if (window.CW_NOTIFY) label += " · " + window.CW_NOTIFY.permissionLabel(perm);
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
    // Masthead never hosts Allow alerts — Activity pane owns enable/denied.
    var permBtn = $("[data-activity-perm]");
    if (permBtn) {
      permBtn.hidden = true;
      permBtn.dataset.state = perm;
    }
  }

  function openActivity(filter) {
    var dest = "/notifications/" + (filter || "all");
    navigate(dest, { keepCli: true });
    status("activity · " + (filter || "all") +
      (browserNotifySupported()
        ? " · " + (window.CW_NOTIFY ? window.CW_NOTIFY.permissionLabel() : "")
        : ""));
  }

  function openNotification(id) {
    var n = window.CW_MAP && window.CW_MAP.findNotification
      ? window.CW_MAP.findNotification(id, state.notifRead)
      : (window.CW_DATA.notifications || []).filter(function (x) { return x.id === id; })[0];
    if (!n) return status("notification not found");
    markNotificationRead(n.id);
    // Keep OS tray honest: mark as pushed so it is not re-delivered.
    if (window.CW_NOTIFY) window.CW_NOTIFY.markPushed(n.id);
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
    return !!(window.CW_SPEECH && window.CW_SPEECH.isSupported());
  }

  function speechReady() {
    return !!(state.speech && state.speech.ready);
  }

  function applySpeechAvailability(snap) {
    snap = snap || {};
    state.speech.availability = snap.state || "unavailable";
    state.speech.ready = !!(window.CW_SPEECH && window.CW_SPEECH.isReady
      ? window.CW_SPEECH.isReady(snap)
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
    return !!(window.CW_VOICE && window.CW_VOICE.isSupported());
  }

  /** When channel voice is in PTT mode, bare ` belongs to transmit — not STT. */
  function voiceClaimsPtt() {
    return !!(state.voice && state.voice.joined && state.voice.inputMode === "ptt");
  }

  function findVoiceChannel(query) {
    var chans = (window.CW_DATA && window.CW_DATA.channels) || [];
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
    voiceEngine = window.CW_VOICE.create({
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
    if (window.CW_COMPLETE.isSlash(text)) {
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
    var next = window.CW_SPEECH && window.CW_SPEECH.normalizeIntent
      ? window.CW_SPEECH.normalizeIntent(mode)
      : "default";
    state.speech.intent = next;
    render(true);
    status("voice " + next + " mode — say \"what can I say?\" for commands");
    return next;
  }

  function cycleSpeechIntent() {
    var next = window.CW_SPEECH && window.CW_SPEECH.nextIntentMode
      ? window.CW_SPEECH.nextIntentMode(state.speech.intent)
      : "default";
    return setSpeechIntent(next);
  }

  /** Route a final transcript through Voice Access-style intent parsing. */
  function handleSpeechFinal(phrase) {
    var p = String(phrase || "").trim();
    if (!p) return;
    var parsed = window.CW_SPEECH && window.CW_SPEECH.parseUtterance
      ? window.CW_SPEECH.parseUtterance(p, state.speech.intent || "default")
      : { kind: "dictation", text: p };
    if (parsed.kind === "mode-switch" && parsed.nextMode) {
      setSpeechIntent(parsed.nextMode);
      return;
    }
    if (parsed.kind === "help") {
      var help = window.CW_SPEECH.whatCanISay ? window.CW_SPEECH.whatCanISay() : "voice help";
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
    if (parsed.kind === "action" && parsed.actionId && window.CW_ACTIONS) {
      return window.CW_ACTIONS.invoke(parsed.actionId, parsed.input || {}, actionContext("voice"))
        .catch(function (error) {
          status("voice action failed · " + ((error && error.message) || parsed.actionId));
          return false;
        });
    }
    if (parsed.kind === "command" && parsed.line) {
      // Commands do not append into the prompt — they run like slash verbs.
      speechBase = cliValue;
      closeIntel();
      if (window.CW_COMPLETE.isSlash(parsed.line)) {
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
    speechEngine = window.CW_SPEECH.create({
      lang: state.speech.lang || (window.CW_SPEECH.defaultLang && window.CW_SPEECH.defaultLang()),
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
    if (!window.CW_SPEECH || !window.CW_SPEECH.ensureModel) return null;
    if (speechFetchInflight) return speechFetchInflight;
    speechFetchInflight = (async function () {
      state.speech.availability = "downloading";
      state.speech.ready = false;
      state.speech.reason = "downloading on-device speech model…";
      render(true);
      status("Downloading on-device speech model — mic stays off until ready");
      var snap;
      try {
        snap = await window.CW_SPEECH.ensureModel(state.speech.lang, {
          report: function (m) { if (!state.busy) status(m); },
        });
      } catch (err) {
        snap = {
          state: "unavailable",
          backend: "none",
          reason: "speech model download failed: " +
            ((err && err.message) || String(err)),
        };
      }
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
    if (!window.CW_SPEECH || !window.CW_SPEECH.availability) {
      applySpeechAvailability({
        state: "absent",
        backend: "none",
        reason: "speech module missing",
      });
      return render(true);
    }
    var lang = window.CW_SPEECH.defaultLang
      ? window.CW_SPEECH.defaultLang()
      : "en-US";
    state.speech.lang = lang;
    var snap;
    try {
      snap = await window.CW_SPEECH.availability(lang);
    } catch (err) {
      snap = {
        state: "unavailable",
        backend: "none",
        reason: "speech probe failed: " + ((err && err.message) || String(err)),
      };
    }
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
  var policy = window.CW_SESSION
    ? window.CW_SESSION.loadPolicy()
    : { guestsAllowed: true, name: "EPOCH CIVIC WORKSHOP" };
  var identity = window.CW_SESSION
    ? window.CW_SESSION.loadIdentity(policy)
    : { kind: "guest", principalId: "guest_local", displayName: "guest", canParticipate: true, claimable: true };

  function syncSavedViewPrincipal() {
    if (window.CW_SAVED_VIEWS && window.CW_SAVED_VIEWS.setPrincipal) {
      window.CW_SAVED_VIEWS.setPrincipal(identity && identity.principalId);
    }
  }

  function viewerContext() {
    var actorId = identity && identity.principalId || undefined;
    var readable = actorId ? ((window.CW_DATA && window.CW_DATA.dms) || []).filter(function (dm) {
      if (dm.ownerId) return dm.ownerId === actorId;
      if (Array.isArray(dm.participantIds) && dm.participantIds.length) {
        return dm.participantIds.indexOf(actorId) >= 0;
      }
      return state.dmOwnerPrincipalId === actorId;
    }).map(function (dm) { return dm.id; }) : [];
    if (actorId && state.dmOwnerPrincipalId === actorId && window.CW_MAP) {
      var known = [];
      if (window.CW_MAP.membersForBoard) known = known.concat(window.CW_MAP.membersForBoard());
      if (window.CW_MAP.allProjects && window.CW_MAP.membersForProject) {
        window.CW_MAP.allProjects().forEach(function (project) {
          known = known.concat(window.CW_MAP.membersForProject(project));
        });
      }
      known.forEach(function (member) {
        var handle = String(member && member.handle || "").replace(/^@/, "").toLowerCase();
        if (handle && readable.indexOf(handle) < 0) readable.push(handle);
      });
    }
    return {
      actorId: actorId,
      readableDmIds: readable,
    };
  }

  function authorizedNamespaceEntries(path) {
    var listed = MAP.list(path, state.merged);
    if (!listed || !window.CW_GRAPH || !window.CW_GRAPH.filterNamespaceEntries) return listed || [];
    return window.CW_GRAPH.filterNamespaceEntries(path, listed, viewerContext());
  }

  function canEnterNamespace(path) {
    var parts = MAP.split(path);
    if (parts[0] !== "dms" || !parts[1]) return true;
    return viewerContext().readableDmIds.indexOf(parts[1]) >= 0;
  }

  syncSavedViewPrincipal();

  function persistIdentity() {
    if (window.CW_SESSION) window.CW_SESSION.saveIdentity(identity);
    syncSavedViewPrincipal();
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
    return window.CW_SESSION && window.CW_SESSION.profileLabel
      ? window.CW_SESSION.profileLabel(identity)
      : (identity.displayName || "Anonymous");
  }

  function profileInitials() {
    return window.CW_SESSION && window.CW_SESSION.profileInitials
      ? window.CW_SESSION.profileInitials(identity)
      : "AN";
  }

  function listSpaces() {
    return window.CW_SESSION && window.CW_SESSION.listSpaces
      ? window.CW_SESSION.listSpaces()
      : ((window.CW_DATA && window.CW_DATA.spaces) || []);
  }

  function paintIdentity() {
    var host = $("[data-identity-host]");
    if (!host) return;
    var note = window.CW_SESSION ? window.CW_SESSION.authNote(identity) : identity.kind;
    var detail = window.CW_SESSION ? window.CW_SESSION.authDetail(identity) : "";
    var label = profileLabel();
    var initials = profileInitials();
    var space = identity.spaceName || identity.spaceShort || policy.name || "space";
    host.innerHTML =
      '<button type="button" class="cw-profile-btn" data-profile-btn data-kind="' +
      escAttr(identity.kind) + '" data-anonymous="' + (identity.anonymous || identity.kind === "guest" ? "true" : "false") + '"' +
      ' title="' + escAttr(detail) + '" aria-haspopup="menu" aria-expanded="' +
      (profileMenuOpen ? "true" : "false") + '" aria-label="Profile: ' +
      escAttr(label) + " · " + escAttr(space) + '">' +
      '<span class="cw-profile-avatar" aria-hidden="true">' + escHtml(initials) + "</span>" +
      '<span class="cw-profile-meta">' +
      '<span class="cw-profile-name">' + escHtml(label) + "</span>" +
      '<span class="cw-profile-space">' + escHtml(note) + "</span>" +
      "</span></button>";
    if (profileMenuOpen) paintProfileMenu();
  }

  function paintProfileMenu() {
    var menu = $("[data-profile-menu]");
    if (!menu) return;
    var label = profileLabel();
    var note = window.CW_SESSION ? window.CW_SESSION.authNote(identity) : identity.kind;
    var detail = window.CW_SESSION ? window.CW_SESSION.authDetail(identity) : "";
    var spaces = listSpaces();
    var spaceRows = spaces.map(function (s) {
      var current = identity.spaceId === s.id;
      var lock = s.guestsAllowed === false ? "members" : "open";
      return '<button type="button" class="cw-profile-item" role="menuitem" data-space-join="' +
        escAttr(s.id) + '"' + (current ? ' aria-current="true"' : "") +
        ' title="' + escAttr((s.slug || s.id) + " · " + (s.description || "")) + '">' +
        '<span class="cw-space-short">' + escHtml(s.short || s.id.slice(0, 4).toUpperCase()) + "</span>" +
        "<span>" + escHtml(s.name) +
        '<span class="cw-profile-item-sub">' + escHtml(s.slug || s.id) +
        " · " + (s.subscribers || 0) + " members</span></span>" +
        '<span class="cw-profile-item-desc">' + (current ? "current" : lock) + "</span>" +
        "</button>";
    }).join("");
    var signedIn = identity.kind === "claimed" || identity.kind === "atproto";
    menu.innerHTML =
      '<div class="cw-profile-head">' +
      '<div class="cw-profile-head-name">' + escHtml(label) + "</div>" +
      '<div class="cw-profile-head-note">' + escHtml(note) + "</div>" +
      '<div class="cw-profile-head-space">' + escHtml(detail) + "</div>" +
      "</div>" +
      '<div class="cw-profile-section">' +
      '<div class="cw-profile-section-title">Spaces</div>' +
      spaceRows +
      '<button type="button" class="cw-profile-item" role="menuitem" data-goto="/spaces">' +
      "Browse all spaces…</button>" +
      "</div>" +
      '<div class="cw-profile-section">' +
      '<div class="cw-profile-section-title">Account</div>' +
      '<button type="button" class="cw-profile-item" role="menuitem" data-profile-signin>' +
      (signedIn ? "Switch space with sign-in…" : "Sign in to a space…") + "</button>" +
      (identity.claimable
        ? '<button type="button" class="cw-profile-item" role="menuitem" data-profile-claim>Claim anonymous identity…</button>'
        : "") +
      (identity.kind !== "atproto"
        ? '<button type="button" class="cw-profile-item" role="menuitem" data-profile-bluesky>Sign in with handle…</button>'
        : "") +
      (signedIn
        ? '<button type="button" class="cw-profile-item danger" role="menuitem" data-profile-signout>Sign out · go anonymous</button>'
        : '<button type="button" class="cw-profile-item" role="menuitem" data-profile-signout>Reset anonymous session</button>') +
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
    pushLayer("profile-menu", "profile menu", "close profile menu", closeProfileMenu, $("[data-profile-btn]"));
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
    removeLayer("profile-menu");
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
    fillSpaceSelect(identity.spaceId || (window.CW_SESSION && window.CW_SESSION.homeSpace
      ? window.CW_SESSION.homeSpace().id : "civic-workshop"));
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
    pushLayer("auth-dialog", "auth dialog", "close sign in", closeAuth, $("[data-profile-btn]"));
  }

  function closeAuth() {
    var dlg = $("[data-auth-dialog]");
    if (!dlg) return;
    dlg.dataset.open = "false";
    dlg.hidden = true;
    var err = $("[data-auth-err]");
    if (err) { err.hidden = true; err.textContent = ""; }
    removeLayer("auth-dialog");
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
    status(note || (window.CW_SESSION ? window.CW_SESSION.authNote(identity) : "identity updated"));
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
    if (!window.CW_SESSION) return authError("session module missing");
    try {
      var spaceId = selectedAuthSpaceId();
      var next = window.CW_SESSION.claimIdentity(identity, handle, spaceId);
      applyIdentity(next, "signed in to " + next.spaceName + " as @" + next.handle, "identity.changed");
    } catch (e) {
      authError(e && e.message ? e.message : String(e));
    }
  }

  function doAtprotoLogin(handle) {
    if (!window.CW_SESSION) return authError("session module missing");
    try {
      var spaceId = selectedAuthSpaceId();
      var next = window.CW_SESSION.authorizeAtproto(handle, identity.principalId, spaceId);
      if (identity.createdAt) next.createdAt = identity.createdAt;
      applyIdentity(next, "signed in to " + next.spaceName + " as @" + next.handle + " · " + next.did,
        "identity.changed");
    } catch (e) {
      authError(e && e.message ? e.message : String(e));
    }
  }

  function doJoinSpace(spaceId, opts) {
    if (!window.CW_SESSION) return status("session module missing");
    try {
      var next = window.CW_SESSION.joinSpace(identity, spaceId, opts || {});
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
    if (!window.CW_SESSION) return;
    identity = window.CW_SESSION.signOut(policy);
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
      dmOwnerPrincipalId: state.dmOwnerPrincipalId,
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
      reposts: state.reposts,
      treeOpen: state.treeOpen,
      history: state.history,
      histIndex: state.histIndex,
      lines: (state.lines || []).slice(-80),
      openTools: state.openTools,
      ai: state.ai,
      live: state.live,
      nextId: state.nextId,
      merged: (state.merged || []).slice(-40),
      pendingByFeed: state.pendingByFeed || {},
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
      if (state.sessionRecovery) return;
      if (window.CW_SESSION) window.CW_SESSION.saveBoardState(snapshotBoard());
    }, 200);
  }

  function activeRecovery() {
    if (state.sessionRecovery) {
      return Object.assign({ source: "session" }, state.sessionRecovery);
    }
    if (!window.CW_SAVED_VIEWS || typeof window.CW_SAVED_VIEWS.status !== "function") return null;
    var saved = window.CW_SAVED_VIEWS.status();
    return saved ? Object.assign({ source: "saved-views" }, saved) : null;
  }

  function exportSessionRecovery() {
    var recovery = activeRecovery();
    var savedViews = recovery && recovery.source === "saved-views";
    var raw = savedViews && window.CW_SAVED_VIEWS.exportState
      ? window.CW_SAVED_VIEWS.exportState()
      : window.CW_SESSION && window.CW_SESSION.exportBoardState
        ? window.CW_SESSION.exportBoardState()
        : null;
    if (!raw) return status("session recovery · no saved state is available to export");
    try {
      var blob = new Blob([raw], { type: "application/json" });
      var href = URL.createObjectURL(blob);
      var link = document.createElement("a");
      link.href = href;
      link.download = savedViews ? "community-web-saved-views-recovery.json" : "community-web-session-recovery.json";
      link.hidden = true;
      document.body.appendChild(link);
      link.click();
      link.remove();
      setTimeout(function () { URL.revokeObjectURL(href); }, 0);
      status("session recovery · saved state exported; reset only when you are ready");
    } catch {
      status("session recovery · export unavailable; saved state was not changed");
    }
  }

  function resetSessionRecovery() {
    var recovery = activeRecovery();
    if (recovery && recovery.source === "saved-views") {
      if (!window.CW_SAVED_VIEWS.resetState()) {
        return status("saved-view recovery · reset unavailable; saved state was not changed");
      }
    } else {
      if (window.CW_SESSION) window.CW_SESSION.clearBoardState();
      state.sessionRecovery = null;
    }
    paintSessionRecovery();
    status("session recovery · saved state reset; current workspace remains open");
  }

  function paintSessionRecovery() {
    var existing = document.querySelector("[data-session-recovery]");
    var recovery = activeRecovery();
    if (!recovery) {
      if (existing) existing.remove();
      return;
    }
    var host = existing || document.createElement("section");
    host.setAttribute("data-session-recovery", "");
    host.setAttribute("role", "status");
    host.setAttribute("aria-live", "polite");
    host.setAttribute("data-recovery-source", recovery.source);
    host.className = "cw-session-recovery";
    host.replaceChildren();
    var message = document.createElement("span");
    message.textContent = recovery.message || "Saved board state needs recovery.";
    var exportButton = document.createElement("button");
    exportButton.type = "button";
    exportButton.setAttribute("data-session-recovery-export", "");
    exportButton.textContent = "Export saved state";
    exportButton.addEventListener("click", exportSessionRecovery);
    var resetButton = document.createElement("button");
    resetButton.type = "button";
    resetButton.setAttribute("data-session-recovery-reset", "");
    resetButton.textContent = "Reset saved state";
    resetButton.addEventListener("click", resetSessionRecovery);
    host.append(message, exportButton, resetButton);
    if (!existing) {
      var mount = document.querySelector("[data-mount]");
      if (mount && mount.parentNode) mount.parentNode.insertBefore(host, mount);
      else document.body.appendChild(host);
    }
  }

  function restoreBoardState() {
    if (!window.CW_SESSION) return;
    var snap = window.CW_SESSION.loadBoardState();
    if (!snap) {
      state.dmOwnerPrincipalId = identity && identity.principalId || null;
      return;
    }
    if (snap.recovery) {
      // Corrupt or unsupported private state cannot safely establish ownership.
      state.dmOwnerPrincipalId = null;
      state.sessionRecovery = snap.recovery;
      return;
    }
    // Unattributed persisted state cannot establish private-inbox ownership.
    state.dmOwnerPrincipalId = snap.dmOwnerPrincipalId || snap.principalId || null;
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
        state.reposts = Object.assign({}, snap.reposts || {});
        state.treeOpen = Object.assign({}, snap.treeOpen || {});
        state.openTools = Object.assign({}, snap.openTools || {});
        state.lines = (snap.lines || []).slice();
        state.history = (snap.history || []).slice();
        state.histIndex = snap.histIndex != null ? snap.histIndex : -1;
        // Mirror into the single active session so freeze/thaw stay coherent.
        if (state.sessions[0]) {
          SESSION_FIELDS.forEach(function (k) {
            if (k === "lines" || k === "history") state.sessions[0][k] = (state[k] || []).slice();
            else if (k === "folded" || k === "openTools" || k === "votes" || k === "reactions" || k === "reposts" || k === "treeOpen") {
              state.sessions[0][k] = Object.assign({}, state[k] || {});
            } else state.sessions[0][k] = state[k];
          });
        }
      }
      state.merged = mergeUniquePosts([], snap.merged || []);
      state.pendingByFeed = Object.assign({}, snap.pendingByFeed || {});
      // Older snapshots only had a flat pending array — park under the restored feed.
      if (Array.isArray(snap.pending) && snap.pending.length &&
          !Object.keys(state.pendingByFeed).length) {
        var legacyKey = currentFeedKey() || "_legacy";
        state.pendingByFeed[legacyKey] = snap.pending.slice();
      }
      retargetPendingMirror();
      var highestLiveId = 0;
      var restoredPosts = state.merged.slice();
      Object.keys(state.pendingByFeed).forEach(function (key) {
        restoredPosts = restoredPosts.concat(state.pendingByFeed[key] || []);
      });
      restoredPosts.forEach(function (post) {
        var match = /^live-(\d+)$/.exec(String(canonicalPostId(post) || ""));
        if (match) highestLiveId = Math.max(highestLiveId, Number(match[1]));
      });
      state.nextId = Math.max(Number(snap.nextId) || 1, highestLiveId + 1);
      dismissMenuIfNoSlashDraft();
      if (snap.panes) state.panes = Object.assign({}, state.panes, snap.panes, { zoom: false });
      if (typeof snap.themeIndex === "number" && snap.themeIndex >= 0) themeIndex = snap.themeIndex;
    } catch {
      state.sessionRecovery = {
        reason: "restore-failed",
        message: "Saved board state could not be restored; export it for recovery or reset it to continue.",
        actions: ["export", "reset"],
      };
    }
  }

  function freezeSession() {
    var sess = state.sessions[state.activeSession];
    if (!sess) return;
    SESSION_FIELDS.forEach(function (k) {
      if (k === "lines" || k === "history" || k === "feedPinnedViews") sess[k] = (state[k] || []).slice();
      else if (k === "folded" || k === "openTools" || k === "votes" || k === "reactions" || k === "reposts" || k === "treeOpen") {
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
    state.homeCursor = sess.homeCursor != null ? sess.homeCursor : 0;
    state.threadFocus = sess.threadFocus || null;
    state.feedMark = sess.feedMark || null;
    state.histIndex = sess.histIndex != null ? sess.histIndex : -1;
    state.busy = !!sess.busy;
    // Deep-enough copies so mutating folds/tools/lines does not cross tabs.
    state.folded = Object.assign({}, sess.folded || {});
    state.openTools = Object.assign({}, sess.openTools || {});
    state.votes = Object.assign({}, sess.votes || {});
    state.reactions = Object.assign({}, sess.reactions || {});
    state.reposts = Object.assign({}, sess.reposts || {});
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
    retargetPendingMirror();
    dismissMenuIfNoSlashDraft();
  }

  /**
   * Apply a Lucene-style feed query (or named view id) as the active projection.
   * Updates sort when the query includes sort:…; clears error on success.
   */
  function setFeedQuery(query, viewId) {
    query = String(query == null ? "" : query).trim();
    state.feedQuery = query;
    // Active queries keep the power fold open; clearing folds it away.
    state.feedQueryOpen = !!query;
    if (viewId) state.feedView = viewId;
    else {
      // Match a preset if the query equals one.
      var presets = window.CW_QUERY && window.CW_QUERY.presets
        ? window.CW_QUERY.presets()
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
    if (window.CW_QUERY && query) {
      var parsed = window.CW_QUERY.parse(query);
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
    var presets = window.CW_QUERY && window.CW_QUERY.presets
      ? window.CW_QUERY.presets()
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
    var bag = state.reactions[postId] || { counts: {}, mine: {} };
    bag.counts = Object.assign({}, bag.counts || {});
    bag.mine = Object.assign({}, bag.mine || {});
    // Seed counts from fixture post once, if present.
    if (!bag.seeded) {
      var post = null;
      var all = (window.CW_DATA.posts || [])
        .concat(window.CW_DATA.dmMessages || [])
        .concat(window.CW_DATA.projectPosts || [])
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
    cancelCdPreview({ noRender: true });
    freezeSession();
    thawSession(i);
    recompute();
    render();
    if (opts && opts.keepFocus) return;
    focusCli();
  }

  function newSession() {
    cancelCdPreview({ noRender: true });
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
    cancelCdPreview({ noRender: true });
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
    // New transcript reopens a user-closed session blade so output is visible.
    if (line.kind && line.kind !== "banner") state.sessionClosed = false;
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
      focusMax: null,
    };
    try {
      var raw = window.localStorage.getItem("cw-panes");
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
        focusMax: null,
      };
    } catch { return fallback; }
  }

  function savePanes() {
    try { window.localStorage.setItem("cw-panes", JSON.stringify(state.panes)); } catch { /* private mode */ }
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
    state.panes.focusMax = null;
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

  function toggleFocusedPanel(opts) {
    opts = opts || {};
    if (!state.panes) state.panes = loadPanes();
    var focused = state.focus != null ? Number(state.focus) : listBladeIndex();
    var expanded = state.panes.focusMax === focused;
    state.panes.focusMax = expanded ? null : focused;
    state.panes.zoom = false;
    if (!opts.noRender) render(true);
    if (!opts.silent) status(expanded ? "focus restored" : "focus expanded · z to restore");
    return state.panes.focusMax;
  }

  /* ── Terminal file editor (detail pane) ────────────────────────────────── */

  function editorApi() {
    return window.CW_EDITOR || null;
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
   * @param {{ focus?: boolean }} [opts] — default focuses the editor; preview
   *   selection passes `{ focus: false }` so nav keeps the keyboard.
   */
  function openFileInEditor(entry, path, opts) {
    opts = opts || {};
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
    if (opts.focus === false) {
      es.focused = false;
    } else {
      es.focused = true;
      state.columnFocus = true;
    }
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
    bg: "--cw-bg", surface: "--cw-surface", ink: "--cw-ink", inkDim: "--cw-ink-dim",
    inkFaint: "--cw-ink-faint", rule: "--cw-rule", accent: "--cw-accent",
    accentInk: "--cw-accent-ink", signed: "--cw-signed", live: "--cw-live",
    warn: "--cw-warn", danger: "--cw-danger", agent: "--cw-agent",
  };

  function setTheme(i) {
    themeIndex = (i + window.CW_THEMES.length) % window.CW_THEMES.length;
    var t = window.CW_THEMES[themeIndex];
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
    themeStyle.textContent = window.CW_THEMES[themeIndex].css + ":root{" + css.join(";") + "}";
    document.body.dataset.theme = label || "custom";
    var n = $("[data-theme-name]"); if (n) n.textContent = label || "custom";
    return taken;
  }

  var experiences = window.CW_EXPERIENCES;
  var current = 0;
  var expStyle = document.createElement("style");
  document.head.appendChild(expStyle);

  function exp() { return experiences[current]; }
  /** Path whose first-level children the navbar lists (never a terminal leaf). */
  function navListPath() {
    return (MAP.navParentPath ? MAP.navParentPath(state.path) : state.path) || "/";
  }

  function entries() { return authorizedNamespaceEntries(navListPath()); }

  /** Keep a terminal channel address aligned with the navbar cursor. */
  function syncTerminalPathFromCursor() {
    if (!(MAP.isTerminalNavPath && MAP.isTerminalNavPath(state.path))) return;
    var e = entries()[state.cursor];
    if (!e || e.kind !== "channel") return;
    var next = MAP.resolve(navListPath(), e.name);
    if (next && next !== state.path) {
      state.path = next;
      state.threadFocus = null;
      state.feedMark = null;
      syncReplyWithPath();
    }
  }

  /**
   * Open a terminal channel leaf: address the channel for compose/feed, but
   * keep the navbar on the parent channels list (siblings stay visible).
   */
  function openTerminalChannel(target, opts) {
    opts = opts || {};
    var parts = MAP.split(target);
    var parent = MAP.join(parts.slice(0, -1)) || "/";
    var leaf = parts[parts.length - 1];
    var probe = MAP.list(parent, state.merged) || [];
    var found = probe.findIndex(function (e) { return e.name === leaf; });
    if (found === -1) return false;
    state.prev = state.path;
    state.path = opts.contextPath || target;
    state.filter = "";
    state.cursor = found;
    if (!opts.keepThread) {
      state.threadFocus = opts.threadFocus || null;
      state.feedMark = opts.feedMark != null ? opts.feedMark : state.threadFocus;
    }
    state.detailOpen = true;
    if (opts.focusDetail) state.focus = detailBladeIndex();
    else if (opts.focusNav) state.focus = listBladeIndex();
    syncReplyWithPath();
    syncPersonFromPath();
    retargetPendingMirror();
    dismissMenuIfNoSlashDraft();
    render(opts.keepCli);
    if (!opts.preview && !opts.noHistory) commitNavigation();
    return true;
  }

  function visible() {
    var all = entries();
    if (!state.filter) return all;
    return all.filter(function (e) {
      return window.CW_COMPLETE.score(e.name, state.filter) !== null;
    });
  }

  /* ── Render ────────────────────────────────────────────────────────────── */

  var lastScrolled = null;

  function render(keepCli) {
    if (!state.feedMark && !state.threadFocus) {
      var initialFeed = feedEntries();
      var initialMessage = initialFeed.find(function (entry) { return entry && entry.post; });
      if (initialMessage) state.feedMark = initialMessage.post.id;
    }
    // Keep the active virtual worktree's snapshot current so tab labels and
    // a later switch restore the path/transcript you actually left.
    freezeSession();
    // Mirror the open feed's live queue before paint (cursor / path / thread).
    retargetPendingMirror();
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
    window.CW_MORPH.morph(mount, exp().render(state));
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
    paintRestartCue();
    paintSessionRecovery();
    syncVisibleInteractionLayers();
    // Narrow ranger: keep the focused blade in view (Enter/→ must reveal feed).
    revealFocusedBlade();
    schedulePersist();
  }

  /** Horizontal snap: bring the focused blade into the viewport on narrow widths. */
  function revealFocusedBlade() {
    var narrow = false;
    try {
      narrow = !!(window.matchMedia && window.matchMedia("(max-width: 40rem)").matches);
    } catch { /* fine */ }
    if (!narrow) return;
    requestAnimationFrame(function () {
      var kind = "list";
      if (state.focus === detailBladeIndex()) kind = "detail";
      else if (sessionBladeIndex() >= 0 && state.focus === sessionBladeIndex()) kind = "session";
      var el = document.querySelector('.cn-blade[data-blade-kind="' + kind + '"]');
      if (el && el.scrollIntoView) {
        try { el.scrollIntoView({ inline: "start", block: "nearest", behavior: "smooth" }); }
        catch { try { el.scrollIntoView(true); } catch { /* fine */ } }
      }
    });
  }

  /** Persistent status-bar cue for Ctrl+Space — always visible, never transient. */
  function paintKeysCue() {
    var el = $("[data-keys-open]");
    if (!el) return;
    var open = !!(state.helpOpen && state.intelOpen);
    el.dataset.open = open ? "true" : "false";
    el.setAttribute("aria-pressed", open ? "true" : "false");
  }

  function startupPending() {
    return window.CW_STARTUP && window.CW_STARTUP.pending
      ? window.CW_STARTUP.pending()
      : [];
  }

  function paintRestartCue() {
    var el = $("[data-restart-cue]");
    if (!el) return;
    var pending = startupPending();
    el.hidden = !pending.length;
    el.setAttribute("aria-label", pending.length
      ? "Apply " + pending.map(function (item) { return item.label; }).join(", ") + " and restart (Control+U)"
      : "No restart action pending");
  }

  function bottomLine() {
    var pending = startupPending();
    if (pending.length) {
      return "next · Ctrl+U restart — " + pending.map(function (item) { return item.label; }).join(" · ");
    }
    var topLayer = interactionStack && interactionStack.top();
    if (topLayer) return "next · Esc " + (topLayer.escapeLabel || ("close " + topLayer.label));
    if (state.busy) return "next · Esc cancel · Ctrl+Space keys";
    if (state.columnFocus) return "next · Enter open · z expand focus · : prompt";
    return "next · Enter run · Tab panels · Ctrl+Space keys";
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
    if (input && state.candIndex < 0) input.removeAttribute("aria-activedescendant");
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
    if (state.candIndex < 0) return;
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
    if (window.CW_COMPLETE && window.CW_COMPLETE.formatCliPreview) {
      mirror.innerHTML = window.CW_COMPLETE.formatCliPreview(input.value, c);
    } else {
      var ghost = c.ghost ? input.value + c.ghost : input.value;
      mirror.textContent = ghost;
    }
  }

  function status(msg) {
    var line = $("[data-status-line]");
    if (!line) return;
    var next = bottomLine();
    var recovery = activeRecovery();
    var persistent = recovery && recovery.message || navigationRestoreNotice;
    line.textContent = persistent ? persistent + " · " + next
      : startupPending().length ? next
        : (msg ? msg + " · " + next : next);
    paintRestartCue();
  }

  var interactionStack = null;
  var navigationHistory = window.CW_NAV.createHistory(window.history);
  var restoringHistory = false;
  var navigationRestoreNotice = "";
  var navigationRevision = "";

  function readingAnchorTarget(objectId, focusRegion) {
    var selector = focusRegion === "detail"
      ? ".cn-thread-reading [data-object-id]"
      : focusRegion === "thread-outline"
        ? '.cn-thread-tree [role="treeitem"][data-object-id]'
        : focusRegion === "feed"
          ? '.cn-tree[role="feed"] [role="article"][data-object-id]'
          : "[data-object-id]";
    return Array.prototype.find.call(document.querySelectorAll(selector), function (element) {
      return element.getAttribute("data-object-id") === objectId;
    });
  }

  function readingScrollContainer(target) {
    return target && target.closest
      ? target.closest('.cn-blade[data-blade-kind="detail"] .cn-blade-body, .cn-pane > .cn-col-body')
      : null;
  }

  function currentReadingAnchor(objectId, focusRegion) {
    var target = readingAnchorTarget(objectId, focusRegion);
    if (!target) return undefined;
    var container = readingScrollContainer(target);
    var pixelOffset = target.getBoundingClientRect().top -
      (container ? container.getBoundingClientRect().top : 0);
    return { objectId: objectId, pixelOffset: pixelOffset };
  }

  function activeFocusRegion() {
    var active = document.activeElement;
    if (active && active.closest) {
      if (active.closest(".cn-thread-reading")) return "detail";
      if (active.closest(".cn-thread-tree")) return "thread-outline";
      if (active.closest('.cn-tree[role="feed"]')) return "feed";
      if (active.closest("[data-cli]")) return menuShouldOpen() ? "completion" : "composer";
      if (active.closest('[role="dialog"], [role="menu"]')) return "dialog";
      if (active.closest('.cn-blade[data-blade-kind="list"]')) return "navigator";
    }
    return state.threadFocus ? "thread-outline" : (state.detailOpen ? "feed" : "navigator");
  }

  function navigationLocation() {
    var projection = MAP.projectionForPath(state.path);
    var objectId = state.feedMark || state.threadFocus || null;
    var atPath = MAP.objectAtPath(state.path, state.merged);
    if (!objectId && atPath) objectId = atPath.objectId;
    var focusRegion = activeFocusRegion();
    var threadRootId;
    if (state.threadFocus) {
      var graph = threadGraph();
      var rootRef = graph && graph.rootOf(state.threadFocus);
      threadRootId = rootRef && rootRef.objectId || state.threadFocus;
    }
    return {
      projectionId: navigationRevision ? undefined : projection.projectionId,
      objectId: objectId,
      revision: navigationRevision || undefined,
      threadRootId: threadRootId || undefined,
      detailObjectId: state.feedMark || undefined,
      sort: state.sort,
      workspaceId: state.sessions[state.activeSession] &&
        (state.sessions[state.activeSession].id || "workspace-" + (state.activeSession + 1)),
      focusRegion: focusRegion,
      readingAnchor: objectId ? currentReadingAnchor(objectId, focusRegion) : undefined,
    };
  }

  function commitNavigation(replace) {
    if (restoringHistory) return false;
    return navigationHistory.commit(navigationLocation(), { replace: !!replace });
  }

  function restoreNavigation(location) {
    location = window.CW_NAV.canonicalLocation(location);
    if (location.workspaceId) {
      var workspaceIndex = state.sessions.findIndex(function (session, index) {
        return (session.id || "workspace-" + (index + 1)) === location.workspaceId;
      });
      if (workspaceIndex >= 0 && workspaceIndex !== state.activeSession) thawSession(workspaceIndex);
    }
    if (location.sort) {
      state.sort = location.sort;
      state.feedView = location.sort;
    }
    var projectionPath = location.projectionId && MAP.pathForProjection(location.projectionId);
    var objectPath = location.objectId && MAP.pathForObject(location.objectId, location.projectionId, state.merged);
    var fallback = !projectionPath && !!location.projectionId;
    if (!fallback) navigationRestoreNotice = "";
    navigationRevision = location.revision || "";
    var revisionNotice = "";
    if (navigationRevision && location.objectId) {
      var revisionPath = objectPath || MAP.pathForObject(location.objectId, null, state.merged);
      var currentRef = revisionPath && MAP.objectAtPath(revisionPath, state.merged);
      if (!currentRef || !currentRef.revision) {
        revisionNotice = "exact revision unavailable · opened current object";
      } else if (currentRef.revision !== navigationRevision) {
        revisionNotice = "exact revision mismatch · opened current revision " + currentRef.revision;
      }
    }
    // A contextual route's location is its projection; the focused object is
    // restored separately below. Preferring the object's deep namespace alias
    // turned a channel refresh into `.../channel/message-id` and collapsed the
    // distinction between location and focus.
    var target = projectionPath || objectPath;
    if (!target && location.objectId) target = MAP.pathForObject(location.objectId, null, state.merged);
    if (!target) {
      status("object or projection unavailable");
      return false;
    }
    restoringHistory = true;
    var restored = navigate(target, { keepCli: true, noHistory: true });
    if (restored && location.threadRootId) {
      openThread(location.threadRootId, { noHistory: true, silent: true });
      state.feedMark = location.detailObjectId || location.objectId || location.threadRootId;
      render(true);
    } else if (restored && location.objectId) {
      state.feedMark = location.objectId;
      render(true);
    }
    if (restored && location.focusRegion) {
      state.columnFocus = location.focusRegion !== "composer" && location.focusRegion !== "completion";
      state.focus = location.focusRegion === "navigator" ? listBladeIndex() : detailBladeIndex();
      if (location.focusRegion === "detail" || location.focusRegion === "feed" ||
          location.focusRegion === "thread-outline") state.detailOpen = true;
      render(true);
      requestAnimationFrame(function () {
        var focusedId = location.detailObjectId || location.objectId || location.threadRootId;
        var selector = location.focusRegion === "navigator"
          ? '.cn-blade[data-blade-kind="list"] .cn-item[aria-current="true"]'
          : location.focusRegion === "thread-outline"
            ? '.cn-thread-tree [role="treeitem"][data-key="' + focusedId + '"]'
            : location.focusRegion === "detail"
              ? '.cn-thread-reading article[data-object-id="' + focusedId + '"]'
              : location.focusRegion === "composer" || location.focusRegion === "completion"
                ? "[data-cli]"
                : '.cn-tree[role="feed"] [role="article"][data-key="' + focusedId + '"]';
        var focusTarget = document.querySelector(selector);
        if (focusTarget) try { focusTarget.focus({ preventScroll: true }); } catch { /* fine */ }
      });
    }
    restoringHistory = false;
    if (location.readingAnchor && restored) requestAnimationFrame(function () {
      var current = currentReadingAnchor(location.readingAnchor.objectId, location.focusRegion);
      var anchorTarget = readingAnchorTarget(location.readingAnchor.objectId, location.focusRegion);
      var container = readingScrollContainer(anchorTarget);
      if (current && container) {
        container.scrollTop += current.pixelOffset - location.readingAnchor.pixelOffset;
      }
    });
    if (fallback && restored) {
      navigationRestoreNotice = "projection unavailable · opened canonical object";
      status(navigationRestoreNotice);
    } else if (revisionNotice && restored) {
      navigationRestoreNotice = revisionNotice;
      status(navigationRestoreNotice);
    }
    return restored;
  }

  function wireBrowserHistory() {
    window.addEventListener("popstate", function (event) {
      restoreNavigation(event.state || window.CW_NAV.parseLocation(window.location.href));
    });
    var persisted = window.history.state;
    var route = persisted && (persisted.objectId || persisted.projectionId)
      ? persisted
      : window.CW_NAV.parseLocation(window.location.href);
    if (route.objectId || route.projectionId) {
      restoreNavigation(route);
      requestAnimationFrame(function () { requestAnimationFrame(function () { commitNavigation(true); }); });
    } else {
      commitNavigation(true);
    }
  }

  function layers() {
    if (!interactionStack) {
      interactionStack = window.CW_NAV.createLayerStack(function () {
        state.layers = interactionStack ? interactionStack.list().map(function (item) { return item.id; }) : [];
      });
    }
    return interactionStack;
  }

  function pushLayer(id, label, escapeLabel, cancel, returnFocus) {
    layers().push({ id: id, label: label, escapeLabel: escapeLabel, cancel: cancel, returnFocus: returnFocus });
    state.layers = layers().list().map(function (item) { return item.id; });
  }

  function removeLayer(id) {
    layers().remove(id);
    state.layers = layers().list().map(function (item) { return item.id; });
  }

  function cancelTopLayer() {
    if (state.speech && state.speech.listening) {
      endDictation({ skipLeftover: true });
      removeLayer("listening");
      status("listening stopped");
      return true;
    }
    if (cdPreview) {
      cancelCdPreview();
      removeLayer("completion");
      status("cd preview cancelled");
      return true;
    }
    var top = layers().top();
    if (!top) {
      status("Esc: no action · use cd .. for namespace parent or browser Back for history");
      return false;
    }
    var label = top.escapeLabel || ("close " + (top.label || top.id));
    layers().cancelTop();
    state.layers = layers().list().map(function (item) { return item.id; });
    status(label);
    return true;
  }

  function hasLayer(id) {
    return !!(interactionStack && interactionStack.list().some(function (item) { return item.id === id; }));
  }

  function dataControl(attribute, value) {
    return Array.prototype.find.call(document.querySelectorAll("[" + attribute + "]"), function (element) {
      return element.getAttribute(attribute) === value;
    });
  }

  function syncVisibleInteractionLayers() {
    if (state.reactPick) {
      if (!hasLayer("reaction-picker")) {
        pushLayer("reaction-picker", "reaction picker", "close reaction picker", function () {
          state.reactPick = null;
          render(true);
        }, dataControl("data-react-pick", state.reactPick) || document.activeElement);
      }
    } else if (hasLayer("reaction-picker")) {
      removeLayer("reaction-picker");
    }
    if (state.feedQueryOpen && $("[data-feed-query]")) {
      if (!hasLayer("query-editor")) {
        pushLayer("query-editor", "query editor", "clear filter", function () {
          state.feedQuery = "";
          state.feedQueryOpen = false;
          state.feedQueryError = null;
          state.feedView = "hot";
          state.sort = "hot";
          render(true);
        }, $("[data-feed-query-toggle]"));
      }
    } else if (hasLayer("query-editor")) {
      removeLayer("query-editor");
    }
  }

  function wireInteractionLayers() {
    document.addEventListener("keydown", function (ev) {
      if (ev.key !== "Escape") return;
      if (ev.isComposing || ev.keyCode === 229 || state.editor && state.editor.focused) return;
      var cancellable = state.speech && state.speech.listening || cdPreview || layers().top();
      if (!cancellable) {
        cancelTopLayer();
        return;
      }
      ev.preventDefault();
      ev.stopImmediatePropagation();
      cancelTopLayer();
    }, true);
  }

  /**
   * Feed identity for the live queue. Channel and space feeds only —
   * not Following home, DMs, or thread detail.
   */
  function currentFeedKey() {
    var segs = MAP.split(state.path);
    if (segs[0] === "projects" && segs[2] === "channels" && segs[3]) {
      return "chan:" + segs[1] + "/" + segs[3];
    }
    if (segs[0] === "projects" && segs[2] === "channels" && !segs[3]) {
      var here = MAP.list(state.path, state.merged) || [];
      var sel = here[state.cursor];
      if (sel && (sel.kind === "channel" || sel.kind === "dir") && !sel.notification) {
        return "chan:" + segs[1] + "/" + sel.name;
      }
    }
    if (segs[0] === "spaces" && segs[1] && segs[2] === "feed") {
      return "space:" + segs[1];
    }
    if (segs[0] === "spaces" && segs[1] && !segs[2]) {
      var spaceHere = MAP.list(state.path, state.merged) || [];
      var spaceSel = spaceHere[state.cursor];
      if (spaceSel && spaceSel.name === "feed") return "space:" + segs[1];
    }
    return null;
  }

  function ensurePendingBucket(key) {
    if (!key) return [];
    if (!state.pendingByFeed) state.pendingByFeed = {};
    if (!state.pendingByFeed[key]) state.pendingByFeed[key] = [];
    return state.pendingByFeed[key];
  }

  /** Point `state.pending` at the open feed's queue (tools / R / stream_load). */
  function retargetPendingMirror() {
    var key = currentFeedKey();
    state.pending = key ? ensurePendingBucket(key) : [];
  }

  /** Visible only on an open channel/space feed in the detail blade (not threads). */
  function feedNoticeOpen() {
    if (!isDetailOpen() || state.threadFocus) return false;
    var key = currentFeedKey();
    if (!key) return false;
    var views = window.CW_CONSOLE_VIEWS;
    if (views && typeof views.isFeedSortContext === "function") {
      var parts = MAP.split(state.path);
      var here = MAP.list(state.path, state.merged) || [];
      var selected = here[state.cursor];
      if (!views.isFeedSortContext(parts, selected, state.merged)) return false;
    }
    return ensurePendingBucket(key).length > 0;
  }

  /** Keep slash autocomplete closed unless the draft starts with `/`. */
  function dismissMenuIfNoSlashDraft() {
    if (String(cliValue || "").charAt(0) === "/") return;
    state.menuDismissed = true;
    if (!state.keysOnboard) state.intelOpen = false;
  }

  /**
   * Paint feed-scoped notice (detail overlay). Page chrome notice is retired.
   * Prefer in-place count updates so the feed does not reflow on every tick.
   */
  function renderNotice() {
    var region = $('[data-region="notice"]');
    if (region) {
      region.hidden = true;
      region.innerHTML = "";
    }
    retargetPendingMirror();
    var host = document.querySelector(".cn-feed-notice");
    if (!feedNoticeOpen()) {
      if (host) render(true);
      return;
    }
    var n = state.pending.length;
    if (host) {
      var count = host.querySelector('[data-c="count"]');
      if (count) { count.textContent = String(n); return; }
    }
    render(true);
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
    var full = MAP.resolve(navListPath(), e.name);
    toggleTreeDir(full);
  }

  /** Detail index when open; still 1 for focus math when present. */
  function detailBladeIndex() {
    return 1;
  }

  /** Session transcript blade when open and useful lines exist; else -1. */
  function sessionBladeIndex() {
    if (state.sessionClosed) return -1;
    var useful = (state.lines || []).some(function (ln) { return ln.kind !== "banner"; });
    return useful ? 2 : -1;
  }

  function isDetailOpen() {
    return state.detailOpen !== false;
  }

  /** Hide the session chat blade (keeps transcript until `clear`). */
  function closeSessionBlade(opts) {
    opts = opts || {};
    state.sessionClosed = true;
    state.sessionOutFocus = false;
    if (state.focus === 2) state.focus = detailBladeIndex();
    if (!opts.noRender) render(true);
    if (!opts.silent) status("session · closed");
    removeLayer("session-transcript");
    return true;
  }

  /**
   * Close / × on a blade:
   *   nav (0)     → reload nav at parent path (up)
   *   detail (1)  → show Following feed (keep detail pane)
   *   session (2) → close the session chat window
   */
  function closeBlade(index) {
    index = Number(index);
    if (index === sessionBladeIndex() ||
        (index >= 2 && !state.sessionClosed &&
          (state.lines || []).some(function (ln) { return ln.kind !== "banner"; }))) {
      return closeSessionBlade();
    }
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
    state.feedMark = postId;
    state.detailOpen = true;
    if (opts.focus !== false) state.focus = detailBladeIndex();
    if (state.editor) state.editor.focused = false;
    if (!opts.noRender) render(true);
    if (!opts.noHistory) commitNavigation();
    if (!opts.silent) status("thread · " + postId);
    pushLayer("thread-detail", "thread", "close thread", function () { clearThreadFocus(); }, document.activeElement);
    return true;
  }

  function clearThreadFocus(opts) {
    opts = opts || {};
    if (!state.threadFocus) return false;
    state.feedMark = state.threadFocus;
    state.threadFocus = null;
    if (!opts.noRender) render(true);
    if (!opts.silent) status("channel feed");
    removeLayer("thread-detail");
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
    removeLayer("thread-detail");
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

  function navigate(path, opts) {
    opts = opts || {};
    if (!restoringHistory) {
      navigationRestoreNotice = "";
      navigationRevision = "";
    }
    // Board locators are `community:<path>?sort=<order>`; `nightboard:` is the
    // same scheme under its retired name and still resolves so links people
    // already shared keep working. Treat the scheme and query as locator
    // metadata, never as namespace segments;
    // the normal history commit below replaces a successful legacy locator
    // with the canonical HTTPS object/projection URL.
    var requestedPath = String(path == null ? "" : path).trim();
    requestedPath = requestedPath.replace(/^(?:community|nightboard):/i, "") || "/";
    var queryAt = requestedPath.indexOf("?");
    if (queryAt >= 0) {
      var legacyParams = new window.URLSearchParams(requestedPath.slice(queryAt + 1));
      requestedPath = requestedPath.slice(0, queryAt) || "/";
      var legacySort = legacyParams.get("sort");
      if (["hot", "new", "top", "best"].indexOf(legacySort) >= 0) {
        state.sort = legacySort;
        state.feedView = legacySort;
        state.feedQuery = "sort:" + legacySort;
        state.feedQueryError = null;
      }
    }
    if (cdPreview && !opts.preview) cancelCdPreview({ noRender: true });
    var target = MAP.resolve(state.path, requestedPath);
    if (!canEnterNamespace(target)) {
      status("direct message unavailable for this principal");
      return false;
    }
    // Deep post URLs land on the channel feed with that thread focused in detail.
    var deepPost = MAP.postAt ? MAP.postAt(target, state.merged) : null;
    if (deepPost && MAP.channelFeedPath && MAP.isPostReplyPath && MAP.isPostReplyPath(target)) {
      var feedTarget = MAP.channelFeedPath(target);
      return openTerminalChannel(feedTarget, {
        contextPath: target,
        keepCli: opts.keepCli,
        focusDetail: true,
        threadFocus: deepPost.id,
        feedMark: deepPost.id,
      });
    }
    // Channel leaves are addressable but never become the navbar parent.
    if (MAP.isTerminalNavPath && MAP.isTerminalNavPath(target)) {
      return openTerminalChannel(target, {
        keepCli: opts.keepCli,
        focusDetail: true,
      });
    }
    if (!MAP.isDir(target, state.merged)) {
      // A file path selects its entry in the parent directory rather than
      // failing, because "cd" to a thing you can see should go there.
      var parts = MAP.split(target);
      var dir = MAP.join(parts.slice(0, -1));
      if (MAP.isDir(dir, state.merged)) {
        // Only a leaf that actually exists counts as arriving. Reporting
        // success for a name that is not there made every caller believe a
        // typo had worked, which is why `cd bugs` silently did nothing.
        var probe = authorizedNamespaceEntries(dir);
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
        state.feedMark = state.threadFocus;
        state.focus = detailBladeIndex();
        syncReplyWithPath();
        syncPersonFromPath();
        retargetPendingMirror();
        dismissMenuIfNoSlashDraft();
        render(opts && opts.keepCli);
        if (!opts.noHistory) commitNavigation();
        return true;
      }
      return false;
    }
    state.prev = state.path;
    state.path = target;
    state.cursor = 0;
    state.filter = "";
    state.threadFocus = null;
    state.feedMark = null;
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
    retargetPendingMirror();
    dismissMenuIfNoSlashDraft();
    render(opts && opts.keepCli);
    if (!opts.noHistory) commitNavigation();
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
    if (window.CW_MAP && window.CW_MAP.homeFeedItems) {
      var opts = state.homeFeed === "following" ? homeFollowOpts() : {};
      return window.CW_MAP.homeFeedItems(
        state.homeFeed,
        state.merged,
        state.homeFeedRead,
        opts,
      ) || [];
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
    var views = window.CW_MAP && window.CW_MAP.homeFeedViews
      ? window.CW_MAP.homeFeedViews()
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
      refillHomeFollow();
      render(true);
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

  /** Dismiss the home-feed row under the cursor (following stack). */
  function dismissHomeCursor() {
    if (state.homeFeed !== "following") {
      return dismissHomeItem();
    }
    var items = currentHomeItems();
    var cur = state.homeCursor || 0;
    var it = items[cur];
    if (!it) {
      status("home · empty");
      return false;
    }
    return dismissHomeFollow(it.id);
  }

  /**
   * Dismiss (non-following home tabs): clear unread on the cursor row.
   * Same verb as following / activity — hotkey `d`.
   */
  function dismissHomeItem() {
    var items = currentHomeItems();
    var cur = state.homeCursor || 0;
    var it = items[cur];
    if (!it) {
      status("home · empty");
      return false;
    }
    markHomeFeedRead(it.id);
    if (!onHomeFeed()) { /* fine */ }
    render(true);
    status("dismissed");
    return true;
  }

  /** Mark-read the home-feed row under the cursor (keep visible). */
  function markReadHomeCursor() {
    var items = currentHomeItems();
    var cur = state.homeCursor || 0;
    var it = items[cur];
    if (!it) {
      status("home · empty");
      return false;
    }
    if (state.homeFeed === "following") return markHomeFollowRead(it.id);
    markHomeFeedRead(it.id);
    render(true);
    status("marked read");
    return true;
  }

  /**
   * Dismiss the notification under the nav cursor.
   * Same verb / hotkey `d` as home-feed dismiss.
   */
  function dismissNotificationCursor() {
    var id = selectedNotificationId();
    if (!id) {
      status("nothing to dismiss");
      return false;
    }
    markNotificationRead(id);
    if (window.CW_NOTIFY) window.CW_NOTIFY.markPushed(id);
    render(true);
    paintActivityBell();
    status("dismissed");
    return true;
  }

  function selectedNotificationId() {
    var list = entries();
    var e = list[state.cursor];
    if (e && e.notification) return e.notification.id;
    var parts = MAP.split(state.path);
    if (parts[0] === "notifications" && e && e.name) {
      if (window.CW_MAP && window.CW_MAP.findNotification) {
        var byId = window.CW_MAP.findNotification(e.name, state.notifRead);
        if (byId) return byId.id;
      }
      return e.name;
    }
    return null;
  }

  /** True when `d` should mean dismiss (not nav filter / editor delete). */
  function dismissOwnsKey() {
    if (state.editor && state.editor.focused && state.editor.active) return false;
    if (homeOwnsKeyboard()) return true;
    if (onHomeFeed() && !listOwnsKeyboard() && state.columnFocus) return true;
    if (String(state.path || "").indexOf("/notifications") === 0) return true;
    var e = entries()[state.cursor];
    return !!(e && e.notification);
  }

  /**
   * Unified dismiss — one verb, one hotkey (`d`) across attention surfaces.
   * Clears the current item from the attention queue (home stack · Activity ·
   * notification leaf / DM alerts). Does not navigate away.
   */
  function dismissCurrent() {
    if (!dismissOwnsKey()) {
      status("nothing to dismiss");
      return false;
    }
    if (homeOwnsKeyboard() || (onHomeFeed() && !listOwnsKeyboard() && state.columnFocus)) {
      return dismissHomeCursor();
    }
    return dismissNotificationCursor();
  }

  /** Detail-pane post pool for the current channel / DM / space feed. */
  function feedEntries() {
    var feedPath = MAP.channelFeedPath ? MAP.channelFeedPath(state.path) : state.path;
    var listed = MAP.feedEntriesAt
      ? (MAP.feedEntriesAt(feedPath, state.merged) || [])
      : (MAP.list(feedPath, state.merged) || []);
    return window.CW_GRAPH && window.CW_GRAPH.filterNamespaceEntries
      ? window.CW_GRAPH.filterNamespaceEntries(feedPath, listed, viewerContext())
      : listed;
  }

  /**
   * When a thread is focused, j/k move to the previous/next root post in the
   * channel feed (detail pane) without dumping you back to the feed overview.
   */
  function moveThreadBrowse(delta) {
    var list = feedEntries().filter(function (e) { return e && e.post && !e.post.re; });
    if (!list.length) {
      list = feedEntries().filter(function (e) { return e && e.post; });
    }
    if (!list.length) return;
    var ix = -1;
    for (var i = 0; i < list.length; i++) {
      if (list[i].post.id === state.threadFocus) { ix = i; break; }
    }
    if (ix < 0) {
      // Focus may be a reply — find its root among feed roots.
      var focusPost = null;
      feedEntries().some(function (e) {
        if (e.post && e.post.id === state.threadFocus) { focusPost = e.post; return true; }
        return false;
      });
      var rootId = focusPost ? (focusPost.re || focusPost.id) : null;
      for (var j = 0; j < list.length; j++) {
        if (list[j].post.id === rootId) { ix = j; break; }
      }
    }
    if (ix < 0) ix = 0;
    var next = Math.max(0, Math.min(list.length - 1, ix + delta));
    openThread(list[next].post.id, { silent: true });
    status("thread · " + list[next].post.id);
  }

  /** Detail feed browse (no thread): j/k mark the next/prev root post. */
  function moveFeedBrowse(delta) {
    var list = feedEntries().filter(function (e) { return e && e.post && !e.post.re; });
    if (!list.length) list = feedEntries().filter(function (e) { return e && e.post; });
    if (!list.length) return;
    var mark = state.feedMark || null;
    var ix = mark
      ? list.findIndex(function (e) { return e.post.id === mark; })
      : 0;
    if (ix < 0) ix = 0;
    var next = Math.max(0, Math.min(list.length - 1, ix + delta));
    state.feedMark = list[next].post.id;
    state.detailOpen = true;
    if (state.editor) state.editor.focused = false;
    render(true);
    status("feed · " + list[next].post.id);
  }

  /** Move DOM focus through every visible message (roots and replies). */
  function moveMessageFocus(delta, edge) {
    var list = Array.prototype.slice.call(document.querySelectorAll(
      '.cn-blade[data-blade-kind="detail"] .cn-comment[data-key]',
    ));
    if (!list.length) return false;
    var active = document.activeElement && document.activeElement.closest
      ? document.activeElement.closest(".cn-comment[data-key]") : null;
    var ix = list.indexOf(active);
    if (ix < 0) ix = list.findIndex(function (el) {
      return el.getAttribute("data-key") === (state.feedMark || state.threadFocus);
    });
    if (ix < 0) ix = 0;
    var next;
    if (edge === "page") {
      var activeRect = list[ix].getBoundingClientRect();
      var pane = list[ix].closest(".cn-blade-body, .cn-col-body");
      var distance = Math.max(activeRect.height, (pane && pane.clientHeight || window.innerHeight) * 0.8);
      var targetTop = activeRect.top + (delta < 0 ? -distance : distance);
      next = ix;
      var closest = Infinity;
      list.forEach(function (element, index) {
        var difference = Math.abs(element.getBoundingClientRect().top - targetTop);
        if (difference < closest) { closest = difference; next = index; }
      });
      if (next === ix) next = Math.max(0, Math.min(list.length - 1, ix + (delta < 0 ? -1 : 1)));
    } else {
      next = edge === "start" ? 0 : edge === "end" ? list.length - 1
        : Math.max(0, Math.min(list.length - 1, ix + delta));
    }
    var id = list[next].getAttribute("data-key");
    state.feedMark = id;
    state.detailOpen = true;
    state.focus = detailBladeIndex();
    focusColumns();
    render(true);
    var el = document.querySelector('.cn-blade[data-blade-kind="detail"] .cn-comment[data-key="' + id + '"]');
    if (el) {
      try { el.focus({ preventScroll: true }); } catch { /* fine */ }
      try { el.scrollIntoView({ block: "nearest" }); } catch { /* fine */ }
    }
    status("message · " + id);
    return true;
  }

  function threadGraph() {
    if (!MAP.messageGraph) return null;
    return MAP.messageGraph(feedEntries().filter(function (entry) {
      return entry && entry.post;
    }).map(function (entry) { return entry.post; }));
  }

  function selectThreadMessage(id, focusReading) {
    if (!id) return false;
    state.feedMark = id;
    render(true);
    var selector = focusReading
      ? '.cn-thread-reading article[data-object-id="' + id + '"]'
      : '.cn-thread-tree [role="treeitem"][data-key="' + id + '"]';
    var target = document.querySelector(selector);
    if (target) try { target.focus({ preventScroll: true }); } catch { /* fine */ }
    return true;
  }

  function handleThreadTreeKey(message, key) {
    var id = message.getAttribute("data-key");
    if (key === "Enter") return selectThreadMessage(id, true);
    if (key === "ArrowRight" || key === "l") {
      if (message.getAttribute("aria-expanded") === "false") {
        invokeUiAction("post.fold", { objectId: id }, "keyboard", id);
        return true;
      }
      var first = threadGraph() && threadGraph().firstChildOf(id);
      return first ? selectThreadMessage(first.objectId) : false;
    }
    if (key === "ArrowLeft" || key === "h") {
      if (message.getAttribute("aria-expanded") === "true") {
        invokeUiAction("post.fold", { objectId: id }, "keyboard", id);
        return true;
      }
      var parent = threadGraph() && threadGraph().parentOf(id);
      return parent ? selectThreadMessage(parent.objectId) : false;
    }
    return false;
  }

  function openFocusedMessage(id) {
    if (!id) return false;
    var target = MAP.messagePath ? MAP.messagePath(state.path, id, state.merged) : null;
    if (!target || !navigate(target, { keepCli: true })) return openThread(id);
    requestAnimationFrame(function () {
      var el = document.querySelector('.cn-blade[data-blade-kind="detail"] .cn-comment[data-key="' + id + '"]');
      if (el) try { el.focus({ preventScroll: true }); } catch { /* fine */ }
    });
    return true;
  }

  function ascendFocusedMessage() {
    var feedPath = MAP.channelFeedPath ? MAP.channelFeedPath(state.path) : state.path;
    var parts = MAP.split(state.path);
    var feedParts = MAP.split(feedPath);
    if (parts.length <= feedParts.length) return false;
    parts.pop();
    var target = MAP.join(parts);
    var parent = MAP.postAt ? MAP.postAt(target, state.merged) : null;
    if (!navigate(target, { keepCli: true })) return false;
    if (!parent) state.feedMark = null;
    return true;
  }

  function moveCursor(delta) {
    // Keyboard navigation acts on the current path's list blade; parent blades
    // re-scope only via click or close (they display the path dependency).
    // When the terminal editor is focused, list motion yields to the editor.
    if (state.editor && state.editor.focused) return;
    // Home feed owns j/k when selection is closed and the detail pane is focused.
    if (homeOwnsKeyboard()) return moveHomeCursor(delta);
    // Detail owns the keyboard: thread / channel feed live in the detail pane.
    if (detailOwnsKeyboard()) {
      if (state.threadFocus) return moveThreadBrowse(delta);
      var partsD = MAP.split(state.path);
      var inChannelFeed = (partsD[0] === "projects" && partsD[2] === "channels" && partsD[3]) ||
        (partsD[0] === "spaces" && partsD[2] === "channels" && partsD[3]) ||
        (partsD[0] === "dms" && partsD[1]);
      if (inChannelFeed) return moveFeedBrowse(delta);
      // Other detail contexts — nudge nav cursor, keep detail focus.
      var listD = visible();
      if (!listD.length) return;
      var allD = entries();
      var currentNameD = allD[state.cursor] ? allD[state.cursor].name : null;
      var viD = listD.findIndex(function (e) { return e.name === currentNameD; });
      if (viD === -1) viD = 0;
      var nextD = Math.max(0, Math.min(listD.length - 1, viD + delta));
      state.cursor = allD.findIndex(function (e) { return e.name === listD[nextD].name; });
      if (state.editor) state.editor.focused = false;
      previewSelection({ keepDetailFocus: true });
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
    // Selecting a new list row leaves the editor focus and refreshes the preview.
    if (state.editor) state.editor.focused = false;
    previewSelection();
  }

  /**
   * Preview the nav cursor in the detail blade without changing path or stealing
   * focus. Dirs show children; channels preview their feed; posts (elsewhere)
   * mark the feed. Enter/→ activates.
   */
  function previewSelection(opts) {
    opts = opts || {};
    var e = entries()[state.cursor];
    state.detailOpen = true;
    if (!opts.keepDetailFocus) state.focus = listBladeIndex();
    if (state.editor) state.editor.focused = false;
    clearReplyTo();
    if (!e) {
      state.threadFocus = null;
      if (!opts.noRender) render(true);
      return false;
    }
    if (e.kind === "channel") {
      // Selecting a channel previews its feed without leaving the channels list.
      // If a channel was already opened (terminal address), keep the address in
      // sync with the navbar cursor so compose/feed match the preview.
      syncTerminalPathFromCursor();
      if (!(MAP.isTerminalNavPath && MAP.isTerminalNavPath(state.path))) {
        state.threadFocus = null;
        state.feedMark = null;
      } else if (!state.threadFocus) {
        state.feedMark = null;
      }
      if (!opts.noRender) render(true);
      return true;
    }
    if (e.post) {
      // Nav posts (e.g. space feed) — full feed with the cursor row marked.
      state.threadFocus = null;
      state.feedMark = e.post.id;
    } else {
      state.threadFocus = null;
    }
    // Load editable buffers for preview without focusing the editor.
    if (entryHasTextEditor(e) || e.agentFile || e.agentSkill || e.agentTool ||
        (e.kind === "file" && !e.post && !e.notification && /\./.test(e.name || ""))) {
      openFileInEditor(e, MAP.resolve(navListPath(), e.name), { focus: false });
    }
    syncPersonFromPath();
    if (!opts.noRender) render(true);
    return true;
  }

  /**
   * Enter on a nav selection: focus the preview and activate it — editor for
   * files, post detail for posts, DM compose for members, slide into dirs.
   * Reply compose starts when Tab focuses the prompt on a post detail.
   */
  function activateSelection() {
    if (homeOwnsKeyboard()) return activateHomeItem();
    // Detail feed mark → open that post's thread (posts are not nav children).
    if (detailOwnsKeyboard() && !state.threadFocus && state.feedMark) {
      return openThread(state.feedMark);
    }
    var list = entries();
    var e = list[state.cursor];
    if (!e) return false;
    try {
      var ctrlPath = window.CW_MAP.resolve(navListPath(), e.name);
      var kind = e.post ? "post"
        : (e.kind === "file" ? "file" : "nav-item");
      if (window.CW_CTX && window.CW_CTX.record) {
        window.CW_CTX.record({
          controlKey: kind + ":" + (e.post ? e.post.id : ctrlPath),
          verb: e.post ? "open-thread" : "activate",
        });
      }
    } catch { /* fine */ }
    focusColumns();
    var pathParts = MAP.split(state.path);
    var onBoardMembers = pathParts[0] === "members";
    var onProjectMembers = pathParts[0] === "projects" && pathParts[2] === "members";
    if (e.openDm || ((onBoardMembers || onProjectMembers) && e.name && !e.post)) {
      openMemberDm(e.openDm || e.name, { keepCli: true });
      state.focus = detailBladeIndex();
      focusCli();
      status("dm · write a message");
      return true;
    }
    // Channel is a terminal nav node — address it for detail/compose; navbar
    // stays on the parent channels list so siblings remain visible.
    if (e.kind === "channel") {
      var chPath = MAP.resolve(navListPath(), e.name);
      openTerminalChannel(chPath, { keepCli: true, focusDetail: true });
      if (e.voice) {
        status("voice · " + state.path);
      } else {
        focusCli();
        status("channel · " + state.path + " · write");
      }
      return true;
    }
    if (e.kind === "dir") {
      var full = MAP.resolve(navListPath(), e.name);
      if (state.treeOpen && state.treeOpen[full]) delete state.treeOpen[full];
      navigate(e.name);
      // After sliding in, focus detail when the branch is interactive content.
      var kids = entries();
      var interactive = kids.some(function (k) {
        return k && (k.post || k.notification || (k.kind === "file" && !k.meta));
      });
      var parts = MAP.split(state.path);
      var channelOrDm = (parts[0] === "projects" && parts[2] === "channels" && parts[3]) ||
        (parts[0] === "dms" && parts[1]);
      state.detailOpen = true;
      if (interactive || channelOrDm) {
        state.focus = detailBladeIndex();
        syncReplyWithPath();
        // Channel / DM: prompt ready to write. Plain listings keep detail focus.
        if (channelOrDm) {
          focusCli();
          status("slide → " + state.path + " · write");
        } else {
          status("slide → " + state.path);
        }
      } else {
        state.focus = listBladeIndex();
        status("slide → " + state.path);
      }
      return true;
    }
    if (e.notification) {
      openNotification(e.notification.id);
      return true;
    }
    if (e.post) {
      openThread(e.post.id);
      status("post · " + e.post.id);
      return true;
    }
    if (entryHasTextEditor(e) || e.agentFile || e.agentSkill || e.agentTool ||
        (e.kind === "file" && /\./.test(e.name || ""))) {
      return activateDetailEditor(e);
    }
    // Generic content — focus the preview pane.
    state.threadFocus = null;
    state.detailOpen = true;
    state.focus = detailBladeIndex();
    render(true);
    status(e.hint ? e.name + " · " + e.hint : e.name);
    return true;
  }

  /**
   * Entries whose detail is text the terminal editor can host — files and
   * agent payloads. Posts open as threads (use `e` to edit a post body).
   */
  function entryHasTextEditor(e) {
    if (!e || e.kind === "dir" || e.notification || e.post) return false;
    if (e.voice || e.meta === "voice") return false;
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
    // Feed posts resolve under the channel address; nav leaves under the list path.
    var base = navListPath();
    if (e.post) {
      if (MAP.isTerminalNavPath && MAP.isTerminalNavPath(state.path)) {
        base = MAP.channelFeedPath ? MAP.channelFeedPath(state.path) : state.path;
      } else {
        var sel = entries()[state.cursor];
        if (sel && sel.kind === "channel") base = MAP.resolve(navListPath(), sel.name);
        else if (MAP.channelFeedPath) base = MAP.channelFeedPath(state.path);
      }
    }
    openFileInEditor(e, MAP.resolve(base, e.name));
    focusEditor();
    status("edit · " + ((state.editor && state.editor.active && state.editor.active.name) || e.name) +
      " · i insert · Esc normal");
    return true;
  }

  function moveBladeFocus(delta) {
    // → from nav into Following opens selection detail (and editor when text).
    if (delta > 0 && !isDetailOpen() && listOwnsKeyboard()) {
      var leaf = entries()[state.cursor];
      if (entryHasTextEditor(leaf)) return activateDetailEditor(leaf);
      openDetail({ silent: true });
      return;
    }
    // Detail always mounted; session when transcript exists.
    var max = sessionBladeIndex() >= 0 ? sessionBladeIndex() : detailBladeIndex();
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
    var known = window.CW_MAP.isKnownPeer
      ? window.CW_MAP.isKnownPeer(handle)
      : (window.CW_DATA.members || []).some(function (m) {
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
   * → / l: slide into a directory or channel, open a post's thread in detail,
   * or focus a text editor. Posts are not explored as nav children.
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
    if (e.kind === "channel") {
      activateSelection();
      return;
    }
    if (e.kind === "dir") {
      // Collapse any expand-in-place on the row we're leaving so the parent
      // blade does not keep a duplicate of the new first-level list.
      var full = MAP.resolve(navListPath(), e.name);
      if (state.treeOpen && state.treeOpen[full]) delete state.treeOpen[full];
      navigate(e.name);
      status("slide → " + state.path);
      return;
    }
    if (e.notification) {
      openNotification(e.notification.id);
      // Keep nav open — focused-panel expansion is explicit (z / Alt+Z / header).
      return;
    }
    // Posts (space feed / other listings): open thread in detail — never nav.
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
      openFileInEditor(e, MAP.resolve(navListPath(), e.name));
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
   * Right arrow / l: directory/channel → open; post → thread in detail;
   * other text leaves → editor; else focus detail.
   */
  function goRight() {
    // Home feed rows only when the home pane owns focus — nav → still opens
    // the selected dir / post / file even while the Following log is visible.
    if (homeOwnsKeyboard()) return activateHomeItem();
    var list = entries();
    var e = list[state.cursor];
    var onList = listOwnsKeyboard();
    if (onList && e && (e.kind === "dir" || e.kind === "channel")) return descend();
    if (onList && e && e.post) return descend();
    if (onList && e && entryHasTextEditor(e)) return activateDetailEditor(e);
    if (onList && e) return descend();
    // Detail feed mark → open that thread.
    if (detailOwnsKeyboard() && !state.threadFocus && state.feedMark) {
      return openThread(state.feedMark);
    }
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
    var postId = state.threadFocus || state.feedMark || (e && e.post && e.post.id);
    if (postId) {
      var feedHit = feedEntries().find(function (x) {
        return x && x.post && x.post.id === postId;
      });
      if (feedHit) return activateDetailEditor(feedHit);
    }
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
    var subs = window.CW_DATA.subscriptions || [];
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
      var replyAnon = !identity || identity.anonymous || identity.kind === "guest";
      return (replyAnon ? "unsigned · " : "") +
        "reply @" + (ctx.who || "?") + " · " + (ctx.postId || "");
    }
    if (ctx.kind === "post") {
      var postAnon = !identity || identity.anonymous || identity.kind === "guest";
      return (postAnon ? "unsigned · " : "") +
        "post #" + (ctx.channelLabel || ctx.channel || "?");
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

  function canComposeInContext(ctx) {
    ctx = ctx || {};
    var dmId = ctx.kind === "dm" ? ctx.dm : null;
    if (!dmId && ctx.path) {
      var parts = MAP.split(ctx.path);
      if (parts[0] === "dms" && parts[1]) dmId = parts[1];
    }
    return !dmId || viewerContext().readableDmIds.indexOf(dmId) >= 0;
  }

  /**
   * Publish from the prompt into the active compose scope (reply / post / dm).
   */
  function publishCompose(body, ctx) {
    ctx = ctx || composeContext();
    body = String(body || "").trim();
    if (!body) return null;
    if (ctx.kind !== "reply" && ctx.kind !== "post" && ctx.kind !== "dm") return null;
    if (!canComposeInContext(ctx)) {
      status("direct message unavailable for this principal");
      return null;
    }
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
    state.merged = mergeUniquePosts(state.merged, [post]);
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

  /**
   * Rename a channel in-place (id + label + post refs + current path).
   * Prefer this over navigating to a path that does not exist yet.
   */
  function renameChannel(from, to, opts) {
    opts = opts || {};
    from = String(from || "").trim().replace(/^#/, "");
    to = String(to || "").trim().replace(/^#/, "");
    if (!from) return { ok: false, error: "from (current name) required" };
    if (!to) return { ok: false, error: "to (new name) required" };
    if (from === to) return { ok: false, error: "name unchanged" };

    var newId = MAP.slug(to);
    var newLabel = to;
    if (/^[a-z0-9][a-z0-9-]*$/i.test(to)) {
      newId = to.toLowerCase();
      newLabel = to;
    }

    var project = opts.project ||
      (MAP.split(state.path)[0] === "projects" ? MAP.split(state.path)[1] : null);
    var ov = ensureOverlay();
    var oldCh = MAP.findChannelByLabel(from);
    var oldId = oldCh ? oldCh.id : MAP.slug(from);
    var oldLabel = oldCh ? oldCh.label : from;

    // Collision: another channel already uses the new id/label.
    if (MAP.allChannels && MAP.allChannels().some(function (c) {
      if (!c) return false;
      if (c.id === oldId || c.label === oldLabel) return false;
      return c.id === newId || c.label === newLabel ||
        String(c.label).toLowerCase() === String(newLabel).toLowerCase();
    })) {
      return { ok: false, error: "channel exists: " + newLabel };
    }

    var touched = false;

    // Community seed / overlay channel objects.
    function rewriteChannelObj(c) {
      if (!c) return false;
      if (c.id === oldId || c.label === oldLabel ||
          String(c.label).toLowerCase() === String(oldLabel).toLowerCase() ||
          String(c.id).toLowerCase() === String(oldId).toLowerCase()) {
        c.id = newId;
        c.label = newLabel;
        return true;
      }
      return false;
    }
    (D.channels || []).forEach(function (c) { if (rewriteChannelObj(c)) touched = true; });
    (ov.channels || []).forEach(function (c) { if (rewriteChannelObj(c)) touched = true; });

    // Project channel name lists (seed + overlay).
    function rewriteNameList(list) {
      if (!list || !list.length) return false;
      var i;
      var hit = false;
      for (i = 0; i < list.length; i++) {
        if (String(list[i]) === oldLabel || String(list[i]) === oldId ||
            String(list[i]).toLowerCase() === String(oldLabel).toLowerCase()) {
          list[i] = newLabel;
          hit = true;
        }
      }
      return hit;
    }
    (D.projects || []).forEach(function (p) {
      if (project && p.slug !== project && MAP.slug(p.slug) !== project) return;
      if (rewriteNameList(p.channels)) touched = true;
    });
    Object.keys(ov.projectChannels || {}).forEach(function (pid) {
      if (project && pid !== project) return;
      if (rewriteNameList(ov.projectChannels[pid])) touched = true;
    });
    (D.spaces || []).forEach(function (s) {
      if (rewriteNameList(s.channels)) touched = true;
    });

    // If the channel only lived as a path segment under a project (no D.channels
    // row), still allow rename when the listing contains it.
    if (!touched) {
      var projId = project || "community";
      var proj = MAP.findProject(projId);
      var listed = MAP.projectChannelNames
        ? MAP.projectChannelNames(proj)
        : [];
      if (listed.some(function (n) {
        return n === oldLabel || n === oldId ||
          String(n).toLowerCase() === String(oldLabel).toLowerCase();
      })) {
        if (proj && proj.community) {
          ov.channels.push({ id: newId, label: newLabel, kind: "social", unread: 0 });
          // Hide the old id via overlay tombstone list.
          ov.removedChannels = ov.removedChannels || [];
          if (ov.removedChannels.indexOf(oldId) < 0) ov.removedChannels.push(oldId);
          touched = true;
        } else {
          var bag = ov.projectChannels;
          if (!bag[projId]) bag[projId] = (listed || []).slice();
          if (!rewriteNameList(bag[projId])) {
            bag[projId] = bag[projId].map(function (n) {
              return (n === oldLabel || n === oldId) ? newLabel : n;
            });
            if (bag[projId].indexOf(newLabel) < 0) bag[projId].push(newLabel);
          }
          touched = true;
        }
      }
    }

    if (!touched && !oldCh) {
      return { ok: false, error: "no such channel: " + from };
    }

    // Rewrite post.channel refs (seed + live merged).
    function rewritePostChannel(p) {
      if (!p) return;
      if (p.channel === oldId || p.channel === oldLabel ||
          String(p.channel).toLowerCase() === String(oldId).toLowerCase()) {
        p.channel = newId;
      }
    }
    (D.posts || []).forEach(rewritePostChannel);
    (D.projectPosts || []).forEach(rewritePostChannel);
    (D.incoming || []).forEach(rewritePostChannel);
    (state.merged || []).forEach(rewritePostChannel);

    // Notifications / hooks that point at the old path.
    (D.notifications || []).forEach(function (n) {
      if (!n) return;
      if (n.where && String(n.where).indexOf("/channels/" + oldLabel) >= 0) {
        n.where = String(n.where).split("/channels/" + oldLabel).join("/channels/" + newLabel);
      }
      if (n.where && String(n.where).indexOf("/channels/" + oldId) >= 0) {
        n.where = String(n.where).split("/channels/" + oldId).join("/channels/" + newId);
      }
      if (n.whereLabel === "#" + oldLabel) n.whereLabel = "#" + newLabel;
    });

    var destProject = project ||
      (oldCh && oldCh.spaceId ? null : "community") ||
      "community";
    // Prefer community for social channels.
    if (oldCh && (!project || project === "community")) destProject = "community";
    var newPath = "/projects/" + destProject + "/channels/" + newLabel;
    var oldPathSeg = "/channels/" + oldLabel;
    var oldPathSegId = "/channels/" + oldId;
    if (state.path === "/projects/" + destProject + "/channels/" + oldLabel ||
        state.path === "/projects/" + destProject + "/channels/" + oldId ||
        String(state.path).indexOf(oldPathSeg + "/") >= 0 ||
        String(state.path).indexOf(oldPathSegId + "/") >= 0) {
      var nextPath = String(state.path)
        .split(oldPathSeg).join("/channels/" + newLabel)
        .split(oldPathSegId).join("/channels/" + newId);
      navigate(nextPath, { keepCli: true });
    } else {
      render(true);
    }
    status("renamed #" + oldLabel + " → #" + newLabel);
    return {
      ok: true,
      from: oldLabel,
      to: newLabel,
      id: newId,
      project: destProject,
      path: newPath,
    };
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
      var feedKey = "chan:" + segs[1] + "/" + watching;
      ensurePendingBucket(feedKey).push(post);
      retargetPendingMirror();
      renderNotice();
    } else {
      if (chan) chan.unread = (chan.unread || 0) + 1;
      state.merged = mergeUniquePosts(state.merged, [post]);
      render(true);
    }
    // Browser Notification API + custom hooks.
    notifyFromLivePost(post);
  }

  function mergePending() {
    if (!state.pending.length) return;
    var n = state.pending.length;
    var key = currentFeedKey();
    var incoming = state.pending.slice();
    var pane = document.querySelector('.cn-blade[data-blade-kind="detail"] .cn-blade-body');
    var followingTail = !!pane && pane.scrollHeight - pane.scrollTop - pane.clientHeight <= 8;
    var anchor = state.feedMark && Array.prototype.find.call(document.querySelectorAll(".cn-comment[data-key]"), function (item) {
      return item.getAttribute("data-key") === state.feedMark;
    });
    var anchorTop = anchor ? anchor.getBoundingClientRect().top : null;
    state.feedBusy = true;
    var feed = document.querySelector('.cn-tree[role="feed"]');
    if (feed) feed.setAttribute("aria-busy", "true");
    render(true);
    requestAnimationFrame(function () {
      state.merged = mergeUniquePosts(state.merged, incoming);
      if (key && state.pendingByFeed) state.pendingByFeed[key] = [];
      retargetPendingMirror();
      render(true);
      requestAnimationFrame(function () {
        state.feedBusy = false;
        var currentFeed = document.querySelector('.cn-tree[role="feed"]');
        if (currentFeed) currentFeed.setAttribute("aria-busy", "false");
        render(true);
        var nextPane = document.querySelector('.cn-blade[data-blade-kind="detail"] .cn-blade-body');
        if (followingTail && nextPane) nextPane.scrollTop = nextPane.scrollHeight;
        else if (anchorTop != null && nextPane) {
          var nextAnchor = Array.prototype.find.call(document.querySelectorAll(".cn-comment[data-key]"), function (item) {
            return item.getAttribute("data-key") === state.feedMark;
          });
          if (nextAnchor) nextPane.scrollTop += nextAnchor.getBoundingClientRect().top - anchorTop;
        }
        status("loaded " + n + " new " + (n === 1 ? "post" : "posts"));
      });
    });
  }

  /* ── Command line ──────────────────────────────────────────────────────── */

  var cdPreview = null;
  var cdPreviewLine = null;
  var cdTypeaheadTrail = [];

  function cdPreviewSnapshot() {
    return {
      path: state.path,
      prev: state.prev,
      cursor: state.cursor,
      focus: state.focus,
      filter: state.filter,
      threadFocus: state.threadFocus,
      feedMark: state.feedMark,
      detailOpen: state.detailOpen,
      replyTo: state.replyTo,
      personPane: state.personPane,
      personPeer: state.personPeer,
      columnFocus: state.columnFocus,
      cdPreviewPath: state.cdPreviewPath,
    };
  }

  function applyCdPreviewSnapshot(snap) {
    Object.keys(snap || {}).forEach(function (key) { state[key] = snap[key]; });
    retargetPendingMirror();
  }

  function selectedCompletionLine() {
    var c = state.completion;
    if (!c || !c.candidates || !c.candidates.length) return cliValue;
    var cand = c.candidates[state.candIndex] || c.candidates[0];
    return cliValue.slice(0, c.replaceFrom || 0) + cand.value;
  }

  function previewCdLine(line) {
    if (!cdPreview) cdPreview = cdPreviewSnapshot();
    applyCdPreviewSnapshot(cdPreview);
    var arg = line.trim().split(/\s+/).slice(1).join(" ");
    state.cdPreviewPath = "pending";
    if (!navigate(arg, { keepCli: true, preview: true })) {
      applyCdPreviewSnapshot(cdPreview);
      return false;
    }
    cdPreviewLine = line;
    state.cdPreviewPath = state.path;
    state.columnFocus = false;
    state.menuDismissed = false;
    render(true);
    focusCli();
    highlightCandidate();
    paintGhost();
    status("preview · " + state.path + " · Enter accept · Esc cancel");
    return true;
  }

  function previewCdCandidate() {
    var c = state.completion;
    if (!/^cd\s+/i.test(cliValue) || !c || c.kind !== "path" || !c.candidates.length) return false;
    return previewCdLine(selectedCompletionLine());
  }

  function drillCdTypeahead(cli) {
    var c = state.completion;
    if (!/^cd\s+/i.test(cliValue) || !c || c.kind !== "path" || !menuShouldOpen() ||
        cli.selectionStart !== cli.value.length) return false;
    var before = cliValue;
    if (!acceptGhost()) return false;
    if (!/\/$/.test(cliValue)) {
      cliValue += "/";
      var input = $("[data-cli]");
      if (input) input.value = cliValue;
      recompute();
      render(true);
    }
    cdTypeaheadTrail.push(before);
    previewCdLine(cliValue);
    return true;
  }

  function ascendCdTypeahead(cli) {
    var c = state.completion;
    if (!/^cd\s+/i.test(cliValue) || !c || c.kind !== "path" || !menuShouldOpen() ||
        cli.selectionStart !== cli.value.length) return false;
    var prior = cdTypeaheadTrail.pop();
    if (!prior) {
      var match = /^(cd\s+)(.*)$/i.exec(cliValue);
      var arg = match ? match[2].replace(/\/+$/, "") : "";
      var slash = arg.lastIndexOf("/");
      if (!match || slash < 0) return false;
      prior = match[1] + arg.slice(0, slash + 1);
    }
    if (!cdPreview) cdPreview = cdPreviewSnapshot();
    applyCdPreviewSnapshot(cdPreview);
    cdPreviewLine = null;
    state.cdPreviewPath = null;
    state.menuDismissed = false;
    cliValue = prior;
    cli.value = prior;
    recompute();
    if (/^cd\s+\S+\/$/i.test(prior)) previewCdLine(prior);
    else {
      render(true);
      focusCli();
      highlightCandidate();
      paintGhost();
      status("typeahead · " + state.path + " · → drill · Enter run · Esc cancel");
    }
    return true;
  }

  function cancelCdPreview(opts) {
    if (!cdPreview) return false;
    var origin = cdPreview;
    cdPreview = null;
    cdPreviewLine = null;
    cdTypeaheadTrail = [];
    applyCdPreviewSnapshot(origin);
    if (!(opts && opts.noRender)) {
      state.menuDismissed = true;
      render(true);
      focusCli();
      status("cd preview cancelled · " + state.path);
    }
    return true;
  }

  function acceptCdPreviewLine() {
    if (!cdPreview) return null;
    var line = cdPreviewLine || selectedCompletionLine();
    cancelCdPreview({ noRender: true });
    status("cd preview accepted");
    return line;
  }

  function closeCli() {
    cancelCdPreview({ noRender: true });
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
    state.completion = window.CW_COMPLETE.analyse(cliValue, {
      cwd: cdPreview ? cdPreview.path : state.path, extra: state.merged,
      // Agent chat prefers slash verbs; empty prompt catalogues them.
      slash: !!state.ai || String(cliValue || "").charAt(0) === "/",
    });
    state.candIndex = -1;
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
    if (window.CW_COMPLETE.isMarkerKind && window.CW_COMPLETE.isMarkerKind(c.kind) &&
        c.candidates.length >= 1) {
      return true;
    }
    // CLI: show suggestions as soon as a verb/path/sort/query has matches.
    if (typed.length > 0 && c.candidates.length >= 1 &&
        (c.kind === "command" || c.kind === "slash" || c.kind === "path" || c.kind === "sort" || c.kind === "query" || c.kind === "jump")) {
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
   * Ctrl+Space: intellisense + hotkey cheatsheet for the focused component.
   * Context is frozen *before* focus moves into the prompt, so opening from
   * nav/detail/editor still lists that component's keys.
   */
  function openIntel() {
    // Freeze first — columnFocus, path, thread presence, panel furniture.
    if (window.CW_HELP && window.CW_HELP.buildContext) {
      state.helpCtx = window.CW_HELP.buildContext(state);
    } else {
    state.helpCtx = {
        path: state.path, focus: state.columnFocus ? "columns" : "prompt",
        context: state.columnFocus ? "nav" : "prompt",
        contextLabel: state.columnFocus ? "navigation" : "prompt",
        surfaces: [state.columnFocus ? "nav" : "prompt"],
        hasThread: false, sessions: (state.sessions || []).length || 1,
        session: (state.activeSession || 0) + 1, sort: state.sort || "hot",
        dock: "page", ai: !!state.ai,
        onboard: !!state.keysOnboard,
      };
    }
    if (state.helpCtx) state.helpCtx.onboard = !!state.keysOnboard;
    state.columnFocus = false;
    state.menuDismissed = false;
    recompute();
    if (!state.completion || !state.completion.candidates.length) {
      // Free-form AI text has no path tokens — still show a catalogue so
      // Ctrl+Space is never empty. In ai mode that is slash commands.
      state.completion = window.CW_COMPLETE.analyse(state.ai ? "/" : "", {
        cwd: state.path, extra: state.merged, slash: !!state.ai,
      });
      state.candIndex = -1;
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
    pushLayer("help", "help", "close help", function () { closeIntel(); render(true); focusCli(); }, document.activeElement);
  }

  function closeIntel() {
    if (!state.intelOpen && !state.helpOpen) return false;
    var wasOnboard = !!state.keysOnboard;
    state.intelOpen = false;
    state.helpOpen = false;
    state.cliOpen = false;
    state.helpCtx = null;
    state.keysOnboard = false;
    if (wasOnboard) markKeysOnboarded();
    removeLayer("help");
    removeLayer("completion");
    return true;
  }

  var KEYS_ONBOARD_KEY = "cw-keys-onboarded";

  function keysOnboarded() {
    try { return window.localStorage.getItem(KEYS_ONBOARD_KEY) === "1"; }
    catch { return true; }
  }

  function markKeysOnboarded() {
    try { window.localStorage.setItem(KEYS_ONBOARD_KEY, "1"); } catch { /* private */ }
  }

  /**
   * First visit: open the hotkey sheet so keyboard navigation is the obvious
   * default modality. Dismiss (Esc / cue / backdrop) persists the flag.
   */
  function maybeOpenKeysOnboard() {
    if (keysOnboarded()) return false;
    // Freeze nav as the focused component — board is keyboard-first.
    state.columnFocus = true;
    state.focus = listBladeIndex();
    state.keysOnboard = true;
    openIntel();
    status("keys · Esc to close");
    return true;
  }

  var ctxReturnFocus = null;

  function contextMenuItems() {
    var menu = $("[data-ctx-menu]");
    return menu ? Array.prototype.slice.call(menu.querySelectorAll("[role='menuitem']")) : [];
  }

  function focusContextMenuItem(index) {
    var items = contextMenuItems();
    if (!items.length) return false;
    var next = ((index % items.length) + items.length) % items.length;
    try { items[next].focus({ preventScroll: true }); } catch { /* fine */ }
    return true;
  }

  function moveContextMenuFocus(delta) {
    var items = contextMenuItems();
    var current = items.indexOf(document.activeElement);
    return focusContextMenuItem((current < 0 ? (delta > 0 ? -1 : 0) : current) + delta);
  }

  function closeContextMenu(restoreFocus) {
    if (!(state.ctxMenu && state.ctxMenu.open)) return false;
    state.ctxMenu = null;
    var previous = ctxReturnFocus;
    ctxReturnFocus = null;
    if (restoreFocus && previous && previous.isConnected) {
      window.requestAnimationFrame(function () {
        try { previous.focus({ preventScroll: true }); } catch { /* fine */ }
      });
    }
    removeLayer("context-menu");
    return true;
  }

  function openContextMenu(ev, target) {
    if (!target || !window.CW_CTX) return false;
    ctxReturnFocus = document.activeElement;
    var actions = window.CW_CTX.actionsFor(target.controlKey, target.kind) || [];
    state.ctxMenu = {
      open: true,
      x: Math.max(4, Math.min((ev && ev.clientX) || 8, (window.innerWidth || 800) - 220)),
      y: Math.max(4, Math.min((ev && ev.clientY) || 8, (window.innerHeight || 600) - 180)),
      target: target,
      actions: actions.slice(0, window.CW_CTX.MAX_ACTIONS || 3),
    };
    pushLayer("context-menu", "context menu", "close context menu", function () {
      closeContextMenu(true); render(true);
    }, ctxReturnFocus);
    return true;
  }

  function bindPromptFromTarget(target) {
    if (!target || !window.CW_CTX) return;
    state.boundContext = window.CW_CTX.boundChipsFromTarget(target);
    state.ai = true;
    state.columnFocus = false;
    closeContextMenu();
    state.cliOpen = true;
    render(true);
    focusCli();
    status("context · " + (target.kind || "ctrl") + " " + (target.name || target.id) +
      " — type a prompt");
    if (window.CW_CTX.record) {
      window.CW_CTX.record({ controlKey: target.controlKey, verb: "prompt-about" });
    }
  }

  function clearBoundContext() {
    state.boundContext = [];
  }

  function copyTargetContent(target, opts) {
    opts = opts || {};
    if (!window.CW_COPY) {
      status("copy unavailable");
      return false;
    }
    var t = target || (state.ctxMenu && state.ctxMenu.target);
    if (opts.fullChat) {
      t = Object.assign({}, t || {}, { kind: "chat" });
    }
    var text = window.CW_COPY.formatForTarget(t, state);
    window.CW_COPY.copyText(text).then(function (ok) {
      status(ok
        ? ("copied · " + ((t && t.kind) || "content") + " (" + text.length + " chars)")
        : "copy failed");
    });
    if (t && t.controlKey) recordCtxInteraction("copy", t);
    return true;
  }

  function removeBoundContext(id) {
    state.boundContext = (state.boundContext || []).filter(function (c) {
      return c.id !== id;
    });
  }

  function recordCtxInteraction(verb, targetOrKey) {
    if (!window.CW_CTX || !window.CW_CTX.record) return;
    var key = null;
    if (typeof targetOrKey === "string") key = targetOrKey;
    else if (targetOrKey && targetOrKey.controlKey) key = targetOrKey.controlKey;
    else if (state.ctxMenu && state.ctxMenu.target) key = state.ctxMenu.target.controlKey;
    else {
      var t = window.CW_CTX.resolveTarget
        ? window.CW_CTX.resolveTarget({ target: document.activeElement }, state)
        : null;
      if (t) key = t.controlKey;
    }
    if (!key) return;
    window.CW_CTX.record({ controlKey: key, verb: verb });
  }

  function runContextAction(verb, target) {
    target = target || (state.ctxMenu && state.ctxMenu.target);
    closeContextMenu();
    if (!target || !verb) return;
    recordCtxInteraction(verb, target);

    if (verb === "copy-path") {
      var text = target.path || target.id || "";
      if (navigator.clipboard && navigator.clipboard.writeText) {
        navigator.clipboard.writeText(text).catch(function () { /* fine */ });
      }
      return status("copied · " + text);
    }
    if (verb === "copy" || verb === "copy-chat") {
      return copyTargetContent(target, { fullChat: verb === "copy-chat" });
    }
    if (verb === "prompt-about") {
      return bindPromptFromTarget(target);
    }
    if (verb === "rename") {
      bindPromptFromTarget(target);
      cliValue = "rename this channel to ";
      var renameInput = $("[data-cli]");
      if (renameInput) renameInput.value = cliValue;
      recompute();
      render(true);
      focusCli();
      return status("rename · finish the new name and Enter");
    }
    if (verb === "dismiss") {
      dismissCurrent();
      return;
    }
    if (verb === "reply") {
      if (target.kind === "post" && target.id) {
        openThread(target.id);
        var who = target.name || "";
        var pathParts = window.CW_MAP.split(target.path || state.path || "/");
        var ch = null;
        var ci = pathParts.indexOf("channels");
        if (ci >= 0 && pathParts[ci + 1]) ch = pathParts[ci + 1];
        armReplyTo(target.id, who, ch, pathParts[0] === "projects" ? pathParts[1] : null);
        state.columnFocus = false;
        focusCli();
        return status("reply · " + (target.name || target.id));
      }
      state.columnFocus = false;
      focusCli();
      return status("compose");
    }
    if (verb === "open-thread") {
      if (target.id) openThread(target.id);
      return;
    }
    if (verb === "expand") {
      // Select + preview without full activate navigate when possible.
      selectTargetInNav(target);
      previewSelection();
      return status("preview · " + (target.name || target.id));
    }
    // activate (default)
    selectTargetInNav(target);
    activateSelection();
    status("activate · " + (target.name || target.id));
  }

  function selectTargetInNav(target) {
    if (!target) return;
    var MAP = window.CW_MAP;
    var path = target.path || state.path;
    var parts = MAP.split(path);
    var parent = MAP.join(parts.slice(0, -1)) || "/";
    var name = parts.length ? parts[parts.length - 1] : target.name;
    if (target.kind === "masthead") {
      goHome();
      return;
    }
    if (target.kind === "tab" && target.id && String(target.id).indexOf("session-") === 0) {
      var si = Number(String(target.id).replace("session-", ""));
      if (!isNaN(si)) switchSession(si);
      return;
    }
    // If path is a leaf under current listing, select it; else navigate parent then select.
    if (state.path !== parent && state.path !== path) {
      navigate(parent, { keepCli: true });
    }
    if (state.path === path && target.kind !== "channel" && target.kind !== "nav-item") {
      // Already at leaf path (e.g. post path) — open thread if post.
      if (target.kind === "post") openThread(target.id);
      return;
    }
    var all = entries();
    var ix = all.findIndex(function (e) { return e.name === name || e.name === target.elementKey; });
    if (ix < 0 && target.elementKey) {
      ix = all.findIndex(function (e) { return e.name === target.elementKey; });
    }
    if (ix >= 0) {
      state.cursor = ix;
      focusColumns();
    } else if (path && path !== state.path) {
      navigate(path, { keepCli: true });
    }
  }

  function acceptGhost() {
    var c = state.completion;
    if (!c) return false;
    if (state.candIndex >= 0 && c.candidates && c.candidates.length) syncCompletionToIndex();
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

  function actionContext(origin) {
    var focused = state.feedMark || state.threadFocus || null;
    var current = entries()[state.cursor];
    return {
      origin: origin,
      context: "board",
      objectId: focused || (current && (current.objectId || (current.post && current.post.id))) || undefined,
      projectionId: state.projectionId || undefined,
      authorize: function (permission, descriptor) {
        if (permission !== "community.participate") return false;
        return requireParticipation(descriptor && descriptor.label ? descriptor.label.toLowerCase() : "that action");
      },
    };
  }

  function invokeUiAction(actionId, input, origin, objectId) {
    if (!window.CW_ACTIONS) return Promise.reject(new Error("action registry unavailable"));
    var context = actionContext(origin || "pointer");
    if (objectId) context.objectId = objectId;
    return window.CW_ACTIONS.invoke(actionId, input || {}, context).catch(function (error) {
      status("action failed · " + ((error && error.message) || actionId));
      return false;
    });
  }

  function actionKeyAlias(ev) {
    var parts = [];
    if (ev.ctrlKey) parts.push("Ctrl");
    if (ev.metaKey) parts.push("Meta");
    if (ev.altKey) parts.push("Alt");
    if (ev.shiftKey) parts.push("Shift");
    var key = ev.key;
    if (key && key.length === 1) {
      key = ev.shiftKey || ev.ctrlKey || ev.metaKey || ev.altKey ? key.toUpperCase() : key.toLowerCase();
    }
    if (!key || /^(Control|Meta|Alt|Shift)$/.test(key)) return "";
    parts.push(key);
    return parts.join("+");
  }

  function actionKeyAllowed(actionId, alias, target) {
    var descriptor = window.CW_ACTIONS && window.CW_ACTIONS.get(actionId);
    if (!descriptor) return false;
    if (target && target.closest && target.closest("[data-editor]")) return false;
    var binding = (descriptor.keyBindings || []).find(function (item) {
      return (item.key || item) === alias;
    });
    var contexts = binding && binding.contexts || [];
    if (!contexts.length || contexts.indexOf("board") >= 0) return true;
    var region = target && target.closest && target.closest(".cn-thread-tree")
      ? "thread-outline"
      : target && target.closest && target.closest('.cn-tree[role="feed"]')
        ? "feed"
      : target && target.closest && target.closest("[data-cli]")
        ? (state.completion ? "completion" : "composer")
        : "navigator";
    return contexts.indexOf(region) >= 0;
  }

  function recordNavigationVisit(candidate) {
    if (!candidate) return;
    var id = candidate.id || candidate.objectId || candidate.projectionId || candidate.value;
    if (!id) return;
    var visits = (state.navigationVisits || []).filter(function (item) { return item.id !== id; });
    var prior = (state.navigationVisits || []).find(function (item) { return item.id === id; });
    visits.unshift({ id: id, count: (prior && prior.count || 0) + 1, visitedAt: Date.now() });
    state.navigationVisits = visits.slice(0, 40);
  }

  function openJumpChooser(terms) {
    terms = String(terms || "").trim();
    var returnFocus = document.activeElement;
    cliValue = "zi " + terms;
    state.cliOpen = true;
    state.intelOpen = false;
    state.helpOpen = false;
    state.menuDismissed = false;
    var ranked = window.CW_COMPLETE.jumpCandidates(terms, { cwd: state.path, extra: state.merged });
    var groupOrder = [];
    var grouped = {};
    ranked.forEach(function (candidate) {
      var group = candidate.group || "GLOBAL";
      if (!grouped[group]) { grouped[group] = []; groupOrder.push(group); }
      grouped[group].push(candidate);
    });
    state.completion = {
      kind: "jump",
      query: terms,
      candidates: groupOrder.reduce(function (all, group) { return all.concat(grouped[group]); }, []),
      replaceFrom: 3,
      insert: "",
      ghost: "",
    };
    state.candIndex = -1;
    render(true);
    focusCli();
    pushLayer("completion", "jump chooser", "close jump chooser", function () {
      state.menuDismissed = true;
      state.candIndex = -1;
      render(true);
      focusCli();
    }, returnFocus);
    status("jump chooser · ↑/↓ select · Enter accept · Esc close");
    return true;
  }

  function jumpBest(terms) {
    var candidates = window.CW_COMPLETE.jumpCandidates(terms, { cwd: state.path, extra: state.merged });
    if (!candidates.length) {
      status("z: no destination for " + terms);
      return false;
    }
    var first = candidates[0];
    var second = candidates[1];
    var unique = first.matchReason === "exact" || !second || first.score - second.score >= 15;
    if (!unique) return openJumpChooser(terms);
    if (!navigate(first.value, { keepCli: true })) {
      status("z: destination unavailable: " + first.value);
      return false;
    }
    recordNavigationVisit(first);
    status("z · " + first.value + " · " + first.matchReason);
    return true;
  }

  function threadAction(actionId) {
    if (!MAP.messageGraph) return false;
    var messages = (D.posts || []).concat(state.merged || []);
    var graph = MAP.messageGraph(messages);
    var current = state.threadFocus || state.feedMark;
    if (!current) return false;
    var method = {
      "thread.parent": "parentOf",
      "thread.root": "rootOf",
      "thread.firstChild": "firstChildOf",
      "thread.nextSibling": "nextSiblingOf",
      "thread.previousSibling": "previousSiblingOf",
      "thread.nextUnread": "nextUnreadOf",
    }[actionId];
    if (!method || typeof graph[method] !== "function") return false;
    var target = graph[method](current);
    var id = target && (target.objectId || (target.ref && target.ref.objectId) || target.id || target);
    if (!id) return false;
    return openThread(id);
  }

  function postForAction(objectId) {
    var all = (D.posts || []).concat(D.projectPosts || [], D.dmMessages || [], state.merged || []);
    return all.find(function (post) {
      return post.id === objectId || canonicalPostId(post) === objectId;
    }) || null;
  }

  function actionPostId(input, context) {
    var requested = input.objectId || context.objectId || state.feedMark || state.threadFocus;
    var post = postForAction(requested);
    return post ? post.id : requested;
  }

  function togglePostVote(postId, direction) {
    var currentVote = state.votes[postId] || 0;
    state.votes[postId] = currentVote === direction ? 0 : direction;
    if (state.votes[postId] === 0) delete state.votes[postId];
    render(true);
    return { objectId: postId, vote: state.votes[postId] || 0 };
  }

  function armPostReply(postId) {
    var post = postForAction(postId);
    if (!post) throw new Error("reply target unavailable");
    armReplyTo(post.id, post.who || "there", post.channel, post.project);
    state.columnFocus = false;
    state.ai = true;
    cliValue = "";
    render(true);
    focusCli();
    status("reply @" + (post.who || "there") + " — type and Enter to post");
    return { objectId: post.id };
  }

  function copyPostShare(kind, postId) {
    var link = shareLink(kind, postId);
    if (!navigator.clipboard || !navigator.clipboard.writeText) {
      status((kind === "contextual" ? "share" : kind) + ": " + link);
      return { objectId: postId, link: link, copied: false };
    }
    return navigator.clipboard.writeText(link).then(function () {
      status("copied " + kind + " link");
      return { objectId: postId, link: link, copied: true };
    });
  }

  function executeAction(actionId, input, context) {
    input = input || {};
    context = context || {};
    var actionArg = input.arg || String(input.line || "").trim().split(/\s+/).slice(1).join(" ");
    if (actionId === "nav.enter" && input.path) {
      if (!navigate(input.path, { keepCli: true })) throw new Error("no such path: " + input.path);
      return { path: state.path };
    }
    if (actionId === "nav.ascend") {
      var parentPath = MAP.navParentPath ? MAP.navParentPath(state.path) : state.path;
      if (!parentPath || parentPath === state.path) {
        var parentParts = MAP.split(state.path);
        parentPath = MAP.join(parentParts.slice(0, -1)) || "/";
      }
      if (!navigate(parentPath, { keepCli: true })) {
        throw new Error("no namespace parent for " + state.path);
      }
      return { path: state.path };
    }
    if (actionId === "view.save") {
      if (!window.CW_SAVED_VIEWS) throw new Error("saved views unavailable");
      return window.CW_SAVED_VIEWS.save({
        label: actionArg || "Saved view",
        query: state.feedQuery || "",
        sort: state.sort,
        visibility: "private",
      });
    }
    if (actionId === "view.open") {
      var saved = window.CW_SAVED_VIEWS && (window.CW_SAVED_VIEWS.get(actionArg || input.view || input.projectionId) ||
        window.CW_SAVED_VIEWS.list().find(function (view) { return view.label === actionArg; }));
      if (!saved) throw new Error("saved view unavailable");
      navigate("/views/" + saved.projectionId, { keepCli: true });
      return saved;
    }
    if (actionId === "view.delete") {
      if (!window.CW_SAVED_VIEWS || !window.CW_SAVED_VIEWS.delete(actionArg || input.view || input.projectionId)) {
        throw new Error("saved view unavailable");
      }
      return { deleted: actionArg || input.view || input.projectionId };
    }
    if (actionId === "jump.best") return jumpBest(input.terms || input.arg || "");
    if (actionId === "jump.interactive") {
      return input.interactive === false ? jumpBest(input.terms || "") : openJumpChooser(input.terms || input.arg || "");
    }
    if (actionId === "compose.publish") {
      var body = String(input.body || "").trim();
      if (!body) throw new Error("body required");
      var compose = composeContext();
      if (input.re) {
        armReplyTo(input.re, "there", input.channel || (compose && compose.channel), compose && compose.project);
        compose = composeContext();
      } else if (input.channel && compose.kind !== "reply") {
        compose = {
          kind: "post",
          channel: input.channel,
          channelLabel: input.channel,
          project: (compose && compose.project) || "community",
          path: state.path,
        };
      }
      if (compose.kind !== "reply" && compose.kind !== "post" && compose.kind !== "dm") {
        throw new Error("not in a channel/dm/reply scope — navigate first or pass channel");
      }
      var published = publishCompose(body, compose);
      if (!published) throw new Error("could not publish");
      return context.origin === "mcp" && window.CW_MCP
        ? window.CW_MCP.text("posted " + published.id + (published.re ? " re:" + published.re : "") +
          (published.channel ? " #" + published.channel : "") + (published.dm ? " dm:" + published.dm : ""))
        : published;
    }
    if (actionId === "channel.create" && !input.line) {
      var createdChannel = createChannel(input.name || actionArg, { project: input.project });
      if (!createdChannel || !createdChannel.ok) throw new Error(createdChannel && createdChannel.error || "create failed");
      return context.origin === "mcp" && window.CW_MCP
        ? window.CW_MCP.text("created channel " + createdChannel.name + " in " + createdChannel.project)
        : createdChannel;
    }
    if (actionId === "channel.rename") {
      var renamedChannel = renameChannel(input.from, input.to, { project: input.project });
      if (!renamedChannel || !renamedChannel.ok) throw new Error(renamedChannel && renamedChannel.error || "rename failed");
      return context.origin === "mcp" && window.CW_MCP
        ? window.CW_MCP.text("renamed #" + renamedChannel.from + " → #" + renamedChannel.to + " · " + renamedChannel.path)
        : renamedChannel;
    }
    if (actionId === "project.create" && !input.line) {
      var createdProject = createProject(input.name || actionArg);
      if (!createdProject || !createdProject.ok) throw new Error(createdProject && createdProject.error || "create failed");
      return context.origin === "mcp" && window.CW_MCP
        ? window.CW_MCP.text("created project " + createdProject.id + " → /projects/" + createdProject.id)
        : createdProject;
    }
    if (input.line) {
      var nested = Object.assign({}, input.options || {}, { actionDispatch: true });
      return context.origin === "slash" || input.surface === "slash"
        ? runSlash(input.line, nested)
        : run(input.line, nested);
    }
    var postId = actionPostId(input, context);
    if (actionId === "post.voteUp") return togglePostVote(postId, 1);
    if (actionId === "post.voteDown") return togglePostVote(postId, -1);
    if (actionId === "post.reactionPicker") {
      state.reactPick = state.reactPick === postId ? null : postId;
      render(true);
      return { objectId: postId, open: state.reactPick === postId };
    }
    if (actionId === "post.react") {
      toggleReaction(postId, input.reaction);
      return { objectId: postId, reaction: input.reaction };
    }
    if (actionId === "post.fold") {
      if (state.folded[postId]) delete state.folded[postId];
      else {
        var foldGraph = threadGraph();
        var selectedId = state.feedMark;
        var hidesSelection = foldGraph && selectedId && foldGraph.descendantsOf(postId)
          .some(function (ref) { return ref.objectId === selectedId; });
        state.folded[postId] = true;
        if (hidesSelection) state.feedMark = postId;
      }
      render(true);
      return { objectId: postId, folded: !!state.folded[postId] };
    }
    if (actionId === "post.repost") {
      if (state.reposts[postId]) delete state.reposts[postId];
      else state.reposts[postId] = true;
      render(true);
      status((state.reposts[postId] ? "reposted " : "repost removed · ") + postId);
      return { objectId: postId, reposted: !!state.reposts[postId] };
    }
    if (actionId === "compose.reply") return armPostReply(postId);
    if (actionId === "share.contextual") return copyPostShare("contextual", postId);
    if (actionId === "share.canonical") return copyPostShare("canonical", postId);
    if (actionId === "share.exact") return copyPostShare("exact", postId);
    if (actionId === "post.copy") {
      return copyTargetContent({
        kind: "post", id: postId, name: postId, path: state.path, controlKey: "post:" + postId,
      });
    }
    if (actionId === "history.back") return window.history.back();
    if (actionId === "history.forward") return window.history.forward();
    if (actionId === "history.previousLocation") return navigate(state.prev || "/", { keepCli: true });
    if (actionId === "cancel.topLayer") return cancelTopLayer();
    if (actionId.indexOf("thread.") === 0) return threadAction(actionId);
    throw new Error("action has no runtime: " + actionId);
  }

  function shareLink(kind, postId) {
    var entry = feedEntries().find(function (candidate) {
      return candidate && candidate.post && candidate.post.id === postId;
    });
    var ref = entry ? MAP.objectRef(entry.post) : MAP.objectAtPath(state.path, state.merged);
    if (!ref) throw new Error("share target unavailable");
    var options = { origin: window.location.origin };
    if (kind !== "canonical") options.projectionId = MAP.projectionForPath(state.path).projectionId;
    if (kind === "exact") {
      if (!ref.revision) throw new Error("exact revision unavailable");
      options = { origin: window.location.origin, revision: ref.revision };
    }
    return window.CW_CORE.objectUrl(ref, options);
  }

  function run(line, opts) {
    opts = opts || {};
    var text = String(line || "").trim();
    // Empty text is still a send when attachments are staged (chat context only).
    if (text === "" && !(state.attachments && state.attachments.length)) {
      closeCli();
      return;
    }
    if (text && !opts.actionDispatch) {
      state.history.push(text);
      state.histIndex = -1;
    }
    var parts = text ? text.split(/\s+/) : [""];
    var cmd = parts[0];
    var arg = parts.slice(1).join(" ");
    if (!opts.actionDispatch && window.CW_ACTIONS) {
      var cliAction = window.CW_ACTIONS.resolve("cli", cmd);
      if (cliAction) {
        return window.CW_ACTIONS.invoke(cliAction, { line: text, arg: arg, options: opts }, actionContext("cli"))
          .catch(function (error) {
            pushLine({ kind: "error", text: error && error.message || String(error) });
            status("action failed · " + cliAction);
            return false;
          });
      }
    }
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
      reply = window.CW_ATTACH && window.CW_ATTACH.formatContext
        ? window.CW_ATTACH.formatContext(atts)
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
      var moved = navigate(dest || "/", { keepCli: true });
      if (!moved && /^[a-z0-9][a-z0-9._:-]*$/i.test(dest || "")) {
        var projection = MAP.projectionForPath(state.path);
        var objectPath = MAP.pathForObject(dest, projection.projectionId, state.merged);
        if (objectPath) moved = navigate(objectPath, { keepCli: true });
      }
      if (!moved) {
        var guess = window.CW_COMPLETE.analyse("cd " + dest, { cwd: state.path, extra: state.merged });
        var suggestions = guess && guess.candidates || [];
        reply = "cd: no exact path: " + dest +
          (suggestions.length ? " · suggestions: " + suggestions.slice(0, 6).map(function (item) { return item.value; }).join(", ") : "");
      }
    } else if (cmd === "z") {
      return jumpBest(arg);
    } else if (cmd === "zi") {
      return openJumpChooser(arg);
    } else if (cmd === "ls") {
      var listTarget = MAP.resolve(state.path, arg || ".");
      var l = canEnterNamespace(listTarget) ? authorizedNamespaceEntries(listTarget) : null;
      reply = l
        ? l.map(function (e) { return (e.kind === "dir" ? "▸ " : "  ") + e.name; }).join("  ")
        : "ls: not a directory";
    } else if (cmd === "cat") {
      var catTarget = MAP.resolve(state.path, arg);
      var p = canEnterNamespace(catTarget) ? MAP.postAt(catTarget, state.merged) : null;
      reply = p
        ? p.who + " " + p.at + " · " + p.state + "\n" + p.body + "\nsig: " + p.sig
        : "cat: not a readable entry";
    } else if (cmd === "sort") {
      var sorts = (window.CW_CONSOLE_VIEWS && window.CW_CONSOLE_VIEWS.SORTS) || ["hot", "new", "top", "best"];
      if (sorts.indexOf(arg) !== -1) {
        applyFeedView(arg);
        reply = "sort: " + arg;
      } else reply = "sort: " + sorts.join(" | ");
    } else if (cmd === "view" || cmd === "q" || cmd === "query") {
      if (!arg || arg === "help") {
        reply = window.CW_QUERY && window.CW_QUERY.helpText
          ? window.CW_QUERY.helpText()
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
        authorizedNamespaceEntries(root).forEach(function (e) {
          if (window.CW_COMPLETE.score(e.name, arg) !== null) hits.push(root + "/" + e.name);
          if (e.kind === "dir") {
            authorizedNamespaceEntries(root + "/" + e.name).forEach(function (f) {
              if (window.CW_COMPLETE.score(f.name, arg) !== null) hits.push(root + "/" + e.name + "/" + f.name);
            });
          }
        });
      });
      reply = hits.length ? hits.slice(0, 12).join("\n") : "find: nothing matched";
    } else if (cmd === "search") {
      return finishSearch(arg);
    } else if (cmd === "grep") {
      var g = D.posts.concat(state.merged.filter(function (post) { return !post.dm; })).filter(function (q) {
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
    } else if (cmd === "macro" || cmd === "skill") {
      var macroResult = window.CW_POWER
        ? window.CW_POWER.command(arg)
        : { ok: false, text: "macro: unavailable" };
      reply = macroResult.text;
    } else if (cmd === "hobo") {
      var hoboResult = window.CW_HOBO
        ? window.CW_HOBO.run(arg)
        : { ok: false, text: "hobo: workbench unavailable" };
      reply = hoboResult.text;
    } else if (cmd === "stat") {
      reply = "epoch " + D.board.epoch + " · " + D.board.landed + "/" + D.board.total +
        " landed · ships " + D.board.ships;
    } else if (cmd === "help") {
      reply = window.CW_COMPLETE.formatGroupedHelp
        ? window.CW_COMPLETE.formatGroupedHelp(window.CW_COMPLETE.COMMANDS)
        : window.CW_COMPLETE.COMMANDS.map(function (c) {
          return c.name + (c.arg ? " <" + c.arg + ">" : "") + "  " + c.help;
        }).join("\n");
    } else if (cmd === "clear") {
      state.lines = [];
      state.sessionOutFocus = false;
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
   * Surface the session transcript as its own dedicated blade so agent/CLI
   * turns are never mixed into home feed / creators / thread content.
   */
  function revealSessionChat(opts) {
    opts = opts || {};
    state.sessionClosed = false;
    state.sessionOutFocus = true;
    if (sessionBladeIndex() >= 0) state.focus = sessionBladeIndex();
    if (!opts.noRender) render(true);
    pushLayer("session-transcript", "session transcript", "close session", function () {
      closeSessionBlade(); focusCli();
    }, document.activeElement);
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
    if (!opts.silent) status("session · chat pane");
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
    var known = window.CW_MAP && window.CW_MAP.isKnownPeer
      ? window.CW_MAP.isKnownPeer(handle)
      : (window.CW_DATA.members || []).some(function (mem) {
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
    var E = window.CW_AGENT.EVENT;
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
    if (!window.CW_ATTACH) {
      return (atts || []).map(function (a) {
        return { id: a.id, name: a.name, size: a.size, type: a.type, kind: a.kind, error: a.error };
      });
    }
    return (atts || []).map(window.CW_ATTACH.meta);
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
    if (!window.CW_ATTACH) {
      status("attachments module not loaded");
      return Promise.resolve(0);
    }
    var existing = (state.attachments || []).length;
    return window.CW_ATTACH.readFiles(files, { existing: existing }).then(function (atts) {
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
      if (state.attachments.length > window.CW_ATTACH.MAX_FILES) {
        state.attachments = state.attachments.slice(0, window.CW_ATTACH.MAX_FILES);
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
    if (window.CW_ATTACH && window.CW_ATTACH.composeInput) {
      return window.CW_ATTACH.composeInput(text, atts);
    }
    return String(text || "");
  }

  /**
   * Emit a user transcript line (with optional attachment chips) and return
   * the agent-facing input that includes attachment context.
   */
  function beginUserTurn(text, mode, atts) {
    atts = atts || takeAttachments();
    var bound = (state.boundContext || []).slice();
    var display = String(text || "").trim();
    if (!display && atts.length) display = "(attached " + atts.length +
      " file" + (atts.length === 1 ? "" : "s") + ")";
    if (bound.length && window.CW_CTX && window.CW_CTX.composeWithBoundContext) {
      display = window.CW_CTX.composeWithBoundContext(display, bound);
    }
    pushLine({
      kind: "user",
      text: display,
      mode: mode || (state.ai ? "ai" : "cli"),
      attachments: attachmentMetaList(atts),
      boundContext: bound.map(function (c) {
        return { id: c.id, name: c.name, kind: c.kind };
      }),
      _pendingAsk: mode === "ai",
    });
    // Agent/chat turns claim the dedicated session blade immediately.
    if (mode === "ai" || mode === "compose") {
      state.sessionClosed = false;
      state.sessionOutFocus = true;
      if (sessionBladeIndex() >= 0) state.focus = sessionBladeIndex();
    }
    clearBoundContext();
    return {
      display: display,
      agentInput: composeWithAttachments(display, atts),
      attachments: atts,
      boundContext: bound,
    };
  }

  async function ask(text) {
    if (state.busy) return;
    state.busy = true;
    state._askInconclusive = false;
    var here = authorizedNamespaceEntries(state.path).map(function (e) { return e.name; });
    var turn = beginUserTurn(text, "ai");
    try {
      await window.CW_AGENT.run(turn.agentInput, {
        cwd: state.path,
        workspaceId: "workspace-" + (state.activeSession + 1),
        here: here,
        compose: composeContext(),
        signal: undefined,
        attachments: turn.attachments,
        displayInput: turn.display,
        boundContext: turn.boundContext || [],
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
    if (first.charAt(0) === "/") return !!window.CW_COMPLETE.slashSpec(first);
    return window.CW_COMPLETE.COMMANDS.some(function (c) { return c.name === first; });
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
      var caps = window.CW_COMPLETE.actCapabilities
        ? window.CW_COMPLETE.actCapabilities({ cwd: state.path, extra: state.merged })
        : [];
      if (!caps.length) {
        return finishAct("act · nothing context-bound here — open a post, …/channels, or a voice room");
      }
      return finishAct("act · available here:\n" + caps.map(function (c) {
        return "  " + c.value + " — " + c.hint;
      }).join("\n"));
    }

    if (verb === "share") {
      var link = shareLink("contextual", state.threadFocus || state.feedMark);
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
      var hereR = feedEntries();
      var selR = entries()[state.cursor];
      var post = selR && selR.post ? selR.post : null;
      if (!post && state.threadFocus) {
        for (var ri = 0; ri < hereR.length; ri++) {
          if (hereR[ri].post && hereR[ri].post.id === state.threadFocus) {
            post = hereR[ri].post;
            break;
          }
        }
      }
      if (!post && state.feedMark) {
        for (var rj = 0; rj < hereR.length; rj++) {
          if (hereR[rj].post && hereR[rj].post.id === state.feedMark) {
            post = hereR[rj].post;
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
  function runSlash(line, opts) {
    opts = opts || {};
    var text = String(line || "").trim();
    if (!window.CW_COMPLETE.isSlash(text)) return false;
    var parts = text.split(/\s+/);
    var verb = parts[0].toLowerCase();
    var arg = parts.slice(1).join(" ");
    if (!opts.actionDispatch && window.CW_ACTIONS) {
      var slashAction = window.CW_ACTIONS.resolve("slash", verb);
      if (slashAction) {
        return window.CW_ACTIONS.invoke(slashAction, { line: text, arg: arg, options: opts }, actionContext("slash"))
          .catch(function (error) {
            pushLine({ kind: "error", text: error && error.message || String(error) });
            status("action failed · " + slashAction);
            return false;
          });
      }
    }
    var spec = window.CW_COMPLETE.slashSpec(verb);
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
            return (window.CW_ATTACH ? window.CW_ATTACH.chipLabel(a) : a.name);
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
        var guess = window.CW_COMPLETE.analyse("cd " + dest, { cwd: state.path, extra: state.merged });
        var suggestions = guess && guess.candidates || [];
        reply = "/go: no exact path: " + dest +
          (suggestions.length ? " · suggestions: " + suggestions.slice(0, 6).map(function (item) { return item.value; }).join(", ") : "");
      } else {
        reply = "/go: " + state.path;
      }
    } else if (run === "jump-interactive") {
      openJumpChooser(arg);
      reply = null;
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
        reply = "themes: " + window.CW_THEMES.map(function (t) { return t.id; }).join(", ");
      } else {
        var ti = window.CW_THEMES.findIndex(function (t) {
          return t.id === arg || t.name.toLowerCase() === arg.toLowerCase();
        });
        if (ti === -1) reply = "unknown theme: " + arg;
        else { setTheme(ti); reply = "theme is " + window.CW_THEMES[ti].name; }
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
      reply = window.CW_COMPLETE.formatGroupedHelp
        ? window.CW_COMPLETE.formatGroupedHelp(window.CW_COMPLETE.SLASH_COMMANDS)
        : window.CW_COMPLETE.SLASH_COMMANDS.map(function (c) {
          return c.name + (c.arg ? " <" + c.arg + ">" : "") + "  " + c.help;
        }).join("\n");
      reply += "\n\n/act is context-dependent — type /act for actions here.";
    } else if (run === "act") {
      return runActCommand(arg);
    } else if (run === "keys") {
      toggleKeys();
      return true;
    } else if (run === "share") {
      var link = shareLink("contextual", state.threadFocus || state.feedMark);
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
      var hereR = authorizedNamespaceEntries(state.path);
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
        reply = window.CW_QUERY && window.CW_QUERY.helpText
          ? window.CW_QUERY.helpText()
          : "Lucene feed views: state:needs-review who:maya sort:new";
      } else if (arg === "clear" || arg === "reset") {
        setFeedQuery("", "hot");
        state.sort = "hot";
        reply = "view cleared · hot";
      } else {
        // Named preset id or free-form query.
        var presets = window.CW_QUERY && window.CW_QUERY.presets
          ? window.CW_QUERY.presets()
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
      var det = window.CW_SESSION ? window.CW_SESSION.authDetail(identity) : identity.kind;
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
          // Keep prompt focus — do not set columnFocus here. Enter just
          // submitted /space; flipping columnFocus would make the same key
          // activate the first catalogue row.
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
          var knownPeer = window.CW_MAP.isKnownPeer
            ? window.CW_MAP.isKnownPeer(handle)
            : (window.CW_DATA.members || []).some(function (m) {
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
          if (sample && window.CW_NOTIFY) {
            window.CW_NOTIFY.deliver(Object.assign({}, sample, { unread: true }), {
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
            ? " · " + window.CW_NOTIFY.permissionLabel()
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
    if (!window.CW_QUERY || !window.CW_QUERY.searchBoard) {
      return { text: "search: query engine unavailable", format: null, html: null };
    }
    var result = window.CW_QUERY.searchBoard(query, {
      extra: state.merged,
      votes: state.votes,
      reactions: state.reactions,
      members: (window.CW_DATA && window.CW_DATA.members) || [],
      viewer: viewerContext(),
    });
    var formatted = window.CW_QUERY.formatSearchResults(result, { limit: opts.limit });
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
    requestAnimationFrame(function () {
      if (!detailOwnsKeyboard()) return;
      var post = document.querySelector('.cn-blade[data-blade-kind="detail"] .cn-comment[tabindex="0"]');
      if (post) try { post.focus({ preventScroll: true }); } catch { /* fine */ }
    });
  }

  /** Focusing the prompt from a post detail begins writing a reply. */
  function swapFocusContext() {
    if (state.columnFocus) {
      state.columnFocus = false;
      if (state.threadFocus) {
        var replyPost = null;
        var pool = feedEntries();
        for (var ri = 0; ri < pool.length; ri++) {
          if (pool[ri].post && pool[ri].post.id === state.threadFocus) {
            replyPost = pool[ri].post;
            break;
          }
        }
        if (!replyPost) {
          var sel = entries()[state.cursor];
          if (sel && sel.post) replyPost = sel.post;
        }
        if (replyPost) {
          armReplyTo(replyPost.id, replyPost.who, replyPost.channel, replyPost.project);
        }
      }
      render(true);
      focusCli();
      status(state.replyTo
        ? ("reply · @" + (state.replyTo.who || "there") + " — Tab returns to panels")
        : "prompt — Tab returns to panels");
      return "prompt";
    }
    focusColumns();
    render(true);
    status("panels — Tab returns to prompt");
    return "panels";
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
    if (k.length === 1 && /^[hjklzyvre]$/i.test(k)) return true;
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

    // Right-click: themed context menu (suppress native browser menu).
    document.addEventListener("contextmenu", function (ev) {
      if (!window.CW_CTX) return;
      var inBoard = ev.target.closest && (
        ev.target.closest("[data-mount]") ||
        ev.target.closest(".cw-bar") ||
        ev.target.closest("[data-region='status']")
      );
      if (!inBoard) return;
      // Allow native menu in text inputs when selecting text (optional UX);
      // still offer our menu for the prompt chrome itself.
      var t = window.CW_CTX.resolveTarget(ev, state);
      if (!t) return;
      try { ev.preventDefault(); } catch { /* fine */ }
      openContextMenu(ev, t);
      render(true);
      if (!focusContextMenuItem(0)) {
        window.requestAnimationFrame(function () { focusContextMenuItem(0); });
      }
      status("context · " + (t.kind || "ctrl") + " · " + (t.name || t.id));
    });

    mount.addEventListener("click", function (ev) {
      var ctxPrompt = ev.target.closest("[data-ctx-prompt]");
      if (ctxPrompt) {
        try { ev.preventDefault(); ev.stopPropagation(); } catch { /* fine */ }
        var tgt = state.ctxMenu && state.ctxMenu.target;
        return bindPromptFromTarget(tgt);
      }
      var ctxAction = ev.target.closest("[data-ctx-action]");
      if (ctxAction) {
        try { ev.preventDefault(); ev.stopPropagation(); } catch { /* fine */ }
        return runContextAction(
          ctxAction.getAttribute("data-ctx-verb"),
          state.ctxMenu && state.ctxMenu.target,
        );
      }
      var ctxBoundRm = ev.target.closest("[data-ctx-bound-rm]");
      if (ctxBoundRm) {
        try { ev.preventDefault(); } catch { /* fine */ }
        removeBoundContext(ctxBoundRm.getAttribute("data-ctx-bound-rm"));
        return render(true);
      }
      var ctxBoundClear = ev.target.closest("[data-ctx-bound-clear]");
      if (ctxBoundClear) {
        try { ev.preventDefault(); } catch { /* fine */ }
        clearBoundContext();
        return render(true);
      }
      // Click away closes the context menu.
      if (state.ctxMenu && state.ctxMenu.open && !ev.target.closest("[data-ctx-menu]")) {
        closeContextMenu();
        render(true);
      }
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
        return invokeUiAction("post.fold", { objectId: fold.dataset.fold }, "pointer", fold.dataset.fold);
      }
      var notifOpen = ev.target.closest("[data-notif-open]");
      if (notifOpen) {
        openNotification(notifOpen.dataset.notifOpen);
        return;
      }
      var notifReadBtn = ev.target.closest("[data-notif-read], [data-notif-dismiss]");
      if (notifReadBtn) {
        var nid = notifReadBtn.dataset.notifRead || notifReadBtn.dataset.notifDismiss;
        markNotificationRead(nid);
        if (window.CW_NOTIFY) window.CW_NOTIFY.markPushed(nid);
        render(true);
        paintActivityBell();
        return status("dismissed");
      }
      // Clicking the activity card body (not a button) opens the source.
      var notifCard = ev.target.closest("[data-notif]");
      if (notifCard && !ev.target.closest("button")) {
        openNotification(notifCard.dataset.notif);
        return;
      }
      var voteBtn = ev.target.closest("[data-vote-id]");
      if (voteBtn) {
        var vid = voteBtn.dataset.voteId;
        return invokeUiAction(voteBtn.dataset.vote === "down" ? "post.voteDown" : "post.voteUp",
          { objectId: vid }, "pointer", vid);
      }
      var repostBtn = ev.target.closest("[data-repost]");
      if (repostBtn) {
        var repostId = repostBtn.dataset.repost;
        return invokeUiAction("post.repost", { objectId: repostId }, "pointer", repostId);
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
        return invokeUiAction("post.reactionPicker", { objectId: pickId }, "pointer", pickId);
      }
      var reactBtn = ev.target.closest("[data-react][data-react-id]");
      if (reactBtn) {
        return invokeUiAction("post.react", {
          objectId: reactBtn.dataset.reactId, reaction: reactBtn.dataset.react,
        }, "pointer", reactBtn.dataset.reactId);
      }
      // Click outside an open picker closes it.
      if (state.reactPick && !ev.target.closest("[data-react-picker]")) {
        state.reactPick = null;
        // Fall through so other clicks still work after close.
      }
      var replyBtn = ev.target.closest("[data-reply]");
      if (replyBtn) {
        var rid = replyBtn.dataset.reply;
        return invokeUiAction("compose.reply", { objectId: rid }, "pointer", rid);
      }
      var copyPostBtn = ev.target.closest("[data-copy-post]");
      if (copyPostBtn) {
        try { ev.preventDefault(); ev.stopPropagation(); } catch { /* fine */ }
        var copyPostId = copyPostBtn.getAttribute("data-copy-post");
        return invokeUiAction("post.copy", { objectId: copyPostId }, "pointer", copyPostId);
      }
      var copyChatBtn = ev.target.closest("[data-copy-chat]");
      if (copyChatBtn) {
        try { ev.preventDefault(); ev.stopPropagation(); } catch { /* fine */ }
        return copyTargetContent({
          kind: "chat",
          id: "session-chat",
          name: "session chat",
          path: state.path,
          controlKey: "chat:session",
        });
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
      var shareBtn = ev.target.closest("[data-share]");
      if (shareBtn) {
        var sharePostId = shareBtn.dataset.sharePost;
        var shareKind = shareBtn.dataset.shareKind || "contextual";
        return invokeUiAction("share." + shareKind, { objectId: sharePostId }, "pointer",
          sharePostId || state.threadFocus || state.feedMark);
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
        state.feedQueryOpen = false;
        return;
      }
      if (ev.target.closest("[data-feed-query-toggle]")) {
        state.feedQueryOpen = !state.feedQueryOpen;
        render(true);
        if (state.feedQueryOpen) {
          var qFocus = $("[data-feed-query]");
          if (qFocus) try { qFocus.focus({ preventScroll: true }); } catch { /* fine */ }
          return status("feed view query — Lucene fields, Esc / clear to fold");
        }
        return status("feed view folded");
      }
      if (ev.target.closest("[data-feed-query-help]")) {
        state.feedQueryOpen = true;
        if (window.CW_QUERY && window.CW_QUERY.helpText) {
          pushLine({ kind: "out", text: window.CW_QUERY.helpText() });
          render(true);
          scrollOut();
        } else {
          render(true);
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
      if (ev.target.closest("[data-pane-zoom]")) {
        toggleFocusedPanel();
        return;
      }
      if (ev.target.closest("[data-nav-collapse]")) {
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
      var bladeGoto = ev.target.closest("[data-blade-goto]");
      if (bladeGoto) {
        try { ev.preventDefault(); } catch { /* fine */ }
        var bi = Number(bladeGoto.getAttribute("data-blade-goto"));
        if (!isNaN(bi)) {
          state.focus = bi;
          state.columnFocus = true;
          if (bi === detailBladeIndex()) state.detailOpen = true;
          render(true);
          revealFocusedBlade();
          return status("pane · " + (bi === 0 ? "nav" : (bi === 1 ? "feed" : "session")));
        }
      }
      var commentHit = ev.target.closest(".cn-comment");
      if (commentHit && !ev.target.closest(
        "button, a, [data-vote-id], [data-reply], [data-repost], [data-share-post], [data-copy-post], [data-fold], [data-react], [data-react-pick], [data-spoiler]",
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
      var followDismiss = ev.target.closest("[data-follow-dismiss]");
      if (followDismiss) {
        try { ev.preventDefault(); ev.stopPropagation(); } catch { /* fine */ }
        return dismissHomeFollow(followDismiss.dataset.followDismiss);
      }
      var followRead = ev.target.closest("[data-follow-read]");
      if (followRead) {
        try { ev.preventDefault(); ev.stopPropagation(); } catch { /* fine */ }
        return markHomeFollowRead(followRead.dataset.followRead);
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
      var actionControl = ev.target.closest("[data-action-id]");
      if (actionControl && window.CW_ACTIONS) {
        try { ev.preventDefault(); ev.stopPropagation(); } catch { /* fine */ }
        return window.CW_ACTIONS.invoke(actionControl.dataset.actionId, {
          terms: actionControl.dataset.actionTerms || "",
        }, actionContext("pointer")).catch(function (error) {
          status("action failed · " + ((error && error.message) || actionControl.dataset.actionId));
          return false;
        });
      }
      var item = ev.target.closest(".cn-item");
      if (item) {
        // Single click: select + preview in detail (path stays on the parent
        // branch). Enter / → / double-click activates or slides into a dir.
        var target = item.dataset.path;
        if (!target) return;
        var tParts = window.CW_MAP.split(target);
        var parentDir = window.CW_MAP.join(tParts.slice(0, -1)) || "/";
        var name = tParts[tParts.length - 1];
        if (state.path !== parentDir) {
          if (!navigate(parentDir, { keepCli: true })) return;
        }
        var all = entries();
        var ix = all.findIndex(function (e) { return e.name === name; });
        if (ix < 0) return;
        state.cursor = ix;
        focusColumns();
        setNavCollapsed(false, { silent: true, noRender: true });
        previewSelection();
        status("preview · " + name);
        return;
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
        if (lineDelta !== 0 && window.CW_EDITOR) {
          es.active.scroll = es.touchScroll;
          window.CW_EDITOR.scrollBy(es.active, lineDelta);
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
      if (!body || !state.editor || !state.editor.active || !window.CW_EDITOR) return;
      var delta = ev.deltaY > 0 ? 3 : -3;
      window.CW_EDITOR.scrollBy(state.editor.active, delta);
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
            if (panel) panel.style.setProperty("--cw-out-w", state.panes.outW + "rem");
          } else {
            state.panes.outH = Math.max(6, Math.min(40, startSize + d));
            if (panel) panel.style.setProperty("--cw-out-h", state.panes.outH + "rem");
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
        cols.style.setProperty("--cw-" + key, w + "rem");
        var other = key === "c0" ? "c1" : "c0";
        cols.style.setProperty("--cw-" + other,
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
      var item = ev.target.closest(".cn-item");
      if (item && item.closest('.cn-blade[data-blade-kind="list"]')) {
        ev.preventDefault();
        // Double-click activates the preview (same as Enter).
        focusColumns();
        activateSelection();
        return;
      }
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
      var editedCdPreview = !!cdPreview;
      if (editedCdPreview) cancelCdPreview({ noRender: true });
      state.menuDismissed = false;
      recompute();
      state.candIndex = -1;
      var open = menuShouldOpen();
      if (open && !state.helpOpen) {
        pushLayer("completion", "suggestions", "close suggestions", function () {
          state.menuDismissed = true; state.candIndex = -1; render(true); focusCli();
        }, cli);
      } else if (!open) {
        removeLayer("completion");
      }
      render(true);
      // Repaint the menu without stealing focus or resetting the caret.
      var menu = mount.querySelector(".cn-menu");
      var wrap = mount.querySelector(".cn-tui-foot") || mount.querySelector(".cn-prompt-stack");
      // Typing keeps intellisense in sync when it was opened via Ctrl+Space.
      if (wrap) wrap.dataset.open = String(open);
      // data-morph-keep freezes the input node — sync live ARIA here.
      cli.setAttribute("aria-expanded", open ? "true" : "false");
      if (open && state.completion && state.completion.candidates.length && state.candIndex >= 0) {
        cli.setAttribute("aria-activedescendant", "cn-cand-" + state.candIndex);
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
          menu.innerHTML = head + window.CW_CONSOLE_VIEWS.renderCandidateRows(cands, state.candIndex);
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
      if (ev.key === "Tab") {
        // Accessible default: Tab always follows native focus order. Completion
        // is explicit with arrows + Enter, or fish-style Right/End ghost accept.
        return;
      }
      if (ev.key === "Enter") {
        ev.preventDefault();
        // Arrow selection previews `cd` in place. Enter accepts that preview
        // and executes the resolved line; it must not fall back through the
        // generic combobox branch and merely reinsert the same option.
        var previewLine = acceptCdPreviewLine();
        if (!previewLine && menuShouldOpen() && state.candIndex >= 0 && state.completion &&
            state.completion.candidates[state.candIndex]) {
          var selected = state.completion.candidates[state.candIndex];
          if (state.completion.kind === "jump") {
            state.menuDismissed = true;
            state.candIndex = -1;
            var jumped = navigate(selected.value, { keepCli: true });
            if (jumped) recordNavigationVisit(selected);
            cliValue = "";
            cli.value = "";
            recompute();
            render(true);
            return status(jumped
              ? "jump · " + selected.value + " · " + (selected.matchReason || "selected")
              : "jump destination unavailable");
          }
          applyCandidate(selected.value, state.completion);
          cli.value = cliValue;
          state.menuDismissed = true;
          state.candIndex = -1;
          recompute();
          render(true);
          focusCli();
          return status("accepted suggestion · Enter again to run");
        }
        if (previewLine) {
          cliValue = previewLine;
          cli.value = previewLine;
        }
        // Enter always submits/runs the typed line. Autocomplete accept is Tab
        // (or click a candidate) — never Enter — so a open suggestion menu
        // cannot trap the key that means "send".
        closeIntel();
        var text = cli.value;
        // Allow send with only attachments or bound context staged.
        if (!String(text || "").trim() &&
            !(state.attachments && state.attachments.length) &&
            !(state.boundContext && state.boundContext.length)) {
          return;
        }
        cliValue = "";
        cli.value = "";
        recompute();
        // Slash commands always run locally (agent chat verbs). Bare CLI
        // commands also run directly. Compose scopes (reply/post/dm) publish
        // into the active blade — the whole page is the TUI, not a side terminal.
        if (window.CW_COMPLETE.isSlash(text)) {
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
        // The capture-phase layer stack already consumed a cancellable
        // Escape. Reaching the prompt means this is a bare, native Escape.
        return;
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
        return toggleFocusedPanel();
      }
      if (ev.altKey && ev.key.toLowerCase() === "j") {
        ev.preventDefault();
        return status("already full width");
      }
      if (ev.altKey && ev.key.toLowerCase() === "m") {
        ev.preventDefault();
        return status("already full width");
      }
      if (ev.altKey && ev.key.toLowerCase() === "d") {
        ev.preventDefault();
        return status("no dock to cycle");
      }
      if (ev.altKey && ev.key.toLowerCase() === "t") {
        ev.preventDefault();
        return newSession();
      }
      if (ev.key === "ArrowLeft" && ascendCdTypeahead(cli)) {
        ev.preventDefault();
        return;
      }
      if (ev.key === "ArrowRight" && drillCdTypeahead(cli)) {
        ev.preventDefault();
        return;
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
        if (c && c.candidates.length > 0 && menuOpen) {
          var n = c.candidates.length;
          state.candIndex = state.candIndex < 0
            ? (ev.key === "ArrowDown" ? 0 : n - 1)
            : ((state.candIndex + (ev.key === "ArrowDown" ? 1 : -1)) % n + n) % n;
          syncCompletionToIndex();
          highlightCandidate();
          paintGhost();
          previewCdCandidate();
          return;
        }
        if (!state.history.length) return;
        var dir = ev.key === "ArrowUp" ? 1 : -1;
        state.histIndex = Math.max(-1, Math.min(state.history.length - 1, state.histIndex + dir));
        cliValue = state.histIndex === -1 ? "" : state.history[state.history.length - 1 - state.histIndex];
        cli.value = cliValue;
        recompute();
        // History recall stays history recall until the user edits the draft;
        // an exact one-row completion must not capture the next Up/Down key.
        state.menuDismissed = true;
        paintGhost();
      }
    });
  }

  function wireGlobal() {
    document.addEventListener("click", function (ev) {
      if (ev.target.closest("[data-restart-cue]")) {
        ev.preventDefault();
        return window.CW_STARTUP && window.CW_STARTUP.apply && window.CW_STARTUP.apply();
      }
      if (ev.target.closest("[data-keys-open]")) {
        ev.preventDefault();
        return toggleKeys();
      }
      if (ev.target.closest("[data-model-fetch]")) {
        ev.preventDefault();
        if (typeof window.__cwModelFetchStart === "function") {
          window.__cwModelFetchStart();
        } else {
          status("on-device AI — press any key to download, or Alt+A for CLI");
        }
        return;
      }
      if (ev.target.closest("[data-merge]")) return mergePending();
      if (ev.target.closest("[data-goto-landing], [data-brand]")) {
        try { ev.preventDefault(); } catch { /* fine */ }
        return goLanding();
      }
      if (ev.target.closest("[data-goto-home]")) {
        try { ev.preventDefault(); } catch { /* fine */ }
        return goHome();
      }
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
        // Navigation must not wait for a browser permission prompt to settle.
        openActivity("all");
        if (browserNotifySupported() && browserNotifyPermission() === "default") {
          requestBrowserNotifications();
          return;
        }
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
      // Ctrl+U restarts only when startup work is pending. Otherwise the file
      // editor keeps its native page-up chord.
      if ((ev.ctrlKey || ev.metaKey) && !ev.altKey && ev.key.toLowerCase() === "u" &&
          startupPending().length) {
        ev.preventDefault();
        return window.CW_STARTUP.apply();
      }
      // Global Ctrl/Cmd+Space — available from columns as well as the prompt.
      if ((ev.ctrlKey || ev.metaKey) && (ev.key === " " || ev.code === "Space")) {
        // In editor insert mode, Ctrl+Space still opens intellisense only if not typing.
        if (!(state.editor && state.editor.focused && state.editor.active &&
              state.editor.active.mode === "insert")) {
          ev.preventDefault();
          return toggleKeys();
        }
      }
      var keyAlias = actionKeyAlias(ev);
      var keyAction = window.CW_ACTIONS && window.CW_ACTIONS.resolve("key", keyAlias);
      // A cancellable Escape is consumed by wireInteractionLayers in capture
      // phase. Reaching this dispatcher means it is a bare native Escape.
      if (ev.key === "Escape" && keyAction === "cancel.topLayer") keyAction = null;
      var treeKeyTarget = ev.target.closest && ev.target.closest('.cn-thread-tree [role="treeitem"]');
      var treeOwnsKey = treeKeyTarget &&
        ["ArrowLeft", "ArrowRight", "h", "l", "Enter"].indexOf(ev.key) >= 0;
      if (!treeOwnsKey && keyAction && actionKeyAllowed(keyAction, keyAlias, ev.target)) {
        ev.preventDefault();
        return window.CW_ACTIONS.invoke(keyAction, {}, actionContext("keyboard")).catch(function (error) {
          status("action failed · " + ((error && error.message) || keyAction));
          return false;
        });
      }

      if (state.ctxMenu && state.ctxMenu.open && !ev.altKey && !ev.ctrlKey && !ev.metaKey) {
        if (ev.key === "ArrowDown" || ev.key === "ArrowUp") {
          ev.preventDefault();
          return moveContextMenuFocus(ev.key === "ArrowDown" ? 1 : -1);
        }
        if (ev.key === "Home" || ev.key === "End") {
          ev.preventDefault();
          return focusContextMenuItem(ev.key === "Home" ? 0 : -1);
        }
        if (ev.key === "Enter" || ev.key === " " || ev.key === "Spacebar") {
          var menuItem = document.activeElement && document.activeElement.closest
            ? document.activeElement.closest("[role='menuitem']")
            : null;
          if (menuItem) {
            ev.preventDefault();
            return menuItem.click();
          }
        }
      }

      // Esc dismiss cascade (outermost first): auth → profile → context menu →
      // help/intel (later) → filter / selection / columns. Speech stop is capture-phase.
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
        if (state.ctxMenu && state.ctxMenu.open) {
          ev.preventDefault();
          closeContextMenu(true);
          render(true);
          return status("context closed");
        }
      }

      // Tab swaps panel ↔ prompt when panels own context (not masthead a11y tabbing).
      if (ev.key === "Tab" && !ev.altKey && !ev.ctrlKey && !ev.metaKey) {
        var authOpen = (function () {
          var d = $("[data-auth-dialog]");
          return d && d.dataset.open === "true" && !d.hidden;
        })();
        var onCli = ev.target.hasAttribute && ev.target.hasAttribute("data-cli");
        var onFeedQ = ev.target.hasAttribute && ev.target.hasAttribute("data-feed-query");
        var editorInsert = state.editor && state.editor.focused && state.editor.active &&
          state.editor.active.mode === "insert";
        if (!authOpen && !onFeedQ && !editorInsert && state.columnFocus && !onCli) {
          ev.preventDefault();
          return swapFocusContext();
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

      // A focused feed article owns message navigation. Child controls keep
      // native keyboard behavior; Tab continues to return to the prompt.
      var message = ev.target.closest && ev.target.closest(".cn-comment[data-key]");
      if (message && !ev.target.closest("button, a, input, textarea, select")) {
        var threadItem = message.getAttribute("role") === "treeitem";
        if (threadItem && (k === "ArrowLeft" || k === "h" || k === "ArrowRight" ||
            k === "l" || k === "Enter")) {
          ev.preventDefault();
          return handleThreadTreeKey(message, k);
        }
        if (k === "ArrowLeft" || k === "h") {
          if (ascendFocusedMessage()) {
            ev.preventDefault();
            return;
          }
        }
        if (k === "ArrowDown" || k === "j") {
          ev.preventDefault();
          return moveMessageFocus(1);
        }
        if (k === "ArrowUp" || k === "k") {
          ev.preventDefault();
          return moveMessageFocus(-1);
        }
        if (k === "Home" || k === "End") {
          ev.preventDefault();
          return moveMessageFocus(0, k === "Home" ? "start" : "end");
        }
        if (k === "PageUp" || k === "PageDown") {
          ev.preventDefault();
          return moveMessageFocus(k === "PageUp" ? -1 : 1, "page");
        }
        if (k === "Enter" || k === "ArrowRight" || k === "l") {
          ev.preventDefault();
          return openFocusedMessage(message.getAttribute("data-key"));
        }
      }

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
        // Escape cancellation is owned by the explicit capture-phase layer
        // stack. A bare Escape must bubble without mutating focus, ancestry,
        // detail, or history.
        return;
      }
      if (k === "v") {
        ev.preventDefault();
        var visible = (window.CW_CONSOLE_VIEWS && window.CW_CONSOLE_VIEWS.visibleFeedViews)
          ? window.CW_CONSOLE_VIEWS.visibleFeedViews(state)
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
        return toggleFocusedPanel();
      }
      // Yank: copy focused content (post thread, channel feed, chat, …).
      if (k === "y" && state.columnFocus && window.CW_CTX && window.CW_COPY) {
        ev.preventDefault();
        var yankTarget = window.CW_CTX.resolveTarget(
          { target: document.activeElement || $("[data-mount]") || document.body },
          state,
        );
        // Prefer selected nav/post under cursor when resolve is vague.
        if ((!yankTarget || yankTarget.kind === "blade" || yankTarget.kind === "prompt") &&
            !homeOwnsKeyboard()) {
          var listY = entries();
          var eY = listY[state.cursor];
          if (eY && eY.post) {
            yankTarget = {
              kind: "post",
              id: eY.post.id,
              name: eY.post.who || eY.post.id,
              path: state.path,
              controlKey: "post:" + eY.post.id,
            };
          } else if (eY) {
            yankTarget = {
              kind: (eY.kind === "dir" || eY.kind === "channel") ? "channel" : "nav-item",
              id: MAP.resolve(state.path, eY.name),
              name: eY.name,
              path: MAP.resolve(state.path, eY.name),
              controlKey: "nav-item:" + MAP.resolve(state.path, eY.name),
              elementKey: eY.name,
            };
          } else if (state.threadFocus || state.feedMark) {
            var yid = state.threadFocus || state.feedMark;
            yankTarget = {
              kind: "post",
              id: yid,
              name: yid,
              path: state.path,
              controlKey: "post:" + yid,
            };
          }
        }
        if (state.sessionOutFocus && (!yankTarget || yankTarget.kind === "blade")) {
          yankTarget = {
            kind: "chat", id: "session-chat", name: "session chat",
            path: state.path, controlKey: "chat:session",
          };
        }
        return copyTargetContent(yankTarget);
      }
      if (ev.altKey && k.toLowerCase() === "j") {
        ev.preventDefault();
        return status("already full width");
      }
      if (ev.altKey && k.toLowerCase() === "m") {
        ev.preventDefault();
        return status("already full width");
      }
      if (ev.altKey && k.toLowerCase() === "d") {
        ev.preventDefault();
        return status("no dock to cycle");
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
        if (k === "d") {
          ev.preventDefault();
          return dismissCurrent();
        }
        if (k === "m") {
          ev.preventDefault();
          return markReadHomeCursor();
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

      // Unified dismiss — Activity / notification leaves (home handled above).
      // Only steal `d` on attention surfaces so nav filter can still type `d`.
      if (k === "d" && state.columnFocus && !state.filter && dismissOwnsKey()) {
        ev.preventDefault();
        return dismissCurrent();
      }

      if (k === "ArrowDown" || k === "j") { ev.preventDefault(); focusColumns(); return moveCursor(1); }
      if (k === "ArrowUp" || k === "k") { ev.preventDefault(); focusColumns(); return moveCursor(-1); }
      // → / l : slide into selected dir, open post thread, or edit a file
      if (k === "ArrowRight" || k === "l") { ev.preventDefault(); focusColumns(); return goRight(); }
      if (k === "Enter") { ev.preventDefault(); focusColumns(); return activateSelection(); }
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

  /** Show a recoverable [fetch AI] control when the on-device model needs a gesture. */
  function paintModelFetch(show) {
    var el = $("[data-model-fetch]");
    if (!el) return;
    el.hidden = !show;
  }

  /** Plain-language on-device AI status — never dump Chromium availability jargon. */
  function humanModelStatus(err) {
    var s = String(err || "");
    if (/user gesture|downloadable|downloading/i.test(s)) {
      paintModelFetch(true);
      return "on-device AI needs a download — press [fetch AI] or any key · Alt+A for CLI";
    }
    if (/too large|quota|context/i.test(s)) {
      paintModelFetch(false);
      return "prompt too large for on-device AI — shorten it · Alt+A for CLI";
    }
    if (/network|offline|fetch/i.test(s)) {
      paintModelFetch(true);
      return "could not reach the on-device model — retry [fetch AI] · Alt+A toggles";
    }
    paintModelFetch(false);
    return "on-device AI unavailable — CLI mode · Alt+A to switch";
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
    if (!window.CW_AGENT || !window.CW_AGENT.warm) return;
    var avail = await window.NBResilient.availability();

    if (avail === "absent" || avail === "unavailable") {
      state.ai = false;
      render(true);
      return status("no on-device model here — cli mode, Alt+A to switch");
    }

    if (avail === "available") {
      status("loading the on-device model…");
      await window.CW_AGENT.warm(function (m) { if (!state.busy) status(m); });
      var st = window.NBResilient.modelState();
      if (st.state !== "ready") { state.ai = false; render(true); }
      return status(st.state === "ready"
        ? "model ready — ai mode. Alt+A for cli."
        : humanModelStatus(st.error));
    }

    // Needs downloading — [fetch AI] is the status surface; do not occupy the
    // status line with a permanent nag that competes with compose truth.
    paintModelFetch(true);
    status("");
    var armed = false;
    var start = async function () {
      if (armed) return;
      armed = true;
      paintModelFetch(false);
      window.removeEventListener("keydown", start, true);
      window.removeEventListener("pointerdown", start, true);
      status("fetching the on-device model, once…");
      await window.CW_AGENT.warm(function (m) { if (!state.busy) status(m); });
      var st2 = window.NBResilient.modelState();
      if (st2.state !== "ready") { state.ai = false; render(true); }
      status(st2.state === "ready"
        ? "model ready — ai mode. Alt+A for cli."
        : humanModelStatus(st2.error));
    };
    window.__cwModelFetchStart = start;
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
    if (!el || !window.CW_ASCII || !window.CW_ASCII.brandHtml) return;
    if (brandBootTimer) {
      clearTimeout(brandBootTimer);
      brandBootTimer = null;
    }
    var reduce = false;
    try {
      reduce = !!(window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches);
    } catch { /* private / old */ }

    if (reduce) {
      el.innerHTML = window.CW_ASCII.brandHtml({ phase: "idle" });
      if (host) {
        host.dataset.phase = "idle";
        host.dataset.boot = "false";
      }
      return;
    }

    // Boot: column ignite, then settle into idle wave.
    el.innerHTML = window.CW_ASCII.brandHtml({ phase: "boot" });
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
      el.innerHTML = window.CW_ASCII.brandHtml({ phase: "idle" });
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
    // Theme is Grid only — no chrome dropdown. theme_use / legacy /theme resolve CW_THEMES.
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
    if (window.CW_GRIDROAD && typeof window.CW_GRIDROAD.start === "function") {
      window.CW_GRIDROAD.start();
    }
    paintIdentity();
    paintActivityBell();
    wireInteractionLayers();
    wireGlobal();
    wireSpeech();
    wireVoice();
    wireAttach();
    wireMount();
    wireBrowserHistory();
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
        : (window.CW_SESSION ? window.CW_SESSION.authNote(identity) : profileLabel());
    if (speechSupported()) {
      bootNote = (bootNote ? bootNote + " · " : "") +
        "speech on — hold ` PTT · Alt+V listen · Alt+Shift+V voice mode";
    }
    var actN = unreadActivityCount();
    if (actN > 0) {
      bootNote = (bootNote ? bootNote + " · " : "") + actN + " activity";
    }
    if (browserNotifySupported()) {
      bootNote = (bootNote ? bootNote + " · " : "") + window.CW_NOTIFY.permissionLabel();
    }
    var recovery = activeRecovery();
    status(recovery ? recovery.message : (navigationRestoreNotice || bootNote));
    // First visit: open keys after the boot status so the onboard cue wins.
    maybeOpenKeysOnboard();
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
      var files = window.CW_ATTACH
        ? window.CW_ATTACH.filesFromDataTransfer(ev.dataTransfer)
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
      var files = window.CW_ATTACH
        ? window.CW_ATTACH.filesFromDataTransfer(cd)
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
    if (!window.CW_SPEECH) return;

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
      if (window.CW_SPEECH.isIntentModeKey && window.CW_SPEECH.isIntentModeKey(ev)) {
        ev.preventDefault();
        ev.stopPropagation();
        return cycleSpeechIntent();
      }
      if (window.CW_SPEECH.isToggleKey(ev)) {
        ev.preventDefault();
        ev.stopPropagation();
        return toggleDictation();
      }
      if (window.CW_SPEECH.isPttKey(ev)) {
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
      if (!window.CW_SPEECH.isPttKey(ev)) return;
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
    if (!window.CW_VOICE) return;

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
      if (!window.CW_VOICE.isVoicePttKey(ev)) return;
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
      if (!window.CW_VOICE.isVoicePttKey(ev)) return;
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
  window.CW_APP = {
    render: render, status: status, navigate: navigate, state: state,
    executeAction: executeAction,
    cancelTopLayer: cancelTopLayer,
    navigationLocation: navigationLocation,
    restoreNavigation: restoreNavigation,
    commitNavigation: commitNavigation,
    composeContext: composeContext,
    composeLabel: composeLabel,
    publishCompose: publishCompose,
    createChannel: createChannel,
    renameChannel: renameChannel,
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
    tick: tick,
    currentFeedKey: currentFeedKey,
    feedNoticeOpen: feedNoticeOpen,
    menuShouldOpen: menuShouldOpen,
    setLive: function (on) { state.live = on; },
    run: run,
    runSearch: runSearch,
    viewerContext: viewerContext,
    actionContext: actionContext,
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
    toggleFocusedPanel: toggleFocusedPanel,
    // Detail pane open/close.
    openDetail: openDetail,
    closeDetail: closeDetail,
    isDetailOpen: isDetailOpen,
    openThread: openThread,
    clearThreadFocus: clearThreadFocus,
    setHomeFeed: setHomeFeed,
    goHome: goHome,
    goLanding: goLanding,
    markHomeFeedRead: markHomeFeedRead,
    markHomeFollowRead: markHomeFollowRead,
    dismissHomeFollow: dismissHomeFollow,
    dismissCurrent: dismissCurrent,
    dismissNotificationCursor: dismissNotificationCursor,
    refillHomeFollow: refillHomeFollow,
    toggleAnnCollapsed: toggleAnnCollapsed,
    homeFeedUnreadCounts: homeFeedUnreadCounts,
    activateHomeItem: activateHomeItem,
    previewSelection: previewSelection,
    activateSelection: activateSelection,
    openContextMenu: openContextMenu,
    closeContextMenu: closeContextMenu,
    bindPromptFromTarget: bindPromptFromTarget,
    runContextAction: runContextAction,
    clearBoundContext: clearBoundContext,
    copyTargetContent: copyTargetContent,
    cycleHomeTab: cycleHomeTab,
    moveHomeCursor: moveHomeCursor,
    focusColumns: focusColumns,
    swapFocusContext: swapFocusContext,
    revealSessionChat: revealSessionChat,
    clearSessionOutFocus: clearSessionOutFocus,
    closeSessionBlade: closeSessionBlade,
    setPersonPane: setPersonPane,
    currentDmPeer: currentDmPeer,
    // Terminal file editor.
    openFileInEditor: openFileInEditor,
    focusEditor: focusEditor,
    blurEditor: blurEditor,
    getEditor: function () { return ensureEditorState().active; },
  };

  // Tools are registered once the app exists, because they call into it.
  if (window.CW_TOOLS) {
    window.CW_TOOLS.install(window.CW_APP);
    if (window.CW_POWER) window.CW_POWER.install(window.CW_APP);
    var registered = window.CW_MCP.list().length;
    var native = window.CW_MCP.isNative();
    // Recorded rather than announced: the count matters when a tool goes
    // missing, and the native/shim distinction matters when debugging why a
    // browser agent cannot see them.
    window.CW_APP.toolCount = registered;
    window.CW_APP.toolHost = native ? "document.modelContext" : "in-page registry";
    // No Epoch terminal banner — the masthead carries brand. Tools register
    // silently; counts are available on CW_APP for debugging.
    state.lines = (state.sessions[0].lines || []).slice();
    // Drop any restored cold-start banners from older sessions.
    state.lines = state.lines.filter(function (ln) { return ln.kind !== "banner"; });
    state.sessions[0].lines = state.lines.slice();
    render();
  }
})();
