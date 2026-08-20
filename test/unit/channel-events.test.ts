import assert from "node:assert/strict";
import { LiveLog } from "@epoch/live";
import { assertProtocolEvent, evaluatePosture } from "@epoch/protocol";
import {
  CHANNEL_EVENT_SCHEMA,
  digestChannelBody,
  projectChannelEvents,
  queuePreservesWatermark,
  sanitizeChannelLivestreamEnvelope,
  unreadForPosture,
} from "@epoch/community-core";
import { composeLiveChannelMessage } from "../../packages/Epoch.Community.Web/src/client/channel-compose";

export async function runChannelEventTests(): Promise<void> {
  protocolKindsRoundTrip();
  signedConversationProjects();
  ingestRejectsForgery();
  livestreamDropsSecrets();
  unreadPostureGating();
  queueDoesNotStealWatermark();
  await liveComposerNeverLocalOnly();
}

function protocolKindsRoundTrip(): void {
  const create = {
    schemaVersion: 1 as const,
    type: "channel.create" as const,
    eventId: "ch-create-1",
    revisionId: "ch-create-1",
    body: {
      schema: CHANNEL_EVENT_SCHEMA,
      channelId: id("channel"),
      communityId: id("space"),
      name: "general",
      principalId: id("principal"),
      visibility: "public" as const,
    },
  };
  assert.deepEqual(assertProtocolEvent(create), create);
}

function signedConversationProjects(): void {
  const maya = new LiveLog({ author: "maya" });
  const jules = new LiveLog({ author: "jules" });
  const first = maya.append("op", "channel:general", {
    type: "channel.message",
    schema: CHANNEL_EVENT_SCHEMA,
    channelId: id("channel"),
    messageId: "m1",
    principalId: id("principal"),
    bodyDigest: digestChannelBody("hello"),
    visibility: "public",
  });
  const ingested = jules.ingest([first]);
  assert.equal(ingested.applied, 1);
  const matchesProtocolContract = [{
    schemaVersion: 1 as const,
    type: "channel.message" as const,
    eventId: "m1",
    revisionId: "m1",
    body: {
      schema: CHANNEL_EVENT_SCHEMA,
      channelId: id("channel"),
      messageId: "m1",
      principalId: id("principal"),
      bodyDigest: digestChannelBody("hello"),
      visibility: "public" as const,
    },
  }];
  const projected = projectChannelEvents(matchesProtocolContract);
  assert.equal(projected.messages.length, 1);
  assert.equal(projected.messages[0]?.domain.value.authorId, id("principal"));
}

function ingestRejectsForgery(): void {
  const log = new LiveLog({ author: "maya" });
  const forged = {
    id: "deadbeef",
    kind: "op" as const,
    entity: "channel:general",
    author: "maya",
    lamport: 1,
    // SAFETY: Runtime checks or construction above establish string[].
    parents: [] as string[],
    payload: { type: "channel.message" },
    scheme: "not-a-scheme",
    signature: "forged",
  };
  const result = log.ingest([forged]);
  assert.equal(result.rejected, 1);
  assert.equal(result.applied, 0);
}

function livestreamDropsSecrets(): void {
  const dropped = sanitizeChannelLivestreamEnvelope({
    visibility: "public",
    channelId: id("channel"),
    messageId: "m1",
    body: "token",
    secret: "super-secret",
  });
  assert.equal(dropped.kind, "drop");
  const privateDrop = sanitizeChannelLivestreamEnvelope({
    visibility: "private",
    channelId: id("channel"),
    messageId: "m2",
    body: "n",
  });
  assert.equal(privateDrop.kind, "drop");
  const emitted = sanitizeChannelLivestreamEnvelope({
    visibility: "public",
    channelId: id("channel"),
    messageId: "m3",
    body: "hello",
  });
  assert.equal(emitted.kind, "emit");
  if (emitted.kind === "emit") {
    assert.equal("body" in emitted.envelope, false);
    assert.equal(emitted.envelope.bodyDigest, digestChannelBody("hello"));
  }
}

function unreadPostureGating(): void {
  const hosted = unreadForPosture(evaluatePosture({ posture: "hosted" }), {
    schema: CHANNEL_EVENT_SCHEMA,
    channelId: id("channel"),
    principalId: id("principal"),
    watermarkEventId: "m1",
  }, "local");
  assert.equal(hosted.mode, "server");
  const open = unreadForPosture(evaluatePosture({ posture: "open" }), {
    schema: CHANNEL_EVENT_SCHEMA,
    channelId: id("channel"),
    principalId: id("principal"),
    watermarkEventId: "m1",
  }, "local-wm");
  assert.equal(open.mode, "local");
  assert.equal(open.watermarkEventId, "local-wm");
}

function queueDoesNotStealWatermark(): void {
  const queued = queuePreservesWatermark("m1", ["m2", "m3"]);
  assert.equal(queued.watermarkEventId, "m1");
  assert.deepEqual([...queued.unreadIds], ["m2", "m3"]);
}

async function liveComposerNeverLocalOnly(): Promise<void> {
  const signed = await composeLiveChannelMessage({
    channelId: id("channel"),
    principalId: id("principal"),
    body: "signed hello",
  });
  assert.notEqual(signed.signature, "sig:local-only");
  assert.match(signed.signature, /^sha256:[a-f0-9]{64}$/u);
  assert.equal(signed.scheme, "epoch.channel.integrity/v1");
}

function id(kind: string, token = "a"): string {
  return `epoch:${kind}:${token.repeat(52).slice(0, 52)}`;
}
