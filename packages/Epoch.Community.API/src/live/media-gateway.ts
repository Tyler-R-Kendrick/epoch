import { createHash } from "node:crypto";
import type {
  LiveMediaGateway,
  LiveMediaProviderEventRecord,
  LiveMediaPublishSource,
  LiveMediaTokenGrant,
} from "@epoch/community-runtime";
import { evaluateLiveMediaMode, type LiveMediaProvider, type LiveMediaSecurityMode } from "./media-provider";

/**
 * The server-side media gateway.
 *
 * It sits between the browser-safe application port and a real provider, and
 * its whole job is to make sure a media credential is *derived* rather than
 * asserted: Epoch has already decided who this principal is and what they may
 * publish, and this layer turns that decision into the narrowest, shortest
 * lived provider token that expresses it. Nothing here can widen authority,
 * and no provider secret is ever returned to a caller.
 */

export interface LiveMediaGatewayOptions {
  readonly provider: LiveMediaProvider;
  readonly now: () => number;
  /** Bounded token lifetime; the mandate's honest range is minutes, not hours. */
  readonly tokenTtlSeconds?: number;
  readonly maxTokenTtlSeconds?: number;
}

const DEFAULT_TOKEN_TTL_SECONDS = 300;
const MAX_TOKEN_TTL_SECONDS = 900;

export function createLiveMediaGateway(options: LiveMediaGatewayOptions): LiveMediaGateway {
  const ttlSeconds = Math.min(
    options.tokenTtlSeconds ?? DEFAULT_TOKEN_TTL_SECONDS,
    options.maxTokenTtlSeconds ?? MAX_TOKEN_TTL_SECONDS,
  );
  const roomBySession = new Map<string, string>();
  const seenEventDigests = new Set<string>();
  let operations = 0;

  async function roomFor(sessionId: string, securityMode: LiveMediaSecurityMode): Promise<string> {
    const existing = roomBySession.get(sessionId);
    if (existing !== undefined) return existing;
    operations += 1;
    const created = await options.provider.createRoom({
      sessionId,
      securityMode,
      // A stable idempotency key: a retried request rejoins the same room
      // instead of stranding a second one at the provider.
      operationId: `room:${sessionId}`,
    });
    if (created.roomRef === undefined) {
      throw new Error(`media room could not be provisioned: ${created.reason ?? created.outcome}`);
    }
    roomBySession.set(sessionId, created.roomRef);
    return created.roomRef;
  }

  return {
    async issueToken(input) {
      const securityMode = asSecurityMode(input.securityMode);
      // Publishing media into a mode that cannot carry it is refused here, not
      // silently downgraded at the provider.
      const compatibility = evaluateLiveMediaMode({
        securityMode,
        recording: false,
        externalEgress: false,
        serverTranscription: false,
      });
      if (compatibility.kind === "refused") {
        throw new Error(`media is not available in this security mode: ${compatibility.reasons.join("; ")}`);
      }
      const readiness = await options.provider.readiness();
      if (!readiness.ready) {
        throw new Error(`media provider is ${readiness.label}: ${readiness.reason ?? "not ready"}`);
      }
      const roomRef = await roomFor(input.sessionId, securityMode);
      operations += 1;
      const issued = await options.provider.issueParticipantToken({
        sessionId: input.sessionId,
        roomRef,
        participantRef: input.participantRef,
        // Every participant may subscribe; publishing is the narrow part.
        canSubscribe: true,
        publishSources: input.publishSources,
        ttlSeconds,
        operationId: `token:${input.participantRef}:${operations}`,
      });
      if (issued.outcome !== "issued" || issued.token === undefined) {
        throw new Error(`media token was refused: ${issued.reason ?? "unknown"}`);
      }
      const grant: LiveMediaTokenGrant = {
        token: issued.token,
        expiresAtMs: issued.expiresAtMs ?? options.now() + ttlSeconds * 1_000,
        roomRef,
        publishSources: input.publishSources,
        canSubscribe: true,
      };
      return grant;
    },

    recordProviderEvent(input) {
      // Deduplicate by the verified body digest: a provider that retries, or an
      // attacker that replays a captured delivery, changes nothing twice.
      const key = `${input.sessionId}:${input.eventDigest}`;
      const duplicate = seenEventDigests.has(key);
      if (!duplicate) seenEventDigests.add(key);
      const record: LiveMediaProviderEventRecord = {
        providerKind: input.providerKind,
        eventKind: input.eventKind,
        roomRef: input.roomRef,
        eventDigest: input.eventDigest,
        duplicate,
      };
      return Promise.resolve(record);
    },
  };
}

/** Bind a provider room back to the session that owns it. */
export function liveMediaRoomBinding(sessionId: string): string {
  return createHash("sha256").update(`live-room:${sessionId}`).digest("hex").slice(0, 32);
}

export function liveWebhookBodyDigest(rawBody: string): string {
  return createHash("sha256").update(rawBody).digest("hex");
}

export function liveMediaPublishSources(values: readonly string[]): readonly LiveMediaPublishSource[] {
  const sources: LiveMediaPublishSource[] = [];
  for (const value of values) {
    if (value === "microphone" || value === "camera" || value === "screen-share" || value === "screen-share-audio") {
      sources.push(value);
    }
  }
  return sources;
}

function asSecurityMode(value: string): LiveMediaSecurityMode {
  if (value === "semantic-only" || value === "private-e2ee" || value === "private-recordable" || value === "public-broadcast") {
    return value;
  }
  throw new Error(`unknown live security mode '${value}'`);
}
