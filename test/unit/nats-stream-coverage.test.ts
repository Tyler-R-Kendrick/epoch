/**
 * Unit coverage for @epoch/nats JetStream/stream helpers.
 * Kept in the unit suite so c8 attributes hits in-process (workspace package
 * tests under npm -w are unreliable for V8 coverage maps).
 */
import assert from "node:assert/strict";
import {
  EPOCH_NATS_STREAMS,
  MemoryJetStream,
  communityLivestreamSubject,
  createMemoryEpochStreams,
  livePresenceSubject,
  liveSyncSubject,
  platformEventsSubject,
  serviceAdvertiseSubject,
  serviceLookupSubject,
} from "@epoch/nats";

export function runNatsStreamCoverageTests(): void {
  jetstreamPublishReadAndFilter();
  memoryEpochStreamsBootstrap();
  subjectHelpersSanitize();
}

function jetstreamPublishReadAndFilter(): void {
  const stream = new MemoryJetStream("EPOCH_TEST");
  assert.equal(stream.name, "EPOCH_TEST");
  assert.equal(stream.lastSeq, 0);
  assert.equal(stream.publish("epoch.platform.events.audit", "a").seq, 1);
  assert.equal(stream.publish("epoch.platform.events.other", Buffer.from("b"), { k: "v" }).seq, 2);
  assert.equal(stream.lastSeq, 2);
  assert.equal(stream.read().length, 2);
  assert.equal(stream.read({ startSeq: 2 }).length, 1);
  assert.equal(stream.read({ startSeq: 1, maxMessages: 1 }).length, 1);
  assert.equal(stream.read({ subject: "epoch.platform.events.audit" }).length, 1);
  assert.equal(stream.read({ subject: "epoch.platform.events.>" }).length, 2);
  assert.equal(stream.read({ subject: "epoch.platform.events.*" }).length, 2);
}

function memoryEpochStreamsBootstrap(): void {
  const streams = createMemoryEpochStreams();
  assert.equal(streams.size, 4);
  assert.ok(streams.get(EPOCH_NATS_STREAMS.LIVE));
  assert.ok(streams.get(EPOCH_NATS_STREAMS.PLATFORM_EVENTS));
  assert.ok(streams.get(EPOCH_NATS_STREAMS.COMMUNITY_LIVESTREAM));
  assert.ok(streams.get(EPOCH_NATS_STREAMS.SVC));
}

function subjectHelpersSanitize(): void {
  assert.equal(liveSyncSubject("repo"), "epoch.live.repo.sync");
  assert.equal(livePresenceSubject("repo"), "epoch.live.repo.presence");
  assert.equal(platformEventsSubject("audit"), "epoch.platform.events.audit");
  assert.equal(platformEventsSubject(""), "epoch.platform.events.default");
  assert.equal(communityLivestreamSubject("a/b"), "epoch.community.stream.a_b");
  assert.equal(liveSyncSubject(""), "epoch.live.default.sync");
  assert.equal(serviceAdvertiseSubject("civic"), "epoch.svc.advertise.civic");
  assert.equal(serviceLookupSubject("civic", "live"), "epoch.svc.lookup.civic.live");
}
