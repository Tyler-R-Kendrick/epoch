export { EpochRepository, Event, GIT_AUTHOR_EMAIL, GIT_AUTHOR_NAME, commitGit } from "./core";
export type { IdentityData, IntentDecision, PolicyOptions, PolicyProjection, SyncResult } from "./core";
export { EpochActorSystem, EpochUserActor } from "./actors";
export { CRDTRegistry, JsonMapCRDT, TextWeaveCRDT, dumpEntity, loadEntity, threeWayMerge } from "./crdt";
export { canonicalJson } from "./json";
export { ActorCommand, DefaultAuthor, EntityType, EventType, IntentStatus, JsonEncoding, Schemas, StorageName, Symbols } from "./domain";
export type { EventData, EventId, EventPayload, IntentMergePayload, IntentPayload, IntentRejectPayload, RepositoryPath } from "./domain";
