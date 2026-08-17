import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";

const root = fileURLToPath(new URL("../app/", import.meta.url));

function load(name, window) {
  new Function("window", readFileSync(join(root, name), "utf8"))(window);
}

const window = {};
load("nats-fabric.js", window);

const fabric = window.CW_NATS_FABRIC;
assert.ok(fabric);

fabric.reset();

// Guest never attaches to broad fabric — even with endpoint configured.
const guest = { kind: "guest", principalId: "guest_local", anonymous: true };
const guestDecision = fabric.evaluateHandoff(guest, { endpoint: "wss://nats.example/ws" });
assert.equal(guestDecision.attach, false);
assert.equal(guestDecision.status, "needs-sign-in");
assert.match(guestDecision.message, /realtime requires sign-in/);

const guestResult = await fabric.attach(guest, { endpoint: "wss://nats.example/ws" });
assert.equal(guestResult.attached, false);
assert.equal(guestResult.openChat, false);
assert.equal(guestResult.status, "needs-sign-in");
assert.equal(fabric.status().opened, false);
assert.equal(fabric.status().hasSecret, false);
assert.match(fabric.statusLabel(), /realtime requires sign-in/);

// No endpoint → idle, no fake connected claim.
fabric.reset();
const idle = await fabric.attach({ kind: "atproto", principalId: "did:plc:x", platformSessionId: "session_1" }, {});
assert.equal(idle.attached, false);
assert.equal(idle.status, "idle");
assert.equal(idle.openChat, false);

// Signed-in + Platform session + mint + connect → online (mocked).
fabric.reset();
let mintCalls = 0;
let connectCalls = 0;
const signedIn = {
  kind: "atproto",
  principalId: "did:plc:lea",
  platformSessionId: "session_42",
  anonymous: false,
};
const ok = await fabric.attach(signedIn, {
  endpoint: "wss://nats.example/ws",
  repoId: "civic",
  mintFabricCredential: (input) => {
    mintCalls += 1;
    assert.equal(input.sessionId, "session_42");
    return { id: "fabric_1", secret: "opaque-fabric-secret", expiresAt: Date.now() + 60_000 };
  },
  connect: async (opts) => {
    connectCalls += 1;
    assert.equal(opts.fabricSecret, "opaque-fabric-secret");
    assert.equal(opts.repoId, "civic");
    assert.notEqual(opts.fabricSecret, signedIn.principalId);
    assert.notEqual(opts.fabricSecret, signedIn.platformSessionId);
    return { channel: true };
  },
});
assert.equal(ok.attached, true);
assert.equal(ok.status, "online");
assert.equal(ok.openChat, false);
assert.equal(mintCalls, 1);
assert.equal(connectCalls, 1);
assert.equal(fabric.status().opened, true);
assert.equal(fabric.status().hasSecret, true);

// Bad mint / connect → denied, still no chat open.
fabric.reset();
const denied = await fabric.attach(signedIn, {
  endpoint: "wss://nats.example/ws",
  mintFabricCredential: () => {
    throw new Error("revoked");
  },
  connect: async () => {
    throw new Error("should not connect");
  },
});
assert.equal(denied.attached, false);
assert.equal(denied.status, "denied");
assert.equal(denied.openChat, false);

// Claimed without Platform ticket source → honest sign-in requirement.
fabric.reset();
const claimedOnly = await fabric.attach(
  { kind: "claimed", principalId: "user_local", handle: "lea" },
  { endpoint: "wss://nats.example/ws" },
);
assert.equal(claimedOnly.attached, false);
assert.equal(claimedOnly.status, "needs-sign-in");
assert.equal(claimedOnly.openChat, false);

// Mint alone without Platform parent → still no attach.
fabric.reset();
const mintOnly = fabric.evaluateHandoff(
  { kind: "atproto", principalId: "did:plc:x" },
  {
    endpoint: "wss://nats.example/ws",
    mintFabricCredential: () => ({ secret: "x" }),
  },
);
assert.equal(mintOnly.attach, false);
assert.equal(mintOnly.status, "needs-sign-in");

// Guest cannot bypass via forged platformSessionId.
fabric.reset();
const forgedGuest = await fabric.attach(
  {
    kind: "guest",
    principalId: "guest_local",
    anonymous: true,
    platformSessionId: "session_forged",
    fabricSecret: "looks-real",
  },
  {
    endpoint: "wss://nats.example/ws",
    connect: async () => {
      throw new Error("guest must not connect");
    },
  },
);
assert.equal(forgedGuest.attached, false);
assert.equal(forgedGuest.status, "needs-sign-in");
assert.equal(forgedGuest.openChat, false);

// Pre-minted secret equal to session id is rejected.
fabric.reset();
const idAsSecret = await fabric.attach(
  {
    kind: "atproto",
    principalId: "did:plc:lea",
    platformSessionId: "session_42",
    fabricSecret: "session_42",
  },
  {
    endpoint: "wss://nats.example/ws",
    connect: async () => ({ ok: true }),
  },
);
assert.equal(idAsSecret.attached, false);
assert.equal(idAsSecret.status, "denied");
assert.equal(idAsSecret.openChat, false);
assert.equal("fabricSecret" in idAsSecret, false);

// Connect-not-wired path must not leak secret on the result object.
fabric.reset();
const pending = await fabric.attach(signedIn, {
  endpoint: "wss://nats.example/ws",
  mintFabricCredential: () => ({ id: "f", secret: "opaque-only-in-state" }),
});
assert.equal(pending.status, "offline");
assert.equal(pending.attached, false);
assert.equal("fabricSecret" in pending, false);
assert.equal(fabric.status().hasSecret, true);

// Whitespace endpoint is treated as unconfigured.
fabric.reset();
const blankEndpoint = fabric.evaluateHandoff(signedIn, { endpoint: "   " });
assert.equal(blankEndpoint.attach, false);
assert.equal(blankEndpoint.status, "idle");

console.log("Community Web NATS fabric handoff tests passed");
