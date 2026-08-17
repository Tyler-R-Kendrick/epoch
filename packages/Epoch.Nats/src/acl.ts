/**
 * Least-privilege NATS subject ACLs from Epoch fabric scopes (ADR-0054).
 * Empty publish+subscribe means the caller should deny.
 */

import type { EpochNatsPermissions } from "./auth-callout";

const LIVE = "epoch.live.>";
const PLATFORM_EVENTS = "epoch.platform.events.>";
const COMMUNITY_STREAM = "epoch.community.stream.>";

const API_TOKEN_SCOPE_MAP: Readonly<
  Record<string, { readonly publish?: boolean; readonly subscribe?: boolean; readonly subject: string }>
> = Object.freeze({
  "live:write": { subject: LIVE, publish: true, subscribe: true },
  "live:read": { subject: LIVE, subscribe: true },
  "platform.events:write": { subject: PLATFORM_EVENTS, publish: true, subscribe: true },
  "platform.events:read": { subject: PLATFORM_EVENTS, subscribe: true },
  "community.stream:write": { subject: COMMUNITY_STREAM, publish: true, subscribe: true },
  "community.stream:read": { subject: COMMUNITY_STREAM, subscribe: true },
});

/**
 * Map fabric scopes to NATS publish/subscribe permissions.
 * - session + `fabric:human`: live + community publish; platform events subscribe-only
 * - api-token: per-scope subject grants from the fixed map
 */
export function permissionsForScopes(
  scopes: readonly string[],
  kind: "session" | "api-token",
): EpochNatsPermissions {
  const publish = new Set<string>();
  const subscribe = new Set<string>();

  if (kind === "session" && scopes.includes("fabric:human")) {
    publish.add(LIVE);
    publish.add(COMMUNITY_STREAM);
    subscribe.add(LIVE);
    subscribe.add(COMMUNITY_STREAM);
    subscribe.add(PLATFORM_EVENTS);
  }

  if (kind === "api-token") {
    for (const scope of scopes) {
      const grant = API_TOKEN_SCOPE_MAP[scope];
      if (!grant) continue;
      if (grant.publish) publish.add(grant.subject);
      if (grant.subscribe) subscribe.add(grant.subject);
    }
  }

  return {
    publish: Object.freeze([...publish]),
    subscribe: Object.freeze([...subscribe]),
  };
}
