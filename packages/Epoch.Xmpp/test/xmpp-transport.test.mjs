import assert from "node:assert/strict";
import { test } from "node:test";
import {
  InMemoryXmppTransport,
  PrivatePublishError,
  XMPP_FIDELITY_STATEMENT,
  conferenceRoutingJid,
  createXmppTransport,
  dialbackTrustLevel,
  federatePublicChannelEvent,
  principalFromJid,
  receiveFederatedChannelEvents,
} from "../dist/index.js";

test("xmpp: default off and private publish fails closed", async () => {
  const transport = createXmppTransport();
  assert.equal(XMPP_FIDELITY_STATEMENT.defaultEnabled, false);
  assert.equal(XMPP_FIDELITY_STATEMENT.phrase, "Epoch-native with optional bridges");
  await assert.rejects(() => transport.send(new Uint8Array([1]), "a.example"), /off/u);
  assert.throws(() => transport.assertPublic("private"), (error) => error instanceof PrivatePublishError);
  assert.throws(() => principalFromJid("user@a.example"), /admission only/u);
  assert.throws(() => principalFromJid("room@conference.a.example/nick"), /admission only/u);
  assert.equal(dialbackTrustLevel("dialback"), "reduced");
  assert.equal(dialbackTrustLevel("sasl-external"), "full");
  assert.ok(XMPP_FIDELITY_STATEMENT.xeps.refused.includes("XEP-0045"));
  assert.equal(XMPP_FIDELITY_STATEMENT.channelRouting, "conference-jid-labels-not-muc-occupancy");
});

test("xmpp: unknown server denied; allowlisted bytes pass", async () => {
  const transport = new InMemoryXmppTransport({ enabled: true, allowlist: ["a.example"], closedRing: true });
  await assert.rejects(() => transport.send(new Uint8Array([9]), "b.example"), /denied/u);
  await transport.send(Uint8Array.from([1, 2, 3]), "a.example");
  const received = [];
  for await (const bytes of transport.receive()) received.push(...bytes);
  assert.deepEqual(received, [1, 2, 3]);
});

test("xmpp: public channel events fan out as conference-routed signed bytes", async () => {
  const channelId = `epoch:channel:${"c".repeat(52)}`;
  const event = {
    schemaVersion: 1,
    type: "channel.create",
    eventId: "ch-1",
    revisionId: "ch-1",
    body: {
      schema: "epoch.channel/v1",
      channelId,
      communityId: `epoch:space:${"s".repeat(52)}`,
      name: "general",
      principalId: `epoch:principal:${"p".repeat(52)}`,
      visibility: "public",
    },
  };
  const transport = new InMemoryXmppTransport({ enabled: true, allowlist: ["a.example"] });
  await federatePublicChannelEvent(transport, event, "a.example");
  const received = await receiveFederatedChannelEvents(transport);
  assert.deepEqual(received, [event]);
  assert.match(conferenceRoutingJid(channelId, "a.example"), /@conference\.a\.example$/u);
  assert.notEqual(conferenceRoutingJid(channelId, "a.example"), `${channelId}@a.example`);
});

test("xmpp: channel.read does not federate", async () => {
  const transport = new InMemoryXmppTransport({ enabled: true, allowlist: ["a.example"] });
  await assert.rejects(
    () => federatePublicChannelEvent(transport, {
      schemaVersion: 1,
      type: "channel.read",
      eventId: "read-1",
      revisionId: "read-1",
      body: {
        schema: "epoch.channel/v1",
        channelId: `epoch:channel:${"c".repeat(52)}`,
        principalId: `epoch:principal:${"p".repeat(52)}`,
        watermarkEventId: "wm-1",
      },
    }, "a.example"),
    /does not federate/u,
  );
});
