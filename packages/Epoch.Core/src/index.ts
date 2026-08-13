export { BundleEpochTransport, EpochRepository, Event, GIT_AUTHOR_EMAIL, GIT_AUTHOR_NAME, JsonSerializationProvider, MemoryEpochTransport, commitGit, createToonSerializationProvider } from "./core";
export type { AppendWithParentsOptions, CheckoutOptions, CheckoutResult, CollaborationProjection, CreateVersionOptions, EpochConfigProblem, EpochConfigRead, EpochHook, EpochHookEvent, EpochHookName, EpochRepositoryConfig, EpochRepositoryCreateOptions, EpochRepositoryOptions, EpochSerializationProvider, EpochTransport, GatePolicy, GateStatus, GossipPeer, IdentityData, InclusionRule, IntentDecision, MaterializationSetting, MaterializeVersionOptions, MaterializeVersionResult, MemoryEpochTransportSnapshot, PolicyOptions, PolicyProjection, PreviewOptions, PushOptions, PushResult, RedactionPlan, SyncResult, ViewDefinition, ViewDiff, ViewMetadata, ViewState } from "./core";
export {
  HttpGossipPeer,
  LocalGossipPeer,
  NetworkEpochTransport,
  gossipWithPeer,
  gossipWithUrl,
  parseSnapshot,
  startGossipServer,
} from "./gossip";
export type { GossipServer } from "./gossip";
export { EpochActorSystem, EpochUserActor } from "./actors";
export { CRDTEventLog, CRDTRegistry, CsvTableCRDT, EntityRegistry, JsonMapCRDT, TextWeaveCRDT, diffLines, dumpEntity, loadEntity, threeWayMerge, validateCodeOperation } from "./crdt";
export type { CodeOperation, CodeOperationContext, CodeOperationFilter, CodeOperationRecord, EntityAdapter, TextHunk } from "./crdt";
export {
  SelectAll,
  SelectNone,
  SelectionError,
  canonicalSelectionPath,
  formatSelection,
  normalizeSelection,
  parseSelection,
  resolveSelection,
  selectDifference,
  selectIntersection,
  selectPath,
  selectProfile,
  selectUnion,
  selectionDigest,
} from "./selection";
export type { ResolveSelectionOptions, ResolvedSelection, SelectableResource, Selection, SelectionDepth, SelectionProfile } from "./selection";
export {
  buildNamespaceManifest,
  buildSparseIndex,
  lookupNamespaceEntry,
  namespaceResources,
  nodeDigest,
} from "./namespace";
export type {
  NamespaceDirectoryEntry,
  NamespaceEntityEntry,
  NamespaceEntry,
  NamespaceFileEntry,
  NamespaceInput,
  NamespaceLinkEntry,
  NamespaceLinkInput,
  NamespaceManifest,
  NamespaceNode,
  SparseIndex,
  SparseIndexEntry,
  SparseOpaqueSubtree,
} from "./namespace";
export {
  CompositionError,
  CompositionEventTypes,
  ExternalRevisionDependencySchema,
  RepositoryLinkSchema,
  assertCanonicalMount,
  compositionResources,
  createStaticLinkResolver,
  detectLinkRetargetConflicts,
  diagnoseAbsentPath,
  planCrossRepositoryPublication,
  planVendorUpdate,
  planVendorize,
  resolveComposition,
  translateSelectionForLink,
  validateExternalDependency,
  validateLink,
} from "./composition";
export type {
  CompositionOwnership,
  CrossRepositoryPublication,
  ExternalRevisionDependency,
  LinkRetargetConflict,
  LinkRetargetEvent,
  RepositoryLink,
  RepositoryLinkResolver,
  ResolveCompositionInput,
  ResolvedChildRepository,
  ResolvedComposition,
  ResolvedCompositionLink,
  ResolverHint,
  UnresolvedLink,
  VendorPlan,
  VendorProvenance,
  VendorUpdate,
} from "./composition";
export { applyUnifiedDiff, formatUnifiedDiff, isTextBlob } from "./patch";
export type { UnifiedDiffInput } from "./patch";
export { canonicalJson } from "./json";
export { parseTomlDocument, TomlDateTime, TomlError } from "./toml";
export { ActorCommand, CompositionEventType, CompositionFormat, DefaultAuthor, EntityType, EventType, IntentStatus, JsonEncoding, LinkAvailability, MaterializationMode, MaterializationModeAlias, NamespaceFormat, NamespaceShardThreshold, Schemas, SelectionFormat, SelectionSyntax, SparseIndexFormat, StorageName, Symbols, VirtualCheckoutFormat, VirtualCheckoutSchema, VirtualRecordStatus, WorkspaceSelectionStateSchema, normalizeMaterializationMode } from "./domain";
export type { CanonicalMaterializationMode, WorkspaceSelectionState } from "./domain";
export type { EventData, EventId, EventMetadata, EventPayload, IntentCommentPayload, IntentMergePayload, IntentPayload, IntentRejectPayload, RepositoryPath, VersionEntity, VersionFile, VersionPayload, VirtualCheckout, VirtualCheckoutRecord } from "./domain";
export { createCompact, pruneEventLogBeforeCompact, restoreFromCompact, latestCompact, verifyCompact } from "./ha/compact";
export type { Compact, CompactManifest, CompactManifestEntry } from "./ha/compact";
export { SeedNodeService, bootstrapFromSeed, bootstrapFromSeeds } from "./ha/seed";
export type { SeedNode, SeedNodeServiceOptions } from "./ha/seed";
export { LocalStorageBackend, createColdBackup, restoreFromColdBackup, verifyColdBackup } from "./ha/backup";
export type { ColdBackup, ColdBackupOptions, StorageBackend } from "./ha/backup";
export { disasterRecoveryPlan } from "./ha/dr-plan";
export { EPOCH_GIT_PROVIDER, EpochCLIGit, EpochCoreGit, UnsupportedGitOperationError, readEpochGitRemote, unsupported } from "./git";
export type { EpochGitCommandResult, EpochGitCommitResult, EpochGitRemote } from "./git";
export {
  GitMappingEventType,
  appendMirrorCheckpoint,
  epochContentHashes,
  ingestGitToEpoch,
  listGitMappingEvents,
  projectEpochToGit,
  rebuildProjectionCache,
} from "./git-projection";
export type {
  GitMappingEventTypeName,
  IngestGitToEpochOptions,
  IngestGitToEpochResult,
  MirrorCheckpoint,
  ProjectEpochToGitOptions,
  ProjectEpochToGitResult,
} from "./git-projection";
export * from "./blob-storage";
export * from "./chunks";
export * from "./change-graph-store";
export * from "./convergence-changes";
export * from "./convergence-transactions";
export * from "./object-store";
export * from "./promises";
export * from "./hydration";
export * from "./sandbox";
export * from "./spaces";
export * from "./sync-protocol-v2";
export * from "./sync-v2";
export * from "./workspace";
export * from "./workspace-providers";
