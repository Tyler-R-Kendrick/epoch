/**
 * Documented nats-server template (JetStream + WebSocket + auth callout).
 *
 * Host `nats-server` auth_callout expects a JWT-issuing auth service
 * (issuer nkey, user JWT). `@epoch/nats` ships:
 * - Epoch-native JSON in-process handler (`attachAuthCalloutService`)
 * - host-side JWT issuance (`issueUserJwt` / `verifyUserJwt`) for mixed-mode
 *   callout + resolver accounts (ADR-0054).
 *
 * NATS never crosses operators. Subjects stay epoch.live.>, epoch.community.stream.>,
 * epoch.platform.events.>, epoch.svc.>. sourceServer prefixes those trees so A cannot mint B.
 */
export const NATS_SERVER_CONF_TEMPLATE = `# Epoch NATS fabric (ADR-0054)
# Host process — browsers connect with nats.ws; do not compile nats-server to WASM.
#
# Mixed-mode: auth_callout issues short-lived user JWTs via @epoch/nats issueUserJwt.
# Resolver accounts stay intra-community. Do not link brokers across operators (I-2).

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
    auth_users: [ auth ]
    account: EPOCH
  }
  timeout: 2s
}

# Streams are created by @epoch/nats bootstrap (EPOCH_LIVE, EPOCH_PLATFORM_EVENTS,
# EPOCH_COMMUNITY_LIVESTREAM, EPOCH_SVC) or via nats CLI.
# Subjects: epoch.live.>, epoch.community.stream.>, epoch.platform.events.>, epoch.svc.>
`;
