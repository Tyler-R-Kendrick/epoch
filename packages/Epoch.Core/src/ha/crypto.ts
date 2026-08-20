import { createHash, sign, verify } from "node:crypto";
import { canonicalJson } from "../json";

const HASH_ALGORITHM = "sha256";
const HASH_DIGEST = "hex";
const SIGNATURE_ENCODING = "base64";

export function sha256(data: string | Buffer): string {
  return createHash(HASH_ALGORITHM).update(data).digest(HASH_DIGEST);
}

export function signJson<Value>(value: Value, privateKey: string): string {
  return sign(null, Buffer.from(canonicalJson(value)), privateKey).toString(SIGNATURE_ENCODING);
}

export function verifyJsonSignature<Value>(value: Value, signature: string, publicKey: string): boolean {
  return verify(null, Buffer.from(canonicalJson(value)), publicKey, Buffer.from(signature, SIGNATURE_ENCODING));
}
