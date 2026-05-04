export { EpochRepository, Event, GIT_AUTHOR_EMAIL, GIT_AUTHOR_NAME, commitGit } from "./core";
export type { EpochHook, EpochHookEvent, EpochHookName, EpochRepositoryOptions, IdentityData, SyncResult } from "./core";
export { EpochActorSystem, EpochUserActor } from "./actors";
export { CRDTEventLog, CRDTRegistry, JsonMapCRDT, TextWeaveCRDT, dumpEntity, loadEntity, threeWayMerge } from "./crdt";
export type { CRDTOperation } from "./crdt";
export { EPOCH_GIT_PROVIDER, EpochCLIGit, EpochCoreGit, UnsupportedGitOperationError, readEpochGitRemote, unsupported } from "./git";
export type { EpochGitCommandResult, EpochGitCommitResult, EpochGitRemote } from "./git";
export { EpochWASMGit, EpochWasmGit, EpochWasmGitUnsupportedOperationError } from "./wasm-git";
export type { EpochWasmGitCommandResult } from "./wasm-git";
