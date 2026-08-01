import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { mkdtempSync, readFileSync, rmSync, writeFileSync, mkdirSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import {
  EpochRepository,
  GitMappingEventType,
  epochContentHashes,
  ingestGitToEpoch,
  listGitMappingEvents,
  projectEpochToGit,
  rebuildProjectionCache,
} from "@epoch/core";

export function runGitProjectionTests(): void {
  epochGitProjectionRoundTripsContentHashesAndRebuildsCache();
  ingestFromGitRecordsMappingAndVerify();
}

function epochGitProjectionRoundTripsContentHashesAndRebuildsCache(): void {
  const root = mkdtempSync(join(tmpdir(), "epoch-proj-"));
  try {
    const epochRoot = join(root, "epoch");
    mkdirSync(epochRoot);
    const repository = new EpochRepository(epochRoot);
    repository.init("alice");
    writeFileSync(join(epochRoot, "README.md"), "# Hello Epoch\n");
    writeFileSync(join(epochRoot, "src.ts"), "export const n = 1;\n");
    repository.recordFile("README.md", "text/markdown", "alice");
    repository.recordFile("src.ts", "text/plain", "alice");

    const projectionRoot = join(root, "projection");
    const projected = projectEpochToGit(repository, {
      projectionRoot,
      author: "alice",
      message: "test projection",
    });

    assert.ok(projected.commitOid.length === 40);
    assert.ok(projected.treeOid.length === 40);
    assert.equal(projected.mappingEvent.type, GitMappingEventType.project);
    assert.deepEqual(
      projected.contentHashes["README.md"],
      epochContentHashes(repository)["README.md"],
    );
    assert.equal(
      readFileSync(join(projectionRoot, "README.md"), "utf8"),
      "# Hello Epoch\n",
    );

    // Round-trip: ingest into a fresh Epoch repo and compare content hashes.
    const epoch2Root = join(root, "epoch2");
    mkdirSync(epoch2Root);
    const repository2 = new EpochRepository(epoch2Root);
    repository2.init("bob");
    const ingested = ingestGitToEpoch(repository2, {
      gitRoot: projectionRoot,
      commitOid: projected.commitOid,
      author: "bob",
      mappingType: GitMappingEventType.commitImport,
    });

    assert.equal(ingested.contentHashes["README.md"], projected.contentHashes["README.md"]);
    assert.equal(ingested.contentHashes["src.ts"], projected.contentHashes["src.ts"]);
    assert.equal(ingested.mappingEvent.type, GitMappingEventType.commitImport);
    assert.deepEqual(repository2.verify(), []);

    // Rebuild projection cache from Epoch alone.
    rmSync(projectionRoot, { recursive: true, force: true });
    const rebuilt = rebuildProjectionCache(repository, projectionRoot, { author: "alice" });
    assert.equal(
      readFileSync(join(projectionRoot, "src.ts"), "utf8"),
      "export const n = 1;\n",
    );
    assert.equal(rebuilt.contentHashes["src.ts"], projected.contentHashes["src.ts"]);
    assert.deepEqual(repository.verify(), []);

    const mapping = listGitMappingEvents(repository);
    assert.ok(mapping.some((e) => e.type === GitMappingEventType.project));
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
}

function ingestFromGitRecordsMappingAndVerify(): void {
  const root = mkdtempSync(join(tmpdir(), "epoch-ingest-"));
  try {
    const gitRoot = join(root, "git");
    mkdirSync(gitRoot);
    execFileSync("git", ["-C", gitRoot, "-c", "init.defaultBranch=main", "init"], { stdio: "pipe" });
    execFileSync("git", ["-C", gitRoot, "config", "user.email", "t@example.invalid"], { stdio: "pipe" });
    execFileSync("git", ["-C", gitRoot, "config", "user.name", "t"], { stdio: "pipe" });
    writeFileSync(join(gitRoot, "note.txt"), "from-git\n");
    execFileSync("git", ["-C", gitRoot, "add", "note.txt"], { stdio: "pipe" });
    execFileSync("git", ["-C", gitRoot, "commit", "-m", "one"], { stdio: "pipe" });
    const commit = execFileSync("git", ["-C", gitRoot, "rev-parse", "HEAD"], { encoding: "utf8" }).trim();

    const epochRoot = join(root, "epoch");
    mkdirSync(epochRoot);
    const repository = new EpochRepository(epochRoot);
    const result = ingestGitToEpoch(repository, {
      gitRoot,
      commitOid: commit,
      mappingType: GitMappingEventType.receive,
      author: "carol",
    });
    assert.equal(result.commitOid, commit);
    assert.equal(result.mappingEvent.type, GitMappingEventType.receive);
    assert.equal(readFileSync(join(epochRoot, "note.txt"), "utf8"), "from-git\n");
    assert.deepEqual(repository.verify(), []);
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
}
