/**
 * C-3 fabric admission. Principal is an Epoch id — never a JID (I-1).
 * verify() returns null to deny (I-4).
 */

export interface FabricAdmission {
  readonly principal: string;
  readonly sourceServer?: string;
  readonly scopes: readonly string[];
  readonly expiresAt: number;
  readonly bindingVerified?: boolean;
  readonly allowServiceDiscovery?: boolean;
}

export interface FabricValidator {
  verify(token: string, options?: { readonly sourceServer?: string; readonly bindingVerified?: boolean }): FabricAdmission | null;
}

export const HIGH_STAKES_SCOPES = Object.freeze([
  "community.stream:write",
  "platform.events:write",
] as const);

export function requiresBinding(scopes: readonly string[]): boolean {
  // SAFETY: The module validates or constructs this value before applying the asserted contract.
  return scopes.some((scope) => (HIGH_STAKES_SCOPES as readonly string[]).includes(scope));
}
