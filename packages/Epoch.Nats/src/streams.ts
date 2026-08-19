/**
 * Bootstrap helpers for JetStream stream definitions used by Epoch.
 */
import {
  EPOCH_NATS_STREAMS,
  EPOCH_NATS_SUBJECTS,
  type EpochNatsStreamName,
} from "./subjects";
import { MemoryJetStream } from "./jetstream-memory";

export interface EpochStreamSpec {
  readonly name: EpochNatsStreamName;
  readonly subjects: readonly string[];
  readonly retention: "limits";
  readonly maxAgeSeconds?: number;
}

export const EPOCH_STREAM_SPECS: readonly EpochStreamSpec[] = Object.freeze([
  {
    name: EPOCH_NATS_STREAMS.LIVE,
    subjects: Object.freeze([EPOCH_NATS_SUBJECTS.liveSync, EPOCH_NATS_SUBJECTS.livePresence]),
    retention: "limits",
    maxAgeSeconds: 60 * 60 * 24,
  },
  {
    name: EPOCH_NATS_STREAMS.PLATFORM_EVENTS,
    subjects: Object.freeze([EPOCH_NATS_SUBJECTS.platformEvents]),
    retention: "limits",
    maxAgeSeconds: 60 * 60 * 24 * 30,
  },
  {
    name: EPOCH_NATS_STREAMS.COMMUNITY_LIVESTREAM,
    subjects: Object.freeze([EPOCH_NATS_SUBJECTS.communityLivestream]),
    retention: "limits",
    maxAgeSeconds: 60 * 60 * 6,
  },
  {
    name: EPOCH_NATS_STREAMS.SVC,
    subjects: Object.freeze([EPOCH_NATS_SUBJECTS.serviceDiscovery]),
    retention: "limits",
    maxAgeSeconds: 60,
  },
]);

/** Create in-memory stand-ins for all Epoch streams (tests / local demos). */
export function createMemoryEpochStreams(): ReadonlyMap<EpochNatsStreamName, MemoryJetStream> {
  const map = new Map<EpochNatsStreamName, MemoryJetStream>();
  for (const spec of EPOCH_STREAM_SPECS) {
    map.set(spec.name, new MemoryJetStream(spec.name));
  }
  return map;
}
