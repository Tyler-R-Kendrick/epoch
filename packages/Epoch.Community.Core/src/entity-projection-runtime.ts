import { createKeysetCursorCodec, type KeysetCursorCodec } from "./cursor";
import type { CommunityEntity, CommunityFieldValue } from "./entity";
import { CommunityError } from "./errors";
import { validateObjectRef, type CommunityObjectRef } from "./identity";
import {
  assignProjectionCollisionNames,
  compileProjectionDefinition,
  createProjectionOccurrenceId,
  renderSegmentTemplate,
} from "./projection-compiler";
import type {
  CompiledProjection,
  ProjectionCompileContext,
  ProjectionDefinition,
  ProjectionEntryCapabilities,
  ProjectionNode,
  ResolvedProjectionCollision,
} from "./projection-definition";
import {
  normalizeVirtualPath,
  validateVfsEntry,
  type ProjectionDelta,
  type ProjectionExecutionContext,
  type ProjectionExplanation,
  type ProjectionRuntime,
  type ProjectionWatchContext,
  type VfsEntry,
  type VfsPage,
} from "./projection-runtime";
import { evaluateSearchExpression, searchFieldValues } from "./query-evaluator";
import type { KeysetPageInfo, PageRequest, SearchCompleteness } from "./search-backend";
import type { CommunityFieldScalar, SearchOrder } from "./search-expression";

export interface EntityProjectionRuntimeOptions {
  /** Entities must already be filtered for the authorization context used to execute this runtime. */
  readonly entities: readonly CommunityEntity[];
  readonly completeness: SearchCompleteness;
  readonly cursorKey: Uint8Array;
  readonly compileContext: ProjectionCompileContext;
}

interface Frame {
  readonly entities: readonly CommunityEntity[];
  readonly branchId: string;
  readonly parentEntryId: string;
  readonly path: string;
  readonly templateValues?: TemplateValues;
}

interface TemplateValues { readonly [key: string]: CommunityFieldValue }
interface MutableTemplateValues { [key: string]: CommunityFieldValue }

interface RawOccurrence {
  readonly target: CommunityObjectRef;
  readonly nodeId: string;
  readonly branchId: string;
  readonly originalSegment: string;
  readonly normalizedSegment: string;
  readonly kind: VfsEntry["kind"];
  readonly sortKey: readonly CommunityFieldScalar[];
  readonly childNodes: readonly ProjectionNode[];
  readonly childFrame: Frame;
}

interface MaterializedOccurrence {
  readonly raw: RawOccurrence;
  readonly collision: ResolvedProjectionCollision;
  readonly entry: VfsEntry;
}

const DIRECTORY_CAPABILITIES: ProjectionEntryCapabilities = Object.freeze({
  read: true, enter: true, expand: true, composeUnder: false, execute: false,
});
const ENTITY_CAPABILITIES: ProjectionEntryCapabilities = Object.freeze({
  read: true, enter: true, expand: false, composeUnder: false, execute: false,
});

/** Executes a compiled projection against one authorization-filtered entity snapshot. */
export class EntityProjectionRuntime implements ProjectionRuntime {
  readonly #entities: readonly CommunityEntity[];
  readonly #byId: ReadonlyMap<string, CommunityEntity>;
  readonly #completeness: SearchCompleteness;
  readonly #compileContext: ProjectionCompileContext;
  readonly #cursor: KeysetCursorCodec;
  readonly #compiled = new Map<string, CompiledProjection>();

  constructor(options: EntityProjectionRuntimeOptions, definitions: readonly ProjectionDefinition[] = []) {
    const byId = new Map<string, CommunityEntity>();
    for (const entity of options.entities) {
      if (byId.has(entity.ref.objectId)) throw new CommunityError("PROJECTION_INVALID", `Duplicate canonical entity ${entity.ref.objectId}`);
      byId.set(entity.ref.objectId, entity);
    }
    this.#entities = Object.freeze([...byId.values()]);
    this.#byId = byId;
    this.#completeness = freezeCompleteness(options.completeness);
    this.#compileContext = options.compileContext;
    this.#cursor = createKeysetCursorCodec({ key: options.cursorKey });
    for (const definition of definitions) this.register(definition);
  }

  async compile(definition: ProjectionDefinition, context: ProjectionCompileContext): Promise<CompiledProjection> {
    return compileProjectionDefinition(definition, context);
  }

  register(definition: ProjectionDefinition): void {
    const compiled = compileProjectionDefinition(definition, this.#compileContext);
    this.#compiled.set(definition.projectionId, compiled);
  }

  unregister(projectionId: string): void { this.#compiled.delete(projectionId); }
  definition(projectionId: string): ProjectionDefinition | undefined { return this.#compiled.get(projectionId)?.definition; }
  definitions(): readonly string[] { return Object.freeze([...this.#compiled.keys()].sort(compareText)); }

  async list(projectionId: string, path: string, page: PageRequest, context: ProjectionExecutionContext): Promise<VfsPage> {
    validateRequest(path, page, context);
    const compiled = this.#require(projectionId);
    const parent = await this.#walk(compiled, path);
    if (path !== "/" && parent === undefined) return emptyPage(this.#completeness);
    const records = path === "/" ? this.#root(compiled) : this.#children(compiled, parent!);
    const binding = cursorBinding(compiled, context, parent?.entry.entryId ?? rootEntryId(compiled));
    let start = 0;
    if (page.after !== undefined) {
      const decoded = await this.#cursor.decode(page.after, binding);
      const index = records.findIndex(({ entry }) => entry.entryId === decoded.objectId && equalScalars(entry.sortKey, decoded.sortKey));
      if (index < 0) throw new CommunityError("CURSOR_STALE", "Projection cursor no longer resolves in this snapshot");
      start = index + 1;
    }
    const selected = records.slice(start, start + page.first);
    const cursors = await Promise.all(selected.map(({ entry }) => this.#cursor.encode({
      version: 1,
      snapshotId: context.snapshotId,
      planHash: binding.planHash,
      authorizationFingerprint: context.authorizationFingerprint,
      sortKey: entry.sortKey,
      objectId: entry.entryId,
    })));
    const pageInfo: KeysetPageInfo = { hasNextPage: start + selected.length < records.length };
    if (cursors[0] !== undefined) Object.assign(pageInfo, { startCursor: cursors[0] });
    if (cursors.at(-1) !== undefined) Object.assign(pageInfo, { endCursor: cursors.at(-1) });
    return Object.freeze({ entries: Object.freeze(selected.map(({ entry }) => entry)), pageInfo, freshness: this.#completeness });
  }

  async resolve(projectionId: string, path: string, context: ProjectionExecutionContext): Promise<VfsEntry | undefined> {
    validateRequest(path, undefined, context);
    if (normalizeVirtualPath(path) === "/") return undefined;
    return (await this.#walk(this.#require(projectionId), path))?.entry;
  }

  async locate(projectionId: string, target: CommunityObjectRef, context: ProjectionExecutionContext): Promise<readonly VfsEntry[]> {
    validateRequest("/", undefined, context);
    validateObjectRef(target);
    const compiled = this.#require(projectionId);
    const queue = [...this.#root(compiled)];
    const found: VfsEntry[] = [];
    const limit = compiled.definition.limits?.maxTotalEntries ?? 100_000;
    for (let index = 0; index < queue.length; index += 1) {
      if (index >= limit) throw new CommunityError("PROJECTION_INVALID", `Projection exceeds its ${limit} entry execution limit`);
      const occurrence = queue[index]!;
      if (occurrence.entry.target.objectId === target.objectId) found.push(occurrence.entry);
      queue.push(...this.#children(compiled, occurrence));
    }
    return Object.freeze(found);
  }

  async explain(projectionId: string, path: string, context: ProjectionExecutionContext): Promise<ProjectionExplanation> {
    validateRequest(path, undefined, context);
    const compiled = this.#require(projectionId);
    const occurrence = normalizeVirtualPath(path) === "/" ? undefined : await this.#walk(compiled, path);
    if (occurrence === undefined) return Object.freeze({ projectionId, path, componentOrder: [projectionId], shadowed: [], detail: path === "/" ? "Projection root" : "Path did not resolve" });
    const collision = occurrence.collision;
    const detail = collision.collided
      ? `${occurrence.raw.nodeId} rendered ${JSON.stringify(collision.originalSegment)} as ${JSON.stringify(collision.normalizedSegment)}; collision set [${collision.collisionSet.join(", ")}] produced ${JSON.stringify(collision.finalName)}`
      : `${occurrence.raw.nodeId} rendered ${JSON.stringify(collision.originalSegment)} as ${JSON.stringify(collision.finalName)}`;
    return Object.freeze({ projectionId, path, entry: occurrence.entry, componentOrder: [projectionId], shadowed: [], detail });
  }

  async *watch(projectionId: string, path: string, context: ProjectionWatchContext): AsyncIterable<ProjectionDelta> {
    validateRequest(path, undefined, context);
    this.#require(projectionId);
    if (context.changes === undefined) return;
    for await (const delta of context.changes) {
      if (context.signal.aborted) return;
      if (delta.projectionId === projectionId) yield delta;
    }
  }

  #require(projectionId: string): CompiledProjection {
    const compiled = this.#compiled.get(projectionId);
    if (compiled === undefined) throw new CommunityError("PROJECTION_INVALID", `Unknown projection ${projectionId}`);
    return compiled;
  }

  #root(compiled: CompiledProjection): readonly MaterializedOccurrence[] {
    const parentEntryId = rootEntryId(compiled);
    const entities = sortEntities(this.#entities, compiled.effectiveOrder);
    const frame: Frame = { entities, branchId: "root", parentEntryId, path: "/" };
    const root = compiled.definition.root;
    const raw = root.kind === "literal" && root.segment === ""
      ? this.#emitMany(compiled, root.children, { ...frame, branchId: `${frame.branchId}/${root.nodeId}` })
      : this.#emit(compiled, root, frame);
    return this.#materialize(compiled, raw, parentEntryId, "/");
  }

  #children(compiled: CompiledProjection, parent: MaterializedOccurrence): readonly MaterializedOccurrence[] {
    const raw = this.#emitMany(compiled, parent.raw.childNodes, {
      ...parent.raw.childFrame,
      branchId: parent.raw.branchId,
      parentEntryId: parent.entry.entryId,
      path: parent.entry.logicalPath,
    });
    return this.#materialize(compiled, raw, parent.entry.entryId, parent.entry.logicalPath);
  }

  async #walk(compiled: CompiledProjection, path: string): Promise<MaterializedOccurrence | undefined> {
    const normalized = normalizeVirtualPath(path);
    if (normalized === "/") return undefined;
    let children = this.#root(compiled);
    let current: MaterializedOccurrence | undefined;
    const segments = normalized.slice(1).split("/");
    for (const [index, segment] of segments.entries()) {
      current = children.find(({ entry }) => entry.name === segment);
      if (current === undefined) return undefined;
      if (index < segments.length - 1) children = this.#children(compiled, current);
    }
    return current;
  }

  #emitMany(compiled: CompiledProjection, nodes: readonly ProjectionNode[], frame: Frame): readonly RawOccurrence[] {
    return nodes.flatMap((node, index) => this.#emit(compiled, node, { ...frame, branchId: `${frame.branchId}/${index}` }));
  }

  #emit(compiled: CompiledProjection, node: ProjectionNode, frame: Frame): readonly RawOccurrence[] {
    switch (node.kind) {
      case "literal": {
        const branchId = `${frame.branchId}/${node.nodeId}`;
        const target = structuralRef(compiled, node.nodeId, branchId);
        return [this.#raw(compiled, node.nodeId, branchId, node.segment, "directory", target, frame, node.children)];
      }
      case "select": {
        const selected = sortEntities(frame.entities.filter((entity) => node.objectKinds.includes(entity.ref.kind)
          && (node.where === undefined || evaluateSearchExpression(entity, node.where, this.#evaluationOptions()).matches)), node.order ?? compiled.effectiveOrder)
          .slice(0, node.limit);
        return this.#emitMany(compiled, node.children, { ...frame, entities: selected, branchId: `${frame.branchId}/${node.nodeId}` });
      }
      case "group": {
        const groups = new Map<string, { readonly value: CommunityFieldScalar; readonly entities: CommunityEntity[] }>();
        for (const entity of frame.entities) {
          const values = searchFieldValues(entity, node.field).filter((value) => value !== null);
          for (const value of values.length === 0 ? [null] : values) {
            const key = JSON.stringify(value);
            const group = groups.get(key) ?? { value, entities: [] };
            group.entities.push(entity);
            groups.set(key, group);
          }
        }
        const ordered = [...groups.values()].sort((left, right) => groupCompare(left, right, node.order));
        return ordered.map((group) => {
          const branchId = `${frame.branchId}/${node.nodeId}:${stableHash(JSON.stringify(group.value))}`;
          const values = Object.freeze({ ...(frame.templateValues ?? {}), [node.field]: group.value, count: group.entities.length });
          const segment = group.value === null ? node.missing : renderSegmentTemplate(node.segment, values).segment;
          const target = structuralRef(compiled, node.nodeId, branchId);
          return this.#raw(compiled, node.nodeId, branchId, segment, "directory", target, { ...frame, entities: Object.freeze(group.entities), templateValues: values }, [node.child], group.value === null ? node.missing : node.segment.template);
        });
      }
      case "traverse": {
        const output: RawOccurrence[] = [];
        for (const start of frame.entities) {
          const reached = this.#traverse(start, node.relation, node.direction, node.maxDepth);
          output.push(...this.#emit(compiled, node.child, {
            ...frame,
            entities: reached,
            branchId: `${frame.branchId}/${node.nodeId}:${start.ref.objectId}`,
          }));
        }
        return output;
      }
      case "union":
        return this.#emitMany(compiled, node.children, { ...frame, branchId: `${frame.branchId}/${node.nodeId}` });
      case "alias": {
        const entity = this.#byId.get(node.target.objectId);
        if (entity === undefined) return [];
        const branchId = `${frame.branchId}/${node.nodeId}:${entity.ref.objectId}`;
        const segment = renderSegmentTemplate(node.segment, templateValues(entity, frame.templateValues)).segment;
        return [this.#raw(compiled, node.nodeId, branchId, segment, "entity", entity.ref, { ...frame, entities: [entity] }, node.children, node.segment.template)];
      }
      case "leaf":
        return frame.entities.map((entity) => {
          const branchId = `${frame.branchId}/${node.nodeId}:${entity.ref.objectId}:${node.representation}`;
          const segment = renderSegmentTemplate(node.segment, templateValues(entity, frame.templateValues)).segment;
          return this.#raw(compiled, node.nodeId, branchId, segment, node.representation === "default" ? "entity" : "representation", entity.ref, { ...frame, entities: [entity] }, [], node.segment.template);
        });
    }
  }

  #raw(
    compiled: CompiledProjection,
    nodeId: string,
    branchId: string,
    segment: string,
    kind: VfsEntry["kind"],
    target: CommunityObjectRef,
    childFrame: Frame,
    childNodes: readonly ProjectionNode[],
    originalSegment = segment,
  ): RawOccurrence {
    const entity = this.#byId.get(target.objectId);
    return Object.freeze({
      target,
      nodeId,
      branchId,
      originalSegment,
      normalizedSegment: segment,
      kind,
      sortKey: Object.freeze(compiled.effectiveOrder.map((order) => entity === undefined ? null : searchFieldValues(entity, order.field)[0] ?? null)),
      childNodes,
      childFrame,
    });
  }

  #materialize(compiled: CompiledProjection, raw: readonly RawOccurrence[], parentEntryId: string, parentPath: string): readonly MaterializedOccurrence[] {
    const maximum = compiled.definition.limits?.maxEntriesPerDirectory ?? this.#compileContext.limits.maxFanout;
    if (raw.length > maximum) throw new CommunityError("PROJECTION_INVALID", `Virtual directory exceeds its ${maximum} entry limit`);
    const collisions = assignProjectionCollisionNames(raw.map((candidate) => ({
      target: candidate.target,
      nodeId: candidate.nodeId,
      branchId: candidate.branchId,
      originalSegment: candidate.originalSegment,
      normalizedSegment: candidate.normalizedSegment,
    })));
    return Object.freeze(raw.map((candidate, index) => {
      const collision = collisions[index]!;
      const entryId = createProjectionOccurrenceId({
        projectionId: compiled.definition.projectionId,
        projectionVersion: compiled.definition.version,
        nodeId: candidate.nodeId,
        branchId: candidate.branchId,
        parentEntryId,
        target: candidate.target,
        resolvedSegment: candidate.normalizedSegment,
      });
      const logicalPath = parentPath === "/" ? `/${collision.finalName}` : `${parentPath}/${collision.finalName}`;
      const entry = validateVfsEntry({
        entryId,
        target: candidate.target,
        projectionId: compiled.definition.projectionId,
        projectionVersion: compiled.definition.version,
        parentEntryId,
        name: collision.finalName,
        logicalPath,
        kind: candidate.kind,
        sortKey: candidate.sortKey,
        capabilities: candidate.kind === "directory" || candidate.childNodes.length > 0 ? DIRECTORY_CAPABILITIES : ENTITY_CAPABILITIES,
        freshness: this.#completeness,
      }, compiled.definition.projectionId);
      return Object.freeze({ raw: candidate, collision, entry });
    }));
  }

  #evaluationOptions(): Parameters<typeof evaluateSearchExpression>[2] {
    return {
      resolveEntity: (objectId) => this.#byId.get(objectId),
      relationsFor: (objectId) => this.#entities.flatMap((entity) => entity.relations)
        .filter((relation) => relation.source.objectId === objectId || relation.target.objectId === objectId),
    };
  }

  #traverse(start: CommunityEntity, relationType: CommunityEntity["relations"][number]["type"], direction: "in" | "out", maximumDepth: number): readonly CommunityEntity[] {
    let frontier = [start.ref.objectId];
    const visited = new Set(frontier);
    const reached: CommunityEntity[] = [];
    for (let depth = 0; depth < maximumDepth && frontier.length > 0; depth += 1) {
      const next: string[] = [];
      // ponytail: scan the bounded authorized snapshot; add a relation index only when measured corpora require it.
      for (const objectId of frontier) for (const relation of this.#entities.flatMap((entity) => entity.relations)) {
        if (relation.type !== relationType) continue;
        const adjacent = direction === "out" && relation.source.objectId === objectId ? relation.target
          : direction === "in" && relation.target.objectId === objectId ? relation.source : undefined;
        if (adjacent === undefined || visited.has(adjacent.objectId)) continue;
        visited.add(adjacent.objectId);
        const entity = this.#byId.get(adjacent.objectId);
        if (entity !== undefined) { reached.push(entity); next.push(entity.ref.objectId); }
      }
      frontier = next;
    }
    return Object.freeze(reached.sort((left, right) => compareText(left.ref.objectId, right.ref.objectId)));
  }
}

function sortEntities(entities: readonly CommunityEntity[], order: readonly SearchOrder[]): readonly CommunityEntity[] {
  return Object.freeze([...entities].sort((left, right) => {
    for (const item of order) {
      const a = searchFieldValues(left, item.field)[0] ?? null;
      const b = searchFieldValues(right, item.field)[0] ?? null;
      const compared = scalarCompare(a, b, item.nulls);
      if (compared !== 0) return a === null || b === null || item.direction === "ascending" ? compared : -compared;
    }
    return compareText(left.ref.kind, right.ref.kind) || compareText(left.ref.objectId, right.ref.objectId);
  }));
}

function scalarCompare(left: CommunityFieldScalar, right: CommunityFieldScalar, nulls: SearchOrder["nulls"] = "last"): number {
  if (left === right) return 0;
  if (left === null) return nulls === "first" ? -1 : 1;
  if (right === null) return nulls === "first" ? 1 : -1;
  if (isNumberScalar(left) && isNumberScalar(right)) return left - right;
  if (isBooleanScalar(left) && isBooleanScalar(right)) return Number(left) - Number(right);
  return compareText(String(left), String(right));
}

function groupCompare(
  left: { readonly value: CommunityFieldScalar; readonly entities: readonly CommunityEntity[] },
  right: { readonly value: CommunityFieldScalar; readonly entities: readonly CommunityEntity[] },
  order: Extract<ProjectionNode, { readonly kind: "group" }>["order"],
): number {
  if (order === "count-ascending" || order === "count-descending") {
    const count = left.entities.length - right.entities.length;
    if (count !== 0) return order === "count-ascending" ? count : -count;
  }
  const key = scalarCompare(left.value, right.value);
  return order === "key-descending" ? -key : key;
}

function templateValues(entity: CommunityEntity, inherited?: TemplateValues): TemplateValues {
  const output: MutableTemplateValues = {
    ...(inherited ?? {}),
    ...entity.searchableText,
    ...entity.fields,
    objectId: entity.ref.objectId,
    kind: entity.ref.kind,
    createdAt: entity.createdAt,
    updatedAt: entity.updatedAt,
    visibility: entity.visibility,
  };
  for (const [name, value] of Object.entries(output)) if (Array.isArray(value)) output[name] = value[0] ?? "";
  return output;
}

function structuralRef(compiled: CompiledProjection, nodeId: string, branchId: string): CommunityObjectRef {
  return Object.freeze({ objectId: `vfs-${stableHash(`${compiled.definition.projectionId}\0${compiled.definition.version}\0${nodeId}\0${branchId}`)}`, kind: "projection" });
}

function rootEntryId(compiled: CompiledProjection): string {
  return `root-${stableHash(`${compiled.definition.projectionId}\0${compiled.definition.version}`)}`;
}

function cursorBinding(compiled: CompiledProjection, context: ProjectionExecutionContext, parentEntryId: string) {
  return {
    snapshotId: context.snapshotId,
    authorizationFingerprint: context.authorizationFingerprint,
    planHash: `projection:${stableHash(`${compiled.canonicalJson}\0${parentEntryId}`)}`,
  } as const;
}

function validateRequest(path: string, page: PageRequest | undefined, context: ProjectionExecutionContext): void {
  normalizeVirtualPath(path);
  if (!context.authorizationFingerprint || !context.snapshotId) throw new CommunityError("AUTHORIZATION_DENIED", "Projection execution requires snapshot-bound authorization");
  if (page !== undefined && (!Number.isInteger(page.first) || page.first < 1 || page.first > 1000)) throw new CommunityError("PROJECTION_INVALID", "Projection page size must be between 1 and 1000");
}

function freezeCompleteness(value: SearchCompleteness): SearchCompleteness {
  if (!(["complete", "partial", "stale", "approximate"] as const).includes(value.status)
    || value.sources.length > 4096 || value.omittedSources.length > 4096 || value.unsupportedPredicates.length > 4096) {
    throw new CommunityError("PROJECTION_INVALID", "Projection completeness metadata is invalid");
  }
  return Object.freeze({
    status: value.status,
    sources: Object.freeze([...value.sources]),
    omittedSources: Object.freeze([...value.omittedSources]),
    unsupportedPredicates: Object.freeze([...value.unsupportedPredicates]),
  });
}

function isNumberScalar(value: CommunityFieldScalar): value is number { return typeof value === "number"; }
function isBooleanScalar(value: CommunityFieldScalar): value is boolean { return typeof value === "boolean"; }

function emptyPage(freshness: SearchCompleteness): VfsPage {
  return Object.freeze({ entries: [], pageInfo: Object.freeze({ hasNextPage: false }), freshness });
}

function equalScalars(left: readonly CommunityFieldScalar[], right: readonly CommunityFieldScalar[]): boolean {
  return left.length === right.length && left.every((value, index) => value === right[index]);
}

function stableHash(value: string): string {
  let hash = 0xcbf29ce484222325n;
  for (const byte of new TextEncoder().encode(value)) {
    hash ^= BigInt(byte);
    hash = BigInt.asUintN(64, hash * 0x100000001b3n);
  }
  return hash.toString(36).padStart(13, "0");
}

function compareText(left: string, right: string): number { return left < right ? -1 : left > right ? 1 : 0; }
