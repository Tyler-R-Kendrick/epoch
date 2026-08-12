export {
  CRDTRegistry,
  CsvTableCRDT,
  EntityType,
  JsonMapCRDT,
  TextWeaveCRDT,
  dumpEntity,
  loadEntity,
  threeWayMerge,
} from "@epoch/core";
export { EpochWASMGit, EpochWasmGit, EpochWasmGitUnsupportedOperationError } from "./git";
export type { EpochWasmGitCommandResult } from "./git";
export * from "./frontier";
