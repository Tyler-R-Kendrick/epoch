import { CommunityError } from "./errors";
import { validateIsoDateTime } from "./entity";
import { validateVfsEntry, type VfsEntry, type ProjectionDelta } from "./projection-runtime";

export interface ProjectionViewAnchor {
  readonly focusedEntryId?: string;
  readonly targetId?: string;
  readonly readingAnchor?: { readonly objectId: string; readonly pixelOffset: number };
}

export interface ProjectionDeltaResult {
  readonly applied: boolean;
  readonly queuedCount: number;
  readonly entries: readonly VfsEntry[];
  readonly anchor: ProjectionViewAnchor;
}

export interface TrackedProjection {
  ingest(delta: ProjectionDelta): ProjectionDeltaResult;
  applyQueued(): ProjectionDeltaResult;
  entries(): readonly VfsEntry[];
}

export class ProjectionDeltaController {
  track(mode: "live" | "queued" | "snapshot", entries: readonly VfsEntry[], anchor: ProjectionViewAnchor): TrackedProjection {
    return new ProjectionDeltaState(mode, entries, anchor);
  }
}

class ProjectionDeltaState implements TrackedProjection {
  private current: readonly VfsEntry[];
  private readonly queued: ProjectionDelta[] = [];
  private sequence = 0;
  private projectionId?: string;
  private projectionVersion?: number;
  constructor(
    private readonly mode: "live" | "queued" | "snapshot",
    entries: readonly VfsEntry[],
    private readonly anchor: ProjectionViewAnchor,
  ) { this.current = Object.freeze([...entries]); }

  ingest(delta: ProjectionDelta): ProjectionDeltaResult {
    if (!Number.isInteger(delta.sequence) || delta.sequence <= this.sequence) throw new CommunityError("PROJECTION_INVALID", "Projection delta sequence must increase monotonically");
    if (this.projectionId !== undefined && (delta.projectionId !== this.projectionId || delta.projectionVersion !== this.projectionVersion)) throw new CommunityError("PROJECTION_INVALID", "Projection delta changed projection identity");
    this.projectionId ??= delta.projectionId;
    this.projectionVersion ??= delta.projectionVersion;
    this.sequence = delta.sequence;
    if (this.mode === "snapshot") return this.result(false);
    if (this.mode === "queued") {
      this.queued.push(delta);
      return this.result(false);
    }
    this.current = applyProjectionDelta(this.current, delta);
    return this.result(true);
  }

  applyQueued(): ProjectionDeltaResult {
    if (this.mode !== "queued") return this.result(false);
    for (const delta of this.queued) this.current = applyProjectionDelta(this.current, delta);
    this.queued.length = 0;
    return this.result(true);
  }

  entries(): readonly VfsEntry[] { return this.current; }

  private result(applied: boolean): ProjectionDeltaResult {
    return Object.freeze({ applied, queuedCount: this.queued.length, entries: this.current, anchor: this.anchor });
  }
}

export function applyProjectionDelta(entries: readonly VfsEntry[], delta: ProjectionDelta): readonly VfsEntry[] {
  if (!Number.isInteger(delta.projectionVersion) || delta.projectionVersion < 1 || delta.deletes.length > 100_000 || delta.upserts.length > 100_000) throw new CommunityError("PROJECTION_INVALID", "Projection delta metadata is invalid");
  validateIsoDateTime(delta.observedAt, "projection delta observedAt");
  const byId = new Map(entries.map((entry) => [entry.entryId, entry]));
  for (const entryId of delta.deletes) byId.delete(entryId);
  for (const entry of delta.upserts) {
    const valid = validateVfsEntry(entry, delta.projectionId);
    if (valid.projectionVersion !== delta.projectionVersion) throw new CommunityError("PROJECTION_INVALID", "Projection delta entry version does not match");
    byId.set(valid.entryId, valid);
  }
  return Object.freeze([...byId.values()].sort(compareEntries));
}

function compareEntries(left: VfsEntry, right: VfsEntry): number {
  const leftKey = JSON.stringify(left.sortKey);
  const rightKey = JSON.stringify(right.sortKey);
  if (leftKey !== rightKey) return leftKey < rightKey ? -1 : 1;
  return left.entryId < right.entryId ? -1 : left.entryId > right.entryId ? 1 : 0;
}
