/**
 * `@epoch/extensions` — the Epoch extension mechanism (ADR-0037).
 *
 * Two tiers on one manifest, one trust policy, and one provenance rule:
 * external `epoch-*` subcommands, and a typed capability registry that
 * builtins and extensions share.
 */
export {
  canonicalManifest,
  parseExtensionManifest,
  CAPABILITY_KINDS,
  EXTENSION_API_VERSION,
  extensionManifestFile,
  ExtensionManifestError,
  type CapabilityKind,
  type DeterminismClass,
  type ExtensionManifest,
  type ManifestErrorCode,
} from "./manifest";

export {
  DEFAULT_TRUST_POLICY,
  ed25519ManifestVerifier,
  evaluateTrust,
  manifestSigningPayload,
  readTrustPolicy,
  type ExtensionTrustPolicy,
  type ManifestSignatureVerifier,
  type TrustDecision,
  type TrustEvaluationOptions,
  type TrustMode,
  type TrustReason,
} from "./trust";

export {
  CapabilityRegistry,
  CapabilityRegistryError,
  type CapabilityMatch,
  type CapabilityProvider,
  type CapabilityRequest,
  type PinnedIdentity,
  type ProviderDescriptor,
  type RegistryErrorCode,
} from "./registry";

export {
  discoverExtensions,
  nodeExtensionFileSystem,
  EXTENSION_PREFIX,
  type DiscoveredExtension,
  type DiscoveryOptions,
  type ExtensionFileSystem,
  type ExtensionSource,
} from "./discovery";

export {
  buildExternalInvocation,
  resolveSubcommand,
  shadowedExtensions,
  type ExternalInvocation,
  type InvocationContext,
  type SubcommandResolution,
  type SubcommandResolutionOptions,
} from "./dispatch";
