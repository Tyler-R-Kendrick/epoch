import { createHash } from "node:crypto";
import { canonicalJson } from "./json";
import { NamespaceFormat, NamespaceShardThreshold, SparseIndexFormat, TextToken } from "./domain";
import { SelectionError, canonicalSelectionPath, type ResolvedSelection, type SelectableResource } from "./selection";

/**
 * The Namespace Manifest: a content-addressed directory DAG describing one repository state.
 *
 * This exists so a workspace's local index can be proportional to its Selection rather than to the
 * whole repository. Object promises solved missing *bytes*; unselected directories collapse to a
 * single opaque digest here, which solves missing *metadata*. It is derived and regenerable — the
 * signed event graph stays authoritative. See ADR-0041.
 */
export interface NamespaceFileEntry {
  readonly kind: "file";
  readonly name: string;
  readonly blobSha256: string;
  readonly size: number;
  readonly entityType: string;
}

export interface NamespaceEntityEntry {
  readonly kind: "entity";
  readonly name: string;
  readonly entityType: string;
  readonly snapshotDigest: string;
}

export interface NamespaceLinkEntry {
  readonly kind: "repository-link";
  readonly name: string;
  readonly linkId: string;
  readonly repositoryId: string;
  readonly versionId: string;
  readonly namespaceRoot: string;
  readonly sourcePath?: string;
}

export interface NamespaceDirectoryEntry {
  readonly kind: "directory";
  readonly name: string;
  readonly digest: string;
  readonly fileCount: number;
  readonly totalSize: number;
}

export type NamespaceEntry = NamespaceFileEntry | NamespaceEntityEntry | NamespaceLinkEntry | NamespaceDirectoryEntry;

export interface NamespaceNode {
  readonly format: typeof NamespaceFormat;
  readonly entries: readonly NamespaceEntry[];
  /** Present when a directory exceeded the shard threshold and was split by name bucket. */
  readonly shards?: readonly { readonly bucket: string; readonly digest: string }[];
}

export interface NamespaceManifest {
  readonly format: typeof NamespaceFormat;
  readonly root: string;
  readonly nodes: ReadonlyMap<string, NamespaceNode>;
  readonly fileCount: number;
  readonly totalSize: number;
}

export interface NamespaceInput {
  readonly files?: Readonly<Record<string, { readonly blobSha256: string; readonly size: number; readonly entityType: string }>>;
  readonly entities?: Readonly<Record<string, { readonly entityType: string; readonly snapshotDigest: string }>>;
  readonly links?: readonly NamespaceLinkInput[];
}

export interface NamespaceLinkInput {
  readonly linkId: string;
  readonly mountPath: string;
  readonly repositoryId: string;
  readonly versionId: string;
  readonly namespaceRoot: string;
  readonly sourcePath?: string;
}

interface MutableDirectory {
  readonly files: Map<string, NamespaceFileEntry>;
  readonly entities: Map<string, NamespaceEntityEntry>;
  readonly links: Map<string, NamespaceLinkEntry>;
  readonly directories: Map<string, MutableDirectory>;
}

function emptyDirectory(): MutableDirectory {
  return { files: new Map(), entities: new Map(), links: new Map(), directories: new Map() };
}

/**
 * Builds the manifest DAG.
 *
 * Case-folding collisions fail closed here rather than at checkout time on a case-insensitive
 * filesystem, where the loser would silently overwrite the winner.
 */
export function buildNamespaceManifest(input: NamespaceInput): NamespaceManifest {
  const root = emptyDirectory();
  const caseIndex = new Map<string, string>();

  for (const [path, file] of Object.entries(input.files ?? {})) {
    const canonical = canonicalSelectionPath(path);
    assertNoCaseCollision(caseIndex, canonical);
    const directory = descend(root, parentSegments(canonical));
    const name = leafName(canonical);
    directory.files.set(name, { kind: "file", name, blobSha256: file.blobSha256, size: file.size, entityType: file.entityType });
  }

  for (const [name, entity] of Object.entries(input.entities ?? {})) {
    if (name.length === 0) throw new SelectionError("entity name must not be empty", "invalid-path");
    root.entities.set(name, { kind: "entity", name, entityType: entity.entityType, snapshotDigest: entity.snapshotDigest });
  }

  for (const link of input.links ?? []) {
    const canonical = canonicalSelectionPath(link.mountPath);
    assertNoCaseCollision(caseIndex, canonical);
    const directory = descend(root, parentSegments(canonical));
    const name = leafName(canonical);
    const sourcePath = link.sourcePath === undefined ? {} : { sourcePath: link.sourcePath };
    directory.links.set(name, {
      kind: "repository-link",
      name,
      linkId: link.linkId,
      repositoryId: link.repositoryId,
      versionId: link.versionId,
      namespaceRoot: link.namespaceRoot,
      ...sourcePath,
    });
  }

  const nodes = new Map<string, NamespaceNode>();
  const summary = writeDirectory(root, nodes);
  return { format: NamespaceFormat, root: summary.digest, nodes, fileCount: summary.fileCount, totalSize: summary.totalSize };
}

function assertNoCaseCollision(index: Map<string, string>, path: string): void {
  const folded = path.toLowerCase();
  const existing = index.get(folded);
  if (existing !== undefined && existing !== path) {
    throw new SelectionError(`namespace paths collide when case-folded: ${existing} and ${path}`, "case-collision");
  }
  index.set(folded, path);
}

function parentSegments(path: string): readonly string[] {
  const segments = path.split(TextToken.pathSeparator);
  return segments.slice(0, -1);
}

function leafName(path: string): string {
  const segments = path.split(TextToken.pathSeparator);
  // SAFETY: Runtime checks or construction above establish string.
  return segments[segments.length - 1] as string;
}

function descend(directory: MutableDirectory, segments: readonly string[]): MutableDirectory {
  let current = directory;
  for (const segment of segments) {
    let next = current.directories.get(segment);
    if (next === undefined) {
      next = emptyDirectory();
      current.directories.set(segment, next);
    }
    current = next;
  }
  return current;
}

interface DirectorySummary {
  readonly digest: string;
  readonly fileCount: number;
  readonly totalSize: number;
}

function writeDirectory(
  directory: MutableDirectory,
  nodes: Map<string, NamespaceNode>,
): DirectorySummary {
  const entries: NamespaceEntry[] = [];
  let fileCount = 0;
  let totalSize = 0;

  for (const file of directory.files.values()) {
    entries.push(file);
    fileCount += 1;
    totalSize += file.size;
  }
  for (const entity of directory.entities.values()) entries.push(entity);
  for (const link of directory.links.values()) entries.push(link);

  for (const [name, child] of directory.directories) {
    const summary = writeDirectory(child, nodes);
    entries.push({ kind: "directory", name, digest: summary.digest, fileCount: summary.fileCount, totalSize: summary.totalSize });
    fileCount += summary.fileCount;
    totalSize += summary.totalSize;
  }

  entries.sort((left, right) => left.name.localeCompare(right.name) || left.kind.localeCompare(right.kind));

  const node: NamespaceNode = entries.length > NamespaceShardThreshold
    ? shardNode(entries, nodes)
    : { format: NamespaceFormat, entries };
  const digest = nodeDigest(node);
  nodes.set(digest, node);
  return { digest, fileCount, totalSize };
}

/** Very large directories split into name-bucketed shard nodes so one node never grows unbounded. */
function shardNode(entries: readonly NamespaceEntry[], nodes: Map<string, NamespaceNode>): NamespaceNode {
  const buckets = new Map<string, NamespaceEntry[]>();
  for (const entry of entries) {
    const bucket = sha256Hex(entry.name).slice(0, 2);
    const existing = buckets.get(bucket);
    if (existing === undefined) buckets.set(bucket, [entry]);
    else existing.push(entry);
  }
  const shards = [...buckets.entries()]
    .sort(([left], [right]) => left.localeCompare(right))
    .map(([bucket, bucketEntries]) => {
      const node: NamespaceNode = { format: NamespaceFormat, entries: bucketEntries };
      const digest = nodeDigest(node);
      nodes.set(digest, node);
      return { bucket, digest };
    });
  return { format: NamespaceFormat, entries: [], shards };
}

export function nodeDigest(node: NamespaceNode): string {
  // SAFETY: Runtime checks or construction above establish unknown)).
  return sha256Hex(canonicalJson(node as unknown));
}

/** Flattens the DAG into the members a Selection can choose from. */
export function namespaceResources(manifest: NamespaceManifest): readonly SelectableResource[] {
  const resources: SelectableResource[] = [];
  walk(manifest, manifest.root, TextToken.empty, (path, entry) => {
    if (entry.kind === "file") resources.push({ path, kind: "file" });
    else if (entry.kind === "entity") resources.push({ path: entry.name, kind: "entity" });
    else if (entry.kind === "repository-link") resources.push({ path, kind: "repository-link" });
  });
  return resources.sort((left, right) => left.path.localeCompare(right.path) || left.kind.localeCompare(right.kind));
}

/** Looks up one entry by canonical path without materializing the whole namespace. */
export function lookupNamespaceEntry(manifest: NamespaceManifest, path: string): NamespaceEntry | undefined {
  let found: NamespaceEntry | undefined;
  walk(manifest, manifest.root, TextToken.empty, (candidate, entry) => {
    if (found === undefined && candidate === path) found = entry;
  });
  return found;
}

function walk(
  manifest: NamespaceManifest,
  digest: string,
  prefix: string,
  visit: (path: string, entry: NamespaceEntry) => void,
): void {
  const node = manifest.nodes.get(digest);
  if (node === undefined) return;
  for (const shard of node.shards ?? []) walk(manifest, shard.digest, prefix, visit);
  for (const entry of node.entries) {
    const path = prefix.length === 0 ? entry.name : `${prefix}${TextToken.pathSeparator}${entry.name}`;
    if (entry.kind === "directory") {
      walk(manifest, entry.digest, path, visit);
      continue;
    }
    visit(path, entry);
  }
}

export interface SparseIndexEntry {
  readonly path: string;
  readonly kind: "file" | "entity" | "repository-link";
  readonly blobSha256?: string;
  readonly size?: number;
  readonly entityType?: string;
}

export interface SparseOpaqueSubtree {
  readonly path: string;
  readonly digest: string;
  readonly fileCount: number;
  readonly totalSize: number;
}

export interface SparseIndex {
  readonly format: typeof SparseIndexFormat;
  readonly root: string;
  readonly selectionDigest: string;
  readonly entries: readonly SparseIndexEntry[];
  /** Directories with nothing selected inside them, kept as one digest instead of N path entries. */
  readonly opaque: readonly SparseOpaqueSubtree[];
}

/**
 * Builds the local index for a resolved Selection.
 *
 * Entries are complete for selected paths; every directory containing nothing selected collapses to
 * a single opaque reference. This is the property that keeps index size proportional to the
 * Selection instead of to the repository.
 */
export function buildSparseIndex(manifest: NamespaceManifest, resolved: ResolvedSelection): SparseIndex {
  const selectedPaths = new Set(resolved.paths);
  const selectedEntities = new Set(resolved.entities);
  const selectedLinks = new Set(resolved.links);
  const entries: SparseIndexEntry[] = [];
  const opaque: SparseOpaqueSubtree[] = [];

  collect(manifest, manifest.root, TextToken.empty);

  return {
    format: SparseIndexFormat,
    root: manifest.root,
    selectionDigest: resolved.digest,
    entries: entries.sort((left, right) => left.path.localeCompare(right.path)),
    opaque: opaque.sort((left, right) => left.path.localeCompare(right.path)),
  };

  function collect(current: NamespaceManifest, digest: string, prefix: string): void {
    const node = current.nodes.get(digest);
    if (node === undefined) return;
    for (const shard of node.shards ?? []) collect(current, shard.digest, prefix);
    for (const entry of node.entries) {
      const path = prefix.length === 0 ? entry.name : `${prefix}${TextToken.pathSeparator}${entry.name}`;
      switch (entry.kind) {
        case "directory": {
          if (subtreeHasSelection(current, entry.digest, path)) collect(current, entry.digest, path);
          else opaque.push({ path, digest: entry.digest, fileCount: entry.fileCount, totalSize: entry.totalSize });
          break;
        }
        case "file":
          if (selectedPaths.has(path)) {
            entries.push({ path, kind: "file", blobSha256: entry.blobSha256, size: entry.size, entityType: entry.entityType });
          }
          break;
        case "entity":
          if (selectedEntities.has(entry.name)) entries.push({ path: entry.name, kind: "entity", entityType: entry.entityType });
          break;
        case "repository-link":
          if (selectedLinks.has(path)) entries.push({ path, kind: "repository-link" });
          break;
        default:
          break;
      }
    }
  }

  function subtreeHasSelection(current: NamespaceManifest, digest: string, prefix: string): boolean {
    let hit = false;
    walk(current, digest, prefix, (path, entry) => {
      if (hit) return;
      if (entry.kind === "file" && selectedPaths.has(path)) hit = true;
      else if (entry.kind === "entity" && selectedEntities.has(entry.name)) hit = true;
      else if (entry.kind === "repository-link" && selectedLinks.has(path)) hit = true;
    });
    return hit;
  }
}

function sha256Hex(value: string): string {
  return createHash("sha256").update(value).digest("hex");
}
