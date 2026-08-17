/** Canonical subjects and JetStream stream names (ADR-0054). */

export const EPOCH_NATS_STREAMS = Object.freeze({
  LIVE: "EPOCH_LIVE",
  PLATFORM_EVENTS: "EPOCH_PLATFORM_EVENTS",
  COMMUNITY_LIVESTREAM: "EPOCH_COMMUNITY_LIVESTREAM",
} as const);

export type EpochNatsStreamName = (typeof EPOCH_NATS_STREAMS)[keyof typeof EPOCH_NATS_STREAMS];

export const EPOCH_NATS_SUBJECTS = Object.freeze({
  liveSync: "epoch.live.*.sync",
  livePresence: "epoch.live.*.presence",
  platformEvents: "epoch.platform.events.>",
  communityLivestream: "epoch.community.stream.>",
  authCallout: "$SYS.REQ.USER.AUTH",
} as const);

export function liveSyncSubject(repoId: string): string {
  return `epoch.live.${sanitize(repoId)}.sync`;
}

export function livePresenceSubject(repoId: string): string {
  return `epoch.live.${sanitize(repoId)}.presence`;
}

export function platformEventsSubject(kind = "audit"): string {
  return `epoch.platform.events.${sanitize(kind)}`;
}

export function communityLivestreamSubject(spaceId: string): string {
  return `epoch.community.stream.${sanitize(spaceId)}`;
}

function sanitize(value: string): string {
  return String(value || "default").replace(/[^a-zA-Z0-9_-]+/g, "_");
}
