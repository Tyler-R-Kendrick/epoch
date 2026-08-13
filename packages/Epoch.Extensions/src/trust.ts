import type { ExtensionManifest } from "./manifest";

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
    if (manifest.publisher === undefined || !policy.allowPublishers.includes(manifest.publisher)) {
      return {
        trusted: false,
        reason: "publisher-not-allowed",
        detail: `extension '${name}' is signed by a publisher that is not in allow_publishers`,
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
