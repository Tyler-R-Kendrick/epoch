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
  isExtensionName,
  type CapabilityKind,
  type DeterminismClass,
  type ExtensionManifest,
  type ManifestErrorCode,
} from "./manifest";

export {
  ed25519ManifestVerifier,
  type ManifestSignatureVerifier,
} from "./signing";

export {
  DEFAULT_SUCCESSION_DEPTH,
  EMPTY_PUBLISHER_LIFECYCLE,
  evaluatePublisher,
  isExpired,
  revocationSigningPayload,
  successorSigningPayload,
  type PublisherEvaluationOptions,
  type PublisherLifecycle,
  type PublisherRevocation,
  type PublisherStatus,
  type SuccessorStatement,
} from "./publisher";

export {
  DEFAULT_TRUST_POLICY,
  evaluateTrust,
  manifestSigningPayload,
  readTrustPolicy,
  readTrustPolicyReport,
  withPublisherStatements,
  withRecordedConsent,
  type ExtensionTrustPolicy,
  type TrustDecision,
  type TrustEvaluationOptions,
  type TrustGrant,
  type TrustMode,
  type TrustPolicyDiagnostic,
  type TrustPolicyRead,
  type TrustReason,
} from "./trust";

export {
  EMPTY_TRUST_STORE,
  grantTrust,
  parseTrustStore,
  revokeTrust,
  serializeTrustStore,
  TRUST_STORE_VERSION,
  TrustStoreError,
  type TrustStore,
} from "./store";

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
  DEFAULT_WASM_LIMITS,
  instantiateWasmSyntaxModule,
  limitBytes,
  wasmSyntaxProvider,
  WASM_PROVIDER_ABI_VERSION,
  WasmProviderError,
  type WasmProviderDeclaration,
  type WasmProviderErrorCode,
  type WasmProviderLimits,
  type WasmSyntaxModule,
} from "./wasm";

export {
  loadSyntaxProviders,
  type LoadedProvider,
  type LoadProvidersOptions,
  type ProviderLoadFailure,
  type ProviderLoadResult,
  type ProviderModuleReader,
} from "./providers";

export {
  descriptorPath,
  LAUNCH_DESCRIPTOR_SLOT,
  launchVerificationFor,
  planLaunch,
  type LaunchOptions,
  type LaunchPlan,
  type LaunchVerification,
} from "./launch";

export {
  buildExternalInvocation,
  resolveSubcommand,
  shadowedExtensions,
  type ExternalInvocation,
  type InvocationContext,
  type SubcommandResolution,
  type SubcommandResolutionOptions,
} from "./dispatch";
