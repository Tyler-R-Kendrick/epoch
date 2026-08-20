/**
 * Authenticated Live channel over a gated NATS connect (ADR-0054).
 *
 * `createNatsLiveProvider` stays a dumb fan-out. This helper is the fail-closed
 * seam: missing/invalid fabric secrets never open `epoch.live.*` subjects.
 */

import { createNatsLiveChannel, type NatsConnectionLike } from "./connection";
import { livePresenceSubject, liveSyncSubject } from "./subjects";
type BoundaryValue = null | undefined | boolean | number | string | bigint | symbol | Readonly<object>;
function __epochIsString<T>(value: T): value is T & string { return typeof value === "string"; }
function __epochIsFunction<T>(value: T): value is T & ((...args: never[]) => BoundaryValue) { return typeof value === "function"; }


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
  if (!__epochIsString(secret) || secret.trim().length === 0) {
    throw new Error("nats connect denied");
  }
  return secret;
}

function requireRepoId(repoId: string): string {
  if (!__epochIsString(repoId) || repoId.trim().length === 0) {
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
  if (!nc || !__epochIsFunction(nc.publish) || !__epochIsFunction(nc.subscribe)) {
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
