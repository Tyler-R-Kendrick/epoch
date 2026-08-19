import { assertProtocolEvent, type ProtocolEvent } from "@epoch/protocol";
import { decodeChannelFanout, encodeChannelFanout } from "./fanout-encode";
import type { FederationTransport } from "./transport";

const FANOUT_TYPES = new Set(["channel.create", "channel.message"]);

export async function federatePublicChannelEvent(
  transport: FederationTransport,
  event: unknown,
  destServer: string,
): Promise<void> {
  const protocol = protocolEventFromUnknown(event);
  if (!FANOUT_TYPES.has(protocol.type)) {
    throw new Error(`${protocol.type} does not federate over XMPP s2s`);
  }
  const body = protocol.body as { readonly visibility?: string; readonly channelId: string };
  if (body.visibility === undefined) {
    throw new Error(`${protocol.type} is missing visibility and cannot federate`);
  }
  transport.assertPublic(body.visibility);
  await transport.send(encodeChannelFanout(protocol, destServer, body.channelId), destServer);
}

export async function receiveFederatedChannelEvents(
  transport: FederationTransport,
): Promise<readonly ProtocolEvent[]> {
  const events: ProtocolEvent[] = [];
  for await (const bytes of transport.receive()) {
    const envelope = decodeChannelFanout(bytes);
    events.push(assertProtocolEvent(envelope.event));
  }
  return events;
}

function protocolEventFromUnknown(event: unknown): ProtocolEvent {
  if (typeof event !== "object" || event === null) {
    throw new Error("channel fanout event is not an object");
  }
  const row = event as Record<string, unknown>;
  return assertProtocolEvent({
    schemaVersion: row.schemaVersion,
    type: row.type,
    eventId: row.eventId,
    revisionId: row.revisionId,
    body: row.body,
  });
}
