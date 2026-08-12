import assert from "node:assert/strict";
import { mkdtempSync, mkdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { EpochRepository } from "../../packages/Epoch.Core/src/core";
import { createProjectionManifest, gitBlob, gitCommit, gitTree, projectGitGraph } from "../../packages/Epoch.Git.Proxy/src/deterministic-projection";
import { COMPATIBILITY_PROFILES, gitButlerParallelBranches, graphiteStack, jjChangeRevision } from "../../packages/Epoch.Git.Proxy/src/compatibility";
import { MirrorCoordinator, createMirrorRule } from "../../packages/Epoch.Forge/src/mirror";

async function main(): Promise<void> {
  legacyRepositoryOpensVerifiesAndSynchronizesWithoutRewrite();
  gitGraphFixturesPreserveExactObjectSemantics();
  toolCompatibilityProfilesAreHonest();
  mirrorDivergenceCreatesConflictWithoutRewrite();
  process.stdout.write(JSON.stringify({ suite: "frontier-compatibility", status: "passed" }) + "\n");
}

function legacyRepositoryOpensVerifiesAndSynchronizesWithoutRewrite(): void {
  const sandbox = mkdtempSync(join(tmpdir(), "epoch-legacy-compat-"));
  const sourceRoot = join(sandbox, "legacy-source"); const targetRoot = join(sandbox, "current-target");
  try {
    const source = EpochRepository.create(sourceRoot, { author: "legacy-alice" });
    mkdirSync(join(sourceRoot, "src"), { recursive: true });
    writeFileSync(join(sourceRoot, "src", "legacy.txt"), "legacy bytes\n", "utf8");
    source.recordFile("src/legacy.txt", "text/plain", "legacy-alice");
    const eventBytesBefore = source.events().map((event) => readFileSync(join(source.eventsDir, `${event.id}.json`)));
    const reopened = new EpochRepository(sourceRoot);
    assert.equal(reopened.isInitialized(), true);
    assert.deepEqual(reopened.verify(), []);
    const target = EpochRepository.create(targetRoot, { author: "current-bob" });
    const synced = target.syncFrom(sourceRoot);
    assert.ok(synced.eventsCopied > 0);
    assert.deepEqual(target.verify(), []);
    assert.deepEqual(source.events().map((event, index) => readFileSync(join(source.eventsDir, `${event.id}.json`)).equals(eventBytesBefore[index]!)), source.events().map(() => true));
    assert.deepEqual(target.syncFrom(sourceRoot), { eventsCopied: 0, blobsCopied: 0 }, "repeat sync is idempotent");
  } finally { rmSync(sandbox, { recursive: true, force: true }); }
}

function gitGraphFixturesPreserveExactObjectSemantics(): void {
  const fixture = readFixture<{ treeModes: readonly ("100644" | "100755" | "120000" | "160000" | "040000")[] }>("git-compatibility-v1.json");
  const blobs = fixture.treeModes.map((mode) => ({ mode, object: gitBlob(Buffer.from(`mode:${mode}`)) }));
  const tree = gitTree(blobs.map(({ mode, object }, index) => ({ mode, name: `entry-${index}`, oid: object.oid })));
  const identity = { name: "Epoch Compat", email: "compat@example.test", timestamp: 1_700_000_000, timezone: "+0000" as const };
  const parent = gitCommit({ tree: tree.oid, parents: [], author: identity, committer: identity, message: "parent", notes: { "Epoch-Change": "change-1" } });
  const side = gitCommit({ tree: tree.oid, parents: [parent.oid], author: identity, committer: identity, message: "side" });
  const merge = gitCommit({ tree: tree.oid, parents: [parent.oid, side.oid], author: identity, committer: identity, message: "merge", notes: { "Epoch-Review": "review-1" } });
  const manifest = createProjectionManifest({ defaultRef: "refs/heads/main", refs: { "refs/heads/main": merge.oid, "refs/tags/v1": parent.oid }, customRefs: { "refs/notes/epoch": merge.oid }, objects: [...blobs.map(({ object }) => object), tree, parent, side, merge] });
  const projected = projectGitGraph(manifest);
  assert.deepEqual(projected.commits.map((object) => object.oid).sort(), [parent.oid, side.oid, merge.oid].sort());
  assert.equal(projected.refs["refs/tags/v1"], parent.oid);
  assert.equal(projected.refs["refs/notes/epoch"], merge.oid);
  assert.equal(manifest.hash, "sha1");
}

function toolCompatibilityProfilesAreHonest(): void {
  const fixture = readFixture<{ fixtures: readonly { tool: string }[] }>("tool-projections-v1.json");
  assert.deepEqual(fixture.fixtures.map((entry) => entry.tool), ["jj", "Graphite", "GitButler", "Mercurial"]);
  const immutable = jjChangeRevision("change-1", "tree parent author", "description one");
  assert.equal(jjChangeRevision("change-1", "tree parent author", "description two"), immutable);
  assert.deepEqual(graphiteStack(["one", "two", "three"]), [{ branch: "one", parent: null }, { branch: "two", parent: "one" }, { branch: "three", parent: "two" }]);
  assert.deepEqual(gitButlerParallelBranches(["left", "right"]), [{ branch: "left", parent: "main" }, { branch: "right", parent: "main" }]);
  assert.equal(COMPATIBILITY_PROFILES.mercurial.status, "subset");
  assert.ok(COMPATIBILITY_PROFILES.mercurial.unsupported.includes("evolve"));
}

function mirrorDivergenceCreatesConflictWithoutRewrite(): void {
  const fixture = readFixture<{ rule: Parameters<typeof createMirrorRule>[0]; operation: { operationId: string; sourceOid: string; expectedOldOid: string; observedDestinationOid: string }; expectedOutcome: string }>("mirror-divergence-v1.json");
  const rule = createMirrorRule(fixture.rule); const coordinator = new MirrorCoordinator([rule]);
  const decision = coordinator.reconcile({ ...fixture.operation, ruleId: rule.ruleId });
  assert.equal(decision.outcome, fixture.expectedOutcome);
  assert.match(decision.conflictRef ?? "", /^refs\/epoch\/import-conflicts\//u);
  assert.equal(coordinator.reconcile({ ...fixture.operation, ruleId: rule.ruleId }).outcome, "replayed");
}

function readFixture<T>(name: string): T {
  return JSON.parse(readFileSync(join(process.cwd(), "test", "compatibility", "fixtures", name), "utf8")) as T;
}

void main().catch((error: unknown) => { process.stderr.write(`${String((error as Error).stack ?? error)}\n`); process.exitCode = 1; });
