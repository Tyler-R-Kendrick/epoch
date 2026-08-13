import type { CommunityFieldScalar } from "./entity";
import { CommunityError } from "./errors";
import { validateObjectRef, type CommunityObjectRef } from "./identity";
import type { ProjectionDefinition, ProjectionEntryCapabilities } from "./projection-definition";
import { compileProjectionDefinition } from "./projection-compiler";
import type { CompiledProjection, ProjectionCompileContext } from "./projection-definition";
import type { KeysetPageInfo, PageRequest, SearchCompleteness } from "./search-backend";
import type { CommunitySourceCheckpoint } from "./snapshot";

export type { KeysetPageInfo, PageRequest, SearchCompleteness } from "./search-backend";

export interface VfsEntry {
  readonly entryId: string;
  readonly target: CommunityObjectRef;
  readonly projectionId: string;
  readonly projectionVersion: number;
  readonly parentEntryId: string;
  readonly name: string;
  readonly logicalPath: string;
  readonly kind: "directory" | "entity" | "representation" | "relation" | "mount";
  readonly sortKey: readonly CommunityFieldScalar[];
  readonly capabilities: ProjectionEntryCapabilities;
  readonly freshness: SearchCompleteness;
}

export interface VfsPage {
  readonly entries: readonly VfsEntry[];
  readonly pageInfo: KeysetPageInfo;
  readonly freshness: SearchCompleteness;
}

export interface ProjectionExecutionContext {
  readonly authorizationFingerprint: string;
  readonly snapshotId: string;
}

export interface ProjectionWatchContext extends ProjectionExecutionContext {
  readonly signal: AbortSignal;
  readonly changes?: AsyncIterable<ProjectionDelta>;
}

export interface ProjectionExplanation {
  readonly projectionId: string;
  readonly path: string;
  readonly entry?: VfsEntry;
  readonly componentOrder: readonly string[];
  readonly shadowed: readonly VfsEntry[];
  readonly detail: string;
}

export interface ProjectionDataSource {
  list(projectionId: string, path: string, page: PageRequest, context: ProjectionExecutionContext): Promise<VfsPage>;
  resolve(projectionId: string, path: string, context: ProjectionExecutionContext): Promise<VfsEntry | undefined>;
  locate(projectionId: string, target: CommunityObjectRef, context: ProjectionExecutionContext): Promise<readonly VfsEntry[]>;
  explain?(projectionId: string, path: string, context: ProjectionExecutionContext): Promise<ProjectionExplanation>;
  watch?(projectionId: string, path: string, context: ProjectionWatchContext): AsyncIterable<ProjectionDelta>;
}

export interface ProjectionRuntime {
  compile(definition: ProjectionDefinition, context: ProjectionCompileContext): Promise<CompiledProjection>;
  register(definition: ProjectionDefinition): void;
  unregister(projectionId: string): void;
  definition(projectionId: string): ProjectionDefinition | undefined;
  definitions(): readonly string[];
  list(projectionId: string, path: string, page: PageRequest, context: ProjectionExecutionContext): Promise<VfsPage>;
  resolve(projectionId: string, path: string, context: ProjectionExecutionContext): Promise<VfsEntry | undefined>;
  locate(projectionId: string, target: CommunityObjectRef, context: ProjectionExecutionContext): Promise<readonly VfsEntry[]>;
  explain(projectionId: string, path: string, context: ProjectionExecutionContext): Promise<ProjectionExplanation>;
  watch(projectionId: string, path: string, context: ProjectionWatchContext): AsyncIterable<ProjectionDelta>;
}

export interface ProjectionDelta {
  readonly projectionId: string;
  readonly projectionVersion: number;
  readonly sequence: number;
  readonly upserts: readonly VfsEntry[];
  readonly deletes: readonly string[];
  readonly observedAt: string;
}

export class InMemoryProjectionRuntime implements ProjectionRuntime {
  private readonly stored = new Map<string, ProjectionDefinition>();
  constructor(private readonly source: ProjectionDataSource, definitions: readonly ProjectionDefinition[] = []) {
    for (const definition of definitions) this.register(definition);
  }

  async compile(definition: ProjectionDefinition, context: ProjectionCompileContext): Promise<CompiledProjection> {
    return compileProjectionDefinition(definition, context);
  }

  register(definition: ProjectionDefinition): void { this.stored.set(definition.projectionId, definition); }
  unregister(projectionId: string): void { this.stored.delete(projectionId); }
  definition(projectionId: string): ProjectionDefinition | undefined { return this.stored.get(projectionId); }
  definitions(): readonly string[] { return [...this.stored.keys()].sort(compareText); }

  async list(projectionId: string, path: string, page: PageRequest, context: ProjectionExecutionContext): Promise<VfsPage> {
    validateExecution(path, page, context);
    const result = await this.source.list(projectionId, path, page, context);
    if (result.entries.length > page.first) throw new CommunityError("PROJECTION_INVALID", "Projection data source exceeded the requested page size");
    return Object.freeze({ ...result, entries: Object.freeze(result.entries.map((entry) => validateVfsEntry(entry, projectionId))), freshness: validateCompleteness(result.freshness) });
  }

  async resolve(projectionId: string, path: string, context: ProjectionExecutionContext): Promise<VfsEntry | undefined> {
    validateExecution(path, undefined, context);
    const result = await this.source.resolve(projectionId, path, context);
    return result === undefined ? undefined : validateVfsEntry(result, projectionId);
  }

  async locate(projectionId: string, target: CommunityObjectRef, context: ProjectionExecutionContext): Promise<readonly VfsEntry[]> {
    validateExecution("/", undefined, context);
    validateObjectRef(target);
    return Object.freeze((await this.source.locate(projectionId, target, context)).map((entry) => validateVfsEntry(entry, projectionId)));
  }

  async explain(projectionId: string, path: string, context: ProjectionExecutionContext): Promise<ProjectionExplanation> {
    validateExecution(path, undefined, context);
    if (this.source.explain !== undefined) return this.source.explain(projectionId, path, context);
    const entry = await this.resolve(projectionId, path, context);
    return Object.freeze({ projectionId, path, ...(entry === undefined ? {} : { entry }), componentOrder: [projectionId], shadowed: [], detail: entry === undefined ? "Path did not resolve" : "Path resolved directly in the projection" });
  }

  async *watch(projectionId: string, path: string, context: ProjectionWatchContext): AsyncIterable<ProjectionDelta> {
    validateExecution(path, undefined, context);
    const stream = context.changes ?? this.source.watch?.(projectionId, path, context);
    if (stream === undefined) return;
    for await (const delta of stream) {
      if (context.signal.aborted) return;
      if (delta.projectionId === projectionId) yield delta;
    }
  }
}

export function normalizeVirtualPath(path: string): string {
  if (typeof path !== "string" || path.length === 0 || path.length > 4096 || !path.startsWith("/")) throw new CommunityError("PROJECTION_INVALID", "Virtual paths must be absolute and bounded");
  if (path !== path.normalize("NFKC")) throw new CommunityError("PROJECTION_INVALID", "Virtual path uses ambiguous Unicode normalization");
  if ([...path].some((character) => {
    const code = character.codePointAt(0) ?? 0;
    return code === 0 || code < 32 || code === 127 || character === "\\";
  })) throw new CommunityError("PROJECTION_INVALID", "Virtual path contains an unsafe character");
  const segments = path.split("/").filter(Boolean);
  if (segments.some((segment) => segment === "." || segment === "..")) throw new CommunityError("PROJECTION_INVALID", "Virtual path traversal is not allowed");
  return segments.length === 0 ? "/" : `/${segments.join("/")}`;
}

export function combineCompleteness(values: readonly SearchCompleteness[]): SearchCompleteness {
  const severity: Readonly<Record<SearchCompleteness["status"], number>> = { complete: 0, approximate: 1, stale: 2, partial: 3 };
  const status = values.reduce<SearchCompleteness["status"]>((worst, value) => severity[value.status] > severity[worst] ? value.status : worst, "complete");
  const sources = new Map<string, CommunitySourceCheckpoint>();
  for (const value of values) for (const source of value.sources) sources.set(`${source.sourceId}\0${source.token}`, source);
  return Object.freeze({
    status,
    sources: Object.freeze([...sources.values()].sort((left, right) => compareText(left.sourceId, right.sourceId))),
    omittedSources: Object.freeze([...new Set(values.flatMap((value) => value.omittedSources))].sort(compareText)),
    unsupportedPredicates: Object.freeze([...new Set(values.flatMap((value) => value.unsupportedPredicates))].sort(compareText)),
  });
}

export function validateVfsEntry(entry: VfsEntry, projectionId: string): VfsEntry {
  if (entry.projectionId !== projectionId || !Number.isInteger(entry.projectionVersion) || entry.projectionVersion < 1) throw new CommunityError("PROJECTION_INVALID", "Projection entry has mismatched projection identity");
  if (typeof entry.entryId !== "string" || entry.entryId.length === 0 || entry.entryId.length > 512 || typeof entry.parentEntryId !== "string" || entry.parentEntryId.length > 512) throw new CommunityError("PROJECTION_INVALID", "Projection occurrence identity is invalid");
  if (typeof entry.name !== "string" || entry.name.length === 0 || entry.name.length > 120 || entry.name === "." || entry.name === ".." || /[/\\]/u.test(entry.name)) throw new CommunityError("PROJECTION_INVALID", "Projection entry name is unsafe");
  normalizeVirtualPath(entry.logicalPath);
  validateObjectRef(entry.target);
  if (!(["directory", "entity", "representation", "relation", "mount"] as const).includes(entry.kind)) throw new CommunityError("PROJECTION_INVALID", "Projection entry kind is invalid");
  if (entry.sortKey.length > 128 || entry.sortKey.some((value) => !isFieldScalar(value))) throw new CommunityError("PROJECTION_INVALID", "Projection entry sort key is invalid");
  return Object.freeze({ ...entry, freshness: validateCompleteness(entry.freshness) });
}

function validateCompleteness(value: SearchCompleteness): SearchCompleteness {
  if (!(["complete", "partial", "stale", "approximate"] as const).includes(value.status) || value.sources.length > 4096 || value.omittedSources.length > 4096 || value.unsupportedPredicates.length > 4096) throw new CommunityError("PROJECTION_INVALID", "Projection completeness metadata is invalid");
  return value;
}

function isFieldScalar(value: unknown): value is CommunityFieldScalar {
  return value === null || typeof value === "string" || typeof value === "boolean" || (typeof value === "number" && Number.isFinite(value));
}

function validateExecution(path: string, page: PageRequest | undefined, context: ProjectionExecutionContext): void {
  normalizeVirtualPath(path);
  if (!context.authorizationFingerprint || !context.snapshotId) throw new CommunityError("AUTHORIZATION_DENIED", "Projection execution requires snapshot-bound authorization");
  if (page !== undefined && (!Number.isInteger(page.first) || page.first < 1 || page.first > 1000)) throw new CommunityError("PROJECTION_INVALID", "Projection page size must be between 1 and 1000");
}

function compareText(left: string, right: string): number { return left < right ? -1 : left > right ? 1 : 0; }
