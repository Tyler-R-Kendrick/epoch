import type { CapabilityKind, DeterminismClass } from "./manifest";

/**
 * The typed capability registry (ADR-0037).
 *
 * Command extensions are the least interesting kind. This registry admits
 * providers for the capabilities that actually shape repository behavior —
 * syntax, diff, merge, compression, views, codecs, hooks — so builtins and
 * extensions run on one contract instead of two.
 */

export interface CapabilityMatch {
  readonly language?: string;
  readonly mimeType?: string;
  readonly extension?: string;
  readonly wildcard?: boolean;
}

export interface CapabilityProvider<T = unknown> {
  readonly id: string;
  readonly capability: CapabilityKind;
  readonly version: string;
  readonly source: "builtin" | "extension";
  readonly determinism: DeterminismClass;
  readonly match?: CapabilityMatch;
  readonly manifestDigest?: string;
  readonly configDigest?: string;
  readonly value: T;
}

/**
 * The provenance recorded alongside any signed state a provider contributed
 * to.
 *
 * Git records nothing about which merge driver or filter shaped content. This
 * descriptor is what lets a verifier answer "which engine produced this, and
 * would I reproduce it?" from history alone.
 */
export interface ProviderDescriptor {
  readonly providerId: string;
  readonly capability: CapabilityKind;
  readonly version: string;
  readonly source: "builtin" | "extension";
  readonly determinism: DeterminismClass;
  readonly manifestDigest?: string;
  readonly configDigest?: string;
}

export interface CapabilityRequest {
  readonly language?: string;
  readonly mimeType?: string;
  readonly path?: string;
  /**
   * True when the result will contribute to signed state. Advisory providers
   * are excluded, mirroring the ADR-0031 rule for AI conflict proposals.
   */
  readonly forSignedState?: boolean;
}

export type RegistryErrorCode = "duplicate-provider" | "unknown-pin";

export class CapabilityRegistryError extends Error {
  constructor(readonly code: RegistryErrorCode, message: string) {
    super(message);
    this.name = "CapabilityRegistryError";
  }
}

/** Specificity of a provider's match, higher wins. Ties break on provider ID. */
function specificity(match: CapabilityMatch | undefined, request: CapabilityRequest): number | undefined {
  // A provider that declares no match is the wildcard of last resort, which is
  // what makes every capability total rather than occasionally unresolvable.
  if (match === undefined) return 1;
  if (match.language !== undefined) return match.language === request.language ? 4 : undefined;
  if (match.mimeType !== undefined) return match.mimeType === request.mimeType ? 3 : undefined;
  if (match.extension !== undefined) {
    const path = request.path?.toLowerCase() ?? "";
    return path.endsWith(match.extension.toLowerCase()) ? 2 : undefined;
  }
  if (match.wildcard === true) return 1;
  return undefined;
}

export class CapabilityRegistry {
  private readonly providers = new Map<string, CapabilityProvider>();
  private readonly pins = new Map<CapabilityKind, string>();

  /** Register a provider. Duplicate IDs fail rather than silently shadowing. */
  register<T>(provider: CapabilityProvider<T>): this {
    const key = `${provider.capability}:${provider.id}`;
    if (this.providers.has(key)) {
      throw new CapabilityRegistryError("duplicate-provider", `provider already registered: ${key}`);
    }
    this.providers.set(key, provider as CapabilityProvider);
    return this;
  }

  /**
   * Pin a capability to one provider ID.
   *
   * A repository that pins its providers gets byte-identical diffs and merges
   * across clones; one that does not still gets deterministic resolution.
   */
  pin(capability: CapabilityKind, providerId: string): this {
    if (!this.providers.has(`${capability}:${providerId}`)) {
      throw new CapabilityRegistryError("unknown-pin", `cannot pin unknown provider: ${capability}:${providerId}`);
    }
    this.pins.set(capability, providerId);
    return this;
  }

  list(capability?: CapabilityKind): readonly CapabilityProvider[] {
    const all = [...this.providers.values()].filter(
      (provider) => capability === undefined || provider.capability === capability,
    );
    return all.sort((left, right) => left.capability.localeCompare(right.capability) || left.id.localeCompare(right.id));
  }

  /**
   * Resolve a capability deterministically.
   *
   * Order is: explicit pin, then match specificity (language, MIME type,
   * extension, wildcard), then provider ID lexicographically. Registration
   * order and filesystem enumeration order never decide the winner, which is
   * what keeps signed diffs and merges reproducible.
   */
  resolve<T>(capability: CapabilityKind, request: CapabilityRequest = {}): CapabilityProvider<T> | undefined {
    const candidates = this.list(capability).filter(
      (provider) => request.forSignedState !== true || provider.determinism === "deterministic",
    );

    const pinned = this.pins.get(capability);
    if (pinned !== undefined) {
      const match = candidates.find((provider) => provider.id === pinned);
      if (match !== undefined) return match as CapabilityProvider<T>;
    }

    const scored = candidates
      .map((provider) => ({ provider, score: specificity(provider.match, request) }))
      .filter((entry): entry is { provider: CapabilityProvider; score: number } => entry.score !== undefined)
      .sort((left, right) => right.score - left.score || left.provider.id.localeCompare(right.provider.id));

    return scored[0]?.provider as CapabilityProvider<T> | undefined;
  }

  /** The descriptor to record in any signed event this provider shaped. */
  static describe(provider: CapabilityProvider): ProviderDescriptor {
    return {
      providerId: provider.id,
      capability: provider.capability,
      version: provider.version,
      source: provider.source,
      determinism: provider.determinism,
      manifestDigest: provider.manifestDigest,
      configDigest: provider.configDigest,
    };
  }
}
