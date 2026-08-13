import { canonicalManifest, type ExtensionManifest } from "./manifest";
import {
  EMPTY_PUBLISHER_LIFECYCLE,
  evaluatePublisher,
  isExpired,
  type PublisherLifecycle,
  type PublisherRevocation,
  type SuccessorStatement,
} from "./publisher";
import { ed25519ManifestVerifier, type ManifestSignatureVerifier } from "./signing";

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
  /**
   * Expiry, succession, and revocation statements in force here (ADR-0046).
   *
   * Optional so a caller that does not care about publisher lifecycle gets
   * today's behaviour; absent means no successions and no revocations, never
   * "revocations do not apply".
   */
  readonly lifecycle?: PublisherLifecycle;
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
  | "publisher-revoked"
  | "signature-expired"
  | "unsigned";

export interface TrustDecision {
  readonly trusted: boolean;
  readonly reason: TrustReason;
  /** Operator-facing explanation; safe to print verbatim. */
  readonly detail: string;
}

export interface TrustEvaluationOptions {
  readonly verifySignature?: ManifestSignatureVerifier;
  /** Actual SHA-256 of the on-disk executable, in lowercase hex. */
  readonly executableSha256?: string;
  /** Injected so expiry and revocation windows are testable without waiting. */
  readonly now?: Date;
}

/** The exact bytes a publisher signs. */
export function manifestSigningPayload(manifest: ExtensionManifest): string {
  return canonicalManifest(manifest);
}

/** One thing wrong with an `[extensions]` table, named by key (ADR-0048). */
export interface TrustPolicyDiagnostic {
  readonly key: string;
  readonly message: string;
}

export interface TrustPolicyRead {
  readonly policy: ExtensionTrustPolicy;
  /** Empty when the table said exactly what the operator meant. */
  readonly diagnostics: readonly TrustPolicyDiagnostic[];
}

const POLICY_KEYS = new Set(["trust", "allow", "block", "allow_publishers", "revoked_publishers"]);

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
      lifecycle: {
        successors: [],
        revocations: [],
        // Local, immediate, and unsigned: the operator's own file is the
        // authority, which is what makes this the answer when the key holder
        // is exactly who they are defending against (ADR-0046).
        revokedPublishers: strings("revoked_publishers"),
      },
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
 * Add replicated publisher statements to a policy.
 *
 * Consent does not replicate and revocation does, which sounds contradictory
 * until the direction of authority is named: a grant only ever adds authority,
 * so it must stay where it was given; a revocation only ever removes it, so
 * spreading it can only ever be safe. Statements arriving this way carry their
 * own proof and are verified where they are used, not where they arrived.
 */
export function withPublisherStatements(
  policy: ExtensionTrustPolicy,
  statements: {
    readonly successors: readonly SuccessorStatement[];
    readonly revocations: readonly PublisherRevocation[];
  },
): ExtensionTrustPolicy {
  const lifecycle = policy.lifecycle ?? EMPTY_PUBLISHER_LIFECYCLE;
  return {
    ...policy,
    lifecycle: {
      ...lifecycle,
      successors: [...lifecycle.successors, ...statements.successors],
      revocations: [...lifecycle.revocations, ...statements.revocations],
    },
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
    if (manifest.publisher === undefined) {
      return {
        trusted: false,
        reason: "publisher-not-allowed",
        detail: `extension '${name}' names a publisher that is not in allow_publishers`,
      };
    }
    // Revocation and succession are resolved before the allow list is
    // consulted, so a revoked key cannot be trusted by being listed and a
    // rotated key does not have to be pasted into every clone (ADR-0046).
    const status = evaluatePublisher(
      manifest.publisher,
      policy.allowPublishers,
      policy.lifecycle ?? EMPTY_PUBLISHER_LIFECYCLE,
      { now: options.now, verifySignature: options.verifySignature },
    );
    if (status.kind === "revoked") {
      return {
        trusted: false,
        reason: "publisher-revoked",
        detail: `extension '${name}' is signed by a publisher revoked by ${status.origin === "self" ? "its own key" : "this repository"}`
          + `${status.reason === undefined ? "" : `: ${status.reason}`}`,
      };
    }
    if (status.kind !== "allowed") {
      return {
        trusted: false,
        reason: "publisher-not-allowed",
        detail: `extension '${name}' names a publisher that is not in allow_publishers`,
      };
    }
    // Expiry is checked after the publisher because "this key is revoked" and
    // "this signature is stale" have different remedies, and the operator
    // should be told the more serious one.
    if (isExpired(manifest.notAfter, options.now)) {
      return {
        trusted: false,
        reason: "signature-expired",
        detail: `extension '${name}' has a signature that expired at ${manifest.notAfter}`,
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
    return {
      trusted: true,
      reason: "allowed-by-publisher",
      detail: status.via === "direct"
        ? `extension '${name}' is signed by an allowed publisher`
        : `extension '${name}' is signed by a key ${status.depth} rotation(s) from an allowed publisher`,
    };
  }
  return {
    trusted: false,
    reason: "not-allowed",
    detail: `extension '${name}' is installed but not trusted; run 'epoch ext trust ${name}' to allow it`,
  };
}
