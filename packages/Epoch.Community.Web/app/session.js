/**
 * Durable page state, guest participation, Spaces, and portable-handle auth.
 *
 * Design goals (client-side):
 *
 *   1. Page state is durable across reloads (workspaces, path, furniture,
 *      transcript, folds, votes, tree open, theme). Anonymous sessions are fine.
 *   2. You may participate as a guest when the community allows it.
 *   3. A guest can later claim that anonymous identity (bind a handle to the
 *      same local principal id).
 *   4. Portable-handle auth: enter a handle, mock sign-in, land a durable
 *      session (implementation may mint a DID — not shown in the UI).
 *   5. Profile defaults to **Anonymous** and can join a **Space** — a shared
 *      board with membership, feed, channels, and linked projects. Transport
 *      connection state stays on the identity record as an internal detail.
 *
 * Storage keys are namespaced. Private mode / quota failures fail soft.
 */
(function () {
  "use strict";

  var KEYS = {
    identity: "cw-identity",
    board: "cw-board-state",
    policy: "cw-community-policy",
  };
  var BOARD_SCHEMA_VERSION = 2;

  /** Community policy: guest participation is a community choice. */
  var DEFAULT_POLICY = {
    guestsAllowed: true,
    name: "EPOCH CIVIC WORKSHOP",
    defaultSpaceId: "civic-workshop",
  };

  /** Fallback spaces when CW_DATA.spaces is absent. */
  var DEFAULT_SPACES = [
    {
      id: "civic-workshop", name: "EPOCH CIVIC WORKSHOP", short: "CIVIC",
      slug: "r/civic-workshop", kind: "community",
      guestsAllowed: true, home: true, description: "Main civic board",
      subscribers: 0, rules: [], channels: [], projects: [],
      relay: { url: "wss://relay.local/civic", protocol: "nostr", status: "connected", read: true, write: true },
    },
    {
      id: "agent-lab", name: "Agent Lab", short: "AGNT",
      slug: "r/agent-lab", kind: "team",
      guestsAllowed: true, home: false, description: "Agent runs and supervision",
      subscribers: 0, rules: [], channels: [], projects: [],
      relay: { url: "wss://relay.local/agents", protocol: "nostr", status: "connected", read: true, write: true },
    },
    {
      id: "tuner-crew", name: "Tuner Crew", short: "TUNR",
      slug: "r/tuner-crew", kind: "team",
      guestsAllowed: false, home: false, description: "Members only",
      subscribers: 0, rules: [], channels: [], projects: [],
      relay: { url: "wss://relay.local/tuner", protocol: "nostr", status: "idle", read: true, write: false },
    },
  ];

  /**
   * Auth states:
   *   guest          — authorized anonymous principal, community allows guests
   *   claimed        — guest principal claimed to a local handle
   *   atproto        — signed in with a portable handle
   *   denied         — community disallows guests and no session
   */
  function storage() {
    try { return window.localStorage; } catch { return null; }
  }

  function loadPolicy() {
    try {
      var ls = storage();
      var raw = ls && ls.getItem(KEYS.policy);
      if (!raw) return Object.assign({}, DEFAULT_POLICY);
      var got = JSON.parse(raw);
      return {
        guestsAllowed: got.guestsAllowed !== false,
        name: got.name || DEFAULT_POLICY.name,
        defaultSpaceId: got.defaultSpaceId || DEFAULT_POLICY.defaultSpaceId,
      };
    } catch {
      return Object.assign({}, DEFAULT_POLICY);
    }
  }

  function savePolicy(policy) {
    try {
      var ls = storage();
      if (ls) ls.setItem(KEYS.policy, JSON.stringify(policy));
    } catch { /* private */ }
  }

  function normalizeSpace(s) {
    s = s || {};
    var relay = s.relay || {};
    return {
      id: s.id,
      name: s.name || s.id,
      short: s.short || String(s.name || s.id).slice(0, 4).toUpperCase(),
      slug: s.slug || ("r/" + s.id),
      kind: s.kind || "community",
      guestsAllowed: s.guestsAllowed !== false,
      home: !!s.home,
      description: s.description || "",
      subscribers: globalThis.CW_VALUE.isNumber(s.subscribers) ? s.subscribers : 0,
      rules: Array.isArray(s.rules) ? s.rules.slice() : [],
      channels: Array.isArray(s.channels) ? s.channels.slice() : [],
      projects: Array.isArray(s.projects) ? s.projects.slice() : [],
      relay: {
        url: relay.url || ("wss://relay.local/" + (s.id || "space")),
        protocol: relay.protocol || "nostr",
        status: relay.status || "idle",
        read: relay.read !== false,
        write: !!relay.write,
        note: relay.note || "",
      },
    };
  }

  function listSpaces() {
    var fromData = window.CW_DATA && window.CW_DATA.spaces;
    if (Array.isArray(fromData) && fromData.length) {
      return fromData.map(normalizeSpace);
    }
    return DEFAULT_SPACES.map(normalizeSpace);
  }

  function findSpace(idOrName) {
    var key = String(idOrName || "").toLowerCase().replace(/^r\//, "");
    if (!key) return null;
    var spaces = listSpaces();
    for (var i = 0; i < spaces.length; i++) {
      var s = spaces[i];
      if (s.id === key || s.id.toLowerCase() === key) return s;
      if (String(s.name).toLowerCase() === key) return s;
      if (String(s.short).toLowerCase() === key) return s;
      if (String(s.slug).toLowerCase() === key || String(s.slug).toLowerCase() === "r/" + key) return s;
    }
    return null;
  }

  function homeSpace() {
    var spaces = listSpaces();
    for (var i = 0; i < spaces.length; i++) if (spaces[i].home) return spaces[i];
    return spaces[0] || normalizeSpace(DEFAULT_SPACES[0]);
  }

  /**
   * Mock relay connection state for the joined space.
   * Members-only spaces only get write once signed in (not anonymous).
   */
  function relayForIdentity(space, identity) {
    space = space || homeSpace();
    var relay = Object.assign({}, space.relay || {});
    var signedIn = identity && (identity.kind === "claimed" || identity.kind === "atproto");
    if (space.guestsAllowed === false && !signedIn) {
      relay.status = "idle";
      relay.write = false;
    } else if (signedIn || space.guestsAllowed) {
      relay.status = relay.status === "offline" ? "offline" : "connected";
      if (signedIn) relay.write = true;
    }
    return relay;
  }

  function attachSpace(id, space) {
    space = space || homeSpace();
    id.spaceId = space.id;
    id.spaceName = space.name;
    id.spaceShort = space.short;
    id.spaceSlug = space.slug;
    id.spaceKind = space.kind;
    id.relay = relayForIdentity(space, id);
    return id;
  }

  function newGuestId() {
    var bytes = new Uint8Array(8);
    if (!globalThis.CW_VALUE.isUndefined(crypto) && crypto.getRandomValues) crypto.getRandomValues(bytes);
    else for (var i = 0; i < 8; i++) bytes[i] = Math.floor(Math.random() * 256);
    var hex = Array.prototype.map.call(bytes, function (b) {
      return ("0" + b.toString(16)).slice(-2);
    }).join("");
    return "guest_" + hex;
  }

  function loadIdentity(policy) {
    try {
      var ls = storage();
      var raw = ls && ls.getItem(KEYS.identity);
      if (raw) {
        var got = JSON.parse(raw);
        if (got && got.principalId) {
          // If community no longer allows guests and this is still a guest, keep
          // the principal but mark participation as read-only denied for writes.
          return normalizeIdentity(got, policy);
        }
      }
    } catch { /* private */ }
    return mintIdentity(policy);
  }

  function mintIdentity(policy) {
    var home = homeSpace();
    // Community-wide guest ban or a members-only home space → denied until sign-in.
    if (!policy.guestsAllowed || home.guestsAllowed === false) {
      return attachSpace({
        principalId: null,
        kind: "denied",
        handle: null,
        did: null,
        displayName: "Anonymous",
        canParticipate: false,
        claimable: false,
        atproto: null,
        anonymous: true,
        createdAt: Date.now(),
      }, home);
    }
    var id = attachSpace({
      principalId: newGuestId(),
      kind: "guest",
      handle: null,
      did: null,
      displayName: "Anonymous",
      canParticipate: true,
      claimable: true,
      atproto: null,
      anonymous: true,
      createdAt: Date.now(),
    }, home);
    saveIdentity(id);
    return id;
  }

  function resolveSpaceFor(got) {
    if (got && got.spaceId) {
      var s = findSpace(got.spaceId);
      if (s) return s;
    }
    return homeSpace();
  }

  function normalizeIdentity(got, policy) {
    var kind = got.kind || "guest";
    var space = resolveSpaceFor(got);
    if (kind === "atproto" && got.atproto && got.atproto.did) {
      return attachSpace({
        principalId: got.principalId || newGuestId(),
        kind: "atproto",
        handle: got.handle || got.atproto.handle,
        did: got.did || got.atproto.did,
        displayName: got.displayName || ("@" + String(got.handle || "user").replace(/^@/, "")),
        canParticipate: true,
        claimable: false,
        atproto: got.atproto,
        anonymous: false,
        createdAt: got.createdAt || Date.now(),
        claimedAt: got.claimedAt || null,
        linkedAt: got.linkedAt || null,
      }, space);
    }
    if (kind === "claimed" && got.handle) {
      return attachSpace({
        principalId: got.principalId || newGuestId(),
        kind: "claimed",
        handle: String(got.handle).replace(/^@/, ""),
        did: got.did || null,
        displayName: got.displayName || ("@" + String(got.handle).replace(/^@/, "")),
        canParticipate: true,
        claimable: false,
        atproto: null,
        anonymous: false,
        createdAt: got.createdAt || Date.now(),
        claimedAt: got.claimedAt || null,
      }, space);
    }
    // Guest / anonymous path — space may still refuse guests.
    if (!policy.guestsAllowed || space.guestsAllowed === false) {
      return attachSpace({
        principalId: got.principalId || null,
        kind: "denied",
        handle: null,
        did: null,
        displayName: "Anonymous",
        canParticipate: false,
        claimable: false,
        atproto: null,
        anonymous: true,
        createdAt: got.createdAt || Date.now(),
      }, space);
    }
    return attachSpace({
      principalId: got.principalId || newGuestId(),
      kind: "guest",
      handle: null,
      did: null,
      displayName: "Anonymous",
      canParticipate: true,
      claimable: true,
      atproto: null,
      anonymous: true,
      createdAt: got.createdAt || Date.now(),
    }, space);
  }

  function saveIdentity(id) {
    try {
      var ls = storage();
      if (ls) ls.setItem(KEYS.identity, JSON.stringify(id));
    } catch { /* private */ }
  }

  function authNote(id) {
    var spaceBit = id.spaceShort || id.spaceName || "";
    switch (id.kind) {
      case "atproto": return (spaceBit ? spaceBit + " · " : "") + "signed in";
      case "claimed": return (spaceBit ? spaceBit + " · " : "") + "signed in";
      case "guest": return (spaceBit ? spaceBit + " · " : "") + "anonymous";
      case "denied": return "signed out";
      default: return "session";
    }
  }

  function authDetail(id) {
    var space = id.spaceName ? (" in " + id.spaceName) : "";
    switch (id.kind) {
      case "atproto":
        return "Signed in to space" + space + " as @" +
          String(id.handle || "").replace(/^@/, "");
      case "claimed":
        return "Signed in to space" + space + " as @" + String(id.handle || "").replace(/^@/, "") +
          " — anonymous principal claimed";
      case "guest":
        return "Anonymous in space" + space + " (" + (id.principalId || "anon") +
          "). Sign in to a space or claim a handle.";
      case "denied":
        return "Not signed in" + space + ". This space requires sign-in.";
      default:
        return "Session";
    }
  }

  /** Initials for the profile avatar (Slack-style). */
  function profileInitials(id) {
    if (!id || id.kind === "guest" || id.kind === "denied" || id.anonymous) return "AN";
    var h = String(id.handle || id.displayName || "?").replace(/^@/, "");
    if (h.length >= 2) return h.slice(0, 2).toUpperCase();
    return (h.charAt(0) || "?").toUpperCase() + "·";
  }

  function profileLabel(id) {
    if (!id || id.kind === "guest" || id.kind === "denied" || id.anonymous) return "Anonymous";
    return id.displayName || ("@" + (id.handle || "member"));
  }

  /**
   * Normalize a handle for local claim. AT sign-in uses the OAuth token handle
   * and never invents `.bsky.social` or a DID.
   */
  function resolveHandle(handle) {
    var h = String(handle || "").trim().replace(/^@/, "").toLowerCase();
    if (!h) throw new Error("handle required");
    if (!/^[a-z0-9][a-z0-9._-]{1,61}$/.test(h)) throw new Error("invalid handle");
    return { handle: h };
  }

  function authorizeAtproto(handle, principalId, spaceId, oauth) {
    if (!oauth || oauth.source !== "par-pkce-dpop" || !oauth.did || !oauth.accessToken) {
      throw new Error("AT OAuth is not linked — PAR/PKCE/DPoP required");
    }
    if (window.CW_RUNTIME && globalThis.CW_VALUE.isFunction(window.CW_RUNTIME.isHandleHashStub) &&
        window.CW_RUNTIME.isHandleHashStub(oauth.did, oauth.handle || handle)) {
      throw new Error("AT OAuth refused stub DID mint");
    }
    var space = findSpace(spaceId) || homeSpace();
    var handleFromToken = String(oauth.handle || "").replace(/^@/, "");
    if (!handleFromToken) throw new Error("AT OAuth token did not include a handle");
    return attachSpace({
      principalId: principalId || newGuestId(),
      kind: "atproto",
      handle: handleFromToken,
      did: oauth.did,
      displayName: "@" + handleFromToken,
      canParticipate: true,
      claimable: false,
      anonymous: false,
      atproto: {
        handle: handleFromToken,
        did: oauth.did,
        pdsEndpoint: oauth.pdsEndpoint || "",
        token: {
          accessToken: oauth.accessToken,
          tokenType: "DPoP",
          scope: "atproto transition:generic",
          pdsEndpoint: oauth.pdsEndpoint || "",
        },
        linkedAt: Date.now(),
      },
      createdAt: Date.now(),
      linkedAt: Date.now(),
    }, space);
  }

  /**
   * Claim the current anonymous principal as a local handle.
   * Preserves principalId so prior guest activity stays attributable.
   */
  function claimIdentity(current, handle, spaceId) {
    if (!current || !current.principalId) throw new Error("no principal to claim");
    if (current.kind === "atproto") throw new Error("already linked to ATProto — claim not needed");
    var h = String(handle || "").trim().replace(/^@/, "").toLowerCase();
    if (!/^[a-z0-9][a-z0-9._-]{1,30}$/.test(h)) throw new Error("handle: 2–31 chars, a-z 0-9 . _ -");
    var space = findSpace(spaceId) || resolveSpaceFor(current) || homeSpace();
    return attachSpace({
      principalId: current.principalId,
      kind: "claimed",
      handle: h,
      did: null,
      displayName: "@" + h,
      canParticipate: true,
      claimable: false,
      anonymous: false,
      atproto: null,
      createdAt: current.createdAt || Date.now(),
      claimedAt: Date.now(),
    }, space);
  }

  /**
   * Sign in to a Slack-style space.
   * - guestsAllowed spaces accept anonymous guests (switch space only)
   * - otherwise requires a handle (claim) or ATProto path (caller chooses)
   */
  function joinSpace(current, spaceId, opts) {
    opts = opts || {};
    var space = findSpace(spaceId);
    if (!space) throw new Error("unknown space");
    var next = Object.assign({}, current || {});
    if (space.guestsAllowed === false &&
        (next.kind === "guest" || next.kind === "denied" || !next.handle)) {
      if (!opts.handle && !opts.atprotoHandle) {
        throw new Error(space.name + " requires sign-in — claim a handle or sign in");
      }
    }
    if (opts.atprotoHandle) {
      return authorizeAtproto(opts.atprotoHandle, next.principalId, space.id, opts.oauth);
    }
    if (opts.handle) {
      if (next.kind === "atproto") {
        // Keep AT session, move spaces.
        return attachSpace(Object.assign({}, next, { anonymous: false }), space);
      }
      return claimIdentity(
        next.principalId ? next : Object.assign({}, next, { principalId: newGuestId() }),
        opts.handle,
        space.id
      );
    }
    // Anonymous switch into a guest-friendly space.
    if (space.guestsAllowed === false) {
      throw new Error(space.name + " does not allow anonymous guests");
    }
    return attachSpace({
      principalId: next.principalId || newGuestId(),
      kind: "guest",
      handle: null,
      did: null,
      displayName: "Anonymous",
      canParticipate: true,
      claimable: true,
      anonymous: true,
      atproto: null,
      createdAt: next.createdAt || Date.now(),
    }, space);
  }

  function signOut(policy) {
    // Drop AT/claimed link; return to anonymous in the home space.
    try {
      var ls = storage();
      if (ls) ls.removeItem(KEYS.identity);
    } catch { /* private */ }
    return mintIdentity(policy);
  }

  /* ── Durable board state ──────────────────────────────────────────────── */

  function migrateSessionState(session) {
    session = session && globalThis.CW_VALUE.isObject(session) ? Object.assign({}, session) : {};
    var alias = globalThis.CW_VALUE.isString(session.path) ? session.path : "/projects/community/channels/general";
    var focused = session.focusedObjectId || session.threadFocus || session.feedMark || null;
    session.path = alias;
    session.navigation = Object.assign({
      legacyLocationAlias: alias,
      focusRegion: session.editorFocused ? "detail" : "navigator",
      focusedObjectId: focused,
      selectedObjectId: session.selectedObjectId || focused,
      detailObjectId: session.threadFocus || null,
      threadRootId: session.threadFocus || null,
      layers: [],
    }, session.navigation || {});
    return session;
  }

  /** Previous unversioned snapshots become v2 exactly once; aliases resolve after CW_MAP loads. */
  function migrateBoardState(snapshot) {
    if (!snapshot || !globalThis.CW_VALUE.isObject(snapshot) || Array.isArray(snapshot)) {
      return {
        schemaVersion: BOARD_SCHEMA_VERSION,
        recovery: {
          reason: "malformed",
          message: "Saved board state is malformed; export it for recovery or reset it to continue.",
          actions: ["export", "reset"],
        },
        sessions: [],
      };
    }
    var out = JSON.parse(JSON.stringify(snapshot));
    if (out.schemaVersion > BOARD_SCHEMA_VERSION) {
      return Object.assign(out, {
        recovery: {
          reason: "unsupported-version",
          message: "Saved board state is newer than this Community Web; update or export it before reset.",
          actions: ["export", "reset"],
        },
      });
    }
    out.sessions = (Array.isArray(out.sessions) ? out.sessions : [out]).map(migrateSessionState);
    if (!out.navigation) out.navigation = migrateSessionState(out).navigation;
    out.schemaVersion = BOARD_SCHEMA_VERSION;
    return out;
  }

  function loadBoardState() {
    try {
      var ls = storage();
      var raw = ls && ls.getItem(KEYS.board);
      if (!raw) return null;
      var parsed = JSON.parse(raw);
      var migrated = migrateBoardState(parsed);
      if (!migrated.recovery && JSON.stringify(migrated) !== raw && ls) {
        ls.setItem(KEYS.board, JSON.stringify(migrated));
      }
      return migrated;
    } catch {
      return migrateBoardState(null);
    }
  }

  function saveBoardState(snapshot) {
    try {
      var ls = storage();
      if (ls) ls.setItem(KEYS.board, JSON.stringify(migrateBoardState(snapshot)));
    } catch { /* private / quota */ }
  }

  function clearBoardState() {
    try {
      var ls = storage();
      if (ls) ls.removeItem(KEYS.board);
    } catch { /* private */ }
  }

  function exportBoardState() {
    try {
      var ls = storage();
      return ls ? ls.getItem(KEYS.board) : null;
    } catch { return null; }
  }

  /* ── One restart lane for local startup conditions ───────────────────── */

  var STARTUP_SIGNALS_KEY = "cw-startup-signals-v1";
  var STARTUP_APPLIED_KEY = "cw-startup-applied-v1";

  function readJson(key) {
    try {
      var ls = storage();
      return JSON.parse((ls && ls.getItem(key)) || "{}");
    } catch { return {}; }
  }

  function pendingStartup() {
    var signals = readJson(STARTUP_SIGNALS_KEY);
    var applied = readJson(STARTUP_APPLIED_KEY);
    var out = [];
    var update = signals.update;
    if (update && globalThis.CW_VALUE.isString(update.available) && update.available &&
        update.available !== update.current && applied.update !== update.available) {
      out.push({ kind: "update", label: "update " + update.available, value: update.available });
    }
    var workspace = signals.workspace;
    if (workspace && globalThis.CW_VALUE.isString(workspace.id) && workspace.id &&
        Number.isInteger(workspace.defaultsVersion) && Number.isInteger(workspace.appliedVersion) &&
        workspace.defaultsVersion > workspace.appliedVersion &&
        applied.workspace !== workspace.defaultsVersion) {
      out.push({
        kind: "workspace", label: "prime " + workspace.id + " defaults",
        value: workspace.defaultsVersion,
      });
    }
    var continuation = signals.continuation;
    if (continuation && /^(?:claude|codex|grok)$/i.test(String(continuation.host || "")) &&
        globalThis.CW_VALUE.isString(continuation.sessionId) && continuation.sessionId &&
        globalThis.CW_VALUE.isString(continuation.workspace) && continuation.workspace &&
        applied.continuation !== continuation.sessionId) {
      out.push({
        kind: "continuation", label: "resume " + continuation.host + " session",
        value: continuation.sessionId,
      });
    }
    return out;
  }

  function applyStartup(opts) {
    opts = opts || {};
    var pending = pendingStartup();
    if (!pending.length) return false;
    var applied = readJson(STARTUP_APPLIED_KEY);
    pending.forEach(function (item) { applied[item.kind] = item.value; });
    try {
      var ls = storage();
      if (ls) {
        ls.setItem(STARTUP_APPLIED_KEY, JSON.stringify(applied));
        ls.removeItem(STARTUP_SIGNALS_KEY);
      }
    } catch { return false; }
    if (!opts.noReload) window.location.reload();
    return true;
  }

  function startupLabel() {
    var items = pendingStartup();
    return items.length ? items.map(function (item) { return item.label; }).join(" · ") : "";
  }

  window.CW_STARTUP = {
    pending: pendingStartup,
    apply: applyStartup,
    label: startupLabel,
    SIGNALS_KEY: STARTUP_SIGNALS_KEY,
    APPLIED_KEY: STARTUP_APPLIED_KEY,
  };

  window.CW_SESSION = {
    KEYS: KEYS,
    loadPolicy: loadPolicy,
    savePolicy: savePolicy,
    loadIdentity: loadIdentity,
    saveIdentity: saveIdentity,
    mintIdentity: mintIdentity,
    authNote: authNote,
    authDetail: authDetail,
    profileInitials: profileInitials,
    profileLabel: profileLabel,
    listSpaces: listSpaces,
    findSpace: findSpace,
    homeSpace: homeSpace,
    joinSpace: joinSpace,
    resolveHandle: resolveHandle,
    authorizeAtproto: authorizeAtproto,
    claimIdentity: claimIdentity,
    signOut: signOut,
    loadBoardState: loadBoardState,
    saveBoardState: saveBoardState,
    clearBoardState: clearBoardState,
    exportBoardState: exportBoardState,
    migrateBoardState: migrateBoardState,
    BOARD_SCHEMA_VERSION: BOARD_SCHEMA_VERSION,
    DEFAULT_POLICY: DEFAULT_POLICY,
    DEFAULT_SPACES: DEFAULT_SPACES,
  };
})();
