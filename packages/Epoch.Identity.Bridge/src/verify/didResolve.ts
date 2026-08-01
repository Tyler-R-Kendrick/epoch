/**
 * DID resolution interfaces — injectable so verification stays pure.
 * Supports did:plc and did:web behind DidResolver.
 */

export type DidDocument = {
  readonly id: string;
  readonly verificationMethod?: readonly {
    readonly id: string;
    readonly type: string;
    readonly publicKeyMultibase?: string;
    readonly publicKeyJwk?: unknown;
  }[];
  readonly alsoKnownAs?: readonly string[];
  readonly service?: readonly {
    readonly id: string;
    readonly type: string;
    readonly serviceEndpoint: string;
  }[];
};

export interface DidResolver {
  resolve(did: string): Promise<DidDocument>;
}

export class StaticDidResolver implements DidResolver {
  readonly #docs: Map<string, DidDocument>;

  constructor(docs: readonly DidDocument[] = []) {
    this.#docs = new Map(docs.map((doc) => [doc.id, doc]));
  }

  add(doc: DidDocument): void {
    this.#docs.set(doc.id, doc);
  }

  async resolve(did: string): Promise<DidDocument> {
    const doc = this.#docs.get(did);
    if (doc === undefined) {
      throw new Error(`did-unresolvable: ${did}`);
    }
    return doc;
  }
}

export function atprotoSigningKeyId(did: string): string {
  return `${did}#atproto`;
}
