export { BundleEpochTransport, EpochRepository, Event, GIT_AUTHOR_EMAIL, GIT_AUTHOR_NAME, JsonSerializationProvider, MemoryEpochTransport, commitGit, createToonSerializationProvider } from "./core";
export type { CheckoutOptions, CheckoutResult, CollaborationProjection, CreateVersionOptions, EpochHook, EpochHookEvent, EpochHookName, EpochRepositoryCreateOptions, EpochRepositoryOptions, EpochSerializationProvider, EpochTransport, GatePolicy, GateStatus, GossipPeer, IdentityData, InclusionRule, IntentDecision, MaterializationSetting, MaterializeVersionOptions, MaterializeVersionResult, MemoryEpochTransportSnapshot, PolicyOptions, PolicyProjection, PreviewOptions, PushOptions, PushResult, RedactionPlan, SyncResult, ViewDefinition, ViewDiff, ViewMetadata, ViewState } from "./core";
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
export { CRDTEventLog, CRDTRegistry, CsvTableCRDT, EntityRegistry, JsonMapCRDT, TextWeaveCRDT, diffLines, dumpEntity, loadEntity, threeWayMerge } from "./crdt";
export type { CRDTOperation, EntityAdapter, TextHunk } from "./crdt";
export { applyUnifiedDiff, formatUnifiedDiff, isTextBlob } from "./patch";
export type { UnifiedDiffInput } from "./patch";
export { canonicalJson } from "./json";
export { ActorCommand, DefaultAuthor, EntityType, EventType, IntentStatus, JsonEncoding, MaterializationMode, Schemas, StorageName, Symbols, VirtualCheckoutFormat, VirtualCheckoutSchema, VirtualRecordStatus } from "./domain";
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
