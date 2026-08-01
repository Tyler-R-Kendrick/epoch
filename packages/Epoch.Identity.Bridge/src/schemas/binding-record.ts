import { z } from "zod";
import { BINDING_VERSION } from "./binding-event";

export { BINDING_VERSION };

const hex64 = z.string().regex(/^[0-9a-f]{64}$/u);
const hexPubkey = z.string().regex(/^[0-9a-f]{64}$/u);

/** ATProto record body for org.epoch.identity.binding (rkey = nostrPubkey hex). */
export const bindingRecordSchema = z.object({
  $type: z.literal("org.epoch.identity.binding"),
  epochAuthorId: z.string().min(1),
  nostrPubkey: hexPubkey,
  nostrDid: z.string().optional(),
  bindingNonce: hex64,
  bindingVersion: z.literal(BINDING_VERSION),
  seqno: z.number().int().positive(),
  prevBindingEventId: hex64.optional(),
  revoked: z.boolean(),
  createdAt: z.string().min(1),
  expiration: z.string().optional(),
  statement: z.string().optional(),
});

export type BindingRecord = z.infer<typeof bindingRecordSchema>;

export const INDEX_COLLECTION = "org.epoch.identity.binding" as const;

export function bindingRecordRkey(nostrPubkey: string): string {
  return nostrPubkey.toLowerCase();
}

export function pairKey(nostrPubkey: string, atDid: string): string {
  return `${nostrPubkey.toLowerCase()}:${atDid}`;
}

export const indexEntrySchema = z.object({
  pairKey: z.string().min(3),
  chainHead: z.object({
    seqno: z.number().int().positive(),
    nostrEventId: hex64,
    atRecordUri: z.string().min(1),
    recordCid: z.string().min(1),
    commitRev: z.string().min(1),
  }),
  status: z.enum(["valid", "revoked", "expired", "conflict"]),
  proof: z.object({
    nostrEvent: z.unknown(),
    /** Prior Nostr binding events at this address (exclude head); required for re-verify of seqno>1. */
    nostrChain: z.array(z.unknown()).optional(),
    carSliceB64: z.string(),
    didDocument: z.unknown(),
    commitSigCheck: z.literal("passed"),
  }),
  firstSeenAt: z.string(),
  lastReverifiedAt: z.string(),
});

export type IndexEntry = z.infer<typeof indexEntrySchema>;
