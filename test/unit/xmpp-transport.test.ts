import assert from "node:assert/strict";
import {
  CHANNEL_EVENT_SCHEMA,
  digestChannelBody,
} from "@epoch/community-core";
import {
  InMemoryXmppTransport,
  PrivatePublishError,
  XMPP_FIDELITY_STATEMENT,
  conferenceRoutingJid,
  createXmppTransport,
  decodeChannelFanout,
  dialbackTrustLevel,
  encodeChannelFanout,
  federatePublicChannelEvent,
  principalFromJid,
  receiveFederatedChannelEvents,
} from "@epoch/xmpp";
import { composeLiveChannelMessage } from "../../packages/Epoch.Community.Web/src/client/channel-compose";
import { encodeLiveChannelFanout, federateComposedChannelIfEnabled } from "../../packages/Epoch.Community.Web/src/client/channel-federate";

const ids = {
  channelId: `epoch:channel:${"c".repeat(52)}`,
  principalId: `epoch:principal:${"p".repeat(52)}`,
};

export async function runXmppTransportTests(): Promise<void> {
  defaultOff();
  privatePublishDenied();
  await unknownServerDenied();
  jidNeverAuthors();
  dialbackIsReducedTrust();
  await bytesRoundTrip();
  conferenceJidIsRoutingNotOccupancy();
  await publicChannelFanoutRoundTrips();
  await privateChannelFanoutDenied();
  await readEventsDoNotFanout();
  await liveComposerFanoutLockstep();
}

function defaultOff(): void {
  assert.equal(XMPP_FIDELITY_STATEMENT.defaultEnabled, false);
  assert.equal(XMPP_FIDELITY_STATEMENT.phrase, "Epoch-native with optional bridges");
  assert.ok(XMPP_FIDELITY_STATEMENT.xeps.refused.includes("XEP-0045"));
  assert.equal(XMPP_FIDELITY_STATEMENT.channelRouting, "conference-jid-labels-not-muc-occupancy");
}

function privatePublishDenied(): void {
  const transport = createXmppTransport({ enabled: true });
  assert.throws(() => transport.assertPublic("private"), (error: unknown) => error instanceof PrivatePublishError);
  assert.throws(() => transport.assertPublic("shared"), (error: unknown) => error instanceof PrivatePublishError);
}

async function unknownServerDenied(): Promise<void> {
  const transport = new InMemoryXmppTransport({ enabled: true, allowlist: ["a.example"], closedRing: true });
  await assert.rejects(() => transport.send(new Uint8Array([1]), "b.example"), /denied/u);
}

function jidNeverAuthors(): void {
  assert.throws(() => principalFromJid("maya@a.example"), /admission only/u);
  assert.throws(() => principalFromJid("room@conference.a.example/maya"), /admission only/u);
}

function dialbackIsReducedTrust(): void {
  assert.equal(dialbackTrustLevel("dialback"), "reduced");
  assert.equal(dialbackTrustLevel("sasl-external"), "full");
}

async function bytesRoundTrip(): Promise<void> {
  const transport = new InMemoryXmppTransport({ enabled: true, allowlist: ["a.example"] });
  await transport.send(Uint8Array.from([9, 8, 7]), "a.example");
  const out: number[] = [];
  for await (const bytes of transport.receive()) out.push(...bytes);
  assert.deepEqual(out, [9, 8, 7]);
}

function conferenceJidIsRoutingNotOccupancy(): void {
  const jid = conferenceRoutingJid(ids.channelId, "a.example");
  assert.match(jid, /^ch[0-9a-f]+@conference\.a\.example$/u);
  assert.notEqual(jid, ids.channelId);
}

async function publicChannelFanoutRoundTrips(): Promise<void> {
  const transport = new InMemoryXmppTransport({ enabled: true, allowlist: ["a.example"] });
  const event = publicMessage("ship the posture badge");
  await federatePublicChannelEvent(transport, { ...event, scheme: "epoch.channel.integrity/v1", signature: "sha256:dead" }, "a.example");
  const received = await receiveFederatedChannelEvents(transport);
  assert.deepEqual(received, [event]);
  const bytes: Uint8Array[] = [];
  for await (const chunk of transport.receive()) bytes.push(chunk);
  const envelope = decodeChannelFanout(bytes[0] ?? new Uint8Array());
  assert.equal(envelope.routing.jid, conferenceRoutingJid(ids.channelId, "a.example"));
}

async function privateChannelFanoutDenied(): Promise<void> {
  const transport = new InMemoryXmppTransport({ enabled: true, allowlist: ["a.example"] });
  const event = publicMessage("secret");
  const privateEvent = {
    ...event,
    body: { ...event.body, visibility: "private" as const },
  };
  await assert.rejects(
    () => federatePublicChannelEvent(transport, privateEvent, "a.example"),
    (error: unknown) => error instanceof PrivatePublishError,
  );
}

async function readEventsDoNotFanout(): Promise<void> {
  const transport = new InMemoryXmppTransport({ enabled: true, allowlist: ["a.example"] });
  await assert.rejects(
    () => federatePublicChannelEvent(transport, {
      schemaVersion: 1,
      type: "channel.read",
      eventId: "read-1",
      revisionId: "read-1",
      body: {
        schema: CHANNEL_EVENT_SCHEMA,
        channelId: ids.channelId,
        principalId: ids.principalId,
        watermarkEventId: "wm-1",
      },
    }, "a.example"),
    /does not federate/u,
  );
}

async function liveComposerFanoutLockstep(): Promise<void> {
  const signed = await composeLiveChannelMessage({
    channelId: ids.channelId,
    principalId: ids.principalId,
    body: "queue rule holds",
  });
  const protocol = {
    schemaVersion: signed.schemaVersion,
    type: signed.type,
    eventId: signed.eventId,
    revisionId: signed.revisionId,
    body: signed.body,
  };
  assert.deepEqual(
    [...encodeLiveChannelFanout(signed, "a.example")],
    [...encodeChannelFanout(protocol, "a.example", ids.channelId)],
  );

  const transport = new InMemoryXmppTransport({ enabled: true, allowlist: ["a.example"] });
  const previous = (globalThis as { epochXmppFanout?: unknown }).epochXmppFanout;
  (globalThis as { epochXmppFanout?: unknown }).epochXmppFanout = {
    destServer: "a.example",
    send: (bytes: Uint8Array, dest: string) => transport.send(bytes, dest),
    assertPublic: (visibility: string) => transport.assertPublic(visibility),
  };
  try {
    await federateComposedChannelIfEnabled(signed);
    const received = await receiveFederatedChannelEvents(transport);
    assert.equal(received.length, 1);
    assert.equal(received[0]?.eventId, signed.eventId);
  } finally {
    (globalThis as { epochXmppFanout?: unknown }).epochXmppFanout = previous;
  }
}

function publicMessage(body: string) {
  return {
    schemaVersion: 1 as const,
    type: "channel.message" as const,
    eventId: "m1",
    revisionId: "m1",
    body: {
      schema: CHANNEL_EVENT_SCHEMA,
      channelId: ids.channelId,
      messageId: "m1",
      principalId: ids.principalId,
      bodyDigest: digestChannelBody(body),
      visibility: "public" as const,
    },
  };
}
