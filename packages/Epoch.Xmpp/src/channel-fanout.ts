import { assertProtocolEvent, type ProtocolEvent } from "@epoch/protocol";
import { decodeChannelFanout, encodeChannelFanout } from "./fanout-encode";
import type { FederationTransport } from "./transport";
type BoundaryValue = null | undefined | boolean | number | string | bigint | symbol | Readonly<object>;
type DictionaryValue = null | undefined | boolean | number | string | bigint | readonly DictionaryValue[] | { readonly [key: string]: DictionaryValue };
function __epochIsObject<T>(value: T): value is T & object { return typeof value === "object"; }


const FANOUT_TYPES = new Set(["channel.create", "channel.message"]);

export async function federatePublicChannelEvent(
  transport: FederationTransport,
  event: BoundaryValue,
  destServer: string,
): Promise<void> {
  const protocol = protocolEventFromUnknown(event);
  if (!FANOUT_TYPES.has(protocol.type)) {
    throw new Error(`${protocol.type} does not federate over XMPP s2s`);
  }
  // SAFETY: The module validates or constructs this value before applying the asserted contract.
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

function protocolEventFromUnknown(event: BoundaryValue): ProtocolEvent {
  if (!__epochIsObject(event) || event === null) {
    throw new Error("channel fanout event is not an object");
  }
  // SAFETY: The module validates or constructs this value before applying the asserted contract.
  const row = event as Record<string, DictionaryValue>;
  return assertProtocolEvent({
    schemaVersion: row.schemaVersion,
    type: row.type,
    eventId: row.eventId,
    revisionId: row.revisionId,
    body: row.body,
  });
}
