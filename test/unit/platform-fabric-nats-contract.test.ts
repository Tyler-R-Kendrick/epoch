/**
 * Cross-package contract: Platform fabric mint → NATS callout → gated Live sync.
 * This is the Epoch-native auth contract for ADR-0054 (not HTTP Pact).
 */
import assert from "node:assert/strict";
import { createInMemoryPlatformCore } from "@epoch/platform-core";
import { createAuthenticatedNatsLiveProvider, createLiveStore, createNatsLiveProvider } from "@epoch/live";
import {
  AUTH_CALLOUT_SUBJECT,
  attachAuthCalloutService,
  connectGatedNatsBus,
  createAuthCalloutHandler,
  createInMemoryNatsBus,
  createPlatformAuthValidator,
  evaluateAuthCallout,
  openAuthenticatedNatsLiveChannel,
  permissionsForScopes,
} from "@epoch/nats";

export async function runPlatformFabricNatsContractTests(): Promise<void> {
  await mintVerifyAllowsGatedLiveConvergence();
  await sessionIdIsNotAcceptedAsFabricSecret();
  await revokeParentDeniesCalloutAndBlocksConnect();
  await expiredTicketDeniesCallout();
  await emptyApiTokenScopesDenyCallout();
  await authCalloutResponseShapeIsStable();
}

async function mintVerifyAllowsGatedLiveConvergence(): Promise<void> {
  const core = createInMemoryPlatformCore();
  const user = core.createUser({ handle: "lea", displayName: "Lea" });
  const session = core.openSession({ userId: user.id, name: "board" });
  const ticket = core.mintFabricCredential({ sessionId: session.id });

  const verified = core.verifyFabricCredential(ticket.secret);
  assert.equal(verified.kind, "session");
  assert.deepEqual([...verified.scopes], ["fabric:human"]);

  const validator = createPlatformAuthValidator({
    verifyFabricCredential: (secret) => {
      try {
        const v = core.verifyFabricCredential(secret);
        return {
          id: v.id,
          kind: v.kind,
          subjectRef: v.subjectRef,
          scopes: v.scopes,
          expiresAt: v.expiresAt,
        };
      } catch {
        return null;
      }
    },
  });
  const allow = await evaluateAuthCallout({ authToken: ticket.secret }, validator);
  assert.equal(allow.type, "allow");
  assert.equal(allow.user, user.id);
  assert.deepEqual(allow.permissions, permissionsForScopes(["fabric:human"], "session"));

  const shared = createInMemoryNatsBus();
  const handler = createAuthCalloutHandler(validator);
  const gate = async (token: string) => (await handler({ authToken: token })).type === "allow";
  const connect = (secret: string) => connectGatedNatsBus(() => shared, gate, secret);

  const aliceOpened = await openAuthenticatedNatsLiveChannel({
    repoId: "contract-repo",
    fabricSecret: ticket.secret,
    connect,
  });
  const alice = createLiveStore({ entity: "doc", author: "alice", initialState: {} });
  const bob = createLiveStore({ entity: "doc", author: "bob", initialState: {} });
  alice.connect(createNatsLiveProvider(aliceOpened.channel, aliceOpened.providerId));
  const bobProvider = await createAuthenticatedNatsLiveProvider({
    repoId: "contract-repo",
    fabricSecret: ticket.secret,
    connect: async (secret) =>
      openAuthenticatedNatsLiveChannel({
        repoId: "contract-repo",
        fabricSecret: secret,
        connect,
      }),
  });
  bob.connect(bobProvider);
  alice.dispatch({ type: "set", payload: { title: "contract-ok" } });
  assert.equal((bob.getState() as { title?: string }).title, "contract-ok");

  aliceOpened.stop();
  bobProvider.disconnect();
  shared.close();
}

async function sessionIdIsNotAcceptedAsFabricSecret(): Promise<void> {
  const core = createInMemoryPlatformCore();
  const user = core.createUser({ handle: "mallory", displayName: "Mallory" });
  const session = core.openSession({ userId: user.id, name: "stolen-id" });
  core.mintFabricCredential({ sessionId: session.id });

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
  const deny = await evaluateAuthCallout({ authToken: session.id }, validator);
  assert.equal(deny.type, "deny");
}

async function revokeParentDeniesCalloutAndBlocksConnect(): Promise<void> {
  const core = createInMemoryPlatformCore();
  const user = core.createUser({ handle: "rev", displayName: "Rev" });
  const session = core.openSession({ userId: user.id, name: "tmp" });
  const ticket = core.mintFabricCredential({ sessionId: session.id });
  core.revokeSession(session.id);

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
  assert.equal((await evaluateAuthCallout({ authToken: ticket.secret }, validator)).type, "deny");

  const shared = createInMemoryNatsBus();
  const handler = createAuthCalloutHandler(validator);
  await assert.rejects(
    () =>
      connectGatedNatsBus(
        () => shared,
        async (token) => (await handler({ authToken: token })).type === "allow",
        ticket.secret,
      ),
    /nats connect denied/,
  );
  shared.close();
}

async function expiredTicketDeniesCallout(): Promise<void> {
  const core = createInMemoryPlatformCore();
  const user = core.createUser({ handle: "old", displayName: "Old" });
  const session = core.openSession({ userId: user.id, name: "tmp" });
  const ticket = core.mintFabricCredential({ sessionId: session.id, ttlSeconds: 0 });
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
  assert.equal((await evaluateAuthCallout({ authToken: ticket.secret }, validator)).type, "deny");
}

async function emptyApiTokenScopesDenyCallout(): Promise<void> {
  const core = createInMemoryPlatformCore();
  const org = core.createOrganization({ slug: "acme", displayName: "Acme" });
  const svc = core.createServiceAccount({ organizationId: org.id, name: "empty", scopes: [] });
  const token = core.issueApiToken({ serviceAccountId: svc.id, name: "ci" });
  const ticket = core.mintFabricCredential({ apiTokenId: token.id });
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
  const deny = await evaluateAuthCallout({ authToken: ticket.secret }, validator);
  assert.equal(deny.type, "deny");
  assert.match(deny.reason || "", /empty permissions/i);
}

async function authCalloutResponseShapeIsStable(): Promise<void> {
  const bus = createInMemoryNatsBus();
  const core = createInMemoryPlatformCore();
  const user = core.createUser({ handle: "shape", displayName: "Shape" });
  const session = core.openSession({ userId: user.id, name: "tmp" });
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
  const svc = attachAuthCalloutService(bus, createAuthCalloutHandler(validator));
  const request = bus.request;
  assert.ok(request);
  const reply = await request(
    AUTH_CALLOUT_SUBJECT,
    JSON.stringify({ authToken: ticket.secret, username: "shape" }),
    { timeout: 500 },
  );
  const body = JSON.parse(Buffer.from(reply.data).toString("utf8")) as Record<string, unknown>;
  assert.equal(body.type, "allow");
  assert.equal(typeof body.user, "string");
  assert.ok(body.permissions && typeof body.permissions === "object");
  const perms = body.permissions as { publish: unknown; subscribe: unknown };
  assert.ok(Array.isArray(perms.publish));
  assert.ok(Array.isArray(perms.subscribe));
  assert.equal("jwt" in body, false, "Epoch-native JSON MVP must not pretend to issue nats-server JWTs");
  svc.stop();
  bus.close();
}
