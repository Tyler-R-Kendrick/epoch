/**
 * Least-privilege NATS subject ACLs from Epoch fabric scopes (ADR-0054).
 * Empty publish+subscribe means the caller should deny.
 * `sourceServer` prefixes subjects so server A cannot mint B's ACLs (I-3).
 */

import type { EpochNatsPermissions } from "./auth-callout";
function __epochIsString<T>(value: T): value is T & string { return typeof value === "string"; }


const LIVE = "epoch.live.>";
const PLATFORM_EVENTS = "epoch.platform.events.>";
const COMMUNITY_STREAM = "epoch.community.stream.>";
const SVC = "epoch.svc.>";

const API_TOKEN_SCOPE_MAP: Readonly<
  Record<string, { readonly publish?: boolean; readonly subscribe?: boolean; readonly subject: string }>
> = Object.freeze({
  "live:write": { subject: LIVE, publish: true, subscribe: true },
  "live:read": { subject: LIVE, subscribe: true },
  "platform.events:write": { subject: PLATFORM_EVENTS, publish: true, subscribe: true },
  "platform.events:read": { subject: PLATFORM_EVENTS, subscribe: true },
  "community.stream:write": { subject: COMMUNITY_STREAM, publish: true, subscribe: true },
  "community.stream:read": { subject: COMMUNITY_STREAM, subscribe: true },
  "svc:discover": { subject: SVC, publish: true, subscribe: true },
});

export type PermissionsForScopesOptions = {
  readonly sourceServer?: string;
  /** Hosted/private only. Open posture must not grant `epoch.svc.>` (ADR-0055). */
  readonly allowServiceDiscovery?: boolean;
};

/**
 * Map fabric scopes to NATS publish/subscribe permissions.
 * - session + `fabric:human`: live + community publish; platform events subscribe-only
 * - api-token: per-scope subject grants from the fixed map
 * - sourceServer: subjects become epoch.live.<server>.> (and peers) so A↛B
 */
export function permissionsForScopes(
  scopes: readonly string[],
  kind: "session" | "api-token",
  options: PermissionsForScopesOptions = {},
): EpochNatsPermissions {
  const publish = new Set<string>();
  const subscribe = new Set<string>();
  const prefix = sourcePrefix(options.sourceServer);

  if (kind === "session" && scopes.includes("fabric:human")) {
    publish.add(scoped(LIVE, prefix));
    publish.add(scoped(COMMUNITY_STREAM, prefix));
    subscribe.add(scoped(LIVE, prefix));
    subscribe.add(scoped(COMMUNITY_STREAM, prefix));
    subscribe.add(scoped(PLATFORM_EVENTS, prefix));
    if (options.allowServiceDiscovery === true) {
      publish.add(scoped(SVC, prefix));
      subscribe.add(scoped(SVC, prefix));
    }
  }

  if (kind === "api-token") {
    for (const scope of scopes) {
      if (scope === "svc:discover" && options.allowServiceDiscovery !== true) continue;
      const grant = API_TOKEN_SCOPE_MAP[scope];
      if (!grant) continue;
      const subject = scoped(grant.subject, prefix);
      if (grant.publish) publish.add(subject);
      if (grant.subscribe) subscribe.add(subject);
    }
  }

  return {
    publish: Object.freeze([...publish]),
    subscribe: Object.freeze([...subscribe]),
  };
}

function sourcePrefix(sourceServer: string | undefined): string | undefined {
  if (!__epochIsString(sourceServer)) return undefined;
  const cleaned = sourceServer.replace(/[^a-zA-Z0-9_-]+/g, "_").replace(/^_+|_+$/g, "");
  return cleaned.length > 0 ? cleaned : undefined;
}

function scoped(subject: string, sourceServer: string | undefined): string {
  if (!sourceServer) return subject;
  if (subject === LIVE) return `epoch.live.${sourceServer}.>`;
  if (subject === COMMUNITY_STREAM) return `epoch.community.stream.${sourceServer}.>`;
  if (subject === PLATFORM_EVENTS) return `epoch.platform.events.${sourceServer}.>`;
  if (subject === SVC) return `epoch.svc.${sourceServer}.>`;
  return subject;
}
