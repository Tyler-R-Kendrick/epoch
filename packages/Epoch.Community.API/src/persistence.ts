import { closeSync, existsSync, fsyncSync, mkdirSync, openSync, readFileSync, renameSync, unlinkSync, writeFileSync } from "node:fs";
import path from "node:path";
import { CommunityError, isCommunityError } from "@epoch/community-core";
import { migrateCommunityState, type CommunityMigrationContext } from "./migrations";
import { createMemoryCommunityStateStore, type CommunityStateStore } from "./store";
import { validateCommunityStateV3, type CommunityStateV3 } from "./state-schema";
type BoundaryValue = null | undefined | boolean | number | string | bigint | symbol | Readonly<object>;
type DictionaryValue = null | undefined | boolean | number | string | bigint | readonly DictionaryValue[] | { readonly [key: string]: DictionaryValue };


export interface JsonCommunityStateStoreOptions {
  readonly migrationContext?: CommunityMigrationContext;
  readonly clock?: CommunityMigrationContext["clock"];
  /** Persist constructor seed when no file exists. Write-path recovery tests leave this unset. */
  readonly persistInitial?: boolean;
  /** Failure-injection seam for recovery tests. */
  readonly afterPendingWrite?: () => void;
}

export function createJsonCommunityStateStore(
  persistencePath: string,
  initial?: CommunityStateV3,
  options: JsonCommunityStateStoreOptions = {},
): CommunityStateStore {
  const pendingPath = `${persistencePath}.pending`;
  recoverPending(persistencePath, pendingPath);
  let state: CommunityStateV3;
  if (existsSync(persistencePath)) {
    const contents = readFileSync(persistencePath, "utf8");
    state = decodeState(contents, options.migrationContext);
    if (!isCurrentSchema(contents)) publishSafely(persistencePath, pendingPath, state, options);
  } else if (initial !== undefined) {
    state = validateCommunityStateV3(initial);
    if (options.persistInitial === true) publishSafely(persistencePath, pendingPath, state, options);
  } else {
    throw new CommunityError("PERSISTENCE_MIGRATION", "Community state is unavailable; restore a valid export or provide initial state", {
      recovery: { code: "STATE_MISSING" },
    });
  }
  return createMemoryCommunityStateStore(state, {
    persist: (candidate) => publishSafely(persistencePath, pendingPath, candidate, options),
    ...(!(options.clock === undefined) && { clock: options.clock }),
  });
}

function publishSafely(
  persistencePath: string,
  pendingPath: string,
  state: CommunityStateV3,
  options: JsonCommunityStateStoreOptions,
): void {
  try {
    publishState(persistencePath, pendingPath, state, options);
  } catch (error) {
    if (isCommunityError(error)) throw error;
    throw new CommunityError("PERSISTENCE_MIGRATION", "Community state publish was interrupted; committed state remains authoritative", {
      recovery: { code: "PUBLISH_INTERRUPTED", pendingExportAvailable: existsSync(pendingPath) },
    }, { cause: error });
  }
}

export function readCommunityStateFile(
  persistencePath: string,
  migrationContext?: CommunityMigrationContext,
): CommunityStateV3 {
  recoverPending(persistencePath, `${persistencePath}.pending`);
  if (!existsSync(persistencePath)) throw new CommunityError("PERSISTENCE_MIGRATION", "Community state file does not exist", {
    recovery: { code: "STATE_MISSING" },
  });
  return decodeState(readFileSync(persistencePath, "utf8"), migrationContext);
}

function publishState(
  persistencePath: string,
  pendingPath: string,
  state: CommunityStateV3,
  options: JsonCommunityStateStoreOptions,
): void {
  mkdirSync(path.dirname(persistencePath), { recursive: true });
  if (existsSync(pendingPath)) unlinkSync(pendingPath);
  const validated = validateCommunityStateV3(state);
  writeFileSync(pendingPath, `${JSON.stringify(validated, null, 2)}\n`, { encoding: "utf8", flag: "wx", mode: 0o600 });
  syncFile(pendingPath);
  options.afterPendingWrite?.();
  renameSync(pendingPath, persistencePath);
  syncDirectory(path.dirname(persistencePath));
}

function recoverPending(persistencePath: string, pendingPath: string): void {
  if (!existsSync(pendingPath)) return;
  if (existsSync(persistencePath)) {
    // A committed primary is authoritative; a pending replacement was never published.
    unlinkSync(pendingPath);
    return;
  }
  try {
    // SAFETY: The module validates or constructs this value before applying the asserted contract.
    validateCommunityStateV3(JSON.parse(readFileSync(pendingPath, "utf8")) as unknown);
    renameSync(pendingPath, persistencePath);
    syncDirectory(path.dirname(persistencePath));
  } catch (error) {
    throw new CommunityError("PERSISTENCE_MIGRATION", "Interrupted Community state cannot be recovered automatically", {
      recovery: { code: "PENDING_STATE_INVALID", pendingExportAvailable: true },
    }, { cause: error });
  }
}

function decodeState(contents: string, migrationContext?: CommunityMigrationContext): CommunityStateV3 {
  let decoded: unknown;
  try {
    decoded = JSON.parse(contents);
  } catch (error) {
    throw new CommunityError("PERSISTENCE_MIGRATION", "Community state contains malformed JSON; export it before recovery", {
      recovery: { code: "MALFORMED_JSON", exportAvailable: true },
    }, { cause: error });
  }
  if (isRecord(decoded) && decoded.schemaVersion === 3) return validateCommunityStateV3(decoded);
  if (migrationContext === undefined) {
    throw new CommunityError("PERSISTENCE_MIGRATION", "Earlier Community state requires an explicit migration runtime", {
      recovery: { code: "MIGRATION_CONTEXT_REQUIRED", sourceSchemaVersion: isRecord(decoded) ? decoded.schemaVersion : undefined },
    });
  }
  return migrateCommunityState(decoded, migrationContext);
}

function isCurrentSchema(contents: string): boolean {
  try {
    // SAFETY: The module validates or constructs this value before applying the asserted contract.
    const decoded = JSON.parse(contents) as unknown;
    return isRecord(decoded) && decoded.schemaVersion === 3;
  } catch {
    return false;
  }
}

function syncFile(file: string): void {
  const descriptor = openSync(file, "r");
  try { fsyncSync(descriptor); } finally { closeSync(descriptor); }
}

function syncDirectory(directory: string): void {
  let descriptor: number | undefined;
  try {
    descriptor = openSync(directory, "r");
    fsyncSync(descriptor);
  } catch (error) {
    if (process.platform !== "win32") throw error;
  } finally {
    if (descriptor !== undefined) closeSync(descriptor);
  }
}

function isRecord(value: BoundaryValue): value is Record<string, DictionaryValue> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}
