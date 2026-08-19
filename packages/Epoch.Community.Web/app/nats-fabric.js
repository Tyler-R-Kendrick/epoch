/**
 * Community Web NATS fabric handoff (ADR-0054 complementary auth).
 *
 * Board identity (guest / claimed / atproto) is NOT a Platform session.
 * Fabric CONNECT needs an opaque Platform-minted fabric secret + configured
 * endpoint. Guests never claim broad fabric access; status stays honest.
 * Fabric auth failure never opens session/agent chat by itself.
 */
(function () {
  "use strict";

  var STATUS_IDLE = "idle";
  var STATUS_ONLINE = "online";
  var STATUS_OFFLINE = "offline";
  var STATUS_DENIED = "denied";
  var STATUS_NEEDS_SIGNIN = "needs-sign-in";

  function emptyState() {
    return {
      status: STATUS_IDLE,
      reason: "",
      fabricSecret: null,
      repoId: null,
      endpoint: null,
      opened: false,
    };
  }

  var state = emptyState();

  function readConfig(overrides) {
    overrides = overrides || {};
    var env = (typeof window !== "undefined" && window.CW_FABRIC_CONFIG) || {};
    var endpoint = overrides.endpoint != null ? overrides.endpoint : (env.endpoint || "");
    var repoId = overrides.repoId != null ? overrides.repoId : (env.repoId || "community");
    return {
      endpoint: typeof endpoint === "string" ? endpoint.trim() : "",
      repoId: typeof repoId === "string" ? repoId.trim() : "community",
      mintFabricCredential: overrides.mintFabricCredential || env.mintFabricCredential || null,
      connect: overrides.connect || env.connect || null,
    };
  }

  function isGuestIdentity(identity) {
    if (!identity) return true;
    if (identity.kind === "guest" || identity.kind === "denied") return true;
    if (identity.anonymous) return true;
    if (identity.principalId === "guest_local") return true;
    return identity.kind !== "claimed" && identity.kind !== "atproto";
  }

  function hasPlatformTicketSource(identity) {
    if (!identity || isGuestIdentity(identity)) return false;
    // Explicit Platform session id / API token / pre-minted secret — not board principalId.
    if (typeof identity.fabricSecret === "string" && identity.fabricSecret.trim()) return true;
    if (typeof identity.platformSessionId === "string" && identity.platformSessionId.trim()) return true;
    if (typeof identity.platformApiTokenId === "string" && identity.platformApiTokenId.trim()) return true;
    return false;
  }

  function looksLikeIdentityId(secret, identity) {
    if (!identity || typeof secret !== "string") return false;
    var candidates = [
      identity.principalId,
      identity.platformSessionId,
      identity.platformApiTokenId,
      identity.handle,
      identity.did,
    ];
    for (var i = 0; i < candidates.length; i++) {
      if (candidates[i] && secret === candidates[i]) return true;
    }
    return false;
  }

  /**
   * Decide whether the board may attempt fabric CONNECT.
   * Guests / unsigned identities stay local-only.
   * Mint alone is not enough — a Platform parent or pre-minted secret is required.
   */
  function evaluateHandoff(identity, config) {
    config = readConfig(config);
    if (!config.endpoint) {
      return {
        attach: false,
        status: STATUS_IDLE,
        reason: "fabric endpoint not configured",
        message: "",
      };
    }
    if (isGuestIdentity(identity)) {
      return {
        attach: false,
        status: STATUS_NEEDS_SIGNIN,
        reason: "guest",
        message: "realtime requires sign-in",
      };
    }
    if (!hasPlatformTicketSource(identity)) {
      return {
        attach: false,
        status: STATUS_NEEDS_SIGNIN,
        reason: "no-platform-ticket",
        message: "realtime requires sign-in",
      };
    }
    return {
      attach: true,
      status: STATUS_IDLE,
      reason: "",
      message: "",
    };
  }

  /**
   * Resolve an opaque fabric secret. Never uses board principalId as the secret.
   */
  function resolveFabricSecret(identity, config) {
    config = readConfig(config);
    if (identity && typeof identity.fabricSecret === "string" && identity.fabricSecret.trim()) {
      var presented = identity.fabricSecret.trim();
      if (looksLikeIdentityId(presented, identity)) {
        return Promise.reject(new Error("fabric secret must not equal identity ids"));
      }
      return Promise.resolve(presented);
    }
    if (typeof config.mintFabricCredential !== "function") {
      return Promise.reject(new Error("no fabric mint available"));
    }
    var input = {};
    if (identity && typeof identity.platformSessionId === "string" && identity.platformSessionId.trim()) {
      input.sessionId = identity.platformSessionId.trim();
    } else if (identity && typeof identity.platformApiTokenId === "string" && identity.platformApiTokenId.trim()) {
      input.apiTokenId = identity.platformApiTokenId.trim();
    } else {
      return Promise.reject(new Error("no platform parent for fabric mint"));
    }
    return Promise.resolve()
      .then(function () {
        return config.mintFabricCredential(input);
      })
      .then(function (minted) {
        if (!minted || typeof minted.secret !== "string" || !minted.secret.trim()) {
          throw new Error("fabric mint returned no secret");
        }
        var secret = minted.secret.trim();
        if (looksLikeIdentityId(secret, identity)) {
          throw new Error("fabric secret must not equal identity ids");
        }
        return secret;
      });
  }

  /**
   * Attempt fabric attach when configured + non-guest + Platform ticket path.
   * On failure: honest offline/denied status; does not open chat surfaces.
   * Never returns the fabric secret in the public result object.
   */
  function attach(identity, overrides) {
    var config = readConfig(overrides);
    var decision = evaluateHandoff(identity, config);
    state = emptyState();
    state.endpoint = config.endpoint || null;
    state.repoId = config.repoId || null;

    if (!decision.attach) {
      state.status = decision.status;
      state.reason = decision.reason;
      return Promise.resolve({
        attached: false,
        status: state.status,
        reason: state.reason,
        message: decision.message,
        openChat: false,
      });
    }

    return resolveFabricSecret(identity, config)
      .then(function (secret) {
        state.fabricSecret = secret;
        if (typeof config.connect !== "function") {
          // Configured + ticket available but no injectable connect (browser MVP):
          // mark ready-for-connect without claiming broker online.
          state.status = STATUS_OFFLINE;
          state.reason = "connect-not-wired";
          state.opened = false;
          return {
            attached: false,
            status: state.status,
            reason: state.reason,
            message: "realtime fabric configured — connect pending",
            openChat: false,
          };
        }
        return Promise.resolve()
          .then(function () {
            return config.connect({
              repoId: config.repoId,
              fabricSecret: secret,
              endpoint: config.endpoint,
            });
          })
          .then(function (opened) {
            state.status = STATUS_ONLINE;
            state.reason = "";
            state.opened = true;
            return {
              attached: true,
              status: state.status,
              reason: "",
              message: "",
              openChat: false,
              opened: opened,
            };
          });
      })
      .catch(function (err) {
        state.status = STATUS_DENIED;
        state.reason = err && err.message ? String(err.message) : "fabric connect denied";
        state.opened = false;
        state.fabricSecret = null;
        return {
          attached: false,
          status: state.status,
          reason: state.reason,
          message: "realtime fabric unavailable",
          openChat: false,
        };
      });
  }

  function status() {
    return {
      status: state.status,
      reason: state.reason,
      opened: state.opened,
      endpoint: state.endpoint,
      repoId: state.repoId,
      hasSecret: !!state.fabricSecret,
    };
  }

  function statusLabel() {
    if (state.status === STATUS_NEEDS_SIGNIN) return "realtime requires sign-in";
    if (state.status === STATUS_ONLINE) return "realtime fabric online";
    if (state.status === STATUS_DENIED) return "realtime fabric unavailable";
    if (state.status === STATUS_OFFLINE) return "realtime fabric offline";
    return "";
  }

  function reset() {
    state = emptyState();
  }

  /**
   * EPOCH_COMMUNITY_LIVESTREAM: sanitized channel envelopes only (ADR-0050).
   * Protected secrets and non-public visibility never enter the fan-out.
   */
  function ingestChannelLivestream(envelope) {
    if (!envelope || typeof envelope !== "object") {
      return { kind: "drop", reason: "malformed" };
    }
    if (envelope.protectedInput || envelope.secret) {
      return { kind: "drop", reason: "protected-secret" };
    }
    if (envelope.visibility && envelope.visibility !== "public") {
      return { kind: "drop", reason: "non-public" };
    }
    var subject = typeof envelope.subject === "string" ? envelope.subject : "epoch.community.stream.default";
    if (subject.indexOf("epoch.community.stream.") !== 0) {
      return { kind: "drop", reason: "cross-operator-subject" };
    }
    return {
      kind: "emit",
      envelope: {
        kind: "channel.message",
        channelId: envelope.channelId || "",
        messageId: envelope.messageId || "",
        bodyDigest: envelope.bodyDigest || "",
        visibility: "public",
        subject: subject,
      },
    };
  }

  window.CW_NATS_FABRIC = {
    evaluateHandoff: evaluateHandoff,
    attach: attach,
    status: status,
    statusLabel: statusLabel,
    isGuestIdentity: isGuestIdentity,
    ingestChannelLivestream: ingestChannelLivestream,
    reset: reset,
  };
})();
