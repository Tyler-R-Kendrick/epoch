import type { CommunityAuthorizationContext } from "./authorization";
import type { CommunityEntity } from "./entity";
import { CommunityError } from "./errors";
import type { CommunityFieldOperator, CommunityFieldType } from "./fields";
import type { CommunityObjectRef } from "./identity";
import type { CommunitySearchChangeSet, PageRequest } from "./search-backend";
import type { SourceSearchPlan } from "./search-plan";
import type { CommunitySourceCheckpoint } from "./snapshot";

export interface SourceFieldCapabilities {
  readonly type: CommunityFieldType;
  readonly operators: readonly CommunityFieldOperator[];
  readonly sortable: boolean;
  readonly facetable: boolean;
}

export interface CommunitySourceCapabilities {
  readonly sourceId: string;
  readonly fields: Readonly<Record<string, SourceFieldCapabilities>>;
  readonly fullText: "none" | "substring" | "lexical";
  readonly pagination: "none" | "offset" | "keyset" | "opaque";
  readonly supportsWatch: boolean;
  readonly supportsPointLookup: boolean;
  readonly supportsRelations: boolean;
  readonly maxPageSize: number;
}

export interface SourceSearchPage {
  readonly entities: readonly CommunityEntity[];
  readonly next?: string;
  readonly checkpoint: CommunitySourceCheckpoint;
  readonly approximate?: boolean;
}

export interface CommunitySourceAdapter {
  readonly sourceId: string;
  capabilities(): CommunitySourceCapabilities;
  checkpoint(): Promise<CommunitySourceCheckpoint>;
  scan(input: {
    readonly after?: string;
    readonly limit: number;
    readonly authorization: CommunityAuthorizationContext;
  }): Promise<SourceSearchPage>;
  search?(input: {
    readonly plan: SourceSearchPlan;
    readonly page: PageRequest;
    readonly authorization: CommunityAuthorizationContext;
    readonly signal: AbortSignal;
  }): Promise<SourceSearchPage>;
  get?(refs: readonly CommunityObjectRef[], authorization: CommunityAuthorizationContext): Promise<readonly CommunityEntity[]>;
  watch?(input: {
    readonly after?: string;
    readonly authorization: CommunityAuthorizationContext;
    readonly signal: AbortSignal;
  }): AsyncIterable<CommunitySearchChangeSet>;
}

export interface PreparedCommunityChange {
  commit(): Promise<void>;
  rollback(): Promise<void>;
}

export interface AtomicCommunityChangeTarget {
  readonly targetId: string;
  stage(changes: CommunitySearchChangeSet): Promise<PreparedCommunityChange>;
  markStale(error: unknown): Promise<void>;
}

export async function applyCommunityChangeSetAtomically(
  changes: CommunitySearchChangeSet,
  targets: readonly AtomicCommunityChangeTarget[],
): Promise<void> {
  const staged: { readonly target: AtomicCommunityChangeTarget; readonly prepared: PreparedCommunityChange }[] = [];
  try {
    for (const target of targets) staged.push({ target, prepared: await target.stage(changes) });
    for (const entry of staged) await entry.prepared.commit();
  } catch (error) {
    for (const { target, prepared } of [...staged].reverse()) {
      try { await prepared.rollback(); } catch { /* stale marker remains authoritative */ }
      try { await target.markStale(error); } catch { /* original admission error wins */ }
    }
    throw new CommunityError("INDEX_STALE", "Atomic community change ingestion failed; affected targets were marked stale", {
      sourceId: changes.sourceId,
      checkpoint: changes.checkpoint.token,
    }, { cause: error });
  }
}

export function validateSourceCapabilities(value: CommunitySourceCapabilities): CommunitySourceCapabilities {
  if (value.sourceId.length === 0 || value.sourceId.length > 128 || !/^[a-z0-9][a-z0-9._-]*$/u.test(value.sourceId)) {
    throw new CommunityError("QUERY_UNSUPPORTED_SOURCE", "Source ID must be a bounded lowercase token");
  }
  if (!Number.isSafeInteger(value.maxPageSize) || value.maxPageSize < 1 || value.maxPageSize > 10_000) {
    throw new CommunityError("QUERY_UNSUPPORTED_SOURCE", "Source maxPageSize is invalid");
  }
  return Object.freeze({ ...value, fields: Object.freeze({ ...value.fields }) });
}

const sourceCursors = new Map<string, { readonly sourceId: string; readonly objectId: string }>();

export function sourceKeysetCursor(sourceId: string, objectId: string): string {
  const bytes = globalThis.crypto?.getRandomValues(new Uint8Array(24));
  if (bytes === undefined) throw new CommunityError("CRYPTO_UNAVAILABLE", "Source cursor generation is unavailable");
  const token = base64Url(bytes);
  sourceCursors.set(token, { sourceId, objectId });
  if (sourceCursors.size > 4096) sourceCursors.delete(sourceCursors.keys().next().value as string);
  return token;
}

export function decodeSourceKeysetCursor(cursor: string, sourceId: string): string {
  if (!/^[A-Za-z0-9_-]{32}$/u.test(cursor)) throw new CommunityError("CURSOR_INVALID", "Source cursor is invalid");
  const payload = sourceCursors.get(cursor);
  if (payload === undefined || payload.sourceId !== sourceId) throw new CommunityError("CURSOR_STALE", "Source cursor does not belong to this source snapshot");
  return payload.objectId;
}

export function abortSource(signal: AbortSignal): void {
  if (signal.aborted) throw new DOMException("Source operation was cancelled", "AbortError");
}

export function boundedSourcePageSize(requested: number, capabilities: CommunitySourceCapabilities): number {
  if (!Number.isSafeInteger(requested) || requested < 1) throw new CommunityError("QUERY_COST_LIMIT", "Source page size must be a positive integer");
  return Math.min(requested, capabilities.maxPageSize);
}

function base64Url(value: Uint8Array): string {
  let binary = "";
  for (const byte of value) binary += String.fromCharCode(byte);
  return btoa(binary).replaceAll("+", "-").replaceAll("/", "_").replace(/=+$/u, "");
}
