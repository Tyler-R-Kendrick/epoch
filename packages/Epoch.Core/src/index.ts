export { EpochRepository, Event, GIT_AUTHOR_EMAIL, GIT_AUTHOR_NAME, commitGit } from "./core";
export type { EpochHook, EpochHookEvent, EpochHookName, EpochRepositoryOptions, IdentityData, IntentDecision, PolicyOptions, PolicyProjection, SyncResult } from "./core";
export { EpochActorSystem, EpochUserActor } from "./actors";
export { CRDTEventLog, CRDTRegistry, JsonMapCRDT, TextWeaveCRDT, dumpEntity, loadEntity, threeWayMerge } from "./crdt";
export type { CRDTOperation } from "./crdt";
export { canonicalJson } from "./json";
export { ActorCommand, DefaultAuthor, EntityType, EventType, IntentStatus, JsonEncoding, Schemas, StorageName, Symbols } from "./domain";
export type { EventData, EventId, EventMetadata, EventPayload, IntentCommentPayload, IntentMergePayload, IntentPayload, IntentRejectPayload, RepositoryPath } from "./domain";
