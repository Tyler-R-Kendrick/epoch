import assert from "node:assert/strict";
import test from "node:test";
import { createLiveKitMediaProvider, opaqueRoomName, sanitizeProviderError } from "../dist/index.js";

const CONFIG = {
  url: "wss://livekit.epoch.test",
  apiKey: "APIfakekey",
  apiSecret: "super-secret-value",
};

/** Decode a JWT body without verifying: the test inspects what was granted. */
function claims(jwt) {
  return JSON.parse(Buffer.from(jwt.split(".")[1], "base64url").toString("utf8"));
}

/**
 * Test doubles for every network-touching client. The access-token factory is
 * deliberately NOT doubled in the grant tests: those use the real SDK so the
 * assertions are about bytes LiveKit would actually receive.
 */
function doubles(overrides = {}) {
  const calls = [];
  return {
    calls,
    factory: {
      trackSources: overrides.trackSources ?? (async (names) => {
        const protocol = await import("@livekit/protocol");
        return names.map((name) => protocol.TrackSource[name.toUpperCase()]);
      }),
      accessToken: overrides.accessToken ?? (async (input) => {
        const { AccessToken } = await import("livekit-server-sdk");
        return new AccessToken(input.apiKey, input.apiSecret, {
          identity: input.identity,
          ttl: input.ttlSeconds,
        });
      }),
      roomClient: overrides.roomClient ?? (() => ({
        createRoom: async (input) => { calls.push(["createRoom", input.name]); return { name: input.name }; },
        removeParticipant: async (room, identity) => { calls.push(["removeParticipant", room, identity]); },
        deleteRoom: async (room) => { calls.push(["deleteRoom", room]); },
      })),
      egressClient: overrides.egressClient ?? (() => ({
        startRoomCompositeEgress: async (room, output) => {
          calls.push(["startEgress", room, output.destinationRef]);
          return { egressId: "eg-1" };
        },
        stopEgress: async (id) => { calls.push(["stopEgress", id]); },
      })),
      webhookReceiver: overrides.webhookReceiver ?? (() => ({
        receive: async () => ({ event: "participant_joined", id: "evt-1", room: { name: opaqueRoomName("sess-1") } }),
      })),
    },
  };
}

function provider(config = CONFIG, overrides = {}) {
  const stubs = doubles(overrides);
  return {
    stubs,
    instance: createLiveKitMediaProvider({ config, now: () => 1_000_000, clients: stubs.factory }),
  };
}

test("readiness distinguishes missing, partial, and complete configuration honestly", async () => {
  const missing = await createLiveKitMediaProvider({ config: {}, now: () => 0 }).readiness();
  assert.equal(missing.ready, false);
  assert.equal(missing.label, "provider-disabled");

  const partial = await createLiveKitMediaProvider({
    config: { url: CONFIG.url, apiKey: CONFIG.apiKey },
    now: () => 0,
  }).readiness();
  assert.equal(partial.ready, false);
  assert.equal(partial.label, "unavailable");
  assert.match(partial.reason, /incomplete/u);

  const complete = await provider().instance.readiness();
  assert.equal(complete.ready, true);
  // The adapter has never been validated against a live deployment here, so it
  // must not claim production.
  assert.equal(complete.label, "experimental");
  assert.equal(complete.recording, "unavailable", "egress is unavailable until an operator deploys it");
});

test("partial credentials refuse every operation instead of falling back", async () => {
  const partial = createLiveKitMediaProvider({
    config: { url: CONFIG.url, apiKey: CONFIG.apiKey },
    now: () => 0,
  });
  assert.equal((await partial.createRoom({ sessionId: "s", securityMode: "private-recordable", operationId: "o" })).outcome, "failed");
  assert.equal((await partial.issueParticipantToken({
    sessionId: "s", roomRef: "r", participantRef: "p", canSubscribe: true, publishSources: [], ttlSeconds: 300, operationId: "o",
  })).outcome, "refused");
  assert.equal((await partial.verifyWebhook({ rawBody: "{}", signature: "x", contentType: "application/webhook+json" })).outcome, "rejected");
});

test("room names are opaque digests that leak nothing about the session", async () => {
  const { instance, stubs } = provider();
  const created = await instance.createRoom({ sessionId: "sess-1", securityMode: "private-recordable", operationId: "op-1" });
  assert.equal(created.outcome, "created");
  assert.equal(created.roomRef, opaqueRoomName("sess-1"));
  assert.equal(created.roomRef.includes("sess-1"), false);
  assert.match(created.roomRef, /^epoch-[0-9a-f]{32}$/u);
  assert.deepEqual(stubs.calls[0], ["createRoom", created.roomRef]);

  // Provisioning twice is idempotent rather than stranding a second room.
  const again = await instance.createRoom({ sessionId: "sess-1", securityMode: "private-recordable", operationId: "op-2" });
  assert.equal(again.outcome, "duplicate");
  assert.equal(again.roomRef, created.roomRef);
});

test("issued tokens carry least-privilege grants in the real SDK wire format", async () => {
  const { instance } = provider();
  const room = await instance.createRoom({ sessionId: "sess-1", securityMode: "private-recordable", operationId: "op-1" });

  const spectator = await instance.issueParticipantToken({
    sessionId: "sess-1", roomRef: room.roomRef, participantRef: "livepart_abc",
    canSubscribe: true, publishSources: [], ttlSeconds: 300, operationId: "t1",
  });
  assert.equal(spectator.outcome, "issued");
  const spectatorGrant = claims(spectator.token).video;
  assert.equal(spectatorGrant.roomJoin, true);
  assert.equal(spectatorGrant.canSubscribe, true);
  assert.equal(spectatorGrant.canPublish, false, "a spectator can never publish");
  assert.equal(spectatorGrant.canPublishData, false, "no participant gets the data channel");
  assert.equal(spectatorGrant.canPublishSources, undefined);
  assert.equal(spectatorGrant.roomAdmin, undefined, "roomAdmin never reaches a browser participant");
  assert.equal(spectatorGrant.roomRecord, undefined, "roomRecord never reaches a browser participant");
  assert.equal(spectatorGrant.room, room.roomRef, "the grant is scoped to exactly one room");
  assert.equal(claims(spectator.token).sub, "livepart_abc");

  // A voice collaborator gets the microphone and nothing adjacent to it.
  const voice = await instance.issueParticipantToken({
    sessionId: "sess-1", roomRef: room.roomRef, participantRef: "livepart_def",
    canSubscribe: true, publishSources: ["microphone"], ttlSeconds: 300, operationId: "t2",
  });
  const voiceGrant = claims(voice.token).video;
  assert.equal(voiceGrant.canPublish, true);
  assert.deepEqual(voiceGrant.canPublishSources, ["microphone"]);

  // Camera and screen map to LiveKit's documented source names.
  const screen = await instance.issueParticipantToken({
    sessionId: "sess-1", roomRef: room.roomRef, participantRef: "livepart_ghi",
    canSubscribe: true, publishSources: ["camera", "screen-share", "screen-share-audio"], ttlSeconds: 300, operationId: "t3",
  });
  assert.deepEqual(claims(screen.token).video.canPublishSources, ["camera", "screen_share", "screen_share_audio"]);
});

test("token TTLs are bounded and cross-session requests are refused", async () => {
  const { instance } = provider();
  const room = await instance.createRoom({ sessionId: "sess-1", securityMode: "private-recordable", operationId: "op-1" });

  const tooLong = await instance.issueParticipantToken({
    sessionId: "sess-1", roomRef: room.roomRef, participantRef: "p", canSubscribe: true,
    publishSources: [], ttlSeconds: 86_400, operationId: "t1",
  });
  assert.equal(tooLong.outcome, "refused");
  assert.match(tooLong.reason, /TTL/u);

  const issued = await instance.issueParticipantToken({
    sessionId: "sess-1", roomRef: room.roomRef, participantRef: "p", canSubscribe: true,
    publishSources: [], ttlSeconds: 600, operationId: "t2",
  });
  const payload = claims(issued.token);
  assert.ok(payload.exp - payload.nbf <= 900, "the adapter clamps to its own ceiling regardless of the request");

  // A token for a room bound to another session is not issuable.
  await instance.createRoom({ sessionId: "sess-2", securityMode: "private-recordable", operationId: "op-2" });
  const crossSession = await instance.issueParticipantToken({
    sessionId: "sess-2", roomRef: room.roomRef, participantRef: "p", canSubscribe: true,
    publishSources: [], ttlSeconds: 300, operationId: "t3",
  });
  assert.equal(crossSession.outcome, "refused");
  assert.match(crossSession.reason, /not bound/u);
});

test("egress refuses arbitrary destinations and stays unavailable until deployed", async () => {
  const withoutEgress = provider();
  const room = await withoutEgress.instance.createRoom({ sessionId: "sess-1", securityMode: "public-broadcast", operationId: "op-1" });
  const undeployed = await withoutEgress.instance.startEgress({
    sessionId: "sess-1", roomRef: room.roomRef, operationId: "e1", destinationRef: "egress-ref:primary",
  });
  assert.equal(undeployed.outcome, "refused");
  assert.match(undeployed.reason, /not deployed/u);
  assert.equal((await withoutEgress.instance.startRecording({
    sessionId: "sess-1", roomRef: room.roomRef, operationId: "r1",
  })).outcome, "refused");

  const deployed = provider({ ...CONFIG, egressAvailable: true, egressDestinations: { "egress-ref:primary": "rtmp://internal/live" } });
  const deployedRoom = await deployed.instance.createRoom({ sessionId: "sess-1", securityMode: "public-broadcast", operationId: "op-1" });

  // A caller-supplied URL is not a destination reference and never resolves.
  const injected = await deployed.instance.startEgress({
    sessionId: "sess-1", roomRef: deployedRoom.roomRef, operationId: "e1",
    destinationRef: "rtmp://attacker.example/steal",
  });
  assert.equal(injected.outcome, "refused");
  const unknownRef = await deployed.instance.startEgress({
    sessionId: "sess-1", roomRef: deployedRoom.roomRef, operationId: "e2", destinationRef: "egress-ref:unknown",
  });
  assert.equal(unknownRef.outcome, "refused");

  const approved = await deployed.instance.startEgress({
    sessionId: "sess-1", roomRef: deployedRoom.roomRef, operationId: "e3", destinationRef: "egress-ref:primary",
  });
  assert.equal(approved.outcome, "applied");
  // The operator's real URL was used but never echoed back to the caller.
  assert.equal(JSON.stringify(approved).includes("rtmp://internal/live"), false);
  assert.deepEqual(deployed.stubs.calls.at(-1), ["startEgress", deployedRoom.roomRef, "rtmp://internal/live"]);

  const replay = await deployed.instance.startEgress({
    sessionId: "sess-1", roomRef: deployedRoom.roomRef, operationId: "e3", destinationRef: "egress-ref:primary",
  });
  assert.equal(replay.outcome, "duplicate");
});

test("webhooks verify through the official receiver, bind to a room, and deduplicate", async () => {
  const roomName = opaqueRoomName("sess-1");
  let received = 0;
  const { instance } = provider(CONFIG, {
    webhookReceiver: () => ({
      receive: async (body, auth) => {
        received += 1;
        if (auth !== "valid-jwt") throw new Error(`invalid signature for ${CONFIG.apiSecret}`);
        return { event: "participant_joined", id: `evt-${JSON.parse(body).n}`, room: { name: roomName } };
      },
    }),
  });
  await instance.createRoom({ sessionId: "sess-1", securityMode: "private-recordable", operationId: "op-1" });

  // Wrong content type never reaches the receiver at all.
  const wrongType = await instance.verifyWebhook({ rawBody: '{"n":1}', signature: "valid-jwt", contentType: "application/json" });
  assert.equal(wrongType.outcome, "rejected");
  assert.equal(received, 0);

  const forged = await instance.verifyWebhook({ rawBody: '{"n":1}', signature: "forged", contentType: "application/webhook+json" });
  assert.equal(forged.outcome, "rejected");
  // The rejection reason must not carry the API secret the SDK error quoted.
  assert.equal(forged.reason.includes(CONFIG.apiSecret), false);
  assert.match(forged.reason, /\[redacted\]/u);

  const verified = await instance.verifyWebhook({ rawBody: '{"n":1}', signature: "valid-jwt", contentType: "application/webhook+json" });
  assert.equal(verified.outcome, "verified");
  assert.equal(verified.roomRef, roomName);
  assert.equal(verified.eventKind, "participant_joined");

  const replayed = await instance.verifyWebhook({ rawBody: '{"n":1}', signature: "valid-jwt", contentType: "application/webhook+json" });
  assert.equal(replayed.outcome, "duplicate", "a replayed delivery changes nothing twice");
});

test("webhooks for rooms this deployment does not own are rejected", async () => {
  const { instance } = provider(CONFIG, {
    webhookReceiver: () => ({
      receive: async () => ({ event: "participant_joined", id: "evt-x", room: { name: "someone-elses-room" } }),
    }),
  });
  await instance.createRoom({ sessionId: "sess-1", securityMode: "private-recordable", operationId: "op-1" });
  const foreign = await instance.verifyWebhook({ rawBody: "{}", signature: "valid-jwt", contentType: "application/webhook+json" });
  assert.equal(foreign.outcome, "rejected");
  assert.match(foreign.reason, /unknown room/u);
});

test("participant removal reports provider failure instead of assuming success", async () => {
  const { instance } = provider(CONFIG, {
    roomClient: () => ({
      createRoom: async (input) => ({ name: input.name }),
      removeParticipant: async () => { throw new Error(`503 from https://livekit?key=${CONFIG.apiKey}`); },
      deleteRoom: async () => undefined,
    }),
  });
  const room = await instance.createRoom({ sessionId: "sess-1", securityMode: "private-recordable", operationId: "op-1" });
  const failed = await instance.removeParticipant({
    sessionId: "sess-1", roomRef: room.roomRef, participantRef: "p", operationId: "rm-1",
  });
  assert.equal(failed.outcome, "failed");
  assert.equal(failed.reason.includes(CONFIG.apiKey), false, "a normalized error never carries credentials");
});

test("provider errors are redacted and truncated", () => {
  const secrets = { apiKey: "APIfakekey", apiSecret: "super-secret-value" };
  const message = sanitizeProviderError(new Error(`fail apiKey=APIfakekey secret=super-secret-value ${"x".repeat(400)}`), secrets);
  assert.equal(message.includes("APIfakekey"), false);
  assert.equal(message.includes("super-secret-value"), false);
  assert.ok(message.length <= 200);
  assert.equal(sanitizeProviderError("not an error", secrets), "provider call failed");
});
