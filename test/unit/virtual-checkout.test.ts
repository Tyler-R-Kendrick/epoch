import assert from "node:assert/strict";
import { existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { EpochRepository, applyUnifiedDiff, formatUnifiedDiff, isTextBlob } from "@epoch/core";

export function runVirtualCheckoutTests(): void {
  unifiedDiffRoundTripsTextChanges();
  unifiedDiffMarksBinaryBlobs();
  detectsTextVersusBinaryBlobs();
  virtualCheckoutLeavesUnchangedFilesVirtual();
  hydrateRealizesVirtualFilesIdempotently();
  statusReportsVirtualSeparatelyFromDeleted();
  previewRendersRollingAggregateWithoutWriting();
  manifestBecomesStaleWhenFrontierAdvances();
  materializeVersionBaseWritesOnlyChangedFiles();
  materializeVersionWithoutBaseStaysFull();
}

function withWorkspace(run: (workspace: string) => void): void {
  const workspace = mkdtempSync(join(tmpdir(), "epoch-virtual-checkout-"));
  try {
    run(workspace);
  } finally {
    rmSync(workspace, { force: true, recursive: true });
  }
}

function writeWorkspaceFile(workspace: string, path: string, content: string): void {
  const absolute = join(workspace, path);
  mkdirSync(dirname(absolute), { recursive: true });
  writeFileSync(absolute, content, "utf8");
}

function unifiedDiffRoundTripsTextChanges(): void {
  const cases: Array<readonly [string, string]> = [
    ["alpha\nbeta\ngamma\n", "alpha\nBETA\ngamma\n"],
    ["", "added\nlines\n"],
    ["removed\nall\n", ""],
    ["1\n2\n3\n4\n5\n6\n7\n", "1\n2\n3\nX\n5\n6\n7\n"],
    ["keep\nno-trailing-newline", "keep\nchanged-tail"],
    ["x\ny\nz\n", "prefix\nx\ny\nz\n"],
  ];
  for (const [from, to] of cases) {
    const patch = formatUnifiedDiff({ path: "file.txt", from: Buffer.from(from, "utf8"), to: Buffer.from(to, "utf8") });
    assert.equal(applyUnifiedDiff(from, patch), to, `round-trip failed for ${JSON.stringify({ from, to })}`);
  }
}

function unifiedDiffMarksBinaryBlobs(): void {
  const patch = formatUnifiedDiff({ path: "logo.bin", from: undefined, to: Buffer.from([0, 1, 2, 0, 255]), toBlob: "c".repeat(64) });
  assert.match(patch, /Binary files/u);
  assert.doesNotMatch(patch, /^@@/mu);
}

function detectsTextVersusBinaryBlobs(): void {
  assert.equal(isTextBlob(Buffer.from("hello\nworld\n", "utf8")), true);
  assert.equal(isTextBlob(Buffer.from("", "utf8")), true);
  assert.equal(isTextBlob(Buffer.from([0x68, 0x00, 0x69])), false);
  assert.equal(isTextBlob(Buffer.from([0xff, 0xfe, 0xfd])), false);
}

function divergedFeatureRepository(workspace: string): EpochRepository {
  const repo = new EpochRepository(workspace);
  repo.init("alice");
  writeWorkspaceFile(workspace, "keep.txt", "keep\n");
  repo.recordFile("keep.txt", "text/plain");
  writeWorkspaceFile(workspace, "change.txt", "before\n");
  repo.recordFile("change.txt", "text/plain");
  repo.createView("feature", { type: "all" }, "main");
  repo.checkoutView("feature");
  writeWorkspaceFile(workspace, "change.txt", "after\n");
  repo.recordFile("change.txt", "text/plain");
  return repo;
}

function virtualCheckoutLeavesUnchangedFilesVirtual(): void {
  withWorkspace((workspace) => {
    const repo = divergedFeatureRepository(workspace);
    rmSync(join(workspace, "keep.txt"), { force: true });
    rmSync(join(workspace, "change.txt"), { force: true });

    // `virtual` is a deprecated alias: the mode it always described is delta materialization,
    // which writes what differs from a base rather than what the user selected (ADR-0041).
    const result = repo.checkoutView("feature", { materialization: "virtual" });
    assert.equal(result.materialization, "delta");
    assert.deepEqual([...result.written], ["change.txt"]);
    assert.deepEqual([...result.virtualPaths], ["keep.txt"]);
    assert.equal(existsSync(join(workspace, "change.txt")), true);
    assert.equal(readFileSync(join(workspace, "change.txt"), "utf8"), "after\n");
    assert.equal(existsSync(join(workspace, "keep.txt")), false);

    const manifest = repo.readVirtualCheckout();
    assert.notEqual(manifest, undefined);
    assert.equal(manifest?.base, "main");
    const byPath = new Map((manifest?.records ?? []).map((record) => [record.path, record.status]));
    assert.equal(byPath.get("change.txt"), "materialized");
    assert.equal(byPath.get("keep.txt"), "virtual");

    const patch = repo.readRollingPatch("feature");
    assert.notEqual(patch, undefined);
    assert.match(patch ?? "", /@@ /u);
    assert.match(patch ?? "", /\+after/u);

    assert.deepEqual(repo.verify(), []);
  });
}

function hydrateRealizesVirtualFilesIdempotently(): void {
  withWorkspace((workspace) => {
    const repo = divergedFeatureRepository(workspace);
    rmSync(join(workspace, "keep.txt"), { force: true });
    rmSync(join(workspace, "change.txt"), { force: true });
    repo.checkoutView("feature", { materialization: "virtual" });

    assert.equal(existsSync(join(workspace, "keep.txt")), false);
    const hydrated = repo.hydrate();
    assert.deepEqual([...hydrated], ["keep.txt"]);
    assert.equal(existsSync(join(workspace, "keep.txt")), true);
    assert.equal(readFileSync(join(workspace, "keep.txt"), "utf8"), "keep\n");
    assert.equal(repo.readVirtualCheckout()?.records.every((record) => record.status === "materialized"), true);
    assert.deepEqual([...repo.hydrate()], []);
  });
}

function statusReportsVirtualSeparatelyFromDeleted(): void {
  withWorkspace((workspace) => {
    const repo = divergedFeatureRepository(workspace);
    rmSync(join(workspace, "keep.txt"), { force: true });
    rmSync(join(workspace, "change.txt"), { force: true });
    repo.checkoutView("feature", { materialization: "virtual" });

    const virtualStatus = new Map(repo.statusEntries().map((entry) => [entry.path, entry]));
    assert.equal(virtualStatus.get("keep.txt")?.status, "virtual");
    assert.equal(virtualStatus.get("keep.txt")?.marker, "V");
    assert.equal(virtualStatus.get("change.txt")?.status, "tracked");

    rmSync(join(workspace, "change.txt"), { force: true });
    const deletedStatus = new Map(repo.statusEntries().map((entry) => [entry.path, entry.status]));
    assert.equal(deletedStatus.get("change.txt"), "deleted");
    assert.equal(deletedStatus.get("keep.txt"), "virtual");
  });
}

function previewRendersRollingAggregateWithoutWriting(): void {
  withWorkspace((workspace) => {
    const repo = divergedFeatureRepository(workspace);
    // Preview must not materialize or touch the manifest; clear any prior manifest first.
    rmSync(join(workspace, ".epoch", "checkout.json"), { force: true });
    const preview = repo.previewPatch({ view: "feature", base: "main" });
    assert.match(preview, /@@ /u);
    assert.match(preview, /-before/u);
    assert.match(preview, /\+after/u);
    assert.equal(existsSync(join(workspace, ".epoch", "checkout.json")), false);
  });
}

function manifestBecomesStaleWhenFrontierAdvances(): void {
  withWorkspace((workspace) => {
    const repo = divergedFeatureRepository(workspace);
    repo.checkoutView("feature", { materialization: "virtual" });
    const manifest = repo.readVirtualCheckout();
    assert.notEqual(manifest, undefined);
    assert.equal(repo.virtualCheckoutStale(manifest!), false);

    writeWorkspaceFile(workspace, "extra.txt", "extra\n");
    repo.recordFile("extra.txt", "text/plain");
    assert.equal(repo.virtualCheckoutStale(manifest!), true);

    const refreshed = repo.refreshVirtualManifest("feature");
    assert.equal(repo.virtualCheckoutStale(refreshed), false);
  });
}

function versionedRepository(workspace: string): EpochRepository {
  const repo = new EpochRepository(workspace);
  repo.init("bob");
  writeWorkspaceFile(workspace, "a.txt", "a1\n");
  repo.recordFile("a.txt", "text/plain");
  writeWorkspaceFile(workspace, "b.txt", "b1\n");
  repo.recordFile("b.txt", "text/plain");
  repo.createVersion({ name: "v1" });
  writeWorkspaceFile(workspace, "a.txt", "a2\n");
  repo.recordFile("a.txt", "text/plain");
  repo.createVersion({ name: "v2" });
  return repo;
}

function materializeVersionBaseWritesOnlyChangedFiles(): void {
  withWorkspace((workspace) => {
    const repo = versionedRepository(workspace);
    const result = repo.materializeVersion("v2", { outDir: "sparse-out", base: "v1" });
    assert.deepEqual([...result.files], ["a.txt"]);
    assert.deepEqual([...(result.virtualPaths ?? [])], ["b.txt"]);
    assert.notEqual(result.virtualManifestPath, undefined);
    assert.equal(existsSync(join(workspace, "sparse-out", "a.txt")), true);
    assert.equal(existsSync(join(workspace, "sparse-out", "b.txt")), false);
    assert.equal(existsSync(join(workspace, "sparse-out", "epoch-virtual.json")), true);
  });
}

function materializeVersionWithoutBaseStaysFull(): void {
  withWorkspace((workspace) => {
    const repo = versionedRepository(workspace);
    const result = repo.materializeVersion("v2", { outDir: "full-out" });
    assert.deepEqual([...result.files], ["a.txt", "b.txt"]);
    assert.equal(result.virtualPaths, undefined);
    assert.equal(result.virtualManifestPath, undefined);
    assert.equal(existsSync(join(workspace, "full-out", "a.txt")), true);
    assert.equal(existsSync(join(workspace, "full-out", "b.txt")), true);
    assert.equal(existsSync(join(workspace, "full-out", "epoch-virtual.json")), false);
  });
}
