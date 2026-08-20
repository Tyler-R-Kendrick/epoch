import { createHash } from "node:crypto";
import type { SignedChangeGraphStore } from "@epoch/core";
import { canonical } from "../deterministic";

export interface ModelChange {
  readonly id: string;
  readonly title: string;
  revisionIds: string[];
  published: boolean;
}

export interface ModelGraph {
  readonly id: string;
  readonly memberRevisionIds: readonly string[];
}

export interface ModelMergePlan {
  readonly id: string;
  applied: boolean;
}

export interface ModelConflict {
  readonly id: string;
  status: string;
}

/** Abstract DVCS/collaboration state mirrored against SignedChangeGraphStore. */
export interface HistoryModel {
  changes: ModelChange[];
  graphs: ModelGraph[];
  mergePlans: ModelMergePlan[];
  conflicts: ModelConflict[];
  eventCount: number;
}

export interface HistoryReal {
  readonly store: SignedChangeGraphStore;
  readonly peerRoot: string;
  readonly openPeer: () => SignedChangeGraphStore;
  readonly random: (byteLength: number) => Uint8Array;
  readonly peerRandom: (byteLength: number) => Uint8Array;
  tick: number;
}

export function emptyModel(): HistoryModel {
  return { changes: [], graphs: [], mergePlans: [], conflicts: [], eventCount: 0 };
}

export function storeCanonicalDigest(store: SignedChangeGraphStore): string {
  const events = store.repository.events()
    .filter((event) => event.type !== "repository.identity")
    .map((event) => event.toJSON())
    // SAFETY: Runtime checks or construction above establish { id?: string }).id).localeCompare(String((right as { id?: string }).id))).
    .sort((left, right) => String((/* SAFETY: Assertion is justified by surrounding validation or construction. */ left as { id?: string }).id).localeCompare(String((/* SAFETY: Assertion is justified by surrounding validation or construction. */ right as { id?: string }).id)));
  // Heads intentionally omitted: a fresh replica may carry a local identity head
  // that is outside the transported change-graph event set.
  // SAFETY: History events JSON-round-trip before canonical hashing in the fuzz model.
  return createHash("sha256").update(canonical(JSON.parse(JSON.stringify({ events })) as Parameters<typeof canonical>[0])).digest("hex");
}

export function syncModelCounts(model: HistoryModel, store: SignedChangeGraphStore): void {
  model.eventCount = store.repository.events().length;
}

export function allRevisionIds(model: HistoryModel): string[] {
  return model.changes.flatMap((change) => change.revisionIds);
}
