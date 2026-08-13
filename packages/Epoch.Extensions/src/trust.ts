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

/**
 * Consent recorded for one extension.
 *
 * The digest is required, not optional. A grant naming only the extension
 * trusts whatever binary happens to sit at that path later — Git's model, and
 * the thing this mechanism exists to improve on. Making it part of the type is
 * what stops that state from being representable: there is no way to record
 * consent without saying what was consented to.
 */
export interface TrustGrant {
  readonly name: string;
  /** SHA-256 of the executable at the moment consent was given. */
  readonly executableSha256: string;
}

export interface ExtensionTrustPolicy {
  readonly trust: TrustMode;
  /** Names allowed by hand-authored configuration, without a digest binding. */
  readonly allow: readonly string[];
  /** Consent recorded by `epoch ext trust`, bound to the binary consented to. */
  readonly grants: readonly TrustGrant[];
  readonly block: readonly string[];
  readonly allowPublishers: readonly string[];
}

export const DEFAULT_TRUST_POLICY: ExtensionTrustPolicy = {
  trust: "explicit",
  allow: [],
  grants: [],
  block: [],
  allowPublishers: [],
};

export type TrustReason =
  | "allowed-by-consent"
  | "allowed-by-name"
  | "allowed-by-publisher"
  | "allowed-by-open-policy"
  | "blocked-by-name"
  | "executable-changed"
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

/** One thing wrong with an `[extensions]` table, named by key (ADR-0044). */
export interface TrustPolicyDiagnostic {
  readonly key: string;
  readonly message: string;
}

export interface TrustPolicyRead {
  readonly policy: ExtensionTrustPolicy;
  /** Empty when the table said exactly what the operator meant. */
  readonly diagnostics: readonly TrustPolicyDiagnostic[];
}

const POLICY_KEYS = new Set(["trust", "allow", "block", "allow_publishers"]);

/**
 * Read a trust policy, reporting what it had to ignore.
 *
 * Coercion still fails closed — an unrecognised `trust` narrows to `explicit`,
 * a non-string entry is dropped — but it is no longer silent. `trust = "eny"`
 * is a typo whose consequence is a *narrower* policy than intended, which the
 * operator only discovers when something they expected to run does not; and
 * `block = [1]` is a denial that quietly does not exist. Reporting is per key
 * so one bad entry does not discard a whole table, which is the same failure
 * at smaller scale.
 */
export function readTrustPolicyReport(table: Record<string, unknown> | undefined): TrustPolicyRead {
  if (table === undefined) return { policy: DEFAULT_TRUST_POLICY, diagnostics: [] };
  const diagnostics: TrustPolicyDiagnostic[] = [];

  const strings = (key: string): readonly string[] => {
    const value = table[key];
    if (value === undefined) return [];
    if (!Array.isArray(value)) {
      diagnostics.push({ key, message: `expected an array of extension names, ignoring ${describe(value)}` });
      return [];
    }
    const kept = value.filter((entry): entry is string => typeof entry === "string");
    if (kept.length !== value.length) {
      diagnostics.push({ key, message: `ignored ${value.length - kept.length} entry that is not a name` });
    }
    return kept;
  };

  const requested = table.trust;
  const trust: TrustMode = requested === "signed" || requested === "any" ? requested : "explicit";
  if (requested !== undefined && requested !== "explicit" && trust === "explicit") {
    diagnostics.push({ key: "trust", message: `${describe(requested)} is not a trust mode; using "explicit"` });
  }
  for (const key of Object.keys(table)) {
    if (!POLICY_KEYS.has(key)) diagnostics.push({ key, message: "is not an extension policy key and has no effect" });
  }

  return {
    policy: {
      trust,
      allow: strings("allow"),
      grants: [],
      block: strings("block"),
      allowPublishers: strings("allow_publishers"),
    },
    diagnostics,
  };
}

/**
 * Read a trust policy out of the `[extensions]` table of repository config.
 *
 * Unknown values fail closed to `explicit` rather than widening trust. Callers
 * that can show the operator a diagnostic should prefer `readTrustPolicyReport`.
 */
export function readTrustPolicy(table: Record<string, unknown> | undefined): ExtensionTrustPolicy {
  return readTrustPolicyReport(table).policy;
}

function describe(value: unknown): string {
  return typeof value === "string" ? `"${value}"` : Array.isArray(value) ? "an array" : `a ${typeof value}`;
}

/**
 * Combine hand-authored policy with recorded consent.
 *
 * `block` is a union because a denial from either source must hold, and it is
 * checked before every allow, so neither file can be used to override the
 * other's revocation.
 */
export function withRecordedConsent(
  policy: ExtensionTrustPolicy,
  recorded: { readonly allow: readonly TrustGrant[]; readonly block: readonly string[] },
): ExtensionTrustPolicy {
  return {
    ...policy,
    grants: recorded.allow,
    block: [...new Set([...policy.block, ...recorded.block])],
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
  // Recorded consent is checked before the configuration allow list because it
  // is the stronger statement: it names a specific binary, not just a command.
  const grant = policy.grants.find((candidate) => candidate.name === name);
  if (grant !== undefined) {
    if (options.executableSha256 === grant.executableSha256) {
      return {
        trusted: true,
        reason: "allowed-by-consent",
        detail: `extension '${name}' matches the binary this operator trusted`,
      };
    }
    // Consent was given to a specific binary. A different one at the same path
    // has not been consented to, whether it is an upgrade or a substitution —
    // Epoch cannot tell those apart, and only the operator can.
    return {
      trusted: false,
      reason: "executable-changed",
      detail: options.executableSha256 === undefined
        ? `extension '${name}' could not be digested, so it cannot be matched against the binary you trusted`
        : `extension '${name}' has changed since you trusted it; re-run 'epoch ext trust ${name}' to consent to the new binary`,
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
