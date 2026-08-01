import { z } from "zod";
import { nostrEventSchema, nostrTagSchema, tagValue, type NostrEvent, type NostrTag } from "./binding-event";

/** Addressable Nostr kind for owner→agent attestations. */
export const NOSTR_ATTESTATION_KIND = 30423 as const;

const hexPubkey = z.string().regex(/^[0-9a-f]{64}$/u);

export const attestationEventFieldsSchema = z.object({
  kind: z.literal(NOSTR_ATTESTATION_KIND),
  pubkey: hexPubkey,
  created_at: z.number().int(),
  agentPubkey: hexPubkey,
  epochAuthor: z.string().min(1),
  scope: z.string().min(1),
  expires: z.number().int().positive(),
  seqno: z.number().int().positive(),
  revoked: z.boolean(),
  content: z.string(),
  sig: z.string().regex(/^[0-9a-f]{128}$/u),
  id: z.string().regex(/^[0-9a-f]{64}$/u).optional(),
});

export type AttestationEventFields = z.infer<typeof attestationEventFieldsSchema>;

export function parseAttestationEvent(event: NostrEvent): AttestationEventFields {
  const parsed = nostrEventSchema.parse(event);
  if (parsed.kind !== NOSTR_ATTESTATION_KIND) {
    throw new Error(`bad-kind: expected ${NOSTR_ATTESTATION_KIND}`);
  }
  const agentPubkey = tagValue(parsed.tags, "d");
  const epochAuthor = tagValue(parsed.tags, "epoch-author");
  const scope = tagValue(parsed.tags, "scope");
  const expiresRaw = tagValue(parsed.tags, "expires");
  const seqnoRaw = tagValue(parsed.tags, "seqno");
  const revokedRaw = tagValue(parsed.tags, "revoked") ?? "false";
  if (
    agentPubkey === undefined
    || epochAuthor === undefined
    || scope === undefined
    || expiresRaw === undefined
    || seqnoRaw === undefined
  ) {
    throw new Error("mismatch-fields: missing attestation tags");
  }
  return attestationEventFieldsSchema.parse({
    kind: NOSTR_ATTESTATION_KIND,
    pubkey: parsed.pubkey,
    created_at: parsed.created_at,
    agentPubkey,
    epochAuthor,
    scope,
    expires: Number(expiresRaw),
    seqno: Number(seqnoRaw),
    revoked: revokedRaw === "true",
    content: parsed.content,
    sig: parsed.sig,
    id: parsed.id,
  });
}

export function buildAttestationTags(fields: {
  readonly agentPubkey: string;
  readonly epochAuthor: string;
  readonly scope: string;
  readonly expires: number;
  readonly seqno: number;
  readonly revoked?: boolean;
}): NostrTag[] {
  return [
    ["d", fields.agentPubkey],
    ["epoch-author", fields.epochAuthor],
    ["scope", fields.scope],
    ["expires", String(fields.expires)],
    ["seqno", String(fields.seqno)],
    ["revoked", fields.revoked === true ? "true" : "false"],
  ];
}

export { nostrEventSchema, nostrTagSchema };
