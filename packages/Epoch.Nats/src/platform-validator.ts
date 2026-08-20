/**
 * Platform fabric credential → auth callout decision.
 * Inject `verifyFabricCredential` — do not hard-require Platform Core as a runtime dep.
 */

import { permissionsForScopes } from "./acl";
import { requiresBinding } from "./admission";
import type { AuthCalloutDecision, AuthCalloutRequest, AuthCalloutValidator } from "./auth-callout";
function __epochIsString<T>(value: T): value is T & string { return typeof value === "string"; }


export type FabricCredential = {
  readonly id: string;
  readonly kind: "session" | "api-token";
  readonly subjectRef: string;
  readonly scopes: readonly string[];
  readonly expiresAt: number;
  readonly sourceServer?: string;
  readonly bindingVerified?: boolean;
  /** When true (hosted/private), callout may grant `epoch.svc.>`. */
  readonly allowServiceDiscovery?: boolean;
};

export type FabricCredentialVerifier = (
  secret: string,
) => FabricCredential | null | Promise<FabricCredential | null>;

function presentedSecret(request: AuthCalloutRequest): string | undefined {
  const raw = request.authToken || request.password;
  if (!__epochIsString(raw)) return undefined;
  const secret = raw.trim();
  return secret.length > 0 ? secret : undefined;
}

function isUsableCredential(credential: FabricCredential): boolean {
  if (credential.kind !== "session" && credential.kind !== "api-token") return false;
  if (!__epochIsString(credential.subjectRef) || credential.subjectRef.trim().length === 0) {
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

    const permissions = permissionsForScopes(credential.scopes, credential.kind, {
      sourceServer: credential.sourceServer,
      allowServiceDiscovery: credential.allowServiceDiscovery === true,
    });
    if (permissions.publish.length === 0 && permissions.subscribe.length === 0) {
      return { type: "deny", reason: "empty permissions" };
    }

    if (requiresBinding(credential.scopes) && credential.bindingVerified !== true) {
      return { type: "deny", reason: "unverifiable binding" };
    }

    const presentedServer = __epochIsString(request.serverId) ? request.serverId : undefined;
    if (credential.sourceServer && presentedServer && credential.sourceServer !== presentedServer) {
      return { type: "deny", reason: "sourceServer mismatch" };
    }

    return {
      type: "allow",
      user: credential.subjectRef,
      permissions,
    };
  };
}
