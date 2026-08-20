import { isString } from "../value-kind";
import type { NormalizedCommunityQuery } from "@epoch/community-core";

export interface QueryHistoryEntry {
  readonly queryHash: string;
  readonly canonical: string;
  readonly resolvedAt: string;
  readonly favorite: boolean;
}

export interface QueryHistory {
  list(): readonly QueryHistoryEntry[];
  record(query: NormalizedCommunityQuery): readonly QueryHistoryEntry[];
  favorite(queryHash: string, value?: boolean): readonly QueryHistoryEntry[];
  clear(): void;
}

/** Private, bounded workbench history. Hosts decide whether and where to persist it. */
export function createQueryHistory(limit = 50, initial: readonly QueryHistoryEntry[] = []): QueryHistory {
  if (!Number.isInteger(limit) || limit < 1 || limit > 500) throw new Error("Query history limit must be between 1 and 500");
  let entries = sanitize(initial).slice(0, limit);
  const snapshot = (): readonly QueryHistoryEntry[] => Object.freeze(entries.map((entry) => Object.freeze({ ...entry })));
  return Object.freeze({
    list: snapshot,
    record(query: NormalizedCommunityQuery) {
      if (query.ast === null || query.error !== undefined || query.queryHash === undefined || query.resolvedAt === undefined) return snapshot();
      const previous = entries.find((entry) => entry.queryHash === query.queryHash);
      entries = [{
        queryHash: query.queryHash,
        canonical: query.canonical,
        resolvedAt: query.resolvedAt,
        favorite: previous?.favorite ?? false,
      }, ...entries.filter((entry) => entry.queryHash !== query.queryHash)].slice(0, limit);
      return snapshot();
    },
    favorite(queryHash: string, value?: boolean) {
      entries = entries.map((entry) => entry.queryHash === queryHash
        ? { ...entry, favorite: value ?? !entry.favorite }
        : entry);
      return snapshot();
    },
    clear() { entries = []; },
  });
}

function sanitize(entries: readonly QueryHistoryEntry[]): QueryHistoryEntry[] {
  const seen = new Set<string>();
  const output: QueryHistoryEntry[] = [];
  for (const entry of entries) {
    if (!entry || !isString(entry.queryHash) || entry.queryHash.length === 0 || entry.queryHash.length > 256 ||
        !isString(entry.canonical) || entry.canonical.length > 16_384 || !isString(entry.resolvedAt) ||
        seen.has(entry.queryHash)) continue;
    seen.add(entry.queryHash);
    output.push({ ...entry, favorite: entry.favorite === true });
  }
  return output;
}
