import {
  assertProtocolEvent,
  evaluatePosture,
  type PosturePolicy,
  type ProtocolEvent,
  type ProtocolEventType,
} from "@epoch/protocol";
import { communityMessageToEntity, type CommunityMessageEntity } from "./entity";
import type { CommunityMessage } from "./graph";
import type { CommunityObjectRef } from "./identity";

export const CHANNEL_EVENT_SCHEMA = "epoch.channel/v1" as const;

export type ChannelVisibility = "public" | "shared" | "private";

export type ChannelCreateBody = {
  readonly schema: typeof CHANNEL_EVENT_SCHEMA;
  readonly channelId: string;
  readonly communityId: string;
  readonly name: string;
  readonly principalId: string;
  readonly visibility: ChannelVisibility;
};

export type ChannelMessageBody = {
  readonly schema: typeof CHANNEL_EVENT_SCHEMA;
  readonly channelId: string;
  readonly messageId: string;
  readonly principalId: string;
  readonly bodyDigest: string;
  readonly visibility: ChannelVisibility;
};

export type ChannelPresenceBody = {
  readonly schema: typeof CHANNEL_EVENT_SCHEMA;
  readonly channelId: string;
  readonly principalId: string;
  readonly state: "active" | "idle" | "away";
};

export type ChannelReadBody = {
  readonly schema: typeof CHANNEL_EVENT_SCHEMA;
  readonly channelId: string;
  readonly principalId: string;
  readonly watermarkEventId: string;
};

export type ChannelKind = "channel.create" | "channel.message" | "channel.presence" | "channel.read";

export type SignedChannelEvent = ProtocolEvent<
  ChannelCreateBody | ChannelMessageBody | ChannelPresenceBody | ChannelReadBody
> & {
  readonly type: ChannelKind;
};

export type ChannelProjection = {
  readonly channels: ReadonlyMap<string, ChannelCreateBody>;
  readonly messages: readonly CommunityMessageEntity[];
  readonly presence: ReadonlyMap<string, ChannelPresenceBody>;
  readonly reads: ReadonlyMap<string, ChannelReadBody>;
};

const CHANNEL_TYPES = new Set<ProtocolEventType>([
  "channel.create",
  "channel.message",
  "channel.presence",
  "channel.read",
]);

export function digestChannelBody(text: string): string {
  const bytes = new TextEncoder().encode(text);
  let mix = 2166136261;
  for (const byte of bytes) mix = Math.imul(mix ^ byte, 16777619) >>> 0;
  return mix.toString(16).padStart(64, "0").slice(-64);
}

export function assertChannelEvent(value: unknown): SignedChannelEvent {
  const event = assertProtocolEvent(value);
  if (!CHANNEL_TYPES.has(event.type)) {
    throw new Error(`not a channel event: ${event.type}`);
  }
  return event as SignedChannelEvent;
}

/**
 * Project verified channel.* protocol events onto Community message entities.
 * Callers must verify signatures (Live ingestEvents / gossip) before this.
 */
export function projectChannelEvents(events: readonly unknown[]): ChannelProjection {
  const channels = new Map<string, ChannelCreateBody>();
  const messages: CommunityMessageEntity[] = [];
  const presence = new Map<string, ChannelPresenceBody>();
  const reads = new Map<string, ChannelReadBody>();

  for (const raw of events) {
    const event = assertChannelEvent(raw);
    if (event.type === "channel.create") {
      const body = event.body as ChannelCreateBody;
      channels.set(body.channelId, body);
      continue;
    }
    if (event.type === "channel.message") {
      const body = event.body as ChannelMessageBody;
      messages.push(communityMessageToEntity(channelMessageFromEvent(event.eventId, body), {
        provenance: {
          sourceId: "epoch.channel",
          nativeId: event.eventId,
          observedAt: new Date(0).toISOString(),
        },
        visibility: body.visibility,
        ownerId: body.principalId,
        participantIds: [body.principalId],
      }));
      continue;
    }
    if (event.type === "channel.presence") {
      const body = event.body as ChannelPresenceBody;
      presence.set(`${body.channelId}:${body.principalId}`, body);
      continue;
    }
    const body = event.body as ChannelReadBody;
    reads.set(`${body.channelId}:${body.principalId}`, body);
  }

  return { channels, messages, presence, reads };
}

export type UnreadDecision = {
  readonly mode: "server" | "local";
  readonly watermarkEventId?: string;
};

/**
 * Hosted/private use `channel.read` when server-tracked read state is on.
 * Open keeps a local watermark (ADR-0025 fallback, honest).
 */
export function unreadForPosture(
  policy: PosturePolicy,
  read: ChannelReadBody | undefined,
  localWatermark: string | undefined,
): UnreadDecision {
  if (policy.serverTrackedReadState && read !== undefined) {
    return { mode: "server", watermarkEventId: read.watermarkEventId };
  }
  return { mode: "local", watermarkEventId: localWatermark };
}

export function evaluateChannelPosture(config: unknown): PosturePolicy {
  return evaluatePosture(config);
}

/**
 * Live arrivals never steal the reading position: a new message after the
 * watermark stays unread; the watermark itself is unchanged.
 */
export function queuePreservesWatermark(
  watermarkEventId: string | undefined,
  incomingMessageIds: readonly string[],
): { readonly watermarkEventId: string | undefined; readonly unreadIds: readonly string[] } {
  const unreadIds = incomingMessageIds.filter((id) => id !== watermarkEventId);
  return { watermarkEventId, unreadIds };
}

export type ChannelLivestreamEnvelope = {
  readonly kind: "channel.message";
  readonly channelId: string;
  readonly messageId: string;
  readonly bodyDigest: string;
  readonly visibility: "public";
};

export function sanitizeChannelLivestreamEnvelope(input: {
  readonly visibility: string;
  readonly channelId: string;
  readonly messageId: string;
  readonly body?: string;
  readonly protectedInput?: boolean;
  readonly secret?: string;
}): { readonly kind: "drop"; readonly reason: string } | { readonly kind: "emit"; readonly envelope: ChannelLivestreamEnvelope } {
  if (input.protectedInput === true || (typeof input.secret === "string" && input.secret.length > 0)) {
    return { kind: "drop", reason: "protected-secret" };
  }
  if (input.visibility !== "public") {
    return { kind: "drop", reason: "non-public" };
  }
  return {
    kind: "emit",
    envelope: {
      kind: "channel.message",
      channelId: input.channelId,
      messageId: input.messageId,
      bodyDigest: digestChannelBody(input.body ?? ""),
      visibility: "public",
    },
  };
}

function channelMessageFromEvent(eventId: string, body: ChannelMessageBody): CommunityMessage {
  const ref: CommunityObjectRef = { objectId: opaqueCommunityId(body.messageId), kind: "message", revision: eventId };
  const channel: CommunityObjectRef = { objectId: opaqueCommunityId(body.channelId), kind: "channel" };
  return {
    ref,
    context: channel,
    authorId: body.principalId,
    body: body.bodyDigest,
    publishedAt: new Date(0).toISOString(),
    threadRoot: ref,
    relations: [],
    state: "signed",
    aliases: [],
  };
}

/** Community objectIds reject `:`; protocol canonical IDs use `epoch:kind:…`. */
function opaqueCommunityId(value: string): string {
  const mapped = value.replaceAll(":", ".");
  if (!/^[A-Za-z0-9][A-Za-z0-9._~-]{0,127}$/u.test(mapped)) {
    throw new Error("channel identity cannot project to a Community objectId");
  }
  return mapped;
}
