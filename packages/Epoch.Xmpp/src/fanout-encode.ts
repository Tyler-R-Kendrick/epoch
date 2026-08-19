/**
 * Conference-shaped routing labels for public channel byte carriage.
 * These JIDs are not XEP-0045 occupancy or nicks (ADR-0055).
 */

export const CHANNEL_FANOUT_SCHEMA = "epoch.xmpp.channel-fanout/v1" as const;

export type ChannelFanoutRouting = {
  readonly kind: "conference-jid";
  readonly jid: string;
};

export type ChannelFanoutEnvelope = {
  readonly schema: typeof CHANNEL_FANOUT_SCHEMA;
  readonly routing: ChannelFanoutRouting;
  readonly event: unknown;
};

export function conferenceRoutingJid(channelId: string, destServer: string): string {
  if (destServer.length === 0 || destServer.includes("@") || destServer.includes("/") || destServer.includes(" ")) {
    throw new Error("invalid xmpp dest server");
  }
  return `${opaqueChannelLocalpart(channelId)}@conference.${destServer}`;
}

export function encodeChannelFanout(event: unknown, destServer: string, channelId: string): Uint8Array {
  const envelope: ChannelFanoutEnvelope = {
    schema: CHANNEL_FANOUT_SCHEMA,
    routing: { kind: "conference-jid", jid: conferenceRoutingJid(channelId, destServer) },
    event,
  };
  return new TextEncoder().encode(JSON.stringify(envelope));
}

export function decodeChannelFanout(bytes: Uint8Array): ChannelFanoutEnvelope {
  const parsed: unknown = JSON.parse(new TextDecoder().decode(bytes));
  if (typeof parsed !== "object" || parsed === null) {
    throw new Error("channel fanout envelope is not an object");
  }
  const row = parsed as Record<string, unknown>;
  if (row.schema !== CHANNEL_FANOUT_SCHEMA) {
    throw new Error("unknown channel fanout schema");
  }
  const routing = row.routing;
  if (typeof routing !== "object" || routing === null) {
    throw new Error("channel fanout routing is missing");
  }
  const route = routing as Record<string, unknown>;
  if (route.kind !== "conference-jid" || typeof route.jid !== "string" || !route.jid.includes("@conference.")) {
    throw new Error("channel fanout routing must be a conference JID label");
  }
  return {
    schema: CHANNEL_FANOUT_SCHEMA,
    routing: { kind: "conference-jid", jid: route.jid },
    event: row.event,
  };
}

function opaqueChannelLocalpart(channelId: string): string {
  const bytes = new TextEncoder().encode(channelId);
  let mix = 2166136261;
  for (const byte of bytes) mix = Math.imul(mix ^ byte, 16777619) >>> 0;
  return `ch${mix.toString(16).padStart(8, "0")}`;
}
