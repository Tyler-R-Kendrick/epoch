import { z } from "zod";

/** Addressable Nostr kind for Epoch↔AT binding events (NIP-01 30000–39999). */
export const NOSTR_BINDING_KIND = 30422 as const;
export const BINDING_VERSION = 2 as const;
export const BINDING_VERSION_TAG = "2" as const;

const hex64 = z.string().regex(/^[0-9a-f]{64}$/u, "expected 64 hex chars (32 bytes)");
const hexPubkey = z.string().regex(/^[0-9a-f]{64}$/u, "expected 64 hex nostr pubkey");
const did = z.string().min(3).regex(/^did:/u);

export type NostrTag = readonly [string, ...string[]];

export const nostrTagSchema = z.tuple([z.string()]).rest(z.string());

export const nostrEventSchema = z.object({
  id: z.string().regex(/^[0-9a-f]{64}$/u).optional(),
  kind: z.number().int(),
  pubkey: hexPubkey,
  created_at: z.number().int(),
  tags: z.array(nostrTagSchema),
  content: z.string(),
  sig: z.string().regex(/^[0-9a-f]{128}$/u),
});

export type NostrEvent = z.infer<typeof nostrEventSchema>;

export const bindingEventFieldsSchema = z.object({
  kind: z.literal(NOSTR_BINDING_KIND),
  pubkey: hexPubkey,
  created_at: z.number().int(),
  d: did,
  epochAuthor: z.string().min(1),
  atDid: did,
  atHandle: z.string().min(1).optional(),
  bindingNonce: hex64,
  bindingVersion: z.literal(BINDING_VERSION_TAG),
  seqno: z.number().int().positive(),
  prevEventId: hex64.optional(),
  revoked: z.boolean(),
  expiration: z.number().int().optional(),
  content: z.string(),
  sig: z.string().regex(/^[0-9a-f]{128}$/u),
  id: hex64.optional(),
});

export type BindingEventFields = z.infer<typeof bindingEventFieldsSchema>;

export function tagValue(tags: readonly NostrTag[], name: string): string | undefined {
  for (const tag of tags) {
    if (tag[0] === name && tag[1] !== undefined) {
      return tag[1];
    }
  }
  return undefined;
}

export function prevEventIdFromTags(tags: readonly NostrTag[]): string | undefined {
  for (const tag of tags) {
    if (tag[0] === "e" && tag[1] !== undefined && (tag[3] === "prev" || tag.length === 2)) {
      if (tag[3] === "prev" || tags.some((t) => t[0] === "e" && t[3] === "prev" && t[1] === tag[1])) {
        return tag[1];
      }
    }
  }
  for (const tag of tags) {
    if (tag[0] === "e" && tag[3] === "prev" && tag[1] !== undefined) {
      return tag[1];
    }
  }
  return undefined;
}

export function parseBindingEvent(event: NostrEvent): BindingEventFields {
  const parsed = nostrEventSchema.parse(event);
  if (parsed.kind !== NOSTR_BINDING_KIND) {
    throw new Error(`bad-kind: expected ${NOSTR_BINDING_KIND}, got ${parsed.kind}`);
  }
  const d = tagValue(parsed.tags, "d");
  const epochAuthor = tagValue(parsed.tags, "epoch-author");
  const atDid = tagValue(parsed.tags, "at-did");
  const atHandle = tagValue(parsed.tags, "at-handle");
  const bindingNonce = tagValue(parsed.tags, "binding-nonce");
  const bindingVersion = tagValue(parsed.tags, "binding-version");
  const seqnoRaw = tagValue(parsed.tags, "seqno");
  const revokedRaw = tagValue(parsed.tags, "revoked") ?? "false";
  const expirationRaw = tagValue(parsed.tags, "expiration");
  const prevEventId = prevEventIdFromTags(parsed.tags);

  if (bindingNonce === undefined || !/^[0-9a-f]{64}$/u.test(bindingNonce)) {
    throw new Error("bad-nonce");
  }
  if (bindingVersion !== BINDING_VERSION_TAG) {
    throw new Error(`bad-kind: binding-version must be ${BINDING_VERSION_TAG}`);
  }
  if (d === undefined || epochAuthor === undefined || atDid === undefined || seqnoRaw === undefined) {
    throw new Error("mismatch-fields: missing required binding tags");
  }

  return bindingEventFieldsSchema.parse({
    kind: NOSTR_BINDING_KIND,
    pubkey: parsed.pubkey,
    created_at: parsed.created_at,
    d,
    epochAuthor,
    atDid,
    atHandle,
    bindingNonce,
    bindingVersion: BINDING_VERSION_TAG,
    seqno: Number(seqnoRaw),
    prevEventId,
    revoked: revokedRaw === "true",
    expiration: expirationRaw === undefined ? undefined : Number(expirationRaw),
    content: parsed.content,
    sig: parsed.sig,
    id: parsed.id,
  });
}

export function buildBindingTags(fields: {
  readonly d: string;
  readonly epochAuthor: string;
  readonly atDid: string;
  readonly atHandle?: string;
  readonly bindingNonce: string;
  readonly seqno: number;
  readonly prevEventId?: string;
  readonly revoked?: boolean;
  readonly expiration?: number;
}): NostrTag[] {
  const tags: NostrTag[] = [
    ["d", fields.d],
    ["epoch-author", fields.epochAuthor],
    ["at-did", fields.atDid],
  ];
  if (fields.atHandle !== undefined) {
    tags.push(["at-handle", fields.atHandle]);
  }
  tags.push(
    ["binding-nonce", fields.bindingNonce],
    ["binding-version", BINDING_VERSION_TAG],
    ["seqno", String(fields.seqno)],
  );
  if (fields.prevEventId !== undefined) {
    tags.push(["e", fields.prevEventId, "", "prev"]);
  }
  tags.push(["revoked", fields.revoked === true ? "true" : "false"]);
  if (fields.expiration !== undefined) {
    tags.push(["expiration", String(fields.expiration)]);
  }
  return tags;
}
