/**
 * Durable page state, guest participation, Spaces, and Bluesky ATProto auth.
 *
 * Design goals (nightboard exploration — client-side, no real PDS):
 *
 *   1. Page state is durable across reloads (workspaces, path, furniture,
 *      transcript, folds, votes, tree open, theme). Anonymous sessions are fine.
 *   2. You may participate as a guest when the community allows it.
 *   3. A guest can later claim that anonymous identity (bind a handle to the
 *      same local principal id).
 *   4. Bluesky-style ATProto auth: enter a handle, mock OAuth, land a DID
 *      session with portable identity honesty.
 *   5. Profile defaults to **Anonymous** and can join a **Space** that is all
 *      three at once:
 *        - Block/Buzz **relay** (Nostr-style event endpoint, read/write)
 *        - Slack **workspace** (membership, channels, guests)
 *        - Reddit **subreddit** (topical feed, subscribers, rules)
 *
 * Storage keys are namespaced. Private mode / quota failures fail soft.
 */
(function () {
  "use strict";

  var KEYS = {
    identity: "nb-identity",
    board: "nb-board-state",
    policy: "nb-community-policy",
  };

  /** Community policy: guest participation is a community choice. */
  var DEFAULT_POLICY = {
    guestsAllowed: true,
    name: "EPOCH CIVIC WORKSHOP",
    defaultSpaceId: "civic-workshop",
  };

  /** Fallback spaces when NB_DATA.spaces is absent. */
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
   * Auth states (honest labels, same spirit as Community Web identity chip):
   *   guest          — authorized anonymous principal, community allows guests
   *   claimed        — guest principal claimed to a local handle (not AT-linked)
   *   atproto        — Bluesky-style ATProto OAuth session linked
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
      subscribers: typeof s.subscribers === "number" ? s.subscribers : 0,
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
    var fromData = window.NB_DATA && window.NB_DATA.spaces;
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
    if (typeof crypto !== "undefined" && crypto.getRandomValues) crypto.getRandomValues(bytes);
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
          String(id.handle || "").replace(/^@/, "") + " (" + (id.did || "did:…") + ")";
      case "claimed":
        return "Signed in to space" + space + " as @" + String(id.handle || "").replace(/^@/, "") +
          " — anonymous principal claimed, not yet AT-linked";
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
   * Bluesky-style ATProto auth (mock).
   * Real product would use OAuth PAR+PKCE+DPoP against a PDS; here we resolve
   * a handle to a did:plc and mint a durable local token set.
   */
  function resolveHandle(handle) {
    var h = String(handle || "").trim().replace(/^@/, "").toLowerCase();
    if (!h) throw new Error("handle required");
    if (!/^[a-z0-9]([a-z0-9-]*[a-z0-9])?(\.[a-z0-9]([a-z0-9-]*[a-z0-9])?)+$/.test(h) &&
        !/^[a-z0-9][a-z0-9._-]{1,30}$/.test(h)) {
      // Allow short demo handles like "maya" by expanding to .bsky.social
      if (/^[a-z0-9][a-z0-9_-]{1,30}$/.test(h)) h = h + ".bsky.social";
      else throw new Error("invalid handle");
    } else if (h.indexOf(".") === -1) {
      h = h + ".bsky.social";
    }
    // Deterministic mock DID from handle (not a real PLC).
    var hash = 0;
    for (var i = 0; i < h.length; i++) hash = ((hash << 5) - hash + h.charCodeAt(i)) | 0;
    var did = "did:plc:" + ("000000000000000000000000" + Math.abs(hash).toString(16)).slice(-24);
    return {
      handle: h,
      did: did,
      pdsEndpoint: "https://bsky.social",
    };
  }

  function authorizeAtproto(handle, principalId, spaceId) {
    var resolved = resolveHandle(handle);
    var space = findSpace(spaceId) || homeSpace();
    var token = {
      accessToken: "nb-at-" + resolved.did.slice(-12) + "-" + Date.now().toString(36),
      scope: "atproto transition:generic",
      // Design exploration: we do not request rotation keys; scope is honest.
      expiresAt: Date.now() + 7 * 24 * 3600 * 1000,
      pdsEndpoint: resolved.pdsEndpoint,
    };
    return attachSpace({
      principalId: principalId || newGuestId(),
      kind: "atproto",
      handle: resolved.handle,
      did: resolved.did,
      displayName: "@" + resolved.handle,
      canParticipate: true,
      claimable: false,
      anonymous: false,
      atproto: {
        handle: resolved.handle,
        did: resolved.did,
        pdsEndpoint: resolved.pdsEndpoint,
        token: token,
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
        throw new Error(space.name + " requires sign-in — claim a handle or use Bluesky");
      }
    }
    if (opts.atprotoHandle) {
      return authorizeAtproto(opts.atprotoHandle, next.principalId, space.id);
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

  function loadBoardState() {
    try {
      var ls = storage();
      var raw = ls && ls.getItem(KEYS.board);
      if (!raw) return null;
      return JSON.parse(raw);
    } catch {
      return null;
    }
  }

  function saveBoardState(snapshot) {
    try {
      var ls = storage();
      if (ls) ls.setItem(KEYS.board, JSON.stringify(snapshot));
    } catch { /* private / quota */ }
  }

  function clearBoardState() {
    try {
      var ls = storage();
      if (ls) ls.removeItem(KEYS.board);
    } catch { /* private */ }
  }

  window.NB_SESSION = {
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
    DEFAULT_POLICY: DEFAULT_POLICY,
    DEFAULT_SPACES: DEFAULT_SPACES,
  };
})();
