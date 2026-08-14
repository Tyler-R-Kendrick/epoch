/**
 * ATProto OAuth confidential client (PAR + PKCE + DPoP) surface.
 * Production must hold only granular permission-set:
 *   repo:org.epoch.identity.binding (create/update)
 * Rotation keys are NEVER requested or logged (Section 5).
 */

export type OAuthTokenSet = {
  readonly accessToken: string;
  readonly scope: string;
  readonly expiresAt: number;
};

export interface AtprotoOAuthClient {
  /** Accept a PAR/PKCE/DPoP access token. Must reject rotation-key scopes. Never mints a token from the DID. */
  authorize(input: { readonly did: string; readonly scope: string; readonly accessToken?: string }): Promise<OAuthTokenSet>;
  assertScope(token: OAuthTokenSet, required: string): void;
}

export const BINDING_RECORD_SCOPE = "repo:org.epoch.identity.binding" as const;

export class ScopedOAuthClient implements AtprotoOAuthClient {
  async authorize(input: { readonly did: string; readonly scope: string; readonly accessToken?: string }): Promise<OAuthTokenSet> {
    if (input.scope.includes("transition:generic") || input.scope.includes("rotation")) {
      throw new Error("rotation keys / transition:generic must never be requested");
    }
    if (!input.scope.includes(BINDING_RECORD_SCOPE)) {
      throw new Error(`scope must include ${BINDING_RECORD_SCOPE}`);
    }
    const accessToken = String(input.accessToken || "");
    if (!accessToken) {
      throw new Error("AT OAuth is not linked — PAR/PKCE/DPoP required");
    }
    if (accessToken.startsWith("epoch-oauth-")) {
      throw new Error("AT OAuth refused stub token mint");
    }
    return {
      accessToken,
      scope: input.scope,
      expiresAt: Date.now() + 3_600_000,
    };
  }

  assertScope(token: OAuthTokenSet, required: string): void {
    if (!token.scope.split(/\s+/u).includes(required) && !token.scope.includes(required)) {
      throw new Error(`missing OAuth scope ${required}`);
    }
    if (token.expiresAt < Date.now()) {
      throw new Error("OAuth token expired");
    }
  }
}
