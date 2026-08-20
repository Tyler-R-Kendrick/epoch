
type DictionaryValue = null | undefined | boolean | number | string | bigint | readonly DictionaryValue[] | { readonly [key: string]: DictionaryValue };
/**
 * Epoch-owned NATS auth callout (ADR-0054).
 *
 * The broker packages CONNECT credentials; Epoch decides allow/deny and
 * subject permissions. Fail closed on missing/invalid credentials.
 *
 * Production allows must carry explicit permissions — there is no wide
 * DEFAULT_PERMISSIONS fill for non-fixture validators.
 */

export interface EpochNatsPermissions {
  readonly publish: readonly string[];
  readonly subscribe: readonly string[];
}

export interface AuthCalloutRequest {
  readonly serverId?: string;
  readonly userNkey?: string;
  readonly clientInfo?: Readonly<Record<string, DictionaryValue>>;
  /** Bearer / API token / session id presented by the client. */
  readonly authToken?: string;
  readonly username?: string;
  readonly password?: string;
}

export interface AuthCalloutDecision {
  readonly type: "allow" | "deny";
  readonly user?: string;
  readonly permissions?: EpochNatsPermissions;
  readonly reason?: string;
}

export type AuthCalloutResponse = AuthCalloutDecision;

export type AuthCalloutValidator = (
  request: AuthCalloutRequest,
) => Promise<AuthCalloutDecision> | AuthCalloutDecision;

export type AuthCalloutHandler = (
  request: AuthCalloutRequest,
) => Promise<AuthCalloutResponse>;

/** Wide fixture-only permissions — not used for production allow fill. */
const FIXTURE_DEFAULT_PERMISSIONS: EpochNatsPermissions = Object.freeze({
  publish: Object.freeze([
    "epoch.live.>",
    "epoch.platform.events.>",
    "epoch.community.stream.>",
  ]),
  subscribe: Object.freeze([
    "epoch.live.>",
    "epoch.platform.events.>",
    "epoch.community.stream.>",
  ]),
});

/**
 * Pure evaluation used by unit tests and by the callout service.
 * Allow without explicit permissions is denied (fail closed).
 */
export function evaluateAuthCallout(
  request: AuthCalloutRequest,
  validator: AuthCalloutValidator,
): Promise<AuthCalloutResponse> {
  return Promise.resolve(validator(request)).then((decision) => {
    if (decision.type === "allow") {
      if (!decision.permissions) {
        return {
          type: "deny",
          reason: "missing permissions",
        };
      }
      return {
        type: "allow",
        user: decision.user || request.username || "epoch-user",
        permissions: decision.permissions,
      };
    }
    return {
      type: "deny",
      reason: decision.reason || "unauthorized",
    };
  });
}

/** Build a handler with a fixed validator (Platform token lookup, etc.). */
export function createAuthCalloutHandler(validator: AuthCalloutValidator): AuthCalloutHandler {
  return (request) => evaluateAuthCallout(request, validator);
}

/** Fixture validator: token `epoch-ok` allows with explicit fixture permissions. */
export function fixtureTokenValidator(request: AuthCalloutRequest): AuthCalloutDecision {
  const token = request.authToken || request.password || "";
  if (token === "epoch-ok") {
    return {
      type: "allow",
      user: request.username || "fixture",
      permissions: FIXTURE_DEFAULT_PERMISSIONS,
    };
  }
  return { type: "deny", reason: "invalid token" };
}
