import assert from "node:assert/strict";
import { mkdirSync, mkdtempSync, existsSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import {
  CompositionError,
  EpochRepository,
  SelectAll,
  SelectionError,
  buildNamespaceManifest,
  buildSparseIndex,
  createStaticLinkResolver,
  detectLinkRetargetConflicts,
  diagnoseAbsentPath,
  formatSelection,
  namespaceResources,
  normalizeMaterializationMode,
  normalizeSelection,
  parseSelection,
  planCrossRepositoryPublication,
  planVendorUpdate,
  planVendorize,
  resolveComposition,
  resolveSelection,
  selectPath,
  selectionDigest,
  translateSelectionForLink,
  validateExternalDependency,
  validateLink,
  type RepositoryLink,
  type ResolvedChildRepository,
} from "@epoch/core";
import { executeChangeGraphCommand } from "@epoch/cli";
import { isString } from "../helpers/type-guards";

export async function runCompositionSelectionTests(): Promise<void> {
  selectionAlgebraIsOrderIndependent();
  selectionDepthDistinguishesSelfFromRecursive();
  selectionRejectsEscapesAndAmbiguousPaths();
  selectionProfilesExpandAndDetectCycles();
  selectionExpressionRoundTrips();
  namespaceManifestIsContentAddressedAndDeterministic();
  namespaceManifestRejectsCaseFoldingCollisions();
  namespaceManifestShardsVeryLargeDirectories();
  sparseIndexTracksSelectionNotRepositorySize();
  materializationModesAreDistinctAndAliased();
  checkoutSelectsByInterestNotByDifference();
  deltaModeStillSelectsByDifferenceFromBase();
  explicitModeDefersEveryWriteToHydrate();
  excludedPathsAreReportedSeparatelyFromMissing();
  repositoryLinkValidationFailsClosed();
  compositionMountsChildAndKeepsOwnershipReadOnly();
  compositionReportsUnavailableAndCorruptChildrenDistinctly();
  compositionRejectsCycles();
  selectionComposesAcrossRepositoryLinks();
  concurrentRetargetBecomesDurableConflict();
  vendorizeTransfersOwnershipWithProvenance();
  vendorUpdateIsAThreeWayMerge();
  crossRepositoryPublicationIsHonestAboutAtomicity();
  absentPathDiagnosticsDistinguishReasons();
  await selectionAndComponentCliRoundTrip();
  await selectionProfileAndLifecycleCliRoundTrip();
  await vendorizeThroughLocalResolverCliRoundTrip();
  console.log("composition and selection tests passed");
}

function withWorkspace(run: (workspace: string) => void): void {
  const workspace = mkdtempSync(join(tmpdir(), "epoch-composition-"));
  try {
    run(workspace);
  } finally {
    rmSync(workspace, { force: true, recursive: true });
  }
}

async function withWorkspaceAsync(run: (workspace: string) => Promise<void>): Promise<void> {
  const workspace = mkdtempSync(join(tmpdir(), "epoch-composition-cli-"));
  try {
    await run(workspace);
  } finally {
    rmSync(workspace, { force: true, recursive: true });
  }
}

function writeWorkspaceFile(workspace: string, path: string, content: string): void {
  const absolute = join(workspace, path);
  mkdirSync(dirname(absolute), { recursive: true });
  writeFileSync(absolute, content, "utf8");
}

function seedRepository(workspace: string, files: Readonly<Record<string, string>>): EpochRepository {
  const repository = EpochRepository.create(workspace, { author: "tester" });
  for (const [path, content] of Object.entries(files)) {
    writeWorkspaceFile(workspace, path, content);
    repository.recordFile(path, "text/plain");
  }
  return repository;
}

// --- Selection algebra -------------------------------------------------------------------------

function selectionAlgebraIsOrderIndependent(): void {
  const left = parseSelection("apps/api + packages/contracts");
  const right = parseSelection("packages/contracts + apps/api");
  assert.equal(selectionDigest(left), selectionDigest(right), "union must be order-independent");

  const resources = [
    { path: "apps/api/main.ts", kind: "file" as const },
    { path: "packages/contracts/api.ts", kind: "file" as const },
    { path: "apps/web/main.ts", kind: "file" as const },
  ];
  assert.deepEqual(resolveSelection(left, resources).paths, resolveSelection(right, resources).paths);
  assert.equal(resolveSelection(left, resources).digest, resolveSelection(right, resources).digest);

  // Difference is genuinely ordered and must not be normalized into commutativity.
  const forward = parseSelection("apps - apps/web");
  const backward = parseSelection("apps/web - apps");
  assert.notEqual(selectionDigest(forward), selectionDigest(backward));
  assert.deepEqual(resolveSelection(forward, resources).paths, ["apps/api/main.ts"]);
  assert.deepEqual(resolveSelection(backward, resources).paths, []);

  // Nested unions flatten, so the same set never has two digests.
  assert.equal(
    selectionDigest(parseSelection("a + b + c")),
    selectionDigest(normalizeSelection({ kind: "union", selections: [parseSelection("c + a"), selectPath("b")] })),
  );
}

function selectionDepthDistinguishesSelfFromRecursive(): void {
  const resources = [
    { path: "apps/api.ts", kind: "file" as const },
    { path: "apps/deep/nested.ts", kind: "file" as const },
  ];
  assert.deepEqual(resolveSelection(parseSelection("apps::self"), resources).paths, ["apps/api.ts"]);
  assert.deepEqual(resolveSelection(parseSelection("apps"), resources).paths, ["apps/api.ts", "apps/deep/nested.ts"]);
}

function selectionRejectsEscapesAndAmbiguousPaths(): void {
  const cases: Array<readonly [string, string]> = [
    ["../secrets", "escape"],
    ["apps/../../etc", "escape"],
    ["/absolute", "invalid-path"],
    ["apps//double", "invalid-path"],
    ["apps/./here", "invalid-path"],
    ["apps\\windows", "invalid-path"],
  ];
  for (const [path, code] of cases) {
    assert.throws(() => selectPath(path), (error) => error instanceof SelectionError && error.code === code, `expected ${path} to fail as ${code}`);
  }
}

function selectionProfilesExpandAndDetectCycles(): void {
  const resources = [
    { path: "apps/api/main.ts", kind: "file" as const },
    { path: "apps/web/main.ts", kind: "file" as const },
  ];
  const profiles = [{ profileId: "api", selection: selectPath("apps/api") }];
  assert.deepEqual(resolveSelection(parseSelection("@api"), resources, { profiles }).paths, ["apps/api/main.ts"]);

  assert.throws(
    () => resolveSelection(parseSelection("@missing"), resources, { profiles }),
    (error) => error instanceof SelectionError && error.code === "unknown-profile",
  );
  assert.throws(
    () => resolveSelection(parseSelection("@loop"), resources, { profiles: [{ profileId: "loop", selection: parseSelection("@loop") }] }),
    (error) => error instanceof SelectionError && error.code === "cycle",
  );
}

function selectionExpressionRoundTrips(): void {
  for (const expression of ["*", "apps/api", "apps::self", "@profile", "apps/api + packages/contracts", "apps - apps/legacy"]) {
    const parsed = parseSelection(expression);
    assert.equal(selectionDigest(parseSelection(formatSelection(parsed))), selectionDigest(parsed), `round-trip failed for ${expression}`);
  }
}

// --- Namespace manifest ------------------------------------------------------------------------

function namespaceManifestIsContentAddressedAndDeterministic(): void {
  const input = {
    files: {
      "apps/api/main.ts": { blobSha256: "a".repeat(64), size: 10, entityType: "text/plain" },
      "apps/web/main.ts": { blobSha256: "b".repeat(64), size: 20, entityType: "text/plain" },
    },
  };
  const first = buildNamespaceManifest(input);
  const second = buildNamespaceManifest({ files: { ...Object.fromEntries(Object.entries(input.files).reverse()) } });
  assert.equal(first.root, second.root, "manifest root must not depend on insertion order");
  assert.equal(first.fileCount, 2);
  assert.equal(first.totalSize, 30);

  const changed = buildNamespaceManifest({
    files: { ...input.files, "apps/api/main.ts": { blobSha256: "c".repeat(64), size: 10, entityType: "text/plain" } },
  });
  assert.notEqual(first.root, changed.root, "changing a blob must change the root digest");

  const resources = namespaceResources(first);
  assert.deepEqual(resources.map((resource) => resource.path), ["apps/api/main.ts", "apps/web/main.ts"]);
}

function namespaceManifestRejectsCaseFoldingCollisions(): void {
  assert.throws(
    () => buildNamespaceManifest({
      files: {
        "README.md": { blobSha256: "a".repeat(64), size: 1, entityType: "text/plain" },
        "readme.md": { blobSha256: "b".repeat(64), size: 1, entityType: "text/plain" },
      },
    }),
    (error) => error instanceof SelectionError && error.code === "case-collision",
  );
}

function namespaceManifestShardsVeryLargeDirectories(): void {
  const files: Record<string, { blobSha256: string; size: number; entityType: string }> = {};
  for (let index = 0; index < 1500; index += 1) {
    files[`big/file-${index}.txt`] = { blobSha256: index.toString(16).padStart(64, "0"), size: 1, entityType: "text/plain" };
  }
  const manifest = buildNamespaceManifest({ files });
  const sharded = [...manifest.nodes.values()].filter((node) => node.shards !== undefined);
  assert.equal(sharded.length, 1, "a directory above the shard threshold must split");
  assert.equal(manifest.fileCount, 1500);
  // Sharding must not change what the namespace contains.
  assert.equal(namespaceResources(manifest).length, 1500);
}

function sparseIndexTracksSelectionNotRepositorySize(): void {
  const files: Record<string, { blobSha256: string; size: number; entityType: string }> = {};
  for (let index = 0; index < 500; index += 1) {
    files[`packages/pkg-${index}/src/index.ts`] = { blobSha256: index.toString(16).padStart(64, "0"), size: 100, entityType: "text/plain" };
  }
  const manifest = buildNamespaceManifest({ files });
  const resolved = resolveSelection(parseSelection("packages/pkg-7"), namespaceResources(manifest));
  const index = buildSparseIndex(manifest, resolved);

  assert.equal(index.entries.length, 1, "only the selected path is enumerated");
  assert.equal(index.root, manifest.root);
  // This is the whole point: 499 unselected packages cost one opaque entry each, not one per file,
  // and the index never enumerates them individually.
  assert.ok(index.opaque.length < 500, "unselected directories collapse into opaque subtrees");
  assert.equal(index.opaque.reduce((total, subtree) => total + subtree.fileCount, 0), 499);
  assert.ok(index.entries.length + index.opaque.length < 500 + 1);
}

// --- Materialization modes ---------------------------------------------------------------------

function materializationModesAreDistinctAndAliased(): void {
  assert.equal(normalizeMaterializationMode("delta"), "delta");
  assert.equal(normalizeMaterializationMode("eager"), "eager");
  assert.equal(normalizeMaterializationMode("explicit"), "explicit");
  assert.equal(normalizeMaterializationMode("lazy"), "lazy");
  // The deprecated spellings map onto the modes they always actually meant.
  assert.equal(normalizeMaterializationMode("virtual"), "delta");
  assert.equal(normalizeMaterializationMode("full"), "eager");
  assert.equal(normalizeMaterializationMode("nonsense"), undefined);
}

function checkoutSelectsByInterestNotByDifference(): void {
  withWorkspace((workspace) => {
    const repository = seedRepository(workspace, {
      "apps/api/main.ts": "api\n",
      "apps/web/main.ts": "web\n",
      "packages/contracts/api.ts": "contract\n",
    });

    const result = repository.checkoutView("main", { materialization: "eager", selection: parseSelection("apps/api") });

    // The selected path is written even though it is unchanged relative to any base — which is
    // exactly what delta materialization could never do.
    assert.deepEqual([...result.written], ["apps/api/main.ts"]);
    assert.deepEqual([...result.excludedPaths], ["apps/web/main.ts", "packages/contracts/api.ts"]);
    assert.equal(existsSync(join(workspace, "apps/api/main.ts")), true);
    assert.equal(existsSync(join(workspace, "apps/web/main.ts")), false, "excluded paths must not be materialized");
    assert.equal(result.manifest.records.length, 1, "the manifest describes the selection, not the repository");
    assert.equal(result.selection.excludedCount, 2);
  });
}

function deltaModeStillSelectsByDifferenceFromBase(): void {
  withWorkspace((workspace) => {
    const repository = seedRepository(workspace, { "kept.txt": "same\n", "changed.txt": "before\n" });
    repository.createView("feature", { type: "all" }, "main");
    repository.checkoutView("feature", { materialization: "eager" });
    writeWorkspaceFile(workspace, "changed.txt", "after\n");
    repository.recordFile("changed.txt", "text/plain");

    rmSync(join(workspace, "kept.txt"));
    rmSync(join(workspace, "changed.txt"));
    const result = repository.checkoutView("feature", { materialization: "delta", base: "main" });

    assert.equal(result.materialization, "delta");
    assert.deepEqual([...result.written], ["changed.txt"], "delta writes only what differs from the base");
    assert.deepEqual([...result.virtualPaths], ["kept.txt"]);

    // The deprecated spelling resolves to the same behavior.
    const aliased = repository.checkoutView("feature", { materialization: "virtual", base: "main" });
    assert.equal(aliased.materialization, "delta");
  });
}

function explicitModeDefersEveryWriteToHydrate(): void {
  withWorkspace((workspace) => {
    const repository = seedRepository(workspace, { "a.txt": "a\n", "b.txt": "b\n" });
    rmSync(join(workspace, "a.txt"));
    rmSync(join(workspace, "b.txt"));

    const result = repository.checkoutView("main", { materialization: "explicit" });
    assert.deepEqual([...result.written], []);
    assert.deepEqual([...result.virtualPaths], ["a.txt", "b.txt"]);
    assert.equal(existsSync(join(workspace, "a.txt")), false);

    assert.deepEqual(repository.hydrate(["a.txt"]), ["a.txt"]);
    assert.equal(existsSync(join(workspace, "a.txt")), true);
    assert.equal(existsSync(join(workspace, "b.txt")), false, "hydrate must realize only what was asked for");
  });
}

function excludedPathsAreReportedSeparatelyFromMissing(): void {
  withWorkspace((workspace) => {
    const repository = seedRepository(workspace, { "apps/api.ts": "api\n", "apps/web.ts": "web\n" });
    repository.setWorkspaceSelection(parseSelection("apps/api.ts"));
    assert.equal(formatSelection(repository.workspaceSelection()), "apps/api.ts");

    const result = repository.checkoutView("main", { materialization: "eager" });
    assert.deepEqual([...result.excludedPaths], ["apps/web.ts"]);
    // Excluded is a workspace-scope fact, not an availability or integrity fact.
    assert.equal(repository.blobPresent(result.records["apps/web.ts"]!.blobSha256), true);

    repository.setWorkspaceSelection(SelectAll);
    assert.deepEqual([...repository.checkoutView("main", { materialization: "eager" }).excludedPaths], []);
  });
}

// --- Repository links --------------------------------------------------------------------------

function link(overrides: Partial<RepositoryLink> = {}): RepositoryLink {
  return {
    linkId: "link-parser",
    mountPath: "vendor/parser",
    target: { repositoryId: "repo:parser", versionId: "version:1", namespaceRoot: "d".repeat(64) },
    ...overrides,
  };
}

function repositoryLinkValidationFailsClosed(): void {
  const existing = [link()];
  const cases: Array<readonly [RepositoryLink, string]> = [
    [link({ linkId: "other", mountPath: "vendor/parser" }), "mount-collision"],
    [link({ linkId: "other", mountPath: "Vendor/Parser" }), "case-collision"],
    [link({ linkId: "other", mountPath: "vendor/parser/inner" }), "mount-overlap"],
    [link({ linkId: "other", mountPath: "vendor" }), "mount-overlap"],
  ];
  for (const [candidate, code] of cases) {
    assert.throws(
      () => validateLink(candidate, existing),
      (error) => error instanceof CompositionError && error.code === code,
      `expected ${candidate.mountPath} to fail as ${code}`,
    );
  }

  assert.throws(
    () => validateLink(link({ mountPath: "../escape" }), []),
    (error) => error instanceof SelectionError && error.code === "escape",
  );
  assert.throws(
    () => validateLink(link({ target: { repositoryId: "repo:self", versionId: "v1", namespaceRoot: "d".repeat(64) } }), [], "repo:self"),
    (error) => error instanceof CompositionError && error.code === "cycle",
  );
  // A non-colliding sibling mount is accepted.
  assert.equal(validateLink(link({ linkId: "other", mountPath: "vendor/lexer" }), existing).mountPath, "vendor/lexer");
}

function childRepository(overrides: Partial<ResolvedChildRepository> = {}): ResolvedChildRepository {
  const files = {
    "src/parse.ts": { blobSha256: "1".repeat(64), size: 5, entityType: "text/plain" },
    "README.md": { blobSha256: "2".repeat(64), size: 3, entityType: "text/plain" },
  };
  const namespaceRoot = buildNamespaceManifest({ files }).root;
  return { repositoryId: "repo:parser", versionId: "version:1", namespaceRoot, files, ...overrides };
}

function compositionMountsChildAndKeepsOwnershipReadOnly(): void {
  const child = childRepository();
  const composition = resolveComposition(
    {
      repositoryId: "repo:parent",
      files: { "app.ts": { blobSha256: "9".repeat(64), size: 1, entityType: "text/plain" } },
      links: [link({ target: { repositoryId: child.repositoryId, versionId: child.versionId, namespaceRoot: child.namespaceRoot } })],
    },
    createStaticLinkResolver([child]),
  );

  assert.deepEqual(composition.unresolved, []);
  assert.equal(composition.links[0]?.availability, "resolved");
  assert.equal(composition.links[0]?.fileCount, 2);

  const owned = composition.ownership.filter((entry) => entry.writable).map((entry) => entry.path);
  const linked = composition.ownership.filter((entry) => !entry.writable).map((entry) => entry.path);
  assert.deepEqual(owned, ["app.ts"]);
  // Linked paths are read-only from the parent workspace: ownership travels with the child.
  assert.deepEqual(linked, ["vendor/parser/README.md", "vendor/parser/src/parse.ts"]);
  assert.equal(composition.ownership.find((entry) => entry.path === "vendor/parser/src/parse.ts")?.repositoryId, "repo:parser");

  // A source prefix exposes only one child subtree at the mount.
  const scoped = resolveComposition(
    {
      repositoryId: "repo:parent",
      files: {},
      links: [link({
        target: { repositoryId: child.repositoryId, versionId: child.versionId, namespaceRoot: child.namespaceRoot, sourcePath: "src" },
      })],
    },
    createStaticLinkResolver([child]),
  );
  assert.deepEqual(scoped.ownership.map((entry) => entry.path), ["vendor/parser/parse.ts"]);
}

function compositionReportsUnavailableAndCorruptChildrenDistinctly(): void {
  const missing = resolveComposition(
    { repositoryId: "repo:parent", files: {}, links: [link()] },
    createStaticLinkResolver([]),
  );
  assert.equal(missing.unresolved[0]?.reason, "unavailable");
  assert.equal(missing.links[0]?.availability, "unavailable");

  const child = childRepository();
  const mismatched = resolveComposition(
    {
      repositoryId: "repo:parent",
      files: {},
      // Pin a digest the child does not actually have: an integrity failure, not an availability gap.
      links: [link({ target: { repositoryId: child.repositoryId, versionId: child.versionId, namespaceRoot: "f".repeat(64) } })],
    },
    createStaticLinkResolver([child]),
  );
  assert.equal(mismatched.unresolved[0]?.reason, "digest-mismatch");
  assert.equal(mismatched.links[0]?.availability, "corrupt");
}

function compositionRejectsCycles(): void {
  const parentLink = link({ linkId: "to-child", mountPath: "child", target: { repositoryId: "repo:child", versionId: "v1", namespaceRoot: "e".repeat(64) } });
  const backLink = link({ linkId: "to-parent", mountPath: "parent", target: { repositoryId: "repo:parent", versionId: "v1", namespaceRoot: "e".repeat(64) } });
  const child: ResolvedChildRepository = {
    repositoryId: "repo:child",
    versionId: "v1",
    namespaceRoot: "e".repeat(64),
    files: {},
    links: [backLink],
  };
  assert.throws(
    () => resolveComposition({ repositoryId: "repo:parent", files: {}, links: [parentLink] }, createStaticLinkResolver([child])),
    (error) => error instanceof CompositionError && error.code === "cycle",
  );
}

function selectionComposesAcrossRepositoryLinks(): void {
  const childResources = [
    { path: "src/parse.ts", kind: "file" as const },
    { path: "docs/guide.md", kind: "file" as const },
  ];

  const inside = translateSelectionForLink(parseSelection("vendor/parser/src"), { mountPath: "vendor/parser" }, childResources);
  assert.ok(inside !== undefined);
  assert.deepEqual(inside.paths, ["src/parse.ts"], "the parent selection translates into the child's own path space");

  // Excluding the mount means the child is not fetched at all — only the descriptor is kept.
  assert.equal(translateSelectionForLink(parseSelection("apps"), { mountPath: "vendor/parser" }, childResources), undefined);

  // A source prefix shifts the translation.
  const prefixed = translateSelectionForLink(
    parseSelection("vendor/parser/parse.ts"),
    { mountPath: "vendor/parser", sourcePath: "src" },
    childResources,
  );
  assert.deepEqual(prefixed?.paths, ["src/parse.ts"]);
}

function concurrentRetargetBecomesDurableConflict(): void {
  const conflicts = detectLinkRetargetConflicts([
    { eventId: "e1", linkId: "link-parser", fromVersionId: "v1", toVersionId: "v2" },
    { eventId: "e2", linkId: "link-parser", fromVersionId: "v1", toVersionId: "v3" },
    { eventId: "e3", linkId: "link-lexer", fromVersionId: "v1", toVersionId: "v2" },
  ]);
  assert.equal(conflicts.length, 1, "only the divergent link conflicts");
  assert.equal(conflicts[0]?.linkId, "link-parser");
  // Both sides survive; neither is discarded as a stale write.
  assert.deepEqual(conflicts[0]?.sides.map((side) => side.versionId), ["v2", "v3"]);

  assert.deepEqual(
    detectLinkRetargetConflicts([
      { eventId: "e1", linkId: "link-parser", fromVersionId: "v1", toVersionId: "v2" },
      { eventId: "e2", linkId: "link-parser", fromVersionId: "v2", toVersionId: "v3" },
    ]),
    [],
    "a sequential retarget chain is not a conflict",
  );
}

function vendorizeTransfersOwnershipWithProvenance(): void {
  withWorkspace((workspace) => {
    const repository = seedRepository(workspace, { "app.ts": "app\n" });
    const child = childRepository();
    repository.defineRepositoryLink(link({
      target: { repositoryId: child.repositoryId, versionId: child.versionId, namespaceRoot: child.namespaceRoot },
    }));
    assert.equal(repository.repositoryLinks().length, 1);

    const provenance = repository.vendorizeRepositoryLink("link-parser", createStaticLinkResolver([child]));

    assert.equal(provenance.sourceRepositoryId, "repo:parser");
    assert.equal(provenance.sourceVersionId, "version:1");
    assert.equal(provenance.importedRoot, child.namespaceRoot);
    assert.equal(provenance.fileCount, 2);
    // The link is gone and the files are now ordinary owned paths.
    assert.deepEqual(repository.repositoryLinks(), []);
    const records = repository.computeViewState("main").records;
    assert.ok(records["vendor/parser/src/parse.ts"] !== undefined);
    assert.deepEqual(repository.vendorProvenance().map((entry) => entry.sourceRepositoryId), ["repo:parser"]);

    // Vendorize refuses when the child no longer matches the pinned digest.
    assert.throws(
      () => planVendorize(link(), { ...child, namespaceRoot: "0".repeat(64) }),
      (error) => error instanceof CompositionError && error.code === "digest-mismatch",
    );
  });
}

function vendorUpdateIsAThreeWayMerge(): void {
  const update = planVendorUpdate(
    { "a.ts": "base", "b.ts": "base", "c.ts": "base", "d.ts": "base" },
    { "a.ts": "upstream", "b.ts": "base", "c.ts": "upstream", "e.ts": "new" },
    { "a.ts": "base", "b.ts": "local", "c.ts": "local", "d.ts": "base" },
  );
  assert.deepEqual([...update.updated], ["a.ts"], "upstream-only change applies");
  assert.deepEqual([...update.unchanged], ["b.ts"], "local-only change is preserved");
  assert.deepEqual([...update.conflicts], ["c.ts"], "both sides changed differently");
  assert.deepEqual([...update.removed], ["d.ts"]);
  assert.deepEqual([...update.added], ["e.ts"]);
}

function crossRepositoryPublicationIsHonestAboutAtomicity(): void {
  const dependency = { repositoryId: "repo:child", versionId: "version:2", expectedDigest: "a".repeat(64) };
  assert.equal(validateExternalDependency(dependency).repositoryId, "repo:child");
  assert.throws(
    () => validateExternalDependency({ repositoryId: "repo:child", expectedDigest: "a".repeat(64) }),
    (error) => error instanceof CompositionError && error.code === "unpinned",
  );

  const blocked = planCrossRepositoryPublication([dependency], new Map());
  assert.equal(blocked.ready, false);
  assert.deepEqual([...blocked.blockedBy], ["repo:child: not published"]);

  const mismatched = planCrossRepositoryPublication([dependency], new Map([["repo:child", "b".repeat(64)]]));
  assert.deepEqual([...mismatched.blockedBy], ["repo:child: digest mismatch"]);

  const ready = planCrossRepositoryPublication([dependency], new Map([["repo:child", "a".repeat(64)]]));
  assert.equal(ready.ready, true);
  // Atomicity is only claimed when a shared transaction authority actually exists.
  assert.equal(ready.atomic, false);
  assert.equal(planCrossRepositoryPublication([dependency], new Map([["repo:child", "a".repeat(64)]]), { sharedTransactionAuthority: true }).atomic, true);
}

function absentPathDiagnosticsDistinguishReasons(): void {
  const base = { path: "apps/api.ts", inNamespace: true, selected: true, resident: true, authorized: true, digestMatches: true };
  assert.equal(diagnoseAbsentPath({ ...base, inNamespace: false }).reason, "absent");
  assert.equal(diagnoseAbsentPath({ ...base, authorized: false }).reason, "unauthorized");
  assert.equal(diagnoseAbsentPath({ ...base, selected: false }).reason, "excluded");
  assert.equal(diagnoseAbsentPath({ ...base, resident: false }).reason, "promised");
  assert.equal(diagnoseAbsentPath({ ...base, digestMatches: false }).reason, "corrupt");
  assert.equal(diagnoseAbsentPath(base).reason, "present");
}

// --- CLI ----------------------------------------------------------------------------------------

async function selectionAndComponentCliRoundTrip(): Promise<void> {
  await withWorkspaceAsync(async (workspace) => {
    seedRepository(workspace, { "apps/api/main.ts": "api\n", "apps/web/main.ts": "web\n" });

    const set = await executeChangeGraphCommand(workspace, ["workspace", "select", "set", "apps/api"]);
    assert.equal(set.ok, true, JSON.stringify(set.error));
    // SAFETY: Runtime checks or construction above establish { expression: string }).expression.
    assert.equal((set.data as { expression: string }).expression, "apps/api");

    const show = await executeChangeGraphCommand(workspace, ["workspace", "select", "show"]);
    // SAFETY: Runtime checks or construction above establish { paths: readonly string[].
    const shown = show.data as { paths: readonly string[]; excluded: number };
    assert.deepEqual([...shown.paths], ["apps/api/main.ts"]);
    assert.equal(shown.excluded, 1);

    const added = await executeChangeGraphCommand(workspace, ["workspace", "select", "add", "apps/web"]);
    // SAFETY: Runtime checks or construction above establish { expression: string }).expression.
    assert.equal((added.data as { expression: string }).expression, "apps/api + apps/web");

    const removed = await executeChangeGraphCommand(workspace, ["workspace", "select", "remove", "apps/web"]);
    // SAFETY: Runtime checks or construction above establish { expression: string }).expression.
    assert.equal((removed.data as { expression: string }).expression, "apps/api + apps/web - apps/web");

    const index = await executeChangeGraphCommand(workspace, ["workspace", "select", "index"]);
    // SAFETY: Runtime checks or construction above establish { root: string }).root.
    assert.equal(isString((index.data as { root: string }).root), true);

    const explained = await executeChangeGraphCommand(workspace, ["workspace", "select", "explain", "apps/web/main.ts"]);
    // SAFETY: Runtime checks or construction above establish { reason: string }).reason.
    assert.equal((explained.data as { reason: string }).reason, "excluded", "the CLI names why a path is absent");

    const linked = await executeChangeGraphCommand(workspace, [
      "component", "link", "vendor/parser", "link-parser",
      "--repository-id", "repo:parser", "--version-id", "version:1", "--namespace-root", "d".repeat(64),
    ]);
    assert.equal(linked.ok, true, JSON.stringify(linked.error));

    const list = await executeChangeGraphCommand(workspace, ["component", "list"]);
    // SAFETY: Runtime checks or construction above establish { links: readonly unknown[] }).links.length.
    assert.equal((list.data as { links: readonly unknown[] }).links.length, 1);

    const collision = await executeChangeGraphCommand(workspace, [
      "component", "link", "vendor/parser/inner", "link-inner",
      "--repository-id", "repo:other", "--version-id", "v1", "--namespace-root", "d".repeat(64),
    ]);
    assert.equal(collision.ok, false, "overlapping mounts must be refused");

    const verified = await executeChangeGraphCommand(workspace, ["component", "verify"]);
    // SAFETY: Runtime checks or construction above establish { unresolved: readonly { reason: string }[] }.
    const report = verified.data as { unresolved: readonly { reason: string }[] };
    assert.equal(report.unresolved[0]?.reason, "unavailable", "an unresolvable link is reported, not silently empty");
  });
}

async function selectionProfileAndLifecycleCliRoundTrip(): Promise<void> {
  await withWorkspaceAsync(async (workspace) => {
    seedRepository(workspace, { "apps/api/main.ts": "api\n", "apps/web/main.ts": "web\n" });

    const defined = await executeChangeGraphCommand(workspace, [
      "workspace", "select", "profile", "api", "apps/api", "--description", "API team scope",
    ]);
    assert.equal(defined.ok, true, JSON.stringify(defined.error));

    const read = await executeChangeGraphCommand(workspace, ["workspace", "select", "profile", "api"]);
    // SAFETY: Runtime checks or construction above establish { expression: string }).expression.
    assert.equal((read.data as { expression: string }).expression, "apps/api");

    // Applying a profile stays workspace-local state, not signed history.
    const applied = await executeChangeGraphCommand(workspace, ["workspace", "select", "set", "@api"]);
    // SAFETY: Runtime checks or construction above establish { expression: string }).expression.
    assert.equal((applied.data as { expression: string }).expression, "@api");
    const show = await executeChangeGraphCommand(workspace, ["workspace", "select", "show"]);
    // SAFETY: Runtime checks or construction above establish { paths: readonly string[] }).paths].
    assert.deepEqual([...(show.data as { paths: readonly string[] }).paths], ["apps/api/main.ts"]);

    const cleared = await executeChangeGraphCommand(workspace, ["workspace", "select", "clear"]);
    // SAFETY: Runtime checks or construction above establish { expression: string }).expression.
    assert.equal((cleared.data as { expression: string }).expression, "*");

    const unknownProfile = await executeChangeGraphCommand(workspace, ["workspace", "select", "profile", "missing"]);
    assert.equal(unknownProfile.ok, false);
    const unknownAction = await executeChangeGraphCommand(workspace, ["workspace", "select", "nonsense"]);
    assert.equal(unknownAction.ok, false);

    const root = "d".repeat(64);
    await executeChangeGraphCommand(workspace, [
      "component", "link", "vendor/parser", "link-parser",
      "--repository-id", "repo:parser", "--version-id", "version:1", "--namespace-root", root,
    ]);
    const shown = await executeChangeGraphCommand(workspace, ["component", "show", "link-parser"]);
    // SAFETY: Runtime checks or construction above establish { mountPath: string }).mountPath.
    assert.equal((shown.data as { mountPath: string }).mountPath, "vendor/parser");

    const retargeted = await executeChangeGraphCommand(workspace, [
      "component", "retarget", "link-parser", "--version-id", "version:2", "--namespace-root", "e".repeat(64),
    ]);
    assert.equal(retargeted.ok, true, JSON.stringify(retargeted.error));
    const afterRetarget = await executeChangeGraphCommand(workspace, ["component", "show", "link-parser"]);
    // SAFETY: Runtime checks or construction above establish { target: { versionId: string } }).target.versionId.
    assert.equal((afterRetarget.data as { target: { versionId: string } }).target.versionId, "version:2");

    const plan = await executeChangeGraphCommand(workspace, [
      "component", "update-plan",
      JSON.stringify({ "a.ts": "base" }), JSON.stringify({ "a.ts": "next" }), JSON.stringify({ "a.ts": "base" }),
    ]);
    // SAFETY: Runtime checks or construction above establish { updated: readonly string[] }).updated].
    assert.deepEqual([...(plan.data as { updated: readonly string[] }).updated], ["a.ts"]);

    const removed = await executeChangeGraphCommand(workspace, ["component", "remove", "link-parser"]);
    assert.equal(removed.ok, true, JSON.stringify(removed.error));
    const emptied = await executeChangeGraphCommand(workspace, ["component", "list"]);
    // SAFETY: Runtime checks or construction above establish { links: readonly unknown[] }).links.length.
    assert.equal((emptied.data as { links: readonly unknown[] }).links.length, 0);

    const missingLink = await executeChangeGraphCommand(workspace, ["component", "remove", "link-parser"]);
    assert.equal(missingLink.ok, false, "removing an unknown link must fail rather than no-op");
  });
}

async function vendorizeThroughLocalResolverCliRoundTrip(): Promise<void> {
  await withWorkspaceAsync(async (workspace) => {
    const parentRoot = join(workspace, "parent");
    const childRoot = join(workspace, "child");
    mkdirSync(parentRoot, { recursive: true });
    mkdirSync(childRoot, { recursive: true });

    seedRepository(parentRoot, { "app.ts": "app\n" });
    const child = seedRepository(childRoot, { "src/parse.ts": "parse\n", "README.md": "readme\n" });
    const childNamespaceRoot = child.namespaceManifest(child.computeViewState("main")).root;

    const linked = await executeChangeGraphCommand(parentRoot, [
      "component", "link", "vendor/parser", "link-parser",
      "--repository-id", childRoot, "--version-id", childNamespaceRoot, "--namespace-root", childNamespaceRoot,
    ]);
    assert.equal(linked.ok, true, JSON.stringify(linked.error));

    // With the child resolvable, verify reports real ownership instead of an availability gap.
    const verified = await executeChangeGraphCommand(parentRoot, ["component", "verify", "--resolver", childRoot]);
    // SAFETY: Runtime checks or construction above establish { unresolved: readonly unknown[].
    const report = verified.data as { unresolved: readonly unknown[]; linkedPaths: number; ownedPaths: number };
    assert.deepEqual(report.unresolved, []);
    assert.equal(report.linkedPaths, 2, "the child's files are mounted read-only under the parent");
    assert.equal(report.ownedPaths, 1);

    const vendorized = await executeChangeGraphCommand(parentRoot, ["component", "vendorize", "link-parser", "--resolver", childRoot]);
    assert.equal(vendorized.ok, true, JSON.stringify(vendorized.error));
    // SAFETY: Runtime checks or construction above establish { provenance: { fileCount: number.
    const provenance = (vendorized.data as { provenance: { fileCount: number; importedRoot: string } }).provenance;
    assert.equal(provenance.fileCount, 2);
    assert.equal(provenance.importedRoot, childNamespaceRoot);

    // Ownership transferred: the link is gone and the paths are now the parent's own.
    // SAFETY: Runtime checks or construction above establish { links: readonly unknown[] })).links.length.
    assert.equal((await executeChangeGraphCommand(parentRoot, ["component", "list"]).then((envelope) => envelope.data as { links: readonly unknown[] })).links.length, 0);
    const recorded = await executeChangeGraphCommand(parentRoot, ["component", "provenance"]);
    // SAFETY: Runtime checks or construction above establish { provenance: readonly unknown[] }).provenance.length.
    assert.equal((recorded.data as { provenance: readonly unknown[] }).provenance.length, 1);
    const parent = new EpochRepository(parentRoot);
    assert.ok(parent.computeViewState("main").records["vendor/parser/src/parse.ts"] !== undefined);
  });
}
