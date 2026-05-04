export { EpochRepository, Event, GIT_AUTHOR_EMAIL, GIT_AUTHOR_NAME, commitGit } from "./core";
export type { IdentityData, SyncResult } from "./core";
export { EpochActorSystem, EpochUserActor } from "./actors";
export { CRDTRegistry, JsonMapCRDT, TextWeaveCRDT, dumpEntity, loadEntity, threeWayMerge } from "./crdt";
