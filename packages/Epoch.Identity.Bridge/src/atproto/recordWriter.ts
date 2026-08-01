import {
  BINDING_VERSION,
  type BindingRecord,
  bindingRecordRkey,
  bindingRecordSchema,
  INDEX_COLLECTION,
} from "../schemas/binding-record";

export type AtRecordWrite = {
  readonly uri: string;
  readonly cid: string;
  readonly rev: string;
  readonly record: BindingRecord;
  readonly carSliceB64: string;
};

export type PutRecordOptions = {
  /** When set, store this proof slice instead of a placeholder record JSON encoding. */
  readonly carSliceB64?: string;
  readonly recordCid?: string;
  readonly rev?: string;
};

/**
 * Upsert org.epoch.identity.binding at rkey = nostrPubkey hex.
 * Writes only via scoped OAuth grant in production (see oauthClient.ts).
 */
export interface BindingRecordStore {
  put(did: string, record: BindingRecord, options?: PutRecordOptions): Promise<AtRecordWrite>;
  get(did: string, nostrPubkey: string): Promise<AtRecordWrite | undefined>;
  delete(did: string, nostrPubkey: string): Promise<void>;
}

export class InMemoryBindingRecordStore implements BindingRecordStore {
  readonly #byDid = new Map<string, Map<string, AtRecordWrite>>();
  #rev = 0;

  async put(did: string, record: BindingRecord, options?: PutRecordOptions): Promise<AtRecordWrite> {
    const parsed = bindingRecordSchema.parse(record);
    const rkey = bindingRecordRkey(parsed.nostrPubkey);
    const map = this.#byDid.get(did) ?? new Map<string, AtRecordWrite>();
    this.#rev += 1;
    const rev = options?.rev ?? `3l${this.#rev.toString(16).padStart(10, "0")}`;
    const cid = options?.recordCid ?? `bafyfixture${this.#rev.toString(16).padStart(8, "0")}`;
    const carSliceB64 = options?.carSliceB64
      ?? Buffer.from(JSON.stringify(parsed), "utf8").toString("base64");
    const write: AtRecordWrite = {
      uri: `at://${did}/${INDEX_COLLECTION}/${rkey}`,
      cid,
      rev,
      record: parsed,
      carSliceB64,
    };
    map.set(rkey, write);
    this.#byDid.set(did, map);
    return write;
  }

  async get(did: string, nostrPubkey: string): Promise<AtRecordWrite | undefined> {
    return this.#byDid.get(did)?.get(bindingRecordRkey(nostrPubkey));
  }

  async delete(did: string, nostrPubkey: string): Promise<void> {
    this.#byDid.get(did)?.delete(bindingRecordRkey(nostrPubkey));
  }
}

export function buildBindingRecord(input: {
  readonly epochAuthorId: string;
  readonly nostrPubkey: string;
  readonly bindingNonce: string;
  readonly seqno: number;
  readonly prevBindingEventId?: string;
  readonly revoked?: boolean;
  readonly createdAt?: string;
  readonly expiration?: string;
  readonly statement?: string;
}): BindingRecord {
  return bindingRecordSchema.parse({
    $type: "org.epoch.identity.binding",
    epochAuthorId: input.epochAuthorId,
    nostrPubkey: input.nostrPubkey.toLowerCase(),
    nostrDid: `did:nostr:${input.nostrPubkey.toLowerCase()}`,
    bindingNonce: input.bindingNonce,
    bindingVersion: BINDING_VERSION,
    seqno: input.seqno,
    prevBindingEventId: input.prevBindingEventId,
    revoked: input.revoked === true,
    createdAt: input.createdAt ?? new Date().toISOString(),
    expiration: input.expiration,
    statement: input.statement,
  });
}

export { INDEX_COLLECTION, BINDING_VERSION };
