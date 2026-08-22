import assert from "node:assert/strict";
import test from "node:test";
import {
  captionsGateAllowsStart,
  createDisabledLiveCaptionProvider,
  createDisabledLiveMediaProvider,
  createFakeLiveCaptionProvider,
  createFakeLiveMediaProvider,
  evaluateLiveMediaMode,
} from "../dist/live/media-provider.js";

function fakeClock(startMs = 1_000) {
  let now = startMs;
  return { now: () => now, advance: (ms) => { now += ms; } };
}

test("disabled provider reports honest readiness and refuses every operation without crashing", async () => {
  const provider = createDisabledLiveMediaProvider();
  const readiness = await provider.readiness();
  assert.equal(readiness.ready, false);
  assert.equal(readiness.label, "provider-disabled");
  assert.equal(readiness.recording, "provider-disabled");
  const room = await provider.createRoom({ sessionId: "s1", securityMode: "public-broadcast", operationId: "op1" });
  assert.equal(room.outcome, "failed");
  const token = await provider.issueParticipantToken({
    sessionId: "s1", roomRef: "r1", participantRef: "p1",
    canSubscribe: true, publishSources: [], ttlSeconds: 300, operationId: "op2",
  });
  assert.equal(token.outcome, "refused");
  assert.equal(token.token, undefined);
  const webhook = await provider.verifyWebhook({ rawBody: "{}", signature: "x", contentType: "application/webhook+json" });
  assert.equal(webhook.outcome, "rejected");
});

test("security-mode compatibility refuses recording, egress, and transcription under E2EE", () => {
  assert.equal(evaluateLiveMediaMode({
    securityMode: "private-recordable", recording: true, externalEgress: false, serverTranscription: true,
  }).kind, "compatible");
  const refused = evaluateLiveMediaMode({
    securityMode: "private-e2ee", recording: true, externalEgress: true, serverTranscription: true,
  });
  assert.equal(refused.kind, "refused");
  assert.equal(refused.reasons.length, 3);
  const semantic = evaluateLiveMediaMode({
    securityMode: "semantic-only", recording: true, externalEgress: false, serverTranscription: false,
  });
  assert.equal(semantic.kind, "refused");
});

test("caption gate blocks public synchronized media without a ready caption provider", async () => {
  const disabled = await createDisabledLiveCaptionProvider().readiness();
  assert.equal(disabled.label, "provider-disabled");
  const blocked = captionsGateAllowsStart({
    securityMode: "public-broadcast", mediaEnabled: true, captionReadiness: disabled,
  });
  assert.equal(blocked.allowed, false);
  assert.match(blocked.reason, /captions/u);
  const ready = await createFakeLiveCaptionProvider({ ready: true }).readiness();
  assert.equal(captionsGateAllowsStart({
    securityMode: "public-broadcast", mediaEnabled: true, captionReadiness: ready,
  }).allowed, true);
  // Semantic-only sessions never hit the caption gate.
  assert.equal(captionsGateAllowsStart({
    securityMode: "semantic-only", mediaEnabled: false, captionReadiness: disabled,
  }).allowed, true);
});

test("fake provider issues least-privilege tokens bound to one room, session, and short TTL", async () => {
  const clock = fakeClock();
  const provider = createFakeLiveMediaProvider({ now: clock.now });
  const room = await provider.createRoom({ sessionId: "s1", securityMode: "private-recordable", operationId: "room1" });
  assert.equal(room.outcome, "created");
  const spectator = await provider.issueParticipantToken({
    sessionId: "s1", roomRef: room.roomRef, participantRef: "p-spec",
    canSubscribe: true, publishSources: [], ttlSeconds: 300, operationId: "tok1",
  });
  assert.equal(spectator.outcome, "issued");
  assert.match(spectator.token, /subscribe/u);
  assert.equal(spectator.expiresAtMs, clock.now() + 300_000);
  // Cross-session token requests are refused even with a real room ref.
  const crossSession = await provider.issueParticipantToken({
    sessionId: "s2", roomRef: room.roomRef, participantRef: "p-x",
    canSubscribe: true, publishSources: [], ttlSeconds: 300, operationId: "tok2",
  });
  assert.equal(crossSession.outcome, "refused");
  // TTLs beyond the bound are refused rather than clamped silently.
  const longTtl = await provider.issueParticipantToken({
    sessionId: "s1", roomRef: room.roomRef, participantRef: "p-long",
    canSubscribe: true, publishSources: [], ttlSeconds: 86_400, operationId: "tok3",
  });
  assert.equal(longTtl.outcome, "refused");
  const unknownRoom = await provider.issueParticipantToken({
    sessionId: "s1", roomRef: "no-such-room", participantRef: "p-y",
    canSubscribe: true, publishSources: [], ttlSeconds: 300, operationId: "tok4",
  });
  assert.equal(unknownRoom.outcome, "refused");
});

test("fake provider operations are idempotent by operation id and honest about failures", async () => {
  const clock = fakeClock();
  const provider = createFakeLiveMediaProvider({ now: clock.now });
  const room = await provider.createRoom({ sessionId: "s1", securityMode: "private-recordable", operationId: "room1" });
  const first = await provider.removeParticipant({
    sessionId: "s1", roomRef: room.roomRef, participantRef: "p1", operationId: "rm1",
  });
  assert.equal(first.outcome, "applied");
  const replay = await provider.removeParticipant({
    sessionId: "s1", roomRef: room.roomRef, participantRef: "p1", operationId: "rm1",
  });
  assert.equal(replay.outcome, "duplicate");
  assert.equal(provider.calls.filter((call) => call.operationId === "rm1").length, 2);

  const failing = createFakeLiveMediaProvider({ now: clock.now, failures: ["recording-failure", "unavailable"] });
  const readiness = await failing.readiness();
  assert.equal(readiness.ready, false);
  assert.equal(readiness.label, "unavailable");
  const failingRoom = await failing.createRoom({ sessionId: "s1", securityMode: "private-recordable", operationId: "r1" });
  const recording = await failing.startRecording({ sessionId: "s1", roomRef: failingRoom.roomRef, operationId: "rec1" });
  assert.equal(recording.outcome, "failed");
});

test("fake egress refuses raw destinations and accepts only opaque egress references", async () => {
  const clock = fakeClock();
  const provider = createFakeLiveMediaProvider({ now: clock.now });
  const room = await provider.createRoom({ sessionId: "s1", securityMode: "public-broadcast", operationId: "room1" });
  const raw = await provider.startEgress({
    sessionId: "s1", roomRef: room.roomRef, operationId: "eg1",
    destinationRef: "rtmp://attacker.example/stream",
  });
  assert.equal(raw.outcome, "refused");
  const opaque = await provider.startEgress({
    sessionId: "s1", roomRef: room.roomRef, operationId: "eg2",
    destinationRef: "egress-ref:primary",
  });
  assert.equal(opaque.outcome, "applied");
});

test("fake webhook verification enforces content type, size, signature, room binding, and dedup", async () => {
  const clock = fakeClock();
  const provider = createFakeLiveMediaProvider({ now: clock.now, webhookSecret: "hook" });
  const room = await provider.createRoom({ sessionId: "s1", securityMode: "private-recordable", operationId: "room1" });
  const body = JSON.stringify({ event: "participant_joined", roomRef: room.roomRef });
  const signature = `fake-signature:hook:${body.length}`;
  assert.equal((await provider.verifyWebhook({ rawBody: body, signature, contentType: "text/plain" })).outcome, "rejected");
  assert.equal((await provider.verifyWebhook({ rawBody: body, signature: "forged", contentType: "application/webhook+json" })).outcome, "rejected");
  const verified = await provider.verifyWebhook({ rawBody: body, signature, contentType: "application/webhook+json" });
  assert.equal(verified.outcome, "verified");
  assert.equal(verified.roomRef, room.roomRef);
  const duplicate = await provider.verifyWebhook({ rawBody: body, signature, contentType: "application/webhook+json" });
  assert.equal(duplicate.outcome, "duplicate");
  const unknownRoom = JSON.stringify({ event: "participant_joined", roomRef: "not-a-room" });
  assert.equal((await provider.verifyWebhook({
    rawBody: unknownRoom, signature: `fake-signature:hook:${unknownRoom.length}`, contentType: "application/webhook+json",
  })).outcome, "rejected");
});
