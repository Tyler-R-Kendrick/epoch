import type { LiveChannelComposeResult } from "./channel-compose";

const CHANNEL_FANOUT_SCHEMA = "epoch.xmpp.channel-fanout/v1" as const;

export type InjectedXmppFanout = {
  readonly destServer: string;
  send(bytes: Uint8Array, destServer: string): Promise<void>;
  assertPublic(visibility: string): void;
};

type FanoutGlobal = typeof globalThis & { epochXmppFanout?: InjectedXmppFanout };

/** Keep JSON shape in lockstep with `@epoch/xmpp` `encodeChannelFanout`. */
export function encodeLiveChannelFanout(event: LiveChannelComposeResult, destServer: string): Uint8Array {
  const protocol = {
    schemaVersion: event.schemaVersion,
    type: event.type,
    eventId: event.eventId,
    revisionId: event.revisionId,
    body: event.body,
  };
  const envelope = {
    schema: CHANNEL_FANOUT_SCHEMA,
    routing: { kind: "conference-jid", jid: conferenceRoutingJid(event.body.channelId, destServer) },
    event: protocol,
  };
  return new TextEncoder().encode(JSON.stringify(envelope));
}

function conferenceRoutingJid(channelId: string, destServer: string): string {
  if (destServer.length === 0 || destServer.includes("@") || destServer.includes("/") || destServer.includes(" ")) {
    throw new Error("invalid xmpp dest server");
  }
  const bytes = new TextEncoder().encode(channelId);
  let mix = 2166136261;
  for (const byte of bytes) mix = Math.imul(mix ^ byte, 16777619) >>> 0;
  return `ch${mix.toString(16).padStart(8, "0")}@conference.${destServer}`;
}

/** Default-off: no-op unless a test or host injects `globalThis.epochXmppFanout`. */
export async function federateComposedChannelIfEnabled(event: LiveChannelComposeResult): Promise<void> {
  // SAFETY: This optional host extension is read from the process-wide global;
  // hosts install the exported InjectedXmppFanout contract as one atomic value.
  const fanout = (globalThis as FanoutGlobal).epochXmppFanout;
  if (fanout === undefined) return;
  fanout.assertPublic(event.body.visibility);
  await fanout.send(encodeLiveChannelFanout(event, fanout.destServer), fanout.destServer);
}
