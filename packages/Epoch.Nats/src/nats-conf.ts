/**
 * Documented nats-server template (JetStream + WebSocket + auth callout).
 *
 * Host `nats-server` auth_callout expects a JWT-issuing auth service
 * (issuer nkey, user JWT). `@epoch/nats` ships an Epoch-native JSON
 * in-process handler (`attachAuthCalloutService` on NatsConnectionLike)
 * for tests and embedded buses; the JWT adapter that answers real
 * `$SYS.REQ.USER.AUTH` for nats-server is not done yet — use this
 * template as the broker shape once that adapter exists.
 */
export const NATS_SERVER_CONF_TEMPLATE = `# Epoch NATS fabric (ADR-0054)
# Host process — browsers connect with nats.ws; do not compile nats-server to WASM.
#
# Auth note: nats-server auth_callout needs a JWT-issuing adapter (issuer nkey).
# @epoch/nats attachAuthCalloutService is Epoch-native JSON over in-process
# NatsConnectionLike — not a drop-in JWT auth user for this conf yet.

port: 4222
http_port: 8222

jetstream {
  store_dir: "./.nats-jetstream"
}

websocket {
  port: 9222
  no_tls: true
  # production: tls { cert_file: ...; key_file: ... }
  # allowed_origins: ["https://community.example"]
}

accounts {
  EPOCH: {
    jetstream: enabled
    users: [
      { user: auth, password: "replace-me-auth-svc" }
    ]
  }
}

authorization {
  auth_callout {
    issuer: "AUTH_ISSUER_NKEY"
    # Auth service account/user that may answer $SYS.REQ.USER.AUTH
    auth_users: [ auth ]
    account: EPOCH
    # xkey: "AUTH_XKEY"  # encrypt callout payloads
  }
  timeout: 2s
}

# Streams are created by @epoch/nats bootstrap (EPOCH_LIVE, EPOCH_PLATFORM_EVENTS,
# EPOCH_COMMUNITY_LIVESTREAM) or via nats CLI.
`;
