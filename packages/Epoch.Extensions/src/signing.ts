import { createPublicKey, verify as verifySignature } from "node:crypto";

/**
 * Signature verification for extension statements (ADR-0037, ADR-0046).
 *
 * Its own module because three things now need it — manifests, succession
 * statements, and self-revocations — and the alternative was a cycle between
 * the trust policy and the publisher lifecycle.
 */

/**
 * Verifies a detached signature over a canonical payload.
 *
 * Injected so the check is testable and so a host can substitute its own key
 * handling. The default is Ed25519 over an SPKI public key, matching the
 * signing scheme Epoch already uses for events.
 */
export type ManifestSignatureVerifier = (request: {
  readonly payload: string;
  readonly signature: string;
  readonly publisher: string;
}) => boolean;

/**
 * Default Ed25519 verifier.
 *
 * The publisher identifier carries the base64url SPKI DER of the signing key,
 * and the signature is `ed25519:<base64>`. Any malformed input is a failed
 * verification, never a pass.
 */
export const ed25519ManifestVerifier: ManifestSignatureVerifier = ({ payload, signature, publisher }) => {
  try {
    // The prefix is checked rather than assumed: `slice` would remove 16
    // characters from any string, so an identifier in the wrong shape would
    // lose key material and be reported as a bad signature rather than as the
    // malformed publisher it is.
    const prefix = "epoch:principal:";
    if (!publisher.startsWith(prefix)) return false;
    const encodedKey = publisher.slice(prefix.length);
    if (encodedKey.length === 0) return false;
    const [algorithm, encodedSignature] = signature.split(":");
    if (algorithm !== "ed25519" || encodedSignature === undefined || encodedSignature.length === 0) return false;
    const key = createPublicKey({
      key: Buffer.from(encodedKey, "base64url"),
      format: "der",
      type: "spki",
    });
    return verifySignature(null, Buffer.from(payload, "utf8"), key, Buffer.from(encodedSignature, "base64"));
  } catch {
    return false;
  }
};
