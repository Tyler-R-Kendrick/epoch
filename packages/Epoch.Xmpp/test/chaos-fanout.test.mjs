/**
 * Chaos / fault-injection for XMPP channel fanout (ADR-0055).
 * Malformed envelopes, garbage bytes, and mixed-allowlist concurrency fail closed.
 * Occupant JIDs never author. This is not XEP-0045 MUC.
 */
import assert from "node:assert/strict";
import { randomBytes } from "node:crypto";
import { test } from "node:test";
import {
  InMemoryXmppTransport,
  decodeChannelFanout,
  federatePublicChannelEvent,
  principalFromJid,
} from "../dist/index.js";

test("chaos: malformed fanout JSON fails closed", () => {
  assert.throws(() => decodeChannelFanout(Buffer.from("{not-json")), SyntaxError);
});

test("chaos: empty and truncated envelopes fail closed", () => {
  assert.throws(() => decodeChannelFanout(new Uint8Array()), SyntaxError);
  assert.throws(() => decodeChannelFanout(Buffer.from("{}")), /unknown channel fanout schema/u);
  assert.throws(
    () => decodeChannelFanout(Buffer.from(JSON.stringify({
      schema: "epoch.xmpp.channel-fanout/v1",
      routing: { kind: "conference-jid", jid: "not-a-conference" },
      event: {},
    }))),
    /conference JID label/u,
  );
});

test("chaos: random garbage never authors a channel event", () => {
  for (let i = 0; i < 48; i += 1) {
    const junk = randomBytes(1 + (i % 64));
    assert.throws(() => decodeChannelFanout(junk));
  }
});

test("chaos: concurrent unknown-server sends deny without leaking bytes", async () => {
  const transport = new InMemoryXmppTransport({ enabled: true, allowlist: ["a.example"], closedRing: true });
  const results = await Promise.allSettled([
    transport.send(Uint8Array.from([1]), "a.example"),
    transport.send(Uint8Array.from([2]), "evil.example"),
    transport.send(Uint8Array.from([3]), "b.example"),
  ]);
  assert.equal(results.filter((row) => row.status === "fulfilled").length, 1);
  assert.equal(results.filter((row) => row.status === "rejected").length, 2);
  const out = [];
  for await (const bytes of transport.receive()) out.push(...bytes);
  assert.deepEqual(out, [1]);
});

test("chaos: MUC occupant JID cannot author after a denied fanout", async () => {
  const transport = new InMemoryXmppTransport({ enabled: true, allowlist: ["a.example"] });
  await assert.rejects(
    () => federatePublicChannelEvent(transport, { type: "not-a-protocol-event" }, "a.example"),
    /not an object|Unsupported|Unknown protocol/u,
  );
  assert.throws(() => principalFromJid("general@conference.a.example/maya"), /admission only/u);
});
