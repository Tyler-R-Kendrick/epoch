import type { CommunityAuthorizationContext } from "./authorization";
import { authorizationFingerprint, type CommunityRuntimeContext } from "./runtime-context";

export interface CommunitySourceCheckpoint {
  readonly sourceId: string;
  readonly token: string;
  readonly observedAt: string;
  readonly status: "current" | "stale" | "partial" | "unavailable";
  readonly detail?: string;
}

export interface SearchSnapshot {
  readonly snapshotId: string;
  readonly createdAt: string;
  readonly resolvedNow: string;
  readonly timezone: string;
  readonly locale: string;
  readonly queryHash: string;
  readonly planHash: string;
  readonly fieldRegistryVersion: number;
  readonly analyzerVersion: string;
  readonly authorizationFingerprint: string;
  readonly sourceCheckpoints: readonly CommunitySourceCheckpoint[];
}

export async function createSearchSnapshot(input: {
  readonly context: CommunityRuntimeContext;
  readonly queryHash: string;
  readonly planHash: string;
  readonly fieldRegistryVersion: number;
  readonly analyzerVersion: string;
  readonly authorization: CommunityAuthorizationContext;
  readonly sourceCheckpoints: readonly CommunitySourceCheckpoint[];
}): Promise<SearchSnapshot> {
  const createdAt = input.context.clock.now().toISOString();
  return Object.freeze({
    snapshotId: input.context.nextId("snapshot"),
    createdAt,
    resolvedNow: createdAt,
    timezone: input.context.timezone,
    locale: input.context.locale,
    queryHash: input.queryHash,
    planHash: input.planHash,
    fieldRegistryVersion: input.fieldRegistryVersion,
    analyzerVersion: input.analyzerVersion,
    authorizationFingerprint: await authorizationFingerprint(input.authorization),
    sourceCheckpoints: Object.freeze([...input.sourceCheckpoints].sort((a, b) => a.sourceId.localeCompare(b.sourceId, "en"))),
  });
}
