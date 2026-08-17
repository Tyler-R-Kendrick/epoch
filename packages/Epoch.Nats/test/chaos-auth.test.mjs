/**
 * Chaos / fault-injection for complementary NATS auth (ADR-0054).
 * Injects hang, revoke-after-mint, malformed AUTH payloads, and concurrent gates.
 */
import assert from "node:assert/strict";
import { Buffer } from "node:buffer";
import { setTimeout as delay } from "node:timers/promises";
import { test } from "node:test";
import {
  AUTH_CALLOUT_SUBJECT,
  attachAuthCalloutService,
  connectGatedNatsBus,
  createAuthCalloutHandler,
  createInMemoryNatsBus,
  createPlatformAuthValidator,
  evaluateAuthCallout,
  openAuthenticatedNatsLiveChannel,
} from "../dist/index.js";

test("chaos: callout hang fails closed with deny", async () => {
  const bus = createInMemoryNatsBus();
  const hanging = () => new Promise(() => {});
  const svc = attachAuthCalloutService(bus, hanging, { timeoutMs: 40 });
  const reply = await bus.request(
    AUTH_CALLOUT_SUBJECT,
    JSON.stringify({ authToken: "anything" }),
    { timeout: 500 },
  );
  const body = JSON.parse(Buffer.from(reply.data).toString("utf8"));
  assert.equal(body.type, "deny");
  assert.match(body.reason || "", /timeout/i);
  svc.stop();
  bus.close();
});

test("chaos: malformed AUTH JSON fails closed", async () => {
  const bus = createInMemoryNatsBus();
  const handler = createAuthCalloutHandler(createPlatformAuthValidator({
    verifyFabricCredential: () => ({
      id: "x",
      kind: "session",
      subjectRef: "u",
      scopes: ["fabric:human"],
      expiresAt: Date.now() + 60_000,
    }),
  }));
  const svc = attachAuthCalloutService(bus, handler, { timeoutMs: 200 });
  const reply = await bus.request(AUTH_CALLOUT_SUBJECT, "{not-json", { timeout: 500 });
  const body = JSON.parse(Buffer.from(reply.data).toString("utf8"));
  assert.equal(body.type, "deny");
  svc.stop();
  bus.close();
});

test("chaos: revoke flips allow to deny for the same secret", async () => {
  let revoked = false;
  const secret = "chaos-secret";
  const validator = createPlatformAuthValidator({
    verifyFabricCredential: (presented) => {
      if (presented !== secret || revoked) return null;
      return {
        id: "c1",
        kind: "session",
        subjectRef: "user:chaos",
        scopes: ["fabric:human"],
        expiresAt: Date.now() + 60_000,
      };
    },
  });
  assert.equal((await evaluateAuthCallout({ authToken: secret }, validator)).type, "allow");
  revoked = true;
  assert.equal((await evaluateAuthCallout({ authToken: secret }, validator)).type, "deny");
});

test("chaos: concurrent gated connects with mixed secrets", async () => {
  const shared = createInMemoryNatsBus();
  const validator = createPlatformAuthValidator({
    verifyFabricCredential: (secret) => {
      if (secret !== "ok") return null;
      return {
        id: "c",
        kind: "session",
        subjectRef: "user",
        scopes: ["fabric:human"],
        expiresAt: Date.now() + 60_000,
      };
    },
  });
  const handler = createAuthCalloutHandler(validator);
  const gate = async (token) => (await handler({ authToken: token })).type === "allow";

  const results = await Promise.allSettled([
    connectGatedNatsBus(() => shared, gate, "ok"),
    connectGatedNatsBus(() => shared, gate, "bad"),
    connectGatedNatsBus(() => shared, gate, "ok"),
    connectGatedNatsBus(() => shared, gate, ""),
    openAuthenticatedNatsLiveChannel({
      repoId: "chaos",
      fabricSecret: "bad",
      connect: (secret) => connectGatedNatsBus(() => shared, gate, secret),
    }),
  ]);

  assert.equal(results[0].status, "fulfilled");
  assert.equal(results[1].status, "rejected");
  assert.equal(results[2].status, "fulfilled");
  assert.equal(results[3].status, "rejected");
  assert.equal(results[4].status, "rejected");
  shared.close();
});

test("chaos: AUTH subject without reply is ignored safely", async () => {
  const bus = createInMemoryNatsBus();
  let handlerCalls = 0;
  const svc = attachAuthCalloutService(bus, async () => {
    handlerCalls += 1;
    return { type: "allow", user: "x", permissions: { publish: ["epoch.live.>"], subscribe: ["epoch.live.>"] } };
  });
  // publish without reply inbox — must not throw
  bus.publish(AUTH_CALLOUT_SUBJECT, JSON.stringify({ authToken: "ok" }));
  await delay(20);
  assert.equal(handlerCalls, 0, "messages without reply must not invoke allow path side effects via reply");
  // With reply, handler runs
  const reply = await bus.request(AUTH_CALLOUT_SUBJECT, JSON.stringify({ authToken: "ok" }), { timeout: 500 });
  const body = JSON.parse(Buffer.from(reply.data).toString("utf8"));
  assert.equal(body.type, "allow");
  assert.equal(handlerCalls, 1);
  svc.stop();
  bus.close();
});
