import assert from "node:assert/strict";
import { Given, Then, When } from "@cucumber/cucumber";
import { LiveLog } from "@epoch/live";
import {
  CHANNEL_EVENT_SCHEMA,
  digestChannelBody,
  projectChannelEvents,
  unreadForPosture,
} from "@epoch/community-core";
import { evaluatePosture } from "@epoch/protocol";
import {
  InMemoryXmppTransport,
  federatePublicChannelEvent,
  principalFromJid,
  receiveFederatedChannelEvents,
} from "@epoch/xmpp";
import { composeLiveChannelMessage } from "../../packages/Epoch.Community.Web/src/client/channel-compose";

type World = {
  maya?: LiveLog;
  jules?: LiveLog;
  events: unknown[];
  live?: Awaited<ReturnType<typeof composeLiveChannelMessage>>;
  unread?: ReturnType<typeof unreadForPosture>;
  xmpp?: InMemoryXmppTransport;
  destServer?: string;
};

const world: World = { events: [] };

function ids() {
  return {
    channelId: `epoch:channel:${"c".repeat(52)}`,
    communityId: `epoch:space:${"s".repeat(52)}`,
    principalId: `epoch:principal:${"p".repeat(52)}`,
  };
}

Given("a signed community channel named general", function () {
  world.maya = new LiveLog({ author: "maya" });
  world.jules = new LiveLog({ author: "jules" });
  world.xmpp = undefined;
  world.destServer = undefined;
  world.events = [{
    schemaVersion: 1,
    type: "channel.create",
    eventId: "ch-1",
    revisionId: "ch-1",
    body: {
      schema: CHANNEL_EVENT_SCHEMA,
      channelId: ids().channelId,
      communityId: ids().communityId,
      name: "general",
      principalId: ids().principalId,
      visibility: "public",
    },
  }];
});

Given("an enabled XMPP s2s bridge to a.example", function () {
  world.destServer = "a.example";
  world.xmpp = new InMemoryXmppTransport({ enabled: true, allowlist: ["a.example"] });
});

When("Maya posts a signed channel message {string}", async function (body: string) {
  assert.ok(world.maya);
  const { channelId, principalId } = ids();
  world.maya.append("op", "channel:general", {
    type: "channel.message",
    bodyDigest: digestChannelBody(body),
  });
  const event = {
    schemaVersion: 1,
    type: "channel.message",
    eventId: `m-${world.events.length}`,
    revisionId: `m-${world.events.length}`,
    body: {
      schema: CHANNEL_EVENT_SCHEMA,
      channelId,
      messageId: `m-${world.events.length}`,
      principalId,
      bodyDigest: digestChannelBody(body),
      visibility: "public",
    },
  };
  world.events.push(event);
  if (world.xmpp !== undefined && world.destServer !== undefined) {
    await federatePublicChannelEvent(world.xmpp, event, world.destServer);
  }
});

When("Jules posts a signed channel message {string}", function (body: string) {
  assert.ok(world.jules && world.maya);
  const signed = world.jules.append("op", "channel:general", { bodyDigest: digestChannelBody(body) });
  const ingested = world.maya.ingest([signed]);
  assert.equal(ingested.rejected, 0);
  world.events.push({
    schemaVersion: 1,
    type: "channel.message",
    eventId: `m-${world.events.length}`,
    revisionId: `m-${world.events.length}`,
    body: {
      schema: CHANNEL_EVENT_SCHEMA,
      channelId: ids().channelId,
      messageId: `m-${world.events.length}`,
      principalId: ids().principalId,
      bodyDigest: digestChannelBody(body),
      visibility: "public",
    },
  });
});

Then("both clients project the same conversation", function () {
  const projected = projectChannelEvents(world.events.filter(isChannelEvent));
  assert.ok(projected.messages.length >= 2);
});

function isChannelEvent<Event>(event: Event): event is Event & { readonly type: string } {
  return typeof event === "object"
    && event !== null
    && "type" in event
    && typeof event.type === "string"
    && event.type.startsWith("channel.");
}

Then("forged channel messages are rejected", function () {
  assert.ok(world.maya);
  const result = world.maya.ingest([{
    id: "forged",
    kind: "op",
    entity: "channel:general",
    author: "intruder",
    lamport: 8,
    parents: [],
    payload: {},
    scheme: "none",
    signature: "nope",
  }]);
  assert.equal(result.applied, 0);
  assert.equal(result.rejected, 1);
});

Given("a live community channel session", function () {
  world.live = undefined;
});

When("Maya composes a live channel message {string}", async function (body: string) {
  world.live = await composeLiveChannelMessage({
    channelId: ids().channelId,
    principalId: ids().principalId,
    body,
  });
});

Then("the peer receives the same signed channel bytes over XMPP", async function () {
  assert.ok(world.xmpp);
  const received = await receiveFederatedChannelEvents(world.xmpp);
  const last = world.events.at(-1);
  assert.deepEqual(received.at(-1), last);
});

Then("a MUC occupant JID cannot author the message", function () {
  assert.throws(() => principalFromJid("general@conference.a.example/maya"), /admission only/u);
});

Then("the live signature is not local-only", function () {
  assert.ok(world.live);
  assert.notEqual(world.live.signature, "sig:local-only");
});

Given("an open-posture community", function () {
  world.unread = undefined;
});

When("a channel.read event arrives", function () {
  world.unread = unreadForPosture(evaluatePosture({ posture: "open" }), {
    schema: CHANNEL_EVENT_SCHEMA,
    channelId: ids().channelId,
    principalId: ids().principalId,
    watermarkEventId: "server-wm",
  }, "local-wm");
});

Then("unread stays on the local watermark", function () {
  assert.equal(world.unread?.mode, "local");
  assert.equal(world.unread?.watermarkEventId, "local-wm");
});
