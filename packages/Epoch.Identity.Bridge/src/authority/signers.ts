import { ed25519 } from "@noble/curves/ed25519";
import { sha256 } from "@noble/hashes/sha256";
import { bytesToHex, hexToBytes } from "@noble/hashes/utils";

export interface AuthoritySigner {
  readonly keyId: string;
  readonly algorithm: "Ed25519" | "secp256k1" | "test-only";
  readonly publicKey: string;
  sign(message: Uint8Array): Promise<Uint8Array>;
}

export class LocalEd25519AuthoritySigner implements AuthoritySigner {
  readonly algorithm = "Ed25519" as const;
  readonly publicKey: string;
  readonly #secret: Uint8Array;
  constructor(secret: Uint8Array, readonly keyId: string) {
    if (secret.length !== 32) throw new Error("Ed25519 secret must contain 32 bytes");
    this.#secret = Uint8Array.from(secret);
    this.publicKey = bytesToHex(ed25519.getPublicKey(this.#secret));
  }
  async sign(message: Uint8Array): Promise<Uint8Array> { return ed25519.sign(message, this.#secret); }
}

export async function verifyEd25519AuthoritySignature(publicKey: string, message: Uint8Array, signature: Uint8Array): Promise<boolean> {
  try { return ed25519.verify(signature, message, hexToBytes(publicKey)); } catch { return false; }
}

export interface Nip46AuthorityTransport {
  readonly keyId: string;
  readonly publicKey: string;
  request(method: "sign_event", params: readonly string[]): Promise<string>;
}

export class Nip46AuthoritySigner implements AuthoritySigner {
  readonly algorithm = "secp256k1" as const;
  readonly keyId: string;
  readonly publicKey: string;
  readonly #transport: Nip46AuthorityTransport;
  constructor(transport: Nip46AuthorityTransport) {
    if (!/^[0-9a-f]{64}$/u.test(transport.publicKey)) throw new Error("NIP-46 public key must be 32-byte lowercase hex");
    this.#transport = transport;
    this.keyId = transport.keyId;
    this.publicKey = transport.publicKey;
  }
  async sign(message: Uint8Array): Promise<Uint8Array> {
    const result = await this.#transport.request("sign_event", [bytesToHex(message)]);
    if (!/^[0-9a-f]{128}$/u.test(result)) throw new Error("NIP-46 signer returned malformed signature");
    return hexToBytes(result);
  }
}

/** Deterministic fixture signer. Production callers must reject algorithm=test-only. */
export class TestAuthoritySigner implements AuthoritySigner {
  readonly algorithm = "test-only" as const;
  readonly publicKey: string;
  readonly #seed: Uint8Array;
  constructor(readonly keyId: string, seed: Uint8Array) {
    if (!seed.length) throw new Error("test signer seed must be non-empty");
    this.#seed = Uint8Array.from(seed);
    this.publicKey = bytesToHex(sha256(this.#seed));
  }
  async sign(message: Uint8Array): Promise<Uint8Array> {
    const payload = new Uint8Array(this.#seed.length + message.length);
    payload.set(this.#seed); payload.set(message, this.#seed.length);
    return sha256(payload);
  }
}
