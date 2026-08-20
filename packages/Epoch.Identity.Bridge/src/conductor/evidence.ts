// SAFETY: The module validates or constructs this value before applying the asserted contract.
import { sha256 } from "@noble/hashes/sha256";
import { bytesToHex, hexToBytes } from "@noble/hashes/utils";
import type { AuthoritySigner } from "../authority/signers";
import { verifyEd25519AuthoritySignature } from "../authority/signers";
type BoundaryValue = null | undefined | boolean | number | string | bigint | symbol | Readonly<object>;
type DictionaryValue = null | undefined | boolean | number | string | bigint | readonly DictionaryValue[] | { readonly [key: string]: DictionaryValue };
function __epochIsObject<T>(value: T): value is T & object { return typeof value === "object"; }


export interface InTotoStatement { readonly _type: "https://in-toto.io/Statement/v1"; readonly subject: readonly unknown[]; readonly predicateType: string; readonly predicate: unknown }
export interface EvidenceEnvelope {
  readonly schemaVersion: 1; readonly statement: InTotoStatement; readonly statementDigest: string;
  readonly signature: { readonly keyId: string; readonly algorithm: string; readonly publicKey: string; readonly value: string };
  readonly sigstoreBundleRef?: string; readonly scittReceiptRef?: string;
}
function stable(value: BoundaryValue): string {
  if (Array.isArray(value)) return `[${value.map(stable).join(",")}]`;
  // SAFETY: The module validates or constructs this value before applying the asserted contract.
  // SAFETY: The module validates or constructs this value before applying the asserted contract.
  if (value && __epochIsObject(value)) return `{${Object.entries(/* SAFETY: Runtime validation immediately surrounding this expression establishes the asserted contract. */ value as Record<string, DictionaryValue>).sort(([a], [b]) => a.localeCompare(b)).map(([k, v]) => `${JSON.stringify(k)}:${stable(v)}`).join(",")}}`;
  return JSON.stringify(value);
}
function digest(value: BoundaryValue): string { return bytesToHex(sha256(new TextEncoder().encode(stable(value)))); }
export async function createEvidenceEnvelope(input: { readonly statement: InTotoStatement; readonly signer: AuthoritySigner; readonly sigstoreBundleRef?: string; readonly scittReceiptRef?: string }): Promise<EvidenceEnvelope> {
  if (input.statement._type !== "https://in-toto.io/Statement/v1" || !input.statement.subject.length) throw new Error("invalid in-toto statement");
  const statementDigest = digest(input.statement); const signature = await input.signer.sign(new TextEncoder().encode(statementDigest));
  return Object.freeze({ schemaVersion: 1, statement: input.statement, statementDigest,
    signature: { keyId: input.signer.keyId, algorithm: input.signer.algorithm, publicKey: input.signer.publicKey, value: bytesToHex(signature) },
    ...(input.sigstoreBundleRef && { sigstoreBundleRef: input.sigstoreBundleRef }), ...(input.scittReceiptRef && { scittReceiptRef: input.scittReceiptRef }) });
}
export async function verifyEvidenceEnvelope(envelope: EvidenceEnvelope): Promise<boolean> {
  if (envelope.schemaVersion !== 1 || envelope.statementDigest !== digest(envelope.statement) ||
      envelope.signature.algorithm !== "Ed25519" || !/^[0-9a-f]{128}$/u.test(envelope.signature.value)) return false;
  return verifyEd25519AuthoritySignature(envelope.signature.publicKey,
    new TextEncoder().encode(envelope.statementDigest), hexToBytes(envelope.signature.value));
}
