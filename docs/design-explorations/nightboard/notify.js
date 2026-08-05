/**
 * Browser Notification API bridge for Nightboard Activity.
 *
 * When the browser exposes `window.Notification`, Activity items (mentions of
 * you, subscription matches, DMs) can surface as OS/browser notifications.
 * Permission is requested only from a user gesture. Denied / unsupported /
 * private-mode failures fail soft — the in-page Activity feed still works.
 *
 *   permission: "unsupported" | "default" | "granted" | "denied"
 *   deliver(item) → shows one notification when allowed
 *   requestPermission() → promise of permission string
 */
(function () {
  "use strict";

  var KEY_PUSHED = "nb-notif-pushed";
  var TAG_PREFIX = "nb-activity-";

  function isSupported() {
    return typeof window !== "undefined" && typeof window.Notification === "function";
  }

  function permission() {
    if (!isSupported()) return "unsupported";
    try {
      return window.Notification.permission || "default";
    } catch {
      return "unsupported";
    }
  }

  function loadPushed() {
    try {
      var raw = window.localStorage.getItem(KEY_PUSHED);
      if (!raw) return {};
      var got = JSON.parse(raw);
      return got && typeof got === "object" ? got : {};
    } catch {
      return {};
    }
  }

  function savePushed(map) {
    try { window.localStorage.setItem(KEY_PUSHED, JSON.stringify(map || {})); } catch { /* private */ }
  }

  function wasPushed(id) {
    if (!id) return false;
    return !!loadPushed()[id];
  }

  function markPushed(id) {
    if (!id) return;
    var map = loadPushed();
    map[id] = Date.now();
    savePushed(map);
  }

  function clearPushed(id) {
    if (!id) return;
    var map = loadPushed();
    delete map[id];
    savePushed(map);
  }

  /**
   * Build title/body/options for an Activity item.
   * @param {object} item  notification fixture shape
   */
  function optionsFor(item) {
    item = item || {};
    var kind = item.kind || "activity";
    var title =
      kind === "mention" ? (item.who || "someone") + " mentioned you"
      : kind === "dm" ? "DM from " + (item.who || "someone")
      : kind === "reply" ? (item.who || "someone") + " replied"
      : kind === "subscription" ? (item.who || "activity") + " · " + (item.reason || "update")
      : kind === "hook" ? (item.subject || item.reason || "Hook") +
          (item.who && item.who !== "system" ? " · " + item.who : "")
      : (item.subject || "Nightboard activity");
    var body = item.body || item.subject || item.reason || "";
    if (item.whereLabel) body = (item.whereLabel + " — " + body).slice(0, 180);
    else body = String(body).slice(0, 180);
    return {
      title: title,
      body: body,
      tag: TAG_PREFIX + (item.id || String(Date.now())),
      // renotify only if the same tag is reused with new content
      renotify: false,
      silent: false,
      data: {
        id: item.id || null,
        where: item.where || "/notifications/all",
        whereLabel: item.whereLabel || "",
        kind: kind,
      },
    };
  }

  /**
   * Show one browser notification. Returns the Notification instance or null.
   * Does not request permission — caller must ensure granted.
   */
  function deliver(item, handlers) {
    handlers = handlers || {};
    if (!isSupported()) return null;
    if (permission() !== "granted") return null;
    if (!item || !item.id) return null;
    if (wasPushed(item.id) && !handlers.force) return null;

    var opts = optionsFor(item);
    var n = null;
    try {
      n = new window.Notification(opts.title, {
        body: opts.body,
        tag: opts.tag,
        renotify: opts.renotify,
        silent: opts.silent,
        data: opts.data,
        // icon optional — exploration has no favicon requirement
      });
    } catch {
      return null;
    }

    markPushed(item.id);

    n.onclick = function (ev) {
      try { if (ev && ev.preventDefault) ev.preventDefault(); } catch { /* fine */ }
      try { window.focus(); } catch { /* fine */ }
      try { n.close(); } catch { /* fine */ }
      if (handlers.onClick) handlers.onClick(opts.data, item);
    };
    n.onclose = function () {
      if (handlers.onClose) handlers.onClose(opts.data, item);
    };
    n.onerror = function () {
      if (handlers.onError) handlers.onError(opts.data, item);
    };
    // Auto-close after a minute so the tray does not fill forever.
    var later = (typeof window !== "undefined" && window.setTimeout) ||
      (typeof setTimeout !== "undefined" ? setTimeout : null);
    if (later) {
      var timer = later(function () {
        try { n.close(); } catch { /* fine */ }
      }, 60 * 1000);
      // Node test runners: do not keep the process alive for the auto-close.
      if (timer && typeof timer.unref === "function") timer.unref();
    }
    return n;
  }

  /**
   * Deliver every unread item that has not yet been pushed.
   * @param {object[]} items
   * @param {object} handlers
   * @returns {number} how many were shown
   */
  function deliverUnread(items, handlers) {
    if (permission() !== "granted") return 0;
    var shown = 0;
    (items || []).forEach(function (item) {
      if (!item || !item.unread) return;
      if (wasPushed(item.id)) return;
      if (deliver(item, handlers)) shown += 1;
    });
    return shown;
  }

  /**
   * Request permission. Must be called from a user gesture.
   * Returns a Promise resolving to the permission string.
   */
  function requestPermission() {
    if (!isSupported()) {
      return Promise.resolve("unsupported");
    }
    var current = permission();
    if (current === "granted" || current === "denied") {
      return Promise.resolve(current);
    }
    try {
      var result = window.Notification.requestPermission();
      // Older browsers pass a callback instead of returning a Promise.
      if (result && typeof result.then === "function") return result;
      return new Promise(function (resolve) {
        window.Notification.requestPermission(function (p) { resolve(p || permission()); });
      });
    } catch {
      return Promise.resolve(permission());
    }
  }

  function permissionLabel(p) {
    p = p || permission();
    switch (p) {
      case "granted": return "browser alerts on";
      case "denied": return "browser alerts blocked";
      case "default": return "browser alerts off — click to enable";
      case "unsupported": return "browser alerts unavailable";
      default: return "browser alerts";
    }
  }

  window.NB_NOTIFY = {
    isSupported: isSupported,
    permission: permission,
    permissionLabel: permissionLabel,
    requestPermission: requestPermission,
    deliver: deliver,
    deliverUnread: deliverUnread,
    wasPushed: wasPushed,
    markPushed: markPushed,
    clearPushed: clearPushed,
    optionsFor: optionsFor,
    KEY_PUSHED: KEY_PUSHED,
  };
})();
