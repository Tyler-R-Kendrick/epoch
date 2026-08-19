import assert from "node:assert/strict";
import { evaluatePosture } from "@epoch/protocol";
import { createInMemoryPlatformCore } from "@epoch/platform-core";
import {
  AUTH_CALLOUT_SUBJECT,
  ServiceDiscoveryDeniedError,
  attachAuthCalloutService,
  createAuthCalloutHandler,
  createInMemoryNatsBus,
  createInMemoryServiceDirectory,
  createPlatformAuthValidator,
  evaluateAuthCallout,
  permissionsForScopes,
  serviceAdvertiseSubject,
  serviceLookupSubject,
} from "@epoch/nats";

export async function runNatsServiceDiscoveryTests(): Promise<void> {
  authCalloutSubjectIsSysUserAuth();
  hostedDiscoveryRoundTrip();
  openPostureDeniesDiscovery();
  crossCommunityAdvertiseDenied();
  sourceServerACannotSeeB();
  expiredAdvertisementDropped();
  aclGrantsSvcOnlyWhenAllowed();
  await calloutTimeoutDenies();
  await calloutGrantsSvcWhenPostureAllows();
  await calloutOmitsSvcWhenPostureForbids();
  await hostedPlatformMintGrantsSvc();
  await openPlatformMintOmitsSvc();
}

function authCalloutSubjectIsSysUserAuth(): void {
  assert.equal(AUTH_CALLOUT_SUBJECT, "$SYS.REQ.USER.AUTH");
}

function hostedDiscoveryRoundTrip(): void {
  const directory = createInMemoryServiceDirectory({
    allowServiceDiscovery: true,
    communityId: "civic",
    sourceServer: "server-a",
  });
  directory.advertise({
    name: "live",
    endpoint: "epoch.live.civic.>",
  });
  const found = directory.lookup("live");
  assert.equal(found.length, 1);
  assert.equal(found[0]?.endpoint, "epoch.live.civic.>");
  assert.equal(found[0]?.communityId, "civic");
  assert.equal(serviceAdvertiseSubject("civic"), "epoch.svc.advertise.civic");
  assert.equal(serviceLookupSubject("civic", "live"), "epoch.svc.lookup.civic.live");
}

function openPostureDeniesDiscovery(): void {
  const directory = createInMemoryServiceDirectory({
    allowServiceDiscovery: false,
    communityId: "civic",
  });
  assert.throws(
    () => directory.advertise({ name: "live", endpoint: "epoch.live.civic.>" }),
    (error: unknown) => error instanceof ServiceDiscoveryDeniedError,
  );
  assert.throws(
    () => directory.lookup("live"),
    (error: unknown) => error instanceof ServiceDiscoveryDeniedError,
  );
}

function crossCommunityAdvertiseDenied(): void {
  const directory = createInMemoryServiceDirectory({
    allowServiceDiscovery: true,
    communityId: "civic",
  });
  assert.throws(
    () => directory.advertise({ name: "live", communityId: "other", endpoint: "epoch.live.other.>" }),
    (error: unknown) => error instanceof ServiceDiscoveryDeniedError,
  );
}

function sourceServerACannotSeeB(): void {
  const a = createInMemoryServiceDirectory({
    allowServiceDiscovery: true,
    communityId: "civic",
    sourceServer: "server-a",
  });
  a.advertise({ name: "live", endpoint: "epoch.live.server-a.>" });
  const b = createInMemoryServiceDirectory({
    allowServiceDiscovery: true,
    communityId: "civic",
    sourceServer: "server-b",
    share: a.exportSnapshot(),
  });
  assert.deepEqual(b.lookup("live"), []);
}

function expiredAdvertisementDropped(): void {
  let now = 1_000;
  const directory = createInMemoryServiceDirectory({
    allowServiceDiscovery: true,
    communityId: "civic",
    ttlMs: 10,
    now: () => now,
  });
  directory.advertise({ name: "live", endpoint: "epoch.live.civic.>" });
  now = 1_020;
  assert.deepEqual(directory.lookup("live"), []);
}

function aclGrantsSvcOnlyWhenAllowed(): void {
  const hosted = permissionsForScopes(["fabric:human"], "session", { allowServiceDiscovery: true });
  assert.ok(hosted.publish.includes("epoch.svc.>"));
  assert.ok(hosted.subscribe.includes("epoch.svc.>"));
  const open = permissionsForScopes(["fabric:human", "svc:discover"], "session", { allowServiceDiscovery: false });
  assert.equal(open.publish.some((subject) => subject.startsWith("epoch.svc.")), false);
  const token = permissionsForScopes(["svc:discover"], "api-token", {
    allowServiceDiscovery: true,
    sourceServer: "server-a",
  });
  assert.ok(token.publish.includes("epoch.svc.server-a.>"));
  assert.equal(token.publish.includes("epoch.svc.server-b.>"), false);
}

async function calloutTimeoutDenies(): Promise<void> {
  const bus = createInMemoryNatsBus();
  attachAuthCalloutService(bus, () => new Promise(() => undefined), { timeoutMs: 20 });
  const reply = await bus.request(AUTH_CALLOUT_SUBJECT, JSON.stringify({ authToken: "epoch-ok" }), { timeout: 200 });
  const decision = JSON.parse(new TextDecoder().decode(reply.data)) as { type: string; reason?: string };
  assert.equal(decision.type, "deny");
  assert.match(decision.reason ?? "", /timeout/u);
}

async function calloutGrantsSvcWhenPostureAllows(): Promise<void> {
  const validator = createPlatformAuthValidator({
    verifyFabricCredential: () => ({
      id: "c",
      kind: "session",
      subjectRef: "maya",
      scopes: ["fabric:human"],
      expiresAt: Date.now() + 60_000,
      allowServiceDiscovery: true,
    }),
  });
  const handler = createAuthCalloutHandler(validator);
  const allowed = await handler({ authToken: "secret" });
  assert.equal(allowed.type, "allow");
  assert.ok(allowed.permissions?.publish.includes("epoch.svc.>"));
}

async function calloutOmitsSvcWhenPostureForbids(): Promise<void> {
  const validator = createPlatformAuthValidator({
    verifyFabricCredential: () => ({
      id: "c",
      kind: "session",
      subjectRef: "maya",
      scopes: ["fabric:human", "svc:discover"],
      expiresAt: Date.now() + 60_000,
      allowServiceDiscovery: false,
    }),
  });
  const handler = createAuthCalloutHandler(validator);
  const allowed = await handler({ authToken: "secret" });
  assert.equal(allowed.type, "allow");
  assert.equal(allowed.permissions?.publish.some((subject) => subject.startsWith("epoch.svc.")), false);
}

async function hostedPlatformMintGrantsSvc(): Promise<void> {
  const core = createInMemoryPlatformCore({ posturePolicy: evaluatePosture({ posture: "hosted" }) });
  const user = core.createUser({ handle: "maya", displayName: "Maya" });
  const session = core.openSession({ userId: user.id, name: "board" });
  const ticket = core.mintFabricCredential({ sessionId: session.id });
  const verified = core.verifyFabricCredential(ticket.secret);
  assert.equal(verified.allowServiceDiscovery, true);
  const allow = await evaluateAuthCallout(
    { authToken: ticket.secret },
    createPlatformAuthValidator({
      verifyFabricCredential: (secret) => {
        try {
          const v = core.verifyFabricCredential(secret);
          return { ...v };
        } catch {
          return null;
        }
      },
    }),
  );
  assert.equal(allow.type, "allow");
  assert.ok(allow.permissions?.publish.includes("epoch.svc.>"));
}

async function openPlatformMintOmitsSvc(): Promise<void> {
  const core = createInMemoryPlatformCore();
  const user = core.createUser({ handle: "open", displayName: "Open" });
  const session = core.openSession({ userId: user.id, name: "board" });
  const ticket = core.mintFabricCredential({ sessionId: session.id });
  const verified = core.verifyFabricCredential(ticket.secret);
  assert.equal(verified.allowServiceDiscovery, false);
  const allow = await evaluateAuthCallout(
    { authToken: ticket.secret },
    createPlatformAuthValidator({
      verifyFabricCredential: (secret) => {
        try {
          const v = core.verifyFabricCredential(secret);
          return { ...v };
        } catch {
          return null;
        }
      },
    }),
  );
  assert.equal(allow.type, "allow");
  assert.equal(allow.permissions?.publish.some((subject) => subject.startsWith("epoch.svc.")), false);
}
