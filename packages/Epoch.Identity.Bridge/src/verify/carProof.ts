/**
 * ATProto CAR / MST inclusion proof interfaces.
 *
 * Full MST + commit signature verification against K-256/P-256 DID keys is
 * injected via AtProofVerifier so mechanism swaps remain behind an interface
 * (Invariant 7). Production adapters parse com.atproto.sync.getRecord CAR slices;
 * tests supply MockAtProofVerifier that validates fixture proof bundles.
 */

import type { BindingRecord } from "../schemas/binding-record";
import { bindingRecordSchema } from "../schemas/binding-record";
import type { DidDocument } from "./didResolve";

export type AtProofBundle = {
  readonly record: BindingRecord;
  readonly carSliceB64: string;
  readonly recordCid: string;
  readonly commitRev: string;
  readonly commitSigCheck: "passed" | "failed";
};

export interface AtProofVerifier {
  /**
   * Verify MST inclusion + commit signature for org.epoch.identity.binding/<nostrPubkey>.
   * Returns the parsed record body when proof is valid.
   */
  verifyRecordProof(input: {
    readonly did: string;
    readonly nostrPubkey: string;
    readonly carSliceB64: string;
    readonly didDocument: DidDocument;
  }): Promise<AtProofBundle>;
}

/**
 * Mock verifier for tests: accepts pre-validated fixtures keyed by pair.
 * Invariant: never invents bindings — only returns what was registered.
 */
export class MockAtProofVerifier implements AtProofVerifier {
  readonly #bundles = new Map<string, AtProofBundle>();

  register(did: string, nostrPubkey: string, bundle: AtProofBundle): void {
    this.#bundles.set(`${did}:${nostrPubkey.toLowerCase()}`, {
      ...bundle,
      record: bindingRecordSchema.parse(bundle.record),
    });
  }

  async verifyRecordProof(input: {
    readonly did: string;
    readonly nostrPubkey: string;
    readonly carSliceB64: string;
    readonly didDocument: DidDocument;
  }): Promise<AtProofBundle> {
    const key = `${input.did}:${input.nostrPubkey.toLowerCase()}`;
    const bundle = this.#bundles.get(key);
    if (bundle === undefined) {
      throw new Error("proof-missing");
    }
    if (bundle.carSliceB64 !== input.carSliceB64 && input.carSliceB64 !== "fixture") {
      // Allow generic fixture token for tests that pass through carSliceB64: "fixture"
      if (input.carSliceB64.length === 0) {
        throw new Error("proof-missing");
      }
    }
    if (bundle.commitSigCheck !== "passed") {
      throw new Error("proof-invalid");
    }
    if (input.didDocument.id !== input.did) {
      throw new Error("proof-invalid");
    }
    return bundle;
  }
}
