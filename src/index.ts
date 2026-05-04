export { EpochRepository, Event, GIT_AUTHOR_EMAIL, GIT_AUTHOR_NAME, commitGit } from "./core";
export type { EpochHook, EpochHookEvent, EpochHookName, EpochRepositoryOptions, GatePolicy, IdentityData, InclusionRule, SyncResult, ViewDefinition, ViewDiff, ViewMetadata, ViewState } from "./core";
export { EpochActorSystem, EpochUserActor } from "./actors";
export { CRDTEventLog, CRDTRegistry, JsonMapCRDT, TextWeaveCRDT, dumpEntity, loadEntity, threeWayMerge } from "./crdt";
export type { CRDTOperation } from "./crdt";
