/**
 * Protocol-shaped AT proof bundle (getRecord-style) for org.epoch.identity.binding.
 *
 * This is NOT a pre-accept mock list. Verification recomputes:
 *   leaf = sha256(canonical record JSON)
 *   root = fold(leaf, inclusionPath)
 *   commit digest = sha256("epoch-at-proof-v1" || did || rev || root)
 *   schnorr/ed25519-style signature check against the DID #atproto key material
 *   carried in the bundle (must match DidDocument verificationMethod id).
 *
 * Full wire CAR/MST bytes from a live PDS remain a mechanism swap behind
 * AtProofVerifier; this format is the offline, deterministic proof contract.
 */

import { sha256 } from "@noble/hashes/sha2";
import { bytesToHex, hexToBytes } from "@noble/hashes/utils";
import { schnorr } from "@noble/curves/secp256k1";
import {
  bindingRecordSchema,
  INDEX_COLLECTION,
  type BindingRecord,
} from "../schemas/binding-record";
import type { DidDocument } from "./didResolve";
import type { AtProofBundle, AtProofVerifier } from "./carProof";

export const PROTOCOL_PROOF_VERSION = 1 as const;
export const PROTOCOL_PROOF_DOMAIN = "epoch-at-proof-v1";

export type InclusionStep = {
  readonly sibling: string;
  readonly side: "L" | "R";
};

export type ProtocolAtProofSlice = {
  readonly version: typeof PROTOCOL_PROOF_VERSION;
  readonly did: string;
  readonly collection: typeof INDEX_COLLECTION;
  readonly rkey: string;
  readonly record: BindingRecord;
  readonly recordCid: string;
  readonly commitRev: string;
  readonly inclusionPath: readonly InclusionStep[];
  readonly commitRoot: string;
  readonly commitSig: string;
  readonly commitKey: string;
};

function utf8(bytes: string): Uint8Array {
  return new TextEncoder().encode(bytes);
}

export function canonicalRecordJson(record: BindingRecord): string {
  // Stable key order for hashing (not full DAG-CBOR; offline fixture contract).
  const ordered = {
    $type: record.$type,
    epochAuthorId: record.epochAuthorId,
    nostrPubkey: record.nostrPubkey,
    nostrDid: record.nostrDid,
    bindingNonce: record.bindingNonce,
    bindingVersion: record.bindingVersion,
    seqno: record.seqno,
    prevBindingEventId: record.prevBindingEventId,
    revoked: record.revoked,
    createdAt: record.createdAt,
    expiration: record.expiration,
    statement: record.statement,
  };
  return JSON.stringify(ordered);
}

export function hashRecord(record: BindingRecord): string {
  return bytesToHex(sha256(utf8(canonicalRecordJson(record))));
}

export function foldInclusionPath(leaf: string, path: readonly InclusionStep[]): string {
  let acc = leaf.toLowerCase();
  for (const step of path) {
    const left = step.side === "L" ? acc : step.sibling.toLowerCase();
    const right = step.side === "L" ? step.sibling.toLowerCase() : acc;
    acc = bytesToHex(sha256(utf8(`${left}|${right}`)));
  }
  return acc;
}

export function commitDigest(input: {
  readonly did: string;
  readonly commitRev: string;
  readonly commitRoot: string;
}): string {
  return bytesToHex(
    sha256(utf8(`${PROTOCOL_PROOF_DOMAIN}|${input.did}|${input.commitRev}|${input.commitRoot}`)),
  );
}

export function encodeProtocolProofSlice(slice: ProtocolAtProofSlice): string {
  return Buffer.from(JSON.stringify(slice), "utf8").toString("base64url");
}

export function decodeProtocolProofSlice(carSliceB64: string): ProtocolAtProofSlice {
  let raw: string;
  try {
    raw = Buffer.from(carSliceB64, "base64url").toString("utf8");
  } catch {
    throw new Error("proof-invalid");
  }
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    throw new Error("proof-invalid");
  }
  if (typeof parsed !== "object" || parsed === null) {
    throw new Error("proof-invalid");
  }
  const o = parsed as Record<string, unknown>;
  if (o.version !== PROTOCOL_PROOF_VERSION) {
    throw new Error("proof-invalid");
  }
  if (o.collection !== INDEX_COLLECTION) {
    throw new Error("proof-invalid");
  }
  const record = bindingRecordSchema.parse(o.record);
  return {
    version: PROTOCOL_PROOF_VERSION,
    did: String(o.did),
    collection: INDEX_COLLECTION,
    rkey: String(o.rkey).toLowerCase(),
    record,
    recordCid: String(o.recordCid).toLowerCase(),
    commitRev: String(o.commitRev),
    inclusionPath: Array.isArray(o.inclusionPath)
      ? (o.inclusionPath as InclusionStep[])
      : [],
    commitRoot: String(o.commitRoot).toLowerCase(),
    commitSig: String(o.commitSig).toLowerCase(),
    commitKey: String(o.commitKey).toLowerCase(),
  };
}

/**
 * Build a valid signed protocol proof for offline tests / local-only PDS fixtures.
 * Private key never leaves this builder (caller discards it).
 */
export function buildSignedProtocolProof(input: {
  readonly did: string;
  readonly record: BindingRecord;
  readonly commitRev?: string;
  readonly commitPrivateKeyHex: string;
  readonly siblings?: readonly InclusionStep[];
}): { readonly slice: ProtocolAtProofSlice; readonly carSliceB64: string; readonly publicKeyHex: string } {
  const record = bindingRecordSchema.parse(input.record);
  const rkey = record.nostrPubkey.toLowerCase();
  const recordCid = hashRecord(record);
  const inclusionPath = input.siblings ?? [
    { sibling: bytesToHex(sha256(utf8("sibling-a"))), side: "R" as const },
    { sibling: bytesToHex(sha256(utf8("sibling-b"))), side: "L" as const },
  ];
  const commitRoot = foldInclusionPath(recordCid, inclusionPath);
  const commitRev = input.commitRev ?? `3l${Date.now().toString(16)}`;
  const digest = commitDigest({ did: input.did, commitRev, commitRoot });
  const commitKey = bytesToHex(schnorr.getPublicKey(hexToBytes(input.commitPrivateKeyHex)));
  const commitSig = bytesToHex(schnorr.sign(hexToBytes(digest), hexToBytes(input.commitPrivateKeyHex)));
  const slice: ProtocolAtProofSlice = {
    version: PROTOCOL_PROOF_VERSION,
    did: input.did,
    collection: INDEX_COLLECTION,
    rkey,
    record,
    recordCid,
    commitRev,
    inclusionPath,
    commitRoot,
    commitSig,
    commitKey,
  };
  return {
    slice,
    carSliceB64: encodeProtocolProofSlice(slice),
    publicKeyHex: commitKey,
  };
}

export function didDocumentForCommitKey(did: string, commitKeyHex: string): DidDocument {
  return {
    id: did,
    verificationMethod: [
      {
        id: `${did}#atproto`,
        type: "Multikey",
        publicKeyMultibase: `z${commitKeyHex}`,
      },
    ],
  };
}

/**
 * Deterministic AT proof verifier over protocol-shaped slices.
 * Invalid inclusion path or commit signature → proof-invalid.
 * Missing/undecodable slice → proof-missing / proof-invalid.
 */
export class ProtocolAtProofVerifier implements AtProofVerifier {
  async verifyRecordProof(input: {
    readonly did: string;
    readonly nostrPubkey: string;
    readonly carSliceB64: string;
    readonly didDocument: DidDocument;
  }): Promise<AtProofBundle> {
    if (!input.carSliceB64 || input.carSliceB64.length === 0) {
      throw new Error("proof-missing");
    }

    let slice: ProtocolAtProofSlice;
    try {
      slice = decodeProtocolProofSlice(input.carSliceB64);
    } catch {
      throw new Error("proof-invalid");
    }

    if (slice.did !== input.did) {
      throw new Error("proof-invalid");
    }
    if (slice.rkey !== input.nostrPubkey.toLowerCase()) {
      throw new Error("proof-invalid");
    }
    if (slice.record.nostrPubkey.toLowerCase() !== input.nostrPubkey.toLowerCase()) {
      throw new Error("proof-invalid");
    }

    const leaf = hashRecord(slice.record);
    if (leaf !== slice.recordCid) {
      throw new Error("proof-invalid");
    }

    const root = foldInclusionPath(leaf, slice.inclusionPath);
    if (root !== slice.commitRoot) {
      throw new Error("proof-invalid");
    }

    const methods = input.didDocument.verificationMethod ?? [];
    const atproto = methods.find((m) => m.id === `${input.did}#atproto` || m.id.endsWith("#atproto"));
    if (atproto === undefined) {
      throw new Error("proof-invalid");
    }
    const keyFromDoc = (atproto.publicKeyMultibase ?? "").replace(/^z/u, "").toLowerCase();
    if (keyFromDoc.length === 0 || keyFromDoc !== slice.commitKey.toLowerCase()) {
      throw new Error("proof-invalid");
    }

    const digest = commitDigest({
      did: slice.did,
      commitRev: slice.commitRev,
      commitRoot: slice.commitRoot,
    });
    let sigOk = false;
    try {
      sigOk = schnorr.verify(
        hexToBytes(slice.commitSig),
        hexToBytes(digest),
        hexToBytes(slice.commitKey),
      );
    } catch {
      sigOk = false;
    }
    if (!sigOk) {
      throw new Error("proof-invalid");
    }

    return {
      record: slice.record,
      carSliceB64: input.carSliceB64,
      recordCid: slice.recordCid,
      commitRev: slice.commitRev,
      commitSigCheck: "passed",
    };
  }
}
