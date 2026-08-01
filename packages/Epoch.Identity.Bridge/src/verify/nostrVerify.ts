import { parseBindingEvent, type NostrEvent } from "../schemas/binding-event";
import { computeEventId, verifyEventSignature } from "../nostr/nip01";
import { fail, type VerifyBindingResult } from "./errors";

export function verifyNostrBindingEvent(event: NostrEvent):
  | { readonly ok: true; readonly fields: ReturnType<typeof parseBindingEvent>; readonly eventId: string }
  | { readonly ok: false; readonly result: VerifyBindingResult } {
  const eventId = computeEventId(event);
  if (event.id !== undefined && event.id !== eventId) {
    return { ok: false, result: fail("bad-signature") };
  }
  if (!verifyEventSignature({ ...event, id: eventId })) {
    return { ok: false, result: fail("bad-signature") };
  }
  try {
    const fields = parseBindingEvent({ ...event, id: eventId });
    return { ok: true, fields, eventId };
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    if (message.startsWith("bad-kind")) {
      return { ok: false, result: fail("bad-kind") };
    }
    if (message.startsWith("bad-nonce")) {
      return { ok: false, result: fail("bad-nonce") };
    }
    return { ok: false, result: fail("mismatch-fields") };
  }
}
