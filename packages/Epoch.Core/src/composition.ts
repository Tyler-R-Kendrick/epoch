import { createHash } from "node:crypto";
import { z } from "zod";
import { canonicalJson } from "./json";
import { CompositionEventType, CompositionFormat, LinkAvailability, TextToken } from "./domain";
import { SelectionError, canonicalSelectionPath, normalizeSelection, resolveSelection, selectPath, type ResolvedSelection, type SelectableResource, type Selection } from "./selection";
import { buildNamespaceManifest, namespaceResources, type NamespaceManifest, type NamespaceLinkInput } from "./namespace";

/**
 * Repository Links: the one native primitive for embedding an independently owned repository.
 *
 * A Link pins an exact child Version. It is read-only from the parent workspace, conveys no
 * authorization, and executes no child code. "Submodule", "subtree", and "subrepo" stay Git
 * interoperability terms and never become Epoch nouns. See ADR-0043.
 */
export const RepositoryLinkSchema = z.object({
  linkId: z.string().min(1),
  mountPath: z.string().min(1),
  target: z.object({
    repositoryId: z.string().min(1),
    versionId: z.string().min(1),
    namespaceRoot: z.string().regex(/^[a-f0-9]{64}$/u),
    sourcePath: z.string().min(1).optional(),
  }),
  resolverHints: z.array(z.object({
    kind: z.string().min(1),
    locator: z.string().min(1),
  })).optional(),
});

export type RepositoryLink = z.infer<typeof RepositoryLinkSchema>;
export type ResolverHint = NonNullable<RepositoryLink["resolverHints"]>[number];

export class CompositionError extends Error {
  readonly code: string;

  constructor(message: string, code: string) {
    super(message);
    this.name = "CompositionError";
    this.code = code;
  }
}

/** A child repository state a resolver was able to produce. Bytes are not implied by identity. */
export interface ResolvedChildRepository {
  readonly repositoryId: string;
  readonly versionId: string;
  readonly namespaceRoot: string;
  readonly files: Readonly<Record<string, { readonly blobSha256: string; readonly size: number; readonly entityType: string }>>;
  /** Links the child itself declares, used for cycle detection and recursive composition. */
  readonly links?: readonly RepositoryLink[];
}

export interface RepositoryLinkResolver {
  resolve(repositoryId: string, versionId: string): ResolvedChildRepository | undefined;
}

/** In-memory resolver. Core stays transport-free; network resolvers are injected by callers. */
export function createStaticLinkResolver(children: readonly ResolvedChildRepository[]): RepositoryLinkResolver {
  const index = new Map(children.map((child) => [`${child.repositoryId}@${child.versionId}`, child]));
  return {
    resolve(repositoryId, versionId) {
      return index.get(`${repositoryId}@${versionId}`);
    },
  };
}

/**
 * Validates a link before it is recorded.
 *
 * Every failure mode Git leaves to discovery-at-checkout-time is a closed-form rejection here:
 * namespace escape, mount collision, mount overlap, case-folding collision, and self-reference.
 */
export function validateLink(link: RepositoryLink, existing: readonly RepositoryLink[], selfRepositoryId?: string): RepositoryLink {
  const parsed = RepositoryLinkSchema.parse(link);
  const mountPath = canonicalSelectionPath(parsed.mountPath);
  if (parsed.target.sourcePath !== undefined) canonicalSelectionPath(parsed.target.sourcePath);

  if (selfRepositoryId !== undefined && parsed.target.repositoryId === selfRepositoryId) {
    throw new CompositionError(`repository link cannot target its own repository: ${selfRepositoryId}`, "cycle");
  }

  for (const other of existing) {
    if (other.linkId === parsed.linkId) continue;
    const otherMount = canonicalSelectionPath(other.mountPath);
    if (otherMount === mountPath) {
      throw new CompositionError(`repository link mount already in use: ${mountPath}`, "mount-collision");
    }
    if (otherMount.toLowerCase() === mountPath.toLowerCase()) {
      throw new CompositionError(`repository link mounts collide when case-folded: ${otherMount} and ${mountPath}`, "case-collision");
    }
    if (overlaps(otherMount, mountPath)) {
      throw new CompositionError(`repository link mounts overlap: ${otherMount} and ${mountPath}`, "mount-overlap");
    }
  }

  return { ...parsed, mountPath };
}

function overlaps(left: string, right: string): boolean {
  return left.startsWith(`${right}${TextToken.pathSeparator}`) || right.startsWith(`${left}${TextToken.pathSeparator}`);
}

export interface CompositionOwnership {
  readonly path: string;
  readonly repositoryId: string;
  readonly linkId?: string;
  readonly writable: boolean;
}

export interface ResolvedComposition {
  readonly format: typeof CompositionFormat;
  readonly digest: string;
  readonly manifest: NamespaceManifest;
  readonly ownership: readonly CompositionOwnership[];
  readonly links: readonly ResolvedCompositionLink[];
  /** Links that could not be resolved. Unavailable is reported, never silently treated as empty. */
  readonly unresolved: readonly UnresolvedLink[];
}

export interface ResolvedCompositionLink {
  readonly linkId: string;
  readonly mountPath: string;
  readonly repositoryId: string;
  readonly versionId: string;
  readonly namespaceRoot: string;
  readonly fileCount: number;
  readonly availability: typeof LinkAvailability[keyof typeof LinkAvailability];
}

export interface UnresolvedLink {
  readonly linkId: string;
  readonly mountPath: string;
  readonly repositoryId: string;
  readonly versionId: string;
  readonly reason: "unavailable" | "digest-mismatch";
}

export interface ResolveCompositionInput {
  readonly repositoryId: string;
  readonly files: Readonly<Record<string, { readonly blobSha256: string; readonly size: number; readonly entityType: string }>>;
  readonly entities?: Readonly<Record<string, { readonly entityType: string; readonly snapshotDigest: string }>>;
  readonly links: readonly RepositoryLink[];
}

/**
 * Resolves a repository plus its links into one composed namespace.
 *
 * Composition is acyclic and mounts never overlap, so ownership of every path is unambiguous. A
 * child whose bytes are unavailable is reported as unresolved rather than being flattened into
 * "the path does not exist" — that distinction is what keeps availability separate from identity.
 */
export function resolveComposition(
  input: ResolveCompositionInput,
  resolver: RepositoryLinkResolver,
  options: { readonly maxDepth?: number } = {},
): ResolvedComposition {
  const maxDepth = options.maxDepth ?? 32;
  const ownership: CompositionOwnership[] = [];
  const links: ResolvedCompositionLink[] = [];
  const unresolved: UnresolvedLink[] = [];
  const files: Record<string, { blobSha256: string; size: number; entityType: string }> = {};
  const linkInputs: NamespaceLinkInput[] = [];

  for (const [path, file] of Object.entries(input.files)) {
    const canonical = canonicalSelectionPath(path);
    files[canonical] = { ...file };
    ownership.push({ path: canonical, repositoryId: input.repositoryId, writable: true });
  }

  const validated: RepositoryLink[] = [];
  for (const link of input.links) validated.push(validateLink(link, validated, input.repositoryId));

  for (const link of validated) {
    mountChild(link, link.mountPath, [input.repositoryId], 0);
  }

  const manifest = buildNamespaceManifest({
    files,
    ...(input.entities === undefined ? {} : { entities: input.entities }),
    links: linkInputs,
  });

  return {
    format: CompositionFormat,
    digest: sha256Hex(canonicalJson({ root: manifest.root, ownership, links })),
    manifest,
    ownership: ownership.sort((left, right) => left.path.localeCompare(right.path)),
    links,
    unresolved,
  };

  function mountChild(link: RepositoryLink, mountPath: string, ancestry: readonly string[], depth: number): void {
    if (depth > maxDepth) throw new CompositionError(`repository composition exceeded depth ${maxDepth}`, "depth");
    if (ancestry.includes(link.target.repositoryId)) {
      throw new CompositionError(`repository composition cycle through: ${link.target.repositoryId}`, "cycle");
    }

    linkInputs.push({
      linkId: link.linkId,
      mountPath,
      repositoryId: link.target.repositoryId,
      versionId: link.target.versionId,
      namespaceRoot: link.target.namespaceRoot,
      ...(link.target.sourcePath === undefined ? {} : { sourcePath: link.target.sourcePath }),
    });

    const child = resolver.resolve(link.target.repositoryId, link.target.versionId);
    if (child === undefined) {
      unresolved.push({
        linkId: link.linkId,
        mountPath,
        repositoryId: link.target.repositoryId,
        versionId: link.target.versionId,
        reason: "unavailable",
      });
      links.push({
        linkId: link.linkId,
        mountPath,
        repositoryId: link.target.repositoryId,
        versionId: link.target.versionId,
        namespaceRoot: link.target.namespaceRoot,
        fileCount: 0,
        availability: LinkAvailability.unavailable,
      });
      return;
    }

    if (child.namespaceRoot !== link.target.namespaceRoot) {
      unresolved.push({
        linkId: link.linkId,
        mountPath,
        repositoryId: link.target.repositoryId,
        versionId: link.target.versionId,
        reason: "digest-mismatch",
      });
      links.push({
        linkId: link.linkId,
        mountPath,
        repositoryId: link.target.repositoryId,
        versionId: link.target.versionId,
        namespaceRoot: link.target.namespaceRoot,
        fileCount: 0,
        availability: LinkAvailability.corrupt,
      });
      return;
    }

    const prefix = link.target.sourcePath === undefined ? undefined : `${link.target.sourcePath}${TextToken.pathSeparator}`;
    let mounted = 0;
    for (const [childPath, file] of Object.entries(child.files)) {
      const canonical = canonicalSelectionPath(childPath);
      if (prefix !== undefined && canonical !== link.target.sourcePath && !canonical.startsWith(prefix)) continue;
      const suffix = prefix === undefined ? canonical : canonical.slice(prefix.length);
      const composed = suffix.length === 0 ? mountPath : `${mountPath}${TextToken.pathSeparator}${suffix}`;
      if (files[composed] !== undefined) {
        throw new CompositionError(`repository link would shadow an owned path: ${composed}`, "mount-collision");
      }
      files[composed] = { ...file };
      ownership.push({ path: composed, repositoryId: child.repositoryId, linkId: link.linkId, writable: false });
      mounted += 1;
    }

    links.push({
      linkId: link.linkId,
      mountPath,
      repositoryId: link.target.repositoryId,
      versionId: link.target.versionId,
      namespaceRoot: link.target.namespaceRoot,
      fileCount: mounted,
      availability: LinkAvailability.resolved,
    });

    for (const nested of child.links ?? []) {
      const nestedMount = `${mountPath}${TextToken.pathSeparator}${canonicalSelectionPath(nested.mountPath)}`;
      mountChild(nested, nestedMount, [...ancestry, child.repositoryId], depth + 1);
    }
  }
}

/**
 * Translates a parent Selection through a link mount into the child's own path space.
 *
 * Returns `undefined` when the Selection excludes the mount entirely — the caller should then keep
 * only the link descriptor and fetch nothing from the child. This is the integration Git omits,
 * where sparse-checkout and submodule population never consult each other.
 */
export function translateSelectionForLink(
  selection: Selection,
  link: { readonly mountPath: string; readonly sourcePath?: string },
  childResources: readonly SelectableResource[],
): ResolvedSelection | undefined {
  const mountPath = canonicalSelectionPath(link.mountPath);
  const composed: SelectableResource[] = childResources.map((resource) => ({
    kind: resource.kind,
    path: composeChildPath(mountPath, link.sourcePath, resource.path),
  }));

  const resolvedComposed = resolveSelection(selection, composed);
  const keep = new Set([...resolvedComposed.paths, ...resolvedComposed.links]);
  if (keep.size === 0) return undefined;

  const childSelected = childResources.filter((resource) => keep.has(composeChildPath(mountPath, link.sourcePath, resource.path)));
  const childSelection = childSelected.length === childResources.length
    ? normalizeSelection({ kind: "all" })
    : normalizeSelection({ kind: "union", selections: childSelected.map((resource) => selectPath(resource.path, "self")) });

  return resolveSelection(childSelection, childResources);
}

function composeChildPath(mountPath: string, sourcePath: string | undefined, childPath: string): string {
  if (sourcePath === undefined) return `${mountPath}${TextToken.pathSeparator}${childPath}`;
  const prefix = `${sourcePath}${TextToken.pathSeparator}`;
  if (childPath === sourcePath) return mountPath;
  if (!childPath.startsWith(prefix)) return `${mountPath}${TextToken.pathSeparator}${childPath}`;
  return `${mountPath}${TextToken.pathSeparator}${childPath.slice(prefix.length)}`;
}

export interface LinkRetargetEvent {
  readonly eventId: string;
  readonly linkId: string;
  readonly fromVersionId: string;
  readonly toVersionId: string;
}

export interface LinkRetargetConflict {
  readonly linkId: string;
  readonly fromVersionId: string;
  readonly sides: readonly { readonly eventId: string; readonly versionId: string }[];
}

/**
 * Detects concurrent retargets of one stable link.
 *
 * Two peers moving the same link off the same base to different child Versions is a real
 * disagreement about which child state the parent pins, so it becomes a durable conflict with both
 * sides preserved rather than a last-writer-wins overwrite (ADR-0031).
 */
export function detectLinkRetargetConflicts(events: readonly LinkRetargetEvent[]): readonly LinkRetargetConflict[] {
  const groups = new Map<string, LinkRetargetEvent[]>();
  for (const event of events) {
    const key = `${event.linkId} ${event.fromVersionId}`;
    const existing = groups.get(key);
    if (existing === undefined) groups.set(key, [event]);
    else existing.push(event);
  }

  const conflicts: LinkRetargetConflict[] = [];
  for (const group of groups.values()) {
    const distinct = new Set(group.map((event) => event.toVersionId));
    if (distinct.size < 2) continue;
    const first = group[0] as LinkRetargetEvent;
    conflicts.push({
      linkId: first.linkId,
      fromVersionId: first.fromVersionId,
      sides: group
        .map((event) => ({ eventId: event.eventId, versionId: event.toVersionId }))
        .sort((left, right) => left.versionId.localeCompare(right.versionId)),
    });
  }
  return conflicts.sort((left, right) => left.linkId.localeCompare(right.linkId));
}

export interface VendorProvenance {
  readonly format: typeof CompositionFormat;
  readonly sourceRepositoryId: string;
  readonly sourceVersionId: string;
  readonly sourcePath?: string;
  readonly destinationPath: string;
  readonly importedRoot: string;
  readonly fileCount: number;
}

export interface VendorPlan {
  readonly provenance: VendorProvenance;
  readonly files: Readonly<Record<string, { readonly blobSha256: string; readonly size: number; readonly entityType: string }>>;
}

/**
 * Plans a vendorize: copy a linked child's files into ordinary parent-owned paths.
 *
 * There is no native subtree type. What makes the copy trustworthy afterwards is the recorded
 * provenance (exact source repository, version, and imported root digest), which is also what the
 * later three-way update merges against.
 */
export function planVendorize(link: RepositoryLink, child: ResolvedChildRepository): VendorPlan {
  if (child.namespaceRoot !== link.target.namespaceRoot) {
    throw new CompositionError(`vendorize refused: child namespace root does not match the pinned link target`, "digest-mismatch");
  }
  const mountPath = canonicalSelectionPath(link.mountPath);
  const sourcePath = link.target.sourcePath;
  const prefix = sourcePath === undefined ? undefined : `${sourcePath}${TextToken.pathSeparator}`;
  const files: Record<string, { blobSha256: string; size: number; entityType: string }> = {};

  for (const [childPath, file] of Object.entries(child.files)) {
    const canonical = canonicalSelectionPath(childPath);
    if (prefix !== undefined && canonical !== sourcePath && !canonical.startsWith(prefix)) continue;
    const suffix = prefix === undefined ? canonical : canonical.slice(prefix.length);
    files[suffix.length === 0 ? mountPath : `${mountPath}${TextToken.pathSeparator}${suffix}`] = { ...file };
  }

  return {
    provenance: {
      format: CompositionFormat,
      sourceRepositoryId: link.target.repositoryId,
      sourceVersionId: link.target.versionId,
      ...(sourcePath === undefined ? {} : { sourcePath }),
      destinationPath: mountPath,
      importedRoot: link.target.namespaceRoot,
      fileCount: Object.keys(files).length,
    },
    files,
  };
}

export interface VendorUpdate {
  readonly added: readonly string[];
  readonly updated: readonly string[];
  readonly removed: readonly string[];
  readonly conflicts: readonly string[];
  readonly unchanged: readonly string[];
}

/**
 * Three-way merge for a vendored tree: last imported upstream, new upstream, current local.
 *
 * A path both sides changed differently is a conflict, not a silent upstream win. This is the
 * merge Git subtree approximates by reconstructing synthetic history on every split.
 */
export function planVendorUpdate(
  lastImported: Readonly<Record<string, string>>,
  upstream: Readonly<Record<string, string>>,
  local: Readonly<Record<string, string>>,
): VendorUpdate {
  const added: string[] = [];
  const updated: string[] = [];
  const removed: string[] = [];
  const conflicts: string[] = [];
  const unchanged: string[] = [];

  for (const path of new Set([...Object.keys(lastImported), ...Object.keys(upstream), ...Object.keys(local)])) {
    const base = lastImported[path];
    const next = upstream[path];
    const current = local[path];

    if (next === current) {
      if (next !== undefined) unchanged.push(path);
      continue;
    }
    if (base === current) {
      if (next === undefined) removed.push(path);
      else if (current === undefined) added.push(path);
      else updated.push(path);
      continue;
    }
    if (base === next) {
      unchanged.push(path);
      continue;
    }
    conflicts.push(path);
  }

  return {
    added: added.sort(),
    updated: updated.sort(),
    removed: removed.sort(),
    conflicts: conflicts.sort(),
    unchanged: unchanged.sort(),
  };
}

export const ExternalRevisionDependencySchema = z.object({
  repositoryId: z.string().min(1),
  revisionId: z.string().min(1).optional(),
  versionId: z.string().min(1).optional(),
  expectedDigest: z.string().regex(/^[a-f0-9]{64}$/u),
});

export type ExternalRevisionDependency = z.infer<typeof ExternalRevisionDependencySchema>;

/**
 * Validates a repository-qualified Change dependency.
 *
 * Requiring an exact revision or version plus an expected digest is what stops a cross-repository
 * dependency from degrading into "whatever that repository's branch says today".
 */
export function validateExternalDependency(dependency: ExternalRevisionDependency): ExternalRevisionDependency {
  const parsed = ExternalRevisionDependencySchema.parse(dependency);
  if (parsed.revisionId === undefined && parsed.versionId === undefined) {
    throw new CompositionError("external dependency must pin an exact revisionId or versionId", "unpinned");
  }
  return parsed;
}

export interface CrossRepositoryPublication {
  readonly ready: boolean;
  readonly blockedBy: readonly string[];
  readonly atomic: boolean;
}

/**
 * Reports whether a parent pin may be accepted yet.
 *
 * Atomicity is claimed only when every participant shares one transaction authority; otherwise the
 * honest answer is a sequenced publication with receipts, not a pretence of an all-or-nothing
 * commit across independently governed repositories.
 */
export function planCrossRepositoryPublication(
  dependencies: readonly ExternalRevisionDependency[],
  published: ReadonlyMap<string, string>,
  options: { readonly sharedTransactionAuthority?: boolean } = {},
): CrossRepositoryPublication {
  const blockedBy: string[] = [];
  for (const dependency of dependencies) {
    validateExternalDependency(dependency);
    const actual = published.get(dependency.repositoryId);
    if (actual === undefined) blockedBy.push(`${dependency.repositoryId}: not published`);
    else if (actual !== dependency.expectedDigest) blockedBy.push(`${dependency.repositoryId}: digest mismatch`);
  }
  return {
    ready: blockedBy.length === 0,
    blockedBy: blockedBy.sort(),
    atomic: options.sharedTransactionAuthority === true,
  };
}

/** Diagnoses why a path is absent, so "excluded" is never confused with "unavailable" or "corrupt". */
export function diagnoseAbsentPath(input: {
  readonly path: string;
  readonly inNamespace: boolean;
  readonly selected: boolean;
  readonly resident: boolean;
  readonly authorized: boolean;
  readonly digestMatches: boolean;
}): { readonly reason: string; readonly remedy: string } {
  if (!input.inNamespace) return { reason: "absent", remedy: "the path is not in this repository state" };
  if (!input.authorized) return { reason: "unauthorized", remedy: "request a grant covering this path" };
  if (!input.selected) return { reason: "excluded", remedy: "add the path to the workspace selection" };
  if (!input.resident) return { reason: "promised", remedy: "hydrate the path from a resolver" };
  if (!input.digestMatches) return { reason: "corrupt", remedy: "re-fetch the object; resident bytes failed verification" };
  return { reason: "present", remedy: "no action needed" };
}

export const CompositionEventTypes = CompositionEventType;

export function compositionResources(composition: ResolvedComposition): readonly SelectableResource[] {
  return namespaceResources(composition.manifest);
}

export function assertCanonicalMount(mountPath: string): string {
  try {
    return canonicalSelectionPath(mountPath);
  } catch (error) {
    if (error instanceof SelectionError) throw new CompositionError(error.message, error.code);
    throw error;
  }
}

function sha256Hex(value: string): string {
  return createHash("sha256").update(value).digest("hex");
}
