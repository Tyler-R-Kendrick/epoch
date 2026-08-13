import { createPublicKey, verify as verifySignature } from "node:crypto";
import { canonicalManifest, type ExtensionManifest } from "./manifest";

/**
 * Extension trust policy (ADR-0037).
 *
 * Discovery is not execution. Git conflates the two; Epoch keeps them separate
 * so that an installed-but-unconsented extension is reported rather than
 * silently run or silently ignored.
 */
export type TrustMode = "explicit" | "signed" | "any";

export interface ExtensionTrustPolicy {
  readonly trust: TrustMode;
  readonly allow: readonly string[];
  readonly block: readonly string[];
  readonly allowPublishers: readonly string[];
}

export const DEFAULT_TRUST_POLICY: ExtensionTrustPolicy = {
  trust: "explicit",
  allow: [],
  block: [],
  allowPublishers: [],
};

export type TrustReason =
  | "allowed-by-name"
  | "allowed-by-publisher"
  | "allowed-by-open-policy"
  | "blocked-by-name"
  | "executable-mismatch"
  | "invalid-signature"
  | "missing-manifest"
  | "not-allowed"
  | "publisher-not-allowed"
  | "unsigned";

export interface TrustDecision {
  readonly trusted: boolean;
  readonly reason: TrustReason;
  /** Operator-facing explanation; safe to print verbatim. */
  readonly detail: string;
}

/**
 * Verifies a detached signature over the canonical manifest.
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

export interface TrustEvaluationOptions {
  readonly verifySignature?: ManifestSignatureVerifier;
  /** Actual SHA-256 of the on-disk executable, in lowercase hex. */
  readonly executableSha256?: string;
}

/** The exact bytes a publisher signs. */
export function manifestSigningPayload(manifest: ExtensionManifest): string {
  return canonicalManifest(manifest);
}

/**
 * Default Ed25519 verifier.
 *
 * The publisher identifier carries the base64url SPKI DER of the signing key,
 * and the signature is `ed25519:<base64>`. Any malformed input is a failed
 * verification, never a pass.
 */
export const ed25519ManifestVerifier: ManifestSignatureVerifier = ({ payload, signature, publisher }) => {
  try {
    const encodedKey = publisher.slice("epoch:principal:".length);
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

/**
 * Read a trust policy out of the `[extensions]` table of repository config.
 *
 * Unknown values fail closed to `explicit` rather than widening trust.
 */
export function readTrustPolicy(table: Record<string, unknown> | undefined): ExtensionTrustPolicy {
  if (table === undefined) return DEFAULT_TRUST_POLICY;
  const strings = (value: unknown): readonly string[] =>
    Array.isArray(value) ? value.filter((entry): entry is string => typeof entry === "string") : [];
  const requested = table.trust;
  const trust: TrustMode = requested === "signed" || requested === "any" ? requested : "explicit";
  return {
    trust,
    allow: strings(table.allow),
    block: strings(table.block),
    allowPublishers: strings(table.allow_publishers),
  };
}

/**
 * Decide whether a discovered extension may run.
 *
 * `block` always wins, and a missing manifest is never trusted regardless of
 * mode — including under `any`, where the manifest is still the thing that
 * declares which capabilities the extension is asking for.
 */
export function evaluateTrust(
  name: string,
  manifest: ExtensionManifest | undefined,
  policy: ExtensionTrustPolicy = DEFAULT_TRUST_POLICY,
  options: TrustEvaluationOptions = {},
): TrustDecision {
  if (policy.block.includes(name)) {
    return { trusted: false, reason: "blocked-by-name", detail: `extension '${name}' is blocked by repository policy` };
  }
  if (manifest === undefined) {
    return {
      trusted: false,
      reason: "missing-manifest",
      detail: `extension '${name}' has no valid epoch-extension.toml and cannot declare its capabilities`,
    };
  }
  if (policy.allow.includes(name)) {
    return { trusted: true, reason: "allowed-by-name", detail: `extension '${name}' is explicitly allowed` };
  }
  if (policy.trust === "any") {
    return { trusted: true, reason: "allowed-by-open-policy", detail: `extensions trust mode is 'any'` };
  }
  if (policy.trust === "signed") {
    if (manifest.signature === undefined) {
      return { trusted: false, reason: "unsigned", detail: `extension '${name}' has no manifest signature` };
    }
    // `publisher` is manifest input and therefore attacker-controlled. It only
    // narrows which key is allowed to have signed; it never establishes that
    // anyone did. The cryptographic check below is what grants trust.
    if (manifest.publisher === undefined || !policy.allowPublishers.includes(manifest.publisher)) {
      return {
        trusted: false,
        reason: "publisher-not-allowed",
        detail: `extension '${name}' names a publisher that is not in allow_publishers`,
      };
    }
    if (manifest.executableSha256 === undefined) {
      return {
        trusted: false,
        reason: "unsigned",
        detail: `extension '${name}' has a signature that does not bind its executable`,
      };
    }
    // An unreadable or unsupplied digest is not "no objection": the binding
    // between manifest and binary is the whole point of the signature, so an
    // unverifiable binding fails closed rather than being skipped.
    if (options.executableSha256 === undefined || options.executableSha256 !== manifest.executableSha256) {
      return {
        trusted: false,
        reason: "executable-mismatch",
        detail: options.executableSha256 === undefined
          ? `extension '${name}' executable could not be digested, so its signature cannot be bound to the binary`
          : `extension '${name}' executable does not match the digest its manifest signs`,
      };
    }
    const verifier = options.verifySignature ?? ed25519ManifestVerifier;
    const verified = verifier({
      payload: manifestSigningPayload(manifest),
      signature: manifest.signature,
      publisher: manifest.publisher,
    });
    if (!verified) {
      return {
        trusted: false,
        reason: "invalid-signature",
        detail: `extension '${name}' manifest signature did not verify against its declared publisher`,
      };
    }
    return { trusted: true, reason: "allowed-by-publisher", detail: `extension '${name}' is signed by an allowed publisher` };
  }
  return {
    trusted: false,
    reason: "not-allowed",
    detail: `extension '${name}' is installed but not trusted; run 'epoch ext trust ${name}' to allow it`,
  };
}
