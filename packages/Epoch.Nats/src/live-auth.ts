/**
 * Authenticated Live channel over a gated NATS connect (ADR-0054).
 *
 * `createNatsLiveProvider` stays a dumb fan-out. This helper is the fail-closed
 * seam: missing/invalid fabric secrets never open `epoch.live.*` subjects.
 */

import { createNatsLiveChannel, type NatsConnectionLike } from "./connection";
import { livePresenceSubject, liveSyncSubject } from "./subjects";

export interface LiveChannelLike {
  send(data: string): void;
  onMessage(listener: (data: string) => void): void;
  close(): void;
}

export interface OpenAuthenticatedNatsLiveChannelInput {
  readonly repoId: string;
  readonly fabricSecret: string;
  readonly connect: (secret: string) => Promise<NatsConnectionLike>;
}

export interface OpenAuthenticatedNatsLiveChannelResult {
  readonly channel: LiveChannelLike;
  readonly stop: () => void;
  readonly providerId: string;
}

function requireFabricSecret(secret: string): string {
  if (typeof secret !== "string" || secret.trim().length === 0) {
    throw new Error("nats connect denied");
  }
  return secret;
}

function requireRepoId(repoId: string): string {
  if (typeof repoId !== "string" || repoId.trim().length === 0) {
    throw new Error("nats connect denied");
  }
  return repoId;
}

/**
 * Authenticate via the injected gated `connect`, then bind Live sync/presence
 * subjects for `repoId`. Does not mint Platform credentials.
 */
export async function openAuthenticatedNatsLiveChannel(
  input: OpenAuthenticatedNatsLiveChannelInput,
): Promise<OpenAuthenticatedNatsLiveChannelResult> {
  const secret = requireFabricSecret(input.fabricSecret);
  const repoId = requireRepoId(input.repoId);
  const nc = await input.connect(secret);
  if (!nc || typeof nc.publish !== "function" || typeof nc.subscribe !== "function") {
    throw new Error("nats connect denied");
  }
  const opened = createNatsLiveChannel(nc, {
    sync: liveSyncSubject(repoId),
    presence: livePresenceSubject(repoId),
  });
  return {
    channel: opened.channel,
    stop: opened.stop,
    providerId: `nats:${repoId}`,
  };
}
