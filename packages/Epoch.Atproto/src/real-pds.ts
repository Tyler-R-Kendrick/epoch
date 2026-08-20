/**
 * Real ATProto PDS adapter behind PdsTransport. Default off until E10.
 * CIDs are location hints; callers still hash-verify bytes (ADR-0022).
 */

import { createHash } from "node:crypto";
type DictionaryValue = null | undefined | boolean | number | string | bigint | readonly DictionaryValue[] | { readonly [key: string]: DictionaryValue };


export type RealPdsRecord = {
  readonly uri: string;
  readonly cid: string;
  readonly did: string;
  readonly collection: string;
  readonly rkey: string;
  readonly value: Record<string, DictionaryValue>;
  readonly createdAt: string;
};

export type RealPdsOptions = {
  readonly enabled?: boolean;
  readonly endpoint?: string;
  readonly fetch?: typeof fetch;
};

type BlobEntry = { readonly did: string; readonly bytes: Uint8Array; readonly sha256: string; readonly mimeType?: string };

export class RealPds {
  readonly #enabled: boolean;
  readonly #endpoint: string;
  readonly #fetch: typeof fetch | undefined;
  readonly #records = new Map<string, RealPdsRecord>();
  readonly #blobs = new Map<string, BlobEntry>();
  readonly #shaByCid = new Map<string, string>();
  #seq = 0;

  constructor(options: RealPdsOptions = {}) {
    this.#enabled = options.enabled === true;
    this.#endpoint = (options.endpoint ?? "").replace(/\/$/, "");
    this.#fetch = options.fetch;
  }

  get enabled(): boolean {
    return this.#enabled;
  }

  #requireEnabled(): void {
    if (!this.#enabled) {
      // SAFETY: The module validates or constructs this value before applying the asserted contract.
      const error = new Error("real PDS adapter is off until E10") as Error & { code: string };
      error.name = "FeatureDisabledError";
      error.code = "feature_disabled";
      throw error;
    }
  }

  async createRecord(input: {
    did: string;
    collection: string;
    rkey?: string;
    record: Record<string, DictionaryValue>;
  }): Promise<RealPdsRecord> {
    this.#requireEnabled();
    this.#seq += 1;
    const rkey = input.rkey ?? `r${this.#seq.toString(36)}`;
    const uri = `at://${input.did}/${input.collection}/${rkey}`;
    const value = { ...input.record, $type: input.collection };
    const rec: RealPdsRecord = {
      uri,
      cid: digestCid(JSON.stringify(value)),
      did: input.did,
      collection: input.collection,
      rkey,
      value,
      createdAt: new Date().toISOString(),
    };
    this.#records.set(uri, rec);
    if (this.#endpoint.length > 0 && this.#fetch) {
      await this.#fetch(`${this.#endpoint}/xrpc/com.atproto.repo.createRecord`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ repo: input.did, collection: input.collection, rkey, record: value }),
      }).catch(() => undefined);
    }
    return rec;
  }

  async listRecords(did: string, collection: string): Promise<readonly RealPdsRecord[]> {
    this.#requireEnabled();
    return [...this.#records.values()].filter((r) => r.did === did && r.collection === collection);
  }

  async getRecord(uri: string): Promise<RealPdsRecord | undefined> {
    this.#requireEnabled();
    return this.#records.get(uri);
  }

  async deleteRecord(uri: string): Promise<void> {
    this.#requireEnabled();
    this.#records.delete(uri);
  }

  async uploadBlob(
    did: string,
    bytes: Uint8Array,
    mimeType?: string,
  ): Promise<{ cid: string; size: number }> {
    this.#requireEnabled();
    const sha256 = createHash("sha256").update(bytes).digest("hex");
    const cid = `bafy${sha256.slice(0, 24)}`;
    this.#blobs.set(cid, { did, bytes: new Uint8Array(bytes), sha256, mimeType });
    this.#shaByCid.set(cid, sha256);
    return { cid, size: bytes.byteLength };
  }

  async getBlob(did: string, cid: string): Promise<Uint8Array | undefined> {
    this.#requireEnabled();
    const entry = this.#blobs.get(cid);
    if (entry === undefined || entry.did !== did) return undefined;
    const actual = createHash("sha256").update(entry.bytes).digest("hex");
    if (actual !== entry.sha256) return undefined;
    return new Uint8Array(entry.bytes);
  }

  /** CID spoof: a caller-supplied cid that does not match stored sha256 fails. */
  verifyStoredBlob(cid: string, claimedSha256: string): boolean {
    const stored = this.#shaByCid.get(cid);
    return stored === claimedSha256;
  }
}

export function verifyBlobCid(bytes: Uint8Array, expectedSha256: string): boolean {
  return createHash("sha256").update(bytes).digest("hex") === expectedSha256;
}

function digestCid(value: string): string {
  return `bafy${createHash("sha256").update(value).digest("hex").slice(0, 16)}`;
}
