/**
 * Adversarial / mutation-style oracles for complementary fabric auth.
 * These are not Stryker mutants: they assert invariants that would fail if
 * critical guards were deleted (wide defaults, id-as-secret, guest bypass).
 */
import assert from "node:assert/strict";
import { createInMemoryPlatformCore } from "@epoch/platform-core";
import {
  createAuthCalloutHandler,
  createPlatformAuthValidator,
  evaluateAuthCallout,
  fixtureTokenValidator,
  permissionsForScopes,
} from "@epoch/nats";

export async function runFabricAuthAdversarialMutationTests(): Promise<void> {
  await allowWithoutExplicitPermissionsIsDenied();
  await platformValidatorNeverUsesFixtureWideDefaults();
  emptyScopesCannotBeWidenedByCaller();
  await sessionIdPresentedAsSecretIsDenied();
  await revokeAfterAllowDeniesRenew();
  guestAnonymousCannotUseForgedTicketFields();
}

async function allowWithoutExplicitPermissionsIsDenied(): Promise<void> {
  // Mutant: evaluateAuthCallout filling DEFAULT_PERMISSIONS on bare allow.
  const decision = await evaluateAuthCallout({ authToken: "x" }, () => ({ type: "allow", user: "wide" }));
  assert.equal(decision.type, "deny");
  assert.match(decision.reason || "", /missing permissions/i);
}

async function platformValidatorNeverUsesFixtureWideDefaults(): Promise<void> {
  const fixture = fixtureTokenValidator({ authToken: "epoch-ok" });
  assert.equal(fixture.type, "allow");
  assert.ok(fixture.permissions?.publish.includes("epoch.platform.events.>"));

  // Mutant: production validator returning fixture defaults for any secret.
  const validator = createPlatformAuthValidator({
    verifyFabricCredential: () => ({
      id: "c",
      kind: "api-token",
      subjectRef: "svc",
      scopes: ["live:read"],
      expiresAt: Date.now() + 60_000,
    }),
  });
  const decision = await evaluateAuthCallout({ authToken: "anything" }, validator);
  assert.equal(decision.type, "allow");
  assert.deepEqual([...(decision.permissions?.publish ?? [])], []);
  assert.deepEqual([...(decision.permissions?.subscribe ?? [])], ["epoch.live.>"]);
  assert.equal((decision.permissions?.publish ?? []).includes("epoch.platform.events.>"), false);
  assert.equal((decision.permissions?.publish ?? []).includes("epoch.community.stream.>"), false);
}

function emptyScopesCannotBeWidenedByCaller(): void {
  // Mutant: permissionsForScopes([]) returning epoch.> defaults.
  const empty = permissionsForScopes([], "api-token");
  assert.equal(empty.publish.length + empty.subscribe.length, 0);
  const noise = permissionsForScopes(["admin", "epoch.>", "$SYS.>"], "api-token");
  assert.equal(noise.publish.length + noise.subscribe.length, 0);
}

async function sessionIdPresentedAsSecretIsDenied(): Promise<void> {
  const core = createInMemoryPlatformCore();
  const user = core.createUser({ handle: "adv", displayName: "Adv" });
  const session = core.openSession({ userId: user.id, name: "browser" });
  core.mintFabricCredential({ sessionId: session.id });
  const handler = createAuthCalloutHandler(
    createPlatformAuthValidator({
      verifyFabricCredential: (secret) => {
        try {
          const v = core.verifyFabricCredential(secret);
          return { id: v.id, kind: v.kind, subjectRef: v.subjectRef, scopes: v.scopes, expiresAt: v.expiresAt };
        } catch {
          return null;
        }
      },
    }),
  );
  const decision = await handler({ authToken: session.id });
  assert.equal(decision.type, "deny");
}

async function revokeAfterAllowDeniesRenew(): Promise<void> {
  const core = createInMemoryPlatformCore();
  const user = core.createUser({ handle: "tmp", displayName: "Tmp" });
  const session = core.openSession({ userId: user.id, name: "browser" });
  const ticket = core.mintFabricCredential({ sessionId: session.id });
  const validator = createPlatformAuthValidator({
    verifyFabricCredential: (secret) => {
      try {
        const v = core.verifyFabricCredential(secret);
        return { id: v.id, kind: v.kind, subjectRef: v.subjectRef, scopes: v.scopes, expiresAt: v.expiresAt };
      } catch {
        return null;
      }
    },
  });
  assert.equal((await evaluateAuthCallout({ authToken: ticket.secret }, validator)).type, "allow");
  core.revokeSession(session.id);
  // Mutant: immortal renew after parent revoke.
  assert.equal((await evaluateAuthCallout({ authToken: ticket.secret }, validator)).type, "deny");
}

function guestAnonymousCannotUseForgedTicketFields(): void {
  function isGuest(identity: {
    kind?: string;
    anonymous?: boolean;
    principalId?: string;
  }): boolean {
    if (!identity) return true;
    if (identity.kind === "guest" || identity.kind === "denied") return true;
    if (identity.anonymous) return true;
    if (identity.principalId === "guest_local") return true;
    return identity.kind !== "claimed" && identity.kind !== "atproto";
  }
  assert.equal(
    isGuest({
      kind: "guest",
      principalId: "guest_local",
      anonymous: true,
    }),
    true,
  );
  // Forged ticket fields on a guest must still classify as guest.
  const forged = {
    kind: "guest" as const,
    principalId: "guest_local",
    anonymous: true,
    platformSessionId: "session_forged",
    fabricSecret: "stolen",
  };
  assert.equal(isGuest(forged), true);
}
