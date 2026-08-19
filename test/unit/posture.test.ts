import assert from "node:assert/strict";
import { ProtocolError, evaluatePosture, type PosturePolicy, type TrustPosture } from "@epoch/protocol";
import { createInMemoryPlatformCore } from "@epoch/platform-core";
import { parseTomlDocument } from "@epoch/core";
import { readFileSync } from "node:fs";

const GATED = [
  "service-discovery",
  "cross-community-fabric",
  "server-tracked-read-state",
  "public-artifact-plane",
  "inter-node-transport",
] as const;

export function runPostureTests(): void {
  absentConfigIsOpenWithExtrasOff();
  hostedPrivateOpenMatrix();
  unknownAndMalformedDeny();
  openCannotEnableServiceDiscovery();
  tomlCommunityPostureTable();
  platformCapabilityGates();
  mutationOpenDiscoveryMustFail();
  boardMastheadBadge();
}

function absentConfigIsOpenWithExtrasOff(): void {
  const policy = evaluatePosture(undefined);
  assert.equal(policy.posture, "open");
  assert.equal(policy.allowServiceDiscovery, false);
  assert.equal(policy.allowCrossCommunityFabric, false);
  assert.equal(policy.serverTrackedReadState, false);
  assert.equal(policy.interNodeTransport, "gossip");
  assert.deepEqual(evaluatePosture({}), policy);
}

function hostedPrivateOpenMatrix(): void {
  const hosted = evaluatePosture({ posture: "hosted" });
  const priv = evaluatePosture({ posture: "private" });
  const open = evaluatePosture({ posture: "open" });
  const rows: ReadonlyArray<readonly [TrustPosture, PosturePolicy]> = [
    ["hosted", hosted],
    ["private", priv],
    ["open", open],
  ];
  for (const [name, policy] of rows) {
    assert.equal(policy.posture, name);
    assert.equal(policy.allowCrossCommunityFabric, false);
  }
  assert.equal(hosted.allowServiceDiscovery, true);
  assert.equal(hosted.serverTrackedReadState, true);
  assert.equal(hosted.publicArtifactPlane, "atproto");
  assert.equal(priv.publicArtifactPlane, "none");
  assert.equal(priv.allowServiceDiscovery, true);
  assert.equal(open.allowServiceDiscovery, false);
  assert.equal(open.serverTrackedReadState, false);
}

function unknownAndMalformedDeny(): void {
  assert.throws(() => evaluatePosture({ posture: "federated" }), (error: unknown) =>
    error instanceof ProtocolError && error.code === "policy-denied");
  assert.throws(() => evaluatePosture("open"), (error: unknown) =>
    error instanceof ProtocolError && error.code === "policy-denied");
  assert.throws(() => evaluatePosture({ posture: "open", allowCrossCommunityFabric: true }), (error: unknown) =>
    error instanceof ProtocolError && error.code === "policy-denied");
}

function openCannotEnableServiceDiscovery(): void {
  assert.throws(
    () => evaluatePosture({ posture: "open", allowServiceDiscovery: true }),
    (error: unknown) => error instanceof ProtocolError && error.code === "policy-denied",
  );
}

function tomlCommunityPostureTable(): void {
  const doc = parseTomlDocument(`[community.posture]\nposture = "hosted"\nallow_service_discovery = true\n`);
  const policy = evaluatePosture(doc);
  assert.equal(policy.posture, "hosted");
  assert.equal(policy.allowServiceDiscovery, true);
}

function platformCapabilityGates(): void {
  const hosted = createInMemoryPlatformCore({
    posturePolicy: evaluatePosture({ posture: "hosted" }),
  });
  const open = createInMemoryPlatformCore({
    posturePolicy: evaluatePosture({ posture: "open" }),
  });
  assert.equal(hosted.capability("service-discovery").enabled, true);
  assert.equal(hosted.capability("server-tracked-read-state").enabled, true);
  assert.equal(hosted.capability("cross-community-fabric").enabled, false);
  assert.equal(open.capability("service-discovery").enabled, false);
  assert.equal(open.capability("inter-node-transport").enabled, false);
  assert.equal(open.capability("public-artifact-plane").enabled, true);
  for (const key of GATED) {
    assert.equal(typeof hosted.capability(key).enabled, "boolean");
  }
}

function mutationOpenDiscoveryMustFail(): void {
  let threw = false;
  try {
    evaluatePosture({ posture: "open", allowServiceDiscovery: true });
  } catch {
    threw = true;
  }
  assert.equal(threw, true, "mutant that allows open+discovery must fail this test");
}

function boardMastheadBadge(): void {
  const html = readFileSync("packages/Epoch.Community.Web/app/board.html", "utf8");
  const app = readFileSync("packages/Epoch.Community.Web/app/app.js", "utf8");
  const css = readFileSync("packages/Epoch.Community.Web/app/base.css", "utf8");
  assert.ok(html.includes("data-posture-badge"));
  assert.ok(app.includes("function paintPosture"));
  assert.ok(app.includes('posture = "denied"'));
  assert.ok(css.includes(".cw-posture"));
  assert.ok(css.includes('[data-posture="denied"]'));
}
