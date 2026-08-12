import { sha256 } from "@noble/hashes/sha256";
import { bytesToHex } from "@noble/hashes/utils";
import type { AuthoritySigner } from "../authority/signers";

export interface InTotoStatement { readonly _type: "https://in-toto.io/Statement/v1"; readonly subject: readonly unknown[]; readonly predicateType: string; readonly predicate: unknown }
export interface EvidenceEnvelope {
  readonly schemaVersion: 1; readonly statement: InTotoStatement; readonly statementDigest: string;
  readonly signature: { readonly keyId: string; readonly algorithm: string; readonly publicKey: string; readonly value: string };
  readonly sigstoreBundleRef?: string; readonly scittReceiptRef?: string;
}
function stable(value: unknown): string {
  if (Array.isArray(value)) return `[${value.map(stable).join(",")}]`;
  if (value && typeof value === "object") return `{${Object.entries(value as Record<string, unknown>).sort(([a], [b]) => a.localeCompare(b)).map(([k, v]) => `${JSON.stringify(k)}:${stable(v)}`).join(",")}}`;
  return JSON.stringify(value);
}
function digest(value: unknown): string { return bytesToHex(sha256(new TextEncoder().encode(stable(value)))); }
export async function createEvidenceEnvelope(input: { readonly statement: InTotoStatement; readonly signer: AuthoritySigner; readonly sigstoreBundleRef?: string; readonly scittReceiptRef?: string }): Promise<EvidenceEnvelope> {
  if (input.statement._type !== "https://in-toto.io/Statement/v1" || !input.statement.subject.length) throw new Error("invalid in-toto statement");
  const statementDigest = digest(input.statement); const signature = await input.signer.sign(new TextEncoder().encode(statementDigest));
  return Object.freeze({ schemaVersion: 1, statement: input.statement, statementDigest,
    signature: { keyId: input.signer.keyId, algorithm: input.signer.algorithm, publicKey: input.signer.publicKey, value: bytesToHex(signature) },
    ...(input.sigstoreBundleRef ? { sigstoreBundleRef: input.sigstoreBundleRef } : {}), ...(input.scittReceiptRef ? { scittReceiptRef: input.scittReceiptRef } : {}) });
}
export async function verifyEvidenceEnvelope(envelope: EvidenceEnvelope): Promise<boolean> { return envelope.schemaVersion === 1 && envelope.statementDigest === digest(envelope.statement) && /^[0-9a-f]+$/u.test(envelope.signature.value); }
