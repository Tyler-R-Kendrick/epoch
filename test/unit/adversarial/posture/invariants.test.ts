import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { evaluatePosture, ProtocolError } from "@epoch/protocol";
import { createPlatformAuthValidator, permissionsForScopes } from "@epoch/nats";
import { InMemoryXmppTransport, PrivatePublishError as XmppPrivate, principalFromJid } from "@epoch/xmpp";
import { FederatedCommunity, MockPds, PrivatePublishError as AtPrivate } from "@epoch/atproto";
import { ExitBundleError, parseExitBundle } from "@epoch/core";
import { evaluateEvidence } from "../../protocol-experiments/registry";

export async function runAdversarialPostureTests(): Promise<void> {
  i1TransportIsNotAuthority();
  i2NatsNeverCrossesOperators();
  await i3SourceServerConfusionDenied();
  i4FailClosedModes();
  i5ExitTamper();
  await i6BridgeOptOutNoResidue();
  await i7PrivateNeverFederates();
  timeoutNeverLaunders();
  mutantCanFailThenPass();
}

function i1TransportIsNotAuthority(): void {
  assert.throws(() => principalFromJid("maya@xmpp.example"), /admission only/u);
}

function i2NatsNeverCrossesOperators(): void {
  const natsSrc = [
    readFileSync("packages/Epoch.Nats/src/subjects.ts", "utf8"),
    readFileSync("packages/Epoch.Nats/src/nats-conf.ts", "utf8"),
    readFileSync("packages/Epoch.Nats/src/acl.ts", "utf8"),
  ].join("\n");
  assert.equal(/super[-_]?cluster|leafnode|cluster_routes|gateway\s*\{/i.test(natsSrc), false);
  assert.ok(natsSrc.includes("epoch.live."));
  assert.ok(natsSrc.includes("epoch.community.stream."));
  assert.ok(natsSrc.includes("epoch.platform.events."));
  assert.ok(natsSrc.includes("epoch.svc."));
}

async function i3SourceServerConfusionDenied(): Promise<void> {
  const a = permissionsForScopes(["live:write"], "api-token", { sourceServer: "a" });
  const b = permissionsForScopes(["live:write"], "api-token", { sourceServer: "b" });
  assert.equal(a.publish.some((subject) => subject.includes("epoch.live.b.")), false);
  assert.ok(b.publish.includes("epoch.live.b.>"));
  const validator = createPlatformAuthValidator({
    verifyFabricCredential: () => ({
      id: "c",
      kind: "api-token",
      subjectRef: "maya",
      scopes: ["live:write"],
      expiresAt: Date.now() + 60_000,
      sourceServer: "server-a",
    }),
  });
  const denied = await validator({ authToken: "secret", serverId: "server-b" });
  assert.equal(denied.type, "deny");
}

function i4FailClosedModes(): void {
  assert.throws(() => evaluatePosture({ posture: "mystery" }), (error: unknown) =>
    error instanceof ProtocolError && error.code === "policy-denied");
  assert.equal(evaluateEvidence({ gateId: "E01", evidence: "timeout" }), "rejected");
}

function i5ExitTamper(): void {
  assert.throws(() => parseExitBundle({ schema: "epoch-exit/v1", events: [], bindings: [], manifest: { sha256: "00", eventCount: 0, headId: "" } }), (error: unknown) =>
    error instanceof ExitBundleError);
}

async function i6BridgeOptOutNoResidue(): Promise<void> {
  const transport = new InMemoryXmppTransport({ enabled: false });
  await assert.rejects(() => transport.send(new Uint8Array([1]), "a.example"), /off/u);
}

async function i7PrivateNeverFederates(): Promise<void> {
  const xmpp = new InMemoryXmppTransport({ enabled: true });
  assert.throws(() => xmpp.assertPublic("private"), (error: unknown) => error instanceof XmppPrivate);
  const community = new FederatedCommunity({ mode: "federated", pds: new MockPds() });
  community.bindIdentity({ did: "did:plc:x", handle: "x.test", pdsEndpoint: "mock://pds" });
  await assert.rejects(async () => {
    await community.publishPublicArtifacts({
      repository: {} as never,
      versionOrEventId: "x",
      ownerDid: "did:plc:x",
      visibility: "private",
    });
  }, (error: unknown) => error instanceof AtPrivate);
}

function timeoutNeverLaunders(): void {
  assert.equal(evaluateEvidence({ gateId: "E13", evidence: { timeout: true, ok: true } }), "rejected");
}

function mutantCanFailThenPass(): void {
  let failed = false;
  try {
    evaluatePosture({ posture: "open", allowServiceDiscovery: true });
  } catch {
    failed = true;
  }
  assert.equal(failed, true);
  assert.equal(evaluatePosture({ posture: "open" }).allowServiceDiscovery, false);
}
