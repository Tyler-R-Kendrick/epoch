import {
  EpochRepository,
  SelectAll,
  createStaticLinkResolver,
  diagnoseAbsentPath,
  formatSelection,
  parseSelection,
  planVendorUpdate,
  resolveSelection,
  namespaceResources,
  type RepositoryLink,
  type RepositoryLinkResolver,
  type ResolvedChildRepository,
} from "@epoch/core";
type BoundaryValue = null | undefined | boolean | number | string | bigint | symbol | Readonly<object>;
type DictionaryValue = null | undefined | boolean | number | string | bigint | readonly DictionaryValue[] | { readonly [key: string]: DictionaryValue };


/**
 * CLI handlers for Workspace Selection and Repository Links.
 *
 * These keep the four dimensions separately addressable on the command line: `--view` is history,
 * `--select` is scope, `--materialization` is how it lands on disk, and `component` is topology.
 */
export interface CompositionCommandResult {
  readonly data: unknown;
}

export function commandError(code: string, message: string): Error & { code: string } {
  return Object.assign(new Error(message), { code });
}

function required(value: string | undefined, what: string): string {
  if (value === undefined || value.length === 0) throw commandError("invalid-input", `${what} is required`);
  return value;
}

/** `epoch workspace select <show|set|add|remove|profile|index|explain>` */
export function executeSelectionCommand(
  repository: EpochRepository,
  action: string | undefined,
  positionals: readonly string[],
  options: { readonly view?: string; readonly description?: string },
): BoundaryValue {
  switch (action) {
    case undefined:
    case "show": {
      const selection = repository.workspaceSelection();
      const resolved = resolveSelection(
        selection,
        namespaceResources(repository.namespaceManifest(repository.computeViewState(options.view ?? repository.currentView()))),
        { profiles: repository.selectionProfiles() },
      );
      return {
        expression: formatSelection(selection),
        selectionDigest: resolved.selectionDigest,
        resolvedDigest: resolved.digest,
        selected: resolved.paths.length,
        excluded: resolved.excludedCount,
        paths: resolved.paths,
        entities: resolved.entities,
        links: resolved.links,
      };
    }
    case "set": {
      const expression = required(positionals.join(" "), "selection expression");
      const selection = repository.setWorkspaceSelection(parseSelection(expression));
      return { expression: formatSelection(selection) };
    }
    case "clear": {
      const selection = repository.setWorkspaceSelection(SelectAll);
      return { expression: formatSelection(selection) };
    }
    case "add": {
      if (positionals.length === 0) throw commandError("invalid-input", "at least one path is required");
      const current = formatSelection(repository.workspaceSelection());
      const next = current === "*" ? positionals.join(" + ") : `${current} + ${positionals.join(" + ")}`;
      const selection = repository.setWorkspaceSelection(parseSelection(next));
      return { expression: formatSelection(selection) };
    }
    case "remove": {
      if (positionals.length === 0) throw commandError("invalid-input", "at least one path is required");
      const current = formatSelection(repository.workspaceSelection());
      const selection = repository.setWorkspaceSelection(parseSelection(`${current} - ${positionals.join(" - ")}`));
      return { expression: formatSelection(selection) };
    }
    case "profile": {
      const profileId = required(positionals[0], "profile id");
      const expression = positionals.slice(1).join(" ");
      if (expression.length === 0) {
        const profile = repository.selectionProfiles().find((candidate) => candidate.profileId === profileId);
        if (profile === undefined) throw commandError("not-found", `unknown selection profile: ${profileId}`);
        return { profileId, expression: formatSelection(profile.selection) };
      }
      const profiles = repository.defineSelectionProfile(
        profileId,
        parseSelection(expression),
        options.description === "" ? undefined : options.description,
      );
      return { profiles: profiles.map((profile) => ({ profileId: profile.profileId, expression: formatSelection(profile.selection) })) };
    }
    case "index": {
      const index = repository.sparseIndex(options.view === undefined || options.view === "" ? {} : { view: options.view });
      return {
        root: index.root,
        selectionDigest: index.selectionDigest,
        entries: index.entries.length,
        opaqueSubtrees: index.opaque.length,
        // The point of the sparse index: metadata tracks the selection, not the repository.
        opaqueFilesElided: index.opaque.reduce((total, subtree) => total + subtree.fileCount, 0),
        detail: { entries: index.entries, opaque: index.opaque },
      };
    }
    case "explain": {
      const path = required(positionals[0], "path");
      const state = repository.computeViewState(options.view ?? repository.currentView());
      const namespace = repository.namespaceManifest(state);
      const resolved = resolveSelection(repository.workspaceSelection(), namespaceResources(namespace), {
        profiles: repository.selectionProfiles(),
      });
      const record = state.records[path];
      const diagnosis = diagnoseAbsentPath({
        path,
        inNamespace: record !== undefined,
        selected: resolved.paths.includes(path),
        resident: record !== undefined && repository.blobPresent(record.blobSha256),
        authorized: true,
        digestMatches: true,
      });
      return { path, ...diagnosis };
    }
    default:
      throw commandError("invalid-command", `unsupported workspace select action: ${action}`);
  }
}

/** `epoch component <link|list|show|retarget|remove|verify|vendorize|conflicts|update-plan>` */
export function executeComponentCommand(
  repository: EpochRepository,
  action: string | undefined,
  positionals: readonly string[],
  options: {
    readonly repositoryId?: string;
    readonly versionId?: string;
    readonly namespaceRoot?: string;
    readonly sourcePath?: string;
    readonly from?: string;
    readonly hint?: string;
  },
  resolver?: RepositoryLinkResolver,
): BoundaryValue {
  switch (action) {
    case "link": {
      const mountPath = required(positionals[0], "mount path");
      const link: RepositoryLink = {
        linkId: positionals[1] ?? `link-${mountPath.replace(/[^a-zA-Z0-9]+/gu, "-")}`,
        mountPath,
        target: {
          repositoryId: required(options.repositoryId, "--repository-id"),
          versionId: required(options.versionId, "--version-id"),
          namespaceRoot: required(options.namespaceRoot, "--namespace-root"),
          ...(!(options.sourcePath === undefined || options.sourcePath === "") && { sourcePath: options.sourcePath }),
        },
        ...(!(options.hint === undefined || options.hint === "") && { resolverHints: [{ kind: "locator", locator: options.hint }] }),
      };
      const event = repository.defineRepositoryLink(link);
      return { eventId: event.id, link };
    }
    case undefined:
    case "list":
      return { links: repository.repositoryLinks() };
    case "show": {
      const linkId = required(positionals[0], "link id");
      const link = repository.repositoryLinks().find((candidate) => candidate.linkId === linkId);
      if (link === undefined) throw commandError("not-found", `unknown repository link: ${linkId}`);
      return link;
    }
    case "retarget": {
      const linkId = required(positionals[0], "link id");
      const event = repository.retargetRepositoryLink(
        linkId,
        required(options.versionId, "--version-id"),
        required(options.namespaceRoot, "--namespace-root"),
      );
      return { eventId: event.id, linkId };
    }
    case "remove": {
      const linkId = required(positionals[0], "link id");
      const event = repository.removeRepositoryLink(linkId);
      return { eventId: event.id, linkId };
    }
    case "conflicts":
      return { conflicts: repository.repositoryLinkConflicts() };
    case "verify": {
      const composition = repository.resolveComposition(resolver ?? createStaticLinkResolver([]));
      return {
        digest: composition.digest,
        namespaceRoot: composition.manifest.root,
        links: composition.links,
        unresolved: composition.unresolved,
        // Ownership is reported per path so a read-only linked path is never mistaken for owned source.
        ownedPaths: composition.ownership.filter((entry) => entry.writable).length,
        linkedPaths: composition.ownership.filter((entry) => !entry.writable).length,
      };
    }
    case "vendorize": {
      const linkId = required(positionals[0], "link id");
      if (resolver === undefined) throw commandError("invalid-input", "vendorize requires a resolvable link target");
      const provenance = repository.vendorizeRepositoryLink(linkId, resolver);
      return { provenance };
    }
    case "provenance":
      return { provenance: repository.vendorProvenance() };
    case "update-plan": {
      const lastImported = parseDigestMap(required(positionals[0], "last imported manifest"));
      const upstream = parseDigestMap(required(positionals[1], "upstream manifest"));
      const local = parseDigestMap(required(positionals[2], "local manifest"));
      return planVendorUpdate(lastImported, upstream, local);
    }
    default:
      throw commandError("invalid-command", `unsupported component action: ${action}`);
  }
}

function parseDigestMap(value: string): Readonly<Record<string, string>> {
  try {
    // SAFETY: The module validates or constructs this value before applying the asserted contract.
    const parsed = JSON.parse(value) as Record<string, DictionaryValue>;
    return Object.fromEntries(Object.entries(parsed).map(([path, digest]) => [path, String(digest)]));
  } catch {
    throw commandError("invalid-input", "manifest must be a JSON object of path -> digest");
  }
}

/** Builds a resolver from local sibling repositories so links work without any network transport. */
export function localLinkResolver(roots: readonly string[]): RepositoryLinkResolver {
  const children: ResolvedChildRepository[] = [];
  for (const root of roots) {
    const repository = new EpochRepository(root);
    if (!repository.isInitialized()) continue;
    const state = repository.computeViewState(repository.currentView());
    const manifest = repository.namespaceManifest(state);
    const files = Object.fromEntries(Object.entries(state.records).map(([path, record]) => [
      path,
      { blobSha256: record.blobSha256, size: record.size, entityType: record.entityType },
    ]));
    for (const version of repository.versions()) {
      children.push({
        repositoryId: root,
        versionId: version.id,
        namespaceRoot: manifest.root,
        files,
        links: repository.repositoryLinks(),
      });
    }
    children.push({ repositoryId: root, versionId: manifest.root, namespaceRoot: manifest.root, files, links: repository.repositoryLinks() });
  }
  return createStaticLinkResolver(children);
}
