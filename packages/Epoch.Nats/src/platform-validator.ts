/**
 * Platform fabric credential → auth callout decision.
 * Inject `verifyFabricCredential` — do not hard-require Platform Core as a runtime dep.
 */

import { permissionsForScopes } from "./acl";
import type { AuthCalloutDecision, AuthCalloutRequest, AuthCalloutValidator } from "./auth-callout";

export type FabricCredential = {
  readonly id: string;
  readonly kind: "session" | "api-token";
  readonly subjectRef: string;
  readonly scopes: readonly string[];
  readonly expiresAt: number;
};

export type FabricCredentialVerifier = (
  secret: string,
) => FabricCredential | null | Promise<FabricCredential | null>;

function presentedSecret(request: AuthCalloutRequest): string | undefined {
  const raw = request.authToken || request.password;
  if (typeof raw !== "string") return undefined;
  const secret = raw.trim();
  return secret.length > 0 ? secret : undefined;
}

function isUsableCredential(credential: FabricCredential): boolean {
  if (credential.kind !== "session" && credential.kind !== "api-token") return false;
  if (typeof credential.subjectRef !== "string" || credential.subjectRef.trim().length === 0) {
    return false;
  }
  if (!Number.isFinite(credential.expiresAt) || credential.expiresAt <= Date.now()) {
    return false;
  }
  if (!Array.isArray(credential.scopes)) return false;
  return true;
}

/**
 * Build an AuthCalloutValidator that verifies Platform sessions/API tokens
 * and attaches least-privilege permissions (never wide defaults).
 */
export function createPlatformAuthValidator(deps: {
  verifyFabricCredential: FabricCredentialVerifier;
}): AuthCalloutValidator {
  return async (request: AuthCalloutRequest): Promise<AuthCalloutDecision> => {
    const secret = presentedSecret(request);
    if (!secret) {
      return { type: "deny", reason: "missing credentials" };
    }

    let credential: FabricCredential | null;
    try {
      credential = await deps.verifyFabricCredential(secret);
    } catch {
      return { type: "deny", reason: "verification failed" };
    }

    if (!credential || !isUsableCredential(credential)) {
      return { type: "deny", reason: "invalid credentials" };
    }

    const permissions = permissionsForScopes(credential.scopes, credential.kind);
    if (permissions.publish.length === 0 && permissions.subscribe.length === 0) {
      return { type: "deny", reason: "empty permissions" };
    }

    return {
      type: "allow",
      user: credential.subjectRef,
      permissions,
    };
  };
}
