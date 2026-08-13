import { builtinDefaultProjection } from "./builtin-projections";
import { CommunityError } from "./errors";
import { validateObjectRef, type CommunityObjectRef } from "./identity";
import { ProjectionDeltaController } from "./projection-delta";
import {
  InMemoryProjectionRuntime,
  combineCompleteness,
  normalizeVirtualPath,
  type KeysetPageInfo,
  type PageRequest,
  type ProjectionDataSource,
  type ProjectionDelta,
  type ProjectionExecutionContext,
  type ProjectionExplanation,
  type ProjectionRuntime,
  type ProjectionWatchContext,
  type SearchCompleteness,
  type VfsEntry,
  type VfsPage,
} from "./projection-runtime";

export { InMemoryProjectionRuntime, ProjectionDeltaController };
export type { ProjectionDataSource, ProjectionDelta, ProjectionRuntime, VfsEntry, VfsPage };

export type NamespaceScope = "builtin" | "community" | "workspace" | "user" | "session";
export type NamespaceMountMode = "replace" | "before" | "after";

export interface NamespaceMount {
  readonly mountId: string;
  readonly scope: NamespaceScope;
  readonly mountPath: string;
  readonly projectionId: string;
  readonly mode: NamespaceMountMode;
  readonly order: number;
  readonly writable: boolean;
  readonly ownerId?: string;
  readonly createdAt: string;
  readonly updatedAt: string;
}

export interface ShadowedNamespaceEntry {
  readonly name: string;
  readonly winner: VfsEntry;
  readonly entry: VfsEntry;
  readonly mountId: string;
  readonly reason: "shadowed";
}

export interface NamespacePage extends VfsPage {
  readonly shadowed: readonly ShadowedNamespaceEntry[];
  readonly componentOrder: readonly string[];
}

export interface NamespaceResetResult {
  readonly scope: Exclude<NamespaceScope, "builtin" | "community">;
  readonly removedMountIds: readonly string[];
  readonly preservedProjectionIds: readonly string[];
}

export interface NamespaceRuntime {
  list(path: string, page: PageRequest, context: ProjectionExecutionContext): Promise<NamespacePage>;
  resolve(path: string, context: ProjectionExecutionContext): Promise<VfsEntry | undefined>;
  locate(target: CommunityObjectRef, context: ProjectionExecutionContext): Promise<readonly VfsEntry[]>;
  explain(path: string, context: ProjectionExecutionContext): Promise<ProjectionExplanation>;
  watch(path: string, context: ProjectionWatchContext): AsyncIterable<ProjectionDelta>;
  mounts(): readonly NamespaceMount[];
  mount(mount: NamespaceMount): NamespaceMount;
  unmount(mountId: string): void;
  reset(scope: Exclude<NamespaceScope, "builtin" | "community">): NamespaceResetResult;
  definitions(): readonly string[];
  writableMountFor(path: string, context: ProjectionExecutionContext): NamespaceMount;
}

const RECOVERY_ROOT = "/.epoch";
const RECOVERY_NAMES = ["default", "canonical", "projections", "sources", "diagnostics"] as const;
const SCOPE_RANK: Readonly<Record<NamespaceScope, number>> = { session: 5, user: 4, workspace: 3, community: 2, builtin: 1 };
const EMPTY: SearchCompleteness = Object.freeze({ status: "complete", sources: [], omittedSources: [], unsupportedPredicates: [] });
const READ_ONLY = Object.freeze({ read: true, enter: true, expand: true, composeUnder: false, execute: false });

export function createNamespaceRuntime(projections: ProjectionRuntime, initial: readonly NamespaceMount[] = []): NamespaceRuntime {
  projections.register(builtinDefaultProjection);
  const mounts = new Map<string, NamespaceMount>();
  const cursors = createNamespaceCursorStore();
  const preserved = new Set(projections.definitions());
  for (const mount of initial) addMount(mount);
  if (![...mounts.values()].some((mount) => mount.scope === "builtin" && mount.mountPath === "/")) {
    addMount({ mountId: "builtin-root", scope: "builtin", mountPath: "/", projectionId: "builtin:default", mode: "replace", order: 0, writable: false, createdAt: "1970-01-01T00:00:00.000Z", updatedAt: "1970-01-01T00:00:00.000Z" });
  }

  const runtime: NamespaceRuntime = {
    async list(path, page, context) {
      const normalized = normalizeVirtualPath(path);
      validatePage(page, context);
      if (normalized === RECOVERY_ROOT) return recoveryPage(page, context, cursors);
      if (normalized.startsWith(`${RECOVERY_ROOT}/`)) return recoveryChildPage(normalized, page, projections, context, cursors);
      const components = componentsFor(normalized, mounts.values());
      const candidates = await Promise.all(components.map(async (component) => ({ component, page: await projections.list(component.mount.projectionId, component.relativePath, { first: Math.min(1000, page.first + 1) }, context) })));
      const entries: VfsEntry[] = [];
      const shadowed: ShadowedNamespaceEntry[] = [];
      const winners = new Map<string, VfsEntry>();
      if (normalized === "/") {
        const recovery = recoveryEntry(RECOVERY_ROOT)!;
        winners.set(recovery.name, recovery);
        entries.push(recovery);
      }
      for (const candidate of candidates) {
        for (const raw of candidate.page.entries) {
          const entry = namespaceEntry(raw, candidate.component.mount, normalized);
          const winner = winners.get(entry.name);
          if (winner === undefined) {
            winners.set(entry.name, entry);
            entries.push(entry);
          } else shadowed.push(Object.freeze({ name: entry.name, winner, entry, mountId: candidate.component.mount.mountId, reason: "shadowed" }));
        }
      }
      for (const mountEntry of childMountEntries(normalized, mounts.values())) {
        const winner = winners.get(mountEntry.name);
        if (winner === undefined) { winners.set(mountEntry.name, mountEntry); entries.push(mountEntry); }
        else shadowed.push(Object.freeze({ name: mountEntry.name, winner, entry: mountEntry, mountId: mountEntry.entryId, reason: "shadowed" }));
      }
      return pageOf(entries, page, combineCompleteness(candidates.map((candidate) => candidate.page.freshness)), shadowed, candidates.map((candidate) => candidate.component.mount.mountId), context, cursors);
    },

    async resolve(path, context) {
      const normalized = normalizeVirtualPath(path);
      validateContext(context);
      const recovery = recoveryEntry(normalized);
      if (recovery !== undefined) return recovery;
      if (normalized.startsWith(`${RECOVERY_ROOT}/`)) return resolveRecoveryChild(normalized, projections, context);
      for (const component of componentsFor(normalized, mounts.values())) {
        const resolved = await projections.resolve(component.mount.projectionId, component.relativePath, context);
        if (resolved !== undefined) return namespaceEntry(resolved, component.mount, parentPath(normalized));
      }
      return undefined;
    },

    async locate(target, context) {
      validateContext(context);
      const results: VfsEntry[] = [];
      const seen = new Set<string>();
      for (const component of componentsFor("/", mounts.values())) {
        for (const entry of await projections.locate(component.mount.projectionId, target, context)) {
          const mounted = namespaceEntry(entry, component.mount, component.mount.mountPath);
          if (!seen.has(mounted.entryId)) { results.push(mounted); seen.add(mounted.entryId); }
        }
      }
      return Object.freeze(results.sort(compareEntry));
    },

    async explain(path, context) {
      const normalized = normalizeVirtualPath(path);
      const components = componentsFor(normalized, mounts.values());
      const occurrences: VfsEntry[] = [];
      for (const component of components) {
        const found = await projections.resolve(component.mount.projectionId, component.relativePath, context);
        if (found !== undefined) occurrences.push(namespaceEntry(found, component.mount, parentPath(normalized)));
      }
      const entry = occurrences[0];
      const shadowed = occurrences.slice(1);
      return Object.freeze({ projectionId: "namespace", path: normalized, ...(entry === undefined ? {} : { entry }), componentOrder: components.map((component) => component.mount.mountId), shadowed, detail: entry === undefined ? "No visible mount component contains the path" : shadowed.length === 0 ? "The first matching mount component provides this path" : `${shadowed.length} lower-precedence occurrence(s) are shadowed` });
    },

    async *watch(path, context) {
      const normalized = normalizeVirtualPath(path);
      const streams = componentsFor(normalized, mounts.values()).map((component) => projections.watch(component.mount.projectionId, component.relativePath, context));
      yield* mergeDeltaStreams(streams, context.signal);
    },

    mounts: () => Object.freeze(sortedMounts(mounts.values())),
    mount: (mount) => addMount(mount),
    unmount(mountId) {
      if (mountId.startsWith("recovery-")) throw protectedRecovery();
      mounts.delete(mountId);
    },
    reset(scope) {
      const removed = [...mounts.values()].filter((mount) => mount.scope === scope).map((mount) => mount.mountId).sort(compareText);
      for (const mountId of removed) mounts.delete(mountId);
      return Object.freeze({ scope, removedMountIds: Object.freeze(removed), preservedProjectionIds: Object.freeze([...preserved].sort(compareText)) });
    },
    definitions: () => Object.freeze([...preserved].sort(compareText)),
    writableMountFor(path, context) {
      validateContext(context);
      const normalized = normalizeVirtualPath(path);
      const writable = componentsFor(normalized, mounts.values()).map((component) => component.mount).filter((mount) => mount.writable);
      if (writable.length === 0) throw new CommunityError("NAMESPACE_MOUNT_CONFLICT", "Namespace path is read-only");
      if (writable.length !== 1) throw new CommunityError("NAMESPACE_MOUNT_CONFLICT", "Namespace write is ambiguous across multiple writable mounts");
      return writable[0]!;
    },
  };
  return Object.freeze(runtime);

  function addMount(input: NamespaceMount): NamespaceMount {
    const mount = validateMount(input);
    if (mount.mountPath === RECOVERY_ROOT || mount.mountPath.startsWith(`${RECOVERY_ROOT}/`)) throw protectedRecovery();
    if (mounts.has(mount.mountId)) throw new CommunityError("NAMESPACE_MOUNT_CONFLICT", `Namespace mount already exists: ${mount.mountId}`);
    if (projections.definition(mount.projectionId) === undefined) throw new CommunityError("PROJECTION_INVALID", `Namespace mount references an unknown projection: ${mount.projectionId}`);
    preserved.add(mount.projectionId);
    mounts.set(mount.mountId, mount);
    return mount;
  }
}

interface MountedComponent { readonly mount: NamespaceMount; readonly relativePath: string }

function componentsFor(path: string, values: Iterable<NamespaceMount>): readonly MountedComponent[] {
  const normalized = normalizeVirtualPath(path);
  const applicable = sortedMounts(values).filter((mount) => isUnder(normalized, mount.mountPath));
  const byPath = new Map<string, NamespaceMount[]>();
  for (const mount of applicable) {
    const group = byPath.get(mount.mountPath) ?? [];
    group.push(mount);
    byPath.set(mount.mountPath, group);
  }
  const output: MountedComponent[] = [];
  for (const [mountPath, group] of [...byPath.entries()].sort(([left], [right]) => right.length - left.length || compareText(left, right))) {
    const ordered = composeGroup(group);
    const relativePath = normalized === mountPath ? "/" : normalized.slice(mountPath === "/" ? 0 : mountPath.length);
    output.push(...ordered.map((mount) => ({ mount, relativePath })));
  }
  return output;
}

function composeGroup(group: readonly NamespaceMount[]): readonly NamespaceMount[] {
  const ranked = [...group].sort(compareMount);
  const replaceIndex = ranked.findIndex((mount) => mount.mode === "replace");
  const replace = replaceIndex < 0 ? undefined : ranked[replaceIndex];
  const before = ranked.filter((mount) => mount.mode === "before" && (replace === undefined || SCOPE_RANK[mount.scope] >= SCOPE_RANK[replace.scope]));
  const after = ranked.filter((mount) => mount.mode === "after" && (replace === undefined || SCOPE_RANK[mount.scope] >= SCOPE_RANK[replace.scope]));
  const base = replace === undefined ? ranked.filter((mount) => mount.mode === "replace") : [replace];
  return [...before, ...base, ...after];
}

function sortedMounts(values: Iterable<NamespaceMount>): NamespaceMount[] { return [...values].sort(compareMount); }
function compareMount(left: NamespaceMount, right: NamespaceMount): number {
  return SCOPE_RANK[right.scope] - SCOPE_RANK[left.scope] || left.order - right.order || compareText(left.mountId, right.mountId);
}

function namespaceEntry(entry: VfsEntry, mount: NamespaceMount, directory: string): VfsEntry {
  const logicalPath = directory === mount.mountPath
    ? (mount.mountPath === "/" ? entry.logicalPath : `${mount.mountPath}${entry.logicalPath}`)
    : joinPath(directory, entry.name);
  return Object.freeze({ ...entry, entryId: `${mount.mountId}:${entry.entryId}`, logicalPath, kind: entry.kind, capabilities: Object.freeze({ ...entry.capabilities, composeUnder: entry.capabilities.composeUnder && mount.writable }) });
}

function recoveryPage(page: PageRequest, context: ProjectionExecutionContext, cursors: NamespaceCursorStore): NamespacePage {
  return pageOf(RECOVERY_NAMES.map((name) => recoveryEntry(`${RECOVERY_ROOT}/${name}`)!), page, EMPTY, [], ["recovery"], context, cursors);
}

async function recoveryChildPage(path: string, page: PageRequest, projections: ProjectionRuntime, context: ProjectionExecutionContext, cursors: NamespaceCursorStore): Promise<NamespacePage> {
  if (path === `${RECOVERY_ROOT}/default`) {
    const value = await projections.list("builtin:default", "/", page, context);
    return { ...value, shadowed: [], componentOrder: ["recovery-default"] };
  }
  if (path === `${RECOVERY_ROOT}/projections`) {
    const entries = projections.definitions().map((projectionId) => makeRecovery(projectionId, `recovery-projection-${stableToken(projectionId)}`, "representation", `${path}/${projectionId}`, projectionId));
    return pageOf(entries, page, EMPTY, [], ["recovery-projections"], context, cursors);
  }
  return pageOf([], page, EMPTY, [], [`recovery-${basename(path)}`], context, cursors);
}

async function resolveRecoveryChild(path: string, projections: ProjectionRuntime, context: ProjectionExecutionContext): Promise<VfsEntry | undefined> {
  if (path.startsWith(`${RECOVERY_ROOT}/default/`)) return projections.resolve("builtin:default", path.slice(`${RECOVERY_ROOT}/default`.length), context);
  const canonical = path.match(/^\/\.epoch\/canonical\/([^/]+)\/([^/]+)$/u);
  if (canonical !== null) {
    let target: CommunityObjectRef;
    try { target = validateObjectRef({ objectId: canonical[2] ?? "", kind: canonical[1] ?? "" }); } catch { return undefined; }
    for (const projectionId of projections.definitions()) if ((await projections.locate(projectionId, target, context)).length > 0) {
      return Object.freeze({ ...makeRecovery(target.objectId, `recovery-canonical-${stableToken(`${target.kind}:${target.objectId}`)}`, "entity", path), target });
    }
    return undefined;
  }
  if (path.startsWith(`${RECOVERY_ROOT}/projections/`)) {
    const projectionId = path.slice(`${RECOVERY_ROOT}/projections/`.length);
    if (projections.definition(projectionId) !== undefined) return makeRecovery(projectionId, `recovery-projection-${stableToken(projectionId)}`, "representation", path, projectionId);
  }
  return recoveryEntry(path);
}

function recoveryEntry(path: string): VfsEntry | undefined {
  if (path === RECOVERY_ROOT) return makeRecovery(".epoch", "recovery-root", "directory", RECOVERY_ROOT);
  if (!path.startsWith(`${RECOVERY_ROOT}/`)) return undefined;
  const remainder = path.slice(`${RECOVERY_ROOT}/`.length);
  if (!RECOVERY_NAMES.includes(remainder as typeof RECOVERY_NAMES[number])) return undefined;
  const kind = remainder === "default" ? "mount" : "directory";
  return makeRecovery(remainder, `recovery-${remainder}`, kind, path, remainder === "default" ? "builtin:default" : `recovery:${remainder}`);
}

function makeRecovery(name: string, entryId: string, kind: VfsEntry["kind"], logicalPath: string, projectionId = "recovery"): VfsEntry {
  const target: CommunityObjectRef = { objectId: entryId, kind: "projection" };
  return Object.freeze({ entryId, target, projectionId, projectionVersion: 1, parentEntryId: "recovery-root", name, logicalPath, kind, sortKey: [name], capabilities: READ_ONLY, freshness: EMPTY });
}

function validateMount(input: NamespaceMount): NamespaceMount {
  if (!/^[A-Za-z0-9][A-Za-z0-9._~-]{0,127}$/u.test(input.mountId)) throw new CommunityError("NAMESPACE_MOUNT_CONFLICT", "Mount ID must be an opaque URL-safe identifier");
  const mountPath = normalizeVirtualPath(input.mountPath);
  if (!Object.hasOwn(SCOPE_RANK, input.scope) || !["replace", "before", "after"].includes(input.mode)) throw new CommunityError("NAMESPACE_MOUNT_CONFLICT", "Namespace mount scope or mode is invalid");
  if (!Number.isSafeInteger(input.order)) throw new CommunityError("NAMESPACE_MOUNT_CONFLICT", "Namespace mount order must be a safe integer");
  return Object.freeze({ ...input, mountPath });
}

function childMountEntries(path: string, values: Iterable<NamespaceMount>): readonly VfsEntry[] {
  const childMounts = sortedMounts(values).filter((mount) => mount.mountPath !== "/" && parentPath(mount.mountPath) === path);
  const output: VfsEntry[] = [];
  const seen = new Set<string>();
  for (const mount of childMounts) {
    const name = basename(mount.mountPath);
    if (seen.has(name)) continue;
    seen.add(name);
    const target: CommunityObjectRef = { objectId: `mount-${mount.mountId}`, kind: "projection" };
    output.push(Object.freeze({ entryId: `mount-${mount.mountId}`, target, projectionId: mount.projectionId, projectionVersion: 1, parentEntryId: "namespace", name, logicalPath: mount.mountPath, kind: "mount", sortKey: [name, mount.mountId], capabilities: READ_ONLY, freshness: EMPTY }));
  }
  return output;
}

function pageOf(entries: readonly VfsEntry[], page: PageRequest, freshness: SearchCompleteness, shadowed: readonly ShadowedNamespaceEntry[], componentOrder: readonly string[], context: ProjectionExecutionContext, cursors: NamespaceCursorStore): NamespacePage {
  const cursor = page.after === undefined ? undefined : cursors.decode(page.after, context);
  const start = cursor === undefined ? 0 : entries.findIndex((entry) => entry.entryId === cursor.entryId) + 1;
  if (cursor !== undefined && start === 0) throw new CommunityError("CURSOR_STALE", "Namespace cursor no longer resolves in this snapshot");
  const values = entries.slice(start, start + page.first);
  const hasNextPage = start + page.first < entries.length;
  const pageInfo: KeysetPageInfo = Object.freeze({ hasNextPage, ...(hasNextPage && values.length > 0 ? { endCursor: cursors.encode(values.at(-1)!.entryId, context) } : {}) });
  return Object.freeze({ entries: Object.freeze(values), pageInfo, freshness, shadowed: Object.freeze([...shadowed]), componentOrder: Object.freeze([...componentOrder]) });
}

interface NamespaceCursorStore {
  encode(entryId: string, context: ProjectionExecutionContext): string;
  decode(cursor: string, context: ProjectionExecutionContext): { readonly entryId: string };
}

function createNamespaceCursorStore(): NamespaceCursorStore {
  const issued = new Map<string, { readonly entryId: string; readonly snapshotId: string; readonly authorizationFingerprint: string }>();
  return {
    encode(entryId, context) {
      const bytes = globalThis.crypto?.getRandomValues(new Uint8Array(24));
      if (bytes === undefined) throw new CommunityError("CRYPTO_UNAVAILABLE", "Namespace cursor generation is unavailable");
      let binary = "";
      for (const byte of bytes) binary += String.fromCharCode(byte);
      const token = globalThis.btoa(binary).replace(/\+/gu, "-").replace(/\//gu, "_").replace(/=+$/gu, "");
      issued.set(token, { entryId, snapshotId: context.snapshotId, authorizationFingerprint: context.authorizationFingerprint });
      if (issued.size > 4096) issued.delete(issued.keys().next().value as string);
      return token;
    },
    decode(cursor, context) {
      if (!/^[A-Za-z0-9_-]{32}$/u.test(cursor)) throw new CommunityError("CURSOR_INVALID", "Namespace cursor is malformed");
      const value = issued.get(cursor);
      if (value === undefined || value.snapshotId !== context.snapshotId || value.authorizationFingerprint !== context.authorizationFingerprint) {
        throw new CommunityError("CURSOR_STALE", "Namespace cursor does not match this snapshot or authorization");
      }
      return { entryId: value.entryId };
    },
  };
}

function validatePage(page: PageRequest, context: ProjectionExecutionContext): void {
  validateContext(context);
  if (!Number.isInteger(page.first) || page.first < 1 || page.first > 1000) throw new CommunityError("PROJECTION_INVALID", "Namespace page size must be between 1 and 1000");
}
function validateContext(context: ProjectionExecutionContext): void {
  if (!context.authorizationFingerprint || !context.snapshotId) throw new CommunityError("AUTHORIZATION_DENIED", "Namespace operation requires snapshot-bound authorization");
}
function protectedRecovery(): CommunityError { return new CommunityError("NAMESPACE_RECOVERY_PROTECTED", "The /.epoch recovery namespace is immutable"); }
function isUnder(path: string, mountPath: string): boolean { return mountPath === "/" || path === mountPath || path.startsWith(`${mountPath}/`); }
function parentPath(path: string): string { const values = path.split("/").filter(Boolean); values.pop(); return values.length === 0 ? "/" : `/${values.join("/")}`; }
function basename(path: string): string { return path.split("/").filter(Boolean).at(-1) ?? ""; }
function joinPath(parent: string, name: string): string { return parent === "/" ? `/${name}` : `${parent}/${name}`; }
function compareEntry(left: VfsEntry, right: VfsEntry): number { return compareText(left.name, right.name) || compareText(left.entryId, right.entryId); }
function compareText(left: string, right: string): number { return left < right ? -1 : left > right ? 1 : 0; }
function stableToken(value: string): string {
  let hash = 0xcbf29ce484222325n;
  for (const byte of new TextEncoder().encode(value)) { hash ^= BigInt(byte); hash = BigInt.asUintN(64, hash * 0x100000001b3n); }
  return hash.toString(36);
}

async function* mergeDeltaStreams(streams: readonly AsyncIterable<ProjectionDelta>[], signal: AbortSignal): AsyncIterable<ProjectionDelta> {
  const iterators = streams.map((stream) => stream[Symbol.asyncIterator]());
  const pending = new Map<number, Promise<{ readonly index: number; readonly result: IteratorResult<ProjectionDelta> }>>();
  const schedule = (index: number): void => {
    const iterator = iterators[index];
    if (iterator !== undefined) pending.set(index, iterator.next().then((result) => ({ index, result })));
  };
  iterators.forEach((_, index) => schedule(index));
  try {
    while (pending.size > 0 && !signal.aborted) {
      const next = await Promise.race(pending.values());
      pending.delete(next.index);
      if (next.result.done !== true) {
        yield next.result.value;
        schedule(next.index);
      }
    }
  } finally {
    await Promise.all(iterators.map(async (iterator) => iterator.return?.()));
  }
}
